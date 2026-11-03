# Focused native QE — cycle2, qe-primary

Текущий вердикт: **NO-GO для code GO**. Исправления исходных **QE-P01…QE-P09 проверены** на текущей ревизии; найден новый **QE-P10, HIGH, structural**. Это code review, а не акт готовности продукта. Final product acceptance не установлена и остаётся отдельной задачей root.

## Привязка и независимость

- Actual selected model: **gpt-6-astra**, роль `qe-primary`, family `owner-exception`.
- Exec session/thread: `01a1a267-4905-79c1-8d8a-019e54e458f4`; идентичность подтверждена только соответствующими переменными сессии.
- HEAD: `1fc9622d7bd7dd054e3b141886200c5611516742`; nonce: `2bb33bfb-7366-4621-964d-72f4992cd261`; revision: `e84c1f27a050cf6c098dc99afc06e7f496e306be81894824ed82f67bec8256a0`.
- Это продолжение originating независимого ревью, начатого с документов без coding history. Авторы controller/SDK/app/tests по назначению — `gpt-6.1-terra` и `gpt-6-sol`; process patch/installer/test — `gpt-6.1-sol`. Astra отличается от всех этих моделей. Root integration не считается новым product coding.
- Текущий host содержит 123 измеренных файла. Все SHA256 сверены при исследовании и повторно под reviewer lock непосредственно перед записью. Source/host/history не менялись reviewer-ом.
- Входы: полный перечень согласованных документов сохранён в исторической части ниже; повторно использованы AGENTS.md, review-policy, installed feature-adr `modules/08-qe.md`, обновлённые requirements, ADR-001/002/003, domain/architecture/plan и OpenSpec. Прочитан только собственный прежний отчёт и собственные условия. Current author object/newRisks прочитаны как проверяемое объяснение delta, не как доказательство.
- Source scope основан на Git diff от feature base `119c446ce5bdc7b8f4cc3afa49efce47bd4642a2` и delta от прежнего reviewed HEAD `9b214f401ddcfa193bc455064061a0d2722417ac`. Новые измеренные зависимости не приравнивались к новым правкам. Проверены весь controller с фактическими embedded Python/JS, test fixtures, Compose, SDK, data lifecycle/schema/ownership, runtime/payment/wiring и process compatibility. Generated screenshots и запрещённые как исходные evidence historical ideation bytes использованы только для hash binding.

## Реально выполнено

