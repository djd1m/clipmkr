# Передача замороженного дизайн-пакета Zoom

WORK_UNIT_ID: zoom-screen-focus-architecture-20261111
TRACE_PATH: /home/clipmkr-zoom-screen-focus/features/zoom-screen-focus/architecture-handoff.md
Status: design-dossier-complete-pre-qcsd
Base revision: `1a7f17f66d83bacf07dd07c513a3cfad03837330`.
Запрошенная роль: архитектор/планировщик `gpt-6-astra xhigh`; фактическую launch metadata хранит координатор. Автор приложения далее `gpt-6.1-sol high`. Новые подагенты здесь не запускались; роль QCSD не имитировалась.

## Что передано

`02_research.md`,4 MADR+Confirmation в03_adr, `03_shift_left.md`, `04_domain_model.md`, `05_architecture.md`,C4/sequence diagrams и **draft** `06_implementation_plan.md`. `01_requirements.md`/OpenSpec обновлены одной согласованной дельтой: UI approved; однократный cached seed-analysis при explicit mode допустим, radio/preview не создают render jobs/списаний. Точные новые hashes — requirements-revision.json; весь snapshot — design-dossier.json.

Решения: versioned normalized screen/focus/camera ROI;3 layouts с03 default; automatic candidate camera из existing YuNet/worker с optional correction; protected action и фактические watermark/ASS/CTA зоны; один cut_plan; local wholeclip preview через Original; durable exact apply + существующие attempts/fence/publication, old MP4 доступен. Новых dependencies/service/queue/worker Range proxy нет.

## Настоящая сверка и её граница

- Все18 исходных `source-pins.json` совпали. План содержит40 уникальных targets:26 существующих+14 новых; новая версия source pins собрана до кода. Статическое чтение выявило обязательный `lib/rpc.ts` closed consumer; добавлен в план.
- `git diff --check` exit0; production/runtime diff отсутствует. Проверены обязательные sections4 ADR и буквальный trailing targets block. Это собственная document integrity проверка, **не K1/K2, не независимый review и не runtime PASS**.
- Публичные FFmpeg/OpenCV/WHATWG sources фактически открыты; acquisition hashes вresearch-source-fetches.json, без issuer signatures. Worker binary read-only:FFmpeg/ffprobe8.1.3,OpenCV4.12.0; image SHA34abe462… записан в02. Пользовательские source/MP4 не читались и не менялись этим потоком.
- Существующие stale layer guard и mutation anchor описаны с различающими oracles; шрифт/ONNX pins не изменялись. Tests/media/browser/PG не запускались, потому что это design-only task.

## Ключевые границы для QCSD

Sampling0.5s не даёт identity или покадровой гарантии: camera всегда копирует live pixels внутри предложенной/подтверждённой ROI; observed absence/ошибка veto скрывают camera на всём clip. Negative samples только из retained intervals. Частота false negatives ещё не измерена. Обязательна настоящая wholeclip приёмка; static HTML936191… её не заменяет.

Preview воспроизводит geometry/motion по saved cut_plan, crossfade0.08s показывает hard cut в midpoint; final ASS/music/encode не притворяется браузерным результатом. Input unsupported/seek failure имеет отдельный state. Исходник нужен целиком по выбранным retained intervals; crop не реконструируется из готового MP4.

Native HTTP Range имеет30s deadline и2 attempts, но не самостоятельный малый hard byte cap. Source ограничен existing upload maximum; трафик измеряется. Priority1024 не вытесняет начатый seed: normal render может ждать остаток deadline. Эти ограничения предъявлены, не закрыты выдуманной проверкой.

## Integration seam с Original

Same-origin `/api/videos/${encodeURIComponent(videoId)}/original`, GET/HEAD/Range, `?metadata=1`; no S3 redirect/key/URL вprops. Ready DTO имеет sourceRevision иmedia.bytes:string; non-ready их не содержит. Formula sourceRevision закреплена вADR-003. Нужен единственный `originalSourceRevision` helper в`packages/shared/src/server/original-source.ts` вместо worker→web/server import; файл принадлежит Original/root integration, вZoom targets не дублируется. Root закрепил import `@clipmaker/shared/server/original-source`; Original architect выполняет точечный refreeze своего пакета. Root shared index не re-export-ит leaf; existing `./*` exports достаточны. Source formula и DTO неизменны.

Root последовательно интегрирует shared VideoDetail/ClipCard: один слышимый media, `onPreviewActivate` ставит наpause другие players без их remount. Late seed не перетирает dirty draft/confirmation; любое применённое изменение сбрасывает checked review.

## Следующий реальный этап

1. Root принял консервативный reroute: исходныйL14→score16 (score bandL), **XL по40 editable targets/quick decision tree30+**. Настоящий router checkpoint всё ещё выполняется отдельно. Число не уменьшено исключением проверок или слиянием модулей.
2. После фиксации snapshot назначает genuine Step3.5:3 core +3 conditional roles, HAS_UI/HAS_SECURITY/HAS_UX=true. Findings и actual verdict входят в final plan; никаких grade/receipt из наличия этого пакета.
3. Вернуть архитектору реальные findings для final Step6 и amendments; затем supported dz records, K1 всех новых names, K2 с actual tier и requirements. До этого и root GO код не начинать.
4. Один общий прогон stable code revision, targeted repeats после fixes, независимый review/fleet QE поmodel-matrix. Test VPS→owner acceptance; Cloud/production/DNS/real money не разрешены этим планом.

Коммит/интеграцию/пуш выполняет координатор. Пакет frozen как working-tree design snapshot, base HEAD указан; это не новый code commit.

## Точечный refreeze по решению root

Изменены только путь/импорт server-only sourceRevision leaf и явный EDITABLE/READONLY scope. User-facing требования, OpenSpec pins, formula sourceRevision и owner selector approval сохранены. `scope-inventory.json` — точный перечень; read-only файлы не считаются изменениями Zoom. Код, QCSD, final Step6 и K1/K2 не запускались.
