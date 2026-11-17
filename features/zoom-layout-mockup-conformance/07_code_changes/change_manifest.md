# Изменения реализации Zoom 01/02

17.11.2026. Код подготовлен, независимая перепроверка TASK-06 закрыла все восемь условий. Общий прогон итогового кандидата, сборка C1, изолированная проверка C1→C0, публикация и POST-APPLY приёмка ещё не выполнены. Этот документ не заменяет checkpoints или независимый QE.

## Реализация и переиспользование

- C0 `654361daf6b8cb9d276bc72477d5fc7b43f6c3be`: строгая вложенная композиция v2 только01/02, migration033 без изменения032, оригинальная геометрия на полном1080×1920, сохранениеv1/03 и published snapshot при music/CTA. Используются существующие parser/planner, PostgreSQL, FFmpeg и OpenCV.
- C1 UI `811e982f52073143ca87853823e1ecac52d2fa21`: явное обновление старого оформления, локальные01/02, независимая высота области02;03 остаётся стандартной. Используются существующие canvas, ROI-контролы и диалог подтверждения.
- TASK-06: чтение фактических отчётов, независимые original/UI/oracle pins, привязка образов и текущего VPS, проверка мутаций, ограниченный исполнитель выкладки и совместимого отката. Произвольный shell/host/DNS/Cloud не принимается.

## Трассировка требований

| Требование | Реализация и проверка |
|---|---|
| MC-01/02/03 | Раздельная геометрия v2, независимая fixture исходного HTML, native/canvas; финальный набор ещё предстоит |
| MC-04/05 | Согласованные дополнительные настройки,03 по умолчанию, явный upgrade и независимая высота; browser suite входит финальный набор |
| MC-06 | Версионные parser/PG/COALESCE, unchanged032, сохранение replay/music/CTA; отдельная C0 совместимость85PG+4целевых browser ранее выполнена |
| MC-07 | Существующие FFmpeg/timebase/detector и наложения; реальные native проверки запланированы на финальном образе |
| MC-08 | Fail-before-write, неизменные pins, bounded phase order и свежие evidence; ручная приёмка владельца отдельно |

## Фактический адресный прогон TASK-06

`npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=<private>`:59/59 PASS,0failed,0pending, exit0,60,12с; lint, source-only typecheck и три syntax checks — exit0. Это не общий прогон нового C1 и не runtime rehearsal. Полные PID/команды/время/raw reports сохранены приватно.

Используемый Vitest3.2.7 не выдаёт `numRuntimeErrorTestSuites`; отчёты не дописывались задним числом. Потребитель проверяет существующие counters/status/messages, terminal exit и доступные runtime markers. Новый mutation runner сохраняет default+JSON; неизменённый прежний framing runner JSON-only не позволяет отдельно удостоверить отсутствие дополнительных unhandled errors в RED. GREEN требует actual exit0.

## Границы

Сохранение общего файла использует тот же inode и восстанавливает только точно подтверждённую собственную незавершённую запись. Неизвестный результат записи, чужое изменение, постоянный I/O отказ или прерывание процесса требуют осмотра оператором; crash-atomicity не заявляется. На работающем прокси отказ не моделировался.

## Инвентаризация текущих targets

Измерено после исправления QER-03/04,17.11.2026; это рабочий снимок поверх `a6731d9`, до нового commit/build. Прежняя таблица сохранена в Git. Все33targets соответствуют текущему плану; три новых файла включены явно.

