# TASK-06 — bounded current-VPS release guard

## Reporter contract — точечная коррекция17.11

Прочитан установленный Vitest3.2.7 `JsonReporter` в
`node_modules/vitest/dist/chunks/index.VByaPkjc.js:1690–1778`: `numRuntimeErrorTestSuites`
не выводится, `_errors` в `onFinished` игнорируется. Отсутствие поля **не** доказывает zero unhandled.
Root observation/recall прочитаны; исходные raw JSON и их hashes не изменялись.

`validateZoomVitestEvidence` — общий небольшой потребитель actual schema для checker,
Zoom RED/GREEN и framing reader. Поле допускается отсутствующим либо ровно0; присутствующий
nonzero/null/иной тип отвергается. Проверяются неотрицательные целые counters и их согласованность,
непустые files/assertions, file status/message, assertion statuses/failure messages. GREEN требует
terminal exit0, success=true, passed>0, failed suites/tests=0. RED сохраняет exit1 и meaningful
целевые failures; import/runtime/file-level errors, zero suites/assertions, unrelated и nonterminal
результаты не становятся behavioral RED. Mandatory names/counts/skip и framing/source controls прежние.

Raw logs читаются с hash binding; unhandled/rejection/uncaught/Failed Suites/incomplete-reporter
markers блокируют приёмку. Zoom runner теперь пишет default+JSON reporters в тот же unique attempt,
сохраняя stale refusal. JSON-only log старого framing runner не является самостоятельным proof
отсутствия unhandled; проверяются доступные schema/file/count и runtime markers, а отсутствие
невыведенного error channel не называется доказанным нулём. Полноту реального release/QE evidence
root проверяет отдельно. Новый reporting framework, зависимости и targets не добавлялись.

Fixtures теперь повторяют поддерживаемую schema без выдуманного runtime counter; optional0/nonzero
проверяются отдельно. Регрессия запускает настоящий изолированный локальный Vitest, читает его
неизменённый JSON и проверяет absence поля, GREEN, file-error/zero/runtime-log negatives. Fresh RED
cases различают behavioural/runtime/import/unrelated/zero-suite/file-error/unhandled; прежние55
cases сохранены. T06-01…08 не переоткрывались, bounded executor byte-identical предыдущему freeze.

Новый export получил FREE K1 до кода: R/task06-reporter-author-namecheck.*. Advisory root recall
прочитан. Подтверждённый урок `teach:c4bfc7b408a78de1` сохранён pinned dz --no-mirror, повторный
recall exit0 вернул его; R/task06-reporter-author-{teach,recall-confirm}.*. Новых receipts нет.

Один scoped прогон после правок, без source edits во время тестов: **59 passed/0 failed/0 pending**.
R=`/root/.config/clipmkr/zoom-conformance-implementation-20261116`, Node22.23.4 из прежнего pinned пути.
Source typecheck — существующий task06 profile; это не полный build/workspace QE.

| Фактическая команда | PID | exit | wall |
|---|---:|---:|---:|
| `npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-reporter-author.vitest.json` | 52052 | 0 | 61.074 с |
| `npm run lint` | 52053 | 0 | 2.181 с |
| `node node_modules/typescript/bin/tsc --noEmit --project /root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-typecheck.json` | 52057 | 0 | 8.682 с |
| `node --check scripts/check-zoom-layout-conformance.mjs` | 52059 | 0 | 0.059 с |
| `node --check scripts/apply-zoom-layout-current-vps.mjs` | 52060 | 0 | 0.052 с |
| `node --check scripts/test-zoom-layout-mutations.mjs` | 52061 | 0 | 0.050 с |

Raw report: R/task06-reporter-author.vitest.json. Точные terminal metadata/log/report hashes —
R/task06-reporter-author-*.json/.log и R/task06-reporter-final-freeze.json.
Schema-only потребитель дополнительно принял5 неизменённых actual raw reports с actual logs:
54PASS, C0PG85PASS, C0browser4PASS/37skipped, предыдущий55PASS и текущий59PASS. Это не full gate
PASS этих старых ревизий; skipped assertions не переименованы в passed. Метаданные команды
PID68214/exit0, raw keys/counts/hashes — R/task06-reporter-raw-schema-check.json/.log.

