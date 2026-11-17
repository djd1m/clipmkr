import { beforeAll, afterAll, expect, it } from 'vitest';
import { symlinkSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, chmodSync, writeSync, existsSync, ftruncateSync, fsyncSync, lstatSync } from 'node:fs';
import { execFileSync, spawnSync, spawn, type SpawnOptionsWithoutStdio } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { verifyZoomLayoutConformance, validateZoomVitestEvidence } from '../scripts/check-zoom-layout-conformance.mjs';
import { runZoomLayoutMutationAttempt } from '../scripts/test-zoom-layout-mutations.mjs';
import { applyZoomLayoutCurrentVps } from '../scripts/apply-zoom-layout-current-vps.mjs';
// Unit reports/resources are invented. Original nine orchestrator cases stay; new cases execute
// real fixedExecutor and its generated queue/health programs at mocked Docker/DB/HTTP boundaries. No real rollout proof.
const project=process.cwd(), dir=mkdtempSync(join(tmpdir(),'zoom-release-unit-')), repo=join(dir,'repo');
const feature='features/zoom-layout-mockup-conformance/';
const digest=(b: string|Buffer)=>createHash('sha256').update(b).digest('hex');
const git=(...args:string[])=>execFileSync('git',args,{cwd:repo,encoding:'utf8'}).trim();
let candidate:string, tree:string;
const files=['scripts/test-zoom-layout-mutations.mjs','scripts/check-zoom-layout-conformance.mjs','scripts/apply-zoom-layout-current-vps.mjs','tests/zoom-layout-release.test.ts'];
beforeAll(()=>{
  execFileSync('git',['clone','--shared','--quiet',project,repo]);
  for(const file of [...files,'features/zoom-layout-mockup-conformance/reference/pins.json','tests/fixtures/zoom-layout-original.json']) cpSync(resolve(project,file),resolve(repo,file));
  // Only the disposable fixture repository is committed. The shared project is untouched.
  git('add','--',...files,'features/zoom-layout-mockup-conformance/reference/pins.json','tests/fixtures/zoom-layout-original.json');
  git('-c','user.name=Unit fixture','-c','user.email=unit@example.invalid','commit','--quiet','--allow-empty','-m','synthetic fixture');
  candidate=git('rev-parse','HEAD');tree=git('rev-parse','HEAD^{tree}');
},30000);
afterAll(()=>rmSync(dir,{recursive:true,force:true}));
const suites=['zoom-layout-release','screen-layout','screen-layout-conformance','screen-layout-media','clip-layout.integration',
  'clip-music-choice.integration','clip-cta-rerender.integration','render','framing','framing-media','teaser','clip-cta-render','browser/clip-layout'];
