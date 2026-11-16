# Финальный SPARC-GOAP план screen + face

Статус: **документ Step6 готов после actual QCSD closure; TASK-0 блокирует code admission**. Планировщик `gpt-6-astra xhigh` отличается от автора кода `gpt-6.1-sol high`. Root evaluate R3: exit0/closed, nonce `0276c1f3-2f7b-4e38-96c4-10258020aca1`, revision `e66723874cc112533766c6896c800786109567d430efd4f5a7ff1b30382acfdd`, unresolved/reasons[]. Workflow stage/checkpoint, K1/K2 и root GO остаются pending; наличие финального плана не разрешает код. Финальный06 подготовлен после этой проверки и не объявляется отдельно просмотренным шестью origin reviewers.
Inputs read: 01_requirements.md, 02_research.md, 02_reuse_inventory.md, 03_adr, 03_shift_left.md, 04_domain_model.md, 05_architecture.md, requirements-revision.json, source-pins.json, AGENTS.md, CLAUDE.md, docs/model-matrix.md, docs/review-policy.md.

## Goal state / SPARC

Сейчас готовые clips не имеют screen config/seed; существующие attempts, quota, versioned publish и Original access переиспользуются. Актуальный test coverage этим planning run не измерялся. Цель:03 по умолчанию в explicit screen+face,01/02 в дополнительных настройках; автоматическое предложение камеры, просмотр всего клипа и явное идемпотентное применение к одному clip. Old MP4 и source credits сохранены.

Specification:01/OpenSpec pins + ADR-001…004. Pseudocode: алгоритмы ниже. Architecture:04/05. Refinement: минимальные RED→GREEN проверки реальных geometry/DB/queue. Completion: одна стабильная ревизия, обязательные gates, независимый QE, code/spec anti-drift и тестовая поставка.

## Tasks

