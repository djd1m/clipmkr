'use client';
import { useEffect, useState, useRef, type FormEvent } from 'react';
import { rpc } from '../../lib/rpc';
import type { PartnerService } from '../../server/partner';
type ServiceDashboard = Awaited<ReturnType<PartnerService['dashboard']>>;
type Dashboard = Omit<ServiceDashboard, 'counters'> & { counters: ServiceDashboard['counters'] & { purchases?: number; revenue_minor?: number } };
const labels = { visits: 'Переходы', registrations: 'Регистрации', uploaded: 'Загруженные записи', shared: 'Клипы, вышедшие наружу', guests: 'Приглашённые гости' };
const statuses = { pending: 'Ожидают первого выпуска', activated: 'Первый выпуск готов', rejected: 'Отклонены', partner_deleted: 'Партнёр удалён' };
const sources = { explicit: 'Явный код', guest_link: 'Гостевая ссылка', cookie: 'Переход по ссылке' };
export function PartnerSummary({ data, publicOrigin, onCopy, blockedPersonalId }: { data: Dashboard; publicOrigin?: string; onCopy?: (url: string, target: HTMLAnchorElement | null) => void; blockedPersonalId?: string }) {
  return <><dl className="partner-counters">{Object.entries(labels).map(([key, label]) =>
    <div key={key}><dt>{label}</dt><dd>{data.counters[key as keyof typeof labels]}</dd></div>)}
    <div><dt>Покупки пакетов</dt><dd>{data.counters.purchases ?? 0}</dd></div>
    <div><dt>Выручка до комиссии</dt><dd>{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format((data.counters.revenue_minor ?? 0) / 100)}</dd></div></dl>
    {!data.codes.length && <p className="empty">У вас пока нет ссылок блогеров. Создайте первую ссылку с помощью формы выше.</p>}
    {data.codes.map(code => <article className="partner-code" key={code.id}><h3>{code.code}</h3>
      {publicOrigin && <><p><a style={{ overflowWrap: 'anywhere' }} href={`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`}>{`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`}</a></p>
        {onCopy && code.id !== blockedPersonalId && <button type="button" onClick={event => onCopy(`${publicOrigin.replace(/\/$/, '')}/r/${code.code}`, event.currentTarget.parentElement?.querySelector('a') ?? null)}>Копировать ссылку {code.code}</button>}</>}
      <p className={code.status === 'blocked' ? 'notice' : ''}>{code.status === 'blocked' ? 'Код заблокирован' : 'Код активен'}</p>
      {code.status === 'blocked' && <p>{code.blocked_reason === 'antifraud_ip_burst' ? 'Обнаружено много применений из одной сети. Прежние атрибуции сохранены для проверки.' : 'Код заблокирован вручную.'}</p>}
      {code.status === 'active' && code.unblocked_at && <p>Код разблокирован {new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' }).format(new Date(code.unblocked_at))}: {code.unblock_reason}</p>}
      <ul>{data.statuses.filter(s => s.partner_code_id === code.id).map(s => <li key={`${s.source}-${s.status}`}>
        {sources[s.source]} · {statuses[s.status]}: {s.count}</li>)}</ul>
    </article>)}</>;
}
export function PartnerPanel({ publicOrigin, personal = false }: { publicOrigin?: string; personal?: boolean }) {
  const [data, setData] = useState<Dashboard | null>(null), [error, setError] = useState(''), [attempt, setAttempt] = useState(0);
  const [codes, setCodes] = useState<Dashboard['codes']>([]), [selected, setSelected] = useState('');
  const [code, setCode] = useState(''), [creating, setCreating] = useState(false), [createError, setCreateError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');
  const [personalLink, setPersonalLink] = useState<Awaited<ReturnType<PartnerService['ensurePersonalLink']>> | null>(null);
  const [personalError, setPersonalError] = useState(''), [personalAttempt, setPersonalAttempt] = useState(0);
  const manualUrl = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (!personal) return;
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
  }, [personal, personalAttempt]);
  const reloadDashboard = () => setAttempt(n => n + 1);
  useEffect(() => {
    if (personal && !personalLink) return;
    let active = true; setError(''); setData(null);
    rpc<Dashboard>('partner.dashboard', selected ? { code_id: selected } : {}).then(value => {
      if (active) { setData(value); if (!selected) setCodes(value.codes); }
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Не удалось загрузить кабинет'); });
    return () => { active = false; };
  }, [attempt, selected, personal, personalLink]);
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
  const personalUrl = personalLink && publicOrigin ? `${publicOrigin.replace(/\/$/, '')}/r/${personalLink.code}` : '';
  const blockedPersonalId = personal && personalLink?.status === 'blocked' ? personalLink.id : undefined;
  return <section className={personal ? 'personal-link-panel' : undefined} aria-labelledby="partner-title">
    <h2 id="partner-title">{personal ? 'Ваша ссылка для подписчиков' : 'Ссылки блогеров'}</h2>
    {personal && <div className="personal-link-card">
      {personalError ? <div role="alert"><h3>Не удалось загрузить ссылку</h3><p>{personalError}</p>
        <button type="button" onClick={() => setPersonalAttempt(n => n + 1)}>Повторить</button></div>
        : personalLink ? <><label htmlFor="personal-blogger-url">Личная ссылка</label>
          <textarea ref={manualUrl} id="personal-blogger-url" readOnly rows={2} value={personalUrl} onFocus={event => event.currentTarget.select()} />
          <button type="button" disabled={personalLink.status !== 'active' || !personalUrl} onClick={() => copyLink(personalUrl, manualUrl.current)}>Копировать ссылку</button>
          <p className="personal-link-foot">{personalLink.status === 'blocked' ? 'Ссылка заблокирована' : 'Ссылка активна'} · Создана автоматически</p>
          {personalLink.status === 'blocked' && <p>Ссылка временно заблокирована. Новые регистрации по ней недоступны. Обратитесь в поддержку; прежняя статистика сохранена.</p>}</>
          : <div role="status"><h3>Загружаем вашу ссылку…</h3><p>Как только она будет готова, здесь появится адрес для подписчиков.</p></div>}
    </div>}
    <p role="status" aria-live="polite">{copyMessage}</p>
    <details className="personal-link-statistics" open={personal ? undefined : true}><summary>Статистика и прежние ссылки</summary>
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
    <select id="blogger-filter" value={selected} onChange={event => setSelected(event.target.value)}>
      <option value="">Все ссылки</option>{codes.map(item => <option key={item.id} value={item.id}>{item.code}</option>)}
    </select>
    {error ? <div role="alert"><p>{error}</p><button onClick={reloadDashboard}>Повторить</button></div>
      : data ? <PartnerSummary data={data} publicOrigin={publicOrigin} onCopy={copyLink} blockedPersonalId={blockedPersonalId} /> : <p role="status">Загружаем статистику…</p>}</details></section>;
}
