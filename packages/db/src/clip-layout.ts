import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import type { Limits } from '@clipmaker/shared/config';
import { parseScreenFaceLayout, parsePublishedLayout, type ScreenFaceLayoutV1, type NormalizedRect } from '@clipmaker/shared/screen-layout';
import { parseCutPlan } from '@clipmaker/shared/cut-timeline';
import { originalSourceRevision } from '@clipmaker/shared/server/original-source';
import { moscowDay, quotaResetAt } from '@clipmaker/shared/upload';
import { hasOwnerUnlimited } from './owner-entitlement.js';
import { clipAliveSql, retentionDeadlineSql } from './plan.js';
import { transaction, checkAndConsumeQuota } from './quota.js';
import { leaseAttemptTx } from './attempts.js';

export interface LayoutPublished {
  version: 1; requested: ScreenFaceLayoutV1;
  resolved: { cameraVisible: boolean; reason: string | null };
}
interface Context {
  id: string; video_id: string; account_id: string; object_key: string; upload_id: string | null;
  actual_bytes: string; start_seconds: string; end_seconds: string; cut_plan: [number, number][] | null;
  render_version: number; rendered_layout: LayoutPublished | null;
  sourceRevision: string; seedRevision: string;
  retention_deadline:Date|null;
}
interface Seed {
  clip_id: string; source_revision: string; seed_revision: string;
  status: 'pending' | 'running' | 'ready' | 'unavailable'; lease_epoch: number;
  lease_until: Date | null; attempts: number; payload: NormalizedRect | null; reason: string | null;
}
interface Apply {
  clip_id: string; request_key: string; expected_render_version: number;
  expected_source_revision: string; layout: ScreenFaceLayoutV1;
}
function refuse(code: 'not_found' | 'conflict' | 'refused', message: string, status: number) {
  return Object.assign(new Error(message), { code, status });
}
function canonical(value: unknown): string { return JSON.stringify(parseScreenFaceLayout(value)); }
const model = '8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4';

