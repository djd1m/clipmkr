const { chromium } = require('/home/clipmkr/node_modules/playwright');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const directory = __dirname;
const html = path.resolve(directory, '../states.html');
const states = ['incomplete', 'missing', 'loading', 'error', 'unsupported', 'audio'];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const rows = [], errors = [], externalRequests = [];
  try {
    for (const width of [390, 1440]) for (const theme of ['dark', 'light']) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, deviceScaleFactor: 1 });
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/^https?:/i.test(request.url())) externalRequests.push(request.url()); });
      for (const state of states) {
        await page.goto(`${pathToFileURL(html).href}?state=${state}&theme=${theme}`);
        await page.locator('#demo-state').selectOption(state);
        if (state === 'audio') await page.locator('#native-audio').evaluate(node => node.readyState >= 1 ? null : new Promise(resolve => node.addEventListener('loadedmetadata', resolve, { once: true })));
        const geometry = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth,
          shortControls: [...document.querySelectorAll('button, select')].filter(node => node.getClientRects().length && node.getBoundingClientRect().height < 44).map(node => node.id || node.textContent),
          videos: document.querySelectorAll('video').length,
          audios: document.querySelectorAll('audio').length,
          autoplay: [...document.querySelectorAll('video,audio')].some(node => node.autoplay),
        }));
        assert.equal(geometry.overflow, false, `${width}/${theme}/${state}: overflow`);
        assert.deepEqual(geometry.shortControls, [], `${width}/${theme}/${state}: controls <44px`);
        assert.equal(geometry.videos, 1);
        assert.equal(geometry.audios, 1);
        assert.equal(geometry.autoplay, false);
        const screenshot = `${state}-${theme}-${width}.png`;
        await page.screenshot({ path: path.join(directory, screenshot), fullPage: true });
        if (['audio', 'unsupported'].includes(state)) {
          assert.equal(await page.locator('#return').isVisible(), true);
          assert.equal(await page.locator('#download').isVisible(), true);
          assert.equal(await page.locator(state === 'audio' ? '#native-audio' : '#unsupported').isVisible(), true);
          assert.equal(await page.locator('#native-video').isVisible(), false);
          await page.locator('.clip').nth(1).click();
          assert.equal(await page.locator('#viewer-title').textContent(), 'Почему важен контекст');
          await page.locator('#watch').click();
          assert.equal(await page.locator('#return').evaluate(node => node === document.activeElement), true);
          await page.locator('#return').click();
          assert.equal(await page.locator('#viewer-title').textContent(), 'Почему важен контекст');
          assert.equal(await page.locator('#watch').evaluate(node => node === document.activeElement), true);
          assert.equal(await page.locator('#native-audio').evaluate(node => node.paused), true);
          await page.locator('#download').click();
          assert.equal(await page.locator('#download-note').isVisible(), true);
        } else {
          assert.equal(await page.locator('#watch').isVisible(), false);
          assert.equal(await page.locator('#download').isVisible(), false);
          assert.equal(await page.locator('#native-video').isVisible(), true);
          assert.equal(await page.locator('#viewer-title').textContent(), 'Как найти главную мысль');
          if (state === 'error') {
            await page.locator('#retry').click();
            assert.equal(await page.locator('#source-status').textContent(), 'Проверяем исходник…');
            assert.equal(await page.locator('#retry').isVisible(), false);
          }
        }
        rows.push({ width, theme, state, screenshot, overflow: false, controlsMinHeight: 44, interactions: 'pass' });
      }
      await page.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    const digest = filename => crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    const files = [html, __filename, ...rows.map(row => path.join(directory, row.screenshot))];
    const result = { status: 'pass', scope: 'synthetic HTML UI only; not app/S3/codec playback', browser: await browser.version(), cases: rows, pageErrors: errors, externalRequests, hashes: files.map(filename => ({ path: path.relative(path.resolve(directory, '../../../..'), filename), sha256: digest(filename) })) };
    fs.writeFileSync(path.join(directory, 'probe-result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(JSON.stringify({ status: result.status, cases: rows.length, pageErrors: errors.length, externalRequests: externalRequests.length, htmlSha256: digest(html) }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
