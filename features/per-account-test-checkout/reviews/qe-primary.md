# Независимое QE: per-account-test-checkout

05.11.2026. **Вердикт: clean в ограниченном scope.** Подтверждённых нарушений FR-1–FR-7 в рассмотренной реализации не найдено; conditions отсутствуют. Это первичное независимое ревью, не closure, checkpoint или разрешение deployment/настоящих списаний.

Роль `qe-primary`, family `owner-exception`. Model requested: `gpt-6-astra`, reasoning `xhigh`; автор по поручению координатора — `gpt-6.1-sol high`. Session actual: `01a1acda-0e67-7cc3-8302-48aee88b0e25` из `CODEX_THREAD_ID`. Назначение модели взято из команды координатора; отдельная runtime-аттестация model ID этому исполнителю не предоставлена. Сессия началась с документов, была прервана до review и продолжена после freeze. Авторские отчёты, private author logs, 07/08 и прежние review findings не использованы и не прочитаны. Авторский full suite не является доказательством этого отчёта.

Привязка к actual host:

- nonce `092d1723-55a0-4f76-8b30-24249709e30e`;
- revision `7d0032817aeed2d95acf812475dcba4ff07b4ac79135b06dde39a916630fba2e`;
- все **32 manifest entries** независимо пересчитаны до и после проверок: расхождений нет; digest сериализованного manifest соответствует revision;
- SHA-256 неизменённого host-файла: `98f95e982de1e0b191d192b74f5c04d0a7407749ac2bf7c37c45728588f9fdd4`;
- OpenSpec: `openspec/changes/per-account-test-checkout/specs/checkout-access/spec.md`, SHA-256 `1c8457610d97f282cea1d55f1f641f983c0798ee813a1cd7483f78926a3c5b6e`, совпадает с `requirements-revision.json` и FR mapping. Implementation base: `24b4b4a4be4364659142b1428511fb634378ddbc`.

Входы сначала: AGENTS, CLAUDE, применимые локальные security/testing/secrets rules, review-policy, model-matrix, core-cjm; feature 01, 02, ADR-001, 05, 06 с AM-5, owner-authority, requirements-revision и точная дельта. Далее самостоятельно исследованы EXPECTED_CODE_TARGETS, diff к base и необходимые consumers: реальные routes, auth/session readers, rate-limit, wiring checker и browser regression. Хеширование ideation report из host manifest не сопровождалось чтением его содержания.

Прочитаны code-critic и `/home/product-studio/.agents/skills/studio-extended-qe/SKILL.md` с testing/extended-qe instructions. Применены risk-based, contract, security, regression, mutation и evidence/anti-drift методики; шесть protocol hashes сверены с pinned upstream `c0ddcf3fc07fcea0d1b37f41ad65372b3de7ce69`. AQE runtime, fleet и недоступные API не запускались. Code-critic/helper из прочитанной installed skill побайтово совпадают с templates физического `skills-feature-adr 1.5.25`; helper только прочитан, не исполнен.

**Scope grade: scoped source review + реальные локальные integration/browser probes.** Главные риски выбраны по последствиям: чужой доступ/LIVE, непроведённая policy, двойное начисление, утечка identity и stale checkout после смены аккаунта. Новых архитектурных/безопасностных условий по результатам этого scope не установлено.

| Требование / риск | Самостоятельная проверка | Наблюдение и предел доказательства |
|---|---|---|
| FR-3/5: fail-closed конфигурация | `config.ts:94–125`, существующий payments parser/preflight; absent/empty, whitespace/list/uppercase, global true+UUID, off/fake, legacy, неверный ключ, testMode=false | Отказ непригодных комбинаций, exact TEST policy; legacy global branch без UUID сохранена. Префикс ключа не доказывает настоящий магазин. |
| FR-1/2/4: session identity, обязательный callback | handler/deps/runtime, настоящие A/B AuthService/PG sessions, missing callback, body/query/header spoof, чужой status | B/anonymous отказаны; тело не прочитано в handler probe; delta intents и create/get provider calls нулевые. A получает собственный intent, чужой status — 404. Missing callback даёт 503 до body. Native Next дополнительно проверяет реальную runtime wiring. |
| FR-4/5, AM-5: доставка настройки | environment → loadWebConfig, synthetic compose web-only projection, required web-key negative control, wiring и три clip-music consumers | Общая fixture исправлена одним пустым ключом; worker delivery не расширена, checker не ослаблен. Все выбранные проверки прошли. |
| FR-4/7: SSR и POST | Одинаковая canonical policy; реальные enabled/disabled controls с пригодными purchase windows; anonymous, отзыв, provider absence | A доступен, B закрыт; прежние owner/catalog/windows guards сохранены. Native SSR/POST и unit controls дополняют друг друга. |
| FR-6: overlap, ownership, отзыв, webhook | Настоящий PG + локальный HTTP YooKassa adapter/fixture; barrier до atomic lookup/create; distinct HTTP attempts и unique payment count | Два перекрытых checkout дают один intent/payment, одинаковый provider key=intent.id; повтор webhook — один grant. После отзыва новые покупки закрыты, status/TEST webhook работают. requery.test=false даёт 400 и нулевые event/payment/grant deltas; true затем применяется один раз. |
| FR-4: privacy | Native Next initial HTML с inline Flight; непустые `text/x-component` ответы по клику Next Link; Chromium/WebKit, A→B→A | UUID/синтетические credentials и проверяемые escaped forms отсутствуют в HTML/Flight/DOM/log. HMAC remount key стабилен для A и различается у A/B. Это не проверка production Secure-cookie. |
| FR-4/7: account-remount | Отдельная existing mounted-browser regression: late response/json, success/failure/rejection при игнорировании abort | Оба браузера прошли; старый ответ A не меняет B, новый B получает собственный idempotency key. Client harness отдельно не является доказательством Flight. |

