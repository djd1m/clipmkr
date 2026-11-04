# Исполнимый план upload-transfer-recovery

Статус: proposed для архитектора/QC; реализация pending. Tier: L, 22 code targets.
Inputs read: 00_complexity_assessment.md, 01_requirements.md, 02_research.md, 03_adr/001-multipart-navigation.md, 03_adr/002-session-content-identity.md, 03_adr/003-upload-lifecycle.md, 03.5_quality.md (CONDITIONAL; author rework, own-review pending), 04_domain_model.md, 05_architecture.md; pinned modules/06-implementation-plan.md, checker и code-goal-planner reference.

## Goal state / SPARC-GOAP
Текущее: прежний create/key/ListParts/PUT/Complete; metadata fingerprint, общий непросмотренный
cache, unmount abort без позднего fence, два stale расчёта uploading. Coverage этого запуска
не измерялось. Цель: strict scoped v2/full hash, durable manifest, native guards без remount,
честный uploading и один переход после actual accepted. Все 10 требований/10 acid cases
имеют задачи/проверки. Фиктивный целевой процент покрытия не задаётся.
Specification=FR/NFR/ADR; Pseudocode=hash/parser/attempt transitions; Architecture=существующие
boundaries; Refinement=сначала RED для изменяемых свойств, затем GREEN; Completion=QE/fleet/
существующий stage/ручная приёмка. Код не начинается от одного текстового K2.

## Tasks

### TASK-0: Закрыть входы, зависимость и настоящие ворота — FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2, NFR-3, ADR-001, ADR-002, ADR-003
Description: отдельный архитектор gpt-6-astra xhigh проверяет этот L-план, затем реальный
QCSD/shift-left/review-convergence по пинам и сохранённой lineage. Согласование upload-пути
владельцем уже получено; не спрашивать повторно как будто его нет. Проверить source-bound
S-зависимость в текущем main12b2e17577fcabf923f37b8814046357fd12b78a: точные SHA256 двух
исходников в 00, diff против авторского9b8b043 exit0. Не дублировать count/HEAD.
video.ts допускает только добавку pre-transaction account_scope из TASK-3a. Проверить конечный tier,
K1 new modules/exports, K2 с --tier=L --require-requirements после всех amendments.
SPARC Phase: specification. Files: feature/OpenSpec docs; code files не менять этим этапом.
Depends on: none. Estimate: отдельная архитектурная/QC сессия.
Test: реальные stdout/exit/receipts с SHA входов; unresolved/not-established не PASS.
Success Criteria: scope ограничен; старые M/CONDITIONAL не выданы за новые gates; dependency
имеет проверенный код/receipts в итоговом artifact. Risk Mitigation: Q13/Q14/Q16.

### TASK-1: Полный bounded SHA через узкий OSS — FR-4, NFR-1, ADR-002
Description: integration owner закрепляет @noble/hashes 2.4.0 только в web и общем lock;
writer реализует hashUploadFile + 4MiB chunk budget, sequential read/update/yield/abort.
SPARC Phase: pseudocode/refinement. Files: apps/web/package.json; package-lock.json;
apps/web/src/lib/upload-file-identity.ts; tests/upload-file-identity.test.ts.
Depends on: TASK-0. Estimate: 2–3 часа.
Test: `full_hash_covers_middle_bytes` (A1), `same_bytes_ignore_metadata` (A2),
`hash_reads_one_bounded_chunk_and_aborts` (A9): known SHA vectors/Node crypto oracle,
файл >2 chunks с изменением middle byte, max read length/inflight counter, отмена до/после
chunk, ни одного network вызова до hash. Browser heartbeat/scroll/button проверяет TASK-4.
Success Criteria: digest всех байтов, не sample/metadata; bounded reads; abort останавливает
новые чтения. Package build импортирует sha2.js без Node polyfill. Risk Mitigation: Q1/Q2.

