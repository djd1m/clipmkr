# План реализации UI — Step6

05.11.2026. Step6 подготовлен архитектором/planner `gpt-6-astra xhigh`, кодирует отдельная модель `gpt-6.1-sol high`. Exact HTML APPROVED, повторное согласование не требуется. Native ideation **CLOSED** по фактическому R3 evaluate; это design closure, не UI/test PASS. K2 plan-completeness выполнен: exit0,0 failures/0 warnings/0 skips; exact output и final plan hash сохраняются отдельно; успешный checkpoint автором не создаётся. Пользователь разрешил автономные шаги1–4: реализацию, тесты и deploy на clipmkr.ru после необходимых gates. Cloud deploy не разрешён. Текущий planner меняет только план и evidence, без кода/runtime.

Inputs read: 03_adr, 05_architecture.md, 04_domain_model.md, pinned feature-adr/modules/06-implementation-plan.md и references/agentic-qe/code-goal-planner.md (применены planner напрямую, без запуска агента). Execution inputs: canonical 00_complexity_assessment.md, 01_requirements.md, 02_reuse_inventory.md. Provenance inputs read: implementation-inputs/00_complexity_assessment.md, implementation-inputs/01_requirements.md, implementation-inputs/02_reuse_inventory.md, implementation-inputs/code-target-inventory.md, 03_adr, 04_domain_model.md, 05_architecture.md; исторические root00/01/02, 03_reference_research.md, 04_screen_decisions.md и owner-approval.md; docs/design/2026-11-05-ux-simplification.md/html; docs/plans/2026-11-05-ui-recovery-cloud-delivery.md.

## Goal state и граница

Цель: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7 реализованы для всех 21 семейств из root05, без изменения серверных контрактов/прав/цен/лимитов. Ближайшие три результата: upload → processing/partial → ready/share. Они не заменяют остальные 18 семейства. Текущая база `a4488b4caf602f093a0cc3393b4903e210cb3989`; auto-link и personal TEST checkout уже существуют и сохраняются. Coverage % не измерялся, runtime работоспособность не утверждается.

Implementation **L14**: 14 UI/CSS + 2 SSR pages + 6 test/harness = **22** точных targets в конце. Добавлены два bounded presentation wrappers account/page.tsx и partner/page.tsx; share остаётся существующим contextual компонентом. Дополнительные изменения максимум до25 только после явного обоснования/re-router и обновления gates. Server/API/DB/pkg/env/worker/provider/DNS не targets. Этот planner не запускает code/runtime; ограничение его сессии не отменяет разрешения пользователя координатору на шаги1–4. Новых агентов здесь нет.

## Предусловия и checkpoints

| Задача | Фаза, вход, результат и критерий |
|---|---|
| TASK-P0 | Specification: exact HTML согласован владельцем, evidence owner-approval.md/call_f0a94c16c93f49b38617215d46b23b7a. Исправленный ADR-001 сохраняет отдельные account/stats состояния; повторное approval не требуется. Это не успешный native checkpoint |
| TASK-P1 | Architecture/QCSD: шесть originating Terra reviews R3 clean; native host/review revision `8089a54c3cb9281c79972e951c318814e62a3eff7829abcecdf1fd40ab680659`, nonce `8eff00a1-1ae5-4320-97e9-1615f6d0ba20`. Actual evaluate: verdict closed, unresolved=[], reasons=[]; все7 native manifest digests сверены. Десять исходных условий закрыты на уровне проекта, будущие Confirmation NOT RUN |
| TASK-P2 | Plan: literal ADR/FR task coverage, A1…A10 и AM-1…AM-10,22 targets; actual K2 tier L/requirements/acid, затем exact-final-plan build-coder-context. Остальные native checkpoint/K1/source-admission выполняет координатор по настоящим receipts; здесь их успех не заявляется |

P0/P1 выполнены как prerequisites согласования/design closure. P2 зависит от обоих; Task1 начинается после фактических оставшихся gates координатора, без повторного owner approval. Proof evaluate: `/root/.config/clipmkr/ui-recovery-cloud-20261105/ui-qcsd/r3-final-evaluate.private.json`, SHA-256 `92f115f9c71efad8fdb02353d38bff05c15920dd96cdb8168dcc7dc1c92d3e18`; current `.fa-state/review-convergence-ideation-host.json` и `review-convergence-ideation-review.json`. Verifications принадлежат исходным reviewers; author не меняет их entries. На настоящих переходах coordinator читает релевантный pinned recall.

