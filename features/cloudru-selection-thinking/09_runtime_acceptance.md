# Независимая runtime-приёмка: Cloud.ru selection thinking

04.11.2026, сессия `/root/provider_fix_qe`; requested `gpt-6-astra xhigh`, runtime model attestation отсутствует. Продолжение независимого source review, без изменения его исторического вердикта в `08_qe_report.md`.

**Результат: настоящий UI retry → выбор → монтаж → 2 готовых клипа выполнен. Оба клипа воспроизводятся в Chromium и WebKit; оба скачаны и проверены в Chromium. Скачивание через UI WebKit не прошло: дважды отсутствовало событие download, браузер переходил на MP4 в S3. Полная browser/runtime-приёмка остаётся PARTIAL.** Это не production GO и не ручная приёмка владельца.

## Проверенная среда и идентичность

- Test origin: `https://clipmkr.ru`; `/health` самостоятельно прочитан дважды: HTTP 200, `status=ok`, revision `ebb590260b2df9151b9df62098488e2aaac3ee21`.
- Наблюдалась только QA-запись `331eecc5-fb3f-4715-8031-b611c306ff8a`, 155 секунд, через предоставленную существующую QA-сессию. Авторский PASS не принимался как доказательство.
- Read-only SSH к уже заданному test target; фактический container `n5-clipmaker-worker-llm-1`, image tag `clipmkr:thinking-ebb590260b2d-worker`, image ID `sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800`, OCI revision совпала с `/health`. ID/revision независимо сверены с локальным image artifact координатора.
- Самостоятельно вычисленный SHA256 `/app/dist/apps/worker/src/llm/provider.js` внутри работающего container: `342ad3aa12db2456c584cb475fdd1e26eca76fe22cea26993019efaac21cb9a5`.
- `git show ebb590260b2df9151b9df62098488e2aaac3ee21:apps/worker/src/llm/provider.ts | sha256sum` дал ранее проверенный `527f61fe1678c7e30412bc62eed51a7d7afe539be0ab9de197d308018aad12bc`. Diff `bd91..ebb590260b2df9151b9df62098488e2aaac3ee21 -- apps packages`: один runtime file, одна строка добавлена/заменена в provider.ts.
- Использован существующий Playwright, Node `v22.23.4`, настоящие Chromium/WebKit и реальный origin. Network routes/responses не подменялись. DB/credits/roles/quotas не менялись reviewer. Никаких новых загрузок, повторных selection requests, provider/model switches или source edits reviewer не выполнял.

## Наблюдение реального задания

| UTC 04.11.2026 | Независимое наблюдение |
|---|---|
| 21:35:24 | На исходной QA-записи есть ровно одна доступная кнопка «Повторить», video elements отсутствуют |
| 21:35:25.181 | Один клик обычной UI-кнопки; ровно один POST `/api/trpc/video.retry` |
| 21:35:25.266 | Сервер принял retry: HTTP 202; video ID и pathname сохранились |
| 21:35:38 | UI: загрузка/расшифровка сделано, «Выбор — идёт», «Выбираем фрагменты» |
| 21:36:07 | UI: «Выбор — сделано», «Монтаж 0 из 2 — идёт» |
| 21:37:32 | Независимый read-only `video.get`: HTTP 200, `status=rendering`, `failure_reason=null`, duration 155 |
| 21:38:13 | `clip.list`: первый clip `4047564a-a589-469a-88e2-7876f446fe5e` — done/available; второй `53ed9cce-08e7-45e3-b82c-1cdc511981fb` — rendering |
| 21:40:21 | Новый Chromium context: «Клипы готовы · 2 из 2», два video elements |
| 21:40:29 | Независимый `video.get`: тот же video ID, `status=done`, `failure_reason=null`, duration 155 |
| 21:40:47 | Исходный observer тоже видит 2 готовых клипа; суммарный retry request count остаётся 1 |

Первое наблюдение готовности произошло примерно через 296 секунд после retry; это одна наблюдаемая точка, не SLA/p95 и не точное внутреннее время worker. Загрузка и STT уже были завершены до этой проверки: они не повторялись. Проверен настоящий продолженный путь существующей записи через обычный UI endpoint, а не изолированный прямой selector. Внутренние очередь/DB события reviewer не подменял и напрямую не переписывал.

Два ранних ожидания «появились два video elements за 45 s» истекли, пока UI ещё показывал rendering. Это сохранённые precondition timeouts тестового наблюдателя, не ложные FAIL всего задания; после появления клипов выполнены настоящие проверки ниже.

## Воспроизведение и скачивание

Native center click на каждом video element; звук приглушён только для headless-проверки. Измерялся `currentTime` до/после, `paused`, `readyState`, video dimensions и media error. Не вызывался программный `video.play()` для замены пользовательского действия.

| Клип | Chromium playback | WebKit playback | Chromium download sanity |
|---|---|---|---|
| `4047564a…` | currentTime 0 → 2.106650 s; paused=false, error=null | 0 → 2.400799783 s; paused=false, error=null | 12 512 571 bytes, MP4 `ftyp`, H.264/AAC, 1080×1920, 44.84 s |
| `53ed9cce…` | 0 → 1.895622 s; paused=false, error=null | 0 → 2.537668950 s; paused=false, error=null | 14 814 108 bytes, MP4 `ftyp`, H.264/AAC, 1080×1920, 43.40 s |

