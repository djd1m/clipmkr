import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { createOriginalFileHandler } from '../apps/web/src/server/original-file';
let pool: Pool; const schema=`original_${randomBytes(8).toString('hex')}`;
const own=randomUUID(), foreign=randomUUID(), owner=randomUUID(), inactive=randomUUID(), video=randomUUID(), deleted=randomUUID(), inactiveVideo=randomUUID();
beforeAll(async()=>{
 const url=process.env.DATABASE_URL;if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('Original acceptance requires *_test PostgreSQL');
 await ensureTestDatabase(url);pool=createPool(url,schema);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);
 for(const id of [own,foreign,owner,inactive])await pool.query("INSERT INTO account(id,email,password_hash,plan,status,owner_unlimited) VALUES($1,$2,'synthetic','free',$3,$4)",[id,`${id}@example.test`,id===inactive?'erasing':'active',id===owner]);
 for(const [id,account,removed] of [[video,own,false],[deleted,own,true],[inactiveVideo,inactive,false]])await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,deleted_at)
 VALUES($1,$2,$3,'upload',24,24,$4,'rendering',30,$5)`,[id,account,randomUUID(),`videos/${account}/${id}/source.mov`,removed?new Date():null]);
});
afterAll(async()=>{if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();}});
it('real ownership gate denies foreign, owner, inactive, deleted and source claims before storage, without writes',async()=>{
 const head=vi.fn(async()=>24n),bytes=vi.fn(async()=>Buffer.from('000000186674797069736f6d0000000069736f6d6d703432','hex')),sign=vi.fn(async()=> 'https://storage.invalid/private');
 const auth={authenticate:vi.fn().mockResolvedValue({account_id:own})};
 const handler=createOriginalFileHandler({pool,auth,head,bytes,sign,stream:async()=>new Response('synthetic'),trustedProxyHops:1,allowRead:async()=>true});
 const req=(suffix='?metadata=1')=>new Request('https://app.test/original'+suffix,{headers:{cookie:`__Host-n5_session=${'a'.repeat(43)}`,'x-forwarded-for':'192.0.2.1,127.0.0.1'}});
 const snapshot=async()=>({accounts:(await pool.query('SELECT * FROM account ORDER BY id')).rows,videos:(await pool.query('SELECT * FROM video ORDER BY id')).rows,
 jobs:(await pool.query('SELECT * FROM job_attempt')).rows,credits:(await pool.query('SELECT * FROM credit_grant')).rows,growth:(await pool.query('SELECT * FROM growth_event')).rows});
 const before=await snapshot();expect(await(await handler(req(),video)).json()).toMatchObject({state:'ready'});expect(head).toHaveBeenCalledOnce();head.mockClear();bytes.mockClear();
 const denied:string[]=[];
 for(const [account,id] of [[foreign,video],[owner,video],[inactive,inactiveVideo],[own,deleted],[own,randomUUID()]]){
  auth.authenticate.mockResolvedValue({account_id:account});const response=await handler(req('?key=foreign&g=guest&sig=claim&url=https://foreign.test'),id!);expect(response.status).toBe(404);denied.push(await response.text());
 }
 auth.authenticate.mockResolvedValue(null);const anonymous=await handler(req(),video);expect(anonymous.status).toBe(404);denied.push(await anonymous.text());
 expect(new Set(denied).size).toBe(1);expect(head).not.toHaveBeenCalled();expect(bytes).not.toHaveBeenCalled();expect(sign).not.toHaveBeenCalled();expect(await snapshot()).toEqual(before);
});
