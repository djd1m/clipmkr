# ADR-003: Требовать принятое предварительное письмо

## Status
proposed; обратимо до K1/K2. Revisit: provider/notice intervals/delivery подтверждение. FR-5,9–11; NFR-2–4.

## Context / Decision Drivers
Есть native retention journal/Resend. Charge требует своевременного предупреждения; unknown send может быть фактически принят. D1/high — no unannounced charge; D2/high — mail dedup; D3/medium — reuse transport.

## Considered Options
| Вариант | За | Против | D1/D2/D3 |
|---|---|---|---|
| A Send перед charge | Просто, актуально | Нет интервала/durable result | низкий/низкий/высокий |
| B billing_notice+accepted gate | Revalidation/аудит/dedup | Таблица; accepted≠delivered | высокий/высокий/высокий |
| C Новый messaging service | Каналы/delivery telemetry | Новый runtime, чтение всё равно неизвестно | высокий/высокий/низкий |

## Decision
B: отдельный billing_notice по native retention pattern, existing Resend transport. Precharge с T−72h до T−24h; charge требует receipt+accepted_at≤T−24h, current consent/T/price/verified recipient. Нет доказательства вовремя → pause/manual CTA, без catch-up. Manual reminders без active/pending:3d [T−72h,T−24h),1d [T−24h,T), после T ни одного.

Identity manual reminder — только (account,T,offset); precharge — (account,T,consent_id); renewal_failed — (intent_id,kind); paused — (account,T,consent_id,kind). DB partial UNIQUE по виду; recipient generation не часть identity. До first dispatch payload/email можно обновить под account+notice lock в той же записи/key. Первый claim фиксирует first_attempt и payload до HTTP. После него accepted не переотправляется; при смене email sending/unknown/failed становится suppressed без нового key/записи. Уже in-flight письмо не отозвать; его fenced result может сохранить receipt, но не снять suppressed. Unknown к старому адресу больше не повторять. Новый T — новое событие; новый адрес сам по себе — нет.

Confirmed renewal failure, pause связанного current consent и INSERT renewal_failed ON CONFLICT выполняются в одной PG transaction независимо от доступности mail. Crash до commit откатывает всё, после — existing tick видит outbox. Unknown/pending не создают failure event; duplicate canonical observation не дублирует его. Cancel/manual purchase не стирают factual failure notice. Claim требует active account и current verified email; без sender notice ждёт без transport attempt, при восстановлении отправляется. После первого send ≤3 retries, ≥1h, <23h, frozen key/body; exhaustion сохраняется как suppressed + UI/оператор, не обещает доставку. Network вне SQL, result CAS по attempt+lease; failed/unknown transport не означает decline платежа.

Cancel/manual purchase после mail claim могут сделать уже in-flight письмо устаревшим; его нельзя отозвать. Локальный повторный check уменьшает гонку, не устраняет. Письмо показывает подготовленную дату/сумму и ведёт в актуальный кабинет. Charge revalidation независима. Unknown receipt, восстановленный после T−24h, не доказывает timely acceptance и не разрешает charge. Mail retry после failure допустим, payment retry после decline — нет.

## Consequences
Плюс: fail-closed при mail outage без нового сервиса. Цена: пропущенные циклы/ручное действие, возможное stale in-flight письмо; accepted не доставка/прочтение. Mail failure не блокирует manual/cancel/webhook. Follow-up нет. After-action: billing owner через месяц live, оценка paused_notice/unknown.

## Confirmation
Method: real PG+localhost Resend socket accept/drop/timeout/clock DI. Monitoring: due-unaccepted/paused_notice/unknown. Success:0 charge по unknown/late/stale notice;1 logical key;0 SQL-lock на network. Owner: author, independent QE. Load-bearing: timely accepted/current identity gate. Checks: `tests/billing-notices.integration.test.ts`; QT-6,7,13,14.

Critical 4×5: charge без accepted → decision-table + remove-guard RED. High 4×3: duplicate mail → accept/drop/restart same key<23h; QT-12/13 проверяют atomic failure outbox и accepted/unknown→смена адреса без второго события. High 3×4: changed T/email → claim/dispatch revalidation; held socket не блокирует cancel. BDD: Given unknown precharge при T, When tick, Then 0 payment POST,paused и один manual-CTA notice. NOT RUN.
