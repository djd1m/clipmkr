# План реализации тестового выпуска Cloud.ru

Inputs read: AGENTS.md, CLAUDE.md, docs/review-policy.md, docs/acceptance/core-cjm.md; 00_complexity_assessment.md, 01_requirements.md, 02_research.md, 03_adr/001-release-manifest.md, 03_adr/002-isolated-cloud-candidate.md, 04_domain_model.md, 05_architecture.md, reviews/qcsd-quality.md, reviews/qcsd-risk.md, reviews/qcsd-testability.md; закреплённые modules/06-implementation-plan.md и references/agentic-qe/code-goal-planner.md.

## Goal state

Текущий результат — план, не выполненная доставка. Ideation закрыт на revision `c1cb6d4e9fd23bf3ab2315c7dd0de3b04da7909379740ec5d80d9e2a6d3842d6`, nonce `e9449a2e-0b4f-463b-b686-e7a15eb7134a`: focused QCSD закрывает структурные условия, не подтверждает runtime/E2E. Исторические proposed/CONDITIONAL во входах не переписываются. Процент покрытия неизвестен; таблицы acid A<n> в 00 нет, corpus не выдумывается.

Цель: небольшой `scripts/release-candidate.mjs`, локальный Node 22 orchestrates Git archive → Docker build/save → SSH/load/Compose, без нового сервиса/registry. Явные допустимые цели только `localdevstage` и `cloud-c` (Cloud c.clipmkr.ru); production/n5 не изменяются. Существующие DB/Redis/volumes сохраняются. Один image set на обе цели, SHA и runtime IDs проверены независимо от labels. Целевое состояние — доказанная доставка и совместимый A→B→A→B; полный CJM допускается только после внешних зависимостей.

SPARC: specification — FR/ADR и QCSD; pseudocode — validate/prepare/apply/inspect/reconcile/rollback; architecture — Release/Target/Receipt без продуктовых сущностей; refinement — отрицательные tests и fault injection; completion — реальные receipts и независимое QE.

## Tasks

### TASK-1 (FR-1, FR-5, ADR-001): TOOL compatibility и явные профили

Фаза specification/refinement; 30–45 минут, без зависимостей. Сохранить уже выполненный совместимый patch существующего nameCheckScan: `patches/dz-name-check-app-source.patch`, его применение `scripts/install-process.sh`, существующие positive/collision/empty проверки `tests/feature-adr-paths.test.mjs`. Это TOOL precondition, не приложение и не новый scanner. Исходный hardcoded layout давал NOT-ESTABLISHED; новые реальные проверки 2/2 PASS и name-check release-candidate/exports exit 0 зафиксированы оператором; повторить перед кодом, затем после reinstall.

В runner экспортировать только необходимые `loadCandidateProfile`, `validateReleaseManifest`; отделить CLI от import. Приватный profile вне Git с mode 0600 и закрытым родителем содержит точные project/root/env/compose paths, allowed origins, SSH config alias/known_hosts/expiry и identity ресурсов. Не угадывать project по директории, не создавать новый project вместо существующего. Локальная цель использует тот же executor contract без SSH. Cloud executor — bash + python3, Docker/Compose; Node на Cloud отсутствует и не требуется. Команды передавать через argv/stdin без eval и вывода env. Reject production, unknown, duplicate/missing targets, небезопасные пути, неправильные права и несовпадение inventory. Default targets отсутствуют. Dry-run/inspect доступны без mutations и без вывода секретов, показывают только редактированные identities/admission причины.

Test: `rejects implicit production and unknown targets`, `rejects unsafe private target profiles` в `tests/release-candidate.test.ts`; существующий `K1 scans nested application source, refuses collisions and an empty workspace`. Готово: guards отказывают до transport/mutations, K1 реально проверяет app source.

### TASK-2 (FR-1, FR-3, ADR-001): immutable источник, manifest и health

Фаза architecture/refinement; 45–75 минут; зависит TASK-1. Файлы runner, Dockerfile, health route, два test-файла. Полный commit проверять через Git, чистый checkout выбранной ревизии; `git archive` без untracked/env строит единственный source tar. Из его распакованного содержимого собирать web/worker, фиксировать source SHA-256, OCI revision, image IDs каждого артефакта, save tar hash и schema journal (полный упорядоченный набор имён/хешей, не count/max). Образы не пересобирать на целях. Не смешивать registry RepoDigest, image ID и tar hash. Cloud получает этот source tar; verify checksum после передачи и сравнить канонический inventory извлечённых файлов с тем же архивом до применения. Manifest валидировать строго до Docker load.

