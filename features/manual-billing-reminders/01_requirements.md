# Ручные напоминания — требования

Proposed11.11.2026, M/12; вход QCSD, не code admission. Основание `owner-authority.md`: отмена автоплатежей заменяет optional-autorenew. LIVE012efb6 сохраняется; первая реальная покупка ещё ожидается. Исторические фразы activation docs не разрешают recurring.

## Участники и scope
Получатели: обычные credits_v1 пользователи/блогеры с verified email; владелец принимает поставку. Только ручной checkout и два email, одна additive journal-таблица, existing pg/Resend/watchdog. DDD/fleet/отдельный02_research дляM пропущены. Нет новых deps/сервисов/UI actions/financial states. Recurring prototype остаётся в отдельной ветке; код оттуда не переносится.

## MUST / acceptance
| ID | Требование и проверяемый результат |
|---|---|
| FR-1 | Yoo POST: boolean save_payment_method=false, без payment_method_id/save=true; тик не создаёт intent/payment POST. Existing checkout body/routes/RUB/цены/receipt/grants сохраняются. |
| FR-2 | Event/account/итоговый paid end/offset:3 при24h<remaining<=72h;1 при0<remaining<=24h. За20h только1; после end ничего; missed3 не догоняется. Дата точная МСК. |
| FR-3 | End непрерывного объединения всех payment intervals (base/addon/eligible legacy), покрывающего now, включая смежные future periods. Нулевой баланс не обрывает права. Disconnected future не продлевает текущий срок; NULL без current paid interval, без clamp(now). Trial/bonus/recovery,owner/operator unlimited и legacy_daily_v1 исключены. |
| FR-4 | Перед каждой попыткой revalidate status/email/tail/offset/refund-review/checkout eligibility. Покупка или изменение статуса до claim подавляет stale письмо. Refund/review не меняет grants. Граница атомарности после committed dispatch описана в05. |
| FR-5 | UNIQUE(account,end,offset), независимо от email. До первой попытки recipient можно обновить; после неё payload/hash/key immutable. Email change после accepted/unknown не создаёт новый logical event. Accepted != delivered. |
| FR-6 | Journal lease2min, max3 attempts, interval>=1h, budget<23h, same key/bytes. Timeout/lease expiry→unknown; stale completion fenced. Clock rollback/budget exhaustion→no send; нет нового key после суток. SQL transaction не держать наHTTP. |
| FR-7 | Exact-date manual email/CTA «Купить следующий пакет»→existing /upgrade, без обещания исчезновения бессрочных кредитов/клипов. Approved manual3/manual1 — content reference; после отмены auto текст о сроке всего paid периода. Existing UI не меняется. |
| FR-8 | Exact legal draft§6.3/7.7/7.8/date через replacement map,87paragraphs;refund/15%/реквизиты/rights сохраняются. LEGAL-1 до публикации: exact text/date/§10.2 notice. Не полный юраудит. |
| FR-9 | Optional N5_BILLING_REMINDERS_ENABLED default false до приёмки; missing mail не ломает startup/health/checkout. Bounded batch100(1..1000),HTTP8s, no rawPII/key logs. Account erasure CASCADE. |

## Проверка и ограничения
AC-A: isolated real PG+HTTP mail fixture; paid interval boundaries/base/addon/bonus/future gaps,zero balance,refund/email/status changes; two DB clients/barriers/held locks, observed contender blocking, lease recovery/stale completion/clock guards и positive controls. Одного Promise.all недостаточно.
AC-B: actual Next/auth/browser→свой PG→synthetic mail socket→CTA/login/upgrade, reload/mobile/keyboard; static SSR не E2E. Browser без real Yoo POST; adapter fixture+negative mutation true/missing отдельно.
AC-C: config/wiring/support-backend-environment/workspace-relocation-config regression нового flag; golden87 legal; source-handler hash менять только при реальной правке handler. Independent QE/anti-drift/guard mutations на финальных bytes.
QA — existing PG/Redis в отдельных namespaces, без новых containers/MinIO/публичного localhost с секретами. Реальные emails/payment операции здесь не разрешены. Проверки приложения ещё не выполнялись. 23h предполагает корректные часы и24h provider dedup; exactly-once inbox delivery не обещается.

## Revision / решения
OpenSpec delta: openspec/changes/manual-billing-reminders/{proposal.md,design.md,specs/manual-billing-reminders/spec.md,.openspec.yaml}. Exact SHA256 и reuse hash — requirements-revision.json; tasks.md не normative pin. Feature-adr владеет исполнением/ADR/QE;06 только после QCSD, затем реальныеK1/K2. LEGAL-1 в exact-legal-copy-proposal.md — единственное открытое owner decision до legal rollout.

Measured reuse SHA256: `e36fd0c1532278c296357259cf047f0e0a22b7f7efd9908d42465a4d12ee11b8`.