### TASK-2: Строгая session v2 и durable checkpoints — FR-4, FR-5, FR-6, NFR-1, ADR-002
Description: helper строгой schema/storage outcomes по ADR-002, scoped key, immutable options,
server receipt/complete-ready manifest. Сохранение с readback, compare expected key перед
clear; legacy read-only диагностика. Helper не добавляет endpoint/DB/automatic migration/fallback key.
SPARC Phase: pseudocode/refinement. Files: apps/web/src/lib/upload-resume.ts;
tests/upload-resume.test.ts. Depends on: TASK-1. Estimate: 2–3 часа.
Test: `resume_v2_rejects_legacy_foreign_and_malformed` (A3/A10): unsafe size, UUID,
unknown version/fields, null/array, wrong scope/algorithm/digest/case, invalid CTA, malformed JSON;
`resume_manifest_requires_complete_parts` (A3): count/gaps/duplicates/invalid ETag/receipt tuple;
`storage_failures_are_explicit` (A4): get/set/readback/remove throw and stale key clear refusal.
Success Criteria: ошибки типизированы, соседний scope не тронут; никакого auto create/PUT/complete
из storage helper. Risk Mitigation: Q3/Q4/Q5/Q6/Q15.

### TASK-3: Встроить resume/attempt/native guard в один Uploader — FR-2, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2, ADR-002, ADR-003
Description: accountScope prop из pageAccount(), recovery query intent без ключа/ID;
объяснение на mount/originalFilename, полная hash-проверка File → readyResume (сеть=0) →
отдельное «Продолжить загрузку». Pause очищает File/native input, onChange сразу сбрасывает
input.value после захвата; picker cancel оставляет ожидание без сети/изменения manifest.
Focus/status/alert и recovery anchor строго по NFR-2/ADR-003; без focus steal на progress;
раздельные resume/new-upload actions;
persist перед create/PUT/Complete. Mounted/generation fence после всех await и перед
side effects; native beforeunload/capture anchor confirm, синхронная отмена или one-shot
accepted redirect. Не менять transport/RPC endpoints; create body получает expected account_scope по TASK-3a;
accepted data.video_id должен совпасть
с текущим сохранённым id. Read options/originalFilename/key только из valid v2 на resume.
SPARC Phase: architecture/refinement. Files: apps/web/src/app/upload/Uploader.tsx;
apps/web/src/app/dashboard/page.tsx. Depends on: TASK-1, TASK-2. Estimate: 4–6 часов.
Test: будущие browser tests TASK-4: same-key resume (A2), mismatch (A1), explicit new intent
(A3/A4), durable failure before Complete (A4), abort/unmount (A5/A6), account change (A10),
admitted повтор (A8). Нет нового key на generic retry. StorageUnavailable оставляет in-memory
manifest и показывает ограничение; каждый следующий network шаг всё равно ждёт durable-save.
Success Criteria: один экземпляр Uploader, старые handlers/options/transport переиспользованы;
незавершённый Complete не выдаётся за остановленный сервер. Risk Mitigation: Q3–Q9/Q11/Q15.

### TASK-3a: Expected account precondition — FR-4, FR-6, NFR-1, ADR-002
Description: createVideoSchema добавляет optional account_scope UUID; новый v2 Uploader
всегда отправляет expected scope при create и refresh подписей после403/expiry.
VideoService.create сравнивает с authenticated account ДО transaction/claim/quota/S3;
malformed→422, mismatch→409 «Аккаунт изменился. Обновите страницу». Auth остаётся источником
прав; клиент сохраняет File/manifest и не делает fallback/PUT/Complete/redirect. Legacy без
поля совместим; Complete ownership404 неизменён. Preflightalone не закрывает TOCTOU.
SPARC Phase: refinement. Files: apps/web/src/server/upload-contract.ts;
apps/web/src/server/video.ts; tests/upload.test.ts; Uploader.tsx уже в TASK-3.
Depends on: TASK-0; интеграция с TASK-3. Estimate: 1–2 часа.
Test: `create_scope_mismatch_has_no_side_effects` — expected B/auth A,409, ноль вызовов
transaction/pool connect/query, claim/quota/S3/sign (forbidden dependencies/spies);
`create_scope_schema_and_legacy_compatibility` — malformed UUID422 до effects, same-scope
и legacy без поля успешны по прежнему контракту. Existing Complete ownership404 regression.
Browser `stale_cookie_scope_blocks_create_and_refresh`: stale UI A/cookie B для key-only
и с videoId v2, refresh после403; manifest/File неизменны, нет следующих requests/redirect.
Success Criteria: несовпадение останавливается до любых побочных действий; реальный SQL/quota
регресс проверяется существующим безопасным integration suite, не mock и не stage DB.
Risk Mitigation: UTR-RISK-001. Новых endpoint/DB/framework нет.

