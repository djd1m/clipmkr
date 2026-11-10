# Независимый source QE: primary / code-critic

Актуальный вердикт primary после focused verification R2: **clean** на revision `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`. P-1 проверено исправленным; исходный conditional-отчёт ниже сохранён как история R1. Подробности и пределы — в разделе «Focused verification R2» в конце.

Дата: 10.11.2026. Вердикт: **conditional**. Подтверждена одна находка **WARNING** по точному контракту ответа; BLOCKER/CRITICAL/HIGH не найдены. Это статическое ревью исходников и тестовых оракулов, не квитанция исполнения тестов, поставки или приёмки реального магазина.

Роль: `qe-primary`, family `owner-exception`. Независимая сессия `/root/receipts_qe_primary`, модель запуска `gpt-6-astra`, reasoning `xhigh`; автор по назначению — `gpt-6.1-sol high`. Сессия начата без истории кодирования, по действующему cross-model исключению `docs/review-policy.md`. Локальная квитанция связывает артефакты; сама по себе она не аутентифицирует модель.

База сравнения: `e955e3f2e67e5663eec24dadeb828cacd18e9a9f`. Самостоятельно прочитан рабочий diff от базы, включая изменённые tracked-файлы и три untracked исходника: миграцию029 и два receipt suite. Авторские07/08, чужие QE и historical QCSD outcomes не использованы как доказательство. Навык `/home/product-studio/.agents/skills/code-critic/SKILL.md` прочитан целиком; контракт собственной receipt — `/home/clipmkr/.agents/skills/feature-adr/modules/08-qe.md`.

Входы до кода: `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`; feature `owner-authority.md`, `01_requirements.md`, `03_adr/001-snapshot-receipt-in-payment-intent.md`, `05_architecture.md`, `06_implementation_plan.md`, `requirements-revision.json`; закреплённые OpenSpec proposal/spec/design. Затем прочитаны относящиеся к границам и хранению части `docs/Architecture.md` и реальные consumers. `architecture/vision.md` для этого проекта не служил входом; portable principles применены к существующему TS/pg/Compose стеку и явным инвариантам.

Snapshot revision: `22803d51e6b0d8bcb05befd1261e3d8e3c4d36d21c9965575a6cef13d2ea4afb`; nonce: `a90bad76-2d4c-49df-9412-9573abc54615`. Самостоятельный SHA-256 пересчёт подтвердил **25/25** manifest entries и **3/3** OpenSpec ledger entries. Сверка повторена перед записью отчёта. Хеш-проверка служебных design/task файлов не означает принятия их исторических выводов.

Область исходников: все14 targets плана — `.env.example`, `docker-compose.yml`, `packages/shared/src/tariff.ts`, `packages/db/src/payments.ts`, `packages/db/migrations/029_payment_receipt_snapshot.sql`, `apps/web/src/server/{environment,billing-runtime,billing-deps,billing-handler}.ts`, `apps/web/src/server/payments/{provider,yookassa}.ts`, `tests/yookassa-receipts.{unit,integration}.test.ts`, `tests/credit-packages.integration.test.ts`. Дополнительно прослежены transaction/erase/readIntent, миграции021/022, runtime/config/test exception, существующие guards, provider transport, текущий клиент checkout и Vitest collection.

## God-object growth (BLOCKING)

Нарушений не найдено. Изменённые крупные файлы измерены: handler246, YooKassa304, DB payments201, tariff129, новые unit84 и integration328 строк, существующий credit integration313. Новых production TS модулей, сервисов, зависимостей и параллельных платёжных путей нет.

## Security violations (BLOCKING / HIGH)

Подтверждённых нарушений в diff нет. Серверное accountId берётся после guard, email — из активной account-строки под `FOR SHARE` (`packages/db/src/payments.ts:29–40`). INSERT параметризован. Закрытый body, Origin, сессия, rate-limit и checkout policy предшествуют createIntent (`billing-handler.ts:83–120`); runtime продолжает использовать `checkoutAllowedForAccount`, сохраняющий единственное TEST-account исключение. Новые env не включают checkout и не меняют testMode.

