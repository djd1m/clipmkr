# Кандидат: подготовка и проверка

Состояние: **разработка и проверка не завершены**. Перед реальным выпуском нужны
фактические proof, сквозные fault-тесты, сверка копирования media и независимое ревью.
Не направлять команду на production и не заменять test DB/Redis/volumes.

Запускать controller на Node 22. Профиль и квитанции — вне Git, файл 0600,
родительский каталог 0700. Секреты не передаются через аргументы или stdout.
Пример показывает форму, а не реальные имена ресурсов:

```json
{
  "targets": [
    {
      "name": "site-test", "transport": "ssh", "project": "test-app",
      "databaseProject": "test-infra", "redisProject": "test-infra",
      "root": "/srv/test-app", "envFile": "/srv/private/site.env",
      "composeFiles": ["/srv/test-app/docker-compose.yml", "/srv/private/limits.yml", "/srv/private/site-images.yml"],
      "sourceDir": "/srv/releases", "stageDir": "/srv/private/site-stage",
      "remoteStateDir": "/srv/private/site-state", "localStateDir": "/srv/private/operator-state",
      "executorProfilePath": "/srv/private/site-executor.json", "dockerPrefix": ["sudo", "-n"],
      "allowedOrigins": ["https://test.example.invalid"], "inputBytes": 1000000,
      "storageBucket": "existing-bucket", "storagePrefix": "tests/site/",
      "resources": {"database": "FULL_DB_CONTAINER_ID", "redis": "FULL_REDIS_CONTAINER_ID", "databaseVolume": "test-db-volume", "redisVolume": "test-redis-volume"},
      "binding": {"databaseName": "test_database", "databaseHost": "test-db", "redisHost": "test-redis", "network": "test-network"},
      "ssh": {"alias": "site-test", "config": "/srv/private/ssh-config", "knownHosts": "/srv/private/known-hosts", "expiresAt": "2030-01-01T00:00:00Z"},
      "backupEvidencePath": "/srv/private/site-backup.json", "dataEvidencePath": "/srv/private/site-data.json", "storageEvidencePath": "/srv/private/site-storage.json"
    },
    {
      "name": "cloud-c", "transport": "ssh", "project": "cloud-test-app",
      "databaseProject": "cloud-test-infra", "redisProject": "cloud-test-infra",
      "root": "/srv/cloud-app", "envFile": "/srv/private/cloud.env",
      "composeFiles": ["/srv/cloud-app/docker-compose.yml", "/srv/private/cloud-limits.yml", "/srv/private/cloud-images.yml"],
      "sourceDir": "/srv/cloud-releases", "stageDir": "/srv/private/cloud-stage",
      "remoteStateDir": "/srv/private/cloud-state", "localStateDir": "/srv/private/operator-state",
      "executorProfilePath": "/srv/private/cloud-executor.json", "dockerPrefix": [],
      "allowedOrigins": ["https://c.clipmkr.ru"], "inputBytes": 1000000,
      "storageBucket": "existing-bucket", "storagePrefix": "tests/cloud/",
      "resources": {"database": "FULL_DB_CONTAINER_ID", "redis": "FULL_REDIS_CONTAINER_ID", "databaseVolume": "cloud-db-volume", "redisVolume": "cloud-redis-volume"},
      "binding": {"databaseName": "cloud_test", "databaseHost": "cloud-db", "redisHost": "cloud-redis", "network": "cloud-network"},
      "ssh": {"alias": "cloud-c", "config": "/srv/private/ssh-config", "knownHosts": "/srv/private/known-hosts", "expiresAt": "2030-01-01T00:00:00Z"},
      "backupEvidencePath": "/srv/private/cloud-backup.json", "dataEvidencePath": "/srv/private/cloud-data.json", "storageEvidencePath": "/srv/private/cloud-storage.json"
    }
  ]
}
```

Значения container ID в примере — placeholders: фактические ID должны быть
полными 64-символьными hex. Порядок compose-файлов должен соответствовать реально
инвентаризированной цели. Поле `binding.databaseName` берётся из **application**
`DATABASE_URL`; значение `POSTGRES_DB` внутри контейнера не является его заменой.
SSH config/known_hosts закрепляют host key и срок доступа, автоматически доступ
не продлевается. Для каждой цели отдельно проверяют исходный project, контейнеры,
volumes, network aliases, имя и системный идентификатор PostgreSQL.

