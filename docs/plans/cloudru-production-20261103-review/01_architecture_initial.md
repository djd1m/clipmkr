# Независимое ревью плана: данные и cutover

Дата: 03.11.2026. Отдельная сессия `/root/cloud_plan_arch`, запрошенная модель `gpt-6-astra` — metadata назначения, не runtime attestation. Вход: AGENTS.md и `/tmp/clipmkr-cloudru-production-plan-draft.ru.md`; затем самостоятельное чтение CLAUDE.md, core-cjm.md, REPRODUCE.md, ops/cloudru/README.md, compose, исходников auth, retention, watchdog, queue, S3 и миграций. Старые coding-review отчёты не читались. Только чтение проекта, локальный отчёт; подключения к БД, секретам, инфраструктурные изменения, paid/API mutations отсутствуют.

Вердикт: направление плана разумное, но это ещё не исполнимый безопасный runbook. Ни одна находка не является утверждением, что данные уже потеряны. Ни состояние Cloud.ru БД, ни фактические lifecycle, версия бакета, очереди и бэкапы этим ревью не проверены.

## A1 — Critical: восстановленная копия сама начинает писать и удалять production S3

Источники: `apps/web/src/instrumentation.ts:2`, `apps/web/src/server/queue-runtime.ts:26`, `apps/web/src/server/watchdog.ts:76,87`, `apps/web/src/server/retention.ts:62,116`; `packages/s3/src/erasure.ts:21`.

Сценарий: шаг 3 запускает новый web с копией основной БД и основным бакетом для приёмки, пока старый web ещё работает. Watchdog запускается автоматически, сразу выполняет tick, восстанавливает доставки, закрывает зависшие задачи, запускает retention. Advisory lock retention координирует лишь подключения к одной БД: две независимые копии БД не защищают общий S3 друг от друга. То же относится к оставленному VPS, если он станет stage на копии production данных и старых S3 credentials. Удаление по префиксу с клона способно удалить объекты, которые рабочая БД ещё считает нужными.

Обязательное исправление: репетиции проводить на изолированном бакете/копии медиа и Redis, без права записи/удаления production S3. Установить явно исполнимый способ не запускать watchdog/workers на restore-проверках. До подключения окончательной Cloud.ru БД к production S3 остановить все старые фоновые писатели, включая web/watchdog, cron и прочие инстансы; затем запускать только одного владельца production данных. Stage получает отдельные ключи, запрещающие доступ к production bucket; одного изменения S3_BUCKET недостаточно.

## A2 — High: блокировка только новых загрузок и оплат не образует consistent cutover

Источники: `apps/web/src/server/video.ts:79,129,144,169`, `packages/s3/src/presign.ts:7`, `apps/web/src/server/auth-store.ts:12,26,34`, `apps/web/src/server/watchdog.ts:49,68`; `packages/queue/src/queues.ts:32`.

Сценарий: после финального dump остаются login/logout, регистрация, завершение уже начатого multipart, удаления, rerender/retry, реферальные события, operator actions и webhooks. Выданные PUT URL действуют непосредственно в S3, независимо от DNS и блокировки web. PostgreSQL и Redis, скопированные в разное время при активных писателях, могут не описывать одно состояние. Наличие fencing внутри БД не координирует две БД.

Обязательное исправление: в runbook определить freeze всех mutation ingress и фоновых writers, обработку уже выданных multipart, pending payment/webhook и in-flight запросов; зафиксировать момент окончательного fence. До него drain, после него остановка старого web/workers и финальные согласованные backup. Старый IP после переключения только proxy в новый origin без fallback на старое приложение. Проверить, что обход по c.clipmkr.ru, IP, n5, служебным портам и webhook не открывает второй writer. Для multipart оставить тот же production bucket/key/upload_id и явно проверить resume; если бакет меняется — отдельный переход для незавершённых upload_id, которые обычное копирование объектов не переносит.

## A3 — High: «сохранить вторую БД» не определяет судьбу её пользователей

Источники: `ops/cloudru/README.md:14,85`, `packages/db/migrations/001_init.sql:3,13,69,79,86,120`, `packages/db/migrations/021_payments.sql`, `packages/db/migrations/022_credit_packages.sql`.

Сценарий: Cloud.ru уже содержит отдельную историю. Backup до замены сохраняет возможность восстановления, но не даёт её пользователям доступ после назначения VPS БД основной. Простой импорт обеих БД в одну конфликтует с UNIQUE email, кодами ссылок, FK, идентичностью payment/credit ledger; совпадение email не доказывает разрешение на объединение аккаунтов.

