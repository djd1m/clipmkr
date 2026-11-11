# TASK-0 — принятая зависимость payment-environments

11.11.2026, фактическое чтение исходников в `/tmp/clipmkr-manual-billing-reminders-20261111`. **PASS: принятая source-зависимость соответствует закрытому контракту reminders; semantic delta для QCSD не обнаружена.** Это проверка зависимости перед K1/K2 и кодом, не проверка реализации reminders или runtime.

Координатор сообщил accepted source commit `2af00157b2394b4af9ce5d131856f40a2f2714f2` и настоящий merge в Wm `50f1030d3360fa5de09a2d1aa492b8c08f649e20`. Прочитан `features/payment-environments/08_qe_report.md`: native SOURCE CLOSED, 2/3, revision `49f281fadebe2ef7294b83761688d96a90090e4636622f82a17e0de70570b26d`. Собственные Git-команды не запускались. Все **30/30** файлов принятого `07_code_changes/source-manifest.json` фактически совпали по SHA256; SHA самого manifest — `e18c51e65588adf82b1e4ac2595c7b5c13cc2a821bb00a761b65e8d9197f63fd`.

## Контракт и исходники

| Проверенная граница | Фактический результат |
|---|---|
| LIVE proof / shared identity | `verifiedLivePaymentSql` требует обе environment=live, matching nonnull merchant, обоих provider=yookassa, exact intent/account/provider payment id/amount, payment succeeded без review, intent succeeded/fulfilled. Alias whitelist сохранён. Нет SKU, периода, текущего config или report revenue filters. Shared `PaymentIdentity` явно разделяет unknown, fake/test и YooKassa/test/live. Совпадает с05. |
| All-rights union | `credits.ts` не изменился. Grants содержат entitlement_start/end и payment_ref intent; TEST/unknown не исключаются из будущего all-rights reader. Helper используется отдельно для LIVE proof. Полный mixed tail, pure TEST suppression и временный defer остаются прежними требованиями. |
| Fulfill/refund/backfill locks | `applyVerifiedPayment` и `recordVerifiedRefund`: payment advisory → account FOR NO KEY UPDATE → intent/payment; credit fulfillment затем берёт `creditAccountLock`. Reconcile: payment advisory → account → intent → payment. Email writer также берёт account первым. Будущий billing account → credit lock → notice не берёт payment advisory и не вводит обратный порядок. Это чтение исходников; конкурентные PG проверки остаются TASK-6. |
| Repair зависимости | Ordinary bind меняет intent, не классифицирует существующий historical payment; promotion payment разрешён explicit backfill. Refund меняет status/review, provenance reconcile — identity/provider binding; они не удаляют grants и не создают credits. Удаление payment id из обычного outcome log не влияет на eligibility reader. Оснований пересматривать QCSD RISK-01/QUALITY-01 нет. |
| Config / environment / queue / mail | Их ранее измеренные bytes не изменились. Новый billing flag пока отсутствует. Existing checkout predicate/availability сохраняются. Queue передаёт существующий SupportMailer; shared cap4, sendRetention key/JSON и8s timeout на месте. Watchdog single-flight: media → expirePaidPlans → retention mail → retention cleanup; billing добавляется после cleanup по06. Новый startup/mail dependency не появился. |
| Guards / preflight | Env scanner продолжает проверять optional config keys и sibling wiring. Accepted030 preflight test строит shared+DB+web и проверяет isolated provenance CLI без подключения из startup. Config/ip fixed pins прежние; billing-handler pin теперь accepted030 `65e7…b75b` и совпадает с файлом. Будущая правка config требует только своего нового pin; handler без изменения не перепинить. |
| Migrations / enums | В исходниках31 SQL-файл до030 включительно,27 уникальных CREATE TABLE;030 добавляет columns/checks/triggers, не таблицу. Existing integration assertion=27 согласован; после новой031 ожидается28. 031 отсутствует. Existing028 отсутствующие SQL_ENUMS entries остаются baseline debt; новые031 state/offset CHECK должны получить entries по06. |
| Автоплатёж | В accepted YooKassa create body `save_payment_method` отсутствует; запланированная в06 единственная строка `false` всё ещё нужна. Это не изменение flow и не разрешение recurring payment. |

