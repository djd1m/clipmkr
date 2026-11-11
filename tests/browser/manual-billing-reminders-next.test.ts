// Actual built Next + HTTPS auth cookie + scheduler + captured loopback Resend bytes.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium, webkit, type Browser, type BrowserContext, type Page } from 'playwright';
import { createServer as httpsServer, type Server as HttpsServer } from 'node:https';
import { createServer as httpServer, request as httpRequest, type Server as HttpServer } from 'node:http';
import { createServer as netServer } from 'node:net';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
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

const schema = 'billing_next_' + randomBytes(8).toString('hex'), secret = randomBytes(32).toString('hex');
const output = process.env.BILLING_REMINDERS_AUTHOR_OUT;
if (output) mkdirSync(output, { recursive: true, mode: 0o700 });
const password = 'synthetic-billing-password', temp = mkdtempSync(join(tmpdir(), 'clipmkr-billing-next-'));
let pool: Pool, auth: AuthService, redis: Redis, child: ChildProcess | undefined, proxy: HttpsServer, socket: HttpServer, provider: FakeYooKassa, origin: string;
let logs = '', paymentPosts = 0, authPosts = 0;
const identities = new Set(['anonymous:198.51.100.0/24']);
const letters: { key: string; bytes: string }[] = [];
async function port() {
  const server = netServer(); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('Local port unavailable');
  await new Promise<void>(r => server.close(() => r())); return address.port;
}
async function login(page: Page, email: string) {
  await page.locator('.public-modes button').last().click();
  await page.locator('#auth-email').fill(email); await page.locator('#auth-password').fill(password);
  await page.locator('#auth button[type=submit]').focus(); await page.keyboard.press('Enter');
  await page.waitForURL(origin + '/dashboard');
}
async function seedIntervals(accountId: string) {
  const start = new Date(Date.now() - 86400000), firstEnd = new Date(Date.now() + 20 * 3600000), end = new Date(Date.now() + 48 * 3600000);
  for (const [index, environment, from, until] of [[0, 'live', start, firstEnd], [1, 'test', firstEnd, end]] as const) {
    const paymentId = randomUUID();
    const intent = (await pool.query<{ id: string }>(`INSERT INTO payment_intent(account_id,price_minor,idempotency_key,status,sku,offer_version,grant_seconds,
      provider_payment_id,fulfilled_at,period_start,period_end,payment_provider,payment_environment,payment_merchant_id)
      VALUES($1,99000,$2,'succeeded','start_v1','credits_v1_d00',18000,$2,now(),$3,$4,'yookassa',$5,'123456') RETURNING id`, [accountId, paymentId, from, until, environment])).rows[0]!.id;
    await pool.query(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id)
      VALUES($1,$2,'yookassa',$3,99000,now(),$4,'123456')`, [intent, accountId, paymentId, environment]);
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,available_at,expires_at,entitlement_start,entitlement_end,payment_ref,base_sku)
      VALUES($1,'payment',$2,18000,0,$3,$4,$3,$4,$5,$6)`, [accountId, randomUUID(), from, until, intent, index === 0 ? 'start_v1' : null]);
  }
  return end;
}
async function counts() {
  return (await pool.query(`SELECT (SELECT count(*)::int FROM payment_intent) AS intents,
    (SELECT jsonb_agg(to_jsonb(g) ORDER BY id) FROM credit_grant g) AS grants`)).rows[0];
}
beforeAll(async () => {
  const database = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
  if (!database || !new URL(database).pathname.endsWith('_test') || !redisUrl || new URL(redisUrl).pathname !== '/14') throw Error('Owned *_test PG and Redis14 required');
  pool = createPool(database, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  auth = new AuthService(new PgAuthStore(pool, 'credits_v1'), secret);
  redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 }); await redis.ping(); provider = await startFakeYooKassa();
  socket = httpServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/emails') { res.writeHead(404); res.end(); return; }
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    letters.push({ key: String(req.headers['idempotency-key']), bytes: Buffer.concat(chunks).toString() });
    res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: 'synthetic-' + letters.length }));
  });
  await new Promise<void>(r => socket.listen(0, '127.0.0.1', r)); const mailAddress = socket.address();
  if (!mailAddress || typeof mailAddress === 'string') throw Error('Local mail socket unavailable');
  const upstreamPort = await port();
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(temp, 'key.pem'), '-out', join(temp, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'pipe' });
  proxy = httpsServer({ key: readFileSync(join(temp, 'key.pem')), cert: readFileSync(join(temp, 'cert.pem')) }, (req, res) => {
    if (req.method === 'POST' && req.url?.startsWith('/api/checkout')) paymentPosts++;
    if (req.method === 'POST' && req.url?.startsWith('/api/auth/')) authPosts++;
    const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method,
      headers: { ...req.headers, 'x-forwarded-for': '198.51.100.7,10.0.0.2,10.0.0.3', 'x-forwarded-proto': 'https' } }, response => { res.writeHead(response.statusCode!, response.headers); response.pipe(res); });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  });
  await new Promise<void>((r, reject) => { proxy.once('error', reject); proxy.listen(3447, '127.0.0.1', r); }); const address = proxy.address();
  if (!address || typeof address === 'string') throw Error('Local HTTPS proxy unavailable'); origin = `https://127.0.0.1:${address.port}`;
  const scoped = new URL(database); scoped.searchParams.set('options', `-c search_path=${schema},public`);
  const env = { ...environment(), PATH: process.env.PATH, DATABASE_URL: scoped.href, REDIS_URL: redisUrl, SESSION_SECRET: secret,
    N5_PUBLIC_ORIGIN: origin, N5_BILLING_MODE: 'credits_v1', N5_BILLING_REMINDERS_ENABLED: 'true',
    N5_MAIL_MODE: 'resend', N5_MAIL_FROM: 'sender@example.test', N5_RESEND_API_KEY: 'synthetic-local-key',
    N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true',
    S3_ENDPOINT: 'http://127.0.0.1:9', CLIPMKR_TEST_PAYMENT_ORIGIN: provider.apiBase,
    CLIPMKR_TEST_RESEND_ORIGIN: `http://127.0.0.1:${mailAddress.port}`, NEXT_TELEMETRY_DISABLED: '1' };
  execFileSync(process.execPath, ['.next/preflight/preflight.js'], { cwd: resolve('apps/web'), env, timeout: 10000, stdio: 'pipe' });
  child = spawn(process.execPath, ['--import', resolve('tests/fixtures/payment-test-transport.mjs'), resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', String(upstreamPort)],
    { cwd: resolve('apps/web'), env, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => { logs += String(chunk); }); child.stderr!.on('data', chunk => { logs += String(chunk); });
  const deadline = Date.now() + 20000; let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw Error('Native Next child exited');
    try { if ((await fetch(`http://127.0.0.1:${upstreamPort}/health`, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* bounded readiness */ }
    await delay(100);
  }
  if (!ready) throw Error('Native Next health deadline');
}, 60000);
afterAll(async () => {
  if (child && child.exitCode === null) { const exited = once(child, 'exit'); child.kill('SIGTERM'); const timer = setTimeout(() => child?.kill('SIGKILL'), 4000); try { await exited; } finally { clearTimeout(timer); } }
  if (proxy) { proxy.closeAllConnections(); await new Promise<void>(r => proxy.close(() => r())); }
  if (socket) { socket.closeAllConnections(); await new Promise<void>(r => socket.close(() => r())); }
  await provider?.close();
  if (redis) { const keys = [...identities].flatMap(id => ['read', 'mutation'].map(kind => `n5:${kind}:rate:` + createHmac('sha256', secret).update(id).digest('hex'))); await redis.del(...keys); await redis.quit(); }
  if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  expect(logs).not.toContain(password); expect(logs).not.toContain(secret); expect(logs).not.toContain('Test transport blocked external request');
  if (output) writeFileSync(join(output, 'next.private.log'), logs, { mode: 0o600 });
  rmSync(temp, { recursive: true, force: true });
}, 15000);

it('billing_native_auth_mail_cta_get_creates_no_payment', async () => {
  const sessions: { browser: Browser; jar: BrowserContext; page: Page; email: string; id: string; end: Date; engine: string }[] = [];
  try {
    for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
      const email = `billing-${randomUUID()}@example.invalid`, token = await auth.register(email, password, '198.51.100.0/24');
      const id = (await auth.authenticate(token))!.account_id; identities.add('account:' + id);
      await pool.query('UPDATE account SET email_verified_at=now() WHERE id=$1', [id]);
      const browser = await engine.launch(), jar = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
      await jar.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      const page = await jar.newPage(); page.setDefaultTimeout(10000); await page.goto(origin + '/#auth'); await login(page, email);
      const cookie = (await jar.cookies()).find(c => c.name === '__Host-n5_session');
      expect(cookie).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
      const end = await seedIntervals(id); sessions.push({ browser, jar, page, email, id, end, engine: name });
    }
    const before = await counts();
    // Eligible intervals are created after native login. The existing 60s scheduler owns dispatch.
    await expect.poll(() => letters.length, { timeout: 75000, interval: 250 }).toBe(2);
    for (const session of sessions) {
      const captured = letters.filter(l => JSON.parse(l.bytes).to[0] === session.email); expect(captured).toHaveLength(1);
      const letter = JSON.parse(captured[0]!.bytes), cta = /href="([^"]+)"/.exec(letter.html)![1]!;
      expect(cta).toBe(origin + '/upgrade'); expect(letter.text).toContain('Текущий непрерывный период доступа по пакетам закончится');
      const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' }).format(session.end) + ' МСК';
      expect(letter.text).toContain(date); expect(letter.text).toContain('Остатки каждого пакета действуют до его срока; бессрочные кредиты сохраняются');
      const response = await session.page.goto(cta); expect(response?.status()).toBe(200); expect(await session.page.locator('[data-sku]').count()).toBe(3);
      await session.page.reload(); expect(new URL(session.page.url()).pathname).toBe('/upgrade');
      expect(await session.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await session.page.getByRole('link', { name: 'Новая запись', exact: true }).focus(); await session.page.keyboard.press('Enter'); await session.page.waitForURL('**/dashboard');
      await session.page.getByRole('link', { name: 'Тарифы', exact: true }).focus(); await session.page.keyboard.press('Enter'); await session.page.waitForURL('**/upgrade?from=partner_dashboard');
      const loggedOut = await session.browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 390, height: 844 } });
      try {
        const page = await loggedOut.newPage(); await page.goto(cta); await page.waitForURL(origin + '/#auth'); await login(page, session.email);
        await page.getByRole('link', { name: 'Тарифы', exact: true }).click(); await page.waitForURL('**/upgrade?from=partner_dashboard'); await page.reload();
        expect(await page.locator('[data-sku]').count()).toBe(3);
      } finally { await loggedOut.close(); }
      const notice = (await pool.query('SELECT * FROM billing_notice WHERE account_id=$1', [session.id])).rows;
      expect(notice).toHaveLength(1); expect(notice[0]).toMatchObject({ state: 'accepted', attempts: 1, provider_key: captured[0]!.key });
      if (output) await session.page.screenshot({ path: join(output, session.engine + '-upgrade-mobile.png'), fullPage: true });
      writeFileSync(join(output ?? temp, session.engine + '-mail.json'), JSON.stringify({ bytes: captured[0]!.bytes, key: captured[0]!.key }), { mode: 0o600 });
    }
    expect(await counts()).toEqual(before); expect(paymentPosts).toBe(0); expect(authPosts).toBe(4); expect(provider.createKeys).toHaveLength(0); expect(provider.readCalls).toBe(0); expect(provider.requestMethods).toEqual([]);
  } finally { for (const session of sessions) { await session.jar.close(); await session.browser.close(); } }
}, 180000);
