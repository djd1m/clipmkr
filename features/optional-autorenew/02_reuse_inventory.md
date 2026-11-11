# Повторное использование и первичные источники

Исследована рабочая копия `feat/optional-autorenew-20261111`, baseline `4f49ab6`. Таблица — наблюдения кода, не доказательство работоспособности нового поведения.

## Native inventory

| Блок / точный путь | Повторное использование | Минимальная дельта |
|---|---|---|
| `apps/web/src/server/billing-handler.ts:98`, `billing-deps.ts:26`, `billing-runtime.ts:12` | guarded checkout; Origin/session/rate; серверные SKU/цена; durable intent до HTTP | строгий optional consent envelope; shared guard в маленький модуль; новое управление отдельно от handler |
| `apps/web/src/server/payments/yookassa.ts:98`, `payments/provider.ts:38` | fixed HTTPS API, timeout, integer amounts, merchant/test, verified GET, origin+notification verification | discriminated initial/renewal input; saved method + cancellation/confirmation normalization; manual false |
| `packages/db/src/payments.ts:25,94,163` | intent uniqueness; event claim; verified money; account-first locking; refunds; referral snapshot | consent activation в той же транзакции successful fulfillment; renewal metadata в существующем intent, без второго payment ledger |
| `packages/db/src/credits.ts:127,141` | `fulfillCreditIntentTx`, `nextCreditBaseStart`: max всех base entitlement_end, оплаченный legacy срок; addon отдельно | извлечь единый projection: unclamped paid_base_tail для T, max(now,tail) для покупки; не брать сдвигающийся now за renewal identity |
| `packages/db/migrations/029_payment_receipt_snapshot.sql`, `features/yookassa-receipts/03_adr/001-snapshot-receipt-in-payment-intent.md` | immutable receipt snapshot, missing-receipt live guard, 23h cutoff | эти invariants включить в recurring input и тесты без ослабления |
| `apps/web/src/server/retention-notices.ts:40,79` | PG journal/lease, frozen payload/provider key, revalidation, ≤3 attempts, 23h cutoff | отдельная таблица billing_notice: другие business keys/lifecycle; повторить короткий native шаблон, не смешивать с video retention |
| `apps/web/src/server/support/mail.ts:66,70,95` | один Resend transport, validated bounded payload, timeout/receipt, budget=4, synthetic capture | нейтральное имя transactional sender/send method с compatibility wrappers; без второго mail client и без SMTP fallback для recurring notice |
| `apps/web/src/server/watchdog.ts:9,94` | минутный lifecycle, single process guard, bounded ticks | вызывать small renewal + notice tick; бизнес-логика не растёт внутри watchdog |
| `apps/web/src/app/upgrade/UpgradeScreen.tsx:24`, `upgrade/return/ReturnScreen.tsx` | catalog/checkout keys, errors, dates, payment continuation | согласованные opt-in/cancel/state компоненты, прежний manual flow |
| `apps/web/src/lib/legal-documents.ts` | существующий русский текст и реквизиты | рекомендованные замены payment clauses отдельно в `payment-clauses-proposal.md`; контент/реквизиты не переписывать |
| `tests/billing.integration.test.ts`, `yookassa-receipts.integration.test.ts`, `retention-notices.integration.test.ts`, `tests/fixtures/fake-yookassa-server.ts` | реальный PG, локальный HTTP, captured payload, faults, teardown | добавить renewal concurrency/cancel/time/cutoff, изолированные synthetic recipients; без реальных платежей/писем |

Проверены native блоки и lineage N6→N4→N3 в комментариях адаптера; дополнительная история проектов 1–8 — `docs/reuse/blogger-cabinet-projects-1-8.md`. В этой сессии полный свежий аудит исходников всех доноров **не выполнен**. Он не нужен для нового HTTP/mailer/runtime, поскольку готовые адаптированные блоки уже в Clipmkr. Недостающий consent/renewal state — доменная политика этого продукта, не повод переносить второй платёжный сервис. `architecture/vision.md` в данной копии не найден; project invariants взяты из AGENTS/CLAUDE/core-cjm.

## Primary sources, проверены 11.11.2026

