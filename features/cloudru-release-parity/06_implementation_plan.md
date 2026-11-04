# План реализации тестового выпуска Cloud.ru

Inputs read: AGENTS.md, CLAUDE.md, docs/review-policy.md, docs/acceptance/core-cjm.md, 01_requirements.md, 03_adr/, 05_architecture.md, 06_implementation_plan.md.
00–05 этой feature, 07_progress.md и package.json. Инструменты: dz 0.8.58,
feature-adr 1.5.25, OpenSpec 1.15.0. История проверок — в 07_progress;
допуск текущего дизайна определяется фактическим review-convergence gate.

## Уточнение владельца: сохранить все существующие данные n5

03.11.2026 владелец явно выбрал «Сохранить все существующие данные n5».
Ограничение synthetic provenance заменено точным каноническим DB-whitelist и
приватной квитанцией сохранения по ADR-002. Это structural изменение допуска,
а не исправление формулировок. До изменения кода требуются новое prepare,
focused verification трёх исходных QCSD-ролей и действительный K2; прежний
closed snapshot сохраняется как история. Новых commands/modules/exports нет.

Минимальный repair в существующих controller/test/runbook: заменить внутренний
неопубликованный kind `legacy-synthetic` на `legacy-preserved`; переиспользовать
privateFile/stableJson/hashFile для проверки квитанции и точного scope.
Для initial legacy site все объекты требуют этот kind и approval до staging;
receiver подтверждает kind под lock до load. Для steady namespace — только prefixed.
Сохраняются canonical ownership, полный DB baseline/drift, source/destination SHA,
originalShaAfter, scans prefix+exact legacy keys, сохранность original и всех rows.
Утверждение synthetic provenance старых загрузок не создаётся.

## Goal state

Node 22 controller `/home/clipmkr`: Git archive → Docker build/save → SSH/load/Compose.
Цели только cloud-c (c.clipmkr.ru) и существующий site-test (n5); controller не target.
Одинаковые source/image set на обе цели, полный SHA/runtime IDs, сохранение всех
данных, точные bucket+prefix, совместимый A→B→A→B и полный CJM. Production/DNS
не переключаются. Дизайн owner-preservation прошёл три focused QCSD и actual
ideation evaluate: closed, revision ba9cf99c151cce2b7743e94b98e27f0c26d1be98b48080b749b3f5468b2e372f.
Перед кодом дополнительно обязательны K2 и current target/context admission.
Процент покрытия неизвестен; отдельный acid A<n> corpus не объявлен в 00.

SPARC: specification — FR/ADR; pseudocode — validate/prepare/apply/inspect/reconcile/
rollback; architecture — Release/Target/Receipt без новых продуктовых сущностей;
refinement — отрицательные tests/fault injection; completion — live receipts/QE.
Исторические prototype/build/failed-suite checkpoints не являются текущим live PASS.

## Tasks

### TASK-1 (FR-1, FR-5, FR-6, ADR-001): SSH-профили и источник

30–45 минут; без зависимостей; runner и tests/release-candidate.test.ts.
Переиспользовать loadCandidateProfile/validateReleaseManifest и import-safe CLI.
Private profile 0600/закрытый parent, explicit target/root/env/compose/origin,
раздельные app/DB/Redis projects, pinned containers/volumes/network и binding.dbName,
SSH alias/known_hosts/expiry, bucket+prefix. Нет local executor/localdevstage/
production/unknown/duplicate/missing targets; отказ до transport. Remote —
bash/python3/Docker/Compose, Node на Cloud не требуется. Argv/stdin без eval/env-output.
Один Git archive → отдельный release path на обеих целях, hash/inventory без overwrite
live source/env/data; disk admission TASK-4 до transfer, inspect только read-only.
Tests: rejects implicit production and unknown targets; rejects unsafe private target
profiles; uses SSH for cloud-c and site-test and rejects localdevstage. Готово:
неверная цель не достигает transport/mutations. TOOL compatibility patch — предпосылка,
новые имена отдельно проходят K1; ненужные exports не добавляются.

### TASK-2 (FR-1, FR-3, FR-9, ADR-001): immutable build и wiring

