# Независимое QE личной ссылки блогера — qe-primary

Дата: 05.11.2026. **Verdict: conditional.** Подтверждены три условия: два HIGH и одно WARNING. До их исправления и независимой повторной проверки этот срез не получает clean QE. Нарушений серверной принадлежности, блокировок и идемпотентности в выполненных проверках не найдено.

## Происхождение и границы

- requestedModel: `gpt-6-astra`; requestedReasoning: `xhigh`.
- sessionID: `01a1aca3-b1ee-7982-bf5e-71aa9280b9fe` — значение `CODEX_THREAD_ID` этой сессии.
- Автор по назначению владельца: `gpt-6.1-sol high`. Ревью выполнено отдельной сессией без coding-контекста; агентов не создавал. Requested model/reasoning не выдаются за отдельную телеметрическую аттестацию runtime.
- Base и HEAD: `24b4b4a4be4364659142b1428511fb634378ddbc`; проверял незакоммиченный код, включая новый untracked browser test.
- Host nonce: `c2abbe2b-2585-4a6e-8a51-407cc6939753`.
- Host revision: `267e3dda26362903d497852cf0bc3aa2c8d165912450689a5db61c6545441865`.
- Все 59 файлов host manifest совпали по SHA-256 до и после runtime-проверок. Содержимое host не менялось. Начальная проверка: `author:null`, без выдуманной author delta/rework.
- Production code, согласованные требования/план, авторские тесты и receipts не менял; commit/push/deploy не выполнял. Сведения о публикации на clipmkr.ru после QE и полной отмене Cloud.ru приняты из текущего поручения; этот отчёт не доказывает deploy.

Сначала прочитаны только AGENTS.md, docs/review-policy.md, docs/acceptance/core-cjm.md, feature-документы 00/01/02, owner-approval, ADR-001, architecture, implementation plan, привязанная OpenSpec delta и утверждённый HTML. После этого самостоятельно найдены diff, код, тесты и зависимости. Авторские handoff/progress/QE reports и журналы успеха не использовались. Хеширование файла из manifest не является чтением его выводов.

Прочитаны применимые CLAUDE.md, локальные правила проверок/безопасности и responsive-ui. Использованы [code-critic](/home/product-studio/.agents/skills/code-critic/SKILL.md) для отдельного чтения кода **без запуска тестов в этой части** и [studio-extended-qe](/home/product-studio/.agents/skills/studio-extended-qe/SKILL.md) для последующего собственного runtime QE. Прочитаны его architecture/testing.md и docs/process/extended-qe.md. Применены методики risk-based, contract, security, regression, accessibility, bounded resilience, mutation и brutal-honesty из pinned `agentic-qe c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`; SHA-256 всех восьми выбранных SKILL.md совпали с UPSTREAM.json. AQE runtime, сторонние агенты и установки не использовались.

## Условия

### QE-BAL-01 — HIGH, structural: в «Монтажной» основное действие уходит за первый экран

**Требование:** FR-1, сохранение главного действия загрузки на первом экране и согласованной композиции HTML; TASK-3/4 и A6.

**Место:** `apps/web/src/app/globals.css:591` и `:606`, композиция `apps/web/src/app/dashboard/page.tsx:23`.

Новая внешняя двухколоночная сетка сжимает существующий `.studio-upload`, внутри которого сохраняется ещё одна сетка с превью исходника. Получается три визуальные колонки, тогда как в утверждённой «Монтажной» справа от рабочих действий находится личная ссылка. У старого заголовка сохраняется размер, рассчитанный на широкую область. Это измеримый регресс главного действия, не замечание к стилю текста.

В собственном тесте вызван **настоящий async Dashboard**, результат обёрнут настоящим WorkspaceHeader и штатной `.workspace-shell > main.container`. БД и `getBloggerPolicy` настоящие; account resolver, erasure page state, список записей и summary подставлены на серверной границе. Next deployment этим не моделируется. На 1440×768 в обеих темах:

| Проверка | Верх / высота / низ кнопки «Создать клипы →», CSS px |
|---|---|
| Текущий SSR, Chromium | 756,67 / 44 / **800,67** |
| Текущий SSR, WebKit | 756,58 / 44 / **800,58** |
| Тот же SSR с CSS базы, Chromium | 554,31 / 44 / **598,31** |
| Утверждённый HTML, Chromium | 658,11 / 44 / **702,11** |
| Утверждённый HTML, WebKit | 659,39 / 44 / **703,39** |

На 1440×900 действие помещается; именно проверка только высокого viewport скрывает проблему. На 390×844 основное действие помещается в обеих компоновках. Сравнение с CSS базы — контроль влияния нового CSS, а не предложение вернуть старую композицию.

**Проверка:** `QE independent actual SSR dashboard composition and 768px first-screen action` красный в Chromium/WebKit; `ssr-baseline-comparison.log` подтверждает контроль базы; `mockup-metrics.json` — измерения утверждённого HTML. Снимки: `screenshots/chromium-actual-studio-dark-1440.png` и `screenshots/chromium-approved-studio-dark-1440.png` в каталоге собственных доказательств ниже.

**Условие закрытия:** согласовать CSS существующего uploader с утверждённой двухколоночной композицией, сохранив один смонтированный uploader; подтвердить полный основной CTA в первом экране 1440×768 в обеих темах/движках и сохранение мобильной компоновки. Не требуется перенос несогласованного общего redesign.

### QE-BAL-02 — HIGH, structural: fallback кампании выделяет чужой для действия URL

**Требование:** FR-2 и FR-5; честный ручной путь при отказе clipboard, сохранение действия другой active кампании при blocked личном коде.

**Место:** `apps/web/src/app/dashboard/PartnerPanel.tsx:66–69` и вызов общего onCopy из PartnerSummary, строка 18.

`copyLink(url)` обслуживает личный адрес и дополнительные кампании. При любой ошибке он фокусирует и выделяет `manualUrl`, всегда содержащий **личный** адрес. Воспроизведение: earliest personal blocked, дополнительная campaign active → раскрыть список → нажать копирование active campaign → clipboard denied. Выделен blocked личный адрес, хотя запрошен адрес active campaign. Ручное копирование после подсказки отправляет подписчикам заблокированную ссылку. Вариант с двумя active кодами также воспроизведён: выбирается не та кампания.

**Проверка:** `QE independent clipboard denial selects the campaign that was requested` падает на сравнении выбранного текста с запрошенным URL в Chromium и WebKit. `native-negative-clipboard.log`: 2 подтверждённых отказа этого сценария; `screenshots/{chromium,webkit}-campaign-denied.png`. Идентичности/адреса фикстур в публичном отчёте не воспроизводятся.

**Условие закрытия:** ручное выделение относится к URL именно нажатого действия; отказ active campaign не должен переводить пользователя на personal URL. Повторить оба случая: active personal + active campaign и blocked personal + active campaign; сохранить обычный mode.

### QE-BAL-03 — WARNING, structural: поле ссылки нарушает минимальный размер шрифта

**Требование:** локальный responsive-ui, жёсткое правило 4: текстовые поля/select ≥16 CSS px; применимо к новому фокусируемому textarea ручного копирования.

**Место:** `apps/web/src/app/globals.css:599`, textarea в `apps/web/src/app/dashboard/PartnerPanel.tsx:79`.

Новый `font-size:.85rem` перебивает общий `font-size:max(1rem,16px)`. При корневых 16 px вычисленный размер **13,6 px**. Это измерено на 390 px в обеих темах, обеих компоновках и обоих движках. Фокус особенно значим: его программно переводит сюда clipboard fallback. Автоматический zoom на настоящем iPhone не заявляется как воспроизведённый; подтверждено нарушение численного локального правила.

**Условие закрытия:** вернуть полю минимум 16 px и проверить вычисленный размер, отсутствие overflow и ручное выделение при 100/200% текста. Требование относится к контролу, не к уменьшенным подписи/статусу.

