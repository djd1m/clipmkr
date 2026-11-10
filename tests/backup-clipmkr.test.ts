import { afterEach, describe, expect, test } from 'vitest';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, readdirSync, rmSync, existsSync, statSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const prepare = path.resolve('ops/backup/clipmkr-prepare.sh');
const wrapper = path.resolve('scripts/backup-clipmkr.sh');
const roots: string[] = [];
const owner = 'clipmkr-backup-v1\n';
const fixtureDocker = `#!/usr/bin/python3
import json,os,sys,time
from pathlib import Path
args=sys.argv[1:]; f=Path(os.environ['FIXTURE']); x=json.loads((f/'inspect.json').read_text()); mode=os.environ.get('FAULT','')
with (f/'calls.jsonl').open('a') as log: log.write(json.dumps(args)+'\\n')
if args[0]=='inspect':
 if mode.startswith('late-spend-'):
  counter=f/'inspect-count';n=int(counter.read_text())+1 if counter.exists() else 1;counter.write_text(str(n))
  if n==2:
   source=f/'spend/model-spend.jsonl'
   if mode=='late-spend-rotate':source.rename(f/'rotated-spend');source.write_bytes(b'{\"new\":1}\\n')
   elif mode=='late-spend-truncate':source.write_bytes(b'')
   elif mode=='late-spend-mutate':
    with source.open('r+b') as stream:stream.write(b'{\"cost\":9}')
   else:
    with source.open('ab') as stream:stream.write(b'2}\\n')
 if mode=='binding': x[0]['Id']='FOREIGN'
 print(json.dumps(x)); sys.exit()
cmd=args
if 'pg_database_size(current_database())' in ' '.join(cmd): print(900000000 if mode=='estimate' else 1024); sys.exit()
if 'INFO' in cmd: print('used_memory:1024'); sys.exit()
if 'node' in cmd: print(json.dumps(['10.0.0.2','10.0.0.3'])); sys.exit()
if 'pg_dump' in cmd:
 if mode=='dump': sys.exit(1)
 if mode=='oversize':
  block=b'x'*1048576
  for _ in range(1025): sys.stdout.buffer.write(block)
 else: sys.stdout.buffer.write(b'PGDMP-fixture')
 sys.exit()
if 'pg_restore' in cmd or 'redis-check-rdb' in ' '.join(cmd): sys.stdin.buffer.read(); print('native checked'); sys.exit()
if 'pg_get_userbyid' in ' '.join(cmd): print('app_owner'); sys.exit()
if 'pg_authid' in ' '.join(cmd): print('{}'); sys.exit()
if '--rdb' in cmd:
 if mode=='invalid-spend': (f/'spend/model-spend.jsonl').write_text('{bad}\\n')
 if mode=='scratch': (f/'stt/large-workfile').write_bytes(b'scratch'*10000)
 sys.stdout.buffer.write(b'REDIS-fixture'); sys.exit()
sys.exit(70)
`;

