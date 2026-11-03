// Fault tests execute the embedded remote program against disposable fake Docker.
// They are not evidence of a real deployment or real resource exhaustion.
import { describe, expect, it } from 'vitest';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { loadCandidateProfile } from '../scripts/release-candidate.mjs';

function embeddedDiskLibrary(source: string): string {
  const parser = source.match(/const imageMeasurement = (String\.raw`[\s\S]*?`);/);
  const disk = source.match(/const diskAdmission = (String\.raw`[\s\S]*?`);/);
  if (!parser || !disk) throw new Error('embedded disk admission missing');
  const measured = runInNewContext(parser[1]!) as string;
  return measured.slice(0, measured.indexOf("if __name__=='__main__':")) + (runInNewContext(disk[1]!) as string);
}
const fakeDiskSystem = String.raw`
def proc_info(prefix): return {'dockerd':[{'argv':[],'tmp':[]}],'containerd':[{'argv':['--root=/var/lib/containerd'],'tmp':[]}]}
def daemon_configs(prefix,d,c): return {},{}
def read_command(args):
    return json.dumps({'Driver':'overlayfs','DriverStatus':[['driver-type','io.containerd.snapshotter.v1']],'DockerRootDir':'/var/lib/docker'}) if 'info' in args else '29.0.0'
def mount_table(): return [{'path':'/','device':'1:1','type':'ext4'}]
class FakeVolume:
    f_frsize=4096; f_favail=10**9
    @property
    def f_bavail(self): return int(os.environ.get('FAKE_DISK_FREE',10**12))//4096
def path_info(path,mounts): return {'path':path,'observedAt':path,'mount':'/','device':'1:1','fsType':'ext4','block':4096,'stDev':1},FakeVolume()
def measure(path,expected_hash,image_id): return {'streamBytes':1,'allocationBytes':1,'entries':1}
`;
function embeddedExecutor(source: string): string {
  const match = source.match(/^const remoteExecutor = diskLibrary \+ (.*);$/m);
  if (!match) throw new Error('embedded executor missing');
  return embeddedDiskLibrary(source) + fakeDiskSystem + JSON.parse(match[1]!);
}

