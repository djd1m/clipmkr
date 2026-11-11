# ADR-001: Сохранять и сверять происхождение платежа

## Status
proposed — обратимо до миграции; пересмотреть при поддержке нескольких провайдеров или необходимости исправлять уже известную identity. Основание: FR-1…6.

## Context
Normalizer проверяет test/recipient, но теряет их. Поэтому оба отчёта включают TEST. Текущая конфигурация не доказывает историю; старые pending должны завершаться.

## Decision Drivers
1. Высокий: не выдавать TEST/unknown за боевую выручку.
2. Высокий: сохранить exactly-once, pending upgrade, возвраты и историю.
3. Средний: один native тракт и малый аддитивный diff.

## Considered Options
| Вариант | Плюс | Минус |
|---|---|---|
| Сохранять identity на intent/payment | Стабильная проверяемая история, локальный отчёт | Миграция и точечная классификация старых строк |
| Вычислять среду по текущему config | Малый diff, сразу заполненный отчёт | Ложная история после смены магазина; отклонён |
| GET провайдера при каждом отчёте | Свежая внешняя проверка | Зависимость отчёта от сети, отсутствие прежних credentials; отклонён |

## Decision
Добавить `payment_environment text NOT NULL DEFAULT 'unknown'`, `payment_merchant_id text NULL` в обе таблицы и `payment_provider text NULL` в intent; payment использует существующий provider. CHECK: unknown имеет NULL merchant (у intent NULL provider), известный yookassa требует decimal merchant 1–64 знака; fake допускается только test с NULL merchant. Shared `PaymentIdentity = {provider, environment, merchantId}` — один тип; provider публикует readonly identity из server options, RemotePayment — verified identity после неизменённых raw guards. Новая intent сохраняет server identity ДО POST provider.

Known identity нельзя переписать ни retry, ни webhook, ни backfill; DB trigger допускает лишь unknown→known, сохраняя остальные immutable offer/receipt guards. Известные части пары должны совпадать. Единственный financial eligibility predicate для обоих отчётов требует `p.provider=i.payment_provider='yookassa'`, обе environment=live, равный непустой merchant и все прежние linkage/status/fulfilled условия; creditSKU остаётся условием report callers. Он не читает текущий config. Общий критерий не уравнивает owner month и blogger all-time: периоды прежние, distinct payer неаддитивен по кодам (Q-01 в01).

Legacy pending может перейти unknown→known атомарно только по canonical remote id/order/amount/test/shop, проверенным против сохранённой intent. Это разрешает completion, callback-before-bind и retry GET; не разрешает POST нового платежа по unknown intent только на основании текущего config. Unbound unknown retry требует reconciliation, если remote proof ещё нет. Terminal history классифицирует оператор отдельным GET+CAS по приватному доказательству. Обычный duplicate webhook не используется как массовый backfill.

Общий порядок mutation: payment advisory→account→intent→payment/CAS; после locks перечитать связи (RISK-002, точный протокол в05). Refund без intent опирается на canonical provider payment ID+amount и совпадение known identity; unknown сохраняется unknown. Он не восстанавливает account/order и не выдаёт credits; before-success tombstone нельзя переназначить другому intent (матрица RISK-003 в05).

## Rationale
D1: origin сохраняется после проверки, критерий общий. D2: pending promotion требует remote proof; credits сохраняются. D3: native pipeline без нового сервиса.

## Consequences
Unknown исключён до доказанной классификации. Cutover всех старых writers и zero PG sessions до030 обязателен (RISK-001/05). После новых денег DB rollback/старый writer запрещены; при сбое оставить совместимый backend и закрыть NEW sales. Downgrade обсуждается лишь после полного freeze/drain/reconciliation. Provenance не удалять. Follow-up ADR не нужен. After-action: архитектор/владелец проверяют unknown через месяц после приёмки.

## Confirmation
Method: canonical provider HTTP→handler→настоящий PG→оба reports, plus source review. Monitoring: sanitized identity-conflict reason и агрегат unknown; owner замечает расхождение денежных counters. Success metric: все FR scenarios проходят; удаление LIVE/merchant guard делает targeted тест красным. Owner: исполнитель и независимый reviewer по `docs/model-matrix.md`. Load-bearing property: непроверенная/чужая identity не даёт LIVE eligibility или чужих credits; legitimate pending upgrade остаётся exactly-once. Required automated check: `tests/payment-environments.integration.test.ts`, существующие billing/report/partner suites, Q-01 oracle, cutover/in-flight, held-lock и refund-matrix проверки; targeted guard mutation.

Shift-left: GET unavailable→503 без writes; conflict→rollback claim; PG held-lock показывает ожидание и completion. BDD: old pending+remote LIVE при callback-before-bind→один grant; TEST/unknown→нулевая финансовая добавка. Проверки Q-01/RISK-001…003 описаны в01/05; пока NOT RUN.
