# ADR-001: Зафиксировать receipt в существующем платёжном намерении

## Status

proposed — обратимо до K1/K2 и реализации; пересмотреть при поддержке предоплаты, частичного возврата или нескольких позиций. Наличие документа не означает checkpoint approval.

## Context

Checkout уже фиксирует payment_intent до HTTP-вызова и использует intent.id как Idempotence-Key. Неоднозначный timeout может оставить intent без provider_payment_id, хотя ЮKassa уже получила платёж. Сумма/sku защищены snapshot и trigger, но email, описание и фискальные параметры пока не сохраняются. Простой повтор с текущим VAT менял бы данные под тем же ключом. Пользовательского изменения email в прочитанных auth/support путях нет; необходимость persistence прежде всего следует из конфигурации VAT и title при повторе после перезапуска, а не из новой формы email.

## Decision Drivers

1. D1 (high): один заказ — один канонический запрос независимо от timeout, рестарта и конкурентных попыток (FR-5, FR-6).
2. D2 (high): серверный адресат и неизменная точная сумма, запрет unfiscalized live POST (FR-1..4, FR-7; NFR-1).
3. D3 (high): сохранить TEST, webhook, grants и referrals без новых сервисов и массовой смены callers (FR-8, FR-9).
4. D4 (medium): минимальная persistence и понятное удаление PII (NFR-3, NFR-4).

## Considered Options

| Вариант | Достоинства | Недостатки |
|---|---|---|
| A. Пересобирать receipt из account/config при каждом HTTP | Нет миграции; проще первый успешный запрос | После timeout/restart VAT/title могут измениться под прежним ключом; кэш в памяти не спасает restart/несколько процессов |
| B. Nullable receipt_snapshot в существующем intent | Повтор использует один атомарный snapshot; готовые idempotency, trigger и erase lifecycle | Одна additive миграция и временное хранение email в intent; старые unbound intent нельзя дооснастить |
| C. Отдельный receipt/outbox ledger | Подходит для отдельной многостадийной фискализации и retries | Новые состояния, таблицы и согласование двух ledger без потребности текущего one-stage checkout |

## Decision

Выбран B. Добавить `payment_intent.receipt_snapshot jsonb NULL` миграцией `029_payment_receipt_snapshot.sql` и включить поле в действующий `credit_intent_immutable`. Snapshot содержит ровно `email`, `description`, `vatCode`, `paymentSubject`, `paymentMode`; цена остаётся в `price_minor`, количество и RUB — константы адаптера. Никакого backfill старых intent и изменения NULL на receipt после создания.

`createPaymentIntent` внутри существующей транзакции и account lock читает server-owned email; INSERT включает snapshot одновременно с offer. Конфликт account/key возвращает сохранённую строку; новый кандидат email/VAT не сравнивается с прежним snapshot и не заменяет его. Прежний конфликт sku/price сохраняется.

`CreatePaymentInput.receipt` optional ради TEST/fake callers. Adapter формирует одну позицию, используя уже существующий formatMinor для обеих сумм. `testMode=false` без receipt отклоняется до сети. Snapshot используется и для payment.description. Старый bound intent всегда читается GET; старый unbound без snapshot при включённых чеках получает 409, без добавления чека задним числом.

Настройки: три optional env `YOOKASSA_RECEIPT_VAT_CODE`, `YOOKASSA_RECEIPT_PAYMENT_SUBJECT`, `YOOKASSA_RECEIPT_PAYMENT_MODE`, без ENABLE-флага и default fiscal values. Полный набор допускает VAT 1..12, subject service|intellectual_activity, mode full_payment. Неизвестные/частичные значения дают непригодный config для checkout, но не ломают чтение webhook/health. Это технический поддержанный поднабор, не подтверждение классификации магазина. full_prepayment отклоняется, поскольку отдельного закрывающего чека нет.

`created_at` существующего intent возвращается создателем. До любого повторного POST unbound intent проверяется срок: возраст >=24 часа даёт 409 и требует reconciliation. Нельзя советовать новый ключ до исключения уже созданного платежа. Известный provider_payment_id сохраняет GET и после суток. Отсчёт от local intent.created_at консервативен: он предшествует первому POST.

