// Native Next with an isolated PostgreSQL schema, HTTPS auth cookie and loopback YooKassa.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { createServer as httpsServer, type Server as HttpsServer } from 'node:https';
import { request as httpRequest } from 'node:http';
import { createServer as netServer } from 'node:net';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import Redis from 'ioredis';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { environment } from '../fixtures/environment';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from '../fixtures/fake-yookassa-server';

const schema = 'billing_verified_next_' + randomBytes(8).toString('hex');
const secret = randomBytes(32).toString('hex');
const temp = mkdtempSync(join(tmpdir(), 'clipmkr-billing-verified-'));
const capture = join(temp, 'mail.ndjson');
let pool: Pool, auth: AuthService, redis: Redis, child: ChildProcess | undefined, proxy: HttpsServer, provider: FakeYooKassa, browser: Browser, origin: string;
let logs = '';
const identities = new Set(['anonymous:198.51.100.0/24']);
interface Letter { purpose?: string; subject?: string; to: string; url?: string; text?: string }
function letters(): Letter[] {
  try { return readFileSync(capture, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line) as Letter); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []; throw error; }
}
async function freePort() {
  const server = netServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Local port unavailable');
  await new Promise<void>(r => server.close(() => r())); return address.port;
}
async function account(verified = false) {
  const email = `billing-${randomUUID()}@example.test`;
  const token = await auth.register(email, 'synthetic-checkout-password', '198.51.100.0/24');
  const id = (await auth.authenticate(token))!.account_id;
  identities.add('account:' + id);
  if (verified) await pool.query('UPDATE account SET email_verified_at=now() WHERE id=$1', [id]);
  return { email, token, id };
}
const setSession = (jar: BrowserContext, token: string) => jar.addCookies([{
  name: '__Host-n5_session', value: token, url: origin, httpOnly: true, secure: true, sameSite: 'Lax',
}]);
async function session(token: string, width = 390) {
  const jar = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 900 } });
  await setSession(jar, token);
  const page = await jar.newPage();
  page.setDefaultTimeout(10000);
  return { jar, page };
}
const relay = async (page: Page) => page.route('**/*', route => {
  const target = new URL(route.request().url());
  if (target.origin === origin) return route.continue();
  if (target.origin === 'https://yoomoney.example') return route.fulfill({ contentType: 'text/html; charset=utf-8', body: '<h1>Форма тестовой оплаты</h1>' });
  return route.abort();
});

