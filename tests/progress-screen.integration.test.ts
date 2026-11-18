import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { ScreenService } from '../apps/web/src/server/screen';
import { createClipFileHandler } from '../apps/web/src/server/clip-file';
const dbUrl = process.env.DATABASE_URL;
describe.skipIf(!dbUrl)('PostgreSQL: экраны и доступ к клипам', () => {
  let pool: Pool;
  const schema = `screen_${randomBytes(8).toString('hex')}`;
  const owner = randomUUID(), stranger = randomUUID(), video = randomUUID(), ready = randomUUID(), unfinished = randomUUID();
  beforeAll(async () => {
    if (!dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Нужна отдельная БД *_test');
    await ensureTestDatabase(dbUrl);
    pool = createPool(dbUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
    for (const id of [owner, stranger]) await pool.query("INSERT INTO account(id,email,password_hash,plan,status) VALUES($1,$2,'test-only','free','active')", [id, `${id}@example.test`]);
    await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,clips_total,clips_done)
      VALUES($1,$2,$3,'upload',100,100,'source','rendering',2,1)`, [video, owner, randomUUID()]);
    for (const [id, index, status] of [[ready, 1, 'done'], [unfinished, 2, 'rendering']]) await pool.query(`INSERT INTO clip
      (id,video_id,"index",start_seconds,end_seconds,title,status,watermarked,object_key,thumbnail_key,score,score_hook,score_completeness,score_length,explain_hook,explain_completeness,explain_length)
      VALUES($1,$2,$3,0,25,'Момент',$4,true,'file','thumb',60,20,20,20,'Цепляет','Закончено','Коротко')`, [id, video, index, status]);
  });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  it('выбирает только свои записи, чужая и отсутствующая одинаковы; клипы независимы', async () => {
    const screen = new ScreenService(pool);
    expect((await screen.list(owner, {})).videos).toHaveLength(1);
    expect((await screen.list(stranger, {})).videos).toHaveLength(0);
    for (const account of [stranger, owner]) await expect(screen.get(account, account === stranger ? video : randomUUID())).rejects.toMatchObject({ status: 404 });
    await expect(screen.clips(stranger, video)).rejects.toMatchObject({ status: 404 });
    const clips = (await screen.clips(owner, video)).clips;
    expect(clips.map(c => c.available)).toEqual([true, false]); expect(clips[0]?.explanations?.completeness).toBe('Закончено');
  });
  it('статус раскладки относится к актуальной попытке и опубликованной версии', async () => {
    const screen = new ScreenService(pool);
    const v = randomUUID(), c = randomUUID(), author = randomUUID(), series = 3;
    await pool.query("INSERT INTO account(id,email,password_hash,plan,status) VALUES($1,$2,'test-only','free','active')", [author, `${author}@example.test`]);
    await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status)
      VALUES($1,$2,$3,'upload',100,100,'source','done')`, [v, author, randomUUID()]);
    await pool.query(`INSERT INTO clip(id,video_id,"index",start_seconds,end_seconds,title,watermarked,
      status,object_key,render_version,render_fence) VALUES($1,$2,1,0,20,'Готовый клип',false,'done','clip-v1.mp4',2,1)`, [c,v]);
    await pool.query('INSERT INTO clip_link(clip_id,code) VALUES($1,$2)',[c,randomBytes(5).toString('hex')]);
    await pool.query(`INSERT INTO job_attempt(video_id,clip_id,stage,series_no,attempt_no,fence,status,unit,unit_count,started_at,rerender)
      VALUES($1,$2,'render',$3,1,1,'running','none',0,now(),true)`, [v,c,series]);
    const state = async () => (await screen.clips(author,v)).clips[0];
    expect(await state()).toMatchObject({available:true,rerendering:true,published_render_version:1});
    expect((await state())?.layout_rerender_state).toBeUndefined();
    const layout={version:1,mode:'screen-face',variant:'03',screen:{x:0,y:0,width:1,height:1},focus:null,camera:null};
    await pool.query(`INSERT INTO clip_layout_intent(clip_id,request_key,source_revision,base_render_version,render_version,series_no,layout)
      VALUES($1,$2,$3,1,2,$4,$5::jsonb)`,[c,randomUUID(),'a'.repeat(64),series+1,JSON.stringify(layout)]);
    expect((await state())?.layout_rerender_state).toBeUndefined();
    await pool.query('UPDATE clip_layout_intent SET series_no=$2 WHERE clip_id=$1',[c,series]);
    expect(await state()).toMatchObject({available:true,layout_rerender_state:'pending',published_render_version:1});
    await pool.query("UPDATE job_attempt SET status='deferred',wait_reason='no_disk' WHERE clip_id=$1",[c]);
    expect((await state())?.layout_rerender_state).toBe('pending');
    await pool.query("UPDATE job_attempt SET status='failed',wait_reason=NULL,failure_reason='ffmpeg_failed' WHERE clip_id=$1",[c]);
    expect(await state()).toMatchObject({available:true,layout_rerender_state:'failed',rerender_failure:'ffmpeg_failed'});
    await pool.query("UPDATE job_attempt SET status='succeeded',failure_reason=NULL WHERE clip_id=$1",[c]);
    expect((await state())?.layout_rerender_state).toBeUndefined();
    await pool.query("UPDATE clip SET object_key='clip-v2.mp4' WHERE id=$1",[c]);
    expect(await state()).toMatchObject({available:true,layout_rerender_state:'succeeded',published_render_version:2});
    await pool.query('UPDATE clip SET render_version=3 WHERE id=$1',[c]);
    expect((await state())?.layout_rerender_state).toBeUndefined();
    await expect(screen.clips(stranger,v)).rejects.toMatchObject({status:404});
    await pool.query('UPDATE video SET deleted_at=now() WHERE id=$1',[v]);
  });
  it('лента (фича 29): стадия отказа — из последней попытки по fence на настоящем PostgreSQL', async () => {
    const screen = new ScreenService(pool);
    const failedVideo = async (attempts: [string, string][]) => {
      const id = randomUUID();
      await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,failure_reason)
        VALUES($1,$2,$3,'upload',100,100,'source','failed','stalled')`, [id, stranger, randomUUID()]);
      for (const [index, [stage, status]] of attempts.entries()) await pool.query(`INSERT INTO job_attempt
        (video_id,stage,attempt_no,fence,status,unit,unit_count,started_at) VALUES($1,$2,1,$3,$4,'none',0,now())`, [id, stage, index + 1, status]);
      return (await screen.get(stranger, id)).failed_stage;
    };
    expect(await failedVideo([])).toBe('upload');
    expect(await failedVideo([['stt', 'failed']])).toBe('transcribe');
    expect(await failedVideo([['stt', 'succeeded'], ['select', 'failed']])).toBe('select');
    // Лимит LLM при повторе: расшифровка готова, попытки выбора нет — отказ на «Выборе», не на «Расшифровке».
    expect(await failedVideo([['stt', 'succeeded']])).toBe('select');
    // Порядок — по fence, не по порядку вставки/стадии: последняя попытка stt (fence 3) важнее select (fence 2).
    expect(await failedVideo([['stt', 'failed'], ['select', 'failed'], ['stt', 'running']])).toBe('transcribe');
    const listed = (await screen.list(stranger, {})).videos;
    expect(listed.every(v => v.user_state === 'отказ' && v.failed_stage !== null)).toBe(true);
  });
  it('одинаковый 404 чужому и отсутствующему, недоделанный 404, соседний 302', async () => {
    const sign = vi.fn().mockResolvedValue('https://storage.example/signed');
    const auth = { authenticate: vi.fn().mockResolvedValue({ account_id: owner }) };
    const handler = createClipFileHandler({ allowRead: async () => true, trustedProxyHops: 1, pool, auth, sign });
    const request = new Request('https://app.example/file', { headers: { 'x-forwarded-for': '192.0.2.1, 127.0.0.1', cookie: `__Host-n5_session=${'a'.repeat(43)}` } });
    expect((await handler(request, unfinished)).status).toBe(404); expect(sign).not.toHaveBeenCalled();
    expect((await handler(request, ready)).status).toBe(302);
    auth.authenticate.mockResolvedValue({ account_id: stranger });
    const foreign = await handler(request, ready), missing = await handler(request, randomUUID());
    expect(foreign.status).toBe(404); expect(missing.status).toBe(404); expect(await foreign.text()).toBe(await missing.text());
    expect(sign).toHaveBeenCalledTimes(1);
  });
  it('download event только для своего готового клипа, удалённое видео скрыто', async () => {
    let now = new Date('2026-09-22T20:59:59.999Z');
    const screen = new ScreenService(pool, () => now);
    await screen.markDownloaded(owner, ready);
    now = new Date('2026-09-22T21:00:00.000Z');
    await screen.markDownloaded(owner, ready);
    await expect(screen.markDownloaded(stranger, ready)).rejects.toMatchObject({ status: 404 });
    await expect(screen.markDownloaded(owner, unfinished)).rejects.toMatchObject({ status: 404 });
    expect((await pool.query('SELECT day::text FROM growth_event WHERE clip_id=$1 ORDER BY day', [ready])).rows)
      .toEqual([{ day: '2026-09-22' }, { day: '2026-09-23' }]);
    await pool.query('UPDATE video SET deleted_at=now() WHERE id=$1', [video]);
    await expect(screen.get(owner, video)).rejects.toMatchObject({ status: 404 });
    expect((await screen.list(owner, {})).videos).toHaveLength(0);
  });
});
