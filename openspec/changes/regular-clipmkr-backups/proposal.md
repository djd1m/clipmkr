# Регулярные резервные копии Clipmkr после переноса

## Why
Регулярный corp backup не включает активные БД/Redis/mounts Clipmkr. Ручные свежие PG-копии уже есть на другом сервере, но не обеспечивают расписание и полный заявленный охват.

## What Changes
Добавить ограниченный capture adapter, manifest и собственный hourly systemd unit/timer поверх установленных pg_dump/Redis/restic0.16.4/rclone. Использовать две действующие encrypted immutable offsite copies без globalforget/prune и чужих hooks. Проверить один текущий offsite snapshot и изолированный restore; сохранить явные ограничения online consistency, ключей восстановления и отсутствия independent S3 object backup.

Уточнение перед реализацией: bounded own staging/capacity guard, валидный source-bound completed prefix spend JSONL; обязательны durable uploads/config/spend, rebuildable stt/llm/video scratch явно исключён. Повторный originating review и gates ещё требуются.

## Impact
Только эксплуатация Clipmkr; приложение/UI/schema/DNS/live payments/foreign services не меняются. Выполнение по `features/regular-clipmkr-backups/`; approval, native dz K1/K2 и cross-model QE остаются обязательны. Этот proposal не заявляет их прохождение.
