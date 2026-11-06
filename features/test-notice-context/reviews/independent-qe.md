# Независимый QE: test-notice-context

**Актуальный результат R2: CLEAN в ограниченном локальном scope; QE-TEST-001 независимо проверен исправленным.** Исходное условие сохранено. Финальный machine evaluate выполняет координатор; эта запись сама по себе не утверждает CLOSED или успешный выпуск.

Дата: 06.11.2026. Проверяющий: `gpt-6-astra xhigh`, новая docs-first сессия `/root/test_notice_independent_qe`, без истории кодирования. Автор: `gpt-6.1-sol high`. Cross-model исключение разрешено AGENTS.md и docs/review-policy.md; family гейта — `owner-exception`.

Исторический вердикт первого прохода R1: **NEEDS FIXES**, одна HIGH structural находка `QE-TEST-001`. Отдельная проверка повторного использования private оператора: допустимая ограниченная дельта; выпуска не выполнялось.

## Входы и границы

Сначала прочитаны AGENTS.md, CLAUDE.md, core-cjm, model-matrix, review-policy, затем 01_requirements, 02_reuse_inventory, 06_implementation_plan, OpenSpec spec и requirements-revision. Использованы installed feature-adr/08-qe и studio-extended-qe с pinned методиками requirements-validation, regression, accessibility и mutation. AQE runtime не устанавливался и не исполнялся. Авторские 07/08, прежние ревью и заявления автора не использовались как доказательства.

Ревизия host: `09f575b10a58361cf0aba02d78ef030917e216e528edb87d0d6d69e8a77c805c`; nonce: `b2135db3-97d5-41c0-93d3-6596e97a69dc`. Все 11 файлов manifest независимо сверены SHA-256 после проверок, совпадают. OpenSpec SHA-256: `45f65e74ab9e55f5911047031e091cb628de634fe8abd4c478afa6904904fe3f`, совпадает requirements-revision. Код изучен самостоятельно: четыре изменённых UI-файла, два изменённых теста и применимые неизменённые зависимости account/page, upgrade/page, dashboard/page, PartnerPanel, BloggerAdmin и PartnerService.dashboard.

## Подтверждённая находка

**QE-TEST-001 — HIGH / structural / открыта.** Пропущена существующая financial legacy-поверхность на `/dashboard`.

`apps/web/src/app/dashboard/page.tsx:26` для аккаунта `is_blogger != true` показывает раскрываемую «Партнёрскую программу» с default legacy PartnerPanel. Владелец может иметь этот статус; owner и blogger — разные свойства. После раскрытия и получения своей статистики `PartnerPanel.tsx:135` вызывает `PartnerSummary`, который на строке 15 выводит «Выручка до комиссии». Авторизационный `PartnerService.dashboard` ограничивает данные аккаунтом, но не запрещает эту ветку для non-blogger. Глобальное TEST-предупреждение удалено, локальное имеется только на `/dashboard/partner` и `/dashboard/bloggers`; у legacy-выручки его больше нет.

Находка проверена после указания координатором гипотезы о полноте render sites; вывод получен самостоятельным чтением и собственным SSR probe, а не принят из сообщения координатора. Probe исполняет реальный PartnerPanel с synthetic populated React state: revenue_minor=99000 → «Выручка до комиссии», 990 RUB, ни TEST, ни «учебные». Результат: 1 passed, 8 skipped из-за явного `-t`, не из-за попытки интеграционных прогонов. Полного опубликованного UI этот probe не доказывает.

FR-3 буквально перечисляет только два dedicated маршрута — оба реализованы. Проблема находится в неполной инвентаризации последствий FR-1 и более общем OpenSpec требовании маркировать учебные финансовые расчёты. Требуется уточнить trace/reuse/план и добавить такое же условное локальное пояснение перед legacy-статистикой, проверив live/test, live/non-test, off и отсутствие баннера у summary-only блогерского блока. Новый модуль или финансовая логика для исправления не нужны. Стабильный ID и точная scope/evidence записаны моей собственной condition гейта.

