import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { constants, openSync, closeSync, fstatSync, lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve, isAbsolute } from 'node:path';
import { clientIp } from '../apps/web/src/server/ip';

const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const bindings = {
  source: 'db0dbd2fbdae3caea1de1b9416d5c9a67596dc5f59bfff0363d2613610118087', launcher: 'b9b8ab7b8965d518f1dc4849d3dea0903696dc13200efbaa803e320cdff25892', fixture: 'e88d7e58308ff7eb6cd272c84279773eb34f0af4d6d3adf1bd45090b1b15bd7e',
  before: '4fccb901ce4825e921518bc0112b672bdbd4cccacb1f53e6d800cbf5f707b0c2',
  after: '93967c31704f6468ffd3bff5a88730b77a1048e4056d1075b227c1cf427b6c08',
};
const fragment = '\thandle /api/webhooks/yookassa-test {\n\t\trewrite * /api/webhooks/yookassa\n\t\treverse_proxy n5-clipmaker-proxy-1:80 {\n header_up X-Forwarded-For "{http.request.remote.host}, {http.request.local.host}"\n }\n\t}\n';

describe('portable TEST callback fragment and IP contracts', () => {
  it('preserves exact reviewed fragment, canonical rewrite and XFF bytes', () => {
    expect(readFileSync(resolve('deploy/test-webhook-route.caddy'), 'utf8')).toBe(fragment);
    for (const bad of [fragment.replace('n5-clipmaker-proxy-1:80', 'n5-referral-paytest-20261028:3000'),
      fragment.replace('X-Forwarded-For', 'X-Real-IP'), fragment + fragment]) expect(bad).not.toBe(fragment);
  });
  it('keeps the three application owners bound and rejects spoofed or missing hops', () => {
    for (const [path, expected] of Object.entries({
      'apps/web/src/server/billing-handler.ts': '006829ba5c6dfa94a03a02a806522e8938bedd651949a8e657021cb461c3054f',
      'apps/web/src/server/ip.ts': 'af357f46c7cad2def1629a34e85b576237fd6a5db8ca9d2249639e706c823301',
      'packages/shared/src/config.ts': 'd66cd0977b52de2331f0a630a1c79476492aea0fec6a2be5263714ba094ff12f',
    })) {
      const bytes = readFileSync(resolve(path));
      expect(digest(bytes)).toBe(expected);
      expect(digest(Buffer.concat([bytes, Buffer.from('\n/* synthetic owner byte drift */\n')]))).not.toBe(expected);
    }
    expect(clientIp(new Headers({ 'x-forwarded-for': '185.71.76.1, 198.51.100.19, 172.20.0.1, 172.21.0.1' }), 2)).toBe('198.51.100.19');
    for (const chain of ['', '172.21.0.1', 'bad, 172.20.0.1, 172.21.0.1']) {
      expect(() => clientIp(new Headers({ 'x-forwarded-for': chain }), 2)).toThrow();
    }
  });
});

// Portable checks do not imply operational acceptance. The mandatory runner selects
// this explicit profile; a missing profile or ANY missing/mismatched binding fails.
const operational = process.env.CLIPMKR_CALLBACK_OPERATIONAL === '1';
const profilePath = process.env.CLIPMKR_CALLBACK_PROFILE;
if (Boolean(profilePath) !== operational) throw new Error('Operational acceptance requires an explicit private input/output profile');

type Profile = { version: 2; source: string; launcher: string; fixture: string; before: string; after: string; output: string;
  bindings: typeof bindings };
