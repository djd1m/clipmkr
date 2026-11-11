import { readFileSync } from 'node:fs';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { closeSupportWidget, clearSupportIdentity, openAnonymousSupport, loadSupportWidget, type PublicSupport, type WidgetAPI } from '../apps/web/src/lib/support-client';
import { SupportPanel } from '../apps/web/src/app/support/SupportPanel';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
type FakeBrowser = { Libredesk?: WidgetAPI; LibredeskSettings?: object; dispatchEvent?: ReturnType<typeof vi.fn> };
type FakeScript = { src?: string; referrerPolicy?: string; onload?: () => void; onerror?: () => void; remove: ReturnType<typeof vi.fn> };
const settings: PublicSupport = { mode: 'test', baseURL: 'https://support.test', inboxID: '00000000-0000-4000-8000-000000000001', identifiedEnabled: true, contactEmail: null, synthetic: true };
function widgetDOM(script: FakeScript = { remove: vi.fn() }, append = () => {}, autoReady = true) {
  const listeners = new Set<(event: object) => void>();
  Object.assign(window, {
    addEventListener: vi.fn((name: string, listener: (event: object) => void) => { if (name === 'message') listeners.add(listener); }),
    removeEventListener: vi.fn((name: string, listener: (event: object) => void) => { if (name === 'message') listeners.delete(listener); }),
  });
  let frame: { id: string; tagName: string; isConnected: boolean; src: string; style: { display: string }; contentWindow: object } | null = null;
  let notify = () => {};
  const disconnect = vi.fn();
  vi.stubGlobal('MutationObserver', class {
    constructor(callback: () => void) { notify = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  });
  vi.stubGlobal('document', { documentElement: {}, createElement: () => script,
    getElementById: (id: string) => id === frame?.id ? frame : null,
    head: { append } });
  const message = (data: unknown = { type: 'WIDGET_LOADED' }, origin = settings.baseURL!, source = frame?.contentWindow) => {
    for (const listener of listeners) listener({ data, origin, source });
  };
  return { disconnect, message, listeners, insert(src = `${settings.baseURL}/widget?inbox_id=${settings.inboxID}`, tagName = 'IFRAME', id = `libredesk-widget-${settings.inboxID}`) {
    frame = { id, tagName, isConnected: true, src, style: { display: 'none' }, contentWindow: {} }; notify();
    if (autoReady) queueMicrotask(() => message()); return frame;
  } };
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('official widget API-shaped synthetic fixture', () => {
  it('disabled mode creates no script or identity request', async () => {
    const createElement = vi.fn(), fetch = vi.fn(); vi.stubGlobal('document', { createElement }); vi.stubGlobal('fetch', fetch);
    await expect(loadSupportWidget({ ...settings, mode: 'disabled' })).rejects.toThrow('не подключён');
    expect(createElement).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
  });
  it('uses configured official widget.js and anonymous settings; separate A/B identities clear', async () => {
    const calls: string[] = [], api = { hide: vi.fn(), show: () => calls.push('show'), setUser: (jwt: string) => calls.push(jwt), logout: () => calls.push('logout') };
    const browser: FakeBrowser = { dispatchEvent: vi.fn() }, script: FakeScript = { remove: vi.fn() };
    vi.stubGlobal('window', browser);
    const dom = widgetDOM(script, () => { browser.Libredesk = api; queueMicrotask(() => { dom.insert(); script.onload?.(); }); });
    const loaded = await loadSupportWidget(settings);
    expect(script.src).toBe('https://support.test/widget.js'); expect(script.referrerPolicy).toBe('no-referrer');
    expect(browser.LibredeskSettings).toEqual({ baseURL: settings.baseURL, inboxID: settings.inboxID, hideLauncher: true });
    loaded.show(); loaded.setUser('SYNTHETIC_ACCOUNT_A'); clearSupportIdentity();
    expect(browser.LibredeskSettings).toBeUndefined(); loaded.setUser('SYNTHETIC_ACCOUNT_B'); loaded.show();
    expect(calls).toEqual(['logout', 'show', 'SYNTHETIC_ACCOUNT_A', 'logout', 'SYNTHETIC_ACCOUNT_B', 'show']);
  });
  it('SDK load failures reject visibly and remove settings', async () => {
    const browser: FakeBrowser = {}, script: FakeScript = { remove: vi.fn() }; vi.stubGlobal('window', browser);
    widgetDOM(script, () => queueMicrotask(() => script.onerror?.()));
    await expect(loadSupportWidget(settings)).rejects.toThrow('Не удалось загрузить чат'); expect(script.remove).toHaveBeenCalled(); expect(browser.LibredeskSettings).toBeUndefined();
  });
  it('vendor logout exception still clears local identity and broadcasts invalidation', () => {
    const browser: FakeBrowser = { Libredesk: { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: () => { throw new Error(); } }, LibredeskSettings: {}, dispatchEvent: vi.fn() }; vi.stubGlobal('window', browser);
    expect(() => clearSupportIdentity()).not.toThrow(); expect(browser.LibredeskSettings).toBeUndefined(); expect(browser.dispatchEvent).toHaveBeenCalled();
  });
  it('SSR never loads SDK or requests JWT and leaves opt-in/copy unchecked', () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const html = renderToStaticMarkup(createElement(SupportPanel, { support: settings, account: { id: 'synthetic-A', email: 'a@example.test', verified: true } }));
    expect(fetch).not.toHaveBeenCalled(); expect(html).toContain('СИНТЕТИЧЕСКИЙ СТЕНД'); expect(html).not.toContain('checked=""'); expect(html).not.toContain('<script'); expect(html).toContain('10 часов'); expect(html).toContain('Представить аккаунт в чате');
  });
});

describe('identified to anonymous transition', () => {
  it('logs out identified A, clears opt-in and then shows anonymous without requesting JWT', async () => {
    const calls: string[] = [], epoch = { current: 0 }; let identity: string | null = 'A', optedIn = true;
    const api: WidgetAPI = { hide: vi.fn(), setUser: vi.fn(), logout: () => { calls.push('logout'); identity = null; }, show: () => { calls.push('show'); expect(identity).toBeNull(); } };
    const browser: FakeBrowser = { Libredesk: api, LibredeskSettings: {}, dispatchEvent: vi.fn(() => { epoch.current++; optedIn = false; }) };
    const fetch = vi.fn(); vi.stubGlobal('window', browser); vi.stubGlobal('fetch', fetch); const dom = widgetDOM();
    const opening = openAnonymousSupport(settings, epoch); await new Promise<void>(resolve => setTimeout(resolve, 0)); dom.insert();
    expect(await opening).toBe(true);
    expect(calls).toEqual(['logout', 'show']); expect(optedIn).toBe(false); expect(browser.LibredeskSettings).toBeUndefined(); expect(fetch).not.toHaveBeenCalled();
  });
  it('refuses show and success after an asynchronous logout failure', async () => {
    const show = vi.fn(), epoch = { current: 0 };
    const browser: FakeBrowser = { Libredesk: { hide: vi.fn(), setUser: vi.fn(), logout: () => Promise.reject(new Error('vendor cleanup failed')), show }, LibredeskSettings: {}, dispatchEvent: vi.fn(() => { epoch.current++; }) };
    vi.stubGlobal('window', browser); widgetDOM();
    await expect(openAnonymousSupport(settings, epoch)).rejects.toThrow('Не удалось очистить чат');
    expect(show).not.toHaveBeenCalled(); expect(browser.LibredeskSettings).toBeUndefined();
  });
  it('cancels when another authority event occurs while official logout is pending', async () => {
    let finish: (() => void) | undefined; const epoch = { current: 0 }, show = vi.fn();
    const cleanup = new Promise<void>(resolve => { finish = resolve; });
    vi.stubGlobal('window', { Libredesk: { hide: vi.fn(), setUser: vi.fn(), logout: () => cleanup, show }, dispatchEvent: () => { epoch.current++; } });
    const opening = openAnonymousSupport(settings, epoch); epoch.current++; finish?.();
    expect(await opening).toBe(false); expect(show).not.toHaveBeenCalled();
  });
});

describe('asynchronous vendor iframe readiness', () => {
  it('first click waits beyond script load, ignores wrong frames and shows once after owned insertion', async () => {
    vi.useFakeTimers();
    let frame: ReturnType<ReturnType<typeof widgetDOM>['insert']> | undefined;
    const show = vi.fn(() => { if (frame) frame.style.display = 'block'; });
    const browser: FakeBrowser = { dispatchEvent: vi.fn() }, script: FakeScript = { remove: vi.fn() };
    vi.stubGlobal('window', browser);
    const dom = widgetDOM(script, () => { browser.Libredesk = { hide: vi.fn(), show, setUser: vi.fn(), logout: vi.fn() }; script.onload?.(); }, false);
    const opening = openAnonymousSupport(settings, { current: 0 });
    await vi.advanceTimersByTimeAsync(0);
    expect(show).not.toHaveBeenCalled();
    dom.insert('https://unrelated.test/widget?inbox_id=' + settings.inboxID);
    dom.insert(settings.baseURL + '/widget?inbox_id=wrong');
    dom.insert(settings.baseURL + '/elsewhere?inbox_id=' + settings.inboxID);
    dom.insert(undefined, 'DIV');
    dom.insert(undefined, 'IFRAME', 'libredesk-widget-unrelated');
    await vi.advanceTimersByTimeAsync(100);
    expect(show).not.toHaveBeenCalled();
    frame = dom.insert(); await Promise.resolve(); expect(show).not.toHaveBeenCalled();
    dom.message({ type: 'VUE_APP_READY' }); await Promise.resolve(); expect(show).not.toHaveBeenCalled();
    dom.message({ type: 'WIDGET_LOADED' }, 'https://evil.test'); await Promise.resolve(); expect(show).not.toHaveBeenCalled();
    dom.message({ type: 'WIDGET_LOADED' }, settings.baseURL!, {}); await Promise.resolve(); expect(show).not.toHaveBeenCalled();
    dom.message(null); await Promise.resolve(); expect(show).not.toHaveBeenCalled(); dom.message();
    expect(await opening).toBe(true); expect(frame.style.display).toBe('block');
    dom.insert(); expect(show).toHaveBeenCalledTimes(1);
    expect(dom.disconnect).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0); expect(dom.listeners.size).toBe(0);
    expect(script.onload).toBeNull(); expect(script.onerror).toBeNull();
  });
  it('cached API waits for delayed iframe and preserves epoch cancellation', async () => {
    vi.useFakeTimers(); const epoch = { current: 0 }, show = vi.fn();
    vi.stubGlobal('window', { Libredesk: { hide: vi.fn(), show, setUser: vi.fn(), logout: vi.fn() }, dispatchEvent: vi.fn() });
    const dom = widgetDOM(); const opening = openAnonymousSupport(settings, epoch);
    await vi.advanceTimersByTimeAsync(0); expect(show).not.toHaveBeenCalled();
    epoch.current++; dom.insert(); expect(await opening).toBe(false);
    expect(show).not.toHaveBeenCalled(); expect(dom.disconnect).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
  });
  it('reuses only the observed ready iframe, while a replacement waits for its own signal', async () => {
    vi.useFakeTimers();
    const api = { show: vi.fn(), setUser: vi.fn(), logout: vi.fn() };
    vi.stubGlobal('window', { Libredesk: api });
    const dom = widgetDOM(undefined, undefined, false), first = loadSupportWidget(settings);
    const old = dom.insert(); dom.message(); expect(await first).toBe(api);
    expect(await loadSupportWidget(settings)).toBe(api); expect(dom.listeners.size).toBe(0);
    const replacement = dom.insert(); let resolved = false;
    const next = loadSupportWidget(settings).then(value => { resolved = true; return value; });
    dom.message({ type: 'WIDGET_LOADED' }, settings.baseURL!, old.contentWindow);
    await Promise.resolve(); expect(resolved).toBe(false);
    dom.message({ type: 'WIDGET_LOADED' }, settings.baseURL!, replacement.contentWindow);
    expect(await next).toBe(api); expect(dom.listeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it.each([false, true])('times out and cleans up within total envelope (cached=%s)', async cached => {
    vi.useFakeTimers(); const api = { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: vi.fn() };
    const browser: FakeBrowser = cached ? { Libredesk: api } : {}, script: FakeScript = { remove: vi.fn() };
    vi.stubGlobal('window', browser); const dom = widgetDOM(script, () => {}, false);
    const loading = loadSupportWidget(settings);
    const rejected = expect(loading).rejects.toThrow('Не удалось загрузить чат');
    await vi.advanceTimersByTimeAsync(7000); browser.Libredesk = api; script.onload?.();
    dom.insert(); // A valid attached iframe without WIDGET_LOADED must still time out.
    await vi.advanceTimersByTimeAsync(1000); await rejected;
    expect(dom.disconnect).toHaveBeenCalledTimes(1); expect(vi.getTimerCount()).toBe(0);
    expect(browser.LibredeskSettings).toBeUndefined(); expect(dom.listeners.size).toBe(0);
    dom.message(); dom.insert(); expect(api.show).not.toHaveBeenCalled();
    if (!cached) { expect(script.remove).toHaveBeenCalledTimes(1); expect(script.onload).toBeNull(); expect(script.onerror).toBeNull(); }
  });
});

describe('bounded native anonymous reset', () => {
  it('anonymous reset fails closed when native cleanup rejects', async () => {
    const api = { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: () => Promise.reject(new Error('cleanup rejected')), destroy: vi.fn() };
    const browser: FakeBrowser & { n5SupportUnavailable?: boolean } = { dispatchEvent: vi.fn() }, script: FakeScript = { remove: vi.fn() };
    vi.stubGlobal('window', browser);
    const dom = widgetDOM(script, () => { browser.Libredesk = api; script.onload?.(); });
    await expect(openAnonymousSupport(settings, { current: 0 })).rejects.toThrow('Не удалось очистить чат');
    expect(api.show).not.toHaveBeenCalled(); expect(api.destroy).toHaveBeenCalled();
    expect(browser.n5SupportUnavailable).toBe(true); expect(dom.listeners.size).toBe(0);
  });
  it('includes a pending logout in the total timeout and ignores its late completion', async () => {
    vi.useFakeTimers(); let finish: (() => void) | undefined;
    const api = { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: () => new Promise<void>(resolve => { finish = resolve; }) };
    vi.stubGlobal('window', { Libredesk: api, dispatchEvent: vi.fn() }); const dom = widgetDOM();
    const opening = openAnonymousSupport(settings, { current: 0 }), rejected = expect(opening).rejects.toThrow('Не удалось загрузить чат');
    await vi.advanceTimersByTimeAsync(8000); await rejected;
    finish?.(); await vi.advanceTimersByTimeAsync(0);
    expect(api.show).not.toHaveBeenCalled(); expect(dom.listeners.size).toBe(0); expect(vi.getTimerCount()).toBe(0);
  });
  it.each(['missing', 'throwing'] as const)('fails closed if old native child cannot be retired (%s)', async mode => {
    const api = { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: vi.fn(),
      ...(mode === 'throwing' ? { destroy() { throw new Error('retire failed'); } } : {}) };
    const browser = { Libredesk: api, initLibredesk: vi.fn(), dispatchEvent: vi.fn(), n5SupportUnavailable: false };
    vi.stubGlobal('window', browser); const dom = widgetDOM(undefined, undefined, false); dom.insert();
    await expect(openAnonymousSupport(settings, { current: 0 })).rejects.toThrow('Не удалось очистить чат');
    expect(browser.n5SupportUnavailable).toBe(true); expect(browser.initLibredesk).not.toHaveBeenCalled(); expect(api.show).not.toHaveBeenCalled();
  });
});

describe('identity cleanup synchronizes native visibility', () => {
  it('hides before logout and before the authority event removes controls', async () => {
    const calls: string[] = []; let nativeVisible = true;
    const browser: FakeBrowser = { Libredesk: {
      hide() { calls.push('hide'); nativeVisible = false; },
      logout() { expect(nativeVisible).toBe(false); calls.push('logout'); },
      show: vi.fn(), setUser: vi.fn(),
    }, LibredeskSettings: {}, dispatchEvent: vi.fn(() => {
      expect(nativeVisible).toBe(false); calls.push('clear');
    }) };
    vi.stubGlobal('window', browser);
    expect(await clearSupportIdentity()).toBe(true);
    expect(calls).toEqual(['hide', 'logout', 'clear']);
    expect(browser.LibredeskSettings).toBeUndefined();
  });
  it.each(['missing', 'throwing'] as const)('still logs out and fails closed when hide is %s', async mode => {
    const logout = vi.fn(), destroy = vi.fn();
    const browser: FakeBrowser & { n5SupportUnavailable?: boolean } = { Libredesk: {
      ...(mode === 'throwing' ? { hide() { throw new Error('vendor hide failed'); } } : {}),
      logout, destroy, show: vi.fn(), setUser: vi.fn(),
    }, LibredeskSettings: {}, dispatchEvent: vi.fn() };
    vi.stubGlobal('window', browser);
    expect(await clearSupportIdentity()).toBe(false);
    expect(logout).toHaveBeenCalledTimes(1); expect(destroy).toHaveBeenCalledTimes(1);
    expect(browser.n5SupportUnavailable).toBe(true); expect(browser.Libredesk).toBeUndefined();
    expect(browser.LibredeskSettings).toBeUndefined(); expect(browser.dispatchEvent).toHaveBeenCalledTimes(1);
  });
});

describe('chat close preserves the vendor session', () => {
  it('hides and returns focus without resetting identity or history; the same API can reopen', () => {
    const api = { hide: vi.fn(), show: vi.fn(), setUser: vi.fn(), logout: vi.fn(), destroy: vi.fn() };
    const focus = vi.fn(); vi.stubGlobal('window', { Libredesk: api });
    closeSupportWidget({ focus });
    expect(api.hide).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenCalledTimes(1);
    api.show(); expect(api.show).toHaveBeenCalledTimes(1);
    expect(api.logout).not.toHaveBeenCalled(); expect(api.destroy).not.toHaveBeenCalled(); expect(api.setUser).not.toHaveBeenCalled();
  });
  it('describes human support and anonymous privacy even for a logged in account', () => {
    const html = renderToStaticMarkup(createElement(SupportPanel, { support: { ...settings, identifiedEnabled: false }, account: { id: 'A', email: 'private@example.test', verified: true } }));
    expect(html).toContain('Открыть чат поддержки'); expect(html).toContain('отвечает человек');
    expect(html).toContain('не передаёт туда почту'); expect(html).not.toContain('private@example.test');
    expect(html).not.toContain('Открыть анонимный чат');
  });
});

it('keeps the parent close control visible while the widget is open', () => {
  const source = readFileSync('apps/web/src/app/support/SupportPanel.tsx', 'utf8');
  expect(source).toMatch(/opened && <button[^>]*className="support-close"[^>]*onClick=\{close\}[^>]*aria-label="Закрыть чат поддержки"/);
  const css = readFileSync('apps/web/src/app/globals.css', 'utf8');
  expect(css).toMatch(/\.support-card > \.support-close \{[^}]*position:fixed;[^}]*z-index:2147483647;/);
});
