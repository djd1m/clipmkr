import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { chromium, webkit } from 'playwright';
import { resolve } from 'node:path';
import { mkdir, chmod, writeFile, readFile, stat, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { domRules, axeRule, textZoomRule, firstScreenRule, FIRST_SCREEN_VIEWPORTS } from './responsive/rules.mjs';
import { tmpdir } from 'node:os';
async function denyPreferences(context, mode) {
  await context.addInitScript(mode => {
    const cookie = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', { configurable: true, get: () => cookie.get.call(document), set: value => {
      if (/^n5_(theme|workspace_layout)=/.test(value)) { if (mode === 'throw') throw new DOMException('denied', 'SecurityError'); return; }
      cookie.set.call(document, value);
    } });
  }, mode);
}
// Локальная проверка реальных React handlers. Не заменяет Next/stage E2E.
async function localHandlers(out) {
  const entry = '\0workspace-handler-entry';
  const cacheDir = await mkdtemp(resolve(tmpdir(), 'clipmkr-workspace-vite-'));
  const server = await createServer({ configFile: false, root: process.cwd(),
    cacheDir, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'] },
    server: { host: '127.0.0.1', port: 0, watch: null },
    plugins: [{ name: 'workspace-real-handlers',
      resolveId(id) { if (id === entry) return entry; },
      load(id) { if (id === entry) return `import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {WorkspaceSettings,WorkspacePreferenceSync} from '/apps/web/src/app/WorkspaceSettings.tsx';
        const root=createRoot(document.getElementById('root'));
        const render=()=>root.render(React.createElement(React.Fragment,null,
          React.createElement(WorkspacePreferenceSync,{initialLayout:'workspace',initialTheme:'dark'}),
          React.createElement(WorkspaceSettings,{initialLayout:'workspace',initialTheme:'dark'})));
        render();window.fixtureRerender=render;`; },
      configureServer(vite) { vite.middlewares.use('/fixture.html', async (_req, res) => {
        res.setHeader('content-type', 'text/html');
        res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="dark" data-workspace-layout="workspace"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="theme-color" content="#0e1311"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div class="workspace-shell"><nav class="navigation"><div id="root"></div></nav></div><script type="module" src="/@id/__x00__workspace-handler-entry"></script></body></html>`));
      }); },
    }],
  });
  const results = [];
  await server.listen();
  const base = `http://127.0.0.1:${server.httpServer.address().port}`;
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
  } finally { await server.close(); await rm(cacheDir, { recursive: true, force: true }); }
  await writeFile(resolve(out, 'local-handlers.json'), JSON.stringify({ scope: 'local React handlers; not Next E2E', results }, null, 2), { mode: 0o600 });
}
const uuid = value => typeof value === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value);
const unavailable = message => new Error(`NOT ESTABLISHED: ${message}`);
async function privateJson(file) {
  if (!file) throw unavailable('не задан private fixture/receipt');
  const info = await stat(file);
  if (!info.isFile() || (info.mode & 0o077) || info.size > 1_000_000) throw unavailable('private fixture/receipt требует mode 0600 и size ≤1MB');
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { throw unavailable('fixture/receipt не JSON'); }
}
async function loadStageFixture(base, path) {
  const fixture = await privateJson(path);
  if (fixture.schemaVersion !== 1 || fixture.composeProject !== 'clipmkr-stage-20261028') throw unavailable('неверная schema/project fixture');
  if (!base || new URL(base).protocol !== 'https:' || new URL(base).origin !== base || fixture.actualHttpsOrigin !== base) throw unavailable('нужен подтверждённый HTTPS origin');
  if (!/^[a-f0-9]{40}$/.test(fixture.sourceSha) || !/^sha256:[a-f0-9]{64}$/.test(fixture.imageDigest)) throw unavailable('нужен artifact SHA/digest');
  const witness = await privateJson(fixture.stackReceiptPath);
  for (const key of ['composeProject', 'sourceSha', 'imageDigest', 'actualHttpsOrigin']) if (witness[key] !== fixture[key]) throw unavailable('operator stack witness не совпадает');
  if (!Number.isFinite(Date.parse(witness.operatorObservedAt)) || !witness.dataPreserved || !witness.backupVerified
    || !witness.activeUploadsChecked || !witness.appOnly) throw unavailable('нет operator inventory/backup/data/app-only receipt');
  if (!['ordinary', 'owner', 'blogger', 'erasure'].every(role => fixture.roles?.[role])) throw unavailable('нет обязательных role fixtures');
  for (const role of Object.keys(fixture.roles)) {
    const item = fixture.roles?.[role];
    if (!uuid(item?.accountId)) throw unavailable(`нет role fixture ${role}`);
    item.storage = await privateJson(item.privateStorageStateFile);
    if (!item.storage.cookies?.some(cookie => cookie.name === '__Host-n5_session' && cookie.secure && cookie.value)) throw unavailable(`нет session fixture ${role}`);
  }
  if (new Set(Object.values(fixture.roles).map(role => role.accountId)).size !== Object.keys(fixture.roles).length) throw unavailable('role accounts должны различаться');
  const ownership = await privateJson(fixture.ownershipReceiptPath);
  if (ownership.accountId !== fixture.roles.ordinary.accountId || ownership.ownedVideoId !== fixture.ownedVideoId
    || ownership.foreignVideoId !== fixture.ownedOtherAccountVideoId || ownership.foreignAccountId === ownership.accountId
    || !Number.isFinite(Date.parse(ownership.observedAt))) throw unavailable('нет независимого ownership witness');
  if (!uuid(fixture.ownedVideoId) || !uuid(fixture.ownedOtherAccountVideoId) || fixture.existingOwnedCompletionTarget !== fixture.ownedVideoId) throw unavailable('нужны существующие owned/completion/foreign records');
  if (!Array.isArray(fixture.clipIds) || fixture.clipIds.length < 2 || !fixture.clipIds.every(uuid)
    || new Set(fixture.clipIds).size !== fixture.clipIds.length || fixture.fixedPublishedVersions?.length !== fixture.clipIds.length) throw unavailable('нужны два clip id/version');
  if (!Array.isArray(fixture.expectedSyntheticTitles) || fixture.expectedSyntheticTitles.length !== fixture.clipIds.length) throw unavailable('нет synthetic title provenance');
  if (!fixture.safeMedia?.offlineCreated || !fixture.safeMedia?.approved || !(fixture.safeMedia.durationSeconds >= 15)) throw unavailable('нет разрешённого offline media');
  fixture.media = await readFile(fixture.safeMedia.path);
  if (fixture.media.length > 5_000_000 || createHash('sha256').update(fixture.media).digest('hex') !== fixture.safeMedia.sha256) throw unavailable('media digest/budget mismatch');
  if (!Array.isArray(fixture.processingScenario?.syntheticResponses) || fixture.processingScenario.syntheticResponses.length !== 2) throw unavailable('нужны два явных synthetic poll response');
  if (!Array.isArray(fixture.safeReadEndpoints) || !fixture.safeReadEndpoints.every(p => typeof p === 'string' && p.startsWith('/api/'))) throw unavailable('нет named safe reads');
  if (!fixture.catalogCases || !['available', 'owner', 'salesOff', 'catalogOnly', 'noDates'].every(key => fixture.catalogCases[key]?.role && fixture.catalogCases[key]?.expectedText)) throw unavailable('нет server-rendered catalog cases');
  for (const item of Object.values(fixture.catalogCases)) {
    if (!fixture.roles[item.role]) throw unavailable('неизвестная catalog role');
    if (typeof item.path !== 'string' || !/^\/upgrade(?:\?[^#]*)?$/.test(item.path)) throw unavailable('catalog case должен вести на /upgrade');
  }
  for (const [index, response] of fixture.processingScenario.syntheticResponses.entries()) {
    if (response.video?.video_id !== fixture.ownedVideoId || !Array.isArray(response.clips)
      || !fixture.clipIds.every((id, n) => response.clips.some(clip => clip.clip_id === id && clip.available
        && String(clip.published_render_version ?? clip.render_version ?? 1) === String(fixture.fixedPublishedVersions[n])))) throw unavailable('poll fixture должен сохранять clip IDs/versions');
    if (!response.expectedUiText || (index && response.expectedUiText === fixture.processingScenario.syntheticResponses[0].expectedUiText)) throw unavailable('poll fixture требует два различимых UI результата');
  }
  if (!fixture.publicPaths?.clip?.startsWith('/c/') || !fixture.publicPaths?.guest?.startsWith('/g/')) throw unavailable('нет public c/g regression fixture');
  fixture.manifestDigest = createHash('sha256').update(await readFile(path)).digest('hex');
  return fixture;
}
function rpcEnvelope(data) { return { result: { data: { data } } }; }
async function openSettings(page) {
  const details = page.locator('.workspace-settings');
  assert.equal(await details.count(), 1);
  if (!(await details.getAttribute('open') !== null)) await details.locator('summary').click();
}
async function observed(page, layout, theme) {
  const actual = await page.evaluate(() => ({ layout: document.documentElement.dataset.workspaceLayout,
    theme: document.documentElement.dataset.theme, scheme: document.querySelector('meta[name="color-scheme"]')?.content }));
  assert.deepEqual(actual, { layout, theme, scheme: theme });
  await openSettings(page);
  assert.equal(await page.getByLabel('Компоновка').inputValue(), layout);
  assert.equal(await page.getByRole('button', { name: 'Светлая тема', exact: true }).getAttribute('aria-pressed'), String(theme === 'light'));
}
async function toggles(page) {
  await openSettings(page);
  const before = await page.evaluate(() => ({ layout: document.documentElement.dataset.workspaceLayout, theme: document.documentElement.dataset.theme }));
  await page.getByLabel('Компоновка').selectOption(before.layout === 'studio' ? 'workspace' : 'studio');
  assert.equal(await page.locator('html').getAttribute('data-theme'), before.theme);
  await page.getByLabel('Компоновка').selectOption(before.layout);
  const button = page.getByRole('button', { name: 'Светлая тема', exact: true });
  await button.click(); assert.equal(await page.locator('html').getAttribute('data-workspace-layout'), before.layout);
  await button.click(); await observed(page, before.layout, before.theme);
}
async function settingsKeyboard(page) {
  const summary = page.locator('.workspace-settings summary'), select = page.getByLabel('Компоновка');
  await summary.focus();
  if (await page.locator('.workspace-settings').getAttribute('open') !== null) await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); assert.equal(await select.evaluate(node => node === document.activeElement), false);
  await summary.focus(); await page.keyboard.press('Space');
  await page.keyboard.press('Tab'); assert.equal(await select.evaluate(node => node === document.activeElement), true);
  const before = await select.inputValue();
  await page.keyboard.press(before === 'studio' ? 'ArrowUp' : 'ArrowDown');
  // WebKit selects on keyup; native select is deliberately used in both engines.
  assert.notEqual(await select.inputValue(), before);
  assert.equal(await select.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Tab');
  const theme = page.getByRole('button', { name: 'Светлая тема', exact: true });
  assert.equal(await theme.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Space'); assert.equal(await theme.evaluate(node => node === document.activeElement), true);
  await page.keyboard.press('Shift+Tab'); assert.equal(await select.evaluate(node => node === document.activeElement), true);
  assert.equal(await page.locator('[tabindex]').evaluateAll(nodes => nodes.some(node => Number(node.getAttribute('tabindex')) > 0)), false);
  assert.deepEqual((await domRules(page, ['R1', 'R2', 'R5'])).filter(row => row.severity === 'error'), []);
}
function relevant(attempt) { return attempt.cause !== 'declared synthetic media' && (attempt.endpoint.startsWith('/api/') || attempt.rsc || attempt.navigation); }
async function idleToggle(page, state) {
  state.phase = 'I'; const before = state.attempts.length;
  await toggles(page); await page.clock.runFor(50); await page.waitForTimeout(50);
  assert.deepEqual(state.attempts.slice(before).filter(relevant), [], 'toggle must cause zero RPC/RSC/navigation, including prefetch');
}
async function nativeRefreshes(page, state) {
  for (const timed of [false, true]) {
    state.phase = 'F'; const before = state.attempts.length, response = page.waitForResponse(res => res.request().headers().rsc === '1');
    if (timed) await page.clock.runFor(30_000);
    else await page.evaluate(() => { if (document.visibilityState !== 'visible') throw new Error('focus requires visible document'); window.dispatchEvent(new Event('focus')); });
    await (await response).finished();
    assert.equal(state.attempts.slice(before).filter(row => row.rsc && row.cause === 'named native refresh').length, 1, `${timed ? '30s' : 'focus'} must produce one native RSC refresh`);
  }
}
async function palette(page) {
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
async function stageChecks(base, fixture, out) {
  const report = { scope: 'actual Next / browser-isolated mutations; not provider/DB verification', artifactSha: fixture.sourceSha,
    imageDigest: fixture.imageDigest, fixtureDigest: fixture.manifestDigest, results: [], manual: ['actual page zoom 200%', 'mobile OS keyboard'], requests: [] };
  for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
      const browser = await launcher.launch({ headless: true }).catch(() => { throw unavailable('browser runtime не готов'); });
    try {
      async function scenario(name, route, action, options = {}) {
        const role = options.role ?? 'ordinary';
        const context = await browser.newContext({ storageState: options.anonymous ? undefined : fixture.roles[role].storage, viewport: options.viewport ?? { width: 1440, height: 900 } });
        const state = { phase: 'H', attempts: [], violations: [], creates: 0, puts: [], completes: 0, checkouts: [], poll: 0, release: null };
        const gate = new Promise(resolveGate => { state.release = resolveGate; });
        const page = await context.newPage(); const errors = []; page.setDefaultTimeout(10_000); page.setDefaultNavigationTimeout(20_000);
        await page.clock.install({ time: new Date() });
        page.on('requestfailed', request => { if (new URL(request.url()).pathname.startsWith('/__workspace-part/')) state.uploadAborted = true; });
        page.on('pageerror', () => errors.push('pageerror'));
        if (options.denied) await denyPreferences(context, options.denied);
        await context.addCookies([{ name: 'n5_theme', value: options.theme ?? 'dark', url: base }, { name: 'n5_workspace_layout', value: options.layout ?? 'workspace', url: base }]);
        await page.route('**/*', async intercepted => {
          const request = intercepted.request(), url = new URL(request.url()), method = request.method();
          const endpoint = url.pathname, mutation = !['GET', 'HEAD', 'OPTIONS'].includes(method), rsc = request.headers().rsc === '1';
          const ordinal = state.attempts.length + 1;
          const entry = { engine, scenario: name, ordinal, method, endpoint, phase: state.phase, rsc,
            navigation: request.isNavigationRequest(), cause: 'unclassified' };
          state.attempts.push(entry);
          const fail = async cause => { entry.cause = cause; state.violations.push(cause); await intercepted.abort(); };
          if (url.origin !== base) return fail('unexpected external request');
          const mediaMatch = /^\/api\/clips\/([^/]+)\/(file|thumbnail)$/.exec(endpoint);
          if (mediaMatch && fixture.clipIds.includes(mediaMatch[1])) {
            entry.cause = 'declared synthetic media';
            if (mediaMatch[2] === 'thumbnail') return intercepted.fulfill({ status: 204 });
            const match = /^bytes=(\d+)-(\d*)/.exec(request.headers().range ?? '');
            if (match) {
              const start = Number(match[1]), end = match[2] ? Math.min(Number(match[2]), fixture.media.length - 1) : fixture.media.length - 1;
              return intercepted.fulfill({ status: 206, body: fixture.media.subarray(start, end + 1), headers: { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-range': `bytes ${start}-${end}/${fixture.media.length}` } });
            }
            return intercepted.fulfill({ status: 200, body: fixture.media, contentType: 'video/mp4' });
          }
          if (state.phase === 'I' && relevant(entry)) return fail('toggle-induced RPC/RSC/navigation');
          if (options.upload && endpoint === '/api/trpc/video.create' && state.phase === 'C' && method === 'POST') {
            entry.cause = 'explicit fixture upload'; state.creates++; state.key ??= request.headers()['idempotency-key'];
            if (!state.key || state.key !== request.headers()['idempotency-key'] || state.creates > 1) return fail('upload create/key changed');
            state.createOptions = request.postDataJSON();
            return intercepted.fulfill({ json: rpcEnvelope({ video_id: fixture.ownedVideoId, part_size: 4,
              parts: [1, 2].map(part_number => ({ part_number, url: base + `/__workspace-part/${part_number}`, expires_at: '2099-01-01T00:00:00Z' })) }) });
          }
          if (options.upload && /^\/__workspace-part\/[12]$/.test(endpoint) && state.phase === 'C' && method === 'PUT') {
            entry.cause = 'existing pending PUT'; const n = Number(endpoint.split('/').at(-1)); state.puts.push(n);
            if (!request.postDataBuffer()?.equals(Buffer.from(n === 1 ? '1234' : '5678'))) return fail('PUT bytes differ from captured synthetic File');
            if (n === 2) await gate;
            return intercepted.fulfill({ status: 200, headers: { etag: `"workspace-${n}"` } });
          }
          if (options.upload && endpoint === '/api/upload/complete' && state.phase === 'U' && method === 'POST') {
            entry.cause = 'released upload completion'; state.completes++;
            const body = request.postDataJSON(); state.completion = body;
            if (body.video_id !== fixture.ownedVideoId || state.completes !== 1) return fail('upload completion target/count changed');
            return intercepted.fulfill({ status: 202, json: { data: { video_id: fixture.ownedVideoId, status: 'queued' } } });
          }
          if (options.checkout && endpoint === '/api/checkout' && state.phase === 'C' && method === 'POST') {
            entry.cause = 'explicit intercepted checkout'; state.checkouts.push(request.postDataJSON().idempotency_key);
            await gate; return intercepted.fulfill({ status: 503, json: { error: { message: 'Тестовый отказ оплаты' } } });
          }
          if (endpoint.startsWith('/api/trpc/') && !mutation && state.phase === 'P') {
            const response = fixture.processingScenario.syntheticResponses[state.poll];
            if (endpoint.endsWith('video.get')) { entry.cause = 'named poll video'; return intercepted.fulfill({ json: rpcEnvelope(response.video) }); }
            if (endpoint.endsWith('clip.list')) { entry.cause = 'named poll clips'; return intercepted.fulfill({ json: rpcEnvelope({ clips: response.clips }) }); }
          }
          if (mutation) return fail('unexpected mutation attempt');
          if (endpoint.startsWith('/api/')) {
            if (state.phase !== 'H' || !fixture.safeReadEndpoints.includes(endpoint)) return fail('undeclared API read/phase');
            entry.cause = 'named initial existing read';
          } else if (rsc || request.isNavigationRequest()) {
            if (!['H', 'N', 'F', 'U'].includes(state.phase)) return fail('unexpected navigation/RSC phase');
            if (!/^\/(?:dashboard(?:\/videos\/[\da-f-]+|\/bloggers)?|upgrade(?:\/return)?|c\/[^/]+|g\/[^/]+)?$/.test(endpoint)) return fail('undeclared document/RSC route');
            entry.cause = rsc ? (state.phase === 'F' ? 'named native refresh' : 'named Next navigation/prefetch') : 'named document navigation';
          } else {
            if (!endpoint.startsWith('/_next/') && !['/favicon.ico', '/icon.png'].includes(endpoint)) return fail('undeclared static/read request');
            entry.cause = 'document/static';
          }
          await intercepted.continue();
        });
        try {
          const response = await page.goto(base + route, { waitUntil: 'networkidle' });
          if (options.expectedStatus) assert.equal(response?.status(), options.expectedStatus);
          else if (!options.redirect && (!response || response.status() >= 400 || new URL(page.url()).pathname !== route.split('?')[0])) throw unavailable('route/auth precondition');
          if (!options.public && !options.erasure && !options.redirect && !options.expectedStatus) await page.locator('.workspace-settings').waitFor();
          if (route === `/dashboard/videos/${fixture.ownedVideoId}`) {
            const html = await response.text();
            for (let index = 0; index < fixture.clipIds.length; index++) {
              const clip = fixture.clipIds[index], source = `/api/clips/${clip}/file?v=${fixture.fixedPublishedVersions[index]}`;
              if (!html.includes(source)) throw unavailable('actual owned SSR не содержит fixed clip version');
              const player = page.locator(`video[src="${source}"]`);
              if (await player.count() !== 1 || await player.getAttribute('aria-label') !== fixture.expectedSyntheticTitles[index]) throw unavailable('actual SSR clip title/count mismatch');
            }
          }
          await page.clock.pauseAt(new Date(await page.evaluate(() => Date.now()) + 50));
          await action(page, state, response);
          assert.deepEqual(errors, []); assert.deepEqual(state.violations, []);
          report.results.push({ engine, name, outcome: 'passed' });
        } catch (error) {
          report.results.push({ engine, name, outcome: error.message.includes('NOT ESTABLISHED') ? 'not-established' : 'failed' });
          throw error;
        } finally {
          state.release(); report.requests.push(...state.attempts); await context.close();
          await writeFile(resolve(out, 'stage-report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
        }
      }
      for (const [name, catalog] of Object.entries(fixture.catalogCases)) await scenario(`catalog_server_preconditions:${name}`, catalog.path, async (page, state, response) => {
        const html = await response.text();
        if (!html.includes(catalog.expectedText)) throw unavailable('catalog SSR state не соответствует fixture');
        const offers = page.locator('section[aria-labelledby="credit-title"] > section[aria-label]');
        if (await offers.count() !== 3) throw unavailable('нужен настоящий каталог из трёх пакетов');
        const enabled = await offers.locator('button:enabled').count();
        if ((name === 'available' && enabled !== 3) || (name !== 'available' && enabled !== 0)) throw unavailable('catalog purchase state не подтверждён');
        if (name === 'available' && await offers.locator('time[datetime]').count() !== 6) throw unavailable('purchase dates отсутствуют');
        await idleToggle(page, state);
      }, { role: catalog.role });
      for (const layout of ['workspace', 'studio', 'garbage']) {
        for (const route of ['/dashboard', '/upgrade']) await scenario(`anonymous_redirect:${layout}:${route}`, route, async page => {
          assert.equal(new URL(page.url()).pathname, '/'); assert.equal(await page.locator('.workspace-shell').count(), 0);
        }, { layout, anonymous: true, redirect: true });
        await scenario(`foreign_record_is_404:${layout}`, `/dashboard/videos/${fixture.ownedOtherAccountVideoId}`, async () => {}, { layout, expectedStatus: 404 });
        await scenario(`erasure_stays_isolated:${layout}`, '/dashboard', async page => {
          assert.equal(await page.locator('.workspace-shell,.workspace-settings,#source-file').count(), 0);
          assert.match(await page.locator('main').innerText(), /Удаляем аккаунт|Аккаунт удалён/);
        }, { layout, role: 'erasure', erasure: true });
      }
      await scenario('settings_keyboard_and_reflow', '/dashboard', async (page, state) => {
        state.phase = 'I'; await settingsKeyboard(page); await palette(page);
        assert.deepEqual((await textZoomRule(page)).filter(row => row.severity === 'error'), []);
      }, { viewport: { width: 320, height: 844 } });
      await scenario('toggle_requests_have_only_named_causes', '/dashboard', async (page, state) => { await idleToggle(page, state); await nativeRefreshes(page, state); await idleToggle(page, state); });
      for (const layout of ['workspace', 'studio']) for (const theme of ['dark', 'light']) {
        await scenario(`ssr_layout_matches_saved_preferences:${layout}:${theme}`, '/dashboard', async (page, state, response) => {
          const html = await response.text();
          assert.match(html, new RegExp(`data-theme="${theme}"`)); assert.match(html, new RegExp(`data-workspace-layout="${layout}"`));
          assert.match(html, /Компоновка/); await observed(page, layout, theme);
          assert.match(html, new RegExp(`aria-pressed="${theme === 'light'}"`));
          assert.match(html, new RegExp(`<option value="${layout}" selected=""`));
          await idleToggle(page, state); state.phase = 'N'; await page.reload({ waitUntil: 'networkidle' }); await observed(page, layout, theme);
        }, { layout, theme });
      }
      await scenario('next_cached_routes_and_refresh_keep_preferences', '/dashboard', async (page, state) => {
        state.phase = 'N';
        const detail = page.locator(`a[href="/dashboard/videos/${fixture.ownedVideoId}"]`).first();
        if (!await detail.count()) throw unavailable('dashboard должен содержать real Link к owned detail');
        await detail.click(); await page.waitForURL(`**/dashboard/videos/${fixture.ownedVideoId}`);
        await page.getByRole('link', { name: 'Тарифы', exact: true }).click(); await page.waitForURL('**/upgrade?**');
        await openSettings(page); await page.getByLabel('Компоновка').selectOption('studio'); await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
        await observed(page, 'studio', 'light'); await page.goBack({ waitUntil: 'networkidle' }); await observed(page, 'studio', 'light');
        await page.goForward({ waitUntil: 'networkidle' }); await observed(page, 'studio', 'light');
        await page.getByRole('link', { name: 'Мои записи', exact: true }).click(); await page.waitForURL('**/dashboard');
        await nativeRefreshes(page, state); await observed(page, 'studio', 'light'); await idleToggle(page, state);
      });
      for (const denied of ['throw', 'silent']) for (const saved of ['default', 'saved']) await scenario(`blocked_cookie_keeps_current_document:${denied}:${saved}`, '/dashboard', async (page, state) => {
        const original = { layout: saved === 'saved' ? 'studio' : 'workspace', theme: saved === 'saved' ? 'light' : 'dark' };
        const selected = { layout: original.layout === 'workspace' ? 'studio' : 'workspace', theme: original.theme === 'dark' ? 'light' : 'dark' };
        const cookieBefore = (await page.context().cookies()).filter(cookie => cookie.name.startsWith('n5_')).map(cookie => `${cookie.name}=${cookie.value}`).sort();
        await openSettings(page); state.phase = 'I'; await page.getByLabel('Компоновка').selectOption('studio'); await page.getByRole('button', { name: 'Светлая тема', exact: true }).click();
        await page.getByLabel('Компоновка').selectOption(selected.layout);
        await observed(page, selected.layout, selected.theme); assert.match(await page.getByRole('status').filter({ hasText: 'сохранить не удалось' }).textContent(), /этой вкладке/);
        assert.deepEqual((await page.context().cookies()).filter(cookie => cookie.name.startsWith('n5_')).map(cookie => `${cookie.name}=${cookie.value}`).sort(), cookieBefore);
        await nativeRefreshes(page, state); await observed(page, selected.layout, selected.theme);
        state.phase = 'N'; await page.getByRole('link', { name: 'Тарифы', exact: true }).click(); await page.waitForURL('**/upgrade?**'); await observed(page, selected.layout, selected.theme);
        await page.reload({ waitUntil: 'networkidle' }); await observed(page, original.layout, original.theme);
      }, { denied, layout: saved === 'saved' ? 'studio' : 'workspace', theme: saved === 'saved' ? 'light' : 'dark' });
      await scenario('layout_switch_preserves_active_upload', '/dashboard', async (page, state) => {
        const identity = await page.evaluateHandle(() => {
          const node = document.querySelector('#source-file'), captured = { node, file: null, reads: 0 };
          node.addEventListener('change', () => { captured.file = node.files?.[0] ?? null; }, { capture: true, once: true });
          const slice = File.prototype.slice;
          File.prototype.slice = function (...args) { if (this === captured.file) captured.reads++; return slice.apply(this, args); };
          return captured;
        });
        await page.locator('#source-file').setInputFiles({ name: 'workspace-synthetic.mp4', mimeType: 'video/mp4', buffer: Buffer.from('12345678') });
        assert.equal(await identity.evaluate(({ file }) => file instanceof File && file.size === 8), true, 'capture must precede native reset');
        const options = () => page.locator('.upload-controls input[type=checkbox],.upload-controls select').evaluateAll(nodes => nodes.map(node => ({ value: node.value, checked: node.checked })));
        const selectedOptions = await options();
        await idleToggle(page, state);
        assert.equal(await identity.evaluate(({ node }) => node.isConnected && node === document.querySelector('#source-file')), true); assert.deepEqual(await options(), selectedOptions);
        await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => /Создать клипы|Начать.*загрузку|Продолжить.*загрузку/.test(node.textContent) && !node.disabled));
        const beforeReads = await identity.evaluate(state => state.reads);
        state.phase = 'C';
        const firstPart = page.waitForResponse(response => new URL(response.url()).pathname === '/__workspace-part/1');
        await page.getByRole('button', { name: /Создать клипы|Начать.*загрузку|Продолжить.*загрузку/ }).first().click();
        await firstPart;
        await page.waitForFunction(() => document.querySelector('#source-file')?.disabled);
        await idleToggle(page, state);
        await nativeRefreshes(page, state);
        assert.equal(await identity.evaluate(({ node, file, reads }, before) => node.isConnected && node === document.querySelector('#source-file') && file instanceof File && reads - before >= 2, beforeReads), true);
        assert.deepEqual(await options(), selectedOptions);
        assert.deepEqual(state.puts.sort(), [1, 2]); assert.equal(state.creates, 1); assert.equal(state.completes, 0);
        assert.equal(state.uploadAborted ?? false, false);
        state.phase = 'U'; state.release(); await page.waitForURL(`**/dashboard/videos/${fixture.ownedVideoId}`);
        assert.equal(state.completes, 1); assert.deepEqual(state.puts.sort(), [1, 2]);
        assert.deepEqual(state.completion.parts.map(part => ({ part_number: part.part_number, etag: part.etag })).sort((a, b) => a.part_number - b.part_number),
          [{ part_number: 1, etag: '"workspace-1"' }, { part_number: 2, etag: '"workspace-2"' }]);
      }, { upload: true });
      await scenario('playing_clip_survives_layout_switch', `/dashboard/videos/${fixture.ownedVideoId}`, async (page, state) => {
        const video = page.locator('.clip-card video').nth(1);
        if (await page.locator('.clip-card video').count() < 2) throw unavailable('нет двух ready players');
        await video.evaluate(async node => { await node.play(); });
        await page.waitForFunction(() => document.querySelectorAll('.clip-card video')[1]?.currentTime > .2);
        const player = await video.evaluateHandle(node => node), start = await video.evaluate(node => ({ time: node.currentTime, src: node.getAttribute('src'), duration: node.duration }));
        if (!(start.duration >= 15) || !start.src.includes(fixture.clipIds[1])) throw unavailable('playback/id/duration precondition');
        await page.locator('.clip-card').nth(1).getByRole('button', { name: 'Отправить клип гостю', exact: true }).click();
        const form = page.locator('section[aria-labelledby="guest-title"]');
        await form.getByLabel('Имя гостя').fill('Синтетический гость');
        await form.locator('input[type=checkbox][required]').check();
        await idleToggle(page, state);
        assert.equal(await player.evaluate(node => node.isConnected && node === document.querySelectorAll('.clip-card video')[1]), true);
        assert.equal(await video.getAttribute('src'), start.src);
        assert.equal(await video.evaluate(node => node.paused), false);
        assert.ok(await video.evaluate(node => node.currentTime) >= start.time);
        for (let tick = 0; tick < 2; tick++) {
          state.poll = tick; state.phase = 'P'; const before = state.attempts.length;
          await page.clock.runFor(5000); await page.waitForLoadState('networkidle');
          const polls = state.attempts.slice(before).filter(row => row.cause.startsWith('named poll'));
          assert.equal(polls.filter(row => row.endpoint.endsWith('video.get')).length, 1);
          assert.equal(polls.filter(row => row.endpoint.endsWith('clip.list')).length, 1);
          assert.equal(polls.length, 2);
          await page.getByText(fixture.processingScenario.syntheticResponses[tick].expectedUiText, { exact: false }).first().waitFor();
          assert.equal(await player.evaluate(node => node.isConnected), true);
        }
        assert.equal(await form.getByLabel('Имя гостя').inputValue(), 'Синтетический гость');
        assert.equal(await form.getByRole('checkbox').nth(1).isChecked(), true); assert.equal(await form.locator('input[type=checkbox][required]').isChecked(), true);
        await video.evaluate(node => { node.pause(); node.currentTime = 3; }); await idleToggle(page, state);
        assert.equal(await video.evaluate(node => node.paused), true); assert.ok(Math.abs(await video.evaluate(node => node.currentTime) - 3) < .3);
      });
      await scenario('checkout_state_survives_toggle', '/upgrade', async (page, state) => {
        const buy = page.locator('section[aria-labelledby="credit-title"] > section[aria-label] button:enabled').first();
        if (!(await buy.count())) throw unavailable('нет enabled checkout server fixture');
        state.phase = 'C'; await buy.click(); await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent.includes('Переходим к оплате')));
        await idleToggle(page, state); assert.equal(state.checkouts.length, 1);
        state.phase = 'R'; state.release(); await page.getByRole('alert').filter({ hasText: 'Тестовый отказ оплаты' }).waitFor(); assert.equal(state.checkouts.length, 1);
      }, { checkout: true, role: fixture.catalogCases.available.role });
      for (const role of ['owner', 'blogger']) await scenario(`existing_access_gates_are_unchanged:${role}`, '/dashboard', async (page, state) => {
        if (role === 'owner') assert.equal(await page.getByRole('link', { name: 'Блогеры', exact: true }).count(), 1);
        else assert.equal(await page.getByRole('link', { name: 'Блогеры', exact: true }).count(), 0);
        await idleToggle(page, state);
      }, { role });
      for (const layout of ['workspace', 'studio']) for (const theme of ['dark', 'light']) for (const width of [320, 360, 390, 414, 672, 768, 1024, 1440]) {
        for (const route of ['/dashboard', `/dashboard/videos/${fixture.ownedVideoId}`, '/upgrade']) await scenario(`scoped_palette_and_contrast:geometry:${layout}:${theme}:${width}:${route}`, route, async page => {
          await observed(page, layout, theme);
          const findings = await domRules(page);
          assert.deepEqual(findings.filter(row => row.severity === 'error'), []);
          if (width === 390) assert.deepEqual((await textZoomRule(page)).filter(row => row.severity === 'error'), []);
          await palette(page);
          if (width === 390 || width === 1440) {
            const axe = await axeRule(page); assert.deepEqual(axe.filter(row => row.severity === 'error'), []);
            if (axe.some(row => row.axeIncomplete)) throw unavailable('axe incomplete требует отдельного contrast evidence');
          }
        }, { layout, theme, viewport: { width, height: 844 } });
      }
      for (const viewport of FIRST_SCREEN_VIEWPORTS) for (const route of ['/dashboard', `/dashboard/videos/${fixture.ownedVideoId}`, '/upgrade']) await scenario(`first_screen_actions_have_real_preconditions:${viewport.w}:${route}`, route, async page => {
        assert.equal(await page.evaluate(() => scrollY), 0);
        let selector = route === '/dashboard' ? '#source-file' : route === '/upgrade'
          ? 'section[aria-labelledby="credit-title"] > section[aria-label] button:enabled' : '.clip-card .clip-actions button:enabled';
        if (route === '/upgrade' && !(await page.locator(selector).count())) selector = 'a.button[href="/dashboard"]';
        assert.deepEqual(await firstScreenRule(page, selector), []);
        const hit = await page.locator(selector).first().evaluate(node => {
          const rect = node.getBoundingClientRect(), top = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
          return !node.disabled && rect.left >= 0 && rect.top >= 0 && rect.bottom <= innerHeight && rect.right <= innerWidth && !!top && (node.contains(top) || top.contains(node));
        }); assert.equal(hit, true);
      }, { viewport: { width: viewport.w, height: viewport.h } });
    } finally { await browser.close(); }
  }
  return report;
}
const args = process.argv.slice(2);
const value = flag => { const index = args.indexOf(flag); return index < 0 ? undefined : args[index + 1]; };
try {
  const out = value('--out');
  if (!out) throw unavailable('нужен приватный --out');
  await mkdir(out, { recursive: true, mode: 0o700 }); await chmod(out, 0o700);
  if (args.includes('--local-handlers')) await localHandlers(out);
  else { const base = value('--base'), fixture = await loadStageFixture(base, value('--fixture')); await stageChecks(base, fixture, out); }
} catch (error) {
  process.stderr.write(`${error.message.split('\n').slice(0, 3).join('\n')}\n`);
  process.exitCode = error.message.includes('NOT ESTABLISHED') || error.code === 'ENOENT' ? 2 : 1;
}
