import { runInNewContext } from 'node:vm';
import * as fs from 'node:fs';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, normalize, resolve, sep } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function runNode(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, args, { env });
    let stdout = ''; let stderr = '';
    child.stdout.setEncoding('utf8'); child.stdout.on('data', data => { stdout += data; });
    child.stderr.setEncoding('utf8'); child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject); child.on('close', status => resolveResult({ status, stdout, stderr }));
  });
}
const h = 'a'.repeat(64);
const revision = 'b'.repeat(40);
const dataTables = ['account','session','video','transcript','clip','clip_link','partner','partner_code','guest_pack','guest_pack_clip','growth_event','attribution','quota_counter','pro_interest','job_attempt','payment_intent','payment_event','payment','operator_action','credit_grant','video_credit_charge','credit_allocation','support_email_token','support_mail_admission','support_operator','support_audit'];

function manifest() {
  return { commit: revision, ociRevision: revision, sourceSha256: h,
    journal: [{ name: '026_policy.sql', sha256: h }],
    images: { web: { id: `sha256:${h}`, archiveSha256: h, ociRevision: revision },
      worker: { id: `sha256:${h}`, archiveSha256: h, ociRevision: revision } } };
}
function profile() {
  const common = { inputBytes: 1024, storageBucket: 'shared-bucket', databaseProject: 'infra-stage', redisProject: 'infra-stage', binding: { databaseName: 'n5_test', databaseHost: 'test-db', redisHost: 'test-redis', network: 'test-network' }, dockerPrefix: [] as string[], root: '/srv/candidate', envFile: '/srv/private/env', composeFiles: ['/srv/candidate/compose.yml'],
    resources: { database: 'c'.repeat(64), redis: 'd'.repeat(64), databaseVolume: 'candidate-db-volume', redisVolume: 'candidate-redis-volume' } };
  return { targets: [ { ...common, name: 'site-test', storagePrefix: 'tests/site/', transport: 'ssh', project: 'local-stage', ssh: { alias: 'fake-site', knownHosts: '/srv/private/known_hosts', config: '/srv/private/ssh_config', expiresAt: '2999-01-01T00:00:00Z' }, allowedOrigins: ['http://localhost:4181'] },
    { ...common, name: 'cloud-c', storagePrefix: 'tests/cloud/', transport: 'ssh', project: 'cloud-stage', allowedOrigins: ['https://c.clipmkr.ru'],
      ssh: { alias: 'cloud-c', knownHosts: '/srv/private/known_hosts', config: '/srv/private/ssh_config', expiresAt: '2999-01-01T00:00:00Z' } } ] };
}
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'release-profile-'));
  const path = join(dir, 'profile.json');
  const write = (value: unknown) => {
    const copy = structuredClone(value) as { targets?: Array<{ ssh?: { config: string; knownHosts: string } }> };
    for (const target of copy.targets ?? []) if (target.ssh) {
      if (target.ssh.config === '/srv/private/ssh_config') target.ssh.config = path;
      if (target.ssh.knownHosts === '/srv/private/known_hosts') target.ssh.knownHosts = path;
    }
    writeFileSync(path, JSON.stringify(copy), { mode: 0o600 });
  };
  write(profile());
  return { dir, path, write, close: () => rmSync(dir, { recursive: true, force: true }) };
}
function artifacts(dir: string) {
  const git = (args: string[]) => {
    const result = spawnSync('git', args, { encoding: 'utf8' });
    if (result.status !== 0) throw new Error('git failed');
    return result.stdout.trim();
  };
  const head = git(['rev-parse', 'HEAD']);
  const source = join(dir, 'source.tar');
  git(['archive', '--format=tar', `--output=${source}`, head]);
  const migrations = git(['ls-tree', '-r', '--name-only', head, 'packages/db/migrations']).split('\n');
  const journal = migrations.map(path => {
    const content = spawnSync('git', ['show', `${head}:${path}`]).stdout;
    return { name: path.split('/').pop()!, sha256: createHash('sha256').update(content).digest('hex') };
  });
  const m = manifest(); m.commit = head; m.ociRevision = head; m.journal = journal;
  m.sourceSha256 = createHash('sha256').update(readFileSync(source)).digest('hex');
  const imageFixture = String.raw`
import gzip,hashlib,io,json,os,sys,tarfile
H=lambda b:hashlib.sha256(b).hexdigest()
def add(t,n,b):
 x=tarfile.TarInfo(n);x.size=len(b);t.addfile(x,io.BytesIO(b))
for name in ('web','worker'):
 stream=io.BytesIO()
 with tarfile.open(fileobj=stream,mode='w') as t:add(t,'file',name.encode())
 layer=stream.getvalue();packed=gzip.compress(layer,mtime=0)
 config=json.dumps({'name':name,'rootfs':{'type':'layers','diff_ids':['sha256:'+H(layer)]}}).encode()
 manifest=json.dumps([{'Config':'blobs/sha256/'+H(config),'Layers':['blobs/sha256/'+H(packed)]}]).encode()
 path=os.path.join(sys.argv[1],name+'.tar')
 with tarfile.open(path,'w') as t:
  for n,b in [('manifest.json',manifest),('blobs/sha256/'+H(config),config),('blobs/sha256/'+H(packed),packed)]:add(t,n,b)
 print(name,'sha256:'+H(config),H(open(path,'rb').read()))
`;
  const images = spawnSync('python3', ['-c', imageFixture, dir], { encoding: 'utf8' });
  if (images.status !== 0) throw new Error(images.stderr);
  for (const line of images.stdout.trim().split('\n')) {
    const [key, imageId, checksum] = line.split(' ');
    m.images[key as 'web' | 'worker'].id = imageId!;
    m.images[key as 'web' | 'worker'].archiveSha256 = checksum!;
  }
  m.images.web.ociRevision = head; m.images.worker.ociRevision = head;
  return m;
}
function previousSet(dir: string, manifestPath: string) {
  const path = join(dir, 'previous.json');
  writeFileSync(path, JSON.stringify({ 'site-test': manifestPath, 'cloud-c': manifestPath }), { mode: 0o600 });
  return path;
}
function dataValidators() {
  const source = readFileSync('scripts/release-candidate.mjs', 'utf8');
  const shared = source.slice(source.indexOf('function requireValue('), source.indexOf('export function loadCandidateProfile('));
  const receipt = source.slice(source.indexOf('function checkDataReceipt('), source.indexOf('// Read-only target inventory.'));
  const compare = source.slice(source.indexOf('function compareAdmission('), source.indexOf('const remoteExecutor ='));
  const digest = (value: string | Buffer) => createHash('sha256').update(value).digest('hex');
  return runInNewContext(`${shared}\n${receipt}\n${compare}\n({checkDataReceipt, compareAdmission, stableJson})`, {
    lstatSync: fs.lstatSync, realpathSync: fs.realpathSync, readFileSync, dirname, isAbsolute, normalize, sep,
    repo: resolve('.'), process, sha: /^[a-f0-9]{64}$/, createHash, hashFile: (path: string) => digest(readFileSync(path)), Date,
  });
}
function multipartScan(prefix: string, fingerprint: string) {
  return { bucket: 'shared-bucket', storageFingerprint: fingerprint, observedAt: new Date().toISOString(), scopes: [{ prefix, pages: [{ requestId: 'request', httpStatus: 200, isTruncated: false, keyMarker: null, nextKeyMarker: null, uploads: [] }] }] };
}
function storageFixture(dir: string, target: string, project: string, commit: string, prefix: string, fingerprint: string) {
  const rawPath = join(dir, target + '-raw.json'), unitPath = join(dir, target + '-unit.json'), integrationPath = join(dir, target + '-integration.json');
  const names = ['validates prefix and checkout config without changing production S3 config shape', 'prefixes all object commands before serialization and signing, path style true', 'prefixes all object commands before serialization and signing, path style false', 'translates list paths and opaque markers and strips only matching returned keys', 'rejects malformed paths, bucket mismatch, unsupported commands and foreign responses without escaping namespace', 'validates multipart response keys and forbids foreign markers and presigned keys', 'blocks live test transport outside its independent run scope', 'preserves unrestricted production behavior when namespace is empty'];
  const report = (titles: string[]) => ({ success: true, testResults: [{ assertionResults: titles.map(fullName => ({ fullName, status: 'passed' })) }] });
  writeFileSync(unitPath, JSON.stringify(report(names.map(name => 'S3 namespace ' + name))), { mode: 0o600 });
  writeFileSync(integrationPath, JSON.stringify(report(['S3 namespace integration isolates two namespaces on real S3 and preserves outside canary bytes'])), { mode: 0o600 });
  const commands = { site: ['PutObjectCommand','GetObjectCommand','DeleteObjectCommand','ListObjectsV2Command'], cloud: ['PutObjectCommand','DeleteObjectCommand','CreateMultipartUploadCommand','CompleteMultipartUploadCommand','AbortMultipartUploadCommand','ListObjectsV2Command','ListObjectsV2Command','ListMultipartUploadsCommand','ListPartsCommand'] };
  const sdkRequests = Object.entries(commands).flatMap(([owner, list]) => list.map(command => ({ owner, command, httpStatus: 200, requestId: 'request', path: `/tests/${owner}/canary`, prefix: null, keyMarker: command === 'ListMultipartUploadsCommand' ? 'tests/cloud/canary' : null })));
  const raw = { cleanupComplete: true, unknownMultipartKeys: [], canaryBeforeSha256: h, canaryAfterSha256: h, sdkRequests, signedHttp: ['UploadPart','GetObject'].map(operation => ({ operation, httpStatus: 200, requestId: 'request', key: 'tests/cloud/canary', bytesSha: h })) };
  writeFileSync(rawPath, JSON.stringify(raw), { mode: 0o600 });
  const digest = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
  const proof = { target, project, commit, observedAt: new Date().toISOString(), endpoint: 'https://storage.example', bucket: 'shared-bucket', prefix, sourceCredentialsFingerprint: fingerprint,
    rawReceiptPath: rawPath, rawReceiptSha256: digest(rawPath), unitReportPath: unitPath, unitReportSha256: digest(unitPath), integrationReportPath: integrationPath, integrationReportSha256: digest(integrationPath),
    sdkSourceSha256: digest('packages/s3/src/client.ts'), unitSourceSha256: digest('tests/storage-prefix.test.ts'), integrationSourceSha256: digest('tests/storage-prefix.integration.test.ts'), fixtureSourceSha256: digest('tests/fixtures/environment.ts') };
  const proofPath = join(dir, target + '-storage.json');
  const save = () => writeFileSync(proofPath, JSON.stringify(proof), { mode: 0o600 }); save();
  return { proof, raw, proofPath, rawPath, save, digest };
}
function fakeGit(bin: string) {
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'git'), `#!/bin/sh\nif [ "$1" = show ]; then case "$2" in *:packages/s3/src/client.ts) cat ${resolve('packages/s3/src/client.ts')} ; exit;; *:tests/storage-prefix.test.ts) cat ${resolve('tests/storage-prefix.test.ts')} ; exit;; *:tests/storage-prefix.integration.test.ts) cat ${resolve('tests/storage-prefix.integration.test.ts')} ; exit;; *:tests/fixtures/environment.ts) cat ${resolve('tests/fixtures/environment.ts')} ; exit;; esac; fi\nexec /usr/bin/git "$@"\n`, { mode: 0o755 });
}
export const releaseCandidateFixture = { h, revision, dataTables, runNode, manifest, profile, fixture, artifacts, previousSet, dataValidators, multipartScan, storageFixture, fakeGit };
