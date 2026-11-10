# Текущая независимая проверка — цикл 3

**Собственный вердикт fleet-integration: CLEAN. RET-INT-001 и RET-INT-002 подтверждены для текущей ревизии.** Общий native checkpoint оценивает координатор после всех reviewer receipts; этот отчёт его не подменяет.

Revision `01593dab6b59e9f722db9aac5a20f49952516e31aa3f13a182de86bf095b09e6`, nonce `833d9ab1-9436-438c-9a53-2d0193125d52`. Originating reviewer `/root/retention_fleet_integration`, `gpt-6-astra xhigh`; автор `gpt-6.1-sol high`. Сохранены те же original conditions verbatim. Рассмотрены текущий author delta/newRisks, фактический CSS и затронутые DOM/script/route dependencies.

## Доказательство неизменности предыдущей проверки

Сравнены все 57 paths/digests из сохранённого `qe-cycle2-evaluate-valid.private.json` с текущим host и реальными файлами. Набор путей идентичен; **56 файлов совпали побайтно**, включая mail factory/callers, coordinator/reaper, watchdog/retention, оба собственно выполненных test suites, требования и план. Единственная разница — `apps/web/src/server/guest-page.ts`. Удаление ровно одного `[hidden]{display:none!important}` из текущих bytes воспроизводит SHA256 этого файла cycle2: этим независимо установлена точная минимальная дельта, а не только доверие changedPaths. Все три OpenSpec ledger SHA совпали.

Поэтому собственный cycle2 запуск **42 PASS / 0 SKIP**, exit0, остаётся релевантным подтверждением RET-INT-001/002. Его лог `fleet-integration-cycle2.log` также неизменен: SHA256 `3da32632e4497fe28e6d2d27e47080142347c006c9eb848e61fd5e7f3d8192ab`. Нового тестового запуска в cycle3 не делалось; прежние 42 результата не объявляются повторно исполненными.

## Проверка CSS и границ интеграции

`guest-page.ts:38` задаёт button/.download display:inline-block. Новое правило :39 принудительно скрывает элементы с атрибутом hidden. В :50 истёкший/недоступный pack получает hidden disabled на global download-all; активный pack этого атрибута не получает. Кнопка остаётся в DOM, поэтому существующий listener :78 не ломается. Путь interest-login :69/:74 снимает hidden через DOM property и продолжает работать; новое правило перестаёт совпадать после снятия атрибута. Условные individual video/download nodes и effective deadline не менялись. Изучена существующая привязка `/g/[guest_code]` route → GuestPackService → handler; правки не затрагивают авторизацию, file route, signer, DB lifecycle либо почту.

Прочитаны предоставленные runtime `browser-guest-check.private.cjs` и `browser-guest-results.private.json`: script отдельно утверждает active isVisible=true и expired isVisible=false, отсутствие expired player/individual action, проверяет deadline/МСК и активное playback. Result содержит 2/2 PASS с HTTP200. Это исполнение координатора, не собственный новый browser run. Текущая primary entry — CLEAN; RET-QP-002 не дублируется и не закрывается от чужого имени.

## Current-revision подтверждения

- **RET-INT-001:** runtime factory, queue/support callers и синтетический capture-контракт совпадают с independently tested cycle2; accepted capture, verify/reset, отказ реальному адресу и unavailable при отсутствии sink сохраняют доказательство.
- **RET-INT-002:** reaper до transport gate и conditional UPDATE совпадают с cycle2; disabled/SMTP unknown transition, отсутствие сети/новых attempts, payload/key/first_attempt_at подтверждены неизменным собственным тестом.

Author assessment checked: structural CSS исправляет фактическую видимость. В focused delta новых существенных рисков не найдено. Отсутствуют новые backend изменения, новые условия и основания повторять DB/S3/полный regression. Нет утверждения inbox delivery, новой production операции или численного coverage. Own receipt записана под flock/atomic replace, чужие entries/author/host сохранены.

---

# Исторический отчёт — цикл 2

# Текущая независимая проверка — цикл 2

**Собственный вердикт fleet-integration: CLEAN. RET-INT-001 и RET-INT-002 независимо подтверждены как исправленные.** Это не общий release PASS: RET-QP-002 остаётся у qe-primary; CSS/guest finding не дублируется новым условием.

Revision `85fdf8f2b2e452d4998ab3870ff73ca18e32f63d5e047f0cc1ad758d714a5363`, nonce `cc659720-bc12-4601-b9e3-39b018798275`. Originating reviewer — та же независимая сессия `/root/retention_fleet_integration`, `gpt-6-astra xhigh` по host dispatch; автор исправлений `gpt-6.1-sol high`. Применён focused repair контракт canonical Step8 и интеграционный протокол Step9. Исторические условия скопированы из `cycle1-review-convergence-qe-review.json.private.json` **без изменения requirement/scope/evidence/severity/owner**. Автор принял их verbatim в author.newRisks; соответствие проверено. Авторский delta рассмотрен как structural, а не как готовое доказательство исправления.

