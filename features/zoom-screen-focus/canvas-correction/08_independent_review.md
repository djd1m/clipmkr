# Независимое ревью ограниченной коррекции canvas readiness

Дата: 16.11.2026. Вердикт: **PASS для указанной коррекции**. Подтверждённых дефектов продуктового патча не найдено. Это один дополнительный внешний cross-model проход, разрешённый владельцем; он не является native-циклом 4 и не объявляет всю Zoom-функцию завершённой или развёрнутой.

Проверяющий: `gpt-6-astra`, reasoning `xhigh`, отдельная сессия `/root/canvas_independent_qe`, получившая требования и план без coding history. Автор: `gpt-6.1-sol high`. Использованы feature-adr и принципы code-critic. Код ревьюер не исправлял; Git/deploy/DB/S3/native-authority не изменял. Предыдущие QE и выводы автора не использованы как доказательство корректности. После собственной оценки прочитаны текущие raw terminal metadata/stdout/stderr обязательных авторских проверок.

## Вход и снимки

Прочитаны `/home/clipmkr/AGENTS.md`, локальные `AGENTS.md`, `CLAUDE.md`, review policy и применимые правила; утверждённые `01_requirements.md`, `06_implementation_plan.md`, `10_canvas_readiness_request.md`, ADR-003 и `05_architecture.md` прежней функции; OpenSpec `specs/screen-face-layout/spec.md` и дополнение `canvas-readiness-correction-20261116.md`; текущие требования/план/ledger этой коррекции и отдельный `typecheck-compatibility-amendment.md`. Авторские результаты внутри запроса кандидата прочитаны как контекст запроса, не приняты за независимый PASS.

База checkout: `e7f72847e17235d8edf4e07cedb706dbcd0e9156`, поверх неё проверены два продуктовых изменения. Полный источник идентифицируется digest manifest, а не одним HEAD:

| Объект | SHA-256 |
|---|---|
| Принятый исходный Source159 | `ff3527b6a2b855aa253233eb57e9be8adea002861bdc8c078a4004d03857c7ae` |
| Исходный согласованный patch | `f8bc4ef2b355acddaa3e6370f8d8fbc95dc7de3ca611f83f6a76fa5a9c27fd27` |
| Первый применённый Source159 | `390800d0c56699aeefe2f080e99d21fb5dbfe66a6157033ca69b312ace5c007f` |
| Финальный Source159 | `bfa1b6737ddec301431b55106063c4a31a435064096e544ce6673534734b3075` |
| Финальный `ClipLayoutPreview.tsx` | `d8e41f14f688a1275fe3e92e8e07f03924cd50420f2f3011bfff2041050d5cdd` |
| Первый `clip-layout.test.ts` | `ab80b8a14fd6f535828684025bdcb29b6454e540192f077398d9ecdb29172bbd` |
| Финальный `clip-layout.test.ts` | `6e0081cafec416dd71c659d7c21cdbcca97992f913975cfe4b4c7d0ef85d3e09` |

Ревьюер самостоятельно прочитал только `snapshot.manifest` accepted producer `release/source-qe-closed.raw.json`, пересчитал все 159 digest и оба производных manifest. **157 путей совпали**, отличаются ровно Preview и browser test. SHA patch из fenced diff и SHA OpenSpec/request из correction ledger проверены независимо.

Первый применённый снимок точно соответствует исходному patch. Финальный снимок дополнительно содержит разрешённую Root однострочную совместимость `Array.from` после настоящего TS2488; он не называется буквально равным старому bundle. Обратная замена только этого выражения в финальном тесте восстановила точный первый digest `ab80b8a…`. Продуктовый код и определения остальных тестов между снимками неизменны.

## Проверка контракта и потребителя

`ClipLayoutPreview.tsx:18–27`: `paint()` отказывает при отсутствии декодированного кадра; null context и исключение рисования проходят через существующий `pause()`/`unsupported` и возвращают false. True возвращается после всех операций рисования. `ready()` на строке 43 переводит состояние в ready только при true; отказ больше не перекрывается безусловным callback.

Потребитель проверен самостоятельно: `ClipLayoutChoice.tsx:56` принимает состояние; строка 254 блокирует кнопку при `preview !== 'ready'`; строка 178 повторно запрещает сам apply. `role=status` на строке 251 предъявляет фактическую недоступность. HTTP, worker, quota, persistence, shared geometry, оформление и публичные опции этим diff не меняются.

| Требование → риск | Проверка → наблюдение |
|---|---|
| FR-CANVAS-01/02 → отказ контекста ошибочно становится ready | Настоящий Chromium, null getContext, реальные React-компоненты и синтетический декодируемый MP4: статус unavailable, Apply disabled, 0 apply RPC — PASS |
| FR-CANVAS-01/02 → drawImage exception перекрывается ready | Тот же путь с исключением drawImage: unavailable, Apply disabled, 0 apply RPC — PASS |
| FR-CANVAS-03 → исправление блокирует здоровый кадр | Настоящий drawImage: ready, Apply enabled, 0 автоматических apply RPC — PASS |
| ADR-003/ZF-05 → нарушены retained timeline и pixels | Существующий test проверил пять позиций, source time и screen/camera pixels — PASS на первом снимке с тем же продуктовым кодом |
| ADR-003/ZF-10 → нарушена остановка соседних плееров | Существующий media arbitration test, включая уже выбранный клип и освобождение decoder, — PASS на первом снимке с тем же продуктовым кодом |
| FR-CANVAS-04 → выход за два пути | Независимый digest audit: 157/157 неизменны; два разрешённых пути и отдельная объявленная test compatibility delta — PASS |

## Независимые команды и реальные исходы

