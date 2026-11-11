# ADR-004: Кэшировать ограниченную подготовку камеры в существующем worker

## Status
proposed — уточнение координатора11.11.2026 внесено в01/OpenSpec до QCSD. Обратимо до реализации; пересмотреть после measured seed accuracy/latency на принятом corpus. Requirements: ZF-01, ZF-04, ZF-06, ZF-07; AC01–03.

## Context
Текущие готовые clips не хранят FaceReport. Web намеренно не содержит FFmpeg/OpenCV. Если всегда начинать с camera=null, согласованное «Экран + лицо» потребует обязательного ручного кропа. Если анализировать на каждый radio change, появятся лишние jobs и нагрузка. Нужна одна явная подготовка без пересборки MP4 и без денег.

## Decision Drivers
1. HIGH: автоматический camera seed по реальному source, optional manual correction.
2. HIGH: no render/STT/select/source credits и no writes published media.
3. HIGH: доступ, privacy, ограничение повторов и отказ без потери clip.
4. MEDIUM: existing worker/queue/OSS, короткая ограниченная подготовка.

## Considered Options
| Вариант | Плюсы | Минусы | D1/D2/D3/D4 |
|---|---|---|---|
| Только ручная camera ROI | Нет анализа/состояния | Делает ручной editor обязательным | −/+/+/+ |
| Новый ML/browser render service | Возможна богатая автоматизация | Новые сервисы/deps, цена, недоказанное качество | +/+/−/− |
| Однократный cached seed в worker-video | Reuse YuNet/FFmpeg/BullMQ, старые clips поддержаны | Нужны cache/lease и защищённое чтение source | +/+/+/+ |

## Decision
`clip.prepareLayout` вызывается только при явном входе пользователя в screen+face, не при radio/slider/обычном polling. Он проверяет сессию, owner, active account/video, clip done/retention и доступность source. Повтор того же clip/source_revision возвращает ready/unavailable/pending без новой логической операции. Existing route rate limit применяется до тела.

Миграция добавляет `clip_layout_seed`: `clip_id` PK/FK→clip ON DELETE CASCADE; `source_revision` sha256 принятой загрузки, `seed_revision` sha256 параметров анализа; `status` closed enum pending/running/ready/unavailable; `lease_epoch integer >=0`, `lease_until timestamptz`, `attempts smallint 0..2`, `payload jsonb`, `reason` closed vocabulary, `created_at`,`updated_at`. CHECK связывает running с lease_until, ready с payload, terminal с отсутствием lease. Один cache на clip; source_revision вычисляется canonical Original helper от принятой загрузки; seed_revision дополняет его clip start/end, cut_plan, analysis algorithm version и ONNX SHA. S3 key/URL в payload не входят. Source object overwrite продуктовым контрактом не допускается; отдельный ETag запрос/новый storage revision scheme не требуется. При mismatch cache заменяется под lock, старый lease_epoch не может опубликоваться.

Транспорт — **та же очередь render**, discriminated message `{kind:'layout-seed',clip_id,seed_revision}` и deterministic jobId. Обычный `AttemptJob` без kind остаётся прежним. Seed не создаёт `job_attempt`, не меняет video fence/status, render_version, credit/quota_counter. `createRenderWorker` делает thin dispatch в `handleLayoutSeedJob`; отдельного процесса/очереди/HTTP proxy нет. Priority1024 ниже обычного priority0. При concurrency1 уже начатый seed не вытесняется: новый обычный render может ждать остаток его deadline, это измеряется и не называется «нулевой задержкой».


### Закрытый runtime dispatch и authority (SEC-02)

До query/claim/sign/download/child/quota выполняется закрытый parser сырого `job.data` внутри render consumer (schema/тип размещаются в уже планируемом `packages/queue/src/queues.ts`; без новой dependency). Разрешены ровно две формы:

