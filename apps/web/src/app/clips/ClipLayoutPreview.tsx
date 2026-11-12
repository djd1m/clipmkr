'use client';
import { useEffect, useRef, useState } from 'react';
import { planScreenLayout, type ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';
import { mapOutputTime, mapTime, planDuration, type Segment } from '@clipmaker/shared/cut-timeline';
import styles from './clip-layout.module.css';

/** One authorized decoder supplies both regions; source frames never leave this canvas. */
export function ClipLayoutPreview({videoId,layout,segments,active,onState}:{videoId:string;layout:ScreenFaceLayoutV1;
  segments:Segment[];active:boolean;onState:(state:'loading'|'ready'|'unsupported')=>void}) {
  const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
  const [position,setPosition]=useState(0),[playing,setPlaying]=useState(false);
  const latest=useRef({layout,segments});latest.current={layout,segments};
  const draw=useRef<()=>void>(()=>{}),duration=planDuration(segments);
  useEffect(()=>{
    const node=video.current,screen=canvas.current;if(!node || !screen || !active)return;
    let frame:number|undefined,raf:number|undefined,disposed=false;
    onState('loading');
    function paint(){
      if(disposed || !node || !screen || node.readyState<2 || !node.videoWidth)return;
      try {
        const g=planScreenLayout(latest.current.layout,{width:node.videoWidth,height:node.videoHeight},true);
        const ctx=screen.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
        ctx.fillStyle='#181818';ctx.fillRect(0,0,1080,1920);ctx.save();ctx.beginPath();ctx.rect(0,400,1080,800);ctx.clip();
        for(const placement of [g.screen,g.camera])if(placement){const {source:s,destination:d}=placement;
          ctx.drawImage(node,s.x,s.y,s.width,s.height,d.x,d.y,d.width,d.height);}
        ctx.restore();
      }catch{node.pause();onState('unsupported');}
    }
    draw.current=paint;
    function tick(){
      if(disposed || !node)return;
      if(!node.paused && !node.seeking){
        const plan=latest.current.segments,t=mapTime(plan,node.currentTime),end=planDuration(plan);
        const target=mapOutputTime(plan,t);
        if(t>=end-.025){node.pause();setPosition(end);}
        else {setPosition(t);if(Math.abs(target-node.currentTime)>.12)node.currentTime=target;}
      }
      paint();
      if('requestVideoFrameCallback' in node)frame=node.requestVideoFrameCallback(tick);
      else raf=requestAnimationFrame(tick);
    }
    const loaded=()=>{if(!node)return;node.currentTime=latest.current.segments[0]![0];};
    const ready=()=>{paint();onState('ready');};
    const failed=()=>{node?.pause();onState('unsupported');};
    const play=()=>setPlaying(true),pause=()=>setPlaying(false);
    node.addEventListener('loadedmetadata',loaded);node.addEventListener('loadeddata',ready);
    node.addEventListener('seeked',paint);node.addEventListener('error',failed);node.addEventListener('play',play);node.addEventListener('pause',pause);
    node.src=`/api/videos/${encodeURIComponent(videoId)}/original`;tick();
    return()=>{disposed=true;if(frame!==undefined)node.cancelVideoFrameCallback(frame);if(raf!==undefined)cancelAnimationFrame(raf);
      node.removeEventListener('loadedmetadata',loaded);node.removeEventListener('loadeddata',ready);node.removeEventListener('seeked',paint);
      node.removeEventListener('error',failed);node.removeEventListener('play',play);node.removeEventListener('pause',pause);
      node.pause();node.removeAttribute('src');node.load();draw.current=()=>{};};
  },[videoId,active,onState]);
  useEffect(()=>{draw.current();},[layout]);
  async function toggle(){const node=video.current;if(!node)return;if(!node.paused){node.pause();return;}
    if(position>=duration-.025){node.currentTime=segments[0]![0];setPosition(0);}
    try{await node.play();}catch{onState('unsupported');}}
  return <div className={styles.preview}>
    <canvas ref={canvas} width={1080} height={1920} aria-label="Предпросмотр оформления клипа" />
    <video ref={video} className={styles.decoder} playsInline preload="metadata" aria-label="Исходник для предпросмотра" />
    <div className={styles.playback}><button type="button" className="secondary" onClick={()=>void toggle()}>{playing?'Пауза':'Смотреть весь фрагмент'}</button>
      <label>Позиция в клипе, с <input type="range" min={0} max={duration} step={.04} value={Math.min(duration,position)}
        aria-valuetext={`${position.toFixed(2)} из ${duration.toFixed(2)} секунд`} onChange={event=>{
          const t=Number(event.target.value);setPosition(t);if(video.current)video.current.currentTime=mapOutputTime(segments,t);}} /></label>
      <output>{position.toFixed(1)} / {duration.toFixed(1)} с</output></div>
    <p>Проверка кадра и движения. Переходы, музыка и подписи окончательно собираются после применения. На стыках проверьте обе стороны перехода в исходнике.</p>
  </div>;
}
