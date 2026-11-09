# Read-only инвентаризация Redis, S3, multipart и поддержки

Срез 09.11.2026, 19:28–19:31 UTC. Проверки сделаны без остановки writers; PostgreSQL, Redis и S3 наблюдались последовательно. Это исходный baseline и оценка объёмов, не согласованный финальный snapshot и не runtime GO. DNS, контейнеры, конфигурация, объекты, задания и платежи не изменялись.

## Фактические привязки

| Контур | PostgreSQL | Redis | S3 |
|---|---|---|---|
| clipmkr.ru, основной web и 3 worker | `n5-clipmaker-db-1`, БД `n5` | `n5-clipmaker-redis-1`, 172.22.0.2, DB0 | `https://s3.cloud.ru`, `clipmkr-ru`, пустой `S3_KEY_PREFIX` — корень бакета |
| Отдельный legacy TEST / n5.clipmkr.ru | `n5-clipmaker-test-db-1`, БД `n5_referral_paytest_test` | `n5-clipmaker-test-redis-1`, 172.23.0.3, DB9 | тот же endpoint/bucket, `tests/site/` |
| Libredesk | `n5-helpdesk-db-1`, БД `n5_helpdesk` | `n5-helpdesk-redis-1`, 192.168.144.3, DB0 | `upload.provider=fs`, каталог `uploads` |
| Существующий локальный stage | `clipmkr-stage-20261028-db-1`, БД/пользователь `n5` | `clipmkr-stage-20261028-redis-1`, 172.28.4.2, DB0 | медиа в его БД отсутствуют; S3 операции для него не выполнялись |

Основной web — `n5-clipmaker-web-1`; основной `S3_KEY_PREFIX` отсутствует также у STT/video worker. Legacy web `n5-referral-paytest-20261028` и три `n5-blogger-qe-002744d-worker-*` привязаны к отдельной БД/Redis9 и `tests/site/`. Наличие слова TEST не означает отсутствие работающих writers. По уточнению маршрутизации координатора legacy обслуживает отдельное имя n5.clipmkr.ru; его данные сохраняются/архивируются, автоматический перенос legacy runtime не входит в перенос clipmkr.ru. Основной callback нельзя выводить из имени старого контейнера.

Для локального stage Docker labels показывают Compose-файлы `/home/clipmkr/docker-compose.yml` и `/home/clipmkr/ops/cloudru/compose.images.yml`, рабочий каталог `/home/clipmkr`, сеть `clipmkr-stage-20261028_default`. PG: 172.28.4.3, том `clipmkr-stage-20261028_pgdata`, mount `/var/lib/postgresql/data`. Redis: том `clipmkr-stage-20261028_redisdata`, mount `/data`. Host volume paths: `/var/lib/docker/volumes/<имя-тома>/_data`.

Точный исходный env-файл работающего stage не установлен: соответствующий Docker label отсутствует. Подготовленный ранее `/root/.config/clipmkr/release-parity-20261103/existing-local-stage-next/app.sales-off.env` существует, но документация называет его неприменённым профилем; считать его действующей конфигурацией нельзя. Повторный Compose запуск до подготовки фактического runtime-профиля недопустим.

## Очереди и живые клиенты

Основной Redis DB0: 264 ключа на срезе 19:28:16. `active`, `wait`, `paused`, `delayed`, `waiting-children`, `prioritized`, `stalled`, `repeat` и количество lock активных заданий — 0 для всех трёх очередей.

| Очередь DB0 | completed | failed | events |
|---|---:|---:|---:|
| stt | 21 | 8 | 153 |
| select | 18 | 4 | 114 |
| render | 195 | 0 | 828 |

В основной PostgreSQL нет `running`/`deferred` попыток. `video`: 21 done, 3 failed, 18 uploading; queued/transcribing/selecting/rendering отсутствуют. История `job_attempt` сохранена: stt 17 succeeded/9 failed, select 16/6, render 172/23. Исторические записи BullMQ и PostgreSQL имеют разные назначения и не обязаны совпадать по количеству.

Legacy Redis DB9: 33 ключа на срезе 19:28:19; completed stt/select/render = 4/4/10, failed/active/wait/delayed и прочие проверенные нетерминальные состояния — 0. PostgreSQL legacy: 4 done video, 10 done clip, только succeeded attempts. На том же Redis есть данные DB0 (6 ключей), DB14 (25), DB15 (6); их не удалять и не включать автоматически в область миграции. Ключи heartbeat истекают, поэтому последовательные live counts могут отличаться на единицу.

`CLIENT LIST` на 19:30–19:31 подтвердил:

