import { expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { buildFilterChain, renderClip } from '../apps/worker/src/render/ffmpeg';
import { CTA_PADDING_X, CTA_PADDING_Y, ctaZone, layoutCta, prepareCta } from '../apps/worker/src/render/cta-overlay';
import { watermarkGeometry } from '../apps/worker/src/render/watermark';
import { CTA_FRAME_LABELS } from '../packages/shared/src/cta';
// Фича 27b clip-cta: надпись призыва по НАСТОЯЩИМ пикселям ffmpeg — есть в финальном окне, нет до него и при none,
// не заходит ни на метку, ни на полосу субтитров. Образец — tests/teaser-media.test.ts.
const exec = promisify(execFile);
const version = await exec('ffmpeg', ['-version'], { encoding: 'utf8' }).then(r => r.stdout.match(/ffmpeg version (\d+)\.(\d+)/), () => null);
const supported = !!version && Number(version[1]) >= 6;
if (!supported) console.error('НЕ ВЫПОЛНЕН: ffmpeg < 6 или отсутствует — cta media; требуется полный прогон в образе 8.1');
it.skipIf(!supported)('надпись призыва: финальное окно, none без надписи, текст в плашке, метка и субтитры не задеты', async () => {
  const dir = await mkdtemp('/tmp/cta-media-');
  const origin = 'https://clipmkr.ru', code = 'WWWWWW', duration = 4;
  const mean = (b: Buffer) => { expect(b.length).toBeGreaterThan(0); return b.reduce((s, v) => s + v, 0) / b.length; };
  try {
    const on = prepareCta('watch_full', 1080, 1920, duration, false, true)!;
    expect(on.result.start_seconds).toBe(1.5);
    const none = prepareCta('none', 1080, 1920, duration, false, true);
    const variants: Record<string, string | undefined> = {
      off: undefined, none: none?.filter, on: on.filter,
      plate: on.filter.split(',drawtext=')[0], // та же плашка без текста — доказывает, что текст отрисован
    };
    for (const [name, cta] of Object.entries(variants)) {
      const filter = buildFilterChain('portrait', null, true, origin, code, undefined, undefined, undefined, undefined, undefined, cta);
      await exec('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `color=c=white:s=1080x1920:r=25:d=${duration}`,
        '-vf', filter, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', `${dir}/${name}.mp4`], { timeout: 120000 });
    }
    const frame = async (name: string, t: number, crop: string) => (await exec('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', `${dir}/${name}.mp4`,
      '-frames:v', '1', '-vf', crop, '-pix_fmt', 'gray', '-f', 'rawvideo', '-'], { encoding: 'buffer', maxBuffer: 4_000_000 })).stdout;
    const delta = async (a: string, b: string, t: number, crop: string) => Math.abs(mean(await frame(a, t, crop)) - mean(await frame(b, t, crop)));
    const layout = layoutCta(CTA_FRAME_LABELS.watch_full, 1080, ctaZone(1920))!;
    const plateCrop = `crop=${layout.plateWidth}:${layout.plateHeight}:${layout.x}:${layout.y}`;
    const textCrop = `crop=${layout.textWidth}:${layout.plateHeight - 2 * CTA_PADDING_Y}:${layout.x + CTA_PADDING_X}:${layout.y + CTA_PADDING_Y}`;
    const zone = ctaZone(1920), g = watermarkGeometry(1080, 1920, origin, code);
    const above = `crop=1080:${zone.top}:0:0`, mark = `crop=${g.plateWidth}:${g.plateHeight}:${g.left}:${g.y}`;
    const result = {
      before: await delta('on', 'off', 1, plateCrop), final: await delta('on', 'off', 3, plateCrop),
      none: await delta('none', 'off', 3, plateCrop), text: await delta('on', 'plate', 3, textCrop),
      above: await delta('on', 'off', 3, above), watermark: await delta('on', 'off', 3, mark),
    };
    console.log(JSON.stringify({ event: 'cta_pixel_delta', ...result }));
    expect(result.before).toBeLessThan(1);      // до окна — кадр как без призыва
    expect(result.final).toBeGreaterThan(5);    // в окне — плашка видна
    expect(result.none).toBeLessThan(1);        // none — ни пикселя
    expect(result.text).toBeGreaterThan(1);     // внутри плашки есть текст, а не пустой прямоугольник
    expect(result.above).toBeLessThan(1);       // выше полосы (субтитры и кадр) не задето
    expect(result.watermark).toBeLessThan(1);   // метка не перекрыта
  } finally { await rm(dir, { recursive: true, force: true }); }
}, 180000);

it.skipIf(!supported).each([false, true])('адрес подписки виден в MP4 только в финале, watermark=%s', async watermark => {
  const directory = await mkdtemp('/tmp/cta-address-media-');
  const address = 'https://t.me/demo_channel';
  try {
    const input = join(directory, 'source.wav');
    await exec('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=20', input]);
    const output = join(directory, 'subscribe.mp4');
    const outcome = await renderClip({ inputPath: input, outputPath: output, startTime: 0, endTime: 20, cutPlan: [[0, 2], [18, 20]],
      format: 'portrait', words: [], watermark, origin: 'https://clipmkr.ru', code: 'WWWWWW', cta: 'subscribe', ctaUrl: address });
    expect(outcome.cta?.text).toBe(address);
    const layout = layoutCta(address, 1080, ctaZone(1920))!;
    const crop = `crop=${layout.textWidth}:${layout.plateHeight - 2 * CTA_PADDING_Y}:${layout.x + CTA_PADDING_X}:${layout.y + CTA_PADDING_Y}`;
    const frame = async (t: number) => (await exec('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', output,
      '-frames:v', '1', '-vf', `format=gray,${crop}`, '-f', 'rawvideo', '-'], { encoding: 'buffer' })).stdout;
    const before = await frame(1), after = await frame(3);
    expect(before.length).toBeGreaterThan(0);
    expect(after.length).toBe(before.length);
    expect(before.every(pixel => pixel < 100)).toBe(true);
    expect(after.filter(pixel => pixel > 220).length).toBeGreaterThan(100);
  } finally { await rm(directory, { recursive: true, force: true }); }
}, 90000);