### TASK-4: Реальные браузерные гонки и сохранённые options — FR-2, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2, ADR-002, ADR-003
Description: расширить существующую Vite/Playwright upload lifecycle fixture и старые hook
тесты, без нового persistent стека. В fixture настоящий React unmount/remount, переходы на
другую локальную страницу и back, File+sessionStorage одной вкладки; router.push массив
остаётся лишь счётчиком, не доказательством навигации. Перехватывать внешние requests до
клика; ни одного paid upstream. Второй browser context не «восстанавливает» отсутствующий cache.
SPARC Phase: refinement. Files: tests/browser/upload-lifecycle.test.ts;
tests/music-uploader.test.ts; tests/teaser-uploader.test.ts; tests/compaction-uploader.test.ts;
tests/pack-shot-uploader.test.ts; tests/clip-cta.test.ts. Depends on: TASK-3, TASK-3a; RED сценарии
пишутся сразу после TASK-0 до соответствующего поведения. Estimate: 4–6 часов.
Test: `pause_reselect_requires_separate_continue`: реальные pause→same native input/reselect→
hash→readyResume→отдельный Continue. Picker cancel/mismatch не портят manifest; до Continue
create/PUT/Complete=0. `keyboard_recovery_focus_and_live_status`: Tab/Enter/Space, focus после
Pause/ready/mismatch/storageBlocked/unknownComplete согласно NFR-2, label/description/status/
alert assertions и activeElement неизменён на progress ticks; Chromium/WebKit.
`stale_cookie_scope_blocks_create_and_refresh` — TASK-3a; key-only/с videoId, refresh403.
`active_beforeunload_reload_dismiss_and_accept`: после реальной user activation удержать
hash/create/PUT/Complete; настоящий reload → native dialog.type=beforeunload. Dismiss:
тот же document marker/URL/attempt, PUT жив; accept: новый document/remount, bounded manifest.
`inactive_and_confirmed_leave_have_no_extra_beforeunload`: pause/accepted не дают dialog,
confirm-accepted anchor даёт ровно один confirm без следующего beforeunload. Именованная
мутация `remove_beforeunload_registration` обязана сделать active reload test RED; synthetic
событие/paused reload не positive oracle; engine ограничения и skips отражаются отдельно.
`resume_uses_same_key_and_missing_parts` — одну часть server считает принятой, ответ
PUT потерян; pause/reload/reselect → прежний key/options/video_id, ListParts missing only (A2).
`hash_mismatch_never_mixes_parts` (A1); `legacy_or_lost_cache_never_autostarts` (A3/A4);
`new_upload_requires_explicit_intent` — отдельный клик, предупреждение о слоте, один новый key (A3/A4).
`storage_failure_blocks_complete` — failure до create/до PUT/после full parts, complete=0 до
успешного save/readback; remove failure после accepted не отменяет принятую загрузку (A4).
`navigation_denial_keeps_put_alive`, `confirmed_leave_aborts_without_hidden_complete` (A5):
barriers create/PUT/complete, confirm dismiss/accept, поздний response не запускает следующий шаг.
`unmounted_attempt_cannot_clear_or_redirect` (A6/A10): старый await/response.json/finally
не трогают новый generation/account/cache. `success_redirect_is_once_without_guard` (A8).
`admitted_repeat_keeps_actual_stage` — complete503/response-lost затем ack queued, настоящий
video.get fixture done/failed/transcribing; прежние full parts, no PUT/create, верный экран (A8).
`history_remount_uses_saved_session`, `modifier_and_hash_links_do_not_abort` (A5/A6).
`hashing_keeps_controls_responsive` с локальным большим File и измерением heartbeat/read size (A9).
Адаптировать 3 hook-host файла: настоящий Blob/File shape, fixture UUID scope/v2/hash и асинхронный
выбор; сохранять проверки music/teaser/compact defaults/locking, заменить ожидание auto legacy resume
на честный отказ. pack-shot SSR передаёт scope; clip-cta проверяет immutable valid CTA и malformed
cache вместо regex readCtaKind(saved)/старого resumed выражения. Не удалять продуктовые assertions.
Success Criteria: Chromium/WebKit реальное размонтирование и counters; source-only tests не
заменяют behavior. Полные options восстанавливаются лишь после content match. Risk Mitigation: Q1–Q9/Q11/Q12/Q15.

