import { sha256 } from '@noble/hashes/sha2.js';

export const UPLOAD_HASH_CHUNK_BYTES = 4 * 1024 * 1024;
/** Полный локальный digest; никогда не буферизуем весь исходный File. */
export async function hashUploadFile(file: Blob, signal: AbortSignal): Promise<string> {
  const hash = sha256.create();
  try {
    for (let offset = 0; offset < file.size; offset += UPLOAD_HASH_CHUNK_BYTES) {
      signal.throwIfAborted();
      const bytes = await file.slice(offset, Math.min(file.size, offset + UPLOAD_HASH_CHUNK_BYTES)).arrayBuffer();
      signal.throwIfAborted();
      hash.update(new Uint8Array(bytes));
      signal.throwIfAborted();
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
    signal.throwIfAborted();
    return Array.from(hash.digest(), byte => byte.toString(16).padStart(2, '0')).join('');
  } finally { hash.destroy(); }
}
