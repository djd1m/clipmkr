import type { Pool, PoolClient } from 'pg';
import { sourceLimitSeconds, MAX_SOURCE_SECONDS } from '@clipmaker/shared/upload';
import { transaction } from './quota.js';
import { hasOwnerUnlimited } from './owner-entitlement.js';
import { raiseTrialCreditsTx } from './credits.js';

type Policy = { account_id: string; is_blogger: boolean; blogger_source_limit_seconds: number | null;
  blogger_commission_percent: 20 | 30 | null; max_source_seconds: number };
type PolicyInput = { actorAccountId: string; accountId: string; isBlogger: boolean;
  sourceLimitSeconds: number | null; commissionPercent: 20 | 30 | null; reason: string;
  expectedPolicy?: Pick<Policy, 'is_blogger' | 'blogger_source_limit_seconds' | 'blogger_commission_percent'> };
type PolicyResult = { kind: 'updated'; policy: Policy }
  | { kind: 'invalid' | 'forbidden' | 'not_found' | 'conflict' | 'credit_review_required' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getBloggerPolicy(db: Pick<PoolClient, 'query'>, accountId: string): Promise<Policy | null> {
  const row = (await db.query<Omit<Policy, 'max_source_seconds'>>(`SELECT id AS account_id,is_blogger,
    blogger_source_limit_seconds,blogger_commission_percent FROM account WHERE id::text=$1 AND status='active'`, [accountId])).rows[0];
  return row ? { ...row, max_source_seconds: sourceLimitSeconds(row) } : null;
}

export function setBloggerPolicy(pool: Pool, input: PolicyInput): Promise<PolicyResult> {
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  const expected = input.expectedPolicy;
  if (expected !== undefined && (expected === null || typeof expected !== 'object' || Array.isArray(expected)
    || Object.keys(expected).length !== 3 || !Object.keys(expected).every(key =>
      ['is_blogger','blogger_source_limit_seconds','blogger_commission_percent'].includes(key))
    || typeof expected.is_blogger !== 'boolean'
    || (expected.blogger_source_limit_seconds !== null && (!Number.isSafeInteger(expected.blogger_source_limit_seconds)
      || expected.blogger_source_limit_seconds < 120 || expected.blogger_source_limit_seconds > MAX_SOURCE_SECONDS))
    || ![null,20,30].includes(expected.blogger_commission_percent))) return Promise.resolve({ kind: 'invalid' });
  if (!uuid.test(input.actorAccountId) || !uuid.test(input.accountId) || typeof input.isBlogger !== 'boolean'
    || (input.sourceLimitSeconds !== null && (!Number.isSafeInteger(input.sourceLimitSeconds)
      || input.sourceLimitSeconds < 120 || input.sourceLimitSeconds > MAX_SOURCE_SECONDS))
    || ![null,20,30].includes(input.commissionPercent) || reason.length < 3 || reason.length > 300)
    return Promise.resolve({ kind: 'invalid' });
  input = { ...input, actorAccountId: input.actorAccountId.toLowerCase(), accountId: input.accountId.toLowerCase() };
  return transaction(pool, async tx => {
    // Один порядок блокировок исключает взаимоблокировку при настройке двух владельцев.
    await tx.query(`SELECT id FROM account WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE`,
      [[input.actorAccountId,input.accountId]]);
    if (!await hasOwnerUnlimited(tx, input.actorAccountId)) return { kind: 'forbidden' } as const;
    const before = await getBloggerPolicy(tx, input.accountId);
    if (!before) return { kind: 'not_found' } as const;
    if (expected && (expected.is_blogger !== before.is_blogger
      || expected.blogger_source_limit_seconds !== before.blogger_source_limit_seconds
      || expected.blogger_commission_percent !== before.blogger_commission_percent)) return { kind: 'conflict' } as const;
    let trialAudit = `trial_total:n/a->n/a; trial_delta:0; trial:${input.isBlogger ? 'legacy' : 'revoked'}`;
    if (input.isBlogger && (await tx.query<{ billing_policy: string }>('SELECT billing_policy FROM account WHERE id=$1',
      [input.accountId])).rows[0]!.billing_policy === 'credits_v1') {
      const trial = await raiseTrialCreditsTx(tx, input.accountId, sourceLimitSeconds({ is_blogger: true,
        blogger_source_limit_seconds: input.sourceLimitSeconds }));
      if (trial.kind === 'unavailable') return { kind: 'credit_review_required' } as const;
      trialAudit = `trial_total:${trial.beforeTotal}->${trial.afterTotal}; trial_delta:${trial.delta}; trial:${trial.kind}`;
    }
    await tx.query(`UPDATE account SET is_blogger=$2,blogger_source_limit_seconds=$3,
      blogger_commission_percent=$4,updated_at=now() WHERE id=$1`,
    [input.accountId,input.isBlogger,input.sourceLimitSeconds,input.commissionPercent]);
    const after = (await getBloggerPolicy(tx, input.accountId))!;
    const auditReason = `blogger:${before.is_blogger}->${after.is_blogger}; limit:${before.blogger_source_limit_seconds}->${after.blogger_source_limit_seconds}; rate:${before.blogger_commission_percent}->${after.blogger_commission_percent}; ${trialAudit}; ${reason}`;
    await tx.query(`INSERT INTO operator_action(operator,reason,account_id,action,plan_before,plan_after)
      SELECT $1,$2,id,'set_blogger_policy',plan,plan FROM account WHERE id=$3`,
    [input.actorAccountId,auditReason,input.accountId]);
    return { kind: 'updated', policy: after } as const;
  });
}
