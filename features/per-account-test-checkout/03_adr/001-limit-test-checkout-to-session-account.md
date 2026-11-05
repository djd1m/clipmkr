# ADR-001: Ограничить тестовое оформление серверным аккаунтом

## Status
proposed — обратимо очисткой private UUID при global checkout=false; пересмотр только при
отдельном запросе расширить аудиторию или разрешить live charges.

## Context
Provider сейчас выключен для всех. После его включения с TEST credentials существующий
API умеет глобально блокировать checkout, но не предоставляет одно session-account исключение.
SSR /upgrade ориентируется на наличие provider и billing policy, пропуская checkoutEnabled.
User authority FR-1–FR-7 ограничивает изменение одним согласованным аккаунтом и TEST магазином.
Ни email, ни UUID/credentials не включаются в публичные документы или клиентский payload.

## Decision Drivers
D1 high: ограничение по подлинной session identity и запрет LIVE-исключения.
D2 high: fail-closed config, одна policy для SSR/API без расходящихся условий.
D3 high: существующие intents, idempotency, webhook и ledger без изменений.
D4 medium: небольшой native diff, без нового UI/feature-flag сервиса/таблицы.

## Considered Options
### A. Typed private UUID и одна canonical функция существующего config модуля
Плюсы: конфигурация/preflight/runtime проверяемы целиком, одна policy, минимум native wiring.
Минусы: требует рестарта web для отзыва, нужно провести настройку через явный environment adapter.
### B. Включить checkout глобально с TEST credentials
Плюсы: не требует кода, существующий provider и flow уже готовы.
Минусы: доступ получают все credits_v1 аккаунты; прямо противоречит команде владельца.
### C. Новая роль/таблица allowlist и административный экран
Плюсы: динамическое управление несколькими пользователями без рестарта.
Минусы: новые права/миграция/UI и согласование ради одного temporary исключения; лишняя поверхность.

## Decision
Выбрать A. В `packages/shared/src/config.ts` добавить nullable `testCheckoutAccountId`, прочитанный
из optional `N5_TEST_CHECKOUT_ACCOUNT_ID`, и экспорт `checkoutAllowedForAccount`.
Undefined/пустая строка → null (исключение отсутствует); любое другое значение — один canonical
lowercase UUID без trim, email, JSON, wildcard или списка; malformed → отказ старта без значения в error.
Nonempty UUID допустим только при `checkoutEnabled=false`, `billingMode='credits_v1'`,
`payments.mode='live'`, `payments.testMode=true`, `secretKey` с префиксом `test_` и непустым остатком.
Mode live здесь означает текущий native ЮKassa driver, настоящий денежный режим остаётся запрещён.
Обычный loadPaymentsConfig продолжает проверять shop/key и явное true/false; новый guard добавляется
только для исключения, не меняет трактовку уже существующей нормальной настройки без UUID.

`checkoutAllowedForAccount(config, accountId, accountBillingPolicy, providerReady)` — чистая server-used
функция. Нет provider/session → false. Глобальная существующая ветвь true сохраняет текущий обычный
режим. При global false исключение требует exact UUID, TEST driver и credits_v1 config/account policy.
Preflight гарантирует невозможность UUID с global true/LIVE; сам predicate также проверяет testMode.
Этот helper не вызывается с identity из body/query. В SSR применяется к authenticated account;
в handler после guardMutation читается existing billingPolicy и проверяется callback до body/intent.

`BillingDependencies`/`BillingWiring` получают обязательный `checkoutAllowed(accountId, policy)` callback
вместо старого optional scalar checkoutEnabled. Runtime связывает его с `checkoutAllowedForAccount`
и validated config/provider. Никакого fallback «callback отсутствует → разрешить».
SSR использует тот же helper; существующие catalogOnly/owner/purchaseWindows guards сохраняются.
Публичный контракт POST/status/webhook и UpgradeScreen не меняется. Secrets/UUID не сериализуются в props.

