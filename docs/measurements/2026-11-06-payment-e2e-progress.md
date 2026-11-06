# Платёжный E2E: промежуточный фактический результат 6 ноября

## Уже проверено

1. Callback и уникальный upstream применены на clipmkr.ru; приложение осталось на11a90aec.
2. Строгий native baseline, включая route/identity/BOTH-store binding, прошёл после изменения.
3. Создана ровно одна временная сессия согласованного TEST-аккаунта.
4. Reviewed bridge действительно выполнил canonical revalidate в том же captured namespace,
   выдал ready и допустил один browser.open ticket. Исходные records не очищались.
5. Chrome получил HTTP201 для одного checkout; фактический request сохранён.

## Почему сценарий ещё не принят

Browser helper завершился1 до сохранения response body/intentId/confirmation URL.
Точная live exception скрыта старым generic diagnostic и не установлена. Собственный
локальный опыт с настоящим Chrome, HTTP и fsync воспроизвёл20/20:
`Network.getResponseBody: No resource with given identifier found` при чтении ответа
после немедленного перехода UI. Checkout/provider данные этого опыта синтетические;
он доказывает гонку harness, а не точную причину live exception и не оплату.

Read-only SQL по exact account+исходному browser idempotency key и GET существующего
provider object доказали ровно одно новое TEST pending намерение. Совпали id,
metadata/order, shop, account, SKU, RUB/amount и временное окно. Платежей/событий/
начислений в основной БД по-прежнему0. Это известное создание, но не завершённый отказ.

## Что сохранено

Failed callback честно передан как failed; bridge завершился STOP1. Старый helper не
получил ложный completed, его consumed-unknown/исходная история сохранены. Временная
сессия отозвана с positive ownership проверкой; очистка действительно прошла.
Нового checkout, другого idempotency key или подмены namespace не выполнялось.

Existing reconcile требует new_checkout, которого при потерянном callback response
нет; штатного recovery-перехода для этого случая не обнаружено. Original operator
request_key и фактический browser idempotency_key различаются, поэтому восстановление
должно сохранять их явную связь, не заменять один другим задним числом.

Следующий ограниченный блок — `recover-known-checkout-response`: требования/OpenSpec,
ADR/план, независимое QE и только затем recovery точной известной попытки. Не менять
финансовый ledger,24ч guards, historical debt, приложение или Cloud.ru. Code/spec
anti-drift: действующие бизнес-политики не ослаблены, E2E оплаты **НЕ ПРИНЯТ**.
