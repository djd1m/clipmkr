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
      response.end(`window.initLibredesk=(settings)=>{const frame=document.createElement('iframe');frame.id='libredesk-widget-${inbox}';
        frame.src=${JSON.stringify(widgetOrigin + '/widget?inbox_id=' + inbox)};frame.title='Local support widget';
        frame.style.cssText='display:none;position:fixed;right:0;top:100px;width:320px;height:500px;background:white';
        window.fixtureState||={shows:0,hides:0,logouts:0,ready:false};const s=window.fixtureState;
        const send=data=>frame.contentWindow.postMessage(data,${JSON.stringify(widgetOrigin)});
        const clearCookie=()=>{document.cookie='fixture-native-session=;Max-Age=0;path=/'};
        const onMessage=event=>{if(event.source!==frame.contentWindow||event.origin!==${JSON.stringify(widgetOrigin)})return;
          if(event.data?.type==='VUE_APP_READY'){
            if(settings.userJWT)send({type:'SET_JWT_TOKEN',jwt:settings.userJWT});
            else send({type:'SESSION_DATA',sessionToken:document.cookie.split('; ').find(x=>x.startsWith('fixture-native-session='))?.split('=')[1]||''});
          }
          if(event.data?.type==='STORE_SESSION')document.cookie='fixture-native-session='+event.data.token+';path=/';
          if(event.data?.type==='WIDGET_LOADED')s.ready=true;};addEventListener('message',onMessage);
        const api=window.Libredesk={show(){s.shows++;frame.style.display='block'},hide(){s.hides++;frame.style.display='none'},
          setUser(jwt){send({type:'SET_JWT_TOKEN',jwt})},logout(){s.logouts++;clearCookie();send({type:'CLEAR_SESSION'})},
          destroy(){removeEventListener('message',onMessage);frame.remove()}};
        document.body.append(frame);return api;};window.initLibredesk(window.LibredeskSettings);`); return;
    }
    if (path !== '/widget') { response.writeHead(404).end(); return; }
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.end(`<!doctype html><html lang="ru"><body><h1>Локальный виджет</h1><p id="identity">anonymous</p><input aria-label="Draft"><button>Home</button>
      <script>let exchanges=0;setTimeout(()=>{addEventListener('message',async event=>{if(event.source!==parent)return;
        if(event.data?.type==='SESSION_DATA'){
          if(event.data.sessionToken){const identity=event.data.sessionToken==='fixture-A'?'A':'B';await fetch('/auth-me?identity='+identity);await fetch('/history?identity='+identity);document.getElementById('identity').textContent=identity;}
          parent.postMessage({type:'WIDGET_LOADED'},event.origin);
        }
        if(event.data?.type==='SET_JWT_TOKEN'){try{await fetch('/exchange?delay='+(event.data.jwt==='fixture-late-A'?1500:0),{method:'POST'});
          if(event.data.jwt==='fixture-invalid'){parent.postMessage({type:'WIDGET_LOADED'},event.origin);return;}
          const identity=event.data.jwt.endsWith('-A')?'A':'B';await fetch('/history?identity='+identity);document.getElementById('identity').textContent=identity;
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
          import {notifySupportSessionChange} from '/apps/web/src/lib/support-session-signal.ts';
          window.changeSession=notifySupportSessionChange;
          const support={mode:'test',baseURL:${JSON.stringify(widgetOrigin)},inboxID:'${inbox}',identifiedEnabled:true,contactEmail:null,synthetic:true};
          function View(){const[account,setAccount]=useState({id:location.search.includes('account=B')?'synthetic-B':'synthetic-A',email:'fixture@test.invalid',verified:!location.search.includes('unverified')});
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
type Control = { sessions: number; exchanges: number; readsA: number; nextJwt?: string };
async function fixture(width: number, run: (page: Page, counts: Control) => Promise<void>) {
  const context = await browser.newContext({ viewport: { width, height: 900 } }), page = await context.newPage();
  page.setDefaultTimeout(6000);
  const errors: string[] = [], counts: Control = { sessions: 0, exchanges: 0, readsA: 0 };
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { const url = new URL(request.url());
    if (url.pathname === '/exchange') counts.exchanges++;
    if (['/auth-me', '/history'].includes(url.pathname) && url.searchParams.get('identity') === 'A') counts.readsA++;
  });
  await context.route('**/api/support/session', route => {
    counts.sessions++;
    const expected = route.request().postDataJSON().accountId;
    expect(['synthetic-A', 'synthetic-B']).toContain(expected);
    const jwt = counts.nextJwt ?? (expected === 'synthetic-B' ? 'fixture-B' : 'fixture-A');
    counts.nextJwt = undefined;
    return route.fulfill({ json: { mode: 'verified', jwt } });
  });
  try {
    await page.goto(origin + '/fixture.html');
    await panelButton(page).waitFor();
    expect(counts.sessions).toBe(0);
    expect(await page.locator('iframe').count()).toBe(0);
    await run(page, counts);
    expect(errors).toEqual([]);
  } finally { await context.close(); }
}
const panelButton = (page: Page) => page.getByRole('button', { name: 'Открыть чат поддержки', exact: true });
const open = async (page: Page, identity: string) => {
  await panelButton(page).click();
  await page.locator('.support-close').waitFor();
  expect(await page.frameLocator('iframe').locator('#identity').textContent()).toBe(identity);
};

it('main button opens confirmed chat and reopens it without losing the draft', () => fixture(390, async (page, counts) => {
  await open(page, 'A');
  expect(counts.exchanges).toBe(1);
  const draft = page.frameLocator('iframe').getByLabel('Draft');
  await draft.evaluate((input: HTMLInputElement) => { input.value = 'draft'; });
  await page.locator('.support-close').click();
  expect(await page.locator('iframe').isVisible()).toBe(false);
  expect(await panelButton(page).evaluate(element => element === document.activeElement)).toBe(true);
  await open(page, 'A');
  expect(await draft.inputValue()).toBe('draft');
  expect(counts.exchanges).toBe(1);
  expect(counts.sessions).toBe(2);
}));

it('cold B with a persisted vendor cookie never requests A history', () => fixture(1440, async (page, counts) => {
  await open(page, 'A');
  expect(await page.evaluate(() => document.cookie.includes('fixture-native-session=fixture-A'))).toBe(true);
  const readsA = counts.readsA;
  await page.goto(origin + '/fixture.html?account=B');
  await open(page, 'B');
  expect(counts.readsA).toBe(readsA);
}));

it('cross-tab change cancels an in-flight A exchange before B relaunches', () => fixture(1440, async (page, counts) => {
  const otherTab = await page.context().newPage();
  await otherTab.goto(origin + '/fixture.html?account=B');
  await panelButton(otherTab).waitFor();
  counts.nextJwt = 'fixture-late-A';
  await panelButton(page).click();
  await expect.poll(() => counts.exchanges).toBe(1);
  expect(await page.locator('iframe').count()).toBe(1);
  await otherTab.evaluate(() => Reflect.get(window, 'changeSession')());
  await expect.poll(() => page.locator('iframe').count()).toBe(0);
  await page.evaluate(() => Reflect.get(window, 'fixtureSwitch')());
  await open(page, 'B');
  expect(counts.readsA).toBe(0);
  expect(counts.exchanges).toBe(2);
}));

it('widget-ready after a rejected identity keeps the iframe hidden and retry uses a fresh instance', () => fixture(390, async (page, counts) => {
  counts.nextJwt = 'fixture-invalid';
  await panelButton(page).click();
  await expect.poll(() => counts.exchanges).toBe(1);
  expect(await page.locator('iframe').isVisible()).toBe(false);
  await page.getByRole('alert').waitFor({timeout:10000});
  expect(await page.locator('iframe').count()).toBe(0);
  await open(page, 'A');
  expect(counts.exchanges).toBe(2);
}), 15000);

it('unconfirmed account sees email verification and no widget request', () => fixture(390, async (page, counts) => {
  await page.goto(origin + '/fixture.html?unverified');
  await page.getByRole('link', { name: 'Подтвердить почту', exact: true }).waitFor();
  expect(await panelButton(page).count()).toBe(0);
  expect(counts.sessions).toBe(0);
}));