Node: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`, версия 22.23.4; Python локальный. Окружение запусков очищалось через `env -i`; TMPDIR и логи направлены в разрешённый private каталог своей роли. В безопасном PATH перед системными командами поставлены отказывающие заглушки `docker`/`ssh`; штатные тестовые fake binaries используются там, где тест явно их создаёт.

1. `node node_modules/vitest/vitest.mjs run tests/release-candidate.test.ts tests/release-candidate-acid.test.ts tests/storage-prefix.test.ts tests/payments-guards.test.ts --no-cache` с `N5_ACCEPTANCE=1` и разрешённым `CLIPMKR_REAL_RESOURCE_PROOF`: **52/52 PASS**, 4 файла, 250.77 s. Controller 17, acid 13, namespace 10, checkout 12. Acid читает единственный разрешённый resource proof: проверки его структуры/before-after/fault fields прошли; новых реальных OOM/ENOSPC/Docker faults reviewer не запускал и происхождение private документа внешним runtime не удостоверял.
2. `node node_modules/vitest/vitest.mjs run tests/wiring.test.ts tests/health.test.ts tests/s3.test.ts tests/s3-public-endpoint.test.ts tests/billing.unit.test.ts --testNamePattern='^(?!.*resolves real S3 acceptance)' --no-cache`: **78 PASS, 1 намеренно excluded**, 18.12 s. Исключённый новый тест вызывает настоящий Docker CLI; запрет текущей сессии соблюдён. Это не full-suite PASS. Первый начатый combined прогон был остановлен после обнаружения этой зависимости и в counts не включён.
3. `node --test tests/feature-adr-paths.test.mjs`: **2/2 PASS**, включая 6 K1 и 10 K2 controls; `sh -n scripts/install-process.sh` и `git apply --reverse --check` для обоих process patches — exit0. Installer, init и feature gates не запускались.
4. Собственный `probe_controls.py` исполняет **actual admissionProbe**, подменяя только системные наблюдения/transport. **15 controls PASS**: done с historical UploadId; in-memory mutant старого upload predicate ловится; active upload отвергается; пять endpoint/network ошибок дают ноль SQL; семь изменений contents при прежних IDs меняют data hashes. SQL responses моделируются — это не PostgreSQL integration.
5. Независимый YAML AST control без Docker подтвердил S3 opt-in/env/private mount и отсутствие MinIO dependency. Полное resolved Compose/runtime поведение не заявлено.
6. Новая regression воспроизведена двумя offline controls: настоящая `git rev-parse HEAD` в disposable source-only каталоге — **128**; actual transpiled skip reporter на обязательном skipped resource case с Compose-defined `N5_ACCEPTANCE=1` — **exitCode1**. Fake reporter input доказывает правило отказа, а отсутствие proof env/mount установлено из actual Compose.

Итого 130 Vitest PASS, 1 осознанное исключение; отдельные process и собственные controls указаны выше без суммирования неоднородных assertions. No network/SSH/Docker/API/платных вызовов, secret env и прочих private profiles/receipts не было. Мутации только в памяти или disposable файлах собственного private каталога. Настоящие resource faults, весь suite, build/typecheck/lint/CJM не повторялись за root.

## Проверка исходных условий

| ID | Текущий результат и независимое свидетельство |
|---|---|
| QE-P01 | **implementationVerified:true**. scripts/release-candidate.mjs:855 теперь считает pending по status=uploading; исторический UploadId завершённой video больше не достаточен для отказа. Прочитан actual VideoService.complete. Основные tests 52/52 PASS; дополнительный actual admissionProbe с fake SQL принимает idle done+historical ID, отказывает active upload; in-memory возврат старого предиката делает positive красным. Фактический pending S3 проверяет embedded media verifier. Queued остаётся active workload и требует drain, без изменения данных. |
| QE-P02 | **implementationVerified:true**. checkDataReceipt :715 и remoteExecutor :921 различают initial legacy и steady prefixed; Cloud initial пустой, новые Cloud/site prefixed объекты допускаются. Actual JS media verifier читает только prefixed key для steady, legacy original до/после; negative missing/pending срабатывают. PASS tests verifies legacy and newly prefixed media without another legacy copy и records every runtime identity through A B A B с новым объектом между фазами. Это fake execution, не live A/B. |
| QE-P03 | **implementationVerified:true**. Remote execute/reconcile принимает связанные pending/success/aborted/operator-blocked и сверяет runtime/journal/data под lock без повторного load/up/migrate. PASS группы reconciles unknown remote outcomes before retry: потеря ответа после старта, terminal success/abort, повтор reconcile, до remote intent, чужой binding и активный migrator. Базовый apply имеет положительный путь; lost terminal response больше не блокируется только из-за status success. |
| QE-P04 | **implementationVerified:true**. Controller :1113–1126 берёт упорядоченные local locks, :1251 сохраняет staging intent до transfer; :1023/1059 и receiver :935–1009 используют operation directory, remote flock, durable marker, размер/SHA и безопасный reuse. PASS partial первого/второго transfer, другой operation до terminal отказан и после terminal принят; local contention и remote contention проверены отдельными процессами; A/B/rollback использует разные staging directories. Source-sync сознательно отдельная create-only операция, retry её partial tree требует оператора по runbook. |
| QE-P05 | **implementationVerified:true**. admissionProbe :788–841 проверяет DB/Redis ports/options, effective и runtime app networks, project/service identities, DNS/mount/env overrides и alias collisions до SQL; compose run migrator наследует проверенную конфигурацию. Положительный split-project apply для двух targets и девять отрицательных controls прошли. Собственный actual probe дополнительно отверг DB port, Redis port, effective/runtime network и alias collision при нуле SQL calls. Настоящий DNS/Docker здесь не проверялся. |
| QE-P06 | **implementationVerified:true**. tests/fixtures/environment.ts:58–65 использует явный signing-query allowlist и case-insensitive запрет CopySource query/headers. tests/storage-prefix.test.ts:132–183 прошёл с настоящим AWS presigner для CopyObject и UploadPartCopy, без app middleware, с нулём fake transport calls для запрещённых операций; разрешённые запросы доходят до transport. Реальная сеть не использовалась. |
| QE-P07 | **implementationVerified:true**. checkDataReceipt :688–695 требует 26 известных таблиц и допускает дополнительные измеренные; actual probe :861–873 получает полный public schema, hashes/counts, compareAdmission :911 требует точное совпадение таблиц и исходных columns/count/hash. После добавляющей migration сохраняется исходная проекция. PASS id-only/schema/content/count guards; собственный actual probe меняет hashes partner/partner_code/growth_event/transcript/clip_link/payment/credit_grant при неизменных IDs. Прочитаны blogger-report, PartnerService и migrations026/027. PostgreSQL oracle/restore здесь не исполнялся. |
| QE-P08 | **implementationVerified:true**. Обязательный private receipt до live mutations теперь независимо от N5_ACCEPTANCE; attempts сохраняют exact physical keys, unknown create и полученные UploadIds, cleanup phase fsync-ится. Guest/retention используют exact cleanup и сохраняют primary+cleanup; upload finalize всегда закрывает pool. PASS journal unknown/resolved/failed/complete и AggregateError/pool cleanup controls; source network fixtures просмотрены полностью. Live crash/реальный S3 cleanup этим не заявлены. |
| QE-P09 | **implementationVerified:true**. Исходный разрыв S3 wiring устранён: docker-compose.yml:202–251 отделяет legacy-minio, у test нет minio dependency, переданы N5_PREFIX_RUN_S3 и все N5_PREFIX_S3 inputs, private receipt bind с create_host_path=false; .env.example описывает private opt-in. Независимый YAML AST control подтвердил проводку, формат receipt, зависимости и отсутствие прежних S3 overrides. Docker compose config test намеренно не исполнялся по scope; найденный отдельный разрыв всего test runner зарегистрирован QE-P10. Эта verification закрывает исходные MinIO/N5_PREFIX defects, а не общий acceptance PASS. |


Все девять исходных condition objects сохранены неизменными, включая прежние severity/requirement/scope/evidence. Исторические file:line в них относятся к исходной ревизии. Новые verifications привязаны исключительно к current revision. QE-P09 закрывает исходный дефект MinIO/S3 profile; найденная общая несовместимость runner ниже отдельно запрещает объявлять штатный acceptance путь исправным.

## QE-P10 — HIGH — Штатный test runner не обеспечивает включённые обязательные проверки

**Требование:** FR-9, CP1, TASK-2/3/6; воспроизводимый поддерживаемый acceptance путь без неизбежных failures/skips.

**Trigger:** запуск checked-in Compose service `test` с корректным real-S3 opt-in и private receipt directory.

**Файл/строки:** `docker-compose.yml:218–251`, `Dockerfile:71–74`, `tests/release-candidate.test.ts:51–66`, `tests/release-candidate-acid.test.ts:463–473`, `tests/wiring.test.ts:94`.

- Service запускает весь `npm test` с `N5_ACCEPTANCE=1`, но не передаёт `CLIPMKR_REAL_RESOURCE_PROOF` и не монтирует его. Обязательный acid test неизбежно skipped; штатный reporter делает этот запуск неуспешным. Наличие разрешённого proof на host само по себе не передаёт его внутрь контейнера.
- Controller tests безусловно требуют `git rev-parse HEAD`, `git archive`, `git show` в cwd. `.dockerignore:6` исключает `.git` из build context, а ни test-stage, ни service не создаёт или монтирует тестовый Git checkout. Даже при установленном Git эта ветвь падает. Disposable local control подтвердил exit128; Docker не запускался.
- Новые проверки требуют Python и Docker CLI, но test-stage наследуется от build, добавляет только ffmpeg и не объявляет эти инструменты. Новый wiring test вызывает `docker compose config`; наличие CLI на controller не доказывает его наличие в test image. Тестовый runner должен иметь явный контракт этих зависимостей.

**Исправление/подтверждение:** предоставить полную поддерживаемую recipe/override с требуемыми tool и proof inputs либо автономные disposable Git fixtures/явное разделение host проверок. Нельзя лечить отключением `N5_ACCEPTANCE`, скрытым skip или считать custom host окружение доказательством checked-in image. Проверить существующий и исправленный test runtime на этой границе; положительный full-suite путь исполняет root отдельно.

`.dockerignore`, `scripts/test.mjs`, `scripts/test-skip-reporter.ts` прочитаны как релевантные зависимости, но отсутствуют в текущем measured manifest. При repair их необходимо объявить и измерить. Scope нового condition содержит только уже измеренные дефектные границы. Finding не основан на отсутствии ещё не выполненных live A/B/CJM/payment и не утверждает результат чужого параллельного full suite.

## Матрица expanded QE и anti-drift

| Перспектива | Проверено | Вывод / ограничение |
|---|---|---|
| Функциональность | Исторический UploadId, nonempty canonical whitelist, initial/steady kinds, checkout freeze | Исходные дефекты исправлены; active jobs требуют drain. Owner сохранение всех существующих данных принято без выдуманной synthetic provenance |
| Integration | Actual embedded executor/probe/media verifier, AWS signing, config/adapters | Local fake boundaries PASS; новый разрыв test image/Compose QE-P10; реальных SSH/DB/S3 соединений нет |
| Regression | 130 Vitest PASS, process K1/K2, health offline 200/503 | Full suite root отдельно; 1 Docker CLI test намеренно исключён |
| Security/fences | CopySource query/header, hostile keys/markers, alias/ports/network/DNS options до SQL; private receipt binding | Проверенные controls PASS. Production-wide key остаётся owner-accepted code boundary, IAM isolation не заявлено |
| Resource/performance | Gzip/diff-ID/image parser, filesystem/containerd effective config, combined byte/inode budget, under-lock recheck | Positive и insufficient/tamper negatives PASS; удаление disk gate и подстановка default root ломают tests. Ext4/Docker29 ограничения явные. Peak real disk/RSS не измерен; резерв не атомарен относительно посторонних writers |
| Resilience/mutation | Partial first/second transfer, terminal reconcile, migration/partial start faults, locks, populated A/B sequence, exact cleanup | PASS в fake harness. Process lock holder не равен двум live SSH controllers; реальные kill/network/OOM recovery отдельно |
| Testability | Негативные controls исходных safeguards и собственный old-predicate mutant | Тесты различают проверенные нарушения; runtime contract тестового контейнера FAIL QE-P10 |
| Code/spec traceability | Requirements, три ADR, architecture/plan/OpenSpec, AM-18/19/20 | Owner preservation/checkout safeguards согласованы с кодом; full-suite recipe не завершена. Названные будущие tests и предыдущий design gate не являются execution evidence |

**Author newRisks проверены:** изменения действительно structural и меняют trust boundaries. Independently проверены positive apply, malformed/foreign bindings, new prefixed media, locks/terminal recovery, disk admission до записи/load и owner approval kinds. Author changedScope покрывает host.changedPaths. `authorAssessmentChecked:true`; `deltaVerification.implementationVerified:false` из-за QE-P10. Author PASS/другой reviewer report не использовались.

**Границы code GO и final acceptance:** текущая роль не разрешает code GO до исправления QE-P10. Даже после его закрытия остаются root full suite/build/checks, реальный backup/restore/copy/fenced S3, live runtime provenance и A/B на двух targets, публичный core-CJM и согласованное окно текущего TEST shop с freeze/drain/native/replay/credits/referrals/возвратом callback. Отсутствие этих live evidence само по себе не кодовый дефект. Нет новых IAM keys/403/buckets/ВМ требований, production не переключать. AQE MCP/fleet/runtime не запускались; расширенные перспективы применены одним originating reviewer.

Ниже сохранён исторический отчёт исходного прохода и исправления формы receipt; его прежний NO-GO и counts не являются текущими verifications.

---

# Независимый native QE — qe-primary

Вердикт: **NO-GO для code GO**, девять HIGH structural conditions. Final product acceptance **не установлена** и выполняется root отдельно; отсутствие live proof само по себе не объявлено дефектом.

QE-VERDICT: D

## Идентичность и неизменность снимка

- Роль `qe-primary`, family `owner-exception` по разрешённому cross-model режиму.
- Actual selected model: `gpt-6-astra` (по назначению текущей сессии); exec session/thread ID: `01a1a267-4905-79c1-8d8a-019e54e458f4` (оба идентификатора получены из соответствующих переменных сессии, прочее окружение не выводилось).
- Авторы по заданию: приложение/controller/SDK/tests — `gpt-6.1-terra`; process compatibility patch/installer/test — `gpt-6.1-sol`. Модель reviewer отличается от обоих; это cross-model, не cross-family.
- Base-ref: `119c446ce5bdc7b8f4cc3afa49efce47bd4642a2`; текущий HEAD: `9b214f401ddcfa193bc455064061a0d2722417ac`.
- Native host nonce: `bc1f6e25-4822-48fa-a2fc-4669ff055fa0`; revision: `afdcd9f79b5fb71661f534e766f09eae9292817d18e9462a59aac1cc7c31d644`.
- Actual roster: `qe-primary` и `qe-precision`, оба `owner-exception`. Host не изменялся. 72 manifest entries проверены SHA-256 при исследовании и непосредственно перед записью; несовпадений нет. Hash-only чтение запрещённых как evidence ideation bytes не использовалось для выводов.

## Входы и scope

Сначала прочитаны только согласованные входные документы:

- `AGENTS.md`
- `CLAUDE.md`
- `docs/acceptance/core-cjm.md`
- `docs/review-policy.md`
- `features/cloudru-release-parity/00_complexity_assessment.md`
- `features/cloudru-release-parity/01_requirements.md`
- `features/cloudru-release-parity/02_research.md`
- `features/cloudru-release-parity/03_adr/001-release-manifest.md`
- `features/cloudru-release-parity/03_adr/002-isolated-cloud-candidate.md`
- `features/cloudru-release-parity/03_adr/003-same-bucket-prefix.md`
- `features/cloudru-release-parity/04_domain_model.md`
- `features/cloudru-release-parity/05_architecture.md`
- `features/cloudru-release-parity/06_implementation_plan.md`
- `openspec/changes/cloudru-release-parity/proposal.md`
- `openspec/changes/cloudru-release-parity/design.md`
- `openspec/changes/cloudru-release-parity/specs/release-candidate/spec.md`

Затем прочитаны installed module08 и применимые локальные security/testing/coding-style/secrets-management rules; использованы reference-протоколы brutal-honesty, security, performance, chaos/resilience из установленного feature-adr. Это методические перспективы одного reviewer, не запуски отдельных AQE агентов. AQE MCP/fleet/runtime не запускались и не заявляются. Native prepare уже выполнен host; evaluate/gates/ledger/history reviewer не запускал.

Реализация найдена через Git diff от feature base-ref, а не через прежние отчёты: 55 tracked changed paths, плюс host-discovered untracked artifacts. Проверены controller и весь embedded executor, source/staging/admission/backup/data/storage receipts, SDK internal/signing middleware, env/config/adapters/Compose, billing gate/runtime, Dockerfile/health/build wiring, изменённые тесты и runbook. Отдельно проверены patch `dz-name-check-app-source`, installer и `feature-adr-paths.test.mjs`, а также его зависимость `feature-adr-next-paths.patch` и фактический установленный scanner/checker. Installer не запускался, hooks не устанавливались.

Релевантные неизменённые зависимости проверялись по смыслу: VideoService complete, DB schema/migrator, blogger-report/PartnerService, S3 multipart/presign/erasure и существующие unit-тесты. Неизменённые зависимости не все включены host в manifest: это предел snapshot binding, host при repair должен включить затронутые зависимости. Generated screenshots и `.codex/config.toml` проверены только по hash; не использованы как runtime/visual evidence. Прежние reviews, author/completion reports и `07_progress` не читались. Исторические утверждения внутри разрешённых документов не принимались за результат этой проверки.

## Выполненные проверки

Node: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node` (22.23.4). Запуски с очищенным окружением, без credentials и live opt-in.