Публичный `IntentView` не расширен: `readPaymentIntent` выбирает явный набор без snapshot (`payments.ts:61–69`), status строит закрытый JSON (`billing-handler.ts:198`). Checkout catches больше не выводят exception.name/message. YooKassa transport отклоняет error response до чтения/вывода его тела; validator формирует статические сообщения. Существующие webhook validators получают receipt как игнорируемое дополнительное поле, не помещают его в payment/event/log. Вне изменённого checkout остаются webhook logs с текстом собственных ошибок, но реальные вызываемые validators формируют этот текст из статических labels, а не raw receipt/provider payload: новой подтверждённой утечки не обнаружено.

## Architectural concerns (HIGH / MEDIUM)

Нарушений выбранного решения не найдено. ReceiptConfig/Snapshot типизированы. `paymentDescription` заменяет прежнюю сборку тех же строк, а не создаёт второй каталог. Снимок создаётся в существующей транзакции вместе с offer. `NOT EXISTS` пропускает сборку нового INSERT для уже существующего ключа, сохраняя canonical retry даже при непригодных текущих account fields; UNIQUE/ON CONFLICT остаются арбитром параллельных вставок. Победившая строка перечитывается в следующем SQL statement и проверяется по sku/price.

`transaction` возвращает результат после COMMIT; сетевой POST остаётся вне транзакции. HTTP/SQL/clock работу не перенесли в startup или health. Ограничение часов/доставки меньше часового запаса и publicOrigin drift явно приняты ADR; абсолютная гарантия удалённой идемпотентности не заявляется.

## Anti-pattern violations

Подтверждённых нарушений нет. Общие checkout catches возвращают явный отказ, а не маскируют ошибку успехом. Перед fetch нет нового await после проверки возраста: provider validation и сериализация синхронны. Env различает отсутствие, непригодный набор и полный object; fallback на угаданный VAT/subject/mode отсутствует. Фискальные настройки имеют прямое эксплуатационное назначение и не являются лишним feature flag.

## Type / contract issues

### P-1 — WARNING: конфигурационный отказ маскирует обязательную reconciliation просроченного намерения

**Файл:** `apps/web/src/server/billing-handler.ts:136–145`. **Класс:** structural. **Принцип:** code-critic P6 (conformance), FR-6 и `05_architecture.md`, порядок «Создание и повтор», шаги4–5.

Конкретный вход: активный пользователь повторяет ключ старого intent со `status=created`, `provider_payment_id=NULL`, `receipt_snapshot=NULL`, возрастом ровно23часа (или отсутствующим/непригодным/будущим created_at); текущий receiptConfig равен null из-за неполных настроек. В строке137 handler немедленно возвращает **503 receipt_configuration_unavailable**, поэтому проверка age в140–145 не исполняется. FR-6 требует для такого unbound intent **409 payment_reconciliation_required** и сверку предыдущей попытки; архитектура ставит эту проверку перед конфигурационной веткой. Вариант с валидной текущей конфигурацией аналогично возвращает receipt_snapshot_missing до проверки времени, хотя там статус и требование сверки остаются409.

Пользовательский эффект: для просроченной оплаты при неполной настройке показывается «Настройки чека временно недоступны» вместо «Требуется проверка предыдущей попытки оплаты». Реальный consumer `UpgradeScreen.tsx:52–57` выводит server message. Сценарий сверки ошибочно представлен временным сбоем конфигурации. POST в обоих случаях блокируется, поэтому это **не** обход финансовой защиты, утечка или HIGH. Подтверждение — прямой статический control flow; runtime repro этой ролью не запускался.

**Условие закрытия:** после terminal/bound веток и async intent работы проверять достоверный unbound age до ранних receipt-config отказов, сохраняя отсутствие await до передачи POST. В integration добавить пересечение expired/invalid time × null snapshot × partial/invalid config: ожидается409 payment_reconciliation_required и0 POST. Соседние fresh partial config должны сохранять503; bound с теми же настройками — GET без POST. Это восстановление уже согласованного контракта, не новое требование.

## Edge-case sweep

