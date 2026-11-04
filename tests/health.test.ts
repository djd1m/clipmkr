import { expect, it, vi } from 'vitest';
const { query, runtime } = vi.hoisted(() => {
  const query = vi.fn();
  return { query, runtime: vi.fn(() => ({ pool: { query } })) };
});
vi.mock('../apps/web/src/server/runtime', () => ({ getRuntime: runtime }));
import { GET } from '../apps/web/src/app/health/route';
it('health: при корректной конфигурации 200 с доступной БД, 503 при отказе БД', async () => {
  const previousRevision = process.env.NEXT_PUBLIC_RELEASE_REVISION;
  try {
    query.mockResolvedValueOnce({ rows: [] });
    const healthy = await GET();
    const healthyBody = await healthy.json() as { status: string; revision: string };
    expect(healthy.status).toBe(200);
    expect(healthyBody.status).toBe('ok');
    expect(healthy.headers.get('Cache-Control')).toBe('no-store');
    expect(healthy.headers.get('X-Clipmkr-Release')).toBe(healthyBody.revision);

    process.env.NEXT_PUBLIC_RELEASE_REVISION = `${healthyBody.revision}-runtime-override`;
    query.mockRejectedValueOnce(new Error('offline'));
    const unavailable = await GET();
    const unavailableBody = await unavailable.json() as { status: string; revision: string };
    expect(unavailable.status).toBe(503);
    expect(unavailableBody).toEqual({ status: 'unavailable', revision: healthyBody.revision });
    expect(unavailable.headers.get('Cache-Control')).toBe('no-store');
    expect(unavailable.headers.get('X-Clipmkr-Release')).toBe(healthyBody.revision);
    query.mockResolvedValueOnce({ rows: [] });
    const stillHealthy = await GET();
    expect(stillHealthy.status).toBe(200);
    expect(await stillHealthy.json()).toEqual({ status: 'ok', revision: healthyBody.revision });
    expect(stillHealthy.headers.get('Cache-Control')).toBe('no-store');
    expect(stillHealthy.headers.get('X-Clipmkr-Release')).toBe(healthyBody.revision);
    expect(query).toHaveBeenNthCalledWith(1, 'SELECT 1');
    expect(query).toHaveBeenNthCalledWith(2, 'SELECT 1');
    expect(query).toHaveBeenNthCalledWith(3, 'SELECT 1');
  } finally {
    if (previousRevision === undefined) delete process.env.NEXT_PUBLIC_RELEASE_REVISION;
    else process.env.NEXT_PUBLIC_RELEASE_REVISION = previousRevision;
  }
});
