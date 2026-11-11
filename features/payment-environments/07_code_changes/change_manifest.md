# Манифест изменений автора

Source author: `gpt-6.1-sol high`. Нормативные01/ADR/05 автор не менял. План06 обновил координатор до admission на30 файлов.

## Созданы

- `packages/shared/src/payment-identity.ts` — Общий обязательный union типов identity; fake допускает только TEST.
- `packages/db/migrations/030_payment_environments.sql` — Аддитивные поля с unknown history, CHECK и one-way immutable triggers; финансовые значения не мигрируются.
- `packages/db/src/payment-provenance.ts` — Общая LIVE eligibility и locked/reread paired reconciliation/CAS без сети.
- `apps/web/src/server/payments/ops-payment-provenance.ts` — Изолированный compiled GET-only CLI; bounded private candidates, default dry-run, aggregate output.
- `tests/payment-environments.integration.test.ts` — Реальные PG/socket проверки migration/history, locks, event rollback, refund matrix, Q-01 и compiled CLI/backfill LIVE+TEST.
- `tests/browser/payment-environments-next.test.ts` — Настоящий Next/AuthService/PG/Redis, owner/blogger/foreign API+DOM+reload в Chromium/WebKit и old native HTTP writer rollback/cutover rehearsal.
## Изменены

- `packages/db/src/payments.ts` — Identity snapshots и proof checks, advisory→account→intent→payment, claim после checks; erased/unlinked refund без восстановления связей.
- `packages/db/src/index.ts` — Экспорт provenance helpers через существующий DB facade.
- `packages/db/src/blogger-report.ts` — Общий LIVE predicate, прежний месяц/Москва и distinct payer.
- `apps/web/src/server/payments/provider.ts` — Обязательная readonly identity у provider/remote.
- `apps/web/src/server/payments/yookassa.ts` — Identity из server options и canonical raw после прежних guards.
- `apps/web/src/server/payments/fake.ts` — Неизменяемая TEST identity.
- `apps/web/src/server/billing-handler.ts` — Snapshot до POST, proof retry/bind/cancel, запрет unbound unknown POST, sanitized conflict log.
- `apps/web/src/server/billing-deps.ts` — Передача обязательного proof в native DB функции.
- `apps/web/src/server/partner.ts` — Общий LIVE predicate с прежней all-time семантикой.
- `apps/web/tsconfig.preflight.json` — Явное включение CLI entry в native preflight build.
- `tests/billing.unit.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/billing.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/credit-packages.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/relocation-test-webhook.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/yookassa-receipts.unit.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/yookassa-receipts.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/blogger-report.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/partner.integration.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/payments-guards.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/test-webhook-route.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/fixtures/fake-yookassa-server.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/preflight.test.ts` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `tests/run-payments-mutations.mjs` — Обновлена явная provenance фикстур и/или проверка согласованного payment contract; точные результаты в author-summary.md.
- `scripts/test-credit-mutations.mjs` — Актуальные proof/rebound canaries, unique anchors, bounded existing-ID selection, проверка реального исполнения теста.

Удалённых файлов нет. Generated QA artifact deltas сохраняются приватно и восстанавливаются перед freeze; они не являются частью source change.
