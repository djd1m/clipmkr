# Независимое source review — mockup-ui-realization

Статус 2026-11-05: независимые source review, R2 и финальный R3 завершены. **SOURCE GO для уже авторизованного ограниченного app-only TEST web deployment на clipmkr.ru**, привязанный к самостоятельно проверенному freeze29 SHA256 `68ba189b05f6832c7883c8d2d5581fbf8ed948f8fd67b1e4de32b8fa42e2b131`. F-1/F-2/F-3/F-4 закрыты собственными проверками; открытых product BLOCKING/HIGH нет. **Полный feature GO не выдан.** Это source admission, не квитанция опубликованной или ручной приёмки.

## Независимость, входы и снимок

- Отдельная сессия `/root/ui_source_quality_astra`, запрошенная модель `gpt-6-astra`, reasoning `xhigh`; авторы product code по заданию — `gpt-6.1-sol high`. Отдельной инструментальной аттестации фактического serving model нет.
- Сначала прочитаны только AGENTS.md, docs/acceptance/core-cjm.md, docs/review-policy.md, features/mockup-ui-realization/01_requirements.md, 03_adr/001–004, 04_domain_model.md, 05_architecture.md, 06_implementation_plan.md и два привязанных approved HTML. Затем код и тесты найдены самостоятельно; авторские handoff/QA и выводы root не использовались как доказательство.
- Baseline сравнения: `153a9cd7d14d89776ab38bd83b04594bcb421d50`; HEAD при старте `775a70731a955e73b6e8aab5e37cc3981c76de7f` плюс рабочая дельта и два новых product modules.
- Собственный initial hash в `2026-11-05T05:44:44.094638+00:00`: SHA256 `effa8e2347c86f88f55cd0ed374c83f5dbaa7ac6b36606e88024e61ba142f017`. Алгоритм: все 311 файлов apps/packages, исключая node_modules/.next/dist; SHA256 каждого файла, затем SHA256 JSON map с sort_keys и separators(',',':'). Manifest `/tmp/clipmkr-source-review-astra-start.json` вне Git. Повторное измерение 05:49:17 UTC: те же bytes. После прогонов, 2026-11-05T05:54:01.996790+00:00, hash изменился на `0a375df64a385475ee3972cf46b1ee7fc1634072a7f4ff6da5180c7549bb4d21`: изменены globals.css и UpgradeScreen.tsx. Первоначальный product snapshot **STALE** для финального verdict; требуется независимая проверка исправленной дельты. Initial-end manifest `/tmp/clipmkr-source-review-astra-initial-end.json`.
- Approved style SHA256 `9ea8f63f7dc66bb46a63276177f8033c9463e644b53e4b9e15d065ed49659106`; flow SHA256 `6f45ee0a6175ce1cb6bc46162dd2521fd3ee3698556eae53664967fbc147e299`: самостоятельно совпали.
- Применены code-critic и studio-extended-qe: risk-based-testing, regression-testing, bounded local chaos/failure injection. AQE runtime и дополнительные агенты не запускались. Требование задания самостоятельно запускать тесты имеет приоритет над стандартным ограничением critic на чтение diff. Продуктовый код, БД, роли, провайдеры, публикации и commits reviewer не менял.

## God-object growth

BLOCKING не обнаружено. Новые production modules — только WorkspaceHeader и request reader. Изменения uploader/players/checkout остаются внутри существующих владельцев; новых сервисов, схем и параллельного transport нет. Uploader 199 строк, VideoDetail 139, CSS 498 на начальном снимке.

## Security violations

BLOCKING/HIGH в рассматриваемой дельте не обнаружено. Dashboard auth/erasure остаются перед summary; owned detail сохраняет server reads с account и foreign404; upgrade читает billing/balance после authenticate. Новый React.cache keyed account не является процессным mutable account store. Полный аудит прежнего backend в scope не входил.

## Architectural concerns

Подтверждено чтением: один mounted uploader, UpgradeScreen и roster ClipCard с key=clip_id. Layout/theme не входят в их ключи или условные React ветви. ClipCard пауза зависит от selected; выбор/реальный play меняют selected, polling сохраняет существующий ID и корректно выбирает fallback при удалении. Native details сохраняют mounted controls; guest nonce guard стоит до раскрытия/focus. Header/aside используют канонический remainingLimits, upgrade — канонический readCreditBalance.

## Anti-pattern violations

