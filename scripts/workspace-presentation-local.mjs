import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium, webkit } from 'playwright';
import { resolve } from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { domRules, axeRule, textZoomRule, firstScreenRule } from './responsive/rules.mjs';

async function localHost(catalog) {
  const entry = '\0workspace-handler-entry', cacheDir = await mkdtemp(resolve(tmpdir(), 'clipmkr-workspace-vite-'));
  const server = await createServer({ configFile: false, root: process.cwd(), cacheDir,
    esbuild: { jsx: 'automatic' }, optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    resolve: { alias: { '@clipmaker/shared/tariff': resolve('packages/shared/src/tariff.ts') } },
    server: { host: '127.0.0.1', port: 0, watch: null }, plugins: [{ name: 'workspace-real-handlers',
      resolveId(id) { if (id === entry) return entry; },
      load(id) { if (id === entry) return `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {WorkspaceSettings,WorkspacePreferenceSync} from '/apps/web/src/app/WorkspaceSettings.tsx';
        ${catalog ? "import {UpgradeScreen} from '/apps/web/src/app/upgrade/UpgradeScreen.tsx';" : ''}
        const root=createRoot(document.getElementById('root'));
        const render=()=>root.render(React.createElement(React.Fragment,null,
          React.createElement(WorkspacePreferenceSync,{initialLayout:'workspace',initialTheme:'dark'}),
          React.createElement('nav',{className:'navigation'},React.createElement(WorkspaceSettings,{initialLayout:'workspace',initialTheme:'dark'})),
          ${catalog ? "React.createElement('main',{className:'container'},React.createElement(UpgradeScreen,{purchaseWindows:null,creditMode:true,salesEnabled:true,catalogOnly:false,ownerUnlimited:false,title:'Pro',price:'990 ₽',days:30,paidMinutes:270,current:{plan:'free',plan_source:'default',plan_paid_until:null}}))" : 'null'}));
        render();window.fixtureRerender=render;`; },
      configureServer(vite) { vite.middlewares.use('/fixture.html', async (req, res) => {
        const query = new URL(req.url, 'http://fixture.invalid').searchParams;
        const theme = query.get('theme') === 'light' ? 'light' : 'dark', layout = query.get('layout') === 'studio' ? 'studio' : 'workspace';
        res.setHeader('content-type', 'text/html');
        res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="${theme}" data-workspace-layout="${layout}"><head><title>КлипМейкер — локальная проверка компонента</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${theme}"><meta name="theme-color" content="#0e1311"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div class="workspace-shell" id="root"></div><script type="module" src="/@id/__x00__workspace-handler-entry"></script></body></html>`));
      }); },
    }],
  });
  await server.listen();
  return { base: `http://127.0.0.1:${server.httpServer.address().port}`,
    close: async () => { await server.close(); await rm(cacheDir, { recursive: true, force: true }); } };
}

export async function runLocalWorkspaceChecks(out, { denyPreferences, observed, settingsKeyboard }) {
  const results = [];
  const { base, close } = await localHost(false);
  try {
    for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
      const browser = await launcher.launch({ headless: true });
      try {
        for (const denied of ['throw', 'silent']) {
          const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); const page = await context.newPage();
          page.setDefaultTimeout(10_000);
          const errors = []; page.on('pageerror', error => errors.push(error.name));
          await denyPreferences(context, denied);
          await page.goto(base + '/fixture.html');
          await page.getByText('Настройки', { exact: true }).click();
          await page.getByLabel('Компоновка').selectOption('studio');
          await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
          await observed(page, 'studio', 'light'); assert.deepEqual(errors, []);
          await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; document.documentElement.dataset.workspaceLayout = 'workspace'; window.fixtureRerender(); });
          await page.waitForFunction(() => document.documentElement.dataset.theme === 'light' && document.documentElement.dataset.workspaceLayout === 'studio');
          await observed(page, 'studio', 'light');
          assert.match(await page.getByRole('status').textContent(), /сохранить не удалось/);
          await settingsKeyboard(page);
          results.push({ engine, denied, outcome: 'passed' }); await context.close();
        }
      } finally { await browser.close(); }
    }
  } finally { await close(); }
  await writeFile(resolve(out, 'local-handlers.json'), JSON.stringify({ scope: 'local React handlers; not Next E2E', results }, null, 2), { mode: 0o600 });
}

