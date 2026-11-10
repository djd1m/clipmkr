# План реализации хранения клипов

Статус: Step7 выполняется после реального native ideation closure и разрешения координатора; основание и pre-code gates в `pre-code-checks.md`. Код в изолированной копии реализован, focused QE/сборка выполняются; independent code/QE и release ещё не приняты. Production runtime не менялся. Макет/progress ведёт координатор.

Inputs read: 01_requirements.md, 02_reuse_inventory.md, technical-clarifications.md, 03_adr, 04_domain_model.md, 05_architecture.md, /home/clipmkr/.agents/skills/feature-adr/modules/06-implementation-plan.md. Применены SPARC-GOAP current→goal и reviewable milestones; внешний planner agent/реальное исполнение задач не заявляются.

## Goal state
Сейчас: 3 суток от video terminal, paid без срока, затем ещё 3 суток, даты физического удаления нет, retention mail нет. Цель: 7 суток от первой готовности клипа, применимое paid_end+30 суток, одинаковая дата во всех каналах; история и исходник остаются; удаление и почта имеют наблюдаемые durable состояния. Процент покрытия не измерен и не придуман. Приёмка — все согласованные FR-1…FR-8 и нижеприведённые сценарии; работа в собственных синтетических fixtures.

## Tasks
- TASK-1 — specification; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8; применить `technical-clarifications.md` и замечания `requirements-review.md`, закрепить exact OpenSpec revision; принять ADR-001, ADR-002, ADR-003, выполнить требуемый QCSD/independent requirements review. Depends: none. Done: нет неподписанных границ destructive поведения, определены blogger, scheduled grants, catch-up, email eligibility, logical deletion. Test: проверяемые AC отражают каждое решение; Показанная UI дельта уже разрешена «да, хорошо!»/«действуй дальше»; см. docs/design/2026-11-10-retention.md. Все технические defaults записаны явно; новые perks/override UI не добавляются.
- TASK-2 — architecture/refinement; ADR-001, FR-1, FR-2, FR-8; `packages/db/migrations/028_clip_retention.sql`, `packages/db/src/render.ts`, `packages/shared/src/tariff.ts`, `packages/db/src/plan.ts`; добавить readiness/lifecycle поля, историческую классификацию и общий deadline с одним asOf. Depends: TASK-1 и K1/K2. Test: `tests/retention-policy.test.ts`, `tests/retention-policy.integration.test.ts`, `tests/render.integration.test.ts`. Done: ready+7d и paid_end+30d до/на/после границы, SQL/TS parity, rerender не сбрасывает ready, partial sibling не задерживает срок, existing данные без now-reset; unknown не удаляется. Риск: неполный legacy paid history отмечен, не восстанавливается по догадке.
- TASK-3 — refinement; ADR-001, ADR-002, FR-1, FR-2, FR-3, FR-5, FR-7, FR-8; селекторы `screen.ts`, `clip-file.ts`, `short-link.ts`, `guest-pack.ts`, `clip-music.ts`, `video-cta.ts`, screen-contract, ClipCard и `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` (terminal done + все done expired: единый header/lead/status; mixed/failed сохраняет прежний progress); применить единый срок/lifecycle, обновить даты/состояния по принятому макету. Depends: TASK-2; UI дельта разрешена, стиль сохраняется. Test: `tests/progress-screen.test.ts`, `tests/progress-screen.integration.test.ts`, `tests/short-link.integration.test.ts`, `tests/guest-pack.integration.test.ts`, `tests/clip-music-choice.integration.test.ts`, `tests/clip-cta.integration.test.ts`, `tests/browser/video-screen.test.ts`. Дополнительно существующие file/thumbnail/sign/stream тесты; `short-link-handler.ts`, `showcase-file.ts` передают absolute notAfter, signer использует один signingDate/TTL (SEC-02); сохранить playback, ограничить новый sign TTL через `packages/s3/src/presign.ts`, `apps/web/src/server/screen-runtime.ts`, `apps/web/src/app/c/[code]/route.ts`; менее1секунды — отказ новой ссылки. Done: недоступный/deleting/deleted файл нигде не выдаётся/не редактируется; история и оценки остаются; МСК/ISO однозначны; guest pack отдельно ограничен своими 14 сутками; blogger 120 минут не даёт бессрочности.
- TASK-4 — refinement; ADR-002, FR-2, FR-5, FR-6, FR-8; `apps/web/src/server/retention.ts`, `packages/db/src/render.ts`; повторная проверка под account→video→clip, durable claim, cancel rerender, S3 вне transaction, marker только после всех префиксов, durable media_recheck_at/hourly fair batch для claimed с null keys/media_deleted_at, retry независимо от новых прав. Depends: TASK-2, TASK-3. Test: `tests/retention-policy.integration.test.ts`, `tests/retention.integration.test.ts`, `tests/retention.test.ts`, `tests/render.integration.test.ts`. Done: контролируемая PostgreSQL гонка payment-before-claim сохраняет байты; claim-before-payment не воскресает; crash/отказ каждого S3 префикса сохраняет retry; source key/history неизменны. Account erasure по-прежнему удаляет персональную историю/новые notice строки.
- TASK-5 — refinement; ADR-003, FR-4; `apps/web/src/server/retention-notices.ts`, `apps/web/src/server/support/mail.ts`, `apps/web/src/server/watchdog.ts`, `apps/web/src/server/queue-runtime.ts` (существующий startQueueWatchdog создаёт mailer и передаёт tick dependency), миграция TASK-2; durable notice key/lease, supersede, bounded retry, узкий reuse provider idempotency N1. Depends: TASK-1, TASK-2. Test: `tests/retention-notices.integration.test.ts`, `tests/support-mail-resend.test.ts`, `tests/support-mail-tls.test.ts`. Done: два ticks/replicas/restart дают один logical notice; timeout-after-accept остаётся unknown и повторяет тот же key/payload только в проверенном окне; неактуальный deadline не отправляется; почта не блокирует cleanup/erasure. Официальный контракт Resend24h проверен в 02_research.md; SMTP не получает обещание dedupe.
- TASK-6 — refinement; FR-3, FR-5, FR-7; `apps/web/src/app/dashboard/ProInterest.tsx`, `apps/web/src/lib/legal-documents.ts`; убрать противоречащие «без срока»/«до удаления аккаунта» по конкретному тексту technical-clarifications и источнику legal content. Depends: TASK-1; конкретные тексты/единое состояние в разрешённой UI дельте. Test: `tests/retention-policy.test.ts` и browser сценарий даты/недоступности. Done: ни одна актуальная поверхность не обещает старые условия. Юридическое заключение не заявляется.
- TASK-7 — completion; существующие fixtures/tests `tests/retention.test.ts`, `tests/progress-screen.test.ts`, `tests/guest-pack.integration.test.ts`, `tests/paid-plan.integration.test.ts`, `tests/short-link.test.ts`, `tests/legal-pages.test.ts`, `tests/clip-music-choice.integration.test.ts` обновляют факты первой готовности и ожидания7/30суток; ADR-001, ADR-002, ADR-003, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8; targeted tests → typecheck/lint/build → необходимые regression и independent cross-model QE/fleet по L-tier → anti-drift. Depends: TASK-3, TASK-4, TASK-5, TASK-6. Done: реальные логи/exit codes, discrimination критических guard и amendment tests; обновлены specs/decisions/limitations, reusable findings через настоящий dz teach+recall. Тестовый стенд/E2E и owner acceptance, затем отдельный разрешённый release того же артефакта; реальный cleanup/письма без согласованного delivery не запускать.

