# Независимое pre-execution review LIVE ЮKassa

Дата: 11.11.2026. Проверяющий: отдельная сессия `/root/live_activation_review`, запрошены `gpt-6-astra`, `xhigh`, `fork_turns=none`. Это metadata диспетчеризации, не независимая backend-attestation фактически обслужившей модели. Автор операторов — координатор; контекст кодирования и авторские QE-выводы проверяющему не передавались.

**Итоговый pre-execution вердикт: GO для зафиксированных ниже версий операторов при прохождении их runtime gates и выполнении условий исполнения. Открытых BLOCKING/HIGH нет; H1/H2/H3 закрыты независимым повторным чтением.** История первоначальных находок сохранена ниже. Операторы не запускались проверяющим. Это проверка допуска операции, не отчёт о включении LIVE и не приёмка настоящей покупки.

## Входы и границы

Сначала прочитаны `AGENTS.md`, `docs/review-policy.md`, `00_complexity_assessment.md`, `01_requirements.md`, `06_implementation_plan.md`; затем независимо найдены фактические producers/consumers и тесты. Также прочитаны `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/model-matrix.md`, применимые receipt ADR/architecture/fiscal confirmation и skill `/home/product-studio/.agents/skills/code-critic/SKILL.md`. Каталога `architecture/` с vision/degradations в этой рабочей копии нет.

Закрытые входы ограничены разрешёнными `freeze-and-drain.private.py`, `apply-live.private.py`, `desired-config-review.private.json`, `owner-webhook-confirmation.private.json`, `test-intent-reconciliation.private.json`, `historical-test-sale-scope.private.json`, `K2-taskrefs.private.log` в `/root/.config/clipmkr/live-activation-20261111/`. Сами secret profiles, Compose, merchant responses и рабочая БД не читались. Source/image из задания и review summary: `012efb6a2465f156326b2f5756da9171aa2f635e` / `sha256:cf5139ec1f8b14a29b29fed76eafb2e4544b46364332b9abc857a7c9d12231b1`; runtime привязка проверяющим не воспроизводилась.

## God-object growth (BLOCKING)

Нет новых application-модулей и роста source. BLOCKING по этой категории не найден.

## Security violations (BLOCKING / HIGH)

Новых нарушений не найдено. Локальный replay через административный `docker exec` подставляет origin только внутри контейнера; это привилегированное операторское действие, не новый публичный bypass. `clientIp` (`apps/web/src/server/ip.ts:3`) соответствует сформированной цепочке. Действующий handler повторно проверяет IP и вызывает adapter verification (`billing-handler.ts:214`, `:222`); adapter выполняет настоящий provider GET и сверяет shop/test/id/status/order/amount (`payments/yookassa.ts:143`, `:284`). Body локального replay не является источником финансовой истины.

Секреты в прочитанных операторах не литеральные; environment остаётся в памяти, payload передаётся stdin, закрытые файлы создаются с umask/0600. Новых публичных административных маршрутов нет.

## Architectural concerns (HIGH / MEDIUM)

**H1 — неполная граница TEST-drain (HIGH; edge-case concurrency / plan conformance).** Первоначальный `freeze-and-drain.private.py:24–40` читает старый snapshot пяти intent и проверяет provider до freeze, затем обрабатывает тот же список. Повторного authoritative inventory после остановки старого web нет. Фактический producer допускает прежний TEST-account (`packages/shared/src/config.ts:119–123`) и сохраняет intent до provider POST (`billing-handler.ts:119`, `:148`; `packages/db/src/payments.ts:25–48`). Запрос, прошедший старый gate до freeze, может оставить дополнительный bound либо unbound intent вне пяти. `apply-live.private.py:17` принимает один marker `completed`; после смены credentials старый TEST payment уже нельзя проверить LIVE adapter. Это нарушает FR-2 и остановку при неизвестном результате. До переключения нужны завершение старого producer, новый DB inventory, обработка всех TEST outcomes/STOP на unknown, затем фактическая проверка terminal состояния и финансовых инвариантов. `markIntentCanceled` возвращает void и ничего не сообщает о числе изменённых строк (`payments.ts:57`), поэтому stdout `terminal:canceled` сам по себе не доказывает post-state.

## Anti-pattern violations

Отдельных применимых нарушений не найдено. Короткий polling health и bounded список пяти provider GET для разовой операции не требуют нового retry framework/метрик.

## Type / contract issues

Receipt contract прослежен полностью: `environment.ts:53–55` → `config.ts:98` → `tariff.ts:84–89` → `billing-runtime.ts:14` → `payments.ts:31–40` → `billing-handler.ts:151–152` → `payments/yookassa.ts:222–245`. Подтверждённые три значения поддерживаются: VAT `1`, `service`, `full_payment`; email берётся сервером, snapshot фиксируется до provider POST. LIVE без receipt отвергается до сети. Нового recurring/автосписания оператор не вводит.

## Edge-case sweep