const cases:Record<string,string[]>={
  'zoom-layout-release':['current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence'],
  'screen-layout':['v2_parser_is_strict_and_v1_canonical_bytes_are_unchanged'],
  'clip-layout.integration':['033_preserves_v1_rows_and_accepts_only_supported_v2_intents','publication_rejects_composition_version_substitution'],
  'clip-music-choice.integration':['music_rerender_preserves_each_published_composition_version v1-01','music_rerender_preserves_each_published_composition_version v1-02','music_rerender_preserves_each_published_composition_version v2-01','music_rerender_preserves_each_published_composition_version v2-02'],
  'clip-cta-rerender.integration':['cta_rerender_preserves_mixed_composition_versions'],
  'screen-layout-conformance':['original_mockup_01_02_composition_conformance 01','original_mockup_01_02_composition_conformance 02'],
  'screen-layout-media':['v2_overlay_bounding_boxes_preserve_content_and_existing_footer_contracts'],
  'browser/clip-layout':['legacy_layout_changes_version_only_after_explicit_upgrade','v2_02_height_control_reaches_reference_aspect_without_applying','unknown_v1_submission_replays_without_draft_upgrade submitted v1','unknown_v1_submission_replays_without_draft_upgrade submitted v2','v2_native_and_canvas_cover_original_composition_extents width 360','v2_native_and_canvas_cover_original_composition_extents width 1440'],
};
function fixture() {
  const privateDir=mkdtempSync(join(dir,'evidence-'));chmodSync(privateDir,0o700);
  let serial=0;
  const save=(data:unknown)=>{
    const path=join(privateDir,`evidence-${serial++}.json`), bytes=JSON.stringify(data);
    writeFileSync(path,bytes,{mode:0o600});return {path,sha256:digest(bytes)};
  };
  const report=(names=['fixture assertion'],red=false)=>({success:!red,numTotalTestSuites:1,numPassedTestSuites:red?0:1,numFailedTestSuites:red?1:0,numPendingTestSuites:0,numPendingTests:0,numTodoTests:0,numFailedTests:red?names.length:0,numPassedTests:red?0:names.length,numTotalTests:names.length,
    testResults:[{status:red?'failed':'passed',message:'',name:join(repo,'tests/screen-layout.test.ts'),assertionResults:names.map(fullName=>({fullName,status:'passed',failureMessages:[] as string[]}))}]});
  const raw=report();raw.testResults=suites.map(s=>({status:'passed',message:'',name:join(repo,`tests/${s}.test.ts`),assertionResults:(cases[s]??['existing assertion']).map(fullName=>({fullName,status:'passed',failureMessages:[] as string[]}))}));
  raw.numTotalTestSuites=raw.numPassedTestSuites=raw.testResults.length;
  raw.numPassedTests=raw.numTotalTests=raw.testResults.reduce((n,s)=>n+s.assertionResults.length,0);
  const record=(revision=candidate)=>({candidate:revision,tree:git('rev-parse',`${revision}^{tree}`),pid:1234,exit:0,signal:null,
    argv:['node','vitest','run'],startedAt:'2026-11-16T20:00:00Z',finishedAt:'2026-11-16T20:00:01Z',log:save('UNIT FAKE terminal output'),report:save(raw)});
  const c0='654361daf6b8cb9d276bc72477d5fc7b43f6c3be';
  const images={candidate,tree,images:{web:{id:'sha256:'+'1'.repeat(64),ociRevision:candidate},worker:{id:'sha256:'+'2'.repeat(64),ociRevision:candidate}},
    c0:{revision:c0,images:{web:{id:'sha256:79590752c3dac432b75ea5bb6254d4cf86c94e0fdd7de153f00777b1b116107e',ociRevision:c0},worker:{id:'sha256:5105ac5234f9503942f17fde27694a5b0ceafb8acdd6cd0a593acbacb0d6c365',ociRevision:c0}}}};
  const containers=Object.fromEntries(['web','worker-video','worker-llm','worker-stt','db','redis'].map((service,i)=>[service,{
    containerId:service==='db'?'058637c0d0d06315e9d86cf577b4d13a75a4b681bf382bf363607679116e32fa':service==='redis'?'7cd8b347b8820424d518ccfdf76f752d3d3db3eb366e1a22e40c89078e34084f':String(i+3).repeat(64),
    imageId:'sha256:'+'3'.repeat(64),project:'clipmkr-stage-20261028',service,volumes:[] as Array<{type:string;name:string|null;destination:string}>,networks:['fixture-network'],ports:{}}]));
  const compose=save({services:{}});
  const ingressSource='import relocation-proxy 172.29.8.1:5811\nimport relocation-proxy 172.29.8.1:5811\nreverse_proxy 172.29.8.1:5811 {\n import cutover-proxy-options {args[0]}\n}\n';
  const sourceFile=join(privateDir,'Caddyfile');writeFileSync(sourceFile,ingressSource,{mode:0o600});
  const ingressConfig={apps:{http:{servers:{srv0:{routes:[...Array.from({length:4},()=>({handle:[{handler:'reverse_proxy',upstreams:[{dial:'172.29.8.1:5811'}]}]})),
    {handle:[{handler:'reverse_proxy',upstreams:[{dial:'172.29.8.1:5812'}]}]},{handle:[{handler:'static_response',body:'another site',status_code:200}]}]}}}}};
  const activeConfig=save(ingressConfig),ingressPins={containerId:'a'.repeat(64),imageId:'sha256:'+'b'.repeat(64),startedAt:'2026-10-14T07:06:54Z',mounts:[],
    sourceConfig:{path:sourceFile,sha256:digest(ingressSource)},activeConfigSha256:activeConfig.sha256,fixedUpstream:'172.29.8.1:5811',
    importHashes:{},upstreamPaths:Array.from({length:4},(_,i)=>`/apps/http/servers/srv0/routes/${i}/handle/0/upstreams/0`)};
  const originalPath=join(privateDir,'original-source.txt');writeFileSync(originalPath,ingressSource,{mode:0o600});
  const ingress={...ingressPins,activeConfig,originalSource:{path:originalPath,sha256:digest(ingressSource)}};
  const binding={ingress,repo:'/home/clipmkr',publicTarget:'77.83.87.178',origin:'https://clipmkr.ru',machineIdSha256:'1afc81d837f8b8d306903c2db510f8ed7a22b71ec65976ba73b7e81ea6689c10',composePath:compose.path,composeSha256:compose.sha256,containers};
  const sourceHashes=Object.fromEntries(readFileSync(join(repo,feature,'06_implementation_plan.md'),'utf8').split('EXPECTED_CODE_TARGETS:')[1]!.trim().split('\n').map(l=>l.slice(2)).map(p=>[p,digest(readFileSync(join(repo,p)))]));
  const inputHashes=Object.fromEntries(['01_requirements.md','03_adr/001-original-composition-compatibility.md','05_architecture.md','06_implementation_plan.md'].map(p=>[p,digest(readFileSync(join(repo,feature,p)))]));
  const mutations={candidate,tree,results:['camera01above','camera02below','screen02shrink','fullcanvaspanecrop','musicv1silentupgrade','pinsoracleswap'].map(id=>{
    const title=id==='fullcanvaspanecrop'?'v2 native original extents and every live camera frame':id==='musicv1silentupgrade'?'music_rerender_preserves_each_published_composition_version':id==='pinsoracleswap'?'positive_ordered_path':'original_mockup_01_02_composition_conformance';
    const red={...report([title],true),success:false,numFailedTests:1,numPassedTests:0};
    red.testResults[0]!.assertionResults[0]!.status='failed';red.testResults[0]!.assertionResults[0]!.failureMessages=['AssertionError: expected changed behavior'];
    const file='packages/shared/src/screen-layout.ts',sourceHash=sourceHashes[file]!;
    return {id,file,sourceHash,sourceRestored:true,red:{...record(),sourceSha256:'0'.repeat(64),exit:1,report:save(red),log:save('UNIT FAKE RED')},green:{...record(),sourceSha256:sourceHash,report:save(report([title]))}};
  })};
  const c0Run=record(c0),c0Raw=structuredClone(raw);
  for(const name of ['C0 saved v2-01','C0 saved v2-02','C0 unknown v1 submission','C0 unknown v2 submission'])c0Raw.testResults[0]!.assertionResults.push({fullName:name,status:'passed',failureMessages:[]});
  c0Raw.numTotalTests=c0Raw.numPassedTests=c0Raw.testResults.reduce((n,s)=>n+s.assertionResults.length,0);c0Run.report=save(c0Raw);
  const framingResults=['center-instead-of-dual','vertical-dual','narrow-dual','watermark-first','odd-window','both-panels-left','ass-before-assembly'].map(id=>{
    const title={'center-instead-of-dual':'landscape uses both','vertical-dual':'vertical or square','narrow-dual':'narrow','watermark-first':'assembly precedes','odd-window':'real odd source','both-panels-left':'real render','ass-before-assembly':'assembly precedes'}[id]!;
    const red={...report([title],true),success:false,numFailedTests:1,numPassedTests:0};red.testResults[0]!.assertionResults[0]!.status='failed';red.testResults[0]!.assertionResults[0]!.failureMessages=['AssertionError: expected invariant'];
    for(const [phase,data] of [['red',red],['green',report([title])]] as const) {writeFileSync(join(privateDir,`${id}-${phase}.json`),JSON.stringify(data),{mode:0o600});writeFileSync(join(privateDir,`${id}-${phase}.txt`),'UNIT FAKE framing terminal output',{mode:0o600});}
    return {id,red:{exit:1,failed:1,passed:0},green:{exit:0,failed:0,passed:1}};
  });
  const rehearsalNames=['v1_v2_read','pending_v2_replay','music_cta_versions','old_mp4_access','033_retained'];
  const evidence={schema:1,state:'PRE-APPLY',candidate,tree,sourceHashes,tests:[record()],checks:{lint:record(),typecheck:record(),build:record()},
    review:save({candidate,tree,model:'gpt-6-astra',effort:'xhigh',authorModel:'gpt-6.1-sol',sessionId:'unit-fixture-session',findings:[],inputHashes,raw:save('UNIT FAKE review')}),
    c0Tests:[c0Run],framingMutations:{...record(),argv:['node','scripts/test-framing-mutations.mjs',privateDir],sourceHashes:Object.fromEntries(['scripts/test-framing-mutations.mjs','apps/worker/src/render/format.ts','apps/worker/src/render/ffmpeg.ts','tests/framing.test.ts','tests/framing-media.test.ts'].map(p=>[p,digest(readFileSync(join(repo,p)))])),results:save(framingResults)},mutations:save(mutations),host:save(binding),
    rehearsal:save({run:{...record(),report:save(report(rehearsalNames))},images,isolated:true,databaseName:'fixture_test',assertions:['v1_v2_read','pending_v2_replay','music_cta_versions','old_mp4_access','033_retained'].map(name=>({name,status:'passed'}))})};
  const options={candidate,referenceApproval:save({commit:'0cbe2e9194eaff9597341f91f04528097da2711a',originalCommit:'9e19f5746a28bad89c9551ce8cd9934f0f0a4f8e',originalSha256:'7b83572176b7c48c38c5d9d3ed141148c482cc11bb98493c07fcef59fe6f4ad0',uiSha256:'5fdbd7611b7e4a975df03d94a246f9620b64c79580b88748087a655b213f9ee6'}).path,evidence:save(evidence).path,images:save(images).path};
  const observed={machineIdSha256:binding.machineIdSha256,containers:structuredClone(containers),imageRevisions:Object.fromEntries([...Object.values(images.images),...Object.values(images.c0.images)].map(i=>[i.id,i.ociRevision]))};
  const apps=Object.fromEntries(['web','worker-video','worker-llm','worker-stt'].map(s=>[s,{containerId:containers[s]!.containerId,imageId:containers[s]!.imageId}]));
  const calls:string[]=[];
  const deps={repo,composePath:compose.path,ingressPins,ingressProbe:()=>({...ingressPins,running:true,config:ingressConfig}),probe:()=>observed,checkResources:()=>{},appState:()=>structuredClone(apps),execute:async(phase:string)=>{
    calls.push(phase);for(const s of phase==='workers'?['worker-video','worker-llm','worker-stt']:phase==='web'?['web']:[]) apps[s]!.imageId=images.images[s==='web'?'web':'worker'].id;
  }};
  const manifest=save({...options,schema:1,mode:'candidate',directory:privateDir}).path;
  return {options,evidence,images,observed,calls,deps,manifest,save,raw,mutations,privateDir,binding,ingressConfig,ingressSource};
}
it('positive_ordered_path_exercises_real_checker_with_unit_fake_executor',async()=>{
  const f=fixture();
  expect(verifyZoomLayoutConformance(f.options,f.deps).tests).toBeGreaterThan(0);
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).resolves.toMatchObject({postApply:'pending'});
  expect(f.calls).toEqual(['pause','drain','backup','migration','integrity','workers','web','verify','open']);
});
it('current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence',async()=>{
  const changes=[
    (f:ReturnType<typeof fixture>)=>rmSync(f.options.referenceApproval),
    (f:ReturnType<typeof fixture>)=>{f.evidence.candidate='0'.repeat(40);},
    (f:ReturnType<typeof fixture>)=>{f.images.images.worker.ociRevision='0'.repeat(40);writeFileSync(f.options.images,JSON.stringify(f.images));},
    (f:ReturnType<typeof fixture>)=>{f.evidence.tests[0]!.exit=1;},
    (f:ReturnType<typeof fixture>)=>{f.raw.testResults=[];f.evidence.tests[0]!.report=f.save(f.raw);},
    (f:ReturnType<typeof fixture>)=>{f.evidence.tests=[];},
    (f:ReturnType<typeof fixture>)=>{f.raw.testResults[0]!.assertionResults[0]!.fullName='unrelated filtered case';f.evidence.tests[0]!.report=f.save(f.raw);},
    (f:ReturnType<typeof fixture>)=>{f.observed.imageRevisions[f.images.images.worker.id]='0'.repeat(40);},
    (f:ReturnType<typeof fixture>)=>{f.raw.testResults[0]!.assertionResults[0]!.status='pending';f.raw.numPassedTests--;f.evidence.tests[0]!.report=f.save(f.raw);},
    (f:ReturnType<typeof fixture>)=>{f.observed.machineIdSha256='0'.repeat(64);},
    (f:ReturnType<typeof fixture>)=>{f.observed.containers.db!.volumes=[{type:'volume',name:'wrong',destination:'/data'}];},
    (f:ReturnType<typeof fixture>)=>writeFileSync(f.evidence.tests[0]!.report.path,'{}'),
    (f:ReturnType<typeof fixture>)=>{f.evidence.rehearsal=f.save({});},
    (f:ReturnType<typeof fixture>)=>{const r=JSON.parse(readFileSync(f.evidence.rehearsal.path,'utf8'));r.run.report=f.save({success:true,numTotalTests:0,testResults:[]});f.evidence.rehearsal=f.save(r);},
    (f:ReturnType<typeof fixture>)=>{f.evidence.framingMutations.results=f.save([]);},
    (f:ReturnType<typeof fixture>)=>{f.mutations.results[0]!.red.report=f.save({numRuntimeErrorTestSuites:1});f.evidence.mutations=f.save(f.mutations);},
  ];
  for(const change of changes) {
    const f=fixture();change(f);writeFileSync(f.options.evidence,JSON.stringify(f.evidence));
    await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();expect(f.calls).toEqual([]);
  }
});
it('transitive_digest_is_rechecked_before_each_fixed_phase',async()=>{
  const f=fixture(), execute=f.deps.execute;
  f.deps.execute=async phase=>{await execute(phase);if(phase==='pause')writeFileSync(f.evidence.tests[0]!.report.path,'{}');};
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('transitive input changed');
  expect(f.calls).toEqual(['pause','close']);
});
it('aggregate_filtered_reports_require_actual_pass_for_each_mandatory_case',()=>{
  const f=fixture(), other=structuredClone(f.raw);
  f.raw.testResults[0]!.assertionResults[0]!.status='pending';f.raw.numPassedTests--;f.raw.numPendingTests++;
  other.testResults=other.testResults.slice(0,1);other.numTotalTestSuites=other.numPassedTestSuites=1;other.numTotalTests=other.numPassedTests=other.testResults[0]!.assertionResults.length;
  f.evidence.tests[0]!.report=f.save(f.raw);f.evidence.tests.push({...f.evidence.tests[0]!,report:f.save(other)});
  writeFileSync(f.options.evidence,JSON.stringify(f.evidence));
  expect(verifyZoomLayoutConformance(f.options,f.deps).tests).toBeGreaterThan(0);
});
it('CLI_missing_approval_and_unrecognized_commands_fail_without_executor',()=>{
  const f=fixture();rmSync(f.options.referenceApproval);
  for(const [script,args] of [['check-zoom-layout-conformance.mjs',['--candidate',candidate,'--reference-approval',f.options.referenceApproval,'--evidence',f.options.evidence,'--images',f.options.images]],
    ['apply-zoom-layout-current-vps.mjs',['--manifest',f.manifest]],['apply-zoom-layout-current-vps.mjs',['--command','touch /tmp/forbidden']]] as const) {
    const r=spawnSync(process.execPath,[join(repo,'scripts',script),...args],{encoding:'utf8'});expect(r.status).toBe(1);
  }
  expect(f.calls).toEqual([]);
});
it('private_inputs_refuse_symlinks_and_public_permissions',async()=>{
  const f=fixture();chmodSync(f.manifest,0o644);
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();expect(f.calls).toEqual([]);
  const link=join(f.privateDir,'linked.json');symlinkSync(f.options.evidence,link);
  expect(()=>verifyZoomLayoutConformance({...f.options,evidence:link},f.deps)).toThrow('without symlinks');
});

