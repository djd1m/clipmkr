# Независимое QE: cloudru-release-parity, qe-precision

Вердикт: **NO-GO для кода controller/admission**. Найдены пять кодовых HIGH,
одно дополнительное HIGH-условие полноты native snapshot и одно WARNING.
Это самостоятельные кодовые нарушения; отсутствие живой приёмки учитывается отдельно.

QE-VERDICT: C

## Идентичность и привязка

- Роль: `qe-precision`, family: `owner-exception` по явному решению владельца.
- Точный selected model ID: `gpt-6.1-sol` (идентичность задана маршрутом текущей задачи; отдельного API аттестации модели нет).
- Exec session ID: `01a1a267-4907-7b91-a691-d4124bddfc36`, прочитан из `CODEX_THREAD_ID`.
- Автор приложения/controller/SDK/tests по входному назначению: `gpt-6.1-terra`. Это cross-model относительно этого кода. Документы написаны Sol и используются как согласованные входы, без заявления о другой модели их автора.
- Host: `features/cloudru-release-parity/.fa-state/review-convergence-qe-host.json`.
- Revision: `afdcd9f79b5fb71661f534e766f09eae9292817d18e9462a59aac1cc7c31d644`.
- Nonce: `bc1f6e25-4822-48fa-a2fc-4669ff055fa0`.
- Host SHA-256: `b29912285c9b596dfd83bc5e73d1fb2843023b871b1f93f2d55a95f977f9192f`.
- Все 72 digest из actual host manifest сверены с файлами перед исследованием и после тестов: несовпадений нет. Итоговая проверка выполняется также перед записью receipt.
- Это исходное ревью: `verifications: []`, `deltaVerification: null`, `authorAssessmentChecked: false`. Прежних собственных conditions на момент проверки не было.

## Входы и независимость

Сначала прочитаны только назначенные входы:

1. `AGENTS.md`, `CLAUDE.md`, `docs/acceptance/core-cjm.md`, `docs/review-policy.md`.
2. `features/cloudru-release-parity/00_complexity_assessment.md`, `01_requirements.md`, `02_research.md`.
3. Все три ADR: `03_adr/001-release-manifest.md`, `002-isolated-cloud-candidate.md`, `003-same-bucket-prefix.md`.
4. `04_domain_model.md`, `05_architecture.md`, `06_implementation_plan.md` той же feature.
5. `openspec/changes/cloudru-release-parity/proposal.md`, `design.md`, `specs/release-candidate/spec.md`.

Прочитан установленный `node_modules/@dzhechkov/skills-feature-adr/templates/.claude/skills/feature-adr/modules/08-qe.md`: native receipt, closed shapes, structural verification, expanded QE и границы доказательства. Применены reference-протоколы brutal-honesty-review, security-testing, performance-testing, regression-testing из установленного пакета. AQE MCP/fleet/runtime не запускались и не заявляются. Новые агенты не запускались: это назначенная независимая роль, общий panel организует root.

Старые reviews, содержимое `03.5_ideation_report.md`, `07_progress.md`, completion/author reports не читались как доказательства. Наличие `03.5_ideation_report.md` в host manifest использовано только для проверки digest. Обнаруженная operator runbook прочитана как интерфейс реализации; её заявления об исполнении не принимались за proof. Другие reviewer entries не использовались для выводов.

## Самостоятельно найденный scope

Исследованы полный controller `scripts/release-candidate.mjs`, встроенные Python admission/source/artifact/executor программы и встроенный JS copy-step; SDK namespace и существующие operations/multipart/presign/erasure; shared config, web/stt/render adapters, Compose/Dockerfile, immutable health, build-time wiring guard и его тесты; billing handler/runtime/deps, checkout freeze и тесты; monthly blogger SQL и числовой January oracle; live S3 fixture, prefix integration и адаптированные upload/guest-pack/retention tests.

Из неизменённых зависимостей дополнительно проверены worker runtime, STT dispatch, DB quota/transcription/selection, media download/reservation. Просмотрены локальные правила security/testing. Проверка включает зависимости, а не только изменённые строки. Изменений product source не сделано.