const harness = String.raw`import contextlib, datetime, fcntl, hashlib, http.server, io, json, os, pathlib, shutil, subprocess, sys, tarfile, tempfile, threading, unittest
E=os.environ['RELEASE_EXECUTOR']
def H(x): return hashlib.sha256(x).hexdigest()
def canon(x): return json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=True).encode()
S=['web','worker-stt','worker-llm','worker-video']
PROBE='''import json,os
s=json.load(open(os.environ["FAKE_FILE"]))
if s.get("probe_block"): raise SystemExit(1)
o=dict(s["observation"]);o["journal"]=s["journal"];print(json.dumps(o))
'''
FAKE='''#!/usr/bin/env python3
import json,os,sys,time
p=os.environ['FAKE_FILE']; s=json.load(open(p)); a=sys.argv[1:]
with open(p+'.log','a') as f:f.write(json.dumps(a)+'\\n')
def save():
 with open(p,'w') as f:json.dump(s,f)
if a[0]=='compose':
 i=a.index('-f'); j=i
 while j<len(a) and a[j]=='-f':j+=2
 cmd=a[j:]
 if cmd[:3]==['config','--format','json']: print(json.dumps(s['config']))
 elif cmd[:3]==['ps','--all','-q']: print(s['containers'][cmd[3]]['Id'])
 elif cmd[0]=='stop':
  for x in cmd[1:]:s['containers'][x]['State']['Running']=False
  if s.get('block_after_stop'):s['probe_block']=True
  save()
 elif cmd[0]=='run':
  if '-e' in cmd:
   payload=json.load(sys.stdin)
   if s.get('fail_copy') or (s.get('fail_copy_after_stop') and not s['containers']['web']['State']['Running']):sys.exit(1)
   print(json.dumps({'verified':len(payload['objects'])}));sys.exit(0)
  if s.get('fail_migration'):sys.exit(1)
  s['journal']=s['desired_journal'];save()
 elif cmd[0]=='up':
  for x in s['app']:
   s['containers'][x]['State']['Running']=True;s['containers'][x]['Image']=s['desired_images'][x]
   if s.get('partial') and x=='web':save();sys.exit(1)
  s['revision']=s['desired_revision'];save()
  if s.get('disconnect_after_up'):os.kill(os.getppid(),9)
 else: sys.exit(3)
elif a[0]=='exec':
 if '-e' in a: print(json.dumps({'status':'ok','revision':s['revision']}));sys.exit(0)
 query=sys.stdin.read()
 if 'storageReferences' in query:print(json.dumps({'storageReferences':s.get('refs',0),'activeMedia':0,'globalMinutes':s.get('minutes',0),'globalLlm':0}))
 elif 'to_jsonb(a)' in query:print(json.dumps([{'id':1}]))
 else:
  o=dict(s['observation']);o['journal']=s['journal'];print(json.dumps(o))
elif a[0]=='ps':
 if s.get('migration_inflight'):print('oneoff')
elif a[0]=='inspect':
 for obj in s['containers'].values():
  if obj['Id']==a[1]:print(json.dumps([obj]));break
 else:sys.exit(4)
elif a[0]=='load':pass
elif a[:2]==['image','inspect']:print(json.dumps([{'Id':a[2],'Config':{'Labels':{'org.opencontainers.image.revision':s['desired_revision']}}}]))
else:sys.exit(5)
'''
class Server(http.server.BaseHTTPRequestHandler):
 def do_GET(self):
  s=json.loads(pathlib.Path(self.server.statefile).read_text());data=json.dumps({'status':'ok','revision':s['revision']}).encode();self.send_response(200);self.end_headers();self.wfile.write(data)
 def log_message(self,*a):pass
class TestExecutor(unittest.TestCase):
 def setUp(self):
  self.t=tempfile.TemporaryDirectory(); self.root=pathlib.Path(self.t.name); os.chmod(self.root,0o700)
  for n in ('app','stage','state','bin'): (self.root/n).mkdir(mode=0o700)
  self.file=str(self.root/'fake.json'); f=self.root/'bin/docker';f.write_text(FAKE);f.chmod(0o755)
  files=[]
  for n in ('base','limits','override'):
   f=self.root/(n+'.yml');f.write_text(n);f.chmod(0o600);files.append(str(f))
  env=self.root/'env';env.write_text('secret');env.chmod(0o600)
  old=[];new=[]
  for i in range(28):
   content=('migration'+str(i)).encode();e={'name':f'{i:03}_migration.sql','sha256':H(content)};new.append(e)
   if i<26:old.append(e)
  self.op='9'*64; (self.root/'stage'/self.op).mkdir(mode=0o700)
  marker=self.root/'state/staging.json';marker.write_text(json.dumps({'operationId':self.op}));marker.chmod(0o600)
  src=self.root/'stage'/self.op/'source.tar'
  with tarfile.open(src,'w') as t:
   for i,e in enumerate(new):
    data=('migration'+str(i)).encode(); ti=tarfile.TarInfo('packages/db/migrations/'+e['name']);ti.size=len(data);t.addfile(ti,io.BytesIO(data))
  paths={'source':src}
  for k in ('web','worker'):
   paths[k]=self.root/'stage'/self.op/(k+'.tar');paths[k].write_bytes(k.encode())
  for v in paths.values(): v.chmod(0o600)
  oldids={'web':'sha256:'+'a'*64,'worker':'sha256:'+'b'*64};newids={'web':'sha256:'+'c'*64,'worker':'sha256:'+'d'*64}
  def images(ids):return {x:ids['web' if x=='web' else 'worker'] for x in S}
  containers={}
  for i,x in enumerate(S+['db','redis']):
   mounts=[]
   if x in ('db','redis'):mounts=[{'Type':'volume','Name':x+'vol','Destination':'/var/lib/postgresql/data' if x=='db' else '/data'}]
   containers[x]={'Id':str(i+1)*64,'Image':images(oldids).get(x,''),'State':{'Running':True,'StartedAt':'now'},'Config':{'Labels':{'com.docker.compose.project':'test','com.docker.compose.service':x}},'Mounts':mounts}
  obs={'composeProject':'test','databaseContainerId':containers['db']['Id'],'databaseVolume':'dbvol','postgresSystemIdentifier':'42','databaseName':'test','databaseOid':'5','timezone':'UTC','accountRowsSha256':'e'*64,'storageFingerprint':'f'*64,'storageEndpoint':'https://example.test','storageBucket':'private','storagePrefix':'tests/site/','redisContainerId':containers['redis']['Id'],'redisVolume':'redisvol','referenceCount':0,'referenceSha256':'0'*64,'ownershipSha256':'0'*64,'dataHashes':{},'dataCounts':{},'dataSchema':{},'journal':old}
  envs={x:{'test':'secret'} for x in S}; config={'services':{x:{'environment':envs[x],'image':images(newids)[x]} for x in S}}
  state={'app':S,'containers':containers,'config':config,'observation':obs,'journal':old,'desired_journal':new,'revision':'1'*40,'desired_revision':'2'*40,'desired_images':images(newids)};self.save(state)
  self.http=http.server.HTTPServer(('127.0.0.1',0),Server);self.http.statefile=self.file;threading.Thread(target=self.http.serve_forever,daemon=True).start()
  origin='http://127.0.0.1:'+str(self.http.server_port)
  profile={'kind':'existing-test-project','target':'site-test','project':'test','dockerPrefix':[],'root':str(self.root/'app'),'sourceDir':str(self.root/'source'),'envFile':str(env),'stateDir':str(self.root/'state'),'stageDir':str(self.root/'stage'),'composeFiles':files,'origin':origin,'healthUrl':origin+'/health','admissionProbeSha256':H(PROBE.encode())}
  profile.update({'databaseProject':'test','redisProject':'test','resources':{'database':containers['db']['Id'],'redis':containers['redis']['Id'],'databaseVolume':'dbvol','redisVolume':'redisvol'},'binding':{'databaseName':'test','databaseHost':'test-db','redisHost':'test-redis','network':'test-network'},'storagePrefix':'tests/site/'})
  pp=self.root/'profile.json';pp.write_text(json.dumps(profile));pp.chmod(0o600)
  identity={k:obs[k] for k in ('composeProject','databaseContainerId','databaseVolume','postgresSystemIdentifier','databaseName','databaseOid','timezone')}
  self.p={'action':'apply','operationId':self.op,'profilePath':str(pp),'admissionProbe':PROBE,'admission':{'identity':identity,'storageFingerprint':obs['storageFingerprint'],'environmentFingerprint':H(canon(envs)),'accountColumns':['id'],'tableColumns':{},'objectWhitelist':[],'accountRowsSha256':obs['accountRowsSha256'],'journal':old,'resourceIdentities':{'database':containers['db']['Id'],'redis':containers['redis']['Id'],'databaseVolume':'dbvol','redisVolume':'redisvol'},'composeFileSha256':[H(pathlib.Path(x).read_bytes()) for x in files],'envFileSha256':H(env.read_bytes()),'backupSha256':'a'*64,'scopeProofSha256':'b'*64,'inputBytes':1,'expectedObservation':obs},'previous':{'commit':'1'*40,'images':oldids,'journal':old},'desired':{'commit':'2'*40,'images':newids,'journal':new,'sourceSha256':H(src.read_bytes()),'archiveSha256':{x:H(paths[x].read_bytes()) for x in ('web','worker')}},'artifacts':{k:{'path':str(v),'sha256':H(v.read_bytes())} for k,v in paths.items()}}
  now=datetime.datetime.now(datetime.timezone.utc).isoformat()
  self.p['admission'].update({key:now for key in ('scopeObservedAt','multipartObservedAt','backupObservedAt','restoreObservedAt','dataObservedAt')})
  self.p['expectedProfile']={k:profile[k] for k in ('target','project','databaseProject','redisProject','root','sourceDir','envFile','composeFiles','dockerPrefix','origin','resources','binding','storagePrefix','stateDir','stageDir')}
  self.env=os.environ.copy();self.env['PATH']=str(self.root/'bin')+':'+self.env['PATH'];self.env['FAKE_FILE']=self.file
  self.attach_disk(self.p)
 def tearDown(self):self.http.shutdown();self.http.server_close();self.t.cleanup()
 def save(self,s):pathlib.Path(self.file).write_text(json.dumps(s))
 def load(self):return json.loads(pathlib.Path(self.file).read_text())
 def attach_disk(self,p):
  artifacts=p['artifacts']
  for item in artifacts.values(): item['size']=pathlib.Path(item['path']).stat().st_size
  allocation=0;entries=0
  try:
   with tarfile.open(artifacts['source']['path']) as archive:
    for item in archive:
     entries+=1;allocation+=16384+(4096*((item.size+4095)//4096) if item.isfile() else 0)
  except tarfile.TarError: allocation=1;entries=1
  profile=json.loads(pathlib.Path(self.p['profilePath']).read_text())
  p['disk']={'targetName':profile['target'],'appRoot':profile['root'],'stageDir':profile['stageDir'],'stateDir':profile['stateDir'],'sourceDir':str(self.root/'source'),'sourcePath':str(self.root/'source'/p['desired']['commit']/'source.tar'),'dockerPrefix':profile['dockerPrefix'],'inputBytes':p['admission']['inputBytes'],'commit':p['desired']['commit'],'operationId':p['operationId'],'artifacts':artifacts,'sourceMeasure':{'allocationBytes':allocation,'entries':entries},'measurements':{x:{'streamBytes':1,'allocationBytes':1,'entries':1} for x in ('web','worker')}}
  return p
 def call(self,p=None):
  request=self.attach_disk(p or self.p)
  r=subprocess.run([sys.executable,E],input=json.dumps(request),text=True,capture_output=True,env=self.env,timeout=20);self.assertEqual(r.stderr,'');return r.returncode,json.loads(r.stdout)
 def intent(self):return json.loads((self.root/'state/intent.json').read_text())
 def calls(self):
  f=pathlib.Path(self.file+'.log');return [json.loads(x) for x in f.read_text().splitlines()] if f.exists() else []
 def test_happy_migration(self):
  rc,out=self.call();self.assertEqual((rc,out['status']),(0,'success'));self.assertEqual(self.intent()['status'],'success');self.assertEqual(self.load()['journal'],self.p['desired']['journal'])
  calls=self.calls(); self.assertEqual(sum(a[0]=='load' for a in calls),2);self.assertTrue(any('run' in a for a in calls));self.assertTrue(any('up' in a for a in calls));self.assertTrue(all(not any(x in a for x in ('prune','down')) for a in calls))
 def test_disk_free_blocks_before_load(self):
  self.env['FAKE_DISK_FREE']='0'
  self.assertEqual(self.call()[0],1)
  self.assertFalse((self.root/'state/intent.json').exists())
  self.assertFalse(any(x[0]=='load' for x in self.calls()))
 def test_initial_kind_guard_before_load(self):
  state=self.load(); state['revision']=None; self.save(state)
  self.p['previous']={'legacy':True,'commit':None,'journal':self.p['previous']['journal'],'images':self.p['previous']['images'],'containers':{x:{'containerId':state['containers'][x]['Id'],'startedAt':'now'} for x in S}}
  obj={'kind':'prefixed','logicalKey':'videos/one','destinationKey':'tests/site/videos/one','sourceSize':3,'sourceSha256':'a'*64}
  self.p['admission']['objectWhitelist']=[obj]
  self.assertEqual(self.call()[0],1); self.assertFalse(any(x[0]=='load' for x in self.calls()))
  obj['kind']='legacy-preserved'; self.assertEqual(self.call()[1]['status'],'success'); self.assertEqual(sum(x[0]=='load' for x in self.calls()),2)
 def test_failed_migration_pending_no_retry(self):
  s=self.load();s['fail_migration']=True;self.save(s);self.assertEqual(self.call()[0],1);self.assertEqual(self.intent()['step'],'migration-started');before=self.calls();self.assertEqual(self.call()[0],1);self.assertEqual(self.calls(),before)
 def test_partial_start_mixed_reconcile(self):
  s=self.load();s['partial']=True;self.save(s);self.assertEqual(self.call()[0],1);p={**self.p,'action':'reconcile'};self.assertEqual(self.call(p)[1]['status'],'operator-blocked');self.assertEqual(self.intent()['status'],'operator-blocked')
 def test_reconcile_success_after_disconnect(self):
  s=self.load();s['disconnect_after_up']=True;self.save(s)
  result=subprocess.run([sys.executable,E],input=json.dumps(self.p),text=True,capture_output=True,env=self.env,timeout=20)
  self.assertNotEqual(result.returncode,0);self.assertEqual(self.intent()['status'],'pending')
  before=self.calls();self.assertEqual(self.call()[0],1);self.assertEqual(self.calls(),before)
  self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'success')
 def test_reconcile_terminal_success_is_idempotent(self):
  self.assertEqual(self.call()[1]['status'],'success')
  before=self.calls();self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'success')
  self.assertFalse(any('up' in a or 'run' in a or a[0]=='load' for a in self.calls()[len(before):]))
 def test_reconcile_before_remote_intent_is_aborted(self):
  self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'aborted')
  self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'aborted')
  self.assertFalse(any('up' in a or 'run' in a or a[0]=='load' for a in self.calls()))
 def test_reconcile_terminal_abort_is_idempotent(self):
  s=self.load();s['fail_migration']=True;self.save(s);self.assertEqual(self.call()[0],1);s=self.load()
  for x in S:s['containers'][x]['State']['Running']=True
  self.save(s);self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'aborted')
  self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'aborted')
 def test_reconcile_previous_aborted(self):
  s=self.load();s['fail_migration']=True;self.save(s);self.assertEqual(self.call()[0],1);s=self.load()
  for x in S:s['containers'][x]['State']['Running']=True
  self.save(s);self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'aborted')
 def test_reconcile_active_migration_is_blocked(self):
  s=self.load();s['fail_migration']=True;self.save(s);self.assertEqual(self.call()[0],1);s=self.load()
  for x in S:s['containers'][x]['State']['Running']=True
  s['migration_inflight']=True;self.save(s)
  self.assertEqual(self.call({**self.p,'action':'reconcile'})[1]['status'],'operator-blocked')
 def test_reconcile_requires_original_admission_binding(self):
  s=self.load();s['fail_migration']=True;self.save(s);self.assertEqual(self.call()[0],1)
  p=json.loads(json.dumps(self.p));p['action']='reconcile';p['admission']['scopeProofSha256']='c'*64
  self.assertEqual(self.call(p)[0],1);self.assertEqual(self.intent()['status'],'pending')
 def test_lock_blocks_other_writer(self):
  with open(self.root/'state/release.lock','w') as f:
   os.chmod(f.name,0o600);fcntl.flock(f,fcntl.LOCK_EX);self.assertEqual(self.call()[0],1);self.assertEqual(self.calls(),[])
 def test_rollback_schema_change_rejected_before_write(self):
  self.assertEqual(self.call({**self.p,'action':'rollback'})[0],1);self.assertFalse((self.root/'state/intent.json').exists());self.assertFalse(any(a[0]=='load' for a in self.calls()))
 def test_admission_drift_after_stop_prevents_writers(self):
  s=self.load();s['block_after_stop']=True;self.save(s)
  self.assertEqual(self.call()[0],1);self.assertEqual(self.intent()['status'],'pending')
  self.assertFalse(any('up' in a for a in self.calls()))
 def test_expired_evidence_blocks_before_write(self):
  self.p['admission']['scopeObservedAt']='2000-01-01T00:00:00Z'
  self.assertEqual(self.call()[0],1);self.assertFalse((self.root/'state/intent.json').exists())
  self.assertFalse(any(x[0]=='load' for x in self.calls()))
 def test_copy_is_between_stop_and_start(self):
  self.p['admission']['objectWhitelist']=[{'kind':'prefixed','logicalKey':'videos/one','destinationKey':'tests/site/videos/one','sourceSize':3,'sourceSha256':'a'*64}]
  self.assertEqual(self.call()[1]['status'],'success')
  calls=self.calls(); stop=next(i for i,x in enumerate(calls) if 'stop' in x)
  copy=next(i for i,x in enumerate(calls) if 'run' in x and '-e' in x)
  up=next(i for i,x in enumerate(calls) if 'up' in x)
  self.assertLess(copy,stop); self.assertLess(stop,up)
 def test_failed_copy_does_not_restart_apps(self):
  self.p['admission']['objectWhitelist']=[{'kind':'prefixed','logicalKey':'videos/one','destinationKey':'tests/site/videos/one','sourceSize':3,'sourceSha256':'a'*64}]
  s=self.load();s['fail_copy']=True;self.save(s)
  self.assertEqual(self.call()[0],1);self.assertEqual(self.intent()['status'],'pending')
  self.assertFalse(any('up' in x or 'stop' in x for x in self.calls()))
 def test_media_drift_after_stop_blocks_restart(self):
  self.p['admission']['objectWhitelist']=[{'kind':'prefixed','logicalKey':'videos/one','destinationKey':'tests/site/videos/one','sourceSize':3,'sourceSha256':'a'*64}]
  s=self.load();s['fail_copy_after_stop']=True;self.save(s)
  self.assertEqual(self.call()[0],1);self.assertEqual(self.intent()['status'],'pending')
  self.assertTrue(any('stop' in x for x in self.calls()));self.assertFalse(any('up' in x for x in self.calls()))
 def test_source_tamper_and_migration_inventory_fail_before_load(self):
  src=pathlib.Path(self.p['artifacts']['source']['path']);src.write_bytes(b'corrupt')
  self.assertEqual(self.call()[0],1);self.assertFalse(any(a[0]=='load' for a in self.calls()))
  self.p['artifacts']['source']['sha256']=H(src.read_bytes());self.p['desired']['sourceSha256']=H(src.read_bytes())
  self.assertEqual(self.call()[0],1);self.assertFalse(any(a[0]=='load' for a in self.calls()))
 def test_rollback_same_schema_runs_without_migration(self):
  old=self.p['previous']['journal'];self.p['action']='rollback';self.p['desired']['journal']=old
  src=pathlib.Path(self.p['artifacts']['source']['path'])
  with tarfile.open(src,'w') as t:
   for i,e in enumerate(old):
    data=('migration'+str(i)).encode();ti=tarfile.TarInfo('packages/db/migrations/'+e['name']);ti.size=len(data);t.addfile(ti,io.BytesIO(data))
  self.p['desired']['sourceSha256']=H(src.read_bytes());self.p['artifacts']['source']['sha256']=H(src.read_bytes())
  self.assertEqual(self.call()[1]['status'],'success');self.assertFalse(any('packages/db/dist/migrate.js' in a for a in self.calls()))
 def test_override_and_admission_fail_closed(self):
  s=self.load();s['config']['services']['web']['image']='sha256:'+'0'*64;self.save(s);self.assertEqual(self.call()[0],1);self.assertFalse(any(a[0]=='load' for a in self.calls()))
  s=self.load();s['probe_block']=True;self.save(s);self.assertEqual(self.call()[0],1);self.assertFalse((self.root/'state/intent.json').exists())
 def test_stale_runtime_fails_before_load(self):
  state=self.load();state['containers']['web']['Image']='sha256:'+'f'*64;self.save(state)
  self.assertNotEqual(self.call()[0],0);self.assertFalse(any(row[0]=='load' for row in self.calls()))
 def test_runtime_abab(self):
  p=self.p; st=self.load(); journal=p['desired']['journal']; st['journal']=journal
  p['previous']['journal']=journal; p['admission']['journal']=journal; st['observation']['journal']=journal
  old=p['previous']; new=p['desired']; self.save(st)
  initial={k:{'containerId':st['containers'][k]['Id'],'image':st['containers'][k]['Image'],'startedAt':st['containers'][k]['State']['StartedAt']} for k in S}
  self.assertEqual(len(initial),4)
  phases=[('apply',old,new),('rollback',new,old),('apply',old,new)]
  for index,(action,previous,desired) in enumerate(phases):
   current=self.load();current['desired_revision']=desired['commit']; current['desired_images']={k:desired['images']['web' if k=='web' else 'worker'] for k in S}
   if index:
    p['admission']['objectWhitelist']=[{'kind':'prefixed','logicalKey':'videos/new','destinationKey':'tests/site/videos/new','sourceSize':3,'sourceSha256':'a'*64}]
    current['observation']['referenceCount']=1;current['observation']['referenceSha256']='1'*64;current['observation']['ownershipSha256']='2'*64
    p['admission']['expectedObservation']=current['observation']
   for k in S: current['config']['services'][k]['image']=current['desired_images'][k]
   self.save(current)
   op=str(index+1)*64;folder=self.root/'stage'/op;folder.mkdir(mode=0o700)
   artifacts={}
   for name,entry in p['artifacts'].items():
    dest=folder/(name+'.tar');shutil.copyfile(entry['path'],dest);dest.chmod(0o600);artifacts[name]={**entry,'path':str(dest)}
   marker=self.root/'state/staging.json';marker.write_text(json.dumps({'operationId':op}));marker.chmod(0o600)
   target=dict(desired); target.setdefault('sourceSha256',new['sourceSha256']);target.setdefault('archiveSha256',new['archiveSha256'])
   request={**p,'action':action,'previous':previous,'desired':target,'operationId':op,'artifacts':artifacts}
   rc,out=self.call(request);self.assertEqual(rc,0,out);self.assertEqual(set(out['services']),set(S))
   for service,item in out['services'].items():
    self.assertEqual(item['image'],current['desired_images'][service]);self.assertTrue(item['containerId']);self.assertTrue(item['startedAt'])
if __name__=='__main__':unittest.main()
`;
async function exercise(cases: string[], removeDiskGate = false) {
  const directory = mkdtempSync(join(tmpdir(), 'release-executor-acid-'));
  try {
    const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
    const python = embeddedExecutor(source);
    const executor = join(directory, 'executor.py'), runner = join(directory, 'test.py');
    const mutated = python.replace('        admit_disk(disk)\n', '        # disk admission removed by test mutant\n');
    if (removeDiskGate) expect(mutated).not.toBe(python);
    writeFileSync(executor, removeDiskGate ? mutated : python, { mode: 0o600 });
    writeFileSync(runner, harness, { mode: 0o600 });
    const result = await new Promise<{ status: number | null; output: string }>((done, reject) => {
      const child = spawn('python3', [runner, ...cases.map(name => `TestExecutor.${name}`)],
        { env: { ...process.env, RELEASE_EXECUTOR: executor } });
      let output = ''; child.stdout.on('data', x => { output += x; }); child.stderr.on('data', x => { output += x; });
      child.on('error', reject); child.on('close', status => done({ status, output }));
    });
    if (removeDiskGate) expect(result.status, result.output).not.toBe(0);
    else expect(result.status, result.output).toBe(0);
  } finally { rmSync(directory, { recursive: true, force: true }); }
}