## Rationale

- D1: persistence опирается на существующий unique intent и lock, а не на новый workflow; конкурентная вставка выбирает ровно один snapshot.
- D2: БД задаёт адресата и канонический заказ; provider сериализует точные строки и проверяет обязательность receipt в реальном режиме. Проверки ничего не угадывают о налогах владельца.
- D3: optional расширение сохраняет старый TEST. Частичная/непригодная конфигурация не может случайно означать отключение чеков. Уже созданные snapshot/remote payment обслуживаются по старым данным.
- D4: новый JSONB удаляется existing eraseAccount вместе с intent; нет отдельного PII lifecycle или хранилища.

## Consequences

Положительно: timeout, restart и смена VAT не меняют чек того же intent; no-receipt TEST сохраняется; новые реальные POST не проходят без receipt; существующая выдача entitlement остаётся независимой.

Принятые издержки: одна миграция и PII snapshot. CHECK ограничивает форму/enum/размер; immutable trigger запрещает изменение; status API не выбирает поле. Падение после intent и до HTTP оставляет созданное намерение, как и сейчас. Если конфигурация отсутствовала/была непригодна, такое намерение не переоборудуется позже — проверка и новый ключ после reconciliation. Изменение fiscal config относится только к новым намерениям.

После суток без remote ID автоматического продолжения нет: оператор сверяет исходный order_id в кабинете ЮKassa. Изменение publicOrigin между повторами — прежняя эксплуатационная граница; такие незавершённые intent должны быть сверены до смены домена, иначе return_url не идентичен. Этот блок не вводит миграцию домена.

Follow-up ADR: сейчас не требуется; отдельное решение обязательно при full_prepayment/closing receipt или инициировании частичных refunds. After-action review: владелец billing вместе с координатором, через месяц после первого разрешённого live запуска; проверить отказные intent и фактическую регистрацию чеков.

## Confirmation

- Method: unit JSON-contract + реальные PostgreSQL handler/deps integration + независимое QCSD/review. Ни одна проверка пока не заявляется выполненной.
- Monitoring: существующие статические checkout/provider ошибки; операторская проверка receipt_registration в ЮKassa; см. Observability.
- Success metric: 0 HTTP POST без receipt в real mode; 1 snapshot/order под конкурентными повторами; исходный payload после email/VAT drift; 0 POST после 24h без remote ID; 0 утечек PII.
- Owner: автор backend исполняет проверки; независимый QE подтверждает; координатор закрывает gate.
- Load-bearing property: один intent не меняет receipt и не создаёт новый remote payment после истечения provider idempotency window.
- Required automated checks: `tests/yookassa-receipts.integration.test.ts` → `retry reuses receipt snapshot after email and VAT change`, `concurrent retries commit one canonical receipt snapshot`, `unbound intent older than 24 hours requires reconciliation`; `tests/yookassa-receipts.unit.test.ts` → `live provider refuses missing receipt before HTTP`.

## Shift-left validation

| Вопрос | Поведение и проверка | Риск |
|---|---|---|
| Две конкурентные попытки с разными конфигурациями? | UNIQUE выбирает одну строку; обе используют победивший snapshot, одна idempotence key; реальный PostgreSQL concurrency test | HIGH, смягчён snapshot+тестом |
| Provider ответил, но transport/процесс упал? | Исходный snapshot уже committed; повтор до 24h идентичен; после 24h 409 reconciliation | HIGH, смягчён canonical retry+часами |
| Provider недоступен? | Прежний 503; intent остаётся created; credits/referrals не меняются | MEDIUM, existing billing integration |
| Изолированная проверка возможна? | HTTP seam перехватывает фактический JSON; DB тест не mock-ает transaction/constraint | LOW |
| Config/email поменялись? | Существующий snapshot не меняется; новая покупка использует новые серверные значения | HIGH, тест drift |

BDD: Given intent с receipt и неопределённым результатом первого POST, When процесс заново собирает deps с другим VAT и email аккаунта изменён в изолированной тестовой БД, Then повтор использует прежний receipt; после 24h HTTP не вызывается. Это тест устойчивости контракта, не введение публичной смены email.
