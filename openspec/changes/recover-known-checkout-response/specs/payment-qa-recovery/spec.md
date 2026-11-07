## ADDED Requirements

### Requirement: Прочитать checkout response до его потери при навигации
QA MUST сохранять actual request/status/body evidence до смены документа без создания дополнительного checkout. Ошибка MUST иметь безопасный diagnostic code; секреты/confirmation URL остаются вне Git.

#### Scenario: Немедленный переход после201
- **GIVEN** настоящий Chrome и локальная синтетическая checkout форма с немедленной навигацией
- **WHEN** тест захватывает ответ единственного POST
- **THEN** original RED на Network.getResponseBody сменяется GREEN с точным request/body binding без второго POST

### Requirement: Восстановить только известную исходную попытку
Восстановление MUST доказывать exact operation/ticket/case, account, browser idempotency key, исходное окно и provider id/metadata/shop/TEST/SKU/amount. Original operator request_key и browser key MUST оставаться различимыми. Recovery MUST записывать собственную provenance и сохранять failed/consumed-unknown историю исходного helper.

#### Scenario: Однозначное pending намерение
- **GIVEN** failed browser.open и одно read-only доказанное TEST pending намерение исходного ключа
- **WHEN** отдельно рассмотренная bounded recovery сверяет все bindings и fresh route/control
- **THEN** она может разрешить только exact известное дальнейшее действие по нему, без нового checkout/ключа/ledger write и без ложного completed старого helper

#### Scenario: Неизвестная или неоднозначная попытка
- **GIVEN** absent/duplicate/mismatched intent, чужой account/shop, изменённые records или неизвестное completion
- **WHEN** оператор рассматривает recovery
- **THEN** STOP до изменения journal authorization или provider и без очистки прежних records

#### Scenario: A0 unknown сохраняет отказ existing recovery
- **GIVEN** exact original target, но historical clock/causal A0 NOT_VERIFIED, даже при fresh canceled/unpaid evidence
- **WHEN** вызывается pending recovery либо `terminal_from_origin`
- **THEN** STOP до recovery authorization; administrative status не подставляется в A0, response_at/clock proof не выдумываются

#### Scenario: Исходная попытка истекла до recovery
- **GIVEN** exact original failed-open/consumed-unknown, fresh read-only provider canceled/paid=false/expired_on_confirmation, DB intent=created и complete source-bound BOTH-store proof без target payment/grant
- **WHEN** отдельный terminal-only metadata admission проверяет original identity, actual captured source bytes, fresh control/health, прежние locks и полный canonical cutover с event/delivery/ACK predicates
- **THEN** он может завершить только эту попытку через B1 fence и обе durable reconciliation записи, без pending bound/active_case/callback/session/checkout; failed origin, разные keys и DB status сохраняются, outcome expired_before_recovery не является decline/manual-cancel PASS

#### Scenario: Terminal observation не заменяет полный cutover
- **GIVEN** provider canceled, но identity/source mismatch, неполная event/delivery history, неизвестная relevant event bound или actual event ещё внутри canonical24h
- **WHEN** рассматривается прямой terminal-only reconcile
- **THEN** STOP без closure или нового действия; только provider GET не является webhook event и не создаёт фиктивное24h окно, а intent.created_at не заменяет actual relevant event bound

### Requirement: Сохранить изоляцию и честный результат
Recovery MUST сохранять global-off/sole approved TEST target, source identity, canonical health/revalidate, stable locks,24h event bounds, own-session positive cleanup и запрет historical grant/relay. Pending MUST NOT называться terminal/no_pending, controlled relay MUST NOT называться provider redelivery.

#### Scenario: Повторное или незавершённое восстановление
- **GIVEN** уже consumed recovery либо после прерывания остались snapshot, `.next`, health/business переход, interrupted/partial record или неизвестный результат
- **WHEN** повторяется восстановление или незавершённый переход
- **THEN** MUST STOP до эффектов, сохранить все прежние bytes/artifacts; автоматическое продолжение, очистка, достройка и новая namespace/покупка запрещены

#### Scenario: Новый явный вход до первой записи
- **GIVEN** прерывание до любой progress-записи; заново доказаны pristine original state и отсутствие partial/unknown, не только отсутствие файлов
- **WHEN** оператор явно начинает отдельный вход под прежними locks с повторной свежей проверкой identity/source/phase/history/financial/actor/control/health и действующей ограниченной authority
- **THEN** MAY выполнить исходную разрешённую metadata transition; отсутствие артефактов само по себе не GO, прежний checkout не повторяется и новые полномочия не возникают
- **AND** wrong phase, stale/expired authority, missing/unknown proof MUST STOP до следующих эффектов; open/create-before-write считается артефактом, если оставил файл. Частично видимый, но ещё не durable snapshot также MUST STOP без удаления
- **AND** матрица MUST входить в правильный `recover` с otherwise-valid данными: 30 artifact-bearing SIGKILL случаев дают точный partial STOP, ноль новых файлов/записей/действий и сохранность прежних bytes; два clean-before-write случая дают новый явный metadata entry с полным preflight. Неправильная phase/пустой ticket не заменяют этот oracle; fresh-invalid negatives и одиночные guard mutants обязаны различать запрещённые эффекты

