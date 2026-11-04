# Исполнение утверждённого макета — implementation plan

Статус: полный проект плана; Step7 ещё не разрешён. Authoritative после actual closure трёх QCSD, independent plan challenge и K1/K2/native checkpoint. Код не начат. Tier L; planner requested gpt-6-astra xhigh, coder requested gpt-6.1-sol high; runtime attestation unavailable. Автор не проверяет независимо свой план.
Inputs read: 00_complexity_assessment.md; 01_requirements.md; 02_research.md; 03_adr/001–004; 04_domain_model.md; 05_architecture.md; actual three Terra QCSD receipt/host; OpenSpec proposal/spec; pinned modules/06-implementation-plan.md and references/agentic-qe/code-goal-planner.md; studio-extended-qe reference methods.

## Goal state and SPARC-GOAP
Current: работающие native upload/media/payments/preferences, но опубликованная shell-only версия не соответствует утверждённым трём screens. Coverage percentage не измерен. Goal: все VC-1…VC-8 и QC-CONTENT/PALETTE/QUOTA/ORIGIN выполнены с реальными actions; один state owner сохраняет операции; exact pinned reference/actual app evidence. Нет нового дизайна/API/DB/provider/pricing/quota/framework. SPARC: specification=01/ADR/QCSD; pseudocode=наблюдение acknowledged bytes/selection; architecture=04/05; refinement=atomic RED/GREEN groups; completion=real Next/published QE, independent review, owner acceptance.
Preconditions: owner mockup approval уже существует; actual ideation closure, K1/K2 и supported dz plan checkpoint должны быть получены до любой product/test implementation. Уже авторизованные provider E2E/test-shop calls не требуют нового permission. Нет обещанного времени завершения вместо фактов.

## Tasks

### TASK-0: Закрыть реальные gates — FR-1, FR-8, AC-6, ADR-001, ADR-004
SPARC specification. Files: feature/OpenSpec records; product targets не трогать. Depends:none. Root получает original owners verification четырёх structural условий на frozen revision; author assessment не является closure. Actual K1 всех новых units, K2 tierL require-requirements, native plan admission/checkpoint; fresh Terra plan critic. Success: actual commands exit0/closed и independent findings addressed, без fabricated receipts. Test: native convergence evaluates own entries; frozen hash и exact code target set совпадают. Risk: stale nonce или неполный scan → NOT ESTABLISHED, исправить instrumentation, не vendor.

### TASK-1: Shared header и native summary — FR-1, FR-2, FR-7, ADR-001
SPARC architecture/refinement. Depends:TASK-0. Files: WorkspaceHeader.tsx NEW, server/dashboard-summary.ts NEW, dashboard/layout.tsx, dashboard/page.tsx, dashboard/videos/[videoId]/page.tsx, upgrade/page.tsx; tests/mockup-ui-realization.test.ts NEW, billing.unit.test.ts.
WorkspaceHeader export only WorkspaceHeader: presentational logo/nav/real balance/settings with existing owner/signout controls; no auth provider/store. readDashboardSummary export only readDashboardSummary: one React.cache function keyed account UUID string, calls existing remainingLimits(getScreenRuntime().pool,config.limits,account); request scoped and server-only. Dashboard layout/page/detail share exact function and key; no second parallel remainingLimits path. Upgrade reuses existing readCreditBalance once for actual credit header; null/error is not fake0; owner label stays accurate. Guard/erasure/foreign404 order remains server-side.
Test: `summary_reuses_request_read_without_cross_account_cache`, `workspace_header_preserves_access_guards`; same-request header+page readcount1, separate accounts/requests separated, no new toggle fetch, upgrade one existing credit read. Success: actual summary consistent with aside and current SKU; no role inferred from cookies; billing SSR tests mock valid next/headers request context, not product code.