Dockerfile вшивает immutable full SHA в build/runtime web и OCI labels web/worker; `/health` сохраняет DB probe, no-store и 503 при отказе, добавляет закреплённую версию. Runtime env не может подделать build version. Изменение B — отдельный Git commit, различимый реальным ответом приложения. Test: `rejects substituted source archives and stale labeled images`, `health exposes immutable build revision`, `validates full release manifest and artifact identities`. Готово: архив/сборка/manifest связаны, forged labels не заменяют ID.

### TASK-3 (FR-4, FR-5, FR-7, ADR-002): data/isolation/resource admission

Фаза refinement; 45–75 минут; зависит TASK-1, TASK-2. Runner проверяет приватные идентифицированные backup/restore receipts каждой изменяемой DB, их hash/source/journal/PG version/время и соответствие текущему inventory; evidence не сводится к boolean profile. Restore выполняется отдельно оператором в пустой DB без сети и app/writers; baseline получают из того же snapshot, сравнивают все journal и существенные строки/аккаунты. Повреждённый/чужой backup, drift либо непустые S3 ссылки блокируют apply. Оператор сообщил о новом localdevstage backup (85 512 байт); проверить его hash/source и завершить изолированный restore с account baseline. Уже полученные private restore receipts трёх DB (main/test/cloud) не заменяют отдельную проверку localdevstage.

Точные existing DB/Redis/volumes остаются; изолированные credentials не наследуются от production. Scoped S3 identity обязана доказать отказ Get/Put/Delete/multipart production canary и успех своего canary, без пользовательских объектов. Пока credentials внешне blocked, apply/start writers blocked. Разрешены только добавляющие 026/027 после полного исходного journal match; отказ не запускает restore/down -v/prune/bootstrap. Сверить аккаунты после миграции.

Проверить memory ≥2 ГиБ, disk ≥3×input+2 ГиБ, конечные memory limits, один media job, quota settings 240 минут/4 LLM и текущий остаток quota_counter; переиспользовать существующий atomic provider admission/spend log, не создавать платёжный/бюджетный сервис. Повторы chunks считаются платными попытками; 2 STT jobs не равны 2 API calls. Test: `rejects unverified backup isolation and schema drift`, `rejects insufficient resources and exhausted budgets`. Готово: отрицательный admission не изменяет контейнеры/БД, внешние blockers сохраняются явно.

### TASK-4 (FR-1, FR-4, FR-6, FR-7, ADR-001, ADR-002): target apply/state/reconcile

Фаза refinement; 60–90 минут; зависит TASK-2, TASK-3. Runner и при необходимости минимальный `ops/cloudru/compose.images.yml`: использовать existing compose и явные image overrides, сохранять DB/Redis definitions/volumes и project identity; не вызывать start-managed-vm.sh вслепую. Проверить effective Compose без вывода секретов. На каждой цели атомарный mkdir lock + приватный state (temp+rename, restrictive permissions) до любого изменения. State содержит operation/release/previous IDs и шаги; lock охватывает migration/app/verification. Свежий вызов не снимает чужой/stale lock по одному PID/времени.

Передать tar/hash, load и inspect image IDs, остановить только target writers, миграция, up только нужных app services без build, inspect всех web/worker и HTTP health. Receipts по целям независимы; общий exit 0 лишь при успехе двух выбранных целей. При неизвестном transport outcome сохранить локально unknown, remote intent не терять. Inspect/reconcile под тем же lock сопоставляет remote state/runtime/journal; только доказанный terminal status освобождает допуск. Конфликт требует оператора, не auto-resume. SSH StrictHostKeyChecking, срок ключа и tunnel проверяются; не продлевать доступ автоматически.

Rollback только при равном полном journal releases/наблюдаемой DB; 26→28 не rollback. Возвращаются приложения, не данные/volumes; evidence до/после включает созданные данные. Test: `reconciles unknown remote outcomes before retry`, `serializes concurrent target writers`, `rejects rollback with different full schema journal`, `fails aggregate delivery when either target is missing or fails`. Готово: disconnect не объявляется rollback/success; согласованная частичная доставка сохраняется.