- Seed: own keys ровно `{kind,clip_id,seed_revision}`; kind строго `layout-seed`, clip_id валидный UUID, seed_revision lowercase64 hex. Без URL/account/video/fence/дополнительных полей.
- Legacy render: own keys ровно `{video_id,stage,fence,series_no,clip_id}`; **kind отсутствует**, stage строго `render`, IDs UUID, clip_id не null, fence и series_no положительные safe integers. `step` относится к STT и в render запрещён. Все нынешние render producers обязаны соответствовать этой форме; это не изменение wire payload действующих render jobs.

Не объект/array/null, неизвестный kind (включая null), mixed seed+legacy, extra keys, coercion и malformed identity получают terminal `invalid_render_message`: только sanitized reason/job id в лог и отказ транспорта без fallback в legacy. Нельзя strip unknown keys или считать любой kind≠layout-seed старым job. Прочие stt/select queues сохраняют свой контракт. Для valid legacy authoritative job_attempt перечитывается по video_id/fence/stage и **сверяются** clip_id/series_no до передачи existing handler; сообщение не задаёт план/owner/object key. Stale/missing/mismatch прекращает обработку без медиа/квоты/publication.

Для seed closed identity — только lookup. Repository в транзакции читает clip→video→account→seed в принятом порядке video→clip→seed locks; c.video_id=v.id, v.account_id=a.id, a.status=active, v.deleted_at IS NULL, clip готов/доступен и canonical retention ещё действует. Reuse `effectivePlanSql`, `retentionDeadlineSql`/`clipExpiry` (включая unlimited/unknown правила existing contract), а не собственную TTL. Source object_key/upload_id/actual_bytes берутся из актуальной принятой загрузки DB; никакое поле очереди их не заменяет. Пересчитываются canonical Original sourceRevision и seedRevision (clip bounds/cut_plan/algorithm/ONNX); обе совпадают с pending/expired cache generation и входным seed_revision. Только затем CAS claim increment epoch/attempts. Отсутствующая/terminal cache не создаётся worker по произвольному message; create принадлежит authorizing prepare.

После claim перед **каждым новым source доступом** (подпись/ffprobe/ffmpeg/retry) перечитать eligibility/revision/current lease epoch; после анализа final CAS повторяет active owner/deletion/retention/revision/epoch. Истёкшая lease/смена owner-context/удаление прекращают новые reads и публикацию; уже переданные процессу байты отозвать мгновенно нельзя, остаток ограничен deadline и отменой процесса. Worker не доверяет owner из request/queue; owner берётся из текущей связи video.account_id. Existing lifecycle не поддерживает перенос source между владельцами; такая операция вне scope и не создаётся этим ADR. В тесте extra account/URL отвергается parser; чужой clip со seed revision другого clip, inactive/deleted/expired, stale source/epoch не вызывают source sign/read или публикацию. Redis остаётся закрытым служебным транспортом, не вводятся межсервисные auth tokens.

Worker claim — один CAS running lease с increment epoch/attempts; максимум2 попытки по одной source revision. Общий wall deadline30s, child IO `rw_timeout=5000000` (microseconds), ограниченный ffprobe `probesize`/`analyzeduration`, native seek до clip start, анализ только выбранного интервала. Никаких unbounded reconnect/retry. Второй terminal failure или confidence ambiguity → unavailable, причина видна, автоматического нового анализа на refresh нет. Сторож восстанавливает pending/expired lease через existing transport, по одному job identity; policy2 attempts включает crash. Late result проходит CAS clip/revision/epoch/active owner/retention до записи cache.

### Signed source: origin, TLS и запрет redirect (SEC-01)

Для старых clips используется native FFmpeg HTTP Range/seek. Подпись переиспользует `@clipmaker/s3` `createS3Client`/`generateDownloadUrl` и его namespace middleware; worker-video передаёт существующий внутренний `s3Config.endpoint` также как signing endpoint (`publicEndpoint` параметр существующего client factory), не читает `S3_PUBLIC_ENDPOINT` и не добавляет прямой импорт transitive presigner в worker. Срок ссылки ≤30s deadline и canonical retention; source key берётся только из DB после проверки выше. Runtime владеет/закрывает этот же client lifecycle. Адрес в UI/queue отсутствует, browser/custom object redirect metadata не принимаются как input.

