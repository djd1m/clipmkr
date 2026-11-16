# План исправления композиций 01/02

Статус: **Proposed, готов к независимому review и согласованию**, 16.11.2026. Это план будущего исполнения, не отчёт реализации. В текущем turn продуктовый код, БД и VPS не меняются. Stage/K1/K2 не выполнены; закрытые циклы `zoom-screen-focus` не переоткрываются.

Inputs read: `00_complexity_assessment.md`, `01_requirements.md`, `02_reuse_inventory.md`, `03_adr/001-original-composition-compatibility.md`, `05_architecture.md`; исходный mockup 11.11, аудит 16.11, `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/model-matrix.md`, `docs/review-policy.md`; фактические parser/planner, DB migration032/getRenderInput/publication, UI draft/poll, native/canvas, music/CTA consumers и тесты.

Применены pinned `.agents/skills/feature-adr/modules/06-implementation-plan.md` и reference `code-goal-planner.md` как SPARC-GOAP методика, без запуска Claude Flow. CLI `@dzhechkov/harness-cli@0.8.58`, feature-adr `1.5.25`, OpenSpec `1.15.0`. Все dz команды только `npm run dz -- ...` из `/home/clipmkr`. `docs/process/extended-qe.md` в этой копии отсутствует; это не свидетельство выполненного extended-QE. Применимые протоколы берутся из установленного feature-adr, реальные findings/receipts оформляет владеющая сессия.

## Команда, входы и решения до старта

| Роль | Модель и режим | Результат |
|---|---|---|
| Архитектор/планировщик | `gpt-6-astra xhigh`, не автор будущего кода | Этот ADR, архитектура, DAG/проверки |
| Автор макета и кода | `gpt-6.1-sol high` | Согласованный UI, минимальные изменения, воспроизводимый candidate |
| Независимый reviewer плана Astra | `gpt-6.1-terra xhigh`, fresh session/fork none | Требования/ADR/план сначала, затем самостоятельно consumers; список подтверждённых замечаний |
| Независимый code review и QE | `gpt-6-astra xhigh`, fresh session/fork none | Только утверждённые требования/ADR/архитектура/план на входе; код/тесты исследует сам, без авторских заявлений о PASS |

В receipt записываются фактические model ID/effort, session ID, входные SHA, команды, terminal results и ограничения; таблица — назначение, не доказательство состоявшегося запуска. Процесс: feature-adr, shift-left/QCSD по M-routing, K1/K2, implementation, независимый QE/code-spec anti-drift. UI реализуется только после конкретного owner approval. Изменения shared-файлов последовательны; независимые чтения/ревью допустимы параллельно на стабильной ревизии.

