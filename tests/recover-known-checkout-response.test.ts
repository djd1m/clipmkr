import { beforeAll, describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import manifest from './fixtures/recover-known-checkout-response.bindings.json';
import { knownCheckoutIntegrationCases } from './fixtures/recover-known-checkout-response.integration';

const digest = (raw: Buffer) => crypto.createHash('sha256').update(raw).digest('hex');
const operational = process.env.CLIPMKR_RECOVERY_OPERATIONAL === '1';
if (Boolean(process.env.CLIPMKR_RECOVERY_PROFILE) !== operational) throw Error('RECOVERY_OPERATIONAL_PROFILE_REQUIRED');
let outputRoot: string;
type Summary = { passed: boolean; external: string; tests: Record<string, unknown> };
type Entry = { path: string; sha256: string };
const rows = (value: unknown) => value as Record<string, unknown>[];
type Profile = { version: number; private_root: string; output: string; sources: Record<string, Entry>; inputs: Record<string, Entry>; chrome: Entry };

function privateBytes(file: string): Buffer {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const st = fs.fstatSync(fd);
    if (!st.isFile() || (st.mode & 0o777) !== 0o600 || st.uid !== process.getuid!() || st.nlink !== 1) throw Error('RECOVERY_PRIVATE_METADATA');
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}
function profile(): Profile {
  const file = process.env.CLIPMKR_RECOVERY_PROFILE;
  if (!file || !path.isAbsolute(file)) throw Error('RECOVERY_OPERATIONAL_PROFILE_REQUIRED');
  const p = JSON.parse(privateBytes(file).toString()) as Profile;
  if (p.version !== 1 || !path.isAbsolute(p.private_root) || p.output !== p.private_root) throw Error('RECOVERY_PROFILE_INVALID');
  const root = fs.lstatSync(p.private_root);
  if (!root.isDirectory() || root.isSymbolicLink() || (root.mode & 0o777) !== 0o700 || root.uid !== process.getuid!()) throw Error('RECOVERY_PRIVATE_ROOT');
  for (const group of ['sources', 'inputs'] as const) {
    if (JSON.stringify(Object.keys(p[group]).sort()) !== JSON.stringify(Object.keys(manifest[group]).sort())) throw Error('RECOVERY_ROSTER_MISMATCH');
    for (const [role, expected] of Object.entries(manifest[group])) {
      const actual = p[group][role];
      if (!actual || !path.isAbsolute(actual.path) || path.basename(actual.path) !== expected.alias || actual.sha256 !== expected.sha256 || digest(privateBytes(actual.path)) !== expected.sha256) throw Error('RECOVERY_PRIVATE_ROSTER_DRIFT');
      if (group === 'sources' && privateBytes(actual.path).toString().split('\n').length - 1 >= 700) throw Error('RECOVERY_SOURCE_LOC');
      if (group === 'sources' && path.dirname(actual.path) !== p.private_root) throw Error('RECOVERY_SOURCE_SCOPE');
    }
  }
  if (p.chrome.sha256 !== manifest.chrome.sha256 || digest(fs.readFileSync(p.chrome.path)) !== p.chrome.sha256) throw Error('RECOVERY_CHROME_DRIFT');
  outputRoot = p.output;
  return p;
}

test('portable manifest names exact scoped roles; no operational acceptance is implied', () => {
  expect(manifest.version).toBe(1);
  expect(digest(fs.readFileSync(path.resolve('tests/recover-known-checkout-response.test.ts')))).toBe(manifest.publicTestSha256);
  expect(Object.keys(manifest.sources)).toHaveLength(6);
  expect(Object.keys(manifest.inputs)).toHaveLength(8);
  for (const [file, hash] of Object.entries(manifest.supportingReadOnly)) expect(digest(fs.readFileSync(path.resolve(file)))).toBe(hash);
  for (const group of [manifest.sources, manifest.inputs]) {
    for (const value of Object.values(group)) {
      expect(value.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(value.alias).not.toContain('/');
    }
  }
});

// Cross-module integration assertions use the same captured fixture helpers.
// Python source is reviewable test code; no generated module or reviewer probe is imported.
const integrationChecks = String.raw`import json, pathlib, runpy, sys
profile = json.loads(pathlib.Path(sys.argv[1]).read_bytes())
fixtures = runpy.run_path(profile['sources']['recovery_fixture']['path'], run_name='public_integration_fixtures')
for name in ('fixture', 'refresh', 'historical_debt', 'SimulatedRuntime', 'bridge', 'run', '_post', '_issue', '_native', '_load', '_primitive_trace', '_whole', '_reject', '_inferred', '_mutated', '_contender', '_ticket', '_action', '_reply', '_fresh', '_refuse', '_envelope', '_observer', '_reader', '_replace', '_wait_kill', 'write', 'enc', 'sha'):
    globals()[name] = fixtures[name]
import os, time, copy, fcntl, signal, select
bundle = bridge['capture_bundle'](profile)
tests = {'fence historical entries across every durable recovery boundary': {}, 'require fresh control health and positive own cleanup': {}, 'reject changed captured source and fd identity': {}, 'preserve full inventory and event bounds around known pending': {}}
def _guard_cases(b, tests):
    outcomes = []
    for role in ('route', 'controller'):
        f = fixture(b)
        operation = pathlib.Path(f['s']['directory']) / 'operation.json'
        captured = []
        path = f['s']['lock_path'] if role == 'route' else f['s']['directory'] + '/controller-bridge.lock'
        def release(stage):
            if stage == 'journal:reconciling_unknown':
                captured.append(operation.read_bytes())
                for name in os.listdir('/proc/self/fd'):
                    try:
                        target = os.readlink('/proc/self/fd/' + name)
                    except FileNotFoundError:
                        continue
                    if target == path:
                        fcntl.flock(int(name), fcntl.LOCK_UN)
        _refuse(lambda: run(b, f, hook=release), 'RECOVERY_LOCK_LOST')
        assert len(captured) == 1 and operation.read_bytes() == captured[0]
        outcomes.append({'guard': role, 'subsequentOperationWrites': 0})
    f = fixture(b)
    f['journal']['used']['other-unknown'] = {'ticket_sha': 'a' * 64, 'state': 'consumed_unknown'}
    _envelope(f)
    operation = pathlib.Path(f['s']['directory']) / 'operation.json'
    before = operation.read_bytes()
    _refuse(lambda: run(b, f), 'RECOVERY_ACTION_UNKNOWN')
    assert operation.read_bytes() == before and not list(operation.parent.glob('recovery-origin-*.snapshot'))
    for field, value, code in [('phase', 'INITIAL_RECOVERY', 'RECOVERY_PHASE_MISMATCH'), ('source_set_sha', '0' * 64, 'RECOVERY_SOURCE_MISMATCH')]:
        f = fixture(b)
        run(b, f)
        p, ticket, callback = _post(b, f)
        ticket[field] = value
        before = pathlib.Path(f['s']['directory'] + '/operation.json').read_bytes()
        calls = []
        _refuse(lambda: bridge['ordinary'](b, f['s'], p, SimulatedRuntime(f), lambda scope: calls.append(1), ticket), code)
        assert not calls and pathlib.Path(f['s']['directory'] + '/operation.json').read_bytes() == before
        outcomes.append({'guard': field, 'callbacks': 0, 'startupPersist': 0})
    f = fixture(b)
    run(b, f)
    p, ticket, callback = _post(b, f)
    response = bridge['ordinary'](b, f['s'], p, SimulatedRuntime(f), callback, ticket)
    _accepted_head(b,f,1)
    _fresh(b,f)
    follow = {**next(d for d in f['s']['ordinary_roster'] if d['id']=='ordinary-cancel-reload'), 'context_sha':'new_checkout','deadline':time.time()+60}
    _issue(b,f,response,follow,'POST_RECOVERY')
    calls = []
    _refuse(lambda: bridge['ordinary'](b, f['s'], response, SimulatedRuntime(f), lambda scope: calls.append(1), follow, 'mutating-status'), 'RECOVERY_CASE_MISMATCH')
    assert not calls
    for key in ('account_id', 'intent_id', 'store'):
        f = fixture(b, False)
        _, _, event = historical_debt(f, 'canceled', other=True)
        event[key] = 'contradiction'
        refresh(f)
        _refuse(lambda: run(b, f), 'RECOVERY_EVENT_CORRELATION')
    f = fixture(b, False)
    row, provider, _ = historical_debt(f, 'canceled', empty=True, other=True)
    f['inv']['raw']['legacy'].update(intents=[{**row, 'account_id': 'second-known-owner'}], providers=[copy.deepcopy(provider)], accounts=[{'id': 'second-known-owner', 'status': 'active'}])
    refresh(f)
    _refuse(lambda: run(b, f), 'RECOVERY_GLOBAL_CORRELATION')
    tests['reject changed captured source and fd identity']['wholeGuardRegressions'] = outcomes
    tests['preserve full inventory and event bounds around known pending']['rawCorrelationNegatives'] = 4


def _collector_cases(b,tests):
    f=fixture(b,False);runner=b['modules']['runner'];log=[]
    class DB:
        def query(self,q,p):
            log.append(q)
            if q=='SHOW transaction_read_only':return [{'transaction_read_only':'on'}]
            if q==runner['INTENT_SQL']:return f['exact']['sql']['intents']
            return []
        def identity(self):return 'main'
    def get(path,**options):
        assert options=={'timeout':5,'limit':65536,'redirects':False,'retries':0};log.append('SIMULATED.GET');return f['exact']['provider']
    result=runner['collect_exact'](f['proof']['origin'],DB(),get,sha(b['raw']['runner']),guard=bridge['_authority'](f['proof'],b['source_sha']));assert runner['validate_exact'](result,f['proof']['origin'])['classification']=='pending' and log.count('SIMULATED.GET')==1 and 'ROLLBACK' in log
    for mutate,code in [(lambda r:r['sql'].update(intents=[]),'RECOVERY_EXACT_ROWS'),(lambda r:r['sql'].update(read_only='off'),'RECOVERY_READONLY_UNKNOWN'),(lambda r:r['provider'].update(status=302),'RECOVERY_PROVIDER_TRANSPORT'),(lambda r:r['provider'].update(observed_at=time.time()-100),'RECOVERY_PROVIDER_STALE_OR_SIZE')]:
        raw=copy.deepcopy(f['exact']);mutate(raw);_refuse(lambda:runner['validate_exact'](raw,f['proof']['origin']),code)
    roundtrips = []
    for historical in (False, True):
        f = fixture(b, False)
        if historical:
            row, provider, _ = historical_debt(f, 'succeeded', empty=False, other=True)
            f['inv']['raw']['main']['payments'] = [{'id': 'history-payment', 'intent_id': row['id'], 'account_id': row['account_id'], 'provider': 'yookassa', 'provider_payment_id': provider['id'], 'amount_minor': 99000, 'status': 'succeeded', 'needs_review': False, 'created_at': row['created_at']}]
            refresh(f)
        raw_before = enc(f['inv']['raw'])
        wholelog = []
        observed,wholelog = _whole(b,f)
        inv = {**f['inv'], **observed}
        inv['repeat_raw_sha'] = sha(enc(inv['raw']))
        accepted = b['modules']['adapter']['inventory'](b['n'], inv, f['proof']['origin'], False, baseline=json.loads(f['data']['initial_runtime_spec'])['inventory'])
        assert accepted['classification'] == 'known_target_pending'
        assert enc(f['inv']['raw']) == raw_before and sum(q == 'ROLLBACK' for _, q, _ in wholelog) == 4
        for store, raw in observed['raw'].items():
            assert {p['id']: p for p in raw['providers']} == {p['id']: p for p in f['inv']['raw'][store]['providers']}
            assert all(raw[key] == f['inv']['raw'][store][key] for key in ('intents','payments','grants','events','accounts'))
        assert observed['collected_at'] >= max(p['evidence_cut'] for p in observed['history_sources'].values())
        roundtrips.append({'historicalPayment': historical, 'events': len(observed['events']), 'accepted': True, 'selectFaithful': True})
    tests['bind confirmation URL only to fresh read-only provider evidence'] = {'actualCollector': True, 'external': 'SIMULATED', 'oneGet': True, 'noRetries': True, 'wholeReadOnlyTransactions': 4, 'wholeRawUnchanged': True, 'roundtrips': roundtrips}

def _ordinary_cases(b,tests):
    f=fixture(b);run(b,f);p,t,callback=_post(b,f);calls=[];nativecalls=callback.nativecalls
    def owned(scope):
        calls.append('callback')
        return callback(scope)
    runtime=SimulatedRuntime(f)
    with _primitive_trace(b,runtime) as derivative_trace:result=bridge['ordinary'](b,f['s'],p,runtime,owned,t)
    assert len(calls)==1 and result['checkout_response_bound'] is True
    actual=b['n']['loadrecord'](f['s']['directory']+'/operation.json');assert actual['business']=='incomplete_pending' and actual['new_checkout']==result and actual['attempt']['request']['request_key']==p['request_key']
    # Original unchanged donor on a separately prepared synthetic operation, outside caller locks.
    g=fixture(b);run(b,g);n=b['n'];r=g['r'];r.update(business='reconciled',reconciled_at=0,state='applied',applied=True,business_history=copy.deepcopy(actual['business_history']));n['persist'](g['s']['directory']+'/operation.json',r)
    with _primitive_trace(b) as original_trace:oracle=n['operator_business'](g['s'],p,'checkout',lambda:{**result,'checkout_at':time.time(),'created_at':time.time()})
    original=n['loadrecord'](g['s']['directory']+'/operation.json')
    assert original['business']==actual['business'] and original['attempt']==actual['attempt'] and original['business_history']==actual['business_history'] and {k:v for k,v in oracle.items() if k not in ('checkout_at','created_at')}=={k:v for k,v in result.items() if k not in ('checkout_at','created_at')}
    negatives=[('go',False,'checkout pre-GO'),('shop','other','checkout owner/shop'),('test',False,'checkout owner/shop'),('expected_amount',1,'checkout SKU/amount'),('baseline_sha','','known request/baseline correlation'),('request_key',f['proof']['origin']['operator_key'],'historical request key')]
    for key,value,code in negatives:
        f=fixture(b);run(b,f);p,t,callback=_post(b,f);p[key]=value;t['context_sha']=sha(enc(p));_issue(b,f,p,t,'POST_RECOVERY');calls=[]
        _refuse(lambda:bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),lambda scope:calls.append(1),t),code);assert not calls
    # Same held FD actually reaches canonical revalidation, native create/revoke and callback.
    f=fixture(b,False);run(b,f);t=_ticket(b,f);create,cleanup,calls=_native(b,f,t);identities=[]
    def cb(projection,ticket,scope):
        held=os.fstat(scope['route_fd']);named=os.stat(f['s']['lock_path']);assert (held.st_dev,held.st_ino)==(named.st_dev,named.st_ino);_contender(scope);identities.append((scope['route_fd'],held.st_dev,held.st_ino));return create(projection,ticket,scope)
    _action(b,f,t,cb,cleanup);assert len(identities)==1 and calls==['session-create','session-revoke']
    tests['fence historical entries across every durable recovery boundary'].update(ordinaryCallbacks=1,originalDerivativeEquivalent=True,primitiveTraces={'original':original_trace,'derivative':derivative_trace},ordinaryGuardNegatives=len(negatives),ordinaryNativeCalls=nativecalls)
    tests['require fresh control health and positive own cleanup'].update(sameHeldRouteFD=True,contenderBlocked=True,nativeCalls=calls)

def _accepted_head(b, f, expected):
    journal = json.loads(pathlib.Path(f['s']['directory'] + '/controller-bridge.json').read_bytes())
    entries = b['modules']['runner']['_entries'](journal)
    assert len(entries) == expected and [e['generation'] for e in entries] == list(range(1, expected + 1))
    entry = entries[-1]
    assert entry['authority']['expected_generation'] == expected - 1
    assert entry['after_sha'] == sha(b'clipmkr/action-completion/v1/snapshot\0' + enc(entry['after']))
    assert entry['L']['wall'] < min(entry['authority'][key]['deadline'] for key in ('metadata_go', 'source_authority'))
    # The fixture issuer advances only after a successful observed producer call;
    # runtime does not derive fresh authority from surviving journal bytes.
    f['lineage'] = (expected, sha(b'clipmkr/action-completion/v1/entry\0' + enc(entry)))
    return entry


def _d1a_constructive(b, tests):
    f = fixture(b, False)
    run(b, f)
    t = _ticket(b, f)
    create, cleanup, calls = _native(b, f, t)
    _action(b, f, t, create, cleanup)
    assert calls == ['session-create', 'session-revoke']
    _accepted_head(b, f, 1)
    body = json.loads(f['exact']['provider']['body'])
    body.pop('confirmation')
    body.update(status='canceled', cancellation_details={'reason': 'expired_on_confirmation'})
    f['exact']['provider']['body'] = enc(body).decode()
    f['inv']['raw']['main']['providers'] = [body]
    f['proof']['phase'] = 'ACTIVE_RECONCILE'
    refresh(f)
    bridge['reconcile_bound'](b, f['s'], f['proof'], f['exact'], f['inv'], SimulatedRuntime(f))
    roster = enc(f['s']['ordinary_roster'])
    p, t, callback = _post(b, f)
    response = bridge['ordinary'](b, f['s'], p, SimulatedRuntime(f), callback, t)
    _accepted_head(b, f, 2)
    _fresh(b, f)
    descriptor = next(d for d in f['s']['ordinary_roster'] if d['id'] == 'ordinary-reload')
    follow = {**descriptor, 'context_sha': 'new_checkout', 'deadline': time.time() + 60}
    _issue(b, f, response, follow, 'POST_RECOVERY')
    create, cleanup, follow_calls = _native(b, f, follow)
    def reload(scope):
        try:
            create(None, follow, scope)
            return {'reloaded': True}
        finally:
            cleanup(scope)
    bridge['ordinary'](b, f['s'], response, SimulatedRuntime(f), reload, follow, 'mutating-status')
    _accepted_head(b, f, 3)
    reconciliation = {**p, 'intent': response['intent'], 'read_only': True, 'creation_outcome_known': True, 'ledger_reconciled': True, 'no_pending': True, 'terminal_status': 'canceled', 'provider_status': 'canceled', 'observed_at': time.time(), 'evidence_sha': 'c' * 64}
    _fresh(b, f)
    _issue(b, f, reconciliation, None, 'POST_RECOVERY')
    bridge['ordinary'](b, f['s'], reconciliation, SimulatedRuntime(f), lambda scope: (_ for _ in ()).throw(AssertionError('METADATA_CALLBACK')), None, 'reconcile')
    _accepted_head(b, f, 4)
    p2, t2, callback2 = _post(b, f, 'cancel')
    assert t2['id'] != t['id'] and t2['case'] == 'cancel' and p2['baseline_at'] > b['n']['loadrecord'](f['s']['directory'] + '/operation.json')['reconciled_at']
    second = bridge['ordinary'](b, f['s'], p2, SimulatedRuntime(f), callback2, t2)
    entry = _accepted_head(b, f, 5)
    assert second['checkout_response_bound'] is True and enc(f['s']['ordinary_roster']) == roster
    assert entry['ticket'] == t2 and entry['context'] == p2 and entry['authority']['metadata_go_sha'] == sha(enc(f['s']['recovery_authority']['metadata_go']))
    tests.setdefault('stop replay and partial recovery before callback', {})['D1a-full-legit-positive'] = {'generations': 5, 'laterCase': 'cancel', 'rosterImmutable': True, 'laterSlotNative': callback2.nativecalls, 'pendingNative': calls, 'followNative': follow_calls}




def _admin_fixture(b):
    f = fixture(b)
    _inferred(b, f)
    f['proof'].update(kind='administrative-terminal-disposition-v1', mode='administrative_terminal', phase='ADMIN_INITIAL')
    clock = json.loads(f['data']['clock'])
    clock['continuity'] = False
    f['data']['clock'] = enc(clock)
    actors = [{'role': role, 'source_sha': sha(b['raw'][role]), 'identity': str(os.getpid()) if role == 'bridge' else 'SIMULATED-' + role, 'active': role == 'bridge', 'inflight': []} for role in ('bridge', 'historical_bridge', 'launcher', 'historical_runner', 'historical_browser', 'runner', 'browser', 'native', 'inventory')]
    creates = [{'store': store, 'intent_id': row['id'], 'account_id': row['account_id'], 'browser_key': row['idempotency_key'], 'provider_id': row['provider_payment_id'], 'outcome': 'completed_saved'} for store, raw in f['inv']['raw'].items() for row in raw['intents']]
    for store, proof in f['inv']['history_sources'].items():
        proof['delivery'].update(obligations=[], obligations_complete=True, census={'source_set_sha': b['source_sha'], 'origin_sha': sha(enc(f['proof']['origin'])), 'clock_domain': proof['identity']['clock_domain'], 'from': 0, 'to': time.time(), 'actors': copy.deepcopy(actors), 'actors_count': len(actors), 'actors_sha': sha(enc(actors)), 'creates': copy.deepcopy(creates), 'creates_count': len(creates), 'creates_sha': sha(enc(creates)), 'retained': True, 'gaps': [], 'source_identity': 'SIMULATED-retained-writer-create-census'})
    observed,_=_whole(b,f)
    f['inv']={**f['inv'],**observed}
    refresh(f)
    return f


def _admin_cases(b, tests):
    f = _admin_fixture(b)
    original = enc(f['r']['attempt'])
    used = enc(f['journal']['used'])
    core = run(b, f)
    record = b['n']['loadrecord'](f['s']['directory'] + '/operation.json')
    journal = json.loads(pathlib.Path(f['s']['directory'] + '/controller-bridge.json').read_bytes())
    assert record['business'] == 'incomplete_pending' and enc(record['attempt']) == original and enc(journal['used']) == used and 'recovery' not in journal and 'active_case' not in journal
    assert core['forensic']['historical_a0'] == 'NOT_VERIFIED' and journal['administrative_disposition']['first_ordinary'] is None
    p, ticket, callback = _post(b, f)
    def archived(scope):
        current = b['n']['loadrecord'](f['s']['directory'] + '/operation.json')
        assert len(current['business_history']) == 1 and enc(current['business_history'][0]['attempt']) == original and current['business_history'][0]['response'] is None
        assert current['business_history'][0]['forensic']['browser_key'] == f['proof']['origin']['browser_key']
        return callback(scope)
    response = bridge['ordinary'](b, f['s'], p, SimulatedRuntime(f), archived, ticket)
    _accepted_head(b, f, 1)
    assert callback.nativecalls == ['session-create', 'session-revoke'] and response['checkout_response_bound'] is True
    cases = [('obligations', 'RECOVERY_ADMIN_OBLIGATIONS'), ('actors', 'RECOVERY_ADMIN_ACTORS'), ('create', 'RECOVERY_ADMIN_CREATES'), ('coverage', 'RECOVERY_ADMIN_COVERAGE'), ('current-clock', 'RECOVERY_HISTORY_CLOCK'), ('retention', 'RECOVERY_HISTORY_COVERAGE'), ('provider-paid', 'RECOVERY_PROVIDER_IDENTITY'), ('provider-reason', 'RECOVERY_TERMINAL_MISMATCH'), ('extra-unknown', 'RECOVERY_ACTION_UNKNOWN')]
    for name, code in cases:
        f = _admin_fixture(b)
        source = f['inv']['history_sources']['main']
        census = source['delivery']['census']
        if name == 'obligations': source['delivery']['obligations'] = [{'delivery': 'unknown'}]
        elif name == 'actors': census['actors'][1]['active'] = True
        elif name == 'create': census['creates'][0]['outcome'] = 'unknown'
        elif name == 'coverage': census['from'] = 1
        elif name == 'current-clock': source['coverage']['cut_clock']['continuity'] = False
        elif name == 'retention': source['coverage']['retained'] = False
        elif name.startswith('provider-'):
            body = json.loads(f['exact']['provider']['body'])
            if name == 'provider-paid': body['paid'] = True
            else: body['cancellation_details']['reason'] = 'canceled_by_merchant'
            f['exact']['provider']['body'] = enc(body).decode()
            f['inv']['raw']['main']['providers'] = [body]
        else:
            f['journal']['used']['other'] = {'state': 'consumed_unknown', 'ticket_sha': 'd' * 64}
            _envelope(f)
        census['actors_sha'], census['creates_sha'] = sha(enc(census['actors'])), sha(enc(census['creates']))
        refresh(f)
        _refuse(lambda: run(b, f), code)
        actual = json.loads(pathlib.Path(f['s']['directory'] + '/controller-bridge.json').read_bytes())
        assert 'administrative_disposition' not in actual and 'recovery_protocol' not in actual['binding']
    for mode in ('pending', 'terminal_from_origin'):
        f = _admin_fixture(b)
        f['proof'].update(kind='known-checkout-recovery-v1', mode=mode, phase='INITIAL_RECOVERY')
        refresh(f)
        _refuse(lambda: run(b, f), 'RECOVERY_ORIGIN_TIME_NOT_ESTABLISHED')
    tests.setdefault('reconcile expired origin without pending binding or actions', {})['FR6'] = {'adminOnly': True, 'unknownRetained': True, 'firstOrdinaryOnce': True, 'negativeConjuncts': len(cases), 'unknownRecoveryRefusals': 2}


def _session_cases(b,tests):
    f=fixture(b);run(b,f);p,t,callback=_post(b,f);reload={**t,'id':'ordinary-reload','helper':'browser.reload','context_sha':'new_checkout'}
    manifest={'spec':f['s'],'tickets':f['s']['ordinary_roster'],'deadline':time.time()+60};incoming,writefd=os.pipe();readfd,outgoing=os.pipe();child=os.fork()
    if child==0:
        os.close(writefd);os.close(readfd);os.dup2(incoming,0);os.dup2(outgoing,1);os.close(incoming);os.close(outgoing)
        try:bridge['session'](b,manifest,SimulatedRuntime(f))
        except BaseException:
            import traceback
            file=K/'session-child-failure.private.log';file.write_text(traceback.format_exc());file.chmod(0o600);os._exit(91)
        os._exit(0)
    os.close(incoming);os.close(outgoing);buffer=b'';messages=[]
    def send(value):os.write(writefd,enc(value)+b'\n')
    def receive():
        nonlocal buffer
        while b'\n' not in buffer:
            assert select.select([readfd],[],[],20)[0],'SESSION_PIPE_TIMEOUT';part=os.read(readfd,65536);assert part,'SESSION_CHILD_EOF';buffer+=part
        line,buffer=buffer.split(b'\n',1);value=json.loads(line);messages.append(value['type']);return value
    try:
        assert receive()['type']=='ready';send({'type':'execute','id':t['id'],'context':p,'ticket':t,'authority':f['s']['recovery_authority']});request=receive();assert request['type']=='callback'
        fd=os.open(f['s']['lock_path'],os.O_RDWR)
        try:
            try:fcntl.flock(fd,fcntl.LOCK_EX|fcntl.LOCK_NB)
            except BlockingIOError:pass
            else:raise AssertionError('SESSION_ROUTE_HANDOFF')
        finally:os.close(fd)
        at=time.time();response={**p,'checkout_at':at,'created_at':at,'checkout_response_bound':True,'intent':'synthetic-session-intent','checkout_intent':'synthetic-session-intent'}
        def reply(request,value):send({'type':'reply','id':request['id'],'request_sha':request['request_sha'],'status':'completed','result':value,'evidence':{'case_sha':'a'*64,'probe_sha':'b'*64,'helper_sha':t['helper_sha']}})
        reply(request,response);assert receive()['type']=='result';_accepted_head(b,f,1);_fresh(b,f);reload['deadline']=manifest['deadline'];_issue(b,f,response,reload,'POST_RECOVERY');send({'type':'execute','id':reload['id'],'context':response,'ticket':reload,'authority':f['s']['recovery_authority']});request=receive();assert request['type']=='callback';reply(request,{'reloaded':True});assert receive()['type']=='result'
        reconcile={**p,'intent':response['intent'],'read_only':True,'creation_outcome_known':True,'ledger_reconciled':True,'no_pending':True,'terminal_status':'canceled','provider_status':'canceled','observed_at':time.time(),'evidence_sha':'c'*64}
        _accepted_head(b,f,2);_fresh(b,f);_issue(b,f,reconcile,None,'POST_RECOVERY');send({'type':'reconcile','context':reconcile,'authority':f['s']['recovery_authority']});assert receive()['type']=='reconciled';send({'type':'close'});assert receive()['type']=='closed'
        _,status=os.waitpid(child,0);child=None;assert os.waitstatus_to_exitcode(status)==0
    finally:
        os.close(writefd);os.close(readfd)
        if child is not None:os.kill(child,signal.SIGKILL);os.waitpid(child,0)
    record=b['n']['loadrecord'](f['s']['directory']+'/operation.json');assert record['business']=='reconciled' and len(record['business_history'])==2 and record['business_history'][-1]['response']==response
    tests['fence historical entries across every durable recovery boundary']['actualProtocol']=messages

${knownCheckoutIntegrationCases}
_clock_cases(bundle, tests)
_inferred_cases(bundle, tests)
_history_cases(bundle, tests)
_ordinary_cases(bundle, tests)
_guard_matrix(bundle, tests)
_revalidate_compat(bundle, tests)
_session_cases(bundle, tests)
_guard_cases(bundle, tests)
_collector_cases(bundle, tests)
_collector_matrix(bundle, tests)
_lifecycle_cases(bundle, tests)
_admin_cases(bundle, tests)
_admin_extended(bundle, tests)
_deadline_rebind(bundle, tests)
_d1a_constructive(bundle, tests)
_late_durability(bundle, tests)
_audit_matrix(bundle, tests)
_completion_matrix(bundle, tests)
_snapshot_matrix(bundle, tests)
_prepersist_matrix(bundle, tests)
_admin_producer_kills(bundle, tests)
_snapshot_order(bundle, tests)
print(json.dumps({'passed': True, 'external': 'SIMULATED', 'tests': tests}))
`;

describe.runIf(operational)('offline operational acceptance: real local resources, external SIMULATED', () => {
  let policy: Summary;
  let browser: Summary;
  beforeAll(async () => {
    const p = profile();
    const file = process.env.CLIPMKR_RECOVERY_PROFILE!;
    const harness = await import(pathToFileURL(p.sources.capture_fixture!.path).href) as { executeFixture: (command: string, args: string[], output: string, label?: string) => Promise<Summary>; policyMatrixChecks: string };
    policy = await harness.executeFixture('python3', ['-I', '-S', p.sources.recovery_fixture!.path, file], outputRoot);
    const integration = await harness.executeFixture('python3', ['-I', '-S', '-c', harness.policyMatrixChecks + '\n' + integrationChecks, file], outputRoot, 'integration');
    for (const [title, value] of Object.entries(integration.tests)) policy.tests[title] = { ...policy.tests[title] as object, ...value as object };
    browser = await harness.executeFixture(process.execPath, [p.sources.capture_fixture!.path, file], outputRoot);
  }, 420000);

  test('reject fabricated original response and mismatched recovery', () => { expect(policy.tests['reject fabricated original response and mismatched recovery']).toMatchObject({ negativeCases: 20 }); });
  test('bind one known pending without replacing failed origin', () => { expect(policy.tests['bind one known pending without replacing failed origin']).toMatchObject({ bound: 1, callback: 0, originalUsedUnchanged: true }); });
  test('preserve full inventory and event bounds around known pending', () => {
    expect(policy.tests['preserve full inventory and event bounds around known pending']).toMatchObject({
      historicalDebtPositives: [
        { target: 'pending', historical: 'canceled', classification: 'DEFERRED_UNRESOLVED', rawOutsideTargetUnchanged: true },
        { target: 'pending', historical: 'succeeded', classification: 'DEFERRED_UNRESOLVED', rawOutsideTargetUnchanged: true },
        { target: 'terminal', historical: 'canceled', classification: 'DEFERRED_UNRESOLVED', rawOutsideTargetUnchanged: true },
        { target: 'terminal', historical: 'succeeded', classification: 'DEFERRED_UNRESOLVED', rawOutsideTargetUnchanged: true },
      ],
      historicalDebtNegativeCases: 18, genuineNoEvents: true, knownOtherOwner: true, coverageMutant: 'accepted-unknown-retention-gap', rawCorrelationNegatives: 4,
    });
  });
  test('stop replay and partial recovery before callback', () => { 
    const replay = policy.tests['stop replay and partial recovery before callback'] as Record<string, unknown>;
    expect(replay['D1a-full-legit-positive']).toEqual({ generations: 5, laterCase: 'cancel', rosterImmutable: true, laterSlotNative: ['session-create', 'session-revoke'], pendingNative: ['session-create', 'session-revoke'], followNative: ['session-create', 'session-revoke'] });
    expect(replay['QT08-deadline-only']).toEqual([{ mutant: false, startupPersists: 0, diagnostic: 'RECOVERY_ORDINARY_DEADLINE_REBIND', storedTicketUnchanged: true }, { mutant: true, startupPersists: 2, diagnostic: 'RECOVERY_SESSION_BINDING', storedTicketUnchanged: true }]);
    expect(replay['D1a-late-business-no-L']).toEqual(['pending', 'checkout', 'POST', 'reconcile'].flatMap(kind => ['file', 'directory', 'readback'].map(boundary => ({ kind, boundary, completion: false, followingCallbacks: 0 }))));
    expect(replay['D1a-live-L-late-audit-reader']).toEqual({ candidateOnly: true, producerStopped: true, readerOrder: ['journal', 'directory'], followingCallbacks: 1, liveL: true });
    expect(replay['D1a-audit-noncompletion-field-mutation']).toEqual(['state', 'phase', 'cleanup', 'used', 'health'].map(mutation => ({ mutation, completion: false, diagnostic: 'RECOVERY_AUDIT_MUTATION' })));
    expect(replay['D1a-closed-chain']).toHaveLength(8);
    expect(rows(replay['D1a-closed-chain']).every(row => row.followingEffects === 0 && String(row.diagnostic).startsWith('RECOVERY_'))).toBe(true);
    expect(replay.lawfulHealthRevalidation).toBe(true);
    expect(replay['D1a-pre-effect-capacity-binding']).toHaveLength(6);
    expect(rows(replay['D1a-pre-effect-capacity-binding']).every(row => row.startupPersists === 0 && row.nativeCalls === 0)).toBe(true);
    expect(policy.tests['stop replay and partial recovery before callback']).toMatchObject({ otherIntendedUnknownStates: 3, lateReplyStop: true, realSIGKILL: ['action:operation.json.next', 'action:controller-bridge.json.next', 'reconcile:operation.json.next'], realFlock: 2, partialEntries: ['recover', 'ordinary', 'session', 'action', 'reconcile'], closureCrashBoundaries: [...(['operation', 'journal'] as const).flatMap(target => ['before-fsync', 'after-fsync', 'before-dir-fsync', 'after-dir-fsync', 'readback'].map(point => ({ target, point, stop: target === 'journal' && ['readback', 'before-dir-fsync', 'after-dir-fsync'].includes(point) ? 'RECOVERY_WITNESS_IO' : 'RECOVERY_PARTIAL_STOP', callbacks: 0, partialPreserved: true }))), { target: 'ordinary', point: 'before-callback', stop: 'RECOVERY_ACTION_UNKNOWN', callbacks: 0, partialPreserved: true }, { target: 'ordinary', point: 'after-callback', stop: 'RECOVERY_ACTION_UNKNOWN', callbacks: 1, partialPreserved: true }] }); });
  test('reject changed captured source and fd identity', () => {
    expect((policy.tests['reject changed captured source and fd identity'] as Record<string, unknown>)['AM19-before-first-persist']).toEqual(['route', 'controller', 'host', 'source'].map(fault => ({ fault, diagnostic: fault === 'source' ? 'RECOVERY_SOURCE_MISMATCH' : fault === 'host' ? 'changed inode/metadata' : 'RECOVERY_LOCK_LOST', firstHealthPersist: 0 })));
    expect(policy.tests['reject changed captured source and fd identity']).toMatchObject({ pathReplacement: true, modeSymlinkRejected: true, runtimeLockDriftNoPersist: true, wholeGuardRegressions: [{ guard: 'route', subsequentOperationWrites: 0 }, { guard: 'controller', subsequentOperationWrites: 0 }, { guard: 'phase', callbacks: 0, startupPersist: 0 }, { guard: 'source_set_sha', callbacks: 0, startupPersist: 0 }] }); });
  test('require fresh control health and positive own cleanup', () => { expect(policy.tests['require fresh control health and positive own cleanup']).toMatchObject({ staleControlRejected: true, actualNativeSessionCases: 3, lateReplyCleanup: true, sameHeldRouteFD: true, contenderBlocked: true, nativeCalls: ['session-create', 'session-revoke'], refusalMutants: [{ mutant: 'native_leaf', positiveBroken: true, remoteCalls: 0 }, { mutant: 'own_session', positiveBroken: true, remoteCalls: 0 }, { mutant: 'skip-partial', violation: 'partial-deleted-and-callback' }, { mutant: 'skip-unknown', violation: 'second-action-callback' }, { mutant: 'route-handoff', violation: 'held-lock-lost', callback: 0 }] }); });
  test('reconcile recovered terminal without rewriting origin', () => { expect(policy.tests['reconcile recovered terminal without rewriting origin']).toMatchObject({ twoClosures: true, readerResync: true, readerOrder: ['file', 'dir'], lateBusinessStops: true, lateAuditResync: true, readerFaults: [{ fault: 'file-error', stop: 'RECOVERY_WITNESS_IO', business: 0 }, { fault: 'dir-error', stop: 'RECOVERY_WITNESS_IO', business: 0 }, { fault: 'unlink', stop: 'RECOVERY_WITNESS_IO', business: 0 }, { fault: 'replacement', stop: 'RECOVERY_WITNESS_IDENTITY', business: 0 }, { fault: 'symlink', stop: 'RECOVERY_WITNESS_IDENTITY', business: 0 }, { fault: 'lock', stop: 'RECOVERY_LOCK_IDENTITY', business: 0 }, { fault: 'readback', stop: 'RECOVERY_WITNESS_READBACK', business: 0 }, { fault: 'wrong-file', stop: 'RECOVERY_WITNESS_IDENTITY', business: 0 }, { fault: 'wrong-dir', stop: 'RECOVERY_WITNESS_IDENTITY', business: 0 }, { fault: 'late', stop: 'RECOVERY_METADATA_AUTH_EXPIRED', business: 0 }, { fault: 'lock-loss', stop: 'RECOVERY_LOCK_LOST', business: 0 }, { fault: 'host', stop: 'changed inode/metadata', business: 0 }], readerMutants: [{ mutant: 'skip-file', actualSyncOrder: ['dir'], readback: true }, { mutant: 'skip-dir', actualSyncOrder: ['file'], readback: true }, { mutant: 'wrong-fd', actualSyncOrder: ['dir', 'dir'], readback: true }, { mutant: 'skip-readback', actualSyncOrder: ['file', 'dir'], readback: false }] }); });
  test('reconcile expired origin without pending binding or actions', () => { 
    const admin = policy.tests['reconcile expired origin without pending binding or actions'] as Record<string, unknown>;
    expect(admin['AM8-snapshot-order']).toEqual(['control', 'skip-snapshot-dir', 'late-snapshot'].map(mutant => ({ mutant, diagnostic: mutant === 'control' ? null : 'SNAPSHOT_ORDER', actualFirstPersistObserved: true })));
    expect(admin.FR6).toEqual({ adminOnly: true, unknownRetained: true, firstOrdinaryOnce: true, negativeConjuncts: 9, unknownRecoveryRefusals: 2 });
    expect(admin['FR6-conjunctions']).toHaveLength(17);
    expect(rows(admin['FR6-conjunctions']).every(row => row.adminClosures === 0 || row.followingNativeCalls === 0)).toBe(true);
    expect(admin['FR6-mutants']).toEqual(['obligations', 'actor-inflight', 'unknown-create'].map(mutant => ({ mutant, forbiddenAdminClosure: true })));
    expect(admin['AM15-producer-SIGKILL']).toEqual(['finalization:L', 'witness:before-file-fsync', 'witness:after-file-fsync', 'witness:file-durable', 'witness:renamed', 'witness:directory-durable', 'witness:readback'].map((point, index) => ({ point, producerSIGKILL: true, completeCandidate: index >= 4, followingCallbacks: index >= 4 ? 1 : 0, readerResync: index >= 4 })));
    expect(admin['AM8-first-revalidation-SIGKILL']).toHaveLength(32);
    expect(rows(admin['AM8-first-revalidation-SIGKILL']).every(row => row.SIGKILL && row.followingCallbacks === 0)).toBe(true);
    expect(policy.tests['reconcile expired origin without pending binding or actions']).toMatchObject({ noEventDirect: true, failedOriginPreserved: true, callbacks: 0, sessions: 0, checkout: 0, decline: 'NOT_VERIFIED' }); });
  test('fence historical entries across every durable recovery boundary', () => { 
    const fence = policy.tests['fence historical entries across every durable recovery boundary'] as Record<string, unknown>;
    const primitiveNames = (value: unknown) => rows(value).filter(row => row.event === 'call').map(row => row.name);
    const traces = fence.primitiveTraces as Record<string, unknown>;
    expect(primitiveNames(traces.original)).toEqual(['lock_scope', 'loadrecord', 'runtime_binding', 'isolation', 'cutover', 'persist', 'admit', 'persist']);
    expect(primitiveNames(traces.derivative).filter(name => ['persist', 'admit'].includes(String(name)))).toEqual(['persist', 'persist', 'admit', 'persist']);
    expect(fence['AM13-individual-guards']).toHaveLength(22);
    expect(rows(fence['AM13-individual-guards']).every(row => row.callbacks === (row.mutant ? 1 : 0) && (row.mutant || String(row.diagnostic).length > 0))).toBe(true);
    expect(rows(fence['AM8-revalidate-compatibility']).map(row => row.ordered)).toEqual([true, false].map(() => ['control', 'bound', 'readfd', 'readfd', 'visible', 'validate', 'health', 'control', 'bound', 'readfd', 'persist']));
    expect(policy.tests['fence historical entries across every durable recovery boundary']).toMatchObject({ old812Refused: true, readerBarrier: true, ordinaryCallbacks: 1, originalDerivativeEquivalent: true, ordinaryGuardNegatives: 6, ordinaryNativeCalls: ['session-create', 'session-revoke'], readerSIGKILL: ['before-file', 'after-file', 'before-dir', 'after-dir', 'readback'], readerBusiness: 1, readerWrites: 0, fifoKills: 12, actualProtocol: ['ready', 'callback', 'result', 'callback', 'result', 'reconciled', 'closed'], producerSIGKILL: [{ point: 'finalization:L', completeSurvivor: false }, { point: 'witness:before-file-fsync', completeSurvivor: false }, { point: 'witness:after-file-fsync', completeSurvivor: false }, { point: 'witness:file-durable', completeSurvivor: false }, { point: 'witness:renamed', completeSurvivor: true }, { point: 'witness:directory-durable', completeSurvivor: true }, { point: 'witness:readback', completeSurvivor: true }] }); });
  test('preserve every canonical event predicate with one known pending', () => { expect(policy.tests['preserve every canonical event predicate with one known pending']).toMatchObject({ negativeCases: 13 }); });
  test('bind confirmation URL only to fresh read-only provider evidence', () => { 
    const collector = policy.tests['bind confirmation URL only to fresh read-only provider evidence'] as Record<string, unknown>;
    expect(collector.AM18).toHaveLength(10);
    expect(rows(collector.AM18).filter(row => row.diagnostic === null).map(row => row.case)).toEqual(['positive', 'source-clock-behind']);
    expect(rows(collector.AM18).every(row => row.actualCollectorConsumer)).toBe(true);
    expect(policy.tests['bind confirmation URL only to fresh read-only provider evidence']).toMatchObject({ actualCollector: true, oneGet: true, noRetries: true, wholeReadOnlyTransactions: 4, wholeRawUnchanged: true, roundtrips: [{ historicalPayment: false, events: 0, accepted: true, selectFaithful: true }, { historicalPayment: true, events: 1, accepted: true, selectFaithful: true }] }); });
  test('distinguish expired origin evidence from active recovery authority', () => { expect(policy.tests['distinguish expired origin evidence from active recovery authority']).toMatchObject({ validCreationBeforeResponse: true, nonzeroOffsetPositive: true, partialOverlapNegatives: 2, rawTimeNegatives: 2, independentAuthorityNegatives: 2, unknownClockCausalNegatives: 2, inferredNoResponseAtPositive: true, inferredChainNegatives: 4, meaningfulMutants: ['choose-point-accepts-outside-interval', 'zero-offset-breaks-nonzero-positive', 'skip-causal-accepts-unrelated-creation'] }); });
  test('reject private roster drift despite a valid public manifest', () => { expect(policy.tests['reject private roster drift despite a valid public manifest']).toMatchObject({ actualPrivateDriftRejected: true }); });
  test('capture actual body before navigation with one forwarded POST', () => { expect(browser.tests.capture).toEqual({ red: 20, green: 20, onePost: true }); });
  test('stop capture errors without duplicate request or secret output', () => { expect(browser.tests.errors).toEqual({ cases: 7 });
    expect(browser.tests.followup).toEqual([
      { mode: 'positive', submitted: 1, persists: 1, probes: 2, diagnostic: null },
      { mode: 'unavailable', submitted: 0, persists: 0, probes: 1, diagnostic: 'RECOVERY_FORM_UNAVAILABLE' },
      { mode: 'changed', submitted: 0, persists: 1, probes: 2, diagnostic: 'RECOVERY_FORM_UNAVAILABLE' },
      { mode: 'expired', submitted: 0, persists: 1, probes: 2, diagnostic: 'RECOVERY_FORM_UNAVAILABLE' },
      { mode: 'source-expired', submitted: 0, persists: 1, probes: 2, diagnostic: 'RECOVERY_SOURCE_AUTH_EXPIRED' },
      { mode: 'action-expired', submitted: 0, persists: 1, probes: 2, diagnostic: 'RECOVERY_ACTION_EXPIRED' },
      { mode: 'terminal', submitted: 0, persists: 0, probes: 1, diagnostic: 'RECOVERY_FOLLOWUP_NOT_PENDING' },
      { mode: 'late-persist', submitted: 0, persists: 1, probes: 2, diagnostic: 'RECOVERY_ACTION_EXPIRED' },
    ]); });
  test('observe durable capture before browser receives response', () => { expect(browser.tests.order).toEqual({ cases: 10, mutants: 4, mutationResults: ['skip-file-fsync', 'wrong-fd', 'early-fulfill', 'late-readback'].map(mutation => ({ mutation, posts: 1, observed: 1, success: true, exit: 0, durabilityObserved: false })) }); });
});
