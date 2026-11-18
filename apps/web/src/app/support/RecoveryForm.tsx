'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CREDIT_SKUS, type CreditSku } from '@clipmaker/shared/tariff';
import { useAuthFlow } from '../AuthFlow';
import { clearSupportIdentity, supportRequest, SupportError, takeFragmentToken, validPassword, type SupportAccount } from '../../lib/support-client';
import { notifySupportSessionChange } from '../../lib/support-session-signal';
import { selectedPackagePath } from '../../lib/payment-return';
export function RecoveryForm({ mode, account = null, mailAvailable, billingSku }: { mode: 'verify' | 'forgot' | 'reset'; account?: SupportAccount; mailAvailable: boolean; billingSku?: CreditSku }) {
  const token = useRef('');
  const initialized = useRef(false);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  const email = useRef<HTMLInputElement>(null);
  const flow = useAuthFlow(), router = useRouter();
  useEffect(() => { if (mode === 'forgot' && email.current && flow.recovery && !flow.recovery.returning) email.current.value = flow.recovery.email; }, [mode, flow.recovery]);
  const [hasToken, setHasToken] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const [ready, setReady] = useState(false), [confirmed, setConfirmed] = useState(false), [sent, setSent] = useState(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    token.current = takeFragmentToken(window.location, window.history);
    setHasToken(!!token.current); setReady(true);
  }, []);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  const purchase = mode === 'verify' && billingSku ? { title: CREDIT_SKUS[billingSku].title, href: selectedPackagePath(billingSku) } : null;
  const invalid = purchase && account && !account.verified && ready && !hasToken && !confirmed && !sent;
  const title = mode !== 'verify' ? mode === 'forgot' ? 'Восстановить доступ' : 'Новый пароль'
    : purchase && (confirmed || (account?.verified && !hasToken)) ? 'Почта подтверждена' : purchase && sent ? 'Проверьте почту'
    : invalid ? 'Ссылка недействительна' : purchase ? 'Подтвердите адрес' : 'Подтвердить почту';
  return <section className="auth-card support-card"><h1>{title}</h1>
    {mode === 'verify' && (!purchase || !account
      ? <p>{account ? `${account.email} — ${account.verified ? 'почта подтверждена' : 'почта пока не подтверждена'}.` : 'Войдите в тот же аккаунт, которому отправили письмо, затем снова откройте ссылку из письма. Подойдёт и другое устройство.'}</p>
      : invalid ? <p>Проверьте, что вы вошли в аккаунт с адресом <strong>{account.email}</strong>.</p>
      : !confirmed && !sent && hasToken && <p>Вы вошли как <strong>{account.email}</strong>. Подтвердите адрес, затем вернитесь к пакету «{purchase.title}».</p>)}
    {mode === 'reset' && <p>После смены пароля все сеансы КлипМейкера завершатся. Затем войдите с новым паролем. Это действие не подтверждает почту.</p>}
    {!mailAvailable && mode !== 'reset' && <p role="status">Отправка писем сейчас недоступна.</p>}
    {mode !== 'forgot' && !purchase && !hasToken && <p>Для подтверждения действия откройте действующую ссылку из письма. Ссылка одноразовая.</p>}
    {(!purchase || (!!account && hasToken)) && <form onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setError(''); setSuccess('');
      const form = e.currentTarget, data = new FormData(form);
      try {
        if (mode === 'forgot') {
          const result = await supportRequest<{ message: string }>('/api/auth/forgot', { email: String(data.get('email') ?? '') }); setSuccess(result.message);
        } else if (mode === 'verify') {
          await supportRequest('/api/auth/email/confirm', { token: token.current });
          token.current = ''; setHasToken(false); setConfirmed(true);
          setSuccess(purchase ? 'Почта подтверждена.' : 'Почта подтверждена. Можно вернуться в кабинет.');
        } else {
          const password = String(data.get('password') ?? '');
          if (!validPassword(password)) throw new Error('Пароль: от 8 символов и не более 72 байт UTF-8.');
          if (password !== data.get('repeat')) throw new Error('Пароли не совпадают.');
          clearSupportIdentity(); notifySupportSessionChange();
          await supportRequest('/api/auth/reset', { token: token.current, password });
          notifySupportSessionChange();
          token.current = ''; setHasToken(false); form.reset(); setSuccess('Пароль изменён. Войдите с новым паролем.');
        }
      } catch (cause) {
        if (purchase && cause instanceof SupportError && cause.code === 'invalid_token') {
          token.current = ''; setHasToken(false);
        }
        setError(cause instanceof SupportError && cause.status === 401 ? 'Войдите в тот же аккаунт, затем снова откройте ссылку из письма.' : cause instanceof Error ? cause.message : 'Не удалось выполнить действие.');
      }
      finally { setBusy(false); }
    }}>
      {mode === 'forgot' && <label>Почта<input ref={email} name="email" type="email" autoComplete="email" required /></label>}
      {mode === 'reset' && <><label>Новый пароль<input name="password" type="password" minLength={8} autoComplete="new-password" required aria-describedby="password-help" /></label><p id="password-help" className="muted">От 8 символов, не более 72 байт UTF-8.</p><label>Повторите пароль<input name="repeat" type="password" autoComplete="new-password" required /></label></>}
      <button disabled={busy || !!success || (mode === 'forgot' ? !mailAvailable : !hasToken || (mode === 'verify' && !account))}>{busy ? 'Подождите…' : mode === 'forgot' ? 'Отправить инструкцию' : mode === 'verify' ? 'Подтвердить почту' : 'Сменить пароль'}</button>
    </form>}
    {mode === 'verify' && account && !account.verified && !confirmed && (!purchase || invalid || sent) && <button className="secondary" disabled={busy || !mailAvailable} onClick={async () => {
      setBusy(true); setError(''); setSuccess(''); try {
        await supportRequest('/api/auth/email/send', purchase ? { sku: billingSku } : {});
        setSent(true);
        setSuccess(purchase ? `Письмо отправлено на ${account.email}. Откройте ссылку в письме.` : 'Запрос принят. Проверьте почту. Доставка письма не гарантирована.');
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Письмо недоступно.'); } finally { setBusy(false); }
    }}>Отправить новое письмо</button>}
    {purchase && (confirmed || (account?.verified && !hasToken)) && <p><a className="button" href={purchase.href}>Вернуться к пакету «{purchase.title}»</a></p>}
    {error && <p role="alert" tabIndex={-1} ref={errorMessage}>{error}</p>}<p role="status" aria-atomic="true" className="support-success billing-selection-message">{success}</p>
    <nav className="support-links" aria-label="Доступ к аккаунту"><a href={purchase ? `/?next=${encodeURIComponent(purchase.href)}#auth` : '/#auth'} onClick={event => {
      if (mode !== 'forgot' || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); flow.rememberRecovery(email.current?.value ?? '', flow.recovery?.next ?? null, true);
      const next = flow.recovery?.next; router.push(next ? `/?next=${encodeURIComponent(next)}#auth` : '/#auth');
    }}>Войти</a><a href="/dashboard">Кабинет</a><a href="/support">Поддержка</a></nav>
  </section>;
}
