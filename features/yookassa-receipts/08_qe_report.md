# Фактические проверки чеков ЮKassa

## Итог source QE

QE-VERDICT:A-

Оценка A− выставлена координатором по независимым отчётам, а не приписана моделям проверяющих. **READY для поставки кода в прежнем TEST-режиме; боевые продажи и регистрация настоящего чека не приняты.** Native evaluate завершился exit0/closed после двух witnessed cycles: revision `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`, nonce `63778ffa-2a0f-436a-b132-d54277372051`, sequence4, eventDigest `8ea819713ba37747819715ed5dd2bb4eaa223043b40fefbfee9963d884f3a713`. unresolved=[], reasons=[]; history complete, ceiling3 не превышен. Реальный результат сохранён приватно как `qe-r2-evaluate.private.json`; native journal/host не пересоздавались.

Автор кода — gpt-6.1-sol high. Проверяющие — три отдельные свежие сессии с запрошенной моделью gpt-6-astra xhigh: primary/code-critic, security, tests. Начальные задания содержали нормативные требования/ADR/архитектуру/план, без выводов автора; код и тесты проверяющие нашли самостоятельно. Dispatch-параметры известны, отдельная телеметрия backend-модели недоступна. Cross-model разрешён владельцем; cross-family не заявляется. Отчёты: [primary](08_primary_review.md), [security](08_security_review.md), [tests](08_test_review.md).

## Findings Ledger

| Finding | Severity | Status | Round | Author | Title |
|---|---|---|---|---|---|
| P-1 | MEDIUM | fixed | 1 | codex | Для expired unbound + invalid config нужен409 до конфигурационного503; originating primary независимо проверил R2 |
| S-1 | HIGH | fixed | 1 | codex | Synthetic wiring fixture пропускала три новых env; security проверил presence/deletion и старый negative control |
| S-2 | HIGH | fixed | 1 | codex | Fixed callback owner pin устарел; security независимо проверил три владельца, fixed pins и negative byte-drift/IP controls |

P-1 имеет исходную severity WARNING в native receipt; MEDIUM здесь — явная нормализация к закрытому словарю табличного ledger. Исходные значения/condition meanings сохранены. Новых незакрытых условий при focused R2 не выявлено. Наличие отчёта не заменяло evaluate: он вызван только после собственных entries всех трёх originating ролей.

## Фактическое покрытие и антидрейф

| Требование / риск | Реальная проверка и результат | Предел доказательства |
|---|---|---|
| FR-1/3/4/8: точный receipt JSON, сумма, enum | Реальный adapter/socket, все четыре предложения, одна RUB-позиция quantity1.000, явные VAT1..12/subject/mode; receipt unit6 и integration18 прошли | Локальный socket не подтверждает регистрацию чека ЮKassa |
| FR-2/NFR-2: серверный адресат и закрытый body | Email из account под существующим lock; forged fiscal/email/amount поля дают422 до intent; настоящие соседние positive controls | Auth/rate/Origin бизнес-правила не менялись |
| FR-5/NFR-3/4: snapshot/retry/concurrency | Принятый POST с оборванным ответом, fresh wiring после drift email/VAT; PostgreSQL waiter за реальным holder PID; commit виден socket observer; CHECK/immutable/erase positive/negative cases | Смена publicOrigin и внешнее время приёма остаются эксплуатационными ограничениями ADR |
| FR-6/P-1: ограничение времени | Отдельные fixtures T−1ms, T/T+1ms,24h/49h/future/invalid/missing; NULL snapshot × invalid config409; молодой invalid503, bound GET; cutoff после async SQL | Часовой запас — допущение о часах/доставке, не абсолютная внешняя гарантия |
| FR-7/NFR-1: config и PII | 19 fresh env/runtime/deps случаев; startup/health/status/webhook доступны; live без receipt до HTTP отвергается; synthetic provider/DB/validator faults не раскрывают markers | Боевые параметры отсутствуют; full_prepayment и закрывающий чек не поддержаны |
| FR-9: начисления/referrals/refunds | Billing25, credits20 и адресные receipt tests проверяют прежнюю идемпотентность; повтор/возврат не начисляет повторно | Настоящая покупка/возврат не выполнялись |
| NFR-4/S-1/S-2: совместимость guard | Presence/deletion controls, fixed handler/ip/config pins, byte-drift/spoofed/missing-hop controls; independent security66/66 и tests41/41,0skip | Portable guard не является operational reapproval внешнего callback-профиля |

