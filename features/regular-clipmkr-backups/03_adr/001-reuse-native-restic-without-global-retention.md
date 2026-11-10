# ADR-001: Переиспользовать native restic и immutable offsite copy без общего retention запуска

## Status
proposed — обратимо до установки собственного descriptor/timer; пересмотреть при появлении поддерживаемого scoped snapshot-only phase или отдельного охвата S3 объектов. Согласование/исполнение не заявляются.

## Context

После переноса активные PostgreSQL/Redis/mounts Clipmkr не входят в существующий backup. Corp infrastructure уже имеет restic0.16.4, local encrypted repo и две immutable S3 copies, systemd/registry/hooks/lock. `backup.sh --service` фильтрует snapshots, но затем выполняет global forget, verify и post-run: этот путь нарушает запрет менять чужую retention/задачи. Полная остановка приложения не разрешена; online атомарности нескольких хранилищ нет. Общий backup FAIL из-за чужого hook отделён от отсутствия Clipmkr coverage.

Дополнительное фактическое discovery: установленная `/opt/corp-infra/bootstrap/schemas/backup-manifest.schema.json` исключает `clipmkr` из service enum. Прежняя идея зарегистрировать Clipmkr в global registry неприменима без foreign schema change, которого этот scope не разрешает. Выбрано убрать global/daily integration и оставить один собственный hourly путь; common native engine/lock/repo/retention переиспользуются.

## Decision Drivers

1. Сохранность текущих аккаунтов/платежей/записей и проверяемая восстановимость (high; FR-1, FR-3, FR-6).
2. Отсутствие воздействия на чужие сервисы и минимальный собственный код (high; FR-4, NFR-2).
3. Правдивый scope и регулярное измеримое выполнение (high; FR-2, FR-5, FR-7, FR-8, NFR-3).

## Considered Options

| Вариант | Сильная сторона | Ограничение |
|---|---|---|
| `backup.sh --service clipmkr --phase run` | Готовые hooks, markers и sync | Global forget/post-run затрагивают чужую инфраструктуру; отвергнут |
| Минимальный Clipmkr capture hook + thin native CLI wrapper | Уже установленные restic/rclone/профили/общий lock; не нужен новый сервис | Узкий command contract copy повторяется из corp; совместимость надо проверить |
| Отдельный backup product/repository/контейнер | Независимый lifecycle/retention | Новая платформа, ключи/доступы/инфраструктура; сложнее текущего scope |

## Decision

Выбрать второй вариант: шесть code/config/test targets, один capture helper и короткий wrapper с общим flock, native `pg_dump -Fc` двух runtime БД, `redis-cli --rdb` dedicated общего Redis и явным production files/config allowlist. После проверок атомарно публиковать completed staging, делать `restic backup --tag clipmkr --tag corp-infra`, затем existing `rclone copy --immutable --checksum` local restic tree в оба настроенных offsite. Проверять текущий snapshot identity и содержимое каждого offsite чтением, не только общий last-offsite marker. Не вызывать forget/prune, общий apply, чужие hooks и не source-ить исполняемый backup.sh.
Repo target `ops/backup/clipmkr.backup-manifest.json` остаётся одним собственным descriptor: trusted root-only JSON в `/etc/clipmkr/backup/clipmkr.backup-manifest.json`, только для hourly wrapper. Он не ставится в `/var/lib/corp-infra/manifests/`, не валидируется как corp manifest и не добавляет hook в daily; foreign schema/registry не изменяются. Wrapper проверяет только фиксированные необходимые поля/типы/allowlist, без новой schema/platform. Hourly wrapper сериализуется с existing daily по одному lock; самостоятельный capture вне доказанного shared lock отказывает. Фактическая политика daily local forget остаётся прежней и может убрать hourly snapshots из local repo; offsite append-only retention не меняется. `restic copy` не используется: действующие зеркала repo tree могут иметь один repository ID и append-only credentials.

Уточнение по `Q-STAGING-01`/`RISK-01`: hook — единственный cleanup owner собственного staging под тем же lock. Максимум 2 набора по ≤1 GiB (authoritative + candidate/остаток прерванной замены), после нормального окончания максимум 1 completed. До candidate очищаются только own orphan/superseded; действующий include сохраняется до атомарной замены. Unknown ownership/path/symlink вызывает отказ; production/foreign/repo данные не удаляются. После прерывания следующий holder lock завершает cleanup до нового capture. Last success receipt не зависит от удаления staging.

