# Исследование Zoom screen + face

Дата: 11.11.2026. Исходный runtime на `1a7f17f66d83bacf07dd07c513a3cfad03837330`; хэши входных файлов — `source-pins.json`. Это чтение исходников и публичных первоисточников, не render PASS. Применены pinned feature-adr Step2, code-impl и методика goap-research-ed25519: цель → источники → ограничения → проверяемая рекомендация. Подписи издателей не установлены; криптографическая достоверность не заявляется.

## Codebase patterns

| Шаблон | Проверенные источники | Решение для фичи |
|---|---|---|
| Общая временная шкала | `apps/worker/src/render/compaction.ts:20,58,63,79`, `apps/worker/src/workers/render.ts:37–67` | `cut_plan` — абсолютные секунды source; `mapTime`, `planDuration`, `COMPACT_XFADE_SECONDS=0.08` уже определяют output. Повторный анализ пауз на rerender не нужен. |
| Компоновка до эффектов | `apps/worker/src/render/ffmpeg.ts:23–34,93–103`, `format.ts:55–109` | Новая screen branch перед ASS/teaser/flash/CTA/меткой; legacy single/dual/center остаётся прежней. |
| Настоящий render lifecycle | `packages/db/src/render.ts:14–41,61–75,85–149`, `attempts.ts:13–36` | Identity-only queue; DB snapshot под fence; старый object key до accepted publish; retry и create-only storage уже есть. |
| Явная пересборка и квота | `apps/web/src/server/clip-music.ts:13–57`, `video-cta.ts:21–85` | Reuse lock video→clip, retention, quota и lease. New layout intent добавляет недостающую replay identity без рефакторинга music/CTA в общий framework. |
| Завершение потерянного job | `apps/web/src/server/watchdog.ts:35–75` | После commit queue failure восстанавливает сторож. Layout status выводится из существующей серии попыток; новый scheduler не нужен. |
| UI и публикация | `apps/web/src/lib/screen-contract.ts:37–47`, `apps/web/src/server/screen.ts:80–120`, `ClipMusicChoice.tsx` | Published version уже определяется из immutable key. Draft/pending/published — три разные вещи. Mounted player и draft не пересоздаются polling. |
| Лица | `faces.ts:36–58`, `detect_faces.py:20–71` | Имеются YuNet, 0.5s sampling, resize длинной стороны640, timeout60s. Только bbox/score, без identity/Zoom tile/action semantics. |

## External patterns

