# ADR-004: Оградить запись и сверить cutover

## Status
proposed — пересмотреть после inventory писателей, измеренной репетиции и выбранного окна; исполнение не разрешено.
## Context
Прежние Cloud релизы отменялись; исторический working tunnel не доказывает нынешний доступ. Два набора могут изменяться во время копирования; rollback после новых записей отличается от возврата старого приложения.
## Decision Drivers
Высокий: FR-10/11 — zero unexplained loss, проверенное восстановление; высокий: нет новых контейнеров/MinIO; средний: переиспользование controller/release manifests.
## Considered Options
| Вариант | Плюс | Минус |
|---|---|---|
| Одновременная запись в два контура | Нет заметного freeze | Split-brain и двойные эффекты; нет доказанного reconciliation |
| Полный stop-and-copy | Простая консистентность | Окно недоступности зависит от размера медиа |
| Предкопирование immutable объектов + финальный fence обоих datasets | Сокращает окно, сохраняет одну authority | Нужны final diff, deletion handling и доказательство полного fence |
## Decision
Предлагается предкопирование только разрешённых неизменяемых bytes; финальный relational import выполняется из двух согласованных snapshots после fence всех писателей. Для bounded первого варианта выбирать полный финальный snapshot и compare, не `updated_at > t` как неполный CDC. Deletes/tombstones, новые child rows и delayed external events входят в final reconciliation. Если финальная сверка не укладывается в согласованное окно, пересмотреть ADR до исполнения.

Репетиция — уникальные scratch DB в существующем PG16, с collision check, private доступом и явным запретом имён active DB/n5_test. Нужны ресурсы/restore rights, нельзя заимствовать боевую схему. Два независимых backup восстанавливаются и сравниваются до разрешения writes. Новый dataset строится в отдельной БД того же существующего PG16 при достаточной ёмкости; старые DB/volumes не перезаписываются. Переключение DB binding — отдельная операция под root GO, с сохранённым target before-image.

До первых новых c writes: допускается возврат прежнего application/DB binding при проверенной совместимости и сохранённых поздних provider событиях. После новых writes: freeze, snapshot нового состояния, reconcile все новые регистрации/медиа/платежи/удаления; восстановление вперёд предпочтительно. Возврат traffic/DB без учёта этих событий запрещён. Старые writers не возобновляются автоматически, pending webhooks не теряются в памяти.
## Rationale
FR-10/11 требует реального restore, а не факта наличия dump. Предкопирование снижает длительность, не меняя определения authoritative данных. Сохранённый source нужен для расследования, но не становится второй writable production.
## Consequences
Плюс: понятная точка записи и доказуемый rollback. Минус: freeze и дополнительный диск; mitigation — измерить capacity/RTO заранее. Exact command/run manifest и cleanup allowlist утверждаются после inventory; старые controller admissions не переиспользуются как разрешение merger. Follow-up: ADR для CDC только при измеренной необходимости. After-action: root через 24 часа и 30 дней после cutover; регулярно репетировать restore и доступ.
## Confirmation
Method: PG16 restore rehearsal + A2/A5/A6, failure injection до/после commit/cutover. Monitoring: writer activity, snapshot drift, durable pending events, new-write marker. Success metric: 0 unexplained rows/bytes/financial effects; restore входит в согласованный RTO. Owner: root + независимый ops reviewer. Load-bearing property: post-write rollback не теряет acknowledged writes. Required automated check: будущий `consolidation_rollback_preserves_postcutover_writes` (файл после K1). Given новый платёж/видео после switch, when rollback запрошен, then старый dump не применяется до reconciliation; неизвестный writer даёт STOP. NOT RUN.
