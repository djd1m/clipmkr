# ADR-001: Направить TEST callback через существующий основной proxy

## Status
proposed — обратимо точным восстановлением исходного Caddyfile; пересмотреть при изменении main upstream, TEST isolation или trust chain. Независимый QCSD не закрыт.

## Context

Основной checkout и существующий TEST callback обслуживают разные business DB при одинаковом TEST shop. Старый callback upstream не является владельцем checkout. Исправление ограничено одним routing блоком; нельзя переносить данные, менять env/app/worker либо допускать реальные продажи. Full edge config содержит другие проекты и остаётся приватным.

## Decision Drivers

1. Сохранность данных и ограничение единственным TEST аккаунтом — high.
2. Тот же владелец business store, что main checkout — high.
3. Минимальная обратимая запись и сохранение существующей IP trust chain — high.
4. Проверяемый repo artifact без чужих конфигураций — medium.

## Considered Options

| Вариант | Преимущества | Недостатки |
|---|---|---|
| Existing main proxy `n5-clipmaker-proxy-1:80` | Повторяет обычный route; использует существующий network path/main store | Требует подтверждения XFF/trustedProxyHops и network reachability |
| Прямой main web upstream | Меньше hops; canonical handler доступен напрямую | Меняет цепочку доверия относительно обычного route; требует дополнительных env/header решений |
| Перенести старый TEST контейнер на main DB | Старый edge route сохраняется | Запись env/data ownership вне scope; старый application revision и риск двух writers |

## Decision

В существующем `handle /api/webhooks/yookassa-test` заменить только upstream `n5-referral-paytest-20261028:3000` на `n5-clipmaker-proxy-1:80`. `rewrite * /api/webhooks/yookassa` и `header_up X-Forwarded-For "{http.request.remote.host}, {http.request.local.host}"` сохраняются в исходных bytes. Перед Step7 независимые QCSD/K1/K2/checkpoints; затем versioned sanitized fragment `deploy/test-webhook-route.caddy` становится code input native QE. Его bytes обязаны совпадать с exactAfter локального private candidate.

Применение выполняется отдельно после допуска: exclusive ops lock, приватные full backup+SHA, candidate validate, проверка прежних inode/SHA, открытый fd того же bound файла, полная запись+truncate+fsync, validate фактического container-visible config и только затем штатный Caddy reload существующего edge. Не использовать rename bound файла и не создавать контейнер. Rollback повторяет запись прежних bytes в тот же inode, validate, reload. При неудаче rollback — явный инцидент и STOP, без дополнительных незапланированных мутаций.

## Rationale

Первый вариант удовлетворяет D1/D2/D3 через существующего владельца без параллельной реализации. Прямой web выигрывает в числе hops, но теряет проверенный обычным трафиком маршрут. Подмена DB старого контейнера проста для edge, но нарушает D1 и владельца данных. Scoped fragment удовлетворяет D4, не публикуя другие сайты.

## Consequences

Положительно: ровно один upstream delta и reuse существующих handler/store. Цена: полная конфигурация должна проверяться приватно, а fragment тест не доказывает live routing. Временный частичный файл при fd write устраняется записью под исключительной блокировкой с reload только после fsync/validate; работающий Caddy до reload удерживает прежнюю конфигурацию. При изменении source SHA/inode либо concurrent operator — STOP без записи.

Follow-up ADR: не требуется в текущей границе; новые env/network/data изменения требуют отдельного scope. After-action owner — координатор; review через сутки после фактического TEST apply, если он состоится.

## Confirmation

- Method: негативные проверки `tests/test-webhook-route.test.ts` + actual Caddy full-config validate + readonly container/store/XFF identity + provider-backed TEST CJM.
- Monitoring: приватные before/after SHA, inode, image/env/container identity и health; ошибки callback/main route после reload.
- Success metric: один upstream delta; 0 changed protected bytes; один grant подтверждённому TEST payment; 0 дополнительных grant при duplicate; 0 grant при отказе/отмене; обычный аккаунт без checkout; exact rollback при failure.
- Owner: оператор выполняет, независимый reviewer принимает evidence.
- Load-bearing property: callback принадлежит main business store при неизменной TEST isolation; конфигурация обратима без изменения bind mount inode.
- Required automated check: `tests/test-webhook-route.test.ts`, включая old-upstream/XFF/second-block mutations, inode-change и validate/reload/health failure injection в изолированном temp fixture, без live runtime writes.

## Shift-left: тестируемость

Высокий риск чужого writer/store: identity до apply и после reload, затем один ограниченный TEST checkout; при несовпадении STOP/rollback. Недоступный main proxy: read-only reachability до записи, health после reload; нельзя добавлять сеть как скрытый фикс. Сбой Caddy/нагрузка: прежний active config удерживается до reload, после неуспешного health точный rollback. Изоляция: негативные fixture mutation tests не требуют live secrets; настоящий provider callback остаётся отдельным evidence. Given прежний upstream в candidate, When проверка соответствия canonical fragment и main proxy, Then отказ до записи. Given валидный config и failed health, When rollback, Then inode и old SHA сохраняются. Все проверки только запланированы; тестов/independent signoff этот ADR не утверждает.
