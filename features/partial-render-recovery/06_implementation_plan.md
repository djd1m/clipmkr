# Проект плана: partial render recovery

**DRAFT / не допуск к коду.** Координатор принял M-оценку; владелец ещё не согласовал требования/HTML.
Этот предварительный план подготовлен для review, без заявления выполнения Step6 отдельной планирующей моделью.
Inputs read: 01_requirements.md; 02_reuse_inventory.md; существующие VideoRetryService, screen, VideoDetail,
credits.ts, attempts.ts, render.ts, tests/progress-screen*, tests/credit-packages.integration.test.ts.
03_adr и 05_architecture для этой фичи ещё не созданы/не утверждены; QCSD NOT RUN.

## Цель и состояние

Сейчас partial done1/2 получает overall success и не имеет retry. Штатный render-only retry, fences,
immutable S3 publication и одноразовый reserve уже существуют. Цель: владелец повторяет только failed
монтаж через ту же кнопку/endpoint, скачивая готовый клип; новая series не списывает credits повторно.
Процент покрытия нового поведения неизвестен; завершённость определяется FR-1…FR-6 и отрицательными cases.

## Последовательность SPARC-GOAP

**TASK-0 · specification, до кода.** Получить согласование точного макета/требований и сохранить настоящую
ссылку/сообщение, SHA макета и дельты; не создавать approval по наличию файлов. Выполнить M ADR (Nygard/ITD-light)
с Confirmation и shift-left, QCSD, light architecture с account→video→clip/attempt locks и billing invariants.
Роль архитектора/планировщика по docs/model-matrix.md, отличная от будущего автора кода; результат текущего
агента не маркируется независимым. После review оформить окончательный Step6 и поддерживаемые dz checkpoints.
Зависимость остальных задач: TASK-0, настоящий K1/K2 PASS, допуск по требованиям проекта.

**TASK-1 · pseudocode/architecture.** Согласовать минимальную eligibility на существующем assertRetryable:
partial candidate done с0<done<total и source; под lock перечитать transcript, clips и active jobs; для partial
только терминальные done/failed и хотя бы один failed. Несогласованные counters, активный job или отсутствие
оплаты для credits_v1 отклоняются до reserve/series mutation. Сохранить старый status failed путь без регрессии.
Определить самый узкий read-model для next_action/credit copy, без нового enum/API и helper-сервиса.
A1: права, TEST-AUTH. A2: отказ незаконному состоянию, TEST-STATE. A4: guard оплаты, TEST-CREDITS.
Выход: reviewed ADR/архитектура, карта branch→test, при необходимости уточнённые EXPECTED_CODE_TARGETS.

**TASK-2 · refinement, service TDD.** В существующей integration-suite сначала RED для partial retry;
затем минимальное разрешение VideoRetryService с использованием текущих locks, stage selection,
pending-clips lease, reserveVideoCreditsTx и enqueue/watchdog. Не трогать worker, storage или кредитный алгоритм.
TEST-RETRY (FR-2): одна новая render series/failed clip; STT/select отсутствуют, done сосед побайтово/по полям неизменен.
TEST-AUTH (FR-4/A1): чужой, missing, soft-deleted, inactive/erasing; без queue/DB/credits effects.
TEST-STATE (FR-4/A2): fully done, active, unknown counters, missing source/transcript, nonterminal clip/active job — conflict.
TEST-CREDITS (FR-3/A4): settled/reserved, zero balance, expired grant; charge/cycle/allocation/grants unchanged;
missing/released отказ; legacy/owner exempt сохраняют политику. Повторное finalize не списывает ещё раз.
TEST-RACE (FR-5/A5): конкурентные calls/потеря ответа → одна серия. TEST-DELIVERY (A6): enqueue fault→watchdog;
stale fence refusal. TEST-PRESERVE (A3): готовые keys/contract/score/link/render_fence/bytes неизменны и файл доступен.

