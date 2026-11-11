import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { BillingNoticeState } from '@clipmaker/shared/enums';
import { creditAccountLock } from './credits.js';
import { verifiedLivePaymentSql } from './payment-provenance.js';
import { transaction } from './quota.js';

const DAY = 86_400_000, HOUR = 3_600_000;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export interface BillingNoticePayload { from: string; to: string; subject: string; text: string; html: string }
export interface BillingNoticeEligibility {
  accountId: string; billingPolicy: string; email: string; recipientAllowed: boolean;
  paidEnd: Date | null; offset: 1 | 3 | null; liveQualified: boolean; relevantReview: boolean;
}
export interface BillingNoticeClaim {
  id: string; account_id: string; provider_key: string; payload: BillingNoticePayload;
  attempts: number; last_attempt_at: Date;
}
interface Account {
  id: string; email: string; email_verified_at: Date | null; status: string; billing_policy: string;
  owner_unlimited: boolean; plan: string; plan_source: string; plan_paid_until: Date | null;
}
interface Interval { start: Date; end: Date; live: boolean; review: boolean }
interface Notice extends Omit<BillingNoticeClaim, 'payload' | 'last_attempt_at'> {
  authoritative_paid_end: Date; offset_days: number; state: BillingNoticeState;
  payload: BillingNoticePayload | null; payload_hash: string | null;
  first_attempt_at: Date | null; last_attempt_at: Date | null;
}
function offset(end: Date, now: Date): 1 | 3 | null {
  const remaining = end.getTime() - now.getTime();
  return remaining > DAY && remaining <= 3 * DAY ? 3 : remaining > 0 && remaining <= DAY ? 1 : null;
}
const wireHash = (p: BillingNoticePayload) => digest(JSON.stringify({ from: p.from, to: [p.to], subject: p.subject, text: p.text, html: p.html }));

/** Rights are read before qualification: TEST, unknown and spent grants remain in the union. */
export async function readBillingNoticeEligibility(db: Pick<PoolClient, 'query'>, accountId: string, now: Date): Promise<BillingNoticeEligibility | null> {
  const account = (await db.query<Account>('SELECT * FROM account WHERE id=$1', [accountId])).rows[0];
  if (!account) return null;
  const intervals = (await db.query<Interval>(`SELECT g.entitlement_start AS start,g.entitlement_end AS end,
    EXISTS(SELECT 1 FROM payment_intent i JOIN payment p ON p.intent_id=i.id
      WHERE i.id=g.payment_ref AND i.account_id=g.account_id AND ${verifiedLivePaymentSql('p', 'i')}) AS live,
    EXISTS(SELECT 1 FROM payment p WHERE p.intent_id=g.payment_ref AND (p.needs_review OR p.status='refunded')) AS review
    FROM credit_grant g WHERE g.account_id=$1 AND g.source='payment'
      AND g.entitlement_start IS NOT NULL AND g.entitlement_end>g.entitlement_start
    ORDER BY g.entitlement_start,g.entitlement_end`, [accountId])).rows;
  const components: { start: Date; end: Date; members: Interval[] }[] = [];
  for (const interval of intervals) {
    const last = components.at(-1);
    if (last && interval.start <= last.end) {
      if (interval.end > last.end) last.end = interval.end;
      last.members.push(interval);
    } else components.push({ start: interval.start, end: interval.end, members: [interval] });
  }
  const current = components.find(c => c.start <= now && now < c.end);
  let component: { end: Date; members: Interval[] } | undefined = current;
  const legacyEnd = account.plan_source === 'payment' && account.plan_paid_until && account.plan_paid_until > now ? account.plan_paid_until : null;
  let legacyQualified = true, legacyReview = false;
  if (legacyEnd) {
    // A legacy account has no start. Preserve its current right without manufacturing one.
    const joined = components.filter(c => c.start <= legacyEnd && c.end >= now);
    const end = joined.reduce((end, c) => c.end > end ? c.end : end, legacyEnd);
    component = { end, members: joined.flatMap(c => c.members) };
    const proof = (await db.query<{ live: boolean; review: boolean }>(`SELECT
      EXISTS(SELECT 1 FROM payment_intent i JOIN payment p ON p.intent_id=i.id
        WHERE i.account_id=$1 AND i.sku='legacy_pro990_v1' AND i.period_end=$2
          AND i.period_start<=$3 AND i.period_start<i.period_end AND ${verifiedLivePaymentSql('p', 'i')}) AS live,
      EXISTS(SELECT 1 FROM payment_intent i JOIN payment p ON p.intent_id=i.id
        WHERE i.account_id=$1 AND i.sku='legacy_pro990_v1' AND i.period_end=$2
          AND (p.needs_review OR p.status='refunded')) AS review`, [accountId, legacyEnd, now])).rows[0]!;
    legacyQualified = proof.live; legacyReview = proof.review;
  }
  const paidEnd = component?.end ?? null;
  return { accountId, billingPolicy: account.billing_policy, email: account.email,
    recipientAllowed: account.status === 'active' && account.billing_policy === 'credits_v1' && !!account.email_verified_at &&
      !account.owner_unlimited && !(account.plan === 'paid' && ['none', 'operator'].includes(account.plan_source)),
    paidEnd, offset: paidEnd ? offset(paidEnd, now) : null,
    liveQualified: !!component && legacyQualified && (!!legacyEnd || component.members.some(i => i.live)),
    relevantReview: legacyReview || !!component?.members.some(i => i.end > now && i.review) };
}
async function bounded<T>(pool: Pool, work: (tx: PoolClient) => Promise<T>) {
  return transaction(pool, async tx => {
    await tx.query("SET LOCAL lock_timeout='100ms'");
    await tx.query("SET LOCAL statement_timeout='1s'");
    return work(tx);
  });
}

