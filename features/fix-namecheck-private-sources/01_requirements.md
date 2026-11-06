# Требования — кандидат S

Цель: existing K1 должен отвечать о реально заявленном source scope и отказывать при неполном чтении. Потребитель/приёмка — root feature process. Только два existing tracked targets: patch и его тест; app/session/финансовый scope не меняется.

Ledger `openspec/changes/fix-namecheck-private-sources/specs/name-check-source-coverage/spec.md`, revision 2, SHA256 `65442de55d8ffe60d6d27ce593004b053b9a1d5bf4c6a5f6037d75276f2126ba`. Private document provenance SHA256 `f866c401be427bf971d08fd9398ebbe1c533480574a03f7a5082cdeea96292af`; это evidence, не новый runtime input. Она связывает 18 actual source hashes, root-reported base 7e77484 и реальный baseline case: existing test module получил exit0/free из-за неполного sweep. Этот ответ не K1 admission; pure decideNameCheck не обвиняется.

## MUST / acceptance
| ID | Проверяемый контракт |
|---|---|
| FR-1 | Один optional valued --source-root с absolute existing directory; default project сохраняется. Дубликат/valueless/relative/missing/unknown name-check args → NOT_ESTABLISHED/exit2, не app-only FREE. Help, known-flags, existing optionLists и consumer согласованы. |
| FR-2 | Clipmkr defaults apps/packages/scripts/tests; existing JS/MJS/CJS/TS/TSX declarations/.d.ts exclusion и native harness default сохраняются. В default roots прочие языки (включая .sh/.py/.rb) исключаются без чтения тела, с reported exclusions; Python добавляется только для explicit root. Extra source root дополняет scope; .py basename учитывается. Existing root может быть пуст: при непустом общем sweep допустим limited free с counts0 и без claim Python execution. Missing/unreadable root и global files0 → exit2. |
| FR-3 | Python stdlib AST получает source через stdin: module-owned def/async def/class, в том числе control flow; без импорта/исполнения investigated source. Nested scopes не расширяют exports; dynamic aliases не доказаны. Syntax/encoding/parser failure → exit2 без snippets/traceback; side-effect marker отсутствует. |
| FR-4 | Перед/после blocking steps проверять monotonic elapsed и лимиты: one extra root, depth32, entries20000, sources4096, 1MiB/file, 32MiB total, elapsed10000ms; parser timeout≤min(2000ms,remaining), maxBuffer1MiB. Selected symlink/path/read/parse/limit/late result; в extra root также unsupported code (.sh/.rb) или unrecognized source candidate → whole-scan exit2, не successful subset. |
| FR-5 | Pure decision outcome/exit/results/reason сохраняются; additive scan metadata содержит actual roots/status, observed languages/files/bytes/counts/exclusions и безопасный failure code. Human/JSON scope согласован. Complete nonempty scan с absent name→free0, existing name→taken1; source coverage относится только к declared roots/languages. |
| NFR-1 | Источники только данные; без shell interpolation, target exec/import, body/secret/traceback echo. Fixed parser program, bounded stdin/output. Secrets/private absolute examples не добавлять в публичные документы. Existing CLI telemetry не объявляется новым source-write поведением. |
| NFR-2 | Все новые K1 cases исполняют actual candidate-patched temp CLI; старый known patch снимается только с temp copy. Existing K1/K2 controls, meaningful mutants/refuse-all positive обязательны. Shared installation/native QE untouched до принятия; затем отдельная reviewed installation/actual K1, не fixture admission. |

## Границы и выбранные пределы
Статическая sizing-проверка current repo: 467 regular sources, около 3MiB, максимальный файл около 126KiB; выбранные constants оставляют запас без новых config knobs. Extra namespace выбирается caller по реальному будущему назначению; пустой каталог можно создать без seed code. Нет обязанности читать весь диск/исторические private drafts.

По явному уточнению root hard wall-time SLA отсутствует: sync FS syscall не прерывается scanner внутри; late return отвергается. Внешний supervisor может ограничивать весь вызов. Python CPU parse имеет настоящий child timeout. Worker/IPC/hidden CLI modes/root registry не нужны.

Не входят: новые repo modules/public exports/dependencies, правки package/installer/core/K2/recovery workflow, автоматическая установка или STEP4 runtime. Если два targets недостаточны, назвать конкретную причину и пересмотреть scope до кода. Approval/checkpoints/recall/K1/K2/strict OpenSpec/код/QE ещё не выполнены.