1. `vitest run tests/release-candidate.test.ts tests/release-candidate-acid.test.ts tests/storage-prefix.test.ts tests/payments-guards.test.ts tests/wiring.test.ts --no-cache`: 33 passed, 15 failed из-за sandbox, 1 skipped. В частности SDK 8/8, checkout guards 12/12, wiring 9/9 и 4 pure profile/manifest tests passed. Controller child-process проверки остановились на `spawnSync ... EPERM`; acid harness на запрещённом loopback listener. Минимальный child-process probe независимо подтвердил EPERM. Это **не** 15 кодовых findings.
2. `vitest run tests/health.test.ts tests/s3.test.ts tests/s3-public-endpoint.test.ts tests/billing.unit.test.ts --no-cache`: **69/69 PASS**. Итого 102 прошедших Vitest assertions в двух запусках, не full suite. Health проверяет fake DB 200/503, а не immutable build на настоящем контейнере.
3. Все **18** Python TestExecutor cases из acid файла выполнены через in-memory harness с неизменённым embedded executor и штатным fake Docker. Единственные изменения harness в памяти: неиспользуемый для site-test HTTPServer заменён no-socket заглушкой; executor запускается Python `-c` вместо временного файла. 5 основных cases + оставшиеся 13 PASS, включая migration fail, disconnect before terminal, lock, copy failure и same-schema A/B. Это fake process proof, не настоящий Docker/SSH/OOM/ENOSPC.
4. Дополнительный fault на том же executor: успешный apply, потеря его ответа моделируется последующим reconcile исходного request; получено `apply success`, `reconcile (1, blocked)`, remote state `success` — QE-P03.
5. Actual admissionProbe выполнен с in-memory fake subprocess/system observations: неверные app network и URL ports приняты, 15 fake SQL вызовов — QE-P05. БД и сеть не использовались.
6. Независимый fixture транспилирован в памяти; safety.fetch с CopySource query достиг fake transport. Установленный AWS presigner действительно hoist-ит CopySource в query. HTTP вызовов **0**, URLs/подписи не публиковались — QE-P06.
7. `node --test tests/feature-adr-paths.test.mjs` заблокирован sandbox child-process механизмом. Те же 6 K1 controls и 10 K2 controls повторены Python subprocess в disposable synthetic fixtures с фактическими installed CLI/checker: **16/16 PASS**, включая negative control исходного непатченного условия K2. Это тесты synthetic workspace, не feature gate. `sh -n scripts/install-process.sh` и reverse `git apply --check` обоих patches: exit 0. Никаких patch/install mutations.
8. Focused no-stubs scan controller/SDK/fixtures/process/billing/wiring/release tests не нашёл неприкрытых маркеров. `dz guard` намеренно не запускался: authoritative gates принадлежат root; полного guard PASS не заявлено.

