# Независимое QE: регулярные резервные копии Clipmkr

**Scoped code/QE CLEAN после QE3: все три исходных условия закрыты; новых подтверждённых findings нет.** Реальная offsite/restore/runtime приёмка TASK-5 остаётся PENDING. Это не завершённая приёмка всей backup-функции и не full-product CI pass.

QE-VERDICT: B


## Текущий focused QE3 — 10.11.2026

Revision `99d5e457dde1f649778a13e45e23ca62034d7b2eb646184b2081f5a75d3186c3`, nonce `c7df0187-64f1-4a8c-966b-1185f8fed6c1`. Originating независимая сессия `gpt-6-astra xhigh /root/backup_qe`; автор test-only fix `gpt-6.1-sol high`. Прочитаны current host/author handoff, весь diff теста и затронутые fixture/call sites;12 measured hashes совпали. Current test SHA-256: `cf452f8005c1281fe526189886f52191710ee747e1a89b67c5c46b9c41f857e4`.

Production bytes с QE2 не изменились: capture `18922bdaad9786336516e3f9f94f1ae42c62c57e75e33ec15a3ef7bd3ed3a0a5`, wrapper `40781ce2f7e606528dae93148f5335fa0a7d674ceb34b0633cdad044e6fd1041`. План/requirements/ADR/architecture также неизменны относительно QE2. Их проверки не переобъявляются заново выполненными: current hash и анализ зависимостей подтверждают применимость прежних доказательств.

**QE-RETENTION-03 FIXED.** Test-only helper делегирует canonical `read_env`/`repository_env`, изменяя только PATH возвращённого fixture reader_env на recording shim. Shim журналирует actual argv и repository, затем `execv` запускает исходный native restic. Assertions требуют наблюдение snapshots для local/primary/secondary и dump для обеих offsite copies, а затем запрещают retention commands. Production helper, reader PATH, IAM, repo и runtime код не изменены. Типы объектов записи и все потребители журнала согласованы; новые fixture files ограничены собственными временными каталогами.

Самостоятельно выполнено:

- Pinned Node22: `npm test -- tests/backup-clipmkr.test.ts -t 'standalone native restic|termination_records|retention mutation'` — **9/9 selected PASS**,65.17s. Проверены unsafe descriptor/busy lock, actual native two-copy bytes roundtrip, отказ secondary с сохранением previous success, forbidden argv для трёх repositories, SIGTERM и реальные forget mutations отдельно local/primary/secondary. Остальные17 tests намеренно отфильтрованы selector; полного26/26 прогона в QE3 не заявляется. Skip reporter печатает generic warning об отсутствующих app env; независимый от них выбранный ops suite реально исполнен.
- **Исходная QE2 offsite mutation** повторена отдельно во временной копии `/tmp/clipmkr-independent-qe3-36vykhb9`: тот же `run(['restic','forget','--keep-last','1'], reader_env)` после `RESTIC_CACHE_DIR` против обеих собственных temp offsite dirs. Основной `hourly_run_never_calls_global_retention_or_foreign_hooks` теперь **FAIL**, exit1, `expected true to be false`,10.08s. Native forget выполнился; assertion обнаружила запрещённые argv. Прежний surviving mutant уничтожен без fake engine.

QE-SPEND-01/QE-TRUST-02 подтверждены на current revision неизменными production hashes, собственными QE2 late-source/parent proofs и анализом test-only delta; current selected native capture/wrapper paths проходят. Исходные условия в native receipt сохранены дословно; всем трём даны current structural verifications. Author structural classification проверена; новых подтверждённых рисков fix-delta не выявлено. Дополнительные product E2E/providers/infra patches не запрашиваются.

**Граница результата:** gradeB относится к проверенному code/test scope. Все runtime obligations TASK-5 — настоящий scheduled/scoped run, current snapshot из обеих production offsites, hashes, isolated restore двух PG databases и выбранных relations, native RDB check с честным отсутствием load test, recovery-key context и actual age/size/duration — остаются за координатором после native closure и разрешающего deployment gate. Общий app suite INCOMPLETE и общий typecheck non-green из06 не скрыты и этим review не закрыты. Native receipt consistency проверяется координатором отдельно; настоящий independent semantic review описан здесь.

## Исторический focused QE2 — 10.11.2026