## Bounded tasks после gates

Ссылки ADR здесь относятся только к `features/ux-simplification/03_adr/`. UI files — относительно `apps/web/src/app/`; test targets указаны полностью в конце.

| Task / зависит от / SPARC | Ограниченная правка | Done criteria и verification |
|---|---|---|
| TASK-1 / P2 / refinement | ADR-001, ADR-003; FR-2, FR-5, FR-6: `dashboard/page.tsx`, `LimitsPanel`, `upload/Uploader`, `videos/VideoList`, scoped `globals.css`. Расход до CTA, secondary summary, простой список; layout без смены upload protocol | Один явный старт, picker не отправляет; default false/true/true/none, hidden invalid CTA раскрыт и focused до запроса; подтверждённые bytes/пауза/storageBlocked/mismatch/unknownComplete видимы. Проверки A1/A2; existing upload-lifecycle; snapshot только дополнительное evidence |
| TASK-2 / TASK-1 / refinement | ADR-002, ADR-003; FR-2, FR-5: `VideoDetail`/`ProgressPanel`, стабильная композиция `ClipCard`; failure/partial/silent/empty | Готовые media доступны при partial; next_action определяет action, no-response не success/failure. Ноль новых API. A3; интегрированная partial retry приёмка отдельно BLOCKED до настоящего backend контракта, доступный UI можно проверять раньше |
| TASK-3 / TASK-2 / refinement | ADR-001, ADR-002; FR-3, FR-5: `ClipCard`, `ClipMusicChoice`, `GuestPacks`, `VideoDetail`: «Ещё»/share/edit, music draft+apply, одна video CTA/guest owner | A4/A5/A6: player DOM/src/time и CTA input/draft сохранены при poll/toggles; независимые clip drafts; preview/select без mutation, apply один запрос; consent reset при изменённом payload; список create/send/revoke и возврат focus сохранены |
| TASK-4 / TASK-3 / refinement | ADR-001, ADR-003; FR-1, FR-4, FR-5: `PartnerPanel`, `BloggerAdmin`, новый `dashboard/partner/page.tsx`; отдельный stats screen/back, summary/statistics presentations, codes details и owner nullable policy/report | A2/A7: direct URL non-blogger→404 страницы; статистика all-time; auto-link всегда обнаружима, ensurePersonalLink не дублируется; blocked/copy fallback сохранены. Лимит integer2–1440/null→120, rate null/20/30; reason открыт; invalid limit раскрыт/сфокусирован, POST отсутствует; owner report monthMSK/no payouts |
| TASK-5 / TASK-4 / refinement | ADR-001, ADR-003; FR-4, FR-5, FR-6: `WorkspaceHeader`, `WorkspaceSettings`, `dashboard/page.tsx`, `UpgradeScreen`, новый `dashboard/account/page.tsx`; отдельный account screen/back + пакеты | A8/A9/A10: один AccountDeletion и SignOut, irreversible72h/unchecked confirmation вместе с действием; workspace default и сохранённые preferences; price/windows/TEST/disabled reason видимы при закрытой help; server eligibility и account-key guards прежние |
| TASK-6 / TASK-1…5 / completion | ADR-001, ADR-002, ADR-003; FR-1, FR-7: все6 test/harness targets, полная 21-family regression matrix root05, same-state screenshots, independent code QE и anti-drift | Именованные сценарии исполняют реальные React controls/DOM/media; нет source-substring-only доказательства. Все21 строки имеют evidence либо явный gap. Реальный provider/media CJM и owner manual не подменены локальными fixtures |

Проверки пишутся/исполняются вместе со своей задачей; TASK-6 собирает окончательную матрицу, не откладывает проверку lifecycle до конца. Параллельные авторы не назначены: shared CSS, VideoDetail и harness пересекаются, выполнение последовательное. Автор кода gpt-6.1-sol high; planner gpt-6-astra xhigh; design review выполнен originating Terra xhigh, code QE — отдельная Astra без coding context. В этой сессии другие агенты не запускались.

## Проверяемые Confirmation / acid scenarios — план, NOT RUN

