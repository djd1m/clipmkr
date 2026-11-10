# Инвентаризация переиспользования

Дата10.11.2026; read-only, backup/restore/copy не запускались этим planning заданием.

| Нужда | Канонический блок | Решение и граница |
|---|---|---|
| Двигатель encrypted snapshot | установленный restic0.16.4; `/opt/corp-infra/backup/scripts/backup.sh:backup_one_capture`, `restic_local` | Вызвать тот же native CLI с existing local.env; не писать движок/шифрование |
| Две offsite копии | `mirror_local_to_offsite` в том же файле; `/etc/corp-infra/backup/{offsite.env,offsite-secondary.env}` | Повторить узкий documented command contract `rclone copy --immutable --checksum` и действующий route/profile. Не использовать `restic copy`: mirrors могут иметь одинаковый repository ID; credential DeleteObject не требуется |
| Сериализация | `/var/lock/corp-backup.lock`, `acquire_run_lock` | Тот же flock удерживается hourly wrapper на capture+snapshot+двух copies и сериализует с existing daily/prune; подключения capture к daily нет |
| Descriptor | текущая corp JSON schema прочитана read-only | Service enum не содержит clipmkr: global registry/rescan не используются и schema не меняется. Собственный trusted root0600 JSON в `/etc/clipmkr/backup/clipmkr.backup-manifest.json` читается только hourly wrapper через минимальный fixed-field parse, без нового framework |
| PG экспорт/проверка | штатные pg_dump -Fc, pg_restore --list; migration tooling / manual audit | Две реальные runtime БД из текущего allocation; прежние архивы не использовать как свежие |
| Redis | native `redis-cli --rdb`, `redis-check-rdb` | Snapshot всего dedicated Clipmkr Redis включает DB2/DB6 и другие его logical DB; не обещать DB-scoped RDB. Не SAVE/FLUSH/RESTORE на shared live daemon |
| Файлы/runtime | фактический activation root + runtime mounts, private compose/support config | Явный allowlist durable main/helpdesk uploads, authoritative model-spend.jsonl, конфигурация, версии. Rebuildable stt/llm/video scratch исключается и явно перечисляется в manifest; не брать весь `/root/.config`, чужие файлы, secret escrow key вместе с backup |
| Bounded own staging | native shared flock, stat/df и ограничения output; существующий root-only каталог | Единственный cleanup owner — hook; ≤2 собственных набора по ≤1 GiB, свободное место ≥8 GiB до capture/≥7 GiB до snapshot. Нет quota daemon или изменения repo retention |
| Spend capture | `apps/worker/src/stt/spend.ts`, `apps/worker/src/llm/spend.ts` | Наблюдаемые writers append JSONL+fsync; сохранять валидный completed prefix с descriptor identity/S/B/hash. SQLite tooling неприменим; writer/приложение не меняются |
| Расписание | существующий systemd + corp timer conventions | Один свой service+timer, почасовой, без новых контейнеров |
| Проверка | существующий Vitest, shell subprocess fixture + installed native tools | Один focused тестовый модуль; native temp restic repo/rclone local dirs доказывают bytes и failure paths, production не используется |
| Предыдущие проекты1–8 | установленный corp backup уже является maintained canonical из общей инфраструктуры | Прикладного нового модуля нет; подтверждённого более подходящего adapter в Clipmkr не найдено. Повторный широкий поиск чужих UI/backend проектов не требуется для native backup integration |

## Установленный опасный side effect

`backup.sh --service` ограничивает только manifest snapshot loop (`run_phase_run`, около995).
После него без service фильтра вызывается `forget_local` (около1038), а `forget_local` (около920) применяет global policy ко всему local repository; затем verify/rescan/post-run. Поэтому `--service clipmkr --phase run` **не подходит** при запрете вмешательства в foreign retention/hooks.
Безопасный bounded adapter берёт shared lock, подготавливает только Clipmkr, вызывает native restic backup и две штатные immutable copies; не source-ит `backup.sh`, поскольку у него исполняемый main.
Самостоятельного безопасного snapshot-only apply phase у установленного скрипта не найдено. Изменение общего corp движка потребовало бы отдельного scope/владельца и сейчас не предлагается.

## Что ещё проверить на месте

Точные версии rclone/PG/Redis и профиль route читаются до установки; не подменять их предположениями. Existing primary+secondary state подтверждает прошлые copies, не этот будущий Clipmkr snapshot. Escrow/password recovery: проверить только metadata/status действующей процедуры и способность прочитать обе offsite copies в независимом recovery контексте; не выводить ключи и не создавать новые IAM/провайдеры. Без этого доказан backup bytes, но не полная VPS disaster recovery.
