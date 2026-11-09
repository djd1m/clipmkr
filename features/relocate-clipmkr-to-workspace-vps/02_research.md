# Инвентаризация и переиспользование

Срез09.11.2026, read-only; не доказательство согласованности будущего cutover. Закрытые доказательства: /root/.config/clipmkr/relocate-workspace-20261109/.

## Наблюдения
Источник:194.85.249.105, clipmkr.ru; web clipmkr:ux-simplification-notice-20261106-11a90aec; основной PG фактически n5-clipmaker-db-1, БДn5, 28миграций, 39аккаунтов, 42видео,71клип; размер БД12,84MB. TEST checkout глобально закрыт. Наличие N5_PAYMENTS_MODE=live не доказывает настоящие списания.
Цель:77.83.87.178, существующий clipmkr-stage-20261028; образ clipmkr:20261028-web,26миграций,1аккаунт,0видео/клипов, БД9,44MB. Существующий аккаунт и grant сохраняются в исходной локальной БД; не объединять с импортом.
Источник и цель снимались последовательно, а не одним атомарным cross-host срезом. Все SELECT выполнены с transaction_read_only=on; начальная неоднозначность alias остановила первую попытку до SQL. Повторная проверка привязала DB по DNS из действующего web и адресу контейнера.

## Уже сохранено
Три pg_dump custom-format: источник1 379 067байт, локальный stage85 512байт, helpdesk249 902байт. Команды завершились0, заголовки PGDMP и SHA-256 проверены. Файлы0600, каталог0700. Это предварительные backup, не финальный согласованный PG+Redis snapshot. Все три, а также дополнительно сохранённый legacyTEST dump394 713байт, успешно восстановлены в отдельных временных БД существующего PostgreSQL; pg_restore exit0. Временные БД удалены, web/worker не запускались. Основная и локальная/legacy базы имеют по27таблиц, support57. Совпали основные количества аккаунтов/видео/клипов исходных наблюдений; полная сверка всех строк одного исходного snapshot ещё не выполнена. Вложений Libredesk и S3 в dump нет. Отдельно сохранён uploads tar.gz105байт; каталог на срезе пуст, tar-list0. Это не атомарный backup PG+uploads.

## Карта переиспользования
- docs/plans/2026-11-03-cloudru-production.md: единый writer/fence, безопасная репетиция, relay и R1/R2. Перепривязать с Cloud на этот VPS.
- docker-compose.yml, deploy/source-proxy.compose.yml и docs/REPRODUCE.md: существующая поставка. Source overlay не копировать механически на целевой хост.
- docs/operations/local-ux-stage.md: текущие PG/Redis/прокси; не переносить старые предположения о пустоте и именах БД.
- packages/s3, auth и действующие worker/образы: сохранять bucket/namespace/секрет сессии и digest, не перестраивать приложение из HEAD.
- ops/libredesk/docker-compose.yml: отдельные DB/Redis/uploads поддержки. Основной dump не заменяет их сохранение.
- scripts/switch-to-clipmkr.sh не использовать: другое зашитое назначение, нет переноса данных. Новый универсальный orchestrator миграции не нужен.

## Ограничения
Данные Redis/activejobs/multipart, размеры всех образов и support uploads, TLS/DNS-доступ, SMTP/Resend и полный callbackchain ещё не проверены. Docker показывает52образа/50GB и buildcache31,18GB на цели; оценки reclaimable не складывать как гарантированно освобождаемые. Ничего не очищено.

Дополнительный backend n5-referral-paytest-20261028 использует отдельную БД и Redis9, с6аккаунтами/4видео/10клипами/6платежами. Его backup сохранён на случай обнаружения зависимости; свежая проверка Caddy показывает отдельный host n5.clipmkr.ru. Маршрут clipmkr.ru/api/webhooks/yookassa-test ведёт в основной web после rewrite. Поэтому перенос legacy-приложения автоматически не включается в scope clipmkr.ru. Финансовые строки не менялись.

## Проверка содержимого согласованных снимков
09.11.2026 на источнике экспортированы независимые PostgreSQL REPEATABLE READ READ ONLY snapshots для основной, legacy и support БД. Каждый pg_dump снят с явным --snapshot; в той же удерживаемой транзакции вычислены количество строк и SHA-256 каждой row_to_json с сортированным агрегатом на каждую таблицу. После restore в временные БД существующего локального PG совпали ВСЕ27таблиц основной,27legacy и57support. Временные БД удалены.
Это доказывает равенство содержимого таблиц этих предварительных source snapshots и восстановленных копий. Это не одновременный согласованный PostgreSQL+Redis+S3 snapshot, не проверка ACL/ролей и не финальное состояние перед cutover. Private: consistent-snapshots/summary.actual.private.json и *.row-equality.actual.private.json.

## Переиспользование образов
Исходныеweb sha256:4afaad4d19cad352c5ed89bae16a3c694b2d41af3abf7873fb63968d2527f8f6 и worker sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800 уже существуют на цели. Новая сборка/доставка этих образов не нужны. Supportimage sha256:e7aa3bac149323d21e8e130adc8d9dd83b2c4fc85f83bb3b08b544ffa3c7d201 пока отсутствует локально.

## Привязки дополнительных входов
- `operations-storage.md`: SHA-256 `a49e0b3e56071e8a0dddb253de9afb4d6cf6294d60343f9e353ec5c382294783`.
- `operations-routing.md`: SHA-256 `64bab5d97fd548aa31ccf0d887ba4e7e8e46c50d137acaec6e33a7f67168c918`.

Scoped TLS main/www/support сохранены только в закрытом tls-source-backup/ с проверкой hostname и пары crt/key; в Caddy не загружались. Скопирован только нужный TLS, не ACME-account/общий том. Libredesk по исходному digest уже загружен в локальное хранилище Docker; контейнер не запускался.

## Read-only уточнение: причина QA payment blocker

Actual canonical `apps/web/src/server/billing-handler.ts` после consumer возвращает200 для unknown_intent; `packages/db/src/payments.ts` до такого outcome уже вызывает claimEvent и сохраняет unknown payment. Поэтому status rewrite после consumer не решает требование503/no-write: следующий retry становитсяduplicate200. Originating condition `qe-primary-01` сохранено в native parent receipt. Reuse выбран child `guard-relocation-test-webhook`: wrappers applyPayment/recordRefund после штатной provider verification проверяют локальную intent/provider ID пару до consumers; canonical файлы не изменяются. Тонкий новый Next route существует отдельно. Для route inventory реально требуется четвёртый child target `tests/payments-guards.test.ts`.

Исходный web image `sha256:4afaad4d19cad352c5ed89bae16a3c694b2d41af3abf7873fb63968d2527f8f6` связан с source commit `11a90aec9d26be56849ac06c9f12a98001739a28`. Новый QA build ещё не является проверенным runtime и не подменяет source release. Private исходный разбор: `payment-blocker-architecture.private.md`, SHA256 `eac90ebcea66acec0ba8078a94ce93ce975c25f702e735bf79b246d2325b0946`. Child результаты/ограничения читаются из его07/08 и native receipts; исторический parent QE report здесь не переписывается.