## Code-critic: отдельная оценка чтением

1. **Рост god-object:** не выявлен. PartnerService 155 строк, router 153, PartnerPanel 102, globals.css 612; новый browser module 241. Новый узкий метод использует существующий генератор/транзакции.
2. **Безопасность:** нарушения diff не обнаружены. Account только из сессии, строгий пустой input, guard active/blogger под account lock до UPSERT, status read под code lock. GET не исполняет mutation; ошибки идут через существующий sanitized partnerResult.
3. **Архитектура:** новой БД-сущности, генератора, зависимости, REST-контура, процесса или альтернативной атрибуции нет. Существующие partner-code, guest-pack и blogger-policy прочитаны как семантические зависимости; их поведение не переписано.
4. **Антипаттерны:** нет скрытого success при серверном отказе, самодельного серверного retry и промежуточных COMMIT. Клиентский явный retry и ограничение ожидания соответствуют ADR.
5. **Типы/контракты:** QE-BAL-02 — общий callback не сохраняет семантику запрошенного адреса при отказе; прочие DTO/input/envelope соответствуют плану.
6. **Пограничные состояния:** пустой аккаунт, параллельная выдача, снятие роли/удаление, blocked earliest, потерянный ответ после commit и rollback разобраны. Большой input отклоняется strict/bounded API; новая операция не вводит пагинации. Полный crash/restart процесса отдельно не запускался.
7. **Качество тестов:** реальные PG lock barriers и HTTP/auth цепочка содержательны. Route stubs доказывают dispatch, не права; это дополнено настоящими auth/HTTP/PG negative cases. Исходный browser harness вручную собирает оболочку и не включает полный SSR dashboard — это ограничение дополнено отдельным SSR probe. Его сравнение `input.files[0]` не доказывает сохранность объекта File: Uploader очищает input.value. Поэтому не заявляю доказанную object identity File; отдельно проверены DOM identity, имя выбранного файла/состояние и завершение продолжающейся передачи после переключений. Селектор browser config включает новый тест; обычный vitest исключает browser. CI manifests в репозитории не найдены, отдельная внешняя CI не аттестуется.
8. **Процесс/готовность:** code/spec anti-drift не clean из-за QE-BAL-01/02/03. Чужие K1/K2/QCSD/author receipts не переоценивались и не переписывались. Отсутствие deploy не названо дефектом реализации.
9. **Production safety:** миграций/изменений конфигурации и пакетов нет; только существующие runtime-зависимости. Production/live/users/demo не затрагивались.
10. **Предложения по вкусу:** отсутствуют.
11. **Открытые вопросы:** для локального verdict не требуются.
12. **Пропущено:** полный regression/build, реальные провайдеры и опубликованный Next/E2E, full90/120min, реальное мобильное устройство и screen reader. Это отдельные границы, не результаты PASS.

## Собственное QE: команды и наблюдения

Среда: Node `v22.23.4`, Vitest `3.2.7`, установленный Playwright `1.60.0`, нативные Chromium/WebKit. Секретный профиль загружался только в environment из `/root/.config/clipmkr/blogger-auto-link-20261105/local-qe.env`; значения не печатались. PG guard требует имя `*_test`, каждый suite создаёт случайную собственную схему и удаляет её. Redis — предоставленный изолированный профиль. Контейнеры/установки не создавались; `scripts/check-responsive.sh` не запускался.

Собственные исходники probes, конфиг in-memory mutations, снимки и фактические stdout находятся в `/tmp/qe-primary-blogger-20261105/`. Это локальные доказательства, не авторские receipts и не опубликованный стенд. Для запуска browser suite создавалась **своя временная** копия `tests/browser/qe-primary-independent.test.ts`: сначала менялся только путь скриншотов, затем добавлялись независимые probes. Оригинальный тест и снимки host snapshot не перезаписывались. По завершении свои временные test/config удалены из repo; их финальные копии сохранены в указанном каталоге. Таблицы ниже разделяют baseline, probes и ожидаемо красные мутации, не суммируют повторные прогоны как новые тесты.