`prepare <full-git-sha> <новый-приватный-каталог>` создаёт Git archive, собирает
один набор web/worker и записывает hashes, image IDs и полный journal. Это Docker
build на controller; корневая рабочая директория не становится build context.
`validate <profile> <manifest>` заново сверяет архив с Git и hashes артефактов.
`source-sync <profile> <manifest> <site-test|cloud-c>` передаёт только source.tar
в новый каталог с именем commit и проверяет каждый распакованный файл. Команда
не меняет app/DB/container; существующий или частично созданный каталог отклоняется.
Перед передачей проверяются свободные место под source и системный резерв; это
**не** доказательство достаточности места под image layers и rollback.
`inspect <profile> <manifest>` проверяет фактические четыре image ID и health.

Текущий формат backup binding: `target`, `project`, `observedAt`, `backupPath`,
`sha256`, `restoreReceiptPath`, `sourceIdentity`. Последний содержит
`composeProject` **infra**, `databaseContainerId`, `databaseVolume`,
`postgresSystemIdentifier`, `databaseName`, `databaseOid`, `timezone`. Файл
restore receipt содержит полный journal, account columns/hash и результат restore.
Data evidence привязывается к этому backup SHA и identity и содержит все public
base tables кроме `_schema_migration`, полный список columns из restore в порядке
схемы, count и snapshot/restore hashes. На исходной схеме проверяются точные
таблицы и columns; после forward migration разрешены только добавления, исходная
проекция и данные остаются проверяемыми. Hashes считаются по проекции исходных
columns, сортировке JSONB строк и Python canonical JSON.

Каждый object whitelist указывает canonical logical key, account/video/clip IDs,
назначение, размер и SHA. Для уже работающего namespace `kind: "prefixed"`
проверяет только bytes по prefixed key. Первичный legacy-перенос требует
`kind: "legacy-synthetic"`, неизменённый оригинал и отдельное подлинное
историческое evidence с SHA и проверяемыми JSON pointers на владельца и ресурс;
ссылка в самой test DB не заменяет provenance. Если фактическое evidence не
содержит нужных полей, объект остаётся недопущенным; создавать историческое
evidence из текущей DB нельзя. Копирование выполняется отдельно оператором
потоковым способом; writer проверяет source/destination hashes и не вызывает
server-side CopyObject.

`multipartScan` содержит bucket, storageFingerprint, observedAt и scopes для
test prefix и точных legacy keys. Каждый scope содержит pages с requestId,
HTTP status, isTruncated, keyMarker, nextKeyMarker и пустым uploads; последняя
страница завершённая. Scan действует два часа и проверяется вместе с фактическим
ListMultipartUploads под target lock. Исторический upload_id завершённой записи
сам по себе не означает незавершённую загрузку.

Storage evidence содержит target/project/commit/time, endpoint/bucket/prefix и
fingerprint фактических credentials. Поля `rawReceiptPath`, `unitReportPath` и
`integrationReportPath` указывают на отдельные private JSON; соответствующие
`rawReceiptSha256`, `unitReportSha256`, `integrationReportSha256` подтверждают их
содержимое. `sdkSourceSha256`, `unitSourceSha256`, `integrationSourceSha256`, `fixtureSourceSha256`
должны совпадать с файлами SDK, unit, integration test и fixture в выбранном Git commit.
Raw receipt содержит реальные `sdkRequests` и `signedHttp`, cleanup status и
хеши canary до/после; тесты подтверждаются Vitest JSON с успешными assertions.
Подписанный URL подтверждается HTTP запросом, а не созданием URL. Проверять canary только внутри
`tests/site/` и `tests/cloud/`. **Общий ключ сохраняет полные production-права**:
SDK namespace ограничивает штатный код, а не IAM; отказ 403 не требуется и не
доказывается. Без реальных SDK/wire proof на Cloud S3, Cloud canary и copy evidence писатели
не допускаются. Конкретное окно TEST shop, drain и возврат callback — отдельная
операторская процедура по требованиям, не результат этой команды.

## Незавершённый контракт выпуска

