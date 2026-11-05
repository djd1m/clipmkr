import { AccountDeletion } from './AccountDeletion';
import { erasurePageState } from '../../server/erasure-page';
import { readDashboardSummary } from '../../server/dashboard-summary';
import { LimitsPanel } from './LimitsPanel';
import { ProInterest } from './ProInterest';
import { PartnerPanel } from './PartnerPanel';
import { z } from 'zod';
import { getScreenRuntime } from '../../server/screen-runtime';
import { pageAccount } from '../../server/page-account';
import { VideoList } from '../videos/VideoList';
import { VideoUploader } from '../upload/Uploader';
export default async function Dashboard({ searchParams }: { searchParams: Promise<{ cursor?: string; upload?: string }> }) {
  if (await erasurePageState()) return null;
  const account = await pageAccount();
  const params = await searchParams;
  const cursor = z.string().uuid().safeParse(params.cursor);
  const { screen, config } = getScreenRuntime();
  const [result, remaining] = await Promise.all([screen.list(account, { cursor: cursor.success ? cursor.data : undefined }),
    readDashboardSummary(account)]);
  return <><div className="workspace-upload">
    <div className="workspace-main"><VideoUploader accountScope={account} recoveryIntent={params.upload === 'recovery'} creditMode={!!remaining.credits} maxSourceSeconds={remaining.max_source_seconds} />
      <VideoList videos={result.videos} nextCursor={result.next_cursor} /></div>
    <aside className="workspace-aside"><LimitsPanel remaining={remaining} /></aside>
  </div><div className="workspace-secondary">
    <details><summary>Тарифы и возможности Pro</summary><ProInterest creditMode={true} source="partner_dashboard" paymentsOn={config.payments.mode !== 'off'} /></details>
    <details><summary>Партнёрская программа</summary><PartnerPanel publicOrigin={config.publicOrigin} /></details>
    <details><summary>Мой аккаунт</summary><AccountDeletion /></details>
    <nav className="support-links" aria-label="Помощь"><a href="/verify-email">Подтвердить почту</a><a href="/support">Поддержка</a></nav>
  </div></>;
}
