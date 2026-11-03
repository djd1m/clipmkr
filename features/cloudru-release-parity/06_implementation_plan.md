# План реализации тестового выпуска Cloud.ru

Inputs read: AGENTS.md, CLAUDE.md, docs/review-policy.md, docs/acceptance/core-cjm.md; 00_complexity_assessment.md, 01_requirements.md, 02_research.md, 03_adr/001-release-manifest.md, 03_adr/002-isolated-cloud-candidate.md, 03_adr/003-same-bucket-prefix.md, 04_domain_model.md, 05_architecture.md, 07_progress.md; package.json pins harness-cli 0.8.58 / skills-feature-adr 1.5.25; из node_modules/@dzhechkov/skills-feature-adr/templates/.claude/skills/feature-adr/ прочитаны modules/06-implementation-plan.md и references/agentic-qe/code-goal-planner.md. Предыдущие QCSD-отчёты не являются evidence новой ревизии.

## Goal state

Статус: design-ready для root prepare + трёх actual focused QCSD, revision pending; план НЕ approved до них. Исторический ideationclosed revision `c1cb6d4e9fd23bf3ab2315c7dd0de3b04da7909379740ec5d80d9e2a6d3842d6`, nonce `e9449a2e-0b4f-463b-b686-e7a15eb7134a` относится только к старому снимку. Его state/review JSON не переписываются и не доказывают новую ревизию. K1 новых имён namespace/exports перед coding выполняет root; K2 проверяет формат/полноту, не заменяет QCSD. Процент покрытия неизвестен; таблицы acid A<n> в 00 нет, corpus не выдумывается.

Цель: небольшой `scripts/release-candidate.mjs`, Node 22 controller в `/home/clipmkr`: Git archive → Docker build/save → SSH/load/Compose. Только две SSH-цели `cloud-c` (c.clipmkr.ru) и `site-test` (существующий n5 test на сервере сайта/разработки). Controller физически отдельно по inventory; его localdevstage исключён, новый dev-контур не создаётся. Production clipmkr.ru/main containers/DNS не переключаются. Один image set на две цели, проверенные SHA/runtime IDs, сохранение ВСЕХ данных, namespace bucket+prefix, совместимый A→B→A→B и полный CJM после внешних допусков.

Текущий state по сведениям root: controller prepare/validate/read-only inspect/source-sync, Node 22 checkpoint 10/10 и typecheck 0. Apply/reconcile/rollback blocked. Prototype `/tmp` не интегрирован; fake 14+4 не live proof. Source 71e7812: настоящие web/worker build и health 200/no-store/immutable override-safe, но full suite 7 failures в 3 файлах из-за build-time env. Goal state требует исправить их и повторить полный suite; baseline full PASS не заявляется. В этой planner-сессии код, infra/env/credentials, state JSON и commits не изменяются.

SPARC: specification — FR/ADR и QCSD; pseudocode — validate/prepare/apply/inspect/reconcile/rollback; architecture — Release/Target/Receipt без продуктовых сущностей; refinement — отрицательные tests и fault injection; completion — реальные receipts и независимое QE.

## Tasks

### TASK-1 (FR-1, FR-5, FR-6, ADR-001): явные SSH-профили и source flow

Фаза specification/refinement; оценка 30–45 минут, без зависимостей. Files: runner и `tests/release-candidate.test.ts`. Уже существующие TOOL patch/installer/`tests/feature-adr-paths.test.mjs` — неизменяемая предпосылка, прежний K1 не переносится на новые имена. Root реально проверяет storage-prefix/новые exports перед coding. Новых публичных exports без необходимости не добавлять.

Переиспользовать `loadCandidateProfile`, `validateReleaseManifest`, import-safe CLI. Приватный profile mode 0600/закрытый parent задаёт applicationProject, databaseProject/redisProject отдельно, exact root/env/compose paths, pinned container/volume/network identities, binding.dbName, origin, SSH alias/known_hosts/expiry и namespace. Фактический site app project отличается от старого test infra project DB/Redis; не сводить их в один и не bootstrap DB/Redis. Только cloud-c/site-test через SSH; local executor/localdevstage/production/unknown/duplicate/missing targets отвергаются до transport. Remote contract bash+python3/Docker/Compose, Node на Cloud не требуется; на site проверить доступность. Argv/stdin без eval/env-output. Source-sync одного Git archive на обе цели в отдельный release path с checksum/inventory, без записи поверх live source/env/data. Перед transfer disk admission TASK-4; read-only inspect не пишет на цели.

