# Проверки подключения боевого магазина

QE-VERDICT:B

**Конфигурация подключена; настоящий платёж владельцем ещё не принят.** B — оценка координатора для ограниченной конфигурационной поставки. Это не оценка полного billing E2E или нового исходного кода. Приложение использует прежний принятый source `012efb6a2465f156326b2f5756da9171aa2f635e`, image `sha256:cf5139ec1f8b14a29b29fed76eafb2e4544b46364332b9abc857a7c9d12231b1`.

## Findings Ledger

| Finding | Severity | Status | Round | Author | Title |
|---|---|---|---|---|---|
| H1 | HIGH | fixed | 1 | lead | Полнота TEST drain: старый producer остановлен, все его PG-сессии исчезли до запуска замены, новый inventory и terminal/history postcheck |
| H2 | HIGH | fixed | 1 | lead | Аварийный close-sales принимается только после проверки source/image/config/mounts/health/nonweb; неизвестный исход не называется безопасным |
| H3 | HIGH | fixed | 1 | lead | Весь Compose структурно равен прежнему кроме разрешённых web env; остальные поля и mounts сохранены |

Подробности и история независимой проверки: [08_independent_review.md](08_independent_review.md). Проверяющий — fresh session с запрошенными `gpt-6-astra/xhigh/fork none`; backend-attestation не заявляется. Private operator написан координатором; исходный application source не менялся. Первоначально HOLD/3HIGH, после адресных исправлений исходный проверяющий подтвердил их закрытие и GO к исполнению при реальных runtime gates. Первый H1 repair не полностью закрывал создание новых PG-сессий; второй закрыл весь старый producer. История не удалялась.

Финальные проверенные SHA256 операторов: freeze/drain `89f2626f168d60b95b6ce967a90776d3838caf4c09c20ff532020cd39843ca43`; live apply `e8f2925a80b3beb312e6382b88984bf27cc61feadb2078df39ce05afcbd91933`. Их файлы, Compose и ключи остаются закрытыми вне Git. Py_compile выполнен; авторский smoke и независимое статическое review не смешиваются в один вымышленный счётчик тестов.

## Требование → проверка → результат

| Требование | Реальный контроль | Результат и предел |
|---|---|---|
| FR-1/NFR-1 | GET live /v3/me, проверка ИНН/профиля, loadWebConfig из работающего image на desired env, actual env после перезапуска | Enabled, test=false, fiscalization yoo_receipt; VAT1/service/full_payment; нет TEST exception. Это не регистрация настоящего чека |
| FR-2 | Terminal GET всех TEST объектов, freeze producer, authoritative PG inventory и post-drain |5 intent:2succeeded/3canceled; прежние payment rows сохранены. Один ранее пропущенный TEST success применён existing canonical handler с повторным providerGET; replay явно операторский, не natural merchant delivery |
| FR-3 | Прямой ответ владельца11.11 о настройках именно боевого магазина | Canonical HTTPS URL и оба события подтверждены владельцем; API конфигурация магазина этим не прочитана |
| NFR-2 | Успешный backup до операции с двумя verified offsite копиями, общий lock, сравнение Compose/env/mounts/nonweb/source | Pre-backup завершён07:42:45UTC. Заменён только web environment; source/image,6nonwebIDs/images и mounts сохранены |
| NFR-3 | Независимое чтение аварийной ветви и неизменного approved image | На ошибке сохраняется LIVE provider, закрываются новые продажи; старую TEST-конфигурацию после возможного live intent не возвращаем. Реальный rollback не потребовался |
| FR-4 | Настоящий Chromium, existing synthetic credits account, GET /upgrade, без checkoutPOST |200; TEST notice отсутствует; три кнопки покупки включены, разовые условия видны, JSerrors0. Поддельный public webhook400. CheckoutPOST0, настоящих списаний агентом0 |
| NFR-2 после поставки | Штатный backup после нового binding | Success, завершён07:56:31UTC, startedAt после активации |

K1: NA, новых product commands/modules/exports нет. K2 фактически выполнен: первые два вызова отказали из-за отсутствующих task-level FR/NFR ссылок, после реальной правки плана PASS0/0warnings/3явныхSskips. Router/requirements/plan checkpoints записаны поддерживаемой CLI после реальных артефактов. Эти квитанции не доказывают runtime операции; её отдельные pending/result receipts и фактические проверки сохранены закрыто.

## Ограничения

Исторические TEST-платежи не являются реальными деньгами. Действующий партнёрский агрегат не разделяет merchant/test; точные два TEST provider IDs сохранены для исключения из ручных выплат. До постоянного source-разделения его нельзя представлять как чистую боевую выручку или расчёт задолженности. Автоматических выплат блогерам нет. Строки истории, attribution и grants ради косметического обнуления не удалялись, refund/review_reason не подделывались.

Новая настоящая покупка, естественная доставка merchant webhook, начисление за неё и статус регистрации реального receipt — **NOT RUN**, ожидают действия владельца. Успешный GET/кнопка/операторский TEST replay этого не доказывают. Публичная оферта пока прежняя: расхождение recurring-терминов и разовых пакетов зафиксировано отдельно и изменяется в согласованной feature optional-autorenew.

Application code/schema и public legal text этим блоком не менялись. Поэтому новые application tests, полный build и media/model/S3/browser E2E продукта не повторялись; native source QE ранее принятой версии не приписывается новой настройке. Настоящий локальный browser smoke и действительные backup/API/PG checks перечислены выше. Активное recurring ещё не реализовано и не включено.

## Учёт этапа

Stageqe до записи отсутствовал. Writer действительно записал строку; после этого разбор npm-prefixed stdout ошибся, повторной записи не делали. Фактический ответ: `{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/home/clipmkr/.dz/feature-adr/run-cost-ledger.jsonl"}`. Tokens/minutes неизвестны, не нулевые; auto не использовался. Cross-family оператора не аттестуется, независимость сессии reviewer подтверждена dispatch.
