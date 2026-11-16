# C0: исправления после независимого review

16.11.2026. Author rework `gpt-6.1-sol high` по `reviews/c0-code-critic.md` и фактическим PG/native findings root. Это не независимое закрытие замечаний и не C0 image/build/deploy.

HEAD `49101377d1a1f06a72043480a15155b21ce31f2b` плюс накопленный C0 diff. Относительно прежнего `c0-freeze-final.json` изменены **только четыре тестовых файла**: browser/clip-layout, clip-layout.integration, clip-cta-rerender.integration, screen-layout-media. Все product/migration/oracle/approval hashes прежние. До правок текущие helpers реально вернули admitted/reasons[] и complete/diagnostics[]; логи контекста приватны.

## Исправления

- **C0-01:** crop присоединён к `[screenout]` внутри filter_complex с конечным `[sample]`; simple `-vf` удалён. Pixel comparisons, оба viewport360/1440 и их допуск5 сохранены. Оба browser case дошли до native/canvas pixel assertions и прошли.
- **C0-02:** только null-элемент mixed CTA fixture передаётся SQL NULL; непустые envelopes сериализуются. CHECK и runtime не менялись. Все шесть mixed v1/v2/03/null клипов дошли до rerender/publication; snapshot/cut_plan/version/quota assertions прошли.
- **C0-03:** существующий UI replay case параметризован v1/v2; оба сохранены и исполняются после настоящего reload. Проверяются readonly radio, отсутствие mutation до confirm и точные JSON canonical body/key после него; отдельный v2 draft сохраняется. Связанный real-PG `saved v2-%s readers and exact replay...` дополнен шестью concurrent pending replays для01/02: одна quota/job, прежние MP4 keys, неизменные credit_grant/video_credit_charge, затем прежние publication/succeeded replay checks. Это два дополняющих доказательства: browser transport/sessionStorage и реальный backend; единым live Next/S3 E2E они не называются.

## Native: воспроизведение, причина и узкий фикс фикстуры

Первый полный native run после диагностического уточнения samePixels: **exit1, 18 PASS / 1 FAIL**, 19 cases,80,00с wall. Значимый RED: `01 screen (4,1154.336): frame=0 channel=0 actual=186 expected=180`, delta6 при неизменном лимите4.

Изолированный эксперимент исполнил фактические planner/graph, исходные source ROI и ту же точку на FFmpeg8.1.3. Crop/scale RGB дал180/80/40; yuv444 —180/79/40. В штатном полном graph край дал186/77/34, соседние внутренние строки — около180/79/40. Контрольный experimental overlay format=yuv444 при той же насыщенной фикстуре дал180/79/40 и на проблемной точке. Нейтральный серый screen при **штатном неизменном graph** дал180/180/180 на той же точке. Эти результаты локализуют отклонение в chroma-edge processing YUV420, а не в source ROI/позиции композиции. Experimental format не перенесён в runtime.

Исправлена только синтетическая screen-подложка original native case: R=G=B=180+2*N, то есть теперь она также движется по времени. Независимая цветная camera sequence прежняя. **Все исходные точки, включая неудобную (4,1154.336), оба original01/02,20 кадров, no-camera и outside probes сохранены.** Expected pixels по-прежнему читаются из source; planner не создаёт oracle. Допуски pixel4 и original geometry2 не менялись; original HTML/JSON fixture не редактировались.

После фикса выполнен только затронутый native case: **exit0,1 PASS**,18 остальных NOT RUN (Vitest skipped из-за name filter),18,67с wall. Его all-frame screen/camera comparisons прошли. Полный19/19 на финальной ревизии не заявляется: оставшиеся18 прошли в предыдущем полном diagnostic run, их тела и исполняемый runtime после него не менялись. Повтор всего файла без новой причины не запускался.

## Проверки финального freeze

