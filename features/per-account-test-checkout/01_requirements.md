# Требования к тестовому checkout одного аккаунта

Статус: пользовательская граница разрешена прямой командой владельца; технический проект
ожидает независимый QCSD/K1/K2. Источник — `owner-authority.md`, AGENTS и core-cjm §2.
Реальные идентификаторы и credentials остаются private; в тестах только synthetic accounts.

## Требования
- **FR-1 MUST.** При глобальном `N5_CHECKOUT_ENABLED=false` только согласованный server UUID
  может купить существующий пакет через прежний TEST flow. Account берётся исключительно из auth session.
- **FR-2 MUST.** Другие аккаунты и anonymous не получают новую возможность: SSR-кнопки закрыты,
  POST отвергается до чтения body, создания intent и обращения create/getPayment провайдера.
  Body/query/header с чужим UUID/email/ролью не меняет разрешение.
- **FR-3 MUST.** Исключение возможно только с готовым ЮKassa driver (`payments.mode='live'` в
  текущем enum), `testMode=true`, test-key и `billingMode='credits_v1'`. Это имя driver,
  не разрешение LIVE списаний. При `testMode=false` исключение никогда не действует.
- **FR-4 MUST.** Одна typed policy используется сервером SSR и POST; private allowlist не
  передаётся клиенту, включая настоящий HTML, inline RSC и отдельный Flight при Next Link навигации.
  Браузер получает прежние salesEnabled/testMode и при необходимости opaque account-remount key;
  синтетический UUID исключения/credentials отсутствует в ответах и журнале.
  Активность session/account и credits_v1 policy проверяются действующими серверными readers.
- **FR-5 MUST.** Optional singular `N5_TEST_CHECKOUT_ACCOUNT_ID`: undefined/пустая строка означает
  отсутствие исключения; непустое значение — ровно один canonical lowercase UUID без пробелов.
  Невалидное значение/список/whitespace — preflight fail. Nonempty exception требует global false,
  credits_v1, live driver+testMode true+key prefix `test_`; другое сочетание отказывает startup.
- **FR-6 MUST.** Intent ownership/idempotency, provider verification/payment.test и status/webhook
  сохраняются. Отзыв exception закрывает новые покупки; не блокирует обработку уже созданного
  TEST intent действующим webhook при сохранённом TEST provider. Billing/roles/balance не мигрируют.
  Контролируемо перекрытые повторы дают один intent и одну provider payment; HTTP вызовов может
  быть несколько. Requery payment.test=false после отзыва отвергается без новых event/payment/grant,
  затем корректный TEST принимается один раз; повтор не добавляет grant.
- **FR-7 MUST.** Используется текущий каталог/кнопки/TEST-индикаторы, без нового UI и настроек.
  Предоставление доступа само по себе не выдаёт кредиты/owner/blogger или оплаченные права.
  Частная overlay применяется только root после проверенного кода; Cloud.ru/DNS/live charges вне scope.

## Проверяемые границы
Положительный и отрицательный контроль: синтетические A=`00000000-0000-4000-8000-000000000001`
и B=`00000000-0000-4000-8000-000000000002`; каждый через собственную настоящую session.
Должен быть тест реальной loadWebConfig → runtime policy → HTTP handler → PostgreSQL цепочки;
provider network в automated suite — существующий local YooKassa fixture, не реальный магазин.
Для denied B/body spoof: delta payment_intent=0 и provider call count=0; для allowed A — свой intent.
SSR тесты предоставляют валидные purchaseWindows, чтобы иной disabled guard не маскировал policy.

## Source of truth
OpenSpec хранит user-facing дельту; feature-adr содержит её тестируемую детализацию и execution.
Дельта: `openspec/changes/per-account-test-checkout/specs/checkout-access/spec.md`.
Точный SHA-256 записан ниже и в `requirements-revision.json`; изменение смысла синхронизирует hash.
| FR | OpenSpec requirement / scenario |
|---|---|
| FR-1, FR-3, FR-7 | Исключение тестовой покупки / Разрешённая сессия и тестовый магазин |
| FR-2 | Исключение тестовой покупки / Остальные аккаунты и подмена тела |
| FR-4, FR-5 | Fail-closed конфигурация и общая политика UI/API / Непригодная либо отсутствующая настройка |
| FR-6 | Fail-closed конфигурация и общая политика UI/API / Отзыв исключения и сохранение платёжного контракта; Повторный checkout и несовпадение режима уведомления |
| FR-4, FR-7 | Fail-closed конфигурация и общая политика UI/API / Приватность реального HTML и RSC/Flight |

SHA-256 дельты: `1c8457610d97f282cea1d55f1f641f983c0798ee813a1cd7483f78926a3c5b6e`.
