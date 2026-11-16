import { expect, it } from 'vitest';
import { parseScreenFaceLayout, planScreenLayout, type ScreenFaceLayoutV1 } from '@clipmaker/shared/screen-layout';
import { parseCutPlan, planDuration, mapTime, mapOutputTime, COMPACT_FPS, COMPACT_XFADE_SECONDS } from '@clipmaker/shared/cut-timeline';
import * as legacy from '../apps/worker/src/render/compaction';
import { buildScreenLayoutGraph } from '../apps/worker/src/render/screen-layout';

const whole = { x: 0, y: 0, width: 1, height: 1 };
const layout = (variant: ScreenFaceLayoutV1['variant'] = '03'): ScreenFaceLayoutV1 => ({
  version: 1, mode: 'screen-face', variant, screen: whole, focus: null,
  camera: { x: .75, y: 0, width: .25, height: .25 },
});
const overlaps = (a: typeof whole, b: typeof whole) => a.x < b.x + b.width && b.x < a.x + a.width
  && a.y < b.y + b.height && b.y < a.y + a.height;

it('closed layout validation rejects coercion, malformed ROI and focus outside screen', () => {
  for (const bad of [null, [], {}, { ...layout(), extra: 1 }, { ...layout(), version: '1' },
    { ...layout(), mode: 'podcast' }, { ...layout(), variant: '04' },
    ...[NaN, Infinity, '0', null, -1, 1].map(x => ({ ...layout(), screen: { ...whole, x } })),
    { ...layout(), screen: { ...whole, width: 0 } }, { ...layout(), screen: { ...whole, width: 1.0000001 } },
    { ...layout(), screen: { ...whole, extra: 0 } }, { ...layout(), camera: { ...whole, x: .5 } },
    { ...layout(), screen: { ...whole, width: .5 }, focus: whole },
  ]) expect(() => parseScreenFaceLayout(bad)).toThrow();
  const canonical = parseScreenFaceLayout({ ...layout(), camera: { x: .1000001, y: .1, width: .2, height: .2 } });
  expect(canonical.camera?.x).toBe(.1);
  expect(parseScreenFaceLayout(canonical)).toEqual(canonical);
});

it('canonical serialization fixes nested key order before equality or hashing', () => {
  const ordered = { x: .1, y: .2, width: .3, height: .4 };
  const reversed = { height: .4, width: .3, y: .2, x: .1 };
  const a = parseScreenFaceLayout({ ...layout(), screen: whole, focus: ordered, camera: ordered });
  const b = parseScreenFaceLayout({ camera: reversed, focus: reversed,
    screen: { height: 1, width: 1, y: 0, x: 0 }, variant: '03', mode: 'screen-face', version: 1 });
  expect(JSON.stringify(b)).toBe(JSON.stringify(a));
});

it('tiny narrow focus preserves one context scale instead of amplifying focus raster rounding', () => {
  for (const width of [.005, .000001]) {
    const g = planScreenLayout({ ...layout(), focus: { x: 0, y: 0, width, height: 1 } },
      { width: 1920, height: 1080 }, false);
    const { source: s, destination: d } = g.screen;
    // A <2px final raster error is allowed; a 19% squeeze of the entire context is not.
    expect(Math.abs(d.width - s.width * d.height / s.height)).toBeLessThanOrEqual(2);
  }
});

it('1923x1081 .999999 edge stays valid JSON but uses explicit safe fallback when no even crop fits the 2px bound', () => {
  const edge = { x: .999999, y: .999999, width: .000001, height: .000001 };
  const chosen = { ...layout(), camera: edge };
  expect(parseScreenFaceLayout(chosen).camera).toEqual(edge); // Schema is unchanged.
  const g = planScreenLayout(chosen, { width: 1923, height: 1081 }, true);
  expect(g.camera).toBeNull(); expect(g.cameraReason).toBe('camera_unavailable');
  expect(g.screen.source).toEqual({ x: 0, y: 0, width: 1922, height: 1080 });
  for (const value of [{ ...layout(), focus: edge }, { ...layout(), screen: edge }]) {
    const fallback = planScreenLayout(value, { width: 1923, height: 1081 }, true);
    expect(fallback.reason).toBe('unsupported_geometry'); expect(fallback.camera).toBeNull();
    expect(fallback.screen.source).toEqual({ x: 0, y: 0, width: 1922, height: 1080 });
  }
});

