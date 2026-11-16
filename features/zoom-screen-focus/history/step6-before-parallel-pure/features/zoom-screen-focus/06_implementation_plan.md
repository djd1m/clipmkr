# Финальный SPARC-GOAP план screen + face

Документ Step6 готов; **TASK-0 блокирует code admission**. Планировщик `gpt-6-astra xhigh`, кодер `gpt-6.1-sol high`. QCSD R3: actual root exit0/closed, revision `e66723874cc112533766c6896c800786109567d430efd4f5a7ff1b30382acfdd`, nonce `0276c1f3-2f7b-4e38-96c4-10258020aca1`, unresolved/reasons[]. Stage/checkpoint, K1/K2 и root GO pending. Финальный06 не объявляется отдельно просмотренным шестью origin reviewers.
Inputs read: 01_requirements.md, 02_research.md, 02_reuse_inventory.md, 03_adr, 03_shift_left.md, 04_domain_model.md, 05_architecture.md, requirements-revision.json, source-pins.json, AGENTS.md, CLAUDE.md, docs/model-matrix.md, docs/review-policy.md.

## Goal state / SPARC

Screen+face03 default/01–02 advanced, seed/wholeclip preview/explicit apply; old MP4/source credits сохранены. Полные requirements и ADR Decision/Confirmation обязательны и передаются canonical helper вместе с06. Specification:01/OpenSpec; Architecture:ADR/04/05; Refinement:TASK-1…6; Completion:7/8. Coverage не измерялся.

## Tasks

- TASK-0 (ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10): actual SOURCE acceptance+integration Original по списку ниже. Depends:none; SPARC:specification. Done:exact accepted/integrated revision+seam proof. BLOCKED; K1/K2/код/коммиты запрещены.
- TASK-1 (ADR-001, ADR-003; ZF-01, ZF-03, ZF-04, ZF-06, ZF-09; AC02, AC03, AC04): shared screen-layout/cut-timeline, compaction re-export и vitest aliases; reuse accepted Original leaf. Depends:TASK-0+root admission; SPARC:pseudocode/architecture. Test:`tests/screen-layout.test.ts`,`tests/compaction-media.test.ts`. Done:geometry/fallback и timing contracts, legacy algorithm прежний.
- TASK-2 (ADR-002, ADR-004; ZF-07, ZF-08, ZF-10; AC05, AC06): migration032, DB intent/seed/index/render; web service/RPC/projection/runtime. Depends:TASK-1; SPARC:architecture/refinement. Test:real PG `tests/clip-layout.integration.test.ts`, populated migration/concurrency/replay/rollback/erasure. Done:1 admission/debit, source charge/STT/select0, old publication сохранена.
- TASK-3 (ADR-004, ADR-001; ZF-01, ZF-04, ZF-06, ZF-07; AC01, AC03): queues/seed handler/runtime/face Python/watchdog по closed dispatch, source policy и bounded CAS lifecycle; reuse initial-render data. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/queue-redis.integration.test.ts`,`tests/clip-layout.integration.test.ts`,`tests/screen-layout-media.test.ts` в worker image. Done:proposal без mandatory crop,≤2 attempts/30s, no refresh restart,0 render/quota/published writes, privacy/priority/descendants проверены.
- TASK-4 (ADR-001, ADR-002; ZF-03, ZF-06, ZF-08, ZF-09, ZF-10; AC02, AC03, AC04, AC06): screen-layout/ffmpeg/teaser/render worker/DB publish; shared geometry/timing, live camera veto, contract hash/fence. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/screen-layout-media.test.ts` + existing render/storage/failure/music/CTA/framing regression paths из trailing read-only scope. Done:real pixel/time/fallback, invalid nonNULL не legacy, music/CTA наследуют layout, old MP4 сохранён.
- TASK-5 (ADR-003, ADR-002, ADR-004; ZF-01, ZF-02, ZF-04, ZF-05, ZF-07, ZF-08, ZF-10; AC01, AC05, AC07, AC08, AC09, AC10): layoutInfo/quota/accountScope/rpc; Choice/Preview/CSS и root mount ClipCard/VideoDetail. Все ADR-003 controls/status/focus/draft/media safeguards, AM-5/6/7/10/11/12. Depends:TASK-1,TASK-2,TASK-3,accepted Original; SPARC:refinement. Test:`tests/browser/clip-layout.test.ts` + existing browser regressions; real video Chromium/WebKit390/1440, обе темы, manual screen reader. Done:wholeclip доступен, draft/cancel0 render calls, no S3 props, stable nodes, каждый play pause других, late draft/ABA сохранены.
- TASK-6 (ADR-001; ZF-09, ZF-10; AC04): исправить stale `tests/render.test.ts` order guard и `scripts/test-framing-mutations.mjs` anchor. Depends:TASK-4; SPARC:refinement. Test:broken graph→RED/restored→GREEN, >0 tests и unique match. Done:indexOf(-1)/no-match не PASS, legacy no-pad scoped, font/ONNX/metrics SHA не перепривязаны.
- TASK-7 (ADR-001, ADR-002, ADR-003, ADR-004; ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10): root integration/freeze; общий прогон ниже, discrimination/code-spec anti-drift, independent code-critic/security/QX/fleet QE по model-matrix. Depends:TASK-3/4/5/6; SPARC:completion. Done:terminal results, skip/no-match не PASS; QE получает approved docs, самостоятельно находит код/тесты без авторских выводов.
- TASK-8 (ZF-05, ZF-08, ZF-10; AC04, AC07): small verified commits/mirror push по AGENTS; test VPS artifact migration→worker→web, synthetic E2E+отдельно разрешённый private wholeclip QA, ссылка owner. Depends:TASK-7; SPARC:completion. Done:owner acceptance реального UI/media до production. Cloud/DNS/real charges не разрешены. Rollback:stop new apply, drain intents новым worker до возврата старого.

