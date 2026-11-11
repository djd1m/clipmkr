// Real React consumer with an independently delayed cross-origin child message listener.
// Native protocol fixture only: this does not claim live vendor identity/history acceptance.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, type Browser, type Page } from 'playwright';
import { createServer as createHttpServer, type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const inbox = '00000000-0000-4000-8000-000000000001';
const cacheDir = mkdtempSync(join(tmpdir(), 'clipmkr-support-ready-'));
let server: ViteDevServer, widget: Server, browser: Browser, origin: string, widgetOrigin: string;

beforeAll(async () => {
  widget = createHttpServer((request, response) => {
    const path = new URL(request.url!, 'http://fixture').pathname;
    if (['/exchange', '/auth-me', '/history'].includes(path)) {
      response.setHeader('Content-Type', 'application/json');
      const delay = Number(new URL(request.url!, 'http://fixture').searchParams.get('delay')) || 0;
      setTimeout(() => response.end('{}'), delay); return;
    }
    if (path === '/widget.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(`window.initLibredesk=()=>{const frame=document.createElement('iframe');frame.id='libredesk-widget-${inbox}';
        frame.src=${JSON.stringify(widgetOrigin + '/widget?inbox_id=' + inbox)};frame.title='Local support widget';
        frame.style.cssText='display:none;position:fixed;right:0;top:100px;width:320px;height:500px;background:white';
        window.fixtureState||={shows:0,hides:0,logouts:0,ready:false};const s=window.fixtureState;
        const send=data=>frame.contentWindow.postMessage(data,${JSON.stringify(widgetOrigin)});
        const clearCookie=()=>{document.cookie='fixture-native-session=;Max-Age=0;path=/'};
        const onMessage=event=>{if(event.source!==frame.contentWindow||event.origin!==${JSON.stringify(widgetOrigin)})return;
          if(event.data?.type==='VUE_APP_READY')send({type:'SESSION_DATA',sessionToken:document.cookie.split('; ').find(x=>x.startsWith('fixture-native-session='))?.split('=')[1]||''});
          if(event.data?.type==='STORE_SESSION')document.cookie='fixture-native-session='+event.data.token+';path=/';
          if(event.data?.type==='WIDGET_LOADED')s.ready=true;};addEventListener('message',onMessage);
        const api=window.Libredesk={show(){s.shows++;frame.style.display='block'},hide(){s.hides++;frame.style.display='none'},
          setUser(jwt){send({type:'SET_JWT_TOKEN',jwt})},logout(){s.logouts++;clearCookie();send({type:'CLEAR_SESSION'})},
          destroy(){removeEventListener('message',onMessage);frame.remove()}};
        document.body.append(frame);return api;};window.initLibredesk();`); return;
    }
    if (path !== '/widget') { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(`<!doctype html><html lang="ru"><body><h1>Локальный виджет</h1><p id="identity">anonymous</p><input aria-label="Draft"><button>Home</button>
      <script>let exchanges=0;setTimeout(()=>{addEventListener('message',async event=>{if(event.source!==parent)return;
        if(event.data?.type==='SESSION_DATA'){
          if(event.data.sessionToken){const identity=event.data.sessionToken==='fixture-A'?'A':'B';await fetch('/auth-me?identity='+identity);await fetch('/history?identity='+identity);document.getElementById('identity').textContent=identity;}
          parent.postMessage({type:'WIDGET_LOADED'},event.origin);
        }
        if(event.data?.type==='SET_JWT_TOKEN'){try{await fetch('/exchange?delay='+(exchanges++?1000:0),{method:'POST'});
          const identity=event.data.jwt==='fixture-A'?'A':'B';await fetch('/history?identity='+identity);document.getElementById('identity').textContent=identity;
          parent.postMessage({type:'STORE_SESSION',token:event.data.jwt},event.origin);parent.postMessage({type:'WIDGET_LOADED'},event.origin);}catch{}}
        if(event.data?.type==='CLEAR_SESSION'){document.getElementById('identity').textContent='anonymous';setTimeout(()=>parent.postMessage({type:'WIDGET_LOADED'},event.origin),250);}
      });parent.postMessage({type:'VUE_APP_READY'},'*');},350);</script></body></html>`);
  });
  await new Promise<void>(resolve => widget.listen(0, '127.0.0.1', resolve));
  const widgetAddress = widget.address();
  if (!widgetAddress || typeof widgetAddress === 'string') throw new Error('No widget port');
  widgetOrigin = `http://127.0.0.1:${widgetAddress.port}`;
  const entry = '\0support-ready-entry', navigation = '\0support-ready-navigation';
  server = await createServer({ configFile: false, root: process.cwd(), cacheDir, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['next/navigation'] },
    server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
    plugins: [{ name: 'support-ready-fixture', enforce: 'pre',
      resolveId(id) { if (id === entry) return entry; if (id === 'next/navigation') return navigation; },
      load(id) {
        if (id === navigation) return 'const router={refresh(){}};export const useRouter=()=>router;';
        if (id !== entry) return;
        return `import {createElement as h,useState} from 'react';import {createRoot} from 'react-dom/client';
          import {SupportPanel} from '/apps/web/src/app/support/SupportPanel.tsx';
          const support={mode:'test',baseURL:${JSON.stringify(widgetOrigin)},inboxID:'${inbox}',identifiedEnabled:true,contactEmail:null,synthetic:true};
          function View(){const[account,setAccount]=useState({id:location.search.includes('account=B')?'synthetic-B':'synthetic-A',email:'fixture@test.invalid',verified:true});
            window.fixtureSwitch=()=>setAccount({id:'synthetic-B',email:'b@test.invalid',verified:true});
            return h('main',null,h('h1',null,'Поддержка'),h(SupportPanel,{support,account}));}
          const root=createRoot(document.getElementById('root'));root.render(h(View));`;
      }, configureServer(vite) { vite.middlewares.use(async (request, response, next) => {
        if (!request.url?.startsWith('/fixture.html')) { next(); return; }
        response.setHeader('Content-Type', 'text/html; charset=utf-8');
        response.end(await vite.transformIndexHtml('/fixture.html', '<!doctype html><html lang="ru"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root"></div><script type="module" src="/@id/__x00__support-ready-entry"></script></body></html>'));
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
async function fixture(width: number, run: (page: Page, counts: { sessions: number; exchanges: number; readsA: number }) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
  page.setDefaultTimeout(5000); const errors: string[] = [], counts = { sessions: 0, exchanges: 0, readsA: 0 };
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url());
    if (url.pathname === '/exchange') counts.exchanges++;
    if (['/auth-me', '/history'].includes(url.pathname) && url.searchParams.get('identity') === 'A') counts.readsA++;
  });
  await context.route('**/api/support/session', route => {
    counts.sessions++; return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ mode: 'verified', jwt: new URL(page.url()).searchParams.get('account') === 'B' ? 'fixture-B' : 'fixture-A' }) });
  });
  try {
    await page.goto(origin + '/fixture.html');
    await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).waitFor();
    expect(counts.sessions).toBe(0); expect(await page.locator('iframe').count()).toBe(0);
    await run(page, counts); expect(errors).toEqual([]);
  } finally { await context.close(); }
}
for (const width of [1440, 390]) {
  it(`cold first identify reaches child exchange once ${width}`, () => fixture(width, async (page, counts) => {
    await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).check();
    await page.getByRole('button', { name: 'Представить аккаунт в чате' }).click();
    await expect.poll(() => counts.exchanges, { timeout: 2000 }).toBe(1);
    expect(counts.sessions).toBe(1);
    await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('A');
    expect(await page.getByText('Аккаунт представлен в чате.', { exact: true }).isVisible()).toBe(true);
    await page.frameLocator('iframe').getByLabel('Draft').evaluate((input: HTMLInputElement) => { input.value = 'draft'; });
    await page.locator('.support-close').click();
    expect(await page.locator('iframe').isVisible()).toBe(false);
    expect(await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).evaluate(el => el === document.activeElement)).toBe(true);
    expect(counts.exchanges).toBe(1);
    // Authority refresh logs out the native identity and clears opt-in before B can act.
    await page.evaluate(() => Reflect.get(window, 'fixtureSwitch')());
    await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('anonymous');
    expect(await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).isChecked()).toBe(false);
    expect(counts.sessions).toBe(1);
  }));
  it(`cold anonymous and warm hide-only reopen preserve draft ${width}`, () => fixture(width, async (page, counts) => {
    const open = () => page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).click();
    await open(); await page.locator('.support-close').waitFor();
    expect(counts.sessions).toBe(0); expect(counts.exchanges).toBe(0);
    const frame = page.frameLocator('iframe');
    await frame.getByLabel('Draft').evaluate((input: HTMLInputElement) => { input.value = 'draft'; });
    const logouts = await page.evaluate(() => Reflect.get(window, 'fixtureState').logouts);
    await page.locator('.support-close').click(); await open(); await page.locator('.support-close').waitFor();
    expect(await frame.getByLabel('Draft').inputValue()).toBe('draft');
    expect(await page.evaluate(() => Reflect.get(window, 'fixtureState').logouts)).toBe(logouts);
    expect(await frame.locator('#identity').textContent()).toBe('anonymous');
    expect(counts.sessions).toBe(0); expect(counts.exchanges).toBe(0);
  }));
  it(`cold anonymous clears persisted vendor identity before child reads it ${width}`, () => fixture(width, async (page, counts) => {
    await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).check();
    await page.getByRole('button', { name: 'Представить аккаунт в чате' }).click();
    await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('A');
    await expect.poll(() => page.evaluate(() => document.cookie.includes('fixture-native-session=fixture-A'))).toBe(true);
    const readsA = counts.readsA;
    // Full navigation drops the SDK while its host session cookie survives, as in the owned native proof.
    await page.goto(origin + '/fixture.html?account=B');
    await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).waitFor();
    expect(await page.evaluate(() => Reflect.get(window, 'Libredesk') === undefined)).toBe(true);
    expect(await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).isChecked()).toBe(false);
    await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).click();
    await page.locator('.support-close').waitFor();
    expect(counts.readsA, 'anonymous B must not request A auth/history during child bootstrap').toBe(readsA);
    expect(await page.frameLocator('iframe').locator('#identity').textContent()).toBe('anonymous');
    expect(counts.sessions).toBe(1);
  }));
  it(`warm anonymous reset retires the old child before showing the new one ${width}`, () => fixture(width, async (page, counts) => {
    const identify = () => page.getByRole('button', { name: 'Представить аккаунт в чате' }).click();
    await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).check();
    await identify(); await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('A');
    await page.locator('.support-close').click();
    await identify(); await expect.poll(() => counts.exchanges).toBe(2);
    await page.locator('.support-close').click();
    const readsA = counts.readsA;
    await page.getByRole('button', { name: 'Открыть чат поддержки', exact: true }).click();
    await page.locator('.support-close').waitFor();
    await page.waitForTimeout(1200); // The retired child's delayed identity response/ready must not restore A.
    expect(counts.readsA, 'late old identity work must not fetch A history after anonymous reset').toBe(readsA);
    expect(await page.frameLocator('iframe').locator('#identity').textContent()).toBe('anonymous');
    expect(counts.sessions).toBe(2);
  }));
  it(`cold identified B clears A before native bootstrap ${width}`, () => fixture(width, async (page, counts) => {
    await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).check();
    await page.getByRole('button', { name: 'Представить аккаунт в чате' }).click();
    await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('A');
    await expect.poll(() => page.evaluate(() => document.cookie.includes('fixture-native-session=fixture-A'))).toBe(true);
    const readsA = counts.readsA;
    await page.goto(origin + '/fixture.html?account=B');
    await page.getByLabel('Разрешаю представить мой аккаунт', { exact: false }).check();
    await page.getByRole('button', { name: 'Представить аккаунт в чате' }).click();
    await expect.poll(() => page.frameLocator('iframe').locator('#identity').textContent()).toBe('B');
    expect(counts.readsA).toBe(readsA); expect(counts.sessions).toBe(2);
  }));
}
