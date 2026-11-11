## Why
Оба партнёрских отчёта считают подтверждённые TEST-покупки боевой выручкой: normalizer проверяет среду и магазин, но не сохраняет их. Старые строки нельзя классифицировать текущей настройкой.

## What Changes
Сохранять доверенную identity intent/payment, совместимо завершать старые pending оплаты и включать в финансовую статистику только согласованные LIVE. Историческая классификация — exact provider GET и provenance-only CAS. Не отзывать TEST-кредиты.

## Capabilities
### New Capabilities
- `payment-environments`: происхождение платежей и единая боeвая eligibility.
### Modified Capabilities
Нет изменения публичных API или UI.

## Impact
Native billing/DB/provider и owner/blogger reporting; аддитивная миграция030. Новых сервисов, зависимостей, выплат/списаний нет. Исполнение: `features/payment-environments/`; reminders отдельно.
