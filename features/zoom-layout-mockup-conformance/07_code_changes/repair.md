**T06-07, bounded delta17.11:** оставшийся transport recovery исправлен без нового scope/inputs/pins/deps: модель отдельно выводит source и active из двух точных утверждённых конфигураций; известная промежуточная пара принимается только при фактически остановленном web с точными bound ID/image, exited/non-paused/non-restarting/non-dead state. Эта проверка повторяется исполнителем до нормализации; `pause` приводит обе части к CLOSED до drain/backup/migration/writers, далее прежние межфазные checks сохранены. Обратная пара original-file/closed-active также допускается с теми же ограничениями: test воспроизводит её рестартом ingress на границе opening fsync, после чего web безопасно остановлен. Running web и foreign config/source/import/boot drift не становятся разрешённым mixed-state. Настоящий fixedExecutor в mocked external-boundary cases проверил load failure→fresh candidate до033, partial opening+cleanup load refusal после health→fresh C0 с сохранением033, inverse→C0, running/foreign refusal; прежние59 cases сохранены. Один прогон Node22.23.4: `npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=R/task06-t07-mixed.vitest.json` — PID94737, exit0,64PASS/0 failed/0 pending,66.862с; lint PID94739 exit0/2.025с, source `tsc --noEmit --project R/task06-typecheck.json` PID94742 exit0/7.754с, три node --check PID94743/94745/94746 exit0. R — прежний private evidence каталог; точные argv/time/exit/log/report hashes в `task06-t07-mixed-*.json/.log`, финальный freeze `task06-t07-mixed-final-freeze.json`. Это уточнение заменяет прежний blanket refusal mixed-state; неизвестные/частичные bytes по-прежнему STOP. Reporter validator и legacy framing limits не менялись; originating report не редактировался, formal native QE/real rehearsal/runtime writes/commit/receipts отсутствуют. После GREEN source не изменялся; прежние crash/I/O/Docker-unavailability ограничения сохраняются, root отдельно подтверждает terminal автора и origin verification.

# Продолжение TASK-06 от17.11: T06-06/07/08

Автор `gpt-6.1-sol high`; HEAD `811e982f52073143ca87853823e1ecac52d2fa21`.
Origin report прочитан целиком. T06-01…05 признаны устранёнными originating critic на предыдущих
байтах; их gates/44 cases сохранены. Текущие три исправления ожидают origin verification;
автор не меняет critic report и не создаёт review/QE receipts.

- **T06-06:** все control GET/POST checker/executor/cleanup используют фиксированный
  `http://127.0.0.1:2019`, без caller transport. Fixed tests теперь исполняют также настоящий
  ingress probe checker через Docker boundary; mock явно отвергает localhost.
  Root `ingress-readonly-qualification.private.json` прочитан по allowlist: sourceLoadedParity,
  onlyTargetRoutesChangedInCandidate, closedConfigValidation и runtimeAndSourceUnchanged=true,
  targetHandlers=4, localhostRefused/loopbackIPv4Accepted=true. Это root read-only qualification,
  не авторский runtime apply и не утверждение о выполненном POST.
- **T06-07:** общий `deriveZoomLayoutIngressState` выводит единственные разрешённые open/closed
  source/native пары из исходных pins. Для закрытого входа нужен hashed private
  `binding.ingress.originalSource` с точными исходными байтами; `activeConfig` остаётся исходным
  pinned native snapshot. Hashes не заменяются закрытыми значениями. Live source/config должны
  целиком совпасть с одной из двух пар; foreign/mixed/partial состояние отвергается.
  Свежий `startedAt` — наблюдение boot в inventory, проверяемое фактически и неизменное внутри
  попытки; container/image/mount/source/import pins прежние. Drain использует read-only ephemeral
  reader, поскольку предыдущий worker может быть остановлен. Fresh inventory/evidence и новый
  attempt обязательны; старый bundle/state не переписывается. Cases: failed health→C0 без down033,
  failed migration→candidate retry, ingress restart→C0; все с прежними pins и реальными ветвями
  fixedExecutor. Дополнительно foreign source/native/original snapshot дают refusal before writes.
