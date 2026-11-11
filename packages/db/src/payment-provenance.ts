import type { Pool } from 'pg';
import type { PaymentIdentity } from '@clipmaker/shared/payment-identity';
import { transaction } from './quota.js';

export class PaymentProvenanceConflict extends Error {
  constructor() { super('payment_provenance_conflict'); this.name = 'PaymentProvenanceConflict'; }
}

/** Caller supplies source-controlled SQL aliases; no SKU, period or runtime configuration. */
export function verifiedLivePaymentSql(p: string, i: string): string {
  if (![p, i].every(alias => /^[a-z][a-z0-9_]*$/.test(alias))) throw new Error('Invalid payment SQL alias');
  return `(${p}.provider='yookassa' AND ${i}.payment_provider='yookassa'
    AND ${p}.payment_environment='live' AND ${i}.payment_environment='live'
    AND ${p}.payment_merchant_id IS NOT NULL AND ${p}.payment_merchant_id=${i}.payment_merchant_id
    AND ${p}.intent_id=${i}.id AND ${p}.account_id=${i}.account_id
    AND ${p}.provider_payment_id=${i}.provider_payment_id AND ${p}.amount_minor=${i}.price_minor
    AND ${p}.status='succeeded' AND ${p}.needs_review=false
    AND ${i}.status='succeeded' AND ${i}.fulfilled_at IS NOT NULL)`;
}

/** Network proof is obtained before entering this transaction. All writes are provenance-only
 * except the existing bind operation's provider id. Dry-run takes the same locks and validates. */
export async function reconcilePaymentProvenance(pool: Pool, input: {
  provider: 'yookassa' | 'fake'; payment: { id: string; orderId: string | null; amountMinor: number; identity: PaymentIdentity };
  mode: 'bind' | 'backfill'; apply: boolean; intentId?: string;
}): Promise<'updated' | 'unchanged'> {
  const { payment, provider } = input;
  const identity = payment.identity;
  if (identity.environment === 'unknown' || identity.provider !== provider || !payment.orderId || (input.intentId && input.intentId !== payment.orderId)) throw new PaymentProvenanceConflict();
  return transaction(pool, async tx => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`payment:${provider}:${payment.id}`]);
    const candidate = (await tx.query('SELECT account_id FROM payment_intent WHERE id=$1', [payment.orderId])).rows[0];
    if (!candidate) throw new PaymentProvenanceConflict();
    await tx.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [candidate.account_id]);
    const intent = (await tx.query('SELECT * FROM payment_intent WHERE id=$1 FOR UPDATE', [payment.orderId])).rows[0];
    const stored = (await tx.query('SELECT * FROM payment WHERE provider=$1 AND provider_payment_id=$2 FOR UPDATE', [provider, payment.id])).rows[0];
    if (!intent || intent.account_id !== candidate.account_id || intent.price_minor !== payment.amountMinor ||
      (intent.provider_payment_id !== null && intent.provider_payment_id !== payment.id) ||
      (input.mode === 'bind' && intent.payment_environment === 'unknown' && intent.status !== 'created') ||
      (input.mode === 'backfill' && (!stored || intent.provider_payment_id !== payment.id))) throw new PaymentProvenanceConflict();
    for (const row of [intent, stored].filter(Boolean)) {
      if (row.payment_environment !== 'unknown' && (row.payment_environment !== identity.environment || row.payment_merchant_id !== identity.merchantId || (row.payment_provider ?? row.provider) !== provider)) throw new PaymentProvenanceConflict();
    }
    if (stored && (stored.intent_id !== intent.id || stored.account_id !== intent.account_id || stored.amount_minor !== payment.amountMinor)) throw new PaymentProvenanceConflict();
    // Ordinary bind may promote the pending intent, never an existing historical payment.
    const classifyStored = input.mode === 'backfill' && stored?.payment_environment === 'unknown';
    const changed = intent.payment_environment === 'unknown' || classifyStored || intent.provider_payment_id === null;
    if (input.apply) {
      await tx.query(`UPDATE payment_intent SET payment_provider=$2,payment_environment=$3,payment_merchant_id=$4,provider_payment_id=COALESCE(provider_payment_id,$5) WHERE id=$1 AND (payment_environment='unknown' OR (payment_provider=$2 AND payment_environment=$3 AND payment_merchant_id IS NOT DISTINCT FROM $4))`, [intent.id, provider, identity.environment, identity.merchantId, payment.id]);
      if (classifyStored) await tx.query(`UPDATE payment SET payment_environment=$2,payment_merchant_id=$3 WHERE id=$1 AND payment_environment='unknown'`, [stored.id, identity.environment, identity.merchantId]);
    }
    return changed ? 'updated' : 'unchanged';
  });
}