Test: `rejects implicit production and unknown targets`, `rejects unsafe private target profiles`, `uses SSH for cloud-c and site-test and rejects localdevstage`. Готово: неверные профили/цель отказывают до transport/mutations, обе согласованные цели проходят одну и ту же SSH-проверку; риск неверного физического хоста закрывается sourceIdentity.

### TASK-2 (FR-1, FR-3, FR-9, ADR-001): immutable источник, health и wiring regression

Фаза architecture/refinement; 45–75 минут; зависит TASK-1. Files: runner, Dockerfile, health route, `scripts/check-env-wiring.mjs`, `tests/wiring.test.ts`, release test/acid. Полный commit/чистый checkout → Git archive без untracked/env → единственная сборка web/worker. Manifest: full SHA, source SHA-256, OCI revision, image IDs, save tar hash и полный упорядоченный schema journal (имена+hashes, не count). Образы не пересобирать на целях, RepoDigest/image ID/tar hash не смешивать. Обе цели получают source tar с checksum и каноническим inventory извлечённых файлов до apply. Manifest строго валидируется до Docker load.

Сохранить доказанное Dockerfile/health поведение: immutable full SHA при Next build и OCI labels, DB probe, no-store, 200/503; runtime env не подделывает build version. В check-env-wiring классифицировать ровно NEXT_PUBLIC_RELEASE_REVISION как build-time web value и проверить цепочку ARG RELEASE_REVISION → ENV → Next build в Dockerfile. Нельзя удалить guard, исключить все NEXT_PUBLIC_* или потребовать build var в runtime Compose. Regression `classifies release revision as build-time and still detects broken build and runtime wiring` в `tests/wiring.test.ts`: рабочая build binding без runtime var проходит; неверная/отсутствующая binding, другая неизвестная NEXT_PUBLIC_* и пропущенный runtime-required env дают finding; динамический env остаётся ошибкой. Обработать настоящий источник 7 failures, не спрятать их правкой fixtures под runtime SHA.

Test: прежние `rejects substituted source archives and stale labeled images`, `health exposes immutable build revision`, `validates full release manifest and artifact identities` плюс wiring regression. Готово: wiring guard сохранён, семь failures устранены фактическим повтором трёх затронутых файлов и полного suite; пересобранный health сохраняет immutable/no-store/DB-error контракт. Правка B — отдельный commit/реальный HTTP ответ, forged label не заменяет image ID. Имена трёх файлов root уточняет по исходному full-suite log, planner их не выдумывает.

### TASK-3 (FR-4, FR-8, ADR-003): SDK namespace и реальная S3 интеграция

Фаза architecture/refinement; 60–120 минут; зависит TASK-1 (имена/K1), реализация отдельна от TASK-2. Files: `packages/shared/src/config.ts`, `packages/s3/src/client.ts`, web environment adapter, workers/stt.ts и render.ts, Compose, `.env.example`, `tests/fixtures/environment.ts`, `tests/storage-prefix.test.ts`, `tests/storage-prefix.integration.test.ts`, `tests/wiring.test.ts`. Общий parser loadS3Config исполняет роль sharedS3Config; нового parser/service/зависимостей не создавать. S3_KEY_PREFIX валидируется, empty default сохраняет production; exact tests/cloud/ и tests/site/ обязателен для test admission. Fixtures явно задают empty для прежних тестов, новая интеграция задаёт каждый nonempty prefix.

