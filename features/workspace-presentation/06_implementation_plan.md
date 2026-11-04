# Первый инкремент workspace: исполнимый план после Q/R/T

Proposed; formal snapshot/convergence и реализация pending. 12 code targets, Tier:M (AM-8 SSR fixture; AM-9 local test helper).
Inputs read: 00_complexity_assessment.md, 01_requirements.md, 03_adr/001-workspace-preferences.md, 03.5_quality.md, 05_architecture.md; три raw QC quality/risk/testability; pinned modules/06 и реальный checker.

## Goal state
Оболочка/preferences/нейтральные токены на действующих блоках с ограниченной геометрией FR-1.
Не обещать полный UX HTML/hero/listbox/компактный Dashboard/весь8-screen redesign.
Coverage сейчас не измерена; каждый несущий инвариант имеет конкретное различающее испытание.
SPARC: specification=FR/ADR; pseudocode=document lifecycle/cookie; architecture=shared DOM;
refinement=RED/GREEN; completion=independent QE/existing stage/manual acceptance.

## Tasks

### TASK-0: Интегрировать документы и проверить actual snapshot — FR-1, FR-4, NFR-3, ADR-001
Description: сохранить source distinction Q/R/T в03.5; provenance AM1/AM3 исправлена на
coordinator-implementation-proposal. Uploadpath отдельно approved, recovery L отдельная фича.
Host formal prepare после переноса settled package в worktree; ADR файл только
03_adr/001-workspace-preferences.md, не ADR-001.md и не duplicate для обхода pathsFor.
Исходные reviewers сами focused verify/QC receipts на новом nonce; raw reports не closed.
SPARC Phase: specification. Files: feature/OpenSpec docs, не product targets. Depends:none.
Test: pinned routing/K1/K2 + formal snapshot/convergence actual receipts, без fake PASS.
Success Criteria: Q1–Q6/R1–R6/T1–T5 имеют реальные owners/verification, severity не забыта.

### TASK-1: Strict cookie и document snapshot — FR-1, FR-2, NFR-2, ADR-001
Description: новый workspace-layout module: six parser/enum exports + DocumentPreferences,
getDocumentPreferences/subscribeDocumentPreferences/updateDocumentPreferences/attachDocumentPreferenceSync.
Чистый parser, browser store WeakMap keyed current Document, immutable snapshots, no SSR mutation.
Cookie setter closed-set, single-name write+exact readback (throw/no-op), no auth/cross-cookie writes.
SPARC Phase:pseudocode/refinement. Files:apps/web/src/lib/workspace-layout.ts;
tests/workspace-presentation.test.ts. Depends:TASK-0. Estimate:2–3h.
Test:`layout_cookie_rejects_ambiguous_input`, `cookie_writers_keep_closed_sets`,
`document_snapshot_preserves_same_document_choice` (A1/A3/A4); existing theme.test unchanged.
Success Criteria: duplicate/encoding/padding/garbage/runtime bad writer fail closed; same Document
retains selected prefs, new Document begins saved SSR/default. No provider/server/API/dependency.

### TASK-2: Shared controls/SSR и Next-preserved layout — FR-1, FR-2, FR-3, FR-6, NFR-2, ADR-001
Description: Root SSR data-workspace-layout + one sibling WorkspacePreferenceSync. Native
Settings with initial SSR enums/getServerSnapshot and subscribed browser snapshot. ThemeToggle
заменяет independent useState(initial) на same useSyncExternalStore snapshot, сохраняет
доступное имя/aria/meta; errors readback visible status. Root sync layoutEffect и observers
только html preference attrs и known meta content/replacement, equality guard/cleanup.
DashboardLayout/UpgradePage static shell/settings, прежние children/erasure/auth/owner order.
SPARC Phase:architecture/refinement. Files:apps/web/src/app/layout.tsx;
apps/web/src/app/WorkspaceSettings.tsx; apps/web/src/app/ThemeToggle.tsx;
apps/web/src/app/dashboard/layout.tsx; apps/web/src/app/upgrade/page.tsx; tests/billing.unit.test.ts (AM-8 request-context fixture).
Depends:TASK-1. Estimate:3–4h.
Test:real Next `ssr_layout_matches_saved_preferences`, `next_cached_routes_and_refresh_keep_preferences`,
`blocked_cookie_keeps_current_document` (A3/A4), `existing_access_gates_are_unchanged`;
existing `test payment environment is explicitly labelled` с mock next/headers вместо вызова вне request context.
Success Criteria: rawSSR/first frames/option/aria/meta/computed view agree; warmed routes, Link/
BackForward/focus/30s RSC and first subsequent click agree; denied choice survives live Document,
reload saved/default expected. No router.refresh/call in toggle; erasure branch stays isolated.