45–75 минут; TASK-1; runner, Dockerfile, health, check-env-wiring.mjs, wiring/release tests.
Чистый полный commit → Git archive без untracked/env → одна сборка web/worker.
Manifest: source SHA, OCI revision, image IDs, save tar SHA, полный sorted journal
имя+SHA. Не смешивать digest/ID/tar hash; на целях не пересобирать. Canonical source
inventory и manifest проверить до load. Health: immutable build SHA, no-store,
DB-aware 200/503; runtime override не меняет revision. Wiring классифицирует ровно
NEXT_PUBLIC_RELEASE_REVISION и цепь ARG RELEASE_REVISION → ENV → Next build;
unknown public/dynamic env и пропущенный runtime-required env остаются findings.
Tests: validates full release manifest and artifact identities; rejects substituted
source archives and stale labeled images; health exposes immutable build revision;
classifies release revision as build-time and still detects broken build and runtime wiring.
Готово: фактические targeted и полный suite/typecheck/lint/build проходят. Исторические
7 failures source 71e7812 и последние два timeout не скрываются правкой fixtures.

### TASK-3 (FR-4, FR-8, ADR-003): SDK namespace на настоящем S3

60–120 минут; TASK-1; существующие shared config/S3 client/web и stt/render adapters,
Compose/.env.example/fixtures/storage-prefix/wiring и legacy network tests.
Reuse loadS3Config/createS3Client/StorageClient без нового parser/service/dependency.
S3_KEY_PREFIX empty сохраняет production; test admission требует tests/cloud/ или
 tests/site/. Полный command/request/response contract — ADR-003: internal+signing
clients, exact Bucket, allowlist, wire Key/Prefix/KeyMarker, validated logical
response keys, непрозрачные cursors, retries без мутации/double-prefix. Все escapes/
unknown/bucket mutations до сети; GetBucketVersioning exact read — исключение.
Web/stt/render/fixtures явно передают prefix; worker-llm storage не получает.
Independent test-only pre-network fence и private pre-PUT key/upload journal обязательны.
Опасные negatives — только non-forwarding transport; guard отказ означает FAIL.
Live: общий Cloud.ru bucket, два prefixes, разные bytes одинаковых logical keys,
wire/signing/PUT/GET/multipart/list-pagination/retention/erasure и canary SHA/size.
Raw setup/cleanup — exact own keys в tests/site/<run>/, без root listing/bucket changes;
legacy upload/guest-pack/retention сохраняют PostgreSQL isolation и сценарии.
Tests: storage-prefix unit/integration, wires S3_KEY_PREFIX to web and storage workers,
blocks live test transport outside its independent run scope. Готово: реальные Cloud
операции без skips, known-key cleanup complete, empty-prefix compatibility. Широкие
права общего key сохраняются; IAM/new keys/policy/403 proof не заявляются.

### TASK-4 (FR-4, FR-5, FR-7, FR-8, ADR-002/003): admission данных и ресурсов