Исключены из независимого cross-model scope: `patches/dz-name-check-app-source.patch`, `scripts/install-process.sh`, `tests/feature-adr-paths.test.mjs` — это Sol-код, назначенный qe-primary/Astra. Их digest в manifest не является кодовым ревью этих файлов. Изображения и служебный config из manifest не объявляются семантически проверенным UI/инфраструктурным scope.

## Findings

### QEP-01 — HIGH: binding проверяет сеть infra, но не сеть приложения/мигратора

**Место:** `scripts/release-candidate.mjs:450`, `:460`, `:466`; встроенный executor находится на физической строке `:539` (decoded Python: `observe`, `container`, запуск compose run/up).

**Нарушение:** проверяется наличие alias у закреплённого DB/Redis container в `binding.network`. Сети `config.services[web/workers].networks`, реальные attachments приложения и разрешение этих hostnames из сети app/migrator не сверяются. SQL baseline выполняется через `docker exec` внутри закреплённой БД по local socket, поэтому не проверяет маршрут из application `DATABASE_URL`.

**Триггер:** правильные test DB/Redis IDs и aliases присутствуют в test network, но app/one-off worker прикреплён к другой сети, где тот же hostname ведёт в иной контейнер. Все проверенные строки URL совпадают. Baseline читается из test DB, а реальное приложение/миграция используют другой маршрут. Возможны отказ доставки и обращение к неверной БД/очереди.

**Независимое доказательство:** исполнен исходный admissionProbe с fake subprocess/файлами, без Docker/сети. Всем четырём app services задана только синтетическая `MAIN_NETWORK`, pinned infra — только `test-network`. Результат: `probeAccepted=true`, выполнено 15 fake SQL calls, возвращена ожидаемая test database identity. Подмены кода admissionProbe не было.

**Исправление/приёмка:** связать effective и runtime app/migrator networks с закреплённой test network и проверить однозначность endpoint DB/Redis из этого контекста. Negative wrong-network/alias-collision должен отказывать до SQL/migrations/mutations. Положительный split app/infra project остаётся допустимым. FR-4/FR-5, ADR-002, DATA-08.

### QEP-02 — HIGH: сохранность существенных данных можно подтвердить хешами одних id

**Место:** `scripts/release-candidate.mjs:387`, `:390`, `:487`, `:530`.

**Нарушение:** data receipt принимает `columns: ['id']` для каждой таблицы. Probe строит SELECT строго по этой операторской проекции, а compareAdmission сверяет только полученные hashes. Нет обязательного schema-bound набора значимых полей/связей. Кроме того, фиксированный набор таблиц не включает сами partner/partner_code и payment_event.

**Триггер:** ID строк сохранены, но изменились сумма/статус платежа, referral snapshot, остатки/резервы кредитов либо важные параметры аккаунта. С receipt, выбравшим только id, этот drift не попадает в хеш. Удаление/изменение непроверяемых referral сущностей также не имеет самостоятельного baseline.

**Доказательство:** исходная `checkDataReceipt` исполнена с fake private-file adapter: все девять baseline с единственной колонкой id приняты. Исходный probe затем использует ровно эти columns. Это проверка приёмочного контракта, не заявление о прогоне реального PostgreSQL. Existing release tests сами используют такие сокращённые baseline, поэтому не опровергают нарушение.

**Исправление/приёмка:** зафиксировать достаточную проекцию и таблицы для исходного schema journal; учитывать совместимость добавляемых колонок при миграции. Negative изменения денежных/реферальных/credit значений при прежних ID должны ломать admission/post-check. FR-4, ADR-002, DATA-01–04.

### QEP-03 — HIGH: ссылка из test DB автоматически становится доказательством synthetic ownership

**Место:** `scripts/release-candidate.mjs:395`, `:401`, `:475`, `:535`, copy-step на `:539`.

**Нарушение:** `ownershipEvidence` — только строка `video|clip|thumbnail:<uuid>`. Probe независимо подтверждает лишь факт, что данный key записан в указанном DB поле. Он не связывает старый физический key с принадлежащими test account/video/clip и не подтверждает synthetic происхождение. Отдельного привязанного доказательства такого происхождения контракт не требует. Copy-step затем использует raw SDK с широким ключом для чтения этого key.

**Триггер:** test video случайно ссылается на старый объект другого владельца/видео. В whitelist записан этот key и ID test video. Строка DB подтверждает ровно такую пару; source/destination hashes могут честно совпасть. Apply не отличит её от разрешённого synthetic media и скопирует чужие байты в test namespace.

