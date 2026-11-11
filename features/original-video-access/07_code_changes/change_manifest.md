# Изменения доступа к исходнику

Автор: отдельная сессия `original_video_code`, запрошена `gpt-6.1-sol high`; провайдерская attestation не получена. База: `bb1184fe776da626a0039d1575dd75566aa2c086`. Это описание кода, не checkpoint, независимое QE или разрешение поставки.

## Создано — 11 файлов

- `apps/web/src/server/original-file.ts` — ownership/active/upload gate, metadata, HEAD, безопасные inline/attachment и пустой 416.
- `packages/shared/src/server/original-source.ts` — единственный backend-only v1 revision helper для web и Zoom worker; без browser/root barrel export.
- `apps/web/src/server/original-runtime.ts` — привязка существующих auth, pool, rate-limit, S3 и stream seams.
- `apps/web/src/app/api/videos/[videoId]/original/route.ts` — динамические GET/HEAD.
- `apps/web/src/app/videos/[videoId]/OriginalSource.tsx` — строка исходника, metadata budget, viewer portal, native media, остановка/выгрузка и явный retry.
- `apps/web/src/app/videos/[videoId]/OriginalSource.module.css` — согласованные source states, адаптивные размеры и темы.
- `tests/original-file.test.ts` — ownership/lifecycle/DTO, bounded SDK transport, native 125 секунд + legacy 120 секунд, GC/cancellation и приватность 416.
- `tests/original-file.integration.test.ts` — настоящая PostgreSQL schema, own/foreign/owner/inactive/deleted/unknown и отсутствие изменений бизнес-данных.
- `tests/original-media-type.test.ts` — контейнеры, malformed signatures и прежний upload boolean contract.
- `tests/original-cloudru.test.ts` — fenced Cloud.ru, 200/206/416, hash, реальное истечение короткой подписи, свежий следующий Range и cleanup.
- `tests/browser/original-video-access.test.ts` — native Chromium/WebKit, DOM/selection/focus, zero/late clips, real transport failure, state matrix/reference geometry/hover contrast; отдельный built Next + HTTPS cookie + PostgreSQL + Cloud.ru E2E.

## Изменено — 12 файлов

- `apps/web/src/server/guest-file.ts` — optional headers deadline; прежний default полного transfer 120000 мс сохранён. Один bounded native stream lifecycle удерживает сам Request, явно отменяет upstream, завершает body с ошибкой при deadline и освобождает timer/listener/reader.
- `apps/web/src/server/media-type.ts` — `detectOriginalMedia` переиспользует неизменённый `isAllowedMedia`.
- `packages/s3/src/operations.ts` — optional `maxBytes` для existing `getObjectBytes`; прежний путь без лимита сохранён.
- `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` — source mode в прежнем clip-grid; ClipCard nodes, selected ID, contextHost и mutation anchors сохранены.
- `vitest.config.ts` — exact source alias shared server leaf.
- `tests/browser/ux-simplification.test.ts` — по AM-8 добавлен existing hook `usePathname` в navigation stub и исправлен locator на принятый «Доступно до»; order/DOM identity/assertions и guards сохранены.

- `packages/shared/src/enums.ts` — только три отсутствовавшие записи SQL_ENUMS принятой миграции028; readers, exports, бизнес-статусы и сама схема сохранены.
- `tests/enums.test.ts` — прежний catch-all/legacy список сохранён; добавлены различающие мутации трёх retention CHECK.
- `tests/clip-card.test.ts` — валидная будущая SSR-дата без fake timers и изменения ожиданий действий.
- `tests/landing-demo.test.ts` — принятые7 суток, точная граница; настоящий canonical signer получает absolute deadline и соблюдает TTL.
- `tests/landing-demo.integration.test.ts` — post-migration ready_at/provenance и соседний expired клип через8 суток в собственной PG schema.
- `tests/clip-music-review-fixes.test.ts` — реальные SELECT/lock shapes; сохранены отрицательные prefix/skip/quota/adoption оракулы.

Удалений нет. Нет новых dependencies, сервисов, очередей, persistent schema/env, конвертации, retention/payment изменений. Signer `presign.ts`, shared root barrel, 54 read-only measurement dependencies и согласованные research HTML не изменены. План/authority обновлял root, не автор кода.

## Переиспользование и потребители

Переиспользованы existing session cookie, AuthService/PgAuthStore, clientIp/allowRead, owned SQL pattern, S3 client namespace, HEAD/bytes/signer и streamGuestFile. Нового signer или auth протокола нет. Web импортирует shared helper только с server subpath; это согласованный контракт будущего Zoom consumer, его код в другом worktree не менялся. Legacy clip/guest/showcase signer байты и API не переписаны.

Текущая write authority: финальный06 AM-8…12 — 23 editable / 54 read-only при77 измеряемых code paths. Новых runtime export/module names после исходного K1 нет. Root-amended06 SHA `692ae7cb2dabcdc309d959d61b54b6f4ffb4809f526d4698d6285114cd4b459f`. Current pre-maintenance admission реально admitted exit0; `manifestDigest=3ff95615cfb3fc3c4b9bd9d8f11a1c104cf40c4edb2ec3ae933baddc1e0f540d`.

## Structural repair SOURCE R1 → R2

