import { Queue, type Job, type ConnectionOptions } from 'bullmq';
import type { JobStage } from '@clipmaker/shared/enums';
import { DEFAULT_JOB_OPTIONS, QUEUE_NAMES } from './constants.js';
export interface AttemptJob { video_id: string; stage: JobStage; fence: number; series_no: number; clip_id: string | null; step?: 'probe' | 'transcribe' }
export interface LayoutSeedJob { kind:'layout-seed';clip_id:string;seed_revision:string }
export type RenderMessage = LayoutSeedJob | (AttemptJob & {stage:'render';clip_id:string});
export function parseRenderMessage(value:unknown):RenderMessage {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!value || typeof value!=='object' || Array.isArray(value))throw new Error('invalid_render_message');
  const v=value as Record<string,unknown>,keys=Object.keys(v).sort().join(',');
  if(keys==='clip_id,kind,seed_revision' && v.kind==='layout-seed' && typeof v.clip_id==='string' && uuid.test(v.clip_id)
    && typeof v.seed_revision==='string' && /^[a-f0-9]{64}$/.test(v.seed_revision))return v as unknown as LayoutSeedJob;
  if(keys==='clip_id,fence,series_no,stage,video_id' && v.stage==='render' && typeof v.video_id==='string' && uuid.test(v.video_id)
    && typeof v.clip_id==='string' && uuid.test(v.clip_id) && Number.isSafeInteger(v.fence) && Number(v.fence)>0
    && Number.isSafeInteger(v.series_no) && Number(v.series_no)>0)return v as unknown as RenderMessage;
  throw new Error('invalid_render_message');
}
export function getRedisConnection(config: { redisUrl: string }, worker = true): ConnectionOptions {
  let url: URL;
  try { url = new URL(config.redisUrl); } catch { throw new Error('REDIS_URL непригоден: очередь недоступна'); }
  if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname || !url.password ||
    !/^\/(\d+)?$/.test(url.pathname || '/') || url.search || url.hash) {
    throw new Error('REDIS_URL: нужен адрес Redis с обязательным паролем и номером базы');
  }
  return { host: url.hostname, port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined, password: decodeURIComponent(url.password),
    db: Number(url.pathname.slice(1) || 0), ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: worker ? null : 1, enableOfflineQueue: worker, connectTimeout: 2000 };
}
export function jobId(job: Pick<AttemptJob, 'stage' | 'video_id' | 'fence'>): string {
  if (!QUEUE_NAMES.includes(job.stage) || !/^[a-f0-9-]{36}$/i.test(job.video_id) || !Number.isSafeInteger(job.fence) || job.fence < 1) {
    throw new Error('Непригодная идентичность задания');
  }
  return `${job.stage}:${job.video_id}:${job.fence}`;
}
export function createQueues(config: { redisUrl: string }) {
  const connection = getRedisConnection(config, false);
  const queues = Object.fromEntries(QUEUE_NAMES.map(stage => {
    const queue = new Queue<Job<AttemptJob|LayoutSeedJob>>(stage, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
    queue.on('error', () => console.error('Транспорт заданий временно недоступен'));
    return [stage, queue];
  })) as Record<JobStage, Queue<Job<AttemptJob|LayoutSeedJob>>>;
  return {
    queues,
    async enqueueSeed(job:Pick<LayoutSeedJob,'clip_id'|'seed_revision'>) {
      const data=parseRenderMessage({kind:'layout-seed',...job}) as LayoutSeedJob;
      const id=`layout-seed-${data.clip_id}-${data.seed_revision}`,queue=queues.render;
      const old=await queue.getJob(id);
      if(old){const state=await old.getState();if(state==='failed'||state==='completed')await old.retry(state);return;}
      await queue.add('layout-seed',data,{jobId:id,priority:1024});
    },
    async enqueue(job: AttemptJob, delay = 0) {
      const queue = queues[job.stage], id = jobId(job);
      const data = job.stage === 'render' ? parseRenderMessage({ video_id: job.video_id, stage: job.stage,
        fence: job.fence, series_no: job.series_no, clip_id: job.clip_id }) : job;
      const old = await queue.getJob(id);
      if (old) {
        if (job.stage === 'render') await old.updateData(data);
        const state = await old.getState();
        if (state !== 'failed' && state !== 'completed') return;
        if (delay === 0) { await old.retry(state); return; }
        // retry() discards delay; remove only a terminal job, then restore the same identity.
        await old.remove();
      }
      await queue.add(job.stage, data, { jobId: id, delay });
    },
    async close() { await Promise.all(Object.values(queues).map(q => q.close())); },
  };
}
