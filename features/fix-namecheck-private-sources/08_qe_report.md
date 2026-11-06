# Независимый QE: fix-namecheck-private-sources — третья проверка

Дата: 06.11.2026. Текущий reviewer verdict: **CLEAN**. **NCQE-01, NCQE-02 и NCQE-03 независимо проверены на текущей ревизии; новых подтверждённых замечаний нет.** Это результат reviewer, а не native closure/checkpoint или разрешение установки. Root отдельно выполняет настоящий evaluate.

QE-VERDICT: A

Оценка A — самостоятельный итог проверки согласованных MUST-требований и ADR-001: три обнаруженных дефекта исправлены и независимо проверены на текущей revision, обязательные сценарии подтверждены, открытых gaps нет. Основание — проверка кода, контрпримеров, положительных контролей и различающих mutations; число тестов само по себе оценку не определяет. Признанные ограничения ниже сохраняются.

Запрошенная модель — `gpt-6-astra`, reasoning `xhigh`; serving — **NOT_ATTESTED**. Продолжена та же originating сессия, изначально отдельная от кодирования и начатая с согласованных документов. Автор по данным dispatch — `gpt-6.1-sol high`; различие запрошенных моделей соответствует owner exception, фактическая serving identity не удостоверена. Exact session locator и полные команды находятся в закрытом evidence.

## Snapshot, входы и сохранённая история

Напрямую прочитан host: revision `2e48d4ff5c263e690db69bedb2496d2304d1cca44cfd68662c40a0da228e41c9`, nonce `0d34d68e-6582-4425-b75a-4adb89e3d6ff`. Все 11 manifest digests совпали. Три condition objects в текущем receipt сохранены **дословно**: ID, owner, severity, classification, requirement, scope и исходное evidence не переписаны.

История не заменяется CLEAN результатом: первая проверка была NO-GO с NCQE-01 HIGH и NCQE-02 WARNING; вторая независимо подтвердила их исправление, но осталась NO-GO из-за NCQE-03 WARNING. Первый отчёт сохранён с SHA256 `a073fb3fa520194ad975a6a2125f6776d18c1d6f5c08dfba8da1f13ce7e10a2e`; второй — `7cc090a597ec356f1babf28299b4d42ef8054303b3d468a5eff42eecabb9e158`. Current verifications относятся только к текущему snapshot; прежние не выданы за новую проверку.

Нормативные требования, reuse inventory, ADR-001, архитектура, план и OpenSpec неизменны. Ledger revision 2/SHA256 `65442de55d8ffe60d6d27ce593004b053b9a1d5bf4c6a5f6037d75276f2126ba` сохраняется. Прочитаны genuine шестипольный author assessment, текущий полный patch, весь test target и Step 7. Author assessment проверен собственными действиями, а его объект в receipt оставлен неизменным.

Независимая проверка дельты: если в текущем patch вернуть единственную строку `started` на прежнее место, получается точный SHA предыдущего patch `db37f2fe9ae024a80eb20c297f0cb17fc422bf39afe845f9ac28b18fa108406c`. Первые 561 строки текущего test совпадают с полным ранее прочитанным target по SHA `9e2f3c0affdfc5dee31186b04413b70c2d8be1a8211b0f2243f01724230b75eb`; новые 82 строки прочитаны отдельно. Это подтверждает полный фактический объём дельты, без доверия к авторскому summary. Code-critic read-only завершён до QE tests: новых concern не найдено.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| NCQE-01 | HIGH | fixed | 1 | codex | Aggregate native+extra limits и evidence |
| NCQE-02 | MEDIUM | fixed | 1 | codex | Regular reserved names ошибочно исключались как directories |
| NCQE-03 | MEDIUM | fixed | 2 | codex | Initial default discriminator выпадал из elapsed budget |

В словаре этой таблицы нет WARNING: для NCQE-02/03 он отображён как MEDIUM. Исходная severity WARNING, полные condition objects и история NO-GO в native receipt сохранены без изменений. `fixed` отражает собственную текущую verification, а не результат ещё не выполненного root evaluate.

## Текущие независимые verifications

| Условие | Фактическая проверка и результат | Статус |
|---|---|---|
| NCQE-01 — native+extra budget/evidence | Исходный native TS >1 MiB → exit2/file-size-limit; native late read с наблюдённым marker → exit2/elapsed-limit; native TS+PY → files2/bytes53/languages[TypeScript,Python] | Подтверждено на текущей revision |
| NCQE-01 — сохранение семантики | Full candidate suite: aggregate bytes/sources/entries/depth, пустые roots, EACCES, shallow native selection, declaration-owner preference, canonical и fallback command inventory | PASS; legacy no-flag native semantics сохранены |
| NCQE-02 — regular reserved names | Собственный extra/dist → exit2/unsupported-source; maintained tests проверили также node_modules/.next/.git | Подтверждено |
| NCQE-02 — directory positives | Genuine excluded directories → free0 с exclusions; maintained no-traversal hook не сработал на тело исключённых directories | Подтверждено |
| NCQE-03 — late default discriminator | Мой исходный actual lookup + controlled10 020ms delay, marker observed → **exit2/elapsed-limit за10.566s**; source scope partial, false FREE отсутствует | Подтверждено |
| NCQE-03 — positives/boundaries/siblings | Own ordinary default free0/taken1; frozen9 999 999 999ns → free0,10 000 000 000ns → exit2; suite9999/10000ms для default/explicit-extra/native-extra; legacy native positive | Подтверждено |
| NCQE-03 — meaningful mutant | В моей отдельной temp CLI обратный перенос timer восстановил точный прежний candidate SHA `a36748ffdd633235eb702be76142c25272a86b36ef0e44a27679b98e4084f2f6`; syntax0, actual delayed lookup → false FREE за10.552s; ожидающий exit2 assertion действительно упал | Oracle различает дефект |