#### Scenario: Поздняя durability результата действия
- **GIVEN** реальный callback состоялся, final business/admission markers уже видны, но operation/journal/result/cleanup business I/O или readback завершились после applicable authority deadline
- **WHEN** producer либо следующий legitimate entry читает terminal-looking state
- **THEN** без genuine prior live L_action и immutable completion proof — unresolved STOP,0следующих callback; cleanup не продлевает authority и missing proof не реконструируется

#### Scenario: Только audit persistence позже genuine live completion
- **GIVEN** все business I/O/readbacks/cleanup подтверждены producer под live authority и frozen completion содержит действительный prior L_action
- **WHEN** audit-only запись завершается позднее либо complete survivor читает новый process
- **THEN** audit MUST добавить только immutable completion при canonical equality **всех** остальных полей/previous entries; final markers/phase MUST быть сохранены доL и оставаться UNRESOLVED для всех consumers без exact completion. Candidate MUST пройти closed D1a-v1 schema/projections/immutable snapshots/anchor/predecessor/generation checks и actual journal heldFD fsync→bound parentdir fsync→exactreadback/identity под freshGO/bothlocks до нового legitimate action. L/payload не меняются, producer success отдельно и killed producer success не утверждается

#### Scenario: Изменение audit payload или потеря истории
- **GIVEN** audit меняет любое noncompletion поле, projection/previous entry пропущены, predecessor/generation/fork/head не совпадают либо finite roster/reserved bytes/1MiB исчерпаны
- **WHEN** рассматривается следующий effect
- **THEN** STOP до effect; no callback, no history deletion/truncation/namespace reset; unknown rollback authority или размерная bound не подменяются inferred proof. Full legitimate sequence с сохранением всех immutable snapshots MUST оставаться положительным контролем существующего public test по06AM-17

#### Scenario: Конечные ordinary slots и свежий ticket
- **GIVEN** заранее immutable finite descriptor roster, completed prior reconcile, independently bound fresh GO/head и whole fresh context
- **WHEN** unused exact ordinary descriptor проходит exact whole P→full T→separate OrdinaryGO/head→Authority→once binding в existing used[id] вместе с durable consumed_unknown до startup persist/session/callback по05D1a.2; P.go boolean, полный GO не вложен в P, arbitrary context exclusions запрещены
- **THEN** этот admission может выполнить ровно одно разрешённое действие; binding/ticket/history неизменны, descriptor roster/N/generation/head не reset/replenish. Old ticket+new context, rebind/replay/reuse, foreign head, changed descriptor/new slot, exhaustion/late binding MUST STOP до следующих effects. Pending/recovered и historical original bindings MUST оставаться прежними; весь context сохраняется. Отдельный otherwise-valid deadline-only T′ после consume внутри live own invocation MUST дать RECOVERY_ORDINARY_DEADLINE_REBIND/0следующих effects при unchanged binding; targeted normalization mutant MUST нарушить этот oracle (05D1a.2/06AM-17)

#### Scenario: Guard цепочка и case binding
- **GIVEN** потерян controller/route lock после blocking boundary, B0 содержит non-origin unknown, ticket phase неверна либо follow-up case отличается от current active case
- **WHEN** existing entry собирается сохранить operation или создать session/callback
- **THEN** STOP до следующего эффекта; B0 unknown проверяется до snapshots/health. Законный новый case отдельного checkout после closure и fresh ordinary GO сохраняется

#### Scenario: Целостный collector и историческая корреляция
- **GIVEN** actual fixed BOTH-store SELECT projections, scoped account/grant/count reads, подлинные per-store observation/coverage cuts и raw history provenance
- **WHEN** unchanged collector output поступает actual inventory admission
- **THEN** independently empty и known-other-owner debt могут пройти при полном predicate; cross-store provider/intent collision, raw event identity contradiction, missing provider/needs_review/schema/coverage/retention STOP. Later return time не требует future coverage, conservative observation не снимает полноту/quiescence

### Requirement: Отдельный одноразовый administrative terminal disposition
QA MAY выполнить только одноразовый `administrative-terminal-disposition-v1` для exact original failed target после отдельного принятия delta и finite authorization. Все conjuncts, запреты, сохранность forensic provenance и STOP при неизвестности из сценариев ниже MUST соблюдаться; historical A0 остаётся NOT_VERIFIED, existing recovery и user-facing acceptance неизменны.

#### Scenario: A0 неизвестна, финансовая завершённость независимо доказана
- **GIVEN** exact исходное состояние до начала administrative transition, original failed/consumed_unknown и A0 NOT_VERIFIED, все fresh financial/actor/source predicates доказаны и finite administrative GO live
- **WHEN** continuous original controller→route locks защищают typed admin producer
- **THEN** только B1 fence и matching administrative closure в operation/journal, затем distinct immutable confirmation после real-I/O live L; business incomplete_pending/old attempt остаются,0callback/0session/0checkout; original decline/manual-cancel NOT_VERIFIED

