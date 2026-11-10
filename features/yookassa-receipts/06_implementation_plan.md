# Чеки ЮKassa — исполняемый план M

Inputs read: features/yookassa-receipts/01_requirements.md; features/yookassa-receipts/03_adr/001-snapshot-receipt-in-payment-intent.md; features/yookassa-receipts/05_architecture.md; features/yookassa-receipts/03.5_ideation_report.md; features/yookassa-receipts/requirements-revision.json; features/yookassa-receipts/00_complexity_assessment.md; owner-authority.md; 02_reuse_inventory.md.

## Goal state / SPARC-GOAP

Goal: implement_yookassa_receipts — добавить одну доверенную receipt-позицию в текущий provider, сохранив canonical retry и TEST.
Current: база e955e3f2e67e5663eec24dadeb828cacd18e9a9f; checkout/intent/grants существуют без receipt; scoped code не написан. Design aggregate exit0/closed, revision6a5bce537038181a28afb0ec67004a448e005e96175690574fdbad77ca00431c. Процент coverage не измерен.
Target: все FR/NFR и Confirmation ADR-001 имеют реальные tests; immutable snapshot, отсутствие live POST без receipt, достоверный unbound age<23h, прежние grants/referrals/TEST. Регистрация и доставка чека ЮKassa не считаются доказанными локальными тестами.
SPARC: specification/architecture закрыты01/ADR/05/QCSD; pseudocode — порядок checkout в05; refinement — TASK-1…5; completion — TASK-6 и отдельная поставка координатора.
NEW_NAMES: ReceiptConfig; ReceiptSnapshot; CheckoutIntentRow; loadPaymentReceiptConfig; paymentDescription. Новых production TS modules, сервисов и зависимостей нет. Новые файлы: миграция и два test suite.

## Tasks

- TASK-1 — Контракты/config (FR-3, FR-4, FR-7; NFR-1; ADR-001). Phase refinement; depends K1/K2; effort S. Files: packages/shared/src/tariff.ts, apps/web/src/server/payments/provider.ts, tests/yookassa-receipts.unit.test.ts. Добавить ReceiptConfig/Snapshot, parser undefined/null/object без startup throw на partial/invalid, единый paymentDescription и optional provider receipt; никаких налоговых defaults.
  Tests: receipt config requires explicit supported fiscal values; receipt payload uses one exact RUB item for every offer — tests/yookassa-receipts.unit.test.ts. Done: absent/empty совместимы, все6 partial subsets/whitespace/invalid enum различаются; четыре предложения описаны сервером.
- TASK-2 — Snapshot SQL (FR-2, FR-5, FR-6; NFR-3, NFR-4; ADR-001). Phase architecture/refinement; depends TASK-1; effort M. Files: packages/db/migrations/029_payment_receipt_snapshot.sql, packages/db/src/payments.ts, tests/yookassa-receipts.integration.test.ts. Nullable JSONB без backfill, строгий CHECK, существующий immutable trigger; email под account lock, INSERT snapshot+offer, ON CONFLICT возвращает победителя. CheckoutIntentRow с required created_at/snapshot; публичный IntentView не расширяется.
  Tests: concurrent retries commit one canonical receipt snapshot; receipt snapshot database constraints reject malformed values; receipt snapshot immutable trigger preserves allowed updates; receipt snapshot is erased with an erasing account — tests/yookassa-receipts.integration.test.ts. Done: observed PG lock, единый snapshot, CHECK отвергает UNKNOWN, разрешённый status UPDATE проходит, запрещён snapshot UPDATE/NULL→object; настоящий erase удаляет доказанно существовавший snapshot, сохраняя допустимый обезличенный payment.
- TASK-3 — Provider JSON (FR-1, FR-3, FR-4, FR-7, FR-8; NFR-1; ADR-001). Phase refinement; depends TASK-1; effort S. Files: apps/web/src/server/payments/yookassa.ts, tests/yookassa-receipts.unit.test.ts. Одна позиция quantity="1.000", RUB, один formatMinor(intent.price_minor) для обеих сумм; статическая validation; testMode=false без receipt отказывает до HTTP. Проверка webhook не меняется.
  Tests: receipt payload uses one exact RUB item for every offer; live provider refuses missing receipt before HTTP; receipt failures never expose buyer email or provider secrets — tests/yookassa-receipts.unit.test.ts. Done: точный JSON четырёх SKU, отказ имеет позитивный transport control, markers не попадают в HTTP/logs.
