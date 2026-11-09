# Переиспользование и границы

Инвентарь прочитан до плана; новая библиотека, сервис, CLI, env или migration не нужны.

| Реальный источник | Переиспользование / ограничение |
|---|---|
| `apps/web/src/server/billing-handler.ts:createPaymentWebhookHandler` | Штатный raw-body/IP/provider verification и общий catch→503; обернуть только financial dependencies, canonical файл не менять. Его текущий unknown_intent→200 возникает после consumer, поэтому post-outcome rewrite отвергнут. |
| `apps/web/src/server/billing-deps.ts:createBillingDependencies` и `billing-runtime.ts:getBillingDependencies` | Настоящие consumers и wiring, без копирования checkout/idempotency. |
| `apps/web/src/server/runtime.ts:getRuntime`; `packages/shared/src/config.ts:WebConfig` | Единственный runtime pool/config/provider. QA route получает эти экземпляры; exact profile проверяется по уже типизированным полям. |
| `packages/db/src/payments.ts:isUuid`, `applyVerifiedPayment`, `recordVerifiedRefund` | Проверить UUID до SQL cast. Consumers сначала claimEvent, затем ownership: не вызывать их для foreign intent. Ни один canonical DB файл не менять. |
| `apps/web/src/server/payments/yookassa.ts:createYooKassaProvider` | Настоящий adapter, GET и testMode; не доверять входящему JSON вместо провайдера. |
| `tests/billing.integration.test.ts`; `tests/fixtures/fake-yookassa-server.ts` | Real PostgreSQL, отдельная случайная schema, production dependency factory и настоящий provider adapter с локальным HTTP fixture. Повтор/20 concurrent, refund ordering, rollback; не выдавать это за merchant E2E. |
| `tests/test-webhook-route.test.ts` | Существующие canonical source hashes/совместимость; не менять ожидаемые hashes ради guard. |
| `tests/payments-guards.test.ts` | Exact webhook directory и route list сейчас требуют один путь. Это реальный четвёртый target: добавить только QA route и сохранить ровно3 plan writers. |
| `scripts/test.mjs`, `scripts/test-db.mjs` | Существующий runner с обязательным skip reporter и отдельной *_test DB; новые test helpers не нужны. |

Exact QA binding: DB host `clipmkr-stage-20261028-db-1`, DB `n5_relocation_qa_test`, role `n5_relocation_qa`; Redis host `clipmkr-stage-20261028-redis-1`, DB4; S3 prefix `tests/local-ux-20261104/relocate-20261109/`; public origin `https://77.83.87.178`. Порты PostgreSQL5432/Redis6379 (явные или протокольные defaults), без URL query/hash. Секреты/UUID владельца вGit не копировать. `config.payments.mode === 'live'` означает реальный API; дополнительно обязательны `testMode === true`, непустой `test_` secret и provider.name=yookassa. Реальные списания не допускаются. `billingMode=credits_v1`, checkoutEnabled=false; testCheckoutAccountId не является callback gate.

Rejected: изменение общего consumer/handler;503 после commit; перенос source intents вQA; второй provider/service; новый identity store; source relay; отключение provider verification. Каждый вариант меняет scope либо не решает исходный дефект.

Read-only image seam: app/package/Dockerfile diff между source image basecommit `11a90aec9d26be56849ac06c9f12a98001739a28` и рабочим HEAD `fb4cad66c6adf511d8bf6e65dffc391aebf02d3f` пуст на момент анализа. После child QE parent отдельно проверит base+4-file patch, соберёт immutable QA web и изменит свой reviewed route/Compose. Здесь build/deploy запрещены.

Исходный разбор: private `payment-blocker-architecture.private.md`, SHA-256 `eac90ebcea66acec0ba8078a94ce93ce975c25f702e735bf79b246d2325b0946`. Его ранняя оценка3 файлов уточнена до4 после чтения точного route guard. K1 factory/module и test module фактически FREE; журналы в private `guard-planning/`. Canonical `route.ts`/POST/runtime/dynamic — обязательные имена Next, проверяется отсутствие полного нового пути, не глобальная уникальность этих exports.
