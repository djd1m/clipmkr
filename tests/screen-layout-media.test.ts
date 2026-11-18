import { afterAll, beforeAll, expect, it,vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm,readFile,readdir,writeFile } from 'node:fs/promises';
import { createServer,type ServerResponse } from 'node:http';
import { createServer as createTlsServer } from 'node:https';
import { join } from 'node:path';
import { buildScreenLayoutGraph,proposeInitialLayout,resolveLayoutCamera,proposeLayoutCamera } from '../apps/worker/src/render/screen-layout';
import { detectFaces } from '../apps/worker/src/render/faces';
import { renderClip,buildFilterChain } from '../apps/worker/src/render/ffmpeg';
import { buildWatermarkDrawtext, SUBTITLE_FONTS } from '../apps/worker/src/render/watermark';
import { buildCompactionGraph, mapTime } from '../apps/worker/src/render/compaction';
import { probeDuration,probeVideoStream } from '../apps/worker/src/render/probe';
import { planDuration } from '@clipmaker/shared/cut-timeline';
import { parseScreenFaceLayout,type ScreenFaceLayout, type ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';

import original from './fixtures/zoom-layout-original.json';
import { generateSubtitleFile } from '../apps/worker/src/render/subtitles';
import { prepareTeaser } from '../apps/worker/src/render/teaser';
import { prepareCta } from '../apps/worker/src/render/cta-overlay';
import { watermarkPlateTop } from '@clipmaker/shared/watermark';
import { escapeFFmpegPath } from '../apps/worker/src/render/escape';
const exec = promisify(execFile);
const source = { width: 128, height: 96 };
const layout: ScreenFaceLayoutV1 = { version: 1, mode: 'screen-face', variant: '02',
  screen: { x: 0, y: 0, width: .75, height: 1 }, focus: null,
  camera: { x: .75, y: 0, width: .25, height: 1 / 3 } };
let directory: string;

// Native binaries shipped by the normal test image; same execFile pattern as compaction-media.
// A host proof may explicitly supply a toolbox on PATH. The suite requires no Docker/socket/image.
async function ffmpeg(args: string[]) {
  return exec('ffmpeg', ['-hide_banner', '-v', 'error', '-filter_threads', '1', '-filter_complex_threads', '1', '-threads', '1', ...args],
    { encoding: 'buffer', timeout: 45_000, maxBuffer: 8_000_000,
      env: { PATH: process.env.PATH, NODE_ENV:process.env.NODE_ENV??'test' } });
}
const file = (name: string) => join(directory, name);
async function render(name: string, chosen: ScreenFaceLayout = layout, cameraAvailable = true,
  dimensions: { width: number; height: number; sampleAspectRatio?: number } = source, input = 'source.mkv') {
  const result = buildScreenLayoutGraph(chosen, dimensions, cameraAvailable, '0:v');
  await ffmpeg(['-i', file(input), '-filter_complex', result.graph, '-map', '[screenout]', '-map', '0:a',
    '-c:v', 'ffv1', '-pix_fmt', 'yuv444p', '-threads', '1', '-c:a', 'pcm_s16le', '-y', file(`${name}.mkv`)]);
  return result.geometry;
}
async function samples(name: string, x: number, y: number) {
  const { stdout } = await ffmpeg(['-i', file(`${name}.mkv`), '-vf', `crop=2:2:${2 * Math.floor(x / 2)}:${2 * Math.floor(y / 2)}:exact=1`,
    '-an', '-fps_mode', 'passthrough', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']);
  return Array.from({ length: stdout.length / 12 }, (_, n) => [...stdout.subarray(n * 12, n * 12 + 3)]);
}
function samePixels(actual: number[][], expected: number[][], context = 'pixel parity') {
  expect(actual.length).toBeGreaterThan(0); expect(actual).toHaveLength(expected.length);
  actual.forEach((p, i) => p.forEach((v, c) => expect(Math.abs(v - expected[i]![c]!),`${context}: frame=${i} channel=${c} actual=${v} expected=${expected[i]![c]}`).toBeLessThanOrEqual(4)));
}

beforeAll(async () => {
  directory = await mkdtemp('/tmp/clipmkr-zoom-phase-a-');
  const version = await ffmpeg(['-version']);
  const probe = await exec('ffprobe', ['-version'], { timeout: 10_000, maxBuffer: 64_000, env: { PATH: process.env.PATH, NODE_ENV:process.env.NODE_ENV??'test' } });
  const ffmpegVersion = version.stdout.toString().match(/^ffmpeg version (\S+)/)?.[1];
  expect(ffmpegVersion).toBeTruthy(); expect(probe.stdout).toContain(`ffprobe version ${ffmpegVersion}`);
  console.info({ ffmpegVersion, ffprobeVersion: probe.stdout.split('\n')[0] });
  // Different live colors represent A -> blank between samples -> A -> B. Magenta outside ROI.
  const camera = 'gte(X,96)*lt(Y,32)';
  const corners = (tl: number, tr: number, bl: number, br: number, base: number) =>
    `if(lt(X,8)*lt(Y,8),${tl},if(gte(X,88)*lt(Y,8),${tr},if(lt(X,8)*gte(Y,88),${bl},if(gte(X,88)*gte(Y,88),${br},${base}))))`;
  const red = `if(${camera},if(between(N,5,7),0,if(lt(N,12),40+N*8,0)),if(lt(X,96),${corners(240, 20, 240, 20, 180)},255))`;
  const green = `if(${camera},if(between(N,5,7),0,if(lt(N,12),20,120+N*4)),if(lt(X,96),${corners(240, 20, 20, 240, 80)},0))`;
  const blue = `if(${camera},if(between(N,5,7),0,10),if(lt(X,96),${corners(20, 240, 20, 240, 40)},255))`;
  await ffmpeg(['-f', 'lavfi', '-i', `nullsrc=s=128x96:r=25:d=0.8,format=gbrp,geq=r='${red}':g='${green}':b='${blue}'`,
    '-f', 'lavfi', '-i', 'sine=frequency=900:sample_rate=16000:duration=0.8',
    '-c:v', 'ffv1', '-pix_fmt', 'bgr0', '-threads', '1', '-c:a', 'pcm_s16le', '-y', file('source.mkv')]);
}, 60_000);
afterAll(async () => { if (directory) await rm(directory, { recursive: true, force: true }); });

it('camera_pixels_never_leave_confirmed_roi', async () => {
  const g = await render('live');
  expect(g.camera).not.toBeNull();
  const c = g.camera!.destination;
  const actual = await samples('live', c.x + c.width / 2, c.y + c.height / 2);
  const expected = await samples('source', 112, 16);
  expect(actual).toHaveLength(20); samePixels(actual, expected);
  expect(actual[0]![0]).toBeGreaterThan(30); expect(actual[15]![1]).toBeGreaterThan(170);
  expect(actual.some(([r, g, b]) => r! > 220 && b! > 220 && g! < 20)).toBe(false);
}, 60_000);

it('identity_and_subsample_changes_preserve_live_roi_without_identity_claim', async () => {
  const g = await render('identity');
  expect(g.camera).not.toBeNull(); // An always-hidden camera cannot satisfy this oracle.
  const c = g.camera!.destination;
  const pixels = await samples('identity', c.x + c.width / 2, c.y + c.height / 2);
  samePixels(pixels, await samples('source', 112, 16));
  expect(pixels[4]![0]).toBeGreaterThan(pixels[0]![0]! + 20);
  for (const n of [5, 6, 7]) expect(Math.max(...pixels[n]!)).toBeLessThan(5);
  expect(pixels[15]![1]).toBeGreaterThan(170); expect(pixels[15]![0]).toBeLessThan(5);
}, 60_000);

it('sampled_absence_vetoes_camera_for_whole_clip', async () => {
  const face={cx:.5,cy:.5,w:.3,h:.3,score:.99};
  const positive={width:32,height:32,samples:[{t:0,faces:[face]},{t:.5,faces:[face]}]};
  expect(resolveLayoutCamera(positive,[[0,.8]],0,.8)).toBe(true);
  const available=resolveLayoutCamera({...positive,samples:[{t:0,faces:[face]},{t:.5,faces:[]}]},[[0,.8]],0,.8);
  expect(available).toBe(false);
  const g = await render('veto', layout, available);
  expect(g.camera).toBeNull(); expect(g.cameraReason).toBe('camera_unavailable');
  const d = g.screen.destination;
  for (const rgb of await samples('veto', d.x + d.width / 2, d.y + d.height / 2)) {
    expect(rgb[0]).toBeGreaterThan(170); expect(rgb[1]).toBeGreaterThan(70);
  }
  for (const rgb of await samples('veto', 540, 1088)) expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThanOrEqual(1);
}, 60_000);

it('v3 moves the camera once without changing visible screen around it', async () => {
  const camera = { x: 97.5 / 128, y: 1.5 / 96, width: 29 / 128, height: 29 / 96 };
  for (const variant of ['01','02','03'] as const) {
    const choice: ScreenFaceLayout = { ...layout, version: 3, variant, camera,
      screen: { x: 0, y: 0, width: 1, height: 1 },
      focus: variant === '03' ? { x: .08, y: .02, width: .84, height: .92 } : null };
    const name = `relocated-${variant}`;
    const geometry = await render(name, choice);
    const { source: original, destination: displayed } = geometry.screen;
    const at = (x: number, y: number) => samples(name,
      displayed.x + (x - original.x) * displayed.width / original.width,
      displayed.y + (y - original.y) * displayed.height / original.height);
    expect(geometry.camera).not.toBeNull();
    expect(geometry.cameraMask).toEqual({ x: 98, y: 2, width: 28, height: 28 });
    for (const pixel of await at(112,16)) for (const channel of pixel) expect(channel).toBeCloseTo(24,-1);
    // Check beyond the scaler's interpolation at the edge; exact bounds are asserted above.
    samePixels(await at(94,16),await samples('source',94,16),'screen next to the mask');
    samePixels(await at(84,40),await samples('source',84,40));
    const output = geometry.camera!.destination;
    samePixels(await samples(name,output.x+output.width/2,output.y+output.height/2),await samples('source',112,16));
  }

  const veto: ScreenFaceLayout = { ...layout, version: 3, camera, screen: { x:0,y:0,width:1,height:1 } };
  const rejected = await render('relocation-veto',veto,false);
  expect(rejected.camera).toBeNull(); expect(rejected.cameraMask).toBeNull();
  const destination = rejected.screen.destination;
  samePixels(await samples('relocation-veto',destination.x+destination.width*112/128,
    destination.y+destination.height*16/96),await samples('source',112,16));
  const adjacent = buildScreenLayoutGraph({ ...veto, screen:layout.screen },source,true).geometry;
  expect(adjacent.camera).not.toBeNull(); expect(adjacent.cameraMask).toBeNull();
},60_000);

it('tail sampling retains the final real observation while a blank tail still vetoes the camera',async()=>{
  // NASA portrait from scikit-image v0.25.2, cropped to remove the uniform and suit insignia.
  const input = 'tests/fixtures/camera-tail-portrait.png';
  await ffmpeg(['-loop','1','-framerate','25','-i',input,'-t','1','-c:v','ffv1','-y',file('face-tail.mkv')]);
  await ffmpeg(['-i',file('face-tail.mkv'),'-vf',"drawbox=t=fill:c=black:enable='gte(t,0.32)'",
    '-c:v','ffv1','-y',file('blank-tail.mkv')]);
  const start = .04;
  for (const end of [.6,.8]) {
    const retained: [number,number][] = [[start,.18],[.53,end]];
    const available = await detectFaces(file('face-tail.mkv'),start,end,undefined,{preserveTail:true});
    const unavailable = await detectFaces(file('blank-tail.mkv'),start,end,undefined,{preserveTail:true});
    expect(available?.samples.map(sample=>sample.t)).toEqual([.04,.54]);
    expect(unavailable?.samples.map(sample=>sample.t)).toEqual([.04,.54]);
    expect(unavailable?.samples[0]?.faces.some(face=>face.score>=.6)).toBe(true);
    expect(unavailable?.samples.at(-1)?.faces).toEqual([]);
    expect(resolveLayoutCamera(available,retained,start,end)).toBe(true);
    expect(resolveLayoutCamera(unavailable,retained,start,end)).toBe(false);
  }
  const old = await detectFaces(file('face-tail.mkv'),start,.6);
  expect(old?.samples.map(sample=>sample.t)).toEqual([.04]);
},30_000);

it('first composition keeps the recorded screen and moves only a fixed window on retained samples',()=>{
  const camera={x:.8,y:0,width:.2,height:.2};
  const report=(count:number)=>({width:1000,height:600,samples:Array.from({length:10},(_,index)=>({
    t:index*.5,faces:[],captureCamera:index<count?camera:undefined
  }))});
  expect(proposeInitialLayout(report(7),[[0,3.5]],0,3.5)).toBeNull();
  expect(proposeInitialLayout(report(5),[[0,5]],0,5)).toBeNull();
  expect(proposeInitialLayout(report(6),[[0,5]],0,5)).toMatchObject({variant:'02',camera:null});
  expect(proposeInitialLayout(report(8),[[0,4]],0,4)).toMatchObject({variant:'02',camera});
  expect(proposeInitialLayout(report(7),[[0,4]],0,4)).toMatchObject({variant:'02',camera:null});
  const moved=report(10);
  moved.samples[7]!.captureCamera={...camera,x:.801,width:.199};
  expect(proposeInitialLayout(moved,[[0,5]],0,5)).toMatchObject({variant:'02',camera:null});
  expect(proposeInitialLayout(moved,[[0,3.5],[4,5]],0,5)).toMatchObject({variant:'02',camera});
  expect(proposeInitialLayout(null,[[0,5]],0,5)).toBeNull();
});

it('native YuNet reports actual blank observations; retained intervals alone govern the whole-clip veto',async()=>{
  const report=await detectFaces(file('source.mkv'),0,.8);
  expect(report).not.toBeNull();expect(report!.samples).toHaveLength(2);expect(report!.samples.every(s=>s.faces.length===0)).toBe(true);
  expect(resolveLayoutCamera(report,[[0,.8]],0,.8)).toBe(false);expect(proposeLayoutCamera(report)).toBeNull();
  const face={cx:.9,cy:.15,w:.08,h:.12,score:.99},samples=Array.from({length:8},(_,i)=>({t:i*.5,faces:[face]}));
  expect(proposeLayoutCamera({width:128,height:96,samples})).not.toBeNull();
  expect(proposeLayoutCamera({width:128,height:96,samples:samples.map((s,i)=>i===2?{...s,faces:[face,{...face,cx:.1}]}:s)})).toBeNull();
  const missing={width:128,height:96,samples:samples.map((s,i)=>i===2?{...s,faces:[]}:s)};
  expect(resolveLayoutCamera(missing,[[0,1],[1.5,4]],0,4)).toBe(true);
  expect(resolveLayoutCamera(missing,[[0,4]],0,4)).toBe(false);
});

async function remoteFixture(handler?:(phase:'probe'|'decode',req:import('node:http').IncomingMessage,res:ServerResponse)=>boolean){
  const body=await readFile(file('source.mkv'));let phase:'probe'|'decode'='probe',requests=0,bytes=0;
  const held=new Set<ServerResponse>();
  const server=createServer((req,res)=>{requests++;if(handler?.(phase,req,res))return;
    const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range??''),start=match?Number(match[1]):0,end=match?.[2]?Math.min(Number(match[2]),body.length-1):body.length-1;
    if(start>=body.length){res.writeHead(416,{'content-range':`bytes */${body.length}`}).end();return;}
    bytes+=end-start+1;res.writeHead(match?206:200,{'content-type':'video/x-matroska','accept-ranges':'bytes','content-length':end-start+1,
      ...(match?{'content-range':`bytes ${start}-${end}/${body.length}`}:{})}).end(body.subarray(start,end+1));
  });await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw Error('No local fixture port');
  const origin=`http://127.0.0.1:${address.port}`;
  return {origin,held,reads:()=>requests,bytes:()=>bytes,phase:(next:'probe'|'decode')=>{phase=next;},
    close:async()=>{for(const r of held)r.destroy();server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}};
}

it('seed reauthorizes before each native source open and denial prevents decode',async()=>{
  const f=await remoteFixture();try{
    let authorizations=0,readsAtDenial=0;
    const report=await detectFaces(f.origin+'/source?private-canary=authority',0,.8,undefined,{remote:{origin:f.origin,allowHttp:true},
      authorizeSource:async()=>{authorizations++;if(authorizations===2){readsAtDenial=f.reads();f.phase('decode');return false;}return true;}});
    expect(report).toBeNull();expect(authorizations).toBe(2);expect(readsAtDenial).toBeGreaterThan(0);expect(f.reads()).toBe(readsAtDenial);
    let stage=0;const success=await detectFaces(f.origin+'/source',0,.8,undefined,{remote:{origin:f.origin,allowHttp:true},
      authorizeSource:async()=>{if(++stage===2)f.phase('decode');return true;}});
    expect(stage).toBe(2);expect(success?.samples.length).toBe(2);expect(f.reads()).toBeGreaterThan(readsAtDenial);
    console.info({event:'seed_fixture_traffic',bytes:f.bytes(),requests:f.reads()});
  }finally{await f.close();}
});

it('seed_redirects_are_refused_before_followup_request in ffprobe and ffmpeg',async()=>{
  let targetReads=0;const target=await remoteFixture((_phase,_req,res)=>{targetReads++;res.writeHead(500).end();return true;});
  try{for(const child of ['probe','decode'] as const)for(const status of [301,302,303,307,308])for(const cross of [false,true]){
    let redirected=0;
    const f=await remoteFixture((phase,req,res)=>{
      if(req.url?.startsWith('/target')){targetReads++;res.writeHead(500).end();return true;}
      if(phase===child){redirected++;res.writeHead(status,{location:cross?target.origin+'/target':'/target'}).end();return true;}return false;
    });
    try{let count=0;const report=await detectFaces(f.origin+'/source?private-canary=redirect',0,.8,undefined,{remote:{origin:f.origin,allowHttp:true},
      authorizeSource:async()=>{if(++count===2)f.phase('decode');return true;}});
      expect(report).toBeNull();expect(redirected).toBeGreaterThan(0);expect(targetReads).toBe(0);
    }finally{await f.close();}
  }}finally{await target.close();}
},60_000);

it('seed_remote_errors_never_expose_url and production rejects insecure or foreign origin before source access',async()=>{
  const canary='signed-capability-SECRET-ZOOM',logs:string[]=[],warn=vi.spyOn(console,'warn').mockImplementation(v=>{logs.push(String(v));});
  const f=await remoteFixture((_p,_q,res)=>{res.writeHead(403).end();return true;});
  try{
    for(const url of [f.origin+'/private?token='+canary,f.origin+'/private#'+canary,f.origin.replace('127.0.0.1','localhost')+'/private?token='+canary])
      expect(await detectFaces(url,0,.8,undefined,{remote:{origin:f.origin,allowHttp:false}})).toBeNull();
    expect(f.reads()).toBe(0);
    expect(await detectFaces(f.origin+'/private?token='+canary,0,.8,undefined,{remote:{origin:f.origin,allowHttp:true}})).toBeNull();
    expect(f.reads()).toBeGreaterThan(0);expect(logs.join(' ')).not.toContain(canary);expect(logs.join(' ')).not.toContain(f.origin);
  }finally{warn.mockRestore();await f.close();}
});

it('seed_deadline_terminates_descendants_without_url_leak on a Range-ignored stalled source',async()=>{
  const canary='zoom-timeout-capability-canary',held=new Set<ServerResponse>();
  const f=await remoteFixture((_p,_q,res)=>{res.writeHead(200,{'content-type':'video/mp4','content-length':2_000_000});res.write(Buffer.alloc(32));held.add(res);res.on('close',()=>held.delete(res));return true;});
  const pids=new Set<number>(),started=performance.now(),logs:string[]=[],warn=vi.spyOn(console,'warn').mockImplementation(v=>{logs.push(String(v));});
  try{
    const result=detectFaces(f.origin+'/source?token='+canary,0,.8,undefined,{remote:{origin:f.origin,allowHttp:true},timeoutMs:2500});
    for(let i=0;i<80 && pids.size<2;i++){
      for(const name of await readdir('/proc'))if(/^\d+$/.test(name)){try{const cmd=await readFile(`/proc/${name}/cmdline`,'utf8');if(cmd.includes(canary))pids.add(Number(name));}catch{/* process exited */}}
      if(pids.size<2)await new Promise(r=>setTimeout(r,20));
    }
    expect(pids.size).toBeGreaterThanOrEqual(2);expect(await result).toBeNull();expect(performance.now()-started).toBeLessThan(5000);
    await new Promise(r=>setTimeout(r,150));
    for(const pid of pids){let running=false;try{const stat=await readFile(`/proc/${pid}/stat`,'utf8');running=!/\) [ZX] /.test(stat);}catch{/* reaped */}expect(running).toBe(false);}
    const reads=f.reads();await new Promise(r=>setTimeout(r,150));expect(f.reads()).toBe(reads);expect(held.size).toBe(0);
    expect(logs.join(' ')).not.toContain(canary);console.info({event:'seed_timeout_proof',descendants:pids.size,elapsed_ms:Math.round(performance.now()-started),requests:reads});
  }finally{warn.mockRestore();for(const response of held)response.destroy();await f.close();}
},10_000);

it('native TLS refuses an untrusted certificate without making an HTTP request',async()=>{
  await exec('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',file('tls.key'),'-out',file('tls.pem'),'-days','1','-subj','/CN=wrong.test.invalid']);
  let reads=0;const server=createTlsServer({key:await readFile(file('tls.key')),cert:await readFile(file('tls.pem'))},(_q,res)=>{reads++;res.end('unreachable');});
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();if(!address||typeof address==='string')throw Error('No TLS fixture port');
  try{const origin=`https://127.0.0.1:${address.port}`;expect(await detectFaces(origin+'/source?token=TLS-canary',0,.8,undefined,{remote:{origin,allowHttp:false}})).toBeNull();expect(reads).toBe(0);
    // Trust this fixture CA explicitly only in the direct native binary oracle: hostname still fails.
    await expect(exec('ffprobe',['-v','error','-protocol_whitelist','https,tls,tcp','-max_redirects','0','-tls_verify','1','-ca_file',file('tls.pem'),origin+'/source'],{timeout:5000})).rejects.toThrow();expect(reads).toBe(0);
  }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
},15_000);

