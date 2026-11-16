import { z } from 'zod';
import { ClipLayoutRepository, type Attempt } from '@clipmaker/db';
import { parseScreenFaceLayout } from '@clipmaker/shared/screen-layout';
import { UploadError } from './upload-contract';
const clip = z.object({clip_id:z.string().uuid()}).strict();
const prepare = z.object({clip_id:z.string().uuid(),expected_source_revision:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const apply = z.object({clip_id:z.string().uuid(),request_key:z.string().uuid(),expected_render_version:z.number().int().min(1),
  expected_source_revision:z.string().regex(/^[a-f0-9]{64}$/),layout:z.unknown(),reviewed_full_clip:z.literal(true)}).strict();
export class ClipLayoutService {
  constructor(private readonly repository:Pick<ClipLayoutRepository,'info'|'prepare'|'apply'>,private readonly enqueue:(job:Attempt)=>Promise<void>,
    private readonly enqueueSeed:(job:{clip_id:string;seed_revision:string})=>Promise<void>) {}
  private async operation<T>(fn:()=>Promise<T>):Promise<T> {
    try{return await fn();}catch(error){
      if(error instanceof Error && 'status' in error && 'code' in error
        && typeof error.status==='number' && ['not_found','conflict','refused'].includes(String(error.code)))
        throw new UploadError(error.code as 'not_found'|'conflict'|'refused',error.message,error.status);
      throw error;
    }
  }
  async layoutInfo(account:string,raw:unknown){
    const p=clip.safeParse(raw);if(!p.success)throw new UploadError('invalid','Проверьте клип',422);
    return this.operation(()=>this.repository.info(account,p.data.clip_id));
  }
  async prepareLayout(account:string,raw:unknown){
    const p=prepare.safeParse(raw);if(!p.success)throw new UploadError('invalid','Проверьте исходник',422);
    const result=await this.operation(()=>this.repository.prepare(account,p.data.clip_id,p.data.expected_source_revision));
    console.info(JSON.stringify({event:result.enqueue?'layout_seed_requested':'layout_seed_cache_hit',state:result.state}));
    if(result.enqueue){try{await this.enqueueSeed({clip_id:result.clip_id,seed_revision:result.seedRevision});}
      catch{console.error('layout_seed_delivery_pending');}}
    return {state:result.state,seedRevision:result.seedRevision};
  }
  async setLayout(account:string,raw:unknown){
    const p=apply.safeParse(raw);if(!p.success)throw new UploadError('invalid','Проверьте оформление и просмотр фрагмента',422);
    let layout;try{layout=parseScreenFaceLayout(p.data.layout);}catch{throw new UploadError('invalid','Области оформления непригодны',422);}
    const result=await this.operation(()=>this.repository.apply(account,{...p.data,layout}));
    if(result.attempt){try{await this.enqueue(result.attempt);}catch{console.error('layout_render_delivery_pending');}}
    return result.reply;
  }
}
