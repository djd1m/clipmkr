import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { createServer, type Server } from 'node:http';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chromium, type Browser } from 'playwright';
import { ClipCard } from '../../apps/web/src/app/clips/ClipCard';
import type { ClipScreen } from '../../apps/web/src/lib/screen-contract';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }) }));

const clip: ClipScreen = { clip_id: '00000000-0000-4000-8000-000000000001', index: 1, start: 0, end: 10,
  title: 'Тестовый клип', status: 'done', watermarked: false, expires_at: null, available: true };
const media = readFileSync('tests/artifacts/render-and-watermark/clip.mp4');
const poster = readFileSync('tests/artifacts/render-and-watermark/thumb.jpg');
const css = readFileSync('apps/web/src/app/globals.css', 'utf8');
let server: Server, browser: Browser, base: string;
beforeAll(async () => {
  const html = `<!doctype html><html lang="ru"><head><style>${css}</style></head><body><main class="container"><div class="clip-grid">${renderToStaticMarkup(createElement(ClipCard, { clip }))}</div></main></body></html>`;
  server = createServer((req, res) => {
    if (req.url === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(html); return; }
    if (req.url?.includes('/thumbnail?')) { res.writeHead(200, { 'content-type': 'image/jpeg', 'content-length': poster.length }).end(poster); return; }
    if (req.url?.includes('/file?')) {
      const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
      const start = range ? Number(range[1]) : 0, end = range?.[2] ? Math.min(Number(range[2]), media.length - 1) : media.length - 1;
      res.writeHead(range ? 206 : 200, { 'content-type': 'video/mp4', 'accept-ranges': 'bytes', 'content-length': end - start + 1,
        ...(range ? { 'content-range': `bytes ${start}-${end}/${media.length}` } : {}) }).end(media.subarray(start, end + 1));
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('no loopback port');
  base = `http://127.0.0.1:${address.port}`; browser = await chromium.launch();
});
afterAll(async () => { await browser?.close(); if (server) await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); });

it('native center click plays a clip after metadata loads', async () => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const thumbnail = page.waitForResponse(response => response.url().includes('/thumbnail?'));
    await page.goto(base);
    const response = await thumbnail;
    expect(response.status()).toBe(200);
    expect(await page.evaluate(async () => {
      const image = new Image(); image.src = document.querySelector('video')!.poster;
      await image.decode(); return image.complete && image.naturalWidth > 0;
    })).toBe(true);
    const video = page.locator('video');
    await page.waitForFunction(() => (document.querySelector('video')?.readyState ?? 0) >= 1, null, { timeout: 3000 }).catch(() => {});
    const readyBeforeClick = await video.evaluate((el: HTMLVideoElement) => el.readyState);
    const box = await video.boundingBox(); if (!box) throw new Error('video is not visible');
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => ({ paused: el.paused, time: el.currentTime })), { timeout: 5000 })
      .toMatchObject({ paused: false });
    await expect.poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime), { timeout: 5000 }).toBeGreaterThan(0.1);
    expect(readyBeforeClick).toBeGreaterThanOrEqual(1);
  } finally { await page.close(); }
});
