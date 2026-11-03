# ADR-003: тестовые namespace в общем S3 bucket

Status: proposed; revision pending focused QCSD. Дата: 03.11.2026.
Требования FR-4, FR-8; последнее явное owner exception о нынешнем общем key.

## Context

Site-test содержит медиа в общем с production bucket. Разные bucket не обязательны;
выбрана только code/SDK-граница каждой тестовой копии с production objects.
Cloud пока без медиа; site имеет 4 видео/10 клипов, journal 28 и общий bucket.
Owner после разъяснения границ: «Нынешний общий ключ; ограничиваем тесты в коде».
Общий key полностью сохраняет production-права. Новых SA/key/policy не планируется.

## Considered options

| Вариант | Преимущество | Ограничение |
|---|---|---|
| Отдельные bucket/key | Простая внешняя граница | Необязательные ресурсы/перенос, не выбран владельцем |
| Общий bucket, non-admin key tests/*, два prefixes | Внешний IAM scope | Прежний проект, superseded явным owner exception; rollout не нужен |
| Нынешний общий production key и SDK prefix guards | Сохраняет текущие credentials/infra, logical DB keys | Выбран owner; настоящей IAM-изоляции нет, обход SDK даёт production-доступ |

## Decision

`tests/cloud/` и `tests/site/`, нынешний общий key с полными production-правами.
Никакого IAM rollout/new SA/key/BucketPolicy/production storage changes.
SDK middleware в существующем StorageClient сохраняет logical keys в БД.
Это owner exception к прежнему scope требованию: только code/SDK isolation.
Нельзя выдавать SDK guard за IAM-границу либо нынешний production key за scoped.

## Config и место реализации

Общий parser `loadS3Config`/тип S3Config в `packages/shared/src/config.ts`
исполняет роль sharedS3Config; отдельного одноимённого символа в этом дереве нет.
S3_KEY_PREFIX: absent/empty → empty с прежним production поведением. Непустое
значение — канонические сегменты `[a-z0-9_-]+/`, без начального `/`, `//`, `\`,
`.`/`..`, `%`, query/fragment/controls; test admission разрешает только точное
`tests/cloud/` либо `tests/site/` и сверяет bucket+prefix с profile/receipt.
Production config по умолчанию не меняется; same bucket допустим, empty/equal/wrong
prefix на test цели запрещён. Дополнительные bucket не требуются.

Добавить одно внутреннее middleware в существующий `packages/s3/src/client.ts`,
использовать middlewareStack AWS SDK на internal client и signingClient до
сериализации/подписи, обратную проверку после deserialize. Без новых dependencies
и публичных exports, если существующих createS3Client/StorageClient достаточно.
Обязательны env adapters web/stt/render, Compose anchor и test fixtures; иначе
часть процессов молча сохранит empty prefix. Это отдельные targets плана.

При nonempty prefix: точный Bucket из config, allowlist команд ниже. Logical key
относительный; запрет absolute slash, backslash, пустых/`.`/`..` сегментов,
encoded/double-encoded path (`%`), controls/query/fragment и уже physical namespace.
Обычные `/` между logical сегментами допустимы. Wire key = namespace + logical key;
входы не мутировать, повтор/подпись того же command не добавляет namespace второй раз.
Ответные keys обязаны быть внутри точного namespace, иначе fail closed целиком,
не молча отфильтровать чужие объекты. После удаления namespace validate logical key.

## Контракт команд по существующим вызовам

| SDK command | Где уже используется | Input → wire | Проверка output → logical |
|---|---|---|---|
| HeadObjectCommand | s3/operations; worker render/storage | Bucket, Key | Нет key-поля; не менять size/metadata |
| GetObjectCommand | operations; media/download; presign | Bucket, Key, Range без изменения | Body/Range без изменения |
| PutObjectCommand | worker render/storage | Bucket, Key; Body/IfNoneMatch/metadata прежние | ETag/checksum прежние |
| DeleteObjectCommand | operations; render/storage | Bucket, Key | Только заданный объект |
| CreateMultipartUploadCommand | s3/multipart | Bucket, Key | Key если есть проверяется/снимается prefix; UploadId opaque |
| UploadPartCommand | s3/presign | Bucket, Key; UploadId/PartNumber opaque | Подписывается уже wire path, public host прежний |
| ListPartsCommand | s3/multipart | Bucket, Key; PartNumberMarker прежний | Key если есть → logical; NextPartNumberMarker/parts прежние |
| CompleteMultipartUploadCommand | s3/multipart | Bucket, Key; UploadId/parts прежние | Key если есть → logical; ETag прежний |
| AbortMultipartUploadCommand | s3/multipart; erasure | Bucket, Key; UploadId прежний | NoSuchUpload прежняя семантика |
| ListObjectsV2Command | s3/erasure | Bucket, Prefix; absent/empty logical Prefix → namespace | Contents[].Key, CommonPrefixes[].Prefix, Prefix/StartAfter → logical, если есть |
| ListMultipartUploadsCommand | s3/erasure | Bucket, Prefix, KeyMarker → wire | Uploads[].Key, CommonPrefixes[].Prefix, Prefix/KeyMarker/NextKeyMarker → logical, если есть |
| GetBucketVersioningCommand | s3/erasure | Только exact Bucket; read без prefix | Status прежний; erasure по-прежнему отказывает при versioning |

ListObjectsV2 StartAfter (если задан) преобразуется как key; ContinuationToken и
NextContinuationToken opaque, не path. ListMultipart UploadIdMarker/NextUploadIdMarker
также opaque; NextKeyMarker преобразуется и проверяется, сохраняя pagination guard.
Наличие key-поля в object/multipart response не означает, что caller его использует:
middleware всё равно проверяет поле. При scoped commands неожиданные key-bearing
формы/EncodingType=url не принимать без контракта; не делать неоднозначный decode.
Unknown commands, CopyObject/UploadPartCopy, DeleteObjects, ListBuckets/версии,
Create/DeleteBucket, Put/DeleteBucketPolicy/Lifecycle/Versioning и любые bucket-wide
mutations при nonempty prefix отвергаются до сети. Пустой production namespace
сохраняет существующее поведение, включая disposable test setup Create/DeleteBucket.

Erasure/retention по-прежнему оперируют logical prefixes: проверяют принадлежность
результатов, abort/delete только внутри namespace; DB object_key/source_key не
переписываются. Старый UploadId нельзя продолжить после смены physical key.
Порядок site drain/copy/size+SHA/original preservation и rollback — ADR-002.

## Границы доказательства и read-only Cloud inventory

Root проверил только чтением: policy отсутствует, CORS уже допускает c/n5 PUT,
versioning disabled. Эти production-настройки сохраняются. Ни подготовка/approval
новой BucketPolicy, ни отдельный key/403 не являются текущими зависимостями.
Общий key позволяет доступ вне tests prefixes: не проверять его ожидаемым 403 и
не объявлять provider-level IAM isolation. Предыдущая схема сохранена как история
в 07_progress; факт старых gates не меняется и к новой ревизии не переносится.

SDK tests фиксируют каждый wire request: object paths и list Prefix/KeyMarker
в точном namespace, signed requests туда же; unsafe inputs/unknown commands/
bucket mutations прекращаются до сети. GetBucketVersioning exact bucket read
не имеет object prefix и остаётся явным allowlisted исключением. Fixture setup/
teardown outside canary — отдельный raw client только для точных synthetic keys
в tests/site/<run>/, не target SDK. Вне tests/* он не читает и не изменяет объекты.
Cloud операторский canary допускается только внутри tests/cloud/ и tests/site/;
мутации рабочих namespaces запрещены. Это проверка совместимости приложения,
не scope proof и не проверка отказа общего key на production objects.

#### Независимый предсетевой предохранитель настоящих S3 тестов

Shared production-wide key требует второго test-only барьера, независимого от
проверяемой SDK namespace middleware. До первого реального HTTP запроса fixture
оборачивает фактический requestHandler.handle internal/signing/raw clients.
Разрешены только HTTPS exact endpoint/bucket, physical object keys внутри
уникального run tests/cloud/ или tests/site/, list Prefix/KeyMarker внутри того же
run и read-only GET GetBucketVersioning exact bucket. Raw canary — только точный
собственный key, без list. Bucket mutations, root listing, CopySource, другие
bucket queries, encoded escapes и всё за scope блокируются ДО transport.
Подписанный URL проходит тот же независимый physical-scope guard ДО fetch.
Guard не использует keyPrefix parser проверяемого SDK и не выносится в app runtime.
Единый fixture liveS3Environment в существующем tests/fixtures/environment.ts
возвращает config/bind/fetch; legacy network tests переиспользуют его.
Отрицательные SDK случаи остаются fake HTTP; тест с намеренно снятым/сломанным
SDK prefix и synthetic own logical key доказывает zero actual network через
независимый fence. Не отправляем опасные negative probes на provider и не
проверяем широкие права общего key попытками реальных production мутаций.
Private journal до первого PUT сохраняет run UUID/exact attempted keys/upload IDs
и unknown outcomes; cleanup failure не маскирует первичную ошибку и не PASS.

## Confirmation

1. `tests/storage-prefix.test.ts`: serialize/deserialize реального SDK pipeline и
   public signing с поддельным transport, оба path styles. Все команды таблицы,
   Bucket mismatch, malformed config/key/markers, foreign response keys,
   unknown/bucket mutations, повтор того же command и empty-prefix compatibility.
   Одного mock client.send недостаточно: он обходит middleware. Wire capture
   подтверждает отсутствие запросов за prefix и ноль requests для отказов.
2. `tests/storage-prefix.integration.test.ts`: настоящий Cloud.ru S3, один bucket,
   два StorageClient tests/cloud/ и tests/site/ с одинаковыми logical keys и разными
   байтами; отдельный raw fixture client создаёт outside-cloud synthetic canary
   только в tests/site/<уникальный-run>/, без bucket lifecycle операций. До/после
   сравнить SHA-256/size/набор ключей canary и второй копии при erasure первой.
   Реальные presigned PUT part/GET, complete/list/abort, pagination и retention/erasure;
   versioning-read и негативные guards. Нужный multipart page forcing зафиксировать
   явно; fake paginator не обозначать как real provider pagination proof. Capture
   всех запросов отделяет setup/teardown от target SDK, проверяет physical prefix
   Key/Prefix/markers/signatures и неизменность outside canary после операций.
3. Интеграция использует уже установленные AWS SDK, Vitest/Node crypto и HTTPS Cloud.ru S3
   profile. Используется нынешний общий production-wide key по решению владельца;
   все network object операции только tests/cloud/ или tests/site/ с уникальным
   run ID. Нет Create/DeleteBucket, root listing или metadata mutations. Read-only
   GetBucketVersioning разрешён. Cleanup — только точные свои keys/upload IDs;
   outside-cloud canary расположен в tests/site/<run>/, вне tests/* мутаций нет.
   N5_ACCEPTANCE прогон не может принять skip/отсутствующий S3 profile за PASS.
4. Отдельный реальный Cloud canary нынешним общим key: positive CRUD/multipart/list
   и public signing только synthetic objects inside tests/cloud/ и tests/site/.
   Никаких мутаций рабочих namespaces или ожидаемого provider 403. В receipt прямо
   указать: key production-wide, проверена compatibility, IAM-изоляции нет.
5. `tests/release-candidate.test.ts` и `tests/wiring.test.ts`: admission по bucket+
   prefix, без bucket inequality; точная доставка S3_KEY_PREFIX web/stt/render,
   отсутствие prefix в test profile/adapter блокирует допуск. K1 root проверяет
   новые имена storage-prefix/exports до coding, receipts в этой ADR не созданы.

Load-bearing property: каждый scoped SDK request/signature и каждый returned key
принадлежит точному bucket+prefix, кроме allowlisted GetBucketVersioning read;
широкие права общего key не выдаются за ограниченные и не заменяют SDK proof.
Owner: root/оператор; final cross-model review — отдельные fresh sessions.

## Consequences и Review

Сохраняются стек, логические DB keys и production default. Нужны изменения env
adapters и полная storage регрессия. Общий key сохраняет production-права; SDK
boundary не защищает при его компрометации или использовании клиента вне guards.
ADR proposed: prepare/три focused QCSD и K1/K2 для новой ревизии ещё впереди.
