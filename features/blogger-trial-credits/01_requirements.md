# Пробный бюджет блогера — требования

Статус: R1 requirements и финальный S8 plan приняты root 05.11.2026
в делегированной задаче. Это не Step7 или live admission.

## Заинтересованные стороны

Владелец назначает роль и лимит; блогер использует пробный бюджет; root принимает
техническое решение и отдельный адресный backfill после проверенной поставки.

## Функциональные требования

Все FR/NFR MUST. Нативный trial сохраняется той же строкой с canonical source_key
`trial:<account>` и source `signup|migration_trial`; expires/payment/recovery/entitlement
links отсутствуют. `T`=total, `R`=remaining, `Q`=reserved, `L`=назначенный source limit.

FR-1. Для active credits_v1 target при owner-authorized isBlogger=true применить
`D=max(0,L-T)`, `T'=T+D`, `R'=R+D`, `Q'=Q`. Default L7200; individual L через existing
sourceLimitSeconds. AC:1800/1620/0→7200/7020/0; свежий1800/1800→7200/7200. Формула
`T-R-Q` сохраняет расход; лимит120с не уменьшает initial trial1800с.

FR-2. Повтор, lower limit, revoke и re-enable с прежним/меньшим L не пополняют расход.
Explicit owner raise выше исторического T добавляет только новый прирост. AC: после
total7200 и расхода save/revoke/re-enable даёт D0; L9000 даёт D1800 ровно один раз,
включая20concurrent saves. Subscription/периодического reset нет.

FR-3. Только canonical trial участвует в расчёте. Payment/recovery grants, charges,
allocations, refunds, source/key/expiry и paid entitlements не меняются. AC: с любым paid
balance прирост trial одинаков; reserve/finalize используют прежние строки и сумму.
Пробный бюджет не меняет watermark/retention/paid plan.

FR-4. Legacy target получает прежнюю policy update без credit opt-in/grant. Для credits_v1
missing/noncanonical trial при isBlogger=true даёт typed credit_review_required до effects: guessed signup
или migration_trial не создаётся. AC: role/grant/audit снимки прежние; native legacy
сохраняет роль/лимит/ставку, readCreditBalance остаётся null. isBlogger=false всегда
сохраняет возможность revoke без trial: никакого funding/validation grant в этом пути.

FR-5. Existing owner/active validation и ordered actor/target account locks сохраняются;
затем existing creditAccountLock, trial FOR UPDATE. Policy/delta/audit — одна transaction.
AC: unauthorized/inactive/erasure/audit failure не оставляют partial effects; реальные
PG reserve/finalize и two-owner saves не теряют held/consumed seconds и не deadlock.

FR-6. Existing operator_action set_blogger_policy фиксирует total_before/after и delta,
actor/target и reason; D0 и legacy/revoke различимы. AC: audit failure откатывает весь
run; reason≤500 с existing user reason≤300, без усечения пользовательской причины.

FR-7. Адресный backfill после verified deployment вызывает тот же built setBloggerPolicy
для существующего блогера с прежними role/limit/rate. Optional expectedPolicy валидируется
и сравнивается после account locks; mismatch→conflict, без effects. Root принял этот
TOCTOU guard05.11.2026; HTTP strict schema/handler не меняются. Actual active owner actor
проверяется в DB; OS operator действует по поручению владельца, reason явно delegated
maintenance. AC: stale snapshot не перезаписывает owner edit, malformed guard→invalid;
повторный backfill D0. Нет forged session/reset/массового backfill/SQL credit patch.

FR-8. Existing readCreditBalance и кабинет показывают новый остаток после refresh/relogin.
AC: native PG ledger и balance7020с для описанного случая; после допустимой поставки
root проверяет actual account/readback и пользовательский кабинет, не выдавая server call
за interactive owner UI E2E. Новый UI/copy не реализуется.

NFR-1. Все значения — целые секунды, safe integer в пределах native source limit; без
минутного округления ledger. Invariant R+Q≤T и расход сохраняются атомарно.
NFR-2. Node22/TypeScript/PostgreSQL, typed boundaries; existing locks/transaction/UNIQUE.
Новые auth/source/schema/SDK/daemon не нужны; helper остаётся в небольшом credits.ts.
NFR-3. Реальные тесты — existing isolated PG *_test/schema-per-suite, без новых контейнеров
и MinIO. No skip вместо evidence; cross-model QE на final diff и targeted falsifiers.

## Ограничения и зависимости

Existing setBloggerPolicy, grantTrialTx, creditAccountLock, readCreditBalance и operator_action;
credits_v1 только, без implicit legacy opt-in, новой UI, source enum или миграции.
Имеющиеся trial/charge/refund/payment факты сохраняются.

## OpenSpec и дальнейшие гейты

Ledger R1: `openspec/changes/blogger-trial-credits/proposal.md` и
`openspec/changes/blogger-trial-credits/specs/blogger-trial-credits/spec.md`;
SHA-256 proposal: `31fc8b4aa2d1964c4e6846cc85f3f9ea6c737f1a6cc76c966ae10b9b0d219a1b`.
SHA-256 spec: `725647f002215090559b204f756d806868d419fe3a79f25c53dde51d3e2f594c`.
Authoritative execution plan —06.
S8 не требует QCSD/ADR/05. Семантика принята root в поручении; финальный plan принят root 05.11.2026; Step7
и live остаются отдельными решениями. UI/source8859 compatibility проверяется regression,
новый build потребует разрешённой поставки; текущий production код не объявляется исправленным.
