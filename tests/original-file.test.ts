import { expect, it, vi } from 'vitest';
import { createOriginalFileHandler, type OriginalFileDependencies } from '../apps/web/src/server/original-file';
import { originalSourceRevision } from '@clipmaker/shared/server/original-source';
const id = '11111111-1111-4111-8111-111111111111';
const magic = Buffer.from('000000186674797069736f6d0000000069736f6d6d703432', 'hex');
const request = (suffix = '', init?: RequestInit) => new Request(`https://app.test/api/videos/${id}/original${suffix}`, { ...init, headers: { cookie: `__Host-n5_session=${'a'.repeat(43)}`, 'x-forwarded-for': '192.0.2.1, 127.0.0.1', ...init?.headers } });
function fixture() {
  const row = { status: 'rendering', object_key: 'videos/owned/source.mov', upload_id: 'upload', actual_bytes: '24', duration_seconds: '30.0', failure_reason: null as string | null };
  const deps = { pool: { query: vi.fn().mockResolvedValue({ rows: [row] }) }, auth: { authenticate: vi.fn().mockResolvedValue({ account_id: id }) },
    trustedProxyHops: 1, allowRead: vi.fn().mockResolvedValue(true), head: vi.fn().mockResolvedValue(24n), bytes: vi.fn().mockResolvedValue(magic),
    sign: vi.fn().mockResolvedValue('https://storage.test/secret'), stream: vi.fn().mockResolvedValue(new Response('bytes')) };
  return { row, deps, handler: createOriginalFileHandler(deps as unknown as OriginalFileDependencies) };
}
it('original_denies_foreign_before_storage', async () => {
  const f = fixture(); f.deps.pool.query.mockResolvedValue({ rows: [] });
  for (const suffix of ['', '?g=guest&sig=x&key=foreign&url=https://evil.test']) expect((await f.handler(request(suffix), id)).status).toBe(404);
  f.deps.auth.authenticate.mockResolvedValue(null);
  expect((await f.handler(request(), id)).status).toBe(404);
  expect(f.deps.head).not.toHaveBeenCalled(); expect(f.deps.bytes).not.toHaveBeenCalled(); expect(f.deps.sign).not.toHaveBeenCalled();
});
it('original_distinguishes_upload_missing_and_outage', async () => {
  const f = fixture(); f.row.status = 'uploading';
  expect(await (await f.handler(request('?metadata=1'), id)).json()).toMatchObject({ state: 'incomplete' });
  expect(f.deps.head).not.toHaveBeenCalled();
  f.row.status = 'failed'; f.deps.head.mockRejectedValueOnce({ $metadata: { httpStatusCode: 404 } });
  expect(await (await f.handler(request('?metadata=1'), id)).json()).toMatchObject({ state: 'missing' });
  f.deps.head.mockRejectedValueOnce({ $metadata: { httpStatusCode: 403 } });
  expect(await (await f.handler(request('?metadata=1'), id)).json()).toMatchObject({ state: 'error' });
  f.deps.head.mockResolvedValueOnce(25n);
  expect((await f.handler(request(), id)).status).toBe(503);
  expect(f.deps.sign).not.toHaveBeenCalled();
});
it('original_keeps_s3_capability_server_side', async () => {
  const f = fixture(); const metadata = await f.handler(request('?metadata=1'), id);
  expect(await metadata.json()).toMatchObject({ state: 'ready', media: { mime: 'video/mp4', bytes: '24' } });
  expect(f.deps.sign).not.toHaveBeenCalled();
  const head = await f.handler(request('', { method: 'HEAD', headers: { range: 'bytes=1-2' } }), id);
  expect(head.status).toBe(200); expect(await head.text()).toBe(''); expect(head.headers.get('content-length')).toBe('24'); expect(f.deps.sign).not.toHaveBeenCalled();
  const response = await f.handler(request('?download=1'), id);
  expect(response.status).toBe(200); expect(response.headers.get('location')).toBeNull();
  expect(response.headers.get('content-disposition')).toContain('attachment; filename="source.mp4"');
  expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(f.deps.sign).toHaveBeenCalledWith(f.row.object_key);
  const before = f.deps.head.mock.calls.length;
  expect((await f.handler(request('', { headers: { range: 'bytes=0-1,4-5' } }), id)).status).toBe(416);
  expect(f.deps.head).toHaveBeenCalledTimes(before);
});
it('original_revision_tracks_upload_identity', () => {
  expect(originalSourceRevision('video', 'key', null, '24')).toBe('bc8ea476b4377adcb49e7c3cc40bd0b3e0dd6e8840077ecf20093dc258f7f163');
  expect(originalSourceRevision('video', 'key', undefined, 24n)).toBe(originalSourceRevision('video', 'key', null, '24'));
  for (const args of [['video2','key',null,'24'], ['video','key2',null,'24'], ['video','key','upload','24'], ['video','key',null,'25']] as const)
    expect(originalSourceRevision(args[0],args[1],args[2],args[3])).not.toBe(originalSourceRevision('video','key',null,'24'));
});

