# Reuse inventory r2

Чтение source после merge main5c5130d,11.11.2026; это не runtime-тест. Original base f701c60 не сброшен. Step2 дляM пропущен, hash закреплён в01/manifest.

| Native source | Измеренное → применение |
|---|---|
| apps/web/src/server/retention-notices.ts | Existing journal/lease/key/fencing; reuse pattern, иной account/end/offset identity. Без generic framework. |
| apps/web/src/server/support/mail.ts | sendRetention: Resend key,8s timeout, process shared cap4. Billing≤2concurrent оставляет запас auth; test capture только synthetic. Новый transport не нужен. |
| apps/web/src/server/{watchdog,queue-runtime}.ts; packages/queue/src/constants.ts | Existing single-flight watchdog60s. Billing после media cleanup, max4 sends/20s admission вместо batch100×8s. |
| packages/db/src/{index,quota}.ts | createPool connect timeout3s/statement5s; native transaction. Billing SET LOCAL lock_timeout100ms/statement_timeout1s, bounded attempts; глобальные defaults не менять. |
| packages/db/src/{credits,payments,plan,owner-entitlement,support-email}.ts | Base purchase window/next_expiry не равны all-paid end. Payment/refund/email имеют account locks; reader не меняет fulfillment, а claim соблюдает account→credit advisory→notice. |
| packages/db/migrations/028_clip_retention.sql | Journal shape; новая031,030 принадлежит payment-environments. Старые migrations не менять. |
| apps/web/src/app/{dashboard/LimitsPanel,upgrade/UpgradeScreen}.tsx | Existing balance/ручной CTA/windows — без нового UI. |
| apps/web/src/server/payments/yookassa.ts | После5c5130d explicit save_payment_method ещё отсутствует. Проверить повторно после payment merge; возможна одна строка false, не пересоздание платежей. |
| tests/browser/{per-account-test-checkout-next,repeat-registration-next}.test.ts; tests/fixtures/payment-test-transport.mjs | Actual built Next/PG/Redis и HTTPS/native cookie. Reuse test-only loopback transport с NODE_ENV=test guards для mail;S3 не используется/не проверяется. |

Payment-environments: additive030 trusted test/live/unknown merchant provenance, report исключает TEST/unknown без отзыва прав. Candidate `packages/db/src/payment-provenance.ts` прочитан в `/tmp/clipmkr-payment-environments-20261111`: `verifiedLivePaymentSql(pAlias,iAlias)` соответствует нормативному контракту05 — обе environment live/merchant match, exact linkage/status/fulfilled, без SKU filter. Это наблюдение candidate, не принятие source или proof прохождения QE/поставки. Requirements/QCSD используют нормативный контракт уже сейчас. Reminders потребляет общий helper после merge final accepted030 source; перед кодом повторно проверить proof/locks/optional false/migrations и записать final pins. Revenue filter для paid end не копируется; final accepted source SHA пока pending.
One-time-offer source931256429e18ffe597678101e69ac8565321d490 уже заменил3абзаца, дата/§10.2 прежние; docs8ea82 и features/one-time-offer/10_delivery.md. Legal source/map здесь не target. Урок teach:e6746ea447e399b8 указан в их08_qe_report, recall этой итерации выполняет root. Уточнение организации11.11: root подтвердил teach `807b58c9875d93a0` и повторный recall; независимые requirements/QCSD не ждут поставки зависимости, обязательные gates сохраняются.
Donors1–8 уже встроены (Resend N1/N3,payment N6); manual3/manual1 reference SHA0ad97e1808eb2e5820ceced07be5ceba25931ff882fc6913b320f6867949f05e, auto не переносить.
Контракты проверены11.11: [Resend24h](https://resend.com/changelog/idempotency-keys), [Yoo false](https://yookassa.ru/developers/payment-acceptance/scenario-extensions/recurring-payments/pay-without-saving). code-impl/feature-adr01/03/05 и reference QE сохраняются; AQE runtime не установлен.
