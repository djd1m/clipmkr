#!/usr/bin/env node
// Read-only release admission. Mutating operations remain blocked until all evidence
// and remote reconciliation are implemented and independently verified.
import { lstatSync, readFileSync, realpathSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const targets = ['localdevstage', 'cloud-c'];
const sha = /^[a-f0-9]{64}$/;
const commit = /^[a-f0-9]{40}$/;
const id = /^sha256:[a-f0-9]{64}$/;
const name = /^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/;
function requireValue(ok, message) { if (!ok) throw new Error(message); }
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
    requireValue(typeof target.project === 'string' && name.test(target.project) && !/^(n5|production|prod)$/i.test(target.project), 'invalid project identity');
    requireValue(['local', 'ssh'].includes(target.transport), 'explicit transport required');
    requireValue(Array.isArray(target.dockerPrefix) && (target.dockerPrefix.length === 0 || JSON.stringify(target.dockerPrefix) === '["sudo","-n"]'), 'invalid Docker execution prefix');
    requireValue(['root', 'envFile'].every(k => absolutePath(target[k])) && Array.isArray(target.composeFiles) && target.composeFiles.length > 0 && target.composeFiles.every(absolutePath) && new Set(target.composeFiles).size === target.composeFiles.length, 'invalid target paths');
    requireValue(Array.isArray(target.allowedOrigins) && target.allowedOrigins.length > 0 && target.allowedOrigins.every(origin => {
      try { const u = new URL(origin); return u.origin === origin && ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && u.hostname !== 'clipmkr.ru' && u.hostname !== 'www.clipmkr.ru'; } catch { return false; }
    }), 'invalid origins');
    if (target.name === 'cloud-c') {
      requireValue(target.allowedOrigins.length === 1 && target.allowedOrigins[0] === 'https://c.clipmkr.ru', 'incorrect Cloud origin');
    }
    if (target.transport === 'ssh') {
      requireValue(target.ssh && name.test(target.ssh.alias || '') && absolutePath(target.ssh.knownHosts) && absolutePath(target.ssh.config) && typeof target.ssh.expiresAt === 'string' && Number.isFinite(Date.parse(target.ssh.expiresAt)) && Date.parse(target.ssh.expiresAt) > Date.now(), 'invalid or expired SSH configuration');
    }
    requireValue(target.resources && ['database', 'redis', 'databaseVolume', 'redisVolume'].every(k => typeof target.resources[k] === 'string' && name.test(target.resources[k])), 'missing resource identities');
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
if p['name']=='localdevstage':
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
  if (target.transport === 'local') {
    output = run('python3', ['-c', probe, data], { timeout: 60000 });
  } else {
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
const sourceReceiver = `
import hashlib,json,os,stat,sys,tarfile
p=json.loads(__import__('base64').b64decode(sys.argv[1]))
def need(ok):
    if not ok: raise ValueError('source admission')
base=p['sourceDir']; root=p['root']; rev=p['commit']
need(os.path.isabs(base) and os.path.normpath(base)==base and os.path.commonpath([base,root])!=root)
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
function syncSource(target, manifest, archive) {
  requireValue(absolutePath(target.sourceDir), 'invalid source destination');
  requireValue(target.sourceDir !== target.root && !target.sourceDir.startsWith(target.root + sep) && !target.root.startsWith(target.sourceDir + sep), 'source destination overlaps app root');
  const data = Buffer.from(JSON.stringify({ sourceDir: target.sourceDir, root: target.root, commit: manifest.commit, sourceSha256: manifest.sourceSha256 })).toString('base64');
  let binary = 'python3'; let args = ['-c', sourceReceiver, data];
  if (target.transport === 'ssh') {
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
// Private evidence schema: target, project, observedAt, endpoint, bucket,
// sourceCredentialsFingerprint, canaryNamespace, canaryShaBefore/canaryShaAfter,
// and raw operations [{action,bucketAlias,httpStatus,s3Code,requestId,bytesSha}].
// A receipt is evidence only when bound to the effective Compose fingerprint.
function checkStorageReceipt(path, target) {
  privateFile(path);
  const proof = JSON.parse(readFileSync(path, 'utf8'));
  requireValue(proof.target === target.name && proof.project === target.project, 'storage evidence target mismatch');
  const observed = Date.parse(proof.observedAt);
  requireValue(Number.isFinite(observed) && observed <= Date.now() && Date.now() - observed <= 2 * 60 * 60 * 1000, 'storage evidence expired');
  requireValue(typeof proof.endpoint === 'string' && typeof proof.bucket === 'string' && proof.bucket.length > 0 &&
    typeof proof.canaryNamespace === 'string' && /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(proof.canaryNamespace) && typeof target.storageProductionBucket === 'string' && target.storageProductionBucket.length > 0 && typeof target.storageProductionEndpoint === 'string' && target.storageProductionEndpoint.length > 0 && proof.bucket !== target.storageProductionBucket && sha.test(proof.sourceCredentialsFingerprint || '') &&
    sha.test(proof.canaryShaBefore || '') && proof.canaryShaBefore === proof.canaryShaAfter, 'storage canary evidence incomplete');
  const actions = ['Get', 'Put', 'Delete', 'CreateMultipart', 'UploadPart', 'CompleteMultipart', 'AbortMultipart', 'List'];
  requireValue(Array.isArray(proof.operations) && proof.operations.length === actions.length * 2, 'storage operations incomplete');
  for (const bucketAlias of ['own', 'production']) for (const action of actions) {
    const matches = proof.operations.filter(op => op && op.action === action && op.bucketAlias === bucketAlias);
    requireValue(matches.length === 1, 'storage operation missing or duplicated');
    const op = matches[0];
    requireValue(typeof op.requestId === 'string' && op.requestId.trim().length > 0, 'missing storage request identity');
    requireValue(typeof op.key === 'string' && (op.key === proof.canaryNamespace || op.key.startsWith(proof.canaryNamespace + '/')) && !op.key.split('/').includes('..'), 'operation outside canary namespace');
    if (bucketAlias === 'production') {
      requireValue(op.bucket === target.storageProductionBucket && op.endpoint === target.storageProductionEndpoint, 'production storage identity mismatch');
      requireValue(op.objectShaBefore === proof.canaryShaBefore && op.objectShaAfter === proof.canaryShaAfter, 'production canary changed');
      requireValue(op.httpStatus === 403 && op.s3Code === 'AccessDenied', 'production scope not denied');
    } else {
      requireValue(op.bucket === proof.bucket && op.endpoint === proof.endpoint, 'own storage identity mismatch');
      requireValue(Number.isInteger(op.httpStatus) && op.httpStatus >= 200 && op.httpStatus < 300, 'own canary operation failed');
      if (action === 'Get' || action === 'Put' || action === 'UploadPart') requireValue(sha.test(op.bytesSha || ''), 'own canary content hash missing');
    }
  }
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
  requireValue(identity && identity.composeProject === target.project &&
    /^[a-f0-9]{64}$/.test(identity.databaseContainerId || '') &&
    identity.databaseVolume === target.resources.databaseVolume &&
    /^\d+$/.test(String(identity.postgresSystemIdentifier || '')) &&
    typeof identity.databaseName === 'string' && name.test(identity.databaseName) &&
    /^\d+$/.test(String(identity.databaseOid || '')) && typeof identity.timezone === 'string' && identity.timezone.length > 0,
    'backup source identity incomplete');
  return { binding, restored };
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
for service in ['web','worker-stt','worker-llm','worker-video','db','redis']:
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
keys=['S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_ACCESS_KEY','S3_SECRET_KEY']
if any(not isinstance(web.get(k),str) or not web[k] for k in keys+['S3_PUBLIC_ENDPOINT']): raise RuntimeError('missing storage configuration')
for service in ['worker-stt','worker-video']:
    env=config['services'][service]['environment']
    if any(env.get(k)!=web[k] for k in keys): raise RuntimeError('inconsistent storage configuration')
llm=config['services']['worker-llm']['environment']
if any(k in llm for k in keys) and any(llm.get(k)!=web[k] for k in keys): raise RuntimeError('inconsistent optional storage configuration')
s3={'endpoint':web['S3_ENDPOINT'],'publicEndpoint':web['S3_PUBLIC_ENDPOINT'],'region':web['S3_REGION'],'bucket':web['S3_BUCKET'],'accessKeyId':web['S3_ACCESS_KEY'],'secretAccessKey':web['S3_SECRET_KEY']}
fingerprint=hashlib.sha256(json.dumps(s3,sort_keys=True,separators=(',',':')).encode()).hexdigest()
ids=run(base+['ps','--all','-q','db']).splitlines()
if len(ids)!=1: raise RuntimeError('db service count')
db=json.loads(run(docker+['inspect',ids[0]]))[0]
if not db['State']['Running'] or db['Config']['Labels'].get('com.docker.compose.project')!=p['project'] or db['Config']['Labels'].get('com.docker.compose.service')!='db': raise RuntimeError('db identity')
volumes=[m.get('Name') for m in db['Mounts'] if m.get('Type')=='volume' and m.get('Destination')=='/var/lib/postgresql/data']
if len(volumes)!=1: raise RuntimeError('database volume')
def sql(query):
    return run(docker+['exec','-i',ids[0],'sh','-c','exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -X -A -t -q -v ON_ERROR_STOP=1'],query+';\\n')
query="SELECT json_build_object('postgresSystemIdentifier',(SELECT system_identifier::text FROM pg_control_system()),'databaseName',current_database(),'databaseOid',(SELECT oid::text FROM pg_database WHERE datname=current_database()),'timezone',current_setting('TimeZone'),'journal',(SELECT coalesce(json_agg(json_build_object('name',name,'sha256',sha256) ORDER BY name),'[]'::json) FROM _schema_migration))"
info=json.loads(sql(query))
admission=json.loads(sql("SELECT json_build_object('storageReferences',(SELECT count(*) FROM video WHERE object_key IS NOT NULL OR upload_id IS NOT NULL OR source_url IS NOT NULL)+(SELECT count(*) FROM clip WHERE object_key IS NOT NULL OR thumbnail_key IS NOT NULL),'activeMedia',(SELECT count(*) FROM video WHERE status IN ('uploading','queued','transcribing','selecting','rendering') AND deleted_at IS NULL),'globalMinutes',coalesce((SELECT used FROM quota_counter WHERE scope='global_minutes' AND scope_key='all' AND day=(now() AT TIME ZONE 'Europe/Moscow')::date),0),'globalLlm',coalesce((SELECT used FROM quota_counter WHERE scope='global_llm' AND scope_key='all' AND day=(now() AT TIME ZONE 'Europe/Moscow')::date),0))"))
if admission['storageReferences']!=0 or admission['activeMedia']!=0: raise RuntimeError('existing storage references or active media')
if admission['globalMinutes']>=240 or admission['globalLlm']>=4: raise RuntimeError('quota exhausted')
columns=p['accountColumns']
if not columns or 'id' not in columns or any(not re.fullmatch('[a-z_][a-z0-9_]*',c) for c in columns): raise RuntimeError('account columns')
col=','.join('"'+c+'"' for c in columns)
rows=json.loads(sql("SELECT coalesce(json_agg(to_jsonb(a) ORDER BY id),'[]'::json) FROM (SELECT "+col+" FROM account) a"))
info.update({'databaseContainerId':db['Id'],'databaseVolume':volumes[0], 'composeProject':p['project'],'accountRowsSha256':hashlib.sha256(json.dumps(rows,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'storageFingerprint':fingerprint,'storageEndpoint':s3['endpoint'],'storageBucket':s3['bucket']})
print(json.dumps(info))
`;
function observeAdmission(target, restored) {
  const data = Buffer.from(JSON.stringify({ root: target.root, project: target.project, envFile: target.envFile,
    composeFiles: target.composeFiles, dockerPrefix: target.dockerPrefix, accountColumns: restored.account_columns,
    origin: target.allowedOrigins[0], inputBytes: target.inputBytes })).toString('base64');
  let output;
  if (target.transport === 'local') output = run('python3', ['-c', admissionProbe, data], { timeout: 60000 });
  else {
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
function compareAdmission(target, storage, backup, observed) {
  const identity = backup.binding.sourceIdentity;
  for (const key of ['composeProject', 'databaseContainerId', 'databaseVolume', 'postgresSystemIdentifier', 'databaseName', 'databaseOid', 'timezone']) {
    requireValue(observed[key] === identity[key], 'live database identity differs from backup');
  }
  requireValue(observed.accountRowsSha256 === backup.restored.account_rows_sha256 &&
    JSON.stringify(observed.journal) === JSON.stringify(backup.restored.schema_journal), 'live database baseline drift');
  requireValue(observed.storageFingerprint === storage.sourceCredentialsFingerprint && observed.storageEndpoint === storage.endpoint &&
    observed.storageBucket === storage.bucket, 'storage evidence does not match effective Compose');
}
function main(args) {
  const [command, profilePath, manifestPath, ...extra] = args;
  if (command === 'prepare') {
    requireValue(!extra.length, 'usage: prepare <full-sha> <new-output-directory>');
    prepare(profilePath, manifestPath);
    process.stdout.write('Release artifacts prepared.\n');
    return;
  }
  requireValue((command === 'source-sync' ? extra.length === 1 : !extra.length) && ['validate', 'inspect', 'source-sync', 'apply', 'reconcile', 'rollback'].includes(command), 'usage: release-candidate.mjs validate <profile> <manifest>');
  requireValue(profilePath && manifestPath, 'explicit profile and manifest required');
  const profile = loadCandidateProfile(profilePath);
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  validateReleaseManifest(manifest);
  const artifactDir = dirname(resolve(manifestPath));
  verifySource(manifest, join(artifactDir, 'source.tar'));
  if (command === 'source-sync') {
    const selected = profile.targets.find(t => t.name === extra[0]);
    requireValue(selected, 'explicit known source target required');
    process.stdout.write(JSON.stringify({ target: selected.name, ...syncSource(selected, manifest, join(artifactDir, 'source.tar')) }) + '\n');
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
  if (command === 'apply') {
    const proofs = profile.targets.map(target => {
      requireValue(target.storageEvidencePath, 'apply blocked: storage evidence missing');
      requireValue(Number.isSafeInteger(target.inputBytes) && target.inputBytes > 0, 'apply blocked: input bytes missing');
      const storage = checkStorageReceipt(target.storageEvidencePath, target);
      requireValue(target.backupEvidencePath, 'apply blocked: backup evidence missing');
      const backup = checkBackupReceipt(target.backupEvidencePath, target);
      return { target, storage, backup };
    });
    for (const { target, storage, backup } of proofs) {
      compareAdmission(target, storage, backup, observeAdmission(target, backup.restored));
    }
  }
  if (command !== 'validate') throw new Error(`${command} blocked: runtime evidence and reconciliation are not implemented`);
  process.stdout.write('Profile and artifact checksums accepted; target inventory and loaded image identities have not been verified.\n');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) { process.stderr.write(`release-candidate: ${error.message}\n`); process.exitCode = 1; }
}
