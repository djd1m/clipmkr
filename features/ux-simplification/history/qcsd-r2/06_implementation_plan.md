# Ограниченный предварительный план UI — PENDING

05.11.2026. Дополнение исходного scaffold архитектором `gpt-6-astra xhigh` по назначению пользователя. Это НЕ финальный Step6, НЕ независимый QE и НЕ разрешение coding. Exact HTML owner approval **APPROVED** (owner-approval.md); R1 QCSD выполнен: exit1/unresolved10; R2 focused verification и K1/K2 **PENDING / NOT RUN**. Все задачи кода ниже заблокированы TASK-P0/P1/P2.

Execution inputs: canonical 00_complexity_assessment.md, 01_requirements.md, 02_reuse_inventory.md. Provenance inputs read: implementation-inputs/00_complexity_assessment.md, implementation-inputs/01_requirements.md, implementation-inputs/02_reuse_inventory.md, implementation-inputs/code-target-inventory.md, 03_adr, 04_domain_model.md, 05_architecture.md; исторические root00/01/02, 03_reference_research.md, 04_screen_decisions.md и owner-approval.md; docs/design/2026-11-05-ux-simplification.md/html; docs/plans/2026-11-05-ui-recovery-cloud-delivery.md.

## Goal state и граница

FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7 реализованы для всех 21 семейств из root05, без изменения серверных контрактов/прав/цен/лимитов. Ближайшие три результата: upload → processing/partial → ready/share. Они не заменяют остальные 18 семейства. Текущая база `a4488b4caf602f093a0cc3393b4903e210cb3989`; auto-link и personal TEST checkout уже существуют и сохраняются. Coverage % не измерялся, runtime работоспособность не утверждается.

Implementation **L14**: 14 UI/CSS + 2 SSR pages + 6 test/harness = **22** точных targets в конце. Добавлены два bounded presentation wrappers account/page.tsx и partner/page.tsx; share остаётся существующим contextual компонентом. Дополнительные изменения максимум до25 только после явного обоснования/re-router и обновления gates. Server/API/DB/pkg/env/worker/provider/DNS не targets. Разрешение текущей сессии — только документы features, без новых агентов/commit/push/runtime.

## Предусловия и checkpoints

| Задача | Фаза, вход, результат и критерий |
|---|---|
| TASK-P0 | Specification: exact HTML согласован владельцем, evidence owner-approval.md/call_f0a94c16c93f49b38617215d46b23b7a. Исправленный ADR-001 сохраняет отдельные account/stats состояния; повторное approval не требуется. Это не успешный native checkpoint |
| TASK-P1 | Architecture: отдельная Terra-сессия проверяет этот пакет по требованиям; затем настоящий QCSD с quality/risk/testability/a11y по L. Авторские Confirmation — только вход, не verdict. Результат: реальные findings/receipts, исправленный пакет, все существенные риски имеют mitigation. R1 выполнен,10 условий открыты; R2 verification PENDING |
| TASK-P2 | Plan: canonical root00/01/02 актуализированы на L, 22 targets с research Git provenance, OpenSpec дополнен dedicated-state requirement и hashes перепривязаны. После настоящего QCSD финализировать root06, выполнить pinned checkpoints/K1/K2 tier L/requirements. Gates NOT RUN |

P0 и P1 могут готовиться независимо, P2 после обоих; код только после P2. Здесь заранее записаны draft04/05 по прямому поручению; это не заявление соблюдённого полного DAG до QCSD. На каждом будущем checkpoint повторить релевантный recall и прочитать ответ.

## Bounded tasks после gates

Ссылки ADR здесь относятся только к `features/ux-simplification/03_adr/`. UI files — относительно `apps/web/src/app/`; test targets указаны полностью в конце.

