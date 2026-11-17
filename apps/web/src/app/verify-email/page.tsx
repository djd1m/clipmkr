import type { Metadata } from 'next';
import { isCreditSku } from '@clipmaker/shared/tariff';
import { supportPageState } from '../../server/support/page-state';
import { RecoveryForm } from '../support/RecoveryForm';
export const metadata: Metadata = { referrer: 'no-referrer', robots: { index: false, follow: false } };
export default async function Page({ searchParams }: { searchParams: Promise<{ sku?: string }> }) {
  const state = await supportPageState();
  const value = (await searchParams).sku;
  const sku = isCreditSku(value) ? value : undefined;
  return <main className="container support-shell"><RecoveryForm key={(state.account?.id ?? '') + (sku ?? '')} mode="verify"
    account={state.account} mailAvailable={state.mailAvailable} billingSku={sku} /></main>;
}
