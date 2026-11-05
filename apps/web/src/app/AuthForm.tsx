'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { observeSignup } from '../lib/acquisition-analytics';
import { clearSupportIdentity } from '../lib/support-client';
import { rpc } from '../lib/rpc';
import { safeNextPath } from '../lib/payment-return';
const afterLogin = () => safeNextPath(new URLSearchParams(window.location.search).get('next')) ?? '/dashboard';

export function AuthForm({ mode, onModeChange, focusRequest, onAvailabilityChange, creditMode = false }: {
  mode: 'register' | 'login'; onModeChange: (mode: 'register' | 'login') => void;
  focusRequest: number; onAvailabilityChange: (available: boolean) => void; creditMode?: boolean;
}) {
  const register = mode === 'register';
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [emailError, setEmailError] = useState(''), [passwordError, setPasswordError] = useState('');
  const request = useRef(false), authenticated = useRef(false), pendingRegistration = useRef(false);
  const email = useRef<HTMLInputElement>(null), password = useRef<HTMLInputElement>(null);
  const router = useRouter();
  useEffect(() => {
    const focus = () => { if (location.hash === '#auth') email.current?.focus(); };
    focus(); addEventListener('hashchange', focus);
    return () => removeEventListener('hashchange', focus);
  }, []);
  useEffect(() => {
    setError(''); setEmailError(''); setPasswordError(''); password.current?.setCustomValidity('');
    if (focusRequest) email.current?.focus();
  }, [mode, focusRequest]);
  function validatePassword(field: HTMLInputElement) {
    const message = register && new TextEncoder().encode(field.value).length > 72
      ? 'Пароль должен занимать не больше 72 байт. Сократите его.' : '';
    field.setCustomValidity(message); setPasswordError(message);
    return !message;
  }
  function startRequest() {
    if (request.current) return false;
    request.current = true; onAvailabilityChange(false); setBusy(true); setError(''); return true;
  }
  function finishRequest() {
    request.current = false; setBusy(false); onAvailabilityChange(!authenticated.current);
  }
  function continueToCabinet() {
    if (pendingRegistration.current) { observeSignup(); pendingRegistration.current = false; }
    router.push(afterLogin()); router.refresh();
  }
  return <form id="auth" className="auth-card public-auth" aria-labelledby="auth-title" onInvalid={event => {
    const field = event.target as HTMLInputElement;
    if (field === email.current) setEmailError(field.validity.valueMissing ? 'Введите электронную почту.' : 'Проверьте адрес электронной почты.');
    if (field === password.current) setPasswordError(field.validity.customError ? field.validationMessage : field.validity.valueMissing ? 'Введите пароль.' : 'Пароль должен содержать не меньше 8 символов.');
  }} onSubmit={async event => {
    event.preventDefault();
    if (request.current) return;
    if (!authenticated.current && password.current && !validatePassword(password.current)) { password.current.focus(); return; }
    const formElement = event.currentTarget;
    if (!formElement.reportValidity() || !startRequest()) return;
    const form = new FormData(formElement);
    const operation = mode;
    try {
      if (!authenticated.current) {
        clearSupportIdentity();
        const response = await fetch(`/api/auth/${operation}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
        const body = await response.json();
        if (!body || typeof body !== 'object') throw new Error('Не удалось прочитать ответ сервера. Повторите позже');
        if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Не удалось войти');
        pendingRegistration.current = operation === 'register';
        authenticated.current = true; setSignedIn(true);
      }
      const explicit = String(form.get('partner_code') ?? '').trim();
      await rpc('code.apply', explicit ? { code: explicit } : {}, true);
      continueToCabinet();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Нет связи с сервером'); }
    finally { finishRequest(); }
  }}>
    <div className="public-modes" role="group" aria-label="Регистрация или вход">
      <button className="public-mode" type="button" aria-pressed={register} disabled={busy || signedIn} onClick={() => onModeChange('register')}>Создать аккаунт</button>
      <button className="public-mode" type="button" aria-pressed={!register} disabled={busy || signedIn} onClick={() => onModeChange('login')}>Войти</button>
    </div>
    <h2 id="auth-title">{register ? 'Создать аккаунт' : 'Войти в clipmkr'}</h2>
    <p className="public-form-intro">{register ? creditMode ? 'Начните с 30 пробных кредитов.' : 'Создайте аккаунт, чтобы начать.' : 'Ваши записи и клипы — в вашем кабинете.'}</p>
    <label htmlFor="auth-email">Электронная почта</label>
    <input ref={email} id="auth-email" name="email" type="email" autoComplete="email" required aria-invalid={!!emailError} aria-describedby="auth-email-error" onInput={() => setEmailError('')} />
    <p className="public-hint" id="auth-email-error">{emailError}</p>
    <label htmlFor="auth-password">Пароль</label>
    <input ref={password} id="auth-password" name="password" type="password" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} required aria-invalid={!!passwordError} aria-describedby="auth-password-hint auth-password-error" onInput={event => validatePassword(event.currentTarget)} />
    <p className="public-hint" id="auth-password-hint">{register ? 'От 8 символов, не больше 72 байт. Кириллица и эмодзи занимают больше одного байта.' : 'Введите пароль вашего аккаунта.'}</p>
    <p className="public-hint" id="auth-password-error">{passwordError}</p>
    <details className="public-partner"><summary>Есть код партнёра? Необязательно</summary><label htmlFor="auth-partner">Код партнёра</label><input id="auth-partner" name="partner_code" autoComplete="off" maxLength={12} /></details>
    {error && <p className="public-error" role="alert" aria-atomic="true">{error}</p>}
    <button className="public-primary public-submit" type="submit" disabled={busy}>{busy ? 'Подождите…' : signedIn ? 'Повторить применение кода' : register ? 'Создать аккаунт' : 'Войти →'}</button>
    <p className="public-legal" hidden={!register}>Создавая аккаунт, вы принимаете <a href="/legal/terms">соглашение</a> и <a href="/legal/privacy">политику конфиденциальности</a>.</p>
    {signedIn && error && <button type="button" className="public-discard" disabled={busy} onClick={async () => {
      if (!startRequest()) return;
      try { await rpc('code.apply', { discard_referral: true }, true); continueToCabinet(); }
      catch { setError('Не удалось продолжить. Повторите позже'); } finally { finishRequest(); }
    }}>Продолжить без применения кода</button>}
    <nav className="support-links public-help" aria-label="Помощь со входом"><a href="/forgot">Забыли пароль?</a><a href="/support">Поддержка</a></nav>
  </form>;
}
