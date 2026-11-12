// Mounted React components + real native browser controls. Не published/provider приёмка.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { runInNewContext } from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const source = readFileSync('scripts/check-mockup-ui-realization.mjs', 'utf8');
const functions = ['assertGeometry', 'assertPalette', 'assertContent', 'assertPlayerSnapshot', 'geometry', 'content', 'colors', 'interactionColors'];
const snippets = functions.map(name => {
  const body = source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n}`))?.[0];
  if (!body) throw new Error(`Missing runner oracle: ${name}`); return body;
});
const declarations = source.slice(source.indexOf('const palettes ='), source.indexOf('const unavailable ='));
const checks = runInNewContext(`${declarations}\n${snippets.join('\n')}\n({${functions.join(',')}})`, { assert });
const scope = '11111111-1111-4111-8111-111111111111', videoId = '22222222-2222-4222-8222-222222222222';
const longTitle = ('Длинное кириллическое название для проверки переноса текста ' + 'Я'.repeat(80) + ' конец длинного названия').slice(0, 160);
const clip = (index: number, title = longTitle) => ({ clip_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`, index: index + 1, start: 0, end: 30, title, status: 'done', watermarked: false, expires_at: null, available: true, published_render_version: 1 });
const video = { video_id: videoId, status: 'done', created_at: '2026-11-05T00:00:00Z', updated_at: '2026-11-05T00:00:00Z', duration_seconds: 120, user_state: 'успех', stage_label: 'Клипы готовы', stage_progress: null, clips_done: 4, clips_total: 4, no_response: false, failure_reason: null, next_action: null, retry_after: null, poll_after_seconds: 5, cta_kind: 'none', cta_url: null, failed_stage: null };
const windows = { asOf: '2026-11-05T00:00:00Z', baseStart: '2026-11-05T00:00:00Z', baseEnd: '2026-12-05T00:00:00Z', addonStart: '2026-11-05T00:00:00Z', addonEnd: '2026-12-05T00:00:00Z', scheduled: false };
const media = readFileSync('tests/artifacts/render-and-watermark/clip.mp4');
let server: ViteDevServer, origin: string;
const cacheDir = mkdtempSync(join(tmpdir(), 'clipmkr-mockup-c-'));
beforeAll(async () => {
  const entry = '\0mockup-real-components', navigation = '\0mockup-navigation', link = '\0mockup-link';
  server = await createServer({ configFile: false, root: process.cwd(), cacheDir, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime', '@noble/hashes/sha2.js', 'zod'], exclude: ['next/link', 'next/navigation'] },
    resolve: { alias: Object.fromEntries(['enums', 'cta', 'tariff', 'music-catalog','screen-layout','cut-timeline', 'upload'].map(name => [`@clipmaker/shared/${name}`, resolve(`packages/shared/src/${name}.ts`)])) },
    server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
    plugins: [{ name: 'mockup-real-components', enforce: 'pre',
      resolveId(id) { if (id === entry) return entry; if (id === 'next/navigation') return navigation; if (id === 'next/link') return link; },
      load(id) {
        if (id.endsWith('?legacy')) {
          const file = id.slice(0, -7).replace(process.cwd() + '/', '');
          if (['apps/web/src/app/upload/Uploader.tsx', 'apps/web/src/app/videos/[videoId]/VideoDetail.tsx', 'apps/web/src/app/upgrade/UpgradeScreen.tsx'].includes(file)) return execFileSync('git', ['show', `153a9cd7d14d89776ab38bd83b04594bcb421d50:${file}`], { encoding: 'utf8' });
        }
        if (id === navigation) return 'const router={refresh(){},push(){}};export const useRouter=()=>router;export const usePathname=()=>window.location.pathname;';
        if (id === link) return `import {createElement} from 'react';export default function Link({prefetch,...props}){return createElement('a',props);}`;
        if (id === entry) return `import {createElement as h,Fragment,StrictMode} from 'react';import {createRoot} from 'react-dom/client';
          import {WorkspaceHeader} from '/apps/web/src/app/WorkspaceHeader.tsx';
          import {WorkspaceSettings,WorkspacePreferenceSync} from '/apps/web/src/app/WorkspaceSettings.tsx';
          import {VideoUploader} from '/apps/web/src/app/upload/Uploader.tsx';
          import {VideoList} from '/apps/web/src/app/videos/VideoList.tsx';import {LimitsPanel} from '/apps/web/src/app/dashboard/LimitsPanel.tsx';
          import {VideoDetail} from '/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';import {UpgradeScreen} from '/apps/web/src/app/upgrade/UpgradeScreen.tsx';
          const params=new URLSearchParams(location.search),screen=params.get('screen')??'plans',count=Number(params.get('count')??3);
          const clips=Array.from({length:count},(_,i)=>(${clip.toString()})(i,${JSON.stringify(longTitle)}));
          const video=${JSON.stringify(video)},windows=${JSON.stringify(windows)};
          const legacy=params.has('legacy');
          const Uploader=legacy?(await import('/apps/web/src/app/upload/Uploader.tsx?legacy')).VideoUploader:VideoUploader;
          const Detail=legacy?(await import('/apps/web/src/app/videos/[videoId]/VideoDetail.tsx?legacy')).VideoDetail:VideoDetail;
          const Upgrade=legacy?(await import('/apps/web/src/app/upgrade/UpgradeScreen.tsx?legacy')).UpgradeScreen:UpgradeScreen;
          const offerProps={creditMode:true,salesEnabled:true,purchaseWindows:windows,title:'Про',price:'990 ₽',days:30,paidMinutes:270,current:{plan:'free',plan_source:'default',plan_paid_until:null}};
          const content=screen==='plans'?h(StrictMode,null,h(Upgrade,{key:'A',creditMode:true,salesEnabled:true,purchaseWindows:windows,title:'Про',price:'990 ₽',days:30,paidMinutes:270,current:{plan:'free',plan_source:'default',plan_paid_until:null}})):screen==='ready'?
            h(Detail,{videoId:video.video_id,initialVideo:{...video,clips_done:count,clips_total:count},initialClips:clips,consentHash:'fixture-consent'}):
            h('div',{className:'workspace-upload'},h('div',{className:'workspace-main'},h(Uploader,{accountScope:'${scope}',creditMode:true,maxSourceSeconds:5400}),h(VideoList,{videos:Array.from({length:count},(_,i)=>({...video,video_id:'record-'+i})),nextCursor:null})),h('aside',{className:'workspace-aside'},h(LimitsPanel,{remaining:{credits:{available_seconds:11040,reserved_seconds:0,next_expiry:null},max_source_seconds:5400,uploads:2,minutes:90,selections:2,resets_at:'2026-11-06T00:00:00Z'}})));
          const root=createRoot(document.getElementById('root'));
          const render=content=>root.render(h(Fragment,null,h(WorkspacePreferenceSync,{initialTheme:'dark',initialLayout:'workspace'}),h(WorkspaceHeader,{owner:false,balanceLabel:'184 кредита',initialTheme:'dark',initialLayout:'workspace'}),h(WorkspaceSettings,{initialTheme:'dark',initialLayout:'workspace'}),h('main',{className:'container'},content)));render(content);window.renderAccount=(account,patch={})=>render(h(StrictMode,null,h(Upgrade,{...offerProps,...patch,key:account})));window.fixtureMounted=true;`;
      }, configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/fixture.html')) { next(); return; }
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await vite.transformIndexHtml('/fixture.html', '<!doctype html><html lang="ru" data-theme="dark" data-workspace-layout="workspace"><head><title>Локальные компоненты Clipmkr</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root" class="workspace-shell"></div><script type="module" src="/@id/__x00__mockup-real-components"></script></body></html>'));
      }); },
    }],
  });
  await server.listen(); const address = server.httpServer?.address(); if (!address || typeof address === 'string') throw new Error('No fixture port'); origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await server?.close(); rmSync(cacheDir, { recursive: true, force: true }); });
