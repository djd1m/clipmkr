'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { OriginalSourceMetadata } from '../../../server/original-file';
import styles from './OriginalSource.module.css';

type ReadState = OriginalSourceMetadata | { state: 'loading' | 'limited' };
function validMetadata(value: unknown, videoId: string): value is OriginalSourceMetadata {
  if (!value || typeof value !== 'object') return false;
  const dto = value as OriginalSourceMetadata;
  if (dto.videoId !== videoId) return false;
  if (dto.state !== 'ready') return dto.available === false && ({incomplete:'upload_incomplete',missing:'source_missing',error:'temporarily_unavailable'} as const)[dto.state] === dto.unavailableReason && ['incomplete','missing','error'].includes(dto.state);
  return dto.available === true && typeof dto.sourceRevision === 'string' && !!dto.media &&
    ['video','audio','unknown'].includes(dto.media.kind) && typeof dto.media.mime === 'string' &&
    ['mp4','m4a','mov','webm','mp3','bin'].includes(dto.media.extension) && /^\d+$/.test(dto.media.bytes) &&
    (dto.media.durationSeconds === null || (typeof dto.media.durationSeconds === 'number' && Number.isFinite(dto.media.durationSeconds) && dto.media.durationSeconds >= 0));
}
const stateText = { loading:'Проверяем исходник…', incomplete:'Передача исходника не завершена', missing:'Исходный файл недоступен', error:'Не удалось проверить исходник', limited:'Слишком много запросов. Повторите через минуту' };
function duration(seconds: number | null): string {
  if (seconds === null) return '';
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2,'0')}`;
}
export function OriginalSource({ videoId, status, open, onOpenChange, viewerHost, fallbackFocus }: {
  videoId: string; status: string; open: boolean; onOpenChange: (open: boolean) => void; viewerHost: HTMLElement | null; fallbackFocus: () => void;
}) {
  const [source, setSource] = useState<ReadState>({state:'loading'});
  const [playback, setPlayback] = useState<'idle'|'trying'|'checking'|'failed'|'unsupported'>('idle');
  const [attempt, setAttempt] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null), back = useRef<HTMLButtonElement>(null), media = useRef<HTMLMediaElement | null>(null);
  const generation = useRef(0), controller = useRef<AbortController | null>(null), failedAttempt = useRef(false);
  const priorStatus = useRef(status), lastSettled = useRef<ReadState>({state:'loading'}), resume = useRef<{time:number;paused:boolean}|null>(null);
  const active = useRef(open); active.current = open;
  const endpoint = `/api/videos/${encodeURIComponent(videoId)}/original`;
  const read = useCallback(async () => {
    controller.current?.abort(); const abort = new AbortController(); controller.current = abort; const current = ++generation.current;
    setSource({state:'loading'});
    let value: ReadState;
    try {
      const response = await fetch(`${endpoint}?metadata=1`, { signal: AbortSignal.any([abort.signal,AbortSignal.timeout(15000)]), cache:'no-store', credentials:'same-origin' });
      if(response.status===404) value={videoId,state:'missing',available:false,unavailableReason:'source_missing'};
      else if(response.status===429) value={state:'limited'};
      else { const dto: unknown = await response.json(); if(!response.ok || !validMetadata(dto,videoId))throw Error('Invalid source metadata'); value=dto; }
    } catch { value={videoId,state:'error',available:false,unavailableReason:'temporarily_unavailable'}; }
    if(!abort.signal.aborted && generation.current===current){lastSettled.current=value;setSource(value);return value;}
  },[endpoint,videoId]);
  useEffect(()=>{void read(); return()=>{generation.current++;controller.current?.abort();};},[read]);
  // A stale main-video upload status must not replace an error check of an already confirmed source.
  useEffect(()=>{if(priorStatus.current==='uploading' && status!=='uploading' && lastSettled.current.state!=='ready')void read();priorStatus.current=status;},[status,read]);
  const stop = useCallback(() => {
    const node=media.current; if(!node)return;
    // Ignore native abort/error emitted by our own unload.
    media.current=null; node.pause(); node.removeAttribute('src'); node.load();
  },[]);
  const attachMedia = useCallback((node: HTMLMediaElement | null) => {if(!node)stop();media.current=node;},[stop]);
  useEffect(()=>()=>stop(),[stop]);
  useEffect(()=>{if(open)back.current?.focus({preventScroll:true});else{resume.current=null;failedAttempt.current=false;stop();}},[open,stop]);
  function watch() {
    if(source.state!=='ready')return;
    const recovery=open && failedAttempt.current ? resume.current : null;
    stop();resume.current=recovery;failedAttempt.current=false;setPlayback(source.media.kind==='unknown'?'unsupported':'trying');setAttempt(n=>n+1);onOpenChange(true);
    if(open)back.current?.focus({preventScroll:true});
  }
  function close() {resume.current=null;failedAttempt.current=false;stop();onOpenChange(false);if(trigger.current)trigger.current.focus({preventScroll:true});else fallbackFocus();}
  async function mediaError(node: HTMLMediaElement) {
    if(node!==media.current || failedAttempt.current || !active.current)return;
    failedAttempt.current=true;resume.current={time:node.currentTime,paused:node.paused};
    const errorCode=node.error?.code;
    stop();setPlayback('checking');const checked=await read();
    if(checked && active.current){
      // Code 4 also represents initial HTTP failures. Availability alone cannot prove a codec failure.
      const unsupported=checked.state==='ready' && (errorCode===3 || (errorCode===4 && !node.canPlayType(checked.media.mime)));
      setPlayback(unsupported?'unsupported':'failed');
    }
  }
  const ready=source.state==='ready', audio=ready && source.media.kind==='audio';
  const label=audio?'Слушать':'Смотреть';
  const meta=ready?[duration(source.media.durationSeconds),source.media.extension.toUpperCase(),`${(Number(source.media.bytes)/1048576).toLocaleString('ru-RU',{maximumFractionDigits:1})} МБ`].filter(Boolean).join(' · '):'';
  const retry=source.state==='error'||source.state==='limited';
  const fallback=source.state!=='ready' ? source.state==='error' ? 'Не удалось проверить доступ к исходнику. Повторите проверку' : stateText[source.state]
    : playback==='unsupported' ? 'Браузер не может воспроизвести исходник' : playback==='checking' ? 'Проверяем исходник…' : 'Не удалось воспроизвести исходник';
  const showMedia=ready && (playback==='trying'||playback==='idle');
  const viewer=<section className={styles.viewer} aria-label="Исходная запись" data-original-viewer>
    <div className={styles.heading}><div><small>{audio?'ИСХОДНАЯ АУДИОЗАПИСЬ':'ИСХОДНАЯ ЗАПИСЬ'}{ready && duration(source.media.durationSeconds) && ` · ${duration(source.media.durationSeconds)}`}</small>
      <h2>{audio?'Полная аудиозапись':'Полная запись'}</h2></div><button type="button" className="secondary" ref={back} onClick={close}>← К клипам</button></div>
    <div className={`${styles.frame} ${audio?styles.audio:''}`}>
      {showMedia ? (()=>{const Tag=audio?'audio':'video';return <><span hidden={!audio}>Исходная аудиозапись{ready && ` · ${duration(source.media.durationSeconds)}`}</span><Tag key={attempt} ref={attachMedia} controls playsInline preload="metadata" src={endpoint} aria-label={audio?'Исходная аудиозапись':'Исходная запись'}
        onError={event=>void mediaError(event.currentTarget)} onLoadedMetadata={event=>{const node=event.currentTarget,saved=resume.current;if(node===media.current && saved && saved.time>0)node.currentTime=Math.min(saved.time,Number.isFinite(node.duration)?Math.max(0,node.duration-.01):saved.time);}}
        onLoadedData={event=>{if(event.currentTarget===media.current && !failedAttempt.current){const saved=resume.current;resume.current=null;setPlayback('idle');if(saved && !saved.paused)void event.currentTarget.play().catch(()=>{});}}}
        onPlay={event=>{event.currentTarget.closest('.workspace-ready')?.querySelectorAll<HTMLMediaElement>('video,audio').forEach(node=>{if(node!==event.currentTarget)node.pause();});}}
      /></>;})() : <div className={styles.fallback} role="status"><h3>{fallback}</h3>{ready && <p>{playback==='unsupported'?'Скачайте файл, чтобы открыть его в другом плеере.':`Нажмите «${label}» ещё раз или скачайте файл.`}</p>}</div>}
    </div><div className={styles.foot}>{audio?'Прослушивание':'Просмотр'} полной записи. Готовые клипы остаются в списке.</div>
  </section>;
  return <><div className={styles.row} aria-label="Исходная запись"><span className={styles.name}>Исходник</span>{ready ? <><span className={styles.meta}>{meta}</span>
    <button type="button" className="secondary" ref={trigger} aria-pressed={open} onClick={watch}>{audio?'▷ Слушать':'▷ Смотреть'}</button><a className={`${styles.download} button secondary`} href={`${endpoint}?download=1`}>↓ Скачать</a></>
    : <><span className={styles.status} role="status">{stateText[source.state]}</span>{retry && <button type="button" className="secondary" onClick={()=>void read()}>Повторить</button>}</>}</div>
    {open && viewerHost && createPortal(viewer,viewerHost)}</>;
}