Фиксированный budget: read-only conservative sizing с 25% запасом ≤1 GiB; перед bulk capture free space ≥8 GiB на staging/repo FS (1 GiB capture + 2 GiB repo/cache headroom + 5 GiB app reserve), перед local restic повторно ≥7 GiB на repo FS. Запись каждого набора ограничивается 1 GiB, а не проверяется только после исчерпания диска; неизвестный sizing, excess/cleanup/capacity failure — non-success без publication/нового success. Это собственный admission guard, не новая quota/retention платформа и не защита от всей конкурирующей записи приложения. Подробный lifecycle и filesystem boundaries — `05_architecture.md`.

Уточнение по `RISK-02`: `model-spend.jsonl` сохраняется как завершённый валидный prefix открытого authoritative source. Начальные device/inode и размер S связывают snapshot; B — конец последней newline-terminated записи ≤S. Все полные строки — валидные JSON objects; partial tail S−B явно исключён и отражён в manifest. Append после S не входит; обнаруженные rotation/truncation/prefix change/invalid complete record блокируют publication. Manifest фиксирует identity/S/B/record count/hash/времена. Rebuildable stt/llm/video workfiles отделены от durable uploads/config/spend и не обещают coherent state. Writers не останавливаются.

Restic tags остаются стабильными `clipmkr`, `corp-infra`; run ID только в manifest/receipt. Уникальный tag на каждый run создал бы отдельные группы existing retention по host,tags и потому запрещён.

## Rationale

D1: native dumps/RDB сохраняют форматы maintained OSS и допускают изолированный restore; прежний migration snapshot не заменяет текущие данные.
D2: wrapper решает только capture+backup+copy, без нового крипто/retention/scheduler движка; unsafe scoped apply исключён явным тестом.
D3: receipt содержит component intervals, snapshot ID, две copy проверки и actual age; не скрывает неатомарность и непокрытый S3 object loss.

## Consequences

Положительные: текущие данные попадают в существующие encrypted repos; нет новых контейнеров и downtime; чужой hook не блокирует hourly Clipmkr.
Отрицательные: online cross-store consistency восстанавливается reconciliation при закрытых workers; весь Redis RDB содержит другие DB этого же dedicated Clipmkr daemon; local hourly history ограничена общей политикой; offsite история не получает нового SLA. Thin wrapper надо перепроверять при изменении установленного corp copy contract.
Наличие backup не доказывает recoverability без доступного escrow/password вне VPS. Проверка metadata и offsite чтения — обязательная граница приёмки; общую инфраструктуру escrow здесь не ремонтировать.
Follow-up ADR: только при запросе независимой копии S3 объектов или изменении corp движка.
After-action review: оператор Clipmkr через месяц после реальной активации, по run age/длительности/размеру/restore evidence.

## Confirmation

- Method: focused CLI integration и независимое cross-model QE, затем один scoped scheduled run и изолированный offsite restore drill.
- Monitoring: журнал собственного systemd unit и root-only receipt с last attempt/success, component times, snapshot ID и двумя verified copy times; фактический канал уведомления проверяется отдельно.
- Success metric: все обязательные компоненты читаются из каждого offsite; две БД восстанавливаются из одной проверенной offsite copy; production/foreign markers не изменены.
- Owner: оператор Clipmkr; приёмка владельцем/координатором по native gates.
- Load-bearing property: stale data/partial capture/одна missing copy/чужой lock/binding drift не образуют success; никакой global forget и restore в live namespace.
- Required automated check: `tests/backup-clipmkr.test.ts` — failures/stale/bindings/lock/forbidden commands и actual temp restic+rclone roundtrip с fault одной copy; `staging_repeated_failures_and_orphans_remain_bounded`, `capacity_preflight_refuses_before_bulk_capture`, `staging_cap_aborts_without_publication`, `spend_capture_preserves_valid_source_bound_prefix`, `spend_rotation_truncation_or_invalid_record_refuses_publication`. Fixtures обязаны вызвать safeguard, не только проверить наличие ветки. На момент planning эти тесты ещё не реализованы/не исполнены.
- Integration Confirmation: `hourly_descriptor_avoids_global_registry_and_daily_hooks` в `tests/backup-clipmkr.test.ts` проверяет собственный descriptor path, fixed-field refusal и отсутствие writes/rescan/schema changes/daily registration; существующий общий lock по-прежнему блокирует concurrent capture.
