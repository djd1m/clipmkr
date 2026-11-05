'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetLabel, type RemainingLimits } from '../../lib/limits-contract';

export function LimitsPanel({ remaining }: { remaining: RemainingLimits }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [router]);
  const credits = remaining.credits;
  const credit = (n: number) => (n / 60).toLocaleString('ru-RU', { maximumFractionDigits: 2 });
  return <section className="limits-panel workspace-side" aria-label={remaining.owner_unlimited ? 'Без лимитов' : credits ? 'Баланс кредитов' : 'Осталось на сегодня'}>
    <dl className="workspace-limit-summary"><div><dt>{credits && !remaining.owner_unlimited ? 'Доступно кредитов' : 'Доступно'}</dt><dd>{remaining.owner_unlimited ? 'Без лимитов' : credits ? `${credit(credits.available_seconds)} кредитов` : `${remaining.minutes} мин сегодня`}</dd></div>
      <div><dt>Лимит файла</dt><dd>{remaining.max_source_seconds === undefined ? 'Уточняется' : `${Math.floor(remaining.max_source_seconds / 60)} минут`}</dd></div></dl>
    <p>Баланс и длительность одной записи — разные ограничения.</p>
    {!remaining.owner_unlimited && <a className="button secondary" href="/upgrade?from=partner_dashboard">Выбрать пакет</a>}
    <details className="workspace-quota-details"><summary>Подробности баланса и квот</summary>
      {remaining.owner_unlimited ? <><p>Загрузки, минуты обработки, выделения и пересборки — без дневных лимитов и списания кредитов.</p>
        <p>Доступны возможности Pro. Сохраняются ограничения размера и длительности файла, очередь обработки и доступность сервиса.</p></> : <>
        {credits && <><dl><div><dt>Зарезервировано кредитов</dt><dd>{credit(credits.reserved_seconds)}</dd></div>
          <div><dt>Часов обычной записи</dt><dd>{(credits.available_seconds / 3600).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}</dd></div></dl>
          {!!credits.recovery_seconds && <p>Ещё {credit(credits.recovery_seconds)} кредитов восстановлено на 24 часа только для повтора исходной записи.</p>}
          <p>1 кредит = 60 секунд исходной записи. Списание посекундное, за запись один раз.</p>
          <p>{credits.next_expiry ? `Ближайшее окончание пакета: ${resetLabel(credits.next_expiry)}.` : 'Бонусные кредиты не сгорают.'}</p></>}
        <p>Операционные ограничения: загрузок {remaining.uploads}, минут обработки {remaining.minutes}, выделений и повторов {remaining.selections} на сегодня.</p>
        <p>Первое выделение и каждый повтор используют один и тот же остаток. Лимиты обновятся {resetLabel(remaining.resets_at)}. Остатки обновляются каждые 30 секунд.{credits ? ' Кредиты автоматически не пополняются.' : ''}</p>
      </>}
    </details>
  </section>;
}
