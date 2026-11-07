# План S — кандидат

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-bound-static-source-scan.md`, `05_architecture.md`; source/baseline evidence закреплены в требованиях.

## Цель / scope
Исправить source collection существующего K1 в двух existing repo files. Не менять pure decideNameCheck, package pins, installer, K2/native QE и shared installation. Patch может включать vendor dist/cli.js и dist/known-flags.js hunks; прямые vendor edits — только isolated temporary copy. Recall/approval/gates/code/tests NOT_RUN.

### TASK-1: FR-1, FR-5, NFR-2, ADR-001 — specification
Root сверяет base 7e77484 и source hashes, выполняет recall и настоящие S checkpoints/requirements/plan gates. K1 для этой задачи: новых commands/modules/public exports нет; source-root — новый valued flag в существующем CLI. Любое реальное расширение имён/файлов требует явного K1/re-routing, не скрытого экспорта. K2 installed checker с --tier=S --require-requirements и strict OpenSpec; optional ADR проверяется, QCSD-Swarm не выдумывается. Done: реальные текущие gates/authorization. Оценка 15 минут.

### TASK-2: FR-2, NFR-2, ADR-001 — pseudocode / test baseline
После TASK-1; `tests/feature-adr-paths.test.mjs`. Создать isolated copy настоящего installed harness-cli package с readonly dependency reuse. Сохранить exact старый project patch с выбранного base до редактирования; снять его только с temp copy, затем применить candidate patch. Pristine/already-candidate/known-old состояния различать actual apply/reverse checks; неизвестный baseline → setup failure. Старый patch брать из measured base snapshot/Git blob, не восстанавливать regex догадкой. Shared node_modules не писать.

Все K1 cases исполняют candidate temp CLI; сохранять actual artifact hashes. RED: исходный app-only collector даёт free для существующего test basename; corrected collector обязан taken/exit1. Это воспроизведение root receipt, не изменение pure decision. K2 normal control использует реальный byte-pinned installed checker: resolve existing skill через canonical dependency root, поскольку fresh worktree может не иметь .agents. Не заменять checker самописным; существующий negative-control copy остаётся явно mutant. Done: test setup исполняет нужные bytes. Оценка 15 минут.

### TASK-3: FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, ADR-001 — refinement
После TASK-2; только `patches/dz-name-check-app-source.patch`. Existing parseArgs уже хранит optionLists; передать его existing private cmdNameCheck, проверить ровно один source-root, unknown/valueless/duplicate args. Согласовать help/known-flags. Расширить existing collector на tests и extra real root; reuse JS parser и pure decision. Default roots сохраняют JS/TS selection: прочие языки (.sh/.py/.rb) отражаются как exclusions, без чтения тела и без отказа. Extra root допускает JS/TS/PY и отвергает unsupported code/unrecognized candidate. Python AST stdio с fixed trusted program, без target execution. Добавить counts/bytes/depth/elapsed limits до/после I/O и bounded parser timeout/maxBuffer; failures → whole-scan NOT_ESTABLISHED. Additive scan metadata не меняет decision fields. Нет worker/IPC/новых runtime helpers/public exports.

Пустой real extra root при непустом общем sweep допустим с counts0/observedLanguages=[]; missing/unreadable/unsupported root и global empty отвергаются. Availability ограничена declared roots. Done: действительные exports/modules/collisions и unsafe cases различаются через candidate CLI. Оценка 30 минут.

### TASK-4: FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, ADR-001 — refinement / completion
После TASK-3; existing test file. Все имена ниже — tests в `tests/feature-adr-paths.test.mjs`:

- `K1 covers tests and external Python declarations`: test basename, external JS/PY basename, def/async def/class + module-level conditional; known taken→1. Nested method не объявляется module export; source side-effect marker не создан.
- `K1 refuses incomplete source coverage`: missing/relative/valueless/duplicate/typo root, unknown flag, symlink root/entry, unreadable file, malformed AST, unavailable parser, unsupported source в extra root→2 даже при app files; .sh/.py/.rb в default roots — reported exclusions, не отказ. Для unreadable не полагаться на chmod000 под root: выполнить реальный EACCES в доступном unprivileged child либо явно NOT_RUN.
- `K1 bounds scan and parser resources`: oversize file/total/entries/depth/files; parser timeout/maxBuffer; monotonic budget до/после controlled delayed step. Late-returned I/O не FREE; никаких обещаний прервать kernel syscall. Controls проверяют конкретный reason/count, не generic fixture crash.
- `K1 reports complete coverage without source text`: additive fields и actual counts/observed languages, secret sentinel в parse error отсутствует в stdout/stderr; partial metadata не объявлена complete.
- `K1 valid free result remains possible`: отсутствующее имя→0 на полном непустом sweep; существующий пустой extra root→0 с counts0; global empty→2. Также выполнить candidate CLI на actual repo defaults без extra root: существующие shell files дают counted exclusions, known test basename→1, свободное module name→0. Зафиксировать actual roots/counts и bytes CLI; это проверка default compatibility, не actual STEP4 admission.
- `K1 guard mutations discriminate`: убрать tests/extra-root scan→collision case ложно free; убрать AST→callable пропущен; убрать read/parse/size/elapsed refusal→negative false-free; echo parser stderr→secret leak; refuse-all→positive broken. Каждый mutant должен ломать соответствующий behavioral test; unparseable mutant не evidence.

Сохранить existing nested app/module/export/command/empty cases, native source default и K2 valid/invalid Next route cases. Done: actual candidate red/green и 0 unexplained skipped cases; shared originals hashes прежние. Оценка 30 минут.

### TASK-5: FR-1, FR-2, FR-3, FR-4, FR-5, NFR-1, NFR-2, ADR-001 — completion
После TASK-4. Author gpt-6.1-sol high; independent QE fresh gpt-6-astra xhigh/docs-first. Code-critic, risk-selected extended QE (input/path security, faults, mutation), actual source/code/spec anti-drift и originating findings closure. Проверка scope: только два targets, patch installer compatible, package/core/K2/native lineage/shared installation unchanged. Test command: node --test tests/feature-adr-paths.test.mjs; baseline/candidate hashes и limitations в evidence. Оценка 15 минут.

После принятия root отдельно устанавливает reviewed patch штатным механизмом и повторяет тот же K1 на actual planned namespace; при необходимости отдельный positive collision probe на maintained real source. Empty new namespace допустим без seed code с честными counts0; он не доказывает Python execution. Test fixtures не заменяют actual scan. Main recovery/STEP4 gates и runtime admission остаются отдельными.

## Зависимости / ограничения
TASK-1→2→3→4→5, без параллельного авторства. Весь scan ограничен admission budgets; hard wall-time SLA не задан. Если минимум требует третьего repo target/new public export/нового framework, остановить scope expansion и представить конкретную причину. Условия reviewers пока не существуют: addressed=[]; amendments появятся только по actual findings. Planner не выполняет установку, CLI/gates или код.

EXPECTED_CODE_TARGETS:
- patches/dz-name-check-app-source.patch
- tests/feature-adr-paths.test.mjs