Прогоны выполнены лично на Node `v22.23.4` из `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`, физических deps harness `0.8.58` / feature-adr `1.5.25`, Vitest `3.2.7`, Next `15.5.25`, Playwright `1.60.0`. Private env прочитан без печати значений; дочерним test runner переданы только необходимые PG/Redis и системные/browser переменные. Существование `_test` БД проверено до запуска. Использованы случайные отдельные PG schemas, random-secret namespaces Redis, ephemeral loopback ports и local HTTP provider; новых контейнеров/БД/MinIO не создавалось.

Аргументы реально запущенного `node node_modules/vitest/vitest.mjs run --no-cache --reporter=verbose`:

| Аргументы после общего префикса | Фактический результат |
|---|---|
| `tests/billing.unit.test.ts tests/billing.integration.test.ts tests/payments-guards.test.ts tests/credit-packages.integration.test.ts tests/credit-packages-ui.test.ts tests/wiring.test.ts` | exit 0; **6 файлов, 110 passed, 0 skipped**, 41.57 s |
| `--config vitest.browser.config.ts tests/browser/per-account-test-checkout-next.test.ts` | exit 0; **2 passed**, 14.52 s; обе browser engines реально исполнены |
| `--config vitest.browser.config.ts tests/browser/mockup-ui-realization.test.ts -t 'checkout account remount ignores old success and failure even when transport ignores abort'` | exit 0; **2 selected passed**, 28 остальных отфильтрованы, 18.61 s |
| `tests/clip-music-choice.test.ts -t 'requires rerender limit with its consequence and explicit wiring'` | exit 0; **3 selected passed**, 11 остальных отфильтрованы, 5.64 s |

Focused run выполнен в исходном worktree с cache off; browser/mutation/дополнительные probes — в отдельной `/tmp/clipmkr-qe-primary-092d1723`. Все скопированные измеряемые paths совпали с freeze. Скопирован существующий `.next`, самостоятельная пересборка не выполнялась. Все 289 файлов build вне cache совпали; digest дерева `91445bf233c3da49508b61cb95e5cac8209ad6b7de6a7ad8675ccd4933c0e159`. Первоначальное сравнение всего дерева обнаружило различие только изменяемых `cache/typecheck.tsbuildinfo` и `cache/.tsbuildinfo`; оно не скрыто как полный byte match. Общая сборка не переписывалась. Первая дополнительная AM-5 попытка дала 3 failures `ENOENT .../Dockerfile`: этот файл отсутствовал в моей копии. После копирования неизменённого Dockerfile все три теста прошли. Это ограничение подготовки первого прогона, не finding на продукт.

Действенность проверок подтверждена двумя настоящими мутациями только в отдельной копии:

- Удалено `accountId === config.testCheckoutAccountId` из `packages/shared/src/config.ts`. `two sessions enforce test checkout before body intent and provider` дал exit 1: **422 вместо ожидаемого 503**, `tests/billing.integration.test.ts:441`.
- После восстановления первого файла удалён `verify(raw.test === testMode, ...)` из `apps/web/src/server/payments/yookassa.ts`. `revoked test exception rejects non-test webhook before ledger writes` дал exit 1: **200 вместо ожидаемого 400**, `tests/billing.integration.test.ts:487`.
- Оба файла восстановлены из исходных байтов, hashes сверены. `tests/billing.integration.test.ts -t 'per-account TEST checkout with real sessions and PostgreSQL'`: exit 0, **5 selected passed**, 20 остальных отфильтрованы, 3.95 s. Это restoration control, не verification исправлений автора; `verifications=[]`, `deltaVerification=null`.

**Code/spec anti-drift:** конфигурация, admission-before-body, native SSR/runtime wiring, privacy и сохранение payment invariants соответствуют дельте и ADR. AM-5 не изменяет production defaults и `liveS3Environment`. Изменённые production modules компактны; дублирующий provider/parser/service не появился, миграций и нового UI нет. Required-callback consumers проверены; UpgradeScreen и DB/provider semantics остаются прежними. Targeted `git diff --check` дал exit 0. Подтверждённых замечаний code-critic по architecture/security/type contracts/test quality не установлено.

**Ограничения:** независимые full suite/typecheck/lint/build, полный product CJM, реальный TEST-магазин, LIVE, Cloud.ru, DNS, deployment, mail, настоящее S3/production media, широкая accessibility/performance/chaos оценка **NOT RUN** в этом поручении. Не подтверждены внешний provider/24h idempotency TTL, production cookie/proxy transport и происхождение существующей сборки посредством своей пересборки. Не все перечисленные в плане falsifiers повторены: выполнены ровно два выше, mutation score не рассчитывался. Хеши дополнительных auth/browser/wiring dependencies сохранены отдельно, host manifest ими не расширялся. Эти пределы не превращены ни в выдуманные дефекты, ни в полную приёмку.

Собственные команды, exit codes, stdout/stderr и дополнительные hashes сохранены приватно в `/root/.config/clipmkr/per-account-test-checkout-20261105/qe-primary-092d1723/` (`runs.json`, `*-result.json`, `*.log`, `copy.json`, `final-snapshot.json`, `supplemental-input-hashes.json`). Отчёт не содержит credentials/cookies/реальных account identifiers. После завершения probes процессов в cwd отдельной копии не осталось. Исходные 32 host hashes повторно совпали, host не изменён. Записывается только собственная initial entry; `author=null`, `authorAssessmentChecked=false`. Evaluate/checkpoint и публичное завершение feature остаются за root.