`apply <profile> <manifest> <previous-set>` и `rollback` принимают закрытый
`previous-set` 0600: `{"site-test":"/private/site-previous.json",
"cloud-c":"/private/cloud-previous.json"}`. Предыдущие manifest каждого target
проверяются отдельно; rollback требует равенства полных journals. Для первоначальных
старых образов допустим initial inventory с `kind: "initial-inventory"`,
`commit: null`, target/project, временем, полным journal, image IDs web/worker
и containerId/StartedAt каждого из четырёх сервисов. Это не свидетельство Git SHA
и не разрешённая цель rollback. После общего выпуска A последующие A/B используют
проверенные полные manifest.

На каждой цели нужен приватный executor profile: те же target/project, отдельные
databaseProject/redisProject, binding, resources, origin, root/env/composeFiles,
dockerPrefix, stageDir и stateDir; дополнительно `kind: "existing-test-project"`,
`healthUrl` и `admissionProbeSha256` из `validate`. Каталоги staging/state должны
уже существовать с mode 0700 у SSH-пользователя; последний compose файл — приватный
image override с ID желаемого набора. Передача и runtime проверки не изменяют DB
или Redis. Запуск writer допускается только после завершённых receipts и ревью.
До первой передачи локально сохраняется intent с operation ID; transfer сохраняет
под тем же target lock отдельный staging marker и проверяет size/SHA перед
повторным использованием файлов. После обрыва стадии `staging` команда
`reconcile <profile> <manifest>` показывает имеющиеся файлы; для продолжения
нужен повтор той же операции с теми же evidence и manifest. После перехода в
`unknown` reconcile сверяет связанную удалённую запись и фактическое состояние,
включая уже записанный terminal result, не повторяя миграцию. Неоднозначный
результат требует оператора; неизвестные артефакты автоматически не удаляются.

Каждая операция имеет отдельный staging directory. Без очистки A→B→A→B может
занять до четырёх наборов архивов сверх текущих и rollback images. До каждого
этапа проверяется место на оставшиеся передачи, полный запас под image layers и
2 GiB; Docker data-root и фактический incremental unpack дополнительно измеряет
оператор. Результат проверки свободного места не является измерением layers.

При необходимости оператор отдельно готовит точечный cleanup plan. До следующей
операции нужно сохранить приватную terminal receipt текущей: при смене операции
текущий state перезаписывается. Под обоими controller locks и target lock оператор
сверяет сохранённую local receipt и remote intent с одинаковым operation ID и
terminal `success` или `aborted`, проверяет SHA конкретных staging tar, наличие
текущих и rollback image IDs и сохранённых на controller source/web/worker
архивов с manifest и проверенными SHA. Только после этого
разрешён отдельно проверенный план удаления именно этих terminal tar. Не удалять
файлы `staging`, `pending`, `unknown` или `operator-blocked`, неизвестные файлы,
образы либо volumes; автоматический cleanup и global prune не применяются.

Форма executor profile на самой цели (значения здесь только placeholders):

```json
{
  "kind": "existing-test-project",
  "target": "site-test", "project": "test-app",
  "databaseProject": "test-infra", "redisProject": "test-infra",
  "root": "/srv/test-app", "envFile": "/srv/private/site.env",
  "composeFiles": ["/srv/test-app/docker-compose.yml", "/srv/private/limits.yml", "/srv/private/site-images.yml"],
  "dockerPrefix": ["sudo", "-n"],
  "origin": "https://test.example.invalid", "healthUrl": "https://test.example.invalid/health",
  "resources": {"database": "FULL_DB_CONTAINER_ID", "redis": "FULL_REDIS_CONTAINER_ID", "databaseVolume": "test-db-volume", "redisVolume": "test-redis-volume"},
  "binding": {"databaseName": "test_database", "databaseHost": "test-db", "redisHost": "test-redis", "network": "test-network"},
  "storagePrefix": "tests/site/", "stageDir": "/srv/private/site-stage", "stateDir": "/srv/private/site-state",
  "admissionProbeSha256": "SHA256_FROM_VALIDATE"
}
```

Поля target/project, пути, ресурсы, binding и origin должны совпадать с
локальным профилем. Хеш probe привязывает исполняемую проверку к проверенному
controller; пример не является готовым профилем для запуска.
