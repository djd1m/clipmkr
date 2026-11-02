import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { setBloggerPolicy, getBloggerPolicy } from '../packages/db/src/blogger-policy';
import { ensureInitialAttempt } from '../packages/db/src/attempts';
import { acceptProbe } from '../packages/db/src/probe';
import { VideoService, type UploadStorage } from '../apps/web/src/server/video';
import { loadLimits } from '../packages/shared/src/config';
import { moscowDay } from '../packages/shared/src/upload';
import { environment } from './fixtures/environment';
import { ensureTestDatabase } from '../scripts/test-db.mjs';

const url = process.env.DATABASE_URL;
const now = new Date('2026-11-02T10:00:00Z');
const limits = { ...loadLimits(environment()), N5_LIMIT_USER_MINUTES: 1440, N5_LIMIT_GLOBAL_MINUTES: 10000 };
describe.skipIf(!url)('Политика блогера: настоящий PostgreSQL', () => {
  let pool: Pool;
  const schema = `blogger_policy_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Нужна отдельная БД *_test');
    await ensureTestDatabase(url); pool = createPool(url, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  beforeEach(async () => { await pool.query('TRUNCATE account,quota_counter CASCADE'); });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  const account = async (owner = false) => (await pool.query<{id:string}>(`INSERT INTO account(email,password_hash,owner_unlimited)
    VALUES($1,'test',$2) RETURNING id`, [`${randomUUID()}@test.invalid`,owner])).rows[0]!.id;
  const change = (actorAccountId:string,accountId:string,sourceLimitSeconds:number|null = null) =>
    setBloggerPolicy(pool,{actorAccountId,accountId,isBlogger:true,sourceLimitSeconds,commissionPercent:20,reason:'Проверка владельцем'});
  async function queued(accountId:string,cap?:number) {
    const row = (await pool.query<{id:string}>(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,actual_bytes,
      object_key,status,upload_day,source_limit_seconds) VALUES($1,$2,'upload',100,100,'object','queued',$3,$4) RETURNING id`,
    [accountId,randomUUID(),moscowDay(now),cap ?? 5400])).rows[0]!;
    return { id:row.id, attempt:(await ensureInitialAttempt(pool,row.id))! };
  }
  it('migration preserves legacy source limits', async () => {
    const id=await account();
    const v=(await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,status)
      VALUES($1,$2,'upload',100,'uploading') RETURNING source_limit_seconds`,[id,randomUUID()])).rows[0];
    expect(v.source_limit_seconds).toBe(5400);
    expect(await getBloggerPolicy(pool,id)).toMatchObject({is_blogger:false,max_source_seconds:5400,blogger_commission_percent:null});
    for (const sql of ["UPDATE account SET blogger_source_limit_seconds=119 WHERE id=$1",
      "UPDATE account SET blogger_source_limit_seconds=86401 WHERE id=$1",
      "UPDATE account SET blogger_commission_percent=25 WHERE id=$1"]) await expect(pool.query(sql,[id])).rejects.toMatchObject({code:'23514'});
    await expect(pool.query('UPDATE video SET source_limit_seconds=0 WHERE account_id=$1',[id])).rejects.toMatchObject({code:'23514'});
  });
  it('owner policy changes require active owner and audit', async () => {
    const owner=await account(true),target=await account(),other=await account();
    expect(await change(other,target)).toEqual({kind:'forbidden'});
    expect(await change(target,target)).toEqual({kind:'forbidden'});
    expect(await change(owner,target)).toMatchObject({kind:'updated',policy:{max_source_seconds:7200}});
    expect((await pool.query("SELECT operator,action,account_id FROM operator_action")).rows).toEqual([
      {operator:owner,action:'set_blogger_policy',account_id:target}]);
    await pool.query("UPDATE account SET status='erasing' WHERE id=$1",[owner]);
    expect(await change(owner,target,9000)).toEqual({kind:'forbidden'});
    expect((await getBloggerPolicy(pool,target))?.max_source_seconds).toBe(7200);
    await pool.query("UPDATE account SET status='active' WHERE id=$1",[owner]);
    // Принудительный отказ именно записи audit обязан откатить изменение аккаунта.
    await pool.query("ALTER TABLE operator_action ADD CONSTRAINT test_audit_failure CHECK (action<>'set_blogger_policy') NOT VALID");
    try { await expect(change(owner,target,9000)).rejects.toMatchObject({code:'23514'}); }
    finally { await pool.query('ALTER TABLE operator_action DROP CONSTRAINT test_audit_failure'); }
    expect((await getBloggerPolicy(pool,target))?.max_source_seconds).toBe(7200);
  });
  it('idempotent create preserves source limit', async () => {
    const owner=await account(true),id=await account();
    await change(owner,id);
    const storage:UploadStorage={initiate:async()=>randomUUID(),sign:async(_key,_upload,numbers)=>
      (Array.isArray(numbers)?numbers:Array.from({length:numbers},(_,i)=>i+1)).map(n=>({part_number:n,url:'https://storage.test.invalid/part',expires_at:'2026-11-03T00:00:00Z'})),
    list:async()=>[],complete:async()=>{},abort:async()=>{},head:async()=>100n,bytes:async()=>new Uint8Array(),delete:async()=>{}};
    const service=new VideoService(pool,limits,storage,async()=>{},()=>now),key=randomUUID();
    const input={declared_bytes:100,filename:'видео.mp4',source:'upload'};
    const first=await service.create(id,key,input);
    await change(owner,id,9000);
    const second=await service.create(id,key,input);
    expect(second.video_id).toBe(first.video_id);
    expect((await pool.query('SELECT source_limit_seconds FROM video WHERE id=$1',[first.video_id])).rows[0].source_limit_seconds).toBe(7200);
    const third=await service.create(id,randomUUID(),input);
    expect((await pool.query('SELECT source_limit_seconds FROM video WHERE id=$1',[third.video_id])).rows[0].source_limit_seconds).toBe(9000);
    await pool.query("UPDATE video SET status='queued',actual_bytes=100 WHERE id=$1",[first.video_id]);
    const attempt=(await ensureInitialAttempt(pool,first.video_id))!;
    expect(await acceptProbe(pool,attempt,limits,7200.1,now)).toBe('failed');
    expect((await pool.query('SELECT failure_reason FROM video WHERE id=$1',[first.video_id])).rows[0].failure_reason).toBe('too_long');
  });
  it.each([5400,7200,9000])('probe enforces snapshot boundary %s before credit or quota expense', async cap => {
    const id=await account(),accepted=await queued(id,cap);
    expect(await acceptProbe(pool,accepted.attempt,limits,cap,now)).toBe('transcribing');
    const deniedId=await account();
    // Пустой credits_v1 отличает нарушение лимита от отказа по балансу.
    await pool.query("UPDATE account SET billing_policy='credits_v1' WHERE id=$1",[deniedId]);
    const denied=await queued(deniedId,cap);
    expect(await acceptProbe(pool,denied.attempt,limits,cap+0.1,now)).toBe('failed');
    expect((await pool.query('SELECT failure_reason,billable_seconds FROM video WHERE id=$1',[denied.id])).rows[0])
      .toEqual({failure_reason:'too_long',billable_seconds:null});
    expect((await pool.query('SELECT count(*)::int n FROM video_credit_charge WHERE video_id=$1',[denied.id])).rows[0].n).toBe(0);
    expect((await pool.query("SELECT count(*)::int n FROM quota_counter WHERE scope='user_minutes' AND scope_key=$1",[deniedId])).rows[0].n).toBe(0);
  });
  it('policy validation rejects unsupported limits and rates without writes', async () => {
    const actor=await account(true),id=await account();
    for(const value of [119,86401,7200.5,NaN]) expect(await change(actor,id,value)).toEqual({kind:'invalid'});
    expect(await setBloggerPolicy(pool,{actorAccountId:actor,accountId:id,isBlogger:true,sourceLimitSeconds:null,
      commissionPercent:25 as 20,reason:'Проверка'})).toEqual({kind:'invalid'});
    expect((await pool.query('SELECT count(*)::int n FROM operator_action')).rows[0].n).toBe(0);
  });
});