### TASK-3: Scoped tokens и минимальная геометрия — FR-1, FR-3, FR-5, FR-6, NFR-1, ADR-001
Description: globals two root blocks new equal-name workspace tokens; explicit derivative field/
running/select-arrow aliases; shell and outside banner/support body computed text/background.
Геометрия только FR-1; естественный DOM/Tab, no hidden fields/conditions/order tricks.
Coordinator proposes existing create/pause markup immediately after file/help, before long options.
Это отдельный presentation hunk Uploader, не owner instruction, и не часть recovery transport.
Integration order: recovery L writer сначала завершает/интегрирует Uploader lifecycle, затем
один integration owner накладывает этот малый hunk; никогда не копировать старый весь Uploader.
Shell/store/CSS independent до recovery merge; final upload assertions на settled combined artifact.
SPARC Phase:refinement. Files:apps/web/src/app/globals.css; apps/web/src/app/upload/Uploader.tsx.
Depends:TASK-2; Uploader hunk additionally depends on accepted recovery L integration. Estimate:2–3h.
Test:`shell_increment_geometry_is_declared_scope`, `scoped_palette_and_contrast`,
`layout_switch_preserves_active_upload`, `playing_clip_survives_layout_switch` (A2/A5/A6).
Success Criteria: technical scope disclosed; theme guards/public scope pass; no transport/state edit.
R9 failure requiring purchase text hiding/new UX becomes explicit UX follow-up, not false fullUX claim.

### TASK-4: Проверяемые A–H browser группы — FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, NFR-1, NFR-2, ADR-001
Description: one standalone runner --base/--fixture/--out, Playwright existing primitives плюс
содержательные assertions ниже. No auto seed/new infra/production test hooks/React internals.
SPARC Phase:refinement. Files:scripts/check-workspace-presentation.test.mjs;
scripts/workspace-presentation-local.mjs; tests/workspace-presentation.test.ts. Depends:TASK-2/TASK-3. Estimate:4–6h.
Test:A–H ниже, both engines. Success Criteria:192 geometry cases отдельно от state tests;
каждое обязательное precondition проверено, недостаток данных=exit 2, нарушение=exit 1, чисто=exit 0.
Raw JSON/counts/screenshots private; нет cookies/body/File bytes/private media URLs/trace/HAR вGit.

## Fixture manifest и обязательный preflight (R3/T2)
Private file mode 0600/schemaVersion1: actualHttpsOrigin, composeProject=clipmkr-stage-20261028,
sourceSha/imageDigest + operatorObservedAt/stackReceiptPath; roles{ordinary,owner,blogger,erasure}
с privateStorageStateFile/account ownership receipt; ownedVideoId/ownedOtherAccountVideoId,
≥2clipIds/fixedPublishedVersions/expectedSyntheticTitles/readyState; private safeMediaPath/digest/
provenance(создано offline, разрешено, декодируемо, длительность≥15s); existingOwnedCompletionTarget;
processingScenario{syntheticResponses}; catalogPhase=on|off, catalogModeWitnessPath;
catalogCases ON={available,owner,catalogOnly}, OFF={salesOff,owner,catalogOnly}
с expected server-rendered states и отдельными accounts/paths; public c/g paths для regression.
Не печатать values/credentials/URLs/query signatures; отчёт ссылается на digest manifest.

### AM-9: последовательные окна того же web и component boundary

