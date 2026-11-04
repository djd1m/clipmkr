import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { refundUploadSlot } from '../packages/db/src/index';
import { loadLimits } from '../packages/shared/src/config';
import { MAX_UPLOAD_BYTES } from '../packages/shared/src/upload';
import type { VideoStatus } from '../packages/shared/src/enums';
import { UploadTooLarge } from '../packages/s3/src';
import { VideoService, type UploadStorage } from '../apps/web/src/server/video';
import { environment } from './fixtures/environment';

vi.mock('../packages/db/src/index', async (importOriginal) => ({
  ...await importOriginal<typeof import('../packages/db/src/index')>(),
  refundUploadSlot: vi.fn(async () => true),
}));

const videoId = 'a65e5f33-3194-46c3-8c18-1d3a42bfe158';
const now = new Date('2026-11-04T12:00:00Z');
const validMedia = Buffer.alloc(24);
validMedia.writeUInt32BE(24); validMedia.write('ftyp', 4); validMedia.write('isom', 8);
const completion = (count = 3) => ({ video_id: videoId,
  parts: Array.from({ length: count }, (_, i) => ({ part_number: i + 1, etag: `etag-${i + 1}` })) });

type StoredVideo = {
  id: string; account_id: string; object_key: string; upload_id: string | null;
  declared_bytes: string; actual_bytes: string | null; upload_part_size: number | undefined;
  status: VideoStatus; failure_reason: string | null; upload_day: string;
  upload_enqueued_at: Date | null; deleted_at: Date | null;
};
function fixture(overrides: Partial<StoredVideo> = {}) {
  const row: StoredVideo = { id: videoId, account_id: 'owner', object_key: 'videos/owner/source.mp4',
    upload_id: 'existing-multipart', declared_bytes: '24', actual_bytes: null, upload_part_size: 10,
    status: 'uploading', failure_reason: null, upload_day: '2026-11-04', upload_enqueued_at: null,
    deleted_at: null, ...overrides };
  const events: string[] = [];
  // Use the real transaction helper; fail closed on SQL outside this completion contract.
  const query = vi.fn(async (sql: string, values: unknown[] = []) => {
    if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql)) {
      events.push(sql); return { rows: [], rowCount: 0 };
    }
    if (sql.startsWith('SELECT ')) {
      expect(sql).toContain('account_id=$2 AND deleted_at IS NULL');
      return { rows: row.id === values[0] && row.account_id === values[1] && !row.deleted_at
        ? [structuredClone(row)] : [], rowCount: 1 };
    }
    expect(values[0]).toBe(row.id);
    if (sql.startsWith('UPDATE video SET actual_bytes=')) {
      row.actual_bytes = String(values[1]); events.push('actual_bytes');
    } else if (sql.startsWith("UPDATE video SET status='queued'")) {
      row.status = 'queued'; events.push('queued');
    } else if (sql.startsWith("UPDATE video SET status='failed'")) {
      row.status = 'failed'; row.failure_reason = String(values[1]); events.push('failed');
    } else if (sql.startsWith('UPDATE video SET upload_enqueued_at=')) {
      row.upload_enqueued_at = now; events.push('marked');
    } else throw new Error(`Unexpected SQL in completion harness: ${sql}`);
    return { rows: [], rowCount: 1 };
  });
  const release = vi.fn();
  const connect = vi.fn(async () => { events.push('connect'); return { query, release }; });
  const storage = {
    initiate: vi.fn(async () => 'unused'), sign: vi.fn(async () => []), list: vi.fn(async () => []),
    complete: vi.fn(async () => { events.push('complete'); }),
    head: vi.fn(async () => { events.push('head'); return BigInt(row.declared_bytes); }),
    bytes: vi.fn(async () => { events.push('bytes'); return validMedia; }),
    abort: vi.fn(async () => {}), delete: vi.fn(async () => {}),
  } satisfies UploadStorage;
  const enqueue = vi.fn(async () => { events.push('enqueue'); });
  const run = new VideoService({ query, connect } as unknown as Pool, loadLimits(environment()), storage, enqueue, () => now);
  const untouched = () => {
    expect(connect).not.toHaveBeenCalled(); expect(enqueue).not.toHaveBeenCalled();
    expect(refundUploadSlot).not.toHaveBeenCalled();
    expect(storage.abort).not.toHaveBeenCalled(); expect(storage.delete).not.toHaveBeenCalled();
    expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT '))).toBe(true);
    expect(row.status).toBe('uploading'); expect(row.actual_bytes).toBeNull(); expect(row.failure_reason).toBeNull();
  };
  return { row, events, query, connect, release, storage, enqueue, run, untouched };
}

beforeEach(() => { vi.clearAllMocks(); });

