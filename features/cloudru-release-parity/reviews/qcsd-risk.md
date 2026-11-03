Финальный delta текущей проверки: REL-03 теперь фиксирует каждый сервис/цель/фазу A→B→A→B и сохранность данных после отката; RES-01/02 задают OOM/ENOSPC только в disposable worker и read-only сверку остальных контейнеров. 02 согласован с in-place. Новых серьёзных рисков не выявлено. Это подтверждение дизайна; тесты не запускались.

## Focused verification после structural rework

Текущий итог: **CLEAN для ideation**. Модель `gpt-6.1-sol`, та же независимая чистая review-сессия без coding context. Проверены собственные RISK-01..03 и весь фактический structural delta, включая зависимости сохранности, source-of-truth, production fence, миграции, ресурсы и матрицу приёмки. Исходные условия ниже сохранены как история; они закрыты собственной проверкой исправленного дизайна, не производственного кода.

Host nonce: `e9449a2e-0b4f-463b-b686-e7a15eb7134a`. Revision: `c1cb6d4e9fd23bf3ab2315c7dd0de3b04da7909379740ec5d80d9e2a6d3842d6`. Актуальность всех 7 измеренных файлов подтверждена SHA-256 перед собственной записью receipt. Авторский handoff прочитан; structural classification подтверждена.

- **RISK-01: verified.** ADR-002 Decision заменяет два backend одного origin обновлением существующей отдельной test copy: cookie selector отсутствует, c.clipmkr.ru имеет единственный backend для всех ролей/referral/return. Production secrets не наследуются; после смены session secret нужен новый вход. Архитектура «Данные и запуск» и CJM-08 закрепляют раздельные browser sessions и запрет чужих данных. Опасный fallback при expiry устранён из дизайна, а не объявлен испытанным.

- **RISK-02: verified.** FR-5, CJM-10/11 и архитектура «Точный контракт платежного допуска» задают отдельный shop_id/secret/test mode, HTTPS c.clipmkr.ru/api/webhooks/yookassa; нынешний n5 shop/callback не меняется. Native callback требует IP/proxy, provider lookup, принадлежность intent, shop/mode и идемпотентный grant. До реального подтверждения off/blocked. Временное окно прежнего магазина требует отдельного решения, отсутствия pending и возврата callback; fan-out неизвестных событий запрещён.

- **RISK-03: verified.** FR-6, REL-05, ADR-001 Decision и архитектура «Remote apply и восстановление» определяют один remote writer/lock, приватный atomic state до изменения контейнеров, unknown после disconnect, inspect/reconcile runtime/state/schema до retry; preflight проверяет host key, loopback tunnel и срок ключа/transient unit. Автоматическое расширение доступа запрещено; при unknown оператор сверяет состояние до следующего apply. Это проверка контракта ideation, не выполненный SSH fault injection.

Новый путь изменяет существующие отдельные тестовые копии, сохраняя их аккаунты и volumes; backup/restore обязателен до apply, непустые media refs дают STOP. Это снимает риск общего selector/cache origin, но переносит акцент на сохранность при schema upgrade: полный journal и DATA-01..04 задают проверку; 28→26 автоматически запрещён. Никакой production clone либо production cutover не разрешён. Источник версии остаётся Git archive/SHA и реально проверяемый runtime image ID; источником пользовательской истории остаётся БД.

Числовые лимиты и последовательные 90/120 job, атомарный допуск попыток, ограничение retries и stop по OOM/disk/quota теперь заданы. Отдельный магазин всё ещё внешняя зависимость: CLEAN дизайна не закрывает BLOCKED платежный E2E и полный core-CJM. Дополнительных серьёзных условий после проверки delta не выявлено. Исполнение SSH, backup/restore, IAM, миграций и E2E не выполнялось и не объявляется успешным.

---

## Focused verification после structural rework

Текущий итог: **CLEAN для ideation**. Модель `gpt-6.1-sol`, та же независимая чистая review-сессия без coding context. Проверены собственные RISK-01..03 и весь фактический structural delta, включая зависимости сохранности, source-of-truth, production fence, миграции, ресурсы и матрицу приёмки. Исходные условия ниже сохранены как история; они закрыты собственной проверкой исправленного дизайна, не производственного кода.

