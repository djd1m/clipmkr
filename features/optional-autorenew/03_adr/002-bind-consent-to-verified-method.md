# ADR-002: Связать согласие с проверенным способом оплаты

## Status
proposed; обратимо до K1/K2. Revisit: token lifecycle/merchant/vault. FR-1–3,6,12; NFR-1,4.

## Context / Decision Drivers
Saved card не доказывает согласие на цену/период; late success может опередить cancel; TEST token неприменим к LIVE. D1/high — условия/отзыв; D2/high — token provenance; D3/medium — минимальные данные.

## Considered Options
| Вариант | За | Против | D1/D2/D3 |
|---|---|---|---|
| A Boolean/token на account | Минимум колонок | Нет terms history; late overwrite | низкий/средний/высокий |
| B billing_consent | История и явный lifecycle | Таблица/constraints/erase | высокий/высокий/высокий |
| C Event sourcing | Полный replay | Reducer/проекции сверх нужды | высокий/высокий/низкий |

## Decision / Rationale
B: immutable snapshot account/source intent/SKU/price/RUB/credits/30d/offer+consent revision/text hash/agreed_at/merchant/test; mutable state/timestamps/reason и bounded opaque method_id/type, server-only. Partial UNIQUE account для pending|active. Новое pending supersedes старое; unchecked покупка existing consent не меняет. Cancel pending тоже окончателен; revoked/superseded/paused не возвращаются active.

Verified email и включённая capability обязательны для opt-in. Новый initial request save_payment_method=true; новый manual/addon=false (boolean). Legacy intents без method snapshot не дооснащать: bound GET сохраняется, unbound unknown сверяется до merchant recurring activation. TEST→LIVE backfill/token copying запрещены.

Canonical GET с existing merchant/test/order/amount validation + succeeded/paid/saved=true даёт token для pending→active в fulfillment transaction. Повтор уже fulfilled **того же source intent** допускает idempotent активацию лишь current pending; другой/старый intent — нет. Ошибка transaction не теряет payment event, webhook повторяется. saved=false выдаёт оплаченный пакет, consent paused. Raw card payload не сохраняется.

Один proposed `N5_AUTORENEW_ENABLED=false` по умолчанию; live включается только после фактической merchant capability проверки. Off блокирует новые сохранения/renewals, сохраняет cancel/GET/reconciliation/manual. Drift price/credits/cadence/terms revision → pause и новое opt-in; dispatched request неизменен.

## Consequences
Плюс: audit consent и защита от stale webhook. Цена: при смене согласия старое выключено сразу, новое pending до оплаты; UI показывает это. Functional token/request store закрыт от API/logs; erase — existing policy, юридические сроки не придумываются. Follow-up нет. After-action: billing owner через месяц live, review пауз/отзывов/PII.

## Confirmation / Shift-left
Method: API negative+real PG constraints+forged socket GET. Monitoring: activation_rejected/paused/merchant_mismatch. Success:0 activation без current consent+canonical saved;0 tokens API/logs; manual unverified работает. Owner: author и independent security QE. Load-bearing: ownership/revision/cancel survive late success. Checks: `tests/autorenew-consent.integration.test.ts`, `tests/autorenew-provider.test.ts`; QT-1–4,12,14–16.

High 3×5: чужой token/order → canonical ownership; late webhook → compare pending under account lock; TEST→LIVE → scope mismatch positive/negative controls. Изоляция real PG/socket. BDD: Given pending revoked, When source payment succeeds/saved, Then один grant, consent revoked,0 renewal POST. NOT RUN.
