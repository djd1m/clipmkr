# План BILLING-001

Inputs read: `01_requirements.md`, `02_reuse_inventory.md`, `05_architecture.md`,
`03_adr/001-verified-checkout-and-receipt.md`, `owner-approval.md`.

1. ADR-001, FR-1, FR-5. Снимок и допуск в существующей транзакции checkout.
   Typed отказ неподтверждённой почте или неопределённому старому checkout.
2. ADR-001, FR-3, FR-4, FR-5. Миграция квитанции и адреса, атомарная запись при
   начислении, owner-only projection, очистка адреса при стирании.
   Зафиксировать enum доставки в каноническом SQL_ENUMS. Существующий тест схемы
   проверяет новую таблицу и ожидаемое количество сущностей после миграции.
3. ADR-001, FR-3, FR-4, FR-6. Claim/lease, immutable payload и stable Resend key,
   отправка через существующий mailer/watchdog. В журналах только исходы и числа.
4. ADR-001, FR-1, FR-2, FR-3, FR-4, FR-5, FR-6. RED/PG и доверенный provider fixture.
   Конкурентное начисление, прямой checkout, старый неизвестный платёж, отказ,
   возврат, чужая сессия, повтор писем и истечение их окна. Отказ INSERT
   outbox откатывает оплату/начисление в применимых ветках. Проверить незавершённый
   checkout при выкладке, TEST с боевым транспортом на обычный адрес,
   неизвестную/чужую идентичность и запрет повторной отправки после refund/erasure.
   QT-1 в ADR-001 задаёт наблюдаемый PG-барьер, два oracle и контрольные мутации.
   Сценарий токена проверяет
   `tests/support-email.integration.test.ts`. Потребители прежней выдачи и сверки
   покрываются наборами credit-packages, payment-environments и relocation-test-webhook.
5. ADR-001, FR-1, FR-2, FR-4, FR-6. Подключить согласованный интерфейс.
   Из выбранного пакета вызвать существующую проверку почты с доппараметром из
   каталога. Ссылка содержит только нужный контекст; вошедший владелец подтверждает
   токен и явно возвращается в пакет. Привязать форму и ключ попытки к аккаунту,
   проверить инвалидацию при смене сессии и повтор при потере ответа. Показывать
   состояние письма рядом с успешным начислением. Переиспользовать существующий
   стиль, компоненты и ограниченный опрос. Проверить Chromium (390 и 1440 px),
   обе темы, reflow при 320 CSS px и 200% текст, клавиатурный фокус при ошибке,
   устойчивый live region и связь UI с серверным запретом. Истечение опроса и
   неопределённый исход сохраняют успешный результат покупки. Новый сеанс
   без подходящего токена повторно запрашивает письмо с прежним SKU.
   Тесты покрывают отказ письма, старое неизвестное намерение и поздний
   ответ A при активной сессии B без перехода к форме оплаты A.
   Применить существующую серверную сборку зависимостей для HMAC и существующий
   `SupportMailer` для явного различения локального TEST capture и Resend.
6. FR-6. Независимое cross-model QE стабильного снимка, проверка TEST/LIVE,
   фискального контракта и anti-drift. Сначала кандидат в изоляции.

EXPECTED_CODE_TARGETS:
- packages/db/migrations/034_verified_checkout_receipt.sql
- packages/shared/src/enums.ts
- tests/database.integration.test.ts
- packages/db/src/payments.ts
- packages/db/src/payment-receipt-delivery.ts
- packages/db/src/index.ts
- apps/web/src/server/billing-handler.ts
- apps/web/src/server/payment-receipts.ts
- apps/web/src/server/watchdog.ts
- apps/web/src/server/retention.ts
- tests/billing.integration.test.ts
- tests/billing.unit.test.ts
- tests/yookassa-receipts.integration.test.ts
- tests/yookassa-receipts.unit.test.ts
- tests/payment-receipt-delivery.integration.test.ts
- tests/credit-packages.integration.test.ts
- tests/payment-environments.integration.test.ts
- tests/relocation-test-webhook.integration.test.ts
- tests/browser/payment-environments-next.test.ts
- tests/browser/per-account-test-checkout-next.test.ts
- apps/web/src/server/billing-deps.ts
- apps/web/src/server/billing-runtime.ts
- apps/web/src/server/support/mail.ts
- apps/web/src/server/support/email-handler.ts
- apps/web/src/lib/payment-return.ts
- apps/web/src/app/upgrade/page.tsx
- apps/web/src/app/upgrade/UpgradeScreen.tsx
- apps/web/src/app/upgrade/return/page.tsx
- apps/web/src/app/upgrade/return/ReturnScreen.tsx
- apps/web/src/app/verify-email/page.tsx
- apps/web/src/app/support/RecoveryForm.tsx
- apps/web/src/app/globals.css
- tests/support-email.integration.test.ts
- tests/browser/billing-verified-email-next.test.ts