Host nonce: `eb2c0a9d-1378-46ed-9e96-5e5fc70d91fc`. Revision: `66284678bde50395c267c00f0751dab7255b073eee398c0b7e1659e8b68b40ff`. Актуальность всех 7 измеренных файлов подтверждена SHA-256 перед собственной записью receipt. Авторский handoff прочитан; structural classification подтверждена.

- **RISK-01: verified.** ADR-002 Decision заменяет два backend одного origin обновлением существующей отдельной test copy: cookie selector отсутствует, c.clipmkr.ru имеет единственный backend для всех ролей/referral/return. Production secrets не наследуются; после смены session secret нужен новый вход. Архитектура «Данные и запуск» и CJM-08 закрепляют раздельные browser sessions и запрет чужих данных. Опасный fallback при expiry устранён из дизайна, а не объявлен испытанным.

- **RISK-02: verified.** FR-5, CJM-10/11 и архитектура «Точный контракт платежного допуска» задают отдельный shop_id/secret/test mode, HTTPS c.clipmkr.ru/api/webhooks/yookassa; нынешний n5 shop/callback не меняется. Native callback требует IP/proxy, provider lookup, принадлежность intent, shop/mode и идемпотентный grant. До реального подтверждения off/blocked. Временное окно прежнего магазина требует отдельного решения, отсутствия pending и возврата callback; fan-out неизвестных событий запрещён.

- **RISK-03: verified.** FR-6, REL-05, ADR-001 Decision и архитектура «Remote apply и восстановление» определяют один remote writer/lock, приватный atomic state до изменения контейнеров, unknown после disconnect, inspect/reconcile runtime/state/schema до retry; preflight проверяет host key, loopback tunnel и срок ключа/transient unit. Автоматическое расширение доступа запрещено; при unknown оператор сверяет состояние до следующего apply. Это проверка контракта ideation, не выполненный SSH fault injection.

Новый путь изменяет существующие отдельные тестовые копии, сохраняя их аккаунты и volumes; backup/restore обязателен до apply, непустые media refs дают STOP. Это снимает риск общего selector/cache origin, но переносит акцент на сохранность при schema upgrade: полный journal и DATA-01..04 задают проверку; 28→26 автоматически запрещён. Никакой production clone либо production cutover не разрешён. Источник версии остаётся Git archive/SHA и реально проверяемый runtime image ID; источником пользовательской истории остаётся БД.

Числовые лимиты и последовательные 90/120 job, атомарный допуск попыток, ограничение retries и stop по OOM/disk/quota теперь заданы. Отдельный магазин всё ещё внешняя зависимость: CLEAN дизайна не закрывает BLOCKED платежный E2E и полный core-CJM. Дополнительных серьёзных условий после проверки delta не выявлено. Исполнение SSH, backup/restore, IAM, миграций и E2E не выполнялось и не объявляется успешным.

---

# Независимое QCSD: риски до реализации

Роль: `qcsd-risk`, family=`owner-exception`; модель `gpt-6.1-sol`. Отдельная чистая сессия без контекста кодирования и прежних отчётов. Это самостоятельная проверка дизайна, не утверждение cross-model проверки ещё не существующего pipeline.

Входы: AGENTS.md, CLAUDE.md, docs/review-policy.md, docs/acceptance/core-cjm.md; текущие 00, 01, 02, оба ADR, 04 и 05 этой feature; отдельно docs/plans/2026-11-03-cloudru-production.md как входной план, не разрешение cutover. Контракт: установленный feature-adr 1.5.25, modules/03.5-ideation-swarm.md. Серверы, секреты и прежние отчёты не исследовались; E2E, backup/restore и IAM проверки не выполнялись.

Вердикт: **CONDITIONAL**. Три структурных HIGH-условия требуют согласованного исправления дизайна и собственной повторной проверки на новом snapshot до закрытия convergence. Отсутствие реализации не считается дефектом. Указанные ниже проверки — будущие обязательства, а не полученные результаты.

## SFDIPOT: матрица рисков