60–120 минут плюс ожидания; TASK-1/3, readonly подготовка раньше. Runner/release tests,
private receipts/runbook. Полностью исполнить FR-4/7/8 и ADR-002 Decision/Confirmation.
Сохранить все rows/связи и existing DB/Redis/volumes: Cloud 3 accounts/0 media/journal
26→28, site 5 accounts/4 videos/10 clips/6 payments/referrals/journal 28→28.
Source-bound backup/restore сверяет SHA, PG identity/version, полный journal и все
public tables/columns/count/hash с тем же snapshot; fresh live drift проверяется отдельно.
Чужой/corrupt/localstage backup не допускается. SQL DB/host из application DATABASE_URL,
не POSTGRES_DB default; pinned DB/Redis aliases/projects/volumes/network до SQL.
Main DB/ambiguous endpoints/mismatch — отказ; infra up/create запрещены.
Site: exact canonical DB-whitelist и owner preservation receipt по AM-19. Pending/unknown
multipart разрешить штатно под lock до namespace change; UploadId не переносить.
Streaming copy только whitelisted source → tests/site/<logical>, повтор лишь при
совпадении bytes, independent source/dest/original SHA, без overwrite/original deletion/
blanket scan. DB keys прежние. Copy legacy reads — отдельный operator step, не SDK proof.
Rollback empty-prefix без сверки новых объектов запрещён; сохранять namespace/roll-forward.
До transfer оценить действительные FS staging/Docker, source/image archives, incremental
unpack, temp extract, retained current/rollback layers и резерв. При недостатке или
неподтверждённой оценке BLOCKED, без global prune/чужих проектов. Media: RAM≥2ГиБ,
disk≥3×input+2ГиБ, finite limits, один job; бюджет 240 STT минут/4 LLM с quota_counter.
Два STT jobs не равны двум provider calls; retries платные, денежного hard cap нет.
Tests: rejects unverified backup isolation and schema drift; rejects insufficient
resources and exhausted budgets; preserves nonempty site data and rejects foreign copy
and pending multipart; rejects site identity drift and insufficient incremental image
archive space; accepts split app infra projects and rejects database URL binding mismatches.
Готово: валидный nonempty site принят, foreign/ownership/copy/pending/resource ошибки
блокируют mutations. Разработка contract предшествует live lock/copy TASK-5; циклической
зависимости нет. До verified copy новый namespace не стартует.

### TASK-5 (FR-1, FR-4, FR-6–8, ADR-001/002/003): apply/state/reconcile

60–90 минут; TASK-2/3/4 и gates. Существующий runner и ops/cloudru/compose.images.yml;
не вызывать managed-vm bootstrap. Effective Compose: exact images/prefix/storage key,
раздельная infra, без env-output. Local+remote single-writer lock, durable private intent
до передачи/mutations; exact operation/source/topology/config/data/archive bindings,
atomic temp+rename/fsync и шаги. Чужой lock не снимать по PID/возрасту. При захвате
lock и после stop перепроверять drift/bytes/multipart; initial/steady kinds до load.
Load только проверенные IDs; stop/start перечисленных четырёх app services, --no-deps,
без build/infra creation. Migrator с verified DATABASE_URL DB, Cloud только026/027,
site28 no-op. Проверить все web/worker runtime IDs/StartedAt, HTTP health и DB/Redis.
Unknown после transport разрыва требует reconcile под lock; terminal повтор идемпотентен,
partial receipts сохраняются, общий exit0 только после двух успехов. SSH host/expiry
проверяются, доступ не продлевается автоматически. Retry после неизвестного исхода запрещён.
Rollback app-only: одинаковые полные journals и namespace/config, без DB/volume restore;
новые данные входят в baseline. Tests: reconciles unknown remote outcomes before retry;
serializes concurrent target writers; rejects rollback with different full schema journal;
rejects rollback to an incompatible storage namespace; fails aggregate delivery when either
target is missing or fails; initial legacy/prefixed bypass и terminal recovery по AM-19.
Готово: собственные исполняемые fault checks и настоящий SSH; fake/prototype не live proof.

### TASK-6 (FR-1, FR-3, FR-4, FR-6–8, ADR-001/002/003): discrimination и A/B

45–90 минут без ожиданий; TASK-5. Release unit/acid исполняют реальные границы executor
с controlled doubles, инъекциями пропуска source/copy/namespace/isolation и corruption;
изменение одного safeguard должно делать соответствующий тест красным.
Реально выполнить A→B→A→B на обеих целях после schema28: восемь receipts с full SHA,
source hash, OCI revision, IDs каждого web/worker, StartedAt и HTTP version; B содержит
видимую кодовую правку. Все прежние и новые rows/media сверены после rollback/repeat.
Негативные missing target/stale runtime/partial apply/archive corruption/wrong journal
ненулевые. OOM/137/OOMKilled и ENOSPC доказать в disposable network-none workers без
production mounts; остальные container IDs/StartedAt/restarts неизменны. Это отдельный
resource proof, не доказательство автоматического runner recovery или media workload.
Tests: detects omitted target and substituted runtime image; detects skipped isolation
backup and schema checks; records every runtime identity through A B A B; confines real
OOM and ENOSPC to disposable test workers. Готово: live receipts; unavailable — BLOCKED.

