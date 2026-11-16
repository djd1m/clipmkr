# Zoom screen focus — Fleet QE, Step 9

Дата оценки: 12.11.2026. **Формальный Fleet verdict: NEEDS_REMEDIATION.** Обязательные coverage, ручная приёмка и delivery gates остаются открытыми. Отдельная оценка Source — **B / GO_TO_DELIVERY_PREPARATION**: четыре независимые роли допускают подготовку поставки; новых подтверждённых Source-блокеров не найдено. Полная приёмка функции — **GAP / незавершена**. Отчёт не присваивает `COMPLETE`, не подтверждает rollout и не заменяет native Fleet checkpoint.

## Ревизия и граница оценки

- Immutable code commit: `395bea9eedf219d0a352a20f3da5ee86202ba518`.
- Source revision: `ff3527b6a2b855aa253233eb57e9be8adea002861bdc8c078a4004d03857c7ae`; manifest **159 файлов**, SHA сверены с замороженным снимком. Новый документ Step 9 находится вне этого Source manifest.
- Actual Source Step 8: native `closed`, 3 цикла, `unresolved=[]`, `reasons=[]`, exit 0. Основание — фактический `source-qe-closed.raw.json` и текущий [08_qe_report.md](08_qe_report.md), а не наличие файла или исторического receipt.
- Regression diff рассмотрен относительно native BASE `8a807d17dc2802c1b7dccc06a26719478f8c99c1` и deployment BASE `1a9749e76be35bb3f66e55787104eda1a8d42ca6`; принятый Original baseline — `98e647e2cf4ee83eb38f2f5557fb8fc024386294`.
- Требования, утверждённый UI и OpenSpec ledger закреплены в [01_requirements.md](01_requirements.md), [requirements-revision.json](requirements-revision.json), [ui-approval.md](ui-approval.md), [06_implementation_plan.md](06_implementation_plan.md). Объём реализации: 51 editable + 21 read-only = 72 пути; расширения требований при Fleet не было.

## Состав и метод

Код писал `gpt-6.1-sol high`; все четыре роли назначены `gpt-6-astra xhigh`. Это отдельные от автора сессии без унаследованного контекста реализации. Первые три роли использовали также собственные завершённые факты Source R3: новый независимый Step 9 вердикт не выдаётся за четыре дополнительно созданные сессии.

| Роль | Сессия | Фактический итог |
|---|---|---|
| RequirementsTraceabilityAuditor | `/root/zoom_source_primary_r3` | B; GO_TO_DELIVERY_PREPARATION; final acceptance GAP |
| RiskMitigationVerifier | `/root/zoom_source_security_r3` | B; GO_TO_PREPARE_DELIVERY — тот же ограниченный допуск |
| IntegrationIntegrityChecker | `/root/zoom_source_quality_r3` | B; GO_TO_DELIVERY_PREPARATION |
| RegressionImpactAnalyzer | `/root/zoom_fleet_regression` | GO_TO_DELIVERY_PREPARATION; numeric coverage NOT_ESTABLISHED |

Фактическое исполнение — **волны 3+1** при лимите четырёх активных сессий вместе с координатором. Применён canonical `feature-adr/modules/09-fleet-qe.md` и закреплённые протоколы requirements-validation, risk-based-testing, enterprise-integration-testing, regression-testing и coverage-analysis в Reference Mode. AQE runtime не установлен и не запускался. Fleet проверял исходники, тестовые тела, команды, сырые результаты и SHA; нового общего прогона, изменений Source или записи в общие PG/Redis не выполнял. Исторические собственные pure probes рецензентов отделены от реальных integration runs.

## Прослеживаемость и покрытие требований

**20/20 (100%)** цепочек требования → ADR → задача → код → автоматический oracle прослежены. Обратная карта: **51/51 editable-файлов**, сирот в согласованном объёме нет. Полностью непроверенных MUST и разорванных MUST-цепочек — 0. Полные доступные приёмочные доказательства есть у **17/20 строк (85%)**; ZF-05, AC04 и AC09 остаются частичными. Это доля **сценариев/строк требований**, а не line/branch/function coverage и не доказательство финальной приёмки.