- Отсутствие/пустой набор env, шесть partial subsets, whitespace, некорректные enum/числа: parser имеет три состояния; unit и runtime matrix проверяют их отдельно.
- Размер: один item, явные длины и2KiB snapshot CHECK. Неограниченного batch/page пути в изменении нет.
- Конкурентность: два реальных DB connections, первый INSERT удерживается до COMMIT, observer требует lock waiter; результат двух creators сравнивается целиком (`integration:123–145`). Account email читается под lock. Это содержательный оракул, не просто Promise.all.
- Удаление: реальный erase вызывается после доказанного snapshot и перевода account в erasing; intent удаляется, payment обезличивается (`integration:172–181`, `retention.ts:12–38`). Существующий порядок account→intent сохранён.
- Неопределённый ответ/рестарт: socket получает POST, upstream simulator принимает его, ответ разрывается; fresh config/deps/provider с новыми email/VAT обязаны повторить тот же полный захваченный JSON и key (`integration:90–111`). Новый client key отдельно проверяет новые значения. Это пересборка объектов, не физический перезапуск OS-процесса.
- Version skew: NULL legacy intent не backfill-ится, bound GET стоит перед config/time, old callers без receipt совместимы. Миграция029 не меняет старые SQL; мигратор хранит hash и выполняет транзакционно. Credit rehearsal исключает029 из pre-022 cohort и затем дважды вызывает обычный migrate, проверяя одну регистрацию029 и старый SQL NULL.
- Время: отдельные fixtures T−1/T/T+1/24h/>24h/future/NaN, missing/invalid created_at и реальный SQL lock crossing T. Не покрыто сочетание, описанное P-1; других подтверждённых edge-case нарушений не найдено.

## Test quality

Два новых suite прочитаны полностью. Сильные оракулы присутствуют в исходниках: реальный socket, подтверждение committed intent отдельным query при POST, PostgreSQL constraints с SQLSTATE23514 и конкретным constraint name, UNKNOWN/null/лишние поля, immutable updates с допустимым control, erase, fresh config/wiring matrix, no-receipt live refusal с положительным transport control, synthetic provider/DB/validation PII faults со счётчиками попадания и успешным соседним checkout. Это оценка конструкции тестов; зелёный результат не заявляется.

Auth/rate в новых интеграциях задаются test seams; эти suite не доказывают реализацию аутентификации или Redis rate-limit. Receipt code работает после неизменённых guards; сопутствующие `billing.unit.test.ts`, `payments-guards.test.ts`, `billing.integration.test.ts` содержат отдельные отказные/TEST-policy проверки. Статически подтверждён сбор новых файлов селектором `tests/**/*.test.ts` в `vitest.config.ts:22` через `npm test`/`scripts/test.mjs`; выполнение удалённого CI не проверялось, CI workflow-файлов в этой копии не обнаружено. `describe.skipIf(!DATABASE_URL)` требует реального DB-run у координатора, skip не является успехом.

Тест временной границы (`integration:195–205`) использует полный receipt, матрица partial config (`259–295`) — свежие intent. Поэтому обе группы не видят P-1. Это один пробел доказательства той же находки, не отдельный искусственный finding.

## Process / done-ness gaps

Проверка исполнения всего Step8 не делегирована этой роли. Исторические design outcomes, наличие06 или green-описания не считаются sourceQE. Владелец разрешил generic backend, но не live activation и не выбор рабочих фискальных значений. Отсутствие ответа бухгалтера не записано дефектом кода.

| Пункт плана | Статический результат |
|---|---|
| TASK-1: contracts/config/description | Реализован; соответствующие unit оракулы прочитаны |
| TASK-2: atomic snapshot/constraint/trigger/erase/rehearsal | Реализован; SQL и реальные DB test bodies прочитаны |
| TASK-3: provider receipt/точная сумма/live refusal | Реализован; один `value` используется у payment и item |
| TASK-4: wiring/guards/retry/status/PII | Реализован с отклонением порядка отказов P-1 |
| TASK-5: transport/DB/time/grants/referrals | Оракулы присутствуют; сочетание P-1 отсутствует; выполнение не утверждается |
| TASK-6: commands/falsifiers/independent review/anti-drift/delivery | Эта роль выполнила только независимый статический review и hash binding; прочие действия остаются за координатором/динамическим QE |

