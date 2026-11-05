# Предложение ограниченной read-only инвентаризации для root

Статус исходного предложения: **НЕ ИСПОЛНЕНО АРХИТЕКТОРОМ**, передано root для проверки. После просмотра root отдельно выполнил B1 и B2–B5; результаты и ограничения в live-observations.md. Архитектор не выполняет SSH/SQL/S3. Это metadata-пакет, не dump, backup, proof identity или migration admission. Root связывает каждый запуск с текущим target/project/container/DB/volume и отдельным GO. Результаты только в приватный receipt с UTC/exit/hash; в Git — агрегатный вывод. Ошибка/timeout не означает пустую таблицу.

## A. SSH: только metadata, без env/секретов
Root использует существующую закрытую SSH-обёртку с BatchMode/StrictHostKeyChecking, без создания ключей/профилей. Не печатать `docker inspect` целиком, `docker compose config`, DATABASE_URL, process args или журналы приложения. `INV_APP_CONTAINER`, `INV_DB_CONTAINER`, `INV_REDIS_CONTAINER`, `INV_DB_ROLE`, `INV_DB_NAME` — заполненные root значения из проверенного private binding; не выводить connection URI.

```bash
hostname
id -u
date -u +%FT%TZ
df -B1 --output=size,used,avail,pcent,target /
free -b
docker inspect --format '{{.Id}} {{.Image}} {{.State.Status}} {{.State.StartedAt}} {{.RestartCount}}' "$INV_APP_CONTAINER"
docker inspect --format '{{index .Config.Labels "com.docker.compose.project"}} {{index .Config.Labels "com.docker.compose.service"}}' "$INV_DB_CONTAINER"
docker inspect --format '{{range .Mounts}}{{.Type}} {{.Name}} {{.Destination}}{{println}}{{end}}' "$INV_DB_CONTAINER"
systemctl is-active clipmkr-maintenance-persistent.service clipmkr-maintenance-backup.service
systemctl is-enabled clipmkr-maintenance-persistent.service clipmkr-maintenance-backup.service
```
Каждая команда отдельно, timeout10s; максимум один повтор после анализа причины. Обёртку и имена container/role/db root сверяет локально, включая фактический DATABASE_URL host/db, **не выводя значение**. Успех `hostname` не устанавливает правильную БД. Service inventory уже есть в root receipts19:30; повторять только при необходимости свежести, не изменять службы. Redis INFO keyspace/persistence через существующий авторизованный путь можно отдельным GO, без KEYS/SCAN/payloads и без очистки.

## B. Контракт исполнения SQL
Каждый следующий блок — отдельная транзакция с общим ограничением wall-clock15s, output≤64KiB, без внешнего network extension. При несовпадении ожидаемого PG major16/db binding — STOP. Никаких DDL/DML, функций с побочными эффектами, pg_dump или секретных колонок.

```sql
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '5s';
SET LOCAL lock_timeout = '1s';
SET LOCAL idle_in_transaction_session_timeout = '10s';
-- ровно один согласованный блок B1..B5 ниже
ROLLBACK;
```
Запуск после GO через уже авторизованный доступ: `docker exec -i "$INV_DB_CONTAINER" psql -X -v ON_ERROR_STOP=1 -A -t --username "$INV_DB_ROLE" --dbname "$INV_DB_NAME"`. SQL передаётся stdin, не конструируется из пользовательских данных; password не в argv. Root проверяет exit и rollback/disconnect. Не запускать `db:migrate` для получения schema info.

### B1 — совместимость схемы и объём, до любых data aggregates
```sql
SELECT current_database() AS db, current_setting('server_version_num') AS pg_version,
       pg_database_size(current_database()) AS bytes, pg_is_in_recovery() AS replica;
SELECT name,sha256 FROM _schema_migration ORDER BY name LIMIT 100;
SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns
 WHERE table_schema='public' ORDER BY table_name,ordinal_position LIMIT 1000;
SELECT c.relname,pg_total_relation_size(c.oid) AS bytes,c.reltuples::bigint AS estimated_rows
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') ORDER BY c.relname LIMIT 100;
SELECT conrelid::regclass::text AS relation,contype,conname,convalidated
 FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY relation,conname LIMIT 300;
SELECT state,count(*) FROM pg_stat_activity WHERE datname=current_database() GROUP BY state;
```
Если достигнут LIMIT или выходной cap — это неполный inventory, расширять только после рассмотрения. reltuples приблизителен, не baseline. pg_stat_activity не выдаёт query/username/client address. B2..B5 допустимы только после подтверждения колонок/таблиц.

