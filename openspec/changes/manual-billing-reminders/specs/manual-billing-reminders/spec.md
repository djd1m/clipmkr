## ADDED Requirements

### Requirement: Manual payment only
Система SHALL сохранять ручной checkout, RUB/цены/receipt/grants; Yoo POST SHALL иметь boolean save_payment_method=false без payment_method_id. Reminder SHALL NOT создавать payment intent или вызывать payment API.
#### Scenario: Reminder and checkout boundary
- **WHEN** reminder tick выполняется и отдельно пользователь инициирует ручной checkout в fixture
- **THEN** tick не вызывает Yoo; только checkout отправляет существующий body с explicit false

### Requirement: Authoritative paid-period end
Система SHALL объединять payment-origin base/addon/eligible legacy интервалы, покрывающие now, и смежную оплаченную будущую очередь. End SHALL NOT зависеть от remaining_seconds или clamp(now). Trial/recovery/bonus/owner/operator/legacy_daily_v1 исключены. Один event/account/end/offset:3 при24h<remaining<=72h,1 при0<remaining<=24h.
#### Scenario: Existing paid continuation
- **GIVEN** base заканчивается через2дня, а addon/смежный оплаченный пакет продлевает период на20дней
- **WHEN** scheduler запускается
- **THEN** письмо о старом base end не создаётся; addon-only paid period получает свои3/1 reminders
#### Scenario: Delayed scheduler
- **WHEN** первый eligible tick происходит за20h до конца или после конца
- **THEN** остаётся только offset1 либо ни одного письма; offset3 не догоняется

### Requirement: Revalidation and bounded idempotency
Система SHALL перед каждым dispatch revalidate account/verified recipient/current period/offset/refund-review и serialized journal. Event уникален независимо от email; после first attempt payload/key immutable. At most3 attempts с интервалом1h и budget<23h; timeout/lease expiry не создают новый key. Accepted SHALL означать provider acceptance, не delivered. Network SHALL быть вне SQL transaction.
#### Scenario: Purchase or recipient change
- **WHEN** новый пакет/status/email committed до dispatch claim
- **THEN** устаревшее письмо подавляется; до first attempt новый verified email допустим, после неё тот же event не повторяется другому получателю
#### Scenario: Competing workers and lost response
- **WHEN** два DB clients конкурируют за event, ответ потерян, lease истёк
- **THEN** повтор использует те же bytes/key в budget; stale completion fenced; после23h новых sends нет

### Requirement: Manual message and safe rollout
Система SHALL использовать exact-date МСК/ручной CTA `/upgrade`, не обещать исчезновение бессрочных кредитов/клипов. Delivery flag SHALL быть optional/default false; missing mail SHALL NOT ломать startup/health/checkout. Logs SHALL исключать rawPII/keys.
#### Scenario: Disabled mail
- **WHEN** flag отсутствует или почта недоступна
- **THEN** reminders пропускаются, ручная покупка и health доступны

### Requirement: Narrow legal correction
Система SHALL менять только согласованные terms§6.3/7.7/7.8 и дату через existing replacement map;87абзацев,refund/15%/реквизиты/rights сохраняются. Публикация SHALL ожидать решения LEGAL-1 о §10.2/14days.
#### Scenario: Legal regression
- **WHEN** текст применяется после разрешения
- **THEN** golden paragraphs отличаются только exact approved replacements; нет новых UI actions
