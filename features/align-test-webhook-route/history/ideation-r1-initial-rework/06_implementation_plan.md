# План выравнивания TEST callback

05.11.2026. **AUTHOR REWORK R1; 7 OPEN; APPLY NOT RUN.** M10, плановые изменения без UI. Originating quality/risk/testability R1 завершены с conditional; genuine evaluate вернул unresolved7. Это не closure/checkpoint/coding admission. Архитектор/planner назначен `gpt-6-astra xhigh`; будущий автор кода `gpt-6.1-sol high`; originating own-review плановых условий — `gpt-6.1-terra xhigh` в fresh docs-first сессиях root. Actual code/executor review — иная модель, чем их автор, по model matrix. Эта сессия не запускает агентов/runtime/Git/платежи и не меняет `.fa-state`.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-align-test-callback-upstream.md`, `03.5_ideation_report.md`, `05_architecture.md`, все три `reviews/qcsd-*.md`, OpenSpec proposal/spec, AGENTS/CLAUDE, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, `docs/model-matrix.md`; pinned feature-adr 1.5.25 modules03.5/06 и code-goal-planner reference. Детальные O/E/H/P/C контракты принадлежат 05, а не устной инструкции оператору.

## Goal state

Current: по переданной private диагностике checkout main DB и callback legacy DB различаются при одном TEST shop. Runtime в этой сессии не измерялся. Goal: reviewed fragment соответствует ровно одному upstream delta; действующие handler/IP/config и stores переиспользуются; ограниченный настоящий TEST CJM относится к main store. Config operation обратима с durable recovery, health конкретен, pending/repeats доказанно безопасны либо apply BLOCKED. Coverage percentage/retention/provider redelivery SLA неизвестны и не придумываются.

Scope прежний: upstream delta в existing edge; root autonomous steps1–4 TEST CJM, global=false, sole approved account, TEST shop/test=true/test_ key. No LIVE, новых API/env/secrets/DB schema/network/Cloud/DNS, нового daemon/watchdog. Runtime change разрешён только после реальных gates и root preflight; документы не являются допуском. Private operational records/backup — evidence, не новый application datastore.

## Tasks и порядок зависимостей

- TASK-1 — Specification, ADR-001, FR-1/FR-2/FR-3/NFR-1: сохранить R1 exact history, проработать семь originating conditions в 05/06/03.5, проверить неизменность OpenSpec SHA в01. Files: существующие plan docs и новый03.5; source reports не редактировать. Depends: none. Success: root измерил native R2 и исходные reviewers сами проверили каждое условие на новых bytes; здесь только author rework, все7 OPEN. Estimate: 1 bounded planning block, длительность own-review не обещается.
- TASK-2 — Pseudocode/architecture, ADR-001, FR-1/FR-3/NFR-1: принять O/E/H/P/C контракты05; после genuine ideation closure/checkpoints повторить pinned K1 и K2 с `--tier=M --require-requirements --acid=A1,A2,A3,A4,A5`, проверить coder-context. Depends: TASK-1. Success: реальные exit0/PASS на финальных bytes и trace требований/ADR/Acid, не author receipt. Изменение плана заново перепривязывается. Estimate: один локальный validation block.
- TASK-3 — Refinement, ADR-001, FR-1/FR-2/FR-3/NFR-1: после coding admission создать только `deploy/test-webhook-route.caddy` и `tests/test-webhook-route.test.ts`, а также отдельный actual private executor вне Git по05§E. Tests: A1 `reject legacy upstream`; A2 `reject collateral bytes and XFF drift`; A3 stale SHA/inode, exact scoped fragment и AM-1/AM-5/AM-6; A4 `reject unsafe TEST isolation` + AM-4/AM-7; A5 AM-1/AM-2/AM-3/AM-5. Depends: TASK-2. Success: positive controls и реальные red negatives, actual executor tested на temp filesystem, отдельный review exact source, no runtime failure injection. Estimate: один code+fixture block, до успеха дальше не идти.
- TASK-4 — Completion preflight, ADR-001, FR-1/FR-2/FR-3/NFR-1: root привязывает actual executor SHA в этом плане **до code QE**, независимый reviewer читает actual source и same-path fixtures; native code QE измеряет WRITE2/READ-ONLY3 и private binding отдельно. Root реально inspect runtime concurrency O1, host/mount/dev/inode/source, same published SHA/web image, network/IP chain, TEST flags; затем read-only BOTH-store inventory P и health baseline H. A1/A3/A4: не совпало/unknown → STOP. Depends: TASK-3. Success: own code/executor review+QE, actual SHA/fixture receipts, доказанный контроль всех reload/restart и safe transition; любой недоказанный пункт — BLOCKED. Estimate: bounded preflight90s health + inventory по фактическому объёму; никаких обещаний завершения внешних gates.
- TASK-5 — Completion apply/recovery, ADR-001, FR-1/FR-3/NFR-1: root/operator после допуска исполняет05§O через SHA-bound executor; lock → source/baseline/inventory recheck → private0600 backup+fsync+verify → full candidate validate → durable incomplete record+fsync → held-fd full write/truncate/fsync → same-inode/container hash → validate → reload → H → durable applied. A2/A3/A5: ошибка/unknown после начала write → O4, до write → STOP. Changed inode/backup missing/control unknown/restore unprovable → incident/no additional write. Depends: TASK-4. Success: actual source/candidate/backup/executed SHA и before/after health evidence; только конфигурационный success, не payment acceptance. Estimate: один controlled window, deadlines H, при превышении recovery/incident.
- TASK-6 — Completion TEST CJM/QE, FR-1/FR-2/FR-3/NFR-1: только approved target проходит05§C, private intent→TEST provider→edge request→main payment_event/payment→unique grant/payment_ref→fresh-session rights; actual duplicate и fail/cancel честно отличать от operator relay/abandon. Один paid-entitled job, debit/allocation once, native Chrome Play/Download; trial FIFO не выдавать за расход нового payment grant. A1/A4 и AM-7. Depends: TASK-5. Success: полный связанный evidence, independent QE/code-spec anti-drift; недоступный обязательный сценарий NOT VERIFIED. После new checkout normal rollback только через P inventory/reconcile; emergency health rollback O4 сохраняет business incomplete_pending и halt. Grants retained, no SQL cleanup. Estimate: ограниченный наблюдаемый TEST run; внешний outcome не имеет выдуманного срока успешности.

DAG: TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6. Читающие originating reviews могут исполняться независимо root; эта сессия без агентов. Все apply/restore и business actions последовательны, write scope не делится между операторами. Переход checkpoint выполняет только root после настоящего результата; этот план не вызывает checkpoint/state команды.

## Точный proposed fragment

Следующие строки — design input. Repo config до gates не создан. Отступы exactAfter сохраняются при последующей записи, сравнение ведётся побайтно.

```caddyfile
	handle /api/webhooks/yookassa-test {
		rewrite * /api/webhooks/yookassa
		reverse_proxy n5-clipmaker-proxy-1:80 {
 header_up X-Forwarded-For "{http.request.remote.host}, {http.request.local.host}"
 }
	}
