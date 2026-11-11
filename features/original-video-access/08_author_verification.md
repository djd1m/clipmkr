# Авторская проверка и code/spec anti-drift

Реализация и авторские affected проверки завершены; source заморожен для originating independent SOURCE R2. Общий regression **FAIL**, а не полный новый green. Исправленные пять suites и финальный UI проверены отдельно. Независимое закрытие OQ-SOURCE-1…4, ручная приёмка и поставка остаются у root/reviewer/владельца.

Автор: отдельная сессия `original_video_code`, запрошена `gpt-6.1-sol high`; provider attestation недоступна. База `bb1184fe776da626a0039d1575dd75566aa2c086`. Это авторский отчёт, не QE/checkpoint receipt. Требования/ADR/approved mockups не переписаны; актуальные UI approval и root GO дополняют исторические pending записи.

## Снимки и authority

- Common source32 aggregate: `2ecde0c5fc62bd1dd47753a28cf58594be5f079a8a446cedeb2937cf66d9c309` (private frozen-code-before-common).
- После UI race:32 aggregate `fd22cac82e9b4603bdf90c71d414a2a9fbd80d87d04939c3b7e30d2eabc0b6a1`. От common изменены ровно OriginalSource.tsx и его browser test.
- Финальный77-path aggregate: `878fb7d6455bb1b3b5dabc8eeab36f2d35691ea58137a13c47c644438a5daad6`;23 editable/54 read-only. Сериализация — sorted-key compact JSON mapping; private `author/repair-r2/final-source-77.json` содержит каждый SHA. Это не native SOURCE digest.
- Maintenance: actual K2/root plan checkpoint и admitted manifest3ff95615…; свежий literal58566bytes полностью прочитан до шести W-правок, direct helper перед edit exit0/admitted/reasons[]. Existing base-ref сохранён.

Точные входы:

- `01_requirements.md` — `959179ee8f7a515535c4fdfec0ee99b6e4a0b2f040a580e638e169f2d2609ad9`.
- `03_adr/001-serve-original-through-owned-route.md` — `23c59360d4c9d93e9f72fb347561261921aae652de9457ac354064ee2aab9fbd`.
- `05_architecture.md` — `179fe241dcda4f1b14d4ff8a24bc09d991fc4b5f03c81e204f54dc8c74443a78`.
- `06_implementation_plan.md` — `692ae7cb2dabcdc309d959d61b54b6f4ffb4809f526d4698d6285114cd4b459f`.

OpenSpec `openspec/changes/original-video-access/specs/original-video-access/spec.md` SHA `87dd40a3cb7ae5975dd25385a01808137011cb2fe694b829ec8ce04ee35ac77f`. Accepted retention requirement SHA `272018e4f70f1495839a5faf3ca7f5a87285eb7200f04aab7c0c6faf795a0873`, migration028 SHA `2778ae56998e3d2581775b504ed0918f50aaf9296e7bb8fb3369c2aaa9ddbaa9`; политика и DDL не изменялись. Исследовательские HTML/PNG и approved states pins сохранены.

## Реальные commands/outcomes

Все gate runs Node22.23.4, N5_ACCEPTANCE=1, private isolated *_test PG/Redis14 и fenced Cloud.ru; name-filtered red/green diagnostics отдельно не объявляются полным gate.

| Команда | Фактический результат и граница |
|---|---|
| `npm test` (единственный общий) | exit1,1276.243s;166 suites=161 PASS/5 FAIL;1761 tests=1750 PASS/11 FAIL;0 skipped. На common source32 выше, до race/maintenance. |
| `npm test -- tests/enums.test.ts tests/clip-card.test.ts tests/landing-demo.test.ts tests/landing-demo.integration.test.ts tests/clip-music-review-fixes.test.ts` | Финальные W bytes: exit0,71/71,8.518s. Catch-all и прежние отрицательные guards сохранены. |
| `npm test -- tests/retention-policy.test.ts tests/retention-policy.integration.test.ts tests/s3.test.ts tests/s3-public-endpoint.test.ts tests/short-link.test.ts tests/guest-pack.test.ts` | Финальные W bytes: exit0,96/96,21.276s; actual PG retention и canonical signer/legacy callers. |
| `npm test -- --config vitest.browser.config.ts tests/browser/original-video-access.test.ts` | После финального UI race: exit0,25/25,83.007s; native Chromium/WebKit, geometry/states/error table/audio/canvas/hash; real Next E2E включён. Последующая дельта только registry metadata/tests; UI bytes совпадают с финальными. |
| Native Next case в этом file | Built Next + HTTPS proxy + actual login Secure HttpOnly cookie + real PG + fenced Cloud.ru; native MP4/seek/canvas/getImageData/download hash/filename/HEAD/206; own positive и foreign/anonymous404 с нулём новых storage calls; business snapshots неизменны. Не Vite API fulfillment доказательство. |
| `npm run typecheck` | Финальные bytes exit0,35.195s, workspaces и tests. |
| `npm run lint` | Финальные bytes exit0,1.991s. |
| `npm run build --workspace=packages/shared` | Финальные bytes, local dist exit0,2.113s. |
| `npm run build --workspace=apps/web` | После current shared dist, финальные bytes exit0,31.661s. |
| Исправленный retention browser locator | Chromium/WebKit2 cases прошли в red→green9/9 diagnostics до common; order/DOM identity asserts сохранены. Independent R2 промежуточно также проверил эти cases; это отдельная его provenance. |

