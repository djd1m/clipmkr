'use client';
import { useEffect, useState, type FormEvent } from 'react';
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
function Counters({ value }: { value: Report['bloggers'][number]['counters'] }) {
  return <dl className="partner-counters">
    <div><dt>Регистрации</dt><dd>{value.registrations}</dd></div>
    <div><dt>Пользовались продуктом</dt><dd>{value.active_users}</dd></div>
    <div><dt>Платили</dt><dd>{value.paying_users}</dd></div>
    <div><dt>Платежи</dt><dd>{value.payments}</dd></div>
    <div><dt>Выручка пакетов</dt><dd>{money(value.revenue_minor)}</dd></div>
    <div><dt>Предварительное вознаграждение</dt><dd>{value.commission_estimate_minor === null ? 'Ставка не назначена' : money(value.commission_estimate_minor)}</dd></div>
  </dl>;
}
export default function BloggerAdmin() {
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
  async function find(event: FormEvent) {
    event.preventDefault(); setBusy(true); setNotice(''); setPolicy(null);
    try {
      const found = await request<{ email: string; policy: Policy }>(`/api/owner/bloggers?email=${encodeURIComponent(email)}`);
      setPolicy(found.policy); setBlogger(found.policy.is_blogger);
      setMinutes(found.policy.blogger_source_limit_seconds === null ? '' : String(found.policy.blogger_source_limit_seconds / 60));
      setRate(found.policy.blogger_commission_percent === null ? '' : String(found.policy.blogger_commission_percent));
      setReason(''); setNotice(`Аккаунт найден: ${found.email}`);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Не удалось найти аккаунт'); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!policy) return;
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
  return <section className="stack" aria-labelledby="bloggers-title">
    <h1 id="bloggers-title" style={{ fontSize: 'clamp(2rem, 1.8rem + .4vw, 3.375rem)' }}>Блогеры и рекомендации</h1>
    <p>Обычные пользователи: до 90 минут. Блогеры: до 120 минут, если не назначен индивидуальный лимит. Баланс и квоты действуют отдельно.</p>
    <section className="partner-panel">
      <h2>Настройки блогера</h2>
      <form onSubmit={find}>
        <label htmlFor="blogger-email">Email зарегистрированного аккаунта</label>
        <input id="blogger-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} />
        <button disabled={busy}>Найти аккаунт</button>
      </form>
      {policy && <form onSubmit={save} style={{ marginBlockStart: 'var(--space-6)' }}>
        <label style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', minHeight: '2.75rem' }}>
          <input type="checkbox" checked={blogger} onChange={event => setBlogger(event.target.checked)} /> Блогер, распространяющий продукт
        </label>
        <label htmlFor="blogger-minutes">Индивидуальный лимит, минут</label>
        <input id="blogger-minutes" type="number" min={2} max={1440} step={1} value={minutes} onChange={event => setMinutes(event.target.value)} aria-describedby="blogger-minutes-help" />
        <p id="blogger-minutes-help">Пустое поле: 120 минут для блогера. Для обычного аккаунта действует 90 минут. Изменения применяются к новым записям.</p>
        <label htmlFor="blogger-rate">Ставка вознаграждения</label>
        <select id="blogger-rate" value={rate} onChange={event => setRate(event.target.value)}>
          <option value="">Не назначена</option><option value="20">20%</option><option value="30">30%</option>
        </select>
        <label htmlFor="blogger-reason">Причина изменения</label>
        <input id="blogger-reason" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
        <button disabled={busy}>Сохранить настройки</button>
      </form>}
    </section>
    <p role="status" aria-live="polite">{notice}</p>
    <section className="partner-panel">
      <h2>Статистика за месяц</h2>
      <form onSubmit={event => { event.preventDefault(); setBusy(true); setNotice(''); void loadReport(month).catch(error => setNotice(error.message)).finally(() => setBusy(false)); }}>
        <label htmlFor="blogger-month">Месяц по Москве</label>
        <input id="blogger-month" type="month" required value={month} onChange={event => setMonth(event.target.value)} />
        <button disabled={busy}>Показать статистику</button>
      </form>
      <p>Активные пользователи — люди с готовой записью и хотя бы одним клипом за месяц. Выручка — подтверждённые оплаты пакетов до комиссий провайдера.</p>
      <p>Вознаграждение — предварительная оценка по текущей ставке с округлением вниз до копейки. Это не задолженность к выплате; автоматических выплат нет.</p>
      {report && <><p>Отчёт: {report.month}, Москва.</p>{report.bloggers.length === 0 && <p>Блогеры ещё не назначены.</p>}
        {report.bloggers.map(item => <article key={item.account_id} className="partner-panel">
          <h3>{item.email}</h3><p>Ставка: {item.commission_percent === null ? 'не назначена' : `${item.commission_percent}%`}</p>
          <Counters value={item.counters} />
          {item.codes.length === 0 && <p>Блогер ещё не создал ссылку в своём кабинете.</p>}
          {item.codes.map(code => <section key={code.id}><h4>Ссылка: {code.code}</h4><p>{code.status === 'active' ? 'Активна' : 'Заблокирована'}</p><Counters value={code.counters} /></section>)}
        </article>)}
      </>}
    </section>
  </section>;
}
