import type { Pool, PoolClient } from 'pg';
import { sourceLimitSeconds, MAX_SOURCE_SECONDS } from '@clipmaker/shared/upload';
import { transaction } from './quota.js';
import { hasOwnerUnlimited } from './owner-entitlement.js';

type Policy = { account_id: string; is_blogger: boolean; blogger_source_limit_seconds: number | null;
  blogger_commission_percent: 20 | 30 | null; max_source_seconds: number };
type PolicyInput = { actorAccountId: string; accountId: string; isBlogger: boolean;
  sourceLimitSeconds: number | null; commissionPercent: 20 | 30 | null; reason: string };
type PolicyResult = { kind: 'updated'; policy: Policy } | { kind: 'invalid' | 'forbidden' | 'not_found' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getBloggerPolicy(db: Pick<PoolClient, 'query'>, accountId: string): Promise<Policy | null> {
  const row = (await db.query<Omit<Policy, 'max_source_seconds'>>(`SELECT id AS account_id,is_blogger,
    blogger_source_limit_seconds,blogger_commission_percent FROM account WHERE id::text=$1 AND status='active'`, [accountId])).rows[0];
  return row ? { ...row, max_source_seconds: sourceLimitSeconds(row) } : null;
}

export function setBloggerPolicy(pool: Pool, input: PolicyInput): Promise<PolicyResult> {
  const reason = typeof input.reason === 'string' ? input.reason.trim() : '';
  if (!uuid.test(input.actorAccountId) || !uuid.test(input.accountId) || typeof input.isBlogger !== 'boolean'
    || (input.sourceLimitSeconds !== null && (!Number.isSafeInteger(input.sourceLimitSeconds)
      || input.sourceLimitSeconds < 120 || input.sourceLimitSeconds > MAX_SOURCE_SECONDS))
    || ![null,20,30].includes(input.commissionPercent) || reason.length < 3 || reason.length > 300)
    return Promise.resolve({ kind: 'invalid' });
  return transaction(pool, async tx => {
    // Один порядок блокировок исключает взаимоблокировку при настройке двух владельцев.
    await tx.query(`SELECT id FROM account WHERE id=ANY($1::uuid[]) ORDER BY id FOR NO KEY UPDATE`,
      [[input.actorAccountId,input.accountId]]);
    if (!await hasOwnerUnlimited(tx, input.actorAccountId)) return { kind: 'forbidden' } as const;
    const before = await getBloggerPolicy(tx, input.accountId);
    if (!before) return { kind: 'not_found' } as const;
    await tx.query(`UPDATE account SET is_blogger=$2,blogger_source_limit_seconds=$3,
      blogger_commission_percent=$4,updated_at=now() WHERE id=$1`,
    [input.accountId,input.isBlogger,input.sourceLimitSeconds,input.commissionPercent]);
    const after = (await getBloggerPolicy(tx, input.accountId))!;
    const auditReason = `blogger:${before.is_blogger}->${after.is_blogger}; limit:${before.blogger_source_limit_seconds}->${after.blogger_source_limit_seconds}; rate:${before.blogger_commission_percent}->${after.blogger_commission_percent}; ${reason}`;
    await tx.query(`INSERT INTO operator_action(operator,reason,account_id,action,plan_before,plan_after)
      SELECT $1,$2,id,'set_blogger_policy',plan,plan FROM account WHERE id=$3`,
    [input.actorAccountId,auditReason,input.accountId]);
    return { kind: 'updated', policy: after } as const;
  });
}
