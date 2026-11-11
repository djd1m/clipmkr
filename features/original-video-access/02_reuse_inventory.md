# Инвентаризация переиспользования и рисков до кода

Ревизия `e66d9addfad16e1b6dcd7bd07bf06c5abb1343f1`. Это вход Step3/6, не выполненный Step2 (M его не требует).

## Native seams и потребители

| Seam | Переиспользование / ограничение |
|---|---|
| `apps/web/src/server/clip-file.ts:createClipFileHandler` | session cookie/auth, rate limit, UUID, active account/owned video/deleted, 404 и private/no-store/no-referrer 302; guest ветку не копировать в original |
| `packages/s3/src/presign.ts:generateDownloadUrl` | GetObject, publicSigningClient и TTL900/notAfter; файл не меняется. Same-origin ответ original сам задаёт MIME/disposition; legacy URL/clip.mp4 fallback неизменен |
| `packages/s3/src/operations.ts:headObject,getObjectBytes` | HEAD bytes и Range `bytes=0-4095`, FAST timeout. Сейчас transformToByteArray не ограничивает локально тело: новый optional maxBytes4096 обеспечивает cap/cancel, default остаётся прежним |
| `apps/web/src/server/guest-file.ts:streamGuestFile` | Настоящий existing stream: Range, redirect:error, native body/backpressure, request.signal. Новый optional headers-only timeout для original снимает120с cutoff полного файла; default старых guest вызовов сохраняется |
| `packages/s3/src/client.ts` | public signing host, namespace keyPrefix/legacy transport и client.destroy; не собирать key вручную и не менять AWS credentials |
| `apps/web/src/server/video.ts` | `actual_bytes`, status/upload_enqueued_at, DB object_key; upload complete проверяет magic и HEAD; uploading не является готовым объектом |
| `apps/web/src/server/media-type.ts:isAllowedMedia` | Проверенные magic семейства ftyp/QuickTime/WebM/MP3; сейчас возвращает только boolean. Не выводит codec; расширение недостоверно. Архитектор выбирает минимальное расширение результата, сохраняя boolean контракт upload |
| `apps/web/src/server/screen-runtime.ts` | runtime/pool/auth/redis/config и lifecycle S3 client; отдельный `original-runtime.ts` предпочтителен росту общего файла, если реально уменьшает diff |
| `VideoDetail.tsx` и `ClipCard.tsx` | существующее рабочее пространство, selectedClipId, media pause и ref; новый небольшой OriginalSource компонент; минимальная вставка, не перенос всего VideoDetail и не вторая система плееров |
| `retention.ts`, legal-documents.ts §6.2 | исходник отдельно от clip deadlines; eraseAccount чистит prefix, обычный clip cleanup исходник не удаляет; ничего не менять |
| `packages/shared/package.json` exports `./*` | Уже разрешает subpath `@clipmaker/shared/server/original-source`; новый backend-only leaf — единственный владелец revision helper для web и Zoom worker. `shared/src/index.ts` не дополняется; `node:crypto` остаётся внутри server leaf. Test source alias добавляется в `vitest.config.ts`, чтобы не проверять stale dist |

Новых OSS/SDK не нужно: установлен AWS SDK, нативные media, React и существующие seams полностью покрывают capability. Копирование из других проектов 1–8 не требуется, так как собственная реализация совпадает со стеком и назначением; это не утверждение о полном аудите всех восьми проектов.

## Минимальные кандидаты файлов для Step6

Runtime10: новый `server/original-file.ts`, route `app/api/videos/[videoId]/original/route.ts`, небольшой `server/original-runtime.ts`, новый `app/videos/[videoId]/OriginalSource.tsx`, маленькая вставка `VideoDetail.tsx`, scoped CSS module, optional bounded mode `packages/s3/src/operations.ts`, optional header deadline `server/guest-file.ts`, media detection seam и `packages/shared/src/server/original-source.ts`. Плюс один source alias в `vitest.config.ts` и пять test файлов: всего16. Metadata живёт в original route, не в `VideoScreen`/SSR/5s poll. Файлы перечислены в draft06; итоговые Step6/K1/K2 только после QCSD.