Оценки вероятности/ущерба 1–5 относятся к последствиям ошибочной реализации; произведение — приоритет, не измеренная статистика.

| № | Область | Сценарий | P | I | Балл | Текущий барьер / требуемое доказательство |
|---|---|---|---:|---:|---:|---|
| 1 | Data | Retention candidate удаляет production S3 | 3 | 5 | 15 | ADR-002 требует отдельный ключ и отрицательные canary проверки до старта web/worker |
| 2 | Interfaces | Общий hostname переносит session/cache между legacy и candidate | 4 | 4 | 16 | RISK-01: нужен точный cookie/session/cache контракт |
| 3 | Function/Interfaces | Новый callback перехватывает pending платежи действующего test | 4 | 4 | 16 | RISK-02: определить магазин/ownership/маршрут и retry |
| 4 | Operations/Time | Обрыв reverse SSH после apply даёт ложный retry/receipt | 4 | 4 | 16 | RISK-03: remote state, lock, повторная сверка |
| 5 | Data | Restore перезаписывает три существующих Cloud аккаунта | 2 | 5 | 10 | ADR-002 запрещает overwrite; restore только отдельно, сравнение schema/counts |
| 6 | Structure | Test alias указывает на production Compose/volume/socket | 3 | 5 | 15 | FR-5 и target allowlist; отрицательная проверка фактической identity/mounts до apply |
| 7 | Structure/Data | Тег либо диск исходников не соответствует runtime SHA | 3 | 4 | 12 | ADR-001: один build, полный SHA, OCI revision, image ID и checksum отдельно |
| 8 | Operations | Один хост обновлён, второй нет, общий результат успешен | 3 | 4 | 12 | ADR-001: отдельные receipts и ненулевой exit; проверить fail второй цели |
| 9 | Platform | Образы/backup заполняют диск и нарушают legacy | 4 | 4 | 16 | ADR-002: ресурсный preflight, STOP без удаления старых ресурсов; учесть перенос tar и место restore |
| 10 | Data | Rollback приложения несовместим с новой схемой | 3 | 4 | 12 | ADR-001 разрешает только совместимый manifest; проверять на restore, БД не откатывать вслепую |
| 11 | Time | Selection cookie истекает посреди multipart/payment CJM | 3 | 4 | 12 | RISK-01: fail closed для контекстных mutations, не fallback в legacy |
| 12 | Interfaces | Spoofed XFF разрешает чужой webhook | 3 | 5 | 15 | ADR-002 требует IP; RISK-02 требует отдельные прямую/proxy цепочки и native handler |
| 13 | Data | Единственный backup остаётся на той же ВМ | 3 | 5 | 15 | FR-4 независимый backup/restore; в плане задано внешнее защищённое хранение, подтвердить при исполнении |
| 14 | Function | Страница возврата выдаётся за применённую оплату | 3 | 4 | 12 | 02/05 явно запрещают такое доказательство; нужен настоящий callback и ledger |

## Условия

### RISK-01 — HIGH, structural

До планирования закрепить контракт изоляции candidate/legacy на общем hostname: независимые session/signing secrets и имена auth-cookie, host-only selection cookie с явными Path/SameSite/TTL/revocation, отсутствие утечки через shared cache; переходы и истечение selection cookie не отправляют candidate mutations в legacy. Confirmation должен проверять legacy login → candidate login → logout/expiry и отсутствие чужих данных/записей.

Основание: ADR-002:34–46 определяет Secure/HttpOnly selector и legacy default, но не жизненный цикл, auth-cookie namespace и cache. Архитектура:24–28 не определяет переход с действующей legacy session; Confirmation ADR-002:51–53 ограничен выбором backend и spoofed IP.

### RISK-02 — HIGH, structural

До планирования определить native маршрут реального тестового магазина: отдельный магазин либо однозначное владение provider payment ID/intent и безопасная маршрутизация уведомлений между действующим test и candidate. Закрепить защиту текущего test, pending/retry, повтор без второго grant, отказ чужому shop/test-mode/intent и проверку прямой/проксированной IP-цепочки без browser cookie. Смена единственного callback магазина без такого решения запрещена.