**Доказательство:** исходная checkDataReceipt приняла синтетический foreign-production-owner key с `ownershipEvidence` другого test video. Сопоставление в probe/compareAdmission основано на той же паре из DB и не добавляет проверки происхождения. Реального чтения чужого объекта не выполнялось.

**Исправление/приёмка:** проверять каноническое соответствие ключа владельцу/ресурсу и явно привязанную synthetic provenance для допустимых старых исключений. Одной ссылки из БД недостаточно. Negative foreign object с честными size/SHA и существующей test DB ссылкой должен отказывать до S3 copy. FR-4/FR-8, ADR-002: чужая production-ссылка блокирует apply; широкий ключ остаётся согласованным owner exception.

### QEP-04 — HIGH: повторный site release снова требует исходник без namespace

**Место:** `scripts/release-candidate.mjs:539`, decoded executor строки 213–219 и встроенный JS `digest(key)` перед `digest(dest)`.

**Нарушение:** каждый apply/rollback с непустым object whitelist запускает legacy copy. Сначала безусловно читается старый `logicalKey`, даже если объект уже корректно находится в `tests/site/<logicalKey>`. Состояние исходного/уже переведённого namespace не моделируется.

**Триггер:** A успешно перевёл namespace; после A приложение создало новый клип только под новым prefix. DB хранит logical key по контракту. Выпуск B/совместимый rollback останавливает app services, затем raw GET старого key получает 404. Executor остаётся pending, up не выполняется.

**Независимое доказательство:** извлечённый исходный JS copy-step исполнен через Node vm с in-memory SDK и одинаковыми synthetic bytes. Legacy case: exit 0, копирование и проверки проходят. Уже prefixed case: exit 1, единственный запрос — GET старого logical key; к существующему prefixed объекту код не обращается. Сеть/SDK provider не вызывались.

**Исправление/приёмка:** отделить первичный перенос от обычной проверки media уже работающего namespace. Добавить A → создание нового prefixed media → B → совместимый rollback с прежними и новыми объектами; не удалять legacy originals. FR-3/FR-4/FR-7, ADR-002, REL-03/DATA-03.

### QEP-05 — HIGH: начальная пустота Cloud навсегда запрещает последующие релизы с медиа

**Место:** `scripts/release-candidate.mjs:479`; дополнительный запрет в `:539`, decoded executor строка 216 (`copy target`).

**Нарушение:** каждый admission и повторный observe отвергает Cloud при любом storage reference, независимо от фазы/предыдущего release/корректности текущего namespace. Непустой whitelist executor также разрешает только site-test.

**Триггер:** успешный Cloud CJM создаёт video.object_key и clip.object_key/thumbnail_key. Следующая доставка B или rollback требует сохранить эти объекты и потому получает `unexpected Cloud storage references`. Это конфликт с обязательным повторным выпуском после использования кандидата.

**Доказательство:** прямая неизменная ветка actual probe; она не зависит от результатов S3 либо качества backup. Существующий fake executor harness заменяет probe константным JSON и потому эту ветку не проверяет. Живое поведение не заявляется.

**Исправление/приёмка:** ограничить empty-cloud предусловие первоначальным переходом. На последующих выпусках проверять source-bound baseline и существующие prefixed объекты, без требования старых raw объектов. Negative foreign reference сохраняется. Нужен nonempty Cloud regression через настоящий admissionProbe с fake boundary. FR-1/FR-3/FR-4, ADR-001/002, REL-03/DATA-03.

### QEP-06 — WARNING: legacy S3 audit теряет exact keys/upload IDs при аварии

**Место:** `tests/fixtures/environment.ts:110`, `:119`; callers `tests/upload.integration.test.ts:96`, `tests/retention.integration.test.ts:146`, `tests/guest-pack.integration.test.ts:169`.

**Нарушение:** общий `receipt` сохраняет только testName/prefix/state и число unknownUploads. API startUpload/resolvedUpload вообще не принимает key или UploadId; attempted PUT keys также не записываются. Upload suite держит keys/uploads только в памяти; retention не сохраняет выданный UploadId в durable journal. Основной storage-prefix integration имеет более подробный отдельный receipt, но legacy tests его не используют.

