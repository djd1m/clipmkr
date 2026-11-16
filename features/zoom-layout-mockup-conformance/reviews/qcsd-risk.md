# QCSD: независимая оценка рисков SFDIPOT

Роль `qcsd-risk`, phase `ideation`, tier M, дата 16.11.2026. Итог: **GO / clean для полноты проектных safeguards**. Новых незакрытых HIGH/CRITICAL/BLOCKER недостатков дизайна не обнаружено; это не разрешение выпуска и не подтверждение работы будущего кода.

Назначенная модель `gpt-6-astra`, reasoning `xhigh`; отдельная сессия `/root/conformance_qcsd_risk`, family `owner-exception`. Вход — документы, затем самостоятельное чтение consumers. Предыдущие ревью и авторский PASS не использованы. Архитектура/план называют Astra своим автором: данный QCSD-отчёт независим по контексту, но **не заменяет отдельное cross-model Terra review этого плана**. Код новой фичи ещё не проверялся.

## Входы и привязка

Host nonce `648a76dc-4aa9-40f4-8604-5d803fb9061e`; measured revision `a1a7daea0e719964423c5250f716ad6b7858ef1e8799f86471c90cd92ee133bb`. Git HEAD при чтении `0cbe2e9194eaff9597341f91f04528097da2711a`. Это разные идентификаторы: revision обозначает manifest документов, HEAD — рабочую базу.

Прочитаны `01_requirements.md`, `03_adr/001-original-composition-compatibility.md`, `05_architecture.md`, `06_implementation_plan.md`, `owner-approval.md`, `03_shift_left.md`, `00_complexity_assessment.md`, локальные AGENTS/CLAUDE, core-cjm, review policy/model matrix, installed feature-adr §3.5 convergence contract и его QCSD reference. HAS_UI=true, HAS_UX=true, HAS_SECURITY=false означает отсутствие расширения модели доступа; regression-проверки доступа всё равно обязательны.

Все четыре SHA256 из host manifest независимо пересчитаны и совпали. Дополнительные прочитанные документы, которые текущий ideation manifest не включает:

| Документ | SHA256 |
|---|---|
| `06_implementation_plan.md` | `1e15df4b27845f08c7ddec31220fe3deac8c769f351d18d55fafbc9665132722` |
| `owner-approval.md` | `9cff0de2d45731d4c0c082d5716735645739940ee3d6cb0d2fa80f1d5097caa6` |
| `03_shift_left.md` | `f4666db31fe0764c39fa37fa00f3fc67d7334c66d049cf4255879a32c1326200` |

Самостоятельно прочитаны shared parser/planner, DB render/publication и layout consumers, migration032, migration runner, worker compositor/FFmpeg, UI Choice/Preview; targeted searches — music/CTA consumers. Не запускались tests, FFmpeg, browser, migration, deploy, dz checkpoints или convergence evaluate.

## Матрица SFDIPOT

P — вероятность 1..5, I — влияние 1..5, score=P×I. Числа — качественная оценка **исходного риска без предусмотренных мер**, а не статистика отказов и не измеренный остаточный риск. Меры в последней колонке спроектированы; их выполнение предстоит доказать на конкретной ревизии. Высокий исходный score сам по себе не означает пропущенный safeguard.