## Собственные проверки

Node: 22.23.4; во всех Node-командах PATH начинается с `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`.

| Требование / риск | Команда и фактический результат | Ограничение |
|---|---|---|
| FR-1, FR-2, FR-3, FR-4; JSX, TEST матрица, роль, account badge, payment regressions | `./node_modules/.bin/vitest run tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` → 2 файла, 41/41 passed, exit 0, 8.41s | Локальный SSR/mocked boundaries; не provider/DB/E2E |
| Web типы | `npm run typecheck --workspace=apps/web` → `tsc --noEmit`, exit 0 | Проверен web workspace |
| Статические правила | `npm run lint` → «Статические правила: ошибок нет», exit 0 | Не заменяет поведение |
| Scope/whitespace | `git diff --check` → exit 0; diff ровно 6 product/test файлов | Изменение старого header assertion соответствует действующему WorkspaceHeader; удалённая source assertion про ProInterest относится к уже отсутствующему UI |
| Регресс global banner | `NOTICE_QE_MUTATION=global ...vitest run --config /tmp/test-notice-independent-qe-20261106/mutations.config.mjs tests/billing.unit.test.ts -t 'public layout keeps'` → exit 1 на billing:35, 1 failed/32 filtered | Мутация через Vite transform, исходник не изменялся |
| Пропажа CTA пояснения | Аналогично `NOTICE_QE_MUTATION=cta`, `tests/credit-packages-ui.test.ts -t 'TEST purchase notice'` → exit 1 на :103, 1 failed/7 filtered | Выборочный negative control, не общий mutation score |
| Снятие mode=live части guard | Аналогично `NOTICE_QE_MUTATION=guard`, billing `-t 'financial pages label'` → exit 1 на :450, synthetic off/true, 1 failed/32 filtered | Первый обнаруженный отказ — partner; baseline матрица проверила обе роли |
| Пропущенная legacy поверхность | `...vitest run --config /tmp/test-notice-independent-qe-20261106/legacy-proof.config.mjs tests/credit-packages-ui.test.ts -t 'independent populated legacy'` → 1 passed, наблюдается выручка без TEST | Renderer с synthetic state; это подтверждение дефекта, а не положительная приёмка |

Собственные временные конфиги/логи: `/tmp/test-notice-independent-qe-20261106/` (results.json, global.log, cta.log, guard.log, legacy-proof.log). Все мутации применялись только в памяти загрузчика; product source не редактировался. Исходные checksum после прогонов совпадают с host.

По доступности: реальные JSX warning используют текст, не только цвет, расположены до целевых кнопок/статистики; две financial page notices имеют `role=status`, существующие интерактивные обработчики и disabled-условия сохранены. Отдельные клавиатурный, мобильный, экранный диктор и axe/browser прогоны здесь **NOT RUN**: root проводит опубликованную browser-проверку отдельно. WCAG/Windows-приёмка не заявляется. Financial/auth/provider/webhook/config code не менялся, однако полный payment CJM этим ревью не подтверждён.

## Отдельная bounded проверка private operator reuse

Прочитаны только разрешённые два Python operator/wrapper, reuse-receipt и safe runtime identity metadata; env contents/full configs/секреты не читались. Сравнение с `/root/.config/clipmkr/ui-recovery-cloud-20261105/ui-release/` показало только ROOT, REPO, OLD_REV, OLD_IMAGE, exact composeFiles (9→10) с диагностической строкой и wrapper target/hash pin. Логика, SSH target и guard-before-apply сохранены.

