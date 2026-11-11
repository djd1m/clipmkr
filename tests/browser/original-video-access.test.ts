import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { resolve, join } from 'node:path';
import { mkdtempSync, readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync, spawn, type ChildProcess } from 'node:child_process';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createServer as httpsServer, type Server as HttpsServer } from 'node:https';
import { request as httpRequest, createServer as httpServer } from 'node:http';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { liveS3Environment, environment } from '../fixtures/environment';
import { createS3Client, deleteObject } from '../../packages/s3/src/index';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { ServerResponse } from 'node:http';
import type { VideoScreen, ClipScreen } from '../../apps/web/src/lib/screen-contract';
const id='11111111-1111-4111-8111-111111111111', clipId='22222222-2222-4222-8222-222222222222';
const video:VideoScreen={video_id:id,status:'rendering',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),duration_seconds:8,user_state:'выполняется',stage_label:'Монтаж',stage_progress:50,clips_done:0,clips_total:0,no_response:false,failure_reason:null,next_action:null,retry_after:null,poll_after_seconds:5,cta_kind:'none',cta_url:null,failed_stage:null};
const clip:ClipScreen={clip_id:clipId,index:1,start:0,end:8,title:'Первый момент',status:'done',available:true,watermarked:false,expires_at:null};
const cache=mkdtempSync(join(tmpdir(),'original-browser-'));
const evidence='/root/.config/clipmkr/original-video-access-20261111/author/browser';
let vite:ViteDevServer,origin:string,browser:Browser,mp4:Buffer,audio:Buffer,unsupportedMedia:Buffer,unsupported=false,kind:'video'|'audio'='video',broken=false;
const held=new Set<ServerResponse>();
function ready(kindValue:'video'|'audio'|'unknown'='video') {return {videoId:id,state:'ready',available:true,sourceRevision:'a'.repeat(64),media:{kind:kindValue,mime:kindValue==='audio'?'audio/mp4':kindValue==='unknown'?'application/octet-stream':'video/mp4',extension:kindValue==='audio'?'m4a':kindValue==='unknown'?'bin':'mp4',bytes:String(kindValue==='audio'?audio.length:mp4.length),durationSeconds:8}};}
beforeAll(async()=>{
 mkdirSync(evidence,{recursive:true,mode:0o700});
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=s=320x180:r=24:d=8','-f','lavfi','-i','sine=frequency=440:duration=8','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-y',join(cache,'source.mp4')]);
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','sine=frequency=440:duration=8','-c:a','aac','-y',join(cache,'source.m4a')]);
 execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=red:s=64x64:r=2:d=1','-c:v','qtrle','-pix_fmt','rgb24','-y',join(cache,'unsupported.mov')]);
 mp4=readFileSync(join(cache,'source.mp4'));audio=readFileSync(join(cache,'source.m4a'));unsupportedMedia=readFileSync(join(cache,'unsupported.mov'));
 const entry='\0original-entry',nav='\0original-nav',link='\0original-link';
 vite=await createServer({configFile:false,root:process.cwd(),cacheDir:join(cache,'vite'),esbuild:{jsx:'automatic'},
  optimizeDeps:{include:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','zod'],exclude:['next/navigation','next/link']},
  resolve:{alias:Object.fromEntries(['enums','cta','tariff','music-catalog'].map(n=>[`@clipmaker/shared/${n}`,resolve(`packages/shared/src/${n}.ts`)]))},
  server:{host:'127.0.0.1',port:0,watch:null},plugins:[{name:'original-browser',enforce:'pre',resolveId(n){if(n===entry)return entry;if(n==='next/navigation')return nav;if(n==='next/link')return link;},
   load(n){if(n===nav)return 'export const useRouter=()=>({push(){},refresh(){}});';if(n===link)return "import React from 'react';export default function Link(p){return React.createElement('a',p)}";
    if(n===entry)return `import React from 'react';import{createRoot}from'react-dom/client';import{VideoDetail}from'/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';const root=createRoot(document.getElementById('root'));window.mountOriginal=p=>root.render(React.createElement(VideoDetail,p));window.originalReady=true;`;},
   configureServer(server){server.middlewares.use(async(req,res,next)=>{
    if(req.url==='/break'){for(const response of held)response.destroy();res.end('closed');return;}
    if(req.url?.startsWith('/approved')){res.setHeader('content-type','text/html');res.end(readFileSync('docs/research/original-video-access/states.html'));return;}
    if((/^\/api\/videos\/[^/]+\/original(?:\?|$)/.test(req.url??'') && !req.url!.includes('metadata=1')) || req.url?.includes('/file?')){
     const body=req.url!.includes('/file?')?mp4:unsupported?unsupportedMedia:kind==='audio'?audio:mp4;
     const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??''),start=match?Number(match[1]):0,end=match?.[2]?Math.min(Number(match[2]),body.length-1):body.length-1;
     if(start>=body.length){res.writeHead(416,{'content-range':`bytes */${body.length}`}).end();return;}
     res.writeHead(match?206:200,{'content-type':unsupported?'video/quicktime':kind==='audio'?'audio/mp4':'video/mp4','content-length':end-start+1,'accept-ranges':'bytes',...(match?{'content-range':`bytes ${start}-${end}/${body.length}`} :{}),...(req.url!.includes('download=1')?{'content-disposition':`attachment; filename="source.${kind==='audio'?'m4a':'mp4'}"`}:{})});
     if(broken && req.url!.includes('/original')){res.write(body.subarray(start,Math.max(start+1,Math.floor(body.length*.7))));held.add(res);res.on('close',()=>held.delete(res));}else res.end(body.subarray(start,end+1));return;
    }
    if(!req.url?.startsWith('/fixture')){next();return;}res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/fixture',`<!doctype html><html lang="ru" data-theme="dark" data-workspace-layout="workspace"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"><body><main class="container workspace-shell" id="root"></main><script type="module" src="/@id/__x00__original-entry"></script></body></html>`));
   });}}]});await vite.listen();const address=vite.httpServer!.address();if(!address||typeof address==='string')throw Error('no port');origin=`http://127.0.0.1:${address.port}`;browser=await chromium.launch();
},30000);
afterAll(async()=>{for(const response of held)response.destroy();await browser?.close();await vite?.close();rmSync(cache,{recursive:true,force:true});});
async function mount(page:Page,clips:ClipScreen[]=[clip],metadata:unknown=ready()) {
 let reads=0,current=clips;
 await page.route('**/api/videos/*/original?metadata=1',route=>{reads++;if(metadata===null)return;return route.fulfill({json:metadata});});
 await page.route('**/api/trpc/video.get?*',r=>r.fulfill({json:{result:{data:{data:video}}}}));
 await page.route('**/api/trpc/clip.list?*',r=>r.fulfill({json:{result:{data:{data:{clips:current}}}}}));
 await page.goto(origin+'/fixture');await page.waitForFunction(()=>Reflect.get(window,'originalReady'));
 await page.evaluate(p=>Reflect.get(window,'mountOriginal')(p),{videoId:id,initialVideo:video,initialClips:clips});
 await page.waitForSelector('[aria-label="Исходная запись"]');return {reads:()=>reads,setClips:(value:ClipScreen[])=>{current=value;}};
}
async function run(work:(page:Page)=>Promise<void>){kind='video';broken=false;unsupported=false;const page=await browser.newPage({viewport:{width:1440,height:1000}});try{await work(page);}finally{for(const res of held)res.destroy();await page.close();}}
it('original_preserves_clip_selection_and_single_media',()=>run(async page=>{
 const f=await mount(page,[clip,{...clip,clip_id:id,index:2,title:'Второй момент'}]);await page.waitForSelector('[aria-pressed="false"]');
 const clipNode=page.locator('.clip-card[data-selected=true] video');await clipNode.evaluate(n=>Reflect.set(window,'clipNode',n));await clipNode.evaluate((n:HTMLVideoElement)=>n.play());
 await page.getByRole('button',{name:'▷ Смотреть',exact:true}).click();expect(await clipNode.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
 const source=page.locator('[data-original-viewer] video');await expect.poll(()=>source.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);expect(await source.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
 await source.evaluate((n:HTMLVideoElement)=>n.play());await expect.poll(()=>source.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);
 await page.getByRole('button',{name:'← К клипам'}).click();expect(await source.count()).toBe(0);expect(await page.getByRole('button',{name:'▷ Смотреть'}).evaluate(n=>n===document.activeElement)).toBe(true);
 expect(await clipNode.evaluate(n=>n===Reflect.get(window,'clipNode'))).toBe(true);expect(f.reads()).toBe(1);
 await page.getByRole('button',{name:'▷ Смотреть'}).click();await page.locator('[data-original-viewer] video').evaluate(n=>Reflect.set(window,'oldSource',n));await page.locator(`[data-select-clip="${id}"]`).click();expect(await page.locator('[data-original-viewer]').count()).toBe(0);expect(await page.evaluate(()=>{const n=Reflect.get(window,'oldSource') as HTMLVideoElement;return n.paused && !n.getAttribute('src');})).toBe(true);expect(await page.locator('.clip-card[data-selected=true]').getAttribute('data-clip-id')).toBe(id);
}));
it('original_handles_zero_clips_and_late_results',()=>run(async page=>{
 const f=await mount(page,[]);await page.getByRole('button',{name:'▷ Смотреть'}).click();expect(await page.locator('[data-select-clip]').count()).toBe(0);expect(await page.locator('[data-original-viewer]').isVisible()).toBe(true);
 await page.getByRole('button',{name:'← К клипам'}).click();expect(await page.locator('.empty').textContent()).toContain('Фрагменты появятся');expect(await page.getByRole('button',{name:'▷ Смотреть'}).evaluate(n=>n===document.activeElement)).toBe(true);
 await page.getByRole('button',{name:'▷ Смотреть'}).click();f.setClips([clip]);await page.waitForSelector('[data-select-clip]',{timeout:7000});expect(await page.locator('[data-original-viewer]').isVisible()).toBe(true);
 await page.getByRole('button',{name:'← К клипам'}).click();expect(await page.locator('.clip-card[data-selected=true]').getAttribute('data-clip-id')).toBe(clipId);expect(f.reads()).toBe(1);
}));
it('original_source_is_canvas_readable and native audio/download hashes',()=>run(async page=>{
 await mount(page);await page.getByRole('button',{name:'▷ Смотреть'}).click();const source=page.locator('[data-original-viewer] video');await expect.poll(()=>source.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);
 expect(await source.evaluate((node:HTMLVideoElement)=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=18;const ctx=canvas.getContext('2d')!;ctx.drawImage(node,0,0,32,18);return ctx.getImageData(0,0,32,18).data.some((v,i)=>i%4!==3 && v>0);})).toBe(true);
 const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'↓ Скачать'}).click();const download=await downloadPromise;const path=await download.path();expect(path).not.toBeNull();expect(createHash('sha256').update(readFileSync(path!)).digest('hex')).toBe(createHash('sha256').update(mp4).digest('hex'));
 await page.getByRole('button',{name:'← К клипам'}).click();kind='audio';await mount(page,[],ready('audio'));await page.getByRole('button',{name:'▷ Слушать'}).click();const native=page.locator('[data-original-viewer] audio');await expect.poll(()=>native.evaluate((n:HTMLAudioElement)=>n.readyState)).toBeGreaterThanOrEqual(2);expect(await native.evaluate((n:HTMLAudioElement)=>n.paused)).toBe(true);await native.evaluate((n:HTMLAudioElement)=>n.play());await expect.poll(()=>native.evaluate((n:HTMLAudioElement)=>n.currentTime)).toBeGreaterThan(.1);
}));
it('original_media_error_ready_does_not_restart',()=>run(async page=>{
 broken=true;const f=await mount(page);await page.getByRole('button',{name:'▷ Смотреть'}).click();const native=page.locator('[data-original-viewer] video');
 await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);await native.evaluate((n:HTMLVideoElement)=>n.play());await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);
 // Real playable bytes followed by native TCP reset; subsequent native range retry also fails.
 await page.route('**/api/videos/*/original',r=>r.fulfill({status:503,body:'Synthetic transport outage'}));await page.evaluate(()=>fetch('/break'));await native.evaluate((n:HTMLVideoElement)=>{n.currentTime=7;});
 await expect.poll(()=>page.locator('[data-original-viewer]').textContent(),{timeout:15000}).toContain('Не удалось воспроизвести исходник');expect(f.reads()).toBe(2);
 expect(await page.locator('[data-original-viewer] video').count()).toBe(0);await page.waitForTimeout(500);expect(f.reads()).toBe(2);
 await page.unroute('**/api/videos/*/original');broken=false;await page.getByRole('button',{name:'▷ Смотреть'}).click();await expect.poll(()=>page.locator('[data-original-viewer] video').evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);expect(f.reads()).toBe(2);expect(await page.locator('[data-original-viewer] video').evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThanOrEqual(6.9);
}),25000);
for(const width of [390,1440])for(const theme of ['dark','light'])it(`approved original states geometry ${width} ${theme}`,()=>run(async page=>{
 await page.setViewportSize({width,height:1100});
 for(const state of ['loading','incomplete','missing','error','unsupported','audio','no-clips','playback-error']){
  kind=state==='audio'?'audio':'video';const dto=state==='incomplete'||state==='missing'||state==='error'?{videoId:id,state,available:false,unavailableReason:state==='incomplete'?'upload_incomplete':state==='missing'?'source_missing':'temporarily_unavailable'}:ready(state==='audio'?'audio':state==='unsupported'?'unknown':'video');
  await mount(page,state==='no-clips'?[]:[clip],state==='loading'?null:dto);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  if(['unsupported','audio','no-clips','playback-error'].includes(state))await page.getByRole('button',{name:state==='audio'?'▷ Слушать':'▷ Смотреть'}).click();
  if(state==='playback-error'){await page.locator('[data-original-viewer] video').evaluate(n=>n.dispatchEvent(new Event('error')));await expect.poll(()=>page.locator('[data-original-viewer]').textContent()).toContain('Не удалось воспроизвести исходник');}
  if(await page.getByRole('button',{name:state==='audio'?'▷ Слушать':'▷ Смотреть'}).count()){const watch=page.getByRole('button',{name:state==='audio'?'▷ Слушать':'▷ Смотреть'});await watch.hover();const contrast=await watch.evaluate(n=>{const s=getComputedStyle(n);const luminance=(v:string)=>{const rgb=v.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return rgb[0]!*.2126+rgb[1]!*.7152+rgb[2]!*.0722;};const a=luminance(s.color),b=luminance(s.backgroundColor);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05);});expect(contrast).toBeGreaterThanOrEqual(4.5);}
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const row=page.locator('[aria-label="Исходная запись"]').first();const box=await row.boundingBox();expect(box?.width).toBeLessThanOrEqual(width);expect(box?.height).toBeLessThan(150);
  if(await page.locator('[data-original-viewer]').count()){const frame=page.locator('[data-original-viewer] > div').nth(1),size=await frame.boundingBox();expect(size!.width).toBeGreaterThan(200);if(state!=='audio')expect(Math.abs(size!.width/size!.height-16/9)).toBeLessThan(.03);}
  await page.screenshot({path:join(evidence,`${width}-${theme}-${state}.png`),fullPage:true});
  const approved=await browser.newPage({viewport:{width,height:1100}});try{await approved.goto(`${origin}/approved?state=${state}&theme=${theme}`);if(['unsupported','audio','no-clips','playback-error'].includes(state))await approved.locator('#watch').click();
   const reference=await approved.locator('.source-row').boundingBox();expect(Math.abs(box!.height-reference!.height)).toBeLessThanOrEqual(48);
   if(await page.locator('[data-original-viewer]').count()){const padding=await page.locator('[data-original-viewer]>div').first().evaluate(n=>parseFloat(getComputedStyle(n).paddingLeft));const pinned=await approved.locator('.viewer-heading').evaluate(n=>parseFloat(getComputedStyle(n).paddingLeft));expect(padding).toBe(pinned);}
   await approved.screenshot({path:join(evidence,`${width}-${theme}-${state}-approved.png`),fullPage:true});
  }finally{await approved.close();}
 }
}));
it('webkit native original playback when installed',async()=>{
 const other=await webkit.launch();const page=await other.newPage();try{kind='video';broken=false;await mount(page);await page.getByRole('button',{name:'▷ Смотреть'}).click();const native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);await native.evaluate((n:HTMLVideoElement)=>n.play());await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);}finally{await other.close();}
});
for(const responseState of ['incomplete','missing','error','404','429','malformed'])it(`media error metadata table ${responseState}`,()=>run(async page=>{
 await mount(page);await page.getByRole('button',{name:'▷ Смотреть'}).click();const native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);
 let refreshes=0;await page.route('**/api/videos/*/original?metadata=1',r=>{refreshes++;return r.fulfill({status:responseState==='404'?404:responseState==='429'?429:200,json:responseState==='malformed'?{}:{videoId:id,state:responseState,available:false,unavailableReason:responseState==='incomplete'?'upload_incomplete':responseState==='missing'?'source_missing':'temporarily_unavailable'}});});
 // Matrix fixture emits duplicate events on an already decoded native element; the separate TCP test proves a real network error.
 await native.evaluate(n=>{n.dispatchEvent(new Event('error'));n.dispatchEvent(new Event('error'));});
 const expected=responseState==='incomplete'?'Передача исходника не завершена':responseState==='missing'||responseState==='404'?'Исходный файл недоступен':responseState==='429'?'Слишком много запросов':'Не удалось проверить доступ';
 await expect.poll(()=>page.locator('[data-original-viewer]').textContent()).toContain(expected);expect(refreshes).toBe(1);expect(await page.locator('[data-original-viewer] video').count()).toBe(0);
 if(['error','malformed','429'].includes(responseState)){await page.route('**/api/videos/*/original?metadata=1',r=>r.fulfill({json:ready()}));await page.getByRole('button',{name:'Повторить',exact:true}).click();await page.waitForSelector('button[aria-pressed="true"]');expect(await page.locator('[data-original-viewer] video').count()).toBe(0);expect(await page.locator('[data-original-viewer]').textContent()).toContain('Не удалось воспроизвести исходник');}
 await page.getByRole('button',{name:'← К клипам'}).click();expect(await page.locator('.clip-card[data-selected=true]').isVisible()).toBe(true);
}));