## Dependency order
TASK-1 → настоящий plan/QCSD/architecture acceptance и K1/K2 → TASK-2 → TASK-3/TASK-5/TASK-6 → TASK-4 → TASK-7. Контракты плана приняты координатором после native closure; актуальная admission проверяется при расширении targets. Сначала тесты исторических дат/гонки с ожидаемым отказом, затем изменение реализации.

## Parallel groups
После закрытия входных решений возможно параллельно разрабатывать read surfaces, уведомления и согласованные тексты, сохраняя одного владельца схемы/shared rule. Никакие такие агенты/запуски сейчас не объявляются выполненными. Независимое review новой сессией и другой моделью по `docs/model-matrix.md`/`docs/review-policy.md`; автор плана не выдаёт свой отчёт за независимый.

## Checkpoints
1. Requirements/QCSD + точная ревизия; UI разрешение записано в docs/design/2026-11-10-retention.md. 2. Предложенные ADR/DDD/architecture/plan приняты настоящими checkpoint. 3. K1 каждого нового имени и K2 с --tier=L --require-requirements exit0; до этого нет кода. 4. Schema/shared rule verified. 5. Read/cleanup/mail verified отдельно. 6. Independent QE/anti-drift и тестовая ручная приёмка. Нельзя трактовать наличие файлов или зелёный process-check как эти результаты.