it('screen_watermark_is_last_and_action_remains_visible in the actual renderClip branch',async()=>{
  await ffmpeg(['-f','lavfi','-i','color=c=0xb45028:s=128x96:r=2:d=20','-f','lavfi','-i','sine=frequency=700:duration=20',
    '-c:v','ffv1','-threads','1','-c:a','pcm_s16le','-y',file('long.mkv')]);
  const chosen={...layout,variant:'03' as const,focus:{x:.1,y:.1,width:.2,height:.2}};
  const result=await renderClip({inputPath:file('long.mkv'),outputPath:file('actual.mp4'),startTime:0,endTime:20,format:'portrait',layout:chosen,
    words:[{word:'Проверка',start:0,end:5}],watermark:true,origin:'https://clipmkr.ru',code:'WWWWWW',teaser:true,title:'Важный экран',cta:'subscribe'});
  expect(result.rendered_layout?.requested).toEqual(parseScreenFaceLayout(chosen));expect(result.rendered_layout?.resolved.cameraVisible).toBe(false);
  const wholeOptions={inputPath:file('long.mkv'),outputPath:file('whole-veto.mp4'),startTime:0,endTime:20,format:'portrait' as const,
    layout:{...chosen,focus:null},words:[],watermark:false,origin:'https://clipmkr.ru',code:'WWWWWW'};
  const wholeVeto=await renderClip(wholeOptions);
  expect(wholeVeto.rendered_layout?.resolved).toEqual({cameraVisible:false,reason:'camera_unstable'});
  await ffmpeg(['-i',file('long.mkv'),'-vf','setsar=2','-c:v','ffv1','-threads','1','-c:a','copy','-y',file('long-sar.mkv')]);
  const unsupported=await renderClip({...wholeOptions,inputPath:file('long-sar.mkv'),outputPath:file('whole-unsupported.mp4')});
  expect(unsupported.rendered_layout?.resolved).toEqual({cameraVisible:false,reason:'unsupported_geometry'});
  const geometry=buildScreenLayoutGraph(chosen,source,false).geometry,action=geometry.protectedAction;
  const pixel=async(time:number,crop:string)=>(await ffmpeg(['-ss',String(time),'-i',file('actual.mp4'),'-vf',crop,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'])).stdout;
  const actionPixels=await pixel(1,`crop=4:4:${2*Math.floor((action.x+action.width/2)/2)}:${2*Math.floor((action.y+action.height/2)/2)}`);
  expect(actionPixels[0]).toBeGreaterThan(170);expect(actionPixels[1]).toBeGreaterThan(70);expect(actionPixels[2]).toBeLessThan(50);
  const bright=(buffer:Buffer)=>{let n=0;for(let i=0;i<buffer.length;i+=3)if(buffer[i]!>180 && buffer[i+1]!>180)n++;return n;};
  expect(bright(await pixel(1,'crop=1080:340:0:0'))).toBeGreaterThan(500);
  expect(bright(await pixel(8,'crop=1080:340:0:0'))).toBe(0);
  expect(bright(await pixel(1,'crop=1080:220:0:1220'))).toBeGreaterThan(500);
  expect(bright(await pixel(8,'crop=1080:220:0:1220'))).toBe(0);
  expect(bright(await pixel(19,'crop=1080:300:0:1450'))).toBeGreaterThan(500);
  const tail=buildFilterChain('portrait',null,true,'https://clipmkr.ru','WWWWWW',undefined,undefined,undefined,'drawbox=x=0:y=0:w=1:h=1:c=white:t=fill','drawtext=text=title','drawtext=text=CTA',true);
  expect(tail.endsWith(buildWatermarkDrawtext(1080,1920,'https://clipmkr.ru','WWWWWW'))).toBe(true);
},90_000);

it.each(['01', '03'] as const)('%s retains every corner of the selected screen when focus is absent', async variant => {
  const g = await render(`whole-${variant}`, { ...layout, variant });
  expect(g.reason).toBe(variant === '03' ? 'whole_screen' : null);
  const d = g.screen.destination;
  for (const [sx, sy] of [[4, 4], [92, 4], [4, 92], [92, 92]] as const) {
    const pixels = await samples(`whole-${variant}`, d.x + d.width * sx / 96, d.y + d.height * sy / 96);
    expect(pixels).toHaveLength(20);
    samePixels(pixels, await samples('source', sx, sy));
  }
}, 60_000);

it('03 keeps protected focus visible beside camera and clips context to the safe pane', async () => {
  const g = await render('focus', { ...layout, variant: '03', focus: { x: .1, y: .1, width: .2, height: .2 } });
  expect(g.camera).not.toBeNull();
  const a = g.protectedAction;
  for (const rgb of await samples('focus', a.x + a.width / 2, a.y + a.height / 2)) expect(rgb[0]).toBeGreaterThan(170);
  for (const y of [200, 1400]) {
    for (const rgb of await samples('focus', 540, y)) expect(Math.max(...rgb) - Math.min(...rgb)).toBeLessThanOrEqual(1);
  }
}, 60_000);

it('compaction plus screen graph aligns screen and camera source counters with the real audio marker', async () => {
  // Same marker/RMS oracle as compaction-media, now after the isolated screen compositor.
  await ffmpeg(['-f', 'lavfi', '-i', "nullsrc=s=128x96:r=25:d=2.4,geq=lum='if(between(N,50,51),235,32+N*2)':cb=128:cr=128",
    '-f', 'lavfi', '-i', 'aevalsrc=if(between(t\\,2\\,2.08)\\,0.9\\,0.2)*sin(2*PI*900*t):s=16000:d=2.4',
    '-c:v', 'ffv1', '-threads', '1', '-c:a', 'pcm_s16le', '-y', file('markers.mkv')]);
  const cuts: [number, number][] = [[.4, 1.2], [1.6, 2.4]];
  const result = buildScreenLayoutGraph(layout, source, true);
  await ffmpeg(['-i', file('markers.mkv'), '-filter_complex', `${buildCompactionGraph(cuts, 0, 0)};${result.graph}`,
    '-map', '[screenout]', '-map', '[ac]', '-c:v', 'ffv1', '-pix_fmt', 'yuv444p', '-threads', '1',
    '-c:a', 'pcm_s16le', '-y', file('compacted.mkv')]);
  expect(await probeDuration(file('compacted.mkv'))).toBeCloseTo(planDuration(cuts), 2);
  const c = result.geometry.camera!.destination;
  const d = result.geometry.screen.destination;
  const camera = await samples('compacted', c.x + c.width / 2, c.y + c.height / 2);
  const screen = await samples('compacted', d.x + d.width / 2, d.y + d.height / 2);
  const original = await samples('markers', 48, 48);
  expect(camera).toHaveLength(38); expect(screen).toHaveLength(38);
  // Explicit source frame counters on both retained intervals, outside the xfade blend.
  for (const [out, input] of [[0, 10], [4, 14], [24, 46], [28, 50], [35, 57]] as const) {
    samePixels([screen[out]!], [original[input]!]); samePixels([camera[out]!], [original[input]!]);
  }
  const markerVideo = screen.findIndex(rgb => rgb[0]! > 240) / 25;
  const markerCamera = camera.findIndex(rgb => rgb[0]! > 240) / 25;
  const audio = (await ffmpeg(['-i', file('compacted.mkv'), '-map', '0:a', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'])).stdout;
  const rms: number[] = [];
  for (let i = 0; i + 64 <= audio.length; i += 64) {
    let sum = 0; for (let j = 0; j < 16; j++) sum += audio.readFloatLE(i + j * 4) ** 2;
    rms.push(Math.sqrt(sum / 16));
  }
  const markerAudio = rms.findIndex(value => value > .5) / 1000;
  expect(markerVideo).toBeGreaterThan(0); expect(markerAudio).toBeGreaterThan(0);
  expect(Math.abs(markerVideo - markerAudio)).toBeLessThanOrEqual(.04);
  expect(markerCamera).toBe(markerVideo); expect(markerAudio).toBeCloseTo(mapTime(cuts, 2), 2);
  console.info({ markerVideo, markerCamera, markerAudio, expectedMarker: mapTime(cuts, 2) });
}, 60_000);

it('non-square-pixel input explicitly renders whole-screen fallback without distorting display aspect', async () => {
  await ffmpeg(['-i', file('source.mkv'), '-vf', 'setsar=2', '-c:v', 'ffv1', '-threads', '1', '-c:a', 'copy', '-y', file('sar.mkv')]);
  const probed=await probeVideoStream(file('sar.mkv'));
  expect(probed).toMatchObject({...source,sampleAspectRatio:2});
  const g = await render('sar-result', layout, true, probed!, 'sar.mkv');
  expect(g.reason).toBe('unsupported_geometry'); expect(g.camera).toBeNull();
  // Even output dimensions can lose <2px relative to the exact display aspect.
  expect(Math.abs(g.screen.destination.width / (8 / 3) - g.screen.destination.height)).toBeLessThan(2);
  const d = g.screen.destination;
  const rgb = (await samples('sar-result', d.x + d.width * .9, d.y + d.height * .8))[0]!;
  expect(rgb[0]).toBeGreaterThan(245); expect(rgb[2]).toBeGreaterThan(245);
}, 60_000);


it('v2 native original extents and every live camera frame survive full-canvas composition',async()=>{
  const camera='gte(X,1496)*lt(Y,180)';
  // Moving neutral luma isolates extent/timebase from YUV420 chroma-edge ringing.
  // Camera retains its independent live RGB sequence; every original probe stays fixed.
  await ffmpeg(['-f','lavfi','-i',`nullsrc=s=1816x968:r=25:d=0.8,format=gbrp,geq=r='if(${camera},40+N*8,180+N*2)':g='if(${camera},20+N*4,180+N*2)':b='if(${camera},10,180+N*2)'`,
    '-f','lavfi','-i','sine=frequency=900:duration=0.8','-c:v','ffv1','-pix_fmt','bgr0','-c:a','pcm_s16le','-y',file('original-source.mkv')]);
  const normalize=(r:{x:number;y:number;width:number;height:number})=>({x:r.x/1816,y:r.y/968,width:r.width/1816,height:r.height/968});
  // Independent fixed RGB expectation for the graph's 0x181818 canvas, not the
  // moving neutral source: achromaticity alone would accept leaked screen pixels.
  const expectBackground=async(name:string,x:number,y:number)=>{
    const actual=await samples(name,x,y);expect(actual).toHaveLength(20);
    actual.forEach((rgb,frame)=>rgb.forEach((value,channel)=>
      expect(Math.abs(value-24),`${name} background (${x},${y}): frame=${frame} channel=${channel} actual=${value} expected=24`).toBeLessThanOrEqual(1)));
  };
  for(const ref of original.variants){
    const chosen=parseScreenFaceLayout({version:2,mode:'screen-face',variant:ref.variant,screen:normalize(ref.screenRoi),focus:null,camera:normalize(ref.cameraRoi)});
    const name=`original-${ref.variant}`;
    await render(name,chosen,true,original.source,'original-source.mkv');
    // Independent original bounds sample both the upper camera and content below y1200.
    const c=ref.cameraBounds,d=ref.screenBounds;
    const observed=await samples(name,c.x+c.width/2,c.y+c.height/2);
    expect(observed).toHaveLength(20);samePixels(observed,await samples('original-source',1656,90),`${ref.variant} camera center`);
    for(const [x,y] of [[4,d.y+4],[4,d.y+d.height-4],[d.width-4,d.y+d.height-4]])
      samePixels(await samples(name,x!,y!),await samples('original-source',400,400),`${ref.variant} screen (${x},${y})`);
    for(const y of [d.y-4,d.y+d.height+4])await expectBackground(name,4,y);
    if(ref.variant==='02'){
      const noCamera=await render('original-02-absent',chosen,false,original.source,'original-source.mkv');
      expect(noCamera.camera).toBeNull();
      samePixels(await samples('original-02-absent',4,d.y+d.height-4),await samples(name,4,d.y+d.height-4));
      await expectBackground('original-02-absent',c.x+c.width/2,c.y+c.height/2);
    }
  }
},90_000);

it('v2_overlay_bounding_boxes_preserve_content_and_existing_footer_contracts',async()=>{
  const bounds=async(filter:string)=>{
    const {stdout}=await ffmpeg(['-f','lavfi','-i','color=c=magenta:s=1080x1920:r=1:d=1,format=rgb24',
      '-vf',filter,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
    expect(stdout.length).toBe(1080*1920*3);
    let left=1080,top=1920,right=0,bottom=0,count=0;
    for(let y=0;y<1920;y++)for(let x=0;x<1080;x++){
      const i=(y*1080+x)*3;
      if(Math.abs(stdout[i]!-255)>10 || stdout[i+1]!>10 || Math.abs(stdout[i+2]!-255)>10){
        left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);count++;
      }
    }
    expect(count).toBeGreaterThan(100);return {left,top,right,bottom};
  };
  for(const phrase of ['СПЕЦИАЛИЗИРОВАННЫЕ СЕТИ ЩЁЛКНИТЕ: SD-WAN, gjpq!',
    'Программно-определяемые сети: действие и результат','ЙЦУКЕНГШЗХЁ gjpqy ДфруЦЩщцдйё 1234567890']){
    const words=phrase.split(' ').map((word,i)=>({word,start:i*.1,end:(i+1)*.1}));
    const ass=generateSubtitleFile(words,0,2,'portrait',{fontSize:46,marginV:458})!;
    // Real libass glyph/outline/shadow raster; only colors change to expose all ink.
    const mask=ass.replaceAll('&H00000000','&H00FFFFFF');
    expect(mask).toContain('\\N');await writeFile(file('mask.ass'),mask);
    const b=await bounds(`ass='${escapeFFmpegPath(file('mask.ass'))}':fontsdir='${escapeFFmpegPath(SUBTITLE_FONTS)}'`);
    expect(b.top).toBeGreaterThanOrEqual(1364);expect(b.bottom).toBeLessThanOrEqual(1469);
    expect(b.left).toBeGreaterThanOrEqual(54);expect(b.right).toBeLessThanOrEqual(1026);
  }
  for(const title of ['Важный экран','Программно-определяемые сети: действие и результат '.repeat(8)]){
    const prepared=await prepareTeaser(title,1080,directory,true,{x:91,y:237,layoutWidth:632});
    expect(prepared).not.toBeNull();
    const b=await bounds(prepared!.filter);
    expect(b.left).toBeGreaterThanOrEqual(65);expect(b.right).toBeLessThanOrEqual(637);
    expect(b.top).toBeGreaterThanOrEqual(211);expect(b.bottom).toBeLessThanOrEqual(538);
  }
  let ctaCount=0;
  for(const watermark of [true,false])for(const kind of ['watch_full','subscribe','open_link']){
    const prepared=prepareCta(kind,1080,1920,20,true,watermark,undefined,{top:1481,bottom:1561});
    if(!watermark && kind==='open_link'){expect(prepared).toBeNull();continue;}
    expect(prepared).not.toBeNull();expect(prepared!.result.font_size).toBe(48);
    const b=await bounds('setpts=PTS+19/TB,'+prepared!.filter);ctaCount++;
    expect(b.top).toBeGreaterThanOrEqual(1481);expect(b.bottom).toBeLessThanOrEqual(1561);
    expect(b.left).toBeGreaterThanOrEqual(54);expect(b.right).toBeLessThanOrEqual(1026);
  }
  expect(ctaCount).toBe(5);
  const wm=await bounds(buildWatermarkDrawtext(1080,1920,'https://clipmkr.ru','WWWWWW'));
  expect(wm.top).toBe(watermarkPlateTop(1920));expect(wm.top-1561).toBe(12);
},90_000);

it.each([2,3])('v%s-02 renderClip retains cut-plan subtitle timing, title, CTA and watermark in their qualified bands',async version=>{
  await ffmpeg(['-f','lavfi','-i','color=c=0xb45028:s=128x96:r=2:d=22','-f','lavfi','-i','sine=frequency=700:duration=22',
    '-c:v','ffv1','-c:a','pcm_s16le','-y',file('v2-long.mkv')]);
  const chosen=parseScreenFaceLayout({...layout,version,screen:{x:0,y:0,width:.75,height:1},camera:null});
  const result=await renderClip({inputPath:file('v2-long.mkv'),outputPath:file('v2-actual.mp4'),startTime:0,endTime:22,
    cutPlan:[[0,10],[12,22]],format:'portrait',layout:chosen,words:[{word:'Первая строка подписи',start:18,end:19},{word:'Вторая строка подписи',start:19,end:20}],
    watermark:true,origin:'https://clipmkr.ru',code:'WWWWWW',teaser:true,title:'Важный экран',cta:'subscribe'});
  expect(result.rendered_layout?.requested).toEqual(chosen);expect(result.teaser).not.toBeNull();
  expect(result.cta).toMatchObject({font_size:48,start_seconds:planDuration([[0,10],[12,22]])-2.5});
  expect(result.duration_seconds).toBeCloseTo(planDuration([[0,10],[12,22]]),1);
  const bright=async(time:number,y:number,height:number)=>{
    const {stdout}=await ffmpeg(['-ss',String(time),'-i',file('v2-actual.mp4'),'-vf',`crop=1080:${height}:0:${y}`,
      '-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
    let n=0;for(let i=0;i<stdout.length;i+=3)if(stdout[i]!>180 && stdout[i+1]!>180 && stdout[i+2]!>180)n++;return n;
  };
  expect(await bright(1,192,346)).toBeGreaterThan(100);
  expect(await bright(8,192,346)).toBe(0);
  expect(await bright(18,1364,106)).toBeGreaterThan(100);
  expect(await bright(8,1364,106)).toBe(0);
  expect(await bright(18,1480,82)).toBeGreaterThan(100);
  expect(await bright(8,1480,82)).toBe(0);
  expect(await bright(18,1572,150)).toBeGreaterThan(100);
},90_000);


it('v2 native odd non-square-pixel fallback preserves whole-source display aspect and explicit reason',async()=>{
  await ffmpeg(['-i',file('source.mkv'),'-vf','scale=127:95,setsar=16/15','-c:v','ffv1','-pix_fmt','yuv444p',
    '-c:a','copy','-y',file('odd-sar.mkv')]);
  const chosen=parseScreenFaceLayout({...layout,version:2});
  const g=await render('v2-odd-sar',chosen,true,{width:127,height:95,sampleAspectRatio:16/15},'odd-sar.mkv');
  expect(g.reason).toBe('unsupported_geometry');expect(g.camera).toBeNull();
  expect(g.screen.source).toEqual({x:0,y:0,width:126,height:94});
  const d=g.screen.destination;
  expect(Math.abs(d.width/(126*16/15/94)-d.height)).toBeLessThanOrEqual(2);
  const live=await samples('v2-odd-sar',d.x+d.width/2,d.y+d.height/2);
  expect(live).toHaveLength(20);samePixels(live,await samples('odd-sar',48,48));
  for(const rgb of await samples('v2-odd-sar',840,280))expect(Math.max(...rgb)-Math.min(...rgb)).toBeLessThanOrEqual(1);
},60_000);