Оба скачивания Chromium запущены реальными кнопками «Скачать клип», получены через browser download event, сохранены приватно и проверены `ffprobe`. Captured responses: app file route HTTP 302, затем реальные `s3.cloud.ru` HTTP 206 для playback и HTTP 200 для скачивания, `Content-Type: video/mp4`, соответствующие lengths/ranges. Signed URLs в отчёт не перенесены. Дополнительных retry requests в playback/download contexts: 0.

## RUNTIME-01 — MEDIUM: скачивание WebKit не принято

Сценарий: открыта готовая запись, первый клип успешно воспроизводится, нажата реальная кнопка «Скачать клип». В двух новых WebKit contexts `page.waitForEvent('download', {timeout:45000})` завершился timeout (21:39:45 и 21:41:24 UTC). Во втором прогоне после клика проверен фактический адрес: браузер ушёл с dashboard на MP4 у `s3.cloud.ru`; файл через download event не получен. Второй WebKit download после этого не выполнялся, потому что страница уже покинута.

Затронутая существующая граница: `apps/web/src/app/clips/useClipDownload.ts:4` создаёт/clicks download anchor; `apps/web/src/server/clip-file.ts:63` возвращает подписанный redirect. Эти файлы не входят в provider fix. Наблюдение блокирует объявление PASS скачивания в проверенном WebKit; не доказывает, что дефект введён новым provider field.

Дополнительный read-only probe 21:41:45 UTC: authorized route `?download=1` → 302; signed disposition override присутствует и содержит attachment; фактический S3 Range `bytes=0-0` → HTTP 206, video/mp4, `Content-Disposition: attachment`, получен 1 byte. Следовательно, отсутствие attachment header не подтверждено. Причина поведения WebKit и переносимость на настоящий Safari пока **UNDETERMINED**. Направление следующей проверки: отдельно исследовать реальный download flow WebKit/Safari с этим redirect, не ослабляя авторизацию и не выдавая Chromium PASS за доказательство для WebKit.

## Отдельный диагностический selector replay

Reviewer самостоятельно прочитал первичный private JSONL координатора `provider-uncapped-deployed-replay.private.jsonl`; его compiled provider SHA совпал с самостоятельно вычисленным SHA работающего container. Это **другой диагностический запрос**, не usage/результат UI-задания выше:

- actual deployed `createSelector` и existing validator, duration input 155 s;
- 1 request, HTTP 200, finishReason `stop`, elapsed 5592 ms;
- requestFields: `chat_template_kwargs`, `messages`, `model`, `response_format`, `stream`; kwargs `{thinking:false}`, `capped:false`;
- prompt 1410 tokens, completion 422, total 1832, reasoning tokens 0;
- accepted fragments 1, applicationMutations=false.

Сам этот diagnostic call выполнял координатор, reviewer проверил артефакт и identity. UI-задание произвело **2** клипа; его provider token usage/finishReason reviewer не наблюдал. Числа диагностического вызова не присвоены UI job.

## Трассировка QE

| Требование → риск | Сценарий/команда | Факт | Ограничение |
|---|---|---|---|
| FR-1/AC-3 → развёрнут старый код | Health GET, read-only docker inspect/hash, git show source hash | Revision/image/source совпали с исправлением | Полная reproducible-build аттестация не выполнялась |
| FR-3/AC-3 → probe принят за настоящий worker path | UI «Повторить» один раз; browser observation video.get/clip.list | 202 → rendering → done, 2 clips | Upload/STT этой записи уже были done до проверки |
| Полный короткий CJM → клипы есть лишь в БД | Native browser click + реальные S3 responses | Оба video advancing в Chromium/WebKit | Настоящее Safari/iOS устройство не проверено |
| Скачивание → формальная ссылка без файла | UI download event + `ffprobe` | Оба Chromium файла валидны | WebKit FAIL наблюдён, причина не установлена |
| Безопасность evidence → leakage signed URL/auth/media | Private directory/files, sanitised records | 0700/0600; отчёт без токенов/URL-подписей/транскрипта/медиа | Private downloads/screenshots не коммитятся |

Исполненные review scripts и логи находятся в `/tmp/clipmkr-independent-runtime-20261104/`: `run.cjs`, `partial-play-download.cjs`, `play-download.cjs`, `download-headers.cjs`; запуск через `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`. `events.jsonl`, `play-download.jsonl`, `play-download-results.json`, `image-identity.json`, `download-headers.json` содержат наблюдения; screenshots/DOM/downloads остаются приватными. HAR и browser traces не включались. Ранние timeout/неуспешные попытки сохранены, а не стёрты успешными шагами.

## Границы заключения

