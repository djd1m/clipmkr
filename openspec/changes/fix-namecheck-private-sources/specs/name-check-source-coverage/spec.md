# name-check-source-coverage — revision 2, кандидат

## ADDED Requirements
### Requirement: Явный scope (FR-1)
CLI SHALL поддерживать ровно один optional `--source-root <existing-absolute-directory>` вместе с existing project/name queries. Дубли, отсутствие значения, relative/missing root и неизвестные name-check args SHALL давать NOT_ESTABLISHED/exit2. Help/known-flags/actual consumer согласуются; flag не подменяет project root.

#### Scenario: Неверный flag
- **WHEN** source-root повторён, пуст либо написан иначе
- **THEN** нет app-only FREE; ответ содержит безопасный reason code.

### Requirement: Источники (FR-2)
Clipmkr default SHALL включать apps/packages/scripts/tests с прежним JS/MJS/CJS/TS/TSX declaration scan и .d.ts exclusion. Прочие языки default roots (включая .sh/.py/.rb) SHALL исключаться без чтения тела с reported exclusions. Optional private root SHALL быть реальным regular directory; .py basename также учитывается. Existing native harness default сохраняется; explicit source применяется дополнительно.

#### Scenario: Имя уже существует
- **WHEN** запрошено имя существующего test/private module
- **THEN** taken/exit1 с фактическим источником. Missing/unreadable root отвергается; реальный пустой extra root допустим при непустом общем sweep, с явными нулевыми counts и без claim Python execution.

#### Scenario: Реальные default roots содержат shell scripts
- **WHEN** candidate CLI обследует actual project defaults с существующими .sh файлами
- **THEN** shell files показаны как language exclusions; test basename даёт taken, свободное module name даёт free при полном JS/TS sweep. Наличие .sh в extra root SHALL дать NOT_ESTABLISHED.

### Requirement: Static Python (FR-3)
Python SHALL анализироваться stdlib AST по stdin без import/exec исследуемого source. module-owned def/async def/class, включая module-level control flow, SHALL учитываться как declared names; function/class internals не расширяют exports. Dynamic aliases не объявляются доказанными.

#### Scenario: Source имеет side effect
- **WHEN** файл содержит создание marker и объявление callable
- **THEN** callable найден, marker не создан; SyntaxError/недоступный parser → NOT_ESTABLISHED без source snippet/traceback.

### Requirement: Полнота и пределы (FR-4)
Scanner SHALL проверять monotonic elapsed до/после blocking steps; late return, symlink/path/read/parse failure, unsupported code (.sh/.rb) или unrecognized candidate в extra root, либо превышение любого limit → aggregate NOT_ESTABLISHED. Limits: один explicit root; depth32, entries20000, sources4096, 1MiB/file, 32MiB total, elapsed10000ms; Python timeout≤min(2000ms,remaining), maxBuffer1MiB. Это admission budget, не syscall interrupt SLA.

#### Scenario: Частично успешное чтение
- **WHEN** app scan успешен, но requested root/file/parser отказал или результат пришёл поздно
- **THEN** результат всего запроса exit2; subset FREE запрещён.

### Requirement: Evidence и совместимость (FR-5)
JSON SHALL сохранять pure decision outcome/exit/results/reason, добавляя scan metadata: actual roots/status, языки, files/bytes/counts, exclusions и failure code. Human output SHALL показывать тот же scope. Existing pure decision, package pins, installer, K2/native QE остаются прежними.

#### Scenario: Свободное имя
- **WHEN** весь declared scope прочитан, общий sweep непуст и запрошенное имя отсутствует
- **THEN** free/exit0 с complete scan evidence; unknown/partial не выдаётся за complete.

### Requirement: Безопасность чтения (NFR-1)
Scanner SHALL читать sources как данные, без исполнения, shell interpolation, body/secret/AST-error echo. Roots и selected entries SHALL проверяться на symlinks, unsafe path и read failure. Symlink/dependency reuse в изолированном executable не является source namespace.

#### Scenario: Ссылка или утечка
- **WHEN** selected source — symlink либо parser error содержит secret sentinel
- **THEN** отказ без чтения target body/вывода sentinel.

### Requirement: Проверяемая поставка (NFR-2)
Tests SHALL исполнять именно candidate-patched temporary CLI, сохраняя shared installation. Existing K1/K2 controls, новые negative/positive и meaningful mutants обязательны; isolated fixtures не являются actual STEP4 K1.

#### Scenario: Регрессия или refuse-all
- **WHEN** убрана coverage/bounds защита либо все запросы отказаны
- **THEN** соответствующий behavioral test падает. После independent acceptance reviewed installation и actual source-root check выполняются отдельно.