Одна AWS SDK middleware-граница в StorageClient на internal/signing clients: exact Bucket, command allowlist и request/response таблица ADR-003. Key/Prefix/KeyMarker в wire, response Key/NextKeyMarker/collection prefixes обратно в logical после namespace validation; opaque markers прежние. Path escapes/encoded path/unknown commands/bucket mutations до сети, GetBucketVersioning exact bucket read разрешён. Command не мутировать/не удваивать prefix при retries/signing. Erasure/retention/multipart и DB keys logical. По проверенному import graph stt.ts/render.ts → startWorker/runtime.ts → role !== worker-llm → loadS3Config/createS3Client; explicit adapters обязаны передать prefix. Worker-llm storage не создаёт, ключ/prefix ему не добавлять. Web readEnvironment и fixtures тоже явные поля даже optional variable; wiring guard это проверяет.

Test: `scopes every supported SDK command and public signature and rejects escapes` и `keeps empty prefix compatible and rejects foreign response keys` в unit; `isolates two namespaces on real S3 and preserves outside canary bytes` в integration; `wires S3_KEY_PREFIX to web and storage workers` в wiring. Реальный middleware pipeline, не mock send. Настоящий Cloud.ru S3: существующий bucket/два prefixes/одинаковые logical keys/разные bytes, outside-cloud synthetic canary в tests/site/<уникальный-run>/ size/SHA/key-set до/после. Capture ВСЕХ wire requests: physical prefix object operations/signing/list/multipart/retention; zero network для unsafe/unknown/bucket mutations. GetBucketVersioning read — явное bucket-level исключение. Presigned PUT/GET, multipart complete/list/abort и erasure/retention реальны; pagination unit + live доступный сценарий. Raw fixture client только exact-key setup/teardown внутри tests/site/<уникальный-run>/, его обращения отделены от SDK proof. Готово: contract/empty compatibility, настоящий S3 без skips; Cloud canary TASK-4 только inside tests, никакого IAM/403 proof. Общий key production-wide по owner exception, при обходе SDK сохраняется доступ ко всему production.

### TASK-4 (FR-4, FR-5, FR-7, FR-8, ADR-002, ADR-003): data/isolation/resource admission

Фаза refinement; 60–120 минут плюс внешние ожидания; зависит TASK-1/3 для namespace, read-only inventory можно раньше. Files: runner/release tests, private operator receipts, будущий `docs/runbooks/release-candidate.md`. Cloud 3 accounts/0 media/payments/journal 26; site 5 accounts/4 videos/10 clips/6 payments/referrals/journal 28. Сохранять ВСЕ данные/связи. Source-bound backup/restore hash/source/journal/PG version/time, не boolean profile. Новый site sourceIdentity/live account SHA/full journal root уже сверил с реально восстановленным test.dump: 5/28 match; этот binding — input, localstage исключён. Перед apply проверить drift и дополнить media/payment/referral/credit row hashes/связи. Snapshot-derived baseline сравнивать с тем же restore; повреждение/чужой source/drift требуют нового backup/restore/reconcile. Не расширять proof 5/28 на ещё не проверенные таблицы.

Existing DB/Redis/volumes и отдельные applicationProject/databaseProject/redisProject сохраняются. SQL admission приватно разбирает application DATABASE_URL: database = binding.dbName, host/test-network alias → exact pinned test DB container; сверить его Docker labels/PG system identity/volume. Активная test DB отличается от POSTGRES_DB default: не брать -d из него. Main DB/host/container/project/volume mismatch отклонять ДО SQL. Redis URL связан с pinned test Redis/network/volume. Не создавать/up DB/Redis/новый project, не менять main.

Общий bucket/нынешний общий key с полными production-правами сохраняются по явному owner exception «Нынешний общий ключ; ограничиваем тесты в коде». Admission проверяет exact bucket+prefix tests/cloud/ и tests/site/ и SDK proof TASK-3; никаких новых SA/key/policy/IAM rollout/approval/ожидаемого provider403. Root read-only: policy отсутствует, CORS c/n5 PUT уже разрешён, versioning disabled; production settings неизменны. Cloud operator canary: CRUD/multipart/list/public signing только внутри tests/cloud/ и tests/site/, без мутаций рабочих namespaces. Это compatibility, не IAM isolation; отсутствие SDK/wire proof блокирует writers, широкие права key не заменяют его.

