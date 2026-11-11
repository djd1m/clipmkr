import { headers } from 'next/headers';
import { PartnerLandingService } from '../server/partner-landing';
import { readReferralPrefill } from '../server/referral-prefill';
import { getRuntime } from '../server/runtime';
import { Landing } from './Landing';
import { requestTheme } from './theme-server';
export default async function Page() {
  const { config, pool } = getRuntime();
  const referralCode = await readReferralPrefill((await headers()).get('cookie') ?? '', config.sessionSecret, new PartnerLandingService(pool));
  return <Landing creditMode={config.billingMode==='credits_v1'} theme={await requestTheme()} referralCode={referralCode} />;
}
