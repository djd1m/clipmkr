# Черновик плана TEST reconciliation

Статус: **R3 DRAFT / NOT APPROVED / NOT IMPLEMENTABLE**. Документ — материал для QCSD,
не завершённый Step 6. QCSD R2 выполнен, R3 originating recheck/closure ожидаются; K1/K2 **NOT RUN**, код писать нельзя.
План должен быть переработан по реальным QCSD findings и утверждённому dependency contract.

## Цель и текущее состояние

Цель: после отдельного live admission обработать три frozen TEST intent отдельными runs:
один succeeded через existing canonical apply, два canceled через guarded markIntentCanceled.
Сейчас есть provider GET и атомарное начисление; нет проверенного operator recovery.
Готовое состояние: FR-1..9 имеют evidence на final diff, воспроизводимые typed refusals,
реальный PostgreSQL подтверждает concurrency/rollback, source аудита честный. Native
callback first acceptance не присваивается этой операции; local cancellation подтверждается
отдельными API/external proof/outcome, а не fabricated payment_event.
Роли: архитектор gpt-6-astra; QCSD документов gpt-6.1-terra xhigh (новые сессии root);
код gpt-6.1-sol high после гейтов; независимый QE gpt-6-astra xhigh без истории кодирования.

## Предварительные задачи и зависимости

| Задача | Зависимость | Работа и проверяемый результат |
|---|---|---|
| T0 Specification | Нет | Root запускает 3 QCSD-перспективы после host prepare; условия сохраняются под originating reviewer, не авторским пересказом |
| T1 Architecture | T0 | Уточнить ADR/архитектуру, guarded cancellation, refund freeze и предложенную S/M canary-поправку; разрешить blocking conditions |
| T2 Pseudocode/plan | T1 | Зафиксировать exact API/DTO/CLI/build names, последовательность и tests; настоящий K1 и K2 на final plan |
| T3 Refinement | T2 + admission Step 7 | Provider refund snapshot поверх existing adapter; negative contract tests не дают ложный success |
| T4 Refinement | T2 + admission Step 7 | Typed guards в existing apply и markIntentCanceled; real PG barriers доказывают rollback, правильный owner/SKU/status и отсутствие financial rows для canceled |
| T5 Refinement | T3,T4 | CLI composition/target binding/proof/outcome и controller build; dry-run не вызывает write-side apply |
| T6 Completion | T5 | Final-diff tests, mutation-falsifiers, code-critic, независимый QE и code/spec anti-drift |
| T7 Операционный допуск | T6 | Отдельный root live admission с actual private values и S/M dependency contract; затем 3 отдельных адресных runs, canary отдельно в S |

T3/T4 не объявлены разрешёнными к параллельной реализации: модель/владение файлами
определяются после QCSD. Текущая сессия — только авторские docs amendments после T0, без Step 7.

## Кандидаты файлов, ещё не замороженные для реализации

| Путь | Назначение |
|---|---|
| `apps/web/src/server/payments/yookassa.ts` | Один canonical transport/normalizer; узкий refund snapshot метод |
| `packages/db/src/payments.ts` | Optional typed frozen expectations в applyVerifiedPayment и markIntentCanceled под existing locks, exception rollback и cancellation no-op readback |
| `packages/db/src/quota.ts` | Optional bounded execution/pre-COMMIT admission options в существующем transaction helper; typed indeterminate COMMIT, backward compatibility |
| `scripts/reconcile-yookassa-test.ts` | Операторский CLI entrypoint; не DB→web dependency |
| `scripts/lib/payment-reconciliation.ts` | Только необходимая orchestration/receipt policy, если нужна декомпозиция |
| `scripts/tsconfig.payment-reconciliation.json` | Изолированная controller-сборка существующим TypeScript |
| `package.json` | Сборка и запуск CLI без нового OSS |
| `tests/payment-reconciliation.unit.test.ts` | API/argument/receipt/target негативные сценарии |
| `tests/payment-reconciliation.integration.test.ts` | PostgreSQL concurrency/rollback/readback |
| `tests/billing.integration.test.ts` | Совместимость с existing native webhook и canonical key |

