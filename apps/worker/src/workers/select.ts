import { authorizeSelection, acceptSelection, failSelection, type Attempt, type Pool } from '@clipmaker/db';
import type { Limits, ExecutionProvider } from '@clipmaker/shared/config';
import { validateFragments, FragmentSchemaError } from '@clipmaker/shared/fragments';
import { SelectionProviderError, type Selector } from '../llm/provider.js';
import { recordSelectionSpend, type SelectionSpend } from '../llm/spend.js';
interface Dependencies {
  pool: Pool; limits: Limits; selector: Selector; model: string; provider: ExecutionProvider; spendPath: string;
  enqueue: (attempt: Attempt) => Promise<void>;
  spend?: typeof recordSelectionSpend;
}
export async function selectFragments(attempt: Attempt, deps: Dependencies) {
  const input = await authorizeSelection(deps.pool, attempt, deps.limits, deps.model, undefined, deps.provider);
  if (!input) return;
  const spend = deps.spend ?? recordSelectionSpend;
  const event: SelectionSpend = { video_id: attempt.video_id, fence: attempt.fence, series_no: attempt.series_no,
    model: deps.model, provider: deps.provider, stage: 'select', unit: 'calls', quantity: 1, phase: 'attempt', result: 'started' };
  let fragments;
  let awaitingProvider = false;
  try {
    await spend(deps.spendPath, event);
    awaitingProvider = true;
    const response = await deps.selector.select(input.transcript, input.duration, new AbortController().signal);
    awaitingProvider = false;
    fragments = validateFragments(response, input.transcript, input.duration);
    await spend(deps.spendPath, { ...event, phase: 'outcome', result: fragments.length ? 'success' : 'no_fragments' });
  } catch (error) {
    const outcome = error instanceof FragmentSchemaError ? 'schema_violation' :
      error instanceof SelectionProviderError ? error.outcome : 'provider_error';
    const authStatus = awaitingProvider && deps.provider === 'cloudru' && error instanceof SelectionProviderError &&
      error.outcome === 'provider_error' && error.kind === 'http' &&
      (error.status === 401 || error.status === 403) ? error.status : undefined;
    // Both failure records are best-effort; neither may hide the original cause.
    try { await spend(deps.spendPath, { ...event, phase: 'outcome', result: outcome }); }
    catch (recordError) { console.error('Не удалось записать исход выделения в журнал', recordError); }
    const reason = outcome === 'schema_violation' ? 'schema_violation' : 'stalled';
    let refunded: boolean | undefined;
    try {
      if (authStatus === undefined) await failSelection(deps.pool, attempt, reason);
      else refunded = await failSelection(deps.pool, attempt, reason, undefined, input.quotaDay);
    } catch (recordError) {
      if (authStatus === undefined) console.error('Не удалось завершить попытку выделения в БД', recordError);
    }
    if (authStatus !== undefined) {
      console.warn(JSON.stringify({ event: 'selection_cloudru_access_denied', provider: 'cloudru', model: deps.model,
        http_status: authStatus, video_id: attempt.video_id, fence: attempt.fence,
        outcome: refunded === undefined ? 'unconfirmed' : refunded ? 'refunded' : 'not_applied' }));
    }
    throw error;
  }
  if (!fragments.length) { await failSelection(deps.pool, attempt, 'no_fragments'); return; }
  const jobs = await acceptSelection(deps.pool, attempt, fragments);
  // Committed attempts are the outbox; watchdog recovers any Redis publish loss.
  for (const job of jobs ?? []) {
    try { await deps.enqueue(job); } catch (error) { console.error('Рендер сохранён; сторож восстановит доставку задания', error); }
  }
}