### TASK-2: Actual compact upload and recent workspace — FR-1, FR-2, FR-6, AC-3, ADR-001
SPARC refinement. Depends:TASK-1. Files: Uploader.tsx, LimitsPanel.tsx, VideoList.tsx, dashboard/page.tsx; music/teaser/compaction/pack-shot-uploader tests; tests/mockup-ui-realization.test.ts; tests/browser/mockup-ui-realization.test.ts NEW; tests/browser/upload-lifecycle.test.ts.
One stable Uploader renders source-file row/filename/formats/native picker/create/pause/status; optional clip settings use closed native details with controls always mounted. Existing input ref/clear/onChange/hash semantics retained; visible native picker trigger receives focus after pause/cancel/mismatch if input hidden. Real chooser event required. LimitsPanel compact summary aside plus quota details; recent rows retain dates/status/duration/upload nonlink/nextCursor; secondary Partner/Pro/delete/support remain named reachable disclosures/links with mounted forms and original guards. Montage upload preview presents actual current source/upload state, not demo video.
Test: `native_picker_and_options_survive_layout`, `compact_upload_recent_aside_matches_reference`; capture native change File before React reset, compare File.prototype.slice receiver and active PUT; same connected input, key/options; pause/reselect zero network until separateContinue. Update old focus expectation to visible trigger only where markup changed; retain all existing option-value tests. Success: VC-1/VC-4 composition, defaults closed, genuine options roundtrip, no duplicated uploader/controller.

### TASK-3: Truthful acknowledged progress — FR-3, FR-6, AC-3, ADR-003
SPARC pseudocode/refinement. Depends:TASK-2; same Uploader owner, sequential edit. Files: lib/upload-parts.ts, Uploader.tsx; tests/upload-browser.test.ts, tests/upload-resume.test.ts, tests/browser/upload-lifecycle.test.ts.
Add optional final callback to existing uploadParts, no new exports: count unique confirmed Map parts from initial completed_parts or2xx+ETag; bytes=sum(min(partSize,file.size-(n-1)*partSize)), cap=file.size. Notify only after abort check; consumer checks current generation/alive/account scope. Out-of-order/duplicate/refreshed completed parts never double-count. Callback is synchronous observation, creates no network. UI current/lastObserved/unknown progress; pause retains lastObserved, reload incompletev2 unknown, fullv2 parts known100 while awaiting Complete. Persisted v2 parts remain full manifest only. Separate Continue and storage/Complete barriers unchanged.
Test: `acknowledged_progress_deduplicates_parts_and_tail`, `paused_progress_never_becomes_full_manifest`, plus existing hash/race/storage/auth/account/beforeunload suite. Success: unequal last part exactbytes, refresh/abort late callback no stale state; no fake inflight percentage; server result alone moves to processing. Failure fallback is accurate unknown, never partial manifest or new endpoint.

### TASK-4: Selected player and clip list/gallery — FR-1, FR-4, FR-6, AC-4, ADR-002
SPARC refinement. Depends:TASK-1; parallel-safe withTASK-2/3 except shared CSS integrated inTASK-6. Files: VideoDetail.tsx, ClipCard.tsx, GuestPacks.tsx; tests/progress-screen.test.ts; tests/browser/mockup-ui-realization.test.ts.
SelectedClipId in VideoDetail initialfirstavailable/first/null; retain same existingID through polling even unavailable, removed→fallback. All ClipCard key=clip_id stay at stable DOM position/type with same nativevideo/fileVersion key. Cabinet shows selected card+metadata and separate selector buttons aria-current; unselected cards CSS-hidden and absentTab/accessibility; Montage same roster gallery (later rows for>3). Explicit selection pauses previous playing element without resetting currentTime; nativeplay selects; no autoplay from prefs/polls. Guest action opens mounted disclosure once for fresh nonce and existing scroll/focus; backgroundpoll neverreopens.
Test: `selected_player_survives_layout_and_poll`, `guest_preselect_does_not_repeat_on_poll`, `empty_single_four_clips_keep_actions_reachable`; runningsecondclip sameDOM/src/version, paused=false, bounded two ticks strictlyincrease; pausednonzero retained separately. Existing download/copy/guest/expiry/music/score errors remain reachable. Success: VC-2/VC-5, selectedID continuity, no duplicate players/actions/state owner.