Cwd: `/home/clipmkr-zoom-screen-focus`; Node `v22.23.4`, Vitest `3.2.7`; PATH начинался с каталога этого Node. Оба запуска используют существующий canonical config и отдельный временный Vite cache, создаваемый fixture. Каждый процесс доведён ревьюером до terminal; product/test/consumer/config hashes до и после совпали.

Первый снимок, 5 PASS, 30 намеренно отфильтрованы, exit 0; wall 15.717 s, Vitest 14.98 s:

```sh
/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node scripts/test.mjs --config vitest.browser.config.ts tests/browser/clip-layout.test.ts -t '^(preview (null-context|throw-draw|healthy): readiness requires a successfully drawn decoded frame|native preview visits retained segments and both canvas regions use the current decoded source frame|every_media_play_pauses_the_other_two including already selected published player)$'
```

Финальный снимок, 3 PASS, 32 намеренно отфильтрованы, exit 0; wall 10.988 s, Vitest 10.23 s. Повтор ограничен изменёнными тестами после исправления TypeScript-совместимости, в рамках того же ещё открытого независимого прохода:

```sh
/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node scripts/test.mjs --config vitest.browser.config.ts tests/browser/clip-layout.test.ts -t '^preview (null-context|throw-draw|healthy): readiness requires a successfully drawn decoded frame$'
```

Независимая финальная проверка manifest, ledger и единственности compatibility delta, exit 0:

```sh
python3 /root/.config/clipmkr/zoom-screen-focus-20261111/canvas-correction-20261116/independent/verify_source.py
```

Пропуски не считаются PASS. Собственный проход не является полным browser suite. В частности, `native Next HTTPS real PG Redis and fenced Cloud source preview admit one durable layout operation` не запускался: это отдельная delivery qualification с настоящими DB/S3.

## Текущие авторские gates — отдельно от независимых запусков

Проверены фактические `*.command.json`, stdout/stderr текущего выполнения, а не прежний итоговый отчёт. Эти результаты не названы собственными запусками ревьюера:

| Снимок | Команда | Terminal |
|---|---|---|
| Первый `390800d0…` | `node scripts/test.mjs --config vitest.browser.config.ts tests/browser/clip-layout.test.ts -t '^(?!native Next HTTPS real PG Redis and fenced Cloud source preview admit one durable layout operation$)'` | 34 PASS, 1 excluded; exit 0; wall 102.358 s, Vitest 101.33 s |
| Первый `390800d0…` | `npm run typecheck` | **exit 2**, TS2488 на строке 444; 33.325 s. Failure сохранён |
| Финальный `bfa1b673…` | Три regression cases с тем же точным pattern, что выше | 3 PASS, 32 filtered; exit 0; 9.866 s |
| Финальный `bfa1b673…` | `npm run typecheck` | exit 0; 34.991 s |
| Финальный `bfa1b673…` | `npm run build` | exit 0; 44.407 s; предупреждение BullMQ о `@valkey/valkey-glide` в stderr |

Полные 34 UI-проверки не выдаются за повторно исполненные на финальном test digest. Решение не повторять их целиком обосновано точной заменой одного тестового выражения, независимым сохранением всех остальных source digest и повтором трёх затронутых сценариев. Build warning сохранён как ограничение: путь зависимости не исследовался этим bounded review; зависимости патч не меняет.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| CANVAS-COUNT | INFO | named-limit | 1 | codex | Frozen план ожидает 35 UI-проверок, фактическая collection содержит 35 всего: 34 UI и 1 excluded integration. Здесь и в текущем авторском учёте исправлено число; 35 PASS не заявляется |

## Границы доказательства

- Собственные пять/три browser cases исполнялись в Chromium; WebKit/ширины/темы входят в текущий авторский UI34, не в собственный повтор ревьюера.
- Новые тесты не содержат отдельного runtime assertion `paused` на canvas error; существующий вызов `node.pause()` проверен чтением. Автоматический apply проверен счётчиком реального fixture RPC. Реальная DB mutation не выполнялась.
- Предыдущие RED/кандидатные прогоны не использованы вместо applied-code checks. Отдельной мутации исходного патча ревьюер не запускал; прежний безусловный ready сопоставлен с oracle чтением.
- Обычный общий suite, численное coverage, реальные S3/music/CTA, migration safety, опубликованный VPS UI, ручной screen-reader проход, Cloud.ru и DNS этим ревью не закрываются.
- Закрытая native3 история — исходная граница задания. Ревьюер не открывал/сбрасывал native review и не изготовлял receipts; этот документ не является новой native-аттестацией журнала или разрешением на выпуск.

## Независимые артефакты

Raw evidence хранится вне Git: `/root/.config/clipmkr/zoom-screen-focus-20261111/canvas-correction-20261116/independent/`. Там сохранены оба manifest-аудита, исходный и финальный manifests, реальные execution metadata, stdout и hashes текущих авторских terminal logs.

| Артефакт | SHA-256 |
|---|---|
| `browser-5.log` | `16da978dea052c9015188dbbec0a183c5deb29c2f682e587f24d4d0de4f16bdf` |
| `browser-final-3.log` | `496942ca76844b073710789e53a44fed3b33b9ace3657b70c8e424c9824eb37a` |
| `execution.json` | `f399c8c386f3c768aaadcc5da5f24401229bc64c58df83da1fb2b2e5a821854f` |
| `execution-final-3.json` | `edcca6ffe98cdeecd5e56652de300a63627b20711409f9ded108a30898c38f94` |
| `verify-source-result.json` | `d11655a4aa26cef4e3aa37b8cff5422c66b2ae5c8114daf13283c793dfba2e21` |
