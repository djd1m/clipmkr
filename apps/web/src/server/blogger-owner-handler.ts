import { z } from 'zod';
import { bloggerReport, getBloggerPolicy, hasOwnerUnlimited, setBloggerPolicy, type Pool } from '@clipmaker/db';
import { moscowDay } from '@clipmaker/shared/upload';
import { readSessionCookie } from './auth-handler';
import { clientIp } from './ip';

const input = z.object({
  account_id: z.string().uuid(), is_blogger: z.boolean(),
  max_minutes: z.number().int().min(2).max(1440).nullable(),
  commission_percent: z.union([z.literal(20), z.literal(30)]).nullable(),
  reason: z.string().trim().min(3).max(300),
}).strict();
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
const fail = (status: number, message: string) => json({ error: { message } }, status);

export function createBloggerOwnerHandler(deps: {
  pool: Pool; publicOrigin: string; trustedProxyHops: number;
  authenticate: (token: string) => Promise<{ account_id: string } | null>;
  allowRead: (ip: string, account?: string) => Promise<boolean>;
  allowMutation: (ip: string, account?: string) => Promise<boolean>;
}) {
  return async (request: Request): Promise<Response> => {
    try {
      const mutation = request.method === 'POST';
      if (!mutation && request.method !== 'GET') return fail(405, 'Метод не поддерживается');
      let ip: string;
      try { ip = clientIp(request.headers, deps.trustedProxyHops); }
      catch { return fail(400, 'Адрес клиента не определён'); }
      const token = readSessionCookie(request);
      const session = token ? await deps.authenticate(token) : null;
      if (!await (mutation ? deps.allowMutation : deps.allowRead)(ip, session?.account_id)) return fail(429, 'Слишком много запросов. Повторите через минуту');
      if (mutation && request.headers.get('origin') !== new URL(deps.publicOrigin).origin) return fail(403, 'Источник запроса не разрешён');
      if (!session) return fail(401, 'Войдите в аккаунт');
      if (!await hasOwnerUnlimited(deps.pool, session.account_id)) return fail(403, 'Настройки доступны только владельцу');
      if (!mutation) {
        const params = new URL(request.url).searchParams;
        const email = params.get('email');
        if (email !== null) {
          const parsed = z.string().trim().email().max(254).safeParse(email);
          if (!parsed.success) return fail(422, 'Укажите корректный email');
          const account = (await deps.pool.query<{ id: string; email: string }>(
            `SELECT id,email FROM account WHERE lower(email)=lower($1) AND status='active'`, [parsed.data])).rows[0];
          if (!account) return fail(404, 'Аккаунт не найден. Блогер должен сначала зарегистрироваться');
          const policy = await getBloggerPolicy(deps.pool, account.id);
          if (!policy) return fail(404, 'Аккаунт больше недоступен');
          return json({ data: { email: account.email, policy } });
        }
        const report = await bloggerReport(deps.pool, session.account_id, params.get('month') ?? moscowDay(new Date()).slice(0, 7));
        if (report.kind !== 'ok') return fail(report.kind === 'forbidden' ? 403 : 422, 'Отчёт недоступен: проверьте права и месяц');
        return json({ data: report });
      }
      if (!request.headers.get('content-type')?.startsWith('application/json')) return fail(422, 'Ожидается JSON');
      const reader = request.body?.getReader();
      if (!reader) return fail(422, 'Укажите настройки');
      const parts: Uint8Array[] = []; let size = 0;
      for (;;) {
        const chunk = await reader.read();
        if (chunk.done) break;
        size += chunk.value.byteLength;
        if (size > 4096) { await reader.cancel(); return fail(413, 'Слишком большой запрос'); }
        parts.push(chunk.value);
      }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(parts).toString('utf8')); }
      catch { return fail(422, 'Некорректный JSON'); }
      const parsed = input.safeParse(body);
      if (!parsed.success) return fail(422, 'Проверьте лимит (2–1440 минут), ставку и причину (3–300 символов)');
      const value = parsed.data;
      const result = await setBloggerPolicy(deps.pool, {
        actorAccountId: session.account_id, accountId: value.account_id, isBlogger: value.is_blogger,
        sourceLimitSeconds: value.max_minutes === null ? null : value.max_minutes * 60,
        commissionPercent: value.commission_percent, reason: value.reason,
      });
      if (result.kind !== 'updated') return fail(result.kind === 'forbidden' ? 403 : result.kind === 'not_found' ? 404 : 422, 'Настройки не сохранены');
      return json({ data: result.policy });
    } catch (error) {
      console.error(`Кабинет блогеров недоступен (${error instanceof Error ? error.name : 'ошибка'})`);
      return fail(503, 'Сервис временно недоступен. Повторите через минуту');
    }
  };
}
