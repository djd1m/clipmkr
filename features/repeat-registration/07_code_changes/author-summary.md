# Авторская квитанция AUTH-001

Автор: `gpt-6.1-sol high`, 10.11.2026. WORK_UNIT_ID: `repeat-registration-implementation`.
TRACE_PATH: `/tmp/clipmkr-repeat-registration-20261110/features/repeat-registration/07_code_changes/author-summary.md`.

Это итог реализации и локальной проверки автора. Независимый QE, code/spec anti-drift координатора, разрешённая выкладка и ручная приёмка владельца остаются отдельными этапами; эта квитанция не является checkpoint dz.

## Результат

Новый адрес создаёт настоящий account/trial/session. Modern repeat с текущим верным паролем входит в тот же active аккаунт; неверный пароль оставляет email, очищает password и переводит настоящий Landing в login с согласованным сообщением. Legacy missing/unknown-header duplicate получает409 без новой сессии и побочных эффектов. Неactive/missing/fenced отказ остаётся общим401; ошибки и недопустимый boolean result store дают503 без нового cookie.

Строковый `AuthService.register` сохранён; парольная проверка и SQL session fence переиспользуются. Existing пропускает signup/code.apply даже при повторном submit во время задержанного перехода. Created и обычный login сохраняют прежние attribution retry/discard. Один `AuthFlowProvider` хранит только notice и email/safe-next draft в React memory. Новый `AuthFlowNotice` находится в обычном потоке под навигацией; existing conflict имеет утверждённую красную линию. Возврат из `/forgot` открывает login и фокусирует пустое password.

Точный список16 файлов, SHA каждого, агрегат и BUILD_ID: `change_manifest.md`. После его формирования application/test source не менялся. Авторские временные мутации восстановлены до финального снимка; дополнительная password mutation выполнена в отдельной временной копии, не в frozen worktree.

## Фактические проверки

R — `/root/.config/clipmkr/repeat-registration-20261110`; содержимое private env/logs/screenshots в Git не помещается. Node22.23.4, установленный project npm runner, настоящие изолированные PostgreSQL schemas в dedicated *_test DB и Redis14; production данные не используются.

| Проверка | Результат | Доказательство |
|---|---|---|
| `npm test -- tests/auth.test.ts tests/bcrypt-load.test.ts tests/database.integration.test.ts tests/support-ui.test.ts` | exit0,34/34,0 skipped | `R/author-core-final.private.log` |
| support-email handler/PG, partner unit/route/PG, credit-packages PG, blogger-trial PG — 7 suites | exit0,132/132,0 skipped | `R/author-related-regressions.private.log` |
| `npm test -- --config vitest.browser.config.ts tests/browser/public-entry-cabinet.test.ts` | exit0,46/46,0 skipped | `R/author-component-final.private.log` |
| `npm test -- --config vitest.browser.config.ts tests/browser/repeat-registration-next.test.ts` | exit0,10/10,0 skipped; Chromium и WebKit | `R/author-native-final.private.log` |
| `npm run build` — весь закреплённый workspace build | exit0 | `R/author-build-final.private.log`, BUILD_ID в manifest |
| `npm run typecheck` — все workspaces и tests | exit0 | фактический финальный tool run после последней source edit |
| `npm run lint`, `git diff --check -- apps/web tests` | exit0 | фактические tool runs на финальном source |

Итого222 различных целевых/регрессионных теста. Это не полный репозиторный suite и не процент покрытия. Вложенный bcrypt child не прибавлен повторно.

PG доказательства: winner выполняет настоящий INSERT до commit; другой PID loser наблюдаемо блокируется на winner через `pg_blocking_pids`. Проверены одинаковые/разные пароли в credits_v1/legacy; один account/grant и действительные ожидаемые sessions. Reset/erasure коммитятся после подтверждённого compare snapshot, до настоящего fenced insert. `BEFORE INSERT session` trigger вызывает действительный rollback; внешнее соединение не видит попытки account/trial/session.

Native доказательства: собственный TLS SAN127.0.0.1 proxy3449→Next3450 с совпадающим publicOrigin. Browser jar сам принимает Secure HttpOnly __Host cookie; auth addCookies/Cookie injection/route.fetch с ручным token не используются. Проверены protected reload, новый пустой context, dashboard, upgrade, TEST-service return/not_found и unsafe next. Снимки значимых полных account/grant/attribution строк до/после existing совпадают, включая израсходованный/зарезервированный trial. Positive created даёт один apply/signup; обычный login реально заменяет источник на explicit B и отдельно устанавливает пригодный cookie C для аккаунта без attribution. Existing имеет ноль apply/signup. Внешние browser запросы блокируются; TEST provider не проводит реальную оплату.

Совместимость использует точные прежние AuthForm bytes внутри test fixture: git `c97515db90e704b44da0644c9ac92a8cd22e6343`, SHA256 `6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77`. Байты были идентифицированы до правки AuthForm, затем встроены в test; hash проверяется при запуске. Это Vite mount старого компонента против настоящего нового HTTPS API, а не исторический deployment старого Next. Legacy duplicate с/без attribution и с верным/неверным паролем не создаёт новую session/cookie и не выполняет effects; legacy-created control действительно создаёт account и выполняет apply/signup.

## RED и discriminators

