# Проект решения

Три ADR и архитектура находятся в `features/cloudru-release-parity/`.
Manifest связывает полный SHA, source archive, image IDs и checksum доставки.
Только явные тестовые цели, отдельные state/lock/receipt; после обрыва сначала
reconcile. Controller `/home/clipmkr`, targets cloud-c/site-test только SSH;
localdevstage исключён. ВСЕ test DB/Redis/accounts/media/payments/referrals сохраняются.
Site-test app web/workers и DB/Redis имеют разные compose projects. Профиль связывает
applicationProject/databaseProject/redisProject, pinned containers/volumes/network;
SQL использует DB из application DATABASE_URL = binding.dbName и host → exact test
DB container, не POSTGRES_DB default/main. DB/Redis create/up/dependency start запрещены.
Новый site sourceIdentity/account SHA/journal matched реальный restore test.dump 5/28
получен root; до apply drift check и baseline прочих данных.

S3: owner явно выбрал нынешний общий key с полными production-правами, только SDK
boundary bucket+tests/cloud/ либо tests/site/. Новых key/SA/policy и provider403 нет.
Root read-only: policy отсутствует, CORS c/n5 PUT допускает, versioning disabled;
production settings прежние. AWS SDK middleware на internal/signing clients,
logical DB keys/erasure/multipart/retention прежние. S3 wire+outside canary proof,
Cloud canary только внутри tests. По явному решению владельца сохраняются все
существующие site-test uploads, включая реальные: каноническая принадлежность DB,
точный DB-whitelist и квитанция сохранения, связанная с target/project/sourceIdentity/
bucket/prefix и хешем whitelist, обязательны; synthetic provenance не требуется.
Site media копируется по whitelist с size/SHA, старые объекты сохраняются; старые multipart разрешить до namespace change.
Автоматический app rollback требует одинаковых схемы и namespace.

Cloud использует обычный тестовый origin без cookie выбора backend. Native
платёжная доставка нынешнего TEST shop требует конкретного окна/UI-оператора/drain/
switch/native-replay-credits-referrals/drain/возврата n5 callback. До окна callback
не меняется; shop Basic auth API не управляет notifications, реальные списания off.
Ресурсные бюджеты конечны: site 3,6 ГБ/97% требует фактического release admission
incremental images/archives с сохранением rollback images, без global prune.
Семь failures full-suite source 71e7812 требуют точного build-time wiring fix,
immutable health уже build-tested; baseline full PASS пока нет.
Revision pending: root prepare/три actual focused QCSD/K1/K2, coding приостановлен.

Настоящие S3 network tests используют независимый physical-scope guard
requestHandler/fetch до сети, отдельный от проверяемой SDK middleware, и только
уникальные tests/cloud/ и tests/site/. Legacy integration сохраняют сценарии
без bucket lifecycle; fixture cleanup — точные собственные keys/upload IDs.
