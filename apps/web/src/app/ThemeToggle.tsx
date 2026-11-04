'use client';
import { useMemo, useSyncExternalStore } from 'react';
import type { Theme } from '../lib/theme';
import { getDocumentPreferences, subscribeDocumentPreferences, updateDocumentPreferences, type DocumentPreferences } from '../lib/workspace-layout';

// SSR snapshot относится к запросу; browser snapshot — к живому Document, включая cached routes.
export function ThemeToggle({ initial, reportPersistence = true }: { initial: Theme; reportPersistence?: boolean }) {
  const server = useMemo<DocumentPreferences>(() => ({ theme: initial, layout: 'workspace', themeSaved: true, layoutSaved: true }), [initial]);
  const preferences = useSyncExternalStore(subscribeDocumentPreferences, getDocumentPreferences, () => server);
  function toggle() {
    const current = getDocumentPreferences();
    updateDocumentPreferences({ theme: current.theme === 'light' ? 'dark' : 'light' });
  }
  return <><button type="button" className="theme-toggle secondary" aria-label="Светлая тема" aria-pressed={preferences.theme === 'light'} onClick={toggle}>
    <span aria-hidden="true">{preferences.theme === 'light' ? '☀︎' : '☾︎'}</span>
  </button>{reportPersistence && !preferences.themeSaved && <span className="preference-status" role="status">Выбор действует в этой вкладке; сохранить не удалось.</span>}</>;
}