- Основной source Redis: 19 клиентов от основного web и трёх worker, все DB0; дополнительно один клиент самой проверки.
- Legacy source Redis: 19 клиентов от legacy web и трёх blogger-QE worker, все DB9; дополнительно клиент проверки в DB0.
- Source support Redis: один клиент Libredesk в DB0 и клиент проверки.
- Target stage Redis: 19 клиентов существующего web и трёх worker, все DB0; дополнительно клиент проверки. DB15 содержит 6 ключей, клиентов приложения в DB15 не наблюдалось.
- Другой существующий `clipmkr-release-qe-20261103-redis-1`: 19 клиентов DB14, владелец этих подключений в данной проверке не установлен. DB0/DB14/DB15 содержат данные. Этот Redis нельзя считать свободным.

Отсутствие active jobs не означает остановленные writers: приложения продолжают работать, обновлять heartbeat и могут принять новую работу. Инвентаризация не создала BullMQ Queue/Worker и не выполнила enqueue/retry/remove/pause.

## Redis persistence и объёмы

| Redis | used_memory на первичном срезе, байт | aof_current_size, байт | Том apparent / allocated, байт |
|---|---:|---:|---:|
| source main | 3 153 840 | 19 387 530 | 19 604 971 / 19 628 032 |
| source legacy TEST | 2 976 984 | 11 121 506 | 11 164 560 / 11 190 272 |
| source support | 1 565 880 | 397 600 | 399 895 / 425 984 |
| target stage | 2 624 504 | 16 619 307 | 16 622 353 / 16 646 144 |
| target release-QE, отдельный Redis | 2 873 960 | 6 089 250 | 6 103 632 / 6 127 616 |

Память/AOF/du сняты не атомарно; рост AOF на последующих INFO ожидаем. У main, legacy, support и stage `aof_enabled=1`, `aof_last_write_status=ok`, `aof_last_bgrewrite_status=ok`, `aof_rewrite_in_progress=0`, `aof_pending_bio_fsync=0`. Main показывает накопительный `aof_delayed_fsync=7`; это не доказательство текущей ошибки, но показатель для наблюдения. На первичном main срезе `rdb_changes_since_last_save=90`, у stage 75: один существующий dump.rdb не доказывает актуальную копию. Политика appendfsync через CONFIG не проверялась.

В каждом source Redis volume присутствуют `dump.rdb`, AOF manifest, base RDB и incremental AOF. Main использует поколение AOF2, legacy/support — AOF1. Для резервирования AOF нужны все файлы поколения и manifest, а не один incremental файл. Копирование работающего AOF без согласованного freeze/проверки целостности не объявляется backup. Redis backup и восстановление Redis в этой инвентаризации не выполнялись; SAVE/BGSAVE/CONFIG/FLUSH не вызывались.

## S3 whitelist: фактические объекты и размеры

Объектные поля основной схемы: `video.object_key`, `video.upload_id`, `video.upload_part_size`, `video.declared_bytes`, `video.actual_bytes`; `clip.object_key`, `clip.thumbnail_key`, `clip.bytes`. `upload_id` сохраняется также у уже завершённых записей и сам по себе не доказывает наличие multipart. Транскрипты хранятся в PostgreSQL; значения `credit_grant.source_key` — финансовая идентичность, не S3 object key.

Выполнен HEAD всех непустых объектных ссылок двух БД. Суммы ниже — только уникальные объекты DB-whitelist, а не весь общий бакет и не размер исторических объектов/версий вне whitelist.

| Контур/вид | Ссылок | HEAD200 | HEAD404 | Размер существующих, байт |
|---|---:|---:|---:|---:|
| main исходник | 37 | 19 | 18 | 1 753 287 836 |
| main клип | 1 | 1 | 0 | 23 087 439 |
| main обложка | 1 | 1 | 0 | 36 935 |
| legacy исходник | 4 | 4 | 0 | 365 341 933 |
| legacy клип | 10 | 10 | 0 | 95 992 004 |
| legacy обложка | 10 | 10 | 0 | 292 642 |

Main: 21 существующий объект, всего **1 776 412 210 байт**. Legacy: 24 объекта, **461 626 579 байт**. Для существующих исходников/клипов размер HEAD совпал с соответствующими полями БД; размер обложки в проверенной схеме отдельно не записан. Других HEAD ошибок нет. Все 18 HEAD404 соответствуют именно `uploading`; 16 done и 3 failed с непустым ключом имеют HEAD200. Незавершённый multipart не является завершённым объектом, поэтому HEAD404 для uploading не доказывает потерю его частей.

