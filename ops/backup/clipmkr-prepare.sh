#!/usr/bin/env bash
# Root-only native capture. Called while the parent holds the shared backup lock.
set -Eeuo pipefail
exec python3 - "$@" <<'PY'
import argparse
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys
import tomllib
import uuid
from urllib.parse import urlsplit, unquote

GIB = 1024 ** 3
CAP = GIB
MARKER = '.clipmkr-backup-owned'
OWNER = b'clipmkr-backup-v1\n'
RUN = re.compile(r'run-[a-f0-9]{32}')

class Refusal(Exception):
    pass

def require(ok, reason):
    if not ok:
        raise Refusal(reason)

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def regular(path, private=False):
    path = Path(path)
    require(path.is_absolute() and path == path.resolve(), 'unsafe_path')
    s = path.lstat()
    require(stat.S_ISREG(s.st_mode) and s.st_uid == os.geteuid() and s.st_nlink == 1, 'unsafe_file')
    if private:
        require(s.st_mode & 0o077 == 0, 'non_private_file')
        for parent in path.parents:
            ancestor = parent.stat()
            require(ancestor.st_uid == 0 and stat.S_ISDIR(ancestor.st_mode), 'untrusted_private_parent')
            require(not ancestor.st_mode & 0o022 or bool(ancestor.st_mode & stat.S_ISVTX), 'writable_private_parent')
    return s

def load(path):
    regular(path, True)
    return json.loads(Path(path).read_text())

def atomic(path, value):
    path = Path(path)
    if path.exists() or path.is_symlink():
        regular(path, True)
    temp = path.with_name('.' + path.name + '.tmp')
    if temp.exists() or temp.is_symlink():
        regular(temp, True)
        temp.unlink()
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600)
    try:
        with os.fdopen(fd, 'w') as f:
            json.dump(value, f, ensure_ascii=False, sort_keys=True)
            f.write('\n')
            f.flush()
            os.fsync(f.fileno())
        os.replace(temp, path)
    finally:
        temp.unlink(missing_ok=True)

def command(args, data=None):
    if isinstance(data, Path):
        with data.open('rb') as source:
            p = subprocess.run(args, stdin=source, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120)
    else:
        p = subprocess.run(args, input=data, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, timeout=120)
    require(p.returncode == 0, 'native_command_failed')
    require(len(p.stdout) < 16 * 1024 ** 2, 'oversize_command_metadata')
    return p.stdout

def lock_proof(path):
    expected = Path(path).stat()
    try:
        held = os.fstat(8)
        info = Path('/proc/self/fdinfo/8').read_text()
    except (OSError, ValueError):
        raise Refusal('shared_lock_not_inherited')
    require((held.st_dev, held.st_ino) == (expected.st_dev, expected.st_ino), 'wrong_shared_lock')
    require(any(line.startswith('lock:') and 'FLOCK' in line and 'WRITE' in line for line in info.splitlines()), 'shared_lock_not_held')

def owned_dir(path):
    s = path.lstat()
    require(stat.S_ISDIR(s.st_mode) and not path.is_symlink() and path == path.resolve(), 'unsafe_staging_directory')
    require(s.st_uid == os.geteuid() and s.st_mode & 0o077 == 0, 'unsafe_staging_owner')
    regular(path / MARKER, True)
    require((path / MARKER).read_bytes() == OWNER, 'unknown_staging_owner')

def clean_run(path):
    require(RUN.fullmatch(path.name), 'unknown_staging_entry')
    owned_dir(path)
    for item in path.rglob('*'):
        s = item.lstat()
        require(not item.is_symlink() and s.st_uid == os.geteuid(), 'unsafe_cleanup_entry')
        require(stat.S_ISREG(s.st_mode) or stat.S_ISDIR(s.st_mode), 'unsafe_cleanup_type')
        if stat.S_ISREG(s.st_mode):
            require(s.st_nlink == 1, 'unsafe_cleanup_link')
    shutil.rmtree(path)