Site nonempty media: закрытый DB-whitelist referenced synthetic objects с владением/test принадлежностью, logical source/destination и size/SHA. Под target lock остановить только test writers/new uploads, завершить старые multipart под старым namespace либо безопасно abort штатным путём с согласованными quota/data последствиями. Pending/unknown upload блокирует переход; UploadId не переносить на новый physical key. Streaming copy whitelist в tests/site/<logical-key>, независимый size/SHA verify каждого source/dest; originals сохранить, DB keys прежние. Чужая production-ссылка/неполный whitelist/bytes mismatch/conflict блокируют apply. Copy — отдельный операторский data step тем же общим key: только чтение verified старых test objects и запись tests/site/, не blanket scan/мутации production. Его legacy reads/drain не выдавать за scoped SDK canary. Cloud добавляет только 026/027; site 28→28. Сверить все прежние данные после copy/start/release phases. Namespace rollback требует сверки новых после copy объектов; иначе оставить prefix и roll-forward.

Site-server 3,6 ГБ/97%: до transfer/apply реальный disk admission source/image archives, incremental image layers, temp extract, сохранённые current/rollback images и резерв. При нехватке BLOCKED, допустим read-only inventory своего кэша и отдельный cleanup plan; global prune/чужие проекты/rollback images не удалять. Отдельно media admission memory ≥2 ГиБ, disk ≥3×input+2 ГиБ, конечные memory limits, один media job; finite quota 240 минут/4 LLM и остаток quota_counter, существующие atomic admission/spend log. 2 STT job не равны 2 provider calls, retries платные, денежного hard cap не обещать. Не гарантировать ресурсы до измерений.

Test: `rejects unverified backup isolation and schema drift`, `rejects insufficient resources and exhausted budgets`, `preserves nonempty site data and rejects foreign copy and pending multipart`, `rejects site identity drift and insufficient incremental image archive space` в release unit; synthetic receipt tampering — acid. Готово: валидный nonempty site и одинаковый bucket с разными prefixes допускаются; invalid source/copy/namespace/resource proof отклонён до apply, реальный data step подтверждён receipts. Отказ не запускает restore/down -v/prune/bootstrap; прежние объекты/данные сохранены, blockers явны.

Test `accepts split app infra projects and rejects database URL binding mismatches` в `tests/release-candidate.test.ts`: positive разные app/infra projects, active DB ≠ POSTGRES_DB default; negative wrong dbName/main DB/host/network alias/container/project/volume. `rejects unverified backup isolation and schema drift` теперь проверяет code/SDK boundary, не отсутствие IAM key. Готово: выбран exact application database и existing test containers, ни одной infra up/create команды.

Разделение разработки и live допуска: TASK-4 поставляет работающий admission/copy-evidence contract и read-only baseline. Мутирующие drain/copy и его final receipts выполняются оператором в lock-протоколе TASK-5, а перед start/apply заново валидируются. Код TASK-5 зависит от готового TASK-4 contract, а не от уже исполненной будущей доставки; циклической зависимости lock/copy нет. До verified copy разрешён только этап подготовки под lock, не старт нового namespace.

### TASK-5 (FR-1, FR-4, FR-6, FR-7, FR-8, ADR-001, ADR-002, ADR-003): target apply/state/reconcile

Фаза refinement; 60–90 минут; зависит TASK-2/3/4 и новых QCSD/K1/K2. Runner и минимальный `ops/cloudru/compose.images.yml`: existing image overrides/applicationProject, отдельные databaseProject/redisProject/pinned DB/Redis/network/volume без объединения; start-managed-vm.sh вслепую не вызывать. Effective Compose проверить без env-output: exact prefix всех storage consumers/общий нынешний key по exception. На обеих SSH-целях атомарный mkdir lock + private state temp+rename до mutations; operation/release/previous IDs, namespace/copy/source-bound topology evidence и шаги. Lock охватывает drain/copy/config/migration/app/verification, при захвате перепроверить drift. Не снимать чужой/stale lock по одному PID/времени.

