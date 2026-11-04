# Требования к целостности CompleteUpload

Исправление серверной целостности авторизовано отдельно; макет UI не требуется.

FR-1: Для uploading число присланных частей должно быть равно ceil(declared_bytes / upload_part_size)
до storage.complete. Непрерывность, уникальность, диапазон и обязательность списка сохраняет
существующая completeUploadSchema. Недостающий/лишний непрерывный список даёт invalid422.

FR-2: Если HEAD готового объекта доступен, для размера <=MAX_UPLOAD_BYTES его bigint значение обязано совпасть с declared_bytes
до Range, транзакции записи actual_bytes, queued и enqueue. Это относится к успешному Complete
и ветке восстановления потерянного ответа. Несовпадение даёт существующий conflict409 с честным
текстом размера, без нового failure_reason и без маскировки not_media.

FR-3: При отказах FR-1/FR-2 нет actual_bytes/status/failure_reason updates, enqueue,
нового расхода/возврата квоты, abort/delete. Существующие upload_id и object_key сохраняются.
Для HEAD >MAX_UPLOAD_BYTES и исключения UploadTooLarge адаптера сохраняется прежний
приоритет too_large и штатные actual_bytes (если HEAD известен), refund/cleanup. Это отдельная
существующая ветка отказа по пределу, а не новый integrity reject409.

FR-4: Ранние admitted/queued retry сохраняют текущую семантику. Admitted повтор не вызывает
storage/enqueue. Legacy queued (даже без upload_part_size, неполный валидный parts list) допускает
повтор publish после committed queued и не проходит новую проверку незавершённого multipart.

FR-5: Отсутствующая/удалённая/чужая запись даёт not_found404 до storage и enqueue.

FR-6: Полный набор + ровно заявленный HEAD + допустимые magic bytes по-прежнему допускают файл:
actual_bytes и queued фиксируются до enqueue. Потерянный Complete с правильным HEAD проходит.
Сбой enqueue после committed queued исправляется повтором без повторного Complete/HEAD.

NFR-1: Сеть и HEAD/Range остаются вне транзакции; guarded recheck ownership/state under FOR UPDATE
и post-commit publish сохраняются. Новых production names/API/enum/миграций нет.

NFR-2: Проверки выполняются на fake storage/pool unit harness, без MinIO/реальных БД/S3/очередей/оплат.
Реальная конкурентность PostgreSQL и live Cloud.ru этой задачей не доказываются.

### Test-only regression follow-up по реальному S3 наблюдению

Прежний NFR-2 описывает исходное unit доказательство и остаётся его ограничением. Root отдельно
разрешил существующий real S3 regression на isolated test DB с текущим private S3 fencing profile.
В concurrency not_media fixture payload должен совпадать с declared_bytes и оставаться не-медиа,
чтобы проверялся media reject422/refund/replay после успешной проверки FR-2, а не size conflict409.
Production guards, not_media/refund/concurrency/replay assertions не меняются. Этот test-only follow-up
не доказывает GREEN до фактического повторного запуска root и не разрешает работу с app DB/MinIO.
