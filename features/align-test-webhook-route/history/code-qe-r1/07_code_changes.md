# Авторский handoff: TEST callback routing

06.11.2026. **CODE_READY_FOR_REVIEW. Runtime GO отсутствует; apply не выполнялся.**

WORK_UNIT_ID: `test-webhook-route-M10-code-20261106`.
TRACE_PATH: `/root/.config/clipmkr/ui-recovery-cloud-20261105/callback-code-author/`.
Автор по назначению: `gpt-6.1-sol high`, новая сессия, без subagents. Независимый review/QE не запускался; требуется новая docs-first сессия `gpt-6-astra xhigh` по model matrix/review policy. Это авторская проверка, не independent receipt.

## Входы и пределы

Прочитаны AGENTS/CLAUDE, локальные coding/security/testing/secrets rules, model matrix, review policy, core CJM, code-impl skill, требования, reuse inventory, ADR, полные05/06, OpenSpec, literal coder context и actual root checkpoints. Admission принят только для code preparation: ideation revision `332b191c064c613116338c9e594a4b30e7cd218f1b9d0e4edede4fe817bdca51`; supplied coder context `4689212d21b27161fd5121013b103ed9cdd921e0cdb00d0b03e106ed689aebe1`. Checkpoints прочитаны из private `payment-cjm/route-r3-design-plan-checkpoints.private.json`; повторные K1/K2/checkpoint/state/recall/teach здесь не запускались. Исторические OPEN заголовки00/06 и root binding section не переписывались.

В repo записаны только [fragment](../../deploy/test-webhook-route.caddy), [tests](../../tests/test-webhook-route.test.ts) и авторские07 handoff/manifest. Read-only handler/IP/config не изменены, SHA проверяются tests. `.fa-state`, OpenSpec/requirements/ADR/plan/08, Git, node_modules, env, services, БД, providers, Cloud/DNS не менялись. Git/SSH/live Docker/network/provider/payment/session команды не запускались. Полные private Caddy configs прочитаны только локально, в Git не копировались.

## Реализация и reuse

Единственная config delta — upstream существующего TEST handle: legacy → `n5-clipmaker-proxy-1:80`. Alias/rewrite/XFF/отступы exactAfter сохранены. Tests вычисляют полный candidate actual executor из исходного private config и побайтно сравнивают с private candidate; вне upstream bytes не меняются. Дополнительно тестируются legacy upstream, collateral fragment bytes, XFF и second alias block.

Переиспользуются existing Caddy validate/reload, `/health`, canonical billing handler, `clientIp`, config и существующий Vitest. Новые пакеты/сервисы/payment implementations отсутствуют. Private payment QA helpers другого автора не менялись, не импортировались и не запускались. Минимальный выбранный путь — stdlib Python для in-place config operation и offline admission/evidence classifier; callable boundary предназначена для существующего отдельно reviewed root QA caller. Будущая интеграция любого helper требует его actual code SHA, а не подвижного pathname.

Actual private files находятся в `R/payment-cjm/` (R задан владельцем):

| Артефакт | Exact SHA-256 |
|---|---|
| `apply-route.private.py` | `9606862536090907faa760cd8d5ddd47edba0fcb6111c084315741f178c721f7` |
| `launch-route.private.py` — exact invocation bytes | `b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892` |
| Remote payload — весь captured executor, отдельных helper scripts нет | `9606862536090907faa760cd8d5ddd47edba0fcb6111c084315741f178c721f7` |
| Repo fragment | `878af1f6cf54cef3d675b6a0d3c3182051e45405e9dd557a22dc12d770198655` |

Launcher исполняется как retained `python3 -I -S -c` bytes, сверяет actual invocation SHA и captured source/payload SHA до любых writes, AST отклоняет mutable imports. Исполняются captured bytes; подмена pathname после capture не меняет code/hash. Executor использует held fd, полный write-loop/truncate/fsync/readback, same host/container inode+bytes, verified0600 backup и durable incomplete marker до live write. Validate precedes reload; applied сохраняется лишь после health/control/final bytes. Private marker содержит transitions, actual execution hashes и runtime versions. Bound файл не заменяется через rename/replace.

Recovery использует тот же lock и held-fd путь, обнаруживает old/candidate/mixed после kill, восстанавливает точные bytes, валидирует/reload/health. Missing/corrupt backup/record, changed inode и unknown control дают incident без дополнительных bound writes/reload. Неизвестный исход Docker exec timeout отдельно запрещает automatic restore до root assessment. Emergency restore после checkout сохраняет halted/incomplete_pending; normal rollback требует fresh BOTH-store inventory/reconcile. Root обязан использовать один постоянный lock/state scope и подтвердить cooperating actors/incomplete records; один flock не объявлен runtime proof.

`operator_business` сохраняет durable incomplete_pending до существующего checkout callback, затем exact new response context; потерянный ответ не разрешает второй checkout. Old/pre-GO/nonapproved/другой intent отказываются до POST/relay/mutating-status. Это operator admission, не новый app filter/API. Historical TEST debt остаётся **DEFERRED/UNRESOLVED**, без grant/relay/status mutations и без такого prerequisite нового CJM.

Offline oracle отдельно классифицирует direct ingress, native functional chain inference, provider duplicate, controlled relay и abandon; проверяет store/owner/payment/intent/shop/SKU/amount/test/event/grant/payment_ref/rights/job/debit/allocation. `EVIDENCE_COMPLETE_OFFLINE` не означает measured provider delivery или приёмку. Trial allocation не называется расходом нового paid grant.

