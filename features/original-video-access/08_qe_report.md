# Независимый SOURCE/QE: original-video-access

Текущий результат SOURCE repair 2: **B, четыре исходных условия независимо проверены и закрыты reviewer**. Новых подтверждённых product defects нет. Общий regression остаётся историческим FAIL с отдельно проверенными исправлениями; native evaluate и поставка — следующие этапы. Финальная привязка и evidence находятся в разделе Focused repair 2 FINAL.

QE-VERDICT: B

## Исторический результат первичного ревью R1

**NEEDS FIXES.** Три подтверждённых нарушения UI-контракта и один незакрытый обязательный regression check. Защищённое чтение, bounded streaming, real PostgreSQL authorization и synthetic Cloud.ru Range/download прошли выбранные независимые проверки. Это не разрешение merge/deploy и не полный зелёный прогон проекта.

Проверяющий: отдельная сессия `/root/original_video_source_qe`, запрошена `gpt-6-astra xhigh`; автор кода — `gpt-6.1-sol high`. Provider attestation не получена. Применены code-critic и pinned feature-adr Step 8/security/regression/mutation/risk protocols в reference mode; AQE runtime не устанавливался. Действует owner-approved cross-model exception из `docs/review-policy.md` и `docs/model-matrix.md`; native role `qe-primary`, family `owner-exception`.

## Привязка и независимость

- SOURCE revision: `98d1ce14c1631fa3c2b1731b967fc86fa341992e9f60523b15d5bf48f4f40000`.
- Nonce: `c5a4100f-72f7-4b66-89c3-112ce653d94f`.
- Native journal: `6d2e9909-b2be-450c-ad3b-918feb3ce174`; cycle: `e03b900e-6c12-4cc2-aa26-2bd2ee32c372`.
- Base: `bb1184fe776da626a0039d1575dd75566aa2c086`.
- Plan SHA: `2ba770a68dc012c8d1ede6b71b5b8bd485a10225648bb82e0e8ef01a92957405`.
- UI states approval SHA: `6521026a864be1ca323cd082ecb402360062bd12b65a1e5fae71ab67ffe10953`; OpenSpec SHA: `87dd40a3cb7ae5975dd25385a01808137011cb2fe694b829ec8ce04ee35ac77f`.

Все 38 manifest entries самостоятельно сверены до и после ревью: **38/38 совпали**. Прочитаны changed files, новые тесты, измеряемые зависимости, auth/store, upload/retention/clip consumers и mutation anchors. Исторические pending-формулировки frozen requirements/ADR сверены с фактическими `ui-approval.md` и 06, не объявлены отсутствием approval.

До freeze изучались только требования. Авторские выводы не были входом самостоятельного чтения и первых probes; terminal evidence автора сопоставлено после этого. Frozen worktree не изменялся, кроме этого разрешённого выходного отчёта и собственной native receipt. Подготовительная `reviews/independent-source-review.md` не менялась.

Private evidence root далее `Q=/root/.config/clipmkr/original-video-access-20261111/source-qe`. В `Q/copy-r1` исходные 38 bytes совпадали с host; workspace links ведут внутрь копии. У существующего original browser test отдельно измерена единственная instrumentation delta: evidence path из `author/browser` в `source-qe/browser`, SHA `d4e6b614117d3e8deedfa8258f91fe0388c94ccb84ab71a7125cfe67cf163b9a` → `21ce979fa40672e4a0eef4847db820612fa5289872a7e5221ea914382e81bd15`. Новые независимые probes находятся только в private copy. Две согласованные мутации выполнялись последовательно только там и полностью восстановлены.

## Подтверждённые находки

### OQ-SOURCE-1 — HIGH: начальный HTTP-сбой объявляется несовместимым форматом

`apps/web/src/app/videos/[videoId]/OriginalSource.tsx:65–67` считает любой native MediaError 3/4 доказательством codec failure и выходит до metadata recheck. В настоящем Chromium initial media GET **503, 404 и 429** до первых playable bytes дал `MediaError.code=4`, `readyState=0`. Во всех трёх случаях metadataReads осталось **1**, viewer показал «Браузер не может воспроизвести исходник» и предложение скачать файл. Это сетевые ответы, не доказательство неподдержанного codec; согласованное различение missing/temporary error/limited теряется.

Независимый отрицательный оракул: после первоначального ready metadata реальные media HTTP503/404/429 и соответствующее новое состояние metadata; ожидались одна bounded recheck и честное состояние по 05. Все три assertions RED на frozen source. Evidence: `Q/qe-browser-probes.log`, `Q/browser/qe-http-{503,404,429}.json` и PNG; native error не подменялся dispatchEvent.

Условие закрытия: транспортный отказ до декодирования не выдаётся за codec; одна проверка доступа каждой явной попытки применяет таблицу 05, без auto retry/play. Настоящий unsupported codec остаётся корректным отдельным случаем. Добавить regression oracle для initial HTTP error, сохранив существующие ready/error-table проверки.