Точные факты независимо сверены: OLD_REV=`6d19cb8345b9d104205e26f988d42252d8f4483f`; OLD_IMAGE=`sha256:fb064ebf3d25269e665becaf56817fbfdefb9b4691818de1b2a4ded7827f7648`; все 10 composeFiles совпали с source-runtime-before. SHA256 operator=`6bfbf9bd5ddfbf2d113336a422d1aa3cc4155c4731aa4bbef8dd53f61a67c968`, wrapper=`78be171fff51f79b8c7cc3a8fa68cf3cbe624cb492c5670d7bf4caa130b2ecc8`, совпали receipt. Wrapper сохраняет pinned upload observer и запускает проверку до `locked(); applied=True`; nonzero observation не допускает web replacement.

`python3 /root/.config/clipmkr/test-notice-context-20261106/release/deploy-with-upload-observation.private.py self-test` → exit 0: `SELF-TEST PASS: web-only allowlist, foreign-origin/worker refusals, explicit GO, embedded snapshot scanner syntax; no network/runtime operations`. Это self-test оригинального оператора через wrapper, а не фактическое исполнение удалённого upload observer.

`local-qe.env` существует, mode 0600 проверен только stat; receipt поле «NOT copied yet» отражает более ранний момент и не является актуальным доказательством отсутствия файла. Содержимое/целевое подключение не проверялось. Дельта reuse допустима в указанной границе; deploy/build/SSH/DB/provider операций не выполнял. Данная проверка не означает допуск выпуска при открытом QE-TEST-001.

## Гейт

Моя собственная `.fa-state/review-convergence-qe-review.json`: initial author=null, reviewer=qe-primary, family=owner-exception, verdict=no-go, condition QE-TEST-001. Host state не изменялся. Evaluate/repair/перепривязка snapshot — ответственность координатора. Новая проверка после исправления должна сохранить исходный смысл условия и подтвердить actual implementation/tests на новом nonce/revision.

## Исправление валидации исходного receipt (без изменения source)

Первый evaluate фактически вернул `not-established`, exit 3, причина `condition-scope-unmeasured:QE-TEST-001`: исходный scope ссылался на обнаруженные неизменённые зависимости, отсутствующие в host manifest. Это не состоявшийся unresolved/closed gate. Байтовые копии исходных receipt/report и настоящего отказа сохранены в `/tmp/test-notice-independent-qe-20261106/refused-r1/`; содержимое копий сверено с источниками до правки.

Исправлена только моя scope-привязка QE-TEST-001: измеренный `layout.tsx` удаляет общее предупреждение; измеренные 01/06/OpenSpec задают неполный охват финансовых поверхностей. ID, owner, HIGH, structural, требуемый результат, evidence и verdict=no-go остались побайтно равны первоначальным значениям. Ссылки на dashboard/page.tsx, PartnerPanel и PartnerService сохранены как самостоятельно исследованные зависимости в evidence; их наличие в исходном manifest не утверждается. Host, source, nonce/revision и author=null не менялись. Нового review cycle или фактического исправления продукта эта правка не создаёт; координатор повторяет настоящий evaluate.

## R2: собственная проверка исправления и полной ограниченной дельты

Revision `87ef4cf96dfe9c3248f86116ff356af606e7a80f012058beaac5460ed6dde51f`, nonce `fa2b1eea-b587-438f-b02e-eddb1b5f7c25`. Тот же originating reviewer `qe-primary` (`gpt-6-astra xhigh`); это focused rework verification, не новый blind review. Предшествующий отчёт R1 и receipt с фактическим author handoff сохранены побайтно в `/tmp/test-notice-independent-qe-20261106/r2-before-own-verification/` до обновления. Первоначальный отказ scope-валидации остаётся в отдельной истории refused-r1.

