# Shift-left ADR-001 — авторский анализ до QCSD

11.11.2026, `/root/original_video_architecture`, запрошенная `gpt-6-astra xhigh`. Прочитан pinned `qe-ref-shift-left-testing/REFERENCE.md` из `/home/clipmkr/.agents/skills/feature-adr/references/agentic-qe` (upstream0a6de058575cbe292afe220df105cc74120f7674). Reference mode; AQE runtime/agent execution не заявляются. Это дизайн-анализ, не независимое ревью и не результаты тестов.

## Testability ADR-001

1. Под нагрузкой каждый read создаёт HEAD/sniff и media stream. Существующий allowRead ограничивает запросы; без новых caches и очередей. Body backpressure и abort не дают буферизации полного файла. Web bandwidth остаётся ценой решения, измеряется на test VPS; производственный capacity не доказан.
2. Failure modes: ownership404 до storage; incomplete409; missing404; provider timeout/5xx503; неправильный Range416; browser codec unsupported при доступном download; race HEAD→GET404; client abort отменяет upstream. Начатый streaming failure нельзя превратить в другой HTTP status после headers — UI получает native error и ограниченную проверку metadata.
3. Недоступный S3 не ломает обычные video.get/list polls или просмотр уже готового клипа. Source row показывает временную ошибку, не удаляет данные и не запускает jobs.
4. Изоляция: DI auth/pool/head/bytes/sign/stream для fast tests; реальные PostgreSQL и HTTP stream для ключевых механизмов; настоящий Cloud.ru через existing fenced fixtures; browser с настоящим React и native media, не copy-paste mockup.

## BDD и falsifiers

| Риск | Given / When / Then | Проверка, которая должна упасть при нарушении |
|---|---|---|
| HIGH IDOR | foreign video/owner-role → GET/HEAD/metadata/download → одинаковый404, ноль storage | `original_denies_foreign_before_storage`, `tests/original-file.integration.test.ts` на real DB |
| HIGH source bytes leak | собственный источник → media → same-origin200/206, нет Location/S3 URL | `original_keeps_s3_capability_server_side`, `tests/original-file.test.ts` |
| HIGH полный buffering | upstream игнорирует Range/шлёт больше4096 → bounded sniff → cancel/error без полного чтения | `original_sniff_stops_at_byte_limit`, `tests/original-file.test.ts` через настоящий loopback HTTP stream и AWS SDK |
| HIGH длинный transfer, OT-TEST-1 | headers вовремя, marker через125с послеheaders при body≤1KiB → original читается, downstream abort закрывает upstream≤2с; parallel legacy consumer прерывается120с | `original_stream_survives_header_deadline_and_aborts`, `tests/original-file.test.ts`, native loopback/real clock, case timeout150000мс; fake timers и16с проверка не подходят |
| HIGH неверный auth SQL | active own/foreign/inactive/deleted/unknown в PostgreSQL → route → разрешено только своё | `original_denies_foreign_before_storage`, `tests/original-file.integration.test.ts`; нельзя mock query вместо этого |
| MEDIUM MIME | octet-stream и ложный suffix при magic MP3/M4A/MOV/WebM/MP4 → type по magic, unknown.bin | `original_magic_ignores_key_suffix`, `tests/original-media-type.test.ts` |
| MEDIUM source state | uploading/actual mismatch/HEAD404/timeout и downstream failed → точное состояние, ни jobs ни credits write | `original_distinguishes_upload_missing_and_outage`, `tests/original-file.test.ts`; real DB state snapshot в integration |
| HIGH CORS canvas | source на same-origin → video frame drawn → canvas.getImageData не бросает SecurityError | `original_source_is_canvas_readable`, `tests/browser/original-video-access.test.ts` |
| MEDIUM UX regression | выбранныйclip → watch → другойclip/return → тот же DOM/selection, один звук и корректныйfocus | `original_preserves_clip_selection_and_single_media`, `tests/browser/original-video-access.test.ts` |
| HIGH OQ-QUALITY-1 | ready source при0clips → watch/back → current empty-state и focus trigger, без фиктивного selectedClipId; поздние clips приходят обычным poll | `original_handles_zero_clips_and_late_results`, `tests/browser/original-video-access.test.ts` |
| HIGH OQ-QUALITY-2 | media stream оборвался, один refresh даётready → видимый playback-error, media paused, нет auto reload; новая попытка лишь прежним действием | `original_media_error_ready_does_not_restart`, `tests/browser/original-video-access.test.ts`, включая таблицу иныхmetadata исходов05 |
| HIGH provider mismatch | синтетический Cloud.ru object → Range и download → реальные206/416/байты/header, cleanup | `original_cloudru_range_download_contract`, `tests/original-cloudru.test.ts`; MinIO не evidence |
| MEDIUM source revision | неизменная upload identity + инойupdated_at → revision тот же; новыйupload/key/size → другой | `original_revision_tracks_upload_identity`, `tests/original-file.test.ts` |

Все HIGH имеют mitigation и названный будущий falsifier. Это не значит, что остаточный риск закрыт: каждый тест должен существовать, выполниться и не быть skip/no-match. ADR Confirmation содержит method/monitoring/metric/owner и load-bearing property. Три независимые QCSD роли уже дали реальные r1 результаты; три условия требуют focused recheck собственного origin и актуального delta assessment, включая clean risk роль.

## Совместимость и границы

`generateDownloadUrl` и fallback clip.mp4 не меняются; `streamGuestFile` default сохраняет старые вызовы. `getObjectBytes` без maxBytes сохраняет прежний контракт. `isAllowedMedia` сохраняет truth table. Тестируются siblings `tests/s3.test.ts`, `tests/s3-public-endpoint.test.ts`, `tests/guest-pack.test.ts`, `tests/storage-prefix.test.ts`, upload suites. Native media duration короткой synthetic fixture не доказывает120мин; длинный stream contract проверяется отдельно без скачивания private source.

Нет новой записи SQL, migration, тарифа, retention cleanup или live payment. Подтверждение полного CJM из core-cjm не подменяется узким original тестом. Исторические production bytes, production signup и массовый HEAD/read не входят в planning.
