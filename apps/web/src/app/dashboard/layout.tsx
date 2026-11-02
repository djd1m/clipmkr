import { hasOwnerUnlimited } from '@clipmaker/db';
import { erasurePageState } from '../../server/erasure-page';
import { ErasureStatus } from './AccountDeletion';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { getRuntime } from '../../server/runtime';
import { SignOut } from '../support/SignOut';
import { ThemeToggle } from '../ThemeToggle';
import { requestTheme } from '../theme-server';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const erasure = await erasurePageState();
  if (erasure) return <main className="container"><ErasureStatus {...erasure} /></main>;
  const token = (await cookies()).get('__Host-n5_session')?.value;
  const session = token ? await getRuntime().auth.authenticate(token) : null;
  if (!session) redirect('/');
  const owner = await hasOwnerUnlimited(getRuntime().pool, session.account_id);
  return <><nav className="navigation"><Link className="brand" href="/dashboard"><span>◧</span> КлипМейкер</Link><Link href="/dashboard">Мои записи</Link><Link href="/upgrade?from=partner_dashboard">Тарифы</Link>{owner && <Link href="/dashboard/bloggers">Блогеры</Link>}<SignOut /><ThemeToggle initial={await requestTheme()} /></nav><main className="container">{children}</main></>;
}
