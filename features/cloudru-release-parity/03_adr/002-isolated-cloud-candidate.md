# ADR-002: сохранение существующих непустых тестовых копий

Status: proposed; revision pending focused QCSD; production cutover исключён.
Дата: 03.11.2026. Требования FR-2, FR-4, FR-5, FR-7.

## Context

Inventory: Cloud содержит 3 аккаунта, 0 media/payments, journal 26. Site-test —
существующий n5 test на сервере сайта: 5 аккаунтов, 4 видео, 10 клипов,
6 платежей, реферальные данные, journal 28 и общий production bucket.
Localdevstage на controller исключён из целей. ВСЕ данные двух выбранных копий
сохраняются. Запуск web включает фоновых писателей, поэтому SDK namespace должен
быть готов до старта. Нынешний общий key сохраняет production-права по owner
exception ADR-003. Пустота Cloud не переносится на site.

Первый проект с параллельным cookie-маршрутом признан сложным для реферальных
переходов, payment return и независимых браузерных контекстов. До реализации
решение пересмотрено по условиям независимого QCSD.

## Decision drivers

Сохранение данных, отсутствие второго пользовательского маршрута на одном origin,
минимум новых компонентов, предсказуемые ресурсы и настоящий публичный E2E.

## Considered options

| Вариант | Преимущества | Ограничения |
|---|---|---|
| Обновить существующую тестовую копию с её БД | Сохраняет аккаунты и обычные ссылки, меньше ресурсов | Нужны backup/restore и проверяемая совместимость миграций |
| Параллельный project и cookie выбора backend | Прежняя версия продолжает работать | Два auth/cache контекста на origin, сложнее referral и callback |
| Новый hostname/project | Ясная browser-изоляция | Дополнительный DNS и ресурсы; не решает сохранение уже существующего тестового медиа |

## Decision

Обновить только `cloud-c` и `site-test` по SSH. Независимые backup/restore уже
получены. Root переснял site sourceIdentity/live account SHA/full journal и сверил
с реально восстановленным test.dump: 5 accounts/28 migrations match. Этот binding
входит в текущий design, localstage исключён. До apply проверить drift и дополнить
baseline существенными строками ВСЕХ video/clip/payment/referral/credit связей.
Snapshot-derived baseline сверяется с тем же restore; свежая live сверка проверяет
drift. Несовпадение или несвязанный source требует нового backup/restore/reconcile.

Общий bucket и нынешний production-wide key разрешены owner exception ADR-003:
tests/cloud/ и tests/site/ ограничиваются только кодом/SDK. Новых key/policy/IAM
proof/403 нет. Не требовать bucket inequality и пустых S3-ссылок site.
По явному решению владельца 03.11.2026 «Сохранить все существующие данные n5»
составить приватный DB-whitelist всех referenced objects существующей site-test DB,
включая реальные пользовательские загрузки (source, clips, thumbnails и прочие
найденные storage fields). Синтетическое происхождение не является условием.
Связать logical key, канонического владельца и точную source DB, size/SHA-256
и destination. Приватная квитанция фиксирует фактическое решение владельца;
она не создаёт задним числом историческую synthetic provenance.
Не копировать bucket целиком и не объявлять произвольную production-ссылку тестовой.
Неопределённая принадлежность/отсутствующий объект/конфликт destination — BLOCKED.

Для первого непустого site-перехода используется `kind: "legacy-preserved"`.
Data evidence содержит `preservationApprovalPath` и `preservationApprovalSha256`:
внешний owned regular file `0600` в приватном каталоге, без symlink. Квитанция
схемы `clipmkr-legacy-preservation-1` связывает decision
`preserve-all-existing-site-test-data`, непустую ссылку на реальную инструкцию,
target `site-test`, application project, полную sourceIdentity, storageBucket,
destinationPrefix `tests/site/` и objectWhitelistSha256. Хеш вычисляется SHA-256
от stable JSON массива, отсортированного по logicalKey; в каждой строке строго
logicalKey/accountId/videoId/clipId/ownershipEvidence/sourceSize/sourceSha256/
destinationKey. Совпадение квитанции и фактического whitelist обязательно;
source/destination hashes и originalShaAfter проверяются отдельно. Файл служит
операторской привязкой решения и объёма переноса, не аутентификацией владельца.

Первый legacy site-переход требует legacy-preserved у всех объектов и проверяет
квитанцию до staging/удалённых изменений. Нельзя заменить kind на prefixed, чтобы
обойти согласование или чтение originals. Receiver повторно проверяет допустимые
kinds под lock до load; последующие выпуски с уже действующим namespace требуют
только `prefixed` и не читают прежние unprefixed originals. Cloud initial остаётся
пустым; его объекты не допускаются под этой квитанцией.

До namespace change остановить только site test writers и новые uploads; проверить
старые multipart по DB+S3. Завершить под старым namespace либо безопасно abort
точно принадлежащую тесту загрузку с согласованным сохранением/возвратом её состояния
и квоты штатными путями. Не переносить старый UploadId в новый physical key;
пока pending не разрешены, смена конфигурации запрещена. Production uploads не трогать.

После drain скопировать whitelist streaming, не накапливая медиа на полном диске,
в tests/site/<logical-key>; независимо сверить size и SHA-256 чтением source/dest.
Повтор допускается только для уже совпадающего объекта, без overwrite конфликта.
Старые объекты не удалять. Копирует отдельный операторский data step по точному
DB-whitelist, без blanket production scan/mutations; нынешний key остаётся общим
и в test runtime. Этот шаг read source вне нового prefix не выдаётся за scoped SDK
canary: разрешено только чтение подтверждённых старых test objects, запись tests/site/.
DB keys не меняются.
После сверки всех entries допустить новый namespace и доказать playback/download.

