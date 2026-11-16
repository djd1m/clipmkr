# Черновик SPARC-GOAP плана screen + face

Статус: **DRAFT до genuine Step3.5 и root GO**. Это декомпозиция, не завершённый Step6; K1/K2 не запускались. Наличие файла не открывает coding gate.
Inputs read: 01_requirements.md, 02_research.md, 02_reuse_inventory.md, 03_adr, 03_shift_left.md, 04_domain_model.md, 05_architecture.md, requirements-revision.json, source-pins.json, AGENTS.md, CLAUDE.md, docs/model-matrix.md, docs/review-policy.md.

## Goal state / SPARC

Сейчас готовые clips не имеют screen config/seed; существующие attempts, quota, versioned publish и Original access переиспользуются. Актуальный test coverage этим planning run не измерялся. Цель:03 по умолчанию в explicit screen+face,01/02 в дополнительных настройках; автоматическое предложение камеры, просмотр всего клипа и явное идемпотентное применение к одному clip. Old MP4 и source credits сохранены.

Specification:01/OpenSpec pins + ADR-001…004. Pseudocode: алгоритмы ниже. Architecture:04/05. Refinement: минимальные RED→GREEN проверки реальных geometry/DB/queue. Completion: одна стабильная ревизия, обязательные gates, независимый QE, code/spec anti-drift и тестовая поставка.

## Tasks

