# Независимое QE: тесты и интеграционные контракты

**Вердикт роли qe-tests: clean в проверенной области receipt/SQL/наследуемого billing.** Подтверждённых собственных условий исправления нет. Это не общий Step-8 gate, не полное зелёное состояние репозитория и не разрешение live activation: свой расширенный запуск имеет три подтверждённых baseline отказа. Общий QE и замечания других независимых ролей закрывает координатор отдельно.

## Независимость и входы

Дата: 10.11.2026. Reviewer `qe-tests`, family `owner-exception`, отдельная сессия `/root/receipts_qe_tests`; модель запуска `gpt-6-astra`, reasoning `xhigh`, заданные координатором для этого нового агента. Автор реализации — `gpt-6.1-sol high`. Модельные параметры взяты из назначения запуска, отдельной API-интроспекции модели у reviewer нет. Coding history не передавалась. Самостоятельный первоначальный анализ завершён до чтения авторского отчёта и mutation logs; чужие QE-отчёты не использовались как исходный контекст.

Сначала прочитаны `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, `features/yookassa-receipts/owner-authority.md`, `01_requirements.md`, `03_adr/001-snapshot-receipt-in-payment-intent.md`, `05_architecture.md`, `06_implementation_plan.md`, `requirements-revision.json` и pinned OpenSpec `proposal.md`, `specs/payment-receipts/spec.md`, `design.md`. Применён контракт Step 8 `/home/clipmkr/.agents/skills/feature-adr/modules/08-qe.md`. После этого самостоятельно найдены diff от `e955e3f2e67e5663eec24dadeb828cacd18e9a9f`, новые неотслеживаемые SQL/tests и связанные billing/provider/runtime/fixture/retention пути.

Host nonce `a90bad76-2d4c-49df-9412-9573abc54615`, revision `22803d51e6b0d8bcb05befd1261e3d8e3c4d36d21c9965575a6cef13d2ea4afb`. Собственный SHA-256 расчёт всех **25/25** manifest paths и **3/3** нормативных ledger pins совпал до анализа и перед записью receipt. Host/общий journal/index/checkpoint reviewer не менял.

## Собственные исполнения

Все продуктовые tests исполнялись исключительно разрешённым wrapper, с Node `22.23.4` из `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`. Wrapper передал отдельную `*_test` PostgreSQL БД; ключи, test-env и merchant API reviewer не читал. Тесты создавали собственные случайные schema и локальные HTTP sockets. Команды запускались из текущей рабочей копии:

```text
python3 /root/.config/clipmkr/yookassa-receipts-20261110/run-tests.private.py qe-tests tests/yookassa-receipts.unit.test.ts tests/yookassa-receipts.integration.test.ts tests/credit-packages.integration.test.ts
python3 /root/.config/clipmkr/yookassa-receipts-20261110/run-tests.private.py qe-tests tests/billing.unit.test.ts tests/billing.integration.test.ts tests/blogger-report.integration.test.ts
```

| Собственный запуск | Executed | Passed | Failed | Skipped / filtered | Exit |
|---|---:|---:|---:|---:|---:|
| Receipt unit + receipt PostgreSQL/socket + credit-packages | 43 = 6 + 17 + 20 | 43 | 0 | 0 / 0 | 0 |
| Billing unit + billing PostgreSQL + blogger-report PostgreSQL | 70 = 34 + 25 + 11 | 67 | 3 | 0 / 0 | 1 |
| Итого, шесть разных suites | **113** | **110** | **3** | **0 / 0** | Не общий green |

Сохранённые приватные журналы reviewer:

- `qe-tests-receipts-credit.private.log`, SHA-256 `d0dba2e9857a2a1aeedff6db4e42e96df109236a0ca62bd55c1ac08ce6ca6cff`;
- `qe-tests-billing-blogger.private.log`, SHA-256 `35496b2062b06bcfe3dfc64f4b6da1e529e2131ac1e9129d87e75cf7db551377`.

Оба находятся в `/root/.config/clipmkr/yookassa-receipts-20261110/`; содержимое приватных логов в Git не копировалось. Исходный `qe-tests.private.log` перезаписывается wrapper, поэтому сохранены отдельные копии каждого собственного запуска.

Три фактически воспроизведённых отказа — `tests/billing.unit.test.ts:103` (старый SQL retention fragment), `:109` (ожидание 3 суток против действующих 7), `:130` (старое ожидание расположения константы). Собственно проверено побайтовое равенство этого test file и `packages/db/src/plan.ts` базе; вся retention-часть `packages/shared/src/tariff.ts` перед новой receipt-вставкой также идентична базе. Вторично просмотрен `baseline-billing.private.log`, SHA-256 `330eacac3a905f27e710fff89eeec8993e4b9cb5c87a34617c5d9d30a4160f84`: те же три assertions и фактические значения. Это подтверждает их baseline-происхождение; reviewer не заявляет, что сам исполнял base checkout, и не объявляет упавший suite зелёным.

## Проверка требований и непустоты оракулов

| Контракт | Собственная проверка и её граница |
|---|---|
| FR-1/3/4/8: JSON, сумма, позиция, fiscal enum | `receipt payload uses one exact RUB item for every offer` проходит через настоящий adapter и socket для четырёх предложений; assert полного receipt с quantity `1.000`, RUB и совпадающей amount. В production одна строка `value` из сохранённого `price_minor` используется для обоих amount. Valid live receipt достигает того же сервера, на котором no-receipt live отказ оставляет 0 accepted create keys. Все VAT 1..12, оба subject и только full_payment покрыты parser/validator controls. |
| FR-2/NFR-2: адресат и закрытый body | Новый интеграционный тест берёт активный account из валидной серверной session seam и отличает его от второго account. В SQL email читается под account `FOR SHARE`, INSERT пишет snapshot до commit. По отдельности forged email/receipt/amount/price/title/налоговые поля дают 422, 0 intent и 0 POST; соседний valid запрос той же сессии проходит. Наследуемые real-session TEST exception tests, paused guard, Origin/rate/body controls исполнены в billing suites. |
| FR-5; AM-2; ADR Confirmation: принятый POST и restart | Socket полностью читает/сохраняет method/path/body/key, пересылает настоящему maintained HTTP simulator; simulator принимает платёж, и только затем уничтожается внешний response socket. После 503 БД содержит один intent, сохранённый receipt и NULL provider id. Новая конфигурация через readEnvironment/loadWebConfig создаёт новые deps/provider/handler; после смены email/VAT весь следующий captured request равен первому. Новый client key получает новые данные, bound повтор наблюдается как GET. Это реальная локальная сеть, без замены fetch возвращаемым объектом. |
| FR-5; AM-3: конкуренция и commit-before-network | Первый настоящий INSERT удержан после исполнения до COMMIT; другой creator работает через отдельное pool connection. Observer запрашивает `pg_stat_activity`/`pg_blocking_pids` и требует waiter именно за PID первого holder. После release оба результата полностью равны, включая id/snapshot. Отдельный socket observer через иной pool connection видит уже committed intent/receipt при каждом POST. Одного Promise.all здесь недостаточно для pass. |
| NFR-3/4; AM-3: CHECK/trigger/erase | Реальные INSERT проверяют каждый missing key и JSON null, лишние/неверные поля, enum/type/size и пустые/слишком длинные строки. Каждый negative обязан иметь SQLSTATE 23514 и точное имя receipt CHECK. Полный object, multibyte valid description и legacy SQL NULL — positive controls. Trigger отвергает object→object, object→NULL, NULL→object; status/provider id update разрешён и исходный snapshot сохранён. Реальный erase начинается с существующего snapshot и состояния erasing, удаляет intent и сохраняет financial payment с NULL account/intent ссылками. S3 erase seam локальный; реальная S3 не вызывалась. |
| FR-6; AM-1/5; ADR Confirmation: время и retry | Независимые fixtures: T−1ms реально достигает socket, T/T+1ms/24h/49h/future/invalid clock и missing/Invalid Date created_at дают 409 без новых POST. Успешный ранний fixture не связывает поздние. SQL lock задерживает реальное createIntent, clock пересекает cutoff до release, после чего HTTP не начинается; соседний fixed-clock control проходит. В коде после последнего guard до fetch нет промежуточного await. Bound legacy после 48h с config null идёт GET; старый unbound NULL receipt не дооснащается. |
| FR-7; AM-4: config chain | 19 интеграционных случаев проходят fresh readEnvironment→loadWebConfig→getRuntime→getBillingDependencies: absence/empty/full, 6 partial subsets, whitespace каждого поля, invalid VAT/subject/mode. Runtime config не подменён готовым ReceiptConfig; явно подменены schema/auth/rate/transport seams. Health реально делает SELECT 1. Каждый invalid case сохраняет status, ignored webhook, bound GET и verified successful webhook. Отсутствующий TEST receipt допускает POST, полный даёт receipt, partial/invalid запрещает новый POST. Compose содержит только три optional web env; worker settings не расширены, defaults/activation не добавлены. |
| NFR-1; AM-4: PII и ошибки | Собственно прошли accepted socket 500 с synthetic raw/secret/email, PaymentVerificationError seam, настоящий PostgreSQL CHECK detail и runtime email validator. Каждый путь подтверждён status/counter или exact error; DB/validation дополнительно подтверждают отсутствие POST. HTTP/log assertions исключают markers; успешный соседний transport/SQL запрос есть. Status API проверяется после доказанного сохранения приватного snapshot. Production public SELECT/IntentView не расширены. |
| FR-8/9: grants/referrals/refunds и старый TEST | Новый receipt integration исполнил checkout/duplicate notification/refund всех 4 offers; addon предварён базовым entitlement, referral snapshot сохранён. 20 credit-packages, 25 billing и 11 blogger-report tests дополнительно покрыли однократность grants/ledger, конкурентные уведомления и refunds, refund-before-payment, immutable attribution, отчётные exclusions и per-account TEST exception. Receipt не участвует в основании начисления. |

## Узкое изменение migration rehearsal

Самостоятельно сопоставлен diff `tests/credit-packages.integration.test.ts:254` с базой. Из исходной pre-credit fixture дополнительно исключена только `029_`, зависящая от `022_`; production SQL ради искусственного порядка не изменялся. Все исходные assertions сохранены: legacy policy у account/video, отсутствие credit gifts, исходный legacy sku/grant_seconds/status pending intent и два paid account. После двух обычных migrate добавлены `_schema_migration` count для 029 **ровно 1** и **SQL NULL** старого receipt. Полный тест реально прошёл в собственном 20-test credit suite. Смена negative resource-down fixture на здоровый ресурс в этом diff отсутствует; миграционный fixture не подменяет resource-down control.

## Просмотренное вторичное evidence

Только после своего анализа и запусков прочитаны `07_code_changes/author-summary.md`, `change_manifest.md`, `/tmp/receipt-final-mutation-results.json` и пять приватных `receipts-final-mutant-{live,vat,cutoff,pii,unknown}.private.log`. Собственных mutation executions не было, исходники reviewer не мутировал.

По фактическим логам: live mutant — отказный promise неожиданно resolved; VAT mutant — различный captured JSON/канонический VAT; cutoff mutant — 201 вместо 409 в boundary и async crossing; PII mutant — marker появился в log; UNKNOWN mutant — malformed INSERT resolved вместо CHECK rejection. Числа red executions: 6/17/17/6/17, всего 63, с 1/2/2/1/1 целевыми failures соответственно. Это **авторские**, не прибавленные к своим 113 исполнения. Машинный итог SHA-256 `f019f294a5901a64cb13833e4d739e6d8109f87be33e71bc4745dd205ede6f2b`; указанные restored SHA совпадают с текущими manifest SHA. Свой 23-test receipt run затем независимо подтвердил green текущих восстановленных bytes.

## Ограничения и вывод

Полный `npm test`, compose/full infra, browser E2E, build/typecheck/lint/env CLI, merchant readiness, live checkout, реальные письма, S3/model, fiscal registration и доставка чека этой ролью **не исполнялись**. Чтение авторского успеха не превращает их в собственное доказательство. Координатор отдельно сообщил о соседних guard regressions, найденных ролью qe-security; этот отчёт не закрывает их и не заменяет originating security evidence. Неизвестные coverage/performance проценты не оценивались.

Допущение clock/delivery погрешности <1h при cutoff23h остаётся явным внешним пределом; локальная сеть и 5s abort не доказывают время принятия запроса ЮKassa. Full_payment — единственный поддержанный режим. VAT/subject/mode магазина не подтверждены; full_prepayment/closing receipt и инициирование partial refund вне согласованного generic scope. Отсутствие живой фискализации не является дефектом разрешённой локальной реализации и не объявляется пройденной приёмкой.

По собственному чтению и исполнению FR/AM/Confirmation имеют содержательные оракулы и положительные контроли; исходные 14 source/config/test targets соответствуют проверенным receipt/SQL контрактам. Собственных новых условий T-N нет; verdict роли **clean**. Общий gate/поставку/разрешение платежей этот отчёт не устанавливает.


## R2 — focused independent verification после авторского repair

**Актуальный вердикт роли qe-tests: clean**, revision `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`, nonce `63778ffa-2a0f-436a-b132-d54277372051`. Предыдущие разделы и результаты113 executions сохраняются как история R1; в новую ревизию они не переименованы. Та же независимая reviewer-сессия `/root/receipts_qe_tests`, модель запуска `gpt-6-astra xhigh`; код R2 писал `gpt-6.1-sol high`. Исходники reviewer не менял.

Прочитаны полный `qe-author-delta.json`, включая author newRisks, обновлённый `06_implementation_plan.md` (TASK-7/AM-6…AM-8) и все пять changedScope: `apps/web/src/server/billing-handler.ts`, сам план, `tests/payments-guards.test.ts`, `tests/test-webhook-route.test.ts`, `tests/yookassa-receipts.integration.test.ts`. Самостоятельный расчёт **27/27 manifest SHA и 3/3 ledger pins** совпал перед проверкой и перед записью receipt. Нормативные требования, ADR и OpenSpec не изменены; generic TEST scope и отсутствие разрешения реальных платежей сохранены.

### Собственное исполнение текущих bytes

Через разрешённый wrapper, с тем же изолированным PostgreSQL/локальными sockets и Node22.23.4:

```text
python3 /root/.config/clipmkr/yookassa-receipts-20261110/run-tests.private.py qe-tests-r2 tests/yookassa-receipts.unit.test.ts tests/yookassa-receipts.integration.test.ts tests/payments-guards.test.ts tests/test-webhook-route.test.ts
```

Результат: **41 executed / 41 passed / 0 failed / 0 skipped / 0 name-filtered**, четыре suites, exit0. Разбивка: receipt unit6, receipt integration18, payments guards15, portable callback2. Журнал `/root/.config/clipmkr/yookassa-receipts-20261110/qe-tests-r2.private.log`, SHA-256 `874336fdda5923d82ea28225546d8a5c570ef145c69ebda5ecf9b5cca3704993`. Это собственные41, отдельно от указанных автором61 scoped passes; авторские61 не прибавлены и не названы собственным запуском.

Private operational callback profile не включался: его tests условно **не регистрировались**, а не прошли/были засчитаны как portable2. Полный suite, R2 build, live callback operational acceptance, merchant/настоящие списания/письма/S3/model не выполнялись. Старые R1 retention failures не перепроверялись этим выбранным запуском; исправленными их он не объявляет.

### Проверка структурной дельты и положительных/отрицательных контролей

1. **Expired/invalid time при NULL receipt и invalid config.** В production возрастная проверка теперь стоит после terminal и bound GET, после завершённой async intent-работы и до receipt config ошибок. Между ней и POST добавлены только синхронные проверки; нового await нет. Независимо восстановил прежний порядок двух блоков только в строке Python в памяти: полученный SHA равен исходному R1 `1129111454c5554d4e5b8649dcd9a145f92cf67120bd4fd11eb5af03a8c3977a`. Это подтверждает, что единственная production-дельта R2 — перестановка прежнего guard, без скрытых изменений его условия или побочных веток.

2. **Новый непустой тест пересечения.** `expired unbound intent requires reconciliation before invalid receipt config` создаёт настоящие legacy intent с доказанным SQL NULL snapshot. Для partial mode и invalid VAT config parser реально даёт null. Для каждого из двух классов проверены отдельные cases: exactly23h,24h,future,invalid clock,missing timestamp,Invalid Date timestamp. Последние два вводят недостоверный timestamp после настоящего SQL creator, поскольку PostgreSQL гарантирует свой NOT NULL timestamp. Вся матрица требует **409 + точный payment_reconciliation_required +0 accepted POST**. Рядом настоящий молодой invalid config требует **503 receipt_configuration_unavailable +0POST**; сначала успешно созданный bound no-receipt intent после48h с тем же invalid config требует **GET count+1,0POST**. Старые cutoff T−1/exact/+1, реальный async SQL crossing, valid receipt и конфиденциальность повторно прошли в18 integration tests. Удаление только нового `it` из текущего файла в памяти даёт R1 SHA `8f022ae9dbd9fde8430514e34c3adfd7f35a0cb3413712396a4f4f45738e024e`: прежние integration assertions не ослаблены.

3. **Env presence/deletion controls.** В `optional checkout exception remains covered by wiring validation` добавлены ровно три новых optional receipt env в локальную web fixture. Исходный positive checkWiring=[] достигается. Каждое отдельное удаление возвращает ровно `web: <имя>`, восстановление возвращает []; прежнее удаление N5_TEST_CHECKOUT_ACCOUNT_ID продолжает давать его единственную ошибку. Ни checker, ни общая fixtures/environment не изменялись — оба побайтово совпадают с base. Positive/negative branches действительно исполнены собственным15-test suite; skip/подавление ошибки или исключение новых имён из checker отсутствуют.

4. **Fixed callback binding и IP-контракт.** Expected handler SHA — фиксированный литерал `006829ba5c6dfa94a03a02a806522e8938bedd651949a8e657021cb461c3054f`, равный самостоятельно вычисленному current digest. `ip.ts` и shared config совпали со своими прежними фиксированными SHA `af357f46c7cad2def1629a34e85b576237fd6a5db8ca9d2249639e706c823301` и `d66cd0977b52de2331f0a630a1c79476492aea0fec6a2be5263714ba094ff12f`; независимо подтверждено их byte equality базе. Expected не вычисляется из проверяемого файла. Для каждого owner synthetic добавление bytes меняет digest и отвергает равенство pin. После pin checks реально исполнились прежний spoofed-chain control и три missing/invalid-hop отказа; исходный Caddy fragment positive/negative test также прошёл. Сам `deploy/test-webhook-route.caddy`, operational profile binding и оставшаяся operational часть test не менялись. Portable тест не переодобряет прежнее deployment/operational доказательство.

5. **План, область и новые риски.** Обновление06 точно связывает обнаруженные P-1/S-1/S-2 с TASK-7a/b/c и тестами AM-6/7/8; два guard targets добавлены явно. Авторский structural classification подтверждён поведением и собственным исполнением, author newRisks рассмотрен. Подтверждённых новых рисков от адресного repair не найдено: SQL/receipt snapshot/provider/grants не менялись, их host SHA сохранены. Migration rehearsal target тоже имеет прежний SHA `79c41f1d8ecab73594e4c53c80404249158829e25c34d09da293dec58d2781ed`; его R1 own20-pass evidence сохранено, нового запуска credit suite R2 этой ролью не было.

Собственные conditions/verifications остаются пустыми: originating P-1 и S-1/S-2 принадлежат другим ролям и не присваиваются qe-tests. Для своей structural deltaVerification указаны проверенные код и tests текущей ревизии; authorAssessmentChecked=true. Самостоятельный общий native evaluate/изменение host/journal/index/checkpoints не выполнялись. Итог общего gate устанавливает координатор после всех originating reviews. Часовой запас и неподтверждённая fiscal classification остаются прежними ограничениями, реальное включение платежей не разрешено.