| ID | Требование / риск / task | Сценарий и фальсификатор |
|---|---|---|
| A1 | FR-2, FR-5, TASK-1, hidden cost/implicit upload | Выбрать файл при закрытом advanced: cost/limit/start доступны; ноль upload mutation до click. Спрятанный cost либо автозапуск должны ломать тест; test `primary_path_and_context` (`tests/browser/ux-simplification.test.ts`) |
| A2 | FR-3, FR-4, FR-5, TASK-1/4, hidden invalid | Невалидный HTTPS CTA и owner limit 1/1441/2.5 после закрытия details → reveal/focus, ноль mutation; пустой owner limit → null. Удаление reveal должно ломать browser assertion; test `hidden_invalid_reveals_and_focuses` (`tests/browser/ux-simplification.test.ts`) |
| A3 | FR-5, TASK-2, invented recovery | failed/silent/partial/empty + next_action absent/retry: только реальный action, доступные файлы остаются. Без разрешения не появляется retry по числу клипов; test `critical_errors_visible` (`tests/browser/ux-simplification.test.ts`) |
| A4 | FR-3, FR-7, TASK-3, remount/lost draft | Poll дважды, play, clip A→B→A, theme/layout: connected video/input identity прежние, paused probe currentTime/src не сброшены, draft A сохранён. Новая published version проверяется отдельно как допустимая смена; test `draft_survives_poll_and_disclosure` (`tests/browser/ux-simplification.test.ts`) |
| A5 | FR-3, FR-5, TASK-3, hidden mutation | Music select/preview/close: ноль запросов; apply один, отказ оставляет draft/старый файл; CTA save отдельный existing request; test `music_apply_ignores_pre_apply_poll` (`tests/browser/ux-simplification.test.ts`) |
| A6 | FR-5, TASK-3, stale consent | После галочки изменить имя/IDs/доступность/hash, в том числе preselect: create недоступен до нового согласия; identical poll не сбрасывает. На failure draft остаётся; список пакетов после reopen не теряется; close возвращает фокус; test `guest_consent_payload_binding` (`tests/browser/ux-simplification.test.ts`) |
| A7 | FR-4, TASK-4, lost referral/rights | ordinary/blogger/owner; personal loading/error/blocked/copy failure; owner-only прямой серверный отказ; null rate не превращается в0/20, отчёт не обещает выплату; test `stats_blocked_personal_identity` (`tests/browser/ux-simplification.test.ts`) |
| A8 | FR-5, TASK-5, price/checkout/account isolation | owner/catalogOnly/salesOff/TEST/нет дат, pending/canceled/unknown/timeout/foreign intent; A delayed response после B mount не навигирует. Help закрыта, условия у кнопки; использован прежний checkout; tests `native Next responses hide test exception identity across account changes` и `native loadWebConfig runtime handler admits only session A and revocation keeps existing TEST intent` (`tests/browser/per-account-test-checkout-next.test.ts`, existing suite) |
| A10 | FR-4, FR-7, TASK-4/5/6, mockup drift | Header/account и referral/stats ведут в самостоятельные screens с back/direct/reload; dashboard не разворачивается. Один набор controls, no ensurePersonalLink в stats; auth/role/private404 negative paths. Inline замена должна ломать comparison; test `dedicated_account_and_stats_routes` (`tests/browser/ux-simplification.test.ts`) |
| A9 | FR-1, FR-6, FR-7, TASK-5/6, CSS/preferences | 320/390/1440 × обе темы/layouts, отдельно200% text zoom; denied persistence notice; длинные email/URL/title, 0/1/4 clips. Negative controls blue/hide-fourth/clip-text должны ломать oracle; preserve-семейства проверены; test `scoped_css_and_preserved_routes` (`tests/browser/ux-simplification.test.ts`) |

Автоматические Confirmation ADR-001: `tests/browser/ux-simplification.test.ts` (`dedicated_account_and_stats_routes`, `presentation_route_guards`, `primary_path_and_context`, `share_focus_return`, `critical_errors_visible`), `tests/browser/blogger-cabinet.test.ts` (`hidden_policy_invalid`), `tests/clip-card.test.ts`.
ADR-002: тот же новый browser file (`draft_survives_poll_and_disclosure`, `guest_consent_payload_binding`, `hidden_invalid_reveals_and_focuses`, `music_apply_once`), existing `tests/browser/clip-preview-playback.test.ts`, `scripts/check-workspace-presentation.test.mjs`, `tests/browser/per-account-test-checkout-next.test.ts`.
ADR-003: `tests/workspace-presentation.test.ts`, `scripts/workspace-presentation-local.mjs`, `scripts/check-workspace-presentation.test.mjs`, новый browser scenario `scoped_css_and_preserved_routes`.