it('post_start_failure_closes_admissions_without_automatic_rollback',async()=>{
  const f=fixture(),execute=f.deps.execute;
  f.deps.execute=async phase=>{await execute(phase);if(phase==='verify')throw new Error('unit health refusal');};
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('unit health refusal');
  expect(f.calls).toEqual(['pause','drain','backup','migration','integrity','workers','web','verify','close']);
  expect(JSON.parse(readFileSync(join(f.privateDir,'apply-state.private.json'),'utf8'))).toMatchObject({status:'stopped',cleanup:'web stopped'});
});

it('compatible_C0_rollback_uses_only_pinned_C0_images_in_unit_fake_phases',async()=>{
  const f=fixture(),manifest=JSON.parse(readFileSync(f.manifest,'utf8'));manifest.mode='rollback-c0';writeFileSync(f.manifest,JSON.stringify(manifest));
  const apps=structuredClone(f.deps.appState());
  f.deps.appState=()=>structuredClone(apps);
  f.deps.execute=async phase=>{f.calls.push(phase);for(const s of phase==='workers'?['worker-video','worker-llm','worker-stt']:phase==='web'?['web']:[])apps[s]!.imageId=f.images.c0.images[s==='web'?'web':'worker'].id;};
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).resolves.toMatchObject({postApply:'pending'});
  expect(f.calls).toEqual(['pause','drain','backup','migration','integrity','workers','web','verify','open']);
});
it('one_compose_lock_blocks_a_concurrent_attempt_in_another_private_directory',async()=>{
  const f=fixture(),execute=f.deps.execute;
  let release=()=>{},entered=()=>{};
  const blocked=new Promise<void>(done=>{release=done;}),ready=new Promise<void>(done=>{entered=done;});
  f.deps.execute=async phase=>{await execute(phase);if(phase==='pause'){entered();await blocked;}};
  const running=applyZoomLayoutCurrentVps(f.manifest,f.deps);await ready;
  try {
    const second=mkdtempSync(join(dir,'second-attempt-'));chmodSync(second,0o700);
    const m={...JSON.parse(readFileSync(f.manifest,'utf8')),directory:second},path=join(second,'manifest.json');writeFileSync(path,JSON.stringify(m),{mode:0o600});
    const secondCalls:string[]=[];
    await expect(applyZoomLayoutCurrentVps(path,{...f.deps,execute:async(phase:string)=>{secondCalls.push(phase);}})).rejects.toThrow('EEXIST');
    expect(secondCalls).toEqual([]);
  } finally {release();await running;}
});

