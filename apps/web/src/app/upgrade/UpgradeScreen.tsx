'use client';
// Catalogue visibility is independent of checkout availability.
import { useEffect, useRef, useState } from 'react';
import { CREDIT_SKUS,formatRubles,type CreditSku,type CreditPurchaseWindows } from '@clipmaker/shared/tariff';
import { CHECKOUT_OWNER_HEADER, clearCheckoutAttempt, readCheckoutAttempt, selectedPackagePath, storeCheckoutAttempt, type CheckoutAttempt } from '../../lib/payment-return';
import { supportRequest } from '../../lib/support-client';

export interface UpgradeCurrent { plan: 'free' | 'paid'; plan_source: string; plan_paid_until: string | null }
export interface UpgradeProps {
  testMode?: boolean; ownerUnlimited?: boolean; purchaseWindows?: CreditPurchaseWindows; creditMode?: boolean; catalogOnly?: boolean; salesEnabled?: boolean;
  title: string; price: string; days: number; paidMinutes: number; current: UpgradeCurrent;
  checkoutOwner?: string; selectedSku?: CreditSku; email?: string; emailVerified?: boolean; mailAvailable?: boolean;
}

function newKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const bytes = new Uint8Array(16); crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
const date = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });

export function CurrentPlanNote({ current, title }: { current: UpgradeCurrent; title: string }) {
  if (current.plan !== 'paid') return null;
  if (current.plan_source === 'payment' && current.plan_paid_until) {
    return <p role="status" className="notice" data-state="current-paid">Сейчас у вас тариф {title} до {date(current.plan_paid_until)}. Оплата прибавит ещё срок к этой дате.</p>;
  }
  return <p role="status" className="notice" data-state="current-manual">Сейчас у вас тариф {title}, назначенный вручную, — платить не нужно.</p>;
}

