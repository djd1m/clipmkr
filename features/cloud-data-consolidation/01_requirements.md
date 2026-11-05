# Консолидация Clipmkr: требования

Статус: проект требований, 05.11.2026. Разрешены только локальное чтение и документы. Реализация, live-инвентаризация и операции с данными не разрешены до отдельного root GO.

## Заинтересованные стороны и полномочия
Владелец принимает результат; пользователи обоих контуров сохраняют данные и права; root координирует поставку. Источник задания: прямой handoff root 05.11.2026, передающий подтверждение владельца перенести приложение, аккаунты, видео и клипы после UI/recovery/E2E и ручной приёмки clipmkr.ru. Подтверждена цель слияния, а не конкретное окно, mapping спорных владельцев или действующая Cloud identity.

Архитектор: существующая роль `gpt-6-astra xhigh`, сессия `/root/streamer_fresh_review` повторно использована, новой не называется. Это запрошенная модель по handoff; отдельной provider-attestation в доступных tool metadata нет. Независимая проверка архитектуры поручается root новой Terra-сессии; она ещё не выполнена.

## Функциональные требования (все MUST)

### FR-1 — точная цель и последовательность
После UI/recovery/E2E и ручной приёмки source публикуется тот же принятый release на c.clipmkr.ru с обоими datasets. Given main с более свежими документами, when готовится manifest, then release commit/images связываются с реально принятым runtime, а не автоматически с HEAD. Основной DNS и прочие сайты этим scope не переключаются.

### FR-2 — сохранность всех данных c и source
Given непустые source/target, when выполняется импорт, then каждая исходная сущность и объект имеют результат `preserved`, `imported` или подтверждённое эквивалентное представление с provenance; нет тихого skip, replace, truncate или reset. Неразрешённые конфликты блокируют финальное переключение. Архив спорной записи не считается восстановленным пользовательским доступом. Сохраняются удаления/отзывы и действующие сроки retention; ранее законно удалённое не воскресает.

### FR-3 — личность и владение
Given одинаковый email/telegram ID или UUID в двух datasets, when сравниваются аккаунты, then одно совпадение не объединяет владельцев. Нужны проверенное происхождение/подтверждение владельца и явное решение. Все PK/FK, JSON/текстовые ссылки и внутренние ссылки объектов проходят mapping; неизвестные ссылки блокируют импорт. Чужой и отсутствующий ресурс сохраняют 404.

### FR-4 — пароли и сессии
Given бесконфликтный аккаунт, when перенесён, then сохранены пригодные password hash и права без раскрытия пароля. Конфликт двух credentials не разрешается выбором последнего. Source active sessions не импортируются как активные c-сессии: исторические записи сохраняются защищённо, вход на новом origin создаёт новую сессию. Target sessions/secret не заменяются автоматически; решение о целевом отзыве отдельно. Прежние токены source не получают доступ к target.

### FR-5 — кредиты, квоты и незавершённые задания
Given grants/charges/allocations, reserved credits и retries, when объединены, then сохранены source_key, циклы, remaining/reserved/total, expiry, recovery и offer snapshots без второго trial/fulfillment. Квоты и user/global scope_key рассматриваются отдельно, не суммируются вслепую. Каждая активная job/multipart имеет решение drain/resume/cancel с учётом биллинга; Redis payload, fences и idempotency не переносятся слепой копией.

### FR-6 — оплаты и webhook
Given одинаковые provider payment/event IDs либо разные магазины/TEST режимы, when формируется mapping, then подтверждены shop/mode/provenance, сумма, owner и intent. Разные события не подавляются чужим UNIQUE; одно событие не создаёт второй grant. Provider metadata.order_id при remap intent имеет явный lookup совместимости. Настоящие списания не включаются; исторические TEST исключения не становятся общим разрешением; pending/refund/replay проходят согласованный маршрут callback.

### FR-7 — рефералы и месячная активность
Given codes/attribution/payment referral snapshot, when объединены, then сохранены принадлежность, даты назначения, blocked/revoked status и согласие гостя. Проверяются registrations, active users, distinct payers, payments и revenue по каждому коду/блогеру и месяцу Europe/Moscow [начало, конец). Оценки 20%, 30% и null воспроизводят native правила; возвраты/needs_review/неисполненные намерения исключаются. Это оценка, не выплата или долг.

### FR-8 — стабильные ссылки и origin
Given старые `/c/`, `/g/`, referral URLs/подписи и collision одинаковых code, when доступ перенесён, then ссылка сохраняет правильный контент/владельца либо получает заранее согласованный безопасный маршрут. Alias учитывает исходный origin и path; голый одинаковый code не разруливает конфликт. Source hostname/redirect требует отдельного согласования без самовольного DNS. Старые S3-подписи не копируются как постоянный URL; новые выдаются после авторизации.

