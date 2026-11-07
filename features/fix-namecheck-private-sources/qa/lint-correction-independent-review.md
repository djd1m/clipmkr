# Независимое ревью корректирующей lint-дельты

07.11.2026. **CLEAN: дельта принята независимым reviewer для commit `1adb71bce57df5d4dd671bbc27cb41bd208204f5`; новых подтверждённых замечаний и открытых gaps нет.** Предшественник — `632fb940a451a4b5f050e9ea2a22fbaf7add8b33`.

Это ровно одно дополнительное cross-model ревью по явному исключению владельца от07.11, вне неизменённой native history. Исторический CLOSED третьего цикла относится к прежним bytes. Текущий commit **не объявляется native-CLOSED**. Prepare/evaluate/checkpoint/reset не выполнялись; [historical08](../08_qe_report.md) сохранён. Установка и actual private K1 не выполнены.

Reviewer requested `gpt-6-astra xhigh`, автор requested `gpt-6.1-sol high`; serving identity **NOT_ATTESTED**. Продолжена та же originating независимая сессия, изначально начатая с требований отдельно от кодирования. Фактический session locator и полные commands/receipts находятся в закрытом handoff.

## Проверка дельты

Сначала повторно прочитаны требования/OpenSpec revision2, ADR-001, reuse, архитектура и план; затем весь current test, Git delta, lint script,07 и genuine author assessment. Read-only code-critic завершён до tests: подтверждённых замечаний нет. Production patch byte-identical; менялись existing test, factual07 и запрос ревью. Новых implementation files/API/dependencies нет.

Проверены helpers и error paths: argv arrays/Buffer baseline/timeout/maxBuffer/env/uid сохранены, subprocess errors не подавляются; synchronous fixture lifecycle и восстановление mutant bytes остаются в finally. Strict metadata assertions, precise ERR_ASSERTION actual/expected, реальные lookup/delay/markers, resource fixtures и cleanup сохранены. Leak mutant дополнительно получает syntax-check. Все30 наблюдённых temp roots после suite удалены.

## Собственное исполнение и parity

Node **v22.23.4**; неизменённый полный проектный lint с потолком500, без исключения файла или повышения cap.

| Проверка / actual command | Результат |
|---|---|
| `node scripts/lint.mjs` | exit0, «Статические правила: ошибок нет»,1.480с |
| `node --check tests/feature-adr-paths.test.mjs` | exit0 |
| `node --test tests/feature-adr-paths.test.mjs` | **exit0,22/22 PASS**, skipped/cancelled/todo0, stderr0,136.986с |
| `git diff --check 632fb940a451a4b5f050e9ea2a22fbaf7add8b33 1adb71bce57df5d4dd671bbc27cb41bd208204f5 -- tests/feature-adr-paths.test.mjs patches/dz-name-check-app-source.patch` | exit0 |

Test43 118 bytes/499 физических/500 split lines; predecessor49 939 bytes/644 split lines. Его превышение проверено на exact bytes по неизменённому правилу; исторический полный lint заново не запускался.

Suite исполнял actual candidate-patched temp CLI. Подтверждены pristine/known-old/already-candidate setup, unknown-byte refusal и canonical K2. Собственная parity сравнила текущие records с моими actual cycle3 records, предварительно проверенными по evidence manifest. Единственная нормализация — взаимно однозначная замена random temp roots:

- **147 CLI argv/options/exits/executable hashes**, **10 K2 commands/targets/exits/outputs**, **144 fixture JSON** и один human output совпали.
- Два actual-repo ответа сохранили459 sources, selection/outcomes/exclusions, включая11 shell files. Три byte counters изменились ровно на дельту test:−6 821 bytes; aggregate3 176 407→3 169 586.
- **16 mutants** сохранили IDs/bytes и различающие behavioral oracles; каждый текущий mutant syntax0. Setup crash не считался обнаружением; exhaustive mutation score не заявлен.
- AST inventory сохранил22 titles/order,19 replace-пар и13 template-аргументов hook/hookCase, включая discovery helper. Это supporting audit, не доказательство полной эквивалентности.

## Исходные условия: смысл и текущая проверка

Все три условия остаются structural, со scope existing patch/test. Original severity, requirement, scope и evidence в native history не переписаны и заново не закрыты.

| Условие / requirement → риск | Current scenario → наблюдение |
|---|---|
| **NCQE-01 HIGH, FR-4/FR-5:** native+explicit scope обязан целиком соблюдать budgets и counters, сохраняя native selection/decision | Oversize→2/file-size-limit; observed late read→2/elapsed-limit; native+PY complete files2/bytes53/TS+PY; aggregate bounds, exact1MiB positive, native command/declaration semantics, kernel EACCES uid65534→2/io-failure и соответствующие mutants — PASS |
| **NCQE-02 WARNING, FR-4/архитектура:** directory exclusion не скрывает regular unrecognized candidate | Regular dist/node_modules/.next/.git→2/unsupported-source; genuine excluded directories→free0 без traversal,4 exclusions; predicate mutant нарушает oracle |
| **NCQE-03 WARNING, FR-4:** default elapsed включает initial mode lookup, late return→aggregate exit2; positives/legacy native сохраняются | Actual existsSync+controlled10 020ms delay, marker observed→2/elapsed-limit за10.500с; default free0/taken1; default/explicit/native9999→0,10000→2; legacy positive; reverse-timer mutant→false FREE и precise assertion failure |

FR-1/2/3/5 и NFR-1/2 дополнительно подтверждены тем же full suite/parity: неверные args и неполное чтение→whole-scan exit2, collisions→taken1, полный absent→free0, Python source не исполнен, nested scope не расширен, sentinel/traceback не выведены. Применены code-critic и studio-extended-qe методы security, bounded faults/resilience и mutation локальными инструментами; AQE runtime/fleet не запускались.

## Anti-drift и ограничения

Физический before/after readback: **norm10,shared18,protected native6** неизменны по hashes и file metadata. Test/patch/07, lint script, pins, installer, historical08 и review request также неизменны; HEAD сохранён. Genuine author assessment проверен, новых подтверждённых рисков нет.

SHA256:

- Test: `c820ae6a29db3cf6b351d8207d239a4a4ac68f5a68bcc4a2fb0c4228e4238bb6`.
- Patch: `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a`.
- 07: `d95b7c26708f76d669acfb5691c4dc6701a791728e0b2ff964b766c5ddcf3c5c`.
- Candidate CLI: `a6dcabe4f78f799c9251bccf8f78ec323d4e1689fe99c28feb99b46ef53b2b0a`.
- Неизменённый historical08: `334ec22b4be1957043b8e697b2f6f48c005c90d846ad2f2d6a2198155dd6d171`.

Static JS/PY не доказывает dynamic bindings; sync syscall не прерывается, но late return отвергается; filesystem snapshot не атомарен. Delays не benchmark/p95/hard wall-time SLA. Finally не гарантирует cleanup после принудительного завершения процесса. Parity покрывает исполненные сценарии; прежний suite заново не запускался. Test находится ровно на действующем lint-пороге.

**NOT RUN:** shared installation, actual private K1, app/E2E/main recovery, DB/provider/AuthSession/SSH/Cloud/network/deploy и native mutating commands. Fixtures не заменяют admission реального namespace. Результат относится только к указанному corrective commit и не разрешает дополнительные formal review cycles.
