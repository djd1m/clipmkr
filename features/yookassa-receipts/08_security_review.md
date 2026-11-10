# Независимое security QE: yookassa-receipts

Актуальный итог focused R2: **clean** на revision `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`; S-1/S-2 независимо проверены как исправленные. Подробности R2 в конце. Ниже сохранены основания и исходные находки R1.

Дата: 10.11.2026. Роль `qe-security`, family `owner-exception`. Сессия `/root/receipts_qe_security`, новая, без истории кодирования. Координатор подтвердил фактические параметры вызова инструмента: `model=gpt-6-astra`, `reasoning_effort=xhigh`, `fork_turns=none`; отдельная backend-телеметрия модели агенту не доступна. Автор кода по переданному основанию — `gpt-6.1-sol high`. Это cross-model по конфигурации запуска, не cross-family.

**Вердикт: no-go.** Найдены два новых регресса обязательных защитных тестов, S-1/S-2, оба HIGH/structural. Это уровень незакрытого QE, а не утверждение о найденном обходе защиты production. В исследованной receipt-реализации не подтверждены подмена адресата/цены, утечка PII, потеря immutable snapshot или ослабление webhook verification.

## Входы и привязка

Сначала прочитаны `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`, затем `features/yookassa-receipts/{owner-authority.md,01_requirements.md,03_adr/001-snapshot-receipt-in-payment-intent.md,05_architecture.md,06_implementation_plan.md,requirements-revision.json}` и три закреплённых OpenSpec proposal/spec/design. После этого самостоятельно найдены Git diff относительно `e955e3f2e67e5663eec24dadeb828cacd18e9a9f` и новые untracked migration/tests. Авторские `07_*`, `08_qe_report.md`, отчёты других reviewer и их выводы не читались.

Контракт — `/home/clipmkr/.agents/skills/feature-adr/modules/08-qe.md`. Применены reference-протоколы security-testing, contract-testing, risk-based-testing из `/home/product-studio/vendor/agentic-qe/skills` и профессиональный review-формат pinned brutal-honesty; AQE runtime не запускался.

Самостоятельная проверка SHA-256 до анализа и перед отчётом: **25/25 manifest entries совпали**, все **3/3 ledger pins совпали**. Host `features/yookassa-receipts/.fa-state/review-convergence-qe-host.json`: nonce `a90bad76-2d4c-49df-9412-9573abc54615`, revision `22803d51e6b0d8bcb05befd1261e3d8e3c4d36d21c9965575a6cef13d2ea4afb`. Host/history/checkpoints/index не изменялись.

Изучены все 14 source/config/test targets плана и связанные реализации `packages/shared/src/config.ts`, `payments/config.ts`, `payments/origin.ts`, billing guards/status/webhook, DB payment/grant/refund readers, immutable trigger 022 и `apps/web/src/server/retention.ts`. Поиск production references `receipt_snapshot` подтвердил его использование только в приватном creator/checkout; публичный reader явно выбирает прежние поля. Дополнительно исследованы соседние `tests/payments-guards.test.ts`, `tests/test-webhook-route.test.ts`, `scripts/check-env-wiring.mjs` и test environment fixture.

## Проверка границ доверия

Приоритеты выбраны по риску: подмена покупателя/цены и нефискализированный real POST — высокий; PII/errors и snapshot/concurrency/retry — высокий; TEST policy и webhook authenticity — высокий. Изменений зависимостей, криптографии, HTML/UI или пользовательского адреса внешнего API в diff нет; общий dependency audit не подменял проверку этих границ.

