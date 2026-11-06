# План выравнивания TEST callback

06.11.2026. **R3 code/QE: unresolved2, rounds3, native-fixed-ceiling-reached. Runtime BLOCKED. Подготовлен точный candidate для согласования одного дополнительного цикла; owner approval отсутствует.** Ниже сохранён исходный план с последующими factual bindings; актуальные нормативные требования/ADR/05 не менялись. Исторический pre-candidate06 находится в history/code-qe-r3-blocked. Третий цикл не закрыт и не перезапускается.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-align-test-callback-upstream.md`, `03.5_ideation_report.md`, `05_architecture.md`, все три `reviews/qcsd-*.md`, OpenSpec proposal/spec, AGENTS/CLAUDE, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, `docs/model-matrix.md`; pinned feature-adr 1.5.25 modules03.5/06 и code-goal-planner reference. Детальные O/E/H/P/C контракты принадлежат 05, а не устной инструкции оператору.

## Goal state

Current: по переданной private диагностике checkout main DB и callback legacy DB различаются при одном TEST shop. Runtime в этой сессии не измерялся. Goal: reviewed fragment соответствует ровно одному upstream delta; действующие handler/IP/config и stores переиспользуются; ограниченный настоящий TEST CJM относится к main store. Config operation обратима с durable recovery, health конкретен, pending/repeats доказанно безопасны либо apply BLOCKED. Coverage percentage/retention/provider redelivery SLA неизвестны и не придумываются.

Scope прежний: upstream delta в existing edge; root autonomous steps1–4 TEST CJM, global=false, sole approved account, TEST shop/test=true/test_ key. No LIVE, новых API/env/secrets/DB schema/network/Cloud/DNS, нового daemon/watchdog. Runtime change разрешён только после реальных gates и root preflight; документы не являются допуском. Private operational records/backup — evidence, не новый application datastore.

## Tasks и порядок зависимостей

- TASK-1 — Specification, ADR-001, FR-1/FR-2/FR-3/NFR-1: сохранить exact R2 inputs в history/ideation-r2, устранить только RISK-03 в01/05/06/03.5 и ADR coherence, проверить неизменность OpenSpec SHA в01. Files: существующие plan docs и новый03.5; source reports не редактировать. Depends: none. Success: root измерил native R3 и исходные reviewers проверили RISK-03 и затронутую дельту на новых bytes; семь исходных условий own-verified вR2 не подменяют review нового scope. Здесь RISK-03 OPEN. Estimate: 1 bounded planning block, длительность own-review не обещается.
- TASK-2 — Pseudocode/architecture, ADR-001, FR-1/FR-3/NFR-1: принять O/E/H/P/C контракты05; после genuine ideation closure/checkpoints повторить pinned K1 и K2 с `--tier=M --require-requirements --acid=A1,A2,A3,A4,A5`, проверить coder-context. Depends: TASK-1. Success: реальные exit0/PASS на финальных bytes и trace требований/ADR/Acid, не author receipt. Изменение плана заново перепривязывается. Estimate: один локальный validation block.
- TASK-3 — Refinement, ADR-001, FR-1/FR-2/FR-3/NFR-1: после coding admission создать только `deploy/test-webhook-route.caddy` и `tests/test-webhook-route.test.ts`, а также отдельный actual private executor вне Git по05§E. Tests: A1 `reject legacy upstream`; A2 `reject collateral bytes and XFF drift`; A3 stale SHA/inode, exact scoped fragment и AM-1/AM-5/AM-6; A4 `reject unsafe TEST isolation` + AM-4/AM-7/AM-8; A5 AM-1/AM-2/AM-3/AM-5. Depends: TASK-2. Success: positive controls и реальные red negatives, actual executor tested на temp filesystem, отдельный review exact source, no runtime failure injection. Estimate: один code+fixture block, до успеха дальше не идти.
- TASK-4 — Completion preflight, ADR-001, FR-1/FR-2/FR-3/NFR-1: root привязывает actual executor SHA в этом плане **до code QE**, независимый reviewer читает actual source и same-path fixtures; native code QE измеряет WRITE2/READ-ONLY3 и private binding отдельно. Root реально inspect runtime concurrency O1, host/mount/dev/inode/source, same published SHA/web image, network/IP chain, TEST flags; затем read-only BOTH-store inventory P и health baseline H. A1/A3/A4: не совпало/unknown → STOP. Depends: TASK-3. Success: own code/executor review+QE, actual SHA/fixture receipts, доказанный контроль cooperating writers/reload в bounded window и отдельный residual crash risk O1; обычная unless-stopped без активного конфликта не блокирует. Transition решается поP2: GO/defer-until/STOP после fresh BOTH-store inventory и known event-time classification без активных/неопределённых relevant платежей. Historical terminal debt read-only/deferred, не grant prerequisite нового CJM. Estimate: bounded preflight90s health + inventory по фактическому объёму; никаких обещаний завершения внешних gates.
- TASK-5 — Completion apply/recovery, ADR-001, FR-1/FR-3/NFR-1: root/operator после допуска исполняет05§O через SHA-bound executor; lock → source/baseline/inventory recheck → private0600 backup+fsync+verify → full candidate validate → durable incomplete record+fsync → held-fd full write/truncate/fsync → same-inode/container hash → validate → reload → H → durable applied. A2/A3/A5: ошибка/unknown после начала write → O4, до write → STOP. Changed inode/backup missing/control unknown/restore unprovable → incident/no additional write. Depends: TASK-4. Success: actual source/candidate/backup/executed SHA и before/after health evidence; только конфигурационный success, не payment acceptance. Estimate: один controlled window, deadlines H, при превышении recovery/incident.
- TASK-6 — Completion TEST CJM/QE, FR-1/FR-2/FR-3/NFR-1: root выдаёт new-CJM GO после полного свежего inventory/event classification, отсутствия активных/неопределённых relevant платежей, route health и baseline; historical debt остаётся read-only/deferred и не требует grant. Только новый intent sole approved target, созданный после GO/baseline, проходит05§C; AM-8 останавливает old/nonapproved intent до POST/relay/иной business action, private intent→TEST provider→edge request→main payment_event/payment→unique grant/payment_ref→fresh-session rights; actual duplicate и fail/cancel честно отличать от operator relay/abandon. Один paid-entitled job, debit/allocation once, native Chrome Play/Download; trial FIFO не выдавать за расход нового payment grant. A1/A4 и AM-7. Depends: TASK-5. Success: полный связанный evidence, independent QE/code-spec anti-drift; недоступный обязательный сценарий NOT VERIFIED. После new checkout normal rollback только через P inventory/reconcile; emergency health rollback O4 сохраняет business incomplete_pending и halt. Grants retained, no SQL cleanup. Estimate: ограниченный наблюдаемый TEST run; внешний outcome не имеет выдуманного срока успешности.

DAG: TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6. Читающие originating reviews могут исполняться независимо root; эта сессия без агентов. Все apply/restore и business actions последовательны, write scope не делится между операторами. Переход checkpoint выполняет только root после настоящего результата; этот план не вызывает checkpoint/state команды.

## R3: исключение historical mutations из feature

Первоначальные rework05/06 и сопутствующие документы сохранены в `history/ideation-r1-initial-rework/`; manifest SHA `e349e1918955565d5bb6d6add25f9576c97f22ee155fef6143b9f1ff8f1ef18a`. Новые root facts прочитаны полностью из `R/callback-plan-repair/ROOT_READONLY_FACTS.private.md`. Root corrigendum — техническая проработка своего прежнего избыточного требования, не owner approval/closure. Обычный writer/reload control отделён от hardware/host/Caddy crash; независимый от TLS SSH+durable backup/marker оставляют ручной recovery, возможен downtime. Полные positive provider cases и даты остаются private, не вводятся в public plan.

R2 выявил RISK-03: возможность old canonical grant/relay противоречила неизменённому OpenSpec. В R3 она удалена вместе с зависимостью нового CJM от исправления долга. Root facts — read-only evidence, не authorization; old positive относится к nonapproved owner, private event receipt даёт upper bound одного события (не всего store). Факты самостоятельно не переизмерялись. До нового CJM — fresh BOTH-store inventory, полная known event-time classification, отсутствие active/unknown relevant payments, route health и fresh baseline. Классифицированный старый terminal debt остаётся DEFERRED/UNRESOLVED, не требует grant. Только новый intent sole approved target после GO/baseline может использоваться оператором для business actions; old/nonapproved → STOP до POST/relay/mutating status GET. Native app/provider traffic не меняется.

Exact current12 docs и четыре supporting history inputs сохранены до R3 в `history/ideation-r2/manifest.json`, SHA `e071103a3c5a63a3a5be315501069b0637e698dbe55bd82ec2bf57e0aa4bc1d6`; `.fa-state` не копировалась. RISK-03→AM-8, dependent AM-4 очищен от historical permission; original7 condition meanings и остальные AM сохранены. O1/manual SSH crash recovery, H/exact health, E/reviewed Python bytes и actual temp SIGKILL fixtures неизменны. Report/source condition objects не редактируются. Root выполняет actual K2/context/native R3/own-review; это не checkpoint/PASS/approval.

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

До apply root повторяет релевантный `dz recall`, выполняет genuine originating own-review R3 по текущим bytes, K1/K2/context, code/QE и anti-drift; общие lessons пишет/проверяет в разрешённом отдельном блоке. Здесь recall/teach/store/state не выполняются из-за явного ограничения владельца: только plan docs и собственное evidence. Существующие исторические recall/K1/K2 сохранены в history и02; они не относятся к новым bytes. Новое обучение/успешные receipts не выдумываются.

Риски: общий edge и non-atomic in-place write требуют O1+O4 с честным residual crash/downtime risk, без запрета только из-за unless-stopped; legacy events оцениваются по ownership и документированному24ч окну от события/доказанной верхней границы, неизвестная связь блокирует конкретную попытку; health failure требует rollback, после нового checkout это не отменяет платежный хвост. No additional infrastructure. Предусловия нельзя снять ради завершения шага. Validation документа не подтверждает runtime, магазин, rights или ручную приёмку.

## Amendments

AM-1 (qcsd-quality / QQUALITY-01): durable incomplete marker и verified backup до write; crash discovery и exact restore через тот же inode. Confirmation: SIGKILL child после первого partial write оставляет marker с applied=false; новый процесс восстанавливает old hash/inode, а missing backup даёт incident без write → test `recover interrupted write from durable marker` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/5;05§O2/O4. Actual executor fixture, не один mock.

AM-2 (qcsd-quality / QQUALITY-02): конкретные H probes/status/release/image/identity и bounded deadlines. Confirmation: wrong release, changed image, degraded503 и исчерпанный timeout дают STOP до write или restore после write; healthy control проходит → test `reject degraded or unknown health within deadline` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/5;05§H. Проверить ноль reload до validate и incident при rollback health failure.

AM-3 (qcsd-risk / RISK-01): единственный lock плюс доказанный контроль всех cooperating reload/restart, incomplete marker переживает release lock после crash. Confirmation: второй процесс не пишет при занятом lock; unknown reloader/restart control блокирует apply, а reader при incomplete не reload partial bytes → test `refuse concurrent operation or uncontrolled reload` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/5;05§O1/O4. Fixture подтверждает контракт; root отдельно реально inspect runtime actors.

AM-4 (qcsd-risk / RISK-02): BOTH-store inventory и bounded event-time transition по05§P2; normal rollback после new checkout требует read-only сверки. Confirmation: ambiguous owner/event-time, active relevant payment/inflight, created_at вместо event time, неизвестная upper bound и legacy unknown_intent/HTTP200 как safe ACK блокируются; terminal legacy с доказанно истёкшим24ч окном и без активной доставки допускает route при остальных gates. Классифицированный old terminal debt остаётся deferred, без historical grant prerequisite нового CJM. Emergency restore сохраняет halted/incomplete_pending и требует нового inventory → test `block unsafe cutover and rollback with pending ownership` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4/6;05§P. No historical business writes; документированная policy не delivery guarantee.

AM-5 (qcsd-testability / TST-01): held fd, full loop write, truncate/fsync и fail-closed recovery; no false applied. Confirmation: реальные temp bytes после short-positive пишутся полностью, zero-write/OSError/truncate/fsync failures и SIGKILL не дают applied/reload; mismatched inode/corrupt backup дают incident и ноль дополнительных writes → test `handle partial write and sync failure without false applied` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/5;05§O3/O4. Проверять порядок и final bytes/inode, не только return code.

AM-6 (qcsd-testability / TST-02): reviewed exact bytes захватываются и исполняются immutable, включая launcher/remote payload SHA; actual executed hash записан. Confirmation: подмена source или remote payload после review до capture даёт ноль writes; подмена pathname после capture не меняет executed code/hash; mutable helper import отклоняется → test `reject substituted executor before any write` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/4;05§E. Независимый review actual private source и его same-path fixture обязателен.

AM-7 (qcsd-testability / TST-03): единый private oracle05§C, exact owner/shop/intent/payment/SKU/amount/test/event/grant/payment_ref/rights и один job/debit. Confirmation: wrong store/payment/account, unrelated grant, duplicate second grant, pending labelled canceled, operator relay labelled provider duplicate и trial allocation labelled new-paid consumption отвергаются; согласованная цепь проходит → test `reject uncorrelated payment and paid capability evidence` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-3/6. Offline negative classifier не заменяет provider delivery и native Chrome E2E; недоступное evidence NOT VERIFIED.

AM-8 (qcsd-risk / RISK-03): убрать historical canonical grant/relay/mutation и зависимость нового CJM от её выполнения; historical debt только read-only/deferred. Confirmation: old/pre-GO approved intent и nonapproved intent дают STOP до POST/relay/mutating-status с нулём business calls; exact new approved intent после GO/baseline проходит positive control; classified terminal debt не требует grant → test `reject historical or nonapproved intent before business request` in `tests/test-webhook-route.test.ts` (fails if reverted). TASK-1/3/4/6;01 boundary и05§P3/C. Fake root scope flag не обходит запрет; native app traffic не меняется. Это будущий negative test, не executed PASS.

## READ-ONLY binding

Literal declared inputs5 = **WRITE2 + READ-ONLY3**. Первые два пути создаёт будущий coder; оставшиеся владельцы callback/IP/config неизменны и включены только для native measured input. Их изменение, новый repo WRITE target или новый runtime delta требует scope/router/review revision; M10 этим планом не расширен. Private source/backup/config/identifiers в Git не попадают.

## Привязка фактического исполнителя перед code QE (root, 06.11.2026)

TASK-3 завершён как авторская подготовка, не как независимый допуск или runtime apply. TASK-4 связывает реально прочитанные неизменные bytes:

| Private source относительно закрытого каталога текущей поставки | SHA-256 |
|---|---|
| `payment-cjm/apply-route.private.py` | `db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087` |
| `payment-cjm/launch-route.private.py` | `b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892` |

Remote payload — полные captured bytes `apply-route.private.py`; его SHA совпадает с executor. Дополнительных подвижных private imports нет. Каноническая копия авторского07 находится в `07_code_changes/change_manifest.md`; фактический terminal capture — `07_code_changes/root-source-binding.json`. Hashes rolling event/execution из первоначального авторского manifest относятся к моменту до окончания CLI; завершённые bytes записаны отдельно, исходный manifest не переписан.

Эта запись заполняет заранее запланированную привязку E/TASK-4. Требования, алгоритмы, scope WRITE2/READ-ONLY3 и нормативные OpenSpec/ADR/05 не меняются; новое разрешение не выдаётся. Actual independent code/private-source review, native QE, runtime identity/control/inventory/health и root GO ещё обязательны. Code QE проверяет именно эти bytes, а не один hash либо авторское CODE_READY.


## Фактическая перепривязка после code repair R2 (root)

Исходный native code QE завершился unresolved12/rounds1; исходные findings/history сохранены. Автор исправил существующие contracts, не меняя требования/ADR/05/OpenSpec. Текущий executor596 строк и его payload связаны таблицей выше; launcher не изменён. Тестовый файл теперь отделяет portable checks от обязательного explicit operational profile: private fixture SHA `e88d7e58308ff7eb6cd272c84279773eb34f0af4d6d3adf1bd45090b1b15bd7e` закреплён в measured testfile. Собственный output выбирается профилем; отсутствующий/неверный profile обязан завершаться FAIL. Это не новое runtime env приложения. Авторские24 operational и58 portable/related PASS и12 RED→GREEN — измеренная подготовка, ещё не independent closure/runtime GO. Текущие terminal bindings/command results записаны в07/root-source-binding.json; ранний binding сохранён вhistory/code-qe-r1/07. Scope WRITE2/READONLY3 неизменен.

## Фактическая перепривязка code repair R3 (root)

Native R2 evaluate действительно вернул unresolved2/rounds2: QE-PRIMARY-01 и новое QESEC-R2-01. R2 собственные отчёты и оба снимка host/review сохранены; это последний обычный repair в существующем ceiling3, без reset/prepare. R3 добавляет ровно три строки в существующую revalidate: отзыв process-local receipt до fallible проверок и финальные inode/hash проверки после H/control. Требования, ADR/05/OpenSpec, fragment и три READ-ONLY owner не менялись. Старый06 сохранён в history/pre-r3-executor-binding.

Текущие actual source/payload и launcher SHA приведены в таблице выше. Base private fixture прежний `e88d7e58308ff7eb6cd272c84279773eb34f0af4d6d3adf1bd45090b1b15bd7e`; R3 regression extension `0e4980e501b388ea274e120ecc5656b8fd20de0289c2e4b5b174bd0d48b44e1e`, composite captured program `da884857c82d6627b279882a26ee8f4e349db8d466ae0baa7bdd8ab8cad8ede1`, pinned measured test `8463703701e53efbfe17a534cff4ef91d543a44291f38aa31cf05c70e21bb0a5`. Авторские9 окончательных команд exit0:30 operational,58 portable/related,7 invalid profiles отказали,13 mutants RED. Это собственные raw author executions, не originating closure или actual Caddy/оплата. Корневой07/root-source-binding.json связывает финальные bytes/receipts; все внешние adapters в offline fixtures SIMULATED. Независимые проверки R3 и runtime GO ещё обязательны. WRITE2/READONLY3 сохранены, новых application names/targets/requirements нет.

## Кандидат дополнительного цикла: согласование ещё отсутствует

Genuine native R3 evaluate exit1: unresolved QE-PRIMARY-01/QESEC-R2-01, rounds3, sequence7, eventDigest `d030de03c1d68eeeee2db52723ff3d57722415e9bf387c341e4220c23db685d5`. Единственная code-строка кандидата — `CONFIRMED.clear()` первым действием operate, до lookup/lstat/lock/open/read. Raw marker, backup и business history не переписываются; консервативно снимается только локальный process receipt. Другие captured namespaces/parent after fork не затронуты. Это source/test proposal, не четвёртый review, не runtime и не closure HIGH.

Текущий executor/payload SHA в таблице выше — candidate. Proposed measured test `4292d6eb2e5fd726ddb999f0e40a0b542d76503b1e998f30b7ce092682bcee16`; прежний base fixture `e88d7e58308ff7eb6cd272c84279773eb34f0af4d6d3adf1bd45090b1b15bd7e`, complete composite program `377873df7e248088ff910e413e05806f46a9f931a1e660e37577a918f47fbc98`, дополнительный entry-regressions `f219d5b6984bf01ea2a3efa6d86c94a91300d4def846eaadaa32b1c5030f26eb`. Авторский terminal result:8 old RED,10 targeted GREEN,40 operational/2 portable PASS,14 mutants RED,10 legacy positive groups. Все внешние adapters SIMULATED. Root проверил фактические bytes/raw; independent review4 НЕ запускался. Normative01/ADR/03.5/05/OpenSpec/fragment/3RO неизменны; targets WRITE2/READONLY3 прежние.

Перед любым дополнительным review нужен supported owner-bound begin-continuation на измеренную точную targetRevision. General autonomy, этот файл и K2/target admission не являются этим согласием. История журнала/nonce/reviewer conditions не сбрасывается. Все actual provider/session/payment/routeapply/Cloud/DNS действия остаются запрещены до соответствующего реального допуска.

EXPECTED_CODE_TARGETS:
- deploy/test-webhook-route.caddy
- tests/test-webhook-route.test.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/ip.ts
- packages/shared/src/config.ts