beforeAll(async () => {
  const database = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
  if (!database || !new URL(database).pathname.endsWith('_test') || !redisUrl || new URL(redisUrl).pathname !== '/14') throw Error('Isolated *_test PG and Redis14 required');
  pool = createPool(database, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  auth = new AuthService(new PgAuthStore(pool, 'credits_v1'), secret);
  redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 }); await redis.ping(); provider = await startFakeYooKassa();
  const upstreamPort = await freePort();
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(temp, 'key.pem'),
    '-out', join(temp, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'pipe' });
  proxy = httpsServer({ key: readFileSync(join(temp, 'key.pem')), cert: readFileSync(join(temp, 'cert.pem')) }, (req, res) => {
    const ip = req.url === '/api/webhooks/yookassa' ? '185.71.76.10' : '198.51.100.7';
    const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method,
      headers: { ...req.headers, 'x-forwarded-for': ip + ',10.0.0.2,10.0.0.3', 'x-forwarded-proto': 'https' } }, response => {
      res.writeHead(response.statusCode!, response.headers); response.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise<void>((r, reject) => { proxy.once('error', reject); proxy.listen(3448, '127.0.0.1', r); });
  const address = proxy.address();
  if (!address || typeof address === 'string') throw Error('Local HTTPS proxy unavailable');
  origin = `https://127.0.0.1:${address.port}`;
  const scoped = new URL(database); scoped.searchParams.set('options', `-c search_path=${schema},public`);
  const env = { ...environment(), PATH: process.env.PATH, DATABASE_URL: scoped.href, REDIS_URL: redisUrl, SESSION_SECRET: secret,
    N5_PUBLIC_ORIGIN: origin, N5_BILLING_MODE: 'credits_v1', N5_MAIL_MODE: 'test', N5_MAIL_TEST_CAPTURE_FILE: capture,
    N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true',
    YOOKASSA_RECEIPT_VAT_CODE: '1', YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'service', YOOKASSA_RECEIPT_PAYMENT_MODE: 'full_payment',
    S3_ENDPOINT: 'http://127.0.0.1:9', CLIPMKR_TEST_PAYMENT_ORIGIN: provider.apiBase, NEXT_TELEMETRY_DISABLED: '1' };
  execFileSync(process.execPath, ['.next/preflight/preflight.js'], { cwd: resolve('apps/web'), env, timeout: 10000, stdio: 'pipe' });
  child = spawn(process.execPath, ['--import', resolve('tests/fixtures/payment-test-transport.mjs'), resolve('node_modules/next/dist/bin/next'),
    'start', '--hostname', '127.0.0.1', '--port', String(upstreamPort)], { cwd: resolve('apps/web'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => { logs += String(chunk); }); child.stderr!.on('data', chunk => { logs += String(chunk); });
  const deadline = Date.now() + 20000;
  let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw Error('Native Next child exited');
    try {
      if ((await fetch(`http://127.0.0.1:${upstreamPort}/health`, { signal: AbortSignal.timeout(1000) })).ok) {
        ready = true;
        break;
      }
    } catch { /* bounded readiness */ }
    await delay(100);
  }
  if (!ready) throw Error('Native Next health deadline');
  browser = await chromium.launch();
}, 60000);
afterAll(async () => {
  await browser?.close();
  if (child && child.exitCode === null) {
    const exited = once(child, 'exit'); child.kill('SIGTERM');
    const timer = setTimeout(() => child?.kill('SIGKILL'), 4000);
    try { await exited; } finally { clearTimeout(timer); }
  }
  if (proxy) { proxy.closeAllConnections(); await new Promise<void>(r => proxy.close(() => r())); }
  await provider?.close();
  if (redis) {
    const keys = [...identities].flatMap(id => ['read', 'mutation'].map(kind =>
      `n5:${kind}:rate:` + createHmac('sha256', secret).update(id).digest('hex')));
    await redis.del(...keys); await redis.quit();
  }
  if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  expect(logs).not.toContain(secret);
  expect(logs).not.toContain('Test transport blocked external request');
  rmSync(temp, { recursive: true, force: true });
}, 15000);

it('keeps the selected package after verification and a lost checkout response, then sends one receipt via the real scheduler', async () => {
  const buyer = await account(), { jar, page } = await session(buyer.token);
  try {
    await relay(page);
    const key = randomUUID();
    const direct = await jar.request.post(origin + '/api/checkout', { headers: { origin }, data: { sku: 'pro_v1', idempotency_key: key } });
    expect(direct.status()).toBe(403);
    expect((await direct.json()).error.code).toBe('email_verification_required');
    const createdBefore = provider.created;
    const send = page.getByRole('button', { name: 'Отправить письмо', exact: true });
    await page.goto(origin + '/upgrade');
    await page.locator('[data-sku="pro_v1"] button').click();
    await expect.poll(() => page.getByRole('heading', { name: 'Подтвердите почту перед оплатой' }).isVisible()).toBe(true);
    expect(new URL(page.url()).searchParams.get('sku')).toBe('pro_v1');
    expect(provider.created).toBe(createdBefore);
    await send.focus(); await page.keyboard.press('Enter');
    await expect.poll(() => letters().filter(letter => letter.to === buyer.email)).toHaveLength(1);
    const link = new URL(letters().find(letter => letter.to === buyer.email)!.url!);
    expect(link.pathname + link.search).toBe('/verify-email?sku=pro_v1');
    await page.goto(link.href);
    await page.getByRole('button', { name: 'Подтвердить почту', exact: true }).click();
    await page.getByRole('link', { name: /Вернуться к пакету/ }).click();
    expect(new URL(page.url()).searchParams.get('sku')).toBe('pro_v1');
    const pay = page.getByRole('button', { name: 'Оплатить пакет «Про»' });
    await pay.waitFor();
    expect(provider.created).toBe(createdBefore);
    const observed: string[] = [];
    let intentId = '';
    await page.route('**/api/checkout', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      observed.push(route.request().postDataJSON().idempotency_key);
      const response = await route.fetch();
      intentId = (await response.json()).data.intent_id;
      if (observed.length === 1) await route.abort('failed');
      else await route.fulfill({ response });
    });
    await pay.click();
    const checkoutError = page.locator('main [role=alert]');
    await checkoutError.waitFor();
    await expect.poll(() => checkoutError.evaluate(node => node === document.activeElement)).toBe(true);
    await page.reload();
    await pay.click();
    await page.getByRole('heading', { name: 'Форма тестовой оплаты' }).waitFor();
    expect(observed).toHaveLength(2); expect(observed[1]).toBe(observed[0]);
    expect(provider.created).toBe(createdBefore + 1);
    await page.goto(origin + '/upgrade/return?intent=' + intentId);
    await page.getByRole('heading', { name: 'Ждём подтверждения оплаты' }).waitFor();
    const payment = provider.byOrder(intentId)!; provider.pay(payment.id);
    for (let repeat = 0; repeat < 2; repeat++) {
      const response = await jar.request.post(origin + '/api/webhooks/yookassa', { data: provider.notification(payment.id) });
      expect(response.status()).toBe(200);
      expect((await response.json()).data.applied).toBe(repeat === 0);
    }
    await page.getByRole('heading', { name: 'Пакет Про оплачен' }).waitFor();
    const live = page.locator('[data-receipt-status]');
    const pendingRegion = page.locator('.billing-return [role=status][aria-atomic=true]');
    await expect.poll(() => live.getAttribute('data-receipt-status')).toBe('pending');
    const region = await pendingRegion.elementHandle();
    await expect.poll(() => letters().filter(letter => letter.subject === 'Квитанция Clipmkr' && letter.text?.includes(intentId)),
      { timeout: 75000, interval: 250 }).toHaveLength(1);
    const captured = letters().find(letter => letter.subject === 'Квитанция Clipmkr' && letter.text?.includes(intentId))!;
    expect(captured.to).toBe('receipt@example.test');
    await expect.poll(() => live.getAttribute('data-receipt-status'), { timeout: 8000 }).toBe('accepted');
    expect(await pendingRegion.evaluate((node, old) => node === old, region)).toBe(true);
    expect(await live.textContent()).toContain('Почтовый сервис принял квитанцию к отправке');
    expect((await pool.query('SELECT count(*)::int AS n FROM credit_grant WHERE payment_ref=$1', [intentId])).rows[0].n).toBe(1);
    expect((await pool.query('SELECT count(*)::int AS n FROM payment_receipt_delivery WHERE intent_id=$1', [intentId])).rows[0].n).toBe(1);
  } finally { await jar.close(); }
}, 100000);

