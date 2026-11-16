import { FORMAT_DIMENSIONS } from './formats.js';

export interface NormalizedRect { x: number; y: number; width: number; height: number }
export interface ScreenFaceLayoutV1 {
  version: 1;
  mode: 'screen-face';
  variant: '01' | '02' | '03';
  screen: NormalizedRect;
  focus: NormalizedRect | null;
  camera: NormalizedRect | null;
}
interface Rect { x: number; y: number; width: number; height: number }
interface Source { width: number; height: number; sampleAspectRatio?: number }
interface Placement { source: Rect; destination: Rect }
export interface ScreenLayoutGeometry {
  width: number;
  height: number;
  screen: Placement;
  camera: Placement | null;
  protectedAction: Rect;
  reason: 'whole_screen' | 'unsupported_geometry' | null;
  cameraReason: 'camera_unavailable' | 'no_safe_camera_slot' | null;
}
const whole = { x: 0, y: 0, width: 1, height: 1 };
const evenFloor = (n: number) => 2 * Math.floor(n / 2);
const evenCeil = (n: number) => 2 * Math.ceil(n / 2);
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
function object(value: unknown, keys: string[]): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k));
}
function rect(value: unknown): NormalizedRect {
  if (!object(value, ['x', 'y', 'width', 'height'])
    || !Object.values(value).every(n => typeof n === 'number' && Number.isFinite(n))) {
    throw new Error('Непригодная область');
  }
  const round = (n: unknown) => Math.round((n as number) * 1e6) / 1e6;
  // Fixed order at every nesting level: JSON.stringify is deterministic for replay/hash consumers.
  const r = { x: round(value.x), y: round(value.y), width: round(value.width), height: round(value.height) };
  // Validate raw values too: canonical rounding never legitimizes an out-of-source request.
  for (const v of [value as unknown as NormalizedRect, r]) {
    if (v.x < 0 || v.y < 0 || v.x >= 1 || v.y >= 1 || v.width <= 0 || v.height <= 0
      || v.width > 1 || v.height > 1 || right(v) > 1 + 1e-12 || bottom(v) > 1 + 1e-12) {
      throw new Error('Область вне исходника');
    }
  }
  return r;
}
function inside(a: Rect, b: Rect): boolean {
  return a.x >= b.x - 1e-12 && a.y >= b.y - 1e-12
    && right(a) <= right(b) + 1e-12 && bottom(a) <= bottom(b) + 1e-12;
}
export function parseScreenFaceLayout(value: unknown): ScreenFaceLayoutV1 {
  if (!object(value, ['version', 'mode', 'variant', 'screen', 'focus', 'camera'])
    || value.version !== 1 || value.mode !== 'screen-face'
    || !['01', '02', '03'].includes(value.variant as string)) throw new Error('Непригодное оформление');
  const screen = rect(value.screen), focus = value.focus === null ? null : rect(value.focus);
  if (focus && !inside(focus, screen)) throw new Error('Фокус вне экрана');
  return { version: 1, mode: 'screen-face', variant: value.variant as ScreenFaceLayoutV1['variant'],
    screen, focus, camera: value.camera === null ? null : rect(value.camera) };
}
export function parsePublishedLayout(value:unknown) {
  if(!object(value,['version','requested','resolved']) || value.version!==1
    || !object(value.resolved,['cameraVisible','reason']) || typeof value.resolved.cameraVisible!=='boolean'
    || !(value.resolved.reason===null || (typeof value.resolved.reason==='string'
      && ['whole_screen','unsupported_geometry','camera_unavailable','camera_unstable','no_safe_camera_slot'].includes(value.resolved.reason))))
    throw new Error('Непригодное опубликованное оформление');
  return {version:1 as const,requested:parseScreenFaceLayout(value.requested),
    resolved:{cameraVisible:value.resolved.cameraVisible,reason:value.resolved.reason as string|null}};
}
function pixelCrop(r: Rect, source: Source): Rect {
  const maxX = evenFloor(source.width), maxY = evenFloor(source.height);
  const x = Math.min(maxX - 2, evenFloor(r.x)), y = Math.min(maxY - 2, evenFloor(r.y));
  return { x: Math.max(0, x), y: Math.max(0, y),
    width: Math.max(2, Math.min(maxX, evenCeil(right(r))) - x),
    height: Math.max(2, Math.min(maxY, evenCeil(bottom(r))) - y) };
}
function pixels(r: NormalizedRect, source: Source): Rect | null {
  const raw = { x: r.x * source.width, y: r.y * source.height,
    width: r.width * source.width, height: r.height * source.height };
  const crop = pixelCrop(raw, source);
  // A tiny ROI in the last odd pixel can require a >2px shift to obtain an even 2x2 crop.
  // Keep the JSON contract; declare this geometry unavailable rather than silently moving it.
  return [crop.x - raw.x, crop.y - raw.y, right(crop) - right(raw), bottom(crop) - bottom(raw)]
    .every(delta => Math.abs(delta) <= 2 + 1e-9) ? crop : null;
}
function contain(source: Rect, area: Rect, sar = 1): Rect {
  const scale = Math.min(area.width / (source.width * sar), area.height / source.height);
  const width = Math.max(2, evenFloor(source.width * sar * scale));
  const height = Math.max(2, evenFloor(source.height * scale));
  return { x: evenFloor(area.x + (area.width - width) / 2), y: evenFloor(area.y + (area.height - height) / 2), width, height };
}
function mapRect(r: Rect, from: Rect, to: Rect): Rect {
  return { x: to.x + (r.x - from.x) * to.width / from.width,
    y: to.y + (r.y - from.y) * to.height / from.height,
    width: r.width * to.width / from.width, height: r.height * to.height / from.height };
}