## TASK-0: actual dependency check

Original SOURCE acceptance/merge **PENDING**. Candidate код/Cloud/native Next E2E16/16 не доказывают финальную ревизию после long-request/GC/default-timeout fixes. Root обязан:

1. Получить independent SOURCE receipt финального artifact/commit+terminal checks этой ревизии.
2. Интегрировать accepted `packages/shared/src/server/original-source.ts`, route `apps/web/src/app/api/videos/[videoId]/original/route.ts`, `OriginalSource.tsx`/`VideoDetail.tsx` из `apps/web/src/app/videos/[videoId]/`; записать resulting revision/hashes, сверить конфликты. Candidate worktree не импортировать.
3. Подтвердить ADR-003 sourceRevision/metadata/GET/HEAD/Range и server-only import `@clipmaker/shared/server/original-source`, без browser root re-export/дубликатов. Tentative signature `originalSourceRevision(videoId:string, objectKey:string, uploadId:string|null|undefined, actualBytes:string|bigint|number)` — seam, не accepted proof.
4. Проверить native play capture/тонкий callback для TASK-5, не расширяя Original16 editable. Записать actual proof в `step6-plan-snapshot.json`, обновить source pins после integration. New contract issue передать root, core9 не переписывать.
5. После genuine TASK-0 — root supported stage/checkpoints/K1/K2/code GO. Сейчас proof null/pending.

## Pseudocode

Prepare/claim/apply/replay/render/publish — ADR-002/004; preview geometry/timeline и draft — ADR-001/003. Existing execution framework сохраняется.

## Dependency order и parallel groups

0→1→2→{3,4};{1,2,3,Original}→5;4→6;{3,4,5,6}→7→8. Параллельный код только после TASK-0+root admission/K1/K2. Общие файлы root интегрирует последовательно после Original; tests/QE получают stable revision, во время прогона source не меняется.

## Checkpoints и команды проверки

После TASK-0: relevant recall, actual supported dz stage/checkpoints, K1 всех новых names. Root K2 (здесь не запускался): `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/zoom-screen-focus --tier=XL --require-requirements`. ZF trace проверить явно; fresh advisory challenge другой моделью по model-matrix. Readiness helpers не заменяют эти gates.

Targeted Node22/project-pinned checks: `npm test -- --run tests/screen-layout.test.ts tests/clip-layout.integration.test.ts tests/queue-redis.integration.test.ts`; media `npm test -- --run tests/screen-layout-media.test.ts tests/framing-media.test.ts tests/compaction-media.test.ts`; browser `npm exec -- vitest run --config vitest.browser.config.ts tests/browser/clip-layout.test.ts`. PostgreSQL/Redis настоящие, OpenCV/YuNet в worker image; отсутствующий cv2 = NOT EXECUTED. Synthetic media воспроизводимы, private media не Git.

Один общий прогон stable revision: `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm exec -- vitest run --config vitest.browser.config.ts`, `npm run test:responsive`, `npm run build`. Сохранить credit/payments/retention regression без real money. После ремонта anchors — `node scripts/test-framing-mutations.mjs`; safeguards обязаны дать intentional RED. Extended QE/Step9 mandatory. Local fixes повторяют affected checks; дополнительный общий прогон только при названной новой широкой зависимости/регрессии/незакрытом риске. Владеющая сессия ждёт terminal result каждой долгой команды.

## Risk assessment

