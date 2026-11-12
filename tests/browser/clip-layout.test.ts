import { beforeAll,afterAll,expect,it } from 'vitest';
import { createServer,type ViteDevServer } from 'vite';
import { chromium,webkit,type Browser,type Page } from 'playwright';
import { mkdtempSync,readFileSync,rmSync,mkdirSync } from 'node:fs';
import { resolve,join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { spawn,type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomBytes,randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { createServer as httpServer,request as httpRequest } from 'node:http';
import { createServer as httpsServer,type Server as HttpsServer } from 'node:https';
import { createPool,ClipLayoutRepository,type Pool,type Attempt } from '../../packages/db/src';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { liveS3Environment,environment } from '../fixtures/environment';
import { createS3Client,deleteObject } from '../../packages/s3/src';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createQueues,getRedisConnection,jobId } from '../../packages/queue/src';
import { QueueEvents } from 'bullmq';
import { planScreenLayout } from '../../packages/shared/src/screen-layout';
import { createRenderWorker } from '../../apps/worker/src/workers/render';
import { s3Download } from '../../apps/worker/src/media/download';
import { renderStorage } from '../../apps/worker/src/render/storage';
import type { ClipScreen,ClipLayoutInfo,VideoScreen } from '../../apps/web/src/lib/screen-contract';
const videoId='11111111-1111-4111-8111-111111111111',clipId='22222222-2222-4222-8222-222222222222',account='33333333-3333-4333-8333-333333333333';
const revision='a'.repeat(64),storageKey=`n5-clip-layout:v1:${account}:${clipId}`;
const clip:ClipScreen={clip_id:clipId,index:1,start:0,end:8,title:'Проверка экрана',status:'done',available:true,watermarked:false,expires_at:null,render_version:1,published_render_version:1};
const video:VideoScreen={video_id:videoId,status:'done',created_at:new Date().toISOString(),updated_at:new Date().toISOString(),duration_seconds:8,user_state:'успех',stage_label:'Готово',stage_progress:100,clips_done:1,clips_total:1,no_response:false,failure_reason:null,next_action:null,retry_after:null,poll_after_seconds:5,cta_kind:'none',cta_url:null,failed_stage:null};
const info=():ClipLayoutInfo=>({accountScope:account,sourceRevision:revision,start:0,end:8,cutPlan:[[0,3],[4,8]],renderVersion:1,publishedRenderVersion:1,publishedLayout:null,
  seed:{state:'absent',proposal:null,reason:null},rerenderQuota:{available:true,unlimited:false,limit:7,remaining:6,resetsAt:'2026-11-12T00:00:00Z'},activeIntent:null});
let vite:ViteDevServer,origin:string,chromiumBrowser:Browser,webkitBrowser:Browser,mp4:Buffer;
const cache=mkdtempSync('/tmp/clipmkr-zoom-phase-b-browser-');
beforeAll(async()=>{
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i',"nullsrc=s=320x180:r=25:d=8,format=gbrp,geq=r='if(gte(X,240)*lt(Y,54),10,if(lt(X,240),40+mod(N,160),255))':g='if(gte(X,240)*lt(Y,54),80+mod(N,120),if(lt(X,240),40,0))':b='if(gte(X,240)*lt(Y,54),30,if(lt(X,240),20,255))'",'-f','lavfi','-i','sine=frequency=440:duration=8','-threads','1','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-y',join(cache,'source.mp4')]);
  mp4=readFileSync(join(cache,'source.mp4'));const entry='\0zoom-entry',nav='\0zoom-nav',link='\0zoom-link';
  vite=await createServer({configFile:false,root:process.cwd(),cacheDir:join(cache,'vite'),esbuild:{jsx:'automatic'},
    optimizeDeps:{include:['react','react-dom','react-dom/client','react/jsx-runtime','zod'],exclude:['next/navigation','next/link']},
    resolve:{alias:Object.fromEntries(['enums','cta','tariff','music-catalog','screen-layout','cut-timeline'].map(n=>[`@clipmaker/shared/${n}`,resolve(`packages/shared/src/${n}.ts`)]))},
    server:{host:'127.0.0.1',port:0,watch:null},plugins:[{name:'zoom-browser',enforce:'pre',resolveId(n){if(n===entry)return entry;if(n==='next/navigation')return nav;if(n==='next/link')return link;},
      load(n){if(n===nav)return 'export const useRouter=()=>({push(){},refresh(){}});';if(n===link)return "import React from 'react';export default function Link(p){return React.createElement('a',p)}";
        if(n===entry)return `import React from'react';import{createRoot}from'react-dom/client';import{VideoDetail}from'/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';import{SignOut}from'/apps/web/src/app/support/SignOut.tsx';import{clearClipLayoutDrafts}from'/apps/web/src/lib/clip-layout-draft.ts';const root=createRoot(document.getElementById('root'));let key=0;window.mountZoom=p=>root.render(React.createElement(VideoDetail,{...p,key:++key}));window.mountZoomSignOut=()=>root.render(React.createElement(SignOut));window.clearZoomDrafts=clearClipLayoutDrafts;window.zoomReady=true;`;},
      configureServer(server){server.middlewares.use(async(req,res,next)=>{
        if((req.url?.includes('/original') && !req.url.includes('metadata=1')) || req.url?.includes('/file?')){
          const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??''),start=match?Number(match[1]):0,end=match?.[2]?Math.min(Number(match[2]),mp4.length-1):mp4.length-1;
          if(start>=mp4.length){res.writeHead(416,{'content-range':`bytes */${mp4.length}`}).end();return;}
          res.writeHead(match?206:200,{'content-type':'video/mp4','content-length':end-start+1,'accept-ranges':'bytes',...(match?{'content-range':`bytes ${start}-${end}/${mp4.length}`}:{})}).end(mp4.subarray(start,end+1));return;}
        if(!req.url?.startsWith('/fixture')){next();return;}
        res.setHeader('content-type','text/html');res.end(await server.transformIndexHtml('/fixture',`<!doctype html><html lang="ru" data-theme="dark" data-workspace-layout="workspace"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"><body><main id="root" class="container workspace-shell"></main><script type="module" src="/@id/__x00__zoom-entry"></script></body></html>`));
      });}}]});await vite.listen();const address=vite.httpServer!.address();if(!address||typeof address==='string')throw Error('No local port');origin=`http://127.0.0.1:${address.port}`;
  chromiumBrowser=await chromium.launch();webkitBrowser=await webkit.launch();
},30_000);
afterAll(async()=>{await chromiumBrowser?.close();await webkitBrowser?.close();await vite?.close();rmSync(cache,{recursive:true,force:true});});
async function fixture(page:Page){
  const state={info:info(),applies:[] as Record<string,unknown>[],prepares:0};
  await page.route('**/api/videos/*/original?metadata=1',r=>r.fulfill({json:{videoId,state:'ready',available:true,sourceRevision:revision,media:{kind:'video',mime:'video/mp4',extension:'mp4',bytes:String(mp4.length),durationSeconds:8}}}));
  await page.route('**/api/trpc/**',async route=>{
    const method=new URL(route.request().url()).pathname.split('/').at(-1);let value:unknown;
    if(method==='video.get')value=video;else if(method==='clip.list')value={clips:[clip,{...clip,clip_id:videoId,index:2,title:'Другой клип'}]};
    else if(method==='clip.layoutInfo')value=state.info;
    else if(method==='clip.prepareLayout'){state.prepares++;state.info.seed.state='pending';value={state:'pending',seedRevision:'b'.repeat(64)};}
    else if(method==='clip.setLayout'){
      const request=route.request().postDataJSON();state.applies.push(request);state.info.renderVersion++;
      state.info.activeIntent={request_key:request.request_key,render_version:state.info.renderVersion,layout:request.layout,status:'pending'};
      value={request_key:request.request_key,render_version:state.info.renderVersion,status:'pending'};
    }else throw Error(`Unexpected mutation ${method}`);
    await route.fulfill({json:{result:{data:{data:value}}}});
  });
  await page.goto(origin+'/fixture');await mount(page);return state;
}
async function mount(page:Page){await page.waitForFunction(()=>Reflect.get(window,'zoomReady'));
  await page.evaluate(p=>Reflect.get(window,'mountZoom')(p),{videoId,initialVideo:video,initialClips:[clip,{...clip,clip_id:videoId,index:2,title:'Другой клип'}]});await page.waitForSelector('.clip-card');}
