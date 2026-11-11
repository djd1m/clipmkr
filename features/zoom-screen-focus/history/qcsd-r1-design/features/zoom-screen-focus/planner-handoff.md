# Передача отдельному планировщику

WORK_UNIT_ID: zoom-screen-focus-planning-20261111
TRACE_PATH: /home/clipmkr-zoom-screen-focus/features/zoom-screen-focus/planner-handoff.md
Автор: gpt-6.1-sol high по назначению координатора. База main `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`.

## Готовый вход

`00_complexity_assessment.md` (L14), `01_requirements.md` (ZF01–10/AC01–07),
`requirements-revision.json` (точные OpenSpec SHA), `02_reuse_inventory.md`,
`03_candidate_decisions.md`, `source-pins.json`, `selector-mockup.html` и screenshots390/1440.
Результат текущего потока: требования/reuse/макет для review. Продуктовый код не реализован.

## Минимальный предполагаемый diff (проверить планом)

1. Новый shared module с closed layout/config types + boundary validation (1); новый renderer screen compositor/planner (1–2).
2. `ffmpeg.ts`, `workers/render.ts` — thin dispatch/options; `subtitles.ts` только если нужны отдельные output zones (2–3).
3. SQL migration, db render input/publish, новый db/service render intent; RPC registration и screen projection (5–7).
4. Новый `ClipLayoutChoice.tsx`, локальные стили в существующей token системе, thin mount из ClipCard/VideoDetail (2–4).
5. Executable geometry/media tests, real-DB concurrency/fence/credits, browser selection/apply/polling (4–5).
Итого ориентир18–24; новые dependencies не требуются. Не распылять layout types по слоям.
Общие package/lock/VideoDetail/ClipCard интегрирует только координатор после Original-потока.

## Задание следующей модели

Архитектор/планировщик `gpt-6-astra xhigh`: прочитать входные требования/ADR-кандидаты и самостоятельно
проверить канонические code paths, оформить полноценные MADR+Confirmation, shift-left, DDD/architecture,
SPARC-GOAP план и DAG. Координатор назначает QCSD3 агентов до Step6; genuine findings входят в план.
Нужны реальные supported dz checkpoint commands после фактических этапов, K1 для новых имён,
K2 на настоящем плане. Сейчас names/gates не запускаются: final plan и accepted ADR ещё отсутствуют.

Обязательные unresolved design issues: precise normalized ROI schema/time basis; valid confidence and
safe fallback for no camera/window change; how user confirms stable source areas; published vs requested
settings; explicit apply idempotency/expected version; no source-charge/no STT/select; overlay safe zones.
Решить инженерно, не задавать владельцу вопросы о библиотеке/названии таблицы.

## Проверки и поставка

После реализации один общий прогон по проектным gates на стабильном snapshot, targeted repeats после
исправлений; перед запуском сверить anchors/source guards. Настоящий FFmpeg synthetic source + PostgreSQL
обязательны. Independent QE получает только approved docs, затем сам находит исходники/тесты.

Пока разрешено только planning+mockup. UI approval, requirements checkpoint, ADR/QCSD, Step6, K1/K2,
root GO и код ещё впереди. Реальный private source/готовые clips не трогать; нет разрешения на rerender,
upload, source credits, S3 private GET или production. Owner принимает VPS test copy перед Cloud.ru,
root объединяет/коммитит/пушит потоки последовательно. Наличие этих файлов не означает approval.

## Терминальная граница текущей единицы

Status: completed