it('native Next HTTPS session PostgreSQL Cloud.ru original canvas download and foreign denial',async()=>{
 const database=process.env.DATABASE_URL,redis=process.env.REDIS_URL;
 if(!database||!new URL(database).pathname.endsWith('_test')||!redis||new URL(redis).pathname!=='/14')throw Error('Dedicated *_test PG and Redis14 required');
 const safety=liveS3Environment(),namespace=`tests/site/original_${randomUUID()}/`,scope={prefixes:[namespace]},audit=safety.receipt(namespace,'original-native-next');
 const client=createS3Client({...safety.config,keyPrefix:namespace});safety.bind(client,scope);safety.bind(client.signingClient!,scope);
 const schema=`original_next_${randomBytes(8).toString('hex')}`,secret=randomBytes(32).toString('hex'),password='Synthetic-original-2026!',key='source.mp4',videoId=randomUUID();
 const privateDir=join(evidence,schema);mkdirSync(privateDir,{mode:0o700});
 let pool:Pool|undefined,child:ChildProcess|undefined,proxy:HttpsServer|undefined,primary:unknown,cleanup:unknown,logs='';
 let jar:Awaited<ReturnType<Browser['newContext']>>|undefined;
 try {
  pool=createPool(database,schema);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);
  const auth=new AuthService(new PgAuthStore(pool,'credits_v1'),secret),emails=[`own-${schema}@example.test`,`foreign-${schema}@example.test`],ids:string[]=[];
  for(const email of emails){const token=await auth.register(email,password,'198.51.100.0/24');ids.push((await auth.authenticate(token))!.account_id);}
  audit.attempt(key);await client.send(new PutObjectCommand({Bucket:safety.config.bucket,Key:key,Body:mp4,ContentType:'application/octet-stream'}));
  await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,clips_total,clips_done) VALUES($1,$2,$3,'upload',$4,$4,$5,'rendering',8,0,0)`,[videoId,ids[0],randomUUID(),mp4.length,key]);
  const socket=httpServer();await new Promise<void>(r=>socket.listen(0,'127.0.0.1',r));const port=(socket.address() as import('node:net').AddressInfo).port;await new Promise<void>(r=>socket.close(()=>r()));
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(privateDir,'key.pem'),'-out',join(privateDir,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'pipe'});
  proxy=httpsServer({key:readFileSync(join(privateDir,'key.pem')),cert:readFileSync(join(privateDir,'cert.pem'))},(req,res)=>{
   const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-for':'198.51.100.7,10.0.0.2,10.0.0.3','x-forwarded-proto':'https'}},response=>{res.writeHead(response.statusCode!,response.headers);response.pipe(res);});
   upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});res.on('close',()=>upstream.destroy());req.pipe(upstream);
  });await new Promise<void>(r=>proxy!.listen(9661,'127.0.0.1',r));const nativeOrigin=`https://127.0.0.1:${(proxy.address() as import('node:net').AddressInfo).port}`;
  const scoped=new URL(database);scoped.searchParams.set('options',`-c search_path=${schema},public`);
  const proofPath=join(privateDir,'transport.json'),bootstrap=join(privateDir,'transport.mjs');
  // Reuse the existing safety fence inside the actual Next subprocess, not a replacement route.
  writeFileSync(bootstrap,`import {createRequire} from 'node:module';import{writeFileSync}from'node:fs';import{liveS3Environment}from${JSON.stringify(resolve('tests/fixtures/environment.ts'))};
const require=createRequire(${JSON.stringify(resolve('package.json'))}),{S3Client}=require('@aws-sdk/client-s3'),safety=liveS3Environment(),scope=${JSON.stringify(scope)},bound=new WeakSet(),proof={bound:0,sends:0,gets:0};const save=()=>writeFileSync(${JSON.stringify(proofPath)},JSON.stringify(proof),{mode:0o600});
const bind=c=>{if(!bound.has(c)){safety.bind(c,scope);bound.add(c);proof.bound++;save();}};const send=S3Client.prototype.send;S3Client.prototype.send=function(...args){bind(this);if(this.signingClient)bind(this.signingClient);proof.sends++;save();return send.apply(this,args);};
const nativeFetch=globalThis.fetch.bind(globalThis);globalThis.fetch=(input,init)=>{const value=input instanceof Request?input.url:String(input);let url;try{url=new URL(value)}catch{return nativeFetch(input,init)}if(url.hostname==='s3.cloud.ru'||url.hostname.endsWith('.s3.cloud.ru')){proof.gets++;save();return safety.fetch(value,init??{},scope);}return nativeFetch(input,init);};save();`,{mode:0o600});
  const childEnv: NodeJS.ProcessEnv={...environment(),...process.env,PATH:process.env.PATH,NODE_ENV:'test',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:scoped.href,REDIS_URL:redis,SESSION_SECRET:secret,N5_PUBLIC_ORIGIN:nativeOrigin,N5_BILLING_MODE:'credits_v1',N5_PAYMENTS_MODE:'off',N5_MAIL_MODE:'disabled',N5_CHECKOUT_ENABLED:'false',S3_ENDPOINT:safety.config.endpoint,S3_PUBLIC_ENDPOINT:safety.config.endpoint,S3_BUCKET:safety.config.bucket,S3_REGION:safety.config.region,S3_ACCESS_KEY:safety.config.accessKeyId,S3_SECRET_KEY:safety.config.secretAccessKey,S3_FORCE_PATH_STYLE:String(safety.config.forcePathStyle),S3_KEY_PREFIX:namespace};
  child=spawn(process.execPath,['--experimental-strip-types','--import',bootstrap,resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:resolve('apps/web'),env:childEnv,stdio:['ignore','pipe','pipe']});child!.stdout!.on('data',c=>{logs+=String(c);});child!.stderr!.on('data',c=>{logs+=String(c);});
  let listening=false;for(let i=0;i<150;i++){if(child!.exitCode!==null)throw Error('Native Next stopped; private log retained');try{if((await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1000)})).ok){listening=true;break;}}catch{/* bounded readiness */}await new Promise(r=>setTimeout(r,100));}if(!listening)throw Error('Native Next readiness deadline');
  jar=await browser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
  const login=await jar.request.post(nativeOrigin+'/api/auth/login',{headers:{origin:nativeOrigin},data:{email:emails[0],password}});expect(login.status()).toBe(200);expect((await jar.cookies()).find(c=>c.name==='__Host-n5_session')).toMatchObject({httpOnly:true,secure:true,path:'/'});
  const snapshot=async()=>({grants:(await pool!.query('SELECT * FROM credit_grant ORDER BY id')).rows,jobs:(await pool!.query('SELECT * FROM job_attempt')).rows,growth:(await pool!.query('SELECT * FROM growth_event')).rows,quota:(await pool!.query('SELECT * FROM quota_counter')).rows});const before=await snapshot();
  const page=await jar.newPage();const external:string[]=[];page.on('request',r=>{if(new URL(r.url()).origin!==nativeOrigin)external.push(new URL(r.url()).hostname);});
  await page.goto(`${nativeOrigin}/dashboard/videos/${videoId}`);await page.getByRole('button',{name:'▷ Смотреть'}).click();const native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState),{timeout:15000}).toBeGreaterThanOrEqual(2);
  await native.evaluate((n:HTMLVideoElement)=>n.play());await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);
  expect(await native.evaluate((node:HTMLVideoElement)=>{const c=document.createElement('canvas');c.width=32;c.height=18;const ctx=c.getContext('2d')!;ctx.drawImage(node,0,0,32,18);return ctx.getImageData(0,0,32,18).data.some((v,i)=>i%4!==3&&v>0);})).toBe(true);
  await native.evaluate((n:HTMLVideoElement)=>{n.pause();n.currentTime=6;});await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.seeking)).toBe(false);
  const downloadPromise=page.waitForEvent('download');await page.getByRole('link',{name:'↓ Скачать'}).click();const download=await downloadPromise;expect(createHash('sha256').update(readFileSync((await download.path())!)).digest('hex')).toBe(createHash('sha256').update(mp4).digest('hex'));expect(download.suggestedFilename()).toBe(`Исходник ${videoId}.mp4`);
  const endpoint=`${nativeOrigin}/api/videos/${videoId}/original`;const head=await jar.request.head(endpoint);expect(head.status()).toBe(200);expect(head.headers()['content-length']).toBe(String(mp4.length));
  const range=await jar.request.get(endpoint,{headers:{range:'bytes=0-15'}});expect(range.status()).toBe(206);expect(await range.body()).toEqual(mp4.subarray(0,16));expect(range.headers().location).toBeUndefined();expect(external).toEqual([]);
  const proof=JSON.parse(readFileSync(proofPath,'utf8')) as {bound:number;sends:number;gets:number};expect(proof.bound).toBeGreaterThanOrEqual(2);expect(proof.gets).toBeGreaterThan(0);
  const foreign=await browser.newContext({ignoreHTTPSErrors:true});try{expect((await foreign.request.post(nativeOrigin+'/api/auth/login',{headers:{origin:nativeOrigin},data:{email:emails[1],password}})).status()).toBe(200);for(const path of [endpoint,endpoint+'?metadata=1&g=guest&key=foreign'])expect((await foreign.request.get(path)).status()).toBe(404);}finally{await foreign.close();}
  const anonymous=await browser.newContext({ignoreHTTPSErrors:true});try{expect((await anonymous.request.get(endpoint)).status()).toBe(404);}finally{await anonymous.close();}
  const afterProof=JSON.parse(readFileSync(proofPath,'utf8')) as typeof proof;expect(afterProof.sends).toBe(proof.sends);expect(afterProof.gets).toBe(proof.gets);expect(await snapshot()).toEqual(before);await page.screenshot({path:join(privateDir,'native-original.png'),fullPage:true});
 }catch(error){primary=error;}finally{
  await jar?.close();if(proxy){proxy.closeAllConnections();await new Promise<void>(r=>proxy!.close(()=>r()));}
  if(child && child.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child?.kill('SIGKILL'),4000);await ended;clearTimeout(timer);}writeFileSync(join(privateDir,'next.log'),logs,{mode:0o600});
  try{audit.beginCleanup();await deleteObject({client,bucket:safety.config.bucket},key);audit.finish(true);}catch(error){cleanup=error;audit.finish(false);}finally{client.destroy();if(pool){try{await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);}finally{await pool.end();}}}
 }
 audit.report(primary,cleanup);
},90000);