### TASK-7 (FR-2, FR-5, FR-7–9, ADR-002/003): Cloud CJM и независимое QE

TASK-2–6 и конкретное TEST shop окно. Reuse core-CJM/browser/provider tests, release/acid,
runbook/OpenSpec/07_progress и private receipts; новый frontend/payment backend не нужен.
CJM-01–12: три owner/blogger/client contexts; точные5400/7200с и >5400 отказ до STT;
индивидуальный2–1440/сброс/роль; прерывание/продолжение без двойного списания; transcript/
select/render; Chromium Play/time/decoded frames; MP4 download/ffprobe/hash; referral,
обе статистики и изоляция. Длинные jobs только Cloud, последовательно, ≤2 STT jobs/
240 минут/4 LLM calls; site проверяет сохранённые media без нового платного STT.
SDK proof и Cloud inside-tests compatibility обязательны, IAM/403 proof не требуется.
TEST shop: согласованы начало/конец/UI-оператор; freeze обоих checkout, drain старых
intents, сохранить n5 callback/events; UI switch → c.clipmkr.ru/api/webhooks/yookassa;
native checkout/callback/provider lookup/один grant/paid rights/relogin, cancel/replay/
foreign shop-mode-IP-intent, referral revenue; завершить Cloud intents, UI вернуть n5
callback и проверить delivery, открыть только site checkout. Unknown — freeze/pending
и согласованное разрешение, не молчаливое закрытие. Shop Basic auth API не управляет
notifications; real charges off; fan-out/симуляция/polling не native proof.
Окно/drain/UI switch/return — обязательная операторская E2E-приёмка с private receipts;
кодовый gate TASK-8 проверяется отдельно и сам по себе не закрывает payment/полный CJM.
Кодируют gpt-6.1-terra и gpt-6-sol; проверяют gpt-6-astra и gpt-6.1-sol, которые не писали
проверяемый код, в независимых сессиях: сначала только requirements/ADR/architecture/plan, затем
самостоятельное нахождение реализации. История/выводы автора не стартовый контекст.
Фактические model/session IDs обязательны. Full suite/typecheck/lint/workspace builds,
storage/provider/browser regressions, extended reference QE, code/spec anti-drift и
OpenSpec — реальные conjunctive gates. Fix перепроверяет другая модель. Commit/push root.

### TASK-8 (FR-5, ADR-002): checkout freeze

До native окна; существующие WebConfig/environment/BillingDependencies/handler,
Compose/.env.example/fixtures. N5_CHECKOUT_ENABLED default true, строгий boolean.
False сохраняет rate/origin/auth и даёт503 до body/createIntent/provider create;
GET/status/webhook продолжают обработку старых intents. Не отключать provider.
Test pauses checkout creation while webhook and status remain live в
 tests/payments-guards.test.ts; billing integration и live503/нулевые новые intents/
provider calls в обоих направлениях. Готово: кодовый gate и separate window proof TASK-7.

### TASK-9 (FR-2, ADR-002): месячный оракул

Существующие report/policy; tests/blogger-report.integration.test.ts. Все точные
January/R1/R2/647000коп. ожидания, null/20/30, paid_at boundaries, immutable source
snapshot/distinct payer/refund149000 — из CJM-12 требований. Test matches monthly
per-link totals rates exclusions and immutable attribution. PG fixture не выдаётся за
native платёж: live Cloud обе роли сверяют actual current-month receipts независимой
целочисленной арифметикой, без дополнительного STT.

## Dependency order

TASK-1 → {TASK-2, TASK-3}; TASK-1 + TASK-3 → TASK-4; TASK-2 + TASK-3 + TASK-4 → TASK-5 → TASK-6 → TASK-7. Read-only binding/baseline/window подготовка может идти раньше, mutation admission/lock обязательны. Внешние disk/window не заменяются unit tasks; новых key/policy approval зависимостей нет. DAG без циклов. Оценки не включают ожидание зависимостей/полные прогоны/длинные jobs; прежние 3–5 часов из 00 не обещают ресурс/срок. Targets ниже: 18 app/ops/test paths плюс будущий docs runbook, TOOL compatibility остаётся предпосылкой без новых правок.

