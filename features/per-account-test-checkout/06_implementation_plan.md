# План тестового checkout одного аккаунта

Статус: structural rework после initial QCSD; closure ожидает исходных reviewer-ролей. Root K1 для checkoutAllowedForAccount FREE/exit0, новые test names pending; K2 и код не выполнялись.
Inputs read: 01_requirements.md, 02_reuse_inventory.md, 03_adr, 05_architecture.md, owner-authority.md, requirements-revision.json.

## Goal state / SPARC-GOAP
Current: provider off, global checkout scalar, SSR его пропускает; existing TEST driver и credit flow есть.
Goal: private exact session-account исключение при global false/TEST; остальные без доступа,
без изменений payment/credit invariants, UI, ролей, таблиц или provider.
Код пишет отдельный Sol high после проверенного плана; текущий Astra planner пишет только документы.

## Tasks

### TASK-1 — FR-3, FR-5, ADR-001: typed config и единая policy
После настоящих QCSD/K1/K2, refinement: сначала red boundary tests.
Files: `packages/shared/src/config.ts`, `tests/billing.unit.test.ts`.
loadWebConfig читает optional singular UUID, валидирует значения и cross-field constraints,
экспортирует `checkoutAllowedForAccount(config, accountId, accountBillingPolicy, providerReady)`.
Точные правила в ADR-001. Не передавать secrets/UUID в клиент; ошибки без значений.
Tests: `test checkout exception rejects live and contradictory config` (A3),
`test checkout account config absent empty invalid and multiple values` (A4),
`test checkout policy allows only exact test session account` (A1/A2).
Матрица включает uppercase/пробелы/email/list/wildcard, off/fake/testMode=false, live key,
provider absent, legacy config/account, global true с UUID (startup fail), global true без UUID (legacy compatibility).
Success: absent/empty+global false → denied, malformed → throw; unsafe config никогда не создаёт exception.

### TASK-2 — FR-3, FR-4, FR-5, ADR-001: доставка конфигурации
Depends TASK-1. Files: `apps/web/src/server/environment.ts`, `docker-compose.yml`, `.env.example`, `tests/payments-guards.test.ts`, `tests/fixtures/environment.ts`.
Новый env key только web, explicit readEnvironment и compose safe-empty default; workers не получают.
В `.env.example` добавить только пустое `N5_TEST_CHECKOUT_ACCOUNT_ID=` и русский комментарий
«Только TEST-исключение при N5_CHECKOUT_ENABLED=false; UUID задаётся в private окружении».
Реальный UUID не публиковать; существующий template checkout=true при пустом exception не менять.
Это объявление операторской настройки, не новая UI-опция; в планировании файл не редактируется.
Existing preflight вызывает тот же loadWebConfig, второго parser не создаётся.
Test `test checkout environment reaches validated web policy without exposing values` проверяет
readEnvironment → loadWebConfig реальными значениями synthetic env с восстановлением окружения.
Run existing `bash scripts/check-env-wiring.sh` с synthetic fixture; секретный compose config не печатать.
Success: missing bridge ломает test; invalid setting отказана до Next. Никакого private overlay apply в задаче автора.

### TASK-3 — FR-1, FR-2, FR-4, FR-6, ADR-001: обязательный server admission callback
Depends TASK-1/2. Files: `apps/web/src/server/billing-handler.ts`, `apps/web/src/server/billing-deps.ts`, `apps/web/src/server/billing-runtime.ts`.
Заменить optional scalar dependency обязательным checkoutAllowed(accountId, policy) callback;
runtime/createBillingDependencies передают canonical policy с validated config/providerReady.
После существующего auth guard прочитать billingPolicy один раз, проверить callback до body,
продолжить прежний strict SKU/intent/provider path. Не добавлять permissive fallback для отсутствующего callback.
Сохранить public routes, HTTP failure shape, price/credits/idempotency и status/webhook.
Tests/wiring: `tests/billing.integration.test.ts`, `tests/billing.unit.test.ts`, `tests/payments-guards.test.ts`, `tests/credit-packages.integration.test.ts`.
`two sessions enforce test checkout before body intent and provider` (A1/A2): реальные AuthService/PG sessions
A/B + native wiring/handler + local YooKassa fixture; A получает свой intent, B/anonymous ничего не создают.
Body содержит forged account_id/email/testMode: B отказ до чтения body; A strict schema отвергает лишнее.
`test checkout exception preserves retry and notification idempotency` (A6): последовательный/конкурентный
одинаковый key у A → один intent и одна unique provider payment; HTTP attempts считаются отдельно.
Обновить `tests/fixtures/fake-yookassa-server.ts`: await body → controllable barrier → atomic byKey lookup/create без await.
`overlapping test checkout creates one provider payment per intent key` проверяет одинаковый provider key=intent.id,
unique payment count=1 и отсутствие двойного grant; неверный key/повторное создание дают RED. Fixture не доказывает provider TTL.
Stale UUID removal → 503 новых checkout, status/verified duplicate webhook
обрабатываются по прежнему контракту, grants не удваиваются. Provider calls — только local fixture.
`test checkout handler never bypasses live mismatch` (A3) — отрицательный actual guard input.
`revoked test exception rejects non-test webhook before ledger writes`: после отзыва исключения сохранить
TEST provider; local payment requery.test=false → 400, delta payment_event/payment/credit_grant=0;
test=true → один success/grant; duplicate → zero additional grant. Removing raw.test guard → RED.
Success: denied delta rows=0/provider calls=0; account ownership подтверждён SQL; tests без skip.