async function editor(page:Page,waitForFrame=true){const edit=page.getByRole('button',{name:'Изменить оформление',exact:true});if(!await edit.isVisible())await page.locator('.clip-card[data-selected=true] > .clip-body > details > summary').click();
  await edit.click();const summary=page.getByText('Экран + камера',{exact:true}).filter({visible:true});if(!await summary.evaluate(n=>(n.parentElement as HTMLDetailsElement).open))await summary.click();
  if(waitForFrame)await expect.poll(()=>page.getByRole('button',{name:'Применить оформление',exact:true}).isEnabled()).toBe(true);}
async function refresh(page:Page){await page.getByText('Экран + камера',{exact:true}).filter({visible:true}).click();await page.getByText('Экран + камера',{exact:true}).filter({visible:true}).click();
  await expect.poll(()=>page.locator('canvas').count()).toBe(1);await page.waitForTimeout(150);}
async function variant(page:Page,value:'01'|'02'|'03'){await page.getByRole('radio',{name:new RegExp(`^${value} —`)}).check();}
async function confirm(page:Page){await page.getByRole('button',{name:'Применить оформление',exact:true}).click();
  await page.getByRole('checkbox',{name:/Я просмотрел/}).check();await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>page.getByRole('dialog').count()).toBe(0);}
async function saved(page:Page){return page.evaluate(k=>JSON.parse(sessionStorage.getItem(k)??'null'),storageKey);}
async function run(work:(page:Page)=>Promise<void>,engine:()=>Browser=()=>chromiumBrowser){const page=await engine().newPage({viewport:{width:1440,height:1000}});try{await work(page);}finally{await page.close();}}