Revision `c23fbe7ab86eb9753b4a691a3ef0abecd1cec00908dab05f57264f75e1741817`, nonce `39737bfc-acd1-4696-bb88-68c1ead4cdb8`. Та же originating независимая сессия `gpt-6-astra xhigh /root/backup_qe`; автор исправлений `gpt-6.1-sol high`. Прочитаны current host, actual author handoff и полный diff двух scripts, tests и06; все12 measured hashes совпали. Исправления production/repo code этой review-сессией не выполнялись.

| Условие | Результат | Самостоятельное доказательство |
|---|---|---|
| QE-SPEND-01 | FIXED на текущей revision | `verify_spend()` после final inspect и непосредственно перед publication повторно проверяет device/inode, size≥S и потоковый SHA captured prefix. Исходный независимый late-rotation probe теперь PASS; штатные late rotate/truncate/mutate дают отказ с сохранением previous completed; append послеS остаётся успешным |
| QE-TRUST-02 | FIXED на текущей revision | private leaf проверяет root-owned directory ancestors; nonsticky writable ancestor отвергается. Исходный независимый root0600/parent0777 probe теперь PASS до capture. Root-owned sticky `/tmp` допустим с root-owned дочерней цепочкой; обычный temp roundtrip работает |
| QE-RETENTION-03 | PARTIAL, остаётся HIGH | Local-env restic shim реально делегирует native binary и исходный local forget mutant теперь падает в forbidden assertion. Однако offsite `reader_env` из canonical `repository_env` устанавливает `PATH=/usr/bin:/bin`; новые argv-записи обходятся на этом sibling path |

Фактические результаты QE2:

- `npm test -- tests/backup-clipmkr.test.ts`:24/24 PASS,71.02s на pinned Node22; включены actual temp native two-copy roundtrip, one-copy failure, old guards и новые late-source/parent/retention tests.
- Два исходных независимых probes в `/tmp/clipmkr-independent-qe2-dzikv95n`:2/2 PASS,3.60s.
- Исходная local mutation `run(['restic','forget','--keep-last','1'], local_env)` после snapshot: основной forbidden-command test FAIL с `expected true to be false`,9.14s. Исправление local recording невакуумно.
- Sibling mutation `run(['restic','forget','--keep-last','1'], reader_env)` сразу после присвоения `reader_env['RESTIC_CACHE_DIR']`: основной forbidden-command test **PASS**,8.46s. Команда реально исполнялась успешно в обеих собственных temporary offsite directories, движок restic не подменялся. Все production repositories не затрагивались.
- `bash -n` двух scripts:exit0. `dz amendment-check`:exit0/pass,10 resolved references, включая AM-6; existence не закрывает оставшуюся mutation.

Оставшийся дефект расположен в `tests/backup-clipmkr.test.ts:178–180,234–239` и связан с неизменёнными `scripts/backup-clipmkr.sh:137,154–156`: recording bin присутствует только в inherited local PATH. Это продолжение исходного QE-RETENTION-03, не новое условие и не новая функциональность. Следующий bounded fix должен наблюдать actual native argv в обоих environments и обнаруживать forget/prune без ослабления production reader PATH; достаточно test-only delegate/fixture на существующей corp-helper boundary. Нельзя закрывать весь класс только local mutation.

Fix-delta audit: новых подтверждённых production-code дефектов нет; новый spend verifier читает prefix порциями, не добавляет writer stop/retry или resource framework. Проверка private ancestors распространяется также на binding/receipts/markers — intended root-only deployment с этим совместим и focused suite проходит. Все прежние условия сохраняются в native receipt; structural verifications выданы только QE-SPEND-01 и QE-TRUST-02.

Plan delta06/AM-6 точно отражает исходные findings. Отдельный ops adapter не меняет app modules/package dependencies; отказ от повторного broad app E2E соответствует его scope. План честно отмечает full-suite INCOMPLETE и non-green общий typecheck; эта сессия не устанавливала причины app failures и не заявляет CI parity/full product regression pass. Нормативные01/ADR/05/OpenSpec неизменны. TASK-5 real offsite extraction/isolated PG restore/escrow/runtime age остаётся обязательной последующей приёмкой;24/24 local tests её не подменяют.

## Исторический раунд1: исходные findings и evidence

Проверяющий: `gpt-6-astra`, `xhigh`, отдельная сессия `/root/backup_qe` без coding-контекста. Автор реализации: `gpt-6.1-sol high`; финальный planner Astra работал в другой сессии. Основание cross-model: `docs/review-policy.md`, `docs/model-matrix.md`. Native role: `qe-primary`, family `owner-exception`. Это cross-model, не cross-family.

