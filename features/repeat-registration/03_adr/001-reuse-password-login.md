# ADR-001: Переиспользовать парольный вход для повторной регистрации

## Status
proposed — 10.11.2026, автор `gpt-6-astra xhigh`. Обратимо до реализации; пересмотреть при появлении другого провайдера входа или необходимости изменить внутренний контракт регистрации. Владелец согласовал конкретный макет («Да, реализовать этот макет»), источник `../owner-authority.md`; независимый QCSD и pre-code gates ожидаются. Наличие ADR не означает их прохождение.

## Context
`AuthService.register` возвращает `Promise<string>` и используется многими фикстурами как источник настоящего session token. Сейчас `PgAuthStore.register` выполняет `INSERT ... ON CONFLICT(email) DO NOTHING`, но возвращает `void`: проигрыш вставки неотличим от создания. Service отдаёт случайный token без сессии; handler выдаёт cookie, а AuthForm объявляет вход и запускает `code.apply`/signup. Автор исследовал исходный код; координатор дополнительно сообщил baseline PG probe: первая регистрация авторизует, повторы с верным/неверным паролем возвращают token, но authenticate=null; одна account/session/grant. Этот probe не является браузерной проверкой или независимым QE.

AUTH-001 требует настоящего входа для существующего active аккаунта с верным текущим паролем и понятного конфликта с неверным. `login` уже сравнивает bcrypt вне соединения и вызывает `createSession`, которая под `FOR SHARE` повторно проверяет `status='active'` и прежний `password_hash`. Вставка нового аккаунта, trial grant и первой сессии уже атомарна. `PartnerService.apply` допускает некоторые замены источника, поэтому повторная регистрация не должна вызывать этот RPC.

Исторический `FR-AUTH-001` в `docs/Specification.md` требовал скрывать занятый email. Прямое решение владельца AUTH-001, возобновлённое 10.11.2026, разрешает различимость **только регистрации active аккаунта**. Антиэнумерация login/forgot/reset сохраняется. Дельта: `openspec/changes/repeat-registration/specs/auth-registration/spec.md`; точный SHA — в `../requirements-revision.json`. Трассировка: FR-1…FR-7 из `../01_requirements.md`.

## Decision Drivers
1. D1, высокий: cookie успеха только после настоящей сессии, без обхода проверки текущего пароля/status/hash (FR-2, FR-5, FR-6).
2. D2, высокий: один аккаунт и trial; пароль, роль, баланс и attribution не меняются при повторе, включая реальный INSERT conflict (FR-1, FR-4).
3. D3, высокий: сохранить `AuthService.register(...): Promise<string>` для успешных внутренних callers; не превращать AUTH-001 в массовую переделку fixtures.
4. D4, средний: различимые результаты HTTP/UI и сообщение после автоматического next, без новых зависимостей, таблиц или хранения учётных данных (FR-3, FR-7).

## Considered Options
| Вариант | Достоинства | Цена и ограничения |
|---|---|---|
| A. Заменить результат `register` на union во всех callers | Один публичный метод и полностью явный результат | Массовое изменение seed/fixture callers, не связанное с задачей; больше регрессионной поверхности |
| B. Добавить `registerWithOutcome`, сохранить строковый wrapper, разделить общий парольный алгоритм | Явный HTTP-исход, тот же защищённый парольный вход; прежние успешные callers не меняются | Два service entrypoint; отрицательный исход старого wrapper теперь exception вместо бесполезного token |
| C. Сделать pre-SELECT в handler и вызвать register/login | Небольшой первоначальный diff, прямое использование нынешних методов | Pre-SELECT не ловит проигрыш конкурентного INSERT; `login(): null` не отличает неверный пароль от отказа session insert; для исправления потребуются дополнительные чтения или дублирование правил |

## Decision
Выбрать B, сохранив текущую SQL-атомарность и все существующие login guards.

