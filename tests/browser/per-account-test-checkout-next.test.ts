// Настоящий собранный Next; только synthetic accounts, изолированная PG schema и TEST local provider.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, webkit } from 'playwright';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { environment } from '../fixtures/environment';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from '../fixtures/fake-yookassa-server';

const A = '00000000-0000-4000-8000-000000000001', B = '00000000-0000-4000-8000-000000000002';
const schema = `next_checkout_${randomBytes(8).toString('hex')}`;
const secret = randomBytes(32).toString('hex');
const evidence = resolve('/tmp', schema);
const privateValues = [A, B, SECRET, secret, `${A}@test.invalid`, `${B}@test.invalid`];
let pool: Pool, redis: Redis, provider: FakeYooKassa, child: ChildProcess | undefined, origin: string;
let tokens: Record<string, string>, childEnv: NodeJS.ProcessEnv;
let logs = '';
const xff = '198.51.100.7, 10.0.0.2, 10.0.0.3';
function assertPrivate(text: string) {
  for (const value of privateValues) for (const form of [value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1),
    value.replace(/-/g, '\\u002d'), [...value].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')]) {
    expect(text.includes(form), 'Private identity or credential serialized').toBe(false);
  }
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const current = child;
  const exited = once(current, 'exit');
  current.kill('SIGTERM');
  const timer = setTimeout(() => current.kill('SIGKILL'), 4000);
  try { await exited; } finally { clearTimeout(timer); child = undefined; }
}
async function start(accountId: string) {
  await stop();
  childEnv = { ...childEnv, N5_TEST_CHECKOUT_ACCOUNT_ID: accountId };
  execFileSync(process.execPath, ['.next/preflight/preflight.js'], { cwd: resolve('apps/web'), env: childEnv, timeout: 10000, stdio: 'pipe' });
  child = spawn(process.execPath, ['--import', resolve('tests/fixtures/payment-test-transport.mjs'),
    resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', new URL(origin).port],
  { cwd: resolve('apps/web'), env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => { logs += String(chunk); }); child.stderr!.on('data', chunk => { logs += String(chunk); });
  let spawnError = false; child.on('error', () => { spawnError = true; });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (spawnError || child.exitCode !== null) throw new Error('Next child failed; inspect private test evidence');
    try {
      const result = await fetch(origin + '/', { signal: AbortSignal.timeout(1500) });
      if (result.status === 200) return;
    } catch { /* bounded readiness only; timeout below fails the test */ }
    await delay(100);
  }
  throw new Error('Next child readiness timed out');
}
beforeAll(async () => {
  const database = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
  if (!database || !new URL(database).pathname.endsWith('_test') || !redisUrl) throw new Error('Existing isolated PG/Redis test profile required');
  mkdirSync(evidence, { mode: 0o700 });
  pool = createPool(database, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  const password = 'synthetic-next-checkout-password'; const hash = await bcrypt.hash(password, 10);
  for (const id of [A, B]) await pool.query("INSERT INTO account(id,email,password_hash,billing_policy) VALUES($1,$2,$3,'credits_v1')", [id, `${id}@test.invalid`, hash]);
  const auth = new AuthService(new PgAuthStore(pool, 'credits_v1'), secret);
  tokens = {};
  for (const id of [A, B]) { tokens[id] = (await auth.login(`${id}@test.invalid`, password, '198.51.100.0/24'))!; expect(await auth.authenticate(tokens[id]!)).toMatchObject({ account_id: id }); }
  redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
  await redis.ping();
  provider = await startFakeYooKassa();
  const socket = createServer(); await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as import('node:net').AddressInfo).port; await new Promise<void>(resolve => socket.close(() => resolve()));
  origin = `http://127.0.0.1:${port}`;
  const scopedDatabase = new URL(database); scopedDatabase.searchParams.set('options', `-c search_path=${schema},public`);
  childEnv = { ...environment(), PATH: process.env.PATH, NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: scopedDatabase.href, REDIS_URL: redisUrl, SESSION_SECRET: secret, N5_PUBLIC_ORIGIN: 'https://test.invalid',
    N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false', N5_TEST_CHECKOUT_ACCOUNT_ID: A,
    N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true',
    S3_ENDPOINT: 'http://127.0.0.1:9', S3_PUBLIC_ENDPOINT: 'https://storage.test.invalid', CLIPMKR_TEST_PAYMENT_ORIGIN: provider.apiBase };
  await start(A);
}, 60000);
afterAll(async () => {
  try { await stop(); } finally {
    writeFileSync(resolve(evidence, 'next.log'), logs, { mode: 0o600 });
    await provider?.close();
    if (redis) {
      // Rate keys имеют собственный random-secret namespace; чужие ключи/очереди не удаляем.
      const identities = [`account:${A}`, `account:${B}`, 'anonymous:198.51.100.0/24'];
      const keys = identities.flatMap(id => ['read', 'mutation'].map(kind => `n5:${kind}:rate:` + createHmac('sha256', secret).update(id).digest('hex')));
      await redis.del(...keys); await redis.quit();
    }
    if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  }
}, 15000);

describe('native Next per-account checkout', () => {
  it('native Next responses hide test exception identity across account changes', async () => {
    const keys: Record<string, string> = {};
    for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]] as const) {
      const browser = await browserType.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      const external: string[] = [];
      const flights: { url: string; body: string; contentType: string }[] = [];
      let activeToken: string | null = tokens[A]!;
      await page.route('**/*', async route => {
        if (new URL(route.request().url()).origin !== origin) { external.push('external'); await route.abort(); }
        else if (activeToken && (route.request().isNavigationRequest() || route.request().headers().rsc === '1' || new URL(route.request().url()).pathname.startsWith('/api/'))) {
          // Прозрачный capture: реальные Next bytes без изменения. HTTP test Cookie header
          // подаётся transport-ом: WebKit не принимает __Host-cookie в insecure cookie jar.
          const headers: Record<string, string> = { ...route.request().headers(), 'x-forwarded-for': xff };
          delete headers.cookie; if (activeToken) headers.cookie = `__Host-n5_session=${activeToken}`;
          const response = await route.fetch({ headers, timeout: 15000, maxRedirects: 0 });
          const bytes = await response.body();
          if (route.request().url().includes('/upgrade') && route.request().headers().rsc === '1' && route.request().headers()['next-router-prefetch'] !== '1') {
            flights.push({ url: route.request().url(), body: bytes.toString('utf8'), contentType: response.headers()['content-type'] ?? '' });
          }
          await route.fulfill({ response, body: bytes });
        } else await route.continue();
      });
      try {
        for (const [visit, id] of [A, B, A].entries()) {
          activeToken = tokens[id]!;
          const direct = await page.goto(origin + '/upgrade'); expect(direct?.status()).toBe(200);
          const html = await direct!.text(); writeFileSync(resolve(evidence, `${engine}-${visit}-${id === A ? 'A' : 'B'}-html.txt`), html, { mode: 0o600 });
          assertPrivate(html); expect(html).toContain('self.__next_f.push');
          expect(await page.locator('[data-sku] button').count()).toBe(3);
          for (const button of await page.locator('[data-sku] button').all()) expect(await button.isDisabled()).toBe(id === B);
          expect(await page.getByText('TEST · Тестовая оплата', { exact: true }).count()).toBe(1);
          const key = /[a-f0-9]{64}/g;
          // Стабильность/различие существующего React remount key проверяется в настоящем Flight.
          const expectedKey = createHmac('sha256', secret).update(`checkout-owner-v1:${id}`).digest('hex');
          expect(html.match(key)).toContain(expectedKey); keys[id] = expectedKey;
          await page.goto(origin + '/dashboard');
          const flight = page.waitForResponse(response => response.url().includes('/upgrade') && response.request().headers()['next-router-prefetch'] !== '1' && (response.headers()['content-type'] ?? '').includes('text/x-component'));
          await page.getByRole('link', { name: 'Тарифы', exact: true }).click();
          const response = await flight; expect(response.status()).toBe(200);
          const captured = flights.filter(flight => flight.url === response.url()).at(-1); expect(captured).toBeDefined();
          const body = captured!.body; expect(captured!.contentType).toContain('text/x-component'); expect(body.length).toBeGreaterThan(100); expect(response.headers()['content-type']).toContain('text/x-component');
          writeFileSync(resolve(evidence, `${engine}-${visit}-${id === A ? 'A' : 'B'}-flight.txt`), body, { mode: 0o600 }); assertPrivate(body); expect(body).toContain(expectedKey);
          await page.waitForURL('**/upgrade?from=partner_dashboard');
          for (const button of await page.locator('[data-sku] button').all()) expect(await button.isDisabled()).toBe(id === B);
          expect(await page.locator('[data-sku] button').count()).toBe(3);
          assertPrivate(await page.locator('main').innerHTML());
        }
        expect(keys[A]).not.toBe(keys[B]); expect(flights.length).toBeGreaterThanOrEqual(3);
        writeFileSync(resolve(evidence, `${engine}-capture-summary.json`), JSON.stringify({ directHtmlResponses: 3, flightResponses: flights.length, nonemptyFlightResponses: flights.filter(f => f.body.length > 100 && f.contentType.includes('text/x-component')).length }), { mode: 0o600 });
        activeToken = null; await page.goto(origin + '/upgrade');
        await page.waitForURL(origin + '/#auth');
        expect(external).toEqual([]);
      } finally { await context.close(); await browser.close(); }
    }
    assertPrivate(logs); expect(logs).not.toContain('Test transport blocked external request');
  }, 120000);
  it('native loadWebConfig runtime handler admits only session A and revocation keeps existing TEST intent', async () => {
    const counts = async () => (await pool.query('SELECT (SELECT count(*)::int FROM payment_intent) intents,(SELECT count(*)::int FROM credit_grant) grants')).rows[0];
    const request = async (token: string | null, payload: unknown) => fetch(origin + `/api/checkout?account_id=${A}`, { method: 'POST', body: JSON.stringify(payload),
      headers: { origin: childEnv.N5_PUBLIC_ORIGIN!, 'content-type': 'application/json', 'x-forwarded-for': xff, 'x-account-id': A,
        ...(token ? { cookie: `__Host-n5_session=${token}` } : {}) } });
    const before = await counts(), calls = provider.createKeys.length + provider.readCalls;
    expect((await request(tokens[B]!, { account_id: A, email: `${A}@test.invalid`, role: 'owner', sku: 'start_v1', idempotency_key: randomUUID() })).status).toBe(503);
    expect((await request(null, { sku: 'start_v1', idempotency_key: randomUUID() })).status).toBe(401);
    expect(await counts()).toEqual(before); expect(provider.createKeys.length + provider.readCalls).toBe(calls);
    const result = await request(tokens[A]!, { sku: 'start_v1', idempotency_key: randomUUID() }); expect(result.status).toBe(201);
    const id = (await result.json()).data.intent_id as string;
    expect((await pool.query('SELECT account_id FROM payment_intent WHERE id=$1', [id])).rows).toEqual([{ account_id: A }]);
    expect((await counts()).grants).toBe(before.grants);
    await start('');
    expect((await request(tokens[A]!, { sku: 'start_v1', idempotency_key: randomUUID() })).status).toBe(503);
    const html = await fetch(origin + '/upgrade', { headers: { cookie: `__Host-n5_session=${tokens[A]}` } });
    const body = await html.text(); assertPrivate(body);
    expect((body.match(/<button\b[^>]*\sdisabled=""[^>]*>/g) ?? []).length).toBeGreaterThanOrEqual(3);
    const payment = provider.byOrder(id)!; provider.pay(payment.id);
    const notify = () => fetch(origin + '/api/webhooks/yookassa', { method: 'POST', body: provider.notification(payment.id),
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '185.71.76.10, 10.0.0.2, 10.0.0.3' } });
    expect((await (await notify()).json()).data.applied).toBe(true);
    expect((await (await notify()).json()).data.reason).toBe('duplicate'); expect((await counts()).grants).toBe(before.grants + 1);
    assertPrivate(logs); expect(logs).not.toContain('Test transport blocked external request');
  }, 60000);
});
