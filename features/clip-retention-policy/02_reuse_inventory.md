# Переиспользование

- packages/shared/src/tariff.ts: FREE_RETENTION_MS и clipExpiry.
- packages/db/src/plan.ts: effectivePlanSql, retentionFromSql, clipAliveSql.
- apps/web/src/server/retention.ts и watchdog.ts: существующая периодическая очистка.
- apps/web/src/server/support/mail.ts: существующий Resend transport; перед расширением проверить idempotency и границы назначения.
- apps/web/src/server/screen.ts, clip-file.ts, short-link.ts: существующие точки применения срока.
- apps/web/src/app/clips/ClipCard.tsx: существующая дата хранения и состояние недоступности.

Новую очередь, cron-сервис, отдельный email SDK или библиотеку дат пока не добавлять. Инвентаризация targets предварительная, не K1/K2.