type Fixture = ReturnType<typeof fixture>;
function privateFile(file: string, data: string | Buffer) {
  writeFileSync(file, data, { mode: 0o600 });
}
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'clipmkr-backup-test-'));
  roots.push(dir);
  const bin = path.join(dir, 'bin');
  const root = path.join(dir, 'backup');
  const repo = path.join(dir, 'repo');
  for (const p of [bin, repo, ...['uploads', 'spend', 'stt', 'llm', 'video'].map(p => path.join(dir, p))]) mkdirSync(p, { mode: 0o700 });
  privateFile(path.join(bin, 'docker'), fixtureDocker); chmodSync(path.join(bin, 'docker'), 0o700);
  const names = ['web', 'stt', 'llm', 'video', 'helpdesk', 'postgres', 'redis'];
  const containers = Object.fromEntries(names.map(name => [name, { name, id: name + '-id', image: name + '-image' }]));
  const databaseUrl = 'postgres://main_role:PRIVATE@postgres:5432/main_db';
  const redisUrl = 'redis://:PRIVATE@redis:6379/2';
  const compose = path.join(dir, 'compose.json');
  const helpdeskConfig = path.join(dir, 'helpdesk.toml');
  const services = Object.fromEntries(names.slice(0, 5).map(name => [name, { image: name + '-image', environment: name === 'helpdesk' ? {} : { DATABASE_URL: databaseUrl, REDIS_URL: redisUrl } }]));
  privateFile(compose, JSON.stringify({ services }));
  privateFile(helpdeskConfig, '[db]\nhost="postgres"\ndatabase="helpdesk_db"\nuser="helpdesk_role"\n[redis]\naddress="redis:6379"\ndb=6\n');
  privateFile(path.join(dir, 'uploads', 'attachment'), 'durable attachment');
  privateFile(path.join(dir, 'spend', 'model-spend.jsonl'), '{"cost":1}\n{"torn":');
  const inspect = names.map(name => ({ Name: '/' + name, Id: name + '-id', Image: name + '-image', State: { Running: true },
    Config: { Image: name + '-image', Env: name === 'postgres' ? ['POSTGRES_USER=postgres'] : name === 'helpdesk' ? [] : ['DATABASE_URL=' + databaseUrl, 'REDIS_URL=' + redisUrl], Labels: { 'com.docker.compose.service': name } },
    Mounts: name === 'helpdesk' ? [{ Destination: '/libredesk/config.toml', Source: helpdeskConfig }, { Destination: '/libredesk/uploads', Source: path.join(dir, 'uploads') }] :
      ['stt', 'llm', 'video'].includes(name) ? [{ Destination: '/work', Source: path.join(dir, name) }, ...(['stt', 'llm'].includes(name) ? [{ Destination: '/work/spend', Source: path.join(dir, 'spend') }] : [])] : [],
    NetworkSettings: { Networks: { owned: { IPAddress: name === 'postgres' ? '10.0.0.2' : '10.0.0.3' } } },
  }));
  privateFile(path.join(dir, 'inspect.json'), JSON.stringify(inspect));
  const binding = path.join(dir, 'binding.json');
  privateFile(binding, JSON.stringify({ version: 1, containers, databases: { main: 'main_db', helpdesk: 'helpdesk_db' }, redisDbs: { main: 2, helpdesk: 6 }, compose, helpdeskConfig, uploads: path.join(dir, 'uploads'), spend: path.join(dir, 'spend'), scratch: ['stt', 'llm', 'video'].map(p => path.join(dir, p)) }));
  const lock = path.join(dir, 'shared.lock'); privateFile(lock, '');
  return { dir, bin, root, repo, binding, lock };
}
function run(f: Fixture, fault = '', held = true) {
  const args = [prepare, '--binding', f.binding, '--root', f.root, '--repo', f.repo, '--lock', f.lock];
  return spawnSync('bash', ['-c', held ? 'exec 8>>"$1"; flock -n 8 || exit 88; shift; exec "$@"' : 'shift; exec "$@"', 'fixture', f.lock, ...args],
    { encoding: 'utf8', env: { ...process.env, PATH: f.bin + ':' + process.env.PATH, FIXTURE: f.dir, FAULT: fault }, timeout: 30000, maxBuffer: 1024 * 1024 });
}
function calls(f: Fixture): string[][] {
  const p = path.join(f.dir, 'calls.jsonl');
  return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : [];
}
function current(f: Fixture) {
  const record = JSON.parse(readFileSync(path.join(f.root, 'completed.json'), 'utf8'));
  return path.join(f.root, 'staging', record.runId);
}
afterEach(() => { for (const p of roots.splice(0)) rmSync(p, { recursive: true, force: true }); });

