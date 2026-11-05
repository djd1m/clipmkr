# Независимое QE — blogger-trial-credits

05.11.2026. **CLEAN; scoped Step-8 grade A-; local code-ready — да.** Подтверждённых
дефектов проверенного кода нет; 76 tests,5 independent probes и3 falsifiers подтверждают
основные write-side риски. Оценка относится к локальному S8 scope с указанными ниже
ограничениями, не к полной поставке. Полная T3-приёмка,
deployment/backfill и live UI admission этим отчётом не устанавливаются: полный
`npm test` с S3 и интерактивный live-путь не выполнены.

Reviewer: `qe-primary`, `gpt-6-astra xhigh`; новая сессия
`/root/blogger_trial_independent_qe`, без контекста кодирования. Автор реализации:
`gpt-6.1-sol high`. Применяется owner-authorized cross-model exception, не cross-family.
Model IDs и reasoning — запрошенные настройки запуска; защищённая runtime attestation
недоступна. Режим convergence — supported Plain; native QE-rounds history, Claude и
AQE runtime этой сессией не запускались и не заявляются.

Сначала прочитаны AGENTS/model policy, 01 requirements, 02 reuse, 06 approved plan и
привязанные OpenSpec. Авторские validation/conclusions и прежние root findings не читались
как исходные доказательства. Затем самостоятельно найдены diff, implementation и tests.

Snapshot: nonce `6fe2d643-8b11-433c-bd4f-75746986ccfa`, revision
`6a914a6e321a7a7306e99d771604085021b0c37ea6a7c110d1a425739b0e57e6`.
Независимый SHA-256 пересчёт всех 8 manifest inputs совпал.

После самостоятельного чтения кода, реальных тестов и собственных выводов прочитан
`08_author_validation.md` исключительно для сопоставления статуса T3 и ограничений.
Его тестовые результаты не включены в собственный счётчик PASS. Код не менялся:
мутации выполнены в отдельных временных копиях собранного JS за пределами worktree.

## Собственное фактическое evidence

Среда: Node `22.23.4`, existing isolated PostgreSQL `n5_test`, уникальная schema на
suite/probe и cleanup. Docker inspect используется private driver только для передачи
credentials в child env. Новых контейнеров, MinIO, серверных ролей/grants и live-вызовов
не было. Идентификаторы ниже относятся к тестовым fixtures.

Команды исполнены из `/tmp/clipmkr-blogger-trial-20261105`; для npm PATH предварён
`/tmp/pu-next-security-runtime/node-v22.23.4-linux-x64/bin`.

| Команда | Наблюдаемый результат |
|---|---|
| `npm run build --workspace=packages/shared` | exit 0, собственный build |
| `npm run build --workspace=packages/db` | exit 0, собственный build |
| `python3 /tmp/clipmkr-blogger-trial-pg.private.py npm test -- tests/blogger-trial-credits.integration.test.ts tests/blogger-policy.integration.test.ts tests/credit-packages.integration.test.ts tests/blogger-policy.test.ts tests/owner-unlimited.integration.test.ts tests/auth.test.ts` | exit 0; **76/76**, 6 файлов, zero skips, 18.23 s; включая 16 новых trial cases |
| `python3 /tmp/clipmkr-blogger-trial-pg.private.py node /tmp/blogger-trial-qe-primary.cjs` | exit 0; **5/5 independent probes** на built service/real PG; повторный контроль после мутантов также 5/5 |
| `python3 /tmp/clipmkr-blogger-trial-pg.private.py python3 /tmp/blogger-trial-qe-mutations.py` | exit 0 у orchestrator; каждый из 3 мутантов получил exit 1 именно на assertion ожидаемого поведения |
| `npm run typecheck` | exit 0; все workspaces и tests |
| `npm run lint` | exit 0, статические правила без ошибок |
| `git diff --check` | exit 0 |
| `npm run openspec -- validate blogger-trial-credits --strict` | exit 0, valid; это проверка структуры, не поведения |

Private probe source SHA-256: `/tmp/blogger-trial-qe-primary.cjs`
`ede1a0e19dabc128562bd9a32e01666b74f24aa967e376534058ae4418eb2767`.
Mutation driver: `/tmp/blogger-trial-qe-mutations.py`
`bec48c6506b451419e4572e180f574c5abf4b841a07208404dc6d4d59038e4fd`.
Временные runner-файлы не являются поставляемым кодом и не коммитятся.

В первом собственном HTTP-пробнике четыре DB cases прошли, HTTP получил 400:
fixture передал один XFF-адрес при trustedProxyHops=1. Native `clientIp` требует
клиент плюс доверенный proxy. Исправлена только private fixture; повтор дал 5/5.
Это ошибка тестового setup, не дефект продукта и не скрытый успешный прогон.

