# Ручные напоминания — требования r2

**Proposed**, r2 с уточнением порядка работ 11.11.2026. Поручение «реализуем 2 и 3»: поставка payment-environments/030 предшествует reminders/031. Requirements/ADR и fresh независимый QCSD нормативного `verifiedLivePaymentSql` выполняются параллельно завершению feature2; её публикация не является входом проверки требований. 06 — после QCSD. Код/031 допускаются только после merge final accepted030 source, фактического recheck/pins и настоящих K1/K2. Original base f701c60/state сохранены; текущий source после merge main5c5130d.

## Участники и границы
Получатель — active credits_v1 пользователь/блогер с verified email; владелец принимает поставку. M/12, одна journal-модель, existing pg/Resend/watchdog; без DDD/fleet/отдельного02_research. Нет новых UI/deps/services/financial states, автоплатежей или отзыва прав.
Оферта поставлена one-time-offer: source931256429e18ffe597678101e69ac8565321d490/docs8ea82; [основание](../one-time-offer/01_requirements.md), [поставка](../one-time-offer/10_delivery.md). Старый exact-legal-copy-proposal.md сохранён как история. LEGAL-1 не действует; тексты/даты/notice здесь не меняются.

## MUST / acceptance
| ID | Проверяемое поведение |
|---|---|
| FR-1 | Тик и CTA GET /upgrade:0payment intents/POST. Checkout routes/body/RUB/цены/receipt/grants прежние; только отсутствующий boolean save_payment_method:false, без saved method id/save=true. |
| FR-2 | End текущего непрерывного union всех payment base/addon/eligible legacy intervals и смежной future цепочки. TEST/unknown/remaining0 не сокращают права/tail; trial/recovery/bonus и disconnected future не продлевают. Нет current interval→NULL, не clamp(now). |
| FR-3 | Send требует canonical verified LIVE intent/payment identity в компоненте, включая future LIVE. ЧистоTEST/unknown,недоказанный legacy,owner/operator unlimited,legacy_daily_v1 исключены. Config/дата не proof; revenue filter не применяется к правам. |
| FR-4 | UNIQUE(account,end,offset):3 при24h<remaining<=72h,1 при0<remaining<=24h. За20h только1, на end0; missed3 не догонять. Точная дата/времяМСК. |
| FR-5 | Final claim revalidates status/email/end/offset/LIVE proof/relevant refund-review/checkout под locks из05. Старый истёкший/несвязанный refund не блокирует account. Relevant refund/review/неполный LIVE proof временно defer существующий event без HTTP/attempt/new key и без изменения grants; после сверки допускается тот же event только при том же end/offset, действующем окне и полной eligibility. |
| FR-6 | Event без email; после first attempt immutable payload/hash/key. Accepted/unknown+email change не создают новый event; accepted≠delivered. Lease2min,max3,interval1h,retry<23h; backward clock/exhaustion→no send. Defer сохраняет pending/failed/unknown и уже frozen payload/key/first/last timestamps; возобновление не сбрасывает лимиты. Изменённый tail/offset, истёкшее окно/исчерпанные лимиты либо недопустимый status/recipient (включая смену email после attempt)→superseded; erasure→CASCADE. CAS stale completion, SQL внеHTTP. |
| FR-7 | Письмо «Период доступа по пакетам…»: exact date обозначает конец текущего непрерывного периода доступа по пакетам, а не срок каждого пакета; индивидуальные сроки и бессрочные кредиты сохраняются. CTA «Купить следующий пакет»→/upgrade. Не называть все grants LIVE-оплатой, не обещать исчезновение всех кредитов/клипов. |
| FR-8 | Optional delivery flag default false до QE/приёмки; missing mail не ломает startup/health/checkout. После media≤4HTTP/tick,≤2concurrent,20s monotonic admission, short DB waits; не batch100×8s. |
| FR-9 | Journal031 после030, account FK CASCADE; no rawPII/payload/key logs. Rollback flag off без restore. |

## Проверка
AC-A: real isolated PG+HTTP; interval/LIVE/mixed/legacy/refund boundaries и positive controls. Два clients+held locks/barriers: purchase/refund/email/erasure/claim, lease recovery/CAS/clock rollback. Сквозной сценарий до first attempt и после unknown: relevant review/неполный proof→0HTTP/attempt delta0→сверка cleared при том же end/offset и допустимом окне→одна отправка того же event/key; после unknown сверить frozen bytes/recipient и прежние first/last timestamps до claim, max3/1h/<23h. Истечение окна, исчерпание retry budget или смена email после attempt возобновления не допускают. Promise.all сам по себе гонку не доказывает.
AC-B: actual Next/native HTTPS auth cookie→mail socket→CTA/login/upgrade GET,0paymentPOST/intents; mobile/keyboard/reload. Existing fixtures,не SSR; adapter false negative control отдельно. Capture письма для пакетов с разными ends: общий tail обозначен как конец непрерывного периода, индивидуальные сроки не продлены текстом.
AC-C: slow mail:≤2inflight/≤4attempts/admission budget, media before billing, progress после busy account. Sibling config/wiring/support-backend-environment suites, independent QE/guard mutations/anti-drift. Handler hash только при реальной правке handler.
Owned QA DB n5_manual_billing_reminders_20261111_test/Redis14 через private wrapper root; без чтения secrets, новых containers/MinIO/product test endpoint/real Resend или Yoo. Проверки приложения пока NOT RUN; часы/provider24h dedup — внешние допущения.

## Привязка нормативных входов
SHA256 ниже измерены после записи. tasks.md — mutable ledger; manifest не пинит себя. Final accepted payment source SHA остаётся pending: candidate не считается accepted source. QCSD оценивает нормативный контракт из05; до кода обязательны merge/recheck окончательной зависимости и её pins. Если итоговый контракт меняет выводы QCSD, требуется независимая проверка затронутой дельты; совпадение контракта подтверждается фактическим recheck, без повторения неизменившихся проверок.

| Нормативный вход | SHA256 |
|---|---|
| `openspec/changes/manual-billing-reminders/proposal.md` | `70f9be7da41355c6cef232db13c8d98a648822e91586d6fb7e3ad253385feb54` |
| `openspec/changes/manual-billing-reminders/design.md` | `15655f2f38a1f403ef78a16b00f12e98be075bca5bdfc4cd0e6df3117c6eed01` |
| `openspec/changes/manual-billing-reminders/specs/manual-billing-reminders/spec.md` | `5996a9e2bcaba3feffd894b5dc7f444b44c4eea13faeafd70f84ac20dad46572` |
| `openspec/changes/manual-billing-reminders/.openspec.yaml` | `b8f20def63a86ae4075c5499ff9ed413265d8704692a8493712424dc3f28d8e3` |
| `features/manual-billing-reminders/02_reuse_inventory.md` | `a2d9288f2f427da337cc91e7ab96c546e55b7d5b56424da95c6acba976087471` |
