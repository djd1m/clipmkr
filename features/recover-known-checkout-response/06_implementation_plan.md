# DRAFT: план known checkout recovery

**Не Step6 PASS и не разрешение code/runtime.** Independent Step3.5 R1 выполнен; actual evaluate exit1 оставил QCSQ-01, RISK-01/RISK-02 и QT-01–QT-04 unresolved. Этот пакет — author design rework до originating verification. После closure root получает настоящие checkpoints/K1/K2. Наличие файла не заменяет approvals/receipts. Native callback QE4 не переоткрывается.

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-recover-known-checkout-with-separate-provenance.md`, `05_architecture.md`; AGENTS/CLAUDE/core-CJM/model-matrix/review-policy; canonical private sources из02; feature-adr03/03.5/05/06 и pinned shift-left/code-goal-planner references. OpenSpec exact hashes —01; current requirements/architecture являются входом, code/QE findings не предрешены.

## Goal state и граница

Current: один original checkout201, failed open, один known TEST pending, original bridge consumed_unknown/no active_case, original operation incomplete_pending/no new_checkout. Canonical reconcile не может принять этот случай даже после terminal. Исходная own session revoked по root evidence. Exact live exception неизвестен; local Chrome RED20/20 наблюдал root. Архитектор runtime не выполнял. Coverage percentage неизвестен.

Goal: reviewed derivative capture сохраняет actual request/status/body до navigation с1POST; narrow recovery связывает existing exact attempt собственным receipt, сохраняет failed origin и permits только exact follow-up. После terminal/full24h-safe inventory explicit metadata reconcile сохраняет историю и открывает лишь обычный дальнейший canonical admission. Unknown/partial/replay остаются STOP. Нет новой покупки в recovery, нового key/financial namespace, daemon, API приложения, migration БД или business-code изменений.

Requested роли: архитектор/planner `gpt-6-astra xhigh`; автор `gpt-6.1-sol high`; независимый QE кода `gpt-6-astra xhigh` в новой requirements-first сессии; QCSD по Astra docs — `gpt-6.1-terra xhigh`, отдельные originating roles. Serving identity `NOT_ATTESTED`, пока нет фактического доказательства. AQE runtime не установлен; применяется reference methodology, не заявляется runtime swarm execution. M:7 исполняемых/fixture targets,1 source-binding metadata target; DDD/L-XL fleet не нужны.

## Exact scope

Candidate private root `K=/root/.config/clipmkr/recover-known-checkout-response-20261106`; это source/fixture directory, не новый operation journal. Исторический root P из02 не редактируется. Выполнять code только после gates; таблица является будущим scope, не утверждением существования files.

| Режим | Literal path | Назначение |
|---|---|---|
| CREATE | `/root/.config/clipmkr/recover-known-checkout-response-20261106/recover-known-checkout.private.py` | One-off typed proof/admission/metadata reconciliation, reuse db0 primitives |
| CREATE derivative | `/root/.config/clipmkr/recover-known-checkout-response-20261106/bridge.private.py` | Small recovery branch и permanent B1 protocol/source fence вокруг исходного812; same journal/locks |
| CREATE derivative | `/root/.config/clipmkr/recover-known-checkout-response-20261106/browser.private.mjs` | Pre-navigation capture и explicit recovered-case projection, existing UI actions |
| CREATE derivative | `/root/.config/clipmkr/recover-known-checkout-response-20261106/run.private.py` | Narrow input/window selection и bounded fixed read-only exact-key/provider collector A1; existing native guards/session writer; f15 не изменяется |
| CREATE | `/root/.config/clipmkr/recover-known-checkout-response-20261106/recovery-fixtures.private.py` | Actual captured adapter/bridge через real temp files/FD/processes; внешние adapters SIMULATED |
| CREATE | `/root/.config/clipmkr/recover-known-checkout-response-20261106/capture-fixtures.private.mjs` | Actual candidate browser capture с native Chrome/localHTTP/fsync, synthetic data only |
| CREATE | `tests/recover-known-checkout-response.test.ts` | Public binding/fixture runner; required operational profile, no missing-profile PASS |
| CREATE | `tests/fixtures/recover-known-checkout-response.bindings.json` | Measured SHA/path aliases/immutable dependency roster; без private IDs/URL/секретов |

READONLY: семь canonical sources02 (db0/b9/f15/ababad/39b/812/c12); original case launch transport witness SHA1f2350 из05B; `tests/test-webhook-route.test.ts`, app billing/auth/payments/db owners, включая рассмотренный maintained donor `apps/web/src/server/payments/yookassa.ts`. Literal paid-media targets отсутствуют: canonical f15 неизменен, его dependent5eae pin не обновляется. Ни перенос sources, ни добавление другого исполняемого helper не входят в scope; изменение таблицы требует plan/source admission до записи.

Repository target block содержит только реальные repo-relative files. Установленный native `check-code-targets.mjs` вызывает repo-relative `measureManifest(...,'qe')`: он измеряет public test/manifest, **не читает absolute private files**. Ему не приписывается отсутствующая поддержка и новый framework для неё не создаётся.

До code root отдельно фиксирует exact allowlist шести будущих private outputs из таблицы, их ожидаемое отсутствие, существование/полные SHA семи immutable inputs и affected launch witness; actual entrypoint inventory05B и дозволенные команды проверяются на отсутствие пропущенного financial dispatcher. Эти данные — самостоятельный private input artifact с digest, не native gate receipt и не SHA ещё не созданных файлов. K1/K2/native scope проверяют свой реальный public scope; root companion admission отдельно допускает только объявленные private output paths. Если actual inventory/absence/hash отличается — STOP и корректировка плана до записи.

После code root capture/readback измеряет actual private bytes всех шести outputs и unchanged input dependencies; actual source/test hashes помещаются в public binding manifest без private data. Независимый reviewer читает те же actual paths/bytes/fixtures и сверяет каждый digest; public runner исполняет этот набор через explicit operational profile. Native gate связывает manifest как repository файл; root/independent byte checks являются отдельным evidence. Missing/mismatched private source либо новый path не закрывается зелёным native manifest check. В author handoff/QE сохраняются обе области и их реальные ограничения.

## Задачи SPARC-GOAP

### TASK-1 — Specification/architecture: FR1 FR2 FR3 FR4 FR5 NFR, ADR-001, genuine gates
Root завершает requirements/checkpoints, recall и originating verification R1 rework по всем семи условиям QCSD; фиксирует current measured snapshot/closure. Затем actual K1/K2 и отдельный companion private admission, описанный выше. Новые имена adapter/fixture/test module проверяются K1; existing basename derivatives — scoped reuse. K2: установленный `/home/clipmkr/.agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/recover-known-checkout-response --tier=M --require-requirements`. Реальный verdict/exit и requirements trace обязательны; команда здесь не запускалась. Depends:none. Success: actual approval/closure, public native scope и private declared-output/immutable-input evidence; никакого выдуманного native hash для absolute source.

### TASK-2 — Refinement/TDD: FR1 FR2 FR3 FR4 FR5, ADR-001, различающие RED fixtures
Создать two private fixture sources и public test из таблицы; записать original failure before changes: real Chrome immediate navigation + request fsync20/20 RED и original canonical missing-response refusal. Запускать только isolated synthetic local servers/tempfiles, без product/provider/SSH/sessions. Private fixtures исполняют actual captured bytes, не параллельную модель решений; fixed substitutes разрешены только на внешних boundaries. Success: RED причина/outputs привязаны к source SHA, один POST каждого browser trial, future GREEN checks заранее сформированы. Depends:TASK-1; estimate: один bounded author test pass с расследованием любых flaky outcomes, без обещания результата.

### TASK-3 — Refinement: FR1 FR5 NFR, ADR-001, устойчивый browser capture
Изменить только derivative browser. Exact route.fetch0retries/0redirects, actual original forwarded request, bounded body parse, private atomic persistence/readback до fulfill, safe closed diagnostic codes и awaited handler error. Не использовать extra fetch/continue fallback. Success: `capture actual body before navigation with one forwarded POST`20/20 GREEN плюс независимый syscall/page/server barrier05E1: `observe durable capture before browser receives response`. Skip/order mutations дают RED; reset/redirect/write/fsync/rejected handler/double click не вызывают второй upstream POST и не показывают success. Depends:TASK-2; один isolated browser fixture group, AM-4.

### TASK-4 — Refinement: FR2 FR3 FR4 FR5 NFR, ADR-001, narrow recovery и lifecycle
Создать adapter, derivative bridge/run и recovered input branch browser по05A–D/F. Permanent B0→B1 fence сохраняет original runtime/execution и исключает actual old812 доoperate; same namespace/locks, отдельные keys/windows, полный event/delivery/ACK predicate, fixed read-only SQL+provider GET A1, one recovery slot, durable consume/revalidate/session cleanup и terminal reconcile. Old db0/b9/f15/native immutable. Success: tests AM-1/AM-2/AM-3/AM-5 и вся05F minimal-mutation matrix; metadata bind вызывает0checkout/0provider mutation/0session, terminal history не содержит fabricated response. Root проверяет полный entrypoint inventory до code, включая leaf restrictions; неизвестный разрешённый обход → STOP. Depends:TASK-2 и originating03.5 closure; shared browser edits последовательно одним автором. Scope4 runtime files сохраняется.

### TASK-5 — Completion/offline QE: FR1 FR2 FR3 FR4 FR5 NFR, ADR-001
Freeze actual sources/fixture hashes, public manifest и whole repository diff; focused lint/types/test. Native fixtures, portable assertions, fault matrix и discriminating mutations выполняются с явно выбранным private operational profile; отсутствующий/invalid profile → FAIL. Независимая новая сессия читает requirements/ADR/05/06, затем сама находит exact private code и tests; проверяет actual bytes и original closures. Serious findings проходят originating rework/verification до closure. Success: meaningful actual RED→GREEN, no unresolved serious findings, code/spec/target/source anti-drift. Это offline implementation acceptance, не настоящий TEST outcome. Depends:TASK-3,TASK-4.

### TASK-6 — Completion/runtime handoff: FR2 FR3 FR4 FR5 NFR, ADR-001
Root после actual gates/source review готовит finite exact recovery GO с оригинальным origin и fresh action window. Сначала fresh read-only evidence, canonical identity/control/health, then bounded metadata bind. Subsequent exact TEST action/session — отдельный разрешённый runtime шаг; positive own-session cleanup обязателен и при failure. Terminal reconcile только с whole BOTH-store24h/no_pending proof. Новый обычный checkout требует своего fresh GO/baseline после closure; не является частью recovery action. Success: private linked receipts и честные states; pending/unknown/недоступный сценарий NOT VERIFIED. Provider decline/cancel/delivery не выводятся из fixtures. Depends:TASK-5; runtime не исполняется автором документа и не разрешается файлом.

## Named checks и различение плохих случаев

Все ниже — реальные future test titles в `tests/recover-known-checkout-response.test.ts`, запускающие pinned private fixtures; это требования к тестам, не PASS результаты.

| Test | Значимое доказательство |
|---|---|
| `reject fabricated original response and mismatched recovery` | Mutate account/key/window/ticket/callback/case/source/shop/TEST/intent/provider/metadata/SKU/amount/currency;0/2matches; false original response, equalized two keys, unknown schema/read-only → отказ до metadata admission/callback |
| `bind one known pending without replacing failed origin` | Exact positive pending; original case/used/keys/execution bytes сохранены, no new_checkout/no true response-bound;0checkout/native mutation/session; one bound receipt/active_case |
| `preserve full inventory and event bounds around known pending` | Любой второй pending/unknown/inflight или missing row STOP; bound точно24ч/unknown clock/intent timestamp вместо event → STOP; same exact pending виден в whole raw и не labelled terminal/fullcutoverGO |
| `stop replay and partial recovery before callback` | Real process concurrency/kill на durable boundaries; double recovery/action, consumed_unknown, stale ticket/deadline и fork-lost CONFIRMED →0callback/0newcheckout; сохраняются original/raw/journal |
| `reject changed captured source and fd identity` | Подмена pathname после capture не меняет исполняемые bytes; до capture/digest mismatch/symlink/owner/mode/inode/lock replacement/partial write/fsync/rename error → STOP; real filesystem, не mocked os |
| `require fresh control health and positive own cleanup` | Stale control/health/config/source и oldwindow substituted for newaction → отказ; native cleanup positive/unknown различаются; own session receipt не переименовывает revoked original |
| `reconcile recovered terminal without rewriting origin` | Pending/success-as-cancel/unrelated grant/old event clock/early24h → отказ; exact terminal+fullgate appends honest origin/recovery, permits only fresh ordinary GO; kill междуoperation/journal commit блокирует дальнейшие actions |
| `capture actual body before navigation with one forwarded POST` | Actual Chrome/localHTTP/fsync original RED20/20→candidateGREEN20/20, exact byte/status/request hash, one upstreamPOST, instrumented-forward label |
| `stop capture errors without duplicate request or secret output` | Network reset, redirect, two matching POST, invalid body, failed persistence и handler rejection;0retry, closed safe code, no URL/token/cookie/header leaks |
| `fence historical entries across every durable recovery boundary` | Actual captured old812/newbridge/b9/adapter/допустимые helper leaves; kill до/после B1, bind, operation reconcile, journal closure; otherwise valid admissions;0callback/checkout до closure; old812 отказывает по B1 доoperate, newbridge после обеих closure+fresh GO даёт ровно1 canonical callback |
| `preserve every canonical event predicate with one known pending` | Positive known pending и whole inventory; отдельные missing/false owner/store/shop/history, active_delivery=true, absent/unknown ACK, unknown_intent_200, false no_inflight/no_uncontrolled, stale/incomplete/unstable inventory и boundary24h дают конкретный STOP |
| `bind confirmation URL only to fresh read-only provider evidence` | Actual fixed SQL/provider collector code, SIMULATED boundaries: exact positive pending redirect безexpires_at допустим;0/2rows, wrongkey/ID/shop/test/order/amount/currency/type/URL/digest, stale GET/reset/redirect/body overflow → STOP. Returned URL не original body; actual synthetic form expired/changed/unavailable или provider terminal блокируют submit, не создавая checkout |
| `observe durable capture before browser receives response` | Real Chrome/server `/client-observed`, independent file read и actual syscall trace05E1; barriers/kill доfilefsync/dirfsync/readback; earlyfulfill/skipfsync/wrongFD/postfulfillreadback mutations RED; finalbytes alone не oracle |
| `distinguish expired origin evidence from active recovery authority` | Два positive controls P-origin/P-action и каждый самостоятельный minimal case05F, с пересчитанными зависимымиdigest; exact diagnostic +0authorization/callback/provider/session/checkout. Истёкший historical ticket при creation внутри окна допускается, current authority expiry/replay отказывает |
| `reject private roster drift despite a valid public manifest` | Native-public manifest остаётся корректным, но private actual source/fixture/readonly dependency подменён/пропущен илиprofilewrong → operationalFAIL; правильный actual captured roster исполняется |

Fault/mutation success требует, чтобы удаление конкретного guard ломало его отдельный case, а не чтобы текст функции присутствовал. Read-only observer wrappers05E1 вызывают настоящие fs/open/flock/fsync/process операции, записывают их результаты и держат FIFO barriers; возвращать fake success/ошибку вместо реального syscall запрещено. Fault points используют owned FD/FS/process kill. Chrome отсутствие/другой executable/profile не считается SKIP/PASS обязательной группы. Shell/SQL/provider boundaries offline явно SIMULATED. Closed GET to provider в data-only preflight не подменяет provider mutation; unsafe authority cases отказывают до обоих видов provider I/O.

## Порядок, проверки и checkpoints

DAG: TASK-1→TASK-2→TASK-3/TASK-4→TASK-5→TASK-6. Единственная допустимая параллельная группа — независимое чтение/fixture подготовка; shared browser file редактируется последовательно. Модель автора не выполняет independent closure. До каждого stage — релевантный pinned `npm run dz -- recall ... --project /home/clipmkr`; root записывает настоящие stage/usage/checkpoint данные, не архитектор.

После code обязательный operational invocation: `CLIPMKR_RECOVERY_OPERATIONAL=1 CLIPMKR_RECOVERY_PROFILE=/root/.config/clipmkr/recover-known-checkout-response-20261106/operational-profile.private.json node /home/clipmkr/node_modules/vitest/vitest.mjs run tests/recover-known-checkout-response.test.ts` из worktree. Profile — data-only0600 с version1, exact absolute source/fixture/input paths и bindings public manifest, own output0700, exact Chrome path/SHA; missing/invalid profile при operational=1 → FAIL, не skip. Default portable-only suite явно не утверждает operational acceptance. Python fixture: isolated `python3 -I -S`; Chrome: pinned Node/Playwright/actual Chrome. Related read-only regression — existing callback profile с прежними bindings, без правки старыхtests/receipts. Scoped static checks через существующие lint/typecheck; все commands/output/digests фиксируются фактически.

Перед completion — frozen source/dependency hashes, requirement→test→actual result trace, no unexpected Git/private-target changes, no secrets/URLs/IDs in public files, exact OpenSpec/ADR/code anti-drift. Переиспользуемый подтверждённый урок root сохраняет pinned `npm run dz -- teach ... --project /home/clipmkr --no-mirror` с фактическим result+recall. Новых historical stage receipts нет.

## Amendments

R1 rework вводит permanent journal.binding fence и точный entrypoint inventory вместо прежнего утверждения «старые sources не допускаются». Новый риск совместимости B0/B1 и crash при migration проверяется тем же AM-1; physical root rollback не маскируется под sandbox defense. Historical812 не работает и после closure; ordinary canonical actions идут через новый bridge. Полный24h gate по-прежнему может задержать следующий CJM. Actual implementation и текущая доступность provider формы неизвестны.

AM-1 (QCSQ-01, RISK-01, QT-01): permanent B1 protocol/source fence, same locks и inventory разрешённых входов; оба closure обязательны. Confirmation: actual historical bridge не обходит partial reconcile, после closure новый bridge допускает только fresh GO → test `fence historical entries across every durable recovery boundary` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

AM-2 (RISK-02): полный canonical event/delivery/ACK/no-inflight predicate05A сохраняется при единственном known pending; missing/unknown закрывает допуск. Confirmation: каждое независимое нарушение даёт отказ при otherwise valid target → test `preserve every canonical event predicate with one known pending` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

AM-3 (QT-02): fixed read-only exact-key SELECT и authenticated provider GET внутри существующего planned runner; fresh authoritative redirect URL плюс actual TEST form before submit, без выдуманного TTL. Confirmation: чужой/stale/invalid source или недоступная/изменённая форма не допускает submit → test `bind confirmation URL only to fresh read-only provider evidence` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

AM-4 (QT-03): independent syscall/page/server observer и deterministic barriers05E1 доказывают file+directory fsync/readback до fulfill. Confirmation: early fulfill/skip fsync/order mutation даёт RED даже при правильных финальных bytes → test `observe durable capture before browser receives response` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

AM-5 (QT-04): separate historical provenance/current recovery/current action controls и minimal single-cause mutations05F. Confirmation: expired historical evidence не теряет подлинность, current expiry/replay/mismatch блокируется соответствующим guard → test `distinguish expired origin evidence from active recovery authority` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

AM-6 (root-source-admission clarification): native gate измеряет только repo-relative файлы; pre-code private allowlist/input witness и post-code actual-byte review — отдельное companion evidence. Confirmation: valid public manifest не скрывает altered private source/profile → test `reject private roster drift despite a valid public manifest` in `tests/recover-known-checkout-response.test.ts` (fails if reverted).

Gate states: requirements approval — root records; ADR proposed; QCSD R1 unresolved, author rework awaiting originating verification; K1/K2/code/QE/runtime не выполнялись автором этого документа. Ни один AM здесь не объявлен независимо закрытым.

EXPECTED_CODE_TARGETS:
- tests/recover-known-checkout-response.test.ts
- tests/fixtures/recover-known-checkout-response.bindings.json
