import { erasurePageState } from '../../server/erasure-page';
import { ErasureStatus } from './AccountDeletion';
import { cookies, headers } from 'next/headers';
import { workspaceLayoutFromCookie } from '../../lib/workspace-layout';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { getRuntime } from '../../server/runtime';
import { WorkspaceHeader } from '../WorkspaceHeader';
import { readDashboardSummary } from '../../server/dashboard-summary';
import { requestTheme } from '../theme-server';
export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const erasure = await erasurePageState();
  if (erasure) return <main className="container"><ErasureStatus {...erasure} /></main>;
  const token = (await cookies()).get('__Host-n5_session')?.value;
  const session = token ? await getRuntime().auth.authenticate(token) : null;
  if (!session) redirect('/');
  const remaining = await readDashboardSummary(session.account_id);
  const owner = remaining.owner_unlimited === true;
  const balanceLabel = remaining.credits ? `${(remaining.credits.available_seconds / 60).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кредитов` : null;
  return <div className="workspace-shell"><WorkspaceHeader owner={owner} balanceLabel={balanceLabel}
    initialTheme={await requestTheme()} initialLayout={workspaceLayoutFromCookie((await headers()).get('cookie') ?? undefined)} />
    <main className="container">{children}</main></div>;
}