- TASK-0 (ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07): завершить prerequisites — реальные requirements/ADR checkpoints,3 core +3 conditional QCSD, закрыть findings, зафиксировать final06 и K1/K2. UI согласован. Depends:none; SPARC:specification. Done: настоящий verdict и amendments. Автор кода `gpt-6.1-sol high` начинает только после root GO.
- TASK-1 (ADR-001, ADR-003; ZF-01, ZF-03, ZF-04, ZF-06, ZF-09; AC02, AC03, AC04): создать shared closed config/ROI validator и pure output geometry; перенести существующую pure cut timeline без изменения алгоритма с worker re-export. Импортировать согласованный `originalSourceRevision` из `@clipmaker/shared/server/original-source`; read-only leaf принадлежит Original, root shared index не re-export-ит его. Files:shared2,compaction,vitest aliases. Depends:TASK-0; SPARC:pseudocode/architecture. Test:`tests/screen-layout.test.ts` и existing compaction tests. Done: malformed/odd/rotation/SAR/fallback/protected zones и midpoint mapping проверены; прежний timing не изменился.
- TASK-2 (ADR-002, ADR-004; ZF-07, ZF-08, ZF-10; AC05, AC06): additive migration032, intent/seed repository, nullable published layout; exact replay, sourceRevision, seed CAS/lease; thin service и RPC wiring. Reuse owner locks, retention, quota и leaseAttemptTx. Files:DB migration/clip-layout/index/render, web clip-layout/trpc/queue-runtime/upload-runtime/route. Depends:TASK-1; SPARC:architecture/refinement. Test:`tests/clip-layout.integration.test.ts` на реальном PostgreSQL, включая populated migration, concurrent keys, timeout retry, quota rollback, erasure. Done:1 accepted operation/1 quota debit; source charge/STT/select deltas0.
- TASK-3 (ADR-004, ADR-001; ZF-01, ZF-04, ZF-06, ZF-07; AC01, AC03): добавить seed discriminant и priority1024 в существующую render queue; bounded handler, server-only signed source URL/native Range,30s/max2 attempts, завершение Python и дочернего FFmpeg, YuNet внутри candidate ROI, watchdog delivery. Сохранять proposal из уже полученных initial-render данных без второго download. Files:queues,workers/layout-seed,runtime,faces,detect_faces,render/screen-layout,watchdog. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/queue-redis.integration.test.ts`,`tests/clip-layout.integration.test.ts`,`tests/screen-layout-media.test.ts` в worker image. Done: camera proposal без обязательного ручного crop;0 render attempt/quota/published writes; terminal cache не запускается refresh; deadline/privacy/priority подтверждены.
- TASK-4 (ADR-001, ADR-002; ZF-03, ZF-06, ZF-08, ZF-09, ZF-10; AC02, AC03, AC04, AC06): additive screen dispatch до ASS, shared geometry и camera veto, один compacted stream, optional teaser position, прежние music/CTA/watermark. Read intent либо published config; включить exact config/resolved outcome в storage hash и fenced publish. Files:render/screen-layout,ffmpeg,teaser,workers/render,db/render. Depends:TASK-1,TASK-2; SPARC:refinement. Test:`tests/screen-layout-media.test.ts`, existing `tests/render.integration.test.ts`,`tests/render-storage.test.ts`,`tests/render-failure.test.ts`,`tests/clip-music-choice.integration.test.ts`,`tests/clip-cta-rerender.integration.test.ts`,`tests/framing-media.test.ts`,`tests/compaction-media.test.ts`. Done: реальные pixel/time assertions, old MP4 сохранён, music/CTA наследуют layout; invalid nonNULL config не возвращается в legacy.
- TASK-5 (ADR-003, ADR-002, ADR-004; ZF-01, ZF-02, ZF-04, ZF-05, ZF-07, ZF-08, ZF-10; AC01, AC05, AC07): read-only layoutInfo и настоящая quota projection; добавить новые методы в closed `lib/rpc.ts` union; отдельные Choice/Preview/CSS модули; Original metadata/Range;03 default с auto-seed только для pristine draft; local radio/ROI, существующий confirm dialog, стабильный request key после timeout и mounted player при polling. Root монтирует ClipCard/VideoDetail. Depends:TASK-1,TASK-2,TASK-3 и интегрированный Original контракт; SPARC:refinement. Test:`tests/browser/clip-layout.test.ts` mounted Chromium/WebKit с real video,390/1440, обе темы; existing `tests/browser/video-screen.test.ts`,`tests/browser/mockup-ui-realization.test.ts`. Done: retained clip просматривается целиком; draft/cancel0 render calls; no S3 props; dirty draft не затирается.
- TASK-6 (ADR-001; ZF-09, ZF-10; AC04): восстановить stale order guard в`tests/render.test.ts` и отсутствующий semantic anchor в`scripts/test-framing-mutations.mjs`. Legacy no-pad остаётся scoped к legacy; font/ONNX pins неизменны. Depends:TASK-4; SPARC:refinement. Test: намеренно неправильный graph→RED с >0 tests, восстановленный→GREEN с >0 tests; unique mutation match. Done: нет indexOf(-1) false green/no-match PASS; SHA не перепривязаны ради тестов.
- TASK-7 (ADR-001, ADR-002, ADR-003, ADR-004; ZF-01, ZF-02, ZF-03, ZF-04, ZF-05, ZF-06, ZF-07, ZF-08, ZF-09, ZF-10; AC01, AC02, AC03, AC04, AC05, AC06, AC07): root последовательно интегрирует общие UI/runtime файлы, фиксирует ревизию; один общий прогон, дискриминация, code/spec anti-drift, independent code-critic/security/QX и fleet QE с чистым входом. Depends:TASK-3,TASK-4,TASK-5,TASK-6; SPARC:completion. Done: все обязательные проверки имеют terminal result; skips не доказательство; реальные ограничения и media acceptance не выдуманы.
- TASK-8 (ZF-05, ZF-08, ZF-10; AC04, AC07): небольшие проверенные commits и mirror push по AGENTS; тестовая VPS копия одного artifact, migration→worker→web, synthetic E2E и отдельно разрешённое private wholeclip QA; ссылка и инструкция владельцу. Depends:TASK-7; SPARC:completion. Done: owner acceptance и release boundary контролирует root. Cloud/production/DNS/real charges этим планом не разрешены; rollback сохраняет данные и дожидается drain active intents новым worker.

## Pseudocode

Prepare: validate/session/owner → source identity → cache lookup → при отсутствии ensure pending → enqueue identity. Worker: claim CAS → native analysis с deadline → candidate rules → final CAS ready/unavailable. Radio/read не повторяют prepare. Apply: canonical validation/reviewed/source revision → video/clip locks → exact replay → version/busy/retention → quota1 → render_version++ → lease+intent → commit → enqueue. Render: fenced snapshot → source/cut plan → screen branch либо legacy → existing effects/watermark → immutable PUT → fenced keys/layout publish; fail сохраняет old file.

## Dependency order и parallel groups

DAG:0→1→2→{3,4};{1,2,3,Original}→5;4→6;{3,4,5,6}→7→8. Изолированная renderer работа может идти параллельно seed/API после contract freeze; общие ffmpeg/render изменения — последовательно. Реальных исполнителей назначает root по доступным slots. Проверяющие получают стабильную ревизию; исходники во время прогона не меняются. Общие ClipCard/VideoDetail/package файлы root интегрирует после Original.

## Checkpoints и команды проверки

До кода: relevant recall, supported dz records после реальных router/requirements/ADR/ideation этапов; K1 для всех новых module/export names. Final K2: `node /home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/zoom-screen-focus --tier=XL --require-requirements`. CLI help/path сверить перед запуском; gate сейчас не выполнялся. K2 не распознаёт все ZF IDs автоматически: ручная trace table остаётся обязательной. Fresh advisory challenge для ADR/плана на другой модели по model-matrix.

Targeted команды в изолированном test stack, Node22, project-pinned dependencies: `npm test -- --run tests/screen-layout.test.ts tests/clip-layout.integration.test.ts tests/queue-redis.integration.test.ts`; media: `npm test -- --run tests/screen-layout-media.test.ts tests/framing-media.test.ts tests/compaction-media.test.ts`; browser: `npm exec -- vitest run --config vitest.browser.config.ts tests/browser/clip-layout.test.ts`. Для actual OpenCV нужен worker image; отсутствие cv2 — NOT EXECUTED. Synthetic fixture media воспроизводимы; private source не Git.

Один общий прогон final stable revision: `npm run typecheck`, `npm run lint`, `npm test -- --run`, `npm exec -- vitest run --config vitest.browser.config.ts`, `npm run test:responsive`, `npm run build` в действующем project test stack/CI. Full suite сохраняет credit/payments/retention регрессию без реальных денег. `node scripts/test-framing-mutations.mjs` запускается после anchor repair. Новые safeguards получают intentional broken RED. Mandatory feature-adr/dz extended QE и Step9 сохраняются. После local fix повторять affected checks; ещё один общий прогон только при новой широкой зависимости, регрессии или незакрытом риске с объяснением. Владеющая сессия ждёт terminal result долгой команды.

## Risk assessment

Высокие риски и falsifiers —03_shift_left: money/idempotency→real PostgreSQL; data/fence→late publish; privacy→URL sentinels+owner404; media→real pixel/time checks; seed confidence→wholeclip evidence и explicit limits; priority→измеренный nonpreemptive deadline30s. Новых npm/OS/ML dependencies нет.EDITABLE40 targets (26 existing +14 new) включают thin wiring и test aliases. Отдельные READONLY19 dependencies/regression files перечислены в `scope-inventory.json` и в file score не входят. Root принялXL по quick decision tree30+ editable files; сумма16 остаётся в score bandL, dimension4 сам по себе даёт только minL. Не убирать проверки и не склеивать модули ради L14. После реализации пересчитать actual diff. Если migration032 занята другой веткой, root назначает свободный номер и обновляет target до кода.

Оценка после gates: implementation110–180min; проверки60–100min; independent QE/delivery30–60min; ожидание owner acceptance отдельно. Это оценка, не измеренный прошедший срок; root согласует с общим ETA.

## Amendments

AM-1 (root engineering11.11.2026): explicit cached seed-analysis допустим; radio/preview не создают render jobs/списаний. Confirmation:10 concurrent opens→1 seed operation и0 render quota → test `seed_prepare_is_cached_and_never_consumes_render_quota` in `tests/clip-layout.integration.test.ts` (fails if prepare leases render).
AM-2 (root engineering11.11.2026): не вводить worker Range proxy/малый byte cap; native Range+deadline/max attempts и measured traffic. Confirmation: slow/Range-ignored source завершается unavailable, descendants остановлены → test `seed_deadline_terminates_descendants_without_url_leak` in `tests/screen-layout-media.test.ts` (fails if only Python killed).
AM-3 (reuse audit): восстановить два stale guards как настоящие falsifiers без перепиновки font/ONNX. Confirmation: неправильный порядок слоёв ломает проверку → test `screen_watermark_is_last_and_action_remains_visible` in `tests/screen-layout-media.test.ts` (fails if overlays reordered).

QCSD amendments ещё не получены. Final Step6 добавит только реальные findings с собственным test id/path. Draft не объявляет K1/K2/ideation PASS.

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
