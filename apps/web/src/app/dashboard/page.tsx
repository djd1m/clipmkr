import { AccountDeletion } from './AccountDeletion';
import { erasurePageState } from '../../server/erasure-page';
import { remainingLimits } from '../../server/limits';
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
  const { screen, pool, config } = getScreenRuntime();
  const [result, remaining] = await Promise.all([screen.list(account, { cursor: cursor.success ? cursor.data : undefined }),
    remainingLimits(pool, config.limits, account)]);
  return <><nav className="support-links" aria-label="Помощь"><a href="/verify-email">Подтвердить почту</a><a href="/support">Поддержка</a></nav><VideoUploader accountScope={account} recoveryIntent={params.upload === 'recovery'} creditMode={!!remaining.credits} maxSourceSeconds={remaining.max_source_seconds} /><LimitsPanel remaining={remaining} /><ProInterest creditMode={true} source="partner_dashboard" paymentsOn={config.payments.mode !== 'off'} /><PartnerPanel publicOrigin={config.publicOrigin} /><VideoList videos={result.videos} nextCursor={result.next_cursor} /><AccountDeletion /></>;
}
