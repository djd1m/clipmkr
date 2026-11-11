# 6. План реализации

Статус: R2 DRAFT после трёх originating conditional QCSD, до focused verification и review-convergence closed. План подготовлен отдельным `gpt-6-astra xhigh` по pinned `code-goal-planner.md`; автор кода — `gpt-6.1-sol high`. Эта сессия не пишет продуктовый код и не является final QE. Ни draft, ни K1/K2 structural PASS не разрешают Step 7.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-preserve-referral-authority.md`, `05_architecture.md`, source и существующие tests на базе `74ea7a6bae354a1cf1fdaec1af01a957cd421137`; OpenSpec pin `75bdcc8a049109df016ed5b3540880700ccf48a11cd0d6fd599316816e654516`. Прочитаны actual originating R1 reports `qcsd-quality-r1.ru.md`, `qcsd-risk-r1.ru.md`, `qcsd-testability-r1.ru.md` в private run directory и собственные entries reviewers. QCR-QUALITY-1/QCR-RISK-1/QCR-TEST-1 адресуются ниже; host closure ещё не получен. Финальный Step6 требует originating focused verification этого snapshot, не авторского GO.

## Goal state
Current: signed referral cookie и apply source policy существуют; поле пустое/закрытое, apply reply игнорируется. Goal: настоящий `/r` → видимый editable код → только email/password → созданный аккаунт с PG attribution, обеими строками notice с фактически применённым публичным code и ровно одной регистрацией в canonical проекциях блогера/владельца. Без cookie, existing registration, ordinary login, recovery, safe next и credit grant сохраняются.

SPARC: specification — pinned требования/ADR; pseudocode — алгоритм в ADR и §Поток архитектуры; architecture — один серверный display helper, additive return projection существующего apply и существующие компоненты; refinement — малые red→green проверки; completion — один общий затронутый прогон на frozen source, independent QE, anti-drift и тестовая поставка root. Процент покрытия не выдумывается; критерий — свойства A1…A10 и требования ниже.

## Tasks

### TASK-1 — Advisory server read и wiring: ADR-001, FR-1, FR-5, NFR-1

SPARC architecture/refinement; зависит от настоящих gates. Создать `apps/web/src/server/referral-prefill.ts`, расширить `apps/web/src/app/page.tsx`, `apps/web/src/app/Landing.tsx`; тест `tests/referral-prefill.test.ts`. Сигнатура/ошибки как ADR; reuse raw `headers`, readReferral, PartnerLandingService.find и getRuntime().pool. До изменения получить red на no-helper/new behavior, затем green valid/invalid/no-cookie/404/unavailable controls. A1 → `referral prefill rejects invalid evidence before lookup`; A8 → `referral prefill degrades on unavailable lookup`. Criteria: no/invalid-cookie lookup=0, valid-cookie lookup=1, only public code output, no mutation/raw logging. Отказ DB в native route не заменяется успешной mock-проверкой: native test должен подтвердить доступную форму при временно неработающем display lookup в изолированном fixture.

### TASK-2 — Autofill, manual intent и честный notice: ADR-001, FR-1, FR-2, FR-3, FR-4, NFR-2

SPARC refinement; зависит от TASK-1. В `apps/web/src/server/partner.ts` добавить c.code в уже существующий locked SELECT и optional applied_code в return projection **одного метода apply**, по точным условиям ADR-001. Сохранить общий Attribution, входные схемы, locks/COMMIT/INSERT/UPDATE/RETURNING/events/mutation anchors; не добавлять post-commit lookup, wrapper/context/provider/endpoint. Затем расширить `apps/web/src/app/AuthForm.tsx`, `apps/web/src/app/AuthFlow.tsx`, при необходимости только стили hint/второй строки notice в `apps/web/src/app/globals.css`; дополнить `tests/browser/public-entry-cabinet.test.ts` prop fixture. Сохранять единый mounted form/draft. Sticky manual-input flag, positive display только до edit; untouched `{}`, manual trimmed nonempty `{code}`, empty `{}`. Compact local predicate canonical reply **включает applied_code**; `created_with_referral` хранит только текущий подтверждённый code и отображает обе строки макета. Error/retry/discard/existing/login сохраняют прежние ветки.

Done: A2 → `referral untouched expiry submits empty input`; A4 → `referral notice requires confirmed attribution` (valid pending/activated+applied_code positive; null/{}/array/malformed/missing-code/rejected/partner_deleted/ошибка/discard negative). A9 component control: SSR A + canonical reply B показывает B; SSR/input не источник финального code. Проверить edit→return, clear→fallback, manual invalid без fallback, mode toggles, retry без повторного register/signup. Одна матрица 390/1440, dark/light, Chromium/WebKit, keyboard/44px/16px/no-overflow/no-JS-errors; существующие a11y и геометрические assertions не ослаблять, двухстрочный notice проверять по настоящему layout.

Узкий server negative A9 → `referral apply confirmation omits unbound code` в `tests/referral-prefill.test.ts`: управляемый transaction result с несовпадающим partner_code_id либо rejected/self не получает applied_code; прежний result сохраняется. Это проверка response guard, не доказательство корректности SQL. Настоящее соответствие COMMIT/PG/HTTP отдельно проверяет TASK-3; не создавать общий validator ради этого теста.

### TASK-3 — Настоящий HTTPS/Next/PG путь и регрессия: ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2

SPARC refinement/completion; зависит от TASK-1 и TASK-2. Расширить существующий `tests/browser/repeat-registration-next.test.ts`; не создавать второй native harness. Существующие отдельные schema в `*_test`, Redis `/14`, HTTPS jar, frozen LEGACY_SOURCE и fake provider переиспользуются. Cookie основного нового acceptance получают настоящим `/r/:code`, а не addCookies. Произвольные invalid/expiry inputs допускают контролируемую cookie mutation как отдельные negative tests.

Done: `referral HTTPS invitation registers without manual code` подтверждает A3 через effective cookie/guest priority и PG source/code; `referral HTTPS display is isolated and read only` подтверждает A6/A7 через A→clean→B, HTML/RSC, refresh link_view snapshot, raw cookie/secret absent. A9 → `referral HTTPS confirmation uses persisted code`: настоящий HTTP reply.applied_code и обе строки notice сравниваются с PG JOIN attribution→partner_code; SSR A/фактическая B, ручная B, expiry/removal и неподтверждённый код — различающие случаи. Серверная metadata не берётся из client body, self/rejected не получает подтверждённого code; старые поля/null/error status/envelope сохраняются. Disabled code/inactive owner не показывают verified display. A5 доказывается существующими existing snapshot/apply0/signup0/trial и ordinary login apply1 assertions, legacy совместимость сохранена. Единственное целевое обновление старого текста: новый аккаунт с успешной manual attribution получает обе строки combined notice. Frozen legacy SHA, source guards и mutation anchors менять запрещено.

A10 → `referral HTTPS registration increments both canonical projections once`: before snapshot реальных `PartnerService.dashboard(bloggerId, codeId)` и `bloggerReport(pool, ownerId, month)` на том же isolated PG; затем один clean native `/r`→email/password→apply. После него chosen blogger/code registrations_before+1 в обоих результатах, foreign blogger/code unchanged, повторное чтение unchanged. Использовать synthetic active `is_blogger=true` и отдельный owner_unlimited; выбрать owner month по persisted created_at в Europe/Moscow и pre-snapshot текущего/следующего месяца по времени PG, dashboard остаётся all-time. Не заменять canonical агрегаты собственным COUNT, не менять/создавать production endpoints, отчётные функции, payment fixtures или даты атрибуции. Старый tests/partner.integration.test.ts coverage отдельно не закрывает этот сценарий.

### TASK-4 — Frozen verification, independent QE и anti-drift: ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2

SPARC completion; зависит от TASK-3. Зафиксировать source revision/hash и выполнить команды ниже один раз на этой ревизии, не редактируя её во время прогона. Направленные mutation controls в отдельном снимке: untouched становится `{code}` → expiry test red; любой non-null/status200 считается applied → response-negative test red; final notice берёт SSR вместо reply.applied_code → A→B test red. Existing guard mutations и уникальные anchors scripts/test-partner-mutations.mjs не переписывать ради green. Независимый QE — новая сессия Astra без истории автора: сначала утверждённые 01/ADR/05/06, затем самостоятельное исследование source/tests. Проверяющий закрывает собственные findings; авторское «исправлено» недостаточно.

Done: реальные терминальные exit/число тестов/длительность; no skip/no-match; обязательный convergence qe closed и code-critic/расширенный QE; `07_code_changes/change_manifest.md`, `08_qe_report.md`, README, точные OpenSpec/addendum/test-scenarios delta и anti-drift. Root выполняет небольшие commits/mirror pushes и тестовую поставку; Cloud.ru/DNS ждут прежнюю ручную приёмку, новый gate не отменяет её.

## Dependency order и Parallel groups
G0: originating QCSD → host rework/focused origin verification → ideation closed → финальная доработка этого плана → K1/K2/root GO. G1: TASK-1 → TASK-2 → TASK-3, один Sol writer. G2: TASK-4 проверки на неизменяемом source; независимые read-only review и подготовка поставки могут идти параллельно без изменения проверяемого снимка. Runtime операции и общие документы выполняются последовательно владельцем root.

## Checkpoints
0/1/3/3.5/5/6 через поддерживаемые pinned dz commands, не hand-written receipts. K1 фактически проверен: `PATH=/home/clipmkr/node_modules/.bin:$PATH npm run dz -- name-check --module referral-prefill --export readReferralPrefill --project /tmp/clipmkr-referral-registration-impl-20261111` → exit0 FREE; отдельная та же команда с `--module referral-prefill.test` без `--export` → exit0 FREE. Sweep484 source files/893 exports; build отвечает за re-export aliases. Другие новые публичные exports/commands не запланированы. Новый enum literal и prop — локальные типы, не команды/exports.

Команда K2: `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/referral-registration-prefill --tier=M --require-requirements`. Исторический R1 draft дал exit0 PASS по1ADR/7requirements/17targets; это не доказательство R2. После данного repair выполнить K2 по новым bytes; результат сохранить отдельно в design evidence. Новых commands/modules/exports относительно прошедшего K1 нет: applied_code — поле существующего return, не export; функции dashboard/bloggerReport уже существуют. K2 проверяет структуру и **не закрывает** originating QCSD/planning checkpoint. Root GO даёт реализацию после genuine gates, не заменяет их.

## Проверки и исполнимые команды

Предусловия: project-pinned dependencies, новый build из этой ревизии, выделенные DATABASE_URL с окончанием `_test`, REDIS_URL `/14`, локальные browsers; секретные значения не писать в артефакты. В WT сейчас нет node_modules/build: root готовит установленный изолированный execution context, не тестирует старый build из `/home/clipmkr`.

| Команда | Основание |
|---|---|
| `npm test -- tests/referral-prefill.test.ts tests/partner-landing.test.ts tests/partner.test.ts tests/partner.integration.test.ts tests/partner-route.test.ts tests/auth.test.ts` | Helper и прежние cookie/source/ownership/auth границы; PG integration реально включён |
| `npm run typecheck` | Новые props/notice union/server import boundary |
| `npm run lint` | Сохранение source/security guards |
| `npm run build` | Реальный Next SSR/client split и свежий артефакт native fixture |
| `npm test -- --config vitest.browser.config.ts tests/browser/public-entry-cabinet.test.ts tests/browser/repeat-registration-next.test.ts` | Реальные UI компоненты и настоящий end-to-end referral/auth путь |

Все команды — один общий затронутый проход; быстрый red→green одного нового oracle до фикса не выдаётся за полный зелёный прогон. Длительные команды остаются у живого владельца до terminal outcome. После локального исправления повторить затронутые проверки; общий повтор только при новой зависимости/широкой регрессии/незакрытом риске с явной причиной. Не запускать несвязанные hundreds-test suites или payment/media jobs. Измерения и skip-exclusions перечислить честно.

## Risks и Amendments
Риски A1, A2, A3, A4, A5, A6, A7, A8, A9, A10 распределены по TASK-1…TASK-3. No new package/DDL/provider. Десять изменяемых runtime/test файлов:7 application (включая existing partner.ts) +3 tests; процессные/spec документы отдельно. Остальные paths ниже — неизменяемые semantic dependencies для review snapshot, не разрешение переписывать их. QCR-QUALITY-1/QCR-RISK-1 требуют actual code, QCR-TEST-1 — обе projections. Изменение API результата узкое и обратно совместимое, но требует настоящего baseline regression/legacy native proof.

## Amendments

AM-1 (QCR-QUALITY-1, QCR-RISK-1): вернуть обе утверждённые строки notice с applied_code из locked DB code row, связанной с persisted attribution; input/SSR не доказательство. Confirmation: real HTTP reply, PG JOIN и notice совпадают при SSR A→applied B → test `referral HTTPS confirmation uses persisted code` in `tests/browser/repeat-registration-next.test.ts` (fails if final code is taken from SSR).

AM-2 (QCR-QUALITY-1, QCR-RISK-1): missing/invalid applied_code не разрешает positive notice; сохранить прежние null/errors/existing/login. Confirmation: invalid business result остаётся generic/retry → test `referral notice requires confirmed attribution` in `tests/browser/public-entry-cabinet.test.ts` (fails if HTTP200/status alone authorizes success).

AM-3 (QCR-TEST-1): на том же native referral signup сравнить обе canonical projections before/after, foreign и повторное чтение; без оплаты/видео и новой счётной семантики. Confirmation: chosen blogger/code ровно+1 в dashboard и owner report, чужие и reread unchanged → test `referral HTTPS registration increments both canonical projections once` in `tests/browser/repeat-registration-next.test.ts` (fails if source is not reflected once in either consumer).

EXPECTED_CODE_TARGETS:
- apps/web/src/server/referral-prefill.ts
- apps/web/src/app/page.tsx
- apps/web/src/app/Landing.tsx
- apps/web/src/app/AuthForm.tsx
- apps/web/src/app/AuthFlow.tsx
- apps/web/src/app/globals.css
- tests/referral-prefill.test.ts
- tests/browser/public-entry-cabinet.test.ts
- tests/browser/repeat-registration-next.test.ts
- apps/web/src/lib/partner-referral.ts
- apps/web/src/server/partner-landing.ts
- apps/web/src/server/partner.ts
- apps/web/src/server/trpc.ts
- apps/web/src/lib/rpc.ts
- apps/web/src/server/runtime.ts
- apps/web/src/app/theme-server.ts
- packages/db/src/index.ts
- packages/db/src/blogger-report.ts
- apps/web/src/server/blogger-owner-handler.ts
- tests/partner.test.ts
- tests/partner.integration.test.ts
- scripts/test-partner-mutations.mjs