/** SQL batches are bounded independently of the four external attempts. */
export async function prepareBillingNoticeBatch(pool: Pool, options: {
  clock: () => Date; admit: () => boolean; cursor?: { account?: string; notice?: string }; batch?: number;
}) {
  const { clock, admit } = options, batch = options.batch ?? 100;
  if (!Number.isInteger(batch) || batch < 1 || batch > 100) throw new Error('Invalid billing notice batch');
  const result = { ids: [] as string[], generated: 0, accountCursor: options.cursor?.account, backlog: 0 };
  if (!admit()) return result;
  await bounded(pool, tx => tx.query(`UPDATE billing_notice SET state='unknown',lease_until=NULL,last_error='lease_expired',updated_at=$1
    WHERE state='sending' AND lease_until<=$1 AND id IN (SELECT id FROM billing_notice
      WHERE state='sending' AND lease_until<=$1 ORDER BY lease_until,id LIMIT $2)`, [clock(), batch]));
  if (!admit()) return result;
  const accounts = await bounded(pool, async tx => {
    const read = (cursor: string | null) => tx.query<{ id: string }>(`SELECT id FROM account
      WHERE status='active' AND billing_policy='credits_v1' AND ($1::uuid IS NULL OR id>$1)
      ORDER BY id LIMIT $2`, [cursor, batch]);
    const selected = await read(options.cursor?.account ?? null);
    return selected.rows.length || !options.cursor?.account ? selected.rows : (await read(null)).rows;
  });
  for (const { id } of accounts) {
    if (!admit()) break;
    result.accountCursor = id;
    try {
      result.generated += await bounded(pool, async tx => {
        const now = clock(), facts = await readBillingNoticeEligibility(tx, id, now);
        if (!admit() || !facts?.paidEnd || !facts.offset || !facts.recipientAllowed) return 0;
        const key = 'billing_' + digest(`${id}|${facts.paidEnd.toISOString()}|${facts.offset}`);
        const inserted = await tx.query(`INSERT INTO billing_notice(account_id,authoritative_paid_end,offset_days,provider_key,due_at,created_at,updated_at)
          VALUES($1,$2,$3,$4,$5,$5,$5) ON CONFLICT(account_id,authoritative_paid_end,offset_days) DO NOTHING`, [id, facts.paidEnd, facts.offset, key, now]);
        return inserted.rowCount ?? 0;
      });
    } catch (error) {
      if ((error as { code?: string }).code !== '55P03') throw error;
    }
  }
  if (!admit()) return result;
  result.ids = await bounded(pool, async tx => {
    const read = (cursor: string | null) => tx.query<{ id: string }>(`SELECT id FROM billing_notice
      WHERE state IN ('pending','failed','unknown') AND due_at<=$1 AND ($2::uuid IS NULL OR id>$2)
      ORDER BY id LIMIT $3`, [clock(), cursor, batch]);
    let selected = await read(options.cursor?.notice ?? null);
    if (!selected.rows.length && options.cursor?.notice) selected = await read(null);
    return selected.rows.map(row => row.id);
  });
  result.backlog = result.ids.length;
  return result;
}