type ResourceFaults={migration?:boolean;preservation?:boolean;journal?:boolean;dead?:string;unready?:string;restarts?:string;health?:boolean;
  adaptDrift?:boolean;loadFailure?:boolean;closeFailureAfterOpen?:boolean;sourceDrift?:boolean;ingressRestart?:boolean;openFailure?:boolean;dbAfterOpen?:boolean};
function fixedFixture(faults:ResourceFaults={},rollback=false) {
  const f=fixture(),trace:string[]=[],boot='2026-11-16T20:00:00Z';let clock=Date.now(),snapshotCount=0,closed=false;
  if(rollback){const m=JSON.parse(readFileSync(f.manifest,'utf8'));m.mode='rollback-c0';writeFileSync(f.manifest,JSON.stringify(m));}
  const selected=()=>JSON.parse(readFileSync(f.manifest,'utf8')).mode==='rollback-c0'?f.images.c0.images:f.images.images;
  const models=Object.fromEntries(Object.entries(f.binding.containers).map(([service,c],index)=>[service,{Id:c.containerId,Image:c.imageId,RestartCount:0,
    State:{Running:true,Status:'running',ExitCode:0,Paused:false,Restarting:false,Dead:false,StartedAt:boot},
    Mounts:c.volumes.map(v=>({Type:v.type,Name:v.name,Destination:v.destination})),
    NetworkSettings:{Networks:Object.fromEntries(c.networks.map(n=>[n,{IPAddress:`172.30.0.${index+2}`}]))}}]));
  const ingress={Id:f.binding.ingress.containerId,Image:f.binding.ingress.imageId,Mounts:[],State:{Running:true,StartedAt:f.binding.ingress.startedAt}};
  let active=structuredClone(f.ingressConfig);
  const closedConfig=structuredClone(active);
  for(let i=0;i<4;i++)closedConfig.apps.http.servers.srv0.routes[i]!.handle=[{handler:'static_response',status_code:503}] as typeof closedConfig.apps.http.servers.srv0.routes[number]['handle'];
  const snapshot:{journal:Record<string,string>;accounts?:string}={...Object.fromEntries(['accounts','credits','grants','allocations','quota','intents','keys','sources'].map(k=>[k,'unchanged'])),
    journal:{'032_clip_layout.sql':'23f93ca25da73cf2e69d4dab1ab321d922326acf9de1bdf03cb0439f679f182b'} as Record<string,string>};
  const migration='033_clip_layout_composition_v2.sql',migrationHash=digest(readFileSync(join(project,'packages/db/migrations',migration)));
  if(rollback)snapshot.journal[migration]=migrationHash;
  function program(source:string,shim:string) {
    return execFileSync(process.execPath,['-e',shim+'\n'+source],{encoding:'utf8',env:{NODE_ENV:'test',PATH:process.env.PATH,REDIS_URL:'redis://unit:unit@localhost/14'}}).trim();
  }
  function docker(args:string[],input?:string,outputFd?:number) {
    expect(args.some(a=>a.startsWith('http://localhost:2019'))).toBe(false);
    if(args[0]==='ps') {
      const service=args.find(a=>a.startsWith('label=com.docker.compose.service='))!.split('=').at(-1)!;
      return models[service]!.Id;
    }
    if(args[0]==='inspect') {
      const value=args[1]===ingress.Id?ingress:Object.values(models).find(m=>m.Id===args[1]);
      expect(value).toBeDefined();return JSON.stringify([value]);
    }
    if(args[0]==='exec' && args.includes('caddy')) {
      trace.push('adapt');const value=structuredClone(input!.includes('respond 503')?closedConfig:f.ingressConfig);
      if(faults.adaptDrift && input!.includes('respond 503'))Object.assign(value.apps.http.servers.srv0.routes[4]!.handle[0]!,{upstreams:[{dial:'other:9000'}]});
      return JSON.stringify(value);
    }
    if(args[0]==='exec' && args.includes('http://127.0.0.1:2019/config/'))return JSON.stringify(active);
    if(args[0]==='exec' && args.includes('http://127.0.0.1:2019/load')) {
      const value=JSON.parse(input!),opening=JSON.stringify(value)===JSON.stringify(f.ingressConfig);
      trace.push(opening?'admission:open':'admission:close');
      if(!opening)expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toContain('172.29.8.1:5811');
      if(faults.loadFailure || !opening && faults.closeFailureAfterOpen && trace.includes('admission:open'))throw new Error('unit Caddy transport unavailable');
      active=value;closed=!opening;
      if(opening && faults.dbAfterOpen)models.db!.State.Running=false;
      if(opening && faults.openFailure)throw new Error('unit open response lost');
      return '';
    }
    if(args[0]==='stop'){trace.push('stop:web');models.web!.State.Running=false;models.web!.State.Status='exited';return '';}
    if(outputFd!==undefined){trace.push('backup');writeSync(outputFd,'UNIT FAKE PG DUMP');return '';}
    if(args[0]==='compose') {
      if(args.includes('stop')) {
        for(const service of ['web','worker-video','worker-llm','worker-stt'].filter(s=>args.includes(s))) {
          trace.push('stop:'+service);models[service]!.State.Running=false;models[service]!.State.Status='exited';
        }
        return '';
      }
      if(args.includes('packages/db/dist/migrate.js')) {
        trace.push('migration');expect(closed).toBe(true);
        if(faults.migration)throw new Error('unit migration refused');snapshot.journal[migration]=migrationHash;return '';
      }
      if(args.includes('run') && args.at(-1)!.includes('getJobCounts')){expect(closed).toBe(true);trace.push('drain');return '{"idle":true}';}
      if(args.includes('run')) {
        trace.push('snapshot');snapshotCount++;
        expect(closed).toBe(true);expect(models.web!.State.Running).toBe(false);
        for(const s of ['worker-video','worker-llm','worker-stt'])expect(models[s]!.State.Running).toBe(false);
        const value=structuredClone(snapshot);
        if(snapshotCount===2) {
          value.journal[migration]=faults.journal?'wrong':migrationHash;
          if(faults.preservation)value.accounts='changed';
        }
        return JSON.stringify(value);
      }
      if(args.includes('up')) {
        expect(closed).toBe(true);
        expect(snapshotCount).toBe(2);
        for(const service of ['web','worker-video','worker-llm','worker-stt'].filter(s=>args.includes(s))) {
          trace.push('start:'+service);const m=models[service]!;
          m.Id=digest(service+selected()[service==='web'?'web':'worker'].id);m.Image=selected()[service==='web'?'web':'worker'].id;m.State.Running=true;m.State.Status='running';
          if(service===faults.dead){m.State.Running=false;m.State.Status='exited';m.State.ExitCode=1;}
          if(service===faults.restarts)m.RestartCount=1;
          if(service!=='web')m.NetworkSettings.Networks={'clipmkr-stage-20261028_default':{IPAddress:`172.30.0.${['worker-video','worker-llm','worker-stt'].indexOf(service)+8}`}};
        }
        return '';
      }
    }
    const source=args.at(-1)!;
    if(args[0]==='exec' && source.includes('getJobCounts')){trace.push('drain');return '{"idle":true}';}
    if(args[0]==='exec' && source.includes('getWorkers')) {
      trace.push('readiness');
      const queues=Object.fromEntries(['worker-stt','worker-llm','worker-video'].map(s=>[{'worker-stt':'stt','worker-llm':'select','worker-video':'render'}[s]!,
        s===faults.unready?[]:[{addr:models[s]!.NetworkSettings.Networks['clipmkr-stage-20261028_default']!.IPAddress+':12345'}]]));
      // Execute the actual generated program; only BullMQ/Redis clients are replaced.
      const shim=`const queues=${JSON.stringify(queues)};const realRequire=require;require=n=>n==='bullmq'?{Queue:class{constructor(name){this.name=name;}async getWorkers(){return queues[this.name];}async close(){}}}:n==='@clipmaker/queue'?{getRedisConnection:()=>({})}:realRequire(n);`;
      return program(source,shim);
    }
    if(args[0]==='exec' && source.includes('127.0.0.1:3000/health')) {
      trace.push('health');expect(closed).toBe(true);
      if(faults.sourceDrift)writeFileSync(f.binding.ingress.sourceConfig.path,'foreign config');
      if(faults.ingressRestart)ingress.State.StartedAt='2026-11-17T01:02:03Z';
      const shim=`global.fetch=async()=>({ok:${!faults.health},json:async()=>({status:'ok',revision:${JSON.stringify(JSON.parse(readFileSync(f.manifest,'utf8')).mode==='rollback-c0'?f.images.c0.revision:candidate)}})});`;
      return program(source,shim);
    }
    throw new Error('unexpected unit Docker boundary');
  }
  const {execute:_execute,appState:_appState,checkResources:_resources,ingressProbe:_ingressProbe,...boundaries}=f.deps;
  const deps={...boundaries,docker,machineIdSha256:f.binding.machineIdSha256,now:()=>clock,sleep:async()=>{clock+=45001;}};
  function fresh(mode='rollback-c0') {
    const next=mkdtempSync(join(dir,'fresh-inventory-'));chmodSync(next,0o700);snapshotCount=0;f.binding.ingress.startedAt=ingress.State.StartedAt;
    for(const [service,m] of Object.entries(models)) {
      Object.assign(f.binding.containers[service]!,{containerId:m.Id,imageId:m.Image,networks:Object.keys(m.NetworkSettings.Networks)});
      f.observed.containers[service]=structuredClone(f.binding.containers[service]!);
    }
    f.evidence.host=f.save(f.binding);f.options.evidence=f.save(f.evidence).path;
    const manifest={...JSON.parse(readFileSync(f.manifest,'utf8')),evidence:f.options.evidence,directory:next,mode};f.manifest=join(next,'manifest.json');
    writeFileSync(f.manifest,JSON.stringify(manifest),{mode:0o600});return f.manifest;
  }
  return {...f,trace,deps,models,ingress,active:()=>active,fresh,faults};
}
it('fixed_executor_positive_preserves_before_any_writer_and_opens_only_after_all_health',async()=>{
  const f=fixedFixture();await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).resolves.toMatchObject({postApply:'pending'});
  const t=f.trace;expect(t.indexOf('admission:close')).toBeLessThan(t.indexOf('stop:web'));
  expect(t.lastIndexOf('snapshot')).toBeLessThan(t.indexOf('start:worker-video'));
  expect(t.indexOf('readiness')).toBeLessThan(t.indexOf('start:web'));
  expect(t.indexOf('health')).toBeLessThan(t.indexOf('admission:open'));
  expect(t.filter(s=>s==='snapshot')).toHaveLength(2);
  expect(f.active()).toEqual(f.ingressConfig);expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).toBe(f.ingressSource);
});
it.each(['migration','preservation','journal'] as const)('fixed_executor_%s_refusal_happens_before_workers_and_web',async fault=>{
  const f=fixedFixture({[fault]:true});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();
  expect(f.trace.some(s=>s.startsWith('start:'))).toBe(false);expect(f.trace).not.toContain('admission:open');
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toContain('172.29.8.1:5811');
});
it.each(['worker-stt','worker-llm','worker-video'])('fixed_executor_dead_%s_blocks_web',async service=>{
  const f=fixedFixture({dead:service});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('reader dead/unready');
  expect(f.trace).not.toContain('start:web');expect(f.trace).not.toContain('admission:open');
});
it.each(['worker-stt','worker-llm','worker-video'])('fixed_executor_unregistered_%s_blocks_web',async service=>{
  const f=fixedFixture({unready:service});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('queue registration unready');
  expect(f.trace).not.toContain('start:web');expect(f.trace).not.toContain('admission:open');
});
it('fixed_executor_restarted_worker_blocks_web',async()=>{
  const f=fixedFixture({restarts:'worker-llm'});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('reader dead/unready');
  expect(f.trace).not.toContain('start:web');expect(f.trace).not.toContain('admission:open');
});
it('fixed_executor_health_failure_keeps_restart_source_closed_and_stops_web',async()=>{
  const f=fixedFixture({health:true});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('private web health');
  expect(f.trace).toContain('health');expect(f.trace).not.toContain('admission:open');expect(f.models.web!.State.Running).toBe(false);
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toContain('172.29.8.1:5811');
});
it.each(['adaptDrift','loadFailure','sourceDrift','ingressRestart','openFailure'] as const)('fixed_executor_%s_refuses_and_never_restores_source_automatically',async fault=>{
  const f=fixedFixture({[fault]:true});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();
  expect(f.models.web!.State.Running).toBe(false);
  if(fault!=='adaptDrift')expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toBe(f.ingressSource);
  expect(f.active().apps.http.servers.srv0.routes.slice(4)).toEqual(f.ingressConfig.apps.http.servers.srv0.routes.slice(4));
});
it('fixed_executor_DB_failure_after_open_still_closes_ingress_and_web',async()=>{
  const f=fixedFixture({dbAfterOpen:true});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow('DB/Redis identity/state changed');
  expect(f.trace).toContain('admission:open');expect(f.trace.at(-1)).toBe('stop:web');
  expect(f.models.web!.State.Running).toBe(false);
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toContain('172.29.8.1:5811');
  expect(f.active().apps.http.servers.srv0.routes.slice(0,4).every(r=>r.handle[0]!.handler==='static_response')).toBe(true);
});
it('fixed_executor_C0_rollback_retains_033_without_executing_any_DDL',async()=>{
  const f=fixedFixture({},true);await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).resolves.toMatchObject({postApply:'pending'});
  expect(f.trace).not.toContain('migration');expect(f.trace.filter(s=>s==='snapshot')).toHaveLength(2);
  for(const [s,m] of Object.entries(f.models))if(s==='web'||s.startsWith('worker-'))expect(m.Image).toBe(f.images.c0.images[s==='web'?'web':'worker'].id);
});
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
it.each(['identity','config','upstreams','source'] as const)('fixed_executor_invalid_ingress_%s_fails_before_writes',async kind=>{
  const f=fixedFixture(),binding=structuredClone(f.binding);
  if(kind==='identity')binding.ingress.containerId='f'.repeat(64);
  if(kind==='config')binding.ingress.activeConfig=f.save({});
  if(kind==='upstreams')binding.ingress.upstreamPaths.pop();
  if(kind==='source')writeFileSync(binding.ingress.sourceConfig.path,'wrong');
  f.evidence.host=f.save(binding);writeFileSync(f.options.evidence,JSON.stringify(f.evidence));
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();expect(f.trace).toEqual([]);
});
it('fresh_mutation_attempt_rejects_stale_RED_when_new_child_writes_no_JSON',async()=>{
  const f=fixture(),stale=join(f.privateDir,'camera01above-red.vitest.json');
  writeFileSync(stale,JSON.stringify({numRuntimeErrorTestSuites:0,testResults:[{assertionResults:[{status:'failed',fullName:'behavior',failureMessages:['AssertionError: expected']}]}]}));
  let attempted='';
  const child=(binary:string,args:readonly string[],options:SpawnOptionsWithoutStdio)=>{
    attempted=args!.find(a=>a.startsWith('--outputFile='))!.slice('--outputFile='.length);
    return spawn(binary,['-e','process.exit(1)'],options);
  };
  await expect(runZoomLayoutMutationAttempt({output:f.privateDir,checkout:repo,id:'camera01above',phase:'red',test:'unused',title:'behavior',candidate,tree,sourcePath:join(repo,files[0]!)},{spawn:child})).rejects.toThrow('fresh mutation report missing');
  expect(attempted).not.toBe(stale);expect(existsSync(attempted)).toBe(false);expect(existsSync(stale)).toBe(true);
});
it.each(['behavior','runtime','import','unrelated','zero-suite','file-error','unhandled'] as const)('fresh_mutation_attempt_%s_requires_its_own_behavioral_report',async kind=>{
  const f=fixture();
  const child=(binary:string,args:readonly string[],options:SpawnOptionsWithoutStdio)=>{
    const output=args!.find(a=>a.startsWith('--outputFile='))!.slice('--outputFile='.length);
    const raw={success:false,numTotalTestSuites:1,numPassedTestSuites:0,numFailedTestSuites:1,numPendingTestSuites:0,numTotalTests:1,numPassedTests:0,numFailedTests:1,numPendingTests:0,numTodoTests:0,testResults:[{name:'unit.test.ts',status:'failed',message:kind==='file-error'?'Cannot find module':'',assertionResults:[{status:'failed',fullName:kind==='unrelated'?'wrong':'behavior',failureMessages:[kind==='import'?'ReferenceError: missing':'AssertionError: expected behavior']}]}]};
    if(kind==='runtime')Object.assign(raw,{numRuntimeErrorTestSuites:1});if(kind==='zero-suite')raw.testResults=[];
    return spawn(binary,['-e',`require('node:fs').writeFileSync(${JSON.stringify(output)},${JSON.stringify(JSON.stringify(raw))});console.log(${JSON.stringify(kind==='unhandled'?'Vitest caught 1 unhandled error during the test run.':'UNIT child terminal')});process.exit(1)`],options);
  };
  const running=runZoomLayoutMutationAttempt({output:f.privateDir,checkout:repo,id:'camera01above',phase:'red',test:'unused',title:'behavior',candidate,tree,sourcePath:join(repo,files[0]!)},{spawn:child});
  if(kind==='behavior')await expect(running).resolves.toMatchObject({exit:1,failed:1,signal:null});
  else await expect(running).rejects.toThrow();
});