### B2 — аккаунты и активные доступы без PII
```sql
SELECT status,count(*) AS accounts,count(*) FILTER(WHERE email_verified_at IS NOT NULL) AS verified,
 count(*) FILTER(WHERE is_blogger) AS bloggers,count(*) FILTER(WHERE owner_unlimited) AS owners,
 count(*) FILTER(WHERE blogger_source_limit_seconds IS NOT NULL) AS custom_limits
 FROM account GROUP BY status;
SELECT count(*) AS sessions,count(*) FILTER(WHERE revoked_at IS NULL AND expires_at>now()) AS active FROM session;
SELECT purpose,delivery_state,count(*) AS tokens,count(*) FILTER(WHERE used_at IS NULL AND expires_at>now()) AS live
 FROM support_email_token GROUP BY purpose,delivery_state;
SELECT count(*) AS operators,count(*) FILTER(WHERE revoked_at IS NULL) AS active FROM support_operator;
SELECT count(*) AS normalized_email_collision_groups FROM
 (SELECT lower(btrim(email)) FROM account GROUP BY lower(btrim(email)) HAVING count(*)>1) x;
```
Последняя строка лишь local normalization collision, не межконтурное доказательство личности. Не выводить email/token/password hashes/индивидуальные UUID. Verified timestamp — свойство аккаунта и происхождения, не готовое решение merge.

### B3 — медиа, задания и ссылки
```sql
SELECT status,count(*) AS videos,coalesce(sum(declared_bytes),0) AS declared_bytes,
 coalesce(sum(actual_bytes),0) AS actual_bytes,count(*) FILTER(WHERE deleted_at IS NOT NULL) AS deleted,
 count(*) FILTER(WHERE upload_id IS NOT NULL) AS multipart_refs FROM video GROUP BY status;
SELECT status,count(*) AS clips,coalesce(sum(bytes),0) AS bytes,
 count(*) FILTER(WHERE object_key IS NOT NULL) AS object_refs,
 count(*) FILTER(WHERE thumbnail_key IS NOT NULL) AS thumbnail_refs FROM clip GROUP BY status;
SELECT stage,status,count(*) FROM job_attempt GROUP BY stage,status;
SELECT 'clip_link' AS kind,count(*) FROM clip_link UNION ALL SELECT 'guest_pack',count(*) FROM guest_pack
 UNION ALL SELECT 'partner_code',count(*) FROM partner_code UNION ALL SELECT 'attribution',count(*) FROM attribution;
SELECT count(*) AS orphan_video_owners FROM video v LEFT JOIN account a ON a.id=v.account_id WHERE a.id IS NULL;
SELECT count(*) AS orphan_clip_videos FROM clip c LEFT JOIN video v ON v.id=c.video_id WHERE v.id IS NULL;
```
Bytes в DB не доказывают наличие S3; реальные object whitelist/HEAD/GET требуют отдельного private scope и разрешения. Source/target могут ссылаться на общий объект; суммы не считать стоимостью copy без дедупликации.

### B4 — деньги и кредиты без платёжных идентификаторов
```sql
SELECT provider,status,needs_review,count(*) AS payments,sum(amount_minor) AS amount_minor FROM payment GROUP BY provider,status,needs_review;
SELECT status,sku,count(*) AS intents,count(*) FILTER(WHERE fulfilled_at IS NOT NULL) AS fulfilled FROM payment_intent GROUP BY status,sku;
SELECT provider,count(*) AS events FROM payment_event GROUP BY provider;
SELECT source,count(*) AS grants,sum(total_seconds) AS total,sum(remaining_seconds) AS remaining,sum(reserved_seconds) AS reserved FROM credit_grant GROUP BY source;
SELECT state,count(*) AS charges,sum(billable_seconds) AS billable FROM video_credit_charge GROUP BY state;
SELECT count(*) AS allocations,coalesce(sum(seconds),0) AS seconds FROM credit_allocation;
SELECT count(*) AS broken_grant_bounds FROM credit_grant WHERE remaining_seconds<0 OR reserved_seconds<0 OR remaining_seconds+reserved_seconds>total_seconds;
```
Shop/mode не хранятся в этих колонках; aggregate не подтверждает test/live provenance. Не использовать эти totals как permission суммировать balances.

### B5 — месячная готовность/политики
```sql
SELECT blogger_commission_percent,count(*) FROM account WHERE is_blogger GROUP BY blogger_commission_percent;
SELECT status,count(*) FROM attribution GROUP BY status;
SELECT date_trunc('month',paid_at AT TIME ZONE 'Europe/Moscow') AS month,provider,status,needs_review,count(*) AS payments,sum(amount_minor) AS amount_minor
 FROM payment WHERE paid_at>=date_trunc('month',now())-interval '24 months'
 GROUP BY 1,2,3,4 ORDER BY 1 DESC LIMIT 300;
```
Это ограниченный обзор, не native bloggerReport и не доказательство исторических комиссий: точные per-code расчёты/final reconciliation потребуют отдельной защищённой проверки всех нужных месяцев. Cross-dataset collision counts нельзя получить из двух независимых totals; следующая фаза сравнит минимальные закрытые comparands из согласованных snapshots, без публикации PII. Здесь она не разрешена/не реализована.