1. `AuthStore.register` / `PgAuthStore.register`: `Promise<boolean>`, строго `true` только после commit созданных account/trial/session, `false` при `ON CONFLICT DO NOTHING`. Ошибки транзакции пробрасываются; `undefined` не считается успехом. Предварительный SELECT не нужен.
2. `AuthService.registerWithOutcome`: union `{kind:'created'|'existing', token:string} | {kind:'conflict'|'unavailable'}`, дополнительная опция `allowExistingLogin` (по умолчанию true для внутренних callers). Сначала hash вне транзакции и существующий атомарный INSERT. При `false` и разрешённом existing login выполнить общий парольный алгоритм. При `false` и запрещённом existing login только прочитать account: active → conflict, inactive/unknown/missing → unavailable; не вызывать парольный helper или session insert. Пароль/роль/баланс при конфликте не обновлять.
3. Вынести нынешнее тело `login` в один private helper `passwordLogin`, различающий authenticated / wrong-password-active / unavailable. Порядок: `findAccount` → освобождение соединения → bcrypt compare (dummy hash при отсутствии) → строгий active → совпадение → `createSession(account, record)` с прежним hash/status fence. Неверный пароль active даёт conflict только в регистрации; inactive/unknown/missing либо `createSession=false` дают unavailable. Ошибка БД не превращается в conflict.
4. Публичный `login(...): Promise<string|null>` отображает helper в прежний token/null. `register(...): Promise<string>` становится тонким wrapper над `registerWithOutcome`: отдаёт token для created/existing, бросает обычную ошибку без email/пароля для отрицательных исходов. Все успешные строковые callers сохраняются; wrapper никогда не возвращает cookie-пустышку.
5. Только register-ветка handler использует новый метод. `allowExistingLogin` включается лишь при точном request header `X-Clipmkr-Registration: outcomes-v1`, который посылает новый AuthForm. Отсутствующий/другой header — legacy режим: новый account получает обычный 200, любой active duplicate — 409 без новой сессии, поэтому старый UI не дойдёт до attribution/signup. Inactive/unknown duplicate остаётся общим 401. Header — согласование клиентского протокола, не средство авторизации; пароль обязателен и с ним. Новый клиент со старым сервером отклоняет 200 без outcome как неподтверждённый результат.
6. Успех: HTTP 200 `{ok:true, registration:'created'|'existing'}` и прежний cookie. Conflict: 409 с `code:'account_exists'` и согласованным текстом; unavailable: прежний общий 401; инфраструктурная ошибка: прежний 503. На отказах не выдавать новый auth-cookie и не отзывать прежнюю сессию. Catch логирует только фиксированную категорию `auth_request_failed` и известное action; не передаёт raw exception, message, cause, request body, email, password или token.
7. В AuthForm принимать успех регистрации только с `ok === true` и точным outcome. Только created запускает signup и прежний attribution flow. Existing сразу переходит по `safeNextPath` без `code.apply`/signup. Обычный login сохраняет нынешний attribution flow. Conflict переключает форму на login, сохраняет email, очищает пароль и оставляет сообщение. Перед переходом notice выбирается по outcome: existing «Аккаунт уже существует. Вы вошли.», created «Аккаунт создан. Вы вошли.»; обе формулировки уже есть в согласованном HTML.
8. Один client `AuthFlowProvider` в root layout хранит связанные с auth UI notice и recovery draft. Notice содержит фиксированный текст и целевой pathname, переживает push/refresh, закрывается кнопкой и при дальнейшем уходе со страницы. Recovery draft содержит только введённый email, признак возвращения в login и безопасный next: клиентская память между AuthForm → существующим RecoveryForm `/forgot` → AuthForm. Переходы клиентские; восстановление/возврат предзаполняют email, пароль остаётся пуст. Draft очищается после переноса в поле на возврате, при уходе из пути восстановления либо успешном входе. Нет email/password/token в URL, cookies или storage; полный reload очищает UI-память. Пароль/token никогда не входят в context.

## Rationale
- D1: helper сохраняет одну реализацию bcrypt/session fence. Новый enum не выдаёт токен при неуспешном session insert; shared helper нужен именно для различения wrong password и unavailable, которое теряется в `login(): null`.
- D2: источник истины — результат INSERT внутри существующей транзакции. Existing branch пропускает `code.apply`, который иначе мог бы заменить cookie/guest attribution на explicit.
- D3: вариант A даёт более чистую внешнюю сигнатуру, но не оправдывает изменения десятков setup callers. Вариант B требует лишь адресного обновления fake stores с `void` и одного исторического теста dummy-cookie.
- D4: root context переживает смену страницы, даёт доступное notice и перенос email в существующий RecoveryForm. Новый auth-сервис, event bus или npm-пакет не нужны. Согласованный макет: `docs/design/2026-11-10-repeat-registration.html`, точная привязка согласия — `../owner-authority.md`.

## Consequences
### Положительные
Проверка пароля и race fence едины. Новый исход HTTP аддитивен для created; автоматический existing login требует явного opt-in современного UI. Новых таблиц, миграций, npm-пакетов и изменения существующих account данных нет.