## Parallel groups

Группа 1 TASK-1; группа 2 TASK-2/3 и read-only подготовка TASK-4 логически независимы, общий wiring-файл правится последовательно; группа 3 TASK-4/5; группа 4 TASK-6/7 последовательно по admission. Этот DOCS planner исполняет последовательно без агентов; логические группы не являются разрешением на запуск дополнительных агентов.

## Checkpoints

CP0: design-ready → root prepare → три actual focused QCSD quality/risk/testability по новым inputs → действительный Step-6 checkpoint, K1 storage-prefix/новые exports и K2 tier L --require-requirements. До этого plan unapproved; форматная K2 не coding permission. Не изменять .fa-state/review JSON для получения PASS.

CP1 (TASK-1/2/3): two-SSH/profile/source guards, точная build/runtime env классификация, prefix unit+real S3, все 7 full-suite failures реально устранены; full suite/typecheck/lint и archive web/worker builds с HTTP health immutable/no-store/503 проверены. При отсутствии среды/skip — BLOCKED, не baseline PASS.

CP2 (TASK-4): новый root site binding 5/28 matched test.dump + drift/all-data reconciliation, split application/infra projects/pinned container/volume/network и DATABASE_URL database/host proof. DB-whitelist/size/SHA/original preservation/pending multipart resolution под lock; SDK S3 wire proof, exact bucket+prefix consumers, Cloud canary только inside tests; SSH/реальный incremental image/archive disk admission. Общий production-wide key — owner exception, IAM/new key/policy/403 не gate. Профильный boolean не evidence; до code/data/resource допуска writers/apply blocked.

CP3 (TASK-5/6): интегрированный remote executor через настоящий SSH на обеих целях; partial/disconnect/concurrency/schema+namespace rollback guards, acid injection. OOM/ENOSPC раньше реально локализованы на Cloud disposable containers, это история; новый runner recovery ими не доказан. Повторять реальные faults только если изменения/недостаток доказательства это требуют, без production mounts/network.

CP4: все восемь фаз A→B→A→B на cloud-c/site-test с полным SHA/source hash/OCI/runtime IDs каждого web/worker/HTTP health, сохранением ВСЕХ прежних и новых data и исходных объектов. CP5: конкретно согласованное TEST shop окно/drain/UI switch/native/replay/credits/referrals/drain/return; CJM matrix, расширенный QE, anti-drift и fresh cross-model review. Полный PASS только без blocked/failed строк. Private receipts: UTC/command exit/source binding/artifacts; Git только индекс без PII/secrets/signed URLs.

## Risk assessment

Ключевые риски и safeguards: provenance/immutable version — TASK-2/6; scope/signing/
response escape — TASK-3/4; wrong DB/infra/network — TASK-1/4/5; loss/foreign media/
pending multipart — TASK-4/5/6; SSH/unknown/concurrency — TASK-5; resource/budget/false
PASS — TASK-4/6; callback/pending intents — TASK-7/8. При отказе freeze только test copy,
сохранить state и reconcile/roll-forward, без blind restore/main changes. Общий S3 key
остаётся production-wide, SDK не является IAM защитой. SSH временный, исходная expiry
04.11 около15:01 UTC проверяется перед каждой операцией; автоматически не продлевается.
Незавершённые live gates перечислены в07_progress, временные оценки не гарантия срока.

## Amendments

AM-1 (QQ-01, RISK-01, QT-01, прежний снимок): прежний IAM scope design отменён явным owner exception; superseded by AM-8.
AM-2 (QQ-02, QT-06, прежний снимок): отдельный shop/старые scope proof требования заменены согласуемым окном нынешнего TEST shop; superseded by AM-11.
AM-3 (QQ-03, RISK-03, REL-05): lock/state/unknown/reconcile предшествуют retry. Confirmation: повтор после обрыва запрещён до сверки → test `reconciles unknown remote outcomes before retry` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-4 (QQ-04, QT-05, RES-01/02): ресурсные faults только disposable worker с evidence остальных контейнеров. Confirmation: реальный fault локализован → test `confines real OOM and ENOSPC to disposable test workers` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-5 (QT-02, REL-03): runtime IDs каждого сервиса в каждой фазе и сохранность данных. Confirmation: пропущенная фаза/ID отклоняется → test `records every runtime identity through A B A B` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-6 (QT-03, REL-02/04): archive/build/runtime цепочка вместо доверия label. Confirmation: stale label и подмена archive обнаружены → test `rejects substituted source archives and stale labeled images` in `tests/release-candidate.test.ts` (fails if reverted).
AM-7 (QT-04, RISK-02, DATA-01–04): snapshot restore baseline и полный journal, без слепого restore. Confirmation: несовместимый rollback отвергается → test `rejects rollback with different full schema journal` in `tests/release-candidate-acid.test.ts` (fails if reverted).