Префикс команд:

```bash
export PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH
set -a
source /root/.config/clipmkr/blogger-auto-link-20261105/local-qe.env
set +a
```

| Требование → риск → сценарий | Фактическая команда / лог | Наблюдение и ограничение |
|---|---|---|
| FR-3/4/5/7 → duplicate/право/история → 20 callers, normal/erasing, оба порядка role/erasure lock, block race, rollback, history | `node node_modules/vitest/vitest.mjs run tests/partner.integration.test.ts tests/partner-route.test.ts tests/partner.test.ts tests/partner-landing.test.ts --reporter=verbose`; `server-tests.log` | **70 passed**, 4 файла, exit 0, 16,15 s; настоящая PG. Не полный regression. |
| FR-1–7 → реальная цепочка UI → первый mount, reload/filter, blocked раскрытый список, две сессии, timeout/denial, layout/uploader | `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/qe-primary-independent.test.ts --reporter=verbose`; `browser-baseline.log` | **14 passed**, exit 0, 61,72 s. Два движка; исходные проверки, только свои пути скриншотов. |
| FR-7 → concurrent first A/B; FR-6 → committed response loss | Та же команда с `-t 'QE independent'`; `browser-independent.log` | Обе дополнительные проверки **прошли в обоих движках**. Ответ первого HTTP POST действительно получен harness после commit, затем потерян для клиента; retry сохраняет id/одну строку. |
| FR-4/7 → реальные negative HTTP guards | Та же команда с `-t 'QE native clipboard\|QE real HTTP\|clipboard denial selects'`; `native-negative-clipboard.log` | Реальные ordinary 404, injection 422, foreign origin 403, anonymous 401, GET 405, ноль partner rows — **2 passed** по движкам. Rate-before-body проверен отдельно route suite. |
| FR-2 → фактический clipboard | Тот же native/negative прогон | **1 passed**: Chromium, реальные clipboard permissions/write/read, полный URL и success status. WebKit native clipboard этим не аттестуется. |
| FR-2/5 → wrong campaign fallback | Тот же native/negative прогон | **2 failed**: QE-BAL-02. Итого у этого запуска 3 passed / 2 failed / 22 deselected. Clipboard denial намеренно моделируется. |
| NFR → reflow/focus/contrast/field size | Browser команда с `-t 'QE independent (card reflow\|actual SSR)'`; `layout-accessibility.log` | Axe карточки без violations, keyboard focus, 44px copy, document/textarea без горизонтального overflow при 320px/200%, все 4 сочетания ×2 движка. Численный font-size assertion красный: QE-BAL-03. Это не WCAG certification. |
| FR-1 → первый экран; FR-4 → SSR без mint | `-t 'QE independent (card reflow\|actual SSR)'`, затем `-t 'chromium.*actual SSR'`; `ssr-baseline-comparison.log` | SSR active/ordinary: ровно один uploader, personal только блогеру, чтение не создало partner. Раскладка 390×844 и 1440×900 проходит; 1440×768 studio красный: QE-BAL-01. |
| A6 → uploader продолжает работу | Browser команда с `-t 'layout retains uploader\|chromium > QE independent actual SSR'`; `uploader-completion.log` | Этот selector фактически выбрал только **2 uploader tests**, оба passed, 27,23 s. После переключения 2×2 сочетаний подтверждённый объём растёт с 31 457 280 до 31 457 288 байт, UI сообщает «Файл принят». Storage/complete transport моделируется; настоящий S3/STT/render не проверяется. |
| Approved HTML → code/spec anti-drift | `node /tmp/qe-primary-blogger-20261105/mockup-check.cjs`; `mockup-metrics.json` | Свои снимки и измерения 2 движка × 2 темы × 2 вида × 390/1440. Обнаружено измеримое расхождение studio, а не pixel-diff косметики. |
| Type/contract integrity | `node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json`; `node node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json` | Оба exit **0**, stdout пустой. Выполнено после удаления своих временных test/config; проверены оригинальные текущие web/tests. |
| Whitespace/diff | `git diff HEAD --check` | Exit **0**. |

