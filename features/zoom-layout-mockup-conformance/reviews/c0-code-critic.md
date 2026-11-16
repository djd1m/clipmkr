# Независимое code-critic ревью C0

16.11.2026. **Обнаружены два MEDIUM-дефекта новых тестов и один MEDIUM-пробел обязательного подтверждения rollback. HIGH/BLOCKING-дефектов runtime в исследованном C0 diff не обнаружено. C0 пока нельзя объявлять проверенным rollback artifact.** Это проверка промежуточной совместимости, не финальный QE, разрешение выпуска или приёмка C1.

Запуск: requested model `gpt-6-astra`, reasoning `xhigh`, `fork_turns=none`; отдельная сессия `/root/conformance_c0_critic`. Эти параметры явно заданы launcher по подтверждению координатора. Launcher сообщил canonical task, UUID не сообщил; внутренний provider model ID инструментами этой сессии не раскрыт. Автор назначен `gpt-6.1-sol high` по матрице проекта. Авторские отчёты, прежние ревью и coding history не читались. До FREEZE прочитаны только согласованные входные документы и структура; после FREEZE код и тесты найдены самостоятельно. Подагенты не запускались.

Проверенная ревизия: HEAD `49101377d1a1f06a72043480a15155b21ce31f2b` плюс незакоммиченный C0 diff. SHA256 вывода `git diff --binary HEAD`: `57e2796f5a27586198d013823aa4f0d39b46a47347b0f181e63337ef674e5bcf`. Этот hash не включает untracked-файлы; их вместе с остальными 24 файлами связывает root snapshot `c0-freeze-final.json`, SHA256 `b45b07c16194d33d718db288e97063bc6ca6b71c45017d9afa48477e87998698`, приватный каталог `/root/.config/clipmkr/zoom-conformance-implementation-20261116/`. В начале и перед составлением отчёта самостоятельно сверены все 24/24 hashes: расхождений нет. Отчёт не меняет проверяемый product/test snapshot.

Первичные входы: `AGENTS.md`, `docs/model-matrix.md`, `docs/review-policy.md`; внутри `features/zoom-layout-mockup-conformance/` — `01_requirements.md`, `03_adr/001-original-composition-compatibility.md`, `05_architecture.md`, `06_implementation_plan.md`, `owner-approval.md`, `03_typography_qualification.md`. Метод: `/home/product-studio/.agents/skills/code-critic/SKILL.md`, SHA256 `7705b43e0dee1c70d913139fa57b1fba6a60aba29ead71a762c85def4a9aadae`. После FREEZE дополнительно прочитаны `CLAUDE.md`, `docs/acceptance/core-cjm.md`, применимые правила и исполняющие consumers. Общих `architecture/vision.md`/`architecture/degradations.md` здесь нет; продуктовые границы взяты из feature ADR/архитектуры и AGENTS.

В процессе координатор предоставил сырой JSON своего завершённого PG-прогона на этом snapshot. Прочитаны assertion results, а не авторский вывод о PASS: `c0-pg.vitest.private.json`, SHA256 `03e80578b3c557cd7fc267aa25c18976316ac28f064915c4fd0832e140dc0a75`. Координатор сообщил terminal exit 1, 61 passed / 1 failed; конкретное падение независимо сопоставлено с кодом фикстуры ниже. Перед завершением также прочитан сырой `c0-native.private.log`, SHA256 `b089194c63b438a6bed0a93acc7dab383c8485f6ff60549d3635140484310829`: 18 passed / 1 failed, 19 cases, duration 79.91s. Проверяющий тесты, lint, typecheck, build, FFmpeg и deployment не запускал. После чтения обоих результатов повторно проверены freeze hashes: 24/24 совпадают, HEAD и tracked diff hash прежние.

## God-object growth (BLOCKING)

Нарушений нет. Все затронутые product-модули ниже 700 строк; наибольший — `ClipLayoutChoice.tsx`, 268 строк. Новых больших агрегирующих модулей нет.