- **T06-08:** bind inode сохраняется, initial truncate удалён. Writer пишет ограниченными
  positional chunks и хранит точные байты после каждого подтверждённого write count. Перед
  следующим эффектом проверяются inode/path и полный текущий checkpoint. При отказе своей
  неполной write/truncate допустим один ограниченный restore прежних байтов только при точном
  совпадении с последним подтверждённым состоянием. Совместимый префикс сам по себе не proof.
  Foreign final readback — uncontrolled, без новых source writes/load. После отказа I/O новое
  source update в cleanup запрещено; полный закрытый source может использоваться без повторной
  записи для закрытия API. Web останавливается независимо от результата proxy cleanup.
  Проверены before-write/acknowledged partial/fsync failures, partial opening после health и
  foreign baseline после полного write/fsync. Проверяется содержимое, inode, отсутствие
  посторонних route changes и запрет дополнительных записей при foreign drift.

Reuse: те же Caddy/BullMQ/Docker/migrate и существующая ветвь closure; нового proxy/framework,
ресурсов/transport/hosts/targets нет. Новый export получил FREE K1 **до** кода:
R/task06-final-repair-namecheck.log. Собственные admission/context exit0:
admitted/reasons[], complete/diagnostics[]; literal digest прежний
`6474cbbf14a9b39cc435172994ca7ffaa5f3a595f35c97a485789618e1aa02a6`.
Root recall и собственный relevant recall прочитаны. Подтверждённый unit урок сохранён
`teach:0411bb6ec97c9ae2`, teach и повторный recall exit0 с фактическим извлечением;
журналы R/task06-final-repair-author-{teach,recall-confirm}.*. История/.fa-state/.dz не сбрасывались.

## Финальная локальная проверка

R=`/root/.config/clipmkr/zoom-conformance-implementation-20261116`, Node22.23.4 из
`/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`. Во время прогонов source не менялся.
Итог: **55PASS/0 failed/0 pending**, исходные44 сохранены. Raw report:
R/task06-final-repair-attempt4.vitest.json; metadata/logs с тем же префиксом.

| Фактическая команда | PID | exit | wall |
|---|---:|---:|---:|
| `npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-final-repair-attempt4.vitest.json` | 21187 | 0 | 54.839 с |
| `npm run lint` | 21189 | 0 | 2.126 с |
| `node node_modules/typescript/bin/tsc --noEmit --project /root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-typecheck.json` | 21191 | 0 | 7.614 с |
| `node --check scripts/check-zoom-layout-conformance.mjs` | 21195 | 0 | 0.044 с |
| `node --check scripts/apply-zoom-layout-current-vps.mjs` | 21194 | 0 | 0.045 с |
| `node --check scripts/test-zoom-layout-mutations.mjs` | 21196 | 0 | 0.042 с |

Source typecheck — существующий task06 profile, не общий build. Lint не охватывает scripts,
поэтому все три .mjs получили отдельный node --check. Все четыре файла <500 строк.
Первый run упал до collection из-за private name collision `derived`: **не meaningful RED**.
После исправления run2:54PASS; run3:54PASS уточнил сохранность предыдущего evidence в fixture;
run4:55PASS добавил корректный fresh boot inventory для closed recovery. Причины локальных
повторов зафиксированы; широкого QE/build/mutation прогона не было. Старый PASS не объявляется
прохождением новых байтов. Исторические результаты ниже относятся к16.11, а не к этому freeze.

| Проверенный source | SHA256 |
|---|---|
| `scripts/check-zoom-layout-conformance.mjs` | `3c5c4ddb2457286f3e9da76cf35a1f4e928cfe18640e3da6f2f225413c22a2f4` |
| `scripts/apply-zoom-layout-current-vps.mjs` | `efe8556f9a8e9d1f97cf919a4dead555bf118c0f8ab5cb2559b5fc7e5b4df7d4` |
| `scripts/test-zoom-layout-mutations.mjs` | `37dd64072ddd9e22c5955d53139fe59bd83e25ab2f2af95c36af04879282b1b3` |
| `tests/zoom-layout-release.test.ts` | `2e393a91de9788b83c9101ab7b717349c2841f566d2e0962e66985f75732ef97` |

Финальный freeze: R/task06-final-repair-final-freeze.json. Это снимок автора до завершения CLI,
не подтверждение terminal самого автора: root измеряет его отдельно перед origin verification.

## Реальные ограничения

Реальных API POST/load/compose/Docker load/runtime config/production DB/S3/DNS/Cloud writes
не было. Unit boundaries Docker/PG/HTTP/Redis/часть FS fault injection — synthetic, реальные FD
и temp files используются только в disposable fixture. Реальные mutation runs, isolated
rehearsal, independent origin/QE и POST-APPLY не выполнены. Commit/push отсутствуют.