| Требование | Статическая оценка |
|---|---|
| FR-1 | Provider сериализует customer.email и один item |
| FR-2 | Account/email серверные, body закрыт до createIntent |
| FR-3 | Description из каталога фиксируется; одна `formatMinor` строка для обеих сумм; quantity1.000/RUB |
| FR-4 | Явные supported enum, никаких рабочих defaults |
| FR-5 | Snapshot/offer атомарны и immutable; конфликт sku/price сохранён |
| FR-6 | Отправка fail-closed, bound GET/no retrofit сохранены; точный отказ частично расходится: P-1 |
| FR-7 | TEST absent/full/invalid и no-receipt live запрет реализованы |
| FR-8 | Все четыре SKU присутствуют в payload и integration сценариях |
| FR-9 | Apply/refund/grant logic не изменена; integration сохраняет duplicate/referral snapshot assertions |
| NFR-1 | Snapshot закрыт от status; изменённые ошибки статические; fault tests содержательны |
| NFR-2 | Старые guards до side effects, SQL commit до HTTP |
| NFR-3 | Один nullable JSONB без backfill; существующий trigger/erase |
| NFR-4 | Реальные handler/deps/adapter/PG test bodies присутствуют; выполнение требует отдельного evidence |

## Production safety

Новой подтверждённой production-опасности в diff не найдено. `.env.example` содержит только пустые комментарии, compose передаёт три optional env только web; TEST-account exception/testMode/глобальный checkout не изменяются. Runtime migration, backup, VPS delivery, merchant/webhook settings, fiscal registration и ручная приёмка этой ролью не выполнялись и не подтверждены. Additive029 должна предшествовать использованию нового SELECT; source review не является разрешением пропустить deployment gates.

## Suggestions only (LOW)

Нет. Косметические замечания не добавлены.

## Open questions for the parent

Нет дополнительных продуктовых требований. P-1 имеет достаточное нормативное основание без нового решения о налогах или интерфейсе.

## Skipped checks

По прямому назначению статической роли не запускались тесты, lint, typecheck, falsifiers и runtime команды; не проверялась успешность авторских07 или чужих QE. Не проводились реальные покупки/возвраты, merchant mutations, включение live, DB migration на рабочем VPS, UI/E2E/ручная приёмка и push. Правовая/бухгалтерская корректность конкретного merchant classification не оценивалась. Новых внешних интеграций нет; внешние API-документы повторно не исследовались, сравнение выполнено с закреплённым generic контрактом. Объём/latency удалённого YooKassa и гарантии доставки не измерены.

**Вердикт conditional относится к данной ревизии исходников:** закрыть P-1 независимой проверкой исправленного порядка и релевантных тестов, затем координатор объединяет реальные результаты всех ролей. Никакие общие host/evaluate/journal/checkpoints/index/runtime этой ролью не изменены.

## Сверенные SHA-256

Все строки ниже пересчитаны по фактическим байтам; результат каждой — OK.