function captured(path: string): Buffer {
  if (!isAbsolute(path)) throw new Error('Private profile paths must be absolute');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile()) throw new Error('Private input must be a regular file');
    return readFileSync(fd);
  } finally { closeSync(fd); }
}
function loadProfile(path: string): Profile {
  const p: unknown = JSON.parse(captured(path).toString());
  if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('Invalid operational profile');
  const input = p as Profile;
  if (input.version !== 2 || !input.bindings || Object.keys(input.bindings).length !== 5 || (Object.keys(bindings) as (keyof typeof bindings)[]).some(key => input.bindings[key] !== bindings[key])) throw new Error('Exact private bindings required');
  for (const key of ['source', 'launcher', 'fixture', 'before', 'after'] as const) {
    if (typeof input[key] !== 'string' || digest(captured(input[key])) !== bindings[key]) throw new Error(`Private ${key} binding mismatch`);
  }
  if (typeof input.output !== 'string' || !isAbsolute(input.output)) throw new Error('Explicit private output required');
  const output = lstatSync(input.output);
  if (!output.isDirectory() || output.isSymbolicLink() || (output.mode & 0o777) !== 0o700 || output.uid !== process.getuid?.()) throw new Error('Private output must be own directory0700');
  return input;
}
const revalidationRegressions = String.raw`
def r3_closed(f, captured, label):
    calls=[];p=context()
    try:
        captured['operator_business'](f.s,p,'checkout',lambda:(calls.append('fixture-only') or response(p)))
    except (RuntimeError,OSError,ValueError,KeyError):
        pass
    applied=captured['loadrecord'](f.directory+'/operation.json')['applied']
    assert not applied and calls==[], (label,'stale business admission',applied,len(calls))

def r3_failed(failure):
    with Fixture() as f:
        assert f.run()['applied']
        f.s['action']='revalidate';original_validate=f.a.validate;release=f.s['release']
        if failure=='health':f.a.fault=('503','after')
        if failure=='bytes':
            with open(f.path,'r+b') as stream:stream.write(b'own drift');stream.flush();os.fsync(stream.fileno())
        if failure=='unknown':
            def unknown(*args,**kwargs):raise n['Uncontrolled']('simulated completion unknown')
            f.a.validate=unknown
        if failure=='binding':f.s['release']='b'*40
        marker_before=read(f.directory+'/operation.json');file_before=read(f.path)
        reloads=f.a.calls.count(('reload',))
        reject(f.run)
        f.s['release']=release
        r3_closed(f,n,failure)
        assert read(f.directory+'/operation.json')==marker_before and read(f.path)==file_before
        assert f.a.calls.count(('reload',))==reloads
        # After simulated completion/control is known again, a full new successful
        # revalidation can admit a new call. Byte reset is only fixture repair.
        f.a.fault=None;f.a.validate=original_validate
        if failure=='bytes':
            fd=os.open(f.path,os.O_RDWR|os.O_NOFOLLOW)
            try:n['fullwrite'](fd,new,time.monotonic()+1)
            finally:os.close(fd)
        assert f.run()['applied']
        calls=[];p=context()
        n['operator_business'](f.s,p,'checkout',lambda:(calls.append('fixture-positive') or response(p)))
        assert calls==['fixture-positive']
        print(json.dumps({'r3_failure':failure,'failed_business_calls':0,'successful_retry_calls':len(calls)}))

def r3_final_bound():
    observations=[]
    for origin in ('final-kill','same','fresh'):
        for phase in ('health','control'):
            for kind in ('bytes','inode'):
                with Fixture() as f:
                    if origin=='final-kill':
                        child=os.fork()
                        if child==0:
                            real_replace=os.replace
                            def replace(src,dst):
                                real_replace(src,dst)
                                if dst.endswith('operation.json') and json.loads(read(dst))['record']['state']=='healthy_unconfirmed':
                                    os.kill(os.getpid(),signal.SIGKILL)
                            os.replace=replace
                            try:f.run()
                            except BaseException:os._exit(91)
                            os._exit(92)
                        _,status=os.waitpid(child,0)
                        assert os.WIFSIGNALED(status) and os.WTERMSIG(status)==signal.SIGKILL
                    else:assert f.run()['applied']
                    captured=n if origin=='same' else launch['capture'](source,source_sha,source_sha,launcher_sha)
                    def drift():
                        if kind=='inode':
                            os.rename(f.path,f.path+'.old-inode')
                            with open(f.path,'wb') as stream:stream.write(new);stream.flush();os.fsync(stream.fileno())
                        else:
                            with open(f.path,'r+b') as stream:stream.write(b'own after-H drift');stream.flush();os.fsync(stream.fileno())
                    health=f.a.health;control=f.a.control;controls=[0]
                    def after_health(name):
                        receipt=health(name)
                        if name=='after' and phase=='health':drift()
                        return receipt
                    def after_control():
                        receipt=control();controls[0]+=1
                        if controls[0]==2 and phase=='control':drift()
                        return receipt
                    f.a.health=after_health;f.a.control=after_control;f.s['action']='revalidate'
                    marker_before=read(f.directory+'/operation.json');reloads=f.a.calls.count(('reload',))
                    refused=False
                    try:captured['operate'](f.s,f.a)
                    except (RuntimeError,OSError,ValueError,KeyError):refused=True
                    r3_closed(f,captured,(origin,phase,kind))
                    assert refused, ('revalidation ignored drift',origin,phase,kind)
                    assert read(f.directory+'/operation.json')==marker_before and f.a.calls.count(('reload',))==reloads
                    observations.append({'origin':origin,'phase':phase,'mutation':kind,'business_calls':0})
    print(json.dumps({'r3_final_bound':observations}))

def r3_fork_and_capture():
    with Fixture() as f:
        assert f.run()['applied']
        child=os.fork()
        if child==0:
            try:r3_closed(f,n,'fork must not inherit process receipt')
            except BaseException:os._exit(93)
            os._exit(0)
        _,status=os.waitpid(child,0)
        assert os.WIFEXITED(status) and os.WEXITSTATUS(status)==0
        assert f.record()['applied']  # Child refusal did not write metadata.
        fresh=launch['capture'](source,source_sha,source_sha,launcher_sha)
        r3_closed(f,fresh,'fresh capture before revalidation')
        f.s['action']='revalidate'
        assert fresh['operate'](f.s,f.a)['applied']
        calls=[];p=context()
        fresh['operator_business'](f.s,p,'checkout',lambda:(calls.append('fixture-positive') or response(p)))
        assert calls==['fixture-positive']
        print(json.dumps({'r3_fork_calls':0,'r3_fresh_capture_calls_before_revalidation':0,'positive_after_revalidation':1}))

cases.update({'r3-revalidate-health':lambda:r3_failed('health'),'r3-revalidate-bytes':lambda:r3_failed('bytes'),
              'r3-revalidate-unknown':lambda:r3_failed('unknown'),'r3-revalidate-binding':lambda:r3_failed('binding'),
              'r3-final-bound':r3_final_bound,'r3-fork-and-capture':r3_fork_and_capture})
def entry_failure(failure):
    with Fixture() as f:
        assert f.run()['applied']
        f.s['action']='revalidate'
        marker=f.directory+'/operation.json';marker_before=read(marker)
        real_open=os.open;real_read=os.read
        restore=lambda:None;child=None;pipes=[]
        if failure=='directory-lstat':
            saved=f.directory+'.saved';os.rename(f.directory,saved)
            restore=lambda:os.rename(saved,f.directory)
        elif failure=='lock-open':
            saved=f.s['lock_path']+'.saved';os.rename(f.s['lock_path'],saved);os.mkdir(f.s['lock_path'])
            def restore():os.rmdir(f.s['lock_path']);os.rename(saved,f.s['lock_path'])
        elif failure=='lock-busy':
            rr,rw=os.pipe();er,ew=os.pipe();pipes=[rr,rw,er,ew];child=os.fork()
            if child==0:
                fd=os.open(f.s['lock_path'],os.O_RDWR|os.O_NOFOLLOW);fcntl.flock(fd,fcntl.LOCK_EX)
                os.write(rw,b'1');os.read(er,1);os._exit(0)
            assert os.read(rr,1)==b'1'
            def restore():
                os.write(ew,b'1');os.waitpid(child,0)
                for fd in pipes:os.close(fd)
        elif failure in ('config-missing','config-symlink'):
            saved=f.path+'.saved';os.rename(f.path,saved)
            if failure=='config-symlink':os.symlink(saved,f.path)
            def restore():
                if os.path.islink(f.path):os.unlink(f.path)
                os.rename(saved,f.path)
        elif failure=='config-open':
            def failed_open(path,flags,*args,**kwargs):
                if path==f.path and flags & os.O_RDWR:raise PermissionError('owned syscall-boundary injection')
                return real_open(path,flags,*args,**kwargs)
            os.open=failed_open
        elif failure=='marker-corrupt':
            with open(marker,'wb') as stream:stream.write(b'{corrupt');stream.flush();os.fsync(stream.fileno())
            def restore():
                with open(marker,'wb') as stream:stream.write(marker_before);stream.flush();os.fsync(stream.fileno())
        elif failure=='marker-read':
            identity=os.stat(marker)
            def failed_read(fd,size):
                st=os.fstat(fd)
                if (st.st_dev,st.st_ino)==(identity.st_dev,identity.st_ino):raise OSError('owned marker fd read injection')
                return real_read(fd,size)
            os.read=failed_read
        else:raise AssertionError('unknown fixture failure')
        adapter_count=len(f.a.calls)
        try:reject(f.run)
        finally:
            os.open=real_open;os.read=real_read;restore()
        assert len(f.a.calls)==adapter_count and read(marker)==marker_before
        f.same(new)
        calls=[];p=context()
        try:n['operator_business'](f.s,p,'checkout',lambda:(calls.append('fixture-only') or response(p)))
        except (RuntimeError,OSError,ValueError,KeyError):pass
        applied=f.record()['applied']
        assert not applied and not calls,(failure,'stale confirmation',applied,len(calls))
        # Only after the own filesystem/syscall fixture is restored: full exact revalidation.
        assert f.run()['applied']
        n['operator_business'](f.s,p,'checkout',lambda:(calls.append('positive') or response(p)))
        assert calls==['positive']
        print(json.dumps({'entry_failure':failure,'failed_business_calls':0,'positive_after_exact_revalidation':1}))

def entry_namespace_controls():
    with Fixture() as a, Fixture() as b:
        assert a.run()['applied']
        other=launch['capture'](source,source_sha,source_sha,launcher_sha)
        assert other['operate'](b.s,b.a)['applied'] and a.record()['applied']
        child=os.fork()
        if child==0:
            try:
                reject(lambda:n['operate']({},a.a))
                assert not a.record()['applied']
            except BaseException:os._exit(91)
            os._exit(0)
        _,status=os.waitpid(child,0)
        assert os.WIFEXITED(status) and os.WEXITSTATUS(status)==0 and a.record()['applied']
        reject(lambda:n['operate']({},a.a))
        assert not a.record()['applied'] and other['loadrecord'](b.directory+'/operation.json')['applied']
        a.s['action']='revalidate';assert a.run()['applied']
        fresh=launch['capture'](source,source_sha,source_sha,launcher_sha)
        assert not fresh['loadrecord'](a.directory+'/operation.json')['applied']
        fresh['operate'](a.s,a.a)
        calls=[];p=context();fresh['operator_business'](a.s,p,'checkout',lambda:(calls.append('positive') or response(p)))
        assert calls==['positive']
    print(json.dumps({'separate_namespace_preserved':True,'parent_receipt_preserved_after_fork':True,'fresh_requires_revalidation':True}))

def entry_direct_helper():
    with Fixture() as f:
        assert f.run()['applied'];f.a.fault=('503','after')
        lock=os.open(f.s['lock_path'],os.O_RDWR|os.O_NOFOLLOW);fd=os.open(f.path,os.O_RDWR|os.O_NOFOLLOW)
        try:
            fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
            reject(lambda:n['revalidate'](fd,f.s,f.a,f.record(),f.directory+'/operation.json'))
        finally:os.close(fd);os.close(lock)
        calls=[];p=context()
        try:n['operator_business'](f.s,p,'checkout',lambda:(calls.append('bad') or response(p)))
        except (RuntimeError,OSError,ValueError,KeyError):pass
        assert not calls and not f.record()['applied']

cases.update({('entry-'+failure):(lambda failure=failure:entry_failure(failure)) for failure in
 ('directory-lstat','lock-open','lock-busy','config-missing','config-symlink','config-open','marker-corrupt','marker-read')})
cases['entry-namespace-controls']=entry_namespace_controls

cases['entry-direct-helper']=entry_direct_helper
`;
if (operational) {
  const p = loadProfile(profilePath!);
  const driver = captured(p.fixture);
  const entry = '\ncases[case]()';
  const original = driver.toString();
  if (original.split(entry).length !== 2) throw new Error('Exact fixture entry required');
  const program = original.replace(entry, `\n${revalidationRegressions}${entry}`);
  const fixture = (name: string) => {
    if (digest(driver) !== bindings.fixture) throw new Error('Captured fixture binding mismatch');
    const result = spawnSync('python3', ['-I', '-S', '-c', program, p.source, p.launcher,
      bindings.source, bindings.launcher, process.cwd(), p.output, name, p.before, p.after, bindings.before, bindings.after],
    { encoding: 'utf8', timeout: 15000 });
    const fd = openSync(resolve(p.output, 'fixture-execution.raw.jsonl'), constants.O_CREAT | constants.O_WRONLY | constants.O_APPEND | constants.O_NOFOLLOW, 0o600);
    try {
      const info = fstatSync(fd);
      if (!info.isFile() || info.uid !== process.getuid?.() || (info.mode & 0o777) !== 0o600) throw new Error('Private output log owner/mode');
      writeFileSync(fd, `${JSON.stringify({ case: name, driverSHA: digest(program), sourceSHA: bindings.source, launcherSHA: bindings.launcher, status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr, error: result.error?.message })}\n`);
    } finally { closeSync(fd); }
    expect(result.stderr, result.stdout).toBe('');
    expect(result.status, result.stderr).toBe(0);
  };
  describe('mandatory private operational acceptance — actual captured executor', () => {
    for (const [name, title] of Object.entries({
      route: 'reject legacy upstream, collateral bytes, XFF drift and stale source/inode',
      crash: 'recover interrupted write from durable marker', health: 'reject degraded or unknown health within deadline',
      concurrency: 'refuse concurrent operation or uncontrolled reload', pending: 'block unsafe cutover and rollback with pending ownership',
      writes: 'handle partial write and sync failure without false applied', transports: 'execute native transport controls with simulated observations',
      binding: 'reject substituted executor before any write', oracle: 'reject uncorrelated payment and paid capability evidence',
      permission: 'reject historical or nonapproved intent before business request',
    })) it(title, () => fixture(name));
    for (const condition of ['QE-PRIMARY-01', 'QE-PRIMARY-02', 'QE-PRIMARY-03', 'QE-PRIMARY-04', 'QESEC-01', 'QESEC-02', 'QESEC-03', 'QEARCH-01', 'QEARCH-02', 'QEARCH-03', 'QEARCH-04', 'completion-revalidation', 'r3-revalidate-health', 'r3-revalidate-bytes', 'r3-revalidate-unknown', 'r3-revalidate-binding', 'r3-final-bound', 'r3-fork-and-capture', 'entry-directory-lstat', 'entry-lock-open', 'entry-lock-busy', 'entry-config-missing', 'entry-config-symlink', 'entry-config-open', 'entry-marker-corrupt', 'entry-marker-read', 'entry-namespace-controls', 'entry-direct-helper']) {
      it(`regression ${condition}`, () => fixture(condition));
    }
  });
}
