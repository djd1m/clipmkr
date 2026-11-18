import { afterEach, expect, it, vi } from 'vitest';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import type { renderClip } from '../apps/worker/src/render/ffmpeg';
import { prepareCta } from '../apps/worker/src/render/cta-overlay';
const db = vi.hoisted(() => ({ getRenderInput: vi.fn(), setRenderDeferred: vi.fn(), retryRender: vi.fn(), publishRenderResult: vi.fn() }));
vi.mock('@clipmaker/db', () => db);
import { handleRenderJob } from '../apps/worker/src/workers/render';
// Фича 27b clip-cta: воркер берёт вид призыва ИЗ БАЗЫ (getRenderInput), передаёт его рендеру, а контракт
// объекта связывает надпись; без призыва контракт побайтово равен эталону до фичи.
afterEach(() => { vi.restoreAllMocks(); });
it('адрес подписки приходит из базы, статические hash прежние, динамические зависят от надписи', async () => {
  const seen: unknown[] = [], hashes: string[] = [], keys: string[] = [];
  const directory = await mkdtemp('/tmp/cta-worker-');
  const input: Record<string, unknown> = { index: 1, object_key: 'source', actual_bytes: '10', plan: 'free', start_seconds: '0', end_seconds: '20',
    words: [], code: 'AB23456789', music: false, teaser: false, title: 'Клип', render_version: 1 };
  db.getRenderInput.mockImplementation(async () => ({ ...input })); db.setRenderDeferred.mockResolvedValue(true);
  db.publishRenderResult.mockImplementation(async (_p, _a, _r, publish) => { await publish(); return true; });
  const deps = { pool: {} as never, directory, origin: 'https://clipmaker.aicoding.space',
    download: async (_k: string, p: string) => { await writeFile(p, 'source'); },
    render: async (opts: Parameters<typeof renderClip>[0]) => {
      seen.push([opts.cta, opts.ctaUrl]); await writeFile(opts.outputPath, 'video');
      const cta = prepareCta(opts.cta, 1080, 1920, 20, false, opts.watermark,
        undefined, undefined, { url: opts.ctaUrl, textFile: 'cta.txt' });
      return { duration_seconds: 20, music: null, packshot: null, teaser: null,
        cta: cta?.result ?? null };
    },
    thumbnail: async (_p: string, o: string) => { await writeFile(o, 'thumb'); },
    storage: { delete: vi.fn(async () => {}), put: async (key: string, _p: string, _t: string, contract: string) => {
      keys.push(key); hashes.push(contract); return 5;
    } },
    enqueue: async () => {}, available: async () => 30n };
  const attempt = { video_id: 'video', clip_id: 'clip', fence: 4, stage: 'render' as const, series_no: 1, attempt_no: 1, status: 'running' as const };
  try {
    const baseline = JSON.parse(await readFile('tests/fixtures/music-bed/baseline.json', 'utf8')).contract;
    const cases = [['none', null], ['watch_full', null], ['subscribe', 'https://t.me/alpha?source=clip'],
      ['subscribe', 'https://t.me/alpha'], ['subscribe', 'https://t.me/bravo'], ['subscribe', 'https://T.ME/alpha']] as const;
    for (const [kind, address] of cases) {
      input.cta_kind = kind;
      input.cta_url = address;
      expect(await handleRenderJob(attempt, deps)).toBe('done');
    }
    expect(seen).toEqual(cases);
    expect(hashes[0]).toBe(baseline);
    // Хеши старого контракта v1 для watch_full и статического subscribe на этой же фикстуре.
    expect(hashes[2]).toBe('210798d19d318db484e58d0c248b82823e7f4a1fd3ec6f6522a6e64e555e6e8a');
    expect(hashes[4]).toBe('f55c795bb74eba4b838a18e6e3f24e805dd6aa7915d11ccbb1190f41343faa9a');
    expect(hashes[6]).not.toBe(hashes[4]);
    expect(hashes[6]).not.toBe(hashes[8]);
    expect(hashes[6]).toBe(hashes[10]);
    expect(new Set(keys)).toEqual(new Set(['clips/free/video/clip.mp4', 'thumbs/video/clip.jpg']));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
