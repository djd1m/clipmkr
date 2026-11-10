// Действующий план аккаунта в SQL — ОДНО место для всех чтений (фича 30 payments, AC-11, U6 плана).
// Оплаченный план истекает по plan_paid_until ДО прохода сторожа: иначе между концом срока и сторожем клип
// рендерился бы без метки и не получал срок хранения. Зеркало в TS — `effectivePlan` (@clipmaker/shared/tariff).
// Сравнение НА РАВЕНСТВО (ADR-004): всё, что не ровно 'paid', и неизвестный источник — 'free'.
import { FREE_RETENTION_MS, PAID_RETENTION_MS } from '@clipmaker/shared/tariff';
import { SHOWCASE_CLIP_IDS } from '@clipmaker/shared/showcase';
const IDENT = /^[a-z][a-z0-9_]*$/;
const NOW = /^(now\(\)|\$[1-9][0-9]?)$/;
function ident(name: string): string {
  if (!IDENT.test(name)) throw new Error('Непригодный псевдоним таблицы в SQL плана');
  return name;
}
function clock(now: string): string {
  if (!NOW.test(now)) throw new Error('Непригодное выражение времени в SQL плана');
  return now;
}
/** `(… 'paid' | 'free')` для строки account с псевдонимом `a`. `now` — `now()` или номер параметра с моментом. */
export function effectivePlanSql(a = 'a', now = 'now()'): string {
  const t = ident(a), at = clock(now);
  return `(CASE WHEN (${t}.owner_unlimited=true AND ${t}.status='active') OR (${t}.plan='paid' AND (${t}.plan_source IN ('none','operator') OR (${t}.plan_source='payment' AND ${t}.plan_paid_until > ${at})) OR EXISTS (SELECT 1 FROM credit_grant cg WHERE cg.account_id=${t}.id AND cg.source='payment' AND cg.entitlement_start<=${at} AND cg.entitlement_end>${at})) THEN 'paid' ELSE 'free' END)`;
}
/** Последнее применимое окончание оплаты; текущий баланс и trial/recovery не влияют. */
export function retentionFromSql(v = 'v', a = 'a', now = 'now()'): string {
  ident(v); const account = ident(a), at = clock(now);
  return `GREATEST(${account}.plan_paid_until, (SELECT max(cg.entitlement_end) FROM credit_grant cg
    WHERE cg.account_id=${account}.id AND cg.source='payment' AND cg.entitlement_start<=${at}))`;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** SQL mirror clipExpiry: null означает исключение или неизвестную готовность, не наличие байтов. */
export function retentionDeadlineSql(c = 'c', v = 'v', a = 'a', now = 'now()'): string {
  const clip = ident(c), account = ident(a), paid = retentionFromSql(v,a,now);
  const ids = SHOWCASE_CLIP_IDS.map(id => {
    if (!UUID.test(id)) throw new Error('Непригодный идентификатор витрины');
    return `'${id}'::uuid`;
  });
  const exempt = `(${account}.owner_unlimited=true AND ${account}.status='active') OR
    (${account}.plan='paid' AND ${account}.plan_source IN ('none','operator'))`
    + (ids.length ? ` OR ${clip}.id IN (${ids.join(',')})` : '');
  return `LEAST(${clip}.expires_at, CASE WHEN (${exempt}) OR ${clip}.ready_at IS NULL THEN NULL
    ELSE GREATEST(${clip}.ready_at + make_interval(secs => ${FREE_RETENTION_MS/1000}),
      ${paid} + make_interval(secs => ${PAID_RETENTION_MS/1000})) END)`;
}
/** Все пути обязаны учитывать durable claim, даже до успешного физического удаления. */
export function clipAliveSql(c = 'c', v = 'v', a = 'a', now = 'now()'): string {
  const clip = ident(c), at = clock(now), deadline = retentionDeadlineSql(c,v,a,now);
  return `(${clip}.deletion_started_at IS NULL AND ${clip}.media_deleted_at IS NULL
    AND (${deadline} IS NULL OR ${deadline}>${at}))`;
}
