import { z } from 'zod';
import { MAX_UPLOAD_BYTES } from '@clipmaker/shared/upload';
import { CTA_KIND } from '@clipmaker/shared/enums';
import { parseCtaTarget } from '@clipmaker/shared/cta';

export const UPLOAD_RESUME_VERSION = 2;
const schema = z.object({
  version: z.literal(UPLOAD_RESUME_VERSION), accountScope: z.string().uuid(), key: z.string().uuid(),
  identityAlgorithm: z.literal('sha256'), contentSha256: z.string().regex(/^[0-9a-f]{64}$/),
  size: z.number().int().positive().max(MAX_UPLOAD_BYTES),
  originalFilename: z.string().min(1).max(255).refine(s => s.trim() === s && !/[\x00-\x1f/\\]/.test(s)),
  options: z.object({music:z.boolean(),teaser:z.boolean(),compact:z.boolean(),ctaKind:z.enum(CTA_KIND),ctaUrl:z.string().nullable()}).strict()
    .refine(options => {try {parseCtaTarget(options.ctaKind,options.ctaUrl); return true;} catch {return false;}}),
  videoId: z.string().uuid().optional(),
  partSize: z.number().int().min(10 * 1024 * 1024).max(Math.max(10 * 1024 * 1024, Math.ceil(MAX_UPLOAD_BYTES / 100))).optional(),
  parts: z.array(z.object({part_number:z.number().int().min(1).max(200),etag:z.string().min(1).max(256)}).strict()).min(1).max(200).optional(),
}).strict().superRefine((value,ctx) => {
  if ((value.videoId === undefined) !== (value.partSize === undefined)) ctx.addIssue({code:'custom',message:'Неполный server receipt'});
  if (value.parts && (!value.videoId || !value.partSize || value.parts.length !== Math.ceil(value.size/value.partSize) ||
    value.parts.some((part,index) => part.part_number !== index+1))) ctx.addIssue({code:'custom',message:'Неполный manifest частей'});
});
export type UploadResumeV2 = z.infer<typeof schema>;
export type UploadResumeRead = {kind:'found';value:UploadResumeV2} | {kind:'absent'|'legacy'|'invalid'|'storageUnavailable'};
type ResumeStorage = Pick<Storage,'getItem'|'setItem'|'removeItem'>;
export function uploadResumeStorageKey(accountScope:string):string {return `n5-upload-resume:v2:${accountScope}`;}
export function readUploadResume(accountScope:string,storage?:ResumeStorage):UploadResumeRead {
  try {
    const store=storage ?? sessionStorage, raw=store.getItem(uploadResumeStorageKey(accountScope));
    if (raw === null || raw === undefined) return {kind:store.getItem('n5-upload-resume') == null ? 'absent':'legacy'};
    const parsed=schema.safeParse(JSON.parse(raw));
    return parsed.success && parsed.data.accountScope===accountScope ? {kind:'found',value:parsed.data}:{kind:'invalid'};
  } catch (cause) {return {kind:cause instanceof SyntaxError ? 'invalid':'storageUnavailable'};}
}
export function writeUploadResume(value:UploadResumeV2,storage?:ResumeStorage):{ok:boolean} {
  try {
    const parsed=schema.safeParse(value); if(!parsed.success) return {ok:false};
    const store=storage ?? sessionStorage, serialized=JSON.stringify(parsed.data);
    store.setItem(uploadResumeStorageKey(value.accountScope),serialized);
    return {ok:store.getItem(uploadResumeStorageKey(value.accountScope))===serialized};
  } catch {return {ok:false};}
}
export function clearUploadResume(accountScope:string,key:string,storage?:ResumeStorage):{ok:boolean} {
  try {
    const store=storage ?? sessionStorage, current=readUploadResume(accountScope,store);
    if(current.kind!=='found' || current.value.key!==key) return {ok:false};
    store.removeItem(uploadResumeStorageKey(accountScope));
    return {ok:store.getItem(uploadResumeStorageKey(accountScope))===null};
  } catch {return {ok:false};}
}
