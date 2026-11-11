'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { observeSignup } from '../lib/acquisition-analytics';
import { clearSupportIdentity } from '../lib/support-client';
import { rpc } from '../lib/rpc';
import { useAuthFlow } from './AuthFlow';
import { safeNextPath } from '../lib/payment-return';
type AuthReply = { ok?: unknown; registration?: unknown; code?: unknown; error?: unknown };
const afterLogin = () => safeNextPath(new URLSearchParams(window.location.search).get('next')) ?? '/dashboard';

export function AuthForm({ mode, onModeChange, focusRequest, onAvailabilityChange, creditMode = false, referralCode }: {
  mode: 'register' | 'login'; onModeChange: (mode: 'register' | 'login') => void;
  focusRequest: number; onAvailabilityChange: (available: boolean) => void; creditMode?: boolean; referralCode?: string | null;
}) {
  const register = mode === 'register';
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(false);
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const [emailError, setEmailError] = useState(''), [passwordError, setPasswordError] = useState('');
  const request = useRef(false), authenticated = useRef(false), pendingRegistration = useRef<'created' | 'existing' | null>(null);
  const email = useRef<HTMLInputElement>(null), password = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const flow = useAuthFlow();
  const pendingConflict = useRef('');
  const returnedDraft = useRef(false);
  useEffect(() => {
    const focus = () => { if (location.hash === '#auth') email.current?.focus(); };
    focus(); addEventListener('hashchange', focus);
    return () => removeEventListener('hashchange', focus);
  }, []);
  useEffect(() => {
    setError(pendingConflict.current); setEmailError(''); setPasswordError(''); password.current?.setCustomValidity('');
    if (pendingConflict.current || returnedDraft.current) { password.current?.focus(); returnedDraft.current = false; }
    else if (focusRequest) email.current?.focus();
  }, [mode, focusRequest]);
  useEffect(() => {
    const draft = flow.recovery;
    if (!draft?.returning || returnedDraft.current) return;
    returnedDraft.current = true;
    if (email.current) email.current.value = draft.email;
    if (password.current) password.current.value = '';
    flow.clearRecovery(); onModeChange('login'); password.current?.focus();
  }, [flow, onModeChange]);
  function validatePassword(field: HTMLInputElement) {
    const message = register && new TextEncoder().encode(field.value).length > 72
      ? 'Пароль должен занимать не больше 72 байт. Сократите его.' : '';
    field.setCustomValidity(message); setPasswordError(message);
    return !message;
  }
  function startRequest() {
    if (request.current) return false;
    request.current = true; onAvailabilityChange(false); setBusy(true); setError(''); pendingConflict.current = ''; return true;
  }
  function finishRequest() {
    request.current = false; setBusy(false); onAvailabilityChange(!authenticated.current);
  }
  function continueToCabinet(appliedCode?: string) {
    const target = afterLogin();
    if (pendingRegistration.current === 'created') { observeSignup(); pendingRegistration.current = null; flow.showNotice(appliedCode ? 'created_with_referral' : 'created', target, appliedCode); }
    else if (pendingRegistration.current === 'existing') flow.showNotice('existing', target);
    flow.clearRecovery(); router.push(target); router.refresh();
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
        const response = await fetch(`/api/auth/${operation}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(operation === 'register' ? { 'X-Clipmkr-Registration': 'outcomes-v1' } : {}) },
          body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) });
        const payload: unknown = await response.json();
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('Не удалось прочитать ответ сервера. Повторите позже');
        const body = payload as AuthReply;
        if (operation === 'register' && response.status === 409 && body.code === 'account_exists') {
          pendingConflict.current = 'Этот аккаунт уже существует. Войдите с прежним паролем или восстановите доступ';
          if (password.current) password.current.value = '';
          finishRequest(); onModeChange('login'); setError(pendingConflict.current); password.current?.focus(); return;
        }
        if (!response.ok) throw new Error(typeof body.error === 'string' ? body.error : 'Не удалось войти');
        if (body.ok !== true || (operation === 'register' && body.registration !== 'created' && body.registration !== 'existing')) {
          throw new Error('Не удалось подтвердить вход. Повторите или выберите «Войти»');
        }
        pendingRegistration.current = operation === 'register' && (body.registration === 'created' || body.registration === 'existing') ? body.registration : null;
        authenticated.current = true; setSignedIn(true);
      }
      const explicit = String(form.get('partner_code') ?? '').trim();
      let appliedCode: string | undefined;
      if (pendingRegistration.current !== 'existing') {
        const reply = await rpc<unknown>('code.apply', manuallyEdited && explicit ? { code: explicit } : {}, true);
        if (reply && typeof reply === 'object' && !Array.isArray(reply) &&
          'id' in reply && typeof reply.id === 'string' && reply.id.length > 0 &&
          'partner_code_id' in reply && typeof reply.partner_code_id === 'string' && reply.partner_code_id.length > 0 &&
          'status' in reply && (reply.status === 'pending' || reply.status === 'activated') &&
          'source' in reply && (reply.source === 'cookie' || reply.source === 'guest_link' || reply.source === 'explicit') &&
          'reject_reason' in reply && reply.reject_reason === null &&
          'applied_code' in reply && typeof reply.applied_code === 'string' && /^[A-Za-z0-9_-]{6,12}$/.test(reply.applied_code)) appliedCode = reply.applied_code;
      }
      continueToCabinet(appliedCode);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Нет связи с сервером'); }
    finally { finishRequest(); }
  }}>
    <div className="public-modes" role="group" aria-label="Регистрация или вход">
      <button className="public-mode" type="button" aria-pressed={register} disabled={busy || signedIn} onClick={() => onModeChange('register')}>Создать аккаунт</button>
      <button className="public-mode" type="button" aria-pressed={!register} disabled={busy || signedIn} onClick={() => onModeChange('login')}>Войти</button>
    </div>
    <h2 id="auth-title">{register ? 'Создать аккаунт' : 'Войти в clipmkr'}</h2>
    <p className="public-form-intro">{register ? creditMode ? 'Начните с 30 пробных кредитов.' : 'Создайте аккаунт, чтобы начать.' : 'Ваши записи и клипы — в вашем кабинете.'}</p>
    {register && referralCode && !manuallyEdited && <div className="public-referral-notice" role="status"><strong>Код из приглашения заполнен. Вводить его не нужно</strong><p>Код заполнен из приглашения. Проверим привязку после создания нового аккаунта.</p></div>}
    <label htmlFor="auth-email">Электронная почта</label>
    <input ref={email} id="auth-email" name="email" type="email" autoComplete="email" required aria-invalid={!!emailError} aria-describedby="auth-email-error" onInput={() => setEmailError('')} />
    <p className="public-hint" id="auth-email-error">{emailError}</p>
    <label htmlFor="auth-password">Пароль</label>
    <input ref={password} id="auth-password" name="password" type="password" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} required aria-invalid={!!passwordError} aria-describedby="auth-password-hint auth-password-error" onInput={event => validatePassword(event.currentTarget)} />
    <p className="public-hint" id="auth-password-hint">{register ? 'От 8 символов, не больше 72 байт. Кириллица и эмодзи занимают больше одного байта.' : 'Введите пароль вашего аккаунта.'}</p>
    <p className="public-hint" id="auth-password-error">{passwordError}</p>
    <details className="public-partner" open={register && !!referralCode}><summary>Есть код партнёра? Необязательно</summary><label htmlFor="auth-partner">Код партнёра</label><input id="auth-partner" name="partner_code" autoComplete="off" maxLength={12} defaultValue={referralCode ?? ''} onInput={() => setManuallyEdited(true)} />{referralCode && !manuallyEdited && <p className="public-hint">Подставлен из ссылки. Можно изменить.</p>}</details>
    {error && <p className="public-error" role="alert" aria-atomic="true">{error}</p>}
    <button className="public-primary public-submit" type="submit" disabled={busy}>{busy ? 'Подождите…' : signedIn ? pendingRegistration.current === 'existing' ? 'Перейти в кабинет' : 'Повторить применение кода' : register ? 'Создать аккаунт' : 'Войти →'}</button>
    <p className="public-legal" hidden={!register}>Создавая аккаунт, вы принимаете <a href="/legal/terms">соглашение</a> и <a href="/legal/privacy">политику конфиденциальности</a>.</p>
    {signedIn && error && pendingRegistration.current !== 'existing' && <button type="button" className="public-discard" disabled={busy} onClick={async () => {
      if (!startRequest()) return;
      try { await rpc('code.apply', { discard_referral: true }, true); continueToCabinet(); }
      catch { setError('Не удалось продолжить. Повторите позже'); } finally { finishRequest(); }
    }}>Продолжить без применения кода</button>}
    <nav className="support-links public-help" aria-label="Помощь со входом"><a href="/forgot" onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); if (request.current || authenticated.current) return;
      flow.rememberRecovery(email.current?.value ?? '', safeNextPath(new URLSearchParams(window.location.search).get('next')));
      router.push('/forgot');
    }}>Забыли пароль?</a><a href="/support">Поддержка</a></nav>
  </form>;
}