## Подтверждение RET-INT-001

`apps/web/src/server/support/mail.ts:119–124` добавляет общий `createSupportMailer`: существующий `N5_MAIL_TEST_CAPTURE_FILE`, только `/tmp/`, O_NOFOLLOW, append, chmod 0600. Один capture callback передаётся существующему SupportMailer для verify/reset и retention; новая очередь, outbox, env или доставка в stdout не добавлены. `queue-runtime.ts:33` и `support/routes.ts:17` действительно используют эту фабрику. Без capture test-mode retentionSender теперь null, что предотвращает расход attempts для отсутствующего sink. Ограничение synthetic-only остаётся в адаптере; Resend/test контракты не смешиваются.

Собственно исполненный `runtime_test_mailer_captures_synthetic_notice` проверил shared factory → PostgreSQL notice → настоящий локальный файл: accepted/attempts=1, запись synthetic notice; verify/reset также accepted и представлены отдельными строками. Несинтетический recipient отклонён без новой строки capture; отсутствие sink не создаёт/не меняет notices. Это закрывает originating требование wiring через общий фактический конструктор.

## Подтверждение RET-INT-002 и связанный delta

`retention-notices.ts:83–88` выполняет reaper до sender-null return. Обновление также содержит outer state='sending' и lease_until<=asOf, сохраняя актуальный tuple после ожидания блокировки. В двух собственно исполненных вариантах `unavailable_mailer_recovers_expired_sending_lease` (disabled и SMTP) просроченный sending стал unknown, attempts/payload/key/first_attempt_at сохранились, sendRetention не вызван.

Для проверки взаимодействия исправлений исполнены существующие reaper accepted/replacement interleavings и post-lock clock expired/extended cases: прошли. Исследован actual callback из queue-runtime через watchdog к notices; claim берёт clock после notice row lock. Это проверка зависимостей собственных условий, не присвоение права закрывать RET-QP-001/003. Прежние immutable payload, catch-up, recipient-change, retry-age и shared mail transport tests также прошли.

## Собственные результаты и границы

`/root/.config/clipmkr/clip-retention-20261110/run-fleet-integration-cycle2.private.sh` — исходный разрешённый wrapper с двумя аргументами: `tests/retention-notices.integration.test.ts tests/support-mail-resend.test.ts`. Node22, isolated `_test` PostgreSQL, уникальная schema и локальные synthetic capture fixtures; cleanup выполнен штатными afterAll/finally. Exit **0**, **42 passed / 0 skipped**, 2 файла, 9.43s. Log `fleet-integration-cycle2.log`, SHA256 `3da32632e4497fe28e6d2d27e47080142347c006c9eb848e61fd5e7f3d8192ab`.

Дополнительно прочитаны агрегаты предоставленного root runtime evidence: `browser-runtime-mail-result.private.json` — capture 2 после старта и те же 2 после restart, externalDelivery=false; `browser-notice-journal.private.json` — accepted count=2, суммарные attempts=2. Это чужое runtime исполнение, согласующееся с собственным factory тестом; оно не выдаётся за inbox delivery или лично запущенный web startup. Payload/адреса не выводились.

Все **57** host manifest hashes и все **3** OpenSpec ledger hashes сверены перед записью receipt; расхождений нет. Source, host, author handoff и чужие reviewer entries не менялись. Own receipt добавлена под flock/atomic replace, исходные условия сохранены с current-revision implementationVerified=true, authorAssessmentChecked=true и structural deltaVerification.

Новых существенных рисков в собственной focused области не выявлено. Численный coverage, полный исторический regression, retentionTick/S3/Redis startup и браузерный E2E этой сессией заново не запускались; глобальная advisory cleanup suite не пересекалась с другими агентами. Приёмка всей фичи остаётся конъюнкцией всех originating условий, включая незакрытый primary finding.

---

# Исторический отчёт — цикл 1 (сохранён без переписывания выводов)

# Независимый Fleet QE — интеграционные границы

Вердикт: **NO-GO** для текущей ревизии. Новые условия: **RET-INT-001 HIGH**, **RET-INT-002 WARNING**. Существующие RET-QP-001/002/003 остаются у qe-primary; этот отчёт их не закрывает и не создаёт дубликаты.

Reviewer `fleet-integration`, family `owner-exception`; отдельная сессия `/root/retention_fleet_integration`, без истории кодирования. По фактическим параметрам dispatch, сообщённым координатором: reviewer `gpt-6-astra xhigh`, автор `gpt-6.1-sol high`; основание — `docs/review-policy.md`. Внешний provider session ID не предоставлен.