Новых подтверждённых нарушений retry, silent-success catch или бизнесовой записи в observer не найдено. Progress callback обновляет только ephemeral state после abort/generation/account fence. Существующие v2 key → receipt → full parts → Complete barriers сохранены; partial parts в persisted manifest не добавлены.

## Type / contract issues

**F-1 — MEDIUM, CLOSED в R2: существенные условия покупки скрыты по умолчанию.** `apps/web/src/app/upgrade/UpgradeScreen.tsx:82` (условия на 83–85). Текст про разовую покупку/отсутствие автосписания, сгорание неиспользованных кредитов и предварительный характер дат перенесён в закрытый details. FR-5 и ADR-001§6 разрешают скрывать длинную справку, но требуют условий покупки у CTA. Собственный Chromium probe настоящего UpgradeScreen: `packages-help.open=false`; DOM содержит «неиспользованный остаток сгорает», `body.innerText` — нет. Направление: оставить существенные условия видимыми возле предложений, длинную справку оставить в disclosure. Это заметное отклонение покупательского пути; данных или прав не меняет.

**F-2 — MEDIUM, CLOSED в R2: отказ checkout визуально оторван от действия.** `apps/web/src/app/globals.css:391` (правила order до 397) и `apps/web/src/app/upgrade/UpgradeScreen.tsx:76`. В Cabinet `display:contents` раскрывает descendants в flex; h2 получает order1, button order6, а `.package-checkout-error` остаётся order0. Собственный отдельный Vite+Chromium probe импортировал настоящий UpgradeScreen/CSS и вернул контролируемый transport503: error top154.02/order0; h2 top188.28/order1; CTA top559.41/order6. Ошибка оказывается над названием, а FR-5 требует её возле соответствующего действия. Направление: отдельный order после CTA и проверка отношений boxes для отказа.

## Edge-case sweep

Проверены existing generation/abort/account fences, partial/full receipt, unequal tail/duplicate ack, empty/one/four clips, unavailable/removed selection, long Cyrillic text, controlled delayed/rejected checkout и явный retry. Методы не расширялись на новые бизнесовые backend изменения. Смена source version или availability может закономерно заменить media; защищённый poll/toggle window держит фиксированную версию.

## Test quality

**F-3 — MEDIUM, CLOSED в R2: палитровый oracle ошибочно считает Montage preview primary.** `scripts/check-mockup-ui-realization.mjs:178` и `:203` (до 213), тест `tests/browser/mockup-ui-realization.test.ts:146`. Runner безусловно требует accent/onAccent у `.clip-actions button:first-child`; CSS `globals.css:402–403` задаёт прозрачные secondary controls для Montage, как approved HTML. Palette regression сейчас вызывает colors только для packages. Собственный Chromium запуск настоящих компонентов, ready/studio/dark, затем реальный extracted `colors` из runner дал FAIL: `backgroundColor: rgb(26,26,26) expected #8fd4a4`; текст кнопки `rgb(241,241,239)` вместо ожидаемого onAccent `#151515`. Значит будущая base matrix остановится на корректном Montage result. Направление: layout-aware secondary roles/hover и coverage всех трёх screens, не менять согласованный product ради ошибочного oracle.

Планируемый TASK-1 test same-request/cross-account для `readDashboardSummary` в самостоятельно найденных тестах отсутствует. Billing test проверяет один upgrade balance read и auth ordering, но не реальное RSC memoization. Это **NOT ESTABLISHED**, не установленный дефект React.cache. Для полного приёмочного evidence требуется measured Next/RSC proof.

## Собственные команды и фактические результаты

Все Node-команды: `PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH`, cwd `/tmp/clipmkr-mockup-realization-20261104`.