AM-8 (последнее явное решение владельца, ADR-003): нынешний общий key сохраняет production-права, только SDK namespace, без новых SA/key/policy/IAM proof/provider403. Confirmation: physical prefix всего object/list/signing/multipart/retention трафика, outside canary прежний → test `isolates two namespaces on real S3 and preserves outside canary bytes` in `tests/storage-prefix.integration.test.ts` (fails if reverted).
AM-9 (владелец, FR-1): cloud-c/site-test только через SSH, controller localdevstage исключён. Confirmation: правильные две цели используют SSH, прежняя local цель отвергнута → test `uses SSH for cloud-c and site-test and rejects localdevstage` in `tests/release-candidate.test.ts` (fails if reverted).
AM-10 (владелец, FR-4/ADR-002): непустой site сохраняет все 5 accounts/4 videos/10 clips/6 payments/referrals, copy только whitelist с size/SHA, originals и logical DB keys прежние; pending uploads разрешены до смены namespace. Confirmation: чужая ссылка/copy mismatch/pending блокируют apply → test `preserves nonempty site data and rejects foreign copy and pending multipart` in `tests/release-candidate.test.ts` (fails if reverted).
AM-11 (владелец, FR-5): superseded by AM-20. Требование согласованного TEST shop окна сохранено; несуществующий CLI переключения callback и вымышленный unit test не являются способом операторской приёмки.
AM-12 (inventory, FR-7): site 3,6 ГБ/97%, фактический incremental image/archive admission, без global prune/удаления rollback images. Confirmation: дефицит или чужой site source отклоняются → test `rejects site identity drift and insufficient incremental image archive space` in `tests/release-disk-admission.test.ts` (fails if reverted).
AM-13 (реальный full-suite source 71e7812, FR-9): точная build-time release var классификация, runtime/build wiring guard сохранён, 7 failures не скрываются. Confirmation: broken binding/unknown public var/runtime omission находят ошибки → test `classifies release revision as build-time and still detects broken build and runtime wiring` in `tests/wiring.test.ts` (fails if reverted).
AM-14 (actual Docker labels/root, FR-4): app/infra projects отдельные, pinned containers/volumes/networks, SQL DB из application DATABASE_URL = binding.dbName и host → test DB, не POSTGRES_DB default/main. Confirmation: valid split topology проходит, любой binding mismatch до SQL отказывает → test `accepts split app infra projects and rejects database URL binding mismatches` in `tests/release-candidate.test.ts` (fails if reverted).
AM-15 (import graph/wiring, FR-8): optional S3_KEY_PREFIX явно проходит web/stt/render adapters и fixtures, worker-llm не получает storage key. Confirmation: пропущенное поле adapter/Compose обнаруживается → test `wires S3_KEY_PREFIX to web and storage workers` in `tests/wiring.test.ts` (fails if reverted).

Все перечисленные новые test titles — обязательные будущие имена для coder, пока не доказательство существования/прохождения. TOOL тест уже существует; его успех не переносится на runner.

AM-16 (QQ-02/RISK-02): checkout freeze обоих test-контуров предшествует drain и callback switch, provider/webhook остаётся live. Confirmation: новые/повторные creation не проходят, старый callback/status работает → test `pauses checkout creation while webhook and status remain live` in `tests/payments-guards.test.ts` (fails if reverted).
AM-17 (QT-07): January/R1/R2 суммы, null/20/30, distinct payer, исключения и snapshot проверяются независимым оракулом. Confirmation: неверная месячная/посылочная оценка ломает ожидания → test `matches monthly per-link totals rates exclusions and immutable attribution` in `tests/blogger-report.integration.test.ts` (fails if reverted).