Новые кандидаты для K1: `ux-simplification.test.ts`, page modules `dashboard/account/page.tsx`, `dashboard/partner/page.tsx`, default symbols `DashboardAccountPage`, `DashboardPartnerPage`, route paths и новые test names. Source search не нашёл conflicts; **K1 NOT RUN**. До Step7 actual pinned name check и K2 `--tier=L --require-requirements`; nonzero/пустой output не успех.

## Verification: команды и ограничения будущего запуска

Planner не запускает app verification. Последний сообщённый координатором фактический baseline этой worktree до UI-кода:96 checks PASS (29 unit/presentation +67 browser), typecheck PASS; это не результаты будущей UI-реализации. Будущий QE запускается локальным Node/Vitest (`vitest.browser.config.ts`) и native scripts на проверяемых bytes, с existing PG/Redis и real S3. Новые Docker harness/testcontainers/MinIO запрещены. Приватный coordinator runner: `/root/.config/clipmkr/ui-recovery-cloud-20261105/run-qe.private.py <argv>`; credentials не читать/не печатать. Установку окружения и runtime выполняет coordinator в рамках разрешения, не этот planner.

- `npm run typecheck`, `npm run lint`, `npm run build` — итоговый diff.
- `npm test -- tests/workspace-presentation.test.ts tests/clip-card.test.ts` — existing unit/component checks; не доказательство focus/lifecycle сами по себе.
- Browser suites запускаются отдельным фактическим browser Vitest config репозитория: обычный `vitest.config.ts` исключает `tests/browser/**`. До запуска назвать точный config/selector и убедиться, что новый файл собран; skipped DB/Redis cases не PASS. Цели: новый UX browser suite, blogger-cabinet, blogger-auto-link, upload-lifecycle, clip-preview-playback, per-account-test-checkout-next, billing.
- `node scripts/check-workspace-presentation.test.mjs --local-handlers` — существующий локальный режим; same-state geometry/palette дополнить в этих же harness targets. Production/component modes требуют своих настоящих private fixtures/identity; не подставлять вымышленные receipts.
- `npm run test:responsive` и применимый actual responsive UI probe; keyboard, focus, reduced motion, 200% text zoom, long content. Автоматический axe не объявляет WCAG compliance.
- Server/contract suites сначала без edits: upload/billing/guest/CTA и per-account checkout. Fault fixtures не закрывают настоящие S3/media/payment CJM. Оплата — только разрешённый TEST аккаунт/магазин, backend duration90/120/individual и ownership из core-cjm сохраняются.

## Delivery и unresolved

После source checks и независимого code QE coordinator выполняет разрешённый deploy clipmkr.ru, проверив фактический host; `/home/clipmkr` не доказательство размещения n5. Затем source-based E2E UI/UX на этой поставке → ссылка/инструкция владельцу → owner manual acceptance. Baseline/pre-code fixtures не заменяют эти шаги. Cloud.ru/c.clipmkr.ru deploy сейчас не разрешён, последующая доставка/конфликты datasets/DNS вне22 targets. Partial-recovery backend contract и его интегрированная приёмка остаются отдельно BLOCKED; UI не обещает несуществующего retry.

Открыты: оставшиеся формальные checkpoints/K1/source admission координатора; implementation, post-code tests/QE/E2E/manual и отдельный recovery contract. Design QCSD closed; K2 exit0 — actual result ниже/в отдельном record, не подмена остальных gates.

## Реальные проверки этой подготовки / anti-drift

Source inspection и allowed pinned recall: exit0,5 записей, IDs/применение в root05. Проверки документации: target paths/count, ADR→tasks→Confirmation, 21-family coverage, git whitespace/status и frozen/source diff — результат фиксируется финальным проверочным выводом этой сессии. Это историческое evidence подготовки, не QE. Текущий design QCSD closed; future UI tests/build/browser/renderer NOT RUN этим planner. K1/checkpoints не выполняются; K2 фиксируется отдельно. Изменения только feature docs; research root00/01/02 сохранены через Git base/исторический manifest; nested inputs остаются provenance, canonical roots текущие.

## Исторический результат документной проверки R1

