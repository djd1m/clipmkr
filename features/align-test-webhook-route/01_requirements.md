# Требования: TEST callback в основной контур

05.11.2026. Draft отдельного операционного плана. Авторитетная дельта: `openspec/changes/align-test-webhook-route/specs/test-webhook-route/spec.md`; SHA ниже вычисляется после записи. Proposal: `openspec/changes/align-test-webhook-route/proposal.md`. Это не полная копия specification и не успешный payment receipt.

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

Recall teach:b9ca1b2cc77e0c4e применён к pinned project helpers. Остальные 2 результата UI-specific и не задают требования. Независимые QCSD quality/risk/testability, conditional security (external payment callback), формальные checkpoints, K1/K2, implementation, runtime validate/reload/rollback rehearsal и независимый QE ещё не выполнены. Coordinator фиксирует действительное делегированное решение; этот planner не создаёт подтверждения владельца.

## Ревизии нормативных входов

- spec SHA-256: `392b589b5651f5d78ab26ac808e9c8e4f5b517fa0e1ab80321888b0d26305cb6`
- proposal SHA-256: `9e8503ffe9457372e92b4a32f4a20c78a6dfb8b5527960d1bb7de45d4d12e2cc`
