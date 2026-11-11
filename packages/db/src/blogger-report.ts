import { verifiedLivePaymentSql } from './payment-provenance.js';
import type { Pool } from 'pg';
import { transaction } from './quota.js';
import { hasOwnerUnlimited } from './owner-entitlement.js';

type Counters = {
  registrations: number; active_users: number; paying_users: number;
  payments: number; revenue_minor: number; commission_estimate_minor: number | null;
};
type CodeReport = { id: string; code: string; status: 'active' | 'blocked'; counters: Counters };
type Blogger = {
  account_id: string; email: string; commission_percent: 20 | 30 | null;
  counters: Counters; codes: CodeReport[];
};
type ReportRow = {
  account_id: string; email: string; commission_percent: 20 | 30 | null;
  code_id: string | null; code: string | null; code_status: 'active' | 'blocked' | null;
  registrations: string; active_users: string; paying_users: string; blogger_paying_users: string; payments: string; revenue_minor: string;
};
const emptyCounters = (): Counters => ({ registrations: 0, active_users: 0, paying_users: 0,
  payments: 0, revenue_minor: 0, commission_estimate_minor: null });
const estimate = (revenue: number, rate: 20 | 30 | null): number | null =>
  rate === null ? null : Number(BigInt(revenue) * BigInt(rate) / 100n);
const integer = (value: string): number => {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new RangeError('Сумма отчёта вне точного целого диапазона');
  return result;
};

/**
 * Только предварительная оценка по текущей ставке, до комиссий провайдера, не задолженность.
 * Переиспользованы независимые агрегаты/уникальные плательщики №3 referrals/metrics.mjs,
 * native PartnerService payment↔intent↔attribution и целочисленное округление №6 commission.
 */
export async function bloggerReport(pool: Pool, actorAccountId: string, month: string): Promise<
  { kind: 'ok'; month: string; timezone: 'Europe/Moscow'; bloggers: Blogger[] }
  | { kind: 'forbidden' | 'invalid' }
> {
  if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) return { kind: 'invalid' };
  return transaction(pool, async tx => {
    // Все агрегаты и проверка доступа читают один снимок, даже при одновременном webhook.
    await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    if (!await hasOwnerUnlimited(tx, actorAccountId)) return { kind: 'forbidden' };
    const rows = (await tx.query<ReportRow>(`
      WITH bounds AS (
        SELECT ($1::date::timestamp AT TIME ZONE 'Europe/Moscow') AS lo,
          (($1::date + interval '1 month')::timestamp AT TIME ZONE 'Europe/Moscow') AS hi
      ), codes AS (
        SELECT a.id AS account_id,a.email,a.blogger_commission_percent AS commission_percent,
          pc.id AS code_id,pc.code,pc.status AS code_status
        FROM account a LEFT JOIN partner pt ON pt.account_id=a.id
        LEFT JOIN partner_code pc ON pc.partner_id=pt.id
        WHERE a.status='active' AND a.is_blogger=true
      ), attributed AS (
        SELECT a.* FROM attribution a JOIN codes c ON c.code_id=a.partner_code_id
        WHERE a.status IN ('pending','activated') AND a.account_id<>c.account_id
      ), registrations AS (
        SELECT a.partner_code_id,count(DISTINCT a.account_id) AS n
        FROM attributed a CROSS JOIN bounds b
        WHERE a.created_at>=b.lo AND a.created_at<b.hi GROUP BY a.partner_code_id
      ), active AS (
        SELECT a.partner_code_id,count(DISTINCT a.account_id) AS n
        FROM attributed a JOIN video v ON v.account_id=a.account_id CROSS JOIN bounds b
        WHERE v.status='done' AND v.deleted_at IS NULL AND v.finished_at>=b.lo AND v.finished_at<b.hi
          AND v.finished_at>=a.assigned_at
          AND EXISTS (SELECT 1 FROM clip cl WHERE cl.video_id=v.id AND cl.status='done')
        GROUP BY a.partner_code_id
      ), verified_sales AS (
        SELECT c.account_id AS blogger_id,i.referral_partner_code_id AS partner_code_id,p.account_id,p.amount_minor
        FROM payment p JOIN payment_intent i ON i.id=p.intent_id AND i.account_id=p.account_id
          AND i.provider_payment_id=p.provider_payment_id AND i.price_minor=p.amount_minor
        JOIN codes c ON c.code_id=i.referral_partner_code_id AND c.account_id<>p.account_id CROSS JOIN bounds b
        WHERE ${verifiedLivePaymentSql('p','i')}
          AND i.sku IN ('start_v1','pro_v1','addon_v1')
          AND p.paid_at>=b.lo AND p.paid_at<b.hi
      ), sales AS (
        SELECT partner_code_id,count(DISTINCT account_id) AS people,count(*) AS payments,sum(amount_minor) AS revenue
        FROM verified_sales GROUP BY partner_code_id
      ), blogger_payers AS (
        SELECT blogger_id,count(DISTINCT account_id) AS people FROM verified_sales GROUP BY blogger_id
      )
      SELECT c.*,coalesce(r.n,0)::text AS registrations,coalesce(a.n,0)::text AS active_users,
        coalesce(s.people,0)::text AS paying_users,coalesce(bp.people,0)::text AS blogger_paying_users,coalesce(s.payments,0)::text AS payments,
        coalesce(s.revenue,0)::text AS revenue_minor
      FROM codes c LEFT JOIN registrations r ON r.partner_code_id=c.code_id
        LEFT JOIN active a ON a.partner_code_id=c.code_id LEFT JOIN sales s ON s.partner_code_id=c.code_id
        LEFT JOIN blogger_payers bp ON bp.blogger_id=c.account_id
      ORDER BY c.email,c.account_id,c.code,c.code_id`, [`${month}-01`])).rows;
    const bloggers = new Map<string, Blogger>();
    for (const row of rows) {
      let blogger = bloggers.get(row.account_id);
      if (!blogger) {
        blogger = { account_id: row.account_id, email: row.email, commission_percent: row.commission_percent,
          counters: emptyCounters(), codes: [] };
        bloggers.set(row.account_id, blogger);
      }
      if (!row.code_id) continue;
      blogger.counters.paying_users = integer(row.blogger_paying_users);
      const counters: Counters = { registrations: integer(row.registrations), active_users: integer(row.active_users),
        paying_users: integer(row.paying_users), payments: integer(row.payments), revenue_minor: integer(row.revenue_minor),
        commission_estimate_minor: null };
      counters.commission_estimate_minor = estimate(counters.revenue_minor, blogger.commission_percent);
      blogger.codes.push({ id: row.code_id, code: row.code!, status: row.code_status!, counters });
      // Paying users are distinct across the blogger's links; other counters are additive.
      for (const key of ['registrations', 'active_users', 'payments', 'revenue_minor'] as const) {
        blogger.counters[key] += counters[key];
        if (!Number.isSafeInteger(blogger.counters[key])) throw new RangeError('Сумма отчёта вне точного целого диапазона');
      }
    }
    for (const blogger of bloggers.values()) {
      blogger.counters.commission_estimate_minor = estimate(blogger.counters.revenue_minor, blogger.commission_percent);
    }
    return { kind: 'ok', month, timezone: 'Europe/Moscow', bloggers: [...bloggers.values()] };
  });
}
