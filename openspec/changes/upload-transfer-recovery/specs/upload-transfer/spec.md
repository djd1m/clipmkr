## MODIFIED Requirements

### Requirement: Ограниченная восстанавливаемая передача

Система MUST различать неполную browser передачу и серверную обработку. В исходной вкладке
с valid account-scoped session v2 и повторно выбранным File система MUST продолжать прежний
key/video/multipart, проверив SHA-256 всех байтов. Полная утрата metadata не является
поддержанным server recovery; новая запись разрешается только явным намерением пользователя.

#### Scenario: Тот же контент с иным именем
- **GIVEN** часть upload принята, valid session v2 сохраняет hash/size/key/options
- **WHEN** пользователь выбирает те же байты с другим именем/mtime
- **THEN** сначала выполняется только локальная проверка, показано readyResume, сеть=0
- **WHEN** затем пользователь отдельно нажимает «Продолжить загрузку»
- **THEN** используется прежний key/video_id/options/originalFilename и ListParts
- **AND** передаются только недостающие подтверждённым сервером части

#### Scenario: Коллизия метаданных
- **GIVEN** новый файл имеет прежние name/size/mtime, но другой средний байт
- **WHEN** вычислен полный SHA-256
- **THEN** продолжение отвергнуто; старый cache/parts не перезаписаны
- **AND** нет auto create/PUT/Complete или нового key

#### Scenario: Legacy или данные утрачены
- **GIVEN** legacy fingerprint-only cache, invalid/foreign/unknown-version v2 либо cache отсутствует
- **WHEN** открыта форма/recovery intent и выбран файл
- **THEN** отображено ограничение, нет автоматического продолжения или скрытого нового upload
- **AND** legacy не мигрирует приписыванием hash выбранного сейчас файла

#### Scenario: Явная новая загрузка
- **GIVEN** продолжение недоступно либо выбран другой контент
- **WHEN** пользователь выбирает отдельное действие новой загрузки после пояснения о слоте
- **THEN** новый key появляется только для этого действия, старый server upload не удаляется

#### Scenario: Pause, повтор того же native file input и отмена picker
- **GIVEN** виден originalFilename прежней session и пользователь нажал Pause
- **THEN** File и input.value очищены, manifest сохранён
- **WHEN** он повторно выбирает тот же файл
- **THEN** onChange захватывает File и сбрасывает input.value; hash не начинает сеть, требуется отдельный Continue
- **AND** открытие picker сбрасывает прежнюю verified selection; cancel оставляет ожидание File без сети и изменения manifest
- **AND** mismatch сохраняет прежнюю session, предлагает повторный выбор и отдельно новую загрузку

### Requirement: Expected scope существующего create

Существующий create input MUST принять optional account_scope UUID. Новый v2 клиент MUST
отправлять expected scope при каждом create, включая refresh подписей. Сервер MUST сравнить
с authenticated account ДО transaction/claim/quota/S3. Это узкое API amendment без нового
endpoint/DB. Auth остаётся источником прав; client preflight не исключает cookie TOCTOU.

#### Scenario: Старая вкладка A и новая auth-cookie B
- **GIVEN** UI/accountScope=A и valid v2 key-only либо с videoId, cookie уже B
- **WHEN** выполняется create либо refresh после403 с account_scope=A
- **THEN** сервер отвечает409 до transaction/claim/quota/S3, без video/слота/подписей
- **AND** клиент сохраняет File/manifest, просит обновить страницу; нет fallback/PUT/Complete/redirect

#### Scenario: Валидация и совместимость scope
- **GIVEN** существующий create input
- **WHEN** account_scope malformed
- **THEN** ответ422 до побочных действий
- **AND** same-scope и legacy без поля сохраняют прежний контракт, Complete ownership чужого video остаётся404

### Requirement: Строгий scoped manifest и durable границы

Session v2 MUST проверять полный schema/account scope/options/server receipt/полный ordered
manifest. До create, первого PUT и Complete соответствующие данные MUST быть сохранены
и прочитаны обратно; отказ storage MUST запрещать следующий network шаг и давать явный retry
того же key в текущем mount. Никаких secret URLs/File/байтов в cache.

#### Scenario: Storage failure перед Complete
- **GIVEN** PUT завершены и full parts находятся в памяти
- **WHEN** setItem/readback не подтверждает valid manifest
- **THEN** Complete не отправлен; пользователь видит ограничение и повтор сохранения
- **AND** после успешного save/readback Complete использует прежние video_id/parts

#### Scenario: Смена аккаунта и поздний ответ
- **GIVEN** прежняя попытка другого scope ещё ожидает ответ
- **WHEN** account prop/generation изменились либо Uploader размонтирован
- **THEN** прежний ответ не меняет UI/cache, не redirect и не запускает новые requests

### Requirement: Native guard без remount и скрытого завершения