### TASK-5 (FR-1, FR-3, FR-4, FR-6, FR-7, ADR-001, ADR-002): discrimination и реальные release phases

Фаза completion; 45–90 минут без ожидания внешних зависимостей; зависит TASK-4. Unit tests в `tests/release-candidate.test.ts`; отдельные injected faults в `tests/release-candidate-acid.test.ts`: реально исполняемый executor с контролируемыми границами, подмена одного условия делает проверку красной. Test titles: `detects omitted target and substituted runtime image`, `detects skipped isolation backup and schema checks`, `records every runtime identity through A B A B`, `confines real OOM and ENOSPC to disposable test workers`. Не объявлять строковый поиск эквивалентом поведения.

Реальная матрица A→B→A→B на ОБЕИХ целях после схемы 28: в каждой из 8 фаз сохранить full SHA, source hash, OCI revision, image IDs КАЖДОГО web/worker, StartedAt и HTTP version/health; на B видимый ответ меняется. После rollback A и repeat B сверить полный journal, прежние аккаунты и все созданные данные; Cloud source B соответствует Git archive. Негативные stale runtime, archive corruption, missing target, partial failure и wrong journal дают ненулевой итог. RES-01: disposable worker без production mounts/network получает реальный cgroup OOM и OOMKilled/exit; RES-02: ограниченный tmpfs действительно даёт ENOSPC. Read-only inventory остальных контейнеров до/после сравнивает IDs/StartedAt/restart counts, production неизменён. Это самостоятельные faults, не рабочие media jobs. Живые проверки разрешены только после admission; отсутствие среды — BLOCKED, не fake PASS.

### TASK-6 (FR-2, FR-5, FR-7, ADR-002): Cloud CJM и независимая приёмка

Фаза completion; зависит TASK-3–5 и внешних S3/native payment. Существующие core-CJM/browser/provider tests переиспользовать; новый frontend/payment backend не требуется. Выполнить CJM-01–12 по 01_requirements с тремя отдельными owner/blogger/client contexts: точные 5400/7200 с, >5400 отказ до STT, индивидуальный 2–1440/сброс/защита роли, interrupted upload без повторного списания, transcript/select/render, настоящий Chromium Play (time и decoded frames), download MP4/ffprobe/hash, referral и обе статистики/изоляция. Длинные платные jobs только на Cloud, последовательно, максимум два STT job и четыре LLM calls; неизвестный денежный hard cap не обещать.

Отдельный native test shop с отличным shop_id сейчас BLOCKED внешне. Не менять прежний receiver. До native checkout→callback→provider lookup→один grant, cancel/replay/foreign shop/IP/intent, paid rights/relogin и attribution платёжная часть и весь зависимый полный CJM BLOCKED. Симуляция/polling не заменяют proof. Test `blocks full CJM without native shop and scoped storage proof` в unit-файле проверяет запрет финального PASS по неполному receipt, не выдаётся за E2E.

Кодирует gpt-6.1-terra. Финальное независимое review gpt-6-astra и gpt-6.1-sol в новых fork_turns=none сессиях: сначала только согласованные inputs и этот план, затем самостоятельное нахождение кода/тестов; без прежних авторских отчётов. Фиксировать exact model IDs, отдельные сессии и пределы доказательства. Повторная проверка fixes другой моделью, реальные QE/anti-drift/OpenSpec delta; commit/push только отдельным исполнительским шагом, не этим planner.

## Dependency order

TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6. Backup/storage/payment evidence можно собирать отдельно от чистых unit tests, но admission обязательный перед apply. Размер — 9 code targets, из них 3 уже существующих TOOL compatibility changes. Оценки не включают ожидание S3/shop и длительность длинных media jobs.

## Parallel groups

Группа 1: профили/TOOL guards. Группа 2: источник/health и read-only data evidence логически независимы, общий runner правится последовательно. Группа 3: apply + unit/acid. Группа 4: живые фазы и CJM последовательно по ресурсному лимиту; независимые reviewers после coding. Этот план не требует дополнительных coding agents.

## Checkpoints

