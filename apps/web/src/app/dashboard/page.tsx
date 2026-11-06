import { createHmac } from 'node:crypto';
import { Fragment } from 'react';
import { getBloggerPolicy } from '@clipmaker/db';
import { erasurePageState } from '../../server/erasure-page';
import { readDashboardSummary } from '../../server/dashboard-summary';
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
  const { screen, config, pool } = getScreenRuntime();
  const [result, remaining, bloggerPolicy] = await Promise.all([screen.list(account, { cursor: cursor.success ? cursor.data : undefined }),
    readDashboardSummary(account), getBloggerPolicy(pool, account)]);
  const personal = bloggerPolicy?.is_blogger === true;
  return <Fragment key={createHmac('sha256', config.sessionSecret).update(`workspace-owner-v1:${account}`).digest('hex')}><div className={`workspace-upload${personal ? ' workspace-personal' : ''}`}>
    <div className="workspace-main"><VideoUploader accountScope={account} recoveryIntent={params.upload === 'recovery'} creditMode={!!remaining.credits} availableSeconds={remaining.credits?.available_seconds} ownerUnlimited={remaining.owner_unlimited} maxSourceSeconds={remaining.max_source_seconds} /></div>
    {personal && <aside className="workspace-aside"><PartnerPanel personal presentation="summary" publicOrigin={config.publicOrigin} /></aside>}
    <div className="workspace-records-region"><VideoList videos={result.videos} nextCursor={result.next_cursor} /></div>
  </div>
    {!personal && <div className="workspace-secondary"><details><summary>Партнёрская программа</summary><PartnerPanel publicOrigin={config.publicOrigin} /></details></div>}
  </Fragment>;
}
