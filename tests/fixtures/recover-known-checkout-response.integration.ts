// Verbatim test-only Python cases for the existing operational runner.
export const knownCheckoutIntegrationCases = String.raw`def _clock_cases(b,tests):
    f=fixture(b);run(b,f)
    def times(f,start,click,created,response,end,offset):
        o=f['proof']['origin'];o.update(start=start,click_at=click,created_at=created,response_at=response,deadline=end)
        case=json.loads(f['origins']['case']);case.update(windowStart=start,checkoutClickAt=click);f['origins']['case']=enc(case)
        go=json.loads(f['origins']['go']);go.update(start=start,deadline=end);f['origins']['go']=enc(go)
        http=json.loads(f['origins']['http']);http['response_at']=response;f['origins']['http']=enc(http)
        req=f['r']['attempt']['request'];req.update(baseline_at=start-2,go_at=start-1)
        cb=json.loads(f['origins']['callback']);cb['context'].update(req);cb['deadline']=end;f['origins']['callback']=enc(cb);o['callback_sha']=sha(enc(cb))
        m=json.loads(f['origins']['manifest']);m['tickets'][0].update(context_sha=sha(enc(cb['context'])),deadline=end);m['deadline']=end;f['origins']['manifest']=enc(m);o['ticket_sha']=sha(enc(m['tickets'][0]));f['journal']['used'][o['ticket']]['ticket_sha']=o['ticket_sha'];_envelope(f)
        f['exact']['sql']['intents'][0]['created_at']=created;f['inv']['raw']['main']['intents'][0]['created_at']=created
        c=json.loads(f['data']['clock']);c.update(offset_min=offset[0],offset_max=offset[1]);f['data']['clock']=enc(c);a=json.loads(f['data']['creation']);a['created_at']=created;f['data']['creation']=enc(a);refresh(f)
    f=fixture(b);times(f,1000,1010,1250,1090,1100,(198,202));run(b,f)
    for offset in [(198,260),(140,202)]:
        f=fixture(b);times(f,1000,1010,1250,1090,1100,offset);_refuse(lambda:run(b,f),'RECOVERY_ORIGIN_WINDOW_MISMATCH')
    for field in ('checkoutClickAt','windowStart'):
        def mutate(f,field=field):case=json.loads(f['origins']['case']);case[field]=0;f['origins']['case']=enc(case)
        _reject(b,mutate,'RECOVERY_ORIGIN_WINDOW_MISMATCH')
    for role,code in [('metadata_go','RECOVERY_METADATA_AUTH_EXPIRED'),('source_authority','RECOVERY_SOURCE_AUTH_EXPIRED')]:_reject(b,lambda f,role=role:f['proof'][role].update(deadline=time.time()-1),code)
    for kind,code in [('clock','RECOVERY_ORIGIN_TIME_NOT_ESTABLISHED'),('causal','RECOVERY_ORIGIN_CAUSAL_MISMATCH')]:
        def mutate(f,kind=kind):
            role='clock' if kind=='clock' else 'creation';d=json.loads(f['data'][role]);d.update(continuity=False) if kind=='clock' else d.update(intent='wrong');f['data'][role]=enc(d)
        _reject(b,mutate,code)
    mutants=[]
    old="start <= created[0] <= created[1] <= end and o['click_at'] <= created[0] and created[1] <= upper"
    mutant,module=_mutated(b,'adapter',old,"start <= sum(created)/2 <= end and o['click_at'] <= sum(created)/2 <= upper")
    f=fixture(mutant,False);times(f,1000,1010,1250,1090,1100,(198,260));assert run(mutant,f)['classification']=='pending';mutants.append('choose-point-accepts-outside-interval')
    mutant,module=_mutated(b,'adapter',"created = (o['created_at']-high, o['created_at']-low)","created = (o['created_at'], o['created_at'])")
    f=fixture(mutant);times(f,1000,1010,1250,1090,1100,(198,202));_refuse(lambda:run(mutant,f),'RECOVERY_ORIGIN_WINDOW_MISMATCH');mutants.append('zero-offset-breaks-nonzero-positive')
    old="need(creation.get('request_sha') == sha(raw['browser_request']) and creation.get('intent') == o['intent'] and creation.get('provider_id') == o['provider_id'] and creation.get('created_at') == o['created_at'] and creation.get('account') == o['account'] and creation.get('browser_key') == o['browser_key'], 'RECOVERY_ORIGIN_CAUSAL_MISMATCH')"
    mutant,module=_mutated(b,'adapter',old,"need(True, 'RECOVERY_ORIGIN_CAUSAL_MISMATCH')")
    f=fixture(mutant,False);d=json.loads(f['data']['creation']);d['intent']='unrelated';f['data']['creation']=enc(d);refresh(f);assert run(mutant,f)['classification']=='pending';mutants.append('skip-causal-accepts-unrelated-creation')
    tests['distinguish expired origin evidence from active recovery authority']={'validCreationBeforeResponse':True,'nonzeroOffsetPositive':True,'partialOverlapNegatives':2,'rawTimeNegatives':2,'independentAuthorityNegatives':2,'unknownClockCausalNegatives':2,'meaningfulMutants':mutants}

def _history_cases(b,tests):
    positives=[]
    for direct in (False,True):
        for status in ('canceled','succeeded'):
            f=fixture(b,direct);row,p,e=historical_debt(f,status,empty=True,other=True);before=enc(f['inv']['raw']);result=run(b,f);j=json.loads(pathlib.Path(f['s']['directory']+'/controller-bridge.json').read_bytes());debt=j['recovery']['historical_debts'];assert enc(f['inv']['raw'])==before and debt[0]['classification']=='DEFERRED_UNRESOLVED' and f['inv']['isolation']['allowlist']==[f['proof']['origin']['account']]
            positives.append({'target':'terminal' if direct else 'pending','historical':status,'classification':'DEFERRED_UNRESOLVED','rawOutsideTargetUnchanged':True})
    negatives=[('owner','RECOVERY_HISTORY_OWNER'),('store','RECOVERY_HISTORY_STORE'),('coverage','RECOVERY_HISTORY_COVERAGE'),('delivery','RECOVERY_HISTORY_DELIVERY'),('truncated','RECOVERY_HISTORY_SCAN'),('pending','RECOVERY_OTHER_PENDING'),('amount','RECOVERY_HISTORY_AMOUNT'),('correlation','RECOVERY_HISTORY_CORRELATION'),('baseline','RECOVERY_HISTORY_BASELINE')]
    for status in ('canceled','succeeded'):
        for name,code in negatives:
            f=fixture(b,False);row,p,e=historical_debt(f,status,empty=True,other=True);h=f['inv']['history_sources']['main']
            if name=='owner':f['inv']['raw']['main']['accounts']=[]
            elif name=='store':h['identity']['store']='wrong'
            elif name=='coverage':h['coverage']['gaps']=['unknown']
            elif name=='delivery':h['delivery']['no_active_delivery']=False
            elif name=='truncated':h['scans']['events']['truncated']=True
            elif name=='pending':p.update(status='pending',paid=False)
            elif name=='amount':p['amount']['value']='0.01'
            elif name=='correlation':p['metadata']['order_id']='wrong'
            else:f['r']['inventory_sha']='0'*64;_envelope(f)
            refresh(f);before=enc(f['inv']['raw']);_refuse(lambda:run(b,f),code);assert enc(f['inv']['raw'])==before
    tests['preserve full inventory and event bounds around known pending']={'historicalDebtPositives':positives,'historicalDebtNegativeCases':18,'genuineNoEvents':True,'knownOtherOwner':True}

def _inferred_cases(b,tests):
    f=fixture(b);_inferred(b,f);run(b,f);assert 'response_at' not in f['proof']['origin']
    for role,key,value,code in [('helper_attempt','ticketId','other','RECOVERY_ORIGIN_CAUSAL_MISMATCH'),('bridge_execute','id','other','RECOVERY_ORIGIN_CAUSAL_MISMATCH'),('clock','continuity',False,'RECOVERY_ORIGIN_TIME_NOT_ESTABLISHED')]:
        f=fixture(b);_inferred(b,f);doc=json.loads(f['data'][role]);doc[key]=value;f['data'][role]=enc(doc);refresh(f);_refuse(lambda:run(b,f),code)
    f=fixture(b);_inferred(b,f);http=json.loads(f['origins']['http']);http.update(kind='observed_response',status=201);f['origins']['http']=enc(http);refresh(f);_refuse(lambda:run(b,f),'RECOVERY_HTTP_ORIGIN')
    tests['distinguish expired origin evidence from active recovery authority'].update(inferredNoResponseAtPositive=True,inferredChainNegatives=4)

def _lifecycle_cases(b,tests):
    f=fixture(b,False);run(b,f);t=_ticket(b,f);create,cleanup,calls=_native(b,f,t);original=f['s']['directory']+'/original-revoked.json';write(original,b'{"revoked":true}')
    _action(b,f,t,create,cleanup);assert calls==['session-create','session-revoke'] and pathlib.Path(original).read_bytes()==b'{"revoked":true}'
    for kind,code in [('owner','RECOVERY_CLEANUP_UNKNOWN'),('unknown','RECOVERY_CLEANUP_UNKNOWN')]:
        f=fixture(b,False);run(b,f);t=_ticket(b,f);create,cleanup,calls=_native(b,f,t,kind)
        _refuse(lambda:_action(b,f,t,create,cleanup),code);assert calls and calls[0]=='session-create'
    for prior in ('consumed_unknown','response_received','cleanup_unknown'):
        f=fixture(b,False);run(b,f);t=_ticket(b,f);j=json.loads(pathlib.Path(f['s']['directory']+'/controller-bridge.json').read_bytes());j['recovery']['actions']={'old':{'state':prior,'cleanup':{'account':f['proof']['origin']['account'],'verified':True,'revoked':True}}};_replace(f['s']['directory']+'/controller-bridge.json',enc(j));called=[]
        _refuse(lambda:_action(b,f,_ticket(b,f,'reload'),lambda *a:called.append(1)),'RECOVERY_ACTION_UNKNOWN');assert not called
    f=fixture(b,False);run(b,f);t=_ticket(b,f);t['deadline']=time.time()+2;create,cleanup,calls=_native(b,f,t)
    def late(p,t,scope):result=create(p,t,scope);time.sleep(2.3);return result
    _refuse(lambda:_action(b,f,t,late,cleanup),'RECOVERY_METADATA_AUTH_EXPIRED');j=json.loads(pathlib.Path(f['s']['directory']+'/controller-bridge.json').read_bytes());assert j['recovery']['actions'][t['id']]['state']=='consumed_unknown' and calls==['session-create','session-revoke']
    f=fixture(b);f['proof']['metadata_go']['deadline']=time.time()+.15;refresh(f)
    def delay(stage):
        if stage=='journal:reconciling_unknown':time.sleep(.25)
    _refuse(lambda:run(b,f,hook=delay),'RECOVERY_METADATA_AUTH_EXPIRED');assert not os.path.exists(f['s']['directory']+'/recovery-finalization.private.json')
    tests['require fresh control health and positive own cleanup'].update(actualNativeSessionCases=3,lateReplyCleanup=True)
    tests['stop replay and partial recovery before callback']={'otherIntendedUnknownStates':3,'lateReplyStop':True}

def _late_durability(b, tests):
    rows=[]
    for kind in ('pending','checkout','POST','reconcile'):
        for boundary in ('file','directory','readback'):
            f=fixture(b,kind!='pending');run(b,f);p=t=callback=None
            if kind=='pending':
                t=_ticket(b,f);create,cleanup,_=_native(b,f,t)
            else:
                p,t,callback=_post(b,f)
                if kind in ('POST','reconcile'):
                    response=bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t);_accepted_head(b,f,1);_fresh(b,f)
                    if kind=='POST':
                        p=response;t={**next(d for d in f['s']['ordinary_roster'] if d['id']=='ordinary-submit'),'context_sha':'new_checkout','deadline':time.time()+60};_issue(b,f,p,t,'POST_RECOVERY');create,cleanup,_=_native(b,f,t)
                        def callback(scope):
                            try:create(None,t,scope);return {'submitted':True}
                            finally:cleanup(scope)
                    else:p={**p,'intent':response['intent'],'read_only':True,'creation_outcome_known':True,'ledger_reconciled':True,'no_pending':True,'terminal_status':'canceled','provider_status':'canceled','observed_at':time.time(),'evidence_sha':'c'*64};t=None;_issue(b,f,p,t,'POST_RECOVERY')
            deadline=time.time()+3
            if t is not None:t['deadline']=deadline
            if kind!='pending':
                if t is not None:_issue(b,f,p,t,'POST_RECOVERY')
                else:f['s']['recovery_authority']['metadata_go']['deadline']=deadline
            native_sync,native_read=os.fsync,os.read;seen=[];following=[]
            def delay(path):
                if seen or (boundary=='directory' and path!=f['s']['directory']) or (boundary=='file' and path!=f['s']['directory']+'/controller-bridge.json.next') or (boundary=='readback' and path!=f['s']['directory']+'/controller-bridge.json'):return
                file=pathlib.Path(f['s']['directory']+'/controller-bridge.json'+('.next' if boundary=='file' else ''));j=json.loads(file.read_bytes());slot=j.get('recovery',{}).get('actions',{}).get(t['id'],{}) if kind=='pending' else j.get('used',{}).get(t['id'],{}) if t else {}
                staged=slot.get('state')=='canonical_returned' and 'completion' not in slot if t else j.get('ordinary',{}).get('state')=='reconciled' and not j['ordinary']['completions']
                if staged:seen.append(True);time.sleep(max(0,deadline-time.time())+.03)
            def sync(fd):
                result=native_sync(fd)
                if boundary!='readback':delay(os.readlink('/proc/self/fd/'+str(fd)))
                return result
            def read(fd,size):
                value=native_read(fd,size)
                if not value and boundary=='readback':delay(os.readlink('/proc/self/fd/'+str(fd)))
                return value
            os.fsync,os.read=sync,read
            try:
                code='RECOVERY_METADATA_AUTH_EXPIRED' if kind in ('pending','reconcile') else 'RECOVERY_ACTION_EXPIRED'
                _refuse(lambda:_action(b,f,t,create,cleanup) if kind=='pending' else bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t,'checkout' if kind=='checkout' else kind),code)
            finally:os.fsync,os.read=native_sync,native_read
            assert seen==[True]
            if kind=='pending':_refuse(lambda:_action(b,f,_ticket(b,f,'reload'),lambda *args:following.append(1)),'RECOVERY_ACTION_UNKNOWN')
            else:
                next_p,next_t,_=_post(b,f,'cancel');_refuse(lambda:bridge['ordinary'](b,f['s'],next_p,SimulatedRuntime(f),lambda scope:following.append(1),next_t),'RECOVERY_ACTION_UNKNOWN')
            assert not following and len(b['modules']['runner']['_entries'](json.loads(pathlib.Path(f['s']['directory']+'/controller-bridge.json').read_bytes())))==(1 if kind in ('POST','reconcile') else 0)
            rows.append({'kind':kind,'boundary':boundary,'completion':False,'followingCallbacks':0})
    tests['stop replay and partial recovery before callback']['D1a-late-business-no-L']=rows





def _admin_extended(b,tests):
    rows=[]
    cases=[('payment','RECOVERY_TARGET_PAYMENT'),('grant','RECOVERY_TARGET_GRANT'),('history','RECOVERY_HISTORY_INCOMPLETE'),('delivery','RECOVERY_HISTORY_DELIVERY'),('inflight','RECOVERY_INVENTORY_INFLIGHT'),('provider-pending','RECOVERY_TARGET_CLASSIFICATION'),('owner','RECOVERY_HISTORY_OWNER'),('actor-source','RECOVERY_ADMIN_ACTORS'),('actor-inflight','RECOVERY_ADMIN_ACTORS'),('actor-missing','RECOVERY_ADMIN_ACTORS'),('create-missing','RECOVERY_ADMIN_CREATES'),('create-orphan','RECOVERY_ADMIN_CREATES'),('census-source','RECOVERY_ADMIN_CENSUS')]
    for name,code in cases:
        f=_admin_fixture(b);o=f['proof']['origin'];source=f['inv']['history_sources']['main'];census=source['delivery']['census'];raw=f['inv']['raw']['main']
        if name=='payment':raw['payments']=[{'id':'target-payment','intent_id':o['intent'],'provider_payment_id':o['provider_id']}]
        elif name=='grant':raw['grants']=[{'id':'target-grant','account_id':o['account'],'payment_ref':o['intent']}]
        elif name=='history':f['inv']['history_complete']=False
        elif name=='delivery':source['delivery']['no_active_delivery']=False
        elif name=='inflight':f['inv']['no_inflight']=False
        elif name=='owner':raw['accounts']=[]
        elif name=='provider-pending':
            body=json.loads(f['exact']['provider']['body']);body['status']='pending';body['confirmation']={'type':'redirect','confirmation_url':'https://yoomoney.ru/checkout/payments/synthetic'};f['exact']['provider']['body']=enc(body).decode();raw['providers']=[body]
        elif name=='actor-source':census['actors'][1]['source_sha']='0'*64
        elif name=='actor-inflight':census['actors'][1]['inflight']=['unknown']
        elif name=='actor-missing':census['actors'].pop()
        elif name=='create-missing':census['creates']=[]
        elif name=='create-orphan':census['creates'].append({**census['creates'][0],'intent_id':'orphan'})
        else:census['source_set_sha']='0'*64
        census.update(actors_count=len(census['actors']),actors_sha=sha(enc(census['actors'])),creates_count=len(census['creates']),creates_sha=sha(enc(census['creates'])))
        refresh(f);_refuse(lambda:run(b,f),code);j=json.loads(pathlib.Path(f['s']['directory']+'/controller-bridge.json').read_bytes());assert 'administrative_disposition' not in j
        rows.append({'case':name,'diagnostic':code,'adminClosures':0})
    # Closed admin core and once-bound reservation cannot be broadened by another ticket/case.
    for fault,code in [('core','RECOVERY_ADMIN_CORE'),('type','RECOVERY_ADMIN_CORE'),('original-key','RECOVERY_ORIGINAL_KEY_REUSE'),('replay','RECOVERY_ORDINARY_TICKET')]:
        f=_admin_fixture(b);run(b,f);p,t,callback=_post(b,f);path=f['s']['directory']+'/controller-bridge.json'
        if fault in ('core','type'):
            j=json.loads(pathlib.Path(path).read_bytes())
            if fault=='core':j['administrative_disposition']['intent']='other'
            else:
                wpath=f['s']['directory']+'/recovery-finalization.private.json';w=json.loads(pathlib.Path(wpath).read_bytes());w['kind']='recovery-finalization-v1';_replace(wpath,enc(w));f['s']['recovery_authority']['witness_sha']=sha(enc(w))
            _replace(path,enc(j))
        elif fault=='original-key':p['request_key']=f['proof']['origin']['browser_key'];t['context_sha']=sha(enc(p));_issue(b,f,p,t,'POST_RECOVERY')
        else:bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t);_accepted_head(b,f,1);_fresh(b,f);_issue(b,f,p,t,'POST_RECOVERY')
        before=pathlib.Path(f['s']['directory']+'/operation.json').read_bytes();count=len(callback.nativecalls)
        _refuse(lambda:bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t),code)
        assert pathlib.Path(f['s']['directory']+'/operation.json').read_bytes()==before and len(callback.nativecalls)==count
        rows.append({'case':fault,'diagnostic':code,'followingNativeCalls':0})
    # Removing a single raw conjunction must admit that otherwise valid negative.
    mutant_rows=[]
    for predicate,mutate,label in [("delivery.get('obligations') == []",lambda f:f['inv']['history_sources']['main']['delivery'].update(obligations=['unknown']),'obligations'),("actor['inflight'] == []",lambda f:f['inv']['history_sources']['main']['delivery']['census']['actors'][1].update(inflight=['unknown']),'actor-inflight'),("create['outcome'] == 'completed_saved'",lambda f:f['inv']['history_sources']['main']['delivery']['census']['creates'][0].update(outcome='unknown'),'unknown-create')]:
        mutant,_=_mutated(b,'runner',predicate,'True');f=_admin_fixture(mutant);mutate(f);c=f['inv']['history_sources']['main']['delivery']['census'];c.update(actors_sha=sha(enc(c['actors'])),creates_sha=sha(enc(c['creates'])));refresh(f);result=run(mutant,f);assert result['kind']=='administrative-terminal-disposition-v1';mutant_rows.append({'mutant':label,'forbiddenAdminClosure':True})
    tests['reconcile expired origin without pending binding or actions']['FR6-conjunctions']=rows
    tests['reconcile expired origin without pending binding or actions']['FR6-mutants']=mutant_rows


def _completion_matrix(b,tests):
    results=[]
    cases=[('extra','RECOVERY_COMPLETION_SCHEMA'),('null','RECOVERY_ACTION_UNKNOWN'),('generation','RECOVERY_COMPLETION_SCHEMA'),('predecessor','RECOVERY_COMPLETION_CHAIN'),('drop-snapshot','RECOVERY_COMPLETION_SCHEMA'),('head','RECOVERY_ORDINARY_HEAD_BINDING'),('roster','RECOVERY_ORDINARY_ROSTER'),('delete','RECOVERY_ACTION_UNKNOWN')]
    for name,diagnostic in cases:
        f=fixture(b);run(b,f);p,t,callback=_post(b,f);bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t);_accepted_head(b,f,1)
        path=f['s']['directory']+'/controller-bridge.json';j=json.loads(pathlib.Path(path).read_bytes());entry=j['used'][t['id']]['completion']
        if name=='extra':entry['unknown']=True
        elif name=='null':j['used'][t['id']]['completion']=None
        elif name=='generation':entry['generation']=2
        elif name=='predecessor':entry['predecessor']='f'*64
        elif name=='drop-snapshot':entry['after'].pop('prior_entries');entry['after_sha']=b['modules']['runner']['_hash']('snapshot',entry['after'])
        elif name=='delete':j['used'][t['id']].pop('completion')
        elif name=='roster':f['s']['ordinary_roster'][0]['id']='changed-descriptor'
        else:f['lineage']=(0,'f'*64)
        _replace(path,enc(j));before=pathlib.Path(f['s']['directory']+'/operation.json').read_bytes();effects=[]
        _refuse(lambda:_reader(b,f,effects),diagnostic)
        assert not effects and pathlib.Path(f['s']['directory']+'/operation.json').read_bytes()==before
        results.append({'case':name,'diagnostic':diagnostic,'followingEffects':0})
    f=fixture(b);run(b,f);p,t,callback=_post(b,f)
    bridge['ordinary'](b,f['s'],p,SimulatedRuntime(f),callback,t);_accepted_head(b,f,1)
    # A lawful later health refresh changes only the five excluded fields.
    with bridge['locks'](b['n'],f['s']) as fds:
        record=b['n']['loadrecord'](f['s']['directory']+'/operation.json');host=os.open(f['s']['host_path'],os.O_RDWR|os.O_NOFOLLOW)
        try:b['modules']['adapter']['_revalidate'](b['n'],f['s'],SimulatedRuntime(f),record,host,fds[1],bridge['_scope'](b,f['s'],fds,lambda:None,runtime=SimulatedRuntime(f))['check'])
        finally:os.close(host)
    _reader(b,f)
    tests['stop replay and partial recovery before callback']['D1a-closed-chain']=results
    tests['stop replay and partial recovery before callback']['lawfulHealthRevalidation']=True

    # QE3: the full known contract is admitted before the first observable effect.
    admission=[]
    def observe(c,f,call):
        operation=pathlib.Path(f['s']['directory']+'/operation.json')
        journal=operation.parent/'controller-bridge.json'
        before,prior=operation.read_bytes(),journal.read_bytes()
        snapshots=len(list(operation.parent.glob('recovery-origin-*.snapshot')))
        writes=[];previous=sys.getprofile();result=None;diagnostic=None
        def record(frame,event,value):
            if event=='call' and frame.f_code==c['n']['persist'].__code__:
                writes.append(frame.f_locals.get('path'))
        sys.setprofile(record)
        try:result=call()
        except RuntimeError as error:diagnostic=str(error)
        finally:sys.setprofile(previous)
        return {'diagnostic':diagnostic,'persists':len(writes),'snapshots':len(list(operation.parent.glob('recovery-origin-*.snapshot')))-snapshots,'operationChanged':operation.read_bytes()!=before,'journalChanged':journal.read_bytes()!=prior,'witness':(operation.parent/'recovery-finalization.private.json').exists(),'accepted':result is not None}
    def initial(c,control,name):
        f=fixture(c)
        if name!='origin-only':
            value={'state':'consumed_unknown' if name=='unknown' else 'canonical_returned','ticket_sha':'a'*64}
            if name=='kind':value['completion']={'kind':'action-completion-v1'}
            elif name=='type':value['completion']=None
            f['journal']['used']['previous']=value;_envelope(f)
        return observe(c,f,lambda:run(c,f,controller=control))
    def pending(c,control,name):
        f=fixture(c,False);run(c,f);ticket=_ticket(c,f)
        if name=='id128':ticket['id']='x'*128
        elif name=='extra':ticket['unknown_field']=True
        elif name=='overlong':ticket['id']='x'*129
        elif name=='utf8-overlong':ticket['id']='я'*65
        elif name=='id-type':ticket['id']=42
        elif name=='source-extra':ticket['source_authority']['unknown_field']=True
        create,cleanup,native=_native(c,f,ticket);callbacks=[]
        def invoke(projection,ticket,scope):
            callbacks.append(True);return create(projection,ticket,scope)
        row=observe(c,f,lambda:_action(c,f,ticket,invoke,cleanup,controller=control))
        row.update(callbacks=len(callbacks),nativeCalls=len(native))
        return row
    def reconcile(c,control,name):
        f=fixture(c,False);run(c,f);ticket=_ticket(c,f)
        create,cleanup,native=_native(c,f,ticket);_action(c,f,ticket,create,cleanup,controller=control)
        _accepted_head(c,f,1)
        path=pathlib.Path(f['s']['directory']+'/controller-bridge.json');journal=json.loads(path.read_bytes())
        entry=journal['recovery']['actions'][ticket['id']]['completion']
        if name=='extra':entry['unexpected']=True
        elif name=='L':entry['L']['wall']=entry['authority']['action_window']['deadline']+.001
        elif name=='head':f['s']['recovery_authority']['expected_head']='0'*64
        elif name=='missing':journal['recovery']['actions'][ticket['id']].pop('completion')
        _replace(str(path),enc(journal))
        provider=json.loads(f['exact']['provider']['body']);provider.pop('confirmation')
        provider.update(status='canceled',cancellation_details={'reason':'expired_on_confirmation'})
        f['exact']['provider']['body']=enc(provider).decode();f['inv']['raw']['main']['providers']=[provider]
        f['proof']['phase']='ACTIVE_RECONCILE';refresh(f)
        count=len(native)
        row=observe(c,f,lambda:control['reconcile_bound'](c,f['s'],f['proof'],f['exact'],f['inv'],SimulatedRuntime(f)))
        assert native[:count]==['session-create','session-revoke'] and len(native)==count
        return row
    def ledger(c,control,name):
        f=fixture(c,False)
        if name=='other-owner':historical_debt(f,'canceled',empty=True,other=True)
        if name in ('target','collector'):
            target=f['inv']['raw']['main']['intents'][0]
            provider=copy.deepcopy(f['inv']['raw']['main']['providers'][0]);provider.pop('confirmation')
            provider.update(status='canceled',paid=False,cancellation_details={'reason':'expired_on_confirmation'})
            event=fixtures['_event_row'](f,'main',target,provider,age=87000)
            assert target['created_at']<event['event_bound'] and event['event_bound']+86401<time.time()
        refresh(f)
        if name=='collector':
            observed,queries=_whole(c,f)
            assert sum(query.startswith('BEGIN') for _,query,_ in queries)==4
            assert set(observed['raw']['main']['events'][0])=={'id','created_at','provider','provider_event_id','payload_sha256'}
            f['inv']={**f['inv'],**observed};refresh(f)
        return observe(c,f,lambda:run(c,f,controller=control))
    groups=[('B0',initial,[('origin-only',None),('unknown','RECOVERY_ACTION_UNKNOWN'),('terminal','RECOVERY_ACTION_UNKNOWN'),('kind','RECOVERY_COMPLETION_SCHEMA'),('type','RECOVERY_ACTION_UNKNOWN')]),('ticket',pending,[(name,None if name in ('valid','id128') else 'RECOVERY_COMPLETION_SCHEMA') for name in ('valid','id128','extra','overlong','utf8-overlong','id-type','source-extra')]),('chain',reconcile,[('valid',None),('extra','RECOVERY_COMPLETION_SCHEMA'),('L','RECOVERY_COMPLETION_TIME'),('head','RECOVERY_ORDINARY_HEAD_BINDING'),('missing','RECOVERY_ACTION_UNKNOWN')]),('event',ledger,[('empty',None),('other-owner',None),('target','RECOVERY_PENDING_LEDGER'),('collector','RECOVERY_PENDING_LEDGER')])]
    for family,run_case,cases in groups:
        for name,diagnostic in cases:
            row=run_case(b,bridge,name)
            row.update(case=family+':'+name,allowed=diagnostic is None,callbacks=row.get('callbacks',0),nativeCalls=row.get('nativeCalls',0))
            assert row['diagnostic']==diagnostic,(row,diagnostic)
            if diagnostic is not None:
                assert row['persists']==row['snapshots']==row['callbacks']==row['nativeCalls']==0 and not row['operationChanged'] and not row['journalChanged'] and not row['witness'],row
            elif family=='ticket':assert row['callbacks']==1 and row['nativeCalls']==2 and row['accepted']
            else:assert row['accepted'] and row['persists']>0
            admission.append(row)
    mutants=[]
    removals=[('B0',"and (recovery or origin_ticket is not None):","and recovery:",initial,'terminal'),('ticket',"        runner['action_input'](dict(recovery['projection'], observed_at=exact['observed_at']), recovery['proof_sha'], bundle['source_sha'], ticket['action'], ticket)","        pass",pending,'extra'),('chain',"        a['_read_chain'](bundle, s, journal, scope, fresh)\n        r = n['loadrecord'](s['directory'] + '/operation.json')","        r = n['loadrecord'](s['directory'] + '/operation.json')",reconcile,'extra')]
    for guard,old,new,run_case,name in removals:
        mutant,control=_mutated(b,'bridge',old,new)
        row=run_case(mutant,control,name)
        assert row['persists']>0 and row['operationChanged'],row
        mutants.append({'guard':guard,'forbiddenPersist':True,'forbiddenBinding':row['accepted']})
    mutant,_=_mutated(b,'adapter',"for e in inv['history_sources'][store]['event_provenance']) and not any(p.get('intent_id') == o['intent']","for e in data['events']) and not any(p.get('intent_id') == o['intent']")
    row=ledger(mutant,bridge,'collector')
    assert row['diagnostic'] is None and row['accepted'] and row['persists']>0
    mutants.append({'guard':'event','forbiddenPersist':True,'forbiddenBinding':True})
    tests['stop replay and partial recovery before callback']['QE3-pre-effect']=admission
    tests['stop replay and partial recovery before callback']['QE3-guard-mutants']=mutants

`;
