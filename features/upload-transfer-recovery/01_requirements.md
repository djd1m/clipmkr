# Требования ограниченного продолжения передачи

Статус: proposed для архитектора/QC; код pending. Приоритетны AGENTS.md, core-cjm,
матрица моделей, явное согласование владельцем загрузочного пути 04.11.2026 и требование
использовать существующий clipmkr-stage-20261028 с сохранением данных.

### FR-1: Незавершённая запись не ведёт на просмотр
MUST. VideoList для uploading — не ссылка просмотра, даже после router.refresh кабинета;
ясно сообщает «Передача файла не завершена. Обработка ещё не началась». Показывает
инструкцию о сохранённой сессии/повторном выборе исходного файла в исходной вкладке.
Queued/done и другие серверные стадии сохраняют действующие ссылки.
AC: SSR/DOM uploading не содержит href /dashboard/videos/{id}; queued/done содержит.

### FR-2: Подтверждение ухода и ограниченная навигационная гарантия
MUST. На hashing/create/PUT/complete активная попытка защищена beforeunload и native confirm
для обычного same-tab anchor-перехода, включая Next Link/внешний anchor/клавиатуру.
Deny не abort и не блокирует PUT; accept синхронно отменяет локальную попытку/fence,
затем разрешает исходный переход. Modifier/middle-click, target=_blank, download и
hash-only ссылки не прекращают передачу. Штатный success push выполняется без guard.
Back/forward/native close не обещают всеобщей блокировки: проверяются unmount и bounded resume.
AC: `active_beforeunload_reload_dismiss_and_accept` после реальной пользовательской активации
удерживает hashing/create/PUT/complete: native reload даёт dialog type=beforeunload;
dismiss сохраняет документ/попытку, accept реально меняет document и оставляет bounded resume.
`inactive_and_confirmed_leave_have_no_extra_beforeunload`: после pause/accepted и подтверждённого
anchor нет лишнего диалога. Мутация `remove_beforeunload_registration` делает первый тест RED.
Synthetic dispatch и pause→reload этого не доказывают; Chromium/WebKit и native ограничения
отчитываются отдельно. Обычные anchor/Next переходы тоже проверяются реальной навигацией.

### FR-3: uploading независимо от давности не означает обработку
MUST. presentVideo всегда даёт для uploading no_response=false, stage_progress=null и
согласованное пояснение незавершённости; VideoDetail исключает uploading из локального
stale и показывает recovery-ссылку на /dashboard?upload=recovery#source-file без ID/key.
ProgressPanel для uploading не рисует progress/«Выполняется» или утверждение о живых байтах;
лишь сам активный Uploader знает свою фазу. Остальные stale-стадии сохраняются.
AC: now/+300001ms/+сутки и локальный таймер; queued/transcribing stale неизменны.

### FR-4: Строгая account-scoped session v2 и полная идентичность
MUST. Server dashboard передаёт accountScope=pageAccount() (UUID). Новый ключ storage
n5-upload-resume:v2:{accountScope}; значение version=2, accountScope, identityAlgorithm=sha256,
64 lowercase hex contentSha256, size, UUID key, immutable options, originalFilename;
videoId UUID и partSize появляются вместе после create; complete-ready parts допускаются
только как полный проверенный список с expected count. Ввод strict Zod, unknown fields/versions,
неверные типы, чужой scope, неверная CTA/части отвергаются без запросов.
MUST. Полный SHA-256 File до create/resume через @noble/hashes 2.4.0, bounded sequential chunks,
не metadata и не выборочная выборка. Те же байты с другим именем/датой — тот же upload;
разные байты при прежних метаданных — mismatch, никакого перезаписывания старой сессии.
MUST. Каждый video.create нового v2 клиента, включая refresh подписей, передаёт optional
`account_scope` UUID существующего create input, всегда равный сохранённому ожидаемому scope.
Сервер валидирует UUID (malformed→422) и сравнивает с authenticated account ДО transaction,
claim, квоты и любого S3. Несовпадение→409: ни video/слота/подписей, ни PUT/Complete/redirect,
ни перезаписи manifest; показать «Аккаунт изменился. Обновите страницу» и сохранить File.
Scope — только precondition, источник прав остаётся auth. Legacy без поля совместим;
Complete ownership по-прежнему 404. Отдельный client preflight не закрывает cookie TOCTOU.
AC: vectors/middle-byte/chunk/abort, same-scope, malformed UUID, legacy отсутствие поля;
`create_scope_mismatch_has_no_side_effects` проверяет 409 и ноль transaction/claim/quota/S3;
`stale_cookie_scope_blocks_create_and_refresh` — UI A + cookie B для key-only/с videoId v2
и refresh после 403; прежний manifest неизменён, fallback нет.