### FR-9 — объекты и retention
Given object/thumbnail/packshot/showcase references, when копируются, then точный DB-whitelist определяет logical→physical key; существующие c bytes не перезаписываются. Проверяются размер и SHA-256 каждого перенесённого объекта, разрешённая owner-область, metadata и immutable публикация. Multipart ETag не заменяет checksum. Не включать versioning без изменения native erasure-контракта; deleted/expired/missing состояния отражать отдельно. Retention обоих контуров при fence не удаляет нужные для сверки данные.

### FR-10 — backup и репетиция восстановления
Given оба datasets и существующий PostgreSQL 16, when допускается write-run, then имеются независимые проверенные backups DB/нужных объектов, schema journals/checksums и restore в уникальные scratch БД существующего PG16. Запрещены n5_test, новая PG/MinIO инфраструктура и restore поверх рабочей c. Сверка включает строки/связи/денежные инварианты, не только COUNT. Измеренные RTO/объём и capacity должны уложиться в отдельно согласованное окно.

### FR-11 — freeze, delta, cutover и rollback
Given согласованный запуск, when формируется финальный snapshot, then остановлены ВСЕ писатели обоих datasets, включая web/watchdog/retention/jobs/webhook/operator tools; поздние события имеют durable replay. Копирование до freeze не заменяет полную сверку delta, включая удаления. До новых target writes допустим проверенный возврат прежнего binding; после новых writes запрещён слепой restore старого dump: freeze + reconciliation/forward recovery сохраняют новые данные и платежи.

### FR-12 — приёмка и сопровождение
Given объединённый кандидат, when проходит приёмку, then существующие пользователи обоих наборов видят только своё, воспроизводят/скачивают клипы, выполняют новый CJM, а лимиты остаются 90/120/custom 2–1440 минут и 2 000 000 000 bytes. Source не выводится из эксплуатации до доказанной стабильности, backup restore и разрешения владельца; мониторинг, доступ, обновления и регулярная репетиция имеют владельца.

## Нефункциональные требования
NFR-1: нулевая необъяснённая потеря/переназначение данных и ноль повторных финансовых эффектов; любые unknown дают STOP. NFR-2: публичные артефакты не содержат PII, hashes паролей, токены, ключи, signed URLs или object whitelist. NFR-3: checkpoint связывается с SHA документов/manifest; retries идемпотентны, несовпавший input не продолжает старую операцию. NFR-4: RTO/RPO/окно freeze определяются по репетиции и владельцем, здесь численно не выдумываются.

## Ограничения и reuse
Pinned dz 0.8.58/feature-adr 1.5.25, Node22; без upgrade. Только существующие PostgreSQL16/Redis/S3 и native release manifest/controller/receipts. Общий legacy controller не расширять монолитно; адаптер консолидации требует отдельного K1 и финального плана. Старые `features/cloudru-release-parity/`, runbook и production-plan не переписываются, открытые findings не объявляются закрытыми новым slug.

## Границы
Текущая работа: документы и локальный анализ. Для этой делегированной сессии SSH/DB network, deploy, S3 copy, аккаунты/ключи/DNS/VM/store запрещены до root GO. Это внутреннее ограничение делегата, не дополнительное согласование пользователя для уже авторизованного readonly. Независимый QCSD и final K1/K2/plan checkpoint не проведены. OpenSpec — проект дельты требований, execution truth остаётся здесь. Точная ревизия дельты записывается в `requirements-binding.json`.

## Открытые вопросы для будущей инвентаризации
OQ-1: fresh SSH/container identity и web versions установлены root receipts19:30UTC; root B1 установил PG16 binding, одинаковые28migrationSHA/27tables/288columns; B2–B5 дали разновременные агрегаты (live-observations.md). Cross-dataset collisions, полная schema equivalence, byte/retention audit и консистентный final baseline остаются неизвестными. OQ-2: реальные identity/PK/code/provider collisions и способы доказать владельца; миграция023 содержит email_verified_at, но его наличие само по себе не доказывает тождество владельцев в разных datasets. OQ-3: shops/TEST исключения и pending callbacks. OQ-4: общий/разные bucket/prefix, policy/permissions, ещё действующие URL и missing objects. OQ-5: окно freeze/RTO/RPO, safe scratch capacity, источник durable delta/delete journal. OQ-6: судьба старых origin ссылок/сессий, срок read-only source и ответственный за сопровождение. Ответы нельзя вывести из старых backup counts.