## Security violations (BLOCKING / HIGH)

Новых нарушений не обнаружено. Union проходит прежний strict parser на API/JSON границах; версии не приводятся из строк. Publication продолжает сравнивать canonical requested, включая version. Изменений auth, quota, locks, retention, signed URL или S3 publication нет.

## Architectural concerns (HIGH / MEDIUM)

Нарушений в C0 diff не обнаружено. Использованы существующие parser, contain, FFmpeg graph, subtitle/teaser/CTA helpers; v1 и v2 выбираются явно. Новых сервисов, зависимостей, таблиц или параллельной системы типографики нет.

## Anti-pattern violations

Новых подтверждённых нарушений не обнаружено. Новые I/O, фоновые операции, retry, env knobs и самостоятельные транзакционные границы не добавлены.

## Type / contract issues

Подтверждённых runtime-нарушений не обнаружено. `ScreenFaceLayoutV2` допускает 01/02 и `focus:null`; v2+03 и неизвестная версия отвергаются. Внешний published envelope остаётся version 1. V1 canonical key order и алгоритм сохранены; коррекция нормализованной pixel boundary включена только для v2. `getRenderInput`, publication, UI envelope и render options используют union без implicit upgrade.

## Edge-case sweep

Проверены по коду и существующим/добавленным тестам:

- Пустые/неполные JSON, лишние ключи, неверные версии/ROI — parser отвергает; миграция применяет внешний `IS TRUE`.
- No-camera, odd dimensions, tiny edge, SAR fallback — отдельные ветки planner; v2 screen slot не зависит от наличия камеры. Native вывод использует полный canvas.
- Конкурентные apply/replay, удаление/чужой account, stale publication — сохранены канонические транзакции/locks/fences и существующие проверки; код новых обходов не добавляет.
- Restart/потерянный ответ — envelope сохраняет submitted snapshot/key отдельно от draft; для обязательного submitted **v2** остаётся пробел подтверждения C0-03.
- Version skew — оба nested versions читаются; migration033 не переписывает rows. Rollback на pre-v2 binary остаётся запрещён ADR.
- Большие коллекции не добавлены: request содержит фиксированное число ROI. Условие «>300 items» неприменимо к новому пути.

Это статическая проверка покрытия и путей, не утверждение о выполнении всего списка.

## Test quality

### C0-01 — MEDIUM: native/canvas test завершается до pixel assertions

Файл: `tests/browser/clip-layout.test.ts:130–134`, особенно строка 131. Принцип: тест должен достигать проверяемого поведения, MC-03 и AM-4. Оба новых случая `v2_native_and_canvas_cover_original_composition_extents` передают `-filter_complex <graph> -map [screenout]`, затем `-vf crop=...` для того же выходного потока. FFmpeg запрещает одновременно simple и complex filtering одного output, поэтому subprocess прекращается до получения `native` pixels и сравнения с canvas. Диагностическая строка этого запрета также найдена read-only в установленном `/usr/bin/ffmpeg`: `Simple and complex filtering cannot be used together for the same stream.` Сам subprocess в этой сессии не исполнялся; ошибка не объявляется наблюдённым runtime-дефектом приложения.

Направление исправления: присоединить crop к существующему complex graph и map его конечный label либо измерять уже отрендеренный файл; сохранить реальные pixel assertions и прогнать оба viewport case.

### C0-02 — MEDIUM: JSON null в mixed CTA fixture не представляет legacy SQL NULL

Файл: `tests/clip-cta-rerender.integration.test.ts:64–66`. Принцип: интеграционная фикстура должна представлять настоящий persisted contract, MC-06 / TASK-03. Шестой элемент `snapshots` равен `null`, но `JSON.stringify(snapshots[i])` передаёт строку `"null"`. PostgreSQL записывает JSONB null; неизменный `clip_rendered_layout_shape` разрешает SQL NULL или объект, поэтому отвергает строку ещё до `setWatch(f)`. Обязательная проверка mixed v1/v2/03/legacy CTA не достигает пересборки и не доказывает сохранение версий. Сырой результат реального PG-прогона координатора подтверждает ошибку `clip_rendered_layout_shape` в этой строке. Это дефект тестовых данных, не свидетельство неисправной migration033 или product CTA.