Первый независимый accessibility probe ошибочно проверял `:focus-visible` после мышиного взаимодействия через программный focus и дал `outline:none`. Это ошибка измерительного сценария, не finding приложения. Probe исправлен переходом в клавиатурную модальность; повторный фокусный check прошёл в обоих движках. Падения размера поля и первого экрана сохранились. Первичный SSR прогон 1440×900 проходил; дополнительный 768px viewport введён для проверки видимого по собственному снимку сжатия studio, а не для повторения всего regression.

## Фальсифицируемость

Production-файлы на диске не изменялись. Использован только Vite/Vitest transform собственного временного конфига либо собственного browser harness. Все пять мутаций дали exit 1 **по нужному утверждению**, без подмены результата теста:

| Мутация | Выбранный тест | Фактический отказ |
|---|---|---|
| Удалить `AND is_blogger=true` | `personal link rejects normal and deleting accounts without writes` | Promise resolved вместо отказа |
| Не возвращать existing earliest | `personal link retains earliest blocked code during block race` | Возвращён новый active id вместо blocked earliest |
| Вернуть безусловный copy в PartnerSummary | Chromium `blocked personal link cannot be copied from expanded campaigns` | Найдена 1 кнопка blocked вместо 0 |
| Удалить client personal-mode guard | Chromium `normal dashboard mount never calls auto link mutation` | 1 auto call вместо 0 |
| Возвращать выдачу первого account всем сессиям | Chromium `two blogger HTTP sessions keep personal link ownership isolated` | id A/B совпали |

Команды: `QE_MUTATION=role|earliest node node_modules/vitest/vitest.mjs run --config qe-primary.mutation.config.ts tests/partner.integration.test.ts -t '<названный тест>' --reporter=verbose`; UI — `QE_MUTATION=blocked-copy|client-mode` с browser config и названным Chromium test; ownership — `QE_MUTATION=ownership QE_TEST_BROWSER=1` с mutation config и Chromium ownership test. Логи `mutation-{role,earliest,blocked-copy,client-mode,ownership}.log`. Общий mutation score не вычислялся. Deselected tests в узких запусках не считаются ни PASS, ни недоступными обязательными сценариями.

## Anti-drift и предел вывода

- OpenSpec delta SHA-256: `320ac1ea73b4ef2bfba6240c374522bc55f9eeebe1cd930f6b87971a09ad4eb0`; совпадает с requirements-revision. Approved HTML SHA-256: `f3fad2f8a8772678b5a66538d7ad5aee4e821965f971af4a25a025d2bbaba2c6`.
- FR-3/4/7, транзакционный ADR, strict POST, GET/SSR без mint, origin из конфигурации, ownership и сохранение истории: соответствие в проверенном срезе подтверждено.
- FR-6: loading без URL, ограниченное ожидание, ручной retry, поздний ответ и потеря committed response проверены. Error не выдаётся за ready.
- FR-5: mint не обходит blocked; в обычном готовом personal UI blocked copy отсутствует также в списке, active campaign copy работает. **Сочетание active campaign + clipboard denial нарушено** — QE-BAL-02.
- FR-1/NFR: карточка открыта; ручной формы блогеру нет; desktop справа, mobile после uploader и перед VideoList; две нейтральные темы/зелёный акцент; DOM uploader сохраняется. **Полной UI-согласованности нет** из-за studio первого экрана и размера нового поля.
- Не проверены опубликованный URL, реальные production cookies/TLS/CSP, полный Next deployment, настоящая загрузка/нарезка/скачивание, ЮKassa, full90/120min и реальные мобильные assistive technologies. Их отсутствие не подменено дефектом фичи либо PASS.
- Для завершения этого начального QE нужны исправления трёх условий и новая независимая проверка фактической delta на новом host snapshot. Этот reviewer ничего не публиковал и не менял deployment-порядок.

