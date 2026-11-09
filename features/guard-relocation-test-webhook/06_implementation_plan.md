# План QA TEST callback guard

Статус: план для передачи отдельному автору; код, тесты и deployment ещё NOT RUN. Tier S=8, четыре code targets. Исправляется originating `qe-primary-01` родительского `features/relocate-clipmkr-to-workspace-vps`; самостоятельная зависимость не закрывает это условие и не сбрасывает2 witnessed parent QE cycles.

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`, OpenSpec `openspec/changes/guard-relocation-test-webhook/{proposal.md,design.md,specs/qa-payment-callback/spec.md}`; parent `03_adr/001-single-writer-relocation.md`, `03_adr/002-isolate-preview-state.md`, `05_architecture.md` read-only. Собственные03_adr/05_architecture не требуются tier S. Метод: прочитан code-goal-planner reference; отдельный planner agent не запускался. Применены studio-extended-qe risk-based/contract/mutation protocols без AQE runtime.

## Goal state

Current: canonical handler подтверждает unknown_intent200 после claimEvent; повтор ужеduplicate200. Goal: только QA endpoint отвергает foreign verified TEST payment/refund503 до consumer; известный intent сохраняет штатную идемпотентность и drain. Production endpoint/financial SQL/schema остаются прежними. Покрытие неизвестно; вместо выдуманного процента нужны перечисленные реальные assertions и mutation failures.

## Tasks

### TASK-1: FR-1 FR-2 FR-3 — meaningful RED для pre-ledger admission (refinement,15мин; depends none).
Создать `tests/relocation-test-webhook.integration.test.ts`, переиспользуя actual factory/provider HTTP fixture и *_test PostgreSQL isolation из `tests/billing.integration.test.ts`. Test DB предоставляет coordinator приватно; до запуска подтвердить *_test, отсутствие live target, random schema и cleanup. Не создавать новый контейнер. Assertions: foreign payment И refund, unknown/null/invalid UUID, mismatch/unbound provider ID,2 repeats и20 simultaneous deliveries — все503, полное before/after равенство payment_event/payment/credit_grant/payment_intent/account financial fields; consumer не вызывался. На ungated canonical factory те же foreign fixtures дают200 и меняют ledger: получить semantic RED, не module-not-found. Ошибка SELECT →503/no consumer; IP/payload/provider failure не вызывает SELECT. Имена tests ниже фиксируют контракт; пока их выполнение NOT RUN.

### TASK-2: FR-1 FR-2 FR-3 — тонкий QA adapter и GREEN (refinement,15–20мин; depends TASK-1).
Создать `apps/web/src/server/relocation-test-webhook.ts:createRelocationTestWebhookHandler`, принимающий existing BillingDependencies, Pool и WebConfig. Exact profile из02 проверять до финансовых операций; недопустимый profile/off/fake/live test=false →503/no-store без ledger access. Сохранить canonical `createPaymentWebhookHandler`; в обеих обёртках applyPayment/recordRefund ПОСЛЕ его verify выполнить параметризованный `SELECT 1 FROM payment_intent WHERE id=$1 AND provider_payment_id=$2` с isUuid до SQL. Нет точной пары/SQL error →throw до consumer, canonical boundary→503. Не использовать output.reason после consumer и не менять shared files. Локальная пара допускает existing consumer; null provider binding до setIntentProviderPayment→503, после штатной привязки повтор проходит. Callback admission не зависит от testCheckoutAccountId: checkout отозван, TEST provider ещё включён → drain работает. Не добавлять новый runtime toggle, timers, registry или workflow.

### TASK-3: FR-2 FR-4 — exact route и совместимость (refinement,10мин; depends TASK-2).
Создать `apps/web/src/app/api/webhooks/yookassa-test/route.ts`: getRuntime pool/config и getBillingDependencies передаются adapter; Next exports nodejs/force-dynamic/POST как в canonical route. Startup/config exception на QA route →503/no-store без секретов. В `tests/payments-guards.test.ts` обновить точный route inventory только новым путём и стабильным sorted directory list двух имён; заголовок честно отражает2 webhook paths. Контроль3 plan writers и все прочие guards сохранить. Новый integration test `QA route uses the scoped adapter while canonical webhook remains unchanged` вызывает настоящий route module с подменой runtime provider/DB dependencies на test wiring; проверяет guard refusal, startup503 и сохранение canonical behavior. `tests/test-webhook-route.test.ts` source hashes не менять. Caddy/Compose здесь не target.

### TASK-4: FR-1 FR-2 FR-3 FR-4 FR-5 — проверки, mutation и independent closure (completion,15–25мин; depends TASK-1,TASK-2,TASK-3).
После actual GREEN временно убрать pre-ledger guard только в своей рабочей копии: foreign test MUST fail; инвертировать TEST/profile отказ: config negative MUST fail; возвращение current allowlist как callback gate MUST сломать drain test. Затем восстановить patch и повторить affected tests. Не писать mutation framework. Выполнить команды ниже, записать exit/count/skips и stderr, а не наличие файлов. Independent Astra в новой сессии проверяет весь4-file diff и риск pre-ledger side effects; author Sol не сам себе reviewer. Создать actual07 manifest/08 report и native code/QE только после выполненной работы. Родительский original reviewer после parent amendment/immutable QA image/route/runtime regression отдельно проверяет original qe-primary-01; child receipt его не закрывает.

## Dependency order / Parallel groups

TASK-1→TASK-2→TASK-3→TASK-4. Один code author; независимый reviewer после settled patch. Нет причины распараллеливать изменение четырёх связанных файлов.

## Test commands / Checkpoints

Для всех команд PATH начинается `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`; cwd workspace. Coordinator передаёт DATABASE_URL существующей отдельной test DB через private env, без печати. Новые тесты не должны pass/skip при отсутствии обязательной DB. Test config fixture может содержать exact QA bindings, но injected Pool соединяется только с isolated test schema; настоящий route связывает config и pool одним getRuntime. Это test seam, не environment override в продукте.

- Targeted: `npm test -- tests/relocation-test-webhook.integration.test.ts tests/billing.integration.test.ts tests/test-webhook-route.test.ts tests/payments-guards.test.ts` (все требуемые DB cases реально выполняются).
- Static: `npm run typecheck`; `npm run lint`; `npm run build`. Repo checks: `npm test` с подготовленными существующими test resources. Если полный набор требует недоступного S3/Redis/provider — записать точные skips/failures и ограничение, не называть full QE passed. Не запускать production resources для устранения test prereq.
- Contract negatives: no profile/pool access до permitted branch; off/fake/live mode, wrong DB host/name/role/port, Redis host/DB/port, S3 prefix, origin, billingMode/checkoutEnabled; SQL failure; provider spoof/error; local known payment/refund + duplicate/concurrent + revoke checkout + early-before-binding retry.
- Реальные K1: factory/module, test module name-check и manual exact route absence. K2: `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/guard-relocation-test-webhook --tier=S --require-requirements`. OpenSpec strict validation. Нативные router/design:requirements/design/plan возможны после actual результатов; code/QE до реализации невозможны. Существующий task разрешает reversible QA fix; новый owner approval для решения уже принятого503 контракта не нужен. Runtime/merchant changes остаются в отдельном parent допуске.

## Risk assessment / scope stop

Главный риск —503 после ledger commit: semantic RED + real table equality и mutation обязательны. Второй — universal callback при production binding: strict profile и actual route tests. Третий — потерянный local drain после revoke: callback не зависит от checkout allowance. Callback event до provider binding намеренно retryable; новый intent/key вместо retry запрещён. Fixture не доказывает реальную доставку ЮKassa. Если реализация требует изменения shared handler/DB/provider/schema/дополнительного target или неоднозначна привязка config/pool — STOP scoped implementation, уточнить план/router; не расширять «S» молча. Parent source/legacy/c/merchant/DNS и его `.fa-state` не меняются.

## Amendments

AM-1 (originating parent qe-primary-01): заменить неверный post-commit подход pre-ledger guard на обоих financial paths. Confirmation → test `foreign TEST payment and refund retries return 503 before any ledger write` in `tests/relocation-test-webhook.integration.test.ts`. Будущий тест, execution NOT RUN.

AM-2 (reuse inventory, обнаружен exact existing route guard): честно учесть четвёртый code target, сохранить exact list и3writers. Confirmation → test `в дереве маршрутов оплаты ровно: вебхук ЮKassa, оформление, опрос, два экрана` in `tests/payments-guards.test.ts`. Существующий title сохранить; расширяется ожидаемый exact list, не blanket regex.

AM-3 (архитектурный разбор drain): revoke checkout не выключает callback уже локальных intent. Confirmation → test `known QA payment remains idempotent and drains after checkout revocation` in `tests/relocation-test-webhook.integration.test.ts`. Будущий test проверяет также early unbound→retry после binding; execution NOT RUN.

AM-4 (QA scope boundary): запретить universal TEST/live callback вне exact isolated profile. Confirmation → test `QA webhook rejects non-QA bindings and live mode before ledger access` in `tests/relocation-test-webhook.integration.test.ts`. Будущий test, execution NOT RUN.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/relocation-test-webhook.ts
- apps/web/src/app/api/webhooks/yookassa-test/route.ts
- tests/relocation-test-webhook.integration.test.ts
- tests/payments-guards.test.ts
