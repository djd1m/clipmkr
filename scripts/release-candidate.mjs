#!/usr/bin/env node
// Release controller: writers require bound evidence and independently verified targets.
import { existsSync, lstatSync, readFileSync, realpathSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, renameSync, openSync, readSync, closeSync, fsyncSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['site-test', 'cloud-c'];
const sha = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const id = /^sha256:[a-f0-9]{64}$/;
const name = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
function requireValue(ok, message) { if (!ok) throw new Error(message); }
function stableJson(value) {
  return JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
}
function absolutePath(value) {
  return typeof value === 'string' && isAbsolute(value) && normalize(value) === value && value !== '/' && !/[\r\n\0]/.test(value);
}
function privateFile(path) {
  requireValue(absolutePath(path), 'profile path must be absolute and normalized');
  const stat = lstatSync(path);
  requireValue(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o777) === 0o600 && stat.uid === process.getuid(), 'profile must be an owned regular file with mode 0600');
  const parent = lstatSync(dirname(path));
  requireValue(parent.isDirectory() && !parent.isSymbolicLink() && (parent.mode & 0o077) === 0 && parent.uid === process.getuid(), 'profile parent must be private and owned');
  const actual = realpathSync(path);
  requireValue(actual !== repo && !actual.startsWith(repo + sep), 'profile must be outside repository');
}

export function loadCandidateProfile(path) {
  privateFile(path);
  const profile = JSON.parse(readFileSync(path, 'utf8'));
  requireValue(profile && Array.isArray(profile.targets) && profile.targets.length === 2, 'both explicit targets are required');
  requireValue(new Set(profile.targets.map(t => t?.name)).size === 2 && targets.every(n => profile.targets.some(t => t?.name === n)), 'unknown, duplicate or missing targets');
  for (const target of profile.targets) {
    requireValue(['project','databaseProject','redisProject'].every(k => typeof target[k] === 'string' && name.test(target[k])) && !/^(n5|production|prod)$/i.test(target.project), 'invalid project identity');
    requireValue(target.binding && ['databaseName', 'databaseHost', 'redisHost', 'network'].every(k => typeof target.binding[k] === 'string' && name.test(target.binding[k])), 'invalid database or network binding');
    requireValue(target.transport === 'ssh', 'both test targets require SSH');
    requireValue(Array.isArray(target.dockerPrefix) && (target.dockerPrefix.length === 0 || JSON.stringify(target.dockerPrefix) === '["sudo","-n"]'), 'invalid Docker execution prefix');
    requireValue(['root', 'envFile'].every(k => absolutePath(target[k])) && Array.isArray(target.composeFiles) && target.composeFiles.length > 0 && target.composeFiles.every(absolutePath) && new Set(target.composeFiles).size === target.composeFiles.length, 'invalid target paths');
    requireValue(Array.isArray(target.allowedOrigins) && target.allowedOrigins.length === 1 && target.allowedOrigins.every(origin => {
      try { const u = new URL(origin); return u.origin === origin && ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && u.hostname !== 'clipmkr.ru' && u.hostname !== 'www.clipmkr.ru'; } catch { return false; }
    }), 'invalid origins');
    if (target.name === 'cloud-c') {
      requireValue(target.allowedOrigins.length === 1 && target.allowedOrigins[0] === 'https://c.clipmkr.ru', 'incorrect Cloud origin');
    }
    if (target.transport === 'ssh') {
      requireValue(target.ssh && name.test(target.ssh.alias || '') && absolutePath(target.ssh.knownHosts) && absolutePath(target.ssh.config) && typeof target.ssh.expiresAt === 'string' && Number.isFinite(Date.parse(target.ssh.expiresAt)) && Date.parse(target.ssh.expiresAt) > Date.now(), 'invalid or expired SSH configuration');
    }
    requireValue(typeof target.storageBucket === 'string' && name.test(target.storageBucket) && target.storagePrefix === (target.name === 'cloud-c' ? 'tests/cloud/' : 'tests/site/'), 'invalid storage namespace');
    requireValue(target.resources && ['database', 'redis'].every(k => /^[a-f0-9]{64}$/.test(target.resources[k] || '')) && ['databaseVolume', 'redisVolume'].every(k => typeof target.resources[k] === 'string' && name.test(target.resources[k])), 'missing resource identities');
  }
  return profile;
}

export function validateReleaseManifest(manifest) {
  requireValue(manifest && typeof manifest === 'object' && !Array.isArray(manifest), 'invalid manifest');
  requireValue(commit.test(manifest.commit || '') && manifest.ociRevision === manifest.commit, 'invalid commit or OCI revision');
  requireValue(sha.test(manifest.sourceSha256 || ''), 'invalid source archive hash');
  requireValue(Array.isArray(manifest.journal) && manifest.journal.length > 0, 'missing schema journal');
  let previous = '';
  for (const entry of manifest.journal) {
    requireValue(entry && typeof entry.name === 'string' && /^\d+_[a-z0-9_]+\.sql$/.test(entry.name) && sha.test(entry.sha256 || '') && entry.name > previous, 'invalid schema journal');
    previous = entry.name;
  }
  requireValue(manifest.images && Object.keys(manifest.images).sort().join(',') === 'web,worker', 'missing images');
  for (const image of Object.values(manifest.images)) {
    requireValue(image && id.test(image.id || '') && sha.test(image.archiveSha256 || '') && image.ociRevision === manifest.commit, 'invalid image identity');
  }
  return true;
}

