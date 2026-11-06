'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { bloggerReport, getBloggerPolicy } from '@clipmaker/db';
import { moscowDay } from '@clipmaker/shared/upload';

type Report = Extract<Awaited<ReturnType<typeof bloggerReport>>, { kind: 'ok' }>;
type Policy = NonNullable<Awaited<ReturnType<typeof getBloggerPolicy>>>;
const money = (minor: number) => `${(minor / 100).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`;
async function request<T>(url: string, body?: object): Promise<T> {
  const response = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? 'Не удалось выполнить запрос');
  return result.data as T;
}
function Counters({ value, primary = false }: { primary?: boolean; value: Report['bloggers'][number]['counters'] }) {
  return <dl className="partner-counters">
    <div><dt>Регистрации</dt><dd>{value.registrations}</dd></div>
    <div><dt>Пользовались продуктом</dt><dd>{value.active_users}</dd></div>
    <div><dt>Платили</dt><dd>{value.paying_users}</dd></div>
    {!primary && <div><dt>Платежи</dt><dd>{value.payments}</dd></div>}
    <div><dt>Выручка пакетов</dt><dd>{money(value.revenue_minor)}</dd></div>
    {!primary && <div><dt>Предварительное вознаграждение</dt><dd>{value.commission_estimate_minor === null ? 'Ставка не назначена' : money(value.commission_estimate_minor)}</dd></div>}
  </dl>;
}
export default function BloggerAdmin() {
  const [view, setView] = useState<'assignment' | 'report'>('assignment');
  const reportTrigger = useRef<HTMLButtonElement>(null), reportHeading = useRef<HTMLHeadingElement>(null), changedView = useRef(false);
  useEffect(() => { if (changedView.current) (view === 'report' ? reportHeading.current : reportTrigger.current)?.focus(); }, [view]);
  const [month, setMonth] = useState(() => moscowDay(new Date()).slice(0, 7));
  const [report, setReport] = useState<Report | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [email, setEmail] = useState('');
  const [minutes, setMinutes] = useState('');
  const [rate, setRate] = useState('');
  const [blogger, setBlogger] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function loadReport(selected: string) {
    const data = await request<Report>(`/api/owner/bloggers?month=${encodeURIComponent(selected)}`);
    setReport(data);
  }
  useEffect(() => { void loadReport(moscowDay(new Date()).slice(0, 7)).catch(error => setNotice(error.message)); }, []);
  async function find(event: FormEvent, lookup = email) {
    event.preventDefault(); setBusy(true); setNotice(''); setPolicy(null);
    try {
      const found = await request<{ email: string; policy: Policy }>(`/api/owner/bloggers?email=${encodeURIComponent(lookup)}`);
      setEmail(found.email); setPolicy(found.policy); setBlogger(found.policy.is_blogger);
      setMinutes(found.policy.blogger_source_limit_seconds === null ? '' : String(found.policy.blogger_source_limit_seconds / 60));
      setRate(found.policy.blogger_commission_percent === null ? '' : String(found.policy.blogger_commission_percent));
      setReason(''); setNotice(`Аккаунт найден: ${found.email}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось найти аккаунт'); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!policy) return;
    if (minutes !== '' && (!Number.isInteger(Number(minutes)) || Number(minutes) < 2 || Number(minutes) > 1440)) {
      const field = document.getElementById('blogger-minutes'); field?.closest('details')?.setAttribute('open', ''); field?.focus(); setNotice('Укажите целый лимит от 2 до 1440 минут или оставьте поле пустым.'); return;
    }
    setBusy(true); setNotice('');
    try {
      const updated = await request<Policy>('/api/owner/bloggers', {
        account_id: policy.account_id, is_blogger: blogger,
        max_minutes: minutes === '' ? null : Number(minutes),
        commission_percent: rate === '' ? null : Number(rate), reason,
      });
      setPolicy(updated);
      const saved = `Настройки сохранены. Лимит новых записей: ${updated.max_source_seconds / 60} минут`;
      setNotice(saved);
      try { await loadReport(month); }
      catch { setNotice(`${saved}. Не удалось обновить статистику — повторите её загрузку`); }
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Настройки не сохранены'); }
    finally { setBusy(false); }
  }
  return <section className="stack blogger-admin" aria-labelledby="bloggers-title">
    {view === 'report' && <button type="button" className="secondary" disabled={busy} onClick={() => { changedView.current = true; setView('assignment'); }}>← К управлению блогерами</button>}
    <h1 id="bloggers-title" ref={reportHeading} tabIndex={-1}>{view === 'report' ? 'Отчёт за месяц' : 'Блогеры'}</h1>
    {view === 'assignment' ? <>
    <p>Найдите существующий аккаунт, чтобы назначить блогером. Обычные пользователи: до 90 минут. Блогеры: до 120 минут, если не назначен индивидуальный лимит. Баланс и квоты действуют отдельно.</p>
    <button ref={reportTrigger} className="secondary owner-report-link" disabled={busy} onClick={() => { changedView.current = true; setView('report'); }}>Отчёт за месяц →</button>
    <section className="partner-panel">
      <h2>Настройки блогера</h2>
      <form onSubmit={find}>
        <label htmlFor="blogger-email">Email зарегистрированного аккаунта</label>
        <input id="blogger-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy}>Найти аккаунт</button>
      </form>
      {policy && <form className="assignment-form" onSubmit={save} onInvalidCapture={event => {
        const field = event.target as HTMLInputElement; field.closest('details')?.setAttribute('open', ''); field.focus();
      }}>
        <h2>Назначение блогером</h2>
        <p className="owner-policy-summary">{blogger ? `Блогер · лимит записи ${minutes || '120'} минут${minutes ? ' (индивидуальный)' : ' (стандартный)'}` : 'Обычный пользователь · лимит записи 90 минут'}. {rate ? `Ставка ${rate}%: предварительная оценка, не выплата.` : 'Ставка не назначена; оценка вознаграждения не рассчитывается.'}</p>
        <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minHeight: '2.75rem' }}>
          <input type="checkbox" checked={blogger} onChange={event => setBlogger(event.target.checked)} /> Блогер, распространяющий продукт
        </label>
        <details><summary>Дополнительные настройки</summary><div>
        <label htmlFor="blogger-minutes">Индивидуальный лимит, минут</label>
        <input id="blogger-minutes" type="number" min={2} max={1440} step={1} value={minutes} onChange={event => setMinutes(event.target.value)} aria-describedby="blogger-minutes-help" />
        <p id="blogger-minutes-help">Пустое поле: 120 минут для блогера. Для обычного аккаунта действует 90 минут. Изменения применяются к новым записям.</p>
        <label htmlFor="blogger-rate">Ставка вознаграждения</label>
        <select id="blogger-rate" value={rate} onChange={event => setRate(event.target.value)}>
          <option value="">Не назначена</option><option value="20">20%</option><option value="30">30%</option>
        </select>
        </div></details>
        <label htmlFor="blogger-reason">Причина изменения</label>
        <input id="blogger-reason" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
        <button disabled={busy}>Сохранить настройки</button><button type="button" className="secondary" disabled={busy} onClick={() => setPolicy(null)}>Отмена</button>
      </form>}
    </section>
    <section className="assignment-list"><h2>Назначенные блогеры</h2>
      {report?.bloggers.map(item => <button type="button" className="workspace-record secondary" key={item.account_id} disabled={busy} onClick={event => { void find(event, item.email); }}><span>{item.email}</span><span>Изменить →</span></button>)}
      {report?.bloggers.length === 0 && <p>Блогеры ещё не назначены.</p>}
    </section>
    </> : <>
    <section className="partner-panel owner-report">
      <form onSubmit={event => { event.preventDefault(); setBusy(true); setNotice(''); void loadReport(month).catch(error => setNotice(error.message)).finally(() => setBusy(false)); }}>
        <label htmlFor="blogger-month">Месяц по Москве
          <input id="blogger-month" type="month" required value={month} onChange={event => setMonth(event.target.value)} />
        </label>
        <button disabled={busy}>Показать статистику</button>
      </form>
      <p>Активные пользователи — люди с готовой записью и хотя бы одним клипом за месяц. Выручка — подтверждённые оплаты пакетов до комиссий провайдера.</p>
      <p>Вознаграждение — предварительная оценка по текущей ставке с округлением вниз до копейки. Это не задолженность к выплате; автоматических выплат нет.</p>
      {report && <><p>Отчёт: {report.month}, Москва.</p>{report.bloggers.length === 0 && <p>Блогеры ещё не назначены.</p>}
        {report.bloggers.map(item => <article key={item.account_id} className="partner-panel">
          <h2>{item.email}</h2><p>Ставка: {item.commission_percent === null ? 'не назначена' : `${item.commission_percent}%`}</p>
          <Counters value={item.counters} primary />
          <p>Предварительное вознаграждение: {item.counters.commission_estimate_minor === null ? 'ставка не назначена, не рассчитывается' : money(item.counters.commission_estimate_minor)}. Это не задолженность; автоматических выплат нет.</p>
          <details><summary>По ссылкам и подробности</summary><p>Платежи: {item.counters.payments}</p>
          {item.codes.length === 0 && <p>Блогер ещё не создал ссылку в своём кабинете.</p>}
          {item.codes.map(code => <section key={code.id}><h4>Ссылка: {code.code}</h4><p>{code.status === 'active' ? 'Активна' : 'Заблокирована'}</p><Counters value={code.counters} /></section>)}
          </details>
        </article>)}
      </>}
    </section>
    </>}
    <p role="status" aria-live="polite">{notice}</p>
  </section>;
}