При активной локальной hash/create/PUT/Complete попытке обычный same-tab anchor переход MUST
запрашивать подтверждение, close/reload MUST использовать beforeunload. Deny MUST сохранять
живой PUT; accept MUST fence/abort локальную попытку до ухода. После abort не инициируются
новые Complete/PUT/redirect. Already sent server Complete не отменяется клиентским abort.

#### Scenario: Отказ от ухода
- **GIVEN** PUT удерживается сервером и пользователь нажал обычный Link/anchor клавиатурой
- **WHEN** native confirm отклонён
- **THEN** URL/компонент/попытка остаются, PUT завершается в прежнем upload

#### Scenario: Подтверждённый уход
- **GIVEN** await create либо PUT ещё не завершён
- **WHEN** пользователь подтверждает уход, затем приходит старый ответ
- **THEN** локальная попытка отменена; не возникает hidden Complete/redirect/cache clear
- **AND** возврат требует valid session v2 и повторного выбора исходного File

#### Scenario: Настоящий active reload и cleanup guard
- **GIVEN** после реальной user activation удерживается hash/create/PUT/Complete
- **WHEN** reload активного документа вызывает native dialog type=beforeunload
- **THEN** dismiss сохраняет document marker/URL/attempt и продолжение; accept меняет document/remount с bounded manifest
- **AND** после pause/accepted/confirm-accepted anchor нет лишнего beforeunload (у anchor ровно один confirm)
- **AND** `active_beforeunload_reload_dismiss_and_accept` становится RED при `remove_beforeunload_registration`; synthetic/paused reload не являются positive oracle, engine ограничения указаны отдельно

#### Scenario: Complete уже отправлен
- **GIVEN** сервер мог принять Complete, но клиент не знает итог
- **WHEN** пользователь прерывает ожидание/уходит
- **THEN** UI не обещает остановку processing; сохранённый manifest допускает явный повтор

#### Scenario: Новая вкладка, modifier и history
- **GIVEN** активная передача
- **WHEN** ссылка открывается modifier/middle-click/target blank/download/hash-only
- **THEN** исходный PUT не прекращается
- **AND** back/forward проверяется через фактический unmount/remount и bounded resume, без обещания полной блокировки history

### Requirement: uploading достоверен независимо updated_at

VideoList MUST NOT делать uploading ссылкой просмотра. Server presenter и local timer
MUST исключать uploading из stale processing; detail MUST объяснять незавершённость,
не показывать active progress и давать путь к форме. Другие processing стадии сохраняются.

#### Scenario: Обновление списка и старая запись
- **GIVEN** uploading с возрастом updated_at от нуля до суток и refresh списка
- **WHEN** показаны список/деталь
- **THEN** нет detail Link из списка/«обработка продолжается»/фиктивного progress
- **AND** видна инструкция о сохранённой сессии и исходном файле

### Requirement: Повтор принятого Complete не создаёт новую обработку

HTTP acknowledgement MUST NOT откатывать фактическую server stage в queued. При сохранённом
full manifest и verified File повтор MUST использовать прежний Complete без PUT/create;
success снимает guard и ведёт на ту же запись ровно один раз. Count/HEAD целостность
обеспечивает отдельное изменение multipart-completion-integrity в main12b2e17577fcabf923f37b8814046357fd12b78a,
source-bound к авторскому SHA9b8b043 (точные source digests в feature00).

#### Scenario: Потерянный ответ и уже admitted
- **GIVEN** Complete принят, HTTP потерян, server video уже transcribing/done/failed
- **WHEN** пользователь явно повторяет завершение по сохранённому manifest
- **THEN** admitted признаётся существующим server путём, нет новой записи/квоты/logical job
- **AND** экран читает фактическое состояние и не назначает queued из acknowledgement

#### Scenario: Объект склеен, full manifest утрачен
- **GIVEN** browser metadata утрачена и bounded create/ListParts не восстанавливает объект
- **WHEN** пользователь возвращается
- **THEN** показан ограниченный исход без обещания server recovery и без авто нового upload

### Requirement: Динамическая доступность recovery

File input MUST иметь label, связанную инструкцию/ошибку и aria-invalid при ошибке.
Persistent polite atomic role=status MUST объявлять hashing/readyResume/paused/unknownComplete;
mismatch/storageBlocked MUST иметь role=alert без дубля. Все русские действия доступны Tab/
Enter/Space. После Pause/hash cancel/picker cancel focus MUST быть на выборе File; hash-match —
Continue; mismatch/unknownComplete — выбор File; storageBlocked — retry save. При progress ticks
фокус MUST сохраняться. Recovery anchor MUST фокусировать #source-file с видимой инструкцией.

#### Scenario: Полный keyboard recovery
- **GIVEN** keyboard пользователь идёт pause→reselect→ready→отдельный Continue в Chromium/WebKit
- **THEN** `keyboard_recovery_focus_and_live_status` проверяет activeElement не body/disabled, имена/описания/status/alert
- **AND** ветви mismatch/storageBlocked/unknownComplete имеют указанный focus; hash/PUT ticks его не меняют
- **AND** обе темы/размеры/200% проверяются отдельно существующим responsive прибором
