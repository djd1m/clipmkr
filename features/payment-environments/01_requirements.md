# Требования: разделение платёжных сред

Статус: проект для QCSD; этот файл не утверждает прохождение gates. Основание: `owner-authority.md`, поручение 11.11.2026; baseline `5c5130d`. Участники: покупатель, блогер, владелец, оператор платежей. OpenSpec: `openspec/changes/payment-environments/{proposal.md,design.md,specs/payment-environments/spec.md}`. Точные SHA нормативных документов и reuse-исходников: `requirements-revision.json`; tasks не нормативный pin.

## Требования и приёмка

| ID | Обязательное поведение | Проверяемая приёмка |
|---|---|---|
| FR-1 | На intent/payment сохранять provider, environment (`unknown/test/live`), merchant. Новая intent получает identity только от сервера; payment — из canonical проверенного ответа провайдера. | Новый LIVE и TEST проходят create→GET→webhook; raw.test/recipient checks сохранены; extra identity в checkout body отвергнута. Fake никогда не LIVE. |
| FR-2 | В выручку, покупки, плательщиков и предварительную комиссию обеих ролей входят только согласованные LIVE payment+intent и все прежние verified-sale условия. | LIVE включён ровно один раз; TEST, unknown, несовпавший merchant/provider, refund/review исключены. Одна eligibility при одинаковой области; owner month/Moscow и blogger all-time имеют отдельные оракулы. Owner payer distinct по блогеру, не сумма по кодам; UI/API периоды прежние. |
| FR-3 | Known identity неизменяема. Retry/bind/fulfill сверяют provider/id/order/amount и известные environment/merchant; refund использует матрицу proof в05 (после erasure без утраченного order); конфликт не даёт новых credits, чужого redirect или отмены чужой intent. | Смена runtime shop/mode, response mismatch, rebound order, duplicate/concurrent callbacks не изменяют чужое состояние. Ошибочный event не занимает ключ правильного повтора. |
| FR-4 | Старые строки получают unknown без классификации по дате/config. Старую pending intent можно однократно привязать к проверенной remote identity в транзакции; историческую terminal — только доказанным backfill. | Pending старой версии завершается, в том числе callback-before-bind; unknown без proof исключён. Concurrent new LIVE не перезаписывается backfill. |
| FR-5 | Исторический backfill делает read-only GET точного магазина, проверяет id/test/merchant/order/amount против DB; CAS меняет только provenance, атомарно на связанной паре. | Dry-run без записей; conflict/недоступность/несовпадение без записей; повтор no-op. Проверены неизменность amount/status/credits/attribution, общий payment→account→intent lock order и отсутствие приватных данных в evidence. |
| FR-6 | Сохранять визиты, регистрации, активность, атрибуцию, ставки 20/30%, receipt/tariff snapshots, кредиты, refund-before-success и account erasure. | До/после совпадают нефинансовые counters и существующие grants; TEST-кредиты не отзываются. Повторы не начисляют дважды; refund исключает продажу. |

## Измеримые условия QCSD

Q-01: один payer, LIVE: октябрь код A=99000; ноябрь A=399000 и B=149000. Owner ноябрь: 2 payments, 548000 revenue, 1 distinct payer; коды A/B имеют по1 payer (сумма2 неверна для total). Blogger all-time: 3 purchases, 647000; A=2/498000, B=1/149000. При20% owner estimate=109600. Добавить TEST/unknown обоих месяцев/кодов: итоги прежние. Проверить отдельно API и оба render consumers по константному оракулу, не вычисленному helper. Новый period filter не нужен.

RISK-001: перед030 остановить все старые web/payment writers, осушить in-flight и подтвердить ноль их PG sessions; после known денег старый writer/DB rollback запрещён. Доказать cutover старого in-flight callback и fail-closed mixed-version попытку. RISK-002: webhook/refund/bind/backfill используют порядок и reread из05; real PG held-lock positive control обязан показать ожидание, затем завершение; conflict/deadlock откатывают также event claim. RISK-003: проверить каждую строку refund matrix (linked/erased, known/unknown, before-success), duplicate и rebound; недостаточное proof даёт retryable/reconcile без writes и grants. Пока NOT RUN.

## Риски и проверка

Приоритеты: неверная LIVE-классификация (negative cases+mutation), pending/race (PG+HTTP), порча истории (CAS), drift отчётов (Q-01 oracle).

Реальные PostgreSQL и HTTP fixture ЮKassa, затем существующий Next/browser harness с разными owner/blogger контекстами. QA изолирует БД/Redis namespace; существующие общие сервисы допустимы, новых контейнеров/MinIO не требуется. Fixture доказывает canonical integration, не E2E настоящего магазина. Реальная owner-проверка: `docs/payments/2026-11-11-live-purchase-acceptance.md`; оплата выполняется владельцем после поставки, не агентом. Runtime доказательства пока NOT RUN.

## Границы и зависимости

Нет нового UI/переключателя, финансового сервиса, выплат, подписки или автоматического списания. Reminders 3/1 — следующая отдельная фича. Миграция только `030`; `031` зарезервирована следующей задачей. Не менять production/DNS/Cloud.ru в этой архитектурной работе. K1/K2, independent QCSD/review и план выполняет оркестратор после готовности документов. Необходимых решений владельца по дизайну не осталось.

## Измеряемая привязка требований

Revision `payment-environments-design-20261111-2`; следующие точные SHA256 входят в измеряемый текст требований, а не только в отдельный JSON:

- `openspec/changes/payment-environments/proposal.md`: `f459ac8e3e4ac5b32ddf9f5f1c86abb38312843df00790b7e52f47e2a00fcc1b`.
- `openspec/changes/payment-environments/design.md`: `1c801a8f9f24dd38c90dbcfeadb129a4e43c810f79a0d8671eecb36b2070ea03`.
- `openspec/changes/payment-environments/specs/payment-environments/spec.md`: `b0fe1ff7c7a9ff38456cb01a169715c73667f286eb27947f52a5d70fa6780d63`.
- `openspec/changes/payment-environments/.openspec.yaml`: `b8f20def63a86ae4075c5499ff9ed413265d8704692a8493712424dc3f28d8e3`.

Reuse inventory SHA256: `a800f8be1289d96fdeec0815230fa488b70cc993579d11b828f92ca9384ea584`. Наличие привязки не является прохождением QCSD или разрешением кода.
