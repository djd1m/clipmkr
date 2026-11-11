## Why
Владелец поручил реализовать разделение TEST/LIVE и ручные напоминания за3дня/сутки. Оферта уже поставлена one-time-offer9312564; здесь только оставшийся backend после payment-environments.

## What Changes
- Reminder о конце непрерывной цепочки фактически выданных пакетов, полный tail включая TEST/unknown; send требует verified LIVE proof.
- Native journal031/SupportMailer/watchdog, bounded dispatch, flag default false.
- Только отсутствующий explicit save_payment_method:false; ноль автоматических payment POST.

## Capabilities
### New Capabilities
- `manual-billing-reminders`: два письма с GET-ссылкой на ручную покупку.
### Modified Capabilities
Нет изменения прав,цен,receipt,checkout API,оферты или UI.

## Impact
Requirements/QCSD нормативного контракта могут идти параллельно завершению payment-environments. До кода/031 обязательны merge final accepted030 source и фактический recheck/pins; поставка2 предшествует поставке3. Additive031 journal и existing config/mail. Feature-adr владеет исполнением/ADR/QE; no recurring/deps/services.
