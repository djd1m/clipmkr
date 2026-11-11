# Изменения manual-billing-reminders

24 редактируемых targets,6 новых файлов,18 изменений,0 удалений.12 дополнительных declared paths — только readonly dependencies, byte-identical принятым pins. Хеши и точные36 путей — `source-manifest.json`; результаты — `author-summary.md` и `test-evidence.json`. Это manifest исполнителя, не квитанция SOURCE QE.

## Созданы

- `packages/db/migrations/031_billing_notice.sql` — journal, UNIQUE/CHECK/FK/index и native soft-erasure trigger.
- `packages/db/src/billing-notice-ledger.ts` — all-rights union, отдельный LIVE proof, discovery/recovery/claim/defer/retry/CAS.
- `apps/web/src/server/billing-notices.ts` — согласованный контент, per-pool cursor и2/4/20s bounded dispatch.
- `tests/billing-notices.integration.test.ts` — реальные PG/HTTP/barriers/clock/erasure/budget controls.
- `tests/browser/manual-billing-reminders-next.test.ts` — actual Next, HTTPS cookies,60s scheduler, mail socket, CTA и0payment effects.
- `scripts/test-billing-notices-mutations.mjs` —21 exact-anchor variants в owned copy, matched assertion red/restored green/SHA.

## Изменены

- `packages/db/src/index.ts` — только named re-exports нового ledger.
- `packages/shared/src/enums.ts` — closed billing notice states и031 SQL_ENUMS entries.
- `packages/shared/src/config.ts` — optional boolean flag, default false.
- `apps/web/src/server/environment.ts` — явный web env adapter flag.
- `apps/web/src/server/queue-runtime.ts` — один mailer и pure checkout predicate в watchdog wiring.
- `apps/web/src/server/watchdog.ts` — billing после прежних media/retention шагов, прежний return сохранён.
- `apps/web/src/server/payments/yookassa.ts` — одна body option `save_payment_method:false`.
- `docker-compose.yml`, `.env.example` — web-only flag=false.
- `tests/fixtures/environment.ts` — flag=false и3пустых inherited receipt keys для точного существующего wiring contract.
- `tests/fixtures/payment-test-transport.mjs` — optional loopback Resend mapping только test/*_test; прежний payment/legacy IPC contract сохранён.
- `tests/config.test.ts`, `tests/preflight.test.ts`, `tests/wiring.test.ts` — default/missing/invalid/web-only/resource-down controls.
- `tests/enums.test.ts`, `tests/database.integration.test.ts` —031 declarations/mutations и table count28.
- `tests/yookassa-receipts.unit.test.ts` — actual all-SKU request body guard false, без сохранённого method id, прежний RUB/receipt.
- `tests/test-webhook-route.test.ts` — только fixed measured config SHA; accepted handler/ip pins сохранены.

## Readonly

`credits.ts`, `quota.ts`, `plan.ts`, `support-email.ts`, `migrate.ts`, `retention-notices.ts`, `support/mail.ts`, `retention.ts`, `tariff.ts`, `scripts/test-db.mjs`, migrations021/022 не изменялись. Более широкий accepted dependency inventory остаётся в закреплённых `requirements-revision.json`/`dependency-recheck.md`.

После freeze этот07 не дополняется результатами общего прогона: они остаются private либо08, чтобы не менять manifest входов SOURCE во время независимой проверки.
