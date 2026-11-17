'use client';
// из N6: projects/06-rag-sales-chatbase/apps/web/src/app/upgrade/return/ReturnScreen.tsx — адаптировано (фича 30 payments,
// AC-10): тексты N5, один тариф. Состояния — decideReturnState (lib/payment-return.ts): выполняется, успех,
// оплачено-но-не-действует, отказ, не подтверждено за отведённое время, не найдено — у каждого СВОЙ блок с data-state
// (long-running-job: два неразличимых на экране состояния — одно состояние). Опрос — GET /api/checkout/{intent_id}.
import { observePayment } from '../../../lib/acquisition-analytics';
import { useEffect, useState } from 'react';
import { isCreditSku } from '@clipmaker/shared/tariff';
import { RETURN_DEADLINE_MS, RETURN_FETCH_TIMEOUT_MS, RETURN_MAX_ATTEMPTS, RETURN_POLL_INTERVAL_MS, clearCheckoutAttempt, decideReturnState, type CheckoutSnapshot, type ReturnState } from '../../../lib/payment-return';

const date = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow' });

export function ReturnView({ state }: { state: ReturnState }) {
  switch (state.kind) {
    case 'package': return <div data-state="package"><h1>Пакет {state.title} оплачен</h1>
      <p role="status" className="notice">{state.credits} кредитов · {(state.credits/60).toLocaleString('ru-RU')} ч обычной записи.
      {' '}{state.scheduled?'Начнётся':'Период'} {date(state.start)} — {date(state.end)}. {state.scheduled?'До начала периода эти кредиты недоступны.':'Платные функции действуют до конца этого окна.'}</p>
      <p>Бесплатные клипы хранятся 7 суток от готовности; с оплатой — до конца оплаченного периода и ещё 30 суток.</p>
      <a className="button" href="/dashboard">В кабинет</a></div>;
    case 'waiting': return <div data-state="waiting" aria-busy="true">
      <h1>Ждём подтверждения оплаты</h1>
      <p role="status">Банк подтверждает платёж. Обычно это несколько секунд. Проверка {Math.min(state.attempts + 1, RETURN_MAX_ATTEMPTS)} из {RETURN_MAX_ATTEMPTS}.</p>
    </div>;
    case 'succeeded': return <div data-state="succeeded">
      <h1>Тариф Pro включён</h1>
      <p role="status" className="notice">{state.until ? `Оплачено до ${date(state.until)}.` : 'Оплата подтверждена.'} Новые клипы соберутся без метки. Бесплатные клипы хранятся 7 суток от готовности; с оплатой — до конца оплаченного периода и ещё 30 суток.</p>
      <p><a className="button" href="/dashboard">В кабинет</a></p>
    </div>;
    case 'paid_inactive': return <div data-state="paid_inactive">
      <h1>Оплата прошла, но тариф сейчас не действует</h1>
      <p role="status" className="notice">Срок оплаченного тарифа истёк или тариф снят вручную. Новые клипы снова получают метку.</p>
      <p><a className="button secondary" href="/upgrade?from=partner_dashboard">Оформить снова</a></p>
    </div>;
    case 'failed': return <div data-state="failed">
      <h1>Оплата не прошла</h1>
      <p role="alert">Платёж отменён. Деньги, если списались, вернутся на карту автоматически.</p>
      <p><a className="button" href="/upgrade?from=partner_dashboard">Попробовать снова</a></p>
    </div>;
    case 'unconfirmed': return <div data-state="unconfirmed">
      <h1>Подтверждение ещё не пришло</h1>
      <p role="status" className="notice">Это не значит, что оплата не прошла. Не платите повторно: откройте эту страницу через несколько минут. Если деньги списались, а тариф не включился, напишите нам — проверим вручную.</p>
      <button type="button" className="secondary" onClick={() => window.location.reload()}>Проверить ещё раз</button>
    </div>;
    case 'not_found': return <div data-state="not_found">
      <h1>Оплата не найдена</h1>
      <p role="alert">Ссылка устарела или открыта из другого аккаунта. Войдите в тот аккаунт, из которого оплачивали.</p>
      <p><a className="button secondary" href="/dashboard">В кабинет</a></p>
    </div>;
  }
}

export function ReturnScreen({ intentId, checkoutOwner }: { intentId: string; checkoutOwner: string }) {
  const [state, setState] = useState<ReturnState>({ kind: 'waiting', attempts: 0 });
  const [receipt, setReceipt] = useState<{ status: 'pending' | 'accepted' | 'problem'; email: string | null } | null>(null);
  useEffect(() => {
    let attempts = 0, stopped = false, timer: ReturnType<typeof setTimeout> | undefined;
    let paid: ReturnState | null = null;
    const started = Date.now();
    const poll = async () => {
      if (stopped) return;
      let snapshot: CheckoutSnapshot | null | 'not_found' = null;
      try {
        const response = await fetch(`/api/checkout/${encodeURIComponent(intentId)}`, { cache: 'no-store', signal: AbortSignal.timeout(RETURN_FETCH_TIMEOUT_MS) });
        if (response.status === 404) snapshot = 'not_found';
        else if (response.ok) {
          const raw = (await response.json()) as { data?: unknown };
          if (!stopped) observePayment(intentId, raw.data);
          snapshot = (raw.data as CheckoutSnapshot | undefined) ?? null;
        }
      } catch { snapshot = null; /* сбой опроса — не отказ оплаты */ }
      if (stopped) return;
      attempts += 1;
      const elapsed = Date.now() - started;
      const next = decideReturnState(snapshot, attempts, elapsed);
      if (snapshot && snapshot !== 'not_found' && (snapshot.status === 'succeeded' || snapshot.status === 'canceled')) {
        clearCheckoutAttempt(checkoutOwner, intentId, isCreditSku(snapshot.sku) ? snapshot.sku : undefined);
      }
      if (next.kind === 'package' || next.kind === 'succeeded' || next.kind === 'paid_inactive') paid = next;
      if (snapshot === 'not_found') {
        setState(next); setReceipt(null);
        return;
      }
      setState(paid ?? next);
      if (paid) {
        const status = snapshot?.receipt_status;
        const email = typeof snapshot?.receipt_email === 'string' ? snapshot.receipt_email : null;
        if (status === 'accepted' || status === 'problem') { setReceipt({ status, email }); return; }
        if (status !== 'pending' && snapshot !== null) return;
        if (elapsed >= RETURN_DEADLINE_MS || attempts >= RETURN_MAX_ATTEMPTS) {
          setReceipt({ status: 'problem', email: null });
          return;
        }
        if (status === 'pending') setReceipt({ status, email });
      }
      if (paid || next.kind === 'waiting') timer = setTimeout(() => { void poll(); }, RETURN_POLL_INTERVAL_MS);
    };
    void poll();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [intentId, checkoutOwner]);
  return <section className="status-panel billing-return">
    <div aria-live="polite"><ReturnView state={state} /></div>
    <div role="status" aria-atomic="true" className="billing-selection-message" data-receipt-status={receipt?.status}>
      {receipt?.status === 'pending' && <p>Готовим квитанцию{receipt.email && <> для <strong>{receipt.email}</strong></>}.</p>}
      {receipt?.status === 'accepted' && <p>Почтовый сервис принял квитанцию к отправке{receipt.email && <> на <strong>{receipt.email}</strong></>}.</p>}
      {receipt?.status === 'problem' && <p className="package-checkout-error">Квитанция пока не отправлена. Если письмо не придёт, обратитесь в <a href="/support">поддержку</a>.</p>}
    </div>
  </section>;
}