| ID | SFDIPOT | Риск и конкретный сценарий | P | I | Score | Предусмотренная мера и проверка |
|---|---|---|---:|---:|---:|---|
| R01 | Structure | Общий planner перепишет v1; прежний 01/02 изменится после music/CTA | 4 | 5 | 20 | ADR version→variant dispatch, замороженный v1, без upgrade-on-read; TASK-03 mixed-version music/CTA integration и canonical byte checks |
| R02 | Function | Новый canvas/native оставит pane y400..1200, обрежет camera02 y192 и низ screen02 | 4 | 4 | 16 | Архитектура full1080×1920 для v2 и запрет legacy tail crop; TASK-04 raster extents, TASK-06 pane mutation |
| R03 | Function | Preview и MP4 одинаково неверны, но parity объявляет соответствие исходнику | 4 | 4 | 16 | MC-03/TASK-02 независимый original DOM/CSS oracle, numeric RED на прежнем output; camera-position/order/scale mutations |
| R04 | Structure | Изменение shared helpers, фильтров или defaults повредит 03/null/v1/footer | 3 | 5 | 15 | Узкие opt-in v2 параметры, прежний filter order, неизменные mutation anchors; TASK-04/TASK-07 legacy/native/render checks |
| R05 | Data | Migration033 не принимает исторические rows либо допускает SQL NULL/строковую версию | 3 | 5 | 15 | ADR numeric version и IS TRUE; parser preflight останавливает rollout без нормализации; populated032→033→repeat, pg_constraint, row/key/credits hashes |
| R06 | Interfaces | Поздний worker публикует v2 вместо ожидаемого v1 либо чужого intent | 3 | 5 | 15 | Сохраняется canonical equality с version и existing fenced publication; TASK-03 `publication_rejects_composition_version_substitution` |
| R07 | Time | Потерянный apply response + локальный переход в v2 изменит submitted v1/key или вызовет повторный debit | 3 | 5 | 15 | Отдельный immutable submitted snapshot, existing replay/idempotency; TASK-05 unknown-v1 replay, doubleclick, lost-response и concurrent realPG cases |
| R08 | Operations | После v2 writes откат на pre-v2 image сделает stored requests нечитаемыми | 3 | 5 | 15 | ADR C0 совместимый reader/render/replay, сохранение migration033/JSON, запрет down/backfill; TASK-08 isolated C1→C0 rehearsal и отдельные C0 test results |
| R09 | Operations | Запись на неверный VPS/image или при stale evidence обойдёт визуальные/QA gates | 3 | 5 | 15 | TASK-06/TASK-08 bounded apply entrypoint сам вызывает guard, immutable host/source/image binding, recheck между фазами; negative test наблюдает ноль mutating calls |
| R10 | Function | Новая 02 столкнёт две строки captions/teaser с screen, camera, CTA или watermark | 4 | 4 | 16 | TASK-01 real libass bbox до K2, font48→46→44, stop при непомещении; AM-5 raster masks и неизменность footer/text/timing; это ещё не выполнено |
| R11 | Interfaces | UI молча объявит широкий screen найденной рабочей областью либо upgrade старого клипа выполнится при открытии | 3 | 4 | 12 | Явная upgrade-button, warning при выборе02, независимая height и reset reviewed; TASK-05 restore/poll/no-network/no-debit и достижимость reference ROI через UI |
| R12 | Platform | Odd/SAR/rotated/tiny ROI растянется, обрежется либо ложно заявит original match | 3 | 4 | 12 | contain/even bounded crop и explicit unsupported_geometry whole-source fallback без camera; TASK-07 pure odd/SAR/rotated + native fallback; conformance отдельно от fallback |
| R13 | Time | Camera станет статичной/сдвинутой во времени после cut_plan/compaction | 3 | 4 | 12 | Один decoder/timebase и уже compacted input, запрет freeze/loop; synthetic all-frame markers + реальные QA detector и continuous playback |
| R14 | Platform | Browser preview показывает camera, которую native detector отверг, либо mobile control недоступен | 3 | 3 | 9 | Разделены cameraAvailable fixture и настоящий detector proof; Chromium360/1440, WebKit390, keyboard/focus smoke; реальный QA01/02 со штатным detector |
| R15 | Data | Union изменений нарушит source/account/retention boundary или уничтожит старые MP4 при отказе rerender | 2 | 5 | 10 | Quota/access/retention логика переиспользуется; realPG foreign404/expired/stale/source-change, сохранение старых keys до publish; backup без S3 deletion и без восстановления поверх новых writes |
| R16 | Operations / Time | Смешанные readers/writers и активные jobs попадут в окно migration/deploy | 3 | 5 | 15 | Закрыть layout/music/CTA admissions, drain terminal affected jobs, backup, migration транзакционно, все readers до открытия writer; worker-stop при v2-renderer отказе, владеющая сессия ждёт terminal outcome |

## Проверенные основания и приоритет

Текущий код подтверждает причины наиболее дорогих рисков: `packages/shared/src/screen-layout.ts:54` принимает только v1; `:108` задаёт pane400/800; `apps/web/src/app/clips/ClipLayoutPreview.tsx:23` режет по этому pane; `apps/worker/src/render/screen-layout.ts:52` собирает соответствующий фон. Это baseline до исправления, не новая находка о реализованном v2.

`packages/db/src/render.ts:32` читает COALESCE intent/published.requested; `:93` сравнивает canonical requested перед публикацией. Поэтому замена v1 алгоритма опасна, а explicit v2 + сохранение comparison является содержательной мерой. `packages/db/src/migrate.ts` уже проверяет journal SHA и выполняет миграции в транзакции; новый CHECK всё равно нуждается в запланированной realPG проверке. В `ClipLayoutChoice.tsx:182` submitted хранится отдельно, а `:217` width сейчас меняет height: план адресует оба реальных consumer-контракта.

