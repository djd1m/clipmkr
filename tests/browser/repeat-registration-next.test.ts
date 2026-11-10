// AUTH-001: current built Next + HTTPS/native cookie jar; isolated PG and Redis.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { chromium, webkit, type Page, type BrowserContext } from 'playwright';
import { createServer as createHttpsServer, type Server } from 'node:https';
import { request as httpRequest } from 'node:http';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { createServer, type ViteDevServer } from 'vite';
import Redis from 'ioredis';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { referralCookie } from '../../apps/web/src/lib/partner-referral';
import { environment } from '../fixtures/environment';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from '../fixtures/fake-yookassa-server';

// Exact baseline bytes, before AUTH-001. Kept inline so this fixture also runs from a source archive.
// git c97515db90e704b44da0644c9ac92a8cd22e6343:apps/web/src/app/AuthForm.tsx
const LEGACY_SOURCE: string = "'use client';\nimport { useEffect, useRef, useState } from 'react';\nimport { useRouter } from 'next/navigation';\nimport { observeSignup } from '../lib/acquisition-analytics';\nimport { clearSupportIdentity } from '../lib/support-client';\nimport { rpc } from '../lib/rpc';\nimport { safeNextPath } from '../lib/payment-return';\nconst afterLogin = () => safeNextPath(new URLSearchParams(window.location.search).get('next')) ?? '/dashboard';\n\nexport function AuthForm({ mode, onModeChange, focusRequest, onAvailabilityChange, creditMode = false }: {\n  mode: 'register' | 'login'; onModeChange: (mode: 'register' | 'login') => void;\n  focusRequest: number; onAvailabilityChange: (available: boolean) => void; creditMode?: boolean;\n}) {\n  const register = mode === 'register';\n  const [busy, setBusy] = useState(false), [error, setError] = useState('');\n  const [signedIn, setSignedIn] = useState(false);\n  const [emailError, setEmailError] = useState(''), [passwordError, setPasswordError] = useState('');\n  const request = useRef(false), authenticated = useRef(false), pendingRegistration = useRef(false);\n  const email = useRef<HTMLInputElement>(null), password = useRef<HTMLInputElement>(null);\n  const router = useRouter();\n  useEffect(() => {\n    const focus = () => { if (location.hash === '#auth') email.current?.focus(); };\n    focus(); addEventListener('hashchange', focus);\n    return () => removeEventListener('hashchange', focus);\n  }, []);\n  useEffect(() => {\n    setError(''); setEmailError(''); setPasswordError(''); password.current?.setCustomValidity('');\n    if (focusRequest) email.current?.focus();\n  }, [mode, focusRequest]);\n  function validatePassword(field: HTMLInputElement) {\n    const message = register && new TextEncoder().encode(field.value).length > 72\n      ? 'Пароль должен занимать не больше 72 байт. Сократите его.' : '';\n    field.setCustomValidity(message); setPasswordError(message);\n    return !message;\n  }\n  function startRequest() {\n    if (request.current) return false;\n    request.current = true; onAvailabilityChange(false); setBusy(true); setError(''); return true;\n  }\n  function finishRequest() {\n    request.current = false; setBusy(false); onAvailabilityChange(!authenticated.current);\n  }\n  function continueToCabinet() {\n    if (pendingRegistration.current) { observeSignup(); pendingRegistration.current = false; }\n    router.push(afterLogin()); router.refresh();\n  }\n  return <form id=\"auth\" className=\"auth-card public-auth\" aria-labelledby=\"auth-title\" onInvalid={event => {\n    const field = event.target as HTMLInputElement;\n    if (field === email.current) setEmailError(field.validity.valueMissing ? 'Введите электронную почту.' : 'Проверьте адрес электронной почты.');\n    if (field === password.current) setPasswordError(field.validity.customError ? field.validationMessage : field.validity.valueMissing ? 'Введите пароль.' : 'Пароль должен содержать не меньше 8 символов.');\n  }} onSubmit={async event => {\n    event.preventDefault();\n    if (request.current) return;\n    if (!authenticated.current && password.current && !validatePassword(password.current)) { password.current.focus(); return; }\n    const formElement = event.currentTarget;\n    if (!formElement.reportValidity() || !startRequest()) return;\n    const form = new FormData(formElement);\n    const operation = mode;\n    try {\n      if (!authenticated.current) {\n        clearSupportIdentity();\n        const response = await fetch(`/api/auth/${operation}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },\n          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });\n        const body = await response.json();\n        if (!body || typeof body !== 'object') throw new Error('Не удалось прочитать ответ сервера. Повторите позже');\n        if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Не удалось войти');\n        pendingRegistration.current = operation === 'register';\n        authenticated.current = true; setSignedIn(true);\n      }\n      const explicit = String(form.get('partner_code') ?? '').trim();\n      await rpc('code.apply', explicit ? { code: explicit } : {}, true);\n      continueToCabinet();\n    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Нет связи с сервером'); }\n    finally { finishRequest(); }\n  }}>\n    <div className=\"public-modes\" role=\"group\" aria-label=\"Регистрация или вход\">\n      <button className=\"public-mode\" type=\"button\" aria-pressed={register} disabled={busy || signedIn} onClick={() => onModeChange('register')}>Создать аккаунт</button>\n      <button className=\"public-mode\" type=\"button\" aria-pressed={!register} disabled={busy || signedIn} onClick={() => onModeChange('login')}>Войти</button>\n    </div>\n    <h2 id=\"auth-title\">{register ? 'Создать аккаунт' : 'Войти в clipmkr'}</h2>\n    <p className=\"public-form-intro\">{register ? creditMode ? 'Начните с 30 пробных кредитов.' : 'Создайте аккаунт, чтобы начать.' : 'Ваши записи и клипы — в вашем кабинете.'}</p>\n    <label htmlFor=\"auth-email\">Электронная почта</label>\n    <input ref={email} id=\"auth-email\" name=\"email\" type=\"email\" autoComplete=\"email\" required aria-invalid={!!emailError} aria-describedby=\"auth-email-error\" onInput={() => setEmailError('')} />\n    <p className=\"public-hint\" id=\"auth-email-error\">{emailError}</p>\n    <label htmlFor=\"auth-password\">Пароль</label>\n    <input ref={password} id=\"auth-password\" name=\"password\" type=\"password\" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} required aria-invalid={!!passwordError} aria-describedby=\"auth-password-hint auth-password-error\" onInput={event => validatePassword(event.currentTarget)} />\n    <p className=\"public-hint\" id=\"auth-password-hint\">{register ? 'От 8 символов, не больше 72 байт. Кириллица и эмодзи занимают больше одного байта.' : 'Введите пароль вашего аккаунта.'}</p>\n    <p className=\"public-hint\" id=\"auth-password-error\">{passwordError}</p>\n    <details className=\"public-partner\"><summary>Есть код партнёра? Необязательно</summary><label htmlFor=\"auth-partner\">Код партнёра</label><input id=\"auth-partner\" name=\"partner_code\" autoComplete=\"off\" maxLength={12} /></details>\n    {error && <p className=\"public-error\" role=\"alert\" aria-atomic=\"true\">{error}</p>}\n    <button className=\"public-primary public-submit\" type=\"submit\" disabled={busy}>{busy ? 'Подождите…' : signedIn ? 'Повторить применение кода' : register ? 'Создать аккаунт' : 'Войти →'}</button>\n    <p className=\"public-legal\" hidden={!register}>Создавая аккаунт, вы принимаете <a href=\"/legal/terms\">соглашение</a> и <a href=\"/legal/privacy\">политику конфиденциальности</a>.</p>\n    {signedIn && error && <button type=\"button\" className=\"public-discard\" disabled={busy} onClick={async () => {\n      if (!startRequest()) return;\n      try { await rpc('code.apply', { discard_referral: true }, true); continueToCabinet(); }\n      catch { setError('Не удалось продолжить. Повторите позже'); } finally { finishRequest(); }\n    }}>Продолжить без применения кода</button>}\n    <nav className=\"support-links public-help\" aria-label=\"Помощь со входом\"><a href=\"/forgot\">Забыли пароль?</a><a href=\"/support\">Поддержка</a></nav>\n  </form>;\n}\n";
const LEGACY_SHA256 = '6b97da09ffc9c34dda5bcd814a188f964979fc75499e3518fbe93a3b6e9d2a77';
const schema = `repeat_next_${randomBytes(8).toString('hex')}`;
const secret = randomBytes(32).toString('hex'), password = 'synthetic-registration-password';
const temp = mkdtempSync(join(tmpdir(), 'clipmkr-repeat-next-'));
const origin = 'https://127.0.0.1:3449';
const evidence = process.env.AUTH_REPEAT_AUTHOR_OUT;
let pool: Pool, auth: AuthService, redis: Redis, child: ChildProcess | undefined, proxy: Server, vite: ViteDevServer, provider: FakeYooKassa;
let logs = '', codeA: string, codeB: string, codeC: string;
const identities = new Set<string>(['anonymous:198.51.100.0/24']);
async function seed(attributed = true) {
  const email = `existing-${randomUUID()}@example.invalid`;
  const token = await auth.register(email, password, '198.51.100.0/24');
  const id = (await auth.authenticate(token))!.account_id; identities.add(`account:${id}`);
  await pool.query('UPDATE credit_grant SET remaining_seconds=900,reserved_seconds=300 WHERE account_id=$1', [id]);
  if (attributed) await pool.query("INSERT INTO attribution(account_id,partner_code_id,source,status) SELECT $1,id,'cookie','pending' FROM partner_code WHERE code=$2", [id, codeA]);
  return { email, id };
}
async function snapshot(id: string) {
  const result = await pool.query(`SELECT to_jsonb(a) AS account,
    COALESCE((SELECT jsonb_agg(to_jsonb(g) ORDER BY id) FROM credit_grant g WHERE g.account_id=a.id),'[]') AS grants,
    COALESCE((SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM attribution t WHERE t.account_id=a.id),'[]') AS attribution
    FROM account a WHERE a.id=$1`, [id]);
  return result.rows[0];
}
async function sessions(id: string) { return (await pool.query('SELECT count(*)::int AS n FROM session WHERE account_id=$1', [id])).rows[0].n as number; }
async function fill(page: Page, email: string, value = password, explicit = true) {
  await page.locator('#auth-email').fill(email); await page.locator('#auth-password').fill(value);
  if (explicit) { await page.locator('#auth summary').click(); await page.locator('[name=partner_code]').fill(codeB); }
}
async function submit(page: Page) { await page.locator('#auth button[type=submit]').click(); }
async function context(engine: typeof chromium, width = 390, theme = 'dark') {
  await redis.del('n5:mutation:rate:' + createHmac('sha256', secret).update('anonymous:198.51.100.0/24').digest('hex'));
  const browser = await engine.launch(); const jar = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width, height: 1000 } });
  let signup = 0, apply = 0; const external: string[] = [];
  await jar.exposeBinding('registrationSignupObserved', () => { signup++; });
  await jar.addCookies([{ name: 'n5_theme', value: theme, url: origin, secure: true, sameSite: 'Lax' }]);
  await jar.addInitScript(() => {
    localStorage.setItem('n5.analytics.consent', 'yes');
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'n5.acquisition.v1') {
        const before = JSON.parse(this.getItem(key) || '{}'), after = JSON.parse(String(value));
        if (!before.signup && after.signup) (window as unknown as { registrationSignupObserved: () => void }).registrationSignupObserved();
      }
      return original.call(this, key, value);
    };
  });
  jar.on('request', request => { if (new URL(request.url()).pathname === '/api/trpc/code.apply') apply++; });
  await jar.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) { external.push(url.hostname); return route.abort(); }
    return route.continue();
  });
  // Only a referral cookie is seeded; auth cookies must be accepted from native HTTPS Set-Cookie.
  const referral = referralCookie('', codeC, 'cookie', false, secret, Date.now());
  if (referral) {
    const pair = referral.split(';')[0]!, equal = pair.indexOf('=');
    await jar.addCookies([{ name: pair.slice(0, equal), value: pair.slice(equal + 1), url: origin, secure: true }]);
  }
  const page = await jar.newPage(); page.setDefaultTimeout(10000);
  return { browser, jar, page, counts: () => ({ signup, apply }), external };
}
async function close(f: Awaited<ReturnType<typeof context>>) { await f.jar.close(); await f.browser.close(); }
async function assertInline(page: Page) {
  const geometry = await page.locator('.auth-flow-notice').evaluate(element => {
    const banner = element.getBoundingClientRect(), style = getComputedStyle(element);
    const header = document.querySelector('.workspace-head, .navigation')!.getBoundingClientRect();
    const main = document.querySelector('main')!.getBoundingClientRect();
    return { position: style.position, belowHeader: banner.top >= header.bottom, beforeMain: main.top >= banner.bottom,
      overflow: document.documentElement.scrollWidth > innerWidth, accent: style.borderLeftWidth };
  });
  expect(geometry).toEqual({ position: 'static', belowHeader: true, beforeMain: true, overflow: false, accent: '3px' });
}
async function assertCookie(jar: BrowserContext, responseCookie: string) {
  for (const flag of ['__Host-n5_session=', 'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax', 'Max-Age=604800']) expect(responseCookie).toContain(flag);
  expect(responseCookie).not.toMatch(/domain=/i);
  const cookie = (await jar.cookies()).find(item => item.name === '__Host-n5_session');
  expect(cookie).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Lax', path: '/' });
  expect(cookie!.expires).toBeGreaterThan(Date.now() / 1000 + 6 * 86400);
}
beforeAll(async () => {
  const database = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
  if (!database || !new URL(database).pathname.endsWith('_test') || !redisUrl || new URL(redisUrl).pathname !== '/14') throw new Error('Dedicated *_test PG and Redis14 required');
  expect(createHash('sha256').update(LEGACY_SOURCE).digest('hex')).toBe(LEGACY_SHA256);
  pool = createPool(database, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  auth = new AuthService(new PgAuthStore(pool, 'credits_v1'), secret);
  for (const name of ['A', 'B', 'C']) {
    const email = `${name}-${randomUUID()}@example.invalid`; const token = await auth.register(email, password, '198.51.100.0/24');
    const id = (await auth.authenticate(token))!.account_id;
    const partner = (await pool.query("INSERT INTO partner(account_id,display_name) VALUES($1,'Synthetic') RETURNING id", [id])).rows[0].id;
    const code = 'RR' + name + randomBytes(3).toString('hex').toUpperCase();
    await pool.query("INSERT INTO partner_code(partner_id,code,status) VALUES($1,$2,'active')", [partner, code]);
    if (name === 'A') codeA = code; else if (name === 'B') codeB = code; else codeC = code;
  }
  redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 }); await redis.ping(); provider = await startFakeYooKassa();
  const scoped = new URL(database); scoped.searchParams.set('options', `-c search_path=${schema},public`);
  const childEnv = { ...environment(), PATH: process.env.PATH, DATABASE_URL: scoped.href, REDIS_URL: redisUrl, SESSION_SECRET: secret,
    N5_PUBLIC_ORIGIN: origin, N5_BILLING_MODE: 'credits_v1', N5_METRIKA_COUNTER_ID: '123456',
    N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true',
    CLIPMKR_TEST_PAYMENT_ORIGIN: provider.apiBase, NEXT_TELEMETRY_DISABLED: '1' };
  execFileSync(process.execPath, ['.next/preflight/preflight.js'], { cwd: resolve('apps/web'), env: childEnv, stdio: 'pipe' });
  child = spawn(process.execPath, ['--import', resolve('tests/fixtures/payment-test-transport.mjs'), resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3450'], { cwd: resolve('apps/web'), env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => { logs += String(chunk); }); child.stderr!.on('data', chunk => { logs += String(chunk); });
  const deadline = Date.now() + 20000; let ready = false;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('Next failed to start');
    try { if ((await fetch('http://127.0.0.1:3450/', { signal: AbortSignal.timeout(1000) })).status === 200) { ready = true; break; } } catch { /* readiness deadline */ }
    await delay(100);
  }
  if (!ready) throw new Error('Next readiness deadline');
  const navigation = '\0legacy-navigation', entry = '\0legacy-entry';
  vite = await createServer({ configFile: false, root: process.cwd(), cacheDir: join(temp, 'vite'), esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['next/navigation'] }, server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    plugins: [{ name: 'exact-old-auth', enforce: 'pre', resolveId(id) { if (id === 'next/navigation') return navigation; if (id === entry) return entry; if (id.endsWith('/LegacyAuthForm.tsx')) return resolve('apps/web/src/app/LegacyAuthForm.tsx'); },
      load(id) {
        if (id === navigation) return `export const usePathname=()=>'/';export const useRouter=()=>({push(p){location.assign(p)},refresh(){}});`;
        if (id.endsWith('/LegacyAuthForm.tsx')) return LEGACY_SOURCE;
        if (id === entry) return `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';import {AuthForm} from '/apps/web/src/app/LegacyAuthForm.tsx';import {AcquisitionAnalytics} from '/apps/web/src/app/AcquisitionAnalytics.tsx';function View(){const [mode,setMode]=useState('register');return h('main',null,h(AuthForm,{mode,onModeChange:setMode,focusRequest:0,onAvailabilityChange(){}}),h(AcquisitionAnalytics,{counter:123456}))}createRoot(document.getElementById('root')).render(h(View));`;
      }, configureServer(server) { server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/legacy')) return next();
        res.setHeader('Content-Type', 'text/html'); res.end(await server.transformIndexHtml('/legacy', '<!doctype html><html lang="ru"><head><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root"></div><script type="module" src="/@id/__x00__legacy-entry"></script></body></html>'));
      }); } }],
  }); await vite.listen();
  execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(temp, 'key.pem'), '-out', join(temp, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { stdio: 'pipe' });
  const vitePort = (vite.httpServer!.address() as import('node:net').AddressInfo).port;
  proxy = createHttpsServer({ key: readFileSync(join(temp, 'key.pem')), cert: readFileSync(join(temp, 'cert.pem')) }, (req, res) => {
    const isLegacy = /^\/(legacy|@|apps\/|node_modules\/)/.test(req.url ?? '');
    const upstream = httpRequest({ hostname: '127.0.0.1', port: isLegacy ? vitePort : 3450, path: req.url, method: req.method,
      headers: { ...req.headers, 'x-forwarded-for': '198.51.100.7, 10.0.0.2, 10.0.0.3', 'x-forwarded-proto': 'https' } }, response => { res.writeHead(response.statusCode!, response.headers); response.pipe(res); });
    upstream.on('error', () => { res.writeHead(502); res.end(); }); req.pipe(upstream);
  }); await new Promise<void>(resolve => proxy.listen(3449, '127.0.0.1', resolve));
}, 60000);
afterAll(async () => {
  if (proxy) { proxy.closeAllConnections(); await new Promise<void>(resolve => proxy.close(() => resolve())); }
  await vite?.close();
  if (child && child.exitCode === null) { const stopped = once(child, 'exit'); child.kill('SIGTERM'); const timer = setTimeout(() => child?.kill('SIGKILL'), 4000); try { await stopped; } finally { clearTimeout(timer); } }
  await provider?.close();
  if (redis) {
    if (pool) for (const row of (await pool.query<{ id: string }>('SELECT id FROM account')).rows) identities.add(`account:${row.id}`);
    const keys = [...identities].flatMap(id => ['read', 'mutation'].map(kind => `n5:${kind}:rate:` + createHmac('sha256', secret).update(id).digest('hex'))); await redis.del(...keys); await redis.quit(); }
  if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  rmSync(temp, { recursive: true, force: true });
  expect(logs).not.toContain(password); expect(logs).not.toContain(secret);
}, 15000);