Web build exit0 сохраняет warning BullMQ optional `@valkey/valkey-glide` module not found; он присутствует и в предыдущем race build, dependencies не менялись. Это не объявляется сборкой без предупреждений; configured Redis paths прошли common.

Во время всех прогонов source заморожен. После локальных исправлений повторялись affected suites; второй общий21-минутный запуск без нового широкого риска не выполнялся. Нельзя складывать эти результаты в утверждение «полный новый npm test PASS».

## Backend и provider evidence на неизменённых bytes

В common реально PASS original-file10, integration1, media-type2 и Cloud1. Native125s case дождался marker125000ms, downstream abort4ms и прежнего legacy120s negative control; это не fake clocks/16s ожидание. Отдельный focused lifecycle ранее13/13/131.541s, последний Cloud focused1/1/9.002s также сохранены. Runtime/helper/signers этих проверок после common не менялись; последующий SQL_ENUMS registry metadata не меняет readers/stream.

Cloud: реальный200/206/416 и Content-Range, download bytes/hash; пустой416 без XML/ложной Content-Length; первая test-only2s подпись действительно истекла403, следующий route Range получает свежую подпись. Использован existing liveS3Environment с client+signingClient binding/native fetch fencing, не MinIO. Собственные synthetic keys очищены; production media/accounts не использовались.

## Честная классификация common failures

Все11 воспроизведены на git-archive bb1184 в отдельной копии с тем же Node22/lock/private env;4 unit suites10 FAIL/50 PASS и PG integration1 FAIL/7 PASS, обе сессии terminal. Private `common-failure-matrix.json` содержит точные test IDs/expected/actual/source hashes; сам unchanged файл не служил доказательством baseline.

- ClipCard4: фиксированная сентябрьская положительная SSR-дата уже истекла при Date.now; будущая fixture восстанавливает фактический positive path без fake timers и ослабления actions/order.
- Music-review2: старые SELECT/lock shapes не достигали текущего durable claim/skip path. Обновлены только mocks; реальные prefix/sibling, no-quota/409 и adoption guards сохранены.
- Landing unit3 + integration1: старая3-дневная policy и signer wire ожидал прежние args; принятый контракт7 суток/absolute deadline. Integration post-migration fixture обязана задавать ready_at/provenance; unknown ready не является expired.
- Enums1: валидный catch-all обнаружил настоящий baseline metadata gap SQL_ENUMS для3 CHECK миграции028. Исправлен source registry, не whitelist;3 точные отрицательные мутации проверены прежним helper.

Первые private draft failures, исходный common FAIL и baseline counterproof сохранены. Dated legacy fixture validation: только read-only shape/hash/source от03.11.2026, SHA `3564ed34d808fa0130587628c58d43ef0a2827b5a805076305c06034e3e4f744`; использованный test проверяет исторический receipt contract. Это не свежие OOM/ENOSPC/network faults на сегодняшнем runner; они не вызывались.

## Structural repair и anti-drift

OQ-SOURCE-1: code4 сам не codec verdict; реальные503/404/429 вызывают ровно один bounded metadata recheck по таблице05; unsupported MOV проверен отдельно. Held recheck↔реальный5s uploading→rendering poll сначала дал native RED (лишний read/pending), затем GREEN в private copy и W. Последний settled-ready guard сохраняет текущую error check, genuine incomplete→ready transition остаётся рабочим. Старые generation/abort/active-media guards сохранены.

OQ-SOURCE-2: resume только текущей failed attempt/explicit retry, потребляется однократно; recovery position сохранена, Pause→Back/clip→Watch остаётся paused/один media. OQ-SOURCE-3: approved Cabinet tokens дают читаемые light/dark audio/error/unsupported states, >=4.5 computed contrast. OQ-SOURCE-4: actual retention locator с прежними geometry/DOM identity оракулами. Originating reviewer receipt не редактировалась; автор не объявляет эти conditions независимо закрытыми.

FR4/8: auth/ownership/active/deleted/upload gate до storage, real PG и native route negatives; credits/jobs/growth/quota не меняются. FR3/6/NFR2/4/5: same-origin URL, internal signature<=900, safe generated UTF8 filename, bounded abortable stream/Range, legacy signer contract сохранён. NFR3: first<=4096bytes count/cancel доказан real SDK HTTP overflow/ContentLength cases. Shared originalSourceRevision остаётся одним backend-only fixed v1 leaf; browser не импортирует Node crypto. Metadata не включена в5s list/get poll; единственный upload transition допускается по settled lifecycle.

## Cleanup, provenance и пределы

Каждый owned process дошёл до terminal; own schema/key cleanup выполнен, Redis не flush. Полные logs/receipts/screenshots и private runtime URLs/Node/build record находятся вне Git под private700/600. Подписи/credentials/source keys в публичные доказательства не перенесены. Commit/push/deploy не выполнялись.

Не доказаны historical source inventory, неизвестный source purge/retention, любые codecs, production proxy capacity и полная90–120min production сессия; small synthetic fixtures не заменяют эти измерения. SourceRevision — immutable upload identity, не content hash и не защита от внешней перезаписи. Ручная приёмка и окончательная independent SOURCE R2/root release остаются необходимыми.
