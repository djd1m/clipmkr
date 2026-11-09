# Протокол проверок переноса

09.11.2026. Итог: NOT READY FOR CUTOVER. Runtime не менялся.

| Требование/риск | Проверка | Факт | Ограничение |
|---|---|---|---|
| FR1/неверная цель | DNS/IP + docker DNS из web + read-only PG | source39accounts/42video/71clip; stage1/0/0 | Последовательные live-срезы, не финальный freeze |
| FR6/потеря данных | pg_dump четырёх БД + pg_restore во временные БД существующего PG | 4×exit0, SHA-256, restore4×0; временные БД удалены | Полная сверка строк одного исходного snapshot NOT RUN |
| FR3/двойная запись | отдельный архитектурный разбор | Риск watchdog/retention и Redis подтверждён кодом | Freeze/relay/queues NOT RUN |
| FR2/S3 | сохранение namespace в ADR | План | HEAD/GET/media inventory NOT RUN |
| FR4/приёмка | основной CJM + почта/TEST checkout/support | План | E2E NOT RUN |
| FR5/DNS | отдельная ручная команда после приёмки | Переключения не было | TLS на новой цели NOT RUN |
| FR7/rollback | разделены R1/R2 | План | Обратный restore NOT RUN |

Изолированная архитектурная консультация Astra xhigh получила документы/код без секретов, runtime не проверяла. Она не является независимым код-QE или closure QCSD. Обслуживающая модель не аттестована.
Раннее независимое ревью документов Terra xhigh: NOT READY FOR EXECUTION/CUTOVER; выявлены открытые условия полноты support, freeze/late webhook, R2/off-host состояния, S3, изоляции и TLS/ресурсов. Они перечислены в плане, не объявлены закрытыми.

Архив uploads поддержки сохранён, tar-list0, каталог на срезе пуст. Backup Redis и S3 ещё не снят.

K1/K2, QCSD, код/QE/fleet checkpoints не выполнены. Положительные исторические receipts других фич не используются как допуск этого переноса.

## Code/spec anti-drift текущего подготовительного среза
Продуктовый код, Compose, origin, DNS, финансовые строки и рабочие БД не менялись. Новые документы/OpenSpec не объявляют перенос выполненным; структурная OpenSpec validation и git diff --check проверяются отдельно. Приватные backup/receipt находятся вне Git. Проверка восстановления затрагивала только созданные для неё временные БД внутри существующего PostgreSQL; они удалены после успешной проверки.