База `68af4887f44290f0654db445636f390bbd3064d0`. Revision `95410c60010ac1bc64a9b8cd4684b1c1abb44d9608f7c01556834b61f1fe4c2d`, nonce `9e362573-5340-4ee3-bf45-a031d0aa0d8c`. Все 51 SHA host manifest и все три OpenSpec SHA из `requirements-revision.json` сверены и совпали. Код, миграции, host и lineage не изменялись.

## Входы и независимость

Прочитаны AGENTS.md, docs/review-policy.md, CLAUDE.md, core-cjm; согласованные 01_requirements, technical-clarifications, ADR-001/002/003, 04_domain_model, 05_architecture, 06_implementation_plan и OpenSpec spec по закреплённой ревизии. Применены canonical feature-adr Step9, контракт receipt Step8 и pinned enterprise-integration-testing / qe-coverage-analysis в Reference Mode. AQE runtime не запускался.

После требований самостоятельно найдены реализация и тесты через Git diff к base-ref и поиск потребителей. Полный `08_primary_review.md` прочитан после собственного анализа. Ограничение порядка входов: при раннем чтении native host для revision/nonce были также видны уже записанные primary conditions. Поэтому отсутствие предварительного знакомства с этими тремя findings не заявляется; новые RET-INT-001/002 получены из самостоятельной проверки runtime и подтверждены отдельным исполнением. История кодирования и авторские отчёты успеха входными доказательствами не служили.

## Проверенные связи

| Граница | Контракт и результат |
|---|---|
| Billing → SQL deadline → web/cleanup | `retentionFromSql` учитывает started payment grants независимо от остатка; `retentionDeadlineSql` и `clipAliveSql` общие. SQL/TS parity и payment-before-claim focused tests прошли. Общий актуальный clock остаётся заблокирован RET-QP-001; legacy payment test не доказывает этот иной interleaving. |
| Worker → S3 → DB publication | Изучены `apps/worker/src/workers/render.ts`, render/storage.ts и db/render.ts: PUT вне SQL, create-only контракт, fenced acceptance запрещает claim/deleted, ready_at не сбрасывается при rerender. Полный worker job в этой сессии не запускался. |
| Claim → free/paid/thumb S3 → marker/recheck | Три prefix calls предшествуют null keys/marker; claim/due сохраняются после успеха. PostgreSQL + memory storage tests подтвердили late PUT после первого sweep, retry после ошибки, сохранение исходника/истории. `packages/s3/src/erasure.ts` проверен чтением: fixed UUID prefix и отказ versioned bucket. Внешний S3 не вызывался. |
| Owner/guest/short/showcase → signer | Изучены file/thumbnail handlers, guest-pack, short-link, showcase-file, screen-runtime и /c route. Абсолютный notAfter проходит до signer; signer передаёт тот же signingDate SDK. Focused signature-delay test прошёл. Гостевой UI consumer остаётся RET-QP-002. |
| Watchdog → mail coordinator → DB journal → SupportMailer | Runtime подключает coordinator и изолирует его exception от retention. Указанные ниже два новых разрыва подтверждены. Состояния, payload/key, recipient, 23h и текущие catch-up tests прошли; unsafe concurrent reaper остаётся RET-QP-003. |
| Erasure → notice payload | Миграция использует ON DELETE CASCADE account/video. Existing focused test подтвердил удаление notice после удаления video. Полный account-erasure pipeline в этой сессии не исполнялся. |

Указанные worker/storage зависимости и `support/routes.ts` прочитаны, но отсутствуют в host manifest; привязка native условий дана только к измеренным source/test paths. Это не доказательство измерения всех транзитивных зависимостей snapshot.

## RET-INT-001 — HIGH: тестовый почтовый транспорт не подключён в runtime

**FR-4, ADR-003, TASK-5.** `apps/web/src/server/queue-runtime.ts:33` создаёт `new SupportMailer(runtime.config.mail)` без `captureRetention`. Для mode=test `retentionSender` в `support/mail.ts:64–65` при этом непустой, coordinator создаёт и claim-ит notice. Но `support/mail.ts:76` без capture всегда возвращает failed. Даже synthetic verified адрес никогда не получает тестовую квитанцию; три разрешённых попытки будут расходованы без тестовой доставки.

Это именно разрыв wiring: существующий `support/routes.ts:19–24` подключает защищённый test capture для verify/reset; новая retention ветка не подключает свой callback вообще. Unit test транспорта передаёт callback вручную и потому не ловит runtime omission.