AM-18 (QQ-05/RISK-04): независимый test-only physical-scope fence до реальной сети,
включая signed fetch и raw fixture. Confirmation: снятая SDK middleware не даёт
отправить непредписанный request → test `blocks live test transport outside its independent run scope`
in `tests/storage-prefix.test.ts` (fails if reverted). Единый liveS3Environment
в существующем fixtures/environment.ts, без нового app service.

AM-19 (явное решение владельца 03.11.2026, FR-4/ADR-002): сохранить все существующие
site-test uploads, включая реальные, по exact DB-whitelist и bound preservation
receipt. Confirmation: → test `preserves owner-approved legacy media and rejects unbound preservation evidence` in `tests/release-candidate.test.ts`
проверяет положительный непустой legacy-допуск
и отказ при отсутствии/подмене approval/hash/target/project/sourceIdentity/bucket/
prefix/whitelist/evidence reference/original SHA. Initial legacy нельзя выдать за
prefixed; steady namespace не читает originals. Проверки receiver входят в
`tests/release-candidate-acid.test.ts`. Подмена kind или расширение scope обязаны
сделать проверки красными; наличие будущего test title не означает PASS.

AM-20 (уточнение способа проверки AM-11, FR-5/ADR-002): автоматический кодовый
safeguard — checkout freeze при живых webhook/status; подтверждение окна, drain,
ручного callback switch, native/replay/credits/referrals и возврата — отдельный
обязательный live gate TASK-7. Confirmation: → test `pauses checkout creation while webhook and status remain live` in `tests/payments-guards.test.ts` (fails if reverted).
Успех этого теста НЕ закрывает операторскую приёмку: без всех фактических window/
UI/drain/native/return receipts payment и полный CJM остаются BLOCKED. Платёжные
требования не отменяются, автоматизации provider notifications API не добавляется.

AM-21 (QE-P10, FR-9): штатный acceptance image и Compose должны предоставлять
Git/Python и остальные реально используемые тестами инструменты, доступный
канонический Git checkout и readonly resource proof. Отсутствующие обязательные
входы дают явный отказ, не skip; отдельная частная среда интегратора не заменяет
штатный путь. Confirmation: → test `runs acceptance with Git metadata and mandatory resource proof`
in `tests/wiring.test.ts` проверяет положительную проводку и отказ при потере
обязательных входов. Итог проверяется настоящим test image с полным suite.
Lint выявил 761 строку в controller test: helpers выносятся в
`tests/fixtures/release-candidate-fixture.ts` с единственным новым export
`releaseCandidateFixture`; disk cases — в `tests/release-disk-admission.test.ts`.
Смысл тестов сохраняется, лимит 500 строк и проверки не ослабляются. Новые имена
требуют настоящего K1; релевантные `.dockerignore` и test runner входят в snapshot.

## Поправка владельца: настоящие S3 проверки

MinIO не используется в дальнейших network tests. TASK-3/CP1/CP2 работают с
закрытым HTTPS Cloud.ru профилем, нынешним общим bucket/key, только tests/cloud/
и tests/site/; уникальные run IDs и точные fixture keys/upload IDs для cleanup.
Create/DeleteBucket, root listing и изменение bucket metadata запрещены.
GetBucketVersioning read разрешён; synthetic outside-cloud canary — tests/site/.
Legacy upload/guest-pack/retention integration сохраняют сценарии и PostgreSQL
isolation, но переиспользуют createS3Client с уникальным tests/cloud/<run>/ и
explicit real-S3 opt-in. Общий fixture helper liveS3Environment в уже существующем
tests/fixtures/environment.ts даёт минимальный reuse без нового сервиса. RI-001 не утверждает отсутствие lifecycle общего bucket.
Fake HTTP unit не выдаётся за live proof. Расширение code targets ниже относится
к необходимой адаптации этих трёх сетевых integration tests.

