# Независимое risk / security / integration review

Текущий итог, 05.11.2026 06:07 UTC: **SOURCE GO для ограниченной, уже авторизованной TEST web выкладки на clipmkr.ru**, в границе этого независимого risk/security/integration review. RISK-01 HIGH и RISK-02 MEDIUM закрыты собственными повторными проверками. Freeze29 digest независимо подтверждён: `68ba189b05f6832c7883c8d2d5581fbf8ed948f8fd67b1e4de32b8fa42e2b131`.

Допуск относится к проверенным исходникам и тестовой выкладке приложения с сохранением существующих данных/config/volumes. Full feature/CJM, опубликованные144пары, ручная приёмка, Cloud.ru и production/DNS этим отчётом не подтверждаются. Root выполняет свежую проверку фактического target/source-image перед update и последующую приёмку. Наличие SOURCE GO не является выполненным deploy или feature-adr checkpoint receipt.

Ниже сохранены исходные находки и фактические результаты двух предыдущих заходов. Их промежуточные SOURCE BLOCKED заменены итогом финального раздела; отрицательные результаты не удалены из истории.

## Контекст и независимость

- Сессия: `/root/ui_source_risk_astra`, новый контекст без истории написания кода; начало 05.11.2026 05:45:53 UTC.
- Запрошенная конфигурация reviewer: `gpt-6-astra`, reasoning `xhigh`; заявленная конфигурация авторов в задании: `gpt-6.1-sol high`. Независимая runtime attestation точного ID модели/effort в инструментах этой сессии отсутствует. Поэтому cross-model указан как запрошенная конфигурация; точное различие runtime моделей этой сессией не аттестовано.
- Рабочая копия: `/tmp/clipmkr-mockup-realization-20261104`; baseline `153a9cd7d14d89776ab38bd83b04594bcb421d50`; HEAD при начале `775a70731a955e73b6e8aab5e37cc3981c76de7f` плюс незакоммиченный diff и три новых production-файла.
- Сначала прочитаны AGENTS.md, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, feature `01_requirements.md`, `03_adr/001–004`, `04_domain_model.md`, `05_architecture.md`, `06_implementation_plan.md` и привязанные оригинальные HTML. Затем реализация и тесты найдены через git diff / rg. Авторские handoff, QA и старые вердикты не использованы как доказательство.
- Применены `code-critic` и `studio-extended-qe` из `/home/product-studio/.agents/skills/`: методы contract-testing, security-testing, ограниченных локальных отказов/lifecycle. Прочитаны pinned protocols из `vendor/agentic-qe`, revision `c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`. AQE runtime, внешние агенты и production chaos не запускались. Требование задания исполнить тесты имеет приоритет над read-only формой code-critic.
- Код, БД, роли, provider settings, домены и deployment не менялись; commits/push не выполнялись. Записан только этот отчёт и временные независимые probes вне Git.

## God-object growth (BLOCKING)

Новых нарушений в просмотренном diff не найдено: Uploader 199 строк, VideoDetail 139, UpgradeScreen на первоначальном срезе 106, standalone runner 363. Существующие backend-модули не рефакторились.

## Security violations (BLOCKING / HIGH)

### RISK-01 — HIGH, CLOSED — поздний checkout старого account owner продолжает навигацию после remount

Первоначальный файл: `apps/web/src/app/upgrade/UpgradeScreen.tsx:31–46`, прежде всего `window.location.assign` на строке 40. Account reset добавлен в `apps/web/src/app/upgrade/page.tsx:27` через `key={session.account_id}`.

Контракт FR-7 требует, чтобы смена аккаунта не наследовала payment state. Key действительно создаёт новый экземпляр и сбрасывает keys/busy/error, однако старый async `pay` продолжает существовать. После `fetch` и после `response.json()` нет проверки жизнеспособности экземпляра/attempt. Поздний успешный ответ экземпляра A вызывает глобальный `window.location.assign` уже после появления экземпляра B. Пользователь попадает к оплате/return старого intent, хотя новый экран уже показывает готовое к покупке состояние.