async function preferences(page: Page, layout: string, theme: string) {
  const settings = page.locator('.workspace-settings');
  if (await settings.getAttribute('open') === null) await settings.locator('summary').click();
  await page.getByLabel('Компоновка').selectOption(layout);
  if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
  if (await settings.getAttribute('open') !== null) await settings.locator('summary').click();
}
async function open(browser: Browser, screen: string, count: number, width: number, action: (page: Page) => Promise<void>, legacy = false) {
  const context = await browser.newContext({ viewport: { width, height: 1000 } }), page = await context.newPage();
  page.setDefaultTimeout(10_000); const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/trpc/video.get?*', route => route.fulfill({ json: { result: { data: { data: video } } } }));
  await page.route('**/api/trpc/clip.list?*', route => route.fulfill({ json: { result: { data: { data: { clips: Array.from({ length: count }, (_, i) => clip(i)) } } } } }));
  await page.route('**/api/clips/*/file?*', async route => {
    const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? ''), start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
    await route.fulfill({ status: range ? 206 : 200, body: media.subarray(start, end + 1), headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', ...(range ? { 'content-range': `bytes ${start}-${end}/${media.length}` } : {}) } });
  });
  try { await page.goto(`${origin}/fixture.html?screen=${screen}&count=${count}${legacy ? '&legacy=1' : ''}`); await page.locator('.workspace-head').waitFor(); await action(page); expect(errors).toEqual([]); }
  finally { await context.close(); }
}
for (const [name, launcher] of Object.entries({ chromium, webkit })) describe(`mockup mounted-browser ${name}`, () => {
  let browser: Browser; beforeAll(async () => { browser = await launcher.launch(); }); afterAll(async () => { await browser?.close(); });
  it('packages_use_actual_offers_and_preserve_pending_checkout', async () => {
    await open(browser, 'plans', 3, 1440, async page => {
      const requests: { sku: string; idempotency_key: string }[] = []; let release!: () => void;
      const gate = new Promise<void>(done => { release = done; });
      await page.route('**/api/checkout', async route => { requests.push(route.request().postDataJSON()); if (requests.length === 1) await gate; await route.fulfill({ status: 503, json: { error: { message: 'Контрольный отказ магазина' } } }); });
      await page.locator('[data-sku="pro_v1"] button').evaluate((node: HTMLButtonElement) => { node.click(); (document.querySelector('[data-sku="start_v1"] button') as HTMLButtonElement).click(); });
      await expect.poll(() => requests.length).toBe(1); expect(requests[0]?.sku).toBe('pro_v1');
      await page.locator('[data-sku="pro_v1"] button').evaluate(node => { (window as Window & { pendingButton?: Element }).pendingButton = node; });
      for (const layout of ['studio', 'workspace']) for (const theme of ['light', 'dark']) {
        await preferences(page, layout, theme); expect(requests).toHaveLength(1);
        expect(await page.locator('[data-sku="pro_v1"] button').isDisabled()).toBe(true);
        expect(await page.locator('[data-sku="pro_v1"] button').evaluate(node => node === (window as Window & { pendingButton?: Element }).pendingButton)).toBe(true);
      }
      release(); await expect.poll(() => page.getByRole('alert').innerText()).toBe('Контрольный отказ магазина');
      await preferences(page, 'studio', 'light'); expect(await page.getByRole('alert').innerText()).toBe('Контрольный отказ магазина'); expect(requests).toHaveLength(1);
      await page.locator('[data-sku="pro_v1"] button').click(); await expect.poll(() => requests.length).toBe(2); expect(requests[1]).toEqual(requests[0]);
    });
  });
  it('checkout delayed success keeps one request through preferences', async () => {
    await open(browser, 'plans', 3, 390, async page => {
      let count = 0, release!: () => void; const gate = new Promise<void>(done => { release = done; });
      await page.route('**/api/checkout', async route => { count++; await gate; await route.fulfill({ status: 201, json: { data: { intent_id: 'fixture-intent', redirect_url: null } } }); });
      await page.route('**/upgrade/return?*', route => route.fulfill({ contentType: 'text/html', body: '<h1>Контрольный возврат</h1>' }));
      await page.evaluate(() => {
        window.name = '';
        window.addEventListener('beforeunload', () => {
          // Синхронный снимок настоящего DOM при успешном переходе; locator после начала navigation ненадёжен.
          const button = document.querySelector<HTMLButtonElement>('[data-sku="start_v1"] button');
          window.name = JSON.stringify({ disabled: button?.disabled, label: button?.textContent,
            allDisabled: Array.from(document.querySelectorAll<HTMLButtonElement>('.workspace-package button')).every(node => node.disabled) });
        }, { once: true });
      });
      await page.locator('[data-sku="start_v1"] button').click(); await expect.poll(() => count).toBe(1); await preferences(page, 'studio', 'light'); expect(count).toBe(1); release();
      await page.waitForURL('**/upgrade/return?intent=fixture-intent'); expect(count).toBe(1);
      const leaving = await page.evaluate(() => JSON.parse(window.name));
      expect(leaving).toEqual({ disabled: true, label: 'Переходим к оплате…', allDisabled: true });
    });
  });
  it('checkout account remount ignores old success and failure even when transport ignores abort', async () => {
    for (const phase of ['response', 'json']) for (const outcome of ['success', 'failure', 'rejection']) await open(browser, 'plans', 3, 390, async page => {
      await page.route('**/upgrade/return?*', route => route.fulfill({ contentType: 'text/html', body: '<h1>Stale checkout navigation</h1>' }));
      await page.evaluate(({ phase, outcome }) => {
        const original = window.fetch;
        const calls: { body: { sku: string; idempotency_key: string }; signal?: AbortSignal | null }[] = [];
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        let settled = false, jsonReads = 0;
        Object.assign(window, { checkoutProbe: { calls, release, settled: () => settled, jsonReads: () => jsonReads } });
        window.fetch = async (input, init) => {
          if (input !== '/api/checkout') return original(input, init);
          calls.push({ body: JSON.parse(String(init?.body)), signal: init?.signal });
          if (calls.length > 1) return new Response(JSON.stringify({ error: { message: 'Только отказ аккаунта B' } }), { status: 503 });
          // Fault transport deliberately ignores AbortSignal, including during JSON consumption.
          if (phase === 'response') await gate;
          if (phase === 'response' && outcome === 'rejection') { settled = true; throw new Error('Old A transport failed'); }
          return { status: outcome === 'failure' ? 503 : 201, json: async () => {
            jsonReads++;
            if (phase === 'json') await gate;
            settled = true;
            if (outcome === 'rejection') throw new Error('Old A JSON failed');
            return outcome === 'success' ? { data: { intent_id: 'account-A-intent', redirect_url: null } } : { error: { message: 'Ошибка старого аккаунта A' } };
          } } as Response;
        };
      }, { phase, outcome });
      const read = () => page.evaluate(() => {
        const probe = (window as unknown as Window & { checkoutProbe: { calls: { body: { sku: string; idempotency_key: string }; signal?: AbortSignal | null }[]; settled(): boolean; jsonReads(): number } }).checkoutProbe;
        return { bodies: probe.calls.map(call => call.body), aborted: probe.calls[0]?.signal?.aborted, settled: probe.settled(), jsonReads: probe.jsonReads() };
      });
      await page.locator('[data-sku="pro_v1"] button').click(); await expect.poll(async () => (await read()).bodies.length).toBe(1);
      if (phase === 'json') await expect.poll(async () => (await read()).jsonReads).toBe(1);
      const accountA = (await read()).bodies[0]!;
      await page.locator('[data-sku="pro_v1"] button').evaluate(node => Object.assign(window, { oldAccountButton: node }));
      await page.evaluate(() => (window as unknown as Window & { renderAccount(account: string): void }).renderAccount('B'));
      await expect.poll(() => page.locator('[data-sku="pro_v1"] button').evaluate(node => node !== (window as Window & { oldAccountButton?: Element }).oldAccountButton)).toBe(true);
      expect(await page.locator('[data-sku="pro_v1"] button').isEnabled()).toBe(true);
      const accountBUrl = page.url();
      await page.evaluate(() => (window as unknown as Window & { checkoutProbe: { release(): void } }).checkoutProbe.release());
      // Flush async continuations after the ignored abort; absence of a signal alone proves nothing.
      await page.evaluate(() => new Promise<void>(resolve => setTimeout(resolve, 50)));
      expect(page.url()).toBe(accountBUrl); expect(await page.getByRole('alert').count()).toBe(0);
      expect(await page.locator('[data-sku="pro_v1"] button').isEnabled()).toBe(true);
      expect((await read()).aborted).toBe(true);
      expect((await read()).bodies).toEqual([accountA]);
      if (phase === 'response' && outcome !== 'rejection') expect((await read()).jsonReads).toBe(0);
      else expect((await read()).settled).toBe(true);
      await page.locator('[data-sku="pro_v1"] button').click();
      await expect.poll(() => page.getByRole('alert').innerText()).toBe('Только отказ аккаунта B');
      const requests = (await read()).bodies;
      expect(requests).toHaveLength(2); expect(requests[1]?.sku).toBe('pro_v1');
      expect(requests[1]?.idempotency_key).not.toBe(accountA.idempotency_key);
      await page.locator('[data-sku="pro_v1"] button').click(); await expect.poll(async () => (await read()).bodies.length).toBe(3);
      expect((await read()).bodies[2]).toEqual(requests[1]);
    });
  });
  it('declined checkout error follows its CTA in both layouts', async () => {
    for (const width of [390, 1440]) await open(browser, 'plans', 3, width, async page => {
      await page.route('**/api/checkout', route => route.fulfill({ status: 503, json: { error: { message: 'Контрольный отказ магазина: ' + longTitle } } }));
      for (const layout of ['workspace', 'studio']) {
        await preferences(page, layout, 'dark');
        const offer = page.locator('[data-sku="pro_v1"]');
        await offer.locator('button').click(); await offer.getByRole('alert').waitFor();
        const boxes = await offer.evaluate(node => {
          const button = node.querySelector('button')!.getBoundingClientRect(), error = node.querySelector('[role=alert]')!.getBoundingClientRect();
          return { buttonBottom: button.bottom, errorTop: error.top, gap: parseFloat(getComputedStyle(node).fontSize) * 3 };
        });
        expect(boxes.errorTop).toBeGreaterThanOrEqual(boxes.buttonBottom);
        expect(boxes.errorTop - boxes.buttonBottom).toBeLessThanOrEqual(boxes.gap);
      }
    });
  });
  it('purchase terms remain visible adjacent to each CTA with help closed', async () => {
    for (const width of [390, 1440]) await open(browser, 'plans', 3, width, async page => {
      for (const layout of ['workspace', 'studio']) {
        await preferences(page, layout, 'dark');
        expect(await page.locator('.packages-help').getAttribute('open')).toBeNull();
        for (const sku of ['start_v1', 'pro_v1', 'addon_v1']) {
          const offer = page.locator(`[data-sku="${sku}"]`), terms = offer.locator('.package-purchase-terms');
          expect(await terms.isVisible()).toBe(true);
          expect(await terms.innerText()).toContain('Покупка разовая, без автоматического списания');
          expect(await terms.innerText()).toContain('неиспользованный остаток сгорает');
          expect(await terms.innerText()).toContain('Даты предварительные');
          const adjacency = await offer.evaluate(node => {
            const terms = node.querySelector('.package-purchase-terms')!.getBoundingClientRect(), button = node.querySelector('button')!.getBoundingClientRect();
            return { gap: button.top - terms.bottom, allowedGap: parseFloat(getComputedStyle(node).fontSize) * 3 };
          });
          expect(adjacency.gap).toBeGreaterThanOrEqual(0); expect(adjacency.gap).toBeLessThanOrEqual(adjacency.allowedGap);
        }
      }
      for (const patch of [{ ownerUnlimited: true }, { catalogOnly: true }, { salesEnabled: false }]) {
        await page.evaluate(patch => (window as unknown as Window & { renderAccount(account: string, patch: object): void }).renderAccount(JSON.stringify(patch), patch), patch);
        await expect.poll(async () => page.locator('.workspace-package button:disabled').count()).toBe(3);
        expect(await page.locator('.packages-help').getAttribute('open')).toBeNull();
        expect(await page.locator('.workspace-package .package-purchase-terms').count()).toBe(3);
        if ('ownerUnlimited' in patch || 'catalogOnly' in patch) expect(await page.locator('.package-purchase-terms').first().innerText()).not.toContain('Даты предварительные');
        else expect(await page.locator('.package-purchase-terms').first().innerText()).toContain('Даты предварительные');
      }
    });
  });
  it.each([320, 390].flatMap(width => ['catalogOnly', 'salesOff'].map(branch => [width, branch] as const)))('unavailable packages reflow at 200%% text on %ipx (%s) without clipping terms or actions', async (width, branch) => {
    await open(browser, 'plans', 3, width, async page => {
      // Те же ветки UpgradePage: legacy catalogue без windows и credits_v1 при выключенной продаже.
      const patch = { catalogOnly: branch === 'catalogOnly', salesEnabled: false };
      await page.evaluate(patch => (window as unknown as Window & { renderAccount(account: string, patch: object): void }).renderAccount('reflow', { ...patch, ...(patch.catalogOnly ? { purchaseWindows: undefined } : {}) }), patch);
      await expect.poll(() => page.locator('.workspace-package button:disabled').count()).toBe(3);
      for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) {
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        await preferences(page, layout, theme);
        const before = await page.locator('.workspace-package button').first().evaluate(node => {
          const style = getComputedStyle(node); return { font: parseFloat(style.fontSize), padding: parseFloat(style.paddingTop), height: node.getBoundingClientRect().height };
        });
        await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
        await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
        expect(await page.locator('html').evaluate(node => ({ font: parseFloat(getComputedStyle(node).fontSize), width: node.scrollWidth })), `${layout}/${theme} root bounds`).toEqual({ font: 32, width });
        checks.assertContent(await checks.content(page), 3, layout, 'plans');
        expect(await page.locator('.packages-help').getAttribute('open')).toBeNull();
        for (const sku of ['start_v1', 'pro_v1', 'addon_v1']) {
          const offer = page.locator(`[data-sku="${sku}"]`), button = offer.locator('button'), terms = offer.locator('.package-purchase-terms');
          expect(await terms.isVisible()).toBe(true);
          expect(await terms.innerText()).toContain('Покупка разовая, без автоматического списания');
          expect(await terms.innerText()).toContain('неиспользованный остаток сгорает');
          expect(await offer.locator(`#offer-reason-${sku}`).innerText()).toBe(branch === 'catalogOnly' ? 'Покупка этих пакетов для вашего аккаунта пока недоступна.' : 'Продажа новых пакетов временно выключена.');
          expect(await button.isDisabled()).toBe(true);
          await button.scrollIntoViewIfNeeded();
          const bounds = await offer.evaluate(node => {
            const button = node.querySelector('button')!, terms = node.querySelector('.package-purchase-terms')!, style = getComputedStyle(button);
            const b = button.getBoundingClientRect(), t = terms.getBoundingClientRect();
            const text = document.createRange(); text.selectNodeContents(button);
            return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, height: b.height, viewport: innerWidth, viewportHeight: innerHeight,
              termsBottom: t.bottom, font: parseFloat(style.fontSize), padding: parseFloat(style.paddingTop),
              textFits: Array.from(text.getClientRects()).every(r => r.left >= b.left && r.right <= b.right && r.top >= b.top && r.bottom <= b.bottom) };
          });
          expect(bounds.left).toBeGreaterThanOrEqual(0); expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
          expect(bounds.top).toBeGreaterThanOrEqual(0); expect(bounds.bottom).toBeLessThanOrEqual(bounds.viewportHeight);
          expect(bounds.top).toBeGreaterThanOrEqual(bounds.termsBottom);
          expect(bounds.font).toBeCloseTo(before.font * 2, 1); expect(bounds.padding).toBeCloseTo(before.padding * 2, 1);
          expect(bounds.height).toBeGreaterThanOrEqual(before.height * 2 - 1); expect(bounds.textFits).toBe(true);
        }
        // Disabled CTA не входит в Tab order; следующий шаг остаётся доступен с клавиатуры.
        const help = page.locator('.packages-help summary'); await help.focus(); await page.keyboard.press('Enter');
        expect(await page.locator('.packages-help').getAttribute('open')).not.toBeNull(); await page.keyboard.press('Enter');
        await page.keyboard.press('Tab'); expect(await page.locator('a[href="/dashboard"]').last().evaluate(node => node === document.activeElement)).toBe(true);
      }
    });
  });
  it('approved_screen_regions_reject_legacy_bodies', async () => {
    for (const screen of ['upload', 'ready', 'plans']) await open(browser, screen, 3, 1440, async page => {
      for (const layout of ['workspace', 'studio']) {
        await preferences(page, layout, 'dark'); const actual = await checks.geometry(page, layout, screen); checks.assertGeometry(actual, layout, screen, 1440, 3);
      }
      await preferences(page, 'workspace', 'dark');
    });
    // Настоящие исходные bodies baseline, а не перестановка классов: каждый обязан RED.
    for (const screen of ['upload', 'ready', 'plans']) await open(browser, screen, 3, 1440, async page => {
      const restored = await checks.geometry(page, 'workspace', screen);
      expect(() => checks.assertGeometry(restored, 'workspace', screen, 1440, 3)).toThrow();
    }, true);
  });
  it('real_content_variants_keep_every_action', async () => {
    for (const width of [320, 390, 1440]) for (const count of [0, 1, 4]) for (const screen of ['upload', 'ready']) await open(browser, screen, count, width, async page => {
      for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) {
        await preferences(page, layout, theme); checks.assertContent(await checks.content(page), count, layout, screen);
        if (count > 0) checks.assertGeometry(await checks.geometry(page, layout, screen), layout, screen, width, count);
        if (screen === 'ready' && count === 4 && layout === 'studio') {
          const hide = await page.addStyleTag({ content: '.clip-card:nth-child(4){display:none!important}' });
          const hidden = await checks.content(page); expect(() => checks.assertContent(hidden, count, layout, screen)).toThrow(); await hide.evaluate((node: Element) => node.remove());
          const clipText = await page.addStyleTag({ content: '.clip-card h3{max-height:1px!important;overflow:hidden!important}' });
          const clipped = await checks.content(page); expect(() => checks.assertContent(clipped, count, layout, screen)).toThrow(); await clipText.evaluate((node: Element) => node.remove());
        }
      }
    });
  }, 120_000);
  it('approved_palette_rejects_blue_surfaces', async () => {
    for (const screen of ['upload', 'ready', 'plans']) for (const width of [390, 1440]) await open(browser, screen, 3, width, async page => {
      for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) {
        await preferences(page, layout, theme); const readouts = await checks.colors(page, theme, screen); await checks.interactionColors(page, theme);
        if (screen === 'ready' && layout === 'studio') {
          expect(readouts).toContainEqual(expect.objectContaining({ selector: '.workspace-shell .clip-actions button:first-child', property: 'backgroundColor', role: 'surface' }));
          expect(readouts).toContainEqual(expect.objectContaining({ selector: '.workspace-shell .clip-actions button:first-child', property: 'color', role: 'text' }));
        }
        for (const content of [
          `${screen === 'plans' ? '.workspace-package' : screen === 'upload' ? '.workspace-file' : '.clip-card'}{background:#123c66!important}`,
          `.workspace-shell ${screen === 'ready' ? '.clip-actions button:first-child' : '.action-primary'}{background:#2563eb!important}`,
        ]) {
          const mutation = await page.addStyleTag({ content }); await expect(checks.colors(page, theme, screen)).rejects.toThrow(); await mutation.evaluate((node: Element) => node.remove());
        }
      }
    });
  });
  it('package conditions and keyboard actions stay reachable at mobile and media boundaries', async () => {
    for (const width of [320, 390, 607, 608, 609, 831, 832, 833, 1440]) await open(browser, 'plans', 3, width, async page => {
      for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) {
        await preferences(page, layout, theme); checks.assertContent(await checks.content(page), 3, layout, 'plans');
        checks.assertGeometry(await checks.geometry(page, layout, 'plans'), layout, 'plans', width, 3);
      }
      const summary = page.locator('.packages-help > summary'); await summary.focus(); await page.keyboard.press('Enter'); expect(await page.locator('.packages-help').getAttribute('open')).not.toBeNull();
      await page.keyboard.press('Enter'); expect(await page.locator('.packages-help').getAttribute('open')).toBeNull();
      const button = page.locator('[data-sku="pro_v1"] button'); await button.scrollIntoViewIfNeeded(); await page.keyboard.press('Tab'); await button.focus();
      expect(await button.evaluate(node => node.matches(':focus-visible'))).toBe(true);
    });
  }, 120_000);
  it('native_picker_and_options_survive_layout', async () => {
    await open(browser, 'upload', 1, 1440, async page => {
      await page.evaluate(() => {
        Object.assign(window, { nativeFile: null, slicedFile: null });
        document.addEventListener('change', event => {
          const node = event.target as HTMLInputElement;
          if (node.type === 'file') Object.assign(window, { nativeFile: node.files?.[0] ?? null });
        }, true);
        const original = File.prototype.slice;
        File.prototype.slice = function(...args) { Object.assign(window, { slicedFile: this }); return original.apply(this, args); };
      });
      const disclosure = page.locator('.workspace-upload-options'); expect(await disclosure.getAttribute('open')).toBeNull();
      await disclosure.locator('summary').click(); const music = disclosure.locator('input[type=checkbox]').first(); await music.check();
      let creates = 0, puts = 0, release!: () => void;
      const gate = new Promise<void>(done => { release = done; });
      await page.route('**/api/trpc/video.create', async route => {
        creates++; await route.fulfill({ json: { result: { data: { data: { video_id: videoId, upload_id: 'fixture-upload', part_size: 10 * 1024 * 1024,
          parts: [{ part_number: 1, url: origin + '/held-put', expires_at: new Date(Date.now() + 60_000).toISOString() }], completed_parts: [] } } } } });
      });
      await page.route('**/held-put', async route => { puts++; await gate; await route.fulfill({ status: 200, headers: { etag: '"confirmed"' } }).catch(() => {}); });
      await page.route('**/api/upload/complete', route => route.fulfill({ status: 202, json: { data: { video_id: videoId, status: 'queued' } } }));
      try {
        const chooser = page.waitForEvent('filechooser'); await page.locator('#source-file-picker').click();
        await (await chooser).setFiles({ name: longTitle.slice(0, 156) + '.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(1024, 65) });
        await expect.poll(() => page.getByRole('button', { name: 'Создать клипы →', exact: true }).isEnabled()).toBe(true);
        await page.locator('#source-file').evaluate(node => Object.assign(window, { connectedInput: node }));
        await page.getByRole('button', { name: 'Создать клипы →', exact: true }).click(); await expect.poll(() => puts).toBe(1);
        const saved = await page.evaluate(scope => sessionStorage.getItem(`n5-upload-resume:v2:${scope}`), scope); expect(saved).not.toBeNull();
        for (const layout of ['studio', 'workspace']) for (const theme of ['light', 'dark']) {
          await preferences(page, layout, theme);
          expect(await page.locator('#source-file').evaluate(node => {
            const state = window as Window & { nativeFile?: File; slicedFile?: File; connectedInput?: Element };
            return node === state.connectedInput && node.isConnected && state.nativeFile instanceof File && state.slicedFile === state.nativeFile;
          })).toBe(true);
          expect(await music.isChecked()).toBe(true); expect(creates).toBe(1); expect(puts).toBe(1);
          expect(await page.evaluate(scope => sessionStorage.getItem(`n5-upload-resume:v2:${scope}`), scope)).toBe(saved);
        }
        await page.getByRole('button', { name: 'Приостановить загрузку', exact: true }).click();
      } finally { release(); }
    });
  });
  it('selected_player_survives_layout_and_poll', async () => {
    await open(browser, 'ready', 4, 1440, async page => {
      let ticks = 0; await page.route('**/api/trpc/clip.list?*', route => { ticks++; return route.fulfill({ json: { result: { data: { data: { clips: Array.from({ length: 4 }, (_, i) => clip(i, `Обновление ${ticks} ${longTitle}`)) } } } } }); });
      await page.locator('[data-select-clip]').nth(1).click(); const player = page.locator('.clip-card[data-selected="true"] video');
      await player.evaluate(async (node: HTMLVideoElement) => { node.muted = true; await node.play(); });
      await expect.poll(() => player.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(.1);
      const before = await player.evaluate((node: HTMLVideoElement) => { (window as Window & { savedPlayer?: Element }).savedPlayer = node; return { src: node.currentSrc, time: node.currentTime }; });
      for (const layout of ['studio', 'workspace']) {
        await preferences(page, layout, 'light'); await expect.poll(() => ticks, { timeout: 12_000 }).toBeGreaterThan(layout === 'studio' ? 0 : 1);
        const actual = await player.evaluate((node: HTMLVideoElement) => ({ same: node === (window as Window & { savedPlayer?: Element }).savedPlayer, src: node.currentSrc, time: node.currentTime, paused: node.paused }));
        checks.assertPlayerSnapshot(actual, before); before.time = actual.time;
      }
      await player.evaluate((node: HTMLVideoElement) => node.pause()); const paused = await player.evaluate((node: HTMLVideoElement) => node.currentTime);
      await preferences(page, 'studio', 'dark'); expect(await player.evaluate((node: HTMLVideoElement) => node.currentTime)).toBe(paused);
      await player.evaluate((node: HTMLVideoElement) => { const copy = node.cloneNode(true); node.replaceWith(copy); });
      const remounted = await player.evaluate((node: HTMLVideoElement) => ({ same: node === (window as Window & { savedPlayer?: Element }).savedPlayer, src: node.currentSrc, time: node.currentTime, paused: node.paused }));
      expect(() => checks.assertPlayerSnapshot(remounted, before)).toThrow();
    });
  });
});