### OQ-SOURCE-2 — HIGH: устаревший recovery snapshot запускает звук после Back → Watch

`OriginalSource.tsx:31,64,81–82` сохраняет `resume.paused=false` при ошибке и использует его во всех дальнейших loadeddata. Воспроизведено: настоящий playable MP4 → Play → TCP reset → native code2 с `paused=false,currentTime=7` → explicit Watch recovery → пользователь Pause → Back → Watch. После нового открытия `paused=false,currentTime=7.144572`: source снова играет, хотя пользователь остановил его и вышел из просмотра. Это нарушает FR-2 «Смотреть без autoplay» и сохранение актуального paused state.

Evidence: независимый `qe_reopen_after_recovery_is_paused`, RED; `Q/browser/qe-reopen.json`, `Q/qe-browser-probes.log`. Recovery после явного retry допустим; дефект — перенос старого разрешения play на последующее открытие после Pause/Back.

Условие закрытия: recovery state ограничен соответствующей попыткой; после Pause/Back/выбора клипа повторное открытие не играет автоматически. Сохранить восстановление позиции и допустимое явное recovery текущей попытки, один слышимый media и DOM выбранного клипа.

### OQ-SOURCE-3 — HIGH: light theme делает сообщения внутри media frame нечитаемыми

`apps/web/src/app/videos/[videoId]/OriginalSource.module.css:8–11` сочетает тёмный `--media-bg` со светлотемными тёмными `--ink`/`--muted`. На реальном DOM light theme заголовки unsupported/playback-error имеют `rgb(32,32,32)` на `rgb(29,40,34)`: **1.0698:1**; audio caption — **2.0750:1**. Текст ошибки практически исчезает. В согласованном states.html light frame светлый; readable state является частью утверждённого UX, а не заявлением общей WCAG-сертификации.

Evidence: собственный просмотр `390-light-playback-error.png` и `1440-light-audio.png`; независимый computed-style probe `qe_light_media_statuses_retain_readable_contrast` RED, `Q/browser/qe-light-contrast.json`, `qe-contrast-*.png`. Существующие 32 state/viewport/theme geometry snapshots и hover-contrast assertions прошли, но не проверяют контраст текста в frame.

Условие закрытия: ошибки, пояснения и audio caption читаемы в обеих темах при approved Cabinet green tokens; сохранить geometry/controls и добавить соответствующий отрицательный oracle.

### OQ-SOURCE-4 — HIGH: обязательная существующая browser-регрессия не доходит до assertions геометрии

`tests/browser/ux-simplification.test.ts:192` ищет retention paragraph по «Хранится до», тогда как неизменённый `apps/web/src/app/clips/ClipCard.tsx:76` выводит «Доступно до». `getBoundingClientRect` вызывается на undefined. Самостоятельный targeted run воспроизвёл отказ Chromium и WebKit; `git show bb1184…` подтверждает обе несовместимые строки уже в базе. Это **baseline test defect, не новая product regression**. Наличие AM-8 export само по себе не закрывает обязательный full browser gate.

Evidence: `Q/qe-ux-targeted.log`: AM-8 primary path 2 PASS, retention geometry 2 FAIL; авторский terminal `author/approved-browser-regression.log` независимо сопоставлен после собственного чтения: 92 PASS / 2 FAIL, 477.58 s. Условие закрытия: узко привязать locator к существующему retention DOM/контракту, сохранив порядок title/player/download/retention/More, media identity assertions и guards; актуализировать разрешённый plan scope перед изменением. Повторить затронутые проверки и закрыть обязательный общий gate на итоговой ревизии.

## Собственные команды и результаты

