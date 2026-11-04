import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { themeCookie, themeFromCookie } from '../apps/web/src/lib/theme';
import { ThemeToggle } from '../apps/web/src/app/ThemeToggle';
import { readFileSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { workspacePalette } from '../scripts/workspace-presentation-local.mjs';

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

it.each(['chromium', 'webkit'] as const)('scoped workspace canvas is neutral and public palette restores: %s', async engine => {
  const { UpgradeScreen } = await import('../apps/web/src/app/upgrade/UpgradeScreen');
  const { WorkspaceSettings } = await import('../apps/web/src/app/WorkspaceSettings');
  const css = readFileSync(new URL('../apps/web/src/app/globals.css', import.meta.url), 'utf8');
  const browser = await { chromium, webkit }[engine].launch({ headless: true });
  try {
    for (const theme of ['dark', 'light'] as const) for (const layout of ['workspace', 'studio'] as const) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await page.setContent(`<!doctype html><html lang="ru" data-theme="${theme}" data-workspace-layout="${layout}"><head><title>Проверка палитры</title><style>${css}</style></head><body></body></html>`);
        const canvas = () => page.evaluate(() => [document.documentElement, document.body].map(node => ({ background: getComputedStyle(node).backgroundColor, color: getComputedStyle(node).color })));
        const publicPalette = await canvas();
        const markup = renderToStaticMarkup(createElement('div', { className: 'workspace-shell' },
          createElement('nav', { className: 'navigation' }, createElement(WorkspaceSettings, { initialLayout: layout, initialTheme: theme })),
          createElement('main', { className: 'container' }, createElement(UpgradeScreen, { creditMode: true, salesEnabled: true, purchaseWindows: undefined,
            title: 'Pro', price: '990 ₽', days: 30, paidMinutes: 270, current: { plan: 'free', plan_source: 'default', plan_paid_until: null } }))));
        await page.locator('body').evaluate((body, html) => { body.innerHTML = html; }, markup);
        expect(await page.getByRole('status').filter({ hasText: 'Не удалось определить даты пакетов' }).count()).toBe(1);
        expect(await page.locator('section[aria-label] button:disabled').count()).toBe(3);
        await workspacePalette(page);
        await page.locator('.workspace-shell').evaluate(node => node.remove());
        expect(await canvas()).toEqual(publicPalette);
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
}, 30_000);

vi.mock('next/navigation',()=>({useRouter:()=>({push(){},refresh(){}})}));
it('upload_actions_and_status_precede_optional_settings_in_dom_order',async()=>{
  const {VideoUploader}=await import('../apps/web/src/app/upload/Uploader');
  const html=renderToStaticMarkup(createElement(VideoUploader,{accountScope:'11111111-1111-4111-8111-111111111111',creditMode:true}));
  const sequence=['id="source-file"','id="source-file-help"','1 кредит = 60 секунд записи.','Создать клипы →','role="status"','type="checkbox"','id="upload-cta-kind"'];
  const positions=sequence.map(marker=>{const position=html.indexOf(marker);expect(position,marker).toBeGreaterThanOrEqual(0);return position;});
  for(let index=1;index<positions.length;index++)expect(positions[index],`${sequence[index-1]} before ${sequence[index]}`).toBeGreaterThan(positions[index-1]!);
});
