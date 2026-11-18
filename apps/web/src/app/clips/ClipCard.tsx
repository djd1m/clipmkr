'use client';
import { createPortal } from 'react-dom';
import { revealGuestForm } from './GuestPacks';
import { ClipLayoutChoice } from './ClipLayoutChoice';
import { ClipMusicChoice } from './ClipMusicChoice';
import { ProInterest } from '../dashboard/ProInterest';
import { useEffect, useRef, useState } from 'react';
import { rpc } from '../../lib/rpc';
import type { ClipScreen } from '../../lib/screen-contract';
import { useClipDownload } from './useClipDownload';
import layoutStyles from './clip-layout.module.css';
import { enterClipFullscreen } from '../../../public/clip-fullscreen.js';
/** `onSendToGuest` is passed only while the guest form is on screen (consent text hash present); without it «Гостю» is disabled.
 *  The card never creates a guest pack: consent is given only in the form (ADR-008). */
export function ClipCard({ clip, videoId, layoutActive=true, onLayoutLeaveGuard, onLayoutApplied, onMusicQueued, onMusicApplyStart, onMusicFailed, musicPending = false, musicNotice, musicResolution, contextRoot, onEditClip, onSendToGuest, paymentsOn = false, creditMode=false, selected = true, onSelect }: {
  clip: ClipScreen; videoId?:string; layoutActive?:boolean; onLayoutApplied?: () => void; onLayoutLeaveGuard?:(guard:(()=>boolean)|null)=>void; onMusicQueued?: (track: string, token?: number) => void; onMusicApplyStart?: (track: string, version?: number) => number | null; onMusicFailed?: (token: number) => void; musicPending?: boolean; musicNotice?: string; musicResolution?: 'current' | 'failure' | 'conflict'; onSendToGuest?: (clipId: string) => void; contextRoot?: HTMLElement | null; onEditClip?: (clipId: string | null) => void; paymentsOn?: boolean; creditMode?:boolean; actionsFirst?: boolean; selected?: boolean; onSelect?: (clipId: string) => void;
}) {
  const { download, downloadingId, error } = useClipDownload();
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [previewError, setPreviewError] = useState('');
  const [musicFeedback, setMusicFeedback] = useState('');
  const [context, setContext] = useState<'share' | 'edit' | null>(null);
  const contextRef = useRef<HTMLElement>(null), moreRef = useRef<HTMLDetailsElement>(null);
  const editTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (context && selected) revealGuestForm(contextRef.current, contextRef.current?.querySelector<HTMLElement>('[data-context-body]:not([hidden]) select, [data-context-body]:not([hidden]) button') ?? null, window.matchMedia?.bind(window)); }, [context, selected]);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Selection alone pauses the previous player; preferences and polling never seek or restart it.
  useEffect(() => {
    if (!selected && videoRef.current && !videoRef.current.paused) videoRef.current.pause();
  }, [selected]);
  async function copyLink() {
    setCopying(true); setCopyMessage('');
    try {
      const { url } = await rpc<{ code: string; url: string }>('link.create', { clip_id: clip.clip_id }, true);
      const absolute = new URL(url, window.location.origin).href;
      try { await navigator.clipboard.writeText(absolute); setCopyMessage('Ссылка скопирована'); }
      catch { setCopyMessage(`Скопируйте ссылку вручную: ${absolute}`); }
    } catch (cause) { setCopyMessage(cause instanceof Error ? cause.message : 'Не удалось получить ссылку'); }
    finally { setCopying(false); }
  }
  const fileVersion = String(clip.published_render_version ?? clip.render_version ?? 1);
  const expired = clip.retention_state==='expired' || (!!clip.expires_at && Date.parse(clip.expires_at) <= Date.now());
  const layoutRerender = clip.available && !expired ? clip.layout_rerender_state : undefined;
  const completedVersion = layoutRerender === 'succeeded' ? clip.render_version : undefined;
  const lastCompletedVersion = useRef(completedVersion);
  const [recentCompletion, setRecentCompletion] = useState<number>();
  useEffect(() => {
    if (completedVersion === undefined || completedVersion === lastCompletedVersion.current) return;
    lastCompletedVersion.current = completedVersion;
    setRecentCompletion(completedVersion);
    const timer = setTimeout(() => setRecentCompletion(undefined), 4000);
    return () => clearTimeout(timer);
  }, [completedVersion]);
  const layoutStatus = layoutRerender === 'succeeded' && (completedVersion === undefined || recentCompletion !== completedVersion)
    ? undefined : layoutRerender;
  const layoutLabel = layoutStatus === 'pending' ? 'Обновляем оформление…'
    : layoutStatus === 'succeeded' ? 'Оформление обновлено'
    : layoutStatus === 'failed' ? 'Не удалось обновить оформление' : '';
  function openEditor(trigger: HTMLButtonElement) {
    editTrigger.current = trigger;
    setContext('edit');
    onEditClip?.(clip.clip_id);
  }
  function closePanel() {
    const trigger = editTrigger.current;
    setContext(null);
    onEditClip?.(null);
    if (context === 'edit' && trigger?.isConnected && trigger.getClientRects().length && !trigger.disabled) {
      trigger.focus();
    } else if (moreRef.current) {
      moreRef.current.open = true;
      moreRef.current.querySelector<HTMLElement>('[data-context-choice]')?.focus();
    }
  }
  const scored = clip.score !== undefined && clip.components && clip.explanations ? { score: clip.score, components: clip.components, explanations: clip.explanations } : null;
  const downloadIdle = clip.available && !downloadingId;
  const downloadAction = <div className="clip-actions" role="group" aria-label="Действия с клипом">
    <button disabled={!clip.available || downloadingId !== null} aria-label={downloadIdle ? 'Скачать клип' : undefined} onClick={() => void download(clip.clip_id, clip.title)}>
      {downloadingId ? 'Открываем файл…' : clip.available ? '↓ Скачать' : expired ? 'Срок хранения закончился' : clip.status === 'failed' ? 'Не удалось собрать' : 'Собираем…'}</button>
  </div>;
  const contextual = <section ref={contextRef} className="clip-context" id={`clip-context-${clip.clip_id}`} data-context-clip={clip.clip_id} data-context-kind={context ?? ''} hidden={!context || !selected}>
    <h2>{context === 'edit' ? 'Оформление клипа' : 'Поделиться клипом'}</h2>
    <button type="button" className="secondary" onClick={closePanel}>Закрыть панель</button>
    <div data-context-body hidden={context !== 'share'}><p>Ссылка на клип открывает превью и призыв автора. Гостевой пакет даёт доступ к просмотру и скачиванию.</p>
      <button type="button" className="secondary" disabled={copying} aria-label={copying ? undefined : 'Ссылка на клип — скопировать'} onClick={() => void copyLink()}>{copying ? 'Получаем ссылку…' : 'Копировать ссылку на превью'}</button>
      <button type="button" className="secondary" disabled={!clip.available || !onSendToGuest} aria-label="Отправить клип гостю" onClick={() => onSendToGuest?.(clip.clip_id)}>Отправить гостю</button>
    </div>
    <div data-context-body hidden={context !== 'edit'}>
      {videoId && <ClipLayoutChoice videoId={videoId} clip={clip} active={selected && context==='edit' && layoutActive} onLeaveGuard={onLayoutLeaveGuard} onApplied={onLayoutApplied} />}
      <ClipMusicChoice clip={clip} pending={musicPending} resolution={musicResolution} onApplyStart={onMusicApplyStart} onQueued={onMusicQueued} onFailed={onMusicFailed} onFeedback={setMusicFeedback} />
      {clip.watermarked && <ProInterest creditMode={creditMode} source="clip_card" paymentsOn={paymentsOn} />}
    </div>
  </section>;
  // Порядок и media wrapper одинаковы для полного и частичного результата.
  return <><article className="clip-card workspace-selected-layout studio-clip" data-clip-id={clip.clip_id} data-selected={selected} data-clip-view>
    <header className="clip-heading">
      <div className="eyebrow">ФРАГМЕНТ {String(clip.index).padStart(2, '0')} · {(clip.duration_seconds == null ? clip.end - clip.start : Number(clip.duration_seconds)).toFixed(1)} с</div>
      <h3>{clip.title}</h3>
      <div className={layoutStyles.cardStatus} data-layout-status={layoutStatus}>
        <span role="status" aria-atomic="true">{layoutStatus && <>
          <span className={layoutStyles.cardStatusMark} aria-hidden="true">
            {layoutStatus === 'succeeded' ? '✓' : layoutStatus === 'failed' ? '!' : ''}
          </span>{layoutLabel}
        </>}</span>
        {layoutStatus === 'failed' && <button type="button" className={layoutStyles.cardStatusAction}
          aria-controls={`clip-context-${clip.clip_id}`} aria-expanded={context === 'edit' && selected}
          onClick={event => openEditor(event.currentTarget)}>Открыть редактор</button>}
      </div>
    </header>
    <div className="clip-preview" data-clip-player>{clip.available ? <><video ref={videoRef} key={fileVersion} controls playsInline preload="metadata" onPlay={() => onSelect?.(clip.clip_id)}
      poster={`/api/clips/${clip.clip_id}/thumbnail?v=${fileVersion}`} src={`/api/clips/${clip.clip_id}/file?v=${fileVersion}`} aria-label={clip.title} />
      <button type="button" className="clip-view-close" data-clip-view-close hidden>Закрыть просмотр ×</button></>
      : <p>{expired ? 'Срок хранения закончился' : clip.status === 'failed' ? 'Не удалось собрать клип' : 'Собираем клип…'}</p>}
      {scored && <span className="score-badge" aria-hidden="true">{scored.score}</span>}</div>
    <div className="clip-body">
      {error && <p role="alert">{error}</p>}
      {previewError && <p role="alert">{previewError}</p>}
      {clip.available && !expired && <button type="button" className="secondary clip-view-open" data-open-clip-view
        onClick={event => enterClipFullscreen(event.currentTarget)}>На весь экран</button>}
      {!expired && downloadAction}
      {copyMessage && <p role="status" className="video-id">{copyMessage}</p>}
      {musicFeedback && <p role="alert">{musicFeedback}</p>}
      {musicNotice && <p role="status">{musicNotice}</p>}
      {!clip.expires_at && clip.available && <p className="muted">{clip.retention_state==='unknown' ? 'Дата хранения уточняется' : 'Хранение без ограничения по действующему праву'}</p>}
      {clip.expires_at && <p className="muted">{expired ? 'Срок хранения закончился' : `Доступно до ${new Date(clip.expires_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`}</p>}
      {!expired && clip.rerender_failure && !clip.rerendering && layoutStatus !== 'failed' && <p role="alert">Не удалось пересобрать клип. Предыдущий файл сохранён. Попробуйте ещё раз.</p>}
      <details ref={moreRef} className="clip-secondary"><summary>Ещё</summary>
      <div className="clip-more-actions" hidden={expired}>
        <button type="button" className="secondary" data-context-choice="share" disabled={!clip.available} onClick={() => { setContext('share'); onEditClip?.(null); }}>Поделиться</button>
        <button type="button" className="secondary" data-context-choice="edit" disabled={!clip.available} onClick={event => openEditor(event.currentTarget)}>Изменить оформление</button>
      </div>
      <details className="clip-score-disclosure"><summary>Оценка фрагмента</summary>
      {scored ? <section className="clip-score" aria-label="Оценка фрагмента">
        <p className="score-line"><strong>Оценка {scored.score} из 99</strong></p>
        <p className="score-parts">Цепкость {scored.components.hook} · Самодостаточность {scored.components.completeness} · Длина {scored.components.length}</p>
        <details className="score-why"><summary>Почему такая оценка</summary><dl className="score-details">
          <dt>Цепкость · {scored.components.hook}/33</dt><dd>{scored.explanations.hook}</dd>
          <dt>Самодостаточность · {scored.components.completeness}/33</dt><dd>{scored.explanations.completeness}</dd>
          <dt>Длина · {scored.components.length}/33</dt><dd>{scored.explanations.length}</dd></dl></details></section> : <p>Без оценки</p>}
      </details></details></div></article>
      {!expired && (contextRoot === undefined ? contextual : contextRoot ? createPortal(contextual, contextRoot, clip.clip_id) : null)}
    </>;
}
