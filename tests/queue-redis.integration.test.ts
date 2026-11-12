import { afterAll, beforeAll, describe, expect, it,vi } from 'vitest';
import { Worker, QueueEvents, DelayedError } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { createQueues, getRedisConnection, jobId,parseRenderMessage, type AttemptJob } from '../packages/queue/src';
import { createRenderWorker } from '../apps/worker/src/workers/render';
const redisUrl = process.env.REDIS_URL;
// Test profile Redis only; randomized video IDs, clean only jobs created by this suite.
describe.skipIf(!redisUrl || !process.env.DATABASE_URL?.endsWith('_test'))('BullMQ transport on Redis 7', () => {
  let transport: ReturnType<typeof createQueues>, events: QueueEvents;
  const ids: string[] = [];
  const job = (): AttemptJob => ({video_id:randomUUID(),stage:'stt',fence:1,series_no:1,clip_id:null});
  beforeAll(async () => {
    transport = createQueues({redisUrl:redisUrl!});
    await Promise.all(Object.values(transport.queues).map(q=>q.waitUntilReady()));
    events = new QueueEvents('stt',{connection:getRedisConnection({redisUrl:redisUrl!})}); await events.waitUntilReady();
  });
  afterAll(async () => {
    if (transport) { for (const id of ids) { const j=await transport.queues.stt.getJob(id); if(j) await j.remove(); } await transport.close(); }
    await events?.close();
  });
  it('parallel enqueue deduplicates exact stage:video:fence and preserves default options', async () => {
    const data=job(),id=jobId(data); ids.push(id);
    await Promise.all(Array.from({length:10},()=>transport.enqueue(data)));
    const stored=await transport.queues.stt.getJob(id);
    expect(stored?.id).toBe(id); expect(stored?.opts).toMatchObject({attempts:1,removeOnComplete:1000,removeOnFail:5000});
    expect((await transport.queues.stt.getJobs(['waiting'])).filter(j=>j.id===id)).toHaveLength(1);
    await stored!.remove();
  });
  it('active no_disk deferral reuses job/fence; retained completed job can be restored', async () => {
    const data=job(),id=jobId(data); ids.push(id); let calls=0;
    const worker=new Worker<AttemptJob>('stt',async(j,token)=>{
      if(j.id!==id) throw new Error('Isolate queue test from live workers');
      calls++;
      if(calls===1) { await j.moveToDelayed(Date.now()+200,token); throw new DelayedError(); }
      return 'done';
    },{connection:getRedisConnection({redisUrl:redisUrl!}),concurrency:1});
    try {
      await worker.waitUntilReady(); await transport.enqueue(data);
      const stored=(await transport.queues.stt.getJob(id))!;
      await stored.waitUntilFinished(events,5000); expect(calls).toBe(2);
      await worker.pause(); await transport.enqueue(data);
      expect(await stored.getState()).toBe('waiting');
      await worker.resume(); await stored.waitUntilFinished(events,5000); await worker.pause();
      await transport.enqueue(data,300_000);
      expect(await (await transport.queues.stt.getJob(id))!.getState()).toBe('delayed');
    } finally { await worker.close(); }
  });
  it('render_dispatch_rejects_unknown_mixed_payloads_without_side_effects',async()=>{
    const query=vi.fn(),sign=vi.fn(),download=vi.fn(),render=vi.fn();
    const worker=createRenderWorker(getRedisConnection({redisUrl:redisUrl!}),{pool:{query},download,render,
      seed:{sign}} as unknown as Parameters<typeof createRenderWorker>[1]);
    const events=new QueueEvents('render',{connection:getRedisConnection({redisUrl:redisUrl!})});
    const own:string[]=[];
    try {
      await worker.waitUntilReady();await events.waitUntilReady();
      const clip_id=randomUUID();
      for(const invalid of [null,[],{kind:'unknown'},
        {kind:'layout-seed',clip_id,seed_revision:'a'.repeat(64),url:'https://invalid'},
        {kind:'layout-seed',clip_id,seed_revision:'a'.repeat(64),video_id:randomUUID()},
        {video_id:randomUUID(),stage:'render',clip_id,series_no:1,fence:1,step:'probe'}]){
        const id=randomUUID();own.push(id);
        const job=await transport.queues.render.add('malformed',invalid as never,{jobId:id});
        await expect(job.waitUntilFinished(events,5000)).rejects.toThrow('invalid_render_message');
      }
      expect(query).not.toHaveBeenCalled();expect(sign).not.toHaveBeenCalled();expect(download).not.toHaveBeenCalled();expect(render).not.toHaveBeenCalled();
      expect(parseRenderMessage({kind:'layout-seed',clip_id,seed_revision:'a'.repeat(64)})).toMatchObject({kind:'layout-seed'});
    } finally {await worker.close();await events.close();for(const id of own){const job=await transport.queues.render.getJob(id);if(job)await job.remove();}}
  });
  it('real DB initial and rerender Attempts pass canonical enqueue, Redis and the actual render consumer',async()=>{
    const {createPool,transaction,leaseAttemptTx}=await import('../packages/db/src');
    const {migrate}=await import('../packages/db/src/migrate');
    const {ensureTestDatabase}=await import('../scripts/test-db.mjs');
    const {mkdtemp,writeFile,rm}=await import('node:fs/promises');
    const schema=`queue_render_${randomUUID().replaceAll('-','')}`,pool=createPool(process.env.DATABASE_URL!,schema);
    const directory=await mkdtemp('/tmp/clipmkr-queue-render-'),own:string[]=[];
    const events=new QueueEvents('render',{connection:getRedisConnection({redisUrl:redisUrl!})});
    let worker:ReturnType<typeof createRenderWorker>|undefined;
    try{
      await ensureTestDatabase(process.env.DATABASE_URL!);await pool.query(`CREATE SCHEMA ${schema}`);await migrate(pool);await events.waitUntilReady();
      for(const rerender of [false,true]){
        const account=(await pool.query(`INSERT INTO account(email,password_hash) VALUES($1,'test') RETURNING id`,[`${randomUUID()}@test.invalid`])).rows[0].id;
        const video=(await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,clips_total,clips_done)
          VALUES($1,$2,'upload',100,100,'source',$3,20,1,$4) RETURNING id`,[account,randomUUID(),rerender?'done':'rendering',rerender?1:0])).rows[0].id;
        const clip=(await pool.query(`INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key,render_version,cut_plan)
          VALUES($1,1,0,20,'Фрагмент',$2,true,$3,$4,'[[0,20]]') RETURNING id`,[video,rerender?'done':'queued',rerender?'old.mp4':null,rerender?2:1])).rows[0].id;
        await pool.query('INSERT INTO clip_link(clip_id,code) VALUES($1,$2)',[clip,randomUUID().replaceAll('-','').slice(0,10)]);
        await pool.query(`INSERT INTO transcript(video_id,language,duration_seconds,chunk_count,words,segments) VALUES($1,'ru',20,1,'[{"word":"Привет","start":0,"end":1}]','[]')`,[video]);
        const attempt=(await transaction(pool,tx=>leaseAttemptTx(tx,video,'render',1,clip,new Date(),rerender)))!;
        expect(attempt).toMatchObject({attempt_no:1,status:'running',rerender});
        const id=jobId(attempt);own.push(id);
        // Retained pre-fix full-row jobs are repaired by the canonical producer, never relaxed in the consumer.
        if(rerender)await transport.queues.render.add('render',attempt,{jobId:id});
        await transport.enqueue(attempt);const stored=(await transport.queues.render.getJob(id))!;
        expect(Object.keys(stored.data).sort()).toEqual(['clip_id','fence','series_no','stage','video_id']);
        expect(parseRenderMessage(stored.data)).toMatchObject({stage:'render',clip_id:clip});
        const render=vi.fn(async(options:Parameters<NonNullable<Parameters<typeof createRenderWorker>[1]['render']>>[0])=>{
          await writeFile(options.outputPath,Buffer.alloc(10));return{duration_seconds:20,music:null,packshot:null};
        });
        worker=createRenderWorker(getRedisConnection({redisUrl:redisUrl!}),{pool,directory,origin:'https://clipmkr.ru',
          available:async()=>1_000_000_000n,download:async(_key,file)=>{await writeFile(file,Buffer.alloc(100));},render,
          thumbnail:async(_input,output)=>{await writeFile(output,'thumb');},storage:{put:async()=>10,delete:async()=>{}},enqueue:transport.enqueue});
        await worker.waitUntilReady();await stored.waitUntilFinished(events,10_000);await worker.close();worker=undefined;
        expect(render).toHaveBeenCalledTimes(1);
        expect((await pool.query('SELECT status FROM job_attempt WHERE video_id=$1 AND fence=$2',[video,attempt.fence])).rows[0].status).toBe('succeeded');
        expect((await pool.query('SELECT object_key FROM clip WHERE id=$1',[clip])).rows[0].object_key).toContain(rerender?'-v2.mp4':`${clip}.mp4`);
      }
    }finally{
      await worker?.close();await events.close();
      if((await pool.query('SELECT to_regclass($1) AS relation',[`${schema}.job_attempt`])).rows[0].relation)
        for(const row of (await pool.query('SELECT video_id,fence FROM job_attempt')).rows)own.push(jobId({stage:'render',...row}));
      for(const id of new Set(own)){const job=await transport.queues.render.getJob(id);if(job)await job.remove();}
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await pool.end();await rm(directory,{recursive:true,force:true});
    }
  },30_000);
});