| Свойство | Фактическое evidence |
|---|---|
| Серверный email/цена и закрытый body, FR-2/3, NFR-2 | `billing-handler.ts:101–120`: guards и закрытый JSON до intent; цена из CREDIT_SKUS/PAID_PRICE_MINOR. `payments.ts:29–40`: account ID из сессии, active/account FOR SHARE, email из SQL, параметры SQL связаны. Прошли body-forgery cases с валидной сессией и соседним успешным POST, authenticated-account email test. |
| Изоляция и отсутствие публичного snapshot, NFR-1 | `payments.ts:63–69`: SELECT без snapshot и с account_id; handler отдаёт явную projection. Receipt status test сначала доказывает наличие snapshot, затем отсутствие email/description/ключей receipt в ответе. Billing AC-3 подтверждает 404 для чужого intent. |
| Атомарность/неизменность/erase, FR-5, NFR-3 | Одна транзакционная вставка snapshot+offer, UNIQUE/account-key и чтение canonical winner; миграция029 усиливает прежний trigger. Реальные PG tests прошли observed lock, CHECK включая отсутствующие/JSON-null/лишние поля, разрешённый status UPDATE и запреты object→object/object→NULL/NULL→object. Реальный erase удалил доказанно существующий intent, payment сохранился с null account_id/intent_id. |
| Ретраи, FR-5/6 | Accepted/drop-response socket, fresh wiring после email/VAT drift, одинаковый JSON/key и один intent; новый ключ использует новые данные. После async SQL проверяется возраст; T−1ms POST, T=23h и позже/invalid/missing/future — STOP. Bound GET работает с непригодной текущей config после48h; legacy snapshot не достраивается. Это локальная граница, не доказательство удалённого SLA. |
| Config и exact payload, FR-1/3/4/7/8 | Полный явный набор без фискальных defaults; absent/empty TEST остаётся без receipt; partial/invalid запрещает новый POST. Реальная цепочка readEnvironment/config/billing-runtime/deps и sockets прошла матрицу, health/status/webhook доступны. Real-mode no-receipt отрицательный test имеет успешный receipt control на том же socket; все четыре предложения — одна RUB-позиция quantity="1.000" с той же строкой суммы. |
| Ошибки/PII, NFR-1 | Новые validator сообщения статичны; checkout/run не печатают exception message/name. Выполнены реальные provider error body, CHECK error с PII в detail, invalid-email validation и PaymentVerificationError seam с markers, path-fired счётчиками и успешным control. Markers отсутствуют в HTTP и перехваченных billing logs. |
| TEST policy, authenticity, grants/refunds, FR-9/NFR-2 | Per-account TEST policy из config не менялась; старые guards идут до intent. Billing integration25/25 включает реальные sessions, противоположный test flag, поддельный IP/amount/unpaid, provider outage и повторы. Provider по-прежнему повторно читает payment и сверяет shop/test/amount/paid/order; receipt не участвует в выдаче credits. Новые package/referral/refund tests прошли. Соседняя SHA-привязка TEST callback требует ремонта S-2. |

## Находки

**S-1 — HIGH, structural: сломан positive control существующего env-wiring guard.** На текущих `apps/web/src/server/environment.ts:53–55` добавлены три receipt env, compose их передаёт, но `tests/payments-guards.test.ts:192–199` строит synthetic compose из прежнего `tests/fixtures/environment.ts`. `checkWiring(config)` возвращает `web: YOOKASSA_RECEIPT_VAT_CODE`, `web: YOOKASSA_RECEIPT_PAYMENT_SUBJECT`, `web: YOOKASSA_RECEIPT_PAYMENT_MODE` вместо `[]`. Из-за раннего отказа не исполняется прежний отрицательный контроль удаления N5_TEST_CHECKOUT_ACCOUNT_ID. На baseline тот же suite проходит. Реальный compose wiring не объявляю потерянным: дефект — несовместимая фикстура и новый красный обязательный guard.

Требование: NFR-2/NFR-4 и TASK-6 — сохранять защитные проверки, без новых необъяснённых failures. Исправление должно расширить план/targets для затронутой фикстуры/проверки, вернуть успешный валидный synthetic compose, сохранить отрицательный TEST-account контроль и доказать отказ guard при удалении каждой новой receipt env. Нельзя исключать новые имена из checker или удалять тест. Measured scope: `apps/web/src/server/environment.ts`, `docker-compose.yml`, `features/yookassa-receipts/06_implementation_plan.md`.

**S-2 — HIGH, structural: TEST callback guard привязан к прежнему billing-handler.** `tests/test-webhook-route.test.ts:22–30` ожидает SHA handler `2fcef1bf93e3d300c8d94b17ff73e8a81c1630f9477d64b1ca9f1e52c7af10a0`, совпадающий с baseline; текущий измеренный SHA — `1129111454c5554d4e5b8649dcd9a145f92cf67120bd4fd11eb5af03a8c3977a`. Тест падает на pin до выполнения spoofed/missing-hop assertions. Само сохранение runtime проверок подтверждено анализом и billing integration, но действующая callback qualification не подтверждает текущий артефакт.

Требование: FR-9/NFR-2/NFR-4 и TASK-6 — сохранять webhook authenticity, guards и code/spec anti-drift. Требуется осмысленная перепривязка к текущим независимо проверенным владельцам handler/ip/config с сохранением фиксированного pin и positive/negative IP controls; проверить, что изменение измеряемых bytes обнаруживается. Динамический expected hash от проверяемого файла, снятие assertion или объявление старой qualification текущей недопустимы. Расширить план/targets и выполнить независимое повторное подтверждение. Measured scope: `apps/web/src/server/billing-handler.ts`, `features/yookassa-receipts/06_implementation_plan.md`.

