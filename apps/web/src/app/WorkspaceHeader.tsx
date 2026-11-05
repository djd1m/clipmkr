import Link from 'next/link';
import type { Theme } from '../lib/theme';
import type { WorkspaceLayout } from '../lib/workspace-layout';
import { WorkspaceSettings } from './WorkspaceSettings';
import { SignOut } from './support/SignOut';

export function WorkspaceHeader({ owner, balanceLabel, initialTheme, initialLayout }: {
  owner: boolean; balanceLabel: string | null; initialTheme: Theme; initialLayout: WorkspaceLayout;
}) {
  return <header className="workspace-head">
    <Link className="workspace-mark" href="/dashboard">clipmkr</Link>
    <nav className="workspace-nav" aria-label="Кабинет">
      <Link href="/dashboard">Новая запись</Link>
      <Link href="/dashboard#recent-records">Мои записи</Link>
      <Link href="/upgrade?from=partner_dashboard">Тарифы</Link>
      {owner && <Link href="/dashboard/bloggers">Блогеры</Link>}
    </nav>
    <p className="workspace-balance">{owner ? <strong>Без лимитов</strong> : balanceLabel === null ? 'Баланс недоступен' : <>Баланс <strong>{balanceLabel}</strong></>}</p>
    <WorkspaceSettings initialTheme={initialTheme} initialLayout={initialLayout} />
    <SignOut />
  </header>;
}
