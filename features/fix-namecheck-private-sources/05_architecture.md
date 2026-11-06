# Light architecture — дополнительная заметка S

Поток: existing parseArgs/optionLists → cmdNameCheck validation → существующий synchronous nameCheckScan + один optional root → canonical exportedNamesIn или Python stdlib AST → existing decideNameCheck → additive scan evidence/render.

Новый valued flag — source-root; ровно один абсолютный existing directory. Дубликат определяется по existing optionLists, valueless — flags/options; typo/неподдержанные name-check args дают exit2. В том же tracked patch согласуются help в dist/cli.js и dist/known-flags.js. Новый export/command/module не требуется.

Default Clipmkr roots — apps/packages/scripts/tests; отсутствующие optional defaults отражаются в evidence. Native harness default сохраняется, explicit root добавляется. Default selected regular sources: JS/MJS/CJS/TS/TSX, .d.ts исключён. Прочие языки default roots (.sh/.py/.rb и другие) исключаются без чтения тела с отдельными counts/reasons в evidence; это не unsupported-root failure. Extra root дополнительно выбирает PY. Existing excluded build/dependency directories сохраняются. Для extra root не-кодовые metadata/media artifacts пропускаются без чтения тела с явными exclusions; неподдержанный source language (например .rb/.sh) или нераспознанный candidate дают отказ. Политика не делает заявлений о names вне selected roots/languages.

Root и selected path проверяются lstat/realpath, symlink/read failures отвергаются. File size проверяется до bounded read и фактический объём после; directories/entries/depth/files/total bytes и monotonic elapsed имеют фиксированные limits требований. Проверки идут до/после blocking steps: поздний возврат → NOT_ESTABLISHED. Sync syscall не обещан прерываемым, worker/IPC нет.

Python вызывается как existing interpreter с isolated stdlib startup, fixed parser program и source в stdin; ast.parse, scope-aware module declarations, bounded timeout/maxBuffer. Исследуемый код не импортируется/не исполняется, parse ошибки сворачиваются в коды без body/traceback. JS declaration reader сохраняет свои существующие пределы, не объявляется компилятором.

Real empty extra directory можно создать как настоящий будущий namespace без seed code. Его coverage — directory read + 0 files/observed languages; это не Python runtime proof. Общий sweep должен быть непуст. Нельзя подменять missing/unreadable root чужим непустым деревом.

## Observability
JSON сохраняет outcome/exit/results/reason; scan добавляет actual requested/canonical roots/status, observed languages, counts/files/bytes/exclusions/failure code. Supported languages отделены от реально прочитанных. Human output показывает тот же scope. Source bodies/secret sentinel/parser traceback не выводятся; private directory names в actual output остаются private evidence. Root отличает complete/taken от неполного scan и не принимает частичный FREE.
