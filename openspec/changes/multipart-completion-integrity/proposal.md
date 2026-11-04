# Целостность завершения multipart

## Why

Непрерывный префикс частей сейчас можно принять как целый файл; HEAD не сверяется с заявленным
размером. Это может запускать обработку неполного объекта.

## What Changes

До Complete сверять ожидаемое число частей uploading-записи, после HEAD проверять совпадение
размера <=MAX с declared_bytes. Сохранить queued/admitted retry и прежний too_large/refund/cleanup.
UI, схема данных и новые failure_reason не требуются.

## Impact

apps/web/src/server/video.ts; tests/upload-completion-integrity.test.ts. Только серверная
целостность. Реальный выпуск/платежи/S3 в этом изменении не выполняются.