**Триггер/риск:** процесс погиб после PUT/CreateMultipartUpload. Барьер продолжает ограничивать запросы своим run prefix, однако по частной квитанции невозможно восстановить точные созданные ключи/выданные UploadId и отличить неизвестный исход; требуется дополнительная ручная разведка. Это реальный пробел recovery, а не свидетельство выхода за test namespace.

**Исправление/приёмка:** до мутации сохранять exact attempted keys, после выдачи — IDs, состояния unknown/resolved/cleanup. Fault test остановки между acknowledgement и cleanup должен оставлять пригодный журнал. FR-8, ADR-003, AM-18.

### QEP-07 — HIGH: native snapshot не связывает прочитанные существенные зависимости

**Место:** `features/cloudru-release-parity/06_implementation_plan.md:187` (declared code targets), actual QE host manifest; import roots `packages/s3/src/client.ts:1`, `apps/web/src/server/billing-runtime.ts:3`, `apps/worker/workers/stt.ts:3`.

**Ограничение authority:** host связывает изменённые entrypoints/tests, но не включает 12 прочитанных неизменённых runtime dependencies, перечисленных в конце отчёта. Module-08 прямо требует включать relevant unchanged dependencies в declared targets. Проверка всех 72 hashes не доказывает неизменность этих дополнительных файлов на протяжении formal review.

**Триггер/риск:** между ревью и evaluate изменяется, например, erasure/quota/worker runtime вне measured target set; именно подтверждённые здесь семантические свойства перестают соответствовать code snapshot, хотя исходные manifest hashes остаются прежними.

**Исправление/приёмка:** root расширяет измеряемый scope и выполняет штатную native процедуру новой привязки/независимой проверки; reviewer не меняет host/history. Это структурное условие доказательства, не шестой выдуманный дефект приложения. Дополнительные локальные hashes в отчёте позволяют воспроизвести прочитанные байты, но не заменяют host binding.

## Выполненные проверки

Node: `/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin/node`, v22.23.4.

1. Обычный scoped Vitest: storage-prefix, release-candidate, release-candidate-acid, payments-guards, billing.unit, wiring, config; `--no-cache --reporter=dot`.
   Итог: **111 passed, 15 failed, 1 skipped**, 7 файлов, exit 1. Семь acid отказов вызваны запретом создания loopback socket (`PermissionError: EPERM`) ещё в fixture setUp. Восемь release-candidate отказов связаны с запрещённым nested Node spawnSync: отдельно воспроизведён `{status:1,error:'EPERM',stdout:'',stderr:''}`. Это ограничения этой sandbox-сессии, не объявленные регрессии продукта. Skipped — реальный OOM/ENOSPC, который нельзя заменять fake Docker.
2. Повторная изоляция доступного набора: storage-prefix, payments-guards, billing.unit, wiring, config, те же опции: **107/107 passed**, 5/5 файлов, exit 0. Это локальные unit/fake проверки, без обращения к настоящим провайдерам.
3. Дополнительно извлечён actual embedded executor и existing Python fake harness. Единственная test-only адаптация в памяти: неиспользуемый HTTPServer заменён инертным объектом; site health по-прежнему обслуживается fake Docker exec. **18/18 Python cases passed**; код executor не изменён. Это дополнительное fake evidence lock/state/journal/reconcile/copy-order. Исходный Vitest acid suite от этого не становится passed, и реальный SSH/runtime этим не доказан.
4. Отдельные независимые проверки исходных функций на fake boundary: wrong app network принят admissionProbe; id-only/foreign whitelist приняты checkDataReceipt; legacy/already-prefixed copy cases дают соответственно exit 0/1. Подробности в QEP-01–04.
5. Ручная code/spec трассировка FR-1–9, ADR-001–003 и применимых AM. Case-sensitive word-bounded scan unfinished markers по исследуемым code/test targets не дал совпадений. Это не запуск `dz guard`.

## Матрица expanded QE