## Привязка существенных неизменённых зависимостей к QE

Первое независимое ревью выявило недостаточную полноту measured scope (QEP-07).
Следующие файлы объявлены targets для проверки неизменности и семантических
зависимостей; само объявление не разрешает менять их поведение и не означает,
что они были измерены в исходном QE snapshot. Исходные findings и история
первого цикла сохраняются. Новый snapshot создаётся штатным begin-repair после
фактических исправлений с обеими originating reviewer roles.

EXPECTED_CODE_TARGETS:
- tests/test-db.test.ts
- docs/features/cloudru-provider-foundation/05_completion.md
- .dockerignore
- scripts/test.mjs
- scripts/test-skip-reporter.ts
- tests/fixtures/release-candidate-fixture.ts
- tests/release-disk-admission.test.ts
- docs/REPRODUCE.md
- scripts/release-candidate.mjs
- Dockerfile
- apps/web/src/app/health/route.ts
- ops/cloudru/compose.images.yml
- tests/release-candidate.test.ts
- tests/release-candidate-acid.test.ts
- packages/shared/src/config.ts
- packages/s3/src/client.ts
- apps/web/src/server/environment.ts
- apps/worker/workers/stt.ts
- apps/worker/workers/render.ts
- docker-compose.yml
- .env.example
- tests/fixtures/environment.ts
- tests/storage-prefix.test.ts
- tests/storage-prefix.integration.test.ts
- scripts/check-env-wiring.mjs
- tests/wiring.test.ts
- docs/runbooks/release-candidate.md
- apps/web/src/server/billing-runtime.ts
- apps/web/src/server/billing-handler.ts
- tests/payments-guards.test.ts
- tests/billing.integration.test.ts
- tests/blogger-report.integration.test.ts
- tests/upload.integration.test.ts
- tests/guest-pack.integration.test.ts
- tests/retention.integration.test.ts
- packages/s3/src/operations.ts
- packages/s3/src/multipart.ts
- packages/s3/src/presign.ts
- packages/s3/src/erasure.ts
- packages/db/src/migrate.ts
- packages/db/src/quota.ts
- packages/db/src/transcription.ts
- packages/db/src/selection.ts
- packages/db/src/blogger-report.ts
- apps/worker/src/runtime.ts
- apps/worker/src/workers/stt.ts
- apps/worker/src/media/download.ts
- apps/web/src/server/billing-deps.ts
- apps/web/src/server/video.ts
- apps/web/src/server/partner.ts
- packages/db/src/index.ts
- packages/db/migrations/001_init.sql
- packages/db/migrations/002_growth_event_prefix.sql
- packages/db/migrations/003_ipv6_legacy_cleanup.sql
- packages/db/migrations/003_upload.sql
- packages/db/migrations/004_ipv6_prefix_masklen.sql
- packages/db/migrations/005_queue_probe.sql
- packages/db/migrations/006_transcription.sql
- packages/db/migrations/007_selection.sql
- packages/db/migrations/008_render.sql
- packages/db/migrations/009_short_link.sql
- packages/db/migrations/010_guest_pack.sql
- packages/db/migrations/011_partner.sql
- packages/db/migrations/012_retention.sql
- packages/db/migrations/013_watermark_geometry.sql
- packages/db/migrations/014_music.sql
- packages/db/migrations/015_teaser.sql
- packages/db/migrations/016_partner_fairness.sql
- packages/db/migrations/017_compaction.sql
- packages/db/migrations/018_clip_music.sql
- packages/db/migrations/019_music_skip_reason.sql
- packages/db/migrations/020_clip_cta.sql
- packages/db/migrations/021_payments.sql
- packages/db/migrations/022_credit_packages.sql
- packages/db/migrations/023_support_access.sql
- packages/db/migrations/024_partner_landing_dedup.sql
- packages/db/migrations/025_owner_unlimited.sql
- packages/db/migrations/026_blogger_policy.sql
- packages/db/migrations/027_payment_referral_snapshot.sql
- AGENTS.md
- CLAUDE.md
- docs/acceptance/core-cjm.md
- docs/review-policy.md
- package.json
- package-lock.json
- tests/health.test.ts
