'use client';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { z } from 'zod';
import { parseScreenFaceLayout, type ScreenFaceLayoutV1, type NormalizedRect } from '@clipmaker/shared/screen-layout';
import type { ClipScreen, ClipLayoutInfo } from '../../lib/screen-contract';
import { rpc } from '../../lib/rpc';
import { CLIP_LAYOUT_DRAFT_PREFIX,CLIP_LAYOUT_DRAFT_CLEAR_EVENT } from '../../lib/clip-layout-draft';
import { ClipLayoutPreview } from './ClipLayoutPreview';
import styles from './clip-layout.module.css';

const hash=z.string().regex(/^[a-f0-9]{64}$/),integer=z.number().int().positive();
const layoutSchema=z.unknown().transform((value,ctx)=>{try{return parseScreenFaceLayout(value);}catch{
  ctx.addIssue({code:'custom',message:'Непригодное оформление'});return z.NEVER;}});
const submittedSchema=z.object({request_key:z.string().uuid(),expected_render_version:integer,sourceRevision:hash,
  layout:layoutSchema,draftVersion:integer,acceptedRenderVersion:integer.optional()}).strict();
const envelopeSchema=z.object({version:z.literal(1),accountScope:z.string().uuid(),clipId:z.string().uuid(),sourceRevision:hash,
  baseRenderVersion:integer,layout:layoutSchema,draftVersion:integer,submitted:submittedSchema.optional()}).strict();
type Envelope=z.infer<typeof envelopeSchema>;
const initial:ScreenFaceLayoutV1={version:1,mode:'screen-face',variant:'03',screen:{x:0,y:0,width:1,height:1},focus:null,camera:null};
const defaultCamera={x:.7,y:.05,width:.25,height:.3};
const limitation='Камера берётся из выбранной области. Смена человека и короткое исчезновение между проверками могут остаться незамеченными; просмотрите весь фрагмент.';
const whole='Показан весь экран; для крупного плана можно уточнить область.';
const storageWarning='Черновик хранится только до ухода с этой страницы. Не удалось сохранить его в этой вкладке.';
const publishedReasonText:Record<string,string>={
  whole_screen:'В опубликованном клипе показан весь экран. Для крупного плана уточните область.',
  unsupported_geometry:'Выбранная геометрия недоступна: опубликован экран без камеры. Уточните области.',
  camera_unavailable:'В опубликованном клипе камера недоступна; экран сохранён. Уточните область камеры и проверьте фрагмент.',
  camera_unstable:'В опубликованном клипе камера неустойчива; экран сохранён. Уточните область камеры и проверьте весь фрагмент.',
  no_safe_camera_slot:'В опубликованном клипе камера скрыта: нет безопасного места. Выберите другой вариант или уточните область.',
};
const key=(account:string,clip:string)=>`${CLIP_LAYOUT_DRAFT_PREFIX}${account}:${clip}`;
const same=(a:ScreenFaceLayoutV1,b:ScreenFaceLayoutV1)=>JSON.stringify(a)===JSON.stringify(b);
const percentage=(value:number)=>Math.round(value*1e6)/1e4;
function read(account:string,clip:string):Envelope|null {
  const raw=sessionStorage.getItem(key(account,clip));if(raw===null)return null;
  const value=envelopeSchema.parse(JSON.parse(raw));
  if(value.accountScope!==account || value.clipId!==clip)throw Error('Другой владелец черновика');return value;
}
function write(value:Envelope):boolean {
  try{const parsed=envelopeSchema.parse(value),raw=JSON.stringify(parsed);sessionStorage.setItem(key(value.accountScope,value.clipId),raw);
    return sessionStorage.getItem(key(value.accountScope,value.clipId))===raw;}catch{return false;}
}