Основание: 02_research: существующий магазин уведомляет прежний test. ADR-002:38–39 требует IP и provider verification; архитектура:27–35 оставляет маршрут не определённым. Эти проверки сами по себе не устанавливают принадлежность candidate intent и сохранение существующих test callbacks (FR-5).

### RISK-03 — HIGH, structural

До планирования определить отказоустойчивый протокол обратного SSH: проверенные host identity и loopback bind, preflight срока ключа/transient unit, запрет расширять/продлевать доступ автоматически, запись remote apply state и сверка runtime после потери соединения до повторного apply. Зафиксировать один writer/lock на цель, безопасное возобновление и доступный оператору путь восстановления; disconnect/expiry между apply и receipt не равен доказанному откату или успеху.

Основание: 01_requirements:59–60 фиксирует временный туннель/expiry; ADR-001 требует частичного receipt, архитектура:7–15 — проверенного SSH. Не определено, как отличить завершённый remote apply от прерванного после исчезновения обратного туннеля, и кто исключает конкурентный apply.

## Сохранность, источник истины и production fence

Git SHA и единый image set — источник версии; реально запущенные image IDs подтверждают доставку. Runtime правки не заменяют Git. Продуктовая БД остаётся источником истории аккаунтов, кредитов и платежей, Redis — транспортом. Receipt не доказывает сохранность содержимого БД. Откат совместимого приложения не разрешает restore старой пользовательской БД.

Дизайн правильно сохраняет старый Cloud-контур, требует отдельные DB/Redis/volumes/S3, независимый backup и restore до старта writers. Проверка effective IAM должна охватывать read/write/delete и multipart на операторском canary, не пользовательских объектах; совпадение/различие bucket name не доказательство. Production lifecycle/versioning и credentials менять не разрешено. Старый shared-S3 контур не становится безопасным от самого наличия нового кандидата: этот выпуск не должен давать ему новых прав либо запускать дополнительные legacy writers.

FR-5 исключает production-цель, DNS и production web/worker/edge. Изменение только тестового Cloud edge требует проверки legacy default и его восстановления. План переноса не расширяет полномочия этого выпуска; freeze/drain/final cutover остаются будущим отдельным решением владельца.

## Проверки для будущего плана

Приоритет: закрыть три условия в ADR/архитектуре; затем отрицательные storage/target guards до любого старта candidate web; backup → restore отдельно; fault injection SSH expiry/disconnect/concurrent apply и второй неуспешной цели; browser переходы legacy/candidate и cache; настоящий тестовый checkout → native callback → единственный grant с сохранением прежнего test. После этого полный core-CJM, повторный коммит и совместимый rollback. Health и симулированный webhook не заменяют эту приёмку.


---

## Новая focused design revision — 03.11.2026

Вердикт: **CONDITIONAL**. Точная модель `gpt-6.1-sol` подтверждена turn_context текущей CLI-сессии; новая сессия `01a1a23d-e899-7e62-bf84-5f5277b8cf5c`, alias `qcsd-risk-ownersteering-438e9f33`. Роль `qcsd-risk`, family `owner-exception`, independent=true, без coding context и без субагентов. Это ideation, не implementation/cross-model code review. Прежние секции выше — история других revisions, включая отменённые IAM/отдельный shop допущения; их CLEAN к этому snapshot не относится.

Revision `438e9f3392dfaa4d2a2b559c8b93424f287a711cfc4072cf1d0d6c09ad436f99`, nonce `45a15542-cba7-4ac0-bdf0-f671e3404baf`. Самостоятельно сверены **8/8 SHA-256** и hash manifest. Входы: сначала AGENTS.md/docs/review-policy.md; затем 00/01/02, ADR-001/002/003, 04/05 и 06 plan; дополнительно CLAUDE.md, docs/acceptance/core-cjm.md, pinned feature-adr 1.5.25 scripts/check-review-convergence.mjs и modules/03.5/08. План не входит в восемь host hashes: его отдельно прочитанный SHA-256 `c78d59ad5d1e3ad4d30f307339e68a31902a840f68a3aaf8db7bb5af4e769878`. Actual author handoff/newRisks в текущем JSON прочитан после собственного чтения дизайна; structural classification проверена. Его заявления о live inventory/build/backup приняты как обозначенные inputs, не независимые результаты этой сессии.