Приватный каталог всех перечисленных файлов: `/root/.config/clipmkr/zoom-conformance-implementation-20261116/`. `c0-fix-run.py` перед и после каждого запуска сверяет24 source/test hashes; env загружает без печати значений и проверяет точное имя `clipmkr_zoom_conformance_test` и Redis14. Логи stderr/stdout проходят редактирование известных credentials. Native использует maintained Docker argv/image `sha256:34abe462e4880dac27c644d8c7302fc95aeedfcd8be85cbc80e7b2ac718f9e09`, network none/read-only/--rm, без pull/build. Полные фактические argv/exits/duration/log hashes: `c0-fix-commands.json`; исходный argv — `native-invocation.private.json`.

| Запуск | Terminal result | Границы |
|---|---|---|
| c0-fix-native-diagnostic | exit1;18 PASS/1 FAIL;80,00с | Полный19-case файл до корректировки screen-маркера; diagnostic RED сохранён |
| c0-fix-native-targeted | exit0;1 PASS;18,67с | Original01/02/all-frame case;18 NOT RUN |
| c0-fix-pg | exit0;**44/44 PASS**,0 skipped;27,55с | CTA25 + layout19, настоящая тестовая PG; music suite здесь не повторялся |
| c0-fix-browser | exit0;**6/6 выбранных PASS**;23,56с | Savedv2-01/02, unknownv1/v2 reload/replay, native/canvas360/1440;35 NOT RUN |
| c0-fix-typecheck | exit0;6,39с | Приватный source-path конфиг с Next declarations; не stock npm typecheck/build |
| git diff --check | exit0 | Финальные изменения без whitespace errors |

Выбранный browser профиль использует source aliases, поскольку workspace dist не собраны. Chromium cases прошли; WebKit smoke, остальные35 cases и live Next/PG/Redis/S3 case не исполнялись. Это не полный browser QE и не acceptance без пропусков. Stock typecheck/build, image, independent re-review и общий acceptance остаются root.

Выполненные команды (рабочий каталог `/home/clipmkr`):

```bash
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-fix-native-diagnostic c0-fix-freeze-diagnostic.json native
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-fix-native-targeted c0-fix-freeze-final.json native-targeted -t 'v2 native original extents and every live camera frame'
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-fix-pg c0-fix-freeze-final.json pg tests/clip-cta-rerender.integration.test.ts tests/clip-layout.integration.test.ts --reporter=default --reporter=./scripts/test-skip-reporter.ts --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-pg.vitest.private.json
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-fix-browser c0-fix-freeze-final.json browser --config=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-browser.config.mjs --testNamePattern='^(C0 |v2_native_and_canvas_cover_original_composition_extents)' --reporter=default --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-browser.vitest.private.json
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-fix-typecheck c0-fix-freeze-final.json typecheck
```

Raw outputs: c0-fix-native-diagnostic.log, c0-fix-native-targeted.log, c0-fix-pg.log/.vitest.private.json, c0-fix-browser.log/.vitest.private.json, c0-fix-typecheck.log. Native mechanism experiments: c0-fix-pixel-diagnostic.cjs/.log/.json, c0-fix-pixel-444-control.cjs/.log и c0-fix-pixel-gray-control.cjs/.log; все три experimental invocations завершились exit0. Исходники во время прогонов не менялись.

Финальный `c0-fix-freeze-final.json` SHA256: `9e63f81f1373356dd6413d7563ce893c476a7c78f6d004d009a549c25d70a00d`. `c0-fix-working.diff` SHA256: `ebaef57c53a782b2f48d349346f6aac62cfc65f1cc5f7c1c76655af801e6b4a6`. Каждый финальный run вернул одинаковый freeze SHA до/после; последняя сверка также без drift. Hashes24 файлов включают untracked C0 inputs; tracked diff отдельно их содержимое не покрывает.

## Обучение и anti-drift

Pinned `npm run dz -- recall ... --project /home/clipmkr` выполнен до исправлений: exit0, SQLite UNREADABLE/native addon error, JSON fallback без совпадений. `npm run dz -- teach ... --type lesson-learned --domain clipmkr --project /home/clipmkr --no-mirror` завершился **exit1, store guard REFUSED: lexical store is unreadable**. Повторный recall: exit0, та же деградация и No matching patterns. Сохранение/извлечение урока не состоялось; reset/cold-start override не применялся. Конкретные observation/evidence/action сохранены выше и в приватных c0-fix-recall.log/c0-fix-teach.log/c0-fix-recall-after.log. Ремонт store вне этого scope.