| Источник | Подтверждённое положение | Следствие / что не доказано |
|---|---|---|
| [YooKassa: основы](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/basics) | Live-автоплатежи подключает менеджер; магазин отвечает за условия/отключение | Обычный live не подтверждает recurring capability; приложение прекращает использовать token при отключении |
| [Привязка во время платежа](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/save-payment-method/save-during-payment) | Собственное согласие → save_payment_method=true; после успешного платежа проверяются saved и payment_method.id | Храним ID из canonical GET; не доверяем posted token и не включаем по одному redirect |
| [Платёж без сохранения](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-without-saving) | Для ручного платежа явно false | Boolean подтверждён [официальной OpenAPI](https://yookassa.ru/developers/api/yookassa-openapi-specification.yaml), SavePaymentMethodAttribute; не копировать строку из prose-примера |
| [Проведение автоплатежа](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-with-saved) | Новая оплата с payment_method_id; pending может ждать чек; canceled содержит cancellation_details | Не считать отсутствие redirect ошибкой recurring; terminal decline не повторять новым intent |
| [Идемпотентность YooKassa](https://yookassa.ru/developers/using-api/interaction-format) | Одинаковые key/data повторяются; окно 24h | Сохраняем существующий консервативный 23h локальный cutoff; абсолютной гарантии внешней задержки нет |
| [YooKassa: автоплатёж для магазина](https://yookassa.ru/docs/support/payments/extra/autopayment) | Предупреждение перед списанием и оферта с включением/отключением | Источник не задаёт наши 72h/24h; эти интервалы — продуктовый default, не законодательная норма |
| [Resend: idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys) | Один key/request дедуплицируется 24h | Frozen message и stop <23h; provider accepted не означает inbox delivery |

Не проверялись merchant settings/секреты/реальные деньги. Правовая достаточность документов не установлена; выбор VAT=1/service/full_payment — данное владельцем решение. Развёртывание обычного live магазина делает координатор отдельно.

## Варианты и anti-patterns

Native PostgreSQL + watchdog + существующие адаптеры выбран вместо нового subscription SaaS/SDK или Redis-only schedule: один источник financial facts, меньше межсервисных состояний, отсутствие новых runtime-зависимостей. Цена — короткие явные транзакции и отдельные SQL tests. Новый general-purpose workflow/outbox framework отложен: две доменные очереди не оправдывают абстракцию с большой конфигурацией. Узкие общие transport/claim helpers извлекаются только при реальном совпадении контрактов.

Запрещённые формы: opt-out по умолчанию; сохранённая карта как автоматическое согласие; token из браузера; пересборка receipt/consent при retry; SELECT→HTTP без durable dispatch identity; новый key после unknown; повторное списание после decline; удержание SQL-lock на HTTP; accepted=delivered; чтение только текущего active grant; повторная активация от старого webhook; разрешение recurring по факту обычного live checkout.

## Методика тестируемости

Применены reference `studio-extended-qe`: risk-based-testing, qe-requirements-validation, test-design-techniques, security-testing (snapshot Product Studio `c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`). Методы — risk scoring, BVA, state transitions, decision tables, authenticity/isolation; AQE runtime не запускался. `code-impl` применён к границам модулей/SQL/typed contracts. `code-goal-planner` прочитан как reference preconditions/effects; план 06 не создаётся до QCSD.

## Фактически полученный recall

Координатор выполнил закреплённый dz на Node22 с canonical store `/home/clipmkr`, exit0. Advisory patterns: `teach:9262c059cfda39fb` — golden legal tests не доказывают совпадение payment semantics; `teach:89ea17b2ebf27600` — lost checkout response не повод для нового key; `teach:90c46998255eb41b` — receipt/env изменения требуют соседних negative/wiring suites; `teach:2d3d9d8b8ef7670f` — новый пакет не восстанавливает физически удалённые clip bytes. Они применены в FR-7/8/13, legal delta и QT-9/15; это не новые требования владельца и не самостоятельный повторный recall архитектора.

OpenAPI raw GET: 11.11.2026, HTTP200, SHA-256 `3e411baebe816b880c6438b9fcc75d1606082b830425b4afc96f4acf4f7ece56`; SavePaymentMethodAttribute.type=boolean. Web-tool не смог прочитать octet-stream, поэтому прочитан официальный YAML через urllib без токенов. Сведения о документации подтверждены открытыми primary sources; состояние конкретного merchant неизвестно. Ed25519 issuer provenance не проверялась и не заявляется.
