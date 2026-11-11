import { expect, it, vi } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3Client, headObject, getObjectBytes, generateDownloadUrl, deleteObject } from '../packages/s3/src/index';
import { createOriginalFileHandler, type OriginalFileDependencies } from '../apps/web/src/server/original-file';
import { streamGuestFile } from '../apps/web/src/server/guest-file';
import { liveS3Environment } from './fixtures/environment';

it('original_cloudru_range_download_contract', async()=>{
 const safety=liveS3Environment(),namespace=`tests/site/original_${randomUUID()}/`,scope={prefixes:[namespace]};
 const client=createS3Client({...safety.config,keyPrefix:namespace});safety.bind(client,scope);safety.bind(client.signingClient!,scope);
 const ctx={client,bucket:safety.config.bucket},key='source.mp4',id=randomUUID(),media=readFileSync('tests/artifacts/render-and-watermark/clip.mp4');
 const audit=safety.receipt(namespace,'original-source'),signed:string[]=[];let primary:unknown,cleanup:unknown;
 // Independent native transport fence also covers server-internal presigned GETs.
 const fetchGuard=vi.spyOn(globalThis,'fetch').mockImplementation((input,init)=>safety.fetch(String(input),init??{},scope));
 try {
  audit.attempt(key);await client.send(new PutObjectCommand({Bucket:ctx.bucket,Key:key,Body:media,ContentType:'application/octet-stream'}));
  const handler=createOriginalFileHandler({pool:{query:async()=>({rows:[{status:'done',object_key:key,upload_id:'synthetic',actual_bytes:String(media.length),duration_seconds:'1.0',failure_reason:null}]})} as unknown as OriginalFileDependencies['pool'],
   auth:{authenticate:async()=>({account_id:id})} as OriginalFileDependencies['auth'],trustedProxyHops:1,allowRead:async()=>true,
   head:k=>headObject(ctx,k),bytes:k=>getObjectBytes(ctx,k,'bytes=0-4095',4096),
   sign:async k=>{const url=await generateDownloadUrl(ctx,k,undefined,new Date(Date.now()+2500));signed.push(url);return url;},stream:(url,req)=>streamGuestFile(url,req,{headersTimeoutMs:15000})});
  const req=(suffix='',range?:string)=>new Request('https://app.test/original'+suffix,{headers:{cookie:`__Host-n5_session=${'a'.repeat(43)}`,'x-forwarded-for':'192.0.2.1,127.0.0.1',...(range?{range}:{})}});
  const meta=await handler(req('?metadata=1'),id);expect(await meta.json()).toMatchObject({state:'ready',media:{mime:'video/mp4',bytes:String(media.length),durationSeconds:1}});expect(signed).toHaveLength(0);
  const full=await handler(req('?download=1'),id);expect(full.status).toBe(200);expect(full.headers.get('location')).toBeNull();expect(full.headers.get('content-type')).toBe('video/mp4');expect(full.headers.get('content-disposition')).toContain('attachment; filename="source.mp4"');
  const bytes=new Uint8Array(await full.arrayBuffer());expect(bytes.length).toBeLessThan(1024*1024);expect(createHash('sha256').update(bytes).digest('hex')).toBe(createHash('sha256').update(media).digest('hex'));
  expect(Number(new URL(signed[0]!).searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(900);
  await new Promise(resolve=>setTimeout(resolve,3500));
  const expired=await safety.fetch(signed[0]!,{headers:{Range:'bytes=0-15'}},scope);expect(expired.status).toBe(403);await expired.body?.cancel();
  const range=await handler(req('','bytes=0-15'),id);expect(range.status).toBe(206);expect(range.headers.get('content-range')).toBe(`bytes 0-15/${media.length}`);expect(Buffer.from(await range.arrayBuffer())).toEqual(media.subarray(0,16));expect(signed[1]).not.toBe(signed[0]);
  const beyond=await handler(req('',`bytes=${media.length+10}-`),id);expect(beyond.status).toBe(416);expect(beyond.headers.get('content-range')).toBe(`bytes */${media.length}`);expect(await beyond.text()).toBe('');expect(beyond.headers.get('content-length')).toBeNull();
 }catch(error){primary=error;}finally{
  fetchGuard.mockRestore();try{audit.beginCleanup();await deleteObject(ctx,key);audit.finish(true);}catch(error){cleanup=error;audit.finish(false);}finally{client.destroy();}
 }
 audit.report(primary,cleanup);
},60000);