## Требование → риск → сценарий → наблюдение → ограничение

| Требования | Проверенный риск и oracle | Наблюдение | Граница |
|---|---|---|---|
| FR-1, NFR-1 | Расход потерян при повышении. Native reserve/finalize реально списывают 180, затем public-exported built service повышает trial | Та же строка: 1800/1620/0 → 7200/7020/0; reader 7020; fresh и migration_trial покрыты 16-test suite | Fixtures, не live account |
| FR-2 | Повторный grant после расхода, lower/revoke/re-enable, новый максимум | Repeat/lower/revoke не пополняют; exhausted remaining0 остаётся0; L9000 даёт1800 ровно раз; 5×20 concurrent saves сохраняют high-watermark | Нет периодического reset/подписки; bulk API не добавлен |
| FR-3 | Trial смешан с paid/recovery/history или меняет paid rights | Полные paid/recovery/charge/allocation snapshots равны; reserve Q300 сохранён; native refund освобождает300; реальный settled charge сохраняет paid_render=false; existing credit suite20/20 | Live payment provider не вызывался |
| FR-4 | Legacy opt-in, guessed trial, потеря revoke | Legacy balance null; missing/key/expiry/entitlement/original-ref/base_sku и дополнительный payment_ref case отказывают без effects; revoke с missing или payment-linked trial проходит без funding | Recovery linkage ограничен native CHECK и предикатом helper; отдельный invalid-recovery fixture не создавался |
| FR-5 | Partial funding, authority bypass, deadlock | Active-owner checks; erasing actor/target; reserve/finalize/erasure barriers с pg_blocking_pids; audit CHECK rollback; отдельно20 saves двух владельцев друг на друга без deadlock | Process kill не инъецировался; rollback опирается на существующий transaction |
| FR-6 | Неверный audit/delta или reason overflow | Raised/unchanged/legacy/revoked, actor/target/action; reason300 и limit86400 проходят native500 bound; audit failure откатывает ledger и policy | Audit проверен в DB, новый UI audit не требуется |
| FR-7 | Stale backfill перезаписывает owner edit; malformed guard | Все3 snapshot поля и malformed guards проверены; independent probe удерживает account lock, меняет limit9000, ожидающий service после COMMIT возвращает conflict и сохраняет policy/trial/audit | Actual адресный backfill NOT RUN |
| FR-8 | Баланс не соответствует ledger | Native readCreditBalance7020 и built export реально проверены | Refresh/relogin и live кабинет NOT RUN; server call не назван UI E2E |
| NFR-2/3 | Новый стек, mock-only green, broad drift | Ровно3 code targets, native bounds/locks/transaction/UNIQUE; real PG; Node22 build/types/lint; independent cross-model receipt | Full suite/S3/remote CI не установлены |

HTTP compatibility: собственный probe вызвал неизменённый `createBloggerOwnerHandler`
с настоящим DB/service: existing strict body даёт200 и funded trial; missing trial→422;
body с expectedPolicy→422; non-owner→403. Внешние session authentication и rate-limit
adapters заданы fixture, а owner authorization и credit mutation исполнялись реально.
Это handler integration, не сетевой либо браузерный E2E.

## Целевые falsifiers

| Временная мутация отдельной built-копии | Фактический отказ |
|---|---|
| `remaining_seconds=total_seconds+$2` вместо additive remaining | real settled180 oracle: observed7200, expected7020; exit1 |
| Delta вычисляется от remaining вместо total | observed total7380/remaining7200 вместо7200/7020; exit1 |
| Удалён locked expectedPolicy compare | ожидающий stale call вернул updated вместо conflict и перезаписал limit; exit1 |

Логи: `/tmp/blogger-trial-qe-reset-remaining.txt`,
`/tmp/blogger-trial-qe-delta-from-remaining.txt`,
`/tmp/blogger-trial-qe-remove-locked-guard.txt`.
Это три выбранных falsifiers, не полный mutation score. Audit rollback подтверждён
реальным SQL CHECK rejection в suite, отдельная мутация audit не выполнялась.

## God-object growth (BLOCKING)

Нарушений нет: credits.ts154, blogger-policy.ts66, integration suite243 строки.
Helper остаётся в небольшом каноническом модуле и не расширяет крупный агрегат.

## Security violations (BLOCKING / HIGH)

Нарушений нет. SQL параметризован, authority проверяется existing active owner.
Sorted account locks предшествуют credit advisory lock и trial FOR UPDATE;
expectedPolicy сравнивается после получения account locks. Нового auth bypass нет.

## Architectural concerns (HIGH / MEDIUM)