Независимое воспроизведение на исходном компоненте в Chromium:

1. React монтирует UpgradeScreen с `key=A`, отправляется один POST оформления.
2. Выполняется настоящий React remount того же компонента с `key=B`, как задаёт SSR page. Новый экран: `busy=false`, кнопка доступна.
3. Отпускается задержанный ответ A `201`, `intent_id=intent-for-account-A`.
4. Браузер переходит на `/upgrade/return?intent=intent-for-account-A`; новых POST не было.

Первый probe использовал Playwright network interception. Второй отдельно задержал `response.json()` после получения response и намеренно не исполнял AbortSignal: он доказывает необходимость проверки позднего результата, а не только попытки отменить transport. Оба наблюдали stale navigation. Второй дал assertion failure / exit 1.

Направление исправления: ограничить checkout жизненным циклом владельца/попытки, отменять запрос при unmount и проверять актуальность после каждого await перед navigation/state updates; сохранить тот же SKU key для явного retry. Добавить отрицательный сценарий A pending → B remount → поздний success/error A. Повторная проверка должна запускать тот же отрицательный probe и обычные pending/retry/preferences сценарии.

Ограничение доказательства: это настоящий mounted React/Chromium с контролируемым ответом, а не реальное переключение сессии в опубликованном Next и не платёж в ЮKassa. Утечка данных через серверный auth или реальное списание на другой аккаунт не утверждаются. Дефект относится к заявленному frontend account-lifecycle контракту и затронутому checkout owner.

## Architectural concerns (HIGH / MEDIUM)

Других подтверждённых новых нарушений в проверенной границе не найдено. `readDashboardSummary` переиспользует `remainingLimits`, React `cache` принимает account как аргумент; persistent/global account cache не добавлен. Header получает серверные snapshot/owner flags. Это исходниковая проверка; поведение actual Next cache с разными опубликованными сессиями требует отдельного прогона.

## Anti-pattern violations

Новое автоматическое оформление по theme/layout не найдено. Платёж остаётся явным click; synchronous pending ref закрывает два синхронных клика. Новый progress observer не выполняет сеть/запись manifest и не меняет существующую storage/Complete authority. Других новых подтверждённых нарушений нет.

## Type / contract issues

Подписи SKU, purchase windows, credit readers и signed-media endpoints сохранены. `npm run typecheck` завершился exit 0. Проверка account-fence остаётся RISK-01, а не ошибкой TypeScript.

## Edge-case sweep

| Требование → риск | Проверенный сценарий | Наблюдение / граница |
|---|---|---|
| FR-7 → auth/erasure/private data | Dashboard erasure/auth до summary; pageAccount в private pages; Upgrade auth + active billing до credit read | По исходникам guards сохранены; auth/retention unit PASS. PostgreSQL findSession требует active account; erasing/deleted не становятся authenticated. |
| FR-7 → ownership/media | Чужой/отсутствующий clip, expired, отсутствие сессии/ключа, guest bad ticket, storage down | Существующие handler-тесты PASS; 404/no signature/no-store сохраняются. Настоящий S3 не вызывался. |
| FR-5/6 → цены/eligibility/двойное оформление | Actual CREDIT_SKUS, owner, catalogOnly, salesOff, missing windows, delayed success/reject, explicit retry | PASS; тот же SKU/key при retry, один pending запрос через обе preferences. Account-remount late success — RISK-01 FAIL. |
| FR-3/6 → ложный progress/Complete | Уникальные ETag parts, неполный последний part, refresh, abort, late PUT/refresh | Unit PASS; confirmed bytes observational, full manifest остаётся единственным persisted parts contract. |
| FR-3/7 → восстановление/смена аккаунта | Pause/reselect/separate Continue; full/incomplete reload; stale cookie; account change late Complete; unmount | PASS в Chromium и WebKit. Транспорт контролируемый; это не provider proof. |
| FR-4/6 → player/guest side effects | Второй playing clip, два polling ticks, prefs, explicit selection pause, removed/unavailable fallback, четыре cards, guest disclosure nonce | PASS в обоих engines; реальное browser playback локального MP4, API mocked. |
| FR-7 → public regression | Public palette restore; theme, short-link, guest ticket, retention и return contracts | Unit/browser PASS; diff `/`, `/c`, `/g`, `/upgrade/return`, API handlers отсутствует. Опубликованные маршруты ещё не проверены этой сессией. |
| FR-8 → wrong stage/data loss | Guard отвергает dev IP/чужой project/origin; missing private fixture exit 2 | PASS. Runner требует fresh private witness source/image/container/backup/data/config; сам не выполняет deploy/seed. Действительный witness непосредственно перед выкладкой остаётся root. |