## Находки

Строка 539 controller содержит Python-программу одной JSON-строкой; ниже дополнительно названы ветви/functions, чтобы место находки было однозначным. Все findings новые, исходные, без фиктивных verifications.

### QE-P01 — HIGH — Завершённая загрузка ошибочно считается pending multipart

**Контракт:** FR-4 / ADR-002 / DATA-07: допуск различает реально незавершённый multipart и сохранённый исторический UploadId; существующие завершённые записи допускаются без очистки пользовательских строк.

**Дефект и trigger:** scripts/release-candidate.mjs:478 запрещает любую строку video с upload_id IS NOT NULL. Штатный complete в apps/web/src/server/video.ts:144,170–183 сохраняет upload_id, меняя actual_bytes/status/upload_enqueued_at. Сквозной поиск по apps/packages не нашёл штатного обнуления upload_id. Поэтому хотя бы одна успешно загруженная запись блокирует существующий site-test и последующие выпуски.

**Исправление и проверка:** Смоделировать done/queued-after-complete video с сохранённым UploadId и отсутствующим pending multipart в S3. Сейчас отказ до apply. Проверять состояние/принадлежность и фактический multipart, добавить positive завершённой загрузки и negative реально pending; не лечить удалением/перезаписью данных.

### QE-P02 — HIGH — Одноразовый перенос namespace применяется к каждому следующему выпуску

