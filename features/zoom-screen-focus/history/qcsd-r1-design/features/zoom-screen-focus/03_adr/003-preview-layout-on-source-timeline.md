# ADR-003: Показывать локальный draft по защищённому source и сохранённому cut_plan

## Status
proposed — обратимо до UI интеграции; пересмотреть, если будет нужна точная до пикселя симуляция финального encode. UI placement уже согласован владельцем; этот ADR не повторное согласование. Requirements: ZF-02, ZF-04, ZF-05, ZF-07, ZF-10; AC01, AC04, AC07.

## Context
Три radio choices и ROI sliders должны немедленно менять preview без render jobs. Один стоп-кадр не обнаруживает потерю меню/смену окна. Готовый MP4 уже обрезан legacy framing и не может вернуть исчезнувшие source pixels. Отдельная Original-фича создаёт авторизованный Range доступ к исходнику; дублировать его auth/storage не нужно.

## Decision Drivers
1. HIGH: весь выбранный clip можно просмотреть до apply, screen/camera синхронны.
2. HIGH: draft/cancel/radio не пишут серверное состояние и не тратят квоту.
3. HIGH: private source остаётся в существующей owner/session boundary.
4. MEDIUM: стабильный player, optional advanced, reuse browser video без dependencies.

## Considered Options
| Вариант | Плюсы | Минусы | D1/D2/D3/D4 |
|---|---|---|---|
| Новый preview MP4 при каждом выборе | Финальный renderer даёт точные effects | Латентность, jobs/storage/cleanup, расход на каждый control | +/−/+/− |
| Статичный poster/CSS mockup | Мгновенно и дёшево | Не проверяет весь clip и смену окна | −/+/+/+ |
| Один source video + canvas composition | Движение, общая позиция source, local controls | Approximate transitions/effects, browser codec/seek границы | +/+/+/+ |

## Decision
Новый модуль `ClipLayoutChoice` владеет local draft/dirty/request identity. `ClipLayoutPreview` владеет одним source `<video>` и canvas. Его `src` — локально построенный `/api/videos/${encodeURIComponent(videoId)}/original`; GET/HEAD/Range и `?metadata=1` реализуются Original-фичей с owner/session проверкой на каждый запрос. Browser props не содержат S3key/signed URL/public tokens. Exact metadata seam согласован с Original архитектором: `OriginalSourceMetadata`: ready `{videoId,state:'ready',available:true,sourceRevision,media:{kind:'video'|'audio'|'unknown',mime,extension,bytes:string,durationSeconds:number|null}}`; остальные `{videoId,state:'incomplete'|'missing'|'error',available:false,unavailableReason}` без revision/media. `sourceRevision` — lowercase SHA256 UTF8 от `JSON.stringify(['original-source-v1',videoId,objectKey,uploadId??null,String(actualBytes)])`, не video.updated_at. Root закрепил canonical server-only leaf `packages/shared/src/server/original-source.ts`, export `originalSourceRevision`, import `@clipmaker/shared/server/original-source` (ownership Original). `packages/shared/src/index.ts` его не re-export-ит: node:crypto не должен попадать в browser bundle. Existing `./*` package exports уже достаточны; package/dependency changes не нужны. Worker не импортирует web/server module. Layout API пересчитывает его сервером. Actual ETag не требуется при immutable source contract.

Clip-specific read projection дополнительно даёт `{clipId,start,end,cutPlan,renderVersion,publishedRenderVersion,publishedLayout,seedStatus,seed?,rerenderQuota}`. `cutPlan` валидируется на сервере; NULL значит один интервал[start,end]. Source layout request передаёт `expected_source_revision`, чтобы stale geometry не принять после смены identity. До ready metadata/source video loaded/readable seekable состояние preview имеет конкретную причину; apply не предлагает подтвердить неувиденный кадр.

Один decoder обеспечивает camera и screen один и тот же кадр. `requestVideoFrameCallback` перерисовывает canvas, `seeked` перерисовывает при scrub; fallback requestAnimationFrame на поддерживаемых браузерах без callback. Canvas использует shared geometry из ADR-001; ни `toDataURL`, ни export/screenshot source, ни сохранение кадров/localStorage не нужны. Same-origin endpoint Original обеспечивает origin-clean canvas и reauth; redirect на S3 здесь не допускается. При ошибке/истечении сессии показать причину, сохранить draft и старый published player.