it.each([['health','rollback-c0'],['migration','candidate'],['ingressRestart','rollback-c0'],['loadFailure','candidate']] as const)('failed_%s_fresh_inventory_recovers_%s_with_original_pins',async(fault,mode)=>{
  const f=fixedFixture({[fault]:true}),pins=JSON.stringify(f.deps.ingressPins),oldEvidence=f.options.evidence,oldBytes=readFileSync(oldEvidence,'utf8');
  await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).not.toBe(f.ingressSource);
  const priorState=readFileSync(join(f.privateDir,'apply-state.private.json'),'utf8');f.faults[fault]=false;
  const boundary=f.trace.length,next=f.fresh(mode);
  await expect(applyZoomLayoutCurrentVps(next,f.deps)).resolves.toMatchObject({postApply:'pending'});
  expect(JSON.stringify(f.deps.ingressPins)).toBe(pins);expect(readFileSync(join(f.privateDir,'apply-state.private.json'),'utf8')).toBe(priorState);
  expect(readFileSync(oldEvidence,'utf8')).toBe(oldBytes);
  for(const s of ['web','worker-stt','worker-llm','worker-video'])expect(f.models[s]!.Image).toBe((mode==='rollback-c0'?f.images.c0.images:f.images.images)[s==='web'?'web':'worker'].id);
  const recovery=f.trace.slice(boundary);if(mode==='rollback-c0')expect(recovery).not.toContain('migration');
  expect(recovery.indexOf('health')).toBeLessThan(recovery.indexOf('admission:open'));
  expect(f.active()).toEqual(f.ingressConfig);expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).toBe(f.ingressSource);
});
it.each(['source','native','snapshot'] as const)('closed_recovery_rejects_foreign_%s_before_writes',async kind=>{
  const f=fixedFixture({health:true});await expect(applyZoomLayoutCurrentVps(f.manifest,f.deps)).rejects.toThrow();
  const next=f.fresh(),boundary=f.trace.length;
  if(kind==='source')writeFileSync(f.binding.ingress.sourceConfig.path,'foreign');
  if(kind==='native')Object.assign(f.active().apps.http.servers.srv0.routes[4]!.handle[0]!,{body:'foreign'});
  if(kind==='snapshot')writeFileSync(f.binding.ingress.originalSource.path,'foreign');
  await expect(applyZoomLayoutCurrentVps(next,f.deps)).rejects.toThrow();expect(f.trace.slice(boundary)).toEqual([]);
});
function fileFault(f:ReturnType<typeof fixedFixture>,kind:string,opening=false) {
  let injected=false,partial=false,writes=0;
  const armed=()=>!injected && (!opening || f.trace.includes('admission:open'));
  const ingressIO={
    write(fd:number,bytes:Buffer,offset:number,length:number,position:number) {
      writes++;
      if(armed() && kind==='before'){injected=true;throw new Error('unit before write');}
      if(armed() && kind==='partial') {
        if(!partial){partial=true;return writeSync(fd,bytes,offset,Math.min(7,length),position);}
        injected=true;throw new Error('unit after acknowledged partial write');
      }
      return writeSync(fd,bytes,offset,length,position);
    },
    truncate:ftruncateSync,
    sync(fd:number) {
      if(armed() && kind==='fsync'){injected=true;throw new Error('unit fsync unavailable');}
      if(armed() && kind==='inverse'){injected=true;f.ingress.State.StartedAt='2026-11-17T02:03:04Z';for(const route of f.active().apps.http.servers.srv0.routes.slice(0,4))route.handle=[{handler:'static_response',status_code:503}] as typeof route.handle;}
      if(armed() && kind==='foreign') {injected=true;writeFileSync(f.binding.ingress.sourceConfig.path,f.ingressSource);}
      fsyncSync(fd);
    }
  };
  return {deps:{...f.deps,ingressIO},writes:()=>writes};
}
it.each(['before','partial','fsync'] as const)('source_%s_failure_preserves_inode_and_complete_known_bytes',async kind=>{
  const f=fixedFixture(),path=f.binding.ingress.sourceConfig.path,inode=lstatSync(path).ino,io=fileFault(f,kind);
  await expect(applyZoomLayoutCurrentVps(f.manifest,io.deps)).rejects.toThrow('unit');
  expect(lstatSync(path).ino).toBe(inode);expect(f.models.web!.State.Running).toBe(false);expect(f.trace).not.toContain('admission:open');
  const actual=readFileSync(path,'utf8');if(kind==='fsync')expect(actual).toContain('respond 503');else expect(actual).toBe(f.ingressSource);
  if(kind==='before')expect(io.writes()).toBe(1);if(kind==='partial')expect(io.writes()).toBe(3);
  expect(f.active().apps.http.servers.srv0.routes.slice(4)).toEqual(f.ingressConfig.apps.http.servers.srv0.routes.slice(4));
});
it('own_partial_open_write_recovers_closed_baseline_then_closes_active_admission',async()=>{
  const f=fixedFixture(),io=fileFault(f,'partial',true);
  await expect(applyZoomLayoutCurrentVps(f.manifest,io.deps)).rejects.toThrow('unit after acknowledged');
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).toContain('respond 503');expect(f.models.web!.State.Running).toBe(false);
  expect(f.trace.indexOf('health')).toBeLessThan(f.trace.indexOf('admission:open'));expect(f.trace.at(-2)).toBe('admission:close');
});
it('foreign_baseline_after_full_write_is_not_mistaken_for_own_partial_progress',async()=>{
  const f=fixedFixture(),io=fileFault(f,'foreign');
  await expect(applyZoomLayoutCurrentVps(f.manifest,io.deps)).rejects.toThrow('final readback drift');
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')).toBe(f.ingressSource);expect(io.writes()).toBe(1);
  expect(f.trace).not.toContain('admission:close');expect(f.models.web!.State.Running).toBe(false);
});