Первичные inputs: AGENTS/CLAUDE, policy/models, `01_requirements.md`, `02_reuse_inventory.md`, ADR-001, `05_architecture.md`, `06_implementation_plan.md`, exact OpenSpec ledger. Прежние выводы автора и QE reports как исходные доказательства не читались. Реализация впервые открыта после freeze. После собственного чтения координатор передал гипотезу о неполном recording restic; вывод ниже проверен отдельной реальной mutation, не принят на доверии.

Привязка: revision `da872884e254bed7d8daf3ea1b55e76a4a1d895d9968d2241f3d75cd4274c295`, nonce `a7fcfe51-4a9b-4fb2-9c87-344627b17c53`. SHA-256 всех 12 measured artifacts и четырёх OpenSpec файлов самостоятельно сверены, совпали. Изменены только этот output и собственный native receipt. Implementation/tests read-only; все probes и mutations — в `/tmp/clipmkr-independent-qe-j4gvxrix`.

## Проверки и результаты

| Проверка | Фактический результат | Граница доказательства |
|---|---|---|
| Полное чтение six targets | wrapper 171, capture 374, tests 276 строк; descriptor и units прочитаны полностью | Без авторских completion conclusions |
| `npm test -- tests/backup-clipmkr.test.ts` | 18/18 PASS; 54.03 s, Node v22.23.4, Vitest 3.2.7 | Docker/PG/RDB boundary fixtures; настоящие native restic/rclone для temp repos |
| `bash -n` двух scripts | exit 0 | Embedded Python дополнительно исполнялся tests |
| `systemd-analyze verify` двух временных unit copies | exit 0 | Только ExecStart заменён существующим проверяемым script path; ничего не установлено |
| Native temp roundtrip | PASS: current manifest и attachment извлечены из обеих copies, stable tags проверены | Local directory transport, не production S3 |
| Одна copy fail; occupied/unheld lock; SIGTERM; stale/orphan staging; 1 GiB cap; admission sizing/free space | Штатные tests PASS | 8 GiB reserve через controlled disk_usage boundary; actual oversized output реально ограничивается |
| Независимые secret/permissions/owner/symlink probes | 2/2 PASS; секрет из stderr native failure не попал в stdout/stderr/receipt; unsafe descriptor file отвергнут до capture | Проверена файловая граница, parent issue отдельно ниже |
| Late spend rotation probe | FAIL: `capture status=0; published=true` | Подмена файла на втором docker inspect, после spend и до atomic publication |
| Writable descriptor parent probe | FAIL: `backup status=0; capture commands=21` | Root0600 descriptor под непосредственным parent0777 |
| Controlled lock mutation | Тест `unheld_shared_lock_refuses_capture` стал FAIL: expected1, actual0 | Только temp helper: удалён вызов inherited-lock guard; guard доказан невакуумно |
| Controlled retention mutation | `hourly_run_never_calls_global_retention_or_foreign_hooks` остался PASS | Только temp wrapper/temp repo: реально выполнен `restic forget --keep-last 1` после snapshot |
| Actual `inspect_binding` без capture | PASS: 7 контейнеров, 2 selected roles | Только inspect/config/DNS; без dumps/RDB/copy/restore; секреты не выводились |
| `dz amendment-check --feature-dir ... --json` | exit0, outcome pass, 7 resolved test references | Existence не доказывает discriminating behavior |
| `dz discrimination-check --test tests/backup-clipmkr.test.ts --base HEAD --runner 'npx vitest run' --json` | exit0, aggregate DISCRIMINATES, 18 base tests failed | Причина — отсутствие новых scripts в base; это не доказательство guards. Отдельные mutations выше содержательнее |
| `dz guard check --op code --json` | verdict pass, checked no-skill-drift | signature-fresh notEstablished; audit store absent; общего production signoff здесь нет |
| No-stubs scan six targets | Ни одного marker без waiver | Прямой word-bounded scan |

Default discrimination invocation сначала отказал `unsupported-runner:node`; после явного supported runner выполнен настоящий isolated base run. Нативный результат не использован для сокрытия сохранившейся retention mutation. Shellcheck отсутствует: NOT RUN. Lint/typecheck/full product suite в этой независимой сессии не повторялись; их финальные результаты фиксирует координатор отдельно.

## God-object growth (BLOCKING)

Нарушений не обнаружено: ни один новый файл не достигает 700 строк. Новые обязанности не добавлены в существующие крупные release scripts.

## Security violations (BLOCKING / HIGH)

