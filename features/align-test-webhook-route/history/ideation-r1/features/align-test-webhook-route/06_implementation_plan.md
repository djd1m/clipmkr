# План выравнивания TEST callback

05.11.2026. **PLAN DRAFT, APPLY NOT RUN**. Отдельная операционная фича M10, не расширение UI targets. Независимый QCSD отсутствует; этот предварительный Step6 document нельзя считать plan checkpoint или coding admission. Порядок ролей и действительное делегированное решение фиксирует координатор. Автор кода по matrix — gpt-6.1-sol high; review — новая сессия иной модели по docs/model-matrix.md. Runtime writes этой planning-сессией запрещены.

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-align-test-callback-upstream.md`, `05_architecture.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, `docs/model-matrix.md`; pinned code-goal-planner и shift-left reference прочитаны. Step3.5 verdict НЕ получен.

## Goal state

Current: checkout main DB и callback legacy DB различаются; TEST shop совпадает; main upstream уже существует. Goal: один sanitized versioned fragment соответствует единственному upstream delta полного private config; настоящий ограниченный TEST callback/grant исполняется main handler/store с сохранением isolation. Coverage percentage неизвестен и не выдумывается. Полная приёмка требует runtime provider evidence; зелёный fixture test её не заменяет.

## Tasks и порядок зависимостей

- TASK-1 — Specification, FR-1/FR-2/FR-3/NFR-1: завершить требования, ADR-001, source provenance, независимый QCSD quality/risk/testability и conditional security, исправить подтверждённые findings. Files: текущие feature docs/OpenSpec. Depends: none. Success: genuine QCSD verdict и все mandatory findings закрыты; checkpoints лишь через поддерживаемые dz команды после реальных gates.
- TASK-2 — Pseudocode/architecture, ADR-001, FR-1/FR-3: определить operator contract и негативные checks; выполнить K1 для new test module и K2 по финальным bytes с `--tier=M --require-requirements --acid=A1,A2,A3,A4,A5`. Depends: TASK-1. Success: exit0 с явным PASS; после правок повторить binding. Никаких новых command/export names не требуется.
- TASK-3 — Refinement, ADR-001, FR-1/FR-3/NFR-1: после admission автор создаёт `deploy/test-webhook-route.caddy` и `tests/test-webhook-route.test.ts`; test проверяет scoped exact fragment, only-one-replacement, protected-byte identity, stale SHA/inode отказ и rollback state machine на temp fixture. A1/A2/A3/A5 → tests named `reject legacy upstream`, `reject collateral bytes and XFF drift`, `reject stale inode before writing`, `restore exact bytes after validate reload or health failure`. Depends: TASK-2. Success: red mutants отвергнуты, штатный candidate принят, subprocess/runtime не вызываются fixture-тестами. Private operator не становится доверенным через тест отдельного mock: фактический исполняемый operator подлежит отдельному source binding/review до apply.
- TASK-4 — Completion preflight, FR-1/FR-2/FR-3/NFR-1: независимый review repo artifact и actual private executor, native QE snapshot с exact source hashes, read-only свежие source SHA/inode/mount/network/main DB identity/XFF и TEST flags. A4 → `verify test isolation before apply` как private readonly assertion; global false, sole account, test=true/test_ подтверждены. Depends: TASK-3. Success: все invariants подтверждены, main proxy доступен в существующей сети; иначе STOP. READ-ONLY source owners перечислены отдельно ниже.
- TASK-5 — Completion apply, ADR-001, FR-1/FR-3/NFR-1: только после операционного допуска координатора взять exclusive ops lock, snapshot full backup bytes/SHA/permissions/inode и before image/env/container/network/data identity/health. Подготовить full candidate в private scratch, проверить тем же existing Caddy binary `validate --config <candidate> --adapter caddyfile`. Concrete private scratch transport/path определяется и review до выполнения; новый container запрещён. Recheck source SHA/inode under lock, запись открытым fd в bound inode, full write+truncate+fsync; сравнить host/container-visible SHA, выполнить validate container-visible `/etc/caddy/Caddyfile`, затем `caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile` только existing edge. A2/A3/A5 checks: collateral bytes0/inode same/validate-before-reload. Depends: TASK-4. Success: stable health и image/env/data identity unchanged; никаких compose restart/up или network connect.
- TASK-6 — Completion TEST CJM и QE, FR-1/FR-2/FR-3/NFR-1: только sole approved account, настоящий TEST provider checkout→callback→main confirmed payment/grant→usable paid capability; duplicate no double grant, failed/cancel no grant, re-login preserved, обычный аккаунт blocked. A1/A4: фактические route/main DB identity/provider mode/ledger delta в private sanitized evidence. При health/validation/reload failure TASK-5 восстанавливает exact backup через тот же fd/inode+fsync→validate→reload; проверить old SHA и health, при rollback failure STOP и incident. Depends: TASK-5. Success: real evidence без PII; independent review, code/spec anti-drift и evidence-backed teach; ограниченный проверенный commit/push выполняет координатор отдельным действием. Здесь их нет.

