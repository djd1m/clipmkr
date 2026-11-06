import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';
import { mkdirSync, readFileSync } from 'node:fs';
import Dashboard from '../../apps/web/src/app/dashboard/page';
import { WorkspaceHeader } from '../../apps/web/src/app/WorkspaceHeader';
import { PartnerPanel } from '../../apps/web/src/app/dashboard/PartnerPanel';
import { VideoUploader } from '../../apps/web/src/app/upload/Uploader';
import { WorkspaceSettings, WorkspacePreferenceSync } from '../../apps/web/src/app/WorkspaceSettings';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
import { chromium, webkit, type Browser, type BrowserContext } from 'playwright';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import Redis from 'ioredis';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { ensureTestDatabase } from '../../scripts/test-db.mjs';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { PartnerService } from '../../apps/web/src/server/partner';
import { allowMutation } from '../../apps/web/src/server/rate-limit';
import { getBloggerPolicy } from '../../packages/db/src/blogger-policy';
const fixture = vi.hoisted(() => ({ runtime: {} as Record<string, unknown>, ssrAccount: '' }));
vi.mock('../../apps/web/src/server/upload-runtime', () => ({ getUploadRuntime: () => fixture.runtime }));
vi.mock('../../apps/web/src/server/screen-runtime', () => ({ getScreenRuntime: () => fixture.runtime }));
vi.mock('../../apps/web/src/server/page-account', () => ({ pageAccount: async () => fixture.ssrAccount }));
vi.mock('../../apps/web/src/server/erasure-page', () => ({ erasurePageState: async () => null }));
vi.mock('../../apps/web/src/server/dashboard-summary', () => ({ readDashboardSummary: async () => ({ max_source_seconds:7200, uploads:2, minutes:120, selections:5, resets_at:'2026-11-06T00:00:00Z', credits:{available_seconds:7200,reserved_seconds:0,next_expiry:null} }) }));
// Actual production HTTP adapter and router, service, SQL and authentication.
import { POST, GET } from '../../apps/web/src/app/api/trpc/[trpc]/route';
const databaseUrl = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
const schema = `auto_link_${randomBytes(8).toString('hex')}`, secret = 'isolated-personal-link-browser';
const cookie = 'auto_link_fixture', entry = '\0auto-link-entry';
let pool: Pool, redis: Redis, server: ViteDevServer, origin: string, auth: AuthService;
let calls = 0;
describe.skipIf(!databaseUrl || !redisUrl)('Личная ссылка: React → HTTP → PostgreSQL', () => {
  beforeAll(async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test') || !redisUrl) throw new Error('Requires isolated test resources');
    await ensureTestDatabase(databaseUrl); pool = createPool(databaseUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool); redis = new Redis(redisUrl, { maxRetriesPerRequest: 1 });
    auth = new AuthService(new PgAuthStore(pool), secret);
    const aliases = Object.fromEntries(['upload','enums','cta','tariff','music-catalog'].map(name => [`@clipmaker/shared/${name}`, resolve(`packages/shared/src/${name}.ts`)]));
    server = await createServer({ configFile: false, root: process.cwd(), cacheDir: `/tmp/${schema}-vite`, esbuild: { jsx: 'automatic' },
      optimizeDeps: { include: ['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime'], exclude: ['next/navigation','next/link'] }, resolve: { alias: aliases },
      server: { host: '127.0.0.1', port: 0, watch: { ignored: ['**/.next/**','**/dist/**'] } },
      plugins: [{ name: 'personal-link-http', enforce: 'pre', resolveId(id) { if (id === entry || id === 'next/navigation') return id; if(id === 'next/link') return '\0personal-link-anchor'; },
        load(id) {
          if (id === '\0personal-link-anchor') return `import React from 'react';export default function Link(props){return React.createElement('a',props);}`;
          if (id === 'next/navigation') return 'export const useRouter=()=>({push(){},refresh(){}});';
          if (id === entry) return `import {createElement as h} from 'react';import {hydrateRoot} from 'react-dom/client';
            import {PartnerPanel} from '/apps/web/src/app/dashboard/PartnerPanel.tsx';
            import {VideoUploader} from '/apps/web/src/app/upload/Uploader.tsx';
            import {WorkspaceSettings,WorkspacePreferenceSync} from '/apps/web/src/app/WorkspaceSettings.tsx';
            const props=window.fixtureProps;
            hydrateRoot(document.getElementById('root'),h('div',{className:'workspace-shell'},
              h(WorkspacePreferenceSync,{initialLayout:'workspace',initialTheme:'dark'}),h(WorkspaceSettings,{initialLayout:'workspace',initialTheme:'dark'}),
              h('div',{className:'workspace-upload workspace-personal'},h('div',{className:'workspace-main'},h(VideoUploader,{accountScope:props.account,maxSourceSeconds:props.personal?7200:5400})),
              h('aside',{className:'workspace-aside'},h(PartnerPanel,{personal:props.personal,publicOrigin:props.origin})),h('div',{className:'workspace-records-region'},'Последние записи'))));`;
        }, configureServer(vite) {
          vite.middlewares.use('/api/trpc', async (req, res) => {
            try {
              const headers = new Headers(); for (const [key, value] of Object.entries(req.headers)) if (value) headers.set(key, Array.isArray(value) ? value.join(',') : value);
              headers.set('cookie', (headers.get('cookie') ?? '').replace(`${cookie}=`, '__Host-n5_session=')); headers.set('x-forwarded-for', '127.0.0.1,127.0.0.1');
              const parts: Buffer[] = []; for await (const chunk of req) parts.push(Buffer.from(chunk));
              const request = new Request(`${origin}/api/trpc${req.url}`, { method: req.method, headers, ...(req.method === 'POST' ? { body: Buffer.concat(parts) } : {}) });
              if (req.url?.includes('ensurePersonalLink')) calls++;
              const response = await (req.method === 'POST' ? POST : GET)(request);
              res.statusCode = response.status; response.headers.forEach((value, key) => res.setHeader(key, value)); res.end(await response.text());
            } catch { res.statusCode = 500; res.end('fixture failure'); }
          });
          vite.middlewares.use('/fixture.html', async (req, res) => {
            const token = req.headers.cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(cookie + '='))?.slice(cookie.length + 1);
            const session = token ? await auth.authenticate(token) : null;
            const policy = session ? await getBloggerPolicy(pool, session.account_id) : null;
            const ordinary = req.url?.includes('ordinary');
            const props = { personal: !ordinary && policy?.is_blogger === true, account: session?.account_id ?? '', origin };
            const markup = renderToString(h('div', { className: 'workspace-shell' },
              h(WorkspacePreferenceSync, { initialLayout:'workspace', initialTheme:'dark' }), h(WorkspaceSettings, { initialLayout:'workspace', initialTheme:'dark' }),
              h('div', { className:'workspace-upload workspace-personal' }, h('div', { className:'workspace-main' }, h(VideoUploader, { accountScope:props.account, maxSourceSeconds:props.personal?7200:5400 })),
                h('aside', { className:'workspace-aside' }, h(PartnerPanel, { personal:props.personal, publicOrigin:origin })), h('div', { className:'workspace-records-region' }, 'Последние записи'))));
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="dark" data-workspace-layout="workspace"><head><title>Личная ссылка</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><main class="container"><div id="root">${markup}</div></main><script>window.fixtureProps=${JSON.stringify(props)}</script><script type="module" src="/@id/__x00__auto-link-entry"></script></body></html>`));
          });
        } }],
    });
    await server.listen(); const address = server.httpServer?.address(); if (!address || typeof address === 'string') throw new Error('No port'); origin = `http://127.0.0.1:${address.port}`;
    fixture.runtime = { pool, redis, partners: new PartnerService(pool, secret), auth, publicOrigin: origin, trustedProxyHops: 1,
      screen: { list: async () => ({ videos:[], next_cursor:null }) },
      config: { publicOrigin: origin, trustedProxyHops: 1, sessionSecret: secret, payments:{mode:'off'} },
      allowMutation: (ip: string, account?: string) => allowMutation(redis, ip, secret, account) };
  }, 60_000);
  afterAll(async () => { await server?.close(); await redis?.quit(); if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  async function account(blogger = true) {
    const token = await auth.register(`${randomUUID()}@test.invalid`, 'StrongFixturePass-2026!', '127.0.0.0/24');
    const id = (await auth.authenticate(token))!.account_id;
    await pool.query('UPDATE account SET is_blogger=$2 WHERE id=$1', [id, blogger]); return { token, id };
  }
  async function session(browser: Browser, token: string) {
    const context = await browser.newContext(); await context.addCookies([{ name: cookie, value: token, url: origin }]); return context;
  }
  const post = async (context: BrowserContext) => {
    const response = await context.request.post(`${origin}/api/trpc/partner.ensurePersonalLink`, { headers: { Origin: origin }, data: {} });
    expect(response.status()).toBe(202); return (await response.json()).result.data.data;
  };
  for (const [name, engine] of Object.entries({ chromium, webkit })) describe(name, () => {
    let browser: Browser;
    beforeAll(async () => { browser = await engine.launch(); });
    afterAll(async () => { await browser?.close(); });
    it('actual SSR dashboard keeps studio upload action on the 768px first screen', async () => {
      const own = await account(); fixture.ssrAccount = own.id;
      const element = await Dashboard({ searchParams:Promise.resolve({}) });
      const markup = renderToString(h('div', { className:'workspace-shell' },
        h(WorkspaceHeader, { owner:false,balanceLabel:'120 кредитов',initialLayout:'workspace',initialTheme:'dark' }),
        h('main', { className:'container' }, element)));
      expect(markup.match(/id="source-file"/g)).toHaveLength(1);
      expect(markup.match(/class="personal-link-panel"/g)).toHaveLength(1);
      expect((await pool.query('SELECT * FROM partner WHERE account_id=$1', [own.id])).rows).toEqual([]);
      const ordinary = await account(false); fixture.ssrAccount = ordinary.id;
      expect(renderToString(await Dashboard({ searchParams:Promise.resolve({}) }))).not.toContain('personal-link-panel');
      const context = await browser.newContext(), page = await context.newPage();
      try {
        for (const layout of ['workspace','studio']) for (const theme of ['dark','light']) for (const width of [390,1440]) {
          const height = width === 1440 ? 768 : 844;
          await page.setViewportSize({ width,height });
          await page.setContent(`<!doctype html><html lang="ru" data-theme="${theme}" data-workspace-layout="${layout}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${readFileSync('apps/web/src/app/globals.css','utf8')}</style></head><body>${markup}</body></html>`);
          const action = (await page.getByRole('button', { name:'Создать клипы →',exact:true }).boundingBox())!;
          console.log('actual SSR CTA', name,layout,theme,width, JSON.stringify({bottom:action.y+action.height,height}));
          expect.soft(action.y+action.height, `${name}/${layout}/${theme}/${width}`).toBeLessThanOrEqual(height);
          expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
          if (width === 1440 && layout === 'studio') {
            expect.soft(await page.locator('.studio-upload').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(1);
            expect.soft(await page.locator('.upload-panel .studio-preview').isVisible()).toBe(false);
          }
          mkdirSync('tests/artifacts/blogger-auto-link/rework', { recursive:true });
          await page.screenshot({path:`tests/artifacts/blogger-auto-link/rework/${name}-ssr-${layout}-${theme}-${width}.png`,fullPage:true});
        }
      } finally { await context.close(); }
    });
    it('clipboard denial selects the requested personal or campaign URL in every mode', async () => {
      for (const state of ['both-active','personal-blocked','ordinary']) {
        const own = await account(state !== 'ordinary'), service = new PartnerService(pool,secret);
        const personal = state === 'ordinary' ? await service.createCode(own.id,{code:randomBytes(6).toString('hex')}) : await service.ensurePersonalLink(own.id);
        await pool.query("UPDATE partner_code SET created_at='2020-01-01' WHERE id=$1", [personal.id]);
        const campaign = await service.createCode(own.id,{code:randomBytes(6).toString('hex')});
        if (state === 'personal-blocked') await pool.query("UPDATE partner_code SET status='blocked',blocked_reason='manual' WHERE id=$1", [personal.id]);
        const context = await session(browser,own.token), page = await context.newPage();
        try {
          await page.addInitScript(() => Object.defineProperty(navigator,'clipboard',{value:{writeText:async()=>{throw new Error('denied');}}}));
          await page.goto(`${origin}/fixture.html`);
          if (state !== 'ordinary') {
            await page.getByLabel('Личная ссылка').waitFor();
            if (state === 'both-active') {
              await page.getByRole('button',{name:'Копировать ссылку',exact:true}).click();
              const selected = await page.getByLabel('Личная ссылка').evaluate(el => { const field=el as HTMLTextAreaElement; return field.value.slice(field.selectionStart,field.selectionEnd); });
              expect(selected).toBe(`${origin}/r/${personal.code}`);
            } else expect(await page.getByRole('button',{name:'Копировать ссылку',exact:true}).isDisabled()).toBe(true);
            await page.getByText('Статистика и прежние ссылки',{exact:true}).click();
          }
          await page.getByRole('button',{name:`Копировать ссылку ${campaign.code}`,exact:true}).click();
          await expect.poll(() => page.locator('section[aria-labelledby="partner-title"] > [role=status]').textContent()).toContain('Не удалось скопировать');
          const selected = await page.evaluate(() => { const el=document.activeElement; return el instanceof HTMLTextAreaElement ? el.value.slice(el.selectionStart,el.selectionEnd) : window.getSelection()?.toString(); });
          expect.soft(selected, `${name}/${state} selected action URL`).toBe(`${origin}/r/${campaign.code}`);
          if (state !== 'ordinary') {
            expect(await page.getByLabel('Личная ссылка').inputValue()).toBe(`${origin}/r/${personal.code}`);
            await page.getByLabel('Статистика по ссылке').selectOption(campaign.id);
            await expect.poll(() => page.locator('.partner-code').count()).toBe(1);
            expect(await page.getByLabel('Личная ссылка').inputValue()).toBe(`${origin}/r/${personal.code}`);
          }
        } finally { await context.close(); }
      }
    });
    it('readonly personal URL retains a 16px minimum and reflow at 200 percent text', async () => {
      const own=await account(), context=await session(browser,own.token), page=await context.newPage();
      try {
        await page.goto(`${origin}/fixture.html`); const field=page.getByLabel('Личная ссылка'); await field.waitFor();
        await page.locator('.workspace-settings > summary').click();
        for (const layout of ['workspace','studio']) for (const theme of ['dark','light']) {
          await page.getByLabel('Компоновка').selectOption(layout);
          const toggle=page.getByRole('button',{name:'Светлая тема',exact:true});
          if ((await toggle.getAttribute('aria-pressed')==='true') !== (theme==='light')) await toggle.click();
          for (const zoom of ['100%','200%']) {
            await page.locator('html').evaluate((el,value)=>{el.style.fontSize=value;},zoom);
            await page.setViewportSize({width:zoom==='100%'?390:320,height:1000});
            expect.soft(await field.evaluate(el=>parseFloat(getComputedStyle(el).fontSize)),`${name}/${layout}/${theme}/${zoom} font`).toBeGreaterThanOrEqual(16);
            expect(await field.evaluate(el=>(el as HTMLTextAreaElement).readOnly && el.scrollWidth<=el.clientWidth)).toBe(true);
            await field.focus();
            expect(await field.evaluate(el=>{const text=el as HTMLTextAreaElement;return text.selectionStart===0 && text.selectionEnd===text.value.length;})).toBe(true);
            expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          }
        }
      } finally { await context.close(); }
    });
    it('blogger auto link keeps identity across reload and filter', async () => {
      const own = await account(), context = await session(browser, own.token), page = await context.newPage();
      try {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => { Object.assign(window, { copied: text }); } } }));
        await page.goto(`${origin}/fixture.html`);
        const url = page.getByLabel('Личная ссылка'); await expect.poll(() => url.inputValue()).toMatch(/\/r\/[A-Za-z0-9_-]{12}$/);
        expect(await page.getByLabel('Код блогера').count()).toBe(0);
        expect(await page.getByRole('button', { name:'Создать ссылку', exact:true }).count()).toBe(0);
        mkdirSync('tests/artifacts/blogger-auto-link', { recursive:true });
        for (const width of [390,1440]) { await page.setViewportSize({ width,height:900 }); await page.screenshot({ path:`tests/artifacts/blogger-auto-link/${name}-first-open-${width}.png`,fullPage:true }); }
        const first = await url.inputValue(); await page.getByRole('button', { name: 'Копировать ссылку', exact: true }).click();
        expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toBe(first);
        await page.keyboard.press('Tab');
        expect(await page.locator('.personal-link-statistics > summary').evaluate(el => el === document.activeElement)).toBe(true);
        await page.reload(); await expect.poll(() => url.inputValue()).toBe(first);
        await page.getByText('Статистика и прежние ссылки', { exact: true }).click();
        await expect.poll(() => page.locator('#blogger-filter option').count()).toBe(2);
        await page.getByLabel('Статистика по ссылке').selectOption({ index: 1 }); expect(await url.inputValue()).toBe(first);
        expect((await pool.query('SELECT count(*) FROM partner_code c JOIN partner p ON p.id=c.partner_id WHERE p.account_id=$1', [own.id])).rows[0].count).toBe('1');
      } finally { await context.close(); }
    });
    it('normal dashboard mount never calls auto link mutation', async () => {
      const own = await account(false), context = await session(browser, own.token), page = await context.newPage(), before = calls;
      try {
        await page.goto(`${origin}/fixture.html`); await page.getByLabel('Код блогера').waitFor();
        expect(calls).toBe(before); expect((await pool.query('SELECT * FROM partner WHERE account_id=$1', [own.id])).rows).toEqual([]);
      } finally { await context.close(); }
    });
    it('two blogger HTTP sessions keep personal link ownership isolated', async () => {
      const a = await account(), b = await account(), ca = await session(browser, a.token), cb = await session(browser, b.token);
      try {
        const firstA = await post(ca), firstB = await post(cb);
        expect(firstA.id).not.toBe(firstB.id); expect(firstA.code).not.toBe(firstB.code);
        const repeated = await Promise.all(Array.from({ length: 20 }, (_, n) => post(n % 2 ? ca : cb)));
        repeated.forEach((row, n) => expect(row).toEqual(n % 2 ? firstA : firstB));
        for (const [context, own, foreign] of [[ca, firstA, firstB], [cb, firstB, firstA]] as const) {
          const dashboard = await context.request.get(`${origin}/api/trpc/partner.dashboard?input=%7B%7D`);
          expect((await dashboard.json()).result.data.data.codes.map((row: { id: string }) => row.id)).toEqual([own.id]);
          const denied = await context.request.get(`${origin}/api/trpc/partner.dashboard?input=${encodeURIComponent(JSON.stringify({ code_id: foreign.id }))}`);
          expect(denied.status()).toBe(403); expect(await denied.text()).not.toContain(foreign.code);
          const page = await context.newPage(); await page.goto(`${origin}/fixture.html`); await expect.poll(() => page.getByLabel('Личная ссылка').inputValue()).toContain(own.code);
        }
        const owners = (await pool.query('SELECT c.id,p.account_id FROM partner_code c JOIN partner p ON p.id=c.partner_id WHERE p.account_id=ANY($1::uuid[]) ORDER BY p.account_id', [[a.id,b.id]])).rows;
        expect(owners).toHaveLength(2); expect(owners).toContainEqual({ id: firstA.id, account_id: a.id }); expect(owners).toContainEqual({ id: firstB.id, account_id: b.id });
      } finally { await ca.close(); await cb.close(); }
    }, 60_000);
    it('blocked personal link cannot be copied from expanded campaigns', async () => {
      const own = await account(), service = new PartnerService(pool, secret), personal = await service.ensurePersonalLink(own.id);
      await pool.query("UPDATE partner_code SET created_at='2020-01-01' WHERE id=$1", [personal.id]);
      const campaign = await service.createCode(own.id, { code: randomBytes(6).toString('hex') });
      await pool.query("UPDATE partner_code SET status='blocked',blocked_reason='manual' WHERE id=$1", [personal.id]);
      const subscribers = await Promise.all([account(false),account(false),account(false)]);
      for (let n=0; n<subscribers.length; n++) await pool.query(`INSERT INTO attribution(account_id,partner_code_id,source,status)
        VALUES($1,$2,$3,$4)`, [subscribers[n]!.id,n<2?personal.id:campaign.id,n<2?'cookie':'explicit',n<2?'pending':'activated']);
      const history = (await pool.query('SELECT * FROM attribution WHERE account_id=ANY($1::uuid[]) ORDER BY id', [subscribers.map(row=>row.id)])).rows;
      const context = await session(browser, own.token), page = await context.newPage();
      try {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (text: string) => Object.assign(window, { copied: text }) } }));
        await page.goto(`${origin}/fixture.html`); await expect.poll(() => page.getByRole('button', { name: 'Копировать ссылку', exact: true }).isDisabled()).toBe(true);
        await page.getByText('Статистика и прежние ссылки', { exact: true }).click();
        await expect.poll(() => page.locator('.partner-code').count()).toBe(2);
        expect(await page.getByRole('button', { name: `Копировать ссылку ${personal.code}`, exact: true }).count()).toBe(0);
        await page.getByRole('button', { name: `Копировать ссылку ${campaign.code}`, exact: true }).click();
        expect(await page.evaluate(() => (window as Window & { copied?: string }).copied)).toContain(campaign.code);
        expect(await page.locator('.partner-counters div').filter({ has:page.locator('dt', { hasText:'Регистрации' }) }).locator('dd').textContent()).toBe('3');
        expect(await page.locator('.partner-code').filter({ hasText:personal.code }).textContent()).toContain('Переход по ссылке · Ожидают первого выпуска: 2');
        expect(await page.locator('.partner-code').filter({ hasText:campaign.code }).textContent()).toContain('Явный код · Первый выпуск готов: 1');
        expect((await pool.query('SELECT * FROM attribution WHERE account_id=ANY($1::uuid[]) ORDER BY id', [subscribers.map(row=>row.id)])).rows).toEqual(history);
        await page.goto(`${origin}/fixture.html?ordinary`);
        await expect.poll(() => page.getByRole('button', { name: `Копировать ссылку ${personal.code}`, exact: true }).count()).toBe(1);
      } finally { await context.close(); }
    });
    it('blocked personal link keeps statistics without copy', async () => {
      const own = await account(), result = await new PartnerService(pool, secret).ensurePersonalLink(own.id);
      await pool.query("UPDATE partner_code SET status='blocked',blocked_reason='antifraud_ip_burst' WHERE id=$1", [result.id]);
      const context = await session(browser, own.token), page = await context.newPage();
      try { await page.goto(`${origin}/fixture.html`); await expect.poll(() => page.getByLabel('Личная ссылка').inputValue()).toContain(result.code);
        expect(await page.getByRole('button', { name: 'Копировать ссылку', exact: true }).isDisabled()).toBe(true);
        expect((await post(context)).id).toBe(result.id);
      } finally { await context.close(); }
    });
    it('personal link timeout retry and clipboard denial stay honest', async () => {
      const own = await account(), context = await session(browser, own.token), page = await context.newPage();
      try {
        await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('denied'); } } }));
        await page.route('**/api/trpc/partner.ensurePersonalLink', async route => { await new Promise(done => setTimeout(done, 11_000)); await route.continue().catch(() => {}); }, { times: 1 });
        await page.goto(`${origin}/fixture.html`); expect(await page.getByLabel('Личная ссылка').count()).toBe(0);
        await page.getByRole('button', { name: 'Повторить', exact: true }).waitFor({ timeout: 15_000 });
        await page.getByRole('button', { name: 'Повторить', exact: true }).click();
        await page.getByRole('button', { name: 'Копировать ссылку', exact: true }).click();
        await expect.poll(() => page.locator('.personal-link-panel > [role=status]').textContent()).toContain('Не удалось скопировать');
        expect(await page.getByLabel('Личная ссылка').evaluate(el => el === document.activeElement)).toBe(true);
        const ready = await page.getByLabel('Личная ссылка').inputValue();
        await page.waitForTimeout(1500); // Let the first delayed response finish after the successful retry.
        expect(await page.getByLabel('Личная ссылка').inputValue()).toBe(ready);
        expect((await pool.query('SELECT count(*) FROM partner_code c JOIN partner p ON p.id=c.partner_id WHERE p.account_id=$1', [own.id])).rows[0].count).toBe('1');
      } finally { await context.close(); }
    });
    it('personal link layout retains uploader through preferences', async () => {
      const own = await account(), context = await session(browser, own.token), page = await context.newPage();
      let release!: () => void; const gate = new Promise<void>(done => { release = done; }); let puts = 0, completes = 0;
      const uploadVideoId = randomUUID();
      try {
        await page.route('**/api/trpc/video.create', route => route.fulfill({ json: { result: { data: { data: { video_id: uploadVideoId, upload_id: 'fixture', part_size: 10 * 1024 * 1024,
          parts: [1,2,3,4].map(part_number => ({ part_number, url: `${origin}/fixture-put/${part_number}`, expires_at: new Date(Date.now()+60_000).toISOString() })), completed_parts: [] } } } } }));
        await page.route('**/fixture-put/*', async route => { puts++; if (route.request().url().endsWith('/4')) await gate; await route.fulfill({ headers: { etag: '"confirmed"' }, body: '' }).catch(() => {}); });
        await page.route('**/api/upload/complete', route => { completes++; return route.fulfill({status:202,json:{data:{video_id:uploadVideoId,status:'queued'}}}); });
        await page.goto(`${origin}/fixture.html`); await page.getByLabel('Личная ссылка').waitFor();
        const before = calls;
        await page.evaluate(() => {
          document.addEventListener('change', event => {
            const field = event.target as HTMLInputElement;
            if (field.id === 'source-file') Object.assign(window,{selectedUploadFile:field.files?.[0]});
          },true);
          const original = File.prototype.slice;
          File.prototype.slice = function(...args) { Object.assign(window,{slicedUploadFile:this}); return original.apply(this,args); };
        });
        await page.locator('#source-file').setInputFiles({ name: 'fixture.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(30 * 1024 * 1024 + 8,65) });
        await expect.poll(() => page.getByRole('button', { name: 'Создать клипы →', exact: true }).isEnabled(), { timeout: 15_000 }).toBe(true);
        await page.locator('#source-file').evaluate(el => Object.assign(window, { inputNode: el }));
        await page.getByRole('button', { name: 'Создать клипы →', exact: true }).click(); await expect.poll(() => puts, { timeout: 10_000 }).toBe(4);
        const progress = page.getByRole('progressbar'); await expect.poll(() => progress.getAttribute('value')).toBe(String(30 * 1024 * 1024));
        await page.locator('.workspace-settings > summary').click();
        for (const layout of ['workspace','studio']) for (const theme of ['dark','light']) {
          await page.getByLabel('Компоновка').selectOption(layout);
          const toggle = page.getByRole('button', { name:'Светлая тема', exact:true });
          if ((await toggle.getAttribute('aria-pressed') === 'true') !== (theme === 'light')) await toggle.click();
          expect(await page.locator('html').getAttribute('data-theme')).toBe(theme);
          expect(await page.locator('html').getAttribute('data-workspace-layout')).toBe(layout);
          for (const width of [320,390,1440]) {
            await page.setViewportSize({ width, height: 1000 });
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            const upload = (await page.locator('.upload-panel').boundingBox())!, card = (await page.locator('.personal-link-panel').boundingBox())!, records = (await page.locator('.workspace-records-region').boundingBox())!;
            if (width < 832) { expect(card.y).toBeGreaterThanOrEqual(upload.y + upload.height); expect(records.y).toBeGreaterThan(card.y); }
            else expect(card.x).toBeGreaterThanOrEqual(upload.x + upload.width);
            mkdirSync('tests/artifacts/blogger-auto-link', { recursive:true });
            await page.screenshot({ path:`tests/artifacts/blogger-auto-link/${name}-${layout}-${theme}-${width}.png`, fullPage:true });
          }
          expect(await page.locator('#source-file').evaluate(el => { const state = window as Window & { inputNode?: Element; selectedUploadFile?: File; slicedUploadFile?: File }; return el === state.inputNode && el.isConnected && state.selectedUploadFile instanceof File && state.slicedUploadFile === state.selectedUploadFile; })).toBe(true);
          expect(await progress.getAttribute('value')).toBe(String(30 * 1024 * 1024)); expect(calls).toBe(before);
        }
        await page.locator('html').evaluate(el => { el.style.fontSize = '200%'; }); await page.setViewportSize({ width:320,height:1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        expect((await page.getByRole('button', { name:'Копировать ссылку',exact:true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
        release();
        await expect.poll(() => completes).toBe(1);
        await expect.poll(() => page.locator('.upload-panel [role=status]').textContent()).toContain('Файл принят.');
        await expect.poll(() => progress.getAttribute('value')).toBe(String(30 * 1024 * 1024 + 8));
        expect(calls).toBe(before);
      } finally { release(); await context.close(); }
    }, 60_000);
  });
});
