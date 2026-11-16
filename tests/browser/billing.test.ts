import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { createElement, Fragment, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { domRules, axeRule } from '../../scripts/responsive/rules.mjs';
import { preflight } from '../../scripts/responsive/input.mjs';
import { UpgradeScreen, type UpgradeCurrent } from '../../apps/web/src/app/upgrade/UpgradeScreen';
import { ReturnView } from '../../apps/web/src/app/upgrade/return/ReturnScreen';
import { ClipCard } from '../../apps/web/src/app/clips/ClipCard';
import { ThemeToggle } from '../../apps/web/src/app/ThemeToggle';
import type { ReturnState } from '../../apps/web/src/lib/payment-return';
import type { ClipScreen } from '../../apps/web/src/lib/screen-contract';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));

// Фича 30 payments (AC-1, AC-10): НАСТОЯЩАЯ разметка экранов оплаты и карточки с предложением Pro на НАСТОЯЩЕМ globals.css,
// обе темы, телефон 320 и десктоп 1440. Шесть состояний экрана возврата обязаны различаться и заголовком, и data-state.
const SCREENS = 'docs/features/payments/screens';
const CSS = readFileSync('apps/web/src/app/globals.css', 'utf8');
const RETURN_STATES: Record<string, ReturnState> = {
  waiting: { kind: 'waiting', attempts: 2 }, succeeded: { kind: 'succeeded', until: '2026-10-28T09:00:00.000Z' }, paid_inactive: { kind: 'paid_inactive' },
  failed: { kind: 'failed' }, unconfirmed: { kind: 'unconfirmed' }, not_found: { kind: 'not_found' },
};
const free: UpgradeCurrent = { plan: 'free', plan_source: 'none', plan_paid_until: null };
const paidNow: UpgradeCurrent = { plan: 'paid', plan_source: 'payment', plan_paid_until: '2026-10-20T09:00:00.000Z' };
const clip: ClipScreen = { clip_id: '00000000-0000-4000-8000-000000000001', index: 1, start: 12, end: 48, title: 'Почему короткий клип набирает больше, чем весь выпуск',
  status: 'done', watermarked: true, expires_at: null, available: true, duration_seconds: 36.2, score: 81, components: { hook: 29, completeness: 27, length: 25 },
  explanations: { hook: 'Вопрос с первых слов', completeness: 'Ответ законченный', length: 'Без лишних пауз' } };
const nav = (theme: 'dark' | 'light') => createElement('nav', { className: 'navigation' }, createElement('a', { className: 'brand', href: '/dashboard' }, createElement('span', null, '◧'), ' КлипМейкер'),
  createElement('a', { href: '/dashboard' }, 'Мои записи'), createElement(ThemeToggle, { initial: theme }));