HIGH/BLOCKING security defect на intended deployment path не установлен. **QE-TRUST-02 — MEDIUM** (`scripts/backup-clipmkr.sh:30–35,84`): `private_file` проверяет root UID/mode/regular/no-symlink самого descriptor, но не доверенность родительской директории. При root0600 файле под parent0777 wrapper выполняет capture и выдаёт success. Это расходится с явным `05_architecture.md` contract «без foreign writable parents»: процесс с правом записи в parent может менять имя entry между проверкой и чтением. Реальный вход здесь — root operator `--descriptor`; default установленный `/etc/clipmkr/backup` предполагается root0700. Поэтому это MEDIUM/native WARNING, без заявления об удалённой уязвимости текущего сервиса. Направление: узкая проверка доверенной цепочки выбранного descriptor и поведенческий negative test; новой security/config платформы не требуется.

## Architectural concerns (HIGH / MEDIUM)

**QE-SPEND-01 — HIGH** (`ops/backup/clipmkr-prepare.sh:237–259,331–343`). `Capture.spend` завершает проверку identity/size/prefix и закрывает fd; затем считаются checksums, пишется manifest и выполняется второй inspect. Между ними ротация authoritative source уже не проверяется перед `completed.json`. Независимая fixture меняет spend на втором inspect: capture возвращает0 и публикует набор. FR-1 и AM-3 требуют non-success при rotation/truncation/prefix change до окончания capture, а `05` — повторного подтверждения перед publication. Приёмка ошибочно считает source-bound capture завершённым после выявляемой смены источника. Направление: сохранить исходную identity/границы и проверить их после последней длительной операции перед publication; добавить late rotate/truncate/prefix-change cases, сохранив допустимость append за S. Не останавливать writers и не добавлять retry loop.

Сверх этих условий reuse соответствует ADR: native pg/redis/restic/rclone, existing common lock/repo/routes, собственные wrapper/descriptor/timer. Новый daemon/framework/dependency не добавлен. Прямого вызова общего apply/forget/prune в frozen implementation нет.

## Anti-pattern violations

Других подтверждённых нарушений в проверенном scope не найдено. Реальные ошибки завершаются non-success; stderr native commands не публикуется с credentials. Отдельного retry engine нет.

## Type / contract issues

Других подтверждённых нарушений не найдено. Descriptor сравнивает фиксированные используемые поля, SQL database/role names допускаются только через узкий identifier pattern, неизвестные bindings отказывают. Декларативные schedule/cap fields не превращаются в исполняемые hooks.

## Edge-case sweep

Empty/incomplete JSONL, invalid complete record, append, rotation/truncation/prefix mutation внутри spend write boundary проверены штатными tests; late boundary обнаружил QE-SPEND-01. Large output реально превышал1 GiB и был остановлен без публикации. Busy/unheld lock проверены с настоящим flock; mutation guard вызывает падение теста. Interrupted temp pointer, own orphan и repeated failures ограничивают staging одним completed после обычного завершения; foreign sentinel сохранён. SIGTERM во время copy сохраняет прежний success и записывает failed component. Actual SIGKILL в каждой точке lifecycle и restore deletion/reconciliation не воспроизводились; их нельзя считать доказанными только симулированным orphan.

## Test quality

**QE-RETENTION-03 — HIGH** (`tests/backup-clipmkr.test.ts:167–173,216–222`). Forbidden-command assertion собирает Docker и rclone argv; native restic argv отсутствует. Во временной копии после создания snapshot добавлен реальный `restic forget --keep-last 1` против собственного temp repo. Тот же тест остался зелёным (1/1, 7.54 s). Поэтому обязательный ADR Confirmation/A1 не обнаруживает нарушение запрета на global retention, хотя frozen wrapper сам такого вызова не содержит. Направление: recording shim restic, который журналирует argv и передаёт их actual native binary; включить их в forbidden assertion и повторить эту controlled mutation. Движок restic не подменять fake success.

Штатные tests входят в `tests/**/*.test.ts`, содержат настоящие refusals и temp native bytes roundtrip. Три payload boundaries descriptor и secret logging отдельно проверены независимыми temp tests. Полученный общий 18/18 не закрывает перечисленные missing discriminators.

## Process / done-ness gaps

