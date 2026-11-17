import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { Attempt } from '../packages/db/src/attempts';
import type { Pool } from 'pg';
import { loadLimits } from '../packages/shared/src/config';
import { selectFragments } from '../apps/worker/src/workers/select';
import { createFakeSelector, fakeFragment, type FakeCase } from '../apps/worker/src/llm/fake';
import { SelectionProviderError } from '../apps/worker/src/llm/provider';
import { environment } from './fixtures/environment';
import { authorizeSelection, acceptSelection, failSelection } from '@clipmaker/db';
const state = vi.hoisted(() => ({ trace: [] as string[], failure: '', refused: false }));
vi.mock('@clipmaker/db', () => ({
  authorizeSelection: vi.fn(async () => { state.trace.push('quota'); return state.refused ? null : {
    duration: 360, quotaDay: '2026-11-17',
    transcript: { language: 'ru', segments: [], words: Array.from({ length: 360 }, (_, i) => ({ word: 'слово', start: i, end: i + 1 })) },
  }; }),
  acceptSelection: vi.fn(async () => { state.trace.push('commit'); return [{ stage: 'render' }]; }),
  failSelection: vi.fn(async (_pool, _attempt, reason) => { state.failure = reason; return true; }),
}));
const attempt: Attempt = { video_id: 'video', stage: 'select', clip_id: null, series_no: 1, fence: 1, attempt_no: 1, status: 'running' };
function fixture(scenario: FakeCase = 'valid') {
  const fake = createFakeSelector(scenario);
  return { pool: {} as Pool, limits: loadLimits(environment()), provider: 'fake' as const, model: 'anthropic/claude-sonnet-5', spendPath: '/unused',
    selector: { select: vi.fn(async (...args: Parameters<typeof fake.select>) => { state.trace.push('call'); return fake.select(...args); }) },
    spend: vi.fn(async (_path, event) => { state.trace.push(event.phase); }),
    enqueue: vi.fn(async () => { state.trace.push('enqueue'); }),
  };
}
describe('SelectFragments order and attempt accounting', () => {
  beforeEach(() => { vi.clearAllMocks(); state.trace = []; state.failure = ''; state.refused = false; });
  afterEach(() => { vi.restoreAllMocks(); });
  it('user_llm consumed BEFORE model, one call per video and commit BEFORE enqueue', async () => {
    const deps = fixture(); await selectFragments(attempt, deps);
    expect(state.trace).toEqual(['quota', 'attempt', 'call', 'outcome', 'commit', 'enqueue']);
    expect(deps.selector.select).toHaveBeenCalledTimes(1);
  });
  it.each(['cloudru', 'openrouter', 'fake'] as const)('actual provider %s reaches authorization and both ledger phases', async provider => {
    const deps = { ...fixture(), provider }; await selectFragments(attempt, deps);
    expect(authorizeSelection).toHaveBeenCalledWith(deps.pool, attempt, deps.limits, deps.model, undefined, provider);
    expect(deps.spend.mock.calls.map(call => call[1])).toEqual([
      expect.objectContaining({ provider, model: deps.model, phase: 'attempt' }),
      expect.objectContaining({ provider, model: deps.model, phase: 'outcome' }),
    ]);
  });
  it('invalid closed shape cannot reach persistence or cause another dispatch', async () => {
    const deps = fixture(); deps.selector.select.mockResolvedValueOnce({ fragments: [fakeFragment()], extra: true });
    await expect(selectFragments(attempt, deps)).rejects.toThrow();
    expect(acceptSelection).not.toHaveBeenCalled(); expect(deps.selector.select).toHaveBeenCalledOnce();
  });
  it('refusal makes no paid attempt', async () => {
    state.refused = true; const deps = fixture(); await selectFragments(attempt, deps);
    expect(deps.selector.select).not.toHaveBeenCalled(); expect(deps.spend).not.toHaveBeenCalled();
  });
  it.each(['5xx', 'timeout'] as const)('counts attempts including %s, no silent retry', async scenario => {
    const deps = fixture(scenario); await expect(selectFragments(attempt, deps)).rejects.toThrow();
    expect(deps.spend.mock.calls.map(c => c[1].phase)).toEqual(['attempt', 'outcome']);
    expect(state.trace.indexOf('attempt')).toBeLessThan(state.trace.indexOf('call'));
    expect(deps.selector.select).toHaveBeenCalledTimes(1); expect(deps.enqueue).not.toHaveBeenCalled();
  });
  it.each([
    { status: 401, closed: true, outcome: 'refunded' },
    { status: 403, closed: true, outcome: 'refunded' },
    { status: 403, closed: false, outcome: 'not_applied' },
    { status: 403, closed: undefined, outcome: 'unconfirmed' },
  ])('reports Cloud.ru $status closure as $outcome with a bounded diagnostic', async ({ status, closed, outcome }) => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => { state.trace.push('diagnostic'); });
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    const deps = { ...fixture(), provider: 'cloudru' as const };
    const original = new SelectionProviderError('provider_error', 'http', 'synthetic-private-response', status);
    deps.selector.select.mockImplementationOnce(async () => { state.trace.push('call'); throw original; });
    vi.mocked(failSelection).mockImplementationOnce(async () => {
      state.trace.push('close');
      if (closed === undefined) throw new Error('synthetic-private-db-error');
      return closed;
    });
    await expect(selectFragments(attempt, deps)).rejects.toBe(original);
    expect(failSelection).toHaveBeenCalledExactlyOnceWith(deps.pool, attempt, 'stalled', undefined, '2026-11-17');
    expect(state.trace).toEqual(['quota', 'attempt', 'call', 'outcome', 'close', 'diagnostic']);
    expect(deps.selector.select).toHaveBeenCalledOnce();
    expect(deps.enqueue).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledExactlyOnceWith(expect.any(String));
    expect(JSON.parse(log.mock.calls[0]![0])).toEqual({
      event: 'selection_cloudru_access_denied', provider: 'cloudru', model: deps.model,
      http_status: status, video_id: attempt.video_id, fence: attempt.fence, outcome,
    });
    expect(errorLog).not.toHaveBeenCalled();
  });
  it.each([
    { name: 'Cloud.ru HTTP 404', provider: 'cloudru', error: new SelectionProviderError('provider_error', 'http', undefined, 404) },
    { name: 'Cloud.ru HTTP 429', provider: 'cloudru', error: new SelectionProviderError('provider_error', 'http', undefined, 429) },
    { name: 'Cloud.ru HTTP 503', provider: 'cloudru', error: new SelectionProviderError('provider_error', 'http', undefined, 503) },
    { name: 'timeout', provider: 'cloudru', error: new SelectionProviderError('timeout') },
    { name: 'transport', provider: 'cloudru', error: new SelectionProviderError('provider_error', 'transport', 'ECONNRESET', 403) },
    { name: 'untyped HTTP 403', provider: 'cloudru', error: Object.assign(new Error('synthetic'), { kind: 'http', outcome: 'provider_error', status: 403 }) },
    { name: 'OpenRouter HTTP 403', provider: 'openrouter', error: new SelectionProviderError('provider_error', 'http', undefined, 403) },
    { name: 'fake HTTP 403', provider: 'fake', error: new SelectionProviderError('provider_error', 'http', undefined, 403) },
  ] as const)('keeps the debit for $name', async ({ provider, error }) => {
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const deps = { ...fixture(), provider };
    deps.selector.select.mockRejectedValueOnce(error);
    await expect(selectFragments(attempt, deps)).rejects.toBe(error);
    expect(failSelection).toHaveBeenCalledExactlyOnceWith(deps.pool, attempt, 'stalled');
    expect(log).not.toHaveBeenCalled();
    expect(deps.selector.select).toHaveBeenCalledOnce();
  });
  it.each(['attempt', 'outcome'] as const)('keeps the debit when the %s ledger write fails', async phase => {
    const deps = { ...fixture(), provider: 'cloudru' as const };
    const log = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = new SelectionProviderError('provider_error', 'http', undefined, 403);
    if (phase === 'outcome') deps.spend.mockResolvedValueOnce(undefined);
    deps.spend.mockRejectedValueOnce(error);
    await expect(selectFragments(attempt, deps)).rejects.toBe(error);
    expect(failSelection).toHaveBeenCalledExactlyOnceWith(deps.pool, attempt, 'stalled');
    expect(log).not.toHaveBeenCalled();
    expect(deps.selector.select).toHaveBeenCalledTimes(phase === 'attempt' ? 0 : 1);
  });
  it('empty selection is a named failure, never rendering with zero cards', async () => {
    const deps = fixture('empty'); await selectFragments(attempt, deps);
    expect(state.failure).toBe('no_fragments'); expect(state.trace).not.toContain('commit');
  });
  it('RV-5 database failure preserves the ledger outcome and original provider error', async () => {
    const deps = fixture('5xx'), original = new Error('provider unavailable');
    deps.selector.select.mockImplementationOnce(async () => { state.trace.push('call'); throw original; });
    vi.mocked(failSelection).mockImplementationOnce(async () => { state.trace.push('db-down'); throw new Error('db down'); });
    await expect(selectFragments(attempt, deps)).rejects.toBe(original);
    expect(state.trace).toEqual(['quota', 'attempt', 'call', 'outcome', 'db-down']);
    expect(deps.spend).toHaveBeenLastCalledWith(deps.spendPath, expect.objectContaining({ phase: 'outcome', result: 'provider_error' }));
  });
  it('RV-5 spend ledger unavailable blocks network, closes failure and preserves the original error', async () => {
    const deps = fixture(), original = new Error('attempt disk full');
    deps.spend.mockRejectedValue(new Error('outcome disk full')).mockRejectedValueOnce(original);
    await expect(selectFragments(attempt, deps)).rejects.toBe(original);
    expect(deps.selector.select).not.toHaveBeenCalled();
    expect(deps.spend.mock.calls.map(c => c[1].phase)).toEqual(['attempt', 'outcome']);
    expect(failSelection).toHaveBeenCalledWith(deps.pool, attempt, 'stalled');
    expect(state.failure).toBe('stalled');
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
  it.each([false, true])('RV-5 outcome ledger failure still attempts database closure (database down: %s)', async databaseDown => {
    const deps = fixture(), original = new Error('provider unavailable');
    deps.selector.select.mockRejectedValueOnce(original);
    deps.spend.mockResolvedValueOnce(undefined).mockRejectedValue(new Error('outcome disk full'));
    if (databaseDown) vi.mocked(failSelection).mockRejectedValueOnce(new Error('db down'));
    await expect(selectFragments(attempt, deps)).rejects.toBe(original);
    expect(deps.spend.mock.calls.map(c => c[1].phase)).toEqual(['attempt', 'outcome']);
    expect(failSelection).toHaveBeenCalledWith(deps.pool, attempt, 'stalled');
    if (!databaseDown) expect(state.failure).toBe('stalled');
    expect(deps.enqueue).not.toHaveBeenCalled();
  });
  it('Redis publish failure preserves successful commit for watchdog', async () => {
    const deps = fixture(); deps.enqueue.mockRejectedValue(new Error('redis down'));
    await expect(selectFragments(attempt, deps)).resolves.toBeUndefined(); expect(state.failure).toBe(''); expect(state.trace).toContain('commit');
  });
});
