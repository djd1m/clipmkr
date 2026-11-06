# ADR-001: Направить TEST callback через существующий основной proxy

## Status
proposed / author rework R1 — точное восстановление возможно лишь при проверенных backup, same inode и контроле readers/writers; business side effects этим не отменяются. Пересмотреть при изменении main upstream, TEST isolation или trust chain. Originating QCSD evaluate unresolved7, все условия OPEN до own-review R2.

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

Применение выполняется отдельно после допуска по05§O/E/H/P/C: SHA-bound captured source actual private executor; single operation lock и подтверждённый контроль cooperating reload/restart; prevalidated full candidate, private0600 backup с fsync/проверенным SHA; durable incomplete operation record+fsync **до** первого live write. Held fd сохраняет bound inode: loop write до full → truncate → fsync → exact host/container hash → validate → reload → конкретный health → durable applied. Rename bound файла/new container запрещены. Сбой/kill не даёт applied; recovery обнаруживает marker и old/candidate/mixed SHA, проверяет backup/inode и восстанавливает old bytes тем же fd с validate/reload/health. Changed inode, missing backup либо restore unprovable → incident/STOP/no additional write.

До переключения обязательны read-only BOTH-store inventory и safe pending/repeat handling. Terminal legacy payment не гарантирует безопасный HTTP200 unknown_intent в main. После нового TEST checkout normal rollback требует inventory/reconcile; emergency rollback при edge health failure восстанавливает availability с durable business incomplete_pending, halt TEST CJM и новым inventory перед retry. Не чинить данные вручную и не менять provider settings. Single upstream scope сохраняется даже если итог preflight — BLOCKED.

## Rationale

Первый вариант удовлетворяет D1/D2/D3 через существующего владельца без параллельной реализации. Прямой web выигрывает в числе hops, но теряет проверенный обычным трафиком маршрут. Подмена DB старого контейнера проста для edge, но нарушает D1 и владельца данных. Scoped fragment удовлетворяет D4, не публикуя другие сайты.

## Consequences

Положительно: ровно один upstream delta и reuse существующих handler/store. Цена: полная конфигурация проверяется приватно, fragment тест не доказывает live routing/executor. In-place write **не атомарна**: после kill возможны partial bytes и потеря flock. Продолжающий работать Caddy обычно удерживает прежнюю active config, но это не защита от независимого reload/restart. Durable marker+backup позволяют доказуемый recovery, а unknown runtime concurrency блокирует apply; root обязан фактически её исследовать. Не требуются daemon/watchdog. Если безопасность перехода для old/new payments не установлена, сохранить BLOCKED без расширения scope.

Follow-up ADR: не требуется в текущей границе; новые env/network/data изменения требуют отдельного scope. After-action owner — координатор; review через сутки после фактического TEST apply, если он состоится.

## Confirmation

- Method: негативные проверки `tests/test-webhook-route.test.ts` (AM-1…AM-7 в06), отдельный independent review actual private executor по exact SHA и actual same-path temp/SIGKILL fixtures; actual Caddy full-config validate, readonly container/BOTH-store/XFF identity и provider-backed TEST CJM — отдельные будущие evidence.
- Monitoring: durable operation marker, before/after/executed SHA, inode, image/env/container/SSH PID/runstate, bounded health05§H, private payment correlation05§C. Существующий `/health` ожидает200/ok и same published SHA+web image; `/api/health` не выдумывается.
- Success metric: один upstream delta; 0 changed protected bytes; один grant подтверждённому TEST payment; 0 дополнительных grant при duplicate; 0 grant при отказе/отмене; обычный аккаунт без checkout; exact rollback при failure.
- Owner: оператор выполняет, независимый reviewer принимает evidence.
- Load-bearing property: callback принадлежит main business store при неизменной TEST isolation; конфигурация обратима без изменения bind mount inode.
- Required automated check: `tests/test-webhook-route.test.ts`, включая old-upstream/XFF/second-block mutations, inode-change и validate/reload/health failure injection в изолированном temp fixture, без live runtime writes.

## Shift-left: тестируемость

Высокий риск чужого writer/store: реальные control+identity/inventory до apply, затем after-health и ограниченный TEST checkout; failure/unknown до write → STOP, после write → rollback, rollback failure → incident. Source подменён до execution boundary → ноль writes; captured bytes неизменны после capture. Изоляция: negative fixtures без live secrets, реальный provider отдельно. SIGKILL/short-write/truncate/fsync негативы проходят только на temp, actual executor и mock различаются. Provider duplicate отличается от controlled relay, cancel от abandon; уникальный grant связан с exact intent/payment_ref и fresh-session rights; paid clip имеет один debit/allocation и native Chrome Play/Download без ложного claims о trial FIFO. Все проверки только запланированы, independent signoff отсутствует.
