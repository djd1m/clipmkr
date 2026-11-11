import { z } from 'zod';
import type { Pool } from '@clipmaker/db';
import { originalSourceRevision } from '@clipmaker/shared/server/original-source';
import type { AuthService } from './auth';
import { readSessionCookie } from './auth-handler';
import { clientIp } from './ip';
import { detectOriginalMedia, type OriginalMediaType } from './media-type';
import { StorageStreamError } from './guest-file';

export type OriginalSourceMetadata = { videoId: string } & (
  { state: 'ready'; available: true; sourceRevision: string; media: OriginalMediaType & { bytes: string; durationSeconds: number | null } } |
  { state: 'incomplete' | 'missing' | 'error'; available: false; unavailableReason: 'upload_incomplete' | 'source_missing' | 'temporarily_unavailable' });
export interface OriginalFileDependencies {
  pool: Pick<Pool, 'query'>; auth: Pick<AuthService, 'authenticate'>; trustedProxyHops: number;
  allowRead: (ip: string, account?: string) => Promise<boolean>;
  head: (key: string) => Promise<bigint>; bytes: (key: string) => Promise<Uint8Array>;
  sign: (key: string) => Promise<string>; stream: (url: string, request: Request) => Promise<Response>;
}
const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' };
const reasons = { incomplete: 'upload_incomplete', missing: 'source_missing', error: 'temporarily_unavailable' } as const;
const messages = { incomplete: 'Передача исходника не завершена', missing: 'Исходный файл недоступен', error: 'Не удалось проверить исходник' };
function storageMissing(error: unknown): boolean {
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } } | null;
  return value?.name === 'NoSuchKey' || value?.$metadata?.httpStatusCode === 404 || (error instanceof StorageStreamError && error.upstreamStatus === 404);
}
export function createOriginalFileHandler(deps: OriginalFileDependencies) {
  return async (request: Request, videoId: string): Promise<Response> => {
    const headOnly = request.method === 'HEAD', url = new URL(request.url);
    const metadata = !headOnly && url.searchParams.get('metadata') === '1';
    const reply = (text: string, status: number) => new Response(headOnly ? null : text, { status, headers: privateHeaders });
    const unavailable = (state: 'incomplete' | 'missing' | 'error') => metadata
      ? Response.json({ videoId, state, available: false, unavailableReason: reasons[state] } satisfies OriginalSourceMetadata, { headers: privateHeaders })
      : reply(messages[state], state === 'incomplete' ? 409 : state === 'missing' ? 404 : 503);
    let phase = 'auth';
    try {
      const token = readSessionCookie(request), session = token ? await deps.auth.authenticate(token) : null;
      if (!session || !z.string().uuid().safeParse(videoId).success) return reply('Запись не найдена', 404);
      if (!await deps.allowRead(clientIp(request.headers, deps.trustedProxyHops), session.account_id)) return reply('Слишком много запросов. Повторите через минуту', 429);
      const row = (await deps.pool.query<{ status: string; object_key: string | null; upload_id: string | null; actual_bytes: string | null; duration_seconds: string | null; failure_reason: string | null }>(
        `SELECT v.status,v.object_key,v.upload_id,v.actual_bytes,v.duration_seconds,v.failure_reason FROM video v JOIN account a ON a.id=v.account_id
         WHERE v.id=$1 AND v.account_id=$2 AND v.deleted_at IS NULL AND a.status='active'`, [videoId, session.account_id])).rows[0];
      if (!row) return reply('Запись не найдена', 404);
      if (url.searchParams.get('metadata') === '1' && url.searchParams.get('download') === '1') return reply('Некорректный запрос', 400);
      const range = request.headers.get('range');
      if (!headOnly && !metadata && range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return reply('', 416);
      if (row.status === 'uploading') return unavailable('incomplete');
      if ((row.status === 'failed' && ['too_large','not_media'].includes(row.failure_reason ?? '')) || !['queued', 'transcribing', 'selecting', 'rendering', 'done', 'failed'].includes(row.status) || !row.object_key || !row.actual_bytes || BigInt(row.actual_bytes) <= 0n) return unavailable('missing');
      phase = 'HEAD'; const size = await deps.head(row.object_key);
      if (size <= 0n || size !== BigInt(row.actual_bytes)) return unavailable('error');
      phase = 'sniff'; const media = detectOriginalMedia(await deps.bytes(row.object_key));
      if (metadata) return Response.json({ videoId, state: 'ready', available: true,
        sourceRevision: originalSourceRevision(videoId, row.object_key, row.upload_id, row.actual_bytes),
        media: { ...media, bytes: String(size), durationSeconds: row.duration_seconds === null ? null : Number(row.duration_seconds) } } satisfies OriginalSourceMetadata, { headers: privateHeaders });
      const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline';
      const name = encodeURIComponent(`Исходник ${videoId}.${media.extension}`).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16));
      const headers = new Headers({ ...privateHeaders, 'Content-Type': media.mime,
        'Content-Disposition': `${disposition}; filename="source.${media.extension}"; filename*=UTF-8''${name}`, 'Accept-Ranges': 'bytes' });
      if (headOnly) { headers.set('Content-Length', String(size)); return new Response(null, { headers }); }
      phase = 'stream'; const upstream = await deps.stream(await deps.sign(row.object_key), request);
      for (const key of ['content-length', 'content-range', 'accept-ranges']) { const value = upstream.headers.get(key); if (value) headers.set(key, value); }
      if(upstream.status===416){await upstream.body?.cancel();headers.delete('content-length');return new Response(null,{status:416,headers});}
      return new Response(upstream.body, { status: upstream.status, headers });
    } catch (error) {
      if (storageMissing(error)) return unavailable('missing');
      console.error('original_read_failed', { phase, category: 'unavailable' });
      return unavailable('error');
    }
  };
}