**TASK-3 · refinement, presentation TDD.** Presenter next_action='retry' только разрешённому partial candidate;
ProgressPanel проверяет partial до success early return, показывает реальные количества и существующий button.
Сохранить один player, выбранный ready clip, download; header не утверждает полный успех. Busy/rpc/refresh/poll
переиспользуются. Credit copy только при подтверждённой применимости, иначе нейтральное сообщение.
TEST-UI (FR-1/FR-6):1/2→busy→rendering→2/2, отказ, reload, только один «Повторить», отсутствие действия у fully done;
доступный готовый player/скачивание во время монтажа. Это задача для будущего кода после согласования HTML.

**TASK-4 · completion/QE.** Целевые unit/integration/browser suites; typecheck/lint/build, проектный responsive
прибор. Изолированный PostgreSQL fixture, не production DB и не MinIO-доказательство Cloud.ru.
Проверить обе темы,390/1440, keyboard/text200%. Отрицательные контроли: убрать partial guard, включитьdone
в pending, убрать ownership filter, позволить charge-cycle reset — соответствующие тесты обязаны стать RED.
Независимое cross-model review в новой сессии по матрице; anti-drift FR→code→test→observed result→limitations.
Расширенное QE: security/auth, contract presenter→button→retry, concurrency/fault injection локально,
regression готового клипа. Только фактические результаты в08_qe_report, не прогноз PASS.

**TASK-5 · completion/delivery.** Маленькие проверенные commits после root review, одинаковые push SHA
в три зеркала. Controller/dev —77.83.87.178 с /home/clipmkr; это не публичная цель приёмки. Цель — https://clipmkr.ru,
194.85.249.105/test-apps-server.com, existing compose project n5-clipmaker. Read-only inspect05.11 подтвердил
remote compose working_dir `/home/dz-projects-2026/2026-AUG-PU-Projects/2026-AUG-PU-Projects/projects/05-podcast-clips-opus/.env.n5-blogger-release-20261102`.
Перед будущей доставкой повторно прочитать labels, rendered config, image IDs и сделать backup. Сохранить все
шесть текущих compose файлов: compose.private.json, thinking-images.override.private.json,
mockup-94df0b02f32c.override.private.json, mockup-a961d62f2573.override.private.json,
mockup-8859f762c4ce.override.private.json и resend-activation-20261105.override.private.json.
Также сохранить новый payment override, когда он будет применён отдельным блоком; не возвращать конфигурацию
к старому6-file snapshot и не терять актуальную почту/оплату при обновлении image. Ни конфиги, ни секреты в Git не копировать.
Затем существующая partial QA запись → UI «Повторить» → failed clip ready → реальный play/download обоих,
неизменный готовый key/hash и credits audit; без повторного STT/LLM.
Ссылка/инструкция владельцу и его ручная приёмка; Cloud.ru только после неё, тот же артефакт с rollback.

## Gate status и проверки

K1 NOT RUN: новых runtime имён/exports пока не планируется; после ADR проверить manifest и supported dz invocation,
не интерпретировать exit2/пустой поиск как доступность. K2 NOT RUN: ADR/QCSD/architecture отсутствуют, поэтому
готовность намеренно не заявляется. Планировщик запускает check-plan-completeness.mjs features/partial-render-recovery
--tier=M --require-requirements установленной Codex skill после реальных artifacts; нужен именно exit0/PASS.
Команды будущей проверки: `npm test -- tests/progress-screen.test.ts tests/progress-screen.integration.test.ts tests/credit-packages.integration.test.ts`;
реальные имена дополнительных integration/browser файлов уточнить в TASK-1. Затем `npm run typecheck`, `npm run lint`,
`npm run build`, responsive check по проектному скрипту. Не запускались для несуществующего appcode.

## Риски и ограничения

Eligibility по counters без authoritative clip/job проверки открывает ненужный retry. Reserved/settled ветка
доказана чтением, новый no-charge сценарий ещё не исполнен. Presenter не видит charge-state из v.* автоматически:
архитектурный review обязан связать правдивый CTA/copy с authoritative guard, не добавляя параллельную политику.
Исчезнувший S3 source не восстанавливается этим фиксoм. Транспортная причина исходных timeout остаётся открытой.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/video-retry.ts
- apps/web/src/server/screen.ts
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- tests/progress-screen.test.ts
- tests/progress-screen.integration.test.ts
- tests/credit-packages.integration.test.ts
- tests/browser/video-screen.test.ts