### TASK-5: Real compact packages and protected checkout — FR-1, FR-5, FR-6, AC-4, ADR-001
SPARC refinement. Depends:TASK-1; parallel-safe withTASK-2/4, one owner for upgrade/page.tsx. Files: UpgradeScreen.tsx; tests/billing.unit.test.ts; tests/browser/mockup-ui-realization.test.ts.
One existing UpgradeScreen maps actual offers to Cabinet threecolumns or Montage numberedrows; native markup shared, CSS changes geometry. Preserve price/credits/term/eligibility/disabled reasons/actualTEST/busy/error/retry, owner/catalogOnly/salesOff branches. Ancestor/type/key of checkout state independent of preferences. Long explanatory help may be disclosure, required purchase conditions remain adjacentCTA and wrap.
Test: `packages_use_actual_offers_and_preserve_pending_checkout`; delayedsuccess+reject+explicitretry, sameSKUkey and exactlyone start untilretry; actual terminalstatus visible and enabled/disabledcorrect. Success:VC-3/VC-6, no fakeprices/subscription, no forced hides to fit viewport.

### TASK-6: Scoped actual layouts and discriminating visuals — FR-1, FR-2, FR-4, FR-5, FR-6, FR-7, FR-8, AC-1, AC-2, AC-4, AC-5, ADR-001, ADR-002, ADR-004
SPARC refinement. Depends:TASK-2/3/4/5. Files: globals.css; tests/browser/mockup-ui-realization.test.ts; tests/workspace-presentation.test.ts; scripts/check-mockup-ui-realization.mjs NEW; tests/mockup-ui-realization.test.ts.
One integration owner applies six approved composition geometries from01; no theme/layout conditional owner tree. Preserve scoped R8 textscale fallback and public styles. Runner parameterizes144pairs and boundary/mobile/keyboard/200%/cookie-denial/Next-cache cases, content0/1/4/longtext, exact computed palette; namedrelationships notglobalpixel ratio. Crop originalreference namedcontent, save fullscreens too; neveralter reference bytes. Existing native primitives/helpers may be reused without reusing old shell-only success oracle. Local mounted-browser fixtures test races; actual Next/published matrix is separate.
Test: `approved_screen_regions_reject_legacy_bodies`, `real_content_variants_keep_every_action`, `approved_palette_rejects_blue_surfaces`, `layout_key_mutation_resets_active_owner_and_fails`; mutations legacyupload/result/packages, hidefourth, cliptext, bluesurface/CTA, remountkey mustRED. Lifecycle/network checks bound H/I/P/F/U and zero unexpected toggle-origin I calls. Success: allnamedVC gates plus independent pairedvisual review; public /,/c/,/g/,/upgrade/return regression; no0>=0 playback or undefinedFile equality or broad prefetch suppressions.

### TASK-7: Final integration, source review and actual test publication — FR-3, FR-6, FR-7, FR-8, AC-3, AC-4, AC-5, AC-6, ADR-001, ADR-002, ADR-003, ADR-004
SPARC completion. Depends:TASK-6. Files: declared tests/runner only; final feature08/09 evidence by independent roles/root. Run focused/full appropriate unit/browser/type/lint/build on settledSHA; no priorpass inheritance. Independent sourceQE+code-critic+extendedprotocol, fresh Lfleet required; planner/coder never selfreview. Root performs predeploy target/project/data preservation read-only check then alreadyauthorized app-only clipmkr.ru testupdate; noCloud. Script checks sourceSHA/imageDigest/origin evidence and runtime versionbeforecapturingactualactions/pairedscreens. Keep limitedtestdeployment admission separate from completedfeatureGO.
Test: `stage_origin_manifest_rejects_wrong_target`, `published_actual_actions_match_artifact`; realS3 pause/reload/reselect/continue/Complete/processing/player/download and controlledfaultcases separatelylabelled. Success: workingpublishedapprovedUI and exactsourcepair, noauth/data/cache/lifecycle regression; failuresfixed andreviewedonnewfrozenSHA. Secretfixture/evidence outsideGit0600/0700, noallbody/HAR/cookie/Filebytes inpublicreport.

