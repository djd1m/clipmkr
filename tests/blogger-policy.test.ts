import { describe, expect, it } from 'vitest';
import { BLOGGER_SOURCE_SECONDS, MAX_SOURCE_SECONDS, NORMAL_SOURCE_SECONDS, sourceLimitSeconds } from '../packages/shared/src/upload';
import { inputCreditSeconds } from '../packages/shared/src/tariff';
import { chunkBoundaries } from '../apps/worker/src/stt/chunker';
import { fileFailure } from '../apps/worker/src/workers/stt';

describe('Политика длительности исходной записи', () => {
  it('uses 90 minutes for ordinary accounts even with a stored blogger override', () => {
    expect(NORMAL_SOURCE_SECONDS).toBe(5400);
    expect(sourceLimitSeconds({ is_blogger: false, blogger_source_limit_seconds: null })).toBe(5400);
    expect(sourceLimitSeconds({ is_blogger: false, blogger_source_limit_seconds: 9000 })).toBe(5400);
    expect(fileFailure({ hasAudio: true, durationSec: 5400 })).toBeNull();
    expect(fileFailure({ hasAudio: true, durationSec: 5400.1 })).toBe('too_long');
  });

  it.each([
    [null, 7200],
    [9000, 9000],
    [120, 120],
    [86400, 86400],
  ])('applies blogger override %s and enforces its exact boundary', (override, expected) => {
    expect(BLOGGER_SOURCE_SECONDS).toBe(7200);
    const snapshot = sourceLimitSeconds({ is_blogger: true, blogger_source_limit_seconds: override });
    expect(snapshot).toBe(expected);
    expect(fileFailure({ hasAudio: true, durationSec: expected }, snapshot)).toBeNull();
    expect(fileFailure({ hasAudio: true, durationSec: expected + 0.1 }, snapshot)).toBe('too_long');
  });

  it('keeps minimum duration and audio checks for bloggers', () => {
    expect(fileFailure({ hasAudio: true, durationSec: 119.9 }, 7200)).toBe('too_short');
    expect(fileFailure({ hasAudio: false, durationSec: 7200 }, 7200)).toBe('no_audio');
  });

  it.each([5400, 5400.1, 7200, 9000, 86400])('chunks and charges all %s seconds without the former 90 minute barrier', duration => {
    expect(inputCreditSeconds(duration)).toBe(Math.ceil(duration));
    const chunks = chunkBoundaries(duration, []);
    expect(chunks[0]!.offsetSeconds).toBe(0);
    const last = chunks.at(-1)!;
    expect(last.offsetSeconds + last.durationSeconds).toBe(duration);
    for (let index = 1; index < chunks.length; index++) {
      const previous = chunks[index - 1]!;
      expect(chunks[index]!.offsetSeconds).toBe(previous.offsetSeconds + previous.durationSeconds - 2);
    }
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 86400.1])('rejects invalid technical duration %s before chunking or billing', duration => {
    expect(MAX_SOURCE_SECONDS).toBe(86400);
    expect(() => chunkBoundaries(duration, [])).toThrow('Непригодная длительность');
    expect(() => inputCreditSeconds(duration)).toThrow('Непригодная длительность');
  });
});
