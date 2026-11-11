# Payment environments — отчёт автора реализации

Автор: `gpt-6.1-sol high`, 11.11.2026. Worktree: `/tmp/clipmkr-payment-environments-20261111`; baseline `5c5130d`. Это авторские наблюдения, не независимый QE и не успешная квитанция Step8/9. Изменены ровно30 согласованных source/test/config файлов:6 созданы,24 изменены; список и точные SHA — `source-manifest.json`, назначения — `change_manifest.md`.

## SOURCE QE R1: авторская доработка, текущий снимок

Исходные независимые findings приняты: PRIMARY-01/HIGH, PRIMARY-02/HIGH, PRIMARY-03/WARNING, TEST-01/HIGH, TEST-02/WARNING. Первоначальные зелёные тесты не доказали terminal boundary/cutover/no-POST контракт; ложная уверенность исходного rehearsal исправлена. Native history не сброшена: sequence2, eventDigest `2c13eb84c92336cda08d4341252ee22c7675b9d825a97e7d6b31729ba9828d3c`. Автор не выполнял begin-repair/evaluate/checkpoints и не менял host/review receipts.

Перед доработкой снова реально исполнены native admission (exit0/admitted `b36cff8d1df3da29a31021a55c07d5ff5fe286005f58b8dc51f329beb87644b2`) и context builder (exit0/complete `fb9dec561e8a1eee59343754c119c81a5d3f73fb906fc2247a015cb86f7089f9`); полный literal promptBlock прочитан. Нормативные01/ADR/05/06 и30 targets не менялись. Изменены6 файлов относительно проверенного R1 snapshot; полный scope/dependencies и авторская оценка — в `qe-author-delta.json`. Это отдельный SOURCE delta; исходный `features/payment-environments/author-delta.json` ideation не тронут.

Текущая проверка после единого repair: ONE `npm run build` exit0; затем8 affected suites132/132 PASS (31.59s), затем native Next2/2 PASS (17.30s). Typecheck и lint exit0. Product/test bytes не менялись во время сборки и проверок. Exact commands, private log hashes и hashes реально использованных build artifacts — `r1-repair-evidence.json`. Новый full160 run не запускался. Никакие результаты прежнего снимка не выдаются за полный зелёный прогон текущего.

В bind существующий payment обновляется только в mode=backfill. Checkout retry на legacy bound pending intent с unknown refunded payment сохраняет payment unknown и весь финансовый snapshot; затем явный GET+CAS классифицирует его без изменения status/amount/credits/attribution. Нормальный callback-before-bind остаётся рабочим. Для обычных refund/review outcomes удалён полный payment ID из лога; конечная причина сохранена и negative privacy assertion покрывает успешный LIVE/TEST refund.

Cutover больше не использует уже030 schema или COMMIT monkeypatch. Отдельная native схема до030 проверяется по journal и отсутствию provenance columns. До stop реальные старые checkout/create/bind и canonical HTTP callback успешны. Held inflight callback наблюдается в pg_stat_activity; реальный entry migrate/start дважды отклоняется до stop/drain/zero. Graceful server.close закрывает новые соединения; обычный COMMIT завершает принятый старый callback; после exit/zero реально применяется030 и только затем запускается новый Next. Отдельная созданная старым writer pending intent завершается новым canonical webhook одним payment/event/grant. Старые committed terminal строки сохраняют unknown. Это isolated rehearsal, не actual VPS proof.

Fixture method ledger фиксирует каждый HTTP request до auth/routes. Negative controls: idempotent POST увеличивает ledger без роста created; POST/refunds404 тоже учитывается. Function backfill phases имеют zero POST delta; compiled-child phase имеет ровно GET. Предыдущая метрика created больше не используется для заявления «не было POST».

Последующий независимый qe-testing R1 реально воспроизвёл19/19 прежних full-run failures на точном5c5130d (19.01s); автор baseline не повторял. Initial full result остаётся20 failures,16 skips и не green. Новый targeted evidence не превращает его в зелёный общий прогон. Фактическое originating verification/closure пяти findings выполняет координатор после этого freeze.

## Вход и admission

