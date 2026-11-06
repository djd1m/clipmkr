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

Фактические проверки 05.11.2026: OpenSpec strict exit0 valid; установленный project K2 script из helper worktree под Node22 — exit0, PASS, 0 failures/0 warnings/0 skips, все4 requirement IDs; 2 future targets,0 on disk. K1 invocation pinned CLI `name-check --module test-webhook-route.test --project /tmp/clipmkr-test-webhook-route-20261105 --json` вернул exit2/not-established: workspace could not be scanned. Это открытый gate, не свободное имя; coordinator должен проверить project installer/source-scanner patch и повторить. Статусы официальных checkpoints не записывались.

Planning code/spec anti-drift: tracked `git diff --name-only` пуст; созданы только6 feature documents и2 OpenSpec documents. Canonical deploy fragment, тест, app/UI/runtime не созданы/не изменены; implementation conformity и live payment результат не установлены. Spec/proposal SHA сверены в01; scoped literal/ADR/architecture/plan совпадают с private candidate upstream и сохраняют alias/rewrite/XFF. `git diff --check` exit0 проверяет tracked diff; отдельная проверка whitespace новых8 документов выполнена в manifest check. Full edge config/secret/PII в documents нет; private executor не исполнен. Нового teach нет: новый runtime вывод не получен.
