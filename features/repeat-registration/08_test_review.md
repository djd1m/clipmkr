# AUTH-001 — независимое QE тестов и интеграции

10.11.2026. Роль `qe-tests`, модель `gpt-6-astra`, reasoning `xhigh`; отдельная сессия без истории кодирования. Автор проверяемого кода — `gpt-6.1-sol high`. Семейство receipt — `owner-exception` по `docs/review-policy.md` и `docs/model-matrix.md`: это cross-model, не cross-family.

**Вердикт: clean в проверенном объёме AUTH-001.** Подтверждённых нарушений требований или блокирующих пробелов доказательства не найдено. Conditions не создавались искусственно. Это собственное source/test review и узкая независимая проверка, не общий Step-8 gate, разрешение выпуска или ручная приёмка владельца.

## Вход и привязка

До чтения реализации изучены `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `01_requirements.md`, `03_adr/001-reuse-password-login.md`, `05_architecture.md`, `06_implementation_plan.md`, `owner-authority.md`, `requirements-revision.json`, OpenSpec ledger и утверждённый `docs/design/2026-11-10-repeat-registration.{md,html}`. Код и проверки затем найдены независимо. Авторские `07_code_changes` и реальные execution logs прочитаны только после собственного разбора source/tests; их выводы не использованы как исходный контекст.

Применён canonical installed `/home/clipmkr/.agents/skills/feature-adr/modules/08-qe.md` и pinned references `qe-ref-regression-testing`, `qe-ref-enterprise-integration-testing`, `qe-ref-mutation-testing`, `qe-ref-qe-coverage-analysis`. Из studio-extended-qe применены принципы проверки границ, отрицательных случаев, изменённых значений и различающих дефект тестов. AQE runtime не запускался, проценты coverage/mutation не рассчитывались.

- Native revision: `64b6843421c7b36bd8212647a350760b30ba54f5954c20c875446163ef4a6dd1`.
- Nonce: `7d508213-9258-4c3a-aa05-de8908ebc714`.
- Собственный SHA-256 пересчёт до и после исполнения: **42/42** manifest paths совпали; все три OpenSpec ledger digest совпали.
- Утверждённый HTML: `20b1c2232ee87ae5e67c1e973a670cc75480a5c64f0d2cdc511105123edd298b`, совпадает с `owner-authority.md` и `requirements-revision.json`.
- Прежний AuthForm fixture независимо сверён с `git show c97515db90e704b44da0644c9ac92a8cd22e6343:apps/web/src/app/AuthForm.tsx`: SHA-256 `6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77` совпал.
- Фактический `.next/BUILD_ID`: `hlTEjYOJIUJhzImhBF8VJ`, SHA-256 `90e25cf0bd418f983a0e5797d61124a2286349f063b1f9d0e4b50b0122025a06`. Существующий build и журнал его сборки осмотрены; собственной пересборки не было.

## Собственное исполнение

Команды запускались через разрешённый `R/run-tests.private.py`, где `R=/root/.config/clipmkr/repeat-registration-20261110`; Node22.23.4, dedicated `n5_repeat_registration_20261110_test`, Redis14. Значения connection strings не выводились. Все данные синтетические.

| Команда после `npm test --` | Фактический результат | Собственная улика |
|---|---|---|
| `tests/database.integration.test.ts -t 'concurrent repeat registration grants once\|repeat registration fences password reset\|registration session failure rolls back'` | exit0; 3 passed, 8 исключены `-t`; 4.39s, старт12:36:56 UTC | `R/qe-tests-pg.private.log` |
| `--config vitest.browser.config.ts tests/browser/repeat-registration-next.test.ts -t 'HTTPS registration cookie survives protected reload chromium\|legacy client cannot trigger repeat registration effects chromium\|auth notice follows approved inline layout chromium'` | exit0; 3 passed, 7 исключены `-t`; 17.14s, старт12:37:46 UTC | `R/qe-tests-native.private.log` |

SHA-256 собственных журналов: PG `217d97142529c90ee72839be3ba73af7091c7ec22083365d9d442813aea3f92f`; native `80ce91649e5d8e990e10b067a91bf0a28e862638cd3d66add0c7ab0370391753`.

Это шесть выбранных тестов, не полный suite. Runner печатает общее предупреждение про отсутствующий S3 при любом skipped; здесь 8 и 7 — исключённые выражением `-t` случаи. Все выбранные случаи реально исполнены. После native teardown3449/3450 свободны; приложение, тесты, нормативные файлы, Git и host receipt не изменялись.

## Требование → код → действительная проверка

| Требование | Source boundary | Проверка и статус доказательства |
|---|---|---|
| FR-1: новый адрес, настоящая сессия/однократный trial | `auth-store.ts:13`, существующие `transaction` и `grantTrialTx`; `auth-handler.ts:64` | Собственный PG rollback/concurrency и native HTTPS-created: cookie принят браузером, один grant, положительные apply/signup, защищённый reload; пустой context возвращён ко входу |
| FR-2: повтор с правильным паролем и заметным notice | `auth.ts:35–55`, `AuthForm.tsx:75–96`, `AuthFlow.tsx`, две inline-точки вставки | Собственные реальный same-password PG loser и native notice; полные dashboard/upgrade/return/unsafe-next проходы двух engines просмотрены в исходнике и `author-native-final.private.log` |
| FR-3: неверный пароль, email, пустой password, login/forgot | `AuthForm.tsx:79–83`, `RecoveryForm.tsx`, memory provider | Проверены реальные Landing callbacks, release-before-mode и pending error; компонентный и native recovery-контракт прочитан; действительные 46/46 component и 10/10 native результаты осмотрены. Wrong-password screenshot осмотрен отдельно |
| FR-4: INSERT conflict, bonus/referral/signup без повторения | `auth-store.ts:16–23`, `AuthForm.tsx:91–96`, `continueToCabinet` | Собственные реальные PG locks и legacy-browser negative/positive controls; полный existing snapshot/обычный-login controls осмотрены в source и native execution log |
| FR-5: inactive/hash fence/сбой session, login privacy | `auth.ts:47–59`, `auth-store.ts:25–32` | Собственные reset/erasure между compare и настоящим INSERT, session-trigger rollback; unit-таблицы inactive/unknown/missing/protocol и прежний login privacy осмотрены; фактический core34/34 подтверждён журналом |
| FR-6: guards, защищённый cookie, safe next, malformed/network | `auth-handler.ts`, `AuthForm.tsx:75–89`, `safeNextPath` | Собственный HTTPS cookie jar/reload; body-before-limit/Origin/UTF-8/Redis/log tables осмотрены; malformed/ok-only/no-outcome/component retry — source + actual component log, а не имитация авторизации |
| FR-7: тема, размер, keyboard, screenreader semantics | `AuthFlowNotice`, `globals.css:551–553`, `AuthForm` alert, `RecoveryForm` | Собственные Chromium390/1440×light/dark: вычисленный background, отсутствие overflow/overlay, notice под header перед main, Enter dismiss, CSS falsifier. Component text100/200 и native recovery Tab/Enter осмотрены по source/log. Семантика role/status/alert проверена; человеческий screenreader-аудит не заявляется |
| FR-2/4/6 legacy negotiation | точное сравнение header в handler; legacy branch в service | Собственный exact-old-component against real new HTTPS API: четыре existing случая (правильный/неверный пароль × attribution/no attribution) дают409, session/cookie/effects не появляются. Old-created контроль реально даёт apply/signup. Unknown header дополнительно проверяется unit-table; new-client/old-ok-only — actual component case |

## Почему проверки невакуумны

**PostgreSQL.** `tests/database.integration.test.ts:45–142`: winner удерживается после реального account INSERT до COMMIT. Другой PID loser реально виден в `pg_blocking_pids` с запросом INSERT; release наступает после assert блокировки, а не после sleep. Одинаковый/разный пароль проверяются отдельно в credits_v1/legacy: один account, один/ноль grant, ожидаемые настоящие sessions и hash победителя. Reset/erasure выполняются после фактического bcrypt compare и до делегированного `PgAuthStore.createSession`; autocommit UPDATE завершён до release, порядок событий asserted. Session trigger действительно бросает внутри транзакции; внешний SELECT проверяет отсутствие account и изменения grant count, ответ503 без cookie.

**HTTPS.** `tests/browser/repeat-registration-next.test.ts:54–167`: TLS proxy, совпадающий publicOrigin, настоящий Next/PG/Redis. `addCookies` используется только для темы и referral; auth-cookie получается из браузерного POST/Set-Cookie. Проверены Secure/HttpOnly/Path/SameSite/TTL/no-Domain, принятие jar, недоступность через document.cookie, защищённый reload и отказ новому пустому context. Request interception не подменяет auth/API ответ. `/upgrade/return` в полном native suite имеет TEST payments service, поэтому notice не проверяется на pre-auth404.

**Побочные эффекты.** Seed расходует и резервирует trial (`remaining=900`, `reserved=300`), before/after включает все account/grant/attribution поля. Existing account с заменяемым cookie-source A получает подходящие explicit B/referral C; отдельно тестируется account без attribution. Native created положительно подтверждает счётчики apply/signup, ordinary login действительно меняет A→B либо устанавливает C и не делает signup. Поэтому existing zero не объясняется сломанным счётчиком или непригодными referral fixtures. Legacy-created положительный контроль выполнен также самостоятельно.

**UI.** Vite component suite рендерит настоящий Landing/AuthForm, поэтому обнаруживает ошибку порядка `onAvailabilityChange`/`onModeChange`. Native UI использует собранный Next и реальную theme cookie до первого SSR. Собственные изображения `R/qe-tests-native-evidence/chromium-{390,1440}-{light,dark}.png` созданы отдельным запуском;390-light и1440-dark визуально осмотрены вместе с утверждённым HTML screenshot. Notice находится в нормальном потоке под навигацией, доступен и не закрывает основной контент. Контекстный кабинет макета не трактовался как требование его редизайна.

## Просмотренные результаты, не собственный повторный запуск

После независимого source analysis прочитаны фактические журналы:

- `R/author-core-final.private.log`: 34/34, без skipped; bcrypt child не считается вторым отдельным покрытием.
- `R/author-component-final.private.log`: 46/46, без skipped, включая recovery, malformed/ok-only, задержанный redirect, retry/discard, double submit и responsive/text/keyboard.
- `R/author-native-final.private.log`: 10/10, без skipped; Chromium и WebKit, реальные next/reload/recovery/side-effect controls.
- `R/author-related-regressions.private.log`: 132/132 в семи suites support-email handler/PG, partner unit/route/PG, credit packages PG, blogger-trial PG. Это просмотр результатов затронутых зависимостей, не собственный повторный аудит всей их реализации.
- `R/author-build-final.private.log`: завершённый workspace build и маршруты Next. Typecheck/lint в этом отчёте самостоятельно не запускались и не объявляются собственным доказательством.

Реальные отрицательные журналы `R/author-mutation-AM-{1,2,3,4,5,6-hash,6-status,7,8,9,10}.private.log` и `R/author-mutation-password.private.log` осмотрены. Падения соответствуют свойству:409→200; потерянный recovery email; отсутствующий approved notice; лишний raw log argument; conflict→created; fence unavailable→existing; rollback503→200; отсутствующий Secure; лишний apply; Landing остаётся register; неверный пароль даёт existing. Это evidence-inspected source mutations, преимущественно выполненные до финального source freeze; metadata сама по себе не использована как достаточное доказательство. Процент mutation coverage не заявляется.

AM-11 CSS falsifier исполнен непосредственно в собственном native запуске: каждый из четырёх Chromium width/theme случаев отвергает injected fixed/top0 тем же geometry assertion, затем проходит после удаления style. Исходные файлы при этом не менялись.

## Anti-drift и пределы

Дельта `FR-AUTH-001` явно отражена в `docs/Specification-addendum.md:312` и `docs/test-scenarios.md:821`; историческое сокрытие занятого email заменено только для регистрации, login/forgot/reset privacy не объявлены изменёнными. Ledger/hash соответствует текущим требованиям. Старый клиент сознательно получает409 вместо автоматического входа; новый клиент со старым ok-only ответом не объявляет успех. Header не является credential.

Нет собственного полного репозиторного suite, полного `check-responsive`, WebKit replay, реального почтового провайдера, платежа, медиа-конвейера, production/VPS deployment или ручной приёмки. Native fixture использует синтетические account и TEST provider; совместимость старого клиента — exact component mount, не исторический deployment. Переданная `.next` использована без rebuild; самостоятельная воспроизводимость build из source не проверена. Эти ограничения не превращены в выдуманный дефект либо успешный общий gate.

После проверенного scope и зависимостей новых серьёзных рисков не выявлено. Native host/history не изменялись. Собственная запись `qe-tests` добавлена под lock с сохранением других ролей и `author:null`; `authorAssessmentChecked:false`, `deltaVerification:null` соответствуют первичному review, не rework.