Исходный replay на старых backend файлах: exit1,4 failed/10 passed в14 тогдашних auth tests (`R/author-baseline-red.private.log`). Более ранний первый запуск имел ещё один setup failure из-за отсутствующего XFF; он исправлен в тесте, не в business logic. Отдельно сохранены RED delayed-navigation existing retry (`author-existing-retry-red.private.log`), invalid-store-return (`author-invalid-store-red.private.log`) и recovery-return focus (`author-recovery-focus-red.private.log`). Последние positive runs перечислены выше.

| Требование | Внесённый дефект / discriminator | Наблюдение |
|---|---|---|
| AM-1 | exact header guard заменён на unconditional opt-in | legacy handler test падает, exit1 |
| AM-2 | recovery email/next очищены вместо переноса | настоящий Landing/recovery component roundtrip падает, exit1 |
| AM-3 | created notice заменён другим текстом | approved dismissible notice test падает, exit1 |
| AM-4 | raw exception передан третьим console argument | credentials marker test падает, exit1 |
| AM-5 | INSERT conflict ложно возвращает true | настоящий PG barrier test падает, exit1 |
| AM-6 | отдельно удалены current-hash и active SQL predicates | оба PG fence mutants падают, каждый exit1 |
| AM-7 | session INSERT пропущен | настоящий trigger/rollback test падает, exit1 |
| AM-8 | Secure удалён из handler cookie | cookie flags test падает, exit1; native jar/reload отдельно проходит на финальной сборке |
| AM-9 | existing guard перед code.apply обойдён | component existing-effects test падает, exit1 |
| AM-10 | mode change выполнен раньше release availability | настоящий Landing остаётся не в login; test падает, exit1 |
| AM-11 | runtime CSS принудительно меняет notice на fixed top0 | тот же native geometry guard отвергает дефект в8 engine/width/theme комбинациях, затем проходит после удаления injected style |
| Парольная проверка | в отдельной временной копии пропущен результат bcrypt compare | actual helper возвращает existing вместо conflict, выбранный auth test падает, exit1 (`R/author-mutation-password.private.log`) |

Логи source mutants — `R/author-mutation-AM-*.private.log`, metadata — `author-backend-mutations.private.json` и `author-ui-mutations.private.json`. В AM-6 проверены два дефекта. Мутации для AM-1…10 выполнялись в ходе реализации с гарантированным finally restore; финальная invalid-return ветка и focus correction добавлены позже и имеют собственные RED→GREEN. Password mutant дополнительно исполнен уже после freeze в отдельной копии. В mutation runs `-t` намеренно исключает остальные cases; эти filtered skips не выдаются за прохождение полного suite. Mutation percentage/AQE runtime execution не заявляются.

## Визуальная и процессная сверка

Финальные улики: `R/author-native-evidence/{chromium,webkit}-{390,1440}-{light,dark}.png` и `{chromium,webkit}-wrong-{390,1440}-light.png`. Перед первым goto seed задаёт ровно одну theme cookie. Перед notice screenshot проверяются фактические `html.dataset.theme` и computed body background; geometry проверяет normal flow под header и перед main без overlay/overflow. Native recovery проходит Tab/Enter туда/обратно и проверяет финальный password focus. Notice закрывается Enter и исчезает при уходе/возврате на другой pathname.

Первые screenshots с суффиксом light были ошибочно тёмными: theme cookie первоначально выставлялась initScript после SSR. Они не подтверждают светлую тему. Координатор обнаружил ошибку; setup исправлен, полная native матрица повторена на настоящей светлой/тёмной теме, файлы заменены валидными финальными screenshots. Первичный typecheck обнаружил устаревшие workspace dist declarations после npm ci; штатные builds shared/db/s3 восстановили актуальные артефакты, без изменения постороннего business code. Последующие полный build/typecheck проходят. Первоначальные locator/setup failures сохранены в `R/author-native-setup-failures.private.log` и `R/author-native-pre-final.private.log`; они не маскируются изменением business code.

Полный literal coder context перечитан перед freeze без пропусков:36480 символов, builder digest `6c1641489f29e91dd3d02776b1530e4a695092b204ee9d6a87e4070d58f8947d`; SHA literal и построчная сверка частей — в manifest. Первоначальный paths/digest handoff не объявляется embedded promptBlock задним числом. Это исправленное чтение перед freeze; исторический форматный недочёт остаётся ограничением исполнения Step7.

## Ограничения и передача

- Независимый cross-model code review/QE, финальное code/spec anti-drift, поддержанные dz stage records и разрешённая поставка выполняются координатором после этого freeze. Автор не проверяет сам себя как независимая модель.
- Полный `scripts/check-responsive.mjs` не запускался: его fixture обязательно включает video/clip/short/guest маршруты, отсутствующие в ограниченной AUTH schema. Создание/генерация media ради AUTH исключено координатором. Выполнена targeted component matrix320/390/1440, обе темы, text100/200, keyboard/overflow и native390/1440; это не подмена полного responsive CLI зелёной квитанцией.
- Реальные пользовательские аккаунты, внешние письма, реальные платежи, видео/нарезка и остальные CJM в авторскую локальную проверку не входят. Recovery draft проверяется со штатным mail-disabled UI; прежние forgot/reset authority контракты дополнительно покрыты существующими настоящими PG support regression suites.
- Runtime setup останавливает только собственные Next/TLS/Vite/provider процессы, удаляет свою random PG schema и известные HMAC rate keys (включая legacy-created account IDs из своей schema), без FLUSHDB. После финального native прогона3449/3450 свободны.
- Commits/push, production/VPS deployment, Cloud.ru/DNS автор не выполнял. Рабочая копия передана root с точными16 target hashes и финальным build; допуски/receipts не редактировались автором.

Status: completed
