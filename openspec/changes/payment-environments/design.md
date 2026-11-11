## Context
Native intent/payment и два отчёта; исполнение/gates в feature-adr.

## Goals / Non-Goals
Доказанный LIVE и exactly-once; без новых UI/API filters, выплат и reminders.

## Decisions
ADR-001/05: server/remote identity, unknown default, immutable known, pending remote-proof promotion, terminal GET+CAS. Общий verifiedLivePaymentSql сохраняет разные периоды owner/blogger и nonadditive payer oracle Q-01. RISK-002: payment advisory→account→intent→payment/CAS, reread; rollback также event claim. RISK-003: refund proof matrix; erased existing payment проверяется по provider ID/amount/known identity без восстановления order, unknown не повышается.

## Risks / Trade-offs
Unknown исключён до proof. Недостаточное refund proof→retryable/reconcile без writes. PG held-lock/cutover/race и оба render oracles обязательны; fixture не доказывает магазин.

## Migration Plan
RISK-001/05: inventory всех writers→закрыть NEW sales→остановить old web/payment writers→drain/zero их PG sessions→030→только новый artifact. Остальные шесть сервисов сохраняются после inventory. Mixed writers запрещены. После новых денег DB rollback/старый writer запрещены; при сбое совместимый backend+закрытые NEW sales либо freeze/503. Unknown terminal reconciliation без угадывания. Private backfill по общему lock order.

## Open Questions
QCSD/K1/K2 ещё не выполнены.
