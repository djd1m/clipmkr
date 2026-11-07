# ADR-001: Ограничить статическое обследование реальных source roots

## Status
proposed; обратимо до reviewed installation. Пересмотр при неподдержанном source namespace или превышении limits.

## Context
Частичный app sweep может отвечать FREE при существующем test/private имени. Pure decision получает maps и не знает фактическое покрытие; расширение требуется в collector, не в semantics decideNameCheck.

## Decision
Сохранить installed decision и JS/TS declaration parser. Добавить tests в Clipmkr default и один explicit absolute source-root для существующего real directory; повторный/пустой flag отвергается. Python .py basename и module-owned def/async-def/class получать через stdlib AST без исполнения source. Сохранить synchronous scanner: monotonic elapsed checks до/после blocking steps; late return → NOT_ESTABLISHED. Python parser — bounded child с stdin, timeout/maxBuffer. Scan worker/IPC/hidden CLI mode, новые файлы/helpers/public exports не вводятся.

В default roots сохранить JS/TS selection и явно учитывать исключённые другие языки; extra root дополнительно поддерживает Python, а unsupported code (.sh/.rb) или unrecognized candidate там отвергается. Failure любого обязательного root/read/path/parse/limit — aggregate NOT_ESTABLISHED. Отдельные roots не превращаются в успешный subset. Пустой real extra namespace допустим с counts0 при непустом общем sweep; missing root и global files0 отвергаются. Дополнительное scan evidence показывает фактические roots/languages/counts и policy exclusions; existing decision fields сохраняются.

## Alternatives / rationale
Manual rg дешевле, но не даёт installed gate. Перенос настоящего tooling в scripts меняет другой scope. Новый scanner framework избыточен. Existing collector с budgets сохраняет reuse. Hard wall-time SLA не задан: sync filesystem syscall нельзя объявлять прерываемым; отдельный внешний supervisor может ограничить весь вызов.

## Consequences
Python требуется только при выбранном Python source. Невалидный/неподдержанный namespace может отказать при свободном имени; это честная неполнота. Parser timeout и изолированный patch baseline требуют проверок, но укладываются в существующие два repo targets. Поздний возврат I/O отвергается, задержка внутри syscall остаётся явным ограничением. Нового AST/compiler framework нет.

## Confirmation
Будущий независимый QE. В `tests/feature-adr-paths.test.mjs`: `K1 covers tests and external Python declarations`, `K1 refuses incomplete source coverage`, `K1 bounds scan and parser resources`, `K1 reports complete coverage without source text`, `K1 guard mutations discriminate` и `K1 valid free result remains possible`. Требуются actual candidate CLI, concrete exit/outcome/effect и red/green mutants; все NOT_RUN. Наблюдаемые counters — roots/files/bytes по языкам, success только при complete coverage.