it.each(['01', '02'] as const)('%s ignores unused unrepresentable focus and preserves the same camera and pane as focus=null', variant => {
  const source = { width: 1923, height: 1081 };
  const pristine = { ...layout(variant), focus: null };
  const expected = planScreenLayout(pristine, source, true);
  expect(expected.camera).not.toBeNull();
  const chosen = { ...pristine, focus: { x: .999999, y: .999999, width: .000001, height: .000001 } };
  expect(planScreenLayout(chosen, source, true)).toEqual(expected);
});

it.each([[1816, 968], [1923, 1081], [968, 1816], [2, 2]])('canonical even crops bound source %ix%i', (width, height) => {
  const g = planScreenLayout(layout('02'), { width, height }, true);
  for (const p of [g.screen, g.camera!]) {
    for (const n of Object.values(p.source)) expect(n % 2).toBe(0);
    expect(p.source.width).toBeGreaterThanOrEqual(2); expect(p.source.height).toBeGreaterThanOrEqual(2);
    expect(p.source.x + p.source.width).toBeLessThanOrEqual(width);
    expect(p.source.y + p.source.height).toBeLessThanOrEqual(height);
  }
  expect(width - g.screen.source.width).toBeLessThanOrEqual(1);
  expect(height - g.screen.source.height).toBeLessThanOrEqual(1);
});

it('rounds ROI outward and keeps the last odd source edge within the declared one pixel loss', () => {
  const g = planScreenLayout({ ...layout('02'), camera: { x: .101, y: .101, width: .2, height: .2 } }, { width: 1000, height: 1000 }, true);
  expect(g.camera!.source).toEqual({ x: 100, y: 100, width: 202, height: 202 });
  const edge = planScreenLayout({ ...layout('02'), camera: { x: .999, y: .999, width: .001, height: .001 } }, { width: 1001, height: 1001 }, true);
  expect(edge.camera!.source).toEqual({ x: 998, y: 998, width: 2, height: 2 });
});

it('01 contains the whole screen;02 gives camera its separate pane;03 without focus stays whole-screen', () => {
  for (const variant of ['01', '02', '03'] as const) {
    const g = planScreenLayout(layout(variant), { width: 1920, height: 1080 }, true);
    expect(g.screen.source).toEqual({ x: 0, y: 0, width: 1920, height: 1080 });
    expect(g.screen.destination.y).toBeGreaterThanOrEqual(400);
    expect(g.screen.destination.y + g.screen.destination.height).toBeLessThanOrEqual(1200);
    expect(g.screen.destination.width / g.screen.destination.height).toBeCloseTo(1920 / 1080, 2);
    expect(g.reason).toBe(variant === '03' ? 'whole_screen' : null);
    expect(g.camera).not.toBeNull();
    expect(overlaps(g.screen.destination, g.camera!.destination)).toBe(false);
  }
  const g = planScreenLayout(layout('01'), { width: 1080, height: 800 }, true);
  expect(g.camera).toBeNull(); expect(g.cameraReason).toBe('no_safe_camera_slot');
});

it('03 protects confirmed focus for edge and tiny ROIs without requiring a camera', () => {
  for (const focus of [whole, { x: 0, y: 0, width: .05, height: .05 },
    { x: .95, y: .95, width: .05, height: .05 }, { x: .5, y: .5, width: .000001, height: .000001 },
    { x: .3, y: .2, width: .4, height: .6 }]) {
    for (const cameraAvailable of [true, false]) {
      const g = planScreenLayout({ ...layout(), focus }, { width: 1920, height: 1080 }, cameraAvailable);
      const a = g.protectedAction;
      expect(a.x).toBeGreaterThanOrEqual(-2); expect(a.y).toBeGreaterThanOrEqual(398);
      expect(a.x + a.width).toBeLessThanOrEqual(1082); expect(a.y + a.height).toBeLessThanOrEqual(1202);
      if (g.camera) expect(overlaps(a, g.camera.destination)).toBe(false);
      expect(g.reason).toBeNull();
      // Visible context is bounded before FFmpeg scaling, including a 2px focus.
      expect(g.screen.destination.width).toBeLessThanOrEqual(3240);
      expect(g.screen.destination.height).toBeLessThanOrEqual(3240);
    }
  }
});