| Измерение | Результат и доказательство | Ограничения/пробелы |
|---|---|---|
| Функциональная | Namespace serialize/deserialize/signing и checkout freeze покрыты прошедшими unit; controller findings QEP-01–05 | Не дан GO повторной доставке и сохранности |
| Интеграционная | Прочитаны real-S3 и PostgreSQL сценарии, inspected настоящий AWS SDK pipeline с fake transport | PostgreSQL/Redis/S3/SSH/provider integration не запускались; реальные credentials не читались |
| Регрессия | 107/107 scoped; wiring отрицательные мутации build/runtime/adapter исполняются внутри теста | Full suite, lint/typecheck/build и browser regressions выполняет root отдельно; прежние 7 failures не объявляются закрытыми полным suite |
| Security | Prefix allowlist, exact Bucket, escaped keys/foreign responses, signing и независимый fence испытаны unit; freeze сохраняет auth/origin/rate/body порядок | QEP-01/03; isolation session/mail/actual network и исходные production состояния требуют live inventory. IAM-изоляция не заявляется |
| Performance/resources | Прочитаны chunk dispatch quotas, atomic SQL, streaming copy/hash, staging/free space/memory checks | Нет измерений памяти/диска/провайдеров/p95. Worker concurrency 2 и process-local reserve 3×input сами по себе не обеспечивают операторский один-long-job/постоянный резерв 2 ГиБ; root обязан обеспечить условия приёмки |
| Testability/oracles | 18 fake executor cases плюс независимые negative probes; January ожидает 248000/399000/647000, 498000 после refund, null/20/30 и одного distinct payer | PROBE существующего acid harness подменяет настоящий admission целиком; copy fake подтверждает только количество, не байты. Именно поэтому QEP-01–05 не исключены зелёным harness |
| Code/spec traceability | FR/ADR привязаны к выводам ниже; unit build-time guard сохраняет неизвестные public/runtime/dynamic negatives | Наличие названия теста/плана не доказывает discriminating property; полные native/OpenSpec gates выполняет root |

## Требования и ADR fitness по существу

| Требование | Проверенное состояние |
|---|---|
| FR-1, FR-3 / ADR-001 | Allowlist двух SSH-целей и отдельные результаты есть; prepare привязывает Git archive/images, inspect сверяет image IDs. Повторная доставка после media нарушена QEP-04/05. Настоящий A→B→A→B не проверен |
| FR-2 / core-CJM | Полный опубликованный UI/90/120/Play/download/три роли/native payment не выполнялись. Final product acceptance не установлена |
| FR-4 / ADR-002 | Backup/sourceIdentity/journal и staged stop/copy/start существуют; QEP-01–05 не дают достаточного binding/preservation |
| FR-5 | Checkout false → 503 до body/intent/provider подтверждён unit; status/webhook остаются доступны. Native freeze/drain/callback switch/return не проверен; production не менялся |
| FR-6 | Lock, atomic state, unknown/reconcile ветки прочитаны; socketless fake cases проходят. Transport recovery на двух реальных целях не доказан |
| FR-7 | Full journal guard и resource admission имеются; live release/resource admission, OOM/ENOSPC и сохранение остальных контейнеров не проверены |
| FR-8 / ADR-003 | SDK и independent fence unit проходят, empty-prefix behavior сохранён. Real Cloud compatibility, capture/canary и legacy crash journal не закрыты; QEP-03/06. Общий key остаётся production-wide по согласованному exception |
| FR-9 | Точная build-time классификация и отрицательные wiring cases проходят. Настоящая пересборка/immutable HTTP 200/503 и полный suite в этом ревью не выполнялись |

В требуемых путях нет ряда точных названий Confirmation/AM tests: resource/budget отказ, nonempty site/foreign copy, incremental disk/site identity, incompatible namespace rollback, aggregate partial delivery, substituted snapshot/copy/namespace, completeness CJM/shop window. Часть namespace свойств проверяется под другими названиями; одно отсутствие текста не объявляется отдельным кодовым дефектом. Но existing acid подменяет admission/copy и не даёт нужных отрицательных оракулов для QEP-01–05. Отдельно нужны регрессии, действительно запускающие исходные границы. Указанные в плане gates amendment/discrimination/guard/native convergence reviewer не запускал: изменение authority/history и запуск gate оставлены root, а результаты не выдуманы.

January fixture проверяет owner monthly и blogger all-time revenue; это не live receipts и не месячная оценка в UI блогера. Старые canceled/created intent, refunded/review/self/unfulfilled/month-end исключения читаются отдельно; новое seeded событие не выдаётся за native оплату. Реальный PostgreSQL числовой результат не заявляется.

