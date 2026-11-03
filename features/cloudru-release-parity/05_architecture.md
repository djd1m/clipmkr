# Архитектура тестового выпуска

Статус: revision pending новых prepare/трёх focused QCSD. ADR-001, ADR-002, ADR-003.

## Поток версии

Git controller `/home/clipmkr` → чистый checkout полного SHA → существующий Dockerfile →
единый набор web/worker с OCI revision → manifest/checksum → явные тестовые цели
через проверенные SSH-профили → Docker load/inspect + Compose → сверка runtime
образов и HTTP health с версией, закреплённой при сборке.

Обе цели `cloud-c` и `site-test` получают один исходный архив/набор образов через
SSH. Site-test — существующий n5 test на сервере сайта, который владелец также
называет сервером разработки/«этим VPS». Controller физически отдельный; его
localdevstage исключён, новый dev-контур не создаётся. Main containers clipmkr.ru
и DNS не переключаются. Source-sync не перезаписывает live source/env/data.

## Данные и запуск

Обновляются existing test copies: Cloud 3 accounts/0 media/payments/journal 26;
site-test 5 accounts/4 videos/10 clips/6 payments/referrals/journal 28. Сохраняются
ВСЕ их данные, DB/Redis/volumes. Cloud добавляет 026/027; site остаётся на 28.
Root переснял site sourceIdentity/live account SHA/full journal и сверил с реальным
restore test.dump: 5 accounts/28 migrations match. Этот binding заменяет localstage;
до apply нужен drift check и полный baseline media/payment/referral/credit связей.

Разрешены общий bucket/нынешний общий key с полными production-правами: owner
exception «Нынешний общий ключ; ограничиваем тесты в коде». Tests/cloud/ и tests/site/
разделяются только code/SDK guards, IAM-изоляции нет; admission по bucket+prefix,
без требования разных buckets. Никаких новых SA/key/policy. Собственные PG/Redis/session
secrets, отключены реальные SMTP/support/списания; TEST shop только в окне ниже.
Credentials не попадают в manifest/Git/CLI-output. Тестовые web/workers
приостановлены при смене конфигурации/схемы; production не затрагивается.
Cloud-кандидат работает обычным c.clipmkr.ru: один origin/backend для всех ролей,
referral и return. Cookie выбора версии отсутствует, DNS не переключается.

Namespace change site: остановить только test writers/new uploads, разрешить старые
pending multipart штатным complete/безопасным abort, связать DB-whitelist synthetic
objects с source/destination/size/SHA. Streaming copy в tests/site/ с независимой
проверкой каждого объекта; originals сохраняются, DB logical keys не переписываются.
Чужая production-ссылка/несовпадение hash/pending upload блокируют apply. Подробности
и rollback namespace — ADR-002; нет массового prefix/копирования всего bucket.

## Раздельные application и test infra projects

Actual labels site: web/workers — application compose project; DB/Redis — другой
старый test infra project, production main отдельно. Profile явно содержит
applicationProject, databaseProject/redisProject и pinned IDs контейнеров/volumes/
network bindings. Одна цель не означает один compose project. Не объединять их,
не создавать/up новые DB/Redis и не трогать main. Compose apply/up/migrator только
явные app services, без dependencies (`--no-deps`), с сохранением existing networks.

SQL admission разбирает application DATABASE_URL приватно: database точно равна
binding.dbName; host/network alias в test network ведёт к pinned test DB container,
его compose labels/PG system identity/volume соответствуют binding. Активная test DB
отличается от POSTGRES_DB default контейнера; `-d "$POSTGRES_DB"` недопустимо.
Любой mismatch/main DB блокирует SQL/apply до изменений. Redis URL так же связан
с pinned test Redis container/network/volume. DB/Redis IDs/StartedAt/volume до/после
не меняются; неизвестную topology не чинить bootstrap/up.

## Remote apply и восстановление

На цели mkdir/lock исключает два writer. Приватный state атомарно фиксирует
intent до начала, затем шаги config/migration/app/runtime verification.
Если соединение потеряно после отправки команды, итог unknown; следующий вызов
сначала читает state, реально работающие образы, health и journal. Повторный apply
без reconcile запрещён. Доставка не продлевает SSH-ключ и не меняет сетевые правила.
Preflight сверяет host key, доступность loopback-туннеля и остаток его срока.

Ошибка миграции не вызывает restore старой БД или down -v. Успех одной цели
сохраняется в отдельном receipt, при неуспехе второй общий exit ненулевой.
Rollback разрешён только между manifest с одинаковым полным journal схемы;
начальный переход 26→28 исключён из автоматического rollback. Демонстрация
повторного изменения выполняется A→B→A→B при одной новой схеме 28.

## SDK namespace boundary

`loadS3Config` в shared config — существующая общая S3-конфигурация (роль
sharedS3Config), S3_KEY_PREFIX валидируется там, empty default оставляет прежний
production режим. Явные adapters web/stt/render и Compose S3 anchor передают его
в StorageClient. Middleware существующего AWS SDK применяется к internal client
и public signingClient до сериализации/подписи; без новых dependencies/service.
Logical request keys превращаются в namespace+key, returned keys проверяются
и возвращаются logical. Bucket/Key/Prefix/KeyMarker/NextKeyMarker и allowlist всех
реально используемых commands — ADR-003. GetBucketVersioning read разрешён;
unknown commands/path escapes/bucket-wide mutations scoped клиента запрещены.
Multipart/retention/erasure API и DB keys сохраняют прежний logical контракт.

