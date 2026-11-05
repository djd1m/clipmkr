# Реализация ограниченного восстановления передачи

Дата: 04.11.2026. Writer: отдельный worktree
`/tmp/clipmkr-upload-recovery-impl-20261104`, ветка
`fix/upload-transfer-recovery-20261104`. Это авторская ведомость кода и проверок,
не независимое QE, receipt этапа или разрешение на выпуск.

Основание: существующее закрытие ideation, разрешённый план L и K1/K2. При входе
повторно выполнены установленные `check-code-targets.mjs` (`admitted`, exit0) и
`build-coder-context.mjs --tier=L` (`complete`, exit0). Требования/ADR/план не изменялись.

## Состав

Исходный helper/scope commit `2dce8d1` содержит package/lock, полный SHA-256 по 4MiB,
strict account-scoped manifest v2, pre-transaction `account_scope` и их unit tests.
Он уже передан координатору. В этом продолжении дополнительно согласовано с текущим
create-контрактом обрезание краевых пробелов имени: иначе допустимое сервером имя
ошибочно блокировалось как невозможность сохранить cache. Новый regression был RED.

- `apps/web/package.json`, `package-lock.json` — точный `@noble/hashes@2.4.0` из исходного helper commit.
- `apps/web/src/lib/upload-file-identity.ts` — полный bounded hash из исходного commit.
- `apps/web/src/lib/upload-resume.ts` — strict v2/readback/compare-before-remove; filename следует нормализации create.
- `apps/web/src/server/upload-contract.ts`, `apps/web/src/server/video.ts` — исходный scope precondition; count/HEAD dependency повторно не реализовывалась.
- `apps/web/src/app/upload/Uploader.tsx` — один React instance, отдельный hash и Continue, immutable options/key, durable checkpoints до create/PUT/Complete, retry сохранения, generation/mounted/signal fences, native navigation guard, focus/status/alert.
- `apps/web/src/app/dashboard/page.tsx` — доверенный scope и ограниченный recovery query intent.
- `apps/web/src/app/videos/VideoList.tsx`, `apps/web/src/app/videos/[videoId]/VideoDetail.tsx`, `apps/web/src/server/screen.ts` — uploading без detail Link, ложного server progress и stale; recovery action с существующим классом button. Commit `36c7290`.
- `tests/upload-file-identity.test.ts`, `tests/upload-resume.test.ts`, `tests/upload.test.ts` — identity/cache/scope boundaries, filename compatibility и отрицательные ресурсные spies.
- `tests/progress-screen.test.ts`, `tests/browser/video-screen.test.ts` — uploading/прочие стадии, recovery action и существующий responsive regression.
- `tests/browser/upload-lifecycle.test.ts` — реальные File/sessionStorage/React lifecycle, create/PUT/Complete barriers, native dialogs, chooser, storage retry, late response/account change, actual VideoDetail с fixture video.get, 64MiB bounded reads/heartbeat, keyboard/axe/200%.
- `tests/music-uploader.test.ts`, `tests/teaser-uploader.test.ts`, `tests/compaction-uploader.test.ts`, `tests/pack-shot-uploader.test.ts`, `tests/clip-cta.test.ts` — сохранены продуктовые assertions; переход на scope/v2/асинхронный выбор без legacy auto-resume.

Новых DB/endpoint/services/контейнеров нет. Все 22 runtime/test targets плана покрыты
исходным helper commit и этим продолжением. Размещение основного CTA перед options
принадлежит отдельному writer и здесь не интегрировалось.

## Проверки и доказательства

