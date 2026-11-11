# План реализации доступа к исходнику

Статус: финализированный Step 6 после реального QCSD R2 и owner approval дополнительных UI-состояний; до K2 текущей редакции, checkpoint/code admission и разрешения кода. Архитектура и первоначальный план: `/root/original_video_architecture`; финализация плана: отдельная сессия `/root/original_video_final_plan`, запрошенная модель `gpt-6-astra xhigh`; кодер — `gpt-6.1-sol high`. Провайдерская attestation модели не получена. Этот документ не является receipt или owner approval.

Native ideation evaluate реально завершился exit 0, verdict `closed`, unresolved/reasons `[]`: revision `d7b8009a27a9111aa6478d38483595af4e8f865212973671d46c169936a284e0`, nonce `813cb2be-355a-43a6-8d5c-7199290984c5`. Три независимые R2-сессии `gpt-6.1-terra xhigh` проверили исходные условия и всю дельту; отчёт root — `03.5_ideation_report.md`, собственные отчёты — `reviews/qcsd-quality-r2.md`, `reviews/qcsd-risk-r2.md`, `reviews/qcsd-testability-r2.md`. Closure относится к дизайну; тесты AM-5/AM-6/AM-7 ещё предстоит реализовать и выполнить. Ранее unresolved R1 и reviewed R2 сохранены, без переназначения их авторства.