### TASK-8: Core-CJM boundaries and manual handoff — FR-7, FR-8, AC-6, ADR-004
SPARC completion. Depends:TASK-7. Files: scripts/check-mockup-ui-realization.mjs and tests/browser/mockup-ui-realization.test.ts; acceptance evidence private, finalfeature08/09/rootledger. Execute QC-QUOTA actualpublished5400accept/5401reject,blogger7200accept,owner9000accept/9001reject,overrideclear→7200,unauthorizedselfelevationrefused; owner and ordinary/blogger independentcontexts. Measure media/serverduration and distinctsourcecap vsbalance/dayquota; successpositive→workingclip. Short155s baseline is notboundarypass. Run true test-shop success/cancel/replay-no-doublecredit/relogin and distinctblogger→customer→owner referraljourney percore-cjm; existing authorizedproviders/profile.
Test: `real_quota_boundaries_enforced_by_server` (requiresactualstagefixture, nevermock PASS); actualpayment/guest/referral evidence differentiated. No suitablemedia/providerstate→BLOCKED/UNEXECUTED eachcase, nofullfeatureGO. Success: exactpublishedpairs+honestCJMledger toowner; manualacceptancependinguntilowneractuallyaccepts; sameartifactCloud onlyafterthat, production/DNS onlyseparatecommand.

### TASK-9: Code/spec anti-drift and final receipt — FR-1, FR-8, AC-1, AC-2, AC-6, ADR-004
SPARC completion. Depends:TASK-7 for earlyownerpreview; TASK-8+actualmanualacceptance forcompletefeature. Files: feature/OpenSpec evidence afterimplementation, noadditionalappunits. Compare eachFR/VC/ADR/QC condition againstactualfinalcode/tests/pairs; no unapprovedscope reduction, nooldbaseline renamednewPASS. Freshindependentreviewer supplies receipt, rootrunsnativegate; ownerreceives actualclipmkr.rulink/pairs and remainingunexecutedcases. Existingapproval doesnotfabricate finalmanualacceptance. Test:`approved_screen_regions_reject_legacy_bodies` plusactualartifactmatrix. Completionrequiresfullapplicableevidence; limitedtestdeployment canprecede it.

## Parallel ownership, shared class contract and checkpoints
AfterTASK-0, assign separate writers with EXCLUSIVE file ownership in one worktree:
- A: WorkspaceHeader, dashboard-summary, dashboard layout/page/detail-page, Uploader/upload-parts, LimitsPanel, VideoList, ALL globals.css and their existingfocusedtests. ImplementsTASK1–3 andCSSpartTASK6. Pass headerprops contract toC, noeditsCupgrade files.
- B: VideoDetail, ClipCard, GuestPacks, progress-screen tests. TASK4. Existingarticle/video structure remainsstable. DoesnoteditCSSorC/A files.
- C: Upgradepage/UpgradeScreen, billingtests, allNEW tests/mockup-ui-realization.test.ts, tests/browser/mockup-ui-realization.test.ts and scripts/check-mockup-ui-realization.mjs; existingworkspace-presentation test. TASK5 andrunnerpartTASK6. Otherwriters request testadditions throughC, no sharedfile edits.
- Root: gates/integration, actualNext fixtures/build/publication/browser/provider evidence, freshindependentreviews. AllCSSonlyA. Rootmayserialize fileintegration onconflict; noautomatic overwrite.
Class contract fixed beforecoding soB/C do notwait forCSS: `.workspace-shell`; header `.workspace-head`; upload `.workspace-upload`, `.workspace-file`, `.workspace-recent`, `.workspace-aside`; result `.workspace-ready`, `.workspace-selected-layout`, `.workspace-clip-list`; packages `.workspace-plans`. EachClipCard retains `.clip-card` plus `data-clip-id`, `data-selected`; selector nativebutton `data-select-clip`+aria-current. Montage presentation is selected by existing html data-workspace-layout=studio; intro `.studio-ready-intro`, stablecardscontainer `.studio-clips`, packages `.studio-plans`/`.studio-plan-row`; bodycanhaveboth stable semanticclasses, no duplicateowner trees. Use actualprototype classname whereapplicable. No newproductiondebughooks; accessiblelandmarks+classesaresufficient.
Headerprops: authenticated `owner`/navigationcontrols, actualbalance snapshot and existingtheme/layoutinitials; readDashboardSummary account:string→existing RemainingLimits. No clientcrossuserstore. Aexportsheaderandreader; Cimportsheaderandusesexistingbilling/creditread. Nullbalance honestunavailable, nozero fabrication.
DAG:0→1→{2→3,4,5}→6→7→8→9; ownerpreview from7 independentof8 completion. Tests writtenRED beforecorrespondingimplementation when practical. Checkpoints: after0 actualplangate; afterA/B/C merge singlefrozenartifact; after7 deployment/evidenceadmission; after8/9 fullQE/manualstatus. Failure rollback restores previousappimage only, preservesdata/config; no schema migration exists.

