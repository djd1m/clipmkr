# Контракты, повторное использование и риск

База `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`. Статическое чтение, не runtime-доказательство.

## Контракты и потребители

| Граница | Канонические файлы | Что сохранить/добавить |
|---|---|---|
| UI draft → explicit mutation | `apps/web/src/app/clips/ClipMusicChoice.tsx`, `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` | Переиспользовать draft/dirty/pending/polling semantics; новый модуль selector. Общий VideoDetail интегрирует координатор после Original-потока. |
| Account/clip ownership и quota | `apps/web/src/server/clip-music.ts`, `packages/db/src/quota.ts` | Lock video→clip,404 для чужого, retention, server quota. Не копировать весь music service: выделить общий принятие render intent только при подтверждённой необходимости. |
| Durable input/version | `packages/db/src/render.ts`, `packages/db/src/attempts.ts`, `apps/web/src/lib/screen-contract.ts` | Новая схема candidate/proposed vs published settings, fencing; точный shape решит ADR. Music/CTA нельзя потерять при смене layout. |
| Worker | `apps/worker/src/workers/render.ts` | Reuse source download, общий cut_plan, suffix render_version, publication и cleanup. Никакого STT/select/credit charge. |
| Геометрия | `apps/worker/src/render/format.ts`, `framing-plan.ts`, `ffmpeg.ts` | Отдельная screen+camera branch; legacy fallback неизменён. Split одного decoded stream → независимые crop/scale/overlay → общие overlays → watermark. |
| Face detection | `faces.ts`, `apps/worker/assets/scripts/detect_faces.py` | Существующий YuNet/OpenCV; bbox не доказывает speaker identity/Zoom tile. Сначала подтверждённая camera ROI, затем её проверка; не «любое лицо на слайде». |
| Subtitle/label | `subtitles.ts`, `watermark.ts`, `packages/shared/src/watermark.ts` | Отдельные зоны screen mode, тот же временной контекст и watermark last. |
| Public outputs | clip screen API, `ClipCard.tsx`, clip file/thumbnail routes | Preview/download читают published result; UI draft никогда не выдаёт новый MP4 за published. |

## Existing tests и настоящие falsifiers

- `tests/framing.test.ts`, `framing-media.test.ts`, `render.test.ts`, `render-media.test.ts` — legacy geometry/настоящий FFmpeg и порядок слоёв.
- `tests/compaction-render.test.ts`, `compaction-media.test.ts`, `render-worker.test.ts` — cut_plan, timeline, worker.
- `tests/clip-music-choice.integration.test.ts`, `clip-cta-rerender.integration.test.ts`, `render.integration.test.ts`, `render-storage.test.ts`, `render-failure.test.ts` — reuse rerender/version/fence/storage; адаптировать риск без копирования всех тестов.
- `tests/credit-packages.integration.test.ts` и source-charge consumers — запрет повторного начисления/списания, на настоящем PostgreSQL.
- `tests/browser/video-screen.test.ts`, `tests/browser/mockup-ui-realization.test.ts`, responsive harness — mounted identity, закрытое advanced, явный apply,390/1440.

Новые проверки: numeric normalized ROI validation/geometry (включая odd sizes/out-of-bounds),
реальное synthetic video с цветными областями/счётчиком и пропадающей camera, safe fallback,
один cut_plan/overlays и отсутствие повторной accepted operation при concurrency/timeout.
Нужен RED на сломанной ветке, а не assert строк новой реализации. Изменённый SQL — real PostgreSQL.
Media tests не должны мокать сам FFmpeg/ключевой compositor. Приватный source fixture не коммитить.

## Source guards, mutation anchors, фиксированные SHA

- `tests/render.test.ts:58`: `not.toContain('pad=')` относится к legacy graph. Screen mode может нуждаться в pad; старую проверку не убирать — отдельно проверять mode-specific geometry.
- В том же файле source guard `filters.push(source ? getFramingFilter` уже не соответствует текущему `filters.push(source && follow?.length ...`. `indexOf=-1` может дать ложный PASS. Это наблюдение чтением; тест не запускался. При затронутом порядке слоёв исправить falsifier, не просто текст.
- `scripts/test-framing-mutations.mjs`: `both-panels-left` anchor `crop(panelWindow(source, 1))` отсутствует в текущем format.ts; runner обязан отказать. Исторический зелёный отчёт не актуальная гарантия. Перед запуском восстановить уникальную семантическую мутацию актуального dual graph.
- Другие anchors: `return 'dual';`, wide/narrow checks, `2 * Math.floor(value / 2)`, watermark/ASS pushes. Сверить уникальность на финальной ревизии, RED и GREEN >0 tests; no-match не PASS.
- `RENDER_FONT_SHA256` читается из `packages/shared/src/watermark-metrics.json`. Font bytes/metrics/ONNX не менять. `source-pins.json` фиксирует фактические SHA256 входных исходников/шрифта/модели, а не новый dependency pin.
- Pinned CLI: harness0.8.58, feature-adr1.5.25, OpenSpec1.15.0. Пины research upstream — только прочитанные источники; не инструкция обновить runtime.

## Ограничения автоопределения

Face bbox ≠ tile ≠ автор ≠ смысл действия. Фиксированный crop не переживёт смену окна автоматически;
относительная ROI разрешает разные размеры, но не делает понимание сцены универсальным.
Предложение первой версии: явный screen+face, безопасный full-screen seed и ручное подтверждение
action/camera ROI, стабильные области на весь выбранный clip; при discontinuity — запрос уточнения
или full-screen fallback. Автоматическое слежение/переходы не обещать без отдельного evidence.
03 — default layout, а не лицензия потерять context при неуверенной ROI.

Предыдущий private макет SHA256 `93619144752c9f3e57630b9d7710fa2ee4632f5fb1884896eab09969f36df625`
— дизайн-референс одного состояния. Новых private GET/рендеров в этом потоке не было.

## Дополнение архитектора11.11.2026

`apps/web/src/lib/rpc.ts:1` содержит closed `RpcMethod` union; новые prepare/layoutInfo/apply должны попасть туда, иначе UI не проходит typecheck. Это обязательный thin consumer, добавлен в targets. Existing `tests/clip-music-choice.test.ts:65` привязан к `rpc<...>('clip.list')` в VideoDetail; тонкая интеграция не удаляет прежний poll. Новый shared sourceRevision helper согласуется с Original, чтобы worker не импортировал web/server.
