'use client';
// Нативный якорь — fallback; presenter выбирает регистрацию и запрашивает фокус без изменения query.
export function LandingCta({ onStart, blocked = false }: { onStart: () => void; blocked?: boolean }) {
  return <a className="landing-cta public-primary" href="#auth" aria-disabled={blocked} onClick={event => {
    event.preventDefault();
    if (blocked) return;
    onStart();
    document.getElementById('auth')?.scrollIntoView({ block: 'start' });
  }}>Начать бесплатно →</a>;
}
