import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {SupportMailer,createSupportMailer} from '../apps/web/src/server/support/mail';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { retentionNoticesTick } from '../apps/web/src/server/retention-notices';
import type { RetentionNoticeMessage } from '../apps/web/src/server/support/mail';
const url=process.env.DATABASE_URL, DAY=86_400_000,HOUR=3_600_000;
const now=new Date('2026-11-10T12:00:00Z'),origin='https://test.invalid';
type Mailer=Pick<SupportMailer,'sendRetention'|'retentionSender'>;
describe.skipIf(!url)('durable retention notices PostgreSQL',()=>{
 let pool:Pool;const schema='notices_'+randomBytes(8).toString('hex');
 beforeAll(async()=>{
  if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('isolated *_test database required');
  await ensureTestDatabase(url);pool=createPool(url,schema);
  await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);
 });
 beforeEach(async()=>{await pool.query('TRUNCATE account CASCADE');});
 afterAll(async()=>{if(pool){try{await pool.query(`DROP SCHEMA ${schema} CASCADE`);}finally{await pool.end();}}});
 async function fixture(remaining=2*DAY,verified=true){
  const email=randomUUID()+'@example.test';
  const account=(await pool.query(`INSERT INTO account(email,password_hash,email_verified_at) VALUES($1,'synthetic',$2) RETURNING id`,[email,verified?now:null])).rows[0].id as string;
  const video=(await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,status) VALUES($1,$2,'upload',100,'done') RETURNING id`,[account,randomUUID()])).rows[0].id as string;
  const ready=new Date(now.getTime()+remaining-7*DAY);
  const clip=(await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key,ready_at,ready_at_source)
   VALUES($1,1,0,20,'Synthetic','done',true,'synthetic-key',$2,'render') RETURNING id`,[video,ready])).rows[0].id as string;
  return {account,video,clip,email,ready};
 }
 const fake=(state:'accepted'|'failed'|'unknown'='accepted')=>({retentionSender:'Sender <sender@example.test>',
  sendRetention:vi.fn<Mailer['sendRetention']>().mockImplementation(async()=>({state,receipt:state==='accepted'?'synthetic-receipt':null}))});
 const tick=(mail:Mailer,at=now,batch=100)=>retentionNoticesTick(pool,mail,origin,at,batch);
 const journal=async()=> (await pool.query('SELECT *,expiry_day_msk::text FROM retention_notice ORDER BY created_at,id')).rows;
 async function waitForReaperLock(){
  for(let i=0;i<150;i++){
   if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%UPDATE retention_notice SET state=%' AND pid<>pg_backend_pid()")).rowCount)return;
   await new Promise(r=>setTimeout(r,10));
  }throw Error('reaper did not wait for finalizer');
 }
 it.each(['accepted','replacement'] as const)('notice_reaper_preserves_concurrent_accepted_and_live_lease: %s',async(kind)=>{
  await fixture();await tick(fake('unknown'));const [initial]=await journal();
  await pool.query("UPDATE retention_notice SET state='sending',lease_until=$1,attempts=3 WHERE id=$2",[new Date(now.getTime()-1000),initial.id]);
  const finalizer=await pool.connect();let running:Promise<unknown>|undefined;
  try{
   await finalizer.query('BEGIN');
   if(kind==='accepted')await finalizer.query("UPDATE retention_notice SET state='accepted',lease_until=NULL,provider_receipt='synthetic-accepted' WHERE id=$1",[initial.id]);
   else await finalizer.query("UPDATE retention_notice SET lease_until=$2 WHERE id=$1",[initial.id,new Date(now.getTime()+HOUR)]);
   const mail=fake();running=tick(mail);await waitForReaperLock();await finalizer.query('COMMIT');await running;
   const [result]=await journal();expect(result.state).toBe(kind==='accepted'?'accepted':'sending');
   expect(result.provider_receipt).toBe(kind==='accepted'?'synthetic-accepted':null);expect(result.payload).toEqual(initial.payload);
   expect(result.first_attempt_at).toEqual(initial.first_attempt_at);expect(mail.sendRetention).not.toHaveBeenCalled();
  }finally{await finalizer.query('ROLLBACK');finalizer.release();await running?.catch(()=>{});}
 });
 it.each(['disabled','smtp'] as const)('unavailable_mailer_recovers_expired_sending_lease: %s',async(mode)=>{
  await fixture();await tick(fake('unknown'));const [initial]=await journal();
  await pool.query("UPDATE retention_notice SET state='sending',lease_until=$1 WHERE id=$2",[new Date(now.getTime()-1000),initial.id]);
  const mail=new SupportMailer(mode==='disabled'?{mode:'disabled'}:{mode:'smtp',host:'mail.example.test',port:465,secure:true,user:'synthetic',password:'synthetic',from:'sender@example.test'});
  const send=vi.spyOn(mail,'sendRetention');await tick(mail);
  const [result]=await journal();expect(result.state).toBe('unknown');expect(result.attempts).toBe(initial.attempts);
  expect(result.first_attempt_at).toEqual(initial.first_attempt_at);expect(result.payload).toEqual(initial.payload);expect(result.provider_key).toBe(initial.provider_key);expect(send).not.toHaveBeenCalled();
 });
 it.each(['expired','extended'] as const)('notice_claim_rechecks_clock_after_lock_wait: %s',async(kind)=>{
  vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(now);
  await fixture(DAY/2);await tick(fake('unknown'));const [initial]=await journal(),holder=await pool.connect();
  // Retry becomes due before expiry, then its row lock blocks past expiry.
  const due=new Date(now.getTime()+HOUR+1000);vi.setSystemTime(due);let running:Promise<unknown>|undefined;
  try{
   await holder.query('BEGIN');await holder.query('SELECT id FROM retention_notice WHERE id=$1 FOR UPDATE',[initial.id]);
   const mail=fake();running=retentionNoticesTick(pool,mail,origin);
   for(let i=0;i<150;i++){
    if((await pool.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM retention_notice%FOR UPDATE%' AND pid<>pg_backend_pid()")).rowCount)break;
    if(i===149)throw Error('notice claim did not wait');await new Promise(r=>setTimeout(r,10));
   }
   if(kind==='extended'){
    const start=new Date(due.getTime()+1000);await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,available_at,expires_at,entitlement_start,entitlement_end) VALUES($1,'payment',$2,60,0,$3,$4,$3,$4)`,[initial.account_id,randomUUID(),start,new Date(start.getTime()+30*DAY)]);
    vi.setSystemTime(new Date(due.getTime()+HOUR));
   }else vi.setSystemTime(new Date(now.getTime()+DAY));
   await holder.query('COMMIT');await running;
   expect(mail.sendRetention).not.toHaveBeenCalled();expect((await journal())[0].state).toBe('superseded');
  }finally{await holder.query('ROLLBACK');holder.release();await running?.catch(()=>{});vi.useRealTimers();}
 });
 it('runtime_test_mailer_captures_synthetic_notice',async()=>{
  const f=await fixture();const directory=await mkdtemp(path.join(tmpdir(),'retention-capture-')),destination=path.join(directory,'capture.jsonl'),previous=process.env.N5_MAIL_TEST_CAPTURE_FILE;
  process.env.N5_MAIL_TEST_CAPTURE_FILE=destination;
  try{
   // The same factory used by support/routes and queue-runtime.
   const mail=createSupportMailer({mode:'test'});await tick(mail);
   expect((await journal())[0]).toMatchObject({state:'accepted',attempts:1});
   expect(JSON.parse((await readFile(destination,'utf8')).trim())).toMatchObject({to:expect.stringContaining('@example.test')});
   for(const purpose of ['verify','reset'] as const)expect(await mail.send({to:f.email,url:origin+'/synthetic-'+purpose,purpose})).toBe('accepted');
   const lines=(await readFile(destination,'utf8')).trim().split('\n').map(line=>JSON.parse(line));expect(lines).toHaveLength(3);expect(lines.slice(1).map(line=>line.purpose)).toEqual(['verify','reset']);
   const real=await fixture();await pool.query('UPDATE account SET email=$2 WHERE id=$1',[real.account,'recipient@customer.example.ru']);await tick(mail);
   expect((await journal()).find(row=>row.account_id===real.account).state).toBe('failed');expect((await readFile(destination,'utf8')).trim().split('\n')).toHaveLength(3);
   const absent=createSupportMailer({mode:'test'},'');const before=await journal();await fixture();await tick(absent);expect(await journal()).toEqual(before);
  }finally{if(previous===undefined)delete process.env.N5_MAIL_TEST_CAPTURE_FILE;else process.env.N5_MAIL_TEST_CAPTURE_FILE=previous;await rm(directory,{recursive:true,force:true});}
 });
 it('catchup_first_attempt_after_due_day_is_allowed',async()=>{
  await fixture();const mail=fake();await tick(mail);
  expect(mail.sendRetention).toHaveBeenCalledOnce();const [row]=await journal();
  expect(row.offset_days).toBe(3);expect(row.state).toBe('accepted');expect(row.attempts).toBe(1);
  expect(row.first_attempt_at.getTime()).toBeGreaterThanOrEqual(now.getTime());
  expect(row.first_attempt_at.getTime()-now.getTime()).toBeLessThan(1000);
 });
 it('persists first_attempt_at and lease before the first external call',async()=>{
  await fixture();const mail=fake();mail.sendRetention.mockImplementation(async()=>{
   const [row]=await journal();expect(row.state).toBe('sending');expect(row.attempts).toBe(1);
   expect(row.first_attempt_at).toBeInstanceOf(Date);expect(row.lease_until.getTime()-row.first_attempt_at.getTime()).toBe(120000);
   return {state:'accepted',receipt:'synthetic'};
  });await tick(mail);
 });
 it.each([[3*DAY,3],[DAY,1],[DAY/2,1],[3*DAY+1000,null],[0,null],[-1000,null]] as const)('uses only the current catch-up offset at remaining=%s',async(remaining,expected)=>{
  await fixture(remaining);const mail=fake();await tick(mail);
  expect(mail.sendRetention).toHaveBeenCalledTimes(expected===null?0:1);
  if(expected!==null)expect((await journal())[0].offset_days).toBe(expected);
 });
 it('groups same Moscow-day clips across different exact seconds into one letter with count and earliest deadline',async()=>{
  const f=await fixture();await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key,ready_at,ready_at_source)
   VALUES($1,2,20,40,'Synthetic','done',true,'other-key',$2,'render')`,[f.video,new Date(f.ready.getTime()+2000)]);
  const mail=fake();await tick(mail);await tick(mail,new Date(now.getTime()+HOUR));
  expect(mail.sendRetention).toHaveBeenCalledOnce();const [content]=mail.sendRetention.mock.calls[0]!;
  expect(content.subject).toContain('2 клипов');expect(content.text).toContain('МСК');
  expect((await journal())[0].clip_count).toBe(2);
 });
 it('two replicas and a restart claim one logical notice during a live lease',async()=>{
  await fixture();let release!:()=>void,started!:()=>void;
  const begun=new Promise<void>(resolve=>{started=resolve;}),barrier=new Promise<void>(resolve=>{release=resolve;});
  const mail=fake();mail.sendRetention.mockImplementation(async()=>{started();await barrier;return {state:'accepted',receipt:'synthetic'};});
  const first=tick(mail);await begun;
  await tick(mail);expect(mail.sendRetention).toHaveBeenCalledOnce();release();await first;
  await tick(mail);expect(await journal()).toHaveLength(1);expect(mail.sendRetention).toHaveBeenCalledOnce();
 });
 it('notice_retry_window_uses_persisted_first_attempt',async()=>{
  await fixture();const mail=fake('unknown');await tick(mail);
  const [initial]=await journal();const original=JSON.stringify(mail.sendRetention.mock.calls[0]);
  await tick(mail,new Date(initial.first_attempt_at.getTime()+HOUR-1));expect(mail.sendRetention).toHaveBeenCalledTimes(1);
  // Restart and expired sending lease do not create a new first-attempt anchor.
  await pool.query("UPDATE retention_notice SET state='sending',lease_until=$1 WHERE id=$2",[new Date(initial.first_attempt_at.getTime()+120000),initial.id]);
  await tick(mail,new Date(initial.first_attempt_at.getTime()+HOUR+1000));
  expect(mail.sendRetention).toHaveBeenCalledTimes(2);expect(JSON.stringify(mail.sendRetention.mock.calls[1])).toBe(original);
  expect((await journal())[0].first_attempt_at).toEqual(initial.first_attempt_at);
  await tick(mail,new Date(initial.first_attempt_at.getTime()+23*HOUR));
  expect(mail.sendRetention).toHaveBeenCalledTimes(2);expect((await journal())[0].state).toBe('unknown');
 });
 it.each(['changed','revoked'] as const)('retention_notice_retry_rejects_stale_recipient: %s',async(kind)=>{
  const f=await fixture();const mail=fake('unknown');await tick(mail);const [initial]=await journal();
  if(kind==='changed')await pool.query('UPDATE account SET email=$2 WHERE id=$1',[f.account,'changed@example.test']);
  else await pool.query('UPDATE account SET email_verified_at=NULL WHERE id=$1',[f.account]);
  await tick(mail,new Date(now.getTime()+HOUR+1000));
  expect(mail.sendRetention).toHaveBeenCalledOnce();const [next]=await journal();
  expect(next.state).toBe('superseded');expect(next.last_error).toBe('recipient_changed');
  expect(next.payload).toEqual(initial.payload);expect(next.provider_key).toBe(initial.provider_key);
 });
 it('limits failed retries to three without resetting provider key or payload',async()=>{
  await fixture();const mail=fake('failed');await tick(mail);
  for(let i=1;i<=4;i++)await tick(mail,new Date(now.getTime()+i*(HOUR+1000)));
  expect(mail.sendRetention).toHaveBeenCalledTimes(3);const [row]=await journal();expect(row.attempts).toBe(3);
  expect(new Set(mail.sendRetention.mock.calls.map(call=>JSON.stringify(call))).size).toBe(1);
 });
 it('supersedes attempted same-day changed deadline without a fresh key',async()=>{
  const f=await fixture();const mail=fake('unknown');await tick(mail);
  await pool.query("UPDATE clip SET ready_at=ready_at+interval '1 second' WHERE id=$1",[f.clip]);
  await tick(mail,new Date(now.getTime()+HOUR+1000));
  expect(mail.sendRetention).toHaveBeenCalledOnce();expect(await journal()).toHaveLength(1);
  expect((await journal())[0].state).toBe('superseded');
 });
 it('supersedes old pending/unknown group after payment changes the date',async()=>{
  const f=await fixture();const mail=fake('unknown');await tick(mail);
  await pool.query("UPDATE account SET plan_paid_until=$2,plan='paid',plan_source='payment' WHERE id=$1",[f.account,new Date(now.getTime()+DAY)]);
  await tick(mail,new Date(now.getTime()+HOUR+1000));
  expect(mail.sendRetention).toHaveBeenCalledOnce();expect((await journal())[0].state).toBe('superseded');
 });
 it('skips unverified addresses and unavailable transport',async()=>{
  await fixture(2*DAY,false);const mail=fake();await tick(mail);expect(mail.sendRetention).not.toHaveBeenCalled();
  const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  try{await tick({...mail,retentionSender:null});expect(warn).toHaveBeenCalledWith(JSON.stringify({event:'retention_mail_unavailable'}));}finally{warn.mockRestore();}
 });
 it('account/video erasure removes notice payload via foreign-key lifecycle',async()=>{
  const f=await fixture();await tick(fake());expect(await journal()).toHaveLength(1);
  await pool.query('DELETE FROM clip WHERE id=$1',[f.clip]);await pool.query('DELETE FROM video WHERE id=$1',[f.video]);
  expect(await journal()).toHaveLength(0);
 });
});