## Test quality

Проверки независимо запускались Node `v22.23.4`; полный путь для всех npm/node команд:
`PATH=/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin:$PATH`.

1. `npm test -- tests/mockup-ui-realization.test.ts tests/upload-browser.test.ts tests/upload-resume.test.ts tests/upload-file-identity.test.ts tests/upload-guards.test.ts tests/upload-route.test.ts tests/billing.unit.test.ts tests/credit-packages-ui.test.ts tests/auth.test.ts tests/progress-screen.test.ts tests/workspace-presentation.test.ts` → **11 файлов, 114 PASS, exit 0**, 94.73 s.
2. `npm test -- tests/theme.test.ts tests/short-link.test.ts tests/guest-pack.test.ts tests/retention-route.test.ts tests/blogger-policy.test.ts tests/limits.test.ts tests/upload-completion-integrity.test.ts` → **7 файлов, 125 PASS, exit 0**, 9.23 s.
3. `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/upload-lifecycle.test.ts tests/browser/mockup-ui-realization.test.ts -t 'packages_use_actual|checkout delayed|native_picker|selected_player|paused_progress|full_manifest|stale_cookie|account_change|unmounted_attempt|pause_reselect|resume_uses|navigation_denial|confirmed_leave|hash_mismatch|legacy_or_lost'` → **38 PASS, 44 не выбраны фильтром `-t`, exit 0**, 159.73 s. Это не полный browser suite; 44 случая не записываются как PASS.
4. `npm run typecheck` → **exit 0**.
5. `git diff --check` → **exit 0**.
6. `node /tmp/clipmkr-risk-checkout-race.mjs` → **exit 0 как диагностический probe**, `staleNavigationObserved=true`: наблюдение дефекта, не PASS gate.
7. `node /tmp/clipmkr-risk-checkout-fence.mjs` → **exit 1**, `guard=FAIL`, `AssertionError: Late checkout from account A must not navigate account B`.

AM-6 maintenance проверен по реальному diff: header link проверяется через rendered WorkspaceHeader; disabled-кнопки подсчитываются без зависимости от порядка атрибутов, отдельные catalogOnly и salesOff случаи сохранены/добавлены. Это не ослабление eligibility. Новый SSR credit-read test мокает auth/DB и доказывает порядок вызовов/рендер; он не доказывает реальную сессию, transaction или request-cache isolation.

## Process / done-ness gaps

Из-за изменяемого worktree этот отчёт привязан к измеренным файлам, а не только HEAD. Соседнее независимое review сообщило о планируемой правке видимости условий покупки и runner geometry; его вердикт не подменяет собственную повторную проверку delta. Full feature GO, production GO, выполненный native checkpoint или ручная приёмка здесь не утверждаются.

Первый полный manifest записан 05:46:29.531194 UTC в `/tmp/clipmkr-risk-review-start.json`: SHA256 canonical sorted `path + NUL + sha256 + LF` для 2465 найденных файлов apps/packages/scripts/tests = `4187fc20276a5d0aacede2649a8b91fb7fa4f6efe9cf000e62d89394c510235d`.

