# Запись f90c: почему не готовы фрагменты 2–5

Дата расследования: 5 ноября 2026, время UTC. Проверка только чтением: PostgreSQL, точные задания Redis, существующие worker logs, HEAD объектов и размеры/время локальных временных файлов. Медиа и транскрипт не читались, provider/render/retry/письма не запускались, данные и очередь не изменялись.

**Подтверждённая причина завершившихся отказов — таймаут потокового запроса публикации результата в S3.** Метка БД `ffmpeg_failed` здесь не доказывает поломку ffmpeg: код ставит её и при произвольной ошибке публикации. Откуда возникает задержка S3 PUT — сеть, транспорт, поведение endpoint или другой фактор — имеющихся данных не устанавливают. Отсутствие объекта само по себе за доказательство причины не принималось.

## Состояние, а не предположение о зависании

Снимок БД **17:59:09**: родитель `rendering`, 5 фрагментов, готов1, stage_progress60, finished_at отсутствует. Длительность источника5305,9с. В настройках записи `music=false`, `compact=true`, `teaser=true`.

| Фрагмент | Первая попытка закончилась | Вторая попытка / текущая очередь | Итог на момент снимка |
|---|---|---|---|
| 1 | Успех17:39:23, fence4 | Не требуется | `done`, 10 208 471байт |
| 2 | Отказ17:42:20, fence5 | Отказ17:54:57, fence9 | `failed`, обе попытки исчерпаны |
| 3 | Отказ17:45:45, fence6 | Отказ17:58:06, fence10 | `failed`, обе попытки исчерпаны |
| 4 | Отказ17:48:41, fence7 | fence11 активен в BullMQ в17:58:47; БД фиксирует начало17:58:34 | `rendering`, вторая попытка |
| 5 | Отказ17:51:49, fence8 | fence12 ожидает в BullMQ в17:58:47 | БД `rendering`, но это ещё не активная обработка |

БД помечает lease попытки как `running` ещё при создании, поэтому наличие `running` у фрагмента5 не означает параллельный рендер. Render worker имеет concurrency1: четыре первые попытки прошли последовательно, затем идут вторые. Фрагменты4–5 могут сменить состояние после указанного времени; таблица не является обещанием их будущего результата.

На старте записи был отдельный отказ кредита в17:05. Затем новая серия успешно прошла STT к17:36:25 и selection к17:36:44. Этот прежний отказ не объясняет текущие render/publication failures.

## Цепь доказательств

1. **Коррелированные worker logs.** Для этой записи fences5,6,7,8,9,10,11 имеют событие `render_attempt_failed` с одинаковым сообщением:

   ```text
   Request aborted
   Caused by: The operation was aborted due to timeout
   ```

   Непосредственно перед ними AWS SDK сообщает о non-retryable streaming request. Точное время и clip/fence сохранены в закрытом evidence. В этой выборке нет событий ошибки процесса ffmpeg, которые его обёртка пишет отдельно.

2. **Это потоковый исходящий запрос, а не произвольная ошибка медиа.** Проверен код SDK внутри фактического worker image: `/app/node_modules/@smithy/core/dist-cjs/submodules/retry/index.js` выдаёт это предупреждение в ветке `isRequest && isStreamingPayload(request)`, затем выбрасывает ошибку без транспортного retry потока. В renderer поток тела используется при PutObject из `createReadStream`.

3. **Публикация ограничена120с.** В установленной ревизии renderer после завершения render и thumbnail создаёт `AbortSignal.timeout(120_000)` на публикацию MP4 и thumbnail. S3 PUT выполняется до транзакционного принятия результата БД. Ошибка обычного SDK не является `FFmpegError`, но catch преобразует её в `ffmpeg_failed`. Это объясняет расхождение метки и логов.

4. **Наблюдались уже готовые локальные файлы активной попытки4.** В18:00:11 в единственном активном рабочем каталоге были `clip.mp4` размером10 828 652байта, mtime17:59:01.061, и `thumb.jpg` размером30 479байт, mtime17:59:01.922. Содержимое не открывалось. На этот момент результат ещё не принят БД. Это дополнительное подтверждение, что задержка происходит после локального формирования файлов.

5. **HEAD только точных объектов в17:58:47.** Исходник присутствует:252 814 186байт. MP4 и thumbnail фрагмента1 отвечают200, положительный `n5-render-contract`. У ожидаемых MP4/thumbnail2–5 ответ404. Все пять clip rows имеют watermarked=true, поэтому проверены правильные free keys; полные ключи и bucket не публикуются. HEAD404 подтверждает отсутствие готового канонического объекта в момент проверки, но не раскрывает причину таймаута или существование промежуточных байтов на стороне хранилища.

6. **Очередь работает.** В17:58:47 fence11 находился вactive,12 — wait. Предшествующие fences4–10 — completed в BullMQ, причём5–10 провалены в прикладной БД. Это штатное следствие handler, который возвращает `'failed'` без throw. Поэтому BullMQ completed не является свидетельством готового клипа; авторитетны прикладные статусы и наличие объектов.