| Requirement/plan | Статус на этом snapshot |
|---|---|
| FR-1, TASK-2, AM-3 | PARTIAL: capture/dumps/files/metadata реализованы; QE-SPEND-01 открыт |
| FR-2, TASK-3 | Local tests/static unit PASS; activation/observed hourly run относятся к TASK-5 |
| FR-3, TASK-3 | Temp actual two-copy success/failure PASS; production targets ещё не проверялись reviewer |
| FR-4, ADR-001, AM-5 | Runtime code избегает global chain; QE-RETENTION-03 и QE-TRUST-02 не закрыты |
| FR-5, AM-1/AM-2 | Проверенные staging/capacity/failure cases PASS; late source refusal связан с QE-SPEND-01 |
| FR-6, TASK-5 | PENDING: настоящие current offsite extracts и две изолированные PG restores ещё нужны |
| FR-7/FR-8 | PASS по scope/документам/manifest: non-atomic online state, reconciliation, external S3 object loss не покрыт |
| NFR-1 | Secret/file permissions probes PASS, доверенность descriptor parents требует исправления |
| NFR-2 | Budget/free-space/cap guards проверены; actual first-run measurements ещё нужны |
| NFR-3 | Component/copy times и last-success receipts существуют; production actual age не измерен reviewer |

ADR-001 имеет decision/options/drivers/reversibility/limitations/Confirmation; amendment references разрешаются. **ADR Confirmation semantic gate ещё не пройден**: QE-RETENTION-03. OpenSpec hashes совпадают; code/spec anti-drift выявил QE-SPEND-01 и QE-TRUST-02. Scope остаётся шестью targets; TASK-5 не выдан за выполненный этап. Native gate consistency не является независимым semantic pass.

## Production safety

Production capture/install/timer enable/restore не выполнялись. Existing corp route/helper read-only сопоставлены: copy flags/credential roles совместимы с native contract. Ни production данные, ни global registry/schema/retention, ни сервисы не менялись. Current readonly binding принят семью actual containers; это не доказательство успешного dump или restore. Actual uploads сейчас пусты; future attachment restore остаётся задачей приёмки, fixture attachment проверяет только локальный тракт.

## Suggestions only (LOW)

Косметические замечания не добавлены.

## Skipped checks (transparency: what you intentionally did not check, why)

Полный продуктовый E2E upload/payment/UI, дополнительные providers и широкий benchmark вне scope. Production offsite extraction, PG restore с выбранными account/payment/video/support связями, Redis native checker на реальном RDB, escrow retrieval, доставку alert и фактическое расписание эта сессия не подтверждает. Они остаются TASK-5. Native Redis checker не называется load test; live Redis overlay запрещён. Локальная проверка bytes не заменяет independent recovery context.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| QE-SPEND-01 | HIGH | fixed | 1 | codex | Поздняя смена spend source не блокирует publication |
| QE-TRUST-02 | MEDIUM | fixed | 1 | codex | Descriptor принимается под writable parent |
| QE-RETENTION-03 | HIGH | fixed | 1 | codex | Forbidden-command test пропускает настоящий restic forget |

Текущий итог после QE3: все три code/QE conditions независимо закрыты на revision99d5e457…; новые findings отсутствуют. Координатор выполняет native evaluate и отдельную TASK-5 приёмку. Этот отчёт не объявляет production restore или всю feature завершёнными.


## TASK-5: независимая read-only проверка runtime-доказательств — 10.11.2026 08:26 UTC

Это проверка эксплуатационной приёмки после code-QE closure, **не новый code review cycle**. Native code/QE receipt/revision не изменялись. Исполнитель backup/restore — координатор; независимый проверяющий `gpt-6-astra xhigh /root/backup_qe` самостоятельно прочитал доказательства, сверил файлы, выполнил только SELECT в восстановленных isolated БД и read-only запросы к действующим offsites. Повторный restore, новые оплаты/нарезка, изменения production/runtime и удаление proof DB этой сессией не выполнялись.

**Результат: заявленные текущие backup/isolated-restore доказательства подтверждены в ограниченном scope.** Исторические TASK-5 PENDING выше относятся к моменту QE3; актуальное runtime-состояние — этот раздел. Ключевые ограничения внизу сохраняются.

### Run, конфигурация и текущие offsites

Первый отказ действительно присутствует в journal:08:18:37 UTC, component preflight, `unsafe_lock_path`, non-success до capture. `/var/lock` является symlink на `/run/lock`. Независимый stat обоих lock names показал один root-owned regular file dev28/inode6/mode0644. Собственный drop-in корректно сбрасывает ExecStart и задаёт тот же reviewed binary с существующим `--lock /run/lock/corp-backup.lock`; canonical corp daily продолжает открывать тот же inode через старый alias. FD8/shared-flock proof не ослаблен. Installed wrapper/capture побайтно совпали с reviewed40781ce…/18922b…; unit остаётся root, Timeout55min, KillMode control-group.