Других подтверждённых нарушений по проверенным security-сценариям не обнаружено. Новых фискальных условий не выдвигаю; ожидающее подтверждение бухгалтера остаётся прежней границей задачи.

## Выполнено самостоятельно

1. Source/requirements/ADR/OpenSpec analysis, actual Git diff и untracked inventory; дважды сверены25SHA, проверены3ledger pins. Scan markers незавершённой реализации по14targets не нашёл совпадений.
2. Node22.23.4, разрешённый private wrapper: `python3 /root/.config/clipmkr/yookassa-receipts-20261110/run-tests.private.py qe-security tests/yookassa-receipts.unit.test.ts tests/yookassa-receipts.integration.test.ts tests/billing.integration.test.ts tests/payments-guards.test.ts tests/test-webhook-route.test.ts`. Exit1, **63 PASS / 2 FAIL / 0 skipped**, 5 files,13.85s. Receipt unit6/6, receipt PG+socket17/17, billing PG+socket25/25, guards14/15, portable TEST callback1/2. Runtime SQL не выполнялся: integration suite требует isolated *_test DB и собственную случайную schema.
3. Независимый baseline control: `git archive e955e3f2e67e5663eec24dadeb828cacd18e9a9f` в `/tmp/clipmkr-qe-security-baseline-sxc3gev_`; Node22 с минимальным очищенным окружением запустил только `tests/payments-guards.test.ts tests/test-webhook-route.test.ts`. **17/17 PASS**, exit0,4.38s. Это доказывает, что S-1/S-2 внесены текущим изменением, а не являются ранее красным baseline.

Private raw logs: `/root/.config/clipmkr/yookassa-receipts-20261110/qe-security.private.log`, SHA-256 `bbeeb589dce50bfa309dadbed6f65d74a435e9ef4b4644b8e8bd18a2e774b1ce`; `qe-security-baseline.private.log`, SHA-256 `80ef3e8659cbe0c3d7094f9dfb73fac349738fb3f6b70eca6a2f66ce478c5404`. Они не добавляются в Git.

## Изученные evidence и NOT RUN

Evidence этого отчёта — собственные чтение, измерения и запуски. Авторские/чужие QE receipts, full-suite результаты и mutation результаты не использованы как доказательства.

**NOT RUN:** полный suite, typecheck/lint/build, отдельный full credit-packages suite и migration rehearsal, runtime deployment/SQL, merchant API, live credentials, реальные покупки/возвраты, Cloud.ru/DNS, browser/UI/CJM E2E, доставка/регистрация чека, внешний webhook и operational private callback profile, общий vulnerability/dependency scanner и mutation run с изменением source. Эти действия не заявлены пройденными. Условия бухгалтера не подтверждены, live включение не разрешено. Проверка generic backend/TEST не заменяет merchant или ручную приёмку.

До закрытия S-1/S-2 source QE не закрыт. Агент записывает только собственный отчёт и собственную entry в общем review receipt под fcntl lock; author assessment не проверялся, aggregate/evaluate/checkpoints остаются координатору.

## Focused R2 — originating verification S-1/S-2

Дата: 10.11.2026, та же независимая originating-сессия `/root/receipts_qe_security`. Текущий verdict **clean**; исходные условия S-1/S-2 сохраняются дословно в receipt и получают отдельные structural verifications. Новых подтверждённых рисков в проверенном repair и затронутых зависимостях не обнаружено.

Native snapshot: nonce `63778ffa-2a0f-436a-b132-d54277372051`, revision `dcf8d8545cd4144cb6ce9a83897b9c7f4a5f1177c9c263d76cad520ec25ba6ae`. Самостоятельно сверены **27/27 SHA manifest** и **3/3 ledger pins**; 27 SHA повторно проверены после собственных тестов. Изучены author assessment и newRisks из `qe-author-delta.json` (SHA-256 `cf058058e1975510f640440a595648fa05bd94bca5b8407f1561986b27a504da`), новый TASK-7/AM-6…8/16-target plan и все пять changedScope: `billing-handler.ts`, `06_implementation_plan.md`, `payments-guards.test.ts`, `test-webhook-route.test.ts`, `yookassa-receipts.integration.test.ts`. Авторская классификация structural верна; заявленная дельта соответствует фактическому коду. Авторские результаты full regression/typecheck/lint/build не выдаются за самостоятельно исполненные.