Ниже по одному основному code/test-якорю каждой цепочки; полная many-to-many карта и backward map сохранены в `requirements-audit.private.json`. Пути отсчитываются от корня репозитория. «Source» означает наличие перечисленных Source-доказательств, без заявления о published QA.

| Требование | ADR / TASK | Основной код → тестовый файл | Проверяемый oracle | Статус |
|---|---|---|---|---|
| ZF-01 | 001,003,004 / 1,3,5 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only | Source |
| ZF-02 | 003 / 5 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only | Source |
| ZF-03 | 001,003,004 / 1,4,5 | `packages/shared/src/screen-layout.ts` → `tests/screen-layout.test.ts` | 01 contains the whole screen;02 gives camera its separate pane;03 without focus stays whole-screen | Source |
| ZF-04 | 001,003 / 1,5 | `packages/shared/src/screen-layout.ts` → `tests/screen-layout.test.ts` | canonical even crops bound source %ix%i | Source |
| ZF-05 | 003,001 / 5,8 | `apps/web/src/app/clips/ClipLayoutPreview.tsx` → `tests/browser/clip-layout.test.ts` | native preview visits retained segments and both canvas regions use the current decoded source frame | Частично: owner wholeclip |
| ZF-06 | 001,004 / 1,3,4 | `packages/shared/src/screen-layout.ts` → `tests/screen-layout-media.test.ts` | camera_pixels_never_leave_confirmed_roi | Source |
| ZF-07 | 002,003,004 / 2,3,5 | `packages/db/src/clip-layout.ts` → `tests/clip-layout.integration.test.ts` | seed_prepare_is_cached_and_never_consumes_render_quota | Source |
| ZF-08 | 002,003 / 2,4,5 | `packages/db/src/clip-layout.ts` → `tests/clip-layout.integration.test.ts` | failed delivery is already durable; failed attempts retain old MP4 and published layout | Source |
| ZF-09 | 001,003 / 1,4,6 | `packages/shared/src/cut-timeline.ts` → `tests/screen-layout-media.test.ts` | compaction plus screen graph aligns screen and camera source counters with the real audio marker | Source |
| ZF-10 | 001,002,003 / 2,4,5,6 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | dirty_layout_survives_navigation_reload_and_late_seed | Source |
| AC01 | 001,003,004 / 1,3,5 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only | Source |
| AC02 | 001 / 1,4 | `packages/shared/src/screen-layout.ts` → `tests/screen-layout.test.ts` | canonical even crops bound source %ix%i | Source |
| AC03 | 001,004 / 1,3,4 | `apps/worker/src/render/ffmpeg.ts` → `tests/screen-layout-media.test.ts` | camera_pixels_never_leave_confirmed_roi | Source |
| AC04 | 001,003 / 1,4,6,8 | `apps/worker/src/render/ffmpeg.ts` → `tests/screen-layout-media.test.ts` | compaction plus screen graph aligns screen and camera source counters with the real audio marker | Частично: owner wholeclip |
| AC05 | 002,003 / 2,5 | `packages/db/src/clip-layout.ts` → `tests/clip-layout.integration.test.ts` | exact replay and ten concurrent confirmations admit one intent, series and quota debit | Source |
| AC06 | 002 / 2,4 | `packages/db/src/clip-layout.ts` → `tests/clip-layout.integration.test.ts` | exact replay and ten concurrent confirmations admit one intent, series and quota debit | Source |
| AC07 | 003 / 5,7 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | real-video canvas responsive | Source |
| AC08 | 001,003,004 / 1,3,5 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only | Source |
| AC09 | 003 / 5,7 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | roi_accessible_values_follow_target_and_clamp | Частично: manual screenreader |
| AC10 | 002,003 / 2,5 | `apps/web/src/app/clips/ClipLayoutChoice.tsx` → `tests/browser/clip-layout.test.ts` | dirty_layout_survives_navigation_reload_and_late_seed | Source |

