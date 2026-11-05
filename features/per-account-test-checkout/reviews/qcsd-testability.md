# Независимое QCSD-ревью: тестируемость

Вердикт: **conditional**. Обнаружен один HIGH-пробел проектирования проверки приватности клиентского ответа. Это риск на основании исходного кода и контракта сериализации, не подтверждённая утечка: настоящий Next/Flight ответ здесь не запускался.

Сессия `01a1acbd-6268-7b43-840a-82b5cdfb3ba3`; запрошенная модель/режим: `gpt-6.1-terra xhigh`. Среда не раскрыла независимо фактический ID модели или уровень reasoning, поэтому утверждать их как наблюдённый факт нельзя. Роль `qcsd-testability`, family `owner-exception`, отдельная сессия; реализацию и проверяемый проект не писал. Host snapshot: revision `970406e17628e7e593fe2cd02c1c5438d6be93be6d0c351534eaf3eb535bbf77`, nonce `89e8b741-8b78-47a8-b190-22b993a73ba8`. База HEAD `24b4b4a4be4364659142b1428511fb634378ddbc`.

Входы: AGENTS.md, CLAUDE.md, core-cjm §2, местные .claude/rules, feature 00/01/02/ADR/05/06, owner-authority и requirements-revision, связанная OpenSpec-дельта (её SHA-256 совпадает с привязкой), модуль 03.5 feature-adr, code-impl и studio-extended-qe с его testing/extended-QE инструкциями. Затем самостоятельно просмотрены существующие config/runtime, wiring и consumers, session/active-account readers, checkout/status/webhook, YooKassa, DB и существующие tests/fixtures. Отчёты других ролей и выводы автора как доказательство не использовались.

## Находка QT-001 — HIGH, structural

`05_architecture.md` обещает, что server UUID не попадёт в HTML или props, и одновременно сохраняет прежний account-key lifecycle. В существующем `apps/web/src/app/upgrade/page.tsx:27` клиентскому `UpgradeScreen` передан `key={session.account_id}`; для разрешённой сессии этот ID равен приватному configured UUID. `tests/billing.unit.test.ts:296` и `tests/credit-packages-ui.test.ts` используют `renderToStaticMarkup`, а `tests/browser/mockup-ui-realization.test.ts:131` проверяет remount в отдельном клиентском harness. Они не наблюдают настоящий Next RSC/Flight payload: отсутствие ключа в статическом HTML не доказывает отсутствие в клиентском ответе. План 06:53–61 просит проверить HTML/props/log и оставить ключ, но не задаёт проверку Flight и не разрешает этот стык. Наличие экспозиции в конкретной сборке остаётся гипотезой до фактического теста.

Требуемое закрытие: уточнить дизайн и подтверждение так, чтобы синтетический UUID исключения не присутствовал ни в реально отправленных HTML, RSC/Flight-ответах начальной загрузки и клиентской навигации, ни в props/log; отдельно сохранить и проверить изоляцию смены аккаунта и отбрасывание старого checkout response. Указать test oracle на полном ответе Next, а при обнаружении сериализации предусмотреть непрозрачный ключ remount без раскрытия UUID. Не требуется редизайн интерфейса или новое право. Изменения и их верификация выполняются автором и затем этой ролью на новом snapshot.

## Покрытие и оракулы для реализации

- FR-1/2/4: две настоящие синтетические сессии A/B, активные credits_v1 и валидные purchase windows; фактические кнопки SSR и POST одной policy. Для B/anonymous и подмены body/query/header: отсутствие чтения body, нулевая дельта intent и отсутствие create/getPayment; A получает intent, принадлежащий A. Неактивная, отозванная или истёкшая сессия не используется как доказательство A.
- FR-3/5: undefined/empty, каждый malformed UUID и противоречие конфига проверять раздельно; TEST/live key, driver, global, billing policy и provider-ready — положительный и отрицательные контроли. Отключение exact-account и testMode guards должно ломать соответствующие тесты. Префикс test_ сам по себе не подтверждает настоящий тестовый магазин.
- FR-6: до/после отзыва при сохранённом TEST provider: новый checkout закрыт, A status доступен только своему владельцу, проверенные уведомления и повторы/конкуренция приводят к одному grant, а provider test mismatch не приводит к grant. Нужны реальные PostgreSQL и локальный HTTP fixture, отсутствие/skip не равно PASS.
- Обязательный callback: исходный поиск нашёл runtime и createBillingDependencies, прямые consumers в billing.unit, billing.integration, payments-guards и credit-packages.integration, а также status/webhook routes. После замены required contract все они должны быть обновлены без permissive fallback; включая тест с `as unknown as`, который TypeScript не защитит.
- Интеграционный seam: существующий production selector создаёт YooKassa с фиксированным API, а локальный fixture достигается через apiBase в прямом конструкторе теста. Полный `readEnvironment → loadWebConfig → getRuntime/getBillingDependencies → handler → PG` test должен явно изолировать транспорт до инициализации runtime, разрешая только local fixture; подмена всего billing callback не доказывает wiring. Фальсификация удаления runtime callback должна ломать этот тест. Это проектный риск исполнения, а не заявленный runtime-дефект.
- Проверить logout/login и stale response на существующем lifecycle harness, а отдельным реальным Next-ответом — QT-001. Изменение активной сессии не должно принимать ответ старого аккаунта.

