# Реализация пробного бюджета блогера

Автор: gpt-6.1-sol high, отдельная сессия blogger_trial_implementation, 05.11.2026.
Base e381a2a8034d1424800e85f61625990b4e1bb0e8. Три согласованных code targets.

- packages/db/src/credits.ts: raiseTrialCreditsTx переиспользует creditAccountLock,
  блокирует canonical trial и прибавляет положительную разницу lifetime total к total/remaining.
  Reserved, consumed, paid/recovery/history не переписываются; missing/corrupt trial unavailable.
- packages/db/src/blogger-policy.ts: existing account locks/owner checks/transaction,
  optional exact expectedPolicy с conflict, funding только true+credits_v1, delta audit.
  После проверки UUID actor/target нормализуются в lowercase; helper использует ту же identity.
- tests/blogger-trial-credits.integration.test.ts: 16 реальных PG tests, включая пять отдельных
  двадцатикратных concurrent saves, reserve/finalize/erasure barriers и audit rollback.

Root предложил проверить uppercase UUID. Реальное красное: существующий text UUID lookup
возвращал not_found раньше нового helper; это не доказательство новой regression. Root
явно разрешил canonicalization в тех же трёх targets. Отдельный red→green сохранён в qa.

Изменений schema, UI, HTTP endpoint, signup/optIn, reserve/finalize/readCreditBalance нет.
Собственные node_modules через npm ci; собственные shared/db build, без sibling dist.
Документы 00/01/02/06 и OpenSpec автор не редактировал. Code/spec trace и ограничения —
08_author_validation.md; независимое QE и live admission остаются root.