Node: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node` 22.23.4. Private runner `python3 Q/run.py <name> ...` запускает `[Node, Q/copy-r1/node_modules/vitest/vitest.mjs, run, ...]` из `Q/copy-r1`; env читается в память из согласованного private JSON. Полный argv, elapsed, exit и SHA лога — `Q/<name>.json`. Секреты/подписи в публичный отчёт не выводятся.

| Run / аргументы после имени | Фактический исход |
|---|---|
| `qe-backend tests/qe-original-contract.test.ts tests/original-file.test.ts tests/original-file.integration.test.ts tests/original-media-type.test.ts tests/s3-public-endpoint.test.ts tests/guest-pack.test.ts -t '^(?!.*original_stream_survives_header_deadline_and_aborts)'` | exit 0, **42 PASS**, 10.677 s; один 125 s case намеренно excluded, не собственный PASS |
| `qe-cloud tests/original-cloudru.test.ts` | exit 0, **1 PASS**, 6.870 s; real Cloud.ru 200/206/416, SHA download, actual old signature 403 после expiry и fresh signing; receipt complete |
| `qe-browser-probes --config vitest.browser.config.ts tests/browser/qe-original-probes.test.ts` | exit 1, **4 assertion FAIL**, 8.553 s: OQ-SOURCE-1/2 |
| `qe-browser-contract-built --config vitest.browser.config.ts tests/browser/original-video-access.test.ts -t '^(?!.*native Next HTTPS)'` | exit 0, **15 PASS**, 45.410 s; native Next case intentionally excluded, не PASS |
| `qe-light-contrast --config vitest.browser.config.ts tests/browser/qe-original-probes.test.ts -t qe_light_media_statuses_retain_readable_contrast` | exit 1, **1 assertion FAIL**, 4.906 s; остальные 4 probes excluded, не PASS |
| `qe-ux-targeted --config vitest.browser.config.ts tests/browser/ux-simplification.test.ts -t 'primary_path_and_context\|approved mobile title player download retention More order'` | exit 1, **2 PASS / 2 FAIL**, 7.898 s; остальные 73 excluded, не PASS |

Итого выбранные немутированные проверки: **60 PASS / 7 FAIL**, не процент покрытия проекта. Проверены real AuthService/PgAuthStore и PostgreSQL: 56 сочетаний foreign/owner/revoked/expired/inactive/anonymous/bad-cookie × GET/HEAD × обычный/metadata/download/guest-claim запрос; storage вызовов ноль. Own HEAD с Range остаётся full-size/no-sign; unknown/deleted/bad UUID дают 404. Account/session/video/job/credit/growth/quota snapshots не изменились.

Положительные browser cases проверили selected ClipCard DOM identity, pause/unload/focus, zero clips/late poll, canvas pixels, native MP4/M4A, hash скачивания, WebKit playback, восемь states на 390/1440 dark/light и error metadata table. Визуально дополнительно исследованы representative light/dark playback-error, audio и no-clips screenshots; geometry PASS не означает полное совпадение макетов или универсальную accessibility-приёмку.

Два ранних запуска существующего browser file в disposable copy завершились **до тестов**, потому что копия намеренно не заимствовала mutable workspace dist: отсутствовали `shared/upload`, затем entry `@clipmaker/db`. Они сохранены как NOT-ESTABLISHED в `qe-browser-contract.log`/`qe-browser-contract-retry.log`; не дефекты продукта и не PASS. Затем собственный `node node_modules/typescript/bin/tsc -p packages/{shared,db,s3,queue}/tsconfig.json` построил четыре локальных пакета (все exit 0), после чего targeted browser run прошёл. Первый фильтр также был уточнён до настоящего имени excluded native Next case; этот первоначальный run не собрал ни одного теста.

## Дискриминация и обязательные gates

Согласованные semantic mutations в copy:

| Мутация | Настоящий отрицательный oracle | Исход |
|---|---|---|
| Ownership SQL: `(v.account_id=$2 OR true)` | real PG/Auth foreign request должен дать 404 до storage | RED exit 1 / AssertionError → восстановленные bytes GREEN exit 0 |
| Не очищать header timer после headers | реальный loopback marker через 250 ms при header deadline 75 ms; затем request abort закрывает socket ≤2 s | RED exit 1 / AssertionError → восстановленные bytes GREEN exit 0 |

Original hashes после мутаций совпали. Первая timer-red дала настоящий `TimeoutError`; она сохранена, но не названа assertion proof. Только private oracle дополнен явной проверкой отсутствия преждевременного read error, затем эта узкая RED/GREEN пара повторена. Evidence: `Q/mutations.json`, `Q/mutation-header-deadline-explicit.json` и все red/green logs. Fake timers не применялись.

Обязательный авторский OT-TEST-1 прочитан отдельно: `author/final-lifecycle-backend.log`, marker **125001 ms**, abort→close **7 ms**, test **125054 ms**, параллельный legacy cutoff assertion проходит; 13/13, Vitest duration 130.63 s. Это **авторский run**, не мой повтор. Его 32-file mapping `author/final-frozen-source.json` самостоятельно совпал 32/32 с текущими bytes; post-run AM-8 delta относится к fixture. Исторические промежуточные зелёные прогоны не объявлены полной проверкой SOURCE.

Canonical CLI: `[Node, /home/clipmkr/node_modules/@dzhechkov/harness-cli/dist/bin.js, ...]`, cwd `/home/clipmkr-original-video`.

- `amendment-check --feature-dir /home/clipmkr-original-video/features/original-video-access --project /home/clipmkr-original-video --json`: exit 0, **8/8 resolved**. Имена не доказывают полноту сценариев; пробелы AM-6 и visual state oracle описаны выше.
- `guard check --op code --project /home/clipmkr-original-video --json`: exit 0/pass, hard violations нет; `signature-fresh` NOT-ESTABLISHED.
- `guard check --op publish --project /home/clipmkr-original-video --json`: exit 0/warn, `no-stubs` checked; soft `agents-md-policy-sync` warning. `rounds-closed`, `rounds-traced`, `signature-fresh` и другие перечисленные в raw JSON capabilities NOT-ESTABLISHED. `.dz` audit-store был absent, аудит этой команды не записан. Это не разрешение publish.
- `discrimination-check --test tests/original-file.test.ts --name original_revision_tracks_upload_identity --base bb1184fe776da626a0039d1575dd75566aa2c086 --runner 'npx vitest run' --timeout 20000 --json`: exit 0, **CANNOT_ISOLATE**, `measurementValid=false`, `baseline-dependency-unavailable`; инструмент не атрибутировал новый import `apps/web/src/server/original-file` в предфичевой базе. Не PASS и не доказательство дефекта теста. Реальные semantic mutations — отдельное доказательство; они не переименовывают этот результат в успешный baseline gate.

## ADR fitness и code/spec anti-drift

| Контракт | Независимая оценка на этой ревизии |
|---|---|
| ADR-001 | Decision-shaped, один same-origin read seam, контекст/ранжированные drivers/options/rationale/negative consequences/revisit/owner/Confirmation присутствуют. Proposed — историческое состояние до checkpoint; actual approvals прочитаны. Confirmation-to-test links существуют; implementation closure блокируют findings и named limits, не отсутствие ADR |
| FR-1 | Компактная строка и actual metadata присутствуют; audio label/readability охвачена OQ-SOURCE-3 |
| FR-2 | Workspace/selection/DOM/zero clips/focus/single media положительны; no-autoplay нарушен OQ-SOURCE-2; light state visibility нарушена OQ-SOURCE-3 |
| FR-3 | Attachment, MIME/extension, безопасное имя, streaming download/hash — PASS в выбранных проверках |
| FR-4 / NFR-1 | Real session/active account/ownership/deleted/UUID gate, owner не получает чужой файл; негативные GET/HEAD/Range до storage — PASS |
| FR-5 | Backend incomplete/missing/outage разделены; UI initial transport failure нарушает OQ-SOURCE-1 |
| FR-6 | Server-internal fresh signing, same-origin, real 206/416, expiry403 и bounded abortable stream — PASS; устаревшее UI paused state — OQ-SOURCE-2 |
| FR-7 | Magic/container detection и native audio/video/unknown fallback присутствуют; ошибочная network→codec классификация и light readability — OQ-SOURCE-1/3 |
| FR-8 | Нет новых jobs/credits/growth/retention writes; real DB read snapshots неизменны |
| NFR-2/3/4/5 | Private no-store/no-referrer/nosniff, локальный sniff cap4096, metadata вне poll, legacy signer сохранён, реальные Cloud.ru probes; no new env/schema/services |
| Shared seam | Единственный backend leaf, fixed v1 vector PASS, root barrel не экспортирует Node crypto, wildcard package export сохранён |
| Regression / AM-8 | Навигационный stub diff узок, primary path двух engines PASS; обязательный retention geometry case остаётся RED — OQ-SOURCE-4 |

Не выявлено расширения на jobs, payments, quota accrual, retention policy, migrations или production account/media. Наличие старых originals, вечное хранение, любые codecs, proxy capacity для полноценной 90–120-минутной production сессии и общая WCAG conformity не заявляются. Полный `npm test` на финальной repaired revision и delivery acceptance остаются обязанностью следующего этапа; текущая общая browser regression не зелёная. Собственного повторного native Next/HTTPS/real-login E2E не было: существующий тест прочитан, его авторский run — supplemental evidence, не собственный PASS.

## Cleanup и provenance

Все собственные процессы дождались terminal result. `qe_original_*`/`original_*` test schemas: **0**. Собственный Cloud receipt: **1/1 complete**, один synthetic key в разрешённом `tests/site/original_<uuid>/`, uploads 0; оба SDK clients bound existing guard, native fetch также fenced. Клиенты/браузеры/loopback servers закрыты; Redis не очищался. Ресурсный lease возвращён root. Evidence хранится private 700/600, без signed URLs/secrets в этом отчёте.

`Q/manifest-start.json`, `copy-preparation.json`, `manifest-end.json` и per-run receipts позволяют сверить bytes/команды/исходы. Actual host/nonce не менялись, copy не объявлялась отдельным native cycle. Фиксация условий ниже принадлежит самому reviewer; root выполняет только subsequent native evaluate/repair admission.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| OQ-SOURCE-1 | HIGH | fixed | 1 | codex | Initial HTTP failure incorrectly classified as unsupported codec |
| OQ-SOURCE-2 | HIGH | fixed | 1 | codex | Stale recovery state starts playback after Pause and Back |
| OQ-SOURCE-3 | HIGH | fixed | 1 | codex | Light media frame makes status text unreadable |
| OQ-SOURCE-4 | HIGH | fixed | 1 | codex | Required baseline retention geometry check fails before assertions |

## Native receipt и Step-8 ledger

Final verdict этой initial review: `no-go`, четыре исходных структурных условия; исправления не проверялись и не помечены `implementationVerified:true`. Своя receipt: `.fa-state/review-convergence-qe-review.json`, под согласованной private lock с точным current host binding. Supported Step-8 ledger writer выполнен один раз после проверки отсутствия resumed QE checkpoint, без `--auto`; token/cost/time metering оставлено unavailable, cross-family=false, cross-model=true. Фактический ответ writer (exit 0):

```json
{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/home/clipmkr-original-video/.dz/feature-adr/run-cost-ledger.jsonl"}
```

Ledger receipt подтверждает запись фактов ревью, а не закрытие SOURCE gate. Native evaluate выполняет root; четыре условия остаются открытыми.

## Focused repair 2 — проверка до final common signal

Промежуточная SOURCE revision `842d135c8db46f6a4fb6eeab701eb528e3fda68a4bcfb12f2c93eaea8d4dd30e`, nonce `38be94ca-3f96-4182-aa19-b2cddbbab0f3`, cycle `993f0e6a-a71a-407e-b1a9-f646d3fae878`. Это ещё не R2 closure и не новая initial review. Собственная formal R2 receipt не записывалась: root разрешил только static и local native UI probes до отдельного FINALCOMMON. Все четыре originating conditions сохранены без изменения смысла и текста.

Независимо сверены 38/38 SHA до и после UI checks. Изменены только `OriginalSource.tsx`, `OriginalSource.module.css`, два browser test files и root-amended 06 (`b243769bbb01329f6daf583b2a3edee2742579971cbbbd6f4623320662e990fb`). Backend/shared/stream/signer/auth/schema и измеряемые clip/retention consumers побайтно совпадают с R1; оснований повторять собственные PG/S3/125-second runs не возникло. Прочитаны вся дельта, новые assertions, AM-8/9/10/11 и фактический шестипольный author handoff `source-author-rework-r2.json` SHA `c03c26bd88e2546243d57904d310904f8ab6a9c9c737074ac55ad88275bddb5b`.

Копия `Q/copy-r2` изолирует workspace links; существующие независимые R1 probes перенесены с единственным изменением evidence directory. `Q/r2/run-ui.py` не загружает private env и удаляет inherited DB/Redis/S3 credentials; запускает только local Vite/HTTP и Chromium/WebKit. Никаких DB/S3/Redis/current Next build/Docker действий в этой focused phase не выполнялось. Разрешённые общий regression/build ресурсы остаются у автора.

| Фактический собственный R2 run | Исход |
|---|---|
| `run-ui.py own-r1-oracles tests/browser/qe-original-probes.test.ts` | 5/5 PASS, exit 0, 10.582 s; исходные assertions не ослаблены |
| `run-ui.py source-ui tests/browser/original-video-access.test.ts -t '^(?!.*native Next HTTPS)'` | 22 PASS, один намеренно excluded native Next case, exit 0, 66.340 s |
| `run-ui.py ux-targeted tests/browser/ux-simplification.test.ts -t 'primary_path_and_context\|approved mobile title player download retention More order'` | 4 PASS Chromium/WebKit, exit 0, 17.960 s; остальные 73 excluded |
| `run-ui.py transition-race tests/browser/qe-original-transition.test.ts` | 1 assertion FAIL, exit 1, 9.789 s — незакрытая ветка OQ-SOURCE-1 |
| `run-ui.py transition-race-zero-clips tests/browser/qe-original-transition.test.ts` | 1 assertion FAIL, exit 1, 8.783 s; уточнён только setup до корректного clips=[] при stale uploading, ожидания прежние |

Положительные checks включили настоящие initial HTTP503/404/429, действительный unsupported MOV/qtrle, recovery→Pause→Back/clip→Watch, один слышимый media, selected DOM, native audio/video/canvas/download, прежние states/error table и оба browser engines. Computed light contrast теперь **16.2933:1** для status h3 и **7.3396:1** для audio caption; текущие light screenshots самостоятельно просмотрены. Исходный retention locator исправлен ровно одним литералом; order/identity assertions и guards сохранены.

**OQ-SOURCE-1 остаётся неполностью закрытым:** новая `read()`/generation ветка может оставить ложный pending state. Воспроизведение: page имеет ещё stale `video.status=uploading`, но завершённый source уже возвращает ready metadata; clips=[]; Watch получает настоящий native HTTP503. Единственный error recheck удерживается; штатный пятисекундный poll сообщает rendering и запускает предусмотренный transition metadata read. Он отменяет старый read и возвращает ready. Старый `read()` возвращает undefined; `mediaError` пропускает `setPlayback`, поэтому viewer остаётся «Проверяем исходник…» при ready row и отсутствии media, вместо согласованного playback-error. Это не новая формулировка condition, а нарушение прежней таблицы 05 при interleaving двух предусмотренных reads. Auto play/reload не возникли, но pending перестал соответствовать действительности.

Последний отрицательный probe использует native HTTP failure и реальный 5-second timer, без fake clock/error dispatch. Test SHA `31db94cc576ed02a2bce24109c31c2a63127098cfa006d629e438d8519b95a1a`; log `Q/r2/transition-race-zero-clips.log` SHA `4c718177ff30e408dba613b4ed334e06d39cfc019a11aec6f6a91dc1ab96835b`; observed state — `Q/r2/browser/qe-transition-during-recheck.json`. Авторская оценка `newRisks:none-identified` пока не подтверждена из-за этого interleaving; root уведомлён до формальной receipt. Common run автора в полученном handoff обозначен RUNNING, не PASS. Все собственные local UI процессы дождались terminal outcome.

## Focused repair 2 FINAL — независимое закрытие SOURCE

Текущая оценка целой feature tier M: **B**. Четыре исходных условия самостоятельно проверены на исправленной реализации; новых подтверждённых product defects не найдено. Native verdict reviewer — `clean`; окончательный native evaluate выполняет root. Это оценка SOURCE, не разрешение поставки или заявление полного нового зелёного прогона. Исторические R1 и промежуточный R2 выше сохраняют фактические RED и ограничения своих снимков.

Final native revision `3258a156402c6770b3c9d9446534205dc3a822faa6ee348727b7429b8c83628d`, nonce `30a1c508-14fb-44e3-a78a-81e9c1d67b5e`, journal `6d2e9909-b2be-450c-ad3b-918feb3ce174`, прежний repair cycle `993f0e6a-a71a-407e-b1a9-f646d3fae878`. Plan SHA `0ec23b0099a56a9cc9c4bd073e2808acc74cfe39a5b3d2e02c708d844e78e731`. Начальные final проверки исполнены при revision `2008ec5fa30d56c496679941adaedf5ce609460e9f83008e74af51a0759722f9`; subsequent refresh исправляет только запись Confirmation-to-test в 06, application/test bytes совпадают. Собственный receipt имеет последнюю реальную привязку, без reset/нового исходного review.

Измеряемый scope: **83 пути = 77 targets + 6 core**, 23 editable / 54 read-only. Независимые сравнения подтверждают 54/54 read-only baseline-exact, все 32 SQL migrations baseline-exact, 83/83 текущих host digests. Новая область scope рассмотрена по фактической дельте и потребителям. Source32 mapping общего прогона отличается от final из этих 32 ровно двумя путями: OriginalSource.tsx и его browser test. Остальные поздние изменения — три metadata entries в enums и пять maintenance suites. Продуктовые auth, original route/runtime/shared revision leaf, streaming, signer, retention SQL/TS и render/clip consumers после R1 не менялись. Private proof: `Q/r2-final/manifest-start.json`, `baseline-pin-audit.json`, `readonly-54-audit.json`, `author-aggregate-audit.json`, `manifest-end.json`.

Фактический шестипольный author object прочитан полностью и сопоставлен с дельтой, tests и newRisks; SHA `65f90f690766b21958d7d64780d4f37e4ef769b3a4c144919449113f80b1d744`. В native receipt он перенесён как есть. Четыре originating condition objects сохранены без изменения requirement/scope/evidence/severity; новые verifications привязаны к текущему revision.

### Проверка исправлений и anti-drift

| Условие | Самостоятельная проверка реальной реализации |
|---|---|
| OQ-SOURCE-1 | Native HTTP503/404/429 выполняет одну metadata recheck, применяет error-state table и не объявляется codec failure только по code4. Реальный unsupported MOV/qtrle сохраняет download fallback. При stale uploading → rendering и удержанном error recheck `lastSettled` не позволяет отменить проверку уже подтверждённого ready source. Собственный zero-clips race завершился playback-error, errorChecks=1, mediaNodes=0; pending не остался. Отдельная incomplete→ready ветка обновляется один раз и не начинает playback. |
| OQ-SOURCE-2 | Recovery time/paused переносится только в соответствующий explicit retry и потребляется once; close/выбор клипа очищает snapshot. Собственные HTTP/TCP native probes и текущие Back/clip tests подтверждают paused при новом Watch, восстановление позиции текущего retry, один слышимый media и сохранение selected ClipCard DOM. |
| OQ-SOURCE-3 | Frame использует существующие surface/ink tokens, video сохраняет media background. Обе темы и восемь approved states проверены geometry/contrast assertions; собственный light probe: h3 16.2933:1, audio caption 7.3396:1. Representative current light playback-error/audio screenshots просмотрены. Новых controls/layout не добавлено. |
| OQ-SOURCE-4 | Единственная retention locator замена соответствует неизменённому «Доступно до»; прежние ordering/geometry/media identity asserts сохранены. Chromium и WebKit проходят primary path и retention case. Общий прежний browser run 92 PASS/2 FAIL плюс исправленные affected cases рассматриваются отдельно; никакого выдуманного full-new-browser PASS. |

Собственный race oracle сохранил business expectation из прежнего RED. Для синхронизации исправленной реализации он ожидает реальный video.get response и смену status-panel; прежнее ожидание двух metadata requests было способом воспроизведения дефекта, а не требованием двух запросов. Дополнительно asserts теперь требуют один recheck. Старый probe и оба RED-лога в `Q/r2` сохранены. Final probe SHA `1802acdbdd6c16ad25dc7fdd9826c86e1bc2b1dd0e9a805cad27a6a642b17b9a`.

Шесть дополнительных corrections согласованы с фактическим текущим контрактом:

- SQL_ENUMS дополняется ровно тремя CHECK registry entries из неизменённой migration028. Поиск usages на apps/packages/tests показывает только enums guard и mutation tooling; runtime reader/exports/бизнес-политика не менялись. Catch-all и legacy exclusion list сохранены. Новый test исполняет positive full guard и три точные отрицательные CHECK mutations.
- ClipCard SSR fixture получает будущую дату относительно настоящего Date.now; глобальный fake clock не введён, прежние unavailable/disabled/ordering assertions остались.
- Landing fixtures соответствуют owner-approved retention FR-1/2/8 (7 суток), явному ready_at/source после migration028 и текущему canonical absolute signer deadline. Проверены −1ms/точная граница, immutable showcase exemption, explicit cap, TTL>0, TTL≤30 и signedAt+TTL≤deadline для file/thumb.
- Реальная PostgreSQL showcase suite сохраняет foreign code, revoked/deleted/erasing, wrong-code-binding, missing-object и explicit-expiry denials. Music query fixtures соответствуют текущим lock/projection rows; prefix/sibling/adoption/no-quota assertions не изменены. Policy/helpers и все migrations неизменны, новая business rule не введена.

ADR-001 fitness и Confirmation-to-test mapping повторно сопоставлены с финальной реализацией: same-origin read seam, owner/session gate, bounded streaming и shared backend leaf сохранены; UI/error/recovery confirmations закрыты различающими проверками. FR-1…8/NFR подтверждены в пределах ранее описанных proof; нет расширения на jobs, кредиты, growth, новые retention operations или schema. Code-critic не выявил новых blocking/high/medium concerns после исправлений. Отдельных low-замечаний ради объёма не добавлялось.

### Собственные final проверки

Runner `python3 Q/r2-final/run-ui.py <name> ...` запускает Node22 + private copy vitest с browser config, без private DB/S3/Redis env. `run.py` запускает vitest из `Q/copy-r2-final` с согласованным private test env; env/credentials не печатались. Аргументы, cwd, exits, elapsed и log SHA находятся в одноимённых JSON.

| Run / аргументы | Факт |
|---|---|
| `own-six tests/browser/qe-original-probes.test.ts tests/browser/qe-original-transition.test.ts` | 6 PASS, exit0, 16.736 s, log SHA `9ee92fb88eb85dd04d0ca1fcc85a74d4d3cc3a01a741acaa8414347b9f17b139` |
| `affected-source-ui tests/browser/original-video-access.test.ts -t '^(?!.*native Next).*'` | 24 PASS, exit0, 63.653 s; native Next case deliberately excluded, не собственный PASS; log SHA `2092c7788e994732835b6bec5fecd52fefa444d13173eaab0407c0af5a826014` |
| `affected-ux tests/browser/ux-simplification.test.ts -t 'primary_path_and_context\|approved mobile title player download retention More order'` | 4 PASS в Chromium/WebKit, exit0, 13.950 s; остальные 73 excluded, не PASS; log SHA `0cec588da47bcdb0d34a323a9135c29dec4141dd09a060743a19ba1a4b35d63b` |
| `maintenance-five tests/enums.test.ts tests/clip-card.test.ts tests/landing-demo.test.ts tests/landing-demo.integration.test.ts tests/clip-music-review-fixes.test.ts` | 71 PASS/0 skip, exit0, 8.358 s; из них 8 real PostgreSQL; log SHA `ba1485328d4586e3f619c6596ef9a38cff9afecc2d91c58955e2651f03e694f3` |

Это 105 выполненных немутированных тестовых случаев, не полный suite и не процент покрытия. Copy aliases/workspace links ведут внутрь disposable copy; final product bytes перед проверками совпали с W. Единственная instrumentation delta существующего measured browser test — evidence path: `756790b0…` → `075e2b69…`, proof `copy-instrumentation.json`; own probes отдельно private. Мутации выполнялись после terminal browser checks, исключительно в copy:

| Семантическая мутация | Отрицательный oracle / восстановление |
|---|---|
| Удалены три новых SQL_ENUMS entries | Существующий catch-all FAIL перечислил ровно три отсутствующих CHECK; exit1, 1.064 s; после hash-exact restore тот же выбранный test PASS, 1.077 s. RED SHA `a333bf675db9dba6bd656a2b8820d8b1864467831bd2cb5e4441f980deaa2edb`. |
| `deps.sign(key,row?.deadline)` → `deps.sign(key)` в showcase-file | Новый absolute deadline test FAIL на реальном вызове signer без deadline; exit1, 1.999 s; после hash-exact restore PASS, 2.063 s. RED SHA `6e5540226fe1b07bbc6a34d1c78fd7886ff9082054e6fade45034b4647456b93`. |

Намеренно excluded cases этих двух single-test commands не названы PASS. Старые R1 ownership/stream semantic mutation proofs относятся к тем своим байтам; финальные неизменённые backend digests проверены, исторические прогоны не переименованы в новые.

### Общий regression: независимая оценка составного evidence

Единственный author common run сохранил **FAIL: 161 suites PASS/5 FAIL, 1750 tests PASS/11 FAIL**, 1276.243 s. Все 11 test IDs сопоставлены с actual baseline logs; recorded test body SHA совпадает с `git show bb1184…` для каждого. Десять failures вызваны stale fixture ожиданиями после уже принятой retention policy; один — действительный незаполненный SQL_ENUMS registry. Исправления не маскируют их exclusions/skip. Private common-failure-matrix проверена вместе с raw log hashes и конкретными assertion causes.

Author final affected evidence отдельно: пять repaired suites **71/71**, callers **96/96** (включая real PG retention races и S3/guest/short-link/presign), UI **25/25** с actual Next HTTPS/auth/PG/fenced Cloud, final shared/web builds, types, lint exit0. Hashes всех этих логов самостоятельно совпали с manifest; `Q/r2-final/author-log-hash-audit.json`. Время final checks — 8.518/21.276/83.007/2.113/31.661/35.195/1.991 s соответственно. Optional BullMQ Valkey warning у web build сохранён как известный dependency limitation, не скрыт.

Проверено, что от common source32 изменились только два UI paths; остальных шесть corrections касаются test-only fixtures и неиспользуемого runtime реестра CHECK. Changed production callers охвачены final affected checks; новых непроверенных широких зависимостей не найдено. По правилу владельца «один общий, после исправления — затронутые проверки» этого evidence достаточно для закрытия SOURCE regression obligation. **Полный новый `npm test` PASS не выполнялся и не заявляется.** Author common long native case действительно содержит marker125000 и PASS125047ms; исходные stream bytes не менялись. Собственный повтор 125s/Cloud/Next не выполнен: это явно supplemental author evidence плюс собственные R1 native proofs и текущая проверка неизменности.

### Gates, ограничения и cleanup

Собственный initial canonical amendment-check дал exit1: parser связал второй title в AM-12 с tests/enums.test.ts. Это сохранённый механический FAIL (`Q/r2-final/amendment.raw.json`), не product finding. Root разделил тот же смысл на AM-12/13, выполнил настоящий same-cycle prepare refresh. Собственная проверка document diff подтверждает неизменность имён, paths, expectations и application/test bytes. Повторный canonical `amendment-check --feature-dir features/original-video-access --project /home/clipmkr-original-video --json` из cwd W дал **exit0, 14/14 resolved**, no missing/placeholder. Raw: `amendment-final.raw.json`; actual argv использовал абсолютный feature-dir. Наличие test title не заменяло выполненные выше negative oracles.

Canonical Node22 CLI из cwd W: guard code exit0/pass; signature-fresh NOT-ESTABLISHED. Guard publish exit0/warn (agents-md-policy-sync soft warning), rounds-traced сейчас checked; rounds-closed/signature-fresh и перечисленные raw capabilities NOT-ESTABLISHED. Это не publish approval. Старый discrimination-check остаётся `CANNOT_ISOLATE / baseline-dependency-unavailable / measurementValid:false`; реальные семантические RED→GREEN отдельно доказывают различение, не превращая этот инструментальный исход в PASS.

Полной production capacity для 90–120 минут, наличия всех старых sources, вечного хранения, любых codecs и общей WCAG conformity не заявляем. Исторический infra fixture от 03.11 проверяет shape/hash прежних evidence и не доказывает свежие OOM/ENOSPC/network fault injections; его не переподписывали текущей датой. Provider/model attestation и metered tokens/cost unavailable; модели указаны как запрошенные. Runtime AQE не устанавливался. Следующая поставка/ручная приёмка владельцем — отдельные обязательные этапы.

Все собственные процессы terminal; повторный read-only PostgreSQL audit: scoped schemas **0**; own active copy processes **0**. В final phase новые S3 objects/receipts не создавались, Redis не очищался. Private evidence 700/600; две mutations восстановлены побайтно. Final83/83 stable, `Q/r2-final/manifest-end.json`; test resource lease возвращён root. Own receipt записана самим originating reviewer под `source-qe-receipt.lock`; evaluate принадлежит root.

### Собственный Step-8 ledger, attempt 2

Перед записью проверено отсутствие resumed QE checkpoint для этой проверки. Supported manual writer вызван один раз из cwd W, без `--auto`; reviewer/model/role/attempt/current native identity и 83-path scope указаны фактически. Current gaps0, original4 сохранены как resolved IDs; tokens/minutes/cost/provider attestation оставлены unavailable. Фактический ответ writer:

```json
{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/home/clipmkr-original-video/.dz/feature-adr/run-cost-ledger.jsonl"}
```

Эта запись подтверждает ledger write, а не native closure. Root не создавал запись за reviewer.