## Risk assessment
QL-001/RET-RISK-001: durable late-PUT recheck, batch/due fairness; каждое claimed требует периодического S3 listing, backlog увеличивает задержку, бессрочный SLO не обещается. CRT-TST-001/SEC-01/SEC-02 закрываются AM-5…AM-8 и реальными tests. Existing worker120s timeout не доказательство remote completion. Read-only dependencies (не planned edits): apps/worker/src/workers/render.ts, apps/worker/src/render/storage.ts, packages/s3/src/erasure.ts.
Highest: неизвестная историческая дата/legacy paid reset — не стирать unknown; durable claim/account lock как граница до S3; unknown mail вне dedupe window — без слепого retry; только started payment windows и обычный blogger free/paid. Catch-up/day-group/immutable payload/attempt limits по technical-clarifications. Resend24h проверен официальным источником. Нет новых зависимостей. Фактические результаты будут сведены в change_manifest/QE после финального freeze; прежние baseline не выдаются за новые tests. Production runtime не менялся.

## Amendments
AM-1 (владелец: существующие материалы без перехода): backfill использует историческую готовность, не дату выкладки. Confirmation: нет reset → test `legacy_ready_is_not_reset_on_rollout` in `tests/retention-policy.integration.test.ts` (будущий тест, обязан упасть при нарушении).
AM-2 (техническое чтение retention/payment): claim перепроверяет продление под общей account блокировкой. Confirmation: payment-before-claim не стирается → test `payment_before_claim_preserves_media` in `tests/retention-policy.integration.test.ts` (будущий тест).
AM-3 (владелец: исходники отдельно): новая политика стирает только clip prefixes. Confirmation: source сохраняется → test `retention_keeps_source_and_history` in `tests/retention-policy.integration.test.ts` (будущий тест).

AM-4 (QL-001, RET-RISK-001): claim/media_recheck_at продолжаются после первого sweep/null keys; media_deleted_at не завершает обязанность. Confirmation: late PUT после sweep и crash worker удаляется следующим due проходом → test `retention_late_put_after_delete_crash_is_reconciled` in `tests/retention-policy.integration.test.ts` (exclude media_deleted mutation ломает тест).
AM-5 (CRT-TST-001): first_attempt_at durable до первой сети, due_at/catch-up независимо. Confirmation: первый tick−2d разрешён → test `catchup_first_attempt_after_due_day_is_allowed` in `tests/retention-notices.integration.test.ts`.
AM-6 (CRT-TST-001): retry/restart не сбрасывают first_attempt_at. Confirmation: ровно23h запрещает transport → test `notice_retry_window_uses_persisted_first_attempt` in `tests/retention-notices.integration.test.ts`.
AM-7 (SEC-01): перед каждой попыткой current verified email==immutable to; иначе superseded без нового key. Confirmation: A→B/отзыв не вызывает transport → test `retention_notice_retry_rejects_stale_recipient` in `tests/retention-notices.integration.test.ts`.
AM-8 (SEC-02): absolute notAfter и истинный signingDate ограничивают TTL всех каналов. Confirmation: задержка через deadline не выдаёт URL → test `retention_signature_delay_never_extends_deadline` in `tests/retention-policy.integration.test.ts`.

