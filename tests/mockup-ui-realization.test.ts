import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CREDIT_SKUS, formatRubles } from '../packages/shared/src/tariff';
import { UpgradeScreen } from '../apps/web/src/app/upgrade/UpgradeScreen';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {}, push() {} }) }));
const source = readFileSync('scripts/check-mockup-ui-realization.mjs', 'utf8');
function oracle(name: string) {
  const body = source.match(new RegExp(`function ${name}\\([^]*?\\n}`))?.[0];
  if (!body) throw new Error(`Missing real runner oracle ${name}`);
  return runInNewContext(`(${body})`, { assert });
}
const rect = (left: number, top: number, width = 200, height = 300) => ({ left, right: left + width, top, bottom: top + height, width, height });
const windows = { asOf: '2026-11-05T00:00:00Z', baseStart: '2026-11-05T00:00:00Z', baseEnd: '2026-12-05T00:00:00Z', addonStart: '2026-11-05T00:00:00Z', addonEnd: '2026-12-05T00:00:00Z', scheduled: false };
const props = { creditMode: true, salesEnabled: true, purchaseWindows: windows, title: 'Про', price: '990 ₽', days: 30, paidMinutes: 270, current: { plan: 'free' as const, plan_source: 'default', plan_paid_until: null } };

it('reference bytes remain pinned, not regenerated to fit the app', () => {
  for (const [path, sha] of [['docs/design/2026-11-04-style-directions.html', '9ea8f63f7dc66bb46a63276177f8033c9463e644b53e4b9e15d065ed49659106'], ['docs/design/2026-11-04-mockup.html', '6f45ee0a6175ce1cb6bc46162dd2521fd3ee3698556eae53664967fbc147e299']]) {
    expect(createHash('sha256').update(readFileSync(path!)).digest('hex')).toBe(sha);
  }
});
it('stage_origin_manifest_rejects_wrong_target', () => {
  const check = oracle('stageOriginManifest');
  const fixture = { actualHttpsOrigin: 'https://clipmkr.ru', composeProject: 'n5-clipmaker', serverIp: '194.85.249.105', webContainer: 'n5-clipmaker-web-1' };
  expect(check(fixture, fixture.actualHttpsOrigin)).toBe(true);
  for (const change of [{ actualHttpsOrigin: 'https://n5.clipmkr.ru' }, { serverIp: '77.83.87.178' }, { composeProject: 'clipmkr-stage-20261028' }, { webContainer: 'other-web-1' }]) expect(check({ ...fixture, ...change }, fixture.actualHttpsOrigin)).toBe(false);
  expect(check(fixture, 'http://clipmkr.ru')).toBe(false);
});
it('published runner missing required private evidence exits 2', () => {
  const result = spawnSync(process.execPath, ['scripts/check-mockup-ui-realization.mjs', '--mode', 'published', '--base', 'https://clipmkr.ru', '--fixture', '/nonexistent/clipmkr.private.json', '--out', '/nonexistent/out'], { encoding: 'utf8' });
  expect(result.status).toBe(2);
});
it('named geometry rejects the legacy bodies independently for all three screens', () => {
  const check = oracle('assertGeometry');
  const upload = { main: [rect(0, 0)], recent: [rect(0, 320)], aside: [rect(250, 0)] };
  check(upload, 'workspace', 'upload', 1440);
  expect(() => check({ ...upload, aside: [rect(0, 650)] }, 'workspace', 'upload', 1440)).toThrow();
  const ready = { selected: [rect(0, 0, 600)], poster: [rect(0, 0, 180, 320)], list: [rect(650, 0)] };
  check(ready, 'workspace', 'ready', 1440);
  expect(() => check({ ...ready, list: [rect(0, 350)] }, 'workspace', 'ready', 1440)).toThrow();
  const plans = { rows: [rect(0, 0), rect(210, 0), rect(420, 0)] };
  check(plans, 'workspace', 'plans', 1440);
  expect(() => check({ rows: [rect(0, 0), rect(0, 310), rect(0, 620)] }, 'workspace', 'plans', 1440)).toThrow();
});
it.each([[320, 278], [390, 309.375], [607, 309.375], [608, 309.375]])('approved mobile Cabinet poster at %ipx may exceed 16rem while keeping ratio and order', (width, posterWidth) => {
  const check = oracle('assertGeometry');
  // Original CSS277: the 1000px-tall viewport permits a 550px-tall mobile poster.
  const poster = rect(21, 125, posterWidth, posterWidth * 16 / 9);
  const selected = rect(21, 100, width - 42, poster.height + 200);
  const ready = { selected: [selected], poster: [poster], list: [rect(21, selected.bottom + 16, width - 42)] };
  expect(() => check(ready, 'workspace', 'ready', width)).not.toThrow();
  expect(() => check({ ...ready, poster: [rect(21, 125, posterWidth, posterWidth)] }, 'workspace', 'ready', width)).toThrow(/poster 9:16/);
  expect(() => check({ ...ready, list: [rect(21, selected.bottom - 10)] }, 'workspace', 'ready', width)).toThrow(/fragment list follows player/);
});
it.each([609, 672, 768, 832, 833, 1024, 1440])('Cabinet poster ceiling remains 16rem plus 2px above the mobile breakpoint at %ipx', width => {
  const check = oracle('assertGeometry');
  const selected = rect(0, 0, 600, 600), list = width > 832 ? rect(650, 0) : rect(0, 620);
  for (const posterWidth of [256, 258]) {
    check({ selected: [selected], poster: [rect(0, 0, posterWidth, posterWidth * 16 / 9)], list: [list] }, 'workspace', 'ready', width);
  }
  expect(() => check({ selected: [selected], poster: [rect(0, 0, 259, 259 * 16 / 9)], list: [list] }, 'workspace', 'ready', width)).toThrow(/poster max 16rem/);
});
it('remounted or constant-time player never satisfies actual playback oracle', () => {
  const check = oracle('assertPlayerSnapshot'), before = { src: '/real.mp4?v=1', time: 1 };
  const actual = { same: true, src: before.src, time: 1.2, paused: false };
  check(actual, before);
  for (const patch of [{ same: false }, { time: 1 }, { time: NaN }, { paused: true }, { src: '/real.mp4?v=2' }]) expect(() => check({ ...actual, ...patch }, before)).toThrow();
});
describe('actual offers, no mockup prices or invented eligibility', () => {
  it('one keyed offer per actual SKU, prices/credits/term/conditions are adjacent', () => {
    const html = renderToStaticMarkup(createElement(UpgradeScreen, props));
    for (const [sku, offer] of Object.entries(CREDIT_SKUS)) {
      expect(html).toContain(`data-sku="${sku}"`); expect(html).toContain(formatRubles(offer.priceMinor));
      expect(html).toContain(`<h2>${offer.title}</h2>`); expect(html).toContain(`<dd>${offer.credits} кредитов</dd>`);
    }
    expect(html.match(/data-sku=/g)).toHaveLength(3); expect(html.match(/data-state="prospective-period"/g)).toHaveLength(3);
    expect(html).not.toContain('ОФЛАЙН'); expect(html).not.toContain('TEST');
    expect(renderToStaticMarkup(createElement(UpgradeScreen, { ...props, testMode: true }))).toContain('TEST · Тестовая оплата');
  });
  it.each([{ ownerUnlimited: true }, { catalogOnly: true }, { salesEnabled: false }, { purchaseWindows: undefined }])('disabled reason beside every CTA: %j', patch => {
    const html = renderToStaticMarkup(createElement(UpgradeScreen, { ...props, ...patch }));
    expect(html.match(/aria-describedby="offer-reason-/g)).toHaveLength(3);
    expect(html.match(/disabled=""/g)).toHaveLength(3);
  });
});