| Файл | SHA256 |
|---|---|
| `packages/shared/src/screen-layout.ts` | `b1425805279a487bc5ab5c49d57f6e69ceb1a4ca52eebfc97eacaeda644394f5` |
| `packages/db/src/clip-layout.ts` | `302a2ea3a63034ed758c5819ebd15daa66007670548609a02fe8a3235dbde59f` |
| `packages/db/src/render.ts` | `7dfcf9c7c430d0053e12b907c5e3f6e930093925d1212bbe6fcc8f7927cfe239` |
| `packages/db/migrations/033_clip_layout_composition_v2.sql` | `343f143c95a628df8d1bd69763b13e8ffd3d9528905275941a01aecfbb9cbcf0` |
| `apps/worker/src/render/screen-layout.ts` | `5870840a312e38ac3315e565985e752dffd4fb75f564ae38fd2bc6f56971142e` |
| `apps/worker/src/render/ffmpeg.ts` | `b61465c67ac7706193b19db2dceebd46348686143e2b519c486c263a67652b83` |
| `apps/worker/src/render/teaser.ts` | `4f3fbea003b002b340ff81c5face6e612f7d5299236fa479ff00064bf4c318ef` |
| `apps/worker/src/render/subtitles.ts` | `4a68ea93a4b4003407f88e516e22dd607bcde4922f48295336b9aa0d87f3f7cd` |
| `apps/worker/src/render/cta-overlay.ts` | `43ee2d30fd1939cc223bc723efddad3c2962ba68ab10ccd129dadf687dda5bcd` |
| `apps/web/src/lib/screen-contract.ts` | `d9b63401e7bde35f322173f95954268863e2c29924afa0bfd338cce8157f969b` |
| `apps/web/src/app/clips/ClipLayoutChoice.tsx` | `f336f1fa9b5241638cfe3fc4ade2f32b5496391db7c83e729e3ec0f5af0aed2e` |
| `apps/web/src/app/clips/ClipLayoutPreview.tsx` | `70e874aaaf1618bee27f4b94683b59d81bef3f2b47e0c74e954897b3fe8d62e2` |
| `apps/web/src/app/clips/clip-layout.module.css` | `b38d85f053c33db491232b4913a098bce4edc998fcae5f5cebd00c40851fa507` |
| `tests/screen-layout.test.ts` | `eea0fef692753024abc63cbe7c8be07f71a348eebd1936194583dfa0c731f692` |
| `tests/screen-layout-conformance.test.ts` | `b90cc67dd70622f0a04bc500d6e2aeddab6f4cc591b3e8b5760e9d70a7b58524` |
| `tests/fixtures/zoom-layout-original.json` | `539e37bf812b0ee22d7a88b6345241b85588aa48d6fc4c7dc669a171113949d2` |
| `tests/screen-layout-media.test.ts` | `1d4ce01ee63f3202b78b12f68e91ddebdaa87dabcc9bfb0cab6133203f085582` |
| `tests/clip-layout.integration.test.ts` | `041cfb8b2751e69fec9b1fccdd5d5a44651522bd74171174c3e270b13b5279e2` |
| `tests/clip-music-choice.integration.test.ts` | `3be9323344f2359933b2ec82760d9e931b032f290816a535f1d2a439ffc5d83f` |
| `tests/clip-cta-rerender.integration.test.ts` | `d27c52e295744bafae1c0447e3031f0b6aa2c558e3ab203e7c9b218fd280a4e8` |
| `tests/browser/clip-layout.test.ts` | `80e6337358500be295f109134759c769363912c1764ce25b2fdbaab1dced5bb5` |
| `tests/render.test.ts` | `a1e7dcc2c4221d37bfeaeeebb3c798ca22ff49682bff3c147c01580bc299416b` |
| `tests/teaser.test.ts` | `fc370e4a13bffc42128fe6b3e663227a927d989839607075ea79f5dd607cc7ab` |
| `tests/clip-cta-render.test.ts` | `217076630f1e9d84f3032e9c3ff787fc8bb28f8a7b9ffe2b4c18febeed528efa` |
| `scripts/check-zoom-layout-conformance.mjs` | `84f7da51fb3b234663edeccc9989a803fea31495e06a6a5ed1f1a461ce45892c` |
| `scripts/apply-zoom-layout-current-vps.mjs` | `ac1353cd8839fe07c1389a9fe4bee91203bda20a750529bc2cabedea9e7bdf09` |
| `tests/zoom-layout-release.test.ts` | `cd0c972e8f4a25ff4e39ed595c3b3836c701c44f68f00a6a12ed7caef8446b4f` |
| `scripts/test-zoom-layout-mutations.mjs` | `93c208a2106ac50b76d871180d5b7b196a4d3a4ca10bae54c9e783db4d378c24` |
| `tests/zoom-layout-framing-evidence.ts` | `571e1dacb8241ab26411bcbd96a4d13dac52f64ec673ef2202f3e74c502c5119` |
| `scripts/zoom-layout-database.mjs` | `1475da61999c55e8e49b9c86a3ae4511da1a7cfc1d481db3528c78e7f2e2633f` |
| `tests/zoom-layout-database-evidence.ts` | `2db29fdda35ddb18c20da44e9660a1b6eaac0dacf426642bf4cb24cce934c68b` |
| `tests/zoom-layout-database.integration.test.ts` | `a30fd8a7cd33d7fdd354306cc677f08681004d27356dac97bce132a6e244c67d` |
| `packages/db/src/migrate.ts` | `811b03ea40ec002f99c872744eb8a45410c5d5ad508d2395e23078b4b29ab7a3` |

## Проверка документов17.11