OQ-SOURCE-1: initial native HTTP503/404/429 не объявляется codec failure по одному code4; один metadata recheck применяет таблицу05. Сохранено подтверждённое native unsupported MOV. Последняя гонка held error recheck↔реальный5s uploading→rendering poll устранена guard последнего подтверждённого ready: stale переход не отменяет уже нужную проверку; настоящий incomplete→ready переход продолжает работать.

OQ-SOURCE-2: resume принадлежит текущей failed attempt и однократно потребляется explicit recovery; Back/clip/обычный новый Watch очищают его. OQ-SOURCE-3: текстовый frame использует согласованные Cabinet surface/ink, media background сохраняется; light/dark контраст проверен. OQ-SOURCE-4: только актуальный retention locator, без ослабления геометрии/identity. Это авторское описание исправлений, не независимое закрытие условий.

Общий regression оставлен FAIL:161 suites/1750 tests PASS и5 suites/11 tests FAIL. Все11 воспроизведены на bb1184; десять — старые fixture assumptions, один — реальная неполнота SQL_ENUMS metadata. Narrow maintenance выше прошёл в W71/71; affected callers96/96. UI после race25/25. Общий прогон не повторялся и не переименован в полный новый green.

## Exact final code measurement

77-path sorted-key compact JSON mapping SHA256 `878fb7d6455bb1b3b5dabc8eeab36f2d35691ea58137a13c47c644438a5daad6`; полная private карта `author/repair-r2/final-source-77.json`. Это авторский aggregate, не native SOURCE revision/manifestDigest. Ниже23 editable file SHA; остальные54 побайтно сохранены.

| Editable path | SHA256 |
|---|---|
| `apps/web/src/server/original-file.ts` | `8cfebd098173ef9a38eab2d45181901a48efb695fef1f3975d6d6ad2198e75b1` |
| `packages/shared/src/server/original-source.ts` | `9455c5460e579a68aa6f0bfa16b57ec28ea3a19db29df13ce4a586c4e3fbf502` |
| `vitest.config.ts` | `85b1179e6a15ca62bd8d83b9ef29fef64acd8d236fe60f8acada45ff44a736f7` |
| `apps/web/src/server/original-runtime.ts` | `2589c4ce7bbb6570ca4f06b09af6735d1f376a6b6586612ba43ad1f03250f95f` |
| `apps/web/src/app/api/videos/[videoId]/original/route.ts` | `7ec1a97f36c845eeb806697a7c533424abb2a65f9c7446447c69b7cf8cc3223c` |
| `apps/web/src/server/media-type.ts` | `a88588ccc38d774ec75ddf3819a213e9b75805e6debe910730695c403370e04b` |
| `packages/s3/src/operations.ts` | `5402a9862abd53119d9faf05cc367cdc31c23af80bbe82e32a27f1c5b6b772b5` |
| `apps/web/src/server/guest-file.ts` | `0a823b638bf6f5244e2f7ea6c9abd6017c095e7463d0b63047680aeae52308ec` |
| `apps/web/src/app/videos/[videoId]/OriginalSource.tsx` | `4fc57f0ac98e2953e6c2228836539d904e40c98ddb4dc97faf31a3155e7572e3` |
| `apps/web/src/app/videos/[videoId]/OriginalSource.module.css` | `1168c60377bdfa9881db464670de18399230700d0af6b05d69d4d452a4b56faf` |
| `apps/web/src/app/videos/[videoId]/VideoDetail.tsx` | `80031dfc619466da8aaaa036f27bea50faf9a4f34629731056473c554185b4d2` |
| `tests/original-file.test.ts` | `d9048aaf0a4120e0660dc1df1e63d61850eb54d996cb90cd434fbc009a192df3` |
| `tests/original-file.integration.test.ts` | `86735235dd044555d6bad204f2925e8a28df2126c75b4123f935c43f514af8c3` |
| `tests/original-media-type.test.ts` | `9b6755864190440e9443ffbc30f2e91ade48db11f57201b7aacf33a4e453b47d` |
| `tests/browser/original-video-access.test.ts` | `756790b0ac335b4c3553fef06a0646a6ca135edfa06957c5be4fa2d5656dc8dd` |
| `tests/original-cloudru.test.ts` | `0cd76f9920b03e1d2cb775ece6c4de20c8314b0027c8485bc4ded539e57067df` |
| `packages/shared/src/enums.ts` | `e899a5f54d71104e75810fff5e8f9e32a98ffdba2f95b00910b4b1100365d85c` |
| `tests/enums.test.ts` | `23bff85e98dcfd87264348bef42ec00eda6b82d90b41e5a9db329427897b31cd` |
| `tests/clip-card.test.ts` | `84d3c691777f81fa8f5b6633c110cc03a744fc8ca6b898987dd42e0458bd541a` |
| `tests/landing-demo.test.ts` | `be1cccf5e8f8a06ad64176bf59dc0cd3121f2b5e542e258bdcb4ba805933ae44` |
| `tests/landing-demo.integration.test.ts` | `fc5d4b788452ac185d287d51d81ce991a022031fd8304756b41dd83e448eb6ae` |
| `tests/clip-music-review-fixes.test.ts` | `b389d4fa9ce56be5e5beab6a192454265c07728361c82a4b4983ab12d963e2d1` |
| `tests/browser/ux-simplification.test.ts` | `d2c08123e67df6a5e228b8b3c401ed2a57f423336f4eeda25a4dab7c8f2a7308` |
