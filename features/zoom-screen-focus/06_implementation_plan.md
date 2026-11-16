# SPARC-GOAP план screen + face

Планировщик `gpt-6-astra xhigh`; кодер `gpt-6.1-sol high`. PhaseA reworkR2 frozen; author25 checks/types/lint PASS, originating focused R2 verified exact fix; не Source QE. Original принят/интегрирован; PhaseB gates/GO pending. Owner resumed; root подтвердил A freeze. QCSD R3 closed; core9 прежний;06 отдельно6 ролями не reviewed.
Inputs read: 01_requirements.md, 02_reuse_inventory.md, 03_adr, 04_domain_model.md, 05_architecture.md, source-pins.json, AGENTS.md, docs/model-matrix.md.

## Goal state / SPARC

Goal:03/advanced01–02, seed/wholeclip/apply, сохранность MP4/credits. Helper передаёт обязательные requirements+ADR Decision/Confirmation целиком. SPARC:specification01/OpenSpec; architecture04/05; pseudocode ADR-001…004; refinement1…6; completion7/8. Coverage не измерялся.

## Tasks

- TASK-0: Original SOURCE acceptance/integration подтверждены refs ниже. Depends:none; SPARC:specification. Dependency evidence готово; B admission отдельно pending.
- TASK-1 (ADR-001, ADR-003; ZF-01, ZF-03, ZF-04, ZF-06, ZF-09; AC02, AC03, AC04): A — shared geometry/timeline+unit tests/aliases; B — compaction re-export/browser aliases/accepted Original reuse. Depends:A gates; B TASK-0. Test:screen-layout/compaction-media. Done:ADR geometry/fallback/timing, legacy algorithm прежний.
- TASK-2 (ADR-002, ADR-004; ZF-07, ZF-08, ZF-10; AC05, AC06): migration032/DB intent/seed/render; service/RPC/projection/runtime; `packages/shared/src/enums.ts` canonical SQL_ENUMS для032, catch-all `tests/enums.test.ts` не ослаблять. Depends:TASK-0,1B. Test:real PG clip-layout integration/populated migration/replay/concurrency/rollback/erasure. Done:1 admission/debit,0 source charge/STT/select, old publication.
- TASK-3 (ADR-004, ADR-001; ZF-01, ZF-04, ZF-06, ZF-07; AC01, AC03): queues/seed/runtime/faces/watchdog. Depends:TASK-0,1B,2. Test:queue-redis/clip-layout integration/screen-layout-media. Done:ADR-004 CAS/privacy/priority/deadline/descendants,0 render/quota/publish; reuse initial-render data.
- TASK-4 (ADR-001, ADR-002; ZF-03, ZF-06, ZF-08, ZF-09, ZF-10; AC02, AC03, AC04, AC06): A — isolated screen-layout graph+synthetic pixel/time tests; B — `apps/worker/src/render/probe.ts` producer реального SAR для ADR-001 (не угадывать1); FFmpeg/teaser/worker DB input, camera veto/fence/publish. Depends:A1A; B0,1B,2,4A. Test:screen-layout-media + render/storage/failure/music/CTA/framing regressions. Done:ADR pixel/time/fallback/fence; A alone не completes TASK-4.
- TASK-5 (ADR-003, ADR-002, ADR-004; ZF-01, ZF-02, ZF-04, ZF-05, ZF-07, ZF-08, ZF-10; AC01, AC05, AC07, AC08, AC09, AC10): web/RPC, Choice/Preview/CSS, ClipCard/VideoDetail: ADR-003 safeguards. Depends:TASK-0,1B,2,3. Test:browser clip-layout/regressions; real video Chromium/WebKit390/1440, обе темы/manual screen reader. Done:ADR-003 + AM-5/6/7/10/11/12. Logout ADR-003: `SignOut.tsx` + browser-only `lib/clip-layout-draft.ts` делят с Choice prefix `n5-clip-layout:v1:`. Только successful logout POST очищает layout session keys на любой странице/без mounted Choice; failed logout сохраняет draft. Не подписываться на generic support-clear; support/upload/other storage keys не трогать. Helper возвращает actual read-back boolean; один local event с результатом сбрасывает mounted memory/review/decoder до hard redirect; blocked storage сообщает cleanup failure, не ложный logout failure/успех очистки, чужой account draft не восстанавливается. Oracle в existing `tests/browser/clip-layout.test.ts`: success/unmounted→layout-only clear; failure→retain; support focus/unmount→retain; blocked storage→honest fallback/no cross-account restore.
- TASK-6 (ADR-001; ZF-09, ZF-10; AC04): stale order guard `tests/render.test.ts` и anchor `scripts/test-framing-mutations.mjs`. Depends:TASK-4B. Test:broken graph→RED/restored→GREEN, >0 tests/unique match. Done:indexOf(-1)/no-match не PASS; no-pad legacy-scoped; font/ONNX/metrics SHA прежние.
- TASK-7 (ADR-001, ADR-002, ADR-003, ADR-004): root integration/freeze, общий прогон, discrimination/code-spec anti-drift, independent code-critic/security/QX/fleet QE. Depends:TASK-3,4B,5,6. Done:terminal results, skip/no-match не PASS; QE independently ищет source/tests из approved docs, без выводов автора. Fixturecompat:6 inline Vite `configFile:false` harnesses — shared TS aliases `screen-layout`/`cut-timeline`; mockup: navigation `export const usePathname=()=>window.location.pathname;` + virtualentry import/mount existing `WorkspaceSettings` via `h(WorkspaceSettings,{initialTheme:'dark',initialLayout:'workspace'})` рядом с Header; assertions/mutations/guards/profiles и production package/imports не менять. DB fixture exception:28→30; arrayContaining += clip_layout_intent,clip_layout_seed; comment031→032.
- TASK-8 (ZF-05, ZF-08, ZF-10; AC04, AC07): small verified commits/mirror pushes; test VPS migration→worker→web, synthetic E2E+отдельно разрешённый private wholeclip QA, ссылка owner. Depends:TASK-7. Done:owner acceptance UI/media до production; Cloud/DNS/real charges не разрешены. Rollback:stop apply, drain intents новым worker до старого.