Направление исправления: для отсутствующего snapshot передавать параметром SQL NULL; сериализовать только непустые envelopes. Повторить этот integration suite на исправленном snapshot без ослабления CHECK.

### C0-03 — MEDIUM, пробел подтверждения: submitted v2 replay не проверен в rollback UI

Файлы: `tests/browser/clip-layout.test.ts:103–115`; `apps/web/src/app/clips/ClipLayoutChoice.tsx:177–194,229–256`. Принцип: conformance согласованному плану P6 и version-skew sweep F6. ADR и раздел поставки плана требуют от C0 отображать сохранённый v2 **и повторять pending submitted v2** после отката. Новый browser replay case явно создаёт `submitted.layout.version:1`, сохраняя лишь draft как v2. Другие новые browser cases проверяют published v2 без submitted; новый real-PG v2 replay case выполняется после successful publication и не проходит UI/sessionStorage. Следовательно, обязательный сценарий «C1 сохранил неизвестный submitted v2 → C0 reload → точный повтор старого v2/key без нового producer» пока не подтверждён. По чтению `apply()` сохраняет исходный submitted; наличие runtime-ошибки здесь **не утверждается**.

Направление исправления: добавить и выполнить отдельный C0 case с неизвестным submitted v2, reload, сохранёнными canonical body/key и отключённым редактированием; связать повтор с существующим backend replay без повторного debit/job. Не подменять его новым v2 producer или полным C1 UI.

## Process / done-ness gaps

C0 ограничен compatibility artifact. Отсутствие C1 upgrade/height controls, release guard, финального QE, VPS QA и ручной приёмки не записано как дефект частичного C0. Полный release не объявлен.

**Непройденная обязательная native-проверка, причина пока не установлена:** в реальном прогоне координатора `v2 native original extents and every live camera frame survive full-canvas composition` остановился на `tests/screen-layout-media.test.ts:319`, внутри `samePixels` строки 52: наблюдаемая разница канала 6 при пределе 4. Это сравнение screen pixels с исходным маркером; лог не сообщает конкретный variant/point/frame/channel. Данных недостаточно, чтобы приписать отказ production geometry, интерполяции или фикстуре. Нельзя объявлять original native conformance пройденным либо повышать tolerance без диагностики. Остальные 18 native cases в этом сыром логе прошли, включая real overlay bbox, cut-plan/subtitle/title/CTA/watermark и odd/SAR fallback; их успех не закрывает отказ original-extents case. Это наблюдаемый незакрытый результат gate, не отдельный доказанный runtime bug и не авторский PASS.

Проверка согласованных решений по C0:

| Решение | Статус по чтению snapshot |
|---|---|
| Strict union v1/v2, v2 только 01/02 + null focus | Реализовано |
| Сохранить v1 canonical/geometry, 03, legacy null | Реализовано; изменения веток v1 не обнаружены |
| Migration033, immutable032, без UPDATE/backfill | Реализовано |
| Envelope1 + nested union; publication equality различает version | Реализовано |
| Music/CTA сохраняют published version и старые keys до публикации | Consumers сохранены; CTA подтверждение блокирует C0-02 |
| Full-canvas native/preview, один источник/timebase | Реализовано; browser/native подтверждение блокирует C0-01, original native case также не прошёл — причина открыта |
| Qualified v2-02 overlays; прежние defaults у v1/01 | Реализовано; параметры совпадают с qualification |
| Saved v2 readonly + notice, без UI producer v2 | Реализовано |
| Pending/unknown submitted v2 после rollback | Код повторяет submitted; обязательное подтверждение отсутствует, C0-03 |
| Original oracle независимо от production planner | Fixture соответствует original CSS; original Git SHA проверяется тестом |
| C1 writer/UI, mutations/guard, image build, rollout/owner acceptance | Отложено согласованным разделением C0/C1; вне этого review |