function run(binary, args, options = {}) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) throw new Error(`${binary} failed (exit ${result.status ?? 'unknown'})`);
  return result.stdout.trim();
}
function hashFile(path) {
  const hash = createHash('sha256');
  const fd = openSync(path, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    for (;;) { const bytes = readSync(fd, buffer, 0, buffer.length, null); if (!bytes) break; hash.update(buffer.subarray(0, bytes)); }
  } finally { closeSync(fd); }
  return hash.digest('hex');
}
// The same parser is used locally and by the locked remote executor before load.
const imageMeasurement = String.raw`
import gzip, hashlib, json, re, sys, tarfile

LIMIT = 64 * 1024**3
MAX_ENTRIES = 2000000
BLOCK = 4096
META = 16384

def need(value):
    if not value: raise ValueError('unsupported image archive')

def stream_digest(stream):
    h=hashlib.sha256()
    for chunk in iter(lambda: stream.read(1024*1024), b''): h.update(chunk)
    return h.hexdigest()

class Measured:
    def __init__(self, stream): self.stream=stream; self.hash=hashlib.sha256(); self.size=0
    def read(self, size=-1):
        data=self.stream.read(size); self.size+=len(data); need(self.size<=LIMIT); self.hash.update(data); return data

def measure(path, expected_hash, image_id):
    with open(path,'rb') as f: need(stream_digest(f)==expected_hash)
    with tarfile.open(path,'r:') as outer:
        names=set()
        for entry in outer:
            need(len(names)<MAX_ENTRIES and entry.name not in names and (entry.isdir() or entry.isfile()))
            names.add(entry.name)
        def member(name):
            x=outer.getmember(name); need(x.isfile() and x.size<=LIMIT and not x.sparse); return x
        def small(name):
            x=member(name); need(x.size<=16*1024*1024); return outer.extractfile(x).read()
        manifest=json.loads(small('manifest.json')); need(isinstance(manifest,list) and len(manifest)==1)
        config_path=manifest[0]['Config']; layers=manifest[0]['Layers']
        need(isinstance(layers,list) and 0<len(layers)<=256 and len(set(layers))==len(layers))
        config=small(config_path); config_id='sha256:'+hashlib.sha256(config).hexdigest()
        if config_id != image_id:
            # Newer Docker stores the image ID as an OCI index digest. Bind the
            # selected platform manifest, its config and every compressed layer.
            def descriptor(d):
                ident=d['digest']; need(re.fullmatch(r'sha256:[a-f0-9]{64}',ident))
                raw=small('blobs/sha256/'+ident[7:]); need(len(raw)==d['size'] and 'sha256:'+hashlib.sha256(raw).hexdigest()==ident)
                return json.loads(raw)
            index=json.loads(small('index.json')); refs=index['manifests']
            roots=[d for d in refs if d['digest']==image_id]; need(len(roots)==1)
            root=descriptor(roots[0]); candidates=[]
            for ref in root['manifests']:
                if ref.get('platform',{}).get('os')!='linux': continue
                obj=descriptor(ref)
                if obj.get('config',{}).get('digest')==config_id: candidates.append(obj)
            need(len(candidates)==1)
            obj=candidates[0]; need(obj['config']['size']==len(config))
            need([d['digest'] for d in obj['layers']]==['sha256:'+x.rsplit('/',1)[-1] for x in layers])
            need(all(member(layer).size==d['size'] for layer,d in zip(layers,obj['layers'])))
        config_json=json.loads(config); diffs=config_json['rootfs']['diff_ids']
        need(config_json['rootfs']['type']=='layers' and len(diffs)==len(layers))
        total_stream=0; total_alloc=0; entries=0
        for layer,diff in zip(layers,diffs):
            x=member(layer)
            match=re.fullmatch(r'blobs/sha256/([a-f0-9]{64})',layer)
            if match:
                with outer.extractfile(x) as f: need(stream_digest(f)==match.group(1))
            else:
                need(bool(re.fullmatch(r'[a-f0-9]{64}/layer\.tar',layer)))
            with outer.extractfile(x) as compressed:
                magic=compressed.read(2)
                compressed.seek(0)
                if match: need(magic==b'\x1f\x8b')
                stream=gzip.GzipFile(fileobj=compressed) if magic==b'\x1f\x8b' else compressed
                measured=Measured(stream)
                with tarfile.open(fileobj=measured,mode='r|') as nested:
                    for item in nested:
                        entries+=1; need(entries<=MAX_ENTRIES and not item.sparse and not any(k.startswith('GNU.sparse') for k in item.pax_headers))
                        need(item.isfile() or item.isdir() or item.issym() or item.islnk() or (item.ischr() and item.devmajor==0 and item.devminor==0 and item.name.rsplit('/',1)[-1].startswith('.wh.')))
                        total_alloc+=META
                        if item.isfile(): total_alloc+=((item.size+BLOCK-1)//BLOCK)*BLOCK
                        need(total_alloc<=LIMIT)
                for _ in iter(lambda:measured.read(1024*1024),b''): pass
                need('sha256:'+measured.hash.hexdigest()==diff)
                total_stream+=measured.size; need(total_stream<=LIMIT)
        return {'streamBytes':total_stream,'allocationBytes':total_alloc,'entries':entries}

if __name__=='__main__':
    try:
        p=json.load(sys.stdin); print(json.dumps(measure(p['path'],p['sha256'],p['id'])))
    except Exception:
        print('image measurement failed',file=sys.stderr); sys.exit(1)
`;
const diskAdmission = String.raw`
import os, stat, subprocess, tempfile, tomllib

GIB=1024**3
def disk_need(ok, why):
    if not ok: raise ValueError('release disk admission: '+why)
def read_command(args):
    return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True,timeout=30).stdout.strip()
def proc_info(prefix):
    disk_need(prefix in ([],['sudo','-n']),'read prefix')
    # Only selected daemon path/config flags and DOCKER_TMPDIR are returned.
    code="""import json,os
found={}
for item in os.listdir('/proc'):
 if not item.isdigit(): continue
 try:
  argv=open('/proc/'+item+'/cmdline','rb').read().split(b'\\0'); name=os.path.basename(argv[0].decode())
  if name not in ('dockerd','containerd'): continue
  env=open('/proc/'+item+'/environ','rb').read().split(b'\\0') if name=='dockerd' else []
  tmp=[x.split(b'=',1)[1].decode() for x in env if x.startswith(b'DOCKER_TMPDIR=')]
  args=[x.decode() for x in argv[1:] if x]; selected=('--config-file','--data-root','--exec-root','--containerd','--storage-driver','--graph','-g','--config','-c','--root','-r','--state')
  visible=[]
  for i,arg in enumerate(args):
   if arg in selected:
    visible.extend([arg,args[i+1] if i+1<len(args) else ''])
   elif any(arg.startswith(x+'=') for x in selected): visible.append(arg)
  found.setdefault(name,[]).append({'argv':visible,'tmp':tmp})
 except (OSError,UnicodeError): pass
print(json.dumps(found))"""
    return json.loads(read_command(prefix+['python3','-c',code]))
def flag(argv, names):
    found=[]
    for i,arg in enumerate(argv):
        for name in names:
            if arg==name:
                disk_need(i+1<len(argv),'daemon flag'); found.append(argv[i+1])
            elif arg.startswith(name+'='): found.append(arg[len(name)+1:])
    disk_need(len(found)<=1,'duplicate daemon flag')
    return found[0] if found else None
def path_info(path, mounts):
    disk_need(isinstance(path,str) and path.startswith('/') and os.path.normpath(path)==path,'path')
    current=path
    while not os.path.lexists(current):
        parent=os.path.dirname(current); disk_need(parent!=current,'missing path parent'); current=parent
    disk_need(os.path.realpath(current)==current and stat.S_ISDIR(os.lstat(current).st_mode),'path parent or symlink')
    matches=[m for m in mounts if current==m['path'] or current.startswith(m['path'].rstrip('/')+'/')]
    disk_need(bool(matches),'mount missing')
    mount=max(matches,key=lambda x:len(x['path']))
    st=os.stat(current); v=os.statvfs(current)
    disk_need(mount['type']=='ext4' and v.f_frsize==4096 and st.st_dev==os.stat(mount['path']).st_dev,'unsupported filesystem')
    return {'path':path,'observedAt':current,'mount':mount['path'],'device':mount['device'],'fsType':mount['type'],'block':v.f_frsize,'stDev':st.st_dev},v
def mount_table():
    mounts=[]
    for line in open('/proc/self/mountinfo'):
        left,right=line.rstrip().split(' - ',1); a=left.split(); b=right.split()
        def unescape(s): return re.sub(r'\\([0-7]{3})',lambda m:chr(int(m.group(1),8)),s)
        mounts.append({'path':unescape(a[4]),'device':a[2],'type':b[0]})
    return mounts
def daemon_configs(prefix, docker_config, containerd_config):
    code="""import json,os,sys,tomllib
d,c=sys.argv[1:]
docker=json.load(open(d)) if os.path.exists(d) else {}
containerd=tomllib.load(open(c,'rb')) if os.path.exists(c) else {}
print(json.dumps({'docker':{k:docker[k] for k in ('data-root','exec-root','storage-driver','containerd') if k in docker},'containerd':{k:containerd[k] for k in ('root','state') if k in containerd}}))"""
    result=json.loads(read_command(prefix+['python3','-c',code,docker_config,containerd_config]))
    return result['docker'],result['containerd']
def source_measure(path,expected):
    with open(path,'rb') as f: disk_need(stream_digest(f)==expected,'source hash')
    allocation=0; entries=0
    with tarfile.open(path,'r:') as tar:
        for item in tar:
            disk_need(item.isfile() or item.isdir(),'source entry')
            entries+=1; disk_need(entries<=MAX_ENTRIES,'source entries')
            allocation+=META + (((item.size+BLOCK-1)//BLOCK)*BLOCK if item.isfile() else 0)
            disk_need(allocation<=LIMIT,'source allocation')
    return {'allocationBytes':allocation,'entries':entries}
def admit_disk(p):
    prefix=p['dockerPrefix']; disk_need(prefix in ([],['sudo','-n']),'Docker prefix')
    disk_need(type(p['inputBytes']) is int and p['inputBytes']>0,'input size')
    artifacts=p['artifacts']; disk_need(set(artifacts)=={'source','web','worker'},'artifacts')
    disk_need(p.get('targetName') in ('site-test','cloud-c'),'target binding')
    disk_need(os.path.commonpath((p['appRoot'],p['sourceDir'])) not in (p['appRoot'],p['sourceDir']) and
              os.path.commonpath((p['stageDir'],p['sourceDir'])) not in (p['stageDir'],p['sourceDir']),'source layout')
    op=p['operationId']; disk_need(bool(re.fullmatch(r'[a-f0-9]{64}',op)),'operation')
    for key,item in artifacts.items():
        disk_need(item['path']==os.path.join(p['stageDir'],op,key+'.tar') and type(item['size']) is int and item['size']>0 and bool(re.fullmatch(r'[a-f0-9]{64}',item['sha256'])),'artifact binding')
    disk_need(p['sourcePath']==os.path.join(p['sourceDir'],p['commit'],'source.tar') and bool(re.fullmatch(r'[a-f0-9]{40}',p['commit'])),'source binding')
    proc=proc_info(prefix); disk_need(len(proc.get('dockerd',[]))==1 and len(proc.get('containerd',[]))==1,'daemon identity')
    dock=proc['dockerd'][0]; cont=proc['containerd'][0]
    docker_config=flag(dock['argv'],['--config-file']) or '/etc/docker/daemon.json'
    disk_need(docker_config=='/etc/docker/daemon.json','Docker config path')
    docker_root=flag(dock['argv'],['--data-root']) or '/var/lib/docker'
    disk_need(docker_root=='/var/lib/docker' and not flag(dock['argv'],['--graph','-g']) and (flag(dock['argv'],['--exec-root']) in (None,'/var/run/docker','/run/docker')) and
              (flag(dock['argv'],['--containerd']) in (None,'/run/containerd/containerd.sock')) and
              (flag(dock['argv'],['--storage-driver']) in (None,'overlayfs')),'Docker root/driver flags')
    disk_need(dock['tmp'] in ([],['/tmp']),'Docker temp')
    containerd_config=flag(cont['argv'],['--config','-c']) or '/etc/containerd/config.toml'
    disk_need(containerd_config in ('/etc/containerd/config.toml','/etc/containerd/config-default.toml'),'containerd config path')
    config,cconfig=daemon_configs(prefix,docker_config,containerd_config)
    disk_need(isinstance(config,dict) and config.get('data-root','/var/lib/docker')=='/var/lib/docker' and
              config.get('exec-root','/run/docker') in ('/run/docker','/var/run/docker') and
              config.get('storage-driver','overlayfs')=='overlayfs' and
              config.get('containerd','/run/containerd/containerd.sock')=='/run/containerd/containerd.sock','Docker custom layout')
    disk_need(isinstance(cconfig,dict) and cconfig.get('root','/var/lib/containerd')=='/var/lib/containerd' and cconfig.get('state','/run/containerd')=='/run/containerd','containerd config root')
    flagged_root=flag(cont['argv'],['--root','-r'])
    configured_root=cconfig.get('root')
    containerd_root=flagged_root or configured_root
    disk_need(containerd_root=='/var/lib/containerd' and (flagged_root is None or flagged_root=='/var/lib/containerd') and
              flag(cont['argv'],['--state']) in (None,'/run/containerd'),'containerd root unconfirmed or unsupported')
    info=json.loads(read_command(prefix+['docker','info','--format','{{json .}}']))
    version=read_command(prefix+['docker','version','--format','{{.Server.Version}}'])
    status=info.get('DriverStatus') or []
    disk_need(version.split('.')[0]=='29' and info.get('Driver')=='overlayfs' and info.get('DockerRootDir')==docker_root and any('io.containerd.snapshotter.v1' in row for row in status),'Docker driver/version/root')
    content_root=os.path.join(containerd_root,'io.containerd.content.v1.content')
    snapshot_root=os.path.join(containerd_root,'io.containerd.snapshotter.v1.overlayfs')
    docker_tmp=os.path.join(docker_root,'tmp')
    mounts=mount_table(); paths=[p['appRoot'],p['sourceDir'],p['stageDir'],p['stateDir'],'/tmp',docker_root,docker_tmp,containerd_root,content_root,snapshot_root]
    metadata=[]; volumes=[]
    for path in paths:
        meta,v=path_info(path,mounts); metadata.append(meta); volumes.append(v)
    disk_need(all(x['fsType']=='ext4' and x['block']==4096 for x in metadata),'unsupported filesystem')
    disk_need(len({(x['device'],x['mount'],x['stDev']) for x in metadata})==1,'different filesystem')
    for root in (p['appRoot'],p['sourceDir'],p['stageDir'],p['stateDir'],'/tmp',docker_tmp,content_root):
        disk_need(not any(m['path']!=metadata[0]['mount'] and m['path'].startswith(root.rstrip('/')+'/') for m in mounts),'nested mount')
    for m in mounts:
        if m['path'].startswith(snapshot_root+'/'):
            disk_need(m['type']=='overlay' and bool(re.fullmatch(re.escape(snapshot_root)+r'/snapshots/[0-9]+/fs',m['path'])),'unknown snapshotter mount')
    free=min(v.f_bavail*v.f_frsize for v in volumes); inodes=min(v.f_favail for v in volumes)
    future=0; inode_need=4096
    for key,item in artifacts.items():
        path=item['path']
        if os.path.lexists(path):
            st=os.lstat(path)
            disk_need(stat.S_ISREG(st.st_mode) and st.st_size==item['size'] and os.path.realpath(path)==path,'staged artifact')
            with open(path,'rb') as f: disk_need(stream_digest(f)==item['sha256'],'staged hash drift')
        else:
            future+=item['size']; inode_need+=1
    src=p['sourceMeasure']; disk_need(type(src.get('allocationBytes')) is int and type(src.get('entries')) is int and src['allocationBytes']>0 and src['entries']>0,'source measure')
    if not os.path.lexists(p['sourcePath']):
        future+=artifacts['source']['size']+src['allocationBytes']; inode_need+=src['entries']+3
    else:
        st=os.lstat(p['sourcePath']); disk_need(stat.S_ISREG(st.st_mode) and st.st_size==artifacts['source']['size'],'source sync drift')
        with open(p['sourcePath'],'rb') as f: disk_need(stream_digest(f)==artifacts['source']['sha256'],'source sync hash drift')
        inventory_path=os.path.join(os.path.dirname(p['sourcePath']),'inventory.json')
        inventory_stat=os.lstat(inventory_path)
        disk_need(stat.S_ISREG(inventory_stat.st_mode) and os.path.realpath(inventory_path)==inventory_path,'source inventory path')
        with open(inventory_path) as f: inventory=json.load(f)
        disk_need(inventory.get('commit')==p['commit'] and inventory.get('sourceSha256')==artifacts['source']['sha256'] and bool(inventory.get('files')),'source inventory drift')
    streams=0; allocations=0; layer_entries=0
    for key in ('web','worker'):
        x=p['measurements'][key]; disk_need(all(type(x.get(k)) is int and x[k]>0 for k in ('streamBytes','allocationBytes','entries')),'image measure')
        streams+=x['streamBytes']; allocations+=x['allocationBytes']; layer_entries+=x['entries']
    inode_need+=2*layer_entries
    required=future+2*streams+2*allocations+GIB+2*GIB+3*p['inputBytes']
    disk_need(free>=required and inodes>=inode_need,'insufficient bytes or inodes')
    binding={'paths':metadata,'dockerRoot':docker_root,'containerdRoot':containerd_root,'dockerConfig':docker_config,'containerdConfig':containerd_config,'version':version,'driver':'overlayfs'}
    if 'expectedBinding' in p: disk_need(binding==p['expectedBinding'],'filesystem identity drift')
    return {'binding':binding,'freeBytes':free,'freeInodes':inodes,'requiredBytes':required,'requiredInodes':inode_need,'futureArchiveAndSourceBytes':future}
`;
const diskLibrary = imageMeasurement.slice(0, imageMeasurement.indexOf("if __name__=='__main__':")) + diskAdmission;
function prepare(revision, output) {
  requireValue(commit.test(revision || ''), 'prepare requires a full Git SHA');
  requireValue(absolutePath(output), 'prepare requires a new absolute output directory');
  requireValue(run('git', ['rev-parse', '--verify', `${revision}^{commit}`], { cwd: repo }) === revision, 'commit not found');
  const tracked = run('git', ['ls-tree', '-r', '-z', '--name-only', revision], { cwd: repo }).split('\0');
  requireValue(!tracked.some(path => /(^|\/)\.env(?:$|\.(?!example$))/.test(path)), 'Git revision contains an environment file');
  const outputParent = realpathSync(dirname(output));
  const outputParentStat = lstatSync(outputParent);
  requireValue(outputParentStat.isDirectory() && outputParentStat.uid === process.getuid() && (outputParentStat.mode & 0o077) === 0, 'artifact parent must be private and owned');
  requireValue(outputParent !== repo && !outputParent.startsWith(repo + sep), 'artifact output must be outside repository');
  // The archive is extracted into a fresh temporary directory, independent of the operator's working tree.
  mkdirSync(output, { mode: 0o700 }); // Refuse reuse, including a partial previous build.
  const work = mkdtempSync(join(tmpdir(), 'clipmkr-release-'));
  try {
    const source = join(output, 'source.tar');
    run('git', ['archive', '--format=tar', `--output=${source}`, revision], { cwd: repo });
    run('tar', ['-xf', source, '-C', work]);
    const migrations = join(work, 'packages/db/migrations');
    const journal = readdirSync(migrations).filter(n => /^\d+_[a-z0-9_]+\.sql$/.test(n)).sort()
      .map(name => ({ name, sha256: hashFile(join(migrations, name)) }));
    const images = {};
    for (const target of ['web', 'worker']) {
      const tag = `clipmkr-candidate-${target}:${revision}`;
      run('docker', ['build', '--target', target, '--build-arg', `RELEASE_REVISION=${revision}`, '-t', tag, work]);
      const imageId = run('docker', ['image', 'inspect', '--format', '{{.Id}}', tag]);
      const ociRevision = run('docker', ['image', 'inspect', '--format', '{{index .Config.Labels "org.opencontainers.image.revision"}}', tag]);
      requireValue(id.test(imageId) && ociRevision === revision, 'built image identity mismatch');
      const archive = join(output, `${target}.tar`);
      run('docker', ['save', '-o', archive, imageId]);
      images[target] = { id: imageId, archiveSha256: hashFile(archive), ociRevision };
    }
    const manifest = { commit: revision, ociRevision: revision, sourceSha256: hashFile(source), journal, images };
    validateReleaseManifest(manifest);
    writeFileSync(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  } finally { rmSync(work, { recursive: true, force: true }); }
}
function verifySource(manifest, sourcePath) {
  const work = mkdtempSync(join(tmpdir(), 'clipmkr-verify-source-'));
  try {
    const canonical = join(work, 'source.tar');
    requireValue(run('git', ['rev-parse', '--verify', `${manifest.commit}^{commit}`], { cwd: repo }) === manifest.commit, 'commit not found');
    run('git', ['archive', '--format=tar', `--output=${canonical}`, manifest.commit], { cwd: repo });
    requireValue(hashFile(canonical) === manifest.sourceSha256 && hashFile(sourcePath) === manifest.sourceSha256, 'source differs from Git archive');
    const extraction = join(work, 'source'); mkdirSync(extraction, { mode: 0o700 });
    run('tar', ['-xf', canonical, '-C', extraction]);
    const migrations = join(extraction, 'packages/db/migrations');
    const journal = readdirSync(migrations).filter(n => /^\d+_[a-z0-9_]+\.sql$/.test(n)).sort()
      .map(name => ({ name, sha256: hashFile(join(migrations, name)) }));
    requireValue(JSON.stringify(journal) === JSON.stringify(manifest.journal), 'schema journal differs from Git archive');
  } finally { rmSync(work, { recursive: true, force: true }); }
}
// Remote probe depends only on Python 3 and Docker. It never prints compose config,
// environment variables, credentials, or container command lines.
const probe = `
import base64, json, subprocess, sys, urllib.request
p=json.loads(base64.b64decode(sys.argv[1]))
def run(args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True).stdout.strip()
docker=p['dockerPrefix']+['docker']
base=docker+['compose','--project-directory',p['root'],'--project-name',p['project'],'--env-file',p['envFile']]
for path in p['composeFiles']: base+=['-f',path]
result={}
for service in ['web','worker-stt','worker-llm','worker-video']:
    ids=run(base+['ps','--all','-q',service]).splitlines()
    if len(ids)!=1: raise RuntimeError('service count')
    data=json.loads(run(docker+['inspect',ids[0]]))[0]
    if not data['State']['Running']: raise RuntimeError('service not running')
    result[service]={'containerId':data['Id'],'imageId':data['Image'],'startedAt':data['State']['StartedAt']}
if p['name']=='site-test':
    code="fetch('http://127.0.0.1:3000/health').then(async r=>{if(!r.ok)process.exit(1);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))"
    health=json.loads(run(docker+['exec',result['web']['containerId'],'node','-e',code]))
else:
    with urllib.request.urlopen(p['origin']+'/health',timeout=10) as r:
        if r.status != 200: raise RuntimeError('health failed')
        health=json.load(r)
if health.get('status')!='ok': raise RuntimeError('health failed')
print(json.dumps({'services':result,'revision':health.get('revision')}))
`;
function inspectTarget(target, manifest) {
  const data = Buffer.from(JSON.stringify({ name: target.name, root: target.root, project: target.project, envFile: target.envFile,
    composeFiles: target.composeFiles, dockerPrefix: target.dockerPrefix, origin: target.allowedOrigins[0] })).toString('base64');
  const code = Buffer.from(probe).toString('base64');
  let output;
  {
    privateFile(target.ssh.config);
    const hostFile = lstatSync(target.ssh.knownHosts);
    requireValue(hostFile.isFile() && !hostFile.isSymbolicLink(), 'known_hosts must be a regular file');
    // Both interpolated strings contain only base64; the remote shell cannot interpret them.
    const remote = `python3 -c 'exec(__import__("base64").b64decode("${code}"))' '${data}'`;
    output = run('ssh', ['-F', target.ssh.config, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
      '-o', `UserKnownHostsFile=${target.ssh.knownHosts}`, '-o', 'GlobalKnownHostsFile=/dev/null', target.ssh.alias, remote], { timeout: 60000 });
  }
  const observed = JSON.parse(output);
  requireValue(observed.revision === manifest.commit, 'health revision mismatch');
  for (const service of ['web', 'worker-stt', 'worker-llm', 'worker-video']) {
    const actual = observed.services?.[service];
    requireValue(actual && actual.imageId === manifest.images[service === 'web' ? 'web' : 'worker'].id &&
      typeof actual.containerId === 'string' && /^[a-f0-9]{64}$/.test(actual.containerId) &&
      typeof actual.startedAt === 'string' && Number.isFinite(Date.parse(actual.startedAt)), 'runtime identity mismatch');
  }
  return observed;
}
// This operation creates a new private revision directory and never overwrites
// an existing tree. Input is the locally verified Git archive, streamed on stdin.
const sourceReceiver = diskLibrary + `
import base64,fcntl,hashlib,json,os,stat,sys,tarfile
p=json.loads(__import__('base64').b64decode(sys.argv[1]))
def need(ok):
    if not ok: raise ValueError('source admission')
base=p['sourceDir']; root=p['root']; rev=p['commit']
need(p['disk']['targetName']==p['targetName'])
need(os.path.isabs(base) and os.path.normpath(base)==base and os.path.commonpath([base,root])!=root)
lock=os.open(os.path.join(p['disk']['stateDir'],'release.lock'),os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
st=os.fstat(lock);need(stat.S_ISREG(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o600)
fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
admit_disk(p['disk'])
parent=os.path.dirname(base); st=os.lstat(parent)
need(stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode) and st.st_uid==os.getuid() and not(st.st_mode&0o022) and os.path.realpath(parent)==parent)
if not os.path.lexists(base): os.mkdir(base,0o700)
st=os.lstat(base)
need(stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o700 and os.path.realpath(base)==base)
dest=os.path.join(base,rev); os.mkdir(dest,0o700)
archive=os.path.join(dest,'source.tar'); digest=hashlib.sha256()
with open(archive,'xb') as f:
    os.chmod(archive,0o600)
    while True:
        data=sys.stdin.buffer.read(1024*1024)
        if not data: break
        digest.update(data); f.write(data)
    f.flush(); os.fsync(f.fileno())
need(digest.hexdigest()==p['sourceSha256'])
tree=os.path.join(dest,'tree'); os.mkdir(tree,0o700)
files={}; seen=set()
with tarfile.open(archive,'r:') as tar:
    for member in tar:
        name=member.name.rstrip('/')
        parts=name.split('/')
        need(name and not name.startswith('/') and all(x not in ('','.','..') for x in parts) and name not in seen)
        seen.add(name)
        out=os.path.join(tree,*parts); need(os.path.commonpath([tree,out])==tree)
        if member.isdir(): os.makedirs(out,mode=0o700,exist_ok=True); continue
        need(member.isfile() and not member.issym() and not member.islnk())
        os.makedirs(os.path.dirname(out),mode=0o700,exist_ok=True)
        h=hashlib.sha256(); size=0
        with tar.extractfile(member) as src, open(out,'xb') as dst:
            while True:
                data=src.read(1024*1024)
                if not data: break
                h.update(data); size+=len(data); dst.write(data)
            dst.flush(); os.fsync(dst.fileno())
        need(size==member.size)
        os.chmod(out,0o700 if member.mode & 0o111 else 0o600)
        files[name]={'sha256':h.hexdigest(),'size':size}
observed={}
for parent,dirs,names in os.walk(tree,followlinks=False):
    for name in dirs: need(not os.path.islink(os.path.join(parent,name)))
    for name in names:
        path=os.path.join(parent,name); need(not os.path.islink(path))
        h=hashlib.sha256(); size=0
        with open(path,'rb') as f:
            while True:
                data=f.read(1024*1024)
                if not data: break
                h.update(data); size+=len(data)
        observed[os.path.relpath(path,tree)]={'sha256':h.hexdigest(),'size':size}
need(files==observed and bool(files))
with open(os.path.join(dest,'inventory.json'),'x') as f:
    os.chmod(f.name,0o600); json.dump({'commit':rev,'sourceSha256':p['sourceSha256'],'files':files},f,sort_keys=True,separators=(',',':')); f.flush(); os.fsync(f.fileno())
print(json.dumps({'status':'verified','commit':rev,'sourceSha256':p['sourceSha256'],'files':len(files)}))
`;
function syncSource(target, manifest, archive, disk) {
  requireValue(absolutePath(target.sourceDir), 'invalid source destination');
  requireValue(target.sourceDir !== target.root && !target.sourceDir.startsWith(target.root + sep) && !target.root.startsWith(target.sourceDir + sep), 'source destination overlaps app root');
  const artifacts = ['source','web','worker'].map(name => lstatSync(join(dirname(archive), `${name}.tar`)));
  requireValue(artifacts.every(item => item.isFile() && !item.isSymbolicLink() && item.size > 0), 'complete release artifacts required for source disk admission');
  const releaseBytes = artifacts.reduce((sum, item) => sum + item.size, 0);
  const data = Buffer.from(JSON.stringify({ targetName: target.name, sourceDir: target.sourceDir, root: target.root, commit: manifest.commit, sourceSha256: manifest.sourceSha256, releaseBytes, disk })).toString('base64');
  let binary; let args;
  {
    privateFile(target.ssh.config);
    const known = lstatSync(target.ssh.knownHosts);
    requireValue(known.isFile() && !known.isSymbolicLink(), 'known_hosts must be a regular file');
    const code = Buffer.from(sourceReceiver).toString('base64');
    const remote = `python3 -c 'exec(__import__("base64").b64decode("${code}"))' '${data}'`;
    binary = 'ssh'; args = ['-F', target.ssh.config, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
      '-o', `UserKnownHostsFile=${target.ssh.knownHosts}`, '-o', 'GlobalKnownHostsFile=/dev/null', target.ssh.alias, remote];
  }
  const fd = openSync(archive, 'r');
  try {
    const result = spawnSync(binary, args, { stdio: [fd, 'pipe', 'pipe'], encoding: 'utf8', timeout: 600000, maxBuffer: 1024 * 1024 });
    requireValue(!result.error && result.status === 0, 'source transfer failed or outcome unknown; inspect destination before retry');
    const receipt = JSON.parse(result.stdout);
    requireValue(receipt.status === 'verified' && receipt.commit === manifest.commit && receipt.sourceSha256 === manifest.sourceSha256 && Number.isSafeInteger(receipt.files) && receipt.files > 0, 'source transfer verification failed');
    return receipt;
  } finally { closeSync(fd); }
}
// Operator-owned raw evidence: actual canary requests and captured SDK wire
// requests. The common key retains production permissions; no IAM denial is implied.
function checkStorageReceipt(path, target, revision) {
  privateFile(path);
  const proof = JSON.parse(readFileSync(path, 'utf8'));
  const expectedPrefix = target.name === 'cloud-c' ? 'tests/cloud/' : 'tests/site/';
  requireValue(proof.target === target.name && proof.project === target.project && proof.commit === revision &&
    proof.bucket === target.storageBucket && proof.prefix === expectedPrefix && target.storagePrefix === expectedPrefix,
    'storage namespace identity mismatch');
  const observed = Date.parse(proof.observedAt);
  requireValue(Number.isFinite(observed) && observed <= Date.now() && Date.now() - observed <= 2 * 60 * 60 * 1000, 'storage evidence expired');
  requireValue(typeof proof.endpoint === 'string' && sha.test(proof.sourceCredentialsFingerprint || ''), 'storage evidence incomplete');
  for (const item of ['rawReceipt', 'unitReport', 'integrationReport']) {
    const file = proof[`${item}Path`]; privateFile(file);
    requireValue(sha.test(proof[`${item}Sha256`] || '') && hashFile(file) === proof[`${item}Sha256`], 'storage evidence checksum mismatch');
  }
  for (const [field, source] of [['sdkSourceSha256','packages/s3/src/client.ts'], ['unitSourceSha256','tests/storage-prefix.test.ts'], ['integrationSourceSha256','tests/storage-prefix.integration.test.ts'], ['fixtureSourceSha256','tests/fixtures/environment.ts']]) {
    const result = spawnSync('git', ['show', `${revision}:${source}`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 });
    requireValue(!result.error && result.status === 0 && sha.test(proof[field] || '') && createHash('sha256').update(result.stdout).digest('hex') === proof[field], 'storage source revision mismatch');
  }
  const requiredUnit = [
    'S3 namespace validates prefix and checkout config without changing production S3 config shape',
    'S3 namespace prefixes all object commands before serialization and signing, path style true',
    'S3 namespace prefixes all object commands before serialization and signing, path style false',
    'S3 namespace translates list paths and opaque markers and strips only matching returned keys',
    'S3 namespace rejects malformed paths, bucket mismatch, unsupported commands and foreign responses without escaping namespace',
    'S3 namespace validates multipart response keys and forbids foreign markers and presigned keys',
    'S3 namespace blocks live test transport outside its independent run scope',
    'S3 namespace preserves unrestricted production behavior when namespace is empty',
  ];
  const checkReport = (file, required) => {
    const report = JSON.parse(readFileSync(file, 'utf8'));
    const assertions = (report.testResults || []).flatMap(result => result.assertionResults || []);
    requireValue(report.success === true && required.every(title => assertions.filter(test => test.fullName === title && test.status === 'passed').length === 1), 'storage test report incomplete');
  };
  checkReport(proof.unitReportPath, requiredUnit);
  checkReport(proof.integrationReportPath, ['S3 namespace integration isolates two namespaces on real S3 and preserves outside canary bytes']);
  const raw = JSON.parse(readFileSync(proof.rawReceiptPath, 'utf8'));
  requireValue(raw.cleanupComplete === true && Array.isArray(raw.unknownMultipartKeys) && raw.unknownMultipartKeys.length === 0 &&
    Array.isArray(raw.sdkRequests) && Array.isArray(raw.signedHttp) && sha.test(raw.canaryBeforeSha256 || '') && raw.canaryBeforeSha256 === raw.canaryAfterSha256, 'storage raw evidence incomplete');
  for (const request of raw.sdkRequests) {
    const prefix = request.owner === 'site' ? 'tests/site/' : request.owner === 'cloud' ? 'tests/cloud/' : '';
    const location = request.prefix || request.path;
    requireValue(prefix && Number.isInteger(request.httpStatus) && request.httpStatus >= 200 && request.httpStatus < 300 &&
      typeof request.requestId === 'string' && request.requestId.length > 0 && typeof request.command === 'string' &&
      (request.command === 'GetBucketVersioningCommand' || (typeof location === 'string' && (request.prefix ? location.startsWith(prefix) :
        location.startsWith('/' + prefix) || location.startsWith('/' + proof.bucket + '/' + prefix)))) &&
      (!request.keyMarker || request.keyMarker.startsWith(prefix)), 'storage operation outside namespace or incomplete');
  }
  for (const [owner, commands] of [['site', ['PutObjectCommand','GetObjectCommand','DeleteObjectCommand','ListObjectsV2Command']],
    ['cloud', ['PutObjectCommand','DeleteObjectCommand','CreateMultipartUploadCommand','CompleteMultipartUploadCommand','AbortMultipartUploadCommand','ListObjectsV2Command','ListMultipartUploadsCommand','ListPartsCommand']]]) {
    requireValue(commands.every(command => raw.sdkRequests.some(request => request.owner === owner && request.command === command)), 'storage operation evidence missing');
  }
  requireValue(raw.sdkRequests.filter(request => request.owner === 'cloud' && request.command === 'ListObjectsV2Command').length >= 2 &&
    raw.sdkRequests.some(request => request.owner === 'cloud' && request.command === 'ListMultipartUploadsCommand' && request.keyMarker), 'storage pagination evidence missing');
  const signed = ['UploadPart','GetObject'].map(operation => raw.signedHttp.find(item => item.operation === operation));
  requireValue(signed.every(item => item && item.key?.startsWith('tests/cloud/') && Number.isInteger(item.httpStatus) && item.httpStatus >= 200 && item.httpStatus < 300 &&
    typeof item.requestId === 'string' && item.requestId.length > 0 && sha.test(item.bytesSha || '')) && signed[0].bytesSha === signed[1].bytesSha, 'signed HTTP evidence incomplete');
  return proof;
}
// Backup admission uses a private operator binding to a real dump and the
// independently produced restore-results list. Live inventory comparison is
// still mandatory before any writer can start.
function checkBackupReceipt(path, target) {
  privateFile(path);
  const binding = JSON.parse(readFileSync(path, 'utf8'));
  requireValue(binding.target === target.name && binding.project === target.project, 'backup target mismatch');
  const time = Date.parse(binding.observedAt);
  requireValue(Number.isFinite(time) && time <= Date.now() && Date.now() - time <= 4 * 60 * 60 * 1000, 'backup evidence expired');
  privateFile(binding.backupPath); privateFile(binding.restoreReceiptPath);
  const digest = hashFile(binding.backupPath);
  requireValue(sha.test(binding.sha256 || '') && digest === binding.sha256, 'backup checksum mismatch');
  const all = JSON.parse(readFileSync(binding.restoreReceiptPath, 'utf8'));
  requireValue(Array.isArray(all), 'invalid restore receipt');
  const matches = all.filter(r => r && r.backup_file === binding.backupPath && r.sha256 === digest);
  requireValue(matches.length === 1, 'restore receipt missing or ambiguous');
  const restored = matches[0];
  const restoredAt = Date.parse(restored.at_utc);
  requireValue(Number.isFinite(restoredAt) && restoredAt <= Date.now() && Date.now() - restoredAt <= 4 * 60 * 60 * 1000, 'restore evidence expired');
  requireValue(restored.restore_exit_code === 0 && sha.test(restored.account_rows_sha256 || '') &&
    Array.isArray(restored.account_columns) && restored.account_columns.includes('id') &&
    restored.account_columns.every(c => typeof c === 'string' && /^[a-z_][a-z0-9_]*$/.test(c)) &&
    Array.isArray(restored.schema_journal) && restored.schema_journal.length > 0, 'restore evidence incomplete');
  let last = '';
  for (const row of restored.schema_journal) {
    requireValue(row && /^\d+_[a-z0-9_]+\.sql$/.test(row.name || '') && row.name > last && sha.test(row.sha256 || ''), 'invalid restore journal');
    last = row.name;
  }
  const identity = binding.sourceIdentity;
  requireValue(identity && identity.composeProject === target.databaseProject && identity.databaseName === target.binding.databaseName &&
    identity.databaseContainerId === target.resources.database &&
    identity.databaseVolume === target.resources.databaseVolume &&
    /^\d+$/.test(String(identity.postgresSystemIdentifier || '')) &&
    typeof identity.databaseName === 'string' && name.test(identity.databaseName) &&
    /^\d+$/.test(String(identity.databaseOid || '')) && typeof identity.timezone === 'string' && identity.timezone.length > 0,
    'backup source identity incomplete');
  return { binding, restored };
}
// Snapshot and copy receipts are private operator evidence. Object keys stay
// logical in the database; copied bytes must match without modifying originals.
function checkDataReceipt(path, target, backup, previous) {
  privateFile(path);
  const proof = JSON.parse(readFileSync(path, 'utf8'));
  const observed = Date.parse(proof.observedAt);
  requireValue(proof.target === target.name && proof.project === target.project && proof.backupSha256 === backup.binding.sha256 &&
    JSON.stringify(proof.sourceIdentity) === JSON.stringify(backup.binding.sourceIdentity) && Number.isFinite(observed) &&
    observed <= Date.now() && Date.now() - observed <= 4 * 60 * 60 * 1000, 'data evidence identity or freshness');
  const tables = ['account','session','video','transcript','clip','clip_link','partner','partner_code','guest_pack','guest_pack_clip','growth_event','attribution','quota_counter','pro_interest','job_attempt','payment_intent','payment_event','payment','operator_action','credit_grant','video_credit_charge','credit_allocation','support_email_token','support_mail_admission','support_operator','support_audit'];
  requireValue(proof.tables && tables.every(table => Object.hasOwn(proof.tables, table)) && Object.keys(proof.tables).every(table => {
    if (!/^[a-z_][a-z0-9_]*$/.test(table) || table === '_schema_migration') return false;
    const row = proof.tables[table]; return row && sha.test(row.snapshotSha256 || '') && row.snapshotSha256 === row.restoredSha256 &&
      Number.isSafeInteger(row.count) && row.count >= 0 && Array.isArray(row.columns) && row.columns.length > 1 &&
      new Set(row.columns).size === row.columns.length && row.columns.every(column => typeof column === 'string' && /^[a-z_][a-z0-9_]*$/.test(column));
  }), 'data snapshot or restore evidence incomplete');
  requireValue(Array.isArray(proof.pendingMultipart) && proof.pendingMultipart.length === 0 && Array.isArray(proof.objects), 'pending uploads or missing object inventory');
  const keys = new Set();
  const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  for (const object of proof.objects) {
    requireValue(object && typeof object.logicalKey === 'string' && /^[A-Za-z0-9_.\/-]+$/.test(object.logicalKey) && !object.logicalKey.startsWith('/') &&
      !object.logicalKey.split('/').some(part => !part || part === '.' || part === '..') && !keys.has(object.logicalKey) &&
      object.destinationKey === target.storagePrefix + object.logicalKey && Number.isSafeInteger(object.sourceSize) && object.sourceSize >= 0 &&
      object.sourceSize === object.destinationSize && sha.test(object.sourceSha256 || '') && object.sourceSha256 === object.destinationSha256 &&
      ['prefixed','legacy-preserved'].includes(object.kind) && uuid.test(object.accountId || '') && uuid.test(object.videoId || '') &&
      typeof object.ownershipEvidence === 'string', 'object copy evidence invalid');
    const [kind, owner] = object.ownershipEvidence.split(':');
    requireValue((kind === 'video' && owner === object.videoId && object.clipId === null) ||
      (['clip','thumbnail'].includes(kind) && uuid.test(object.clipId || '') && owner === object.clipId), 'object owner identity invalid');
    const videoKey = `videos/${object.accountId}/${object.videoId}/`;
    const clipKey = kind === 'clip' ? new RegExp(`^clips/(free|paid)/${object.videoId}/${object.clipId}(?:-v(?:[2-9]|[1-9][0-9]+))?\\.mp4$`) :
      kind === 'thumbnail' ? new RegExp(`^thumbs/${object.videoId}/${object.clipId}(?:-v(?:[2-9]|[1-9][0-9]+))?\\.jpg$`) : null;
    const canonical = kind === 'video' ? object.logicalKey.startsWith(videoKey) && /^source\.(mp4|mov|webm|m4a|mp3|bin)$/.test(object.logicalKey.slice(videoKey.length)) : clipKey.test(object.logicalKey);
    requireValue(canonical, 'noncanonical object ownership');
    if (object.kind === 'legacy-preserved') requireValue(object.originalShaAfter === object.sourceSha256, 'legacy original checksum mismatch');
    keys.add(object.logicalKey);
  }
  const initial = previous?.kind === 'initial-inventory';
  requireValue(initial ? (target.name === 'cloud-c' ? proof.objects.length === 0 : proof.objects.every(o => o.kind === 'legacy-preserved')) : proof.objects.every(o => o.kind === 'prefixed'), 'object kind incompatible with namespace transition');
  if (initial && target.name === 'site-test' && proof.objects.length) {
    privateFile(proof.preservationApprovalPath);
    requireValue(realpathSync(proof.preservationApprovalPath) === proof.preservationApprovalPath && sha.test(proof.preservationApprovalSha256 || '') && hashFile(proof.preservationApprovalPath) === proof.preservationApprovalSha256, 'preservation approval checksum or path');
    const approval = JSON.parse(readFileSync(proof.preservationApprovalPath, 'utf8'));
    const fields = ['logicalKey','accountId','videoId','clipId','ownershipEvidence','sourceSize','sourceSha256','destinationKey'];
    const whitelist = proof.objects.map(object => Object.fromEntries(fields.map(field => [field, object[field]]))).sort((a,b) => a.logicalKey < b.logicalKey ? -1 : a.logicalKey > b.logicalKey ? 1 : 0);
    const whitelistSha = createHash('sha256').update(stableJson(whitelist)).digest('hex');
    requireValue(approval.schema === 'clipmkr-legacy-preservation-1' && approval.decision === 'preserve-all-existing-site-test-data' && typeof approval.evidenceReference === 'string' && approval.evidenceReference.trim().length > 0 && approval.target === 'site-test' && approval.project === target.project && stableJson(approval.sourceIdentity) === stableJson(backup.binding.sourceIdentity) && approval.storageBucket === target.storageBucket && approval.destinationPrefix === 'tests/site/' && approval.objectWhitelistSha256 === whitelistSha, 'preservation approval scope mismatch');
  }
  const scan = proof.multipartScan;
  const scanTime = Date.parse(scan?.observedAt);
  const expectedScopes = [target.storagePrefix, ...proof.objects.filter(object => object.kind === 'legacy-preserved').map(object => object.logicalKey)];
  requireValue(scan && scan.bucket === target.storageBucket && sha.test(scan.storageFingerprint || '') && Number.isFinite(scanTime) &&
    scanTime <= Date.now() && Date.now() - scanTime <= 2 * 60 * 60 * 1000 && Array.isArray(scan.scopes) &&
    new Set(expectedScopes).size === expectedScopes.length && scan.scopes.length === expectedScopes.length, 'multipart scan missing or expired');
  for (const prefix of expectedScopes) {
    const matches = scan.scopes.filter(scope => scope?.prefix === prefix);
    requireValue(matches.length === 1 && Array.isArray(matches[0].pages) && matches[0].pages.length > 0, 'multipart scope missing');
    let previous = null;
    for (const [index, page] of matches[0].pages.entries()) {
      requireValue(page && Number.isInteger(page.httpStatus) && page.httpStatus >= 200 && page.httpStatus < 300 &&
        typeof page.requestId === 'string' && page.requestId.length > 0 && Array.isArray(page.uploads) && page.uploads.length === 0 &&
        (page.keyMarker ?? null) === previous && typeof page.isTruncated === 'boolean' &&
        (page.isTruncated ? typeof page.nextKeyMarker === 'string' && page.nextKeyMarker.startsWith(prefix) && page.nextKeyMarker !== previous : page.nextKeyMarker == null) &&
        (index === matches[0].pages.length - 1 ? !page.isTruncated : page.isTruncated), 'multipart page incomplete or pending');
      previous = page.nextKeyMarker ?? null;
    }
  }
  return proof;
}
// Read-only target inventory. Sensitive compose environment and account rows are
// hashed inside the target process and never returned to the operator terminal.
const admissionProbe = `
import base64, hashlib, json, os, re, subprocess, sys
p=json.loads(base64.b64decode(sys.argv[1]))
def run(args, data=None):
    return subprocess.run(args, input=data, check=True, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True).stdout.strip()
docker=p['dockerPrefix']+['docker']
base=docker+['compose','--project-directory',p['root'],'--project-name',p['project'],'--env-file',p['envFile']]
for path in p['composeFiles']: base+=['-f',path]
config=json.loads(run(base+['config','--format','json']))
web=config['services']['web']['environment']
if web.get('N5_PUBLIC_ORIGIN')!=p['origin']: raise RuntimeError('origin mismatch')
limits={'N5_LIMIT_GLOBAL_MINUTES':'240','N5_LIMIT_USER_MINUTES':'240','N5_LIMIT_PAID_USER_MINUTES':'240','N5_LIMIT_GLOBAL_LLM':'4','N5_LIMIT_USER_LLM':'4'}
for service in ['web','worker-stt','worker-llm']:
    if any(str(config['services'][service]['environment'].get(k,''))!=v for k,v in limits.items()): raise RuntimeError('quota configuration')
def memory_bytes(value):
    m=re.fullmatch(r'([0-9]+)([kKmMgG]?[bB]?)?',str(value or ''))
    if not m: return 0
    return int(m.group(1))*{'':1,'b':1,'k':1024,'kb':1024,'m':1048576,'mb':1048576,'g':1073741824,'gb':1073741824}.get((m.group(2) or '').lower(),0)
for service in ['web','worker-stt','worker-llm','worker-video']:
    if memory_bytes(config['services'][service].get('mem_limit'))<=0: raise RuntimeError('memory limit missing')
with open('/proc/meminfo') as f:
    available=next(int(line.split()[1])*1024 for line in f if line.startswith('MemAvailable:'))
try:
    with open('/sys/fs/cgroup/memory.max') as f: maximum=f.read().strip()
    with open('/sys/fs/cgroup/memory.current') as f: current=int(f.read().strip())
    if maximum!='max': available=min(available,max(0,int(maximum)-current))
except FileNotFoundError: pass
fs=os.statvfs(p['root']); free=fs.f_bavail*fs.f_frsize
if available<2*1024**3 or free<3*p['inputBytes']+2*1024**3: raise RuntimeError('insufficient memory or disk')
keys=['S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY','S3_SECRET_KEY','S3_KEY_PREFIX']
if web.get('S3_KEY_PREFIX')!=p['prefix']: raise RuntimeError('storage prefix mismatch')
if any(not isinstance(web.get(k),str) or not web[k] for k in keys+['S3_PUBLIC_ENDPOINT']): raise RuntimeError('missing storage configuration')
for service in ['worker-stt','worker-video']:
    env=config['services'][service]['environment']
    if any(env.get(k)!=web[k] for k in keys): raise RuntimeError('inconsistent storage configuration')
llm=config['services']['worker-llm']['environment']
if any(k in llm for k in keys) and any(llm.get(k)!=web[k] for k in keys): raise RuntimeError('inconsistent optional storage configuration')
s3={'endpoint':web['S3_ENDPOINT'],'publicEndpoint':web['S3_PUBLIC_ENDPOINT'],'region':web['S3_REGION'],'bucket':web['S3_BUCKET'],'accessKeyId':web['S3_ACCESS_KEY'],'secretAccessKey':web['S3_SECRET_KEY']}
fingerprint=hashlib.sha256(json.dumps(s3,sort_keys=True,separators=(',',':')).encode()).hexdigest()
from urllib.parse import urlsplit, unquote, parse_qsl
url=urlsplit(web.get('DATABASE_URL','')); redisurl=urlsplit(web.get('REDIS_URL',''))
binding=p['binding']
if url.scheme not in ('postgres','postgresql') or url.hostname!=binding['databaseHost'] or (url.port or 5432)!=5432 or unquote(url.path.lstrip('/'))!=binding['databaseName'] or redisurl.scheme not in ('redis','rediss') or redisurl.hostname!=binding['redisHost'] or (redisurl.port or 6379)!=6379: raise RuntimeError('database URL binding')
if any(k.lower() in ('host','hostaddr','port','dbname','service','options') for k,v in parse_qsl(url.query,keep_blank_values=True)) or redisurl.query: raise RuntimeError('unsafe endpoint options')
for service in ['worker-stt','worker-llm','worker-video']:
    env=config['services'][service]['environment']
    if env.get('DATABASE_URL')!=web.get('DATABASE_URL') or env.get('REDIS_URL')!=web.get('REDIS_URL'): raise RuntimeError('service resource mismatch')
for service in ['web','worker-stt','worker-llm','worker-video']:
    svc=config['services'][service]; env=svc['environment']
    if any(svc.get(key) for key in ('extra_hosts','links','dns','dns_search','dns_opt')) or svc.get('network_mode') not in (None,'','default'): raise RuntimeError('compose endpoint override')
    if any(env.get(key) for key in ('PGHOST','PGHOSTADDR','PGPORT','PGDATABASE','PGSERVICE','PGSERVICEFILE','PGOPTIONS')): raise RuntimeError('postgres environment override')
    for group in ('volumes','configs','secrets'):
        for mount in svc.get(group) or []:
            parts=str(mount).split(':') if not isinstance(mount,dict) else []
            path=mount.get('target','') if isinstance(mount,dict) else (parts[1] if len(parts)>1 else parts[0])
            if path and os.path.normpath(path) in ('/','/etc','/etc/hosts','/etc/resolv.conf'): raise RuntimeError('compose DNS mount override')
def resource(kind,project,host,volume,dest):
    c=json.loads(run(docker+['inspect',p['resources'][kind]]))[0]
    if c['Id']!=p['resources'][kind] or not c['State']['Running'] or c['Config']['Labels'].get('com.docker.compose.project')!=project: raise RuntimeError('resource identity')
    if int(c['HostConfig'].get('Memory',0))<=0: raise RuntimeError('resource memory limit')
    vols=[m.get('Name') for m in c['Mounts'] if m.get('Type')=='volume' and m.get('Destination')==dest]
    if vols!=[volume]: raise RuntimeError('resource volume')
    net=c['NetworkSettings']['Networks'].get(binding['network'])
    if not net or host not in (net.get('Aliases') or []): raise RuntimeError('resource network alias')
    return c
db=resource('database',p['databaseProject'],binding['databaseHost'],p['resources']['databaseVolume'],'/var/lib/postgresql/data')
resource('redis',p['redisProject'],binding['redisHost'],p['resources']['redisVolume'],'/data')
# The same effective networks are used by compose run for the migrator. Resolve
# aliases on every attached network before any SQL; ambiguous aliases fail closed.
network_defs=config.get('networks') or {}
for service in ['web','worker-stt','worker-llm','worker-video']:
    service_networks=config['services'][service].get('networks') or {}
    names=list(service_networks) if isinstance(service_networks,(dict,list)) else []
    effective={network_defs.get(n,{}).get('name') or p['project']+'_'+n for n in names}
    if binding['network'] not in effective: raise RuntimeError('app network binding')
    cid=run(base+['ps','--all','-q',service])
    if not cid or '\\n' in cid: raise RuntimeError('app container identity')
    container=json.loads(run(docker+['inspect',cid]))[0]
    labels=(container.get('Config') or {}).get('Labels') or {}
    if container.get('Id')!=cid or labels.get('com.docker.compose.project')!=p['project'] or labels.get('com.docker.compose.service')!=service: raise RuntimeError('app container project binding')
    attached=set((container.get('NetworkSettings') or {}).get('Networks') or {})
    if binding['network'] not in attached or attached!=effective: raise RuntimeError('runtime app network binding')
    host=container.get('HostConfig') or {}
    if any(host.get(key) for key in ('ExtraHosts','Links','Dns','DnsSearch','DnsOptions')) or host.get('NetworkMode') not in (None,'','default',*attached): raise RuntimeError('runtime endpoint override')
    if any(os.path.normpath(mount.get('Destination') or '.') in ('/','/etc','/etc/hosts','/etc/resolv.conf') for mount in container.get('Mounts') or []): raise RuntimeError('runtime DNS mount override')
    for network in attached:
        net=json.loads(run(docker+['network','inspect',network]))[0]
        endpoints=net.get('Containers') or {}
        for cid2 in endpoints:
            item=json.loads(run(docker+['inspect',cid2]))[0]
            aliases=((item.get('NetworkSettings') or {}).get('Networks') or {}).get(network,{}).get('Aliases') or []
            for alias, expected in ((binding['databaseHost'],p['resources']['database']),(binding['redisHost'],p['resources']['redis'])):
                if alias in aliases and item['Id']!=expected: raise RuntimeError('ambiguous endpoint alias')
def sql(query):
    return run(docker+['exec','-i',db['Id'],'sh','-c','exec psql -U "$POSTGRES_USER" -d "$1" -X -A -t -q -v ON_ERROR_STOP=1','sh',binding['databaseName']],query+';\\n')
query="SELECT json_build_object('postgresSystemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'databaseName',current_database(),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'timezone',current_setting('TimeZone'),'journal',(SELECT coalesce(json_agg(json_build_object('name',name,'sha256',sha256) ORDER BY name),'[]'::json) FROM _schema_migration))"
info=json.loads(sql(query))
admission=json.loads(sql("SELECT json_build_object('storageReferences',(SELECT count(*) FROM video WHERE object_key IS NOT NULL OR upload_id IS NOT NULL OR source_url IS NOT NULL)+(SELECT count(*) FROM clip WHERE object_key IS NOT NULL OR thumbnail_key IS NOT NULL),'activeMedia',(SELECT count(*) FROM video WHERE status IN ('uploading','queued','transcribing','selecting','rendering') AND deleted_at IS NULL),'globalMinutes',coalesce((SELECT used FROM quota_counter WHERE scope='global_minutes' AND scope_key='all' AND day=(now() AT TIME ZONE 'Europe/Moscow')::date),0),'globalLlm',coalesce((SELECT used FROM quota_counter WHERE scope='global_llm' AND scope_key='all' AND day=(now() AT TIME ZONE 'Europe/Moscow')::date),0))"))
if admission['activeMedia']!=0: raise RuntimeError('active media')
refs=json.loads(sql("SELECT coalesce(json_agg(k),'[]'::json) FROM (SELECT object_key AS k FROM video WHERE object_key IS NOT NULL UNION SELECT object_key FROM clip WHERE object_key IS NOT NULL UNION SELECT thumbnail_key FROM clip WHERE thumbnail_key IS NOT NULL) x"))
refs=sorted(set(refs))
if any(not isinstance(k,str) or not re.fullmatch('[A-Za-z0-9_./-]+',k) for k in refs): raise RuntimeError('unsafe object reference')
referenceSha=hashlib.sha256(json.dumps(refs,sort_keys=True,separators=(',',':')).encode()).hexdigest()
owners=json.loads(sql("SELECT coalesce(json_agg(json_build_object('logicalKey',k,'ownershipEvidence',owner,'accountId',account_id::text,'videoId',video_id::text,'clipId',clip_id::text)),'[]'::json) FROM (SELECT v.object_key AS k,'video:'||v.id::text AS owner,v.account_id,v.id AS video_id,NULL::uuid AS clip_id FROM video v WHERE v.object_key IS NOT NULL UNION ALL SELECT c.object_key,'clip:'||c.id::text,v.account_id,v.id,c.id FROM clip c JOIN video v ON v.id=c.video_id WHERE c.object_key IS NOT NULL UNION ALL SELECT c.thumbnail_key,'thumbnail:'||c.id::text,v.account_id,v.id,c.id FROM clip c JOIN video v ON v.id=c.video_id WHERE c.thumbnail_key IS NOT NULL) x"))
owners=sorted(owners,key=lambda row:(row['logicalKey'],row['ownershipEvidence']))
ownershipSha=hashlib.sha256(json.dumps(owners,sort_keys=True,separators=(',',':')).encode()).hexdigest()
if int(sql("SELECT count(*) FROM video WHERE status='uploading' AND upload_id IS NOT NULL"))!=0: raise RuntimeError('pending upload or external source')
if admission['globalMinutes']>=240 or admission['globalLlm']>=4: raise RuntimeError('quota exhausted')
columns=p['accountColumns']
if not columns or 'id' not in columns or any(not re.fullmatch('[a-z_][a-z0-9_]*',c) for c in columns): raise RuntimeError('account columns')
col=','.join('"'+c+'"' for c in columns)
rows=json.loads(sql("SELECT coalesce(json_agg(to_jsonb(a) ORDER BY id),'[]'::json) FROM (SELECT "+col+" FROM account) a"))
tables=sorted(p['tableColumns'])
if not tables or any(not re.fullmatch('[a-z_][a-z0-9_]*',table) for table in tables): raise RuntimeError('invalid table names')
schema=json.loads(sql("SELECT coalesce(json_object_agg(table_name, columns),'{}'::json) FROM (SELECT t.table_name, json_agg(c.column_name ORDER BY c.ordinal_position) AS columns FROM information_schema.tables t JOIN information_schema.columns c ON c.table_schema=t.table_schema AND c.table_name=t.table_name WHERE t.table_schema='public' AND t.table_type='BASE TABLE' AND t.table_name <> '_schema_migration' GROUP BY t.table_name) s"))
if any(table not in schema or any(column not in schema[table] for column in p['tableColumns'][table]) for table in tables): raise RuntimeError('schema baseline missing')
hashes={}
counts={}
for table in tables:
    columns=p['tableColumns'][table]
    if len(columns)<2 or any(not re.fullmatch('[a-z_][a-z0-9_]*',c) for c in columns): raise RuntimeError('invalid baseline columns')
    select=','.join('"'+c+'"' for c in columns)
    values=json.loads(sql("SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text),'[]'::jsonb) FROM (SELECT "+select+" FROM "+table+") t"))
    hashes[table]=hashlib.sha256(json.dumps(values,sort_keys=True,separators=(',',':')).encode()).hexdigest()
    counts[table]=len(values)
envs={service:config['services'][service]['environment'] for service in ['web','worker-stt','worker-llm','worker-video']}
def filehash(path):
    digest=hashlib.sha256()
    with open(path,'rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): digest.update(part)
    return digest.hexdigest()
info.update({'environmentFingerprint':hashlib.sha256(json.dumps(envs,sort_keys=True,separators=(',',':')).encode()).hexdigest(),
    'envFileSha256':filehash(p['envFile']),'composeFileSha256':[filehash(path) for path in p['composeFiles']],
    'redisContainerId':p['resources']['redis'],'redisVolume':p['resources']['redisVolume'],
    'referenceCount':len(refs),'referenceSha256':referenceSha,'ownershipSha256':ownershipSha,'dataHashes':hashes,'dataCounts':counts,'dataSchema':schema,'databaseContainerId':db['Id'],'databaseVolume':p['resources']['databaseVolume'], 'composeProject':p['databaseProject'],'accountRowsSha256':hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'storageFingerprint':fingerprint,'storageEndpoint':s3['endpoint'],'storageBucket':s3['bucket'],'storagePrefix':web['S3_KEY_PREFIX']})
print(json.dumps(info))
`;
function observeAdmission(target, restored, evidence) {
  const data = Buffer.from(JSON.stringify({ root: target.root, project: target.project, envFile: target.envFile,
    composeFiles: target.composeFiles, dockerPrefix: target.dockerPrefix, accountColumns: restored.account_columns,
    target: target.name, origin: target.allowedOrigins[0], inputBytes: target.inputBytes, resources: target.resources, binding: target.binding,
    databaseProject: target.databaseProject, redisProject: target.redisProject, prefix: target.storagePrefix,
    tableColumns: Object.fromEntries(Object.entries(evidence.tables).map(([table, row]) => [table, row.columns])) })).toString('base64');
  let output;
  {
    privateFile(target.ssh.config);
    const known = lstatSync(target.ssh.knownHosts);
    requireValue(known.isFile() && !known.isSymbolicLink(), 'known_hosts must be a regular file');
    const encoded = Buffer.from(admissionProbe).toString('base64');
    const remote = `python3 -c 'exec(__import__("base64").b64decode("${encoded}"))' '${data}'`;
    output = run('ssh', ['-F', target.ssh.config, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
      '-o', `UserKnownHostsFile=${target.ssh.knownHosts}`, '-o', 'GlobalKnownHostsFile=/dev/null', target.ssh.alias, remote], { timeout: 60000 });
  }
  return JSON.parse(output);
}
function compareAdmission(target, storage, backup, observed, data) {
  const identity = backup.binding.sourceIdentity;
  for (const key of ['composeProject', 'databaseContainerId', 'databaseVolume', 'postgresSystemIdentifier', 'databaseName', 'databaseOid', 'timezone']) {
    requireValue(observed[key] === identity[key], 'live database identity differs from backup');
  }
  requireValue(observed.accountRowsSha256 === backup.restored.account_rows_sha256 &&
    JSON.stringify(observed.journal) === JSON.stringify(backup.restored.schema_journal), 'live database baseline drift');
  requireValue(observed.dataHashes && observed.dataSchema && observed.dataCounts && JSON.stringify(Object.keys(observed.dataSchema).sort()) === JSON.stringify(Object.keys(data.tables).sort()) && Object.keys(data.tables).every(table => observed.dataHashes[table] === data.tables[table].snapshotSha256 && observed.dataCounts[table] === data.tables[table].count && JSON.stringify(observed.dataSchema[table]) === JSON.stringify(data.tables[table].columns)), 'live data baseline drift');
  const keys = data.objects.map(object => object.logicalKey).sort();
  requireValue(observed.referenceCount === keys.length && observed.referenceSha256 === createHash('sha256').update(JSON.stringify(keys)).digest('hex'), 'live object whitelist mismatch');
  const owners = data.objects.map(object => ({ accountId: object.accountId, clipId: object.clipId, logicalKey: object.logicalKey, ownershipEvidence: object.ownershipEvidence, videoId: object.videoId })).sort((a, b) =>
    a.logicalKey < b.logicalKey ? -1 : a.logicalKey > b.logicalKey ? 1 : a.ownershipEvidence < b.ownershipEvidence ? -1 : a.ownershipEvidence > b.ownershipEvidence ? 1 : 0);
  requireValue(observed.ownershipSha256 === createHash('sha256').update(JSON.stringify(owners)).digest('hex'), 'object ownership mismatch');
  requireValue(observed.storageFingerprint === storage.sourceCredentialsFingerprint && observed.storageEndpoint === storage.endpoint &&
    observed.storageBucket === storage.bucket && observed.storagePrefix === storage.prefix &&
    data.multipartScan.storageFingerprint === storage.sourceCredentialsFingerprint, 'storage evidence does not match effective Compose');
}
const remoteExecutor = diskLibrary + "\n#!/usr/bin/env python3\n\"\"\"Target executor; stdin JSON non-secret request, bounded disk admission before load.\n\"\"\"\nimport base64, datetime, fcntl, hashlib, json, os, re, shutil, stat, subprocess, sys, tarfile, tempfile, urllib.parse, urllib.request\n\nSERVICES = ('web', 'worker-stt', 'worker-llm', 'worker-video')\nSHA = re.compile(r'^[a-f0-9]{64}$')\nNAME = re.compile(r'^[a-z0-9][a-z0-9_-]*$')\n\ndef require(condition, message):\n    if not condition: raise ValueError(message)\n\ndef canonical(x):\n    return json.dumps(x, sort_keys=True, separators=(',', ':'), ensure_ascii=True).encode()\n\ndef digest(x): return hashlib.sha256(canonical(x)).hexdigest()\n\ndef filehash(path):\n    h = hashlib.sha256()\n    with open(path, 'rb') as f:\n        for block in iter(lambda: f.read(1024 * 1024), b''): h.update(block)\n    return h.hexdigest()\n\ndef private(path, directory=False):\n    require(os.path.isabs(path) and os.path.normpath(path) == path, 'path')\n    st = os.lstat(path)\n    require(not stat.S_ISLNK(st.st_mode) and st.st_uid == os.getuid(), 'ownership')\n    require((stat.S_ISDIR(st.st_mode) and stat.S_IMODE(st.st_mode) == 0o700) if directory else\n            (stat.S_ISREG(st.st_mode) and stat.S_IMODE(st.st_mode) == 0o600), 'permissions')\n    require(os.path.realpath(path) == path, 'symlink path')\n\ndef run(args, data=None):\n    return subprocess.run(args, input=data, text=True, check=True, stdout=subprocess.PIPE,\n                          stderr=subprocess.DEVNULL, timeout=600).stdout.strip()\n\ndef valid_journal(j):\n    require(isinstance(j, list) and bool(j), 'journal')\n    prev = ''\n    for e in j:\n        require(isinstance(e, dict) and set(e) == {'name','sha256'} and\n                re.fullmatch(r'\\d+_[a-z0-9_]+\\.sql', e['name']) and\n                e['name'] > prev and SHA.fullmatch(e['sha256']), 'journal entry')\n        prev = e['name']\n\ndef atomic(path, value):\n    parent = os.path.dirname(path)\n    fd, tmp = tempfile.mkstemp(prefix='.state-', dir=parent)\n    try:\n        os.fchmod(fd, 0o600)\n        with os.fdopen(fd, 'wb') as f:\n            f.write(canonical(value)); f.flush(); os.fsync(f.fileno())\n        os.replace(tmp, path)\n        d = os.open(parent, os.O_RDONLY | os.O_DIRECTORY)\n        try: os.fsync(d)\n        finally: os.close(d)\n    finally:\n        if os.path.exists(tmp): os.unlink(tmp)\n\ndef execute(p):\n    require(p.get('action') in ('apply','rollback','reconcile'), 'action')\n    private(p['profilePath']); private(os.path.dirname(p['profilePath']), True)\n    with open(p['profilePath']) as f: profile = json.load(f)\n    require(all(profile.get(k)==p['expectedProfile'].get(k) for k in ('target','project','databaseProject','redisProject','root','sourceDir','envFile','composeFiles','dockerPrefix','origin','resources','binding','storagePrefix','stateDir','stageDir')), 'profile mismatch')\n    require(profile.get('kind') == 'existing-test-project' and profile.get('target') in ('cloud-c','site-test'), 'profile')\n    require(NAME.fullmatch(profile['project']) and not re.fullmatch(r'(n5|production|prod)',profile['project'],re.I), 'project')\n    require(profile['dockerPrefix'] in ([], ['sudo','-n']), 'docker prefix')\n    for key in ('root','sourceDir','envFile','stateDir','stageDir'):\n        require(os.path.isabs(profile[key]) and os.path.normpath(profile[key]) == profile[key] and os.path.realpath(profile[key]) == profile[key], 'profile path')\n    private(profile['stateDir'], True); private(profile['stageDir'], True); private(profile['envFile'])\n    require(os.path.commonpath((profile['root'],profile['stageDir'])) != profile['root'], 'staging inside app')\n    files = profile['composeFiles']\n    require(isinstance(files,list) and len(files) >= 3 and len(files) == len(set(files)), 'compose order')\n    require(all(os.path.isabs(f) and os.path.realpath(f) == f for f in files), 'compose paths')\n    private(files[-1]); private(os.path.dirname(files[-1]), True)\n    u=urllib.parse.urlsplit(profile['healthUrl']); origin=profile['origin']\n    require(u.scheme in ('http','https') and u.netloc and not u.username and not u.password and u.path == '/health' and not u.query and not u.fragment and u.scheme+'://'+u.netloc == origin, 'health origin')\n    require((profile['target']=='cloud-c' and origin=='https://c.clipmkr.ru') or (profile['target']=='site-test' and u.hostname not in ('clipmkr.ru','www.clipmkr.ru')), 'test origin')\n    probe=p['admissionProbe']\n    require(isinstance(probe,str) and SHA.fullmatch(profile['admissionProbeSha256']) and hashlib.sha256(probe.encode()).hexdigest()==profile['admissionProbeSha256'], 'trusted probe binding')\n    admission = p['admission']\n    require(isinstance(admission,dict) and all(k in admission for k in ('identity','storageFingerprint','environmentFingerprint','accountColumns','accountRowsSha256','journal','resourceIdentities','composeFileSha256','backupSha256','scopeProofSha256','inputBytes','envFileSha256','expectedObservation')),  'admission binding')\n    for k in ('storageFingerprint','environmentFingerprint','accountRowsSha256','backupSha256','scopeProofSha256'):\n        require(isinstance(admission[k],str) and SHA.fullmatch(admission[k]), 'admission hash')\n    require(isinstance(admission['inputBytes'],int) and not isinstance(admission['inputBytes'],bool) and admission['inputBytes'] > 0, 'input size')\n    valid_journal(admission['journal'])\n    columns = admission['accountColumns']\n    require(isinstance(columns,list) and 'id' in columns and len(set(columns)) == len(columns) and all(isinstance(c,str) and re.fullmatch(r'[a-z_][a-z0-9_]*',c) for c in columns), 'account columns')\n    docker = profile['dockerPrefix'] + ['docker']\n    base = docker + ['compose','--project-directory',profile['root'],'--project-name',profile['project'],'--env-file',profile['envFile']]\n    for f in files: base += ['-f',f]\n    lockpath = os.path.join(profile['stateDir'],'release.lock')\n    lockfd = os.open(lockpath, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)\n    try:\n        st = os.fstat(lockfd); require(stat.S_ISREG(st.st_mode) and st.st_uid == os.getuid() and stat.S_IMODE(st.st_mode)==0o600, 'lock file')\n        fcntl.flock(lockfd, fcntl.LOCK_EX | fcntl.LOCK_NB)\n        statepath = os.path.join(profile['stateDir'],'intent.json')\n        state = None\n        if os.path.lexists(statepath):\n            private(statepath)\n            with open(statepath) as f: state = json.load(f)\n        marker=os.path.join(profile['stateDir'],'staging.json')\n        private(marker)\n        with open(marker) as f: staging=json.load(f)\n        require(SHA.fullmatch(p.get('operationId','')) and staging.get('operationId')==p['operationId'], 'staging operation mismatch')\n        binding=digest({'profile':profile,'admission':admission,'probeSha256':profile['admissionProbeSha256']})\n        unstarted=False\n        if p['action'] == 'reconcile':\n            if state and state.get('operationId')==p['operationId']:\n                require(state.get('status') in ('pending','success','aborted','operator-blocked') and state.get('binding')==binding, 'no matching operation')\n            else:\n                require(not state or state.get('status') in ('success','aborted'), 'another operation pending')\n                previous=p['previous']; desired=p['desired']\n                valid_journal(previous['journal']); valid_journal(desired['journal'])\n                for release in (previous,desired):\n                    require(set(release['images'])=={'web','worker'} and all(re.fullmatch(r'sha256:[a-f0-9]{64}',v) for v in release['images'].values()), 'release images')\n                images=lambda release:{service:release['images']['web' if service=='web' else 'worker'] for service in SERVICES}\n                state={'status':'pending','operationId':p['operationId'],'binding':binding,'action':p['action'],\n                       'desiredImages':images(desired),'previousImages':images(previous),'desiredRevision':desired['commit'],'previousRevision':previous['commit'],\n                       'desiredJournal':desired['journal'],'previousJournal':previous['journal'],'accountRowsSha256':admission['accountRowsSha256'],'step':'not-started'}\n                unstarted=True\n        else:\n            require(not state or state.get('status') in ('success','aborted'), 'reconcile required')\n        require(admission['composeFileSha256'] == [filehash(f) for f in files], 'compose drift')\n        require(filehash(profile['envFile']) == admission['envFileSha256'], 'env file drift')\n        require(shutil.disk_usage(profile['stageDir']).free >= 3*admission['inputBytes']+2*1024**3, 'staging disk')\n        config = json.loads(run(base + ['config','--format','json']))\n        services = config['services']\n        envs = {s:services[s]['environment'] for s in SERVICES}\n        require(digest(envs) == admission['environmentFingerprint'], 'environment drift')\n        probe_args={'root':profile['root'],'project':profile['project'],'envFile':profile['envFile'],\n                    'composeFiles':files,'dockerPrefix':profile['dockerPrefix'],'accountColumns':columns,\n                    'origin':origin,'inputBytes':admission['inputBytes'],'target':profile['target'],\n                    'databaseProject':profile['databaseProject'],'redisProject':profile['redisProject'],\n                    'resources':profile['resources'],'binding':profile['binding'],'prefix':profile['storagePrefix'],\n                    'tableColumns':admission['tableColumns']}\n        probe_arg=base64.b64encode(canonical(probe_args)).decode()\n        def observe():\n            observed=json.loads(run([sys.executable,'-c',probe,probe_arg]))\n            expected_ob=admission['expectedObservation']\n            keys=('composeProject','databaseContainerId','databaseVolume','postgresSystemIdentifier',\n                  'databaseName','databaseOid','timezone','storageFingerprint','storageEndpoint','storageBucket','storagePrefix',\n                  'redisContainerId','redisVolume','referenceCount','referenceSha256','ownershipSha256','dataHashes','dataCounts')\n            require(all(k in observed and k in expected_ob and observed[k]==expected_ob[k] for k in keys),'probe identity drift')\n            require(all(table in observed.get('dataSchema',{}) and all(col in observed['dataSchema'][table] for col in cols) for table,cols in admission['tableColumns'].items()), 'schema baseline drift')\n            require(observed['storageFingerprint']==admission['storageFingerprint'], 'storage drift')\n            return observed\n        info=observe()\n        def container(service):\n            ids=run(base+['ps','--all','-q',service]).splitlines()\n            require(len(ids)==1,'container count')\n            ob=json.loads(run(docker+['inspect',ids[0]]))[0]\n            require(ob['Id']==ids[0] and ob['State']['Running'] and ob['Config']['Labels'].get('com.docker.compose.project')==profile['project'] and ob['Config']['Labels'].get('com.docker.compose.service')==service,'container identity')\n            return ob\n        resource=profile['resources']\n        require(resource==admission['resourceIdentities'], 'resource drift')\n        ident={k:info[k] for k in ('postgresSystemIdentifier','databaseName','databaseOid','timezone','composeProject','databaseContainerId','databaseVolume')}\n        require(ident==admission['identity'], 'database identity')\n        account=info['accountRowsSha256']\n        def runtime():\n            return {s:{'image': (ob:=container(s))['Image'], 'containerId':ob['Id'], 'startedAt': ob['State']['StartedAt']} for s in SERVICES}\n        def healthy(revision):\n            if profile['target']=='site-test':\n                web=container('web')\n                code=\"fetch('http://127.0.0.1:3000/health').then(async r=>{if(!r.ok)process.exit(1);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))\"\n                h=json.loads(run(docker+['exec',web['Id'],'node','-e',code]))\n            else:\n                with urllib.request.urlopen(profile['healthUrl'],timeout=10) as resp:\n                    require(resp.geturl()==profile['healthUrl'] and resp.status==200,'health redirect'); h=json.load(resp)\n            return h.get('status')=='ok' and h.get('revision')==revision\n        def no_migration_inflight():\n            return not run(docker+['ps','-q','--filter','label=com.docker.compose.project='+profile['project'],'--filter','label=com.docker.compose.service=worker-stt','--filter','label=com.docker.compose.oneoff=True'])\n        if p['action']=='reconcile':\n            try:\n                require(no_migration_inflight(), 'migration still running')\n                observed=runtime()\n                images={s:observed[s]['image'] for s in SERVICES}\n                if not unstarted and images==state['desiredImages'] and info['journal']==state['desiredJournal'] and account==state['accountRowsSha256'] and healthy(state['desiredRevision']): status='success'\n                elif images==state['previousImages'] and info['journal']==state['previousJournal'] and account==state['accountRowsSha256'] and healthy(state['previousRevision']): status='aborted'\n                else: status='operator-blocked'\n            except Exception: status='operator-blocked'\n            state['status']=status; atomic(statepath,state)\n            return {'status':status}\n        require(no_migration_inflight(), 'migration still running')\n        now=datetime.datetime.now(datetime.timezone.utc)\n        for key, seconds in (('scopeObservedAt',7200),('multipartObservedAt',7200),('backupObservedAt',14400),('restoreObservedAt',14400),('dataObservedAt',14400)):\n            value=admission.get(key); require(isinstance(value,str), 'evidence timestamp')\n            timestamp=datetime.datetime.fromisoformat(value.replace('Z','+00:00'))\n            require(timestamp.tzinfo is not None and 0 <= (now-timestamp).total_seconds() <= seconds, 'evidence expired')\n        require(info['journal']==admission['journal'] and account==admission['accountRowsSha256'], 'baseline drift')\n        previous=p['previous']; desired=p['desired']\n        valid_journal(previous['journal']); valid_journal(desired['journal'])\n        require(previous['journal']==info['journal'], 'previous journal')\n        if p['action']=='rollback': require(previous['journal']==desired['journal'], 'rollback journal')\n        elif previous['journal'] != desired['journal']:\n            require(len(previous['journal'])==26 and len(desired['journal'])==28 and desired['journal'][:26]==previous['journal'] and [x['name'][:3] for x in desired['journal'][26:]]==['026','027'], 'migration transition')\n        require(re.fullmatch(r'[a-f0-9]{40}',desired['commit']) and set(desired['images'])=={'web','worker'} and all(re.fullmatch(r'sha256:[a-f0-9]{64}',x) for x in desired['images'].values()), 'desired release')\n        if previous.get('legacy'):\n            require(p['action']=='apply' and previous.get('commit') is None and set(previous['containers'])==set(SERVICES), 'initial inventory')\n        else: require(re.fullmatch(r'[a-f0-9]{40}',previous['commit']), 'previous revision')\n        require(set(previous['images'])=={'web','worker'} and all(re.fullmatch(r'sha256:[a-f0-9]{64}',x) for x in previous['images'].values()), 'previous images')\n        def expected(rel): return {s:rel['images']['web' if s=='web' else 'worker'] for s in SERVICES}\n        current=runtime(); require({s:current[s]['image'] for s in SERVICES}==expected(previous) and healthy(previous['commit']), 'previous runtime')\n        if previous.get('legacy'):\n            require(all(current[s]['containerId']==previous['containers'][s]['containerId'] and current[s]['startedAt']==previous['containers'][s]['startedAt'] for s in SERVICES), 'initial inventory drift')\n        require(all(services[s]['image']==desired['images']['web' if s=='web' else 'worker'] for s in SERVICES),'effective image override')\n        artifacts=p['artifacts']; require(set(artifacts)=={'source','web','worker'},'artifacts')\n        for key in artifacts:\n            entry=artifacts[key]; path=entry['path']\n            private(path)\n            require(SHA.fullmatch(p.get('operationId','')) and os.path.dirname(path)==os.path.join(profile['stageDir'],p['operationId']) and os.path.basename(path)==key+'.tar' and os.path.realpath(path)==path and SHA.fullmatch(entry['sha256']) and filehash(path)==entry['sha256'],'artifact')\n        require(artifacts['source']['sha256']==desired['sourceSha256'] and all(artifacts[k]['sha256']==desired['archiveSha256'][k] for k in ('web','worker')),'artifact binding')\n        disk=p['disk']\n        require(disk['targetName']==profile['target'] and disk['appRoot']==profile['root'] and disk['sourceDir']==profile['sourceDir'] and disk['stageDir']==profile['stageDir'] and disk['stateDir']==profile['stateDir'] and disk['inputBytes']==admission['inputBytes'] and disk['operationId']==p['operationId'] and disk['commit']==desired['commit'] and disk['dockerPrefix']==profile['dockerPrefix'],'disk profile binding')\n        require(disk['artifacts']==artifacts and all(disk['artifacts'][k]['size']==os.stat(artifacts[k]['path']).st_size for k in artifacts),'disk artifact binding')\n        require(source_measure(artifacts['source']['path'],artifacts['source']['sha256'])==disk['sourceMeasure'],'source allocation drift')\n        for k in ('web','worker'):\n            require(measure(artifacts[k]['path'],artifacts[k]['sha256'],desired['images'][k])==disk['measurements'][k],'image archive measurement drift')\n        admit_disk(disk)\n        with tarfile.open(artifacts['source']['path'], 'r:') as archive:\n            found=[]\n            for member in archive:\n                if member.name.startswith('packages/db/migrations/') and re.fullmatch(r'packages/db/migrations/\\d+_[a-z0-9_]+\\.sql',member.name):\n                    require(member.isfile(), 'migration entry')\n                    found.append({'name':member.name.rsplit('/',1)[-1], 'sha256':hashlib.sha256(archive.extractfile(member).read()).hexdigest()})\n            require(sorted(found,key=lambda e:e['name'])==desired['journal'], 'source journal inventory')\n        objects=admission['objectWhitelist']\n        require(isinstance(objects,list), 'object whitelist')\n        if previous.get('legacy'):\n            if profile['target']=='cloud-c': require(not objects, 'initial cloud must be empty')\n            else: require(all(isinstance(obj,dict) and obj.get('kind')=='legacy-preserved' for obj in objects), 'initial legacy required')\n        else: require(all(isinstance(obj,dict) and obj.get('kind')=='prefixed' for obj in objects), 'steady namespace required')\n        state={'status':'pending','operationId':p['operationId'],'binding':binding,'action':p['action'],'desiredImages':expected(desired),'previousImages':expected(previous),'desiredRevision':desired['commit'],'previousRevision':previous['commit'],'desiredJournal':desired['journal'],'previousJournal':previous['journal'],'accountRowsSha256':account,'step':'intent'}\n        atomic(statepath,state)\n        def step(s): state['step']=s; atomic(statepath,state)\n        for k in ('web','worker'):\n            run(docker+['load','-i',artifacts[k]['path']])\n            image=json.loads(run(docker+['image','inspect',desired['images'][k]]))[0]\n            require(image['Id']==desired['images'][k] and image['Config']['Labels'].get('org.opencontainers.image.revision')==desired['commit'],'image identity')\n        step('loaded')\n        verify_code=\"const {S3Client,GetObjectCommand,ListMultipartUploadsCommand}=require('@aws-sdk/client-s3');\\nconst {createHash}=require('node:crypto');\\nlet raw='';process.stdin.setEncoding('utf8');process.stdin.on('data',x=>raw+=x);\\nprocess.stdin.on('end',async()=>{try {\\n const p=JSON.parse(raw),bucket=process.env.S3_BUCKET,prefix=process.env.S3_KEY_PREFIX;\\n if(!bucket || prefix!==p.prefix || !['tests/site/','tests/cloud/'].includes(prefix)) throw Error('namespace');\\n const client=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,credentials:{accessKeyId:process.env.S3_ACCESS_KEY,secretAccessKey:process.env.S3_SECRET_KEY},forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true'});\\n async function digest(key){const response=await client.send(new GetObjectCommand({Bucket:bucket,Key:key}),{abortSignal:AbortSignal.timeout(120000)});const hash=createHash('sha256');let size=0;for await(const part of response.Body){size+=part.length;hash.update(part);}return {size,sha256:hash.digest('hex')};}\\n const scopes=[prefix,...p.objects.filter(item=>item.kind==='legacy-preserved').map(item=>item.logicalKey)];\\n for(const scope of scopes){let keyMarker,uploadIdMarker;for(let page=0;;page++){\\n  if(page>=10000)throw Error('multipart pages');\\n  const result=await client.send(new ListMultipartUploadsCommand({Bucket:bucket,Prefix:scope,KeyMarker:keyMarker,UploadIdMarker:uploadIdMarker}),{abortSignal:AbortSignal.timeout(120000)});\\n  if((result.Uploads||[]).length)throw Error('pending multipart');\\n  if(!result.IsTruncated)break;\\n  if(!result.NextKeyMarker||!result.NextKeyMarker.startsWith(scope)||result.NextKeyMarker===keyMarker&&result.NextUploadIdMarker===uploadIdMarker)throw Error('multipart cursor');\\n  keyMarker=result.NextKeyMarker;uploadIdMarker=result.NextUploadIdMarker;\\n }}\\n for(const item of p.objects){const key=item.logicalKey,dest=prefix+key;\\n  if(typeof key!=='string'||!key||key.startsWith('/')||key.split('/').some(x=>!x||x==='.'||x==='..')||item.destinationKey!==dest||!['legacy-preserved','prefixed'].includes(item.kind))throw Error('key');\\n  const expected={size:item.sourceSize,sha256:item.sourceSha256};const same=x=>x&&x.size===expected.size&&x.sha256===expected.sha256;\\n  if(item.kind==='legacy-preserved'&&!same(await digest(key)))throw Error('legacy source');\\n  if(!same(await digest(dest)))throw Error('prefixed destination');\\n  if(item.kind==='legacy-preserved'&&!same(await digest(key)))throw Error('legacy original');\\n }\\n process.stdout.write(JSON.stringify({verified:p.objects.length}));\\n }catch {process.exitCode=1;}});\"\n        verified=json.loads(run(base+['run','--rm','--no-deps','-T','worker-stt','node','-e',verify_code], json.dumps({'prefix':profile['storagePrefix'],'objects':objects})))\n        require(verified.get('verified')==len(objects),'object verification')\n        step('objects-verified')\n        run(base+['stop',*SERVICES]); step('stopped')\n        stopped=observe()\n        require(stopped['journal']==admission['journal'] and stopped['accountRowsSha256']==account and stopped['dataHashes']==admission['expectedObservation']['dataHashes'], 'stopped baseline drift')\n        rechecked=json.loads(run(base+['run','--rm','--no-deps','-T','worker-stt','node','-e',verify_code], json.dumps({'prefix':profile['storagePrefix'],'objects':objects})))\n        require(rechecked.get('verified')==len(objects),'post-stop object verification')\n        if previous['journal'] != desired['journal']:\n            step('migration-started'); run(base+['run','--rm','--no-deps','-T','worker-stt','node','packages/db/dist/migrate.js']); step('migration-finished')\n        # Repeat exactly the controller's trusted full live admission under lock.\n        # This includes references, quota, memory, and the whole journal/account baseline.\n        after=observe()\n        require(after['journal']==desired['journal'] and after['accountRowsSha256']==account,'migration integrity')\n        require(filehash(profile['envFile'])==admission['envFileSha256'] and [filehash(f) for f in files]==admission['composeFileSha256'], 'configuration changed')\n        run(base+['up','-d','--no-build','--no-deps','--wait','--wait-timeout','180',*SERVICES]); step('started')\n        result=runtime(); require({s:result[s]['image'] for s in SERVICES}==expected(desired) and healthy(desired['commit']),'verification')\n        after=observe()\n        require(after['journal']==desired['journal'] and after['accountRowsSha256']==account,'post-start data drift')\n        require(after['databaseContainerId']==resource['database'] and after['databaseVolume']==resource['databaseVolume'] and after['redisContainerId']==resource['redis'] and after['redisVolume']==resource['redisVolume'], 'resource changed')\n        state['status']='success'; state['step']='verified'; atomic(statepath,state)\n        return {'status':'success','services':result,'revision':desired['commit']}\n    finally: os.close(lockfd)\n\nif __name__ == '__main__':\n    try:\n        result=execute(json.load(sys.stdin)); print(json.dumps(result))\n        if result['status'] not in ('success','aborted'): sys.exit(1)\n    except Exception:\n        print(json.dumps({'status':'blocked'})); sys.exit(1)\n";
function sshCommand(target, code, data, input, timeout = 600000) {
  privateFile(target.ssh.config);
  const known = lstatSync(target.ssh.knownHosts);
  requireValue(known.isFile() && !known.isSymbolicLink(), 'known_hosts must be a regular file');
  const encoded = Buffer.from(code).toString('base64');
  const arg = Buffer.from(JSON.stringify(data)).toString('base64');
  const remote = `python3 -c 'exec(__import__("base64").b64decode("${encoded}"))' '${arg}'`;
  const args = ['-F', target.ssh.config, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
    '-o', `UserKnownHostsFile=${target.ssh.knownHosts}`, '-o', 'GlobalKnownHostsFile=/dev/null', target.ssh.alias, remote];
  const result = spawnSync('ssh', args, { encoding: 'utf8', timeout, maxBuffer: 1024 * 1024, ...input });
  requireValue(!result.error && result.status === 0, 'SSH outcome unknown; reconcile before retry');
  return JSON.parse(result.stdout);
}
const artifactReceiver = diskLibrary + `
import base64,fcntl,hashlib,json,os,re,shutil,stat,sys,tempfile
p=json.loads(base64.b64decode(sys.argv[1])); base=p['stageDir']; root=p['root']; state=p['stateDir']; op=p['operationId']
if 'disk' in p and p['disk'].get('targetName')!=p.get('targetName'): raise ValueError('target disk binding')
def need(value):
    if not value: raise ValueError('staging admission')
def private(path):
    st=os.lstat(path);need(stat.S_ISDIR(st.st_mode) and not stat.S_ISLNK(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o700 and os.path.realpath(path)==path)
def filehash(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for part in iter(lambda:f.read(1024*1024),b''): h.update(part)
    return h.hexdigest()
def atomic(path,value):
    fd,tmp=tempfile.mkstemp(prefix='.staging-',dir=state)
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'w') as f: json.dump(value,f,sort_keys=True);f.flush();os.fsync(f.fileno())
        os.replace(tmp,path);d=os.open(state,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(d)
        finally:os.close(d)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
need(os.path.isabs(base) and os.path.realpath(base)==base and os.path.commonpath([root,base])!=root and re.fullmatch('[a-f0-9]{64}',op))
private(base);private(state)
lock=os.open(os.path.join(state,'release.lock'),os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
try:
    st=os.fstat(lock);need(stat.S_ISREG(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o600)
    fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    marker=os.path.join(state,'staging.json'); intent=os.path.join(state,'intent.json')
    prior=None
    if os.path.lexists(marker):
        st=os.lstat(marker);need(stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o600)
        with open(marker) as f:prior=json.load(f)
    if prior and prior.get('operationId')!=op:
        need(os.path.isfile(intent))
        with open(intent) as f:old=json.load(f)
        need(old.get('operationId')==prior.get('operationId') and old.get('status') in ('success','aborted'))
    if p['mode']=='write': need('disk' in p)
    if 'disk' in p: admit_disk(p['disk'])
    if not prior or prior.get('operationId')!=op: atomic(marker,{'operationId':op})
    directory=os.path.join(base,op)
    if not os.path.lexists(directory):
        os.mkdir(directory,0o700)
        d=os.open(base,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(d)
        finally:os.close(d)
    private(directory)
    name=p['name'];need(name in ('source','web','worker'));final=os.path.join(directory,name+'.tar')
    if os.path.lexists(final):
        st=os.lstat(final);need(stat.S_ISREG(st.st_mode) and not stat.S_ISLNK(st.st_mode) and st.st_uid==os.getuid() and stat.S_IMODE(st.st_mode)==0o600 and st.st_size==p['size'] and filehash(final)==p['sha256'])
        fd=os.open(final,os.O_RDONLY|os.O_NOFOLLOW)
        try:os.fsync(fd)
        finally:os.close(fd)
        d=os.open(directory,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(d)
        finally:os.close(d)
        print(json.dumps({'status':'staged','name':name,'sha256':p['sha256'],'reused':True}));sys.exit(0)
    if p['mode']=='check':print(json.dumps({'status':'missing','name':name}));sys.exit(0)
    need(p['mode']=='write' and shutil.disk_usage(base).free>=p['requiredFree'])
    fd,tmp=tempfile.mkstemp(prefix='.transfer-',dir=directory);h=hashlib.sha256();count=0
    try:
        os.fchmod(fd,0o600)
        with os.fdopen(fd,'wb') as f:
            for block in iter(lambda:sys.stdin.buffer.read(1024*1024),b''):count+=len(block);h.update(block);f.write(block)
            f.flush();os.fsync(f.fileno())
        need(count==p['size'] and h.hexdigest()==p['sha256']);os.link(tmp,final);os.unlink(tmp)
        d=os.open(directory,os.O_RDONLY|os.O_DIRECTORY)
        try:os.fsync(d)
        finally:os.close(d)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)
    print(json.dumps({'status':'staged','name':name,'sha256':h.hexdigest(),'reused':False}))
finally:os.close(lock)
`;

function privateDirectory(path) {
  requireValue(absolutePath(path), 'private state directory must be absolute');
  const stat = lstatSync(path);
  requireValue(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o700 && realpathSync(path) === path && path !== repo && !path.startsWith(repo + sep), 'unsafe private state directory');
}
function saveState(path, state) {
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const fd = openSync(temp, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temp, path);
  const dir = openSync(dirname(path), 'r'); try { fsyncSync(dir); } finally { closeSync(dir); }
}
function artifactPlan(target, manifest, artifactDir, operationId) {
  requireValue(absolutePath(target.stageDir) && absolutePath(target.remoteStateDir) && target.stageDir !== target.root && !target.stageDir.startsWith(target.root + sep) && !target.root.startsWith(target.stageDir + sep), 'unsafe remote staging');
  return Object.fromEntries(['source','web','worker'].map(name => {
    const path = join(artifactDir, `${name}.tar`), st = lstatSync(path);
    requireValue(st.isFile() && !st.isSymbolicLink() && st.size > 0, 'invalid artifact');
    return [name, { path: `${target.stageDir}/${operationId}/${name}.tar`, sha256: name === 'source' ? manifest.sourceSha256 : manifest.images[name].archiveSha256, size: st.size }];
  }));
}
function measureDiskArtifacts(manifest, artifactDir) {
  const sourcePath = join(artifactDir, 'source.tar');
  const source = spawnSync('python3', ['-c', diskLibrary + "\nimport sys,json; p=json.load(sys.stdin); print(json.dumps(source_measure(p['path'],p['sha256'])))"],
    { input: JSON.stringify({ path: sourcePath, sha256: manifest.sourceSha256 }), encoding: 'utf8', timeout: 600000 });
  requireValue(!source.error && source.status === 0, 'source allocation measurement failed');
  const sourceMeasure = JSON.parse(source.stdout);
  const measurements = {};
  for (const key of ['web','worker']) {
    const result = spawnSync('python3', ['-c', imageMeasurement], { input: JSON.stringify({ path: join(artifactDir, `${key}.tar`),
      sha256: manifest.images[key].archiveSha256, id: manifest.images[key].id }), encoding: 'utf8', timeout: 600000 });
    requireValue(!result.error && result.status === 0, `${key} archive measurement failed`);
    measurements[key] = JSON.parse(result.stdout);
  }
  return { sourceMeasure, measurements };
}
function diskPayload(target, manifest, artifacts, operationId, measured) {
  requireValue(absolutePath(target.sourceDir) && absolutePath(target.stageDir) && absolutePath(target.remoteStateDir), 'disk paths required');
  return { targetName: target.name, appRoot: target.root, sourceDir: target.sourceDir, sourcePath: `${target.sourceDir}/${manifest.commit}/source.tar`,
    stageDir: target.stageDir, stateDir: target.remoteStateDir, dockerPrefix: target.dockerPrefix,
    inputBytes: target.inputBytes, commit: manifest.commit, operationId, artifacts, ...measured };
}
function diskPreflight(target, disk) {
  const code = diskLibrary + "\nimport base64,json,sys; p=json.loads(base64.b64decode(sys.argv[1])); print(json.dumps(admit_disk(p)))";
  const result = sshCommand(target, code, disk, { input: '' });
  requireValue(result?.binding && Number.isSafeInteger(result.requiredBytes) && Number.isSafeInteger(result.freeBytes) &&
    result.freeBytes >= result.requiredBytes && result.freeInodes >= result.requiredInodes, 'release disk admission failed');
  return { ...disk, expectedBinding: result.binding };
}
function stageArtifacts(target, artifactDir, operationId, artifacts, disk) {
  const entries = Object.entries(artifacts);
  for (const [name,item] of entries) {
    const data = { targetName: target.name, stageDir: target.stageDir, stateDir: target.remoteStateDir, root: target.root, operationId, name, sha256: item.sha256, size: item.size, requiredFree: 0, disk };
    let receipt = sshCommand(target, artifactReceiver, { ...data, mode: 'check' }, { input: '' });
    if (receipt.status === 'missing') {
      const fd = openSync(join(artifactDir, `${name}.tar`), 'r');
      try { receipt = sshCommand(target, artifactReceiver, { ...data, mode: 'write' }, { stdio: [fd, 'pipe', 'pipe'] }); }
      finally { closeSync(fd); }
    }
    requireValue(receipt.status === 'staged' && receipt.name === name && receipt.sha256 === item.sha256, 'staging verification failed');
  }
}

function remoteRequest(target, request) {
  privateFile(target.ssh.config);
  const known = lstatSync(target.ssh.knownHosts);
  requireValue(known.isFile() && !known.isSymbolicLink(), 'known_hosts must be a regular file');
  const encoded = Buffer.from(remoteExecutor).toString('base64');
  const remote = `python3 -c 'exec(__import__("base64").b64decode("${encoded}"))'`;
  const args = ['-F', target.ssh.config, '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=10',
    '-o', `UserKnownHostsFile=${target.ssh.knownHosts}`, '-o', 'GlobalKnownHostsFile=/dev/null', target.ssh.alias, remote];
  const result = spawnSync('ssh', args, { input: JSON.stringify(request), encoding: 'utf8', timeout: 600000, maxBuffer: 1024 * 1024 });
  requireValue(!result.error && result.status === 0, 'SSH outcome unknown; reconcile before retry');
  return JSON.parse(result.stdout);
}
function mutationPayload(target, manifest, previous, artifacts, storage, backup, data, observed) {
  requireValue(absolutePath(target.executorProfilePath) && absolutePath(target.remoteStateDir) && absolutePath(target.stageDir), 'remote executor profile and private directories required');
  const expectedProfile = { target: target.name, project: target.project, databaseProject: target.databaseProject, redisProject: target.redisProject,
    root: target.root, sourceDir: target.sourceDir, envFile: target.envFile, composeFiles: target.composeFiles, dockerPrefix: target.dockerPrefix,
    origin: target.allowedOrigins[0], resources: target.resources, binding: target.binding, storagePrefix: target.storagePrefix,
    stateDir: target.remoteStateDir, stageDir: target.stageDir };
  const admission = { identity: backup.binding.sourceIdentity, resourceIdentities: target.resources,
    storageFingerprint: storage.sourceCredentialsFingerprint, environmentFingerprint: observed.environmentFingerprint,
    accountColumns: backup.restored.account_columns, accountRowsSha256: backup.restored.account_rows_sha256,
    journal: backup.restored.schema_journal, objectWhitelist: data.objects, tableColumns: Object.fromEntries(Object.entries(data.tables).map(([table, row]) => [table, row.columns])),
    composeFileSha256: observed.composeFileSha256, envFileSha256: observed.envFileSha256,
    backupSha256: backup.binding.sha256, scopeProofSha256: hashFile(target.storageEvidencePath), scopeObservedAt: storage.observedAt, multipartObservedAt: data.multipartScan.observedAt, backupObservedAt: backup.binding.observedAt, restoreObservedAt: backup.restored.at_utc, dataObservedAt: data.observedAt, inputBytes: target.inputBytes, expectedObservation: observed };
  const rel = m => m.kind === 'initial-inventory' ? { legacy: true, commit: null, journal: m.journal, images: m.images, containers: m.containers }
    : { commit: m.commit, journal: m.journal, images: { web: m.images.web.id, worker: m.images.worker.id },
      sourceSha256: m.sourceSha256, archiveSha256: { web: m.images.web.archiveSha256, worker: m.images.worker.archiveSha256 } };
  return { profilePath: target.executorProfilePath, expectedProfile, admissionProbe, admission, previous: rel(previous), desired: rel(manifest), artifacts };
}
function main(args) {
  const [command, profilePath, manifestPath, ...extra] = args;
  if (command === 'prepare') {
    requireValue(!extra.length, 'usage: prepare <full-sha> <new-output-directory>');
    prepare(profilePath, manifestPath);
    process.stdout.write('Release artifacts prepared.\n');
    return;
  }
  requireValue((['source-sync','apply','rollback'].includes(command) ? extra.length === 1 : !extra.length) && ['validate', 'inspect', 'source-sync', 'apply', 'reconcile', 'rollback'].includes(command), 'usage: release-candidate.mjs validate <profile> <manifest>');
  requireValue(profilePath && manifestPath, 'explicit profile and manifest required');
  const profile = loadCandidateProfile(profilePath);
  if (['source-sync','apply','rollback','reconcile'].includes(command) && process.env.CLIPMKR_RELEASE_LOCKED !== '1' &&
      profile.targets.every(target => absolutePath(target.localStateDir))) {
    const locks = profile.targets.map(target => {
      privateDirectory(target.localStateDir);
      const path = join(target.localStateDir, `${target.name}.lock`);
      const fd = openSync(path, 'a', 0o600); closeSync(fd); privateFile(path);
      return path;
    }).sort();
    let argv = [process.execPath, fileURLToPath(import.meta.url), ...args];
    for (const path of locks.reverse()) argv = ['flock', '-n', path, ...argv];
    const result = spawnSync(argv[0], argv.slice(1), { stdio: 'inherit', env: { ...process.env, CLIPMKR_RELEASE_LOCKED: '1' } });
    requireValue(!result.error && result.status === 0, 'release controller lock or operation failed');
    return;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateReleaseManifest(manifest);
  const artifactDir = dirname(resolve(manifestPath));
  verifySource(manifest, join(artifactDir, 'source.tar'));
  if (['source-sync','apply','rollback'].includes(command)) {
    for (const key of ['web','worker']) requireValue(hashFile(join(artifactDir, `${key}.tar`)) === manifest.images[key].archiveSha256, 'image archive checksum mismatch');
  }
  if (command === 'source-sync') {
    const selected = profile.targets.find(t => t.name === extra[0]);
    requireValue(selected, 'explicit known source target required');
    const measured = measureDiskArtifacts(manifest, artifactDir);
    const disks = profile.targets.map(target => {
      const operationId = createHash('sha256').update(stableJson({ command, target: target.name, manifest })).digest('hex');
      const artifacts = artifactPlan(target, manifest, artifactDir, operationId);
      return { target, disk: diskPreflight(target, diskPayload(target, manifest, artifacts, operationId, measured)) };
    });
    process.stdout.write(JSON.stringify({ target: selected.name, ...syncSource(selected, manifest, join(artifactDir, 'source.tar'), disks.find(x => x.target.name === selected.name).disk) }) + '\n');
    return;
  }
  for (const target of ['web', 'worker']) {
    requireValue(hashFile(join(artifactDir, `${target}.tar`)) === manifest.images[target].archiveSha256, 'image archive checksum mismatch');
  }
  if (command === 'inspect') {
    let failed = false;
    for (const target of profile.targets) {
      try { process.stdout.write(JSON.stringify({ target: target.name, status: 'observed', ...inspectTarget(target, manifest) }) + '\n'); }
      catch { failed = true; process.stdout.write(JSON.stringify({ target: target.name, status: 'failed' }) + '\n'); }
    }
    if (failed) throw new Error('one or more targets could not be verified');
    return;
  }
  if (command === 'reconcile') {
    let failed = false;
    for (const target of profile.targets) {
      try {
        privateDirectory(target.localStateDir);
        const path = join(target.localStateDir, `${target.name}.json`); privateFile(path);
        const state = JSON.parse(readFileSync(path, 'utf8'));
        requireValue(state.target === target.name && state.request, 'invalid recorded operation');
        if (['success','aborted'].includes(state.status)) {
          process.stdout.write(JSON.stringify({ target: target.name, status: state.status, previouslyRecorded: true }) + '\n');
          continue;
        }
        if (state.status === 'staging') {
          requireValue(sha.test(state.operationId || '') && state.request.operationId === state.operationId, 'invalid staging operation');
          const staged = {};
          for (const [name, item] of Object.entries(state.request.artifacts)) {
            const receipt = sshCommand(target, artifactReceiver, { stageDir: target.stageDir, stateDir: target.remoteStateDir,
              root: target.root, operationId: state.operationId, name, sha256: item.sha256, size: item.size, requiredFree: 0, mode: 'check' }, { input: '' });
            requireValue(['staged','missing'].includes(receipt.status), 'staging inspection failed'); staged[name] = receipt.status;
          }
          failed = true;
          process.stdout.write(JSON.stringify({ target: target.name, status: 'staging', staged, action: 'retry same operation' }) + '\n');
          continue;
        }
        requireValue(state.status === 'unknown', 'no unknown operation to reconcile');
        const receipt = remoteRequest(target, { ...state.request, action: 'reconcile' });
        requireValue(['success', 'aborted'].includes(receipt.status), 'reconciliation requires operator');
        saveState(path, { ...state, status: receipt.status, receipt });
        process.stdout.write(JSON.stringify({ target: target.name, ...receipt }) + '\n');
      } catch { failed = true; process.stdout.write(JSON.stringify({ target: target.name, status: 'unknown' }) + '\n'); }
    }
    if (failed) throw new Error('reconciliation incomplete');
    return;
  }
  if (command === 'apply' || command === 'rollback') {
    privateFile(extra[0]);
    const previousPaths = JSON.parse(readFileSync(extra[0], 'utf8'));
    requireValue(previousPaths && Object.keys(previousPaths).sort().join(',') === 'cloud-c,site-test', 'previous manifest required per target');
    const previousByTarget = Object.fromEntries(profile.targets.map(target => {
      const path = previousPaths[target.name]; requireValue(absolutePath(path), 'previous manifest path missing');
      const previous = JSON.parse(readFileSync(path, 'utf8'));
      if (previous.kind === 'initial-inventory') {
        privateFile(path);
        const time = Date.parse(previous.observedAt);
        requireValue(command === 'apply' && previous.target === target.name && previous.project === target.project &&
          previous.commit === null && Number.isFinite(time) && time <= Date.now() && Date.now() - time <= 4 * 60 * 60 * 1000 &&
          previous.images && Object.keys(previous.images).sort().join(',') === 'web,worker' && Object.values(previous.images).every(value => id.test(value)) &&
          previous.containers && Object.keys(previous.containers).sort().join(',') === 'web,worker-llm,worker-stt,worker-video' &&
          Object.values(previous.containers).every(value => /^[a-f0-9]{64}$/.test(value?.containerId || '') && Number.isFinite(Date.parse(value?.startedAt))), 'invalid initial runtime inventory');
        validateReleaseManifest({ commit: '0'.repeat(40), ociRevision: '0'.repeat(40), sourceSha256: '0'.repeat(64), journal: previous.journal,
          images: { web: { id: previous.images.web, archiveSha256: '0'.repeat(64), ociRevision: '0'.repeat(40) },
            worker: { id: previous.images.worker, archiveSha256: '0'.repeat(64), ociRevision: '0'.repeat(40) } } });
      } else {
        validateReleaseManifest(previous); verifySource(previous, join(dirname(path), 'source.tar'));
      }
      if (command === 'rollback') requireValue(JSON.stringify(previous.journal) === JSON.stringify(manifest.journal), 'rollback with different full schema journal');
      return [target.name, previous];
    }));
    const proofs = profile.targets.map(target => {
      requireValue(target.storageEvidencePath, 'apply blocked: storage evidence missing');
      requireValue(Number.isSafeInteger(target.inputBytes) && target.inputBytes > 0, 'apply blocked: input bytes missing');
      const storage = checkStorageReceipt(target.storageEvidencePath, target, manifest.commit);
      requireValue(target.backupEvidencePath, 'apply blocked: backup evidence missing');
      const backup = checkBackupReceipt(target.backupEvidencePath, target);
      requireValue(target.dataEvidencePath, 'apply blocked: data evidence missing');
      const data = checkDataReceipt(target.dataEvidencePath, target, backup, previousByTarget[target.name]);
      privateDirectory(target.localStateDir);
      const statePath = join(target.localStateDir, `${target.name}.json`);
      try {
        privateFile(statePath); const state = JSON.parse(readFileSync(statePath, 'utf8'));
        requireValue(['success','aborted','staging'].includes(state.status), 'reconcile required before retry');
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const observed = observeAdmission(target, backup.restored, data);
      compareAdmission(target, storage, backup, observed, data);
      return { target, storage, backup, data, observed, statePath };
    });
    const measured = measureDiskArtifacts(manifest, artifactDir);
    // Both targets pass the same measured bound before the first local intent or remote writer.
    const planned = proofs.map(proof => {
      const { target, backup } = proof;
      const operationId = createHash('sha256').update(stableJson({ target: target.name, command, manifest, previous: previousByTarget[target.name], backup: backup.binding.sha256, storage: hashFile(target.storageEvidencePath), data: hashFile(target.dataEvidencePath) })).digest('hex');
      const artifacts = artifactPlan(target, manifest, artifactDir, operationId);
      const disk = diskPreflight(target, diskPayload(target, manifest, artifacts, operationId, measured));
      return { ...proof, operationId, artifacts, disk };
    });
    let failed = false;
    for (const { target, storage, backup, data, observed, statePath, operationId, artifacts, disk } of planned) {
      try {
        const request = { ...mutationPayload(target, manifest, previousByTarget[target.name], artifacts, storage, backup, data, observed), action: command, operationId, disk };
        if (existsSync(statePath)) {
          privateFile(statePath); const saved = JSON.parse(readFileSync(statePath, 'utf8'));
          if (saved.status === 'staging') requireValue(saved.operationId === operationId && stableJson(saved.request) === stableJson(request), 'staging operation mismatch');
        }
        saveState(statePath, { target: target.name, status: 'staging', operationId, request });
        stageArtifacts(target, artifactDir, operationId, artifacts, disk);
        saveState(statePath, { target: target.name, status: 'unknown', operationId, request });
        const receipt = remoteRequest(target, request);
        requireValue(receipt.status === 'success', 'target operation failed');
        saveState(statePath, { target: target.name, status: 'success', operationId, request, receipt });
        process.stdout.write(JSON.stringify({ target: target.name, ...receipt }) + '\n');
      } catch { failed = true; process.stdout.write(JSON.stringify({ target: target.name, status: 'unknown' }) + '\n'); }
    }
    if (failed) throw new Error('one or more target operations failed or are unknown');
    return;
  }
  requireValue(command === 'validate', `${command} blocked`);
  process.stdout.write(JSON.stringify({ status: 'validated', admissionProbeSha256: createHash('sha256').update(admissionProbe).digest('hex'), note: 'target inventory and loaded image identities are not verified' }) + '\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`release-candidate: ${error.message}\n`); process.exitCode = 1; }
}