Первый собственный вход: native `check-code-targets.mjs` actual exit0/admitted `f06f58faeb981b82ed6d5a1d91890adf87cf57619a9f7fdce2afa68fe67fd34a`; `build-coder-context.mjs --tier=M` actual exit0/complete `88912aaca361ffa93ffa0843c55d346cc962ff28e036a6d618dfab2c14a08243`. После обнаружения дополнительного credit mutation binding код приостановлен ДО изменения незаявленного файла. Координатор добавил30-й target и обновил K2/admission. Собственный повтор actual exit0/admitted `5b4d2745e5d0ce5bc1d12ed731d69647b755ac05406dad2f4de6f26bfcbebf06`; literal coder context actual exit0/complete `fb9dec561e8a1eee59343754c119c81a5d3f73fb906fc2247a015cb86f7089f9` прочитан полностью без усечения. План SHA256 `8819f08149f6fcb9ff18ad7f3a577a00baafb02eaa2728d0700b1c5d8f249894`. K1 имён, K2 и receipts выполнял координатор; автор не создавал чужие receipts.

## Реализованное поведение и anti-drift

- Миграция030 добавляет unknown history без классификации по config/date; CHECK сочетаний и one-way immutable provenance отделены от прежних receipt/offer guards. Ранее начисленные credits и финансовые поля миграция не меняет.
- Новая intent получает обязательный server identity до provider POST; canonical remote получает readonly identity только после прежних raw.test/recipient checks. Fake только TEST. Retry/redirect/cancel сверяют сохранённые provider ID/order/amount и известную identity. Unbound unknown не вызывает нового POST.
- Bind/success/refund/backfill сериализуются payment advisory→account→intent→payment/reread. Event claim после проверки proof в той же TX; конфликт бросает исключение и откатывает claim. Существующие amount_mismatch/unknown_intent сохраняются как review facts без grants. Rebound не маскируется успешным duplicate.
- Refund покрывает linked/erased known/unknown, before-success и unlinked tombstone: потерянные связи не восстанавливаются, grants не создаются, unknown terminal не классифицируется обычным callback.
- Один `verifiedLivePaymentSql` определяет согласованную LIVE пару с прежними verified-sale условиями. Owner сохраняет месяц/Москву и distinct payer по блогеру; blogger сохраняет all-time. SKU, referral/self-referral и offer snapshots остаются условиями callers.
- GET-only operator CLI использует canonical provider, private bounded list (≤100 unique UUID), dry-run по умолчанию, paired provenance-only CAS и aggregate stdout. В runtime он не импортируется; собирается явным preflight include; `require.main` guard сохранён. Новый provider API override/env/dependency не добавлены.
- В R1 repair static conflict и обычные конечные outcome logs не раскрывают proof, IDs или ключи. Новый automatic unknown gauge не вводился: агрегат unknown остаётся предметом операторского DB inventory перед исторической классификацией.
- UI/API периодов, ставок20/30%, тарифов, receipt policy, атрибуции и retention runtime автор не менял. Три уже красных billing.unit expectations обновлены по ранее одобренным FR-1/2 `features/clip-retention-policy/01_requirements.md`:7 суток, paid-end отдельно от finished_at, прежний broad constant finder теперь явно учитывает независимые seven-day TTL erasure/support. Guard не выключен.

## FR → подтверждение → наблюдение