**S-1 — implementationVerified:true.** `tests/payments-guards.test.ts:195–209` добавляет три пустых optional receipt env только в synthetic web fixture; это соответствует compose-отсутствию полного набора. Первым выполняется positive `checkWiring=[]`. Затем каждое имя действительно удаляется, checker обязан вернуть ровно его, поле восстанавливается и positive повторяется. После цикла прежнее удаление `N5_TEST_CHECKOUT_ACCOUNT_ID` достигается и проверяется. Checker, shared fixture и production config исключениями не ослаблены. Самостоятельно выполнен весь guard suite:15/15 PASS, включая этот test; source inspection подтверждает четыре действительных negative deletion controls. В текущем плане оба новых test targets присутствуют.

**S-2 — implementationVerified:true.** Самостоятельный SHA-256 файлов совпал с тремя буквальными expected pins, а не с динамически вычисленной ожидаемой величиной:

| Файл | Фактический SHA-256 |
|---|---|
| `apps/web/src/server/billing-handler.ts` | `006829ba5c6dfa94a03a02a806522e8938bedd651949a8e657021cb461c3054f` |
| `apps/web/src/server/ip.ts` | `af357f46c7cad2def1629a34e85b576237fd6a5db8ca9d2249639e706c823301` |
| `packages/shared/src/config.ts` | `d66cd0977b52de2331f0a630a1c79476492aea0fec6a2be5263714ba094ff12f` |

Перечитаны фактический handler после переноса age guard, `clientIp` и прежний TEST-account config/policy. Смысл callback-защит сохранён: источник определяется справа по доверенным hops, отсутствующая/некорректная цепочка отвергается; receipt не участвует в webhook authenticity. В `test-webhook-route.test.ts:23–34` для каждого владельца выполняются positive hash assertion и in-memory negative byte-drift assertion, затем spoofed-left-prefix case и три missing/invalid-hop случая. Весь portable suite2/2 PASS; источник/Caddy fragment и private operational профиль не перепривязывались. Это новое portable source evidence, а не повторная operational approval.

**Связанная дельта P-1 проверена как зависимость, без присвоения чужого condition.** `billing-handler.ts:124–148` сохраняет terminal status и bound GET до проверки возраста. После последней async intent-работы age guard теперь находится до ошибок receipt config; между ним и provider POST нет нового await. SQL NULL snapshot с partial/invalid config при T=23h,24h, future time, invalid clock, missing timestamp и invalid timestamp получает409 `payment_reconciliation_required`,0 POST. Молодой invalid config по-прежнему503, bound после48h — реальный GET без нового POST. Эти12 отрицательных комбинаций и соседние controls исполнены в новом `expired unbound intent requires reconciliation before invalid receipt config`; полный receipt integration suite18/18 PASS. Проверки позднего SQL cutoff, канонического retry, immutable/erase/PII и package/referral идемпотентности также повторно прошли.

Собственная команда: Node22.23.4 + `python3 /root/.config/clipmkr/yookassa-receipts-20261110/run-tests.private.py qe-security-r2 tests/yookassa-receipts.unit.test.ts tests/yookassa-receipts.integration.test.ts tests/billing.integration.test.ts tests/payments-guards.test.ts tests/test-webhook-route.test.ts`. **Exit0;66/66 PASS,0 FAIL,0 skipped;5/5 files,18.76s.** Receipt unit6, receipt PostgreSQL/socket18, billing PostgreSQL/socket25, guards15, portable callback2. `git diff --check` для пяти changedScope завершился0. Private raw log `/root/.config/clipmkr/yookassa-receipts-20261110/qe-security-r2.private.log`, SHA-256 `d37146fe713a25a4772a4ead40b81a5872fb7f0444aea94869ae3ffa50ee1cf7`.

Author newRisks assessment проверено для фактического structural repair: новых production сущностей, async-переходов, SQL, providers, налоговых defaults или обходов TEST policy нет. Широкие заявленные автором прогоны отдельно не воспроизводились и не служат основанием S-1/S-2 verification. Все прежние **NOT RUN** границы сохранены: полный suite/typecheck/lint/build/merchant/production runtime/browser/operational callback profile в этой сессии не запускались. Receipt и security scope чисты по выполненным проверкам; fiscal confirmation, live разрешение и delivery acceptance этим не заменяются.

Только собственная entry `qe-security` обновляется под тем же fcntl lock: исторические conditions без изменений, S-1/S-2 verifications на текущей revision, `authorAssessmentChecked:true`, structural `deltaVerification` с independent implementation evidence. Чужие entries/author сохраняются; host/journal/checkpoints/index и общий evaluate не изменяются.