Отдельный digest 16 изменённых production source files (13 tracked diff paths, новые WorkspaceHeader, dashboard-summary и runner): **`9a15e3f81045a4a0e51364ece68f1c1fbd5d8aec2ab910fb79ac556700989f5b`**. Повторное измерение 05:49:57 UTC совпало. Начальные критичные файлы: UpgradeScreen `31331dd3ea18d9785c4598f4656905db2d7578bca36ebaf4c8c8a7b7ae34c06f`; upload-parts `49aeb9d37fa5041f524975007cb8d419004e205b12b4dc5ba411bde68556ad48`; Uploader `ffd721ffabb1e9947bf7d56874a3e1efebb8a8d94908a15d7e8a1a145d31310b`; runner `2a36f24df9d98fdfa50bb018ae2ae01770013677974d2342aa21e0c93a22f9a4`.

Оригинальные HTML независимо хешированы и совпали с requirements: style `9ea8f63f7dc66bb46a63276177f8033c9463e644b53e4b9e15d065ed49659106`, flow `6f45ee0a6175ce1cb6bc46162dd2521fd3ee3698556eae53664967fbc147e299`.

## Production safety

Изменений миграций, Compose, provider configuration, API auth/ownership handlers или DB billing операций в diff нет. Limited preview разрешается оценивать отдельно от subsequent published acceptance, но текущая RISK-01 должна быть устранена. До фактического update root повторно проверяет именно `https://clipmkr.ru`, IP `194.85.249.105`, project `n5-clipmaker`, container `n5-clipmaker-web-1`, сохранение данных/config/volumes и привязку source/image. Исторический operations document не заменяет свежее наблюдение. Cloud.ru и production/DNS этим отчётом не разрешаются.

## Suggestions only (LOW)

Нет дополнительных рекомендаций ради количества замечаний.

## Open questions for the parent

Не требуется нового разрешения владельца на уже авторизованный test preview. Требуется результат исправления и повторной проверки RISK-01 на новом source digest.

## Skipped checks

- Настоящий published Next SSR/RSC/cache с independent account/owner/erasure browser sessions, 144 пары, ручное визуальное сравнение и actual browser page zoom — последующая приёмка root после разрешённой тестовой выкладки.
- Реальные S3/provider pipeline, ЮKassa test-store/replay/cancel/relogin, referral journey, ordinary5400/5401 и blogger7200/9000/9001 boundaries — не запускались этой сессией; локальные тесты их не закрывают.
- Full build/lint, полный unit/browser suite, PostgreSQL/Redis integration и восстановление backup — не дублировались этой risk-сессией. Доступ к рабочей БД/провайдерам не требовался.
- Runtime model attestation недоступна. `architecture/vision.md`/`architecture/degradations.md` в этой рабочей копии отсутствуют; применены feature architecture и явно заданный scope, без поиска старых неизменённых backend недостатков.

## Конечный срез первого review

Измерено независимо 2026-11-05T05:53:15.209934+00:00; HEAD `775a70731a955e73b6e8aab5e37cc3981c76de7f`. Полный digest прежнего списка 2465 файлов: `faca8255f852cc28dec970e506d669dc819370c25e6e959b1dbc4c70a380b0ae`. Production digest тех же 16 путей: `9a15e3f81045a4a0e51364ece68f1c1fbd5d8aec2ab910fb79ac556700989f5b`. Изменившиеся пути: tests/browser/mockup-ui-realization.test.ts. Manifest: `/tmp/clipmkr-risk-review-end.json`. Независимый regression probe `/tmp/clipmkr-risk-checkout-fence.mjs` SHA256 `ceba63d5a96127e0902aa723bfe124e86abbb9dcbc75cddb0f7cdcb353580110`. Итог этого среза: **SOURCE BLOCKED — открыта RISK-01 HIGH**. После исправления требуется новый delta review; зелёные результаты текущего среза не переносятся на изменённый checkout автоматически.


