# Reuse inventory

Статус: source-grounded input для QCSD; продуктовый код не изменён. Base7e75649b7c7b548245e6e5a5b005fe2d9ed254cc. Макеты и state owners осмотрены до решений03_adr.

## Native reuse map
| Existing owner/path | Наблюдение | Минимальное изменение |
|---|---|---|
| apps/web/src/app/upload/Uploader.tsx | File/input/controller/generation/scope; immediate input reset; pause clears File; explicit reselect/Continue | Один mounted owner; compact row, closed mounted options, visible picker trigger focus; observational progress |
| apps/web/src/lib/upload-parts.ts | fetch batch concurrency3; Map completed parts; allSettled; callback отсутствует | Optional last acknowledged-bytes callback after servercompleted/2xx+ETag, dedup and abort fence; existing refresh/create untouched |
| apps/web/src/lib/upload-resume.ts | v2 parts означает полный ordered manifest | Не менять схему и invariant; неполный reload progress unknown, current mount lastObserved only |
| apps/web/src/app/videos/[videoId]/VideoDetail.tsx | Existing video/clips polling, guest nonce | selectedClipId owner; keep ID across polling; render same keyed ClipCard roster and separate selection buttons |
| apps/web/src/app/clips/ClipCard.tsx | Native video keyed by actual fileVersion; authenticated media; download/copy/guest/score/music state | selected/onSelect props; same article/video tree across layouts; native play can select; preserve handlers/version semantics |
| apps/web/src/app/clips/GuestPacks.tsx | Form state and nonce guard prevent repeated preselect focus | Closed mounted disclosure allowed; explicit new nonce opens once; polling does not scroll |
| apps/web/src/app/dashboard/LimitsPanel.tsx | available/reserved/expiry/max duration;30sec/focus router refresh | Compact summary aside plus details; owner/legacy quota branches retained |
| apps/web/src/app/videos/VideoList.tsx | Real date/duration/status rows; uploading nonlinks; no original filename in VideoScreen | Compact recent rows with truthful existing labels; no invented filename/new API |
| apps/web/src/app/dashboard/layout.tsx | Auth/erasure/owner guards precede workspace shell | Reuse guard order; common presentational header/settings; request-scoped summary reuse |
| apps/web/src/app/dashboard/page.tsx and dashboard/videos/[videoId]/page.tsx | Both already call remainingLimits | Share one request-cached authenticated read; no duplicate quota/credit query for header |
| apps/web/src/app/upgrade/page.tsx | readAccountBilling and purchaseWindows; billing object has no balance | Existing readCreditBalance once if needed for actual header; no new SQL/service/endpoint; explicit read-count check |
| apps/web/src/app/upgrade/UpgradeScreen.tsx | Existing SKU/busy/error/key and actual catalog | One owner, compact cards/numbered rows via layout; conditions remain adjacent to CTA |
| Existing WorkspaceSettings/preference store | Cookie SSR, document fallback, Next layout/cache sync | Reuse unchanged semantics; attrs/styles only on theme/layout switch |
| apps/web/src/app/globals.css | Scoped workspace tokens and R8 typography | Add actual composition geometry within workspace; public styles untouched; keep text scaling fallback |

## Minimal new units and alternatives
WorkspaceHeader is a presentational shared header, not an auth/data provider. A server-only dashboard-summary wrapper may share existing remainingLimits via React.cache within one request; account input remains explicit. Selector stays in VideoDetail rather than a new state manager. No new upload/media/library framework. If existing helper provides identical summary cache, reuse it instead and remove duplicate target via actual K1 check.
Existing projects1–8 audit docs/reuse/blogger-cabinet-projects-1-8.md reviewed: native Clipmkr React/auth/credits are canonical; external affiliate DOM stores or arithmetic forks add incompatible ownership. No imported donor package justified.

## Technical references already checked
- React state preservation: https://react.dev/learn/preserving-and-resetting-state — type/position/key govern retained state; layout preferences must not branch/remount owners.
- React.cache: https://react.dev/reference/react/cache — shared memoized function in server components, invalidated between requests; not a persistent/global user cache.
- WAI disclosure: https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/ — keyboard activation/expanded state; native details preferred for mounted secondary controls.
No further OSS research is needed for this corrective execution. These references justify small native changes, not new product scope.

## Evidence and uncertainty
Pinned style9ea8f63f and flow6f45ee0a hashes independently measured; Cabinet upload/result and Montage result viewed directly, independent contract reviewer inspected nine screens and pause. Exact anchors and 144-case matrix are in01. Runtime progress callback currently absent: ADR003 adds truthful acknowledged-byte observation without modifying v2 fullmanifest authority. Header upgrade balance currently absent: ADR001 uses an existing service, with measured one-read and account-isolation test requirement. Current clip player must remain a stable DOM node when hidden/shown by layout; browser continuity proof is mandatory rather than assumed.

## Rejected approaches and learning
Shell-only tokens repeat the confirmed owner finding. Separate Cabinet/Montage React trees reset active operations. Simulated percent, partial-parts v2 persistence, a new balance endpoint, duplicated checkouts/players and screenshot masks hiding composition are rejected. Actual Node22 project-pinned recall returned one shared lesson teach:820581d93a5cf7df; no duplicate teach was created for the same owner feedback. Older unit/browser baselines are not new visual acceptance.