Accepted main `2b61adeea68f9fa7d316969db7738e5754dec8f8` интегрирован root в HEAD `3603be73ba4fc32d43f611885a4ac89faeaaa80d`. Повторная проверка в `dependency-recheck.md`: ни одна из 16 целей между исторической базой и accepted main не менялась; все 21 read-only dependency SHA совпали. Четыре измеренных core-документа 00/01/ADR/05 сохранены побайтно. Прежние формулировки pending внутри этих frozen входов отражают момент review; фактический текущий исход установлен evaluate и отчётом 03.5. Обновлённый `design-snapshot.json` — post-ideation Step 6 snapshot, не снимок, который проверяли R2-роли.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-serve-original-through-owned-route.md`, `03.5_ideation_report.md`, `05_architecture.md`, pinned OpenSpec, `reviews/qcsd-quality-r2.md`, `reviews/qcsd-risk-r2.md`, `reviews/qcsd-testability-r2.md`, `dependency-recheck.md`; raw evaluate R2 прочитан. Применены Step 6 SPARC-GOAP reference и code-impl; нового дизайна и расширения scope нет.

## Goal state
Текущий state: есть owned clip routes, streamGuestFile, HEAD/bytes/presign, принятый upload object и рабочее пространство клипов; original route/UI отсутствуют. Исторические1048 тестов не являются измерением этой ревизии; новый coverage percentage не выдумывается.

Цель: собственная завершённая исходная запись доступна для native просмотра, скачивания и Zoom canvas через один same-origin route. Нет новых persistent models, queues, media-конвертации или изменений денег/retention. Acceptance: все FR/NFR ниже, реальные native media/Cloud.ru/DB evidence и совпадение с согласованными макетами. Недоступность storage или codec не отменяет готовые клипы.

SPARC: specification=01+OpenSpec+ADR; pseudocode=auth→DB→HEAD→bounded sniff→metadata/HEAD/stream; architecture=05; refinement=малые red/green проверки ниже; completion=stable full run, independent QE, test deployment и owner acceptance.

## Tasks

### TASK-1 — ADR-001, FR-4, FR-5, FR-8, NFR-1: защищённое чтение
Files: `apps/web/src/server/original-file.ts`, `packages/shared/src/server/original-source.ts`, `vitest.config.ts`, `tests/original-file.test.ts`, `tests/original-file.integration.test.ts`. Depends on: фактически закрытый QCSD R2, supported Step3/5/6 и успешные K1/K2 на финальных bytes, root backend code GO. SPARC: refinement. Ввести DI `OriginalFileDependencies`, handler `createOriginalFileHandler`, DTO `OriginalSourceMetadata`. Единственный `originalSourceRevision` разместить в shared server leaf по05; web/worker импортируют `@clipmaker/shared/server/original-source`, без root barrel export и дублирования helper. В vitest.config добавить exact source alias для этого subpath. Выборка собственника active account перед storage, upload-complete predicate и точное missing/error различение. Никаких SQL writes/jobs/credits/growth. Проверки `original_denies_foreign_before_storage`, `original_distinguishes_upload_missing_and_outage`, `original_revision_tracks_upload_identity` сначала красные, затем зелёные; revision test импортирует канонический leaf и сравнивает фиксированный v1 vector. Done: real PostgreSQL fixtures own/foreign/owner/inactive/deleted/unknown; account/video/credit/job state остаётся неизменным. Risk: IDOR/подмена lifecycle, stale dist или Node crypto в browser; fake SQL не заменяет DB test.

### TASK-2 — ADR-001, FR-3, FR-7, NFR-3, NFR-4: MIME и ограниченный sniff
Files: `apps/web/src/server/media-type.ts`, `packages/s3/src/operations.ts`, `tests/original-media-type.test.ts`, `tests/original-file.test.ts`. Depends on: TASK-1 contract. SPARC: refinement. Ввести `detectOriginalMedia`, `OriginalMediaType`; сохранить `isAllowedMedia` truth table. Добавить optional maxBytes в existing getObjectBytes, cap/count/cancel до накопления сверх4096. Generated safe filename без исходного ФИО; unknown → bin/download. Done: `original_magic_ignores_key_suffix`, `original_sniff_stops_at_byte_limit`; неверный ContentLength, chunk overflow, unknown magic, ftyp boundaries, ID3 и MP3 malformed. HTTP fixture с настоящим SDK доказывает bounded transport. Ни ffprobe, ни расширения signer. Risk: ложный MIME/огромное чтение.

### TASK-3 — ADR-001, FR-3, FR-4, FR-6, NFR-2, NFR-4: поток и route
Files: `apps/web/src/server/guest-file.ts`, `apps/web/src/server/original-runtime.ts`, `apps/web/src/app/api/videos/[videoId]/original/route.ts`, `apps/web/src/server/original-file.ts`, `tests/original-file.test.ts`. Depends on: TASK-1, TASK-2. SPARC: refinement. Добавить optional header deadline в streamGuestFile, export `StorageStreamError`, оставить старые вызовы без options. Связать runtime через `originalRoute`, export GET/HEAD, dynamic/no-store. Sign server-internal безfilename. Header whitelist, Content-Disposition/MIME original, request abort/backpressure, Range206/416, HEADбезbody. Done: `original_stream_survives_header_deadline_and_aborts`, `original_keeps_s3_capability_server_side`, HTTP streaming tests, исходные guest/signer tests. Risk:120с cutoff/SSRF/redirect/cache leak; после headers очищать только header timer, не disconnect signal.

OT-TEST-1: `original_stream_survives_header_deadline_and_aborts` — один настоящий125с loopback/native-fetch case с timeout150000мс, ≤1024bytes на response, marker после125000мс отheaders и downstream abort→upstream close≤2000мс. Legacy consumer безoptions идёт параллельно в том же case и должен оборваться около120с доmarker; ошибочно сохранённый120с signal у original даёт RED. Не использовать fake timers/mock fetch или замену ожидания16секундами. Короткие sibling tests проверяют header timeout и body.cancel. Run на stable revision с владельцем процесса доterminaloutcome, фиксировать elapsed; default testTimeout15000 не повышать глобально.

### TASK-4 — ADR-001, FR-1, FR-2, FR-5, FR-6, FR-7, NFR-3: согласованный UI
Files: `apps/web/src/app/videos/[videoId]/OriginalSource.tsx`, `apps/web/src/app/videos/[videoId]/OriginalSource.module.css`, `apps/web/src/app/videos/[videoId]/VideoDetail.tsx`, `tests/browser/original-video-access.test.ts`. Depends on: TASK-3 и все code-entry gates; owner approval states.html SHA из01 получен, доказательство — `ui-approval.md`. SPARC: refinement. OriginalSource даёт строку и существующий viewer slot; VideoDetail сохраняет DOM/selectedClipId/contextHost/гостевые формы. Pause обоих направлений, unload source, keyboard/focus, native audio/video без autoplay. Metadata один раз/mount, явныйretry, один переход из uploading; не внутри5сpoll. Download anchor. Error-retry ограничен, currentTime/paused сохраняются при повторной загрузке media; нет bearer URL refresh. Done: `original_preserves_clip_selection_and_single_media` и state matrix loading/incomplete/missing/error/audio/unsupported на390/1440 dark/light, actual DOM screenshots и geometry против approved HTML. Risk: скрытый звук, remount clips, stale response. Существующие mutation anchors VideoDetail не менять.

OQ-QUALITY-1: добавить `original_handles_zero_clips_and_late_results` с rendering+ready+clips[], существующим empty-state, нулём фиктивных selection, back focus на source trigger и последующим приходом первых clips через текущий poll. OQ-QUALITY-2: `original_media_error_ready_does_not_restart` воспроизводит обрыв настоящего native media и единственную проверку metadata; ready оставляет честный error в том же viewer и допускает только явное повторное Смотреть/Слушать. Таблица05 задаёт incomplete/missing/error/HTTP404/HTTP429/malformed; несколько events одной попытки не вызывают дополнительные refresh/reload/play. Добавить no-clips/playback-error к visual state matrix, следовать согласованному8-state пакету из `ui-approval.md`. Новых controls/панелей нет.

### TASK-5 — ADR-001, FR-3, FR-6, FR-7, NFR-5: реальные границы
Files: `tests/original-cloudru.test.ts`, `tests/browser/original-video-access.test.ts`, `tests/original-file.integration.test.ts`. Depends on: TASK-3, TASK-4. SPARC: completion. Existing `liveS3Environment` с binding client+signingClient и `receipt`, tests/site/original_<uuid>/; синтетический малый MP4/audio и безопасные boundedreads, cleanup только созданных keys. Real200/206/416/Content-Range/bytes/disposition/MIME; signer ≤900 с и новый Range после короткого test-only notAfter (например, 2 с) с настоящим истечением первой подписи; следующий route request подписывается заново. Не ждать 900 с и не подменять реальный provider фиктивным ответом. Native Chromium MP4/audio, MIME fallback, seek, canvas.getImageData (`original_source_is_canvas_readable`), download hash; WebKit если установлен. Done: `original_cloudru_range_download_contract` на Cloud.ru, receipt без URL/secrets. Risk: MinIO ложноположительное доказательство; credential absence означает NOT-RUN, не PASS/skip.

### TASK-6 — ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5: проверка и передача
Files: перечисленные tests; feature completion/evidence документы вне runtime targets. Depends on: TASK-5. SPARC: completion. Стабильная ревизия, один общий прогон, independent cross-model code/QE, code/spec anti-drift с exact SHA и командами. Архитектуру Astra проверяет другая модель согласно model-matrix, код Sol проверяет fresh Astra. Готовые clip/guest/showcase/upload/retention пути сверяются. После локальных исправлений только затронутые suites; новый общий прогон лишь при названном новом риске. Done: реальные terminal outcomes всех обязательных команд, отсутствие незакрытых серьёзных review conditions и owner's manual test acceptance перед Cloud.ru. Commit/push/test deployment исполняет root.

Обнаруженные при исполнении baseline blockers в `tests/browser/ux-simplification.test.ts`: виртуальный `ux-nav` не предоставлял уже используемый usePathname; геометрический locator искал «Хранится до», тогда как принятый неизменённый ClipCard уже пишет «Доступно до». Оба несовпадения подтверждены на `git show bb1184…`, второй также независимо проверен Chromium/WebKit. Root разрешает только совместимость существующего navigation stub и актуализацию этого locator до действующего текста/DOM-контракта после обновлённых K2/admission/context. Порядок title/player/download/retention/More, identity media node, прочие assertions/guards, auth runtime и остальные read-only цели не менять; не заменять отказ на skip/catch. Повторить затронутые Chromium/WebKit кейсы; предыдущие interrupted/failed исходы сохранить как NOT-PASS, не product regression.

### Единый repair после SOURCE R1

Независимый `qe-primary` реально проверил frozen revision `98d1ce14c1631fa3c2b1731b967fc86fa341992e9f60523b15d5bf48f4f40000`, nonce `c5a4100f-72f7-4b66-89c3-112ce653d94f`; собственная receipt сохраняет четыре HIGH structural OQ-SOURCE-1…4. Canonical native evaluate завершился exit1/unresolved, rounds=1; это не успешный QE. Требования/ADR/approved mockups не меняются: исправляется несоблюдение прежних состояний, no-autoplay, читаемости и обязательного regression gate.

Единый batch в прежних 17 editable целях: OriginalSource.tsx — bounded metadata recheck после настоящего initial HTTP503/404/429, не определять codec только по MediaError4; failed-attempt resume не должен переживать recovery→Pause→Back→Watch и запускать новый autoplay. OriginalSource.module.css — читаемые light/dark status/audio тексты по утверждённым Cabinet токенам/геометрии. Browser tests — реальные различающие оракулы этих трёх случаев; ux-simplification — только устаревший locator с сохранением assertions. Оригинальная header/body lifecycle и v1 helper не меняются. После ремонта — affected browser + единственный ещё не выполненный общий npm test, актуальные lint/typecheck/build по изменённым bytes; прежний real125s не выдавать за полный новый общий прогон.

Автор составляет настоящий rework object `{addressed,changedScope,classification,delta,evidence,newRisks}` по четырём исходным IDs и всей затронутой дельте; не пишет за проверяющего. Root выполняет native begin-repair по фактическому новому frozen снимку, затем originating reviewer независимо проверяет собственные условия, дельту и риски. Новые условные IDs/обход истории/receipt reset вместо сохранения OQ-SOURCE-1…4 запрещены. Пока они не закрыты, commit приложения/поставка не объявляются готовыми.

### Закрытие выявленных baseline regression gates

Единственный общий прогон завершился FAIL: 166 файлов, 161 PASS/5 FAIL; 1761 проверка, 1750 PASS/11 FAIL, runner wall1276,243с. Все11 отказов воспроизведены на `git archive bb1184…` с теми же Node22/lock/env в изолированной копии: 10 unit +1 PostgreSQL integration; очистка завершена. Доказательство: private `author/repair-r2/common-failure-matrix.json`. Это не новые отказы Original и не повод переименовать общий FAIL в PASS.

Принятый внешний policy input: `features/clip-retention-policy/01_requirements.md`, SHA256 `272018e4f70f1495839a5faf3ca7f5a87285eb7200f04aab7c0c6faf795a0873` на выбранном baseline; это ссылка на требование, не code target. Native admission не разрешает circular feature-artifact targets; требование сохранено как exact pin, код константы/схемы измеряется отдельно.

Корректирующая дельта шести файлов: `packages/shared/src/enums.ts` — только три недостающие записи SQL_ENUMS по принятой миграции028; новых exports/readers/состояний/DDL нет. Сам catch-all guard в `tests/enums.test.ts` корректен: его legacy-исключения не расширять; добавить различающие отрицательные мутации трёх CHECK. `tests/clip-card.test.ts` — положительная SSR-фикстура с действительным будущим сроком без глобального fake clock. `tests/landing-demo.test.ts` и `tests/landing-demo.integration.test.ts` — фактически согласованные7 суток из `features/clip-retention-policy/01_requirements.md` FR1/2/8, точная граница и соседний expired clip; post-migration fixture включает реальный ready_at/provenance. Старый wire assertion signer обновляется только вместе с исполняемым доказательством передачи абсолютного deadline и TTL≤900. `tests/clip-music-review-fixes.test.ts` — актуальные SELECT/lock/retention fixture shapes с прежним порядком/отказами.

Существующие бизнес-модули ClipCard, retention, signer, music, schema не изменять ради тестов. SQL_ENUMS — восстановление полноты реестра принятой схемы, не новая бизнес-логика: поиск потребителей в apps/packages/scripts нашёл только декларацию, тест читает её напрямую. Роутинг остаётся M10: файловая размерность3 сохраняется при23 editable; домены2/интеграции1/breaking1/модели1/cross-cutting2 прежние. Новых пользовательских требований/OpenSpec delta и UI-макетов нет; исторический00 остаётся прежним reviewed design snapshot. Текущая authority/инвентарь задаётся этим06 и новым K2/admission перед шестью W-правками.

Проверка после этой дельты: все пять ранее падавших suites на финальных bytes, существующие negative/mutation guards, actual UI после узкого устранения гонки metadata recheck↔5s poll, shared/web compile/typecheck/lint. Общий1276с FAIL сохраняется со своим snapshot; новые результаты — отдельные affected проверки, а не «полный новый зелёный прогон». Второй общий прогон из-за fixtures/metadata-only +локального UI ремонта не нужен без нового широкого риска. В итоговой трассе сопоставить неизменённые production hashes, прежние161 passed suites и исправленные пять, перечислить ограничения. Независимый qe-primary проверяет весь расширенный diff и прежние четыре условия на новом native снимке, не только UI.

## Dependency order
QCSD R2 closed + фактическое UI approval → Step3/3.5/5/6 и K1/K2 + current target/context admission → root code GO → TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6. TASK-4 сохраняет зависимость от TASK-3 и всех code-entry gates; ожидание согласования UI завершено.

Владелец ответил «Да, реализовать эти состояния» 11.11.2026 в 16:33:19.977685 UTC на вопрос `call_7d57dd079fe542ad83e6ac0fd1f6170a`; [ui-approval.md](ui-approval.md) фиксирует разрешение для `states.html` SHA256 `6521026a864be1ca323cd082ecb402360062bd12b65a1e5fae71ab67ffe10953`, опубликованного в main `2b61adeea68f9fa7d316969db7738e5754dec8f8`. Normal «Смотреть/Скачать» одобрены ранее. Root GO после остальных gates может охватывать TASK-4; это approval не заменяет тесты, QE или ручную приёмку поставки.

## Parallel groups
Три независимые R2 core-роли завершили проверку frozen документов. Implementation — один автор Sol; после стабилизации независимые review/read-only release preparation допустимы параллельно. Изменения общего source последовательные; во время проверок source заморожен. Zoom реализует свои файлы в другом worktree; import sourceRevision/route contract согласуется до интеграции.

## Checkpoints
Root фиксирует настоящие Step3/3.5/5/6 через supported dz; финальные K1/K2, current target/context admission и явный scope GO предшествуют Step7. Далее Step8 с independent code/QE и anti-drift. Этот план не записывает checkpoint, K1/K2 или code GO; их выполняет root по окончательным bytes. При изменении app baseline/контрактов до кода root повторяет dependency recheck и обновляет допуск; прежний PASS не переносится на изменившийся scope.

Фактический статус от root: canonical pinned K1 завершён exit 0 — 13 имён свободны, просмотрены 486 файлов. Ранние вызовы через старый worktree node_modules дали NOT-ESTABLISHED/exit 2 и не приняты как PASS. K2 прошёл предыдущую редакцию06; root повторяет его на SHA этой редакции. Финальный планировщик gates не запускал.

Перед K1: `npm run dz -- recall "original video source same-origin Range ownership MIME" --json --limit 8 --project /home/clipmkr`, Node22 и pinned dz, прочитать результат. Коды0 с[] не являются извлечённым уроком. Назначение автора/проверяющих и UI authority хранитroot.

K1, после закрытойQCSD и финализации плана, из worktree:

```sh
npm run dz -- name-check --module original-file --export createOriginalFileHandler,OriginalFileDependencies,OriginalSourceMetadata
npm run dz -- name-check --module original-source --export originalSourceRevision
npm run dz -- name-check --module original-runtime --export originalRoute
npm run dz -- name-check --module OriginalSource --export OriginalSource
npm run dz -- name-check --export detectOriginalMedia,OriginalMediaType,StorageStreamError
node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/original-video-access --tier=M --require-requirements
```

Сначала сверить supported name-check options через `--help`; exit2 не PASS. Уже существующие getObjectBytes/streamGuestFile/isAllowedMedia/GET/HEAD не объявляются новыми именами; новые names кодера сверх этого списка требуют K1 до записи. Challenge advisory — только реальный fresh reviewer/доступныйtool, не подмена авторским review.

Команды implementation verification при N5_ACCEPTANCE=1 после установки workspace dependencies закреплённым lockfile и Node22.23.4; secret env подготавливаетroot внеGit:

```sh
npm test -- tests/original-file.test.ts tests/original-file.integration.test.ts tests/original-media-type.test.ts
npm test -- tests/s3.test.ts tests/s3-public-endpoint.test.ts tests/storage-prefix.test.ts tests/guest-pack.test.ts tests/progress-screen.test.ts tests/trust-guards.test.ts tests/retention-policy.test.ts
npm test -- tests/original-cloudru.test.ts
npm test -- --config vitest.browser.config.ts tests/browser/original-video-access.test.ts tests/browser/ux-simplification.test.ts tests/browser/clip-preview-playback.test.ts
npm test
npm run typecheck
npm run lint
```

Первые четыре команды focused, последний npm test — единственный общий финальный regression на стабильной ревизии; lint/typecheck входят в тот же финальный gate. Browser excludes в обычном vitest.config.ts прочитаны: explicit browser config обязателен, default npm test browser не покрывает. Если upload/media truth table затронута, найти реальные upload suites и включить в focused round до общего. No-match/skip/нет DATABASE_URL/REDIS_URL/Cloud.ru credentials — NOT-RUN/FAIL с причиной, не зелёное доказательство. Тесты запускаются с сохранённой владеющей сессией до terminal result; исходники не редактировать во время прогона.

RealDB: отдельная *_test БД и уникальная schema через existing test-db/migrate; только synthetic accounts, неproduction signup. Cloud.ru: `N5_PREFIX_RUN_S3=1` и existing `N5_PREFIX_S3_*`/private receipt dir; `liveS3Environment` требует exact https://s3.cloud.ru и fenced prefixes. URL/credentials не печатать. При cleanuperror run неполный; сообщитьroot, не чистить чужие prefix.

## Risk assessment
HIGH IDOR→TASK-1 realDB; HIGH boundedness/header timeout/SSRF/cache→TASK-2/3 realHTTP; HIGH provider/CORS→TASK-5 realCloud/browser. MEDIUM MIME/codec→TASK-2/4; MEDIUM old DOM/focus/selection→TASK-4. R2 не выявил новых серьёзных design conditions. Остаточные риски из `reviews/qcsd-risk-r2.md` остаются обязательствами исполнения: upload gate/cleanup и отсутствие writes→TASK-1; секреты/безопасное имя и legacy совместимость→TASK-2/3/6; sourceRevision web/worker и browser boundary→TASK-1/6; ноль/поздние клипы и ready после media error→TASK-4; реальная proxy bandwidth/capacity→TASK-5/6 на тестовой поставке, не вывод из короткого fixture. Источник lifecycle/purge неизвестен, поэтому expiry UI отсутствует; это product honesty, не обещание вечного хранения. Механизм sourceRevision не защищает от внешней внепроцессной перезаписи S3 ключа; такая операция исключена из scope.

Budget estimate оставшейся работы отдельно: implementation60–90мин; checks+QE45–90мин; test delivery/owner acceptance отдельно. QCSD R2 завершён; эта финализация не запускает новый дизайн. Это оценка, не факт времени. Новый full-run допускается только по названному основанию. Отдельный standalonestreamservice/newOSS/DDL не нужны.

## Amendments
AM-1 (инженерное решение root 11.11.2026): прямой S3/browser bearer заменён same-origin для Zoom canvas при прежнем UX просмотра и скачивания. Confirmation: canvas остаётся origin-clean → test `original_source_is_canvas_readable` in `tests/browser/original-video-access.test.ts` (fails if reverted).

AM-2 (чтение существующего исходного кода): существующий getObjectBytes локально не ограничен; optional maxBytes защищает original. Confirmation: слишком большой upstream отменяется до полного накопления → test `original_sniff_stops_at_byte_limit` in `tests/original-file.test.ts` (fails if reverted).

AM-3 (чтение существующего исходного кода): существующий stream deadline 120 с не подходит длинному source; optional header deadline сохраняет прежний default. Confirmation: body передаётся после header deadline и отменяется клиентом → test `original_stream_survives_header_deadline_and_aborts` in `tests/original-file.test.ts` (fails if reverted).

R1 сохранил три структурных условия; R2 originating roles независимо проверили их исправление в дизайне, root evaluate closed. Тестовые обязательства AM-5/AM-6/AM-7 сохраняются полностью; closure не означает их прохождение или разрешение UI.

AM-4 (инженерное решение root 11.11.2026 до QCSD): канонический helper помещён в backend-only shared server leaf, чтобы web и Zoom worker использовали одну v1 формулу без worker→web импорта или browser barrel export. Confirmation: canonical leaf сохраняет фиксированный digest и реагирует только на upload identity → test `original_revision_tracks_upload_identity` in `tests/original-file.test.ts` (fails if reverted).

AM-5 (OQ-QUALITY-1, qcsd-quality r1): zero-clips source переиспользует существующий clip-grid slot, back показывает current empty-state и возвращает focus; первые clips приходят через прежний poll без фиктивного выбора. Confirmation: ноль/появившиеся clips сохраняют корректные selection/focus/DOM → test `original_handles_zero_clips_and_late_results` in `tests/browser/original-video-access.test.ts` (fails if reverted).

AM-6 (OQ-QUALITY-2, qcsd-quality r1): ready metadata после media error не означает playback success; один refresh и explicit retry через прежнее Смотреть/Слушать, полная таблица иных ответов05. Confirmation: ready не стирает ошибку и не перезапускает media автоматически → test `original_media_error_ready_does_not_restart` in `tests/browser/original-video-access.test.ts` (fails if reverted).

AM-7 (OT-TEST-1, qcsd-testability r1): точный125с native loopback test с timeout150с, ≤1KiB/response, downstream abort и legacy120с negative control в одном wall-clock окне. Confirmation: оставшийся общий120с timeout ломает позднее чтение original → test `original_stream_survives_header_deadline_and_aborts` in `tests/original-file.test.ts` (fails if reverted).

AM-8 (baseline browser blockers TASK-6; OQ-SOURCE-4): fixture предоставляет уже используемый usePathname; retention locator соответствует принятому «Доступно до», без изменения продукта/порядка/identity assertions. Confirmation: настоящий mounted entry исполняет прежние проверки → test `primary_path_and_context / hidden_invalid_reveals_and_focuses` in `tests/browser/ux-simplification.test.ts`; обязательная геометрия title/player/download/retention/More и stable media → test `approved mobile title player download retention More order with one stable media node` in `tests/browser/ux-simplification.test.ts` (возврат старого locator/экспорта даёт RED в Chromium/WebKit; skip/no-match не прохождение).

AM-9 (OQ-SOURCE-1): native MediaError4 не доказывает codec failure; initial HTTP503/404/429 получает один metadata recheck и таблицу05, без auto retry/play. Confirmation: настоящий native initial HTTP отказ не становится неподтверждённым codec verdict → test `original_initial_http_error_rechecks_metadata_once` in `tests/browser/original-video-access.test.ts` (fails if code4 сразу unsupported; сохранить реальный unsupported сценарий).

AM-10 (OQ-SOURCE-2): resume time/paused ограничен текущим failed attempt/явным recovery; Pause и Back/clip selection не оставляют stale autoplay для нового Watch. Confirmation: настоящее media error→recovery→Pause→Back→Watch остаётся paused при сохранении позиции текущего recovery, одного слышимого media и selected DOM → test `original_recovery_reopen_stays_paused` in `tests/browser/original-video-access.test.ts` (fails if прежний resume.paused повторно запускает play).

AM-11 (OQ-SOURCE-3): status/error/unsupported/audio caption читаемы в обеих темах; использовать согласованные Cabinet токены без новых controls/layout. Confirmation: computed effective text/background contrast проверяет light/dark состояния → test `original_media_state_text_contrast` in `tests/browser/original-video-access.test.ts` (fails при near-black тексте на dark media frame; geometry-only/hover не заменяют проверку).

AM-12 (фактический baseline common gate): сохранить действительный catch-all SQL_ENUMS guard, восстановить только три пропущенные строки реестра028 и актуальные legacy fixtures, не скрывать ошибки в исключениях. Confirmation: намеренное искажение каждого retention CHECK ломает реальный guard → test `retention migration enums are exact and mutation sensitive` in `tests/enums.test.ts` (положительный полный guard и точные anchors должны быть наблюдаемы; skip/no-match не PASS).

AM-13 (тот же baseline gate, отдельная однозначная привязка signer): fake/public signer deadline не расширяется. Confirmation: ограничение абсолютного срока сохраняется → test `showcase forwards the absolute deadline to the canonical signer for file and thumbnail` in `tests/landing-demo.test.ts` (положительный полный guard и точные anchors должны быть наблюдаемы; skip/no-match не PASS).

## Измеряемые зависимости Step7/8

Editable authority:16 исходных targets TASK-1…5, один fixture fix TASK-6
`tests/browser/ux-simplification.test.ts` и шесть baseline corrections выше: всего23.
Все остальные объявленные цели — read-only semantic dependencies; писать в них нельзя.
Среди них все существующие SQL migrations, потому что catch-all enum guard читает
весь отсортированный каталог. Состав схемы не меняется. Ранее UX fixture был read-only;
обновлённая authority относится только к navigation stub
и retention locator по принятому тексту, не к ослаблению asserts/guards. Перечень21 baseline dependency в design snapshot
пересекается с5 исходными editable targets; число21 не означает21 дополнительный файл.
Итоговые counts подтверждаются свежими K2/admission, а не историческим32-path snapshot. Требования, ADR,
продуктовый UI и routing M10 не изменились. Исторический
post-Step6 snapshot сохраняет baseline до кода; эту инструментальную дельту
подтверждают свежие K2 и current target/context admission, а не старые receipts.

TWIN_NOT_A_TARGET: packages/db/tsconfig.json — независимая неизменяемая конфигурация другого workspace; shared/tsconfig добавлен только read-only для backend leaf, конфигурации не редактируются.
TWIN_NOT_A_TARGET: packages/queue/tsconfig.json — независимая неизменяемая конфигурация другого workspace; shared/tsconfig добавлен только read-only для backend leaf, конфигурации не редактируются.
TWIN_NOT_A_TARGET: packages/s3/tsconfig.json — независимая неизменяемая конфигурация другого workspace; shared/tsconfig добавлен только read-only для backend leaf, конфигурации не редактируются.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/original-file.ts
- packages/shared/src/server/original-source.ts
- vitest.config.ts
- apps/web/src/server/original-runtime.ts
- apps/web/src/app/api/videos/[videoId]/original/route.ts
- apps/web/src/server/media-type.ts
- packages/s3/src/operations.ts
- apps/web/src/server/guest-file.ts
- apps/web/src/app/videos/[videoId]/OriginalSource.tsx
- apps/web/src/app/videos/[videoId]/OriginalSource.module.css
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- tests/original-file.test.ts
- tests/original-file.integration.test.ts
- tests/original-media-type.test.ts
- tests/browser/original-video-access.test.ts
- tests/original-cloudru.test.ts
- packages/shared/src/enums.ts
- tests/enums.test.ts
- tests/clip-card.test.ts
- tests/landing-demo.test.ts
- tests/landing-demo.integration.test.ts
- tests/clip-music-review-fixes.test.ts
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/server/clip-file.ts
- apps/web/src/server/retention.ts
- apps/web/src/server/screen-runtime.ts
- apps/web/src/server/upload-runtime.ts
- apps/web/src/server/video.ts
- packages/db/migrations/001_init.sql
- packages/s3/src/client.ts
- packages/s3/src/presign.ts
- packages/shared/package.json
- packages/shared/src/index.ts
- packages/shared/tsconfig.json
- scripts/test-retention-mutations.mjs
- tests/browser/ux-simplification.test.ts
- tests/fixtures/environment.ts
- vitest.browser.config.ts
- packages/db/migrations/002_growth_event_prefix.sql
- packages/db/migrations/003_ipv6_legacy_cleanup.sql
- packages/db/migrations/003_upload.sql
- packages/db/migrations/004_ipv6_prefix_masklen.sql
- packages/db/migrations/005_queue_probe.sql
- packages/db/migrations/006_transcription.sql
- packages/db/migrations/007_selection.sql
- packages/db/migrations/008_render.sql
- packages/db/migrations/009_short_link.sql
- packages/db/migrations/010_guest_pack.sql
- packages/db/migrations/011_partner.sql
- packages/db/migrations/012_retention.sql
- packages/db/migrations/013_watermark_geometry.sql
- packages/db/migrations/014_music.sql
- packages/db/migrations/015_teaser.sql
- packages/db/migrations/016_partner_fairness.sql
- packages/db/migrations/017_compaction.sql
- packages/db/migrations/018_clip_music.sql
- packages/db/migrations/019_music_skip_reason.sql
- packages/db/migrations/020_clip_cta.sql
- packages/db/migrations/021_payments.sql
- packages/db/migrations/022_credit_packages.sql
- packages/db/migrations/023_support_access.sql
- packages/db/migrations/024_partner_landing_dedup.sql
- packages/db/migrations/025_owner_unlimited.sql
- packages/db/migrations/026_blogger_policy.sql
- packages/db/migrations/027_payment_referral_snapshot.sql
- packages/db/migrations/028_clip_retention.sql
- packages/db/migrations/029_payment_receipt_snapshot.sql
- packages/db/migrations/030_payment_environments.sql
- packages/db/migrations/031_billing_notice.sql
- packages/shared/src/tariff.ts
- packages/shared/src/showcase.ts
- packages/db/src/plan.ts
- packages/db/src/render.ts
- apps/web/src/server/showcase-file.ts
- apps/web/src/server/short-link.ts
- apps/web/src/server/clip-music.ts
- apps/web/src/server/screen.ts