Restore не является crash atomicity. SIGKILL/аппаратный отказ между write и восстановлением,
повторный отказ самого restore либо неподтверждённые bytes требуют root разбора private snapshots;
partial/foreign состояние автоматически не принимается и не затирается. Fsync error при полном
валидном target не доказывает durability: source не переписывается повторно. Если полный open
source уже записан, при таком отказе публичные admissions закрывает остановка web; успешное
постоянное закрытие самого source не объявляется. При недоступном Docker/смене web identity
невозможно обещать успешный stop; private state явно содержит cleanup refusal. Mixed source/native
пара требует разбора, а не ослабления admission. Ранее отмеченный snapshot SQL memory risk
на большой БД остаётся вне этих3 findings и не проверен этим unit suite.

Anti-drift: требования/ADR/архитектура/план/base-ref/mockup/oracle/24 остальных targets неизменны.
Из разрешённых4source изменены checker/executor/tests; mutation runner byte-identical прежнему.
Кроме них обновлены только существующие repair.md/release-guard.md. Предыдущие44 cases прошли.
После финального freeze запись прекращается, CLI завершается; новый self-review цикл не начинается.

---

## Исторический авторский отчёт16.11 (не результаты нового снимка)

# TASK-06 — точечный repair T06-01…05

16.11.2026. Автор по назначению: `gpt-6.1-sol high`. HEAD:
`811e982f52073143ca87853823e1ecac52d2fa21`; четыре source-файла остаются pre-commit/untracked.
Это авторский handoff, **не** независимый review/QE receipt и не разрешение на поставку.
После прежней остановки до кода root разрешил существующий ingress в
[repair-authorization.md](repair-authorization.md); plan/requirements hashes и targets прежние.

## Изменения и falsifiers

| ID | Точное исправление | Проверка/ограничение |
|---|---|---|
| T06-01 HIGH | Новый nested ingress binding; закрытый source + fixed Caddy load/GET, native diff только четырёх target handlers; integrity перед workers/watchdog, private health того же web process, отдельная фаза open. Error closure не зависит от DB/evidence. | fixed positive order; migration/preservation/journal refusal до старта; health failure; adapt/loaded/source/restart/open failure; DB failure после open. Реальный Caddy/PG rehearsal не выполнялся. |
| T06-02 HIGH | running/status/exit/paused/dead/restart/health и boot identity каждого reader; BullMQ registration/IP stt/select/render до web и повторно до open, без enqueue/provider APIs. | Отдельно dead/unregistered для всех3 workers, restarted worker. Реальная Redis готовность на VPS не проверялась. |
| T06-03 HIGH | Сохранены семь обязательных framing IDs и raw proof; добавлены current candidate sourceHashes пяти файлов и runner argv/output origin; проверяются raw assertion counts. | Missing/source/raw/skipped/runtime/unrelated/nonterminal negatives. Finding закрывает только origin verification critic; реальные framing mutations не запускались. |
| T06-04 HIGH | Исходные9 tests сохранены. Добавлены прямые positive/failure/C0 пути fixedExecutor с низкими внешними границами; его сгенерированные queue/health программы исполняются отдельными Node child. | Весь suite44PASS; C0 оставляет033 без DDL. Docker/Caddy/PG fake ресурсы явно названы; это не настоящая репетиция. |
| T06-05 MEDIUM | Runner создаёт unique run/phase attempt directories, требует новый report и целевой behavioral assertion; безопасный import для unit entry, один новый export после K1. | Старый RED + новый реальный child без JSON даёт отказ; собственный behavioral RED проходит; runtime/import/unrelated reports отвергаются. Настоящие6 mutations остаются у root. |

Все пять ID сохраняются для независимой перепроверки. Автор не меняет статусы critic findings
и не объявляет их closed своим PASS. Полный контракт и recovery ограничения —
[release-guard.md](release-guard.md). Пример входов обновлён из-за ingress/sourceHashes контракта.

## Предкодовые действия

Прочитаны полный task06-code-critic, AGENTS/CLAUDE, model/review policy, core CJM, code-impl,
актуальный literal context и реальные compose/watchdog/health/queue/runtime consumers. Повторены
supported check-code-targets/build-coder-context: admitted/reasons[] и complete/diagnostics[],
context digest `6474cbbf14a9b39cc435172994ca7ffaa5f3a595f35c97a485789618e1aa02a6`.
Relevant recall фактически выполнен и прочитан. Новый export `runZoomLayoutMutationAttempt`
получил FREE K1 до кода; существующие Queue/getRedisConnection/AttemptJob и runner изучены.
Reuse: существующие Caddy/Docker/BullMQ и штатный migrate; нового proxy/framework нет.

