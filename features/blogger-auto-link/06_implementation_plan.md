# План реализации личной ссылки блогера

Статус: structural rework после трёх initial QCSD reviews; closure ожидает исходных reviewers. K2 NOT RUN.
Inputs read: 01_requirements.md, requirements-revision.json, 02_reuse_inventory.md, 03_adr, 05_architecture.md, owner-approval.md.

## Goal state / SPARC-GOAP
Текущее: ручной код, общий закрытый PartnerPanel, существующие ensurePartnerCode/статистика.
Цель: активный блогер получает стабильный личный адрес без ввода кода; обычному нет auto-write.
Инварианты: прежние IDs/атрибуции/оплата, earliest blocked, единственный uploader, согласованный HTML.
Проценты покрытия заранее не выдумываются: успех определяется сценариями и доказанной фальсифицируемостью.

## Tasks

### TASK-1 — FR-3, FR-4, FR-5, FR-7, ADR-001: транзакционная выдача
SPARC refinement. После настоящего QCSD closure/K1/K2, сначала red tests.
Files: `apps/web/src/server/partner.ts`, `tests/partner.integration.test.ts`.
Добавить узкий `PartnerService.ensurePersonalLink(account)`: BEGIN → active blogger account lock →
ensurePartnerCode → locked selected status read → COMMIT, rollback/release при ошибке.
Сервис 141 строк, не god-object; новый слой/экспорт/дублирующий генератор не нужен.
Test names: `personal link concurrent first calls return one identity` (A1),
`personal link rejects normal and deleting accounts without writes` (A2),
`personal link serializes role revocation and erasure` (A2),
`personal link retains earliest blocked code during block race` (A3),
`personal link preserves campaigns attribution and payment snapshots` (A4).
Использовать настоящую PG и управляемые lock barriers, оба порядка commit; не sleep-only race.
При потерянном ответе после commit повтор даёт тот же id. При rollback нет частичного partner/code.
Success: все тесты исполняются, не skip; 20 callers → одна строка; исторические строки сравниваются целиком.

### TASK-2 — FR-4, FR-6, FR-7, ADR-001: существующий RPC-контур
Depends on TASK-1. Files: `apps/web/src/server/trpc.ts`, `apps/web/src/lib/rpc.ts`, `tests/partner-route.test.ts`.
Добавить Context method и router mutation `partner.ensurePersonalLink`, strict `{}` и rpc union literal.
Reuse partnerResult/authorizeUpload/readUploadJson, HTTP 202, no-store; новый REST handler не нужен.
Tests: `personal link mutation uses session and rejects injected input`,
`personal link GET cannot mint`, `personal link rejects unauthenticated and foreign origin requests`,
`personal link rate refusal precedes body and service`.
Проверять реальный HTTP adapter; сервис stub доказывает только dispatch, реальные guards — TASK-1.
Success: отсутствие account_id/role injection и side effects GET; безопасное тело unexpected error.

### TASK-3 — FR-1, FR-2, FR-3, FR-5, FR-6, ADR-001: согласованная карточка
Depends on TASK-1/2. Files: `apps/web/src/app/dashboard/page.tsx`, `apps/web/src/app/dashboard/PartnerPanel.tsx`, `apps/web/src/app/globals.css`.
SSR getBloggerPolicy из существующего @clipmaker/db; `personal` prop только active blogger.
Один экземпляр панели; обычный mode без auto-mint. В personal mode нет ручной формы,
личный DTO отделён от фильтра campaigns; прежняя статистика доступна в details.
Loading → ready/blocked/error; copy success/error aria-live, selectable readonly URL.
10-секундный signal для личного RPC + cleanup; cancel/stale response не перезаписывает новый attempt.
Повтор не параллелен текущему запросу. В blocked copy недоступен и в раскрытом прежнем
списке PartnerSummary для этого personal id. Проверка только верхней карточки недостаточна.
Не выключать весь onCopy для списка: другая active кампания сохраняет действие и статистику;
обычный mode не меняется. История сохраняется.
Компоновка: desktop рядом с uploader, mobile после upload controls до записей, обе темы/вида.
Uploader не remount; не переносить полный UX из 9365e990. Изменения CSS ограничены карточкой.

### TASK-4 — FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7: browser и falsifiers
Depends on TASK-3. Files: `tests/browser/blogger-auto-link.test.ts` (новый).
Reuse existing blogger-cabinet Vite+React hydration/HTTP/PG template; Chromium и WebKit где доступны.
Tests: `blogger auto link keeps identity across reload and filter` (A1/A4),
`normal dashboard mount never calls auto link mutation` (A2),
`blocked personal link keeps statistics without copy` (A3),
`personal link timeout retry and clipboard denial stay honest` (A5),
`personal link layout retains uploader through preferences` (A6).
`blocked personal link cannot be copied from expanded campaigns`: раскрыть details с earliest
blocked и другой active кампанией; проверить отсутствие/disabled copy blocked во всех представлениях,
действующий copy другой active кампании, обе статистики и регрессию ordinary mode. Falsifier:
вернуть безусловный copy именно в раскрытом списке — named test обязан стать red.
`two blogger HTTP sessions keep personal link ownership isolated`: в этом же существующем
HTTP/PG harness создать A/B и две настоящие auth-сессии без кодов, выполнить sequential и
concurrent POST → repeat/reload. Реальный service и SQL, без mock ключевой цепочки. Проверить
разные id/code A/B, JOIN owner каждой строки, один код на account, стабильность повторов,
свой dashboard и 403 при чужом code_id без чужого payload. Falsifier: подменить account
нового сервиса на A (или вернуть общий result); контроль B и DB ownership должны стать red.
Один meaningful end-to-end integration case переиспользует текущую browser suite/harness;
полный first-open → POST → copy → reload также остаётся обязательным.
Управляемые сетевые отказы допустимы для delay/response-loss; не выдавать fixture за live provider.
Widths 320/390/1440, text 200%, обе темы/компоновки, keyboard/focus/44px; horizontal overflow=0.
Falsifiers: убрать blogger guard, earliest blocked preservation, client mode guard — каждый свой named test red.
Смена preferences во время загрузки проверяет uploader DOM identity, input/files и продолжающийся progress.