| Manifest path | SHA-256 |
|---|---|
| `.env.example` | `5be8ef9d6639ff6f9fa5d9fc1a7c813ef4c652a43eb87d14498ea070fffbb70f` |
| `apps/web/src/server/billing-deps.ts` | `07e89c11cf014b1eff1d37b5a9d31eb4b57723ee3bc5279f00b03e6e99a11af3` |
| `apps/web/src/server/billing-handler.ts` | `1129111454c5554d4e5b8649dcd9a145f92cf67120bd4fd11eb5af03a8c3977a` |
| `apps/web/src/server/billing-runtime.ts` | `d7cf1d10363239615d1b9b7dbfaaa4b9b53d239ace7cffbab62442415a2008e7` |
| `apps/web/src/server/environment.ts` | `be0c936fea8ea1d8cc5ccdb3e023f4a20dffd3d7ee340a037657b1185a359aab` |
| `apps/web/src/server/payments/provider.ts` | `56e982b160bccee508b05b1c6501f0715bcb8fab5cf0adc8c3e3d22cac36bb1d` |
| `apps/web/src/server/payments/yookassa.ts` | `c70086c5d655c7c1489ea5cf73f489ed4235195a7e1b0ae8a40d8d97fbccbce5` |
| `docker-compose.yml` | `3539729535adbf875402f88c0593ce1f032a6226e86db6da65e0d2f9758f996d` |
| `features/yookassa-receipts/00_complexity_assessment.md` | `0a4d630c8dc7235e85ad56b77cfd1291e46c4fcd4e221157561fd96e1d42e0c3` |
| `features/yookassa-receipts/01_requirements.md` | `55a14e7d6a2be017fe319cac3c5b1354558a2e6b2a95edf6c290bd4e75349490` |
| `features/yookassa-receipts/03.5_ideation_report.md` | `181bd605d09ce4caeec20dd16ae78e019b3dca757ff18ab133881482c91383d7` |
| `features/yookassa-receipts/03_adr/001-snapshot-receipt-in-payment-intent.md` | `060f5baf3ab394ce340d6eaf4965ac0bb0b796ac6543a7d650cf5a6e28422799` |
| `features/yookassa-receipts/05_architecture.md` | `5e8e0e2d23559038c73c7623f70cadc3bd1decc946d70f369b3529a5fe181199` |
| `features/yookassa-receipts/06_implementation_plan.md` | `979156b3cacd27f9e6f98ce27e7b5750b6b01d91fdf17a5bc764ecc9a9153ff2` |
| `openspec/changes/yookassa-receipts/.openspec.yaml` | `519b5d2f2c95a5824a38a573c58ef1067b39bf77f183f2c01b55804de4c18bde` |
| `openspec/changes/yookassa-receipts/design.md` | `b3ea1ce56e9ce3f8856981d78bbe425559ee792a7b61f6ebdc4e2972652759c4` |
| `openspec/changes/yookassa-receipts/proposal.md` | `5c18af660687cc48985f4844f55d11e55ecb5688ab281635ab6d7246047e2a9f` |
| `openspec/changes/yookassa-receipts/specs/payment-receipts/spec.md` | `e291cebaa600a59d9bcdef42fb20b6f3dbe88441e3339e22405b9d23076f8478` |
| `openspec/changes/yookassa-receipts/tasks.md` | `2c6540926328821a92f873d4f9dbc8f91047baa6bb4eb2c2cde157791e9f9697` |
| `packages/db/migrations/029_payment_receipt_snapshot.sql` | `364b826459442731e9f2c450bf2aebe1d4010ea8ba163139a471d0b06095b6f1` |
| `packages/db/src/payments.ts` | `18ff73f049bc8199a3f73dc5d61d86f8ab0545aea59761825ddc65442494a998` |
| `packages/shared/src/tariff.ts` | `83c3f98ab452c4e89f8dbf83aea375454da768402c9414b2f8fa2d6e8a10b601` |
| `tests/credit-packages.integration.test.ts` | `79c41f1d8ecab73594e4c53c80404249158829e25c34d09da293dec58d2781ed` |
| `tests/yookassa-receipts.integration.test.ts` | `8f022ae9dbd9fde8430514e34c3adfd7f35a0cb3413712396a4f4f45738e024e` |
| `tests/yookassa-receipts.unit.test.ts` | `5775d7047c09a45b2e90247e5597ddf7ab4530f7a03bb69d0f33cba76b81ed95` |

Ledger дополнительно сверен с `requirements-revision.json`: proposal=`5c18af660687cc48985f4844f55d11e55ecb5688ab281635ab6d7246047e2a9f`; spec=`e291cebaa600a59d9bcdef42fb20b6f3dbe88441e3339e22405b9d23076f8478`; design=`b3ea1ce56e9ce3f8856981d78bbe425559ee792a7b61f6ebdc4e2972652759c4`.

## Focused verification R2 — P-1 и полная author delta

