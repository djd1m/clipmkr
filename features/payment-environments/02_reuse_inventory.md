# Reuse inventory

Baseline `5c5130d`; точные исходные SHA в `requirements-revision.json`. Чтение кода — evidence структуры, не свидетельство runtime correctness.

| Native блок | Решение |
|---|---|
| `packages/db/src/payments.ts` (201 строк), `credits.ts` (154) | Сохранить транзакцию, advisory lock, account→intent, fulfillment/erasure/expiration; credits не менять ради reports. Новый provenance helper не раздувает payments god-object. |
| `apps/web/src/server/payments/{provider,yookassa,fake}.ts` | Расширить typed contract; сохранить канонический normalizer, GET/origin/requery/amount guards, fake честно test. Новый клиент не нужен. |
| `apps/web/src/server/{billing-handler,billing-deps}.ts` | Существующий authentication/body/23h/receipt/GET/bind pipeline; server identity из provider, без env duplication. |
| `packages/db/src/blogger-report.ts`, `apps/web/src/server/partner.ts` | Native отчёты owner/blogger; общий LIVE predicate, старые нефинансовые агрегаты сохраняются. |
| migrations `021/022/027/029` | Сохранить immutable offer/receipt, referral snapshot, refund constraints; добавить только030. |
| `tests/fixtures/fake-yookassa-server.ts`, `tests/fixtures/environment.ts` | Canonical HTTP transport и изолированный PG/Redis. FakePaymentProvider tests не подменяют LIVE-provider integration. |
| billing/credit/report/partner/receipt suites и browser blogger/billing | Расширить existing fixtures/positive expectations; реальный Next harness для render consumers. |
| `docs/reuse/blogger-cabinet-projects-1-8.md` | Уже перенесены нужные N3/N4/N6 patterns; повторный донор/OSS/runtime не нужен для двух полей и SQL predicate. |

`apps/web/src/server/retention.ts`: erasure держит account до очистки payment links/intent; новый proof/lock контракт сохраняет эту сериализацию, дополнительных PII полей нет.

## Ожидаемые targets и router
M12 подтверждён: files 11–30=3; существующие billing+partner contexts=2; новых интеграций0=1; external breaking0=1; provenance двух существующих моделей=2; financial integrity/validation=3. Нет dimension4. Аддитивная migration рассмотрена отдельно: данные/сервисы/права не пересоздаются, потому не повод скрыто расширять домен. Если итоговый source/test diff >30, новые contexts или breaking появляются — повторный routing, а не формальная защита M.

Source: shared typed identity+export; db provenance helper+export/payments/030/blogger-report; provider/yookassa/fake; billing-handler/deps; partner; operator backfill entrypoint. Tests: payment-environments integration (новый), billing unit/integration, credit-packages integration, payments-guards, relocation-test-webhook, receipts integration/unit, blogger-report, partner integration, HTTP fixture и browser regression при необходимости. Оценка 24–29 source/test файлов; точный allowlist утверждается только в06 после QCSD. UI markup не меняется. Current shared/db package exports и operator tooling изучить перед добавлением нового файла, не создавать параллельный стек.