### Принятые недостатки
- Различимость active email сознательно ослабляет прежнюю политику регистрации; сохраняются IP rate-limit, общий отказ login/forgot и отсутствие деталей удаления.
- Повтор выполняет hash, затем compare: дороже одного login, но bcrypt остаётся вне PG-пула. Оптимизация предварительным чтением не оправдана в этом M-изменении.
- Отрицательный исход string wrapper теперь exception: реальные callers найдены поиском, новые synthetic callers используют outcome там, где возможен отказ. Нельзя оставлять старый тест «cookie дубля не авторизует» зелёным старой логикой.
- Старая открытая вкладка получает 409 для active duplicate даже с верным паролем: вход доступен через её обычный login. Это безопасная переходная совместимость, без нового account/session/signup/attribution. Прямой самостоятельный вызов `code.apply` сохраняет прежнюю политику и не является побочным эффектом регистрации.
- Новый UI со старым сервером не объявляет успех при отсутствии outcome, хотя старый сервер мог уже создать account/session. Сообщение предлагает повторить вход; UI не повторяет attribution/signup вслепую. Поставка одного build уменьшает окно несовместимости, но не заменяет этот отказ.
- Auth-ошибки теряют подробности stack/message в общем catch ради FR-6. Для диагностики остаются фиксированная категория/action и HTTP исход; отдельная безопасная расширенная диагностика вне объёма.
- Notice не переживает полный reload; cookie и авторизованная страница обязаны переживать его. Это сообщение об операции, а не источник сведений о текущей авторизации.

### Последующие ADR и after-action
Другие ADR сейчас не требуются. Ответственный за проверку — исполнитель AUTH-001 и независимый QE; after-action при ближайшей проверке авторизации, не позднее месяца после приёмки. Пересмотр — если появятся реальные ошибки различения исходов, повторная атрибуция со старого UI или другой способ входа.

## Confirmation
- Method: unit/handler tests, настоящая PostgreSQL, browser component tests и отдельный реальный Next/browser проход; затем независимое cross-model review (`gpt-6.1-terra xhigh` для этого авторского ADR).
- Load-bearing property: проигрыш реального INSERT не выдаёт фиктивной сессии; вход требует текущего hash и active под SQL-блокировкой; повтор не меняет account/trial/attribution.
- Required automated check: `tests/auth.test.ts` — `repeat registration authenticates only an active matching password`; `tests/database.integration.test.ts` — `repeat registration fences password reset and erasure before session insert` и `concurrent repeat registration grants once and authenticates only the winner password`.
- Required browser check: `tests/browser/repeat-registration-next.test.ts` — `existing registration shows notice after next and preserves account effects`; `tests/browser/public-entry-cabinet.test.ts` — `repeat registration conflict preserves email and switches to login`.
- Success metric: все целевые случаи выполняются без skip; для credits_v1 один account и ровно один signup grant, проигравший иной пароль не получает session; для legacy не возникает credit grant. Уведомление видно на конечном pathname после автоматического перехода; signup/code.apply не вызваны для existing.
- Monitoring: целевые тесты включены в существующий test runner; не вводить новые identity-bearing logs/телеметрию. Code/spec anti-drift проверяет принятую дельту FR-AUTH-001 и OpenSpec hashes.
- Owner: исполнитель AUTH-001; независимый проверяющий подтверждает результаты. Сейчас проверки только запланированы, не исполнены.

### Уточнение после первого QCSD — 10.11.2026
Q-01/RISK-01 закрываются проектным opt-in и запретом legacy duplicate session, а не исключением из FR-4. Q-02/Q-03 — точным переносом согласованного forgot/created UI. RISK-02 — фиксированным auth log без произвольных exceptions. TST-1…TST-3 требуют следующих невакуумных проверок; подробный исполнимый протокол в `../05_architecture.md`, план — `../06_implementation_plan.md`.

- `tests/auth.test.ts`: `legacy registration conflict never creates a session`; `auth failures never log exception credentials` — synthetic exception с password marker в message/cause/вложенном поле, register и login дают 503 без marker в любых console args/body.
- `tests/database.integration.test.ts`: реальный unique INSERT loser блокируется на незакоммиченном winner из другого соединения, блокировка подтверждена PG; reset/erasure коммитятся после прочитанного snapshot и до fenced insert; искусственный session failure откатывает account и trial, что читается отдельным соединением.
- `tests/browser/repeat-registration-next.test.ts`: HTTPS cookie jar без Cookie injection; защищённый переход и reload; старый реальный AuthForm без header против нового backend; current created/login положительно подтверждают счётчики, existing — нулевые RPC/signup и неизменные полные PG snapshots с израсходованным/зарезервированным trial и заменяемой attribution.
- `tests/browser/public-entry-cabinet.test.ts`: `recovery round trip preserves email without persistence` и `created registration shows approved dismissible notice`; отдельные existing/created и guard против 200 без outcome.

Это авторский structural rework до кода. Само исправление документа не закрывает originating conditions; требуется новое независимое подтверждение и реальный native gate.
