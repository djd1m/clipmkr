#!/usr/bin/env node
// Fixed local VPS operations. No caller commands, transports, rebuilds, media operations or down migrations.
import { readFileSync, writeFileSync, openSync, closeSync, lstatSync, realpathSync, existsSync, unlinkSync, ftruncateSync, writeSync, fsyncSync, fstatSync, readSync, constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyZoomLayoutConformance } from './check-zoom-layout-conformance.mjs';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const services = ['worker-video','worker-llm','worker-stt'];
function need(ok,message) { if(!ok) throw new Error(`zoom apply: ${message}`); }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function run(args, input, outputFd, timeout=120000) {
  const env={...process.env};delete env.DOCKER_CONTEXT;delete env.DOCKER_HOST;delete env.DOCKER_TLS_VERIFY;delete env.DOCKER_CERT_PATH;
  const r = spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{input,env,encoding:'utf8',...(outputFd===undefined?{}:{stdio:['ignore',outputFd,'pipe']}),timeout,maxBuffer:32*1024*1024});
  need(!r.error && !r.signal && r.status===0,'Docker operation failed; admissions remain closed, inspect private state');
  return (r.stdout??'').trim();
}
function secure(path, directory=false) {
  need(typeof path==='string' && resolve(path)===path && realpathSync(path)===path && !path.startsWith(root+'/'),'private external path required');
  const s=lstatSync(path);
  need(s.uid===process.getuid() && (directory ? s.isDirectory() && (s.mode&0o077)===0 : s.isFile() && (s.mode&0o777)===0o600),'private ownership/mode required');
}
const snapshotSql = `SELECT json_build_object(
 'credits',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM video_credit_charge t),
 'grants',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM credit_grant t),
 'allocations',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM credit_allocation t),
 'quota',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM quota_counter t),
 'intents',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM clip_layout_intent t),
 'accounts',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY row_to_json(t)::text),'')) FROM account t),
 'keys',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY id::text),'')) FROM clip t),
 'sources',(SELECT md5(COALESCE(string_agg(row_to_json(t)::text,'' ORDER BY id::text),'')) FROM video t),
 'journal',(SELECT json_object_agg(name,sha256) FROM _schema_migration)) AS snapshot`;
