## ADDED Requirements

### Requirement: Закрытая адресная TEST-сверка
Инструмент SHALL по умолчанию выполнять dry-run; explicit apply SHALL выбирать ровно один
case из закрытого manifest трёх known TEST cases после M-гейтов, QE и live admission.

#### Scenario: Dry-run или ранний отказ
- **WHEN** apply отсутствует или preflight target/manifest/nonce/admission не прошёл
- **THEN** CLI не вызывает DB writers/provider mutations и не создаёт persistent proof/outcome
- **AND** разрешены только SELECT/GET и диагностика; writable audit directory не требуется

### Requirement: Проверка настоящего провайдера
Система SHALL использовать официальный authenticated GET ЮKassa и сверять exact ID/order,
TEST/shop/recipient, RUB/full price. Succeeded SHALL требовать paid=true/captured_at,
canceled — terminal canceled/paid=false, с полным binding существующего intent.

#### Scenario: Несовпадение финансового факта
- **WHEN** обязательное поле отсутствует/неверно, snapshots конфликтуют или API недоступен
- **THEN** typed refusal не создаёт financial rows и не занимает canonical event key
- **AND** provider POST и имитация native notification запрещены

### Requirement: Полная проверка возвратов
Succeeded recovery SHALL проверить все refund pages данного payment, их ID/status/RUB/amount,
refunded_amount и local refunded/review. Любой refund, даже canceled, SHALL запрещать apply.

#### Scenario: Неполное доказательство
- **WHEN** refund найден, cursor/page limit исчерпан или сведения расходятся
- **THEN** операция отказывает без начисления
- **AND** отсутствие refunded_amount/refundable не используется как доказательство нулевого возврата

### Requirement: Атомарные expected guards
Система SHALL повторно проверить frozen owner/active/created/provider ID/price/SKU/offer/grant/
fulfilled под каноническими locks. Начисление SHALL использовать applyVerifiedPayment/fulfillCreditIntentTx.

#### Scenario: Drift после preflight
- **WHEN** под locks обнаружено отличие ожидаемого состояния
- **THEN** typed exception откатывает всю transaction, включая claim/payment/grant
- **AND** CLI не содержит нового SQL writer

### Requirement: Guarded cancellation в закрытом окне
Cancellation SHALL использовать existing markIntentCanceled с optional typed guards только
до S receiver activation, при actual public payments off и доказанном writer/ingress drain.
No-financial guarantee SHALL относиться к locked transition/terminal readback этого окна.

#### Scenario: Подтверждённая отмена
- **WHEN** provider terminal canceled/paid=false, non-null stored payment binding совпал и no-financial checks прошли
- **THEN** только created переходит в canceled без financial event/payment/grant
- **AND** already_canceled допускает лишь полный readback/no-op без утверждения недоказанного авторства

#### Scenario: Недоказанная сериализация или поздний конфликт
- **WHEN** writer неизвестен/в полёте, claim незакоммичен или обнаружен delayed факт другого payment ID
- **THEN** до apply следует refusal, после неизвестного commit или late conflict — indeterminate handoff
- **AND** существующий native journal/review сохраняется, вечного отсутствия будущих строк не обещается

### Requirement: Идемпотентность и происхождение duplicate
Succeeded SHALL использовать canonical key payment_succeeded:<paymentId> текущей DB.
Duplicate SHALL подтверждаться связанным event/payment/intent/grant/period readback без review.

#### Scenario: CLI и native callback в любом порядке
- **WHEN** два обработчика получили один payment
- **THEN** создаются максимум один правильный payment/grant, existing event hash не переписывается
- **AND** аномальный claim или legacy event другой DB не удаляется/переносится ради повторного apply

### Requirement: Честный сохраняемый аудит
После preflight и explicit apply система SHALL сохранить durable immutable API-proof до DB writer.
Собственный succeeded claim SHALL использовать exact hash этого proof; native-first SHALL
сохранить original hash и отдельную API observation с доказанным source исходного применения.

