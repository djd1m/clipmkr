import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { chromium, webkit, type Browser, type BrowserContext } from 'playwright';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import Redis from 'ioredis';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { ensureTestDatabase } from '../../scripts/test-db.mjs';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { allowRead, allowMutation } from '../../apps/web/src/server/rate-limit';
import { createBloggerOwnerHandler } from '../../apps/web/src/server/blogger-owner-handler';
import BloggerAdmin from '../../apps/web/src/app/dashboard/bloggers/BloggerAdmin';
import { domRules, textZoomRule, axeRule } from '../../scripts/responsive/rules.mjs';

// Настоящие React hydration → HTTP handler → сессия PostgreSQL → policy/report/audit.
// Только локальный HTTP-хост переводит fixture-cookie в production __Host-cookie:
// браузерное требование Secure к __Host требует HTTPS и проверяется живым CJM отдельно.
const databaseUrl = process.env.DATABASE_URL;
const redisUrl = process.env.REDIS_URL;
const schema = `blogger_browser_${randomBytes(8).toString('hex')}`;
const secret = 'isolated-blogger-browser-secret-20261102';
const fixtureCookie = 'blogger_fixture_session';
const entry = '\0blogger-cabinet-entry';
let pool: Pool, redis: Redis, server: ViteDevServer, origin: string;
let ownerToken: string, bloggerToken: string, normalToken: string;
const email = `blogger-${schema}@test.invalid`;

