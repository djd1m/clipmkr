# Авторская проверка — не независимое QE

05.11.2026, gpt-6.1-sol high. Код заморожен, exact SHA256 в qa/code-sha256.txt.
План06 SHA256 7182bbe27262d26d0378d10c40ecfa158d268308148a14beac7e73ec2722364c.
Root явно допустил Step7 после actual dz router/plan, K1/K2/OpenSpec и полного literal
coder-context. Автор повторил source admission: admitted, manifest09d8534822fde9ff14571ba538c0d5d6902ea80b94e83747f8a9536ff2b6a011;
current context complete74cd753e57b9803dd38fbd4ab301afe8aea8b48bfdb7bd05dad773353ddc3159.
Base-ref сохраняет фактический HEAD до первого source edit.

## Фактические команды и результаты

Node22.23.4, npm ci; собственные shared/db build. Real PG — существующая отдельная n5_test,
новая schema-per-suite. Private driver передаёт URL только child env; секреты вне Git.
Новых контейнеров/MinIO/runtime не создавалось.

| Проверка | Наблюдение | Evidence |
|---|---|---|
| npm test -- tests/blogger-trial-credits.integration.test.ts на native baseline | exit1, 13 failed / 1 passed:1800/1620 вместо7200/7020 | qa/red-native.txt |
| Та же suite после первоначальной реализации | exit0,14/14 | Предварительный log в /tmp; финальный run ниже содержит все cases |
| Uppercase target до canonicalization | exit1,1 failed /15 passed; preexisting not_found | qa/red-uppercase.txt |
| Mutation remaining=delta вместо remaining+=delta | exit1,12 failed /4 passed, assertion failures | qa/mutation-arithmetic.txt |
| Mutation highwater=min(total,1800) | exit1,10 failed /6 passed, assertion failures | qa/mutation-highwater.txt |
| После exact restore npm test -- tests/blogger-trial-credits.integration.test.ts tests/blogger-policy.integration.test.ts tests/credit-packages.integration.test.ts tests/blogger-policy.test.ts tests/billing.unit.test.ts tests/blogger-report.integration.test.ts | exit0,97/97,6 files, zero skips,23.38s | qa/final-focused.txt |
| npm run build --workspace=packages/shared; npm run build --workspace=packages/db | exit0, own outputs | Реальные terminal results; db final build после restore |
| npm run typecheck | exit0, все workspaces и tests | qa/final-typecheck.txt |
| npm run lint; git diff --check | exit0 | qa/final-lint.txt; terminal |

Оба mutation временно меняли один approved source, возвращали original bytes через finally;
после восстановления прошёл полный указанный focused run. Это два targeted falsifier,
не mutation score. Test selector vitest.config.ts включает tests/**/*.test.ts. В этой
рабочей копии нет .gitlab-ci.yml/.github workflow; иной CI pipeline не объявляется пройденным.

## Requirement → risk → scenario → evidence → limitation

| Требование | Риск и сценарий | Фактическое доказательство | Ограничение |
|---|---|---|---|
| FR-1/NFR-1 | Потеря180spent; fresh grant, signup/migration sources |16-test suite: canonical1800/1620→7200/7020, fresh7200; арифметический mutant падает | Fixture account, не реальный аккаунт блогера |
| FR-2 | Повтор/refill; revoke/lower/explicit raise | Повторы, revoke/re-enable,120sec floor;5×20 two-owner calls→одна суммарная delta7200; highwater mutant падает | Межпроцессные PG locks проверены локально |
| FR-3 | Paid/recovery/held history изменены | Полные row snapshots paid/recovery/charge/allocation равны; native refund cycle reserved300→released, Q0 | Refund workflow шире покрыт existing credit suite |
| FR-4 | Legacy opt-in или guessed missing trial | Legacy balance null; missing/key/expiry/entitlement/original-ref/base_sku→credit_review_required без effects; revoke missing trial успешен | Corrupt trial требует отдельного расследования |
| FR-5 | Unauthorized/erasure/races/partial audit | Real owner checks, erasing actor/target, account barriers с pg_blocking_pids, real reserve/finalize, DB CHECK отказ аудита полностью откатывает | Process-kill не инъецировался; атомарность existing transaction |
| FR-6 | Неверный actor/delta или reason overflow | Positive/zero/legacy/revoked audit; reason300 при limit86400 проходит DB bound500 | Нового публичного audit API нет |
| FR-7 | Backfill перезапишет свежий owner edit | Malformed guard invalid; role/limit/rate mismatch conflict без writes; точный guard/replay успешны | Actual backfill NOT RUN |
| FR-8 | Ledger изменён, reader показывает старое | Native readCreditBalance7020; существующий reader не менялся | Live кабинет/refresh/relogin NOT RUN, отдельный root этап |
| NFR-2/3 | Новый стек или mock green |3 targets; native locks/UNIQUE/transaction; реальный PG; типы/lint | Независимое cross-model QE ещё впереди |

## Code-critic: авторский self-check

Прочитан native /home/clipmkr/.agents/skills/code-critic/SKILL.md. Это self-check автора,
не независимый code-critic и не cross-model receipt. Читающее применение к final diff:

- God-object growth: нет; файлы154/66/243строки, существующие небольшие модули.
- Security: existing active owner/target boundary, parameterized product SQL и account order
  сохранены; malformed guard и authority негативы исполнены.
- Architecture/anti-patterns/types: existing lifetime total/transaction/lock переиспользованы;
  новых флагов/schema/I/O на pure/startup paths нет. Typed unavailable/conflict не скрывает exception.
- Edge cases: empty/missing/corrupt, min/max, consumed/reserved, repeats, concurrent owners,
  erasing actor/target и audit failure проверены. >300 account bulk не входит в single-account API.
- Test quality: real-PG red и mutants падают на assertions, final97PASS; никаких source-substring
  tests и mocks canonical credit mechanism. Новые tests не пропущены.
- Process/production: код ещё не независимо принят, не опубликован, не коммитился/пушился;
  live account/role/grants/server не менялись. Full npm test и browser/S3 E2E NOT RUN:
  full-suite требует S3 и прочие интеграции; root ограничил existing PG, без MinIO/new containers.
- Suggestions/open questions: блокирующих авторских находок на final diff не выявлено.

Root separately found accepted-UUID case compatibility; она подтверждена red и исправлена.
Sibling sweep: canonical policy writer единственный; HTTP handler делегирует ему и сохраняет
strict schema; signup/optIn создают trial как прежде. Payment/reserve/finalize/read-only paths
не менялись и покрыты existing credit suite. Другие репозитории/контракты не затронуты.

## Code/spec anti-drift и граница результата

FR1–7 и NFR проверены на final local code указанными сценариями; FR8 доказан до native
balance reader. Общий trial120min включает initial30, consumed180sec сохранён: remaining7020sec
(117min), не120min refill. Ни роль, ни lowering/revoke/re-enable не обнуляют историю.
Явное повышение source limit добавляет лишь новый total delta. Legacy не мигрирует.
Три targets и согласованные inputs сохранены; uppercase correction root разрешил отдельно.
Независимое QE, допустимый deployment и адресный guarded backfill/live UI остаются NOT RUN
этой авторской сессией. Этот документ не даёт разрешение на поставку.
