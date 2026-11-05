## ADDED Requirements

### Requirement: Принятый релиз объединяет два datasets с сохранением данных
Система MUST перенести принятое после UI/recovery/E2E и ручной приёмки приложение clipmkr.ru на c.clipmkr.ru, сохранив все существующие данные c и разрешённый полный source graph. Каждая строка/объект MUST иметь provenance и проверенный исход; silent skip/replace/reset MUST NOT применяться. Смена основного DNS не входит в эту дельту. Связь: FR-1/2.

#### Scenario: В target уже есть данные
- **GIVEN** непустые source и c datasets
- **WHEN** готовится консолидация
- **THEN** target данные сохраняются, source получают явный mapping и полную сверку
- **AND** неразрешённые конфликты блокируют завершение; архив спорных строк не считается восстановленным пользовательским доступом

### Requirement: Личность и доступ сохраняются без автоматического merge по email
Система MUST сохранять правильных владельцев/PK/FK/semantic references, verified provenance и пригодные credentials. Совпадение email/UUID MUST NOT автоматически объединять владельцев. Source active sessions и reset/verify tokens MUST NOT становиться активными c credentials. Решение о спорном ownership/паролях/привилегиях MUST быть явным. Связь: FR-3/4.

#### Scenario: Одинаковый email у разных идентификаторов
- **GIVEN** два аккаунта с одинаковым email и разными UUID либо credentials
- **WHEN** нет проверенного решения об их тождестве
- **THEN** данные не объединяются, конфликт сохраняется для решения владельца
- **AND** чужие данные недоступны, source token не получает c session

### Requirement: Денежные и кредитные события сохраняют один эффект
Система MUST сохранять grants/charges/allocations/reservations/expiry/offer snapshots и provider/shop/mode происхождение. Один внешний платёж MUST давать один эффект; конфликт внешних ID MUST NOT подавляться silent conflict ignore. Поздние callbacks/refunds/order IDs MUST обрабатываться согласованным единственным маршрутом. Настоящие списания MUST NOT включаться переносом. Связь: FR-5/6.

#### Scenario: Повтор платежа после переноса
- **GIVEN** ранее исполненный intent и связанный grant
- **WHEN** webhook повторён после cutover или import повторён
- **THEN** второго grant нет и история первого сохранена
- **AND** неизвестный shop/mode либо несовместимый order mapping блокирует обработку до сверки

### Requirement: История рефералов и публичных ссылок сохраняет смысл
Система MUST сохранять коды/attribution/consent/revocation/expiry и payment referral snapshot с правильными владельцами. Месячные отчёты MUST сохранять native Moscow interval и20/30/null правила без повторного учёта. Старые ссылки MUST разрешаться с учётом origin; одноимённые codes MUST NOT перенаправлять на чужой контент. Связь: FR-7/8.

#### Scenario: Два одинаковых code и историческая комиссия
- **GIVEN** codes из разных origin и платежи с историческим referral snapshot
- **WHEN** проверяется compatibility
- **THEN** каждая ссылка ведёт к прежней допустимой сущности, конфликт не скрывается generic redirect
- **AND** регистрации/активность/плательщики/выручка и оценки20/30/null сверяются без смены attribution

### Requirement: Объекты переносятся без overwrite и утечки доступа
Система MUST использовать exact DB whitelist и mapping logical/physical namespaces, проверять размер/SHA-256 каждого перенесённого объекта и сохранять target bytes. Private URLs MUST регенерироваться после авторизации. Retention/deletion MUST сохраняться, versioning MUST NOT включаться вопреки native erasure. Связь: FR-2/9.

#### Scenario: Совпавший ключ с другими bytes
- **GIVEN** source key совпадает с target key, но содержимое отличается
- **WHEN** перенос пробует записать объект
- **THEN** target не перезаписывается, требуется отдельный безопасный key mapping
- **AND** непроверенные или отсутствующие bytes не публикуются как готовый результат

### Requirement: Восстановление и переключение проверяются до допуска записи
Система MUST иметь независимые backups обоих datasets и доказанный restore в уникальном scratch существующего PG16, без n5_test и новой инфраструктуры. Все writers/delta/deletions/late events MUST учитываться при final fence. После новых target writes rollback MUST сохранять acknowledged изменения; слепой возврат старого dump MUST NOT применяться. Связь: FR-10/11.

#### Scenario: Откат после нового платежа или видео
- **GIVEN** на c после переключения появились новые подтверждённые записи
- **WHEN** требуется rollback
- **THEN** сначала фиксируется новое состояние и выполняется reconciliation/forward recovery
- **AND** старый dump не заменяет эти записи, source не запускается вторым writable authority

### Requirement: Приёмка покрывает обоих пользователей и сопровождение
Система MUST проверить вход, владение, просмотр/скачивание прежних клипов и новый полный CJM для обоих datasets, ограничения90/120/custom и2 000 000 000 bytes. Сопровождение MUST включать проверенные backup/restore, наблюдаемость и обслуживание без преждевременного удаления source. Связь: FR-12.

#### Scenario: Пользователь каждого прежнего контура входит после cutover
- **GIVEN** корректно перенесённые аккаунты и медиа обоих datasets
- **WHEN** пользователи входят на c и проходят CJM
- **THEN** каждый видит и скачивает только своё, новые задания и billing работают в своих лимитах
- **AND** результат принят по фактическому evidence, а старые данные не удаляются до отдельного решения
