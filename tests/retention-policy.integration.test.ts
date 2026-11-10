import {watchdogTick} from '../apps/web/src/server/watchdog';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import * as s3 from '../packages/s3/src';
import { environment,liveS3Environment } from './fixtures/environment';
import { loadWebConfig } from '../packages/shared/src/config';
import { beforeAll,afterAll,beforeEach,describe,it,expect,vi } from 'vitest';
import { randomUUID,randomBytes } from 'node:crypto';
import { mkdtemp,cp,rm,readdir } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { createPool,retentionDeadlineSql,clipAliveSql,type Pool } from '../packages/db/src';
import { migrate } from '../packages/db/src/migrate';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { clipExpiry } from '../packages/shared/src/tariff';
import { retentionTick,RETENTION_INTERVAL_MS,type RetentionStorage } from '../apps/web/src/server/retention';
import { ScreenService } from '../apps/web/src/server/screen';
import { createClipFileHandler } from '../apps/web/src/server/clip-file';
import { ShortLinkService,previewState } from '../apps/web/src/server/short-link';
const url=process.env.DATABASE_URL,now=new Date('2026-11-10T12:00:00Z'),day=86400000;
async function fixture(pool:Pool,age=8){
 const account=randomUUID(),video=randomUUID(),clip=randomUUID(),ready=new Date(now.getTime()-age*day);
 await pool.query("INSERT INTO account(id,email,password_hash) VALUES($1,$2,'synthetic')",[account,`${account}@example.test`]);
 await pool.query("INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,status,finished_at,object_key) VALUES($1,$2,$3,'upload',100,'done',$4,$5)",[video,account,randomUUID(),ready,`videos/${account}/${video}/source.mp4`]);
 await pool.query(`INSERT INTO clip(id,video_id,index,start_seconds,end_seconds,title,status,watermarked,ready_at,ready_at_source,object_key,thumbnail_key)
  VALUES($1,$2,1,0,20,'synthetic','done',true,$3,'render',$4,$5)`,[clip,video,ready,`clips/free/${video}/${clip}.mp4`,`thumbs/${video}/${clip}.jpg`]);
 await pool.query("INSERT INTO clip_link(clip_id,code) VALUES($1,$2)",[clip,randomBytes(5).toString('hex').toUpperCase()]);
 return {account,video,clip,ready};
}
const storage=():RetentionStorage=>({delete:vi.fn(async()=>{}),erasePrefix:vi.fn(async()=>{}),eraseClipPrefix:vi.fn(async()=>{})});
describe.skipIf(!url)('retention contract PostgreSQL',()=>{
 let pool:Pool;const schema=`retention_${randomBytes(6).toString('hex')}`;
 beforeAll(async()=>{if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Only *_test database');await ensureTestDatabase(url);pool=createPool(url,schema);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);});
 beforeEach(async()=>{await pool.query('TRUNCATE account CASCADE');});
 afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();}});
 it('retention_signature_delay_never_extends_deadline',async()=>{
  const f=await fixture(pool,4),deadline=new Date(f.ready.getTime()+7*day);
  const config=loadWebConfig(environment()),client=s3.createS3Client(config.s3),ctx={client,bucket:config.s3.bucket};
  const sign=vi.fn((key:string,filename?:string,notAfter?:Date|null)=>s3.generateDownloadUrl(ctx,key,filename,notAfter,new Date(deadline.getTime()+1)));
  try{
   const handler=createClipFileHandler({pool,auth:{authenticate:vi.fn().mockResolvedValue({account_id:f.account})},allowRead:async()=>true,trustedProxyHops:1,clock:()=>now,sign});
   const response=await handler(new Request('https://example.test/file',{headers:{cookie:`__Host-n5_session=${'a'.repeat(43)}`,'x-forwarded-for':'192.0.2.1,127.0.0.1'}}),f.clip);
   expect(sign).toHaveBeenCalledOnce();expect(response.status).toBe(404);expect(response.headers.has('location')).toBe(false);
  }finally{client.destroy();}
 });
 it.skipIf(process.env.N5_PREFIX_RUN_S3!=='1')('real S3 fenced cleanup and late PUT reconciliation preserve source and sibling',async()=>{
  const f=await fixture(pool),safety=liveS3Environment(),namespace=`tests/site/retention_${randomUUID()}/`;
  const scope={prefixes:[namespace],allowList:true,allowVersioning:true},client=s3.createS3Client({...safety.config,keyPrefix:namespace});
  safety.bind(client,scope);safety.bind(client.signingClient!,scope);
  const ctx={client,bucket:safety.config.bucket},key=`clips/free/${f.video}/${f.clip}.mp4`,source=`videos/${f.account}/${f.video}/source.mp4`,sibling=`clips/free/${f.video}/${randomUUID()}.mp4`;
  const keys=[key,source,sibling],audit=safety.receipt(namespace,'retention-late-put');let primary:unknown,cleanupError:unknown;
  const store:RetentionStorage={delete:k=>s3.deleteObject(ctx,k),erasePrefix:()=>{throw Error('source erase forbidden');},eraseClipPrefix:p=>s3.eraseClipPrefix(ctx,p)};
  try{
   for(const k of keys){audit.attempt(k);await client.send(new PutObjectCommand({Bucket:ctx.bucket,Key:k,Body:'synthetic-retention'}));}
   await retentionTick(pool,store,now);await expect(s3.headObject(ctx,key)).rejects.toMatchObject({$metadata:{httpStatusCode:404}});
   // A renderer's remote write completes after the first sweep, followed by worker loss.
   await client.send(new PutObjectCommand({Bucket:ctx.bucket,Key:key,Body:'synthetic-retention'}));
   await retentionTick(pool,store,new Date(now.getTime()+RETENTION_INTERVAL_MS));
   await expect(s3.headObject(ctx,key)).rejects.toMatchObject({$metadata:{httpStatusCode:404}});
   expect(await s3.headObject(ctx,source)).toBe(19n);expect(await s3.headObject(ctx,sibling)).toBe(19n);
  }catch(error){primary=error;}finally{
   try{audit.beginCleanup();const removed=await Promise.allSettled(keys.map(k=>s3.deleteObject(ctx,k)));if(removed.some(r=>r.status==='rejected'))throw Error('Synthetic S3 cleanup incomplete');audit.finish(true);}
   catch(error){cleanupError=error;try{audit.finish(false);}catch{}}finally{client.destroy();}
  }
  audit.report(primary,cleanupError);
 },60000);
 async function paymentGrant(tx:Pool|import('pg').PoolClient,account:string,start:Date){
  await tx.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,available_at,expires_at,entitlement_start,entitlement_end)
   VALUES($1,'payment',$2,60,0,$3,$4,$3,$4)`,[account,randomUUID(),start,new Date(start.getTime()+30*day)]);
 }
 async function waitForAccountLock(){
  for(let i=0;i<150;i++){
   if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FOR NO KEY UPDATE%' AND pid<>pg_backend_pid()")).rowCount)return;
   await new Promise(r=>setTimeout(r,10));
  }throw Error('cleanup did not wait at account lock');
 }
 it('watchdog_delay_credit_grant_before_claim_preserves_media',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);
  let release!:()=>void,started!:()=>void;const entered=new Promise<void>(r=>{started=r;}),barrier=new Promise<void>(r=>{release=r;});
  const f=await fixture(pool),warning=await fixture(pool,5),store=storage();
  await pool.query('UPDATE account SET email_verified_at=$2 WHERE id=$1',[warning.account,now]);
  const mail={retentionSender:'sender@example.test',sendRetention:vi.fn(async()=>{started();await barrier;return {state:'accepted' as const,receipt:'synthetic'};})};
  const tick=watchdogTick(pool,async()=>{},undefined,100,store,{mailer:mail,publicOrigin:'https://test.invalid'});
  try{
   await entered;const start=new Date(now.getTime()+1800000);await paymentGrant(pool,f.account,start);
   expect((await pool.query('SELECT plan_paid_until FROM account WHERE id=$1',[f.account])).rows[0].plan_paid_until).toBeNull();
   vi.setSystemTime(new Date(now.getTime()+3600000));release();await tick;
   expect(store.eraseClipPrefix).not.toHaveBeenCalled();expect((await pool.query('SELECT deletion_started_at FROM clip WHERE id=$1',[f.clip])).rows[0].deletion_started_at).toBeNull();
  }finally{release();await tick.catch(()=>{});vi.useRealTimers();}
 });
 it('credit grant starting while retention waits on account lock protects media',async()=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);
  const f=await fixture(pool),payment=await pool.connect(),store=storage();let tick:Promise<unknown>|undefined;
  try{
   await payment.query('BEGIN');await payment.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE',[f.account]);
   tick=retentionTick(pool,store);await waitForAccountLock();await paymentGrant(payment,f.account,new Date(now.getTime()+1800000));
   vi.setSystemTime(new Date(now.getTime()+3600000));await payment.query('COMMIT');await tick;
   expect(store.eraseClipPrefix).not.toHaveBeenCalled();
  }finally{await payment.query('ROLLBACK');payment.release();await tick?.catch(()=>{});vi.useRealTimers();}
 });
 it('SQL and TS parity, account-wide zero-balance and scheduled windows',async()=>{
  const f=await fixture(pool,4),paid=new Date(now.getTime()+2*day);
  const read=async(at:Date)=> (await pool.query(`SELECT ${retentionDeadlineSql('c','v','a','$2')} deadline,${clipAliveSql('c','v','a','$2')} alive FROM clip c JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id WHERE c.id=$1`,[f.clip,at])).rows[0];
  expect((await read(now)).deadline).toEqual(clipExpiry({clipId:f.clip,expiresAt:null,readyAt:f.ready}));
  await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,available_at,expires_at,entitlement_start,entitlement_end)
   VALUES($1,'payment','synthetic',60,0,$2,$3,$2,$3)`,[f.account,new Date(now.getTime()+day),paid]);
  expect((await read(now)).deadline).toEqual(new Date(f.ready.getTime()+7*day));
  expect((await read(new Date(now.getTime()+day-1))).deadline).toEqual(new Date(f.ready.getTime()+7*day));
  expect((await read(new Date(now.getTime()+day))).deadline).toEqual(new Date(paid.getTime()+30*day));
  expect((await read(new Date(paid.getTime()+30*day-1))).alive).toBe(true);
  expect((await read(new Date(paid.getTime()+30*day))).alive).toBe(false);
 });
 it('retention_keeps_source_and_history',async()=>{
  const f=await fixture(pool),store=storage();await retentionTick(pool,store,now);
  const c=(await pool.query('SELECT * FROM clip WHERE id=$1',[f.clip])).rows[0];expect(c.deletion_started_at).toEqual(now);expect(c.object_key).toBeNull();expect(c.media_deleted_at).toEqual(now);
  expect((await pool.query('SELECT object_key FROM video WHERE id=$1',[f.video])).rows[0].object_key).toContain('source.mp4');
  expect(store.erasePrefix).not.toHaveBeenCalled();expect(store.eraseClipPrefix).toHaveBeenCalledTimes(3);
  const screen=await new ScreenService(pool,()=>now).clips(f.account,f.video);expect(screen.clips[0]).toMatchObject({available:false,retention_state:'expired',title:'synthetic'});
 });
 it('retention_late_put_after_delete_crash_is_reconciled',async()=>{
  const f=await fixture(pool),objects=new Set<string>(),key=`clips/free/${f.video}/${f.clip}.mp4`;
  let finishPut!:()=>void;const pendingPut=new Promise<void>(resolve=>{finishPut=()=>{objects.add(key);resolve();};});
  const store=storage();store.eraseClipPrefix=vi.fn(async prefix=>{for(const object of objects)if(object.startsWith(prefix))objects.delete(object);});
  await retentionTick(pool,store,now);finishPut();await pendingPut;expect(objects.has(key)).toBe(true);
  // Worker died before compensation. A new tick must select even null keys + media_deleted marker.
  await retentionTick(pool,store,new Date(now.getTime()+RETENTION_INTERVAL_MS));expect(objects.size).toBe(0);expect(store.eraseClipPrefix).toHaveBeenCalledTimes(6);
 });
 it('unknown readiness is excluded from destructive cleanup',async()=>{
  const f=await fixture(pool);await pool.query("UPDATE clip SET ready_at=NULL,ready_at_source='unknown' WHERE id=$1",[f.clip]);const store=storage();await retentionTick(pool,store,now);expect(store.eraseClipPrefix).not.toHaveBeenCalled();
 });
 it('payment_before_claim_preserves_media',async()=>{
  const f=await fixture(pool),payment=await pool.connect(),store=storage();
  try{
   await payment.query('BEGIN');await payment.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE',[f.account]);
   const tick=retentionTick(pool,store,now);
   // Observe a real waiting cleanup backend before allowing the billing transaction to commit.
   for(let i=0;i<100;i++){const r=await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FOR NO KEY UPDATE%' AND pid<>pg_backend_pid()");if(r.rowCount)break;if(i===99)throw Error('cleanup did not reach account lock');await new Promise(r=>setTimeout(r,10));}
   await payment.query("UPDATE account SET plan='paid',plan_source='payment',plan_paid_until=$2 WHERE id=$1",[f.account,new Date(now.getTime()+30*day)]);await payment.query('COMMIT');await tick;
   expect(store.eraseClipPrefix).not.toHaveBeenCalled();expect((await pool.query('SELECT deletion_started_at FROM clip WHERE id=$1',[f.clip])).rows[0].deletion_started_at).toBeNull();
  }finally{await payment.query('ROLLBACK');payment.release();}
 });
 it('claim before payment stays irreversible and retries after a prefix fault',async()=>{
  const f=await fixture(pool),store=storage();let calls=0;store.eraseClipPrefix=vi.fn(async()=>{if(++calls===2)throw Error('injected S3 failure');});
  await expect(retentionTick(pool,store,now)).rejects.toThrow();
  await pool.query("UPDATE account SET plan='paid',plan_source='payment',plan_paid_until=$2 WHERE id=$1",[f.account,new Date(now.getTime()+30*day)]);
  const c=(await pool.query('SELECT * FROM clip WHERE id=$1',[f.clip])).rows[0];expect(c.object_key).not.toBeNull();expect(c.media_deleted_at).toBeNull();
  await retentionTick(pool,store,new Date(now.getTime()+RETENTION_INTERVAL_MS));expect((await pool.query('SELECT object_key FROM clip WHERE id=$1',[f.clip])).rows[0].object_key).toBeNull();
 });
 it('legacy_ready_is_not_reset_on_rollout',async()=>{
  const name=`legacy_${randomBytes(6).toString('hex')}`,legacy=createPool(url!,name),directory=await mkdtemp(path.join(tmpdir(),'clip-retention-migrations-'));
  try{
   await legacy.query(`CREATE SCHEMA ${name}`);for(const file of await readdir('packages/db/migrations'))if(file.endsWith('.sql')&&!file.startsWith('028_'))await cp(`packages/db/migrations/${file}`,path.join(directory,file));await migrate(legacy,directory);
   const account=randomUUID(),video=randomUUID(),clip=randomUUID(),ready=new Date('2026-10-01T00:00:00Z');
   await legacy.query("INSERT INTO account(id,email,password_hash) VALUES($1,$2,'test')",[account,`${account}@example.test`]);
   await legacy.query("INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,status,finished_at) VALUES($1,$2,$3,'upload',100,'done',$4)",[video,account,randomUUID(),ready]);
   await legacy.query("INSERT INTO clip(id,video_id,index,start_seconds,end_seconds,title,status,watermarked) VALUES($1,$2,1,0,20,'legacy','done',true)",[clip,video]);
   await migrate(legacy);expect((await legacy.query('SELECT ready_at,ready_at_source,media_deleted_at FROM clip WHERE id=$1',[clip])).rows[0]).toEqual({ready_at:ready,ready_at_source:'legacy_video',media_deleted_at:null});
  }finally{await legacy.query(`DROP SCHEMA ${name} CASCADE`);await legacy.end();await rm(directory,{recursive:true,force:true});}
 });
 it('legacy_render_minimum_filters_and_unknown_backfill',async()=>{
  const name=`matrix_${randomBytes(6).toString('hex')}`,legacy=createPool(url!,name),directory=await mkdtemp(path.join(tmpdir(),'retention-legacy-matrix-'));
  try{
   await legacy.query(`CREATE SCHEMA ${name}`);for(const file of await readdir('packages/db/migrations'))if(file.endsWith('.sql')&&!file.startsWith('028_'))await cp(`packages/db/migrations/${file}`,path.join(directory,file));await migrate(legacy,directory);
   const account=randomUUID(),video=randomUUID(),unknownVideo=randomUUID(),render=randomUUID(),fallback=randomUUID(),unknown=randomUUID();
   const first=new Date('2026-10-01T12:00:00Z'),finished=new Date('2026-10-05T12:00:00Z');
   await legacy.query("INSERT INTO account(id,email,password_hash) VALUES($1,$2,'test')",[account,`${account}@example.test`]);
   for(const[id,end]of [[video,finished],[unknownVideo,null]])await legacy.query("INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,status,finished_at,created_at) VALUES($1,$2,$3,'upload',100,'done',$4,'2026-09-01')",[id,account,randomUUID(),end]);
   for(const[id,v,index,key]of [[render,video,1,null],[fallback,video,2,null],[unknown,unknownVideo,1,'synthetic-unknown']])await legacy.query(`INSERT INTO clip(id,video_id,index,start_seconds,end_seconds,title,status,watermarked,object_key) VALUES($1,$2,$3,0,20,'legacy','done',true,$4)`,[id,v,index,key]);
   await legacy.query('INSERT INTO clip_link(clip_id,code) VALUES($1,$2)',[render,randomBytes(5).toString('hex')]);
   const events=[['render','succeeded',false,first,render],['render','succeeded',false,new Date('2026-10-02'),render],['render','succeeded',true,new Date('2026-09-02'),render],['render','failed',false,new Date('2026-09-03'),render],['stt','succeeded',false,new Date('2026-09-04'),null]];
   for(const[i,[stage,status,rerender,end,clip]]of events.entries())await legacy.query("INSERT INTO job_attempt(video_id,clip_id,stage,status,rerender,attempt_no,series_no,fence,unit,unit_count,started_at,finished_at) VALUES($1,$2,$3,$4,$5,1,$6,$6,'none',0,'2026-09-01',$7)",[video,clip,stage,status,rerender,i+1,end]);
   await migrate(legacy);const rows=(await legacy.query('SELECT id,ready_at,ready_at_source,media_deleted_at FROM clip ORDER BY id')).rows;
   expect(rows.find(r=>r.id===render)).toMatchObject({ready_at:first,ready_at_source:'legacy_render',media_deleted_at:null});
   expect(rows.find(r=>r.id===fallback)).toMatchObject({ready_at:finished,ready_at_source:'legacy_video'});
   expect(rows.find(r=>r.id===unknown)).toMatchObject({ready_at:null,ready_at_source:'unknown',media_deleted_at:null});
   const store=storage();await retentionTick(legacy,store,now);expect(store.eraseClipPrefix).not.toHaveBeenCalled();
  }finally{await legacy.query(`DROP SCHEMA ${name} CASCADE`);await legacy.end();await rm(directory,{recursive:true,force:true});}
 });

});
