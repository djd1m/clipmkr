# План: контекст TEST-предупреждений

Статус: план принят отдельным planner gpt-6-astra xhigh 06.11.2026 после чтения требований,
reuse и исходного UI; отчёт reviews/plan-review.md. До кода нужны реальные K1/K2 и supported
checkpoint. Первоначальный план принят; bounded rework QE-TEST-001 ожидает принятия
originating independent Astra qe-primary до новой правки кода. Принятие плана не является
квитанцией выполненного кода или QE.
Inputs read: 00_complexity_assessment.md, 01_requirements.md, 02_reuse_inventory.md,
AGENTS.md, CLAUDE.md, docs/model-matrix.md, docs/acceptance/core-cjm.md.
03_adr / 05_architecture: не применяются для S; действующая архитектура сохраняется.

## Goal state
Current: root layout показывает TEST на всех маршрутах; /upgrade имеет краткий badge;
финансовая статистика полагается на global banner.
Goal: отсутствие global banner; понятное предупреждение около покупки и на финансовых
экранах обеих ролей; прежние auth, checkout и вычисления неизменны.

## Tasks
- TASK-1 — FR-1, FR-4: убрать global JSX и loadPaymentsConfig import из layout.tsx;
  обновить существующий rendered Layout test в tests/billing.unit.test.ts: при live/test,
  live/non-test и off глобального предупреждения нет; children/theme/analytics сохраняются.
- TASK-2 — FR-2, FR-4: в existing package-purchase-terms и legacy payment paragraph
  UpgradeScreen добавить conditional «TEST · Тестовая оплата. Реальных списаний нет.».
  Не менять intro badge или buttons/handlers/props. Existing tests/credit-packages-ui.test.ts:
  render TEST/non-test для credits/legacy, проверка текста в каждой зоне до кнопки.
- TASK-3 — FR-3, FR-4: в server partner/page.tsx перед PartnerPanel и bloggers/page.tsx
  перед BloggerAdmin условный p className=workspace-test role=status с текстом
  «TEST · Тестовые платежи. Реальных списаний нет. Выручка и расчёты — учебные.».
  Условие строго config.payments.mode === 'live' && config.payments.testMode,
  после существующей проверки роли. Конфигурация из уже используемого runtime.
  tests/billing.unit.test.ts: отдельный describe с mocked modules и rendered server pages,
  TEST/live-non-test/off, отрицательные доступы (redirect/notFound), текст перед панелью.
  Off-негатив включает synthetic config mode=off/testMode=true, чтобы проверка отличала
  обе части условия; это защитная фикстура, не заявление о допустимой production config.
  Mock панелей выдаёт различимый маркер, и assertion доказывает порядок notice → panel.
- TASK-3R — FR-3, FR-4, QE-TEST-001: в existing /dashboard/page.tsx добавить тот же
  conditional TEST/no-real-charge/учебные p строго внутри existing details
  «Партнёрская программа», после summary перед legacy PartnerPanel в !personal branch.
  Использовать существующий config, точное mode=live && testMode условие. Не менять
  PartnerPanel, personal summary, props, CSS, auth/финансовые handlers или данные.
  tests/billing.unit.test.ts: `legacy dashboard revenue stays contextually labelled only in TEST`
  рендерит actual Dashboard с различимыми legacy/summary panel markers. Четыре режима:
  live/test, live/non-test, off/false, synthetic off/true; ordinary branch содержит notice
  только live/test и строго внутри того же details до panel. Blogger summary не получает notice.
  Сначала actual RED без JSX-поправки; после неё GREEN. Временное удаление notice или mode guard
  даёт AssertionError; восстановить исходные bytes до final проверки.
  Readonly semantic dependency: apps/web/src/app/dashboard/PartnerPanel.tsx, baseline SHA256
  27a56b2d93af2a95b4c932f61170571041392ee2e54a87899031d0e4921a396e.
  Проверка unchanged: sha256sum должен совпадать, git diff -- PartnerPanel.tsx пуст;
  новый тест не подменяет и не переписывает денежный renderer.
- TASK-4 — FR-1, FR-2, FR-3, FR-4: focused SSR tests, existing payment/UI regressions,
  typecheck/lint, git diff --check; controlled negative mutation по global/remove guard,
  actual results/limitations в 08_qe_report.md, independent Astra QE, code/spec anti-drift.
  В tests/billing.unit.test.ts проверить rendered /dashboard/account: existing TEST badge
  остаётся в live/test и отсутствует в live/non-test/off; account/page.tsx не изменять.
  Negative mutation выполняется временно и откатывается: возврат global, удаление
  предупреждения у CTA, снятие live/test guard должны делать целевые проверки красными.
  Финансовые API/DB/provider calls не нужны; опубликованный runtime проверяет root отдельно.
  Private delivery preparation, если поручена root, переиспользует reviewed guarded wrapper
  с актуальными literal paths/revisions; не расширяет runtime scope и не означает build/apply.

## Dependency order / checkpoints
TASK-1 → TASK-2 → TASK-3 → TASK-3R → TASK-4, один автор. До code: fresh planner adopts/edits план,
recall из /home/clipmkr, K1 existing names-only declaration (нет новых command/module/export),
K2 через installed check-plan-completeness.mjs --tier=S --require-requirements (exit0).
После кода: author verification, independent fresh Astra получает только требования/план,
сам находит код и тесты; root управляет доставкой. Новые approvals не выдумываются.

## Risk assessment
R1 предупреждение пропадёт вместе с global → TEST/off матрица обеих ролей.
R2 TEST окажется в боевой среде → exact existing predicate отрицательно проверяется.
R3 длинная страница отдалит label от CTA → текст в каждой package-purchase-terms.
R4 случайная смена financial/auth поведения → scope diff и existing regressions.
R5 account badge потеряется при удалении global → отдельный rendered account regression;
изменение account/page.tsx вне допустимых targets.

## Amendments
Первоначальный planner уточнил predicate, placement, account badge и мутации.
AM-1 (qe-primary QE-TEST-001, root bounded rework): reachable legacy выручка /dashboard
получает contextual notice внутри existing details; FR-3/OpenSpec инвентаризация уточнена.
Confirmation: предупреждение до monetary panel внутри details только live/test; blogger
summary без generic notice → test `legacy dashboard revenue stays contextually labelled only in TEST` in `tests/billing.unit.test.ts` (fails if reverted).
До TASK-3R: originating Astra принимает actual amended docs как план rework; это не новая
fresh planner сессия. Затем actual recall/K2/checkpoint/admission/context до кода. Root
повторно prepare QE после sourcefreeze и originating reviewer проверяет свою condition.
Итого WRITE 7 targets (5 runtime + 2 existing tests), READONLY 1 semantic dependency.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/layout.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/dashboard/partner/page.tsx
- apps/web/src/app/dashboard/bloggers/page.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/PartnerPanel.tsx
- tests/billing.unit.test.ts
- tests/credit-packages-ui.test.ts
