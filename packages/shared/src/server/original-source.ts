import { createHash } from 'node:crypto';
/** Accepted immutable upload identity; deliberately independent of render/CTA state. */
export function originalSourceRevision(videoId: string, objectKey: string, uploadId: string | null | undefined, actualBytes: string | bigint | number): string {
  return createHash('sha256').update(JSON.stringify(['original-source-v1', videoId, objectKey, uploadId ?? null, String(actualBytes)])).digest('hex');
}