describe.skipIf(!databaseUrl || !redisUrl)('Кабинет блогеров: настоящий HTTP и PostgreSQL', () => {
  beforeAll(async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test') || !redisUrl) throw new Error('Нужен изолированный тестовый контур');
    await ensureTestDatabase(databaseUrl); pool = createPool(databaseUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
    redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    const auth = new AuthService(new PgAuthStore(pool), secret);
    ownerToken = await auth.register(`owner-${schema}@test.invalid`, 'StrongFixturePass-2026!', '127.0.0.0/24');
    bloggerToken = await auth.register(email, 'StrongFixturePass-2026!', '127.0.0.0/24');
    normalToken = await auth.register(`normal-${schema}@test.invalid`, 'StrongFixturePass-2026!', '127.0.0.0/24');
    await pool.query('UPDATE account SET owner_unlimited=true WHERE id=$1', [(await auth.authenticate(ownerToken))!.account_id]);
    const markup = renderToString(createElement(BloggerAdmin));
    server = await createServer({ configFile: false, root: process.cwd(), cacheDir: `/tmp/${schema}-vite`, esbuild: { jsx: 'automatic' },
      optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'] },
      resolve: { alias: { '@clipmaker/shared/upload': resolve('packages/shared/src/upload.ts') } },
      server: { host: '127.0.0.1', port: 0 },
      plugins: [{ name: 'blogger-cabinet-http-fixture', enforce: 'pre',
        resolveId(id) { if (id === entry) return entry; },
        load(id) { if (id === entry) return `import {createElement,useEffect,Fragment} from 'react'; import {hydrateRoot} from 'react-dom/client';
          import BloggerAdmin from '/apps/web/src/app/dashboard/bloggers/BloggerAdmin.tsx';
          function Ready(){useEffect(()=>{window.ownerReady=true},[]);return null;} hydrateRoot(document.getElementById('root'),createElement(Fragment,null,createElement(BloggerAdmin),createElement(Ready)));`; },
        configureServer(vite) {
          vite.middlewares.use('/api/owner/bloggers', async (req, res) => {
            try {
              const headers = new Headers();
              for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
              headers.set('x-forwarded-for', '127.0.0.1,127.0.0.1');
              headers.set('cookie', (headers.get('cookie') ?? '').replace(`${fixtureCookie}=`, '__Host-n5_session='));
              const parts: Buffer[] = []; for await (const chunk of req) parts.push(Buffer.from(chunk));
              const request = new Request(`${origin}/api/owner/bloggers${req.url ?? ''}`, {
                method: req.method, headers, ...(req.method === 'POST' ? { body: Buffer.concat(parts) } : {}),
              });
              const response = await createBloggerOwnerHandler({ pool, publicOrigin: origin, trustedProxyHops: 1,
                authenticate: token => auth.authenticate(token),
                allowRead: (ip, account) => allowRead(redis, ip, secret, account),
                allowMutation: (ip, account) => allowMutation(redis, ip, secret, account),
              })(request);
              res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value));
              res.end(await response.text());
            } catch { res.statusCode = 500; res.end('fixture failure'); }
          });
          vite.middlewares.use('/fixture.html', async (_req, res) => {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="dark"><head>
              <title>КлипМейкер — кабинет блогеров</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
              <link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div class="workspace-shell"><main class="container"><div id="root">${markup}</div></main></div>
              <script type="module" src="/@id/__x00__blogger-cabinet-entry"></script></body></html>`));
          });
        },
      }],
    });
    await server.listen(); const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Нет HTTP-порта');
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await server?.close(); await redis?.quit();
    if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
  });
  async function session(browser: Browser, token?: string): Promise<BrowserContext> {
    const context = await browser.newContext();
    if (token) await context.addCookies([{ name: fixtureCookie, value: token, url: origin }]);
    return context;
  }
  for (const [name, engine] of Object.entries({ chromium, webkit })) describe(name, () => {
    let browser: Browser;
    beforeAll(async () => { browser = await engine.launch(); });
    afterAll(async () => { await browser?.close(); });
    it('владелец находит аккаунт, назначает лимит и видит сохранённые настройки после перезагрузки', async () => {
      const context = await session(browser, ownerToken); const page = await context.newPage();
      try {
        await page.goto(`${origin}/fixture.html`); await page.waitForFunction(() => Reflect.get(window, 'ownerReady') === true);
        await page.getByRole('button', { name: 'Отчёт за месяц →' }).click();
        await expect.poll(() => page.getByText(/^Отчёт:/).count()).toBe(1);
        await page.getByRole('button', { name: '← К управлению блогерами' }).click();
        await page.getByLabel('Email зарегистрированного аккаунта').fill(email);
        await page.getByRole('button', { name: 'Найти аккаунт' }).click();
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Аккаунт найден');
        await page.getByLabel('Блогер, распространяющий продукт').check();
        await page.getByText('Дополнительные настройки', { exact: true }).click();
        await page.getByLabel('Индивидуальный лимит, минут').fill('150');
        await page.getByLabel('Ставка вознаграждения').selectOption('30');
        await page.getByLabel('Причина изменения').fill('Индивидуальная договорённость');
        await page.getByRole('button', { name: 'Сохранить настройки' }).click();
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Лимит новых записей: 150 минут');
        await page.reload(); await page.waitForFunction(() => Reflect.get(window, 'ownerReady') === true);
        await page.getByLabel('Email зарегистрированного аккаунта').fill(email);
        await page.getByRole('button', { name: 'Найти аккаунт' }).click();
        await expect.poll(() => page.getByLabel('Индивидуальный лимит, минут').inputValue()).toBe('150');
        await page.getByText('Дополнительные настройки', { exact: true }).click();
        expect(await page.getByLabel('Ставка вознаграждения').inputValue()).toBe('30');
        await page.getByLabel('Причина изменения').focus(); await page.keyboard.press('Tab');
        expect(await page.getByRole('button', { name: 'Сохранить настройки' }).evaluate(el => el === document.activeElement)).toBe(true);
        mkdirSync('tests/artifacts/blogger-cabinet', { recursive: true });
        for (const theme of ['dark', 'light']) for (const width of [320, 375, 1440]) {
          await page.setViewportSize({ width, height: 900 });
          await page.locator('html').evaluate((html, value) => { html.dataset.theme = value; }, theme);
          expect((await domRules(page)).filter((finding: { severity: string }) => finding.severity === 'error')).toEqual([]);
          expect(await textZoomRule(page)).toEqual([]);
          expect((await axeRule(page)).filter((finding: { severity: string }) => finding.severity === 'error')).toEqual([]);
          await page.screenshot({ path: `tests/artifacts/blogger-cabinet/${name}-${theme}-${width}.png`, fullPage: true });
        }
      } finally { await context.close(); }
    }, 90_000);
    it('сохранение остаётся успешным при сбое обновления отчёта', async () => {
      const context = await session(browser, ownerToken); const page = await context.newPage();
      try {
        await page.goto(`${origin}/fixture.html`); await page.waitForFunction(() => Reflect.get(window, 'ownerReady') === true);
        await page.getByRole('button', { name: 'Отчёт за месяц →' }).click();
        await expect.poll(() => page.getByText(/^Отчёт:/).count()).toBe(1);
        await page.getByRole('button', { name: '← К управлению блогерами' }).click();
        await page.getByLabel('Email зарегистрированного аккаунта').fill(email);
        await page.getByRole('button', { name: 'Найти аккаунт' }).click();
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Аккаунт найден');
        await page.getByText('Дополнительные настройки', { exact: true }).click();
        await page.getByLabel('Индивидуальный лимит, минут').fill('160');
        await page.getByLabel('Причина изменения').fill('Проверка сбоя обновления статистики');
        // Только зависимость обновления отчёта возвращает 503; POST и запись audit настоящие.
        await page.route('**/api/owner/bloggers?month=*', route => route.fulfill({
          status: 503, json: { error: { message: 'Статистика временно недоступна' } },
        }), { times: 1 });
        await page.getByRole('button', { name: 'Сохранить настройки' }).click();
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Настройки сохранены');
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Не удалось обновить статистику');
        expect((await pool.query('SELECT blogger_source_limit_seconds FROM account WHERE email=$1', [email])).rows[0].blogger_source_limit_seconds).toBe(9600);
        expect((await pool.query("SELECT count(*)::int n FROM operator_action WHERE reason LIKE '%Проверка сбоя обновления статистики%'")).rows[0].n).toBeGreaterThan(0);
      } finally { await context.close(); }
    });
    it('hidden_policy_invalid / owner_report_approved_screen', async () => {
      const context = await session(browser, ownerToken); const page = await context.newPage(); let posts = 0;
      page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/api/owner/bloggers')) posts++; });
      try {
        await page.goto(`${origin}/fixture.html`); await page.waitForFunction(() => Reflect.get(window, 'ownerReady') === true);
        await page.getByLabel('Email зарегистрированного аккаунта').fill(email); await page.getByRole('button', { name: 'Найти аккаунт' }).click();
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Аккаунт найден');
        await page.getByLabel('Причина изменения').fill('Явный сброс индивидуального лимита');
        for (const invalid of ['1', '1441', '2.5']) {
          const details = page.locator('details').filter({ has: page.getByLabel('Индивидуальный лимит, минут') });
          if (!await details.evaluate((node: HTMLDetailsElement) => node.open)) await details.locator('summary').click();
          await page.getByLabel('Индивидуальный лимит, минут').fill(invalid); await details.locator('summary').click();
          await page.getByRole('button', { name: 'Сохранить настройки' }).click();
          expect(await details.evaluate((node: HTMLDetailsElement) => node.open)).toBe(true);
          expect(await page.getByLabel('Индивидуальный лимит, минут').evaluate(node => node === document.activeElement)).toBe(true); expect(posts).toBe(0);
        }
        await page.getByRole('button', { name: 'Отчёт за месяц →' }).click(); expect(await page.locator('#blogger-email').count()).toBe(0);
        await page.getByRole('button', { name: '← К управлению блогерами' }).click();
        expect(await page.getByLabel('Индивидуальный лимит, минут').inputValue()).toBe('2.5');
        await page.getByText('Дополнительные настройки', { exact: true }).click(); await page.getByLabel('Индивидуальный лимит, минут').fill('');
        await page.getByRole('button', { name: 'Сохранить настройки' }).click(); await expect.poll(() => posts).toBe(1);
        await expect.poll(() => page.getByRole('status').textContent()).toContain('Настройки сохранены');
        expect((await pool.query('SELECT blogger_source_limit_seconds FROM account WHERE email=$1', [email])).rows[0].blogger_source_limit_seconds).toBe(null);
      } finally { await context.close(); }
    });
    it('отказывает гостю, обычному пользователю, блогеру и чужому Origin', async () => {
      for (const [token, status] of [[undefined, 401], [normalToken, 403], [bloggerToken, 403]] as const) {
        const context = await session(browser, token);
        try { expect((await context.request.get(`${origin}/api/owner/bloggers`)).status()).toBe(status); }
        finally { await context.close(); }
      }
      const context = await session(browser, ownerToken);
      try {
        expect((await context.request.post(`${origin}/api/owner/bloggers`, { headers: { Origin: 'https://foreign.test.invalid' }, data: {} })).status()).toBe(403);
        expect((await context.request.post(`${origin}/api/owner/bloggers`, { headers: { Origin: origin }, data: { owner_unlimited: true } })).status()).toBe(422);
      } finally { await context.close(); }
    });
  });
});
