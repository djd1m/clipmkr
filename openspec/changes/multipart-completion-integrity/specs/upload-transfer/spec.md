## ADDED Requirements

### Requirement: Полнота multipart перед завершением

Для uploading система MUST требовать число contiguous частей, равное
ceil(declared_bytes / upload_part_size), до обращения storage.complete. Существующая schema MUST
сохранять диапазон, уникальность и непрерывность номеров. Чужой/несуществующий video_id MUST
давать одинаковый404 до storage. Уже admitted/committed queued MUST сохранять прежний retry.

#### Scenario: Прислан только непрерывный префикс

GIVEN uploading запись требует три части
WHEN клиент передаёт части1,2 или четыре непрерывные части
THEN сервер MUST вернуть invalid422 до Complete, без actual_bytes/queued/enqueue/refund/cleanup.

#### Scenario: Legacy queued retry

GIVEN queued уже зафиксирован, но enqueue не подтверждён
WHEN повтор complete содержит короткий валидный список старого клиента
THEN система MUST повторить publish без S3 и без требования metadata незавершённого multipart.

### Requirement: Подтверждение заявленного размера перед обработкой

После успешного Complete или восстановления потерянного ответа система MUST сверить HEAD
готового объекта <=MAX_UPLOAD_BYTES с declared_bytes до Range, записи actual_bytes/queued и enqueue.
Несовпадение MUST вернуть существующий conflict409 без нового failure_reason и без списания,
refund, abort/delete. HEAD >MAX и UploadTooLarge адаптера MUST сохранять прежний too_large с
штатным refund/cleanup. База/очередь MUST не принимать объект из integrity reject пути.

#### Scenario: Неполный объект после потерянного ответа

GIVEN ответ Complete потерян, HEAD успешно вернул размер меньше declared_bytes
WHEN сервер восстанавливает результат завершения
THEN сервер MUST вернуть conflict409 до Range/транзакции/очереди, сохранив запись и объект.

#### Scenario: Полный объект

GIVEN expected parts count и HEAD точно соответствует declared_bytes, тип допустим по bytes
WHEN завершение подтверждено
THEN actual_bytes и queued MUST фиксироваться до enqueue, включая lost-response ветку.

#### Scenario: Прежний отказ слишком большого файла

GIVEN HEAD >MAX_UPLOAD_BYTES или адаптер сообщил UploadTooLarge
WHEN выполняется завершение
THEN прежний too_large MUST сохранять refund/cleanup, без enqueue и без переименования в integrity.
