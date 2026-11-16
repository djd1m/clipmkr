import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdtemp,readdir,copyFile,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { createPool, type Pool, type Attempt } from '../packages/db/src';
import { migrate } from '../packages/db/src/migrate';
import { ClipLayoutRepository } from '../packages/db/src/clip-layout';
import { ClipLayoutService } from '../apps/web/src/server/clip-layout';
import { publishRenderResult, getRenderInput, retryRender } from '../packages/db/src/render';
import { originalSourceRevision } from '../packages/shared/src/server/original-source';
import { loadLimits } from '../packages/shared/src/config';
import { environment } from './fixtures/environment';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import type { ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';
const url=process.env.DATABASE_URL;
describe.skipIf(!url)('layout intent and seed / real PostgreSQL',()=>{
  let pool:Pool;const schema=`layout_${randomBytes(8).toString('hex')}`;
  const now=new Date('2026-11-11T12:00:00Z'),limits=loadLimits(environment());
  const enqueue=vi.fn(async(_a:Attempt)=>{}),seed=vi.fn(async(_j:{clip_id:string;seed_revision:string})=>{});
  const repo=()=>new ClipLayoutRepository(pool,limits,()=>now);
  const service=()=>new ClipLayoutService(repo(),enqueue,seed);
  const layout:ScreenFaceLayoutV1={version:1,mode:'screen-face',variant:'03',screen:{x:0,y:0,width:1,height:1},focus:null,camera:null};
  beforeAll(async()=>{await ensureTestDatabase(url!);pool=createPool(url!,schema);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);});
  beforeEach(async()=>{await pool.query('TRUNCATE account,quota_counter CASCADE');enqueue.mockReset();seed.mockReset();});
  afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();}});
  async function fixture(){
    const account=(await pool.query(`INSERT INTO account(email,password_hash) VALUES($1,'test') RETURNING id`,[`${randomUUID()}@test.invalid`])).rows[0].id as string;
    const video=(await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,finished_at,clips_done,clips_total)
      VALUES($1,$2,'upload',100,100,'source','done',120,$3,1,1) RETURNING id`,[account,randomUUID(),now])).rows[0].id as string;
    const clip=(await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key,thumbnail_key,cut_plan)
      VALUES($1,1,0,20,'Клип','done',true,'old.mp4','old.jpg','[[0,20]]') RETURNING id`,[video])).rows[0].id as string;
    await pool.query('INSERT INTO clip_link(clip_id,code) VALUES($1,$2)',[clip,randomBytes(5).toString('hex')]);
    await pool.query(`INSERT INTO transcript(video_id,language,duration_seconds,chunk_count,words,segments) VALUES($1,'ru',120,1,'[{"word":"Привет","start":0,"end":1}]','[]')`,[video]);
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds) VALUES($1,'signup',$2,600,480)`,[account,randomUUID()]);
    await pool.query(`INSERT INTO video_credit_charge(video_id,cycle,billable_seconds,state,paid_render) VALUES($1,1,120,'settled',false)`,[video]);
    return {account,video,clip,revision:originalSourceRevision(video,'source',null,'100')};
  }
  const input=(f:Awaited<ReturnType<typeof fixture>>,key:string=randomUUID())=>({clip_id:f.clip,request_key:key,
    expected_source_revision:f.revision,expected_render_version:1,reviewed_full_clip:true,layout});
  const count=async(table:string)=>(await pool.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number;
  const charge=async()=>Number((await pool.query(`SELECT COALESCE(sum(used),0) AS n FROM quota_counter WHERE scope='user_rerenders'`)).rows[0].n);
  it('ownership, stale version/source, invalid schema and review refusal precede quota',async()=>{
    const f=await fixture(),other=await fixture();
    for(const id of [f.clip,randomUUID()])await expect(service().setLayout(other.account,{...input(f),clip_id:id})).rejects.toMatchObject({status:404});
    for(const patch of [{expected_source_revision:'a'.repeat(64)},{expected_render_version:2}])
      await expect(service().setLayout(f.account,{...input(f),...patch})).rejects.toMatchObject({status:409});
    for(const patch of [{reviewed_full_clip:false},{extra:true},{layout:{...layout,extra:true}}])
      await expect(service().setLayout(f.account,{...input(f),...patch})).rejects.toMatchObject({status:422});
    expect(await charge()).toBe(0);expect(await count('job_attempt')).toBe(0);expect(enqueue).not.toHaveBeenCalled();
  });
  it('exact replay and ten concurrent confirmations admit one intent, series and quota debit',async()=>{
    const f=await fixture(),request=input(f);
    const grants=(await pool.query('SELECT * FROM credit_grant')).rows,sourceCharges=(await pool.query('SELECT * FROM video_credit_charge')).rows;
    const results=await Promise.all(Array.from({length:10},()=>service().setLayout(f.account,request)));
    expect(results.filter(r=>!r.replayed)).toHaveLength(1);expect(new Set(results.map(r=>r.render_version))).toEqual(new Set([2]));
    expect(await charge()).toBe(1);expect(await count('clip_layout_intent')).toBe(1);expect(await count('job_attempt')).toBe(1);expect(enqueue).toHaveBeenCalledTimes(1);
    expect((await pool.query('SELECT object_key,rendered_layout FROM clip WHERE id=$1',[f.clip])).rows[0]).toEqual({object_key:'old.mp4',rendered_layout:null});
    expect((await pool.query('SELECT * FROM credit_grant')).rows).toEqual(grants);
    expect((await pool.query('SELECT * FROM video_credit_charge')).rows).toEqual(sourceCharges);
    expect(sourceCharges[0]).toMatchObject({billable_seconds:120,state:'settled'});expect(grants[0]).toMatchObject({total_seconds:600,remaining_seconds:480});
    await expect(service().setLayout(f.account,{...request,layout:{...layout,variant:'01'}})).rejects.toMatchObject({status:409});
  });
  it('different request keys at one expected version serialize without a second debit',async()=>{
    const f=await fixture();const r=await Promise.allSettled([1,2].map(()=>service().setLayout(f.account,input(f))));
    expect(r.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(await charge()).toBe(1);
  });
  it('quota refusal rolls back version and intent together',async()=>{
    const f=await fixture();await pool.query(`INSERT INTO quota_counter(scope,scope_key,day,used) VALUES('user_rerenders',$1,'2026-11-11',$2)`,[f.account,limits.N5_LIMIT_USER_RERENDERS]);
    await expect(service().setLayout(f.account,input(f))).rejects.toMatchObject({status:429});
    expect((await pool.query('SELECT render_version FROM clip WHERE id=$1',[f.clip])).rows[0].render_version).toBe(1);
    expect(await count('clip_layout_intent')).toBe(0);expect(await count('job_attempt')).toBe(0);
  });
  it('seed_prepare_is_cached_and_never_consumes_render_quota',async()=>{
    const f=await fixture();
    await Promise.all(Array.from({length:10},()=>service().prepareLayout(f.account,{clip_id:f.clip,expected_source_revision:f.revision})));
    expect(seed).toHaveBeenCalledTimes(1);expect(await count('clip_layout_seed')).toBe(1);
    expect(await charge()).toBe(0);expect(await count('job_attempt')).toBe(0);expect(await count('video_credit_charge')).toBe(1);
    expect((await pool.query('SELECT remaining_seconds FROM credit_grant')).rows[0].remaining_seconds).toBe(480);
    const info=await service().layoutInfo(f.account,{clip_id:f.clip});expect(info.seed.state).toBe('pending');expect(info.publishedLayout).toBeNull();
    expect(info.rerenderQuota.limit).toBe(limits.N5_LIMIT_USER_RERENDERS);
  });
  it('initial sibling publication remembers its computed seed before the whole video is done',async()=>{
    const f=await fixture(),camera={x:.75,y:.05,width:.2,height:.3};
    await pool.query(`UPDATE video SET status='rendering',clips_total=2,clips_done=1 WHERE id=$1`,[f.video]);
    await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked)
      VALUES($1,2,20,40,'Ещё монтируется','queued',true)`,[f.video]);
    await repo().rememberSeed(f.clip,camera);
    expect((await pool.query('SELECT status,payload,attempts FROM clip_layout_seed WHERE clip_id=$1',[f.clip])).rows[0])
      .toEqual({status:'ready',payload:camera,attempts:0});
    await expect(repo().prepare(f.account,f.clip,f.revision)).rejects.toMatchObject({status:409});
    await pool.query(`UPDATE video SET status='done',clips_done=2 WHERE id=$1`,[f.video]);
    const result=await service().prepareLayout(f.account,{clip_id:f.clip,expected_source_revision:f.revision});
    expect(result.state).toBe('ready');expect(seed).not.toHaveBeenCalled();expect(await charge()).toBe(0);
    expect((await service().layoutInfo(f.account,{clip_id:f.clip})).seed.proposal).toEqual(camera);
  });
  it('expired pending seeds cannot occupy the recovery batch ahead of a live seed',async()=>{
    const f=await fixture(),live=await repo().prepare(f.account,f.clip,f.revision);
    const expired=(await pool.query<{id:string}>(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key)
      SELECT $1,n,0,20,'Истёкший','done',true,'old' FROM generate_series(2,101) n RETURNING id`,[f.video])).rows;
    await Promise.all(expired.map(c=>repo().prepare(f.account,c.id,f.revision)));
    await pool.query(`UPDATE clip SET expires_at=$2 WHERE video_id=$1 AND id<>$3`,[f.video,now,f.clip]);
    await pool.query(`UPDATE clip_layout_seed SET updated_at=$2::timestamptz-interval '1 hour' WHERE clip_id<>$1`,[f.clip,now]);
    expect(await repo().pendingSeeds()).toEqual([{clip_id:f.clip,seed_revision:live.seedRevision}]);
    expect((await pool.query(`SELECT count(*)::int n FROM clip_layout_seed WHERE status='unavailable'
      AND reason='source_access_unavailable' AND attempts=0`)).rows[0].n).toBe(100);
    expect(await repo().pendingSeeds()).toEqual([{clip_id:f.clip,seed_revision:live.seedRevision}]);
    expect(seed).not.toHaveBeenCalled();expect(await charge()).toBe(0);expect(await count('job_attempt')).toBe(0);
  });
  it('a stale prepared generation becomes unavailable without invalidating an unrelated generation or a live lease',async()=>{
    const f=await fixture(),prepared=await repo().prepare(f.account,f.clip,f.revision);
    expect(await repo().claimSeed(f.clip,'a'.repeat(64))).toBeNull();
    expect((await pool.query('SELECT status FROM clip_layout_seed WHERE clip_id=$1',[f.clip])).rows[0].status).toBe('pending');
    await pool.query(`UPDATE video SET object_key='replaced-source' WHERE id=$1`,[f.video]);
    expect(await repo().claimSeed(f.clip,prepared.seedRevision)).toBeNull();
    expect((await pool.query('SELECT status,reason FROM clip_layout_seed WHERE clip_id=$1',[f.clip])).rows[0])
      .toEqual({status:'unavailable',reason:'source_access_unavailable'});
    await pool.query(`UPDATE video SET object_key='source' WHERE id=$1`,[f.video]);
    await pool.query(`UPDATE clip_layout_seed SET status='pending',reason=NULL WHERE clip_id=$1`,[f.clip]);
    const claim=await repo().claimSeed(f.clip,prepared.seedRevision);expect(claim).not.toBeNull();
    await pool.query(`UPDATE account SET status='erasing' WHERE id=$1`,[f.account]);
    expect(await repo().pendingSeeds()).toEqual([]);
    expect((await pool.query('SELECT status,lease_epoch FROM clip_layout_seed WHERE clip_id=$1',[f.clip])).rows[0])
      .toEqual({status:'running',lease_epoch:claim!.epoch});
  });
  it('seed_claim_rechecks_owner_retention_revision_and_epoch',async()=>{
    const f=await fixture();const prepared=await repo().prepare(f.account,f.clip,f.revision);
    expect(await repo().claimSeed(f.clip,'a'.repeat(64))).toBeNull();
    const claim=await repo().claimSeed(f.clip,prepared.seedRevision);expect(claim).not.toBeNull();
    expect(await repo().claimSeed(f.clip,prepared.seedRevision)).toBeNull();
    expect(await repo().finishSeed(f.clip,prepared.seedRevision,claim!.epoch+1,null)).toBe(false);
    await pool.query(`UPDATE account SET status='erasing' WHERE id=$1`,[f.account]);
    expect(await repo().currentSeed(f.clip,prepared.seedRevision,claim!.epoch)).toBeNull();
    expect(await repo().finishSeed(f.clip,prepared.seedRevision,claim!.epoch,null)).toBe(false);
    await pool.query(`UPDATE account SET status='active' WHERE id=$1`,[f.account]);
    await pool.query(`UPDATE clip SET expires_at=$2 WHERE id=$1`,[f.clip,now]);
    expect(await repo().currentSeed(f.clip,prepared.seedRevision,claim!.epoch)).toBeNull();
    await pool.query('UPDATE clip SET expires_at=NULL WHERE id=$1',[f.clip]);
    await pool.query(`UPDATE video SET object_key='other-source' WHERE id=$1`,[f.video]);
    expect(await repo().currentSeed(f.clip,prepared.seedRevision,claim!.epoch)).toBeNull();
    await pool.query('DELETE FROM clip_link WHERE clip_id=$1',[f.clip]);
    await pool.query('DELETE FROM clip WHERE id=$1',[f.clip]);expect(await count('clip_layout_seed')).toBe(0);
  });
  it('failed delivery is already durable; failed attempts retain old MP4 and published layout',async()=>{
    const f=await fixture();enqueue.mockRejectedValueOnce(new Error('offline'));
    const request=input(f);expect((await service().setLayout(f.account,request)).status).toBe('pending');
    const job=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1',[f.clip])).rows[0]!;
    const next=await retryRender(pool,job,'ffmpeg_failed');expect(next).not.toBeNull();await retryRender(pool,next!,'ffmpeg_timeout');
    expect((await service().setLayout(f.account,request))).toMatchObject({replayed:true,status:'failed'});
    expect((await pool.query('SELECT object_key,rendered_layout FROM clip WHERE id=$1',[f.clip])).rows[0]).toEqual({object_key:'old.mp4',rendered_layout:null});
    expect(await charge()).toBe(1);
  });
  it('fenced input and publication keep pending and published layouts separate',async()=>{
    const f=await fixture();await service().setLayout(f.account,input(f));
    const job=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1',[f.clip])).rows[0]!;
    expect((await getRenderInput(pool,job))?.layout).toEqual(layout);
    const published={version:1 as const,requested:layout,resolved:{cameraVisible:false,reason:'whole_screen'}};
    const result={object_key:'clip-v2.mp4',thumbnail_key:'clip-v2.jpg',bytes:5,watermarked:true,duration_seconds:20,rendered_layout:published};
    expect(await publishRenderResult(pool,{...job,fence:job.fence+1},result,async()=>5)).toBe(false);
    expect((await pool.query('SELECT rendered_layout FROM clip WHERE id=$1',[f.clip])).rows[0].rendered_layout).toBeNull();
    expect(await publishRenderResult(pool,job,result,async()=>5)).toBe(true);
    expect((await service().layoutInfo(f.account,{clip_id:f.clip}))).toMatchObject({publishedRenderVersion:2,publishedLayout:published,activeIntent:{status:'succeeded'}});
    const second={...input(f),expected_render_version:2,layout:{...layout,variant:'01'}};
    await service().setLayout(f.account,second);
    const later=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1 ORDER BY fence DESC LIMIT 1',[f.clip])).rows[0]!;
    const laterLayout={...published,requested:{...layout,variant:'01' as const}};
    expect(await publishRenderResult(pool,later,{...result,object_key:'clip-v3.mp4',thumbnail_key:'clip-v3.jpg',rendered_layout:laterLayout},async()=>5)).toBe(true);
    const old=(await pool.query<{request_key:string}>('SELECT request_key FROM clip_layout_intent WHERE clip_id=$1 AND render_version=2',[f.clip])).rows[0]!.request_key;
    expect(await service().setLayout(f.account,input(f,old))).toMatchObject({replayed:true,render_version:2,status:'succeeded'});
    expect(await charge()).toBe(2);expect((await pool.query('SELECT object_key FROM clip WHERE id=$1',[f.clip])).rows[0].object_key).toBe('clip-v3.mp4');
  });
  it('an exact accepted replay survives source expiry but still requires an active owner and rejects body mismatch',async()=>{
    const f=await fixture(),request=input(f);await service().setLayout(f.account,request);
    const attempt=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1',[f.clip])).rows[0]!;
    const published={version:1 as const,requested:layout,resolved:{cameraVisible:false,reason:'whole_screen'}};
    expect(await publishRenderResult(pool,attempt,{object_key:'clip-v2.mp4',thumbnail_key:'clip-v2.jpg',bytes:5,watermarked:true,duration_seconds:20,rendered_layout:published},async()=>5)).toBe(true);
    await pool.query('UPDATE clip SET expires_at=$2 WHERE id=$1',[f.clip,now]);
    await pool.query(`UPDATE video SET object_key=NULL WHERE id=$1`,[f.video]);
    expect(await service().setLayout(f.account,request)).toMatchObject({replayed:true,status:'succeeded',render_version:2});
    await expect(service().setLayout(f.account,{...request,layout:{...layout,variant:'02'}})).rejects.toMatchObject({status:409,code:'conflict'});
    const foreign=(await fixture()).account;
    await expect(service().setLayout(foreign,request)).rejects.toMatchObject({status:404});
    await pool.query(`UPDATE account SET status='erasing' WHERE id=$1`,[f.account]);
    await expect(service().setLayout(f.account,request)).rejects.toMatchObject({status:404});
    await pool.query(`UPDATE account SET status='active' WHERE id=$1`,[f.account]);
    await pool.query(`UPDATE video SET deleted_at=$2 WHERE id=$1`,[f.video,now]);
    await expect(service().setLayout(f.account,request)).rejects.toMatchObject({status:404});
    expect(await charge()).toBe(1);expect(await count('clip_layout_intent')).toBe(1);
  });
  it('an unadmitted unknown key conflicts after external publication and a newly confirmed request uses the current version',async()=>{
    const f=await fixture(),unknown=input(f),external={...input(f),layout:{...layout,variant:'01' as const}};
    await service().setLayout(f.account,external);
    const attempt=(await pool.query<Attempt>('SELECT * FROM job_attempt WHERE clip_id=$1',[f.clip])).rows[0]!;
    const published={version:1 as const,requested:external.layout,resolved:{cameraVisible:false,reason:null}};
    expect(await publishRenderResult(pool,attempt,{object_key:'clip-v2.mp4',thumbnail_key:'clip-v2.jpg',bytes:5,watermarked:true,duration_seconds:20,rendered_layout:published},async()=>5)).toBe(true);
    await expect(service().setLayout(f.account,unknown)).rejects.toMatchObject({status:409,code:'refused'});
    expect((await pool.query('SELECT count(*)::int n FROM clip_layout_intent WHERE request_key=$1',[unknown.request_key])).rows[0].n).toBe(0);
    expect(await service().setLayout(f.account,{...input(f),expected_render_version:2,layout:{...layout,variant:'02'}})).toMatchObject({replayed:false,render_version:3});
    expect(await charge()).toBe(2);expect(await count('clip_layout_intent')).toBe(2);
  });
  it('malformed seed and intent JSON stored in valid envelopes never escape as ready DTOs',async()=>{
    const f=await fixture();await repo().prepare(f.account,f.clip,f.revision);
    await pool.query(`UPDATE clip_layout_seed SET status='ready',payload='"broken"'::jsonb WHERE clip_id=$1`,[f.clip]);
    await expect(service().layoutInfo(f.account,{clip_id:f.clip})).rejects.toThrow();
    await pool.query('DELETE FROM clip_layout_seed WHERE clip_id=$1',[f.clip]);
    await service().setLayout(f.account,input(f));
    await pool.query(`UPDATE clip_layout_intent SET layout='{"version":1,"mode":"screen-face"}'::jsonb WHERE clip_id=$1`,[f.clip]);
    await expect(service().layoutInfo(f.account,{clip_id:f.clip})).rejects.toThrow();
    await pool.query('UPDATE clip_layout_intent SET layout=$2 WHERE clip_id=$1',[f.clip,JSON.stringify(layout)]);
    await pool.query(`UPDATE clip SET rendered_layout=$2 WHERE id=$1`,[f.clip,JSON.stringify({version:1,requested:layout,resolved:{cameraVisible:'yes',reason:null}})]);
    await expect(service().layoutInfo(f.account,{clip_id:f.clip})).rejects.toThrow();
  });
});

it.skipIf(!url)('032 migrates populated 031 through canonical journal and preserves legacy balances, source and output keys',async()=>{
  const schema=`layout_populated_${randomBytes(6).toString('hex')}`,pool=createPool(url!,schema);
  const dir=await mkdtemp('/tmp/clipmkr-layout-migrations-');
  try {
    await ensureTestDatabase(url!);await pool.query(`CREATE SCHEMA ${schema}`);
    for(const name of await readdir('packages/db/migrations'))if(name.endsWith('.sql') && name<'032_')
      await copyFile(join('packages/db/migrations',name),join(dir,name));
    await migrate(pool,dir);
    const account=(await pool.query(`INSERT INTO account(email,password_hash) VALUES($1,'legacy') RETURNING id`,[`${randomUUID()}@test.invalid`])).rows[0].id;
    const video=(await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds)
      VALUES($1,$2,'upload',100,100,'legacy-source','done',120) RETURNING id`,[account,randomUUID()])).rows[0].id;
    const clip=(await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,object_key,thumbnail_key,watermarked)
      VALUES($1,1,0,20,'Сохранить','done','legacy-output','legacy-thumb',true) RETURNING id`,[video])).rows[0].id;
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds) VALUES($1,'signup',$2,600,480)`,[account,randomUUID()]);
    await pool.query(`INSERT INTO video_credit_charge(video_id,cycle,billable_seconds,state,paid_render) VALUES($1,1,120,'settled',false)`,[video]);
    const before={account:(await pool.query('SELECT * FROM account WHERE id=$1',[account])).rows,
      video:(await pool.query('SELECT * FROM video WHERE id=$1',[video])).rows,
      clip:(await pool.query('SELECT * FROM clip WHERE id=$1',[clip])).rows,
      grants:(await pool.query('SELECT * FROM credit_grant')).rows,charges:(await pool.query('SELECT * FROM video_credit_charge')).rows};
    await migrate(pool);await migrate(pool);
    const after=(await pool.query('SELECT * FROM clip WHERE id=$1',[clip])).rows[0];expect(after.rendered_layout).toBeNull();delete after.rendered_layout;
    expect(after).toEqual(before.clip[0]);expect((await pool.query('SELECT * FROM account WHERE id=$1',[account])).rows).toEqual(before.account);
    expect((await pool.query('SELECT * FROM video WHERE id=$1',[video])).rows).toEqual(before.video);
    expect((await pool.query('SELECT * FROM credit_grant')).rows).toEqual(before.grants);
    expect((await pool.query('SELECT * FROM video_credit_charge')).rows).toEqual(before.charges);
    expect((await pool.query(`SELECT count(*)::int n FROM _schema_migration WHERE name='032_clip_layout.sql'`)).rows[0].n).toBe(1);
    await expect(pool.query(`INSERT INTO clip_layout_seed(clip_id,source_revision,seed_revision,status) VALUES($1,$2,$2,'bogus')`,[clip,'a'.repeat(64)])).rejects.toMatchObject({code:'23514'});
    await expect(pool.query(`INSERT INTO clip_layout_intent(clip_id,request_key,source_revision,base_render_version,render_version,series_no,layout)
      VALUES($1,$2,$3,1,1,1,'{}')`,[clip,randomUUID(),'a'.repeat(64)])).rejects.toMatchObject({code:'23514'});
  } finally {await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await pool.end();await rm(dir,{recursive:true,force:true});}
},30_000);
