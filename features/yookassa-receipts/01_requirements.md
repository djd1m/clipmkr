# Чеки ЮKassa: требования

## Источник, статус и границы согласования

10.11.2026 владелец поручил добавить недостающую передачу данных чека при покупке пакета. Сложность M; база `e955e3f2e67e5663eec24dadeb828cacd18e9a9f`. Авторизация охватывает generic backend, проверки и последующую поставку в прежнем TEST-режиме по общим gates; не означает выполненные K1/K2 или разрешение реальных списаний.

На вопрос о НДС владелец ответил «пока жду ответа». Ставка, предмет и способ расчёта для реального магазина не подтверждены. Разработка и синтетические TEST fixtures продолжаются; боевое включение остаётся заблокировано до подтверждения налоговых параметров и настроек магазина. Сообщённое координатором read-only наблюдение merchant: enabled, test=false, fiscalization_enabled=true, provider=yoo_receipt. Архитектор не читал ключи или приватный ответ API. Проверка webhook-настроек владельцем ещё не завершена.

OpenSpec — ledger пользовательской дельты `openspec/changes/yookassa-receipts/specs/payment-receipts/spec.md`, ведёт координатор. Точные SHA-256 нормативных proposal/spec/design закреплены в [requirements-revision.json](requirements-revision.json); execution tracker tasks не входит в нормативный pin. Checkpoint approval фиксируется отдельно от наличия документов.

## Функциональные требования

| ID | Проверяемое требование |
|---|---|
| FR-1 | При настроенных чеках текущий POST `/v3/payments` содержит receipt.customer.email и ровно одну receipt.items-позицию; отдельного фискального сервиса нет. |
| FR-2 | Email берётся из строки активного account, соответствующего серверной сессии, в транзакции создания intent. Request body не принимает email/receipt/цену/название/налоговые поля; лишнее поле даёт прежний 422 до intent. |
| FR-3 | Название позиции берётся из серверного CREDIT_SKUS или legacy PAID_* и фиксируется в intent; количество `"1.000"`, валюта `RUB`. Amount позиции и платежа сериализуются одним formatMinor(intent.price_minor), всегда совпадают; float arithmetic не применяется. |
| FR-4 | `vat_code` задаётся явно числом из официального набора 1..12 без значения по умолчанию. `payment_subject` задаётся явно из поддержанного поднабора service/intellectual_activity; `payment_mode` — явно full_payment. Система не выбирает налоговую классификацию продавца. |
| FR-5 | До первого provider POST атомарно сохраняется receipt snapshot: email, описание, vatCode, paymentSubject, paymentMode. Повтор того же account/key/sku/price возвращает канонический snapshot; изменение email или конфигурации не меняет запрос. Изменение sku/price по прежнему конфликтует. |
| FR-6 | Unbound POST допускается только при достоверном возрасте intent 0 <= age < 23h; age >=23h, отсутствующее/некорректное время или created_at из будущего дают 409 reconciliation до HTTP. Если provider_payment_id уже сохранён, повтор использует прежний GET без ограничения возраста, независимо от текущих настроек receipt; второго POST нет. Старому unbound intent без snapshot нельзя задним числом добавлять receipt: при настроенных чеках — 409 без POST, нужен разбор/новое намерение после проверки отсутствия оплаты. |
| FR-7 | TEST без всех новых переменных сохраняет прежний checkout без receipt. Полный явный набор включает receipt в TEST. Неполный или непригодный набор блокирует новый checkout без provider POST, но отсутствие параметров не ломает startup/health/webhook/status. В реальном provider mode отсутствие receipt всегда отвергается до HTTP. |
| FR-8 | Поддержаны все текущие предложения: start_v1, pro_v1, addon_v1 и legacy_pro990_v1 при прежней billing-policy авторизации. Addon остаётся одной покупкой пакета, quantity=1; кредиты не выдаются за число товарных позиций. |
| FR-9 | Успех оплаты, выдача credits/legacy plan, referral snapshot, уведомления и refund.succeeded сохраняют существующий контракт и защиту от повторного применения. Receipt не становится основанием начисления. |

## Нефункциональные требования

| ID | Проверяемое требование |
|---|---|
| NFR-1 | Ни email, ни snapshot/receipt, ни auth header/ключи, ни сырой provider response не попадают в logs/HTTP errors; ошибки проверки содержат статический код/название поля. Intent/status API не выдаёт snapshot. |
| NFR-2 | Существующие rate-limit, Origin, session, paused checkout и единственное TEST-account exception выполняются до платёжных побочных действий; новый SQL остаётся до сетевого вызова. |
| NFR-3 | Расширение additive: один nullable JSONB в payment_intent и существующий immutable trigger; без backfill старых receipt, новых таблиц, зависимостей и сервисов. Стирание аккаунта удаляет snapshot вместе с intent. |
| NFR-4 | Проверки используют реальные handler/deps, фактический JSON адаптера и PostgreSQL для persistence/concurrency; старые callers без receipt совместимы. Доказательство регистрации чека у ЮKassa не подменяется локальным зелёным тестом. |

## Acceptance и трассировка рисков

Имена ниже — предлагаемые исполнимые Vitest tests, не заявления об уже выполненных проверках.

