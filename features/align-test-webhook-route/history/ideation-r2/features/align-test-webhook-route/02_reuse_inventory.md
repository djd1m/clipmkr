# Инвентаризация переиспользования

| Блок | Наблюдение | Решение |
|---|---|---|
| Existing edge Caddy handle | TEST alias и canonical rewrite уже существуют | Сохранить matcher/rewrite/header_up побайтно, заменить один upstream |
| `n5-clipmaker-proxy-1:80` | Уже основной upstream обычного clipmkr.ru; main proxy ведёт `web:3000` | Повторно использовать сеть и цепочку доверенных proxy; перед apply проверить достижимость и XFF |
| `apps/web/src/server/billing-handler.ts` | Canonical webhook проверяет source IP через trustedProxyHops и provider | READ-ONLY reuse; не добавлять параллельный webhook |
| `apps/web/src/server/ip.ts`, `packages/shared/src/config.ts` | Существующая семантика trustedProxyHops | READ-ONLY тест chain с фактическими значениями; env не менять |
| Caddy validate/reload | Штатный binary уже в работающем edge | Проверять full candidate тем же binary/version; reload только edge, без нового контейнера |
| Existing TEST checkout/account allowlist | Настоящий TEST магазин и доступ единственного аккаунта уже подготовлены | Сохранить global=false/test=true/test_ ограничения |
| Existing old referral-paytest container | Своя DB отличается от main | Сохранить контейнер, данные, конфигурацию; не сливать и не удалять |

Новый OSS/package/DSH/оркестратор не нужен. Private offline candidate из соседней подготовки является source proposal, а не уже принятым или опубликованным deployment artifact. После gates автор создаёт `deploy/test-webhook-route.caddy`, byte-identical scoped fragment, и негативные проверки. Full edge config не попадает в repo. Диагностика не доказывает успешный TEST CJM.

## Подготовительная проверка требований и рисков

Применены studio-extended-qe, requirements validation и risk-based-testing reference: FR-1→A1/A2→negative routing mutations; FR-2→A4→private isolation и provider-backed сценарий; FR-3→A3/A5→inode/reload/rollback failure fixtures. Приоритеты: wrong store impact5/probability4=20; TEST isolation5×3=15; bind mount/rollback5×3=15; collateral edge bytes5×2=10. Это авторская risk selection, не независимый QCSD и не выполненные тесты.

Исторические проверки до R1 rework (не проверки текущих bytes): OpenSpec strict exit0 valid; установленный project K2 script из helper worktree под Node22 — exit0, PASS, 0 failures/0 warnings/0 skips, все4 requirement IDs; 2 future targets,0 on disk. Первый K1 invocation pinned CLI `name-check --module test-webhook-route.test --project /tmp/clipmkr-test-webhook-route-20261105 --json` вернул exit2/not-established: workspace could not be scanned. По последующей записи coordinator в прежнем06 настоящий повтор под Node22 дал exit0/outcome free/results[0].verdict free. Оба наблюдения сохраняются; не приписывать первый отказ новому запуску. Статусы официальных checkpoints этой сессией не записывались.

Исторический planning anti-drift до R1: tracked `git diff --name-only` был пуст; созданы6 feature documents и2 OpenSpec documents, `git diff --check` exit0 и отдельная проверка whitespace новых8 документов. Это прежнее наблюдение, не Git-команды этой сессии. Текущий author rework сохраняет точные источники в history/ideation-r1, не создаёт deploy/test/executor и не меняет приложение. Spec/proposal SHA остаются в01; текущие filesystem-only проверки и ограничения — planning-status и собственное private evidence.

## Уточнение reuse после originating R1

Используются существующий `/health` (200/503, build revision/header), canonical POST handler с ранним reject и provider GET из существующего adapter; новый API не нужен. READ-ONLY `payment_intent/payment/payment_event/credit_grant` и allocation дают ownership/rights evidence; сами reads не чинят unknown_intent. Status GET checkout может записать canceled, поэтому не используется как read-only health/inventory. Exact pending/cutover process и ограничения существующего handler —05§P/C. Наличие terminal legacy row не доказывает безопасного ACK в main.

Нужны один stdlib Python private executor, private record/backup и existing lock, без daemon/watchdog/new package. Actual source ещё отсутствует: отдельные exact SHA review и actual temp fixture mandatory. Это reuse способа ops, не приёмка mock state machine. Global=false, sole approved account, test=true/test_ и два repo WRITE targets сохраняются; новых credentials/env не добавляется.