## Настоящие проверки финальных bytes

Локальные версии: Node `v22.23.4` (pinned PATH), Python `3.12.3`, Vitest `3.2.7` из существующего OP/node_modules. Install не выполнялся. Target host Python/Caddy/SSH/Docker и runtime identities здесь NOT ESTABLISHED.

| Команда | Фактический результат |
|---|---|
| `npm run lint` | exit0 |
| `node node_modules/typescript/bin/tsc --noEmit -p tests/tsconfig.json` | exit0 |
| `npm test -- tests/test-webhook-route.test.ts tests/proxy-rate.test.ts tests/billing.unit.test.ts tests/payments-guards.test.ts` | exit0; 4 файла, 67 tests PASS,0 skipped |
| `python3 -I -S R/callback-code-author/run-mutations.private.py` | exit0;10 deliberate mutations RED,10 exact-source fixture groups GREEN |
| Python AST parsing обоих actual private sources | успешно, без pycache writes |

Новый публичный test target содержит11 tests и mandatory private SHA bindings; отсутствующий artifact/config даёт failure, не skip/PASS. Сырой журнал `R/callback-code-author/fixture-execution.raw.jsonl` сохраняет также предыдущие авторские прогоны/ошибки fixtures; финальный exact source определяется SHA и `final-checks.raw.json`. Extracted exact public driver сохранён private для воспроизведения mutation runs, его SHA есть в07 manifest.

| Amendment | Actual fixture и граница доказательства |
|---|---|
| AM-1 | SIGKILL child после partial write, после truncate, до fsync, до reload; новый процесс читает durable marker и same-inode restore; missing backup → incident |
| AM-2 | healthy control; wrong release/503/timeout до write и после write; changed image; restore health failure → incident; настоящий process deadline |
| AM-3 | конкурирующий child удерживает flock, второй не пишет; unknown reloader →0 writes; outstanding reload → incomplete без дополнительных writes |
| AM-4 | BOTH-store completeness/owner/event-time/window/inflight/unsafe ACK negatives; classified old terminal debt →GO/deferred; normal rollback gate и emergency pending |
| AM-5 | настоящие short-positive/zero/OSError/truncate/fsync syscall injections на live fixture fd; точные final bytes/inode и no-false-applied; backup durability failure до write |
| AM-6 | before-capture source/payload/launcher substitution → отказ; after-capture pathname substitution всё равно исполняет исходный operate; mutable import → отказ |
| AM-7 | wrong correlation/grant/duplicate/cancel/job/allocation negatives; relay/abandon/inference отдельно, trial не new-paid consumption |
| AM-8 | old approved/pre-GO/nonapproved →0 business calls, fake historical-scope flag не помогает; fresh exact new intent positive; durable checkout boundary |

Все filesystem/fd/fsync/SIGKILL/lock/child effects настоящие, в собственных temp directories. Docker/Caddy/HTTP и runtime control facts в fixtures **SIMULATED**. Отдельная fixture исполняет исходные Runtime transport/control/identity methods на simulated command boundary; actual Docker/health не вызывается. В mutation copies удалялись guards AM1–8, fragment и inode; тесты стали RED, без изменения production source. Raw: `mutation-execution.raw.json`, `final-checks.raw.json`.

Полный `npm test`, build, настоящие DB integration, seam/runtime/UI/Chrome E2E не запускались: bounded session запрещает network/runtime и генерацию других repo artifacts. `.gitlab-ci.yml` в этой копии отсутствует; наличие CI job не утверждается. Новый test собирается существующим Vitest include `tests/**/*.test.ts`. Широкая локальная/production приёмка не объявляется выполненной.

## Anti-drift и следующий gate root

FR-1/A1/A2: только upstream; FR-2/A4: TEST isolation, AM7/8; FR-3/A3/A5: actual same-path durable operation/recovery; NFR-1: readonly owners+scope+bounded checks. Spec/proposal SHA совпадают с01; exact input/output/evidence hashes — [07 manifest](07_code_changes.manifest.json). Никакой исторический receipt не перенесён на новые bytes автоматически.

Root должен связать приведённые actual source/launcher/payload SHA и fixture references с06 до code QE, затем выполнить независимый source/fixture review, native code QE/checkpoints/anti-drift. В этой сессии06 не редактируется по scope. После review root отдельно реально устанавливает host/mount/inode, cooperating actors/SSH recovery, published release/web image, namespace reachability/XFF, TEST isolation и fresh BOTH-store/event inventory. До этого runtime apply BLOCKED. Схема runtime input и требования к нормализации oracle описаны в private `R/callback-code-author/OPERATING-CONTRACT.private.md`; там нет runtime GO.

Остаточный риск сохраняется: in-place write при host/hardware/Caddy crash может привести к partial config и downtime общего edge. Existing unless-stopped не является автоматическим STOP; backup/marker+independent SSH дают ручной recovery после возвращения доступа, без daemon/zero-downtime обещания. Legacy container/данные сохраняются. Настоящие callback/grant/duplicate/cancel/fresh-session/paid clip/Chrome Play+Download остаются **NOT VERIFIED** до отдельного разрешённого TEST CJM.

Status: completed