/** Lock order matches payment, email and erasure writers; HTTP starts only after commit. */
export async function claimBillingNotice(pool: Pool, id: string, options: {
  clock: () => Date; admit: () => boolean;
  checkoutAllowed: (accountId: string, billingPolicy: string) => boolean;
  content: (facts: BillingNoticeEligibility) => BillingNoticePayload;
  diagnostics?: { exhausted: number };
}): Promise<BillingNoticeClaim | null> {
  if (!options.admit()) return null;
  let exhausted = false;
  try {
    const claimed = await bounded(pool, async tx => {
      const owner = (await tx.query<{ account_id: string }>('SELECT account_id FROM billing_notice WHERE id=$1', [id])).rows[0];
      if (!owner) return null;
      const account = await tx.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [owner.account_id]);
      if (!account.rowCount) return null;
      await creditAccountLock(tx, owner.account_id);
      const notice = (await tx.query<Notice>('SELECT * FROM billing_notice WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!notice || notice.account_id !== owner.account_id || !['pending', 'failed', 'unknown'].includes(notice.state)) return null;
      const facts = await readBillingNoticeEligibility(tx, owner.account_id, options.clock());
      const now = options.clock();
      let reason: string | null = null;
      if (!facts?.paidEnd || facts.paidEnd.getTime() !== notice.authoritative_paid_end.getTime() || offset(facts.paidEnd, now) !== notice.offset_days) reason = 'period_changed';
      else if (!facts.recipientAllowed ||
        (notice.attempts > 0 && notice.payload?.to !== facts.email)) reason = 'recipient_unavailable';
      else if (notice.attempts >= 3 || (notice.first_attempt_at && now.getTime() - notice.first_attempt_at.getTime() >= 23 * HOUR)) reason = 'retry_exhausted';
      if (reason) {
        await tx.query("UPDATE billing_notice SET state='superseded',last_error=$2,updated_at=$3 WHERE id=$1", [id, reason, now]);
        exhausted = reason === 'retry_exhausted';
        return null;
      }
      if (!facts || !options.admit()) return null;
      if (!options.checkoutAllowed(facts.accountId, facts.billingPolicy)) return null;
      // Temporary qualification failure preserves the event, frozen bytes and retry anchors.
      if (!facts.liveQualified || facts.relevantReview) return null;
      if (notice.first_attempt_at && now < notice.first_attempt_at || notice.last_attempt_at && now.getTime() - notice.last_attempt_at.getTime() < HOUR) return null;
      const payload = notice.attempts > 0 ? notice.payload! : options.content(facts);
      if (!options.admit()) return null;
      return (await tx.query<BillingNoticeClaim>(`UPDATE billing_notice SET state='sending',payload=$2,payload_hash=$3,
        attempts=attempts+1,first_attempt_at=COALESCE(first_attempt_at,$4),last_attempt_at=$4,
        lease_until=$4::timestamptz+interval '2 minutes',last_error=NULL,updated_at=$4 WHERE id=$1 RETURNING *`,
      [id, payload, notice.attempts > 0 ? notice.payload_hash : wireHash(payload), now])).rows[0]!;
    });
    if (exhausted && options.diagnostics) options.diagnostics.exhausted++;
    return claimed;
  } catch (error) {
    if ((error as { code?: string }).code === '55P03') return null;
    throw error;
  }
}

export async function completeBillingNotice(pool: Pool, claim: BillingNoticeClaim, result: {
  state: 'accepted' | 'failed' | 'unknown'; receipt: string | null;
}): Promise<number> {
  const updated = await bounded(pool, tx => tx.query(`UPDATE billing_notice SET state=$2,provider_receipt=$3,lease_until=NULL,
    last_error=CASE WHEN $2='accepted' THEN NULL ELSE 'transport_'||$2 END,
    due_at=$4::timestamptz+interval '1 hour',updated_at=$4
    WHERE id=$1 AND state='sending' AND attempts=$5 AND last_attempt_at=$4`,
  [claim.id, result.state, result.receipt, claim.last_attempt_at, claim.attempts]));
  return updated.rowCount ?? 0;
}