Stage CLI обязательно `--catalog-phase=off|on`; flag должен совпасть с private fixture/catalog witness.
OFF: paymentsMode=off; ON: paymentsMode=live, providerTestMode=true, checkoutEnabled=true;
billingMode=credits_v1. Одного checkoutEnabled=false недостаточно для salesOff SSR текущей страницы.
Private witness JSON0600 schema workspace-catalog-window-1: windowPairId/windowId (UUID), phase,
operatorObservedAt, actualHttpsOrigin, composeProject, sourceSha/imageDigest, webService=web,
runtimeContainerId и observedConfig{billingMode,paymentsMode,checkoutEnabled,providerTestMode}.
Root получает witness из реально работающего web, без секретов; runner не меняет config/deploy.
Оба окна последовательно используют ТОТ ЖЕ project/origin/sourceSha/imageDigest; container ID
может меняться при app-only restart того же web. windowPairId связывает три обязательных отчёта.
ON требует SSR available/owner/catalogOnly и delayed intercepted checkout ДО provider;
OFF требует SSR salesOff/owner/catalogOnly. Checkout OFF получает required-in-on-window,
не PASS/SKIP. Прочие state/geometry checks выполняются в каждом окне с реальными preconditions.

`--catalog-component=no-dates --fixture <phase-manifest> --base <same-origin> --out <private-dir>`
использует тот же source-bound identity, но локальный actual UpgradeScreen+globals.css,
purchaseWindows:null,creditMode:true,salesEnabled:true,catalogOnly:false,ownerUnlimited:false.
Это component-boundary, НЕ SSR: три purchase buttons disabled, dates absent, объяснение и enabled
return, оба layout/theme/engines, geometry/contrast/reflow/R9 проверяются настоящими assertions.
Stable SSR noDates fixture не существует: active credits_v1 всегда получает dates, legacy является
catalogOnly, а межзапросная смена политики/статуса была бы race. Fake role/debug endpoint запрещены.
Ни один phase/component report отдельно не feature PASS: обязательны OFF+ON+component complete
с совпадающими identity и явным покрытием каждого обязательного catalog case. Runner aggregation
`--catalog-verify-reports <off.json,on.json,component.json> --out <private-dir>` проверяет три отчёта;
даже их PASS не доказывает backend checkout/provider E2E, который здесь перехвачен браузером.

Origin/stack/SHA/auth/владение/SSR clip count/catalog props подтверждаются до теста.
Safe media предоставлено оператором заранее: runner не создаёт clip через pipeline, не вызывает
seed-ui-fixture/complete для подготовки, не запускает containers/paid upstream. Media GET нужных
2clipID перехватывается до navigation и обслуживается этими малыми synthetic bytes; фактическое
воспроизведение/готовность проверяется. Initial SSR должен быть настоящим от существующей
owned записи, не HTML подмена. Нет owned данных/role/purchase state/media/origin/TLS→exit 2.
Их подготовка отдельным разрешённым безопасным процессом на existing stage не скрыта внутри runner.

Auth storage используется для ВСЕХ защищённых routes, включая /upgrade; не только dashboard.
Guard до первого navigation разрешает явные app reads/нужные known media/prefetch; test mutations
create/PUT/complete/checkout/link/retry/rerender/guest обслуживаются только объявленной fixture.
Любая иная mutation/external redirect считается попыткой, abort до backend и test fail.
Synthetic create/complete используют existingOwnedCompletionTarget, чтобы штатный push открыл
реальный owned detail, а не404 вымышленного UUID. Полная pipeline/DB/provider гарантия не заявляется.

## A–H: конкретные assertions и оракулы
- A `ssr_layout_matches_saved_preferences`: raw authenticated SSR html attrs, SSR option/aria/meta,
  hydration/first frames и reload для4сочетаний; нет hydrationerror/fixing network. Unit strict
  cookie table + runtime writer. A1. Garbage/duplicate layout не меняет theme/auth.
- B `next_cached_routes_and_refresh_keep_preferences`: idle,4комбинации, реальные Link dashboard→
  detail→upgrade→dashboard; прогретая history, изменить оба на другом экране→Back/Forward;
  attrs/select/aria/meta/computed согласованы. Настоящий focus и controlled30s LimitsPanel refresh,
  первый последующий click меняет текущее значение. Никаких mocked router для этого evidence. A4.
- C `blocked_cookie_keeps_current_document`: до hydration setter только preference cookies:
  throw SecurityError и silent no-op, auth untouched; старое сохранённое/отсутствующее cookie
  отдельно. UI/meta/store согласованы, cookie unchanged, visible fallback, no pageerror;
  same-document Next Link/focus/30s сохраняют выбор, hard reload восстанавливает saved/default. A3.
