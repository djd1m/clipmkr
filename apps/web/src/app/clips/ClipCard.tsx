'use client';
import { ClipMusicChoice } from './ClipMusicChoice';
import { ProInterest } from '../dashboard/ProInterest';
import { useEffect, useRef, useState } from 'react';
import { rpc } from '../../lib/rpc';
import type { ClipScreen } from '../../lib/screen-contract';
import { useClipDownload } from './useClipDownload';
/** `onSendToGuest` is passed only while the guest form is on screen (consent text hash present); without it «Гостю» is disabled.
 *  The card never creates a guest pack: consent is given only in the form (ADR-008). */
export function ClipCard({ clip, onMusicQueued, onSendToGuest, paymentsOn = false, creditMode=false, actionsFirst = false, selected = true, onSelect }: {
  clip: ClipScreen; onMusicQueued?: (track: string) => void; onSendToGuest?: (clipId: string) => void; paymentsOn?: boolean; creditMode?:boolean; actionsFirst?: boolean; selected?: boolean; onSelect?: (clipId: string) => void;
}) {
  const { download, downloadingId, error } = useClipDownload();
  const [copying, setCopying] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const [previewError, setPreviewError] = useState('');
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
  const expired = !!clip.expires_at && Date.parse(clip.expires_at) <= Date.now();
  const scored = clip.score !== undefined && clip.components && clip.explanations ? { score: clip.score, components: clip.components, explanations: clip.explanations } : null;
  const downloadIdle = clip.available && !downloadingId;
  const actions = <div className="clip-actions" role="group" aria-label="Действия с клипом">
        {onSelect && <button type="button" disabled={!clip.available} onClick={() => {
          onSelect(clip.clip_id); setPreviewError('');
          videoRef.current?.focus({ preventScroll: true });
          void videoRef.current?.play().catch(() => setPreviewError('Не удалось начать просмотр. Попробуйте кнопку воспроизведения на видео.'));
        }}>Просмотр</button>}
        <button className={onSelect ? 'secondary' : undefined} disabled={!clip.available || downloadingId !== null} aria-label={downloadIdle ? 'Скачать клип' : undefined} onClick={() => void download(clip.clip_id, clip.title)}>
          {downloadingId ? 'Открываем файл…' : clip.available ? '↓ Скачать' : expired ? 'Срок хранения истёк' : clip.status === 'failed' ? 'Не удалось собрать' : 'Собираем…'}</button>
        <button className="secondary" disabled={copying} aria-label={copying ? undefined : 'Ссылка на клип — скопировать'} onClick={() => void copyLink()}>
          {copying ? 'Получаем ссылку…' : 'Ссылка'}</button>
        <button type="button" className="secondary" disabled={!clip.available || !onSendToGuest} aria-label="Отправить клип гостю"
          onClick={() => onSendToGuest?.(clip.clip_id)}>Гостю</button>
      </div>;
  // Partial render keeps usable actions ahead of the preview; other cards retain feature 26 order.
  // Order (feature 26): frame with score plate → actions → title → components and «why» → retention → music → Pro.
  return <article className="clip-card workspace-selected-layout studio-clip" data-clip-id={clip.clip_id} data-selected={selected}>
    {actionsFirst && actions}
    <div className="clip-preview">{clip.available ? <video ref={videoRef} key={fileVersion} controls playsInline preload="metadata" onPlay={() => onSelect?.(clip.clip_id)}
      poster={`/api/clips/${clip.clip_id}/thumbnail?v=${fileVersion}`} src={`/api/clips/${clip.clip_id}/file?v=${fileVersion}`} aria-label={clip.title} />
      : <p>{expired ? 'Срок хранения истёк' : clip.status === 'failed' ? 'Не удалось собрать клип' : 'Собираем клип…'}</p>}
      {scored && <span className="score-badge" aria-hidden="true">{scored.score}</span>}</div>
    <div className="clip-body">
      {!actionsFirst && actions}
      {copyMessage && <p role="status" className="video-id">{copyMessage}</p>}
      {error && <p role="alert">{error}</p>}
      {previewError && <p role="alert">{previewError}</p>}
      <div className="eyebrow">ФРАГМЕНТ {String(clip.index).padStart(2, '0')} · {(clip.duration_seconds == null ? clip.end - clip.start : Number(clip.duration_seconds)).toFixed(1)} с</div>
      <h3>{clip.title}</h3>
      {clip.expires_at && <p className="muted">{expired ? 'Файл больше недоступен' : `Хранится до ${new Date(clip.expires_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК`}</p>}
      {clip.rerender_failure && !clip.rerendering && <p role="alert">Не удалось пересобрать клип. Предыдущий файл сохранён. Попробуйте ещё раз.</p>}
      <details className="clip-secondary"><summary>Оценка и настройки клипа</summary>
      {scored ? <section className="clip-score" aria-label="Оценка фрагмента">
        <p className="score-line"><strong>Оценка {scored.score} из 99</strong></p>
        <p className="score-parts">Цепкость {scored.components.hook} · Самодостаточность {scored.components.completeness} · Длина {scored.components.length}</p>
        <details className="score-why"><summary>Почему такая оценка</summary><dl className="score-details">
          <dt>Цепкость · {scored.components.hook}/33</dt><dd>{scored.explanations.hook}</dd>
          <dt>Самодостаточность · {scored.components.completeness}/33</dt><dd>{scored.explanations.completeness}</dd>
          <dt>Длина · {scored.components.length}/33</dt><dd>{scored.explanations.length}</dd></dl></details></section> : <p>Без оценки</p>}
      <ClipMusicChoice clip={clip} onQueued={onMusicQueued} />
      {clip.watermarked && <ProInterest creditMode={creditMode} source="clip_card" paymentsOn={paymentsOn} />}</details></div></article>;
}
