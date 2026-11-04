import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { themeCookie, themeFromCookie } from '../apps/web/src/lib/theme';
import { ThemeToggle } from '../apps/web/src/app/ThemeToggle';

const loadPreferences = () => import('../apps/web/src/lib/workspace-layout');

it('layout_cookie_rejects_ambiguous_input', async () => {
  const { workspaceLayoutFromCookie } = await loadPreferences();
  expect(workspaceLayoutFromCookie('a=1; n5_workspace_layout=studio; n5_theme=light')).toBe('studio');
  for (const input of [undefined, '', 'n5_workspace_layout=workspace', 'n5_workspace_layout=STUDIO',
    'n5_workspace_layout= studio', 'n5_workspace_layout=studio ', 'n5_workspace_layout="studio"',
    'n5_workspace_layout=st%75dio', 'n5_workspace_layout =studio', 'x_n5_workspace_layout=studio',
    'n5_workspace_layout=studio; n5_workspace_layout=studio',
    'n5_workspace_layout=workspace; n5_workspace_layout=studio', 1]) {
    expect(workspaceLayoutFromCookie(input as string | undefined), String(input)).toBe('workspace');
  }
});

it('cookie_writers_keep_closed_sets', async () => {
  const { workspaceLayoutCookie } = await loadPreferences();
  expect(workspaceLayoutCookie('studio')).toBe('n5_workspace_layout=studio; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  expect(workspaceLayoutCookie('STUDIO' as 'studio')).toContain('n5_workspace_layout=workspace;');
  expect(themeCookie('light')).toBe('n5_theme=light; Path=/; Max-Age=31536000; SameSite=Lax; Secure');
  expect(themeFromCookie('n5_theme=light; n5_workspace_layout=studio')).toBe('light');
});

function fakeDocument(mode: 'normal' | 'throw' | 'silent' = 'normal') {
  const jar = new Map([['__Host-n5_session', 'kept']]);
  const dataset: Record<string, string> = { theme: 'dark', workspaceLayout: 'workspace' };
  const metas = new Map(['theme-color', 'color-scheme'].map(name => [name, {
    content: '', getAttribute(key: string) { return key === 'content' ? this.content : null; },
    setAttribute(_key: string, value: string) { this.content = value; },
  }]));
  const doc = {
    documentElement: { dataset },
    querySelector(selector: string) { return metas.get(/name="([^"]+)"/.exec(selector)?.[1] ?? '') ?? null; },
    get cookie() { return [...jar].map(([key, value]) => `${key}=${value}`).join('; '); },
    set cookie(value: string) {
      if (mode === 'throw') throw new DOMException('blocked', 'SecurityError');
      if (mode === 'silent') return;
      const first = value.split(';')[0]!, at = first.indexOf('=');
      jar.set(first.slice(0, at), first.slice(at + 1));
    },
  };
  return { doc: doc as unknown as Document, jar, dataset, metas };
}

describe('document-scoped preferences', () => {
  it('document_snapshot_preserves_same_document_choice', async () => {
    const { getDocumentPreferences, updateDocumentPreferences, subscribeDocumentPreferences } = await loadPreferences();
    const a = fakeDocument(), b = fakeDocument();
    const first = getDocumentPreferences(a.doc);
    expect(getDocumentPreferences(a.doc)).toBe(first);
    let notifications = 0;
    const dispose = subscribeDocumentPreferences(() => notifications++, a.doc);
    updateDocumentPreferences({ layout: 'studio' }, a.doc);
    updateDocumentPreferences({ theme: 'light' }, a.doc);
    expect(getDocumentPreferences(a.doc)).toMatchObject({ layout: 'studio', theme: 'light' });
    expect(a.dataset).toMatchObject({ workspaceLayout: 'studio', theme: 'light' });
    expect(getDocumentPreferences(b.doc)).toMatchObject({ layout: 'workspace', theme: 'dark' });
    expect(a.jar.get('__Host-n5_session')).toBe('kept');
    expect(a.jar.get('n5_workspace_layout')).toBe('studio');
    expect(a.jar.get('n5_theme')).toBe('light');
    expect(notifications).toBeGreaterThan(0);
    dispose(); const before = notifications;
    updateDocumentPreferences({ layout: 'workspace' }, a.doc);
    expect(notifications).toBe(before);
  });

  it.each(['throw', 'silent'] as const)('blocked cookie %s keeps document choice and reports fallback', async mode => {
    const { getDocumentPreferences, updateDocumentPreferences } = await loadPreferences();
    const { doc, dataset, jar } = fakeDocument(mode);
    updateDocumentPreferences({ layout: 'studio' }, doc);
    updateDocumentPreferences({ theme: 'light' }, doc);
    expect(getDocumentPreferences(doc)).toMatchObject({ layout: 'studio', theme: 'light', layoutSaved: false, themeSaved: false });
    expect(dataset).toMatchObject({ workspaceLayout: 'studio', theme: 'light' });
    expect(jar.size).toBe(1);
  });
});

it('SSR ThemeToggle preserves accessible existing contract', () => {
  expect(renderToStaticMarkup(createElement(ThemeToggle, { initial: 'light' }))).toContain('aria-pressed="true"');
});
