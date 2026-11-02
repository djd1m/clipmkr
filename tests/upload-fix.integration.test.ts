import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { createPool, ensureInitialAttempt, acceptProbe, failTranscription, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { transaction, checkAndConsumeQuota, refundUploadSlot } from '../packages/db/src/quota';
import { loadLimits } from '../packages/shared/src/config';
import { moscowDay } from '../packages/shared/src/upload';
import { VideoService, type UploadStorage } from '../apps/web/src/server/video';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { environment } from './fixtures/environment';
const dbUrl = process.env.DATABASE_URL;
const limits = loadLimits(environment()), now = new Date('2026-09-22T20:59:00Z');
const input = { declared_bytes: 24, filename: 'a.mp4', source: 'upload' };
const valid = Buffer.alloc(24); valid.writeUInt32BE(24); valid.write('ftyp', 4); valid.write('isom', 8);
function storage(): UploadStorage {
  return { initiate: vi.fn(async () => randomUUID()), list: vi.fn(async () => []),
    sign: vi.fn(async (_key, _id, numbers, time) => (typeof numbers === 'number' ? Array.from({ length: numbers }, (_, i) => i + 1) : numbers)
      .map((part_number: number) => ({ part_number, url: `https://test.invalid/${part_number}`, expires_at: new Date(time.getTime() + 900000).toISOString() }))),
    complete: vi.fn(async () => {}), head: vi.fn(async () => 24n), bytes: vi.fn(async () => valid),
    abort: vi.fn(async () => {}), delete: vi.fn(async () => {}) };
}
function barrier(count: number) {
  let entered = 0, ready!: () => void, release!: () => void;
  const all = new Promise<void>((resolve) => { ready = resolve; });
  const wait = new Promise<void>((resolve) => { release = resolve; });
  return { all, release, hold: async () => { if (++entered === count) ready(); await wait; } };
}
describe.skipIf(!dbUrl)('RU fixes: real PostgreSQL', () => {
  let pool: Pool, inspector: Pool;
  const schema = `fix_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Only *_test database');
    await ensureTestDatabase(dbUrl);
    pool = createPool(dbUrl, schema);
    inspector = createPool(dbUrl);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  afterAll(async () => {
    if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); }
    if (inspector) await inspector.end();
  });
  const account = async () => (await pool.query("INSERT INTO account(email,password_hash) VALUES ($1,'hash') RETURNING id", [`${randomUUID()}@test.invalid`])).rows[0].id as string;
  const used = async (id: string, scope = 'user_uploads', day = moscowDay(now)) =>
    (await pool.query('SELECT used FROM quota_counter WHERE scope=$1 AND scope_key=$2 AND day=$3', [scope, id, day])).rows[0]?.used ?? 0;
  const service = (s = storage()) => new VideoService(pool, limits, s, async () => {}, () => now);
  const completion = (video_id: string) => ({ video_id, parts: [{ part_number: 1, etag: 'a' }] });

  it.each(['initiate', 'sign', 'complete', 'head', 'bytes'] as const)('RU-002: 1 and 10 pending %s leave pool max:10 free', async (operation) => {
    for (const n of [1, 10]) {
      const s = storage(), run = service(s), ids = await Promise.all(Array.from({ length: n }, account));
      const uploads = ['complete', 'head', 'bytes'].includes(operation) ? await Promise.all(ids.map((id) => run.create(id, randomUUID(), input))) : [];
      const gate = barrier(n), original = s[operation];
      const held = vi.spyOn(s, operation).mockImplementation((async (...args: never[]) => {
        await gate.hold(); return (original as (...args: never[]) => Promise<unknown>)(...args);
      }) as never);
      const calls = ids.map((id, i) => uploads.length ? run.complete(id, completion(uploads[i]!.video_id)) : run.create(id, randomUUID(), input));
      const done = Promise.allSettled(calls);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([gate.all, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Storage calls did not start')), 2500); })]);
        const states = await inspector.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE application_name=$1 AND state='idle in transaction'", [schema]);
        expect(states.rows[0].n).toBe(0);
        const start = performance.now(); expect((await pool.query('SELECT 1 AS ok')).rows[0].ok).toBe(1);
        const elapsed = performance.now() - start;
        console.log(JSON.stringify({ operation, pending: n, idle_in_transaction: states.rows[0].n, unrelated_select_ms: elapsed }));
        expect(elapsed).toBeLessThan(500);
      } finally { clearTimeout(timer); gate.release(); await done; held.mockRestore(); }
      expect((await done).every((result) => result.status === 'fulfilled')).toBe(true);
    }
  });
  it('RU-001: storage failure preserves file and same-key retry reaches queued', async () => {
    const s = storage(), run = service(s), id = await account(), key = randomUUID();
    const upload = await run.create(id, key, input);
    vi.mocked(s.complete).mockRejectedValueOnce(new Error('timeout'));
    vi.mocked(s.head).mockRejectedValueOnce(new Error('not yet assembled'));
    await expect(run.complete(id, completion(upload.video_id))).rejects.toMatchObject({ status: 503 });
    expect((await pool.query('SELECT status,failure_reason FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual({ status: 'uploading', failure_reason: null });
    expect(s.abort).not.toHaveBeenCalled(); expect(s.delete).not.toHaveBeenCalled();
    expect((await run.create(id, key, input)).video_id).toBe(upload.video_id);
    expect(await run.complete(id, completion(upload.video_id))).toMatchObject({ status: 'queued' });
    expect(await used(id)).toBe(1);
  });
  it('RU-002: concurrent finalizers refund one time, and cleanup errors retain 422', async () => {
    const s = storage(), run = service(s), id = await account();
    const upload = await run.create(id, randomUUID(), input);
    vi.mocked(s.bytes).mockResolvedValue(Buffer.from('garbage'));
    vi.mocked(s.abort).mockRejectedValue(new Error('offline'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const outcomes = await Promise.allSettled(Array.from({ length: 10 }, () => run.complete(id, completion(upload.video_id))));
      for (const r of outcomes) { expect(r.status).toBe('rejected'); if (r.status === 'rejected') expect(r.reason).toMatchObject({ status: 422, details: { reason: 'not_media' } }); }
      expect(s.delete).toHaveBeenCalledTimes(10); expect(log).toHaveBeenCalled();
      expect(await used(id)).toBe(0); expect(await used(id, 'user_upload_refunds')).toBe(1);
    } finally { log.mockRestore(); }
  });
  it('RU-003: resume lists completed ETags and signs only missing numbers', async () => {
    const s = storage(), run = service(s), id = await account(), key = randomUUID();
    const body = { ...input, declared_bytes: 30_000_000 };
    const first = await run.create(id, key, body);
    vi.mocked(s.list).mockResolvedValue([{ part_number: 1, etag: 'saved' }]);
    await pool.query("UPDATE video SET upload_parts='[]' WHERE id=$1", [first.video_id]);
    const resumed = await run.create(id, key, body);
    expect(resumed.completed_parts).toEqual([{ part_number: 1, etag: 'saved' }]);
    expect(resumed.parts.map((p) => p.part_number)).toEqual([2, 3]);
    expect(vi.mocked(s.sign).mock.calls.at(-1)?.[2]).toEqual([2, 3]);
    expect(s.initiate).toHaveBeenCalledTimes(1); expect(await used(id)).toBe(1);
  });
  it('RU-004: complete retry after processing advanced acknowledges without side effects', async () => {
    const s = storage(), enqueue = vi.fn(async () => {}), id = await account();
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input);
    await run.complete(id, completion(upload.video_id));
    for (const [status, marked] of [
      ...['transcribing', 'selecting', 'rendering', 'done'].flatMap((status) => [[status, true], [status, false]] as const),
      ['failed', true] as const,
    ]) {
      await pool.query('UPDATE video SET status=$2, upload_enqueued_at=CASE WHEN $3 THEN now() ELSE NULL END WHERE id=$1', [upload.video_id, status, marked]);
      const before = (await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0];
      vi.clearAllMocks();
      expect(await run.complete(id, completion(upload.video_id))).toEqual({ video_id: upload.video_id, status: 'queued' });
      expect((await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual(before);
      for (const fn of Object.values(s)) expect(fn).not.toHaveBeenCalled();
      expect(enqueue).not.toHaveBeenCalled(); expect(await used(id)).toBe(1);
    }
  });
  it('RU-004: concurrent advancement during complete acknowledges without republishing', async () => {
    const s = storage(), enqueue = vi.fn(async () => {}), id = await account();
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input), gate = barrier(1);
    vi.mocked(s.bytes).mockImplementation(async () => { await gate.hold(); return valid; });
    const pending = run.complete(id, completion(upload.video_id));
    try {
      await gate.all;
      await pool.query("UPDATE video SET status='transcribing' WHERE id=$1", [upload.video_id]);
      const before = (await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0];
      gate.release();
      expect(await pending).toEqual({ video_id: upload.video_id, status: 'queued' });
      expect((await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual(before);
      expect(enqueue).not.toHaveBeenCalled(); expect(await used(id)).toBe(1);
    } finally { gate.release(); await pending.catch(() => {}); }
  });
  it('RU-004: worker advances before publication marker and retry acknowledges', async () => {
    const s = storage(), id = await account();
    const enqueue = vi.fn(async (videoId: string) => {
      await pool.query("UPDATE video SET status='transcribing' WHERE id=$1", [videoId]);
    });
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input);
    await expect(run.complete(id, completion(upload.video_id))).resolves.toEqual({ video_id: upload.video_id, status: 'queued' });
    const before = (await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0];
    expect(before).toMatchObject({ status: 'transcribing', upload_enqueued_at: null });
    vi.clearAllMocks();
    await expect(run.complete(id, completion(upload.video_id))).resolves.toEqual({ video_id: upload.video_id, status: 'queued' });
    expect((await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual(before);
    for (const fn of Object.values(s)) expect(fn).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled(); expect(await used(id)).toBe(1);
  });
  it('RU-004: worker fails after admission before publication marker', async () => {
    const s = storage(), id = await account();
    let attempt: Awaited<ReturnType<typeof ensureInitialAttempt>>;
    const enqueue = vi.fn(async (videoId: string) => {
      attempt = await ensureInitialAttempt(pool, videoId);
      if (!attempt) throw new Error('missing attempt');
      expect(await acceptProbe(pool, attempt, limits, 120)).toBe('transcribing');
    });
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input);
    await run.complete(id, completion(upload.video_id));
    expect((await pool.query('SELECT status,upload_enqueued_at FROM video WHERE id=$1', [upload.video_id])).rows[0])
      .toEqual({ status: 'transcribing', upload_enqueued_at: null });
    if (!attempt!) throw new Error('missing attempt');
    expect(await failTranscription(pool, attempt, 'stt_failed')).toBe(true);
    const before = (await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0];
    expect(before).toMatchObject({ status: 'failed', failure_reason: 'stt_failed', actual_bytes: '24', upload_enqueued_at: null });
    vi.clearAllMocks();
    expect(await run.complete(id, completion(upload.video_id))).toEqual({ video_id: upload.video_id, status: 'queued' });
    expect((await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual(before);
    for (const fn of Object.values(s)) expect(fn).not.toHaveBeenCalled();
    expect(enqueue).not.toHaveBeenCalled(); expect(await used(id)).toBe(1);
  });
  it('RU-004: failure after initial read acknowledges at locked read', async () => {
    const s = storage(), enqueue = vi.fn(async () => {}), id = await account();
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input), gate = barrier(1);
    vi.mocked(s.bytes).mockImplementation(async () => { await gate.hold(); return valid; });
    const pending = run.complete(id, completion(upload.video_id));
    try {
      await gate.all;
      await pool.query("UPDATE video SET status='failed', failure_reason='stt_failed', actual_bytes=24 WHERE id=$1", [upload.video_id]);
      const before = (await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0];
      gate.release();
      expect(await pending).toEqual({ video_id: upload.video_id, status: 'queued' });
      expect((await pool.query('SELECT * FROM video WHERE id=$1', [upload.video_id])).rows[0]).toEqual(before);
      expect(enqueue).not.toHaveBeenCalled();
    } finally { gate.release(); await pending.catch(() => {}); }
  });
  it('RU-004: queued without marker still retries failed publication', async () => {
    const s = storage(), id = await account(), enqueue = vi.fn(async () => {});
    enqueue.mockRejectedValueOnce(new Error('queue unavailable'));
    const run = new VideoService(pool, limits, s, enqueue, () => now);
    const upload = await run.create(id, randomUUID(), input);
    await expect(run.complete(id, completion(upload.video_id))).rejects.toThrow('queue unavailable');
    expect((await pool.query('SELECT status,actual_bytes,upload_enqueued_at FROM video WHERE id=$1', [upload.video_id])).rows[0])
      .toEqual({ status: 'queued', actual_bytes: '24', upload_enqueued_at: null });
    expect(await run.complete(id, completion(upload.video_id))).toEqual({ video_id: upload.video_id, status: 'queued' });
    expect(enqueue).toHaveBeenCalledTimes(2);
  });
  it('RU-004: complete retains ownership, deletion and invalid-file errors', async () => {
    const s = storage(), run = service(s), id = await account(), other = await account();
    const upload = await run.create(id, randomUUID(), input);
    await run.complete(id, completion(upload.video_id));
    await pool.query("UPDATE video SET status='done' WHERE id=$1", [upload.video_id]);
    await expect(run.complete(other, completion(upload.video_id))).rejects.toMatchObject({ status: 404 });
    await pool.query('UPDATE video SET deleted_at=now() WHERE id=$1', [upload.video_id]);
    await expect(run.complete(id, completion(upload.video_id))).rejects.toMatchObject({ status: 404 });
    for (const reason of ['too_large', 'not_media']) {
      await pool.query("UPDATE video SET deleted_at=NULL, status='failed', failure_reason=$2 WHERE id=$1", [upload.video_id, reason]);
      await expect(run.complete(id, completion(upload.video_id))).rejects.toMatchObject({ status: 422, details: { reason } });
    }
    await pool.query("UPDATE video SET status='failed', failure_reason='stalled', upload_enqueued_at=NULL, actual_bytes=NULL WHERE id=$1", [upload.video_id]);
    await expect(run.complete(id, completion(upload.video_id))).rejects.toMatchObject({ status: 409 });
  });
  it('RU-004: midnight refund uses upload day; empty decrement consumes no allowance', async () => {
    const id = await account(), tomorrow = new Date('2026-09-22T21:01:00Z');
    await transaction(pool, (tx) => checkAndConsumeQuota(tx, limits, id, 'upload', 1, now));
    await transaction(pool, (tx) => checkAndConsumeQuota(tx, limits, id, 'upload', 2, tomorrow));
    expect(await transaction(pool, (tx) => refundUploadSlot(tx, limits, id, moscowDay(now), 'not_media', tomorrow))).toBe(true);
    expect(await used(id)).toBe(0); expect(await used(id, 'user_upload_refunds')).toBe(1);
    expect(await used(id, 'user_upload_refunds', moscowDay(tomorrow))).toBe(0);
    expect(await used(id, 'user_uploads', moscowDay(tomorrow))).toBe(2);
    const empty = await account();
    expect(await transaction(pool, (tx) => refundUploadSlot(tx, limits, empty, moscowDay(now), 'not_media', now))).toBe(false);
    expect(await used(empty, 'user_upload_refunds')).toBe(0);
  });
  it('RU-009: lost initiation response keeps a durable key and retries without charging twice', async () => {
    const s = storage(), run = service(s), id = await account(), key = randomUUID();
    vi.mocked(s.initiate).mockRejectedValueOnce(new Error('lost UploadId'));
    await expect(run.create(id, key, input)).rejects.toThrow('lost UploadId');
    expect((await pool.query('SELECT status,upload_id,object_key FROM video WHERE account_id=$1', [id])).rows[0])
      .toMatchObject({ status: 'uploading', upload_id: null, object_key: expect.stringContaining(`videos/${id}/`) });
    expect(s.abort).not.toHaveBeenCalled(); // Нельзя выдумать неизвестный UploadId.
    await expect(run.create(id, key, input)).resolves.toHaveProperty('upload_id');
    expect(await used(id)).toBe(1);
  });
});