AM-9 (реальный browser root): полностью истёкший готовый выпуск не предлагает выбрать фрагмент и не объявляет клипы доступными; partial failure не скрывается. Confirmation: terminal/all-expired против mixed/failed → test `expired_record_header_keeps_history_without_hiding_partial_failure` in `tests/retention-policy.test.ts`.

AM-10 (RET-QP-001): общий actual clock после всех watchdog/lock waits. Confirmation: credit grant после старта watchdog защищает файл → test `watchdog_delay_credit_grant_before_claim_preserves_media` in `tests/retention-policy.integration.test.ts`.
AM-11 (RET-QP-001): notice берёт clock после своего lock. Confirmation: ожидание до claim не отправляет expired/продлённую группу → test `notice_claim_rechecks_clock_after_lock_wait` in `tests/retention-notices.integration.test.ts`.
AM-12 (RET-QP-003): guarded reaper не меняет accepted/live replacement. Confirmation: PostgreSQL interleaving → test `notice_reaper_preserves_concurrent_accepted_and_live_lease` in `tests/retention-notices.integration.test.ts`.
AM-13 (RET-INT-001): runtime использует existing safe capture factory. Confirmation: actual factory+coordinator captured/accepted → test `runtime_test_mailer_captures_synthetic_notice` in `tests/retention-notices.integration.test.ts`.
AM-14 (RET-INT-002): reaper работает без transport. Confirmation: disabled/SMTP sending→unknown без новой attempts → test `unavailable_mailer_recovers_expired_sending_lease` in `tests/retention-notices.integration.test.ts`.
AM-15 (RET-TR-001): pre028→028 проверяет render minimum/filters/unknown, не только video fallback. Confirmation: historical matrix → test `legacy_render_minimum_filters_and_unknown_backfill` in `tests/retention-policy.integration.test.ts`.
AM-16 (RET-QP-002): rendered consumers без старых условий и guest ambiguity. Confirmation: credits/legacy/return/guest HTML → test `runtime_policy_copy_and_guest_deadline_match_retention` in `tests/retention-policy.test.ts`.


## Repair после независимого QE
Root разрешил repair после всех5 originating reviews. RET-QP-001/002/003 уже сохранены host; RET-TR-001, RET-INT-001/002, RET-REG-001 принимаются из фактических entries, не выдумываются. Step7 repair не закрывает nativeQE. Новые consumer/test targets перечислены ниже; требования7/30 и OpenSpec не меняются.
- TASK-8 — refinement; FR-2, FR-4, FR-5, ADR-002, ADR-003; actual callback clock от queue-runtime через весь watchdog до post-lock retention/notice decision; reaper outer state/lease guard до проверки transport. Red→green PG watchdog/credit grant и notice rowlock/reaper accepted/replacement/disabled barriers. Tests `tests/retention-policy.integration.test.ts`, `tests/retention-notices.integration.test.ts`. Depends: актуальные K1/K2/admission. Done: принятая credit оплата не теряется во времени, accepted/live lease не переписываются, unavailable не оставляет expired sending.
- TASK-9 — refinement; FR-3, FR-7, ADR-001; purchase credits/legacy, return и guest consumers показывают7/30, exact effective guest deadline МСК и единое конечное состояние. Files `apps/web/src/app/upgrade/UpgradeScreen.tsx`, `apps/web/src/app/upgrade/return/ReturnScreen.tsx`, `apps/web/src/server/guest-page.ts`, test `tests/retention-policy.test.ts`. Depends: admission. Done: rendered HTML обеих оплат/возврата/guest states соответствует согласованным правилам, unknown/failed не скрываются expiry.
- TASK-10 — refinement; FR-4, ADR-003; existing protected test capture из support/routes переиспользуется общей factory `createSupportMailer` в support/mail.ts и обоими runtime callers. Files `apps/web/src/server/support/mail.ts`, `apps/web/src/server/support/routes.ts`, `apps/web/src/server/queue-runtime.ts`; tests `tests/retention-notices.integration.test.ts`, `tests/support-mail-resend.test.ts`. Done: configured synthetic runtime captured/accepted, real recipients rejected, missing capture unavailable без расходования attempts, verify/reset работают; новых env/outbox нет.
- TASK-11 — refinement; FR-1, FR-5, FR-8, ADR-001, ADR-002; migration matrix min legacy_render/ignored attempts/video fallback/unknown, executable mutations; transitive CTA rerender/diagnostic fixtures обновлены без ослабления lifecycle/error assertions. Files `tests/retention-policy.integration.test.ts`, `tests/clip-cta-rerender.integration.test.ts`, `tests/watchdog-diagnostics.test.ts`. Done: обе старые suites зелёные и red boundary cases действительно вызывают cancel/stale/orphan/retry/original-cause/unlock.
## Предварительные targets и проверки
Ниже 47 конкретных source/test targets; file score4, общий score15 → L согласно router (число файлов не переводит автоматически в XL), при добавлении новых файлов пересчитать tier до кода. New names для K1: module `retention-notices`; exports `PAID_RETENTION_MS`, `retentionDeadlineSql`, `retentionNoticesTick`, `RetentionNoticeMessage`; таблица `retention_notice`, поля `ready_at`, `ready_at_source`, `deletion_started_at`, `media_deleted_at`, `media_recheck_at`, notice `first_attempt_at`; K1 первоначальных5 имён прошёл до кода (pre-code-checks.md); repair добавляет factory export `createSupportMailer`, он проверяется отдельно до кода. Существующие regression файлы, перечисленные в задачах, сначала выполнить; включать в actual code targets только при необходимом изменении. Текущие тесты выполняются, итоговые exit codes фиксируются отдельно. Acid corpus A<n> в текущем 00 не объявлен; при добавлении root его токены должны появиться в задачах и тестах.