| Требования | Риск | Файл и точное имя проверки |
|---|---|---|
| FR-1, FR-3, FR-4 | Провайдер отвергает чек / сумма расходится | `tests/yookassa-receipts.unit.test.ts`: `receipt payload uses one exact RUB item for every offer` |
| FR-2; NFR-2 | Подмена адресата/цены | Там же: `checkout rejects client receipt and PII before intent creation`; integration: `receipt email belongs to authenticated account` |
| FR-4, FR-7 | Неявные налоги / сломанный TEST | Unit: `receipt config requires explicit supported fiscal values`; `missing receipt config preserves TEST startup and notifications`; `live provider refuses missing receipt before HTTP` |
| FR-5; NFR-3, NFR-4 | Timeout + drift / гонка двух checkout | `tests/yookassa-receipts.integration.test.ts`: `retry reuses receipt snapshot after email and VAT change`; `concurrent retries commit one canonical receipt snapshot`; `receipt snapshot is immutable and erased with its account` |
| FR-6 | Повторный платёж / дооснащение legacy | Integration: `bound intent retry uses GET without a new receipt`; `unbound legacy intent is not retrofitted with receipt` |
| FR-8, FR-9 | Ошибка addon/legacy, начисления или referrals | Integration: `receipt checkout preserves package grant and referral idempotency`; существующие billing/credit-packages/blogger-referrals suites |
| NFR-1 | PII через ошибку провайдера/DB/status | Unit: `receipt failures never expose buyer email or provider secrets`; integration: `checkout status excludes receipt snapshot` |

Given активный покупатель и синтетическая полная конфигурация, When provider принимает POST, но ответ теряется до setIntentPayment, Then повтор после смены email/VAT использует тот же intent, ключ и исходный receipt. Если provider ID уже записан, выполняется только GET.

## Измеримое доказательство для QCSD

Ниже обязательные оракулы будущих проверок, а не результаты исполнения. Подробный порядок — раздел «Дискриминирующие сценарии» архитектуры.

| Условие | Требование и обязательный контроль |
|---|---|
| QC-1 / QT-4 | FR-6: отдельные unbound fixtures с сохранённым created_at и deps.clock, без sleep: 23h−1ms даёт реально принятый POST, ровно 23h/+1ms, отдельно 24h и позже — 409 и 0 POST; invalid/missing/future time — отказ; bound после суток — реальный GET без POST. Проверка выполняется после async работы intent и перед HTTP; допущение о часах/доставке остаётся явным. |
| QT-1 | FR-1/2/3/5: PostgreSQL + настоящие handler/deps/YooKassa adapter + локальный HTTP socket. Принять и сохранить первый запрос, оборвать ответ; заново собрать wiring/provider без старых объектов, изменить email/VAT, повторить ключ до cutoff. Проверить один intent, одинаковые JSON/header; новый ключ — новые данные; bound — GET. |
| QT-2 | FR-5; NFR-3/4: контролируемый PostgreSQL barrier и наблюдаемое ожидание lock доказывают реальное перекрытие двух кандидатов snapshot. CHECK/trigger проверяются позитивными и отрицательными controls, включая SQL UNKNOWN; erase проверяется после доказанного наличия snapshot и перевода аккаунта в erasing. |
| QT-3 | FR-2/7; NFR-1/2/4: матрица отсутствующего/полного/частичного/непригодного config проходит readEnvironment и fresh wiring; позитивные TEST POST с receipt/без него, отказные POST, доступные health/status/webhook. Уникальные синтетические email/secret в provider/DB/validation ошибках не появляются в HTTP/logs; каждый failure path и инъекция подтверждены счётчиком/наблюдаемым ответом. Подмена body тестируется валидной сессией и соседним успешным control. |

## Исключения и предел доказательства

Вне блока: UI/форма, смена email, новый тариф, автоматические возвраты, отдельные closing receipts, применение runtime SQL/секретов и реальные покупки. `full_prepayment` явно не поддержан: он требует последующего чека зачёта предоплаты, которого приложение не создаёт. Это ограничение нельзя обходить выбором full_payment без подтверждения владельца/бухгалтера.

Приложение не инициирует refunds. Официально при полном refund ЮKassa берёт receipt исходного платежа, при частичном инициатор должен передать отдельный receipt. Текущий приём refund.succeeded этого действия не реализует и не доказывает. Статус регистрации чека оператор проверяет в кабинете ЮKassa; payload delivery не равен fiscal registration.

ЮKassa описывает 24-часовое окно idempotency для тех же данных и ключа. Наш консервативный cutoff — 23 часа от сохранённого created_at: последний час оставлен на суммарную погрешность часов, задержку процесса и доставки. Проверяется достоверный age непосредственно перед передачей POST адаптеру; если между проверкой и HTTP добавится await, обязательна повторная проверка после него. При age >=23h или недостоверном времени — 409, операторская сверка до нового ключа; bound GET разрешён. Это ограниченная защита: предполагается, что совокупное расхождение часов и задержка приёма меньше часового запаса; ни локальный тест, ни 5s abort не доказывают время удалённого приёма. При нарушении допущения отсутствие второго удалённого платежа не гарантируется; автоматической сверки без remote ID нет. Тест: `unbound intent enforces conservative 23 hour retry cutoff`.

## Официальные источники

Проверены 10.11.2026: [чеки при платежах](https://yookassa.ru/developers/payment-acceptance/receipts/54fz/yoomoney/payments), [создание платежа](https://yookassa.ru/developers/api#payments_create), [фискальные enum](https://yookassa.ru/developers/payment-acceptance/receipts/54fz/yoomoney/parameters-values), [идемпотентность](https://yookassa.ru/developers/using-api/interaction-format), [чеки возвратов](https://yookassa.ru/developers/payment-acceptance/receipts/54fz/yoomoney/refunds). API-страница динамическая: доступный reader показал навигацию, но не всю схему; тело контракта подтверждено официальной инструкцией для yoo_receipt, не сторонним tutorial. Не вводить tax_system_code, phone, timezone, marking или отраслевые реквизиты без отдельного применимого требования.
