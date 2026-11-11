# Добровольное автопродление — требования

Редакция AR-20261111-1, proposed для QCSD. Полномочия: `owner-authority.md`; tier: `00_complexity_assessment.md`. Requirement ledger: `openspec/changes/optional-autorenew/{proposal.md,design.md,specs/billing-autorenew/spec.md,tasks.md,.openspec.yaml}`. Точные SHA-256 — `requirements-revision.json`. Наличие документов не означает gates/approval.

## Участники и scope владельца

Пользователь покупает/продлевает пакет и отключает автоматику; владелец утверждает макеты/приёмку/коммерческие условия; backend хранит financial facts; YooKassa принимает оплату; Resend принимает письма. Автор проектирует, независимый QCSD/QE проверяет отдельно.

Утверждено владельцем 11.11: **отдельное явное согласие при оплате, предупреждение до списания, простое отключение, сообщение о неуспехе; без продления — письма за 3 дня и сутки с покупкой следующего пакета; оферта соответствует поведению**. Цены/кредиты/30 суток сохраняются. Обычные live-продажи включаются отдельным поручением; это не recurring merchant activation.

Инженерные defaults для макетов, ещё не UI approval: unchecked opt-in только Start/Pro; verified email только для opt-in. T — конец всей оплаченной base-очереди. Precharge в T−72h; accepted≤T−24h; первый dispatch в [T,T+5min]. Опоздание/отказ — pause без catch-up до нового согласия через checkout. Покупка без opt-in не отменяет уже active согласие: есть отдельное отключение. Новое opt-in сразу supersedes старое; до успешной оплаты новое pending. Все эти состояния должны быть показаны владельцу.

## FR и acceptance criteria (MUST)

| ID | Требование | AC / наблюдаемый результат |
|---|---|---|
| FR-1 | Отдельное согласие с SKU/ценой RUB/30d/датой/отключением; checkbox не выбран. | AC-1: reload unchecked; manual работает; addon/legacy/owner-unlimited не включаются crafted API. |
| FR-2 | До HTTP immutable consent snapshot: account, SKU/price/currency/credits/cadence, offer+consent revision/text hash, agreed_at/source intent, merchant/test; verified server email. | AC-2: PG uniqueness; тот же key с другим согласием 409; unverified блокирует opt-in, но manual доступен. |
| FR-3 | Активировать только verified succeeded+fulfillment и canonical GET saved=true; token server-only. | AC-3: forged token/saved/order/account/shop/test не активирует; saved=false не отнимает купленный пакет; late success не оживляет revoked/superseded. |
| FR-4 | Продлевать первый неоплаченный base-период после всех committed future base grants; addon отдельно. | AC-4: T=max base ends и применимого legacy paid_until; addon не переносит T; manual commit до dispatch переносит срок. |
| FR-5 | Timely accepted precharge с receipt совпадает с текущими consent/T/price/verified recipient. | AC-5: unknown/failed/late/stale/unverified ⇒ 0 POST, pause+manual CTA. Accepted не означает delivered/read. |
| FR-6 | Отключение одним действием запрещает новые dispatch и POST retries, включая pending consent. | AC-6: cancel-first=0 POST; dispatch-first допускает ранее разрешённую попытку; cancel не ждёт сеть, сохраняется после reload; webhook не реактивирует. |
| FR-7 | Одна renewal identity(account,T), durable intent/key/body; unknown без ID только same-key <23h при действующем согласии. | AC-7: accepted socket+drop+restart сохраняет bytes/key и 1 intent; cutoff/invalid/future time/revoke ⇒ STOP без нового key. |
| FR-8 | Existing verified payment/event/grant/referral/receipt invariants сохраняются. | AC-8: duplicates/permutations дают 1 grant/payment; late success после cancel получает последовательный период; live без receipt не делает POST. VAT1/service/full_payment — данные владельца. |
| FR-9 | Terminal decline/revoked method ⇒ paused, UI+письмо; нет новых payment retries. Confirmation требует человека. | AC-9: canceled/permission_revoked не списывается снова; pending/expired pending/unknown не выдаётся за отказ; own-intent continuation без второго платежа. |
| FR-10 | Без active/pending consent письма за 72h и 24h перед T с ручной покупкой. | AC-10: по одному account/T/offset; окна [T−72h,T−24h), [T−24h,T); после T без catch-up; addon-only не объявляется базовой подпиской. |
| FR-11 | Durable notice journal, immutable send payload/key, lease, revalidation; сеть вне SQL. | AC-11: ≤3 retries, ≥1h, <23h; restart не создаёт новый key; cancel/manual/email/deadline change supersedes stale notice до claim. |
| FR-12 | Изменённые price/SKU/credits/cadence/consent revision требуют нового согласия. | AC-12: current offer drift до нового dispatch ⇒ pause; уже dispatched body не изменяется; reoptin не создаёт второй intent того же T. |
| FR-13 | Manual/continuation/права сохраняются; оферта согласована. | AC-13: recurring off не ломает live receipt/webhook; unresolved renewal блокирует новый base checkout, но bound manual continuation и addon работают; concurrent successes дают два последовательных периода. |

## NFR

NFR-1 Security: existing auth+Origin+rate, чужие ресурсы404, closed schemas; суммы/token/email только серверные. Raw PAN/CVC не хранить; token/email/snapshot не выдавать API/logs. NFR-2 Concurrency: account-first PG transactions; network вне locks, payment5s/mail8s, lease2min, batch≤100, minute tick. NFR-3 Compatibility: существующие Next/TS/PG16/watchdog/Resend, без новых runtime/deps; additive migration без backfill согласия. NFR-4 Privacy: immutable terms, audit lifecycle, erase новых PII/token по existing policy; законодательные сроки не угадывать. NFR-5 UX: русский, mobile/desktop/keyboard, честные pending/failure/paused, TEST только в соответствующей среде; timeout сохраняет key и выбор.

## Границы и зависимости

Обязательны согласованный макет, QCSD→план→K1/K2→код→тесты/независимое review/fleet/anti-drift. Новый recurring flag default off, manual sales независимы. Merchant recurring capability подтверждается отдельно фактически; обычный live её не доказывает. Требуются Resend/verified email и достоверные clocks. SQL+HTTP не атомарны; delivery/clock/process pause сверх часового запаса не покрывается локальным 23h доказательством.

Вне scope: цены/лимиты/proration, addon autorebuy, пополнение при нулевом балансе, долги, новые services/merchant/Cloud/DNS операции, реальные письма/списания в разработке. Новая покупка не восстанавливает уже удалённые media bytes. Оферта меняется точечно, owner requisites/content rights сохраняются.

## Открытые вопросы

Макеты ещё не утверждены. Live recurring capability не проверена. Правовая достаточность и legal retention consent не подтверждены аудитом. QCSD/K1/K2/реализация/QE/поставка NOT RUN; 06 появляется только после QCSD. Конкретные оракулы QT-1…16 и failure model — `05_architecture.md`, не заявления о тестах.