SDK proof — настоящий Cloud.ru S3 с двумя prefixes и outside synthetic canary с SHA/size
до/после, capture всех object/list wire operations и public signing; unsafe input/
unknown bucket mutation — ноль requests. GetBucketVersioning exact-bucket read
явно исключён из object-prefix условия. Outside-cloud canary — только собственный
synthetic object в tests/site/<уникальный-run>/; exact-key cleanup без bucket
create/delete/root listing/metadata mutations. Cloud canary только inside tests/cloud/
и tests/site/, без мутаций рабочих namespaces и требования provider 403 от общего
key. Root read-only проверил: policy отсутствует, CORS уже допускает c/n5 PUT,
versioning disabled; production settings не меняются. IAM rollout не dependency;
при обходе SDK/компрометации общего key production-доступ остаётся возможен.

Независимый test-only requestHandler/fetch fence ограничивает физический run scope
ДО сети даже при отключённой/сломанной SDK middleware: FR-8/ADR-003. Общий fixture
переиспользуется network тестами; app runtime вторым адаптером не обрастает.

## Ресурсы и реальная приёмка

Site-server: 3,6 ГБ свободно/97% занято. Сначала фактический release admission:
source/image archives, incremental layers, temp extract и текущие/rollback images
плюс резерв. Этот пик проверяется отдельно от media admission ниже; переносить
архивы без допуска места нельзя. Разрешён read-only inventory собственного кэша
и отдельный cleanup plan, но не global prune/удаление чужих проектов/rollback images.

Допуск задан FR-7: доступная память ≥2 ГиБ до начала, конечные memory limits,
один медиапроцесс, disk ≥3×вход +2 ГиБ системного резерва. Тесты последовательно:
один вход 90 минут, один 120; максимум два STT-прохода, четыре LLM-вызова и
существующие provider spend ceilings. Контролируются memory/OOM/disk/остатки;
при исчерпании прекращается только тестовая обработка, production не очищается.
Перед каждым платным вызовом сохраняется ограниченный бюджет/остаток без ключей.

Для оплаты нужна подтверждённая native доставка нынешнего TEST shop в согласованном
окне. До конкретных времени/конца окна и drain callback прежнего теста сохраняется.
Пока окно/маршрут не настроены,
Cloud payment E2E blocked. Handler проверяет source IP, shop/test-mode, принадлежность
intent, повторно получает платёж у провайдера, повтор не даёт второй grant.
Симулированный POST и polling не дают приёмочного passed.

## Процесс и завершение

Проектные версии закреплены. AQE MCP отсутствует: reference mode с расширенными
протоколами. Codex hooks в dz не подтверждены, поэтому реальные gates вызываются
явно и их результаты сохраняются; native hooks не объявляются активными.
QCSD и финальный cross-model review выполняют отдельные роли по review-policy.

Выход: backup/restore и сохранность ВСЕХ данных, SDK namespace proof S3, публичный Cloud CJM,
одинаковый A на двух тестовых целях, кодовая правка B с повторной доставкой и
проверенный совместимый откат. Production cutover — отдельное решение владельца.

Controller checkpoint 10/10 Node 22, typecheck 0 — prepare/validate/read-only
inspect/source-sync; apply/reconcile/rollback пока заблокированы. Prototype `/tmp`
не интегрирован, fake 14+4 не live proof. Immutable health уже build-tested 200/
no-store/runtime-override-safe на source 71e7812, но full suite нашёл 7 failures в
3 файлах из-за build-time env. FR-9 требует точной классификации/проверки build
wiring в scripts/check-env-wiring.mjs/tests/wiring.test.ts и повторного full suite.
Ни baseline full PASS, ни approval новой ревизии плана пока не заявляются.

## Точный контракт платежного допуска

Используем нынешний TEST shop, YOOKASSA_TEST_MODE=true; новый shop_id не требуется.
Конкретное окно ещё не согласовано: оператор/начало/конец/порядок drain и возврата
фиксируются приватно. До drain старых pending intents callback не менять. UI-оператор
сохраняет n5 callback, меняет HTTP notifications на
`https://c.clipmkr.ru/api/webhooks/yookassa` с нужными payment.succeeded/refund.succeeded,
проводит native/replay/credits/referrals и после завершения Cloud intents возвращает
нынешний n5 callback, проверяя доставку. Basic auth shop API не управляет webhook
настройкой. При неизвестных intents/превышении окна прекращаются новые checkout,
фиксируется pending и требуется согласованное завершение без потери callback.
Настоящие списания выключены. До реального native proof payment CJM BLOCKED.

Положительное доказательство: локальный intent → native callback от провайдера
по проверенной IP/proxy-цепочке → provider lookup → один grant → повторное событие
не даёт второй grant. Чужой shop/test-mode/intent и поддельный source IP отвергаются.

## Checkout gate и сверка оценки

N5_CHECKOUT_ENABLED проходит общий WebConfig → explicit environment adapter →
BillingDependencies → createCheckoutHandler; default true, строгое boolean значение.
False после прежних rate/origin/auth проверок и до body/createIntent/provider create
возвращает 503. GET/status и webhook используют прежний live provider. Во время
согласованного окна неактивный контур держится закрытым; freeze предшествует drain,
переключению callback и открытию активного контура; при возврате порядок симметричен.
Точные January/R1/R2 денежные ожидания, null/20/30, исключения и snapshots закреплены
в конце01. Их PostgreSQL fixture доказательство отделено от live native Cloud receipts.