Передать tar/hash после disk admission, load/inspect image IDs; остановить только target app writers. Migrator использует application DATABASE_URL и verified DB binding, explicit database argument вместо POSTGRES_DB default, без запуска dependencies. Cloud только 026/027, site journal 28 no-op. Compose up только перечисленных app services без build и с --no-deps, existing networks/infra containers/volumes неизменны; inspect всех web/worker/HTTP health и DB/Redis IDs/StartedAt. Receipts по целям независимы, общий exit 0 только после двух успехов. Transport unknown сохраняется локально/remote; inspect/reconcile под lock сверяет state/runtime/namespace/topology/journal, retry без доказанного terminal status запрещён. Конфликт требует оператора; не auto-resume. StrictHostKeyChecking/expiry/tunnel проверяются, доступ не продлевается автоматически.

Rollback только при равном полном journal releases/наблюдаемой DB и совместимом namespace/config; 26→28 не rollback. Для демонстрации A/B оба уже поддерживают тот же prefix; возврат к старому empty-prefix приложению без data reconcile запрещён. Возвращаются приложения, не данные/volumes; evidence учитывает все созданные данные. Test: `reconciles unknown remote outcomes before retry`, `serializes concurrent target writers`, `rejects rollback with different full schema journal`, `rejects rollback to an incompatible storage namespace`, `fails aggregate delivery when either target is missing or fails`. Готово: unknown не success/rollback; partial receipts сохранены, retry только после reconcile. Prototype `/tmp` сначала интегрировать и проверить реальным SSH, fake 14+4 не считать доказательством.

### TASK-6 (FR-1, FR-3, FR-4, FR-6, FR-7, FR-8, ADR-001, ADR-002, ADR-003): discrimination и реальные release phases

Фаза completion; 45–90 минут без внешних ожиданий; зависит TASK-5. Unit tests в `tests/release-candidate.test.ts`; injected faults в `tests/release-candidate-acid.test.ts`: исполняемый executor/контролируемые границы, одна подмена делает проверку красной. Test titles: `detects omitted target and substituted runtime image`, `detects skipped isolation backup and schema checks`, `records every runtime identity through A B A B`, `confines real OOM and ENOSPC to disposable test workers`, `detects substituted site snapshot skipped copy and namespace guards`. Внедрить пропуски copy/drain/namespace/sourceIdentity отдельно; mock/строковый поиск не объявлять live proof.

Реальная матрица A→B→A→B на ОБЕИХ целях после схемы 28: в каждой из 8 фаз сохранить full SHA, source hash, OCI revision, image IDs КАЖДОГО web/worker, StartedAt и HTTP version/health; на B видимый ответ меняется. После rollback A и repeat B сверить полный journal, прежние аккаунты и все созданные данные; Cloud source B соответствует Git archive. Негативные stale runtime, archive corruption, missing target, partial failure и wrong journal дают ненулевой итог. RES-01: disposable worker без production mounts/network получает реальный cgroup OOM и OOMKilled/exit; RES-02: ограниченный tmpfs действительно даёт ENOSPC. Read-only inventory остальных контейнеров до/после сравнивает IDs/StartedAt/restart counts, production неизменён. Это самостоятельные faults, не рабочие media jobs. Живые проверки разрешены только после admission; отсутствие среды — BLOCKED, не fake PASS.

### TASK-7 (FR-2, FR-5, FR-7, FR-8, FR-9, ADR-002, ADR-003): Cloud CJM и независимая приёмка

Фаза completion; зависит TASK-2/3/4/5/6 и конкретного TEST shop окна. Files: existing release test/acid, `docs/runbooks/release-candidate.md`, OpenSpec delta/07_progress, private live receipts. Core-CJM/browser/provider tests переиспользовать; новый frontend/payment backend не нужен. CJM-01–12 с тремя owner/blogger/client contexts: точные 5400/7200 с, >5400 отказ до STT, индивидуальный 2–1440/сброс/защита роли, interrupted upload без повторного списания, transcript/select/render, настоящий Chromium Play/time/decoded frames, download MP4/ffprobe/hash, referral/обе статистики/изоляция. Длинные jobs только Cloud, последовательно, максимум два STT job/четыре LLM calls. Site проверяет все прежние media после copy, без нового платного STT. SDK proof/Cloud inside-tests compatibility необходимы, IAM proof от общего key не требуется.

