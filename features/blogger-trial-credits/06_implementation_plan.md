# Blogger trial — план S8

Статус: FINAL, принят root 05.11.2026 после чтения 01/02/06 и native contracts; код/live ещё не разрешены.
Planner gpt-6-astra xhigh; coder gpt-6.1-sol high; после кода fresh Astra cross-model QE.
Inputs read: 00,01,02_reuse_inventory, native credits/blogger-policy/auth/upload/handler,
migration022/026 и existing PG tests. 03_adr/05_architecture не требуются для S8.

## Goal state и решение

Current: setBloggerPolicy меняет policy/audit, trial остаётся1800. Goal: total7200,
remaining7020 после180с расхода, без второго гранта/потери reserved/изменения paid rows.
Используем lifetime high-watermark в existing trial.total_seconds. Отдельный promo grant
дал бы отдельную provenance строку, но потребовал бы source/schema/key lifecycle;
существующий trial + operator_action delta обеспечивают нужный аудит без этих изменений.
Existing grantTrialTx creation, readCreditBalance/reserve/finalize полностью переиспользуются.

## Tasks, зависимости и checks

- T0 — specification; FR-1, FR-2, FR-7, NFR-2: root принимает этот план после actual
  K1/K2/OpenSpec; supported router/plan checkpoints и source admission/coder-context.
  До решения root Step7 не начинается.
- T1 — refinement/red; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, NFR-1, NFR-3:
  новая tests/blogger-trial-credits.integration.test.ts, existing PG fixture setup.
  Native baseline должен реально FAIL на1800→7200; матрица ниже, без production effects.
- T2 — refinement/green; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, NFR-1, NFR-2:
  packages/db/src/credits.ts + blogger-policy.ts; контракты ниже. После T1;
  критерий: все новые PG tests green, ledger инварианты и audit rollback доказаны.
- T3 — completion; FR-1, FR-2, FR-3, FR-4, FR-5, FR-6, FR-7, FR-8, NFR-1, NFR-2, NFR-3:
  после T2 own build/typecheck/lint, targeted+full suite, negative falsifiers, независимое
  code-critic/QE, exact anti-drift и root release decision. Live backfill только отдельно.

Порядок T0→T1→T2→T3; один Sol author, параллельной записи нет. Оценка реализации30–60мин,
PG/QE по факту; оценка не разрешает пропуск проверок. Code targets ровно3.

## Контракты двух изменений

1. credits.ts: новый export `raiseTrialCreditsTx(tx, accountId, targetSeconds)` для
   вызова только внутри existing policy transaction после account locks. Проверить integer
   native bounds; existing creditAccountLock → SELECT canonical trial FOR UPDATE.
   Только source signup/migration_trial, source_key trial:<account>, без expires_at,
   payment/recovery/entitlement links. Missing/noncanonical → typed unavailable без writes;
   source не угадывать и grantTrialTx для repair не вызывать. D=max(0,target-total).
   Одним UPDATE повысить total/remaining на D; reserved,source/key и history неизменны.
   Вернуть typed beforeTotal/afterTotal/delta и raised/unchanged/unavailable.
2. blogger-policy.ts: existing sorted actor/target locks + active owner/target checks;
   optional input expectedPolicy (exact is_blogger, blogger_source_limit_seconds,
   blogger_commission_percent) валидировать и сравнить с locked before. Malformed→invalid,
   mismatch→conflict до writes. Existing HTTP handler не передаёт guard и не меняется.
   Только input.isBlogger=true && target.billing_policy=credits_v1 вызывает helper с
   sourceLimitSeconds будущей policy. Revocation/legacy не трогают trial и не требуют его.
   unavailable→credit_review_required до policy UPDATE. После helper existing UPDATE policy
   и audit остаются в той же transaction; exception/audit failure откатывает всё.
   reason дополняется `trial_total:<before>-><after>; trial_delta:<D>; trial:<state>`;
   states raised/unchanged/legacy/revoked, target уже в account_id. Проверить предел500
   при reason300 и максимальных числах; не обрезать reason и не commit partial error.

## Реальные PG oracles

Все titles PLANNED/NOT RUN, один новый integration файл; источник trial — grantTrialTx.