## Фактические pins после merge

Все38 source/guard/reuse pins записаны в `requirements-revision.json → dependency.filePins`. В таблице — новые источники и6 изменившихся из34 исторических pins плана06; оставшиеся28 совпали. Исторические02/06 не переписаны.

| Путь | SHA256 |
|---|---|
| `packages/db/src/payment-provenance.ts` | `3bf5e9a1e9f2a06b4f97a5ca60ad9aef1a9373bb3b72fffed14aaa4c3e53ef9e` |
| `packages/shared/src/payment-identity.ts` | `0efa9f707b5020ed74caa70516c01cd42b24828d3c59a4f630891c5da89d6186` |
| `packages/db/migrations/030_payment_environments.sql` | `70d0004c574a41fd29421841418dcedcbe37ba8bbeb0eca08b83cf64be460752` |
| `apps/web/src/server/payments/provider.ts` | `4803e7fd8aa73f7cf63a23c5627006cfb8c796a180051fbe7ed92126e1d02281` |
| `packages/db/src/index.ts` | `ee99ab7780f5c14ae77e24f20624c8625bcccdb10d930104341340b9da2caa02` |
| `packages/db/src/payments.ts` | `7e18f4d66e8a79d659c0aab7d0404245409284ed84eabacac1f4e8b5952cfe0f` |
| `apps/web/src/server/payments/yookassa.ts` | `941450e01f1a86bb75ed2f74e3614bcb1ad430fb9b9335c64adb8c5f9cbba173` |
| `apps/web/src/server/billing-handler.ts` | `65e7bff02d517c0e20dbc82b9ee3d6c43c16e2389237ff4042a1dc802754b75b` |
| `tests/test-webhook-route.test.ts` | `376acb5a35dce6bc5a8d6883ed433c26d33fefe11405f9d00346d96dc084b802` |
| `tests/preflight.test.ts` | `2c0334c9ab585875b2bdb379414351b194ffaed5d589ab2753ccf2e5743332c2` |

Закрытые normative/reuse inputs: **10/10 SHA совпали** с существующим manifest: OpenSpec4, reuse02 и feature artifacts5. В частности01 `bbda4db15b0b32850cbffec55c7cb40150746dd1ba07b570bd20f4d080a44720`, ADR `3949e4b034bb416e7fe73e04f0cdde1f81ba124dac49bf79614240f5cfa56e7c`,05 `5978b05d9b9db4ee3e06c65e413b4f6d16a3032a10f9a477ff3276b45b069252`. QCSD CLOSED относится к revision `e46927fef60ea475faf7d643558575e82db686563145f4a5f91e1eae7c1ecf2e`; эта проверка не создаёт новую квитанцию QCSD. Original `.fa-state/base-ref` остался `f701c605f7c7487b6f2d341568861cc19e5ffca1`.

## Реальная проверка и границы

Исполнены `rg`/`sed`/`cat` по перечисленным исходникам, затем `python3` с `hashlib.sha256`, JSON parse, сравнением30 accepted source entries,10 core entries и34 historical plan pins; count получен regex `^CREATE TABLE(?: IF NOT EXISTS)?\s+([\w]+)` по migration SQL. Это статический schema count, не запрос runtime PostgreSQL. Финальная проверка проверяет38 dependency pins, SHA этого отчёта и неизменность остальных24 feature/OpenSpec артефактов; application tests не выполнялись.

На момент handoff runtime030 ещё не подтверждён этой проверкой; координатор проводит отдельную поставку2. Принятая база и source recheck разрешают переход к настоящим K1/K2, затем к коду3; **031 и feature3 delivery — только после030 runtime/feature2 delivery**. K1/K2, код031/reminders, runtime, private QA env, Git и receipts здесь не изменялись. Нового requirement/architecture delta нет; повтор полного QCSD не требуется. Если дальнейший источник изменит этот контракт, нужен focused recheck исходных reviewers до зависимого кода.
