# План реализации хранения клипов

Статус: bounded draft 10.11.2026. Ничего из задач ниже не реализовано. K1/K2, challenge/QCSD и последующие checkpoints этим документом не считаются пройденными. До кода закрыть технические решения и отдельно согласовать конкретный макет; root ведёт approvals и revision OpenSpec.

Inputs read: 01_requirements.md, 02_reuse_inventory.md, technical-clarifications.md, 03_adr, 04_domain_model.md, 05_architecture.md, /home/clipmkr/.agents/skills/feature-adr/modules/06-implementation-plan.md. Применены SPARC-GOAP current→goal и reviewable milestones; внешний planner agent/реальное исполнение задач не заявляются.

## Goal state
Сейчас: 3 суток от video terminal, paid без срока, затем ещё 3 суток, даты физического удаления нет, retention mail нет. Цель: 7 суток от первой готовности клипа, применимое paid_end+30 суток, одинаковая дата во всех каналах; история и исходник остаются; удаление и почта имеют наблюдаемые durable состояния. Процент покрытия не измерен и не придуман. Приёмка — все согласованные FR-1…FR-8 и нижеприведённые сценарии; работа в собственных синтетических fixtures.

## Tasks
- TASK-1 — specification; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8; согласовать `technical-clarifications.md` и рассмотреть `requirements-review.md`, закрепить exact OpenSpec revision; принять ADR-001, ADR-002, ADR-003, выполнить требуемый QCSD/independent requirements review. Depends: none. Done: нет неподписанных границ destructive поведения, определены blogger, scheduled grants, catch-up, email eligibility, logical deletion. Test: проверяемые AC отражают каждое решение; UI макет принят отдельно. При неизвестном решении код ждёт, не выбирает default скрытно.
- TASK-2 — architecture/refinement; ADR-001, FR-1, FR-2, FR-8; `packages/db/migrations/028_clip_retention.sql`, `packages/db/src/render.ts`, `packages/shared/src/tariff.ts`, `packages/db/src/plan.ts`; добавить readiness/lifecycle поля, историческую классификацию и общий deadline с одним asOf. Depends: TASK-1 и K1/K2. Test: `tests/retention-policy.test.ts`, `tests/retention-policy.integration.test.ts`, `tests/render.integration.test.ts`. Done: ready+7d и paid_end+30d до/на/после границы, SQL/TS parity, rerender не сбрасывает ready, partial sibling не задерживает срок, existing данные без now-reset; unknown не удаляется. Риск: неполный legacy paid history отмечен, не восстанавливается по догадке.
- TASK-3 — refinement; ADR-001, ADR-002, FR-1, FR-2, FR-3, FR-5, FR-7, FR-8; селекторы `screen.ts`, `clip-file.ts`, `short-link.ts`, `guest-pack.ts`, `clip-music.ts`, `video-cta.ts`, screen-contract и ClipCard; применить единый срок/lifecycle, обновить даты/состояния по принятому макету. Depends: TASK-2 + UI approval. Test: `tests/progress-screen.test.ts`, `tests/progress-screen.integration.test.ts`, `tests/short-link.integration.test.ts`, `tests/guest-pack.integration.test.ts`, `tests/clip-music-choice.integration.test.ts`, `tests/clip-cta.integration.test.ts`, `tests/browser/video-screen.test.ts`. Done: недоступный/deleting/deleted файл нигде не выдаётся/не редактируется; история и оценки остаются; МСК/ISO однозначны; guest pack отдельно ограничен своими 14 сутками; blogger 120 минут не даёт бессрочности.
- TASK-4 — refinement; ADR-002, FR-2, FR-5, FR-6, FR-8; `apps/web/src/server/retention.ts`, `packages/db/src/render.ts`; повторная проверка под account→video→clip, durable claim, cancel rerender, S3 вне transaction, marker только после всех префиксов, retry claimed независимо от новых прав. Depends: TASK-2, TASK-3. Test: `tests/retention-policy.integration.test.ts`, `tests/retention.integration.test.ts`, `tests/retention.test.ts`, `tests/render.integration.test.ts`. Done: контролируемая PostgreSQL гонка payment-before-claim сохраняет байты; claim-before-payment не воскресает; crash/отказ каждого S3 префикса сохраняет retry; source key/history неизменны. Account erasure по-прежнему удаляет персональную историю/новые notice строки.
- TASK-5 — refinement; ADR-003, FR-4; `apps/web/src/server/retention-notices.ts`, `apps/web/src/server/support/mail.ts`, `apps/web/src/server/watchdog.ts`, миграция TASK-2; durable notice key/lease, supersede, bounded retry, узкий reuse provider idempotency N1. Depends: TASK-1, TASK-2. Test: `tests/retention-notices.integration.test.ts`, `tests/support-mail-resend.test.ts`, `tests/support-mail-tls.test.ts`. Done: два ticks/replicas/restart дают один logical notice; timeout-after-accept остаётся unknown и повторяет тот же key/payload только в проверенном окне; неактуальный deadline не отправляется; почта не блокирует cleanup/erasure. Перед кодом проверить официальную гарантию Resend; SMTP не получает обещание dedupe.
- TASK-6 — refinement; FR-3, FR-5, FR-7; `apps/web/src/app/dashboard/ProInterest.tsx`, `apps/web/src/lib/legal-documents.ts`; убрать противоречащие «без срока»/«до удаления аккаунта» по конкретному согласованному тексту и источнику legal content. Depends: TASK-1, UI/text approval. Test: `tests/retention-policy.test.ts` и browser сценарий даты/недоступности. Done: ни одна актуальная поверхность не обещает старые условия. Юридическое заключение не заявляется.
- TASK-7 — completion; ADR-001, ADR-002, ADR-003, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8; targeted tests → typecheck/lint/build → необходимые regression и independent cross-model QE/fleet по L-tier → anti-drift. Depends: TASK-3, TASK-4, TASK-5, TASK-6. Done: реальные логи/exit codes, discrimination критических guard и amendment tests; обновлены specs/decisions/limitations, reusable findings через настоящий dz teach+recall. Тестовый стенд/E2E и owner acceptance, затем отдельный разрешённый release того же артефакта; реальный cleanup/письма без согласованного delivery не запускать.