it('rejects a delayed checkout after account switch, offers support for an old unresolved intent and reflows the light layout', async () => {
  const first = await account(true), second = await account(true), { jar, page } = await session(first.token, 1440);
  try {
    await relay(page);
    await page.goto(origin + '/upgrade?sku=start_v1');
    await page.evaluate(() => document.documentElement.dataset.theme = 'light');
    await page.getByRole('heading', { name: 'Почта подтверждена' }).waitFor();
    let release!: () => void, ready!: () => void, originalId = '';
    const arrived = new Promise<void>(resolve => { ready = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const pay = page.getByRole('button', { name: 'Оплатить пакет «Старт»' });
    const hold = async (route: import('playwright').Route) => {
      const response = await route.fetch();
      originalId = (await response.json()).data.intent_id;
      ready(); await gate; await route.fulfill({ response });
    };
    await page.route('**/api/checkout', hold);
    await pay.click();
    try { await Promise.race([arrived, delay(6000).then(() => { throw Error('Checkout did not reach the barrier'); })]); await setSession(jar, second.token); }
    finally { release(); }
    await page.locator('main [role=alert]').waitFor();
    expect(new URL(page.url()).origin).toBe(origin);
    expect((await jar.request.get(origin + '/api/checkout/' + originalId)).status()).toBe(404);
    await page.unroute('**/api/checkout', hold);
    await page.goto(origin + '/upgrade?sku=start_v1');
    const legacyKey = randomUUID();
    await pool.query(`INSERT INTO payment_intent(account_id,price_minor,idempotency_key,sku,offer_version,grant_seconds,
      payment_provider,payment_environment,payment_merchant_id)
      VALUES($1,99000,$2,'start_v1','credits_v1_d00',18000,'yookassa','test',$3)`, [second.id, legacyKey, SHOP_ID]);
    const owner = createHmac('sha256', secret).update(`checkout-owner-v1:${second.id}`).digest('hex');
    await page.evaluate(({ owner, key }) => sessionStorage.setItem(`clipmkr:checkout:${owner}:start_v1`, JSON.stringify({ key })),
      { owner, key: legacyKey });
    const before = provider.requestMethods.length;
    await pay.click();
    await page.getByRole('link', { name: 'Поддержка', exact: true }).last().waitFor();
    expect(provider.requestMethods).toHaveLength(before);
    await page.setViewportSize({ width: 320, height: 850 });
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; document.documentElement.dataset.theme = 'light'; });
    expect(await page.locator('.billing-selection').evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await pay.isVisible()).toBe(true);
  } finally { await jar.close(); }
}, 25000);

