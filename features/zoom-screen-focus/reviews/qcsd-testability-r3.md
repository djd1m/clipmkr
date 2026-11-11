# QCSD testability — focused verification R3

**Собственный verdict: clean на уровне дизайна.** Snapshot `e66723874cc112533766c6896c800786109567d430efd4f5a7ff1b30382acfdd`, nonce `0276c1f3-2f7b-4e38-96c4-10258020aca1`. TST-01 повторно подтверждено для этого snapshot. Это не оценка выполнения тестов или решение общего gate; UX-04 закрывает только его originating reviewer.

Независимо пересчитаны все девять SHA manifest; 01 `5464fbea…` и ADR-001 `1130c078…` совпадают с R2. OpenSpec pins совпадают с текущими файлами, а diff R2→R3 содержит отдельный сценарий draft и не изменяет camera scenario. Текущий ADR-001 сохраняет positive controlled FaceReport и variant02: обязательны `cameraVisible=true`, непустая камера и кадры B/blank; always-hidden не проходит. Вето по отрицательному замеру, ограничения identity/subsample и текст до подтверждения сохранены. Это проектные оракулы: FFmpeg, YuNet и browser здесь не запускались.

Для delta UX-04 сопоставлены непосредственные diff ADR-003, domain model, architecture, plan и OpenSpec. Accepted/pending/reload/failed сохраняют envelope; submitted snapshot отделён от текущего layout с монотонной draftVersion. Автоочистка допускается при совпадении авторитетно опубликованной версии/config/source и принятой связи clip/request key/version, а также повторно прочитанной непосредственно перед удалением неизменённой версии/layout draft. Поздний B и A→B→A остаются; после failed/reload последний draft редактируем, новый apply автоматически не создаётся. Хранение при запрете sessionStorage не обещается, прежнее предупреждение остаётся.

Три будущих browser oracle различают нужное поведение:

- `accepted_reload_failed_restores_editable_layout_draft`: accepted A → reload → failed восстанавливает редактируемый draft и старый MP4 без нового apply; мутация clear-on-accepted должна ломать проверку.
- `published_layout_clears_only_matching_draft`: envelope наблюдается до точной публикации того же intent/version/config/source и отсутствует после неё; never-clear должен ломать проверку.
- `late_draft_edits_survive_older_publication`: B и отдельный A→B→A с новой draftVersion переживают reload и поздний publish A; clear-on-any-success/config-only должен ломать проверку.

Сверены девять архивных R2 документов с их manifest, R3 author evidence hashes и 143 уникальных cumulative changedScope: все изменённые host paths и 59 ранее заявленных targets включены. 40 editable + 19 read-only остаются измеряемым составом, не расширением прав записи. Авторская оценка новых рисков рассмотрена; новых самостоятельных серьёзных условий в этой узкой дельте не обнаружено. Canonical Original helper остаётся зависимостью последовательной интеграции; успешную интеграцию или фактическое состояние другого worktree это review не подтверждает.

`implementationVerified=true` в ideation receipt означает самостоятельную проверку исправленных design inputs, не существование продуктовой реализации или прохождение тестов. Ни реальные пользовательские данные, ни БД/S3, ни продуктовые тесты, ни поставка не использовались. Оценки R1 относились только к проектной тестируемости, не к actual test coverage или WCAG результатам.