| Task / зависит от / SPARC | Ограниченная правка | Done criteria и verification |
|---|---|---|
| TASK-1 / P2 / refinement | ADR-001/003; FR-2/5/6: `dashboard/page.tsx`, `LimitsPanel`, `upload/Uploader`, `videos/VideoList`, scoped `globals.css`. Расход до CTA, secondary summary, простой список; layout без смены upload protocol | Один явный старт, picker не отправляет; default false/true/true/none, hidden invalid CTA раскрыт и focused до запроса; подтверждённые bytes/пауза/storageBlocked/mismatch/unknownComplete видимы. Проверки A1/A2; existing upload-lifecycle; snapshot только дополнительное evidence |
| TASK-2 / TASK-1 / refinement | ADR-002/003; FR-2/5: `VideoDetail`/`ProgressPanel`, стабильная композиция `ClipCard`; failure/partial/silent/empty | Готовые media доступны при partial; next_action определяет action, no-response не success/failure. Ноль новых API. A3; интегрированная partial retry приёмка отдельно BLOCKED до настоящего backend контракта, доступный UI можно проверять раньше |
| TASK-3 / TASK-2 / refinement | ADR-001/002; FR-3/5: `ClipCard`, `ClipMusicChoice`, `GuestPacks`, `VideoDetail`: «Ещё»/share/edit, music draft+apply, одна video CTA/guest owner | A4/A5/A6: player DOM/src/time и CTA input/draft сохранены при poll/toggles; независимые clip drafts; preview/select без mutation, apply один запрос; consent reset при изменённом payload; список create/send/revoke и возврат focus сохранены |
| TASK-4 / TASK-3 / refinement | ADR-001/003; FR-1/4/5: `PartnerPanel`, `BloggerAdmin`, новый `dashboard/partner/page.tsx`; отдельный stats screen/back, summary/statistics presentations, codes details и owner nullable policy/report | A2/A7: direct URL non-blogger→404 страницы; статистика all-time; auto-link всегда обнаружима, ensurePersonalLink не дублируется; blocked/copy fallback сохранены. Лимит integer2–1440/null→120, rate null/20/30; reason открыт; invalid limit раскрыт/сфокусирован, POST отсутствует; owner report monthMSK/no payouts |
| TASK-5 / TASK-4 / refinement | ADR-001/003; FR-4/5/6: `WorkspaceHeader`, `WorkspaceSettings`, `dashboard/page.tsx`, `UpgradeScreen`, новый `dashboard/account/page.tsx`; отдельный account screen/back + пакеты | A8/A9/A10: один AccountDeletion и SignOut, irreversible72h/unchecked confirmation вместе с действием; workspace default и сохранённые preferences; price/windows/TEST/disabled reason видимы при закрытой help; server eligibility и account-key guards прежние |
| TASK-6 / TASK-1…5 / completion | ADR-001/002/003; FR-1/7: все6 test/harness targets, полная 21-family regression matrix root05, same-state screenshots, independent code QE и anti-drift | Именованные сценарии исполняют реальные React controls/DOM/media; нет source-substring-only доказательства. Все21 строки имеют evidence либо явный gap. Реальный provider/media CJM и owner manual не подменены локальными fixtures |

Проверки пишутся/исполняются вместе со своей задачей; TASK-6 собирает окончательную матрицу, не откладывает проверку lifecycle до конца. Параллельные авторы не назначены: shared CSS, VideoDetail и harness пересекаются, выполнение последовательное. Будущий автор Sol high; архитектор Astra xhigh; архитектуру проверяет Terra xhigh, код — отдельная Astra без coding context. В этой сессии другие агенты не запускались.

## Проверяемые Confirmation / acid scenarios — план, NOT RUN