Авторский R2 scoped: **61/61 PASS,0skip** (24 receipt +17 guards +20 credit). R2 broader regression:105 executed/102PASS/**3 прежних baseline FAIL**,0skip. Typecheck, lint, synthetic env wiring и diff-check exit0. Результаты разных авторов/прогонов не складываются в искусственный общий счётчик. Primary выполнил статическое ревью и не присваивал динамические результаты. Security R2 самостоятельно66/66PASS, tests R2 самостоятельно41/41PASS, без skip/name-filter; raw hashes есть в их отчётах.

Все9 FR и4 NFR сопоставлены с code/test оракулами; actual16 code/config/test targets и27 measured paths сохранены. Нормативные OpenSpec proposal/spec/design сверены с тремя pins requirements-revision.json; strict validate exit0. Tasks отмечают фактическую реализацию/проверки, не разрешение боевой оплаты. Package/lock не менялись, новых зависимостей/сервисов/таблиц нет. Новый чистый parser не добавляет I/O в startup/health; production receipt JSON не входит в публичный IntentView.

## ADR fitness и расширенный QE

ADR-001 проверен по всем16 пунктам Step8: конкретное решение, допустимый status/reversibility, нейтральный Context, ранжированные drivers, три симметрично рассмотренных варианта, driver-linked rationale, конкретный JSONB/trigger/config/API, отрицательные последствия, follow-up и назначенная after-action проверка. Confirmation ссылается на реально исполненные `retry reuses receipt snapshot after email and VAT change`, `concurrent retries commit one canonical receipt snapshot`, `unbound intent enforces conservative 23 hour retry cutoff`, `live provider refuses missing receipt before HTTP`. Code/decision drift не обнаружен.

MEASURED: `npm run dz -- amendment-check --feature-dir features/yookassa-receipts --json` дал8/8 resolved,0missing/placeholder,exit0; raw result `amendment-final.private.json`. Существование test дополняется независимым чтением оракулов и реальными позитивными/отрицательными controls. Автор R1 уничтожил пять адресных mutants (live no-receipt, VAT drift, cutoff comparison, raw error log, SQL UNKNOWN); byte restoration сверена. Это focused mutation evidence, процент mutation coverage и отдельный автоматический discrimination-check не заявляются. Координатор повторно сверил27/27 snapshot и16targets: stubs0. Guard code exit0/pass по no-skill-drift; signature-fresh notEstablished, audit-store absent. Это не проверка подписи и не доказательство исполнения всех возможных правил.

Применены pinned reference-протоколы requirements/risk/contract/security/regression/mutation/brutal-honesty. AQE runtime не устанавливался и не запускался. M-tier: fleet Step9 не требуется; source review расширен тремя независимыми ролями из-за платежей. Нагрузочные/chaos/performance проверки не выполнялись: SLA/медиа-пайплайн этим изменением не меняются.

## Ограничения и граница поставки

Три старых retention assertions в billing.unit ожидают прежнюю3-дневную policy и падают уже на исходной ревизии; перечислены в author-summary. Отдельный tooling baseline имеет21PASS/1FAIL из22 из-за hardcoded11 vs12 уже существующих shell paths. Никакой из этих отказов не скрыт удалением assertion/filter или изменением CLI. process:install восстановил skills, но весь его guard-suite не объявляется PASS.

Полный unfiltered test, media/model/S3 и browser E2E всего продукта здесь **NOT RUN**. Для receipt изменения выполнены настоящие PostgreSQL и HTTP socket controls; MinIO не использовался и не требуется. R1 npm build exit0 не выдаётся за финальный R2 build: окончательная Docker-сборка выполняется из принятого source commit и отражается в10_delivery.md. Merchant callbacks и регистрация фискального чека у провайдера ещё требуют отдельной приёмки. Рабочие платежи остаются TEST, боевые ключи/налоги не подключаются.

## Учёт и обучение

До записи qe checkpoint проверен resume guard: stage qe отсутствовал, повторная строка за восстановленный этап не создавалась. Первый feature-adr-record exit2/refused: в row не хватало slug, ничего не записано. Исправленный payload содержит slug/stage и null tokens/minutes, без auto и вымышленных расходов. Фактический ответ writer: `{"ok":true,"kind":"ledger","stage":"qe","verdict":"written","exit":0,"reason":"appended and verified by re-reading the tail","blocking":false,"target":"/home/clipmkr/.dz/feature-adr/run-cost-ledger.jsonl"}`. CrossFamily=false; gradeSource — coordinator synthesis. Повторный claim-check после явной маркировки measured amendment evidence:exit0,findings[].

Recall по теме guard/env/receipt вернул[]. Доказанный урок попытались сохранить через project-pinned teach в канонический /home/clipmkr с no-mirror:exit1, store guard REFUSED — lexical SQLite unreadable, recorded97rows. Store не удаляли, guard не сбрасывали, cold-start обход не применяли. Запись урока **не подтверждена**; ошибка не скрыта, на закрытие source QE не влияет. Урок: изменения billing-handler/env требуют соседних guard suites и отрицательных byte-drift/deletion controls; доказательство — исходные S-1/S-2 и независимый R2 security66/66PASS.

Последующая диагностика уточнила причину: SQLite quick_check readonly=ok; Node22 native binding канонической установки работает, а в worktree после npm ci --ignore-scripts binding отсутствует. Повторили project-pinned CLI **из /home/clipmkr на Node22**, не изменяя store и зависимости: настоящий recall вернул существующие уроки, teach exit0/written, ID `teach:90c46998255eb41b`, reward0.9, total98. Повторный recall нашёл ровно эту новую запись. Поэтому предыдущий абзац сохраняет историю отказа, а итог обучения — **записано и извлечено**. Новая строка QE ledger не создавалась.

Поставка source commit `012efb6a2465f156326b2f5756da9171aa2f635e` выполнена после закрытого native QE: окончательный Docker build exit0, миграция029 и опубликованный web приняты узким live smoke. Протокол и точные границы — [10_delivery.md](10_delivery.md); это не расширяет source QE до приёмки боевого магазина.

Ниже сохранён фактический ход подготовки и первого отказного QE; исторические «ещё нужен/не выполнено» относятся к моменту их записи.

## Подготовка

Node22 npm ci --ignore-scripts:exit0. process:install восстановил9skills/135files, затем его guard suite:21PASS/1FAIL, общийexit1. Единственный отказ — существующий test hardcodes11excluded shell paths, фактическиих12; все12уже tracked наbasee955e3f, новыхapp/source shellpathsнет. Это baseline fragility процессноготеста; общий installPASS не заявляется, test/CLI ради receiptнеправятся. Прямой проектный K1 current scan:complete/free,470sourcefiles; полныйJSON сохранён приватно. ОкончательныйK1 по settledplan ещё нужен.

Подготовлена одна отдельная *_test БД и отдельная роль без прав на рабочие данные. ПроверкиSQL/body/реальныхчеков ещё не выполнены. Рабочий runtime не менялся.

Предкодовый QCSD: все3отдельныероли завершили. Полныйaggregateexit1/unresolved5:QC-1 иQT-1…QT-4, не clean. Riskрольclean; процесснуюнеполнотунеподменяемрешениемавтора. Начинаетсякоррекцияизмеренногоdesign,затемoriginatingverification.

Baseline доreceiptкода: billing.unit+integration+payments-guards 71PASS/3FAIL (3files). Все3отказаизbilling.unit ожидают прежние3-дневныеretentionформулы/поискстрок, несовместимыс уже опубликованной7-дневнойpolicy. Этоисходныеassertions, не новыйreceiptрегресс; integrationиpaymentguardsпрошли. Rawlogсохранёнприватно, ихнельзяскрытькакgreenполныйнабор.

Повторный полный ideation aggregate:exit0/closed6a5bce53, все5originating verifications; подробности03.5_ideation_report.md. K1 актуальные5exports и2test modulesFREE0. Root K2PASS0/0warnings/1no-acid skip. Target admissionadmitted0,manifest6bfa2716a4297bdfd0f11c3a2d3bc7fde5499f81109b6cc55be47f10e955f149. Coder contextcomplete0,digest6aa984ed4323dc1201ce39967e4bf1599cc9805427fd8bd721f8ea551a3c75fc; весьliteralblock26826символов включён в фактический prompt freshgpt-6.1-sol high, автор подтвердил приём. Plancheckpoint записан поддерживаемойкомандой послеизмеренныхартефактов. Первыйвызовcheckpoint сabsolute--artifact отказал; повторсfeature-relativeartifactдал0, не подменялиотказуспехом.

## Первый независимый source QE

Nativeprepare25files:22803d51e6b0d8bcb05befd1261e3d8e3c4d36d21c9965575a6cef13d2ea4afb. Три новые сессииgpt-6-astra xhigh проверили кодSol: primaryconditional/P-1WARNING; securityno-go/S-1,S-2HIGH; testscleanвсвоейобласти. Полныйaggregate только после всех3entries/report:exit1/unresolvedP-1,S-1,S-2,rounds1. Это не закрытыйQE.

Security самостоятельно установил baseline17/17PASS двухсоседнихguard suites, тогдакакcurrentимеет2новыхотказа:missingfiscalvarsвwiringfixture иустаревшийfixedSHAобработчикавcallbackguard. Их нельзясписатьнатристарыхretentionasserts. Primaryнашёлневерный503вместо409напересеченииexpiredunbound/partialconfig. Rootорганизуетадресноеисправление срасширениемплана,positive/negativecontrols и originatingverification.