export function UpgradeScreen(p: UpgradeProps) {
  const attempts = useRef<Partial<Record<CreditSku | 'legacy', CheckoutAttempt>>>({});
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      const previous = pending.current;
      pending.current = null;
      previous?.abort();
    };
  }, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checkoutSku, setCheckoutSku] = useState<CreditSku | null>(null);
  const { selectedSku } = p;
  const verified = p.emailVerified !== false;
  const [sent, setSent] = useState(false);
  const [mailStatus, setMailStatus] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorMessage = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorMessage.current?.focus(); }, [error]);
  useEffect(() => { if (selectedSku) heading.current?.focus(); }, [selectedSku]);
  const canPurchase = !p.ownerUnlimited && !!p.salesEnabled && !p.catalogOnly && !!p.purchaseWindows;
  const choosePackage = (sku: CreditSku) => window.location.assign(selectedPackagePath(sku));
  const sendVerification = async (sku: CreditSku) => {
    if (pending.current || !p.mailAvailable) return;
    const request = new AbortController();
    pending.current = request;
    setBusy(true); setError(''); setMailStatus('');
    try {
      await supportRequest('/api/auth/email/send', { sku });
      if (pending.current !== request) return;
      setMailStatus(sent ? 'Запрос нового письма принят.' : 'Письмо отправлено.');
      setSent(true);
    } catch (cause) {
      if (pending.current !== request) return;
      setError(cause instanceof Error ? cause.message : 'Письмо недоступно. Повторите позже.');
    } finally {
      if (pending.current === request) { pending.current = null; setBusy(false); }
    }
  };
  const pay = async (sku?:CreditSku) => {
    if (!mounted.current || p.ownerUnlimited === true || pending.current || (p.creditMode && (!p.salesEnabled || p.catalogOnly || !p.purchaseWindows))) return;
    if (sku && !verified) { choosePackage(sku); return; }
    const attempt = new AbortController();
    pending.current = attempt;
    const alive = () => mounted.current && pending.current === attempt && !attempt.signal.aborted;
    const owner = p.checkoutOwner;
    const slot = sku ?? 'legacy';
    const saved = (owner ? readCheckoutAttempt(owner, sku) : null) ?? attempts.current[slot] ?? { key: newKey() };
    attempts.current[slot] = saved;
    if (owner) storeCheckoutAttempt(owner, saved, sku);
    setBusy(true); setError(''); setNeedsReview(false); setCheckoutSku(sku ?? null);
    try {
      const scope = owner ? { [CHECKOUT_OWNER_HEADER]: owner } : undefined;
      const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', ...scope },
        body: JSON.stringify({ idempotency_key: saved.key, ...(sku ? { sku } : {}) }), cache: 'no-store', signal: attempt.signal });
      if (!alive()) return;
      const body = await response.json().catch(() => null) as { data?: { intent_id: string; redirect_url: string | null }; error?: { code?: string; message?: string } } | null;
      if (!alive()) return;
      if ((response.status === 201 || response.status === 200) && typeof body?.data?.intent_id === 'string') {
        const id = body.data.intent_id;
        const returnTo = `/upgrade/return?intent=${encodeURIComponent(id)}`;
        let target = body.data.redirect_url ?? returnTo;
        if (owner) {
          const authority = await fetch(`/api/checkout/${encodeURIComponent(id)}`, { headers: scope, cache: 'no-store', signal: attempt.signal });
          const checked = await authority.json().catch(() => null) as { data?: { intent_id?: string; status?: string } } | null;
          if (!alive()) return;
          if (!authority.ok || checked?.data?.intent_id !== id) throw new Error('Не удалось проверить текущий аккаунт. Обновите страницу пакетов.');
          const bound = { key: saved.key, intentId: id };
          attempts.current[slot] = bound;
          storeCheckoutAttempt(owner, bound, sku);
          if (checked.data.status === 'succeeded' || checked.data.status === 'canceled') {
            clearCheckoutAttempt(owner, id, sku);
            target = returnTo;
          }
        }
        const address = new URL(target, window.location.origin);
        if (address.protocol !== 'https:' && address.origin !== window.location.origin) throw new Error('Форма оплаты недоступна.');
        window.location.assign(address.href);
        return;
      }
      if (sku && body?.error?.code === 'email_verification_required') {
        choosePackage(sku);
      } else {
        setNeedsReview(body?.error?.code === 'payment_reconciliation_required' || body?.error?.code === 'payment_identity_conflict');
        setError(body?.error?.message ?? 'Не удалось начать оплату. Повторите');
      }
    } catch {
      if (!alive()) return;
      setError('Не удалось начать оплату. Проверьте текущий аккаунт и повторите.');
    }
    if (!alive()) return;
    pending.current = null;
    setBusy(false);
  };
  const selected = selectedSku && canPurchase ? CREDIT_SKUS[selectedSku] : null;
  if (selected && selectedSku) return <section className="packages-screen billing-selection" aria-labelledby="credit-title">
    <h1 id="credit-title" tabIndex={-1}>Пакеты кредитов</h1>
    {p.testMode && <span className="workspace-test studio-test">TEST · Тестовая оплата</span>}
    <section className="billing-selected-package" aria-label="Выбранный пакет">
      <div><strong>{selected.title}</strong><p className="muted">{selected.days} дней · разовая оплата</p></div>
      <strong>{formatRubles(selected.priceMinor)}</strong>
    </section>
    <section className="status-panel" aria-labelledby="billing-step-heading">
      <h2 id="billing-step-heading" ref={heading} tabIndex={-1}>{verified ? 'Почта подтверждена' : sent ? 'Проверьте почту' : 'Подтвердите почту перед оплатой'}</h2>
      {sent && !verified ? <p>Письмо отправлено на <strong>{p.email}</strong>. Откройте ссылку в письме.</p>
        : <p>Квитанция придёт на <strong>{p.email}</strong>.</p>}
      {!verified && !sent && <p className="muted">Сохраним выбранный пакет, пока вы подтверждаете адрес.</p>}
      {!verified && !p.mailAvailable && <p>Отправка писем сейчас недоступна.</p>}
      <div className="billing-selection-actions">
        {verified
          ? <button type="button" disabled={busy} onClick={() => void pay(selectedSku)}>{busy ? 'Переходим к оплате…' : `Оплатить пакет «${selected.title}»`}</button>
          : <button type="button" disabled={busy || !p.mailAvailable} className={sent ? 'secondary' : undefined} onClick={() => void sendVerification(selectedSku)}>
            {busy ? 'Отправляем…' : sent ? 'Отправить новое письмо' : 'Отправить письмо'}</button>}
        <a className="button secondary" href="/upgrade">Посмотреть пакеты</a>
      </div>
      <p role="status" aria-atomic="true" className="billing-selection-message">{mailStatus}</p>
      {error && <p className="package-checkout-error" role="alert" tabIndex={-1} ref={errorMessage}>{error}</p>}
      {needsReview && <a href="/support">Поддержка</a>}
    </section>
  </section>;
  if (p.creditMode) return <section className="packages-screen" aria-labelledby="credit-title">
    <div className="studio-plans">
      <div className="workspace-title studio-plans-intro">
        <p className="studio-kicker">Время для записи</p>
        <h1 id="credit-title">Пакеты кредитов</h1>
        <p className="studio-lead">1 кредит = 60 секунд исходной записи. Сравните объём и стоимость.</p>
        {p.testMode && <span className="workspace-test studio-test">TEST · Тестовая оплата</span>}
        {p.ownerUnlimited ? <p role="status" className="notice">Доступ владельца: без лимитов, покупать пакет не нужно.</p> : p.catalogOnly ? <CurrentPlanNote current={p.current} title={p.title} /> : p.current.plan === 'paid' ? <p role="status" className="notice">Сейчас действуют платные функции.</p> : null}
        {!p.ownerUnlimited && p.catalogOnly && <p role="status">Это каталог новых пакетов. Ваши текущие условия сохраняются. Покупка этих пакетов для вашего аккаунта пока недоступна.</p>}
      </div>
      <div className="workspace-plans studio-plans-list">
        {(Object.keys(CREDIT_SKUS) as CreditSku[]).map((sku, index) => {
          const offer = CREDIT_SKUS[sku];
          const reason = p.ownerUnlimited ? 'Доступ владельца: покупка не требуется.' : p.catalogOnly ? 'Покупка этих пакетов для вашего аккаунта пока недоступна.' : !p.salesEnabled ? 'Продажа новых пакетов временно выключена.' : !p.purchaseWindows ? 'Не удалось определить даты пакетов. Обновите страницу перед оплатой.' : null;
          return <section key={sku} className="workspace-package studio-plan studio-plan-row" aria-label={offer.title} data-sku={sku}>
            <span className="studio-plan-num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div className="package-description">
              <h2>{offer.title}</h2>
              <dl><div><dt>Кредиты</dt><dd>{offer.credits} кредитов</dd></div><div><dt>Объём записи</dt><dd>{offer.hours} ч записи</dd></div><div><dt>Срок</dt><dd>{offer.days} дней</dd></div></dl>
              <p>{offer.kind === 'addon' ? 'Действует сразу после оплаты. Платные функции сохраняются все 30 дней, даже если кредиты закончились.' : 'Полная цена за следующий базовый период. Если оплаченного базового периода нет — действует с оплаты.'}</p>
              {!p.ownerUnlimited && p.purchaseWindows && <p data-state="prospective-period">При оплате сейчас: <time dateTime={offer.kind === 'base' ? p.purchaseWindows.baseStart : p.purchaseWindows.addonStart}>{date(offer.kind === 'base' ? p.purchaseWindows.baseStart : p.purchaseWindows.addonStart)}</time>
                {' '}— <time dateTime={offer.kind === 'base' ? p.purchaseWindows.baseEnd : p.purchaseWindows.addonEnd}>{date(offer.kind === 'base' ? p.purchaseWindows.baseEnd : p.purchaseWindows.addonEnd)}</time>.
                {offer.kind === 'base' && p.purchaseWindows.scheduled && ' Начнётся позже, после уже оплаченных базовых периодов.'}</p>}
            </div>
            <div className="studio-plan-end package-end">
              <p className="workspace-package-price studio-plan-price">{formatRubles(offer.priceMinor)}</p>
              <p className="package-purchase-terms muted">{p.testMode && <>TEST · Тестовая оплата. Реальных списаний нет. </>}Покупка разовая, без автоматического списания. Срок — {offer.days} дней; неиспользованный остаток сгорает.
                {!p.ownerUnlimited && !p.catalogOnly && ' Даты предварительные; итоговые даты покажем после подтверждения оплаты.'}</p>
              {reason && <p id={`offer-reason-${sku}`} className="muted">{reason}</p>}
              <button disabled={busy || reason !== null} type="button" className={sku === 'pro_v1' ? 'action-primary' : 'action-secondary secondary'} aria-describedby={error && checkoutSku === sku ? `offer-error-${sku}` : reason ? `offer-reason-${sku}` : undefined} onClick={() => void pay(sku)}>{p.ownerUnlimited ? 'Покупка не требуется' : busy && checkoutSku === sku ? 'Переходим к оплате…' : reason ? 'Покупка пока недоступна' : offer.kind === 'addon' ? 'Купить сейчас' : `Купить ${offer.title} на следующий период`}</button>
              {error && checkoutSku === sku && <p id={`offer-error-${sku}`} className="package-checkout-error" role="alert" tabIndex={-1} ref={errorMessage}>{error}</p>}
              {needsReview && checkoutSku === sku && <a href="/support">Поддержка</a>}
            </div>
          </section>;
        })}
      </div>
    </div>
    <details className="packages-help"><summary>Условия покупки и использования кредитов</summary>
      <p>Посекундный резерв до обработки, списание один раз при первом готовом клипе. Бонус при регистрации: 30 кредитов один раз, без срока. Ежемесячного пополнения нет.</p>
      <p>Покупка разовая, без автоматического списания. Старт и Про действуют 30 дней; неиспользованный остаток сгорает. Следующий базовый пакет начнётся после уже оплаченных базовых периодов.</p>
      {!p.ownerUnlimited && !p.catalogOnly && <p>Даты предварительные: другая покупка до подтверждения оплаты может сдвинуть базовый период, а время оплаты — начало дополнительного пакета. Итоговые даты покажем после подтверждения оплаты.</p>}
      {!p.ownerUnlimited && <p>Во время оплаченного периода новые клипы без метки. Бесплатные клипы хранятся 7 суток от готовности; с оплатой — до конца оплаченного периода и ещё 30 суток. Немедленный переход с зачётом прошлых покупок пока недоступен: доступны Про на следующий период и дополнительный пакет сейчас.</p>}
      {!p.ownerUnlimited && !p.catalogOnly && !p.salesEnabled && <p role="status">Ранее приобретённые кредиты сохраняются.</p>}
    </details>
    <a className="button secondary" href="/dashboard">В кабинет</a>
  </section>;
  return <section className="status-panel" aria-labelledby="upgrade-title" data-state="pay">
    <h1 id="upgrade-title">Тариф {p.title}</h1>
    <p><strong>{p.price}</strong> за {p.days} дней. Оплата разовая, без автопродления: продлить — оплатить ещё раз.</p>
    <ul>
      <li>Новые клипы — без метки КлипМейкера.</li>
      <li>Бесплатные клипы хранятся 7 суток от готовности; с оплатой — до конца оплаченного периода и ещё 30 суток.</li>
      <li>До {p.paidMinutes} минут записи в день.</li>
    </ul>
    <p className="muted">Уже готовые клипы не перерисовываются: метка вшита в кадр.</p>
    {p.ownerUnlimited ? <p role="status" className="notice">Доступ владельца: без лимитов, покупать пакет не нужно.</p> : <CurrentPlanNote current={p.current} title={p.title} />}
    <p>{p.testMode && <>TEST · Тестовая оплата. Реальных списаний нет. </>}Оплата картой или СБП через ЮKassa. После оплаты вернётесь сюда, и тариф включится сам.</p>
    {error && <p role="alert">{error}</p>}
    <button type="button" disabled={p.ownerUnlimited === true || busy} onClick={() => { void pay(); }}>{busy ? 'Переходим к оплате…' : `Оплатить ${p.price}`}</button>
    <p><a className="button secondary" href="/dashboard">В кабинет</a></p>
  </section>;
}