Запись `qe-primary` сохранена под `flock` файла `.fa-state/review-convergence-qe-review.lock`; envelope, `author:null` и чужие entries сохранены. Вызван только чистый экспорт `evaluateReviewConvergence(host, receipt, independentlyRehashedManifest)` закреплённого `node_modules/@dzhechkov/skills-meta/feature-adr/scripts/check-review-convergence.mjs`, без host action. Фактический результат: `unresolved` ровно для `QE-BAL-01`, `QE-BAL-02`, `QE-BAL-03`; ошибок контракта/nonce/revision/scope нет. Результат сохранён в собственном `review-contract-check.json`. Это корректный открытый начальный review, не closure. Финальный `git diff HEAD --check` — exit 0.

## Originating focused review после actual author rework — 05.11.2026

**Актуальный scoped verdict: clean. QE-BAL-01/02/03 независимо проверены и закрываются на новой ревизии.** Предыдущий conditional выше сохранён как история первоначального review; исходные тексты условий не изменены. Новых подтверждённых условий нет. Letter grade не присваивается.

Requested model/reasoning: `gpt-6-astra xhigh`, та же originating session `01a1aca3-b1ee-7982-bf5e-71aa9280b9fe`, без coding-контекста автора. Новый nonce `c973380c-9445-476a-aad5-476e899da92c`, measured revision `eafecbe9c54dff47fed7aa423a7ed398594560c94da61f97585303058bd39c79`. Прочитаны exact `author` из receipt и `07_code_changes/rework-handoff.json`: объекты совпадают. `focused-prepare.private.json` совпадает с host по nonce/revision/manifest. Авторские заявления о PASS прочитаны как оценка автора, но доказательства ниже получены собственным исполнением.

**Фактический scope.** Сопоставлены все пути author.changedScope и хеши предыдущего/нового snapshot. В новом manifest 75 файлов, включая 16 добавленных снимков. Из source/tests относительно originating QE изменены ровно `PartnerPanel.tsx`, `globals.css`, `tests/browser/blogger-auto-link.test.ts`. Остальное изменение measured paths — progress/снимки; это не 75 production-правок. Серверные файлы, page.tsx, требования, ADR и OpenSpec сохранили прежние hashes. Повторно прочитаны изменённый Panel, CSS-каскад, изменённые тесты и затронутые связи с WorkspaceHeader/Settings, Uploader, upload-parts, workspace-layout. Поиск всех потребителей PartnerSummary/onCopy не обнаружил пропущенного production callsite нового callback. Зависимости Uploader/Settings/Header/upload-parts/workspace-layout не имеют diff относительно HEAD.

**Code-critic delta.** CSS сужает только personal studio: uploader получает один внутренний столбец, preview скрывается CSS без перестройки React-дерева; ordinary studio не затронут. Для fallback target берётся из статьи нажатого кода до await, личная кнопка передаёт свой textarea; после отказа используется подключённый target и стандартный native Selection/textarea.select. Новый параметр обработчика доведён до обоих callsites. Отдельного состояния, повторного генератора, записи при SSR, новой зависимости или миграции не добавлено. `max(1rem,16px)` сохраняет масштабирование поля. Новых code-critic concerns по фактической delta не подтверждено.

### Собственные focused результаты

В предоставленном изолированном `*_test` PG/Redis профиле, Node22, нативные Chromium/WebKit выполнены сохранённые originating probes и узкие новые контрактные тесты после самостоятельного чтения. Для запуска созданы свои временные копии; единственное изменение копии актуального suite — перенаправление PNG в собственный `/tmp`. Авторские measured artifacts не перезаписывались. Результат: **2 файла, 16 passed, 31 deselected, exit 0, 93,20 s**; deselected — не результаты PASS. Полный regression не повторялся.