Сопоставлены **11/11 QCSD-условий**, **12 уникальных AM** и **16 пар amendment → test/file**. Повторные связи одного AM не увеличивают число amendments. Инструментированные line/branch/function и differential coverage отсутствуют: пороги **80% нового кода / 90% критических путей — NOT_ESTABLISHED**, как и сохранение численного покрытия изменённого кода. Эти gates не отмечены PASS и не выведены из 20/20 либо 85%.

## Риски и границы интеграции

Risk verifier оценил 20 строк: **16 MITIGATED, 4 PARTIALLY_MITIGATED, 0 UNMITIGATED**; из трёх critical (P×I ≥20) две закрыты мерами, одна частична. P/I — экспертная порядковая шкала, не измеренные вероятности. QCSD: RISK-01, TST-01, ACC-01/02/03, SEC-01/02, UX-01/02/03/04; ACC-03 и UX-03 описывают один физический риск воспроизведения и не дают двух независимых доказательств.

| Частичный риск | Подтверждённая мера | Незакрытая граница |
|---|---|---|
| RISK-01, camera/wholeclip | Live ROI ограничивает пиксели; sampled absence veto и native YuNet проверены | Identity tracking между отсчётами не обещан; owner wholeclip acceptance pending |
| ACC-02, доступность | Keyboard/focus, accessible values, semantic status в browser-тестах | Ручная проверка screenreader NOT RUN |
| RESOURCE, lazy seed | Deadline 30 с, максимум две попытки, cache/low priority | Production load не квалифицирован; жёсткий byte cap не заявлен |
| COMPAT_DELIVERY | Версии, fencing, legacy NULL и сохранение старого MP4 проверены в Source | Mixed-version rollout/rollback и layout → music/CTA qualification NOT RUN |

Критическая цепочка подтверждена по конкретным границам: browser UUID/key/sourceRevision/layout/review → session owner → атомарные DB intent/quota/version/attempt → канонические пять полей Redis → worker/FFmpeg → create-only fenced object → DB CAS → browser published v2. В NativeNext job наблюдался после реального HTTP producer и до consumer; тестовая постановка job не подменяла этот producer. Проверены replay/конкурентные подтверждения, ownership до quota, старый MP4 при неудаче, сохранность credits/grants и миграция populated 031→032.

Native media показывает совпадение screen/camera/audio marker: ожидаемые 1,12 с в допуске 0,04 с. Original сохраняет sourceRevision и same-origin GET/HEAD/Range без второго источника полномочий. Error recovery — **PASS_WITH_LIMITS**: реальные PG failure/fence/replay дополнены моделированными storage failures; live Cloud fault injection не проведён. Основной NativeNext использует заранее заполненный seed cache; lazy-seed подтверждён составными DB/worker/native проверками, единый HTTP→lazy-seed→Cloud сценарий не заявлен. Корреляция key/version/attempt/job/object проверена; сквозной единый HTTP request_id во всех логах не установлен.

## Регрессии и фактические проверки

Diff review охватил 77 product/test/config путей против native BASE и 49 релевантных путей против deployment BASE, включая ранее принятые Original/referral изменения. Связанные потребители и доказательства:

| Изменённая область → риск для потребителя | Конкретные доказательства | Остаточная граница |
|---|---|---|
| shared screen/cut timeline, FFmpeg, compaction → crop/AV/legacy output | Geometry 17; native media 15; legacy framing/music/CTA/compaction suites | Wholeclip owner review pending |
| DB clip-layout/render, migration, HTTP → двойной debit, stale publish, потеря старого MP4 | Реальные PG concurrency/replay/fence/populated migration; NativeNext | Deployed migration/backup и mixed-version pending |
| Queue producer/parser, worker seed/faces → лишние полномочия, устаревший seed, SSRF | Redis canonical-five discrimination; signing/origin/redirect и process-group limits; native ROI/veto | Полный Cloud lazy-seed flow и production load не установлены |
| ClipLayoutChoice/Preview/draft/logout → потеря draft, неверный canvas, два проигрывателя | Browser 32: dirty/reload/storage failure/late publish/ROI/focus/play/logout | Ручная AT и published QA pending |
| Original, credits/payments, music/CTA, retention, progress → соседние контракты | Соответствующие common suites и affected host 113; исходный failure ledger сохранён | Новый общий GREEN не заявлен |

