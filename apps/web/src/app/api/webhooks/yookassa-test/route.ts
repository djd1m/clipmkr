import { getRuntime } from '../../../../server/runtime';
import { getBillingDependencies } from '../../../../server/billing-runtime';
import { createRelocationTestWebhookHandler } from '../../../../server/relocation-test-webhook';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {
  try {
    const { pool, config } = getRuntime();
    return await createRelocationTestWebhookHandler(getBillingDependencies(), pool, config)(request);
  } catch {
    return Response.json({ error: { code: 'unavailable', message: 'Сервис временно недоступен' } },
      { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
