import { createHmac } from 'node:crypto';
import Link from 'next/link';
import { headers } from 'next/headers';
import { readAccountBilling } from '@clipmaker/db';
import { pageAccount } from '../../../server/page-account';
import { supportPageState } from '../../../server/support/page-state';
import { getScreenRuntime } from '../../../server/screen-runtime';
import { readDashboardSummary } from '../../../server/dashboard-summary';
import { workspaceLayoutFromCookie } from '../../../lib/workspace-layout';
import { requestTheme } from '../../theme-server';
import { WorkspaceSettings } from '../../WorkspaceSettings';
import { SignOut } from '../../support/SignOut';
import { AccountDeletion } from '../AccountDeletion';
import { LimitsPanel } from '../LimitsPanel';

export default async function DashboardAccountPage() {
  const account = await pageAccount();
  const { pool, config } = getScreenRuntime();
  const [profile, billing, remaining, theme, requestHeaders] = await Promise.all([
    supportPageState(), readAccountBilling(pool, account), readDashboardSummary(account), requestTheme(), headers(),
  ]);
  const identity = profile.account?.id === account ? profile.account : null;
  return <div key={createHmac('sha256', config.sessionSecret).update(`account-owner-v1:${account}`).digest('hex')} className="workspace-account-page">
    <header className="workspace-title"><h1>Аккаунт и настройки</h1><p>Настройки оформления не влияют на баланс, роль или права.</p></header>
    <div className="account-grid"><section>
      <WorkspaceSettings presentation="page" initialTheme={theme} initialLayout={workspaceLayoutFromCookie(requestHeaders.get('cookie') ?? undefined)} />
      <section className="account-access"><h2>Доступ к аккаунту</h2>
        {identity ? <><p>{identity.email}</p><p>{identity.verified ? 'Почта подтверждена' : 'Почта не подтверждена'}</p></> : <p role="alert">Данные доступа недоступны. Обновите страницу; статус почты не определён.</p>}
        {identity && !identity.verified && <Link href="/verify-email">Подтвердить почту</Link>}
        {!profile.mailAvailable && <p>Отправка писем сейчас недоступна.</p>}
        <p><Link href="/forgot">Сменить пароль</Link></p><SignOut />
      </section>
    </section><section><h2>Баланс и помощь</h2>
      {billing ? <p>{billing.owner_unlimited ? 'Доступ владельца: без лимитов.' : billing.effective_plan === 'paid' ? 'Действуют платные функции.' : 'Текущие права: бесплатные функции.'}
        {billing.billing_policy !== 'credits_v1' && ' Сохраняются прежние условия аккаунта.'}</p> : <p role="alert">Текущие права недоступны. Обновите страницу; тариф не определён.</p>}
      {config.payments.mode === 'live' && config.payments.testMode && <p className="workspace-test">TEST · Тестовая оплата</p>}
      <LimitsPanel remaining={remaining} />
      <p><Link href="/support">Поддержка</Link></p>
      <details><summary>Удаление аккаунта</summary><AccountDeletion /></details>
    </section></div>
    <p><Link href="/dashboard">← В кабинет</Link></p>
  </div>;
}
