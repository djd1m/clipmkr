// Канон §7. Размеры частей — политика транспорта из январского донора.
export const MAX_UPLOAD_BYTES = 2_000_000_000;
export const PRESIGNED_SECONDS = 900;
// Политика одной исходной записи: снимок сохраняется на video при создании.
export const NORMAL_SOURCE_SECONDS = 5400;
export const BLOGGER_SOURCE_SECONDS = 7200;
// Технический предел; допуск аккаунта проверяется отдельно по снимку в probe.
export const MAX_SOURCE_SECONDS = 86400;
export function sourceLimitSeconds(account: { is_blogger: boolean; blogger_source_limit_seconds: number | null }): number {
  return account.is_blogger
    ? account.blogger_source_limit_seconds ?? BLOGGER_SOURCE_SECONDS
    : NORMAL_SOURCE_SECONDS;
}
export function moscowDay(now: Date): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Непригодное время');
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
export function quotaResetAt(now: Date): string {
  return new Date(Date.parse(`${moscowDay(now)}T21:00:00Z`)).toISOString();
}