| Title | Сценарий/oracle |
|---|---|
| raises existing trial and preserves consumed seconds |1800/1620/0→7200/7020/0, та же id/key/source; fresh→7200remaining; native balance7020 |
| never refills repeat revoke or lower limit |20concurrent saves; расход; revoke/re-enable; L120; затем L9000 лишь +1800 раз; isBlogger=false missing trial допускается |
| changes only trial beside paid and recovery grants |Paid/recovery/history snapshots равны; баланс paid не вычитается из trial delta; free remains free |
| preserves legacy and refuses missing canonical trial |Legacy role меняется без opt-in; credits missing/wrong key/expiry/linkage→refusal без effects |
| serializes trial increase with reserve finalize and erasure |Две PG connections/barriers, native reserve/finalize/refund, held Q и consumed T-R-Q сохраняются; no deadlock/negative |
| authority and audit failure roll back all changes |Другой actor/inactive actor/erasing target; DB audit CHECK refusal после helper → role/grant unchanged |
| expected policy refuses stale or malformed maintenance |Invalid shape; change role/limit/rate между read и call→conflict/no writes; unchanged snapshot→same canonical delta |
| audit records delta within native reason bound |Actor/target/action, positive и zero delta; reason300+max fields≤500; legacy/revoke state |

Targeted falsifiers: remaining=target вместо additive ломает consumed/reserved cases;
delta от remaining ломает repeat; removal expectedPolicy ломает drift; swallowed audit
exception ломает rollback. Не использовать source-substring тесты вместо behavior.

## Проверки и поставка

Node22.23.4; собственные shared/db packages, не sibling product dist.
`npm run build --workspace=packages/shared`, `npm run build --workspace=packages/db`,
`npm run typecheck`, `npm run lint`, `npm test -- tests/blogger-trial-credits.integration.test.ts
tests/blogger-policy.integration.test.ts tests/credit-packages.integration.test.ts`, затем
`npm test` на existing isolated *_test/schema. Новых контейнеров/MinIO нет; не заменять
PG mock. Существующие billing/auth/upload/owner tests проходят; новых SKIP нет.
OpenSpec strict и git diff --check. Независимое QE читает approved docs сначала,
самостоятельно находит final code/tests, фиксирует exact model/session/commands/results.
S8 не отменяет real-PG/code review. studio-extended-qe Reference: risk/test design,
security/concurrency/fault и targeted mutation; AQE runtime не запускается.

Backfill после root-admitted verified deployment: existing built module из actual
web /app/packages/db/dist/index.js; native DB URL из existing env, IDs из private profile.
OS/SSH delegated authority, active owner actor проверяется existing service, reason
«Делегированное обслуживание: доведение пробного бюджета блогера; поручение владельца».
Прочитать target policy/balance; сохранить exact expectedPolicy; вызвать setBloggerPolicy
с теми же role/limit/rate и guard; readback trial/audit/balance. Один account, без cookie,
password reset, SQL credit patch или нового public API. Command template ниже.
Root сохраняет реальные шестислойный compose/Resend и approved deployment порядок;
скрипт этой фичи не управляет deploy. UI refresh/relogin подтверждаются отдельно.

Одноразовая команда только после live admission, внутри выбранного нового web image,
cwd /app; private env содержит BLOGGER_TRIAL_ACTOR_ID/BLOGGER_TRIAL_ACCOUNT_ID:

```sh
node <<'NODE'
const {createPool,getBloggerPolicy,setBloggerPolicy,readCreditBalance}=require('./packages/db/dist/index.js');
const pool=createPool(process.env.DATABASE_URL);
(async()=>{try {
  const accountId=process.env.BLOGGER_TRIAL_ACCOUNT_ID;
  const p=await getBloggerPolicy(pool,accountId);
  if(!p?.is_blogger) throw Error('expected existing blogger');
  const expectedPolicy={is_blogger:p.is_blogger,blogger_source_limit_seconds:p.blogger_source_limit_seconds,blogger_commission_percent:p.blogger_commission_percent};
  const result=await setBloggerPolicy(pool,{actorAccountId:process.env.BLOGGER_TRIAL_ACTOR_ID,accountId,isBlogger:p.is_blogger,sourceLimitSeconds:p.blogger_source_limit_seconds,commissionPercent:p.blogger_commission_percent,expectedPolicy,reason:'Делегированное обслуживание: доведение пробного бюджета блогера; поручение владельца'});
  if(result.kind!=='updated') throw Error(result.kind);
  console.log(JSON.stringify({kind:result.kind,balance:await readCreditBalance(pool,accountId)}));
} finally {await pool.end();}})().catch(()=>{console.error('Backfill failed; inspect private audit');process.exitCode=1;});
NODE
```

## Ограничения и пересмотр

Grant total теперь lifetime trial high-watermark; initial и increases видны по audit.
Missing/corrupt credits trial требует разбора, не auto-repair. Новый лимит ниже прежнего
не отзывает кредиты; paid права не появляются. Внешний direct SQL не часть канона.
Расширение schema/UI/новые sources или >3 code targets требует пересмотра scope/плана.

EXPECTED_CODE_TARGETS:
- packages/db/src/credits.ts
- packages/db/src/blogger-policy.ts
- tests/blogger-trial-credits.integration.test.ts
