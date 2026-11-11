# ADR-001: Использовать native journal для ручных напоминаний

## Status
proposed, r2; прежний проект не был accepted. Fresh QCSD может проверить нормативный контракт до final payment-environments source. Перед кодом — merge final accepted030 source и фактический recheck/pins; расхождение, влияющее на выводы QCSD, требует независимой проверки дельты. Обратимо до delivery flag; смена provider contract требует пересмотра.

## Context
FR-1..9: ручная покупка, повторы/потеря HTTP, несколько web processes. Оферта уже поставлена отдельной фичей; reminders следует за provenance030.

## Decision Drivers
D1 высокий: один logical event без финансовых side effects. D2 высокий: актуальные права/recipient/LIVE proof. D3 высокий: не задерживать watchdog пачкой HTTP. D4 средний: reuse.

## Considered Options
A: отдельная031 billing_notice по native pattern; плюс durable identity/reuse, минус SQL concurrency tests.
B: расширить retention_notice; плюс меньше таблиц, минус ломка video/clip schema и shared lifecycle.

## Decision
A: account FK CASCADE, UNIQUE(account,end,offset), SupportMailer.sendRetention, existing watchdog. All-paid continuous end сохраняет TEST/unknown grants; send требует verified LIVE identity в компоненте. Final claim account→credit advisory→notice, immutable bytes/key, max3 retries<23h, network вне SQL transaction. Relevant refund/review/неполный LIVE proof временно defer без HTTP/attempt/new key: сохраняется pending/failed/unknown и frozen payload/key/timestamps. После сверки тот же event допускается только при прежнем end/offset, текущем окне, полной eligibility и прежних max3/1h/<23h; terminal accepted/superseded не открываются. Изменённый tail/offset, истёкшее окно/исчерпание или недопустимый status/recipient остаются superseded, erasure — CASCADE. Письмо различает общий конец непрерывного периода доступа и индивидуальные сроки пакетов. Dispatch≤2concurrent/≤4tick после media,20s monotonic admission и short DB waits. Flag=false.

## Rationale
A сохраняет D1/D4 без нового runtime. D2 разделяет права и provenance, не просит купить до реального конца доступа. D3 ограничивает workload независимо от candidate batch;20s не является обещанием latency всего watchdog.

## Consequences
Outage/clock anomaly может пропустить письмо; accepted≠delivered. Relevant refund/review подавляет текущую неопределённость до сверки, не старую историю целиком; defer не продлевает окно или retry budget. После committed dispatch письмо не отозвать атомарно.23h опирается на24h provider dedup/часы. Follow-up ADR не нужен; владелец/maintainer пересмотрят через месяц после приёмки.

## Confirmation
Method: real PG+HTTP и native Next/auth/browser, independent QE. Monitoring: accepted/unknown/deferred/backlog. Success:1provider message/event,0payment POST/tick+CTA,≤2inflight/≤4attempts/tick; stale completions0. Owner: implementer+independent reviewer.
Load-bearing: same event/key/bytes через crash/email change, serialized revalidation без long watchdog stalls.
Checks: `tests/billing-notices.integration.test.ts`, support-mail-resend, `tests/browser/manual-billing-reminders-next.test.ts` (existing Next harness); held-lock purchase/refund/email barriers, clock rollback, last-moment eligibility, slow-HTTP batch, false-adapter mutation; до first attempt и после unknown: review/неполный proof→0HTTP/attempt delta0→cleared same end/offset/window→одна отправка same event/key, с сохранением frozen bytes и лимитов; expired/exhausted/email-change→no resume. Проверить, что текст общего tail не продлевает отдельный пакет. Точные команды в06 после QCSD; их source targets/pins окончательно сверяются после accepted030 merge до кода/K1/K2. Тесты пока не выполнены.
