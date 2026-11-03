## ADDED Requirements

### Requirement: Один проверенный выпуск для тестовых целей
Команда доставки SHALL применять полный Git SHA и одинаковые проверенные образы
только к явно разрешённым SSH-целям cloud-c и существующему site-test, сохраняя
результат каждой цели. Controller SHALL запускаться из /home/clipmkr;
localdevstage SHALL NOT быть целью, новый dev-контур не создаётся.

#### Scenario: Частичный выпуск
- **WHEN** одна тестовая цель проверена, а другая недоступна
- **THEN** итог ненулевой, успешная цель и ошибка отражены отдельно.

### Requirement: Production требует отдельного решения
Команда кандидата SHALL отклонять production-цель и сохранять основной DNS,
production web/worker/БД/очереди без переключения.

#### Scenario: Попытка выбрать production
- **WHEN** оператор передаёт production в команду тестового выпуска
- **THEN** команда отказывает до удалённых изменений.

### Requirement: Сохранность тестовых данных и изоляция
Обновление SHALL сохранять ВСЕ accounts/media/payments/referrals и volumes,
требовать проверенного source-bound backup/restore и exact application DB binding.
Cloud: 3 accounts/0 media-payments/journal 26→28; site-test: 5 accounts/4 videos/
10 clips/6 payments/referrals/journal 28→28. Новый site binding/account SHA/journal
match restore test.dump 5/28 от root SHALL заменить localstage input; до apply
SHALL проверяться drift и baseline всех прочих данных.

#### Scenario: Непустое медиа site-test
- **WHEN** существующий site-test переходит на namespace tests/site/
- **THEN** только DB-whitelist synthetic objects копируются с независимой size/SHA проверкой; originals и logical DB keys сохраняются, foreign references/pending multipart блокируют смену.

### Requirement: Нынешний общий ключ ограничивается только кодом SDK
Согласно явному owner exception система SHALL сохранять общий текущий S3 key
с полными production-правами и применять namespace bucket+tests/cloud/ или tests/site/
в internal/signing SDK clients. Система SHALL NOT создавать SA/key/policy, менять
production storage settings или заявлять IAM isolation/provider403 proof.

#### Scenario: Unsafe input или неподдержанная команда
- **WHEN** scoped SDK получает path escape, неверный bucket или unknown/bucket mutation
- **THEN** он отказывает до сети; поддержанные object/list/multipart/signing/retention операции имеют physical prefix, returned keys валидируются и возвращаются logical.

#### Scenario: Реальное доказательство SDK namespace
- **WHEN** выполняется приёмка namespace
- **THEN** реальный isolated MinIO с двумя prefixes доказывает wire prefix и прежние size/SHA outside canary; Cloud canary работает только inside tests prefixes, 403 по общему key не требуется.

### Requirement: Существующая test infra имеет отдельный binding
Profile SHALL явно связывать applicationProject, databaseProject/redisProject,
pinned containers/volumes/network и binding.dbName. SQL SHALL выбирать database
из application DATABASE_URL, равную binding.dbName, и проверять host → точный test
DB container в test network. App/infra projects SHALL NOT объединяться;
новые DB/Redis и их up/dependency start SHALL NOT выполняться.

#### Scenario: Default database или main container вместо test
- **WHEN** DATABASE_URL database/host/container/project/volume не соответствует binding либо подставлен POSTGRES_DB default вместо активной test DB
- **THEN** admission отказывает до SQL/migrations/apply; main DB не используется.

### Requirement: Обрыв доставки требует сверки
Доставка SHALL фиксировать приватные intent/state и один writer на цель;
после обрыва состояние считается unknown до reconcile.

#### Scenario: Потеря SSH после apply
- **WHEN** соединение оборвано до получения runtime receipt
- **THEN** повторный вызов сначала сверяет state, образы и схему, не повторяя apply вслепую.

### Requirement: Проверка нового кода на Cloud.ru
Кандидат SHALL проходить обязательный core-CJM, а отдельная кодовая правка
должна наблюдаться после доставки на обе выбранные тестовые цели.

#### Scenario: Повторная доставка
- **WHEN** оператор фиксирует и доставляет новый проверенный коммит
- **THEN** обе цели подтверждают новую версию и её наблюдаемое изменение.

### Requirement: Платёжный E2E требует native уведомления
Приёмка оплаты SHALL требовать настоящий тестовый платёж и его native webhook
без нарушения прежнего тестового получателя.
Временно SHALL использоваться нынешний TEST shop в конкретно согласованном окне
с UI-оператором; Basic auth shop API не управляет HTTP notifications.

#### Scenario: Маршрут магазина не настроен
- **WHEN** уведомления не доставляются в Cloud-кандидат
- **THEN** статус приёмки blocked, симуляция и polling не дают passed.

#### Scenario: Окно нынешнего TEST shop
- **WHEN** начало/конец окна и UI-оператор не согласованы либо прежние intents pending
- **THEN** callback сохраняется; только после допуска UI переключает HTTP notifications на https://c.clipmkr.ru/api/webhooks/yookassa, native/replay/credits/referrals проверяются, после завершения Cloud intents callback n5 возвращается с delivery verification; реальные списания выключены.

### Requirement: Откат и ресурсы ограничены проверками
Автоматический откат SHALL требовать совместимого schema journal, а приёмка —
конечных ресурсов и provider-бюджетов согласно FR-7 требований feature.

#### Scenario: Несовместимая схема
- **WHEN** предыдущий manifest не соответствует текущему проверенному journal
- **THEN** автоматический rollback отклоняется без восстановления старой БД.

#### Scenario: Site-server заполнен на 97 процентов
- **WHEN** фактического места для incremental images/source-image archives/temp extract и резерва с сохранением rollback images не хватает
- **THEN** transfer/apply blocked; global prune, чужие проекты и rollback images не удаляются.

### Requirement: Build-time release revision не является runtime-required env
Wiring guard SHALL точно классифицировать NEXT_PUBLIC_RELEASE_REVISION и
проверять Dockerfile build binding, сохраняя runtime-required/dynamic-env guards.
Baseline full PASS SHALL NOT заявляться до исправления 7 failures source 71e7812
и реального повторного полного suite; immutable health 200/no-store/override-safe
SHALL сохраняться.

#### Scenario: Сломанная build binding
- **WHEN** ARG RELEASE_REVISION → ENV NEXT_PUBLIC_RELEASE_REVISION → Next build нарушена либо пропущен обязательный runtime env
- **THEN** wiring regression даёт finding; исключение всех NEXT_PUBLIC_* не допускается.