### TASK-5: Честный uploading во всех представлениях — FR-1, FR-3, NFR-2, ADR-001, ADR-003
Description: server no_response исключает uploading и progress=null; VideoDetail локальный
stale тоже; ProgressPanel отдельный uploading текст/recovery link без progress. VideoList
uploading — не Link просмотра, серверные стадии Link прежние. Не расширять status enum/
progress-ribbon/Screen API. Нет нового global CSS/восьмиэкранной композиции.
SPARC Phase: refinement. Files: apps/web/src/app/videos/VideoList.tsx;
apps/web/src/app/videos/[videoId]/VideoDetail.tsx; apps/web/src/server/screen.ts;
tests/progress-screen.test.ts; tests/browser/video-screen.test.ts.
Depends on: TASK-0; интеграция после TASK-3/4. Estimate: 2–3 часа.
Test: `uploading_is_never_stale_processing` (A7) now/+5min/+сутки, local-clock browser test в
lifecycle fixture; `uploading_row_has_no_detail_link` и queued/done Link; `other_processing_staleness_is_unchanged`;
`uploading_has_recovery_instruction_without_progress` на настоящем HTML/CSS в existing video-screen fixture.
Success Criteria: статус не обещает живую передачу/серверную работу; закрытый путь восстановления
и нет раннего Link после refresh. Risk Mitigation: Q10.

### TASK-6: Независимые QE/fleet и существующий stage — FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2, NFR-3, ADR-001, ADR-002, ADR-003
Description: focused GREEN, typecheck/lint/build, regression, targeted mutations, независимый
cross-model review и обязательный L fleet по 09_fleet_qe_plan.md. Reviewer начинает только с
согласованных документов и сам находит код; не передавать ему прежние авторские conclusions.
Затем operator проверяет existing project/data/active uploads/backup и выполняет app-only apply
проверенного артефакта на clipmkr-stage-20261028. Новый test stack/DB/Redis запрещён.
SPARC Phase: completion. Files: фактические receipts/08 QE/09 fleet/completion в writer worktree;
новых runtime targets нет. Depends on: TASK-4, TASK-5. Estimate: отдельные QE/release окна.
Test: commands ниже; mutation/discrimination sample hash, убрать fence, permissive parser,
вернуть uploading Link, убрать server либо local stale exclusion, silent save(parts), redirect
после abort. У S count/HEAD только проверить dependency/regression, не реализовывать вторично. Мутации remove_beforeunload_registration и убрать account_scope
precondition должны делать соответствующие именованные тесты RED.
Success Criteria: настоящие отчёты с SHA и preconditions; все serious findings закрыты их
исходными reviewers. Stage HTTPS address/TLS/CORS реальны перед опубликованным E2E; затем
проверены approved upload→pause/reselect→processing→clips, ссылка/инструкция владельцу,
его приёмка. До известного адреса stage E2E/delivery остаются pending без выдуманного URL.
Cloud/DNS и новые paid long CJM не выполняются автоматически. Risk Mitigation: Q13/Q16.

## Команды будущей проверки
Из writer worktree с Node22 и dependency, установленные одним integration owner:
`npm install --workspace=@clipmaker/web --save-exact @noble/hashes@2.4.0`
после K1/K2 и разрешения кодового этапа. Проверить, что diff только web manifest/root lock,
ни один посторонний dependency не обновлён. Эта команда в текущем документном блоке НЕ запускалась.

Focused unit: `env -u DATABASE_URL -u REDIS_URL npm test -- tests/upload.test.ts
- tests/upload.test.ts tests/upload-file-identity.test.ts tests/upload-resume.test.ts tests/progress-screen.test.ts tests/upload-browser.test.ts tests/upload-fix.test.ts tests/music-uploader.test.ts tests/teaser-uploader.test.ts tests/compaction-uploader.test.ts tests/pack-shot-uploader.test.ts tests/clip-cta.test.ts tests/upload-completion-integrity.test.ts`
Browser: `env -u DATABASE_URL -u REDIS_URL node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/upload-lifecycle.test.ts tests/browser/video-screen.test.ts`
Стандартные: `npm run typecheck`, `npm run lint`, `npm run build` и применимый полный `npm test`
с отдельной ведомостью skips/preconditions. Unit/browser isolated tests не используют stage DB.

