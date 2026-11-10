#!/usr/bin/env bash
# Hourly Clipmkr adapter; deliberately never runs the global backup apply/retention chain.
set -Eeuo pipefail
exec timeout --signal=TERM --kill-after=15s 50m python3 - "$@" <<'PY'
import argparse
import datetime as dt
import fcntl
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import sys

class Refusal(Exception):
    pass

def require(ok, reason):
    if not ok:
        raise Refusal(reason)

def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def private_file(path):
    path = Path(path)
    s = path.lstat()
    require(path.is_absolute() and path == path.resolve() and stat.S_ISREG(s.st_mode) and
            s.st_uid == os.geteuid() and s.st_mode & 0o077 == 0 and s.st_nlink == 1, 'unsafe_private_file')
    for parent in path.parents:
        ancestor = parent.stat()
        require(ancestor.st_uid == 0 and stat.S_ISDIR(ancestor.st_mode), 'untrusted_private_parent')
        require(not ancestor.st_mode & 0o022 or bool(ancestor.st_mode & stat.S_ISVTX), 'writable_private_parent')
    return path

def atomic(path, value):
    if path.exists() or path.is_symlink():
        private_file(path)
    temp = path.with_name('.' + path.name + '.tmp')
    if temp.exists() or temp.is_symlink():
        private_file(temp).unlink()
    with os.fdopen(os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW, 0o600), 'w') as f:
        json.dump(value, f, sort_keys=True)
        f.write('\n')
        f.flush()
        os.fsync(f.fileno())
    os.replace(temp, path)

def run(args, env=None, inherited=False):
    p = subprocess.run(args, env=env, pass_fds=(8,) if inherited else (), stdout=subprocess.PIPE,
                       stderr=subprocess.DEVNULL, timeout=2400)
    require(p.returncode == 0, 'native_command_failed')
    return p.stdout