## Dependency order
TASK-1 → настоящий plan/QCSD/architecture acceptance и K1/K2 → TASK-2 → TASK-3/TASK-5/TASK-6 → TASK-4 → TASK-7. Нынешний документ — подготовительный proposal до gates, не обход последовательности feature-adr. Сначала тесты исторических дат/гонки с ожидаемым отказом, затем изменение реализации.

## Parallel groups
После закрытия входных решений возможно параллельно разрабатывать read surfaces, уведомления и согласованные тексты, сохраняя одного владельца схемы/shared rule. Никакие такие агенты/запуски сейчас не объявляются выполненными. Независимое review новой сессией и другой моделью по `docs/model-matrix.md`/`docs/review-policy.md`; автор плана не выдаёт свой отчёт за независимый.

## Checkpoints
1. Requirements/QCSD + точная ревизия и UI approval. 2. Предложенные ADR/DDD/architecture/plan приняты настоящими checkpoint. 3. K1 каждого нового имени и K2 с --tier=L --require-requirements exit0; до этого нет кода. 4. Schema/shared rule verified. 5. Read/cleanup/mail verified отдельно. 6. Independent QE/anti-drift и тестовая ручная приёмка. Нельзя трактовать наличие файлов или зелёный process-check как эти результаты.

## Risk assessment
Highest: неизвестная историческая дата/legacy paid reset — не стирать unknown; logical claim boundary пока не одобрена — код блокируется; unknown mail вне dedupe window — не делать слепой новый retry; paid scheduled scope/blogger override/catch-up пока не приняты — зафиксировать до TASK-2/5. Нет внешних новых зависимостей; Resend API research требуется. Результаты исполнения tests/runtime сейчас отсутствуют.

## Amendments
AM-1 (владелец: существующие материалы без перехода): backfill использует историческую готовность, не дату выкладки. Confirmation: нет reset → test `legacy_ready_is_not_reset_on_rollout` in `tests/retention-policy.integration.test.ts` (будущий тест, обязан упасть при нарушении).
AM-2 (техническое чтение retention/payment): claim перепроверяет продление под общей account блокировкой. Confirmation: payment-before-claim не стирается → test `payment_before_claim_preserves_media` in `tests/retention-policy.integration.test.ts` (будущий тест).
AM-3 (владелец: исходники отдельно): новая политика стирает только clip prefixes. Confirmation: source сохраняется → test `retention_keeps_source_and_history` in `tests/retention-policy.integration.test.ts` (будущий тест).

## Предварительные targets и проверки
Ниже 30 конкретных source/test targets; соответствует верхней границе L, при добавлении новых файлов пересчитать tier до кода. New names `retention-notices`, `RetentionNotice` и новые schema columns/exports пока не прошли K1; не придумывать свободность. Существующие regression файлы, перечисленные в задачах, сначала выполнить; включать в actual code targets только при необходимом изменении. На момент плана тесты ещё не созданы/не выполнены. Acid corpus A<n> в текущем 00 не объявлен; при добавлении root его токены должны появиться в задачах и тестах.

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
- tests/retention.test.ts
- tests/render.integration.test.ts
- tests/progress-screen.test.ts
- tests/progress-screen.integration.test.ts
- tests/short-link.integration.test.ts
- tests/guest-pack.integration.test.ts
- tests/support-mail-resend.test.ts
- tests/browser/video-screen.test.ts

## Уточнение UX от владельца 10.11.2026

Expired и deleted различаются только внутри системы/поддержки. Пользователь видит одно состояние «Срок хранения закончился» с историей и без недоступных действий. Восстановление/продление не предлагается без проверки сохранности файлов и допустимости операции. Это уточнение заменяет противоречащие пользовательские тексты выше; внутренний lifecycle не объединяется.