`npm run openspec -- validate zoom-layout-mockup-conformance --strict --no-interactive`: exit0. `npm run dz -- amendment-check --feature-dir /home/clipmkr/features/zoom-layout-mockup-conformance --json`: после исправления коллизии идентификатора в QCSD-отчёте exit0,7resolved. Первый отказ сохранён в журнале команд; не назывался PASS. Смысл QT-01 и утверждённый план не менялись, историческая нумерация объяснена в отчёте. Это проверка существования ссылок на tests, а не доказательство их невакуумности.

Адресная проверка оставшегося T06-07 на финальном снимке17.11: `npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=<private>` — exit0,64/64 PASS,0failed/0pending,65,94с. Lint, source-only typecheck, syntax — exit0. Известные промежуточные пары source/active допускаются только при остановленном связанном web и приводятся в CLOSED до drain; чужой drift и running web отвергаются. Это обновляет source-инвентарь выше, но не заменяет предстоящий общий прогон кандидата и origin verification.

Origin verification завершён: T06-01…08 закрыты по source review; это не formal QE и не runtime PASS. `npm run dz -- discrimination-check --test tests/screen-layout.test.ts --base 856c3ed --runner vitest --json --timeout 60000`: exit0,3,76с, measurementValid=true, DISCRIMINATES, baseline assertion failures6 из23 исполнившихся tests. `dz guard check --op code --json`: verdict pass, violations[], проверено no-skill-drift; signature-fresh not-established, это не полный guard PASS.


## QER-03/04: актуальное исправление DB выпуска

Фактическая выкладка `a6731d9` отказала до033: backup выбрал container default DB вместо app DB, а runtime мигратор получил42501 на CREATE журнала. Старый runtime18763 и исходный ingress восстановлены без восстановления/миграции БД. Предыдущие build/tests/review и failed attempt сохранены как отдельная история; они не считаются зелёным итогом новой ревизии.

Исправление использует existing explicit pg_dump и canonical migrate(pool): runtime SQL/DNS всех4services + отдельная admin qualification до pause/lock/state; actual app DB dump с SHA/TOC; admin secret только memory/stdin; ограниченный admin job и backend terminal evidence; runtime grants/env неизменны. Нормализуется host(inet_server_addr()); после planned stop сравниваются стабильные network/HostConfig bindings, recovery не запускает старое приложение ради чтения DSN. Типизированные результаты остаются secret-free/private. Макеты, геометрия, исходные pins и migration033 SQL не менялись.

Финальный адресный рабочий снимок: unit94/94 (все прежние79 сохранены),0skip,83,54с; realPG2/2,0skip,36,85с. RealPG использует actual native helper,4собственных transient runtime Node на существующем QE bridge, две собственные logical DB и restricted role; включает stopped runtime/recovery, synthetic native dump/restore, реальный restricted42501, canonical admin033/idempotence, prior journal/rows/grants/env. Ранние ошибки fixture mode и inet адреса сохранены; новый общий прогон ещё предстоит. Предварительный образ — неизменяемый `a6731d9`, текущий host helper; это не результат нового candidate image.

Lint, три syntax checks и diff whitespace — exit0. Host tests typecheck exit2: прежние diagnostics upload-file-identity.ts о недоступном @noble/hashes/sha2.js и unknown byte; в шести изменённых code targets новых diagnostics не выявлено, но это не полный typecheck PASS. Обязательный typecheck нового build ещё предстоит.

Root отдельно подтвердил native Docker endpoint changes after stop и nonzero child error-envelope transport, без остановки production; автор независимо исправил эти пути. Последующая actual live readonly qualification текущего VPS завершилась0 за3,81с с existing `a6731d9` image: реальные четыре runtime и admin соответствуют app DB/cluster, prior journal33entries through032,033 отсутствует. Ни pause, ни backup, ни migration, ни runtime writes при этом не выполнялись. Это предварительный факт о текущем окружении, не замена встроенной свежей qualification финальной выкладки.

Независимый code critic, native QE cycle3, новый immutable commit/build/common suite и выпуск текущего исправления пока PENDING. Cloud/DNS не меняются. Code/spec anti-drift: FR-ZOOM-DB-001→qualification/pre-pause negatives;002→actualDB native dump/own-fixture restore;003→canonical admin033/preserved runtime;004→timeouts/SQLSTATE/terminal owner evidence. MC01–08/original oracle остаются прежними.

Перед native QE bound snapshot дополнен неизменённым canonical migrate.ts (33targets); host helper code не менялся. Предварительная actual live qualification завершилась0/3,81с; свежая qualification внутри исполнителя остаётся обязательной.