## Rationale
D1/D2: подлинная identity известна после auth; typed config исключает случайное открытие LIVE и
общей продажи, SSR/API не получают две реализации допуска. D3: guard стоит до существующего
intent/provider кода, status/webhook не закрываются вместе с новым checkout. D4: B нарушает
границу пользователя, C создаёт ненужную систему вместо малой настройки native приложения.

## Consequences
### Positive
Нет миграции, нового provider/API, изменения цены/кредитов или account roles; exact session ownership.
### Negative / Accepted Downsides
Отзыв требует web restart: private UUID очистить, global false сохранить. Provider off закрывает
все payment routes как прежде; для завершения прежнего TEST intent оставить TEST provider включённым.
Проверка префикса — fail-closed защита настройки, не доказательство подлинности магазина/платежа;
подлинность и raw.test по-прежнему проверяет существующий provider requery.
Нужно обновить пять тестовых wiring/SSR fixtures вместе с обязательным callback, без ослабления assertions.
### Follow-up ADRs
Не требуются; массовый rollout или LIVE-оплата — отдельное решение владельца.
### After-action Review
Координатор проверяет отзыв исключения после ручной TEST-приёмки, затем через месяц при сохранении настройки.

## Confirmation
- Method: config/preflight unit, SSR parity, реальные sessions+HTTP+PG с local provider fixture.
- Monitoring: текущие checkout_paused/auth/verification HTTP статусы и sanitized billing log.
- Success metric: A TEST разрешён; B/anonymous/spoof/LIVE не создают intent и не вызывают provider.
- Owner: автор Sol high; независимый code/QE Astra xhigh. Design QCSD — три Terra xhigh core роли.
- Load-bearing property: session-only identity + TEST-only exception + SSR/API parity + no duplicate grant.
- Required automated check: `tests/billing.unit.test.ts`, `tests/billing.integration.test.ts`,
  `tests/payments-guards.test.ts`, `tests/credit-packages-ui.test.ts`, `tests/credit-packages.integration.test.ts`.

## Shift-left
Given global false, A/B с реальными сессиями и TEST config, When тот же POST, Then A свой intent,
B 503 без body/intent/provider. Given testMode false + UUID, When preflight, Then отказ до Next.
Given удалён UUID и TEST provider остаётся, When повтор webhook, Then прежняя идемпотентность.
Concurrent повтор A остаётся в существующем intent unique/driver idempotency; добавляется regression.
Недоступный provider не обходится exception; отсутствующий callback не даёт разрешение.
HIGH риски auth bypass, LIVE mismatch, drift UI/API имеют named negative/falsifier tests в плане.
Это проектная оценка; независимый QCSD, runtime и provider checks ещё не выполнялись.

## Уточнение после initial QCSD — 05.11.2026
QL-01: существующий local provider fixture исправляется на атомарный idempotence-key lookup/create
после await body; barrier до атомарного участка делает перекрытие воспроизводимым. Confirmation:
`overlapping test checkout creates one provider payment per intent key` в `tests/billing.integration.test.ts`
проверяет одну PG intent, один unique provider payment, один и тот же idempotence key=интент,
не более одного grant. HTTP attempts считают отдельно: несколько попыток допустимы, два payment нет.
Falsifier неверного provider key/повторного create должен краснеть. Local fixture не доказывает ЮKassa/24h TTL.
QL-02: `revoked test exception rejects non-test webhook before ledger writes` в той же suite после
отзыва меняет локальный requery.test=false, требует 400 и нулевые дельты payment_event/payment/credit_grant;
затем true → один success/grant и duplicate без нового grant. Удаление raw.test проверки → RED.
QT-001: `native Next responses hide test exception identity across account changes` в
`tests/browser/per-account-test-checkout-next.test.ts` наблюдает настоящие HTML+Flight, A/B, direct load
и Next Link navigation; renderToStaticMarkup этого не доказывает. Если текущий key сериализует UUID,
в UpgradePage заменить только key на HMAC-SHA256(existing sessionSecret, domain+accountId), без нового
секрета/компонента. Стабильный ключ в аккаунте и разные A/B сохраняют remount; regression stale response
остаётся обязательным. Это opaque UI key, не новая session/auth credential. Runtime экспозиция пока не доказана.
