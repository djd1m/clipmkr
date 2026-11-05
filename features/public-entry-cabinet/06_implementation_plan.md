# План реализации публичного входа

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-reuse-public-entry-components.md`, `05_architecture.md`, `03.5_ideation_report.md`, `03.5_quality_review.md`, `03.5_risk_review.md`, `03.5_testability_review.md` текущей фичи; approved HTML и связанные OpenSpec SHA из 01.

05.11.2026. Планировщик `gpt-6-astra xhigh`; единственный автор всех 11 code/test targets —
`gpt-6.1-sol high`. Применена reference-методика code-goal-planner; upstream runtime не запускался.
QCSD ideation: actual `exit 0`, `closed`, revision
`3e4b0bb8e4b7b2553a0e046f428c6aeb0b81d3b5bf4d737202d1ab55f1ff0c07`, nonce
`28ffc0f1-0f31-4474-9106-e5a1ed1993c8`; semantic conditions 0. Это не runtime PASS.
Дополнительный свежий cross-model design/plan challenge `gpt-6.1-terra xhigh`, K1, K2 и настоящий
plan checkpoint организует координатор до Step 7. Разрешение tools не заменяет эти gates.

## Goal state и ограничения
Текущее состояние: работающие canonical auth/referral/next/theme/demo, но публичный экран ещё старый;
CTA остаётся в login, старый R9 требует demo above-fold и скрывает desktop CTA. Актуальный coverage
процент не измерен. Цель: FR-1…FR-9 и NFR-1…NFR-3 наблюдаемы в настоящем UI, ADR-001 реализована,
15 BDD имеют фактические результаты; нет открытых значимых регрессов или ложных PASS.

SPARC: specification = зафиксированные 01/ADR; pseudocode = контракт ниже; architecture = 05;
refinement = реальные RED→GREEN циклы и независимое QE; completion = exact-artifact тестовый web,
ручная инструкция владельцу и запись ограничений. Новый schema/API/auth stack не создаётся.
Ориентир работы автора кода — 20 минут; длительность test matrix, review, сборки, публикации и
ручной приёмки сюда не включена. Цель M включает 11 targets: один сверх первоначальных десяти
обслуживает существующий mutation runner. Растущий scope возвращается координатору до новых правок.

## Pseudocode: единственный владелец auth и обычные props
1. `Landing` client presenter хранит mode с начальным `register`, запрос focus и только производный
   флаг доступности mode controls. Inline union props не создаёт нового export/type module.
2. `AuthForm` получает mode, callback смены и callback доступности controls. Только он владеет
   busy/error/signedIn/pendingRegistration и текущим request. Перед auth/apply синхронно закрывает
   возможность повторного запроса локальным ref guard; сообщает presenter блокировку, затем busy UI.
   Локальный guard не выносится в новую библиотеку и сбрасывается в finally; signedIn по-прежнему
   блокирует смену режима после auth-success/apply-error. Presenter не решает, какой auth уже выполнен.
3. Header login/CTA используют общий guarded requestMode; при blocked ничего не меняют и не
   отправляют. `LandingCta` получает callback/blocked, сохраняет `href="#auth"` fallback; blocked
   click отменяется и отражён доступным disabled состоянием. Даже при одном tick два клика не дают
   две auth операции. Theme toggle остаётся независимым и доступным.
4. Разрешённый requestMode устанавливает mode и инициирует email focus даже при повторном выборе
   того же режима; переключение не меняет key/type/DOM identity формы и её трёх input. AuthForm
   сбрасывает предыдущую field/form error и registration customValidity при смене режима.
   Для focus допустим локальный request counter prop/useEffect с cleanup; новой event bus нет.
5. Input email — native type=email/required; password minLength=8. До register submit применяется
   TextEncoder UTF-8 length ≤72, с понятной field error/aria-describedby и focus. Проверка вызывается
   также при вставке/изменении; login не получает новый registration-only browser byte guard.
6. Submit фиксирует выбранную операцию до await; читает FormData. Если !signedIn: clearSupportIdentity,
   fetch auth, JSON/error handling, сохранить signedIn и pendingRegistration. Затем всегда `code.apply`
   с explicit code либо `{}`, затем однократный observeSignup, safeNextPath, push, refresh.
   После apply error retry повторяет только apply. Discard вызывает `{discard_referral:true}` явно.
7. Lifecycle cleanup удаляет все добавленные listeners. Rerender mode/theme/details сохраняет поля;
   настоящий route unmount очищает transient credentials, а повторный mount проверяет отсутствие
   дублей handlers. Сохранять password через navigation/storage ради PE-15 запрещено.
8. ThemeToggle получает единственный optional `showLabel=false`; default aria/props/поведение кабинета
   сохраняются. Public showLabel показывает действие смены темы с доступным именем, соответствующим
   видимому тексту; canonical preferences, `n5_theme` и SSR `data-theme` не заменяются.

## SPARC-GOAP и задачи
### TASK-1 — допуск, контракт и RED baseline: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, NFR-1, NFR-2, NFR-3, ADR-001
SPARC specification/pseudocode. Depends: actual design/plan challenge + K1/K2/checkpoint; до них
runtime/test files не писать. После допуска создать `tests/browser/public-entry-cabinet.test.ts`:
настоящие React components/CSS через Vite virtual module по существующему browser fixture pattern;
реальный mount/hydration и DOM controls, next router observation shim и управляемые transport responses.
Не копировать HTML формы в fixture. Настоящую SSR→hydration проверку дополнить published smoke;
createRoot-only mount не называть hydration. Сначала получить named RED CTA/режим и нового порядка
на старой реализации; test selection >0, без import/build failure. Ориентир 3 минуты.

### TASK-2 — реальный auth UI и mode ownership: FR-2, FR-3, FR-4, FR-5, FR-7, NFR-2, NFR-3, ADR-001
SPARC refinement. Depends TASK-1. Файлы: `AuthForm.tsx`, `LandingCta.tsx`, `Landing.tsx`, новый browser test.
Реализовать описанный props алгоритм, explicit modes, optional partner details, field help/errors,
реальные links. Сохранить native input identity, auth→apply→safeNext, retry/discard/signup semantics.
Tests: PE-02…10,14,15; deferred register/login × auth/apply pending × retry/discard, request counts/order,
push+refresh только после apply; 4xx/5xx/reject/malformed JSON без unhandled errors. Success: каждый
oracle проходит; removal busy guard/byte guard/wrong mode даёт конкретный RED. Ориентир 6 минут.

### TASK-3 — утверждённая композиция и тема: FR-1, FR-3, FR-6, FR-7, FR-8, FR-9, NFR-1, NFR-3, ADR-001
SPARC architecture/refinement. Depends TASK-2. Файлы: `Landing.tsx`, `ThemeToggle.tsx`, `globals.css`.
Перенести approved intro/form/example/details layout и тексты; scope public CSS, shared footer без
дублирования, canonical workspace tokens. Сохранить creditMode branching без ложного trial promise.
Reuse LandingDemo неизменным в компактной области; перечисленные dynamic differences допустимы,
новый fake poster/submit/recovery dialog недопустимы. Проверить обе темы и сохранение предпочтения,
no-storage fallback, rerender identity, keyboard/reflow и старый кабинет. Ориентир 5 минут.

### TASK-4 — обновление R9 и невакуозные regressions: FR-1, FR-8, FR-9, NFR-1, ADR-001
SPARC refinement. Depends TASK-3. Файлы: `scripts/responsive/rules.mjs`, `tests/landing-demo.test.ts`,
`tests/browser/responsive-check.test.ts`, `tests/responsive-check.test.ts`,
`tests/run-landing-demo-mutations.mjs`. Для `/` first-screen action — CTA; mobile demo после формы,
достижим и 9:16. CTA виден desktop. Сохранить R5/controls/playsInline/preload=none/no autoplay,
showcase routes и прочие R9 targets. Новый точный test title указан в AM-1. Заменить obsolete
demo-below-fold mutation действительным CTA hidden/смещённым CTA или неправильным mobile order;
сохранить finally restore, deletion stale receipt и red.failed>0/green.passed>0, nonzero selection.
Test oracle должен упасть из-за внесённого дефекта, не из-за инфраструктуры. Ориентир 3 минуты.

### TASK-5 — верификация и handoff: FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, NFR-1, NFR-2, NFR-3, ADR-001
SPARC completion. Depends TASK-4. Автор завершает выбранные проверки и handoff за ориентир 3 минуты
плюс реальное время прогонов; свежее independent QE делает другая сессия `gpt-6-astra xhigh`.
Полный перечень команд/матрицы ниже. Success: code/spec anti-drift по каждому FR/NFR/ADR, actual
test/mutation/build evidence и ограничения, без SKIP-as-PASS. Координатор ведёт 07/08, receipts,
commit/push, exact source/image и web-only deploy; автор не подменяет эти действия отчётом.

## Порядок, checkpoints и риски
DAG строго `TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5`. Все 11 файлов пишет один Sol;
параллельных writers нет. Независимые read-only проверки можно выполнять после заморозки изменений.
Checkpoint A: actual gates перед TASK-1. B: auth negative/positive после TASK-2. C: visual/R9 после
TASK-4. D: independent QE + anti-drift после TASK-5. E: target backup/config/image до web apply;
F: published smoke → инструкция/ручная приёмка владельцем. Cloud.ru остаётся вне разрешённого apply.

QCSD HIGH auth/attribution/redirect/pending/privacy → TASK-2, observed endpoint/order/count/storage.
Visual/CSS/focus/reflow/theme/demo → TASK-3/4, approved screenshots, native controls, dashboard regression.
Fake PASS/zero selection/SSR-only/network-only доказательство → TASK-1/4/5, actual named RED/GREEN и
отдельный live smoke. Infrastructure/media/mail failure → честный NOT RUN/ограничение и возврат
координатору; не менять backend/config/schema ради зелёного UI. Новый dependency или 12-й target
требует пересмотра плана и gates, а не незаявленного scope. Новые exported имена не планируются;
единственный новый basename `public-entry-cabinet.test` проходит K1 до создания.

## Проверки и поставка
Команды запускаются после реализации, результаты записываются фактически; сейчас это план.
- `npm test -- tests/landing-demo.test.ts tests/responsive-check.test.ts tests/auth.test.ts tests/theme.test.ts tests/payments-guards.test.ts tests/partner-route.test.ts tests/partner.test.ts` — unit/contracts, не live auth.
- `npm test -- tests/mockup-ui-realization.test.ts` — действующие guards кабинета.
- `bash scripts/check-responsive.sh --test tests/browser/public-entry-cabinet.test.ts tests/browser/responsive-check.test.ts tests/browser/mockup-ui-realization.test.ts` — настоящие компоненты/CSS/native controls с явно обозначенным mocked transport/router. При отсутствии Docker — тот же `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts ...` только с установленными совместимыми browsers; иначе NOT RUN.
- `node tests/run-landing-demo-mutations.mjs playsinline public-entry-cta` — обновлённый named case, actual applied mutation/unique target, failed>0 RED и passed>0 restore GREEN. Существующие db/unit cases и guards не удалять. Полный runner без доступной БД не объявлять полностью успешным.
- `npm run typecheck`, `npm run lint`, `npm run build` и `git diff --check` — по фактической ревизии; build не заменяет UI acceptance.
Браузерная матрица: Chromium 320/390/1440 × light/dark × 100/200% text; WebKit390 отдельный smoke.
Candidate WebKit/environment repair остаётся отдельным блоком без добавления файлов этой дельты;
неисполненный WebKit не именуется PASS. Screenshots снимаются до credentials, privacy receipts без values.
Границы password: 7/8 символов, ASCII72/73, кириллица36/37 (=72/74 bytes), emoji18/19 (=72/76 bytes),
100000 ASCII с отказом до fetch и завершением проверки ≤5 секунд. Login не получает новый browser byte policy.
Exact next case: `/?next=<encoded allowed upgrade or upgrade/return>#auth` → CTA/mode/theme → login;
query сохраняется, push точный allowed URL. Внешний и javascript next дают `/dashboard`; без apply push нет.
Native input identity сравнивается через сохранённые browser element references; mode/theme/details
не заменяют элементы. Реальные две synchronous submit attempts до React commit проверяют atomic ref guard.
Отдельные mutation RED→GREEN на настоящем компоненте: wrong CTA mode, удалённый UTF-8 guard,
обход safeNext, повтор auth после apply error, снятый atomic/busy guard, пропущенный apply({}).
Эти временные изменения исполняются в изолированной копии/с finally restore; исправные baseline hashes
сверяются после восстановления. Нет нового committed mutation framework или ложного mutation score.
Независимый review читает только согласованные документы, затем сам находит код/тесты; авторские выводы
не подаются как исходная истина. Таблица QE: requirement → риск → test/command → actual result → limitation.
Публикация координатором: проверить host `194.85.249.105`, domain `clipmkr.ru`, compose `n5-clipmaker`;
backup + baseline config/data/controllers, exact committed source → web image provenance, app-only apply.
После apply сравнить сохранность config/data/controllers и served source/image. Инструментальный VPS
`77.83.87.178:/home/clipmkr` не является target. Cloud.ru `176.109.111.98` и DNS не меняются.
Published E2E отдельным синтетическим аккаунтом: real register→dashboard→logout→login, auth error/retry,
allowed next, `/forgot` disabled без fake sent, `/support`, legal routes, showcase play и `/c/`, обе темы,
кабинет после общего CSS. Проверить referral through actual UI на существующем разрешённом fixture;
без такого fixture честно оставить ограничение вместо объявления full blogger/payment acceptance.
Проверенный test URL и короткий ручной сценарий передать владельцу; его manual acceptance обязательна
перед Cloud поставкой того же артефакта. Письма/полный Core CJM этой фичей не закрываются.

