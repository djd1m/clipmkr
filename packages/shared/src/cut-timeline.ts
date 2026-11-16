// Pure timing from worker compaction (OWN-012). Legacy wiring remains there until integration.
export const COMPACT_XFADE_SECONDS = 0.08;
export const COMPACT_FPS = 25;
export type Segment = [number, number];
export type CutTimeline = readonly (readonly [number, number])[];

export function parseCutPlan(value: unknown, start: number, end: number): Segment[] {
  if (!Array.isArray(value) || !value.length || !Number.isFinite(start) || !Number.isFinite(end)
    || !value.every((pair, i) => Array.isArray(pair) && pair.length === 2
      && pair.every(n => typeof n === 'number' && Number.isFinite(n))
      && pair[0] >= start && pair[1] <= end && pair[0] < pair[1]
      && (i === 0 || pair[0] >= value[i - 1][1]))) {
    throw new Error('Непригодный cut_plan');
  }
  return value as Segment[];
}
const frame = (t: number) => Math.round(t * COMPACT_FPS) / COMPACT_FPS;
const ms = (t: number) => Math.round(t * 1000) / 1000;
export function planDuration(plan: CutTimeline): number {
  const length = plan.reduce((sum, [s, e]) => sum + e - s, 0) - (plan.length - 1) * COMPACT_XFADE_SECONDS;
  return plan.length > 1 ? frame(length) : ms(length);
}
export function mapTime(plan: CutTimeline, tSource: number): number {
  const xf = COMPACT_XFADE_SECONDS;
  let offset = 0;
  for (let k = 0; k < plan.length; k++) {
    const [s, e] = plan[k]!;
    if (k && tSource <= s + xf) return offset + xf / 2;
    if (k + 1 < plan.length && tSource >= e - xf && tSource <= plan[k + 1]![0] + xf) {
      return offset + e - s - xf / 2;
    }
    if (tSource <= e) return Math.max(0, offset + tSource - s);
    offset += e - s - xf;
  }
  return planDuration(plan);
}

/** Preview hard-cuts at each crossfade midpoint; final encoding still uses both frames. */
export function mapOutputTime(plan: CutTimeline, outputTime: number): number {
  if (!plan.length || !Number.isFinite(outputTime)
    || plan.some(([s, e], i) => !Number.isFinite(s) || !Number.isFinite(e) || s < 0 || e <= s
      || (i > 0 && s < plan[i - 1]![1])
      || (plan.length > 1 && e - s <= COMPACT_XFADE_SECONDS))) {
    throw new Error('Непригодная временная шкала');
  }
  const t = Math.min(planDuration(plan), Math.max(0, outputTime));
  if (t === planDuration(plan)) return plan[plan.length - 1]![1];
  let offset = 0;
  for (let i = 0; i < plan.length; i++) {
    const [s, e] = plan[i]!;
    const midpoint = Math.round((offset + e - s - COMPACT_XFADE_SECONDS / 2) * 1e9) / 1e9;
    if (i === plan.length - 1 || t < midpoint) {
      return Math.min(e, Math.max(s, s + t - offset));
    }
    offset += e - s - COMPACT_XFADE_SECONDS;
  }
  return plan[plan.length - 1]![1];
}