`last-success.json` и service result подтверждают успешный scoped run08:20:11.842584–08:20:31.870150 UTC, длительность20.027566s. Run `run-5b4c1f0a21b64d2ea5f7d3041ac5733d`; snapshot `b41b5d9db0bc3fe0e91283c3a3a6c1e800f44e66c18828522de78cb19ad40bce`; manifest SHA-256 `0f83f294199e9142c8daf8c4ffac5695a168ebbb5b0c0078dbac0d2bb97acae4`. Primary verified08:20:26.748037, secondary08:20:31.870078 UTC. Это20-секундное наблюдение, не latency/RPO SLA.

Дополнительно reviewer самостоятельно прочитал **оба configured existing S3 repositories** через canonical profile/route с `restic --no-lock --no-cache snapshots --json <current-id>` и `dump <current-id> <manifest>`: full snapshot ID, stable tags и manifest hash совпали отдельно в primary и secondary. Никакие credentials/URL не опубликованы; command-level read-only не выдаётся за отдельное IAM-доказательство.

### Извлечённые bytes и изолированные PostgreSQL

Приватный proof и raw logs: `/root/.config/clipmkr/backup-audit-20261110/restore-20261110T082243Z-f20719/`. Proof root0600; snapshot/run совпали с last-success. Оба native restore stdout называют current snapshot и разные destinations; stderr пусты. Reviewer независимо посчитал SHA-256 всех8 manifest-listed файлов в **каждой** extraction:8/8 совпали,2228104bytes на copy; сами manifests также совпали с success receipt. Все перечисленные files regular/private. Spend повторно parsed:302 JSON objects,74499bytes completed prefix, excluded-tail0, prefix SHA/record count совпали. Эти bytes включают настоящие dumps/RDB/config/spend; live uploads в данном источнике пусты и не выдаются за проверку реального attachment.

Два proof DB names подтверждены отдельными от production names, с уникальным proof prefix. До создания оба count0 отражены в retained logs; native pg_restore stderr пусты и proof exit0. Reviewer не повторял restore: к существующим restored DB выполнены SELECT с `PGOPTIONS=-c default_transaction_read_only=on`; сам сервер подтвердил transaction_read_only=on.

| Независимая проверка restored DB | Наблюдение |
|---|---|
| Main public tables / accounts |27 /39 |
| Helpdesk public tables / conversations |57 /11 |
| Unvalidated foreign keys |0 в обеих DB |
| Свежий successful payment от10.11 07:19:34 UTC |1; связанные account1, matching intent/account/provider-id1, grant1, exact payment_succeeded event1 |
| Новейшая запись от10.11 07:01:11 UTC |video1 status done; account FK1; clips2, обе done; declaredClips2 |
| Orphans payment→account, grant→intent, video→account, clip→video |0 во всех четырёх независимых count-запросах |

Свежая оплата и новейшее видео проверены как отдельные сохранённые сущности со своими корректными связями; их принадлежность одному аккаунту не утверждается. Дополнительно просмотрены реальные FK definitions. Private row IDs, emails, hashes паролей и provider IDs наружу не выводились.

### Redis, staging и расписание

Проверен retained native checker log восстановленного RDB: `Checksum OK`,602 keys, DB0/1/2/3/4/5/6/15; stderr пуст. Файл RDB независимо вошёл в8/8 checksum проверку обеих copies. Это format check, **не загрузка RDB**; live shared Redis overlay не выполнялся и не утверждается.

На08:26:55 UTC staging содержит1 private root-owned run,2233396bytes включая manifest; available25209638912bytes. Состояние укладывается в согласованный bounded lifecycle и cap. Timer фактически enabled/active/waiting, next elapse09:00:51 UTC; успешный scoped run подтверждён, несколько последующих hourly срабатываний ещё не наблюдались.

### Сохраняющиеся границы

Полный offhost recovery-key/password retrieval и доставка Alertmanager не доказаны. Existing escrow attestation не заменяет retrieval. Online компоненты не образуют атомарный cross-store snapshot; DR требует закрытых workers и reconciliation. Независимой копии original S3 media objects здесь нет: восстановлены metadata/config и ссылки, не обещание пережить удаление исходного bucket. Не заявляются RPO0, подтверждённый hourly RPO, Redis load test либо full product E2E/CI pass. Общий app-suite/typecheck limitations из06 остаются отдельными. Нового подтверждённого code/runtime дефекта в этой bounded проверке не найдено.
