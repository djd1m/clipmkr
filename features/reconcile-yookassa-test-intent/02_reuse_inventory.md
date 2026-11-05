# Инвентаризация переиспользования

Статус: исходники прочитаны 05.11.2026; это не Step 2/L и не QE реализации.
Clipmkr: база `c35b8686bf258c79b9de30e5cddbba2d78838b8d`.
Проекты 1–8: локальное дерево `/home/2026-AUG-PU-Projects/projects`, ограниченный поиск
актуальных TS/JS/payment/refund/reconciliation файлов; полного аудита проектов не было.

| Блок | Применение / причина отказа от переноса |
|---|---|
| Clipmkr `apps/web/src/server/payments/yookassa.ts` | Переиспользуем request, normalizePayment, getPayment; ID/RUB/shop/test/paid/order/captured_at, Basic Auth, timeout, redirect:error |
| Clipmkr `apps/web/src/server/payments/provider.ts` | Переиспользуем PaymentProviderUnavailable/PaymentVerificationError; не возвращаем успех при исключении |
| Clipmkr `packages/db/src/payments.ts` | Переиспользуем applyVerifiedPayment, claimEvent, payment advisory lock и account → intent locks; добавляем только typed expected guards |
| Clipmkr `packages/db/src/payments.ts:markIntentCanceled` | R2: переиспользуем существующий writer; optional typed guard выполняет binding/no-financial-rows checks и transition под той же транзакцией/authoritative locks |
| Clipmkr `packages/db/src/quota.ts:transaction` | R3: optional deadline/pre-COMMIT options в existing helper; same-client PG timeouts, неизвестный COMMIT отдельно; прежние callers сохраняются |
| Clipmkr `packages/db/src/credits.ts` | Переиспользуем fulfillCreditIntentTx, существующий source_key и расписание периодов; без прямого writer в CLI |
| Clipmkr `apps/web/src/server/billing-handler.ts` | Источник точного ключа payment_succeeded:<paymentId>; verifyNotification остаётся native ingress |
| Clipmkr `packages/db/src/ops-owner-unlimited.ts` | Переиспользуем форму закрытого CLI, parse/main/pool cleanup; бизнес-функцию не вызываем |
| №1 `scripts/reconcile-n3-payment.ts`, `apps/web/src/lib/n3-payment.ts` | Есть operator recovery после lost notification; используем принцип persisted binding + canonical transaction, не bridge/outbox/чужую цену |
| №2 `apps/web/src/payment.ts` | Verification до claim, исключение откатывает claim; уже перенесено в канон Clipmkr |
| №3 `shared/payments/service.mjs:externalEvent` | API вне транзакции и повторная проверка order в транзакции; не переносим отдельный tenant/referrals runtime |
| №4 `apps/api/src/payments/yookassa.ts` | Исходный донор существующего адаптера; второй экземпляр не нужен |
| №5 Clipmkr | Основная реализация; адаптация собственных блоков предпочтительнее доноров |
| №6 `apps/web/src/server/payments/yookassa.ts`, `packages/db/src/payments.ts` | Прямой донор Clipmkr; не переносим тарифные ранги и комиссии |
| №7 | Подходящий payment recovery в просмотренных TypeScript/JS путях не найден |
| №8 `packages/adapters/src/yookassa.ts` | Payment/refund GET есть; full guarded reconciliation не найден; новая копия адаптера не требуется |

## Выявленные недостающие проверки

RemotePayment сейчас теряет refunded_amount; payment GET не даёт доказательства отсутствия
pending refund. Нужен минимальный snapshot/list-refunds метод поверх того же request/normalizer,
а не второй HTTP client. Положительный parseRubAmount не подходит для `0.00` refund aggregate.
applyVerifiedPayment не проверяет intent.status=created и frozen owner/SKU/offer/grant. Это
операторские expected-state guards внутри существующей транзакции, не параллельный apply.
payment_event содержит hash; отдельные source/run таблицы для одной операции не обоснованы.
При собственном succeeded claim используем hash исходного durable API-proof в existing event;
native-first hash сохраняется, API-proof внешний, источник применения подтверждается отдельно.
У canceled финансового event нет: его external proof/outcome нельзя журналировать через
выдуманный payment_succeeded. Current markIntentCanceled делает лишь conditional UPDATE;
для operator пути нужно атомарное expected-state чтение/проверка, preserving existing caller.
Минимальный вариант — optional typed guard/overload в той же функции, не новый cancel writer.
R2 не вводит payment POST/cancel в ЮKassa: только сверяет уже terminal provider canceled.

## Проверенная официальная документация

05.11.2026 прочитаны [webhooks](https://yookassa.ru/developers/using-api/webhooks),
[процесс платежа](https://yookassa.ru/developers/payment-acceptance/getting-started/payment-process),
[возвраты](https://yookassa.ru/developers/payment-acceptance/after-the-payment/refunds) и
[OpenAPI YAML](https://yookassa.ru/developers/api/yookassa-openapi-specification.yaml).
Web reader не извлёк anchored API reference и не принял octet-stream YAML; официальный
YAML затем прочитан через HTTPS без записи файла, поля разобраны в памяти.

Подтверждено: HTTP 200 завершает доставку notification; иные ответы повторяются до 24 часов.
GET payments/{id} возвращает текущий payment. GET refunds фильтруется payment_id и поддерживает
pagination; возможны pending/succeeded/canceled. refunded_amount optional и описывает успешные
возвраты; refundable означает доступность операции через API. Succeeded — финальный статус
самого payment, поэтому его недостаточно для проверки refund. Native callback и API GET —
разные источники наблюдения. Наличие legacy HTTP 200 не даёт обещания автоматического retry.

## Качество и ограничения

code-impl применён к Node/PostgreSQL: reuse-before-new, typed errors, no-god-file,
реальный PostgreSQL для write-side тестов, проверки FINAL diff. Не переносим Python/k8s механики.
studio-extended-qe используется в reference-режиме: shift-left, requirements validation,
risk-based testing, contract/security и локальные fault/mutation сценарии; AQE не установлен.
Recall двух запросов вернул пустые массивы (см. 00); никакой successful teach не заявлен.
Не требуется новый OSS, daemon, retry framework, auth-сервис, schema migration или метрики
для редкой операторской операции. Дополнительные методы/exports ещё должны пройти K1.

R3: readCreditPurchaseWindows и возвращённый fulfillCreditIntentTx period переиспользуются
для preflight/locked expected-period check. Expired addon/неожиданный base schedule дают
rollback/эскалацию, не новый расчёт или компенсацию. Credits.ts менять не требуется.
Официальный lifecycle повторно проверен: canceled и succeeded — оба terminal/immutable.
Native claim-before-lock ограничивает доказательство cancellation: нужен off/drained admission
до S activation, описанный в 05; naked row lock не принимается за ingress serialization.