| ID | Требование / риск / task | Сценарий и фальсификатор |
|---|---|---|
| A1 | FR-2/5, TASK-1, hidden cost/implicit upload | Выбрать файл при закрытом advanced: cost/limit/start доступны; ноль upload mutation до click. Спрятанный cost либо автозапуск должны ломать тест |
| A2 | FR-3/4/5, TASK-1/4, hidden invalid | Невалидный HTTPS CTA и owner limit 1/1441/2.5 после закрытия details → reveal/focus, ноль mutation; пустой owner limit → null. Удаление reveal должно ломать browser assertion |
| A3 | FR-5, TASK-2, invented recovery | failed/silent/partial/empty + next_action absent/retry: только реальный action, доступные файлы остаются. Без разрешения не появляется retry по числу клипов |
| A4 | FR-3/7, TASK-3, remount/lost draft | Poll дважды, play, clip A→B→A, theme/layout: connected video/input identity прежние, paused probe currentTime/src не сброшены, draft A сохранён. Новая published version проверяется отдельно как допустимая смена |
| A5 | FR-3/5, TASK-3, hidden mutation | Music select/preview/close: ноль запросов; apply один, отказ оставляет draft/старый файл; CTA save отдельный existing request |
| A6 | FR-5, TASK-3, stale consent | После галочки изменить имя/IDs/доступность/hash, в том числе preselect: create недоступен до нового согласия; identical poll не сбрасывает. На failure draft остаётся; список пакетов после reopen не теряется; close возвращает фокус |
| A7 | FR-4, TASK-4, lost referral/rights | ordinary/blogger/owner; personal loading/error/blocked/copy failure; owner-only прямой серверный отказ; null rate не превращается в0/20, отчёт не обещает выплату |
| A8 | FR-5, TASK-5, price/checkout/account isolation | owner/catalogOnly/salesOff/TEST/нет дат, pending/canceled/unknown/timeout/foreign intent; A delayed response после B mount не навигирует. Help закрыта, условия у кнопки; использован прежний checkout |
| A10 | FR-4/7, TASK-4/5/6, mockup drift | Header/account и referral/stats ведут в самостоятельные screens с back/direct/reload; dashboard не разворачивается. Один набор controls, no ensurePersonalLink в stats; auth/role/private404 negative paths. Inline замена должна ломать comparison |
| A9 | FR-1/6/7, TASK-5/6, CSS/preferences | 320/390/1440 × обе темы/layouts, отдельно200% text zoom; denied persistence notice; длинные email/URL/title, 0/1/4 clips. Negative controls blue/hide-fourth/clip-text должны ломать oracle; preserve-семейства проверены |

Автоматические Confirmation ADR-001: `tests/browser/ux-simplification.test.ts` (`dedicated_account_and_stats_routes`, `presentation_route_guards`, `primary_path_and_context`, `share_focus_return`, `critical_errors_visible`), `tests/browser/blogger-cabinet.test.ts` (`hidden_policy_invalid`), `tests/clip-card.test.ts`.
ADR-002: тот же новый browser file (`draft_survives_poll_and_disclosure`, `guest_consent_payload_binding`, `hidden_invalid_reveals_and_focuses`, `music_apply_once`), existing `tests/browser/clip-preview-playback.test.ts`, `scripts/check-workspace-presentation.test.mjs`, `tests/browser/per-account-test-checkout-next.test.ts`.
ADR-003: `tests/workspace-presentation.test.ts`, `scripts/workspace-presentation-local.mjs`, `scripts/check-workspace-presentation.test.mjs`, новый browser scenario `scoped_css_and_preserved_routes`.

Новые кандидаты для K1: `ux-simplification.test.ts`, page modules `dashboard/account/page.tsx`, `dashboard/partner/page.tsx`, default symbols `DashboardAccountPage`, `DashboardPartnerPage`, route paths и новые test names. Source search не нашёл conflicts; **K1 NOT RUN**. До Step7 actual pinned name check и K2 `--tier=L --require-requirements`; nonzero/пустой output не успех.

## Verification: команды и ограничения будущего запуска

Ни одна команда app verification ниже здесь не исполнялась; node_modules отсутствует, npm в UX worktree не запускать. После разрешённых gates подготовить изолированную installed копию **именно проверяемого SHA**, не тестировать старую public-entry реализацию вместо новых изменений.