Новые helper/K1/recall logs и metadata — R/task06-ingress-author-{targets,context,recall}.*,
R/task06-ingress-namecheck.*. Урок `teach:dbe404837887efb6` сохранён pinned dz в `/home/clipmkr/.dz`,
teach exit0 и повторный recall exit0 реально вернул его. Журналы task06-ingress-{teach,recall-final}.*.
Секреты/raw config/headers в source/docs не добавлялись. Ротация вне scope.

## Фактические проверки

R=`/root/.config/clipmkr/zoom-conformance-implementation-20261116`.
Node22.23.4 из `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`.
Первый run:39PASS, lint/syntax exit0; source typecheck exit2 на новых harness annotations.
После terminal результата исправлены только типы harness, добавлена DB-after-open closure
и invalid ingress cases; повторён только затронутый suite и статические проверки.
Во время обоих прогонов source не менялся. Старые результаты не приписываются новой ревизии.

| Фактическая команда | PID | exit | wall |
|---|---:|---:|---:|
| `npm test -- tests/zoom-layout-release.test.ts --reporter=json --outputFile=/root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-ingress-attempt2.vitest.json` | 655035 | 0 | 38.629 с |
| `npm run lint` | 655037 | 0 | 1.989 с |
| `node node_modules/typescript/bin/tsc --noEmit --project /root/.config/clipmkr/zoom-conformance-implementation-20261116/task06-typecheck.json` | 655039 | 0 | 7.389 с |
| `node --check scripts/check-zoom-layout-conformance.mjs` | 655040 | 0 | 0.048 с |
| `node --check scripts/apply-zoom-layout-current-vps.mjs` | 655043 | 0 | 0.053 с |
| `node --check scripts/test-zoom-layout-mutations.mjs` | 655044 | 0 | 0.054 с |

Финальный release suite: **44 passed /0 failed /0 pending /0 skipped**, включая прежние9.
Raw assertions: R/task06-ingress-attempt2.vitest.json. Terminal metadata/logs —
R/task06-ingress-attempt2-{test,lint,typecheck,syntax-0,syntax-1,syntax-2}.json/.log.
Source profile task06-typecheck.json — существующий профиль текущих source targets и release test,
не общий workspace build/typecheck. Stock lint не охватывает scripts, поэтому .mjs дополнительно
получили node --check. Все четыре файла <500 строк.

| Source | SHA256 проверенного снимка |
|---|---|
| `scripts/check-zoom-layout-conformance.mjs` | `d7bb9102ac1516e8fd689b39ba6661982adada2302e68252eb890d03cd576ac1` |
| `scripts/apply-zoom-layout-current-vps.mjs` | `6bb0be16f948eb9b88a97632186df5ee840d7610eeb82c6f3e4a0e1df06d0e3f` |
| `scripts/test-zoom-layout-mutations.mjs` | `37dd64072ddd9e22c5955d53139fe59bd83e25ab2f2af95c36af04879282b1b3` |
| `tests/zoom-layout-release.test.ts` | `50d74cf3d503d13709c2742e88b2da1f126605879bd179d68449ebb45994588d` |

Финальный freeze: R/task06-ingress-final-freeze.json. Новых runtime/compose/API POST/file writes
на VPS не было: все mutating boundaries работали только с disposable unit fixtures.
Нет backup/apply/build/Cloud/DNS/commit/push или новых reviewer receipts. Synthetic Git commit
создавался лишь прежним test fixture в удаляемом temp clone, рабочий Git не коммитился.

## Ограничения и anti-drift

Реальные Caddy adapt/load/restart/source persistence, Docker/PG/Redis rehearsal, actual mutations,
fresh origin critic/QE и POST-APPLY QA остаются незавершёнными у root; owner acceptance не заменена.
Caddy adapter/native parity в unit подменяется внешней границей. В реальном entrypoint отсутствие
такой parity блокирует source/runtime writes. При аппаратном сбое in-place bind-file может
оказаться неполным; это требует root recovery, не автоматического открытия. Полная недоступность
Docker/смена web identity может помешать safety closure и явно отражается stopped cleanup.
Snapshot SQL всё ещё использует string aggregation полных rows: ресурсный риск крупной БД
не проверен этим suite и требует root оценки на изолированной реальной репетиции.

Code/spec anti-drift: MC-03/MC-08/AM-7 сохранены; изменения только в разрешённых4source,
release-guard.md, repair.md и примере входов. UI/original fixture/parser/render/DB/план/ADR не менялись.
Root начинает независимую проверку только после terminal этого author CLI. После final freeze
автор прекращает source writes и завершает сессию, без нового цикла саморевью.