/** Input dimensions already include autorotation. cameraAvailable is a controlled observation,
 * not detector confidence; no I/O, detection, source identity or legacy dispatch occurs here. */
export function planScreenLayout(value: ScreenFaceLayoutV1, source: Source, cameraAvailable = false): ScreenLayoutGeometry {
  const layout = parseScreenFaceLayout(value);
  if (![source.width, source.height].every(n => Number.isSafeInteger(n) && n >= 2)
    || (source.sampleAspectRatio !== undefined && (!Number.isFinite(source.sampleAspectRatio) || source.sampleAspectRatio <= 0))) {
    throw new Error('Непригодная геометрия исходника');
  }
  const { width, height } = FORMAT_DIMENSIONS.portrait;
  const pane = { x: 0, y: 400, width, height: 800 };
  const unsupportedSar = source.sampleAspectRatio !== undefined && source.sampleAspectRatio !== 1;
  const requestedScreen = pixels(layout.screen, source);
  const requestedFocus = layout.variant === '03' && layout.focus ? pixels(layout.focus, source) : null;
  const unsupported = unsupportedSar || !requestedScreen || (layout.variant === '03' && layout.focus !== null && !requestedFocus);
  const crop = unsupportedSar || !requestedScreen ? pixels(whole, source)! : requestedScreen;
  const focus = unsupported ? null : requestedFocus;
  let screen: Placement = { source: crop, destination: contain(crop, pane, source.sampleAspectRatio) };
  let camera: Placement | null = null;
  let cameraReason: ScreenLayoutGeometry['cameraReason'] = 'camera_unavailable';
  const reason = unsupported ? 'unsupported_geometry' : layout.variant === '03' && !focus ? 'whole_screen' : null;
  const cameraCrop = layout.camera && cameraAvailable && !unsupported ? pixels(layout.camera, source) : null;
  if (layout.variant === '02' && !unsupported) {
    screen = { source: crop, destination: contain(crop, { ...pane, height: 560 }) };
    if (cameraCrop) camera = { source: cameraCrop,
      destination: contain(cameraCrop, { x: 0, y: 976, width, height: 224 }) };
  } else if (layout.variant === '03' && focus && !unsupported) {
    const slot = cameraCrop ? contain(cameraCrop, { x: 746, y: 420, width: 302, height: 306 }) : null;
    const safe = slot ? [
      { x: 0, y: 400, width: slot.x - 16, height: 800 },
      { x: 0, y: bottom(slot) + 16, width, height: 1200 - bottom(slot) - 16 },
    ] : [pane];
    const scale = (r: Rect) => Math.min(r.width / focus!.width, r.height / focus!.height);
    const area = safe.length === 2 && scale(safe[1]!) > scale(safe[0]!) ? safe[1]! : safe[0]!;
    // One scalar applies to focus AND its context; raster rounding occurs only on bounded output.
    // Rounding a 2px focus first and deriving independent sx/sy would distort the entire source.
    const zoom = scale(area);
    const targetX = area.x + (area.width - focus.width * zoom) / 2;
    const targetY = area.y + (area.height - focus.height * zoom) / 2;
    const originX = targetX - (focus.x - crop.x) * zoom, originY = targetY - (focus.y - crop.y) * zoom;
    // Crop the visible context before scaling: tiny focus never scales a full source to a huge frame.
    const x = Math.max(crop.x, crop.x + (pane.x - originX) / zoom);
    const y = Math.max(crop.y, crop.y + (pane.y - originY) / zoom);
    const visible = pixelCrop({ x, y, width: Math.min(right(crop), crop.x + (right(pane) - originX) / zoom) - x,
      height: Math.min(bottom(crop), crop.y + (bottom(pane) - originY) / zoom) - y }, source);
    const destination = { x: evenFloor(originX + (visible.x - crop.x) * zoom),
      y: evenFloor(originY + (visible.y - crop.y) * zoom),
      width: Math.max(2, evenFloor(visible.width * zoom)), height: Math.max(2, evenFloor(visible.height * zoom)) };
    screen = { source: visible, destination };
    if (cameraCrop && slot) camera = { source: cameraCrop, destination: slot };
  } else if (cameraCrop) {
    const d = screen.destination;
    const spaces = [
      { x: 0, y: 400, width, height: d.y - 400 },
      { x: 0, y: bottom(d), width, height: 1200 - bottom(d) },
      { x: 0, y: 400, width: d.x, height: 800 },
      { x: right(d), y: 400, width: width - right(d), height: 800 },
    ].filter(r => r.width >= 2 && r.height >= 2);
    spaces.sort((a, b) => Math.min(b.width / cameraCrop.width, b.height / cameraCrop.height)
      - Math.min(a.width / cameraCrop.width, a.height / cameraCrop.height));
    if (spaces[0]) camera = { source: cameraCrop, destination: contain(cameraCrop, spaces[0]) };
    else cameraReason = 'no_safe_camera_slot';
  }
  if (camera) cameraReason = null;
  return { width, height, screen, camera, protectedAction: mapRect(focus ?? crop, screen.source, screen.destination), reason, cameraReason };
}