- `npm run typecheck`, `npm run lint`, `npm run build` — итоговый diff.
- `npm test -- tests/workspace-presentation.test.ts tests/clip-card.test.ts` — existing unit/component checks; не доказательство focus/lifecycle сами по себе.
- Browser suites запускаются отдельным фактическим browser Vitest config репозитория: обычный `vitest.config.ts` исключает `tests/browser/**`. До запуска назвать точный config/selector и убедиться, что новый файл собран; skipped DB/Redis cases не PASS. Цели: новый UX browser suite, blogger-cabinet, blogger-auto-link, upload-lifecycle, clip-preview-playback, per-account-test-checkout-next, billing.
- `node scripts/check-workspace-presentation.test.mjs --local-handlers` — существующий локальный режим; same-state geometry/palette дополнить в этих же harness targets. Production/component modes требуют своих настоящих private fixtures/identity; не подставлять вымышленные receipts.
- `npm run test:responsive` и применимый actual responsive UI probe; keyboard, focus, reduced motion, 200% text zoom, long content. Автоматический axe не объявляет WCAG compliance.
- Server/contract suites сначала без edits: upload/billing/guest/CTA и per-account checkout. Fault fixtures не закрывают настоящие S3/media/payment CJM. Оплата — только разрешённый TEST аккаунт/магазин, backend duration90/120/individual и ownership из core-cjm сохраняются.

## Delivery и unresolved

После code QE: фактически проверить размещение тестового clipmkr.ru перед runtime операциями, не считать управляющий `/home/clipmkr` хостом n5. Показать владельцу ссылку/инструкцию, дождаться ручной приёмки. Cloud.ru/c.clipmkr.ru — отдельная последующая поставка того же артефакта с сохранением обоих datasets, согласованными конфликтами и окном; не часть этих22 targets, без DNS-switch. В этой сессии нет разрешения на runtime вообще.

Открыты: Terra architecture review, настоящий QCSD/формальные checkpoints/K1/K2; CI inclusion (runner: vitest.browser.config.ts); recovery contract и интегрированная приёмка; реализации/tests/E2E/manual. Exact approval получен, canonical promotion выполнен документно; эти факты не закрывают gates.

## Реальные проверки этой подготовки / anti-drift

Source inspection и allowed pinned recall: exit0,5 записей, IDs/применение в root05. Проверки документации: target paths/count, ADR→tasks→Confirmation, 21-family coverage, git whitespace/status и frozen/source diff — результат фиксируется финальным проверочным выводом этой сессии. Это не QE. App tests/build/browser/renderer, QCSD/K1/K2 NOT RUN. Изменения только feature docs; research root00/01/02 сохранены через Git base/исторический manifest; nested inputs остаются provenance, canonical roots текущие.

## Исторический результат документной проверки R1

Историческая проверка первого draft:20 targets, тогдашние root00/01/02 совпадали с HEAD. После коррекции это не текущая квитанция. Свежие проверки/hashes — implementation-design-inputs.sha256 и финальный вывод коррекции; native gates не запускались.


Документная проверка R1:22 уникальных targets (19 existing +2 proposed SSR pages +1 proposed browser test), FR-1…FR-7/ADR-001…003 и21 семейство проверены. Protected HTML/PNG/owner-approval/historical manifest hashes не изменились; code/tests/scripts/design diff пустой, git diff --check exit0. Current spec/proposal/owner hashes сверены с canonical01. Manifest implementation-design-inputs.sha256 измерен после окончательных edits, не checkpoint; OpenSpec validator/browser/native gates NOT RUN.



## R2: конкретные AM tasks и проверка — NOT RUN

Эти уточнения дополняют TASK-1…6, не финализируют Step6. Все AM tests ниже добавляются в **tests/browser/ux-simplification.test.ts**; actual Next-app harness для AM-1/5 размещается в этом же target по существующему образцу per-account-test-checkout-next. AM-8 также дополняет tests/browser/blogger-cabinet.test.ts. Geometry/palette — прежние scripts/workspace-presentation-local.mjs и scripts/check-workspace-presentation.test.mjs; unit ownership — tests/clip-card.test.ts. Новых файлов сверх22 не требуется. CtaFields/layout/server readers — read-only dependencies.