export function ClipLayoutChoice({videoId,clip,active,onLeaveGuard}:{videoId:string;clip:ClipScreen;active:boolean;
  onLeaveGuard?:(guard:(()=>boolean)|null)=>void}) {
  const id=useId(),details=useRef<HTMLDetailsElement>(null),dialog=useRef<HTMLDialogElement>(null),applyButton=useRef<HTMLButtonElement>(null);
  const [open,setOpen]=useState(false),[info,setInfo]=useState<ClipLayoutInfo|null>(null),[draft,setDraft]=useState(initial);
  const [target,setTarget]=useState<'screen'|'camera'>('screen'),[busy,setBusy]=useState(false),[confirming,setConfirming]=useState(false);
  const [reviewed,setReviewed]=useState(false),[preview,setPreview]=useState<'loading'|'ready'|'unsupported'>('loading');
  const [status,setStatus]=useState(''),[storageFailed,setStorageFailed]=useState(false),[error,setError]=useState('');
  const envelope=useRef<Envelope|null>(null),dirty=useRef(false),current=useRef<ClipLayoutInfo|null>(null);
  const generation=useRef(0);
  const sending=useRef(false),confirmation=useRef(false),prepared=useRef(''),initialized=useRef(false),operation=useRef<'pending'|'failed'|'succeeded'|null>(null);
  confirmation.current=confirming;
  const announce=useCallback((message:string)=>setStatus(old=>old===message?old:message),[]);
  const previewState=useCallback((state:'loading'|'ready'|'unsupported')=>setPreview(state),[]);
  const save=(value:Envelope)=>{envelope.current=value;const ok=write(value);setStorageFailed(!ok);return ok;};
  useEffect(()=>{
    function clear(event:Event){
      generation.current++;
      details.current?.querySelectorAll<HTMLMediaElement>('video,audio').forEach(node=>{node.pause();node.removeAttribute('src');node.load();});
      envelope.current=null;dirty.current=false;current.current=null;initialized.current=false;operation.current=null;prepared.current='';
      setDraft(initial);setReviewed(false);setInfo(null);setConfirming(false);setOpen(false);dialog.current?.close();if(details.current)details.current.open=false;
      const cleared=(event as CustomEvent<{cleared:boolean}>).detail.cleared;setStorageFailed(!cleared);
      announce(cleared?'Черновик очищен после выхода из аккаунта.':'Выход выполнен. Не удалось очистить хранилище этой вкладки; чужой черновик не будет восстановлен.');
    }
    window.addEventListener(CLIP_LAYOUT_DRAFT_CLEAR_EVENT,clear);return()=>window.removeEventListener(CLIP_LAYOUT_DRAFT_CLEAR_EVENT,clear);
  },[announce]);
  function change(layout:ScreenFaceLayoutV1){
    const c=current.current;if(!c)return;const canonical=parseScreenFaceLayout(layout),old=envelope.current;
    const value:Envelope={version:1,accountScope:c.accountScope,clipId:clip.clip_id,sourceRevision:c.sourceRevision,
      baseRenderVersion:old?.baseRenderVersion??c.renderVersion,layout:canonical,draftVersion:(old?.draftVersion??0)+1,
      ...(old?.submitted?{submitted:old.submitted}:{})};
    dirty.current=true;setDraft(canonical);setReviewed(false);setError('');
    if(save(value))announce('Черновик сохранён в этой вкладке; ещё не применён');
  }
  useEffect(()=>{onLeaveGuard?.(()=>!dirty.current || !storageFailed || window.confirm('Несохранённый черновик будет потерян. Перейти к другому просмотру?'));
    return()=>onLeaveGuard?.(null);},[onLeaveGuard,storageFailed]);
  useEffect(()=>{
    const unload=(event:BeforeUnloadEvent)=>{if(dirty.current){event.preventDefault();event.returnValue='';}};
    const leave=(event:MouseEvent)=>{if(!dirty.current || !storageFailed)return;
      const link=(event.target as Element|null)?.closest('a[href]');if(link && !window.confirm('Несохранённый черновик будет потерян. Уйти со страницы?')){event.preventDefault();event.stopPropagation();}};
    window.addEventListener('beforeunload',unload);document.addEventListener('click',leave,true);
    return()=>{window.removeEventListener('beforeunload',unload);document.removeEventListener('click',leave,true);};
  },[storageFailed]);
  useEffect(()=>{
    if(active)return;setOpen(false);setConfirming(false);dialog.current?.close();
    if(details.current)details.current.open=false;
  },[active]);
  useEffect(()=>{
    if(!open || !active)return;
    let live=true,reading=false;const abort=new AbortController(),epoch=++generation.current;
    const alive=()=>live && generation.current===epoch;
    async function poll(){
      if(reading)return;reading=true;
      try{
        const [c,response]=await Promise.all([rpc<ClipLayoutInfo>('clip.layoutInfo',{clip_id:clip.clip_id},false,undefined,abort.signal),
          fetch(`/api/videos/${encodeURIComponent(videoId)}/original?metadata=1`,{credentials:'same-origin',cache:'no-store',signal:abort.signal})]);
        const source=await response.json();if(!alive())return;
        if(!response.ok || source.videoId!==videoId || source.state!=='ready' || !source.available
          || source.sourceRevision!==c.sourceRevision || source.media?.kind!=='video')throw Error('Видеопредпросмотр исходника недоступен. Сохранённый клип остаётся доступен.');
        const previous=current.current;current.current=c;setInfo(c);setError('');
        if(previous && previous.accountScope!==c.accountScope){
          try{sessionStorage.removeItem(key(previous.accountScope,clip.clip_id));}catch{setStorageFailed(true);}
          initialized.current=false;envelope.current=null;dirty.current=false;setReviewed(false);
        }
        if(!initialized.current){
          initialized.current=true;let restored:Envelope|null=null,readFailed=false;
          try{
            for(let i=sessionStorage.length-1;i>=0;i--){const storedKey=sessionStorage.key(i);
              if(storedKey?.startsWith(CLIP_LAYOUT_DRAFT_PREFIX) && !storedKey.startsWith(`${CLIP_LAYOUT_DRAFT_PREFIX}${c.accountScope}:`))sessionStorage.removeItem(storedKey);}
            restored=read(c.accountScope,clip.clip_id);
          }
          catch{readFailed=true;setStorageFailed(true);announce('Запись черновика повреждена или хранилище недоступно. Несохранённые изменения не восстановлены.');}
          if(restored && restored.sourceRevision!==c.sourceRevision){
            try{sessionStorage.removeItem(key(c.accountScope,clip.clip_id));}catch{setStorageFailed(true);}
            announce('Исходник изменился. Прежний черновик не восстановлен.');restored=null;
          }
          if(restored){envelope.current=restored;dirty.current=true;setDraft(restored.layout);setReviewed(false);
            announce(restored.baseRenderVersion!==c.renderVersion && !restored.submitted?'Версия клипа изменилась; черновик восстановлен отдельно. Проверьте актуальные настройки.':'Черновик восстановлен в этой вкладке; ещё не применён');}
          else {setDraft(c.publishedLayout?.requested??initial);if(!readFailed)announce('Показаны сохранённые настройки; черновик этой вкладки не найден');}
        }
        if(envelope.current && envelope.current.sourceRevision!==c.sourceRevision){
          try{sessionStorage.removeItem(key(c.accountScope,clip.clip_id));}catch{setStorageFailed(true);}
          envelope.current=null;dirty.current=false;operation.current=null;setDraft(c.publishedLayout?.requested??initial);setReviewed(false);
          announce('Исходник изменился. Прежний черновик удалён; проверьте новые области.');
        }
        const local=envelope.current,submitted=local?.submitted,intent=c.activeIntent;
        if(submitted && intent?.request_key===submitted.request_key){
          operation.current=intent.status;
          if(submitted.acceptedRenderVersion===undefined){const next={...local,submitted:{...submitted,acceptedRenderVersion:intent.render_version}};save(next);}
          if(intent.status==='failed'){setReviewed(false);announce('Пересборка завершилась отказом. Черновик сохранён; измените его или подтвердите повтор.');}
          else if(intent.status==='pending')announce('Пересборка принята; прежний клип доступен');
        }
        const bound=envelope.current?.submitted;
        if(local && bound?.acceptedRenderVersion && bound.sourceRevision===c.sourceRevision && local.sourceRevision===c.sourceRevision
          && c.publishedRenderVersion===bound.acceptedRenderVersion && c.publishedLayout && same(c.publishedLayout.requested,bound.layout)){
          operation.current='succeeded';
          try{
            const stored=read(c.accountScope,clip.clip_id);
            if(stored?.submitted?.request_key===bound.request_key && stored.submitted.acceptedRenderVersion===bound.acceptedRenderVersion
              && stored.draftVersion===bound.draftVersion && local.draftVersion===bound.draftVersion
              && same(stored.layout,bound.layout) && same(local.layout,bound.layout)){
              sessionStorage.removeItem(key(c.accountScope,clip.clip_id));if(sessionStorage.getItem(key(c.accountScope,clip.clip_id))!==null)throw Error('Remove failed');
              envelope.current=null;dirty.current=false;setStorageFailed(false);setDraft(c.publishedLayout.requested);
              announce('Оформление опубликовано. Доступен обновлённый клип.');
            }
          }catch{setStorageFailed(true);}
        }
        if(previous && previous.renderVersion!==c.renderVersion && dirty.current && !envelope.current?.submitted){
          setReviewed(false);announce('Версия клипа изменилась; черновик сохранён. Проверьте актуальные настройки.');}
        if(!dirty.current && !confirmation.current && c.publishedLayout && previous?.publishedRenderVersion!==c.publishedRenderVersion){
          setDraft(c.publishedLayout.requested);setReviewed(false);
        }
        if(!dirty.current && !confirmation.current && c.seed.state==='ready' && c.seed.proposal && !c.publishedLayout){
          setDraft({...initial,camera:c.seed.proposal});setReviewed(false);
        }
        if(!envelope.current?.submitted && !dirty.current){
          if(c.seed.state==='pending' || c.seed.state==='running')announce('Определяем область камеры');
          else if(c.seed.state==='ready')announce('Область камеры предложена; просмотрите весь фрагмент');
          else if(c.seed.state==='unavailable')announce('Не удалось предложить камеру. Можно уточнить область вручную или оставить весь экран.');
        }
        if(prepared.current!==c.sourceRevision){prepared.current=c.sourceRevision;
          if(c.seed.state==='absent')await rpc('clip.prepareLayout',{clip_id:clip.clip_id,expected_source_revision:c.sourceRevision},true);}
      }catch(cause){if(alive()){
        if(cause instanceof Error && 'status' in cause && [401,404,409].includes(Number(cause.status))){
          const previous=current.current;if(previous)try{sessionStorage.removeItem(key(previous.accountScope,clip.clip_id));}catch{setStorageFailed(true);}
          envelope.current=null;dirty.current=false;current.current=null;initialized.current=false;setInfo(null);setDraft(initial);setReviewed(false);
        }
        setError(cause instanceof Error?cause.message:'Не удалось проверить исходник');setPreview('unsupported');}}
      finally{reading=false;}
    }
    void poll();const timer=setInterval(()=>void poll(),5000);
    return()=>{live=false;abort.abort();clearInterval(timer);};
  },[open,active,videoId,clip.clip_id,announce]);
  function closeConfirmation(){dialog.current?.close();setConfirming(false);setReviewed(false);(applyButton.current?.isConnected?applyButton.current:details.current?.querySelector('summary'))?.focus();}
  async function apply(){
    const c=current.current;if(!c || sending.current || !reviewed || preview!=='ready')return;
    const old=envelope.current;let value=old;
    const replaying=!!old?.submitted && operation.current!=='failed' && operation.current!=='succeeded';
    // Unknown results replay the exact original snapshot/key before another operation is admitted.
    let submitted=old?.submitted;
    if(!submitted || operation.current==='failed' || operation.current==='succeeded'){
      submitted={request_key:crypto.randomUUID(),expected_render_version:c.renderVersion,sourceRevision:c.sourceRevision,
        layout:parseScreenFaceLayout(draft),draftVersion:old?.draftVersion??1};
      value={version:1,accountScope:c.accountScope,clipId:clip.clip_id,sourceRevision:c.sourceRevision,
        baseRenderVersion:c.renderVersion,layout:draft,draftVersion:old?.draftVersion??1,submitted};
    }
    if(!value || !submitted)return;save({...value,submitted});dirty.current=true;sending.current=true;setBusy(true);setError('');
    try{
      const response=await rpc<{request_key:string;render_version:number;status:'pending'|'failed'|'succeeded'}>('clip.setLayout',{
        clip_id:clip.clip_id,request_key:submitted.request_key,expected_render_version:submitted.expected_render_version,
        expected_source_revision:submitted.sourceRevision,layout:submitted.layout,reviewed_full_clip:true},true);
      const latest=envelope.current;if(latest?.submitted?.request_key===response.request_key)
        save({...latest,submitted:{...latest.submitted,acceptedRenderVersion:response.render_version}});
      operation.current=response.status;announce(response.status==='failed'?'Пересборка завершилась отказом. Черновик сохранён.':'Пересборка принята; прежний клип доступен');
      closeConfirmation();details.current?.querySelector('summary')?.focus();
    }catch(cause){
      const latest=envelope.current;
      // Existing server code distinguishes new-admission refusal from a same-key body conflict.
      // A limiter429 may run before key lookup and cannot resolve an earlier unknown outcome.
      if(cause instanceof Error && 'status' in cause && ((Number(cause.status)===409 && 'code' in cause && cause.code==='refused')
        || (!replaying && [422,429].includes(Number(cause.status))))
        && latest?.submitted?.request_key===submitted.request_key && latest.submitted.acceptedRenderVersion===undefined){
        const {submitted:refused,...retained}=latest;void refused;save(retained);operation.current=null;setReviewed(false);
        announce('Пересборка не принята; черновик сохранён. Проверьте актуальные настройки и подтвердите повтор.');
      }
      setError(cause instanceof Error?cause.message:'Результат запроса неизвестен. Повтор использует тот же запрос.');
    }
    finally{sending.current=false;setBusy(false);}
  }
  function regionChange(field:'x'|'y'|'width',percent:number){
    const region=target==='camera'?draft.camera??defaultCamera:draft.variant==='03'?draft.focus??draft.screen:draft.screen;
    const bounds=target==='screen' && draft.variant==='03'?draft.screen:{x:0,y:0,width:1,height:1};
    const r={...region,[field]:Math.round(percent*10000)/1e6};
    r.width=Math.min(bounds.width,Math.max(.000001,r.width));
    if(field==='width')r.height=Math.min(bounds.height,Math.max(.000001,region.height*r.width/region.width));
    r.x=Math.max(bounds.x,Math.min(bounds.x+bounds.width-r.width,r.x));r.y=Math.max(bounds.y,Math.min(bounds.y+bounds.height-r.height,r.y));
    const fieldName=target==='camera'?'camera':draft.variant==='03'?'focus':'screen';
    const canonical=parseScreenFaceLayout({...draft,[fieldName]:r,...(fieldName==='screen'?{focus:null}:{})});change(canonical);
  }
  const region:NormalizedRect=target==='camera'?draft.camera??defaultCamera:draft.variant==='03'?draft.focus??draft.screen:draft.screen;
  const regionBounds=target==='screen' && draft.variant==='03'?draft.screen:{x:0,y:0,width:1,height:1};
  const targetName=target==='camera'?'Камера':'Экран';
  const quota=info?.rerenderQuota;
  const published=info?.publishedLayout?.resolved;
  const publishedNotice=published && (!published.cameraVisible || published.reason==='whole_screen')?publishedReasonText[published.reason??'']??'':'';
  const unresolved=envelope.current?.submitted && operation.current!=='failed' && operation.current!=='succeeded';
  const confirmationLayout=unresolved?envelope.current!.submitted!.layout:draft;
  const quotaText=quota?quota.unlimited?'Пересборки без суточного ограничения по действующему праву.':`Доступно ${quota.remaining} из ${quota.limit} пересборок. Обновление ${new Date(quota.resetsAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})} МСК.`:'';
  return <details ref={details} className={styles.choice} onToggle={event=>{const next=event.currentTarget.open;setOpen(next);if(!next){setConfirming(false);dialog.current?.close();event.currentTarget.querySelector('summary')?.focus();}}}>
    <summary>Экран + камера</summary>
    {open && <><fieldset disabled={!info || busy}><legend>Оформление экрана и камеры</legend>
      {(['03','01','02'] as const).map(variant=><label key={variant}><input type="radio" name={`${id}-variant`} checked={draft.variant===variant} onChange={()=>change({...draft,variant})} />
        {variant==='03'?'03 — Крупный план действия':variant==='01'?'01 — Весь экран и камера в свободной области':'02 — Экран сверху, камера снизу'}</label>)}</fieldset>
      <p>{draft.focus===null?whole:'Выделенная область экрана увеличена; проверьте её на всём фрагменте.'}</p>
      <p>{limitation}</p>
      {info && !error && <ClipLayoutPreview videoId={videoId} layout={draft} segments={info.cutPlan??[[info.start,info.end]]} active={open && active} onState={previewState} />}
      <details><summary>Уточнить области</summary>
        <label>Уточняемая область <select value={target} onChange={event=>setTarget(event.target.value as 'screen'|'camera')}><option value="screen">Экран</option><option value="camera">Камера</option></select></label>
        {([['x','положение по горизонтали'],['y','положение по вертикали'],['width','ширина']] as const).map(([field,label])=>{
          const min=field==='width'?.0001:percentage(field==='x'?regionBounds.x:regionBounds.y);
          const max=percentage(field==='x'?regionBounds.x+regionBounds.width-region.width:field==='y'?regionBounds.y+regionBounds.height-region.height:regionBounds.width);
          return <label key={field}>{targetName}: {label}, % <output>{percentage(region[field])}%</output>
            <input type="range" min={min} max={max} step="any" value={percentage(region[field])}
              aria-label={`${targetName}: ${label}, %`} aria-valuetext={`${percentage(region[field])}% ${field==='y'?'высоты':'ширины'} исходника`}
              disabled={!info || busy} onChange={event=>regionChange(field,Number(event.target.value))} /></label>;})}
        <label><input type="checkbox" checked={draft.camera!==null} disabled={!info || busy} onChange={event=>change({...draft,camera:event.target.checked?defaultCamera:null})} />Показывать камеру из выбранной области</label>
      </details>
      <p>{quotaText} При применении используется одна пересборка. Старый файл доступен до публикации нового в пределах срока хранения.</p>
      <p role="status" aria-live="polite" aria-atomic="true">{status} {publishedNotice} {preview==='loading'?'Загружаем видеопредпросмотр…':preview==='ready'?'Предпросмотр доступен. Проверьте весь фрагмент.':'Видеопредпросмотр недоступен. Проверьте исходник и повторно откройте настройки.'}</p>
      {storageFailed && <p className={styles.warning} role="alert">{storageWarning}</p>}
      {error && <p role="alert" id={`${id}-error`}>{error}</p>}
      <button type="button" ref={applyButton} disabled={!info || preview!=='ready' || !!error || busy || !quota?.available || operation.current==='pending'}
        aria-describedby={error?`${id}-error`:undefined} onClick={()=>{setConfirming(true);setReviewed(false);dialog.current?.showModal();dialog.current?.querySelector<HTMLElement>('h3')?.focus();}}>Применить оформление</button>
      <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-confirmation`} onCancel={event=>{event.preventDefault();closeConfirmation();}}>
        <h3 id={`${id}-confirmation`} tabIndex={-1}>Применить оформление клипа</h3>
        <p>Фрагмент {clip.index}: {clip.title}. Вариант {confirmationLayout.variant}. {confirmationLayout.focus===null?whole:'Подтверждённая область экрана.'} {confirmationLayout.camera?'Камера из выбранной области.':'Камера отключена.'}</p>
        {unresolved && <p>Уточняем исход прежнего запроса с тем же ключом. Последние правки сохранены отдельно и этим повтором не применяются.</p>}
        <p>{limitation}</p><p>{quotaText}</p>
        <label><input type="checkbox" checked={reviewed} onChange={event=>setReviewed(event.target.checked)} />Я просмотрел(а) весь фрагмент и проверил(а) области экрана и камеры</label>
        <div className={styles.actions}><button type="button" className="secondary" onClick={closeConfirmation}>Отмена</button>
          <button type="button" disabled={!reviewed || busy} onClick={()=>void apply()}>{busy?'Отправляем…':'Подтвердить пересборку'}</button></div>
      </dialog></>}
  </details>;
}
