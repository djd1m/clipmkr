# Переиспользование для blogger trial

Прочитан native source public-entry e381a2a,05.11.2026; runtime не проверялся этой сессией.

| Канон | Решение |
|---|---|
| credits.ts grantTrialTx | Creation остаётся прежней: signup/optIn создают единственный trial; не использовать для реконструкции missing historical source |
| credit_trial_once + source_key trial:<account> | Сохраняем одну lifetime trial строку; её total — уже существующий показатель предоставленного объёма |
| credits.ts creditAccountLock/readCreditBalance/reserve/finalize | Переиспользуем lock и весь расход/readback; новый helper лишь добавляет delta к total/remaining |
| blogger-policy.ts setBloggerPolicy | Existing authority, sorted account locks, canonical policy writer и operator_action; здесь вызывается helper и проверяется expectedPolicy |
| shared/upload sourceLimitSeconds | Единственный источник default7200 и индивидуального лимита; новых констант120мин нет |
| auth-store/optInCredits | Уже создают trial атомарно; их behavior/billing migration не менять |
| blogger-owner-handler | Existing strict POST/auth/CSRF/422 и баланс UI достаточно; новых endpoints/copy нет |
| blogger-policy/credit-packages integration tests | Existing schema setup и настоящие PG locks/barriers; без MinIO |

Projects1–8: узкий поиск grantTrialTx/credit_trial_once/migration_trial по внешнему TS/MJS
дереву не вернул кандидатов; полнота/доступность доноров не установлена. Сам native Clipmkr
№5 прочитан напрямую и полностью покрывает нужный ledger. Для additive UPDATE новый OSS/client/store
не нужен; перенос чужих trial/referral политик добавил бы не требуемый второй механизм.

Варианты: отдельный blogger promo grant даёт отдельную строку происхождения, но требует
source/schema и lifecycle key; повышение existing trial сохраняет UNIQUE/allocations и
аудируется existing action. Выбран второй. Риск: total перестаёт означать только initial30,
теперь это lifetime trial entitlement; initial/raised значения и delta сохраняет audit.