Дата: 10.11.2026. Роль/модель/сессия прежние: `qe-primary`, `owner-exception`, `gpt-6-astra xhigh`, `/root/receipts_qe_primary`; статическая code-critic verification. **Текущий собственный вердикт: clean.** Исходная P-1 сохранена с прежним acceptance/evidence, к ней добавляется verification на новой ревизии. Это не aggregate closure и не присвоение originating-проверок S-1/S-2 роли qe-security.

Новая revision: `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`; nonce: `63778ffa-2a0f-436a-b132-d54277372051`. Самостоятельно пересчитаны **27/27** manifest SHA и прежние **3/3** ledger SHA; несовпадений нет. Прочитан `qe-author-delta.json`, SHA-256 `cf058058e1975510f640440a595648fa05bd94bca5b8407f1561986b27a504da`, включая весь `newRisks`; прочитан обновлённый06plan с TASK-7/AM-6…8 и16targets. Сравнение старого собственного manifest с новым подтвердило ровно пять изменённых/добавленных measured paths, полностью совпадающих с author.changedScope. Нормативные01/ADR/05 и три OpenSpec документа неизменны.

### Собственная проверка P-1

`billing-handler.ts:124–148` теперь исполняет порядок: terminal status → bound GET → age guard → receipt-config failures → POST. Возраст считается после `await createIntent`; при NaN/отрицательном возрасте/age>=23h возвращается409 `payment_reconciliation_required` до ветки null config. Между новым местом guard и вызовом адаптера нет await. У адаптера до fetch по-прежнему синхронные validation/serialization. Bound intent вообще не достигает проверки возраста или конфигурации, status/return ветки не изменены.

Для проверки фактического объёма production delta выполнена только обработка файлов в памяти: обратная перестановка двух блоков текущего handler даёт **точно прежний R1 SHA** `1129111454c5554d4e5b8649dcd9a145f92cf67120bd4fd11eb5af03a8c3977a`. Это подтверждает, что R2 не добавил к handler иной логики. Файлы при такой сверке не изменялись, код приложения не исполнялся.

Новый test `expired unbound intent requires reconciliation before invalid receipt config` (`tests/yookassa-receipts.integration.test.ts:195–226`) прочитан целиком и сопоставлен с сохраняемым P-1:

- Два config-входа проходят настоящий loadWebConfig: отсутствующий mode и VAT13. Оба обязаны дать `receipt=null`.
- Для каждого config создаётся отдельный настоящий DB intent без receipt. Ровно23h,24h, future, invalid clock, missing/invalid created_at должны дать409 **с точным code** `payment_reconciliation_required` и неизменным socket POST counter.
- Missing/invalid timestamp подставляется после выполнения настоящего createIntent, SQL persistence не заменяется mock.
- Соседний свежий invalid-config checkout обязан дать503 `receipt_configuration_unavailable`,0 POST.
- Отдельный bound no-receipt intent создаётся успешным checkout, затем с возрастом48h и тем же invalid config обязан дать201,0 новых POST и+1 provider GET.

Все controls используют ранее проверенные handler/deps/PG/socket seams. Если вернуть старый порядок, первый expired+null-config случай статически достигает503 и нарушает точный409 oracle. Если переставить age guard перед bound, bound48h control нарушит201/GET. Старый SQL-barrier cutoff test (`239–248`) и T−1/T/T+1/invalid cases остаются. Удаление только нового test блока из текста текущего файла в памяти даёт точный прежний SHA `8f022ae9dbd9fde8430514e34c3adfd7f35a0cb3413712396a4f4f45738e024e`: другие тестовые оракулы не ослаблены.

**P-1: implementationVerified=true** означает самостоятельную статическую проверку реального исправленного implementation и релевантных test bodies на указанной revision. Эта роль не запускала tests/repro/falsifier и не подменяет этим динамические результаты.

### Независимая проверка всей author delta и новых рисков