В неизменяемые semantic dependencies включить provider.ts, billing-handler.ts,
packages/db/src/{index,credits,plan}.ts, migrations/{021_payments,022_credit_packages,027_payment_referral_snapshot}.sql,
credit-packages.integration.test.ts и docs/acceptance/core-cjm.md. K2 EXPECTED_CODE_TARGETS
будет окончательно оформлен после QCSD, а не превращён из этих кандидатов в ложный gate.

## Предварительная матрица тестов

| Требования | Проверка / falsifier |
|---|---|
| FR-1/7 | Default/ранний refusal: zero persistent DB/provider/proof/outcome effects, без audit-write permissions; wrong target/PG identity/user/schema; expired nonce/manifest; secrets absent in argv/output; убрать guard → красный тест |
| FR-2 | Wrong RUB/shop/test/id/order/amount; partial capture; succeeded с paid=false/captured_at absent; canceled с paid=true/неterminal; timeout/429/5xx |
| FR-3 | Full/partial/pending/canceled refund, wrong payment/currency, incomplete cursor, unknown status и inconsistent aggregate |
| FR-4 | PG barrier меняет owner/status/SKU/offer/grant/provider binding после preflight; claim и любые финансовые строки откатились |
| FR-5 | Две CLI и native callback race; один payment/grant; event-without-grant anomaly не принимается за успех |
| FR-4/5 canceled | Off/drained admission; PG barriers: native uncommitted claim в обоих порядках/другой payment ID → admission refusal или сохранённый late review/indeterminate; erasure/refund, wrong binding/SKU, financial facts по intent ИЛИ payment; canceled replay без financial event |
| FR-6 | Native-first/CLI-first exact original hash, unknown existing source, failed durable proof; crash до claim/после rollback/после commit до outcome, bounded readback без повторного grant |
| FR-7/NFR-3 | Fake clock: missing/wrong-scope/stale/revoked admission до и после lock/pre-COMMIT; expired budget, last refund page, pool starvation, held event/row/advisory lock, disconnect до/после COMMIT, отсутствие оставшегося writer |
| FR-8 | API observation source отделён от native-first application source; canceled external audit без financial event; native gate не закрывается M-proof |
| FR-9 | Existing captured_at/period; expired addon, later base/неожиданное расписание и expiry до COMMIT → typed refusal и rollback всех financial rows; active readback отдельно от live rights/relogin |

Реальный PostgreSQL обязателен, mocks не заменяют блокировки и constraints. Проверяются
наблюдаемые последствия, не source-substring assertions. Provider-фитстуры допустимы
для negatives; настоящая интеграция отдельно с official TEST API после live admission.
Начисленный period/captured_at и права после повторного входа проверяются по существующему канону.
Cancellation должна сохранять контракт прежнего native caller; optional guard не вводит
новую произвольную DB mutation в CLI. Canonical transaction и существующий conditional
writer используются один раз; helper extraction допустима лишь для фактического reuse.
Canary creation/origin/timer/observer tests принадлежат отдельной S-поправке из
dependency-contract-proposal.md и не расширяют M code-targets/оценку M9.

## Проверки final diff после реализации

Предварительно: `npm run typecheck`, `npm run lint`, `npm test -- tests/payment-reconciliation.unit.test.ts tests/payment-reconciliation.integration.test.ts tests/billing.integration.test.ts tests/credit-packages.integration.test.ts`,
`git diff --check` и проверка CI selectors по фактическим pipeline-файлам. Точная команды
controller build/real PG environment фиксируются в финальном плане, не угадываются сейчас.
OpenSpec strict validation подтверждает структуру требований, не качество реализации.
Независимый reviewer фиксирует exact model/session/inputs/artifact SHA, находки и пределы.
После проверки — actual evidence-backed dz teach --project /home/clipmkr --no-mirror,
повторный recall, только при подтверждённом уроке. Сейчас teach не выполнялся.

## Незавершённые гейты

QCSD R2/host prepare выполнены; R3 originating recheck/closure ещё нет. Authoritative Step 5/6,
K1, K2, Step 7, новые тесты, независимый QE, dependency handoff и live admission — NOT RUN.
Root может принять docs/commits в делегированной границе после closed QCSD; конкретный
план остаётся draft. Исполнение CLI/credentials/runtime требует собственных гейтов/admission.