1. `npm test -- tests/mockup-ui-realization.test.ts tests/upload-browser.test.ts tests/upload-resume.test.ts tests/progress-screen.test.ts tests/billing.unit.test.ts tests/workspace-presentation.test.ts tests/credit-packages-ui.test.ts` — exit0, **7 files / 95 tests PASS**, 84.12s, старт05:44:51. Включает Chromium/WebKit two-poll playing-second-player continuity, explicit-selection pause без seek, unavailable/removal/guest continuity. Ожидаемый stderr negative test storage-error не является ошибкой прогона.
2. `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts tests/browser/upload-lifecycle.test.ts` — exit0, **2 files / 82 tests PASS**, 453.44s, старт05:45:11. В том числе mockup16 tests и upload-lifecycle66 tests: Chromium/WebKit native picker/File identity, pause/reselect/Continue, full/partial manifest, storage barriers, auth/account fences и настоящие beforeunload dialogs на hash/create/PUT/Complete. Лог `/tmp/clipmkr-source-review-astra-browser.log`. Это mounted actual React + browser fixtures, с controlled transport и router adapters; **не actual Next и не genuine provider proof**.
3. Собственный Chromium probe реального Vite-mounted UpgradeScreen/CSS: hidden purchase terms воспроизведены; controlled503 error-order воспроизведён с координатами выше. Сеть checkout подменяется только для управляемого отказа; компонент/handlers/CSS реальные.
4. Собственный Chromium probe real components + extracted runner colors: воспроизведён F-3. Это не published execution; origin loopback.
5. Промежуточный дополнительный probe на уже завершающемся чужом fixture-server получил locator timeout; он не используется как доказательство дефекта. Error-order затем воспроизведён собственным изолированным fixture-server из п.3.

## Process / done-ness gaps

Соответствие FR-1/2/4/5 шести композициям проверено чтением source и named geometry regressions; утверждать окончательное visual match без actual paired screenshots нельзя. FR-3/6 подтверждены source и локальными lifecycle tests. FR-7 проверен в изменённой server wiring/существующих локальных guards, реальные границы квот не запускались. FR-8 ещё OPEN: published artifact/source identity, 144 paired cases, независимое визуальное сравнение, настоящие storage/provider/payment/referral journeys и ручная приёмка не выполнены этим reviewer.

## Production safety и предел вердикта

На initial snapshot не найдено BLOCKING/HIGH дефекта целостности, авторизации или дублирования мутаций, который сам по себе запрещал бы уже авторизованный app-only test preview `https://clipmkr.ru`. F-1/F-2/F-3 закрыты независимо в R2 ниже. Product source допускает ограниченный preview; условие F-4 закрыто финальным независимым R3 ниже. Этот отчёт не разрешает Cloud, production/DNS или новые внешние действия.

Full feature GO остаётся недопустим без actual published144 pairs/core CJM/manual. Не выполнены: реальные ordinary5400/5401, blogger7200, owner9000/9001/clear и self-elevation guards; настоящий тестовый магазин success/cancel/replay/relogin; blogger→customer→owner attribution; полный S3 pause/reload/reselect/Continue/Complete→usable clip/download; владелец ещё не принял новую версию. Эти условия — отдельная full acceptance, не причина выдумывать unsafe product blocker ограниченного тестового развёртывания.

## Suggestions only

Дополнительных косметических замечаний не добавлено.

## Skipped checks

Reviewer не повторял full build/typecheck/lint, весь старый backend/DB/провайдеры, package vulnerability audit, CI/mirror/deployment state и исторические checkpoint receipts. Нет architecture/vision.md и architecture/degradations.md в этой рабочей копии; продуктовая граница взята из обязательного core-cjm и approved feature документов. Чужие результаты не унаследованы. Runtime visual/real-provider/multi-account acceptance намеренно не заменены mocks или этим source review.


## Повторная независимая проверка R2 — 05:56–05:58 UTC

Изменённая дельта прочитана самостоятельно: существенные условия теперь находятся у каждого CTA (`UpgradeScreen.tsx:92`), Cabinet error имеет order7 (`globals.css:399`), colors/interactionColors распознают secondary action в Montage (`check-mockup-ui-realization.mjs:173`, `:208`). Дополнительно проверена новая checkout lifecycle-защита (`UpgradeScreen.tsx:27–64`): один AbortController служит pending lock, cleanup помечает unmounted и abort, alive проверяется после fetch, JSON и в catch; account-key на SSR page обеспечивает отдельный owner. Предпочтения эти identities не меняют. Выход за старую async-функцию не создаёт новый mutation или глобальный account store.

Самостоятельный R2 start в 05:56:15.180942 UTC: aggregate SHA256 `872cff93d1f12f0585c564e2257c3de9bd01e6f102fe2292f39fc3e0c9e536e7` для прежних apps/packages плюс runner и двух mockup test files; manifest `/tmp/clipmkr-source-review-astra-r2-start.json`. На 05:58:22 UTC **ни один охваченный файл не изменился**. Product-only aggregate остаётся `0a375df64a385475ee3972cf46b1ee7fc1634072a7f4ff6da5180c7549bb4d21`.