**Контракт:** FR-3/FR-4, REL-03 и ADR-002: повторный выпуск и совместимый rollback сохраняют уже используемый namespace и все новые объекты; legacy copy выполняется только для нуждающихся в переносе старых объектов.

**Дефект и trigger:** scripts/release-candidate.mjs:479 безусловно требует storageReferences=0 для cloud-c, включая повторный apply/reconcile. В embedded remoteExecutor на :539 блок objects всегда читает digest(logicalKey) без namespace до проверки уже существующего destination. После первого реального CJM Cloud непуст; новый site-объект, созданный уже в namespace, не имеет legacy unprefixed source. Оба штатных сценария повторного выпуска блокируются. checkDataReceipt :398–400 также требует originalShaAfter для каждого объекта.

**Исправление и проверка:** Разделить initial namespace transition и steady-state выпуск; привязать текущий namespace к проверенному state. Добавить A→B→A→B с новым Cloud video и новым site clip между фазами, source для нового объекта существует только в namespace. Нынешний fake A/B тест имеет пустые references/objectWhitelist и этого не проверяет.

### QE-P03 — HIGH — Потерянный ответ после terminal success не восстанавливается reconcile

**Контракт:** FR-6 / REL-05 / ADR-001: reconcile под lock должен уметь подтвердить уже завершённую связанную операцию по runtime/schema и закрыть локальный unknown без повторного apply.

**Дефект и trigger:** scripts/release-candidate.mjs:539, execute: reconcile требует state.status == pending. На успехе remote сначала атомарно пишет success, затем отправляет результат; controller :742–745 до ответа хранит unknown. Обрыв после remote atomic success оставляет корректный terminal state, который reconcile отвергает. Повторный reconcile после потерянного ответа самого reconcile имеет ту же проблему. Локально воспроизведено на неизменённом embedded executor: apply=(0,success), reconcile=(1,blocked), remote state=success; Docker fake, сеть отсутствует.

**Исправление и проверка:** Сделать повторную сверку terminal состояний идемпотентной с проверкой binding/runtime/schema; согласовать восстановление operator-blocked. Добавить fault после atomic success и после terminal записи reconcile, а не только существующий disconnect_after_up до terminal записи.

### QE-P04 — HIGH — Передача артефактов не входит в восстанавливаемый state/lock-протокол

**Контракт:** FR-1/FR-3/FR-6, TASK-5: передача и повторный выпуск имеют привязанный к операции state, безопасное продолжение/сверку и одного writer; partial transfer не оставляет неразрешимый unknown.

**Дефект и trigger:** scripts/release-candidate.mjs:740 передаёт все архивы до saveState(:742) и remote lock(:539). artifactReceiver :561–562 всегда использует source.tar/web.tar/worker.tar и запрещает уже существующий файл. При обрыве второго transfer первый source.tar остаётся, локального request ещё нет: reconcile :678 нечего читать, retry снова падает на source.tar. После успешного A те же fixed staging paths блокируют B/rollback при неизменном профиле. Remote lock не сериализует staging и локальное чтение/запись state (:728–745).

**Исправление и проверка:** Нужен operation/release-bound staging, intent до первой передачи, точная проверка уже полученных bytes и единая сериализация controller state/staging/apply. Проверки: потеря ответа первого/второго transfer, повтор того же выпуска, B после A, два конкурентных controller процесса. Не удалять неизвестные stage artifacts автоматически.

### QE-P05 — HIGH — Pinned DB проверяется отдельно от реального сетевого пути приложения