```bash
node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts \
  tests/browser/qe-primary-focused.test.ts tests/browser/qe-primary-independent.test.ts \
  -t 'actual SSR|clipboard denial selects|16px minimum|card reflow|layout retains uploader' \
  --reporter=verbose
node node_modules/typescript/bin/tsc --noEmit --incremental false -p apps/web/tsconfig.json
```

Вторая команда также exit 0. Environment загружен прежним приватным профилем без печати значений. Лог текущего собственного прогона: `/tmp/qe-primary-blogger-20261105/focused/probes.log`; typecheck: `focused/typecheck-web.log`. Собственные test copies и PNG сохранены в `focused/`; временные test-файлы удалены из repo **до записи receipt**.

| Исходное условие / риск последствий | Текущее независимое наблюдение |
|---|---|
| QE-BAL-01: композиция и первый экран | Actual async Dashboard + WorkspaceHeader, полный CSS: CTA bottom на 1440×768 — **689,421875 px Chromium / 689,34375 px WebKit**, обе темы. Сохранился один uploader, внутри studio один столбец; preview hidden. На 390×844 обе компоновки проходят; горизонтального overflow нет. Собственный новый снимок studio сопоставлен с originating approved composition. |
| QE-BAL-02: requested URL при clipboard denied | Native selection равен адресу нажатого действия: personal active; campaign при обоих active; active campaign при blocked personal; ordinary campaign. Все случаи проходят в двух движках, включая исходный собственный красный reproducer. Фильтр сохраняет personal URL; blocked личная кнопка остаётся disabled. |
| QE-BAL-03: размер поля | Собственный computed style даёт **16 px** при 100% во всех 4 сочетаниях theme/layout ×2 движка. При 200% поле масштабируется; 320px reflow без горизонтального overflow document/textarea, весь URL выделяется. Keyboard focus, 44px copy и axe карточки проходят originating probe. |
| File identity / continue upload | Capture listener сохраняет настоящий File до очистки input, native File.slice получает **тот же объект**, DOM input остаётся подключённым и тем же при всех переключениях. После снятия управляемой задержки progress растёт **31 457 280 → 31 457 288**, complete вызывается один раз, UI сообщает «Файл принят», нового ensurePersonalLink при переключениях нет. Оба движка, 320/390/1440, обе темы/вида. |

**Авторская оценка новых рисков проверена.** Утверждение об ограниченном CSS scope соответствует каскаду; обычный режим сохраняет свой preview. Риск выбора не того DOM target проверен native selection во всех указанных режимах; disconnected target не получает фокус. Риск уничтожения живого uploader проверен DOM, настоящим File и завершением передачи. Новых подтверждённых рисков, требующих condition, по actual delta не выявлено. Отсутствие дополнительных условий основано на этих проверках, а не на авторском `newRisks.conditions:[]`.

**Anti-drift и ограничения.** Три исходных acceptance meaning сохранены и выполнены; approved docs/OpenSpec не изменились. Runtime-проверка использует настоящий SSR-компонент, auth/HTTP/service/PG; серверные seams SSR и транспорт upload контролируются harness, как в originating scope. Это не full Next public E2E, не настоящий S3/STT/render, не full90/120min/payment CJM и не проверка физического iPhone/его autozoom. Full Next публичная приёмка остаётся следующей работой root после deploy. Production, три demo-аккаунта, Cloud.ru не затрагивались; commit/push/deploy не выполнялись.

Focused receipt записан под прежним `flock`: исходные три conditions сохранены дословно, добавлены три structural verifications на текущую revision, `authorAssessmentChecked:true` и проверенная structural deltaVerification. Actual author, envelope, чужие entries и host не менялись; все 75 measured hashes совпали. Чистый экспорт закреплённого `evaluateReviewConvergence` вернул **closed**, `unresolved:[]`, `reasons:[]`; это read-only проверка receipt, не host lifecycle action. Собственный результат: `focused/receipt-evaluation.json`. Финальный `git diff HEAD --check` — exit 0.