Новые имена для K1 после архитектуры: `createOriginalFileHandler`, `originalRoute`, `OriginalSource`, `OriginalSourceMetadata`, `OriginalFileDependencies`, `originalSourceRevision`, `detectOriginalMedia`, `OriginalMediaType`, `StorageStreamError`; модуль basenames `original-file`, `original-runtime`, `OriginalSource`, `original-source`. Единственный export `originalSourceRevision` принадлежит shared server leaf, не web module. Сейчас K1/K2 не запускались: QCSD/финальный план ещё не закрыты; выдавать ранний name sweep за gate нельзя.

## Контракты, guards, mutation anchors

- Signer потребляют clipRoute/showcaseRoute, upload/worker/test consumers. `tests/s3-public-endpoint.test.ts` содержит точный ожидаемый `attachment; filename="clip.mp4"; filename*=UTF-8''…`; не менять прежнюю ветку ради original. SigV4 пересчитывается независимо, signing не dispatch network.
- `tests/progress-screen.test.ts`, `tests/trust-guards.test.ts`, `tests/retention-route.test.ts`, `tests/guest-pack.test.ts` проверяют clip auth/expiry/guest; `tests/storage-prefix.test.ts` — physical namespace; `tests/retention-policy.test.ts` — SSR VideoDetail с истёкшими клипами.
- `tests/browser/ux-simplification.test.ts:41` содержит буквальные mutations VideoDetail `intent.phase = failed ? 'unknown' : 'awaiting';` и `if (!alive()) return;`; вставка original их не меняет. `scripts/test-retention-mutations.mjs` меняет tariff/retention/screen/clip-file anchors; этих файлов в scope нет, кроме возможного read reuse screen-runtime.
- Поиск `sha256/createHash/presign.ts/VideoDetail` в указанных guards не нашёл обязательного fixed hash runtime для затронутых source files; исторические release/QE receipts и approved HTML имеют свои SHA и остаются историческими. Не перепривязывать их.
- Baseline SHA256: clip-file `8ebe2f60c96bc6b29d41df26370c0a97315fa2a8cb56824755480cf56d34a23d`; presign `c3a0adff02383a264556bd4e59998cbb756ed4cccef35482c264f37343b3df3e`; operations `ecf5a0a284d6f3b833cf31adb48d15ee344dca0db1823a1eb69ba686bdb5e0fe`; VideoDetail `c878b80619a14579f23ef8e9368dca3869ee1e9442d018d2c86d4233ca1a29da`. Изменения baseline во время planning не выполнялись.

## Предлагаемая проверка по риску

Сначала новые focused unit/integration original-file тесты: anonymous/foreign/missing/deleted/inactive/owner-own; запрет storage до ownership; incomplete/HEAD404/timeout/mismatch; safe MIME и header filename/CRLF; GET expiry ≤900; same cache privacy на всех ответах; нет jobs/growth/write. Новые проверки не зеркалят JSX.

Совместимость: `npm test -- tests/s3.test.ts tests/s3-public-endpoint.test.ts tests/progress-screen.test.ts tests/trust-guards.test.ts tests/retention-route.test.ts tests/retention-policy.test.ts tests/guest-pack.test.ts tests/storage-prefix.test.ts` плюс real DB original authorization fixture в существующем изолированном postgres. Никакие skip/no-match не PASS. Финальные точные команды задаст Step6 по реальному diff.

Браузер: реальный component/route, Chromium 1440/390 и установленный WebKit как regression при возможности; согласованный normal screenshot/geometry/DOM, focus/return/selection, один звук, expiry+seek/pause refresh, unsupported fallback. Cloud.ru fixture после gates — ограниченный тестовый prefix, реальный 206/Content-Range/Accept-Ranges/Content-Type/disposition; приватная квитанция без URL. Offline signer test не доказывает Cloud.ru transport. 120-минутную длительность не подтверждать коротким fixture; TTL seek границу проверить искусственно короткой подписью.

Один общий финальный `npm test`, `npm run typecheck`, `npm run lint` на стабильной ревизии, затем независимое cross-model QE. Исходники не менять во время прогона. Повтор после исправления — затронутые suites; новый общий только по названному риску. Delivery root: проверенная тестовая копия VPS → UI/E2E → инструкция/ссылка владельцу → приёмка → тот же artifact Cloud.ru только после разрешения; DNS отдельно.