it('authentic_Vitest_JSON_shape_roundtrip_and_runtime_negatives',()=>{
  const f=fixture(),path=join(f.privateDir,'actual.json'),config=join(f.privateDir,'vitest.config.mjs');
  writeFileSync(config,'export default '+JSON.stringify({root:f.privateDir,test:{include:['actual.test.mjs'],maxWorkers:1,fileParallelism:false}}));
  writeFileSync(join(f.privateDir,'actual.test.mjs'),`import {it,expect} from ${JSON.stringify(join(project,'node_modules/vitest/dist/index.js'))};it('authentic',()=>expect(1).toBe(1));`);
  const log=execFileSync(process.execPath,[join(project,'node_modules/vitest/vitest.mjs'),'run','--config',config,'--reporter=default','--reporter=json',`--outputFile=${path}`],{encoding:'utf8'});
  const raw=JSON.parse(readFileSync(path,'utf8'));expect(Object.hasOwn(raw,'numRuntimeErrorTestSuites')).toBe(false);
  expect(validateZoomVitestEvidence(raw,log)).toHaveLength(1);expect(validateZoomVitestEvidence({...raw,numRuntimeErrorTestSuites:0},log)).toHaveLength(1);
  for(const kind of ['nonzero','file','zero','runtime-log']){const r=structuredClone(raw);if(kind==='nonzero')r.numRuntimeErrorTestSuites=1;if(kind==='file')r.testResults[0].message='Import failed';if(kind==='zero')r.testResults=[];
    expect(()=>validateZoomVitestEvidence(r,kind==='runtime-log'?log+'\nUnhandled Rejection':log)).toThrow();}
});