## Amendments
AM-1 (approved FR-9 / existing R9): заменить только старые demo above-fold/desktop CTA hidden ожидания. Confirmation: CTA above-fold на mobile и виден desktop, demo после формы → test `public entry: CTA visible and mobile form precedes demo` in `tests/browser/responsive-check.test.ts` (fails if reverted).
AM-2 (QCSD testability): различать rerender и unmount, считать настоящие запросы и граничные bytes. Confirmation: input identity сохраняется и registration byte guard работает → test `public entry: preserves input identity and enforces UTF-8 registration boundary` in `tests/browser/public-entry-cabinet.test.ts` (fails if reverted).
AM-3 (cross-model planning clarification): зафиксировать query/next и две синхронные submit attempts. Confirmation: безопасный возврат сохранён и auth не дублируется → test `public entry: preserves safe next and rejects synchronous duplicate submits` in `tests/browser/public-entry-cabinet.test.ts` (fails if reverted).

EXPECTED_CODE_TARGETS:
- apps/web/src/app/Landing.tsx
- apps/web/src/app/LandingCta.tsx
- apps/web/src/app/AuthForm.tsx
- apps/web/src/app/ThemeToggle.tsx
- apps/web/src/app/globals.css
- scripts/responsive/rules.mjs
- tests/browser/public-entry-cabinet.test.ts
- tests/landing-demo.test.ts
- tests/browser/responsive-check.test.ts
- tests/responsive-check.test.ts
- tests/run-landing-demo-mutations.mjs