Существующие тестовые DB/Redis/volumes сохраняются, их данные не заменяются.
По actual Docker labels applicationProject web/workers и старый test infra project
DB/Redis различаются, main отдельно. Profile содержит applicationProject,
databaseProject/redisProject и pinned container/volume/network bindings. SQL database
из application DATABASE_URL должна равняться binding.dbName; host в test network
ведёт в exact test DB container. POSTGRES_DB default отличается от активной test DB,
его нельзя подставлять в -d. Main DB/Redis не используются; проекты не объединять,
новые DB/Redis не создавать/up. Migration/app команды не запускают dependencies.
Cloud применяет добавляющие 026/027 после проверки journal 26; site остаётся на 28.
Старый web/worker тестовой цели останавливается на время изменения конфигурации,
production-сервисы не затрагиваются. Новая конфигурация не наследует production
SESSION_SECRET/DB/Redis/SMTP credentials; общий S3 key — явное исключение ADR-003. Нынешний TEST shop допускается только
в согласованном окне по FR-5, production payment credentials не наследуются. Аккаунты сохраняются;
после смены session secret потребуется повторный вход.

Cloud-кандидат использует обычный c.clipmkr.ru без cookie-селектора и без
переключения DNS. Для каждой новой роли/ссылки/return действует один backend.
Источник нового кода — Git controller `/home/clipmkr`; обе цели фиксированы ADR-001.

Живая оплата временно использует нынешний TEST shop. До конкретно согласованного
окна и завершения pending intents callback не менять. UI-оператор сохраняет
нынешний n5 callback, меняет HTTP notifications на Cloud URL FR-5, проверяет native
и replay/credits/referrals; после завершения Cloud intents возвращает n5 callback
и подтверждает доставку. Basic auth shop API этим не управляет. При неполном
drain/неизвестном исходе окно не закрывать молча: остановить создание новых intents,
зафиксировать pending и согласовать разрешение/окончание, без потери уведомлений.
Реальные списания выключены, fan-out/симуляция не заменяют native proof.

## Consequences

Плюсы: обычный origin и все ссылки работают без допуска cookie; сохраняются
все данные, нет удвоения app/worker. Минусы: site требует проверенного copy/drain,
sourceIdentity/baseline и реального допуска диска (3,6 ГБ / 97%); Cloud 26→28
требует окна. Старую версию при несовместимой схеме нельзя возвращать автоматически.
При rollback namespace требуется отдельная сверка всех созданных после copy объектов;
простой возврат empty prefix оставит новые logical keys без данных. Без такой сверки
разрешён только совместимый app rollback с сохранением namespace или roll-forward.

## Confirmation

1. `tests/release-candidate.test.ts`: site sourceIdentity, nonempty DB, полный
   baseline/backup/journal и namespace copy receipts; wrong source/foreign media/
   pending multipart/size или SHA mismatch/ресурсный дефицит блокируют apply.
2. `tests/release-candidate-acid.test.ts`: пропуск сохранности/isolation/drain/copy
   или подмена site snapshot localstage snapshot делают проверки красными.
3. Реально сверить ВСЕ прежние account/media/payment/referral данные после copy,
   Cloud 026/027 и site 28→28, app rollback/repeat; public browser playback/download
   и referral/payment return без candidate cookie. Исходные S3 objects сохранены.
4. Admission FR-7/FR-8, safe namespace rollback и нулевые изменения main/DNS.
5. `tests/release-candidate.test.ts`: валидная раздельная app/infra topology
   принимается; DATABASE_URL DB/host против pinned container/project/volume mismatch,
   main DB и POSTGRES_DB default вместо binding.dbName отвергаются до SQL/mutations.

Load-bearing property: обновление не заменяет данные теста данными production,
SDK не отправляет тестовые операции за prefix и не меняет production-маршрут;
production-wide права общего key сохраняются и IAM-защитой не называются.
Owner: оператор выпуска; независимое QE проверяет реальные доказательства.

## Review

Нужны новые prepare и три actual focused QCSD. Новый site binding 5/28 уже сверён root;
остаются drift/all-data baseline, split-project/DB host proof, DB-whitelist/copy/drain,
SDK/настоящий S3/inside-tests Cloud canary, disk admission и конкретное
окно с UI-оператором остаются зависимостями; прежний ideation не одобряет эту ревизию.

## Уточнение заморозки оплаты по QQ-02/RISK-02

Переключение callback допускается после серверного закрытия checkout обеих test
copies через N5_CHECKOUT_ENABLED=false, прекращения in-flight старого web и
provider/DB drain. Gate блокирует только новые/повторные POST создания; webhook
и GET статуса остаются live. Site gate остаётся закрыт весь Cloud window;
перед возвратом закрывается Cloud и выполняется его drain; после подтверждения
старого callback открывается только site. Default true сохраняет прежнее поведение
при отсутствии флага. Основной сайт и его config не меняются.
Confirmation: tests/payments-guards.test.ts и tests/billing.integration.test.ts
проверяют запрет creation при сохранённой обработке callback/status; live window
receipt содержит 503 проверки обоих направлений, drain и восстановление callback.