Историческая проверка первого draft:20 targets, тогдашние root00/01/02 совпадали с HEAD. После коррекции это не текущая квитанция. Свежие проверки/hashes — implementation-design-inputs.sha256 и финальный вывод коррекции; native gates не запускались.


Документная проверка R1:22 уникальных targets (19 existing +2 proposed SSR pages +1 proposed browser test), FR-1…FR-7/ADR-001…003 и21 семейство проверены. Protected HTML/PNG/owner-approval/historical manifest hashes не изменились; code/tests/scripts/design diff пустой, git diff --check exit0. Current spec/proposal/owner hashes сверены с canonical01. Manifest implementation-design-inputs.sha256 измерен после окончательных edits, не checkpoint; OpenSpec validator/browser/native gates NOT RUN.



## Amendments

Ниже исходные10 условий R1→R2→R3 и обязательные проверки реализации; design closure не снимает test obligations. Все AM tests ниже добавляются в **tests/browser/ux-simplification.test.ts**; actual Next-app harness для AM-1/5 размещается в этом же target по существующему образцу per-account-test-checkout-next. AM-8 также дополняет tests/browser/blogger-cabinet.test.ts. Geometry/palette — прежние scripts/workspace-presentation-local.mjs и scripts/check-workspace-presentation.test.mjs; unit ownership — tests/clip-card.test.ts. Новых файлов сверх22 не требуется. CtaFields/layout/server readers — read-only dependencies.

AM-1 (qcsd/qcsd-risk, UXR-01): TASK-1/5: WorkspaceHeader, PartnerPanel, Uploader. Confirmation: Account/stats cancel/leave/idle, Back/reload/return/unknownComplete; выключенный guard ломает cancel; NOT RUN → test `active_upload_new_routes_and_history` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-2 (qcsd/qcsd-risk, UXR-02): TASK-3: VideoDetail, ClipCard, ClipMusicChoice. Confirmation: immutable baseline capture7 до RPC; hold ack после commit8, poll8 до ack, затем ack+fresh8: queued/fast success/terminal failure без вечного pending; baseline из current DTO на ack даёт RED. Сохранить old poll после ack/generation RED; unknown baseline0 mutations, concurrent state без false success/autoretry; NOT RUN → test `music_apply_ignores_pre_apply_poll` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-3 (qcsd/qcsd-quality, UXQ-001): TASK-4: PartnerPanel, dashboard/partner/page.tsx. Confirmation: direct/reload, tie/blocked/empty/error/filter; filtered identity вместо base даёт RED, ensure count0; NOT RUN → test `stats_personal_identity_readonly` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-4 (qcsd/qcsd-quality, UXQ-002): TASK-5: dashboard/account/page.tsx, WorkspaceSettings, LimitsPanel. Confirmation: реальные SSR readers, ordinary/blogger/owner/TEST/error/unknown; same-state account-grid, demo reserved даёт RED; NOT RUN → test `account_screen_native_data` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-5 (qcsd/qcsd-testability, UXT-001): TASK-1/5: WorkspaceHeader, Uploader. Confirmation: настоящий Next app, удержанный PUT, наблюдённый confirm и URL/transfer; отключённый capture guard даёт RED; NOT RUN → test `account_link_active_upload_guard` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-6 (qcsd/qcsd-accessibility, UXA-001): TASK-3: VideoDetail, GuestPacks, ClipCard. Confirmation: удалить trigger и summary; activeElement visible h1; removed tabIndex даёт RED; отдельно summary fallback; NOT RUN → test `guest_close_last_trigger_focus_result_heading` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-7 (qcsd/qcsd-security, UXS-SEC-001): TASK-4: PartnerPanel, dashboard/partner/page.tsx. Confirmation: oldest blocked/later active, direct/reload/filter/unknown; personal copy отсутствует, campaign copy доступна, legacy preserve; NOT RUN → test `stats_blocked_personal_identity` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-8 (qcsd/qcsd-ux, UXU-001): TASK-4: BloggerAdmin, globals.css. Confirmation: самостоятельный report/back, нет assignment DOM, draft/focus; inline report даёт RED; NOT RUN → test `owner_report_approved_screen` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-9 (qcsd/qcsd-ux, UXU-002): TASK-4: PartnerPanel, dashboard/partner/page.tsx, globals.css. Confirmation: same state/theme/layout/width active/blocked/loading/error; missing personal card даёт RED; NOT RUN → test `stats_personal_card_exact_scene` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

