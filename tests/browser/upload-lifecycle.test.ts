import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtempSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { axeRule, domRules, textZoomRule } from '../../scripts/responsive/rules.mjs';
import type { VideoScreen } from '../../apps/web/src/lib/screen-contract';
import { VideoUploader } from '../../apps/web/src/app/upload/Uploader';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
const scope='11111111-1111-4111-8111-111111111111',videoId='22222222-2222-4222-8222-222222222222';
const key='33333333-3333-4333-8333-333333333333',storageKey=`n5-upload-resume:v2:${scope}`;
const partSize=10*1024*1024,bytes=Buffer.alloc(partSize+8,65),digest=createHash('sha256').update(bytes).digest('hex');
const file={name:'fixture.mp4',mimeType:'video/mp4',buffer:bytes};
const manifest={version:2,accountScope:scope,key,identityAlgorithm:'sha256',contentSha256:digest,size:bytes.length,originalFilename:'original.mp4',
  options:{music:true,teaser:false,compact:false,ctaKind:'none',ctaUrl:null}};
const entry='\0upload-lifecycle-entry',navigation='\0upload-lifecycle-navigation',link='\0upload-lifecycle-link';
const cacheDirectory=mkdtempSync(join(tmpdir(),'clipmkr-upload-vite-'));
let server:ViteDevServer,origin:string;
beforeAll(async()=>{
  const markup=renderToString(createElement(VideoUploader,{accountScope:scope}));
  server=await createServer({configFile:false,cacheDir:cacheDirectory,root:process.cwd(),esbuild:{jsx:'automatic'},
    optimizeDeps:{include:['react','react-dom','react-dom/client','react/jsx-dev-runtime'],exclude:['next/navigation','next/link']},
    resolve:{alias:{'@clipmaker/shared/enums':resolve('packages/shared/src/enums.ts'),'@clipmaker/shared/upload':resolve('packages/shared/src/upload.ts'),'@clipmaker/shared/cta':resolve('packages/shared/src/cta.ts'),'@clipmaker/shared/tariff':resolve('packages/shared/src/tariff.ts'),'@clipmaker/shared/music-catalog':resolve('packages/shared/src/music-catalog.ts'),'@clipmaker/shared/screen-layout':resolve('packages/shared/src/screen-layout.ts'),'@clipmaker/shared/cut-timeline':resolve('packages/shared/src/cut-timeline.ts')}},
    server:{host:'127.0.0.1',port:0,watch:{ignored:['**/.next/**','**/dist/**']}},plugins:[{name:'upload-lifecycle-fixture',enforce:'pre',
      resolveId(id){if(id==='next/navigation')return navigation;if(id==='next/link')return link;if(id===entry)return entry;},
      load(id){
        if(id===link)return `import {createElement} from 'react';export default function Link(props){return createElement('a',props);}`;
        if(id===navigation)return `import {createElement} from 'react';import {createRoot} from 'react-dom/client';import {VideoDetail} from '/apps/web/src/app/videos/[videoId]/VideoDetail.tsx';import {rpc} from '/apps/web/src/lib/rpc.ts';
          export const useRouter=()=>({push:async path=>{window.uploadNavigations.push(path);window.uploadRoot.unmount();history.pushState({},'',path);
            const video=await rpc('video.get',{video_id:path.split('/').at(-1)});document.querySelector('main').innerHTML='<div id="accepted-screen"></div>';
            window.detailRoot=createRoot(document.getElementById('accepted-screen'));window.detailRoot.render(createElement(VideoDetail,{videoId:video.video_id,initialVideo:video,initialClips:[],initialPacks:[]}));},refresh(){}});`;
        if(id===entry)return `import {createElement,StrictMode} from 'react';import {hydrateRoot} from 'react-dom/client';import {VideoUploader} from '/apps/web/src/app/upload/Uploader.tsx';
          window.documentMarker=crypto.randomUUID();window.uploadNavigations=[];window.uploadRoot=hydrateRoot(document.getElementById('upload-root'),createElement(StrictMode,null,createElement(VideoUploader,{accountScope:'${scope}',recoveryIntent:location.search.includes('recovery')})));window.setUploadScope=accountScope=>window.uploadRoot.render(createElement(StrictMode,null,createElement(VideoUploader,{accountScope})));`;
      },configureServer(vite){vite.middlewares.use(async(req,res,next)=>{
        if(req.url?.startsWith('/away.html')){res.setHeader('Content-Type','text/html');res.end('<!doctype html><a href="/fixture.html">Вернуться</a><p>Ушли</p>');return;}
        if(!req.url?.startsWith('/fixture.html')){next();return;}
        res.setHeader('Content-Type','text/html; charset=utf-8');res.end(await vite.transformIndexHtml('/fixture.html',`<!doctype html><html lang="ru" data-theme="dark"><head><title>Загрузка — КлипМейкер</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/apps/web/src/app/globals.css"></head><body><nav class="navigation"><a id="away" href="/away.html">Другая страница</a><a id="hash" href="#source-file">К файлу</a><a id="blank" target="_blank" href="/away.html">Новая вкладка</a></nav><main class="container"><div id="upload-root" class="workspace-shell">${markup}</div></main><script type="module" src="/@id/__x00__upload-lifecycle-entry"></script></body></html>`));
      });}}]});await server.listen();const address=server.httpServer?.address();if(!address||typeof address==='string')throw new Error('Нет loopback порта');origin=`http://127.0.0.1:${address.port}`;
});
afterAll(async()=>{await server?.close();rmSync(cacheDirectory,{recursive:true,force:true});});
const poll=<T,>(callback:()=>T|Promise<T>)=>expect.poll(callback,{timeout:10000});
async function saved(page:Page){return page.evaluate(k=>{const raw=sessionStorage.getItem(k);return raw?JSON.parse(raw):null;},storageKey);}
async function choose(page:Page,selected=file){await page.locator('#source-file').setInputFiles(selected);await poll(async()=>`${await page.getByRole('status').textContent()} ${await page.getByRole('alert').allTextContents()}`).toMatch(/Файл совпадает|Файл проверен|Выбран другой файл/);}
async function continueUpload(page:Page){await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).click();}
async function setup(browser:Browser,run:(page:Page,c:{release:()=>void;creates:()=>number;puts:()=>number;completes:()=>number;bodies:()=>Record<string,unknown>[];keys:()=>string[];setStatus:(value:number)=>void;setScopeMismatch:()=>void})=>Promise<void>,options:{session?:object;legacy?:boolean;completeStatus?:number;hold?:'put'|'create'|'complete';storageFail?:string;acceptedPart?:boolean;putStatus?:number;actualStage?:'done'|'failed'|'transcribing'|'uploading'}={}){
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(10000);const pageErrors:string[]=[];page.on('pageerror',error=>{pageErrors.push(error.message);process.stdout.write(`Browser fixture: ${error.message}\n`);});let release!:()=>void;
  const gate=new Promise<void>(resolveGate=>{release=resolveGate;});let creates=0,puts=0,completes=0,status=options.completeStatus??202,mismatch=false;
  const bodies:Record<string,unknown>[]=[],keys:string[]=[],completed=new Set<number>(options.acceptedPart?[1]:[]);
  await context.addInitScript(({storageKey,session,legacy,storageFail})=>{
    if(session&&!sessionStorage.getItem('initialized')){sessionStorage.setItem(storageKey,JSON.stringify(session));sessionStorage.setItem('initialized','yes');}
    if(legacy)sessionStorage.setItem('n5-upload-resume','{"fingerprint":"old"}');
    if(storageFail){const original=Storage.prototype.setItem;(window as Window&{restoreStorage?:()=>void}).restoreStorage=()=>{Storage.prototype.setItem=original;};Storage.prototype.setItem=function(k,v){if(k===storageKey&&(storageFail==='before-create'||storageFail==='noop'||(storageFail==='receipt'&&JSON.parse(v).videoId)||(storageFail==='parts'&&JSON.parse(v).parts))){if(storageFail==='noop')return;throw new Error('blocked');}return original.call(this,k,v);};}
  },{storageKey,session:options.session,legacy:options.legacy,storageFail:options.storageFail});
  const actualStage=options.actualStage??'done';
  const screen:VideoScreen={video_id:videoId,status:actualStage,created_at:new Date().toISOString(),updated_at:new Date().toISOString(),duration_seconds:null,
    user_state:actualStage==='done'?'успех':actualStage==='failed'?'отказ':'выполняется',stage_label:actualStage==='transcribing'?'Расшифровываем':actualStage==='uploading'?'Передача файла не завершена. Обработка ещё не началась':actualStage==='failed'?'Обработка не завершена':'Клипы готовы',
    stage_progress:actualStage==='uploading'?null:25,clips_done:0,clips_total:0,no_response:false,failure_reason:actualStage==='failed'?'Не удалось расшифровать речь.':null,next_action:null,retry_after:null,poll_after_seconds:5,cta_kind:'none',cta_url:null,failed_stage:actualStage==='failed'?'transcribe':null};
  await page.route('**/api/trpc/video.get?*',route=>route.fulfill({json:{result:{data:{data:screen}}}}));
  await page.route('**/api/trpc/clip.list?*',route=>route.fulfill({json:{result:{data:{data:{clips:[]}}}}}));
  await page.route('**/api/trpc/video.create',async route=>{
    creates++;bodies.push(route.request().postDataJSON());keys.push(route.request().headers()['idempotency-key']!);
    if(options.hold==='create')await gate;
    if(mismatch){await route.fulfill({status:409,json:{error:{message:'Аккаунт изменился. Обновите страницу'}}});return;}
    await route.fulfill({json:{result:{data:{data:{video_id:videoId,upload_id:'same-upload',part_size:partSize,
      parts:[1,2].filter(n=>!completed.has(n)).map(part_number=>({part_number,url:`${origin}/fixture-part/${part_number}`,expires_at:new Date(Date.now()+60000).toISOString()})),
      completed_parts:[...completed].map(part_number=>({part_number,etag:`"part-${part_number}"`}))}}}}});
  });
  await page.route('**/fixture-part/*',async route=>{const part=Number(new URL(route.request().url()).pathname.split('/').at(-1));puts++;
    if(options.hold!=='create'&&options.hold!=='complete')await gate;completed.add(part);
    await route.fulfill({status:options.putStatus??200,headers:{etag:`"part-${part}"`}}).catch(()=>{});
  });
  await page.route('**/api/upload/complete',async route=>{completes++;expect(route.request().postDataJSON()).toMatchObject({video_id:videoId,parts:[{part_number:1},{part_number:2}]});
    if(options.hold==='complete')await gate;await route.fulfill({status,json:status===202?{data:{video_id:videoId,status:'queued'}}:{error:{message:'Завершение временно недоступно'}}}).catch(()=>{});
  });
  try{await page.goto(`${origin}/fixture.html`);await page.waitForFunction(()=>!!(window as Window&{uploadRoot?:unknown}).uploadRoot);
    await run(page,{release,creates:()=>creates,puts:()=>puts,completes:()=>completes,bodies:()=>bodies,keys:()=>keys,setStatus:value=>{status=value;},setScopeMismatch:()=>{mismatch=true;}});expect(pageErrors).toEqual([]);
  }finally{release();await context.close();}
}
for(const [name,engine]of Object.entries({chromium,webkit}))describe(`upload recovery ${name}`,()=>{
  let browser:Browser;beforeAll(async()=>{browser=await engine.launch();});afterAll(async()=>{await browser?.close();});
  it('pause_reselect_requires_separate_continue',async()=>{
    await setup(browser,async(page,c)=>{
      await choose(page);expect(c.creates()).toBe(0);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      const before=await saved(page);await page.getByRole('button',{name:'Приостановить загрузку'}).click();
      expect(await page.locator('#source-file').inputValue()).toBe('');expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);
      await choose(page);expect(c.creates()).toBe(1);expect(c.completes()).toBe(0);expect(await saved(page)).toEqual(before);
      const chooserEvent=page.waitForEvent('filechooser');await page.locator('#source-file-picker').click();await (await chooserEvent).setFiles([]);
      expect(await saved(page)).toEqual(before);expect(c.creates()).toBe(1);expect(await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).isDisabled()).toBe(true);
      await choose(page);await continueUpload(page);await poll(c.creates).toBe(2);expect(c.keys()[0]).toBe(c.keys()[1]);c.release();await poll(()=>page.url()).toContain(`/dashboard/videos/${videoId}`);
    });
  });
  it('native_picker_and_options_survive_layout',async()=>{
    await setup(browser,async(page,c)=>{
      await page.locator('.workspace-upload-options > summary').click();
      await page.getByLabel('Добавить музыку и финальный акцент').check();
      await page.evaluate(()=>{
        const w=window as Window&{chosen?:File;slices?:Blob[];stableInput?:HTMLInputElement};
        w.stableInput=document.querySelector<HTMLInputElement>('#source-file')!;w.slices=[];
        w.stableInput.addEventListener('change',()=>{w.chosen=w.stableInput!.files![0];},true);
        const original=File.prototype.slice;File.prototype.slice=function(...args){w.slices!.push(this);return original.apply(this,args);};
      });
      const dialog=page.waitForEvent('filechooser');await page.locator('#source-file-picker').click();await (await dialog).setFiles(file);
      await poll(()=>page.getByRole('status').textContent()).toContain('Файл проверен');
      expect(c.creates()).toBe(0);
      await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      const before=await saved(page);
      await page.evaluate(()=>{document.documentElement.dataset.workspaceLayout='studio';document.documentElement.dataset.theme='light';});
      expect(await page.evaluate(()=>{
        const w=window as Window&{chosen?:File;slices?:Blob[];stableInput?:HTMLInputElement};
        return !!w.chosen&&w.chosen instanceof File&&w.chosen.size===10485768&&w.stableInput===document.querySelector('#source-file')&&w.stableInput.isConnected&&w.slices!.length>0&&w.slices!.every(item=>item===w.chosen);
      })).toBe(true);
      expect(await page.getByLabel('Добавить музыку и финальный акцент').isChecked()).toBe(true);
      expect(await saved(page)).toEqual(before);expect(c.creates()).toBe(1);expect(c.completes()).toBe(0);
      await page.getByRole('button',{name:'Приостановить загрузку'}).click();
      expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);
    });
  });
  it('paused_progress_never_becomes_full_manifest',async()=>{
    await setup(browser,async(page,c)=>{
      expect(await page.locator('.workspace-transfer').textContent()).toContain('уточним после продолжения');
      expect(await page.locator('.workspace-transfer progress').getAttribute('value')).toBeNull();
      await choose(page);expect(c.creates()).toBe(0);await continueUpload(page);await poll(c.puts).toBe(1);
      expect(await page.locator('.workspace-transfer progress').getAttribute('value')).toBe(String(partSize));
      const before=await saved(page);expect(before.parts).toBeUndefined();
      await page.getByRole('button',{name:'Приостановить загрузку'}).click();
      expect(await page.locator('.workspace-transfer').textContent()).toContain('Подтверждено в последней попытке');
      c.release();await page.waitForTimeout(100);
      expect(await page.locator('.workspace-transfer progress').getAttribute('value')).toBe(String(partSize));
      expect(await saved(page)).toEqual(before);expect(c.completes()).toBe(0);
      await page.reload();await page.waitForSelector('#source-file-picker');
      expect(await page.locator('.workspace-transfer progress').getAttribute('value')).toBeNull();
      expect(await page.locator('.workspace-transfer').textContent()).toContain('уточним после продолжения');
      expect(c.creates()).toBe(1);
    },{session:manifest,acceptedPart:true});
  });
  it('full_manifest_reload_reports_transfer_only_and_requires_continue',async()=>{
    const full={...manifest,videoId,partSize,parts:[{part_number:1,etag:'first'},{part_number:2,etag:'tail'}]};
    await setup(browser,async(page,c)=>{
      expect(await page.locator('.workspace-transfer progress').getAttribute('value')).toBe(String(bytes.length));
      expect(await page.locator('.workspace-transfer').textContent()).toContain('100%');
      expect(await page.locator('.workspace-transfer').textContent()).toContain('ещё не означает начало обработки');
      await choose(page);expect(c.creates()).toBe(0);expect(c.completes()).toBe(0);await continueUpload(page);
      await poll(c.completes).toBe(1);expect(c.puts()).toBe(0);expect(c.creates()).toBe(0);
      c.release();await poll(()=>page.url()).toContain(`/dashboard/videos/${videoId}`);
    },{session:full,hold:'complete'});
  });
  it('resume_uses_same_key_and_missing_parts',async()=>{
    await setup(browser,async(page,c)=>{
      await choose(page,{...file,name:'renamed.mp4'});expect(c.creates()).toBe(0);await continueUpload(page);await poll(c.puts).toBe(1);
      expect(c.keys()).toEqual([key]);expect(c.bodies()[0]).toMatchObject({filename:'original.mp4',music:true,teaser:false,compact:false,account_scope:scope});
      c.release();await poll(()=>page.locator('#accepted-screen').count()).toBe(1);expect(c.completes()).toBe(1);
    },{session:manifest,acceptedPart:true});
  });
  it('hash_mismatch_never_mixes_parts',async()=>{
    await setup(browser,async(page,c)=>{const changed=Buffer.from(bytes);changed[partSize/2]=66;await choose(page,{...file,buffer:changed});
      expect(await page.getByRole('alert').textContent()).toContain('Выбран другой файл');expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);expect(c.creates()).toBe(0);expect(await saved(page)).toEqual(manifest);
      await page.locator('#source-file').dispatchEvent('cancel');expect(c.puts()).toBe(0);expect(await saved(page)).toEqual(manifest);
    },{session:manifest});
  });
  it('legacy_or_lost_cache_never_autostarts',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);expect(c.creates()).toBe(0);expect(c.puts()).toBe(0);expect(await saved(page)).toBeNull();
      expect(await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).count()).toBe(0);
    },{legacy:true});
  });
  it('new_upload_requires_explicit_intent',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);expect(c.creates()).toBe(0);expect(await page.locator('.upload-controls').textContent()).toContain('отдельный слот');
      await page.getByRole('button',{name:'Начать новую загрузку'}).click();await poll(c.creates).toBe(1);expect(c.keys()[0]).not.toBe(key);
    },{legacy:true});
  });
  it.each(['before-create','receipt','parts','noop'])('storage_failure_blocks_complete %s',async failure=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();c.release();
      await poll(()=>page.getByRole('alert').textContent()).toContain('Не удалось сохранить');expect(c.completes()).toBe(0);
      expect(c.creates()).toBe(failure==='before-create'||failure==='noop'?0:1);
      expect(await page.getByRole('button',{name:'Повторить сохранение'}).evaluate(el=>el===document.activeElement)).toBe(true);
      expect(await page.locator('#source-file').getAttribute('aria-invalid')).toBe('true');
      await page.evaluate(()=>(window as Window&{restoreStorage?:()=>void}).restoreStorage?.());
      await page.getByRole('button',{name:'Повторить сохранение'}).press('Enter');
      await poll(()=>page.locator('#accepted-screen .status-panel').textContent()).toContain('Клипы готовы');
      expect(c.completes()).toBe(1);expect(new Set(c.keys()).size).toBe(1);
    },{storageFail:failure});
  });
  it('navigation_denial_keeps_put_alive',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      const url=page.url();page.once('dialog',dialog=>{expect(dialog.type()).toBe('confirm');void dialog.dismiss();});await page.getByRole('link',{name:'Другая страница'}).click();
      expect(page.url()).toBe(url);expect(await page.getByRole('button',{name:'Приостановить загрузку'}).count()).toBe(1);c.release();await poll(c.completes).toBe(1);
    });
  });
  it('confirmed_leave_aborts_without_hidden_complete',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.creates).toBe(1);
      page.once('dialog',dialog=>void dialog.accept());await page.getByRole('link',{name:'Другая страница'}).click();await page.waitForURL('**/away.html');c.release();await page.waitForTimeout(100);expect(c.completes()).toBe(0);
      await page.goBack();await page.waitForSelector('#source-file-picker');expect(await page.locator('.upload-controls').textContent()).toContain('fixture.mp4');expect(c.creates()).toBe(1);
    },{hold:'create'});
  });
  it.each(['done','failed','transcribing'] as const)('admitted_repeat_keeps_actual_stage %s',async actualStage=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();c.release();await poll(c.completes).toBe(1);
      await poll(()=>page.getByRole('status').textContent()).toContain('Результат завершения неизвестен');expect((await saved(page)).parts).toHaveLength(2);
      const creates=c.creates(),puts=c.puts();c.setStatus(202);await choose(page);expect(c.completes()).toBe(1);await continueUpload(page);await poll(c.completes).toBe(2);
      expect(c.creates()).toBe(creates);expect(c.puts()).toBe(puts);await poll(()=>page.locator('#accepted-screen .status-panel').textContent()).toContain(actualStage==='done'?'Клипы готовы':actualStage==='failed'?'Обработка не завершена':'Расшифровываем');
    },{completeStatus:503,actualStage});
  });
  it('success_redirect_is_once_without_guard',async()=>{
    await setup(browser,async(page,c)=>{let dialogs=0;page.on('dialog',dialog=>{dialogs++;void dialog.dismiss();});await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();c.release();
      await poll(()=>page.url()).toContain(`/dashboard/videos/${videoId}`);expect(c.creates()).toBe(1);expect(c.completes()).toBe(1);expect(dialogs).toBe(0);expect(await saved(page)).toBeNull();
      expect(await page.evaluate(()=>(window as Window&{uploadNavigations?:string[]}).uploadNavigations)).toEqual([`/dashboard/videos/${videoId}`]);
      await page.reload();expect(dialogs).toBe(0);
    });
  });
  it.each([false,true])('stale_cookie_scope_blocks_create_and_refresh receipt=%s',async receipt=>{
    await setup(browser,async(page,c)=>{c.setScopeMismatch();await choose(page);await continueUpload(page);await poll(()=>page.getByRole('alert').textContent()).toContain('Аккаунт изменился');
      expect(c.bodies()[0]!.account_scope).toBe(scope);expect(c.puts()).toBe(0);expect(c.completes()).toBe(0);expect(await saved(page)).toEqual(receipt?{...manifest,videoId,partSize}:manifest);
    },{session:receipt?{...manifest,videoId,partSize}:manifest});
  });
  it('stale_cookie_scope_blocks_refresh_after_403',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);await continueUpload(page);await poll(c.puts).toBe(2);
      const before=await saved(page);c.setScopeMismatch();c.release();await poll(()=>page.getByRole('alert').textContent()).toContain('Аккаунт изменился');
      expect(c.creates()).toBe(2);expect(c.bodies().every(body=>body.account_scope===scope)).toBe(true);expect(c.keys()).toEqual([key,key]);
      expect(c.puts()).toBe(2);expect(c.completes()).toBe(0);expect(await saved(page)).toEqual(before);
    },{session:manifest,putStatus:403});
  });
  it('unmounted_attempt_cannot_clear_or_redirect',async()=>{
    await setup(browser,async(page,c)=>{
      await page.evaluate(()=>{const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);
        if(String(args[0]).includes('/api/upload/complete')){const json=response.json.bind(response);response.json=async()=>{const value=await json();
          (window as Window&{jsonWaiting?:boolean}).jsonWaiting=true;await new Promise<void>(resolve=>{(window as Window&{releaseJson?:()=>void}).releaseJson=resolve;});return value;};}return response;};});
      await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();c.release();await page.waitForFunction(()=>(window as Window&{jsonWaiting?:boolean}).jsonWaiting);
      await page.getByRole('button',{name:'Приостановить загрузку'}).click();const before=await saved(page);
      expect(await page.getByRole('status').textContent()).toContain('Сервер мог начать обработку');expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);
      const replacement={...before,key:'44444444-4444-4444-8444-444444444444'};
      await page.evaluate(({storageKey,replacement})=>{(window as Window&{uploadRoot?:{unmount:()=>void}}).uploadRoot?.unmount();sessionStorage.setItem(storageKey,JSON.stringify(replacement));
        (window as Window&{releaseJson?:()=>void}).releaseJson?.();},{storageKey,replacement});await page.waitForTimeout(100);
      expect(await saved(page)).toEqual(replacement);expect(page.url()).toContain('/fixture.html');expect(c.completes()).toBe(1);
    });
  });
  it('history_remount_uses_saved_session',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      await page.getByRole('button',{name:'Приостановить загрузку'}).click();const before=await saved(page);
      await page.locator('#away').click();await page.goBack();await page.waitForSelector('#source-file-picker');await choose(page);
      expect(c.creates()).toBe(1);expect(await saved(page)).toEqual(before);await continueUpload(page);await poll(c.creates).toBe(2);expect(c.keys()[0]).toBe(c.keys()[1]);
    });
  });
  it('hashing_keeps_controls_responsive',async()=>{
    await setup(browser,async(page,c)=>{
      await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;Blob.prototype.arrayBuffer=async function(){const value=await original.call(this);
        await new Promise<void>(resolve=>{(window as Window&{releaseHash?:()=>void}).releaseHash=resolve;});return value;};});
      await page.locator('#source-file').setInputFiles(file);await poll(()=>page.getByRole('status').textContent()).toBe('Проверяем выбранный файл');
      await page.waitForFunction(()=>typeof (window as Window&{releaseHash?:()=>void}).releaseHash==='function');
      await page.getByRole('button',{name:'Отменить проверку'}).click();expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);
      await page.evaluate(()=>(window as Window&{releaseHash?:()=>void}).releaseHash!());await page.waitForTimeout(100);expect(c.creates()).toBe(0);
    });
  });
  it('large_file_hash_yields_and_bounds_browser_reads',async()=>{
    await setup(browser,async(page,c)=>{
      await page.evaluate(()=>{const stats={reads:[] as number[],active:0,maxActive:0,ticks:0},original=Blob.prototype.arrayBuffer;
        (window as Window&{hashStats?:typeof stats}).hashStats=stats;setInterval(()=>stats.ticks++,0);
        Blob.prototype.arrayBuffer=async function(){stats.reads.push(this.size);stats.active++;stats.maxActive=Math.max(stats.maxActive,stats.active);try{return await original.call(this);}finally{stats.active--;}};
        const input=document.querySelector<HTMLInputElement>('#source-file')!,files=new DataTransfer();files.items.add(new File([new Uint8Array(64*1024*1024)],'large.mp4',{type:'video/mp4'}));input.files=files.files;input.dispatchEvent(new Event('change',{bubbles:true}));});
      await poll(()=>page.getByRole('status').textContent()).toContain('Файл проверен');
      const stats=await page.evaluate(()=>(window as Window&{hashStats?:{reads:number[];maxActive:number;ticks:number}}).hashStats!);
      expect(stats.reads).toHaveLength(16);expect(Math.max(...stats.reads)).toBe(4*1024*1024);expect(stats.maxActive).toBe(1);expect(stats.ticks).toBeGreaterThan(1);expect(c.creates()).toBe(0);
    });
  });
  it('account_change_fences_late_complete_and_preserves_both_scopes',async()=>{
    await setup(browser,async(page,c)=>{
      await page.evaluate(()=>{const original=window.fetch;window.fetch=async(...args)=>{const response=await original(...args);
        if(String(args[0]).includes('/api/upload/complete')){const json=response.json.bind(response);response.json=async()=>{const value=await json();(window as Window&{jsonWaiting?:boolean}).jsonWaiting=true;
          await new Promise<void>(resolve=>{(window as Window&{releaseJson?:()=>void}).releaseJson=resolve;});return value;};}return response;};});
      await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();c.release();await page.waitForFunction(()=>(window as Window&{jsonWaiting?:boolean}).jsonWaiting);
      const before=await saved(page),otherScope='55555555-5555-4555-8555-555555555555',other={...manifest,accountScope:otherScope,originalFilename:'other-account.mp4'};
      await page.evaluate(({otherScope,other})=>{sessionStorage.setItem(`n5-upload-resume:v2:${otherScope}`,JSON.stringify(other));(window as Window&{setUploadScope?:(scope:string)=>void}).setUploadScope?.(otherScope);},{otherScope,other});
      await poll(()=>page.locator('#source-file-help').textContent()).toContain('other-account.mp4');await page.evaluate(()=>(window as Window&{releaseJson?:()=>void}).releaseJson?.());await page.waitForTimeout(100);
      expect(await saved(page)).toEqual(before);expect(await page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)!),`n5-upload-resume:v2:${otherScope}`)).toEqual(other);
      expect(page.url()).toContain('/fixture.html');expect(c.creates()).toBe(1);expect(c.completes()).toBe(1);expect(await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).isDisabled()).toBe(true);
    });
  });
  it('keyboard_recovery_focus_and_live_status',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);expect(await page.getByRole('status').getAttribute('aria-live')).toBe('polite');
      await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).focus();await page.keyboard.press('Enter');await poll(c.puts).toBe(2);
      await page.getByRole('button',{name:'Приостановить загрузку'}).focus();await page.keyboard.press('Space');expect(await page.locator('#source-file-picker').evaluate(el=>el===document.activeElement)).toBe(true);
      await choose(page);expect(await page.getByRole('button',{name:'Продолжить загрузку',exact:true}).evaluate(el=>el===document.activeElement)).toBe(true);
      expect(await page.locator('#source-file').getAttribute('aria-describedby')).toContain('source-file-help');
      for(const theme of ['dark','light'])for(const width of [320,375,390,768,1440]){await page.setViewportSize({width,height:900});await page.locator('html').evaluate((el,theme)=>{el.dataset.theme=theme;},theme);
        expect((await domRules(page,['R1','R2','R5'])).filter((finding:{severity:string})=>finding.severity==='error')).toEqual([]);
        expect((await axeRule(page)).filter((finding:{severity:string})=>finding.severity==='error')).toEqual([]);
        expect((await textZoomRule(page)).filter((finding:{severity:string})=>finding.severity==='error')).toEqual([]);
        if(theme==='dark'&&(width===375||width===1440))await page.screenshot({path:`${process.env.N5_UPLOAD_ARTIFACT_DIR??cacheDirectory}/${name}-uploader-${width}.png`,fullPage:true});}
    },{session:manifest});
  });
  it('modifier_and_hash_links_do_not_abort',async()=>{
    await setup(browser,async(page,c)=>{await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      await page.locator('#hash').click();expect(await page.getByRole('button',{name:'Приостановить загрузку'}).count()).toBe(1);
      let dialogs=0;page.on('dialog',dialog=>{dialogs++;void dialog.dismiss();});const here=page.url();
      await page.locator('#away').click({modifiers:['Control']});await page.locator('#away').click({button:'middle'});await page.locator('#blank').click();
      expect(page.url()).toBe(here);expect(dialogs).toBe(0);c.release();await poll(c.completes).toBe(1);
    });
  });
  it.each(['hash','create','put','complete'] as const)('active_beforeunload_reload_dismiss_and_accept %s',async stage=>{
    // Separate active attempts: dismiss must keep its work alive; accept must remount.
    for(const decision of ['dismiss','accept'] as const)await setup(browser,async(page,c)=>{
      if(stage==='hash'){
        await page.locator('#hash').click(); // Real user activation before the local hash barrier.
        await page.evaluate(()=>{const original=Blob.prototype.arrayBuffer;let first=true;Blob.prototype.arrayBuffer=async function(){const value=await original.call(this);
          if(first){first=false;await new Promise<void>(resolve=>{(window as Window&{releaseHash?:()=>void}).releaseHash=resolve;});}return value;};});
        await page.locator('#source-file').setInputFiles(file);await poll(()=>page.getByRole('status').textContent()).toBe('Проверяем выбранный файл');
        // The phase precedes the async Blob read; reload only after its real barrier exists.
        await page.waitForFunction(()=>typeof (window as Window&{releaseHash?:()=>void}).releaseHash==='function');
      }else{
        await choose(page);await continueUpload(page);
        await poll(stage==='create'?c.creates:stage==='put'?c.puts:c.completes).toBe(stage==='put'?2:1);
      }
      const marker=await page.evaluate(()=>(window as Window&{documentMarker?:string}).documentMarker),before=await saved(page),sent=c.completes();
      const dialogEvent=page.waitForEvent('dialog',{timeout:5000}),reloading=page.reload({timeout:3000}).catch(()=>null);
      const dialog=await dialogEvent;expect(dialog.type()).toBe('beforeunload');await dialog[decision]();await reloading;
      if(decision==='dismiss'){
        expect(await page.evaluate(()=>(window as Window&{documentMarker?:string}).documentMarker)).toBe(marker);
        if(stage==='hash'){await page.evaluate(()=>(window as Window&{releaseHash?:()=>void}).releaseHash!());await poll(()=>page.getByRole('status').textContent()).toContain('Файл совпадает');await continueUpload(page);}
        c.release();await poll(()=>page.locator('#accepted-screen .status-panel').textContent()).toContain('Клипы готовы');
        expect(c.creates()).toBe(1);expect(c.completes()).toBe(1);
      }else{
        await page.waitForFunction(old=>{const marker=(window as Window&{documentMarker?:string}).documentMarker;return !!marker&&marker!==old;},marker);
        expect(await saved(page)).toEqual(before);expect(await page.locator('#source-file').inputValue()).toBe('');
        c.release();await page.waitForTimeout(100);expect(c.completes()).toBe(sent);
      }
    },{session:manifest,hold:stage==='hash'?'put':stage});
  },60000);
  it('inactive_and_confirmed_leave_have_no_extra_beforeunload',async()=>{
    await setup(browser,async(page,c)=>{let dialogs=0;page.on('dialog',dialog=>{dialogs++;void dialog.accept();});await choose(page);await page.getByRole('button',{name:'Создать клипы →'}).click();await poll(c.puts).toBe(2);
      await page.getByRole('button',{name:'Приостановить загрузку'}).click();await page.reload();expect(dialogs).toBe(0);await choose(page);await continueUpload(page);await poll(c.creates).toBe(2);
      await page.locator('#away').click();await page.waitForURL('**/away.html');expect(dialogs).toBe(1);
    });
  });
});
