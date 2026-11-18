# План

Inputs read: 01_requirements, 02_reuse_inventory, 03_adr/001-private-support-webhook.md, ADR-001, 05_architecture, OpenSpec, исходники событий Libredesk v2.9.0, донор Telegram проекта 02.

## Задачи

- ADR-001 FR-1 FR-2 FR-3. Приёмник подписи, фильтрация, ссылка на UUID, Telegram sendMessage из существующего профиля.
- ADR-001 FR-4. Отдельный Compose-сервис и обратимые инструкции для VPS. Для работающего SSRF guard задаём фиксированный IP адаптера и разрешаем только его /32. Перед bind mount извлекаем публичный исходник с доступом на чтение пользователю node. Добавляем отдельный обязательный npm-запуск целевого набора. Проверяем реальный вызов разрешённого маршрута и отказ на неразрешённый внутренний адрес.
- ADR-001 NFR-1. Проверить подпись по сырым байтам, отсутствие оповещения для исходящего и закрытого сообщения, отсутствие утечки при сбое, ссылку и две реплики клиента в действующем виджете. Целевой файл `tests/libredesk-telegram-adapter.test.mjs`. Одна фальсификация фильтра и одна фальсификация проверки подписи должны сломать свои целевые проверки.

## Порядок

Согласованная дельта, проверка требований, K1/K2 и допуск целей, реализация, независимое ревью замороженной ревизии, проверка Compose, подключение webhook только после успешной локальной проверки. Rollback отключает только новый вебхук и останавливает Compose-сервис.

## Риски

Служебное событие не уведомляет группу. Повтор входящего event при отсутствии устойчивой очереди может создать повторное уведомление. Сбой сети виден по результату upstream, поддержка продолжает работать. Использовать сентинелы в теле для исключения передачи PII, полные секретные URL в логах запрещены.

## Amendments

AM-1 (qcsd): Подтвердить приём 204 при отказах Telegram с одной попыткой. Confirmation: 429/5xx, ok:false и тайм-аут дают обезличенный результат → test `acknowledges a single failed Telegram attempt` in `tests/libredesk-telegram-adapter.test.mjs` (fails if reverted).
AM-2 (qcsd): Реализовать точный подписанный контракт Libredesk v2.9.0. Confirmation: изменённое сырое тело или неверное поле не вызывает Telegram → test `authenticates the original bytes and rejects invalid events` in `tests/libredesk-telegram-adapter.test.mjs` (fails if reverted).
AM-3 (qcsd): Наблюдать доставку по ответу Telegram в целевую группу, а не по ACK. Confirmation: ответы Bot API и отсутствие пересылки исходящего → test `reports Telegram delivery only for the intended chat and exact text` in `tests/libredesk-telegram-adapter.test.mjs` (fails if reverted), плюс отдельный реальный проход виджета.

EXPECTED_CODE_TARGETS:
- ops/libredesk/telegram-adapter.mjs
- ops/libredesk/telegram.compose.yml
- package.json
- tests/libredesk-telegram-adapter.test.mjs
- docs/operations/libredesk-telegram.md