Anti-drift: четыре тестовых исправления, без product/constraint/oracle/плана/согласований/state изменений. C1, runtime/prod DB, существующие jobs/credits/media, Docker build, Git commit/push и deploy не выполнялись. Остановка на C0 freeze для независимой повторной проверки root и построения совместимого rollback image.

## Follow-up C0-04: отрицательные background probes

16.11.2026. Прочитано originating Astra дополнение к `reviews/c0-code-critic.md`; замечание независимо подтверждено: и background24, и нейтральный source180…218 удовлетворяли max−min≤1. Исправлен только `tests/screen-layout-media.test.ts`: в прежних outside points и центре no-camera hole все20 кадров сравниваются по каждому RGB-каналу с **независимым фиксированным [24,24,24], допуск≤1**. Фактический graph проверен: background задаётся `drawbox=c=0x181818:t=fill`; его значение не импортируется/не вычисляется как oracle. Положительный native run подтвердил соответствие этому ожиданию. Нейтральный движущийся screen, RGB camera sequence, исходные точки, parity4 и geometry2 сохранены. Runtime и original oracle не изменены.

Добавлены два временных test-only raster mutation контроля, каждый на отдельном freeze. В helper render после фактического compositor добавлялся FFmpeg drawbox нейтрального source-цвета180: первый — полосой непосредственно ниже screen01, второй — в верхней области no-camera02. Planner/geometry/expected probes не менялись. Старый predicate принял бы этот RGB как ахроматичный; новый реально отверг его. Инъекции не остались в репозитории. После каждого terminal RED исходник восстановлен байт-в-байт из сохранённого green source; проверены SHA файла и все24 bindings финального manifest до следующего этапа.

| Адресный запуск | Фактический terminal outcome |
|---|---|
| c0-outside-red-screen | exit1,12,92с; numeric RED в `(4,1162.336)`, frame0/channel0: actual180, expected24, delta156>1 |
| c0-outside-red-hole | exit1,18,51с; numeric RED в `(842.4000000000001,289.248)`, frame0/channel0: actual180, expected24, delta156>1 |
| c0-outside-green | **exit0,1 PASS**,18,72с; оба01/02, screen/camera all-frame, outside и no-camera hole probes прошли после удаления инъекций |

Каждый запуск выбирал только original native case; остальные18 NOT RUN (Vitest filtered/skipped). Это не новый общий19/19. Предыдущие PG/browser/typecheck исходы выше сохраняют свои ревизии; повтор этих неизменённых проверок не выполнялся. Все три real native subprocess завершены, источник не менялся во время запуска.

Реальные команды из `/home/clipmkr`:

```bash
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-outside-red-screen c0-outside-freeze-red-screen.json native-targeted -t 'v2 native original extents and every live camera frame'
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-outside-red-hole c0-outside-freeze-red-hole.json native-targeted -t 'v2 native original extents and every live camera frame'
python3 /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-run.py c0-outside-green c0-outside-freeze-final.json native-targeted -t 'v2 native original extents and every live camera frame'
```

Новый текущий freeze: `c0-outside-freeze-final.json`, SHA256 **`2fd933cd1d2eec472a0799dc46612572b24d8b00a72b6e75e5fbcf8178cadf4e`**. Test SHA256: `1d4ce01ee63f3202b78b12f68e91ddebdaa87dabcc9bfb0cab6133203f085582`. Накопленный tracked C0 diff `c0-outside-working.diff`: `28c58e467b7d9cb7e6c3693eacf6e42964e727ab7e50176639b7784cfc97126f`. От прежнего C0-fix manifest отличается только этот test; остальные23 hashes прежние. Green freeze до/после совпадает, восстановленный source равен backup; финальная сверка без drift.