describe('multipart completion integrity', () => {
  it.each([1, 2, 4])('rejects contiguous part count %s before destructive Complete (expected 3)', async (count) => {
    const f = fixture();
    await expect(f.run.complete('owner', completion(count))).rejects.toMatchObject({ code: 'invalid', status: 422 });
    for (const operation of Object.values(f.storage)) expect(operation).not.toHaveBeenCalled();
    f.untouched();
  });

  it.each([0n, 23n, 25n, BigInt(MAX_UPLOAD_BYTES)])('rejects mismatching HEAD %s without accepting or cleaning the file', async (bytes) => {
    const f = fixture(); f.storage.head.mockResolvedValue(bytes);
    await expect(f.run.complete('owner', completion())).rejects.toMatchObject({ code: 'conflict', status: 409 });
    expect(f.storage.complete).toHaveBeenCalledOnce(); expect(f.storage.head).toHaveBeenCalledOnce();
    expect(f.storage.bytes).not.toHaveBeenCalled(); f.untouched();
  });

  it.each([23n, 25n])('lost Complete response cannot admit an object of %s bytes', async (bytes) => {
    const f = fixture();
    f.storage.complete.mockRejectedValue(new Error('response lost after assembly')); f.storage.head.mockResolvedValue(bytes);
    await expect(f.run.complete('owner', completion())).rejects.toMatchObject({ code: 'conflict', status: 409 });
    expect(f.storage.head).toHaveBeenCalledOnce(); expect(f.storage.bytes).not.toHaveBeenCalled(); f.untouched();
  });

  it.each([{ bytes: '30', count: 3 }, { bytes: '31', count: 4 }])('accepts expected count at $bytes bytes and commits before enqueue', async ({ bytes, count }) => {
    const f = fixture({ declared_bytes: bytes });
    await expect(f.run.complete('owner', completion(count))).resolves.toEqual({ video_id: videoId, status: 'queued' });
    expect(f.storage.complete).toHaveBeenCalledWith(f.row.object_key, f.row.upload_id, completion(count).parts);
    expect(f.row.actual_bytes).toBe(bytes); expect(f.row.status).toBe('queued');
    expect(f.enqueue).toHaveBeenCalledExactlyOnceWith(videoId, 1);
    expect(f.events).toEqual(['complete', 'head', 'bytes', 'connect', 'BEGIN', 'actual_bytes', 'queued', 'COMMIT', 'enqueue', 'marked']);
    expect(f.release).toHaveBeenCalledOnce(); expect(refundUploadSlot).not.toHaveBeenCalled();
  });

  it('recovers a lost Complete response only when HEAD has the declared size', async () => {
    const f = fixture(); f.storage.complete.mockRejectedValue(new Error('response lost'));
    await expect(f.run.complete('owner', completion())).resolves.toEqual({ video_id: videoId, status: 'queued' });
    expect(f.storage.head).toHaveBeenCalledOnce(); expect(f.row.actual_bytes).toBe('24');
    expect(f.enqueue).toHaveBeenCalledExactlyOnceWith(videoId, 1);
  });

  it.each([false, true])('preserves too_large/refund/cleanup for over-MAX HEAD (lost response: %s)', async (lost) => {
    const f = fixture(); f.storage.head.mockResolvedValue(BigInt(MAX_UPLOAD_BYTES) + 1n);
    if (lost) f.storage.complete.mockRejectedValue(new Error('response lost'));
    await expect(f.run.complete('owner', completion())).rejects.toMatchObject({ code: 'invalid', status: 422, details: { reason: 'too_large' } });
    expect(f.row.status).toBe('failed'); expect(f.row.failure_reason).toBe('too_large');
    expect(f.row.actual_bytes).toBe(String(MAX_UPLOAD_BYTES + 1));
    expect(refundUploadSlot).toHaveBeenCalledWith(expect.anything(), expect.anything(), 'owner', '2026-11-04', 'too_large', now);
    expect(f.storage.abort).toHaveBeenCalledExactlyOnceWith(f.row.object_key, 'existing-multipart');
    expect(f.storage.delete).toHaveBeenCalledExactlyOnceWith(f.row.object_key);
    expect(f.storage.bytes).not.toHaveBeenCalled(); expect(f.enqueue).not.toHaveBeenCalled();
  });

  it('preserves the adapter UploadTooLarge refusal without HEAD', async () => {
    const f = fixture(); f.storage.complete.mockRejectedValue(new UploadTooLarge());
    await expect(f.run.complete('owner', completion())).rejects.toMatchObject({ status: 422, details: { reason: 'too_large' } });
    expect(f.storage.head).not.toHaveBeenCalled(); expect(f.row.actual_bytes).toBeNull();
    expect(f.row.failure_reason).toBe('too_large'); expect(refundUploadSlot).toHaveBeenCalledOnce();
    expect(f.enqueue).not.toHaveBeenCalled(); expect(f.storage.delete).toHaveBeenCalledOnce();
  });

  it('legacy committed queued retries publish without validating old multipart count or metadata', async () => {
    const f = fixture({ status: 'queued', upload_part_size: undefined, upload_id: null });
    await expect(f.run.complete('owner', completion(1))).resolves.toEqual({ video_id: videoId, status: 'queued' });
    for (const operation of Object.values(f.storage)) expect(operation).not.toHaveBeenCalled();
    expect(f.connect).not.toHaveBeenCalled(); expect(f.enqueue).toHaveBeenCalledExactlyOnceWith(videoId, 1);
  });

  it.each(['queued', 'transcribing', 'selecting', 'rendering', 'done', 'failed'] as const)('admitted %s retries keep their side-effect-free acknowledgement', async (status) => {
    const f = fixture({ status, upload_enqueued_at: now, actual_bytes: '24', upload_part_size: undefined });
    await expect(f.run.complete('owner', completion(1))).resolves.toEqual({ video_id: videoId, status: 'queued' });
    for (const operation of Object.values(f.storage)) expect(operation).not.toHaveBeenCalled();
    expect(f.connect).not.toHaveBeenCalled(); expect(f.enqueue).not.toHaveBeenCalled();
    expect(f.query).toHaveBeenCalledOnce(); expect(refundUploadSlot).not.toHaveBeenCalled();
  });

  it('retry after a failed publish never reassembles or revalidates a committed queued upload', async () => {
    const f = fixture(); f.enqueue.mockRejectedValueOnce(new Error('queue offline'));
    await expect(f.run.complete('owner', completion())).rejects.toThrow('queue offline');
    expect(f.row.status).toBe('queued'); expect(f.row.actual_bytes).toBe('24');
    await expect(f.run.complete('owner', completion(1))).resolves.toEqual({ video_id: videoId, status: 'queued' });
    expect(f.storage.complete).toHaveBeenCalledOnce(); expect(f.storage.head).toHaveBeenCalledOnce();
    expect(f.storage.bytes).toHaveBeenCalledOnce(); expect(f.enqueue).toHaveBeenCalledTimes(2);
    expect(f.connect).toHaveBeenCalledOnce();
  });

  it.each(['foreign', 'missing', 'deleted'] as const)('%s video returns 404 before storage or enqueue', async (kind) => {
    const f = fixture(kind === 'deleted' ? { deleted_at: now } : kind === 'missing' ? { id: 'different-id' } : {});
    await expect(f.run.complete(kind === 'foreign' ? 'stranger' : 'owner', completion(1))).rejects.toMatchObject({ code: 'not_found', status: 404 });
    for (const operation of Object.values(f.storage)) expect(operation).not.toHaveBeenCalled();
    expect(f.connect).not.toHaveBeenCalled(); expect(f.enqueue).not.toHaveBeenCalled();
    expect(f.query).toHaveBeenCalledOnce(); expect(refundUploadSlot).not.toHaveBeenCalled();
  });

  it.each([{ numbers: [1, 3] }, { numbers: [1, 1] }, { numbers: [0, 1] }])('rejects malformed part numbers $numbers before storage', async ({ numbers }) => {
    const f = fixture(); const body = { video_id: videoId, parts: numbers.map((part_number) => ({ part_number, etag: 'a' })) };
    await expect(f.run.complete('owner', body)).rejects.toMatchObject({ code: 'invalid', status: 422 });
    expect(f.query).not.toHaveBeenCalled(); f.untouched();
  });

  it('preserves a pending upload when Complete and HEAD are unavailable', async () => {
    const f = fixture(); f.storage.complete.mockRejectedValue(new Error('timeout')); f.storage.head.mockRejectedValue(new Error('not assembled'));
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(f.run.complete('owner', completion())).rejects.toMatchObject({ code: 'unavailable', status: 503 });
      expect(f.storage.bytes).not.toHaveBeenCalled(); f.untouched();
    } finally { errorLog.mockRestore(); }
  });

  it('preserves post-storage state recheck when processing already advanced', async () => {
    const f = fixture(); f.storage.bytes.mockImplementation(async () => { f.row.status = 'transcribing'; return validMedia; });
    await expect(f.run.complete('owner', completion())).resolves.toEqual({ video_id: videoId, status: 'queued' });
    expect(f.enqueue).not.toHaveBeenCalled(); expect(f.row.actual_bytes).toBeNull();
    expect(f.query.mock.calls.filter(([sql]) => sql.startsWith('UPDATE '))).toHaveLength(0);
  });
});