- TASK-4 — Checkout/wiring (FR-1, FR-2, FR-5, FR-6, FR-7, FR-8, FR-9; NFR-1, NFR-2; ADR-001). Phase refinement; depends TASK-2,TASK-3; effort M. Files: apps/web/src/server/environment.ts, billing-runtime.ts, billing-deps.ts, billing-handler.ts; docker-compose.yml; .env.example; оба новых test suite. Провести3 env через whitelist/config/deps; только optional web env/comments. Guards сохранить; bound GET раньше config/time; unbound canonical snapshot/no retrofit, статические503/409; required time и последний guard после async непосредственно перед HTTP. Затронутые failure paths не выводят чувствительный exception.message.
  Tests: receipt config reaches checkout through readEnvironment and billing wiring; invalid receipt config leaves webhook and status readable; checkout rejects client receipt and PII before intent creation; checkout status excludes receipt snapshot; unbound legacy intent is not retrofitted with receipt; bound intent retry uses GET without a new receipt — два новых suite по слою. Done: настоящая config матрица, session/closed body controls, живые health/status/webhook и отсутствие публичного snapshot.
- TASK-5 — Сквозное доказательство (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9; NFR-1, NFR-2, NFR-3, NFR-4; ADR-001). Phase refinement; depends TASK-4; effort M. Files: tests/yookassa-receipts.unit.test.ts, tests/yookassa-receipts.integration.test.ts. Исполнить раздел «Дискриминирующие сценарии»05, переиспользовать HTTP/PG seams без production test bypass.
  Tests: retry reuses receipt snapshot after email and VAT change; retry budget is checked after asynchronous intent work; unbound intent enforces conservative 23 hour retry cutoff; receipt email belongs to authenticated account; receipt checkout preserves package grant and referral idempotency — tests/yookassa-receipts.integration.test.ts. Done: socket принимает POST и рвёт ответ; fresh wiring/provider сохраняет прежний JSON/key/intent; новый key использует новые данные. T−1ms POST, T/T+1ms/24h/>24h и invalid/missing/future STOP; bound GET. Existing billing/credit/referral suites сохраняют однократность начислений.
- TASK-6 — Финальная проверка/передача (FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9; NFR-1, NFR-2, NFR-3, NFR-4; ADR-001). Phase completion; depends TASK-5; effort M. Files: review фактических13 targets; evidence ведёт координатор. Выполнить адресные/общие команды, минимум4 red/green falsifiers: no-receipt live, current-VAT retry, ошибочное cutoff>, CHECK UNKNOWN/PII; восстановить исходный код после мутаций. Code/spec anti-drift и независимый source QE — отдельная модель/новая сессия без coding context.
  Done: scoped tests/typecheck/lint/env seam проходят на финальном diff; каждый falsifier падает по целевому свойству; общий suite не имеет новых необъяснённых failures/skips. Реализация не равна delivery или merchant acceptance.

## Dependency order / Parallel groups / Checkpoints

DAG: K1+K2 → TASK-1 → {TASK-2,TASK-3} → TASK-4 → TASK-5 → TASK-6. Автор один, общие test files пишутся последовательно; логическая независимость TASK-2/3 не требует параллельной записи.
Checkpoint A послеTASK-2: isolated PostgreSQL schema/constraints; B послеTASK-4: реальные JSON/config/guard seams; C послеTASK-6: source QE, настоящий aggregate и anti-drift. Наличие файла не означает checkpoint.
До Step7: актуальный K1 NEW_NAMES/reuse check и команда node .agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/yookassa-receipts --tier=M --require-requirements должны реально завершиться0. Acid corpus A<n> в00 не объявлен; новые IDs не выдумывать.

## Команды и evidence