/** Dependent entities only: execution, quota, retention and fence remain canonical existing helpers. */
export class ClipLayoutRepository {
  constructor(private readonly pool: Pool, private readonly limits: Limits|null, private readonly clock = () => new Date()) {}
  private async lockLayoutClip(tx: PoolClient, clipId: string, account: string | null) {
    const video = await tx.query(`SELECT v.id FROM video v JOIN account a ON a.id=v.account_id JOIN clip c ON c.video_id=v.id
      WHERE c.id=$1 AND ($2::uuid IS NULL OR v.account_id=$2) AND v.deleted_at IS NULL AND a.status='active' FOR UPDATE OF v`, [clipId, account]);
    if (!video.rowCount) throw refuse('not_found', 'Клип не найден', 404);
    if (!(await tx.query('SELECT id FROM clip WHERE id=$1 FOR UPDATE', [clipId])).rowCount)
      throw refuse('not_found', 'Клип не найден', 404);
  }
  private async context(tx: PoolClient, clipId: string, account: string | null, allowRenderingVideo = false): Promise<Context> {
    const now = this.clock();
    await this.lockLayoutClip(tx,clipId,account);
    const result = await tx.query<Context>(`SELECT c.id,c.video_id,v.account_id,v.object_key,v.upload_id,v.actual_bytes,
      c.start_seconds,c.end_seconds,c.cut_plan,c.render_version,c.rendered_layout,${retentionDeadlineSql('c','v','a','$2')} AS retention_deadline FROM clip c
      JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id
      WHERE c.id=$1 AND c.status='done' AND (v.status='done' OR ($3::boolean AND v.status='rendering')) AND c.object_key IS NOT NULL
      AND v.object_key IS NOT NULL AND v.actual_bytes>0 AND ${clipAliveSql('c','v','a','$2')}
      FOR UPDATE OF c`, [clipId, now, allowRenderingVideo]);
    const row = result.rows[0];
    if (!row) throw refuse('conflict', 'Клип или исходник недоступен', 409);
    if (row.cut_plan !== null) parseCutPlan(row.cut_plan, Number(row.start_seconds), Number(row.end_seconds));
    const sourceRevision = originalSourceRevision(row.video_id, row.object_key, row.upload_id, row.actual_bytes);
    const seedRevision = createHash('sha256').update(JSON.stringify(['layout-seed-v1', sourceRevision,
      String(row.start_seconds), String(row.end_seconds), row.cut_plan, model])).digest('hex');
    return { ...row, sourceRevision, seedRevision };
  }
  private async outcome(tx: PoolClient, clipId: string, series: number, version: number) {
    const attempts = (await tx.query<{ status: string }>('SELECT status FROM job_attempt WHERE clip_id=$1 AND series_no=$2 ORDER BY attempt_no DESC LIMIT 1', [clipId, series])).rows[0];
    const published = (await tx.query<{ object_key: string | null }>('SELECT object_key FROM clip WHERE id=$1', [clipId])).rows[0]?.object_key;
    return attempts?.status==='succeeded' || published?.match(/-v([1-9][0-9]*)\.mp4$/)?.[1] === String(version) ? 'succeeded' as const
      : attempts?.status === 'failed' ? 'failed' as const : 'pending' as const;
  }
  async info(account: string, clipId: string) {
    const limits=this.limits;if(!limits)throw new Error('Read quota policy required');
    return transaction(this.pool, async tx => {
      const c = await this.context(tx, clipId, account);
      const seed = (await tx.query<Seed>('SELECT * FROM clip_layout_seed WHERE clip_id=$1 AND seed_revision=$2', [clipId,c.seedRevision])).rows[0];
      const intent = (await tx.query<{request_key:string;render_version:number;series_no:number;layout:ScreenFaceLayoutV1}>('SELECT * FROM clip_layout_intent WHERE clip_id=$1 ORDER BY render_version DESC LIMIT 1', [clipId])).rows[0];
      const publishedLayout=c.rendered_layout===null?null:parsePublishedLayout(c.rendered_layout);
      const intentLayout=intent?parseScreenFaceLayout(intent.layout):null;
      const proposal=seed?.status==='ready'?parseScreenFaceLayout({version:1,mode:'screen-face',variant:'03',
        screen:{x:0,y:0,width:1,height:1},focus:null,camera:seed.payload}).camera:null;
      if(seed?.status==='ready' && !proposal)throw new Error('Непригодное предложение камеры');
      const unlimited = await hasOwnerUnlimited(tx, account), now = this.clock();
      const used = Number((await tx.query<{used:number}>(`SELECT used FROM quota_counter WHERE scope='user_rerenders' AND scope_key=$1 AND day=$2`, [account,moscowDay(now)])).rows[0]?.used ?? 0);
      const key = (await tx.query<{object_key:string}>('SELECT object_key FROM clip WHERE id=$1',[clipId])).rows[0]!.object_key;
      return { accountScope:account, sourceRevision:c.sourceRevision, cutPlan:c.cut_plan,
        start:Number(c.start_seconds),end:Number(c.end_seconds),renderVersion:c.render_version,
        publishedRenderVersion:Number(key.match(/-v([1-9][0-9]*)\.mp4$/)?.[1] ?? 1),publishedLayout,
        seed:seed ? {state:seed.status,proposal,reason:seed.reason} : {state:'absent',proposal:null,reason:null},
        rerenderQuota:{available:unlimited || used<limits.N5_LIMIT_USER_RERENDERS,unlimited,
          limit:unlimited?null:limits.N5_LIMIT_USER_RERENDERS,remaining:unlimited?null:Math.max(0,limits.N5_LIMIT_USER_RERENDERS-used),resetsAt:quotaResetAt(now)},
        activeIntent:intent ? {...intent,layout:intentLayout!,status:await this.outcome(tx,clipId,intent.series_no,intent.render_version)} : null };
    });
  }
  async apply(account: string, input: Apply) {
    const limits=this.limits;if(!limits)throw new Error('Apply quota policy required');
    return transaction(this.pool, async tx => {
      await this.lockLayoutClip(tx,input.clip_id,account);
      const layout = parseScreenFaceLayout(input.layout);
      const previous = (await tx.query<Apply & {base_render_version:number;render_version:number;series_no:number;source_revision:string}>(
        'SELECT * FROM clip_layout_intent WHERE clip_id=$1 AND request_key=$2',[input.clip_id,input.request_key])).rows[0];
      if (previous) {
        if (previous.base_render_version!==input.expected_render_version || previous.source_revision!==input.expected_source_revision
          || canonical(previous.layout)!==canonical(layout)) throw refuse('conflict','Этот запрос уже связан с другим оформлением',409);
        return {reply:{clip_id:input.clip_id,request_key:input.request_key,render_version:previous.render_version,
          status:await this.outcome(tx,input.clip_id,previous.series_no,previous.render_version),replayed:true},attempt:null};
      }
      let c:Context;
      try{c=await this.context(tx,input.clip_id,account);}catch(error){
        if(error instanceof Error && 'status' in error && error.status===409)throw refuse('refused',error.message,409);
        throw error;
      }
      if (input.expected_source_revision!==c.sourceRevision || input.expected_render_version!==c.render_version)
        throw refuse('refused','Исходник или версия клипа изменились; черновик сохранён',409);
      const active = await tx.query(`SELECT 1 FROM job_attempt WHERE video_id=$1 AND rerender AND status IN ('running','deferred')`,[c.video_id]);
      if (active.rowCount) throw refuse('refused','Дождитесь текущей пересборки',409);
      const quota = await checkAndConsumeQuota(tx,limits,account,'rerender',1,this.clock());
      if (!quota.granted) throw refuse('refused','Дневной лимит пересборки исчерпан',429);
      const version = c.render_version+1;
      await tx.query('UPDATE clip SET render_version=$2 WHERE id=$1',[c.id,version]);
      const series = Number((await tx.query('SELECT COALESCE(max(series_no),0)+1 AS n FROM job_attempt WHERE video_id=$1',[c.video_id])).rows[0].n);
      const attempt = await leaseAttemptTx(tx,c.video_id,'render',series,c.id,this.clock(),true);
      if (!attempt) throw new Error('Пересборка не получила попытку');
      await tx.query(`INSERT INTO clip_layout_intent(clip_id,request_key,source_revision,base_render_version,render_version,series_no,layout)
        VALUES($1,$2,$3,$4,$5,$6,$7)`,[c.id,input.request_key,c.sourceRevision,c.render_version,version,series,canonical(layout)]);
      return {reply:{clip_id:c.id,request_key:input.request_key,render_version:version,status:'pending' as const,replayed:false},attempt};
    });
  }
  async prepare(account:string,clipId:string,revision:string) {
    return transaction(this.pool,async tx => {
      const c=await this.context(tx,clipId,account);
      if(c.sourceRevision!==revision)throw refuse('conflict','Исходник изменился',409);
      const row=(await tx.query<Seed>(`INSERT INTO clip_layout_seed(clip_id,source_revision,seed_revision,status) VALUES($1,$2,$3,'pending')
        ON CONFLICT(clip_id) DO UPDATE SET source_revision=EXCLUDED.source_revision,seed_revision=EXCLUDED.seed_revision,
        status='pending',attempts=0,lease_epoch=clip_layout_seed.lease_epoch+1,lease_until=NULL,payload=NULL,reason=NULL,updated_at=now()
        WHERE clip_layout_seed.seed_revision<>EXCLUDED.seed_revision RETURNING *`,[c.id,c.sourceRevision,c.seedRevision])).rows[0];
      const seed=row??(await tx.query<Seed>('SELECT * FROM clip_layout_seed WHERE clip_id=$1',[c.id])).rows[0]!;
      return {state:seed.status,seedRevision:c.seedRevision,enqueue:!!row,clip_id:c.id};
    });
  }
  async claimSeed(clipId:string,seedRevision:string) {
    return transaction(this.pool,async tx=>{
      let c:Context;try{c=await this.context(tx,clipId,null);}catch(error){if(error instanceof Error && 'status' in error){
        await tx.query(`UPDATE clip_layout_seed SET status='unavailable',reason='source_access_unavailable',lease_until=NULL,payload=NULL,updated_at=$3
          WHERE clip_id=$1 AND seed_revision=$2 AND (status='pending' OR (status='running' AND lease_until<$3))`,[clipId,seedRevision,this.clock()]);
        return null;
      }throw error;}
      if(c.seedRevision!==seedRevision){
        await tx.query(`UPDATE clip_layout_seed SET status='unavailable',reason='source_access_unavailable',lease_until=NULL,payload=NULL,updated_at=$3
          WHERE clip_id=$1 AND seed_revision=$2 AND (status='pending' OR (status='running' AND lease_until<$3))`,[clipId,seedRevision,this.clock()]);
        return null;
      }
      const seed=(await tx.query<Seed>(`UPDATE clip_layout_seed SET status='running',lease_epoch=lease_epoch+1,
        attempts=attempts+1,lease_until=$3::timestamptz+interval '30 seconds',updated_at=$3
        WHERE clip_id=$1 AND seed_revision=$2 AND attempts<2 AND (status='pending' OR (status='running' AND lease_until<$3)) RETURNING *`,[clipId,seedRevision,this.clock()])).rows[0];
      return seed ? {...c,epoch:seed.lease_epoch,deadline:seed.lease_until!} : null;
    });
  }
  async currentSeed(clipId:string,seedRevision:string,epoch:number) {
    return transaction(this.pool,async tx=>{
      let c:Context;try{c=await this.context(tx,clipId,null);}catch(error){if(error instanceof Error && 'status' in error)return null;throw error;}
      if(c.seedRevision!==seedRevision)return null;
      const live=await tx.query(`SELECT 1 FROM clip_layout_seed WHERE clip_id=$1 AND seed_revision=$2 AND lease_epoch=$3 AND status='running' AND lease_until>$4`,[clipId,seedRevision,epoch,this.clock()]);
      return live.rowCount?c:null;
    });
  }
  async finishSeed(clipId:string,seedRevision:string,epoch:number,camera:NormalizedRect|null,reason='camera_unavailable') {
    return transaction(this.pool,async tx=>{
      let c:Context;try{c=await this.context(tx,clipId,null);}catch(error){if(error instanceof Error && 'status' in error)return false;throw error;}
      if(c.seedRevision!==seedRevision)return false;
      if(camera)parseScreenFaceLayout({version:1,mode:'screen-face',variant:'03',screen:{x:0,y:0,width:1,height:1},focus:null,camera});
      const done=await tx.query(`UPDATE clip_layout_seed SET status=$4,payload=$5,reason=$6,lease_until=NULL,updated_at=$7
        WHERE clip_id=$1 AND seed_revision=$2 AND lease_epoch=$3 AND status='running' AND lease_until>$7`,
      [clipId,seedRevision,epoch,camera?'ready':'unavailable',camera?JSON.stringify(camera):null,camera?null:reason,this.clock()]);
      return !!done.rowCount;
    });
  }
  async pendingSeeds() {
    const now=this.clock();
    const eligible=`EXISTS (SELECT 1 FROM clip c JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id
      WHERE c.id=s.clip_id AND a.status='active' AND v.deleted_at IS NULL AND c.status='done' AND v.status='done'
      AND c.object_key IS NOT NULL AND v.object_key IS NOT NULL AND v.actual_bytes>0 AND ${clipAliveSql('c','v','a','$1')})`;
    await this.pool.query(`UPDATE clip_layout_seed s SET status='unavailable',
      reason=CASE WHEN attempts>=2 THEN 'analysis_timeout' ELSE 'source_access_unavailable' END,lease_until=NULL,payload=NULL,updated_at=$1
      WHERE (status='pending' OR (status='running' AND lease_until<$1)) AND (attempts>=2 OR NOT ${eligible})`,[now]);
    return (await this.pool.query<{clip_id:string;seed_revision:string}>(`SELECT clip_id,seed_revision FROM clip_layout_seed s
      WHERE (status='pending' OR (status='running' AND lease_until<$1)) AND attempts<2 AND ${eligible}
      ORDER BY updated_at,clip_id LIMIT 100`,[now])).rows;
  }
  async rememberSeed(clipId:string,camera:NormalizedRect|null) {
    return transaction(this.pool,async tx=>{
      const c=await this.context(tx,clipId,null,true);
      if(camera)parseScreenFaceLayout({version:1,mode:'screen-face',variant:'03',screen:{x:0,y:0,width:1,height:1},focus:null,camera});
      await tx.query(`INSERT INTO clip_layout_seed(clip_id,source_revision,seed_revision,status,payload,reason)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(clip_id) DO NOTHING`,
      [clipId,c.sourceRevision,c.seedRevision,camera?'ready':'unavailable',camera?JSON.stringify(camera):null,camera?null:'camera_unavailable']);
    });
  }
}