| AM / condition / исходный owner | Exact test name | Task / UI targets | Обязательство и отрицательный контроль |
|---|---|---|---|
| AM-1 / UXR-01 / qcsd-risk | `active_upload_new_routes_and_history` | TASK-1/5: WorkspaceHeader, PartnerPanel, Uploader | Account/stats cancel/leave/idle, Back/reload/return/unknownComplete; выключенный guard ломает cancel; NOT RUN |
| AM-2 / UXR-02 / qcsd-risk | `music_apply_ignores_pre_apply_poll` | TASK-3: VideoDetail, ClipCard, ClipMusicChoice | удержать pre-ack GET, ack, затем старый ответ; новый queued/success/failure; удаление generation check даёт RED; NOT RUN |
| AM-3 / UXQ-001 / qcsd-quality | `stats_personal_identity_readonly` | TASK-4: PartnerPanel, dashboard/partner/page.tsx | direct/reload, tie/blocked/empty/error/filter; filtered identity вместо base даёт RED, ensure count0; NOT RUN |
| AM-4 / UXQ-002 / qcsd-quality | `account_screen_native_data` | TASK-5: dashboard/account/page.tsx, WorkspaceSettings, LimitsPanel | реальные SSR readers, ordinary/blogger/owner/TEST/error/unknown; same-state account-grid, demo reserved даёт RED; NOT RUN |
| AM-5 / UXT-001 / qcsd-testability | `account_link_active_upload_guard` | TASK-1/5: WorkspaceHeader, Uploader | настоящий Next app, удержанный PUT, наблюдённый confirm и URL/transfer; отключённый capture guard даёт RED; NOT RUN |
| AM-6 / UXA-001 / qcsd-accessibility | `guest_close_last_trigger_focus_result_heading` | TASK-3: VideoDetail, GuestPacks, ClipCard | удалить trigger и summary; activeElement visible h1; removed tabIndex даёт RED; отдельно summary fallback; NOT RUN |
| AM-7 / UXS-SEC-001 / qcsd-security | `stats_blocked_personal_identity` | TASK-4: PartnerPanel, dashboard/partner/page.tsx | oldest blocked/later active, direct/reload/filter/unknown; personal copy отсутствует, campaign copy доступна, legacy preserve; NOT RUN |
| AM-8 / UXU-001 / qcsd-ux | `owner_report_approved_screen` | TASK-4: BloggerAdmin, globals.css | самостоятельный report/back, нет assignment DOM, draft/focus; inline report даёт RED; NOT RUN |
| AM-9 / UXU-002 / qcsd-ux | `stats_personal_card_exact_scene` | TASK-4: PartnerPanel, dashboard/partner/page.tsx, globals.css | same state/theme/layout/width active/blocked/loading/error; missing personal card даёт RED; NOT RUN |
| AM-10 / UXU-003 / qcsd-ux | `music_and_cta_consequences_visible` | TASK-3: ClipMusicChoice, ClipCard, VideoDetail | видимые warnings до requests, CTA URL-only/kind, старый файл/expiry/quota; скрытая warning даёт RED; NOT RUN |

Сохранены также исходные `share_focus_return_missing_trigger` и `active_beforeunload_reload_dismiss_and_accept`: первый в новом UX browser target, второй существующий upload-lifecycle запускается без правки. Future selector: `npx vitest run --config vitest.browser.config.ts tests/browser/ux-simplification.test.ts tests/browser/blogger-cabinet.test.ts tests/browser/upload-lifecycle.test.ts`; наличие include tests/browser/**/*.test.ts проверено чтением config, запуск NOT RUN. Неподдержанный browser dialog — явное ограничение, не PASS. Guard negative run должен фактически упасть после разрешения кода, затем guard восстановлен.

R2 measured input — implementation-design-inputs-r2.sha256. R1 manifest/reports/host сохраняются. Root выполняет snapshot prepare/rebind и verification всех6 исходных ролей, затем evaluate; до closure/K1/K2 код заблокирован. Targets остаются22: существующие14 UI/CSS +2 proposed SSR +6 tests/harness; классификация L14 не меняется, re-router не заявлен выполненным.

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