### TASK-5 — ADR-001: проверки, независимое QE и передача
Depends on TASK-1–4. Phase completion. Кода в этом этапе не добавляется без возврата к плану.
Node22, pinned tools. `npm test -- tests/partner.integration.test.ts tests/partner-route.test.ts tests/partner.test.ts tests/partner-landing.test.ts tests/blogger-policy.integration.test.ts tests/blogger-trial-credits.integration.test.ts` с изолированным *_test DATABASE_URL.
`node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/blogger-auto-link.test.ts`.
Затем `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`, `bash scripts/check-responsive.sh --test`, `git diff --check`.
Host предоставляет тестовые DATABASE_URL/REDIS_URL без записи секретов в artifacts; skip или недоступность не PASS.
Check CI selectors/commands and sibling guest-pack/createCode regression; blockers исправить до QE closure.
Протоколы: shift-left, risk/test-design, contract, accessibility/regression, security, bounded resilience, mutation.
Независимый code/QE reviewer Astra xhigh получает только accepted docs в свежей сессии, сам находит код.
В 08_qe_report: requirement → risk → scenario → command → result → limitation, code/spec anti-drift,
точные SHA/hash, actual falsifiers и ограничения. Поддерживаемый dz teach только после реального урока.
После закрытия QE root выкладывает тестовую копию по AGENTS, проверяет реальный URL/host/E2E,
выдаёт владельцу ссылку и инструкцию; Cloud.ru только после его ручной приёмки.

## Dependency order / Parallel groups
TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5. Один автор Sol high; текущий planner код не пишет.
Дизайн проверяют три независимые core роли; root делает host prepare ДО review и closure ПОСЛЕ rework.
Артефакт пишется сейчас как материал review; итоговый Step 6 следует QCSD и учитывает его реальные findings.
В блок целей ниже также включены неизменяемые семантические зависимости для host QE snapshot:
partner-code, guest-pack, blogger-policy и существующий HTTP route. Это review scope; ожидаемый
кодовый diff остаётся 9 файлов. Зависимости не переписывать без обоснования и повторного review.

## Checkpoints / K1 / K2
K1 реально выполнен pinned dz Node22: `name-check --export ensurePersonalLink --project /tmp/clipmkr-blogger-auto-link-impl-20261105`, exit 0, FREE, 277 source files/843 exports.
Метод и RPC key дополнительно сверяются поиском; новых exported функций/production modules нет.
Новый test module basename `blogger-auto-link.test` также проверен отдельным `name-check --module blogger-auto-link.test` с тем же project: exit 0, FREE. Ручной rg по apps/web/src/tests не нашёл method/key/test name.
Ограничение: scanner проверяет source declarations, не доказывает уникальность всех dynamic/re-export имён; build остаётся обязательным.
K2 запускать только после настоящего QCSD/convergence: `node /tmp/clipmkr-public-entry-20261105/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/blogger-auto-link --tier=M --require-requirements`.
Действительный последний verdict и exit сохраняются; nonzero блокирует код. Наличие файлов не approval.

## Risk assessment / Amendments
Авторские главные риски: auth race, blocked bypass, duplicate identity, filtered personal URL, upload remount.
Initial QCSD выполнен тремя отдельными core-сессиями с requested `gpt-6.1-terra xhigh`;
их reports/receipts сохраняются. Первые Astra попытки завершены до formal entry, не считаются review.
Действительное cross-model provenance аттестует host; эти документы не подменяют подтверждение.

## Amendments
AM-1 (qcsd Q-BA-01, R-BAL-01): исключить copy blocked personal id также в раскрытом списке, сохранив active campaign и ordinary mode. Confirmation: раскрытый список не позволяет скопировать blocked → test `blocked personal link cannot be copied from expanded campaigns` in `tests/browser/blogger-auto-link.test.ts` (fails if reverted).
AM-2 (qcsd T-BAL-01): проверить две настоящие HTTP-сессии и service/PG ownership, собственные данные и чужой отказ. Confirmation: подмена account или общий result ломает изоляцию → test `two blogger HTTP sessions keep personal link ownership isolated` in `tests/browser/blogger-auto-link.test.ts` (fails if reverted).
Оба теста пока planned, не выполнены и не выдаются за runtime evidence. Closure только после focused review.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/partner.ts
- apps/web/src/server/trpc.ts
- apps/web/src/lib/rpc.ts
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/PartnerPanel.tsx
- apps/web/src/app/globals.css
- tests/partner.integration.test.ts
- tests/partner-route.test.ts
- tests/browser/blogger-auto-link.test.ts
- apps/web/src/server/partner-code.ts
- apps/web/src/server/guest-pack.ts
- packages/db/src/blogger-policy.ts
- apps/web/src/app/api/trpc/[trpc]/route.ts