- **RISK-01 — verified (design).** Selector и два backend общего origin устранены; отдельные c/n5 test copies, session secrets и CJM-08. Исходное условие сохранено без изменения ID/meaning/scope/evidence.
- **RISK-02 — НЕ ПОДТВЕРЖДЕНО, HIGH/structural.** [ADR-002](../03_adr/002-isolated-cloud-candidate.md):87–94 и [05](../05_architecture.md):141–154 требуют drain/switch/native/return, но запрет новых checkout указан лишь при неизвестном исходе/превышении окна. [06 TASK-7](../06_implementation_plan.md):77 повторяет этот пробел. После pending n5=0 и switch в Cloud новый n5 checkout создаст intent, чей callback Cloud обязан отвергнуть как чужой. Перед возвратом возможна симметричная гонка Cloud checkout. До закрытия условия закрепить admission barrier: остановить новые и завершить in-flight создания intents до drain; удерживать запрет checkout неактивной стороны всё время чужого callback; перед возвратом закрыть Cloud admission, завершить pending/retry notifications/unknown и лишь затем switch/проверка/возобновление n5. Нужна будущая негативная проверка checkout между drain/switch/return. Это требование безопасного окна нынешнего TEST shop, без требования нового магазина. Scope и исходное evidence RISK-02 в JSON сохранены; новый ID для того же риска не создаётся.
- **RISK-03 — verified (design).** Host key/loopback/expiry, один lock/state до mutations, unknown/reconcile без auto-resume/продления доступа закреплены FR-6, ADR-001, 05 и TASK-1/5.

В остальном проверенный дизайн содержит нужные барьеры: только cloud-c/site-test по SSH; controller не target; app/infra projects и pinned DB/Redis/network/volume разделены, SQL DB/host из application DATABASE_URL, не POSTGRES_DB. Сохранение ВСЕХ строк/volumes, fresh drift/full baseline, DB-whitelist ownership, drain старых multipart, streaming copy source/dest size+SHA, originals и logical keys, namespace-compatible rollback заданы до apply. Достаточность диска при 3,6 ГБ не обещана: admission archives/layers/temp/current+rollback/reserve до transfer, без global prune. Production cutover запрещён.

Общий key с полными production-правами — принятое owner exception. Проверены полнота запланированного SDK command/signing/request+response/marker контракта, raw wire pipeline, оба clients, real MinIO/two namespaces/outside canary и env adapters web/stt/render. Cloud canary только tests/cloud/ и tests/site/; новый key/policy/IAM/403 не gate. Copy legacy reads отделён от scoped SDK proof. Эти safeguards ещё требуют кода/реальных receipts; bypass SDK/key compromise остаётся production-wide. Точный build-time wiring fix и повтор full suite после 7 failures предусмотрены, guard не ослабляется.

Границы: изменены только собственная review entry и этот отчёт; исходные RISK-01..03 сохранены. JSON записан под общим fcntl.flock и atomic temp+os.replace, host/author/другие роли сохранены. structural true у RISK-01/03 значит проверенный дизайн; false у RISK-02 и delta означает незавершённое structural исправление. Код, app scans/tests, SSH/infra/DB/S3/payment UI, E2E и текущий полный CJM не проверялись и не объявляются passed. Старые 10 tests/partial controller не feature proof. Независимое code review и живой допуск остаются последующими этапами.


---

## Повторная focused design verification — revision 88a51b4e (03.11.2026)

Вердикт **CLEAN для ideation роли qcsd-risk**. Модель `gpt-6.1-sol` подтверждена latest turn_context; повторная проверка в той же независимой CLI review-сессии `01a1a23d-e899-7e62-bf84-5f5277b8cf5c`, alias `qcsd-risk-ownersteering-88a51b4e`, без coding context. Это продолжение собственного ревью, не новая coding/code-QE сессия.

