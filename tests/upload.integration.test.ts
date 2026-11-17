import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { randomUUID, randomBytes } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { transaction, checkAndConsumeQuota, refundUploadSlot } from '../packages/db/src/quota';
import { loadLimits } from '../packages/shared/src/config';
import { moscowDay } from '../packages/shared/src/upload';
import * as s3 from '../packages/s3/src';
import { VideoService, type UploadStorage, type UploadData } from '../apps/web/src/server/video';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { environment, liveS3Environment } from './fixtures/environment';

const dbUrl = process.env.DATABASE_URL;
const limits = loadLimits(environment());
const now = new Date('2026-09-22T10:00:00Z');
const body = { declared_bytes: 24, filename: 'выпуск.mp4', source: 'upload' };
const goodFile = Buffer.alloc(24); goodFile.writeUInt32BE(24); goodFile.write('ftyp', 4); goodFile.write('isom', 8);
const finalPreferences = { music: true, teaser: true, compact: true, cta_kind: 'subscribe', cta_url: 'https://example.invalid/' };
const preferencesConflict = { status: 409, details: { reason: 'final_preferences_conflict' } };

describe.skipIf(!dbUrl)('PostgreSQL: конкурентная квота и завершение загрузки', () => {
  let pool: Pool;
  const schema = `quota_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Нужна отдельная БД *_test');
    await ensureTestDatabase(dbUrl);
    pool = createPool(dbUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  const charge = (account: string, reason: 'upload' | 'minutes' | 'llm', n: number, date = now) =>
    transaction(pool, (tx) => checkAndConsumeQuota(tx, limits, account, reason, n, date));
  const used = async (account: string, scope = 'user_uploads', day = moscowDay(now)) =>
    (await pool.query('SELECT used FROM quota_counter WHERE scope=$1 AND scope_key=$2 AND day=$3', [scope, account, day])).rows[0]?.used ?? 0;
  it('N параллельных первых списаний: ровно два granted, used=2', async () => {
    const account = randomUUID();
    const results = await Promise.all(Array.from({ length: 12 }, () => charge(account, 'upload', 1)));
    expect(results.filter((r) => r.granted)).toHaveLength(2); expect(await used(account)).toBe(2);
  });
  it('V2-R01: первый за сутки n>limit отвергнут; старый UPSERT воспроизводит дефект', async () => {
    const account = randomUUID();
    expect(await charge(account, 'upload', 3)).toEqual({ granted: false, scope: 'user_uploads' });
    expect(await used(account)).toBe(0);
    const old = await pool.query(`INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('user_uploads',$1,$2,3)
      ON CONFLICT(scope,scope_key,day) DO UPDATE SET used=quota_counter.used+3
      WHERE quota_counter.used+3<=2 RETURNING used`, [randomUUID(), moscowDay(now)]);
    expect(old.rows[0].used).toBe(3); // Контрольная мутация действительно проходит потолок.
  });
  it('Два ключа minutes атомарны: общий отказ откатывает персональный', async () => {
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('global_minutes','all',$1,600)", [moscowDay(now)]);
    const account = randomUUID();
    expect(await charge(account, 'minutes', 1)).toEqual({ granted: false, scope: 'global_minutes' });
    expect(await used(account, 'user_minutes')).toBe(0);
  });
  it('user_llm и global_llm списываются вместе, третий вызов отказан', async () => {
    const account = randomUUID();
    expect((await charge(account, 'llm', 1)).granted).toBe(true);
    expect((await charge(account, 'llm', 1)).granted).toBe(true);
    expect(await charge(account, 'llm', 1)).toEqual({ granted: false, scope: 'user_llm' });
    expect(await used('all', 'global_llm')).toBe(2);
  });
  it('Два возврата при остатке 1: ровно один возвращает слот; refused_* не возвращает', async () => {
    const account = randomUUID(); await charge(account, 'upload', 2);
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('user_upload_refunds',$1,$2,1)", [account, moscowDay(now)]);
    const results = await Promise.all(Array.from({ length: 2 }, () => transaction(pool, (tx) => refundUploadSlot(tx, limits, account, moscowDay(now), 'not_media', now))));
    expect(results.filter(Boolean)).toHaveLength(1); expect(await used(account)).toBe(1);
    expect(await used(account, 'user_upload_refunds')).toBe(2);
    expect(await transaction(pool, (tx) => refundUploadSlot(tx, limits, account, moscowDay(now), 'refused_user_minutes', now))).toBe(false);
    expect(await used(account)).toBe(1);
  });
  it('Чужая квота не блокирует аккаунт; московская полночь даёт новые сутки', async () => {
    const a = randomUUID(), b = randomUUID(); await charge(a, 'upload', 2);
    const [denied, granted] = await Promise.all([charge(a, 'upload', 1), charge(b, 'upload', 1)]);
    expect(denied.granted).toBe(false); expect(granted.granted).toBe(true);
    expect((await charge(a, 'upload', 2, new Date('2026-09-22T21:01:00Z'))).granted).toBe(true);
    expect(await used(a, 'user_uploads', '2026-09-23')).toBe(2);
  });
  async function completionFixture() {
    const id = (await pool.query("INSERT INTO account(email,password_hash) VALUES ($1,'test-hash') RETURNING id",
      [`${randomUUID()}@example.invalid`])).rows[0].id as string;
    const storage = {
      initiate: async () => 'multipart', list: async () => [],
      sign: async () => [{part_number:1,url:'https://example.invalid/part',expires_at:new Date(now.getTime()+60000).toISOString()}],
      complete: vi.fn(async () => {}), head: async () => BigInt(goodFile.length), bytes: async () => goodFile,
      abort: async () => {}, delete: async () => {},
    } satisfies UploadStorage;
    const queue = vi.fn(async (_id: string, _fence: number) => {});
    const service = new VideoService(pool, limits, storage, queue, () => now);
    const key = randomUUID(), upload = await service.create(id, key, body);
    const input = {video_id:upload.video_id,parts:[{part_number:1,etag:'part'}]};
    const readVideo = async () => (await pool.query(
      'SELECT status,music,teaser,compact,cta_kind,cta_url FROM video WHERE id=$1', [upload.video_id])).rows[0];
    return { id, key, storage, queue, service, input, readVideo };
  }
  it('FOR UPDATE: конкурирующий Complete сравнивает настройки победителя', async () => {
    const { id, key, storage, queue, service, input, readVideo } = await completionFixture();
    await expect(service.create(id, key, {...body,music:true})).rejects.toMatchObject({status:409});
    let validated!: () => void, release!: () => void;
    const beforeLock = new Promise<void>(resolve => {validated=resolve;});
    const waitForWinner = new Promise<void>(resolve => {release=resolve;});
    const competitor = new VideoService(pool, limits, {...storage, bytes: async () => {
      validated();await waitForWinner;return goodFile;
    }}, queue, () => now);
    const losing = competitor.complete(id, {...input,final_preferences:{...finalPreferences,compact:false}});
    try {
      await Promise.race([beforeLock,losing]);
      queue.mockImplementationOnce(async () => {
        expect(await readVideo()).toEqual({status:'queued',...finalPreferences});
      });
      await expect(service.complete(id, {...input,final_preferences:finalPreferences})).resolves.toMatchObject({status:'queued'});
    } finally {release();}
    await expect(losing).rejects.toMatchObject(preferencesConflict);
    expect(await readVideo()).toEqual({status:'queued',...finalPreferences});
    expect(queue.mock.calls).toEqual([[input.video_id,1]]);
    expect((await pool.query('SELECT id FROM video WHERE account_id=$1',[id])).rowCount).toBe(1);
    expect(await used(id)).toBe(1);expect(await used(id,'user_minutes')).toBe(0);
  });
  it('Complete проверяет поля до S3 и сравнивает настройки во всех ветках повтора', async () => {
    const { id, storage, queue, service, input, readVideo } = await completionFixture();
    const prefs = {...finalPreferences,cta_url:'https://EXAMPLE.invalid'};
    const payload = {...input,final_preferences:prefs}, conflict = {...input,final_preferences:{...prefs,teaser:false}};
    for (const final_preferences of [
      null, {...prefs,extra:true}, {...prefs,compact:undefined}, {...prefs,cta_url:undefined},
      {...prefs,music:1}, {...prefs,cta_kind:'custom'}, {...prefs,cta_url:'x'.repeat(2049)},
    ]) {
      await expect(service.complete(id,{...input,final_preferences})).rejects.toMatchObject({status:422});
    }
    await expect(service.complete(id,{...input,final_preferences:{...prefs,cta_url:'http://example.invalid'}}))
      .rejects.toMatchObject({status:422,details:{field:'cta_url'}});
    await expect(service.complete(randomUUID(),payload)).rejects.toMatchObject({status:404});
    expect(storage.complete).not.toHaveBeenCalled();expect(queue).not.toHaveBeenCalled();
    expect(await readVideo()).toMatchObject({status:'uploading',music:false,teaser:false,compact:false,cta_kind:'none',cta_url:null});

    queue.mockRejectedValueOnce(new Error('Redis offline'));
    await expect(service.complete(id,payload)).rejects.toThrow('Redis offline');
    await expect(service.complete(id,conflict)).rejects.toMatchObject(preferencesConflict); // queued, ещё без отметки
    expect(queue).toHaveBeenCalledTimes(1);
    await expect(service.complete(id,{...input,final_preferences:finalPreferences})).resolves.toMatchObject({status:'queued'});
    await expect(service.complete(id,conflict)).rejects.toMatchObject(preferencesConflict); // queued, уже доставлена
    for (const status of ['transcribing','selecting','rendering','done','failed']) {
      // Снимаем отметку доставки, чтобы независимо проверить ветки статуса и actual_bytes.
      await pool.query('UPDATE video SET status=$2,upload_enqueued_at=NULL WHERE id=$1',[input.video_id,status]);
      await expect(service.complete(id,conflict)).rejects.toMatchObject(preferencesConflict);
      await expect(service.complete(id,payload)).resolves.toMatchObject({status:'queued'});
      await expect(service.complete(id,input)).resolves.toMatchObject({status:'queued'}); // Запрос прежнего клиента.
      expect(await readVideo()).toEqual({status,...finalPreferences});
    }
    expect(storage.complete).toHaveBeenCalledTimes(1);expect(queue.mock.calls).toEqual([[input.video_id,1],[input.video_id,1]]);
    expect(await used(id)).toBe(1);expect(await used(id,'user_minutes')).toBe(0);
  });
  it('Непригодный файл не применяет итоговые настройки и не попадает в очередь', async () => {
    const { id, storage, queue, input, readVideo } = await completionFixture();
    const service = new VideoService(pool, limits, {...storage,bytes:async()=>Buffer.alloc(goodFile.length)}, queue, () => now);
    await expect(service.complete(id,{...input,final_preferences:finalPreferences}))
      .rejects.toMatchObject({status:422,details:{reason:'not_media'}});
    expect(await readVideo()).toEqual({status:'failed',music:false,teaser:false,compact:false,cta_kind:'none',cta_url:null});
    expect(queue).not.toHaveBeenCalled();expect(await used(id)).toBe(0);expect(await used(id,'user_upload_refunds')).toBe(1);
  });
});

describe.skipIf(!dbUrl || process.env.N5_PREFIX_RUN_S3 !== '1')('PostgreSQL + Cloud S3: полный серверный upload', () => {
  let pool: Pool, ctx: s3.StorageContext, storage: UploadStorage, service: VideoService;
  let safety: ReturnType<typeof liveS3Environment>;
  let audit: ReturnType<ReturnType<typeof liveS3Environment>['receipt']> | undefined;
  const namespace = `tests/cloud/${randomUUID()}/`, scope = { prefixes: [namespace], allowList: true, allowVersioning: true };
  const queue = vi.fn(async (_id: string, _fence: number) => {});
  const schema = `upload_${randomBytes(8).toString('hex')}`;
  const keys = new Set<string>(); const uploads: { key: string; id: string }[] = [];
  beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test' || !dbUrl || !new URL(dbUrl).pathname.endsWith('_test')) throw new Error('Только тестовое окружение');
    safety = liveS3Environment(); const config = { ...safety.config, keyPrefix: namespace };
    audit = safety.receipt(namespace, 'upload-integration');
    await ensureTestDatabase(dbUrl);
    pool = createPool(dbUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
    const client = s3.createS3Client(config); safety.bind(client, scope); safety.bind(client.signingClient!, scope);
    ctx = { client, bucket: config.bucket };
    storage = {
      initiate: vi.fn(async (key) => { keys.add(key); const token = audit!.startUpload(key); const id = await s3.initiateMultipartUpload(ctx, key); uploads.push({ key, id }); audit!.resolvedUpload(token, id); return id; }),
      sign: (key, id, count, date) => s3.signParts(ctx, key, id, count, date),
      list: (key, id) => s3.listUploadedParts(ctx, key, id),
      complete: (key, id, parts) => s3.completeMultipartUpload(ctx, key, id, parts),
      head: (key) => s3.headObject(ctx, key), bytes: (key) => s3.getObjectBytes(ctx, key),
      abort: (key, id) => s3.abortMultipartUpload(ctx, key, id), delete: (key) => s3.deleteObject(ctx, key),
    };
    service = new VideoService(pool, limits, storage, queue); // Реальное время для SigV4.
  });
  afterAll(async () => {
    const closePool = async () => { if (pool) { try { await pool.query(`DROP SCHEMA ${schema} CASCADE`); } finally { await pool.end(); } } };
    const cleanup = async () => {
      if (!ctx) return;
      audit?.beginCleanup();
      const aborts = await Promise.allSettled(uploads.map((u) => s3.abortMultipartUpload(ctx, u.key, u.id)));
      const removals = await Promise.allSettled([...keys].map((key) => s3.deleteObject(ctx, key)));
      ctx.client.destroy();
      const ok = [...aborts, ...removals].every((item) => item.status === 'fulfilled'); audit?.finish(ok);
      if (!ok) throw new Error('Synthetic upload cleanup incomplete');
    };
    if (safety) await safety.finalize(cleanup, closePool); else await closePool();
  });
  async function account() {
    return (await pool.query("INSERT INTO account(email,password_hash) VALUES ($1,'test-hash') RETURNING id", [`${randomUUID()}@example.invalid`])).rows[0].id as string;
  }
  async function count(id: string, scope = 'user_uploads') {
    return (await pool.query('SELECT used FROM quota_counter WHERE scope=$1 AND scope_key=$2 AND day=$3', [scope, id, moscowDay(new Date())])).rows[0]?.used ?? 0;
  }
  async function put(upload: UploadData, bytes: Uint8Array = goodFile) {
    const response = await safety.fetch(upload.parts[0]!.url, { method: 'PUT', body: Buffer.from(bytes) }, scope);
    expect(response.status).toBe(200);
    const etag = response.headers.get('etag'); expect(etag).toBeTruthy();
    return { video_id: upload.video_id, parts: [{ part_number: 1, etag: etag! }] };
  }
  it('N concurrent video.create: 2 uploading, остальные failed/refused; S3 вызван только дважды', async () => {
    const id = await account(); const before = vi.mocked(storage.initiate).mock.calls.length;
    const results = await Promise.allSettled(Array.from({ length: 8 }, () => service.create(id, randomUUID(), body)));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2);
    for (const r of results) if (r.status === 'rejected') expect(r.reason).toMatchObject({ code: 'refused', details: { scope: 'user_uploads' } });
    expect(await count(id)).toBe(2); expect(vi.mocked(storage.initiate).mock.calls.length - before).toBe(2);
    expect((await pool.query("SELECT id FROM video WHERE account_id=$1 AND status='uploading'", [id])).rowCount).toBe(2);
  });
  it('Два одинаковых ключа: одна строка, одно списание, буквально одинаковые ссылки', async () => {
    const id = await account(), key = randomUUID();
    const [a, b] = await Promise.all([service.create(id, key, body), service.create(id, key, body)]);
    expect(a).toEqual(b); expect(await count(id)).toBe(1);
    expect((await pool.query('SELECT id FROM video WHERE account_id=$1', [id])).rowCount).toBe(1);
  });
  it('Отказ повторного ключа остаётся отказом без новых S3 вызовов', async () => {
    const id = await account(); await service.create(id, randomUUID(), body); await service.create(id, randomUUID(), body);
    const key = randomUUID(), before = vi.mocked(storage.initiate).mock.calls.length;
    for (let i = 0; i < 2; i++) await expect(service.create(id, key, body)).rejects.toMatchObject({ code: 'refused' });
    expect(vi.mocked(storage.initiate).mock.calls.length).toBe(before); expect(await count(id)).toBe(2);
  });
  it('RI-001: подписанный PUT → Complete → HEAD → Range → queued', async () => {
    const id = await account(), upload = await service.create(id, randomUUID(), body);
    queue.mockImplementationOnce(async (videoId) => {
      expect((await pool.query('SELECT status FROM video WHERE id=$1', [videoId])).rows[0].status).toBe('queued');
    });
    expect(await service.complete(id, await put(upload))).toEqual({ video_id: upload.video_id, status: 'queued' });
    expect(await count(id, 'user_minutes')).toBe(0);
    expect(queue).toHaveBeenCalledWith(upload.video_id, 1);
  });
  it('HEAD повторно ловит превышение и удаляет реальный объект; failed+refund сохранены', async () => {
    const id = await account(), upload = await service.create(id, randomUUID(), body), input = await put(upload);
    // Подменён только размер HEAD: 2 ГБ тестовых данных не выделяем. S3 complete/delete настоящие.
    const oversized = new VideoService(pool, limits, { ...storage, head: async () => 2_000_000_001n }, queue);
    await expect(oversized.complete(id, input)).rejects.toMatchObject({ status: 422, details: { reason: 'too_large' } });
    expect(await count(id)).toBe(0); expect(await count(id, 'user_upload_refunds')).toBe(1);
    const row = (await pool.query('SELECT status, failure_reason, object_key FROM video WHERE id=$1', [upload.video_id])).rows[0];
    expect(row).toMatchObject({ status: 'failed', failure_reason: 'too_large' });
    await expect(storage.head(row.object_key)).rejects.toMatchObject({ name: 'NotFound' });
  });
  it('S3: подтверждённая часть сохраняется при продолжении, итоговые настройки фиксируются один раз', async () => {
    const id = await account(), file = Buffer.alloc(11 * 1024 * 1024); goodFile.copy(file);
    const key = randomUUID(), initial = {...body,declared_bytes:file.length};
    const upload = await service.create(id, key, initial);
    expect(upload.parts).toHaveLength(2);
    const putPart = async (part: UploadData['parts'][number]) => {
      const start = (part.part_number - 1) * upload.part_size;
      const response = await safety.fetch(part.url, { method: 'PUT', body: file.subarray(start, start + upload.part_size) }, scope, 120_000);
      expect(response.status).toBe(200);expect(response.headers.get('etag')).toBeTruthy();
      return {part_number:part.part_number,etag:response.headers.get('etag')!};
    };
    await putPart(upload.parts[0]!);
    await expect(service.create(id,key,{...initial,compact:true})).rejects.toMatchObject({status:409});
    const resumed = await service.create(id,key,initial);
    expect(resumed).toMatchObject({video_id:upload.video_id,upload_id:upload.upload_id,completed_parts:[{part_number:1}]});
    expect(resumed.parts.map(part=>part.part_number)).toEqual([2]);
    const input = {video_id:upload.video_id,parts:[resumed.completed_parts![0]!,await putPart(resumed.parts[0]!)],final_preferences:finalPreferences};
    const before = queue.mock.calls.length;
    expect(await service.complete(id,input)).toMatchObject({status:'queued'});
    expect(await service.complete(id,input)).toMatchObject({status:'queued'});
    const rows = (await pool.query('SELECT actual_bytes,music,teaser,compact,cta_kind,cta_url FROM video WHERE account_id=$1',[id])).rows;
    expect(rows).toEqual([{actual_bytes:String(file.length),...finalPreferences}]);
    expect(queue.mock.calls.slice(before)).toEqual([[upload.video_id,1]]);
    expect(await count(id)).toBe(1);expect(await count(id,'user_minutes')).toBe(0);
    expect((await pool.query('SELECT video_id FROM video_credit_charge WHERE video_id=$1',[upload.video_id])).rowCount).toBe(0);
  }, 300_000);
  it('Чужой и отсутствующий id дают одинаковый 404, без S3', async () => {
    const owner = await account(), stranger = await account(), upload = await service.create(owner, randomUUID(), body);
    for (const video_id of [upload.video_id, randomUUID()]) {
      await expect(service.complete(stranger, { video_id, parts: [{ part_number: 1, etag: 'x' }] })).rejects.toMatchObject({ code: 'not_found', status: 404, message: 'Запись не найдена' });
    }
  });
  it('Два concurrent not_media при остатке возвратов 1: один возврат, две failed; повтор не возвращает снова', async () => {
    const id = await account();
    const [a, b] = await Promise.all([service.create(id, randomUUID(), body), service.create(id, randomUUID(), body)]);
    await pool.query("INSERT INTO quota_counter(scope,scope_key,day,used) VALUES ('user_upload_refunds',$1,$2,1)", [id, moscowDay(new Date())]);
    const inputs = await Promise.all([put(a, Buffer.alloc(body.declared_bytes)), put(b, Buffer.alloc(body.declared_bytes))]);
    const results = await Promise.allSettled(inputs.map((input) => service.complete(id, input)));
    for (const r of results) { expect(r.status).toBe('rejected'); if (r.status === 'rejected') expect(r.reason).toMatchObject({ status: 422, details: { reason: 'not_media' } }); }
    expect(await count(id)).toBe(1); expect(await count(id, 'user_upload_refunds')).toBe(2);
    expect((await pool.query("SELECT id FROM video WHERE account_id=$1 AND status='failed' AND failure_reason='not_media'", [id])).rowCount).toBe(2);
    await expect(service.complete(id, inputs[0])).rejects.toMatchObject({ status: 422 }); expect(await count(id)).toBe(1);
  });
  it('Разные аккаунты concurrent: чужое исчерпание не закрывает добросовестного', async () => {
    const a = await account(), b = await account();
    await service.create(a, randomUUID(), body); await service.create(a, randomUUID(), body);
    const results = await Promise.allSettled([service.create(a, randomUUID(), body), service.create(b, randomUUID(), body)]);
    expect(results[0]!.status).toBe('rejected'); expect(results[1]!.status).toBe('fulfilled');
  });
  it('Redis failure after commit: повтор завершает постановку без второго S3 complete', async () => {
    const id = await account(), upload = await service.create(id, randomUUID(), body), input = await put(upload);
    queue.mockRejectedValueOnce(new Error('Redis offline'));
    await expect(service.complete(id, input)).rejects.toThrow('Redis offline');
    expect((await pool.query('SELECT status FROM video WHERE id=$1', [upload.video_id])).rows[0].status).toBe('queued');
    expect(await service.complete(id, input)).toMatchObject({ status: 'queued' }); expect(await count(id)).toBe(1);
  });
  it('Отказ подписания сохраняет upload_id и квоту для повтора без второго initiate', async () => {
    const id = await account(), abort = vi.fn(storage.abort);
    const broken = new VideoService(pool, limits, { ...storage, abort, sign: async () => { throw new Error('sign failure'); } }, queue);
    const key = randomUUID(), before = vi.mocked(storage.initiate).mock.calls.length;
    await expect(broken.create(id, key, body)).rejects.toThrow('sign failure');
    expect(await count(id)).toBe(1); expect((await pool.query('SELECT id FROM video WHERE account_id=$1', [id])).rowCount).toBe(1);
    expect(abort).not.toHaveBeenCalled();
    await expect(service.create(id, key, body)).resolves.toHaveProperty('upload_id');
    expect(vi.mocked(storage.initiate).mock.calls.length - before).toBe(1);
  });
});