Локальные исправления должны получить новый snapshot, затронутые реальные проверки и независимую проверку diff исправлений. Этот отчёт не переносит результаты прежней ревизии на будущий изменённый C0.

## Production safety

Migration032 сохранена: SHA256 текущего файла и HEAD одинаков — `23f93ca25da73cf2e69d4dab1ab321d922326acf9de1bdf03cb0439f679f182b`. Migration033 меняет только названный intent CHECK; штатный migration runner сохраняет transaction/advisory lock/journal checksum. Нормализации или backfill нет. Preflight аномальных данных, реальный C0 image и C1→C0 isolated rollback ещё требуют доказательств соответствующего этапа; статическое чтение их не заменяет. Runtime/БД/S3/Cloud/DNS этой сессией не менялись.

## Suggestions only (LOW)

Нет.

## Open questions for the parent

Нет дополнительных требований вне согласованного C0. Закрыть C0-01…C0-03 перед заявлением о проверенной совместимости.

## Skipped checks (transparency: what you intentionally did not check, why)

- Тесты/lint/typecheck/build/native/browser execution не запускались: это прямое ограничение метода code-critic. Из внешнего исполнения исследованы только предоставленные сырые PG assertion JSON и native log; остальные прогоны не объявляются PASS.
- Не прочитаны авторские success reports, прежние reviews и stage receipts как доказательства реализации. Не проверялась история approval gates заново.
- Не выполнялись release/mutation guard, развертывание, DB preflight, backup, image binding, реальные QA-клипы или визуальная приёмка: они относятся к последующим C1/release этапам.
- Не проверялись заново payment/STT/полная загрузка 90/120 минут: их продуктовые пути этим diff не меняются.
- Полный аудит неизменённого репозитория, конфигурации инфраструктуры и всех Unicode glyphs не выполнялся. Проверены все изменения C0 и необходимые consumers/старые guards; bounded typography qualification не выдана за универсальное доказательство fit.
- Команда `strings` недоступна; диагностические строки FFmpeg затем прочитаны непосредственно из бинарника Python без запуска FFmpeg. Ошибки `rg` для предполагаемых DB filenames устранены чтением фактических service consumers; отсутствующие файлы не считались проверенными.

## Адресная проверка исправлений первоначальным reviewer

16.11.2026, та же независимая сессия `/root/conformance_c0_critic`, requested `gpt-6-astra xhigh`. Scope этого дополнения: C0-01/02/03 и достоверность исправления упавшего original-extents native case. Новый широкий цикл ревью не проводился; product runtime, deployment и полный QE не объявляются проверенными.

**C0-01, C0-02 и C0-03 закрыты на новом snapshot. Найден один MEDIUM-дефект исправленной native-проверки, C0-04: отрицательная проверка выхода screen за границы перестала отличать новый серый screen от фона. Поэтому подтверждение native original extents пока остаётся открытым.** Исходный текст выше сохраняет результаты первого snapshot и не является текущим статусом трёх закрытых замечаний.

Новый snapshot `c0-fix-freeze-final.json`, SHA256 `9e63f81f1373356dd6413d7563ce893c476a7c78f6d004d009a549c25d70a00d`; HEAD по-прежнему `49101377d1a1f06a72043480a15155b21ce31f2b`, SHA256 `git diff --binary HEAD` — `ebaef57c53a782b2f48d349346f6aac62cfc65f1cc5f7c1c76655af801e6b4a6`. Самостоятельно сверены 24/24 hashes в начале и перед дополнением, drift отсутствует. От первоначального snapshot отличаются только четыре test files: `tests/browser/clip-layout.test.ts`, `tests/clip-layout.integration.test.ts`, `tests/clip-cta-rerender.integration.test.ts`, `tests/screen-layout-media.test.ts`. Runtime, migration, original fixture/pins и conformance tolerance 2px не изменены.

