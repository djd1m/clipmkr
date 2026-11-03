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
