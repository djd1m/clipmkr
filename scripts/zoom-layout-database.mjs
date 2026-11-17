// Scoped DB boundary for the already-bound current-VPS executor. No manifest credentials or SQL.
import { spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, readdirSync, openSync, closeSync, lstatSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const migration='033_clip_layout_composition_v2.sql';
const services=['web','worker-stt','worker-llm','worker-video'];
const sessions=new WeakMap();
const hash=b=>createHash('sha256').update(b).digest('hex');
const stable=v=>JSON.stringify(v,(_k,x)=>x && typeof x==='object' && !Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
function need(ok,phase) { if(!ok)throw new Error(`zoom database: ${phase}`); }
function native(args,input,fd,timeout=20000) {
  const env={...process.env};for(const k of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete env[k];
  const r=spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{env,input,encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:8*1024*1024,
    ...(fd===undefined?{}:{stdio:['pipe',fd,'pipe']})});
  if(r.error || r.signal || r.status!==0) {
    const e=new Error('zoom database: child failed');e.exit=r.status;e.signal=r.signal??null;e.unknown=!!r.error||!!r.signal;
    try {const diagnostic=JSON.parse(r.stdout);if(/^[A-Z0-9]{5}$/.test(diagnostic.sqlstate))e.sqlstate=diagnostic.sqlstate;} catch { /* Non-JSON child output is never included in errors. */ }
    throw e;
  }
  return (r.stdout??'').trim();
}
const runtimeProgram=String.raw`
const {Pool}=require('pg');const dns=require('node:dns').promises;const deadline=setTimeout(()=>process.exit(2),10000);
(async()=>{const u=new URL(process.env.DATABASE_URL);const p=new Pool({connectionString:u.href,max:1,connectionTimeoutMillis:4000});let c;
 try {const addresses=await dns.lookup(u.hostname,{all:true});c=await p.connect();await c.query('BEGIN READ ONLY');await c.query("SET LOCAL statement_timeout='4000ms'; SET LOCAL lock_timeout='2000ms'");if(process.env.ZOOM_DB_PROBE_TAG)await c.query("SELECT set_config('application_name',$1,false)",[process.env.ZOOM_DB_PROBE_TAG]);const r=await c.query("SELECT current_database() AS name,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,current_user AS role,current_setting('search_path') AS search_path,host(inet_server_addr()) AS address,inet_server_port() AS port");
 console.log(JSON.stringify({...r.rows[0],addresses:addresses.map(a=>a.address).sort()}));}finally{if(c)c.release();await p.end();}})().catch(e=>{console.log(JSON.stringify({failure:true,sqlstate:/^[A-Z0-9]{5}$/.test(e.code)?e.code:null}));process.exitCode=1;}).finally(()=>clearTimeout(deadline));`;
// Constant argv program; configuration/secret enters only over stdin. This is the canonical migrator.
const adminProgram=String.raw`
const {Pool}=require('pg');const fs=require('node:fs');const crypto=require('node:crypto');
const deadline=setTimeout(()=>process.exit(2),30000);let raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',c=>{raw+=c;if(raw.length>131072)process.exit(2);});
process.stdin.on('end',async()=>{let p;try{const x=JSON.parse(raw);raw='';p=new Pool(x.config);const c=await p.connect();let result;
try{const identity=(await c.query("SELECT current_database() AS name,(SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,(SELECT system_identifier::text FROM pg_control_system()) AS system_identifier,current_user AS role,current_setting('search_path') AS search_path,inet_server_port() AS port,has_schema_privilege(current_user,'public','CREATE') AS schema_create,(has_table_privilege(current_user,'public._schema_migration','SELECT') AND has_table_privilege(current_user,'public._schema_migration','INSERT')) AS journal_access,(SELECT rolsuper OR pg_has_role(current_user,(SELECT relowner FROM pg_class WHERE oid='public.clip_layout_intent'::regclass),'USAGE') FROM pg_roles WHERE rolname=current_user) AS intent_owner,EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.clip_layout_intent'::regclass AND conname='clip_layout_intent_layout_check' AND contype='c') AS intent_check,'_schema_migration'::regclass::oid::text AS journal_oid,'public._schema_migration'::regclass::oid::text AS public_journal_oid,'clip_layout_intent'::regclass::oid::text AS intent_oid,'public.clip_layout_intent'::regclass::oid::text AS public_intent_oid")).rows[0];
const journal=Object.fromEntries((await c.query('SELECT name,sha256 FROM public._schema_migration ORDER BY name')).rows.map(r=>[r.name,r.sha256]));
const directory='/app/packages/db/migrations';const inventory=Object.fromEntries(fs.readdirSync(directory).filter(n=>/^\d+_[a-z0-9_]+\.sql$/.test(n)).sort().map(n=>[n,crypto.createHash('sha256').update(fs.readFileSync(directory+'/'+n)).digest('hex')]));
if(JSON.stringify(inventory)!==JSON.stringify(x.inventory))throw Error('image migration drift');
const {parseScreenFaceLayout,parsePublishedLayout}=require('@clipmaker/shared/screen-layout');
let last=null,lastKey=null;
while(true){const rows=(await c.query('SELECT clip_id,request_key,layout FROM public.clip_layout_intent WHERE $1::uuid IS NULL OR (clip_id,request_key)>($1::uuid,$2::uuid) ORDER BY clip_id,request_key LIMIT 256',[last,lastKey])).rows;
for(const row of rows)parseScreenFaceLayout(row.layout);if(rows.length<256)break;last=rows.at(-1).clip_id;lastKey=rows.at(-1).request_key;}
last=null;
while(true){const rows=(await c.query('SELECT id,rendered_layout FROM public.clip WHERE rendered_layout IS NOT NULL AND ($1::uuid IS NULL OR id>$1::uuid) ORDER BY id LIMIT 256',[last])).rows;
for(const row of rows)parsePublishedLayout(row.rendered_layout);if(rows.length<256)break;last=rows.at(-1).id;}
result={identity,journal};
}finally{c.release();}
if(x.action==='migrate'){if(JSON.stringify(result.identity)!==JSON.stringify(x.identity) || JSON.stringify(result.journal)!==JSON.stringify(x.journal))throw Error('pre-DDL identity/journal drift');await require('/app/packages/db/dist/migrate.js').migrate(p);result.migrated=true;}
console.log(JSON.stringify(result));
}catch(e){console.log(JSON.stringify({failure:true,sqlstate:/^[A-Z0-9]{5}$/.test(e.code)?e.code:null}));process.exitCode=1;}
finally{if(p)await p.end();clearTimeout(deadline);}});`;
function inspect(s,id) {const [c]=JSON.parse(s.docker(['inspect',id]));need(c?.Id===id,'inspect identity mismatch');return c;}
function envOf(c) {return Object.fromEntries(c.Config.Env.map(v=>{const n=v.indexOf('=');return [v.slice(0,n),v.slice(n+1)];}));}
function diagnostics(s,phase,error,identity,owner) {
  // Only preselected fields; never raw child output, messages, DSN, SQL or Docker inspect.
  const record={phase,sqlstate:error.sqlstate??null,exit:error.exit??null,signal:error.signal??null,outcome:error.unknown?'UNKNOWN':'REFUSED',identity,...(owner?{owner}:{})};
  if(s.directory)writeFileSync(resolve(s.directory,`database-${phase}-${randomBytes(6).toString('hex')}.private.json`),JSON.stringify(record),{mode:0o600,flag:'wx'});
}
function backendCount(s,tag,terminate=false) {
  // tag is locally generated hex; cannot originate in the manifest.
  const predicate=`application_name = '${tag}'`;
  if(terminate)s.docker(['exec',s.db.Id,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U',s.admin.user,'-d',s.name,'-c',`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE ${predicate}`]);
  return s.docker(['exec',s.db.Id,'psql','-X','-At','-v','ON_ERROR_STOP=1','-U',s.admin.user,'-d',s.name,'-c',`SELECT count(*) FROM pg_stat_activity WHERE ${predicate}`])==='0';
}
function admin(s,action,runtimeUrl) {
  const tag='zoomdb_'+randomBytes(12).toString('hex'),name=tag;
  let created=false,terminal=false,answer,failure,childExit=null,childSignal=null;
  try {
    const program=runtimeUrl?"const x=JSON.parse(require('node:fs').readFileSync(0,'utf8'));process.env.DATABASE_URL=x.runtimeUrl;process.env.ZOOM_DB_PROBE_TAG=x.tag;\n"+runtimeProgram:adminProgram;
    const id=s.docker(['create','--name',name,'--network',`container:${s.db.Id}`,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--memory','256m','--pids-limit','64','-i','--entrypoint','node',s.image,'-e',program]);
    need(/^[a-f0-9]{64}$/.test(id),'admin child identity');created=true;
    const config={...s.admin,database:s.name,host:'127.0.0.1',port:5432,max:1,connectionTimeoutMillis:4000,application_name:tag,
      options:'-c search_path=public -c statement_timeout=15000 -c lock_timeout=3000 -c idle_in_transaction_session_timeout=20000'};
    const output=s.docker(['start','-ai',name],JSON.stringify(runtimeUrl?{runtimeUrl,tag}:{config,action,inventory:s.inventory,identity:s.identity,journal:s.journal}),undefined,45000);
    answer=JSON.parse(output);if(answer.failure){const e=new Error('admin SQL refused');e.sqlstate=answer.sqlstate;throw e;}
  } catch(e) {failure=e;}
  finally {
    try {
      if(created) {
        let [c]=JSON.parse(s.docker(['inspect',name]));
        if(c.State.Running){s.docker(['kill',name]);[c]=JSON.parse(s.docker(['inspect',name]));}
        need(c.State.Running===false && c.State.Status==='exited' && Number.isInteger(c.State.ExitCode),'admin terminal state unknown');
        childExit=c.State.ExitCode;childSignal=failure?.signal??null;
        if(failure){failure.exit=childExit;failure.signal=childSignal;}
        if(!failure && c.State.ExitCode!==0){const e=new Error('admin exit');e.exit=c.State.ExitCode;failure=e;}
        if(!backendCount(s,tag)) {backendCount(s,tag,true);need(backendCount(s,tag),'admin backend terminal unknown');}
        terminal=true;s.docker(['rm',name]);
      } else terminal=backendCount(s,tag);
    } catch {terminal=false;}
  }
  if(!terminal){const e=new Error('zoom database: UNKNOWN admin outcome; reconcile before retry');e.unknown=true;failure=e;}
  if(failure){diagnostics(s,action,failure,s.identity,{containerName:name,backendApplicationName:tag,terminal});throw new Error(`zoom database: ${action} ${failure.unknown?'UNKNOWN; reconcile before retry':'refused'}${failure.sqlstate?' SQLSTATE '+failure.sqlstate:''}`);}
  if(s.directory)writeFileSync(resolve(s.directory,`database-${action}-${tag}.private.json`),JSON.stringify({phase:action,sqlstate:null,exit:childExit,signal:childSignal,outcome:'SUCCEEDED',identity:answer.identity??{name:answer.name,oid:answer.oid,role:answer.role,search_path:answer.search_path},owner:{containerName:name,backendApplicationName:tag,terminal}}),{mode:0o600,flag:'wx'});
  return answer;
}
function journal(s,observed,mode) {
  const pending=[];
  for(const [name,digest] of Object.entries(observed))need(s.inventory[name]===digest,'unknown/changed prior migration');
  for(const name of Object.keys(s.inventory))if(!observed[name])pending.push(name);
  need(observed['032_clip_layout.sql']==='23f93ca25da73cf2e69d4dab1ab321d922326acf9de1bdf03cb0439f679f182b','migration032 mismatch');
  need(mode==='rollback-c0'?pending.length===0:pending.length===0 || pending.length===1 && pending[0]===migration,'other pending migrations');
}
function validateAdmin(s,result,mode) {
  const i=result.identity;
  need(i.name===s.name && i.oid===s.target.oid && i.system_identifier===s.expected.systemIdentifier && i.port===5432,'admin database identity mismatch');
  need(i.search_path==='public' && i.schema_create===true && i.journal_access===true && i.intent_owner===true && i.intent_check===true,'admin authority/search_path refused');
  need(i.journal_oid===i.public_journal_oid && i.intent_oid===i.public_intent_oid,'public object resolution mismatch');
  journal(s,result.journal,mode);
  if(s.identity)need(stable(i)===stable(s.identity),'database authority/identity drift');
  return i;
}
function appNetworks(c) {
  return Object.fromEntries(Object.entries(c.NetworkSettings.Networks).sort(([a],[b])=>a.localeCompare(b)).map(([name,n])=>[name,{id:n.NetworkID,aliases:n.Aliases,ipam:n.IPAMConfig}]));
}
function recheck(s,live=false) {
  const c=inspect(s,s.db.Id);need(c.Image===s.db.Image && c.State.Running && stable(c.Mounts)===stable(s.db.Mounts)
    && stable(c.NetworkSettings.Networks)===stable(s.db.NetworkSettings.Networks) && stable(c.Config.Env)===stable(s.db.Config.Env),'bound DB drift');
  for(const service of services) {
    const expected=s.apps[service],current=inspect(s,expected.Id);
    need(current.Image===expected.Image && stable(current.Config.Env)===stable(expected.Config.Env)
      && stable(appNetworks(current))===stable(appNetworks(expected)) && stable(current.HostConfig)===stable(expected.HostConfig),'runtime binding drift');
    if(live)need(current.State.Running===expected.State.Running && stable(runtime(s,current))===stable(s.runtimes[service]),'runtime SQL/DNS drift');
  }
  const result=admin(s,'qualify');validateAdmin(s,result,s.mode);
  need(stable(result.journal)===stable(s.journal),'prior journal drift');
}
function runtime(s,c) {
  const databaseUrl=envOf(c).DATABASE_URL,u=new URL(databaseUrl);let r;
  if(c.State.Running)r=JSON.parse(s.docker(['exec',c.Id,'node','-e',runtimeProgram],undefined,undefined,12000));
  else {
    // Recovery must not start stopped applications merely to read their DSN. Only equivalent Docker DNS is supported.
    need(c.State.Status==='exited' && !c.State.Restarting && !c.State.Paused && !c.State.Dead,'runtime stopped state unqualified');
    const shared=c.HostConfig.NetworkMode===`container:${s.db.Id}`;
    need(shared || stable(Object.keys(c.NetworkSettings.Networks).sort())===stable(Object.keys(s.db.NetworkSettings.Networks).sort()),'stopped runtime network mismatch');
    for(const key of ['Dns','DnsOptions','DnsSearch','ExtraHosts'])need(shared || stable(c.HostConfig[key]??[])===stable(s.db.HostConfig[key]??[]),'stopped runtime DNS overrides unsupported');
    r=admin(s,'runtime',databaseUrl);
  }
  need(!r.failure && r.name===decodeURIComponent(u.pathname.slice(1)) && r.port===5432 && r.addresses.length>0
    && r.addresses.every(ip=>s.addresses.includes(ip)) && s.addresses.includes(r.address),'runtime SQL/DNS target mismatch');
  need(typeof r.role==='string' && r.role.length>0 && typeof r.search_path==='string','runtime role/search_path missing');
  return r;
}
export function qualifyZoomLayoutDatabase(context,dependencies={}) {
  const {binding,images,mode='candidate'}=context;
  const s={docker:dependencies.docker??native,directory:context.directory,mode,inventory:Object.fromEntries(readdirSync(resolve(dependencies.repo??root,'packages/db/migrations')).filter(n=>/^\d+_[a-z0-9_]+\.sql$/.test(n)).sort().map(n=>[n,hash(readFileSync(resolve(dependencies.repo??root,'packages/db/migrations',n)))])),image:images.images.worker.id,expected:binding.database};
  need(s.expected && Object.keys(s.expected).sort().join(',')==='databaseName,databaseOid,systemIdentifier','qualified database evidence required');
  need(/^sha256:[a-f0-9]{64}$/.test(s.image),'immutable admin image required');
  s.db=inspect(s,binding.containers.db.containerId);need(s.db.State.Running && s.db.Image===binding.containers.db.imageId,'bound DB mismatch');
  s.addresses=Object.values(s.db.NetworkSettings.Networks).map(n=>n.IPAddress).filter(Boolean);
  const env=envOf(s.db);need(env.POSTGRES_USER && env.POSTGRES_PASSWORD,'existing admin credentials unavailable');
  s.admin={user:env.POSTGRES_USER,password:env.POSTGRES_PASSWORD};s.name=s.expected.databaseName;s.apps={};s.runtimes={};
  try {
    for(const service of services) {
      const c=inspect(s,binding.containers[service].containerId);need(c.Image===binding.containers[service].imageId,'runtime identity/state mismatch');
      s.apps[service]=c;s.runtimes[service]=runtime(s,c);
    }
    s.target=s.runtimes.web;s.name=s.target.name;
    need(services.every(k=>s.runtimes[k].name===s.name && s.runtimes[k].oid===s.target.oid),'runtime database disagreement');
    need(s.expected.databaseName===s.name && s.expected.databaseOid===s.target.oid,'runtime expected database mismatch');
    const result=admin(s,'qualify');s.identity=validateAdmin(s,result,mode);s.journal=result.journal;
    const qualified={identity:s.identity,runtimes:s.runtimes,journal:s.journal,revalidate:live=>recheck(s,live===true)};
    sessions.set(qualified,s);return qualified;
  } catch(e) {diagnostics(s,'qualification',e,s.identity);throw new Error(e.message?.startsWith('zoom database:')?e.message:'zoom database: qualification refused');}
}
export function backupZoomLayoutDatabase(qualified,file) {
  const s=sessions.get(qualified);need(s,'qualified DB session required');recheck(s);
  const fd=openSync(file,'wx',0o600),tag='zoomdump_'+randomBytes(12).toString('hex');let failure;
  try {
    s.docker(['exec','-e',`PGAPPNAME=${tag}`,s.db.Id,'timeout','-s','TERM','-k','5','90','pg_dump','-U',s.admin.user,'-d',s.name,'-Fc'],undefined,fd,105000);
  } catch(e){failure=e;} finally {closeSync(fd);}
  if(failure){failure.unknown=true;diagnostics(s,'backup',failure,s.identity,{backendApplicationName:tag,terminal:false});throw new Error('zoom database: backup UNKNOWN; reconcile child/backend before retry');}
  need(backendCount(s,tag),'backup backend terminal unknown');
  const size=lstatSync(file).size;need(size>0 && (lstatSync(file).mode&0o777)===0o600,'empty/unprotected backup');
  const toc=s.docker(['exec','-i',s.db.Id,'pg_restore','--list'],readFileSync(file),undefined,20000);
  need(toc.includes('_schema_migration') && toc.includes('clip_layout_intent'),'backup TOC incomplete');
  const evidence={identity:s.identity,exit:0,signal:null,size,sha256:hash(readFileSync(file)),tocSha256:hash(toc),toc};
  writeFileSync(file+'.private.json',JSON.stringify(evidence),{mode:0o600,flag:'wx'});return evidence;
}
export function migrateZoomLayoutDatabase(qualified) {
  const s=sessions.get(qualified);need(s,'qualified DB session required');recheck(s);
  if(s.mode==='rollback-c0')return {retained:true,ddl:false};
  const result=admin(s,'migrate');validateAdmin(s,result,s.mode);
  const after=admin(s,'qualify');validateAdmin(s,after,'rollback-c0');
  for(const [name,digest] of Object.entries(s.journal))need(after.journal[name]===digest,'migration changed prior journal');
  s.journal=after.journal;qualified.journal=after.journal;return {migrated:true,ddl:true,journal:after.journal};
}