### FR-5: Явные intent и ограничение утраты восстановления
MUST. После mount валидная сессия показывает originalFilename и выбор исходного файла.
Выбор запускает только локальную проверку; совпадение открывает отдельное «Продолжить загрузку».
До этого клика create/PUT/Complete=0. Один контракт для pause в том же mount и remount:

| Фаза | Статус | Доступное основное действие |
|---|---|---|
| paused / ожидает File | «Передача приостановлена. Выберите исходный файл: {originalFilename}» | «Выбрать исходный файл» |
| hashing | «Проверяем выбранный файл» (локально, не передача) | «Отменить проверку» |
| readyResume | «Файл совпадает. Можно продолжить загрузку» | «Продолжить загрузку» — отдельный клик/Enter |
| transferring | «Передаём файл» | «Приостановить загрузку» |
| mismatch | «Выбран другой файл»; прежний manifest сохранён | Повторный выбор; отдельно «Начать новую загрузку» |
| storageBlocked | «Не удалось сохранить данные восстановления» | «Повторить сохранение» с тем же key |
| unknownComplete | «Результат завершения неизвестен. Сервер мог начать обработку» | Выбор/проверка File, затем отдельное продолжение |

Pause синхронно abort/fence и очищает выбранный File и native input.value=''; manifest остаётся.
После onChange File берётся локально, input.value немедленно сбрасывается: тот же путь снова
вызывает change. Перед picker сбрасывается прежняя проверенная selection; отмена picker
оставляет ожидание File без сети и без изменения manifest. Remount тоже требует выбор/hash.
AC: `pause_reselect_requires_separate_continue` через UI клики/клавиатуру проверяет тот же
native input/File, picker cancel, mismatch и нулевые сетевые counters до отдельного Continue.
При legacy n5-upload-resume, отсутствии/утрате/повреждении cache, чужом scope или mismatch
нет auto resume и auto fallback нового upload. Отдельное «Начать новую загрузку» объясняет:
прежняя запись может остаться незавершённой, новая расходует отдельный слот. Только это
явное действие разрешает новый key; старые серверные uploads не удаляются автоматически.
Утрата cache на обычном входе не может быть обнаружена достоверно: на форме есть общее
пояснение; recovery query intent усиливает сообщение, но не является полномочием.
AC: legacy не «обновляется» hash выбранного сейчас файла; missing storage не создаёт дубль.

### FR-6: Lifecycle fencing и durable manifest до Complete
MUST. AbortController + generation/mounted fence проверяются после каждого await и перед
побочным действием. Pause/accepted уход запрещают любые последующие новые запросы старой
попытки, включая hidden complete, redirect и очистку cache другой попытки. Идемпотентный
create/ListParts/uploadParts остаются прежними; immutable options/originalFilename/key из v2.
Перед первоначальным create и после create до первого PUT требуется успешная запись
v2 в sessionStorage с readback. До Complete обязательно durable сохранение full parts и
videoId/partSize; если запись не удалась — остановиться, явно предложить повтор сохранения/
завершения, не делать Complete. In-memory запись доступна только текущему mount, с честным
предупреждением; при восстановлении storage тот же key, не новый upload.
AC: set/readback failure на каждой границе, abort перед Complete, stale promise/unmount.

### FR-7: Повтор Complete и admitted
MUST. С сохранёнными v2 parts и проверенным File повторяет только прежний complete, без PUT/
нового create. HTTP success — acknowledgement, а не новая истинная стадия queued: redirect
ровно один раз на тот же video, актуальное состояние читает существующий screen/video.get.
Потеря ответа сохраняет manifest и возможность повтора; admitted transcribing/done/failed
не откатывается. Запущенный серверный Complete/обработка не отменяется клиентским abort:
сообщение «Результат завершения проверим при повторе», без обещания остановить сервер.
AC: late response, complete503, admitted ack, один переход, никакого cache clear при stale ответе.

