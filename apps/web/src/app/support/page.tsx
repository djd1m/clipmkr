import type { Metadata } from 'next';
import Link from 'next/link';
import { supportPageState } from '../../server/support/page-state';
import { SupportPanel } from './SupportPanel';
import { SignOut } from './SignOut';
import { ThemeToggle } from '../ThemeToggle';
import { requestTheme } from '../theme-server';
export const metadata: Metadata = { referrer: 'no-referrer', robots: { index: false, follow: false } };
export default async function SupportPage({ searchParams }: { searchParams: Promise<{ videoId?: string; topic?: string }> }) {
  const state = await supportPageState(), { videoId, topic } = await searchParams;
  if (topic === 'feature') return <>
    <nav className="navigation roadmap-navigation">
      <Link className="brand" href="/">clipmkr</Link>
      <ThemeToggle initial={await requestTheme()} showLabel />
    </nav>
    <main className="container roadmap-shell">
      <Link className="button secondary" href="/roadmap">← Планы Clipmkr</Link>
      <h1 className="roadmap-proposal-title">Предложить функцию</h1>
      <SupportPanel support={state.support} account={state.account} featureProposal />
    </main>
  </>;
  return <main className="container support-shell"><h1>Поддержка и доступ</h1>
    <SupportPanel support={state.support} account={state.account} videoId={videoId} />
    <section className="auth-card support-card"><h2>Помощь с аккаунтом</h2><nav className="support-links" aria-label="Помощь с аккаунтом"><a href="/verify-email">Подтвердить почту</a><a href="/forgot">Забыли пароль?</a><a href="/#auth">Войти</a><a href="/dashboard">Кабинет</a>{state.operator && <a href="/admin/support/accounts">Диагностика аккаунтов</a>}</nav>{state.account && <SignOut />}</section>
  </main>;
}
