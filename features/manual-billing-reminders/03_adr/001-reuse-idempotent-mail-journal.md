# ADR-001: Использовать native mail journal для ручных напоминаний

## Status
proposed; обратимо до delivery flag; пересмотр при смене entitlement/provider contract.

## Context
FR-1..9: ручная покупка, несколько web processes, потеря HTTP-ответа. Native journal/SupportMailer/watchdog существуют.

## Decision Drivers
D1 высокий: dedup без финансовых side effects. D2 высокий: актуальные end/recipient. D3 средний: минимум компонентов.

## Considered Options
A: отдельная billing_notice по native pattern: durable identity/простое reuse; цена — SQL concurrency tests.
B: расширить retention_notice: меньше таблиц; цена — ломка video/clip schema и иной identity.

## Decision
A: additive billing_notice UNIQUE(account,end,offset),account FK CASCADE; billing-notices.ts использует transaction/account→credit advisory→notice lock, SupportMailer.sendRetention и watchdog. End=current contiguous union всех payment intervals/base/addon/legacy без clamp(now); existing grant/windows неизменны. Frozen payload/key после first attempt;max3attempts/<23h; HTTP вне SQL transaction;flag=false.

## Rationale
A сохраняет D1/D3 без новых runtime/deps. D2 требует all-paid end: base window/next_expiry не отражают продолжение оплаченных прав.

## Consequences
Durable dedup и unchanged finance. Цена: prolonged outage/clock anomaly пропускает письмо; refund-review подавляет аккаунт до сверки; accepted≠delivered. После committed dispatch нельзя атомарно отменить внешнюю отправку.23h предполагает24h provider dedup/корректные часы. Follow-up ADR сейчас не нужен; владелец+maintainer пересмотрят через месяц после приёмки.

## Confirmation
Method: isolated PG+HTTP,actual Next/auth/browser,independent QE. Monitoring: accepted/unknown-budget counts. Success:1provider message/event,0payment POST/tick,0stale overwrites. Owner: implementer+independent reviewer.
Load-bearing property: same event/key/bytes через crash/email change и revalidation до dispatch.
Required automated check: tests/billing-notices.integration.test.ts, tests/support-mail-resend.test.ts; existing Next browser harness расширяется; adapter false negative control. Точные команды в06 послеQCSD.
Shift-left: held-lock contender blocking; timeout→same key; provider down→bounded unknown; новый пакет доclaim→no send; stale A completion послеB fenced. High duplicate/stale/privacy risks имеют эти guards/tests; результаты пока не получены.