## Dependency order / parallel groups

PhaseA historical admission выполнен root; six files реализованы/исправлены Sol. R2 author25 tests/types/lint PASS; originating focused R2 exact fix verified; не Source QE. Exact6:
- `packages/shared/src/screen-layout.ts`
- `packages/shared/src/cut-timeline.ts`
- `apps/worker/src/render/screen-layout.ts`
- `tests/screen-layout.test.ts`
- `tests/screen-layout-media.test.ts`
- `vitest.config.ts` — только aliases двух новых shared modules.

A: pure values/geometry; timing из compaction без смены алгоритма (read-only parity); graph получает controlled observations, detector не запускает. Только local synthetic FFmpeg; S3/PG/HTTP/jobs/model calls, DB/RPC/queue/publish/UI/Original leaf/legacy wiring запрещены. Compaction re-export только B. A tests не доказывают seed/production; общие A/B files менять последовательно.

DAG (A R2 frozen/focused fix verified;0 integrated): {0,1A}→1B→2; {1B,2}→3; {0,1B,2,4A}→4B; {0,1B,2,3}→5;4B→6;{3,4B,5,6}→7→8. A/B — части прежних TASK. B: fresh gates/context/root admission pending, focused R2 terminal получен, не Source QE. Shared integration последовательно; tests/QE на stable revision без edits.

## TASK-0: PhaseB dependency proof

Original SOURCE closed rounds2, revision `3258a156402c6770b3c9d9446534205dc3a822faa6ee348727b7429b8c83628d`, nonce `30a1c508-14fb-44e3-a78a-81e9c1d67b5e`. Accepted commit `98e647e2cf4ee83eb38f2f5557fb8fc024386294`→root merge `c66b9ef4227580adad8fb5664c6a7650764518f1`. Exact receipt/integration SHA и seam refs в `step6-plan-snapshot.json`; root verified83 accepted Git blobs. На working tree82/83 exact, vitest имеет только дополнительно2 прежнихA aliases.

Canonical leaf `@clipmaker/shared/server/original-source`/metadata/sourceRevision/GET/HEAD/Range присутствуют; source files совпадают с accepted manifest. OriginalSource смонтирован в VideoDetail, native play pause siblings есть; полная symmetric coordination3 media ещё TASK-5. Zoom не меняет accepted Original leaf/route/component; закрытые contracts прежние. Postmerge/runtime/Zoom QE этим чтением не объявляются. Original accepted scope23 editable исторический; Zoom его не расширяет.

## Checkpoints / проверки

