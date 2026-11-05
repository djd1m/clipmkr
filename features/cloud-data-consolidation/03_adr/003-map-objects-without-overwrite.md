# ADR-003: Сопоставлять объекты без перезаписи target

## Status
proposed — пересмотреть после fresh DB/object namespace inventory; обратимо до смены references.
## Context
Native StorageClient добавляет один prefix к logical key; оба datasets могут ссылаться на разные physical paths или на один общий объект. Клиент scoped запрещает CopyObject. Erasure требует бакет без versioning.Status.
## Decision Drivers
Высокий: FR-2/9 — все bytes c остаются; высокий: private ownership/retention; средний: native SDK и прежние logical references.
## Considered Options
| Вариант | Плюс | Минус |
|---|---|---|
| Сменить общий prefix всем | Мало конфигурации | Ломает c references, может открыть чужой объект |
| Оставить разнородные keys без mapping | Нет затрат copy | Один клиент не объясняет разные пространства и collisions |
| DB whitelist + отдельная область импортируемых logical keys | Изоляция без нового bucket/service | Нужно copy/rewrite и место для проверенной репетиции |
## Decision
Сохранить существующее target prefix и target logical keys. Для source составить exact mapping физических исходников в непересекающийся logical namespace внутри разрешённой target области; имя prefix выбирается после inventory/K1. Не класть physical prefix в DB. При доказанном совпадении bytes и допустимом совместном lifecycle можно ссылаться на существующий объект только после решения о retention/refcount; одинаковый checksum сам по себе не доказывает одинаковые права.
Проверить каждый whitelisted copy по размеру и SHA-256/байтам, установить write-once/precondition в выбранном разрешённом copy пути; не overwriting существующего key. Прерывание оставляет приватные staging objects и receipt, DB не публикует непроверенные keys. Не выполнять cross-bucket/namespace copy через запрещённую native команду без отдельного адаптера/проверки. Прежние signed URLs не мигрируют; новый origin выдаёт новые авторизованные подписи. Watermark в уже готовых пикселях не меняется миграцией.
## Rationale
Уважает FR-2/8/9 и текущий prefix contract. Подмена общего prefix и rename S3 keys без DB graph небезопасны. Один encode/перерендер не нужен для обычного переноса готовых bytes.
## Consequences
Плюс: c не переписывается, перенос возобновляем. Минус: дополнительное хранение/GET/transfer; размер и бюджет измерить. Missing/deleted/expired выделяются до copy; object backup сохраняется по согласованному сроку без противоречия удалению. Versioning не включать: это изменит native erasure. Follow-up: отдельный storage adapter ADR при несовместимом backend. After-action: root после первого retention цикла.
## Confirmation
Method: A4, реальные разрешённые fixture objects после GO, native storage/erasure tests. Monitoring: unmatched key, checksum mismatch, out-of-scope mutation. Success metric: все ожидаемо живые objects сверены, 0 overwrite/ownership leak. Owner: root + independent reviewer. Load-bearing property: target bytes неизменны. Required automated check: будущий `consolidation_object_collision_preserves_target` (файл после K1). Given same key/different bytes, when copy retry, then refuse overwrite и target checksum прежний; при S3 outage references не публикуются. NOT RUN.
