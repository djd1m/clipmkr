# ADR-001: Выдавать исходник через авторизованный same-origin route

## Status
proposed — обратимо до реализации; пересмотр при измеренной перегрузке web bandwidth или появлении подтверждённого CORS-контракта Cloud.ru. Это авторское архитектурное решение до QCSD, не checkpoint и не разрешение кода.

## Context
Нужны просмотр и скачивание собственной исходной записи; Zoom preview использует source video в canvas. Прямой S3 redirect потребовал бы доказанной CORS-конфигурации. В Clipmkr уже есть потоковая передача `streamGuestFile` с Range и backpressure, session/ownership и S3 HEAD/ограниченное чтение. В БД нет исходного filename, upload Content-Type — octet-stream, а сроки клипов не являются сроками исходника.

## Decision Drivers
1. Высокий: авторизация каждого чтения и отсутствие доступа к чужим source bytes.
2. Высокий: origin-clean canvas в Zoom и native media Range/seek.
3. Высокий: минимальный diff и совместимость готовых клипов.
4. Средний: объём исходника может быть большим, полное буферизованное чтение недопустимо.

## Considered Options
### Same-origin поток через существующий обработчик
Плюсы: cookie-auth на каждом запросе, CORS не требуется, URL без bearer; готовые stream/Range примитивы. Минусы: web участвует в передаче больших файлов и должен сохранять abort/backpressure.
### Redirect на S3 presigned GET
Плюсы: меньше web bandwidth, готовый signer TTL 900. Минусы: canvas зависит от ещё не доказанного S3 CORS; браузер получает bearer, seek после expiry нуждается в refresh; HEAD MIME octet-stream не годится.

## Decision
Добавить `GET|HEAD /api/videos/:videoId/original` для собственного исходника; GET с `metadata=1` возвращает типизированное состояние без подписей, GET с `download=1` возвращает attachment. Browser получает относительный same-origin URL; каждый новый запрос проверяет UUID/session/active-account/ownership/deleted и завершённость загрузки перед storage. Переиспользовать `streamGuestFile`, расширив только optional режим deadline для original; нынешний вызов остаётся совместимым. Подробный контракт — `05_architecture.md`.

Единственный revision helper для этого read seam и Zoom worker — `packages/shared/src/server/original-source.ts`, импорт `@clipmaker/shared/server/original-source`. Он использует существующий wildcard package export, без новой зависимости и без re-export из shared/index.ts; Node crypto остаётся только на backend. Уточнение размещения дано root 11.11.2026 до QCSD, это инженерное решение координатора, не якобы заданный пользователем путь.

## Rationale
Same-origin удовлетворяет D1/D2 без новой auth-схемы и CORS конфигурации. Body pass-through удовлетворяет D4. D3 достигается неизменным `generateDownloadUrl` и старым режимом `streamGuestFile`; source MIME/disposition задаёт защищённый ответ приложения, а не legacy signer.

## Consequences
Положительно: один read seam для исходника и Zoom; подписи/keys не передаются в browser; источник не связан с clip retention.

Цена: web трафик растёт; metadata и media требуют HEAD и до 4096 проверочных bytes. Нет cross-user cache. Header deadline и downstream abort должны проверяться реальным потоком, а не только mock Response. Пересмотр — по измеренной нагрузке, без заранее введённого proxy service.

Follow-up ADRs: сейчас не требуются. After-action review: координатор, через месяц после фактической приёмки; bandwidth, ошибки Range и aborted transfers.

## Confirmation
- Method: unit/real-DB/Cloud.ru bounded fixture + Chromium browser checks.
- Monitoring: существующий HTTP outcome/access-log; сообщения original без URL/key/сырых S3 ошибок. По журналам различаются 404/409/429/503; отсутствие отдельной метрики не маскирует retry.
- Success metric: foreign/anonymous/inactive/deleted → 404 и ноль storage вызовов; same-origin Range → 206; canvas pixel read разрешён; download bytes совпадают; прежние clip contracts проходят.
- Owner: автор `gpt-6.1-sol high`; независимый QE `gpt-6-astra xhigh` другой сессии; архитектуру проверяет другая модель.
- Load-bearing property: source bytes выдаются только владельцу после DB gate, поток остаётся bounded/abortable, URL никогда не редиректит browser на S3.
- Shared seam check: `original_revision_tracks_upload_identity` в `tests/original-file.test.ts` импортирует канонический server leaf и проверяет фиксированный v1 digest; web/worker typecheck проверяет разрешение subpath, browser test сборка не импортирует этот leaf или Node crypto.
- Required automated check: `tests/original-file.test.ts`, `tests/original-file.integration.test.ts`, `tests/browser/original-video-access.test.ts`, `tests/original-cloudru.test.ts`; совместимость `tests/guest-pack.test.ts`, `tests/s3-public-endpoint.test.ts`.

Уточнение Confirmation по реальному QCSD r1 (решение same-origin не меняется): `original_stream_survives_header_deadline_and_aborts` обязан прочитать ≤1KiB native loopback body marker через125с послеheaders при case timeout150с, доказать upstream close после downstream abort и сохранить параллельный legacy guest cutoff120с. Fake clocks/16с wait не доказывают это свойство. `original_handles_zero_clips_and_late_results` и `original_media_error_ready_does_not_restart` проверяют существующий viewer до появления клипов и честную остановку после media error даже при ready metadata. Exact lifecycle и отрицательные оракулы заданы в05; тесты ещё не выполнялись.
