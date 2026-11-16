# Узкая авторская поправка R3: UX-04

Исходный R2 evaluate: exit1, unresolved только UX-04; nonce `0226529f-7134-4088-946e-bc6c7a30a6da`, revision `0795744bd1c936b14cd94ee5296261d49286baf728c8827b6ec33f54170e7a70`. Первые десять условий получили собственные origin verifications R2; их формулировки/ownership и история остаются в исходных receipts, автор их не заменяет.

## Точное условие и владение

UX-04, owner `qcsd-ux`, HIGH/structural, из `newRisks.conditions` R2 receipt:

> Однозначно определить жизненный цикл draft после accepted/pending apply до успешной публикации или отказа; при failed после reload восстановить пригодный к редактированию draft, включая несмешанные с accepted intent последующие правки, и не удалять новый draft при завершении старой операции. Задать non-vacuous проверки accepted→reload→failed→редактирование и success publication→очистка только соответствующего draft.

Источник неопределённости — «до успешного apply» в ADR-003, хотя ADR-002 различает accepted/pending и publication/failed. Это исправление проектного контракта; runtime потеря данных не утверждается.

## Исправление

ADR-003 теперь явно сохраняет envelope при accepted/pending/reload/failed. Монотонная local draftVersion и canonical current layout отделены от immutable submitted snapshot. Принятый response/exact replay связывает request_key с render_version по ADR-002; после reload→failed последний draft остаётся editable, прежний MP4 доступен, новый apply не происходит автоматически.

Automatic clear допускается только при authoritative successful publishedRenderVersion/config/sourceRevision соответствующего intent и неизменённой **перечитанной непосредственно перед удалением** draftVersion/layout. Новые правки, в том числе A→B→A, делают сохранённый draft другой версией; поздняя публикация прежней операции не удаляет его. Existing explicit discard/account/retention/storage-unavailable границы не меняются.

Синхронизированы ADR-003, один lifecycle bullet04, один architecture paragraph05, TASK-5/AM-12 в06 и один user-visible OpenSpec scenario.01/00, ADR-002, approved selector/PNG/UI approval, R2 тексты состояний и59 targets (40 editable+19 read-only) неизменны. Ни новых controls/routes/таблиц/ML/очередей/платёжных правил, ни новых source dependencies нет.

## Различающие проверки

- `accepted_reload_failed_restores_editable_layout_draft`: accepted/pending A→reload→failed→редактирование B; A/последние ROI восстановлены, old MP4 доступен, нового apply нет. Clear-at-accepted ломает проверку.
- `published_layout_clears_only_matching_draft`: проверить существование envelope до exact authoritative success, затем отсутствие после совпадения intent/config/sourceRevision/draftVersion. Never-clear ломает проверку.
- `late_draft_edits_survive_older_publication`: B и отдельный A→B→A с увеличенной draftVersion переживают reload и late published A; envelope/current ROI сохранены. Clear-on-any-success/config-only ломает проверку.

Все три planned test titles относятся к `tests/browser/clip-layout.test.ts`; исполнения в R3 нет. Не имитируются independent verifications.

## Архив и доказательства

Только девять непосредственно затронутых R2 документов/старых pins/dossier сохранены в `history/qcsd-r2-design/`, checksum manifest отдельно; прежний33-file R1 archive рекурсивно не копировался. Минимальные strict OpenSpec/docdiff/hash результаты — `r3-document-checks.json`; актуальные requirement/source pins и dossier обновляются после проверки.

Original canonical helper остаётся собственной source integration зависимостью другого потока; tentative implementation не импортируется/не пинится как принятая. Source/code/K1/K2/DB/S3/runtime/commit/gate mutations отсутствуют. Новых серьёзных условий автор в этой узкой дельте не выявил; независимый origin recheck выполняет root. Author changedScope сохраняет всю накопленную R2 область и добавляет R3 пути.