### TASK-4 — FR-1, FR-2, FR-4, FR-7, ADR-001: SSR существующего каталога
Depends TASK-3. Files: `apps/web/src/app/upgrade/page.tsx`, `tests/billing.unit.test.ts`, `tests/credit-packages-ui.test.ts`.
salesEnabled вызывает ту же policy; существующие creditMode/catalogOnly/owner/windows gates остаются.
UpgradeScreen/CSS/layout не меняются. `test checkout SSR and POST agree for allowed and other sessions`
(A5): A/B имеют credits_v1 и валидные windows; сравнить реальные enabled/disabled buttons (не source-string).
A TEST label и разрешённые кнопки; B disabled; anonymous redirect; provider-off и UUID removal disabled.
Удалить устаревший source-string assert конкретного salesEnabled выражения, заменить behavioral SSR evidence.
Проверить отсутствие private UUID/key/email в HTML, props/log. Existing account-key lifecycle не менять;
повторить имеющиеся checkout account-switch/stale-response browser tests, не создавать новый UI harness.
Точный regression: `tests/browser/mockup-ui-realization.test.ts` — `checkout account remount ignores old success and failure even when transport ignores abort`.
Добавить `tests/browser/per-account-test-checkout-next.test.ts` и `tests/fixtures/payment-test-transport.mjs`.
Тест `native Next responses hide test exception identity across account changes`: настоящий Next child process
на loopback, existing *_test PG/Redis, real AuthService sessions A/B, synthetic env, pre-init local-only fetch bridge.
Не mock callback/provider/config: actual loadWebConfig → runtime → handler path. Никаких external S3/provider calls.
Проверить raw HTML/inline Flight direct load, непустой text/x-component при клике Next Link из dashboard,
props и logs без synthetic private UUID/key (включая escaped формы). Отсутствующий RSC response → FAIL.
При подтверждённой сериализации заменить только существующий UpgradePage key inline createHmac из node:crypto,
existing sessionSecret + domain-separated accountId; никаких новых secret/helper/auth. Проверить стабильность A,
различие A/B, actual navigation и прежний stale response regression. Falsifier вернуть raw UUID key → RED.
Bounded start/readiness/finally stop, изолированная PG schema и Redis namespace; full Next build обязателен.

### TASK-5 — FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, ADR-001: QE и handoff
Depends TASK-1–4. Phase completion. Node22, pinned deps, existing isolated *_test PG + local provider.
`npm test -- tests/billing.unit.test.ts tests/billing.integration.test.ts tests/payments-guards.test.ts tests/credit-packages.integration.test.ts tests/credit-packages-ui.test.ts`.
Falsifiers: убрать exact-account check → B accepted test RED; убрать testMode preflight/predicate → LIVE case RED;
SSR вернуть прежнее !!payments → B actual buttons RED; callback не провести runtime → wiring test RED.
После восстановления focused green, затем `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`,
`bash scripts/check-env-wiring.sh`, `git diff --check`; CI-parity и existing payment browser regression.
После сборки `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/per-account-test-checkout-next.test.ts tests/browser/mockup-ui-realization.test.ts`.
Проверить все required-callback consumers из 02: runtime/deps, billing.unit deps, billing.integration wire,
credit-packages.integration direct wiring и payments-guards double cast; typecheck не заменяет runtime assertion.
Негативный missing callback должен отказать; status/webhook не должны требовать checkout permission.
Реальные PG tests обязательны: mocked SQL не доказывает intent isolation/idempotency; unavailable/skip != PASS.
Расширенный QE: contract/security/config negative matrix, risk/shift-left, UI regression, targeted mutation.
Host prepare ДО независимого Astra QE Sol-кода; reviewer получает docs, сам находит code/test, без авторских выводов.
08_qe_report: FR → risk → scenario → command/result → limitation; exact config chain, anti-drift к hash,
реальные falsifiers и explicit scope. Новые lessons учить pinned dz только после фактического evidence.
После закрытия root сверяет deployment source с параллельно принятыми изменениями, применяет private TEST overlay
только на согласованном существующем VPS/site, global checkout=false, exact one UUID, testMode=true/test key.
В этом планировании и кодовом авторстве внешние provider calls, реальные credentials, Cloud.ru/DNS не трогаются.
Root проводит авторизованную TEST-приёмку существующего flow отдельно; настоящий платёж/массовое включение запрещены.