const idleProgram = String.raw`
const {Pool}=require('pg');const {Queue}=require('bullmq');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const u=new URL(process.env.REDIS_URL);const connection={host:u.hostname,port:Number(u.port||6379),password:decodeURIComponent(u.password),username:u.username?decodeURIComponent(u.username):undefined,db:Number(u.pathname.slice(1)||0),...(u.protocol==='rediss:'?{tls:{}}:{})};
(async()=>{let queues=[];try{const r=await pool.query("SELECT count(*)::int AS n FROM job_attempt WHERE status IN ('running','deferred')");
for(const name of ['stt','select','render']){const q=new Queue(name,{connection});queues.push(q);const c=await q.getJobCounts('active','wait','delayed','prioritized','waiting-children');if(Object.values(c).some(n=>n!==0))throw Error('busy');}
const v=await pool.query("SELECT count(*)::int AS n FROM video WHERE status IN ('queued','transcribing','selecting','rendering') AND deleted_at IS NULL");
console.log(JSON.stringify({idle:r.rows[0].n===0&&v.rows[0].n===0}));}finally{await Promise.all(queues.map(q=>q.close()));await pool.end();}})().catch(()=>{console.error('drain unavailable or busy');process.exitCode=1;});`;
function observedApps(binding, docker=run) {
  const result={};
  for(const service of ['web',...services]) {
    const ids=docker(['ps','-aq','--no-trunc','--filter','label=com.docker.compose.project=clipmkr-stage-20261028','--filter',`label=com.docker.compose.service=${service}`]).split('\n');
    need(ids.length===1 && /^[a-f0-9]{64}$/.test(ids[0]),'app service identity ambiguous');
    const [c]=JSON.parse(docker(['inspect',ids[0]]));
    result[service]={containerId:c.Id,imageId:c.Image};
  }
  return result;
}
function unchangedResources(binding, docker=run, machineId=hash(readFileSync('/etc/machine-id'))) {
  need(machineId===binding.machineIdSha256,'machine changed');
  for(const service of ['db','redis']) {
    const expected=binding.containers[service], [c]=JSON.parse(docker(['inspect',expected.containerId]));
    need(c.Id===expected.containerId && c.Image===expected.imageId && c.State.Running,'DB/Redis identity/state changed');
    const volumes=c.Mounts.map(m=>({type:m.Type,name:m.Name??null,destination:m.Destination}));
    need(JSON.stringify(volumes)===JSON.stringify(expected.volumes),'DB/Redis volume changed');
    need(JSON.stringify(Object.keys(c.NetworkSettings.Networks).sort())===JSON.stringify([...expected.networks].sort()),'DB/Redis network changed');
  }
}
function fixedExecutor(context, dependencies) {
  const now=dependencies.now??Date.now;
  const docker=dependencies.docker??run, sleep=dependencies.sleep??(ms=>new Promise(done=>setTimeout(done,ms)));
  const {binding,images,directory,mode,candidate}=context;
  const selected=mode==='rollback-c0'?images.c0.images:images.images;
  const override=resolve(directory,'compose-images.private.json'),composeSnapshot=resolve(directory,'compose-base.private.json');
  const base=['compose','--project-directory',dirname(binding.composePath),'-p','clipmkr-stage-20261028','-f',composeSnapshot,'-f',override];
  let before;
  const ingress=binding.ingress, stable=value=>JSON.stringify(value,(_k,v)=>v && typeof v==='object' && !Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
  const {source,closedSource,closedConfig}=context.derivedIngress;
  let expectedSource=context.ingressState.source==='closed'?closedSource:source;
  let expectedConfig=context.ingressState.active==='closed'?closedConfig:context.ingressConfig;
  let sourceFailure=null,admissionQualified=false;
  const node=(value,path)=>path.slice(1).split('/').reduce((v,k)=>v[k],value);
  const api=()=>JSON.parse(docker(['exec',ingress.containerId,'wget','-q','-O','-','http://127.0.0.1:2019/config/']));
  function ingressIdentity() {
    const [c]=JSON.parse(docker(['inspect',ingress.containerId]));
    need(c.Id===ingress.containerId && c.Image===ingress.imageId && c.State.Running && c.State.StartedAt===ingress.startedAt,'ingress identity/restart changed');
    need(stable(c.Mounts.map(m=>({source:m.Source,destination:m.Destination,rw:m.RW})))===stable(ingress.mounts),'ingress mounts changed');
    for(const [path,digest] of Object.entries(ingress.importHashes))need(hash(readFileSync(path))===digest,'ingress import changed');
  }
  function checkIngress() {
    ingressIdentity();need(readFileSync(ingress.sourceConfig.path,'utf8')===expectedSource,'ingress source changed');
    need(stable(api())===stable(expectedConfig),'loaded ingress drift');
    if((expectedSource===closedSource)!==(stable(expectedConfig)===stable(closedConfig))) {
      const [web]=JSON.parse(docker(['inspect',binding.containers.web.containerId]));
      need(web.Id===binding.containers.web.containerId && web.Image===binding.containers.web.imageId && web.State.Running===false
        && web.State.Status==='exited' && !web.State.Restarting && !web.State.Paused && !web.State.Dead,'mixed ingress requires exact stopped web');
    }
  }
  function persist(text) {
    need(sourceFailure===null,'ingress write halted; inspect private attempt');
    if(text===expectedSource)return;
    const path=ingress.sourceConfig.path,stat=lstatSync(path),before=Buffer.from(expectedSource),target=Buffer.from(text);
    need(stat.isFile() && !stat.isSymbolicLink() && realpathSync(path)===path,'ingress source identity changed');
    const fd=openSync(path,constants.O_RDWR|constants.O_NOFOLLOW),io=dependencies.ingressIO??{write:writeSync,truncate:ftruncateSync,sync:fsyncSync};
    let checkpoint=before,offset=0,stage='before',deadline=now()+5000;
    function current() {
      const a=fstatSync(fd),b=lstatSync(path);
      need(a.ino===stat.ino && a.dev===stat.dev && b.ino===a.ino && b.dev===a.dev && !b.isSymbolicLink(),'ingress bind inode changed');
      need(a.size<=Math.max(before.length,target.length),'ingress source size drift');
      const bytes=Buffer.alloc(a.size);let n=0;
      while(n<bytes.length){const count=readSync(fd,bytes,n,bytes.length-n,n);need(count>0,'ingress read incomplete');n+=count;}return bytes;
    }
    function writeBytes(bytes) {
      offset=0;
      while(offset<bytes.length) {
        need(now()<=deadline && current().equals(checkpoint),'ingress own write checkpoint drift');
        const size=Math.min(65536,bytes.length-offset),n=io.write(fd,bytes,offset,size,offset);
        need(Number.isInteger(n) && n>0 && n<=size,'ingress write made no valid progress');
        offset+=n;checkpoint=Buffer.concat([bytes.subarray(0,offset),checkpoint.subarray(offset)]);
        need(current().equals(checkpoint),'ingress own write readback drift');
      }
    }
    try {
      need(current().equals(before),'ingress source changed before write');stage='write';writeBytes(target);
      stage='truncate';io.truncate(fd,target.length);checkpoint=target;
      need(current().equals(checkpoint),'ingress truncate readback drift');stage='sync';io.sync(fd);
      stage='verify';need(current().equals(target),'ingress final readback drift');expectedSource=text;
    } catch(error) {
      sourceFailure='uncontrolled';
      // Only the exact checkpoint of acknowledged own writes is recoverable, never a compatible prefix.
      if(['write','truncate','sync'].includes(stage) && current().equals(checkpoint)) {
        sourceFailure='halted';
        if(['write','truncate'].includes(stage) && !checkpoint.equals(before)) {
          sourceFailure='uncontrolled';deadline=now()+5000;
          writeBytes(before);io.truncate(fd,before.length);checkpoint=before;io.sync(fd);
          need(current().equals(before),'ingress own write recovery failed');sourceFailure='halted';
        }
        if(checkpoint.equals(before))expectedSource=before.toString('utf8');
        else if(checkpoint.equals(target))expectedSource=text;
      }
      throw error;
    } finally {closeSync(fd);}
  }
  function load(config) {
    docker(['exec','-i',ingress.containerId,'wget','-q','-O','-','--header=Content-Type:application/json','--post-file=/dev/stdin','http://127.0.0.1:2019/load'],JSON.stringify(config));
    expectedConfig=config;need(stable(api())===stable(config),'ingress load parity failed');
  }
  function closeIngress() {
    ingressIdentity();need(sourceFailure!=='uncontrolled','unsafe ingress own write recovery');
    const disk=readFileSync(ingress.sourceConfig.path,'utf8'),active=api();
    need([source,closedSource].includes(disk) && [context.ingressConfig,closedConfig].some(c=>c && stable(c)===stable(active)),'unsafe ingress cleanup drift');
    if(disk!==closedSource)persist(closedSource);
    load(closedConfig);checkIngress();
  }
  function state(service) {
    const apps=observedApps(binding,docker),[c]=JSON.parse(docker(['inspect',apps[service].containerId]));
    need(c.Image===selected[service==='web'?'web':'worker'].id,'reader image mismatch');
    need(c.State.Running && c.State.Status==='running' && !c.State.Paused && !c.State.Restarting && !c.State.Dead
      && c.State.ExitCode===0 && c.RestartCount===0 && (!c.State.Health || c.State.Health.Status==='healthy'),`reader dead/unready: ${service}`);
    return c;
  }
  const workerBoots={};
  async function readyWorkers() {
    const current=Object.fromEntries(services.map(s=>[s,state(s)]));
    for(const s of services) {
      const boot=current[s].Id+current[s].State.StartedAt;
      need(!workerBoots[s] || workerBoots[s]===boot,'worker restarted after readiness');workerBoots[s]=boot;
    }
    const wanted=services.map(s=>({queue:{'worker-stt':'stt','worker-llm':'select','worker-video':'render'}[s],ip:current[s].NetworkSettings.Networks['clipmkr-stage-20261028_default']?.IPAddress}));
    need(wanted.every(w=>/^\d+\.\d+\.\d+\.\d+$/.test(w.ip)),'worker queue address unavailable');
    const program=`const {Queue}=require('bullmq');const {getRedisConnection}=require('@clipmaker/queue');const wanted=${JSON.stringify(wanted)};
const qs=[];(async()=>{try {for(const w of wanted){const q=new Queue(w.queue,{connection:getRedisConnection({redisUrl:process.env.REDIS_URL},false)});qs.push(q);
const clients=await q.getWorkers();if(!clients.some(c=>c.addr?.startsWith(w.ip+':'))) {console.log(JSON.stringify({ready:false}));return;}}console.log(JSON.stringify({ready:true}));
}finally{await Promise.all(qs.map(q=>q.close()));}})().catch(()=>{console.error('worker readiness unavailable');process.exitCode=1;});`;
    const deadline=now()+45000;let ready=false;
    do {
      const result=JSON.parse(docker(['exec',current['worker-video'].Id,'node','-e',program],undefined,undefined,Math.max(1,Math.min(5000,deadline-now()))));ready=result.ready===true;
      for(const s of services){const c=state(s);need(c.Id+c.State.StartedAt===workerBoots[s],'worker restarted during readiness');}
      if(!ready && now()<deadline)await sleep(1000);
    }while(!ready && now()<deadline);
    need(ready,'worker queue registration unready');
  }
  let webBoot;

  const parserPreflight=String.raw`const {parseScreenFaceLayout,parsePublishedLayout}=require('@clipmaker/shared/screen-layout');
    for(const r of (await p.query('SELECT layout FROM clip_layout_intent')).rows)parseScreenFaceLayout(r.layout);
    for(const r of (await p.query('SELECT rendered_layout FROM clip WHERE rendered_layout IS NOT NULL')).rows)parsePublishedLayout(r.rendered_layout);`;
  return {checkIngress, execute:async phase=>{
    if(phase==='close') {
      // Never automatically reopen. A drifted/shared proxy is left alone; bound web is still stopped.
      try {if(admissionQualified)closeIngress();} finally {
        const web=observedApps(binding,docker).web;
        need([binding.containers.web.imageId,selected.web.id].includes(web.imageId),'unsafe web cleanup identity');
        docker(['stop','-t','30',web.containerId]);
      }
    }
    else if(phase==='pause') {
      const overrideObject={services:Object.fromEntries(['web',...services].map(s=>[s,{image:selected[s==='web'?'web':'worker'].id}]))};
      const composeBytes=readFileSync(binding.composePath);need(hash(composeBytes)===binding.composeSha256,'compose changed before snapshot');
      writeFileSync(composeSnapshot,composeBytes,{mode:0o600,flag:'wx'});context.bindings[composeSnapshot]=hash(composeBytes);
      const overrideBytes=JSON.stringify(overrideObject);writeFileSync(override,overrideBytes,{mode:0o600,flag:'wx'});context.bindings[override]=hash(overrideBytes);
      const adapt=text=>JSON.parse(docker(['exec','-i',ingress.containerId,'caddy','adapt','--config','-','--adapter','caddyfile'],text));
      need(stable(adapt(source))===stable(context.ingressConfig),'source/loaded ingress parity mismatch');
      const adapted=adapt(closedSource);
      const restored=structuredClone(adapted);
      for(const path of ingress.upstreamPaths) {
        const handlerPath=path.split('/upstreams/')[0],handler=node(restored,handlerPath);
        need(handler.handler==='static_response' && String(handler.status_code)==='503'
          && Object.keys(handler).sort().join(',')==='handler,status_code','closed ingress must reject target');
        const keys=handlerPath.slice(1).split('/'),last=keys.pop();node(restored,'/'+keys.join('/'))[last]=node(context.ingressConfig,handlerPath);
      }
      need(stable(restored)===stable(context.ingressConfig),'ingress closure changed unrelated routes');
      need(stable(adapted)===stable(closedConfig),'derived closed ingress parity mismatch');admissionQualified=true;
      for(const [name,value] of [['ingress-open.private.json',context.ingressConfig],['ingress-closed.private.json',closedConfig]])
        writeFileSync(resolve(directory,name),JSON.stringify(value),{mode:0o600,flag:'wx'});
      writeFileSync(resolve(directory,'ingress-source-before.private.txt'),source,{mode:0o600,flag:'wx'});
      checkIngress();closeIngress();
      docker([...base,'stop','-t','30','web']);
    } else if(phase==='drain') {
      // A busy/unavailable queue stops this attempt. No forced terminal status or queue clearing.
      const r=JSON.parse(docker([...base,'run','--rm','--no-deps','--pull','never','--entrypoint','node','worker-video','-e',idleProgram]));
      need(r.idle===true,'jobs still active/deferred; retry only after inspecting outcome');
      docker([...base,'stop','-t','60',...services]);
    } else if(phase==='backup') {
      // Workers are stopped; use a read-only ephemeral candidate container for the snapshot below.
      const sqlProgram=`const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});(async()=>{${parserPreflight}const r=await p.query(${JSON.stringify(snapshotSql)});console.log(JSON.stringify(r.rows[0].snapshot));})().catch(()=>{console.error('parser or snapshot preflight refused');process.exitCode=1}).finally(()=>p.end());`;
      before=JSON.parse(docker([...base,'run','--rm','--no-deps','--pull','never','--entrypoint','node','worker-video','-e',sqlProgram]));
      need(before.journal['032_clip_layout.sql']==='23f93ca25da73cf2e69d4dab1ab321d922326acf9de1bdf03cb0439f679f182b','migration032 journal mismatch');
      const file=resolve(directory,'database-before.dump');
      const fd=openSync(file,'wx',0o600);
      try {
        docker(['exec',binding.containers.db.containerId,'sh','-c','exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc'],undefined,fd);
        need(lstatSync(file).size>0,'database backup failed');
      } finally {closeSync(fd);}
      writeFileSync(resolve(directory,'snapshot-before.private.json'),JSON.stringify(before),{mode:0o600,flag:'wx'});
    } else if(phase==='migration') {
      if(mode==='candidate') docker([...base,'run','--rm','--no-deps','--pull','never','--entrypoint','node','worker-video','packages/db/dist/migrate.js']);
      // Rollback retains migration033 and all JSON/media.
    } else if(phase==='integrity') {
      // No app writers/watchdog are running yet: compare the migration in an ephemeral reader.
      const program=`const {Pool}=require('pg');const p=new Pool({connectionString:process.env.DATABASE_URL});p.query(${JSON.stringify(snapshotSql)}).then(r=>console.log(JSON.stringify(r.rows[0].snapshot))).catch(()=>{console.error('migration snapshot failed');process.exitCode=1}).finally(()=>p.end());`;
      const after=JSON.parse(docker([...base,'run','--rm','--no-deps','--pull','never','--entrypoint','node','worker-video','-e',program]));
      for(const key of ['accounts','credits','grants','allocations','quota','intents','keys','sources'])need(after[key]===before[key],`preservation mismatch: ${key}`);
      for(const [name,digest] of Object.entries(before.journal))need(after.journal[name]===digest,'previous migration journal changed');
      const migration='033_clip_layout_composition_v2.sql';
      need(after.journal[migration]===hash(readFileSync(resolve(root,'packages/db/migrations',migration))),'migration033 journal mismatch');
    } else if(phase==='workers') {
      docker([...base,'up','-d','--no-deps','--no-build','--pull','never',...services]);
      await readyWorkers();
    } else if(phase==='web') {
      docker([...base,'up','-d','--no-deps','--no-build','--pull','never','web']);
    } else if(phase==='verify') {
      await readyWorkers();
      const web=state('web');webBoot=web.Id+web.State.StartedAt;
      const expectedRevision=mode==='rollback-c0'?images.c0.revision:candidate;
      const deadline=now()+45000;let healthy=false;
      while(now()<deadline && !healthy) {
        const program=`(async()=>{try{const r=await fetch('http://127.0.0.1:3000/health',{signal:AbortSignal.timeout(4000),cache:'no-store'});const h=await r.json();console.log(JSON.stringify({healthy:r.ok&&h.status==='ok'&&h.revision===${JSON.stringify(expectedRevision)}}));}catch{console.log(JSON.stringify({healthy:false}));}})();`;
        healthy=JSON.parse(docker(['exec',web.Id,'node','-e',program],undefined,undefined,Math.max(1,Math.min(5000,deadline-now())))).healthy===true;
        const current=state('web');need(current.Id+current.State.StartedAt===webBoot,'web restarted during health');
        if(!healthy && now()<deadline)await sleep(1000);
      }
      need(healthy,'private web health revision mismatch');
    } else if(phase==='open') {
      await readyWorkers();const web=state('web');need(web.Id+web.State.StartedAt===webBoot,'web changed before admission');
      checkIngress();load(context.ingressConfig);persist(source);checkIngress();
    } else throw new Error('unsupported fixed phase');
  }};
}

export async function applyZoomLayoutCurrentVps(manifestPath, dependencies = {}) {
  secure(manifestPath);secure(dirname(manifestPath),true);
  const bytes=readFileSync(manifestPath), manifestHash=hash(bytes), m=JSON.parse(bytes);
  need(Object.keys(m).sort().join(',')==='candidate,directory,evidence,images,mode,referenceApproval,schema','unsupported manifest keys');
  need(m.schema===1 && ['candidate','rollback-c0'].includes(m.mode),'invalid apply mode');
  secure(m.directory,true);
  const result=verifyZoomLayoutConformance(m,dependencies);
  // Full checker is always invoked before creating lock/output files or invoking an executor.
  const repo=dependencies.repo??root;
  const fixed=dependencies.execute?{execute:dependencies.execute,checkIngress:()=>{}}:fixedExecutor({...result,directory:m.directory,mode:m.mode},dependencies);
  const execute=fixed.execute;
  const checkResources=dependencies.checkResources??(b=>unchangedResources(b,dependencies.docker??run,dependencies.machineIdSha256));
  const appState=dependencies.appState??(b=>observedApps(b,dependencies.docker??run));
  const initial=Object.fromEntries(['web',...services].map(s=>[s,{containerId:result.binding.containers[s].containerId,imageId:result.binding.containers[s].imageId}]));
  let expectedApps=initial;
  function revalidate() {
    secure(m.directory,true);secure(manifestPath);need(hash(readFileSync(manifestPath))===manifestHash,'manifest changed');
    for(const [path,digest] of Object.entries(result.bindings)) {secure(path);need(hash(readFileSync(path))===digest,'transitive input changed');}
    const git=spawnSync('git',['status','--porcelain','--untracked-files=no'],{cwd:repo,encoding:'utf8'});
    const head=spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'});
    need(git.status===0 && !git.stdout.trim() && head.status===0 && head.stdout.trim()===m.candidate,'source changed');
    const others=spawnSync('git',['ls-files','--others','--exclude-standard','apps','packages','scripts','tests'],{cwd:repo,encoding:'utf8'});
    need(others.status===0 && !others.stdout.split('\n').some(p=>/\.(?:ts|tsx|mjs|sql|css)$/.test(p) && !p.includes('/artifacts/')),'untracked source appeared');
    checkResources(result.binding);fixed.checkIngress();
    need(JSON.stringify(appState(result.binding))===JSON.stringify(expectedApps),'app binding changed between phases');
  }
  revalidate();
  const lock=resolve(dirname(result.binding.composePath),'zoom-layout-apply.lock'), state=resolve(m.directory,'apply-state.private.json');
  need(!existsSync(state),'attempt directory already used; inspect previous outcome');
  const lockFd=openSync(lock,'wx',0o600);
  const phases=['pause','drain','backup','migration','integrity','workers','web','verify','open'];
  const completed=[];let stateFd,pauseAttempted=false;
  const saveState=value=>{ftruncateSync(stateFd,0);writeSync(stateFd,JSON.stringify(value),0,'utf8');};
  try {
    stateFd=openSync(state,'wx',0o600);
    for(const phase of phases) {
      revalidate();
      saveState({candidate:m.candidate,mode:m.mode,phase,completed,status:'running'});
      if(phase==='pause')pauseAttempted=true;
      await execute(phase);
      const after=appState(result.binding);
      const allowed=phase==='workers'?services:phase==='web'?['web']:[];
      for(const service of ['web',...services]) {
        if(allowed.includes(service)) need(after[service].imageId===(m.mode==='candidate'?result.images.images:result.images.c0.images)[service==='web'?'web':'worker'].id,'started image mismatch');
        else need(JSON.stringify(after[service])===JSON.stringify(expectedApps[service]),'unrelated app changed');
      }
      expectedApps=after;revalidate();completed.push(phase);
    }
    saveState({candidate:m.candidate,mode:m.mode,completed,status:'PRE-APPLY-delivered',postApply:'pending'});
    return {completed,candidate:m.candidate,postApply:'pending'};
  } catch(error) {
    let cleanup='not needed: pause has not been attempted';
    if(pauseAttempted) {
      try {
        // Only admission closure is an exception action; never roll back or restore data automatically.
        // Safety closure uses its own exact proxy/web identity checks; DB/evidence failures must not suppress it.
        await execute('close');cleanup='web stopped';
      } catch {cleanup='web closure failed or bindings changed: operator must inspect admissions';}
    }
    if(stateFd!==undefined)saveState({candidate:m.candidate,mode:m.mode,completed,status:'stopped',cleanup});
    throw error;
  } finally {if(stateFd!==undefined)closeSync(stateFd);closeSync(lockFd);unlinkSync(lock);}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    need(process.argv.length===4 && process.argv[2]==='--manifest','usage: --manifest /private/manifest.json');
    console.log(JSON.stringify(await applyZoomLayoutCurrentVps(process.argv[3])));
  } catch(error) {console.error(error.message?.startsWith('zoom apply:')||error.message?.startsWith('zoom conformance:')?error.message:'zoom apply: invalid input or external response');process.exitCode=1;}
}