```

Native QE snapshot должен измерить два будущих WRITE targets и read-only владельцев `apps/web/src/server/billing-handler.ts`, `apps/web/src/server/ip.ts`, `packages/shared/src/config.ts`. Не менять этих read-only paths ради этой фичи. Private full config/executor имеют отдельные SHA bindings и independent review; не копировать full config в native публичный artifact. Новые code targets или env/network changes требуют revision/router/gates до записи.

## Binding actual executor до code QE

**Статус: NOT ESTABLISHED — actual private source пока не написан; точный SHA отсутствует.** Root обязан дополнить эту секцию exact final SHA-256, private path, SHA reviewed launcher/remote payloads, Python/runtime version, own-review и actual same-path fixture evidence; затем перепривязать финальные plan/native inputs. Пока этого нет, code QE/apply не допускаются. Это явный открытый gate, не заполненный вымышленным digest placeholder.

Один self-contained stdlib Python source вне Git; независимый launcher читает captured bytes, hash-match reviewed source до любых writes, compile/exec immutable bytes, без mutable local helper imports. Launcher/remote payloads также reviewed и SHA-bound, record хранит actual executed hash. Binding invalid → ноль writes. Чтение пути+hash с последующим запуском по пути не удовлетворяет gate.

## Проверки, ограничения и checkpoints

Планируемые тесты — один существующий future path `tests/test-webhook-route.test.ts`. Они не созданы и не выполнялись здесь. Real executor fixtures обязательны отдельно от contract/model tests: temp files с настоящим fd/inode и fsync, positive short-write completion, child SIGKILL между частичными writes/после truncate/до fsync/до reload, discover durable marker после process death, same-inode restore и no-false-applied. Write/truncate/fsync ошибки внедряются на syscall boundary actual executor в sandbox; внешние Caddy/SSH adapters в fixture обозначаются как simulated. Fixture не касается working edge, сети, БД или provider.

Негативы должны активировать отказ на реальном входе и проваливаться при снятии guard; не тестировать только текст исходника. Actual same-path launcher/apply/recover проходят собственный independent review и tests; если реальный путь невозможно испытать с изоляцией, evidence gap сохраняется и apply BLOCKED. Runtime injection никогда не является требованием этого плана.

До apply root повторяет релевантный `dz recall`, выполняет genuine originating own-review R2, K1/K2/context, code/QE и anti-drift; общие lessons пишет/проверяет в разрешённом отдельном блоке. Здесь recall/teach/store/state не выполняются из-за явного ограничения владельца: только plan docs и собственное evidence. Существующие исторические recall/K1/K2 сохранены в history и02; они не относятся к новым bytes. Новое обучение/успешные receipts не выдумываются.

Риски: общий edge и non-atomic in-place write требуют O1+O4; pending/terminal legacy repeat может честно заблокировать весь cutover; health failure требует rollback, после нового checkout это не отменяет платежный хвост. No additional infrastructure. Предусловия нельзя снять ради завершения шага. Validation документа не подтверждает runtime, магазин, rights или ручную приёмку.

## Amendments

AM-1 (qcsd-quality / QQUALITY-01): durable incomplete marker и verified backup до write; crash discovery и exact restore через тот же inode. Confirmation: SIGKILL child после первого partial write оставляет marker с applied=false; новый процесс восстанавливает old hash/inode, а missing backup даёт incident без write → test `recover interrupted write from durable marker` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/5;05§O2/O4. Actual executor fixture, не один mock.

AM-2 (qcsd-quality / QQUALITY-02): конкретные H probes/status/release/image/identity и bounded deadlines. Confirmation: wrong release, changed image, degraded503 и исчерпанный timeout дают STOP до write или restore после write; healthy control проходит → test `reject degraded or unknown health within deadline` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/5;05§H. Проверить ноль reload до validate и incident при rollback health failure.

AM-3 (qcsd-risk / RISK-01): единственный lock плюс доказанный контроль всех cooperating reload/restart, incomplete marker переживает release lock после crash. Confirmation: второй процесс не пишет при занятом lock; unknown reloader/restart control блокирует apply, а reader при incomplete не reload partial bytes → test `refuse concurrent operation or uncontrolled reload` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/5;05§O1/O4. Fixture подтверждает контракт; root отдельно реально inspect runtime actors.

AM-4 (qcsd-risk / RISK-02): BOTH-store inventory, nonterminal provider GET и доказанный safe handling каждого pending/repeat; normal rollback после new checkout требует reconciliation. Confirmation: legacy pending, ambiguous owner, terminal legacy repeat→main unknown_intent/HTTP200 и missing inventory блокируют cutover; новый main pending блокирует normal rollback; emergency restore оставляет halted/incomplete_pending и требует нового inventory перед retry → test `block unsafe cutover and rollback with pending ownership` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/6;05§P. Нет SQL/provider mutation, retention/redelivery предположений.

AM-5 (qcsd-testability / TST-01): held fd, full loop write, truncate/fsync и fail-closed recovery; no false applied. Confirmation: реальные temp bytes после short-positive пишутся полностью, zero-write/OSError/truncate/fsync failures и SIGKILL не дают applied/reload; mismatched inode/corrupt backup дают incident и ноль дополнительных writes → test `handle partial write and sync failure without false applied` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/5;05§O3/O4. Проверять порядок и final bytes/inode, не только return code.

AM-6 (qcsd-testability / TST-02): reviewed exact bytes захватываются и исполняются immutable, включая launcher/remote payload SHA; actual executed hash записан. Confirmation: подмена source или remote payload после review до capture даёт ноль writes; подмена pathname после capture не меняет executed code/hash; mutable helper import отклоняется → test `reject substituted executor before any write` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4;05§E. Независимый review actual private source и его same-path fixture обязателен.

AM-7 (qcsd-testability / TST-03): единый private oracle05§C, exact owner/shop/intent/payment/SKU/amount/test/event/grant/payment_ref/rights и один job/debit. Confirmation: wrong store/payment/account, unrelated grant, duplicate second grant, pending labelled canceled, operator relay labelled provider duplicate и trial allocation labelled new-paid consumption отвергаются; согласованная цепь проходит → test `reject uncorrelated payment and paid capability evidence` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/6. Offline negative classifier не заменяет provider delivery и native Chrome E2E; недоступное evidence NOT VERIFIED.

## READ-ONLY binding

Literal declared inputs5 = **WRITE2 + READ-ONLY3**. Первые два пути создаёт будущий coder; оставшиеся владельцы callback/IP/config неизменны и включены только для native measured input. Их изменение, новый repo WRITE target или новый runtime delta требует scope/router/review revision; M10 этим планом не расширен. Private source/backup/config/identifiers в Git не попадают.

EXPECTED_CODE_TARGETS:
- deploy/test-webhook-route.caddy
- tests/test-webhook-route.test.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/ip.ts
- packages/shared/src/config.ts