## Единое состояние и email aggregation
Expired/claimed/deleted внутри различаются, пользователь видит «Срок хранения закончился», историю и без недоступных действий. Подписанные URL сохраняют текущий транспорт, новые TTL<=remaining; ранее начатое/выданное/скачанное не отзывается. Reminder unique(video_id,expiry_day_msk,offset), earliest exact deadline/count; до первой попытки snapshot обновляется, после immutable; stale same-day не создаёт новый key. Все FR-1…FR-8 отражены задачами выше.

EXPECTED_CODE_TARGETS:
- packages/shared/src/tariff.ts
- packages/db/src/plan.ts
- packages/db/src/render.ts
- packages/db/migrations/028_clip_retention.sql
- apps/web/src/server/retention.ts
- apps/web/src/server/retention-notices.ts
- apps/web/src/server/watchdog.ts
- apps/web/src/server/support/mail.ts
- apps/web/src/server/screen.ts
- apps/web/src/server/clip-file.ts
- apps/web/src/server/short-link.ts
- apps/web/src/server/guest-pack.ts
- apps/web/src/server/clip-music.ts
- apps/web/src/server/video-cta.ts
- apps/web/src/lib/screen-contract.ts
- apps/web/src/lib/legal-documents.ts
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/dashboard/ProInterest.tsx
- tests/retention-policy.test.ts
- tests/retention-policy.integration.test.ts
- tests/retention-notices.integration.test.ts
- tests/retention.integration.test.ts
- tests/render.integration.test.ts
- tests/progress-screen.integration.test.ts
- tests/short-link.integration.test.ts
- tests/support-mail-resend.test.ts
- tests/browser/video-screen.test.ts
- packages/s3/src/presign.ts
- apps/web/src/server/screen-runtime.ts
- apps/web/src/app/c/[code]/route.ts
- apps/web/src/server/short-link-handler.ts
- apps/web/src/server/showcase-file.ts
- apps/web/src/server/queue-runtime.ts
- tests/retention.test.ts
- tests/progress-screen.test.ts
- tests/guest-pack.integration.test.ts
- tests/paid-plan.integration.test.ts
- tests/short-link.test.ts
- tests/legal-pages.test.ts
- tests/clip-music-choice.integration.test.ts
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/upgrade/return/ReturnScreen.tsx
- apps/web/src/server/guest-page.ts
- apps/web/src/server/support/routes.ts
- tests/clip-cta-rerender.integration.test.ts
- tests/watchdog-diagnostics.test.ts