### Закрытые замечания и фактическое доказательство

| Замечание | Проверенное исправление | Исход адресного исполнения |
|---|---|---|
| C0-01 | `tests/browser/clip-layout.test.ts:132` добавляет crop в тот же complex graph и map `[sample]`; отдельного `-vf` больше нет. Сравнение реальных canvas/native pixels сохраняет допуск 5. | Оба viewport case 360/1440 passed в сыром browser JSON |
| C0-02 | `tests/clip-cta-rerender.integration.test.ts:66` передаёт SQL NULL только для отсутствующего snapshot; CHECK и assertions mixed v1/v2/03/null сохранены. | Mixed CTA case прошёл вместе с целым изменённым integration suite |
| C0-03 | `tests/browser/clip-layout.test.ts:102–117` параметризован submitted v1/v2, выполняет reload, проверяет ноль apply до подтверждения, readonly UI и точные canonical request bytes/key. `tests/clip-layout.integration.test.ts:185–205` дополнен шестью конкурентными pending replay для v2-01/02, одной quota/job и сохранением старого MP4. | Оба browser replay cases и оба real-PG v2 pending replay cases passed |

Browser здесь проверяет настоящий UI с сетевой фикстурой; backend semantics подтверждены отдельным real-PG integration. Это достаточное адресное закрытие C0-03, но не утверждение о полном реальном C1→C0 image rollback.

Прочитаны сырые результаты, а не авторский completion report:

- `c0-fix-pg.vitest.private.json`, SHA256 `24518ccf5c325ba148e1f9444814e855af9e51ee2e60efc430e5380c3e897d02`: 44/44 passed, 0 failed/skipped. Реальная команда: `node node_modules/vitest/vitest.mjs run tests/clip-cta-rerender.integration.test.ts tests/clip-layout.integration.test.ts --reporter=default --reporter=./scripts/test-skip-reporter.ts --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-pg.vitest.private.json`. Квитанция процесса: exit 0, 27.55s, freeze hashes before/after совпадают.
- `c0-fix-browser.vitest.private.json`, SHA256 `2778d89c2222f21532f6e3e9e964f24358c368caa4e329f636b018f787965970`: **6 выбранных passed, 35 filtered/skipped**, не 41/41. Команда использует `--config=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-browser.config.mjs` и `--testNamePattern=^(C0 |v2_native_and_canvas_cover_original_composition_extents)`. Сам временный config прочитан: он выбирает этот test file и направляет workspace aliases на фактические source modules; runtime mocks им не вводятся. Квитанция: exit 0, 23.56s, freeze before/after совпадают.
- `c0-fix-native-targeted.json`, SHA256 `da034926f2a688bcc46b8fac36b13e9f223f9a34bd51007dc9933e166c282ab8`: точный docker argv, image `sha256:34abe462e4880dac27c644d8c7302fc95aeedfcd8be85cbc80e7b2ac718f9e09`, read-only source mount, `node node_modules/vitest/vitest.mjs run tests/screen-layout-media.test.ts --maxWorkers=1 --reporter=default -t 'v2 native original extents and every live camera frame'`; exit 0, 18.67s, freeze before/after совпадают. Сырой log SHA256 `4d684cfe61fff8edeed511d1d60a1d8b3f0c980bbd791d2b1adfb9c8c481da0c`: **1 passed, 18 filtered/skipped**. Предыдущие 18 native PASS относятся к первоначальному snapshot; объединение этих результатов не называется новым общим 19/19.

Все эти исполнения выполнены другой владеющей сессией. Данный reviewer их не запускал; independently прочитаны код фикса, command receipts и сырые результаты.