| Проверенный source | SHA256 |
|---|---|
| `scripts/check-zoom-layout-conformance.mjs` | `4177af8025ea5e36b0be7797edd4f70e148bce59eea5a654179712b26c2b7aed` |
| `scripts/apply-zoom-layout-current-vps.mjs` | `efe8556f9a8e9d1f97cf919a4dead555bf118c0f8ab5cb2559b5fc7e5b4df7d4` |
| `scripts/test-zoom-layout-mutations.mjs` | `93c208a2106ac50b76d871180d5b7b196a4d3a4ca10bae54c9e783db4d378c24` |
| `tests/zoom-layout-release.test.ts` | `a344602f52b4b3007f69d9ef2ccd87554749730ffd830023195f3b701c52e53e` |

После GREEN дополнительных source refinements не было. Runtime/Docker/DB/S3/network операции,
commit/push и review/QE receipts не выполнялись. Original pins/план/24 прочих targets и executor
неизменны; snapshot/source-write ограничения предыдущего repair сохраняются. Реальные mutations,
полная репетиция и originating review остаются отдельными этапами root после actual terminal автора.


> Уточнение17.11, T06-06/07/08: текущая реализация и55unit cases описаны в [repair.md](repair.md).
> Предыдущие44 cases сохранены. Origin verification нового diff остаётся у critic.

### Точный recovery/write контракт17.11

Control API checker/executor/cleanup использует только IPv4 `http://127.0.0.1:2019`.
Host inventory сохраняет ровно6 app/data containers и отдельный ingress. Его immutable
container/image/mount/source/import pins прежние. `startedAt` — свежая наблюдаемая boot identity,
не обновляемый source approval; изменение внутри попытки блокирует дальнейшую поставку.

Для recovery из полного closed-state передать `binding.ingress.originalSource={path,sha256}`:
private0600 snapshot исходного Caddyfile, с SHA исходного source pin. Такой файл сохраняется
в прошлой попытке как `ingress-source-before.private.txt`. `activeConfig` всегда указывает на
первоначальный pinned native config. Новый hash approval для закрытого source не создаётся.
Общий helper строго выводит closed source и четыре native503 handlers; guard принимает только
точную open/open либо closed/closed пару. Нужны свежие actual app/boot bindings, evidence bundle
и новый attempt directory; прежние state/evidence не переписываются. До open сохраняются
обычные integrity/readiness/health gates, C0 никогда не откатывает033. Drain выполняется
эфемерным reader и не зависит от работоспособности прежнего worker-video.

Запись source сохраняет inode и не делает truncate до write. Точные подтверждённые counts
задают byte checkpoint. Restore собственной неполной записи допустим только с тем же inode,
полным exact checkpoint и ограниченным проходом; произвольный compatible prefix не принимается.
Foreign final readback запрещает любые дальнейшие source writes/load; web stop остаётся
отдельной безопасной попыткой. Отказ fsync на полном valid source не превращается в durability
PASS. Повторная запись source после I/O refusal запрещена. При уже полном open source failure
закрытие обеспечивается stop web; постоянное закрытие source при этом не обещается.

Процесс может погибнуть между эффектом и restore; повторный аппаратный I/O failure также
неустраним автоматически. Неполные/mixed/foreign состояния — STOP с private recovery snapshots,
не automatic retry или crash-atomic claim. Это уточнение заменяет прежнее описание persist ниже;
остальные release/mutation/reference gates сохранены. Реальных runtime writes этим repair нет.

16.11.2026, автор `gpt-6.1-sol high`. Исправление pre-commit T06-01…05 по
[авторизации root](repair-authorization.md). Это описание кода и локальных unit проверок;
независимый origin verification, formal QE и поставка здесь не выполнены.
Фактические изменения и результаты — [repair.md](repair.md).