- TASK-0 (ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10): закрыть фактическую зависимость Original **до K1/K2 и допуска Zoom к коду**: дождаться genuine independent SOURCE QE/acceptance точного финального Original artifact, затем root последовательно интегрирует принятую ревизию canonical shared leaf, route, OriginalSource и VideoDetail. Записать actual dependency proof/SHAs на интегрированной ревизии и проверить seam по списку ниже; tentative код/прежний E2E не являются этим proof. Depends:none; SPARC:specification. Done: source-accepted Original действительно интегрирован, immutable source/metadata/server-only import/media seam соответствуют закрытым ADR, evidence связан с exact revision. Сейчас BLOCKED/PENDING dependency, не completed. QCSD closed и UI approval известны; workflow checkpoints/K1/K2/root GO выполняет root только после этого prerequisite.
- TASK-1 (ADR-001, ADR-003; ZF-01, ZF-03, ZF-04, ZF-06, ZF-09; AC02, AC03, AC04): создать shared closed config/ROI validator и pure output geometry; перенести существующую pure cut timeline без изменения алгоритма с worker re-export. Импортировать согласованный `originalSourceRevision` из `@clipmaker/shared/server/original-source`; read-only leaf принадлежит Original, root shared index не re-export-ит его. Files:shared2,compaction,vitest aliases. Depends:TASK-0; SPARC:pseudocode/architecture. Test:`tests/screen-layout.test.ts` и existing compaction tests. Done: malformed/odd/rotation/SAR/fallback/protected zones и midpoint mapping проверены; прежний timing не изменился.
- TASK-2 (ADR-002, ADR-004; ZF-07, ZF-08, ZF-10; AC05, AC06): additive migration032, intent/seed repository, nullable published layout; exact replay, sourceRevision, seed CAS/lease; thin service и RPC wiring. Reuse owner locks, retention, quota и leaseAttemptTx. Files:DB migration/clip-layout/index/render, web clip-layout/trpc/queue-runtime/upload-runtime/route. Depends:TASK-1; SPARC:architecture/refinement. Test:`tests/clip-layout.integration.test.ts` на реальном PostgreSQL, включая populated migration, concurrent keys, timeout retry, quota rollback, erasure. Done:1 accepted operation/1 quota debit; source charge/STT/select deltas0.
- TASK-3 (ADR-004, ADR-001; ZF-01, ZF-04, ZF-06, ZF-07; AC01, AC03): добавить seed discriminant и priority1024 в существующую render queue; закрытый runtime parser exact seed/legacy (unknown/mixed/extra terminal rejected, без fallback/side effects), authoritative owner/active/retention/revision/epoch перед source access и publish, bounded handler, existing S3 signer с внутренним endpoint и origin/scheme check, native ffprobe+ffmpeg max_redirects=0/TLS/closed diagnostics,30s/max2 attempts, завершение Python и дочернего FFmpeg, YuNet внутри candidate ROI, watchdog delivery. Сохранять proposal из уже полученных initial-render данных без второго download. Files:queues,workers/layout-seed,runtime,faces,detect_faces,render/screen-layout,watchdog. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/queue-redis.integration.test.ts`,`tests/clip-layout.integration.test.ts`,`tests/screen-layout-media.test.ts` в worker image. Done: camera proposal без обязательного ручного crop;0 render attempt/quota/published writes; terminal cache не запускается refresh; deadline/privacy/priority подтверждены.
- TASK-4 (ADR-001, ADR-002; ZF-03, ZF-06, ZF-08, ZF-09, ZF-10; AC02, AC03, AC04, AC06): additive screen dispatch до ASS, shared geometry и camera veto только по наблюдениям в подтверждённой ROI, проверяемые live pixel bounds и identity/subsample limitations (AC03), один compacted stream, optional teaser position, прежние music/CTA/watermark. Read intent либо published config; включить exact config/resolved outcome в storage hash и fenced publish. Files:render/screen-layout,ffmpeg,teaser,workers/render,db/render. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/screen-layout-media.test.ts`, existing `tests/render.integration.test.ts`,`tests/render-storage.test.ts`,`tests/render-failure.test.ts`,`tests/clip-music-choice.integration.test.ts`,`tests/clip-cta-rerender.integration.test.ts`,`tests/framing-media.test.ts`,`tests/compaction-media.test.ts`. Done: реальные pixel/time assertions, old MP4 сохранён, music/CTA наследуют layout; invalid nonNULL config не возвращается в legacy.
- TASK-5 (ADR-003, ADR-002, ADR-004; ZF-01, ZF-02, ZF-04, ZF-05, ZF-07, ZF-08, ZF-10; AC01, AC05, AC07, AC08, AC09, AC10): read-only layoutInfo и настоящая quota projection и session-derived accountScope в layoutInfo; добавить новые методы в closed `lib/rpc.ts` union; отдельные Choice/Preview/CSS модули; Original metadata/Range;03 default с auto-seed только для pristine draft; local radio/ROI с динамическими accessible labels/value/clamp, safe initial focus=null/whole-screen пояснение, существующий confirm dialog с keyboard/focus/semantic status; sessionStorage draft по ADR-003 с явным restored/conflict/storage-failure/beforeunload, стабильный request key после timeout/reload и mounted player при polling. UX-04: сохранять current draftVersion/layout и immutable submitted snapshot при accepted/pending/reload/failed; после failed восстановить editable latest draft; authoritative exact published intent/config/source + unchanged draftVersion разрешают clear, late edits/ABA не удалять. Каждый play preview/published/Original вызывает thin parent pause других refs независимо от selected clip. Root монтирует ClipCard/VideoDetail. Depends:TASK-1,TASK-2,TASK-3 и интегрированный Original контракт; SPARC:refinement. Test:`tests/browser/clip-layout.test.ts` mounted Chromium/WebKit с real video,390/1440, обе темы; existing `tests/browser/video-screen.test.ts`,`tests/browser/mockup-ui-realization.test.ts`. Done: retained clip просматривается целиком; draft/cancel0 render calls; no S3 props; dirty draft не затирается.
- TASK-6 (ADR-001; ZF-09, ZF-10; AC04): восстановить stale order guard в`tests/render.test.ts` и отсутствующий semantic anchor в`scripts/test-framing-mutations.mjs`. Legacy no-pad остаётся scoped к legacy; font/ONNX pins неизменны. Depends:TASK-4; SPARC:refinement. Test: намеренно неправильный graph→RED с >0 tests, восстановленный→GREEN с >0 tests; unique mutation match. Done: нет indexOf(-1) false green/no-match PASS; SHA не перепривязаны ради тестов.
- TASK-7 (ADR-001, ADR-002, ADR-003, ADR-004; ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07, AC08, AC09, AC10): root последовательно интегрирует общие UI/runtime файлы, фиксирует ревизию; один общий прогон, дискриминация, code/spec anti-drift, independent code-critic/security/QX и fleet QE с чистым входом. Depends:TASK-3,TASK-4,TASK-5,TASK-6; SPARC:completion. Done: все обязательные проверки имеют terminal result; skips не доказательство; реальные ограничения и media acceptance не выдуманы.
- TASK-8 (ZF-05, ZF-08, ZF-10; AC04, AC07): небольшие проверенные commits и mirror push по AGENTS; тестовая VPS копия одного artifact, migration→worker→web, synthetic E2E и отдельно разрешённое private wholeclip QA; ссылка и инструкция владельцу. Depends:TASK-7; SPARC:completion. Done: owner acceptance и release boundary контролирует root. Cloud/production/DNS/real charges этим планом не разрешены; rollback сохраняет данные и дожидается drain active intents новым worker.

