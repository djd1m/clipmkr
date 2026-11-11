> DRAFT / IMPLEMENTATION NOT RUN. Root приостановил старый S-сценарий 11.11.2026 до решения о переходе кнопки поддержки в Telegram. Требования и план не согласованы; K1/K2/checkpoint/code admission ещё не выполнялись.

# Переиспользование и затронутые контракты

## Существующие компоненты
clearSupportIdentity, closeSupportWidget, штатные Libredesk.hide/logout и SupportPanel.

## Тесты и guards
Существующие support-widget-ui и support-ui; нужен browser falsifier реального focus→clear и независимой visibility SDK.