## Оценка тестируемости

Субъективная design-only оценка /100: наблюдаемость 65, управляемость 75, декомпозиция 80, простота 85, стабильность 75, информация 70, коммуникация 80, связь с существующими тестами 80, время 60, ответственность 85; среднее 75,5/100. Недостаток наблюдаемости Flight и неподтверждённый безопасный transport seam снижают уверенность; это не результат тестов и не сводный verdict других QCSD ролей. Основные критерии — capability, security, reliability, compatibility и development; значимые границы доверия: server session, приватный config, браузерный ответ, webhook/requery и транзакции PG.

## Ограничения

Код фичи ещё не написан. Тесты, сервер, provider, сеть, базы, контейнеры, SSH и Cloud не запускались; PASS реализации, пользовательской активации и code/spec anti-drift не заявляется. Анализ исходной базы не удостоверяет поведение развёрнутого сервиса. Полная платёжная приёмка core-cjm, реальный пользовательский путь и настроенный поставщик не входят в M design review; владелец должен отдельно принять разрешённый TEST-сценарий по действующему порядку. Этот документ не доказывает и не опровергает доступ фактического целевого аккаунта в UI.

## Focused ideation verification — 05.11.2026

Та же сессия `01a1acbd-6268-7b43-840a-82b5cdfb3ba3`, запрошена `gpt-6.1-terra xhigh`; независимое раскрытие фактического model ID/effort средой отсутствует. Originating-role verdict **clean** на исправленном дизайне; исходное условие QT-001 сохранено без изменений, подтверждение относится только к идеации.

Фактический host snapshot: nonce `8416d5e8-37fa-4fde-ac5d-22de393afed3`, revision `5835e26d516fe9049ed6241f370874637d7f9f5463624cb39589d6dded145cf9`. Повторный SHA-256 четырёх измеряемых файлов совпадает с manifest:

- `00_complexity_assessment.md`: `144cecdd0e2e958a4fabf30814266aa862fb8504010514cea0118f2910a35050`.
- `01_requirements.md`: `2d69bf5856e10bf10d35b59a42ecc444f3e96ea2c65580dcaabd82b544102b89`.
- `03_adr/001-limit-test-checkout-to-session-account.md`: `85e16b0924e1348b6d4a5257a6085b37b85614424be13f7678a479f4656964ba`.
- `05_architecture.md`: `3de5c39dfae38214c1dfba22285f7ed09d625f816c93df25f9d556fa711aac3e`.

QT-001: FR-4, ADR и архитектура теперь задают проверку сырого начального Next HTML с inline Flight и непустого отдельного `text/x-component` ответа на настоящую клиентскую навигацию; отсутствие Flight не проходит как пустой отрицательный результат. Указаны synthetic UUID/credential в raw/escaped формах, props и server logs, реальный A→B и отдельный прежний stale-response regression. При подтверждённой передаче UUID проект предлагает domain-separated HMAC от account ID с существующим sessionSecret, стабильный для A и различный для B; фальсификатор возврата raw key назван. Существующий `WorkspaceHeader` действительно содержит `next/link` на `/upgrade`, а `UpgradePage` действительно передаёт raw session account как key; фактическая сериализация по-прежнему не установлена.

Дельта проверена в пределах своей роли: 01/ADR/05 и план задают barrier после чтения body и атомарный lookup/create в существующей provider fixture, отдельные counts попыток/keys/unique payments/intent/grant; после отзыва — requery `test=false` без ledger writes, затем корректный TEST и duplicate с одним grant и названным falsifier raw.test. Эти оракулы по проекту не доказывают TTL настоящего провайдера. Найденный исходный fixture действительно делает lookup до `await`; адаптер действительно проверяет `raw.test`. Собственную проверку QL-01 и QL-02 за другие роли не выдаю.

Проверены фактические consumers runtime/deps, direct test wiring и double cast `payments-guards`, routes status/webhook, SSR mock, а также существующий `config.checkoutEnabled`; требование required callback и отрицательная проверка отсутствующего callback перечислены в inventory/плане. `.env.example` пока не изменён: план и архитектура задают пустую optional настройку, явный environment bridge и compose только для web. Native Next test спроектирован как bounded child c синтетическими сессиями, изолированной test PG/Redis и загруженным до runtime local-only fetch bridge, без production API override; осуществимость и изоляция должны быть доказаны при исполнении, а не предполагаются как выполненные.

Фактический SHA-256 OpenSpec `1c8457610d97f282cea1d55f1f641f983c0798ee813a1cd7483f78926a3c5b6e` совпадает с requirements и requirements-revision. В handoff есть фраза «OpenSpec смысл и hash не менялись»: относительно **первого** просмотренного snapshot hash был `85885102108fb0c9761f05c94221daccf02888bebd9a9435ea3ec37d3e00966e`, добавлены два сценария; если фраза относится только к позднему добавлению env-template, это иная временная точка. Текущая связка проверена по байтам; прежнее значение не используется как доказательство нынешней дельты.

Новых условий в пределах порученного delta/зависимостей не выявлено. Actual Next/PG/provider и mutation tests не выполнялись, код отсутствует; `implementationVerified:true` в ideation receipt означает только проверенный design, не PASS реализации. Общий gate, K1/K2, пользовательскую TEST-активацию и полную приёмку оплаты эта запись не устанавливает.
