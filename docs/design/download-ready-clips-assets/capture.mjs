import { createServer } from '/home/clipmkr/node_modules/vite/dist/node/index.js';
import { chromium } from '/home/clipmkr/node_modules/playwright/index.mjs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../../', import.meta.url));
const out = dirname(fileURLToPath(import.meta.url));
const fixtureSource = 'tests/browser/ux-simplification.test.ts';
const fixtureFiles = ['apps/web/src/app/globals.css','apps/web/src/app/WorkspaceHeader.tsx','apps/web/src/app/WorkspaceSettings.tsx','apps/web/src/app/SupportLauncher.tsx','apps/web/src/app/dashboard/layout.tsx','apps/web/src/app/dashboard/LimitsPanel.tsx','apps/web/src/app/videos/VideoList.tsx','apps/web/src/app/videos/[videoId]/OriginalSource.tsx','apps/web/src/app/videos/[videoId]/OriginalSource.module.css','apps/web/src/app/clips/ClipCard.tsx','apps/web/src/lib/screen-contract.ts','apps/web/src/server/screen.ts','apps/web/src/app/dashboard/page.tsx','apps/web/src/app/dashboard/partner/page.tsx','apps/web/src/app/dashboard/videos/[videoId]/page.tsx','apps/web/src/app/dashboard/bloggers/page.tsx',fixtureSource];
const sourceFiles = {
  upload:'apps/web/src/app/upload/Uploader.tsx',
  'record-partial':'apps/web/src/app/videos/[videoId]/VideoDetail.tsx',
  'record-ready':'apps/web/src/app/videos/[videoId]/VideoDetail.tsx',
  stats:'apps/web/src/app/dashboard/PartnerPanel.tsx',
  report:'apps/web/src/app/dashboard/bloggers/BloggerAdmin.tsx',
};
const git = args => execFileSync('git',['-C',repo,...args]);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const sourcePaths = ['apps/web/src','apps/web/public','packages/shared',fixtureSource];
const commit = '99113c49b1bda3eafb4ca1897506e97ce70c4bf3';
const sourceDiff = git(['diff','--name-only',commit,'--',...sourcePaths]).toString().trim();
if (sourceDiff) throw Error(`Modified application sources:\n${sourceDiff}`);
const source = path => {
  const committed = git(['show',`${commit}:${path}`]);
  const sha256 = hash(committed);
  if (hash(readFileSync(join(repo,path))) !== sha256) throw Error(`Modified baseline file ${path}`);
  return {path,commit,sha256,blob:git(['rev-parse',`${commit}:${path}`]).toString().trim()};
};
const commonSources = fixtureFiles.map(source);
for (const path of new Set(Object.values(sourceFiles))) source(path);

