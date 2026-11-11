'use client';
import { useEffect, useRef, useState, type Ref } from 'react';
import Link from 'next/link';
import { OriginalSource } from './OriginalSource';
import { useRouter } from 'next/navigation';
import { resetLabel } from '../../../lib/limits-contract';
import { ANALYTICS_READY, observeClips } from '../../../lib/acquisition-analytics';
import { rpc } from '../../../lib/rpc';
import type { VideoScreen, ClipScreen } from '../../../lib/screen-contract';
import { ribbonOf, STEP_STATE_TEXT, type RibbonStep, type StepView } from '../../../lib/progress-ribbon';
import { ClipCard } from '../../clips/ClipCard';
import { GuestPacks, type GuestPreselect } from '../../clips/GuestPacks';
import type { GuestPackSummary } from '../../../lib/guest-contract';
import { VideoCtaForm } from '../CtaFields';
// Фича 29: `video_id` — под «Подробнее» в одной строке со ссылкой назад (не съедает первый экран телефона).
export function VideoHeader({ video, headingRef, storageEnded=false }: { video: VideoScreen; headingRef?: Ref<HTMLHeadingElement>; storageEnded?:boolean }) {
  return <header className="detail-header"><div className="detail-top"><Link href="/dashboard">← Все записи</Link>
    <details className="video-meta"><summary>Подробнее</summary><p className="video-id">video_id: <code>{video.video_id}</code></p></details></div>
    <p className="eyebrow">ВАШ ВЫПУСК</p><h1 ref={headingRef} tabIndex={-1}>{storageEnded ? 'Срок хранения закончился' : video.status === 'done' ? 'Готовые клипы' : 'Клипы записи'}</h1>
    <p className="workspace-result-lead">{video.duration_seconds !== null && `${(video.duration_seconds / 60).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} мин · `}
      {storageEnded ? 'История записи и оценки фрагментов сохранены.' : `${video.clips_done} готово / ${video.clips_total} выбрано. Выберите фрагмент для просмотра.`}</p></header>;
}
type MusicAttempt = { token: number; track: string; baseline: number; phase: 'saving' | 'awaiting' | 'queued' | 'unknown' };
const STEP_MARK: Record<StepView, string> = { done: '✓', running: '◷', silent: '…', failed: '!', pending: '○' };
/** Лента «Загрузка → Расшифровка → Выбор → Монтаж»: состояние каждой стадии — знаком И текстом, не только цветом. */
export function StageRibbon({ steps }: { steps: RibbonStep[] }) {
  return <ol className="progress-ribbon" aria-label="Этапы обработки">{steps.map(step =>
    <li key={step.key} data-view={step.view} aria-current={step.view === 'running' || step.view === 'silent' || step.view === 'failed' ? 'step' : undefined}>
      <span className="step-mark" aria-hidden="true">{STEP_MARK[step.view]}</span><span className="step-label">{step.label}</span>
      {step.detail && <span className="step-detail">{step.detail}</span>}
      <span className="visually-hidden"> — {STEP_STATE_TEXT[step.view]}</span></li>)}</ol>;
}
export function ProgressPanel({ video, onRetry, busy = false, storageEnded=false }: { video: VideoScreen; onRetry?: () => void; busy?: boolean; storageEnded?:boolean }) {
  if(storageEnded && video.status==='done') return <section className="status-panel compact" role="status" data-state="expired"><p>История записи сохранена</p></section>;
  if(video.status==='uploading') return <section className="status-panel" role="status" data-state="uploading">
    <h2>Передача файла не завершена. Обработка ещё не началась</h2>
    <p>Продолжите в исходной вкладке: нужны сохранённая сессия и исходный файл.</p>
    <Link className="button secondary" href="/dashboard?upload=recovery#source-file">Выбрать исходный файл и продолжить загрузку</Link>
  </section>;
  const { tone, steps } = ribbonOf(video);
  const failure = tone === 'failure', success = tone === 'success', silent = tone === 'silent';
  // Готово — лента сворачивается в одну строку: первый экран телефона отдан клипам (FR-GROWTH-001).
  if (success && video.clips_done === video.clips_total && video.clips_done > 0) return <section className="status-panel success compact" role="status" aria-live="polite" data-state={tone}>
    <p><span className="step-mark" aria-hidden="true">✓</span><strong>Клипы готовы</strong> · {video.clips_done} из {video.clips_total}</p></section>;
  return <section className={`status-panel ${tone}`} role={failure ? 'alert' : 'status'} aria-live="polite" data-state={tone}>
    <h2>{video.status === 'done' ? 'Обработка завершена: проверьте доступные клипы' : failure ? 'Обработка не завершена' : silent ? 'Обновляем статус' : 'Выполняется'}</h2>
    <StageRibbon steps={steps} />
    {video.credit_charge_seconds && <p>Объём исходной записи: {video.credit_charge_seconds} секунд · {(video.credit_charge_seconds/60).toLocaleString('ru-RU',{maximumFractionDigits:2})} кредитов. За эту запись — один раз.</p>}
    {failure && video.credit_charge_seconds && !video.retry_after && <Link className="button secondary" href="/upgrade?from=partner_dashboard">Выбрать пакет</Link>}
    <p>{failure ? video.failure_reason ?? 'Не удалось завершить обработку.' : video.stage_label}</p>
    {!failure && !silent && <progress aria-label="Прогресс этапа" max={100} value={video.stage_progress ?? undefined} />}
    {failure && video.retry_after && <p>{Date.parse(video.retry_after) > Date.now() ? 'Лимиты обновятся' : 'Лимиты обновились'} {resetLabel(video.retry_after)}.</p>}
    {/* Кнопка НЕ гасится по предсказанию: `retry_after` — это «когда обновятся лимиты, ЕСЛИ они
        не изменятся», а они меняются (владелец может поднять потолок, слот может вернуться).
        Экран, гасящий кнопку по такому предсказанию, утверждает то, чего не проверял. Решает
        сервер: у него счётчик перед глазами, и при настоящей нехватке он ответит отказом с
        причиной. Заслужено 23.09.2026: потолок подняли, места стало 284 минуты, а кнопка
        оставалась серой до полуночи. */}
    {video.next_action === 'retry' && <button disabled={busy} onClick={onRetry}>
      {busy ? 'Запускаем…' : 'Повторить'}</button>}
    {video.next_action === 'upload' && <Link className="button secondary" href="/dashboard">Загрузить другой файл</Link>}
    {video.next_action === 'tomorrow' && <p>После обновления лимитов можно загрузить файл заново.</p>}
  </section>;
}
export function VideoDetail({ videoId, initialVideo, initialClips, initialPacks = [], consentHash, paymentsOn = false, creditMode=false }: { videoId: string; initialVideo: VideoScreen; initialClips: ClipScreen[]; initialPacks?: GuestPackSummary[]; consentHash?: string; paymentsOn?: boolean; creditMode?:boolean }) {
  const router = useRouter();
  const [originalOpen, setOriginalOpen] = useState(false), [originalHost, setOriginalHost] = useState<HTMLDivElement | null>(null);
  function sourceMode(open: boolean) {
    if(open) document.querySelectorAll<HTMLMediaElement>('.clip-grid video,.clip-grid audio').forEach(node=>node.pause());
    setOriginalOpen(open);
  }
  function selectClip(id: string) { setOriginalOpen(false); setSelectedClipId(id); }
  const [video, setVideo] = useState(initialVideo), [clips, setClips] = useState(initialClips);
  const [error, setError] = useState<string | null>(null), [busy, setBusy] = useState(false);
  const [ctaFeedback, setCtaFeedback] = useState<{ state: 'pending' | 'success' | 'failure'; message: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [guestPreselect, setGuestPreselect] = useState<GuestPreselect | null>(null);
  const [contextHost, setContextHost] = useState<HTMLDivElement | null>(null), [editingClipId, setEditingClipId] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null), guestTrigger = useRef<HTMLElement | null>(null);
  const clipsRef = useRef(clips); clipsRef.current = clips;
  const musicAttempts = useRef(new Map<string, MusicAttempt>()), musicToken = useRef(0);
  const [musicStates, setMusicStates] = useState<Record<string, { pending: boolean; notice: string; resolution?: 'current' | 'failure' | 'conflict' }>>({});
  const refreshRead = useRef<() => void>(() => {});
  const [selectedClipId, setSelectedClipId] = useState<string | null>(() =>
    (initialClips.find(clip => clip.available) ?? initialClips[0])?.clip_id ?? null);
  useEffect(() => {
    const observe = () => observeClips(clips);
    observe(); window.addEventListener(ANALYTICS_READY, observe);
    return () => window.removeEventListener(ANALYTICS_READY, observe);
  }, [clips]);
  // «Гостю» on a card only marks the clip in the guest form; the form stays the one place where consent is given.
  const sendToGuest = consentHash ? (clipId: string) => {
    guestTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setGuestPreselect(p => ({ clip_id: clipId, nonce: (p?.nonce ?? 0) + 1 }));
  } : undefined;
  function closeGuest() {
    const visible = (node: HTMLElement | null): node is HTMLElement => !!node?.isConnected && !!node.getClientRects().length && !node.hasAttribute('disabled');
    const trigger = guestTrigger.current;
    if (trigger?.isConnected) { const details = trigger.closest('details'); if (details) details.open = true; }
    const summary = document.querySelector<HTMLElement>('.clip-card[data-selected=true] > .clip-body > .clip-secondary > summary');
    (visible(trigger) ? trigger : visible(summary) ? summary : headingRef.current)?.focus({ preventScroll: true });
  }
  function applyStart(clipId: string, track: string, shownVersion?: number): number | null {
    const current = clipsRef.current.find(c => c.clip_id === clipId), version = current?.render_version;
    if (!current?.available || current.rerendering || musicAttempts.current.has(clipId) || !Number.isSafeInteger(version) || version! < 1 || version !== shownVersion) {
      refreshRead.current(); return null;
    }
    const token = ++musicToken.current;
    musicAttempts.current.set(clipId, { token, track, baseline: version!, phase: 'saving' });
    setMusicStates(old => ({ ...old, [clipId]: { pending: true, notice: 'Отправляем изменение музыки…' } }));
    return token;
  }
  function musicAcknowledged(clipId: string, token: number | undefined, failed = false) {
    const intent = musicAttempts.current.get(clipId); if (!intent || intent.token !== token) return;
    intent.phase = failed ? 'unknown' : 'awaiting';
    setMusicStates(old => ({ ...old, [clipId]: { pending: true, notice: failed ? 'Результат запроса неизвестен. Проверяем состояние; повтор автоматически не отправляется.' : 'Уточняем состояние пересборки…' } }));
    refreshRead.current();
  }
  useEffect(() => {
    let mounted = true, generation = 0, sequence = 0;
    let inFlight: { generation: number; sequence: number; controller: AbortController } | null = null;
    const poll = async () => {
      if (inFlight || !mounted) return;
      const request = { generation, sequence: ++sequence, controller: new AbortController() }; inFlight = request;
      const alive = () => mounted && generation === request.generation && inFlight === request && sequence === request.sequence;
      try {
        const [next, result] = await Promise.all([rpc<VideoScreen>('video.get', { video_id: videoId }, false, undefined, request.controller.signal),
          rpc<{ clips: ClipScreen[] }>('clip.list', { video_id: videoId }, false, undefined, request.controller.signal)]);
        if (!alive()) return;
        setVideo(next); setClips(result.clips); clipsRef.current = result.clips;
        const updates: Record<string, { pending: boolean; notice: string; resolution?: 'current' | 'failure' | 'conflict' }> = {};
        for (const [id, intent] of musicAttempts.current) {
          if (intent.phase === 'saving') continue; // Pre-ack DTO never acknowledges an Apply.
          const clip = result.clips.find(c => c.clip_id === id);
          if (!clip?.available) { musicAttempts.current.delete(id); updates[id] = { pending: false, notice: 'Клип недоступен. Состояние изменения не подтверждено.' }; continue; }
          const version = clip.render_version;
          if (!Number.isSafeInteger(version) || version! <= intent.baseline) {
            if (intent.phase === 'unknown' && !clip.rerendering && version === intent.baseline) {
              musicAttempts.current.delete(id); updates[id] = { pending: false, notice: 'Изменение не подтверждено. Проверьте клип перед новым явным применением.' };
            }
            continue;
          }
          const actual = (clip.rerendering ? clip.music_track_id : clip.rendered_music_track_id ?? clip.music_track_id) ?? 'auto';
          const conflict = version! > intent.baseline + 1 || (intent.track !== 'auto' && actual !== intent.track && !clip.music_skip_reason && !clip.rerender_failure);
          if (clip.rerendering) {
            intent.phase = 'queued'; updates[id] = { pending: false, notice: conflict ? 'Клип пересобирается. Наблюдается другое изменение; принадлежность операции не подтверждена.' : 'Клип в очереди пересборки. Предыдущий файл пока доступен.' };
          } else {
            musicAttempts.current.delete(id);
            updates[id] = { pending: false, resolution: clip.rerender_failure ? 'failure' : conflict ? 'conflict' : 'current', notice: clip.rerender_failure ? 'Пересборка завершилась отказом. Черновик музыки сохранён; прежний файл доступен в пределах срока хранения.' : conflict ? 'Состояние клипа изменилось другим запросом. Проверьте музыку перед новым применением.' : 'Состояние клипа обновлено. Доступен актуальный опубликованный файл.' };
          }
        }
        if (Object.keys(updates).length) setMusicStates(old => ({ ...old, ...updates }));
        setSelectedClipId(current => result.clips.some(clip => clip.clip_id === current) ? current : (result.clips.find(clip => clip.available) ?? result.clips[0])?.clip_id ?? null);
        setError(null);
      } catch (cause) { if (alive()) setError(cause instanceof Error ? cause.message : 'Связь потеряна'); }
      finally { if (alive()) inFlight = null; }
    };
    refreshRead.current = () => { generation++; inFlight?.controller.abort(); inFlight = null; void poll(); };
    const timer = setInterval(() => { setNow(Date.now()); void poll(); }, 5000);
    return () => { mounted = false; generation++; inFlight?.controller.abort(); inFlight = null; clearInterval(timer); refreshRead.current = () => {}; musicAttempts.current.clear(); };
  }, [videoId]);
  async function retry() {
    setBusy(true); setError(null);
    try { await rpc('video.retry', { video_id: videoId }, true); setVideo(await rpc<VideoScreen>('video.get', { video_id: videoId })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Не удалось повторить'); }
    finally { setBusy(false); router.refresh(); }
  }
  // Local clock also detects silence when polling itself loses the network.
  const shown = video.status !== 'uploading' && video.user_state === 'выполняется' && now - Date.parse(video.updated_at) > 300000
    ? { ...video, no_response: true, stage_label: 'Статус давно не менялся. Обработка может продолжаться — проверяем автоматически.' } : video;
  const storageEnded=video.status==='done' && clips.length>0 && video.clips_done===video.clips_total &&
    clips.every(clip=>clip.status==='done' && (clip.retention_state==='expired' || (!!clip.expires_at && Date.parse(clip.expires_at)<=now)));
  return <><div className="workspace-ready">
    <div className="studio-ready-intro"><VideoHeader video={video} headingRef={headingRef} storageEnded={storageEnded} /><OriginalSource key={videoId} videoId={videoId} status={video.status} open={originalOpen} onOpenChange={sourceMode} viewerHost={originalHost} fallbackFocus={()=>headingRef.current?.focus({preventScroll:true})} /><ProgressPanel storageEnded={storageEnded} video={shown} onRetry={() => void retry()} busy={busy} />
      {error && <p className="notice" role="alert">Не удалось обновить данные: {error}. Повторяем запрос каждые 5 секунд.</p>}
      {video.clips_total > 0 && video.clips_total < 3 && <p className="notice">Найдено фрагментов: {video.clips_total}. Самодостаточных моментов меньше трёх — показываем столько, сколько есть.</p>}
      {video.status === 'done' && video.clips_done < video.clips_total && <p className="notice">Часть клипов не удалось собрать. Готовые клипы доступны для скачивания.</p>}
    </div>
    <section className="clips-section workspace-result-content" aria-label="Ваши клипы">
      {clips.length > 0 && !originalOpen && <p className="workspace-section-label workspace-selected-caption">Выбранный клип</p>}
      <div className="workspace-result-regions" style={!clips.length ? {gridTemplateColumns:"minmax(0,1fr)"} : undefined}>
        <div className="clip-grid studio-clips"><div ref={setOriginalHost} /><div hidden={originalOpen}>{clips.map(clip => <ClipCard creditMode={creditMode} key={clip.clip_id} clip={clip}
          contextRoot={contextHost} onEditClip={setEditingClipId} selected={clip.clip_id === selectedClipId} onSelect={selectClip}
          paymentsOn={paymentsOn} onSendToGuest={sendToGuest}
          musicPending={musicStates[clip.clip_id]?.pending} musicNotice={musicStates[clip.clip_id]?.notice} musicResolution={musicStates[clip.clip_id]?.resolution}
          onMusicApplyStart={(track, version) => applyStart(clip.clip_id, track, version)}
          onMusicFailed={token => musicAcknowledged(clip.clip_id, token, true)}
          onMusicQueued={(_track, token) => musicAcknowledged(clip.clip_id, token)} />)}</div></div>
        <nav className="workspace-clip-list workspace-list" aria-label="Фрагменты" hidden={!clips.length}>
          {clips.length > 0 && <p className="workspace-section-label">Фрагменты</p>}
          {clips.map(clip => <button type="button" key={clip.clip_id} data-select-clip={clip.clip_id}
            aria-current={clip.clip_id === selectedClipId ? 'true' : 'false'} onClick={() => selectClip(clip.clip_id)}>
            <span className="clip-num">{String(clip.index).padStart(2, '0')}</span><span className="clip-selector-title">{clip.title}</span>
            <span className="clip-duration">{(clip.duration_seconds ?? clip.end - clip.start).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} с</span>
          </button>)}
        </nav>
      </div>
      {!clips.length && !originalOpen && <p className="empty">{video.status === 'failed' ? 'Готовых клипов нет.' : video.status === 'done'
        ? 'Готовых клипов нет. Загрузите другую запись, чтобы найти новые фрагменты.' : 'Фрагменты появятся здесь после выделения.'}
        {(video.status === 'done' || video.status === 'failed') && <> <Link href="/dashboard">Загрузить запись</Link></>}</p>}
    </section>
    </div>
    {ctaFeedback && <p data-cta-feedback role={ctaFeedback.state === 'failure' ? 'alert' : 'status'}>{ctaFeedback.message}</p>}
    <div className="workspace-context-host" ref={setContextHost} />
    <section className="video-edit-context" hidden={editingClipId === null || editingClipId !== selectedClipId}><details className="cta-disclosure"><summary>Дополнительные настройки записи</summary>
      <p>При смене вида призыва пересобираются доступные готовые клипы. Истёкшие файлы и исключения суточных лимитов проверяет сервер; старый файл доступен только в пределах срока хранения. Только смена URL не использует пересборку.</p>
      <VideoCtaForm videoId={videoId} initialKind={initialVideo.cta_kind} initialUrl={initialVideo.cta_url} onFeedback={setCtaFeedback} />
    </details></section>
    {consentHash && <GuestPacks videoId={videoId} clips={clips} initialPacks={initialPacks} consentHash={consentHash} preselect={guestPreselect} onClose={closeGuest} />}</>;
}
