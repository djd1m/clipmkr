# Независимая проверка диагностики f90c

05.11.2026, проверка завершена после read-only снимка **18:04:30 UTC**. Reviewer: `gpt-6-astra`, `xhigh`, отдельная от Sol-автора сессия `/root/cloudru_working_release_review`. Это проверка диагноза и документа, не кодовый QE или восстановление клипов.

**Вердикт: clear. Существенных фактических замечаний к frozen документу нет.** Проверенный SHA256 `2026-11-05-video-partial-f90c.md`: `f71485a46b456e6c4235c8f4709040c29b2bb79755faef634a342fdd22d4a2b0`. Файл не изменялся. Его snapshot ограничен указанным временем; ниже записано последующее изменение live-состояния.

## Что проверено самостоятельно

До чтения авторского документа получены собственные metadata/errors через существующий `clipmkr-site-test` SSH profile. PostgreSQL читался точечными SELECT в `BEGIN READ ONLY … ROLLBACK`: только статусы, номера/время попыток, размер/длительность и признаки наличия object references; без аккаунтов, текста, transcript, media или signed URLs. Из worker logs выбраны события указанного video и безопасные признаки ошибок; post-17:39 stderr не содержит отдельных `ffmpeg_failed/ffmpeg_timeout` событий оболочки процесса.

Фактический worker-video: image `sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800`, label revision `ebb590260b2df9151b9df62098488e2aaac3ee21`, started `2026-11-04T21:32:45.302045775Z`, restartCount0, OOMKilled=false. Непосредственно из запущенного контейнера прочитаны compiled renderer/download/storage/exec/S3 client, SDK retry branch и DB terminal-status logic. Старый main не использовался как runtime artifact.

Собственная карта причинности:

1. Fences5–11 завершались `Request aborted`, cause — timeout; непосредственно перед каждой ошибкой есть SDK warning о non-retryable streaming request. При последней сверке такой же отказ появился для fence12.
2. В фактическом `@smithy/core/dist-cjs/submodules/retry/index.js:185` warning возникает только в ветке исходящего `isStreamingPayload(request)`. В данном renderer потоковое тело передаётся через `createReadStream` в PutObject. Это существенно сильнее, чем одна метка БД или отсутствие объекта.
3. Фактический renderer создаёт общий `AbortSignal.timeout(120_000)` после render/thumbnail для MP4 и thumbnail PUT. Source GET имеет другой бюджет —10мин, job —30мин. Generic SDK exception попадает в catch и получает общий код `ffmpeg_failed`. Следовательно, подтверждён сбой публикации по таймауту; вывод «сломался видеокодек» из DB-кода не следует.
4. В первом собственном DB снимке и срезе18:03 clip1 done,2–4 failed после двух попыток,5 ещё running. Ни running в DB, ни BullMQ completed не равны готовности клипа: lease создаёт running до исполнения, а handler возвращает failed без throw. Последнее проверено по source; Redis reviewer не запрашивал.
5. Закреплённые renderer/storage/exec/attempts/render DB/S3 client файлы между worker ebb590 и web f55ae4 побайтно не отличаются по `git diff`.

После собственных наблюдений сверены авторские private записи `temporary-file-metadata.private.json` и `queue-and-head.private.json`. Их датированные числа согласуются с документом: созданные локальные MP4/thumbnail, последующий120-секундный интервал, точные HEAD statuses и состояния queue. Эти прошлые наблюдения reviewer не выдаёт за самостоятельно повторённые HEAD/Redis/file probes. Содержимое медиа не открывалось.

## Последующее фактическое состояние

В **18:04:05.914 UTC** fence12 клипа5 записал тот же `Request aborted → timeout`. Собственный read-only SELECT в **18:04:30.587 UTC** подтвердил:

| Показатель | Результат |
|---|---|
| Clip1 | done,10 208 471байт |
| Clips2–5 | failed, `ffmpeg_failed`, fences9–12 |
| Активные DB attempts этой записи | 0 |
| Parent | done, stage_progress100, clips_done1, clips_total5 |
| Parent finished_at | 18:04:05.928 UTC |

Это естественное завершение уже существующей попытки, reviewer её не запускал. `packages/db/src/render.ts:47–56` считает terminal(done+failed), а при любом успешном клипе ставит parent done. Поэтому100% не означает пять готовых результатов.

Общий retry здесь недоступен по текущему контракту: `apps/web/src/server/video-retry.ts:5–10` допускает только parent failed. `screen.ts` рассчитывает next_action через этот guard, а `VideoDetail.tsx` показывает retry по next_action и для success сворачивает панель. Это чтение source f55ae4, не выполненный browser/API retry. В frozen тексте граница общего retry и необходимость отдельной partial-recovery описаны верно.

## Непроверенное и безопасный следующий шаг

Таймаут публикации установлен; **почему конкретный PUT задержался — не установлено**. Нельзя выбрать между сетью, endpoint/transport или иным фактором по этим логам; они также не различают MP4 PUT и thumbnail PUT. Отсутствие рестарта/OOM флага не исключает все проблемы хоста. HEAD404 не доказывает конкретную сетевую причину.

Минимальный следующий шаг — отдельно подготовить и проверить узкую диагностику стадий публикации: тип объекта, bytes, elapsed, timeout/error code без ключей/секретов/пользовательского текста; затем проверить обоснованное ограниченное повторение с новым stream и неизменными create-only contract/fencing. Восстановление только failed clips требует отдельного допуска после проверки; успешный clip1 сохраняется. Слепой retry, увеличение timeout и повтор STT/LLM здесь не выполнялись и не считаются исправлением.

Самостоятельные private evidence: `/root/.config/clipmkr/video-f90c-independent-20261105/` (0700/0600), metadata-and-errors, runtime-source, SDK/terminal snippets, final/closing snapshots и manifest. Никаких provider/S3 downloads, Redis/queue commands, DB writes, retry/render, изменения runtime, Cloud, писем, commit/push reviewer не выполнял.
