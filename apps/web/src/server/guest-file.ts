import { createHmac, timingSafeEqual } from 'node:crypto';

// This signed URL is on the existing file route. The S3 capability never reaches the guest.
export function guestFileTicket(secret: string, id: string, kind: string, code: string, download: boolean, until: string) {
  return createHmac('sha256', secret).update(JSON.stringify(['guest-file-v1', id, kind, code, download, until])).digest('base64url');
}
export function validGuestFileTicket(signature: string, expected: string, until: string, now: Date) {
  if (!/^\d{13}$/.test(until) || Number(until) <= now.getTime() || Number(until) > now.getTime() + 900_000) return false;
  if (!/^[A-Za-z0-9_-]{43}$/.test(signature)) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
export class StorageStreamError extends Error {
  constructor(readonly upstreamStatus: number) { super('Storage unavailable'); this.name = 'StorageStreamError'; }
}
export async function streamGuestFile(url: string, request: Request, options?: { headersTimeoutMs: number }): Promise<Response> {
  const range = request.headers.get('range');
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) return new Response(null, { status: 416 });
  // URL comes only from our S3 signer; never from request input. No upstream redirect escape.
  const deadline = new AbortController(), requestSignal = request.signal;
  let cancelBody: (reason: unknown) => Promise<void> = async reason => { deadline.abort(reason); };
  const disconnected = () => { void cancelBody(requestSignal.reason).catch(() => deadline.abort(requestSignal.reason)); };
  requestSignal.addEventListener('abort', disconnected, { once: true }); if(requestSignal.aborted) disconnected();
  const timer = setTimeout(() => {void cancelBody(new DOMException('Storage transfer timed out','TimeoutError')).catch(() => deadline.abort());}, options?.headersTimeoutMs ?? 120_000);
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: range ? { Range: range } : {}, redirect: 'error',
      signal: deadline.signal });
  } catch(error) {clearTimeout(timer);requestSignal.removeEventListener('abort', disconnected);throw error;} finally {if(options)clearTimeout(timer);}
  if (![200, 206, 416].includes(upstream.status)) {
    clearTimeout(timer);await upstream.body?.cancel(); requestSignal.removeEventListener('abort', disconnected); throw new StorageStreamError(upstream.status);
  }
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff' });
  for (const key of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'content-disposition']) {
    const value = upstream.headers.get(key); if (value) headers.set(key, value);
  }
  if (!upstream.body) { clearTimeout(timer);requestSignal.removeEventListener('abort', disconnected); return new Response(upstream.body, { status: upstream.status, headers }); }
  // Retain Request itself: Node ties its parent abort listener to the Request-owned controller.
  // Keeping only request.signal lets GC unlink it during a long response.
  const reader = upstream.body.getReader(); let cleaned = false, terminated = false;
  let downstream: ReadableStreamDefaultController<Uint8Array> | undefined;
  cancelBody = async reason => { terminated=true;downstream?.error(reason);try{await reader.cancel(reason);}finally{deadline.abort(reason);cleanup();} };
  const cleanup = () => { if(cleaned)return; cleaned=true;clearTimeout(timer);request.signal.removeEventListener('abort', disconnected); reader.releaseLock(); };
  const body = new ReadableStream<Uint8Array>({
    start(controller) {downstream=controller;},
    async pull(controller) {
      try { const chunk=await reader.read(); if(terminated)return; if(chunk.done) {cleanup();controller.close();} else controller.enqueue(chunk.value); }
      catch(error) {if(terminated)return;cleanup();controller.error(error);}
    },
    async cancel(reason) { terminated=true;try {await reader.cancel(reason);} finally {deadline.abort(reason);cleanup();} },
  }, {highWaterMark:0});
  return new Response(body, { status: upstream.status, headers });
}
