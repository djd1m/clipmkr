# Переиспользование

- `UpgradeScreen`, `RecoveryForm` и `ReturnScreen` уже реализуют покупку, подтверждение
  и возврат. `SupportEmailStore.confirm` связывает токен с аккаунтом, текущим адресом
  и проверенной сессией. `readAccountBilling` и `createPaymentIntent` дают серверный контекст.
- `applyVerifiedPayment` подтверждает полученный платёж и сериализует выдачу пакета
  в транзакции. `createCheckoutHandler` уже обрабатывает сохранённый id провайдера
  и отсеивает неопределённый старый checkout. У квитанции отдельный ID намерения.
- Рассылка напоминаний уже использует `SupportMailer.sendRetention` с Resend,
  ограниченным lease и неизменяемым payload. Сетевой транспорт, синтетический захват
  и принципы блокировки переиспользуются. Схема `billing_notice` зависит от дат
  окончания и offset 1/3 и сохраняет своё назначение.
- Resend учитывает неизменные payload и ключ в течение 24 часов.
  [Документация](https://resend.com/docs/dashboard/emails/idempotency-keys).
- Проверки: `tests/support-email-handler.test.ts`, `tests/support-email.integration.test.ts`,
  `tests/billing.integration.test.ts`, `tests/yookassa-receipts.integration.test.ts`,
  `tests/billing-notices.integration.test.ts`, существующие Playwright-проверки покупки.