### Native: обоснованность замены маркера и оставшаяся регрессия теста

Прочитаны фактические diagnostic scripts и raw logs `c0-fix-pixel-diagnostic.*`, `c0-fix-pixel-444-control.*`, `c0-fix-pixel-gray-control.*`. Исходный контроль показал v2-01 в нижней точке `(4,1154.336)` RGB `[186,77,34]` при source `[180,80,40]`. При явно заданном `overlay format=yuv444` в диагностическом graph, без смены геометрии, та же точка даёт `[180,79,40]`; непосредственно после screen — `[24,24,24]`. Нейтральный marker в исходном production graph даёт `[180,180,180]` внутри и `[24,24,24]` после screen. Эти контроли поддерживают объяснение через обработку цветности на границе; они не доказывают все свойства цвета для произвольного видео.

Замена screen на движущийся нейтральный `180+N*2` сама по себе приемлема для проверки extent/timebase: source и camera независимы, контрольные точки не перемещены, RGB camera sequence и parity tolerance 4 сохранены. Но вместе с ней нужно сохранить различение foreground/background в отрицательных assertions.

### C0-04 — MEDIUM: grayscale marker сделал наружные extent assertions вакуозными

Файл: `tests/screen-layout-media.test.ts:307–309,322–323` (аналогичный predicate — строка 328). Принцип Q5 «исправление сломало то, что измеряли старые тесты», P7 fix-delta audit, MC-03. Screen теперь имеет `R=G=B=180+N*2`, а проверки вне original bounds по-прежнему требуют только `max(rgb)-min(rgb)<=1`. И тёмный фон `[24,24,24]`, и ошибочно вышедший за границы screen `[180,180,180]` дают ноль. Поэтому renderer, увеличивший screen за верхнюю/нижнюю границу, оставив interior probes и camera на месте, больше не будет обнаружен этими отрицательными pixel assertions. Planner oracle 2px не заменяет проверку реального raster: renderer способен изменить coverage без изменения возвращённой planner geometry. Это доказуемое чтением ослабление теста, **не установленный дефект текущего runtime**. Успешный targeted run не закрывает именно потерянную проверку.

Направление исправления: в тех же наружных точках проверять ожидаемый тёмный background по яркости/цвету с обоснованным допуском, отличающим его от screen 180…218; сохранить исходные probes, parity 4 и geometry 2. Применить это и к проверке отсутствующей камеры, чтобы predicate оставался осмысленным для нейтрального source. Достаточен адресный повтор original native case и проверка этого небольшого diff; новый широкий прогон не требуется по одной этой находке.

Новых runtime-изменений в correction diff нет. Проверки других feature/C1/release путей не расширялись; авторские отчёты и прежние сторонние reviews не читались; код и тесты этой сессией не изменялись.

## Адресное закрытие C0-04 первоначальным reviewer

16.11.2026, та же сессия `/root/conformance_c0_critic`, requested `gpt-6-astra xhigh`; доступный идентификатор — canonical task, отдельный runtime UUID неизвестен. Проверены только исправление C0-04, сохранённые mutation sources и сырые RED/green результаты. Новый широкий цикл не проводился.

**C0-04 закрыт. Все четыре замечания этого C0-review закрыты на соответствующих проверенных снимках.** Нейтральный движущийся marker теперь сохраняет смысл отрицательных extent assertions: они различают фон и ошибочно попавший в него screen. Это закрывает установленный дефект теста и прежний отказ original-extents case в пределах его probes; не является финальным QE, разрешением выпуска или новым полным native 19/19.

### Снимок и граница подтверждения

HEAD — `49101377d1a1f06a72043480a15155b21ce31f2b`; `c0-outside-freeze-final.json` SHA256 — `2fd933cd1d2eec472a0799dc46612572b24d8b00a72b6e75e5fbcf8178cadf4e`. При первоначальном чтении этого freeze самостоятельно совпали 24/24 source hashes; SHA256 `git diff --binary HEAD` тогда — `28c58e467b7d9cb7e6c3693eacf6e42964e727ab7e50176639b7784cfc97126f`. От предыдущего correction snapshot отличался только `tests/screen-layout-media.test.ts`.

