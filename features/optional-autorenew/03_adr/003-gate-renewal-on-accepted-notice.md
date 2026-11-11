# ADR-003: Требовать принятое предварительное письмо

## Status
proposed; обратимо до K1/K2. Revisit: provider/notice intervals/delivery подтверждение. FR-5,10,11; NFR-2–4.

## Context / Decision Drivers
Есть native retention journal/Resend. Charge требует своевременного предупреждения; unknown send может быть фактически принят. D1/high — no unannounced charge; D2/high — mail dedup; D3/medium — reuse transport.

## Considered Options
| Вариант | За | Против | D1/D2/D3 |
|---|---|---|---|
| A Send перед charge | Просто, актуально | Нет интервала/durable result | низкий/низкий/высокий |
| B billing_notice+accepted gate | Revalidation/аудит/dedup | Таблица; accepted≠delivered | высокий/высокий/высокий |
| C Новый messaging service | Каналы/delivery telemetry | Новый runtime, чтение всё равно неизвестно | высокий/высокий/низкий |

## Decision / Rationale
B: отдельный billing_notice по native retention pattern, existing Resend transport. Precharge с T−72h до T−24h; charge требует receipt+accepted_at≤T−24h, current consent/T/price/verified recipient. Нет доказательства вовремя → pause/manual CTA, без catch-up. Manual reminders без active/pending:3d [T−72h,T−24h),1d [T−24h,T), после T ни одного.

Unique logical key account/T/kind/offset/consent-revision/recipient-generation; NULL корректно участвует в uniqueness. Frozen после first_attempt payload/hash/provider_key; mutable lease/attempts/result/receipt/accepted_at. Claim под account lock revalidates active/email/window/consent/T; stale superseded. Новый verified recipient/срок/версия — новая logical запись. Network вне SQL; result CAS attempt+lease owner. Expired lease→unknown; ≤3 retries,≥1h,<23h, тот же key/body. После cutoff никакого нового key для того же письма.

Cancel/manual purchase после mail claim могут сделать уже in-flight письмо устаревшим; его нельзя отозвать. Локальный повторный check уменьшает гонку, не устраняет. Письмо показывает подготовленную дату/сумму и ведёт в актуальный кабинет. Charge revalidation независима. Unknown receipt, восстановленный после T−24h, не доказывает timely acceptance и не разрешает charge. Mail retry после failure допустим, payment retry после decline — нет.

## Consequences
Плюс: fail-closed при mail outage без нового сервиса. Цена: пропущенные циклы/ручное действие, возможное stale in-flight письмо; accepted не доставка/прочтение. Mail failure не блокирует manual/cancel/webhook. Follow-up нет. After-action: billing owner через месяц live, оценка paused_notice/unknown.

## Confirmation / Shift-left
Method: real PG+localhost Resend socket accept/drop/timeout/clock DI. Monitoring: due-unaccepted/paused_notice/unknown. Success:0 charge по unknown/late/stale notice;1 logical key;0 SQL-lock на network. Owner: author, independent QE. Load-bearing: timely accepted/current identity gate. Checks: `tests/billing-notices.integration.test.ts`; QT-6,7,13,14.

Critical 4×5: charge без accepted → decision-table + remove-guard RED. High 4×3: duplicate mail → accept/drop/restart same key<23h. High 3×4: changed T/email → claim/dispatch revalidation; held socket не блокирует cancel. BDD: Given unknown precharge при T, When tick, Then 0 payment POST,paused и один manual-CTA notice. NOT RUN.
