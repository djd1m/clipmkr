// Real SupportPanel + browser focus; SDK-shaped iframe owns visibility independently of React state.
// This is a local lifecycle boundary regression, not a live Libredesk/history acceptance test.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer as createHttpServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const inbox = '00000000-0000-4000-8000-000000000001';
const cacheDir = mkdtempSync(join(tmpdir(), 'clipmkr-support-close-'));
let server: ViteDevServer, widget: Server, browser: Browser, origin: string, widgetOrigin: string;
type FixtureState = { hides: number; logouts: number; focusReturns: number; nativeVisible: boolean;
  clears: { nativeVisible: boolean; frameVisible: boolean; closePresent: boolean }[] };
const state = (page: Page): Promise<FixtureState> => page.evaluate(() =>
  (window as unknown as { fixtureState: FixtureState }).fixtureState);

beforeAll(async () => {
  widget = createHttpServer((request, response) => {
    if (new URL(request.url!, 'http://fixture').pathname !== '/widget') { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end('<!doctype html><html lang="ru"><body><h1>Локальный виджет</h1><button>Home</button></body></html>');
  });
  await new Promise<void>(resolve => widget.listen(0, '127.0.0.1', resolve));
  const widgetAddress = widget.address();
  if (!widgetAddress || typeof widgetAddress === 'string') throw new Error('No widget port');
  widgetOrigin = `http://127.0.0.1:${widgetAddress.port}`;
  const entry = '\0support-closure-entry', navigation = '\0support-closure-navigation';
  server = await createServer({ configFile: false, root: process.cwd(), cacheDir, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime'], exclude: ['next/navigation'] },
    server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
    plugins: [{ name: 'support-closure-fixture', enforce: 'pre',
      resolveId(id) { if (id === entry) return entry; if (id === 'next/navigation') return navigation; },
      load(id) {
        if (id === navigation) return 'const router={refresh(){}};export const useRouter=()=>router;';
        if (id !== entry) return;
        return `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';
          import {SupportPanel} from '/apps/web/src/app/support/SupportPanel.tsx';
          const frame=document.createElement('iframe');frame.id='libredesk-widget-${inbox}';
          frame.src=${JSON.stringify(widgetOrigin + '/widget?inbox_id=' + inbox)};frame.title='Local support widget';
          frame.style.cssText='display:none;position:fixed;right:20px;top:100px;width:400px;height:600px;z-index:9999;background:white';
          if(innerWidth<600)frame.style.cssText+=';right:0;top:0;width:100vw;height:100vh';document.body.append(frame);
          const s=window.fixtureState={hides:0,logouts:0,focusReturns:0,nativeVisible:false,clears:[]};
          window.Libredesk={show(){s.nativeVisible=true;frame.style.display='block';frame.style.opacity='1';frame.style.pointerEvents='auto'},
            hide(){s.hides++;s.nativeVisible=false;frame.style.opacity='0';frame.style.pointerEvents='none';frame.style.display='none'},
            logout(){s.logouts++},setUser(){throw new Error('This fixture never identifies accounts')},destroy(){frame.remove()}};
          addEventListener('focus',()=>s.focusReturns++);
          addEventListener('n5:support-clear',()=>s.clears.push({nativeVisible:s.nativeVisible,
            frameVisible:getComputedStyle(frame).display!=='none'&&getComputedStyle(frame).opacity!=='0',
            closePresent:!!document.querySelector('.support-close')}));
          const support={mode:'test',baseURL:${JSON.stringify(widgetOrigin)},inboxID:'${inbox}',identifiedEnabled:false,contactEmail:null,synthetic:true};
          function View(){const[account,setAccount]=useState({id:'synthetic-A',email:'a@test.invalid',verified:true});
            window.fixtureSwitch=()=>setAccount({id:'synthetic-B',email:'b@test.invalid',verified:true});
            return h('main',{className:'container support-shell'},h('h1',null,'Поддержка и доступ'),h(SupportPanel,{support,account}));}
          const root=createRoot(document.getElementById('root'));window.fixtureUnmount=()=>root.unmount();root.render(h(View));`;
      }, configureServer(vite) { vite.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith('/fixture.html')) { next(); return; }
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await vite.transformIndexHtml('/fixture.html', '<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root"></div><script type="module" src="/@id/__x00__support-closure-entry"></script></body></html>'));
      }); },
    }],
  });
  await server.listen(); const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('No fixture port');
  origin = `http://127.0.0.1:${address.port}`; browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close(); await server?.close();
  if (widget) await new Promise<void>((resolve, reject) => widget.close(error => error ? reject(error) : resolve()));
  rmSync(cacheDir, { recursive: true, force: true });
});
async function fixture(width: number, run: (page: Page) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
  page.setDefaultTimeout(5000); const errors: string[] = [], writes: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() !== 'GET' || ![origin, widgetOrigin].includes(url.origin)) {
      writes.push(request.method() + ' ' + url.pathname); return route.abort();
    }
    return route.continue();
  });
  try {
    await page.goto(origin + '/fixture.html');
    await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).waitFor();
    await expect.poll(async () => (await state(page)).clears.length).toBeGreaterThan(0);
    await run(page); expect(errors).toEqual([]); expect(writes).toEqual([]);
  } finally { await context.close(); }
}
const open = async (page: Page) => {
  await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).click();
  await page.locator('.support-close').waitFor();
  await expect.poll(async () => (await state(page)).nativeVisible).toBe(true);
};
const hidden = async (page: Page) => {
  await expect.poll(async () => (await state(page)).nativeVisible).toBe(false);
  expect(await page.locator('iframe').isVisible()).toBe(false);
};

