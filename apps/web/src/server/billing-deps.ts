// из N6: projects/06-rag-sales-chatbase/apps/web/src/server/billing-deps.ts — адаптировано (фича 30 payments): без интереса
// (в N5 он tRPC), плюс число доверенных хопов и ограничитель чтений N5. Одна функция для маршрутов и для тестов
// (tests/billing.integration.test.ts): тест подменяет только провайдера и ограничитель — намерение, ключ повторности,
// план и срок идут по НАСТОЯЩЕМУ SQL.
import { applyVerifiedPayment, createPaymentIntent, markIntentCanceled, readPaymentIntent, recordVerifiedRefund,
  setIntentProviderPayment, type Pool } from '@clipmaker/db';
import type { ReceiptConfig } from '@clipmaker/shared/tariff';
import type { BillingMode } from '@clipmaker/shared/config';
import type { BillingDependencies } from './billing-handler';
import type { PaymentProvider } from './payments/provider';
import { createHmac, timingSafeEqual } from 'node:crypto';

export function checkoutOwnerScope(secret: string, accountId: string): string {
  return createHmac('sha256', secret).update(`checkout-owner-v1:${accountId}`).digest('hex');
}

export interface BillingWiring {
  pool: Pool;
  billingMode?: BillingMode;
  receiptConfig?: ReceiptConfig | null;
  checkoutAllowed: BillingDependencies['checkoutAllowed'];
  publicOrigin: string;
  trustedProxyHops: number;
  sessionSecret?: string;
  provider: PaymentProvider | null;
  allowMutation: (ip: string, account?: string) => Promise<boolean>;
  allowRead: (ip: string, account?: string) => Promise<boolean>;
  authenticate: (token: string) => Promise<{ account_id: string } | null>;
  log?: (line: string) => void;
}

export function createBillingDependencies(w: BillingWiring): BillingDependencies {
  const { pool } = w;
  return {
    receiptConfig:w.receiptConfig, billingMode:w.billingMode ?? 'legacy', checkoutAllowed: w.checkoutAllowed,
    billingPolicy: async accountId => (await pool.query<{billing_policy:string}>(`SELECT billing_policy FROM account WHERE id=$1 AND status='active'`,[accountId])).rows[0]?.billing_policy ?? null,
    matchesOwnerScope: (scope, accountId) => !!w.sessionSecret && /^[a-f0-9]{64}$/.test(scope) &&
      timingSafeEqual(Buffer.from(scope, 'hex'), Buffer.from(checkoutOwnerScope(w.sessionSecret, accountId), 'hex')),
    publicOrigin: w.publicOrigin, trustedProxyHops: w.trustedProxyHops, authenticate: w.authenticate,
    allowMutation: w.allowMutation, allowRead: w.allowRead, provider: w.provider, log: w.log,
    createIntent: (input) => createPaymentIntent(pool, input),
    setIntentPayment: (intentId, paymentId, proof) => setIntentProviderPayment(pool, intentId, paymentId, proof),
    readIntent: (intentId, accountId) => readPaymentIntent(pool, intentId, accountId),
    markCanceled: (intentId, proof) => markIntentCanceled(pool, intentId, proof),
    applyPayment: (input) => applyVerifiedPayment(pool, input),
    recordRefund: (input) => recordVerifiedRefund(pool, input),
  };
}