- FFmpeg описывает split/crop/scale/pad/overlay как составные фильтры; framesync имеет отдельные правила конца вторичного потока. Для screen/camera нужны одинаковые timestamps и `repeatlast=0:eof_action=pass`, чтобы конец camera branch не создавал замороженную картинку. Источник: [закреплённый filters.texi](https://github.com/FFmpeg/FFmpeg/blob/9bee1e603cdb6e83d2e99c3cb9a452c2002139c5/doc/filters.texi). Это подтверждает возможности фильтров, не правильность ещё не написанного graph.
- OpenCV FaceDetectorYN возвращает bbox, пять landmarks и score; input size задаётся явно. Ни layout, ни личность лица этот API не обещает. Источник: [OpenCV4.12 header](https://github.com/opencv/opencv/blob/4.12.0/modules/objdetect/include/opencv2/objdetect/face.hpp) и [API](https://docs.opencv.org/4.12.0/df/d20/classcv_1_1FaceDetectorYN.html).
- Browser video предоставляет playback, seek и frame callback; source video можно рисовать в canvas двумя прямоугольниками при одной временной позиции. Source format/codec остаётся ограничением браузера. Источник: [WHATWG media](https://html.spec.whatwg.org/multipage/media.html). Это наш вывод о композиции из API, не гарантия совпадения с FFmpeg по пикселям.
- Zoom recording может менять представление по ходу записи; local/cloud режимы получают разные композиции. Отсюда фиксированная ROI допустима только после просмотра всего выбранного интервала. Источник: [Zoom recording layouts](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0062314).

Публичные байты FFmpeg/OpenCV/WHATWG получены через `evidence_fetch.fetch_source_returning_body`; HTTP200, URL/дата/SHA256 сохранены в `research-source-fetches.json`. Это unsigned журнал получения, а не issuer verification. Web open ffmpeg.org дал timeout, заменён первичным git source. Содержимое приватного source не скачивалось.

## Library evaluation

| Вариант | Реальное преимущество | Цена/ограничение | Решение |
|---|---|---|---|
| Имеющийся FFmpeg compositor | Уже в runtime; точная геометрия и общий звук | Нужно проверить настоящий graph, odd dimensions, aspect и слои | Использовать |
| Имеющийся OpenCV/YuNet как veto | Нет модели/сети/dependency; отрицательный замер полезен | Маленькое лицо при downscale теряется; замеры не доказывают каждый кадр/личность | Использовать консервативно; camera ROI задаёт пользователь |
| Remotion/новый browser render service | UI и export могли бы иметь один renderer | Новый runtime, browser automation в worker, отдельная загрузка/очередь и стоимость | Не добавлять для трёх статических layouts |
| Новые ML/OCR/saliency/tracking | Возможная автоматизация действий и переходов | Точность и стоимость не измерены, семантический scope существенно шире | Не добавлять |
| Native video+canvas для draft | Без jobs и npm dependencies; один source decode | Не воспроизводит финальный ASS/music/encode; seek/codec требуют браузерного evidence | Использовать, честно обозначить preview оформления |

Upstream research SHA не является runtime pin. `Dockerfile` использует `apk add ffmpeg py3-opencv` без package version, а документы называют FFmpeg8.1/OpenCV4.12. Перед media gate измерить `ffmpeg -version`, `ffprobe -version`, `python3 -c "import cv2; print(cv2.__version__)"` в проверяемом worker image и записать image digest. Не обновлять образ/ONNX/шрифт ради фичи; их bytes pins из `source-pins.json` сохраняются. Тестовый образ сейчас не устанавливает OpenCV: media smoke камеры должен идти в worker image, не считаться покрытым FFmpeg-only тестом.

## Anti-patterns

- Full-frame лицо не доказывает авторскую camera tile; detector никогда не выбирает source ROI для screen режима.
- Редкий sampling не означает покадровую гарантию. Исчезновение между замерами — явное ограничение, не скрытый PASS.
- Сохранять settings при radio change или рендерить preview на каждый клик — нарушение zero-write draft.
- Глобальное `video.cta_kind` и clip music не клонируются в новый settings aggregate; существующие busy locks уже сериализуют pixel-changing mutations.
- `crop` без contain/контроля aspect теряет контекст; `overlay` с повтором последнего secondary frame способен создать freeze.
- Source-substring test и отсутствующий mutation anchor не доказывают новый graph; два stale guards перечислены в reuse inventory.

## Recommended approach

Три additive layouts одного `screen-face-v1` с manually confirmed normalized screen/focus/camera ROI. Shared pure geometry отдаёт preview и FFmpeg одни source/destination rectangles. Camera — живые пиксели выбранной области, не поиск нового лица. Conservative veto при отрицательном замере скрывает её на весь клип; без подтверждённого focus показывается весь выбранный screen. Exact request replay хранится в маленьком `clip_layout_intent`, execution/retry/fence/queue остаются прежними. Новый deps/package-lock не требуется.

## Измерение runtime без пользовательского media

Read-only11.11.2026: `docker exec clipmkr-stage-20261028-worker-video-1 ...` выполнил `ffmpeg -version`, `ffprobe -version`, `python3 -c "import cv2; print(cv2.__version__)"` и`ffmpeg -hide_banner -h protocol=http` (exit0). Результат:FFmpeg/ffprobe8.1.3,OpenCV4.12.0. Image: `clipmkr-candidate-worker@sha256:34abe462e4880dac27c644d8c7302fc95aeedfcd8be85cbc80e7b2ac718f9e09`. `-h full` подтвердил `rw_timeout` в microseconds. Это измерение установленного binary, не media/render test и не package pin для будущей сборки. HTTP flags/Range проверяются отдельно на target image и fixture. [BullMQ priority docs](https://docs.bullmq.io/guide/jobs/prioritized) подтверждают: priority0/unassigned обрабатывается раньше положительного; это не вытеснение уже выполняющейся задачи.