### NFR-1: Переиспользование, безопасность и память
MUST. Прежние RPC/idempotency/multipart/S3 ListParts/complete/квоты/ownership. Никаких новых
DB-моделей/endpoint/server recovery/очередей/платных провайдеров. Существующий create input
узко расширяется optional account_scope по FR-4; прежнее «API не меняется» отменено. Единственная dependency — точная
@noble/hashes 2.4.0 в apps/web и общий lock. Chunk=4MiB, чтение последовательно, максимум
один chunk in flight; yield между chunks и signal-check, никаких whole-file arrayBuffer.
Hash — клиентская защита от ошибки выбора, не серверная аттестация. Session не содержит
signed URLs/токены/File/байты; внутренние account/video UUID не журналируются публично.
AC: bounded reads, abort, Node22/build/browser bundle; серверные права не зависят от hash.

### NFR-2: Проверки интерфейса и честная доказательность
MUST. Обе темы, Chromium/WebKit, keyboard/touch, 320/375/390/768/1440, 200%, readable status.
Не менять рабочую workspace-композицию/ключи ради guard; Uploader один и не remount на
переключении вида. Existing options/CTA/music/teaser/compact сохраняются в строгом v2.
Unit/browser fixtures не подменяют опубликованный Next/S3/CORS/полный core-cjm.
MUST. File input связан label/htmlFor с «Исходный файл», инструкция и ошибка — aria-describedby,
ошибка ещё aria-invalid=true. Сохраняемый role=status aria-live=polite aria-atomic=true объявляет
hashing/readyResume/paused/unknownComplete один раз на смену фазы; ошибка mismatch/storageBlocked
объявляется role=alert без дублирования в status. Кнопки имеют указанные различимые русские имена.
После Pause/отмены hash/отмены picker фокус на «Выбрать исходный файл»; после hash-match на
«Продолжить загрузку»; mismatch — на выборе File; storageBlocked — на «Повторить сохранение»;
unknownComplete — на выборе File с описанием неизвестного итога. Это одно перемещение при
исчезновении/отключении активного control. Обновления процентов hash/PUT фокус не меняют.
Recovery anchor ведёт к #source-file, фокусирует доступный File control с видимой инструкцией.
AC: `keyboard_recovery_focus_and_live_status` в Chromium/WebKit через Tab/Enter/Space проходит
pause→reselect→ready→Continue и mismatch/storageBlocked/unknownComplete; проверяет activeElement
(не body/disabled), имена/описания, status/alert тексты/роли и неизменный focus на progress ticks.
Responsive rules/обе темы/200% и опубликованные переходы с SHA проверяются отдельно; DOM live
regions не выдаются за полноценный ручной screen-reader прогон.

### NFR-3: Существующий стенд и порядок выпуска
MUST. Единственная тестовая среда — существующий clipmkr-stage-20261028 на рабочем VPS.
Сохранить DB/Redis volumes, accounts/media/jobs и config; не создавать новый стек/пустые DB,
не делать down -v/reset/seed на пользовательской БД. S-исправление в main 12b2e17577fcabf923f37b8814046357fd12b78a (source совпадает с 9b8b043) — отдельная зависимость,
не повторять его код. Публичный HTTPS stage URL пока неизвестен/DNS не решён: stage E2E
и выдача ссылки pending до проверки доступа/TLS/origin/CORS; адрес не выдумывается.
После QC/review — stage apply/E2E → ссылка/инструкция → ручная приёмка → только затем
тот же артефакт Cloud.ru; production/DNS по отдельному разрешению.

Вне scope: полный 8-screen redesign, server-owned recovery при потере cache, дедуп по hash
на сервере, lease между вкладками, автозагрузка без File, новые деньги/роли/квоты, workspace
предпочтения. Без дублей означает прежний video/key/списание/logical job при штатном resume;
совпадающие in-flight PUT двух вкладок без lease не исключаются.