#### Scenario: Native-first или неизвестный источник
- **WHEN** existing event hash не соответствует исходному operator proof
- **THEN** source устанавливается только связанным evidence; неизвестный source остаётся unresolved
- **AND** API observation не объявляется native callback или источником уже существующего event

#### Scenario: Failure proof или crash
- **WHEN** proof не сохранён либо commit/outcome неизвестен
- **THEN** без durable proof DB apply запрещён; unknown COMMIT даёт indeterminate и bounded readback
- **AND** исходный proof используется при replay, начисление не повторяется; canceled audit только external

### Requirement: Измеримый operational admission
Private admission SHALL связывать authority/target/shop/manifest/code с полным writer roster,
freeze/drain evidence, issuedAt/expiresAt и revocation generation; окно SHALL удерживаться до
resolved commit/readback. Отзыв/expiry SHALL проверяться после locks и перед COMMIT.

#### Scenario: Потеря действительного freeze
- **WHEN** admission missing/stale/wrong-scope/revoked, writer неподконтролен или drain недоказан
- **THEN** apply запрещён; unknown COMMIT сохраняет freeze до разрешения результата
- **AND** PG lock не выдаётся за защиту от внешнего refund после release

### Requirement: Ограниченный бюджет исполнения
Run SHALL иметь monotonic 60s budget: ≤40s preflight/API/proof, ≤10s transaction, ≤10s readback.
Каждый GET SHALL быть ≤5s/remaining, refund pages≤10; same-client PG lock/statement ожидания
и вся transaction SHALL быть ограничены optional controls existing helper.

#### Scenario: Deadline или потеря ответа COMMIT
- **WHEN** API/lock/connection исчерпали бюджет либо результат COMMIT неизвестен
- **THEN** незавершённый writer не оставляется скрыто работающим, connection не возвращается как исправный
- **AND** unknown COMMIT не называется rollback; readback ограничен, blind re-apply запрещён

### Requirement: Сохранение canonical периода
Captured_at и canonical scheduling SHALL сохраняться. Expected period SHALL проверяться
после fulfillment до COMMIT; expired addon/неожиданный base schedule/overlap SHALL давать
rights_review_required и полный rollback без auto-shift/компенсации/второго writer.

#### Scenario: Слишком позднее восстановление
- **WHEN** период уже истёк, неожиданно сдвинут либо истёк во время run
- **THEN** M отказывает/эскалирует root без финансового commit и без нового начисления при replay
- **AND** existing native-first expired result сохраняется как факт, но paid usage/CJM PASS не объявляется

### Requirement: Runtime и полномочия
CLI SHALL работать на controller Node 22 через закрытый SSH tunnel; actual PG identity/
database/schema/user SHALL проверяться на write connection. Secrets SHALL не попадать в argv/Git.

#### Scenario: Неверная DB или отсутствующая user-auth
- **WHEN** actual DB не совпала или auth владельцев canceled не установлен
- **THEN** wrong DB запрещает apply; operator authority остаётся отдельным OS/SSH полномочием
- **AND** нет fake session/password reset; web/worker/source/compose/Resend/schema не меняются

### Requirement: Раздельный S/M handoff
M SHALL передать три resolved terminal readback с честным source, без native first acceptance.
S canary SHALL требовать отдельно принятую поправку, exact dependency hashes/review и admission;
его реализация SHALL оставаться вне M.

#### Scenario: Полнота canary observation
- **WHEN** S допускает новую TEST creation после M и route/origin/timer readiness
- **THEN** полный baseline и конечный snapshot после подтверждённого checkout freeze/in-flight drain учитывают все creations
- **AND** ровно один expected intent позволяет только native acceptance; лишний/unknown intent или потеря полноты требуют abort/drain всех
- **AND** stale dependency запрещает handoff до нового prepare/review; API-proof не закрывает native gate