CP0: K1 positive/collision/empty, настоящий K2 tier L require-requirements и code-target admission. CP1: unit tests guards/artifact identity плюс typecheck/lint, Docker web/worker builds из archive. CP2: backup/restore каждой цели, scoped storage proof, SSH/resource admission; при blocked не запускать writers. CP3: partial/disconnect/concurrency/rollback faults и реальные OOM/ENOSPC. CP4: все восемь фаз A→B→A→B с runtime IDs и data reconciliation. CP5: CJM matrix, QE и cross-model review; полный PASS только при отсутствии blocked/failed строк. Private receipts содержат UTC/command exit/artifact references; Git только редактированный индекс без PII/secrets/signed URLs.

## Risk assessment

Основные QCSD риски: provenance подмена — TASK-2/5; shared S3 и data loss — TASK-3/4; потеря SSH/два writers — TASK-4; false green неполной доставки — TASK-5; OOM/disk/budget — TASK-3/5; ложная native оплата — TASK-6. Fallback — остановить затронутую тестовую цель/сохранить state, reconcile и roll-forward при неизвестной совместимости, без production cleanup и слепого DB restore.

Фактическая доступность ограничена evidence `docs/incidents/2026-11-03-cloudru-access.md`: проверены SSH команды/SFTP checksum/restart туннеля/host key, временный доступ до 04.11 около 15:01 UTC, не постоянный канал. Этот planner не выполнял новый SSH probe. Inventory 02_research и ADR-002 — Cloud 3 аккаунта, local stage 1, без media/payment на момент снимка; перед apply сверить заново. Private alias `operator-backup-restore-20261103` обозначает сообщённые оператором restore трёх DB main/test/cloud с полными journals/counts; localdevstage backup 85 512 байт добавлен, его restore и account SHA baseline дополняются оператором и требуют проверки. Точные приватные пути не публикуются. Read-only IAM probe вернул 403: IAM создание не автоматизировать, отдельные test S3 env/keys предоставляет владелец. S3 scoped credentials и native separate shop внешне blocked. Ни наличие инструментов, ни закрытый ideation не означают готовность инфраструктуры/прохождение CJM.

## Amendments

AM-1 (QQ-01, RISK-01, QT-01): обычный Cloud origin и scoped storage до writers, сохранение DB. Confirmation: неверная изоляция блокирует apply → test `rejects unverified backup isolation and schema drift` in `tests/release-candidate.test.ts` (fails if reverted).
AM-2 (QQ-02, QT-06): native shop/receiver не заменяются симуляцией. Confirmation: неполные proof блокируют полный CJM → test `blocks full CJM without native shop and scoped storage proof` in `tests/release-candidate.test.ts` (fails if reverted).
AM-3 (QQ-03, RISK-03, REL-05): lock/state/unknown/reconcile предшествуют retry. Confirmation: повтор после обрыва запрещён до сверки → test `reconciles unknown remote outcomes before retry` in `tests/release-candidate.test.ts` (fails if reverted).
AM-4 (QQ-04, QT-05, RES-01/02): ресурсные faults только disposable worker с evidence остальных контейнеров. Confirmation: реальный fault локализован → test `confines real OOM and ENOSPC to disposable test workers` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-5 (QT-02, REL-03): runtime IDs каждого сервиса в каждой фазе и сохранность данных. Confirmation: пропущенная фаза/ID отклоняется → test `records every runtime identity through A B A B` in `tests/release-candidate-acid.test.ts` (fails if reverted).
AM-6 (QT-03, REL-02/04): archive/build/runtime цепочка вместо доверия label. Confirmation: stale label и подмена archive обнаружены → test `rejects substituted source archives and stale labeled images` in `tests/release-candidate.test.ts` (fails if reverted).
AM-7 (QT-04, RISK-02, DATA-01–04): snapshot restore baseline и полный journal, без слепого restore. Confirmation: несовместимый rollback отвергается → test `rejects rollback with different full schema journal` in `tests/release-candidate.test.ts` (fails if reverted).

Все перечисленные новые test titles — обязательные будущие имена для coder, пока не доказательство существования/прохождения. TOOL тест уже существует; его успех не переносится на runner.

EXPECTED_CODE_TARGETS:
- scripts/release-candidate.mjs
- Dockerfile
- apps/web/src/app/health/route.ts
- ops/cloudru/compose.images.yml
- tests/release-candidate.test.ts
- tests/release-candidate-acid.test.ts
- patches/dz-name-check-app-source.patch
- scripts/install-process.sh
- tests/feature-adr-paths.test.mjs