Проверенный media SHA256 — `1d4ce01ee63f3202b78b12f68e91ddebdaa87dabcc9bfb0cab6133203f085582`; он повторно совпал перед записью этого дополнения, текущий файл побайтово равен сохранённому `c0-outside-green-source.ts`. После первоначальной сверки координатор сообщил об отдельном исправлении DOM typing в browser test. Оно вне этого адресного review: первоначальные 24/24 и diff hash относятся к названному freeze, а не утверждают неизменность всего дерева после сообщения. Закрытие C0-04 привязано к неизменному media file и сохранённому freeze.

### Исправление и отрицательное доказательство

В `tests/screen-layout-media.test.ts:314` helper `expectBackground` требует 20 кадров и каждый RGB-канал `24±1`, независимо от production planner. Те же наружные точки screen (`:329`) и центр отсутствующей камеры (`:334`) теперь используют этот helper. Исходные interior/exterior probes, screen/camera marker sequences, parity tolerance 4 и geometry tolerance 2 не изменены; runtime и original oracle исправлением не менялись.

Самостоятельно сопоставлены сохранённые RED source files с green source. В обоих RED нет изменения expected values или assertions: mutation добавляет реальный FFmpeg `drawbox` цвета `0xb4b4b4` после production graph. Screen mutation заполняет полосу ниже нижней original границы v2-01, не меняя interior/camera probes; hole mutation заполняет верхнюю область результата без камеры v2-02. Это осмысленные контроли чувствительности к ошибочному покрытию фона, а не искусственный `throw` или подмена результата assertion. Они не моделируют все возможные renderer-регрессии.

| Сырой результат | Наблюдаемая причина/исход | Терминальный статус |
|---|---|---|
| `c0-outside-red-screen.log/json` | Original-01, `(4,1162.336)`, frame 0/channel 0: actual 180, expected 24; разница 156 превышает 1 | exit 1, 12.92s; 1 failed, 18 filtered/skipped |
| `c0-outside-red-hole.log/json` | Original-02-absent, `(842.4000000000001,289.248)`, frame 0/channel 0: actual 180, expected 24; разница 156 превышает 1 | exit 1, 18.51s; 1 failed, 18 filtered/skipped |
| `c0-outside-green.log/json` | Обе мутации отсутствуют, выполнен восстановленный original-extents case | exit 0, 18.72s; **1 passed, 18 filtered/skipped** |

Прочитанные command receipts используют тот же docker image `sha256:34abe462e4880dac27c644d8c7302fc95aeedfcd8be85cbc80e7b2ac718f9e09`, read-only source mount и команду `node node_modules/vitest/vitest.mjs run tests/screen-layout-media.test.ts --maxWorkers=1 --reporter=default -t 'v2 native original extents and every live camera frame'`. Freeze before/after совпадает внутри каждого исполнения; green связан с указанным final freeze. Все команды выполнила другая владеющая сессия; reviewer прочитал исходники и фактические результаты, тесты не запускал.

Самостоятельно вычисленные SHA256 совпадают с raw receipts:

| Артефакт | SHA256 |
|---|---|
| `c0-outside-red-screen.json` | `b44294984ecb824816fa4679dc0c0f56bf0b581f63519af67eb1f6e903979985` |
| `c0-outside-red-screen.log` | `a0b53c16f17d8b3fb298e48d754a282d716db001694c2c23214075c8210ef62c` |
| `c0-outside-red-hole.json` | `7dd778676e3e01ccb7a8d599604c4351421b790286564cef3c137a77f9e49cf8` |
| `c0-outside-red-hole.log` | `0cbe77a9aa750e9c3744f59c087c4a450e9346defc4c6e5592a8be59d171a593` |
| `c0-outside-green.json` | `559b0b7f4171684e2ebf0b92288aac017c939284496a9a3a41992ad2038b4231` |
| `c0-outside-green.log` | `53a304e1070d6498f68139f263e053d02345ccb82ff4314edfa61f037e71bccc` |