Нынешний TEST shop используется временно; новый shop_id не обязателен. До конкретного согласования начала/конца окна, UI-оператора и завершения pending intents прежний callback неизменён. В окне оператор через UI сохраняет n5 callback/notification events, меняет HTTP notifications на `https://c.clipmkr.ru/api/webhooks/yookassa`, затем native checkout→callback→provider lookup→один credit grant/paid rights/relogin, cancel/replay/foreign shop/mode/IP/intent, referral revenue/statistics. После завершения Cloud pending intents вернуть n5 callback и проверить delivery; при неизвестном исходе остановить checkout и согласовать разрешение, не закрывать окно молча. Basic auth shop API не управляет webhooks; реальные списания не включать. Private receipts обоих переключений/drain/native tests обязательны. Без них payment/полный CJM BLOCKED. Симуляция/polling не proof. `blocks full CJM without native window and SDK namespace proof` проверяет completeness receipts; `requires agreed current test shop window and drained intents before callback switch` проверяет окно/drain/возврат, оба в unit-файле, без ожидания IAM/403.

Кодирует gpt-6.1-terra; planner gpt-6.1-sol. Этот planner не запускает других агентов и не выполняет кодирование. После coding root организует final cross-model review в fresh sessions моделями, не писавшими код: сначала только согласованные требования/ADR/архитектура/план, затем самостоятельное нахождение кода/тестов; без прежних ревью/выводов автора. Запланированы gpt-6-astra и gpt-6.1-sol, точные доступные IDs и session IDs фиксируются фактически, не этим текстом. Fixes перепроверяет другая модель. До завершения обязательны full suite после устранения 7 failures, typecheck/lint/build всех workspaces, storage/provider/browser regressions, расширенный reference QE и code/spec anti-drift/OpenSpec. Конкретные независимые QE perspective reviews root организует после coding; fake/prototype results не runtime receipts. Commit/push — отдельный шаг root, не DOCS planner.

### TASK-8 (FR-5, ADR-002): серверный checkout gate и безопасное окно

Расширить существующие WebConfig/environment/BillingDependencies без нового сервиса:
N5_CHECKOUT_ENABLED default true, строгий boolean; false сохраняет rate/origin/auth
и отказывает503 до body/createIntent/provider create. GET/status/webhook продолжают
обрабатывать старые intents. Files: packages/shared/src/config.ts, web environment,
apps/web/src/server/billing-runtime.ts, apps/web/src/server/billing-handler.ts,
Compose/.env.example/fixtures. Зависит готового runtime, до native окна. Test
`pauses checkout creation while webhook and status remain live` в
tests/payments-guards.test.ts и tests/billing.integration.test.ts; live freeze/drain
обоих направлений с503и нулём новых intents/calls. Не заменять выключением provider.

### TASK-9 (FR-2, ADR-002): точный месячный оракул обеих ролей

Переиспользовать/дополнить tests/blogger-report.integration.test.ts конкретными
January/R1/R2/647000коп. ожиданиями из01, null/20/30 и отдельными исключениями,
границами paid_at, snapshot после смены ссылки, distinct payer и refund149000.
Test `matches monthly per-link totals rates exclusions and immutable attribution`.
Это PostgreSQL integration; live Cloud сравнивает реальные receipts текущего
месяца с independent integer calculation. Зависит существующих report/policy,
не требует дополнительного STT и не выдаёт fixture за native платёж.

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

Риски нового focused QCSD: provenance/ложный immutable env — TASK-2/6; signing/response-key escape — TASK-3/4; неверный app/infra project/database/host/default POSTGRES_DB — TASK-1/4/5; data loss/чужая ссылка/localstage snapshot/pending multipart — TASK-4/5/6; SSH/two writers/unknown — TASK-5; disk 97%/бюджеты/false green — TASK-4/6; потерянный callback/pending intents — TASK-7. Fallback: остановить только target test copy/новые checkout, сохранить state, reconcile/roll-forward; без production cleanup/слепого restore/отключения guards. Owner явно принимает сохранение production-wide key: SDK boundary снижает ошибки кода, не защищает при обходе SDK/компрометации key. IAM rollout не mitigation текущего плана.

