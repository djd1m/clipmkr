// QA admission переиспользует настоящий billing consumer, PostgreSQL и HTTP adapter ЮKassa.
// Это компонентная проверка, не доказательство доставки настоящим магазином.
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool, createPaymentIntent, setIntentProviderPayment } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { createBillingDependencies } from '../apps/web/src/server/billing-deps';
import { createYooKassaProvider } from '../apps/web/src/server/payments/yookassa';
import type { PaymentProvider } from '../apps/web/src/server/payments/provider';
import { checkoutAllowedForAccount, loadWebConfig, type WebConfig } from '../packages/shared/src/config';
import { SECRET, SHOP_ID, startFakeYooKassa, type FakeYooKassa } from './fixtures/fake-yookassa-server';
import { environment } from './fixtures/environment';

import { createRelocationTestWebhookHandler } from '../apps/web/src/server/relocation-test-webhook';
const ORIGIN = 'https://77.83.87.178';
const IP = '185.71.76.10';
const databaseUrl = process.env.DATABASE_URL;
const qaConfig = (overrides: Readonly<Record<string, string | undefined>> = {}) => loadWebConfig({ ...environment(),
  DATABASE_URL: 'postgresql://n5_relocation_qa@clipmkr-stage-20261028-db-1:5432/n5_relocation_qa_test',
  REDIS_URL: 'redis://clipmkr-stage-20261028-redis-1:6379/4',
  S3_KEY_PREFIX: 'tests/local-ux-20261104/relocate-20261109/', N5_PUBLIC_ORIGIN: ORIGIN,
  N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false', N5_PAYMENTS_MODE: 'live',
  YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true', ...overrides });
const request = (raw: string, ip = IP) => new Request(`${ORIGIN}/api/webhooks/yookassa-test`, { method: 'POST',
  headers: { 'content-type': 'application/json', 'x-forwarded-for': `${ip}, 10.0.0.2, 10.0.0.3` }, body: raw });

// Обязательная DB: отсутствие профиля — FAIL, не skip/ложный GREEN.
describe('QA TEST callback admission на настоящем PostgreSQL', () => {
  let pool: Pool;
  let yk: FakeYooKassa;
  const schema = `relocation_webhook_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!databaseUrl || !/^[a-z][a-z0-9_]*_test$/.test(new URL(databaseUrl).pathname.slice(1))) {
      throw new Error('Нужна отдельная заранее подготовленная PostgreSQL база *_test');
    }
    pool = createPool(databaseUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`);
    await migrate(pool);
    yk = await startFakeYooKassa();
  }, 60_000);
  afterAll(async () => {
    try { await yk?.close(); }
    finally { if (pool) { try { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); } finally { await pool.end(); } } }
  });
  const provider = () => createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: true, apiBase: yk.apiBase });
  function wire(config = qaConfig(), paymentProvider: PaymentProvider | null = provider(), sqlFailure = false) {
    const deps = createBillingDependencies({ pool, billingMode: config.billingMode,
      checkoutAllowed: (id, policy) => checkoutAllowedForAccount(config, id, policy, !!paymentProvider),
      publicOrigin: config.publicOrigin, trustedProxyHops: 2, provider: paymentProvider,
      authenticate: async () => null, allowMutation: async () => true, allowRead: async () => true, log: () => {} });
    const apply = vi.spyOn(deps, 'applyPayment'), refund = vi.spyOn(deps, 'recordRefund');
    const select = vi.fn(async (sql: string, params: unknown[]) => {
      if (sqlFailure) throw new Error('isolated SELECT unavailable');
      return pool.query(sql, params);
    });
    // Только guard SELECT наблюдается отдельно; consumers используют тот же настоящий pool.
    const observedPool = new Proxy(pool, { get(target, key) {
      if (key === 'query') return select;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const handler = createRelocationTestWebhookHandler(deps, observedPool, config);
    return { deps, apply, refund, select, handler, notify: (raw: string, ip = IP) => handler(request(raw, ip)) };
  }
  async function snapshot() {
    const state: Record<string, unknown> = {};
    for (const table of ['payment_event', 'payment', 'credit_grant', 'payment_intent', 'account']) {
      // Имена фиксированы этим тестом, значения/идентификаторы запросов параметризованы.
      state[table] = (await pool.query(`SELECT to_jsonb(t) AS row FROM ${table} t ORDER BY id`)).rows;
    }
    return state;
  }
  async function localIntent() {
    const id = randomUUID();
    await pool.query("INSERT INTO account(id,email,password_hash,billing_policy) VALUES($1,$2,'x','credits_v1')", [id, `${id}@test.invalid`]);
    const result = await createPaymentIntent(pool, { accountId: id, priceMinor: 99000, idempotencyKey: randomUUID(), sku: 'start_v1', billingMode: 'credits_v1' });
    if (result.kind !== 'created') throw new Error('expected created intent');
    return { account: id, intent: result.intent.id };
  }
  async function remote(orderId: string = randomUUID()) {
    const p = await provider().createPayment({ orderId, amountMinor: 99000, returnUrl: `${ORIGIN}/upgrade/return`, description: 'test' });
    yk.pay(p.id);
    return p.id;
  }
  const expectNoConsumers = (w: ReturnType<typeof wire>) => { expect(w.apply).not.toHaveBeenCalled(); expect(w.refund).not.toHaveBeenCalled(); };

  it('foreign TEST payment and refund retries return 503 before any ledger write', async () => {
    const mismatch = await localIntent(), unbound = await localIntent();
    await setIntentProviderPayment(pool, mismatch.intent, randomUUID());
    const payments = [await remote(), await remote(mismatch.intent), await remote(unbound.intent)];
    const w = wire();
    const observations: Array<{ event: string; statuses: number[]; unchanged: boolean }> = [];
    for (const id of payments) {
      const refund = yk.refund(id);
      for (const raw of [yk.notification(id), yk.refundNotification(refund)]) {
        const before = await snapshot();
        const responses = [await w.notify(raw), await w.notify(raw),
          ...await Promise.all(Array.from({ length: 20 }, () => w.notify(raw)))];
        observations.push({ event: JSON.parse(raw).event as string, statuses: responses.map(r => r.status),
          unchanged: JSON.stringify(await snapshot()) === JSON.stringify(before) });
        expect(responses.every(r => r.headers.get('cache-control') === 'no-store')).toBe(true);
      }
    }
    expect(observations).toEqual(observations.map(({ event }) => ({ event, statuses: Array(22).fill(503), unchanged: true })));
    expectNoConsumers(w);
  });

  it('verified null or invalid intent is refused before SQL and consumers', async () => {
    for (const orderId of [null, 'invalid-uuid']) {
      for (const kind of ['payment_succeeded', 'refund_succeeded'] as const) {
        const p = { id: randomUUID(), orderId, amountMinor: 99000, feeMinor: 0, paidAt: new Date().toISOString() };
        // Невозможный для actual provider invalid UUID проверяет вход guard после verification.
        const stub: PaymentProvider = { ...provider(), verifyNotification: vi.fn().mockResolvedValue({ kind, payment: p, refund: { id: randomUUID() } }) };
        const w = wire(qaConfig(), stub), before = await snapshot();
        expect((await w.notify('{}')).status).toBe(503);
        expect(w.select).not.toHaveBeenCalled(); expectNoConsumers(w);
        expect(await snapshot()).toEqual(before);
      }
    }
  });

  it('raw body, IP and provider verification precede local SELECT', async () => {
    const id = await remote(), w = wire(), before = await snapshot();
    expect((await w.notify(yk.notification(id), '203.0.113.7')).status).toBe(400);
    expect((await w.notify('')).status).toBe(400);
    expect((await w.notify('x'.repeat(65537))).status).toBe(400);
    expect((await w.notify('{')).status).toBe(400);
    yk.readAmountOverride = '1.00';
    try { expect((await w.notify(yk.notification(id))).status).toBe(400); } finally { yk.readAmountOverride = null; }
    yk.payments.get(id)!.test = false;
    try { expect((await w.notify(yk.notification(id))).status).toBe(400); } finally { yk.payments.get(id)!.test = true; }
    yk.failReads = true;
    try { expect((await w.notify(yk.notification(id))).status).toBe(503); } finally { yk.failReads = false; }
    yk.payments.get(id)!.metadata.order_id = 'invalid';
    expect((await w.notify(yk.notification(id))).status).toBe(400);
    const p = yk.payments.get(id)!;
    Reflect.deleteProperty(p.metadata, 'order_id');
    expect((await w.notify(yk.notification(id))).status).toBe(400);
    // Refund с отсутствующим metadata проходит provider normalization как orderId=null.
    expect((await w.notify(yk.refundNotification(yk.refund(id)))).status).toBe(503);
    const ignored = await w.notify(JSON.stringify({ event: 'payment.canceled' }));
    expect(ignored.status).toBe(200); expect(await ignored.json()).toEqual({ data: { applied: false, reason: 'ignored_event' } });
    expect(w.select).not.toHaveBeenCalled(); expectNoConsumers(w); expect(await snapshot()).toEqual(before);
  });

  it('SELECT failure returns retryable 503 before either consumer', async () => {
    const local = await localIntent(), id = await remote(local.intent);
    await setIntentProviderPayment(pool, local.intent, id);
    const w = wire(qaConfig(), provider(), true), before = await snapshot();
    for (const raw of [yk.notification(id), yk.refundNotification(yk.refund(id))]) expect((await w.notify(raw)).status).toBe(503);
    expect(w.select).toHaveBeenCalledTimes(2); expectNoConsumers(w); expect(await snapshot()).toEqual(before);
  });

  it('known QA payment remains idempotent and drains after checkout revocation', async () => {
    const local = await localIntent(), id = await remote(local.intent);
    const allowed = qaConfig({ N5_TEST_CHECKOUT_ACCOUNT_ID: local.account });
    const w = wire(allowed), before = await snapshot();
    expect(w.deps.checkoutAllowed(local.account, 'credits_v1')).toBe(true);
    expect((await w.notify(yk.notification(id))).status).toBe(503);
    expect(await snapshot()).toEqual(before); expectNoConsumers(w);
    await setIntentProviderPayment(pool, local.intent, id);
    const drain = wire(qaConfig({ DATABASE_URL: 'postgresql://n5_relocation_qa@clipmkr-stage-20261028-db-1/n5_relocation_qa_test',
      REDIS_URL: 'redis://clipmkr-stage-20261028-redis-1/4' }));
    expect(drain.deps.checkoutAllowed(local.account, 'credits_v1')).toBe(false);
    const burst = await Promise.all(Array.from({ length: 20 }, () => drain.notify(yk.notification(id))));
    expect(burst.every(r => r.status === 200)).toBe(true);
    const bodies = await Promise.all(burst.map(r => r.json()));
    expect(bodies.filter(b => b.data.applied)).toHaveLength(1);
    const once = await snapshot();
    for (let n = 0; n < 2; n++) expect((await drain.notify(yk.notification(id))).status).toBe(200);
    expect(await snapshot()).toEqual(once);
    expect((await pool.query('SELECT count(*)::int AS n FROM credit_grant WHERE account_id=$1 AND payment_ref=$2', [local.account, local.intent])).rows[0].n).toBe(1);
    expect(drain.select).toHaveBeenCalledWith('SELECT 1 FROM payment_intent WHERE id=$1 AND provider_payment_id=$2', [local.intent, id]);
  });

  it('known refund ordering and repeat deliveries retain canonical behavior', async () => {
    for (const refundFirst of [false, true]) {
      const local = await localIntent(), id = await remote(local.intent);
      await setIntentProviderPayment(pool, local.intent, id);
      const w = wire(), refund = yk.refundNotification(yk.refund(id));
      if (!refundFirst) expect((await w.notify(yk.notification(id))).status).toBe(200);
      const burst = await Promise.all(Array.from({ length: 20 }, () => w.notify(refund)));
      expect(burst.every(r => r.status === 200)).toBe(true);
      expect((await w.notify(yk.notification(id))).status).toBe(200);
      const once = await snapshot();
      expect((await w.notify(refund)).status).toBe(200); expect(await snapshot()).toEqual(once);
      const row = (await pool.query('SELECT status FROM payment WHERE provider_payment_id=$1', [id])).rows[0];
      expect(row.status).toBe('refunded');
    }
  });

  it('QA webhook rejects non-QA bindings and live mode before ledger access', async () => {
    const cases: Array<[string, Partial<WebConfig>]> = [
      ['DB host', { databaseUrl: 'postgresql://n5_relocation_qa@other/n5_relocation_qa_test' }],
      ['DB name', { databaseUrl: 'postgresql://n5_relocation_qa@clipmkr-stage-20261028-db-1/n5' }],
      ['DB role', { databaseUrl: 'postgresql://other@clipmkr-stage-20261028-db-1/n5_relocation_qa_test' }],
      ['DB port', { databaseUrl: 'postgresql://n5_relocation_qa@clipmkr-stage-20261028-db-1:5433/n5_relocation_qa_test' }],
      ['DB query', { databaseUrl: qaConfig().databaseUrl + '?options=unsafe' }],
      ['DB hash', { databaseUrl: qaConfig().databaseUrl + '#unsafe' }],
      ['bad DB URL', { databaseUrl: 'invalid' }],
      ['Redis host', { redisUrl: 'redis://other:6379/4' }], ['Redis DB', { redisUrl: 'redis://clipmkr-stage-20261028-redis-1:6379/0' }],
      ['Redis port', { redisUrl: 'redis://clipmkr-stage-20261028-redis-1:6380/4' }],
      ['Redis query', { redisUrl: qaConfig().redisUrl + '?db=0' }], ['Redis hash', { redisUrl: qaConfig().redisUrl + '#x' }],
      ['billing', { billingMode: 'legacy' }], ['checkout', { checkoutEnabled: true }],
      ['origin', { publicOrigin: 'https://clipmkr.ru' }],
      ['prefix', { s3: { ...qaConfig().s3, keyPrefix: 'tests/other/' } }],
      ['off', { payments: { mode: 'off' } }], ['fake', { payments: { mode: 'fake' } }],
      ['live money', { payments: { mode: 'live', shopId: SHOP_ID, secretKey: 'live_secret', testMode: false } }],
      ['wrong key', { payments: { mode: 'live', shopId: SHOP_ID, secretKey: 'live_secret', testMode: true } }],
      ['empty key', { payments: { mode: 'live', shopId: SHOP_ID, secretKey: 'test_', testMode: true } }],
    ];
    const id = await remote(), before = await snapshot();
    for (const [label, delta] of cases) {
      const p = { ...provider() }, verify = vi.spyOn(p, 'verifyNotification');
      const w = wire({ ...qaConfig(), ...delta }, p);
      const response = await w.notify(yk.notification(id));
      expect(response.status, label).toBe(503); expect(response.headers.get('cache-control'), label).toBe('no-store');
      expect(verify, label).not.toHaveBeenCalled(); expect(w.select, label).not.toHaveBeenCalled(); expectNoConsumers(w);
    }
    for (const p of [null, { ...provider(), name: 'fake' } as PaymentProvider]) {
      const w = wire(qaConfig(), p);
      expect((await w.notify(yk.notification(id))).status).toBe(503); expect(w.select).not.toHaveBeenCalled(); expectNoConsumers(w);
    }
    expect(await snapshot()).toEqual(before);
  });

  it('QA route uses the scoped adapter while canonical webhook remains unchanged', async () => {
    vi.resetModules();
    const w = wire(), config = qaConfig(), id = await remote(), before = await snapshot();
    const getRuntime = vi.fn(() => ({ pool, config }));
    vi.doMock('../apps/web/src/server/runtime', () => ({ getRuntime }));
    vi.doMock('../apps/web/src/server/billing-runtime', () => ({ getBillingDependencies: () => w.deps }));
    try {
      const qa = await import('../apps/web/src/app/api/webhooks/yookassa-test/route');
      const canonical = await import('../apps/web/src/app/api/webhooks/yookassa/route');
      expect(qa.runtime).toBe('nodejs'); expect(qa.dynamic).toBe('force-dynamic');
      expect((await qa.POST(request(yk.notification(id)))).status).toBe(503);
      expect(await snapshot()).toEqual(before); expectNoConsumers(w);
      const original = await canonical.POST(request(yk.notification(id)));
      expect(original.status).toBe(200); expect(await original.json()).toMatchObject({ data: { applied: false, reason: 'unknown_intent' } });
      expect(await snapshot()).not.toEqual(before);
      getRuntime.mockImplementation(() => { throw new Error('private startup detail'); });
      const failed = await qa.POST(request('{}'));
      expect(failed.status).toBe(503); expect(failed.headers.get('cache-control')).toBe('no-store');
      expect(await failed.text()).not.toContain('private startup detail');
    } finally {
      vi.doUnmock('../apps/web/src/server/runtime'); vi.doUnmock('../apps/web/src/server/billing-runtime'); vi.resetModules();
    }
  });
});