## Повторная независимая проверка RISK-01 — 05.11.2026 05:57–05:59 UTC

**RISK-01 CLOSED на production digest `ba9837e3967d7e059399427b0a5f7df030d788fcd05119cb907f22835427fa49`.** Самостоятельно прочитана новая дельта, авторские PASS не использовались. Исправление в `UpgradeScreen.tsx:27–64` добавляет per-attempt AbortController, mounted-флаг, cleanup при unmount и проверку `mounted && pending === attempt && !aborted` после fetch, после JSON, перед ошибкой и очисткой busy. Успешный действующий checkout сохраняет pending/busy до navigation. Новая попытка не может быть очищена продолжением старой. На просмотренном исправлении новых подтверждённых рисков кода не найдено.

Также прочитаны изменения видимых условий покупки, порядка ошибки у CTA в CSS и runner geometry. Они не меняют SKU/права/guard/private readers, не добавляют provider/DB/deploy side effects. Обязательная независимая визуальная приёмка этого отчётом не заменяется.

### Собственные исполненные проверки

Все команды с прежним Node22 PATH.

| Команда | Фактический результат |
|---|---|
| `node /tmp/clipmkr-risk-checkout-fence.mjs` | **PASS, exit 0**; прежний RED: response A уже получен, body задержан, Abort игнорируется; после remount B URL остаётся `/risk.html`, `staleNavigationObserved=false`. Тот же исходный probe без подгонки под исправление. |
| `node /tmp/clipmkr-risk-checkout-matrix.mjs` | **12/12 PASS, exit 0**: Chromium/WebKit × задержка response/JSON × success/failure/rejection. Реальный StrictMode tree, A pending → remount B → собственный B pending → тот же key B rerender → late A. Проверены abort A, живой signal B, отсутствие stale navigation/error, сохранение busy B, отдельный отказ B, новый ключ B относительно A, тот же ключ при явном retry B, успешная навигация только к `intent-B`. Transport намеренно игнорирует abort. |
| `npm test -- tests/mockup-ui-realization.test.ts tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` | **44/44 PASS, exit 0**, 11.24 s. |
| `npm run typecheck` | **exit 0** на новом коде. |
| `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts -t 'checkout|packages_use_actual|purchase|disabled'` | **8 PASS, 2 FAIL, 12 не выбраны фильтром, exit 1**, 56.57 s. Ошибки ниже; весь набор не маркируется PASS. |

Независимый matrix SHA256: `11db79ce0310e2e14ff9d8026e5645fdbf0aed10f0e7c55f228cb552de1edf33`; исходный fence SHA256 неизменен `ceba63d5a96127e0902aa723bfe124e86abbb9dcbc75cddb0f7cdcb353580110`.

### RISK-02 — MEDIUM, CLOSED — test-quality gate: ожидание pending navigation блокирует oracle

`tests/browser/mockup-ui-realization.test.ts:111–129`, конкретно строка124 Chromium `locator.isDisabled` и строка126 WebKit `locator.evaluate`. В `checkout delayed success keeps one request through preferences` checkout успешно начинает navigation, target route удерживается gate; затем Playwright locator пытается читать/кликать старый document и ждёт завершения той же navigation. Gate отпускается только в finally после timeout. Получены реальные 10-second timeout в обоих engines.

Это подтверждённая ошибка исполнения обязательной проверки busy/dedup, а не подтверждённый product checkout regression. Удалять assertions/переставлять их до acceptance response ради зелёного результата нельзя: требуется наблюдать тот же контракт без взаимного ожидания test runner и navigation. Root сообщил, что направляет существующий тест на узкую корректировку. После нового test hash нужен самостоятельный повторный запуск; текущий красный результат не переносится как PASS.

### Hash / drift и граница допуска