PhaseA receipts historical в snapshot. До B root: recall, current scope/checkpoints/K1 новых names; K2 `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/zoom-screen-focus --tier=XL --require-requirements`; ZF trace/advisory challenge по model-matrix. B: fresh admission/full context/root GO pending. Root A freeze/focused R2 terminal подтверждены; B GO только после current gates и решения root.

Node22/project-pinned targeted: `npm test -- --run tests/screen-layout.test.ts tests/screen-layout-media.test.ts` для A, только isolated cases. B: все ADR Confirmation integration/media/browser suites по TASK-2…5. PG/Redis реальные; OpenCV/YuNet в worker image, missing cv2 = NOT EXECUTED. Synthetic воспроизводимы; private media не Git.

Один общий stable прогон: `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm exec -- vitest run --config vitest.browser.config.ts`, `npm run test:responsive`, `npm run build`; credits/payments/retention regression без real money. Guards: `node scripts/test-framing-mutations.mjs`, intentional RED обязателен. Extended QE/Step9 mandatory. Fix→affected checks; общий повтор только по named dependency/regression/risk. Владелец сессии ждёт terminal result.

## Risk assessment

Риски money/idempotency→PG; fence→late publish; privacy→owner404/canary; media→pixels/time; sampling→wholeclip; worker→30s/traffic. Falsifiers:ADR+AM. A не доказывает B; новых dependencies/queue/ML нет.
72 measured=51 editable+21 read-only, менять нельзя. Fixturecompat:6 новых editable paths + mockup read-only→editable. Прежние49 сохранены, включая screen.ts; 2 aliases в6 fixtures + mockup navigation/settings wiring. Original leaf чужой. XL прежний; tests не исключать. Root сверяет diff/migration032 collision.
Прежняя оценка полного объёма: implementation110–180min; checks60–100min; QE/delivery30–60min. Остаток после A/root resume пересчитать; owner pause отдельно.

## Amendments

