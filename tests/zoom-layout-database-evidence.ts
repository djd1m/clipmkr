import { expect, it } from 'vitest';
import { readFileSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { qualifyZoomLayoutDatabase } from '../scripts/zoom-layout-database.mjs';
import { join, dirname } from 'node:path';
import { verifyZoomLayoutConformance } from '../scripts/check-zoom-layout-conformance.mjs';
import { applyZoomLayoutCurrentVps } from '../scripts/apply-zoom-layout-current-vps.mjs';

type Ref={path:string;sha256:string};
type Fixture={
  options:Parameters<typeof verifyZoomLayoutConformance>[0];
  deps:NonNullable<Parameters<typeof applyZoomLayoutCurrentVps>[1]>;
  privateDir:string;
  evidence:{framingMutations:{sourceHashes:Record<string,string>;exit:number;results:Ref}};
  save(data:unknown):Ref;
};
type FixedFixture=Fixture & {
  manifest:string;trace:string[];ingressSource:string;
  binding:{composePath:string;ingress:{sourceConfig:{path:string}}};
  models:Record<string,{State:{Running:boolean}}>;
  deps:Fixture['deps'] & {database:{qualify:()=>{revalidate:(live?:boolean)=>void};backup:()=>void;migrate:()=>void}};
};
export function registerZoomLayoutDatabaseEvidenceTests(fixture:()=>Fixture,fixedFixture:()=>FixedFixture) {
it.each(['missing','source','raw','skipped','runtime','unrelated','nonterminal'] as const)('mandatory_framing_gate_rejects_%s_proof',kind=>{
  const f=fixture(),framing=f.evidence.framingMutations;
  if(kind==='missing')delete (f.evidence as Partial<typeof f.evidence>).framingMutations;
  if(kind==='source')framing.sourceHashes['apps/worker/src/render/format.ts']='wrong';
  if(kind==='nonterminal')framing.exit=1;
  const path=join(f.privateDir,'center-instead-of-dual-green.json');
  if(kind==='raw')rmSync(path);
  if(['skipped','runtime','unrelated'].includes(kind)) {
    const raw=JSON.parse(readFileSync(path,'utf8'));
    if(kind==='skipped')raw.testResults[0].assertionResults[0].status='skipped';
    if(kind==='runtime')raw.numRuntimeErrorTestSuites=1;
    if(kind==='unrelated')raw.testResults[0].assertionResults[0].fullName='unrelated';
    writeFileSync(path,JSON.stringify(raw));
  }
  writeFileSync(f.options.evidence,JSON.stringify(f.evidence));expect(()=>verifyZoomLayoutConformance(f.options,f.deps)).toThrow();
});
  // These are executor boundary faults, not realPG evidence. The actual helper is tested separately below.
  it.each(['wrong-name','wrong-oid','wrong-cluster','dns-alias','runtime-disagreement','wrong-admin','restricted-admin','schema-create','owner-member-only','connection-timeout','query-timeout','child-timeout'])(
    'database_qualification_failure_has_zero_pause_close_or_stop %s',async fault=>{
      const f=fixedFixture(),db=databaseBoundary(fault);
      f.deps.database.qualify=()=>qualifyZoomLayoutDatabase(db.context,{docker:db.docker});
      await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('zoom database:');
      expect(db.commands.every(a=>!a.includes('ADMIN-PRIVATE-SYNTHETIC'))).toBe(true);
      expect(f.trace).toEqual([]);expect(f.models.web!.State.Running).toBe(true);
      expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).toBe(f.ingressSource);
      expect(existsSync(join(f.privateDir,'apply-state.private.json'))).toBe(false);
      expect(existsSync(join(dirname(f.binding.composePath),'zoom-layout-apply.lock'))).toBe(false);
    });
  it.each(['before-pause','before-backup','before-migration'])(
    'database_identity_or_authority_drift_blocks_backup_and_migration %s',async phase=>{
      const f=fixedFixture();let liveCalls=0,stoppedCalls=0;
      f.deps.database.qualify=()=>({revalidate:live=>{
        if(live)liveCalls++;else stoppedCalls++;
        if(phase==='before-pause' && liveCalls===1 || phase==='before-backup' && stoppedCalls===1 || phase==='before-migration' && stoppedCalls===2)throw new Error('zoom database: authority drift');
      }});
      await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('authority drift');
      expect(f.trace).not.toContain('migration');expect(f.trace).not.toContain('admission:open');
      if(phase!=='before-migration')expect(f.trace).not.toContain('backup');
      if(phase==='before-pause')expect(f.trace).toEqual([]);
      else expect(f.models.web!.State.Running).toBe(false);
    });
}