def initialize(root):
    require(root.is_absolute() and root == root.resolve() and root != Path('/'), 'unsafe_root')
    if not root.exists():
        root.mkdir(mode=0o700)
        (root / MARKER).write_bytes(OWNER)
    owned_dir(root)
    stage = root / 'staging'
    if not stage.exists():
        stage.mkdir(mode=0o700)
    require(not stage.is_symlink() and stage == stage.resolve() and stage.stat().st_mode & 0o077 == 0, 'unsafe_stage_root')
    previous = load(root / 'completed.json')['runId'] if (root / 'completed.json').exists() else None
    require(previous is None or RUN.fullmatch(previous), 'invalid_completed_pointer')
    for item in stage.iterdir():
        require(RUN.fullmatch(item.name), 'unknown_staging_entry')
        owned_dir(item)
    if previous:
        owned_dir(stage / previous)
    for item in list(stage.iterdir()):
        if item.name != previous:
            clean_run(item)
    return stage, previous

def free_space(paths, minimum):
    checked = set()
    for path in paths:
        s = path.stat()
        if s.st_dev not in checked:
            require(shutil.disk_usage(path).free >= minimum, 'insufficient_free_space')
            checked.add(s.st_dev)


def env(container):
    return dict(v.split('=', 1) for v in container['Config'].get('Env', []) if '=' in v)

def mounts(container):
    return {m['Destination']: m['Source'] for m in container['Mounts']}