it('initial_focus_is_whole_screen_until_confirmed_and_seed_is_camera_only',()=>run(async page=>{
  const f=await fixture(page);expect(f.prepares).toBe(0);await editor(page);expect(f.prepares).toBe(1);
  expect(await page.getByRole('radio',{name:/^03 —/}).isChecked()).toBe(true);expect(await page.getByText('Уточнить области',{exact:true}).evaluate(n=>(n.parentElement as HTMLDetailsElement).open)).toBe(false);
  f.info.seed={state:'ready',proposal:{x:.7,y:0,width:.2,height:.3},reason:null};await refresh(page);
  expect(await page.getByText(/Показан весь экран/).filter({visible:true}).count()).toBe(1);expect(await page.getByText(/Смена человека и короткое исчезновение/).filter({visible:true}).count()).toBe(1);
  await variant(page,'02');const draft=await saved(page);expect(draft.layout.focus).toBeNull();expect(draft.layout.camera).toEqual(f.info.seed.proposal);expect(f.applies).toHaveLength(0);
}));
it('roi_accessible_values_follow_target_and_clamp',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await page.getByText('Уточнить области',{exact:true}).click();
  await page.getByRole('combobox',{name:'Уточняемая область'}).selectOption('camera');
  const x=page.getByRole('slider',{name:'Камера: положение по горизонтали, %'}),width=page.getByRole('slider',{name:'Камера: ширина, %'});
  await width.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'80');n.dispatchEvent(new Event('input',{bubbles:true}));});await expect.poll(()=>x.inputValue()).toBe('20');expect(await x.getAttribute('max')).toBe('20');
  expect(await x.getAttribute('aria-valuetext')).toBe('20% ширины исходника');expect((await saved(page)).layout.camera.x).toBe(.2);
  await page.getByRole('combobox',{name:'Уточняемая область'}).selectOption('screen');expect(await page.getByRole('slider',{name:'Экран: ширина, %'}).inputValue()).toBe('100');expect(f.applies).toHaveLength(0);
}));
it('fractional canonical ROI survives target switch, End and clamp without native range sanitization',()=>run(async page=>{
  const f=await fixture(page);f.info.seed={state:'ready',proposal:{x:.333333,y:.2,width:.333333,height:.25},reason:null};await editor(page);
  await page.getByText('Уточнить области',{exact:true}).click();const target=page.getByRole('combobox',{name:'Уточняемая область'});await target.selectOption('camera');
  const width=page.getByRole('slider',{name:'Камера: ширина, %'}),x=page.getByRole('slider',{name:'Камера: положение по горизонтали, %'});
  expect(await width.inputValue()).toBe('33.3333');expect(await width.getAttribute('aria-valuetext')).toBe('33.3333% ширины исходника');
  await x.focus();await x.press('End');expect(await x.inputValue()).toBe('66.6667');expect((await saved(page)).layout.camera.x).toBe(.666667);
  await width.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'50');n.dispatchEvent(new Event('input',{bubbles:true}));});
  await expect.poll(()=>x.inputValue()).toBe('50');expect((await saved(page)).layout.camera.x).toBe(.5);expect(await x.getAttribute('max')).toBe('50');
  await target.selectOption('screen');expect(await page.getByRole('slider',{name:'Экран: ширина, %'}).inputValue()).toBe('100');await target.selectOption('camera');expect(await width.inputValue()).toBe('50');
  await page.evaluate(key=>sessionStorage.removeItem(key),storageKey);f.info.seed.proposal={x:.1,y:.2,width:.000001,height:.25};await page.reload();await mount(page);await editor(page);
  await page.getByText('Уточнить области',{exact:true}).click();await page.getByRole('combobox',{name:'Уточняемая область'}).selectOption('camera');
  expect(await page.getByRole('slider',{name:'Камера: ширина, %'}).inputValue()).toBe('0.0001');
  expect(await page.getByRole('slider',{name:'Камера: ширина, %'}).getAttribute('min')).toBe('0.0001');expect(f.applies).toHaveLength(0);
}));
for(const engine of [()=>chromiumBrowser,()=>webkitBrowser])it('focus controls stay inside a reduced selected screen after switching01 to03',()=>run(async page=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await fixture(page);await editor(page);await variant(page,'01');await page.getByText('Уточнить области',{exact:true}).click();
  const width=page.getByRole('slider',{name:'Экран: ширина, %',exact:true});
  await width.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'50');n.dispatchEvent(new Event('input',{bubbles:true}));});
  const x=page.getByRole('slider',{name:'Экран: положение по горизонтали, %',exact:true});
  const y=page.getByRole('slider',{name:'Экран: положение по вертикали, %',exact:true});
  await x.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'20');n.dispatchEvent(new Event('input',{bubbles:true}));});
  await y.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'10');n.dispatchEvent(new Event('input',{bubbles:true}));});
  await variant(page,'03');await width.focus();await width.press('End');expect(await width.getAttribute('max')).toBe('50');
  const state=await saved(page),focus=state.layout.focus??state.layout.screen;expect(state.layout.screen.width).toBe(.5);expect(focus).toMatchObject({width:.5});
  expect(focus.x+focus.width).toBeLessThanOrEqual(state.layout.screen.x+state.layout.screen.width);
  expect(focus.y+focus.height).toBeLessThanOrEqual(state.layout.screen.y+state.layout.screen.height);
  expect(await width.inputValue()).toBe('50');expect(await width.getAttribute('aria-valuetext')).toContain('50%');
  expect(await x.getAttribute('min')).toBe('20');expect(await y.getAttribute('min')).toBe('10');
  await width.evaluate((n:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(n,'25');n.dispatchEvent(new Event('input',{bubbles:true}));});
  await x.focus();await x.press('End');await y.focus();await y.press('End');
  expect(await x.inputValue()).toBe('45');expect(await y.inputValue()).toBe('35');
  expect((await saved(page)).layout.focus).toMatchObject({x:.45,y:.35,width:.25,height:.25});
  expect(await page.getByRole('alert').count()).toBe(0);expect(errors).toEqual([]);
},engine));
for(const status of [409,422,429])it(`fresh definitive${status} admission refusal retains the draft but permits a new request after version refresh and reload`,()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');const rejected:Record<string,unknown>[]=[];
  await page.route('**/api/trpc/clip.setLayout',route=>{rejected.push(route.request().postDataJSON());return route.fulfill({status,json:{error:{message:'Пересборка не принята',data:{upload:{code:'refused'}}}}});});
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();
  await expect.poll(async()=>(await saved(page)).submitted).toBeUndefined();
  expect((await saved(page)).layout.variant).toBe('01');await page.getByRole('button',{name:'Отмена',exact:true}).click();
  f.info.renderVersion=2;await mount(page);await editor(page);await variant(page,'02');
  await page.unroute('**/api/trpc/clip.setLayout');await confirm(page);
  expect(f.applies).toHaveLength(1);expect(f.applies[0]!.expected_render_version).toBe(2);expect((f.applies[0]!.layout as {variant:string}).variant).toBe('02');
  expect(f.applies[0]!.request_key).not.toBe(rejected[0]!.request_key);
}));
for(const retryStatus of [429,409])it(`unknown503 then replay${retryStatus} then success preserves one request identity and its original snapshot`,()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');
  const requests:Record<string,unknown>[]=[],accepted=new Map<string,Record<string,unknown>>();
  await page.route('**/api/trpc/clip.setLayout',route=>{
    const body=route.request().postDataJSON();requests.push(body);
    if(requests.length===1){accepted.set(body.request_key,body);return route.fulfill({status:503,json:{error:{message:'Ответ принятой операции потерян'}}});}
    if(requests.length===2)return route.fulfill({status:retryStatus,json:{error:{message:'Прежний исход не разрешён',...(retryStatus===409?{data:{upload:{code:'conflict'}}}:{})}}});
    if(!accepted.has(body.request_key))accepted.set(body.request_key,body);
    f.info.renderVersion=2;f.info.activeIntent={request_key:body.request_key,render_version:2,layout:body.layout,status:'pending'};
    return route.fulfill({status:202,json:{result:{data:{data:{request_key:body.request_key,render_version:2,status:'pending'}}}}});
  });
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>requests.length).toBe(1);
  await page.getByRole('button',{name:'Отмена',exact:true}).click();await variant(page,'02');
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>requests.length).toBe(2);
  expect((await saved(page)).submitted.request_key).toBe(requests[0]!.request_key);
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>page.getByRole('dialog').count()).toBe(0);
  expect(accepted.size).toBe(1);expect(requests[1]).toEqual(requests[0]);expect(requests[2]).toEqual(requests[0]);
  expect((await saved(page)).layout.variant).toBe('02');expect((await saved(page)).submitted.layout.variant).toBe('01');
}));
it('unknown unadmitted request followed by external publication and canonical409 permits a new confirmed request',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');const refused:Record<string,unknown>[]=[];
  await page.route('**/api/trpc/clip.setLayout',route=>{refused.push(route.request().postDataJSON());return route.fulfill({status:refused.length===1?503:409,json:{error:{message:'Synthetic unknown then canonical refusal',data:{upload:{code:'refused'}}}}});});
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>refused.length).toBe(1);
  await page.getByRole('button',{name:'Отмена',exact:true}).click();
  f.info.renderVersion=2;f.info.publishedRenderVersion=2;await refresh(page);await variant(page,'02');
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();
  await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();await expect.poll(()=>refused.length).toBe(2);
  expect(refused[1]).toEqual(refused[0]);await expect.poll(async()=>(await saved(page)).submitted).toBeUndefined();
  await page.getByRole('button',{name:'Отмена',exact:true}).click();await page.unroute('**/api/trpc/clip.setLayout');await confirm(page);
  expect(f.applies).toHaveLength(1);expect(f.applies[0]!.expected_render_version).toBe(2);
  expect((f.applies[0]!.layout as {variant:string}).variant).toBe('02');expect(f.applies[0]!.request_key).not.toBe(refused[0]!.request_key);
}));
it('confirmation_focus_and_semantic_status_announcements',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');
  await page.evaluate(()=>{const n=document.querySelector('[aria-live=polite][aria-atomic=true]')!;Reflect.set(window,'announcements',0);new MutationObserver(()=>Reflect.set(window,'announcements',Reflect.get(window,'announcements')+1)).observe(n,{childList:true,characterData:true,subtree:true});});
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();const dialog=page.getByRole('dialog',{name:'Применить оформление клипа'});
  expect(await dialog.locator('h3').evaluate(n=>n===document.activeElement)).toBe(true);
  await page.keyboard.press('Escape');expect(await page.getByRole('button',{name:'Применить оформление',exact:true}).evaluate(n=>n===document.activeElement)).toBe(true);
  expect(f.applies).toHaveLength(0);await page.waitForTimeout(5200);expect(await page.evaluate(()=>Reflect.get(window,'announcements'))).toBe(0);
}));
it('published camera veto explains its reason and next action once while unchanged polling stays quiet',()=>run(async page=>{
  const f=await fixture(page);f.info.seed={state:'unavailable',proposal:null,reason:'camera_unavailable'};
  f.info.renderVersion=2;f.info.publishedRenderVersion=2;f.info.publishedLayout={version:1,requested:{version:1,mode:'screen-face',variant:'03',
    screen:{x:0,y:0,width:1,height:1},focus:null,camera:{x:.75,y:0,width:.25,height:.3}},resolved:{cameraVisible:false,reason:'camera_unstable'}};
  await editor(page);const status=page.locator('[aria-live=polite][aria-atomic=true]');expect(await status.textContent()).toContain('В опубликованном клипе камера неустойчива');
  expect(await status.textContent()).toContain('Уточните область камеры');
  await status.evaluate(n=>{Reflect.set(window,'vetoAnnouncements',0);new MutationObserver(()=>Reflect.set(window,'vetoAnnouncements',Reflect.get(window,'vetoAnnouncements')+1)).observe(n,{childList:true,characterData:true,subtree:true});});
  await page.waitForTimeout(5200);expect(await page.evaluate(()=>Reflect.get(window,'vetoAnnouncements'))).toBe(0);expect(f.applies).toHaveLength(0);
}));
it('dirty_layout_survives_navigation_reload_and_late_seed',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');const before=await saved(page);
  f.info.seed={state:'ready',proposal:{x:.8,y:0,width:.2,height:.3},reason:null};await refresh(page);expect(await saved(page)).toEqual(before);
  await page.reload();await mount(page);await editor(page);expect(await page.getByRole('radio',{name:/^01 —/}).isChecked()).toBe(true);
  expect((await saved(page)).layout).toEqual(before.layout);expect(f.applies).toHaveLength(0);
}));
it('accepted_reload_failed_restores_editable_layout_draft',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');await confirm(page);const before=await saved(page);expect(before.submitted.acceptedRenderVersion).toBe(2);
  expect(f.applies).toHaveLength(1);f.info.activeIntent!.status='failed';await page.reload();await mount(page);await editor(page);
  expect(await page.getByRole('radio',{name:/^01 —/}).isChecked()).toBe(true);await variant(page,'02');expect((await saved(page)).draftVersion).toBeGreaterThan(before.draftVersion);
  expect((await saved(page)).layout.variant).toBe('02');expect(f.applies).toHaveLength(1);expect(await page.locator('.clip-card[data-selected=true] video').getAttribute('src')).toContain('?v=1');
}));
it('published_layout_clears_only_matching_draft',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');await confirm(page);expect(await saved(page)).not.toBeNull();
  f.info.publishedRenderVersion=2;f.info.publishedLayout={version:1,requested:f.info.activeIntent!.layout,resolved:{cameraVisible:false,reason:null}};f.info.activeIntent!.status='succeeded';
  await refresh(page);await expect.poll(()=>saved(page)).toBeNull();
}));
it('late_draft_edits_survive_older_publication including A→B→A monotonic version',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');await confirm(page);const accepted=await saved(page);
  await variant(page,'02');await variant(page,'01');const edited=await saved(page);expect(edited.draftVersion).toBe(accepted.draftVersion+2);
  f.info.publishedRenderVersion=2;f.info.publishedLayout={version:1,requested:f.info.activeIntent!.layout,resolved:{cameraVisible:false,reason:null}};f.info.activeIntent!.status='succeeded';
  await refresh(page);expect(await saved(page)).toEqual(edited);await page.reload();await mount(page);await editor(page);expect(await saved(page)).toEqual(edited);
}));
it('storage_failure_warns_before_loss_and_cancel_keeps_draft',()=>run(async page=>{
  await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw new DOMException('blocked','SecurityError');};});
  const f=await fixture(page);await editor(page);await variant(page,'01');expect(await page.getByText(/Черновик хранится только до ухода/).isVisible()).toBe(true);
  let asked=0;page.on('dialog',async d=>{asked++;await d.dismiss();});await page.locator(`[data-select-clip="${videoId}"]`).click();
  expect(asked).toBe(1);expect(await page.locator('.clip-card[data-selected=true]').getAttribute('data-clip-id')).toBe(clipId);expect(await page.getByRole('radio',{name:/^01 —/}).isChecked()).toBe(true);expect(f.applies).toHaveLength(0);
}));
it('successful unmounted logout clears only layout keys; failed logout and support cleanup retain drafts',()=>run(async page=>{
  await fixture(page);await editor(page);await variant(page,'01');const original=await saved(page);
  await page.evaluate(()=>window.dispatchEvent(new Event('n5:support-clear')));expect(await saved(page)).toEqual(original);
  await page.evaluate(()=>Reflect.get(window,'mountZoomSignOut')());await page.getByRole('button',{name:'Выйти из аккаунта',exact:true}).waitFor();expect(await saved(page)).toEqual(original);
  await page.route('**/api/auth/logout',r=>r.fulfill({status:503,body:'Synthetic logout failure'}));
  await page.getByRole('button',{name:'Выйти из аккаунта',exact:true}).click();await page.getByText('Не удалось выйти. Повторите попытку.',{exact:true}).waitFor();expect(await saved(page)).toEqual(original);
  await page.evaluate(()=>{sessionStorage.setItem('n5-upload-resume:v2:other','upload');sessionStorage.setItem('support-marker','support');sessionStorage.setItem('n5-clip-layout:v1:other:clip','other layout');});
  await page.route('**/api/auth/logout',r=>r.fulfill({status:200,body:'{}'}));await page.getByRole('button',{name:'Выйти из аккаунта',exact:true}).click();await page.waitForURL('**/#auth');
  expect(await page.evaluate(()=>Object.keys(sessionStorage).filter(k=>k.startsWith('n5-clip-layout:v1:')))).toEqual([]);
  expect(await page.evaluate(()=>[sessionStorage.getItem('n5-upload-resume:v2:other'),sessionStorage.getItem('support-marker')])).toEqual(['upload','support']);
}));
it('logout cleanup pauses mounted preview and blocked storage reports false without cross-account restore',()=>run(async page=>{
  const f=await fixture(page);await editor(page);await variant(page,'01');const before=await saved(page),player=await page.getByLabel('Исходник для предпросмотра').elementHandle();
  await player!.evaluate((node:HTMLVideoElement)=>node.play());
  await page.evaluate(()=>{Storage.prototype.removeItem=()=>{throw new DOMException('blocked','SecurityError');};});
  expect(await page.evaluate(()=>Reflect.get(window,'clearZoomDrafts')())).toBe(false);
  expect(await player!.evaluate((node:HTMLVideoElement)=>node.paused && !node.getAttribute('src'))).toBe(true);expect(await saved(page)).toEqual(before);
  f.info.accountScope='44444444-4444-4444-8444-444444444444';await editor(page);
  expect(await page.getByRole('radio',{name:/^03 —/}).isChecked()).toBe(true);expect(await page.getByText(/Не удалось сохранить его/).isVisible()).toBe(true);
  expect(f.applies).toHaveLength(0);
}));
it('pristine external publication refreshes settings while unknown replay keeps its original snapshot',()=>run(async page=>{
  const f=await fixture(page);await editor(page);
  f.info.renderVersion=2;f.info.publishedRenderVersion=2;f.info.publishedLayout={version:1,requested:{version:1,mode:'screen-face',variant:'01',screen:{x:0,y:0,width:1,height:1},focus:null,camera:null},resolved:{cameraVisible:false,reason:null}};
  await refresh(page);expect(await page.getByRole('radio',{name:/^01 —/}).isChecked()).toBe(true);
  let first=true;await page.route('**/api/trpc/clip.setLayout',r=>{if(first){first=false;return r.fulfill({status:503,json:{error:{message:'Результат запроса неизвестен'}}});}return r.fallback();});
  await page.getByRole('button',{name:'Применить оформление',exact:true}).click();await page.getByRole('checkbox',{name:/Я просмотрел/}).check();await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();
  await expect.poll(()=>saved(page)).not.toBeNull();const original=(await saved(page)).submitted;
  await page.getByRole('button',{name:'Отмена',exact:true}).click();await variant(page,'02');await page.getByRole('button',{name:'Применить оформление',exact:true}).click();
  expect(await page.getByRole('dialog').textContent()).toContain('Вариант 01');expect(await page.getByRole('dialog').textContent()).toContain('Последние правки сохранены отдельно');
  await page.getByRole('checkbox',{name:/Я просмотрел/}).check();await page.getByRole('button',{name:'Подтвердить пересборку',exact:true}).click();
  await expect.poll(()=>f.applies.length).toBe(1);expect(f.applies[0]!.request_key).toBe(original.request_key);expect(f.applies[0]!.layout).toEqual(original.layout);expect((await saved(page)).layout.variant).toBe('02');
}));
it('native preview visits retained segments and both canvas regions use the current decoded source frame',()=>run(async page=>{
  const f=await fixture(page);f.info.seed={state:'ready',proposal:{x:.75,y:0,width:.25,height:.3},reason:null};await editor(page);
  const chosen={version:1 as const,mode:'screen-face' as const,variant:'02' as const,screen:{x:0,y:0,width:1,height:1},focus:null,camera:f.info.seed.proposal};await variant(page,'02');
  const geometry=planScreenLayout(chosen,{width:320,height:180},true);expect(geometry.camera).not.toBeNull();
  const slider=page.getByRole('slider',{name:/Позиция в клипе/});
  for(const [output,source] of [[.08,.08],[2.48,2.48],[2.96,4.04],[3.44,4.52],[6.88,7.96]]){
    await slider.evaluate((node:HTMLInputElement,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(node,String(value));node.dispatchEvent(new Event('input',{bubbles:true}));},output!);
    await expect.poll(()=>page.getByLabel('Исходник для предпросмотра').evaluate((n:HTMLVideoElement)=>n.seeking)).toBe(false);
    expect(await page.getByLabel('Исходник для предпросмотра').evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeCloseTo(source!,2);
    const pixels=await page.evaluate(g=>{
      const video=document.querySelector<HTMLVideoElement>('video[aria-label="Исходник для предпросмотра"]')!,canvas=document.querySelector('canvas')!,reference=document.createElement('canvas');
      reference.width=video.videoWidth;reference.height=video.videoHeight;reference.getContext('2d')!.drawImage(video,0,0);
      return [g.screen,g.camera!].map(({source:s,destination:d})=>({
        actual:[...canvas.getContext('2d')!.getImageData(Math.floor(d.x+d.width/2),Math.floor(d.y+d.height/2),1,1).data].slice(0,3),
        expected:[...reference.getContext('2d')!.getImageData(Math.floor(s.x+s.width/2),Math.floor(s.y+s.height/2),1,1).data].slice(0,3)}));
    },geometry);
    for(const {actual,expected} of pixels)actual.forEach((v,i)=>expect(Math.abs(v-expected[i]!)).toBeLessThanOrEqual(4));
    const frame=Math.round(source!*25);
    expect(Math.abs(pixels[0]!.expected[0]!-(40+frame%160))).toBeLessThanOrEqual(4);
    expect(Math.abs(pixels[1]!.expected[1]!-(80+frame%120))).toBeLessThanOrEqual(4);
  }
  expect(f.applies).toHaveLength(0);
}));
it('every_media_play_pauses_the_other_two including already selected published player',()=>run(async page=>{
  await fixture(page);await editor(page);const published=page.locator('.clip-card[data-selected=true] video'),preview=page.getByLabel('Исходник для предпросмотра');
  await preview.evaluate((n:HTMLVideoElement)=>n.play());await published.evaluate((n:HTMLVideoElement)=>n.play());expect(await preview.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await preview.evaluate((n:HTMLVideoElement)=>n.play());expect(await published.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await page.getByRole('button',{name:'▷ Смотреть',exact:true}).click();const original=page.locator('[data-original-viewer] video');await expect.poll(()=>original.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);
  const originalNode=await original.elementHandle();
  await original.evaluate((n:HTMLVideoElement)=>n.play());expect(await preview.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await preview.evaluate((n:HTMLVideoElement)=>n.play());expect(await original.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await original.evaluate((n:HTMLVideoElement)=>n.play());expect(await preview.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await published.evaluate((n:HTMLVideoElement)=>n.play());expect(await originalNode!.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await page.getByRole('button',{name:'▷ Смотреть',exact:true}).click();await expect.poll(()=>original.evaluate((n:HTMLVideoElement)=>n.readyState)).toBeGreaterThanOrEqual(2);
  await original.evaluate((n:HTMLVideoElement)=>n.play());expect(await published.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await preview.evaluate((n:HTMLVideoElement)=>n.play());expect(await original.evaluate((n:HTMLVideoElement)=>n.paused)).toBe(true);
  await page.getByRole('button',{name:'← К клипам'}).click();
  const decoder=await preview.elementHandle();
  await page.getByText('Экран + камера',{exact:true}).filter({visible:true}).click();await expect.poll(()=>preview.count()).toBe(0);
  await expect.poll(()=>decoder!.evaluate((n:HTMLVideoElement)=>n.paused&&!n.hasAttribute('src'))).toBe(true);
}));

it('native Next HTTPS real PG Redis and fenced Cloud source preview admit one durable layout operation',async()=>{
  const database=process.env.DATABASE_URL,redis=process.env.REDIS_URL;
  if(!database || !new URL(database).pathname.endsWith('_test') || !redis || new URL(redis).pathname!=='/14')throw Error('Dedicated *_test PG and Redis14 required');
  const safety=liveS3Environment(),namespace=`tests/site/zoom_native_${randomUUID()}/`,scope={prefixes:[namespace]},audit=safety.receipt(namespace,'zoom-native-next');
  const client=createS3Client({...safety.config,keyPrefix:namespace});safety.bind(client,scope);safety.bind(client.signingClient!,scope);
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','testsrc2=s=320x180:r=2:d=20','-f','lavfi','-i','sine=frequency=440:duration=20','-threads','1','-c:v','libx264','-preset','ultrafast','-pix_fmt','yuv420p','-c:a','aac','-movflags','+faststart','-y',join(cache,'native-source.mp4')]);
  const nativeMp4=readFileSync(join(cache,'native-source.mp4'));
  const schema=`zoom_next_${randomBytes(7).toString('hex')}`,secret=randomBytes(32).toString('hex'),password='Synthetic-Zoom-2026!',nativeId=randomUUID(),nativeClip=randomUUID();
  const out=join(process.env.N5_SCREEN_ARTIFACT_DIR??cache,schema);mkdirSync(out,{recursive:true,mode:0o700});
  let pool:Pool|undefined,child:ChildProcess|undefined,proxy:HttpsServer|undefined,jar:Awaited<ReturnType<Browser['newContext']>>|undefined,primary:unknown,cleanup:unknown,logs='',nativePage:Page|undefined;
  let renderWorker:ReturnType<typeof createRenderWorker>|undefined,renderEvents:QueueEvents|undefined;
  const keys=['source.mp4','clip-v1.mp4'],transport=createQueues({redisUrl:redis});
  try{
    pool=createPool(database,schema);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);
    const auth=new AuthService(new PgAuthStore(pool,'credits_v1'),secret),emails=[`own-${schema}@test.invalid`,`foreign-${schema}@test.invalid`],ids:string[]=[];
    for(const email of emails){const token=await auth.register(email,password,'198.51.100.0/24');ids.push((await auth.authenticate(token))!.account_id);}
    for(const key of keys){audit.attempt(key);await client.send(new PutObjectCommand({Bucket:safety.config.bucket,Key:key,Body:nativeMp4,ContentType:'video/mp4'}));}
    await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,finished_at,clips_total,clips_done)
      VALUES($1,$2,$3,'upload',$4,$4,'source.mp4','done',20,now(),1,1)`,[nativeId,ids[0],randomUUID(),nativeMp4.length]);
    await pool.query(`INSERT INTO clip(id,video_id,"index",start_seconds,end_seconds,title,status,object_key,thumbnail_key,watermarked)
      VALUES($1,$2,1,0,20,'Настоящий экран','done','clip-v1.mp4',NULL,false)`,[nativeClip,nativeId]);
    await pool.query(`INSERT INTO clip_link(clip_id,code) VALUES($1,'WWWWWW')`,[nativeClip]);
    await pool.query(`INSERT INTO transcript(video_id,language,duration_seconds,chunk_count,words,segments) VALUES($1,'ru',20,1,'[{"word":"Привет","start":0,"end":1}]','[]')`,[nativeId]);
    // Existing initial-render advisory cache: this oracle covers render dispatch, not native face analysis.
    await new ClipLayoutRepository(pool,null).rememberSeed(nativeClip,null);
    const socket=httpServer();await new Promise<void>(r=>socket.listen(0,'127.0.0.1',r));const port=(socket.address() as import('node:net').AddressInfo).port;await new Promise<void>(r=>socket.close(()=>r()));
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(out,'key.pem'),'-out',join(out,'cert.pem'),'-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1'],{stdio:'pipe'});
    proxy=httpsServer({key:readFileSync(join(out,'key.pem')),cert:readFileSync(join(out,'cert.pem'))},(req,res)=>{
      const upstream=httpRequest({hostname:'127.0.0.1',port,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-for':'198.51.100.8,10.0.0.2,10.0.0.3','x-forwarded-proto':'https'}},response=>{res.writeHead(response.statusCode!,response.headers);response.pipe(res);});
      upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});res.on('close',()=>upstream.destroy());req.pipe(upstream);
    });
    // A five-digit loopback origin fails the real watermark startup width guard. Reserve our own short origin, never bypass the guard.
    for(let candidate=9780;candidate<9790;candidate++){
      const bound=await new Promise<boolean>((resolve,reject)=>{
        const failed=(error:NodeJS.ErrnoException)=>error.code==='EADDRINUSE'?resolve(false):reject(error);
        proxy!.once('error',failed);proxy!.listen(candidate,'127.0.0.1',()=>{proxy!.removeListener('error',failed);resolve(true);});
      });if(bound)break;
    }
    if(!proxy.listening)throw Error('No available short local fixture origin');
    const nativeOrigin=`https://127.0.0.1:${(proxy.address() as import('node:net').AddressInfo).port}`;
    const scoped=new URL(database);scoped.searchParams.set('options',`-c search_path=${schema},public`);
    const proofPath=join(out,'transport.json'),bootstrap=join(out,'transport.mjs');
    writeFileSync(bootstrap,`import{createRequire}from'node:module';import{writeFileSync}from'node:fs';import{liveS3Environment}from${JSON.stringify(resolve('tests/fixtures/environment.ts'))};
const require=createRequire(${JSON.stringify(resolve('package.json'))}),{S3Client}=require('@aws-sdk/client-s3'),safety=liveS3Environment(),scope=${JSON.stringify(scope)},bound=new WeakSet(),proof={bound:0,sends:0,gets:0};const save=()=>writeFileSync(${JSON.stringify(proofPath)},JSON.stringify(proof),{mode:0o600});
const bind=c=>{if(!bound.has(c)){safety.bind(c,scope);bound.add(c);proof.bound++;save();}};const send=S3Client.prototype.send;S3Client.prototype.send=function(...args){bind(this);if(this.signingClient)bind(this.signingClient);proof.sends++;save();return send.apply(this,args);};
const nativeFetch=globalThis.fetch.bind(globalThis);globalThis.fetch=(input,init)=>{const value=input instanceof Request?input.url:String(input);let url;try{url=new URL(value)}catch{return nativeFetch(input,init)}if(url.hostname==='s3.cloud.ru'||url.hostname.endsWith('.s3.cloud.ru')){proof.gets++;save();return safety.fetch(value,init??{},scope);}return nativeFetch(input,init);};save();`,{mode:0o600});
    const childEnv:NodeJS.ProcessEnv={...environment(),...process.env,NODE_ENV:'test',NEXT_TELEMETRY_DISABLED:'1',DATABASE_URL:scoped.href,REDIS_URL:redis,SESSION_SECRET:secret,N5_PUBLIC_ORIGIN:nativeOrigin,N5_BILLING_MODE:'credits_v1',N5_PAYMENTS_MODE:'off',N5_MAIL_MODE:'disabled',N5_CHECKOUT_ENABLED:'false',S3_ENDPOINT:safety.config.endpoint,S3_PUBLIC_ENDPOINT:safety.config.endpoint,S3_BUCKET:safety.config.bucket,S3_REGION:safety.config.region,S3_ACCESS_KEY:safety.config.accessKeyId,S3_SECRET_KEY:safety.config.secretAccessKey,S3_FORCE_PATH_STYLE:String(safety.config.forcePathStyle),S3_KEY_PREFIX:namespace};
    child=spawn(process.execPath,['--experimental-strip-types','--import',bootstrap,resolve('node_modules/next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(port)],{cwd:resolve('apps/web'),env:childEnv,stdio:['ignore','pipe','pipe']});child.stdout!.on('data',b=>{logs+=String(b);});child.stderr!.on('data',b=>{logs+=String(b);});
    let listening=false;for(let i=0;i<150;i++){if(child.exitCode!==null)throw Error('Native Next stopped; private log retained');try{if((await fetch(`http://127.0.0.1:${port}/`,{signal:AbortSignal.timeout(1000)})).ok){listening=true;break;}}catch{/* bounded readiness */}await new Promise(r=>setTimeout(r,100));}if(!listening)throw Error('Native Next readiness deadline');
    jar=await chromiumBrowser.newContext({ignoreHTTPSErrors:true,viewport:{width:1440,height:1000}});
    expect((await jar.request.post(nativeOrigin+'/api/auth/login',{headers:{origin:nativeOrigin},data:{email:emails[0],password}})).status()).toBe(200);
    const grants=(await pool.query('SELECT * FROM credit_grant ORDER BY id')).rows,charges=(await pool.query('SELECT * FROM video_credit_charge')).rows;
    const page=await jar.newPage();nativePage=page;await page.goto(`${nativeOrigin}/dashboard/videos/${nativeId}`);await editor(page,false);await variant(page,'01');
    await page.locator('.clip-card video').evaluate(n=>Reflect.set(window,'publishedNode',n));
    await page.getByRole('button',{name:'Смотреть весь фрагмент',exact:true}).click();await expect.poll(()=>page.getByLabel('Исходник для предпросмотра').evaluate((n:HTMLVideoElement)=>n.currentTime),{timeout:15000}).toBeGreaterThan(.1);
    expect(await page.locator('canvas').evaluate((n:HTMLCanvasElement)=>n.getContext('2d')!.getImageData(0,400,1080,800).data.some((v,i)=>i%4!==3 && v>100))).toBe(true);
    expect((await pool.query('SELECT count(*)::int n FROM job_attempt')).rows[0].n).toBe(0);
    expect((await pool.query('SELECT count(*)::int n FROM quota_counter')).rows[0].n).toBe(0);
    await confirm(page);const intent=(await pool.query('SELECT * FROM clip_layout_intent')).rows[0];expect(intent.render_version).toBe(2);
    // Inspect the first HTTP producer's retained payload before any test-side enqueue or consumer starts.
    const attempt=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1',[nativeClip])).rows[0]!;
    const queued=(await transport.queues.render.getJob(jobId(attempt)))!;
    expect(queued).toBeDefined();
    expect(Object.keys(queued.data).sort()).toEqual(['clip_id','fence','series_no','stage','video_id']);
    expect(queued.data).toEqual({video_id:nativeId,stage:'render',fence:attempt.fence,series_no:attempt.series_no,clip_id:nativeClip});
    expect((await pool.query('SELECT count(*)::int n FROM job_attempt')).rows[0].n).toBe(1);
    expect((await pool.query(`SELECT used FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].used).toBe(1);
    expect((await pool.query('SELECT object_key,rendered_layout FROM clip WHERE id=$1',[nativeClip])).rows[0]).toEqual({object_key:'clip-v1.mp4',rendered_layout:null});
    expect(await page.locator('.clip-card video').evaluate(n=>n===Reflect.get(window,'publishedNode'))).toBe(true);
    const body={clip_id:nativeClip,request_key:intent.request_key,expected_render_version:1,expected_source_revision:intent.source_revision,layout:intent.layout,reviewed_full_clip:true};
    expect((await jar.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:body})).status()).toBe(202);
    const mismatch=await jar.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:{...body,layout:{...intent.layout,variant:'02'}}});
    expect(mismatch.status()).toBe(409);expect((await mismatch.json()).error.data.upload.code).toBe('conflict');
    const refused=await jar.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:{...body,request_key:randomUUID()}});
    expect(refused.status()).toBe(409);expect((await refused.json()).error.data.upload.code).toBe('refused');
    expect((await pool.query('SELECT count(*)::int n FROM clip_layout_intent')).rows[0].n).toBe(1);expect((await pool.query(`SELECT used FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].used).toBe(1);
    expect((await pool.query('SELECT * FROM credit_grant ORDER BY id')).rows).toEqual(grants);expect((await pool.query('SELECT * FROM video_credit_charge')).rows).toEqual(charges);
    const foreign=await chromiumBrowser.newContext({ignoreHTTPSErrors:true});try{expect((await foreign.request.post(nativeOrigin+'/api/auth/login',{headers:{origin:nativeOrigin},data:{email:emails[1],password}})).status()).toBe(200);
      expect((await foreign.request.get(nativeOrigin+'/api/trpc/clip.layoutInfo?input='+encodeURIComponent(JSON.stringify({clip_id:nativeClip})))).status()).toBe(404);
      expect((await foreign.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:body})).status()).toBe(404);
      const unknown=randomUUID();
      expect((await foreign.request.get(nativeOrigin+'/api/trpc/clip.layoutInfo?input='+encodeURIComponent(JSON.stringify({clip_id:unknown})))).status()).toBe(404);
      expect((await foreign.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:{...body,clip_id:unknown}})).status()).toBe(404);
      expect((await jar.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:{...body,clip_id:unknown}})).status()).toBe(404);
    }finally{await foreign.close();}
    expect((await pool.query('SELECT count(*)::int n FROM clip_layout_intent')).rows[0].n).toBe(1);
    expect((await pool.query('SELECT count(*)::int n FROM job_attempt')).rows[0].n).toBe(1);
    expect((await pool.query(`SELECT used FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].used).toBe(1);
    const store=renderStorage({client,bucket:safety.config.bucket});
    const renderDir=join(cache,'native-render');mkdirSync(renderDir,{mode:0o700});
    const publishedKeys=[`clips/free/${nativeId}/${nativeClip}-v2.mp4`,`thumbs/${nativeId}/${nativeClip}-v2.jpg`];
    for(const key of publishedKeys){keys.push(key);audit.attempt(key);}
    // The untouched HTTP-created Redis job crosses into the actual registered consumer.
    renderEvents=new QueueEvents('render',{connection:getRedisConnection({redisUrl:redis})});await renderEvents.waitUntilReady();
    renderWorker=createRenderWorker(getRedisConnection({redisUrl:redis}),{pool,directory:renderDir,origin:'https://clipmkr.ru',
      download:s3Download({client,bucket:safety.config.bucket}),storage:store,enqueue:transport.enqueue});
    await renderWorker.waitUntilReady();await queued.waitUntilFinished(renderEvents,90_000);await renderWorker.close();renderWorker=undefined;
    expect((await pool.query('SELECT status FROM job_attempt WHERE video_id=$1 AND fence=$2',[nativeId,attempt.fence])).rows[0].status).toBe('succeeded');
    const publication=(await pool.query('SELECT object_key,rendered_layout FROM clip WHERE id=$1',[nativeClip])).rows[0];
    expect(publication.object_key).toBe(publishedKeys[0]);expect(publication.rendered_layout.requested).toEqual(intent.layout);
    await expect.poll(()=>page.locator('.clip-card video').getAttribute('src'),{timeout:10000}).toContain('?v=2');
    expect((await pool.query('SELECT * FROM credit_grant ORDER BY id')).rows).toEqual(grants);expect((await pool.query('SELECT * FROM video_credit_charge')).rows).toEqual(charges);
    expect((await pool.query(`SELECT used FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].used).toBe(1);
    const proof=JSON.parse(readFileSync(proofPath,'utf8'));expect(proof.bound).toBeGreaterThan(0);expect(proof.gets).toBeGreaterThan(0);
    await page.screenshot({path:join(out,'native-layout.png'),fullPage:true});
    await pool.query('UPDATE clip SET expires_at=now() WHERE id=$1',[nativeClip]);await pool.query('UPDATE video SET object_key=NULL WHERE id=$1',[nativeId]);
    const expiredReplay=await jar.request.post(nativeOrigin+'/api/trpc/clip.setLayout',{headers:{origin:nativeOrigin},data:body});
    expect(expiredReplay.status()).toBe(202);expect((await expiredReplay.json()).result.data.data).toMatchObject({replayed:true,status:'succeeded',render_version:2});
    expect((await pool.query(`SELECT used FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].used).toBe(1);
  }catch(error){primary=error;if(nativePage){writeFileSync(join(out,'failure-dom.html'),await nativePage.content(),{mode:0o600});writeFileSync(join(out,'failure-state.json'),JSON.stringify(await nativePage.evaluate(()=>({alerts:Array.from(document.querySelectorAll('[role=alert],[role=status]')).map(n=>n.textContent),media:Array.from(document.querySelectorAll<HTMLVideoElement>('video')).map(n=>({label:n.getAttribute('aria-label'),ready:n.readyState,error:n.error?.code,paused:n.paused,width:n.videoWidth,height:n.videoHeight,time:n.currentTime}))}))),{mode:0o600});}}finally{
    await renderWorker?.close();await renderEvents?.close();await jar?.close();if(proxy){proxy.closeAllConnections();await new Promise<void>(r=>proxy!.close(()=>r()));}
    if(child && child.exitCode===null){const ended=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child?.kill('SIGKILL'),4000);await ended;clearTimeout(timer);}writeFileSync(join(out,'next.log'),logs,{mode:0o600});
    try{audit.beginCleanup();for(const key of keys)await deleteObject({client,bucket:safety.config.bucket},key);audit.finish(true);}catch(error){cleanup=error;audit.finish(false);}finally{
      client.destroy();if(pool){try{
        for(const row of (await pool.query('SELECT video_id,fence FROM job_attempt')).rows){const job=await transport.queues.render.getJob(`render:${row.video_id}:${row.fence}`);await job?.remove();}
        for(const row of (await pool.query('SELECT clip_id,seed_revision FROM clip_layout_seed')).rows){const job=await transport.queues.render.getJob(`layout-seed-${row.clip_id}-${row.seed_revision}`);await job?.remove();}
        await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
      }finally{await pool.end();}}await transport.close();}
  }
  audit.report(primary,cleanup);
},180_000);
for(const engine of ['chromium','webkit'] as const)for(const width of [390,1440])for(const theme of ['dark','light'])
it(`native ${engine} real-video canvas responsive ${width} ${theme}`,()=>run(async page=>{
  await page.setViewportSize({width,height:1000});const f=await fixture(page);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await editor(page);
  await page.getByRole('button',{name:'Смотреть весь фрагмент',exact:true}).click();
  await expect.poll(()=>page.getByLabel('Исходник для предпросмотра').evaluate((n:HTMLVideoElement)=>n.currentTime)).toBeGreaterThan(.1);
  expect(await page.locator('canvas').evaluate((n:HTMLCanvasElement)=>n.getContext('2d')!.getImageData(0,400,1080,800).data.some((v,i)=>i%4!==3 && v>100))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(f.applies).toHaveLength(0);
  const out=process.env.N5_SCREEN_ARTIFACT_DIR;if(out){mkdirSync(out,{recursive:true,mode:0o700});await page.screenshot({path:join(out,`${engine}-${width}-${theme}.png`),fullPage:true});}
},()=>engine==='chromium'?chromiumBrowser:webkitBrowser));
