'use client';
import { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import type { Theme } from '../lib/theme';
import { attachDocumentPreferenceSync, getDocumentPreferences, subscribeDocumentPreferences, updateDocumentPreferences,
  type DocumentPreferences, type WorkspaceLayout } from '../lib/workspace-layout';
import { ThemeToggle } from './ThemeToggle';

export function WorkspacePreferenceSync({ initialLayout, initialTheme }: { initialLayout: WorkspaceLayout; initialTheme: Theme }) {
  // Новые SSR props при soft refresh не заменяют канонический выбор текущего Document.
  useLayoutEffect(() => attachDocumentPreferenceSync(), [initialLayout, initialTheme]);
  return null;
}
export function WorkspaceSettings({ initialLayout, initialTheme, presentation = 'legacy' }: { initialLayout: WorkspaceLayout; initialTheme: Theme; presentation?: 'legacy' | 'page' }) {
  const server = useMemo<DocumentPreferences>(() => ({ layout: initialLayout, theme: initialTheme, layoutSaved: true, themeSaved: true }), [initialLayout, initialTheme]);
  const preferences = useSyncExternalStore(subscribeDocumentPreferences, getDocumentPreferences, () => server);
  const fields = <div className="workspace-settings-fields"><label>Компоновка<select value={preferences.layout}
      onChange={event => updateDocumentPreferences({ layout: event.target.value === 'studio' ? 'studio' : 'workspace' })}>
      <option value="workspace">Кабинет</option><option value="studio">Монтажная</option>
    </select></label><div className="workspace-theme-field"><span>Светлая тема</span><ThemeToggle initial={initialTheme} reportPersistence={false} /></div>
    {(!preferences.layoutSaved || !preferences.themeSaved) && <p className="preference-status" role="status">Выбор действует в этой вкладке; сохранить не удалось.</p>}
    </div>;
  return presentation === 'page' ? <section className="workspace-settings"><h2>Оформление</h2>{fields}</section> : <details className="workspace-settings"><summary>Настройки</summary>{fields}</details>;
}
