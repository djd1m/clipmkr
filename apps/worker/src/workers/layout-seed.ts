import type { ClipLayoutRepository } from '@clipmaker/db';
import type { LayoutSeedJob } from '@clipmaker/queue';
import { detectFaces } from '../render/faces.js';
import { proposeLayoutCamera } from '../render/screen-layout.js';

export async function handleLayoutSeedJob(job:LayoutSeedJob,deps:{repository:ClipLayoutRepository;
  sign:(key:string,notAfter:Date)=>Promise<string>;origin:string;allowHttp:boolean}) {
  const started=Date.now(),claim=await deps.repository.claimSeed(job.clip_id,job.seed_revision);
  if(!claim){console.info(JSON.stringify({event:'layout_seed_lease_stale'}));return;}
  const deadline=Math.min(claim.deadline.getTime(),started+30_000);
  const signal=AbortSignal.timeout(Math.max(1,deadline-Date.now()));
  let camera=null,reason='source_access_unavailable';
  try {
    const current=await deps.repository.currentSeed(job.clip_id,job.seed_revision,claim.epoch);if(!current)return;
    const notAfter=new Date(Math.min(deadline,current.retention_deadline?.getTime()??Infinity));
    const url=await deps.sign(current.object_key,notAfter);
    if(!await deps.repository.currentSeed(job.clip_id,job.seed_revision,claim.epoch))return;
    const report=await detectFaces(url,Number(claim.start_seconds),Number(claim.end_seconds),signal,
      {remote:{origin:deps.origin,allowHttp:deps.allowHttp},timeoutMs:Math.max(1,notAfter.getTime()-Date.now()),
        authorizeSource:async()=>!!await deps.repository.currentSeed(job.clip_id,job.seed_revision,claim.epoch)});
    camera=proposeLayoutCamera(report);
    if(report)reason='camera_unavailable';
  } catch {console.info(JSON.stringify({event:'layout_seed_unavailable',reason:'source_access_unavailable'}));}
  const accepted=Date.now()<deadline && await deps.repository.finishSeed(job.clip_id,job.seed_revision,claim.epoch,camera,reason);
  console.info(JSON.stringify({event:accepted?(camera?'layout_seed_ready':'layout_seed_unavailable'):'layout_seed_lease_stale',
    reason:camera?null:reason,elapsed_ms:Date.now()-started,source_byte_size:Number(claim.actual_bytes)}));
}