function body(screen: string): ReactElement {
  if (screen === 'upgrade') return createElement(UpgradeScreen, { title: 'Pro', price: '990 ₽', days: 30, paidMinutes: 270, current: free });
  if (screen === 'upgrade-paid') return createElement(UpgradeScreen, { title: 'Pro', price: '990 ₽', days: 30, paidMinutes: 270, current: paidNow });
  if (screen === 'card-on') return createElement('div', { className: 'clip-grid' }, createElement(ClipCard, { clip, paymentsOn: true }));
  if (screen === 'card-off') return createElement('div', { className: 'clip-grid' }, createElement(ClipCard, { clip }));
  const state = RETURN_STATES[screen.replace(/^return-/, '')]!;
  return createElement('section', { className: 'status-panel', 'aria-live': 'polite' }, createElement(ReturnView, { state }));
}
function page(theme: 'dark' | 'light', screen: string) {
  const markup = renderToStaticMarkup(createElement(Fragment, null, nav(theme), createElement('main', { className: 'container' }, body(screen))));
  return `<!doctype html><html lang="ru" data-theme="${theme}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>КлипМейкер</title><style>${CSS}</style></head><body>${markup}</body></html>`;
}
const SCREEN_NAMES = ['upgrade', 'upgrade-paid', 'card-on', 'card-off', ...Object.keys(RETURN_STATES).map(s => `return-${s}`)];
let server: Server;
let base: string, cardBase: string, cardServer: ViteDevServer;
const cardCache=mkdtempSync(join(tmpdir(),'clipmkr-billing-card-'));
beforeAll(async () => {
  try { await preflight(['chromium', 'webkit']); }
  catch (error) { throw new Error(`НЕ ВЫПОЛНЕНО: ${String(error)}`); }
  server = createServer((req, res) => {
    const match = /^\/(dark|light)-([a-z_-]+)\.html$/.exec(req.url ?? '');
    if (!match || !SCREEN_NAMES.includes(match[2]!)) { res.writeHead(404).end(); return; }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.end(page(match[1] as 'dark' | 'light', match[2]!));
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Нет loopback порта');
  base = `http://127.0.0.1:${address.port}`;
  const entry='\0billing-mounted-card';
  cardServer=await createViteServer({configFile:false,root:process.cwd(),cacheDir:cardCache,esbuild:{jsx:'automatic'},
    optimizeDeps:{include:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime']},
    resolve:{alias:Object.fromEntries(['enums','cta','tariff','music-catalog','screen-layout','cut-timeline'].map(name=>[`@clipmaker/shared/${name}`,resolve(`packages/shared/src/${name}.ts`)]))},
    server:{host:'127.0.0.1',port:0,watch:null},plugins:[{name:'billing-real-card',
      resolveId(id){if(id===entry)return entry;},
      load(id){if(id===entry)return `import React from 'react';import {createRoot} from 'react-dom/client';import {ClipCard} from '/apps/web/src/app/clips/ClipCard.tsx';function Ready(){React.useEffect(()=>{window.cardReady=true},[]);return null;}createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(ClipCard,{clip:window.qaClip,paymentsOn:window.qaPaymentsOn}),React.createElement(Ready)));`;},
      configureServer(vite){vite.middlewares.use('/card.html',async(req,res)=>{const enabled=new URL(req.url??'','http://fixture.invalid').searchParams.get('on')==='1';res.setHeader('content-type','text/html; charset=utf-8');res.end(await vite.transformIndexHtml('/card.html',`<!doctype html><html lang="ru" data-theme="dark"><head><title>QA ClipCard capability</title><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div class="workspace-shell"><main class="container"><div id="root"></div></main></div><script>window.qaClip=${JSON.stringify(clip)};window.qaPaymentsOn=${enabled};</script><script type="module" src="/@id/__x00__billing-mounted-card"></script></body></html>`));});}
    }]});
  await cardServer.listen();const cardAddress=cardServer.httpServer?.address();if(!cardAddress||typeof cardAddress==='string')throw Error('No mounted card port');cardBase=`http://127.0.0.1:${cardAddress.port}`;
});
afterAll(async () => { await cardServer?.close();rmSync(cardCache,{recursive:true,force:true});if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); });
const errors = (found: { severity: string; rule: string; message: string; selector?: string }[]) =>
  found.filter(f => f.severity === 'error').map(f => `${f.rule} ${f.selector ?? ''}: ${f.message}`);

for (const [name, engine] of Object.entries({ chromium, webkit })) describe(`экраны оплаты ${name}`, () => {
  let browser: Browser;
  beforeAll(async () => { browser = await engine.launch(); });
  afterAll(async () => { await browser?.close(); });
  async function open(file: string, viewport: { width: number; height: number }, run: (page: Page) => Promise<void>) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
    try { const p = await context.newPage(); await p.goto(`${base}/${file}.html`); await run(p); }
    finally { await context.close(); }
  }
  async function openCard(enabled: boolean, run: (page: Page) => Promise<void>) {
    const context=await browser.newContext({viewport:{width:360,height:740}}),p=await context.newPage();let mutations=0;const errors:string[]=[];
    p.on('request',request=>{if(request.method()==='POST')mutations++;});p.on('pageerror',error=>errors.push(error.message));
    try {await p.goto(`${cardBase}/card.html?on=${enabled?'1':'0'}`);await p.waitForFunction(()=>Reflect.get(window,'cardReady')===true);
      expect(await p.getByRole('link',{name:'Оформить Pro'}).isVisible()).toBe(false);
      await p.locator('.clip-secondary > summary').click();await p.getByRole('button',{name:'Изменить оформление',exact:true}).click();
      await expect.poll(()=>p.getByRole('button',{name:'Применить музыку',exact:true}).isVisible()).toBe(true);await run(p);expect(mutations).toBe(0);expect(errors).toEqual([]);
    } finally {await context.close();}
  }
  for (const screen of SCREEN_NAMES) for (const theme of ['dark', 'light'] as const) {
    it(`${screen} ${theme} 320: без горизонтального скролла, цели 44, axe без отказов`, () => open(`${theme}-${screen}`, { width: 320, height: 640 }, async p => {
      expect(errors(await domRules(p, ['R1', 'R2', 'R5']))).toEqual([]);
      expect(errors(await axeRule(p))).toEqual([]);
      if (theme === 'dark' && name === 'webkit') { mkdirSync(SCREENS, { recursive: true }); await p.screenshot({ path: `${SCREENS}/${screen}-320.png`, fullPage: true }); }
    }));
  }
  it('экран возврата: шесть состояний различимы — шесть разных data-state и шесть разных заголовков', async () => {
    const seen: string[] = [];
    for (const state of Object.keys(RETURN_STATES)) await open(`dark-return-${state}`, { width: 360, height: 740 }, async p => {
      expect(await p.locator(`[data-state="${state}"]`).count()).toBe(1);
      seen.push(await p.locator('h1').innerText());
    });
    expect(new Set(seen).size).toBe(6);
  });
  it('карточка: при включённой оплате — видимая ссылка «Оформить Pro» на /upgrade, при выключенной — прежняя кнопка интереса', async () => {
    await openCard(true, async p => {
      const link = p.getByRole('link', { name: 'Оформить Pro' });
      expect(await link.getAttribute('href')).toBe('/upgrade?from=clip_card');
      expect(await link.isVisible()).toBe(true);
      expect(await p.getByRole('button', { name: 'Нужен тариф побольше' }).count()).toBe(0);
    });
    await openCard(false, async p => {
      expect(await p.getByRole('button', { name: 'Нужен тариф побольше' }).count()).toBe(1);
      expect(await p.locator('a[href^="/upgrade"]').count()).toBe(0);
    });
  });
  it('экран тарифа: цена, срок, что входит, кнопка оплаты; при действующем тарифе — дата окончания', async () => {
    await open('light-upgrade', { width: 390, height: 844 }, async p => {
      const text = await p.locator('main').innerText();
      for (const part of ['990', '30 дней', 'без метки', '270 минут', 'без автопродления']) expect(text).toContain(part);
      expect(await p.getByRole('button', { name: /Оплатить 990/ }).isVisible()).toBe(true);
    });
    await open('light-upgrade-paid', { width: 390, height: 844 }, async p => {
      expect(await p.locator('[data-state="current-paid"]').innerText()).toContain('20 октября 2026');
    });
  });
  it('1440: экран тарифа и возврата без горизонтального скролла; скриншоты десктопа', async () => {
    for (const screen of ['upgrade', 'return-succeeded']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      try {
        const p = await context.newPage(); await p.goto(`${base}/dark-${screen}.html`);
        expect(errors(await domRules(p, ['R1']))).toEqual([]);
        if (name === 'chromium') { mkdirSync(SCREENS, { recursive: true }); await p.screenshot({ path: `${SCREENS}/${screen}-1440.png`, fullPage: false }); }
      } finally { await context.close(); }
    }
  });
});