**QE-TEST-001: исправление подтверждено.** Прочитан фактический Dashboard и новый тест. Ровно один conditional paragraph добавлен внутри существующего details после summary и перед legacy PartnerPanel; mode=live и testMode проверяются вместе. Ветка summary блогера не менялась. Теперь независимо проверены все найденные финансовые render sites: dedicated partner, dedicated bloggers, dashboard legacy. Ранее найденный monetary renderer PartnerPanel неизменён: hash `27a56b2d93af2a95b4c932f61170571041392ee2e54a87899031d0e4921a396e`, diff пуст. Он теперь включён в измеренный snapshot как readonly dependency. Собственный прежний probe, показывающий отсутствие notice внутри отдельного PartnerPanel, был диагностикой родительского размещения; вставка теперь находится в корректном родительском Dashboard и не требует изменения денежного компонента.

Сопоставлены фактические amended 01/06/OpenSpec, ранее принятая rework-plan-review и реализация TASK-3R/AM-1. Все 13 текущих host digests совпали. OpenSpec exact SHA=`029052958d2e42d38774d6863387eb61cb73572bd7803da0133b4aa362f61ba7` совпал requirements-revision. Остальные четыре первоначальные runtime-правки сохранили прежние digest; единственная новая runtime-дельта R2 — Dashboard paragraph. Семантического code/spec drift в ограниченном scope не выявлено.

### Собственные команды R2 и наблюдаемые результаты

PATH Node22 тот же, что в R1.

| Команда | Результат |
|---|---|
| `./node_modules/.bin/vitest run tests/billing.unit.test.ts tests/credit-packages-ui.test.ts` | exit 0, 2 файла, **42/42 passed**, 8.61s; financial matrix/account/role/global/CTA regressions повторно выполнены |
| `NOTICE_QE_MUTATION=remove ./node_modules/.bin/vitest run --config /tmp/test-notice-independent-qe-20261106/r2-mutations.config.mjs tests/billing.unit.test.ts -t 'legacy dashboard revenue stays'` | exit 1, ожидаемый AssertionError :489 (`false` вместо `true`), 1 failed/33 намеренно filtered |
| Та же команда с `NOTICE_QE_MUTATION=guard` | exit 1, ожидаемый AssertionError :489 (`true` вместо `false`), 1 failed/33 filtered |
| `./node_modules/.bin/tsc --noEmit -p tests/tsconfig.json` | exit 0, вывода ошибок нет |
| `npm run lint` | exit 0, «Статические правила: ошибок нет» |
| `git diff --check`; `git diff -- apps/web/src/app/dashboard/PartnerPanel.tsx` | exit 0, вывод пуст |

Негативные контроли выполнены своим Vite transform в памяти, product source не менялся. Логи `r2-remove.log`, `r2-guard.log`, exact commands `r2-results.json` лежат в `/tmp/test-notice-independent-qe-20261106/`. Это две выбранные мутации, без заявления общего mutation score. Полный code suite, browser, DB/provider и runtime operations не выполнялись.

Фактический author object прочитан после сообщения автора о завершении записи. `addressed` указывает QE-TEST-001; `changedScope` содержит все семь host.changedPaths и весь manifest; structural classification соответствует изменению поведения/acceptance. Авторские 63 теста и три мутации не присвоены себе и не использованы вместо собственных 42 тестов и двух контролей. Авторская оценка отсутствия дополнительных серьёзных рисков поддерживается собственным чтением полной ограниченной дельты и неизменённых зависимостей.

Новых условий не возникло. Исходный condition object (id/owner/severity/classification/requirement/scope/evidence) сохранён без изменений; добавлены моя structural verification на текущую revision, `implementationVerified:true`, `authorAssessmentChecked:true` и собственная structural deltaVerification. Author object и host не изменялись. Результат моей entry — clean; machine CLOSED подтверждает только последующий фактический evaluate координатора.

Private operator/wrapper повторно проверены SHA256 и побайтно равны версиям R1. Поэтому прежний bounded reuse verdict сохраняется без повторного self-test или runtime действий. Root остаётся ответственным за опубликованную browser-проверку после разрешённого выпуска. Local SSR не доказывает browser/Windows/WCAG или полный платёжный CJM; эти ограничения прежние.
