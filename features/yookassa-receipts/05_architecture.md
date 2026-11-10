# Чеки ЮKassa: архитектура M

Статус: settled design для независимого QCSD, до K1/K2; не разрешение применять runtime SQL, менять магазин или выполнять настоящую покупку. Решение: [ADR-001](03_adr/001-snapshot-receipt-in-payment-intent.md).

## C4 Component

```mermaid
flowchart LR
  E[web environment reader] --> C[loadPaymentsConfig]
  C --> R[billing-runtime / deps]
  S[Сессия + закрытый body] --> H[billing-handler]
  R --> H
  H --> I[createPaymentIntent]
  I --> A[(account: email/status)]
  I --> D[(payment_intent: immutable offer + receipt)]
  T[Серверный каталог тарифов] --> I
  D --> H
  H --> P[PaymentProvider / YooKassa adapter]
  P --> Y[ЮKassa POST payments / GET existing]
  Y --> W[Прежний verified webhook]
  W --> G[Прежние payment / grants / referrals]
```

Браузер передаёт только прежние idempotency_key и разрешённый sku. Email не расширяет общую session/auth projection: его читает SQL creator по проверенному accountId под существующей блокировкой. JSON snapshot не выходит в API.

## Контракты и новые имена

В `packages/shared/src/tariff.ts`: `ReceiptConfig` (vatCode, paymentSubject, paymentMode), `ReceiptSnapshot` (тот же набор + email, description), `loadPaymentReceiptConfig(env)`, `paymentDescription(sku)`. Последний переиспользует ровно прежние строки каталога и заменяет сборку строки в handler; не создаёт второй словарь. Legacy exported PAYMENT_DESCRIPTION при наличии callers становится alias helper, не параллельным источником.

`PaymentsConfig` в live-ветке получает optional `receipt?: ReceiptConfig | null`: undefined — все три значения отсутствуют; null — набор частичный/непригодный; object — полный валидный набор. Это результат parser, не новое состояние платежа. Пустые значения compose при полностью незаданном наборе трактуются как отсутствие; whitespace, некорректные числа, неизвестные enum при наличии настроек — null. Конфигурация не включает сам merchant receipt service: он включается оператором ЮKassa отдельно.

`BillingWiring` и `BillingDependencies`: optional `receiptConfig?: ReceiptConfig | null`; `createIntent.input.receiptConfig?: ReceiptConfig`. Только валидный object передаётся SQL creator. `CreatePaymentInput.receipt?: ReceiptSnapshot` — additive provider contract. Fake игнорирует optional поле; реальный YooKassa adapter требует его при testMode=false и валидирует перед HTTP.

Вместо расширения public IntentView приватными данными создать `CheckoutIntentRow extends IntentRow` с обязательными `created_at: Date` и `receipt_snapshot: ReceiptSnapshot | null`; `CreateIntentResult` использует CheckoutIntentRow. Это узкая форма результата createPaymentIntent. `readPaymentIntent`/IntentView и их SELECT не получают snapshot. Fake fixture, возвращающий successful CreateIntentResult, обязан задать настоящий test created_at: отсутствие времени не является допустимым обходом 23h cutoff.

## Создание и повтор

1. Сохранить порядок provider availability → session/rate/Origin → checkoutAllowed → закрытый body/sku/key. Никакого клиентского receipt.
2. `createPaymentIntent` берёт существующий account FOR SHARE, читая status/email; формирует snapshot только при валидном receiptConfig. INSERT atomically пишет snapshot вместе с price/sku/offer. ON CONFLICT возвращает прежние данные. Новая конфигурация/новый email не порождают idempotency_conflict; цена/sku по прежнему порождают.
3. Завершённый intent выдаёт прежний статус. Известный provider_payment_id вызывает только GET, даже при изменённых/непригодных текущих настройках и возрасте >24h.
4. Для unbound created intent непосредственно перед вызовом адаптера проверить конечные корректные timestamp и `0 <= clock - created_at < 23h`. При age >=23h, invalid/missing timestamp, некорректном clock или created_at из будущего — 409 `payment_reconciliation_required`, без POST и без нового ключа автоматически. Проверка стоит после всей async SQL/wiring работы; до fetch у текущего адаптера только синхронная валидация. Любой новый await между guard и fetch требует повторной проверки возраста после него. Реальная БД возвращает NOT NULL created_at; плохой fake результат не обходится optional-полем.
5. Если snapshot уже существует, использовать его и сохранённую price_minor независимо от новых настроек. Если snapshot нет и текущая конфигурация валидна — старый intent получает 409 `receipt_snapshot_missing`, без retrofitting. Если конфигурация null — 503 `receipt_configuration_unavailable`, без HTTP. Undefined оставляет прежний TEST no-receipt путь; реальный adapter сам блокирует отсутствие receipt до HTTP.
6. POST получает прежние orderId/returnUrl/amountMinor и snapshot.description. Существующие setIntentPayment, статус ответа, ошибки/ретраи остаются. В случае отсутствующей/непригодной конфигурации может остаться created intent без HTTP — это прежний failed-intent lifecycle; после настройки ему нельзя добавлять receipt, нужен разбор и новый ключ.

