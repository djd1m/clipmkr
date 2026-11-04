import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import { hashUploadFile, UPLOAD_HASH_CHUNK_BYTES } from '../apps/web/src/lib/upload-file-identity';

it('full_hash_covers_middle_bytes', async () => {
  for (const bytes of [Buffer.from('abc'), Buffer.alloc(UPLOAD_HASH_CHUNK_BYTES * 2 + 7, 65)]) {
    const expected = createHash('sha256').update(bytes).digest('hex');
    expect(await hashUploadFile(new Blob([bytes]), new AbortController().signal)).toBe(expected);
    bytes[Math.floor(bytes.length / 2)]! ^= 1;
    expect(await hashUploadFile(new Blob([bytes]), new AbortController().signal)).not.toBe(expected);
  }
});
it('same_bytes_ignore_metadata', async () => {
  const a = new File(['same'], 'a.mp4', {lastModified: 1});
  const b = new File(['same'], 'b.mp4', {lastModified: 999});
  expect(await hashUploadFile(a, new AbortController().signal)).toBe(await hashUploadFile(b, new AbortController().signal));
});
it('hash_reads_one_bounded_chunk_and_aborts', async () => {
  const abort = new AbortController(); let reads = 0, inFlight = 0, maxInFlight = 0, heartbeat = false;
  const file = new Blob([new Uint8Array(UPLOAD_HASH_CHUNK_BYTES * 3)]);
  const original = file.slice.bind(file);
  file.slice = (start, end) => {
    expect(end! - start!).toBeLessThanOrEqual(UPLOAD_HASH_CHUNK_BYTES);
    const chunk = original(start, end), read = chunk.arrayBuffer.bind(chunk);
    chunk.arrayBuffer = async () => { reads++; maxInFlight = Math.max(maxInFlight, ++inFlight); const value = await read(); inFlight--; return value; };
    return chunk;
  };
  setTimeout(() => { heartbeat = true; abort.abort(); }, 0);
  await expect(hashUploadFile(file, abort.signal)).rejects.toMatchObject({name: 'AbortError'});
  expect(heartbeat).toBe(true); expect(reads).toBeLessThan(3); expect(maxInFlight).toBe(1);
});