## Verification commands and fixture contract
All CLI uses `PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH`. Plannedcommands, resultsnotyetclaimed:
- `npm test -- tests/mockup-ui-realization.test.ts tests/upload-browser.test.ts tests/upload-resume.test.ts tests/progress-screen.test.ts tests/billing.unit.test.ts tests/workspace-presentation.test.ts tests/music-uploader.test.ts tests/teaser-uploader.test.ts tests/compaction-uploader.test.ts tests/pack-shot-uploader.test.ts`.
- `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts tests/browser/upload-lifecycle.test.ts`.
- `npm run typecheck`, `npm run lint`, `npm run build`, appropriatefullunit/browserregression onfinalSHA, existingblogger-policy integrationonisolatedscratchDB. Requiredskips mustbeidentified, notburiedinpasscount.
- `node scripts/check-mockup-ui-realization.mjs --mode published --base https://clipmkr.ru --fixture <private0600.json> --out <private0700dir>`; localmodeonlyexplicitloopbackorigin and labelsitsprooflocal. Exit0allselectedchecksPASS,1assertionFAIL,2missingfixture/unestablished; modepublishedrequiresmandatorycases andnevercatchesfailureasskip.
Privatefixture contains exactsourceSHA/imageDigest/observedAt/targetprojectIP+backup/config/data-preservationreceipt; separateactualordinary/blogger/owner/erasure sessionfiles;owned/foreignvideos/clipIDs+fixedversions;safeapprovedmedia path/hash/duration/provenance;realcatalogstate;publicclip/guestpaths;case-scopedcontrols forfaultfixtures;boundarymediaandserveroutcomes. RunnerdoesnotautoseedDB/config orchangeprovider. Rootcreatesactualfixturesusingauthorizedexistingpaths. Newsource/media/actionspy evidence usesprivatefiles; no secretsinGit. Requiredmissingfixture isUNEXECUTED, notPASS. Theparameterized144 matrix isgenerated, not144manualtasks.
Longboundary/providercasesare a separatefullfeatureacceptance gate; they DO NOTblock alreadyauthorizedlimitedapp-onlytestdeploymentandownerpreview aftersource/browseradmission. Do notcallthatpreviewfullfeatureGO. Testshop/realconfiguredprovidersalreadyapproved; Cloudstrictlyafteractualmanualacceptance. Retain originalscreens/sourcehashes and namedgeometry/color/actionoutput percase.

## Risk controls and extended QE
Apply pinned studio-extended-qe methods (upstreamc0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69), no AQEruntime. Shift-left/risk-based: fouractualQC conditions mappedbelow; test-design boundaries/state transitions; regression/accessibility: keyboard/reflow/errors/reload; contract/security: account/ownership/idempotency; boundedlocalchaos: lateack/storagefailure/delayedcheckout; mutation: legacybody/blue/hidefourth/remount. Freshcode-critic afterimplementation, independentvisual/behaviorfleet; record requirement→risk→scenario→actualcommand→result→limitation in08. No fabricatedcoveragepercentage/WCAGcertification/mutationscore.
Mainrisks: CSSgeometrymaytemptremount→stabletree+identitytests; truthfulprogressmaypollutemanifest→ephemeralobserver+v2negative; hiddenformmaylosefocus→mountednative details+explicittrigger; realcontentoverflow→0/1/4/longvariants; colorcontrastalonepasseswronghue→computedexactpalette+blueRED; wrongstage→freshorigin/projectwitness; longmedia unavailable→honestblockedfullGO whileearlyownerpreviewcontinues.

