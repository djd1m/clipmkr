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
Система SHALL иметь один durable renewal intent/key/request на account/T, сохранять receipt snapshot и existing verified fulfillment. Unknown без ID SHALL повторяться только тем же запросом при действующем согласии и возрасте <23h; далее STOP без нового ключа. Terminal failure SHALL приостанавливать продление без скрытого нового списания.

#### Scenario: Ответ потерян
- **WHEN** provider принял POST, ответ потерян и worker перезапущен
- **THEN** используется тот же intent/key/payload, credits не дублируются, после cutoff новый POST запрещён

#### Scenario: Требуется действие пользователя
- **WHEN** provider вернул confirmation либо исход неизвестен
- **THEN** UI показывает действие по существующей оплате или проверку, не ложный отказ и не вторую оплату

### Requirement: Напоминания ручной покупки
Система SHALL направлять по одному reminder за 3 дня и сутки до T без active/pending продления. Журнал SHALL revalidate срок/согласие/почту, иметь frozen payload/key, bounded retry <23h и не удерживать SQL-lock на сети.

#### Scenario: Ручная покупка меняет срок
- **WHEN** срок изменился после создания reminder и до claim
- **THEN** старое письмо superseded, актуальное планируется по новому сроку

### Requirement: Совместимость и условия
Система SHALL сохранять цены/кредиты/30 суток, ordinary live checkout/webhooks и addon; recurring flag off SHALL блокировать только новые recurring actions. Оферта SHALL отражать добровольность, предупреждение, отключение и in-flight границу.

#### Scenario: Магазин без recurring capability
- **WHEN** обычные live продажи разрешены, но recurring не активирован
- **THEN** manual оплата с обязательным receipt работает, продление не включается