for (const width of [1440, 390]) {
  it(`focus return hides native iframe before controls reset ${width}`, () => fixture(width, async page => {
    await open(page);
    const frame = page.frameLocator('iframe');
    await frame.getByRole('button', { name: 'Home', exact: true }).click();
    expect(await page.evaluate(() => document.activeElement?.tagName)).toBe('IFRAME');
    const before = await state(page);
    // A real focus boundary, not a dispatched synthetic focus event. Mobile iframe covers the page.
    if (width === 1440) await page.locator('h1').click(); else await page.keyboard.press('Shift+Tab');
    await expect.poll(async () => (await state(page)).focusReturns).toBeGreaterThan(before.focusReturns);
    await expect.poll(async () => (await state(page)).clears.length).toBeGreaterThan(before.clears.length);
    const lastClear = (await state(page)).clears.at(-1)!;
    expect(lastClear.nativeVisible, 'native iframe was still open when identity/control reset fired').toBe(false);
    expect(lastClear.frameVisible, 'visible iframe survived parent control removal').toBe(false);
    await hidden(page); expect(await page.locator('.support-close').count()).toBe(0);
  }));

  it(`ordinary close reopen and parent Escape stay hide-only ${width}`, () => fixture(width, async page => {
    await open(page); const before = await state(page);
    await page.locator('.support-close').click(); await hidden(page);
    expect(await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
    await open(page); expect((await state(page)).logouts).toBe(before.logouts);
    await page.keyboard.press('Escape'); await hidden(page);
    await open(page); expect((await state(page)).logouts).toBe(before.logouts);
    expect((await state(page)).hides).toBe(before.hides + 2);
  }));

  it(`account authority change hides old iframe ${width}`, () => fixture(width, async page => {
    await open(page); const before = await state(page);
    await page.evaluate(() => Reflect.get(window, 'fixtureSwitch')());
    await expect.poll(async () => (await state(page)).clears.length).toBeGreaterThan(before.clears.length);
    expect((await state(page)).clears.at(-1)!.nativeVisible).toBe(false);
    await hidden(page); expect(await page.locator('.support-close').count()).toBe(0);
    expect((await state(page)).logouts).toBeGreaterThan(before.logouts);
  }));

  it(`unmount leaves no visible vendor iframe ${width}`, () => fixture(width, async page => {
    await open(page); const before = await state(page);
    await page.evaluate(() => Reflect.get(window, 'fixtureUnmount')());
    await expect.poll(async () => (await state(page)).clears.length).toBeGreaterThan(before.clears.length);
    expect((await state(page)).clears.at(-1)!.frameVisible).toBe(false);
    await hidden(page); expect(await page.locator('.support-close').count()).toBe(0);
    expect((await state(page)).logouts).toBeGreaterThan(before.logouts);
  }));
}