## Read-only контракт

```bash
node scripts/check-zoom-layout-conformance.mjs --candidate <FULL_COMMIT_SHA> --reference-approval <PRIVATE_JSON> --evidence <PRIVATE_JSON> --images <PRIVATE_JSON>
```

Checker не меняет fixtures, pins, evidence или runtime. Он требует clean candidate HEAD/tree,
полный sourceHash inventory из плана, immutable image IDs/OCI labels, утверждённые original/UI
и independent oracle hashes. Сохраняются обязательные suites/имена/counts, lint/typecheck/build,
fresh Astra review с input hashes/raw proof, C0 compatibility и isolated rollback rehearsal.
Terminal metadata включает candidate/tree, argv, PID, start/end, exit/signal и hashed nonempty log;
Vitest — raw assertions, не summary PASS. Missing/skip/unrelated/nonterminal/mismatch блокирует.
PRE-APPLY и pending POST-APPLY различаются. Unit fixtures не являются допустимым real evidence.

Шесть Zoom mutation IDs требуют behavioural RED и restored GREEN с raw reports/logs/source binding.
Дополнительно обязательны все семь framing IDs исходного runner и его raw `<id>-red/green.json/.txt`.
`evidence.framingMutations` содержит terminal metadata, hashed `results` reference и **sourceHashes**
пяти файлов: framing runner, worker format/ffmpeg, framing/framing-media tests. Его argv должен
называть настоящий `scripts/test-framing-mutations.mjs` и каталог results. Raw counts/целевые имена,
assertion failures и отсутствие runtime/import errors проверяются отдельно. Использовать новый
private output-каталог framing run; сам старый framing runner не переписан в этом scope.
Все прочитанные private references и raw proof hashes повторно сверяются между фазами.

## Host и ingress

Основной manifest schema1 и его семь ключей прежние. Host evidence schema расширена обязательным
`binding.ingress`; **binding.containers по-прежнему содержит ровно6**: web, worker-stt/llm/video, db, redis.
Допустимые VPS/compose/socket/DB/Redis/images не расширялись. Только локальный Docker socket,
без shell/host/transport из manifest. Секреты/provider env не печатаются.

`binding.ingress` содержит точный containerId/imageId/startedAt/mounts, fixedUpstream, sourceConfig
path/sha256, importHashes, activeConfigSha256, upstreamPaths и новый hashed **activeConfig** reference.
Последний указывает на raw private JSON текущего GET Caddy config. Root inventory pins из
`R/ingress-binding.private.json` встроены в checker только как allowlist identity/path/hash.
Он требует совпадения всех pins, source/import bytes, GET native config и контейнера.
Найдено ровно4 paths к `172.29.8.1:5811`; поддержка5812 и все прочие сайты исключены из изменения.
Raw native config/headers — только private0600 artifacts. Форма входов —
[release-guard.example.json](release-guard.example.json), **шаблон, не evidence**.

## Фиксированное исполнение

```bash
node scripts/apply-zoom-layout-current-vps.mjs --manifest <PRIVATE_JSON>
```

Каталог попытки новый owned0700 вне Git, файлы0600, общий compose lock. Checker вызывается
до lock/state/первой записи. Source/manifest/evidence/ресурсы/ожидаемые app IDs сверяются перед
и после каждой фазы. Реальный CLI не принимает dependency overrides: они существуют только
как программная граница unit tests. Внешняя команда/caller config/новый proxy не принимаются.

Порядок: **pause → drain → backup → migration → integrity → workers → web → verify → open**.

- Pause сохраняет immutable compose/image snapshots и private ingress recovery artifacts.
  Из закреплённого source Caddyfile заменяет только две точные import строки к5811 и один
  reverse_proxy блок к5811 на `respond 503`. До записи Caddy adapt должен подтвердить baseline
  source/loaded parity; после адаптации закрытого текста — ровно4 static503 handlers, а возврат
  исходных handlers в полученном JSON должен дать исходную конфигурацию целиком. Иное — STOP.