До child проверить URL parser: без userinfo/fragment, origin точно равен origin настроенного S3 endpoint при forcePathStyle; для virtual-host style — ровно origin, полученный SDK из **фиксированных config bucket+endpoint**, не suffix wildcard. Только HTTPS production; HTTP разрешён лишь для явно настроенного existing MinIO endpoint из изолированного test scope. Query — только выданная server signer capability; не переносить cookies/Authorization/Referer/extra headers. Storage config/DNS/worker host считаются доверенной операционной границей; не обещается защита от их администратора. Подпись не пересылается другим origin.

В **обе** команды Python wrapper (`ffprobe`, `ffmpeg`) перед input добавить native `-max_redirects 0`; для HTTPS — `-tls_verify 1` с системным CA store, без `verifyhost` override. Remote allowlist HTTPS=`https,tls,tcp` (MinIO test HTTP=`http,tcp`), formats только подходящие самостоятельно содержащие media (например mov/mp4 и matroska/webm), playlist/concat/external references запрещены. Output pipe имеет отдельную output policy; `file`/`pipe` не открывают remote inputs. Параметры argv, без shell; reconnect выключен, bounded IO/deadline прежние. HTTP proxy env/`FFREPORT` не наследуются remote child; других URL не конструировать. Legacy local file path policy остаётся прежней.

**Любой redirect** 301/302/303/307/308 (same-origin, cross-origin, смена scheme/port, relative Location или cached) прекращает seed как безопасный unavailable `source_access_unavailable`, без следующего запроса. Политика не пытается проверять уже совершённый redirect и не полагается на HEAD preflight. Не делать retry без запретных flags. Если установленный ffmpeg/ffprobe не поддерживает policy option/TLS либо endpoint требует redirect/не даёт Range, автоseed недоступен с причиной и optional manual camera/full-screen fallback. Нет нового Range proxy/service/auth слоя.

