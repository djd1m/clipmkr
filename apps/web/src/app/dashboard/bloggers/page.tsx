import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { hasOwnerUnlimited } from '@clipmaker/db';
import { getRuntime } from '../../../server/runtime';
import BloggerAdmin from './BloggerAdmin';
export const dynamic = 'force-dynamic';
export default async function BloggersPage() {
  const { auth, pool, config } = getRuntime();
  const token = (await cookies()).get('__Host-n5_session')?.value;
  const session = token ? await auth.authenticate(token) : null;
  if (!session) redirect('/');
  if (!await hasOwnerUnlimited(pool, session.account_id)) redirect('/dashboard');
  return <>{config.payments.mode === 'live' && config.payments.testMode && <p role="status" className="workspace-test">TEST · Тестовые платежи. Реальных списаний нет. Выручка и расчёты — учебные.</p>}<BloggerAdmin /></>;
}