export async function runCatalogNoDates(out, { identity, modeWitnessDigest, observed, firstScreenViewports }) {
  const { base, close } = await localHost(true);
  const report = { schema: 'workspace-catalog-evidence-1', layer: 'component-boundary', case: 'noDates', identity, modeWitnessDigest,
    scope: 'actual UpgradeScreen + CSS, null purchaseWindows prop; not Next SSR/auth/provider E2E', results: [], outcome: 'incomplete' };
  try {
    for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
      const browser = await launcher.launch({ headless: true });
      try {
        const viewports = [...[320,360,390,414,672,768,1024,1440].map(width => ({ width, height: 844, firstScreen: false })),
          ...firstScreenViewports.map(({w,h}) => ({ width:w, height:h, firstScreen:true }))];
        for (const layout of ['workspace', 'studio']) for (const theme of ['dark', 'light']) for (const viewport of viewports) {
          const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
          const page = await context.newPage(), attempts = [], errors = []; page.setDefaultTimeout(10_000);
          page.on('pageerror', () => errors.push('pageerror'));
          await page.route('**/api/**', route => { attempts.push({ method: route.request().method(), endpoint: new URL(route.request().url()).pathname }); return route.abort(); });
          const row = { engine, layout, theme, viewport, name: 'catalog_no_dates_component_boundary', outcome: 'incomplete' };
          try {
            await page.goto(`${base}/fixture.html?layout=${layout}&theme=${theme}`, { waitUntil: 'networkidle' });
            await verifyCatalogComponent(page, { layout, theme, firstScreen: viewport.firstScreen }, observed);
            assert.deepEqual(attempts, []); assert.deepEqual(errors, []); row.outcome = 'passed';
          } catch (error) { row.outcome = error.message.includes('NOT ESTABLISHED') ? 'not-established' : 'failed'; row.reason = error.message.slice(0, 1000); }
          finally { report.results.push(row); await context.close(); }
        }
      } finally { await browser.close(); }
    }
    report.outcome = report.results.some(row => row.outcome === 'not-established') ? 'not-established' : report.results.every(row => row.outcome === 'passed') ? 'component-passed' : 'failed';
    return report;
  } finally { await close(); await writeFile(resolve(out, 'catalog-component-report.json'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
}

export async function workspacePalette(page) {
  const findings = await page.evaluate(() => {
    const failures = [], color = value => value.match(/[\d.]+/g)?.map(Number);
    const background = node => {
      const c = color(getComputedStyle(node).backgroundColor);
      if (!c) throw new Error('unreadable color');
      if ((c[3] ?? 1) === 1) return c.slice(0, 3);
      const base = node.parentElement ? background(node.parentElement) : [255, 255, 255], alpha = c[3] ?? 1;
      return base.map((channel, index) => channel * (1 - alpha) + c[index] * alpha);
    };
    const light = c => c.map(x => x / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4).reduce((n, x, i) => n + x * [.2126, .7152, .0722][i], 0);
    const ratio = (a, b) => (Math.max(light(a), light(b)) + .05) / (Math.min(light(a), light(b)) + .05);
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    for (const node of document.querySelectorAll('html,body,.workspace-shell,.navigation,.upload-panel,input:not([type=checkbox]):not([type=radio]),select,.clip-card,section[aria-labelledby=credit-title] > section[aria-label]')) {
      if (!visible(node)) continue;
      const bg = background(node);
      if (Math.max(...bg) - Math.min(...bg) > .01) failures.push(`non-neutral surface: ${node.tagName}.${node.className}`);
    }
    for (const node of document.querySelectorAll('.workspace-shell p,.workspace-shell label,.workspace-shell summary,.workspace-shell button,.workspace-shell a,.workspace-shell select,.workspace-shell input:not([type=file]):not([type=checkbox]):not([type=radio]),body > [role=status],.support-launcher')) {
      if (!visible(node)) continue;
      const style = getComputedStyle(node), fg = color(style.color), bg = background(node);
      if (fg && ratio(fg, bg) < 4.5) failures.push(`text contrast: ${node.tagName}.${node.className}`);
      if (node.matches('select,input:not([type=checkbox]):not([type=radio]):not([type=file])')) {
        const border = color(style.borderTopColor);
        if (border && ratio(border, bg) < 3) failures.push(`control border: ${node.tagName}`);
      }
      if (node === document.activeElement && style.outlineStyle !== 'none') {
        const outline = color(style.outlineColor), adjacent = node.parentElement ? background(node.parentElement) : bg;
        if (outline && ratio(outline, adjacent) < 3) failures.push('focus contrast');
      }
    }
    return failures;
  });
  assert.deepEqual(findings, []);
}

async function verifyCatalogComponent(page, { layout, theme, firstScreen }, observed) {
  const offers = page.locator('section[aria-labelledby="credit-title"] > section[aria-label]');
  assert.equal(await offers.count(), 3); assert.equal(await offers.locator('button:disabled').count(), 3);
  assert.equal(await page.locator('time[datetime]').count(), 0);
  assert.equal(await page.getByRole('status').filter({ hasText: 'Не удалось определить даты пакетов' }).count(), 1);
  assert.equal(await page.getByRole('link', { name: 'В кабинет', exact: true }).count(), 1);
  if (firstScreen) {
    assert.equal(await page.evaluate(() => scrollY), 0);
    for (const selector of ['section[aria-labelledby=credit-title] > p[role=status]', 'a.button[href="/dashboard"]']) {
      assert.deepEqual(await firstScreenRule(page, selector), []);
      assert.ok(await page.locator(selector).first().evaluate(node => { const r=node.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return r.left>=0&&r.right<=innerWidth&&!!top&&(node.contains(top)||top.contains(node)); }));
    }
  }
  assert.deepEqual((await domRules(page)).filter(row => row.severity === 'error'), []);
  await observed(page, layout, theme); await workspacePalette(page);
  if ([390,1440].includes(page.viewportSize().width)) {
    const axe = await axeRule(page); assert.deepEqual(axe.filter(row => row.severity === 'error'), []);
    if (axe.some(row => row.axeIncomplete)) throw new Error('NOT ESTABLISHED: axe incomplete');
  }
  assert.deepEqual((await textZoomRule(page)).filter(row => row.severity === 'error'), []);
}

// Сравнение настоящего компонента с frozen HTML при одинаковых viewport/theme/layout.
// Динамические данные не сравниваются с демонстрационными числами макета.
const approvedMeasurements = new Map();
export async function assertApprovedScene(page, { scene, width, theme, layout, state = 'normal', artifactDir = '/tmp/clipmkr-ux-author-qa/scenes' }) {
  const key = JSON.stringify([scene,width,theme,layout,state]);
  let approved = approvedMeasurements.get(key);
  if (!approved) {
    const reference = await page.context().newPage();
    try {
      await reference.setViewportSize({width,height:1000});
      const {readFile} = await import('node:fs/promises');
      await reference.setContent(await readFile('docs/design/2026-11-05-ux-simplification.html','utf8'));
      await reference.locator('#demo-role').selectOption('blogger');
      if(state!=='normal')await reference.locator('#demo-state').selectOption(state);
      await reference.locator('#demo-screen').selectOption(scene === 'stats' ? 'stats' : scene === 'account' ? 'settings' : 'result');
      await reference.locator('#demo-theme').selectOption(theme);
      await reference.locator('#demo-layout').selectOption(layout);
      approved = await reference.evaluate(scene => {
        const box = selector => document.querySelector(selector).getBoundingClientRect();
        return { accent:getComputedStyle(document.documentElement).getPropertyValue('--workspace-accent').trim(),
          shell:box('.shell').width, card:scene==='stats'?box('.referral').width:scene==='account'?box('.account-grid > section').width:box('.fake-player').width,
          columns:scene==='stats'||scene==='account'?getComputedStyle(document.querySelector(scene==='stats'?'.stats':'.account-grid')).gridTemplateColumns.split(' ').length:null };
      },scene);
      approvedMeasurements.set(key,approved);
    } finally { await reference.close(); }
  }
  const actual = await page.evaluate(scene => {
    const root=document.querySelector('.workspace-shell'), box=root.getBoundingClientRect();
    const css=getComputedStyle(root), selected=document.querySelector('.clip-card[data-selected=true]'), personal=document.querySelector('.personal-link-card');
    const list=[...document.querySelectorAll('[data-select-clip]')];
    const visible=node=>!!node&&!!node.getClientRects().length&&getComputedStyle(node).visibility!=='hidden';
    const fields=[...root.querySelectorAll('p,button,summary,textarea')].filter(visible);
    return { accent:css.getPropertyValue('--workspace-accent').trim(), shell:box.width,
      card:(scene==='stats'?personal?.parentElement:scene==='account'?document.querySelector('.account-grid > section'):selected?.querySelector('.clip-preview'))?.getBoundingClientRect().width,
      allClips:list.every(visible), count:list.length,
      clipped:fields.some(node=>getComputedStyle(node).overflow==='hidden'&&node.scrollHeight>node.clientHeight+1),
      personal:visible(personal), columns:document.querySelector(scene==='account'?'.account-grid':'.partner-counters')?getComputedStyle(document.querySelector(scene==='account'?'.account-grid':'.partner-counters')).gridTemplateColumns.split(' ').length:null,
      overflow:document.documentElement.scrollWidth>innerWidth+1 };
  },scene);
  const {mkdir}=await import('node:fs/promises');await mkdir(artifactDir,{recursive:true,mode:0o700});
  await page.screenshot({path:`${artifactDir}/${scene}-${state}-${theme}-${layout}-${width}.png`,fullPage:true});
  assert.equal(actual.accent,approved.accent,'approved green accent');
  assert.ok(Math.abs(actual.shell-approved.shell)<=2,'approved shell geometry');
  assert.ok(Math.abs(actual.card-approved.card)<=2,`approved ${scene} card geometry: ${actual.card}/${approved.card}`);
  assert.equal(actual.overflow,false,'horizontal overflow');assert.equal(actual.clipped,false,'critical text clipping');
  if(scene==='stats'){assert.equal(actual.personal,true,'standalone personal card');if(state==='normal'||state==='link-blocked')assert.equal(actual.columns,approved.columns,'stats columns');else assert.equal(actual.columns,null,'no invented counters before successful read');}
  else if(scene==='account')assert.equal(actual.columns,approved.columns,'account columns');
  else {assert.ok(actual.count>0);assert.equal(actual.allClips,true,'all roster entries including fourth remain visible');}
}