**Контракт:** FR-4 / DATA-08 / ADR-001/002: effective DATABASE_URL/REDIS_URL каждого app и migrator должны вести именно к pinned infra в проверенной test network до SQL и mutations; проверяются network, alias и порт.

**Дефект и trigger:** scripts/release-candidate.mjs:448–464 сравнивает hostname/database и наличие alias у pinned контейнера. Ни networks app-сервисов, ни неоднозначный alias в их сетях, ни URL ports не проверяются. SQL :465–466 выполняется через docker exec pinned DB, минуя application URL, тогда как migrator на :539 использует application DATABASE_URL. Локальный вызов фактического admissionProbe с fake Docker: все app в wrong-network, DB URL port=6543, Redis port=6380; admission принят, выполнены 15 fake SQL вызовов. Реальной сети/БД не было.

**Исправление и проверка:** Привязать effective service networks и фактическое разрешение host:port к pinned DB/Redis, в том числе one-off migrator; исключить неоднозначные aliases/неожиданные endpoint options. Positive split-project и negative wrong app network/port/alias должны проверять отказ до SQL. Иначе проверенная БД и реально изменяемая мигратором БД могут различаться.

### QE-P06 — HIGH — Независимый S3 fence пропускает presigned CopySource в query

**Контракт:** FR-8 / ADR-003 / AM-18: независимый requestHandler/fetch fence отвергает CopySource независимо от SDK middleware, включая query подписанного URL, до любого transport.

**Дефект и trigger:** tests/fixtures/environment.ts:59 разрешает любой x-amz-* query, а :60 блокирует copy-source только в headers. :77–78 допускает PUT в свой destination. Реальный установленный AWS getSignedUrl(CopyObjectCommand) с фиктивными credentials переносит x-amz-copy-source в query. Отдельный probe safety.fetch с таким query достиг fakeFetch: 1 вызов вместо ожидаемых 0. Реальных HTTP не было; URL/подпись не выводились. Это позволяет независимому test fence пропустить чтение source вне run scope, если проверяемая middleware сломана/обойдена.

**Исправление и проверка:** Запретить CopySource и связанные копирующие параметры и в query, и в headers без учёта регистра; ограничить разрешённые signing query явным контрактом. Проверить настоящую SDK-подпись CopyObject/UploadPartCopy через fake transport со снятой app middleware. Общий production-wide key остаётся согласованным, новый IAM/key не требуется.

### QE-P07 — HIGH — Data baseline не покрывает существенные данные и допускает id-only проекции

**Контракт:** FR-4 / DATA-01–04 / ADR-002: baseline и post-apply сверяют все значимые account/media/payment/referral/credit данные и связи, с проверяемым составом таблиц и исходных колонок.

**Дефект и trigger:** scripts/release-candidate.mjs:387–391 и :485–492 ограничиваются девятью таблицами; partner, partner_code, growth_event, transcript, guest_pack/guest_pack_clip, clip_link и payment_event отсутствуют. При этом blogger-report.ts:50–71 и partner.ts:107–135 используют partner/code/events для владения и статистики. Изменение code/status/partner/account связи или потеря событий проходит эти hashes. Для включённых таблиц columns могут быть только [id], что прямо используется в tests/release-candidate.test.ts:256–260,288–289; суммы/балансы/содержимое тогда вообще не измеряются. count не сопоставляется с live count.

**Исправление и проверка:** Определить и проверять полную snapshot-derived проекцию значимых данных, с допустимыми добавленными миграцией колонками. Добавить негативные изменения referral owner/code/events, transcript/links, payment amount и credit balance при неизменных id; никаких успешных all-data claims на id-only receipts.

### QE-P08 — HIGH — Live S3 журналы и cleanup не выполняют обязательный recovery-контракт

**Контракт:** FR-8 / AM-18: каждый реальный S3 прогон до первой мутации сохраняет private run/exact attempted keys/upload IDs/unknown outcomes; cleanup точный и его ошибка не скрывает первичную.

**Дефект и trigger:** tests/fixtures/environment.ts:104,112 и storage-prefix.integration.test.ts:54–68 разрешают реальную сеть без durable journal при N5_ACCEPTANCE != 1. Даже при acceptance legacy receipt :110–120 содержит лишь prefix/state/unknownUploads, без keys и UploadIds; resolvedUpload убирает счётчик сразу после создания, не записывая полученный ID. При падении процесса восстановление точных операций невозможно. retention :162 очищает через erasePrefix, а не собственные exact IDs/keys. guest :181–183 и retention :165 могут заменить исходную ошибку ошибкой cleanup; upload :111 бросает до DROP SCHEMA/pool.end.

**Исправление и проверка:** Сделать journal обязательным для explicit live opt-in, записывать intent keys и каждый upload ID/исход, использовать exact cleanup и сохранять обе ошибки. Проверить fake потерю ответа CreateMultipartUpload, crash после создания, первичный отказ вместе с cleanup failure и обязательное закрытие pool. Это defect тестовой безопасности, а не требование запуска live теста reviewer-ом.

### QE-P09 — HIGH — Штатный acceptance test container остаётся привязан к MinIO и не получает live S3 профиль

**Контракт:** TASK-3/CP1 и поправка владельца о настоящем S3: поддерживаемый сетевой acceptance путь использует explicit fenced real-S3 профиль без обязательной MinIO зависимости и без принятия skips за PASS.

**Дефект и trigger:** docker-compose.yml:224–247 запускает N5_ACCEPTANCE=1, выставляет старые MinIO S3_* и depends_on minio; N5_PREFIX_RUN_S3/N5_PREFIX_S3_* и private receipt mount не передаются. После изменения tests/storage-prefix.integration.test.ts:19–25 этот стандартный контейнер падает Real S3 test profile required, три legacy network ветки skip. Экспорт новых переменных на host сам по себе не передаёт их внутрь Compose service. Это статически установленный разрыв test wiring, не результат запуска Docker.