describe('bounded native capture command boundary', () => {
  test('unheld_shared_lock_refuses_capture', () => {
    const f = fixture(); const result = run(f, '', false);
    expect(result.status).toBe(1); expect(calls(f)).toEqual([]); expect(existsSync(f.root)).toBe(false);
  });
  test('runtime_binding_drift_refuses_before_capture', () => {
    const f = fixture(); expect(run(f, 'binding').status).toBe(1);
    expect(calls(f).some(c => c.includes('pg_dump'))).toBe(false);
  });
  test('capacity_preflight_refuses_before_bulk_capture', () => {
    const f = fixture(); expect(run(f, 'estimate').status).toBe(1);
    expect(calls(f).some(c => c.includes('pg_dump') || c.includes('--rdb'))).toBe(false);
    expect(readdirSync(path.join(f.root, 'staging'))).toEqual([]);
  });
  test('capture_failure_does_not_publish_stale_set', () => {
    const f = fixture(); expect(run(f).status).toBe(0); const previous = current(f);
    expect(run(f, 'dump').status).toBe(1); expect(current(f)).toBe(previous);
    expect(readdirSync(path.join(f.root, 'staging'))).toEqual([path.basename(previous)]);
  });
  test('staging_repeated_failures_and_orphans_remain_bounded', () => {
    const f = fixture(); expect(run(f).status).toBe(0); const previous = current(f);
    privateFile(path.join(f.root, '.completed.json.tmp'), '{"interrupted":true}');
    expect(run(f).status).toBe(0);
    expect(existsSync(path.join(f.root, '.completed.json.tmp'))).toBe(false);
    const preserved = current(f);
    for (let i = 0; i < 3; i++) {
      const orphan = path.join(f.root, 'staging', 'run-' + String(i).repeat(32)); mkdirSync(orphan, { mode: 0o700 }); privateFile(path.join(orphan, '.clipmkr-backup-owned'), owner);
      expect(run(f, 'dump').status).toBe(1); expect(current(f)).toBe(preserved);
      expect(readdirSync(path.join(f.root, 'staging'))).toHaveLength(1);
    }
    const sentinel = path.join(f.root, 'staging', 'FOREIGN'); privateFile(sentinel, 'preserve');
    expect(run(f).status).toBe(1); expect(readFileSync(sentinel, 'utf8')).toBe('preserve'); expect(current(f)).toBe(preserved);
  });
  test('staging_cap_aborts_without_publication', () => {
    const f = fixture(); const result = run(f, 'oversize');
    expect(result.status).toBe(1); expect(result.stderr).toContain('capture_cap_exceeded');
    expect(existsSync(path.join(f.root, 'completed.json'))).toBe(false);
    expect(readdirSync(path.join(f.root, 'staging'))).toEqual([]);
  }, 30000);
  test('spend_capture_preserves_valid_source_bound_prefix', () => {
    const f = fixture(); const result = run(f); expect(result.status, result.stderr).toBe(0);
    const output = current(f); expect(readFileSync(path.join(output, 'model-spend.jsonl'), 'utf8')).toBe('{"cost":1}\n');
    const manifest = JSON.parse(readFileSync(path.join(output, 'manifest.json'), 'utf8'));
    const spend = manifest.components.find((c: { semantics?: string }) => c.semantics === 'completed-prefix');
    expect(spend).toMatchObject({ sourceSize: 19, prefixBytes: 11, records: 1, excludedTailBytes: 8 });
    expect(spend.inode).toBe(statSync(path.join(f.dir, 'spend', 'model-spend.jsonl')).ino);
    expect(JSON.parse(readFileSync(path.join(f.root, 'completed.json'), 'utf8')).manifestSha256).toMatch(/^[a-f0-9]{64}$/);
  });
  test('spend_rotation_truncation_or_invalid_record_refuses_publication', () => {
    const f = fixture(); expect(run(f, 'invalid-spend').status).toBe(1);
    expect(existsSync(path.join(f.root, 'completed.json'))).toBe(false);
    privateFile(path.join(f.dir, 'spend', 'model-spend.jsonl'), '{"valid":1}\n');
    const original = path.join(f.dir, 'spend', 'model-spend.jsonl');
    rmSync(original); symlinkSync(path.join(f.dir, 'compose.json'), original);
    expect(run(f).status).toBe(1);
  });
  test('rebuildable_scratch_is_explicitly_excluded_from_capture', () => {
    const f = fixture(); expect(run(f, 'scratch').status).toBe(0); const output = current(f);
    const manifest = JSON.parse(readFileSync(path.join(output, 'manifest.json'), 'utf8'));
    expect(manifest.excluded).toHaveLength(3); expect(existsSync(path.join(output, 'large-workfile'))).toBe(false);
    expect(readFileSync(path.join(output, 'uploads', 'attachment'), 'utf8')).toBe('durable attachment');
    expect(calls(f).some(c => c.some(s => ['forget', 'prune', 'stop', 'restart', 'FLUSHALL', 'SAVE'].includes(s)))).toBe(false);
    expect(statSync(output).mode & 0o077).toBe(0);
  });
});