| Прогон / команда | Фактический результат и применимость |
|---|---|
| R2 common host: `node scripts/test.mjs --exclude 'tests/browser/**' --exclude tests/screen-layout-media.test.ts` | 1776 PASS, 23 FAIL; exit 1. Исторический общий прогон; 23 сбоя исправлены с затронутыми повторными проверками |
| R2 common native | 15 PASS, exit 0; исторический результат |
| R2 common browser | 522 PASS, 20 FAIL; полный terminal summary есть, исходные controller/child exit **UNKNOWN / UNAVAILABLE** после потери daemon. PASS для всего прогона не заявлен |
| R3 affected host: `node scripts/test.mjs tests/progress-screen.test.ts tests/database.integration.test.ts tests/music.test.ts tests/wiring.test.ts tests/payments-guards.test.ts tests/credit-packages-ui.test.ts tests/clip-music-choice.test.ts` | 113 PASS, exit 0. После последней правки форматирования progress 29 повторены успешно; повтор не добавлен к уникальному итогу |
| R3 native: `node scripts/test.mjs tests/screen-layout-media.test.ts --maxWorkers=1` внутри изолированного image `34abe…`, network none, source mount | 15 PASS, exit 0; это не запуск на новом release image |
| R3 browser: `node scripts/test.mjs --config vitest.browser.config.ts tests/browser/clip-layout.test.ts` | 32 PASS, exit 0 |
| Финальные types / lint / build | Все exit 0; ранний lint FAIL из-за лимита 501 строк сохранён в истории |

Текущий затронутый набор — **160 уникальных PASS = 113 host + 15 native + 32 browser**. SHA-мосты сохраняют применимость результатов к frozen Source; это не новый полный общий прогон. 20 browser failures воспроизведены на baseline `98e647…` с теми же ошибками: 8 mockup + 12 R9; отфильтрованные/no-match случаи прохождением не считались.

Automatic discrimination: aggregate **CANNOT_ISOLATE / partial**, поскольку два baseline-модуля не импортировались; geometry/DB baseline attribution не стала PASS. Отдельная queue/Redis проверка **DISCRIMINATES**: четыре реальные baseline assertion failures и текущий PASS. Native/browser automatic baseline discrimination не установлена. Семь framing mutation anchors имеют содержательный RED (exit 1, assertions >0) и GREEN (exit 0, assertions >0). Наличие этих якорей не заменяет измерение общего покрытия.

## Отдельное наблюдение координатора после завершения ролей

Исторические terminal отчёты ролей сохраняют своё `images NOT RUN`; они не переписаны задним числом. Позднейший `build-status.private.json` фиксирует **три фактически завершённые сборки, все exit 0**, из sealed archives:

| Образ | Commit | Image digest |
|---|---|---|
| main-web | `395bea9eedf219d0a352a20f3da5ee86202ba518` | `sha256:767d848c78b5a349390c2c9540f4ab6cacedbe60ca34741bed291011a616c7b9` |
| main-worker | `395bea9eedf219d0a352a20f3da5ee86202ba518` | `sha256:9fae7893f2aa1bf369d78b8be6c99c58731a2bae6e27b79cc54444ab2dcad336` |
| compat-web | `070e9445971534d927e2052b7f5e133ed24866cc` | `sha256:32d24fd73f38af9081b953dcd1b9a398617feaaa22e7f1639c86a7a756b32326` |

