# ADR-001: Компоновать подтверждённые области одного source

## Status
proposed — конкретное решение для QCSD; обратимо до реализации. Пересмотреть после приёмки motion corpus, при необходимости keyframed ROI либо отдельной camera track. Requirements: ZF-01, ZF-03, ZF-04, ZF-06, ZF-09, ZF-10; AC02–04.

## Context
Legacy `single/dual/center` следует за лицами и может удалить содержимое экрана. Zoom source содержит уже сведённые экран/камеру: отдельной видеодорожки головы нет. Face bbox не является semantic action или доказательством личности. Нужны три выбранных владельцем layout и общий timebase без hardcode одного1816×968 source.

## Decision Drivers
1. HIGH: содержимое выбранного screen и подтверждённого action остаётся в кадре.
2. HIGH: camera/source/audio/captions следуют одному cut_plan; нет frozen/подставного face.
3. HIGH: legacy render остаётся прежним для NULL config.
4. MEDIUM: одни pure geometry primitives для FFmpeg и browser preview, без новой ML/dependency.

## Considered Options
| Вариант | Плюсы | Минусы | D1/D2/D3/D4 |
|---|---|---|---|
| Расширить legacy single/dual | Минимальный dispatch | Смешивает camera+screen с двумя лицами, прежний fallback теряет экран | −/+/−/+ |
| ML action/identity tracker | Может автоматически следовать за действиями | Качество/цена не установлены, новый scope и зависимости | ?/+/+/− |
| Versioned screen-face compositor | Явные ROI/безопасные зоны, тестируемый fallback | Подтверждение stable области на всём клипе; не умеет универсальный tracking | +/+/+/+ |

## Decision
Новый closed value object `ScreenFaceLayoutV1` в `packages/shared/src/screen-layout.ts`:
`{version:1,mode:'screen-face',variant:'01'|'02'|'03',screen:NormalizedRect,focus:NormalizedRect|null,camera:NormalizedRect|null}`.
`NormalizedRect={x,y,width,height}`: finite JSON numbers,0≤x,y<1,0<width,height≤1,x+width≤1,y+height≤1; focus полностью внутри screen. Unknown keys/version/mode, strings/coercion/NaN отвергаются. Нормализация до6 знаков выполняется до equality/idempotency. Camera может быть внутри source за пределами screen; она никогда не определяется произвольным найденным лицом во время render. NULL layout означает legacy. Непригодный ненулевой config — ошибка попытки с сохранением old MP4, не скрытый возврат в legacy.

Coordinates относятся к **декодированному ориентированному source**, не к CSS viewport и не к готовому MP4. Browser intrinsic video geometry и FFmpeg autorotation должны совпасть. Pixel conversion по реальному probe: left/top округляются наружу вниз до чётного, right/bottom наружу вверх до чётного и ограничиваются ближайшей допустимой чётной source границей; crop минимум2×2. Нельзя отнять содержимое focus только ради evenFloor. Для нечётного самого source максимум теряется крайний1px; это явная измеряемая погрешность, а не resize до1816×968. Rotate90/270 учитывается probe; SAR≠1 должен быть приведён к square-pixel display plane до ROI, либо получить явный unsupported-geometry fallback к полному screen без camera, не искажённый crop. Его контракт проверяется медиа-тестом, не догадкой по width/height.

Shared pure `planScreenLayout` возвращает source crops, output rectangles, protected action rectangle и закрытые fallback reason. Render branch получает **уже сведённый `[vc]`** после existing compaction; split одного input на screen/camera, затем crop/contain/overlay. Audio не проходит второй независимый trim. Camera всегда moving pixels текущего input; `repeatlast=0:eof_action=pass`, без tpad/loop/still image. FFmpeg graph хранится в `apps/worker/src/render/screen-layout.ts`, legacy format/framing не меняется.

Preset output1080×1920: header y0..400; основной pane y400..1200; existing ASS/CTA/watermark safe zones остаются ниже. Единственное позиционное расширение helper teaser — screen mode y0.03h (те же font/escaping/max3 lines); его measured bbox обязан закончиться до400. Существующий ASS bottom1420, CTA zone и watermarkPlateTop вычисляются каноническими helpers; на них не распространяется стилизованная «метка5%» из HTML. При другом format все геометрические доли масштабируются, но эта функция поддерживает только portrait в пользовательском контракте.