Нарушений нет. Lifetime total хранит исторический предоставленный trial в той же
строке; paid/recovery отдельны. Creation, readback, reserve/finalize, transaction
переиспользованы. Новый optional guard обоснован конкретным stale maintenance snapshot.
Helper вызывается из единственного policy writer, его account-lock precondition соблюдён.

## Anti-pattern violations

Нарушений нет: бизнес-операция имеет один COMMIT через existing transaction;
exceptions/audit refusal не превращаются в updated; новых retry, global mutable state,
startup I/O и фоновой работы нет.

## Type / contract issues

Нарушений нет. Typed unavailable/conflict отображаются существующим HTTP fallback в422;
HTTP schema не получает maintenance guard. Safe integer/native bounds сохраняются.
Uppercase UUID canonicalization сохраняет accepted UUID identity и canonical source_key.

## Edge-case sweep

Проверены missing/noncanonical trial, native min/max и noninteger/NaN/Infinity,
fresh/consumed/reserved/exhausted grant, повтор/revoke/re-enable/lower/raise, active owner,
erasure, конкурентные saves и account barriers. Process restart не инъецировался;
atomicity проверена DB audit failure. >300 account pagination неприменима: API принимает
один account. Version skew проверен до existing handler и built public export.

## Test quality

76/76 и5/5 выше выполнены этим reviewer. Product SQL/transaction/authorization core
не замоканы; observed balances, persisted snapshots, audit и result kinds проверяются
по поведению. 3 private mutants падают на assertions. Selector
`vitest.config.ts` включает `tests/**/*.test.ts`; в tracked tree нет GitHub/GitLab CI
definition, поэтому remote CI collection/pass не заявляются. `skipIf(!DATABASE_URL)`
в native suite не сработал в фактическом прогоне: PG был предоставлен, skips0.

## Process / done-ness gaps

Code-critic здесь применён чтением diff; runtime команды относятся к отдельному QE.
T1/T2 соответствуют approved plan; red baseline автора независимо не воспроизводился,
но обязательные falsifiers выполнены самостоятельно. T0 admission/checkpoints не
выдавались и не заменялись наличием файлов. T3 частично подтверждён: full `npm test`
NOT RUN в этом ограниченном PG-only окружении; новые MinIO/контейнеры запрещены.
Это остающееся ограничение полного плана, не доказанный дефект scoped реализации.
Convergence clean receipt не заменяет остальные release/testing gates.

## Production safety

Новых migrations/schema/source/API/UI/env/paid entitlements нет. Revoke работает при
непригодном trial. Адресный backfill должен идти тем же built service с exact
expectedPolicy и active owner после отдельного deployment admission. Данный reviewer
не менял live ledger, не публиковал, не выполнял backfill и не давал live GO.

## Suggestions only (LOW)

Нет замечаний, требующих изменения scope.

## Open questions for the parent

Нет вопросов о семантике кода. Остальные T3/release проверки и live readback остаются
ответственностью отдельного root admission с фактическими evidence.

## Skipped checks (transparency)

Полный S3-dependent suite, browser E2E/refresh/relogin, live backfill/payment/Cloud.ru,
remote CI и process-kill — NOT RUN по границам задачи. Dependency audit/новый внешний
поиск не выполнялись: зависимости не менялись. SLA/load benchmark не заявлен.

## Code/spec anti-drift и окончательная привязка

Сравнены полностью оба изменённых source files и вся новая suite. Approved code targets
ровно3: `packages/db/src/credits.ts`, `packages/db/src/blogger-policy.ts`,
`tests/blogger-trial-credits.integration.test.ts`. Других product изменений нет.
Existing handler, package export, upload limits, transaction, grant schema,
owner validation и reserve/finalize прочитаны как affected dependencies.

FR1–7 реализованы согласно требованиям; FR8 доказан до native balance reader.
120мин — общий lifetime trial с initial30мин;180с consumption сохраняется,
remaining7020с=117мин. Разрешение повторить role save не создаёт новый grant или refill;
новый явный lifetime максимум добавляет только прирост. UI/paid права не изменены.

Все8 manifest digests повторно совпали после проверок. Independently recomputed
SHA-256 compact JSON manifest равен revision выше. Source digests:

- blogger-policy.ts: `2e2a052642cc24bc08cfb43c7fa2508a11fd0182e99c72d97d6dd5dcf73ce10e`.
- credits.ts: `e807af6d1e8264af81e51509301f3c1b5969014dd4649d01b89a18ee457eb161`.
- trial suite: `34e74c0ef9d632766e6a293ab27bc417b70f88edd030e2af0f5f9504349cf9a5`.

Собственная receipt `qe-primary/owner-exception` содержит clean verdict, пустые conditions
и явную newRisks assessment/evidence. Это независимое scoped code review/QE, не
автоматическое утверждение полной продуктовой поставки.