При конкурентных попытках единственный UNIQUE(account_id,idempotency_key) выбирает canonical snapshot. Обе стороны используют победившую строку, а не локальный кандидат. Все сети остаются вне SQL transaction.

## Данные и миграция

`029_payment_receipt_snapshot.sql` добавляет единственный nullable JSONB `receipt_snapshot` без default/backfill. CHECK: NULL либо object с ровно пятью названными ключами, строковыми email/description (1..254 и 1..128 символов), числовым целым VAT 1..12, subject из service/intellectual_activity, mode=full_payment; JSON null/отсутствующие поля не обходят CHECK через SQL UNKNOWN. Ограничить размер объекта разумным фиксированным пределом 2 KiB. Runtime также валидирует корректный email до HTTP; произвольный сохранённый текст не отправляется как адрес.

Обновить существующую функцию credit_intent_immutable, добавив receipt_snapshot к сравнению OLD/NEW. Запрещено в том числе NULL→object. Старые миграции не редактировать. Существующий eraseAccount удаляет intent вместе со snapshot; не сохранять дубликат в payment/growth_event/log. Не возвращать snapshot через readIntent или collection/report readers. Миграция создаётся и проверяется на изолированной БД; runtime применение не входит в полномочия архитектора.

## API design

Вход/успех checkout и status неизменны. Непригодный body — прежний 422; receipt config failure — статический 503; старый unbound без snapshot/истёкший idempotency window — статический 409. Тексты не содержат email, snapshot или значения конфигурации.

Provider JSON расширяется только `receipt: {customer:{email},items:[{description,quantity:"1.000",amount:{value,currency:"RUB"},vat_code,payment_subject,payment_mode}]}`. Тот же formatMinor(intent.price_minor) задаёт payment.amount.value и единственную item.amount.value. Опциональные phone, tax_system_code, timezone, internet, marking/industry fields не добавляются без применимого требования. Не распространять общие правила сторонних онлайн-касс на подключённый yoo_receipt.

## Конфигурация и включение

Цепочка P23: `.env.example` (только комментарии) → `docker-compose.yml` (optional web env) → `apps/web/src/server/environment.ts:readEnvironment` → `loadWebConfig`/`loadPaymentsConfig` → `billing-runtime` → `createBillingDependencies` → handler/createIntent → сохранённый snapshot → YooKassa JSON. Web reader использует whitelist, поэтому одного compose/config parser недостаточно. Worker не нуждается в receipt settings и не получает их.

Три env: YOOKASSA_RECEIPT_VAT_CODE, YOOKASSA_RECEIPT_PAYMENT_SUBJECT, YOOKASSA_RECEIPT_PAYMENT_MODE. Нет активирующего флага: полный явный набор является TEST opt-in. Поддержанный набор: VAT 1..12; service|intellectual_activity; только full_payment. Ни один вариант не объявлен налоговым фактом магазина. Полностью отсутствующий и неполный набор не ломают startup/health/webhook; partial/invalid не допускает новый no-receipt TEST POST. Боевой режим всегда требует receipt. Реальное включение ждёт ответ бухгалтера и проверку merchant/webhook; действующий TEST runtime/checkout exception не меняются.

## Observability

Использовать текущие billing logs уровня error только со статическими категориями: receipt_configuration_unavailable, receipt_snapshot_missing, payment_reconciliation_required, provider rejected/unavailable. Не печатать exception.message, если он может содержать request/provider data; ошибки нового receipt validator обязаны быть статическими. Для текущего try/catch гарантировать, что receipt failures не включают email, секрет или сырой JSON.

Считать в существующем журнале количество этих отказов и успешных checkout/подтверждённых payments; новых metric exporters/таблиц нет. Внешний симптом: 503 настройки или 409 требующего разбора intent, вместо redirect; оператор видит безопасную категорию в web logs и исходный order_id/платёж в ЮKassa. Успешный POST доказывает принятие payload, не регистрацию чека: receipt_registration и доставку оператор проверяет в кабинете ЮKassa. Автоматический фискальный monitor в этот блок не входит.

