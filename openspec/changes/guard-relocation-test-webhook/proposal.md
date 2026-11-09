# Proposal

## Why

Открытое `qe-primary-01` переноса Clipmkr установило несовпадение: поздний проверенный TEST payment с отсутствующим QA intent получает200 и занимает payment_event. Требуется обещанный503 до записи, чтобы source event не был подтверждён QA-копией.

## What Changes

- Узкий QA callback adapter до существующих payment/refund consumers; неизвестная локальная пара intent/payment всегда503 без ledger writes.
- Отдельный Next route для уже предусмотренного внешнего `/api/webhooks/yookassa-test`; канонический production route и финансовые операторы прежние.
- Real-DB regression и точный route inventory guard; возможность drain после отзыва checkout исключения.

## Capabilities

### New Capabilities

- `qa-payment-callback`: изолированный допуск TEST callback к локальному QA intent до записи. Опубликованного main spec пока нет (`openspec list --specs` пуст); это детализация принятого migration acceptance.

### Modified Capabilities

Нет. Parent change `relocate-clipmkr-to-workspace-vps` и его исходные условия не редактируются этой зависимостью.

## Impact

Четыре code targets в authoritative `features/guard-relocation-test-webhook/06_implementation_plan.md`: QA adapter, route, integration test и existing payments route guard. Нет schema/provider/DB consumer/UI/production runtime изменений. Позднее parent отдельно привяжет derived QA image и Caddy route в своём сохранённом QE цикле. Этот change не закрывает `qe-primary-01` и не разрешает merchant/DNS/source операции.
