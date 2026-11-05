import { afterEach, expect, it, vi } from 'vitest';
import { uploadParts } from '../apps/web/src/lib/upload-parts';
afterEach(() => vi.unstubAllGlobals());
const parts = [1, 2].map((n) => ({ part_number: n, url: `https://storage.invalid/part-${n}?signature=original`, expires_at: '2099-01-01T00:00:00Z' }));
it('Прямой PUT в S3: размер частей от сервера, URL и заголовки не дополняются', async () => {
  const fetcher = vi.fn(async () => new Response('', { status: 200, headers: { ETag: 'etag' } })); vi.stubGlobal('fetch', fetcher);
  expect(await uploadParts(new Blob(['1234567']), { part_size: 5, parts })).toHaveLength(2);
  const calls = fetcher.mock.calls as unknown as [string, RequestInit][];
  expect(calls.map(([url]) => url)).toEqual(parts.map((p) => p.url));
  expect(await (calls[0]![1].body as Blob).text()).toBe('12345');
  expect(await (calls[1]![1].body as Blob).text()).toBe('67');
  for (const [, options] of calls) { expect(options.method).toBe('PUT'); expect(options.headers).toBeUndefined(); }
});
it('CORS/network отказ превращается в понятную ошибку, а не зависание', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
  await expect(uploadParts(new Blob(['file']), { part_size: 5, parts })).rejects.toThrow('Не удалось связаться с хранилищем');
});
it('Невидимый из-за CORS ETag — явная ошибка; истёкшая ссылка не отправляется', async () => {
  const fetcher = vi.fn(async () => new Response('', { status: 200 })); vi.stubGlobal('fetch', fetcher);
  await expect(uploadParts(new Blob(['file']), { part_size: 5, parts })).rejects.toThrow('не подтвердило');
  fetcher.mockClear();
  await expect(uploadParts(new Blob(['file']), { part_size: 5, parts: [{ ...parts[0]!, expires_at: '2020-01-01T00:00:00Z' }] })).rejects.toThrow('Срок ссылки истёк');
  expect(fetcher).not.toHaveBeenCalled();
});

it('acknowledged_progress_deduplicates_parts_and_tail', async () => {
  const releases = new Map<string, (response: Response) => void>();
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise<Response>(resolve => releases.set(url, resolve))));
  const observed: number[] = [];
  const upload = uploadParts(new Blob(['123456789012']), { part_size: 5,
    parts: [1, 2, 3].map(n => ({ part_number: n, url: `part-${n}`, expires_at: '2099-01-01T00:00:00Z' })) }, undefined, undefined, bytes => observed.push(bytes));
  expect(observed).toEqual([0]); // queued bytes are not acknowledged bytes
  releases.get('part-3')!(new Response('', { headers: { ETag: 'tail' } }));
  await vi.waitFor(() => expect(observed).toEqual([0, 2]));
  releases.get('part-1')!(new Response('', { headers: { ETag: 'first' } }));
  await vi.waitFor(() => expect(observed).toEqual([0, 2, 7]));
  releases.get('part-2')!(new Response('', { headers: { ETag: 'second' } }));
  expect((await upload).map(p => p.part_number)).toEqual([1, 2, 3]);
  expect(observed).toEqual([0, 2, 7, 12]);
});
it('signature_refresh_merges_unique_server_acknowledgements_without_reset', async () => {
  const observed: number[] = [];
  const fetcher = vi.fn(async () => new Response('', { status: 403 })); vi.stubGlobal('fetch', fetcher);
  const refresh = vi.fn(async () => ({ part_size: 5, parts: [], completed_parts: [
    { part_number: 1, etag: 'first-again' }, { part_number: 1, etag: 'first-again' }, { part_number: 2, etag: 'tail' },
  ] }));
  const result = await uploadParts(new Blob(['1234567']), { part_size: 5, parts: [parts[1]!],
    completed_parts: [{ part_number: 1, etag: 'first' }, { part_number: 1, etag: 'first' }] }, undefined, refresh, bytes => observed.push(bytes));
  expect(result).toHaveLength(2); expect(observed).toEqual([5, 7]); expect(refresh).toHaveBeenCalledTimes(1);
});
it('late_put_after_abort_cannot_report_confirmed_bytes', async () => {
  let release!: (response: Response) => void;
  vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(resolve => { release = resolve; })));
  const controller = new AbortController(), observed: number[] = [];
  const upload = uploadParts(new Blob(['123']), { part_size: 5, parts: [parts[0]!] }, controller.signal, undefined, n => observed.push(n));
  const rejected = expect(upload).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort(); release(new Response('', { headers: { ETag: 'late' } })); await rejected;
  expect(observed).toEqual([0]);
});
it('late_refresh_after_abort_cannot_report_or_upload', async () => {
  let release!: (upload: {part_size: number; parts: never[]; completed_parts: {part_number: number; etag: string}[]}) => void;
  const fetcher = vi.fn(async () => new Response('', { status: 403 })); vi.stubGlobal('fetch', fetcher);
  const refresh = vi.fn(() => new Promise<{part_size: number; parts: never[]; completed_parts: {part_number: number; etag: string}[]}>(resolve => { release = resolve; }));
  const controller = new AbortController(), observed: number[] = [];
  const upload = uploadParts(new Blob(['123']), { part_size: 5, parts: [parts[0]!] }, controller.signal, refresh, n => observed.push(n));
  const rejected = expect(upload).rejects.toMatchObject({ name: 'AbortError' });
  await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1)); controller.abort();
  release({ part_size: 5, parts: [], completed_parts: [{ part_number: 1, etag: 'late' }] }); await rejected;
  expect(observed).toEqual([0]); expect(fetcher).toHaveBeenCalledTimes(1);
});