it('non-square pixels fall back to the full source with display aspect preserved and camera omitted', () => {
  const g = planScreenLayout({ ...layout(), screen: { ...whole, width: .5 }, focus: { x: .1, y: .1, width: .1, height: .1 } },
    { width: 720, height: 576, sampleAspectRatio: 16 / 15 }, true);
  expect(g.reason).toBe('unsupported_geometry'); expect(g.camera).toBeNull();
  expect(g.screen.source).toEqual({ x: 0, y: 0, width: 720, height: 576 });
  expect(g.screen.destination.width / g.screen.destination.height).toBeCloseTo(4 / 3, 2);
  for (const source of [{ width: 1, height: 2 }, { width: NaN, height: 2 },
    { width: 100, height: 100, sampleAspectRatio: 0 }]) expect(() => planScreenLayout(layout(), source)).toThrow();
});

it('worker compatibility exports bind canonical timing; fixed numerical oracles cover the algorithm', () => {
  // This identity check proves wiring only. Independent numerical/media oracles prove behavior.
  expect(legacy.mapTime).toBe(mapTime);expect(legacy.planDuration).toBe(planDuration);
  expect(COMPACT_FPS).toBe(legacy.COMPACT_FPS); expect(COMPACT_XFADE_SECONDS).toBe(legacy.COMPACT_XFADE_SECONDS);
  for (const value of [[[10, 12.123]], [[10, 20], [22, 40]], [[60, 62.8], [63.12, 65], [65.28, 68.04]]]) {
    const p = parseCutPlan(value, value[0]![0]!, value.at(-1)![1]!);
    expect(p).toEqual(legacy.parseCutPlan(value, value[0]![0]!, value.at(-1)![1]!));
    expect(planDuration(p)).toBe(legacy.planDuration(p));
    for (let t = 0; t <= 75; t += .037) expect(mapTime(p, t)).toBe(legacy.mapTime(p, t));
  }
  expect(planDuration([[10,12.123]])).toBe(2.123);
  expect(planDuration([[10,20],[22,40]])).toBe(27.92);
  for(const [source,output] of [[10,0],[15,5],[19.95,9.96],[21,9.96],[22.04,9.96],[23,10.92],[40,27.92]])
    expect(mapTime([[10,20],[22,40]],source!)).toBeCloseTo(output!,8);
  for (const p of [[], [[10, 9]], [[9, 11], [10, 12]], [['1', 2]], [[NaN, 2]]]) expect(() => parseCutPlan(p, 0, 20)).toThrow();
});

it('preview inverse timing cuts at crossfade midpoint, clamps ends and visits every retained segment', () => {
  const plan: [number, number][] = [[10, 20], [22, 40], [45, 50]];
  expect(mapOutputTime(plan, -1)).toBe(10); expect(mapOutputTime(plan, 100)).toBe(50);
  expect(mapOutputTime(plan, 9.959)).toBeCloseTo(19.959, 8);
  expect(mapOutputTime(plan, 9.96)).toBeCloseTo(22.04, 8);
  expect(mapOutputTime(plan, 20)).toBeCloseTo(32.08, 8);
  expect(mapOutputTime(plan, 27.88)).toBeCloseTo(45.04, 8);
  for (const t of [NaN, Infinity]) expect(() => mapOutputTime(plan, t)).toThrow();
  expect(() => mapOutputTime([], 0)).toThrow();
});

it('isolated graph rejects stream-label injection and retains focus when controlled camera observation is negative', () => {
  expect(() => buildScreenLayoutGraph(layout(), { width: 1920, height: 1080 }, true, 'vc];movie=evil')).toThrow();
  const chosen = { ...layout(), focus: { x: .1, y: .1, width: .2, height: .2 } };
  const withCamera = buildScreenLayoutGraph(chosen, { width: 1920, height: 1080 }, true);
  const noCamera = buildScreenLayoutGraph(chosen, { width: 1920, height: 1080 }, false);
  expect(withCamera.geometry.camera).not.toBeNull(); expect(noCamera.geometry.camera).toBeNull();
  expect(noCamera.geometry.cameraReason).toBe('camera_unavailable'); expect(noCamera.geometry.reason).toBeNull();
});
