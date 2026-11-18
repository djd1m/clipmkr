const signalKey = 'clipmkr:support-session';

function openChannel(): BroadcastChannel | null {
  try { return new BroadcastChannel(signalKey); }
  catch { return null; }
}

export function notifySupportSessionChange(): void {
  const marker = `${Date.now()}-${Math.random()}`;
  const channel = openChannel();
  if (channel) {
    try { channel.postMessage(marker); }
    catch { /* Try the storage transport below. */ }
    finally { channel.close(); }
  }
  try { localStorage.setItem(signalKey, marker); }
  catch { /* The broadcast channel remains available in browsers that block storage. */ }
}

export function watchSupportSessionChanges(onChange: () => void): (() => void) | null {
  const channel = openChannel();
  const probeKey = `${signalKey}:probe`;
  let storageAvailable = false;
  try {
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    storageAvailable = true;
  } catch { /* Private browsing can block this transport. */ }
  if (!channel && !storageAvailable) return null;

  let previous: string | undefined;
  const invalidate = (marker: unknown) => {
    if (typeof marker !== 'string' || marker === previous) return;
    previous = marker;
    onChange();
  };
  const onStorage = (event: StorageEvent) => { if (event.key === signalKey) invalidate(event.newValue); };
  if (channel) channel.onmessage = event => invalidate(event.data);
  window.addEventListener('storage', onStorage);
  return () => { channel?.close(); window.removeEventListener('storage', onStorage); };
}
