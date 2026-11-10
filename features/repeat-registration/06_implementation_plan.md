# AUTH-001 — план реализации после замечаний QCSD

10.11.2026, автор `gpt-6-astra xhigh`; код пишет `gpt-6.1-sol high`. Статус: полный авторский план, **Independent QCSD closed (10.11.2026); K1 FREE, K2 preflight PASS; финальный повтор K2 и запись перед кодом выполняет координатор**. Макет согласован в `owner-authority.md`; это не разрешает пропустить реальные gates. Автор плана не запускал новые implementation tests и не изменял приложение.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-reuse-password-login.md`, `05_architecture.md`, `03.5-quality.md`, `03.5-risk.md`, `03.5-testability.md`, `03.5-ux.md`, `owner-authority.md`, `requirements-revision.json`, OpenSpec proposal/spec/tasks и утверждённый HTML; установленный feature-adr module 06 и pinned code-goal-planner reference. Native host/receipt прочитаны; прежние structural conditions не объявляются закрытыми автором.

## Goal state / SPARC-GOAP

Current: SQL unique email, атомарный account/trial/session, bcrypt вне PG connection и session status/hash fence уже есть. На duplicate service выдаёт token без session; UI принимает 2xx и запускает attribution/signup. Старый UI не различает existing; raw auth exception может содержать credentials. Отсутствие реальной утечки текущего dependency не доказывает log guarantee.

Goal: created/modern existing получают настоящую сессию; conflict/unavailable — без новой. Legacy duplicate отказывает до session/side effects. Email проходит conflict→forgot→login только через client memory; согласованные created/existing notice переживают automatic next. Все FR-1…FR-7 и ADR-001 имеют тестовые сценарии ниже. Цель покрытия — все перечисленные исходы/guards, не вымышленный процент общего coverage.

Specification: requirements/OpenSpec/owner approval. Pseudocode: ADR outcome/negotiation/helper. Architecture: существующие auth blocks и один AuthFlowProvider. Refinement: test-first исправления по группам. Completion: реальные PG/HTTPS browser, независимый review, anti-drift, согласованная поставка. Никаких migrations/packages/Cloud.ru/DNS.

## Tasks

### TASK-0 — зафиксировать исправленный вход и настоящие gates; ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7
Phase: specification/architecture. Depends: нет. Исполнитель: координатор + originating QCSD reviewers.
Files: текущие `03_adr`, `05_architecture.md`, этот план, `author-delta.json`, реальные native receipts; без app edits.
Action: три originating роли самостоятельно проверяют новый snapshot и девять условий; сохранить format-refusal history. Классификация structural, `implementationVerified` в ideation относится только к дизайну. Получить действительный native closed, K1 inventory exports/reuse, затем K2 для tier M с `--require-requirements` по поддержанному pinned script. Подтвердить точные команды установленным CLI/help, не писать receipt вручную.
Done: настоящий exit/verdict каждого gate; любой missing/stale/не-zero блокирует TASK-1. Owner approval уже существует и повторно не запрашивается.

### TASK-1 — outcome и общий парольный вход с прежними string callers; ADR-001, FR-1, FR-2, FR-4, FR-5
Phase: refinement. Depends: TASK-0. Оценка 25–40 мин.
Files: `apps/web/src/server/auth.ts`, `apps/web/src/server/auth-store.ts`, `tests/auth.test.ts`, `tests/bcrypt-load.test.ts`.
Action: store boolean только после commit; registerWithOutcome + thin string wrapper; private passwordLogin с нынешним dummy bcrypt и active/current-hash fenced insert. Default allowExistingLogin=true для внутренних callers; false не вызывает helper/session на duplicate, читает status и возвращает conflict только active. Invalid store return никогда не успех. Обновить только typed void fake stores; новые fixture callers не переписывать массово.
Tests: `repeat registration authenticates only an active matching password`, `legacy registration conflict never creates a session`, прежние login privacy и bcrypt/load boundaries. Проверить public wrapper token string на success и exception на отрицательном исходе без секретов.
Done: created/existing tokens авторизуют в PG из TASK-4; null/unknown/erasing/store-false не превращаются в success, SQL/bcrypt разделены. Риск mitigated: ложная сессия, drift login и fixture API.

### TASK-2 — совместимый HTTP и безопасное логирование; ADR-001, FR-2, FR-3, FR-5, FR-6
Phase: refinement. Depends: TASK-1. Оценка 20–30 мин.
Files: `apps/web/src/server/auth-handler.ts`, `tests/auth.test.ts`.
Action: register handler распознаёт только `X-Clipmkr-Registration: outcomes-v1`, передаёт allowExistingLogin; legacy duplicate не создаёт session. Success 200 ok/outcome, conflict 409/account_exists, inactive/unavailable общий401, exception503. Catch пишет только fixed category/action. Login/logout/forgot contracts и cookie flags сохраняются.
Tests: `auth failures never log exception credentials` с marker в message/cause/вложенных полях для register/login; отсутствующий/иной header с active/inactive. Таблица guards для register/login: limiter до body.getReader и bcrypt/store; Redis fail; чужой Origin до body; non-JSON, malformed JSON, chunked body>4096 без честного Content-Length, email normalization, password 7/8 chars и 72/73 UTF-8 bytes. Для всех отказов новый Set-Cookie отсутствует.
Done: negative cases действительно достигают guard и не вызывают store/выдачу cookie; обычные login unknown/wrong/erasing остаются одинаковыми. Existing предыдущая cookie не отзывается как побочный эффект отказа.

### TASK-3 — согласованный auth/recovery UI и notice; ADR-001, FR-1, FR-2, FR-3, FR-4, FR-6, FR-7
Phase: refinement. Depends: TASK-2. Оценка 35–55 мин.
Files: `apps/web/src/app/AuthForm.tsx`, новый `apps/web/src/app/AuthFlow.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/app/support/RecoveryForm.tsx`, `apps/web/src/app/WorkspaceHeader.tsx`, `apps/web/src/app/upgrade/return/page.tsx`, `tests/browser/public-entry-cabinet.test.ts`, `tests/support-ui.test.ts`, `tests/browser/repeat-registration-next.test.ts`.
Action: новый header и strict response validation; created сохраняет code.apply/signup once/retry/discard, existing пропускает оба. Root context notice с точными approved created/existing текстами и dismiss; memory recovery email/next и клиентские переходы туда/назад. Не менять forgot/reset API. После conflict release busy/onAvailabilityChange ДО onModeChange; pending message переживает mode/focus effect, email сохранён, password пуст. Return draft переключает Landing в login; его source файл менять не требуется.
Tests: `repeat registration conflict preserves email and switches to login`, `recovery round trip preserves email without persistence`, `created registration shows approved dismissible notice`; реальный Landing + AuthForm после React settle, не callback-only mock. Existing + explicit/referral не вызывает RPC/signup. 200 `{}`, null/array/ok:false/unknown outcome/legacy ok-only, 4xx/5xx/offline/malformed дают retry без signedIn; ordinary login ok-only остаётся допустимым. Проверить duplicate submit, created attribution retry/discard, safe next, обе темы/390/1440px, screenreader role и Tab/Enter, no overflow.
Presentation detail (AM-11): AuthFlowProvider сохраняет прежнее состояние; новый экспорт представления `AuthFlowNotice` в том же `AuthFlow.tsx` выводит утверждённый inline banner. Вставить его после header в `WorkspaceHeader.tsx` и после nav в `upgrade/return/page.tsx`: обычный поток страницы под навигацией, без floating fixed toast/overlay и произвольного оформления. Семантика авторизации, notice state и утверждённые тексты не меняются. До edits двух новых targets/экспорта координатор повторяет K1 inventory для `AuthFlowNotice` и K2 для этого плана. Native test `auth notice follows approved inline layout` проверяет при 390/1440px обеих тем положение после навигации, отсутствие перекрытия основного контента и fixed/absolute overlay, затем dismiss.
Done: approved flow и тексты соответствуют HTML; на full reload memory draft/notice исчезают; пароль/token не в context/storage/URL. Условные verify/reset/mail-disabled support UI не сломаны.

### TASK-4 — настоящий PG конфликт, fence и rollback; ADR-001, FR-1, FR-2, FR-4, FR-5
Phase: refinement. Depends: TASK-1/TASK-2. Оценка 30–50 мин.
Files: `tests/database.integration.test.ts` (вместо старого dummy-cookie expectation и рядом с auth cases).
Action: выполнить точный TST-1 протокол из архитектуры: реальный winner INSERT задержан до commit, другой PID loser блокируется и это доказано pg_blocking_pids; только затем release. Сравнить одинаковые/разные пароли, credits_v1/legacy. Reset/erasure отдельно коммитятся между подтверждённым compare snapshot и реальным fenced insert. Trigger на session INSERT даёт настоящий rollback account/trial/session.
Tests: `concurrent repeat registration grants once and authenticates only the winner password`, `repeat registration fences password reset and erasure before session insert`, `registration session failure rolls back account and trial`.
Done: asserts порядка выполнены, не skip; один account/grant, верный hash, правильное число настоящих сессий, внешний SELECT после rollback пуст. Timed waits используются только как failure deadline; cleanup освобождает barriers/clients/schema в finally. Никаких production test hooks.

### TASK-5 — native HTTPS Next, side effects и compatibility; ADR-001, FR-1, FR-2, FR-3, FR-4, FR-6, FR-7
Phase: completion/integration. Depends: TASK-3/TASK-4. Оценка 45–75 мин.
Files: новый `tests/browser/repeat-registration-next.test.ts`; baseline old AuthForm bytes фиксируются в этом же test как compatibility fixture ДО source edit, SHA и исходный baseline записываются в evidence.
Action: TST-2/TST-3 из архитектуры без ослаблений. Собранный текущий Next, HTTPS127.0.0.1:3449→loopback3450, совпадающий publicOrigin, отдельные PG schema/Redis14/session secret. Native browser jar принимает Secure __Host cookie без ручной подстановки; защищённый next/reload. Полные snapshots existing account, израсходованный+зарезервированный trial, заменяемый источник A + пригодные другие explicit B/cookie C; отдельный account без attribution. Synthetic analytics instrumentation с обязательными created/login controls. Реальный прежний AuthForm fixture обращается к новому API без header; новый со старым ok-only отдельно проверяется component transport.
Tests: `existing registration shows notice after next and preserves account effects`, `legacy client cannot trigger repeat registration effects`, `HTTPS registration cookie survives protected reload`, `recovery round trip preserves email without persistence` (native counterpart).
Done: Chromium/WebKit, created/existing/conflict, dashboard/upgrade/return и unsafe next. Existing RPC/signup=0 невакуумно, PG snapshots равны; legacy duplicate не получает новую session/cookie; actual created/login controls с ожидаемыми side effects проходят. Return использует TEST payments service, а не pre-auth404. Никаких внешних payment/mail/analytics вызовов. Новые tests не считаются успешными при missing profile/skip.

### TASK-6 — anti-drift и доказательства по требованиям; ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7
Phase: completion. Depends: TASK-5. Оценка 15–25 мин.
Files: `docs/Specification-addendum.md`, `docs/test-scenarios.md`, текущие feature evidence/trace/limitations, OpenSpec tasks и `requirements-revision.json` при фактическом обновлении ledger. Это документационные targets, отдельно от trailing code-target block.
Action: явно уточнить register-only исключение FR-AUTH-001 в равноправном addendum со ссылками на owner decision и точную OpenSpec revision. В test-scenarios добавить новую секцию AUTH-001 delta и ссылки на named tests. Не переписывать frozen Specification.md, её исторический SHA или прежние сценарии без отдельного trace основания. Сопоставить каждый FR с tests/results и кодом; фиксировать фактический SHA build, exit/skips/ограничения. Пользовательские deltas остаются OpenSpec, execution plan здесь.
Tests: `npm run typecheck`, `npm run lint`; целевые test commands ниже. Точечные mutation/discrimination проверки critical properties (пропуск password/status/hash fence, legacy opt-in guard, attribution/signup branch, raw log) в временной копии/с гарантированным восстановлением; не оставлять мутированный app source. Все AM tests должны существовать и падать при соответствующем нарушении.
Done: нет неотмеченного code/spec drift, baseline failures/skips не скрыты, README/task status отражают реальные результаты. `dz teach --project /home/clipmkr --no-mirror` только для подтверждённого урока с фактическим ответом и повторным recall; step records только поддержанным CLI после исполнения.

### TASK-7 — независимое QE и разрешённая поставка; ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7
Phase: completion. Depends: TASK-6. Оценка 20–40 мин плюс исправления находок.
Files: актуальные feature review/trace/delivery artifacts, без новых продуктовых targets.
Action: код Sol проверяет независимый Astra xhigh в новой сессии с требованиями/ADR/архитектурой/планом, затем самостоятельно читает source/tests. Авторский ADR Astra проверяет Terra xhigh. Применить pinned security/regression/coverage/mutation protocols; не называть их AQE runtime execution. Findings исправляются и подтверждаются originating reviewer по настоящим gates. После локального QE — проверенная тестовая копия на текущем VPS clipmkr.ru, E2E по HTTPS, ссылка/инструкция владельцу и его ручная приёмка согласно действующей delivery authority. Cloud.ru/DNS не входят.
Done: независимые реальные verdicts, нет незакрытых blocking conditions; небольшие проверенные коммиты и одинаковые SHA в трёх зеркалах по git-mirrors policy. Private runner/env, secrets, bootstrap URLs, .dz/.fa-state и private media в Git не попадают. Частичный push или непроверенная выкладка не считаются завершением.

## Dependency order и Parallel groups

TASK-0 → TASK-1 → TASK-2 → TASK-3; TASK-4 после TASK-1/2 может готовиться отдельно от UI, но общий auth test edit сериализован. TASK-5 после TASK-3/4. Затем TASK-6 и TASK-7 ниже. Baseline old-client snapshot — подготовка TASK-5 до изменения AuthForm, не разрешение начать код до gates. M не требует отдельного runtime swarm; независимые originating reviews остаются отдельными сессиями по model matrix.

## Checkpoints

Перед кодом — actual native QCSD closed + K1 + K2. После backend — auth/PG proofs; после UI — component/browser; перед completion — native HTTPS и code/spec anti-drift + независимый code review/QE другой моделью. План/макет/подготовленная test DB не заменяют результаты. Оценки задач зависят от доступного тестового профиля и не являются гарантией срока.

## Проверки и ожидаемый объём

После prerequisites запускать через подготовленный private test runner, который задаёт изолированные connection values без вывода секретов:

- `npm test -- tests/auth.test.ts tests/bcrypt-load.test.ts tests/database.integration.test.ts tests/support-ui.test.ts` — обязательная реальная PG среда, skipped DB не подтверждает TASK-4.
- `npm test -- --config vitest.browser.config.ts tests/browser/public-entry-cabinet.test.ts` — настоящий DOM/CSS, управляемый transport; не заменяет Next integration.
- `npm run build` в этой рабочей копии с synthetic profile, затем `npm test -- --config vitest.browser.config.ts tests/browser/repeat-registration-next.test.ts` — реальный собранный Next, HTTPS, PG/Redis, Chromium/WebKit.
- `npm run typecheck` и `npm run lint` — включая существующих строковых register callers и typed fake stores. Затронутые support-email, partner и credit trial regression suites запускаются в действительном тестовом профиле; отсутствие prerequisites отмечается явно, без притворного green.

Trailing block содержит **16 source/test targets: 10 application и 6 tests** с двумя точками вставки утверждённого inline notice из AM-11. Только новый AuthFlowProvider и native browser test создаются с нуля; остальное — существующие блоки/адресные fixtures. Два документа anti-drift указаны в TASK-6 отдельно. Это уточняет первоначальную оценку 4–10 файлов: по шестимерному router file-score=3, остальные прежние 2/1/1/1/2, сумма10, tier M сохраняется. Если фактический объём меняется, обновить plan/inventory и K2 до новых target edits. Нет искусственного ограничения числа нужных файлов ради tier.

## Risk assessment

Q-01/RISK-01: opt-in защищает старую вкладку; missing/unknown header не даёт session; новый UI со старым сервером honest refusal. Q-02: memory recovery без URL/storage и явный cleanup. Q-03: оба approved notice. RISK-02: fixed log без raw exception; negative marker test. TST-1: observed PG lock/barriers/rollback. TST-2: native HTTPS jar и scoped cleanup. TST-3: changed-value snapshots + positive instrumentation controls. Новые пакеты/DDL не нужны; отказ среды фиксируется как incomplete, не обходится fallback Cookie injection.

## Amendments

Условия первого QCSD внесены структурно. Originating verification и выполнение названных тестов ещё ожидаются; AM rows ниже фиксируют будущую проверку, не её успех.

AM-1 (Q-01, RISK-01): exact protocol opt-in и legacy duplicate отказ до session/side effects. Confirmation: прежний компонент с новым API не меняет attribution и не вызывает signup → test `legacy client cannot trigger repeat registration effects` in `tests/browser/repeat-registration-next.test.ts` (fails if reverted).

AM-2 (Q-02): approved forgot prefill/return через client memory без URL/storage. Confirmation: конфликт, тот же email в RecoveryForm и возврат в login с пустым password → test `recovery round trip preserves email without persistence` in `tests/browser/public-entry-cabinet.test.ts` (fails if reverted).

AM-3 (Q-03): created notice соответствует уже утверждённому HTML. Confirmation: после created flow показан закрываемый правильный текст → test `created registration shows approved dismissible notice` in `tests/browser/public-entry-cabinet.test.ts` (fails if reverted).

AM-4 (RISK-02): auth catch выводит только fixed category/action. Confirmation: exception с credentials marker в message/cause/вложенных полях не раскрывает его ни в одном console argument/body → test `auth failures never log exception credentials` in `tests/auth.test.ts` (fails if reverted).

AM-5 (TST-1): настоящий observed unique INSERT loser с независимыми соединениями и разными паролями. Confirmation: после подтверждённого PG lock только пароль победителя даёт session, account/trial единственны → test `concurrent repeat registration grants once and authenticates only the winner password` in `tests/database.integration.test.ts` (fails if reverted).

AM-6 (TST-1): commit reset/erasure между bcrypt snapshot и настоящим fenced insert. Confirmation: старый hash/неactive status не дают новую session → test `repeat registration fences password reset and erasure before session insert` in `tests/database.integration.test.ts` (fails if reverted).

AM-7 (TST-1): fault на session INSERT проверяет настоящий transaction rollback. Confirmation: после отказа внешний SELECT не видит account/trial/session попытки → test `registration session failure rolls back account and trial` in `tests/database.integration.test.ts` (fails if reverted).

AM-8 (TST-2): HTTPS origin и native browser cookie jar вместо ручного Cookie. Confirmation: __Host flags/без Domain, защищённая страница и reload проходят за счёт принятой cookie → test `HTTPS registration cookie survives protected reload` in `tests/browser/repeat-registration-next.test.ts` (fails if reverted).

AM-9 (TST-3): seeded spent/reserved grant и заменяемая attribution, иной explicit/referral, positive instrumentation controls. Confirmation: existing имеет ноль RPC/signup и равные PG snapshots после real next → test `existing registration shows notice after next and preserves account effects` in `tests/browser/repeat-registration-next.test.ts` (fails if reverted).

AM-10 (coordinator source finding): сначала release busy/availability, затем Landing mode change; pending error переживает effect. Confirmation: actual parent+form после React settle находятся в login с email/сообщением и пустым password → test `repeat registration conflict preserves email and switches to login` in `tests/browser/public-entry-cabinet.test.ts` (fails if reverted).

AM-11 (coordinator actual diff / approved existing_correct layout): вынести view `AuthFlowNotice` в тот же AuthFlow.tsx, сохранив state в AuthFlowProvider; вставить inline banner после header WorkspaceHeader и после nav upgrade/return согласно утверждённому HTML. До нового экспорта и двух новых target edits обязательны обновлённые K1/K2. Confirmation: notice расположен под навигацией в обычном потоке, не перекрывает контент и не является floating fixed/absolute overlay при 390/1440px обеих тем → test `auth notice follows approved inline layout` in `tests/browser/repeat-registration-next.test.ts` (fails if reverted).

## Завершение предкодового допуска

Ideation aggregate по установленному helper: exit0/closed, revision `db36a53a3abe04b251dffdb491633ff9e651205a7cef56ddf1bf6e3ec5bdb5a7`; девять originating условий подтверждены тремя независимыми ролями. Последний RISK-03 явно уточняет negotiation/legacy fallback в FR-2 и OpenSpec; технические задачи и14targets прежние. K1 актуальных AuthFlow names:FREE0. K2 preflight:PASS0,0warnings,1skip(no acid corpus); финальный повтор на этом файле записывается отдельно. Это не результаты ещё не выполненных code/QE.

Допуск AM-11: прежние результаты выше относятся к прежнему набору targets/exports. Для `AuthFlowNotice`, двух новых файлов и текущих 16 targets повторные K1/K2 выполняет координатор; до их действительного результата расширенные edits не разрешены.

EXPECTED_CODE_TARGETS:
- apps/web/src/server/auth.ts
- apps/web/src/server/auth-store.ts
- apps/web/src/server/auth-handler.ts
- apps/web/src/app/AuthForm.tsx
- apps/web/src/app/AuthFlow.tsx
- apps/web/src/app/layout.tsx
- apps/web/src/app/globals.css
- apps/web/src/app/support/RecoveryForm.tsx
- apps/web/src/app/WorkspaceHeader.tsx
- apps/web/src/app/upgrade/return/page.tsx
- tests/auth.test.ts
- tests/bcrypt-load.test.ts
- tests/database.integration.test.ts
- tests/support-ui.test.ts
- tests/browser/public-entry-cabinet.test.ts
- tests/browser/repeat-registration-next.test.ts
