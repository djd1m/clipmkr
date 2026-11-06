## ADDED Requirements

### Requirement: TEST callback использует основной владелец checkout
Система MUST сохранять публичный TEST alias `/api/webhooks/yookassa-test` и canonical handler `/api/webhooks/yookassa`, направляя alias через существующий основной proxy к тому же приложению и business store, которые создали TEST checkout. Только upstream одного handle может измениться; full config других проектов остаётся приватным.

#### Scenario: Единственный upstream delta
- **GIVEN** подтверждены текущие source SHA, main upstream и различие прежних business DB
- **WHEN** оператор готовит candidate
- **THEN** alias, rewrite, XFF и все bytes вне одного upstream совпадают с исходными, candidate связан с versioned sanitized fragment

#### Scenario: Предотвращение регрессии владельца данных
- **GIVEN** после reload прочитан действующий route и идентичность main business store
- **WHEN** настоящий TEST provider доставляет уведомление созданного основным checkout платежа
- **THEN** основной handler проверяет provider и обрабатывает платёж в основной DB, legacy DB не используется для этого checkout

### Requirement: TEST изоляция и настоящая приёмка
Система MUST сохранять global payments false, единственный утверждённый аккаунт, TEST shop, test=true и ключ с префиксом test_; реальные продажи и изменение доступа других аккаунтов запрещены.

#### Scenario: Ограниченный TEST CJM
- **GIVEN** READ-ONLY preflight подтверждает все TEST ограничения и цепочку IP
- **WHEN** утверждённый аккаунт проходит настоящий TEST checkout, callback, повторное уведомление и повторный вход
- **THEN** подтверждённое состояние/права совпадают с provider, повтор не удваивает начисление, отказ/отмена не начисляют, обычный аккаунт остаётся без checkout

### Requirement: Проверяемое и обратимое применение одного блока
Оператор MUST хранить full backup и его SHA приватно, подтверждать snapshot здоровья/образов/настроек/data identities, выполнять штатные Caddy validate и reload только существующего edge, сохранять inode bind-mounted файла и восстанавливать точные прежние bytes при ошибке validation/reload/health. Приложение, worker, env, DB schema/data, DNS, Cloud и legacy контейнеры MUST оставаться без операционных изменений этой фичи; единственные будущие DB записи — штатные события утверждённого TEST CJM.

#### Scenario: Candidate невалиден
- **GIVEN** полная candidate-конфигурация подготовлена вне действующего файла
- **WHEN** Caddy validate возвращает nonzero
- **THEN** live файл и runtime не меняются, reload запрещён

#### Scenario: Ошибка после записи
- **GIVEN** взята исключительная ops-блокировка и проверены inode/source SHA
- **WHEN** validate записанных bytes, reload или health не проходят
- **THEN** тот же inode получает точные backup bytes с fsync, проходит validate и reload прежней конфигурации; при провале rollback работа прекращается с явным инцидентом