- D `layout_switch_preserves_active_upload`: настоящийFile/input JSHandle в browser realm,
  toggle до старта; immutable upload options сохранены. Затем один part уже2xx, другой pending,
  no expiry/error; реальные Settings→layout туда/обратно/theme туда/обратно, затем focus/30s.
  Тот же connected input; actual File захватывается capture-phase change до React reset native input.
  File.prototype.slice и payload двух synthetic PUT подтверждают чтение именно этого File;
  native input.files после reset не oracle. Сохраняются video_id/key/options/busy/pause и upload request signal;
  не считать чужие controller.abort. Confirmed part не повторяется; здоровый create=1.
  После release обе части раз, fullETags/oldvideo/complete=1, нормальный owned detail push.
  Short deliberate pause/resume отдельно по текущему recovery контракту. A2; no placeholder media.
- E `playing_clip_survives_layout_switch`: readyState/duration≥15, два разныхclipID/versionfixed,
  успешный play второго и currentTime растёт до toggle. После те жеDOM/src/version, paused=false,
  time растёт с elapsed tolerance, не reset. Paused nonzero отдельно. Через «Гостю» выбрать второй,
  заполнить имя/consent без submit; checkbox/имя/consent сохранились, focus/scroll не украдены.
  ClipCard feedback «Ссылка» допустим один заранее attributed mocked link.create. A5.
- F `toggle_requests_have_only_named_causes`: H/I/P/F/U из05. I(toggle между ticks,pending PUT)
  даёт0новых RPC/RSC/document navigation/mutation; clock scope управляет5s/30s, не отключает
  timers навсегда. Каждый из2P ticks: ровно video.get+clip.list и обновление UI; F=настоящая
  focus/30s RSC цепочка; U release→штатный Complete/navigation. Method/endpoint/ordinal/phase/
  cause обязательны, unknown request fail; не averages/ignore-all-GET/RSC. Media Range/prefetch
  разрешены только при установленной причине. `checkout_state_survives_toggle`: один mocked
  delayed checkout (только ON window)→toggle→отказ; прежниеkey/busy/error, request total1; не новое тело/ключ. A7.
- G `first_screen_actions_have_real_preconditions`, `settings_keyboard_and_reflow`:
 192light cases correct route/auth/layout/theme+geometry, separateR9viewports изNFR-1;
 R9 ДО domRules/click/focus, scrollY=0, both-axis bounds/enabled/hit-test. Explicit upload targets
 file input/ready create/busy pause+status; result first available clip actions, empty/partial
 не притворяются ready; packages enabled offer purchase+conditions либо explanation+return для
 owner/sales-off/catalogOnly в соответствующих actual SSR windows; no-dates — обязательный
 component-boundary UpgradeScreen+CSS с nullprop, без приписывания SSR. Учитываются настоящийTESTbanner/owner nav/credit copy/dates.
 Selector labels из actual render, не nth button/disabled purchase. Отдельно Tab/ShiftTab, summary
 Enter/Space/select arrows/toggle, focus stays same control, closed details no internalTab,
 no hidden duplicate/trap/positiveTabindex/CSS order mismatch. Text200% все controls достижимы,
 local clipping проверено; ручные actual browser zoom200%/effective320 и OS keyboard — отдельные
 evidence, deviceScaleFactor/textZoomRule ими не называются. A6. Unmet catalog R9—openUXfollowup.
- H `scoped_palette_and_contrast`, `existing_access_gates_are_unchanged`:
 computed surface/bg/text/border у html/body/nav/upload/field/select/clip/package, прозрачность
 с подложкой;neutral-onlyRGB roles; semantic states distinct. Axe settingsopen/closed и running/
 success/error/silent; incomplete/unstable отдельно. Измерить пары ink/muted на каждойsurface,
 buttonfg/bg,secondary/link/bg,required control border/bg,actualfocus/adjacentbg ≥4.5/3; decorative
 divider отдельно. Banner/SupportLauncher видимы/читаемы. Public /,/c/,/g/,/upgrade/return before/
 after scope unchanged. Anonymous redirect,ordinary/owner/blogger controls,erasure-only/foreign404
 unchanged при workspace/studio/garbage. Ввод owner/blogger формы сохраняется без submit.