it('original_sniff_stops_at_byte_limit', async () => {
  const { createServer } = await import('node:http');
  const { S3Client } = await import('@aws-sdk/client-s3');
  const { getObjectBytes } = await import('../packages/s3/src/operations');
  let closed = 0;
  const server = createServer((req, res) => {
    res.on('close', () => { closed++; });
    if (req.url?.includes('/declared')) { res.writeHead(200, { 'content-length': '999999' }); res.write(Buffer.alloc(16)); }
    else if (req.url?.includes('/overflow')) { res.writeHead(200); res.write(Buffer.alloc(8192)); }
    else { res.writeHead(206, { 'content-length': '4096' }); res.end(Buffer.alloc(4096, 7)); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address(); if (!addr || typeof addr === 'string') throw Error('no port');
  const client = new S3Client({ endpoint: `http://127.0.0.1:${addr.port}`, region: 'test', forcePathStyle: true,
    credentials: { accessKeyId: 'synthetic', secretAccessKey: 'synthetic' }, maxAttempts: 1 });
  try {
    const ctx = { client, bucket: 'synthetic' };
    for (const key of ['declared','overflow']) await expect(getObjectBytes(ctx,key,'bytes=0-4095',4096)).rejects.toThrow('byte limit');
    expect(await getObjectBytes(ctx,'bounded','bytes=0-4095',4096)).toEqual(new Uint8Array(4096).fill(7));
    await expect.poll(() => closed).toBe(3);
  } finally { client.destroy(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
});

it('original_stream_survives_header_deadline_and_aborts', async () => {
  const { createServer } = await import('node:http');
  const { performance } = await import('node:perf_hooks');
  const { streamGuestFile } = await import('../apps/web/src/server/guest-file');
  const opened = new Map<string, number>(), closed = new Map<string, number>();
  const server = createServer((req, res) => {
    const key = req.url!; opened.set(key, performance.now());
    res.writeHead(200, { 'content-type': 'application/octet-stream' }); res.flushHeaders(); res.write('start;');
    const heartbeat = setInterval(() => res.write('.'), 10000);
    const marker = setTimeout(() => res.write('ORIGINAL_LATE_MARKER'), 125000);
    res.on('close', () => { closed.set(key, performance.now()); clearInterval(heartbeat); clearTimeout(marker); });
  });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const addr=server.address(); if(!addr || typeof addr==='string') throw Error('no port');
  const base=`http://127.0.0.1:${addr.port}`, controller=new AbortController();
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const legacy = (async () => {
    let count=0, text=''; const start=performance.now();
    try { const response=await streamGuestFile(base+'/legacy',new Request(base));
      const r=response.body!.getReader(); try { while(true) { const part=await r.read(); if(part.done) break; count+=part.value.length; text+=Buffer.from(part.value).toString(); } } finally { r.releaseLock(); }
      return { aborted:false,elapsed:performance.now()-start,count,text };
    } catch { return { aborted:true,elapsed:performance.now()-start,count,text }; }
  })();
  try {
    const response=await streamGuestFile(base+'/original',new Request(base,{signal:controller.signal}),{headersTimeoutMs:100});
    reader=response.body!.getReader(); let text='', count=0;
    while(!text.includes('ORIGINAL_LATE_MARKER')) { const part=await reader.read(); expect(part.done).toBe(false); if(!part.value)throw Error('body ended'); count+=part.value.length; text+=Buffer.from(part.value).toString(); }
    console.info('original_stream_marker', {elapsedMs:Math.round(performance.now()-opened.get('/original')!)});expect(performance.now()-opened.get('/original')!).toBeGreaterThanOrEqual(125000); expect(count).toBeLessThanOrEqual(1024);
    const aborted=performance.now(); controller.abort(); await reader.read().catch(()=>{});
    await expect.poll(()=>closed.has('/original'),{timeout:2000,interval:20}).toBe(true);
    console.info('original_stream_abort', {closeMs:Math.round(closed.get('/original')!-aborted)});expect(closed.get('/original')!-aborted).toBeLessThanOrEqual(2000);
    const old=await Promise.race([legacy,new Promise<never>((_resolve,reject)=>setTimeout(()=>reject(Error('Legacy stream did not reach its 120s cutoff')),1000))]); expect(old.aborted).toBe(true); expect(old.elapsed).toBeGreaterThanOrEqual(119000); expect(old.elapsed).toBeLessThan(125000);
    expect(old.count).toBeLessThanOrEqual(1024); expect(old.text).not.toContain('ORIGINAL_LATE_MARKER');
  } finally { controller.abort(); reader?.releaseLock(); server.closeAllConnections(); await legacy; await new Promise<void>(resolve=>server.close(()=>resolve())); }
},150000);

it('original header timeout and downstream body cancellation close upstream', async () => {
  const { createServer }=await import('node:http'); const { streamGuestFile,StorageStreamError }=await import('../apps/web/src/server/guest-file');
  const closed=new Set<string>(); const server=createServer((req,res)=>{res.on('close',()=>closed.add(req.url!));
    if(req.url==='/waiting')return; if(req.url==='/missing'){res.writeHead(404).end();return;}
    res.writeHead(200);res.write('bounded'); });
  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r)); const addr=server.address();if(!addr||typeof addr==='string')throw Error('no port');const base=`http://127.0.0.1:${addr.port}`;
  try {
    await expect(streamGuestFile(base+'/waiting',new Request(base),{headersTimeoutMs:30})).rejects.toThrow();
    const controller=new AbortController();const active=await streamGuestFile(base+'/disconnect',new Request(base,{signal:controller.signal}),{headersTimeoutMs:1000});const reader=active.body!.getReader();await reader.read();controller.abort();await reader.read().catch(()=>{});reader.releaseLock();await expect.poll(()=>closed.has('/disconnect'),{timeout:2000}).toBe(true);
    const response=await streamGuestFile(base+'/cancel',new Request(base),{headersTimeoutMs:1000});await response.body!.cancel();
    await expect.poll(()=>closed.has('/cancel')).toBe(true);
    await expect(streamGuestFile(base+'/missing',new Request(base),{headersTimeoutMs:1000})).rejects.toBeInstanceOf(StorageStreamError);
    const abort=new AbortController();abort.abort();await expect(streamGuestFile(base+'/aborted',new Request(base,{signal:abort.signal}),{headersTimeoutMs:1000})).rejects.toThrow();
  } finally {server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});

it('original abort survives native Request garbage collection',async()=>{
 const {execFile}=await import('node:child_process'),{promisify}=await import('node:util'),{pathToFileURL}=await import('node:url'),{resolve}=await import('node:path');
 const program=`import{createServer}from'node:http';import{streamGuestFile}from${JSON.stringify(pathToFileURL(resolve('apps/web/src/server/guest-file.ts')).href)};
 const server=createServer((req,res)=>{res.writeHead(200);res.write('marker');res.on('close',()=>{closed=true});});let closed=false;await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const parent=new AbortController(),negative=new AbortController();let orphan=new Request(base,{signal:negative.signal});const negativeSignal=orphan.signal;orphan=null;
 const response=await streamGuestFile(base,new Request(base,{signal:parent.signal}),process.env.ORIGINAL_GC_MODE==='legacy'?undefined:{headersTimeoutMs:1000}),reader=response.body.getReader();await reader.read();
 for(let i=0;i<20;i++){global.gc();await new Promise(r=>setTimeout(r,10));}negative.abort();parent.abort();
 let bodyFailed=false;await Promise.race([reader.read().catch(()=>{bodyFailed=true}),new Promise(r=>setTimeout(r,100))]);for(let i=0;i<20&&!closed;i++)await new Promise(r=>setTimeout(r,10));
 console.log(JSON.stringify({negativeAborted:negativeSignal.aborted,closed,bodyFailed}));await reader.cancel().catch(()=>{});reader.releaseLock();server.closeAllConnections();await new Promise(r=>server.close(r));`;
 for(const mode of ['original','legacy']) {const result=await promisify(execFile)(process.execPath,['--expose-gc','--experimental-transform-types','--input-type=module','-e',program],{timeout:5000,env:{...process.env,ORIGINAL_GC_MODE:mode}});
 expect(JSON.parse(result.stdout.trim()),mode).toEqual({negativeAborted:false,closed:true,bodyFailed:true});}
});

it('rejected or incomplete upload identity never reaches storage',async()=>{
 for(const patch of [{status:'uploading'},{status:'failed',failure_reason:'not_media'},{status:'failed',failure_reason:'too_large'},{actual_bytes:null},{actual_bytes:'0'},{object_key:null}]){
  const f=fixture();Object.assign(f.row,patch);const response=await f.handler(request(),id);expect(response.status).toBe(patch.status==='uploading'?409:404);expect(f.deps.head).not.toHaveBeenCalled();expect(f.deps.bytes).not.toHaveBeenCalled();expect(f.deps.sign).not.toHaveBeenCalled();
 }
});

it('original 416 does not expose storage error body',async()=>{
 const f=fixture(),body='<Error><Resource>private-storage-object</Resource></Error>';
 f.deps.stream.mockResolvedValue(new Response(body,{status:416,headers:{'content-range':'bytes */24','content-length':String(body.length),'content-type':'application/xml'}}));
 const response=await f.handler(request('',{headers:{range:'bytes=100-'}}),id);expect(response.status).toBe(416);expect(response.headers.get('content-range')).toBe('bytes */24');expect(await response.text()).toBe('');expect(response.headers.get('content-length')).toBeNull();
});