AM-10 (qcsd/qcsd-ux, UXU-003): TASK-3: ClipMusicChoice, ClipCard, VideoDetail. Confirmation: видимые warnings до requests, CTA URL-only/kind, старый файл/expiry/quota; скрытая warning даёт RED; NOT RUN → test `music_and_cta_consequences_visible` in `tests/browser/ux-simplification.test.ts` (fails if reverted).

Сохранены также исходные `share_focus_return_missing_trigger` и `active_beforeunload_reload_dismiss_and_accept`: первый в новом UX browser target, второй существующий upload-lifecycle запускается без правки. Future selector: `npx vitest run --config vitest.browser.config.ts tests/browser/ux-simplification.test.ts tests/browser/blogger-cabinet.test.ts tests/browser/upload-lifecycle.test.ts`; наличие include tests/browser/**/*.test.ts проверено чтением config, запуск NOT RUN. Неподдержанный browser dialog — явное ограничение, не PASS. Guard negative run должен фактически упасть после разрешения кода, затем guard восстановлен.

История: R1 evaluate exit1/unresolved10; R2 оставлял UXR-02 OPEN; R3 исправил pre-mutation baseline, шесть originating ролей выполнили recheck и actual native evaluate closed. R1/R2/R3 manifests/reports/receipts сохранены; их прежние PENDING тексты относятся к своим freeze. Targets остаются22: существующие14 UI/CSS +2 proposed SSR +6 tests/harness; классификация L14 не меняется, re-router не заявлен выполненным.

R3 / только UXR-02: TASK-3 реализует узкий onApplyStart/token по ClipMusicChoice→ClipCard→VideoDetail, immutable baseline до mutation и прежний onQueued/read flow; unknown требует read/new explicit Apply. AM-2 расширяется в том же tests/browser/ux-simplification.test.ts. Дополнительных targets/API/store нет; все результаты NOT RUN. Originating R3 risk recheck CLEAN и общий native evaluate closed; будущий тест NOT RUN. Step6 финализирован без изменения этого design решения.


## Final plan evidence

Exact reviewed R3 plan сохранён до правок: `history/qcsd-r3/06_implementation_plan.md`, SHA-256 `d65b383c13c86020bfcde0cc028a59ce5a6793afd54e617e51e78566e3cb492d`. Frozen R3 manifest остаётся историческим: несовпадение его live-plan entry после финализации ожидаемо; requirements/ADR/04/05 native snapshot не меняется. Новый final plan hash и actual K2/context results — отдельный private `ui-qcsd/step6-final-record.private.json`, без перезаписи frozen manifests. K2 stdout — `/root/.config/clipmkr/ui-recovery-cloud-20261105/ui-qcsd/k2-final.private.txt`. Команда: pinned Node22 `check-plan-completeness.mjs features/ux-simplification --tier=L --require-requirements --acid=A1,A2,A3,A4,A5,A6,A7,A8,A9,A10`; actual exit0,0 failures/0 warnings/0 skips. Финальные K2 и build-coder-context повторяются после этих bytes; их результат/точный hash в отдельном record, preflight40215chars не считается final context. Это evidence, не успешный checkpoint.

EXPECTED_CODE_TARGETS:
- apps/web/src/app/globals.css
- apps/web/src/app/WorkspaceHeader.tsx
- apps/web/src/app/WorkspaceSettings.tsx
- apps/web/src/app/dashboard/page.tsx
- apps/web/src/app/dashboard/LimitsPanel.tsx
- apps/web/src/app/dashboard/PartnerPanel.tsx
- apps/web/src/app/upload/Uploader.tsx
- apps/web/src/app/videos/VideoList.tsx
- apps/web/src/app/videos/[videoId]/VideoDetail.tsx
- apps/web/src/app/clips/ClipCard.tsx
- apps/web/src/app/clips/ClipMusicChoice.tsx
- apps/web/src/app/clips/GuestPacks.tsx
- apps/web/src/app/dashboard/bloggers/BloggerAdmin.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/dashboard/account/page.tsx
- apps/web/src/app/dashboard/partner/page.tsx
- tests/workspace-presentation.test.ts
- tests/clip-card.test.ts
- tests/browser/blogger-cabinet.test.ts
- tests/browser/ux-simplification.test.ts
- scripts/check-workspace-presentation.test.mjs
- scripts/workspace-presentation-local.mjs