## TASK-0: обязательный actual dependency check

Текущий факт: независимая SOURCE-приёмка Original и merge принятого артефакта ещё **PENDING**. Сообщённые координатором candidate Cloud/native Next E2E16/16 и наличие написанного кода не закрывают зависимость: в Original ещё уточняется lifetime long request/GC/default timeout, и итоговая ревизия должна получить собственную SOURCE-проверку. Этот план не присваивает чужие тесты Zoom и не пинит tentative source как accepted.

Root до снятия TASK-0 фиксирует:

1. Реальную SOURCE receipt/итог независимого QE Original с точным финальным artifact/commit SHA и terminal results после последних исправлений lifetime; не предыдущую ревизию. Сохранность auth/retention/private Range и долгих запросов проверяет Original-поток в его scope.
2. Фактическую интеграцию принятого артефакта в целевую рабочую ревизию: `packages/shared/src/server/original-source.ts`, `apps/web/src/app/api/videos/[videoId]/original/route.ts`, `apps/web/src/app/videos/[videoId]/OriginalSource.tsx` и `VideoDetail.tsx`. Записать resulting revision/file hashes; конфликтные правки не выдавать за исходный принятый SHA без соответствующей сверки. Никакого импорта из candidate worktree.
3. На интегрированных bytes подтвердить canonical import `@clipmaker/shared/server/original-source`, общий sourceRevision и existing Original GET/HEAD/Range/metadata union из ADR-003. Предоставленная root tentative сигнатура `originalSourceRevision(videoId:string, objectKey:string, uploadId:string|null|undefined, actualBytes:string|bigint|number)` — ожидаемый seam, не accepted-source evidence. Не re-export-ить server leaf в browser root index, не создавать дубликат helper или source route.
4. Для media arbitration использовать native play capture в уже планируемом Zoom parent либо тонкий callback реального интегрированного компонента; обеспечить каждый play всех трёх плееров, без зависимости от selectedClipId. Существующие16 editable targets Original не увеличивать ради Zoom; новые страницы/custom controls не нужны. Реализация этого Zoom callback остаётся TASK-5 после допуска, а TASK-0 проверяет пригодность seam.
5. Заполнить pending proof в `step6-plan-snapshot.json`/actual dependency record, актуализировать source pins **после** интеграции и сообщить exact revision. Если source seam требует изменения закрытого контракта, остановить admission и передать конкретный issue root; не переписывать прошедший core9 автоматически. Затем root выполняет supported stage/checkpoint и K1/K2 на фактическом плане/ревизии, выдаёт code GO отдельно.

TASK-0 не выполнен этим документом. Stage/checkpoint, K1/K2, код и коммиты не запускать до его реального завершения.

## Pseudocode

Prepare: validate/session/owner → source identity → cache lookup → при отсутствии ensure pending → enqueue identity. Worker: closed runtime parser → authoritative eligibility/revision lookup → claim CAS → recheck перед sign/read → native analysis с max_redirects=0 с deadline → candidate rules → final CAS ready/unavailable. Radio/read не повторяют prepare. Apply: canonical validation/reviewed/source revision → video/clip locks → exact replay → version/busy/retention → quota1 → render_version++ → lease+intent → commit → enqueue. Render: fenced snapshot → source/cut plan → screen branch либо legacy → existing effects/watermark → immutable PUT → fenced keys/layout publish; fail сохраняет old file.

## Dependency order и parallel groups