Приоритет исполнения: сначала typography qualification и исходный oracle; затем strict union/migration/compatibility; затем full-canvas и UI; затем mutation/guard, independent QE и изолированный rollback. Предложенный TASK DAG следует этим зависимостям. Нельзя объявлять R01/R05/R07/R08 устранёнными по одному screenshot или mock-backed тесту.

## Вердикт и границы доказательства

На review snapshot нет нового значимого риска, для которого отсутствует проектное решение или конкретный обязательный verification path. Поэтому собственные convergence conditions `[]`, verifications `[]`, verdict `clean`; авторского rework handoff не было. Новые amendments ради повторения уже принятых требований не нужны.

Остаточная неопределённость существенна: typography ещё должна поместиться в 105px ink band; C0/C1, migration033 и bounded executor ещё должны существовать и пройти свои реальные проверки. Наличие тестового имени и approval пакета не доказывает этот результат. До кода сохраняются TASK-01 qualification, настоящие K1/K2 и отдельное обязательное cross-model review; после кода — independent QE, exact revision/image proof, QA VPS и отдельная ручная приёмка владельца. Это границы уже принятого процесса, а не дополнительные условия данного review.

Операции review: чтение через `cat`/`sed`/`rg`, `git rev-parse HEAD`, пересчёт SHA256 Python hashlib. Команды завершились exit0; продуктовые тесты не выполнялись. Перед записью receipt повторно сверены nonce/revision, каждый manifest digest и дополнительный plan SHA. Сохранены чужие entries и поле author; evaluate остаётся за host.


## Focused verification после QT-01

16.11.2026, те же host nonce/revision. Прочитан фактический author handoff; изменён только план, SHA256 `83f3d971e21b0624b2003baeb169cc9a4ace592ebad5cae51fb8470bf5b4a9d4`. Проверен diff: stable Vitest command теперь явно выбирает `tests/zoom-layout-release.test.ts`; AM-7 требует его count/exit/skip на той же candidate revision и наблюдение fail-before-write самого executor. Это structural исправление связи safeguards с обязательным исполнением, а не wording.

Независимо прочитаны `package.json:19`, `scripts/test.mjs:3` и `vitest.config.ts:25`: `npm test` передаёт выбранные файлы непосредственно в Vitest run, include охватывает `tests/**/*.test.ts`, исключение browser не исключает этот suite. Риск R09 теперь имеет явно включённую обязательную команду; дополнительные продуктовые изменения или новые значимые риски этой дельтой не внесены. Исходная оценка недосмотрела omission команды; находка QT-01 принадлежит `qcsd-testability`, и её собственное закрытие остаётся за этой ролью.

Собственный verdict остаётся `clean`, conditions/verifications не расширяются. `authorAssessmentChecked=true`; structural `deltaVerification.implementationVerified=true` означает проверку исправленного плана в phase ideation, **не запуск будущего test/executor и не app QE**. Полное ревью и общий прогон не повторялись.

Прочитан новый `03_typography_qualification.md` (SHA256 `d74d89132252d989da9d23042a406eb5e5d243ab4054487df9d2d79846576153`): он сообщает bounded measurement 3/3 subtitle cases font46 и 8/8 footer/title cases. Это обновляет контекст R10 относительно первоначального отчёта; raw rasters/скрипты независимо не проверялись, подтверждение продуктовой интеграции из этой записи не следует. Typography не входила в исправление QT-01 и не используется как доказательство закрытия этого замечания.


## Focused wording verification заголовка ADR

16.11.2026: nonce `5c7603bd-9819-4f43-a899-3b61b893e6c5`, revision `0c2a871b57fc259a0dce47edc0aa24fb4d69dc8ad19d1873c1824c9da0673617`. Проверены фактический author handoff и узкий diff ADR: `## Решение` заменён на `## Decision`, добавлена русская поясняющая строка для машинного извлечения раздела.

Независимая проверка байтов: точное удаление только этой formatting delta восстанавливает SHA256 прежнего ADR `dc469c43221a1798e8ee55b9d1914b70415d95dd90a7ff1296f8bf02e197737a`. Текущий SHA256 — `c43b422ba76dc0fc60ebcccdc7648d85ebf037dcc5c8abe9b63bc9037682f58a`. Остальные host manifest hashes совпали. Текст решения, acceptance, Confirmation, safeguards, геометрия и откат не изменены; classification `wording` подтверждена.

Новых рисков нет, verdict `clean`; собственные conditions/verifications сохранены. Обновлены только собственные `authorAssessmentChecked` и `deltaVerification`/risk assessment с новой привязкой. Чужие условия не изменялись. Это проверка документа, без полного review, тестов, реализации или deploy; QT-01 остаётся в собственности testability.
