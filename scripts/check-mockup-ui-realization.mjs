#!/usr/bin/env node
// Приёмочный runner: исходный HTML неизменяем, published и локальные доказательства разделены.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, lstat, chmod } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium, webkit } from 'playwright';
import { axeRule, textZoomRule } from './responsive/rules.mjs';

const references = {
  style: ['docs/design/2026-11-04-style-directions.html', '9ea8f63f7dc66bb46a63276177f8033c9463e644b53e4b9e15d065ed49659106'],
  flow: ['docs/design/2026-11-04-mockup.html', '6f45ee0a6175ce1cb6bc46162dd2521fd3ee3698556eae53664967fbc147e299'],
};
const palettes = {
  light: { canvas: '#f4f4f3', surface: '#fdfdfc', panel: '#ffffff', text: '#202020', muted: '#565656', accent: '#305d45', hover: '#244936', onAccent: '#ffffff', divider: '#d0d0ce', soft: '#eeeeec', selected: '#e9e9e6' },
  dark: { canvas: '#111111', surface: '#1a1a1a', panel: '#222222', text: '#f1f1ef', muted: '#bdbdb9', accent: '#8fd4a4', hover: '#b5e6c2', onAccent: '#151515', divider: '#454543', soft: '#272725', selected: '#30302d' },
};
const selectors = {
  upload: { main: '.workspace-file', recent: '.workspace-recent', aside: '.workspace-aside', intro: '.studio-work', preview: '.studio-preview' },
  ready: { selected: '.clip-card[data-selected="true"]', poster: '.clip-card[data-selected="true"] .clip-preview', list: '.workspace-clip-list', intro: '.studio-ready-intro', gallery: '.studio-clips', cards: '.clip-card' },
  plans: { intro: '.studio-plans-intro', offers: '.workspace-plans', rows: '.studio-plan-row', description: '.package-description', end: '.package-end' },
};
const referenceSelectors = {
  upload: { main: '.workspace-file', recent: '.workspace-records', aside: '.workspace-side', intro: '.studio-work', preview: '.studio-preview' },
  ready: { selected: '.workspace-selected', poster: '.workspace-poster', list: '.workspace-list', intro: '.studio-ready-intro', gallery: '.studio-clips', cards: '.studio-clip' },
  plans: { intro: '.studio-plans-intro', offers: '.studio-plans-list', rows: '.workspace-package,.studio-plan', description: '.studio-plan>div:first-of-type', end: '.studio-plan-end' },
};
const unavailable = message => Object.assign(new Error(`NOT ESTABLISHED: ${message}`), { exitCode: 2 });
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function stageOriginManifest(fixture, base) {
  return base === 'https://clipmkr.ru' && fixture.actualHttpsOrigin === base && fixture.composeProject === 'n5-clipmaker'
    && fixture.serverIp === '194.85.249.105' && fixture.webContainer === 'n5-clipmaker-web-1';
}
function assertGeometry(boxes, layout, screen, width, count = 3) {
  const box = key => { assert.ok(boxes[key]?.length, `missing named region ${key}`); return boxes[key][0]; };
  const separated = (left, right) => assert.ok(left.right <= right.left + 1, 'named regions must be side by side');
  if (screen === 'upload') {
    if (layout === 'workspace') {
      const main = box('main'), recent = box('recent'), aside = box('aside');
      assert.ok(recent.top >= main.bottom - 1, 'recent follows file');
      if (width > 832) separated(main, aside);
      else assert.ok(aside.top >= recent.bottom - 1, 'aside follows recent on mobile');
    } else {
      const intro = box('intro'), preview = box('preview');
      if (width > 608) { separated(intro, preview); assert.ok(intro.width > preview.width, 'studio upload intro wider'); }
      else assert.ok(preview.top >= intro.bottom - 1, 'preview follows upload');
    }
  } else if (screen === 'ready' && count > 0) {
    if (layout === 'workspace') {
      const selected = box('selected'), poster = box('poster'), list = box('list');
      assert.ok(Math.abs(poster.width / poster.height - 9 / 16) <= .03, `poster 9:16 at ${width}: ${JSON.stringify(poster)}`);
      // CSS277: <=608px poster uses 55svh; the 16rem column ceiling applies above it.
      if (width > 608) assert.ok(poster.width <= 258, 'poster max 16rem');
      if (width > 832) separated(selected, list);
      else assert.ok(list.top >= selected.bottom - 1, 'fragment list follows player');
    } else {
      const intro = box('intro'), gallery = box('gallery'), cards = boxes.cards;
      assert.equal(cards?.length, count, 'every clip has geometry');
      if (width > 832) {
        separated(intro, gallery);
        if (count >= 3) { assert.ok(Math.abs(cards[0].top - cards[2].top) <= 2, 'three clips in first row'); assert.ok(cards[0].width > cards[1].width + 1, 'first gallery clip wider'); }
        if (count > 3) assert.ok(cards[3].top >= cards[0].bottom - 1, 'fourth clip wraps');
      } else {
        assert.ok(gallery.top >= intro.bottom - 1, 'gallery follows intro');
        if (width <= 608) for (let i = 1; i < cards.length; i++) assert.ok(cards[i].top >= cards[i - 1].bottom - 1, 'mobile clip order');
        else if (count >= 3) assert.ok(Math.abs(cards[0].top - cards[2].top) <= 2, 'tablet three clips');
      }
    }
  } else if (screen === 'plans') {
    const rows = boxes.rows; assert.equal(rows?.length, 3, 'three real offers');
    if (layout === 'workspace' && width > 832) {
      assert.ok(Math.max(...rows.map(row => row.width)) - Math.min(...rows.map(row => row.width)) <= 2, 'equal package columns');
      assert.ok(Math.max(...rows.map(row => row.top)) - Math.min(...rows.map(row => row.top)) <= 2, 'package columns in one row');
      separated(rows[0], rows[1]); separated(rows[1], rows[2]);
    } else {
      for (let i = 1; i < rows.length; i++) assert.ok(rows[i].top >= rows[i - 1].bottom - 1, 'offer rows ordered vertically');
      if (layout === 'studio' && width > 608) {
        if (width > 832) separated(box('intro'), box('offers'));
        else assert.ok(box('offers').top >= box('intro').bottom - 1, 'offers follow intro');
        for (let i = 0; i < 3; i++) separated(boxes.description[i], boxes.end[i]);
      }
    }
  }
}
function assertPalette(readouts, theme) {
  const rgb = color => color.startsWith('#') ? color.slice(1).match(/../g).map(hex => parseInt(hex, 16)) : color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  assert.ok(readouts.length >= 4, 'surface/text/accent readouts required');
  for (const row of readouts) {
    assert.ok(palettes[theme][row.role], `unknown palette role ${row.role}`);
    const expected = rgb(palettes[theme][row.role]), actual = rgb(row.actual);
    assert.ok(actual?.length === 3 && actual.every((value, i) => Math.abs(value - expected[i]) <= 1), `${row.selector} ${row.property}: ${row.actual} expected ${palettes[theme][row.role]}`);
  }
}
function assertContent(snapshot, count, layout, screen) {
  assert.ok(snapshot.overflow <= 1, 'horizontal overflow');
  assert.equal(snapshot.clipped.length, 0, `visible long text must wrap without clipping: ${snapshot.clipped.join(',')}`);
  assert.equal(snapshot.unreachable.length, 0, `actions must have reachable bounds: ${snapshot.unreachable.join(',')}`);
  if (screen === 'ready') {
    assert.equal(snapshot.clips, count, 'all clips remain in roster');
    assert.equal(snapshot.visibleClips, layout === 'workspace' ? Math.min(1, count) : count, 'all expected clips visible');
    if (layout === 'workspace') assert.equal(snapshot.selectors, count, 'every fragment selectable');
    if (count === 0) assert.ok(snapshot.empty, 'honest empty state with next step');
  }
  if (screen === 'upload') assert.equal(snapshot.records, count, 'recent rows are not limited to prototype three');
}
function assertPlayerSnapshot(actual, before) {
  assert.equal(actual.same, true, 'player remounted'); assert.equal(actual.src, before.src, 'player source changed');
  assert.equal(actual.paused, false, 'playing player paused');
  assert.ok(Number.isFinite(before.time) && before.time > 0 && actual.time > before.time, 'playback must advance');
}
async function privateJson(file) {
  if (!file) throw unavailable('не задан private fixture');
  const info = await lstat(file);
  if (!info.isFile() || (info.mode & 0o077) || info.size > 2_000_000) throw unavailable('fixture/receipt требует private regular file <=2MB mode0600');
  let value;
  try { value = JSON.parse(await readFile(file, 'utf8')); } catch { throw unavailable('fixture/receipt содержит невалидный JSON'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw unavailable('fixture/receipt должен быть JSON object');
  return value;
}
async function loadFixture(mode, base, path) {
  const fixture = await privateJson(path);
  if (fixture.schema !== 'mockup-ui-realization-1' || fixture.mode !== mode) throw unavailable('неверная schema/mode fixture');
  let origin; try { origin = new URL(base); } catch { throw unavailable('base должен быть valid origin'); }
  if (origin.origin !== base) throw unavailable('base должен быть origin');
  if (mode === 'local' && !['127.0.0.1', '[::1]', 'localhost'].includes(new URL(base).hostname)) throw unavailable('local допускает только loopback');
  if (!/^[a-f0-9]{40}$/.test(fixture.sourceSha)) throw unavailable('нужен final source SHA');
  if (mode === 'published') {
    if (!stageOriginManifest(fixture, base) || !/^sha256:[a-f0-9]{64}$/.test(fixture.imageDigest)) throw unavailable('неверный published target/artifact');
    const witness = await privateJson(fixture.stackReceiptPath);
    for (const key of ['actualHttpsOrigin', 'composeProject', 'serverIp', 'webContainer', 'sourceSha', 'imageDigest']) if (witness[key] !== fixture[key]) throw unavailable(`stack witness mismatch ${key}`);
    const age = Date.now() - Date.parse(witness.observedAt);
    if (!(age >= 0 && age < 3_600_000) || !witness.backupVerified || !witness.dataPreserved || !witness.configPreserved || !witness.appOnly || !witness.dnsVerified || !witness.runtimeContainerId) throw unavailable('нужен свежий operator origin/container/backup/config/data witness');
    if (execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim() !== fixture.sourceSha) throw unavailable('checkout source SHA differs');
    if (execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim()
      || execFileSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'apps', 'packages', 'scripts'], { encoding: 'utf8' }).trim()) throw unavailable('published capture требует чистый final source');
    fixture.storage = await privateJson(fixture.privateStorageStateFile);
    if (!fixture.storage.cookies?.some(cookie => cookie.name === '__Host-n5_session' && cookie.secure && cookie.value)) throw unavailable('нет действующего session fixture');
  }
  for (const screen of ['upload', 'ready', 'plans']) {
    const item = fixture.screens?.[screen];
    if (!item || typeof item.path !== 'string' || !item.path.startsWith('/') || item.path.startsWith('//') || !Number.isInteger(item.count) || item.count < 0) throw unavailable(`нет named screen fixture ${screen}`);
    if (screen === 'plans' && item.count !== 3) throw unavailable('нужны три actual SKU');
    if (!Array.isArray(item.expectedText) || !item.expectedText.length) throw unavailable('нет actual content assertions');
  }
  if (mode === 'published') {
    if (!Array.isArray(fixture.variants) || fixture.variants.length !== 6 || fixture.variants.some(item => !item || typeof item !== 'object')) throw unavailable('published требует 0/1/4 real clip/recent variants');
    for (const screen of ['upload', 'ready']) for (const count of [0, 1, 4]) {
      const matches = fixture.variants.filter(item => item.screen === screen && item.count === count);
      if (matches.length !== 1) throw unavailable(`нет уникального ${screen}/${count} variant`);
      const item = matches[0];
      if (typeof item.path !== 'string' || !item.path.startsWith('/') || item.path.startsWith('//') || !Array.isArray(item.expectedText) || !item.expectedText.length) throw unavailable('variant path/content missing');
      item.storage = item.privateStorageStateFile ? await privateJson(item.privateStorageStateFile) : fixture.storage;
      if (!item.storage.cookies?.some(cookie => cookie.name === '__Host-n5_session' && cookie.secure && cookie.value)) throw unavailable('variant session missing');
    }
    if (typeof fixture.safeMedia?.path !== 'string' || typeof fixture.safeMedia?.filename !== 'string' || fixture.safeMedia.filename.length !== 160 || !/[^\s]{80}/u.test(fixture.safeMedia.filename) || !/^[a-f0-9]{64}$/.test(fixture.safeMedia.sha256)) throw unavailable('нужен approved160-char filename/80run и media digest');
    fixture.mediaBytes = await readFile(fixture.safeMedia.path);
    if (fixture.mediaBytes.length > 5_000_000 || digest(fixture.mediaBytes) !== fixture.safeMedia.sha256 || fixture.safeMedia.approved !== true) throw unavailable('safe media bytes/provenance mismatch');
  }
  fixture.manifestDigest = digest(await readFile(path));
  return fixture;
}
async function geometry(page, layout, screen, isReference = false) {
  const mapping = (isReference ? referenceSelectors : selectors)[screen];
  const prefix = isReference ? `.direction[data-direction="${layout}"][data-screen="${screen}"] ` : '';
  return page.evaluate(({ mapping, prefix }) => Object.fromEntries(Object.entries(mapping).map(([name, selector]) => [name,
    [...document.querySelectorAll(selector.split(',').map(item => prefix + item).join(','))].filter(node => node.getClientRects().length).map(node => {
      const b = node.getBoundingClientRect(); return { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height };
    })])), { mapping, prefix });
}
async function colors(page, theme, screen) {
  const layout = await page.locator('html').getAttribute('data-workspace-layout');
  const action = screen === 'ready' ? '.workspace-shell .clip-actions button:first-child' : '.workspace-shell .action-primary';
  const secondary = screen === 'ready' && layout === 'studio';
  const roles = [
    ['html', 'backgroundColor', 'canvas'], ['.workspace-shell', 'backgroundColor', 'surface'],
    ['.workspace-shell', 'color', 'text'], ['.workspace-head', 'backgroundColor', 'surface'],
    ['.workspace-balance', 'color', 'muted'], ['.workspace-balance strong', 'color', 'accent'], ['.workspace-head', 'borderBottomColor', 'divider'],
    [screen === 'plans' ? '.workspace-package' : screen === 'upload' ? '.workspace-file' : '.clip-card[data-selected="true"]', 'backgroundColor', 'surface'],
    [action, 'backgroundColor', secondary ? 'surface' : 'accent'], [action, 'color', secondary ? 'text' : 'onAccent'],
  ];
  if (screen === 'ready' && !await page.locator('.clip-card').count()) {
    const index = roles.findIndex(row => row[0].startsWith('.clip-card')); if (index >= 0) roles.splice(index, 1);
    for (let i = roles.length - 1; i >= 0; i--) if (roles[i][0].includes('.clip-actions')) roles.splice(i, 1);
  }
  if (screen === 'upload') roles.push(['.workspace-aside', 'backgroundColor', 'surface'], [layout === 'studio' ? '.studio-source-preview' : '.workspace-file-symbol', 'backgroundColor', 'soft']);
  if (screen === 'ready' && layout === 'workspace' && await page.locator('.clip-card').count()) roles.push(['[data-select-clip][aria-current=true]', 'backgroundColor', 'selected'], ['[data-select-clip][aria-current=true]', 'borderLeftColor', 'accent']);
  if (screen === 'plans') roles.push(['.workspace-package button.action-secondary', 'backgroundColor', layout === 'studio' ? 'surface' : 'panel']);
  const readouts = await page.evaluate(roles => roles.map(([selector, property, role]) => {
    const node = [...document.querySelectorAll(selector)].find(node => node.getClientRects().length);
    if (!node) return { selector, property, role, actual: 'missing' };
    const background = element => {
      const values = getComputedStyle(element).backgroundColor.match(/[\d.]+/g).map(Number), alpha = values[3] ?? 1;
      if (alpha === 1) return values.slice(0, 3);
      const parent = element.parentElement ? background(element.parentElement) : [255, 255, 255];
      return parent.map((value, i) => value * (1 - alpha) + values[i] * alpha);
    };
    const actual = property === 'backgroundColor' ? `rgb(${background(node).join(',')})` : getComputedStyle(node)[property];
    return { selector, property, role, actual };
  }), roles);
  try { assertPalette(readouts, theme); } catch (error) { error.readouts = readouts; throw error; }
  return readouts;
}
async function interactionColors(page, theme) {
  const primary = page.locator('.workspace-shell .action-primary:not(:disabled),.workspace-shell .clip-actions button:first-child:not(:disabled)').first();
  if (!await primary.count()) throw unavailable('нет enabled action для hover/focus');
  const secondary = await page.locator('html').getAttribute('data-workspace-layout') === 'studio' && await primary.evaluate(node => node.matches('.clip-actions button'));
  await primary.hover();
  const hover = await primary.evaluate((node, secondary) => ({ selector: 'enabled action:hover', property: secondary ? 'borderColor' : 'backgroundColor', role: secondary ? 'accent' : 'hover', actual: getComputedStyle(node)[secondary ? 'borderTopColor' : 'backgroundColor'] }), secondary);
  await page.mouse.move(0, 0); await page.keyboard.press('Tab'); await primary.focus();
  const focus = await primary.evaluate(node => ({ selector: 'enabled primary:focus-visible', property: 'outlineColor', role: 'accent', actual: getComputedStyle(node).outlineColor, visible: node.matches(':focus-visible'), style: getComputedStyle(node).outlineStyle }));
  assert.ok(focus.visible && focus.style !== 'none', 'keyboard focus visible');
  const foreground = await primary.evaluate((node, secondary) => ({ selector: 'enabled action', property: 'color', role: secondary ? 'text' : 'onAccent', actual: getComputedStyle(node).color }), secondary);
  const background = await primary.evaluate((node, secondary) => {
    let element = node;
    while (element.parentElement && getComputedStyle(element).backgroundColor === 'rgba(0, 0, 0, 0)') element = element.parentElement;
    return { selector: 'enabled action', property: 'backgroundColor', role: secondary ? 'surface' : 'accent', actual: getComputedStyle(element).backgroundColor };
  }, secondary);
  assertPalette([hover, focus, foreground, background], theme);
  return { hover, focus, foreground, background };
}
async function content(page) {
  return page.evaluate(() => {
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const shell = document.querySelector('.workspace-shell');
    const clipped = [...shell.querySelectorAll('h1,h2,h3,p,dd,dt,strong,.file-name')].filter(visible).filter(node => {
      const style = getComputedStyle(node);
      return style.textOverflow === 'ellipsis' || (style.webkitLineClamp !== 'none' && style.webkitLineClamp !== '0' && style.webkitLineClamp !== '')
        || (node.scrollWidth > node.clientWidth + 1 && ['hidden', 'clip'].includes(style.overflowX))
        || (node.scrollHeight > node.clientHeight + 1 && ['hidden', 'clip'].includes(style.overflowY));
    }).map(node => node.tagName + '.' + node.className);
    const unreachable = [...shell.querySelectorAll('button,a,input,summary')].filter(visible).filter(node => {
      const box = node.getBoundingClientRect(); return box.left < -1 || box.right > innerWidth + 1 || box.width < 1 || box.height < 1;
    }).map(node => node.tagName + '.' + node.className);
    return { overflow: document.documentElement.scrollWidth - innerWidth, clipped, unreachable,
      clips: shell.querySelectorAll('.clip-card').length, visibleClips: [...shell.querySelectorAll('.clip-card')].filter(visible).length,
      selectors: shell.querySelectorAll('[data-select-clip]').length, records: shell.querySelectorAll('.workspace-recent .workspace-record').length,
      empty: !!shell.querySelector('.empty') && !!shell.querySelector('a[href="/dashboard"],input[type="file"],button') };
  });
}
async function preference(page, layout, theme) {
  const settings = page.locator('.workspace-settings');
  if (await settings.getAttribute('open') === null) await settings.locator('summary').click();
  await page.getByLabel('Компоновка').selectOption(layout);
  const toggle = page.getByRole('button', { name: /Светлая тема|Тёмная тема/ });
  if (await page.locator('html').getAttribute('data-theme') !== theme) await toggle.click();
  if (await settings.getAttribute('open') !== null) await settings.locator('summary').click();
  await page.waitForFunction(({ layout, theme }) => document.documentElement.dataset.workspaceLayout === layout && document.documentElement.dataset.theme === theme, { layout, theme });
}
async function installNetworkAttribution(context) {
  await context.addInitScript(() => {
    const audit = { phase: 'H', calls: [] }; Object.defineProperty(window, '__mockupNetworkAudit', { value: audit });
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
      const request = input instanceof Request ? input : null;
      audit.calls.push({ url: request?.url ?? new URL(String(input), location.href).href, method: init?.method ?? request?.method ?? 'GET', phase: audit.phase });
      return originalFetch.call(this, input, init);
    };
    const interval = window.setInterval;
    window.setInterval = function(callback, delay, ...args) {
      return interval.call(this, typeof callback === 'function' ? (...values) => {
        const previous = audit.phase; audit.phase = 'P';
        try { return callback(...values); } finally { audit.phase = previous; }
      } : callback, delay, ...args);
    };
    for (const name of ['focus', 'visibilitychange']) window.addEventListener(name, () => {
      const previous = audit.phase; audit.phase = 'F'; queueMicrotask(() => { if (audit.phase === 'F') audit.phase = previous; });
    }, true);
  });
}
async function run(mode, base, fixture, out) {
  const originals = {};
  for (const [name, [path, hash]] of Object.entries(references)) {
    const bytes = await readFile(path); if (digest(bytes) !== hash) throw unavailable(`reference bytes changed: ${name}`);
    originals[name] = bytes.toString(); await writeFile(join(out, `reference-${name}.html`), bytes, { mode: 0o600 });
  }
  const report = { schema: 'mockup-ui-evidence-1', layer: mode === 'published' ? 'actual-next-published' : 'local-browser', sourceSha: fixture.sourceSha,
    imageDigest: fixture.imageDigest ?? null, fixtureDigest: fixture.manifestDigest, origin: base, references, startedAt: new Date().toISOString(), cases: [], outcome: 'INCOMPLETE',
    unexecuted: ['owner manual acceptance', 'provider upload/payment/referral journeys', 'QC-QUOTA real boundaries', 'independent paired visual review', 'actual browser page zoom'],
    exclusions: ['native video/poster pixels', 'browser native chrome', 'existing named semantic errors/warnings'] };
  const save = () => writeFile(join(out, 'report.private.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  await save();
  try {
    for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
      const browser = await launcher.launch();
      try {
        const cases = [];
        for (const width of [320, 390, 672, 768, 1024, 1440, 607, 608, 609, 831, 832, 833]) for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) for (const screen of ['upload', 'ready', 'plans']) {
          cases.push({ width, layout, theme, screen, item: fixture.screens[screen], group: [607, 608, 609, 831, 832, 833].includes(width) ? 'breakpoint' : 'base' });
        }
        for (const item of fixture.variants ?? []) for (const width of [320, 390, 1440]) for (const layout of ['workspace', 'studio']) for (const theme of ['light', 'dark']) {
          cases.push({ width, layout, theme, screen: item.screen, item, group: `content-${item.count}` });
        }
        for (const { width, layout, theme, screen, item, group } of cases) {
          const name = `${engine}-${width}-${layout}-${theme}-${screen}-${group}`, row = { name, group, count: item.count, dynamicDifferences: item.referenceDifferences ?? [], status: 'RUNNING' }; report.cases.push(row);
          const context = await browser.newContext({ storageState: item.storage ?? fixture.storage, viewport: { width, height: 1000 } });
          try {
            await installNetworkAttribution(context);
            const page = await context.newPage(), reference = await context.newPage(); page.setDefaultTimeout(15_000);
            const response = await page.goto(base + item.path);
            assert.ok(response?.ok(), 'actual route status'); assert.equal(new URL(page.url()).origin, base, 'actual origin');
            await page.locator('.workspace-shell').waitFor();
            for (const text of item.expectedText) assert.ok((await page.locator('body').innerText()).includes(text), 'actual fixture content missing');
            await page.evaluate(() => { window.__mockupNetworkAudit.phase = 'I'; window.__mockupNetworkAudit.calls = []; });
            await preference(page, layout, theme);
            await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
            row.preferenceRequests = await page.evaluate(() => { const audit = window.__mockupNetworkAudit; audit.phase = 'U'; return audit.calls.map(call => ({ method: call.method, path: new URL(call.url).pathname, phase: call.phase, rsc: new URL(call.url).searchParams.has('_rsc') })); });
            assert.equal(row.preferenceRequests.filter(call => call.phase === 'I' && (call.method !== 'GET' || call.path.startsWith('/api/') || call.rsc)).length, 0, 'toggle-origin I has no RPC/RSC/mutations');
            await reference.setContent(originals.style);
            await reference.evaluate(({ layout, theme, screen }) => {
              document.documentElement.dataset.workspaceTheme = theme;
              document.documentElement.dataset.activeDirection = layout;
              document.querySelectorAll('.direction').forEach(node => { node.hidden = node.dataset.direction !== layout || node.dataset.screen !== screen; });
            }, { layout, theme, screen });
            const crop = reference.locator(`.direction[data-direction="${layout}"][data-screen="${screen}"]`);
            if (group.startsWith('content-') && screen === 'upload' && fixture.mediaBytes) {
              const chooser = page.waitForEvent('filechooser'); await page.locator('#source-file-picker').click();
              await (await chooser).setFiles({ name: fixture.safeMedia.filename, mimeType: fixture.safeMedia.mimeType ?? 'video/mp4', buffer: fixture.mediaBytes });
              await page.waitForFunction(filename => document.querySelector('.file-name')?.textContent === filename, fixture.safeMedia.filename);
            }
            if (group.startsWith('content-') && screen === 'ready' && item.count > 0) {
              const titles = await page.locator('.clip-card h3').allTextContents();
              assert.ok(titles.some(title => title.length >= 160 && /[^\s]{80}/u.test(title)), 'actual long Cyrillic title fixture required');
            }
            row.referenceGeometry = await geometry(reference, layout, screen, true);
            row.paths = Object.fromEntries(['app-full', 'app-content', 'reference-full', 'reference-content'].map(key => [key, `${name}-${key}.png`]));
            await page.screenshot({ path: join(out, row.paths['app-full']), fullPage: true }); await page.locator('.workspace-shell').screenshot({ path: join(out, row.paths['app-content']) });
            await reference.screenshot({ path: join(out, row.paths['reference-full']), fullPage: true }); await crop.screenshot({ path: join(out, row.paths['reference-content']) });
            for (const path of Object.values(row.paths)) await chmod(join(out, path), 0o600);
            row.imageSha256 = Object.fromEntries(await Promise.all(Object.entries(row.paths).map(async ([key, path]) => [key, digest(await readFile(join(out, path)))])));
            row.geometry = await geometry(page, layout, screen); assertGeometry(row.geometry, layout, screen, width, item.count);
            row.content = await content(page); assertContent(row.content, item.count, layout, screen);
            row.colors = await colors(page, theme, screen);
            if ([390, 1440].includes(width)) {
              if (await page.locator('.action-primary:not(:disabled),.clip-actions button:first-child:not(:disabled)').count()) row.interactionColors = await interactionColors(page, theme);
              else row.interactionColors = { state: 'no-enabled-primary', reason: 'actual empty/unavailable state' };
              row.axe = await axeRule(page); assert.deepEqual(row.axe.filter(item => item.severity === 'error'), [], 'axe requires triage');
              row.textZoom = await textZoomRule(page); assert.deepEqual(row.textZoom.filter(item => item.severity === 'error'), [], '200% text clipping');
            }
            row.status = 'PASS';
          } catch (error) { row.status = 'FAIL'; row.error = error.message; if (error.readouts) row.colors = error.readouts; throw error; }
          finally { await context.close(); await save(); }
        }
      } finally { await browser.close(); }
    }
    assert.equal(report.cases.filter(row => row.group === 'base').length, 144);
    assert.equal(report.cases.filter(row => row.group === 'breakpoint').length, 144);
    if (mode === 'published') assert.equal(report.cases.filter(row => row.group.startsWith('content-')).length, 144);
    report.outcome = 'MATRIX_PASS_REVIEW_PENDING';
  } catch (error) { report.outcome = 'FAIL'; throw error; }
  finally { report.finishedAt = new Date().toISOString(); await save(); }
}
async function main() {
  const args = process.argv.slice(2), values = {};
  if (args.length !== 8) throw unavailable('usage: --mode local|published --base origin --fixture private0600.json --out private0700dir');
  for (let i = 0; i < args.length; i += 2) {
    if (!['--mode', '--base', '--fixture', '--out'].includes(args[i]) || values[args[i]]) throw unavailable('неверные CLI arguments');
    values[args[i]] = args[i + 1];
  }
  if (!['local', 'published'].includes(values['--mode'])) throw unavailable('нужен explicit mode');
  const fixture = await loadFixture(values['--mode'], values['--base'], values['--fixture']);
  const out = resolve(values['--out']); await mkdir(out, { recursive: true, mode: 0o700 });
  const info = await lstat(out); if (!info.isDirectory() || info.isSymbolicLink()) throw unavailable('out должен быть private directory');
  await chmod(out, 0o700);
  await run(values['--mode'], values['--base'], fixture, out);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = error.exitCode ?? (error.code === 'ENOENT' ? 2 : 1); });
}
