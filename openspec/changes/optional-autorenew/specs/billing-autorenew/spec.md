## ADDED Requirements

### Requirement: Отдельное добровольное согласие
Система SHALL включать продление Start/Pro только по отдельному unchecked opt-in при оплате с подтверждённой почтой, immutable условиями и verified succeeded платежом с сохранённым методом. Токен SHALL оставаться server-only и связанным с merchant/test.

#### Scenario: Ручная покупка
- **WHEN** покупка сделана без opt-in, в том числе с неподтверждённой почтой
- **THEN** обычная оплата доступна и новое продление не включается; addon всегда одноразовый

#### Scenario: Позднее подтверждение после отзыва
- **WHEN** source payment подтверждается после cancel или замены согласия
- **THEN** оплаченный пакет выдаётся один раз, а отозванное согласие не активируется

### Requirement: Предупреждённое продление очереди
Система SHALL списывать согласованную сумму за новый 30-дневный base пакет после всей committed оплаченной base-очереди, только при current accepted письме не позднее T−24h; целевое предупреждение T−72h. Первичный dispatch SHALL происходить в T…T+5min без позднего catch-up.

#### Scenario: Письмо не принято вовремя
- **WHEN** нет подходящего accepted receipt либо сменились срок, условия или verified адрес
- **THEN** автоматическое списание не начинается, продление приостанавливается и доступна ручная покупка

#### Scenario: Новый пакет куплен заранее
- **WHEN** manual base success committed до renewal dispatch
- **THEN** следующий срок учитывает эту покупку, старые notices и dispatch больше не действуют

### Requirement: Простое отключение
Система SHALL позволять отключить active или pending продление из кабинета одним действием. Отключение SHALL запрещать новые dispatch и дальнейшие POST-повторы; ранее durably authorized попытка может завершиться, что показано в UI.

#### Scenario: Отключение раньше dispatch
- **WHEN** cancel committed до dispatch transaction
- **THEN** нет payment POST и после reload продление выключено

### Requirement: Единственный платёж и честный исход
Система SHALL хранить один renewal intent/key/request на account/T и existing receipt/fulfillment. Unknown без ID SHALL восстанавливаться только same-key при действующем согласии и возрасте <23h, затем STOP без нового ключа. Terminal failure SHALL приостанавливать продление без скрытого нового списания.

#### Scenario: Ответ потерян
- **WHEN** provider принял POST, ответ потерян и worker перезапущен
- **THEN** используется тот же intent/key/payload, credits не дублируются, после cutoff новый POST запрещён

#### Scenario: Требуется действие пользователя
- **WHEN** provider вернул confirmation либо исход неизвестен
- **THEN** UI показывает действие по существующей оплате или проверку, не ложный отказ и не вторую оплату

### Requirement: Письмо о подтверждённом отказе
Система SHALL атомарно фиксировать confirmed renewal failure, pause связанного current consent и durable notice с unique intent/kind. Unknown/pending SHALL не создавать failure notice. Duplicate observation и crash SHALL не терять и не дублировать событие; отсутствие sender сохраняет outbox до восстановления, после bounded exhaustion остаются UI/оператор без обещания доставки.

#### Scenario: Подтверждённый отказ и сбой почты
- **WHEN** renewal canceled подтверждён canonical GET, затем процесс падает или mail provider недоступен
- **THEN** committed failed имеет один durable failure notice; restart/recovery отправляет его по тому же событию/key, pending/unknown payment такого письма не создают

### Requirement: Напоминания ручной покупки
Система SHALL направлять по одному reminder за 3 дня и сутки до T без active/pending продления. Identity SHALL быть account/T/offset независимо от адреса. До первого dispatch адрес заменяется в той же записи; после accepted нового send нет, после sending/unknown смена адреса прекращает retries без нового события/key. In-flight письмо не отзывается. Журнал SHALL revalidate, freeze payload/key после первого claim, ограничивать retry <23h и не держать SQL-lock на сети.

#### Scenario: Ручная покупка меняет срок
- **WHEN** срок изменился после создания reminder и до claim
- **THEN** старое письмо superseded, актуальное планируется по новому сроку

#### Scenario: Адрес изменён после начала напоминания
- **WHEN** reminder уже accepted, sending или unknown и подтверждён другой email
- **THEN** тот же account/T/offset не создаёт второе событие; accepted не повторяется, дальнейшие sends на прежний адрес подавляются

### Requirement: Совместимость и условия
Система SHALL сохранять цены/кредиты/30 суток, ordinary live checkout/webhooks и addon; recurring flag off SHALL блокировать только новые recurring actions. Оферта SHALL отражать добровольность, предупреждение, отключение и in-flight границу.

#### Scenario: Магазин без recurring capability
- **WHEN** обычные live продажи разрешены, но recurring не активирован
- **THEN** manual оплата с обязательным receipt работает, продление не включается

### Requirement: Возврат и удаление аккаунта прекращают новые списания
Система SHALL под account lock требовать active account и отсутствие unresolved verified base refund review при каждом dispatch/retry и новом opt-in. Полный и partial base refund SHALL паузить consent, suppress периодические billing notices, сохраняя native grants/T до операторского решения. После review права/T перечитываются, manual доступен по existing политике; auto требует нового согласия. Это инженерный default.

#### Scenario: Возврат или erasing раньше dispatch
- **WHEN** verified base refund review либо erasing committed первым
- **THEN** новый payment POST запрещён; при erasing/deleted late success даёт только native financial review без grant/new PII/token

#### Scenario: Dispatch committed раньше запрета
- **WHEN** refund или erasing следует за durable authorization
- **THEN** ранее разрешённый in-flight может завершиться; новых retries нет, результат сверяется native ledger без реактивации consent