describe('remote executor injected faults', () => {
  it('measures gzip layer content and rejects image identity and diff-id substitutions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'release-image-measure-'));
    try {
      const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
      const match = source.match(/const imageMeasurement = String\.raw`([\s\S]*?)`;/);
      if (!match) throw new Error('image measurement missing');
      const fixture = String.raw`
import gzip, hashlib, io, json, os, sys, tarfile
H=lambda x:hashlib.sha256(x).hexdigest()
def add(t,name,data):
    i=tarfile.TarInfo(name); i.size=len(data); t.addfile(i,io.BytesIO(data))
buf=io.BytesIO()
with tarfile.open(fileobj=buf,mode='w') as t:
    for name,data in [('small-a',b'a'),('small-b',b'b')]: add(t,name,data)
layer=buf.getvalue(); packed=gzip.compress(layer,mtime=0)
diff='sha256:'+H(layer)
if sys.argv[2]=='bad-diff': diff='sha256:'+'f'*64
config=json.dumps({'rootfs':{'type':'layers','diff_ids':[diff]}}).encode()
config_name='blobs/sha256/'+H(config); layer_name='blobs/sha256/'+H(packed)
manifest=json.dumps([{'Config':config_name,'Layers':[layer_name]}]).encode()
path=os.path.join(sys.argv[1],sys.argv[2]+'.tar')
with tarfile.open(path,'w') as t:
    for name,data in [('manifest.json',manifest),(config_name,config),(layer_name,packed)]: add(t,name,data)
print(json.dumps({'path':path,'sha256':H(open(path,'rb').read()),'id':'sha256:'+H(config),'streamBytes':len(layer)}))
`;
      const make = (mode: string) => {
        const result = spawnSync('python3', ['-c', fixture, dir, mode], { encoding: 'utf8' });
        expect(result.status, result.stderr).toBe(0); return JSON.parse(result.stdout);
      };
      const run = (data: object) => spawnSync('python3', ['-c', match[1]!], { input: JSON.stringify(data), encoding: 'utf8' });
      const valid = make('valid'); const measured = run(valid);
      expect(measured.status, measured.stderr).toBe(0);
      expect(JSON.parse(measured.stdout)).toEqual({ streamBytes: valid.streamBytes, allocationBytes: 2 * (4096 + 16384), entries: 2 });
      expect(run({ ...valid, id: `sha256:${'f'.repeat(64)}` }).status).not.toBe(0);
      expect(run({ ...valid, sha256: 'f'.repeat(64) }).status).not.toBe(0);
      expect(run(make('bad-diff')).status).not.toBe(0);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('guards initial kinds under lock before loading images', async () => { await exercise(['test_initial_kind_guard_before_load']); });
  it('rechecks disk free before docker load and detects removal of the gate', async () => {
    await exercise(['test_disk_free_blocks_before_load']);
    await exercise(['test_disk_free_blocks_before_load'], true);
  }, 60000);
  it('verifies legacy and newly prefixed media without another legacy copy', async () => {
    const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
    const python = embeddedExecutor(source);
    const code = python.match(/^\s*verify_code=(".*")$/m);
    if (!code) throw new Error('media verifier missing');
    const verifier = JSON.parse(code[1]!) as string;
    const bytes = Buffer.from('fixture media');
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const verify = async (prefix: string, kind: string, available: string[], pending = false) => {
      const events: Record<string, (data?: string) => Promise<void> | void> = {};
      const requests: string[] = []; let output = ''; let exitCode = 0;
      class GetObjectCommand { constructor(public input: { Key: string }) {} }
      class ListMultipartUploadsCommand { constructor(public input: { Prefix: string }) {} }
      class S3Client {
        async send(command: GetObjectCommand | ListMultipartUploadsCommand) {
          if (command instanceof ListMultipartUploadsCommand) return { Uploads: pending ? [{}] : [], IsTruncated: false };
          requests.push(command.input.Key);
          if (!available.includes(command.input.Key)) throw new Error('missing');
          return { Body: (async function* () { yield bytes; })() };
        }
      }
      const fakeProcess = { env: { S3_BUCKET: 'test', S3_KEY_PREFIX: prefix, S3_ENDPOINT: 'https://example.test', S3_REGION: 'test', S3_ACCESS_KEY: 'fake', S3_SECRET_KEY: 'fake' },
        stdin: { setEncoding() {}, on(name: string, cb: (data?: string) => Promise<void> | void) { events[name] = cb; } },
        stdout: { write(value: string) { output += value; } }, set exitCode(value: number) { exitCode = value; } };
      runInNewContext(verifier, { require: (name: string) => name === '@aws-sdk/client-s3' ? { S3Client, GetObjectCommand, ListMultipartUploadsCommand } : { createHash }, process: fakeProcess, AbortSignal });
      events.data!(JSON.stringify({ prefix, objects: [{ kind, logicalKey: 'video/source', destinationKey: prefix + 'video/source', sourceSize: bytes.length, sourceSha256: checksum }] }));
      await events.end!();
      return { requests, output, exitCode };
    };
    const legacy = await verify('tests/site/', 'legacy-preserved', ['video/source', 'tests/site/video/source']);
    expect(legacy.exitCode).toBe(0); expect(legacy.requests).toEqual(['video/source', 'tests/site/video/source', 'video/source']);
    for (const prefix of ['tests/site/', 'tests/cloud/']) {
      const nextRelease = await verify(prefix, 'prefixed', [prefix + 'video/source']);
      expect(nextRelease.exitCode).toBe(0); expect(nextRelease.requests).toEqual([prefix + 'video/source']);
      expect(JSON.parse(nextRelease.output).verified).toBe(1);
    }
    expect((await verify('tests/site/', 'prefixed', [])).exitCode).toBe(1);
    const pending = await verify('tests/site/', 'prefixed', ['tests/site/video/source'], true);
    expect(pending.exitCode).toBe(1); expect(pending.requests).toEqual([]);
  });
  it('recovers interrupted artifact transfers and isolates releases', () => {
    const dir = mkdtempSync(join(tmpdir(), 'release-stage-'));
    try {
      const stageDir = join(dir, 'stage'), stateDir = join(dir, 'state'), root = join(dir, 'app');
      for (const path of [stageDir, stateDir, root]) mkdirSync(path, { mode: 0o700 });
      const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
      const match = source.match(/const artifactReceiver = diskLibrary \+ (`[\s\S]*?`);/);
      if (!match) throw new Error('artifact receiver missing');
      const receiver = embeddedDiskLibrary(source) + fakeDiskSystem + (runInNewContext(match[1]!) as string);
      const bytes = Buffer.from('verified release archive');
      const digest = createHash('sha256').update(bytes).digest('hex');
      const operationId = 'a'.repeat(64);
      const disk = { targetName: 'site-test', appRoot: root, sourceDir: join(dir, 'source'), sourcePath: join(dir, 'source', '2'.repeat(40), 'source.tar'),
        stageDir, stateDir, dockerPrefix: [], inputBytes: 1, commit: '2'.repeat(40), operationId,
        artifacts: Object.fromEntries(['source','web','worker'].map(name => [name, { path: join(stageDir, operationId, `${name}.tar`), sha256: digest, size: bytes.length }])),
        sourceMeasure: { allocationBytes: 1, entries: 1 }, measurements: { web: { streamBytes: 1, allocationBytes: 1, entries: 1 }, worker: { streamBytes: 1, allocationBytes: 1, entries: 1 } } };
      const data = { targetName: 'site-test', stageDir, stateDir, root, operationId, name: 'source', size: bytes.length, sha256: digest, requiredFree: 1, disk };
      const call = (value: object, input: Buffer | string = '', env = process.env) => spawnSync('python3', ['-c', receiver, Buffer.from(JSON.stringify(value)).toString('base64')], { input, encoding: 'utf8', env });
      expect(call({ ...data, mode: 'write' }, bytes, { ...process.env, FAKE_DISK_FREE: '0' }).status).not.toBe(0);
      expect(() => readFileSync(join(stateDir, 'staging.json'))).toThrow();
      expect(JSON.parse(call({ ...data, mode: 'check' }).stdout).status).toBe('missing');
      expect(call({ ...data, mode: 'write' }, bytes.subarray(0, 3)).status).not.toBe(0);
      expect(JSON.parse(call({ ...data, mode: 'check' }).stdout).status).toBe('missing');
      expect(JSON.parse(call({ ...data, mode: 'write' }, bytes).stdout).status).toBe('staged');
      expect(JSON.parse(call({ ...data, mode: 'check' }).stdout).reused).toBe(true);
      const second = { ...data, name: 'web' };
      expect(JSON.parse(call({ ...second, mode: 'check' }).stdout).status).toBe('missing');
      expect(call({ ...second, mode: 'write' }, bytes.subarray(0, 3)).status).not.toBe(0);
      expect(JSON.parse(call({ ...second, mode: 'write' }, bytes).stdout).status).toBe('staged');
      expect(JSON.parse(call({ ...second, mode: 'check' }).stdout).reused).toBe(true);
      expect(call({ ...data, mode: 'check', sha256: 'f'.repeat(64) }).status).not.toBe(0);
      const next = { ...data, operationId: 'b'.repeat(64), mode: 'check' };
      expect(call(next).status).not.toBe(0);
      writeFileSync(join(stateDir, 'intent.json'), JSON.stringify({ operationId, status: 'success' }), { mode: 0o600 });
      expect(JSON.parse(call(next).stdout).status).toBe('missing');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('detects omitted target and substituted runtime image', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'release-missing-target-'));
    try {
      const profile = join(dir, 'profile.json');
      const common = { transport: 'ssh', project: 'candidate-app', databaseProject: 'candidate-db', redisProject: 'candidate-redis',
        root: '/srv/app', envFile: '/srv/private/env', composeFiles: ['/srv/app/compose.yml'], dockerPrefix: [],
        binding: { databaseName: 'candidate', databaseHost: 'candidate-db', redisHost: 'candidate-redis', network: 'test-network' },
        resources: { database: 'a'.repeat(64), redis: 'b'.repeat(64), databaseVolume: 'db-volume', redisVolume: 'redis-volume' },
        storageBucket: 'bucket', ssh: { alias: 'candidate', config: '/srv/private/ssh', knownHosts: '/srv/private/known', expiresAt: '2999-01-01T00:00:00Z' } };
      writeFileSync(profile, JSON.stringify({ targets: [{ ...common, name: 'site-test', storagePrefix: 'tests/site/', allowedOrigins: ['https://test.invalid'] },
        { ...common, name: 'cloud-c', storagePrefix: 'tests/cloud/', allowedOrigins: ['https://c.clipmkr.ru'] }] }), { mode: 0o600 });
      expect(loadCandidateProfile(profile).targets).toHaveLength(2);
      const incomplete = JSON.parse(readFileSync(profile, 'utf8')); incomplete.targets.pop(); writeFileSync(profile, JSON.stringify(incomplete)); chmodSync(profile, 0o600);
      expect(() => loadCandidateProfile(profile)).toThrow();
      await exercise(['test_stale_runtime_fails_before_load']);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 60000);
  it('detects skipped isolation backup and schema checks', async () => {
    await exercise(['test_admission_drift_after_stop_prevents_writers', 'test_expired_evidence_blocks_before_write', 'test_source_tamper_and_migration_inventory_fail_before_load', 'test_rollback_schema_change_rejected_before_write']);
  }, 60000);
  it('reconciles unknown remote outcomes before retry', async () => {
    await exercise(['test_failed_migration_pending_no_retry', 'test_partial_start_mixed_reconcile', 'test_reconcile_success_after_disconnect', 'test_reconcile_previous_aborted', 'test_reconcile_active_migration_is_blocked', 'test_reconcile_requires_original_admission_binding', 'test_reconcile_terminal_success_is_idempotent', 'test_reconcile_terminal_abort_is_idempotent', 'test_reconcile_before_remote_intent_is_aborted']);
  }, 60000);
  it('serializes concurrent target writers', async () => { await exercise(['test_lock_blocks_other_writer']); }, 60000);
  it('verifies whitelisted media under the lock before restarting applications', async () => {
    await exercise(['test_copy_is_between_stop_and_start', 'test_failed_copy_does_not_restart_apps', 'test_media_drift_after_stop_blocks_restart']);
  }, 60000);
  it('rejects rollback with different full schema journal', async () => { await exercise(['test_rollback_schema_change_rejected_before_write','test_rollback_same_schema_runs_without_migration']); }, 60000);
  it('records every runtime identity through A B A B', async () => { await exercise(['test_runtime_abab']); }, 60000);
  it.skipIf(!process.env.CLIPMKR_REAL_RESOURCE_PROOF)('confines real OOM and ENOSPC to disposable test workers', () => {
    const file = process.env.CLIPMKR_REAL_RESOURCE_PROOF!;
    const st = lstatSync(file);
    expect(st.isFile() && !st.isSymbolicLink() && (st.mode & 0o777) === 0o600 && st.uid === process.getuid?.()).toBe(true);
    const proof = JSON.parse(readFileSync(file, 'utf8'));
    expect(Array.isArray(proof.before) && proof.before.length > 0 && proof.before).toEqual(proof.after);
    expect(proof.faults).toEqual(expect.arrayContaining([
      expect.objectContaining({ case: 'oom', exit_code: 137, oom_killed: true, docker_wait_exit: 0, network: 'none', user_mounts: false }),
      expect.objectContaining({ case: 'enospc', enospc_observed: true, docker_wait_exit: 0, network: 'none', user_mounts: false }),
    ]));
    // This is isolated cgroup evidence, not evidence that the release runner caused the faults.
  });
});