it('offers a retry in the same package after invalid verification and failed mail', async () => {
  const buyer = await account(), { jar, page } = await session(buyer.token, 390);
  try {
    await relay(page);
    const invalid = randomBytes(32).toString('base64url');
    await page.goto(origin + '/verify-email?sku=addon_v1#token=' + invalid);
    await page.getByRole('button', { name: 'Подтвердить почту', exact: true }).click();
    await page.getByRole('heading', { name: 'Ссылка недействительна' }).waitFor();
    const resend = page.getByRole('button', { name: 'Отправить новое письмо' });
    const seen: string[] = [];
    await page.route('**/api/auth/email/send', async route => {
      seen.push(route.request().postDataJSON().sku);
      if (seen.length === 1) return route.fulfill({ status: 503, json: { error: { message: 'Синтетический отказ почты' } } });
      await route.continue();
    });
    await resend.click();
    const error = page.locator('main [role=alert]');
    await error.waitFor();
    await expect.poll(() => error.evaluate(node => node === document.activeElement)).toBe(true);
    await resend.click();
    await page.getByRole('heading', { name: 'Проверьте почту' }).waitFor();
    expect(seen).toEqual(['addon_v1', 'addon_v1']);
    expect(new URL(letters().find(letter => letter.to === buyer.email)!.url!).searchParams.get('sku')).toBe('addon_v1');
    expect((await pool.query('SELECT count(*)::int AS n FROM payment_intent WHERE account_id=$1', [buyer.id])).rows[0].n).toBe(0);
  } finally { await jar.close(); }
}, 20000);

it('receipt polling timeout and a refund before delivery preserve the confirmed purchase', async () => {
  const buyer = await account(true), { jar, page } = await session(buyer.token, 1440);
  try {
    await relay(page);
    const request = await jar.request.post(origin + '/api/checkout', { headers: { origin },
      data: { sku: 'start_v1', idempotency_key: randomUUID() } });
    expect(request.status()).toBe(201);
    const id = (await request.json()).data.intent_id, remote = provider.byOrder(id)!;
    provider.pay(remote.id);
    const callback = async (data: string) => jar.request.post(origin + '/api/webhooks/yookassa', { data });
    expect((await callback(provider.notification(remote.id))).status()).toBe(200);
    const statusRoute = '**/api/checkout/' + id;
    let reads = 0;
    await page.route(statusRoute, route => ++reads === 1 ? route.continue() : route.abort('failed'));
    await page.clock.install();
    await page.goto(origin + '/upgrade/return?intent=' + id);
    const paid = page.getByRole('heading', { name: 'Пакет Старт оплачен' });
    await paid.waitFor();
    await page.locator('[data-receipt-status=pending]').waitFor();
    await page.clock.fastForward(65_000);
    const status = page.locator('[data-receipt-status=problem]');
    await status.waitFor();
    expect(await paid.isVisible()).toBe(true);
    await page.unroute(statusRoute);
    expect((await callback(provider.refundNotification(provider.refund(remote.id)))).status()).toBe(200);
    await page.reload();
    await status.waitFor();
    expect(await paid.isVisible()).toBe(true);
    expect(await status.textContent()).toContain('Квитанция пока не отправлена');
    expect(letters().some(letter => letter.subject === 'Квитанция Clipmkr' && letter.text?.includes(id))).toBe(false);
  } finally { await jar.close(); }
}, 20000);