- `npm test -- tests/mockup-ui-realization.test.ts tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` — **exit0, 3 files/44 tests PASS**, 9.58s; лог `/tmp/clipmkr-source-review-astra-r2-unit.log`.
- `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts -t 'packages_use_actual|checkout delayed|checkout account|declined checkout|purchase terms|approved_palette|package conditions'` — **exit1, 12 PASS / 2 FAIL / 8 deselected**, 113.76s; лог `/tmp/clipmkr-source-review-astra-r2-browser.log`.
- F-1: обе engines проверили видимые условия при закрытом help, владельце/каталоге/sales-off и обоих layouts. **CLOSED**.
- F-2: обе engines проверили errorTop>=buttonBottom и ограниченный gap на390/1440 в обоих layouts. **CLOSED**.
- F-3: обе engines проверили palette/hover/focus для upload/ready/plans в обоих layouts/themes на390/1440; blue surface/CTA mutations остаются RED. **CLOSED**.
- Новый account-remount test в обеих engines проверил late response/JSON success, HTTP failure и transport rejection, включая транспорт, игнорирующий AbortSignal: старый ответ не навигирует, новый account получает новый key, retry сохраняет его. **PASS**.

**F-4 — MEDIUM, CLOSED в R3, test instrumentation (строки/симптом R2):** `tests/browser/mockup-ui-realization.test.ts:124` и `:126`. Новый delayed-success test выпускает успешный checkout и ждёт начала `window.location.assign`, затем пытается читать/click старые SKU locators, пока route нового документа удерживается. Chromium получает isDisabled timeout, WebKit evaluate ждёт завершения navigation; старый DOM уже не является устойчивой тестовой поверхностью. Фактический late-success product дефект не установлен. Нужна проверка pending state до release и final URL/count после перехода либо синхронное измерение непосредственно до assign; не ждать старых DOM locators после начала навигации. Этот RED нельзя скрывать общим PASS. Source verdict и полное test admission должны оставаться различимыми.


## Фиксация R2 — историческая, заменена финальным R3 ниже

Измерено 2026-11-05T05:59:39.446682+00:00; HEAD `775a70731a955e73b6e8aab5e37cc3981c76de7f` плюс рабочая дельта. R2 aggregate `872cff93d1f12f0585c564e2257c3de9bd01e6f102fe2292f39fc3e0c9e536e7`; охваченные bytes не менялись с R2 start, stale нет.. Manifest `/tmp/clipmkr-source-review-astra-r2-end.json`.

| Файл | SHA256 |
|---|---|
| `apps/web/src/app/upgrade/UpgradeScreen.tsx` | `7f221ab699c033a57069d9eeef4c73101d3a1ec9d578547fc697e57b64cd064b` |
| `apps/web/src/app/globals.css` | `fff309bcbd7f000b73808badf1ff72135c4a7f8064734bd6b042a33c7ffc12ed` |
| `scripts/check-mockup-ui-realization.mjs` | `6daad55e743d21e209198fd1b43ff11ebec428092dd1abe984314f8320cc1940` |
| `tests/browser/mockup-ui-realization.test.ts` | `5a631bd228c717af1acd65c10c0aa6ef9b6ec39184bf908900037fcff89dd9dc` |
| `tests/mockup-ui-realization.test.ts` | `ad1e523d163717ea7411108d36b606f1ad965e6a9c62f70a4099f62d6c810c93` |

Исторический вердикт R2: **SOURCE GO условно для limited already-authorized clipmkr.ru test preview**. Условие перед test publication — исправленный F-4 oracle и его собственный независимый повторный проход на frozen bytes; это test-admission условие, не выдуманный product data/security blocker. Полный feature GO, Cloud и ручная приёмка этим отчётом не закрыты. Reviewer завершает текущий заход; последующая поправка получает отдельную точную фиксацию.


## Финальный R3 — проверенный source freeze и окончательный admission

Повторный запуск в той же независимой reviewer-сессии, модель requested `gpt-6-astra xhigh`. Никакие авторские complete/handoff или чужие PASS не использованы. По сравнению с собственным R2-end **product apps/packages bytes неизменны**; изменились только `scripts/check-mockup-ui-realization.mjs`, `tests/browser/mockup-ui-realization.test.ts`, `tests/mockup-ui-realization.test.ts`. Новые subagents не запускались.

