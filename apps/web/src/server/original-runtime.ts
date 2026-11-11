import { createS3Client, generateDownloadUrl, headObject, getObjectBytes } from '@clipmaker/s3';
import { allowRead } from './rate-limit';
import { getRuntime } from './runtime';
import { createOriginalFileHandler } from './original-file';
import { streamGuestFile } from './guest-file';
export async function originalRoute(request: Request, { params }: { params: Promise<{ videoId: string }> }): Promise<Response> {
  const runtime = getRuntime(), ctx = { client: createS3Client(runtime.config.s3), bucket: runtime.config.s3.bucket };
  try {
    return await createOriginalFileHandler({ pool: runtime.pool, auth: runtime.auth, trustedProxyHops: runtime.config.trustedProxyHops,
      allowRead: (ip, account) => allowRead(runtime.redis, ip, runtime.config.sessionSecret, account),
      head: key => headObject(ctx, key), bytes: key => getObjectBytes(ctx, key, 'bytes=0-4095', 4096),
      sign: key => generateDownloadUrl(ctx, key), stream: (url, req) => streamGuestFile(url, req, { headersTimeoutMs: 15000 }) })(request, (await params).videoId);
  } finally { ctx.client.destroy(); }
}