Node: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`; его каталог первым в PATH.
Все локальные unit/browser команды выполнялись без `DATABASE_URL` и `REDIS_URL`.
Сырые логи и изображения находятся вне Git:
`/root/.config/clipmkr/release-parity-20261103/upload-implementation-next/`.

- Focused: `npm test -- tests/upload.test.ts tests/upload-file-identity.test.ts tests/upload-resume.test.ts tests/progress-screen.test.ts tests/upload-browser.test.ts tests/upload-fix.test.ts tests/music-uploader.test.ts tests/teaser-uploader.test.ts tests/compaction-uploader.test.ts tests/pack-shot-uploader.test.ts tests/clip-cta.test.ts tests/upload-completion-integrity.test.ts` — 12 files, 141 PASS, exit0 (`focused-handoff.private.log`).
- `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/video-screen.test.ts --reporter=verbose` — 46 PASS, exit0 (`video-screen-final.private.log`). `N5_SCREEN_ARTIFACT_DIR` направлен в приватный каталог; исторические tracked screens не переписывались. Новая recovery action сначала дала R2 RED в обоих движках и темах.
- `npm run build` — exit0 (`build-release.private.log`); сохранено предупреждение существующего optional BullMQ import `@valkey/valkey-glide`.
- `npm run typecheck` — exit0 (`typecheck-handoff.private.log`).
- `npm run lint` — exit0 (`lint-release.private.log`).
- Lifecycle: `node node_modules/vitest/vitest.mjs run --config vitest.browser.config.ts tests/browser/upload-lifecycle.test.ts --reporter=verbose` — 60 PASS, exit0 (`browser-final.private.log`), Chromium и WebKit без skips, page errors и HMR. Native reload реально проверен на hash/create/PUT/Complete, dismiss и accept — разные активные попытки. До последнего расширения также был baseline 56 PASS (`browser-full-second.private.log`).
- Полный `npm test` выполнен, exit1 (`full-unit-finish.private.log`): 105 files PASS / 11 failed / 31 skipped; 1126 tests PASS / 19 failed / 340 skipped. Не GREEN: отсутствовали host `ffmpeg`/`ffprobe`, из-за этого упали media suites и зависимые timeout/abort assertions. БД/Redis suites пропущены из-за отсутствия настроек. Координатор отдельно готовит prerequisites и общий regression; повтор здесь не выполнялся.

Vite fixture теперь игнорирует `.next` и `dist`: предыдущий параллельный build вызывал
непреднамеренные HTML HMR reload. Это исправление тестовой изоляции, не ослабление assertions.
Локальный router adapter размонтирует настоящий Uploader и монтирует настоящий VideoDetail;
`next/link` в Vite представлен native anchor. Эти проверки не доказывают опубликованный Next
router, S3/CORS, paid pipeline, физические устройства или screen reader.

Девять точечных author mutations дали ожидаемый assertion RED: `sample_hash`,
`permissive_parser`, `remove_account_scope_precondition`, `restore_uploading_list_link`,
`remove_server_stale_exclusion`, `remove_local_stale_exclusion`,
`remove_beforeunload_registration`, `remove_await_fence`, `silent_full_parts_save`.
Каждый исходник восстановлен в `finally` побайтно; команды, exit1 и restored SHA-256
записаны в приватном `author-mutations.private.json`, сырые отдельные логи рядом.
После восстановления focused 141/141 и три исходных Chromium acceptance tests повторно GREEN (exit0, `browser-post-mutation-green.private.log`; остальные 57 cases отфильтрованы только в этом повторе).
Это discrimination sample, не независимое QE или общий mutation score.
Отдельный unit наблюдает реальный VideoDetail→ProgressPanel projection: ранний neutral
return панели иначе скрывает ошибочное локальное `no_response` в готовом HTML.

Скриншоты fixture uploader на 375 и 1440 сохранены приватно для обоих движков;
автор просмотрел Chromium изображения. Это не ручная приёмка владельцем и не снимки
опубликованного dashboard. Известное размещение CTA после options передано отдельному writer.

## Незавершённые внешние этапы

Независимый cross-model QE/fleet, anti-drift closure, безопасная интеграционная БД/Redis/S3,
проверка HTTPS stage, ручная приёмка владельцем и доставка остаются у координатора.
Авторские проверки не заменяют эти этапы. Cloud/DNS/paid providers не вызывались.