parser = argparse.ArgumentParser(description='Clipmkr-only backup: shared lock, native capture/restic, immutable copies')
parser.add_argument('--binding', default='/etc/clipmkr/backup/runtime-binding.json')
parser.add_argument('--root', default='/var/lib/clipmkr-backup')
parser.add_argument('--etc', default='/etc/corp-infra/backup')
parser.add_argument('--lock', default='/var/lock/corp-backup.lock')
parser.add_argument('--prepare', default='/opt/clipmkr/backup/clipmkr-prepare.sh')
parser.add_argument('--descriptor', default='/etc/clipmkr/backup/clipmkr.backup-manifest.json')
parser.add_argument('--corp-scripts', default='/opt/corp-infra/backup/scripts')
a = parser.parse_args()
os.umask(0o077)
attempt = {'status': 'running', 'startedAt': now(), 'component': 'preflight', 'copies': {}}
root = Path(a.root)
locked = False
signal.signal(signal.SIGTERM, lambda *_: (_ for _ in ()).throw(Refusal('run_terminated')))
try:
    require(os.geteuid() == 0, 'root_required')
    lock = Path(a.lock)
    require(lock.is_absolute() and lock == lock.resolve(), 'unsafe_lock_path')
    fd = os.open(lock, os.O_RDWR | os.O_CREAT | os.O_NOFOLLOW, 0o600)
    if fd != 8:
        os.dup2(fd, 8)
        os.close(fd)
    os.set_inheritable(8, True)
    try:
        fcntl.flock(8, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        raise Refusal('shared_lock_busy')
    locked = True
    descriptor = json.loads(private_file(a.descriptor).read_text())
    require(descriptor['service'] == 'clipmkr' and descriptor['integration'] == 'standalone-hourly-only', 'invalid_own_descriptor')
    require(descriptor['include'] == [str(root / 'staging')] and descriptor['tags'] == ['clipmkr', 'corp-infra'], 'descriptor_scope_drift')
    scripts = Path(a.corp_scripts)
    helper = scripts / 'service-freshness.py'
    s = helper.lstat()
    require(helper == helper.resolve() and stat.S_ISREG(s.st_mode) and s.st_uid == 0 and s.st_mode & 0o022 == 0, 'unsafe_corp_helper')
    spec = importlib.util.spec_from_file_location('corp_backup_freshness', helper)
    corp = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(corp)
    etc = Path(a.etc)
    local = corp.read_env(etc / 'local.env')
    repository = Path(local['RESTIC_REPOSITORY'])
    require(repository.is_absolute() and repository == repository.resolve() and repository.is_dir(), 'invalid_local_repository')
    require(local.get('RESTIC_PASSWORD') and 'RESTIC_PASSWORD_COMMAND' not in local, 'invalid_local_password_config')
    local_env = {**os.environ, **{k: v for k, v in local.items() if k in corp.ENV_FIELDS}}
    # Keep native restic's cache in the admitted repository filesystem.
    cache = repository.parent / '.clipmkr-restic-cache'
    require(not cache.is_symlink() and (not cache.exists() or cache.is_dir()), 'unsafe_cache')
    cache.mkdir(mode=0o700, exist_ok=True)
    require(cache.stat().st_uid == 0 and cache.stat().st_mode & 0o077 == 0, 'unsafe_cache_permissions')
    require(cache.stat().st_dev == repository.stat().st_dev, 'cache_filesystem_mismatch')
    local_env['RESTIC_CACHE_DIR'] = str(cache)
    attempt['component'] = 'capture'
    prepared = json.loads(run([a.prepare, '--binding', a.binding, '--root', a.root, '--repo', str(repository), '--lock', a.lock], inherited=True))
    require(re.fullmatch(r'run-[a-f0-9]{32}', prepared['runId']) is not None, 'invalid_capture_receipt')
    candidate = root / 'staging' / prepared['runId']
    require(prepared['path'] == str(candidate) and candidate == candidate.resolve(), 'invalid_capture_path')
    manifest = candidate / 'manifest.json'
    digest = hashlib.sha256(manifest.read_bytes()).hexdigest()
    require(digest == prepared['manifestSha256'], 'capture_manifest_mismatch')
    attempt.update({'runId': prepared['runId'], 'manifestSha256': digest, 'component': 'local-snapshot'})
    atomic(root / 'last-attempt.json', attempt)
    require(shutil.disk_usage(repository).free >= 7 * 1024 ** 3, 'insufficient_repository_space')
    out = run(['restic', 'backup', '--json', '--tag', 'clipmkr', '--tag', 'corp-infra', str(root / 'staging')], local_env)
    summaries = [json.loads(line) for line in out.splitlines() if line]
    ids = [v.get('snapshot_id') for v in summaries if v.get('message_type') == 'summary']
    require(len(ids) == 1 and re.fullmatch(r'[a-f0-9]{8,64}', ids[0]) is not None, 'missing_snapshot_identity')
    resolved = json.loads(run(['restic', 'snapshots', '--json', ids[0]], local_env))
    require(len(resolved) == 1 and re.fullmatch(r'[a-f0-9]{64}', resolved[0]['id']) is not None, 'ambiguous_snapshot_identity')
    snapshot = resolved[0]['id']
    attempt['snapshotId'] = snapshot
    for target, filename in [('primary', 'offsite.env'), ('secondary', 'offsite-secondary.env')]:
        attempt['component'] = target + '-copy'
        atomic(root / 'last-attempt.json', attempt)
        source = corp.read_env(etc / filename)
        require(source.get('OFFSITE_SYNC_MODE') == 'rclone-copy-immutable', 'unsupported_copy_mode')
        if target == 'secondary':
            require(source.get('OFFSITE_SECONDARY_ENABLED') == 'true', 'secondary_not_enabled')
        reader_env, _, _ = corp.repository_env(etc, target, select_route=True)
        writer = {**os.environ, **source}
        if source.get('OFFSITE_WRITE_ACCESS_KEY_ID') and source.get('OFFSITE_WRITE_SECRET_ACCESS_KEY'):
            writer.update(AWS_ACCESS_KEY_ID=source['OFFSITE_WRITE_ACCESS_KEY_ID'], AWS_SECRET_ACCESS_KEY=source['OFFSITE_WRITE_SECRET_ACCESS_KEY'])
        for key in ['HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy', 'NO_PROXY', 'no_proxy']:
            if key in reader_env:
                writer[key] = reader_env[key]
        require(all(source.get(k) for k in ['OFFSITE_BUCKET', 'OFFSITE_ENDPOINT', 'AWS_REGION']), 'incomplete_offsite_profile')
        writer.update(RCLONE_CONFIG_CORPOFFSITE_TYPE='s3', RCLONE_CONFIG_CORPOFFSITE_PROVIDER='Other',
            RCLONE_CONFIG_CORPOFFSITE_ACCESS_KEY_ID=writer['AWS_ACCESS_KEY_ID'], RCLONE_CONFIG_CORPOFFSITE_SECRET_ACCESS_KEY=writer['AWS_SECRET_ACCESS_KEY'],
            RCLONE_CONFIG_CORPOFFSITE_ENDPOINT=source['OFFSITE_ENDPOINT'], RCLONE_CONFIG_CORPOFFSITE_REGION=source['AWS_REGION'],
            RCLONE_CONFIG_CORPOFFSITE_ACL='private', RCLONE_CONFIG_CORPOFFSITE_NO_CHECK_BUCKET='true')
        remote = source['OFFSITE_BUCKET'] + ('/' + source['OFFSITE_PREFIX'] if source.get('OFFSITE_PREFIX') else '')
        run(['rclone', 'copy', str(repository), 'corpoffsite:' + remote, '--config', '/dev/null', '--immutable', '--checksum', '--fast-list', '--transfers', '2', '--checkers', '4'], writer)
        attempt['component'] = target + '-verification'
        atomic(root / 'last-attempt.json', attempt)
        reader_env['RESTIC_CACHE_DIR'] = str(cache)
        snapshots = json.loads(run(['restic', '--no-lock', 'snapshots', '--json', snapshot], reader_env))
        require(len(snapshots) == 1 and snapshots[0]['id'] == snapshot and sorted(snapshots[0].get('tags', [])) == ['clipmkr', 'corp-infra'], 'offsite_snapshot_mismatch')
        content = run(['restic', '--no-lock', 'dump', snapshot, str(manifest)], reader_env)
        require(hashlib.sha256(content).hexdigest() == digest, 'offsite_manifest_mismatch')
        attempt['copies'][target] = {'snapshotId': snapshot, 'manifestSha256': digest, 'verifiedAt': now()}
    attempt.update(status='success', component='complete', finishedAt=now())
    atomic(root / 'last-success.json', attempt)
    atomic(root / 'last-attempt.json', attempt)
    print(json.dumps(attempt, sort_keys=True))
except (Refusal, OSError, ValueError, KeyError, TypeError, subprocess.SubprocessError, corp.Problem if 'corp' in globals() else Refusal) as exc:
    attempt.update(status='failed', finishedAt=now(), reason=str(exc) if isinstance(exc, Refusal) else type(exc).__name__)
    # A busy lock holder must not race the active writer's receipt.
    if locked and root.is_dir() and not root.is_symlink():
        try:
            require(root == root.resolve() and root.stat().st_uid == 0 and root.stat().st_mode & 0o077 == 0, 'unsafe_receipt_root')
            require(private_file(root / '.clipmkr-backup-owned').read_bytes() == b'clipmkr-backup-v1\n', 'unsafe_receipt_owner')
            atomic(root / 'last-attempt.json', attempt)
        except (OSError, Refusal):
            attempt['receiptStored'] = False
    print(json.dumps(attempt, sort_keys=True), file=sys.stderr)
    sys.exit(1)
PY
