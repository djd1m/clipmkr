'use client';
import { useState } from 'react';
import { clearSupportIdentity } from '../../lib/support-client';
import { clearClipLayoutDrafts } from '../../lib/clip-layout-draft';
export function SignOut() {
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <><button className="secondary" disabled={busy} onClick={async () => {
    setBusy(true); setError(''); clearSupportIdentity();
    try { const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }); if (!response.ok) throw new Error();
      const cleared=clearClipLayoutDrafts();
      if(!cleared)console.warn('layout_draft_cleanup_unavailable');
      window.location.assign('/#auth'); }
    catch { setError('Не удалось выйти. Повторите попытку.'); setBusy(false); }
  }}>{busy ? 'Выходим…' : 'Выйти из аккаунта'}</button>{error && <p role="alert">{error}</p>}</>;
}