| Измеренный путь | Проверка R2 |
|---|---|
| `apps/web/src/server/billing-handler.ts` | Только перемещение двух существующих блоков, подтверждённое обратным hash-сравнением; guards/async/provider/status/webhook сохранены |
| `tests/yookassa-receipts.integration.test.ts` | Только новый адресный32-строчный test; точные коды, transport counters, DB и положительные controls соответствуют P-1 |
| `tests/payments-guards.test.ts` | В synthetic web environment добавлены ровно три пустые optional receipt env; positive checkWiring=[] и поочерёдные delete→точный missing→restore→[] controls; прежний TEST-account deletion сохранён (`192–210`) |
| `tests/test-webhook-route.test.ts` | Fixed handler pin обновлён на фактический SHA006829…; ip/config pins не изменены и независимо пересчитаны. Expected остаётся литералом. Новый appended-byte negative сравнивает изменённые bytes с тем же pin; spoofed/missing-hop assertions сохранены. Operational profile/fixture/launcher bindings не изменены diff (`21–38`) |
| `features/yookassa-receipts/06_implementation_plan.md` | TASK-7 и AM-6…8 адресуют три originating conditions, расширяют targets на два уже существовавших test файла, сохраняют K/QE и delivery boundaries; новой продуктовой функции нет |

Самостоятельно прочитан `scripts/check-env-wiring.mjs`: receipt env не добавлены в EXCEPTIONS; collectEnvironment продолжает собирать реальные process.env reads, а отсутствие проверяется через undefined/null. Дополнение synthetic fixture обеспечивает положительный control и не выключает scanner. Прочитаны relevant `tests/fixtures/environment.ts`, web environment/runtime, checkout policy и `clientIp`. Следующие зависимости дополнительно побайтово совпали с base e955e3f: checker, shared fixture, `apps/web/src/server/ip.ts`, `packages/shared/src/config.ts`, `deploy/test-webhook-route.caddy`. SHA ip=`af357f46c7cad2def1629a34e85b576237fd6a5db8ca9d2249639e706c823301`, config=`d66cd0977b52de2331f0a630a1c79476492aea0fec6a2be5263714ba094ff12f` совпали с fixed pins.

Author classification **structural** подтверждена: изменён порядок наблюдаемых отказов и исполнимые acceptance tests. Author.changedScope полон относительно measured delta. Оценка newRisks проверена по этим изменениям и зависимостям; **новых подтверждённых проблем не найдено**. TEST guard, запрет live без receipt, SQL snapshot/immutable/erase, grants/refund/provider остаются прежними. Гипотетические новые fiscal/UI/операционные требования не добавлялись.

Для S-1/S-2 здесь выполнена собственная статическая delta-проверка кода и тестов; их originating findings не закрываются записью primary. Числа61/61 и105/102/3 из author.evidence не являются моими результатами: private logs, тесты, lint, typecheck, build и runtime этой ролью не запускались. Отмеченное автором отсутствие R2 build не превращено в выдуманный PASS; финальная сборка и delivery остаются обязанностью координатора. Старые ограничения часов/доставки, бухгалтерского выбора, merchant/webhook/фактической регистрации чеков и ручной приёмки сохраняются.

В own receipt: прежняя P-1 сохранена без изменения смысла; добавлена собственная structural verification текущей revision, `authorAssessmentChecked=true`, `deltaVerification.implementationVerified=true` с указанным статическим evidence. Общие host/journal/checkpoints/index и чужие entries не изменялись этой ролью. Финальное evaluate выполняет координатор после всех originating roles.

### Manifest R2: фактический пересчёт SHA-256