// Invented SQL/inspect responses, used to exercise the actual helper's decisions, never called realPG proof.
function databaseBoundary(fault:string) {
  const dbId='d'.repeat(64),image='sha256:'+'b'.repeat(64),commands:string[]=[],apps=['web','worker-stt','worker-llm','worker-video'];
  const containers=Object.fromEntries(['db',...apps].map((name,i)=>[name,{containerId:name==='db'?dbId:String(i).repeat(64),imageId:image}]));
  const database={databaseName:'owned_fixture_test',databaseOid:'123',systemIdentifier:'456'};
  const identity={name:database.databaseName,oid:'123',system_identifier:'456',role:'admin',search_path:'public',port:5432,
    schema_create:true,journal_access:true,intent_owner:true,intent_check:true,journal_oid:'80',public_journal_oid:'80',intent_oid:'81',public_intent_oid:'81'};
  const journal=Object.fromEntries(readdirSync('packages/db/migrations').filter(n=>/\.sql$/.test(n) && !n.startsWith('033_')).sort()
    .map(n=>[n,createHash('sha256').update(readFileSync(join('packages/db/migrations',n))).digest('hex')]));
  let child='',running=false;
  function docker(args:string[],input?:string) {
    commands.push(args.join(' '));
    if(args[0]==='inspect') {
      if(args[1]===child)return JSON.stringify([{State:{Running:running,Status:running?'running':'exited',ExitCode:0}}]);
      const name=Object.keys(containers).find(k=>containers[k]!.containerId===args[1])!;
      return JSON.stringify([{Id:containers[name]!.containerId,Image:image,State:{Running:true},Mounts:[],NetworkSettings:{Networks:{own:{IPAddress:'10.0.0.2'}}},
        Config:{Env:name==='db'?['POSTGRES_USER=admin','POSTGRES_PASSWORD=ADMIN-PRIVATE-SYNTHETIC','POSTGRES_DB=decoy_test']:['DATABASE_URL=postgresql://limited:synthetic@db:5432/owned_fixture_test']}}]);
    }
    if(args[0]==='exec' && args.includes('node')) {
      if(fault==='connection-timeout')throw new Error('bounded connection refusal');
      const r={name:database.databaseName,oid:'123',role:'limited',search_path:'"$user", public',address:'10.0.0.2',port:5432,addresses:['10.0.0.2']};
      if(fault==='wrong-name')r.name='decoy_test';if(fault==='wrong-oid')r.oid='789';
      if(fault==='dns-alias')r.addresses=['10.0.0.99'];
      if(fault==='runtime-disagreement' && args[1]===containers['worker-stt']!.containerId)r.oid='789';
      return JSON.stringify(r);
    }
    if(args[0]==='create') {child=args[args.indexOf('--name')+1]!;return 'e'.repeat(64);}
    if(args[0]==='start') {
      const config=JSON.parse(input!).config;expect(config).toMatchObject({password:'ADMIN-PRIVATE-SYNTHETIC',host:'127.0.0.1',database:database.databaseName});
      expect(config.options).toContain('search_path=public');expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
      if(fault==='child-timeout'){running=true;throw Object.assign(new Error('bounded child timeout'),{unknown:true,signal:'SIGKILL'});}
      if(fault==='query-timeout' || fault==='wrong-admin')return JSON.stringify({failure:true,sqlstate:fault==='wrong-admin'?'28P01':'57014'});
      if(fault==='wrong-cluster')identity.system_identifier='789';if(fault==='restricted-admin')identity.journal_access=false;
      if(fault==='schema-create')identity.schema_create=false;if(fault==='owner-member-only')identity.intent_owner=false;
      return JSON.stringify({identity,journal});
    }
    if(args[0]==='kill'){running=false;return '';}
    if(args[0]==='rm')return '';
    if(args[0]==='exec' && args.includes('psql'))return '0';
    throw new Error('unexpected synthetic DB boundary');
  }
  return {context:{binding:{containers,database},images:{images:{worker:{id:image}}},mode:'candidate'},docker,commands};
}
