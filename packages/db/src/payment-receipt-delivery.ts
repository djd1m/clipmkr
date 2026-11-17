import type { Pool, PoolClient } from 'pg';
import type { PAYMENT_RECEIPT_STATUS } from '@clipmaker/shared/enums';
import type { BillingNoticePayload } from './billing-notice-ledger.js';
import { transaction } from './quota.js';

export type PaymentReceiptStatus = typeof PAYMENT_RECEIPT_STATUS[number];
export const TEST_PAYMENT_RECEIPT_EMAIL = 'receipt@example.test';
const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const RETRY_DELAY_MS = 60_000;
const LEASE_MS = 30_000;
const MAX_ATTEMPTS = 3;

interface ReceiptFacts {
  intent_id: string;
  sku: string;
  amount_minor: number;
  paid_at: Date;
  email: string;
}

interface ReceiptClaim {
  intent_id: string;
  lease_token: string;
  payload: BillingNoticePayload;
}

export async function enqueuePaymentReceiptTx(tx: PoolClient, intentId: string, paymentId: string): Promise<void> {
  await tx.query('INSERT INTO payment_receipt_delivery (intent_id, payment_id) VALUES ($1, $2)', [intentId, paymentId]);
}

export async function listDuePaymentReceipts(pool: Pool, at: Date, limit: number): Promise<string[]> {
  const { rows } = await pool.query<{ intent_id: string }>(`SELECT intent_id FROM payment_receipt_delivery
    WHERE next_attempt_at<=$1 AND (lease_until IS NULL OR lease_until<=$1)
    ORDER BY next_attempt_at,intent_id LIMIT $2`, [at, limit]);
  return rows.map(row => row.intent_id);
}

export function claimPaymentReceipt(pool: Pool, intentId: string, options: {
  clock: () => Date;
  testCapture: boolean;
  content: (facts: ReceiptFacts) => BillingNoticePayload;
}): Promise<ReceiptClaim | 'problem' | null> {
  return transaction(pool, async tx => {
    // Match settlement, refund and erasure lock order: account first, delivery last.
    const owner = (await tx.query<{ id: string; status: string; email: string; email_verified_at: Date | null }>(`SELECT a.id,a.status,a.email,a.email_verified_at
      FROM payment_intent i JOIN account a ON a.id=i.account_id
      WHERE i.id=$1 FOR SHARE OF a SKIP LOCKED`, [intentId])).rows[0];
    if (!owner) return null;
    const delivery = (await tx.query<Omit<ReceiptFacts, 'email'> & {
      recipient: string | null; environment: 'unknown' | 'test' | 'live'; eligible: boolean;
      payload: BillingNoticePayload | null; attempts: number; first_attempt_at: Date | null;
    }>(`SELECT d.intent_id,d.payload,d.attempts,d.first_attempt_at,i.receipt_recipient_email AS recipient,i.sku,
          p.amount_minor,p.paid_at,p.payment_environment AS environment,
          (i.status='succeeded' AND i.fulfilled_at IS NOT NULL AND p.status='succeeded' AND NOT p.needs_review
          AND p.intent_id=i.id AND p.account_id=i.account_id AND p.provider_payment_id=i.provider_payment_id
          AND p.provider=i.payment_provider AND p.payment_environment=i.payment_environment
          AND p.payment_merchant_id IS NOT DISTINCT FROM i.payment_merchant_id) IS TRUE AS eligible
      FROM payment_receipt_delivery d JOIN payment_intent i ON i.id=d.intent_id JOIN payment p ON p.id=d.payment_id
      WHERE d.intent_id=$1 AND i.account_id=$2 AND d.next_attempt_at<=$3 AND (d.lease_until IS NULL OR d.lease_until<=$3)
      FOR UPDATE OF d SKIP LOCKED`, [intentId, owner.id, options.clock()])).rows[0];
    if (!delivery) return null;
    const now = options.clock();
    const age = delivery.first_attempt_at ? now.getTime() - delivery.first_attempt_at.getTime() : 0;
    if (!delivery.eligible || owner.status !== 'active' || !owner.email_verified_at || owner.email !== delivery.recipient ||
      delivery.environment === 'unknown' || (delivery.environment === 'test' && !options.testCapture) ||
      delivery.attempts >= MAX_ATTEMPTS || age < 0 || age >= RETRY_WINDOW_MS) {
      await tx.query(`UPDATE payment_receipt_delivery SET status='problem',next_attempt_at=NULL,lease_token=NULL,lease_until=NULL
        WHERE intent_id=$1`, [intentId]);
      return 'problem';
    }
    const payload = delivery.payload ?? options.content({
      intent_id: intentId, sku: delivery.sku, amount_minor: delivery.amount_minor, paid_at: delivery.paid_at,
      email: delivery.environment === 'test' ? TEST_PAYMENT_RECEIPT_EMAIL : owner.email,
    });
    return (await tx.query<ReceiptClaim>(`UPDATE payment_receipt_delivery
      SET payload=$2,attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,$3),
        lease_token=gen_random_uuid(),lease_until=$4
      WHERE intent_id=$1 RETURNING intent_id,lease_token,payload`, [intentId, payload, now, new Date(now.getTime() + LEASE_MS)])).rows[0]!;
  });
}

export async function finishPaymentReceipt(pool: Pool, claim: ReceiptClaim,
  outcome: 'accepted' | 'failed' | 'unknown', at: Date): Promise<boolean> {
  const result = await pool.query(`UPDATE payment_receipt_delivery SET status=$3,lease_token=NULL,lease_until=NULL,
      next_attempt_at=CASE WHEN $3='problem' AND attempts<$5 AND $4::timestamptz<first_attempt_at+($6::int*interval '1 millisecond')
        THEN $4 ELSE NULL END
    WHERE intent_id=$1 AND lease_token=$2`, [
    claim.intent_id, claim.lease_token, outcome === 'accepted' ? 'accepted' : 'problem',
    new Date(at.getTime() + RETRY_DELAY_MS), MAX_ATTEMPTS, RETRY_WINDOW_MS,
  ]);
  return result.rowCount === 1;
}
