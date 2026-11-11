import { expect, it } from 'vitest';
import { detectOriginalMedia, isAllowedMedia } from '../apps/web/src/server/media-type';
function ftyp(brand: string, compatible = '') { const b = Buffer.alloc(16 + compatible.length); b.writeUInt32BE(b.length); b.write('ftyp',4); b.write(brand,8); b.write(compatible,16); return b; }
it('original_magic_ignores_key_suffix', () => {
  for (const [bytes, kind, mime, extension] of [
    [ftyp('isom'), 'video', 'video/mp4', 'mp4'], [ftyp('isom','M4A '), 'audio','audio/mp4','m4a'],
    [ftyp('qt  '), 'video','video/quicktime','mov'], [Buffer.from('000000086d6f6f76','hex'),'video','video/quicktime','mov'],
    [Buffer.from('1a45dfa3004282847765626d','hex'),'video','video/webm','webm'], [Buffer.from('49443304000000000000','hex'),'audio','audio/mpeg','mp3'],
    [Buffer.from('fffb9064','hex'),'audio','audio/mpeg','mp3'], [Buffer.from('not media.mp4'),'unknown','application/octet-stream','bin'],
  ] as const) {
    expect(detectOriginalMedia(bytes)).toEqual({kind,mime,extension}); expect(isAllowedMedia(bytes)).toBe(kind !== 'unknown');
  }
});
it('rejects malformed ftyp, ID3 and MPEG frames without changing upload truth table', () => {
  const oversize = ftyp('isom'); oversize.writeUInt32BE(4097);
  const undersize = ftyp('isom'); undersize.writeUInt32BE(12);
  for (const bytes of [oversize, undersize, ftyp('zzzz'), Buffer.from('49443309000000000000','hex'), Buffer.from('49443304000080000000','hex'),
    Buffer.from('fff89000','hex'),Buffer.from('fffbf064','hex'),Buffer.from('fffb9c64','hex'),Buffer.from('fffb0064','hex'),Buffer.from('ID3')]) {
    expect(isAllowedMedia(bytes)).toBe(false); expect(detectOriginalMedia(bytes).kind).toBe('unknown');
  }
});
