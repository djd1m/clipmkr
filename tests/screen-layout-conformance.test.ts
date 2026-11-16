import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { parseScreenFaceLayout, planScreenLayout } from '@clipmaker/shared/screen-layout';
import original from './fixtures/zoom-layout-original.json';

it.each(original.variants)('original_mockup_01_02_composition_conformance $variant', reference => {
  // Oracle comes from the immutable HTML CSS percentages and its source ROI metrics,
  // never from the production planner or candidate screenshots.
  const html = execFileSync('git', ['show', `${original.originalCommit}:${original.originalPath}`]);
  expect(createHash('sha256').update(html).digest('hex')).toBe(original.originalSha256);
  expect(html.toString()).toContain('top:27%;width:100%;height:33.33%');
  expect(html.toString()).toContain('left:62%;top:10%;width:32%;height:10.13%');
  const normalize = (r: typeof original.variants[number]['screenRoi']) => ({
    x: r.x / original.source.width, y: r.y / original.source.height,
    width: r.width / original.source.width, height: r.height / original.source.height,
  });
  {
    const request = parseScreenFaceLayout({ version: 2, mode: 'screen-face', variant: reference.variant,
      screen: normalize(reference.screenRoi), focus: null, camera: normalize(reference.cameraRoi) });
    const actual = planScreenLayout(request, original.source, true);
    expect(actual.camera, reference.variant).not.toBeNull();
    for (const [placement, bounds] of [[actual.screen.destination, reference.screenBounds],
      [actual.camera!.destination, reference.cameraBounds]] as const) {
      for (const key of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(placement[key] - bounds[key]), `${reference.variant} ${key}: actual ${placement[key]}, original ${bounds[key]}`)
          .toBeLessThanOrEqual(original.tolerancePixels);
      }
    }
  }
});