Обязательное исправление: инвентаризация обеих БД до любых restore; отдельные immutable backup обеих, отдельные target volume/database имена. Явный выбор владельца: сохранить Cloud.ru dataset отдельно доступным/архивным либо отдельный проверенный merge/export проект с правилами конфликтов аккаунтов, ссылок, рефералов и денег. Не обещать сохранение доступа всем пользователям, если выполнено только архивирование. Не восстанавливать VPS dump поверх единственного Cloud.ru volume. Определить доступ к c.clipmkr.ru после переключения.

## A4 — High: lifecycle/versioning не включены в gate; REPRODUCE противоречит коду

Источники: `docs/REPRODUCE.md:252–294` допускает Versioning Suspended; `packages/s3/src/erasure.ts:23–24` отвергает любой непустой Status, включая Suspended. `apps/web/src/server/retention.ts:116` исключает витринные клипы, но описанный lifecycle удаляет весь `clips/free/` через 7 дней, не читая БД.

Сценарий: следование REPRODUCE с Suspended ломает account erasure/retention. Автоматическое включение versioning ради backup тоже ломает текущий erasure. Применение общего expire-free правила способно удалить витринный объект вопреки исключению приложения. Фактическая конфигурация неизвестна.

Обязательное исправление: до миграции read-only снять bucket versioning, lifecycle, CORS, IAM и объектный inventory; gate текущего кода — пустой Status, а не Suspended. Если бакет уже versioned/suspended, не «исправлять» без отдельного решения о версиях и erasure. Backup медиа организовать отдельно от рабочего erasure-контракта. Проверить точные префиксы expiration, paid/showcase и abort incomplete, не применять REPRODUCE механически. Установить сроки backup/удаления и проверку восстановления нужного объекта; backup БД не возвращает удалённый S3 object.

