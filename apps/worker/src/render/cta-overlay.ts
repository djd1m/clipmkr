// Надпись призыва в конце клипа (ADR-017, часть 27b). Текст берётся из словаря или из адреса подписки.
// Геометрия fail-closed по образцу layoutTeaser:
// надпись живёт в полосе МЕЖДУ низом субтитров и верхом плашки метки; не поместилась даже минимальным
// кеглем — клип собирается БЕЗ надписи с записью в журнал, а не с наложением на субтитры или метку.
import { createHash } from 'node:crypto';
import { CTA_FRAME_GEOMETRY, ctaFrameLabel, subscriptionFrameUrl } from '@clipmaker/shared/cta';
import { readCtaKind } from '@clipmaker/shared/enums';
import { measureText, watermarkPlateTop, WatermarkGeometryError } from '@clipmaker/shared/watermark';
import { FONT_FILE, WATERMARK_OPACITY } from './watermark.js';
import { escapeDrawtext, escapeFFmpegPath } from './escape.js';
import { SUBTITLE_MARGIN_V, SUBTITLE_OUTLINE, SUBTITLE_SHADOW } from './subtitles.js';
import { TEASER_SECONDS } from './teaser.js';

export const { fontSize: CTA_FONT_SIZE, minFontSize: CTA_MIN_FONT_SIZE, fontStep: CTA_FONT_STEP,
  paddingX: CTA_PADDING_X, paddingY: CTA_PADDING_Y, sideMargin: CTA_SIDE_MARGIN } = CTA_FRAME_GEOMETRY;
/** Окно показа: последние 2,5 с клипа — не 0,8 с пэк-шота (ADR-012), столько нужно, чтобы прочитать. */
export const CTA_SECONDS = 2.5;
/** Зазор до субтитров сверху и до метки снизу. */
export const CTA_GAP = 12;
export const CTA_VERSION = 'v1';

export interface CtaZone { top: number; bottom: number }
export interface CtaLayout { text: string; fontSize: number; x: number; y: number; plateWidth: number; plateHeight: number; textWidth: number }
export interface CtaResult { kind: string; text: string; font_size: number; start_seconds: number; text_sha256?: string }
export type CtaSkipReason = 'no_room' | 'glyph_missing' | 'window_empty' | 'paid_no_link';

/** Полоса между субтитрами и меткой. Позиция одна и для бесплатных, и для платных клипов (без метки). */
export function ctaZone(height: number): CtaZone {
  const subtitlesBottom = height - SUBTITLE_MARGIN_V + SUBTITLE_OUTLINE + SUBTITLE_SHADOW;
  return { top: subtitlesBottom + CTA_GAP, bottom: watermarkPlateTop(height) - CTA_GAP };
}
export const ctaPlateHeight = (fontSize: number) => 2 * CTA_PADDING_Y + Math.ceil(fontSize * 1.15);

/** Чистая разметка: наибольший кегль от 72 до 48, при котором плашка помещается в полосу по высоте и в поле по ширине. */
export function layoutCta(text: string, width: number, zone: CtaZone): CtaLayout | null {
  const available = CTA_FRAME_GEOMETRY.availableTextWidth(width);
  for (let fontSize = CTA_FONT_SIZE; fontSize >= CTA_MIN_FONT_SIZE; fontSize -= CTA_FONT_STEP) {
    const plateHeight = ctaPlateHeight(fontSize), textWidth = measureText(text, fontSize);
    if (plateHeight > zone.bottom - zone.top || textWidth > available) continue;
    const plateWidth = textWidth + 2 * CTA_PADDING_X;
    // Прижата к метке снизу: надпись и адрес читаются одним блоком.
    return { text, fontSize, textWidth, plateWidth, plateHeight, x: Math.floor((width - plateWidth) / 2), y: zone.bottom - plateHeight };
  }
  return null;
}
/** Начало окна: последние CTA_SECONDS, но не раньше конца заголовка и не раньше начала клипа. */
export function ctaWindowStart(duration: number, teaser: boolean): number {
  return Math.max(duration - CTA_SECONDS, teaser ? TEASER_SECONDS : 0, 0);
}
export function buildCtaFilter(layout: CtaLayout, start: number, textFile?: string): string {
  const enable = `enable='gte(t,${start})'`;
  const textY = layout.y + CTA_PADDING_Y;
  const text = textFile ? `textfile='${escapeFFmpegPath(textFile)}'` : `text='${escapeDrawtext(layout.text)}'`;
  return [
    `drawbox=x=${layout.x}:y=${layout.y}:w=${layout.plateWidth}:h=${layout.plateHeight}:color=black@${WATERMARK_OPACITY}:t=fill:${enable}`,
    `drawtext=${text}:expansion=none:fontfile='${escapeFFmpegPath(FONT_FILE)}':` +
      `fontsize=${layout.fontSize}:fontcolor=white:x=${layout.x + CTA_PADDING_X}:y=${textY + layout.fontSize}-ascent:${enable}`,
  ].join(',');
}
/** Вид читается fail-closed: неизвестное → none → надписи нет. Отказ разметки — журнал, клип без надписи.
 *  `watermark` обязателен (фича 30): текст надписи зависит от того, есть ли в кадре метка с /c/КОД. */
export function prepareCta(kind: unknown, width: number, height: number, duration: number, teaser: boolean,
  watermark: boolean, onSkip?: (reason: CtaSkipReason) => void, zone?: CtaZone, subscription?: { url: unknown; textFile: string }):
  { result: CtaResult; filter: string } | null {
  const safe = readCtaKind(kind);
  if (safe === 'none') return null;
  const skip = (reason: CtaSkipReason) => {
    onSkip?.(reason);
    console.info(JSON.stringify({ event: 'cta_skipped', kind: safe, reason }));
    return null;
  };
  const start = ctaWindowStart(duration, teaser);
  if (!Number.isFinite(start) || start >= duration) return skip('window_empty');
  const address = subscription ? subscriptionFrameUrl(safe, subscription.url) : null;
  const text = address ?? ctaFrameLabel(safe, watermark);
  if (text === null) return skip('paid_no_link');
  let layout: CtaLayout | null;
  try { layout = layoutCta(text, width, zone ?? ctaZone(height)); }
  catch (error) { if (error instanceof WatermarkGeometryError) return skip('glyph_missing'); throw error; }
  if (!layout) return skip('no_room');
  const result: CtaResult = { kind: safe, text, font_size: layout.fontSize, start_seconds: start };
  if (!address || !subscription) return { result, filter: buildCtaFilter(layout, start) };
  result.text_sha256 = createHash('sha256').update(address, 'utf8').digest('hex');
  return { result, filter: buildCtaFilter(layout, start, subscription.textFile) };
}
