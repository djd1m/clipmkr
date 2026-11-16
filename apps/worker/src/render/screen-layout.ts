import { planScreenLayout, type ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';
import type { FaceReport } from './framing-plan.js';
import type { Segment } from '@clipmaker/shared/cut-timeline';

export function resolveLayoutCamera(report:FaceReport|null,retained:Segment[],start:number,end:number):boolean {
  if(!report || !Array.isArray(report.samples) || !report.samples.length)return false;
  const expected:number[]=[];
  for(let t=start;t<end-1e-6;t+=.5)if(retained.some(([a,b])=>t>=a && t<b))expected.push(t);
  return expected.length>0 && expected.every(t=>{
    const sample=report.samples.find(s=>Math.abs(s.t-t)<.011);
    return !!sample && sample.faces.some(f=>[f.cx,f.cy,f.w,f.h,f.score].every(Number.isFinite)
      && f.score>=.6 && f.w>0 && f.h>0 && f.cx>=0 && f.cx<=1 && f.cy>=0 && f.cy<=1);
  });
}
export function proposeLayoutCamera(report:FaceReport|null) {
  if(!report || report.samples.length<8)return null;
  const faces=report.samples.map(s=>s.faces.filter(f=>[f.cx,f.cy,f.w,f.h,f.score].every(Number.isFinite)
    && f.w>0 && f.h>0 && f.cx>=0 && f.cx<=1 && f.cy>=0 && f.cy<=1
    && f.score>=.8 && f.w*f.h>=.002 && f.w*f.h<=.12 && (f.cx<=.2 || f.cx>=.8)));
  if(faces.some(f=>f.length!==1))return null;
  const all=faces.map(f=>f[0]!);
  const range=(key:'cx'|'cy'|'w'|'h')=>all.map(f=>f[key]);
  if((['cx','cy'] as const).some(k=>Math.max(...range(k))-Math.min(...range(k))>.04)
    || (['w','h'] as const).some(k=>Math.max(...range(k))/Math.min(...range(k))>1.5))return null;
  const median=(v:number[])=>[...v].sort((a,b)=>a-b)[Math.floor(v.length/2)]!;
  const width=Math.min(1,median(range('w'))*2.4),height=Math.min(1,median(range('h'))*3.2);
  const x=Math.min(1-width,Math.max(0,median(range('cx'))-width/2));
  const y=Math.min(1-height,Math.max(0,median(range('cy'))-height*.35));
  const round=(n:number)=>Math.round(n*1e6)/1e6;
  return {x:round(x),y:round(y),width:round(width),height:round(height)};
}

/** Isolated graph only. The caller supplies an already compacted stream and camera decision.
 * This module neither probes sources nor runs detectors, jobs or FFmpeg. */
export function buildScreenLayoutGraph(layout: ScreenFaceLayoutV1,
  source: { width: number; height: number; sampleAspectRatio?: number },
  cameraAvailable = false, inputLabel = 'vc') {
  if (!/^[A-Za-z0-9_:]+$/.test(inputLabel)) throw new Error('Непригодная метка потока');
  const geometry = planScreenLayout(layout, source, cameraAvailable);
  const { screen, camera } = geometry;
  const cropScale = (p: typeof screen) => `crop=${p.source.width}:${p.source.height}:${p.source.x}:${p.source.y}:exact=1,` +
    `scale=${p.destination.width}:${p.destination.height},setsar=1`;
  const graph = [
    `[${inputLabel}]split=${camera ? 3 : 2}[sl_base][sl_screen]${camera ? '[sl_camera]' : ''}`,
    '[sl_base]scale=1080:800,setsar=1,drawbox=c=0x181818:t=fill[sl_bg]',
    `[sl_screen]${cropScale(screen)}[sl_content]`,
    `[sl_bg][sl_content]overlay=x=${screen.destination.x}:y=${screen.destination.y - 400}:` +
      'repeatlast=0:eof_action=pass:shortest=1,pad=1080:1920:0:400:color=0x181818[sl_canvas]',
  ];
  if (camera) {
    graph.push(`[sl_camera]${cropScale(camera)}[sl_live_camera]`,
      `[sl_canvas][sl_live_camera]overlay=x=${camera.destination.x}:y=${camera.destination.y}:` +
      'repeatlast=0:eof_action=pass:shortest=1[screenout]');
  } else graph.push('[sl_canvas]null[screenout]');
  return { graph: graph.join(';'), geometry };
}