Официальная проверка Cloud.ru: [управление версиями](https://cloud.ru/docs/s3e/ug/topics/guides__versioning__manage-versions) описывает сохранение и управление версиями при приостановленном versioning. [Lifecycle](https://cloud.ru/docs/s3e/ug/topics/concepts__lifecycle__action) отсчитывает Expiration от загрузки объекта, отличает выключенный и приостановленный versioning; действие асинхронно. Это подтверждает необходимость отдельного контракта, но не состояние текущего бакета.

## A5 — High: restore БД недостаточен для сохранения сессий

Источники: `apps/web/src/server/auth.ts:20–25,42`, `apps/web/src/server/auth-store.ts:36`, `apps/web/src/server/auth-handler.ts:10–20`.

Сценарий: после переноса базы новый SESSION_SECRET вычисляет другие HMAC и существующие cookie не находят свои строки. Cookie `__Host-n5_session` привязана к host, поэтому сессия на c.clipmkr.ru или n5.clipmkr.ru не проверяет сохранность сессии clipmkr.ru.

Обязательное исправление: безопасно передать неизменный production SESSION_SECRET вместе с полной таблицей session и конфигурацией origin/proxy; stage получает иной секрет. Значения не включать в отчёты. До/после проверить заранее существующую clipmkr.ru browser-session через новый endpoint с правильным host/TLS, её logout и повторный вход; проверить guest/short/referral ссылки и привязку аккаунтов. Сессии второй Cloud.ru БД при слиянии требуют отдельного решения, так как другой secret не делает их автоматически совместимыми.

## A6 — High: additive SQL не доказывает обратимость релиза и сохранность исторических данных

Источники: `packages/db/src/migrate.ts:10–23` проверяет имя и SHA всех ранее применённых файлов; `packages/db/migrations/022_credit_packages.sql:16` backfill fulfilled_at; `026_blogger_policy.sql:6` backfill source_limit_seconds=5400; `027_payment_referral_snapshot.sql:5` backfill атрибуции; `ops/cloudru/compose.images.yml:3` использует date tag.

Сценарий: digest нового образа может иметь отличную историю миграций, run остановится на SHA mismatch. Новая колонка с default не доказывает, что исторические блогерские записи получили нужную семантику. Backfill и новые записи после запуска означают, что откат одного образа ещё требует совместимости старого кода с новой схемой/данными.

Обязательное исправление: снять `_schema_migration` обеих БД, версии PostgreSQL и точные image digests; репетиция native migrator именно финального image на восстановленных backup. Сверить строки/ID, FK и контрольные агрегаты по account/video/clip/guest/partner/attribution/payment_intent/payment/credit/quota/session до и после; особенно исторические credits и referral snapshot. Запрет редактирования SHA/старых SQL ради прохода. Зафиксировать совместимый rollback image и границу: после открытия записи только roll-forward либо полный проверенный reverse data cutover, а не просто восстановление старого snapshot.

## A7 — High: нет проверяемого определения «очереди перенесены» и «обработка завершена»

Источники: `docker-compose.yml:171–178` Redis AOF; `packages/queue/src/queues.ts:17,32–42` job identity и retry terminal job; `apps/web/src/server/watchdog.ts:10–23,49–70` переиздание pending и автоматическое stalled.

Сценарий: «active=0» не исключает delayed/waiting/deferred и потерянную delivery. Если перенос затянется, watchdog на восстановленной БД может сразу перевести незавершённые видео в stalled. Импорт старого Redis после старта нового web может вернуть устаревшее состояние очередей. Не следует обещать, что любой Redis snapshot совместим с любым PG dump.

Обязательное исправление: определить проверку DB attempt/video states и всех очередей, включая delayed и rerender, ожидание drain с таймаутом и abort-критерием. Выбрать одну протестированную стратегию: финальный Redis snapshot после полного fence вместе с PG либо явно проверенное восстановление доставки из PG с инвентаризацией иных Redis ключей. Проверить согласованность AOF/RDB, время snapshot, restore в отдельный Redis и отсутствие живых старых workers. Нулевые counters очередей сами по себе не достаточны. Не сбрасывать/перезапускать старые записи автоматически.

## Минимальные gates до разрешения cutover

1. Инвентаризация обеих БД/томов/Redis/S3, mapping к compose project и digest; решение о второй БД.
2. Восстановление обеих backup в изоляции; сверка финансовых/пользовательских инвариантов и sample media. RPO/RTO, хранение backup вне единственной VM и проверенный recovery owner.
3. Изолированная репетиция миграций и CJM; отсутствие любых побочных writers к production.
4. Проверяемый freeze/drain/fence; финальные связанные снимки и manifest времени/контрольных сумм без секретов.
5. Новый единственный writer, старый адрес proxy; проверки сохранённых данных/сессий/ссылок и fresh CJM; stage изолирован от production IAM/DB/Redis.
6. Зафиксированные критерии отката до/после первой новой записи и план закрытия старых production credentials/сервисов без уничтожения единственного backup.

## Конкретная reconciliation и пользовательская приёмка

Сверять baseline финального freeze со сразу восстановленной БД до запуска writers, затем отдельно фиксировать ожидаемые изменения от миграций/приёмки; строки с чувствительными данными в открытые отчёты не выводить. Одни общие COUNT недостаточны.

| Область | Проверяемый инвариант |
|---|---|
| Пользователи и сессии | Множества account ID, status, plan/billing_policy, paid_until, owner/blogger flags и лимиты сохранены; session account FK, сроки, revoked_at и HMAC secret совместимы. Прежняя браузерная сессия clipmkr.ru работает после cutover. |
| Кредиты/квоты | grant/charge/allocation ID, суммы начисленного/потраченного/возвращённого и доступного по аккаунту совпадают; ни дублирования trial, ни массового credit opt-in; незавершённые charge и quota_counter имеют объяснимое состояние. Проверяется не только итоговый баланс, но и ledger. |
| Оплаты | Provider payment ID, environment/shop принадлежность, intent status/fulfilled_at, offer snapshot, amount/currency и связанный grant сохранены; pending разобраны. Повтор webhook не начисляет второй раз; main off; только настоящий test shop для теста. |
| Рефералы | partner/code ID и code, attribution status/account/source, intent.referral_partner_code_id и commission policy сохранены; агрегаты по блогеру/месяцу до и после совпадают с учётом только задокументированных backfill. |
| Медиа и ссылки | video/clip ID, object_key/thumbnail_key, fences/status и upload_id сохранены. Для всех ожидаемо живых ключей inventory/HEAD, размер и существование; выборочно GET/play/download. ETag multipart не объявлять универсальным MD5. Guest/short/referral codes открываются на нужном origin и не перепривязаны. Истёкшие/удаляемые данные отдельно учитываются по действующей политике. |
| Очереди | DB active/deferred attempts сопоставлены с BullMQ идентичностью stage/video/fence; delayed/rerender учтены; после drain нет подлежащей исполнению старой работы или есть отдельное явно согласованное решение для каждого остатка. |

Новый CJM не заменяет проверку старых данных. Он отдельно включает обычную запись ровно 90 минут и отказ сверх лимита; блогерскую ровно 120 минут, индивидуальный owner override и запрет самоназначения; прерывание/возобновление upload; playback/download; test payment, отмену и дубликат webhook; разные браузерные контексты блогера/клиента/владельца, статистику и предварительные 20/30%. Источник: `docs/acceptance/core-cjm.md:1–64`. 88-минутный smoke не доказывает границу 120 минут.