Сохранены ограничения предыдущего дополнения: диагностические chroma-контроли обосновывают нейтральный marker для extent/timebase, но не универсальную цветовую точность. Прежние 18 native PASS относятся к первоначальному снимку; последние 18 filtered cases не исполнялись и не считаются PASS. C1 UI, release guard, реальный image rollback и финальный release QE остаются отдельными этапами. В рассмотренном исправлении новых concerns нет; единственный изменённый этим reviewer файл — настоящий отчёт.

## Последняя адресная проверка browser typing cleanup

16.11.2026, та же reviewer-сессия. **Замечаний к двум строкам cleanup нет; C0-01…04 остаются закрыты.** В `tests/browser/clip-layout.test.ts:490` добавлены явный `this:CanvasRenderingContext2D` и tuple union для перегрузок `drawImage` (3/5 аргументов плюс `Parameters<typeof draw>`), в `:491` вызов заменён на `Reflect.apply(draw,this,args)`. Получатель, аргументы, счётчик вызовов и synthetic throw сохранены. Старые две строки с `any` действительно присутствуют в HEAD; обратная подстановка только этих двух строк в текущий файл воспроизводит его предыдущий SHA256 `b0a76d266923fe7b20f7244440c2616acd1cbc2843912dfe3af4f482f3d911ce`. Следовательно, дополнительных изменений поведения или assertions между снимками здесь нет.

Самостоятельно сверены **24/24 hashes** `c0-lint-freeze-final.json`, SHA256 `94ac41ad4fc1a3d7889ab0d59c426cd4f4174ed81b2b8868630019cba14a4036`. HEAD — `49101377d1a1f06a72043480a15155b21ce31f2b`; SHA256 `git diff --binary HEAD` — `a045c146518fb2bf073757fa599e7a02d1a7d60a979a4ca8f6cc46a3a6b26f6e`. Единственное отличие от outside freeze — browser test, текущий SHA256 `35060bea59c2f80a63eee49e78ab8866d71c4034518af9b14d9f357a2671086b`. Media SHA остаётся `1d4ce01ee63f3202b78b12f68e91ddebdaa87dabcc9bfb0cab6133203f085582`; runtime/oracle не менялись.

Прочитаны фактические command receipts и raw logs; их SHA совпали с receipts. Каждый receipt связывает исполнение с этим final freeze before/after:

| Фактический receipt | Команда / граница | Терминальный результат |
|---|---|---|
| `c0-lint-typecheck.json` | `node node_modules/typescript/bin/tsc --noEmit --project /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-typecheck.json`; config прочитан, включает C0 sources/tests, в том числе browser test | exit 0, 6.01s; log пуст |
| `c0-lint-stock.json` | `npm run lint` | exit 0, 1.55s; статические правила без ошибок |
| `c0-lint-preview.json` | `node node_modules/vitest/vitest.mjs run --config=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-browser.config.mjs --testNamePattern=^preview (null-context\|throw-draw\|healthy): --reporter=default --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-lint-preview.vitest.private.json` (в receipt pattern — один argv) | exit 0, 10.77s; **3 passed, 38 filtered/skipped**, не 41/41 |

Сырой `c0-lint-preview.vitest.private.json` SHA256 `612e0ad0f4108be7c4fd13f7582bb588cb55e05be3e73f76ae9d10a0aa96134b` подтверждает ровно три preview cases `null-context`, `throw-draw`, `healthy`. Reviewer ничего не исполнял и изменил только отчёт. Проверка ограничена cleanup и final source hashes; прежние результаты и ограничения C0 не превращаются в полный новый прогон или финальный release QE.
