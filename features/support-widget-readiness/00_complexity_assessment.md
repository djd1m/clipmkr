# Маршрутизация: native widget readiness
Task kind: bugfix

Тир S, сумма 7: четыре code targets = 2; один домен support = 1; новых интеграций = 0 (1); breaking changes = 0 (1); новых моделей = 0 (1); новых сквозных concerns = 0 (1). Override отсутствует. Active steps: 0→1→6→7→8. Новая integration/auth architecture не вводится.

Бюджет: требования/план 5 минут, реализация 10–15, проверки 5–10; review и поставку ведёт root отдельно. Реальный объём включает адаптацию существующего close browser fixture к handshake, поэтому четыре файла честно учтены, сумма остаётся S по modules/00.

Recall: pinned dz recall «support Libredesk widget readiness iframe» с --project текущего WT, --json --limit 5, exit0, [] (11.11.2026). Нулевой результат не выдаётся за урок.

Фактический дефект: cold identify вызывает setUser после DOM insertion до установки child listener; native exchange не начинается. Warm повтор работает. Источник — private root diagnostic и inspected served SDK: setUser немедленно postMessage SET_JWT_TOKEN; VUE_APP_READY запускает SESSION_DATA, WIDGET_LOADED означает полную готовность. DOM attachment не доказывает готовность.

Checkpoint/router approval pending root review; наличие документа не является approval.

## R2: актуальная маршрутизация repair batch
11.11.2026. Score8/S: четыре editable targets2, один support domain1, новых integrations1, breaking1, моделей1; один затронутый existing cross-cutting concern identity/privacy2. Новых auth mechanisms/моделей/сервисов нет. Две readonly semantic dependencies не считаются изменёнными файлами. Active0→1→6→7→8 сохраняются. R1 native QER-1 остаётся unresolved; R2 — один batch по существующей feature, не новая история и не reset циклов.