Snapshot `88a51b4e4a3a5c8a19eda3941712c8fd424e34e4b645baf33068755e2b02984a`, nonce `3a6d97cf-4396-4b28-be4e-d8b47c69eb3a`: самостоятельно сверены **8/8 SHA-256** и hash manifest. Прочитаны current author handoff/newRisks, изменённые 01/ADR-002/05, актуальный 06 TASK-8/9/AM-16/17 и их зависимости. 06 отдельно проверен SHA-256 `a8dba153b1b6e497a7bfe05c7e13b1827c16ef40b9f4d9568f96d0cc9bd7826a`; он не входит в восемь host hashes. Авторская история и все 14 host conditions сохранены, чужие условия не оцениваются как закрытые этой ролью.

**RISK-02 verified (design):** 01:84–97, ADR-002:133–144, 05:156–166, TASK-8/AM-16 задают строгий server gate N5_CHECKOUT_ENABLED/default true. False после прежних rate/origin/auth, до body/createIntent/provider create даёт503; webhook/status/provider остаются live. Freeze обеих test copies и прекращение старых in-flight предшествуют DB/provider drain и callback switch. После подтверждённого Cloud callback открыт только Cloud, site закрыт весь window. Перед возвратом Cloud frozen/drained, после подтверждённого n5 callback открыт только site; Cloud остаётся закрыт. Нулевой pending до freeze/UI hiding/mode off не proof. Предусмотрены negative creation и live receipts обоих направлений. Прежняя гонка новых intents после drain устранена в дизайне; native/IP-proxy/shop/mode/intent/replay-one-grant и unknown-stop требования сохранены.

**RISK-01/03 повторно verified (design):** selector отсутствует, отдельные test sessions/данные; SSH host-key/loopback/expiry, единый lock/atomic state, unknown→reconcile до retry и запрет auto-extension сохраняются. Все исходные ID/meaning/scope/evidence RISK-01..03 оставлены неизменными. Новых серьёзных условий не выявлено.

Проверен связанный monetary delta: January2030/Moscow boundaries, R1/R2=248000/399000, total647000 коп., distinct payer один, null/20/30, отдельные исключения/immutable snapshot; refund149000 → total498000 и99600@20/149400@30 согласованы. PG fixture отделён от live current-month native receipt сверок обеих ролей. QT-07 принадлежит другому reviewer. SDK/wire/MinIO/copy/drain, pinned DATABASE_URL DB/split projects/volumes, disk admission при3,6ГБ и production fence не ослаблены; production-wide key остаётся owner exception без IAM/new key/403 требования.

Записана только собственная entry под общим fcntl.flock + atomic temp/os.replace и дополнен этот отчёт; host/author/чужие роли сохранены. structural implementationVerified=true относится только к исправленному дизайну текущей revision. Код, тесты, live/infra/SSH/DB/S3/payment UI и текущий полный CJM не проверены. K2 PASS и прежние controller tests не служат approval/implementation proof; общее convergence закрывает host после всех ролей.


---

## Focused real-S3 design revision — b5222cf1 (03.11.2026)

**CONDITIONAL.** Модель `gpt-6.1-sol`, latest turn_context; та же независимая CLI review-сессия `01a1a23d-e899-7e62-bf84-5f5277b8cf5c`, alias `qcsd-risk-real-s3-b5222cf1`, без coding context. Проверены8/8 hashes запрошенного2a38b90e; после root correction01:151 повторно сверены8/8 hashes и manifest actual host `b5222cf1623381938211289ab196fdec4e50b4f790ebaddc3c120f632e2a7b49`, nonce `fea02044-b906-4b52-a9ac-db4d7b07e2e8`. Host/review binding теперь совпадает. Inputs: actual author handoff/newRisks,01/02/ADR003/05,06,OpenSpec spec/design/tasks и прежние зависимости. 06 отдельно SHA-256 `7ad8a0f19c4b300ad894d02c029cfd92701ad38f3e114fc7154ba185aaaa7cd0`,27 targets.

RISK-01..03 **design verified** на actual snapshot: session/backend isolation, freeze обоих checkout до drain/switch и симметричный return, SSH lock/state/unknown/reconcile сохранены. Исходные ID/meaning/scope/evidence не изменены;14 host conditions сохранены, чужие роли не закрываются этой записью.

