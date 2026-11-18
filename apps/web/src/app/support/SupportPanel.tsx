'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { closeSupportWidget, clearSupportIdentity, openVerifiedSupport, supportRequest, type PublicSupport, type SupportAccount, type SafeContext, type WidgetAPI } from '../../lib/support-client';
import { watchSupportSessionChanges } from '../../lib/support-session-signal';

export function SupportPanel({ support, account, videoId }: { support: PublicSupport; account: SupportAccount; videoId?: string }) {
  const router = useRouter();
  const epoch = useRef(0), opener = useRef<HTMLButtonElement>(null);
  const confirmedWidget = useRef<WidgetAPI | null>(null), canSynchronize = useRef(false), opening = useRef(false);
  const [opened, setOpened] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
  const [context, setContext] = useState<SafeContext | null>(null), [consent, setConsent] = useState(false);

  function close() {
    try { closeSupportWidget(opener.current); setOpened(false); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось закрыть чат.'); }
  }

  useEffect(() => {
    if (!opened) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [opened]);

  useEffect(() => {
    const cleared = () => {
      epoch.current++;
      confirmedWidget.current = null;
      setOpened(false);
      setContext(null);
      setConsent(false);
      setMessage('');
    };
    const refresh = () => { void clearSupportIdentity(); router.refresh(); };
    const onFocus = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const unwatch = watchSupportSessionChanges(refresh);
    canSynchronize.current = unwatch !== null;
    window.addEventListener('n5:support-clear', cleared);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      unwatch?.();
      canSynchronize.current = false;
      window.removeEventListener('n5:support-clear', cleared);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
      epoch.current++;
      void clearSupportIdentity();
    };
  }, [router]);

  useEffect(() => { void clearSupportIdentity(); }, [account?.id, account?.verified]);
  const available = support.mode !== 'disabled' && support.identifiedEnabled;

  async function open() {
    if (opening.current || busy || !available || !account?.verified) return;
    if (!canSynchronize.current) {
      setError('Браузер ограничил доступ к чату. Используйте другой способ связи ниже.');
      return;
    }
    opening.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    const version = epoch.current;
    const current = () => epoch.current === version;
    try {
      const response = await supportRequest<{ mode: 'anonymous' | 'verified'; jwt?: string }>('/api/support/session', { accountId: account.id });
      if (!current()) return;
      if (response.mode !== 'verified' || !response.jwt) {
        router.refresh();
        throw new Error('Не удалось подтвердить вход. Войдите в аккаунт и повторите действие.');
      }
      const existing = confirmedWidget.current;
      const widget = existing && existing === window.Libredesk ? existing : await openVerifiedSupport(support, response.jwt, current);
      if (!current() || widget !== window.Libredesk) return;
      confirmedWidget.current = widget;
      widget.show();
      setOpened(true);
    } catch (cause) {
      if (current()) {
        void clearSupportIdentity();
        setError(cause instanceof Error ? cause.message : 'Чат временно недоступен. Попробуйте ещё раз.');
      }
    } finally {
      opening.current = false;
      setBusy(false);
    }
  }

  return <section className="auth-card support-card" aria-label="Чат поддержки">
    {opened && <button type="button" className="support-close" onClick={close} aria-label="Закрыть чат поддержки">Закрыть чат ×</button>}
    <h2>Написать в поддержку</h2>
    {support.synthetic && <p role="status">СИНТЕТИЧЕСКИЙ СТЕНД: тестовый чат, сообщения не уходят реальной поддержке.</p>}
    {!available ? <p role="status">Чат поддержки пока недоступен.</p>
      : account?.verified ? <>
        <p>Здесь можно задать вопрос и вернуться к ответу позже.</p>
        <p className="muted">При открытии чата передадим Libredesk почту аккаунта, чтобы показать ваши обращения.</p>
        <button ref={opener} disabled={busy} onClick={() => void open()}>{busy ? 'Открываем переписку…' : 'Открыть чат поддержки'}</button>
      </> : account ? <>
        <p>Подтвердите почту, чтобы открыть свою переписку.</p>
        <a className="button" href="/verify-email">Подтвердить почту</a>
      </> : <>
        <p>Войдите в Clipmkr, чтобы открыть свою переписку.</p>
        <nav className="support-links" aria-label="Доступ к чату"><a className="button" href="/#auth">Войти</a><a className="button secondary" href="/forgot">Восстановить доступ</a></nav>
      </>}
    {error && <p role="alert">{error}</p>}
    <details>
      <summary>Дополнительные способы связи</summary>
      {support.contactEmail && <p><a href={`mailto:${support.contactEmail}`}>Написать на почту</a></p>}
      <p>Можно скопировать состояние и идентификатор записи для обращения.</p>
      <button className="secondary" disabled={busy} onClick={async () => {
        setBusy(true); setError(''); setConsent(false); const version = epoch.current;
        try { const result = await supportRequest<{ context: SafeContext }>('/api/support/context', videoId ? { videoId } : {}); if (version === epoch.current) setContext(result.context); }
        catch (cause) { setContext(null); setError(cause instanceof Error ? cause.message : 'Контекст недоступен.'); } finally { setBusy(false); }
      }}>Показать контекст</button>
      {context && <><pre className="support-preview">{JSON.stringify(context, null, 2)}</pre><label className="support-check"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /> Разрешаю скопировать этот контекст для обращения</label>
        <button disabled={!consent || busy} onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(context, null, 2)); setMessage('Контекст скопирован. При желании вставьте его в обращение.'); } catch { setError('Не удалось скопировать. Выделите текст контекста и скопируйте вручную после согласия.'); } }}>Скопировать контекст</button></>}
    </details>
    {message && <p role="status">{message}</p>}
  </section>;
}
