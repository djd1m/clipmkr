import { isUuid, type PaymentEvent, type Pool } from '@clipmaker/db';
import type { WebConfig } from '@clipmaker/shared/config';
import { createPaymentWebhookHandler, type BillingDependencies } from './billing-handler';

// Этот endpoint существует только для изолированного QA TEST-магазина при переносе.
// Checkout allowance не участвует: после его отзыва уже созданные оплаты должны дойти.
function isRelocationQa(config: WebConfig, deps: BillingDependencies): boolean {
  const payments = config.payments;
  if (payments.mode !== 'live' || payments.testMode !== true || !payments.secretKey.startsWith('test_') ||
      payments.secretKey.length <= 5 || deps.provider?.name !== 'yookassa' || config.billingMode !== 'credits_v1' ||
      config.checkoutEnabled !== false || config.publicOrigin !== 'https://77.83.87.178' ||
      config.s3.keyPrefix !== 'tests/local-ux-20261104/relocate-20261109/') return false;
  try {
    const db = new URL(config.databaseUrl), redis = new URL(config.redisUrl);
    return ['postgres:', 'postgresql:'].includes(db.protocol) && db.hostname === 'clipmkr-stage-20261028-db-1' &&
      (db.port === '' || db.port === '5432') && db.username === 'n5_relocation_qa' && db.pathname === '/n5_relocation_qa_test' &&
      !db.search && !db.hash && redis.protocol === 'redis:' && redis.hostname === 'clipmkr-stage-20261028-redis-1' &&
      (redis.port === '' || redis.port === '6379') && redis.pathname === '/4' && !redis.search && !redis.hash;
  } catch { return false; }
}

export function createRelocationTestWebhookHandler(deps: BillingDependencies, pool: Pool, config: WebConfig) {
  if (!isRelocationQa(config, deps)) return async (_request: Request): Promise<Response> => Response.json(
    { error: { code: 'unavailable', message: 'Сервис временно недоступен' } },
    { status: 503, headers: { 'Cache-Control': 'no-store' } });

  async function admit(input: PaymentEvent): Promise<void> {
    // Выполняется ПОСЛЕ canonical provider verification, но ДО claimEvent обоих consumers.
    if (!isUuid(input.payment.orderId)) throw new Error('QA payment intent is not local');
    const local = await pool.query('SELECT 1 FROM payment_intent WHERE id=$1 AND provider_payment_id=$2',
      [input.payment.orderId, input.payment.id]);
    if (!local.rowCount) throw new Error('QA payment intent is not local');
  }
  return createPaymentWebhookHandler({ ...deps,
    applyPayment: async input => { await admit(input); return deps.applyPayment(input); },
    recordRefund: async input => { await admit(input); return deps.recordRefund(input); },
  });
}