Начало elapsed measurement теперь предшествует filesystem discriminator; первая bounded проверка отказывает после его позднего возврата. Legacy native путь без нового флага не расширен по требованиям этой проверки. Реальные задержки тестов — контролируемые faults, а не benchmark рабочего filesystem.

## Requirement → risk → scenario → command → observed result

Фактический полный command: `node --test tests/feature-adr-paths.test.mjs`, Node22.23.4: **exit0,22/22 PASS,skipped0,stderr0,144.310s**. Он запускает реальный candidate-patched temporary CLI, а не старую shared CLI. Независимый `python3 probes.py` — мой закрытый script, с сохранёнными точными argv; **17 сценариев**:16 проверок candidate и один самостоятельный timing mutant. Все результаты соответствуют ожидаемому поведению, включая намеренное нарушение oracle у mutant.

| Требование / риск | Сценарии | Наблюдение и ограничение |
|---|---|---|
| FR-1 → игнорирование неверного scope | Full incomplete/path/help controls | Duplicate/empty/relative/missing/unknown/positional input → exit2; help/known-flags/consumer согласованы |
| FR-2 → ложный FREE существующего имени | Test/PY basename, exact old/candidate setup, actual repo defaults, native selection | Collision→taken1, absent→free0; old collector false-free воспроизведён; coverage только declared roots/languages |
| FR-3,NFR-1 → target execution/неверные scopes | Full AST/sentinel controls; own for/while/with/match/nested probes и literal shell-metacharacter path | Module-owned declarations найдены, nested исключены, side effects не исполнены, sentinel/traceback не выведены; dynamic aliases не доказаны |
| FR-4 → partial success/неограниченность | Missing/symlink/path-change/EACCES/parser/encoding, aggregate bounds, elapsed discovery/read и parser remaining budget | Whole-scan exit2; оба kernel EACCES подтверждены при uid65534; exact1MiB positive остаётся taken1 |
| FR-5 → неверный scope/evidence | Full default/native reporting, own native+PY counters и human control | Complete counters согласованы; partial не объявлен complete; supported languages отделены от observed |
| NFR-2 → старые executable bytes/неработающий guard | Pristine/known-old/already-candidate/unknown setup, canonical K2 controls,16 targeted mutations | Actual candidate hashes зафиксированы; unknown setup отвергнут; все16 mutations различены behavioral assertions; это не exhaustive mutation score |

Maintained suite сохранил прежние15 mutants и добавил один timing-relocation mutant; мой независимый прогон дополнительно повторил timing mutant в другой temp копии. Unparseable/setup crash не считался обнаружением дефекта. Выбраны методы security-testing, bounded fault/resilience и mutation-testing через studio-extended-qe; AQE runtime/fleet не устанавливались и не запускались.

Actual default compatibility: roots apps/packages/scripts/tests,459 sources,3 176 407 bytes включая command manifest. TypeScript407/2 636 826 bytes; JavaScript52/538 044 bytes; manifest1 537 bytes. Exclusions2 059, включая11 shell files. Существующий `feature-adr-paths.test` → taken1; absent module → free0. Увеличение bytes с предыдущего review объясняется новыми тестами. Это default compatibility, не actual private K1.

## Anti-drift и артефакты

Все25 самостоятельно измеренных input/document/dependency hashes сохранены до/после QE; host не изменён. Pure decision, package pins, installer и canonical K2 прежние. Shared cli/known-flags дополнительно проверены teardown suite. `git diff --check -- patches/dz-name-check-app-source.patch tests/feature-adr-paths.test.mjs` → exit0. Два существующих implementation targets сохранены; новых modules/exports/commands/dependencies/framework нет. Step7 соответствует source hashes и честно ожидает независимую приёмку.

- Patch: `b804a82aee8ec3c5821a42c0c9a1dae9380a20df94182ac3e5600929a869ce9a`.
- Test: `13de66c1f801f90a5dbd716ef69f0a394a0e4edd9f0cb968f0368c318d7f0267`.
- Исполненный candidate CLI: `a6dcabe4f78f799c9251bccf8f78ec323d4e1689fe99c28feb99b46ef53b2b0a`.
- Candidate known-flags: `ab19413bc04dff6998978f4d8bb62e16b7868c2f630efe9b0a677388030b9e7d`.
- Step7: `c9195777f66bab73cc87ddd1c976c0abe2953c9eceb79958ecd99fc813bab96e`.
- Own probes JSON: `434756ab77f85d5165f868de67be982d5f683098b16874ea94a72b609ffc6002`.
- Independent full-suite stdout: `a604e432e685c7501baf4ec31bb0cf033a951c9ee7c0e348a7587fb639e3e7bd`.
- Independent delta check: `cd34dc5bb09fafec0a059b8f8ec244b602e05d88f6d23c31cb312dfa47422b2c`.

Признанные ограничения остаются явными: JS — static declaration reader; Python AST не доказывает dynamic bindings; scanner не прерывает sync syscall, но отвергает late return; filesystem не предоставляет атомарный общий snapshot. Frozen-clock boundary tests и controlled delay не доказывают throughput/p95 или hard wall-time SLA. Тесты проверяют выбранный namespace, а не весь диск.

NOT RUN по scope: shared installation, actual private namespace K1, приложение/E2E, provider/DB/SSH/network/Cloud и main recovery. Native prepare/evaluate/checkpoints/commits reviewer не вызывал. Текущий receipt содержит все3 исходные conditions, собственные current-revision structural verifications, authorAssessmentChecked=true и independently supported deltaVerification. Новый риск не обнаружен; native closure и дальнейшая установка остаются отдельными действиями root.
