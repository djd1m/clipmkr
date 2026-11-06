## ADDED Requirements

### Requirement: Прочитать checkout response до его потери при навигации
QA MUST сохранять actual request/status/body evidence до смены документа без создания дополнительного checkout. Ошибка MUST иметь безопасный diagnostic code; секреты/confirmation URL остаются вне Git.

#### Scenario: Немедленный переход после201
- **GIVEN** настоящий Chrome и локальная синтетическая checkout форма с немедленной навигацией
- **WHEN** тест захватывает ответ единственного POST
- **THEN** original RED на Network.getResponseBody сменяется GREEN с точным request/body binding без второго POST

### Requirement: Восстановить только известную исходную попытку
Восстановление MUST доказывать exact operation/ticket/case, account, browser idempotency key, исходное окно и provider id/metadata/shop/TEST/SKU/amount. Original operator request_key и browser key MUST оставаться различимыми. Recovery MUST записывать собственную provenance и сохранять failed/consumed-unknown историю исходного helper.

#### Scenario: Однозначное pending намерение
- **GIVEN** failed browser.open и одно read-only доказанное TEST pending намерение исходного ключа
- **WHEN** отдельно рассмотренная bounded recovery сверяет все bindings и fresh route/control
- **THEN** она может разрешить только exact известное дальнейшее действие по нему, без нового checkout/ключа/ledger write и без ложного completed старого helper

#### Scenario: Неизвестная или неоднозначная попытка
- **GIVEN** absent/duplicate/mismatched intent, чужой account/shop, изменённые records или неизвестное completion
- **WHEN** оператор рассматривает recovery
- **THEN** STOP до изменения journal authorization или provider и без очистки прежних records

#### Scenario: Исходная попытка истекла до recovery
- **GIVEN** exact original failed-open/consumed-unknown, fresh read-only provider canceled/paid=false/expired_on_confirmation, DB intent=created и complete source-bound BOTH-store proof без target payment/grant
- **WHEN** отдельный terminal-only metadata admission проверяет original identity, actual captured source bytes, fresh control/health, прежние locks и полный canonical cutover с event/delivery/ACK predicates
- **THEN** он может завершить только эту попытку через B1 fence и обе durable reconciliation записи, без pending bound/active_case/callback/session/checkout; failed origin, разные keys и DB status сохраняются, outcome expired_before_recovery не является decline/manual-cancel PASS

#### Scenario: Terminal observation не заменяет полный cutover
- **GIVEN** provider canceled, но identity/source mismatch, неполная event/delivery history, неизвестная relevant event bound или actual event ещё внутри canonical24h
- **WHEN** рассматривается прямой terminal-only reconcile
- **THEN** STOP без closure или нового действия; только provider GET не является webhook event и не создаёт фиктивное24h окно, а intent.created_at не заменяет actual relevant event bound

### Requirement: Сохранить изоляцию и честный результат
Recovery MUST сохранять global-off/sole approved TEST target, source identity, canonical health/revalidate, stable locks,24h event bounds, own-session positive cleanup и запрет historical grant/relay. Pending MUST NOT называться terminal/no_pending, controlled relay MUST NOT называться provider redelivery.

#### Scenario: Повторное или незавершённое восстановление
- **GIVEN** уже consumed recovery или interrupted/partial record
- **WHEN** процесс запускается снова
- **THEN** он сохраняет историю и останавливается до отдельной сверки; новая namespace/покупка не создаются
