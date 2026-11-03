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
  const checksum = createHash('sha256').update('archive').digest('hex');
  for (const name of ['web.tar', 'worker.tar']) writeFileSync(join(dir, name), 'archive');
  m.images.web.archiveSha256 = checksum; m.images.worker.archiveSha256 = checksum;
  m.images.web.ociRevision = head; m.images.worker.ociRevision = head;
  return m;
}
function previousSet(dir: string, manifestPath: string) {
  const path = join(dir, 'previous.json');
  writeFileSync(path, JSON.stringify({ 'site-test': manifestPath, 'cloud-c': manifestPath }), { mode: 0o600 });
  return path;
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
  it('uses SSH for cloud-c and site-test and rejects localdevstage', () => {
    const f = fixture();
    try {
      const p = profile(); expect(loadCandidateProfile(f.path).targets.map((t: { transport: string }) => t.transport)).toEqual(['ssh', 'ssh']);
      p.targets[0]!.transport = 'local'; f.write(p); expect(() => loadCandidateProfile(f.path)).toThrow();
      p.targets[0]!.transport = 'ssh'; p.targets[0]!.name = 'localdevstage'; f.write(p);
      expect(() => loadCandidateProfile(f.path)).toThrow();
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
      const bin = join(f.dir, 'ssh-bin'); mkdirSync(bin);
      writeFileSync(join(bin, 'ssh'), '#!/bin/sh\nfor last do :; done\nexec /bin/sh -c "$last"\n', { mode: 0o755 });
      const p = profile();
      (p.targets[0] as typeof p.targets[0] & { sourceDir: string }).sourceDir = join(f.dir, 'source-releases'); f.write(p);
      const run = () => runNode([resolve('scripts/release-candidate.mjs'), 'source-sync', f.path, file, 'site-test'], { ...process.env, PATH: `${bin}:${process.env.PATH}` });
      const first = await run(); expect(first.status, first.stderr).toBe(0);
      const receipt = JSON.parse(first.stdout); expect(receipt.status).toBe('verified'); expect(receipt.commit).toBe(m.commit);
      const inventory = JSON.parse(readFileSync(join(f.dir, 'source-releases', m.commit, 'inventory.json'), 'utf8'));
      expect(inventory.files['Dockerfile']).toBeDefined();
      const second = await run(); expect(second.status).not.toBe(0);
      expect(readFileSync(join(f.dir, 'source-releases', m.commit, 'tree', 'Dockerfile'), 'utf8').length).toBeGreaterThan(0);
      const sshTarget = p.targets[0] as typeof p.targets[0] & { transport: string; sourceDir: string; ssh: { alias: string; config: string; knownHosts: string; expiresAt: string } };
      sshTarget.transport = 'ssh'; sshTarget.sourceDir = join(f.dir, 'ssh-source');
      sshTarget.ssh = { alias: 'fake', config: f.path, knownHosts: f.path, expiresAt: '2999-01-01T00:00:00Z' }; f.write(p);
      const overSsh = await runNode([resolve('scripts/release-candidate.mjs'), 'source-sync', f.path, file, 'site-test'],
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
      const result = spawnSync(process.execPath, [resolve('scripts/release-candidate.mjs'), 'apply', f.path, file, previousSet(f.dir, file)], { encoding: 'utf8' });
      expect(result.status).not.toBe(0); expect(result.stderr).toContain('storage evidence missing');
    } finally { f.close(); }
  });
  it('rejects unverified backup isolation and schema drift', async () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); const release = artifacts(f.dir); writeFileSync(file, JSON.stringify(release));
      const p = profile();
      const bin = join(f.dir, 'bin'); fakeGit(bin);
      const storageFixtureValue = storageFixture(f.dir, 'site-test', 'local-stage', release.commit, 'tests/site/', h);
      const { proof, raw, proofPath, rawPath, save, digest: digestFile } = storageFixtureValue;
      const dump = join(f.dir, 'backup.dump'); writeFileSync(dump, 'backup', { mode: 0o600 });
      const digest = createHash('sha256').update('backup').digest('hex');
      const restorePath = join(f.dir, 'restore.json');
      const restored = [{ backup_file: dump, sha256: digest, at_utc: new Date().toISOString(), restore_exit_code: 0, account_rows_sha256: h, account_columns: ['id'], schema_journal: [{ name: '026_policy.sql', sha256: h }] }];
      writeFileSync(restorePath, JSON.stringify(restored), { mode: 0o600 });
      const backupPath = join(f.dir, 'binding.json');
      const binding = { target: 'site-test', project: 'local-stage', observedAt: new Date().toISOString(), backupPath: dump, restoreReceiptPath: restorePath, sha256: digest,
        sourceIdentity: { composeProject: 'infra-stage', databaseContainerId: 'c'.repeat(64), databaseVolume: 'candidate-db-volume', postgresSystemIdentifier: '123', databaseName: 'n5_test', databaseOid: '123', timezone: 'UTC' } };
      writeFileSync(backupPath, JSON.stringify(binding), { mode: 0o600 });
      const target = p.targets[0]! as typeof p.targets[0] & { storageEvidencePath: string; backupEvidencePath: string };
      target.storageEvidencePath = proofPath; target.backupEvidencePath = backupPath; f.write(p);
      const previous = previousSet(f.dir, file);
      const run = () => runNode([resolve('scripts/release-candidate.mjs'), 'apply', f.path, file, previous], { ...process.env, PATH: `${bin}:${process.env.PATH}` });
      expect((await run()).stderr).toContain('data evidence missing');
      raw.sdkRequests[0]!.path = '/outside/canary'; writeFileSync(rawPath, JSON.stringify(raw)); proof.rawReceiptSha256 = digestFile(rawPath); save();
      expect((await run()).stderr).toContain('storage operation outside namespace');
      raw.sdkRequests[0]!.path = '/tests/site/canary'; writeFileSync(rawPath, JSON.stringify(raw)); proof.rawReceiptSha256 = digestFile(rawPath); save();
      const originalSourceSha = proof.sdkSourceSha256; proof.sdkSourceSha256 = 'f'.repeat(64); save();
      expect((await run()).stderr).toContain('storage source revision mismatch');
      proof.sdkSourceSha256 = originalSourceSha; save();
      restored[0]!.schema_journal[0]!.sha256 = 'broken'; writeFileSync(restorePath, JSON.stringify(restored));
      expect((await run()).stderr).toContain('invalid restore journal');
      restored[0]!.schema_journal[0]!.sha256 = h; writeFileSync(restorePath, JSON.stringify(restored));
      const names = ['account','video','clip','payment','payment_intent','attribution','credit_grant','video_credit_charge','credit_allocation'];
      const dataPath = join(f.dir, 'data.json');
      const data = { target: 'site-test', project: 'local-stage', backupSha256: digest, sourceIdentity: binding.sourceIdentity, observedAt: new Date().toISOString(),
        tables: Object.fromEntries(names.map(name => [name, { snapshotSha256: h, restoredSha256: h, count: 1, columns: ['id'] }])), pendingMultipart: [] as string[],
        objects: [{ logicalKey: 'videos/example', destinationKey: 'tests/site/videos/example', sourceSize: 10, destinationSize: 10,
          sourceSha256: h, destinationSha256: h, originalShaAfter: h, ownershipEvidence: 'video:00000000-0000-4000-8000-000000000001' }] };
      writeFileSync(dataPath, JSON.stringify(data), { mode: 0o600 });
      (target as typeof target & { dataEvidencePath: string }).dataEvidencePath = dataPath; f.write(p);
      expect((await run()).stderr).toContain('private state directory must be absolute');
      data.objects[0]!.destinationSha256 = 'b'.repeat(64); writeFileSync(dataPath, JSON.stringify(data));
      expect((await run()).stderr).toContain('object copy evidence invalid');
      data.objects[0]!.destinationSha256 = h; data.pendingMultipart.push('pending'); writeFileSync(dataPath, JSON.stringify(data));
      expect((await run()).stderr).toContain('pending uploads');
    } finally { f.close(); }
  }, 60000);
  it('accepts split app infra projects and rejects database URL binding mismatches', async () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json'); const release = artifacts(f.dir); writeFileSync(file, JSON.stringify(release));
      const p = profile(), now = new Date().toISOString(), emptyHash = createHash('sha256').update('[]').digest('hex');
      const dump = join(f.dir, 'backup.dump'); writeFileSync(dump, 'backup', { mode: 0o600 });
      const digest = createHash('sha256').update('backup').digest('hex'), restorePath = join(f.dir, 'restore.json');
      const journal = [{ name: '026_policy.sql', sha256: h }];
      writeFileSync(restorePath, JSON.stringify([{ backup_file: dump, sha256: digest, at_utc: now, restore_exit_code: 0, account_rows_sha256: emptyHash, account_columns: ['id'], schema_journal: journal }]), { mode: 0o600 });
      const storage = { endpoint: 'https://storage.example', publicEndpoint: 'https://public.example', region: 'region', bucket: 'shared-bucket', accessKeyId: 'key', secretAccessKey: 'secret' };
      const fingerprint = createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.entries(storage).sort(([a], [b]) => a.localeCompare(b))))).digest('hex');
      const bin = join(f.dir, 'bin'); fakeGit(bin);
      const tables = ['account','video','clip','payment','payment_intent','attribution','credit_grant','video_credit_charge','credit_allocation'];
      for (const target of p.targets) {
        target.root = f.dir; target.envFile = join(f.dir, 'env'); target.composeFiles = [join(f.dir, 'compose.yml')];
        writeFileSync(target.envFile, 'fixture', { mode: 0o600 }); writeFileSync(target.composeFiles[0]!, 'fixture', { mode: 0o600 });
        const prefix = target.storagePrefix;
        const { proofPath } = storageFixture(f.dir, target.name, target.project, release.commit, prefix, fingerprint);
        const identity = { composeProject: 'infra-stage', databaseContainerId: 'c'.repeat(64), databaseVolume: 'candidate-db-volume', postgresSystemIdentifier: '123', databaseName: 'n5_test', databaseOid: '123', timezone: 'UTC' };
        const backupPath = join(f.dir, target.name + '-backup.json');
        writeFileSync(backupPath, JSON.stringify({ target: target.name, project: target.project, observedAt: now, backupPath: dump, restoreReceiptPath: restorePath, sha256: digest, sourceIdentity: identity }), { mode: 0o600 });
        const dataPath = join(f.dir, target.name + '-data.json');
        writeFileSync(dataPath, JSON.stringify({ target: target.name, project: target.project, observedAt: now, backupSha256: digest, sourceIdentity: identity,
          tables: Object.fromEntries(tables.map(name => [name, { snapshotSha256: emptyHash, restoredSha256: emptyHash, count: 0, columns: ['id'] }])), pendingMultipart: [], objects: [] }), { mode: 0o600 });
        Object.assign(target, { storageEvidencePath: proofPath, backupEvidencePath: backupPath, dataEvidencePath: dataPath, localStateDir: f.dir });
      }
      f.write(p);
      const marker = join(f.dir, 'sql-called');
      const envs = { N5_PUBLIC_ORIGIN: 'http://localhost:4181', N5_LIMIT_GLOBAL_MINUTES:'240', N5_LIMIT_USER_MINUTES:'240', N5_LIMIT_PAID_USER_MINUTES:'240', N5_LIMIT_GLOBAL_LLM:'4', N5_LIMIT_USER_LLM:'4', S3_ENDPOINT:storage.endpoint, S3_PUBLIC_ENDPOINT:storage.publicEndpoint, S3_REGION:storage.region, S3_BUCKET:storage.bucket, S3_ACCESS_KEY:storage.accessKeyId, S3_SECRET_KEY:storage.secretAccessKey,
        S3_KEY_PREFIX:'tests/site/', DATABASE_URL:'postgresql://app:secret@test-db:5432/n5_test', REDIS_URL:'redis://test-redis:6379' };
      const config = { services: { web:{ environment:envs,mem_limit:'1g' }, 'worker-stt':{ environment:envs,mem_limit:'1g' }, 'worker-llm':{ environment:{ ...envs, S3_ENDPOINT:undefined,S3_PUBLIC_ENDPOINT:undefined,S3_REGION:undefined,S3_BUCKET:undefined,S3_ACCESS_KEY:undefined,S3_SECRET_KEY:undefined,S3_KEY_PREFIX:undefined },mem_limit:'1g' }, 'worker-video':{ environment:envs,mem_limit:'1g' } } };
      const info = { postgresSystemIdentifier:'123',databaseName:'n5_test',databaseOid:'123',timezone:'UTC',journal };
      const docker = `#!/usr/bin/python3
import json,os,sys
args=sys.argv[1:]; project=os.environ.get('FAKE_PROJECT','local-stage')
if args[0]=='compose' and 'config' in args:
 data=json.loads(${JSON.stringify(JSON.stringify(config))})
 for svc in data['services'].values():
  env=svc['environment']; env['DATABASE_URL']='postgresql://app:secret@test-db:5432/'+('wrong' if os.environ.get('FAKE_BAD_DB') else 'n5_test')
  if 'S3_KEY_PREFIX' in env: env['S3_KEY_PREFIX']='tests/cloud/' if project=='cloud-stage' else 'tests/site/'
 data['services']['web']['environment']['N5_PUBLIC_ORIGIN']='https://c.clipmkr.ru' if project=='cloud-stage' else 'http://localhost:4181'; print(json.dumps(data))
elif args[0]=='inspect':
 isdb=args[1].startswith('c'); print(json.dumps([{'Id':args[1],'State':{'Running':True},'Config':{'Labels':{'com.docker.compose.project':'infra-stage'}},'HostConfig':{'Memory':1048576},'Mounts':[{'Type':'volume','Destination':'/var/lib/postgresql/data' if isdb else '/data','Name':'candidate-db-volume' if isdb else 'candidate-redis-volume'}],'NetworkSettings':{'Networks':{'test-network':{'Aliases':['test-db' if isdb else 'test-redis']}}}}]))
elif args[0]=='exec':
 open(${JSON.stringify(marker)},'a').write('sql\\n'); query=sys.stdin.read()
 print(${JSON.stringify(JSON.stringify(info))} if 'pg_control_system' in query else ('0' if 'SELECT count(*) FROM video WHERE upload_id' in query else (json.dumps({'storageReferences':0,'activeMedia':0,'globalMinutes':0,'globalLlm':0}) if 'storageReferences' in query else '[]')))
else: sys.exit(1)
`;
      writeFileSync(join(bin, 'docker'), docker, { mode: 0o755 });
      writeFileSync(join(bin, 'ssh'), `#!/bin/sh\ncase "$*" in *fake-site*) export FAKE_PROJECT=local-stage;; *) export FAKE_PROJECT=cloud-stage;; esac\nfor last do :; done\nexec /bin/sh -c "$last" 2>${join(f.dir, 'remote-error')}\n`, { mode: 0o755 });
      const previous = previousSet(f.dir, file);
      const run = (bad = false) => runNode([resolve('scripts/release-candidate.mjs'), 'apply', f.path, file, previous], { ...process.env, FAKE_BAD_DB: bad ? '1' : '', PATH: `${bin}:${process.env.PATH}` });
      const valid = await run(); expect(valid.status).not.toBe(0); expect(valid.stdout, valid.stderr).toContain('unknown'); expect(readFileSync(marker, 'utf8')).toContain('sql');
      rmSync(marker); const invalid = await run(true); expect(invalid.status).not.toBe(0); expect(() => readFileSync(marker)).toThrow();
    } finally { f.close(); }
  }, 60000);
  it('blocks all changes even when profile and manifest syntax are valid', () => {
    const f = fixture();
    try {
      const file = join(f.dir, 'manifest.json');
      const m = artifacts(f.dir);
      writeFileSync(file, JSON.stringify(m));
      for (const cmd of ['apply', 'reconcile', 'rollback']) {
        const args = [resolve('scripts/release-candidate.mjs'), cmd, f.path, file];
        if (cmd !== 'reconcile') args.push(previousSet(f.dir, file));
        const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain(cmd === 'reconcile' ? 'reconciliation incomplete' : 'blocked');
      }
    } finally { f.close(); }
  });
});