Эталон композиции — [оригинальный HTML на immutable commit](https://github.com/djd1m/clipmkr/blob/9e19f5746a28bad89c9551ce8cd9934f0f0a4f8e/docs/research/zoom-screen-layout/mockup.html), [original01](reference/original-01.png), [original02](reference/original-02.png). Дополнительный [конкретный UI mockup](reference/selector-v2-mockup.html) показывает выбор/высоту/новые captions и дополняется old-v1 state с кнопкой обновления. Только его фактический SHA, screenshots desktop/mobile и receipt согласования разрешают UI-код. Composition original остаётся прежним. OpenSpec ledger и его exact hash закрепляет root в требованиях до K2; текущая ссылка на mutable file без SHA недостаточна.

## Целевое состояние

Current: v1-01/02 повторно воспроизводят позднюю расходящуюся композицию; native/canvas ограничены y400..1200; screen height связан с width. Baseline чтения `e6a5dafdcf7027939586634a31f09bd8013fc120`; опубликованный runtime из аудита `18763e1530739aff87825634af75a670bb62198f` — отдельный факт, не автоматически текущий runtime. Процент покрытия не измерен и не придумывается.

Goal: v2-01/02 после явного локального выбора + apply совпадают с original на контрольных ROI≤2px при 1080×1920; другие источники сохраняют aspect через contain. Старые v1/03/null, submitted replay, quota/access/retention/music/CTA сохраняют семантику. Владелец открывает настоящие QA01/02/03 из своего кабинета на текущем VPS, воспроизводит и скачивает результаты.

Specification — MC-01…MC-08 и ADR-001; pseudocode — строгий version dispatch, existing COALESCE/replay, slot contain и явный upgrade draft; architecture — существующие shared/PG/worker/UI; refinement — RED old geometry→GREEN v2 и compatibility negatives; completion — стабильный кандидат, независимый QE, VPS UI и ручная приёмка. В `00_complexity_assessment.md` acid-токены A<n> сейчас не объявлены; plan не фабрикует их. При их добавлении до K2 каждый именуется в конкретной задаче/отказном тесте.

## Задачи

### TASK-01 — Утвердить входы, typography qualification и UI; MC-01 MC-02 MC-04 MC-05 MC-07 MC-08, ADR-001

SPARC: specification/architecture. Зависимости: исходные требования/reuse, законченный этот план. Артефакты: pinned OpenSpec delta, supplemental UI mockup с independent height и old-v1 upgrade-button, 360px/desktop screenshots, реальный overlay bbox qualification и explicit owner approval. До product/UI кода выполнить ограниченный эксперимент текущим FFmpeg/libass в temp-каталоге, без изменения runtime/production source. Для 02: title слева, captions максимум 2 строки font 48→46→44 с ink top≥1364/bottom≤1469; CTA font 48 plate 1481..1561; watermark top1573/gap12 прежние. Проверить glyphs/outline/shadow и длинные реальные строки по правилам `05_architecture.md`. Непоместившийся bbox — STOP и уточнение макета до K2; не cropping, не переход на одну строку, не font<44. Done: владелец получил original01/02 и конкретный supplemental UI с этим ограничением, review закрыт, approval привязан к exact SHA. Время: 2–4 ч, ожидание ответа отдельно.

### TASK-02 — Построить независимый original oracle и доказать RED старой геометрии; MC-01 MC-02 MC-03 MC-08, ADR-001

SPARC: refinement, после разрешения начала code/test этапа и K1/K2. Files: новые `tests/screen-layout-conformance.test.ts`, `tests/fixtures/zoom-layout-original.json`, узкий `scripts/check-zoom-layout-conformance.mjs`. Expected bounds/ROI извлечь из закреплённого оригинального DOM/CSS; источник ожидаемых чисел не импортирует planner/новый ADR. Размер рамки исключить явно, не подгонять tolerance. Test `original_mockup_01_02_composition_conformance` сначала исполнить против текущего v1 output и сохранить RED именно по camera x/y/scale 01 и screen/camera order/width 02; ошибки parser version2/build/import не считать RED. Затем тот же immutable expected применить к v2; для v1 остаются отдельные compatibility checks, RED не превращается в требование менять старый v1. Done: два meaningful RED с observed/expected в отчёте и original/hash guard. Время: 2–4 ч.

### TASK-03 — Ввести строгую версию и migration033, сохранить rerender/replay; MC-06 MC-08, ADR-001

SPARC: refinement. Depends: TASK-02 и gates. Files: shared parser/type, `packages/db/src/{clip-layout,render}.ts`, migration033, `apps/web/src/lib/screen-contract.ts`, integration suites layout/music/CTA. Type `ScreenFaceLayoutV1` не переименовывать в смысловой v2: новый union+V2, consumers обновить явно. Published envelope1; nested request1/2; v2 только 01/02 focus: null. Populated032→033 и второй migrate; read constraints из pg_constraint, сравнить legacy row/account/credits/source/output hashes. Тесты: `v2_parser_is_strict_and_v1_canonical_bytes_are_unchanged`, `033_preserves_v1_rows_and_accepts_only_supported_v2_intents`, `publication_rejects_composition_version_substitution`, `music_rerender_preserves_each_published_composition_version`, `cta_rerender_preserves_mixed_composition_versions`. Music отдельно по v1-01/v1-02/v2-01/v2-02; CTA mixed batch плюс 03/null. Done: published requested.version/ROI сохранены, один quota debit за existing accepted apply, unknown version/лишние ключи/подмена publication refused, старые keys до publish доступны. Время: 3–5 ч.

### TASK-04 — Исправить только новую геометрию, полное полотно и overlays; MC-01 MC-02 MC-03 MC-06 MC-07, ADR-001

SPARC: refinement. Depends: TASK-03, квалифицированный и согласованный TASK-01. Files: shared planner, worker `{screen-layout,ffmpeg,teaser,subtitles,cta-overlay}.ts`, `ClipLayoutPreview.tsx`, unit/native/render/teaser/CTA suites. V1 branch сохраняет прежние численные outputs и graph; v2 slots определены в архитектуре. Canvas/FFmpeg v2 выводят весь 1080×1920, не pane 400..1200; source/camera делят decoder/timebase; no-camera не меняет screen. Overlay params opt-in исключительно v2-02, defaults прежние. Test `v2_overlay_bounding_boxes_preserve_content_and_existing_footer_contracts` проверяет реальную raster маску текста, а не строку filter; `original_mockup_01_02_composition_conformance` становится GREEN. Done: screen/camera≤2px independent expected, aspect/crop содержимое сохранено, watermark last, caption words/timing/CTA content unchanged. Время: 4–7 ч.

### TASK-05 — Реализовать согласованный локальный выбор и независимую height02; MC-04 MC-05 MC-06, ADR-001

SPARC: refinement. Depends: TASK-04. Files: `ClipLayoutChoice.tsx`, existing module CSS, browser suite. Единственная upgrade-button у старых 01/02; открытия/poll не мигрируют. У v2-02 независимая height с существующим clamp origin; вариант 03, camera и v1 сохраняют прежний режим. После radio без изменения ROI показывать «Показан прежний экран; для крупного плана уточните область», preview сохраняет её. Ручная правка ROI и existing reviewed_full_clip подтверждают выбранную область; дополнительный checkbox не вводится. Reviewed сбрасывается после изменения области/source. В UI не нужны номера wire-версии. Tests: `legacy_layout_changes_version_only_after_explicit_upgrade`, `v2_02_height_control_reaches_reference_aspect_without_applying`, `unknown_v1_submission_replays_without_draft_upgrade`. Проверить reload/back/poll, account scope/logout clear, stale source, lost response, doubleclick/replay и отсутствие quota/jobs при radio/resize. Done: через UI достижима контрольная ROI02 без API-инъекции, в DB сохраняется только явно подтверждённый v2. Время: 3–5 ч.

### TASK-06 — Закрепить mutation/visual и bounded release guard; MC-03 MC-08, ADR-001

SPARC: refinement/completion. Depends: TASK-04/TASK-05. Files: `scripts/check-zoom-layout-conformance.mjs`, `scripts/apply-zoom-layout-current-vps.mjs`, `scripts/test-zoom-layout-mutations.mjs`, `tests/zoom-layout-release.test.ts`, новые/существующие conformance/browser/media tests. Небольшие scripts поверх существующих Vitest/Playwright/FFmpeg patterns; не новый orchestration framework. Мутации:01camera над screen;02camera снизу;02screen shrink; v2 использует pane 400..1200; music silently upgradesv1; изменение original/expected/pins без нового approval. Все получают behavioural RED и восстановленный GREEN, count>0; source anchor отсутствует/двусмысленен→error. Read-only release guard связывает exact candidate source tree/commit, approved reference hashes, tests/review hashes и image IDs; несовпадение/missing/incomplete/skip обязательного case→nonzero. Штатный путь записи — только ограниченный `scripts/apply-zoom-layout-current-vps.mjs`: он сам вызывает read-only guard непосредственно перед первой мутацией, останавливается при nonzero/exception/missing и использует проверенные неизменяемые host/source/image/evidence bindings. До следующей записи повторно сверяет критичные bindings; при drift STOP. Тест `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence` наблюдает ноль вызовов mutating executor для missing approval, неправильного source/image, незавершённых тестов и подмены входов; положительный путь проверяется на изолированном стенде. Done: отрицательные входы реально блокируют исполнителя до write side effects; отдельная документация ограничений guard. Время: 3–5 ч.

### TASK-07 — Один согласованный прогон стабильного candidate и независимый QE; MC-01 MC-02 MC-03 MC-04 MC-05 MC-06 MC-07 MC-08, ADR-001

SPARC: completion. Depends: TASK-06. Files: QE/anti-drift/evidence под этой feature; product source frozen. Автор запускает общий риск-ориентированный набор ниже один раз. Fresh Astra проверяет требования, negative cases, original oracle и consumers; его выводы не подменяются авторским PASS. Исправления получают локальный затронутый повтор и независимую проверку; новый общий прогон только при широкой регрессии/зависимости/незакрытом риске с названной причиной. Done: terminal results на exact revision, significant findings закрыты, нет необъяснённого skip/no-match, source/image соответствует evidence, compatibility artifact C0 сохранён. Время: 4–7 ч активной проверки; длительность native/CI измерить, не угадывать в отчёте.

### TASK-08 — Поставить на текущий VPS, дать живые QA01/02 и проверить rollback; MC-06 MC-07 MC-08, ADR-001

SPARC: completion. Depends: TASK-07, конкретная авторизация следующего workflow checkpoint. Только VPS `/home/clipmkr`, фактический host/compose/resource map проверяется до операций. Files: bounded release manifest/операционный receipt и инструкция владельцу, без private media в Git. Шаги/STOP ниже. Done: `clipmkr.ru` показывает exact candidate revision; два новых QA01/02 и сохранённый 03 открываются в кабинете, играют и скачиваются; C1→C0 совместимость проверена на isolated clone; владелец получил ссылки и краткий порядок ручной приёмки. Cloud/DNS не трогаются. Время: 2–4 ч; ручная приёмка/ожидание владельца отдельно.

## Зависимости и параллельные группы

`TASK-01 → gates → TASK-02 → TASK-03 → TASK-04 → TASK-05 → TASK-06 → TASK-07 → TASK-08`. Названные автоматические тесты пишутся после разрешённого входа в code stage, first RED до соответствующего product fix.

Параллельная группа P0: плановое fresh Terra-review и подготовка supplemental mockup/qualification по независимым артефактам; owner approval после сведения замечаний. P1: только независимые чтения/test design/release inventory, пока author последовательно меняет общие файлы. P2: review и подготовка инструкций поставки на замороженном candidate; обязательные native/DB тесты не конкурируют за shared test schema/Redis/worker. Исходники не меняются во время прогонов. Владеющая сессия ждёт terminal outcome каждого долгого процесса; потерянный session ID требует проверки живых процессов/logs, не автоматического второго запуска.

## Checkpoints

1. Requirements/reuse/ADR+shift-left/QCSD: root связывает завершённые artifacts и exact OpenSpec hash, получает фактическое checkpoint authorization. Предварительный M-routing перепроверяется на финальном списке 28 целей (большинство — прямые type consumers/тесты); если pinned router требует L — выполнить требуемые DDD/fleet шаги до кода, а не сохранить M ради сокращения процесса.
2. До K2: TASK-01 bbox qualification, конкретный UI approval, fresh Terra findings закрыты. Read-only checksum/plan review текущего turn не объявляются K1/K2.
3. K1 всех новых имен: `npm run dz -- name-check --export ScreenFaceLayoutV2,ScreenFaceLayout --project /home/clipmkr`; для новых script/test module basenames отдельные `--module` проверки после сверки supported scope. Непокрытый тип сущности проверяется явным `rg`, это дополнение, не подмена K1. Новая экспортная функция не добавляется без нового name-check.
4. K2: `node .agents/skills/feature-adr/scripts/check-plan-completeness.mjs features/zoom-layout-mockup-conformance --tier=M --require-requirements` — только после реальных предшествующих артефактов. Final verdict и exit должны быть прочитаны. MC-* трассируются вручную таблицей задач: pinned C8 перечисляет FR/NFR/AC/C и не обещает распознавать MC. Новые acid tokens/FR identifiers root вносит в соответствующие task lines перед прогоном.
5. После TASK-03: DB migration/parser/rerender checkpoint; после TASK-05: preview/native/UI behaviors; после TASK-07: независимый QE/anti-drift. Поддерживаемая запись — `npm run dz -- feature-adr-checkpoint --slug zoom-layout-mockup-conformance --stage <реальный-stage> --input-hash <измеренный-hash> --result <фактический-json> --artifact <существующие-paths> --json`. Значения заполняются результатами, не этим текстом; успешная receipt не пишется вручную.
6. После VPS: ссылки/инструкция владельцу и отдельная его визуальная приёмка. PASS автоматики не заменяет её. Ни настоящий stage label, ни существование файла сами по себе не одобряют следующий этап.

## Риски и проверка

### Ограниченная матрица

| Уровень | Обязательные случаи | Что доказывает / не доказывает |
|---|---|---|
| Pure/parser, дешёвый | v1-01/02/03 и null fixtures; v2-01/02; invalid version/key/focus; original1816×968; odd1923×1081, rotated968×1816, SAR16/15, tiny edge; camera on/off | Версионные правила, out-of-source refusal, contain. Не доказывает raster/detector |
| DB realPG | populated032→033→repeat; mixed music/CTA replays; version-substitution; concurrent apply/replay, foreign 404, expired/stale/source change | Сохранность snapshot/keys/credits и atomicity. Без skip при отсутствии PG |
| Native synthetic | Два original ratio 01/02 clips с меняющимися маркерами camera/screen; один no camera; один odd/SAR fallback; один cut_plan+2-line caption+teaser+CTA+WM; legacy 03/null из existing suites | Пиксели/output bounds/timebase/filter order. Не заменяет наблюдение настоящей camera |
| Canvas browser | Chromium 360 и 1440 для 01/02, old v1 restore/upgrade, independent height; один WebKit 390 smoke; один keyboard/focus/contrast smoke | Согласованный интерфейс и frame/geometry parity. Canvas cameraAvailable=true не доказывает native detector veto |
| Реальный QA на VPS | 20 с 306.4730625–326.4730625 original source, два новых 01/02 через UI;03 отдельный сохранённый control; preview/play/download; проверка кадров 0/10/19+непрерывный просмотр | Практическое соответствие на этой записи. Не full 90/120min upload/payment acceptance и не гарантия всех источников |

Нативные кейсы не перемножать по всем viewport/browser/variant/CTA combinations. Полный original conformance — отдельно camera-present; no-camera сравнивает fallback, а не заявляет полный match. Camera source/timebase проверять all-frame marker sequence в synthetic и настоящим detector в QA, не подменять FaceReport в real proof. Перед получением QA ресурсов проверить фактическую доступность source/retention; предоставленные ссылки должны открываться через аккаунт, без bootstrap токенов в Git.

### Один общий набор перед выпуском

**PRE-APPLY** относится к стабильному candidate до первой записи на целевой VPS: native/canvas/reference/compatibility, isolated real Next/PG/Redis/S3, source/image binding и независимый review. Он допускает ограниченный candidate apply. **POST-APPLY** относится к фактическому UI целевого VPS, QA-клипам и ссылкам владельцу: он блокирует объявление окончательной готовности/приёмки; провал ведёт к rollback. Реальная ссылка на ещё не поставленный candidate не требуется до его первой поставки. Evidence bundle хранит эти два состояния отдельно: pending POST-APPLY не маскируется как PASS и не создаёт циклический preflight.

Команды будущего запуска из stable candidate с реально настроенными выделенными PG`*_test`, Redis`/14`, FFmpeg/ffprobe/YuNet/fonts и существующим live-S3 test namespace; секреты передаются существующим механизмом окружения, не журналируются. Browser suite уже содержит real Next/HTTPS/PG/Redis/S3 case; отсутствие env — блокировка, не пропуск. Команды сейчас не выполнялись:

```bash
npm run lint
npm run typecheck
npm run build
npm test -- tests/zoom-layout-release.test.ts tests/screen-layout.test.ts tests/screen-layout-conformance.test.ts tests/screen-layout-media.test.ts tests/clip-layout.integration.test.ts tests/clip-music-choice.integration.test.ts tests/clip-cta-rerender.integration.test.ts tests/render.test.ts tests/framing.test.ts tests/framing-media.test.ts tests/teaser.test.ts tests/clip-cta-render.test.ts
npm test -- --config vitest.browser.config.ts tests/browser/clip-layout.test.ts
node scripts/test-framing-mutations.mjs /tmp/zoom-layout-qe/framing
node scripts/test-zoom-layout-mutations.mjs /tmp/zoom-layout-qe/conformance
```

Последняя script команда появится в TASK-06; это планируемый интерфейс, не существующий успех. Broad suite не включает новые live payments/STT/90 минутные upload циклы, поскольку они неизменны; исходные обязательные core CJM приёмки этим не объявляются закрытыми. Изменение money/access/retention затрагивающего кода расширяет соответствующий mandatory suite до фактического риска. После локального исправления повторяются его test files/мутации и independent review, не весь набор по умолчанию.

### Source guards, mutation anchors и пины

Baseline pins измерены на HEAD`e6a5dafdcf7027939586634a31f09bd8013fc120`, не скопированы из исторических source-pins другой ревизии:

| Файл | SHA256 |
|---|---|
| originalHTML | `7b83572176b7c48c38c5d9d3ed141148c482cc11bb98493c07fcef59fe6f4ad0` |
| shared screen-layout | `8d4ae7c23ec80fb04123694a9cd808a0735f2ad0b2a2e7574131970c7bec4405` |
| db/render | `462363a7e9950c1a22ab2d1a448f80f83638c942e880c66778e5655acafe096d` |
| migration032 | `23f93ca25da73cf2e69d4dab1ab321d922326acf9de1bdf03cb0439f679f182b` |
| worker screen-layout | `a1388f4550be813660d037a64a8144219a6279401bc6217450ea1c95d94c7848` |
| worker ffmpeg | `6d05cfb8fa65a892091660c5c55c431b2d4b25c841e7c9ac6fde0994c5728204` |
| canvaspreview | `d8e41f14f688a1275fe3e92e8e07f03924cd50420f2f3011bfff2041050d5cdd` |
| framingmutations | `b9b2a5f9e0c9d90297d0d41ea16b08ecc68094cf83c3f12da0e03920bf976111` |
| YuNetmodel | `8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4` |
| renderfont | `43f6f10c6a265edfb4f34e64b1a60743610ab58c748e25eb4ef9bb54e388c38f` |

Original PNG01: `ddf98428987d06041e637b9f940977205db7ae2bc28334f608741cf653f3fba4`; PNG02: `8a6ada7a15bd718007a01288e0dcde95ff56c4a16f02e57eb9f12c71f141a25e`. Это публичные заглушки 360×640, Chromium 148.0.7778.96; `reference/pins.json` фиксирует externalRequests=0/pageErrors=[]. PNG показывают композицию, не доказывают читаемость частного кадра.

До edit сохранить число вхождений существующих anchors `if (watermark) filters.push(` и `if (assFilePath !== null) filters.push(` в ffmpeg: `scripts/test-framing-mutations.mjs` требует ровно одно совпадение. Остальные пять anchors format (dual, portrait/narrow guards, even floor, bottom panel crop) не затрагивать. В `tests/render.test.ts` сохраняются fontfile/Docker COPY guard, literal concurrency=1, runtime factory guard, canonical filter order и отсутствие crop/scale в screen tail. Обновление hash объясняется реальным diff; проверка не ослабляется ради GREEN.

Новый guard хранит original commit/hash отдельно от candidate tree hash и получает approved reference hash из receipt, утверждённой отдельно от candidate. Он проверяет original Git object, public pins и oracle fixture. Одновременная замена planner+oracle+pins требует нового owner approval и независимого review по изменённым SHA. Guard только читает: не обновляет fixtures, не генерирует PASS, не deploy. Отрицательные входы: changed HTML, swapped expected, missing approval, mismatched image/source, empty test report. Существующего CI enforcement сейчас нет; создание локального guard и его обязательный вызов из bounded apply entrypoint входят в TASK-06/TASK-08; отдельный успешный запуск guard не разрешает произвольные ручные команды. Root может изменить guard/receipt или обойти его. Защита обнаруживает только покрытые случаи, абсолютной гарантии нет.

## Поставка и откат

Предлагается ограниченный локальный release gate без нового release framework. Существующий `scripts/release-candidate.mjs` здесь **не запускать**: он требует пару `site-test` + `cloud-c` и явно исключает `clipmkr.ru`. Его legacy режим не является подходящим способом доставки этого scope. Cloud application deployment, cloud DB/config/migration и DNS запрещены; существующий S3 доступ тестового harness не является разрешением на перенос инфраструктуры.

1. До записи проверить current host identity, `/home/clipmkr`, фактические compose project/files, контейнеры web/worker, image IDs/labels, mounted DB/Redis volumes и опубликованный health revision. Связать это в приватном `vps-inventory.private.json`; не печатать env/secrets. Расхождение с ожидаемым VPS/проектом — STOP. Не предполагать, что это сервер `n5.clipmkr.ru`.
2. Зафиксировать чистый candidate commit/tree SHA, точные source hashes, один построенный web image и worker image (либо общий image по фактическому compose), их OCI labels и migration journal. Сохранить C0 compatibility image: умеет читать/рендерить v1/v2, отображать saved v2, replay pending v2; создание нового v2 в UI ещё отключено. В C0 editing уже сохранённого v2 disabled с понятным notice, чтобы старый radio handler не создал v2+03; существующий unknown submitted replay доступен. Его source revision и targeted compatibility tests записать отдельно. C1 — согласованный writer/UI. Все image digest references неизменяемые, не `latest`.
3. Приватный evidence bundle содержит candidate SHA/tree/image IDs, approved original/UI hashes, завершённые tests/mutations/QE с exit/count, C0 compatibility result, host binding и предложенные операции. Планируемый интерфейс TASK-06: `node scripts/check-zoom-layout-conformance.mjs --candidate <full-sha> --reference-approval <approved-json> --evidence <bundle-json> --images <image-manifest-json>`. Это readonly preflight; ни один placeholder не подставляется догадкой. Missing/mismatch/nonterminal/mandatoryskip→nonzero. Штатная запись вызывается только через `node scripts/apply-zoom-layout-current-vps.mjs --manifest <approved-current-vps-manifest-json>`; manifest содержит все перечисленные входы. Entry point сам повторяет guard и связывает переданные executor значения с проверенными host, source, image digests и hash bundle, без rebuild или повторного чтения изменяемых непроверенных входов. Перед первой мутацией и между фазами сверяет критичные bindings; любое расхождение/исключение/ненулевой guard прекращает дальнейшие операции. Допустимые действия ограничены admission pause/resume, drain, backup, migration033, запуском проверенных services и совместимым rollback C0 по этому manifest. Произвольная shell-команда, иной host/Cloud/DNS/удаление media не являются допустимыми входами. Прямые ручные migrate/compose вне исполнителя запрещены штатным процессом; root может сознательно обойти его, это не техническая гарантия от root. Отрицательные тесты TASK-06 проверяют fail-before-write самого исполнителя, а не только checker.
4. Сначала проверить C1→C0 rollback на изолированном клоне схемы с v1/v2 rows и pending replay; реальные PG migration033 constraints сохранить. Ожидается: оба nested versions читаются, музыка/CTA сохраняют request version, старый MP4 доступен. Это targeted rollback check на C0, не заявление о полном зелёном C1 на другой ревизии.
5. Следующие пункты 5–7 выполняет ограниченный entrypoint после встроенного guard, не оператор отдельными командами. Во время ограниченного окна закрыть новые admissions layout/music/CTA существующим reverse-proxy rule для конкретных mutating routes, дождаться terminal всех затронутых running/deferred render jobs; если невозможно безопасно выделить route, коротко остановить web на согласованное окно. Ни quota/refund/reset, ни принудительного succeeded не делать. Сохранить DB backup, row/key/credits summary и приватный предыдущий image manifest. Не удалять S3 media. Deployment выполняет владеющая сессия и ждёт terminal outcomes.
6. Применить migration033 штатным `packages/db/dist/migrate.js` в candidate image через фактический compose service. Journal SHA migration032 обязан совпасть. Ошибка откатывает транзакцию и останавливает rollout. Все reader services переходят на совместимый image до открытия v2 writer; точные service names берутся из инвентаризации. Данные, volumes и provider config не переносятся.
7. Сверить запущенные image IDs, health revision, migration journal и сохранённые keys/credits с проверенными. Открыть admissions после healthy. В настоящем UI создать отдельные QA01/02 той же авторизованной Zoom-записи, сохраняя контрольный03. Путь: кабинет → просмотр всего фрагмента → скачивание → ffprobe/полное декодирование; сравнить кадры0/10/19с и непрерывное воспроизведение. В test namespace один music rerender старого01/02 и CTA mixed batch должны сохранить версии. Доказательства приватны; в Git только общие исходы, hashes и безопасные app ссылки.
8. Передать владельцу exact candidate SHA, original01/02, supplemental UI approval и три QA-клипа. Инструкция: открыть01 и сверить PiP; открыть02 и сверить рабочую область/камеру; посмотреть движение/подписи; скачать. До отдельной ручной приёмки на Cloud не публиковать. Ожидание ответа не считается пройденной приёмкой.

Причины rollback: неверная геометрия/подписи, отказ чтения сохранённого request, повторное списание/нарушение доступа, source/image mismatch либо другой значимый QA дефект. Закрыть admissions, дождаться или зафиксировать исход активных jobs, вернуть **C0**, оставить migration033 и JSON v2. Повторить targeted read/play/download и music/CTA на test rows, сверить images. При ошибке самого v2 renderer остановить новые rerenders/worker и сохранить доступ к готовым MP4 до исправления совместимого image. После v2 writes запрещены pre-v2 runtime, down migration, DELETE v2, массовая пересборка и восстановление backup поверх новых данных. Если migration отказала до первых v2 writes, возврат к предыдущему image допустим: это отдельный случай совместимых данных.

## Оценка

Оценка — рабочие часы исполнителей, не календарная гарантия и не уже измеренное время. При доступном current FFmpeg/PG/Redis/browser/S3 harness, сохранённом private source, отсутствии новой dependency и прохождении overlayqualification:

| Часть | Диапазон | Что включено |
|---|---|---|
| Дизайн/предкодовая квалификация/независимый план review | 2–4 ч плюс review/ответ владельца | bbox, конкретный mockup, точные approval SHA; ожидание отдельно |
| Реализация (TASK-02…TASK-06) | 15–26 ч | oracle/RED, strict version/migration, geometry/overlays, draft UI, narrow guard/mutations |
| Проверки и независимый QE (TASK-07) | 4–7 ч | один общий targeted набор, review и локальные повторы по находкам |
| VPS поставка/QA/rollback rehearsal (TASK-08) | 2–4 ч | реальные images/migration/UI/media evidence, инструкция владельцу |

Итого ориентир 23–41ч активной работы, примерно 3–5 рабочих дней; параллельное review может сократить календарное время. Если qualification 48→44px не прошла, оценка приостанавливается для конкретного UI уточнения. Недоступный source/тестовый S3, аномалии migration preflight, routing L и новая регрессия — отдельные причины пересмотра. Полные циклы без причины не добавляются. Отчёт разделяет фактическое время реализации, проверок и поставки.

## Amendments

Следующие tests — обязательные будущие названия, сейчас не выполнены. Их существование/невакуозность проверяется после реализации, не заявляется по этой записи.

AM-1 (original mockup audit16.11): late ADR не может заменить original oracle. Confirmation: wrong legacy01/02 даёт numeric RED, v2 GREEN → test `original_mockup_01_02_composition_conformance` in `tests/screen-layout-conformance.test.ts` (fails if reverted).

AM-2 (getRenderInput consumers): нельзя обновлять v1 при music/CTA. Confirmation: каждый published request сохраняет version → test `music_rerender_preserves_each_published_composition_version` in `tests/clip-music-choice.integration.test.ts` (fails if reverted).

AM-3 (width-only ROI audit): высота 02 независима, control не отправляет apply. Confirmation: control достигает original aspect без jobs/debit → test `v2_02_height_control_reaches_reference_aspect_without_applying` in `tests/browser/clip-layout.test.ts` (fails if reverted).

AM-4 (native/canvas clipping): новый full canvas выводит camera y192 и screen до 1355 без обрезки pane. Confirmation: raster extents совпадают с original → test `v2_native_and_canvas_cover_original_composition_extents` in `tests/browser/clip-layout.test.ts` (fails if reverted).

AM-5 (overlayqualification): captions/title не закрывают исправленный screen/camera, footer contracts сохраняются. Confirmation: real glyph bounding boxes в разрешённых полосах → test `v2_overlay_bounding_boxes_preserve_content_and_existing_footer_contracts` in `tests/screen-layout-media.test.ts` (fails if reverted).

AM-6 (saved selected radio): upgrade старого 01/02 имеет явное отдельное действие. Confirmation: открытие/poll/replay оставляет v1, upgrade button создаёт local v2 → test `legacy_layout_changes_version_only_after_explicit_upgrade` in `tests/browser/clip-layout.test.ts` (fails if reverted).

AM-7 (qcsd-testability QT-01): обязательный Vitest run явно включает `tests/zoom-layout-release.test.ts`; future evidence содержит его count/exit/skip на том же candidate. Confirmation: сам executor прекращает запись при invalid/missing/changed evidence → test `current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence` in `tests/zoom-layout-release.test.ts` (fails if reverted).

MC-01…MC-08 и ADR-001 связаны с task lines выше. Фактически выполнен recall: `npm run dz -- recall 'zoom original mockup design drift legacy rerender geometry compatibility' --project /home/clipmkr`, exit0, JSON fallback, один результат об UI acceptance. SQLite backend вернул UNREADABLE/native addon error; ограничение не исправлялось в этом документационном scope. Root ранее указал `teach:99a7cc53301d60e1` и `teach:de3e9e3d84558cec`; в плане это независимый original oracle и доступный QA-пример. Здесь новые teach или successful stage не фабриковались. Code/spec anti-drift текущего turn: только три документа ADR/архитектуры/плана, без продуктовых изменений и выпуска.

EXPECTED_CODE_TARGETS:
- packages/shared/src/screen-layout.ts
- packages/db/src/clip-layout.ts
- packages/db/src/render.ts
- packages/db/migrations/033_clip_layout_composition_v2.sql
- apps/worker/src/render/screen-layout.ts
- apps/worker/src/render/ffmpeg.ts
- apps/worker/src/render/teaser.ts
- apps/worker/src/render/subtitles.ts
- apps/worker/src/render/cta-overlay.ts
- apps/web/src/lib/screen-contract.ts
- apps/web/src/app/clips/ClipLayoutChoice.tsx
- apps/web/src/app/clips/ClipLayoutPreview.tsx
- apps/web/src/app/clips/clip-layout.module.css
- tests/screen-layout.test.ts
- tests/screen-layout-conformance.test.ts
- tests/fixtures/zoom-layout-original.json
- tests/screen-layout-media.test.ts
- tests/clip-layout.integration.test.ts
- tests/clip-music-choice.integration.test.ts
- tests/clip-cta-rerender.integration.test.ts
- tests/browser/clip-layout.test.ts
- tests/render.test.ts
- tests/teaser.test.ts
- tests/clip-cta-render.test.ts
- scripts/check-zoom-layout-conformance.mjs
- scripts/apply-zoom-layout-current-vps.mjs
- tests/zoom-layout-release.test.ts
- scripts/test-zoom-layout-mutations.mjs
