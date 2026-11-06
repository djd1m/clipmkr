'use client';
import { useEffect, useRef, useState } from 'react';
import { MUSIC_CATALOG } from '@clipmaker/shared/music-catalog';
import type { ClipScreen } from '../../lib/screen-contract';
import { rpc } from '../../lib/rpc';
export function ClipMusicChoice({ clip, onQueued, onApplyStart, onFailed, onFeedback, pending = false, resolution }: {
  clip: ClipScreen; onQueued?: (track: string, token?: number) => void;
  onApplyStart?: (track: string, version?: number) => number | null; onFailed?: (token: number) => void;
  onFeedback?: (message: string) => void; pending?: boolean; resolution?: 'current' | 'failure' | 'conflict';
}) {
  const current = (clip.rerendering ? clip.music_track_id : clip.rendered_music_track_id ?? clip.music_track_id) ?? 'auto';
  const [draft, setDraft] = useState(current), [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null), sending = useRef(false), applied = useRef<string | null>(null), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; audio.current?.pause(); }; }, []);
  useEffect(() => {
    if (pending || busy || clip.rerendering) return;
    if (applied.current !== null && resolution) {
      if (resolution === 'current' && draft === applied.current) { setDraft(current); setDirty(false); }
      applied.current = null;
    } else if (!dirty) setDraft(current);
    else if (!clip.rerender_failure && draft === current) setDirty(false);
  }, [current, pending, busy, dirty, draft, clip.rerendering, clip.rerender_failure, resolution]);
  const feedback = (message: string) => { setError(message); onFeedback?.(message); };
  async function apply() {
    if (sending.current || pending || clip.rerendering || !clip.available || draft === current) return;
    const token = onApplyStart?.(draft, clip.render_version);
    if (token === null) { feedback('Состояние клипа изменилось или уточняется. Дождитесь обновления и снова нажмите «Применить музыку».'); return; }
    sending.current = true; setBusy(true); feedback('');
    try {
      await rpc('clip.setMusic', { clip_id: clip.clip_id, track: draft }, true);
      if (!mounted.current) return;
      applied.current = draft; onQueued?.(draft, token);
    } catch (cause) {
      if (!mounted.current) return;
      if (token !== undefined) onFailed?.(token);
      feedback(cause instanceof Error ? cause.message : 'Не удалось сменить музыку');
    } finally { sending.current = false; if (mounted.current) setBusy(false); }
  }
  function play(id: string) {
    const player = audio.current; if (!player) return;
    if (preview === id && !player.paused) { player.pause(); setPreview(null); return; }
    player.src = `/music-previews/${id}.mp3`; setPreview(id);
    void player.play().catch(() => { setPreview(null); feedback('Не удалось проиграть превью'); });
  }
  return <section aria-label="Музыка клипа">
    <label>Музыка: <select value={draft} disabled={!clip.available || busy || pending || clip.rerendering} onChange={event => { setDraft(event.target.value); setDirty(true); }}>
      <option value="auto">Авто</option>{MUSIC_CATALOG.map(track => <option key={track.id} value={track.id}>{track.title} · {track.author}</option>)}
      <option value="none">Без музыки</option>
    </select></label>
    <p className="music-consequences">Изменится только этот клип. При применимом суточном ограничении используется одна пересборка; исключения, в том числе доступ владельца, проверяет сервер. Прежний файл доступен до публикации нового в пределах срока хранения.</p>
    <button type="button" disabled={!clip.available || busy || pending || clip.rerendering || draft === current} onClick={() => void apply()}>Применить музыку</button>
    {(busy || pending || clip.rerendering) && <p role="status">{busy ? 'Отправляем изменение…' : pending ? 'Уточняем состояние пересборки…' : 'Пересобираем…'}</p>}
    {clip.music_skip_reason && <p role="status">{clip.music_skip_reason === 'measure_failed' ? 'Не удалось проверить громкость музыки' : 'Музыка не подошла по громкости'}</p>}
    <details><summary>Послушать треки</summary>{MUSIC_CATALOG.map(track => <p key={track.id}><button type="button" className="secondary" aria-label={`${preview === track.id ? 'Остановить' : 'Послушать'} ${track.title}`} onClick={() => play(track.id)}>{preview === track.id ? '■' : '▶'}</button> {track.title} · {track.author}</p>)}</details>
    <audio ref={audio} preload="none" onEnded={() => setPreview(null)} />
    {error && !onFeedback && <p role="alert">{error}</p>}
  </section>;
}
