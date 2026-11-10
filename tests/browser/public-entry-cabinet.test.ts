// Настоящие компоненты и CSS, createRoot mount. Transport/router управляемые; это не SSR hydration/live auth.
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { readFileSync, mkdtempSync, rmSync, mkdirSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
let server: ViteDevServer, browser: Browser, origin: string;
const cacheDir = mkdtempSync(join(tmpdir(), 'clipmkr-public-entry-'));
const OUT = process.env.PUBLIC_ENTRY_AUTHOR_OUT;
beforeAll(async () => {
  const entry = '\0public-entry-components', navigation = '\0public-entry-navigation';
  server = await createServer({ configFile: false, root: process.cwd(), cacheDir, esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-runtime', 'react/jsx-dev-runtime'], exclude: ['next/navigation'] },
    resolve: { alias: { '@clipmaker/shared/showcase': resolve('packages/shared/src/showcase.ts') } },
    server: { host: '127.0.0.1', port: 0, watch: null, hmr: false },
    plugins: [{ name: 'public-entry-components', enforce: 'pre',
      resolveId(id) { if (id === entry) return entry; if (id === 'next/navigation') return navigation; },
      load(id) {
        if (id === navigation) return `import {useSyncExternalStore} from 'react';export const usePathname=()=>useSyncExternalStore(cb=>{addEventListener('fixture-route',cb);return()=>removeEventListener('fixture-route',cb)},()=>window.fixturePath||'/');export const useRouter=()=>({push(path){window.pushes.push(path);window.fixturePath=path.split('?')[0].split('#')[0]||'/';dispatchEvent(new Event('fixture-route'))},refresh(){window.refreshes++}});`;
        if (id.endsWith('/acquisition-analytics.ts')) return readFileSync(id, 'utf8').replace('export function observeSignup()', 'function actualObserveSignup()') + '\nexport function observeSignup(){window.signupCalls++;actualObserveSignup()}';
        if (id === entry) return `import {createElement as h} from 'react';import {createRoot} from 'react-dom/client';import {Landing} from '/apps/web/src/app/Landing.tsx';
          import {AuthFlowProvider,AuthFlowNotice} from '/apps/web/src/app/AuthFlow.tsx';import {RecoveryForm} from '/apps/web/src/app/support/RecoveryForm.tsx';import {usePathname} from 'next/navigation';
          window.pushes=[];window.refreshes=0;window.signupCalls=0;window.fixturePath='/';let root=createRoot(document.getElementById('root'));
          const View=()=>usePathname()==='/forgot'?h(RecoveryForm,{mode:'forgot',mailAvailable:false}):h(Landing,{theme:document.documentElement.dataset.theme,creditMode:!new URLSearchParams(location.search).has('legacyBilling')});const render=()=>root.render(h(AuthFlowProvider,null,h(AuthFlowNotice),h(View)));
          window.remount=()=>{root.unmount();root=createRoot(document.getElementById('root'));render()};render();`;
      }, configureServer(vite) { vite.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/fixture.html')) { next(); return; }
        const cookieTheme = /(?:^|;\s*)n5_theme=(light|dark)(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
        const theme = cookieTheme ?? (new URL(req.url, 'http://fixture').searchParams.get('theme') === 'light' ? 'light' : 'dark');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root"></div><script type="module" src="/@id/__x00__public-entry-components"></script></body></html>`));
      }); },
    }],
  });
  await server.listen(); const address = server.httpServer?.address(); if (!address || typeof address === 'string') throw new Error('No fixture port'); origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch();
});
afterAll(async () => { await browser?.close(); await server?.close(); rmSync(cacheDir, { recursive: true, force: true }); });
type Observations = { pushes: string[]; refreshes: number; signupCalls: number; remount: () => void; hashListenerCount: number; inputs?: Element[]; form?: Element };
async function fixture(run: (page: Page) => Promise<void>, query = '', engine = browser, width = 390) {
  const context = await engine.newContext({ viewport: { width, height: 1000 } }); const page = await context.newPage(); page.setDefaultTimeout(5000);
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.name));
  await page.addInitScript(() => {
    const listeners = new Set<EventListenerOrEventListenerObject>();
    const add = EventTarget.prototype.addEventListener, remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      if (this === window && type === 'hashchange' && callback) listeners.add(callback);
      return add.call(this, type, callback, options);
    };
    EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, callback: EventListenerOrEventListenerObject | null, options?: boolean | EventListenerOptions) {
      if (this === window && type === 'hashchange' && callback) listeners.delete(callback);
      return remove.call(this, type, callback, options);
    };
    Object.defineProperty(window, 'hashListenerCount', { get: () => listeners.size });
  });
  await page.route('**/api/showcase/**', route => route.fulfill({ status: 404, body: '' }));
  try { await page.goto(`${origin}/fixture.html${query}`); await page.locator('#auth-email').waitFor(); await run(page); expect(errors).toEqual([]); }
  finally { await context.close(); }
}
const register = (page: Page) => page.locator('.public-modes button').first();
const login = (page: Page) => page.locator('.public-modes button').last();
async function fill(page: Page, password = 'synthetic-only-password') {
  await page.locator('[name=email]').fill('fixture@example.invalid'); await page.locator('[name=password]').fill(password);
}
async function submit(page: Page) { await page.locator('#auth button[type=submit]').click(); }
async function transport(page: Page, failApply = false) {
  const calls: string[] = [], payloads: object[] = [];
  await page.route('**/api/auth/*', async route => { calls.push(new URL(route.request().url()).pathname); await route.fulfill({ json: { ok: true, registration: 'created' } }); });
  await page.route('**/api/trpc/code.apply', async route => { calls.push('apply'); payloads.push(route.request().postDataJSON()); await route.fulfill(failApply && payloads.length === 1 ? { status: 400, json: { error: { message: 'Контрольный отказ кода' } } } : { json: { result: { data: { data: {} } } } }); });
  return { calls, payloads };
}
for (const text of [100, 200]) it(`public entry: header login keeps focused email inside 320x568 viewport at text${text}`, async () => fixture(async page => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale}%`; }, text);
  await fill(page); await page.locator('summary').click(); await page.locator('[name=partner_code]').fill('PARTNER');
  await page.locator('summary').click();
  await page.evaluate(() => {
    const w = window as unknown as Observations;
    w.inputs = Array.from(document.querySelectorAll('#auth input')); w.form = document.querySelector('#auth')!;
    (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0);
  });
  expect(await page.evaluate(() => scrollY)).toBe(0);
  const emailVisible = () => page.locator('#auth-email').evaluate(el => {
    const rect = el.getBoundingClientRect();
    return el === document.activeElement && rect.top >= 0 && rect.bottom <= innerHeight && rect.left >= 0 && rect.right <= innerWidth;
  });
  await page.locator('.public-header-login').click();
  expect(await page.locator('#auth-email').evaluate(el => el === document.activeElement)).toBe(true);
  await expect.poll(emailVisible).toBe(true);
  expect(await login(page).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[name=password]').getAttribute('autocomplete')).toBe('current-password');
  await register(page).click(); await expect.poll(emailVisible).toBe(true);
  expect(await register(page).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[name=password]').getAttribute('autocomplete')).toBe('new-password');
  expect(await page.evaluate(() => {
    const w = window as unknown as Observations;
    return w.form === document.querySelector('#auth') && w.inputs!.every((el, i) => el === document.querySelectorAll('#auth input')[i]);
  })).toBe(true);
  expect(await page.locator('[name=email]').inputValue()).toBe('fixture@example.invalid');
  expect(await page.locator('[name=password]').evaluate((el: HTMLInputElement) => el.value === 'synthetic-only-password')).toBe(true);
  expect(await page.locator('[name=partner_code]').inputValue()).toBe('PARTNER');
  expect(new URL(page.url()).searchParams.get('next')).toBe('/upgrade?from=clip_card');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}, `?next=${encodeURIComponent('/upgrade?from=clip_card')}`, browser, 320));
it('public entry: theme action has no aria-pressed and follows actual theme', async () => fixture(async page => {
  const action = page.locator('.theme-toggle');
  for (const [index, theme] of ['dark', 'light', 'dark'].entries()) {
    if (index > 0) await action.click();
    const label = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
    await expect.poll(() => page.locator('html').getAttribute('data-theme')).toBe(theme);
    expect(await action.getAttribute('aria-label')).toBe(label);
    expect(await action.textContent()).toContain(label);
    expect(await action.getAttribute('aria-pressed')).toBeNull();
  }
}, '?theme=dark'));
it('public entry RED baseline: CTA selects registration and mobile form precedes demo', async () => fixture(async page => {
  expect(await page.locator('.landing-cta').textContent()).toBe('Начать бесплатно →');
  expect(await register(page).getAttribute('aria-pressed')).toBe('true');
  await login(page).click(); await page.locator('.landing-cta').click();
  expect(await register(page).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('#auth-email').evaluate(el => el === document.activeElement)).toBe(true);
  const s = await transport(page); await fill(page); await submit(page); await expect.poll(() => s.calls.length).toBe(2);
  expect(s.calls).toEqual(['/api/auth/register', 'apply']);
  expect(await page.evaluate(() => document.querySelector('#auth')!.getBoundingClientRect().bottom <= document.querySelector('.landing-demo')!.getBoundingClientRect().top)).toBe(true);
}));
it('public entry: preserves input identity and enforces UTF-8 registration boundary', async () => fixture(async page => {
  const s = await transport(page); await page.locator('summary').click(); await fill(page); await page.locator('[name=partner_code]').fill('PARTNER');
  await page.evaluate(() => { const w = window as unknown as Observations; w.inputs = Array.from(document.querySelectorAll('#auth input')); w.form = document.querySelector('#auth')!; });
  await page.locator('summary').click(); await login(page).click(); await page.locator('.theme-toggle').click(); await register(page).click();
  expect(await page.evaluate(() => { const w = window as unknown as Observations; return w.form === document.querySelector('#auth') && w.inputs!.every((el, i) => el === document.querySelectorAll('#auth input')[i]); })).toBe(true);
  expect(await page.locator('[name=email]').evaluate((el: HTMLInputElement) => el.value === 'fixture@example.invalid')).toBe(true);
  expect(await page.locator('[name=password]').evaluate((el: HTMLInputElement) => el.value === 'synthetic-only-password')).toBe(true);
  expect(await page.locator('[name=partner_code]').evaluate((el: HTMLInputElement) => el.value === 'PARTNER')).toBe(true);
  for (const value of ['1234567', 'x'.repeat(73), 'я'.repeat(37), '😀'.repeat(19), 'x'.repeat(100000)]) {
    const start = Date.now(); await page.locator('[name=password]').fill(value); await submit(page);
    expect(s.calls.length).toBe(0); expect(Date.now() - start).toBeLessThan(5000);
    expect(await page.locator('[name=password]').getAttribute('aria-invalid')).toBe('true');
  }
  await login(page).click(); await page.locator('[name=password]').fill('x'.repeat(73)); await submit(page);
  await expect.poll(() => s.calls.length).toBe(2); expect(s.calls[0]).toBe('/api/auth/login');
  expect(await page.evaluate(() => Object.values({ ...localStorage, ...sessionStorage }).every(v => !String(v).includes('fixture@example.invalid') && !String(v).includes('synthetic-only-password')))).toBe(true);
}));
for (const value of ['12345678', 'x'.repeat(72), 'я'.repeat(36), '😀'.repeat(18)]) it(`registration allows boundary ${new TextEncoder().encode(value).length} bytes ${value.length} units`, async () => fixture(async page => {
  const s = await transport(page); await fill(page, value); await submit(page); await expect.poll(() => s.calls.length).toBe(2); expect(s.calls[0]).toBe('/api/auth/register');
}));
it('public entry: native email validity and accessible field errors', async () => fixture(async page => {
  const s = await transport(page); await fill(page); await page.locator('[name=email]').fill('invalid'); await submit(page);
  expect(s.calls.length).toBe(0); expect(await page.locator('[name=email]').getAttribute('aria-invalid')).toBe('true');
  expect(await page.locator('#auth-email-error').textContent()).toMatch(/почт/);
  expect(await page.locator('[name=email]').getAttribute('aria-describedby')).toContain('auth-email-error');
}));
for (const explicit of [false, true]) it(`auth then code.apply explicit=${explicit} then redirect and signup once`, async () => fixture(async page => {
  const s = await transport(page); await fill(page);
  if (explicit) { await page.locator('summary').click(); await page.locator('[name=partner_code]').fill('PARTNER'); }
  await submit(page); await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1);
  expect(s.calls).toEqual(['/api/auth/register', 'apply']); expect(s.payloads).toEqual([explicit ? { code: 'PARTNER' } : {}]);
  expect(await page.evaluate(() => ({ pushes: (window as unknown as Observations).pushes, signup: (window as unknown as Observations).signupCalls }))).toEqual({ pushes: ['/dashboard'], signup: 1 });
}));
for (const discard of [false, true]) it(`signedIn apply retry without second auth discard=${discard}`, async () => fixture(async page => {
  const s = await transport(page, true); await fill(page); await submit(page); await page.getByRole('alert').waitFor();
  expect(await page.evaluate(() => (window as unknown as Observations).pushes.length)).toBe(0);
  expect(await page.locator('.public-header-login').isDisabled()).toBe(true); expect(await register(page).isDisabled()).toBe(true);
  await page.locator('.theme-toggle').click();
  if (discard) await page.getByRole('button', { name: 'Продолжить без применения кода' }).click(); else await submit(page);
  await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1);
  expect(s.calls).toEqual(['/api/auth/register', 'apply', 'apply']); expect(s.payloads).toEqual([{}, discard ? { discard_referral: true } : {}]);
  expect(await page.evaluate(() => (window as unknown as Observations).signupCalls)).toBe(1);
}));
it('public entry: preserves safe next and rejects synchronous duplicate submits', async () => {
  for (const next of ['/upgrade?from=clip_card', '/upgrade/return?intent=11111111-1111-4111-8111-111111111111', 'https://evil.invalid', 'javascript:alert(1)']) await fixture(async page => {
    const calls: string[] = []; let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/api/auth/*', async route => { calls.push('auth'); await gate; await route.fulfill({ json: { ok: true, registration: 'created' } }); });
    await page.route('**/api/trpc/code.apply', async route => { calls.push('apply'); await route.fulfill({ json: { result: { data: { data: {} } } } }); });
    await page.locator('.landing-cta').click(); await login(page).click(); await page.locator('.theme-toggle').click(); await fill(page);
    expect(new URL(page.url()).searchParams.get('next')).toBe(next);
    await page.locator('#auth').evaluate((form: HTMLFormElement) => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    await expect.poll(() => calls.length).toBe(1); await page.waitForTimeout(80); expect(calls.length).toBe(1); release();
    await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1); expect(calls).toEqual(['auth', 'apply']);
    expect(await page.evaluate(() => (window as unknown as Observations).pushes)).toEqual([next.startsWith('/upgrade') ? next : '/dashboard']);
  }, `?next=${encodeURIComponent(next)}#auth`);
});
for (const mode of ['register', 'login'] as const) for (const pending of ['auth', 'apply']) it(`busy guards all external controls ${mode}/${pending}`, async () => fixture(async page => {
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); const calls: string[] = [];
  await page.route('**/api/auth/*', async route => { calls.push('auth'); if (pending === 'auth') await gate; await route.fulfill({ json: { ok: true, registration: 'created' } }); });
  await page.route('**/api/trpc/code.apply', async route => { calls.push('apply'); if (pending === 'apply') await gate; await route.fulfill({ json: { result: { data: { data: {} } } } }); });
  if (mode === 'login') await login(page).click(); await fill(page); await submit(page); await expect.poll(() => calls.length).toBe(pending === 'auth' ? 1 : 2);
  expect(await page.locator('.public-header-login').isDisabled()).toBe(true); expect(await register(page).isDisabled()).toBe(true); expect(await page.locator('.landing-cta').getAttribute('aria-disabled')).toBe('true');
  await page.locator('.landing-cta').evaluate((el: HTMLElement) => el.click()); await page.locator('.public-header-login').evaluate((el: HTMLButtonElement) => el.click());
  await page.locator('.theme-toggle').click(); expect(await (mode === 'login' ? login(page) : register(page)).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[name=password]').evaluate((el: HTMLInputElement) => el.value === 'synthetic-only-password')).toBe(true);
  release(); await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1); expect(calls).toEqual(['auth', 'apply']);
}));
for (const mode of ['register', 'login'] as const) for (const failure of ['4xx', '5xx', 'reject', 'malformed']) it(`honest auth error and retry ${mode}/${failure}`, async () => fixture(async page => {
  let calls = 0;
  await page.route('**/api/auth/*', async route => { calls++; if (calls > 1) { await route.fulfill({ json: { ok: true, registration: 'created' } }); return; }
    if (failure === 'reject') await route.abort(); else if (failure === 'malformed') await route.fulfill({ body: '{', contentType: 'application/json' }); else await route.fulfill({ status: failure === '4xx' ? 400 : 503, json: { error: 'Контрольный отказ' } }); });
  await page.route('**/api/trpc/code.apply', route => route.fulfill({ json: { result: { data: { data: {} } } } }));
  if (mode === 'login') await login(page).click(); await fill(page); await submit(page); await page.getByRole('alert').waitFor();
  expect(await page.evaluate(() => (window as unknown as Observations).pushes.length)).toBe(0); expect(await register(page).isDisabled()).toBe(false);
  await submit(page); await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1); expect(calls).toBe(2);
}));
it('real links, conditional credits, demo native controls and clean remount', async () => fixture(async page => {
  for (const href of ['/forgot', '/support', '/legal/terms', '/legal/privacy']) expect(await page.locator(`a[href="${href}"]`).count()).toBe(1);
  const video = page.locator('.landing-demo video'); expect(await video.getAttribute('controls')).not.toBeNull(); expect(await video.getAttribute('playsinline')).not.toBeNull(); expect(await video.getAttribute('preload')).toBe('none'); expect(await video.getAttribute('autoplay')).toBeNull();
  expect(await page.locator('a[href="/c/CTDUUG"]').count()).toBe(1); expect(await page.locator('.public-trial').textContent()).toContain('30');
  const s = await transport(page); expect(await page.evaluate(() => (window as unknown as Observations).hashListenerCount)).toBe(1);
  await fill(page); await page.evaluate(() => (window as unknown as Observations).remount());
  await page.locator('#auth-email').waitFor(); expect(await page.locator('[name=password]').inputValue()).toBe('');
  expect(await page.evaluate(() => (window as unknown as Observations).hashListenerCount)).toBe(1);
  await login(page).click(); await page.locator('.landing-cta').click(); expect(await register(page).getAttribute('aria-pressed')).toBe('true');
  await fill(page); await submit(page); await expect.poll(() => s.calls.length).toBe(2); expect(s.calls).toEqual(['/api/auth/register', 'apply']);
}));
it('other billing flag never promises trial credits', async () => fixture(async page => { expect(await page.locator('main').textContent()).not.toMatch(/30 (?:пробных|кредитов|минут)/); }, '?legacyBilling=1'));
it('theme storage fallback is visible without losing form', async () => fixture(async page => {
  await fill(page); await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Unavailable'); }; Object.defineProperty(document, 'cookie', { set() { throw new Error('Unavailable'); }, configurable: true }); });
  await page.locator('.theme-toggle').click(); expect(await page.getByRole('status').textContent()).toContain('сохранить не удалось'); expect(await page.locator('[name=password]').evaluate((el: HTMLInputElement) => el.value === 'synthetic-only-password')).toBe(true);
}));
it('visual matrix 320/390/1440 light/dark text100/200 and keyboard reachability', async () => {
  for (const width of [320, 390, 1440]) for (const theme of ['light', 'dark']) for (const text of [100, 200]) await fixture(async page => {
    await page.evaluate(scale => { document.documentElement.style.fontSize = `${scale}%`; }, text);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.landing-cta').isVisible()).toBe(true);
    expect(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(theme === 'light' ? 'rgb(244, 244, 243)' : 'rgb(17, 17, 17)');
    await page.locator('#auth-email').focus(); await page.keyboard.press('Tab'); expect(await page.locator('[name=password]').evaluate(el => el === document.activeElement)).toBe(true);
    expect(await page.locator('[name=password]').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
    await page.keyboard.press('Tab'); await page.keyboard.press('Space'); expect(await page.locator('details').getAttribute('open')).not.toBeNull(); await page.keyboard.press('Tab');
    expect(await page.locator('[name=partner_code]').evaluate(el => el === document.activeElement)).toBe(true); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Space');
    await page.evaluate(() => { (document.activeElement as HTMLElement)?.blur(); scrollTo(0, 0); });
    if (OUT) { mkdirSync(OUT, { recursive: true, mode: 0o700 }); const file = join(OUT, `${width}-${theme}-text${text}.png`); await page.screenshot({ path: file, fullPage: true }); chmodSync(file, 0o600); }
    await page.locator('.theme-toggle').click(); await page.reload(); expect(await page.locator('html').getAttribute('data-theme')).toBe(theme === 'light' ? 'dark' : 'light');
  }, `?theme=${theme}`, browser, width);
});
it('WebKit390 native controls and mode/theme smoke', async () => {
  const engine = await webkit.launch(); try { await fixture(async page => { await login(page).click(); await page.locator('.landing-cta').click(); expect(await register(page).getAttribute('aria-pressed')).toBe('true'); await page.locator('.theme-toggle').click(); expect(await page.locator('.landing-demo video').getAttribute('playsinline')).not.toBeNull(); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }, '', engine); } finally { await engine.close(); }
});
it('public entry RED baseline: initial registration mode', async () => fixture(async page => {
  expect(await page.locator('[name=password]').getAttribute('autocomplete')).toBe('new-password');
}));
it('public entry RED baseline: mobile order', async () => fixture(async page => {
  expect(await page.evaluate(() => document.querySelector('#auth')!.getBoundingClientRect().bottom <= document.querySelector('.landing-demo')!.getBoundingClientRect().top)).toBe(true);
}));

it('repeat registration conflict preserves email and switches to login', async () => fixture(async page => {
  await page.route('**/api/auth/register', route => route.fulfill({ status: 409, json: { code: 'account_exists', error: 'ignored' } }));
  await fill(page); await submit(page);
  await expect.poll(() => login(page).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[name=email]').inputValue()).toBe('fixture@example.invalid');
  expect(await page.locator('[name=password]').inputValue()).toBe('');
  expect(await page.getByRole('alert').textContent()).toBe('Этот аккаунт уже существует. Войдите с прежним паролем или восстановите доступ');
  expect(await page.locator('[name=password]').evaluate(el => el === document.activeElement)).toBe(true);
  expect(await page.locator('.public-header-login').isEnabled()).toBe(true);
}));
it('recovery round trip preserves email without persistence', async () => fixture(async page => {
  await page.route('**/api/auth/register', route => route.fulfill({ status: 409, json: { code: 'account_exists' } }));
  await fill(page); await submit(page); await expect.poll(() => login(page).getAttribute('aria-pressed')).toBe('true');
  await page.getByRole('link', { name: 'Забыли пароль?' }).click(); await page.getByRole('heading', { name: 'Восстановить доступ' }).waitFor();
  expect(await page.locator('[name=email]').inputValue()).toBe('fixture@example.invalid');
  await page.locator('nav[aria-label="Доступ к аккаунту"]').getByRole('link', { name: 'Войти', exact: true }).click();
  await expect.poll(() => login(page).getAttribute('aria-pressed')).toBe('true');
  expect(await page.locator('[name=email]').inputValue()).toBe('fixture@example.invalid'); expect(await page.locator('[name=password]').inputValue()).toBe('');
  expect(await page.locator('[name=password]').evaluate(element => element === document.activeElement)).toBe(true);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).not.toContain('fixture@example.invalid');
  expect(page.url()).not.toContain('fixture%40'); await page.reload(); expect(await page.locator('[name=email]').inputValue()).toBe('');
}));
it('created registration shows approved dismissible notice', async () => fixture(async page => {
  await transport(page); await fill(page); await submit(page);
  await page.getByRole('status').filter({ hasText: 'Аккаунт создан. Вы вошли.' }).waitFor();
  await page.getByRole('button', { name: 'Закрыть уведомление' }).click(); expect(await page.locator('.auth-flow-notice').count()).toBe(0);
}));
for (const explicit of [false, true]) it(`existing skips attribution and signup explicit=${explicit}`, async () => fixture(async page => {
  const s = await transport(page);
  await page.route('**/api/auth/register', route => { expect(route.request().headers()['x-clipmkr-registration']).toBe('outcomes-v1'); return route.fulfill({ json: { ok: true, registration: 'existing' } }); });
  await fill(page); if (explicit) { await page.locator('summary').click(); await page.locator('[name=partner_code]').fill('PARTNER'); }
  await submit(page); await page.getByRole('status').filter({ hasText: 'Аккаунт уже существует. Вы вошли.' }).waitFor();
  expect(s.calls).toEqual([]); expect(await page.evaluate(() => (window as unknown as Observations).signupCalls)).toBe(0);
  expect(await page.evaluate(() => (window as unknown as Observations).pushes)).toEqual(['/dashboard']);
}));
for (const body of [{}, null, [], { ok: false }, { ok: true }, { ok: true, registration: 'unknown' }]) it(`rejects unconfirmed registration ${JSON.stringify(body)}`, async () => fixture(async page => {
  let apply = 0; await page.route('**/api/auth/register', route => route.fulfill({ json: body }));
  await page.route('**/api/trpc/code.apply', route => { apply++; return route.fulfill({ json: {} }); });
  await fill(page); await submit(page); await page.getByRole('alert').waitFor();
  expect(apply).toBe(0); expect(await register(page).isEnabled()).toBe(true);
  expect(await page.evaluate(() => ({ signup: (window as unknown as Observations).signupCalls, pushes: (window as unknown as Observations).pushes }))).toEqual({ signup: 0, pushes: [] });
}));
it('existing redirect retry never applies referral', async () => fixture(async page => {
  const s = await transport(page);
  await page.route('**/api/auth/register', route => route.fulfill({ json: { ok: true, registration: 'existing' } }));
  await fill(page); await submit(page); await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(1);
  // Router is deliberately held at the old page: a second click during delayed navigation still cannot attribute.
  await submit(page); await expect.poll(() => page.evaluate(() => (window as unknown as Observations).refreshes)).toBe(2);
  expect(s.calls).toEqual([]); expect(await page.evaluate(() => (window as unknown as Observations).signupCalls)).toBe(0);
}));
