'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { rpc } from '../../lib/rpc';
import type { PartnerService } from '../../server/partner';
type ServiceDashboard = Awaited<ReturnType<PartnerService['dashboard']>>;
type Dashboard = Omit<ServiceDashboard, 'counters'> & { counters: ServiceDashboard['counters'] & { purchases?: number; revenue_minor?: number } };
const labels = { visits: 'Переходы', registrations: 'Регистрации', uploaded: 'Загруженные записи', shared: 'Клипы, вышедшие наружу', guests: 'Приглашённые гости' };
const statuses = { pending: 'Ожидают первого выпуска', activated: 'Первый выпуск готов', rejected: 'Отклонены', partner_deleted: 'Партнёр удалён' };
const sources = { explicit: 'Явный код', guest_link: 'Гостевая ссылка', cookie: 'Переход по ссылке' };
export function PartnerSummary({ data, publicOrigin, onCopy, blockedPersonalId, codesVisible = true, countersVisible = true, primary = false }: { data: Dashboard; publicOrigin?: string; onCopy?: (url: string, target: HTMLAnchorElement | null) => void; blockedPersonalId?: string; codesVisible?: boolean; countersVisible?: boolean; primary?: boolean }) {
  return <>{countersVisible && <dl className="partner-counters">{Object.entries(labels).filter(([key]) => !primary || ['visits','registrations','uploaded'].includes(key)).map(([key, label]) =>
    <div key={key}><dt>{label}</dt><dd>{data.counters[key as keyof typeof labels]}</dd></div>)}
    <div><dt>Покупки пакетов</dt><dd>{data.counters.purchases ?? 0}</dd></div>
    {!primary && <div><dt>Выручка до комиссии</dt><dd>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format((data.counters.revenue_minor ?? 0) / 100)}</dd></div>}</dl>}
    {codesVisible && !data.codes.length && <p className="empty">У вас пока нет ссылок блогеров. Создайте первую ссылку с помощью формы выше.</p>}
    {codesVisible && data.codes.map(code => <article className="partner-code" key={code.id}><h3>{code.code}</h3>
      {publicOrigin && <><p><a style={{ overflowWrap: 'anywhere' }} href={`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`}>{`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`}</a></p>
        {onCopy && code.id !== blockedPersonalId && <button type="button" onClick={event => onCopy(`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`, event.currentTarget.parentElement?.querySelector('a') ?? null)}>Копировать ссылку {code.code}</button>}</>}
      <p className={code.status === 'blocked' ? 'notice' : ''}>{code.status === 'blocked' ? 'Код заблокирован' : 'Код активен'}</p>
      {code.status === 'blocked' && <p>{code.blocked_reason === 'antifraud_ip_burst' ? 'Обнаружено много применений из одной сети. Прежние атрибуции сохранены для проверки.' : 'Код заблокирован вручную.'}</p>}
      {code.status === 'active' && code.unblocked_at && <p>Код разблокирован {new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' }).format(new Date(code.unblocked_at))}: {code.unblock_reason}</p>}
      <ul>{data.statuses.filter(s => s.partner_code_id === code.id).map(s => <li key={`${s.source}-${s.status}`}>
        {sources[s.source]} · {statuses[s.status]}: {s.count}</li>)}</ul>
    </article>)}</>;
}
export function PartnerPanel({ publicOrigin, personal = false, presentation = 'legacy' }: { publicOrigin?: string; personal?: boolean; presentation?: 'legacy' | 'summary' | 'statistics' }) {
  const [baseData, setBaseData] = useState<Dashboard | null>(null), [baseError, setBaseError] = useState('');
  const [data, setData] = useState<Dashboard | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [codes, setCodes] = useState<Dashboard['codes']>([]), [selected, setSelected] = useState('');
  const [code, setCode] = useState(''), [creating, setCreating] = useState(false), [createError, setCreateError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [personalLink, setPersonalLink] = useState<Awaited<ReturnType<PartnerService['ensurePersonalLink']>> | null>(null);
  const [personalError, setPersonalError] = useState(''), [personalAttempt, setPersonalAttempt] = useState(0);
  const manualUrl = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!personal || presentation === 'statistics') return;
    let active = true;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => { reject(new Error('Ссылка не загрузилась вовремя')); controller.abort(); }, 10_000);
    });
    setPersonalLink(null); setPersonalError(''); setCopyMessage('');
    Promise.race([rpc<Awaited<ReturnType<PartnerService['ensurePersonalLink']>>>('partner.ensurePersonalLink', {}, true, undefined, controller.signal), timeout])
      .then(value => { if (active) { setPersonalLink(value); setAttempt(n => n + 1); } })
      .catch(() => { if (active) setPersonalError('Проверьте соединение и попробуйте ещё раз.'); })
      .finally(() => clearTimeout(timer!));
    return () => { active = false; clearTimeout(timer!); controller.abort(); };
  }, [personal, personalAttempt, presentation]);
  const dashboardGeneration = useRef(0);
  const invalidateDashboard = () => { dashboardGeneration.current++; setBaseData(null); setData(null); setBaseError(''); setError(''); };
  const reloadDashboard = () => { invalidateDashboard(); setAttempt(n => n + 1); };
  const selectCode = (value: string) => { invalidateDashboard(); setSelected(value); };
  useEffect(() => {
    if (presentation === 'summary' || (personal && presentation !== 'statistics' && !personalLink)) return;
    let active = true; const generation = ++dashboardGeneration.current, controller = new AbortController();
    const alive = () => active && dashboardGeneration.current === generation;
    setBaseError(''); setError(''); setBaseData(null); setData(null);
    // Identity is authoritative only after this refresh's unfiltered read.
    // A selected-code response cannot authorize personal or campaign copy by itself.
    const load = async () => {
      let base: Dashboard;
      try { base = await rpc<Dashboard>('partner.dashboard', {}, false, undefined, controller.signal); }
      catch (cause) { if (alive()) setBaseError(cause instanceof Error ? cause.message : 'Не удалось загрузить кабинет'); return; }
      if (!alive()) return;
      setBaseData(base); setCodes(base.codes);
      if (!selected) return;
      try {
        const filtered = await rpc<Dashboard>('partner.dashboard', { code_id: selected }, false, undefined, controller.signal);
        if (alive()) setData(filtered);
      } catch (cause) { if (alive()) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить статистику'); }
    };
    void load();
    return () => { active = false; controller.abort(); };
  }, [attempt, selected, personal, personalLink, presentation]);
  const createCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setCreateError('');
    if (!/^[A-Za-z0-9_-]{6,12}$/.test(code)) { setCreateError('Используйте от 6 до 12 латинских букв, цифр, знаков _ или -.'); return; }
    setCreating(true);
    try { await rpc('partner.createCode', { code }, true); setCode(''); setSelected(''); reloadDashboard(); }
    catch (cause) { setCreateError(cause instanceof Error ? cause.message : 'Не удалось создать ссылку'); }
    finally { setCreating(false); }
  };
  const copyLink = async (url: string, target: HTMLTextAreaElement | HTMLAnchorElement | null) => {
    setCopyMessage('');
    try { await navigator.clipboard.writeText(url); setCopyMessage('Ссылка скопирована'); }
    catch {
      setCopyMessage('Не удалось скопировать ссылку. Выделите полный адрес и скопируйте вручную.');
      if (target?.isConnected) {
        target.focus();
        if (target instanceof HTMLTextAreaElement) target.select();
        else {
          const range = document.createRange(); range.selectNodeContents(target);
          const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
        }
      }
    }
  };
  const identity = presentation === 'statistics' ? baseData?.codes[0] : personalLink;
  const personalUrl = identity && publicOrigin ? `${publicOrigin.replace(/\/$/, '')}/r/${identity.code}` : '';
  const blockedPersonalId = personal && identity?.status === 'blocked' ? identity.id : undefined;
  const linkError = presentation === 'statistics' ? baseError : personalError;
  const stats = selected ? data : baseData, statsError = baseError || (selected ? error : '');
  const statsCopy = presentation !== 'statistics' || (identity && !baseError) ? copyLink : undefined;
  return <section className={personal ? 'personal-link-panel' : undefined} aria-labelledby="partner-title">
    <h2 id="partner-title">{personal ? presentation === 'legacy' ? 'Ваша ссылка для подписчиков' : 'Ваша ссылка' : 'Ссылки блогеров'}</h2>
    {personal && <div className="personal-link-card">
      {linkError ? <div role="alert"><h3>Не удалось загрузить ссылку</h3><p>{linkError}</p>
        <button type="button" onClick={() => presentation === 'statistics' ? reloadDashboard() : setPersonalAttempt(n => n + 1)}>Повторить</button></div>
        : identity ? <><label htmlFor="personal-blogger-url">Личная ссылка</label>
          <textarea ref={manualUrl} id="personal-blogger-url" readOnly rows={2} value={personalUrl} onFocus={event => event.currentTarget.select()} />
          <div className="personal-link-actions">{(identity.status === 'active' || presentation === 'legacy') && <button type="button" disabled={identity.status !== 'active' || !personalUrl} onClick={() => copyLink(personalUrl, manualUrl.current)}>Копировать ссылку</button>}
          </div>
          <p className="personal-link-foot">{identity.status === 'blocked' ? 'Ссылка заблокирована' : 'Ссылка активна'} · Создана автоматически</p>
          {identity.status === 'blocked' && <p>Ссылка временно заблокирована. Новые регистрации по ней недоступны. Обратитесь в поддержку; прежняя статистика сохранена.</p>}</>
          : presentation === 'statistics' && baseData ? <p role="status">Личная ссылка пока отсутствует. Откройте кабинет для её создания.</p> : <div role="status"><h3>Загружаем вашу ссылку…</h3><p>Как только она будет готова, здесь появится адрес для подписчиков.</p></div>}
    </div>}
    {presentation === 'summary' && <Link href="/dashboard/partner">Статистика →</Link>}
    <p role="status" aria-live="polite">{copyMessage}</p>
    {presentation === 'legacy' ? <details className="personal-link-statistics" open={personal ? undefined : true}><summary>Статистика и прежние ссылки</summary>
      <p>Статистика за всё время. Отклонённые атрибуции не входят в воронку. Выручка учитывает оплаченные пакеты без возвращённых платежей.</p>
    {!personal && <form onSubmit={createCode}>
      <label htmlFor="blogger-code">Код блогера</label>
      <input id="blogger-code" value={code} onChange={event => setCode(event.target.value)} required minLength={6} maxLength={12}
        pattern={'[A-Za-z0-9_\\-]{6,12}'} autoCapitalize="none" autoCorrect="off" spellCheck={false} aria-describedby="blogger-code-help" />
      <p id="blogger-code-help">6–12 латинских букв, цифр, знаков _ или -.</p>
      <button type="submit" disabled={creating}>{creating ? 'Создаём ссылку…' : 'Создать ссылку'}</button>
      {createError && <p role="alert">{createError}</p>}
    </form>}
<label htmlFor="blogger-filter">Статистика по ссылке</label>
      <select id="blogger-filter" value={selected} onChange={event => selectCode(event.target.value)}>
        <option value="">Все ссылки</option>{codes.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}
      </select>
      {statsError ? <div role="alert"><p>{statsError}</p><button onClick={reloadDashboard}>Повторить</button></div> : stats ? <PartnerSummary data={stats} publicOrigin={publicOrigin} onCopy={statsCopy} blockedPersonalId={blockedPersonalId} /> : <p role="status">Загружаем статистику…</p>}
    </details> : presentation === 'statistics' && <div className="partner-statistics">
      <p>Статистика за всё время. Отклонённые атрибуции не входят в воронку. Выручка учитывает оплаченные пакеты без возвращённых платежей.</p>
      {statsError ? <div role="alert"><p>{statsError}</p><button onClick={reloadDashboard}>Повторить</button></div> : stats ? <>
        <PartnerSummary data={stats} codesVisible={false} primary />
        <p>Подтверждённая выручка пакетов: {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format((stats.counters.revenue_minor ?? 0)/100)}. Это статистика привлечения, не расчёт выплаты.</p>
      </> : <p role="status">Загружаем статистику…</p>}
      <details className="personal-link-statistics"><summary>Дополнительные показатели и ссылки</summary>
<label htmlFor="blogger-filter">Статистика по ссылке</label>
      <select id="blogger-filter" value={selected} onChange={event => selectCode(event.target.value)}>
        <option value="">Все ссылки</option>{codes.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}
      </select>
        {stats && <><p>Клипы, вышедшие наружу: {stats.counters.shared} · приглашённые гости: {stats.counters.guests}</p><PartnerSummary data={stats} countersVisible={false} publicOrigin={publicOrigin} onCopy={statsCopy} blockedPersonalId={blockedPersonalId} /></>}
      </details>
    </div>}</section>;
}