01: screen целиком contain в pane, aspect сохраняется, никакого fill/crop края. Camera размещается только в свободной полосе/контексте, не пересекающем mapped whole screen; если места нет, camera omitted с reason `no_safe_camera_slot`. 02: screen contain в верхней части pane y400..960, camera contain отдельно y976..1200. 03: focus увеличивается; предпочтительный PiP в правом верхнем углу pane (x0.69W,y420,width0.28W,maxHeight0.16H, aspect-preserving). Из safe rectangles слева от PiP и под ним выбирается дающий больший contain scale для focus; deterministic tie — слева. Focus целиком внутри safe rect, добавочный screen context заполняет остальной pane при том же scale/translation, камера лежит поверх этого контекста. Out-of-source части заполняет фон, не растяжение. Ни PiP, ни header/ASS/CTA/watermark не пересекают protected focus.

Отсутствие подтверждённого focus (`focus=null`) — `whole_screen` fallback: весь screen contain; это всё ещё выбранный03 с пояснением «Показан весь экран; уточните область для крупного плана». Ни пользовательский выбор03, ни camera seed не доказывают место действия. Автоматический camera seed из ADR-004 применяется как предложение; full-clip preview и явное apply подтверждают конкретные ROI. Closed region controls остаются optional.

Для camera render проверяем **выбранную camera ROI**, используя existing YuNet в этой области, без новых weights. Нет report/нет лица хотя бы в одном0.5s sample **сохранённых cut_plan интервалов**/ROI вышла за допустимую геометрию → camera скрыта **на всём клипе**, экран остаётся; reason `camera_unavailable`/`camera_unstable` записан в result. Этот консервативный veto избегает мерцания и нового timeline editor. Не пересчитывать crop по чужому face в другой части кадра. Missing focus → whole-screen; missing camera сам по себе не уничтожает подтверждённый focus.

Граница доказательства ZF-06: каждый показанный camera pixel пришёл из той же подтверждённой source ROI в тот же момент; при наблюдённом исчезновении/ошибке camera отсутствует, screen сохраняется. Sampling0.5s не доказывает отсутствие события короче0.5s между замерами и не распознаёт смену личности внутри tile. Для них обязательны wholeclip source preview и owner acceptance; система не заявляет identity recognition/покадровый action understanding. Source window change не вызывает выдуманного auto tracking: пользователь расширяет screen/focus либо использует01; если безопасный focus не подтверждён, publish только whole screen. Это ограничение явно предъявляется QCSD, а не закрывается green synthetic report.

## Rationale
D1 обеспечивается contain и geometric nonintersection; D2 — одним compacted stream и live crop; D3 — additive dispatch по config; D4 — shared geometry, существующие FFmpeg/OpenCV. Отдельный tracker не нужен для выбранных трёх layouts. Предсказуемый false-negative camera accepted как цена безопасного screen; частота ещё не измерена.

## Consequences
### Positive
Normalized ROI переносится между source resolutions. Legacy tests не меняют expectations. Метка остаётся последним слоем и тариф определяется DB.
### Negative / Accepted Downsides
Camera может быть скрыта целиком из-за одного ложного отрицания; доступный размер action ограничен safe zones. Текст широкогоscreen не гарантированно читаем на390px. Preview не обещает финальный detector outcome до render; это поясняется. Ручная коррекция доступна без обязательного wizard. Новый auto tracker/segmentation не входит.
### Follow-up ADRs
ADR-002 — durable apply/publish; ADR-003 — preview; ADR-004 — auto seed.
### After-action Review
Owner: координатор Clipmkr и владелец. Через30 дней после приёмки: причины camera suppression и случаи неуместившегося action.

## Confirmation
- Method: настоящий FFmpeg на synthetic moving source + pure geometry tests + отдельная приёмка разрешённого private source wholeclip.
- Monitoring: screen_layout_resolved с variant/reason/camera_present, без картинок/URL; UI читает published result reason.
- Success metric: output1080×1920, screen/camera source counter совпадает; focus не пересекает overlays; content/time bounds сохранены; no-camera/error/move → заявленный fallback; legacy media expectations прежние. Geometry rounding error≤2px/crop edge, odd source last edge≤1px.
- Owner: автор реализации; независимый QE подтверждает pixel/time oracle и реальные ограничения.
- Load-bearing property: screen/action не потеряны из-за face fallback, watermark остаётся последним, camera не заморожена и не взята снаружи подтверждённойROI.
- Required automated check: `tests/screen-layout.test.ts`, `tests/screen-layout-media.test.ts`, `tests/render.test.ts`, `tests/framing-media.test.ts`, `tests/compaction-media.test.ts`.