Интеграционные наборы, создающие *_test DB/schema, нельзя направлять на рабочую stage DB:
ensureTestDatabase/migrate/drop в fixtures — не безобидный read-only smoke. Только существующая
заранее безопасная test-конфигурация в разрешённой среде; если её нет, интеграционный прогон
честно pending, не создавать новый DB/stack и не считать skip доказательством GREEN.
Проверенную S-зависимость использовать по её реальным receipts; опубликованный stage E2E
проверяет собственные test-account записи без сброса остальных данных/таблиц/Redis.
Для фактического Complete/paid processing заранее фиксируются окно, тестовый объект и
допустимость вызовов; отдельные browser route mocks доказывают UI, а не весь pipeline.

Responsive: существующий `scripts/check-responsive.mjs --base <фактически-проверенный-HTTPS-origin> --fixture <приватная-stage-fixture>`
после доступа, без автоматического seed/reset в stage. Параметры здесь намеренно не являются
выдуманными URL/готовыми credentials. Локально browser imports domRules/axe/textZoom/recovery
контролы проходят обе темы/320/375/390/768/1440; скриншоты 1440 и 375×667 проверяет человек.

## Dependency order / parallel groups
TASK-0 → TASK-1 → TASK-2 → TASK-3/TASK-3a → TASK-4 → TASK-6; TASK-0 → TASK-5 → TASK-6.
TDD RED из TASK-4/5 можно писать после TASK-0 перед соответствующим поведением; GREEN зависит
от runtime задач. После TASK-0 параллельны непересекающиеся helper и status units:
writer-A получает TASK-1/2 (helper/test, manifest только integration owner), writer-B TASK-5
(три представления и их два теста), каждый в собственном worktree. Uploader/lifecycle и старые
hook tests пишет один writer-C последовательно после integration этих units. Если работает
один writer — те же units последовательны; параллельность не условие корректности.
Общие manifests/lock/feature docs интегрирует один owner. В этом документном запуске
дополнительные writing agents не запускались.

## Checkpoints
1. Перед test/code: реальный routing L, подтверждённый S-SHA, независимый architect/QCSD/
   convergence, K1/K2 settled bytes. Одного наличия этих Markdown недостаточно.
2. После helpers: bounded hash+strict cache RED/GREEN, dependency diff, account/data boundary.
3. После lifecycle: live denied PUT, confirmed abort без hidden Complete, full manifest/admitted.
4. После presentations: uploading now/old/refreshed/list/detail; прочие стадии не регрессируют.
5. После code: review/QE + 4 роли L fleet, code/spec anti-drift и mutations.
6. Stage: backup/active-upload safety, actual SHA/digest/address, E2E, ручная приёмка; затем
   отдельная доставка того же артефакта. Не останавливать действующий upload ради apply.

## Risk assessment / acid coverage
A1→TASK-1/4 `full_hash_covers_middle_bytes`/`hash_mismatch_never_mixes_parts`;
A2→TASK-1/4 `same_bytes_ignore_metadata`/`resume_uses_same_key_and_missing_parts`;
A3→TASK-2/4 `resume_v2_rejects_legacy_foreign_and_malformed`/`legacy_or_lost_cache_never_autostarts`;
A4→TASK-2/4 `storage_failures_are_explicit`/`storage_failure_blocks_complete`;
A5→TASK-3/4 `navigation_denial_keeps_put_alive`/`confirmed_leave_aborts_without_hidden_complete`;
A6→TASK-3/4 `unmounted_attempt_cannot_clear_or_redirect`;
A7→TASK-5 `uploading_is_never_stale_processing`;
A8→TASK-3/4 `admitted_repeat_keeps_actual_stage`/`success_redirect_is_once_without_guard`;
A9→TASK-1/4 `hash_reads_one_bounded_chunk_and_aborts`/`hashing_keeps_controls_responsive`;
A10→TASK-2/4 `resume_v2_rejects_legacy_foreign_and_malformed`/`unmounted_attempt_cannot_clear_or_redirect`.
Q1–Q16 — исходные вопросы автора, не подписанные находки QC.
NoSuchUpload при потерянном full manifest остаётся bounded-limitation, не авто новый multipart.
Недоступные browsers/TLS/fixture/стенд дают «не выполнено», а не пустой успешный receipt.

