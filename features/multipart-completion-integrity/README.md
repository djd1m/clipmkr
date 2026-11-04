# Целостность завершения multipart

Статус: ограниченный серверный фикс прошёл авторские unit-проверки и независимое
cross-model ревью; настоящий native convergence закрыт. Выпуск приложения ещё не выполнен.
Модель автора requested `gpt-6.1-sol high`, runtime ID не аттестован.

При uploading сервер сверяет число частей с ceil(declared_bytes / upload_part_size) до Complete.
HEAD размера <=MAX должен совпасть с declared_bytes до Range/БД/очереди, в том числе после
потерянного ответа Complete. Несовпадение даёт conflict409, без фиксации actual_bytes/queued,
расхода, refund или cleanup. Прежний too_large для >MAX сохраняет штатный refund/cleanup.
Ранние queued/admitted retry и чужой404 сохранены; UI/DB schema не менялись.

Документы: [оценка](00_complexity_assessment.md), [требования](01_requirements.md),
[план](06_implementation_plan.md), [авторская проверка](08_qe_report.md).
Дельта OpenSpec: openspec/changes/multipart-completion-integrity/.

Реальный K2: PASS после исправления task-line ссылок. K1: no-new-production-names.
RED на исходном video.ts: 9 failed / 22 passed / 0 skipped. GREEN: 31/31 целевых и 57/57
вместе с существующими upload unit tests (6 файлов), 0 skipped. Финальный unit GREEN и lint повторены на Node22.23.4; typecheck: exit0.
OpenSpec strict validate: exit0.
Закрытые полные логи находятся у координатора вне Git; в них нет production env/media.

Не доказаны этим блоком: реальные гонки PostgreSQL, S3/MinIO integration, браузерная приёмка,
live payments/processing, восстановление уже склеенного объекта неправильного размера.
Реальная загрузка владельца не читалась и не изменялась. Независимый проверяющий
requested `gpt-6-astra xhigh` в чистой сессии самостоятельно выполнил 54/54 unit;
подробности и границы — в отчёте проверки. Новую версию на Cloud.ru можно доставить
только после ручной приёмки владельца на существующем VPS-стенде.