DAG: TASK-1 → TASK-2 → TASK-3 → TASK-4 → TASK-5 → TASK-6. Параллельно можно только независимые read-only review; все write/apply/rollback строго последовательны.

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

## Preflight и отказ

Source SHA/private candidate SHA заданы в 05; непосредственно перед apply сравнить live заново. Перед любыми бизнес-операциями подтвердить global payments false, exact sole allowlisted account приватно, TEST shop и test=true/test_ признаки. Не использовать real secret как fallback, не менять callback provider settings/allowlist. Main DB и legacy DB не перемещать; snapshot DB/data identity не обещает неизменность business rows при допустимом TEST CJM. Health snapshots сравниваются до/после routing apply до начала TEST writes.

Полный backup хранить с0600 вне repo. Single-file bind mount запрещает atomic rename host file; use one held fd, full write+truncate+fsync under exclusive ops lock, compare inode + container-visible bytes до validate/reload. Ошибка предварительного candidate validate → live не трогать. Ошибка после записи либо reload/health → немедленный exact rollback и проверка; rollback failed → incident/STOP. Ни одного рестарта других проектов.

## Checkpoints и ограничения доказательства

Фактические requirements/ADR/plan checkpoints NOT RUN; QCSD quality/risk/testability/security NOT RUN; K1/K2 результат будет отдельно измерен, structural PASS не закрывает QCSD. Runtime validation/reload/rollback и TEST CJM NOT RUN. M не требует DDD/fleet9. `studio-extended-qe` используется координатором для risk-selected security/resilience/requirements checks в reference режиме, не claims об установленном AQE runtime.

## Amendments

Пока нет независимых замечаний, принятых как amendments. После QCSD добавлять фиксированные AM строки с реальными test paths; не создавать fictitious pass.

## Уточнение координатора: native binding неизменных владельцев

Три READ-ONLY path реально существуют и прочитаны: billing-handler импортирует clientIp из ip.ts, runtime задаёт trustedProxyHops из существующего config. Текстовое упоминание не заставляет native helper измерить зависимость, поэтому ниже declared inputs5 = WRITE2 + READ-ONLY3. Эти дополнительные inputs не разрешают менять сервер/config и не увеличивают change budget/M10. Private executor до apply обязан быть фактически написан, прочитан независимой моделью и проверен по точному SHA; hash/статический mock не заменяют проверку реального исполняемого оператора. До formal QE фактический executor SHA должен быть закреплён в финальном plan/binding; сейчас executor/apply NOT RUN.

После первого K1 NOT-ESTABLISHED выполнен настоящий повтор под Node22 из pinned install: `dz name-check --module test-webhook-route.test --project /tmp/clipmkr-test-webhook-route-20261105 --json`, exit0, outcome free, results[0].verdict free. Исторический отказ не удалён. Это K1 name result, не QCSD/code/runtime admission.

EXPECTED_CODE_TARGETS:
- deploy/test-webhook-route.caddy
- tests/test-webhook-route.test.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/ip.ts
- packages/shared/src/config.ts