AM-1 (root engineering11.11.2026): explicit cached seed-analysis допустим; radio/preview не создают render jobs/списаний. Confirmation:10 concurrent opens→1 seed operation и0 render quota → test `seed_prepare_is_cached_and_never_consumes_render_quota` in `tests/clip-layout.integration.test.ts` (fails if prepare leases render).
AM-2 (root engineering11.11.2026): не вводить worker Range proxy/малый byte cap; native Range+deadline/max attempts и measured traffic. Confirmation: slow/Range-ignored source завершается unavailable, descendants остановлены → test `seed_deadline_terminates_descendants_without_url_leak` in `tests/screen-layout-media.test.ts` (fails if only Python killed).
AM-3 (reuse audit): восстановить два stale guards как настоящие falsifiers без перепиновки font/ONNX. Confirmation: неправильный порядок слоёв ломает проверку → test `screen_watermark_is_last_and_action_remains_visible` in `tests/screen-layout-media.test.ts` (fails if overlays reordered).
AM-4 (RISK-01 qcsd-risk; TST-01 qcsd-testability): ZF-06/AC03 теперь гарантируют live pixels внутри подтверждённой ROI, без identity/subsample обещания; внешний face/заморозка запрещены, observed negative sample veto wholeclip. Confirmation: fixtures A→B и короткий blank остаются live source ROI, UI показывает предел → test `identity_and_subsample_changes_preserve_live_roi_without_identity_claim` in `tests/screen-layout-media.test.ts` (fails on frozen A/external face; не требует невозможного identity veto).
AM-5 (ACC-01 qcsd-accessibility): доступные имя/единицы/значение и min/max синхронны с выбранной целью и clamped canonical ROI. Confirmation: camera target и extreme width меняют также x readout/value → test `roi_accessible_values_follow_target_and_clamp` in `tests/browser/clip-layout.test.ts` (fails on static screen label/stale coordinate).
AM-6 (ACC-02 qcsd-accessibility): именованный modal, keyboard focus/restore/Escape, semantic status announcements с причиной/действием без polling дублей. Confirmation: Escape без apply и единственное объявление каждого состояния → test `confirmation_focus_and_semantic_status_announcements` in `tests/browser/clip-layout.test.ts` (fails on focus loss/repeated live event); manual screen-reader QA отдельно.
AM-7 (ACC-03 qcsd-accessibility; UX-03 qcsd-ux): pause остальных refs на каждом play всех трёх media, включая уже selected clip. Confirmation: все шесть направлений и close/change clip оставляют один audible → test `every_media_play_pauses_the_other_two` in `tests/browser/clip-layout.test.ts` (fails if arbitration depends on selection change).
AM-8 (SEC-01 qcsd-security): native max_redirects=0 в обоих children, exact origin/scheme, TLS, closed errors; unsupported policy→unavailable, без proxy. Confirmation: same/cross-origin/downgrade3xx не дают второго запроса или URL canary в диагностике → test `seed_redirects_are_refused_before_followup_request` in `tests/screen-layout-media.test.ts` (fails on default redirects8/missing ffprobe flags).
AM-9 (SEC-02 qcsd-security): exact seed/legacy runtime union и authoritative DB eligibility/revision/epoch до source. Confirmation: unknown/mixed/extra messages не дают sign/read/claim/render/quota side effects → test `render_dispatch_rejects_unknown_mixed_payloads_without_side_effects` in `tests/queue-redis.integration.test.ts` (fails on fallback-to-legacy).
AM-9 (SEC-02, продолжение): Confirmation: valid stale/foreign/inactive/expired identities дополнительно → test `seed_claim_rechecks_owner_retention_revision_and_epoch` in `tests/clip-layout.integration.test.ts` (fails if authority only checked in web).
AM-10 (UX-01 qcsd-ux): checked sessionStorage envelope и явные restored/conflict/lost states; blocked storage предупреждает до ухода, native leave cancel сохраняет draft. Confirmation: late seed/poll/navigation/back/refresh не подменяют draft → test `dirty_layout_survives_navigation_reload_and_late_seed` in `tests/browser/clip-layout.test.ts` (fails if mount restores published over dirty); отказ storage/отмена → test `storage_failure_warns_before_loss_and_cancel_keeps_draft` in `tests/browser/clip-layout.test.ts`.
AM-11 (UX-02 qcsd-ux): initial03 focus=null/whole-screen явно объяснён; camera seed не action seed, прежний focus текущего source сохраняется. Confirmation: good/ambiguous seed не придумывает focus и не требует manual ROI → test `initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only` in `tests/browser/clip-layout.test.ts` (fails if ready camera implies ready action).
AM-12 (UX-04 qcsd-ux, genuine R2): accepted/pending не означают публикацию и не удаляют local envelope; failed после reload восстанавливает editable latest draft, submitted intent отделён от поздних правок. Automatic clear только при authoritative успешной публикации точно совпавшего intent/config/sourceRevision и неизменённой draftVersion. Confirmation: accepted→reload→failed сохраняет редактируемый draft без нового apply → test `accepted_reload_failed_restores_editable_layout_draft` in `tests/browser/clip-layout.test.ts` (fails on clear-at-accepted); точная publication очищает соответствующий envelope → test `published_layout_clears_only_matching_draft` in `tests/browser/clip-layout.test.ts` (fails on never-clear); поздний publish не очищает late edits, включая A→B→A → test `late_draft_edits_survive_older_publication` in `tests/browser/clip-layout.test.ts` (fails on clear-on-any-success/config-only). TASK-5 реализует, TASK-7 проверяет; source/queue/payment/UI scope не меняется.

11 IDs/owners сохранены. TASK-1/4→AM-4;3→AM-8/9;5→AM-5/6/7/10/11/12;7 проверяет все. Phase ordering не gate receipt.

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
- apps/worker/src/render/probe.ts
- packages/shared/src/enums.ts
- apps/web/src/app/support/SignOut.tsx
- apps/web/src/lib/clip-layout-draft.ts
- tests/browser/original-video-access.test.ts
- tests/browser/ux-simplification.test.ts
- tests/browser/billing.test.ts
- tests/browser/mockup-ui-realization.test.ts
- tests/browser/upload-lifecycle.test.ts
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
- tests/browser/video-screen.test.ts
- tests/clip-cta-rerender.integration.test.ts
- tests/clip-music-choice.integration.test.ts
- tests/compaction-media.test.ts
- tests/framing-media.test.ts
- tests/render-failure.test.ts
- tests/render-storage.test.ts
- tests/render.integration.test.ts
- tests/enums.test.ts
- apps/web/src/lib/support-client.ts
- apps/web/src/server/auth-handler.ts
- tests/progress-screen.test.ts
- tests/database.integration.test.ts
