## ADDED Requirements

### Requirement: Trusted payment provenance
Система SHALL хранить payment_environment unknown/test/live и merchant на intent/payment, provider на intent, получая новые identity только от server provider и canonical remote проверки; known identity SHALL быть неизменяемой.

#### Scenario: Verified LIVE and TEST
- **WHEN** canonical provider подтверждает id, order, amount, raw.test и recipient.account_id
- **THEN** сохраняется проверенная identity; TEST и fake не становятся LIVE

#### Scenario: Forged identity
- **WHEN** клиент добавляет environment, merchant или provider в checkout body либо remote shop/test не совпадает
- **THEN** запрос отвергается без выдачи чужих credits или redirect

### Requirement: Unified live reports
Оба отчёта SHALL считать покупки, плательщиков, выручку и предварительную комиссию только из совпадающих LIVE payment/intent с прежними verified-sale условиями. Нефинансовые counters, ставки, owner month/Moscow и blogger all-time SHALL сохраняться; паритет только одинаковой области, payer distinct неаддитивен по кодам.

#### Scenario: Mixed history
- **GIVEN** валидные LIVE, TEST, unknown и refunded/review покупки
- **WHEN** owner и blogger читают totals и разбивки
- **THEN** финансовые counters включают только LIVE, без удвоения; visits/registrations/activity неизменны

#### Scenario: Period and distinct oracle
- **GIVEN** один payer: Oct A=99000, Nov A=399000+B=149000 LIVE плюс TEST/unknown
- **WHEN** читаются оба API/render consumers
- **THEN** owner Nov=548000/2 payments/1 payer, blogger all=647000/3 purchases; code и commission expectations проверяются отдельно по Q-01 в01

### Requirement: Safe retries and legacy completion
Retry/bind/fulfill SHALL сверять id/order/amount/identity; refund SHALL применять RISK-003 matrix в05: erased existing payment проверяется по canonical provider ID/amount и known identity, без восстановления order/credits. Unknown остаётся unknown; before-success tombstone не перелинковывается. Недостаточное proof: retryable/reconcile без writes.

#### Scenario: Legacy pending and callback before bind
- **GIVEN** pending unknown intent старой версии
- **WHEN** exact canonical remote proof приходит раньше bind либо через retry GET
- **THEN** identity повышается атомарно и grant выдаётся максимум один раз

#### Scenario: Identity mismatch
- **WHEN** runtime shop/mode сменился или событие rebound к чужой intent
- **THEN** нет финансовой мутации/чужого redirect; ошибочный event не блокирует правильный повтор

### Requirement: Evidence-only history classification
Старые строки SHALL начинать unknown. Исторический backfill SHALL использовать exact read-only provider GET и атомарный provenance-only CAS; дата/config не являются proof.

#### Scenario: Historical classification under concurrency
- **WHEN** оператор проверяет explicit private кандидаты и concurrent checkout создаёт LIVE
- **THEN** backfill меняет только доказанную unknown provenance, сохраняет LIVE, amounts/status/credits/attribution; повтор no-op, конфликт без записей

#### Scenario: Unverified and refunded legacy history
- **WHEN** proof недоступен либо старый unknown платёж получает проверенный возврат
- **THEN** unknown не включается в отчёт; legitimate refund по exact linkage сохраняется без автоматического переписывания terminal provenance

### Requirement: Safe writer cutover and serialization
Cutover SHALL остановить все old payment writers/in-flight и подтвердить zero их PG sessions до030; mixed writers/DB rollback после новых денег запрещены. Все операции SHALL соблюдать RISK-002 payment advisory→account→intent→payment/CAS с reread; conflict откатывает event claim.

#### Scenario: In-flight and held-lock control
- **WHEN** старый callback ещё in-flight либо другая PG TX удерживает account lock
- **THEN** cutover ждёт drain, конкурентные операции ждут lock; после освобождения новый writer даёт максимум один grant, конфликт не оставляет writes/claim