| Требование | Проверки | Фактическое наблюдение |
|---|---|---|
| FR-1 | `canonical live and test payments preserve verified provenance`; `checkout rejects client identity and remote merchant drift`; существующие billing/receipt suites | Настоящий loopback socket→canonical adapter→handler→PG: LIVE/TEST identity сохраняется, extra checkout identity422, foreign shop/mode/order не выдаёт redirect/cancel/grant. TEST credits остаются. |
| FR-2 / Q-01 | `financial reports preserve period and distinct payer oracles`; `native owner and blogger show independent live revenue oracles` | API и настоящий hydrated Next DOM после reload: owner ноябрь548000/2/1,20%=109600; blogger all-time647000/3, кодA498000/2, B149000/1. TEST/unknown обоих месяцев и merchant mismatch не увеличивают суммы.30%=164400 и unassigned=null отдельно проверены реальной PG-функцией отчёта. Chromium и WebKit, реальные отдельные owner/blogger/foreign auth contexts. |
| FR-3 / RISK-002 | migration rewrite negatives; `payment operations wait for account lock and rollback event claims`; credit rebound canaries | Другой PG connection реально удерживает account lock; bind/success/refund/backfill наблюдаются в `pg_stat_activity` как Lock wait, release завершает операцию. Wrong proof откатывает claim; правильный повтор с тем же event key проходит. Rebound вызывает conflict, второй grant отсутствует. |
| FR-4 / RISK-001 | `migration preserves unknown history and rejects identity rewrites`; `legacy pending callback before bind grants once`; native cutover test | Native migrator029→030 и повтор migrate сохраняют history. Pending upgrade callback-before-bind выдаёт ровно1 grant. Текущий R1 repair: отдельная native pre030 schema, успешные old checkout/callback до stop, реальный held PG wait→обычный graceful drain/COMMIT→zero owned sessions→реальная030→новый Next завершает отдельную old pending одним payment/event/grant; повтор duplicate. |
| FR-5 | `backfill dry run and CAS preserve concurrent live payments`; preflight compiled-entry test | Реальный compiled-child dry-run через loopback без writes/identifiers; apply/no-op/conflict/network failure; legacy TEST получает именно TEST. Amount/status/сохранённые финансовые поля не меняются, concurrent LIVE не перезаписывается, provider POST в самом backfill отсутствует. |
| FR-6 / RISK-003 | `refund proof matrix preserves erased and tombstone identities`; credit/report/partner/receipt/relocation regressions | Матрица linked/erased known/unknown, refund-before-success, unlinked tombstone, duplicate/order/amount conflicts; нет восстановления удалённого account/order и новых refund grants. Сохраняются прежние counters, attribution и snapshots. |

## История первоначальной реализации R0: команды и реальные результаты

Все команды в worktree, Node `v22.23.4`. Tests запускались private wrapper с предоставленной owned `*_test` PG и Redis14, отдельными схемами/namespace; keys/profile содержимое не выводились. Private logs: `/root/.config/clipmkr/payment-environments-20261111/`.

| Команда/label | Результат | Evidence |
|---|---|---|
| `npm test -- tests/billing.integration.test.ts tests/preflight.test.ts` (`first-runtime`) |38/38,2 suites, exit0 | `first-runtime.private.log` |
| Адресные12 suites: payment-environments,billing unit/integration,credit,relocation,receipt unit/integration,blogger-report,partner,guards,test-webhook,preflight (`targeted-final`) |195/195,12 suites, exit0 | `targeted-final.private.log` |
| `node tests/run-payments-mutations.mjs live-provenance-guard merchant-provenance-guard no-advisory-lock intent-before-account` |4/4 killed: каждый red exit1/failed1, restored green exit0/passed1. SHA payments/provenance после восстановления точно совпали | `mutations-four.private.log`, `pre-mutation-hashes.private.json` |
| `node scripts/test-credit-mutations.mjs <private-output> provider-payment-once intent-once` |Обе actual canaries red1/green0; missing/ambiguous anchor и отсутствующий исполнившийся тест — ошибки | `credit-mutations-two.private.log`, `credit-mutations.private/` |
| `node scripts/test-credit-mutations.mjs <private-output> paid-addon-exhausted` |Actual red1/green0 после уточнения неоднозначного anchor до контекста effectivePlanSql; смысл существующей мутации сохранён | `credit-addon-anchor.private.log` |
| `npm run build` после изменения product bytes |exit0; Next+preflight CLI собраны | `build-final.private.log` |
| `npm run typecheck` и `npm run lint` после repair |exit0 / exit0 | `typecheck-final.private.log`, `lint-repair.private.log` |
| Пять затронутых suites после small repair: new provenance,credit,billing unit/integration,test-webhook (`affected-final`) |90/90,5 suites, exit0 | `affected-final.private.log` |
| Native Next+blogger-cabinet regression после fresh build (`native-next-final`) |10/10,2 suites, exit0; native suite2/2 прежнего rehearsal; evidence недостаточен по PRIMARY-02/TEST-01 и заменён R1 repair | `native-next-final.private.log` |
| Адресный `-t 'native owner and blogger show independent live revenue oracles'` после добавления второго engine (`native-report-two-engines`) |1 test PASS, второй cutover test отфильтрован; внутри positive реально Chromium+WebKit. Это адресный run, не полный skip-free suite | `native-report-two-engines.private.log` |
| Existing browser billing/blogger-auto-link/per-account-checkout (`browser-regressions`) |70/70,3 suites, exit0 | `browser-regressions.private.log` |
| Адресный backfill concurrent test (`backfill-concurrent-final`) |1 PASS,7 других tests отфильтрованы; одновременно2 реальные PG lock waiters (new LIVE + historical CAS), затем оба завершились | `backfill-concurrent-final.private.log` |
| Последний `tsc --noEmit -p tests/tsconfig.json` и `npm run lint` после test/runner refinements |exit0 / exit0 | `tests-typecheck-final.private.log`, `lint-freeze.private.log` |
| Единственный общий `npm test` (`full-final`) |exit1:160 files =8 failed/151 passed/1 skipped;1706 tests =20 failed/1670 passed/16 skipped;959.33s | `full-final.private.log` |