Начало повторной проверки: `2026-11-05T05:57:17.106813+00:00`; конец `2026-11-05T05:59:31.028594+00:00`. HEAD `775a70731a955e73b6e8aab5e37cc3981c76de7f`. Production digest 16 путей в начале и конце совпал: `ba9837e3967d7e059399427b0a5f7df030d788fcd05119cb907f22835427fa49`. Полный digest того же списка2465 путей совпал: `56f437c588abba3fd48becc728474ab088715624701489b8c2b7766d44c22cb9`. Изменений за время этого захода нет. Manifests `/tmp/clipmkr-risk-recheck-start.json` и `/tmp/clipmkr-risk-recheck-end.json`.

Точные изменённые пути относительно первого review:

- `apps/web/src/app/upgrade/UpgradeScreen.tsx`: `7f221ab699c033a57069d9eeef4c73101d3a1ec9d578547fc697e57b64cd064b`.
- `apps/web/src/app/globals.css`: `fff309bcbd7f000b73808badf1ff72135c4a7f8064734bd6b042a33c7ffc12ed`.
- `scripts/check-mockup-ui-realization.mjs`: `6daad55e743d21e209198fd1b43ff11ebec428092dd1abe984314f8320cc1940`.
- `tests/browser/mockup-ui-realization.test.ts`: `5a631bd228c717af1acd65c10c0aa6ef9b6ec39184bf908900037fcff89dd9dc`.

Author session87640 и окончательный sourcefreeze ещё не подтверждены этой сессии. Любой следующий source/test drift требует delta recheck. Текущий статус: **SOURCE BLOCKED по browser admission; RISK-01 закрыта; RISK-02 открыта**. Новых product security blockers в исправленном срезе не обнаружено. После успешного retest можно оценить только ограниченную TEST web выкладку; full feature/CJM, published144pairs, owner acceptance и Cloud остаются вне этого допуска. Все ограничения первого review о mocked transport, реальных сессиях/провайдерах и runtime model attestation сохраняются.


## Финальная независимая проверка freeze — 05.11.2026 06:06–06:07 UTC

**Итог: SOURCE GO только для ограниченной TEST web выкладки. Открытых source blockers в проверенной risk/security/integration границе нет.** RISK-01 остаётся закрытой; RISK-02 закрыта фактическим запуском исправленного browser oracle в Chromium и WebKit.

Root сообщил об остановке внешних writer процессов с TERM143 без terminal handoff и принятии единоличного владения записью. Это не записывается как успешное завершение авторских сессий. Свежие source hashes и результаты ниже получены самостоятельно; прежние авторские заявления об успешных тестах не использовались.

### Проверенная дельта

- `tests/browser/mockup-ui-realization.test.ts:111–131`: F4 теперь синхронно снимает настоящий DOM в `beforeunload`, сохраняет только disabled/label/allDisabled в test-only `window.name`, затем проверяет снимок и единственный checkout после фактической navigation. Прежнее обращение locator к уходящему document убрано; assertions о busy и блокировке всех покупок сохранены. Fixture остаётся same-origin, приватные данные и payment URLs в `window.name` не записываются.
- `scripts/check-mockup-ui-realization.mjs:55–57`: ceiling16rem применяется выше608px согласно отдельному mobile reference. Ratio9:16 и порядок player/list проверяются на всех размерах; desktop ceiling не снят. Новые отрицательные unit cases отвергают неверный mobile ratio/order и превышение desktop ceiling. Эта правка относится к oracle и не меняет приложение/права/платёжный код.
- `UpgradeScreen.tsx` побайтно совпадает с независимо проверенной RISK-01 correction (`7f221ab699c033a57069d9eeef4c73101d3a1ec9d578547fc697e57b64cd064b`). Abort/attempt/mounted fences сохранены; новые продуктовые security risks в этой дельте не найдены.

### Исполненные финальные команды

Все команды выполнены Node22.23.4 с указанным ранее PATH:

1. `npm exec vitest -- run --config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts -t 'checkout|packages_use_actual|purchase|disabled'` → **10 PASS, 12 исключены фильтром, exit0**, 37.02s. В обоих engines прошли pending preference/retry, F4 success navigation, account-remount с transport ignoring abort и задержками response/JSON, ошибка у CTA и видимость условий покупки. Полный browser suite из этого числа не выводится.
2. `node /tmp/clipmkr-risk-checkout-fence.mjs` → **PASS, exit0**, тот же собственный probe SHA256 `ceba63d5a96127e0902aa723bfe124e86abbb9dcbc75cddb0f7cdcb353580110`: late A body не изменяет URL после remount B. Предыдущая независимая12-case StrictMode матрица относится к этому же неизменённому UpgradeScreen hash; повторно как новый12-case запуск здесь не заявляется.
3. `npm test -- tests/mockup-ui-realization.test.ts tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` → **55 PASS, exit0**, 12.58s;21 runner/catalog cases,27 billing и7 credit UI.
4. `node node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json` → **exit0**.
5. `git diff --check` → **exit0**.
6. Независимое чтение29 файлов, SHA256 каждого и `SHA256(compact JSON([{path,sha256},…]))` в порядке freeze manifest → **29/29 совпали**, digest `68ba189b05f6832c7883c8d2d5581fbf8ed948f8fd67b1e4de32b8fa42e2b131`.

### Окончательная привязка

Начало: `2026-11-05T06:06:08.429056+00:00`; конец: `2026-11-05T06:07:28.721232+00:00`. HEAD `775a70731a955e73b6e8aab5e37cc3981c76de7f` плюс проверенные незакоммиченные файлы. Все29 per-file hashes сверены с `/root/.config/clipmkr/release-parity-20261103/mockup-ui-realization-installed-gates-20261105/source-freeze.private.json`; digest не принят на веру, а пересчитан из фактических bytes. Собственные manifests `/tmp/clipmkr-risk-final-start.json` и `/tmp/clipmkr-risk-final-end.json`; drift между ними отсутствует.

Собственный canonical digest16 production paths **включает runner**, поэтому после mobile-oracle correction он закономерно отличается от предыдущего захода: `99bf98e11fb4d6d96123e35b99725aeabefdb69ef27495a260891321abe75915`. Полный canonical digest списка2465 путей: `5526a555c0c5900945f978f2078d0e74ff3c343502dd4ff12fadbe12e856b72b`. Оба совпали в начале и конце финальной проверки.

Финальные изменившиеся файлы:

- runner: `93c80e397ed15bbc2a2553466e5e0d77feab899051125ca5892db283534c70a7`;
- browser suite: `b3f908411b33fb9465541e5f86694f41fe9eec3deb0bbb84daa5a374b3c161ad`;
- runner unit suite: `63a82f93e6ea4822e2b46ddbbaf5a9126f41898ba7911e5910a52adbab0e969d`.

### Неизменённые границы доказательства

Этот GO допускает уже разрешённую app-only TEST web выкладку на фактически повторно проверенный `https://clipmkr.ru` / `194.85.249.105` / `n5-clipmaker` / `n5-clipmaker-web-1` с существующими данными и конфигурацией. Новых разрешений владельца не требуется из-за отсутствия ещё не проведённой published приёмки. Однако целевой runtime, backup/config/data preservation и source-image identity непосредственно перед update проверяет root; эта reviewer-сессия туда не подключалась.

Матрица144paired captures, actual Next account/erasure/cache, реальные S3/provider/ЮKassa/referral и duration boundaries, ручная приёмка и дальнейшая поставка остаются самостоятельными этапами. Seeded metadata + копия настоящих S3 assets, если используются root, доказывают только явно обозначенный actual Next visual сценарий и не становятся provider-pipeline PASS. Runtime model ID/effort по-прежнему доступны лишь как requested configuration, не attested execution. Исходники/БД/роли/домены/провайдеры не менялись reviewer; никаких фиктивных receipts или productionGO нет.
