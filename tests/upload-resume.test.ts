import { expect, it } from 'vitest';
import { readUploadResume, writeUploadResume, clearUploadResume, uploadResumeStorageKey } from '../apps/web/src/lib/upload-resume';
const scope = '11111111-1111-4111-8111-111111111111', key = '22222222-2222-4222-8222-222222222222';
const session = {version: 2 as const, accountScope: scope, key, identityAlgorithm: 'sha256' as const, contentSha256: 'a'.repeat(64), size: 20,
  originalFilename: 'a.mp4', options: {music: false, teaser: true, compact: true, ctaKind: 'none' as const, ctaUrl: null}};
function storage() { const values = new Map<string,string>(); return {values, getItem: (k: string) => values.get(k) ?? null,
  setItem: (k: string,v: string) => {values.set(k,v);}, removeItem: (k: string) => {values.delete(k);} }; }
it('resume_v2_rejects_legacy_foreign_and_malformed', () => {
  const store = storage(); store.setItem('n5-upload-resume','{}'); expect(readUploadResume(scope,store).kind).toBe('legacy');
  for (const patch of [{version: 3},{accountScope:key},{extra:true},{size:Infinity},{key:'key'},{contentSha256:'A'.repeat(64)},
    {options:{...session.options,ctaKind:'other'}},{options:{...session.options,ctaKind:'open_link',ctaUrl:'http://bad.test'}}]) {
    store.setItem(uploadResumeStorageKey(scope), JSON.stringify({...session,...patch})); expect(readUploadResume(scope,store).kind).toBe('invalid');
  }
  expect(writeUploadResume(session, store).ok).toBe(true); expect(readUploadResume(scope, store)).toEqual({kind:'found',value:session});
});
it('resume_manifest_requires_complete_parts', () => {
  const store = storage();
  for (const patch of [{videoId:key},{partSize:10485760},{videoId:key,partSize:4},
    {videoId:key,partSize:10485760,parts:[]},{videoId:key,partSize:10485760,parts:[{part_number:2,etag:'x'}]},
    {videoId:key,partSize:10485760,parts:[{part_number:1,etag:''}]}]) {
    store.setItem(uploadResumeStorageKey(scope),JSON.stringify({...session,...patch})); expect(readUploadResume(scope,store).kind).toBe('invalid');
  }
  expect(writeUploadResume({...session,videoId:key,partSize:10485760,parts:[{part_number:1,etag:'opaque'}]},store).ok).toBe(true);
});
it('storage_failures_are_explicit', () => {
  const store = storage(), throwing = {...store,getItem: () => {throw new Error('blocked');}};
  expect(readUploadResume(scope,throwing).kind).toBe('storageUnavailable');
  expect(writeUploadResume(session,{...store,setItem:()=>{}}).ok).toBe(false);
  expect(writeUploadResume(session,store).ok).toBe(true);
  expect(clearUploadResume(scope,key,{...store,removeItem:()=>{throw new Error('blocked');}}).ok).toBe(false);
  expect(clearUploadResume(scope,scope,store).ok).toBe(false); expect(readUploadResume(scope,store).kind).toBe('found');
  expect(clearUploadResume(scope,key,store).ok).toBe(true);
});
it('resume_filename_matches_create_filename_normalization', () => {
  const store=storage();
  expect(writeUploadResume({...session,originalFilename:'  podcast.mp4  '},store).ok).toBe(true);
  expect(readUploadResume(scope,store)).toEqual({kind:'found',value:{...session,originalFilename:'podcast.mp4'}});
});
