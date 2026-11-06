import { createHmac } from 'node:crypto';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getBloggerPolicy } from '@clipmaker/db';
import { pageAccount } from '../../../server/page-account';
import { getScreenRuntime } from '../../../server/screen-runtime';
import { PartnerPanel } from '../PartnerPanel';

export default async function DashboardPartnerPage() {
  const account = await pageAccount();
  const { pool, config } = getScreenRuntime();
  const policy = await getBloggerPolicy(pool, account);
  if (policy?.is_blogger !== true) notFound();
  return <div key={createHmac('sha256', config.sessionSecret).update(`partner-owner-v1:${account}`).digest('hex')} className="workspace-partner-page">
    <header className="workspace-title"><h1>Статистика</h1><p>Результаты вашей ссылки за всё время.</p></header>
    <PartnerPanel personal presentation="statistics" publicOrigin={config.publicOrigin} />
    <Link href="/dashboard">← В кабинет</Link>
  </div>;
}