## Amendments
AM-1 (owner-confirmed shell-only mismatch): Actualsixcompositions supersedeoldauthornarrowing. Confirmation: legacyupload/result/packages restored bodiesfail → test `approved_screen_regions_reject_legacy_bodies` in `tests/browser/mockup-ui-realization.test.ts` (fails if reverted).
AM-2 (quality-real-content-variability):0/1/4clips/records andlongtextwrap, everyactionreachable. Confirmation: hidefourth/cliptextmutantsfail → test `real_content_variants_keep_every_action` in `tests/browser/mockup-ui-realization.test.ts` (fails if reverted).
AM-3 (testability-palette-oracle): Exactlight/darkcomputedroles, scopedexceptions, bluesurface/CTAnegative. Confirmation: bluevariantfailswithsamegeometry → test `approved_palette_rejects_blue_surfaces` in `tests/browser/mockup-ui-realization.test.ts` (fails if reverted).
AM-4 (testability-quota-boundaries): Real5400/5401,7200,9000/9001 andowner-onlyoverride, genuineproviderpositiveoutcomes. Confirmation: servercapviolation/selfelevationfails → test `real_quota_boundaries_enforced_by_server` in `tests/browser/mockup-ui-realization.test.ts` (requiresactualstage, mock/absentfixture cannotPASS; fails if reverted).
AM-5 (risk-stage-origin): Actualclipmkr.ru194.85.249.105/n5-clipmaker, revalidatebeforeupdate; testdeploybeforemanual,Cloudafter. Confirmation: dev/wrongproject/origin/identityevidencefails → test `stage_origin_manifest_rejects_wrong_target` in `tests/mockup-ui-realization.test.ts` (fails if reverted).

## New units, K1 and gate evidence
Newmodules only: apps/web/src/app/WorkspaceHeader.tsx exportWorkspaceHeader; apps/web/src/server/dashboard-summary.ts exportreadDashboardSummary; scripts/check-mockup-ui-realization.mjs CLI(noexports); tests/browser/mockup-ui-realization.test.ts and tests/mockup-ui-realization.test.ts (noexports). No new exportedtype/helper; addcallback toexistinguploadParts signature inline, selectorinlineVideoDetail. Anyadditionalnewunit/export requiresactualK1 andtargetplanupdate beforecodingit.
K1rootreportednativeprojectscanexit2 NOTESTABLISHED (pinnedscanner topologyunsupported). Byteidenticalprojectionadapter scanned274trackedapps/packages/scriptsTS/TSX/MJS/CJS/JSfiles; manifestprivate /root/.config/clipmkr/release-parity-20261103/mockup-ui-realization-k1/manifest.private.json SHA25639c6b27e8e2da9046d196b4962a753df8664d49e46a59b781b7c1c5d28fd3ab3. FouractualnamechecksFREEexit0 storedchecks.private.json; fullapps/packages/scripts/tests rgmodule/exportsearch0hits reportedexit1. Thisisadapterevidence, NOTnativefullreposcan; testsinventorybinding mustbesuppliedbyrootbeforeadmission. No vendorpatchorCLIshim.
K2/nativeplancheckpoint and independent06review are pending atwriting; lateractualcommandoutput establishesstatus. ExistingQCSD closures areideationonly. Thisplanendswith28literalcodetargets, includingnecessaryexistingtestmarkupupdates; modifyingunlistedproductfilesrequiresmeasuredtargetamendment, notsilentdrift.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/WorkspaceHeader.tsx
- apps/web/src/server/dashboard-summary.ts
- apps/web/src/app/dashboard/layout.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/videos/[videoId]/page.tsx
- apps/web/src/app/upload/Uploader.tsx
- apps/web/src/lib/upload-parts.ts
- apps/web/src/app/dashboard/LimitsPanel.tsx
- apps/web/src/app/videos/VideoList.tsx
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/clips/GuestPacks.tsx
- apps/web/src/app/upgrade/page.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/globals.css
- scripts/check-mockup-ui-realization.mjs
- tests/mockup-ui-realization.test.ts
- tests/browser/mockup-ui-realization.test.ts
- tests/upload-browser.test.ts
- tests/upload-resume.test.ts
- tests/browser/upload-lifecycle.test.ts
- tests/progress-screen.test.ts
- tests/billing.unit.test.ts
- tests/workspace-presentation.test.ts
- tests/music-uploader.test.ts
- tests/teaser-uploader.test.ts
- tests/compaction-uploader.test.ts
- tests/pack-shot-uploader.test.ts
