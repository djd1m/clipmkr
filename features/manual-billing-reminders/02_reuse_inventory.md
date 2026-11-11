# Reuse inventory — чтение base f701c60,11.11.2026

Это source evidence, не runtime-тест. Step2 research дляM пропущен; measured hash закреплён в01/requirements-revision.

| Native source | Решение |
|---|---|
| apps/web/src/server/retention-notices.ts | Reuse journal/lease/3attempts/1h/23h/fencing; billing event имеет другой identity. Не переносить clip grouping, не строить generic framework. |
| apps/web/src/server/support/mail.ts | sendRetention уже поддерживает arbitrary message+Resend key,8s timeout/response cap,synthetic test capture. Reuse transport, SMTP не поддерживает этот idempotent path. |
| apps/web/src/server/{watchdog,queue-runtime}.ts | Existing loop и локальный catch; отдельный optional billing tick. |
| packages/db/src/credits.ts | nextCreditBaseStart clamp(now,base tail) пригоден для покупки, не reminder. Новый малый reader объединяет все payment intervals/base/addon вокруг now; balance.next_expiry не подходит. Fulfillment/windows не менять. |
| packages/db/src/{payments,plan,owner-entitlement,quota}.ts | Native account lock/transaction; refunds needs_review не снимают grants. Observer suppresses; owner/operator exempt. |
| packages/db/migrations/028_clip_retention.sql | Native journal shape; additive030 billing_notice, FK CASCADE.028/029 не менять. |
| apps/web/src/app/{dashboard/LimitsPanel,upgrade/UpgradeScreen}.tsx; server/limits.ts | Existing balance/manual CTA/base-addon dates; без новых controls. SourceLimitsPanel из brief фактически LimitsPanel. |
| apps/web/src/server/payments/yookassa.ts | Единственный createPayment POST; сохранить receipt/RUB, добавить explicit false. Handler менять не требуется. |
| apps/web/src/lib/legal-documents.ts; tests/legal-pages.test.ts; tests/artifacts/legal-pages/approved-replacements.json |87paragraphs, narrow replacement map; original golden не переписывать. |
| tests/{retention-notices.integration,support-mail-resend,credit-packages.integration}.test.ts | Native fixtures; дополнить реальной concurrency/Next E2E, не выдавать SSR заbrowser. |

Donors1–8 уже встроены: Resend N1/N3 и payment N6. Новый перенос/dep не нужен. Manual copy: docs/design/2026-11-11-optional-autorenew.html в sibling worktree, SHA2560ad97e1808eb2e5820ceced07be5ceba25931ff882fc6913b320f6867949f05e; толькоmanual3/manual1.

Проверенные11.11контракты: [Resend](https://resend.com/changelog/idempotency-keys) хранит key24h, payload mismatch отвергается;23h — запас. [ЮKassa](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-without-saving) поддерживает explicit false без сохранения средства.

Pinned dz0.8.58/feature-adr1.5.25; modules01/03/05 canonical /home/clipmkr побайтно совпали с прочитанными Product Studio. code-impl/studio-extended-qe reference: shift-left,contract,boundary/state,resilience/security,mutation. AQE runtime не запускался.

Координатор подтвердил existing actual Next fixtures: tests/browser/per-account-test-checkout-next.test.ts,repeat-registration-next.test.ts и tests/fixtures/payment-test-transport.mjs; использовать их, без нового harness.
