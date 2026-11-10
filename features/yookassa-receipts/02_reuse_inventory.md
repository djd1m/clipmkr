# Чеки ЮKassa: инвентаризация переиспользования

Проверено 10.11.2026, рабочая база `e955e3f2e67e5663eec24dadeb828cacd18e9a9f`.
Ограниченный поиск выполнялся по явным исходникам `apps`, `packages`, `shared` проектов; `.env`, приватные каталоги, API магазина и runtime не читались.

## Native-компоненты

| Источник Clipmkr | Решение и причина |
|---|---|
| `apps/web/src/server/billing-handler.ts` | Расширить существующий checkout; сохранить Origin/session/body guard, paused/test-account policy, выдачу intent до HTTP и GET уже известного платежа. |
| `apps/web/src/server/billing-deps.ts`, `billing-runtime.ts`, `environment.ts` | Провести конфигурацию через текущий wiring; не расширять глобальную auth session email-полем. |
| `packages/db/src/payments.ts:createPaymentIntent` | Сохранить UNIQUE(account_id,idempotency_key), INSERT ON CONFLICT и account lock. Здесь есть атомарная точка фиксации email аккаунта и фискальных параметров. |
| `packages/db/migrations/022_credit_packages.sql:credit_intent_immutable` | Расширить имеющуюся защиту immutable offer одним receipt snapshot; не создавать второй ledger. |
| `packages/shared/src/tariff.ts:CREDIT_SKUS`, `PAID_*`, `loadPaymentsConfig` | Каталог, целые копейки и config parser — основные источники. Вынести текущую сборку описания в небольшой именованный helper здесь же. |
| `apps/web/src/server/payments/provider.ts` | Добавить optional receipt в существующий CreatePaymentInput; fake и старые TEST callers сохраняют совместимость. |
| `apps/web/src/server/payments/yookassa.ts:formatMinor/createPayment` | Расширить текущий JSON POST; точные RUB строки уже реализованы. HTTP timeout, лимит ответа и секретная Basic auth сохраняются. |
| `apps/web/src/server/retention.ts:eraseAccount` | Уже удаляет payment_intent перед обезличиванием account. Новый snapshot с email исчезнет этим же путём. |
| `tests/billing.unit.test.ts`, `billing.integration.test.ts`, `fixtures/payment-test-transport.mjs` | Переиспользовать реальные handler/deps/PostgreSQL и provider HTTP seam; не проверять SQL через mocks. |

## Проекты 1–8

Корень установлен по `docs/reuse/blogger-cabinet-projects-1-8.md`: `/home/2026-AUG-PU-Projects/projects/`.
Поиск `vat_code`, `payment_subject`, `payment_mode` и receipt-объектов в доступных продуктовых исходниках не нашёл готового блока фискализации. Это ограниченный поиск, не заявление об аудите каждого файла.

| Проект / просмотренная поверхность | Применимость |
|---|---|
| 01 `testimonials-senja/packages/agent-payments/src/provider-yookassa.ts` | Другой agent payment flow; готового receipt нет. `N3Receipt` в referral-коде — атрибуция регистрации, не фискальный чек. |
| 02 `review-qr-reputation/apps/web/src/payment.ts`, DB payment migrations | Готового receipt нет; свой billing тракт уже есть в Clipmkr. |
| 03 `affiliate-rewardful/shared/payments/yookassa.mjs` | Исходный донор текущей проверки ЮKassa; receipt не обнаружен. |
| 04 `calorie-vision-cal-ai/apps/api/src/payments/yookassa.ts` | Промежуточный донор provider; готового receipt нет. |
| 05 `podcast-clips-opus/apps/web/src/server/payments/yookassa.ts` | Историческая копия этого продукта; native Clipmkr новее и сохраняет кредиты/TEST policy. |
| 06 `rag-sales-chatbase/apps/web/src/server/payments/yookassa.ts` | Прямой донор текущего provider, intent и deps; перенос уже выполнен исторической фичей payments. |
| 07 `cold-email-warmup` | В checkout доступен только README; доступных продуктовых исходников для переноса нет. |
| 08 `interior-ai-redesign/packages/adapters/src/yookassa.ts` | Иной адаптер без готового fiscal receipt; перенести лучше текущий native контракт. |

## Внешние зависимости и итог

Новый SDK не нужен: текущий адаптер уже реализует REST `/v3/payments`, auth, timeout, точные суммы и idempotency. Добавление SDK увеличило бы поверхность интеграции без недостающего алгоритма. Новый код ограничивается валидацией конфигурации, сериализацией одной позиции и сохранением snapshot; причина самостоятельной реализации — «нет в клоне».

Основание persistence — реальный существующий путь: intent коммитится, затем HTTP может завершиться timeout до сохранения provider ID; повтор берёт тот же intent. ЮKassa описывает повтор как те же данные с тем же ключом. Изменение VAT между процессами поэтому не должно пересобирать receipt. Обычного пользовательского изменения account.email в просмотренных auth/support путях нет; обезличивание удаляет intents. Для email snapshot нужен прежде всего единый источник отправленного запроса и защита при операторской коррекции, а не придуманная новая UI-фича.
