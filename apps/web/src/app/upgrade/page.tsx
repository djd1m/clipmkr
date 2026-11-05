// Authenticated catalogue remains visible while checkout is unavailable.
import { createHmac } from 'node:crypto';
import { checkoutAllowedForAccount } from '@clipmaker/shared/config';
import { cookies, headers } from 'next/headers';
import { workspaceLayoutFromCookie } from '../../lib/workspace-layout';
import { redirect } from 'next/navigation';
import { readAccountBilling,readCreditBalance,readCreditPurchaseWindows } from '@clipmaker/db';
import { PAID_PLAN_DAYS, PAID_PLAN_TITLE, PAID_PRICE_MINOR, effectivePlan, formatRubles } from '@clipmaker/shared/tariff';
import { readUpgradeFrom } from '../../lib/payment-return';
import { getRuntime } from '../../server/runtime';
import { WorkspaceHeader } from '../WorkspaceHeader';
import { requestTheme } from '../theme-server';
import { UpgradeScreen } from './UpgradeScreen';
export const dynamic = 'force-dynamic';
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { config, pool, auth, payments } = getRuntime();
  const from = readUpgradeFrom((await searchParams).from);
  const login = from ? `/?next=${encodeURIComponent(`/upgrade?from=${from}`)}#auth` : '/#auth';
  const token = (await cookies()).get('__Host-n5_session')?.value;
  const session = token ? await auth.authenticate(token) : null;
  if (!session) redirect(login);
  const billing = await readAccountBilling(pool, session.account_id);
  if (!billing) redirect(login);
  const purchaseWindows=billing.billing_policy==='credits_v1' ? await readCreditPurchaseWindows(pool,session.account_id) : null;
  const balance = await readCreditBalance(pool, session.account_id);
  const balanceLabel = billing.owner_unlimited ? 'Без лимитов' : balance ? `${(balance.available_seconds / 60).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кредитов` : null;
  const plan = billing.effective_plan ?? effectivePlan(billing.plan, billing.plan_source, billing.plan_paid_until, new Date());
  return <div className="workspace-shell"><WorkspaceHeader owner={billing.owner_unlimited === true} balanceLabel={balanceLabel} initialTheme={await requestTheme()} initialLayout={workspaceLayoutFromCookie((await headers()).get('cookie') ?? undefined)} />
    <main className="container"><UpgradeScreen key={createHmac('sha256', config.sessionSecret).update(`checkout-owner-v1:${session.account_id}`).digest('hex')} testMode={config.payments.mode === 'live' && config.payments.testMode} ownerUnlimited={billing.owner_unlimited === true} purchaseWindows={purchaseWindows ?? undefined} creditMode={true} catalogOnly={billing.billing_policy!=='credits_v1'} salesEnabled={checkoutAllowedForAccount(config, session.account_id, billing.billing_policy, !!payments) && config.billingMode==='credits_v1' && billing.billing_policy==='credits_v1'} title={PAID_PLAN_TITLE} price={formatRubles(PAID_PRICE_MINOR)} days={PAID_PLAN_DAYS}
      paidMinutes={config.limits.N5_LIMIT_PAID_USER_MINUTES} current={{ plan, plan_source: billing.plan_source, plan_paid_until: billing.plan_paid_until }} /></main></div>;
}
