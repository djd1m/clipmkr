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

Worker claim — один CAS running lease с increment epoch/attempts; максимум2 попытки по одной source revision. Общий wall deadline30s, child IO `rw_timeout=5000000` (microseconds), ограниченный ffprobe `probesize`/`analyzeduration`, native seek до clip start, анализ только выбранного интервала. Никаких unbounded reconnect/retry. Второй terminal failure или confidence ambiguity → unavailable, причина видна, автоматического нового анализа на refresh нет. Сторож восстанавливает pending/expired lease через existing transport, по одному job identity; policy2 attempts включает crash. Late result проходит CAS clip/revision/epoch/active owner/retention до записи cache.

Для старых clips используем server-generated signed URL только известного настроенного S3 endpoint/object key, native FFmpeg HTTP Range/seek. HTTP допустим только для существующего локального MinIO test endpoint; production TLS согласно storage config. Не принимать URL от клиента. Протоколы/форматы allowlist для remote analysis исключают playlist/concat и внешние references; параметры задаются аргументами child process, не shell. URL не попадает в queue/DB/logs/ошибку. Existing Python subprocess wrapper дополняется optional remote-source policy, default file path для legacy неизменен. Внешний timeout обязан закрыть Python и его FFmpeg/ffprobe descendants; простой orphan child неприемлем.

Budget честный: source не больше существующего upload maximum2GB;30s на попытку;2 попытки. Native Range может вычитать существенно больше выбранного интервала, особенно при moov в конце/неподдержанном seek. `probesize` не является hard byte cap. Измерять transferred bytes на тестовом storage access log. Если Range игнорируется/нет metadata/timeout — explicit unavailable fallback. Новый локальный range proxy или малый самостоятельно придуманный cap не вводятся. Для future clips сохраняем seed из уже полученного initial-render FaceReport/исходного локального файла без второго download/нового job; эта advisory cache запись не должна сорвать основной render.

Auto seed — **предложение**, не probability/identity guarantee. Pure rule: единственная устойчиво повторяющаяся группа face boxes в краевой части source, присутствует во всех seed samples, размеры/позиция укладываются в заданные пороги; кандидат ROI расширяется до головы/плеч и ограничивается source bounds. Пороги закреплены в05_architecture и переносятся в `screen-layout`; их проверяют synthetic detector-report fixtures; исходная точность ещё не измерена. При нескольких группах/движущейся плитке/несогласованном размере/нет наблюдений — camera=null с reason. Для проверки маленькой камеры допускается повторный YuNet **внутри одной candidate ROI** в том же30s budget; нельзя выбрать второе лицо снаружи. Семантический action seed не выводится из face boxes: screen=полный source либо подтверждённая выделенная screen область, focus=null до надёжного предложения/уточнения.

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
- Required automated check: `tests/clip-layout.integration.test.ts`, `tests/queue-redis.integration.test.ts`, `tests/screen-layout-media.test.ts`, `tests/browser/clip-layout.test.ts`.
