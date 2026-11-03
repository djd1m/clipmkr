import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

describe('release candidate read-only admission', () => {
  it('confirms effective containerd root with the running binary config dump', () => {
    const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
    const match = source.match(/const diskAdmission = (String\.raw`[\s\S]*?`);/);
    if (!match) throw new Error('disk admission program missing');
    const program = runInNewContext(match[1]!) as string;
    const check = String.raw`
import contextlib,glob,io,json,os,pathlib,stat,subprocess,sys,tempfile,types
from unittest.mock import patch
native_open=open; native_stat=os.stat; native_readlink=os.readlink; native_os_open=os.open;native_fstat=os.fstat
effective='root = "/var/lib/containerd"\nstate = "/run/containerd"\nimports = ["/etc/containerd/conf.d/*.toml"]\ntemp = ""\n'
dump=effective; failed=False; exe='/usr/bin/containerd'; actual=['/usr/bin/containerd']; invoked=[];same_inode=True;globbed=False
def fake_open(path,*args,**kwargs):
 if str(path)=='/proc/4242/cmdline':return io.BytesIO(('\0'.join(actual)+'\0').encode())
 return native_open(path,*args,**kwargs)
def fake_stat(path,*args,**kwargs):
 if str(path) in ('/usr/bin/containerd','/proc/4242/exe'):return types.SimpleNamespace(st_mode=stat.S_IFREG|0o755,st_uid=0,st_dev=11,st_ino=22 if same_inode or str(path)=='/usr/bin/containerd' else 23)
 return native_stat(path,*args,**kwargs)
def fake_readlink(path,*args,**kwargs):
 if str(path)=='/proc/4242/exe':return exe
 return native_readlink(path,*args,**kwargs)
def fake_os_open(path,*args,**kwargs):
 if str(path)=='/proc/4242/exe':return native_os_open('/dev/null',os.O_RDONLY)
 return native_os_open(path,*args,**kwargs)
def fake_fstat(fd,*args,**kwargs):
 return types.SimpleNamespace(st_dev=11,st_ino=22 if same_inode else 23)
def fake_run(args,**kwargs):
 invoked.append(args)
 if failed:raise subprocess.CalledProcessError(1,args)
 return types.SimpleNamespace(stdout=dump)
def read_command(args):
 assert args[:2]==['python3','-c']
 output=io.StringIO(); old=sys.argv;sys.argv=['-c',*args[3:]]
 try:
  with patch('builtins.open',fake_open),patch('os.stat',fake_stat),patch('os.readlink',fake_readlink),patch('os.open',fake_os_open),patch('os.fstat',fake_fstat),patch('subprocess.run',fake_run),patch('glob.glob',side_effect=lambda pattern:['/etc/containerd/conf.d/custom.toml'] if globbed else []),contextlib.redirect_stdout(output):
   exec(compile(args[2],'<daemon-configs>','exec'),{'__name__':'__main__'})
 finally:sys.argv=old
 return output.getvalue().strip()
case=0
def check(config_text, expected=True, flags=None):
 global dump,failed,exe,actual,case
 case+=1
 with tempfile.TemporaryDirectory() as tempdir:
  docker=str(pathlib.Path(tempdir)/'daemon.json');config=str(pathlib.Path(tempdir)/'config.toml')
  if config_text is not None:pathlib.Path(config).write_text(config_text)
  flags=[x.replace('{config}',config) for x in (flags or [])];actual=['/usr/bin/containerd',*flags]
  try:
   d,c=daemon_configs([],docker,config,{'pid':4242,'exe':'/usr/bin/containerd','argv':flags,'unsupported':False})
  except (AssertionError,ValueError,KeyError,subprocess.CalledProcessError,TypeError):
   if expected:raise
   return
  if not expected:raise AssertionError('unsafe config accepted case '+str(case))
  assert d=={} and c['root']=='/var/lib/containerd' and c['state']=='/run/containerd'
  assert invoked[-1][0].startswith('/proc/self/fd/') and invoked[-1][1:]==[*flags,'config','dump']
check(None)
check('version = 2\n')
check('version = 2\n',flags=['--config','{config}'])
dump='state = "/run/containerd"\n';check(None,False)
dump='root = "/var/lib/containerd"\n';check(None,False)
dump='broken = [\n';check(None,False)
dump=effective.replace('/var/lib/containerd','/foreign');check(None,False)
dump=effective.replace('temp = ""','temp = "/foreign"');check(None,False)
dump=effective.replace('/etc/containerd/conf.d/*.toml','/foreign/*.toml');check(None,False)
dump=effective+'[plugins."io.containerd.snapshotter.v1.overlayfs"]\nroot_path = "/foreign"\n';check(None,False)
dump=effective;globbed=True;check(None,False);globbed=False
dump=effective;failed=True;check(None,False);failed=False
exe='/tmp/containerd';check(None,False);exe='/usr/bin/containerd'
same_inode=False;check(None,False);same_inode=True
check(None,False,flags=['--config=/foreign'])
check(None,False,flags=['--root=/foreign'])
actual=['/usr/bin/containerd','--root=/foreign']
with tempfile.TemporaryDirectory() as t:
 try:daemon_configs([],str(pathlib.Path(t)/'d'),str(pathlib.Path(t)/'c'),{'pid':4242,'exe':'/usr/bin/containerd','argv':[],'unsupported':True})
 except ValueError:pass
 else:raise AssertionError('unsupported flags accepted')
print('effective dump scenarios passed')
`;
    const run = (library: string) => spawnSync('python3', ['-c', library + check], { encoding: 'utf8', timeout: 30000 });
    const result = run(program);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('effective dump scenarios passed');
    const mutant = program.replace('effective=tomllib.loads(dump)', "effective=tomllib.loads(dump); effective.setdefault('root','/var/lib/containerd')");
    expect(mutant).not.toBe(program);
    expect(run(mutant).status).not.toBe(0); // A fabricated root must break the missing-root negative.
  }, 30000);
  it('rejects site identity drift and insufficient incremental image archive space', () => {
    const text = readFileSync('scripts/release-candidate.mjs', 'utf8');
    const extract = (name: string) => {
      const match = text.match(new RegExp('const ' + name + ' = (String\\.raw`[\\s\\S]*?`);'));
      if (!match) throw new Error(name);
      return runInNewContext(match[1]!) as string;
    };
    const parser = extract('imageMeasurement');
    const library = parser.slice(0, parser.indexOf("if __name__=='__main__':")) + extract('diskAdmission');
    const receiver = text.match(/const sourceReceiver = diskLibrary \+ (`[\s\S]*?`);/);
    if (!receiver) throw new Error('source receiver missing');
    const fake = String.raw`
def proc_info(prefix): return {'dockerd':[{'argv':['--data-root=/unknown'] if os.environ.get('FAULT')=='root' else [],'tmp':['/unknown'] if os.environ.get('FAULT')=='temp' else []}],'containerd':[] if os.environ.get('FAULT')=='daemon' else [{'argv':['--root=/unknown'] if os.environ.get('FAULT')=='store' else [],'tmp':[]}]}
def daemon_configs(prefix,d,c,cont): return ({'data-root':'/unknown'} if os.environ.get('FAULT')=='config' else {}),({'root':'/unknown' if os.environ.get('FAULT')=='store-config' else '/var/lib/containerd','state':'/run/containerd'} if os.environ.get('FAULT')!='missing-dump-root' else {'state':'/run/containerd'})
def read_command(args):
 return json.dumps({'Driver':'vfs' if os.environ.get('FAULT')=='driver' else 'overlayfs','DriverStatus':[] if os.environ.get('FAULT')=='snapshotter' else [['driver-type','io.containerd.snapshotter.v1']],'DockerRootDir':'/unknown' if os.environ.get('FAULT')=='docker-info-root' else '/var/lib/docker'}) if 'info' in args else '29.0.0'
def mount_table():
 fault=os.environ.get('FAULT')
 nested=os.environ['NESTED'] if fault=='nested' else ('/var/lib/containerd/io.containerd.content.v1.content/foreign' if fault=='content-mount' else ('/var/lib/containerd/io.containerd.snapshotter.v1.overlayfs/snapshots/unknown/fs' if fault=='snapshot-mount' else None))
 return [{'path':'/','device':'1:1','type':'ext4'}]+([{'path':nested,'device':'1:2','type':'overlay' if fault=='snapshot-mount' else 'ext4'}] if nested else [])
class Volume:
 f_frsize=4096
 @property
 def f_bavail(self): return int(os.environ.get('FAKE_FREE',10**12))//4096
 @property
 def f_favail(self): return int(os.environ.get('FAKE_INODES',10**9))
def path_info(path,mounts):
 fault=os.environ.get('FAULT'); bad=fault=='different-fs' and path.endswith('/stage')
 return {'path':path,'observedAt':path,'mount':'/','device':'1:2' if bad else '1:1','fsType':'xfs' if fault=='fs-type' and path.endswith('/stage') else 'ext4','block':8192 if fault=='block' and path.endswith('/stage') else 4096,'stDev':2 if bad else 1},Volume()
`;
    const exercise = String.raw`
import base64,gzip,io,hashlib,os,pathlib,shutil,subprocess,sys,tarfile,tempfile
H=lambda b:hashlib.sha256(b).hexdigest()
def add(t,name,data):
 x=tarfile.TarInfo(name);x.size=len(data);t.addfile(x,io.BytesIO(data))
def fails(p):
 try: admit_disk(p);return False
 except (ValueError,OSError,KeyError):return True
with tempfile.TemporaryDirectory() as d:
 r=pathlib.Path(d);stage=r/'stage';stage.mkdir();state=r/'state';state.mkdir();app=r/'app';app.mkdir();op='a'*64;folder=stage/op;folder.mkdir()
 local=r/'local';local.mkdir();src=local/'source.tar'
 with tarfile.open(src,'w') as t:add(t,'file.txt',b'source')
 stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as t:
  for i in range(300):add(t,f'files/{i:04}.txt',b'x')
 layer=stream.getvalue();packed=gzip.compress(layer,mtime=0)
 config=json.dumps({'rootfs':{'type':'layers','diff_ids':['sha256:'+H(layer)]}}).encode();imageid='sha256:'+H(config)
 manifest=json.dumps([{'Config':'blobs/sha256/'+H(config),'Layers':['blobs/sha256/'+H(packed)]}]).encode();image=local/'image.tar'
 with tarfile.open(image,'w') as t:
  for n,b in [('manifest.json',manifest),('blobs/sha256/'+H(config),config),('blobs/sha256/'+H(packed),packed)]:add(t,n,b)
 files={'source':src,'web':image,'worker':image}
 artifacts={k:{'path':str(folder/(k+'.tar')),'sha256':H(f.read_bytes()),'size':f.stat().st_size} for k,f in files.items()}
 measured={k:measure(str(image),artifacts[k]['sha256'],imageid) for k in ('web','worker')}
 assert measured['web']['entries']==300 and measured['web']['allocationBytes']>20*image.stat().st_size
 p={'targetName':'site-test','appRoot':str(app),'sourceDir':str(r/'releases'),'sourcePath':str(r/'releases'/('2'*40)/'source.tar'),'stageDir':str(stage),'stateDir':str(state),'dockerPrefix':[],'inputBytes':1000,'commit':'2'*40,'operationId':op,'artifacts':artifacts,'measurements':measured,'sourceMeasure':source_measure(str(src),artifacts['source']['sha256'])}
 os.environ['NESTED']=str(stage/'nested')
 first=admit_disk(p);p['inputBytes']+=(-first['requiredBytes']*2731)%4096
 first=admit_disk(p);required=first['requiredBytes'];assert required%4096==0 and required>sum(a['size'] for a in artifacts.values())+measured['web']['allocationBytes']
 os.environ['FAKE_FREE']=str(required);assert admit_disk(p)
 os.environ['FAKE_FREE']=str(required-1);assert fails(p)
 os.environ['FAKE_FREE']=str(10**12)
 p['expectedBinding']={**first['binding'],'dockerRoot':'/foreign'};assert fails(p);p['expectedBinding']=first['binding']
 for fault in ('different-fs','fs-type','block','root','store','missing-dump-root','store-config','docker-info-root','driver','snapshotter','daemon','temp','config','nested','content-mount','snapshot-mount'):
  os.environ['FAULT']=fault;assert fails(p),fault
 os.environ.pop('FAULT',None)
 os.environ['FAKE_INODES']=str(first['requiredInodes']-1);assert fails(p)
 os.environ['FAKE_INODES']=str(first['requiredInodes']);assert admit_disk(p)
 p['retainedRollbackBytes']=10**12;assert admit_disk(p)['requiredBytes']==required
 shutil.copy2(image,artifacts['web']['path']);partial=admit_disk(p);assert partial['requiredBytes']==required-image.stat().st_size
 os.environ['FAKE_FREE']=str(((partial['requiredBytes']+4095)//4096)*4096);assert admit_disk(p)
 pathlib.Path(artifacts['web']['path']).write_bytes(b'X'+image.read_bytes()[1:]);assert fails(p)
 pathlib.Path(artifacts['web']['path']).unlink();os.environ['FAKE_FREE']=str(required-1)
 args={'targetName':'site-test','sourceDir':p['sourceDir'],'root':str(app),'commit':p['commit'],'sourceSha256':artifacts['source']['sha256'],'disk':p}
 call=subprocess.run([sys.executable,'-c',SOURCE_PROGRAM,base64.b64encode(json.dumps(args).encode()).decode()],input=src.read_bytes(),capture_output=True)
 assert call.returncode!=0 and not pathlib.Path(p['sourceDir']).exists()
print('disk scenarios passed')
`;
    const sourceProgram = library + fake + (runInNewContext(receiver[1]!) as string);
    const result = spawnSync('python3', ['-c', library + fake + `\nSOURCE_PROGRAM=${JSON.stringify(sourceProgram)}\n` + exercise], { encoding: 'utf8', timeout: 30000 });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('disk scenarios passed');
  }, 30000);
});