Пофайлово самостоятельно проверен private manifest `/root/.config/clipmkr/release-parity-20261103/mockup-ui-realization-installed-gates-20261105/source-freeze.private.json`: все **29/29** записей совпали с прочитанными bytes. SHA256 compact JSON списка `{path,sha256}` самостоятельно пересчитан: **`68ba189b05f6832c7883c8d2d5581fbf8ed948f8fd67b1e4de32b8fa42e2b131`**. SHA256 bytes самого manifest: `3e9b9a223f7bfb2e5ee49da30e0dbf37e46f83046ae052186d5461070819bfe7`.

Свои start/end manifests: `/tmp/clipmkr-source-review-astra-r3-start.json`, `/tmp/clipmkr-source-review-astra-r3-end.json`. Старт `2026-11-05T06:06:06.287882+00:00`; конец **2026-11-05T06:09:00.511371+00:00**. Расширенный reviewer aggregate apps/packages+runner+2mockup tests **`6f274d1b817ffebfb1ae40e4ae047ef383f74b97b123abe0fe128aab45203419`** совпал в начале и конце. Product-only aggregate **`0a375df64a385475ee3972cf46b1ee7fc1634072a7f4ff6da5180c7549bb4d21`**; HEAD **`775a70731a955e73b6e8aab5e37cc3981c76de7f`** плюс frozen рабочая дельта. Stale нет; commit HEAD сам по себе не заменяет freeze29 bytes.

Самостоятельная инспекция исправлений и новых рисков:

- F-4: beforeunload listener синхронно читает настоящий DOM до его уничтожения, сохраняет только boolean/public label snapshot в `window.name`; после same-origin перехода тест проверяет точный label/disabled/allDisabled и один checkout request. Старые DOM locators после начала navigation удалены. Отсутствующий button не даёт ложный PASS: exact snapshot требует `disabled:true` и настоящий текст. Это test-only наблюдение, не production hook. **CLOSED**.
- Mobile oracle: ceiling16rem проверяется выше608px; ниже сохраняются 9:16 и вертикальный порядок. Это соответствует pinned style CSS277 с mobile55svh. Новые positive cases320/390/607/608 принимают допустимый reference poster; negative cases по ratio/ordering сохраняются. На609/672/768/832/833/1024/1440 ширина259px остаётся RED,256/258px PASS. Нового product изменения или выключения desktop guard нет.
- F-1/F-2/F-3 повторно пройдены на финальных bytes: visible terms с закрытым help, отказ возле CTA, layout-aware primary/secondary palette/hover/focus и blue negative controls. Предыдущая исправленная account-remount fence также повторно проверена.

Собственные команды R3 (прежние cwd и Node22 PATH):

| Команда | Фактический результат | Граница |
|---|---|---|
| `npm test -- tests/mockup-ui-realization.test.ts tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` | exit0, **55 PASS / 3 files**,12.80s; `/tmp/clipmkr-source-review-astra-r3-unit.log` | Включая11 новых mobile/breakpoint positive/negative cases; не published |
| `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts -t 'packages_use_actual\|checkout delayed\|checkout account\|declined checkout\|purchase terms\|approved_palette\|package conditions'` | exit0, **14 PASS / 8 deselected**,102.08s; `/tmp/clipmkr-source-review-astra-r3-browser.log` | Обе engines;8 исключены явным `-t`, не отключены/удалены. Mounted реальные компоненты, управляемый transport, не genuine providers |

Отдельные F-4 результаты: Chromium **PASS924ms**, WebKit **PASS1774ms**. Account-remount success/HTTP failure/transport rejection на fetch/JSON с игнорируемым abort также PASS в обеих engines. Затронутые guards покрыты; новых product defects в этой дельте не обнаружено.

**Окончательный вердикт: SOURCE GO для limited already-authorized clipmkr.ru TEST web deployment на freeze29 `68ba189b…e2b131`.** Открытых блокирующих source/test findings этого reviewer не осталось. Это разрешает продолжить ранее авторизованный app-only тестовый выпуск и реальную проверку опубликованного артефакта; не объявляет feature выполненной. Actual published144 paired screenshots, independent visual review, genuine S3/payment/referral и quota-boundary core CJM, measured Next/RSC cache/read-count и ручная приёмка остаются **PENDING/NOT ESTABLISHED**. Cloud и production/DNS этим вердиктом не разрешаются.
