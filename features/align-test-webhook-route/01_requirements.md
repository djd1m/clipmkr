# Требования: TEST callback в основной контур

06.11.2026. Авторский bounded R3 по RISK-03 отдельного операционного плана. Авторитетная дельта: `openspec/changes/align-test-webhook-route/specs/test-webhook-route/spec.md`; точные SHA ниже. Proposal: `openspec/changes/align-test-webhook-route/proposal.md`. Это не полная копия specification и не успешный payment receipt.

## Участники и источник

Владелец принимает CJM; единственный ранее утверждённый TEST аккаунт выполняет платёж; оператор выполняет ограниченный routing change; независимая модель проверяет plan/code/runtime evidence по `docs/review-policy.md` и `docs/model-matrix.md`. UI-макет и UI run не меняются.

Read-only источники приватны: `callback-identity-readonly.private.json` (2026-11-05T22:44:17.948110+00:00) и `callback-native-readonly.private.json` в payment-cjm evidence каталоге координатора. Измерено sameBusinessDatabaseEndpoint=false, sameDatabaseURL=false, sameTestShop=true. TEST callback направлен `n5-referral-paytest-20261028:3000`; обычный main route — `n5-clipmaker-proxy-1:80`. Не публиковать DB URL, аккаунт, секреты, полный edge config других проектов.

## Трассировка требований

| ID | Нормативная секция ledger | Критерий приёмки |
|---|---|---|
| FR-1 | TEST callback использует основной владелец checkout | Единственный upstream delta; alias/rewrite/XFF прежние; runtime identity подтверждает основной DB/store |
| FR-2 | TEST изоляция и настоящая приёмка | global=false, sole approved account, test=true, test_ secret; успешный TEST callback/grant, повтор без double-grant, отказ/отмена без grant, повторный вход |
| FR-3 | Проверяемое и обратимое применение одного блока | Private backup SHA; до записи candidate validate; тот же inode, fd write+fsync, validate→reload существующего edge; точный rollback при сбое |
| NFR-1 | Проверяемое и обратимое применение одного блока | Не меняются image/env/worker/DB schema/DNS/Cloud/legacy state; health baseline сравним до/после; секретов и полного config в Git нет |

## Граница и зависимости

Разрешённый будущий runtime delta: одна upstream строка в одном handle существующего Caddyfile; TEST CJM использует только штатные бизнес-операции приложения. Нет ручных grant/SQL mutations, миграций, network connect, новых контейнеров, restart-all, реальных списаний, переноса данных или отключения legacy. Если main proxy недоступен в существующей сети, XFF не соответствует текущему trustedProxyHops или TEST isolation не подтверждена — STOP, отдельное решение до изменений.

Точная конфигурация test mode/key проверяется приватно по boolean/prefix; реальные значения не включаются. Совпадение TEST shop не доказывает совпадение DB. Успешный return URL не доказывает provider success/grant. Отсутствие live доказательства не объявляется дефектом иных путей.

## Lessons и открытые gates

Исторический recall teach:b9ca1b2cc77e0c4e применён к pinned project helpers. Остальные 2 результата UI-specific и не задают требования. Originating R2 own-review выполнен всеми тремя ролями; actual helper evaluate exit1, revision `9ed383d54b27a251ef6d56db8009baf7e36249b06ccb887134f4ea8cf649c635`, unresolved только RISK-03. Это надлежащий originating результат, не прежний not-established. R3 author correction не закрывает это условие и не переносит старые verifications на новые bytes автоматически. Для M модуль03.5 требует три core-роли; security perspective содержится в risk report, это не отдельный security run. Исторический K1 free и K2 для прежнего SHA описаны в02/history; актуальные structural gates не заменяют formal checkpoints, implementation, actual executor review/fixtures и code/runtime QE. Coordinator фиксирует действительное делегированное решение; этот planner не создаёт подтверждения владельца.

## Решение о requirement delta

RISK-03 подтвердил permission drift: прежний дизайн допускал historical canonical reconciliation, хотя OpenSpec разрешает только штатные записи утверждённого TEST CJM. R3 **удаляет** это действие и зависимость, не расширяет spec/authorization. FR-1/FR-2/FR-3/NFR-1 и точные spec/proposal bytes остаются прежними. O/E/H crash/write/executor/health контракты не ослабляются.

В этой feature historical TEST debt — только read-only inventory/classification и отдельный deferred backlog/протокол05§P3; он **не resolved**. Никаких old-intent grant/payment_event/payment updates, relay/POST, отмены через mutating status GET, чужих account writes или cleanup/migration. Техническое решение root в этой feature не снимает нормативный запрет. Дальнейшая работа с долгом потребует отдельного scope/полномочий/gates вне этой feature, они здесь не создаются.

New-CJM root GO возможен после полного свежего BOTH-store inventory, known event-time/доказанной upper-bound classification, отсутствия активных/неопределённых relevant payments/inflight, route health и нового baseline sole approved target. Классифицированный старый terminal debt с истёкшим relevant event window не требует grant до нового CJM. QA-оператор создаёт checkout лишь после GO/baseline для sole approved target; дальнейшие business requests/controlled relay допускаются только для exact нового intent, возвращённого этим checkout. Old или nonapproved intent → STOP **до POST/relay/иного способного писать запроса**. Native обычный provider traffic и app handler этой фичей не меняются.

Anti-drift: AM-8 в06 проверяет negative old-approved/pre-GO и nonapproved intent с нулём business calls и positive control нового approved intent после GO/baseline, в прежнем future test path. История, root facts и снимки не являются новой authorization; отсутствие historical mutation не объявляется решением старого долга.

## Ревизии нормативных входов

- spec SHA-256: `392b589b5651f5d78ab26ac808e9c8e4f5b517fa0e1ab80321888b0d26305cb6`
- proposal SHA-256: `9e8503ffe9457372e92b4a32f4a20c78a6dfb8b5527960d1bb7de45d4d12e2cc`