DAG:0→1→2→{3,4};{1,2,3,Original}→5;4→6;{3,4,5,6}→7→8. Планируемая параллельность исполнения открывается только после actual TASK-0 и root admission/K1/K2; затем изолированная renderer работа может идти параллельно seed/API после contract freeze; общие ffmpeg/render изменения — последовательно. Реальных исполнителей назначает root по доступным slots. Проверяющие получают стабильную ревизию; исходники во время прогона не меняются. Общие ClipCard/VideoDetail/package файлы root интегрирует после Original.

## Checkpoints и команды проверки

Сначала genuine TASK-0, затем до кода: relevant recall, supported dz records после реальных router/requirements/ADR/ideation/plan этапов; K1 для всех новых module/export names. Closed ideation receipt не заменяет отдельные stage/checkpoints. Final K2: `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/zoom-screen-focus --tier=XL --require-requirements`. CLI help/path сверить перед запуском; gate сейчас не выполнялся. K2 не распознаёт все ZF IDs автоматически: ручная trace table остаётся обязательной. Fresh advisory challenge для ADR/плана на другой модели по model-matrix.

Targeted команды в изолированном test stack, Node22, project-pinned dependencies: `npm test -- --run tests/screen-layout.test.ts tests/clip-layout.integration.test.ts tests/queue-redis.integration.test.ts`; media: `npm test -- --run tests/screen-layout-media.test.ts tests/framing-media.test.ts tests/compaction-media.test.ts`; browser: `npm exec -- vitest run --config vitest.browser.config.ts tests/browser/clip-layout.test.ts`. Для actual OpenCV нужен worker image; отсутствие cv2 — NOT EXECUTED. Synthetic fixture media воспроизводимы; private source не Git.

Один общий прогон final stable revision: `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm exec -- vitest run --config vitest.browser.config.ts`, `npm run test:responsive`, `npm run build` в действующем project test stack/CI. Full suite сохраняет credit/payments/retention регрессию без реальных денег. `node scripts/test-framing-mutations.mjs` запускается после anchor repair. Новые safeguards получают intentional broken RED. Mandatory feature-adr/dz extended QE и Step9 сохраняются. После local fix повторять affected checks; ещё один общий прогон только при новой широкой зависимости, регрессии или незакрытом риске с объяснением. Владеющая сессия ждёт terminal result долгой команды.

## Risk assessment

Высокие риски и falsifiers —03_shift_left: money/idempotency→real PostgreSQL; data/fence→late publish; privacy→URL sentinels+owner404; media→real pixel/time checks; seed confidence→wholeclip evidence и explicit limits; priority→измеренный nonpreemptive deadline30s. Новых npm/OS/ML dependencies нет.EDITABLE40 targets (26 existing +14 new) включают thin wiring и test aliases. Отдельные READONLY19 dependencies/regression files перечислены в `scope-inventory.json` и в file score не входят. По инструментальной сверке root11.11.2026 native source/QE gate измеряет их только в EXPECTED_CODE_TARGETS: trailing block содержит59 уникальных измеряемых путей (40 editable +19 read-only). Это measurement membership, не разрешение редактирования; все19 read-only запрещены к изменениям Zoom-автором, включая canonical Original leaf. Write authority остаётся40; semantic scope/tier не расширяются. Root принялXL по quick decision tree30+ editable files; сумма16 остаётся в score bandL, dimension4 сам по себе даёт только minL. Не убирать проверки и не склеивать модули ради L14. После реализации пересчитать actual diff. Если migration032 занята другой веткой, root назначает свободный номер и обновляет target до кода.

Оценка после gates: implementation110–180min; проверки60–100min; independent QE/delivery30–60min; ожидание owner acceptance отдельно. Это оценка, не измеренный прошедший срок; root согласует с общим ETA.

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

AM-4…11 — сохранённые поправки по R1 conditions; AM-12 — узкая поправка UX-04 после genuine R2 evaluate. Это авторская работа, не независимая верификация. Условия/ownership не объединены: общие исправления AM-4/AM-7 обслуживают по два исходных ID. TASK-1/4 реализуют AM-4, TASK-3 AM-8/9, TASK-5 AM-5/6/7/10/11/12; TASK-7 проверяет все. Точные фальсификаторы/прочитанные зависимости в `amendments/qcsd-r2-design.md`. Все11 исходных QCSD conditions получили own verification в R3 и actual evaluate closed; точные условия/ownership не меняются. Финальный план сохраняет AM-1…12 и test oracles. Это post-ideation Step6 документ, не новая independent verification финального06; TASK-0, stage/checkpoint, K1/K2 и root GO всё ещё pending.

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
