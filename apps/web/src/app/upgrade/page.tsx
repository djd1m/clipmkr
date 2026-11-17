// Authenticated catalogue remains visible while checkout is unavailable.
import { checkoutAllowedForAccount } from '@clipmaker/shared/config';
import { cookies, headers } from 'next/headers';
import { workspaceLayoutFromCookie } from '../../lib/workspace-layout';
import { redirect } from 'next/navigation';
import { readAccountBilling,readCreditBalance,readCreditPurchaseWindows } from '@clipmaker/db';
import { PAID_PLAN_DAYS, PAID_PLAN_TITLE, PAID_PRICE_MINOR, effectivePlan, formatRubles, isCreditSku } from '@clipmaker/shared/tariff';
import { readUpgradeFrom, selectedPackagePath } from '../../lib/payment-return';
import { checkoutOwnerScope } from '../../server/billing-deps';
import { getRuntime } from '../../server/runtime';
import { WorkspaceHeader } from '../WorkspaceHeader';
import { requestTheme } from '../theme-server';
import { UpgradeScreen } from './UpgradeScreen';
export const dynamic = 'force-dynamic';
export default async function UpgradePage({ searchParams }: { searchParams: Promise<{ from?: string; sku?: string }> }) {
  const { config, pool, auth, payments } = getRuntime();
  const params = await searchParams;
  const from = readUpgradeFrom(params.from), sku = isCreditSku(params.sku) ? params.sku : undefined;
  const next = sku ? selectedPackagePath(sku) : from ? `/upgrade?from=${from}` : null;
  const login = next ? `/?next=${encodeURIComponent(next)}#auth` : '/#auth';
  const token = (await cookies()).get('__Host-n5_session')?.value;
  const session = token ? await auth.authenticate(token) : null;
  if (!session) redirect(login);
  const billing = await readAccountBilling(pool, session.account_id);
  if (!billing) redirect(login);
  const purchaseWindows=billing.billing_policy==='credits_v1' ? await readCreditPurchaseWindows(pool,session.account_id) : null;
  const balance = await readCreditBalance(pool, session.account_id);
  const balanceLabel = billing.owner_unlimited ? 'Без лимитов' : balance ? `${(balance.available_seconds / 60).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} кредитов` : null;
  const plan = billing.effective_plan ?? effectivePlan(billing.plan, billing.plan_source, billing.plan_paid_until, new Date());
  const owner = checkoutOwnerScope(config.sessionSecret, session.account_id);
  const salesEnabled = checkoutAllowedForAccount(config, session.account_id, billing.billing_policy, !!payments) &&
    config.billingMode === 'credits_v1' && billing.billing_policy === 'credits_v1';
  const displayEmail = sku && salesEnabled && purchaseWindows && !billing.owner_unlimited ? billing.email : undefined;
  return <div className="workspace-shell"><WorkspaceHeader owner={billing.owner_unlimited === true} balanceLabel={balanceLabel} initialTheme={await requestTheme()} initialLayout={workspaceLayoutFromCookie((await headers()).get('cookie') ?? undefined)} />
    <main className="container"><UpgradeScreen key={owner + (sku ?? '')} checkoutOwner={owner} selectedSku={sku} email={displayEmail} emailVerified={billing.email_verified} mailAvailable={config.mail.mode !== 'disabled'} testMode={config.payments.mode === 'live' && config.payments.testMode} ownerUnlimited={billing.owner_unlimited === true} purchaseWindows={purchaseWindows ?? undefined} creditMode={true} catalogOnly={billing.billing_policy!=='credits_v1'} salesEnabled={salesEnabled} title={PAID_PLAN_TITLE} price={formatRubles(PAID_PRICE_MINOR)} days={PAID_PLAN_DAYS}
      paidMinutes={config.limits.N5_LIMIT_PAID_USER_MINUTES} current={{ plan, plan_source: billing.plan_source, plan_paid_until: billing.plan_paid_until }} /></main></div>;
}