## K1 / K2
Настоящий K1 выполнен на исходниках /home/clipmkr pinned harness-cli0.8.58: два вызова,
module upload-file-identity + hashUploadFile/UPLOAD_HASH_CHUNK_BYTES и module upload-resume
+ семь names ADR-002. Оба exit0/free; сырые k1-identity.json/k1-resume.json рядом.
Новых CLI-команд нет; пакетный импорт проверяется dependency/build, не collision gate.
До кода повторить K1 в итоговом writer worktree после интеграции; dist re-export limitations
не заменяют build. Любое новое export/module имя сначала включить в документы/K1.

K2 запуск из /home/clipmkr: `node node_modules/@dzhechkov/skills-feature-adr/templates/.claude/skills/feature-adr/scripts/check-plan-completeness.mjs /tmp/clipmkr-upload-recovery-impl-20261104/features/upload-transfer-recovery --tier=L --require-requirements`
После всех четырёх QC amendments этот точный pinned template helper реально выполнен на
указанном feature-каталоге: exit0; PASS, 0 failures/warnings/skips, 22 targets/10 requirements/
3 ADR. Raw k2-after-four-qc-rework.private.txt в приватном upload-recovery-next. Exit0
проверяет полноту; QCSD closure/код/QE этим не закрыты.

## Amendments
- AM-1 (owner-steer): конкретный путь загрузки согласован, восьмиэкранный redesign не включать. Confirmation: штатный success ведёт на ту же запись ровно один раз → test `success_redirect_is_once_without_guard` in `tests/browser/upload-lifecycle.test.ts` (падает при post-accept guard/двойном переходе).
- AM-2 (architecture): bounded v2/full hash; legacy/storage loss без авто-дубля. Confirmation: отсутствие cache не инициирует сетевую операцию → test `legacy_or_lost_cache_never_autostarts` in `tests/browser/upload-lifecycle.test.ts` (падает при fallback create).
- AM-3 (architecture): durable parts до Complete, stale attempt не продолжает lifecycle. Confirmation: отказ storage не посылает Complete → test `storage_failure_blocks_complete` in `tests/browser/upload-lifecycle.test.ts` (падает при silent save).

- AM-4 (QCSQ-UX-001): pause/reselect/hash не начинают сеть; отдельный Continue обязателен → test `pause_reselect_requires_separate_continue` in `tests/browser/upload-lifecycle.test.ts` (RED при auto create после hash или несброшенном input).
- AM-5 (QCSQ-A11Y-002): конкретные focus/status/alert и keyboard recovery без focus steal → test `keyboard_recovery_focus_and_live_status` in `tests/browser/upload-lifecycle.test.ts` (RED при body focus/потерянном live-status).
- AM-6 (UTR-RISK-001): expected scope проверяется в create до transaction/claim/quota/S3 → test `create_scope_mismatch_has_no_side_effects` in `tests/upload.test.ts` (RED при удалении/переносе precondition после transaction); browser stale-cookie/refresh привязка в TASK-3a/4.
- AM-7 (UTR-TST-001): native active reload после user activation и beforeunload dismiss/accept → test `active_beforeunload_reload_dismiss_and_accept` in `tests/browser/upload-lifecycle.test.ts` (RED при remove_beforeunload_registration); cleanup oracle отдельным named test TASK-4.

EXPECTED_CODE_TARGETS:
- apps/web/package.json
- package-lock.json
- apps/web/src/lib/upload-file-identity.ts
- apps/web/src/lib/upload-resume.ts
- apps/web/src/app/upload/Uploader.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/videos/VideoList.tsx
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- apps/web/src/server/screen.ts
- apps/web/src/server/upload-contract.ts
- apps/web/src/server/video.ts
- tests/upload.test.ts
- tests/upload-file-identity.test.ts
- tests/upload-resume.test.ts
- tests/browser/upload-lifecycle.test.ts
- tests/progress-screen.test.ts
- tests/browser/video-screen.test.ts
- tests/music-uploader.test.ts
- tests/teaser-uploader.test.ts
- tests/compaction-uploader.test.ts
- tests/pack-shot-uploader.test.ts
- tests/clip-cta.test.ts