Для compaction выделить **существующую** pure timing часть `parseCutPlan`, `planDuration`, `mapTime`, `COMPACT_FPS`, `COMPACT_XFADE_SECONDS` в `packages/shared/src/cut-timeline.ts`; worker compaction переэкспортирует их, graph generation остаётся на worker. Это перенос без изменения алгоритма, проверяется прежними compaction tests. Preview проходит сохранённые retained segments; на0.08s crossfade использует hard cut в midpoint с тем же output duration/time mapping, не пытается имитировать два decoder/audio mixers. В переходе можно открыть исходник и проверить обе стороны; фраза рядом с preview: «Проверка кадра и движения. Переходы, музыка и подписи окончательно собираются после применения». Preview не называется финальнымMP4. Gate требует проверку всех retained segments от начала до конца, включая ±0.5s вокруг cuts.

Shared preview time mapping возвращает source timestamp(s) для output position; если crossfade даёт две позиции, draft выбирает раннюю до midpoint, позднюю после. Native source audio следует выбранной позиции; финальный music/packshot mix в preview не обещается. Relative clip progress использует planDuration, end clamp и seeked, а не исходную продолжительность всего файла. Синхронизация screen/camera в canvas всегда точная, поскольку drawImage один и тот же video frame. Доказательство time mapping отдельно от заявления о frame-exact browser seek.

При первом **явном** включении режима seed-analysis по ADR-004; status/ready/error отображаются в существующей области preview. При достаточном seed camera предлагается автоматически; optional ROI controls остаются закрыты. Обновление seed/polling может заполнить только pristine draft, никогда не затереть dirty пользовательские ROI. Любое изменение layout/ROI или применённого seed сбрасывает checkbox просмотра; pending confirmation считается пользовательским выбором и не перезаписывается поздним seed. Radio01/02/03, sliders, close/cancel, playback, quota-read —0 render mutations/jobs/charges. Открытие `<details>` само по себе не означает применение. Нет обязательного нового wizard.

Apply показывает выбранный clip/вариант/камеру/fallback, подтверждение просмотра областей на всём фрагменте и **серверные** limit/remaining/reset состояния `user_rerenders`. День/reset вычисляются existing moscowDay/quotaResetAt, owner exemption читается hasOwnerUnlimited; unlimited показывается без выдуманного остатка. Число20 или «бесплатно» не зашивается. Quota read advisory; mutation повторно проверяет её атомарно. После accepted request старый MP4 доступен и сохраняет mounted identity до фактической new published version. Polling показывает pending/failed/conflict; local draft живёт при fail, refresh восстанавливает accepted server intent/published config, но unsaved draft после полной перезагрузки не обещается. Close settings/polling не сбрасывают draft. При external publish и dirty draft сообщить конфликт; не заменять его молча.

При play preview вызывает parent `onPreviewActivate`: root ставит на pause опубликованный player и Original viewer, сохраняя их DOM identity. При закрытии/смене clip preview ставится на pause и освобождает source decoder; скрытие CSS не считается остановкой. Одновременно слышим только один media элемент. Это thin integration в VideoDetail, не новый global media manager.

## Rationale
D1 требует original source, а не готового crop. D2/D4 достигаются browser-only composition и отдельным explicit apply. D3 reuse защищённого Original endpoint исключает второй публичный source access path. Exact encode preview был бы дороже задачи и провоцировал новые renderjobs.

## Consequences
### Positive
Одна source playback позиция, мгновенный local layout change, reuse existing layout tokens и player lifecycle.
### Negative / Accepted Downsides
Не все source codecs проигрываются браузером; unsupported показывает конкретный отказ preview, download Original остаётся доступен, apply не выдаёт непроверенный draft за просмотренный. Crossfade/music/ASS не имитируются точно. По0.08s переходу требуется проверить соседние source состояния; окончательная приёмка — настоящий MP4. Unsaved draft не хранится на сервере; full page reload может его потерять, pending intent восстанавливается.
### Follow-up ADRs
ADR-002 — request identity; ADR-004 — advisory auto seed. Новая proxy/auth/CORS система в этой фиче не создаётся.
### After-action Review
Owner: UI автор и координатор. Через30 дней после приёмки: unsupported codecs, failed seeks и конфликты draft/publish.

## Confirmation
- Method: mounted React browser tests Chromium/WebKit, real synthetic same-origin Range video,390/1440 обе темы; owner wholeclip acceptance.
- Monitoring: без логирования source URLs/кадров; счётчики mutation requests/jobs/quota в тестах; UX state error/loading/ready/pending/failed проверяется снаружи.
- Success metric: screen/camera sample counter равны; все retained segments доступны; radio/slider/cancel дают0 render calls; polling не меняет video node/dirty draft; одна seed operation при explicit mode; apply retry использует тот же request key.
- Owner: автор UI + независимый accessibility/QX QE.
- Load-bearing property: draft не запускает платный/долгий render и не разрушает опубликованный клип, private media доступно только owner.
- Required automated check: `tests/browser/clip-layout.test.ts`, `tests/screen-layout.test.ts`, `tests/clip-layout.integration.test.ts`, `tests/compaction-media.test.ts`.
