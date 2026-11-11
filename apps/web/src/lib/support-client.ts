export type PublicSupport = { mode: 'disabled' | 'test' | 'libredesk'; baseURL: string | null; inboxID: string | null; identifiedEnabled: boolean; contactEmail: string | null; synthetic: boolean };
export type SupportAccount = { id: string; email: string; verified: boolean } | null;
export type SafeContext = { accountId?: string; videoId?: string; status?: string; failureCode?: string; at: string };
export type WidgetAPI = { show(): void; hide?(): void; setUser(jwt: string): void; logout(): void; destroy?(): void };
declare global { interface Window { Libredesk?: WidgetAPI; initLibredesk?: (settings: { baseURL: string; inboxID: string; hideLauncher: boolean }) => WidgetAPI; n5SupportUnavailable?: boolean; LibredeskSettings?: { baseURL: string; inboxID: string; hideLauncher: boolean }; } }
export class SupportError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function supportRequest<T>(path: string, body?: object): Promise<T> {
  let response: Response;
  try { response = await fetch(path, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new SupportError(0, 'network', 'Нет связи с сервером. Повторите позже.'); }
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new SupportError(response.status, value?.error?.code ?? 'unavailable',
    response.status === 404 ? 'Данные недоступны.' : response.status === 401 ? 'Войдите в аккаунт и повторите действие.' : value?.error?.message ?? 'Сервис временно недоступен.');
  return value as T;
}
// Only the fragment is read. Clear it before any asynchronous work, never persist it.
export function takeFragmentToken(location: Pick<Location, 'hash' | 'pathname' | 'search'>, history: Pick<History, 'replaceState'>): string {
  const fragment = location.hash;
  if (fragment) history.replaceState(null, '', location.pathname + location.search);
  const token = new URLSearchParams(fragment.replace(/^#/, '')).get('token') ?? '';
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : '';
}
export const validPassword = (password: string) => password.length >= 8 && new TextEncoder().encode(password).length <= 72;
function failSupportCleanup(): false {
  window.n5SupportUnavailable = true;
  try { window.Libredesk?.destroy?.(); } catch {}
  delete window.Libredesk;
  return false;
}
function clearNativeSupportIdentity(): Promise<boolean> {
  let cleanup: void;
  try {
    try { if (window.Libredesk) closeSupportWidget(null); }
    finally { cleanup = window.Libredesk?.logout(); }
  }
  catch { failSupportCleanup(); }
  // Official SDKs may return a promise even though older APIs declare logout as void.
  return Promise.resolve(cleanup).then(() => !window.n5SupportUnavailable, failSupportCleanup);
}
export function clearSupportIdentity(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(true);
  try { return clearNativeSupportIdentity(); }
  finally {
    delete window.LibredeskSettings;
    window.dispatchEvent(new Event('n5:support-clear'));
  }
}
const readySupportFrames = new WeakSet<HTMLIFrameElement>();
export function loadSupportWidget(settings: PublicSupport, anonymousCleanup?: Promise<boolean>): Promise<WidgetAPI> {
  if (settings.mode === 'disabled' || !settings.baseURL || !settings.inboxID) return Promise.reject(new Error('Чат поддержки пока не подключён.'));
  if (window.n5SupportUnavailable) return Promise.reject(new Error('Не удалось очистить чат. Перезагрузите страницу перед новым обращением.'));
  return new Promise((resolve, reject) => {
    let script: HTMLScriptElement | null = null;
    const initialAPI = window.Libredesk;
    let cleanedAPI = initialAPI, bootstrapPending = false, canStart = !anonymousCleanup, retired = false;
    const baseURL = new URL(settings.baseURL!);
    let settled = false;
    const cleanup = () => {
      clearTimeout(timer); observer.disconnect(); window.removeEventListener('message', onMessage);
      if (script) { script.onload = null; script.onerror = null; }
    };
    const fail = (cleanupFailure = false) => {
      if (settled) return; settled = true; cleanup();
      script?.remove(); delete window.LibredeskSettings;
      reject(new Error(cleanupFailure ? 'Не удалось очистить чат. Перезагрузите страницу перед новым обращением.' : 'Не удалось загрузить чат. Используйте доступный способ связи ниже.'));
    };
    const ready = (event?: MessageEvent) => {
      if (settled) return;
      const api = window.Libredesk, frame = document.getElementById(`libredesk-widget-${settings.inboxID}`);
      if (!canStart || !api || typeof api.show !== 'function' || typeof api.setUser !== 'function' || typeof api.logout !== 'function') return;
      // A fresh SDK must clear persisted host cookies before VUE_APP_READY reads them,
      // including explicit identify: setUser's remote acknowledgement arrives later.
      if (api !== cleanedAPI) {
        cleanedAPI = api; bootstrapPending = true;
        void clearNativeSupportIdentity().then(clean => {
          if (settled) return;
          if (!clean) { fail(true); return; }
          bootstrapPending = false; ready();
        });
      }
      if (frame?.tagName !== 'IFRAME' || !frame.isConnected) return;
      // Attachment precedes the native child listener; setUser() does not queue its postMessage.
      let source: URL;
      try { source = new URL((frame as HTMLIFrameElement).src); } catch { return; }
      if (source.origin !== baseURL.origin || source.pathname !== '/widget' || source.searchParams.get('inbox_id') !== settings.inboxID) return;
      const iframe = frame as HTMLIFrameElement;
      if (event?.source === iframe.contentWindow && event.origin === baseURL.origin && event.data?.type === 'WIDGET_LOADED') readySupportFrames.add(iframe);
      if (bootstrapPending || !readySupportFrames.has(iframe)) return;
      settled = true; cleanup(); resolve(api);
    };
    const onMessage = (event: MessageEvent) => ready(event);
    const observer = new MutationObserver(() => ready());
    const timer = setTimeout(fail, 8000);
    window.addEventListener('message', onMessage);
    observer.observe(document.documentElement, { childList: true, subtree: true });
    const start = () => {
      if (settled) return;
      canStart = true;
      if (!window.Libredesk) {
        window.LibredeskSettings = { baseURL: settings.baseURL!, inboxID: settings.inboxID!, hideLauncher: true };
        if (retired) {
          try { window.initLibredesk!(window.LibredeskSettings); }
          catch { failSupportCleanup(); fail(true); return; }
        } else {
          script = document.createElement('script');
          script.src = new URL('/widget.js', settings.baseURL!).href; script.async = true; script.referrerPolicy = 'no-referrer';
          script.onload = () => ready(); script.onerror = () => fail(); document.head.append(script);
        }
      }
      ready();
    };
    if (anonymousCleanup) {
      const oldFrame = document.getElementById(`libredesk-widget-${settings.inboxID}`);
      // A prior child's delayed identity callbacks have no correlated reset ACK.
      // Retire that child; native destroy keeps remote conversations intact.
      if (initialAPI && oldFrame?.tagName === 'IFRAME' && oldFrame.isConnected) {
        try {
          if (!initialAPI.destroy || !window.initLibredesk) throw new Error('Native reset unavailable');
          initialAPI.destroy();
          if (window.Libredesk === initialAPI) delete window.Libredesk;
          retired = true;
        } catch { failSupportCleanup(); fail(true); }
      }
      void anonymousCleanup.then(clean => {
        if (settled) return;
        if (!clean) { fail(true); return; }
        start();
      }, () => { if (!settled) { failSupportCleanup(); fail(true); } });
    } else start();
  });
}

// Shared anonymous transition, also exercised by the widget regression fixture.
export async function openAnonymousSupport(settings: PublicSupport, epoch: { current: number }): Promise<boolean> {
  const cleanup = clearSupportIdentity();
  // The synchronous clear event resets opt-in and advances the epoch intentionally.
  const version = epoch.current;
  // Keep an asynchronous logout inside the same bounded load/reset envelope.
  try {
    const widget = await loadSupportWidget(settings, cleanup.then(clean => clean && epoch.current === version));
    if (epoch.current !== version) return false;
    widget.show();
    return true;
  } catch (cause) {
    if (epoch.current !== version) return false;
    throw cause;
  }
}

// Hide only: the vendor retains the current conversation and unsent draft.
export function closeSupportWidget(opener: Pick<HTMLElement, 'focus'> | null): void {
  const widget = window.Libredesk;
  if (!widget?.hide) throw new Error('Не удалось закрыть чат. Повторите действие.');
  widget.hide();
  opener?.focus();
}
