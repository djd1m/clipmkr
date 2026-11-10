# Spec Delta

## ADDED Requirements

### Requirement: Свежий production набор по расписанию
Система MUST почасово сохранять две действующие PostgreSQL через pg_dump -Fc, native snapshot dedicated Redis, durable production uploads/config/versions и валидный completed prefix authoritative model-spend.jsonl; источники и времена компонентов фиксируются, живой PGDATA не копируется. Rebuildable/in-flight stt/llm/video scratch MUST быть явно исключён из capture/sizing с записью категорий исключений в manifest; restore не опирается на его coherent state.

#### Scenario: Online spend с неполным tail или append
- **WHEN** authoritative JSONL открыт с device/inode и размером S
- **THEN** сохраняются bytes до последней полной newline-terminated записи B≤S, каждый record проверен как UTF-8 JSON object, identity/S/B/count/excluded-tail/hash/times записаны; append после S не входит, partial tail явно исключён

#### Scenario: Spend source сменился или повреждён
- **WHEN** обнаружены rotation/truncation/prefix change, invalid complete record либо nonempty source без полной записи
- **THEN** новый набор не публикуется и success не обновляется; повтор возможен только следующим штатным run

#### Scenario: Stale staging или ошибка компонента
- **WHEN** dump, RDB, files проверка или runtime binding не подтверждены для нового run
- **THEN** старый staging не выдаётся за свежий snapshot и нового полного success нет

#### Scenario: Конкурирующий запуск
- **WHEN** общий corp backup lock уже занят
- **THEN** Clipmkr задача не запускает конкурентные dump/restic/rclone и фиксирует non-success

### Requirement: Ограниченный собственный staging и capacity
Система MUST держать максимум 2 собственных staging набора по≤1 GiB каждый: authoritative completed и candidate/остаток прерванной замены; после нормального завершения максимум1. Единственный cleanup owner — capture hook под shared lock. Он MUST сохранять действующий include до атомарной замены и очищать только own orphan/superseded до нового candidate; ambiguous ownership/path означает отказ. Production/foreign paths и restic/offsite retention не затрагиваются.

#### Scenario: Повторные отказы и прерывание
- **WHEN** capture/copy ошибается либо run оборван после создания candidate
- **THEN** last success сохранён, число/размер наборов ограничены; следующий lock holder убирает собственный неавторитетный остаток до новой записи, active/authoritative и foreign sentinel не удаляются

#### Scenario: Недостаточный дисковый бюджет
- **WHEN** conservative read-only sizing с25% запасом превышает1 GiB, неизвестен либо available staging/repo FS меньше8 GiB (1 GiB capture +2 GiB repo/cache headroom +5 GiB app reserve)
- **THEN** bulk capture не начинается и success не обновляется; actual staging output также ограничивается1 GiB во время записи, превышение не публикуется

#### Scenario: Резерв уменьшился перед snapshot
- **WHEN** перед local restic available repo FS меньше7 GiB
- **THEN** snapshot не запускается, failure записан без изменения last success; guard не объявляется эксклюзивной filesystem reservation

### Requirement: Две подтверждённые offsite копии без чужих изменений
Система MUST использовать установленные encrypted restic и existing immutable Yandex/Cloud.ru copies, проверяя текущую snapshot identity отдельно в каждой; собственный запуск не вызывает globalforget/prune/чужие hooks и не меняет foreign retention/сервисы. Restic tags MUST оставаться стабильными clipmkr/corp-infra; run ID хранится только в manifest/receipt, чтобы не дробить existing retention groups host,tags.

#### Scenario: Одна копия недоступна
- **WHEN** текущий snapshot отсутствует в primary или secondary либо copy failed
- **THEN** полный успех не фиксируется, сохраняются прежний success age и явный failed component

#### Scenario: Опасный scoped режим
- **WHEN** планируемая команда `backup.sh --service --phase run` выполняет globalforget
- **THEN** адаптер использует прямые native backup/immutablecopy под shared lock вместо этого режима

### Requirement: Проверяемое изолированное восстановление
Оператор MUST извлечь текущий набор из каждого offsite и сверить hashes; две БД из одной offsite копии восстановить в изолированные назначения existing PostgreSQL и проверить выбранные payment/account/video/support строки, Redis format и files без production overwrite, новых контейнеров и повторных оплаты/нарезки.

#### Scenario: Риск живого Redis
- **WHEN** RDB содержит все logical DB shared dedicated Redis и безопасное offline назначение не доказано
- **THEN** live restore не выполняется; native checker и непроверенная загрузка явно различаются

### Requirement: Честные ограничения восстановления
Отчёт MUST показывать actual age, component intervals, неатомарность online PG/Redis/files и требование закрытых workers/reconciliation; hourly настройка не является доказанным RPO. Existing escrow attestation не объявляется retrieval proof.

#### Scenario: Потерян только VPS
- **WHEN** исходное внешнее S3 и доступ к нему сохранены
- **THEN** восстановленные metadata/config позволяют найти медиа; disaster readiness требует доступного offhost recovery key/password

#### Scenario: Потеряны сами объекты S3
- **WHEN** исходный bucket/объекты удалены либо утрачены
- **THEN** этот scope не заявляет восстановление видео; key manifest не называется independent object backup