Сохранность resume/controller доказывается поведением/текущим contract, не React internals.
Никакого умножения transport/checkout/media assertions на192cases: state groups both engines на
representative viewport. Decoding/media/version/auth precondition failure=2; assert failure=1.

### TASK-5: Проверить/доставить ограниченный инкремент — FR-1, FR-4, NFR-1, NFR-2, NFR-3, ADR-001
Description: unit/browser/standard checks + targeted mutations, затем независимое QE/review и
code/spec anti-drift. Толькоexisting 77.83.87.178 clipmkr-stage-20261028; operator сверяет project/
volumes/data/config/backup/active uploads/SHA. New stack/DB/Redis запрещены, app-only apply.
SPARC Phase:completion. Files:actual receipts/completion docs, не новые runtime targets.
Depends:TASK-4+settled recovery integration для Uploader evidence.
Commands изexecution worktree: `npm test -- tests/workspace-presentation.test.ts tests/theme.test.ts`;
`node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/upload-lifecycle.test.ts tests/browser/video-screen.test.ts`;
`node scripts/check-workspace-presentation.test.mjs --base "$WORKSPACE_STAGE_ORIGIN" --fixture "$WORKSPACE_FIXTURE_PATH" --catalog-phase=off --out "$WORKSPACE_PRIVATE_OFF_OUT"`;
повтор того же command с actual ON manifest и `--catalog-phase=on --out "$WORKSPACE_PRIVATE_ON_OUT"`;
component command `node scripts/check-workspace-presentation.test.mjs --catalog-component=no-dates --base "$WORKSPACE_STAGE_ORIGIN" --fixture "$WORKSPACE_FIXTURE_PATH" --out "$WORKSPACE_PRIVATE_COMPONENT_OUT"`;
`node scripts/check-responsive.mjs --base "$WORKSPACE_STAGE_ORIGIN" --fixture "$WORKSPACE_RESPONSIVE_FIXTURE_PATH" --out "$WORKSPACE_RESPONSIVE_OUT"`;
`npm test`, `npm run typecheck`, `npm run lint`, `npm run build` с явной ведомостью skips.
Task env переменные берутся из validated private manifest, не выдуманногоURL. npm test сам
НЕ включает новый.mjs runner/browser suite, поэтому отдельные commands обязательны.
Mutation/discrimination: remount upload/player; permissive duplicate cookie; stale initialSnapshot;
refresh/checkout on toggle; сброс document preference при denied refresh. Каждый даёт real fail,
restored source real pass; source regex/screenshot count не substitute. No universal new mutation framework.
Success Criteria: A–H outcomes/geometry/manual gaps сSHA/digest; scope честен; reviewer own closure.
После real HTTPS/CORS/preflight и проверок: ссылка/инструкция владельцу→ручнаяприёмка→тотжеartifact
Cloud; production/DNS отдельно. Сейчас origin готовится, stage evidence pending, auto seed/paid calls нет.

## Dependency order / checkpoints / risks
TASK0→1→2→3→4→5, один writer worktree,12 targets (AM-8 fixture, AM-9 test helper). Helper/shell независимы от transport L;
presentationUploader hunk только после recovery merge, одинintegration owner. Ни recovery pack,
ни main в этом документном поручении не меняются. Если новый target—routing/план обновляются.
Доcode:formal snapshot/ownreviewer conditions/K1/K2; послеshell:Next/cache/denial; послеCSS:
scopedpalette/FR1geometry; послеbrowser:A–H+mutations; передdelivery:existingstagepreconditions/manual.
A1→TASK1/A; A2→TASK3/D; A3→TASK1/2/C; A4→TASK2/B; A5→TASK3/E; A6→TASK3/G/H; A7→TASK4/F.
R1–R6/Q1–Q6/T1–T5 trace в03.5; запись author-addressed не independent verified. Unknown stage/
fixture/codecs это not-established, не clean skip. Core-cjm90/120/YooKassa/blogger не закрывается.

## K1 / K2
K1 новых names изADR/Settings/WorkspacePreferenceSync и runner выполнен на /home/clipmkr:
три pinned CLI source-scan вызова exit 0/free, raw k1-layout/settings/runner.json.
Повторить на execution source после интеграции. K2 pinned `check-plan-completeness.mjs` с--tier=M
--require-requirements по этому пакету: raw k2-check.txt после фактического запуска. Егоexit 0
не formal convergence/approval. Дляformal pathsFor только001-workspace-preferences.md; IDADR-001.