**RISK-04 — новый HIGH/structural, unresolved.** ADR003:116–125 включает negative guards в настоящую S3 integration;109–115 описывает fake unit transport,126–132 запрещает опасные bucket operations, но не отделяет dangerous rejection probes от real transport независимо от проверяемого middleware. При намеренном bypass/регрессии guard unknown/bucket mutation/foreign-path запрос может уйти с production-wide key до capture/assert FAIL; exact cleanup чужие данные/metadata не восстанавливает. Требуется non-forwarding execution опасных negative probes либо независимый fail-closed harness перед HTTPS с current-run key/prefix/uploadID allowlist и versioning-read исключением. Attempted unsafe egress обязан давать SDK test FAIL, предотвращение harness не SDK proof. Legal positive operations остаются real S3; future injected bypass должен дать FAIL и ноль реальных unsafe requests. Scope ADR003/05/01; нового key/IAM нет. Это пробел дизайна тестового исполнения, не кодовый дефект.

Остальные границы проверены: HTTPS Cloud S3/common bucket/current key,random runUUID; outside-cloud raw canary только tests/site/<run>; no Create/DeleteBucket/root listing/metadata mutations,exact known-key/uploadID cleanup,wire/signing/pagination/erasure/canary SHA-size proof/no-skip. Три legacy integrations сохраняют сценарии/PG *_test isolation,reuse StorageClient/helper existing fixtures; lifecycle общего bucket не предполагается отсутствующим. MinIO PASS не переносится на Cloud. Copy/drain/volumes,pinned DATABASE_URL/split projects,SSH/disk admission/production fence остаются gates будущего исполнения.

Изменены только own entry под fcntl.flock+atomic temp/os.replace и этот отчёт; host/author/other entries сохранены. structural true у RISK-01..03 — только дизайн; RISK-04/delta=false требуют rework. Код/app scans/tests/live S3/infra/SSH/DB/payment/full CJM не проверялись; final codeQE отдельно.


---

## Focused fence design verification — 990c9af9 (03.11.2026)

**CLEAN для ideation роли qcsd-risk.** Точная модель `gpt-6.1-sol` подтверждена latest turn_context; продолжение той же независимой CLI review-сессии `01a1a23d-e899-7e62-bf84-5f5277b8cf5c`, alias `qcsd-risk-fence-990c9af9`, без coding context. Host/review revision `990c9af993e75ca5552d9b071b76857e94f876fec14f6fdb87e30b9dd94c6b67`, nonce `aa531874-11fe-46dc-a376-443dfa2c84fa` совпадают; самостоятельно сверены **8/8 SHA-256** и hash manifest. Inputs: actual author handoff/newRisks,01 FR-8,ADR003,05,06 AM-18/provider amendment и затронутые прежние зависимости. 06 отдельно SHA-256 `dab44a6e31a1ac7e44311d5d0514d3d90226af1d2edf1486ac8efc2859a3ab6f`,27 targets.

**RISK-04 design verified.** 01:163–182/ADR003/05/AM18 требуют test-only fence до реального requestHandler.handle internal/signing/raw и signed fetch. Независимый physical parser допускает только exact HTTPS endpoint/bucket/current-run objects/list prefixes+markers и versioning-read GET exact bucket; raw canary exact-key/no-list. Mutations/root listing/CopySource/other bucket queries/encoded escapes/outside keys отклоняются до I/O. Dangerous SDK negatives исключительно fake HTTP; deliberate SDK-off/broken fake-counter сценарий доказывает zero I/O и не выдаётся за live proof либо корректность SDK guard. Legal positive tests остаются на настоящем Cloud S3. Existing liveS3Environment config/bind/fetch переиспользуется тремя legacy integrations; private pre-PUT journal фиксирует keys/uploadIDs/unknown outcomes, cleanup не скрывает primary error и не даёт PASS при ошибке. Ранее найденный риск устранён в дизайне.