for(const statusCode of [503,404,429])it(`original_initial_http_error_rechecks_metadata_once ${statusCode}`,()=>run(async page=>{
 await page.addInitScript(()=>{Reflect.set(window,'originalMediaErrors',[]);document.addEventListener('error',event=>{const node=event.target;if(node instanceof HTMLMediaElement && node.closest('[data-original-viewer]'))(Reflect.get(window,'originalMediaErrors') as unknown[]).push({code:node.error?.code,readyState:node.readyState});},true);});
 await mount(page);await page.getByRole('button',{name:'▷ Смотреть'}).waitFor();let rechecks=0,gets=0;
 await page.route('**/api/videos/*/original?metadata=1',route=>{rechecks++;return statusCode===429?route.fulfill({status:429,body:'Synthetic rate limit'}):route.fulfill({json:{videoId:id,state:statusCode===404?'missing':'error',available:false,unavailableReason:statusCode===404?'source_missing':'temporarily_unavailable'}});});
 await page.route('**/api/videos/*/original',route=>{gets++;return route.fulfill({status:statusCode,body:'Synthetic initial HTTP failure'});});
 await page.getByRole('button',{name:'▷ Смотреть'}).click();await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'originalMediaErrors').length)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>Reflect.get(window,'originalMediaErrors')[0])).toMatchObject({code:4,readyState:0});await expect.poll(()=>rechecks).toBe(1);
 const expected=statusCode===404?'Исходный файл недоступен':statusCode===429?'Слишком много запросов':'Не удалось проверить доступ';await expect.poll(()=>page.locator('[data-original-viewer]').textContent()).toContain(expected);
 expect(await page.locator('[data-original-viewer]').textContent()).not.toContain('Браузер не может');expect(await page.locator('[data-original-viewer] video').count()).toBe(0);await page.waitForTimeout(200);expect(rechecks).toBe(1);expect(gets).toBe(1);
}));
it('original_native_unsupported_keeps_download',()=>run(async page=>{
 unsupported=true;const dto=ready();dto.media.mime='video/quicktime';dto.media.extension='mov';const f=await mount(page,[clip],dto);await page.getByRole('button',{name:'▷ Смотреть'}).click();
 await expect.poll(()=>page.locator('[data-original-viewer]').textContent()).toContain('Браузер не может воспроизвести исходник');expect(await page.getByRole('link',{name:'↓ Скачать'}).isVisible()).toBe(true);expect(f.reads()).toBe(2);
}));
for(const exit of ['back','clip'])it(`original_recovery_reopen_stays_paused ${exit}`,()=>run(async page=>{
 broken=true;const f=await mount(page);await page.locator('.clip-card video').evaluate(n=>Reflect.set(window,'originalClipNode',n));await page.getByRole('button',{name:'▷ Смотреть'}).click();let native=page.locator('[data-original-viewer] video');
 await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);await native.evaluate((n:HTMLVideoElement)=>n.play());await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);
 await page.route('**/api/videos/*/original',r=>r.fulfill({status:503,body:'Synthetic transport outage'}));await page.evaluate(()=>fetch('/break'));await native.evaluate((n:HTMLVideoElement)=>{n.currentTime=7;});await expect.poll(()=>page.locator('[data-original-viewer]').textContent(),{timeout:15000}).toContain('Не удалось воспроизвести исходник');expect(f.reads()).toBe(2);
 await page.unroute('**/api/videos/*/original');broken=false;await page.getByRole('button',{name:'▷ Смотреть'}).click();native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);expect(await native.evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThanOrEqual(6.9);await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(false);await native.evaluate((n:HTMLVideoElement)=>n.pause());
 if(exit==='back')await page.getByRole('button',{name:'← К клипам'}).click();else await page.locator(`[data-select-clip="${clipId}"]`).click();expect(await page.locator('.clip-card video').evaluate(n=>n===Reflect.get(window,'originalClipNode'))).toBe(true);
 await page.getByRole('button',{name:'▷ Смотреть'}).click();native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);await page.waitForTimeout(200);expect(await native.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);expect(f.reads()).toBe(2);
 expect(await page.evaluate(()=>Array.from(document.querySelectorAll<HTMLMediaElement>('audio,video')).filter(n=>!n.paused).length)).toBe(0);
}),25000);
it('original_media_state_text_contrast',()=>run(async page=>{
 for(const theme of ['dark','light'])for(const state of ['audio','unsupported','playback-error','loading','incomplete','missing','error','limited']){
  kind=state==='audio'?'audio':'video';await mount(page,[clip],ready(state==='audio'?'audio':state==='unsupported'?'unknown':'video'));await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.getByRole('button',{name:state==='audio'?'▷ Слушать':'▷ Смотреть'}).click();
  if(!['audio','unsupported'].includes(state)){
   await page.route('**/api/videos/*/original?metadata=1',route=>state==='loading'?undefined:state==='limited'?route.fulfill({status:429,body:'Synthetic rate limit'}):route.fulfill({json:state==='playback-error'?ready():{videoId:id,state,available:false,unavailableReason:state==='missing'?'source_missing':state==='incomplete'?'upload_incomplete':'temporarily_unavailable'}}));
   await page.locator('[data-original-viewer] video').evaluate(n=>n.dispatchEvent(new Event('error')));await page.locator('[data-original-viewer] [role=status] h3').waitFor();if(state!=='loading')await expect.poll(()=>page.locator('[aria-label="Исходная запись"]').first().textContent()).not.toContain('Проверяем исходник');
  }
  const selectors=state==='audio'?['[data-original-viewer] > div:nth-child(2) > span']:['[data-original-viewer] [role=status] h3',...(['unsupported','playback-error'].includes(state)?['[data-original-viewer] [role=status] p']:[])];
  for(const selector of selectors){const measured=await page.locator(selector).evaluate(node=>{const text=getComputedStyle(node).color,background=getComputedStyle(node.closest('[data-original-viewer]')!.children[1]!).backgroundColor;const lum=(v:string)=>{const rgb=v.match(/[\d.]+/g)!.slice(0,3).map(Number).map(x=>{const c=x/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return rgb[0]!*.2126+rgb[1]!*.7152+rgb[2]!*.0722;};const a=lum(text),b=lum(background);return{ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05),text,background};});expect(measured.ratio,`${theme}/${state}/${selector} ${JSON.stringify(measured)}`).toBeGreaterThanOrEqual(4.5);}
 }
}));

it('original_upload_transition_during_error_recheck_settles',()=>run(async page=>{
 video.status='uploading';let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);let rechecks=0,gets=0;
 try{
  await mount(page,[]);await page.getByRole('button',{name:'▷ Смотреть'}).waitFor();
  await page.route('**/api/videos/*/original?metadata=1',async route=>{rechecks++;if(rechecks===1)await gate;await route.fulfill({json:ready()}).catch(()=>{});});
  await page.route('**/api/videos/*/original',route=>{gets++;return route.fulfill({status:503,body:'Synthetic initial HTTP outage'});});
  await page.getByRole('button',{name:'▷ Смотреть'}).click();await expect.poll(()=>rechecks).toBe(1);
  const poll=page.waitForResponse(response=>response.url().includes('/api/trpc/video.get?'));video.status='rendering';await poll;
  await expect.poll(()=>page.locator('.status-panel').getAttribute('data-state'),{timeout:7000}).not.toBe('uploading');
  expect(rechecks,'A stale uploading transition must not replace the in-flight media error check').toBe(1);release();
  await expect.poll(()=>page.locator('[data-original-viewer]').textContent()).toContain('Не удалось воспроизвести исходник');
  expect(await page.locator('[data-original-viewer]').textContent()).not.toContain('Проверяем исходник');expect(await page.locator('[data-original-viewer] video').count()).toBe(0);await page.waitForTimeout(200);expect(rechecks).toBe(1);expect(gets).toBe(1);
 }finally{release?.();video.status='rendering';}
}),15000);

it('original_incomplete_upload_transition_checks_once_without_autoplay',()=>run(async page=>{
 video.status='uploading';let transitions=0;
 try{
  await mount(page,[],{videoId:id,state:'incomplete',available:false,unavailableReason:'upload_incomplete'});await expect.poll(()=>page.locator('[aria-label="Исходная запись"]').textContent()).toContain('Передача исходника не завершена');
  await page.route('**/api/videos/*/original?metadata=1',route=>{transitions++;return route.fulfill({json:ready()});});
  const poll=page.waitForResponse(response=>response.url().includes('/api/trpc/video.get?'));video.status='rendering';await poll;await page.getByRole('button',{name:'▷ Смотреть'}).waitFor();expect(transitions).toBe(1);expect(await page.locator('[data-original-viewer]').count()).toBe(0);
  await page.getByRole('button',{name:'▷ Смотреть'}).click();const native=page.locator('[data-original-viewer] video');await expect.poll(()=>native.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);expect(await native.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);expect(transitions).toBe(1);
 }finally{video.status='rendering';}
}),15000);