`native-binary-comparison.private.json` фиксирует одинаковые старые/новые fingerprint: Node v22.22.3, SHA FFmpeg/FFprobe 8.1.3, OpenCV 4.12.0 и 21 native library. Это отдельное свидетельство состава бинарников; compat image build не закрывает release compatibility и не подтверждает deployment приложения.

## Оставшиеся gates и решение

| Gate | Статус / следующий владелец |
|---|---|
| Manual screenreader (AC09); owner wholeclip (ZF-05, AC04) | NOT RUN / pending; ручная приёмка и владелец продукта |
| Published QA, layout → music/CTA, mixed-version/rollback | NOT RUN / pending; координатор поставки на зафиксированных release images |
| Backup, deployed migration preservation, operator review, rollout | Pending; координатор поставки, до признания выпуска завершённым |
| Numeric new-code 80% / critical 90% / differential coverage | NOT_ESTABLISHED; обязательный test gap Step 8. Требуется целевое измерение и оценка результатов; исключение/waiver не выдавались |
| Native Fleet checkpoint | Выполняет координатор после проверки этого документа; сам отчёт не является receipt |

**Формальный итог: `FLEET_QE_VERDICT=NEEDS_REMEDIATION`.** Открыты четыре группы gaps: G1 — численные coverage thresholds (Step 8); G2 — manual AT и owner wholeclip (Step 8 / ручная приёмка); G3 — published QA и layout→music/CTA (Step 8 / delivery qualification); G4 — mixed-version, rollback, deployed migration/backup и rollout (delivery qualification). Их закрытие требует фактических результатов и повторной оценки затронутой части Step 9. Remediation этих gaps в данном проходе не выполнялась.

Неподтверждённые обязательные coverage thresholds блокируют успешное закрытие Step 9 и продвижение через этот gate к выпуску. Canonical модуль не объявляет подготовительную сборку образов прохождением gate; отдельного допуска к staging/rollout этот отчёт не выдаёт. Возможное целевое измерение покрытия оправдано конкретным G1 и не требует автоматически повторять весь общий набор.

**B / GO_TO_DELIVERY_PREPARATION — только узкий допуск к подготовке**, отдельно от формального verdict. Native checkpoint должен зафиксировать реальный анализ с `NEEDS_REMEDIATION`, а не успешный полный gate. Полная приёмка и product COMPLETE не установлены; waiver, skip-as-PASS или разрешение владельца на пропуск gaps не подразумеваются.

## Основания и контрольные суммы

Ниже имена **приватных локальных свидетельств**, доступных координатору; это не публичные ссылки. Полные команды, stderr, many-to-many trace и ограничения остаются в соответствующих evidence/result JSON. Публичный документ не содержит credentials, профилей, private media или signed URLs.

| Свидетельство | SHA-256 |
|---|---|
| `requirements-review.ru.private.md` | `2e11c934eb6b278215ab3b76fcbe8d82731656bdc23572cbd2a12b374f659603` |
| `requirements-audit.private.json` | `bc7f59ff2934d927ccfc526e01eaab75348a4c7252f3d24d1a8f369d4f556ad1` |
| `risk-mitigation.private.md` | `e0be7fd7ecd171046be3e3acba1c859a8f433594f97eedccbbe619baa0ae4e52` |
| `integration-review.ru.private.md` | `765c973c9dd8087cd2a4cf890122a42fe7c23414dee7ba0455ded3bf243f05f9` |
| `regression-review.ru.private.md` | `95d0bcadb55585c0988a850e5a57ad6e0ff8fb963cb7043f170049b69e316717` |
| `source-qe-closed.raw.json` | `eaaf0a97635c2ea7cf9a5e37e74db68c55a277179696150e37c028221b2cd204` |
| `build-status.private.json` | `6fd29e34206a7cb35527b5a4eab8435fb78919765852ce278b70744f7b15b55d` |
| `native-binary-comparison.private.json` | `28f8c84e525948f7720a79bfd98a84db06af82e30e5b0511fc0db8dfe652d929` |

Агрегация изменила только новый Step 9 документ. Source 159, Step 8, native history/receipts и runtime не изменялись.