- **AND** QA MAY после отдельного принятия этой requirements delta и exact finite technical authorization выполнить только `administrative-terminal-disposition-v1` для единственного исходного failed target, чья non-temporal identity доказана, а historical A0 остаётся NOT_VERIFIED. Это supporting QA contract; user-facing acceptance unchanged. Unknown только historical A0 не блокирует **этот** distinct metadata predicate; любые identity/financial/delivery/current-action/partial unknown MUST STOP. Existing recovery требования и их A0 MUST оставаться неизменными.
- **AND** До authorization MUST доказать все conjuncts из05D3: exact original raw identity/keys; authenticated final canceled/unpaid/expired/noncapturable provider object;0target payment/grant и delivery obligations; complete retained BOTH-store/history/coverage/correlation, отсутствие orphan provider creates/unknown completion и independently empty versus missing; actual event ACK/24h/clock predicates; no inflight/uncontrolled permitted actors; fresh source/FD/control/health/clock/GO. Original snapshots MUST предшествовать first persist. Исходные raw evidence/failed case/used ticket/source/windows MUST NOT reset/restamp; никакого original POST retry/cancel/refund/relay, DB/entity/attribution/allowlist mutation.

#### Scenario: Неполное terminal evidence или иной unknown
- **GIVEN** отсутствует хотя бы один обязательный conjunct, другой pending/unknown action, неполная retention/delivery history, незавершённый writer или неподходящая phase/source/identity
- **WHEN** рассматривается administrative admission
- **THEN**0administrative authorization/closure/callback/session/checkout; no guessed true/empty, no cleanup/reset/fallback и no owner waiver

#### Scenario: Partial/late administrative closure
- **GIVEN** kill/late I/O/.next, одна closure, absent/partial/conflicting confirmation либо неизвестный completion
- **WHEN** любой entry рассматривает продолжение
- **THEN** STOP до действия без достройки; только complete original witness может пройти прежний reader real file+directory fsync/readback под fresh authority; payload prior L не переписывается

### Requirement: Первый ordinary после administrative quarantine отдельный и одноразовый
Первый уже согласованный будущий TEST MUST быть отдельным одноразовым ordinary admission после joint admin closures, reader resync и fresh GO/fullgate. Полный порядок consume/archive, сохранность failed origin, canonical guards и запрет повторного admin exception из сценариев ниже MUST соблюдаться.

#### Scenario: Раздельные admin closure и один fresh ordinary
- **GIVEN** complete admin confirmation и исходные NOT_VERIFIED markers, fresh valid ordinary GO, fullgate и unused bound first ticket
- **WHEN** reader делает real resync и caller один раз consume/archive до текущего callback
- **THEN** допускается ровно один текущий ordinary checkout; original request не повторяется, immutable origin/history остаются, provider success/paid rights проверяются позже отдельно

- **AND** Первый уже согласованный будущий TEST MUST иметь отдельный fresh ordinary GO/baseline/fullgate, joint typed admin closures и reader resync. Только explicit bounded derivative MAY принять exact quarantined original вместо donor not_started/reconciled state; это явная новая state-admission семантика, не изменение immutable db0 или универсальный ignore-unknown. Before любого native session/callback first ordinary ticket MUST durably consume; original attempt добавляется exactly once в business_history до fresh checkout persist/callback с preserved failed/unknown fields и key dedup. Старые used/case/proof никогда не completed. Source/lock/fence/partial guards MUST сохраняться. Дальнейшие текущие actions используют обычный captured response и canonical predicates; admin exception повторно недоступно.

#### Scenario: Ранний ordinary или повторное использование исключения
- **GIVEN** нет одной closure/witness/fresh proof, старый/чужой ticket, уже consumed first admission либо crashed transition
- **WHEN** ordinary/session пытается использовать admin disposition
- **THEN** STOP до следующих эффектов; unknown original не очищается новым key/namespace, generic canonical/b9/old812 bypass не допускается

#### Scenario: Приёмка остаётся полной
- **GIVEN** administrative disposition завершён либо новый ordinary open вернул captured response
- **WHEN** составляется acceptance результата
- **THEN** original decline/manual-cancel остаётся NOT_VERIFIED; обязательны отдельные настоящие decline/manual-cancel, успешная TEST оплата с paid clip и полноценный3-role referral/revenue CJM; metadata/offline fixtures их не заменяют

### Requirement: Supporting QA packaging revision3, без нового user scope
QA MUST сохранять FR1–FR6/AM-1…20;6private+3public по05T, helper только testcase String.raw, runtime sources ровно6.

#### Scenario: Extraction без изменения исполняемых проверок
- **GIVEN** exact ed810 baseline и actual approved S installation/K1/K2/scope admission
- **WHEN** existing contiguous cases извлечены по05T в test-only TShelper
- **THEN** rendered Python bytes,17titles,70old/128current assertion intents/всеmatrix counts MUST совпасть; TS lint metric MUST быть≤500/private modules<700, real operational Chrome/FD/process suite MUST пройти заново
- **AND** существующий native code-target manifest MUST пиннить helper; новые manifest/profile fields, executable JSON/MD blobs и изменение payment/authority/once/deadline/reader/unknown guards MUST NOT вводиться
