import { afterAll, beforeAll, expect, it,vi } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm,readFile,readdir } from 'node:fs/promises';
import { createServer,type ServerResponse } from 'node:http';
import { createServer as createTlsServer } from 'node:https';
import { join } from 'node:path';
import { buildScreenLayoutGraph,resolveLayoutCamera,proposeLayoutCamera } from '../apps/worker/src/render/screen-layout';
import { detectFaces } from '../apps/worker/src/render/faces';
import { renderClip,buildFilterChain } from '../apps/worker/src/render/ffmpeg';
import { buildWatermarkDrawtext } from '../apps/worker/src/render/watermark';
import { buildCompactionGraph, mapTime } from '../apps/worker/src/render/compaction';
import { probeDuration,probeVideoStream } from '../apps/worker/src/render/probe';
import { planDuration } from '@clipmaker/shared/cut-timeline';
import { parseScreenFaceLayout,type ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';

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
    { encoding: 'buffer', timeout: 45_000, maxBuffer: 2_000_000,
      env: { PATH: process.env.PATH, NODE_ENV:process.env.NODE_ENV??'test' } });
}
const file = (name: string) => join(directory, name);
async function render(name: string, chosen = layout, cameraAvailable = true,
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
function samePixels(actual: number[][], expected: number[][]) {
  expect(actual.length).toBeGreaterThan(0); expect(actual).toHaveLength(expected.length);
  actual.forEach((p, i) => p.forEach((v, c) => expect(Math.abs(v - expected[i]![c]!)).toBeLessThanOrEqual(4)));
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