Money/idempotency→real PG; data/fence→late publish; privacy→owner404+canary; media→pixels/time; sampling→пределы+wholeclip; worker→measured30s/traffic. Falsifiers:ADR Confirmation и AM. Новых dependencies/service/queue/ML нет.

59 measured=40 editable(26 existing+14 new)+19 **неизменяемых** read-only для native measurement; Original leaf чужой ownership. XL/scope не уменьшать исключением tests. Actual diff сверить; занятый migration032 root перенумеровывает до кода.

После gates: implementation110–180min, проверки60–100min, independent QE/delivery30–60min; TASK-0/owner wait отдельно. Это оценка.

## Amendments

AM-1 (root engineering11.11.2026): explicit cached seed-analysis допустим; radio/preview не создают render jobs/списаний. Confirmation:10 concurrent opens→1 seed operation и0 render quota → test `seed_prepare_is_cached_and_never_consumes_render_quota` in `tests/clip-layout.integration.test.ts` (fails if prepare leases render).
AM-2 (root engineering11.11.2026): не вводить worker Range proxy/малый byte cap; native Range+deadline/max attempts и measured traffic. Confirmation: slow/Range-ignored source завершается unavailable, descendants остановлены → test `seed_deadline_terminates_descendants_without_url_leak` in `tests/screen-layout-media.test.ts` (fails if only Python killed).
AM-3 (reuse audit): восстановить два stale guards как настоящие falsifiers без перепиновки font/ONNX. Confirmation: неправильный порядок слоёв ломает проверку → test `screen_watermark_is_last_and_action_remains_visible` in `tests/screen-layout-media.test.ts` (fails if overlays reordered).
AM-4 (RISK-01 qcsd-risk; TST-01 qcsd-testability): ZF-06/AC03 теперь гарантируют live pixels внутри подтверждённой ROI, без identity/subsample обещания; внешний face/заморозка запрещены, observed negative sample veto wholeclip. Confirmation: fixtures A→B и короткий blank остаются live source ROI, UI показывает предел → test `identity_and_subsample_changes_preserve_live_roi_without_identity_claim` in `tests/screen-layout-media.test.ts` (fails on frozen A/external face; не требует невозможного identity veto).
AM-5 (ACC-01 qcsd-accessibility): доступные имя/единицы/значение и min/max синхронны с выбранной целью и clamped canonical ROI. Confirmation: camera target и extreme width меняют также x readout/value → test `roi_accessible_values_follow_target_and_clamp` in `tests/browser/clip-layout.test.ts` (fails on static screen label/stale coordinate).
AM-6 (ACC-02 qcsd-accessibility): именованный modal, keyboard focus/restore/Escape, semantic status announcements с причиной/действием без polling дублей. Confirmation: Escape без apply и единственное объявление каждого состояния → test `confirmation_focus_and_semantic_status_announcements` in `tests/browser/clip-layout.test.ts` (fails on focus loss/repeated live event); manual screen-reader QA отдельно.
AM-7 (ACC-03 qcsd-accessibility; UX-03 qcsd-ux): pause остальных refs на каждом play всех трёх media, включая уже selected clip. Confirmation: все шесть направлений и close/change clip оставляют один audible → test `every_media_play_pauses_the_other_two` in `tests/browser/clip-layout.test.ts` (fails if arbitration depends on selection change).
AM-8 (SEC-01 qcsd-security): native max_redirects=0 в обоих children, exact origin/scheme, TLS, closed errors; unsupported policy→unavailable, без proxy. Confirmation: same/cross-origin/downgrade3xx не дают второго запроса или URL canary в диагностике → test `seed_redirects_are_refused_before_followup_request` in `tests/screen-layout-media.test.ts` (fails on default redirects8/missing ffprobe flags).
AM-9 (SEC-02 qcsd-security): exact seed/legacy runtime union и authoritative DB eligibility/revision/epoch до source. Confirmation: unknown/mixed/extra messages не дают sign/read/claim/render/quota side effects → test `render_dispatch_rejects_unknown_mixed_payloads_without_side_effects` in `tests/queue-redis.integration.test.ts` (fails on fallback-to-legacy); valid stale/foreign/inactive/expired identities дополнительно → test `seed_claim_rechecks_owner_retention_revision_and_epoch` in `tests/clip-layout.integration.test.ts` (fails if authority only checked in web).
AM-10 (UX-01 qcsd-ux): checked sessionStorage envelope и явные restored/conflict/lost states; blocked storage предупреждает до ухода, native leave cancel сохраняет draft. Confirmation: late seed/poll/navigation/back/refresh не подменяют draft → test `dirty_layout_survives_navigation_reload_and_late_seed` in `tests/browser/clip-layout.test.ts` (fails if mount restores published over dirty); отказ storage/отмена → test `storage_failure_warns_before_loss_and_cancel_keeps_draft` in `tests/browser/clip-layout.test.ts`.
AM-11 (UX-02 qcsd-ux): initial03 focus=null/whole-screen явно объяснён; camera seed не action seed, прежний focus текущего source сохраняется. Confirmation: good/ambiguous seed не придумывает focus и не требует manual ROI → test `initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only` in `tests/browser/clip-layout.test.ts` (fails if ready camera implies ready action).
AM-12 (UX-04 qcsd-ux, genuine R2): accepted/pending не означают публикацию и не удаляют local envelope; failed после reload восстанавливает editable latest draft, submitted intent отделён от поздних правок. Automatic clear только при authoritative успешной публикации точно совпавшего intent/config/sourceRevision и неизменённой draftVersion. Confirmation: accepted→reload→failed сохраняет редактируемый draft без нового apply → test `accepted_reload_failed_restores_editable_layout_draft` in `tests/browser/clip-layout.test.ts` (fails on clear-at-accepted); точная publication очищает соответствующий envelope → test `published_layout_clears_only_matching_draft` in `tests/browser/clip-layout.test.ts` (fails on never-clear); поздний publish не очищает late edits, включая A→B→A → test `late_draft_edits_survive_older_publication` in `tests/browser/clip-layout.test.ts` (fails on clear-on-any-success/config-only). TASK-5 реализует, TASK-7 проверяет; source/queue/payment/UI scope не меняется.

