import Link from 'next/link';
import type { Theme } from '../lib/theme';
import type { WorkspaceLayout } from '../lib/workspace-layout';

export function WorkspaceHeader({ owner, balanceLabel }: {
  owner: boolean; balanceLabel: string | null; initialTheme: Theme; initialLayout: WorkspaceLayout;
}) {
  return <header className="workspace-head">
    <Link className="workspace-mark" href="/dashboard">clipmkr</Link>
    <nav className="workspace-nav" aria-label="Кабинет">
      <Link href="/dashboard">Новая запись</Link>
      <Link href="/dashboard#recent-records">Мои записи</Link>
      {owner && <Link href="/dashboard/bloggers">Блогеры</Link>}
    </nav>
    <p className="workspace-balance">{owner ? <strong>Без лимитов</strong> : <Link aria-label="Тарифы" href="/upgrade?from=partner_dashboard">{balanceLabel === null ? 'Баланс недоступен' : <strong>{balanceLabel}</strong>} · Пакеты</Link>}</p>
    <Link className="workspace-account-link" href="/dashboard/account">Аккаунт</Link>
  </header>;
}