Приватные evidence в прежнем каталоге: `c0-outside-commands.json` содержит actual Docker argv/exits/time/raw log hashes; три одноимённых `.log/.json`, red manifests, `c0-outside-restore-screen.json`, `c0-outside-restore-hole.json`. Green backup и оба mutation source сохранены как `c0-outside-*-source.ts`; mutation bytes проверены по фактически исполненным red manifest hashes. RED screen log SHA256 `a0b53c16f17d8b3fb298e48d754a282d716db001694c2c23214075c8210ef62c`; RED hole `0cbe77a9aa750e9c3744f59c087c4a450e9346defc4c6e5592a8be59d171a593`; GREEN `53a304e1070d6498f68139f263e053d02345ccb82ff4314edfa61f037e71bccc`.

Pinned recall до правки: exit0, unreadable SQLite→JSON fallback без совпадений. Новый teach подтверждённого C0-04 урока: exit1, store guard REFUSED. Повторный recall: exit0, один прежний нерелевантный ui-acceptance результат; новый урок не извлечён и сохранённым не объявляется. Store guard не сбрасывался/не обходился. Логи `c0-outside-recall.log`, `c0-outside-teach.log`, `c0-outside-recall-after.log` приватны.

Anti-drift follow-up: один test и это дополнение отчёта; без runtime/oracle/approval/state/Git/build/deploy/C1 изменений. C0-04 передаётся root на независимую проверку этого diff; авторский GREEN не объявляется независимым закрытием замечания. Остановка после freeze и terminal результата.


## Pre-C0-commit: baseline lint в synthetic drawImage override

16.11.2026. Подтверждено чтением HEAD: explicit `...args:any[]` и `args as any` существовали до C0 в затронутом browser test. Они заменены узко: аргументы допускают точные DOM arities3/5/9 (`CanvasImageSource` и `Parameters<typeof draw>`), `this` типизирован как `CanvasRenderingContext2D`; исходный метод вызывается `Reflect.apply(draw,this,args)` с сохранением receiver, числа и порядка аргументов. Счётчик вызовов и synthetic throw/null/healthy поведения прежние. Нет any/suppression, runtime/style/oracle изменений. Файл остаётся498 строк, ниже500.

После правки заморожены все24 файла. От предыдущего outside freeze отличается только `tests/browser/clip-layout.test.ts`. Затем последовательно выполнены только запрошенные проверки; все процессы завершены, hashes до/после каждого запуска совпали:

| Команда | Фактический результат |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit --project /root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-typecheck.json` | exit0,6,01с; source-path config с Next declarations, не stock npm typecheck |
| `node node_modules/vitest/vitest.mjs run --config=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-fix-browser.config.mjs --testNamePattern=^preview (null-context\|throw-draw\|healthy): --reporter=default --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/c0-lint-preview.vitest.private.json` | exit0,10,77с;3/3 выбранных preview cases PASS;38 NOT RUN по фильтру, не полный browser QE |
| `npm run lint` | **exit0**,1,55с; штатный lint всего проекта |

В browser argv pattern передавался одним аргументом, без shell-интерпретации. Actual argv/exits/time/log hashes сохранены в `c0-lint-commands.json` приватного каталога; raw logs: `c0-lint-typecheck.log`, `c0-lint-preview.log`, `c0-lint-stock.log`; JSON assertions: `c0-lint-preview.vitest.private.json`. Native/PG и остальные browser cases не повторялись. Прежние исходы выше сохраняют свои snapshots и не объявляются новыми общими результатами.

Новый текущий `c0-lint-freeze-final.json` SHA256: **`94ac41ad4fc1a3d7889ab0d59c426cd4f4174ed81b2b8868630019cba14a4036`**. Browser test SHA256: `35060bea59c2f80a63eee49e78ab8866d71c4034518af9b14d9f357a2671086b`. Накопленный tracked `c0-lint-working.diff` SHA256: `a045c146518fb2bf073757fa599e7a02d1a7d60a979a4ca8f6cc46a3a6b26f6e`. Финальная сверка24/24 без drift. Исходники заморожены, C1/Git/build/deploy и reviewer report не изменялись. Остановка для root.