## Findings ledger

| Finding | Severity | Status | Round | Author | Title |
|---------|----------|--------|-------|--------|-------|
| QEP-01 | HIGH | confirmed | 1 | codex | App/migrator network не связан с pinned infra endpoint |
| QEP-02 | HIGH | confirmed | 1 | codex | Id-only baseline не обнаруживает существенный data drift |
| QEP-03 | HIGH | confirmed | 1 | codex | DB ссылка подменяет synthetic object provenance |
| QEP-04 | HIGH | confirmed | 1 | codex | Повторный site release читает новый объект по legacy key |
| QEP-05 | HIGH | confirmed | 1 | codex | Непустой Cloud блокирует последующие выпуски |
| QEP-06 | LOW | confirmed | 1 | codex | Legacy S3 audit не сохраняет exact keys/upload IDs |
| QEP-07 | HIGH | confirmed | 1 | codex | Native snapshot не включает существенные неизменённые зависимости |

Receipt использует разрешённую module-08 severity `WARNING` для QEP-06; в ledger LOW — ближайшая неблокирующая категория его отдельного закрытого словаря.

## Граница code GO и final product acceptance

Code GO **не дан** из-за QEP-01–05. QEP-06 требует доработки test recovery; QEP-07 требует полной native привязки зависимости. Все исходные findings включены в собственную receipt entry; устранение не подтверждалось, самостоятельного repair round не было.

Даже после исправлений code GO не заменяет: реальные backup/restore и полный data baseline, сохранность обоих existing targets, exact network/runtime binding, S3 wire/canary proof внутри tests, фактический disk/image допуск, real SSH A→B→A→B, production before/after invariance, ресурсы/бюджеты и полный core-CJM с native TEST-shop окном. Эти работы root выполняет отдельно. Их отсутствие здесь — ограничение доказательства и незавершённая приёмка, а не придуманное дополнительное кодовое нарушение.

Код/requirements/host/history не изменялись, Git commit/push не выполнялись, SSH/API/платные вызовы и чтение secret env/credentials не выполнялись. Записаны только этот ownreport и собственная entry receipt под отдельным flock/atomic replace. Native evaluate/prepare и closure не запускались.

## Дополнительные зависимости вне actual host manifest

Хеши прочитанных файлов на завершение исследования; это supplementary local evidence, не native binding.

| Путь | SHA-256 |
|---|---|
| `packages/s3/src/operations.ts` | `ecf5a0a284d6f3b833cf31adb48d15ee344dca0db1823a1eb69ba686bdb5e0fe` |
| `packages/s3/src/multipart.ts` | `df54a2e345d6c98672b28e1bab5ae71b19754f4752a6025521a021f31959a481` |
| `packages/s3/src/presign.ts` | `ff846c390cb8ff77689723377a539013022aa99fd23c0a5fb532da049c930776` |
| `packages/s3/src/erasure.ts` | `4b9e759aaa00f019ab633368590319ff639f6a05901aa45051911fda22ac9937` |
| `packages/db/src/quota.ts` | `da1d10660fb84a78dbab490853230f0b00fe3267071b22ddfd8c6c1b3e3dd78e` |
| `packages/db/src/transcription.ts` | `b26c6d89c44eb799dd60e18560a5475bd1e7b8440c1961a2edcacbf519f21acf` |
| `packages/db/src/selection.ts` | `a3d57395186256d8e6581df946a3c0f06f2e2043a36e62db91b6b2faad24adab` |
| `packages/db/src/blogger-report.ts` | `341e249d118533ff3573fd90c2c572f11376a358386942e814b61f9c522cd05d` |
| `apps/worker/src/runtime.ts` | `b826885f3f8b328926a90c480b7cab3629972c6b25477e85464bc6aacf79d21b` |
| `apps/worker/src/workers/stt.ts` | `3f7c85a3bcbda3012189781e8e7f7d78cac4d6dcb255025197f4168cf028c07b` |
| `apps/worker/src/media/download.ts` | `de8a67ec163e477bef692ad0baae1db5b24f9cb35c95e6b9211bf6d50daee774` |
| `apps/web/src/server/billing-deps.ts` | `21d0491af11a30fb21498d2fef9d7a962dff6363784a2e0345733e710ed8e2c6` |