**Исправление и проверка:** Дать поддерживаемый документированный private real-S3 acceptance профиль/override, передающий новые env и journal mount, без обязательного MinIO, сохранив opt-in и независимый fence. Проверять resolved test configuration и отсутствие вынужденных skips; не ослаблять N5_ACCEPTANCE.

## Матрица расширенного QE

| Перспектива | Фактическое свидетельство | Результат и предел |
|---|---|---|
| Функциональная | SDK 8 unit, checkout guards 12, controller pure admission 4, соседние billing/S3/health 69 | PARTIAL: gate до body работает; повторный выпуск нарушен QE-P01/02/04 |
| Интеграционная | Реальный AWS middleware/serialization/signing с fake transport; embedded Python executor + fake Docker | PARTIAL: стыки проверены локально; настоящие DB/Redis/SSH/S3 и provider не запускались |
| Регрессия | Wiring 9 PASS; adjacent units 69 PASS; process controls 16 PASS | PARTIAL: full suite/build/lint/typecheck здесь не выполнялись; test Compose drift QE-P09 |
| Security | Exact bucket/prefix, unsafe logical inputs, response keys, checkout guards; дополнительный CopySource probe | FAIL: QE-P05/06; production-wide key — принятая owner граница, без новых IAM требований |
| Performance/resources | Чтение memory/quota/disk admission, streaming hash/copy и subprocess timeouts | PARTIAL: реальный peak disk/layers/latency/RSS не измерен; см. риски ниже |
| Testability/resilience | 18 fake executor cases; terminal-reply fault; синтетический неправильный network | FAIL: QE-P03/04/08, отсутствующие discriminating controls перечислены у findings |
| Code/spec traceability | FR/ADR/план/OpenSpec сверены с исходниками и тестовыми названиями | FAIL: подтверждённые нарушения ниже; старый design gate не подтверждает код |

## FR и ADR fitness / anti-drift

| Требование | Статус этой проверки | Обоснование |
|---|---|---|
| FR-1, один выпуск / две SSH-цели | PARTIAL/FAIL | Явная allowlist и manifests есть; staging/retry QE-P04, реальной двухцелевой доставки нет |
| FR-2, публичный core-CJM | НЕ УСТАНОВЛЕН | Отдельный root E2E; January fixture просмотрен, PostgreSQL oracle не запускался |
| FR-3, повторная правка A→B→A→B | FAIL | QE-P01/02/04; fake A/B использует пустые references и не доказывает новые данные |
| FR-4, сохранность/identity | FAIL | QE-P01/02/05/07; blind restore/down/prune в executor не обнаружены |
| FR-5, production/payment boundary | PARTIAL | Test target allowlist и checkout gate есть; network identity риск QE-P05; окно/native callback отдельно |
| FR-6, lock/state/reconcile | FAIL | Remote flock и atomic state есть; terminal loss/staging QE-P03/04 |
| FR-7, схема/ресурсы | PARTIAL | Same-schema rollback и 26→28 transition проверены fake; реальные disk/OOM/ENOSPC/budgets не доказаны |
| FR-8, namespace + независимый fence | FAIL | SDK unit PASS; query CopySource QE-P06; journal/cleanup QE-P08 |
| FR-9, build env/full regression | PARTIAL | Точная переменная и broken-build/runtime controls PASS; full regression root отдельно |
| ADR-001 | FAIL | Manifest/Git/source/image проверки существуют; recovery/repeat/identity QE-P03/04/05 |
| ADR-002 | FAIL | Existing infra не поднимается через dependencies; сохранность/namespace lifecycle QE-P01/02/07 |
| ADR-003 | FAIL | Internal и signing middleware применены; независимый barrier и network fixtures QE-P06/08/09 |

В plan перечислены, но в release unit/acid отсутствуют отдельные названные controls `rejects rollback to an incompatible storage namespace`, `rejects insufficient resources and exhausted budgets`, `preserves nonempty site data and rejects foreign copy and pending multipart`, `rejects site identity drift and insufficient incremental image archive space`, `fails aggregate delivery when either target is missing or fails`, `blocks full CJM without native window and SDK namespace proof`, `requires agreed current test shop window and drained intents before callback switch`. Часть свойств проверяется иными тестами, но отсутствия executable checks для реальных nonempty replay/transfer faults не компенсирует название happy-path теста. `confines real OOM and ENOSPC...` явно skip: честное ограничение, не реальное fault evidence.

Checkout integration тест добавлен для legacy оплаты и fake provider; freeze/replay/status проверяется на этом слое. Кредитный native grant, provider/DB drain обоих контуров, in-flight старого web и возврат callback этим не доказаны. January oracle содержит ожидаемые суммы/исключения/snapshot/distinct payer, но кабинет блогера в тесте all-time, а месячные оценки проверяются owner-report; различие явно указано в коде и не выдано за единый live E2E.

## Дополнительные риски и ограничения доказательства