- Сначала записывается закрытый source **in-place + fsync** с сохранением bind inode, затем
  фиксированный Caddy `/load` через docker exec stdin; GET проверяет loaded parity. Таким образом,
  существующий Caddy restart по своему Caddyfile читает закрытое состояние. Импорты не меняются.
  Затем web останавливается. Другие сайты и поддержка не изменяются.
- Drain проверяет idle stt/select/render и running/deferred/video; busy/unavailable — отказ,
  без clearing/refund/force terminal. После idle останавливаются workers. Backup делает parser
  preflight, snapshot/journal032 и pg_dump. Migration — только штатный migrate candidate image;
  rollback-c0 не выполняет DDL. **Integrity сравнивает snapshot/journal до запуска writers/watchdog**.
  После старта штатных writers полные rows больше не сравниваются как migration proof.
- Workers запускаются immutable image. Проверяются running/status/paused/dead/exit/restart,
  optional Docker health и неизменный boot identity. Реальный BullMQ `getWorkers()` должен
  зарегистрировать каждый stt/select/render client с IP соответствующего контейнера.
  Переиспользуется getRedisConnection; задания и paid STT/LLM APIs не вызываются.
- Web запускается только после workers readiness при закрытом ingress. Health revision
  проверяется **в том же контейнере** на localhost3000, без recreate после health. Queue readiness
  повторяется перед verify/open; смена boot identity блокирует. Наблюдение — до45с, отдельный
  readiness/health Docker exec ограничен5с; остальные команды имеют свои bounded timeout.
- Open возвращает только проверенную native config, проверяет GET, затем восстанавливает
  source Caddyfile. Только после этого попытка отмечается PRE-APPLY-delivered, POST-APPLY pending.

На отказе нет автоматического открытия/rollback/restore. Closure самостоятельно проверяет
proxy/source/import identity, удерживает закрытый source и останавливает только web нужного
compose service с допустимым image ID. Сбой DB/Redis или evidence не подавляет эту попытку.
Foreign proxy config не перезаписывается: web всё равно останавливается при подтверждённой
идентичности. Неуспешная closure остаётся явно в private state для оператора. Если Docker
недоступен либо web identity изменилась, успешное закрытие не обещается.

Крах автора/исполнителя не разрешает удалять lock/state или повторять попытку наугад.
В private attempt сохранены open/closed native config и source-before для разбора root.
Неатомарность in-place записи общего bind-file при аппаратном сбое остаётся ограничением:
restart может отказать на неполном файле; автоматического восстановления открытого состояния нет.
Никаких down-DDL, DELETE v2, media removal, массовой пересборки или pre-v2 runtime.

## Границы доказательства

44 локальных cases включают исходные9 orchestrator tests и35 новых. Новые исполняют настоящий
fixedExecutor с подменой только внешних Docker/host observations, PG/HTTP/Redis клиентов;
сгенерированные readiness/health программы реально исполняются отдельными Node процессами.
Caddy adapter/HTTP admin и PG остаются fake внешними ресурсами. Это **не** Docker/PG rehearsal.

Шесть Zoom mutations и семь framing mutations не запускались; official build, полный TASK-07,
fresh независимый critic/QE, real isolated Caddy/Docker/PG/Redis rehearsal, apply и POST-APPLY UI
остаются у root. Проверить реальный adapt/native parity, restart/closure и все публичные входы
обязательно до поставки. Snapshot SQL сохранён из исходного executor: агрегирование rows
может требовать большой памяти на крупных таблицах; реальная PG репетиция/оценка ресурса здесь
не выполнена. Нельзя выводить готовность production по unit PASS.

Code/spec anti-drift: MC-03/MC-08/AM-7, прежние оригинальные pins и обязательные tests сохранены;
UI/fixture/parser/render/DB/requirements/ADR/план не менялись. Формальные receipts не создавались,
commit/push и любые реальные runtime writes запрещены и не выполнялись.