Все11 QCSD conditions имеют own R3 verification; финальный06 — отдельный post-ideation planner artifact. Ownership не объединён: AM-4 и AM-7 покрывают по два IDs. TASK-1/4→AM-4; TASK-3→AM-8/9; TASK-5→AM-5/6/7/10/11/12; TASK-7 проверяет все. Stage/checkpoint/K1/K2/root GO pending, TASK-0 блокирует код.

EXPECTED_CODE_TARGETS:
- packages/shared/src/screen-layout.ts
- packages/shared/src/cut-timeline.ts
- packages/db/migrations/032_clip_layout.sql
- packages/db/src/clip-layout.ts
- packages/db/src/index.ts
- packages/db/src/render.ts
- packages/queue/src/queues.ts
- apps/worker/src/render/screen-layout.ts
- apps/worker/src/render/compaction.ts
- apps/worker/src/render/faces.ts
- apps/worker/assets/scripts/detect_faces.py
- apps/worker/src/render/teaser.ts
- apps/worker/src/render/ffmpeg.ts
- apps/worker/src/workers/layout-seed.ts
- apps/worker/src/workers/render.ts
- apps/worker/src/runtime.ts
- apps/web/src/server/clip-layout.ts
- apps/web/src/server/screen.ts
- apps/web/src/server/screen-runtime.ts
- apps/web/src/server/trpc.ts
- apps/web/src/server/queue-runtime.ts
- apps/web/src/server/upload-runtime.ts
- apps/web/src/server/watchdog.ts
- apps/web/src/app/api/trpc/[trpc]/route.ts
- apps/web/src/lib/screen-contract.ts
- apps/web/src/lib/rpc.ts
- apps/web/src/app/clips/ClipLayoutChoice.tsx
- apps/web/src/app/clips/ClipLayoutPreview.tsx
- apps/web/src/app/clips/clip-layout.module.css
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- tests/screen-layout.test.ts
- tests/screen-layout-media.test.ts
- tests/clip-layout.integration.test.ts
- tests/browser/clip-layout.test.ts
- tests/render.test.ts
- tests/queue-redis.integration.test.ts
- scripts/test-framing-mutations.mjs
- vitest.config.ts
- vitest.browser.config.ts
- apps/web/src/server/clip-music.ts
- apps/worker/assets/fonts/ClipMakerNarrow-Bold.ttf
- apps/worker/assets/models/face_detection_yunet.onnx
- apps/worker/src/render/format.ts
- apps/worker/src/render/framing-plan.ts
- packages/db/src/attempts.ts
- packages/db/src/quota.ts
- packages/shared/src/server/original-source.ts
- packages/shared/src/watermark-metrics.json
- packages/shared/src/watermark.ts
- tests/browser/mockup-ui-realization.test.ts
- tests/browser/video-screen.test.ts
- tests/clip-cta-rerender.integration.test.ts
- tests/clip-music-choice.integration.test.ts
- tests/compaction-media.test.ts
- tests/framing-media.test.ts
- tests/render-failure.test.ts
- tests/render-storage.test.ts
- tests/render.integration.test.ts