| Manifest path | SHA-256 |
|---|---|
| `.env.example` | `5be8ef9d6639ff6f9fa5d9fc1a7c813ef4c652a43eb87d14498ea070fffbb70f` |
| `apps/web/src/server/billing-deps.ts` | `07e89c11cf014b1eff1d37b5a9d31eb4b57723ee3bc5279f00b03e6e99a11af3` |
| `apps/web/src/server/billing-handler.ts` | `006829ba5c6dfa94a03a02a806522e8938bedd651949a8e657021cb461c3054f` |
| `apps/web/src/server/billing-runtime.ts` | `d7cf1d10363239615d1b9b7dbfaaa4b9b53d239ace7cffbab62442415a2008e7` |
| `apps/web/src/server/environment.ts` | `be0c936fea8ea1d8cc5ccdb3e023f4a20dffd3d7ee340a037657b1185a359aab` |
| `apps/web/src/server/payments/provider.ts` | `56e982b160bccee508b05b1c6501f0715bcb8fab5cf0adc8c3e3d22cac36bb1d` |
| `apps/web/src/server/payments/yookassa.ts` | `c70086c5d655c7c1489ea5cf73f489ed4235195a7e1b0ae8a40d8d97fbccbce5` |
| `docker-compose.yml` | `3539729535adbf875402f88c0593ce1f032a6226e86db6da65e0d2f9758f996d` |
| `features/yookassa-receipts/00_complexity_assessment.md` | `0a4d630c8dc7235e85ad56b77cfd1291e46c4fcd4e221157561fd96e1d42e0c3` |
| `features/yookassa-receipts/01_requirements.md` | `55a14e7d6a2be017fe319cac3c5b1354558a2e6b2a95edf6c290bd4e75349490` |
| `features/yookassa-receipts/03.5_ideation_report.md` | `181bd605d09ce4caeec20dd16ae78e019b3dca757ff18ab133881482c91383d7` |
| `features/yookassa-receipts/03_adr/001-snapshot-receipt-in-payment-intent.md` | `060f5baf3ab394ce340d6eaf4965ac0bb0b796ac6543a7d650cf5a6e28422799` |
| `features/yookassa-receipts/05_architecture.md` | `5e8e0e2d23559038c73c7623f70cadc3bd1decc946d70f369b3529a5fe181199` |
| `features/yookassa-receipts/06_implementation_plan.md` | `eda24d3fa8aa5df56adb8dec6d4a0d9e8685501f922a04013f482c4c93fec742` |
| `openspec/changes/yookassa-receipts/.openspec.yaml` | `519b5d2f2c95a5824a38a573c58ef1067b39bf77f183f2c01b55804de4c18bde` |
| `openspec/changes/yookassa-receipts/design.md` | `b3ea1ce56e9ce3f8856981d78bbe425559ee792a7b61f6ebdc4e2972652759c4` |
| `openspec/changes/yookassa-receipts/proposal.md` | `5c18af660687cc48985f4844f55d11e55ecb5688ab281635ab6d7246047e2a9f` |
| `openspec/changes/yookassa-receipts/specs/payment-receipts/spec.md` | `e291cebaa600a59d9bcdef42fb20b6f3dbe88441e3339e22405b9d23076f8478` |
| `openspec/changes/yookassa-receipts/tasks.md` | `2c6540926328821a92f873d4f9dbc8f91047baa6bb4eb2c2cde157791e9f9697` |
| `packages/db/migrations/029_payment_receipt_snapshot.sql` | `364b826459442731e9f2c450bf2aebe1d4010ea8ba163139a471d0b06095b6f1` |
| `packages/db/src/payments.ts` | `18ff73f049bc8199a3f73dc5d61d86f8ab0545aea59761825ddc65442494a998` |
| `packages/shared/src/tariff.ts` | `83c3f98ab452c4e89f8dbf83aea375454da768402c9414b2f8fa2d6e8a10b601` |
| `tests/credit-packages.integration.test.ts` | `79c41f1d8ecab73594e4c53c80404249158829e25c34d09da293dec58d2781ed` |
| `tests/payments-guards.test.ts` | `9b187dae68cc9bee19add5497a95fdb871491b3ff7fb275f48c4bfb3b3e85264` |
| `tests/test-webhook-route.test.ts` | `d2a46349f2fb2388557eeda216a77cb414c637f67228f4bf31ef10f48ae9e2f1` |
| `tests/yookassa-receipts.integration.test.ts` | `6cb2a5bc88f881d963dda4b2639623c111a1e2e67d85529b7aa0652cca1d9a72` |
| `tests/yookassa-receipts.unit.test.ts` | `5775d7047c09a45b2e90247e5597ddf7ab4530f7a03bb69d0f33cba76b81ed95` |