Полный payments mutation runner не объявляется зелёным: не затронутый этой фичей `retention-from-finish` имеет0 anchors после прежней7-day retention policy — BASELINE OBSOLETE / NOT RUN. Выбранные4 payment canaries и3 credit canaries имеют реальные red/green. Дальнейшая очистка прежних retention tests не входит в эту фичу.

Промежуточные красные fixture runs не скрыты: new suite сначала4/8 из-за отсутствующих обязательных SQL fixture fields, затем исправлены; source typecheck сначала читал старые dist и был повторён после native сборки. `affected-repair` столкнулся с параллельным Next clean `.next/preflight` и отсутствующим compiled CLI: ошибка порядка запуска автора, затем повторены только affected tests ПОСЛЕ build,90/90. Логи сохранены приватно. Build выдаёт warning об optional `@valkey/valkey-glide` через BullMQ; сборка завершается exit0, новая dependency не добавлялась.

## Общий прогон: красные результаты и граница baseline

Единственный full run начался до небольшого исправления static conflict log и завершился после него. Его не выдаём за чистый снимок последнего diff.19 падений находятся в исходниках/тестах вне30 targets: `clip-card.test.ts` (4), `clip-music-choice.test.ts` (3), `clip-music-review-fixes.test.ts` (2), `enums.test.ts` (1), `landing-demo.integration.test.ts` (1), `landing-demo.test.ts` (3), `wiring.test.ts` (5). Видимые несовпадения — прежние retention/ClipCard expectations, отсутствующие SQL_ENUMS для clip.ready_at_source/retention_notice и receipt env fixture, не включающий3 уже существующих receipt keys. Эти файлы автор не менял; их pre-feature baseline test run НЕ выполнялся, поэтому19 результатов не объявляются независимо подтверждённым baseline PASS/FAIL. Runtime policy/guards ради них не ослаблялись.

Двадцатое падение — новый assertion sanitized conflict log в `checkout rejects client identity and remote merchant drift`. Текущий source в fresh affected run дал90/90, включая этот точный assertion и свободный event key. Старый module transform в длительном full process согласуется с наблюдением и временем edits; механизм кеша отдельно не измерялся, поэтому это объяснение отмечается как inference, не как доказанная runtime причина. Повтор всего16-минутного набора не выполнялся по уточнению владельца; повторены именно affected сценарии. Все16 skips вызваны отсутствующим S3_ENDPOINT; новых контейнеров/MinIO автор не создавал. Полная зелёная регрессия не заявляется.

Точные20 failing test titles общего run (8 файлов; без body/error payload):