RISK-01..03 повторно **design verified**: selector/fallback отсутствуют; server checkout freeze обеих copies до drain/switch и симметричный return сохраняются; SSH lock/atomic state/unknown→reconcile/expiry и disk admission не ослаблены. Все четыре исходных condition dictionaries сохранены без изменения ID/meaning/scope/evidence, теперь в conditions как host lineage. Host16conditions/author/чужие entries не менялись; QQ/QT и история QT08 принадлежат другим reviewers. Новых серьёзных условий не выявлено. Production-wide key остаётся принятым owner exception без IAM/new key/403; Cloud-only real proof обязателен, MinIO history не переносится. Site copy/SHA/drain/data/volumes/topology/resource gates остаются будущими обязательствами.

Изменены только собственная JSON entry под общим fcntl.flock+atomic temp/os.replace и этот отчёт. structural implementationVerified=true означает independently verified design текущей revision; код/app scans/tests/live S3/infra/SSH/DB/payment/full CJM не проверены. Это не общий convergence approval и не final codeQE.


---

## Focused owner-preservation design verification — ba9cf99c (03.11.2026)

Роль `qcsd-risk`, family `owner-exception`, verdict **CLEAN для ideation**. Продолжение собственной независимой design-only CLI-сессии `01a1a23d-e899-7e62-bf84-5f5277b8cf5c` (исходный model ID `gpt-6.1-sol`, подтверждён ранее; metadata/env на этом шаге не читались), alias `qcsd-risk-preservation-ba9cf99c`. Snapshot `ba9cf99c151cce2b7743e94b98e27f0c26d1be98b48080b749b3f5468b2e372f`, nonce `6b1467c6-00ff-4452-956d-143cb8ac52b5`. Самостоятельно сверены8/8 SHA-256 и hash manifest;06 отдельно `ec386e29fbb4f72a05bacc0d9aa350c383a55874550f4d6e21a8217130254cd7`.

Inputs сначала: актуальные01,триADR,04,05,06,core-CJM и OpenSpec change; затем собственные host conditions и actual author handoff/changedPaths. Affected dependencies: operator runbook,README и только новый preservation раздел07. Чужие review conclusions/исторические live claims не использованы как evidence.

RISK-01/02/03/04 **verified на текущей revision только для дизайна**,все исходные ID/meaning/scope/evidence сохранены дословно. Session/backend isolation,checkout freeze→drain→callback confirmation и симметричный return,SSH lock/state/unknown/reconcile/expiry и disk reserve,независимый physical test fence остаются обязательны. Новых серьёзных conditions нет.

Реальная structural дельта проверена: явное «Сохранить все существующие данные n5» разрешает реальные existing uploads,не приписывает им synthetic provenance. Approval owned regular0600/no-symlink связывает actual decision/evidence reference с exact site-test/project/full sourceIdentity/bucket/tests-site prefix и stable sorted whitelist hash. Canonical DB ownership/source-size-SHA/destination/originalShaAfter отдельно обязательны; чужая ссылка/missing/conflicting object/drift/pending multipart блокируют admission. Approval — scope receipt,не аутентификация owner. Initial требует legacy-preserved у ВСЕХ объектов и approval до staging; prefixed не обход;receiver повторяет kind check под lock до load. Steady только prefixed без старых-original reads;Cloud initial пустой и не покрыт этой квитанцией. Full baseline всех public tables/columns/counts/hashes/source-bound restore/drift,streaming whitelist copy,originals/logical DB keys/volumes/данные всех фаз и schema+namespace-compatible rollback сохранены. Production cutover запрещён; legacy exact reads — отдельный preservation step,не расширение fixture scope.

Собственная entry обновлена атомарно под указанным owned0600 `qcsd-preservation-receipt.lock` с повторным чтением/проверкой binding внутри flock;host,author,otherentries/envelope сохранены,история отчёта дополнена. `implementationVerified:true` здесь означает исправленный дизайн. Код/tests/live/SSH/Docker/API,env/приватные данные/медиа/ключи не читались и не запускались;другие модели/CLI/агенты не вызывались,commit отсутствует. Незавершённые backup/copy/S3/checkout/CJM gates не закрыты. Prepare/evaluate и общий convergence не выполнялись.