- Повтор webhook сериализован действующим transaction/event key/payment lock, второй grant не выполняется (`payments.ts:79–104`). Наблюдённый duplicate в replay должен привести к сверке persisted state, а не к новому платежу.
- Pending marker записывается до первой мутации; существующий marker запрещает слепой повтор. Обрыв после provider/SQL может оставить неизвестный исход: сохранять pending и сверять факты, не удалять marker ради повторного запуска.
- Перекрытие старого checkout и freeze не закрыто в первой версии: H1.
- Пять записей в закрытой сверке действительно сопоставлены с пятью order IDs: remote 2 succeeded / 3 canceled, pending 0. Это входной snapshot, не доказательство отсутствия более поздних намерений.
- Массовый объём/пагинация нового пути не менялись; новые схемы, account erase и version skew не реализуются этим config-only S.

## Test quality

Прочитаны применимые existing tests: freeze checkout при сохранении webhook/status и повтор grant в `tests/billing.integration.test.ts:99`, `:211`; IP/canonical provider rejection `:229`; receipt serialization/live refusal в `tests/yookassa-receipts.unit.test.ts:29`, `:48`; runtime receipt wiring `tests/yookassa-receipts.integration.test.ts:291`. Проверяющий их не запускал и не объявляет PASS. Они не доказывают корректность новых операторных сценариев или live merchant delivery.

## Process / done-ness gaps

K2 log содержит настоящий результат `PASS` для S с явно указанными skips; это plan-completeness, не выполнение runtime операции. Подтверждение владельца явно относится к БОЕВОМУ магазину, canonical URL и двум событиям; устаревшее поле `ownerWebhookConfirmation:false` в более раннем desired summary не отменяет отдельное позднее owner confirmation.

TASK-1: parser/desired summary подготовлены, runtime/invariant evidence требует исполнения координатором. TASK-2: до фикса H1 неполный drain. TASK-3: owner confirmation есть, до фиксов H2/H3 оператор недостаточен. TASK-4: browser/config/spoof smoke, post-backup и настоящая покупка ещё не подтверждены этим review.

## Production safety

**H2 — непроверенное аварийное состояние объявляется безопасным (HIGH; P6/P8).** В первой версии `apply-live.private.py:40` после `compose up` аварийная ветка записывает `failed-live-sales-closed`/`liveProviderPreserved:true` без проверки running/health/source/actual env/nonweb. Она также присваивает `binding.image = web.Image`. Исходным исключением мог быть именно image/config mismatch на строках 29–34: fallback тем самым принимает отвергнутый image в новый baseline. До записи safe-state и binding нужны те же проверки инвариантов с checkout=false и LIVE credentials; approved image не меняется. Непроверенный исход остаётся `unknown-reconciliation-required`.

**H3 — запись целого Compose без проверки разрешённой структурной дельты (HIGH; P6, FR-1/NFR-2).** `apply-live.private.py:22–29` сравнивает web image и env, затем заменяет весь Compose. Другие web поля, mounts и остальные service definitions этим сравнением не охвачены; `--no-deps` и сохранённые nonweb IDs не доказывают сохранность записанного файла и web mounts. Изменение конкретного mount не обнаружено: закрытый Compose не входил в разрешённое чтение. Но gate не гарантирует жёсткий scope «только web environment». До записи требуется структурное равенство всего документа после исключения `services.web.environment`, плюс сравнение env по восьми разрешённым именам. Удаление TEST exception при freeze означает, что на втором шаге относительно frozen профиля дельта может содержать семь имён.

Обязательные условия исполнения после закрытия HIGH:

1. Свежий штатный успешный backup с временем/артефактом перед мутацией и общий backup lock. Один `systemctl Result=success` не доказывает свежесть backup. После привязки нового web — post-backup и его фактический результат.
2. Проверенные source/image, шесть неизменённых nonweb IDs/images, runtime env/receipt и mounts; секреты остаются вне Git. Browser проверяется обычным credits-аккаунтом без создания LIVE intent; spoofed webhook получает отказ. Флаги/GET health не заменяют эти проверки.
3. При неуспехе после возможного LIVE intent закрыть только новые продажи, сохранить LIVE provider/webhook. Возврат TEST и восстановление старой БД поверх новых операций недопустимы.
4. Сохранить точные TEST payment IDs для исключения из ручных выплат и явно довести ограничение владельцу. `blogger-report.ts:67–75` и `partner.ts:143–151` не имеют test/shop namespace; известный TEST credit payment уже входит в предварительную выручку/оценку. Эти суммы нельзя представлять как чистые LIVE поступления/расчёт вознаграждения. Историю не удалять, refund/review reason не фабриковать. Постоянное разделение — отдельный source-план до использования отчёта для реального расчёта с партнёрами.
5. Покупку выполняет владелец. Canonical LIVE provider → настоящее merchant notification → grant → зарегистрированный receipt пока **NOT RUN**. Операторский TEST replay не закрывает эту приёмку.

## Suggestions only (LOW)

Нет дополнительных пожеланий, препятствующих разрешённому config-only запуску.

## Skipped checks

