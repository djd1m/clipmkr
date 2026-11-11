import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { createPaymentIntent, type CheckoutIntentRow } from '../packages/db/src/payments';
import { createBillingDependencies } from '../apps/web/src/server/billing-deps';
import { createCheckoutHandler, createCheckoutStatusHandler, createPaymentWebhookHandler, type BillingDependencies } from '../apps/web/src/server/billing-handler';
import { createYooKassaProvider } from '../apps/web/src/server/payments/yookassa';
import { getBillingDependencies } from '../apps/web/src/server/billing-runtime';
import { getRuntime } from '../apps/web/src/server/runtime';
import * as rateLimit from '../apps/web/src/server/rate-limit';
import { GET as health } from '../apps/web/src/app/health/route';
import { readEnvironment } from '../apps/web/src/server/environment';
import { loadWebConfig } from '../packages/shared/src/config';
import { paymentDescription, type ReceiptConfig, type ReceiptSnapshot } from '../packages/shared/src/tariff';
import { eraseAccount } from '../apps/web/src/server/retention';
import { environment } from './fixtures/environment';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from './fixtures/fake-yookassa-server';
const databaseUrl = process.env.DATABASE_URL;
const PUBLIC = 'https://test.invalid', T = 23 * 3600_000;
const fiscal: ReceiptConfig = { vatCode: 1, paymentSubject: 'service', paymentMode: 'full_payment' };
const fiscalEnv = { YOOKASSA_RECEIPT_VAT_CODE: '1', YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'service', YOOKASSA_RECEIPT_PAYMENT_MODE: 'full_payment' };
const sample: ReceiptSnapshot = { ...fiscal, email: 'synthetic-snapshot@test.invalid', description: paymentDescription('legacy_pro990_v1') };
type Captured = { method: string; path: string; body: Record<string, unknown> | null; key: string | undefined };
describe.skipIf(!databaseUrl)('YooKassa receipts on PostgreSQL and sockets', () => {
  let pool: Pool, yk: FakeYooKassa, apiBase: string, server: ReturnType<typeof createServer>;
  const schema = `receipt_${randomBytes(8).toString('hex')}`, sessions = new Map<string, string>();
  const received: Captured[] = [], logs: string[] = [], observerFailures: unknown[] = [];
  let drop = false, faultBody: string | null = null;
  beforeAll(async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('isolated *_test database required');
    await ensureTestDatabase(databaseUrl); pool = createPool(databaseUrl, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
    yk = await startFakeYooKassa();
    // Reuse the maintained provider simulator; this socket only observes, drops or faults responses.
    server = createServer((req, res) => { void (async () => {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const raw = Buffer.concat(chunks).toString(), body = raw ? JSON.parse(raw) as Record<string, unknown> : null;
      received.push({ method: req.method!, path: req.url!, body, key: req.headers['idempotence-key'] as string | undefined });
      if (req.method === 'POST') {
        const orderId = (body?.metadata as { order_id: string }).order_id;
        const saved = (await pool.query('SELECT receipt_snapshot FROM payment_intent WHERE id=$1', [orderId])).rows[0];
        if (!saved) observerFailures.push('POST before committed intent');
        if (body?.receipt && !saved?.receipt_snapshot) observerFailures.push('POST before committed receipt');
      }
      if (faultBody !== null) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(faultBody); return; }
      const response = await fetch(`${yk.apiBase}${req.url}`, { method: req.method!, headers: { authorization: req.headers.authorization ?? '', 'content-type': 'application/json', ...(req.headers['idempotence-key'] ? { 'idempotence-key': String(req.headers['idempotence-key']) } : {}) }, ...(raw ? { body: raw } : {}) });
      const text = await response.text();
      if (drop && req.method === 'POST') { drop = false; res.destroy(); return; }
      res.writeHead(response.status, { 'content-type': 'application/json' }); res.end(text);
    })().catch(error => { observerFailures.push(error); res.writeHead(500); res.end(); }); });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    apiBase = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  }, 60_000);
  afterAll(async () => {
    if (server) await new Promise<void>(resolve => server.close(() => resolve())); await yk?.close();
    if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
    expect(observerFailures).toEqual([]);
  });
  const provider = () => createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: true, apiBase });
  const countPosts = () => received.filter(x => x.method === 'POST').length;
  async function account(credits = false) {
    const email = `buyer-${randomUUID()}@test.invalid`;
    const id = (await pool.query("INSERT INTO account(email,password_hash,billing_policy) VALUES($1,'x',$2) RETURNING id", [email, credits ? 'credits_v1' : 'legacy_daily_v1'])).rows[0].id as string;
    const token = randomBytes(32).toString('base64url'); sessions.set(token, id); return { id, token, email };
  }
  function wire(receiptConfig: ReceiptConfig | null | undefined = fiscal) {
    return createBillingDependencies({ pool, billingMode: 'credits_v1', receiptConfig, checkoutAllowed: () => true, publicOrigin: PUBLIC, trustedProxyHops: 2,
      provider: provider(), authenticate: async token => sessions.has(token) ? { account_id: sessions.get(token)! } : null,
      allowMutation: async () => true, allowRead: async () => true, log: line => logs.push(line) });
  }
  const headers = (token: string) => ({ origin: PUBLIC, cookie: `__Host-n5_session=${token}`, 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.7,10.0.0.2,10.0.0.3' });
  const checkout = (a: { token: string }, key: string, deps = wire(), extra = {}) => createCheckoutHandler(deps)(new Request(`${PUBLIC}/api/checkout`, { method: 'POST', headers: headers(a.token), body: JSON.stringify({ idempotency_key: key, ...extra }) }));
  const status = (a: { token: string }, id: string, deps = wire()) => createCheckoutStatusHandler(deps)(new Request(`${PUBLIC}/api/checkout/${id}`, { headers: headers(a.token) }), id);
  const notify = (id: string, deps = wire()) => createPaymentWebhookHandler(deps)(new Request(`${PUBLIC}/api/webhooks/yookassa`, { method: 'POST', headers: { 'x-forwarded-for': '185.71.76.10,10.0.0.2,10.0.0.3' }, body: yk.notification(id) }));
  async function intent(a: { id: string }, key = randomUUID(), receiptConfig: ReceiptConfig | undefined = fiscal) {
    const result = await createPaymentIntent(pool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: key, receiptConfig });
    if (result.kind !== 'created' && result.kind !== 'existing') throw new Error('expected intent'); return result.intent;
  }
  async function waitForBlocker(pid: number) {
    for (let i = 0; i < 200; i++) {
      const rows = (await pool.query("SELECT pid,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock'")).rows;
      if (rows.some(row => (row.blockers as number[]).includes(pid))) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('no observed PostgreSQL lock waiter');
  }
  it('retry reuses receipt snapshot after email and VAT change', async () => {
    const configured = (vat: string) => {
      const previous = process.env;
      try {
        process.env = { ...environment(), DATABASE_URL: databaseUrl!, N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true', ...fiscalEnv, YOOKASSA_RECEIPT_VAT_CODE: vat };
        const config = loadWebConfig(readEnvironment());
        if (config.payments.mode !== 'live') throw new Error('live config required'); return wire(config.payments.receipt);
      } finally { process.env = previous; }
    };
    const a = await account(), key = randomUUID(), before = received.length; drop = true;
    expect((await checkout(a, key, configured('1'))).status).toBe(503);
    const saved = (await pool.query('SELECT * FROM payment_intent WHERE account_id=$1', [a.id])).rows;
    expect(saved).toHaveLength(1); expect(saved[0].provider_payment_id).toBeNull(); expect(saved[0].receipt_snapshot.email).toBe(a.email);
    const newEmail = `changed-${randomUUID()}@test.invalid`; await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, newEmail]);
    const fresh = configured('12');
    const retry = await checkout(a, key, fresh); expect(retry.status).toBe(201);
    expect(received[before + 1]).toEqual(received[before]);
    expect((await pool.query('SELECT count(*)::int AS n FROM payment_intent WHERE account_id=$1', [a.id])).rows[0].n).toBe(1);
    expect((await checkout(a, randomUUID(), configured('12'))).status).toBe(201);
    expect(received.at(-1)!.body?.receipt).toMatchObject({ customer: { email: newEmail }, items: [{ vat_code: 12 }] });
    const posts = countPosts(), reads = yk.readCalls;
    expect((await checkout(a, key, wire(null))).status).toBe(201); expect(countPosts()).toBe(posts); expect(yk.readCalls).toBe(reads + 1);
  });
  it('retry keeps canonical receipt despite unusable current account fields', async () => {
    for (const current of [null, undefined, { ...fiscal, vatCode: 12 }]) {
      const a = await account(), key = randomUUID(), saved = await intent(a, key), deps = wire(current);
      if (current === undefined) delete deps.receiptConfig;
      await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, `${a.id}${'x'.repeat(300)}`]);
      const response = await checkout(a, key, deps); expect(response.status).toBe(201);
      expect(received.at(-1)!.body?.receipt).toMatchObject({ customer: { email: a.email }, items: [{ vat_code: 1 }] });
      expect((await pool.query('SELECT receipt_snapshot FROM payment_intent WHERE id=$1', [saved.id])).rows[0].receipt_snapshot).toEqual(saved.receipt_snapshot);
    }
  });
  it('concurrent retries commit one canonical receipt snapshot', async () => {
    const a = await account(), key = randomUUID(), holder = await pool.connect();
    let entered!: () => void, release!: () => void;
    const inserted = new Promise<void>(resolve => { entered = resolve; }), gate = new Promise<void>(resolve => { release = resolve; });
    const query = holder.query.bind(holder);
    // The real first INSERT has completed; hold its transaction before COMMIT.
    holder.query = (async (...args: unknown[]) => {
      const result = await (query as (...a: unknown[]) => Promise<unknown>)(...args);
      if (typeof args[0] === 'string' && args[0].startsWith('INSERT INTO payment_intent')) { entered(); await gate; holder.query = query; }
      return result;
    }) as typeof holder.query;
    const firstPool = { connect: async () => holder } as unknown as Pool;
    try {
      const pid = (await query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
      const first = createPaymentIntent(firstPool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: key, receiptConfig: fiscal });
      await inserted;
      const second = createPaymentIntent(pool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: key, receiptConfig: { ...fiscal, vatCode: 12 } });
      await waitForBlocker(pid); release();
      const [one, two] = await Promise.all([first, second]);
      expect(one.kind).toBe('created'); expect(two.kind).toBe('existing');
      if (!('intent' in one) || !('intent' in two)) throw new Error('expected canonical rows');
      expect(two.intent).toEqual(one.intent); expect(one.intent.receipt_snapshot).toMatchObject({ vatCode: 1, email: a.email });
    } finally { release(); }
  });
  it('receipt snapshot database constraints reject malformed values', async () => {
    const a = await account();
    const insert = (value: unknown) => pool.query('INSERT INTO payment_intent(account_id,price_minor,idempotency_key,receipt_snapshot) VALUES($1,99000,$2,$3::jsonb) RETURNING receipt_snapshot', [a.id, randomUUID(), JSON.stringify(value)]);
    expect((await insert(sample)).rows[0].receipt_snapshot).toEqual(sample);
    const bad: unknown[] = [null, [], 'text', 1, { ...sample, extra: true }];
    for (const k of Object.keys(sample)) { const missing = { ...sample } as Record<string, unknown>; delete missing[k]; bad.push(missing, { ...sample, [k]: null }); }
    for (const [k, values] of Object.entries({ email: ['', 1, true, 'x'.repeat(255)], description: ['', 1, [], 'x'.repeat(129)], vatCode: ['1', 0, 13, 1.5, true], paymentSubject: ['goods', 1], paymentMode: ['full_prepayment', 'other', 1] })) {
      for (const value of values) bad.push({ ...sample, [k]: value });
    }
    // A 128-character multibyte description alone stays below 2KiB and is valid.
    expect((await insert({ ...sample, description: '😀'.repeat(128) })).rowCount).toBe(1);
    bad.push({ ...sample, email: '\u0001'.repeat(254), description: '\u0001'.repeat(128) });
    for (const value of bad) await expect(insert(value)).rejects.toMatchObject({ code: '23514', constraint: 'payment_intent_receipt_snapshot_check' });
    const legacy = await pool.query('INSERT INTO payment_intent(account_id,price_minor,idempotency_key) VALUES($1,99000,$2) RETURNING receipt_snapshot', [a.id, randomUUID()]);
    expect(legacy.rows[0].receipt_snapshot).toBeNull();
  });
  it('receipt snapshot immutable trigger preserves allowed updates', async () => {
    const a = await account(), saved = await intent(a);
    const result = await createPaymentIntent(pool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: randomUUID() });
    if (!('intent' in result)) throw new Error('expected legacy'); const legacy = result.intent;
    for (const value of [{ ...sample, email: 'changed@test.invalid' }, null]) await expect(pool.query('UPDATE payment_intent SET receipt_snapshot=$2 WHERE id=$1', [saved.id, value])).rejects.toThrow('immutable payment offer');
    await expect(pool.query('UPDATE payment_intent SET receipt_snapshot=$2 WHERE id=$1', [legacy.id, sample])).rejects.toThrow('immutable payment offer');
    await pool.query("UPDATE payment_intent SET status='canceled',provider_payment_id=$2 WHERE id=$1", [saved.id, randomUUID()]);
    expect((await pool.query('SELECT receipt_snapshot,status FROM payment_intent WHERE id=$1', [saved.id])).rows[0]).toEqual({ receipt_snapshot: saved.receipt_snapshot, status: 'canceled' });
  });
  it('receipt snapshot is erased with an erasing account', async () => {
    const a = await account(), saved = await intent(a), paymentId = randomUUID();
    expect(saved.receipt_snapshot?.email).toBe(a.email);
    await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,fee_minor,paid_at) VALUES($1,$2,'yookassa',$3,99000,0,now())", [saved.id, a.id, paymentId]);
    await pool.query("UPDATE account SET status='erasing' WHERE id=$1", [a.id]);
    const erased: string[] = [];
    await eraseAccount(pool, { erasePrefix: async prefix => { erased.push(prefix); }, delete: async () => {}, eraseClipPrefix: async () => {} }, a.id, new Date());
    expect(erased).toContain(`videos/${a.id}/`);
    expect((await pool.query('SELECT * FROM payment_intent WHERE id=$1', [saved.id])).rowCount).toBe(0);
    expect((await pool.query('SELECT account_id,intent_id FROM payment WHERE provider_payment_id=$1', [paymentId])).rows).toEqual([{ account_id: null, intent_id: null }]);
  });
  it('unbound legacy intent is not retrofitted with receipt', async () => {
    const a = await account(), key = randomUUID(); await createPaymentIntent(pool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: key }); const before = countPosts();
    const response = await checkout(a, key); expect(response.status).toBe(409); expect((await response.json()).error.code).toBe('receipt_snapshot_missing'); expect(countPosts()).toBe(before);
  });
  it('bound intent retry uses GET without a new receipt', async () => {
    const a = await account(), key = randomUUID(), absent = wire(); delete absent.receiptConfig;
    expect((await checkout(a, key, absent)).status).toBe(201);
    const saved = (await pool.query('SELECT * FROM payment_intent WHERE account_id=$1', [a.id])).rows[0];
    expect(saved.receipt_snapshot).toBeNull();
    const deps = wire(null); deps.clock = () => new Date(saved.created_at.getTime() + 48 * 3600_000);
    const posts = countPosts(), reads = yk.readCalls; expect((await checkout(a, key, deps)).status).toBe(201); expect(countPosts()).toBe(posts); expect(yk.readCalls).toBe(reads + 1);
  });
  it('expired unbound intent requires reconciliation before invalid receipt config', async () => {
    for (const receiptEnv of [{ ...fiscalEnv, YOOKASSA_RECEIPT_PAYMENT_MODE: '' }, { ...fiscalEnv, YOOKASSA_RECEIPT_VAT_CODE: '13' }]) {
      const config = loadWebConfig({ ...environment(), DATABASE_URL: databaseUrl!, N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID,
        YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true', ...receiptEnv });
      if (config.payments.mode !== 'live') throw new Error('live config required');
      expect(config.payments.receipt).toBeNull();
      for (const time of ['expired', 'later', 'future', 'clock-invalid', 'missing', 'timestamp-invalid'] as const) {
        const a = await account(), key = randomUUID(), deps = wire(config.payments.receipt);
        const result = await createPaymentIntent(pool, { identity: {provider:'yookassa',environment:'test',merchantId:'123456'}, accountId: a.id, priceMinor: 99000, idempotencyKey: key });
        if (!('intent' in result)) throw new Error('expected legacy intent'); const saved = result.intent;
        expect(saved.receipt_snapshot).toBeNull();
        deps.clock = () => new Date(saved.created_at.getTime() + (time === 'expired' ? T : time === 'later' ? 24 * 3600_000 : time === 'future' ? -1 : time === 'clock-invalid' ? NaN : 0));
        if (time === 'missing' || time === 'timestamp-invalid') {
          const create = deps.createIntent;
          deps.createIntent = async input => {
            const persisted = await create(input); if (!('intent' in persisted)) throw new Error('expected canonical intent');
            return { ...persisted, intent: { ...persisted.intent, created_at: time === 'missing' ? undefined : new Date(NaN) } as CheckoutIntentRow };
          };
        }
        const posts = countPosts(), response = await checkout(a, key, deps);
        expect(response.status).toBe(409); expect((await response.json()).error.code).toBe('payment_reconciliation_required'); expect(countPosts()).toBe(posts);
      }
      const young = await account(), posts = countPosts(), response = await checkout(young, randomUUID(), wire(config.payments.receipt));
      expect(response.status).toBe(503); expect((await response.json()).error.code).toBe('receipt_configuration_unavailable'); expect(countPosts()).toBe(posts);
      const bound = await account(), key = randomUUID(), absent = wire(); delete absent.receiptConfig;
      expect((await checkout(bound, key, absent)).status).toBe(201);
      const saved = (await pool.query('SELECT created_at,receipt_snapshot FROM payment_intent WHERE account_id=$1', [bound.id])).rows[0];
      expect(saved.receipt_snapshot).toBeNull(); const deps = wire(config.payments.receipt); deps.clock = () => new Date(saved.created_at.getTime() + 48 * 3600_000);
      const beforeBound = countPosts(), reads = yk.readCalls;
      expect((await checkout(bound, key, deps)).status).toBe(201); expect(countPosts()).toBe(beforeBound); expect(yk.readCalls).toBe(reads + 1);
    }
  });
  it('unbound intent enforces conservative 23 hour retry cutoff', async () => {
    for (const age of [T - 1, T, T + 1, 24 * 3600_000, 49 * 3600_000, -1, NaN]) {
      const a = await account(), key = randomUUID(), saved = await intent(a, key), deps = wire(); deps.clock = () => new Date(saved.created_at.getTime() + age);
      const posts = countPosts(), result = await checkout(a, key, deps);
      expect(result.status).toBe(age === T - 1 ? 201 : 409); expect(countPosts() - posts).toBe(age === T - 1 ? 1 : 0);
    }
    for (const stamp of [undefined, new Date(NaN)]) {
      const a = await account(), key = randomUUID(), saved = await intent(a, key), deps = wire(), real = deps.createIntent;
      deps.createIntent = async input => { await real(input); return { kind: 'existing', intent: { ...saved, created_at: stamp } as CheckoutIntentRow }; };
      const posts = countPosts(); expect((await checkout(a, key, deps)).status).toBe(409); expect(countPosts()).toBe(posts);
    }
  });
  it('retry budget is checked after asynchronous intent work', async () => {
    for (const cross of [false, true]) {
      const a = await account(), key = randomUUID(), saved = await intent(a, key), deps = wire(), holder = await pool.connect();
      let now = saved.created_at.getTime() + T - 1; deps.clock = () => new Date(now);
      try {
        await holder.query('BEGIN'); await holder.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [a.id]);
        const pid = (await holder.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number, posts = countPosts();
        const pending = checkout(a, key, deps); await waitForBlocker(pid); if (cross) now++;
        await holder.query('COMMIT'); expect((await pending).status).toBe(cross ? 409 : 201); expect(countPosts() - posts).toBe(cross ? 0 : 1);
      } finally { await holder.query('ROLLBACK'); holder.release(); }
    }
  });
  it('receipt email belongs to authenticated account', async () => {
    const a = await account(), other = await account(); expect((await checkout(a, randomUUID())).status).toBe(201);
    expect(received.at(-1)!.body?.receipt).toMatchObject({ customer: { email: a.email } }); expect(JSON.stringify(received.at(-1))).not.toContain(other.email);
  });
  it('checkout rejects client receipt and PII before intent creation', async () => {
    const a = await account(), before = countPosts();
    for (const extra of [{ email: sample.email }, { receipt: sample }, { amount: 1 }, { price: 1 }, { title: 'forged' }, { vat_code: 1 }, { payment_subject: 'service' }, { payment_mode: 'full_payment' }]) {
      expect((await checkout(a, randomUUID(), wire(), extra)).status).toBe(422);
    }
    expect((await pool.query('SELECT * FROM payment_intent WHERE account_id=$1', [a.id])).rowCount).toBe(0); expect(countPosts()).toBe(before);
    expect((await checkout(a, randomUUID())).status).toBe(201); expect(countPosts()).toBe(before + 1);
  });
  it('checkout status excludes receipt snapshot', async () => {
    const a = await account(), saved = await intent(a); expect(saved.receipt_snapshot?.email).toBe(a.email);
    const response = await status(a, saved.id); expect(response.status).toBe(200); const text = await response.text();
    for (const marker of [a.email, 'receipt_snapshot', 'vatCode', saved.receipt_snapshot!.description]) expect(text).not.toContain(marker);
  });
  it('receipt checkout preserves package grant and referral idempotency', async () => {
    const owner = await account();
    const code = (await pool.query("WITH p AS (INSERT INTO partner(account_id,display_name) VALUES($1,'synthetic') RETURNING id) INSERT INTO partner_code(partner_id,code,status) SELECT id,$2,'active' FROM p RETURNING id", [owner.id, randomBytes(6).toString('hex')])).rows[0].id;
    for (const sku of ['start_v1', 'pro_v1', 'addon_v1', undefined] as const) {
      const a = await account(!!sku);
      // Addon needs a confirmed base entitlement, per existing billing policy.
      if (sku === 'addon_v1') {
        const base = await checkout(a, randomUUID(), wire(), { sku: 'start_v1' }); expect(base.status).toBe(201);
        const id = (await base.json()).data.intent_id, payment = yk.byOrder(id)!; yk.pay(payment.id); expect((await notify(payment.id)).status).toBe(200);
      }
      await pool.query("INSERT INTO attribution(account_id,partner_code_id,source,status) VALUES($1,$2,'cookie','pending')", [a.id, code]);
      const response = await checkout(a, randomUUID(), wire(), sku ? { sku } : {}); expect(response.status).toBe(201);
      const id = (await response.json()).data.intent_id, payment = yk.byOrder(id)!; yk.pay(payment.id);
      expect((await (await notify(payment.id)).json()).data.applied).toBe(true);
      expect((await (await notify(payment.id)).json()).data).toMatchObject({ applied: false, reason: 'duplicate' });
      expect((await pool.query('SELECT referral_partner_code_id,receipt_snapshot,status FROM payment_intent WHERE id=$1', [id])).rows[0]).toMatchObject({ referral_partner_code_id: code, status: 'succeeded', receipt_snapshot: { email: a.email } });
      if (sku) expect((await pool.query("SELECT count(*)::int AS n FROM credit_grant WHERE source_key=$1", [`intent:${id}`])).rows[0].n).toBe(1);
      const refund = yk.refund(payment.id), deps = wire();
      const req = () => new Request(`${PUBLIC}/api/webhooks/yookassa`, { method: 'POST', headers: { 'x-forwarded-for': '185.71.76.10,10.0.0.2,10.0.0.3' }, body: yk.refundNotification(refund) });
      expect((await createPaymentWebhookHandler(deps)(req())).status).toBe(200); expect((await createPaymentWebhookHandler(deps)(req())).status).toBe(200);
      expect((await pool.query('SELECT status FROM payment WHERE provider_payment_id=$1', [payment.id])).rows[0].status).toBe('refunded');
    }
  });
  it('receipt config reaches checkout through readEnvironment and billing wiring', async () => {
    const original = process.env;
    const globalState = globalThis as typeof globalThis & { n5Runtime?: ReturnType<typeof getRuntime>; n5Billing?: BillingDependencies };
    const oldRuntime = globalState.n5Runtime, oldBilling = globalState.n5Billing;
    const mutations = vi.spyOn(rateLimit, 'allowMutation').mockResolvedValue(true), reads = vi.spyOn(rateLimit, 'allowRead').mockResolvedValue(true);
    const matrix: Array<Record<string, string>> = [{}, Object.fromEntries(Object.keys(fiscalEnv).map(k => [k, ''])), fiscalEnv];
    for (let mask = 1; mask < 7; mask++) matrix.push(Object.fromEntries(Object.entries(fiscalEnv).filter((_, i) => mask & (1 << i))));
    for (const field of Object.keys(fiscalEnv)) matrix.push({ ...fiscalEnv, [field]: ' ' });
    for (const value of ['0', '13', '1.5', '01']) matrix.push({ ...fiscalEnv, YOOKASSA_RECEIPT_VAT_CODE: value });
    matrix.push({ ...fiscalEnv, YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'goods' }, { ...fiscalEnv, YOOKASSA_RECEIPT_PAYMENT_MODE: 'full_prepayment' }, { ...fiscalEnv, YOOKASSA_RECEIPT_PAYMENT_MODE: 'unknown' });
    try {
      for (let i = 0; i < matrix.length; i++) {
        process.env = { ...environment(), DATABASE_URL: databaseUrl!, N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true', ...matrix[i] };
        delete globalState.n5Runtime; delete globalState.n5Billing;
        const config = loadWebConfig(readEnvironment()); expect(config.payments.mode).toBe('live');
        const runtime = getRuntime(), createdPool = runtime.pool;
        // Explicit transport/auth/rate/schema seams; runtime config and billing-runtime remain real.
        runtime.pool = pool; runtime.payments = provider(); runtime.auth.authenticate = async token => sessions.has(token) ? { account_id: sessions.get(token)! } as Awaited<ReturnType<typeof runtime.auth.authenticate>> : null;
        const deps = getBillingDependencies(), a = await account(), posts = countPosts();
        expect((await health()).status).toBe(200);
        const response = await checkout(a, randomUUID(), deps);
        const valid = i <= 2; expect(response.status).toBe(valid ? 201 : 503); expect(countPosts() - posts).toBe(valid ? 1 : 0);
        if (i < 2) expect(received.at(-1)!.body).not.toHaveProperty('receipt');
        if (i === 2) expect(received.at(-1)!.body?.receipt).toMatchObject({ customer: { email: a.email }, items: [{ vat_code: 1 }] });
        // Both unbound status and verified ignored webhook stay available for every config class.
        const saved = (await pool.query('SELECT id FROM payment_intent WHERE account_id=$1', [a.id])).rows[0];
        expect((await status(a, saved.id, deps)).status).toBe(200);
        const ignored = await createPaymentWebhookHandler(deps)(new Request(`${PUBLIC}/api/webhooks/yookassa`, { method: 'POST', headers: { 'x-forwarded-for': '185.71.76.10,10.0.0.2,10.0.0.3' }, body: JSON.stringify({ event: 'payment.waiting_for_capture' }) })); expect(ignored.status).toBe(200);
        const boundKey = randomUUID(); expect((await checkout(a, boundKey, wire())).status).toBe(201);
        const bound = yk.byOrder((await pool.query('SELECT id FROM payment_intent WHERE account_id=$1 AND idempotency_key=$2', [a.id, boundKey])).rows[0].id)!;
        const beforeBound = countPosts(); expect((await checkout(a, boundKey, deps)).status).toBe(201); expect(countPosts()).toBe(beforeBound);
        yk.pay(bound.id); expect((await notify(bound.id, deps)).status).toBe(200);
        await createdPool.end(); runtime.redis.disconnect();
      }
    } finally {
      process.env = original; globalState.n5Runtime = oldRuntime; globalState.n5Billing = oldBilling; mutations.mockRestore(); reads.mockRestore();
    }
  });
  it('invalid receipt config leaves webhook and status readable', async () => {
    const a = await account(), key = randomUUID(); const response = await checkout(a, key); expect(response.status).toBe(201);
    const id = (await response.json()).data.intent_id, payment = yk.byOrder(id)!; yk.pay(payment.id);
    const deps = wire(null); expect((await status(a, id, deps)).status).toBe(200); expect((await notify(payment.id, deps)).status).toBe(200);
    expect((await (await status(a, id, deps)).json()).data.status).toBe('succeeded');
  });
  it('receipt failures never expose buyer email or provider secrets', async () => {
    const a = await account(), secret = `synthetic-provider-secret-${randomUUID()}`, marker = `raw-${a.email}-${secret}`, before = countPosts();
    faultBody = JSON.stringify({ description: marker, authorization: secret });
    try {
      const response = await checkout(a, randomUUID()); expect(response.status).toBe(503); expect(countPosts()).toBe(before + 1);
      const text = await response.text(); for (const value of [marker, a.email, secret]) expect(text).not.toContain(value);
    } finally { faultBody = null; }
    // A real CHECK failure includes the rejected row (and email) in PostgreSQL detail.
    const invalidEmail = `synthetic-db-${randomUUID()}@${'x'.repeat(260)}.invalid`; await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, invalidEmail]);
    const dbDeps = wire(), create = dbDeps.createIntent; let dbFailures = 0;
    dbDeps.createIntent = async input => { try { return await create(input); } catch (error) { expect(error).toMatchObject({ code: '23514', constraint: 'payment_intent_receipt_snapshot_check' }); dbFailures++; throw error; } };
    const beforeLogs = logs.length, posts = countPosts(), response = await checkout(a, randomUUID(), dbDeps); expect(dbFailures).toBe(1);
    expect(response.status).toBe(503); expect(logs.length).toBe(beforeLogs + 1); expect(countPosts()).toBe(posts);
    for (const value of [marker, a.email, secret, invalidEmail]) { expect(await response.clone().text()).not.toContain(value); expect(logs.join()).not.toContain(value); }
    // DB accepts short text, adapter rejects its email syntax before HTTP.
    const invalidSyntax = `invalid-email-${randomUUID()}`;
    await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, invalidSyntax]);
    const validateDeps = wire(), send = validateDeps.provider!.createPayment; let validationFailures = 0;
    validateDeps.provider = { ...validateDeps.provider!, createPayment: async input => { try { return await send(input); } catch (error) { expect(error).toMatchObject({ message: 'receipt.email_invalid' }); validationFailures++; throw error; } } };
    const validation = await checkout(a, randomUUID(), validateDeps); expect(validationFailures).toBe(1);
    expect(await validation.clone().text()).not.toContain(invalidSyntax); expect(logs.join()).not.toContain(invalidSyntax); expect(validation.status).toBe(503); expect(countPosts()).toBe(posts);
    expect(logs.at(-1)).toBe('Оплата: провайдер отклонил создание платежа');
    await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, a.email]);
    expect((await checkout(a, randomUUID())).status).toBe(201); expect(countPosts()).toBe(posts + 1);
  });
});