- Shell/SQL: profile аргументы передаются через base64/argv, SQL идентификаторы ограничены; секретные значения не выводятся штатным controller. Эти положительные проверки не устраняют identity gap QE-P05.
- Runtime provenance: Git archive повторно сравнивается, tar и image IDs/labels проверяются; immutable SHA предполагает реальную Next build. В этой сессии build/container не запускались, stale-label runtime и все восемь live фаз не подтверждены.
- Ресурсы: staging считает `2 * total archive bytes + 2 GiB`, но не измеряет incremental Docker layers и отдельно Docker data-root filesystem. Большие backup/live row projections материализуются JSON целиком, subprocess buffer controller ограничен 16 MiB. Для текущих малых test данных это не доказанный outage; нужны реальные disk admission/предел размера baseline и измерения root. Нагрузочный/платный прогон reviewer не делал.
- Конкурентность: доказан отказ при удерживаемом remote flock, но не гонки двух реальных controllers вокруг stage/local state. Remote binding зависит от profile/admission; менять их вручную для recovery без сверки опасно. Это основание QE-P04, не разрешение расширять SSH.
- Данные/rollback: автоматического восстановления БД нет, мигратор использует штатную транзакцию/advisory lock; snapshot→restore и сохранение Redis/DB StartedAt после настоящего apply в этой сессии не проверялись. No fake proof вместо pg_restore.
- Process patch: существенных дефектов в проверенной совместимости не выявлено. Scanner сохраняет fail-closed на пустом workspace; installer не скрывает неприменимый patch. Реальный init/hooks lifecycle не исполнялся по read-only scope.
- Документы оставлены как есть, включая исторические pending/prototype формулировки. Они не дают coding approval и не являются author success evidence. Измеренный host подтверждает bytes, а не согласование каждого утверждения.
- Никаких SSH, настоящих API, платных вызовов, прочтения secret env/credentials, commit/push, изменений приложения/requirements/host/history. Временные файлы создавались только disposable локальными тестами; постоянные выходы reviewer — этот отчёт, собственная receipt entry и предусмотренный lock.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| QE-P01 | HIGH | confirmed | 1 | codex | Завершённая загрузка ошибочно считается pending multipart |
| QE-P02 | HIGH | confirmed | 1 | codex | Одноразовый перенос namespace применяется к каждому следующему выпуску |
| QE-P03 | HIGH | confirmed | 1 | codex | Потерянный ответ после terminal success не восстанавливается reconcile |
| QE-P04 | HIGH | confirmed | 1 | codex | Передача артефактов не входит в восстанавливаемый state/lock-протокол |
| QE-P05 | HIGH | confirmed | 1 | codex | Pinned DB проверяется отдельно от реального сетевого пути приложения |
| QE-P06 | HIGH | confirmed | 1 | codex | Независимый S3 fence пропускает presigned CopySource в query |
| QE-P07 | HIGH | confirmed | 1 | codex | Data baseline не покрывает существенные данные и допускает id-only проекции |
| QE-P08 | HIGH | confirmed | 1 | codex | Live S3 журналы и cleanup не выполняют обязательный recovery-контракт |
| QE-P09 | HIGH | confirmed | 1 | codex | Штатный acceptance test container остаётся привязан к MinIO и не получает live S3 профиль |

Round=1 означает исходный проход этой reviewer-роли, не самостоятельно вычисленную историю native cycles. Цикл и evaluate определяет actual host/root.

## Итог и условия следующего прохода

Code GO: **NO-GO**, условия QE-P01…QE-P09 открыты. Исправления должны получить независимую проверку originating role на новой честно подготовленной ревизии, с сохранением всех условий и author delta. Initial receipt: `verifications: []`, `deltaVerification: null`, `authorAssessmentChecked: false` при `author: null`.

Final product acceptance: **не установлена**, независимо от будущего code GO. Root отдельно выполняет полный suite/build/checks, настоящие fenced S3/copy/backup/runtime доказательства, двухцелевые A/B фазы, обязательный опубликованный CJM и согласованное окно нынешнего TEST shop с freeze/drain/native/replay/возвратом callback. Новые keys/buckets/IAM403/ВМ не являются условиями этого отчёта. Gate reviewer не запускал.

Сверка перед публикацией: 2026-11-03T17:21:15.533198+00:00; 72/72 manifest hashes совпали.

## Исправление формы исходной receipt entry

Дата UTC: 2026-11-03T17:26:38.913699+00:00. По запросу host после отказа `condition-scope-unmeasured:QE-P01` исправлены только два поля собственной entry при прежних nonce/revision. Это исправление формата исходной квитанции, не исправление кода и не verification. Вердикт остаётся `no-go`; все девять IDs, severity, requirement и evidence сохранены без изменения.

- `QE-P01.scope`: ["scripts/release-candidate.mjs", "apps/web/src/server/video.ts", "tests/release-candidate.test.ts"] → ["scripts/release-candidate.mjs", "tests/release-candidate.test.ts"].
- `QE-P07.scope`: ["scripts/release-candidate.mjs", "packages/db/src/blogger-report.ts", "apps/web/src/server/partner.ts", "tests/release-candidate.test.ts"] → ["scripts/release-candidate.mjs", "tests/release-candidate.test.ts"].

Зависимости `apps/web/src/server/video.ts`, `packages/db/src/blogger-report.ts` и `apps/web/src/server/partner.ts` остаются доказательствами findings в неизменённых requirement/evidence и исходном отчёте. Host обязан объявить и измерить эти релевантные зависимости при подготовке исправления кода; их исключение из scope текущей receipt не исключает их из семантической проверки. `scripts/release-candidate.mjs` — измеренная дефектная граница для обоих условий.

Повторно сверены все 72 manifest hashes: совпадают. Остальные reviewer entries и `author: null` сохранены; host/history/source не изменены. `prepare`/`evaluate` не вызывались. SHA256 отчёта в прежнем поле newRisks.evidence относится к исходному отчёту до этого добавления; само поле evidence намеренно сохранено побайтно по смыслу запроса.


Сверка cycle2 перед записью: 2026-11-03T22:09:14.130763+00:00; 123/123 manifest SHA256 совпали.
