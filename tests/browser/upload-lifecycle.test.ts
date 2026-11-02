import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createServer, type ViteDevServer } from 'vite';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { chromium, webkit, type Browser, type Page } from 'playwright';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { domRules } from '../../scripts/responsive/rules.mjs';
import { VideoUploader } from '../../apps/web/src/app/upload/Uploader';

// Only the Next host router is replaced; React hooks, hydration and upload transport are real.
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
const videoId = '11111111-1111-4111-8111-111111111111';
const entry = '\0upload-lifecycle-entry';
const navigation = '\0upload-lifecycle-navigation';
const cacheDirectory = mkdtempSync(join(tmpdir(), 'clipmkr-upload-vite-'));
let server: ViteDevServer;
let origin: string;

beforeAll(async () => {
  const markup = renderToString(createElement(VideoUploader));
  server = await createServer({
    configFile: false, cacheDir: cacheDirectory, root: process.cwd(), esbuild: { jsx: 'automatic' },
    optimizeDeps: { include: ['react', 'react-dom', 'react-dom/client', 'react/jsx-dev-runtime'], exclude: ['next/navigation'] },
    resolve: { alias: {
      '@clipmaker/shared/enums': resolve('packages/shared/src/enums.ts'),
      '@clipmaker/shared/upload': resolve('packages/shared/src/upload.ts'),
      '@clipmaker/shared/cta': resolve('packages/shared/src/cta.ts'),
    } },
    server: { host: '127.0.0.1', port: 0 },
    plugins: [{ name: 'upload-lifecycle-fixture', enforce: 'pre',
      resolveId(id) { if (id === 'next/navigation') return navigation; if (id === entry) return entry; },
      load(id) {
        if (id === navigation) return `export const useRouter = () => ({
          push: path => window.uploadNavigations.push(path), refresh() {}
        });`;
        if (id === entry) return `import { createElement } from 'react';
          import { hydrateRoot } from 'react-dom/client';
          import { VideoUploader } from '/apps/web/src/app/upload/Uploader.tsx';
          window.uploadNavigations = [];
          hydrateRoot(document.getElementById('upload-root'), createElement(VideoUploader));`;
      },
      configureServer(vite) {
        vite.middlewares.use('/fixture.html', async (_req, res) => {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(await vite.transformIndexHtml('/fixture.html', `<!doctype html><html lang="ru" data-theme="dark">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
            <link rel="stylesheet" href="/apps/web/src/app/globals.css"></head>
            <body><main class="container"><div id="upload-root">${markup}</div></main>
            <script type="module" src="/@id/__x00__upload-lifecycle-entry"></script></body></html>`));
        });
      },
    }],
  });
  await server.listen();
  const address = server.httpServer?.address();
  if (!address || typeof address === 'string') throw new Error('Vite не открыл локальный порт');
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => { await server?.close(); rmSync(cacheDirectory, {recursive:true,force:true}); });

async function navigations(page: Page) {
  return page.evaluate(() => (window as Window & { uploadNavigations?: string[] }).uploadNavigations);
}
async function fixture(browser: Browser, completeStatus: 202 | 503, run: (page: Page, control: {
  release: () => void; puts: () => number; completes: () => number;
}) => Promise<void>) {
  const context = await browser.newContext();
  const page = await context.newPage();
  let release!: () => void;
  const gate = new Promise<void>(resolveGate => { release = resolveGate; });
  let puts = 0, completes = 0;
  await page.route('**/api/trpc/video.create', route => route.fulfill({ json: { result: { data: { data: {
    video_id: videoId, part_size: 4,
    parts: [1, 2].map(part_number => ({ part_number, url: `${origin}/fixture-part/${part_number}`,
      expires_at: new Date(Date.now() + 60_000).toISOString() })),
  } } } } }));
  await page.route('**/fixture-part/*', async route => {
    const part = new URL(route.request().url()).pathname.split('/').at(-1);
    puts++; await gate;
    await route.fulfill({ status: 200, headers: { etag: `"part-${part}"` } });
  });
  await page.route('**/api/upload/complete', async route => {
    completes++;
    expect(route.request().postDataJSON()).toMatchObject({ video_id: videoId,
      parts: [{ part_number: 1 }, { part_number: 2 }] });
    await route.fulfill({ status: completeStatus, json: completeStatus === 202
      ? { data: { video_id: videoId } } : { error: { message: 'Завершение временно недоступно' } } });
  });
  try {
    await page.goto(`${origin}/fixture.html`);
    await page.waitForFunction(() => Array.isArray((window as Window & { uploadNavigations?: string[] }).uploadNavigations));
    await page.locator('#source-file').setInputFiles({ name: 'fixture.mp4', mimeType: 'video/mp4', buffer: Buffer.from('12345678') });
    await page.getByRole('button', { name: 'Создать клипы →' }).click();
    await expect.poll(() => puts).toBe(2);
    await expect.poll(() => page.getByRole('status').textContent()).toBe('Отправляем файл в хранилище…');
    await run(page, { release, puts: () => puts, completes: () => completes });
  } finally { release(); await context.close(); }
}

for (const [name, engine] of Object.entries({ chromium, webkit })) describe(`жизненный цикл загрузки ${name}`, () => {
  let browser: Browser;
  beforeAll(async () => { browser = await engine.launch(); });
  afterAll(async () => { await browser?.close(); });

  it('при задержанном PUT идентификатор виден, но ранней ссылки и перехода нет', async () => {
    await fixture(browser, 202, async (page, control) => {
      expect(await page.locator('.video-id').textContent()).toContain(videoId);
      expect(await page.locator(`a[href="/dashboard/videos/${videoId}"]`).count()).toBe(0);
      expect(await navigations(page)).toEqual([]);
      expect(control.completes()).toBe(0);
      mkdirSync('tests/artifacts/upload-lifecycle', { recursive: true });
      for (const theme of ['dark', 'light']) for (const width of [320, 375, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        await page.locator('html').evaluate((html, value) => { html.dataset.theme = value; }, theme);
        expect((await domRules(page, ['R1', 'R2', 'R5'])).filter((finding: { severity: string }) => finding.severity === 'error')).toEqual([]);
        await page.screenshot({ path: `tests/artifacts/upload-lifecycle/${name}-${theme}-${width}.png`, fullPage: true });
      }
    });
  });

  it('после всех PUT и complete 202 переходит ровно один раз и удаляет resume', async () => {
    await fixture(browser, 202, async (page, control) => {
      expect(control.completes()).toBe(0);
      expect(await navigations(page)).toEqual([]);
      control.release();
      await expect.poll(() => navigations(page)).toEqual([`/dashboard/videos/${videoId}`]);
      expect(control.puts()).toBe(2);
      expect(control.completes()).toBe(1);
      expect(await page.evaluate(() => sessionStorage.getItem('n5-upload-resume'))).toBeNull();
    });
  });

  it('complete 503 оставляет данные продолжения, ошибку и отсутствие перехода', async () => {
    await fixture(browser, 503, async (page, control) => {
      const saved = await page.evaluate(() => JSON.parse(sessionStorage.getItem('n5-upload-resume')!));
      control.release();
      await expect.poll(() => page.getByRole('status').textContent()).toBe('Завершение временно недоступно');
      expect(await navigations(page)).toEqual([]);
      expect(control.completes()).toBe(1);
      const retained = await page.evaluate(() => JSON.parse(sessionStorage.getItem('n5-upload-resume')!));
      expect(retained).toMatchObject({ key: saved.key, fingerprint: saved.fingerprint, videoId,
        parts: [{ part_number: 1 }, { part_number: 2 }] });
      expect(await page.getByRole('button', { name: 'Начать / продолжить загрузку' }).isEnabled()).toBe(true);
    });
  });
});