- `tests/clip-card.test.ts > ClipCard markup > three actions with full accessible names; short visible texts`
- `tests/clip-card.test.ts > ClipCard markup > «Гостю» is disabled without the guest form and for a clip that is not available`
- `tests/clip-card.test.ts > ClipCard markup > partial render keeps its warning and stable player before actions`
- `tests/clip-card.test.ts > ClipCard markup > order: frame → actions → title → score → retention/music → Pro`
- `tests/clip-music-choice.test.ts > web requires rerender limit with its consequence and explicit wiring`
- `tests/clip-music-choice.test.ts > worker-stt requires rerender limit with its consequence and explicit wiring`
- `tests/clip-music-choice.test.ts > worker-llm requires rerender limit with its consequence and explicit wiring`
- `tests/clip-music-review-fixes.test.ts > retention uses real clip prefix validation and erases every version without touching sibling`
- `tests/clip-music-review-fixes.test.ts > known skipped choice rejects before quota, while screen shows rendered track and warning`
- `tests/enums.test.ts > Закрытые перечисления > Каждый CHECK … IN (…) миграций объявлен в SQL_ENUMS (иначе страж выше его не видит)`
- `tests/landing-demo.integration.test.ts > PostgreSQL showcase route > /c/ через 6 дней: клип витрины «ready», соседний клип той же записи — «expired»`
- `tests/landing-demo.test.ts > маршрут витрины /api/showcase/{code}/file|thumbnail — третий путь к файлу > маршрут Next подписывает generateDownloadUrl и не проксирует байты через web`
- `tests/landing-demo.test.ts > ретенция и /c/ не хоронят клип витрины > срок витрины одинаков в TS и SQL: clipExpiry без срока бесплатного тарифа, явный expires_at — всегда`
- `tests/landing-demo.test.ts > ретенция и /c/ не хоронят клип витрины > /c/ клипа витрины после 3 суток бесплатного тарифа — «ready», соседний клип той же записи — «expired»`
- `tests/payment-environments.integration.test.ts > payment environments real PG and canonical HTTP > checkout rejects client identity and remote merchant drift`
- `tests/wiring.test.ts > Проверяемость проброса окружения > Полная конфигурация проходит, отсутствие потолка даёт находку`
- `tests/wiring.test.ts > Проверяемость проброса окружения > Соседнему воркеру не приписываются переменные web`
- `tests/wiring.test.ts > Проверяемость проброса окружения > Новая обязательная переменная config.ts не теряется в environment.ts`
- `tests/wiring.test.ts > Проверяемость проброса окружения > classifies release revision as build-time and still detects broken build and runtime wiring`
- `tests/wiring.test.ts > Проверяемость проброса окружения > wires S3_KEY_PREFIX to web and storage workers`

После завершения всех test/build процессов77 сгенерированных QA файлов сохранены в private `generated-qa.private/`:61 tracked artifact/screenshot восстановлен из baseline,16 собственных generated untracked удалены из checkout. Проверены: вне feature artifacts изменены ровно30 заявленных source/test/config targets, каждый SHA совпадает с source manifest; иных source/runtime дельт нет. В private хранилище сохранены original mutation logs и архивный hash manifest.

## Границы доказательства

- LIVE означает synthetic HTTP fixture с `raw.test=false`. Настоящие provider API, деньги, письма, production SQL/backfill/deploy/DNS/Cloud не вызывались. Владелец отдельно выполняет реальную покупку.
- Cutover — isolated rehearsal, не доказательство фактического VPS writer inventory/drain. DB DEFAULT unknown сохранён по закрытому ADR: отсутствие обслуживающих старых writers обеспечивает stop/drain/zero процедура; универсальный запрет любого старого SQL не заявляется.
- Новые runtime I/O не добавлены в health/preflight startup. Существующие no-network/resource-down checks сохранены; CLI недоступность провайдера проверена отдельно.
- Контракты изменены внутри единого monorepo web/DB/shared; внешние sibling repositories не менялись.
- Fresh cross-model source review, extended QE aggregate, code/spec anti-drift независимого reviewer и настоящие checkpoints остаются задачей координатора. Автор не заявляет прохождение Step8/9 и не пишет receipts за reviewers.

Source freeze: после завершения всех test/build writers, архивации QA artifact deltas и проверки30 source hashes. Дальнейшие source edits требуют предварительного уведомления координатора и нового freshness/review цикла.

R1 repair freeze: все test/build процессы завершены; source change остаётся ровно30 targets,6 файлов изменены в этом repair. Начальная native история и идеационный delta сохранены.

Дополнение handoff координатора перед native R2: прочитан фактический checkbox-only diff `openspec/changes/payment-environments/tasks.md`:1.1/2.1/2.2/3.1 отмечают реально выполненные QCSD/K1/K2, реализацию и проверки;3.2 independent QE/delivery остаётся `[ ]`. Путь добавлен в changedScope SOURCE delta как mutable ledger status update координатора, не авторское исправление кода и не production backfill/финальная приёмка.30 source targets, source manifest, test/build snapshot и native history не менялись; новые проверки не запускались.