Это успех ограниченного исправления selection и короткого повторного конвейера с реальными файлами; не приёмка 90/120 минут, полного нового upload/STT, billing, blogger CJM, пользовательского редизайна или ручного качества клипов. WebKit download остаётся открытым. Production/DNS и Cloud.ru publication reviewer не менял. Фактический source GO из `08_qe_report.md` не заменён глобальным runtime GO.

## Дополнительная read-only проверка: обычная запись сверх 90 минут

Проверена новая QA-запись `c06583b7-785a-446a-9b8d-0af2a5db0eb6`. Сам upload выполнил координатор; reviewer независимо проверил серверный результат и фактический объект S3. Приватный исходный upload artifact: `over90-result.private.json`; его UI failure не использовался вместо серверной проверки.

Read-only SQL выполнен через `BEGIN READ ONLY` на фактической БД тестового target. Получено:

| Проверка | Фактический результат |
|---|---|
| Серверный исход video | `status=failed`, `failure_reason=too_long` |
| Предел, сохранённый на video | `source_limit_seconds=5400` |
| Роль аккаунта | `is_blogger=false`, индивидуальный blogger limit NULL, `owner_unlimited=false`, plan `free`, status `active`, billing policy `credits_v1` |
| Принадлежность | Тот же QA-аккаунт, которому принадлежит успешная 155-секундная запись |
| Сохранённая длительность video | `duration_seconds=NULL`; ранний отказ её не записывает, это значение не подменено 5401 |
| Длительность фактического S3-объекта | Независимый `probeFile`/ffprobe дал **5401 s**, `hasAudio=true` |
| Размер фактического S3-объекта | **851 687 bytes**, совпал с `video.actual_bytes` и upload artifact; предварительная оценка «6 MB» не подтверждена для этого объекта |
| SHA256 фактического объекта | `7c3f9b34b159807abcae5f0b79eecfc02ffb689758143670c92985303a570111`, совпал с SHA загруженного fixture |
| Попытки | Ровно одна `stage=stt` (включает probe), status failed, reason too_long, `unit_count=0`, provider/model NULL, `stt_calls={}`, `llm_dispatched=false` |
| Кредиты этой записи | `video_credit_charge=0`, связанные `credit_allocation=0`, `minutes_charged=NULL` |
| Последующие результаты | `transcript=0`, `clip=0`, select/render attempts отсутствуют |

Для независимого измерения взят **object_key непосредственно этой video row** (ключ не опубликован); действующий S3-клиент в worker-stt скачал существующий объект во временный закрытый каталог. Действующий `probeFile` измерил длительность, SHA и bytes связали измерение с загруженным файлом. Временная копия удалена в `finally`; БД, роли, баланс, исходный S3-объект и код не менялись, STT/LLM не вызывались диагностикой.

Это именно отказ по длине файла на 1 секунду сверх применённого предела, а не отказ по денежному балансу или суточной квоте: actual reason равен `too_long`, не `refused_credit_balance`, `refused_user_minutes`, `refused_global_minutes` или `refused_*_llm`. Порядок проверен в действующем source path: `apps/worker/src/workers/stt.ts` вызывает `fileFailure` после ffprobe и завершает probe при нарушении длины **до** `acceptProbe` и `continueTranscription`; резервирование кредитов/минут находится далее. Durable `stt_calls`/`llm_dispatched` выставляются до вызова соответствующего provider; у данного ID они пусты/false, provider/model отсутствуют. Наличие probe-attempt с именем stage `stt` само по себе не означает платный STT dispatch.

Сводный баланс QA-аккаунта не использован как доказательство: параллельная успешная запись могла менять его законно. Проверка ограничена charges/allocations и dispatch markers именно указанного negative video. Внешний billing поставщиков отдельно не исследовался.

Evidence: `/tmp/clipmkr-independent-runtime-20261104/over90-server-readonly.json`, `over90-actual-source-probe.json`, `over90-probe-script.mjs` (0700/0600). Измерение выполнялось командой `ssh -F <существующий private sshconfig> clipmkr-site-test 'docker exec -i n5-clipmaker-worker-stt-1 node --input-type=module'` с сохранённым read-only script; actual exit 0. Credentials/env dumps/signed URLs в отчёт не включены.

Этот negative PASS подтверждает отказ для обычного аккаунта на **5401 s**. Он не доказывает успешную обработку ровно 5400 s, поддержку 120 минут, blogger override или полную feature acceptance. Ранее зафиксированный WebKit download gap остаётся открытым.

## Стабильные ссылки готовых клипов

Ссылки прочитаны из существующих `clip_link` для двух `done` clips успешной записи; новые short links/guest packs не создавались. Это стабильные публичные landing paths, без signed query или токенов:

- Клип 1 (`4047564a…`): https://clipmkr.ru/c/6CF6K3
- Клип 2 (`53ed9cce…`): https://clipmkr.ru/c/HPQL3C

Landing navigation по этим ссылкам в дополнительной проверке не запускалась; работоспособность самих файлов и воспроизведения описана выше.

WORK_UNIT_ID: cloudru-selection-thinking-independent-runtime-20261104
TRACE_PATH: /tmp/clipmkr-independent-runtime-20261104/events.jsonl
Status: completed