it.each(['post-health','inverse','running','foreign'] as const)('mixed_%s_requires_stopped_web_and_normalizes_before_C0_drain',async kind=>{
  const f=fixedFixture({closeFailureAfterOpen:kind!=='inverse'}),io=fileFault(f,kind==='inverse'?'inverse':'partial',true);
  await expect(applyZoomLayoutCurrentVps(f.manifest,io.deps)).rejects.toThrow();expect(f.models.web!.State.Running).toBe(false);
  expect(readFileSync(f.binding.ingress.sourceConfig.path,'utf8')===f.ingressSource).toBe(kind==='inverse');
  if(kind==='running'){f.models.web!.State.Running=true;f.models.web!.State.Status='running';}
  if(kind==='foreign')Object.assign(f.active().apps.http.servers.srv0.routes[4]!.handle[0]!,{body:'foreign'});
  f.faults.closeFailureAfterOpen=false;const next=f.fresh(),boundary=f.trace.length;
  if(kind==='running'||kind==='foreign'){await expect(applyZoomLayoutCurrentVps(next,f.deps)).rejects.toThrow();expect(f.trace.slice(boundary)).toEqual([]);}
  else {await expect(applyZoomLayoutCurrentVps(next,f.deps)).resolves.toMatchObject({postApply:'pending'});const recovery=f.trace.slice(boundary);
    expect(recovery.indexOf('admission:close')).toBeLessThan(recovery.indexOf('drain'));expect(recovery).not.toContain('migration');
    expect(f.active()).toEqual(f.ingressConfig);for(const s of ['web','worker-stt','worker-llm','worker-video'])expect(f.models[s]!.Image).toBe(f.images.c0.images[s==='web'?'web':'worker'].id);}
});