for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
  it(`HTTPS registration cookie survives protected reload ${name}`, async () => {
    const f = await context(engine);
    try {
      const email = `created-${randomUUID()}@example.invalid`; await f.page.goto(origin + '/#auth');
      await fill(f.page, email); const response = f.page.waitForResponse(r => r.url().endsWith('/api/auth/register'));
      await submit(f.page); await f.page.waitForURL(origin + '/dashboard');
      await f.page.getByRole('status').filter({ hasText: 'Аккаунт создан. Вы вошли.' }).waitFor();
      await assertCookie(f.jar, (await (await response).headerValue('set-cookie'))!); await assertInline(f.page);
      await expect.poll(f.counts).toEqual({ apply: 1, signup: 1 });
      const account = (await pool.query('SELECT id FROM account WHERE email=$1', [email])).rows[0]; identities.add(`account:${account.id}`);
      expect((await pool.query('SELECT count(*)::int AS n FROM credit_grant WHERE account_id=$1', [account.id])).rows[0].n).toBe(1);
      expect((await snapshot(account.id)).attribution[0].source).toBe('explicit');
      await f.page.reload(); expect(new URL(f.page.url()).pathname).toBe('/dashboard'); expect(await f.page.locator('.auth-flow-notice').count()).toBe(0);
      expect(await f.page.evaluate(() => document.cookie.includes('__Host-n5_session'))).toBe(false);
      const empty = await f.browser.newContext({ ignoreHTTPSErrors: true }); const page = await empty.newPage(); await page.goto(origin + '/dashboard'); await expect.poll(() => new URL(page.url()).pathname).toBe('/'); await page.locator('#auth-email').waitFor(); await empty.close();
      expect(provider.createKeys).toHaveLength(0);
    } finally { await close(f); }
  }, 60000);
  it(`existing registration shows notice after next and preserves account effects ${name}`, async () => {
    for (const [index, target] of ['/dashboard', '/upgrade?from=clip_card', `/upgrade/return?intent=${randomUUID()}`, 'https://evil.invalid/'].entries()) {
      const account = await seed(index % 2 === 0), before = await snapshot(account.id);
      const f = await context(engine, index % 2 ? 1440 : 390, index % 2 ? 'light' : 'dark');
      try {
        const next = target === '/dashboard' ? '' : `?next=${encodeURIComponent(target)}`;
        await f.page.goto(origin + '/' + next + '#auth'); await fill(f.page, account.email);
        const response = f.page.waitForResponse(r => r.url().endsWith('/api/auth/register')); await submit(f.page);
        const expected = target.startsWith('/upgrade') ? target : '/dashboard'; await f.page.waitForURL(origin + expected);
        await f.page.getByRole('status').filter({ hasText: 'Аккаунт уже существует. Вы вошли.' }).waitFor();
        await assertCookie(f.jar, (await (await response).headerValue('set-cookie'))!); await assertInline(f.page);
        expect(await snapshot(account.id)).toEqual(before); expect(f.counts()).toEqual({ apply: 0, signup: 0 });
        expect(await f.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (index === 0) {
          await f.page.getByRole('link', { name: 'Тарифы', exact: true }).click(); await f.page.waitForURL(origin + '/upgrade?from=partner_dashboard');
          await expect.poll(() => f.page.locator('.auth-flow-notice').count()).toBe(0);
          await f.page.getByRole('link', { name: 'Новая запись', exact: true }).click(); await f.page.waitForURL(origin + '/dashboard');
          expect(await f.page.locator('.auth-flow-notice').count()).toBe(0);
        } else { await f.page.getByRole('button', { name: 'Закрыть уведомление' }).click(); expect(await f.page.locator('.auth-flow-notice').count()).toBe(0); }
        await f.page.reload(); expect(new URL(f.page.url()).pathname).toBe(new URL(origin + expected).pathname); expect(await f.page.locator('.auth-flow-notice').count()).toBe(0);
        expect(await snapshot(account.id)).toEqual(before);
      } finally { await close(f); }
    }
    // Positive controls: explicit B can replace A; referral C can attach to an unattributed account.
    for (const explicit of [true, false]) {
      const account = await seed(explicit), f = await context(engine);
      try {
        await f.page.goto(origin + '/#auth'); await f.page.locator('.public-modes button').last().click(); await fill(f.page, account.email, password, explicit); await submit(f.page); await f.page.waitForURL(origin + '/dashboard');
        await expect.poll(f.counts).toEqual({ apply: 1, signup: 0 });
        const attribution = (await snapshot(account.id)).attribution[0];
        expect(attribution.source).toBe(explicit ? 'explicit' : 'cookie');
        expect((await pool.query('SELECT code FROM partner_code WHERE id=$1', [attribution.partner_code_id])).rows[0].code).toBe(explicit ? codeB : codeC);
      } finally { await close(f); }
    }
  }, 120000);
  it(`recovery round trip preserves email without persistence ${name}`, async () => {
    const account = await seed(), count = await sessions(account.id), f = await context(engine, 390, 'light');
    try {
      const next = '/upgrade?from=clip_card'; await f.page.goto(origin + '/?next=' + encodeURIComponent(next) + '#auth');
      await fill(f.page, account.email, 'incorrect-password', false); const wrongResponse = f.page.waitForResponse(r => r.url().endsWith('/api/auth/register')); await submit(f.page); expect((await wrongResponse).status()).toBe(409); await f.page.locator('#auth [role=alert]').waitFor();
      await expect.poll(() => f.page.locator('.public-modes button').last().getAttribute('aria-pressed')).toBe('true');
      expect(await f.page.locator('#auth-password').inputValue()).toBe(''); expect(await sessions(account.id)).toBe(count);
      expect((await f.jar.cookies()).some(item => item.name === '__Host-n5_session')).toBe(false);
      expect(await f.page.locator('html').getAttribute('data-theme')).toBe('light');
      if (evidence) {
        mkdirSync(evidence, { recursive: true, mode: 0o700 });
        for (const width of [390, 1440]) { await f.page.setViewportSize({ width, height: 1000 }); await f.page.screenshot({ path: join(evidence, `${name}-wrong-${width}-light.png`), fullPage: true }); }
        await f.page.setViewportSize({ width: 390, height: 1000 });
      }
      // Conflict focuses the empty password. Tab reaches the existing recovery link without a trap.
      await f.page.locator('#auth-password').focus();
      await f.page.keyboard.press('Tab'); await f.page.keyboard.press('Tab'); await f.page.keyboard.press('Tab');
      expect(await f.page.getByRole('link', { name: 'Забыли пароль?' }).evaluate(element => element === document.activeElement)).toBe(true);
      await f.page.keyboard.press('Enter'); await f.page.waitForURL(origin + '/forgot');
      await expect.poll(() => f.page.locator('[name=email]').inputValue()).toBe(account.email);
      await f.page.locator('[name=email]').focus(); await f.page.keyboard.press('Tab');
      expect(await f.page.locator('nav[aria-label="Доступ к аккаунту"]').getByRole('link', { name: 'Войти', exact: true }).evaluate(element => element === document.activeElement)).toBe(true);
      await f.page.keyboard.press('Enter');
      await f.page.locator('#auth-email').waitFor(); await expect.poll(() => f.page.locator('.public-modes button').last().getAttribute('aria-pressed')).toBe('true');
      await expect.poll(() => f.page.locator('#auth-email').inputValue()).toBe(account.email); expect(await f.page.locator('#auth-password').inputValue()).toBe('');
      expect(await f.page.locator('#auth-password').evaluate(element => element === document.activeElement)).toBe(true);
      expect(new URL(f.page.url()).searchParams.get('next')).toBe(next);
      expect(await f.page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain(account.email);
      expect(f.page.url()).not.toContain(encodeURIComponent(account.email)); await f.page.reload(); expect(await f.page.locator('#auth-email').inputValue()).toBe('');
    } finally { await close(f); }
  }, 60000);
  it(`auth notice follows approved inline layout ${name}`, async () => {
    const account = await seed();
    for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
      const f = await context(engine, width, theme);
      try {
        await f.page.goto(origin + '/#auth'); await fill(f.page, account.email, password, false); await submit(f.page); await f.page.waitForURL(origin + '/dashboard');
        await f.page.locator('.auth-flow-notice').waitFor();
        const actualTheme = await f.page.evaluate(() => ({ theme: document.documentElement.dataset.theme, background: getComputedStyle(document.body).backgroundColor }));
        expect(actualTheme).toEqual({ theme, background: theme === 'light' ? 'rgb(244, 244, 243)' : 'rgb(17, 17, 17)' });
        expect((await f.jar.cookies()).filter(cookie => cookie.name === 'n5_theme')).toHaveLength(1);
        await assertInline(f.page);
        if (evidence) { mkdirSync(evidence, { recursive: true, mode: 0o700 }); await f.page.screenshot({ path: join(evidence, `${name}-${width}-${theme}.png`), fullPage: true }); }
        // Falsifier: the former floating style must be rejected by this same geometry guard.
        const mutation = await f.page.addStyleTag({ content: '.auth-flow-notice { position: fixed !important; top: 0 !important; }' });
        await expect(assertInline(f.page)).rejects.toThrow(); await mutation.evaluate(element => element.parentNode?.removeChild(element)); await assertInline(f.page);
        await f.page.getByRole('button', { name: 'Закрыть уведомление' }).focus(); await f.page.keyboard.press('Enter'); expect(await f.page.locator('.auth-flow-notice').count()).toBe(0);
      } finally { await close(f); }
    }
  }, 120000);
  it(`legacy client cannot trigger repeat registration effects ${name}`, async () => {
    for (const attributed of [false, true]) for (const correct of [false, true]) {
      const account = await seed(attributed), before = await snapshot(account.id), count = await sessions(account.id), f = await context(engine);
      try {
        await f.page.goto(origin + '/legacy'); await fill(f.page, account.email, correct ? password : 'incorrect-password');
        const response = f.page.waitForResponse(r => r.url().endsWith('/api/auth/register')); await submit(f.page);
        expect((await response).status()).toBe(409); expect((await response).request().headers()['x-clipmkr-registration']).toBeUndefined();
        await f.page.locator('#auth [role=alert]').waitFor(); expect(f.counts()).toEqual({ apply: 0, signup: 0 });
        expect(await sessions(account.id)).toBe(count); expect(await snapshot(account.id)).toEqual(before);
        expect((await f.jar.cookies()).some(item => item.name === '__Host-n5_session')).toBe(false);
        expect((await response).headers()['set-cookie']).toBeUndefined();
      } finally { await close(f); }
    }
    const f = await context(engine);
    try {
      await f.page.goto(origin + '/legacy'); await fill(f.page, `legacy-created-${randomUUID()}@example.invalid`); await submit(f.page); await f.page.waitForURL(origin + '/dashboard');
      await expect.poll(f.counts).toEqual({ apply: 1, signup: 1 });
    } finally { await close(f); }
  }, 120000);
}
