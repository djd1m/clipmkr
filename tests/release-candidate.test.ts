import { describe, expect, it } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { loadCandidateProfile, validateReleaseManifest } from '../scripts/release-candidate.mjs';

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
function manifest() {
  return { commit: revision, ociRevision: revision, sourceSha256: h,
    journal: [{ name: '026_policy.sql', sha256: h }],
    images: { web: { id: `sha256:${h}`, archiveSha256: h, ociRevision: revision },
      worker: { id: `sha256:${h}`, archiveSha256: h, ociRevision: revision } } };
}
function profile() {
  const common = { inputBytes: 1024, storageProductionBucket: 'production', storageProductionEndpoint: 'https://storage.example', dockerPrefix: [] as string[], root: '/srv/candidate', envFile: '/srv/private/env', composeFiles: ['/srv/candidate/compose.yml'],
    resources: { database: 'candidate-db', redis: 'candidate-redis', databaseVolume: 'candidate-db-volume', redisVolume: 'candidate-redis-volume' } };
  return { targets: [ { ...common, name: 'localdevstage', transport: 'local', project: 'local-stage', allowedOrigins: ['http://localhost:4181'] },
    { ...common, name: 'cloud-c', transport: 'ssh', project: 'cloud-stage', allowedOrigins: ['https://c.clipmkr.ru'],
      ssh: { alias: 'cloud-c', knownHosts: '/srv/private/known_hosts', config: '/srv/private/ssh_config', expiresAt: '2999-01-01T00:00:00Z' } } ] };
}
function fixture() {
  const dir = mkdtempSync(join(tmpdir(), 'release-profile-'));
  const path = join(dir, 'profile.json');
  const write = (value: unknown) => writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
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
  const checksum = createHash('sha256').update('archive').digest('hex');
  for (const name of ['web.tar', 'worker.tar']) writeFileSync(join(dir, name), 'archive');
  m.images.web.archiveSha256 = checksum; m.images.worker.archiveSha256 = checksum;
  m.images.web.ociRevision = head; m.images.worker.ociRevision = head;
  return m;
}
describe('release candidate read-only admission', () => {
  it('rejects implicit production and unknown targets', () => {
    const f = fixture();
    try {
      expect(loadCandidateProfile(f.path).targets).toHaveLength(2);
      const p = profile(); p.targets[0]!.name = 'production'; f.write(p);
      expect(() => loadCandidateProfile(f.path)).toThrow();
      p.targets[0]!.name = 'unknown'; f.write(p); expect(() => loadCandidateProfile(f.path)).toThrow();
      p.targets.pop(); f.write(p); expect(() => loadCandidateProfile(f.path)).toThrow();
    } finally { f.close(); }
  });
  it('rejects unsafe private target profiles', () => {
    const f = fixture();
    try {
      chmodSync(f.path, 0o644); expect(() => loadCandidateProfile(f.path)).toThrow();
      chmodSync(f.path, 0o600); const p = profile(); p.targets[0]!.root = '/srv/../production'; f.write(p);
      expect(() => loadCandidateProfile(f.path)).toThrow();
      p.targets[0]!.root = '/srv/candidate'; p.targets[0]!.allowedOrigins = ['https://clipmkr.ru']; f.write(p);
      expect(() => loadCandidateProfile(f.path)).toThrow();
    } finally { f.close(); }
  });
  it('validates full release manifest and artifact identities', () => {
    const m = manifest(); expect(validateReleaseManifest(m)).toBe(true);
    m.images.worker.id = 'sha256:short'; expect(() => validateReleaseManifest(m)).toThrow();
    m.images.worker.id = `sha256:${h}`; m.journal.push(m.journal[0]!); expect(() => validateReleaseManifest(m)).toThrow();
    m.journal.pop(); m.ociRevision = 'c'.repeat(40); expect(() => validateReleaseManifest(m)).toThrow();
  });
  it('prepares one Git archive and image manifests through the process boundary', () => {
    const f = fixture();
    try {
      const commitResult = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' });
      expect(commitResult.status).toBe(0); const head = commitResult.stdout.trim();
      const bin = join(f.dir, 'bin'); mkdirSync(bin);
      const docker = `#!/bin/sh
case "$1" in
  build) exit 0 ;;
  image) if [ "$4" = '{{.Id}}' ]; then printf '%s\\n' 'sha256:${h}'; else printf '%s\\n' '${head}'; fi ;;
  save) printf 'image bytes' > "$3" ;;
  *) exit 1 ;;
esac
`;
      writeFileSync(join(bin, 'docker'), docker, { mode: 0o755 });
      const output = join(f.dir, 'artifacts');
      const result = spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), 'prepare', head, output],
        { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
      expect(result.status, result.stderr).toBe(0);
      const resultManifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
      expect(resultManifest.commit).toBe(head);
      expect(resultManifest.journal.length).toBeGreaterThan(20);
      expect(resultManifest.sourceSha256).toBe(createHash('sha256').update(readFileSync(join(output, 'source.tar'))).digest('hex'));
      expect(resultManifest.images.web.id).toBe(`sha256:${h}`);
      expect(validateReleaseManifest(resultManifest)).toBe(true);
    } finally { f.close(); }
  });
  it('rejects substituted source archives and stale labeled images', () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); const m = artifacts(f.dir);
      writeFileSync(file, JSON.stringify(m));
      const run = () => spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), 'validate', f.path, file], { encoding: 'utf8' });
      expect(run().status).toBe(0);
      writeFileSync(join(f.dir, 'source.tar'), 'substitution'); expect(run().status).not.toBe(0);
      m.sourceSha256 = createHash('sha256').update('substitution').digest('hex'); writeFileSync(file, JSON.stringify(m));
      expect(run().status).not.toBe(0); // Replacing both bytes and claimed checksum cannot forge Git provenance.
      m.images.web.ociRevision = 'c'.repeat(40); expect(() => validateReleaseManifest(m)).toThrow();
    } finally { f.close(); }
  });
  it('detects omitted target and substituted runtime image', () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); const m = artifacts(f.dir);
      writeFileSync(file, JSON.stringify(m));
      const bin = join(f.dir, 'bin'); mkdirSync(bin);
      const known = join(f.dir, 'known_hosts'); writeFileSync(known, 'host key');
      const p = profile(); (p.targets[1] as { ssh: { knownHosts: string; config: string } }).ssh.knownHosts = known;
      (p.targets[1] as { ssh: { knownHosts: string; config: string } }).ssh.config = f.path; f.write(p);
      const identity = { containerId: 'c'.repeat(64), imageId: `sha256:${h}`, startedAt: '2026-01-01T00:00:00Z' };
      const observed = { revision: m.commit, services: Object.fromEntries(['web', 'worker-stt', 'worker-llm', 'worker-video'].map(k => [k, identity])) };
      const script = (v: unknown) => `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(v)}'\n`;
      for (const name of ['python3', 'ssh']) { writeFileSync(join(bin, name), script(observed), { mode: 0o755 }); }
      const run = () => spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), 'inspect', f.path, file], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
      expect(run().status).toBe(0);
      observed.services.web = { ...identity, imageId: `sha256:${'d'.repeat(64)}` };
      writeFileSync(join(bin, 'ssh'), script(observed)); expect(run().status).not.toBe(0);
      p.targets.pop(); f.write(p); expect(run().status).not.toBe(0);
    } finally { f.close(); }
  });
  it('copies a canonical source archive once and verifies the extracted inventory', async () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); const m = artifacts(f.dir); writeFileSync(file, JSON.stringify(m));
      const p = profile();
      (p.targets[0] as typeof p.targets[0] & { sourceDir: string }).sourceDir = join(f.dir, 'source-releases'); f.write(p);
      const run = () => runNode([resolve('scripts/release-candidate.mjs'), 'source-sync', f.path, file, 'localdevstage']);
      const first = await run(); expect(first.status, first.stderr).toBe(0);
      const receipt = JSON.parse(first.stdout); expect(receipt.status).toBe('verified'); expect(receipt.commit).toBe(m.commit);
      const inventory = JSON.parse(readFileSync(join(f.dir, 'source-releases', m.commit, 'inventory.json'), 'utf8'));
      expect(inventory.files['Dockerfile']).toBeDefined();
      const second = await run(); expect(second.status).not.toBe(0);
      expect(readFileSync(join(f.dir, 'source-releases', m.commit, 'tree', 'Dockerfile'), 'utf8').length).toBeGreaterThan(0);
      const bin = join(f.dir, 'ssh-bin'); mkdirSync(bin);
      writeFileSync(join(bin, 'ssh'), '#!/bin/sh\nfor last do :; done\nexec /bin/sh -c "$last"\n', { mode: 0o755 });
      const sshTarget = p.targets[0] as typeof p.targets[0] & { transport: string; sourceDir: string; ssh: { alias: string; config: string; knownHosts: string; expiresAt: string } };
      sshTarget.transport = 'ssh'; sshTarget.sourceDir = join(f.dir, 'ssh-source');
      sshTarget.ssh = { alias: 'fake', config: f.path, knownHosts: f.path, expiresAt: '2999-01-01T00:00:00Z' }; f.write(p);
      const overSsh = await runNode([resolve('scripts/release-candidate.mjs'), 'source-sync', f.path, file, 'localdevstage'],
        { ...process.env, PATH: `${bin}:${process.env.PATH}` });
      expect(overSsh.status, overSsh.stderr).toBe(0);
      expect(JSON.parse(overSsh.stdout).status).toBe('verified');
    } finally { f.close(); }
  }, 60000);
  it('blocks apply when independent evidence is missing', () => {
    // With no independent backup and storage receipts the actual CLI must refuse
    // before any executor is contacted, even with a valid source and profile.
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); writeFileSync(file, JSON.stringify(artifacts(f.dir)));
      const result = spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), 'apply', f.path, file], { encoding: 'utf8' });
      expect(result.status).not.toBe(0); expect(result.stderr).toContain('storage evidence missing');
    } finally { f.close(); }
  });
  it('rejects unverified backup isolation and schema drift', async () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); writeFileSync(file, JSON.stringify(artifacts(f.dir)));
      const p = profile();
      const actions = ['Get', 'Put', 'Delete', 'CreateMultipart', 'UploadPart', 'CompleteMultipart', 'AbortMultipart', 'List'];
      const proofPath = join(f.dir, 'storage.json');
      const proof = { target: 'localdevstage', project: 'local-stage', observedAt: new Date().toISOString(), endpoint: 'https://storage.example', bucket: 'isolated', sourceCredentialsFingerprint: h, canaryNamespace: 'release-canary', canaryShaBefore: h, canaryShaAfter: h,
        operations: ['own', 'production'].flatMap(bucketAlias => actions.map(action => ({ action, bucketAlias, httpStatus: bucketAlias === 'own' ? 200 : 403, s3Code: bucketAlias === 'own' ? '' : 'AccessDenied', bucket: bucketAlias === 'own' ? 'isolated' : 'production', endpoint: 'https://storage.example', objectShaBefore: h, objectShaAfter: h, key: 'release-canary/object', requestId: 'request', bytesSha: h }))) };
      writeFileSync(proofPath, JSON.stringify(proof), { mode: 0o600 });
      const dump = join(f.dir, 'backup.dump'); writeFileSync(dump, 'backup', { mode: 0o600 });
      const digest = createHash('sha256').update('backup').digest('hex');
      const restorePath = join(f.dir, 'restore.json');
      const restored = [{ backup_file: dump, sha256: digest, at_utc: new Date().toISOString(), restore_exit_code: 0, account_rows_sha256: h, account_columns: ['id'], schema_journal: [{ name: '026_policy.sql', sha256: h }] }];
      writeFileSync(restorePath, JSON.stringify(restored), { mode: 0o600 });
      const backupPath = join(f.dir, 'binding.json');
      const binding = { target: 'localdevstage', project: 'local-stage', observedAt: new Date().toISOString(), backupPath: dump, restoreReceiptPath: restorePath, sha256: digest,
        sourceIdentity: { composeProject: 'local-stage', databaseContainerId: 'c'.repeat(64), databaseVolume: 'candidate-db-volume', postgresSystemIdentifier: '123', databaseName: 'n5', databaseOid: '123', timezone: 'UTC' } };
      writeFileSync(backupPath, JSON.stringify(binding), { mode: 0o600 });
      p.targets[0]!.root = f.dir; p.targets[1]!.root = f.dir;
      const target = p.targets[0]! as typeof p.targets[0] & { storageEvidencePath: string; backupEvidencePath: string };
      target.storageEvidencePath = proofPath; target.backupEvidencePath = backupPath; f.write(p);
      const run = () => runNode([resolve('scripts/release-candidate.mjs'), 'apply', f.path, file]);
      expect((await run()).stderr).toContain('storage evidence missing'); // second target remains blocked
      proof.operations.find(op => op.bucketAlias === 'production')!.s3Code = 'InvalidAccessKeyId';
      writeFileSync(proofPath, JSON.stringify(proof)); expect((await run()).stderr).toContain('production scope not denied');
      proof.operations.find(op => op.bucketAlias === 'production')!.s3Code = 'AccessDenied'; writeFileSync(proofPath, JSON.stringify(proof));
      restored[0]!.schema_journal[0]!.sha256 = 'broken'; writeFileSync(restorePath, JSON.stringify(restored));
      expect((await run()).stderr).toContain('invalid restore journal');
      restored[0]!.schema_journal[0]!.sha256 = h; writeFileSync(restorePath, JSON.stringify(restored));
      const cloudProofPath = join(f.dir, 'cloud-storage.json');
      writeFileSync(cloudProofPath, JSON.stringify({ ...proof, target: 'cloud-c', project: 'cloud-stage' }), { mode: 0o600 });
      const cloudBindingPath = join(f.dir, 'cloud-binding.json');
      const cloudIdentity = { ...binding.sourceIdentity, composeProject: 'cloud-stage' };
      writeFileSync(cloudBindingPath, JSON.stringify({ ...binding, target: 'cloud-c', project: 'cloud-stage', sourceIdentity: cloudIdentity }), { mode: 0o600 });
      const cloud = p.targets[1]! as typeof p.targets[1] & { storageEvidencePath: string; backupEvidencePath: string; ssh: { config: string; knownHosts: string } };
      cloud.storageEvidencePath = cloudProofPath; cloud.backupEvidencePath = cloudBindingPath; cloud.ssh.config = f.path; cloud.ssh.knownHosts = f.path; f.write(p);
      const bin = join(f.dir, 'fake-bin'); mkdirSync(bin);
      const output = (identity: typeof binding.sourceIdentity) => ({ ...identity, journal: restored[0]!.schema_journal,
        accountRowsSha256: h, storageFingerprint: h, storageEndpoint: proof.endpoint, storageBucket: proof.bucket });
      const fake = (value: unknown) => `#!/bin/sh\nprintf '%s\\n' '${JSON.stringify(value)}'\n`;
      writeFileSync(join(bin, 'python3'), fake(output(binding.sourceIdentity)), { mode: 0o755 });
      writeFileSync(join(bin, 'ssh'), fake(output(cloudIdentity)), { mode: 0o755 });
      const boundary = (fault = '') => runNode([resolve('scripts/release-candidate.mjs'), 'apply', f.path, file],
        { ...process.env, FAKE_FAULT: fault, PATH: `${bin}:${process.env.PATH}` });
      expect((await boundary()).stderr).toContain('runtime evidence and reconciliation are not implemented');
      writeFileSync(join(bin, 'python3'), fake({ ...output(binding.sourceIdentity), accountRowsSha256: 'd'.repeat(64) }));
      expect((await boundary()).stderr).toContain('live database baseline drift');
      // Execute the embedded Python against a fake Docker process, including the
      // effective Compose environment and real Python account JSON hashing.
      const storage = { endpoint: proof.endpoint, publicEndpoint: 'https://public.example', region: 'region', bucket: proof.bucket, accessKeyId: 'key', secretAccessKey: 'secret' };
      const fingerprint = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(storage).sort(([a], [b]) => a.localeCompare(b))))).digest('hex');
      proof.sourceCredentialsFingerprint = fingerprint; writeFileSync(proofPath, JSON.stringify(proof));
      writeFileSync(cloudProofPath, JSON.stringify({ ...proof, target: 'cloud-c', project: 'cloud-stage' }));
      restored[0]!.account_rows_sha256 = createHash('sha256').update('[]').digest('hex'); writeFileSync(restorePath, JSON.stringify(restored));
      const envs = { N5_PUBLIC_ORIGIN: 'http://localhost:4181', N5_LIMIT_GLOBAL_MINUTES: '240', N5_LIMIT_USER_MINUTES: '240', N5_LIMIT_PAID_USER_MINUTES: '240', N5_LIMIT_GLOBAL_LLM: '4', N5_LIMIT_USER_LLM: '4', S3_ENDPOINT: storage.endpoint, S3_PUBLIC_ENDPOINT: storage.publicEndpoint, S3_REGION: storage.region, S3_BUCKET: storage.bucket, S3_ACCESS_KEY: storage.accessKeyId, S3_SECRET_KEY: storage.secretAccessKey };
      const config = { services: { web: { environment: envs, mem_limit: '1g' }, 'worker-stt': { environment: envs, mem_limit: '1g' }, 'worker-video': { environment: envs, mem_limit: '1g' }, 'worker-llm': { environment: { N5_LIMIT_GLOBAL_MINUTES: '240', N5_LIMIT_USER_MINUTES: '240', N5_LIMIT_PAID_USER_MINUTES: '240', N5_LIMIT_GLOBAL_LLM: '4', N5_LIMIT_USER_LLM: '4' }, mem_limit: '1g' }, db: { mem_limit: '1g' }, redis: { mem_limit: '1g' } } };
      const inspect = [{ Id: 'c'.repeat(64), State: { Running: true }, Config: { Labels: { 'com.docker.compose.project': 'PROJECT', 'com.docker.compose.service': 'db' } }, Mounts: [{ Type: 'volume', Destination: '/var/lib/postgresql/data', Name: 'candidate-db-volume' }] }];
      const info = { postgresSystemIdentifier: '123', databaseName: 'n5', databaseOid: '123', timezone: 'UTC', journal: restored[0]!.schema_journal };
      const docker = `#!/usr/bin/python3
import json,os,sys
args=sys.argv[1:]
if args[0]=='compose' and 'config' in args:
 data=json.loads(${JSON.stringify(JSON.stringify(config))}); data['services']['web']['environment']['N5_PUBLIC_ORIGIN']='https://c.clipmkr.ru' if os.environ.get('FAKE_PROJECT')=='cloud-stage' else 'http://localhost:4181';
 if os.environ.get('FAKE_FAULT')=='memory': data['services']['worker-video']['mem_limit']='0'
 if os.environ.get('FAKE_FAULT')=='quota': data['services']['web']['environment']['N5_LIMIT_GLOBAL_LLM']='99'
 print(json.dumps(data))
elif args[0]=='compose' and 'ps' in args: print('dbid')
elif args[0]=='inspect':
 data=json.loads(${JSON.stringify(JSON.stringify(inspect))}); data[0]['Config']['Labels']['com.docker.compose.project']=os.environ.get('FAKE_PROJECT','local-stage'); print(json.dumps(data))
elif args[0]=='exec':
 query=sys.stdin.read(); admission={'storageReferences':1 if os.environ.get('FAKE_FAULT')=='references' else 0,'activeMedia':0,'globalMinutes':0,'globalLlm':4 if os.environ.get('FAKE_FAULT')=='exhausted' else 0}; print(${JSON.stringify(JSON.stringify(info))} if 'pg_control_system' in query else (json.dumps(admission) if 'storageReferences' in query else '[]'))
else: sys.exit(1)
`;
      writeFileSync(join(bin, 'docker'), docker, { mode: 0o755 });
      writeFileSync(join(bin, 'python3'), '#!/bin/sh\nexec /usr/bin/python3 "$@"\n', { mode: 0o755 });
      writeFileSync(join(bin, 'ssh'), '#!/bin/sh\nfor last do :; done\nFAKE_PROJECT=cloud-stage exec /bin/sh -c "$last"\n', { mode: 0o755 });
      expect((await boundary()).stderr).toContain('runtime evidence and reconciliation are not implemented');
      for (const fault of ['memory', 'quota', 'references', 'exhausted']) {
        const result = await boundary(fault); expect(result.status).not.toBe(0); expect(result.stderr).toContain('python3 failed');
      }
    } finally { f.close(); }
  }, 60000);
  it('blocks all changes even when profile and manifest syntax are valid', () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json');
      const m = artifacts(f.dir);
      writeFileSync(file, JSON.stringify(m));
      for (const cmd of ['apply', 'reconcile', 'rollback']) {
        const result = spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), cmd, f.path, file], { encoding: 'utf8' });
        expect(result.status).not.toBe(0); expect(result.stderr).toContain('blocked');
      }
    } finally { f.close(); }
  });
});
