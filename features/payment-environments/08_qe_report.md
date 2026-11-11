# QE: происхождение платежей и боевые отчёты

11.11.2026. Уровень M/12; feature-adr Steps0/1/3/3.5/5/6/7/8. Автор кода — `gpt-6.1-sol high`. Три независимые source-роли — `gpt-6-astra xhigh`, каждая в новой сессии без истории кодирования: `qe-primary`, `qe-security`, `qe-testing`. Сначала им передавались нормативы/ADR/архитектура/план, затем они самостоятельно изучали код. Применено согласованное владельцем исключение cross-model, family `owner-exception`; недоступный Anthropic не объявлялся участником.

## Реальный итог и граница поставки

Установленный проектный `dz qe-rounds --source native --action evaluate` вернул **exit0, closed**, revision `49f281fadebe2ef7294b83761688d96a90090e4636622f82a17e0de70570b26d`, unresolved/reasons `[]`, **2 из 3** циклов, sequence4. Native history и исходные условия сохранены. Это независимая проверка исходников и тестов; на момент закрытия рабочий сайт, БД, историческая классификация и настоящий магазин этой доработкой ещё не изменялись.

Исходная ревизия реализации `b36cff8d1df3da29a31021a55c07d5ff5fe286005f58b8dc51f329beb87644b2` получила no-go/conditional. За один общий repair исправлены пять условий: PRIMARY-01 — обычный bind классифицировал terminal unknown history; PRIMARY-02/TEST-01 — старый cutover-тест повторял уже применённую030; PRIMARY-03 — полный payment ID попадал в общий log; TEST-02 — счётчик созданных платежей не доказывал отсутствие POST. Каждый originating reviewer независимо проверил собственные условия на конечном снимке. Роль security первоначально и повторно не выявила дополнительных блокирующих рисков.

## Требования, риски и наблюдения

| Требование / риск | Метод и фактический результат | Ограничение |
|---|---|---|
| FR-1/3: server identity и canonical proof | PG + loopback HTTP → реальный adapter/handler; LIVE/TEST, неверный merchant/order, закрытое клиентское тело; обязательные identity guards проверены кодом и тестами | Synthetic LIVE — `raw.test=false` у fixture, а не настоящие деньги |
| FR-2/Q-01: обе роли и разные периоды | Native Next API/DOM/reload, отдельные owner/blogger/foreign contexts, Chromium/WebKit: owner548000/2/1,20%=109600; blogger647000/3, коды498000/2 и149000/1; PG отдельно30%=164400 и null без ставки | Реальная партнёрская покупка владельцем этим не выполнена |
| FR-3/RISK-002: locks и claim rollback | Реальные PG held-lock/наблюдаемое ожидание, освобождение и успешный повтор; конфликт не отравляет event key | Изолированные QA-схемы, не production chaos |
| FR-4/PRIMARY-01: pending отдельно от terminal history | Checkout retry сохраняет unknown у ранее refunded payment; только явный GET+CAS backfill классифицирует историю, без изменения amount/status/grants | Историческая рабочая БД пока не backfilled |
| FR-4/RISK-001: cutover | Отдельная настоящая pre030 schema, старые native create/bind/callback с положительным контролем; обычный COMMIT, stop/drain/zero sessions, реально добавленная030 и новый pending ровно один раз | Это rehearsal; actual VPS writer inventory/drain выполняются отдельно перед поставкой |
| FR-5: GET-only operator | Методический HTTP ledger до auth/routes; idempotent POST и POST404 обнаруживаются отрицательными контролями; function/operator phases без POST, compiled child — GET; dry-run/CAS/concurrent LIVE | API реального магазина, секреты и реальные платежи не использовались |
| FR-6/RISK-003: сохранение прав и refund/erasure | Linked/erased known/unknown, обе очередности refund/success, tombstone/rebound, без новых grants/восстановления удалённого account; financial review facts сохранены | Реальный возврат не выполнялся |
| Observability | Общий webhook log обезличен, отрицательные assertions и fixed handler SHA сохранены | Публичные отчёты не содержат рабочих IDs/ключей/PII |

## Команды и результаты

Node22, существующие PostgreSQL/Redis, отдельные QA DB/schema/namespace; новых контейнеров/MinIO/зависимостей не добавляли.

- Автор: исходные адресные12 suites195/195; после общего repair8 suites132/132 и native Next2/2; build/typecheck/lint exit0. Ранее выполнены browser regressions70/70 и7 адресных mutation canaries с настоящими red/green. Эти наблюдения относятся к указанным этапам; прежний результат не переименовывался в новый полный прогон.
- Независимый testing R1:46/46 critical, native2/2; выявленные пробелы при этом оставались открыты. R2:7 выбранных PG/pin-проверок и native2/2 прошли;4 явно невыбранных теста не считались прохождением. Конечные42 хеша manifest совпали у всех трёх ролей.
- Единственный общий `npm test` занял959,33с:1670 passed,20 failed,16 skipped. **Он не зелёный и не является чистым снимком конечного кода:** запуск начался до небольшого исправления static-log/его assertion. Этот случай затем проверен свежими адресными процессами. Остальные19 failures независимый reviewer воспроизвёл на точном архиве baseline `5c5130d` в7 suites; это подтверждённый прежний долг, а не оправдание отсутствием изменённых test-файлов.
- S3-проверки общего набора пропущены из-за отсутствующего S3_ENDPOINT в принадлежащем этой задаче QA-профиле. S3 не используется новыми платёжными путями; проверки настоящего хранилища и нарезки этим результатом не заменяются. MinIO не запускался.
- Полный старый payments mutation runner не объявлялся пройденным: `retention-from-finish` не имеет anchor также в baseline. Для выбранных4 payment и3 credit canaries сохранены реальные red/green; no-match не считался killed.

Частные команды, логи, manifests, собственные R1/R2-отчёты и native history сохранены вне Git в закрытом рабочем каталоге. Авторские назначения файлов и ограничения: [07_code_changes](07_code_changes/author-summary.md).

## Code/spec anti-drift и дальнейшие действия

Сверены FR-1…6, ADR-001, TASK-1…7 и AM-1…8 с реализацией. Отчёты используют один LIVE predicate, сохраняя прежние периоды/атрибуцию/ставки. Миграция и backfill не меняют финансовые суммы/статусы/кредиты; известная identity неизменяема. Автоплатежей, новых UI/маршрутов и автоматических выплат нет. Step9 fleet для M не объявляется выполненным.

До runtime-приёмки остаются: резервная копия; actual writer inventory/stop/drain/zero;030 и только совместимый backend; проверка версии/связок/сохранности; GET+CAS классификация доказанной истории; post-binding backup. Отдельно владелец подтверждает боевую покупку и чек по [плану](../../docs/payments/2026-11-11-live-purchase-acceptance.md). Наличие боевого режима само по себе не закрывает merchant webhook/начисление/оплаченную нарезку. Напоминания3/1 реализуются следующей отдельной фичей.
