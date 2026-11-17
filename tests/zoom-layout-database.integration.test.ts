import { beforeAll, afterAll, it, expect } from 'vitest';
import { Pool } from 'pg';
import { randomBytes, createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, copyFileSync, mkdtempSync, chmodSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrate } from '../packages/db/src/migrate';
import { qualifyZoomLayoutDatabase, backupZoomLayoutDatabase, migrateZoomLayoutDatabase } from '../scripts/zoom-layout-database.mjs';

// Only two uniquely owned logical DBs on the existing QE PostgreSQL. No live app target or new DB stack.
const qeName='clipmkr-release-qe-20261103-db-1',qeAddress='172.28.5.3';
const suffix=randomBytes(8).toString('hex'),sourceName=`zoom_src_${suffix}_test`,restoreName=`zoom_dst_${suffix}_test`,role=`zoom_rt_${suffix}`;
const password=randomBytes(24).toString('hex'),directory=mkdtempSync(join(tmpdir(),'zoom-db-real-'));
chmodSync(directory,0o700);
const runtimeIds:string[]=[];
let admin:Pool,source:Pool,restored:Pool,db:Inspect,image:string,config:Record<string,string>,context:Parameters<typeof qualifyZoomLayoutDatabase>[0];
let archive:ReturnType<typeof backupZoomLayoutDatabase>,qualified:ReturnType<typeof qualifyZoomLayoutDatabase>;
type Inspect={Id:string;Image:string;Config:{Env:string[]};NetworkSettings:{Networks:Record<string,{IPAddress:string}>}};
function docker(args:string[],input?:string|Buffer,fd?:number,timeout=45000,env=process.env) {
  const clean={...env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete clean[key];
  const r=spawnSync('docker',['--host','unix:///var/run/docker.sock',...args],{input,env:clean,encoding:'utf8',timeout,killSignal:'SIGKILL',maxBuffer:8*1024*1024,...(fd===undefined?{}:{stdio:['pipe',fd,'pipe']} as const)});
  if(r.error || r.signal || r.status!==0)throw new Error('QE Docker child failed (raw output withheld)');
  if(args[0]==='exec' && args.at(-1)?.includes('addresses:addresses'))writeFileSync(join(process.env.N5_SCREEN_ARTIFACT_DIR??directory,`runtime-${suffix}.private.json`),r.stdout??'',{mode:0o600});
  return (r.stdout??'').trim();
}
function pool(database:string) {return new Pool({host:qeAddress,port:5432,user:config.POSTGRES_USER,password:config.POSTGRES_PASSWORD,database,max:1,
  connectionTimeoutMillis:4000,options:'-c statement_timeout=10000 -c lock_timeout=2000 -c work_mem=4MB'});}
function hashes() {return Object.fromEntries(readdirSync('packages/db/migrations').filter(n=>/^\d+_[a-z0-9_]+\.sql$/.test(n)).sort().map(n=>[n,createHash('sha256').update(readFileSync(join('packages/db/migrations',n))).digest('hex')]));}
const migration='033_clip_layout_composition_v2.sql';
const migrationHashes=hashes();
const layout=(version:number)=>({version,mode:'screen-face',variant:'01',screen:{x:0,y:0,width:1,height:1},focus:null,camera:null});
let clipId:string,accountId:string,sourceRevision:string,intentSerial=0;
async function insertIntent(version:number,key:string) {
  intentSerial++;
  return source.query(`INSERT INTO clip_layout_intent(clip_id,request_key,source_revision,base_render_version,render_version,series_no,layout)
    VALUES($1,$2,$3,1,$4,$5,$6)`,[clipId,key,sourceRevision,intentSerial+1,intentSerial,layout(version)]);
}
beforeAll(async()=>{
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL required for explicit existing-QE qualification; no skip');
  const supplied=new URL(process.env.DATABASE_URL);
  if(supplied.hostname!==qeAddress || supplied.port!=='5432' || !supplied.pathname.endsWith('_test'))throw new Error('Refuse non-QE fixture target');
  [db]=JSON.parse(docker(['inspect',qeName]));
  expect(db!.NetworkSettings.Networks).toSatisfy((n:Inspect['NetworkSettings']['Networks'])=>Object.values(n).some(x=>x.IPAddress===qeAddress));
  config=Object.fromEntries(db!.Config.Env.map(e=>{const i=e.indexOf('=');return [e.slice(0,i),e.slice(i+1)];}));
  // Early scoped proof can use the already-built a673 image. Final root run supplies its new immutable image.
  image=process.env.ZOOM_LAYOUT_CANDIDATE_IMAGE??JSON.parse(readFileSync('/root/.config/clipmkr/zoom-conformance-implementation-20261116/candidate-modular/candidate-images-evidence.private.json','utf8')).images.worker.id;
  expect(image).toMatch(/^sha256:[a-f0-9]{64}$/);
  admin=pool(config.POSTGRES_DB!);
  await admin.query(`CREATE DATABASE ${sourceName}`);await admin.query(`CREATE DATABASE ${restoreName}`);
  await admin.query(`CREATE ROLE ${role} LOGIN PASSWORD '${password}'`);
  source=pool(sourceName);restored=pool(restoreName);
  const migrations=join(directory,'migrations');
  const {mkdirSync}=await import('node:fs');mkdirSync(migrations);
  for(const name of Object.keys(migrationHashes).filter(n=>n!==migration))copyFileSync(join('packages/db/migrations',name),join(migrations,name));
  await migrate(source,migrations);
  await source.query(`CREATE TABLE zoom_source_sentinel(value text NOT NULL); INSERT INTO zoom_source_sentinel VALUES('only-the-owned-source')`);
  await restored.query(`CREATE TABLE zoom_decoy_sentinel(value text NOT NULL); INSERT INTO zoom_decoy_sentinel VALUES('wrong-owned-database')`);
  await source.query(`REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO ${role}`);
  accountId=(await source.query("INSERT INTO account(email,password_hash) VALUES('zoom-db@test.invalid','fixture') RETURNING id")).rows[0].id;
  const video=(await source.query("INSERT INTO video(account_id,idempotency_key,source,declared_bytes,object_key,status) VALUES($1,$2,'upload',100,'own-synthetic','done') RETURNING id",[accountId,randomBytes(16).toString('hex')])).rows[0].id;
  clipId=(await source.query("INSERT INTO clip(video_id,\"index\",start_seconds,end_seconds,title,status,watermarked) VALUES($1,1,0,20,'own fixture','done',true) RETURNING id",[video])).rows[0].id;
  sourceRevision='a'.repeat(64);await insertIntent(1,randomBytes(16).toString('hex'));
  const runtimeUrl=`postgresql://${role}:${password}@${qeAddress}:5432/${sourceName}`;
  const containers:Record<string,{containerId:string;imageId:string}>={db:{containerId:db!.Id,imageId:db!.Image}};
  for(const service of ['web','worker-stt','worker-llm','worker-video']) {
    const id=docker(['create','--network',Object.keys(db!.NetworkSettings.Networks)[0]!,'--memory','128m','--pids-limit','32','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','-e','DATABASE_URL','--entrypoint','node',image,'-e','setInterval(()=>{},1000)'],undefined,undefined,15000,{...process.env,DATABASE_URL:runtimeUrl});
    runtimeIds.push(id);docker(['start',id]);containers[service]={containerId:id,imageId:image};
  }
  const identity=(await source.query('SELECT (SELECT oid::text FROM pg_database WHERE datname=current_database()) AS oid,(SELECT system_identifier::text FROM pg_control_system()) AS system_identifier')).rows[0];
  context={binding:{containers,database:{databaseName:sourceName,databaseOid:identity.oid,systemIdentifier:identity.system_identifier}},images:{images:{worker:{id:image}}},directory,mode:'candidate'};
},60000);
afterAll(async()=>{
  const errors:unknown[]=[];
  for(const id of runtimeIds)try{docker(['rm','-f',id]);}catch(e){errors.push(e);}
  for(const p of [source,restored])if(p)try{await p.end();}catch(e){errors.push(e);}
  if(admin) {
    for(const name of [sourceName,restoreName])try{await admin.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);}catch(e){errors.push(e);}
    try{await admin.query(`DROP ROLE IF EXISTS ${role}`);}catch(e){errors.push(e);}
    await admin.end();
  }
  rmSync(directory,{recursive:true,force:true});
  if(errors.length)throw new Error('Owned QE teardown incomplete; reconcile owned names before retry');
},30000);
it('actual_database_backup_ignores_container_default_and_restores_exact_rows',async()=>{
  expect(sourceName).not.toBe(config.POSTGRES_DB);
  qualified=qualifyZoomLayoutDatabase(context);
  const dump=join(directory,'owned-source.dump');
  docker(['stop','-t','2',...runtimeIds]);
  try{const stopped=qualifyZoomLayoutDatabase(context);stopped.revalidate(true);archive=backupZoomLayoutDatabase(qualified,dump);}finally{for(const id of runtimeIds)docker(['start',id]);}
  expect(archive).toMatchObject({exit:0,signal:null,identity:{name:sourceName}});expect(archive.size).toBeGreaterThan(0);
  writeFileSync(join(process.env.N5_SCREEN_ARTIFACT_DIR??directory,`zoom-backup-${suffix}.private.json`),JSON.stringify({image,...archive,syntheticRestoreOnly:true}),{mode:0o600});
  expect(archive.toc).toContain('zoom_source_sentinel');expect(archive.toc).not.toContain('zoom_decoy_sentinel');
  // Wrong-target negative uses only our second logical DB, never the container's real default archive.
  const decoy=docker(['exec',db.Id,'pg_dump','-U',config.POSTGRES_USER!,'-d',restoreName,'--schema-only']);
  expect(decoy).toContain('zoom_decoy_sentinel');expect(decoy).not.toContain('zoom_source_sentinel');
  await restored.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
  docker(['exec','-i',db.Id,'pg_restore','-U',config.POSTGRES_USER!,'-d',restoreName,'--exit-on-error','--no-owner'],readFileSync(dump));
  expect((await restored.query('SELECT value FROM zoom_source_sentinel')).rows).toEqual([{value:'only-the-owned-source'}]);
  expect((await restored.query("SELECT to_regclass('public.zoom_decoy_sentinel') AS decoy")).rows[0].decoy).toBeNull();
  expect((await restored.query('SELECT name,sha256 FROM _schema_migration ORDER BY name')).rows).toEqual((await source.query('SELECT name,sha256 FROM _schema_migration ORDER BY name')).rows);
},60000);
it('admin033_preserves_restricted_runtime_and_prior_journal',async()=>{
  const qualified=qualifyZoomLayoutDatabase(context);
  const before=(await source.query('SELECT name,sha256 FROM _schema_migration ORDER BY name')).rows;
  const grants=async()=>(await source.query('SELECT privilege_type,table_name FROM information_schema.role_table_grants WHERE grantee=$1 ORDER BY table_name,privilege_type',[role])).rows;
  const intentsBefore=(await source.query('SELECT * FROM clip_layout_intent ORDER BY clip_id,request_key')).rows;
  const oldGrants=await grants(),oldRuntime=runtimeIds.map(id=>JSON.parse(docker(['inspect',id]))[0].Config.Env);
  // Execute the actual exported migrator under the restricted role, in our own DB only.
  const restricted=new Pool({host:qeAddress,port:5432,user:role,password,database:sourceName,max:1,connectionTimeoutMillis:4000,options:'-c statement_timeout=5000 -c lock_timeout=2000'});
  try {await expect(migrate(restricted)).rejects.toMatchObject({code:'42501'});}finally{await restricted.end();}
  expect((await source.query('SELECT name,sha256 FROM _schema_migration ORDER BY name')).rows).toEqual(before);
  expect(before.some(r=>r.name===migration)).toBe(false);
  // Actual stdin/admin boundary uses the pinned candidate and /app/packages/db/dist/migrate.js.
  expect(migrateZoomLayoutDatabase(qualified)).toMatchObject({migrated:true});
  expect(migrateZoomLayoutDatabase(qualified)).toMatchObject({migrated:true});
  const after=(await source.query('SELECT name,sha256 FROM _schema_migration ORDER BY name')).rows;
  expect(after.filter(r=>r.name!==migration)).toEqual(before);expect(after.find(r=>r.name===migration)?.sha256).toBe(migrationHashes[migration]);
  expect((await source.query('SELECT * FROM clip_layout_intent ORDER BY clip_id,request_key')).rows).toEqual(intentsBefore);
  await insertIntent(2,randomBytes(16).toString('hex'));
  await expect(insertIntent(3,randomBytes(16).toString('hex'))).rejects.toMatchObject({code:'23514'});
  expect((await source.query('SELECT value FROM zoom_source_sentinel')).rows).toEqual([{value:'only-the-owned-source'}]);
  expect(await grants()).toEqual(oldGrants);expect(runtimeIds.map(id=>JSON.parse(docker(['inspect',id]))[0].Config.Env)).toEqual(oldRuntime);
  expect((await source.query('SELECT rolsuper,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=$1',[role])).rows[0]).toEqual({rolsuper:false,rolcreatedb:false,rolcreaterole:false});
  const rollback=qualifyZoomLayoutDatabase({...context,mode:'rollback-c0'});expect(migrateZoomLayoutDatabase(rollback)).toEqual({retained:true,ddl:false});
  await source.query("INSERT INTO _schema_migration(name,sha256) VALUES('999_unknown.sql',$1)",['f'.repeat(64)]);
  try{expect(()=>qualifyZoomLayoutDatabase(context)).toThrow('unknown/changed');}finally{await source.query("DELETE FROM _schema_migration WHERE name='999_unknown.sql'");}
  await source.query("DELETE FROM _schema_migration WHERE name='031_billing_notice.sql'");
  try{expect(()=>qualifyZoomLayoutDatabase(context)).toThrow('other pending');}finally{
    const entry=before.find(r=>r.name==='031_billing_notice.sql');if(entry)await source.query('INSERT INTO _schema_migration(name,sha256) VALUES($1,$2)',[entry.name,entry.sha256]);
  }
  writeFileSync(join(process.env.N5_SCREEN_ARTIFACT_DIR??directory,`zoom-database-${suffix}.private.json`),JSON.stringify({image,identity:qualified.identity,restrictedSqlstate:'42501',priorJournalPreserved:true}),{mode:0o600});
},60000);