По заданию не выполнялись Docker/API/БД/платежи/backup, тесты/lint/typecheck, git/index и любые мутации кроме этого отчёта. Не читались неразрешённые private файлы и исходные secrets/Compose. Не проводились новая юридическая оценка, source QE всего приложения или полная E2E-приёмка. Прежние TEST business rows признаны историей, не боевыми деньгами.

## Повторная проверка исправлений

Первый fix-review выполнен чтением обеих полных версий операторов. SHA256 самостоятельно проверены: freeze `e78dbe28d9fe69c9fa49d1387fc46de023b6d9961528c96664a6058c7784f9d4`; live `e8f2925a80b3beb312e6382b88984bf27cc61feadb2078df39ce05afcbd91933`. Дополнительно явно разрешены и прочитаны `operator-repair-delta.private.json`, `backup-before-operation.private.json`, `compose-structural-proof.private.json`; исходные секретные Compose/профили по-прежнему не читались.

- **H2 закрыта:** `apply-live.private.py:50–56` проверяет approved image, running, mounts, source health, фактический LIVE env/checkout=false и nonweb; image в binding больше не перезаписывается. Если проверка не проходит, статус остаётся unknown.
- **H3 закрыта:** `apply-live.private.py:33–34` сравнивает весь Compose за вычетом web.environment и whitelist env; `:39` дополнительно проверяет фактические mounts. Закрытый structural proof привязан к прежнему desired hash `35b18bd5bd559cb2395e47f74720c2e8ae446ecbf2b9d1b1484f6cadce7dbbc4`.
- **H1 в первом fix-review оставалась HIGH; закрытие во второй проверке ниже:** добавлены новый inventory после freeze, STOP на unbound/nonterminal, post-drain terminal/history checks. Но `freeze-and-drain.private.py:40–41` фиксирует список PID **до** пяти provider GET и остановки старого web, а `:55–60` ждёт только эти PID. Старый web может открыть новую DB-сессию после capture; незавершённая работа этой сессии не охвачена доказательством quiescence. Требуется охват всех соединений старого producer, например остановить старый web, дождаться исчезновения всех его сессий до старта frozen web, затем брать authoritative inventory. Поздний commit за пределами captured PID нельзя исключить последним inventory snapshot.
- Backup condition усилен: `backup_ready()` проверяет last-success не старше часа/не раньше baseline, временной порядок и совпадающие snapshot/manifest двух копий. Прочитанный реальный receipt содержит success `2026-11-11T07:42:45.899851+00:00` с двумя matching verified copies. Проверяющий не выполнял backup и не подтверждает его текущую свежесть: runtime gate должен пройти непосредственно перед операцией; post-backup остаётся обязательным.

Новых source-изменений либо новых требований к продукту в этом fix-review нет. Исправления операторов ещё не являются выполненной операцией.

### Финальная проверка H1 и дельты исправления

Самостоятельно перечитана окончательная последовательность freeze и проверены SHA256:

| Оператор | Финальный SHA256 |
|---|---|
| `freeze-and-drain.private.py` | `89f2626f168d60b95b6ce967a90776d3838caf4c09c20ff532020cd39843ca43` |
| `apply-live.private.py` | `e8f2925a80b3beb312e6382b88984bf27cc61feadb2078df39ce05afcbd91933` |

Дополнительные явно разрешённые входы: `operator-final-delta.private.json`, `payment-projection-metadata.private.json`. Второй содержит форму/producer SQL без финансовых значений: исходный `testPaymentRecords` и новый `inventory.payments` используют одинаковый `json_agg(to_jsonb(p)) FROM payment p`. Сравнение по `id` и полному JSON сохраняет исходные business rows; это не сравнение несовместимых camelCase/raw проекций.

**H1 закрыта:** окончательный `freeze-and-drain.private.py:46–54` сначала пишет pending, останавливает старый web, подтверждает `Running=false` и ждёт отсутствия **всех** PostgreSQL-сессий со всех его IPv4. Frozen replacement запускается только после этого (`:55–58`); прежняя гонка неполного PID snapshot устранена. Далее `:64–71` получает свежий authoritative inventory и останавливается на unbound/не-TEST/нетерминальном/несопоставимом платеже. `:87–92` проверяет сохранность population, связь provider ID, terminal statuses и исторических payment rows до `completed`. Остановка после pending сохраняет обязательную ручную reconciliation; это не разрешение слепо повторять оператор.

H2/H3 остаются закрытыми: live operator не менялся после первого fix-review. В финальной дельте новых подтверждённых BLOCKING/HIGH не найдено. Возможный короткий простой web при stop/drain — явное следствие необходимого прекращения старого producer; остальные шесть контейнеров не останавливаются этим сценарием.

**GO ограничен выполнением проверенных операторов.** Любой STOP/unknown означает остановку зависимого LIVE-switch и сверку фактов. Свежий backup, неизменённые runtime инварианты, безопасный browser/spoof smoke и post-backup должны получить фактическое evidence у координатора. TEST-ledger остаётся смешанным историческим ограничением для отчётности; перед ручным расчётом выплат требуется исключение сохранённых TEST IDs. Настоящие LIVE notification, grant и зарегистрированный чек до покупки владельцем остаются **NOT RUN**.
