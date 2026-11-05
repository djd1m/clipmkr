# Повторное использование

Исследована source-база 24b4b4a; provider/network/live config архитектор не вызывал.
| Существующий путь | Применение |
|---|---|
| `packages/shared/src/config.ts::loadWebConfig` (178 LOC) | typed optional UUID + cross-field preflight; новая canonical exported policy в том же компактном модуле |
| `packages/shared/src/tariff.ts::loadPaymentsConfig` | точные off/fake/live, обязательные key/shop/testMode; существующий parser сохраняется |
| `apps/web/src/server/environment.ts` | явная доставка process.env к config |
| `docker-compose.yml` web environment | новый optional key только web, ни одному worker |
| `.env.example` | объявить `N5_TEST_CHECKOUT_ACCOUNT_ID=` пустым с русским TEST-only/global-false комментарием; реальный UUID никогда не публиковать |
| `apps/web/src/preflight.ts` | настоящий loadWebConfig до Next; не создавать второй preflight |
| `apps/web/src/server/billing-handler.ts` (232 LOC) | provider → auth/rate/origin → checkout guard до body/intent; изменяется существующий guard |
| `apps/web/src/server/billing-deps.ts` (37 LOC), `billing-runtime.ts` | одна existing native dependency wiring; callback общей policy вместо глобального scalar guard |
| `apps/web/src/app/upgrade/page.tsx` | существующий SSR salesEnabled; сейчас checkoutEnabled не учитывает — нужен тот же canonical guard |
| `apps/web/src/app/upgrade/UpgradeScreen.tsx` | существующие disabled/TEST/return UI и account-key lifecycle; код менять не требуется |
| `apps/web/src/server/payments/{config,yookassa}.ts` | select provider, verify raw.test === configured testMode; provider не переписывать |
| `packages/db/src/payments.ts` | intent idempotency/ownership/verified payment, без миграций и правок |
| `tests/billing.{unit,integration}.test.ts` | config/SSR/handler + реальные PostgreSQL/сессии/local provider |
| `tests/payments-guards.test.ts` | checkout pause без body/intent, status/webhook сохранены |
| `tests/credit-packages.integration.test.ts` | credits_v1 и native wiring regression |
| `tests/credit-packages-ui.test.ts` | actual disabled buttons; удалить устаревающий source-string assert и доказать новое поведение SSR |
| `scripts/check-env-wiring.{sh,mjs}` | проверяет source env → compose без печати secrets |

Донор платежей N6 уже адаптирован в native billing-*; повторный перенос из проектов 1–8
и OSS install не добавляет нужной функции. Нужны существующие TypeScript/Next/PG инструменты.
Новых таблиц/ролей/API/фоновых сервисов, отдельного allowlist middleware или feature-flag системы нет.

## Повторный поиск после QCSD
- `tests/fixtures/fake-yookassa-server.ts`: lookup byKey до await readBody; исправляется именно эта
  существующая фикстура, атомарный lookup/create после полного body без await между lookup и set.
  Нужны управляемый barrier перекрытия, учёт полученных idempotence keys отдельно от created/payments.size.
  `payments` Map уже доступен: requery.test можно менять только в локальном fixture без нового provider.
- `scripts/check-workspace-presentation.test.mjs` и `scripts/check-mockup-ui-realization.mjs` уже
  наблюдают настоящие document/RSC запросы и Next Link, но связаны с published origins/receipt.
  Их метод response capture переиспользуется; их production/SSH workflow не запускается локально.
- `tests/browser/mockup-ui-realization.test.ts` уже проверяет account remount со stale response;
  он client harness, не доказательство Flight. Существующий native server command — package web
  `start`: preflight + next start; `tests/preflight.test.ts` закрепляет запуск. В исследованных
  scripts/tests/accepted feature sources готового изолированного local Next child-server harness не найдено.
  Поэтому добавляются только `tests/browser/per-account-test-checkout-next.test.ts` и test-only
  `tests/fixtures/payment-test-transport.mjs`, не новый runtime/компонент или generic runner.
- Opaque key при подтверждении экспозиции: существующий native node:crypto createHmac + действующий
  config.sessionSecret, как auth/rate-limit/erasure. Domain-separated `checkout-owner-v1:` + accountId,
  digest hex inline в существующем UpgradePage; новый secret/helper/auth layer не нужен.

### Обязательный callback: полный найденный consumer inventory
| Место | Изменение/проверка |
|---|---|
| billing-handler BillingDependencies / billing-deps BillingWiring | required callback, без permissive default |
| billing-runtime → createBillingDependencies | передать canonical callback из настоящего config |
| tests/billing.unit.test.ts::deps | добавить явный callback; отрицательный missing-callback case |
| tests/billing.integration.test.ts::wire | заменить присваивание deps.checkoutEnabled; native policy |
| tests/credit-packages.integration.test.ts::createBillingDependencies | явный callback и прежний legacy отказ |
| tests/payments-guards.test.ts cast as unknown as BillingDependencies | явный callback; cast не доказательство wiring |
| checkout/status/webhook route.ts | тот же getBillingDependencies; status/webhook не вызывают admission |
| UpgradePage SSR и tests/billing.unit SSR mock | тот же policy; opaque key требует реального sessionSecret в synthetic mock |
| tests/storage-prefix.test.ts | scalar config.checkoutEnabled остаётся; этот контракт не переименовывать |
