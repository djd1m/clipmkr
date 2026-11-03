import { getRuntime } from '../../server/runtime';
// Next replaces this public variable during build; runtime environment cannot change it.
const revision = process.env.NEXT_PUBLIC_RELEASE_REVISION || 'unversioned';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(): Promise<Response> {
  try {
    await getRuntime().pool.query('SELECT 1');
    return Response.json({ status: 'ok', revision }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Проверка здоровья: сервис недоступен', error);
    return Response.json({ status: 'unavailable', revision }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
