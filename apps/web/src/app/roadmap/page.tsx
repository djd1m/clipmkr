import type { Metadata } from 'next';
import Link from 'next/link';
import { ThemeToggle } from '../ThemeToggle';
import { requestTheme } from '../theme-server';
import { PUBLIC_ROADMAP } from './public-roadmap';

export const metadata: Metadata = {
  title: 'Планы Clipmkr',
  description: 'Что Clipmkr планирует и какие возможности уже выпустил.',
};

const sections = [
  ['in-progress', 'В работе'],
  ['planned', 'Запланировано'],
  ['done', 'Готово'],
] as const;

export default async function RoadmapPage() {
  return <>
    <nav className="navigation roadmap-navigation">
      <Link className="brand" href="/">clipmkr</Link>
      <ThemeToggle initial={await requestTheme()} showLabel />
    </nav>
    <main className="container roadmap-shell">
      <Link className="roadmap-back" href="/dashboard/account">← Аккаунт</Link>
      <div className="roadmap-intro">
        <h1>Планы Clipmkr</h1>
        <Link className="button" href="/support?topic=feature" prefetch={false}>Предложить функцию</Link>
      </div>
      {sections.map(([status, label]) => {
        const cards = PUBLIC_ROADMAP.filter(card => card.status === status);
        if (!cards.length) return null;
        return <section key={status} className="roadmap-group" aria-labelledby={`roadmap-${status}`}>
          <h2 id={`roadmap-${status}`}>{label}</h2>
          {cards.map(card => <article key={card.id} id={card.id} className="roadmap-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </article>)}
        </section>;
      })}
    </main>
  </>;
}