## Последняя сверка18:01:50

Фрагмент4 также завершил вторую попытку отказом: событие fence11 в18:01:02.058 с тем же `Request aborted → timeout`. Это через120,136с после mtime его готового thumbnail17:59:01.922, то есть согласуется с120-секундным окном последующей S3 publication. Теперь2–4 failed,5 ещё rendering; родитель rendering, готов1, stage_progress80. Отказы fence10 и11 дополнительно сохранены в финальной выборке логов. Финальное состояние фрагмента5 на этом исследовательском срезе не предсказывается.

## Ревизии и точные места кода

Live metadata: web revision `f55ae4004b88f59558496217e522f26e3288b009`, image `sha256:1d1cb424ba273d24e34e12d3237d77616a31313936ed101e30e1fe3b59a4f74a`; все три worker revision `ebb590260b2df9151b9df62098488e2aaac3ee21`, image `sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800`. Worker-video running, restartCount0, container OOMKilled=false, started2026-11-04T21:32:45Z. Эти поля не исключают любые исторические проблемы дочернего процесса/хоста, но не подтверждают рестарт воркера как причину.

Сопоставленные файлы renderer/storage/exec/attempts/render DB/S3 client между ebb и f55 идентичны. Документационный worktree создан отдельно от main `71488144664f8cdd55e29ea53e0df0246eed3c0d`; main не принимается за runtime worker.

| Механизм | Закреплённый источник |
|---|---|
| Render→thumbnail→публикация; общий120с upload signal | [apps/worker/src/workers/render.ts:64](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/apps/worker/src/workers/render.ts#L64), [строка85](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/apps/worker/src/workers/render.ts#L85) |
| Generic error становится ffmpeg_failed; concurrency1 | [render.ts:95](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/apps/worker/src/workers/render.ts#L95), [строка117](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/apps/worker/src/workers/render.ts#L117) |
| Потоковый PutObject с IfNoneMatch; повторное принятие только совпадающего contract | [apps/worker/src/render/storage.ts:12](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/apps/worker/src/render/storage.ts#L12) |
| Публикация раньше принятия БД | [packages/db/src/render.ts:82](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/packages/db/src/render.ts#L82) |
| Не более2 автоматических попыток на clip/series | [packages/db/src/attempts.ts:18](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/packages/db/src/attempts.ts#L18) |
| Родитель завершится, когда все clips terminal; при хотя бы одном done родитель станет done | [packages/db/src/render.ts:47](https://github.com/djd1m/clipmkr/blob/ebb590260b2df9151b9df62098488e2aaac3ee21/packages/db/src/render.ts#L47) |
| Опубликованный общий retry требует parent failed | [apps/web/src/server/video-retry.ts:5](https://github.com/djd1m/clipmkr/blob/f55ae4004b88f59558496217e522f26e3288b009/apps/web/src/server/video-retry.ts#L5) |

`stage_progress` учитывает terminal(done+failed), поэтому60% здесь не означает3 готовых фрагмента. Ограничение музыкального сервиса parent done не объясняет S3 таймауты. Настроенный endpoint существующего источника — `s3.cloud.ru`; это чтение метаданных действующего хранилища, не действие над отменённым Cloud VM-переносом.

## Самый малый безопасный вариант дальнейших действий — предложение

Сначала отдельно подтвердить/устранить причину зависания S3 publication: добавить различимые стадии/время/размер PUT без пользовательского текста и секретов; проверить обоснованный ограниченный upload budget и возможность повторить PUT с **новым** file stream при retry. Слепое повышение таймаута или повторная постановка без диагностики не гарантируют исправления. Сохранить create-only contract и fencing, не перезаписывать готовый фрагмент1.

После проверки исправления — отдельно разрешённое восстановление только failed clips этой записи из существующих source/transcript/selection. STT/LLM повторять и источник загружать заново для этого не требуется. Текущий общий retry нельзя выдавать за уже доступный recovery частично успешной записи: parent сейчас rendering, а после terminal при одном успешном станет done. Адресная recovery-процедура/подготовленная отдельная partial-recovery работа требует своей проверки и допуска. Здесь она не выполнялась и не проектировалась заново.

## Закрытые материалы

Raw/снимки: `/root/.config/clipmkr/video-f90c-diagnosis-20261105/` (0700, файлы0600): `db-inventory.private.json`, `db-inventory-fresh.private.json`, `runtime-identity.private.json`, `worker-video.raw.private.log`, `queue-and-head.private.json`, `temporary-file-metadata.private.json`, `sdk-endpoint-readonly.private.jsonl`, `db-final-state.private.json`, `worker-video-final.raw.private.log`. Хэши файлов фиксируются отдельным private manifest. Публичный протокол не содержит транскрипта, названия видео, email, секретов, подписанных URL или полных S3 object keys.
