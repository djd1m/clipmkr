# Оценка multipart-completion-integrity

Уровень: **S**. Один домен upload, один production-файл и один новый unit-файл.
Модель автора requested `gpt-6.1-sol high`; фактический runtime ID не аттестован.
База: a23e99468d97aa7c9b47e4eb6e90824695bac0eb. Изолированный worktree; UI, миграции,
платежи, внешние VM/S3 и production env не затрагиваются.

Наблюдение чтением: completeUploadSchema гарантирует непрерывные номера с 1, но не знает
expected count записи; VideoService.complete не сравнивает число частей с declared_bytes /
upload_part_size и HEAD с declared_bytes. Необходим RED до исправления.

Сложность: 2 code files; существующие UploadError/VideoService/UploadStorage и transaction;
новые API/команды/exports/schema/enum/зависимости отсутствуют. Нового архитектурного решения нет:
укрепляется существующая граница принятия файла. При расширении >3 code files или потребности
в изменении UX/схемы — остановка и пересмотр уровня, а не скрытое расширение.

## Переиспользование

VideoService.complete, completeUploadSchema (contiguous+unique), UploadError conflict/invalid,
UploadStorage head/complete и existing admitted/publish. Из проектов 1–8 и OSS новый код не нужен.

## Acid corpus

| ID | Непригодный ввод/состояние | Требуемое поведение |
|---|---|---|
| A1 | Только непрерывный префикс частей | Отказ до storage.complete и любых изменений БД |
| A2 | Лишняя непрерывная часть | Отказ до storage.complete |
| A3 | HEAD <=MAX меньше/больше declared_bytes после Complete | Нет actual_bytes, enqueue, failed/not_media, cleanup и списаний |
| A4 | Ответ Complete потерян, HEAD существует с другим размером | Тот же integrity reject без enqueue |
| A5 | Старый queued/admitted retry с кратким валидным списком | Прежняя идемпотентность, отсутствие повторной проверки старого multipart |
| A6 | Чужой/удалённый/несуществующий video_id | Один 404, никаких storage/enqueue side effects |
| A7 | Complete/HEAD недоступны | Прежний unavailable503, данные сохранены |
| A8 | Части с дыркой/дублем/нулём | Существующая schema422 до storage |

## Test-only follow-up существующей S3 fixture

После реального S3 прогона root выявил несовместимую fixture: declared24 против9 байт bad media.
Уровень остаётся S: теперь3 code targets (прежний production, прежний unit и существующий
tests/upload.integration.test.ts), один upload домен; в follow-up меняется только payload теста.
Новых module/export/команд/интеграций/UX нет. Исходный unit-only scope выше — история исходного
фикса. Отдельный real S3 regression разрешён root только через существующий private fenced profile
и изолированную test DB; подготовку/повтор GREEN выполняет root, не на app DB и не через MinIO.
