# QCSD security: focused originating recheck R3

**Результат роли: CLEAN для проверенного дизайна UXS-SEC-001.** Единственное исходное условие этой роли сохранено без изменения и независимо проверено на текущем снимке. Это не подтверждение реализации и не закрытие общего convergence.

Роль `qcsd-security`, исходный reviewer и продолжение прежней сессии; запрошенная модель `gpt-6.1-terra xhigh`, автор архитектуры — Astra. Доступного независимого provider attestation модели/effort нет. `owner-exception` отражает временное решение владельца о cross-model.

## Измерения и входы

- `sha256sum -c features/ux-simplification/implementation-design-inputs-r3.sha256`: **98/98 OK**, SHA-256 списка `191a937786aeed05315e90f8f2430fa3967a98eb7a89996c15e3cac522fc9692`.
- Утверждённый HTML: `a85b3f073a335871e421ea2079269fa19c71f42a263d7b0bd17ae30469c50e68`, совпадает с approved SHA.
- Host nonce `8eff00a1-1ae5-4320-97e9-1615f6d0ba20`; revision `8089a54c3cb9281c79972e951c318814e62a3eff7829abcecdf1fd40ab680659`. Побайтно пересчитаны все семь файлов snapshot и SHA-256 компактного JSON измеренного manifest: совпадают с host. Проверен один исходный security ID среди десяти host conditions; другие verdicts не читались.
- Прочитаны актуальные requirements, ADR 001–003, DDD, architecture, proposed 06, `author-response-qcsd-r3.md` и настоящий author object из receipt; последний сравнен с handoff при записи. R3 не меняет смысл исходного условия. Root06 — предлагаемый план, не доказательство выполненных тестов.

## UXS-SEC-001 — независимая проверка исправления дизайна

**Исходный риск:** самостоятельная stats без состояния `personalLink` могла передать `undefined` как `blockedPersonalId` и показать copy для заблокированной личной ссылки. Серверный обход не был доказан.

**Source evidence:** `apps/web/src/server/partner-code.ts:6–12` выбирает первый код по `(created_at,id)`, сохраняя blocked; `apps/web/src/server/partner.ts:119–125,153` для текущего account возвращает тот же отсортированный набор без фильтра и отдельно фильтрует итог; `packages/db/migrations/001_init.sql:75–77` ограничивает account одной partner row. Это подтверждает семантическое совпадение identity **при одинаковом состоянии БД**, включая tie, на уровне чтения исходников, не DB execution.

**Проверенный дизайн:** `features/ux-simplification/03_adr/001-place-context-in-existing-pages.md:55–65` требует unfiltered account-scoped base на direct/reload, отдельные filtered данные, защиту от устаревших ответов по generation/account/filter, запрет copy при unknown/error/refresh и отсутствие copy/manual fallback blocked personal в обеих областях. После успешного base сохраняется copy активной дополнительной ссылки и legacy non-personal режим. Empty не вызывает ensure; URL использует server `publicOrigin`. Автор явно признаёт гонку серверной блокировки после прочтения и сохранение серверной проверки. Архитектура `05_architecture.md:194,202` и DDD `04_domain_model.md:82–84` согласованы с этим правилом, FR-4 и требования `01_requirements.md:29,46` сохраняют роли и границы. Проверка не выводит гарантию актуальности статуса вне момента чтения.

**Confirmation:** `03_adr/001-place-context-in-existing-pages.md:65` и proposed `06_implementation_plan.md:97,101` задают direct/reload, tie, oldest blocked + later active, фильтр, unknown/error, empty, legacy, 0 ensure и negative controls для filtered identity/undefined guard. Результатов исполнения нет. На текущей стадии этого достаточно, чтобы проверить именно design fix исходного условия: `implementationVerified:true` в ideation означает подтверждение документов, а не кода.

## Delta / affected dependencies / new risks

Сравнение общих записей R2 и R3 manifests показало изменения только в ADR-002, DDD, architecture и proposed plan; шесть R3 записей добавлены, удалённых нет. Фактический diff четырёх документов касается baseline per-clip и его confirmation, а не решения personal identity. В `03_adr/002-preserve-state-with-stable-owners.md:51–60`, `04_domain_model.md:87`, `05_architecture.md:198,208` и `06_implementation_plan.md:96` R3 фиксирует baseline до mutation, ограничивает scope attempt, отбрасывает старые ответы и не приписывает версию операции без ID. `author-response-qcsd-r3.md:5–11` честно сохраняет неизвестность concurrent attribution и NOT RUN. Для security не обнаружено нового материального риска в этом изменении; это не независимое закрытие условия владельца другой роли.

В затронутом account ADR `001-place-context-in-existing-pages.md:69–75` требует сверить identity profile с `pageAccount` и не передавать operator/support secrets; `apps/web/src/server/support/page-state.ts:3–24` подтверждает форму projection и session-bound чтение. Фактический новый SSR wrapper ещё отсутствует; утечка на его реализации не проверена. Новых условий не создано.

## Ограничения

Только чтение, сравнение документов и локальное хеширование. Код, browser/UI, E2E, DB, SSH, S3, provider, deployment и runtime tests **NOT RUN**; WCAG и UMUX не измерялись. На уровне implementation нужны реальные изолированные проверки blocked/active/filter/direct/reload/unknown и server auth/account isolation, затем независимое code/QE и антидрейф. Не запускались host prepare/evaluate; общее закрытие convergence, K1/K2 и plan checkpoints должны быть установлены координатором отдельно до Step7.