## Source/test targets и проверка

Изменяемые source/config targets: `packages/shared/src/tariff.ts`; `apps/web/src/server/{environment,billing-runtime,billing-deps,billing-handler}.ts`; `apps/web/src/server/payments/{provider,yookassa}.ts`; `packages/db/src/payments.ts`; `docker-compose.yml`; `.env.example`. Новый: `packages/db/migrations/029_payment_receipt_snapshot.sql`. Итого 11 source/config файлов, включая одну миграцию; новых production TS файлов/пакетов нет.

Новые test targets: `tests/yookassa-receipts.unit.test.ts`, `tests/yookassa-receipts.integration.test.ts`. Точные названия — 01_requirements и ADR Confirmation. Дополнительно обязательны `receipt config reaches checkout through readEnvironment and billing wiring`, `invalid receipt config leaves webhook and status readable`, `unbound intent enforces conservative 23 hour retry cutoff`. Если existing typed successful checkout fixtures требуют created_at, править только конкретные найденные callers и внести их в финальный06plan до K2; текущий поиск в billing unit/integration не нашёл самописанного successful intent fixture.

Интеграция выполняет actual HTTP adapter через fetch/fixture и настоящую PostgreSQL transaction: обрыв ответа после принятия payload, повтор после смены VAT/email с fresh wiring, управляемое перекрытие двух конфигураций, граница 23h и отдельный24h STOP, bound legacy GET, immutable trigger, account erase, public status. Исходные billing/credit-packages/blogger-referrals тесты покрывают начисления и старые TEST paths. После адресных проверок — `npm test`, `npm run typecheck`, `npm run lint` и существующий env wiring check; SQLite/mock SQL не заменяет DB evidence. ЮKassa реальные деньги и merchant API mutations не используются.

## Дискриминирующие сценарии: QC-1, QT-1…QT-4

Это обязательный дизайн будущих executable tests; ни один сценарий здесь не объявляется выполненным. Все данные синтетические, PostgreSQL и HTTP socket изолированы от рабочего runtime. Existing fixture/adapter apiBase переиспользуются; нельзя подменять фактический outbound fetch его заглушкой для нижеследующего транспортного доказательства.

**QC-1 / QT-4 — время.** T = 23h от сохранённого created_at. Оставшийся час — консервативный запас, не измеренный сетевой SLA. Предполагается, что суммарная ошибка DB/application clocks, локальная остановка после guard и задержка приёма у ЮKassa меньше 1h; это условие удалённой защиты, не доказательство. 5s AbortSignal не устанавливает момент удалённого получения и не отменяет уже принятый запрос. Если допущение нарушено, исключение второго remote payment не гарантируется даже при прошедшем локальном guard. При известной ненадёжности часов checkout остаётся выключенным до операторской сверки; без remote ID автоматическая reconciliation не создаётся.

`unbound intent enforces conservative 23 hour retry cutoff`: отдельные unbound fixtures, управляемый deps.clock без sleep — T−1ms: локальный socket реально получает POST; T, T+1ms, 24h и >24h: 409 и ноль принятых POST. Для каждого случая свой intent/fixture, чтобы ранний успех не перевёл следующий случай в bound. Missing created_at, Invalid Date, future created_at и непригодный clock дают такой же отказ. Bound intent после суток с partial/invalid config даёт реальный GET, ноль POST. `retry budget is checked after asynchronous intent work`: удержать фактическую SQL-работу, сдвинуть clock из T−1 в T, отпустить SQL и убедиться, что POST не начат; соседний неизменённый clock является positive control. Это доказывает порядок локальной проверки, не верхнюю границу удалённой задержки.

**QT-1 — принятый запрос, потерянный ответ, новая сборка.** `retry reuses receipt snapshot after email and VAT change` запускает настоящие createCheckoutHandler/createBillingDependencies/createPaymentIntent и YooKassa adapter с локальным HTTP сервером. Сервер сохраняет method/path, полный JSON и Idempotence-Key после чтения тела; только затем уничтожает socket ответа. Assert: endpoint действительно принял запрос, handler дал отказ, PostgreSQL содержит один intent с snapshot и без provider_payment_id. Сам факт вызова fetch или бросок до отправки не засчитывается.