Уточнение границы: сам DI-контракт `SupportMailer` корректно отказывает без capture; от адаптера не требуется самостоятельно читать env или создавать outbox. Нарушение относится к вызывающему runtime: он не передаст capture даже при уже настроенном `N5_MAIL_TEST_CAPTURE_FILE`. Минимальная корректировка — переиспользовать существующий защищённый sink и существующий env, не вводя новый outbox/сервис/настройку и не выводя адреса или payload в stdout. При отсутствии настроенного sink явный unavailable предпочтительнее расходования attempts; однако один такой отказ не делает настроенный test runtime доступным согласно FR-4. Сам диагностический probe исполняет точный конструктор вызывающей стороны, а не полный startup web. Для действующего production mode=resend этот дефект не утверждается.

**Воспроизведение:** isolated PostgreSQL, verified synthetic owner, клип с remaining=2 дня, coordinator получает ровно конструктор из runtime: `new SupportMailer({mode:'test'})`. Ожидание `{state:'accepted', attempts:1}`; фактически `{state:'failed', attempts:1}`. Диагностический тест падает на этом assertion; внешних писем нет.

**Условие закрытия:** подключить существующий безопасный test capture к retention runtime, сохранив synthetic-only ограничение и недоступность real delivery в test mode. Проверка должна использовать реальный runtime factory/wiring либо эквивалентно проверяемый общий конструктор, а не отдельно переданный fake mailer: synthetic notice captured/accepted, несинтетический адрес не отправляется, verify/reset не регрессируют. Measurement scope: queue-runtime.ts, support/mail.ts, tests/support-mail-resend.test.ts; новый integration test включить в следующий prepared scope при добавлении.

## RET-INT-002 — WARNING: unavailable transport отключает восстановление истёкших leases

**FR-4, ADR-003.** `apps/web/src/server/retention-notices.ts:83–87`: отсутствие sender возвращает результат до SQL lease recovery. Если попытка была sending, процесс упал, а restart произошёл с disabled/SMTP, истёкшая lease останется sending на каждом tick. Журнал не отражает обязательный unknown, хотя lease давно истекла. После восстановления Resend reaper снова доступен; повторная отправка или потеря байтов данным сценарием не доказана, поэтому severity WARNING.

**Воспроизведение:** создать notice через реальный coordinator/fake unknown provider, зафиксировать sending с уже истёкшей lease, вызвать coordinator с `new SupportMailer({mode:'disabled'})`. Ожидание unknown; фактически sending. SMTP имеет ту же sender-null ветку, отдельно не исполнялся.

**Условие закрытия:** восстановление истёкшего sending→unknown независимо от доступности транспорта; unavailable режим по-прежнему не вызывает сеть и не расходует новые attempts. Сохранить first_attempt_at, immutable payload/key и receipt; concurrent safety чинится по исходному RET-QP-003. Это дополнительный сценарий с отсутствующим transport, а не повтор race из primary. Scope: retention-notices.ts и tests/retention-notices.integration.test.ts.

## Фактическое исполнение и покрытие

Использован Node22 из предоставленного wrapper и его isolated `_test` DB env. Все fixture schemas уникальные, после прогонов удалены. Секреты/connection strings не выводились.

1. `run-fleet-integration.private.sh`: исходный `run-final-focused.private.sh` с аргументами только `tests/retention-policy.integration.test.ts tests/retention-notices.integration.test.ts tests/support-mail-resend.test.ts`. Exit **0**, **43 passed / 1 skipped**, 3 files, 13.10s. Пропущен real S3 тест: env S3 отсутствовал; это не полный E2E PASS. Лог `/root/.config/clipmkr/clip-retention-20261110/fleet-integration-focused.log`.
2. `run-fleet-integration-probe.private.sh`: Vitest с private config и двумя самостоятельными диагностическими сценариями выше. Exit **1**, **2 failed**, 2.32s; оба падения — ожидаемое требование против фактического дефектного результата, не сбой подготовки. Лог `.../fleet-integration-probe.log`; тест `.../fleet-integration-probe.test.ts`, SHA256 `fff91fe33a5261cbc9345f3960c89e144c28fc4e5747665e8e3cd2aa5c90f494`. Код теста сохранён вне worktree, source freeze соблюдён.

Coverage analysis здесь семантический, по критическим границам. Численные statement/branch/differential coverage и пороги 80/90% не измерены и не объявлены пройденными. Наивысший незакрытый риск критического cross-system пути — исходный RET-QP-001. Дополнительно не покрыты runtime test capture и disabled lease recovery (теперь есть два воспроизводящих failed probe). Текущие зелёные module tests не заменяют эти сценарии.

Нового полномасштабного CJM, браузерного E2E, Redis runtime startup, живого S3, provider/inbox, нагрузки, production/deploy или независимого полного аудита всей системы не выполнялось. Подтверждения родительского QE не присваиваются этой сессии. Начать repair/новый snapshot и закрыть условия может только координатор с originating reviewers; этот отчёт не даёт release authorization.