## Dependency order / checkpoints
TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5; один автор. 8 production/config + 5 existing tests + existing provider fixture + existing shared environment fixture + 2 test-only files.
QCSD: root prepare measured snapshot → 3 fresh Terra core роли → amendments/rework → own-role closure.
K1 до кода: pinned `dz name-check --export checkoutAllowedForAccount --project <worktree>` и actual source search.
K2 только после QCSD closure: `node /tmp/clipmkr-public-entry-20261105/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/per-account-test-checkout --tier=M --require-requirements`.
Exit/verdict сохранить фактически; nonzero запрещает код. Настоящие dz checkpoint receipts пишет host после gates.

## Risk assessment / Amendments
Главные риски: body identity spoof, конфигурация LIVE вместо TEST, разная UI/API policy, env не доставлен,
случайное изменение webhook/idempotency. Они связаны с TASK-1–5; independent findings ещё не поступали.
## Amendments
AM-1 (qcsd QL-01): atomic local provider oracle при контролируемом overlap; один intent/key/payment/grant. Confirmation: неверный provider key/duplicate creation ломает проверку → test `overlapping test checkout creates one provider payment per intent key` in `tests/billing.integration.test.ts` (fails if reverted).
AM-2 (qcsd QL-02): отрицательный webhook requery.test после отзыва, затем один корректный grant. Confirmation: удаление raw.test проверки даёт forbidden ledger write → test `revoked test exception rejects non-test webhook before ledger writes` in `tests/billing.integration.test.ts` (fails if reverted).
AM-3 (qcsd QT-001): native HTML/Flight privacy и opaque key при подтверждённой сериализации с сохранением remount. Confirmation: raw UUID key виден в настоящем ответе → test `native Next responses hide test exception identity across account changes` in `tests/browser/per-account-test-checkout-next.test.ts` (fails if reverted).
Это planned tests, не PASS. Оба originating reviewers проверят свои условия; clean risk reviewer проверит delta.
K1 дополнительно для новых basenames `per-account-test-checkout-next.test` и `payment-test-transport` до кода.
Ниже кроме 17 изменяемых файлов объявлены неизменяемые semantic dependencies для QE snapshot.

AM-4 (root, первоначальный локальный вариант): добавить tests/wiring.test.ts для web-only fixture и negative control. После завершения полного прогона выявлен второй потребитель той же общей fixture; superseded by AM-5. Исторический допуск AM-4 не выдаётся за выполнение или окончательный scope.
AM-5 (root, вместо дублирования фикстур): все8failures полного набора вызваны отсутствующим optional key в общей `environment()` из `tests/fixtures/environment.ts`:5wiring и3clip-music-choice. Добавить туда единственное пустое N5_TEST_CHECKOUT_ACCOUNT_ID; это полная synthetic process-env fixture, уже содержащая web/mail/support keys, а не доказательство production-доставки воркерам. Не менять её liveS3Environment, секреты, конфигурационные defaults продукта или production checker. Delivery в настоящем compose/environment.ts остаётся только web и проверяется TASK-2. tests/wiring.test.ts остаётся неизменённой semantic dependency. Отрицательный контроль отсутствия web key добавить в уже объявленную tests/payments-guards.test.ts: complete fixture → no findings, удаление ключа → expected web finding. Confirmation: убрать пустой ключ или ослабить checker → test `optional checkout exception remains covered by wiring validation` in `tests/payments-guards.test.ts` (fails if reverted). Полный набор8failures обязан стать GREEN без skips/удаления assertions. Исходная оценка16файлов в00 историческая; фактический scope17 с одним новым shared test consumer, без новых production domains. До правки common fixture нужны independent scope review, K2 и обновлённые admission/literal context.


EXPECTED_CODE_TARGETS:
- packages/shared/src/config.ts
- apps/web/src/server/environment.ts
- docker-compose.yml
- .env.example
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/billing-deps.ts
- apps/web/src/server/billing-runtime.ts
- apps/web/src/app/upgrade/page.tsx
- tests/billing.unit.test.ts
- tests/billing.integration.test.ts
- tests/payments-guards.test.ts
- tests/wiring.test.ts
- tests/credit-packages.integration.test.ts
- tests/credit-packages-ui.test.ts
- tests/fixtures/fake-yookassa-server.ts
- tests/fixtures/environment.ts
- tests/browser/per-account-test-checkout-next.test.ts
- tests/fixtures/payment-test-transport.mjs
- packages/shared/src/tariff.ts
- apps/web/src/preflight.ts
- apps/web/src/server/payments/config.ts
- apps/web/src/server/payments/yookassa.ts
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- packages/db/src/payments.ts