def inspect_binding(binding):
    require(binding['version'] == 1 and set(binding['containers']) == {'web', 'stt', 'llm', 'video', 'helpdesk', 'postgres', 'redis'}, 'invalid_binding')
    names = [v['name'] for v in binding['containers'].values()]
    docs = json.loads(command(['docker', 'inspect', *names]))
    by_name = {v['Name'].lstrip('/'): v for v in docs}
    actual = {}
    for role, expected in binding['containers'].items():
        c = by_name[expected['name']]
        require(c['Id'] == expected['id'] and c['Image'] == expected['image'] and c['State']['Running'], 'runtime_binding_drift')
        actual[role] = c
    regular(binding['compose'], True)
    regular(binding['helpdeskConfig'], True)
    compose = json.loads(Path(binding['compose']).read_text())
    support = tomllib.loads(Path(binding['helpdeskConfig']).read_text())
    for role in ['web', 'stt', 'llm', 'video', 'helpdesk']:
        c = actual[role]
        service = c['Config']['Labels']['com.docker.compose.service']
        spec = compose['services'][service]
        require(spec['image'] == c['Image'], 'compose_image_drift')
        require(all(env(c).get(k) == str(v) for k, v in spec.get('environment', {}).items()), 'compose_environment_drift')
    db_name = binding['containers']['postgres']['name']
    redis_name = binding['containers']['redis']['name']
    db_addresses = {n['IPAddress'] for n in actual['postgres']['NetworkSettings']['Networks'].values()}
    redis_addresses = {n['IPAddress'] for n in actual['redis']['NetworkSettings']['Networks'].values()}
    for role in ['web', 'stt', 'llm', 'video']:
        e = env(actual[role])
        db, redis = urlsplit(e['DATABASE_URL']), urlsplit(e['REDIS_URL'])
        require(unquote(db.path.lstrip('/')) == binding['databases']['main'] and db.port in (None, 5432), 'main_database_drift')
        require(int(redis.path.lstrip('/') or '0') == binding['redisDbs']['main'] and redis.port in (None, 6379), 'main_redis_drift')
        resolved = json.loads(command(['docker', 'exec', binding['containers'][role]['name'], 'node', '-e',
            "Promise.all(process.argv.slice(1).map(h=>require('node:dns').promises.lookup(h))).then(x=>process.stdout.write(JSON.stringify(x.map(v=>v.address)))).catch(()=>process.exit(1))", db.hostname, redis.hostname]))
        require(resolved[0] in db_addresses and resolved[1] in redis_addresses, 'runtime_dns_drift')
    require(support['db']['database'] == binding['databases']['helpdesk'] and support['db']['host'] in {db_name, *db_addresses}, 'helpdesk_database_drift')
    address = support['redis']['address'].rsplit(':', 1)
    require(address[0] in {redis_name, *redis_addresses} and int(support['redis']['db']) == binding['redisDbs']['helpdesk'], 'helpdesk_redis_drift')
    hm = mounts(actual['helpdesk'])
    require(hm.get('/libredesk/config.toml') == binding['helpdeskConfig'] and hm.get('/libredesk/uploads') == binding['uploads'], 'helpdesk_mount_drift')
    spend = Path(binding['spend'])
    for role in ['stt', 'llm']:
        require(mounts(actual[role]).get('/work/spend') == str(spend), 'spend_mount_drift')
    require([mounts(actual[r]).get('/work') for r in ['stt', 'llm', 'video']] == binding['scratch'], 'scratch_mount_drift')
    users = {unquote(urlsplit(env(actual['web'])['DATABASE_URL']).username or ''), support['db']['user']}
    require(len(users) == 2 and all(re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', u) for u in users), 'invalid_database_roles')
    return actual, sorted(users)


def pg(binding, args):
    name = binding['containers']['postgres']['name']
    return ['docker', 'exec', name, 'sh', '-c', 'export PGPASSWORD="$POSTGRES_PASSWORD"; exec "$@"', 'sh', *args]

def redis(binding, args):
    name = binding['containers']['redis']['name']
    return ['docker', 'exec', name, 'sh', '-c', 'export REDISCLI_AUTH="$REDIS_PASSWORD"; exec redis-cli "$@"', 'sh', *args]

class Capture:
    def __init__(self, root):
        self.root = root
        self.size = sum(p.stat().st_size for p in root.rglob('*') if p.is_file())
        self.components = []

    def write(self, destination, chunks):
        with open(destination, 'xb') as f:
            for chunk in chunks:
                require(self.size + len(chunk) <= CAP, 'capture_cap_exceeded')
                f.write(chunk)
                self.size += len(chunk)

    def native(self, args, destination):
        started = now()
        process = subprocess.Popen(args, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        try:
            self.write(destination, iter(lambda: process.stdout.read(65536), b''))
            require(process.wait(timeout=120) == 0, 'capture_command_failed')
        finally:
            if process.poll() is None:
                process.kill()
            process.wait()
            process.stdout.close()
        self.components.append({'artifact': str(destination.relative_to(self.root)), 'startedAt': started, 'finishedAt': now()})

    def copy(self, source, destination):
        before = regular(source)
        started = now()
        with os.fdopen(os.open(source, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as f:
            opened = os.fstat(f.fileno())
            require((opened.st_dev, opened.st_ino) == (before.st_dev, before.st_ino), 'durable_file_rotated')
            self.write(destination, iter(lambda: f.read(65536), b''))
        after = regular(source)
        require((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns, before.st_ctime_ns) ==
                (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns, after.st_ctime_ns), 'durable_file_changed')
        self.components.append({'source': str(source), 'artifact': str(destination.relative_to(self.root)), 'startedAt': started, 'finishedAt': now()})

    def spend(self, source, destination):
        before = regular(source)
        started = now()
        with os.fdopen(os.open(source, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as f:
            identity = os.fstat(f.fileno())
            require(identity.st_ino == before.st_ino and identity.st_dev == before.st_dev, 'spend_rotation')
            require(identity.st_size <= CAP - self.size, 'capture_cap_exceeded')
            data = f.read(identity.st_size)
            require(len(data) == identity.st_size, 'spend_short_read')
            boundary = data.rfind(b'\n') + 1
            require(not data or boundary > 0, 'spend_no_complete_record')
            prefix = data[:boundary]
            lines = prefix.decode('utf-8').splitlines()
            require(all(line and isinstance(json.loads(line), dict) for line in lines), 'spend_invalid_record')
            self.write(destination, [prefix])
            f.seek(0)
            require(f.read(boundary) == prefix and os.fstat(f.fileno()).st_size >= identity.st_size, 'spend_prefix_changed')
        after = regular(source)
        require((after.st_dev, after.st_ino) == (identity.st_dev, identity.st_ino) and after.st_size >= identity.st_size, 'spend_rotation_or_truncation')
        self.components.append({'source': str(source), 'artifact': str(destination.relative_to(self.root)), 'semantics': 'completed-prefix',
            'device': identity.st_dev, 'inode': identity.st_ino, 'sourceSize': identity.st_size, 'prefixBytes': boundary,
            'records': len(lines), 'excludedTailBytes': identity.st_size - boundary, 'sha256': hashlib.sha256(prefix).hexdigest(),
            'startedAt': started, 'finishedAt': now()})


    def verify_spend(self):
        saved = next(c for c in self.components if c.get('semantics') == 'completed-prefix')
        source = Path(saved['source'])
        regular(source)
        with os.fdopen(os.open(source, os.O_RDONLY | os.O_NOFOLLOW), 'rb') as f:
            before = os.fstat(f.fileno())
            expected = (saved['device'], saved['inode'])
            require((before.st_dev, before.st_ino) == expected and before.st_size >= saved['sourceSize'], 'spend_final_identity_changed')
            digest = hashlib.sha256()
            remaining = saved['prefixBytes']
            while remaining:
                chunk = f.read(min(65536, remaining))
                require(chunk, 'spend_final_short_read')
                digest.update(chunk)
                remaining -= len(chunk)
            after = os.fstat(f.fileno())
        current = regular(source)
        require((current.st_dev, current.st_ino) == expected and min(after.st_size, current.st_size) >= saved['sourceSize'], 'spend_final_identity_changed')
        require(digest.hexdigest() == saved['sha256'], 'spend_final_prefix_changed')


def capture(args):
    require(os.geteuid() == 0, 'root_required')
    lock_proof(args.lock)
    root = Path(args.root)
    stage, previous = initialize(root)
    atomic(root / 'last-attempt.json', {'status': 'running', 'component': 'capture', 'startedAt': now()})
    binding = load(args.binding)
    actual, users = inspect_binding(binding)
    repo = Path(args.repo)
    require(repo.is_absolute() and repo == repo.resolve() and repo.is_dir(), 'unsafe_local_repository')
    files = [(Path(binding['compose']), 'compose.json'), (Path(binding['helpdeskConfig']), 'helpdesk.toml')]
    uploads = Path(binding['uploads'])
    require(uploads == uploads.resolve() and uploads.is_dir(), 'unsafe_uploads')
    uploads_started = now()
    upload_inventory = {}
    for path in uploads.rglob('*'):
        require(not path.is_symlink(), 'symlink_in_uploads')
        if path.is_file():
            saved = regular(path)
            upload_inventory[str(path.relative_to(uploads))] = (saved.st_dev, saved.st_ino, saved.st_size, saved.st_mtime_ns, saved.st_ctime_ns)
            files.append((path, 'uploads/' + str(path.relative_to(uploads))))
        else:
            require(path.is_dir(), 'unsupported_upload_type')
    spend = Path(binding['spend']) / 'model-spend.jsonl'
    regular(spend)
    pg_user = env(actual['postgres'])['POSTGRES_USER']
    sizes = []
    for db in binding['databases'].values():
        require(re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', db), 'invalid_database_name')
        sizes.append(int(command(pg(binding, ['psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', pg_user, '-d', db, '-c', 'SELECT pg_database_size(current_database())']))))
    info = command(redis(binding, ['INFO', 'memory'])).decode()
    memory = re.search(r'^used_memory:(\d+)\r?$', info, re.M)
    require(memory is not None, 'unknown_redis_size')
    estimate = sum(sizes) + int(memory[1]) + spend.stat().st_size + sum(p.stat().st_size for p, _ in files) + 1024 ** 2
    require(estimate * 5 <= CAP * 4, 'capture_estimate_exceeded')
    free_space([stage, repo], 8 * GIB)
    candidate = stage / ('run-' + uuid.uuid4().hex)
    candidate.mkdir(mode=0o700)
    (candidate / MARKER).write_bytes(OWNER)
    published = False
    try:
        (candidate / 'uploads').mkdir(mode=0o700)
        output = Capture(candidate)
        for role, db in binding['databases'].items():
            require(role in {'main', 'helpdesk'}, 'unknown_database_role')
            target = candidate / (role + '.dump')
            output.native(pg(binding, ['pg_dump', '-U', pg_user, '-d', db, '-Fc']), target)
            command(['docker', 'exec', '-i', binding['containers']['postgres']['name'], 'pg_restore', '--list'], target)
        owner_sql = "SELECT DISTINCT pg_get_userbyid(datdba) FROM pg_database WHERE datname IN (" + ','.join("'" + name + "'" for name in binding['databases'].values()) + ")"
        owners = command(pg(binding, ['psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', pg_user, '-d', binding['databases']['main'], '-c', owner_sql])).decode().splitlines()
        require(owners and all(re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', name) for name in owners), 'invalid_database_owner')
        roles = ','.join("'" + name + "'" for name in sorted(set(users + owners)))
        sql = "SELECT row_to_json(r) FROM (SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconnlimit,rolvaliduntil,rolpassword FROM pg_authid WHERE rolname IN (" + roles + ")) r;"
        output.native(pg(binding, ['psql', '-XAt', '-v', 'ON_ERROR_STOP=1', '-U', pg_user, '-d', binding['databases']['main'], '-c', sql]), candidate / 'roles.jsonl')
        rdb = candidate / 'redis.rdb'
        output.native(redis(binding, ['--rdb', '-']), rdb)
        command(['docker', 'exec', '-i', binding['containers']['redis']['name'], '/usr/local/bin/redis-check-rdb', '/dev/stdin'], rdb)
        for source, relative in files:
            target = candidate / relative
            target.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            output.copy(source, target)
        final_uploads = {}
        for path in uploads.rglob('*'):
            require(not path.is_symlink(), 'uploads_changed')
            if path.is_file():
                saved = regular(path)
                final_uploads[str(path.relative_to(uploads))] = (saved.st_dev, saved.st_ino, saved.st_size, saved.st_mtime_ns, saved.st_ctime_ns)
        require(final_uploads == upload_inventory, 'uploads_changed')
        output.components.append({'source': str(uploads), 'artifact': 'uploads', 'files': len(upload_inventory), 'startedAt': uploads_started, 'finishedAt': now()})
        output.spend(spend, candidate / 'model-spend.jsonl')
        versions = {role: {'id': c['Id'], 'image': c['Image'], 'imageName': c['Config']['Image'],
            'revision': c['Config'].get('Labels', {}).get('org.opencontainers.image.revision')} for role, c in actual.items()}
        manifest = {'version': 1, 'runId': candidate.name, 'createdAt': now(), 'components': output.components,
            'versions': versions, 'databases': binding['databases'], 'redisDbs': binding['redisDbs'], 'redisScope': 'all-logical-databases',
            'excluded': [{'path': path, 'reason': 'rebuildable/in-flight scratch'} for path in binding['scratch']],
            'consistency': 'online component snapshots; workers closed and reconciliation required before restore startup',
            'mediaCoverage': 'external S3 survives VPS loss only while original objects and access survive; no independent S3 object backup',
            'checksums': {str(p.relative_to(candidate)): hashlib.sha256(p.read_bytes()).hexdigest() for p in candidate.rglob('*') if p.is_file()}}
        output.write(candidate / 'manifest.json', [(json.dumps(manifest, sort_keys=True) + '\n').encode()])
        manifest_digest = hashlib.sha256((candidate / 'manifest.json').read_bytes()).hexdigest()
        # Recheck immutable runtime/config and source bindings after the potentially long capture.
        inspect_binding(binding)
        output.verify_spend()
        atomic(root / 'completed.json', {'runId': candidate.name, 'manifestSha256': manifest_digest})
        published = True
        if previous:
            clean_run(stage / previous)
        print(json.dumps({'runId': candidate.name, 'path': str(candidate), 'manifestSha256': manifest_digest}))
    finally:
        if not published and candidate.exists():
            clean_run(candidate)

parser = argparse.ArgumentParser(description='Prepare a bounded Clipmkr native backup under inherited shared FD8 lock')
parser.add_argument('--binding', default='/etc/clipmkr/backup/runtime-binding.json')
parser.add_argument('--root', default='/var/lib/clipmkr-backup')
parser.add_argument('--repo', required=True)
parser.add_argument('--lock', default='/var/lock/corp-backup.lock')
args = parser.parse_args()
os.umask(0o077)
signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(Refusal('capture_terminated')))
try:
    capture(args)
except (Refusal, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError) as exc:
    # Native stdout/stderr and exception text may contain credentials or customer data.
    reason = str(exc) if isinstance(exc, Refusal) else type(exc).__name__
    failure = {'status': 'failed', 'component': 'capture', 'reason': reason, 'finishedAt': now()}
    try:
        lock_proof(args.lock)
        owned_dir(Path(args.root))
        atomic(Path(args.root) / 'last-attempt.json', failure)
    except (Refusal, OSError):
        failure['receiptStored'] = False
    print(json.dumps(failure), file=sys.stderr)
    sys.exit(1)
PY