Изолированно создать заново config, deps, handler и provider; старые объекты не передавать и не переиспользовать. В тестовой БД изменить email, в свежем readEnvironment/config изменить VAT. Повторить прежний client key до T: сервер видит тот же provider key и семантически идентичный полный payment/receipt JSON, включая первоначальный server-owned email; в PostgreSQL по-прежнему один intent. Сервер отдаёт успешный ответ, доказывая рабочий round trip. Новый client key использует новые email/VAT. Отдельный повтор bound intent наблюдается как GET, без дополнительного POST; число запросов считается на серверной стороне socket.

**QT-2 — реальная конкурентность.** `concurrent retries commit one canonical receipt snapshot` использует два настоящих DB connections и один account/key, но разные VAT-кандидаты. Тестовый barrier задерживает возврат уже выполненного первого INSERT до COMMIT, не заменяя SQL результат. Второй creator начинает конкурирующий INSERT. Третий observer фиксирует backend PID и pg_blocking_pids/wait_event: второй writer действительно ждёт транзакцию первого. Только после этого release barrier; оба creator должны вернуть одинаковые intent.id и snapshot победителя. Один Promise.all без наблюдённого перекрытия не является evidence. Socket fixture при каждом POST отдельным observer connection читает уже committed intent/snapshot — это доказывает, что HTTP следует после commit, а не внутри транзакции.

`receipt snapshot database constraints reject malformed values`: положительный INSERT полного допустимого snapshot; отдельные отрицательные INSERT для каждого отсутствующего ключа, JSON null вместо объекта/каждого обязательного значения, лишнего ключа, неверного типа email/description/VAT/enum, дробного/out-of-range VAT, неподдержанных subject/mode, пустых и слишком длинных строк, размера >2KiB. Каждый должен получить именно нарушение CHECK, а не посторонний FK/unique отказ. Отдельный NULL legacy INSERT допустим. SQL CHECK должен отвергать UNKNOWN: отсутствие ключа/JSON null обязаны провалить сохранение, а не просто дать falsy в JS.

`receipt snapshot immutable trigger preserves allowed updates`: после доказанного INSERT отвергнуть UPDATE object→другой object, object→NULL и NULL→object; разрешённое изменение status/provider_payment_id проходит. Проверить неизменность исходного snapshot после ошибок. `receipt snapshot is erased with an erasing account`: создать и прочитать snapshot и связанный разрешённый payment, перевести account в erasing, вызвать настоящий eraseAccount, затем доказать отсутствие intent/snapshot; разрешённый финансовый payment сохраняется с обезличенными ссылками. Пустая БД либо вызов erase при active не является успешным контролем.

**QT-3 — полная матрица config.** `receipt config reaches checkout through readEnvironment and billing wiring` каждый раз создаёт свежие config/deps/provider из тестового process env с восстановлением окружения после случая. Матрица: все отсутствуют; все пустые (compose absent); полный синтетический набор; все 6 непустых частичных поднаборов 3 полей; whitespace каждого поля; VAT 0/13/дробь/неканоническая строка; неизвестный subject; full_prepayment/неизвестный mode. Для отсутствующего TEST реальный socket принимает no-receipt POST, для полного — receipt POST; partial/invalid новый checkout даёт 503 и ноль POST. При каждом классе конфигурации настоящая инициализация runtime/health и допустимые status/webhook работают; bound GET также не блокируется. Синтетический real-mode adapter без receipt даёт отказ до сети; соседний валидный receipt control достигает того же сервера. Нельзя доказывать wiring прямой передачей уже собранного ReceiptConfig мимо readEnvironment.

**QT-3 — PII и порядок.** `receipt failures never expose buyer email or provider secrets`: уникальные синтетические email/secret/raw-JSON markers подаются (а) в error body локального provider socket, (б) в PaymentVerificationError на provider seam, (в) в DB/validation exception на соответствующей границе. Для каждого случая фиксировать счётчик попаданий инъекции, ожидаемую error category/status и отсутствие markers во всех возвращённых HTTP body и перехваченных billing logs. Сырой provider/DB message нельзя выводить даже при безопасном названии класса. Пустые logs без подтверждения срабатывания пути не засчитываются. Успешный control использует тот же HTTP/DB путь и показывает работоспособность harness.

`checkout rejects client receipt and PII before intent creation`: с валидной сессией/Origin по отдельности передать forged email, receipt, amount/price, title и налоговые поля; каждый ответ 422, intent и серверные POST отсутствуют. Соседний валидный запрос этой же сессии достигает socket с email своего активного account. `checkout status excludes receipt snapshot` сначала создаёт и читает приватный snapshot, затем проверяет настоящий публичный status body на отсутствие email/объекта/синтетических markers.
