# ADR-001: Использовать native intent для единственного продления

## Status
proposed; обратимо до K1/K2. Revisit: multi-item/proration/refunds/смена провайдера. FR-4,6–9,13; NFR-2,3.

## Context / Decision Drivers
Есть durable checkout, verified ledger и fulfillment. Worker добавляет cancel/manual/crash гонки; SQL+HTTP не атомарны. D1/high — один financial fact; D2/high — отключение/очередь периодов; D3/medium — без второго ledger/runtime.

## Considered Options
| Вариант | За | Против | D1/D2/D3 |
|---|---|---|---|
| A Native intent+dispatch | Existing receipt/refund/credits | Новые constraints/states | высокий/высокий/высокий |
| B Отдельные invoice/attempt/payment | Независимое развитие invoicing | Дублирует identity/fulfillment | средний/высокий/низкий |
| C Redis-only schedule | Простота worker | Потеря финансовой identity при сбое | низкий/низкий/высокий |

## Decision / Rationale
Выбран A: `payment_intent.kind=renewal`, immutable T/consent/request, UNIQUE(account,T) независимо от revision/SKU; `intent.id` — единственный provider key. Cancel/failed/unknown intent не удалять ради повтора. Existing receipt/offer/referral snapshots обязательны.

В [T,T+5min] account transaction revalidates очередь/active consent/current offer/merchant/verified email/timely accepted notice; создаёт intent+dispatch_at+lease и commit. Это граница разрешения вызова. Cancel-first запрещает dispatch; dispatch-first может завершиться после cancel. Дополнительный check перед fetch уменьшает окно, но не создаёт SQL+HTTP atomicity. Сеть вне transaction.

Unknown без ID: ≤3 same-body/key transport attempts, ≥1h, age<23h и consent/flag/scope всё ещё разрешают. Начальная попытка только в 5min window; recovery начатой — до cutoff. Cancel/replacement/cutoff/mismatch запрещает POST, переводит review. Bound ID — GET без POST cutoff; terminal canceled — pause, без новых попыток; confirmation — действие пользователя по тому же intent. Достоверные часы обязательны.

Manual commit до dispatch меняет T/notice. После dispatch concurrent отдельные success дают два последовательных периода через existing fulfillment; late success после cancel выдаёт права, не согласие. Новый base checkout при unresolved renewal блокирован, bound manual продолжение/addon работают. T учитывает все future base grants, исключает addon.

## Consequences
Плюс: одна financial truth. Цена: unknown блокирует новую base покупку и требует сверки; cancel не отменяет уже разрешённый внешний вызов. 23h cutoff предполагает clocks+process pause+remote delivery<1h запаса; 5s timeout не отменяет remote side effect. Follow-up ADR сейчас нет. After-action: billing owner/координатор через месяц первого live recurring цикла.

## Confirmation / Shift-left
Method: real PG barriers+localhost socket accept/drop+restart. Monitoring: unknown/review/expired lease и duplicate constraints. Success: один account/T/key, cancel-first/cutoff=0 POST, один grant/payment. Owner: author; independently QE. Load-bearing: durable identity/cancel linearization. Checks: `tests/autorenew.integration.test.ts`, mutation guards.

Critical 4×5: crash/parallel duplicate → unique identity/frozen request. High 3×5: cancel race → обе PG очередности; cancel завершается пока socket held. High 3×5: provider outage → unknown/cutoff без credits. Изоляция настоящей DB/socket возможна. BDD: Given dispatch committed и ответ потерян, When restart+cancel, Then нет нового POST/key, verified late success применится один раз. QT-5,8–12 — точные оракулы; NOT RUN.
