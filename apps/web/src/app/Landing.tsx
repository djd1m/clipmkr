'use client';
import { useCallback, useRef, useState } from 'react';
import type { Theme } from '../lib/theme';
import { AuthForm } from './AuthForm';
import { LandingCta } from './LandingCta';
import { LandingDemo } from './LandingDemo';
import { ThemeToggle } from './ThemeToggle';

// Только presentation state. AuthForm сообщает производную доступность синхронно до await.
export function Landing({ theme, creditMode = false, referralCode }: { theme: Theme; creditMode?: boolean; referralCode?: string | null }) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [focusRequest, setFocusRequest] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const available = useRef(true);
  const availability = useCallback((value: boolean) => { available.current = value; setBlocked(!value); }, []);
  const requestMode = (value: 'register' | 'login') => {
    if (!available.current) return;
    setMode(value); setFocusRequest(value => value + 1);
  };
  return <div className="public-entry">
    <header className="public-shell public-header"><a className="public-brand" href="/">clipmkr</a>
      <div className="public-header-actions"><ThemeToggle initial={theme} showLabel />
        <button className="public-plain public-header-login" type="button" disabled={blocked} onClick={() => requestMode('login')}>Войти</button></div>
    </header>
    <main className="public-shell">
      <div className="public-hero">
        <section className="public-intro" aria-labelledby="public-promise">
          <p className="public-eyebrow">Из длинной записи — в короткие клипы</p>
          <h1 id="public-promise">Одна запись.<br />Несколько поводов<br />вас услышать.</h1>
          <p className="public-lead">Загрузите подкаст, интервью или вебинар. clipmkr выберет фрагменты и подготовит вертикальные клипы с субтитрами. Вам останется скачать и опубликовать.</p>
          <LandingCta blocked={blocked} onStart={() => requestMode('register')} />
          {creditMode && <p className="public-trial"><strong>30 пробных кредитов после регистрации.</strong><br />Это 30 минут исходной записи: 1 кредит = 60 секунд.</p>}
          <ol className="public-path" aria-label="Как это работает"><li><b>01</b>Загрузите запись</li><li><b>02</b>Получите клипы</li><li><b>03</b>Скачайте</li></ol>
        </section>
        <AuthForm referralCode={referralCode} mode={mode} onModeChange={requestMode} focusRequest={focusRequest} onAvailabilityChange={availability} creditMode={creditMode} />
        <section className="public-example" aria-label="Пример результата"><h2>Пример результата</h2><LandingDemo /><p>Вертикальный кадр 9:16 · Субтитры прямо в видео</p></section>
      </div>
      <section className="public-details" aria-label="Кредиты и ограничения">
        {creditMode && <div><h2>Пробный старт — 30 минут</h2><p>30 кредитов хватит на 30 минут исходной записи. Более длинная запись потребует дополнительного баланса.</p></div>}
        <div><h2>Одна запись — до 90 минут</h2><p>Это предел длительности файла для обычного пользователя. Он не увеличивает пробный баланс.</p></div>
        <div><h2>{creditMode ? 'Дальше — пакеты кредитов' : 'Дальше — в кабинете'}</h2><p>{creditMode ? 'Дополнительные кредиты можно выбрать в кабинете. 1 кредит соответствует 60 секундам исходной записи.' : 'Доступные условия обработки записей можно посмотреть в кабинете.'}</p></div>
      </section>
    </main>
  </div>;
}
