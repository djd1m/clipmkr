// Адаптировано из .reference/jan-clone/packages/s3/src/operations.ts. Повторы выполняет SDK.
import { HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { FAST_REQUEST_TIMEOUT_MS, type StorageContext } from './client.js';
export async function headObject(ctx: StorageContext, key: string): Promise<bigint> {
  const result = await ctx.client.send(new HeadObjectCommand({ Bucket: ctx.bucket, Key: key }), { requestTimeout: FAST_REQUEST_TIMEOUT_MS });
  if (!Number.isSafeInteger(result.ContentLength) || result.ContentLength! < 0) throw new Error('Хранилище не сообщило размер файла');
  return BigInt(result.ContentLength!);
}
export async function getObjectBytes(ctx: StorageContext, key: string, range = 'bytes=0-4095', maxBytes?: number): Promise<Uint8Array> {
  if (maxBytes !== undefined && (!Number.isSafeInteger(maxBytes) || maxBytes < 1)) throw new Error('Invalid byte limit');
  const result = await ctx.client.send(new GetObjectCommand({ Bucket: ctx.bucket, Key: key, Range: range }),
    { requestTimeout: FAST_REQUEST_TIMEOUT_MS, abortSignal: AbortSignal.timeout(FAST_REQUEST_TIMEOUT_MS) });
  if (!result.Body) throw new Error('Хранилище не вернуло байты файла');
  if (maxBytes === undefined) return result.Body.transformToByteArray();
  const reader = result.Body.transformToWebStream().getReader();
  let complete = false;
  try {
    if (result.ContentLength !== undefined && result.ContentLength > maxBytes) throw new Error('Storage byte limit exceeded');
    const output = new Uint8Array(maxBytes); let size = 0;
    while (true) {
      const next = await reader.read();
      if (next.done) { complete = true; return output.slice(0, size); }
      if (next.value.byteLength > maxBytes - size) throw new Error('Storage byte limit exceeded');
      output.set(next.value, size); size += next.value.byteLength;
    }
  } finally { try { if (!complete) await reader.cancel(); } finally { reader.releaseLock(); } }
}
export async function deleteObject(ctx: StorageContext, key: string): Promise<void> {
  await ctx.client.send(new DeleteObjectCommand({ Bucket: ctx.bucket, Key: key }), { requestTimeout: FAST_REQUEST_TIMEOUT_MS });
}
