import { beforeAll, beforeEach, afterAll, describe, it, expect, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPool, readCreditBalance, transaction, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { leaseAttempt, leaseAttemptTx, type Attempt } from '../packages/db/src/attempts';
import { authorizeSelection, acceptSelection, failSelection } from '../packages/db/src/selection';
import { loadLimits, loadLlmConfig } from '../packages/shared/src/config';
import { moscowDay } from '../packages/shared/src/upload';
import { validateFragments } from '../packages/shared/src/fragments';
import { createSelector, SelectionProviderError } from '../apps/worker/src/llm/provider';
import { selectFragments } from '../apps/worker/src/workers/select';
import { createFakeSelector, fakeFragment } from '../apps/worker/src/llm/fake';
import { VideoRetryService } from '../apps/web/src/server/video-retry';
import { watchdogTick } from '../apps/web/src/server/watchdog';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { environment } from './fixtures/environment';
const url = process.env.DATABASE_URL, limits = loadLimits(environment());
const model = 'anthropic/claude-sonnet-5';
const cloudru = loadLlmConfig({ ...environment(), N5_MODEL_PROVIDER: 'live', N5_LLM_PROVIDER: 'cloudru',
  N5_LLM_MODEL: 'deepseek-ai/DeepSeek-V4-Pro', CLOUDRU_FM_API_KEY: 'synthetic-fm-key' });
const transcript = { language: 'ru', words: Array.from({ length: 360 }, (_, i) => ({ word: 'слово', start: i, end: i + 1 })), segments: [] };
describe.skipIf(!url)('Selection PostgreSQL concurrency and persistence', () => {
  let pool: Pool;
  const schema = `selection_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Нужна БД *_test');
    await ensureTestDatabase(url);
    pool = createPool(url, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  beforeEach(async () => { await pool.query('TRUNCATE account,quota_counter CASCADE'); });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  async function createAccount(policy = 'legacy_daily_v1') {
    return (await pool.query<{ id: string }>("INSERT INTO account(email,password_hash,billing_policy) VALUES ($1,'test',$2) RETURNING id",
      [`${randomUUID()}@test.invalid`, policy])).rows[0]!.id;
  }
  async function fixture(options: { startedAt?: Date; account?: string } = {}) {
    const account = options.account ?? await createAccount();
    const startedAt = options.startedAt ?? new Date();
    const video = (await pool.query(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,actual_bytes,object_key,status,duration_seconds,upload_day)
      VALUES ($1,$2,'upload',100,100,'source','selecting',360,$3) RETURNING id`, [account, randomUUID(), moscowDay(new Date())])).rows[0].id as string;
    await pool.query('INSERT INTO transcript(video_id,language,duration_seconds,chunk_count,words,segments) VALUES ($1,$2,360,1,$3,$4)',
      [video, 'ru', JSON.stringify(transcript.words), '[]']);
    const attempt = (await transaction(pool, tx => leaseAttemptTx(tx, video, 'select', 1, null, startedAt)))!;
    return { account, video, attempt };
  }
  const used = async (account: string, scope = 'user_llm', day = moscowDay(new Date())) => (await pool.query(
    'SELECT used FROM quota_counter WHERE scope_key=$1 AND scope=$2 AND day=$3', [account, scope, day])).rows[0]?.used ?? 0;
  async function retryFixture(f: Awaited<ReturnType<typeof fixture>>, now: Date) {
    await expect(failSelection(pool, f.attempt, 'stalled', now)).resolves.toBe(true);
    const enqueue = vi.fn<(attempt: Attempt) => Promise<void>>();
    await new VideoRetryService(pool, limits, enqueue, () => now).retry(f.account, f.video);
    expect(enqueue).toHaveBeenCalledOnce();
    return enqueue.mock.calls[0]![0];
  }
  async function creditFixture(now: Date) {
    const account = await createAccount('credits_v1');
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,available_at)
      VALUES ($1,'signup',$2,720,720,$3)`, [account, `trial:${account}`, now]);
    return fixture({ account, startedAt: now });
  }
  async function waitForBlocked(blocker: number, queryFragment: string) {
    for (let poll = 0; poll < 100; poll++) {
      const waiting = await pool.query<{ pid: number }>(`SELECT pid FROM pg_stat_activity
        WHERE application_name=$1 AND $2=ANY(pg_blocking_pids(pid)) AND query LIKE $3`,
      [schema, blocker, `%${queryFragment}%`]);
      if (waiting.rows[0]) return waiting.rows[0].pid;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`PostgreSQL did not observe ${queryFragment} blocked by PID ${blocker}`);
  }
  it('two parallel repeat commands: exactly one new series and one charge, no double charge in worker', async () => {
    const f = await fixture(); await authorizeSelection(pool, f.attempt, limits, model);
    await pool.query("UPDATE video SET status='failed',failure_reason='no_fragments' WHERE id=$1", [f.video]);
    const retry = new VideoRetryService(pool, limits, vi.fn());
    const results = await Promise.allSettled([retry.retry(f.account, f.video), retry.retry(f.account, f.video)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(await used(f.account)).toBe(2); expect(await used('all', 'global_llm')).toBe(2);
    const attempts = await pool.query('SELECT * FROM job_attempt WHERE video_id=$1 AND series_no=2', [f.video]);
    expect(attempts.rowCount).toBe(1);
    expect(await authorizeSelection(pool, attempts.rows[0], limits, model)).not.toBeNull();
    expect(await used(f.account)).toBe(2); expect(await used('all', 'global_llm')).toBe(2);
  });
  it('duplicate workers dispatch once, then accept once with stale-result fencing', async () => {
    const f = await fixture();
    const calls = await Promise.all([1, 2].map(() => authorizeSelection(pool, f.attempt, limits, model)));
    expect(calls.filter(Boolean)).toHaveLength(1); expect(await used(f.account)).toBe(1);
    const fragments = validateFragments({ fragments: [fakeFragment()] }, transcript, 360);
    const results = await Promise.all([1, 2].map(() => acceptSelection(pool, f.attempt, fragments)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await pool.query('SELECT * FROM clip')).rowCount).toBe(1);
    expect((await pool.query('SELECT * FROM clip_link')).rowCount).toBe(1);
  });
  it.each(['cloudru', 'openrouter', 'fake'] as const)('records actual provider before one exclusively claimed dispatch', async provider => {
    const f = await fixture(), dir = await mkdtemp(join(tmpdir(), 'n5-cloudru-dispatch-'));
    const spendPath = join(dir, 'model-spend.jsonl');
    const actualModel = provider === 'cloudru' ? 'deepseek-ai/DeepSeek-V4-Pro' : model;
    const selector = { select: vi.fn(async () => {
      expect(await used(f.account)).toBe(1);
      expect((await pool.query('SELECT provider,model,unit_count,llm_dispatched FROM job_attempt WHERE video_id=$1 AND fence=$2',
        [f.video, f.attempt.fence])).rows[0]).toEqual({ provider, model: actualModel, unit_count: 1, llm_dispatched: true });
      expect(JSON.parse((await readFile(spendPath, 'utf8')).trim())).toMatchObject({ provider, model: actualModel, phase: 'attempt' });
      return { fragments: [fakeFragment()] };
    }) };
    try {
      await Promise.all([1, 2].map(() => selectFragments(f.attempt, { pool, limits, selector, provider, model: actualModel,
        spendPath, enqueue: async () => {} })));
      expect(selector.select).toHaveBeenCalledOnce(); expect(await used(f.account)).toBe(1);
      const ledger = (await readFile(spendPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      expect(ledger).toEqual([expect.objectContaining({ provider, model: actualModel, phase: 'attempt' }),
        expect.objectContaining({ provider, model: actualModel, phase: 'outcome', result: 'success' })]);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it.each(['user_llm', 'global_llm'])('Cloud.ru refusal %s dispatches zero requests and no ledger event', async scope => {
    const f = await fixture();
    await pool.query('INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ($1,$2,$3,$4)',
      [scope, scope === 'user_llm' ? f.account : 'all', moscowDay(new Date()), scope === 'user_llm' ? 2 : 20]);
    const selector = { select: vi.fn() }, spend = vi.fn();
    await selectFragments(f.attempt, { pool, limits, selector, provider: 'cloudru', model: 'deepseek-ai/DeepSeek-V4-Pro',
      spendPath: '/unused', spend, enqueue: vi.fn() });
    expect(selector.select).not.toHaveBeenCalled(); expect(spend).not.toHaveBeenCalled();
  });
  it('Cloud.ru timeout remains charged with actual attribution', async () => {
    const f = await fixture(), spend = vi.fn();
    const selector = { select: vi.fn(async () => { throw new SelectionProviderError('timeout'); }) };
    await expect(selectFragments(f.attempt, { pool, limits, selector, provider: 'cloudru', model: 'deepseek-ai/DeepSeek-V4-Pro',
      spendPath: '/unused', spend, enqueue: vi.fn() })).rejects.toMatchObject({ outcome: 'timeout' });
    expect(await used(f.account)).toBe(1); expect(selector.select).toHaveBeenCalledOnce();
    expect((await pool.query('SELECT provider,model,status,unit_count FROM job_attempt WHERE video_id=$1 AND fence=$2',
      [f.video, f.attempt.fence])).rows[0]).toEqual({ provider: 'cloudru', model: 'deepseek-ai/DeepSeek-V4-Pro', status: 'failed', unit_count: 1 });
    expect(spend.mock.calls.map(call => call[1])).toEqual([
      expect.objectContaining({ provider: 'cloudru', phase: 'attempt' }),
      expect.objectContaining({ provider: 'cloudru', phase: 'outcome', result: 'timeout' }),
    ]);
  });
  it('Cloud.ru HTTP 403 returns the first dispatch debit and allows one retry of the saved transcript', async () => {
    const beforeMidnight = new Date('2026-11-17T20:59:00Z');
    const afterMidnight = new Date('2026-11-17T21:01:00Z');
    const f = await fixture({ startedAt: beforeMidnight }), dir = await mkdtemp(join(tmpdir(), 'n5-cloudru-refund-'));
    const spendPath = join(dir, 'model-spend.jsonl');
    const request = vi.fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        expect(await used(f.account)).toBe(2);
        expect(await used('all', 'global_llm')).toBe(1);
        return new Response('synthetic-refusal-body', { status: 403 });
      })
      .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: JSON.stringify({ fragments: [fakeFragment()] }) } }] }));
    const deps = { pool, limits, selector: createSelector(cloudru, request), provider: cloudru.provider,
      model: cloudru.model, spendPath, enqueue: vi.fn() };
    const input = () => pool.query(`SELECT v.object_key,v.actual_bytes,t.id,t.words,t.segments FROM video v
      JOIN transcript t ON t.video_id=v.id WHERE v.id=$1`, [f.video]);
    const savedInput = (await input()).rows;
    await pool.query(`INSERT INTO quota_counter(scope,scope_key,day,used) VALUES
      ('user_llm',$1,$2,1), ('user_llm',$1,$3,1)`, [f.account, moscowDay(beforeMidnight), moscowDay(afterMidnight)]);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(afterMidnight);
    try {
      await expect(selectFragments(f.attempt, deps)).rejects.toMatchObject({ kind: 'http', status: 403 });
      expect(await used(f.account)).toBe(1);
      expect(await used(f.account, 'user_llm', moscowDay(beforeMidnight))).toBe(1);
      expect(await used('all', 'global_llm')).toBe(1);
      expect(request).toHaveBeenCalledOnce();
      expect(deps.enqueue).not.toHaveBeenCalled();
      expect((await pool.query('SELECT status,failure_reason FROM video WHERE id=$1', [f.video])).rows)
        .toEqual([{ status: 'failed', failure_reason: 'stalled' }]);
      expect((await pool.query('SELECT status,llm_dispatched,unit_count FROM job_attempt WHERE video_id=$1', [f.video])).rows)
        .toEqual([{ status: 'failed', llm_dispatched: true, unit_count: 1 }]);
      expect((await input()).rows).toEqual(savedInput);

      const enqueueRetry = vi.fn<(attempt: Attempt) => Promise<void>>();
      const retry = new VideoRetryService(pool, limits, enqueueRetry);
      await expect(retry.retry(f.account, f.video)).resolves.toEqual({ video_id: f.video, status: 'selecting' });
      expect(enqueueRetry).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ video_id: f.video, stage: 'select', series_no: 2 }));
      await selectFragments(enqueueRetry.mock.calls[0]![0], deps);
      expect(request).toHaveBeenCalledTimes(2);
      expect(request.mock.calls[1]![1]?.body).toBe(request.mock.calls[0]![1]?.body);
      expect(deps.enqueue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ stage: 'render' }));
      expect((await input()).rows).toEqual(savedInput);
      expect(await used(f.account)).toBe(2);
      expect(await used('all', 'global_llm')).toBe(2);
      const ledger = (await readFile(spendPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
      expect(ledger).toEqual([
        expect.objectContaining({ fence: f.attempt.fence, phase: 'attempt', result: 'started' }),
        expect.objectContaining({ fence: f.attempt.fence, phase: 'outcome', result: 'provider_error' }),
        expect.objectContaining({ series_no: 2, phase: 'attempt', result: 'started' }),
        expect.objectContaining({ series_no: 2, phase: 'outcome', result: 'success' }),
      ]);
    } finally {
      vi.useRealTimers();
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('Cloud.ru HTTP 401 returns the prepaid retry debit from before Moscow midnight', async () => {
    const beforeMidnight = new Date('2026-11-17T20:59:00Z');
    const afterMidnight = new Date('2026-11-17T21:01:00Z');
    const debitDay = moscowDay(beforeMidnight), nextDay = moscowDay(afterMidnight);
    const f = await creditFixture(beforeMidnight);
    const attempt = await retryFixture(f, beforeMidnight);
    expect(await readCreditBalance(pool, f.account, beforeMidnight)).toMatchObject({ available_seconds: 360, reserved_seconds: 360 });
    await pool.query(`INSERT INTO quota_counter(scope,scope_key,day,used) VALUES
      ('user_llm',$1,$2,1), ('global_llm','all',$2,1)`, [f.account, nextDay]);
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(null, { status: 401 }));
    const spend = vi.fn(), enqueue = vi.fn();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(afterMidnight);
    try {
      await expect(selectFragments(attempt, { pool, limits, selector: createSelector(cloudru, request), provider: cloudru.provider,
        model: cloudru.model, spendPath: '/unused', spend, enqueue })).rejects.toMatchObject({ kind: 'http', status: 401 });
    } finally { vi.useRealTimers(); }
    expect(request).toHaveBeenCalledOnce();
    expect(enqueue).not.toHaveBeenCalled();
    expect(await used(f.account, 'user_llm', debitDay)).toBe(0);
    expect(await used(f.account, 'user_llm', nextDay)).toBe(1);
    expect(await used('all', 'global_llm', debitDay)).toBe(1);
    expect(await used('all', 'global_llm', nextDay)).toBe(1);
    expect(await readCreditBalance(pool, f.account, afterMidnight)).toMatchObject({ available_seconds: 720, reserved_seconds: 0 });
    expect((await pool.query('SELECT status,finished_at FROM job_attempt WHERE video_id=$1 AND fence=$2',
      [f.video, attempt.fence])).rows).toEqual([{ status: 'failed', finished_at: afterMidnight }]);
  });
  it('one refund for concurrent completion of the same fence', async () => {
    const now = new Date(), day = moscowDay(now);
    const f = await creditFixture(now);
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('user_llm',$1,$2,1)", [f.account, day]);
    const attempt = await retryFixture(f, now);
    expect(await authorizeSelection(pool, attempt, limits, cloudru.model, now, 'cloudru')).toMatchObject({ quotaDay: day });
    expect(await used(f.account, 'user_llm', day)).toBe(2);
    const holder = await pool.connect();
    const closing: Promise<boolean>[] = [];
    try {
      await holder.query('BEGIN');
      await holder.query("SELECT used FROM quota_counter WHERE scope='user_llm' AND scope_key=$1 AND day=$2 FOR UPDATE", [f.account, day]);
      const holderPid = (await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      const first = failSelection(pool, attempt, 'stalled', now, day);
      closing.push(first);
      void first.catch(() => {}); // Observed after the blocking transaction releases.
      const firstPid = await waitForBlocked(holderPid, 'UPDATE quota_counter SET used=used-1');
      const second = failSelection(pool, attempt, 'stalled', new Date(now.getTime() + 100), day);
      closing.push(second);
      void second.catch(() => {});
      expect(await waitForBlocked(firstPid, 'FOR UPDATE OF v')).not.toBe(firstPid);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
      await Promise.allSettled(closing);
    }
    expect(await Promise.all(closing)).toEqual([true, false]);
    expect(await used(f.account, 'user_llm', day)).toBe(1);
    expect(await used('all', 'global_llm', day)).toBe(1);
    expect((await pool.query('SELECT status,finished_at FROM video WHERE id=$1', [f.video])).rows)
      .toEqual([{ status: 'failed', finished_at: now }]);
    expect((await pool.query('SELECT status,finished_at FROM job_attempt WHERE video_id=$1 AND fence=$2', [f.video, attempt.fence])).rows)
      .toEqual([{ status: 'failed', finished_at: now }]);
    expect((await pool.query('SELECT state,finished_at FROM video_credit_charge WHERE video_id=$1', [f.video])).rows)
      .toEqual([{ state: 'released', finished_at: now }]);
    expect(await readCreditBalance(pool, f.account, now)).toMatchObject({ available_seconds: 720, reserved_seconds: 0 });
  });
  it('credit lock precedes selecting quota refund', async () => {
    const now = new Date(), day = moscowDay(now);
    const f = await creditFixture(now), other = await fixture({ account: f.account, startedAt: now });
    const attempt = await retryFixture(f, now);
    expect(await authorizeSelection(pool, attempt, limits, cloudru.model, now, 'cloudru')).toMatchObject({ quotaDay: day });
    await failSelection(pool, other.attempt, 'stalled', now);
    const enqueue = vi.fn(), retry = new VideoRetryService(pool, limits, enqueue, () => now);
    const holder = await pool.connect();
    let finish: Promise<boolean> | undefined;
    let restart: ReturnType<VideoRetryService['retry']> | undefined;
    try {
      await holder.query('BEGIN');
      await holder.query("SELECT used FROM quota_counter WHERE scope='user_llm' AND scope_key=$1 AND day=$2 FOR UPDATE", [f.account, day]);
      const holderPid = (await holder.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
      finish = failSelection(pool, attempt, 'stalled', now, day);
      void finish.catch(() => {});
      const refundPid = await waitForBlocked(holderPid, 'UPDATE quota_counter SET used=used-1');
      restart = retry.retry(f.account, other.video);
      void restart.catch(() => {});
      expect(await waitForBlocked(refundPid, 'pg_advisory_xact_lock')).not.toBe(refundPid);
    } finally {
      await holder.query('ROLLBACK');
      holder.release();
      await Promise.allSettled([finish, restart]);
    }
    await expect(finish).resolves.toBe(true);
    await expect(restart).resolves.toEqual({ video_id: other.video, status: 'selecting' });
    expect(enqueue).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ video_id: other.video, stage: 'select' }));
    expect(await used(f.account, 'user_llm', day)).toBe(1);
    expect(await used('all', 'global_llm', day)).toBe(2);
    expect((await pool.query('SELECT video_id,state FROM video_credit_charge')).rows)
      .toEqual(expect.arrayContaining([{ video_id: f.video, state: 'released' }, { video_id: other.video, state: 'reserved' }]));
    expect(await readCreditBalance(pool, f.account, now)).toMatchObject({ available_seconds: 360, reserved_seconds: 360 });
  });
  it('rejects an undispatched or stale refund even if the account has a personal debit', async () => {
    const now = new Date(), day = moscowDay(now);
    const f = await fixture({ startedAt: now });
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('user_llm',$1,$2,1)", [f.account, day]);
    await expect(failSelection(pool, f.attempt, 'stalled', now, day)).resolves.toBe(false);
    expect(await authorizeSelection(pool, f.attempt, limits, cloudru.model, now, 'cloudru')).not.toBeNull();
    const fresh = await leaseAttempt(pool, f.video, 'select', 2);
    await expect(failSelection(pool, f.attempt, 'stalled', now, day)).resolves.toBe(false);
    expect(await used(f.account, 'user_llm', day)).toBe(2);
    expect((await pool.query('SELECT status,fence FROM video WHERE id=$1', [f.video])).rows)
      .toEqual([{ status: 'selecting', fence: fresh?.fence }]);
  });
  it.each(['absent', 'zero'] as const)('rolls back terminal status and credits with %s personal quota', async state => {
    const now = new Date(), day = moscowDay(now);
    const f = await creditFixture(now);
    const attempt = await retryFixture(f, now);
    expect(await authorizeSelection(pool, attempt, limits, cloudru.model, now, 'cloudru')).not.toBeNull();
    const removeDebit = state === 'absent' ? 'DELETE FROM quota_counter' : 'UPDATE quota_counter SET used=0';
    await pool.query(`${removeDebit} WHERE scope='user_llm' AND scope_key=$1 AND day=$2`, [f.account, day]);
    await expect(failSelection(pool, attempt, 'stalled', now, day)).rejects.toThrow('Списание личной квоты не найдено');
    expect((await pool.query('SELECT status,finished_at FROM video WHERE id=$1', [f.video])).rows)
      .toEqual([{ status: 'selecting', finished_at: null }]);
    expect((await pool.query('SELECT status,finished_at FROM job_attempt WHERE video_id=$1 AND fence=$2', [f.video, attempt.fence])).rows)
      .toEqual([{ status: 'running', finished_at: null }]);
    expect((await pool.query('SELECT state,finished_at FROM video_credit_charge WHERE video_id=$1', [f.video])).rows)
      .toEqual([{ state: 'reserved', finished_at: null }]);
    expect(await readCreditBalance(pool, f.account, now)).toMatchObject({ available_seconds: 360, reserved_seconds: 360 });
    expect(await used('all', 'global_llm', day)).toBe(1);
  });
  it('one strong fragment is persisted as the honest count', async () => {
    const f = await fixture();
    await authorizeSelection(pool, f.attempt, limits, model);
    const fragments = validateFragments({ fragments: [fakeFragment()] }, transcript, 360);
    const jobs = await acceptSelection(pool, f.attempt, fragments);
    expect(jobs).toHaveLength(1);
    expect((await pool.query('SELECT clips_total,status FROM video WHERE id=$1', [f.video])).rows[0])
      .toEqual({ clips_total: 1, status: 'rendering' });
    expect((await pool.query('SELECT * FROM clip WHERE video_id=$1', [f.video])).rowCount).toBe(1);
  });
  // LV-4 (23.09.2026): негодный кандидат отбрасывается ОДИН, годные сохраняются.
  // Прежде один промах из восьми отбрасывал все, и владелец видел «самодостаточных фрагментов
  // не найдено» на записи, где модель нашла семь годных.
  // Отсеивает обработчик (validateFragments), база — вторая линия обороны: она перепроверяет и
  // НЕ ПУСКАЕТ набор, который расходится с проверенным. Поэтому сюда приходит уже отсеянное.
  it('DB boundary refuses fragments that were not pre-validated and saves nothing', async () => {
    const f = await fixture();
    await authorizeSelection(pool, f.attempt, limits, model);
    const raw = [fakeFragment(0), fakeFragment(1), { ...fakeFragment(2), score_hook: 34, score: 84 }];
    await expect(acceptSelection(pool, f.attempt, raw)).rejects.toThrow('Непроверенные фрагменты на границе БД');
    expect((await pool.query('SELECT count(*)::int AS n FROM clip WHERE video_id=$1', [f.video])).rows[0].n).toBe(0);
  });
  it('pre-validated survivors are saved after one candidate is dropped', async () => {
    const f = await fixture();
    await authorizeSelection(pool, f.attempt, limits, model);
    const fragments = [fakeFragment(0), fakeFragment(1)];
    const jobs = await acceptSelection(pool, f.attempt, fragments);
    expect(jobs).toHaveLength(2);
    expect((await pool.query('SELECT count(*)::int AS n FROM clip WHERE video_id=$1', [f.video])).rows[0].n).toBe(2);
    expect((await pool.query('SELECT count(*)::int AS n FROM clip_link')).rows[0].n).toBe(2);
  });
  it('all candidates out of range still fail as no_fragments and save nothing', async () => {
    const f = await fixture();
    await authorizeSelection(pool, f.attempt, limits, model);
    const bad = [0, 1, 2].map(i => ({ ...fakeFragment(i), score_hook: 34, score: 84 }));
    expect(await acceptSelection(pool, f.attempt, bad)).toEqual([]);
    expect((await pool.query('SELECT status,failure_reason FROM video WHERE id=$1', [f.video])).rows[0])
      .toEqual({ status: 'failed', failure_reason: 'no_fragments' });
    expect((await pool.query('SELECT * FROM clip WHERE video_id=$1', [f.video])).rowCount).toBe(0);
  });
  it('old fence cannot spend or save after a new lease', async () => {
    const f = await fixture(); await leaseAttempt(pool, f.video, 'select', 2);
    expect(await authorizeSelection(pool, f.attempt, limits, model)).toBeNull();
    expect(await acceptSelection(pool, f.attempt, [fakeFragment()])).toBeNull(); expect(await used(f.account)).toBe(0);
  });
  it.each(['user_llm', 'global_llm'])('refused %s rolls back both quota keys', async scope => {
    const f = await fixture();
    await pool.query('INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ($1,$2,$3,$4)',
      [scope, scope === 'user_llm' ? f.account : 'all', moscowDay(new Date()), scope === 'user_llm' ? 2 : 20]);
    expect(await authorizeSelection(pool, f.attempt, limits, model)).toBeNull();
    expect((await pool.query('SELECT failure_reason FROM video WHERE id=$1', [f.video])).rows[0].failure_reason).toBe(`refused_${scope}`);
    expect(await used(scope === 'user_llm' ? 'all' : f.account, scope === 'user_llm' ? 'global_llm' : 'user_llm')).toBe(0);
  });
  it('global last call: two accounts race, exactly one succeeds', async () => {
    const a = await fixture(), b = await fixture();
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('global_llm','all',$1,19)", [moscowDay(new Date())]);
    const results = await Promise.all([a, b].map(f => authorizeSelection(pool, f.attempt, limits, model)));
    expect(results.filter(Boolean)).toHaveLength(1); expect(await used('all', 'global_llm')).toBe(20);
    expect(await used(a.account) + await used(b.account)).toBe(1);
  });
  it('fake end-to-stage: quota and spend before request; clips, links and rendering committed before enqueue', async () => {
    const f = await fixture(), dir = await mkdtemp(join(tmpdir(), 'n5-select-'));
    const spendPath = join(dir, 'model-spend.jsonl'), fake = createFakeSelector('few');
    try {
      const selector = { select: vi.fn(async (...args: Parameters<typeof fake.select>) => {
        expect(await used(f.account)).toBe(1);
        expect(JSON.parse((await readFile(spendPath, 'utf8')).trim()).phase).toBe('attempt');
        return fake.select(...args);
      }) };
      await selectFragments(f.attempt, { pool, limits, selector, model, provider: 'fake', spendPath, enqueue: async next => {
        expect(next.stage).toBe('render');
        expect((await pool.query('SELECT clips_total,status FROM video WHERE id=$1', [f.video])).rows[0]).toEqual({ clips_total: 2, status: 'rendering' });
        expect((await pool.query('SELECT * FROM clip_link')).rowCount).toBe(2);
      } });
      expect(selector.select).toHaveBeenCalledTimes(1);
      const enqueue = vi.fn(); await watchdogTick(pool, enqueue); expect(enqueue).toHaveBeenCalledTimes(2);
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
  it('RV-5 ledger outage immediately marks video and attempt failed without calling the provider', async () => {
    const f = await fixture(), original = new Error('attempt disk full');
    const selector = { select: vi.fn(createFakeSelector('valid').select) }, enqueue = vi.fn();
    const spend = vi.fn().mockRejectedValue(new Error('outcome disk full')).mockRejectedValueOnce(original);
    await expect(selectFragments(f.attempt, { pool, limits, selector, model, provider: 'fake', spendPath: '/unused', spend, enqueue }))
      .rejects.toBe(original);
    expect(selector.select).not.toHaveBeenCalled(); expect(enqueue).not.toHaveBeenCalled();
    expect(spend.mock.calls.map(call => call[1].phase)).toEqual(['attempt', 'outcome']);
    expect((await pool.query('SELECT status,failure_reason FROM video WHERE id=$1', [f.video])).rows[0])
      .toEqual({ status: 'failed', failure_reason: 'stalled' });
    expect((await pool.query('SELECT status,finished_at FROM job_attempt WHERE video_id=$1 AND fence=$2',
      [f.video, f.attempt.fence])).rows[0]).toEqual({ status: 'failed', finished_at: expect.any(Date) });
  });
  it('word precision survives PostgreSQL and SQL CHECK rejects invalid scores and length', async () => {
    const f = await fixture();
    const words = [{ word: 'начало', start: 0.1234, end: 1 }, { word: 'конец', start: 25, end: 25.4321 }];
    await pool.query('UPDATE transcript SET words=$2 WHERE video_id=$1', [f.video, JSON.stringify(words)]);
    await authorizeSelection(pool, f.attempt, limits, model);
    const fragments = validateFragments({ fragments: [fakeFragment()] }, { ...transcript, words }, 360);
    await acceptSelection(pool, f.attempt, fragments);
    expect((await pool.query('SELECT start_seconds,end_seconds FROM clip')).rows[0]).toEqual({ start_seconds: '0.1234', end_seconds: '25.4321' });
    for (const sql of ['score=99', 'score_hook=34', "explain_hook=' '", 'end_seconds=100', 'score_hook=NULL']) {
      await expect(pool.query(`UPDATE clip SET ${sql}`)).rejects.toMatchObject({ code: '23514' });
    }
  });
});