Адресно: npm test -- tests/yookassa-receipts.unit.test.ts tests/yookassa-receipts.integration.test.ts; затем existing billing/credit-packages/blogger-referrals suites и npm test. Также npm run typecheck; npm run lint; bash scripts/check-env-wiring.sh. CI selector tests/**/*.test.ts собирает оба новых suite.
Интеграции — изолированный PostgreSQL и настоящий локальный HTTP socket, не рабочие ключи/БД. Skipped DB tests не считаются успехом. При compose test обязателен --build и отдельный безопасный project/runtime. Stub fetch/SQL mocks не заменяют transport/DB evidence; одно Promise.all не заменяет observed PG lock.
Соседние successful hand-written createIntent fixtures текущим поиском не найдены; заранее лишние targets не добавляются. Если найдутся при typecheck, required timestamp добавляется адресно после согласования расширения targets координатором, без optional fail-open и обхода K1/K2.

## Risk assessment / source и delivery scope

Часовой запас — явное допущение clock/delivery погрешности<1h; 5s abort не доказывает remote arrival. После cutoff/недостоверного времени — операторская reconciliation до нового ключа, bound GET сохранён. Fallback: отказ, не реконструкция старого snapshot/no-receipt live.
Ложный зелёный предотвращают accepted/drop socket, fresh objects, observed SQL barrier, positive CHECK/erase/config/PII controls. Недоступная инфраструктура означает незавершённую проверку, не замену mocks. Сервисы, scheduler, IAM, таблицы и зависимости не добавляются.
Известны3 baseline retention unit asserts и installer12vs11: не чинить, не удалять и не переименовывать ради receipt; точные исходы и baseline comparison записать отдельно. Общий suite с этими отказами не объявлять полностью зелёным; новые падения расследовать.
Рабочие VAT/subject/mode не подтверждены. Source coder пишет принятую миграцию и применяет только в изолированной тестовой БД; рабочий runtime SQL, live ключи, merchant mutations, настоящие покупки/возвраты, activation live запрещены.
Delivery — отдельный этап координатора после source QE: deployment-plan, свежий проверенный backup, additive применение принятой029 на текущем VPS с сохранением всей БД и прежних TEST credentials/checkout exception, затем health/status/webhook/checkout smoke и ручная приёмка по owner-authority. Он не закрыт планом и не делегирован автору кода; поставку заранее завершённой не объявлять.

## Amendments

AM-1 (QC-1): T=23h, достоверные часы и последний guard после async; запас не внешняя гарантия. Confirmation: переход cutoff во время SQL запрещает POST → test `retry budget is checked after asynchronous intent work` in `tests/yookassa-receipts.integration.test.ts` (fails if reverted).
AM-2 (QT-1): accepted/drop-response на socket и fresh wiring/provider без старых объектов. Confirmation: прежний JSON/key после email/VAT drift, один intent и positive новый key → test `retry reuses receipt snapshot after email and VAT change` in `tests/yookassa-receipts.integration.test.ts` (fails if reverted).
AM-3 (QT-2): observed PG lock/barrier, commit до сети, CHECK/trigger/erase controls. Confirmation: конкурирующие кандидаты возвращают единый snapshot → test `concurrent retries commit one canonical receipt snapshot` in `tests/yookassa-receipts.integration.test.ts` (fails if reverted). Дополнительные constraints/erase tests изTASK-2 обязательны.
AM-4 (QT-3): полная config матрица и synthetic PII faults с path-fired/positive controls. Confirmation: реально попавшие в provider/DB/validation ошибки markers отсутствуют в HTTP/logs → test `receipt failures never expose buyer email or provider secrets` in `tests/yookassa-receipts.unit.test.ts` (fails if reverted). Config/transport controls TASK-4/5 обязательны.
AM-5 (QT-4, originating clarification): исторический positive24h−1ms заменён T=23h; отдельные fixtures не bind-ят соседний случай. Confirmation: T−1ms POST; T/T+1ms/24h/>24h/invalid/missing/future STOP, bound GET → test `unbound intent enforces conservative 23 hour retry cutoff` in `tests/yookassa-receipts.integration.test.ts` (fails if reverted).

EXPECTED_CODE_TARGETS:
- packages/shared/src/tariff.ts
- apps/web/src/server/environment.ts
- apps/web/src/server/billing-runtime.ts
- apps/web/src/server/billing-deps.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/payments/provider.ts
- apps/web/src/server/payments/yookassa.ts
- packages/db/src/payments.ts
- packages/db/migrations/029_payment_receipt_snapshot.sql
- docker-compose.yml
- .env.example
- tests/yookassa-receipts.unit.test.ts
- tests/yookassa-receipts.integration.test.ts
