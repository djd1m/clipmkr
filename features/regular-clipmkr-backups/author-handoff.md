# Author handoff: scoped ideation rework

Автор финального плана: `gpt-6-astra xhigh`, отдельная сессия `/root/backup_final_planner`. Будущий code author: `gpt-6.1-sol high`; код не создавался. Handoff не является reviewer entry/closure и не утверждает approval.

Пересмотрены ровно три normative inputs для нового ideation snapshot:

- `features/regular-clipmkr-backups/01_requirements.md`
- `features/regular-clipmkr-backups/03_adr/001-reuse-native-restic-without-global-retention.md`
- `features/regular-clipmkr-backups/05_architecture.md`

| Actual condition | Исправление и место | Будущая Confirmation в `tests/backup-clipmkr.test.ts` |
|---|---|---|
| Q-STAGING-01 | 01 FR-5/NFR-2; ADR Decision;05 «Собственный staging и capacity»: hook-only cleanup под lock;≤2 sets≤1GiB,normal≤1; orphan recovery до candidate, protected authoritative/foreign paths;≥8GiB pre-capture/≥7GiB pre-restic,5GiB app reserve и actual cap | `staging_repeated_failures_and_orphans_remain_bounded`; `capacity_preflight_refuses_before_bulk_capture`; `staging_cap_aborts_without_publication` |
| RISK-01 | Тот же согласованный staging/capacity контракт; обе originating IDs сохранены, closure каждой выполняет её роль | Те же AM-1/AM-2 checks с repeated failure, interruption, orphan, low-space и foreign sentinel fixtures |
| RISK-02 | 01 FR-1/явная scope delta; ADR Decision;05 «Authoritative spend JSONL»: opened device/inode/S, complete prefixB≤S, parse every full record, excluded tail/count/hash/times; append beyondS вне среза, observed rotation/truncation/change/invalid full record refuse. Scratch stt/llm/video excluded/rebuildable, durable uploads/config/spend required | `spend_capture_preserves_valid_source_bound_prefix`; `spend_rotation_truncation_or_invalid_record_refuses_publication`; `rebuildable_scratch_is_explicitly_excluded_from_capture` |

Нормативные bytes заморожены для host prepare; native author field и reviewer entries записывает координатор/соответствующие роли, planner их не менял. Updated06 содержит dependencies/TASK-1…TASK-5, AM-1…AM-4 с exact test path, literal шесть targets в конце. OpenSpec дельта и `requirements-revision.json` синхронизированы с этими контрактами. Старые reports не переписаны.

Реальный K1 по сообщению координатора: `dz name-check --module` для backup-clipmkr, clipmkr-prepare, clipmkr-backup, clipmkr.backup-manifest — каждый exit0/free,463 JS/TS files; все6 exact target paths отсутствовали. Evidence `/root/.config/clipmkr/backup-audit-20261110/k1-summary.private.json`. Ограничение: scanner не ищет shell/unit symbols; новый scanner не добавлялся. K2 — после final plan и действительного review closure, пока не заявлен PASS.

Coder перед Step7 получает actual permitting receipts от координатора. Реализует только6 targets, native tools, стабильные restic tags clipmkr/corp-infra (run ID только manifest/receipt), существующие env/routes/lock. Не добавляет framework, quota daemon, контейнеры/зависимости, retries, repo-retention правки или restore в timer. Наблюдаемые paths restic/rclone — `/usr/bin/restic`, `/usr/bin/rclone`. Host shellcheck и redis-check-rdb не найдены: shellcheck честно NOT RUN, native Redis checker подтвердить в существующем container до его применения. Обязательные bash-n/focused tests/native roundtrip не заменяются отсутствующим инструментом.

Порядок возврата координатору: new host prepare → author conditions/path handoff → originating focused verify → actual evaluate → final Step6/K2 checkpoints → Sol code. Planning rework не исполнял runtime/backup/restore/tests, не делал commits/push. Capacity observations — sizing evidence, не доказательство capture; actual measurements и restored JSONL parse остаются acceptance.

## Следующая scoped delta: собственный descriptor вместо global registry

Фактическое discovery 10.11.2026: координатор обнаружил, planner отдельно read-only подтвердил, что `/opt/corp-infra/bootstrap/schemas/backup-manifest.schema.json` содержит13 service enum values без `clipmkr`. Это не reviewer condition и не synthetic receipt. Global registration/daily capture integration из прежнего проекта неприменимы; foreign schema менять нельзя.

Новая freeze тех же трёх normative inputs:01 FR-4/граница интеграции; ADR Context/Decision/Confirmation;05 diagram/interfaces/lock ownership. Решение: repo target `ops/backup/clipmkr.backup-manifest.json` остаётся, устанавливается только в `/etc/clipmkr/backup/clipmkr.backup-manifest.json` как trusted root0600 JSON descriptor собственного hourly wrapper. Минимальный fixed-field parse/allowlist; никаких schema/framework/provided executable hooks. Capture helper вызывается только wrapper под настоящим shared lock; global registry/rescan/schema/daily hooks не трогаются. Existing native restic/rclone/repo/env/routes/sharedlock/local retention сохранены. Шесть code targets неизменны, staging/JSONL контракты не пересмотрены.

В06 добавлен AM-5 → `hourly_descriptor_avoids_global_registry_and_daily_hooks` in `tests/backup-clipmkr.test.ts`: реальный fixture проверяет descriptor ownership/parse/path refusal и отсутствие global writes/rescan/schema/daily integration. Это план теста, не выполненное доказательство. Текущий host prepare/author entry и originating focused verify только этой delta выполняет координатор; старые проходы не объявляются approval новых bytes. Затронутые coding paths ждут actual permitting gates.
