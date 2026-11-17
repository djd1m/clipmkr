import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createPaymentIntent, createPool, readPaymentIntent, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { createBillingDependencies } from '../apps/web/src/server/billing-deps';
import { createPaymentWebhookHandler } from '../apps/web/src/server/billing-handler';
import { paymentReceiptsTick } from '../apps/web/src/server/payment-receipts';
import { createYooKassaProvider } from '../apps/web/src/server/payments/yookassa';
import { eraseAccount } from '../apps/web/src/server/retention';
import { SupportMailer, type RetentionNoticeMessage } from '../apps/web/src/server/support/mail';
import { SHOP_ID, SECRET, startFakeYooKassa, type FakeYooKassa } from './fixtures/fake-yookassa-server';

const database = process.env.DATABASE_URL;
const origin = 'https://clipmkr.test';
const second = 1000;
const hour = 3600 * second;
const accepted = { state: 'accepted', receipt: 'synthetic-accepted' } as const;
const unknown = { state: 'unknown', receipt: null } as const;
const failed = { state: 'failed', receipt: null } as const;
const noStorage = { delete: async () => {}, erasePrefix: async () => {}, eraseClipPrefix: async () => {} };
type Outcome = typeof accepted | typeof unknown | typeof failed;

describe.skipIf(!database)('verified purchase receipts on PostgreSQL', () => {
  const schema = 'payment_receipt_' + randomUUID().replaceAll('-', '');
  let pool: Pool, live: FakeYooKassa, test: FakeYooKassa;
  beforeAll(async () => {
    if (!database || !new URL(database).pathname.endsWith('_test')) throw new Error('Isolated test database required');
    const url = new URL(database);
    url.searchParams.set('application_name', schema);
    pool = createPool(url.href, schema);
    await pool.query(`CREATE SCHEMA ${schema}`);
    await migrate(pool);
    live = await startFakeYooKassa({ test: false });
    test = await startFakeYooKassa();
  });
  beforeEach(async () => { await pool.query('DELETE FROM payment_receipt_delivery'); });
  afterAll(async () => {
    await live?.close(); await test?.close();
    if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
  });

  async function checkout(environment: 'live' | 'test' = 'live', legacy = false, domain = 'example.test') {
    const email = `synthetic-${randomUUID()}@${domain}`;
    const account = (await pool.query<{ id: string }>(`INSERT INTO account(email,password_hash,billing_policy,email_verified_at)
      VALUES($1,'synthetic',$2,now()) RETURNING id`, [email, legacy ? 'legacy_daily_v1' : 'credits_v1'])).rows[0]!.id;
    const sandbox = environment === 'test' ? test : live;
    const adapter = createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: environment === 'test', apiBase: sandbox.apiBase });
    const intent = await createPaymentIntent(pool, { accountId: account, idempotencyKey: randomUUID(), identity: adapter.identity,
      priceMinor: 99000, ...(legacy ? {} : { sku: 'start_v1', billingMode: 'credits_v1' }) });
    if (intent.kind !== 'created') throw new Error('Synthetic checkout intent was not created');
    const id = intent.intent.id;
    const remote = await adapter.createPayment({ orderId: id, amountMinor: 99000, returnUrl: origin + '/upgrade/return',
      description: 'Синтетическая покупка', ...(environment === 'live' ? { receipt: { email, description: 'Синтетическая покупка',
        vatCode: 1, paymentMode: 'full_payment', paymentSubject: 'service' } } : {}) });
    const webhook = createPaymentWebhookHandler(createBillingDependencies({ pool, provider: adapter, checkoutAllowed: () => true,
      publicOrigin: origin, trustedProxyHops: 1, authenticate: async () => null, allowMutation: async () => true,
      allowRead: async () => true, log: () => {} }));
    const notify = async (body: string) => webhook(new Request(origin + '/api/webhooks/yookassa', { method: 'POST',
      headers: { 'x-forwarded-for': '185.71.76.10,127.0.0.1' }, body }));
    return { id, email, account, remote: remote.id, pay: () => sandbox.pay(remote.id),
      settle: () => notify(sandbox.notification(remote.id)), refund: () => notify(sandbox.refundNotification(sandbox.refund(remote.id))) };
  }

  const row = async (id: string) => (await pool.query('SELECT * FROM payment_receipt_delivery WHERE intent_id=$1', [id])).rows[0];
  const ledger = async (id: string) => (await pool.query(`SELECT
    (SELECT count(*)::int FROM payment WHERE intent_id=$1) AS payments,
    (SELECT count(*)::int FROM credit_grant WHERE payment_ref=$1) AS grants,
    (SELECT count(*)::int FROM payment_receipt_delivery WHERE intent_id=$1) AS receipts`, [id])).rows[0];
  const mailer = () => ({ retentionSender: 'sender@example.test', isTestCapture: false,
    sendRetention: vi.fn<(body: RetentionNoticeMessage, key: string) => Promise<Outcome>>().mockResolvedValue(accepted) });
  const activeClock = () => {
    let wall = Date.now() + second;
    return { now: () => new Date(wall), advance: (ms: number) => { wall += ms; } };
  };

  it('two trusted outcomes overlap in PostgreSQL and produce one payment, grant and wire key', async () => {
    const buyer = await checkout(); buyer.pay();
    const held = await pool.connect();
    await held.query('BEGIN');
    const blocker = (await held.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
    await held.query('SELECT id FROM account WHERE id=$1 FOR UPDATE', [buyer.account]);
    const requests = [buyer.settle(), buyer.settle()];
    try {
      await expect.poll(async () => {
        const result = await pool.query<{ pid: number; blockers: number[] }>(`SELECT pid,pg_blocking_pids(pid) AS blockers
          FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock'`, [schema]);
        const primary = result.rows.find(row => row.blockers.includes(blocker));
        return !!primary && result.rows.some(row => row.pid !== primary.pid &&
          (row.blockers.includes(primary.pid) || row.blockers.includes(blocker)));
      }, { timeout: 4000 }).toBe(true);
    } finally { await held.query('ROLLBACK'); held.release(); }
    const responses = await Promise.all(requests);
    expect(responses.map(response => response.status)).toEqual([200, 200]);
    const results = await Promise.all(responses.map(response => response.json()));
    expect(results.map(result => result.data.applied).sort()).toEqual([false, true]);
    expect(await ledger(buyer.id)).toEqual({ payments: 1, grants: 1, receipts: 1 });
    expect(await row(buyer.id)).toMatchObject({ intent_id: buyer.id, status: 'pending', attempts: 0 });
    const transport = mailer(), clock = activeClock();
    await Promise.all([paymentReceiptsTick(pool, transport, origin, clock.now), paymentReceiptsTick(pool, transport, origin, clock.now)]);
    expect(transport.sendRetention).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: buyer.email }), `payment-receipt-${buyer.id}`);
    expect(await row(buyer.id)).toMatchObject({ intent_id: buyer.id, status: 'accepted', attempts: 1 });
    expect(await readPaymentIntent(pool, buyer.id, buyer.account)).toMatchObject({ receipt_status: 'accepted', receipt_email: buyer.email });
    expect(await readPaymentIntent(pool, buyer.id, randomUUID())).toBeNull();
  });

  it('outbox failure rolls back the payment and entitlement in credit and legacy branches', async () => {
    const buyers = [await checkout(), await checkout('live', true)];
    await pool.query(`CREATE FUNCTION reject_test_receipt() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'synthetic receipt insert failure'; END $$`);
    await pool.query('CREATE TRIGGER reject_test_receipt BEFORE INSERT ON payment_receipt_delivery FOR EACH ROW EXECUTE FUNCTION reject_test_receipt()');
    try {
      for (const buyer of buyers) {
        buyer.pay();
        expect((await buyer.settle()).status).toBe(503);
        expect(await ledger(buyer.id)).toEqual({ payments: 0, grants: 0, receipts: 0 });
        expect(await readPaymentIntent(pool, buyer.id, buyer.account)).toMatchObject({ status: 'created', account_plan: 'free', receipt_status: null });
      }
    } finally { await pool.query('DROP TRIGGER reject_test_receipt ON payment_receipt_delivery'); }
    for (const buyer of buyers) {
      expect((await buyer.settle()).status).toBe(200);
      expect(await readPaymentIntent(pool, buyer.id, buyer.account)).toMatchObject({ status: 'succeeded', receipt_status: 'pending' });
    }
  });

  it('unknown and failed responses retain the frozen wire parameters only inside the retry window', async () => {
    const [buyer, expired] = [await checkout(), await checkout()];
    for (const purchase of [buyer, expired]) { purchase.pay(); expect((await purchase.settle()).status).toBe(200); }
    const transport = mailer(), clock = activeClock();
    transport.sendRetention.mockResolvedValue(unknown);
    await paymentReceiptsTick(pool, transport, origin, clock.now);
    const original = transport.sendRetention.mock.calls.find(([, key]) => key === `payment-receipt-${buyer.id}`);
    expect(original).toBeDefined();
    expect(await row(buyer.id)).toMatchObject({ status: 'problem', attempts: 1 });
    await paymentReceiptsTick(pool, transport, origin, clock.now);
    expect(transport.sendRetention).toHaveBeenCalledTimes(2);
    await pool.query('UPDATE payment_receipt_delivery SET next_attempt_at=next_attempt_at+$2::int*interval \'1 second\' WHERE intent_id=$1', [expired.id, 23 * 3600]);
    clock.advance(61 * second);
    transport.retentionSender = 'changed@example.test';
    transport.sendRetention.mockResolvedValueOnce(failed).mockResolvedValue(accepted);
    await paymentReceiptsTick(pool, transport, 'https://changed.example.test', clock.now);
    clock.advance(61 * second);
    await paymentReceiptsTick(pool, transport, 'https://changed.example.test', clock.now);
    expect(transport.sendRetention.mock.calls.slice(2)).toEqual([original, original]);
    expect(await row(buyer.id)).toMatchObject({ status: 'accepted', attempts: 3, next_attempt_at: null });
    clock.advance(24 * hour);
    await paymentReceiptsTick(pool, transport, origin, clock.now);
    expect(transport.sendRetention).toHaveBeenCalledTimes(4);
    expect(await row(expired.id)).toMatchObject({ status: 'problem', attempts: 1, next_attempt_at: null });
  });

  it('a late result after a new lease completed cannot overwrite its accepted status', async () => {
    const buyer = await checkout(); buyer.pay(); expect((await buyer.settle()).status).toBe(200);
    const transport = mailer(), clock = activeClock();
    let resolveOld!: (outcome: Outcome) => void, entered!: () => void;
    const invoked = new Promise<void>(resolve => { entered = resolve; });
    transport.sendRetention.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; entered(); }));
    const original = paymentReceiptsTick(pool, transport, origin, clock.now);
    try {
      await invoked;
      clock.advance(31 * second);
      expect(await paymentReceiptsTick(pool, transport, origin, clock.now)).toMatchObject({ attempted: 1, accepted: 1 });
      expect(await row(buyer.id)).toMatchObject({ status: 'accepted', attempts: 2 });
    } finally { resolveOld?.(failed); }
    const late = await original;
    expect(await row(buyer.id)).toMatchObject({ status: 'accepted', attempts: 2, next_attempt_at: null });
    expect(late).toMatchObject({ attempted: 1, superseded: 1 });
    expect(transport.sendRetention.mock.calls).toHaveLength(2);
    expect(transport.sendRetention.mock.calls[1]).toEqual(transport.sendRetention.mock.calls[0]);
  });

  it('erasure removes snapshot and payload while a late result changes no row', async () => {
    const buyer = await checkout(); buyer.pay(); expect((await buyer.settle()).status).toBe(200);
    const transport = mailer(), clock = activeClock();
    let resolveOld!: (outcome: Outcome) => void, entered!: () => void;
    const invoked = new Promise<void>(resolve => { entered = resolve; });
    transport.sendRetention.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; entered(); }));
    const original = paymentReceiptsTick(pool, transport, origin, clock.now);
    try {
      await invoked;
      expect((await row(buyer.id)).payload).toMatchObject({ to: buyer.email });
      await pool.query("UPDATE account SET status='erasing' WHERE id=$1", [buyer.account]);
      await eraseAccount(pool, noStorage, buyer.account, clock.now());
    } finally { resolveOld?.(accepted); }
    expect(await original).toMatchObject({ attempted: 1, superseded: 1 });
    expect(await row(buyer.id)).toBeUndefined();
    expect(await readPaymentIntent(pool, buyer.id, buyer.account)).toBeNull();
    expect((await pool.query('SELECT account_id,intent_id FROM payment WHERE provider_payment_id=$1', [buyer.remote])).rows).toEqual([{ account_id: null, intent_id: null }]);
    await paymentReceiptsTick(pool, transport, origin, clock.now);
    expect(transport.sendRetention).toHaveBeenCalledTimes(1);
  });

  it('refund, changed verification, erasing account and unknown payment identity suppress mail before claim', async () => {
    const [refunded, moved, erased, unclear] = await Promise.all([checkout(), checkout(), checkout(), checkout()]);
    for (const buyer of [refunded, moved, erased]) { buyer.pay(); expect((await buyer.settle()).status).toBe(200); }
    expect((await refunded.refund()).status).toBe(200);
    await pool.query("UPDATE account SET email='changed@example.test' WHERE id=$1", [moved.account]);
    await pool.query("UPDATE account SET status='erasing' WHERE id=$1", [erased.account]);
    const unclassifiedPayment = (await pool.query(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at)
      VALUES($1,$2,'yookassa',$3,99000,now()) RETURNING id`, [unclear.id, unclear.account, unclear.remote])).rows[0].id;
    await pool.query("UPDATE payment_intent SET status='succeeded',fulfilled_at=now(),provider_payment_id=$2 WHERE id=$1", [unclear.id, unclear.remote]);
    await pool.query('INSERT INTO payment_receipt_delivery(intent_id,payment_id) VALUES($1,$2)', [unclear.id, unclassifiedPayment]);
    const transport = mailer(), clock = activeClock();
    for (let pass = 0; pass < 2; pass++) {
      expect(await paymentReceiptsTick(pool, transport, origin, clock.now)).toMatchObject({ attempted: 0, problem: 2 });
    }
    expect(transport.sendRetention).not.toHaveBeenCalled();
    expect(await readPaymentIntent(pool, moved.id, moved.account)).toMatchObject({ receipt_status: 'problem', receipt_email: null });
    for (const buyer of [refunded, moved, erased, unclear]) expect(await row(buyer.id)).toMatchObject({ status: 'problem', payload: null, attempts: 0 });
  });

  it('TEST uses only synthetic capture; LIVE retains the real destination on the isolated provider wire', async () => {
    const [blocked, capture, delivered] = [await checkout('test', false, 'ordinary.example'),
      await checkout('test', false, 'ordinary.example'), await checkout()];
    for (const buyer of [blocked, delivered]) { buyer.pay(); expect((await buyer.settle()).status).toBe(200); }
    const clock = activeClock();
    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ id: 'synthetic-provider-id' }));
    const resend = new SupportMailer({ mode: 'resend', apiKey: 'fixture', from: 'sender@example.test' }, undefined, undefined, request);
    expect(await paymentReceiptsTick(pool, resend, origin, clock.now)).toMatchObject({ attempted: 1, accepted: 1, problem: 1 });
    expect(request).toHaveBeenCalledTimes(1);
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe('https://api.resend.com/emails');
    expect(new Headers(init?.headers).get('idempotency-key')).toBe(`payment-receipt-${delivered.id}`);
    expect(JSON.parse(String(init?.body)).to).toEqual([delivered.email]);
    expect(await row(blocked.id)).toMatchObject({ status: 'problem', payload: null, attempts: 0 });
    capture.pay(); expect((await capture.settle()).status).toBe(200);
    const local = vi.fn(async (_body: RetentionNoticeMessage) => {});
    const captureMailer = new SupportMailer({ mode: 'test' }, undefined, undefined, request, local);
    expect(await paymentReceiptsTick(pool, captureMailer, origin, activeClock().now)).toMatchObject({ attempted: 1, accepted: 1 });
    expect(local).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: 'receipt@example.test' }));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('receipt delivery leaves shared mail slots for verification and password recovery', async () => {
    const buyers = await Promise.all([checkout(), checkout(), checkout(), checkout()]);
    for (const buyer of buyers) {
      buyer.pay();
      expect((await buyer.settle()).status).toBe(200);
      expect(await row(buyer.id)).toMatchObject({ status: 'pending', attempts: 0 });
    }
    let releaseReceipts!: () => void;
    const holdReceipts = new Promise<void>(resolve => { releaseReceipts = resolve; });
    const request = vi.fn<typeof fetch>().mockImplementation(async (_input, init) => {
      if (new Headers(init?.headers).has('idempotency-key')) await holdReceipts;
      return Response.json({ id: 'synthetic-provider-id' });
    });
    const config = { mode: 'resend', apiKey: 'fixture', from: 'sender@example.test' } as const;
    const receipts = new SupportMailer(config, undefined, undefined, request);
    const access = new SupportMailer(config, undefined, undefined, request);
    const query = vi.spyOn(pool, 'query');
    const tick = paymentReceiptsTick(pool, receipts, origin, activeClock().now);
    // Wait for every receipt selected by the real due query to reach the held transport.
    const batch = query.mock.results[0]?.value as unknown as Promise<{ rowCount: number }>;
    query.mockRestore();
    let counts: Awaited<typeof tick>;
    try {
      const { rowCount } = await batch;
      expect(rowCount).toBeGreaterThanOrEqual(2);
      await expect.poll(() => request.mock.calls.length, { timeout: 2000, interval: 20 }).toBe(rowCount);
      const accessOutcomes = await Promise.all([
        access.send({ purpose: 'verify', to: 'verify@example.test', url: origin + '/verify-email' }),
        access.send({ purpose: 'reset', to: 'reset@example.test', url: origin + '/reset' }),
      ]);
      expect(accessOutcomes).toEqual(['accepted', 'accepted']);
    } finally {
      releaseReceipts();
      counts = await tick;
    }
    expect(counts).toMatchObject({ attempted: 2, accepted: 2 });
    expect(request).toHaveBeenCalledTimes(4);
    const wire = request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)).subject);
    expect(wire.slice(2).sort()).toEqual(['Восстановление пароля КлипМейкер', 'Подтвердите почту КлипМейкер']);
  });
});