## Amendments
- AM-1 (coordinator-implementation-proposal;Q1/R1): первый shell-инкремент сохраняет ClipCard вместо нового hero/listbox. Confirmation: прежний playing video DOM сохраняется → test `playing_clip_survives_layout_switch` in `scripts/check-workspace-presentation.test.mjs` (падает при remount).
- AM-2 (owner-steer запрет remount; transport boundary coordinator proposal): сохранять File и активную передачу. Confirmation: completed+pending parts/identity после toggle → test `layout_switch_preserves_active_upload` in `scripts/check-workspace-presentation.test.mjs` (падает при keylayout).
- AM-3 (coordinator-implementation-proposal;Q2/R1): existing CTA раньше параметров общей разметкой после recovery merge. Confirmation: заявленная цель enabled/видима без scroll/перекрытия → test `first_screen_actions_have_real_preconditions` in `scripts/check-workspace-presentation.test.mjs` (падает при исходном неблагоприятном расположении).
- AM-4 (Q5/R2/T3): один document snapshot сохраняется при cached routes/30s/focus и denied cookie. Confirmation: controls/attrs/meta после real Next совпадают → test `next_cached_routes_and_refresh_keep_preferences` in `scripts/check-workspace-presentation.test.mjs` (падает при staleinitial).
- AM-5 (Q6/R3/T1): causal network phases вместо вычитания baseline. Confirmation: extra refresh/checkout отtoggle различается доbackend → test `toggle_requests_have_only_named_causes` in `scripts/check-workspace-presentation.test.mjs` (падает при extrarequest).
- AM-6 (Q3/Q4/R5/T4): явно проверить keyboard/reflow/derivedpalette/contrast вне возможностей primitives. Confirmation: реальные rolepairs/focusaliases соблюдены → test `scoped_palette_and_contrast` in `scripts/check-workspace-presentation.test.mjs` (падает при rootfield-bg утечке).

- AM-7 (cross-plan correction после независимого requirements review): recovery FR5/ADR002/003 очищает native input сразу после выбора; D захватывает actual File до React reset и проверяет same input DOM, slice reads/PUT payload, а не input.files[0]. Это уточнение оракула, семантика FR3/ADR-001 same File/input неизменна; OpenSpec не содержит прежнего literal files[0] и не меняется. Confirmation: non-null captured File и ≥2 новых reads после hash перед PUT, same connected input и payload → test `layout_switch_preserves_active_upload` in `scripts/check-workspace-presentation.test.mjs` (сброс File/remount обязан падать).

- AM-8 (координатор согласовал 04.11.2026): существующий payment-label unit вызывает root SSR layout вне Next request; добавить только mock next/headers, сохранить assertions test/live/off. Confirmation: все прежние варианты режима и label → test `test payment environment is explicitly labelled` in `tests/billing.unit.test.ts`.

- AM-9 (координатор согласовал 04.11.2026): одно состояние global config на окно; обязательные OFF+ON того же web и noDates actual component boundary сохраняют все NFR states без fake SSR fixture. Confirmation: фазовый witness/SSR predicates и объединение трёх identity-bound отчётов → test `catalog_phase_has_actual_server_witness` in `scripts/check-workspace-presentation.test.mjs`; компонентный сценарий catalog_no_dates_component_boundary в scripts/workspace-presentation-local.mjs проверяет noDates guard/actions/CSS отдельным слоем.

EXPECTED_CODE_TARGETS:
- apps/web/src/lib/workspace-layout.ts
- apps/web/src/app/WorkspaceSettings.tsx
- apps/web/src/app/layout.tsx
- apps/web/src/app/ThemeToggle.tsx
- apps/web/src/app/dashboard/layout.tsx
- apps/web/src/app/upgrade/page.tsx
- apps/web/src/app/globals.css
- apps/web/src/app/upload/Uploader.tsx
- tests/workspace-presentation.test.ts
- tests/billing.unit.test.ts
- scripts/check-workspace-presentation.test.mjs
- scripts/workspace-presentation-local.mjs