Основная БД содержит 71 строку clip: 66 done и 5 failed. Только **один** done clip сейчас имеет object_key и thumbnail_key, оба доступны. У остальных 65 done ключи уже NULL; у пяти failed ключей нет. Количество 71 означает сохранённые метаданные, а не обещание 71 доступного видеофайла. Причина/история обнуления этих ключей данной проверкой не устанавливалась; перенос не должен выдумывать отсутствующие ссылки или восстанавливать удалённые объекты из общего бакета.

По одному существующему исходнику, клипу и обложке в каждом контуре выполнен Range GET `bytes=0-31`: все шесть ответов HTTP206, 32 байта. Содержимое не публиковалось. Это подтверждает чтение малых диапазонов, но не полную целостность, декодирование видео, воспроизведение браузером или download E2E. ETag зафиксирован в закрытом manifest; multipart ETag не считается SHA-256 файла. Полный ListObjects/скачивание/копирование бакета не выполнялись.

## Незавершённые multipart

Реальный `ListMultipartUploads` корня бакета вернул одну нетранкированную страницу: **6 multipart, 25 загруженных частей, 262 144 000 байт**. Для каждого выполнен полный ListParts, без abort/complete/upload.

- Пять multipart сопоставились с основными строками `uploading`: 16 частей, 167 772 160 байт. Три из пяти пока имеют 0 частей; один — 1 часть/10 485 760 байт; один — 15 частей/157 286 400 байт.
- Один multipart с 9 частями/94 371 840 байт не сопоставился с основной БД. Его владелец не установлен: корень бакета общий, другие хосты и все их БД не инвентаризировались. Называть его orphan, удалять или приписывать основному приложению нельзя.
- Из 18 основных строк uploading **13 не имеют совпадения key+upload_id** в текущем списке. Это исходное расхождение до переноса; никаких cleanup/abort/изменений статуса не выполнено. Возраст записи сам по себе не доказывает отсутствие активного браузера.
- В `tests/site/` текущих multipart нет; у legacy нет uploading video.

Для сохранения при переносе оставить bucket/регион/физические ключи и основной пустой prefix без изменений; сохранить `object_key`, `upload_id`, part size и остальные строки БД. Multipart и части остаются на прежнем S3 и не нуждаются в копировании на VPS. Существующие идентификаторы позволяют перечитать ListParts и возобновить загрузку; нельзя создавать заменяющий multipart или прерывать старый. До окна повторить список и сопоставление, сохранить закрытый manifest key/uploadId/partNumber/ETag/size, учесть уже выданные signed URL и незавершённые Complete/UploadPart запросы. Во время перехода все finalize/resume должны попадать в единственный актуальный backend. Существующие 13 несопоставленных uploading и неподтверждённый владелец шестого multipart остаются явными ограничениями, а не тихо удаляются.

## Libredesk и локальные рабочие каталоги

Support config: `upload.provider=fs`, `upload.fs.upload_path=uploads`, expiry `1h`. Mount `/libredesk/uploads` → source volume `n5-helpdesk-uploads`; содержимое 0 байт. Таблица `media`: 0 строк/0 байт. Это согласуется с уже сохранённым пустым uploads archive; будущие вложения требуют финального повторного backup вместе с БД.

PostgreSQL поддержки: 13 users, 1 inbox, 11 conversations, 20 messages. Из сообщений: incoming/received 12, outgoing/sent 5, activity/sent 3. `notification_email_queue=0`, `webhooks=0`. Исходящие письма, SMTP/IMAP и фактическая доставка не запускались. Media schema хранит `store`, `filename`, `size`, `meta`, model identity; при будущих вложениях одного dump без fs каталога недостаточно.

Support Redis DB0: 16 ключей, все типа hash, все с TTL по INFO; lists/zsets/streams не обнаружены. Это не доказывает назначение каждого hash и не даёт разрешения очистить его как cache. Внутренние каналы/очереди процесса Libredesk и поступающие внешние сообщения этой инвентаризацией не остановлены. Сохранить Redis вместе с БД/uploads, конфигурацией и ключами шифрования; не обнулять при переносе.

Worker volumes на source содержат мало scratch: main STT `/work` 20 776 apparent bytes, LLM 2 005, render 0; общий main `model-spend` 73 515. Legacy STT/LLM/render `/work` по 0, общий `model-spend` 25 052. Общий model-spend смонтирован в два worker и учитывается один раз. Не считать эти данные disposable: журнал расходов не включён в pg_dump и нужен для сохранения состояния/лимитов. Каталоги поддержки/config и spend должны попасть в закрытый финальный перечень backup; их содержимое в данном этапе не копировалось. Малый текущий scratch не является оценкой пикового места при обработке нового видео.

