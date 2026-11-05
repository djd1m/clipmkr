import { THEME_COLOR, themeCookie, type Theme } from './theme';

export const WORKSPACE_LAYOUTS = ['workspace', 'studio'] as const;
export type WorkspaceLayout = typeof WORKSPACE_LAYOUTS[number];
export const WORKSPACE_LAYOUT_COOKIE = 'n5_workspace_layout';
export const DEFAULT_WORKSPACE_LAYOUT: WorkspaceLayout = 'workspace';

// Значение не декодируется и не нормализуется: неоднозначный ввод — не выбор.
function exactCookie(header: unknown, name: string): string | undefined {
  if (typeof header !== 'string') return undefined;
  const values: string[] = [];
  for (const part of header.split(';')) {
    const pair = part.replace(/^[ \t]+/, ''), equals = pair.indexOf('=');
    if (equals >= 0 && pair.slice(0, equals) === name) values.push(pair.slice(equals + 1));
  }
  return values.length === 1 ? values[0] : undefined;
}
export function workspaceLayoutFromCookie(header: string | undefined): WorkspaceLayout {
  return exactCookie(header, WORKSPACE_LAYOUT_COOKIE) === 'studio' ? 'studio' : DEFAULT_WORKSPACE_LAYOUT;
}
export function workspaceLayoutCookie(layout: WorkspaceLayout): string {
  return `${WORKSPACE_LAYOUT_COOKIE}=${layout === 'studio' ? 'studio' : 'workspace'}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
}

export interface DocumentPreferences {
  readonly layout: WorkspaceLayout;
  readonly theme: Theme;
  readonly layoutSaved: boolean;
  readonly themeSaved: boolean;
}
interface DocumentStore {
  snapshot: DocumentPreferences;
  listeners: Set<() => void>;
  observer?: MutationObserver;
  attachments: number;
}
// Никаких mutable SSR preferences: запись создаётся только для конкретного browser Document.
const documents = new WeakMap<Document, DocumentStore>();
function storeFor(doc: Document): DocumentStore {
  let store = documents.get(doc);
  if (!store) {
    store = { snapshot: Object.freeze({
      layout: doc.documentElement.dataset.workspaceLayout === 'studio' ? 'studio' : 'workspace',
      theme: doc.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
      layoutSaved: true, themeSaved: true,
    }), listeners: new Set(), attachments: 0 };
    documents.set(doc, store);
  }
  return store;
}
function apply(doc: Document, snapshot: DocumentPreferences) {
  const root = doc.documentElement;
  if (root.dataset.workspaceLayout !== snapshot.layout) root.dataset.workspaceLayout = snapshot.layout;
  if (root.dataset.theme !== snapshot.theme) root.dataset.theme = snapshot.theme;
  for (const [name, content] of [['theme-color', THEME_COLOR[snapshot.theme]], ['color-scheme', snapshot.theme]]) {
    const meta = doc.querySelector(`meta[name="${name}"]`);
    if (meta && meta.getAttribute('content') !== content) meta.setAttribute('content', content!);
  }
}
export function getDocumentPreferences(doc: Document = document): DocumentPreferences {
  return storeFor(doc).snapshot;
}
export function subscribeDocumentPreferences(listener: () => void, doc: Document = document): () => void {
  const store = storeFor(doc); store.listeners.add(listener);
  return () => { store.listeners.delete(listener); };
}
export function updateDocumentPreferences(change: Partial<Pick<DocumentPreferences, 'layout' | 'theme'>>, doc: Document = document): void {
  const store = storeFor(doc), before = store.snapshot;
  const next = { ...before };
  if (change.layout !== undefined) next.layout = change.layout === 'studio' ? 'studio' : 'workspace';
  if (change.theme !== undefined) next.theme = change.theme === 'light' ? 'light' : 'dark';
  // Сначала применяем выбор: отказ cookie не отменяет его в живом документе.
  apply(doc, next);
  if (change.layout !== undefined) {
    try {
      doc.cookie = workspaceLayoutCookie(next.layout);
      next.layoutSaved = exactCookie(doc.cookie, WORKSPACE_LAYOUT_COOKIE) === next.layout;
    } catch { next.layoutSaved = false; }
  }
  if (change.theme !== undefined) {
    try {
      doc.cookie = themeCookie(next.theme);
      next.themeSaved = exactCookie(doc.cookie, 'n5_theme') === next.theme;
    } catch { next.themeSaved = false; }
  }
  if (Object.keys(next).some(key => next[key as keyof DocumentPreferences] !== before[key as keyof DocumentPreferences])) {
    store.snapshot = Object.freeze(next);
    for (const listener of [...store.listeners]) listener();
  }
}
export function attachDocumentPreferenceSync(doc: Document = document): () => void {
  const store = storeFor(doc);
  apply(doc, store.snapshot);
  store.attachments++;
  if (!store.observer) {
    const Observer = doc.defaultView?.MutationObserver ?? MutationObserver;
    const observer = new Observer(records => {
      if (records.some(record => record.target === doc.documentElement
        || record.type === 'childList'
        || (record.target instanceof (doc.defaultView?.HTMLMetaElement ?? HTMLMetaElement)
          && ['theme-color', 'color-scheme'].includes((record.target as HTMLMetaElement).name)))) {
        apply(doc, store.snapshot);
      }
    });
    observer.observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-workspace-layout'] });
    if (doc.head) observer.observe(doc.head, { subtree: true, childList: true, attributes: true, attributeFilter: ['content'] });
    store.observer = observer;
  }
  let attached = true;
  return () => {
    if (!attached) return; attached = false;
    if (--store.attachments === 0) { store.observer?.disconnect(); store.observer = undefined; }
  };
}