function backupFixture() {
  const f = fixture();
  const etc = path.join(f.dir, 'etc'); mkdirSync(etc, { mode: 0o700 });
  const primary = path.join(f.dir, 'primary'); const secondary = path.join(f.dir, 'secondary');
  const descriptor = path.join(f.dir, 'descriptor.json');
  privateFile(descriptor, JSON.stringify({ service: 'clipmkr', integration: 'standalone-hourly-only', include: [path.join(f.root, 'staging')], tags: ['clipmkr', 'corp-infra'] }));
  privateFile(path.join(etc, 'local.env'), `RESTIC_REPOSITORY=${f.repo}\nRESTIC_PASSWORD=fixture-local-only\n`);
  for (const [target, filename] of [[primary, 'offsite.env'], [secondary, 'offsite-secondary.env']] as const) {
    const bucket = filename === 'offsite.env' ? 'primary' : 'secondary';
    privateFile(path.join(etc, filename), `RESTIC_REPOSITORY=${target}\nRESTIC_PASSWORD=fixture-local-only\nOFFSITE_SYNC_MODE=rclone-copy-immutable\nOFFSITE_BUCKET=${bucket}\nOFFSITE_ENDPOINT=http://unused.invalid\nAWS_REGION=fixture\nAWS_ACCESS_KEY_ID=fixture\nAWS_SECRET_ACCESS_KEY=fixture\nOFFSITE_SECONDARY_ENABLED=true\n`);
  }
  const nativeRestic = execFileSync('which', ['restic'], { encoding: 'utf8' }).trim();
  const nativeRclone = execFileSync('which', ['rclone'], { encoding: 'utf8' }).trim();
  privateFile(path.join(f.bin, 'restic'), `#!/usr/bin/python3\nimport os,sys,json\nfrom pathlib import Path\nf=Path(${JSON.stringify(f.dir)})\nwith (f/'restic-calls.jsonl').open('a') as log:log.write(json.dumps({'argv':sys.argv[1:],'repository':os.environ.get('RESTIC_REPOSITORY')})+'\\n')\nos.execv(${JSON.stringify(nativeRestic)},[${JSON.stringify(nativeRestic)},*sys.argv[1:]])\n`);
  chmodSync(path.join(f.bin, 'restic'), 0o700);

  execFileSync(nativeRestic, ['init'], { env: { ...process.env, RESTIC_REPOSITORY: f.repo, RESTIC_PASSWORD: 'fixture-local-only' }, stdio: 'ignore' });
  // Keep the native copy/data engine, replacing only the external S3 address with owned temp destinations.
  privateFile(path.join(f.bin, 'rclone'), `#!/usr/bin/python3\nimport os,sys,json\nfrom pathlib import Path\nf=Path(os.environ['FIXTURE']);a=sys.argv[1:]\nwith (f/'copy-calls.jsonl').open('a') as log:log.write(json.dumps(a)+'\\n')\nif os.environ.get('COPY_DELAY')=='yes':\n import time\n time.sleep(20)\nif os.environ.get('COPY_FAIL')=='secondary' and a[2].endswith('secondary'):sys.exit(1)\na[2]=str(f/a[2].split(':',1)[1])\nos.execv(${JSON.stringify(nativeRclone)},[${JSON.stringify(nativeRclone)},*a])\n`);
  chmodSync(path.join(f.bin, 'rclone'), 0o700);
  const corpScripts = path.join(f.dir, 'corp-scripts'); mkdirSync(corpScripts, { mode: 0o700 });
  // Delegate all production parsing/role/route semantics; only expose the reader CLI
  // boundary to the same recording shim used by local writes.
  privateFile(path.join(corpScripts, 'service-freshness.py'), `import importlib.util\nspec=importlib.util.spec_from_file_location('canonical_corp_freshness','/opt/corp-infra/backup/scripts/service-freshness.py')\ncanonical=importlib.util.module_from_spec(spec)\nspec.loader.exec_module(canonical)\nProblem=canonical.Problem\nENV_FIELDS=canonical.ENV_FIELDS\nread_env=canonical.read_env\ndef repository_env(*args,**kwargs):\n env,mode,identity=canonical.repository_env(*args,**kwargs)\n env['PATH']=${JSON.stringify(f.bin)}+':'+env['PATH']\n return env,mode,identity\n`);
  return { ...f, etc, descriptor, primary, secondary, nativeRestic, corpScripts };
}
function backup(f: ReturnType<typeof backupFixture>, fail = '', script = wrapper) {
  return spawnSync(script, ['--binding', f.binding, '--root', f.root, '--etc', f.etc, '--lock', f.lock, '--prepare', prepare, '--descriptor', f.descriptor, '--corp-scripts', f.corpScripts],
    { encoding: 'utf8', env: { ...process.env, PATH: f.bin + ':' + process.env.PATH, FIXTURE: f.dir, COPY_FAIL: fail }, timeout: 30000, maxBuffer: 1024 * 1024 });
}
function recordedRestic(f: Fixture): { argv: string[]; repository: string }[] {
  return readFileSync(path.join(f.dir, 'restic-calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
}
function assertNoForbiddenCommands(allCalls: string[][]) {
  expect(allCalls.some(c => c.some(arg => ['forget', 'prune', 'stop', 'restart', 'rescan-manifests.sh', 'backup.sh', 'SAVE', 'FLUSHALL'].includes(arg)))).toBe(false);
}
describe('standalone native restic and immutable copy adapter', () => {
  test('hourly_descriptor_avoids_global_registry_and_daily_hooks', () => {
    const f = backupFixture(); const d = JSON.parse(readFileSync(f.descriptor, 'utf8')); d.integration = 'global-registry'; privateFile(f.descriptor, JSON.stringify(d));
    const result = backup(f); expect(result.status, result.stderr).toBe(1);
    expect(calls(f)).toEqual([]); expect(existsSync(path.join(f.dir, 'copy-calls.jsonl'))).toBe(false);
    expect(existsSync(f.root)).toBe(false);
  });
  test('occupied_shared_lock_runs_no_commands', () => {
    const f = backupFixture();
    const result = spawnSync('bash', ['-c', 'exec 8>>"$1"; flock -n 8; shift; "$@"', 'fixture', f.lock, wrapper, '--binding', f.binding, '--root', f.root, '--etc', f.etc, '--lock', f.lock, '--prepare', prepare, '--descriptor', f.descriptor, '--corp-scripts', f.corpScripts],
      { encoding: 'utf8', env: { ...process.env, PATH: f.bin + ':' + process.env.PATH, FIXTURE: f.dir }, timeout: 30000 });
    expect(result.status).toBe(1); expect(result.stderr).toContain('shared_lock_busy'); expect(calls(f)).toEqual([]);
  });
  test('native_two_copy_roundtrip_restores_exact_bytes', () => {
    const f = backupFixture(); const result = backup(f); expect(result.status, result.stderr).toBe(0);
    const receipt = JSON.parse(result.stdout); expect(receipt.status).toBe('success');
    expect(Object.keys(receipt.copies).sort()).toEqual(['primary', 'secondary']);
    const manifest = readFileSync(path.join(current(f), 'manifest.json'));
    for (const repo of [f.primary, f.secondary]) {
      const env = { ...process.env, RESTIC_REPOSITORY: repo, RESTIC_PASSWORD: 'fixture-local-only' };
      const restored = execFileSync(f.nativeRestic, ['--no-lock', 'dump', receipt.snapshotId, path.join(current(f), 'manifest.json')], { env });
      expect(restored).toEqual(manifest);
      expect(execFileSync(f.nativeRestic, ['--no-lock', 'dump', receipt.snapshotId, path.join(current(f), 'uploads', 'attachment')], { env, encoding: 'utf8' })).toBe('durable attachment');
      const snapshots = JSON.parse(execFileSync(f.nativeRestic, ['--no-lock', 'snapshots', '--json'], { env, encoding: 'utf8' }));
      expect(snapshots[0].tags.sort()).toEqual(['clipmkr', 'corp-infra']);
    }
    expect(JSON.parse(readFileSync(path.join(f.root, 'last-success.json'), 'utf8')).snapshotId).toBe(receipt.snapshotId);
  }, 30000);
  test('one_failed_offsite_never_marks_success', () => {
    const f = backupFixture(); expect(backup(f).status).toBe(0);
    const success = readFileSync(path.join(f.root, 'last-success.json'));
    const result = backup(f, 'secondary'); expect(result.status, result.stderr).toBe(1);
    expect(readFileSync(path.join(f.root, 'last-success.json'))).toEqual(success);
    const attempt = JSON.parse(readFileSync(path.join(f.root, 'last-attempt.json'), 'utf8'));
    expect(attempt.status).toBe('failed'); expect(attempt.component).toBe('secondary-copy'); expect(attempt.copies.primary).toBeDefined();
    expect(readdirSync(path.join(f.root, 'staging'))).toHaveLength(1);
  }, 30000);
  test('hourly_run_never_calls_global_retention_or_foreign_hooks', () => {
    const f = backupFixture(); const result = backup(f); expect(result.status, result.stderr).toBe(0);
    const copyCalls: string[][] = readFileSync(path.join(f.dir, 'copy-calls.jsonl'), 'utf8').trim().split('\n').map(l => JSON.parse(l));
    expect(copyCalls).toHaveLength(2);
    expect(copyCalls.every(c => c[0] === 'copy' && c.includes('--immutable') && c.includes('--checksum'))).toBe(true);
    const recorded = recordedRestic(f);
    const resticCalls = recorded.map(c => c.argv);
    expect(resticCalls.some(c => c[0] === 'backup')).toBe(true);
    for (const repository of [f.repo, f.primary, f.secondary]) {
      expect(recorded.some(c => c.repository === repository && c.argv.includes('snapshots'))).toBe(true);
    }
    for (const repository of [f.primary, f.secondary]) expect(recorded.some(c => c.repository === repository && c.argv.includes('dump'))).toBe(true);
    assertNoForbiddenCommands([...calls(f), ...copyCalls, ...resticCalls]);
  }, 30000);
});

// Execute the embedded Python functions against real descriptors/files, with a controlled
// concurrent writer at the output-write boundary. No assertions inspect implementation text.
function spendInterleaving(kind: 'append' | 'rotate' | 'truncate' | 'mutate') {
  const f = fixture();
  const embedded = readFileSync(prepare, 'utf8').split("<<'PY'\n")[1]!.split('\nparser =')[0];
  const script = `${embedded}\nos.umask(0o077)\nroot=Path(sys.argv[1]);source=root/'spend/model-spend.jsonl';destination=root/'uploads/prefix.jsonl'\nsource.write_bytes(b'{"cost":1}\\n{"torn":')\noutput=Capture(root/'uploads');original=output.write\ndef interleave(dest,chunks):\n original(dest,chunks)\n kind=sys.argv[2]\n if kind=='append':\n  with source.open('ab') as stream:stream.write(b'2}\\n')\n elif kind=='rotate':\n  source.rename(root/'old-spend');source.write_bytes(b'{"replacement":1}\\n')\n elif kind=='truncate':source.write_bytes(b'')\n else:\n  with source.open('r+b') as stream:stream.write(b'{"cost":9}')\noutput.write=interleave\ntry:\n output.spend(source,destination);print(json.dumps(output.components))\nexcept Refusal as error:print(str(error));sys.exit(7)\n`;
  const result = spawnSync('python3', ['-c', script, f.dir, kind], { encoding: 'utf8' });
  return { f, result };
}
test('spend_capture_preserves_valid_source_bound_prefix with concurrent append', () => {
  const { f, result } = spendInterleaving('append'); expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(path.join(f.dir, 'uploads', 'prefix.jsonl'), 'utf8')).toBe('{"cost":1}\n');
  expect(JSON.parse(result.stdout)[0]).toMatchObject({ sourceSize: 19, prefixBytes: 11, excludedTailBytes: 8, records: 1 });
});
test('spend_rotation_truncation_or_invalid_record_refuses_publication after opening source', () => {
  for (const mutation of ['rotate', 'truncate', 'mutate'] as const) {
    const result = spendInterleaving(mutation).result;
    expect(result.status, result.stderr).toBe(7); expect(result.stdout).toMatch(/spend_(rotation_or_truncation|prefix_changed)/);
  }
});

test('termination_records_failed_component_and_preserves_previous_success', async () => {
  const f = backupFixture(); expect(backup(f).status).toBe(0);
  const success = readFileSync(path.join(f.root, 'last-success.json'));
  const child = spawn(wrapper, ['--binding', f.binding, '--root', f.root, '--etc', f.etc, '--lock', f.lock, '--prepare', prepare, '--descriptor', f.descriptor, '--corp-scripts', f.corpScripts],
    { env: { ...process.env, PATH: f.bin + ':' + process.env.PATH, FIXTURE: f.dir, COPY_DELAY: 'yes' }, stdio: 'ignore' });
  const exited = new Promise<number | null>(resolve => child.on('exit', resolve));
  let reached = false;
  for (let i = 0; i < 500; i++) {
    const file = path.join(f.root, 'last-attempt.json');
    if (existsSync(file)) {
      const attempt = JSON.parse(readFileSync(file, 'utf8'));
      if (attempt.status === 'running' && attempt.component === 'primary-copy') { reached = true; break; }
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  child.kill('SIGTERM'); await exited;
  expect(reached).toBe(true);
  const attempt = JSON.parse(readFileSync(path.join(f.root, 'last-attempt.json'), 'utf8'));
  expect(attempt).toMatchObject({ status: 'failed', component: 'primary-copy', reason: 'run_terminated' });
  expect(readFileSync(path.join(f.root, 'last-success.json'))).toEqual(success);
}, 30000);

test('capacity_preflight_refuses_before_bulk_capture when available space is below reserve', () => {
  const f = fixture();
  const embedded = readFileSync(prepare, 'utf8').split("<<'PY'\n")[1]!.split('\nparser =')[0];
  const script = `${embedded}\nos.umask(0o077)\nf=Path(sys.argv[1]);fd=os.open(f/'shared.lock',os.O_RDWR);os.dup2(fd,8);fcntl.flock(8,fcntl.LOCK_EX)\nshutil.disk_usage=lambda _:type('Usage',(),{'free':8*GIB-1})()\na=argparse.Namespace(root=str(f/'backup'),binding=str(f/'binding.json'),repo=str(f/'repo'),lock=str(f/'shared.lock'))\ntry:capture(a)\nexcept Refusal as error:\n print(str(error));sys.exit(7)\n`;
  const result = spawnSync('python3', ['-c', script, f.dir], { encoding: 'utf8', env: { ...process.env, PATH: f.bin + ':' + process.env.PATH, FIXTURE: f.dir } });
  expect(result.status, result.stderr).toBe(7); expect(result.stdout.trim()).toBe('insufficient_free_space');
  expect(calls(f).some(c => c.includes('pg_dump') || c.includes('--rdb'))).toBe(false);
});

test.each(['rotate', 'truncate', 'mutate'])('late_spend_rotation_refuses_publication: %s', mutation => {
  const f = fixture(); expect(run(f).status).toBe(0);
  const previous = current(f);
  const result = run(f, 'late-spend-' + mutation);
  expect(result.status, result.stderr).toBe(1);
  expect(result.stderr).toMatch(/spend_final_(identity|prefix)_changed/);
  expect(current(f)).toBe(previous);
  expect(readdirSync(path.join(f.root, 'staging'))).toEqual([path.basename(previous)]);
});
test('late spend append beyond S remains allowed before publication', () => {
  const f = fixture(); const result = run(f, 'late-spend-append'); expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(path.join(current(f), 'model-spend.jsonl'), 'utf8')).toBe('{"cost":1}\n');
});
test('descriptor_writable_parent_refuses_before_capture', () => {
  const f = backupFixture();
  const parent = path.join(f.dir, 'writable'); mkdirSync(parent, { mode: 0o777 }); chmodSync(parent, 0o777);
  const descriptor = path.join(parent, 'descriptor.json'); privateFile(descriptor, readFileSync(f.descriptor));
  const result = backup({ ...f, descriptor });
  expect(result.status, result.stderr).toBe(1); expect(result.stderr).toContain('writable_private_parent');
  expect(calls(f)).toEqual([]); expect(existsSync(f.root)).toBe(false);
});

test.each(['local', 'primary', 'secondary'] as const)('retention mutation is detected by the native command recording assertion: %s', repository => {
  const f = backupFixture();
  const mutated = path.join(f.dir, 'retention-mutant.sh');
  const source = readFileSync(wrapper, 'utf8');
  const changed = repository === 'local'
    ? source.replace("    attempt['snapshotId'] = snapshot", "    run(['restic', 'forget', '--keep-last', '1'], local_env)\n    attempt['snapshotId'] = snapshot")
    : source.replace("        reader_env['RESTIC_CACHE_DIR'] = str(cache)", `        reader_env['RESTIC_CACHE_DIR'] = str(cache)\n        if target == '${repository}':\n            run(['restic', 'forget', '--keep-last', '1'], reader_env)`);
  privateFile(mutated, changed); chmodSync(mutated, 0o700);
  const result = backup(f, '', mutated); expect(result.status, result.stderr).toBe(0);
  const recorded = recordedRestic(f);
  const destination = repository === 'local' ? f.repo : f[repository];
  expect(recorded.some(call => call.repository === destination && call.argv[0] === 'forget')).toBe(true);
  expect(() => assertNoForbiddenCommands(recorded.map(call => call.argv))).toThrow();
}, 30000);