## Предлагаемая изоляция в существующем Redis цели

Использовать существующий `clipmkr-stage-20261028-redis-1`; дополнительные тестовые Redis/PG контейнеры не нужны. Сохранить нынешние DB0 и DB15. Сочетание INFO KEYSPACE и CLIENT LIST показало отсутствие ключей **и подключённых клиентов** в DB1, DB3, DB4 на этом срезе. Предлагаемое распределение: DB1 — будущий основной импорт, DB3 — support, DB4 — технически изолированный QA. Это предложение, не выполненное резервирование; перед записью повторить KEYSPACE/SCAN/DBSIZE/CLIENT LIST и привязать выбранные DB в проверенном runtime-профиле. Отсутствие ключей при наличии клиента не принималось за свободную DB.

BullMQ использует фиксированные имена stt/select/render и стандартный prefix `bull`, поэтому совпадение номера Redis DB соединяет очереди разных приложений. У каждого web и всех его worker должен быть один правильный URL с явным номером DB. DB разделяют ключи/очереди, но не являются самостоятельной границей прав, памяти или persistence; общий пароль/instance не защищает от FLUSHALL и доступа к другой DB. QA также требует отдельной PostgreSQL БД, тестового S3 prefix, запрета оригинальных DeleteObject/перезаписей и реальных финансовых/платных действий. Запуск restored web с исходным S3 и watchdog/retention запрещён до такой технической изоляции.

Нельзя восстанавливать весь source AOF/RDB поверх существующего target volume: это затрёт локальные DB0/DB15 и смешает контуры. После реальных gates и fence нужен scoped экспорт выбранной source DB с binary-safe DUMP + PTTL и controlled RESTORE в заранее проверенную пустую target DB. Сохранить типы, байты, неистекающие ключи и корректный оставшийся TTL с учётом времени экспорта/доставки; `PTTL=-2` требует учёта истечения/гонки, а не превращения ключа в вечный. RESTORE без REPLACE, отказ при коллизии. Снимок должен включать все ключи выбранной DB, не только ожидающие jobs: сохранённые terminal jobs, streams, counters и hashes также являются состоянием. После fence повторить PG attempts и Redis queue states; сверить импорт и не разрешать параллельную обработку source/target. Скрипт экспорта/импорта и restore QE ещё не выполнены. Перенос неизменённого DB9 legacy runtime на цель этим документом не разрешается.

## Закрытые доказательства и пределы

Каталог `/root/.config/clipmkr/relocate-workspace-20261109/` имеет 0700; новые receipts/скрипты — 0600. Секреты runtime читались в памяти существующих процессов; в argv и вывод не передавались. Оригинальные object keys, upload IDs, имена файлов пользователей и PII в этом документе отсутствуют. Закрытый HEAD manifest использует SHA-256 ключей, ETag и размеры, без исходных ключей.

- `storage-source.private.json` — primary/legacy PostgreSQL summaries, Redis INFO/SCAN/queues, S3 HEAD manifest, six Range GET и ListMultipart/ListParts.
- `storage-missing-classification.private.json` — повторный read-only SQL и hash-сопоставление статусов всех source HEAD404.
- `storage-target.private.json` — target stage БД и полная Redis keyspace/queue inventory.
- `storage-files-source.private.json` — source mounts/du/AOF files, support safe config sections, INFO.
- `storage-files-target.private.json` — оба существующих target Redis, объёмы и INFO.
- `storage-support.private.json` — support hash type counts, fs config, PG aggregates/statuses.
- `storage-clients-source.private.json`, `storage-clients-target.private.json` — CLIENT LIST с DB и установленными container bindings; адреса неизвестных клиентов не публиковались.
- `storage-target-bindings.private.json` — точные Docker labels, network/mount/PG user bindings существующего stage.
- `storage-runtime-readonly.private.py`, `storage-files-readonly.private.py`, `storage-support-readonly.private.py`, `storage-clients-readonly.private.py` — фактически исполненные bounded read-only скрипты.

Не выполнены: финальный согласованный PG+Redis+S3 срез; Redis backup/restore; full-object checksum/GET/playback; поиск всех исторических объектов/версий общего бакета; атрибуция чужого multipart; миграция fs/spend; freeze/drain/import; E2E; тестовые покупки/платные модели; SMTP; независимый gate. Данные источника продолжали изменяться. Перед cutover повторяются очереди, активные попытки, multipart, клиенты, TTL и whitelist — этот baseline не заменяет финальную сверку.
