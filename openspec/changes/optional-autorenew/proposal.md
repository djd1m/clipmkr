## Why
Владелец 11.11.2026 запросил добровольное автопродление и напоминания для ручной покупки. Текущий UI обещает разовую покупку, а оферта ошибочно описывает автоматическое включение. Нужны единые условия и отдельное согласие.

## What Changes
- Start/Pro: отдельный unchecked opt-in, verified email, сумма/дата/30 суток, простое отключение.
- Один renewal после всей оплаченной base-очереди; предварительное письмо, честный исход и отсутствие скрытых retries после отказа.
- Без продления — напоминания за 3 дня/сутки. Addon одноразовый.
- Оферта согласуется с фактическим поведением; цены/кредиты/30 суток сохраняются.

## Capabilities
### New Capabilities
- `billing-autorenew`: согласие, автоматическое продление и напоминания.

## Impact
Existing billing/provider/credits/watchdog/Resend/UI/legal; 2 новые таблицы (consent/notice), existing payment_intent extension. Нет новых runtime/dependencies. Source/test targets и gates — `features/optional-autorenew/`. Макеты и код ещё не утверждены; обычные live-продажи включаются владельцем отдельно от recurring capability.