Временный Cloud SSH доступ до 04.11 около 15:01 UTC по сведениям root — не постоянный канал; перед работой root проверяет host key/tunnel/expiry обоих targets. Planner live probes не выполнял. Root уже получил новый site sourceIdentity/account SHA/journal match test.dump 5/28, до apply проверить drift и все прочие данные. Остаются: split-project/DATABASE_URL binding proof, whitelist/copy/multipart receipts, реальный disk admission (при нехватке отдельный cleanup plan), конкретное TEST shop окно/UI-оператор/drain/return, реальные release/CJM receipts. Процесс: root prepare/3 QCSD/K1/K2; код: wiring full-suite fix, prefix SDK/S3, remote integration/acid/QE и fresh cross-model review. Новые SA/key/policy/provider403 отсутствуют в зависимостях. Старый ideationclosed/10 checkpoint tests не означают готовность новой ревизии.

## Amendments

AM-1 (QQ-01, RISK-01, QT-01, прежний снимок): прежний IAM scope design отменён явным owner exception; superseded by AM-8.
AM-2 (QQ-02, QT-06, прежний снимок): отдельный shop/старые scope proof требования заменены согласуемым окном нынешнего TEST shop; superseded by AM-11.
AM-3 (QQ-03, RISK-03, REL-05): lock/state/unknown/reconcile предшествуют retry. Confirmation: повтор после обрыва запрещён до сверки → test `reconciles unknown remote outcomes before retry` in `tests/release-candidate.test.ts` (fails if reverted).
AM-4 (QQ-04, QT-05, RES-01/02): ресурсные faults только disposable worker с evidence остальных контейнеров. Confirmation: реальный fault локализован → test `confines real OOM and ENOSPC to disposable test workers` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-5 (QT-02, REL-03): runtime IDs каждого сервиса в каждой фазе и сохранность данных. Confirmation: пропущенная фаза/ID отклоняется → test `records every runtime identity through A B A B` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-6 (QT-03, REL-02/04): archive/build/runtime цепочка вместо доверия label. Confirmation: stale label и подмена archive обнаружены → test `rejects substituted source archives and stale labeled images` in `tests/release-candidate.test.ts` (fails if reverted).
AM-7 (QT-04, RISK-02, DATA-01–04): snapshot restore baseline и полный journal, без слепого restore. Confirmation: несовместимый rollback отвергается → test `rejects rollback with different full schema journal` in `tests/release-candidate.test.ts` (fails if reverted).

AM-8 (последнее явное решение владельца, ADR-003): нынешний общий key сохраняет production-права, только SDK namespace, без новых SA/key/policy/IAM proof/provider403. Confirmation: physical prefix всего object/list/signing/multipart/retention трафика, outside canary прежний → test `isolates two namespaces on real S3 and preserves outside canary bytes` in `tests/storage-prefix.integration.test.ts` (fails if reverted).
AM-9 (владелец, FR-1): cloud-c/site-test только через SSH, controller localdevstage исключён. Confirmation: правильные две цели используют SSH, прежняя local цель отвергнута → test `uses SSH for cloud-c and site-test and rejects localdevstage` in `tests/release-candidate.test.ts` (fails if reverted).
AM-10 (владелец, FR-4/ADR-002): непустой site сохраняет все 5 accounts/4 videos/10 clips/6 payments/referrals, copy только whitelist с size/SHA, originals и logical DB keys прежние; pending uploads разрешены до смены namespace. Confirmation: чужая ссылка/copy mismatch/pending блокируют apply → test `preserves nonempty site data and rejects foreign copy and pending multipart` in `tests/release-candidate.test.ts` (fails if reverted).
AM-11 (владелец, FR-5): нынешний TEST shop, конкретное окно/UI-оператор/drain/native/replay/credits/referrals/drain/возврат n5 callback; до окна callback прежний. Confirmation: непройденное окно/drain/return блокирует полный CJM → test `requires agreed current test shop window and drained intents before callback switch` in `tests/release-candidate.test.ts` (fails if reverted).
AM-12 (inventory, FR-7): site 3,6 ГБ/97%, фактический incremental image/archive admission, без global prune/удаления rollback images. Confirmation: дефицит или чужой site source отклоняются → test `rejects site identity drift and insufficient incremental image archive space` in `tests/release-candidate.test.ts` (fails if reverted).
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
