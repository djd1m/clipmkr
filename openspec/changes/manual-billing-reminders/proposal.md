## Why
Владелец отменил автоплатежи11.11.2026. Требуются ручные напоминания за3дня/сутки и правдивое описание разовой покупки; нынешний LIVE checkout сохраняется.

## What Changes
- Reminder о конце единого оплаченного периода с ручным CTA; один event на account/end/offset.
- Reuse journal/SupportMailer/watchdog; flag default false.
- YooKassa save_payment_method=false; narrow legal draft §6.3/7.7/7.8 и дата по решению владельца.

## Capabilities
### New Capabilities
- `manual-billing-reminders`: уведомления об окончании оплаченного периода без автосписания.
### Modified Capabilities
Нет изменений grant/receipt/цен/checkout API.

## Impact
Одна journal migration; existing mail/config/watchdog/provider adapter; narrow legal replacement fixture. Feature-adr authoritative execution: features/manual-billing-reminders. No recurring subsystem/deps/UI actions.