Первичный [FFmpeg n8.1.3 http.c](https://github.com/FFmpeg/FFmpeg/blob/1041abdc962f4cc4f394aa8de9dc5236c0c3b9e7/libavformat/http.c#L201) задаёт max_redirects минимум0; проверки в http_open_cnx выполняются до смены Location/следующего connect, в том числе cache. [TLS OpenSSL source](https://github.com/FFmpeg/FFmpeg/blob/1041abdc962f4cc4f394aa8de9dc5236c0c3b9e7/libavformat/tls_openssl.c#L799) в этой версии задаёт peer+hostname/IP verification; старое общее замечание protocols.texi о hostname OpenSSL шире актуального кода. Проверенная installed option перечислена в R2 evidence; это ещё не сетевой fixture PASS.

В remote path child stderr/exception/argv **не передаются в logger/BullMQ error/response**: существующий `faces.ts` логирует error.message, поэтому новый remote branch обязан заменить его closed reason, не резать URL до200 символов. Python capture не печатает raw exception с input, ffmpeg stderr отбрасывается/локально классифицируется; `cause` с argv не сериализуется. Synthetic query canary ищется во всех observable logs/errors/cache/queue. Подписанный URL в child argv виден оператору worker host — существующая явно принятая граница. Внешний timeout закрывает Python и FFmpeg/ffprobe descendants; простой orphan child неприемлем.

Budget честный: source не больше существующего upload maximum2GB;30s на попытку;2 попытки. Native Range может вычитать существенно больше выбранного интервала, особенно при moov в конце/неподдержанном seek. `probesize` не является hard byte cap. Измерять transferred bytes на тестовом storage access log. Если Range игнорируется/нет metadata/timeout — explicit unavailable fallback. Новый локальный range proxy или малый самостоятельно придуманный cap не вводятся. Для future clips сохраняем seed из уже полученного initial-render FaceReport/исходного локального файла без второго download/нового job; эта advisory cache запись не должна сорвать основной render.

Auto seed — **предложение**, не probability/identity guarantee. Pure rule: единственная устойчиво повторяющаяся группа face boxes в краевой части source, присутствует во всех seed samples, размеры/позиция укладываются в заданные пороги; кандидат ROI расширяется до головы/плеч и ограничивается source bounds. Пороги закреплены в05_architecture и переносятся в `screen-layout`; их проверяют synthetic detector-report fixtures; исходная точность ещё не измерена. При нескольких группах/движущейся плитке/несогласованном размере/нет наблюдений — camera=null с reason. Для проверки маленькой камеры допускается повторный YuNet **внутри одной candidate ROI** в том же30s budget; нельзя выбрать второе лицо снаружи. Семантический action seed не выводится из face boxes: screen=полный source либо подтверждённая выделенная screen область, focus=null при первом входе; только прежний подтверждённый focus той же source revision или явное уточнение меняет его. Camera ready не означает focus ready. В preview/confirmation показан whole-screen fallback, который можно применить без обязательного рисования.

## Rationale
D1 сохраняет auto flow; D2 отделяет advisory analysis от оплаченного render; D3 требует durable dedupe/epoch, no URL leak и deterministic unavailable; D4 исключает новый сервис и повторный analysis на local controls. Простая смена термина job не скрывает факт фонового анализа: это явно зафиксировано в требованиях.

## Consequences
### Positive
Большинство последующих открытий читают cache; обычные новые clips получают предложение без дополнительного download. Нет новых dependencies/ML providers.
### Negative / Accepted Downsides
30s активного seed может задержать пришедший normal render; качество camera seed/трафик предстоит измерить. Два новых небольших persistence concepts (seed и apply intent) имеют разные lifecycles; их нельзя смешать в один nullable status framework. Signed URL в child argv доступен операторам worker host; не журналировать argv. Нельзя обещать точность на всех Zoom layouts.
### Follow-up ADRs
ADR-001 принимает только seed предложение/подтверждённый config. ADR-003 показывает анализ в существующей preview area без нового обязательного wizard.
### After-action Review
Owner: координатор Clipmkr. Через30 дней после приёмки: cache hit, unavailable reasons, traffic, render waiting time.

## Confirmation
- Method: real PostgreSQL/Redis dedupe/lease tests, worker image YuNet, controlled HTTP media fixtures и access log.
- Monitoring: seed_requested/cache_hit/ready/unavailable/lease_stale; reason, elapsed_ms, attempts, source byte size без ключа/URL.
- Success metric:10 concurrent opens →1 cache operation; radio/polling →0 new jobs; max2 attempts; deadline kills descendants; normal queued render priority выше seed; source credit/render quota/published keys deltas0.
- Owner: автор реализации + независимый security/performance QE.
- Load-bearing property: optional analysis не создаёт списание, uncontrolled job storm или private-source exposure.
- R2 проверки: `seed_redirects_are_refused_before_followup_request` и `seed_remote_errors_never_expose_url` — реальные ffprobe/ffmpeg на контролируемых 3xx same/cross-origin/downgrade fixtures, target request count=0, canary нигде не вышел; `render_dispatch_rejects_unknown_mixed_payloads_without_side_effects` — Redis→actual consumer; `seed_claim_rechecks_owner_retention_revision_and_epoch` — real PostgreSQL с stale/inactive/expired rows. Дополнительно TLS wrong-host/CA отказ на target image; legacy valid message принимает прежний handler. Все это обязательный план реализации, не исполненные тесты R2.
- Required automated check: `tests/clip-layout.integration.test.ts`, `tests/queue-redis.integration.test.ts`, `tests/screen-layout-media.test.ts`, `tests/browser/clip-layout.test.ts`.