const before=JSON.parse(readFileSync(join(out,'baseline.json'),'utf8'));
const diff=git(['diff','--name-only',before.commit,commit,'--',...sourcePaths]).toString().trim();
if(diff) throw Error(diff);
for(const item of before.screenshots) if(hash(readFileSync(join(out,item.file)))!==item.sha256) throw Error(item.file);
if (process.argv.includes('--verify-sources')) {
  console.log(`Source blobs and four baseline PNG hashes verified for ${commit}`);
  process.exit(0);
}
const cache = mkdtempSync(join(tmpdir(),'clipmkr-ux-current-'));
const recording = join(cache,'razgovor-demo.mp4');
const preview = join(cache,'clip-preview.mp4');
const poster = join(cache,'clip-poster.jpg');
for (const [media,seconds,size,rate] of [[recording,2160,'160x90','1/60'],[preview,32,'180x320','12']]) {
  execFileSync('ffmpeg',['-v','error','-f','lavfi','-i',`color=c=0x26232a:s=${size}:r=${rate}:d=${seconds}`,'-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-y',media]);
}
execFileSync('ffmpeg',['-v','error','-i',preview,'-frames:v','1','-threads','1','-y',poster]);
const files = [recording,preview,poster].map(path => ({name:path.split('/').at(-1),sha256:hash(readFileSync(path))}));
const entry = '\0ux-entry', nav = '\0ux-nav', link = '\0ux-link';
const server = await createServer({
  configFile:false,root:repo,cacheDir:join(cache,'vite'),esbuild:{jsx:'automatic'},
  optimizeDeps:{include:['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','zod','@noble/hashes/sha2.js'],exclude:['next/navigation','next/link']},
  resolve:{alias:Object.fromEntries(['upload','enums','cta','tariff','music-catalog','screen-layout','cut-timeline'].map(name=>[`@clipmaker/shared/${name}`,join(repo,`packages/shared/src/${name}.ts`)]))},
  server:{host:'127.0.0.1',port:0,watch:null},
  plugins:[{name:'ux-components',enforce:'pre',
    resolveId(id){if(id==='next/navigation')return nav;if(id==='next/link')return link;if(id===entry)return entry;},
    load(id){
      if(id===nav)return 'export const usePathname=()=>window.location.pathname;export const useRouter=()=>({push:p=>{history.pushState({},"",p)},refresh(){}});';
      if(id===link)return `import React from 'react';export default function Link(p){return React.createElement('a',p);}`;
      if(id===entry)return `
        import React from 'react';
        import {createRoot} from 'react-dom/client';
        import {VideoDetail} from '/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';
        import {VideoUploader} from '/apps/web/src/app/upload/Uploader.tsx';
        import {PartnerPanel} from '/apps/web/src/app/dashboard/PartnerPanel.tsx';
        import BloggerAdmin from '/apps/web/src/app/dashboard/bloggers/BloggerAdmin.tsx';
        import {WorkspacePreferenceSync} from '/apps/web/src/app/WorkspaceSettings.tsx';
        import {WorkspaceHeader} from '/apps/web/src/app/WorkspaceHeader.tsx';
        import {SupportLauncher} from '/apps/web/src/app/SupportLauncher.tsx';
        import {AuthFlowProvider} from '/apps/web/src/app/AuthFlow.tsx';
        import {LimitsPanel} from '/apps/web/src/app/dashboard/LimitsPanel.tsx';
        import {VideoList} from '/apps/web/src/app/videos/VideoList.tsx';
        const root=createRoot(document.getElementById('root'));
        const propsShared={initialTheme:document.documentElement.dataset.theme,initialLayout:'workspace'};
        const h=React.createElement;
        function Mounted(){React.useEffect(()=>{window.uiMounted=true},[]);return null;}
        function scene(kind,props){
          if(kind==='upload')return h(React.Fragment,null,
            h('div',{className:'workspace-upload'},
              h('div',{className:'workspace-main'},h(VideoUploader,props)),
              h('div',{className:'workspace-records-region'},h(VideoList,{videos:[],nextCursor:null}))),
            h('div',{className:'workspace-secondary'},h('details',null,h('summary',null,'Партнёрская программа'),
              h(PartnerPanel,{publicOrigin:'https://clipmkr.example'}))));
          if(kind==='stats')return h('div',{className:'workspace-partner-page'},
            h('header',{className:'workspace-title'},h('h1',null,'Статистика'),h('p',null,'Результаты вашей ссылки за всё время.')),
            h(PartnerPanel,props),h('a',{href:'/dashboard'},'← В кабинет'));
          if(kind==='report')return h(BloggerAdmin,props);
          return h(React.Fragment,null,
            kind==='record-partial'&&h('p',null,h('a',{className:'button secondary',href:'/support?videoId='+props.videoId},'Помощь с обработкой записи')),
            h(VideoDetail,props),h(LimitsPanel,{remaining:props.remaining}));
        }
        window.mountUI=(kind,props)=>root.render(h(React.Fragment,null,h(WorkspacePreferenceSync,propsShared),
          h(AuthFlowProvider,null,
            h('div',{className:'workspace-shell'},
              h(WorkspaceHeader,{owner:kind==='report',balanceLabel:kind==='report'?null:'84 кредитов',...propsShared}),
              h('main',{className:'container'},scene(kind,props))),
            h(SupportLauncher)),
          h(Mounted)));
        window.ready=true;`;
    },
    configureServer(vite){
      vite.middlewares.use(async(req,res,next)=>{
        if(req.url?.includes('/file?')){
          const media=readFileSync(preview);
          const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??'');
          const start=match?Number(match[1]):0;
          const end=match?.[2]?Math.min(Number(match[2]),media.length-1):media.length-1;
          res.writeHead(match?206:200,{'content-type':'video/mp4','accept-ranges':'bytes','content-length':end-start+1,...(match?{'content-range':`bytes ${start}-${end}/${media.length}`}:{})}).end(media.subarray(start,end+1));
          return;
        }
        if(!req.url?.startsWith('/fixture')){next();return;}
        const theme=new URL(req.url,'http://127.0.0.1').searchParams.get('theme')==='light'?'light':'dark';
        res.setHeader('content-type','text/html; charset=utf-8');
        res.end(await vite.transformIndexHtml('/fixture',`<!doctype html><html lang="ru" data-theme="${theme}" data-workspace-layout="workspace"><head><title>КлипМейкер</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><div id="root"></div><script type="module" src="/@id/__x00__ux-entry"></script></body></html>`));
      });
    },
  }],
});
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222', C='33333333-3333-4333-8333-333333333333';
const videoId='44444444-4444-4444-8444-444444444444';
const titles=['Как появился первый выпуск','Что изменилось в процессе','С чего начать'];
const time='2026-11-24T12:00:00Z';
const readyClips=[A,B,C].map((clip_id,i)=>({
  clip_id,index:i+1,start:i*40,end:i*40+[32,41,28][i],duration_seconds:[32,41,28][i],title:titles[i],
  status:'done',watermarked:false,available:true,expires_at:'2026-12-08T12:00:00Z',retention_state:'active',
  render_version:7,published_render_version:7,music_track_id:'none',rendered_music_track_id:'none',rerendering:false,
}));
const remaining={max_source_seconds:5400,credits:{available_seconds:5040,reserved_seconds:0,next_expiry:null},uploads:3,minutes:90,selections:5,resets_at:'2026-11-24T21:00:00Z'};
const readyVideo={video_id:videoId,status:'done',created_at:time,updated_at:time,duration_seconds:2160,user_state:'успех',stage_label:'Клипы готовы',stage_progress:100,clips_done:3,clips_total:3,no_response:false,failure_reason:null,next_action:null,retry_after:null,poll_after_seconds:5,cta_kind:'none',cta_url:null,failed_stage:null};
const partialVideo={...readyVideo,status:'failed',user_state:'отказ',stage_label:'Обработка не завершена',stage_progress:null,clips_done:2,credit_charge_seconds:2160,failure_reason:'Не удалось собрать клипы.',next_action:'retry',failed_stage:'render'};
const partialClips=readyClips.map((clip,index)=>index<2?clip:{...clip,status:'failed',available:false,expires_at:null,retention_state:'unknown',published_render_version:0});
const code=(id,value)=>({id,code:value,status:'active',created_at:'2026-11-01T00:00:00Z',blocked_reason:null});
const personal=code(A,'demo-video');
const partner={codes:[personal],counters:{visits:148,registrations:32,uploaded:18,shared:14,guests:3,purchases:5,revenue_minor:840000},statuses:[]};
const month='2026-11';
const blogger=(account_id,email,commission_percent,registrations,active_users,paying_users,revenue_minor,commission_estimate_minor)=>{
  const counters={registrations,active_users,paying_users,payments:paying_users,revenue_minor,commission_estimate_minor};
  return {account_id,email,commission_percent,counters,codes:[{...code(account_id,'demo-video'),counters}]};
};
const report={kind:'ok',month,bloggers:[blogger(A,'studio@example.com',20,24,12,5,840000,168000),blogger(B,'interview@example.com',null,8,3,1,120000,null)]};
const result=data=>({result:{data:{data}}});
const cases=[
  ['upload',{accountScope:A,creditMode:true,maxSourceSeconds:5400,availableSeconds:5040},'Обычный пользователь: 84 кредита, выбран синтетический razgovor-demo.mp4 длительностью 36 минут; загрузка не запущена.'],
  ['record-partial',{videoId,initialVideo:partialVideo,initialClips:partialClips,remaining,paymentsOn:true,creditMode:true,consentHash:'qa-consent-v1'},'Обычный пользователь: запись 36 минут, два из трёх клипов доступны, повтор монтажа доступен, 36 кредитов списаны один раз. Видео — синтетическая однотонная заглушка.'],
  ['record-ready',{videoId,initialVideo:readyVideo,initialClips:readyClips,remaining,paymentsOn:true,creditMode:true,consentHash:'qa-consent-v1'},'Обычный пользователь: запись 36 минут, три клипа длительностью 32, 41 и 28 секунд. Видео — синтетическая однотонная заглушка.'],
  ['stats',{personal:true,presentation:'statistics',publicOrigin:'https://clipmkr.example'},'Блогер: активная демонстрационная ссылка, 148 переходов, 32 регистрации, 18 загрузок, 5 покупок, 8 400 ₽.'],
  ['report',{},'Владелец: ноябрь 2026, два вымышленных блогера, одна ставка 20%, оборот 8 400 ₽ и 1 200 ₽.'],
];
const browser = await chromium.launch({args:['--disable-dev-shm-usage']});
const screenshots=[];
const edgeCases=[];
const manifest={commit,beforeCommit:before.commit,browser:`Chromium ${browser.version()}`,viewportHeight:900,deviceScaleFactor:1,fixtureTime:time,commonSources,media:files,before:before.screenshots,after:screenshots,edgeCases};
async function capture([scene,props,synthetic],theme,width,expected){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,locale:'ru-RU',timezoneId:'Europe/Moscow',colorScheme:theme,reducedMotion:'reduce'});
  try {
    const page=await context.newPage();
    await page.clock.setFixedTime(new Date(time));
    const pageErrors=[];
    page.on('pageerror',error=>pageErrors.push(error.message));
    await page.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin)return route.abort('blockedbyclient');
      if(url.pathname==='/api/owner/bloggers'&&route.request().method()==='GET') return route.fulfill({json:{data:report}});
      if(url.pathname.startsWith('/api/trpc/')){
        const procedure=url.pathname.split('/').at(-1);
        if(procedure==='partner.ensurePersonalLink'&&scene==='stats')return route.fulfill({json:result(personal)});
        if(procedure==='partner.dashboard'&&['stats','upload'].includes(scene))return route.fulfill({json:result(partner)});
        if(procedure==='video.get'&&props.initialVideo)return route.fulfill({json:result(props.initialVideo)});
        if(procedure==='clip.list'&&props.initialClips)return route.fulfill({json:result({clips:props.initialClips})});
        return route.abort('blockedbyclient');
      }
      if (props.initialVideo && url.pathname===`/api/videos/${videoId}/original`&&url.searchParams.has('metadata')) {
        return route.fulfill({json:{videoId,state:'ready',available:true,sourceRevision:'fixture-video-v1',
          media:{kind:'video',mime:'video/mp4',extension:'mp4',bytes:String(67108864),durationSeconds:2160}}});
      }
      if (props.initialVideo && url.pathname.endsWith('/thumbnail')) return route.fulfill({path:poster});
      if(url.pathname.startsWith('/api/')&&!url.pathname.includes('/file'))return route.abort('blockedbyclient');
      return route.continue();
    });
    const response=await page.goto(`${origin}/fixture?theme=${theme}`);
    if(!response?.ok())throw Error(`Fixture HTTP ${response?.status()}`);
    await page.waitForFunction(()=>window.ready,null,{timeout:12000});
    await page.evaluate(({scene,props})=>window.mountUI(scene,props),{scene,props});
    await page.waitForFunction(()=>window.uiMounted);
    if(expected>0){
      await page.getByText(titles[0],{exact:true}).first().waitFor();
      await page.getByRole('button',{name:'▷ Смотреть',exact:true}).waitFor();
      await page.getByRole('button',{name:'Скачать клип',exact:true}).waitFor();
    }
    if(scene==='record-partial'){
      const status=page.locator('.status-panel');
      await status.getByRole('button',{name:'Повторить',exact:true}).waitFor();
      await status.getByText(/2160 секунд · 36 кредитов/).waitFor();
      await status.getByRole('link',{name:'Выбрать пакет',exact:true}).waitFor();
      await page.getByRole('link',{name:'Помощь с обработкой записи',exact:true}).waitFor();
    } else if(expected>0) await page.getByText('Клипы готовы',{exact:true}).waitFor();
    await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
    const fixture=await page.evaluate(clips=>{
      const intro=document.querySelector('.studio-ready-intro');
      if(!intro)throw Error('Нет сводки записи');
      const files=clips.filter(clip=>clip.status==='done'&&clip.available&&clip.retention_state!=='expired'&&(!clip.expires_at||Date.parse(clip.expires_at)>Date.now()));
      if(files.length>=2){
        const button=document.createElement('button');
        button.type='button';
        button.className='secondary';
        button.dataset.demoBulk='';
        button.textContent=`Скачать все готовые (${files.length})`;
        button.addEventListener('click',()=>{
          let status=intro.querySelector('[data-demo-result]');
          if(!status){
            status=document.createElement('p');
            status.dataset.demoResult='';
            status.setAttribute('role','status');
            button.after(status);
          }
          status.textContent=`В макете запрошено файлов: ${files.length}. Если браузер блокирует несколько скачиваний, используйте кнопки на отдельных клипах.`;
          window.demoRequested=files.map(file=>file.clip_id);
        });
        intro.append(button);
      }
      return {eligible:files.map(file=>file.clip_id),buttonCount:intro.querySelectorAll('[data-demo-bulk]').length};
    },props.initialClips);
    if(fixture.eligible.length!==expected||fixture.buttonCount!==Number(expected>=2))throw Error(JSON.stringify(fixture));
    if(expected<2){
      if(pageErrors.length)throw Error(pageErrors.join());
      edgeCases.push({width,eligible:expected,bulkButtons:fixture.buttonCount,pageErrors});
      return;
    }
    const button=page.getByRole('button',{name:`Скачать все готовые (${expected})`,exact:true});
    const position=await button.boundingBox();
    if(!position)throw Error('Кнопка скрыта');
    const observation=await page.evaluate(()=>({width:document.documentElement.scrollWidth,theme:document.documentElement.dataset.theme,layout:document.documentElement.dataset.workspaceLayout,headings:Array.from(document.querySelectorAll('main h1'),node=>node.textContent)}));
    if(pageErrors.length || observation.theme!==theme || observation.layout!=='workspace' || observation.width!==width || !observation.headings.length)throw Error(JSON.stringify({pageErrors,observation}));
    const file=`after-${scene}-${theme}-${width}.png`;
    const bytes=await page.screenshot({path:join(out,file),fullPage:true,animations:'disabled',caret:'hide'});
    const downloadRequests=[];
    page.on('request',request=>{if(new URL(request.url()).searchParams.has('download'))downloadRequests.push(request.url());});
    await button.click();
    const status=await page.locator('[data-demo-result]').textContent();
    const requested=await page.evaluate(()=>window.demoRequested);
    if(JSON.stringify(requested)!==JSON.stringify(fixture.eligible)||!status.includes(`файлов: ${expected}`)||downloadRequests.length||pageErrors.length)throw Error(JSON.stringify({status,requested,downloadRequests,pageErrors}));
    if(await page.evaluate(()=>document.documentElement.scrollWidth)!==width)throw Error('Переполнение после нажатия');
    screenshots.push({scene,theme,width,height:bytes.readUInt32BE(20),file,source:source(sourceFiles[scene]),synthetic,sha256:hash(bytes),headings:observation.headings,position,requested,status,downloadRequests:downloadRequests.length,horizontalOverflow:false,pageErrors});
    console.log(file);
  } catch(error) {
    console.error(scene,theme,width,error.message);
    throw error;
  } finally {await context.close();}
}
try {
  const records=cases.filter(([scene])=>scene.startsWith('record'));
  for(const width of [390,1440]){
    for(const info of records) await capture(info,'dark',width,info[0]==='record-ready'?3:2);
  }
  const [scene,props,synthetic]=records.find(([kind])=>kind==='record-ready');
  for(const count of [1,0])await capture([scene,{...props,initialVideo:{...readyVideo,clips_done:count,clips_total:count},initialClips:readyClips.slice(0,count)},synthetic],'dark',390,count);
  screenshots.sort((a,b)=>a.scene.localeCompare(b.scene)||a.theme.localeCompare(b.theme)||a.width-b.width);
  writeFileSync(join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
} finally {await browser.close();await server.close();rmSync(cache,{recursive:true,force:true});}
