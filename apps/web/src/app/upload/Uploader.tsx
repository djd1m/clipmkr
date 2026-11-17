'use client';
import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { uploadParts } from '../../lib/upload-parts';
import { rpc } from '../../lib/rpc';
import { hashUploadFile } from '../../lib/upload-file-identity';
import { readUploadResume, writeUploadResume, clearUploadResume, type UploadOptions, type UploadResumeV2 } from '../../lib/upload-resume';
import type { CompleteUploadInput } from '../../server/upload-contract';
import type { UploadData } from '../../server/video';
import type { CtaKind } from '@clipmaker/shared/enums';
import { MAX_UPLOAD_BYTES, NORMAL_SOURCE_SECONDS } from '@clipmaker/shared/upload';
import { CtaFields, ctaProblem } from '../videos/CtaFields';

type Phase = 'idle'|'hashing'|'readyNew'|'readyResume'|'creating'|'transferring'|'savingManifest'|'completing'|'paused'|'mismatch'|'storageBlocked'|'unknownComplete'|'completeConflict'|'recoveryUnavailable'|'error'|'accepted';
type TransferProgress = { kind: 'current'|'lastObserved'; bytes: number; total: number };
type Attempt = {generation:number;scope:string;controller:AbortController};
class StorageBlocked extends Error {}
const unknownCompleteMessage = 'Результат завершения неизвестен. Сервер мог начать обработку. Повторно выберите исходный файл и нажмите «Проверить и продолжить».';
export function VideoUploader({accountScope,creditMode=false,maxSourceSeconds=NORMAL_SOURCE_SECONDS,recoveryIntent=false,availableSeconds,ownerUnlimited=false}:
  {accountScope:string;creditMode?:boolean;maxSourceSeconds?:number;recoveryIntent?:boolean;availableSeconds?:number;ownerUnlimited?:boolean}) {
  const router=useRouter();
  const [estimatedSeconds,setEstimatedSeconds]=useState<number|null>(null);
  const [phase,setPhase]=useState<Phase>('idle'),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [videoId,setVideoId]=useState<string|null>(null),[saved,setSaved]=useState<UploadResumeV2|null>(null);
  const [music,setMusic]=useState(false),[teaser,setTeaser]=useState(true),[compact,setCompact]=useState(true);
  const [ctaKind,setCtaKind]=useState<CtaKind>('none'),[ctaUrl,setCtaUrl]=useState('');
  const [ctaError,setCtaError]=useState('');
  const [file,setFile]=useState<File|null>(null),[digest,setDigest]=useState<string|null>(null);
  const [progress,setProgress]=useState<TransferProgress|null>(null);
  const observed=useRef<TransferProgress|null>(null);
  const picker=useRef<HTMLButtonElement|null>(null),options=useRef<HTMLDetailsElement|null>(null);
  const resume=useRef<UploadResumeV2|null>(null),attempt=useRef<Attempt|null>(null),generation=useRef(0);
  const mounted=useRef(false),scope=useRef(accountScope),unavailable=useRef(false),accepted=useRef(false);
  const input=useRef<HTMLInputElement|null>(null),primary=useRef<HTMLButtonElement|null>(null),retry=useRef<HTMLButtonElement|null>(null),pauseButton=useRef<HTMLButtonElement|null>(null);
  scope.current=accountScope;
  const busy=['hashing','creating','transferring','savingManifest','completing'].includes(phase);
  const frozen=!!saved?.parts;
  const verifiedResume=!!(saved && digest===saved.contentSha256 && file?.size===saved.size);
  const locked=busy || frozen;
  const beforeUnload=useRef((event:BeforeUnloadEvent)=>{if(attempt.current){event.preventDefault();event.returnValue='';}});
  function invalidate() {window.removeEventListener('beforeunload',beforeUnload.current);generation.current++; const previous=attempt.current; attempt.current=null; previous?.controller.abort();}
  function begin():Attempt {invalidate(); const current={generation:generation.current,scope:accountScope,controller:new AbortController()}; attempt.current=current;window.addEventListener('beforeunload',beforeUnload.current); return current;}
  function alive(current:Attempt) {return mounted.current && scope.current===current.scope && generation.current===current.generation && attempt.current===current && !current.controller.signal.aborted;}
  function check(current:Attempt) {if(!alive(current)) throw new DOMException('Попытка остановлена','AbortError');}
  function clearSelection() {setFile(null);setDigest(null); if(input.current)input.current.value='';}
  function pause() {
    const unknown=!!resume.current?.parts, keepFile=(phase==='creating'||phase==='transferring') && verifiedResume && !unknown;
    invalidate();if(!keepFile)clearSelection();setError('');
    if(observed.current){observed.current={...observed.current,kind:'lastObserved'};setProgress(observed.current);}
    setPhase(unknown?'unknownComplete':'paused');
    setMessage(unknown?unknownCompleteMessage:keepFile?'Передача приостановлена. Исходный файл проверен.':'Передача приостановлена. Выберите исходный файл.');
  }
  useEffect(()=>{
    mounted.current=true;
    const restore=()=>{
      accepted.current=false;invalidate();clearSelection();setError('');setCtaError('');
      const read=readUploadResume(accountScope);
      unavailable.current=read.kind!=='found' && (read.kind!=='absent'||recoveryIntent);
      const value=read.kind==='found'?read.value:null;
      resume.current=value;setSaved(value);setVideoId(value?.videoId??null);
      const prefs=value?.parts?(value.finalOptions??value.options):(value?.draftOptions??value?.options);
      setMusic(prefs?.music??false);setTeaser(prefs?.teaser??true);setCompact(prefs?.compact??true);
      setCtaKind(prefs?.ctaKind??'none');setCtaUrl(prefs?.ctaUrl??'');
      observed.current=value?.parts?{kind:'lastObserved',bytes:value.size,total:value.size}:null;setProgress(observed.current);
      setPhase(value?.parts?'unknownComplete':'idle');
      setMessage(value?.parts?unknownCompleteMessage:value?'Выберите исходный файл, затем отдельно продолжите загрузку.':
        unavailable.current?'Данные продолжения недоступны. Автоматически восстановить эту загрузку нельзя.':'');
    };
    restore();
    const click=(event:MouseEvent)=>{
      if(!attempt.current || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
      const anchor=event.target instanceof Element?event.target.closest('a[href]'):null;
      if(!(anchor instanceof HTMLAnchorElement)||anchor.hasAttribute('download')|| (anchor.target && anchor.target!=='_self'))return;
      const target=new URL(anchor.href,location.href),here=new URL(location.href);
      if(target.origin===here.origin && target.pathname===here.pathname && target.search===here.search && target.hash)return;
      if(!window.confirm('Передача не завершена. Приостановить её и уйти со страницы?')){event.preventDefault();event.stopPropagation();return;}
      invalidate();
    };
    const fileInput=input.current;
    const cancel=()=>{if(!attempt.current){
      const unknown=!!resume.current?.parts;
      setPhase(unknown?'unknownComplete':'paused');setMessage(unknown?unknownCompleteMessage:'Выберите исходный файл.');picker.current?.focus();
    }};
    const pageShow=(event:PageTransitionEvent)=>{if(event.persisted)restore();};
    fileInput?.addEventListener('cancel',cancel);
    document.addEventListener('click',click,true);
    window.addEventListener('pagehide',invalidate);
    window.addEventListener('pageshow',pageShow);
    return ()=>{
      fileInput?.removeEventListener('cancel',cancel);mounted.current=false;invalidate();document.removeEventListener('click',click,true);
      window.removeEventListener('pagehide',invalidate);window.removeEventListener('pageshow',pageShow);
    };
  },[accountScope,recoveryIntent]);
  useEffect(()=>{
    const canContinue=phase==='readyResume'||(phase==='paused'&&verifiedResume);
    const target=['hashing','creating'].includes(phase)?pauseButton.current:canContinue?primary.current:phase==='storageBlocked'?retry.current:
      ['paused','mismatch','unknownComplete','recoveryUnavailable'].includes(phase)?picker.current:null;
    target?.focus();
  },[phase,verifiedResume]);
  useEffect(()=>{
    if(phase==='unknownComplete' && options.current)options.current.open=true;
  },[phase]);
  useEffect(()=>{
    const url=options.current?.querySelector<HTMLInputElement>('#upload-cta-url');
    if(ctaError){
      if(options.current)options.current.open=true;
      url?.setAttribute('aria-invalid','true');url?.setAttribute('aria-describedby','upload-cta-error');url?.focus();
    } else {
      url?.removeAttribute('aria-invalid');url?.removeAttribute('aria-describedby');
    }
  },[ctaError]);
  useEffect(()=>{
    if(!recoveryIntent)return;
    picker.current?.focus();
  },[recoveryIntent]);
  useEffect(()=>{
    setEstimatedSeconds(null); if(!file||!creditMode)return;
    const media=document.createElement(file.type.startsWith('audio/')?'audio':'video'),url=URL.createObjectURL(file);let live=true;
    media.preload='metadata';media.onloadedmetadata=()=>{if(live&&Number.isFinite(media.duration))setEstimatedSeconds(Math.ceil(media.duration));};media.src=url;
    return ()=>{live=false;media.onloadedmetadata=null;media.removeAttribute('src');media.load();URL.revokeObjectURL(url);};
  },[file,creditMode]);
  async function select(selected:File|null) {
    invalidate();setDigest(null);setFile(selected);setError('');setCtaError('');
    if(!selected){
      const unknown=!!resume.current?.parts;
      setPhase(unknown?'unknownComplete':'paused');setMessage(unknown?unknownCompleteMessage:'Выберите исходный файл.');return;
    }
    if(!selected.size||selected.size>MAX_UPLOAD_BYTES){setPhase('error');setError('Выберите непустой файл до 2 ГБ.');return;}
    const current=begin();setPhase('hashing');setMessage('Проверяем выбранный файл');
    try {
      const hash=await hashUploadFile(selected,current.controller.signal);check(current);setDigest(hash);
      const previous=resume.current;
      if(previous && (previous.size!==selected.size||previous.contentSha256!==hash)){setPhase('mismatch');setMessage('');setError('Выбран другой файл. Прежняя загрузка сохранена.');}
      else if(previous){
        setVideoId(previous.videoId??null);
        setPhase('readyResume');setMessage(previous.parts?'Файл совпадает. Можно проверить результат завершения.':'Файл совпадает. Можно продолжить загрузку');
      } else {setPhase(unavailable.current?'recoveryUnavailable':'readyNew');setMessage('Файл проверен. Для начала передачи нажмите отдельную кнопку.');}
    } catch(cause){if(alive(current)){setPhase('error');setMessage('');setError(cause instanceof Error?cause.message:'Не удалось проверить файл');}}
    finally {if(alive(current)){attempt.current=null;window.removeEventListener('beforeunload',beforeUnload.current);}}
  }
  function persist(current:Attempt,value:UploadResumeV2) {
    check(current);
    if(!writeUploadResume(value).ok)throw new StorageBlocked('Не удалось сохранить данные восстановления. Передача остановлена до подтверждённого сохранения.');
    check(current);resume.current=value;setSaved(value);
  }
  async function upload(newIntent=false) {
    if(!file||!digest||attempt.current||accepted.current||phase==='completeConflict')return;
    const previous=resume.current,resumed=!newIntent&&previous?.contentSha256===digest&&previous.size===file.size;
    if(previous && (previous.accountScope!==accountScope || (previous.parts && newIntent && phase!=='mismatch')))return;
    if(!resumed && !newIntent && (previous||unavailable.current))return;
    const problem=resumed && previous?.parts?null:ctaProblem(ctaKind,ctaUrl);
    if(problem){
      setError('');setCtaError(problem);
      if(options.current)options.current.open=true;
      options.current?.querySelector<HTMLInputElement>('#upload-cta-url')?.focus();
      return;
    }
    const prefs:UploadOptions={music,teaser,compact,ctaKind,ctaUrl:ctaKind==='none'?null:ctaUrl.trim()};
    let value:UploadResumeV2=resumed?previous:{
      version:2,accountScope,key:crypto.randomUUID(),identityAlgorithm:'sha256',contentSha256:digest,size:file.size,
      originalFilename:file.name.trim(),options:prefs};
    if(resumed && !value.parts)value={...value,draftOptions:prefs};
    const selected=file,current=begin();let completeSent=false;
    if(!resumed){observed.current=null;setProgress(null);}
    setError('');setCtaError('');setPhase('creating');setMessage('Подготавливаем загрузку…');
    try {
      persist(current,value);
      const create=async()=>{
        check(current);
        const data=await rpc<UploadData>('video.create',{filename:value.originalFilename,declared_bytes:value.size,source:'upload',account_scope:current.scope,
          music:value.options.music,teaser:value.options.teaser,compact:value.options.compact,cta_kind:value.options.ctaKind,cta_url:value.options.ctaUrl},true,value.key,current.controller.signal);
        check(current);
        if(value.videoId && data.video_id!==value.videoId)throw new Error('Сервер вернул другую запись. Обновите страницу');
        return data;
      };
      let parts=value.parts;
      if(!parts){
        const data=await create();check(current);value={...value,videoId:data.video_id,partSize:data.part_size};persist(current,value);
        flushSync(()=>{setVideoId(data.video_id);setPhase('transferring');setMessage('Передаём файл');});
        parts=await uploadParts(selected,data,current.controller.signal,create,bytes=>{
          if(!alive(current))return;
          observed.current={kind:'current',bytes,total:selected.size};setProgress(observed.current);
        });check(current);
        value={...value,parts,finalOptions:value.draftOptions??value.options};setPhase('savingManifest');persist(current,value);
      }
      check(current);observed.current={kind:'current',bytes:selected.size,total:selected.size};setProgress(observed.current);setVideoId(value.videoId!);setPhase('completing');setMessage('Завершаем загрузку…');
      completeSent=true;
      const final=value.finalOptions;
      const payload:CompleteUploadInput={video_id:value.videoId!,parts,
        ...(final?{final_preferences:{music:final.music,teaser:final.teaser,compact:final.compact,cta_kind:final.ctaKind,cta_url:final.ctaUrl}}:{})};
      const response=await fetch('/api/upload/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:current.controller.signal});check(current);
      const result=await response.json();check(current);
      if(response.status===409 && result.error?.reason==='final_preferences_conflict'){
        clearUploadResume(current.scope,value.key);
        setPhase('completeConflict');setMessage('');setError(result.error.message);return;
      }
      if(!response.ok)throw new Error(result.error?.message??'Не удалось завершить загрузку');
      if(result.data?.video_id!==value.videoId)throw new Error('Сервер вернул другую запись. Обновите страницу');
      check(current);const cleared=clearUploadResume(current.scope,value.key);check(current);
      accepted.current=true;attempt.current=null;window.removeEventListener('beforeunload',beforeUnload.current);resume.current=null;setSaved(null);setPhase('accepted');
      setMessage(cleared.ok?'Файл принят. Открываем запись.':'Файл принят, но локальные данные не очищены. Открываем запись.');
      router.push(`/dashboard/videos/${value.videoId}`);router.refresh();
    }catch(cause){
      if(!alive(current))return;
      setMessage('');setError(cause instanceof Error?cause.message:'Ошибка загрузки');
      if(cause instanceof StorageBlocked)setPhase('storageBlocked');
      else if(completeSent){clearSelection();setPhase('unknownComplete');setMessage(unknownCompleteMessage);}
      else setPhase('error');
    }finally{if(alive(current)){attempt.current=null;window.removeEventListener('beforeunload',beforeUnload.current);}}
  }
  const filename=file?.name??saved?.originalFilename??'Выберите исходный файл';
  const changes=[music?'Музыка включена':null,!teaser?'Без заголовка':null,!compact?'Паузы сохранены':null,ctaKind!=='none'?'Призыв добавлен':null].filter(Boolean);
  const total=file?.size??saved?.size;
  const percent=progress?Math.floor(progress.bytes/progress.total*100):null;
  return <section className="upload-panel studio-upload" aria-label="Новая запись"><div className="studio-work">
    <header className="workspace-title"><p className="eyebrow studio-kicker">НОВАЯ ЗАПИСЬ</p><h1><span className="cabinet-upload-title">Новая запись</span><span className="studio-upload-title">Один разговор.<br/>Несколько клипов.</span></h1>
      <p className="studio-lead">Выберите файл для создания коротких вертикальных клипов с субтитрами.</p></header>
    <div className="upload-controls">
      <div className="workspace-file studio-file"><span className="workspace-file-symbol" aria-hidden="true">+</span><div><strong className="file-name">{filename}</strong>
        <small>MP4, MOV, WebM, M4A, MP3 · до 2 ГБ</small></div>
        <button ref={picker} id="source-file-picker" type="button" hidden={verifiedResume||phase==='completeConflict'} disabled={busy} className="source-file-picker action-primary" onClick={()=>input.current?.click()}
          aria-describedby="source-file-help">{saved?'Выбрать исходный файл':file?'Выбрать другой файл':'Выбрать файл'}</button>
        <input ref={input} id="source-file" className="native-file-input" hidden tabIndex={-1} aria-label="Исходный файл" type="file" accept=".mp4,.mov,.webm,.m4a,.mp3" disabled={busy} aria-describedby={`source-file-help${error?' source-file-error':''}`} aria-invalid={!!error||undefined}
          onClick={()=>{clearSelection();}}
          onChange={event=>{const selected=event.target.files?.[0]??null;event.target.value='';void select(selected);}}/>
      </div>
      <div className="workspace-upload-meta"><p id="source-file-help" className="muted">2–{Math.floor(maxSourceSeconds/60)} минут · до 2 ГБ.
        {verifiedResume?' Исходный файл проверен.':saved?` Для продолжения выберите исходный файл: ${saved.originalFilename}.`: ''}</p>{ownerUnlimited ? <p>Без списания кредитов</p> : availableSeconds !== undefined && <p>Доступно {(availableSeconds/60).toLocaleString('ru-RU',{maximumFractionDigits:2})} кредитов</p>}</div>
      <div className="workspace-actions">
      {phase==='completeConflict'?<a className="button action-primary" href={`/dashboard/videos/${videoId}`}>Открыть запись</a>:
        phase==='storageBlocked'?<button ref={retry} onClick={()=>void upload()}>Повторить сохранение</button>:
        <button ref={primary} className="upload-start action-primary" disabled={busy||!file||!digest||phase==='mismatch'||phase==='recoveryUnavailable'||phase==='accepted'} onClick={()=>void upload()}>
          {frozen?'Проверить и продолжить':saved?'Продолжить загрузку':'Создать клипы →'}</button>}
      {busy&&<><button ref={pauseButton} className="secondary" aria-describedby="upload-navigation-warning" onClick={pause}>{phase==='hashing'?'Отменить проверку':'Приостановить загрузку'}</button><p id="upload-navigation-warning">Назад или перезагрузка могут прервать передачу; для продолжения понадобится исходный файл.</p></>}
      {!busy&&(!frozen||phase==='mismatch')&&(saved||unavailable.current)&&<><p className="muted">Новая загрузка расходует отдельный слот. Прежняя запись может остаться незавершённой.</p>
        <button className="secondary" disabled={!file||!digest} onClick={()=>void upload(true)}>Начать новую загрузку</button></>}
      </div>
      {(saved||progress)&&<div className="workspace-transfer" aria-label="Подтверждённая передача">
        <p>{progress?`${progress.kind==='lastObserved'?'Подтверждено в последней попытке':'Подтверждено хранилищем'}: ${progress.bytes.toLocaleString('ru-RU')} из ${progress.total.toLocaleString('ru-RU')} байт (${percent}%)`:'Объём подтверждённой передачи уточним после продолжения'}</p>
        <progress aria-label="Подтверждённая передача файла" max={progress?.total??total??1} value={progress?.bytes} />
        <small>100% передачи ещё не означает начало обработки.</small>
      </div>}
      <p role="status" aria-live="polite" aria-atomic="true">{message}</p>
      {error&&<p id="source-file-error" role="alert">{error}</p>}
      {ownerUnlimited ? <p className="upload-cost">Доступ владельца: без списания кредитов и дневных лимитов. Размер и длительность файла, очередь и доступность сервиса проверяются сервером.</p> : creditMode&&<p className="upload-cost">1 кредит = 60 секунд записи.{estimatedSeconds!==null?` Предварительно: ${(estimatedSeconds/60).toLocaleString('ru-RU',{maximumFractionDigits:2})} кредитов (${estimatedSeconds} секунд).`:''} Точный резерв определим по файлу на сервере до обработки. При техническом отказе без готовых клипов резерв вернётся.</p>}
      <details ref={options} className="workspace-upload-options" onInvalidCapture={event=>{if(options.current)options.current.open=true;(event.target as HTMLElement).focus();}}><summary>Дополнительные настройки{changes.length>0&&<span className="changed">{changes.join(" · ")}</span>}</summary>
      {frozen&&<p className="muted">Настройки зафиксированы. При повторе будут использованы те же настройки.</p>}
      <label className="check"><input type="checkbox" checked={music} disabled={locked} onChange={event=>setMusic(event.target.checked)}/> Добавить музыку и финальный акцент</label>
      <small className="muted">Komiku, HoliznaCC0 — музыка CC0 · Kenney — Sci-Fi Sounds, CC0</small>
      <label className="check"><input type="checkbox" checked={teaser} disabled={locked} onChange={event=>setTeaser(event.target.checked)}/> Заголовок в начале клипа</label>
      <label className="check"><input type="checkbox" checked={compact} disabled={locked} onChange={event=>setCompact(event.target.checked)}/> Убрать паузы</label>
      <CtaFields id="upload-cta" kind={ctaKind} url={ctaUrl} disabled={locked}
        onKind={next=>{setCtaKind(next);setCtaError('');}} onUrl={next=>{setCtaUrl(next);setCtaError('');}}/>
      {ctaError&&<p id="upload-cta-error" role="alert">{ctaError}</p>}
      </details>
    </div></div><aside className="studio-preview" aria-label="Текущий исходный файл"><p>Исходная запись</p>
      <div className="studio-source-preview"><span aria-hidden="true">{file?'↥':'+'}</span><strong>{filename}</strong>
        <p>{total?`${total.toLocaleString('ru-RU')} байт`:'Выберите видео или аудио'}</p></div>
      <p className="quiet">{file?'Файл выбран. Передача начинается только по вашей команде.':saved?'Передача не завершена. Выберите исходный файл для проверки.':'Здесь появится информация о выбранном файле. Готовые клипы доступны после обработки.'}</p>
    </aside></section>;
}
