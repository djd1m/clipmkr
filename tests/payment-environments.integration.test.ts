import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, chmod, writeFile, readdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { createPool, createPaymentIntent, applyVerifiedPayment, recordVerifiedRefund, setIntentProviderPayment, reconcilePaymentProvenance, PaymentProvenanceConflict, bloggerReport, type Pool, type PaymentEvent } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import type { PaymentIdentity } from '../packages/shared/src/payment-identity';
import { CREDIT_SKUS, type CreditSku } from '../packages/shared/src/tariff';
import { createBillingDependencies } from '../apps/web/src/server/billing-deps';
import { createCheckoutHandler, createPaymentWebhookHandler, createCheckoutStatusHandler } from '../apps/web/src/server/billing-handler';
import { createYooKassaProvider } from '../apps/web/src/server/payments/yookassa';
import { runPaymentProvenanceBackfill } from '../apps/web/src/server/payments/ops-payment-provenance';
import { PartnerService } from '../apps/web/src/server/partner';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from './fixtures/fake-yookassa-server';

const url = process.env.DATABASE_URL;
const live = {provider:'yookassa',environment:'live',merchantId:SHOP_ID} as const;
const test = {provider:'yookassa',environment:'test',merchantId:SHOP_ID} as const;
const unknown = {provider:null,environment:'unknown',merchantId:null} as const;
const schema = `provenance_${randomBytes(8).toString('hex')}`;
describe.skipIf(!url)('payment environments real PG and canonical HTTP', () => {
  let pool: Pool, yk: FakeYooKassa;
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Owned test database required');
    pool=createPool(url,schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool); yk=await startFakeYooKassa({test:false});
  });
  afterAll(async () => { await yk?.close(); if(pool){await pool.query(`DROP SCHEMA ${schema} CASCADE`);await pool.end();} });
  const account = async (extra='') => (await pool.query(`INSERT INTO account(email,password_hash,billing_policy ${extra ? ','+extra : ''}) VALUES($1,'synthetic','credits_v1' ${extra ? ',true' : ''}) RETURNING id`,[`${randomUUID()}@test.invalid`])).rows[0].id as string;
  async function intent(who: string, identity: PaymentIdentity=live, sku: CreditSku='start_v1') {
    const result=await createPaymentIntent(pool,{accountId:who,identity,sku,billingMode:'credits_v1',priceMinor:CREDIT_SKUS[sku].priceMinor,idempotencyKey:randomUUID()});
    if(result.kind!=='created') throw new Error('Intent fixture failed'); return result.intent;
  }
  const event = (id: string, orderId: string | null, identity: PaymentIdentity=live, amountMinor=99000): PaymentEvent => ({provider: identity.provider ?? 'yookassa',eventKey:randomUUID(),payloadSha256:'a'.repeat(64),payment:{identity,id,orderId,amountMinor,feeMinor:null,paidAt:'2026-11-10T12:00:00Z'}});
  const provider = () => createYooKassaProvider({shopId:SHOP_ID,secretKey:SECRET,testMode:false,apiBase:yk.apiBase});
  const count = async (table: string, where: string, params: unknown[]) => Number((await pool.query(`SELECT count(*) AS n FROM ${table} WHERE ${where}`,params)).rows[0].n);
  function handlers(who: string, p=provider(), logs: string[] = []) {
    const deps=createBillingDependencies({pool,provider:p,billingMode:'credits_v1',receiptConfig:{vatCode:1,paymentSubject:'service',paymentMode:'full_payment'},publicOrigin:'https://test.invalid',trustedProxyHops:1,checkoutAllowed:()=>true,authenticate:async()=>({account_id:who}),allowMutation:async()=>true,allowRead:async()=>true,log:line=>{logs.push(line);}});
    const request=(path:string,body?:unknown)=>new Request('https://test.invalid'+path,{...(body===undefined?{}:{method:'POST',body:JSON.stringify(body)}),headers:{origin:'https://test.invalid',cookie:'__Host-n5_session='+'a'.repeat(43),'content-type':'application/json','x-forwarded-for':'185.71.76.10, 127.0.0.1'}});
    return {checkout:(body:unknown)=>createCheckoutHandler(deps)(request('/api/checkout',body)),status:(id:string)=>createCheckoutStatusHandler(deps)(request('/api/checkout/'+id),id),notify:(raw:string)=>createPaymentWebhookHandler(deps)(new Request('https://test.invalid/api/webhooks/yookassa',{method:'POST',body:raw,headers:{'x-forwarded-for':'185.71.76.10, 127.0.0.1'}}))};
  }
  async function waitBlocked(operation: Promise<unknown>, minimum=1) {
    let done=false; void operation.finally(()=>{done=true;}).catch(()=>{});
    for(let i=0;i<100;i++) {
      const waiter=(await pool.query(`SELECT 1 FROM pg_stat_activity WHERE application_name=$1 AND wait_event_type='Lock' AND pid<>pg_backend_pid()`,[schema])).rowCount;
      if((waiter ?? 0)>=minimum){expect(done).toBe(false);return;}
      await delay(20);
    }
    throw new Error('Real lock wait not observed');
  }
  it('migration preserves unknown history and rejects identity rewrites', async () => {
    const oldSchema=`old_provenance_${randomBytes(8).toString('hex')}`, old=createPool(url!,oldSchema), dir=await mkdtemp(join(tmpdir(),'provenance-migrations-'));
    try {
      await old.query(`CREATE SCHEMA ${oldSchema}`);
      for(const file of await readdir('packages/db/migrations')) if(/^\d+_.*\.sql$/.test(file)&&Number(file.slice(0,3))<30) await copyFile(join('packages/db/migrations',file),join(dir,file));
      await migrate(old,dir);
      const who=(await old.query("INSERT INTO account(email,password_hash) VALUES('history@test.invalid','x') RETURNING id")).rows[0].id;
      const i=(await old.query("INSERT INTO payment_intent(account_id,price_minor,idempotency_key,status,provider_payment_id) VALUES($1,99000,'history-key','succeeded',$2) RETURNING *",[who,randomUUID()])).rows[0];
      await old.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,fee_minor,paid_at) VALUES($1,$2,'yookassa',$3,99000,3000,now())",[i.id,who,i.provider_payment_id]);
      const before=(await old.query('SELECT to_jsonb(p) AS row FROM payment p')).rows;
      await migrate(old);await migrate(old);
      expect((await old.query("SELECT to_jsonb(p)-'payment_environment'-'payment_merchant_id' AS row FROM payment p")).rows).toEqual(before);
      expect((await old.query('SELECT payment_environment,payment_merchant_id FROM payment')).rows[0]).toEqual({payment_environment:'unknown',payment_merchant_id:null});
      await expect(old.query("UPDATE payment SET payment_environment='live'")).rejects.toThrow();
      await old.query("UPDATE payment SET payment_environment='live',payment_merchant_id='123456'");
      await expect(old.query("UPDATE payment SET payment_environment='test'")).rejects.toThrow('immutable');
      await expect(old.query("UPDATE payment_intent SET payment_provider='fake',payment_environment='live'")).rejects.toThrow();
      await old.query("UPDATE payment_intent SET payment_provider='fake',payment_environment='test'");
      await expect(old.query("UPDATE payment_intent SET payment_environment='unknown',payment_provider=NULL")).rejects.toThrow('immutable');
      await old.query('DELETE FROM account WHERE id=$1',[who]);
      expect((await old.query('SELECT account_id,intent_id,payment_environment FROM payment')).rows[0]).toEqual({account_id:null,intent_id:null,payment_environment:'live'});
    } finally {await old.query(`DROP SCHEMA IF EXISTS ${oldSchema} CASCADE`);await old.end();await rm(dir,{recursive:true,force:true});}
  });
  it('legacy pending callback before bind grants once', async () => {
    const who=await account(), i=await intent(who,unknown), p=event(randomUUID(),i.id);
    expect(await applyVerifiedPayment(pool,p)).toMatchObject({applied:true});
    await setIntentProviderPayment(pool,i.id,p.payment.id,p.payment);
    const duplicates=await Promise.all(Array.from({length:8},()=>applyVerifiedPayment(pool,{...p,eventKey:randomUUID()})));
    expect(duplicates.every(x=>!x.applied)).toBe(true);
    expect(await count('credit_grant',"account_id=$1 AND source='payment'",[who])).toBe(1);
    expect((await pool.query('SELECT payment_environment,payment_provider,payment_merchant_id FROM payment_intent WHERE id=$1',[i.id])).rows[0]).toEqual({payment_environment:'live',payment_provider:'yookassa',payment_merchant_id:SHOP_ID});
    const other=await intent(who), rebound={...p,eventKey:randomUUID(),payment:{...p.payment,orderId:other.id}};
    await expect(applyVerifiedPayment(pool,rebound)).rejects.toBeInstanceOf(PaymentProvenanceConflict);
    expect(await count('payment_event','provider_event_id=$1',[rebound.eventKey])).toBe(0);
  });
  it('payment operations wait for account lock and rollback event claims', async () => {
    const who=await account(), i=await intent(who,unknown), p=event(randomUUID(),i.id), held=await pool.connect();
    await held.query('BEGIN');await held.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[who]);
    try {const pending=setIntentProviderPayment(pool,i.id,p.payment.id,p.payment);await waitBlocked(pending);await held.query('COMMIT');await pending;} finally {await held.query('ROLLBACK');held.release();}
    for(const operation of [applyVerifiedPayment,recordVerifiedRefund]) {
      const held=await pool.connect();await held.query('BEGIN');await held.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[who]);
      try {const pending=operation(pool,{...p,eventKey:randomUUID()});await waitBlocked(pending);await held.query('COMMIT');await pending;} finally {await held.query('ROLLBACK');held.release();}
    }
    const wrong={...p,eventKey:randomUUID(),payment:{...p.payment,identity:{...live,merchantId:'654321'}}};
    await expect(recordVerifiedRefund(pool,wrong)).rejects.toBeInstanceOf(PaymentProvenanceConflict);
    expect(await count('payment_event','provider_event_id=$1',[wrong.eventKey])).toBe(0);
    expect(await recordVerifiedRefund(pool,{...p,eventKey:wrong.eventKey})).toMatchObject({reason:'refund_recorded'});
  });
  it('refund proof matrix preserves erased and tombstone identities', async () => {
    for(const identity of [live,unknown]) {
      // Linked known/unknown history: refund never classifies terminal unknown.
      const who=await account(), i=await intent(who,identity), p=event(randomUUID(),i.id);
      if(identity.environment==='unknown') {
        await pool.query("UPDATE payment_intent SET status='succeeded',fulfilled_at=now(),provider_payment_id=$2 WHERE id=$1",[i.id,p.payment.id]);
        await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at) VALUES($1,$2,'yookassa',$3,99000,now())",[i.id,who,p.payment.id]);
      } else await applyVerifiedPayment(pool,p);
      await recordVerifiedRefund(pool,{...p,eventKey:randomUUID()});
      expect((await pool.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[p.payment.id])).rows[0].payment_environment).toBe(identity.environment);
      await pool.query('DELETE FROM account WHERE id=$1',[who]);
      const erased={...p,eventKey:randomUUID(),payment:{...p.payment,orderId:null}};
      expect(await recordVerifiedRefund(pool,erased)).toMatchObject({reason:'refund_recorded'});
      expect(await applyVerifiedPayment(pool,{...erased,eventKey:randomUUID()})).toMatchObject({reason:'refunded'});
      const wrong={...erased,eventKey:randomUUID(),payment:{...erased.payment,amountMinor:1}};
      await expect(recordVerifiedRefund(pool,wrong)).rejects.toBeInstanceOf(PaymentProvenanceConflict);
      expect(await count('payment_event','provider_event_id=$1',[wrong.eventKey])).toBe(0);
    }
    const who=await account(), i=await intent(who,unknown), p=event(randomUUID(),i.id);
    expect(await recordVerifiedRefund(pool,p)).toMatchObject({reason:'refund_recorded'});
    expect(await applyVerifiedPayment(pool,{...p,eventKey:randomUUID()})).toMatchObject({reason:'refunded'});
    expect(await count('credit_grant',"account_id=$1 AND source='payment'",[who])).toBe(0);
    const noOrder=event(randomUUID(),null);await recordVerifiedRefund(pool,noOrder);
    const rebound={...noOrder,eventKey:randomUUID(),payment:{...noOrder.payment,orderId:i.id}};
    expect(await applyVerifiedPayment(pool,rebound)).toMatchObject({reason:'refunded'});
    expect((await pool.query('SELECT intent_id,account_id FROM payment WHERE provider_payment_id=$1',[noOrder.payment.id])).rows[0]).toEqual({intent_id:null,account_id:null});
    const other=await intent(who), bad={...p,eventKey:randomUUID(),payment:{...p.payment,orderId:other.id}};
    await expect(recordVerifiedRefund(pool,bad)).rejects.toBeInstanceOf(PaymentProvenanceConflict);
    expect(await count('payment_event','provider_event_id=$1',[bad.eventKey])).toBe(0);
  });
  it('canonical live and test payments preserve verified provenance', async () => {
    for(const mode of [false,true]) {
      const fixture=mode?await startFakeYooKassa():yk;
      try {
        const logs:string[]=[],who=await account(), p=createYooKassaProvider({shopId:SHOP_ID,secretKey:SECRET,testMode:mode,apiBase:fixture.apiBase}), h=handlers(who,p,logs);
        const r=await h.checkout({idempotency_key:randomUUID(),sku:'start_v1'});expect(r.status).toBe(201);
        const id=(await r.json()).data.intent_id, remote=fixture.byOrder(id)!;fixture.pay(remote.id);
        expect((await p.getPayment(remote.id)).identity).toEqual(mode?test:live);
        expect((await h.notify(fixture.notification(remote.id))).status).toBe(200);
        expect((await pool.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[remote.id])).rows[0].payment_environment).toBe(mode?'test':'live');
        const refund=fixture.refund(remote.id,'100.00');expect((await h.notify(fixture.refundNotification(refund))).status).toBe(200);
        expect(logs.some(line=>line.includes('(refund_recorded)'))).toBe(true);
        for(const privateValue of [remote.id,id,SHOP_ID,SECRET]) expect(logs.join()).not.toContain(privateValue);
      } finally {if(mode) await fixture.close();}
    }
  });
  it('checkout rejects client identity and remote merchant drift', async () => {
    const logs:string[]=[],who=await account(), h=handlers(who,provider(),logs), key=randomUUID();
    expect((await h.checkout({idempotency_key:key,sku:'start_v1',identity:live})).status).toBe(422);
    const r=await h.checkout({idempotency_key:key,sku:'start_v1'}), id=(await r.json()).data.intent_id, remote=yk.byOrder(id)!;
    const original=remote.metadata.order_id;remote.metadata.order_id=randomUUID();
    expect((await h.checkout({idempotency_key:key,sku:'start_v1'})).status).toBe(503);
    remote.status='canceled';expect((await h.status(id)).status).toBe(200);
    expect((await pool.query('SELECT status FROM payment_intent WHERE id=$1',[id])).rows[0].status).toBe('created');
    remote.metadata.order_id=original;remote.recipient.account_id='654321';
    expect((await h.checkout({idempotency_key:key,sku:'start_v1'})).status).toBe(503);
    remote.recipient.account_id=SHOP_ID;
    yk.pay(remote.id);await pool.query('UPDATE payment_intent SET provider_payment_id=$2 WHERE id=$1',[id,randomUUID()]);
    expect((await h.notify(yk.notification(remote.id))).status).toBe(503);
    expect(logs).toContain('Оплата: payment_provenance_conflict');
    expect(logs.join()).not.toContain(remote.id);
    expect(await count('payment_event','provider_event_id=$1',[`payment_succeeded:${remote.id}`])).toBe(0);
    await pool.query('UPDATE payment_intent SET provider_payment_id=$2 WHERE id=$1',[id,remote.id]);
    expect((await h.notify(yk.notification(remote.id))).status).toBe(200);

    expect((await handlers(who,createYooKassaProvider({shopId:SHOP_ID,secretKey:SECRET,testMode:true,apiBase:yk.apiBase})).checkout({idempotency_key:key,sku:'start_v1'})).status).toBe(409);
    const old=await intent(who,unknown);const before=yk.created;
    const oldKey=(await pool.query('SELECT idempotency_key FROM payment_intent WHERE id=$1',[old.id])).rows[0].idempotency_key;
    expect((await h.checkout({idempotency_key:oldKey,sku:'start_v1'})).status).toBe(409);expect(yk.created).toBe(before);
  });
  it('ordinary checkout bind preserves unknown terminal history until explicit backfill', async () => {
    const who=await account(), legacy=await intent(who,unknown), adapter=provider();
    const remote=await adapter.createPayment({orderId:legacy.id,amountMinor:99000,returnUrl:'https://test.invalid/return',description:'Legacy refund',receipt:{email:'legacy@test.invalid',description:'Legacy refund',vatCode:1,paymentSubject:'service',paymentMode:'full_payment'}});yk.pay(remote.id);
    await pool.query('UPDATE payment_intent SET provider_payment_id=$2 WHERE id=$1',[legacy.id,remote.id]);
    await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,status,needs_review,review_reason,paid_at) VALUES($1,$2,'yookassa',$3,99000,'refunded',true,'refund',now())",[legacy.id,who,remote.id]);
    const snapshot=async()=>({
      payment:(await pool.query("SELECT to_jsonb(p)-'payment_environment'-'payment_merchant_id' AS row FROM payment p WHERE provider_payment_id=$1",[remote.id])).rows,
      intent:(await pool.query("SELECT to_jsonb(i)-'payment_provider'-'payment_environment'-'payment_merchant_id' AS row FROM payment_intent i WHERE id=$1",[legacy.id])).rows,
      grants:await count('credit_grant','account_id=$1',[who]),events:await count('payment_event','provider_event_id=$1',[`payment_succeeded:${remote.id}`]),attributions:await count('attribution','account_id=$1',[who])});
    const before=await snapshot(),key=(await pool.query('SELECT idempotency_key FROM payment_intent WHERE id=$1',[legacy.id])).rows[0].idempotency_key;
    const postCount=yk.requestMethods.filter(method=>method==='POST').length;
    expect((await handlers(who).checkout({idempotency_key:key,sku:'start_v1'})).status).toBe(200);
    expect((await pool.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[remote.id])).rows[0].payment_environment).toBe('unknown');
    expect((await pool.query('SELECT payment_environment FROM payment_intent WHERE id=$1',[legacy.id])).rows[0].payment_environment).toBe('live');
    expect(await snapshot()).toEqual(before);
    expect(await runPaymentProvenanceBackfill({pool,provider:adapter,candidates:[remote.id],apply:true})).toMatchObject({updated:1,conflicts:0});
    expect((await pool.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[remote.id])).rows[0].payment_environment).toBe('live');
    expect(await snapshot()).toEqual(before);expect(yk.requestMethods.filter(method=>method==='POST')).toHaveLength(postCount);
  });
  it('financial reports preserve period and distinct payer oracles', async () => {
    const owner=await account('owner_unlimited'), blogger=await account('is_blogger'), who=await account(), codeA=randomUUID(),codeB=randomUUID();
    await pool.query('UPDATE account SET blogger_commission_percent=20 WHERE id=$1',[blogger]);
    const partner=(await pool.query("INSERT INTO partner(account_id,display_name) VALUES($1,'Blogger') RETURNING id",[blogger])).rows[0].id;
    for(const [id,code] of [[codeA,'ORACLEA'],[codeB,'ORACLEB']]) await pool.query("INSERT INTO partner_code(id,partner_id,code,status) VALUES($1,$2,$3,'active')",[id,partner,code]);
    for(const identity of [live,test,unknown]) for(const [sku,at,code] of [['start_v1','2026-10-10T12:00:00Z',codeA],['pro_v1','2026-11-10T12:00:00Z',codeA],['addon_v1','2026-11-11T12:00:00Z',codeB]] as const) {
      const i=await intent(who,identity,sku), paymentId=randomUUID();
      await pool.query("UPDATE payment_intent SET referral_partner_code_id=$2,provider_payment_id=$3,status='succeeded',fulfilled_at=$4 WHERE id=$1",[i.id,code,paymentId,at]);
      await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id) VALUES($1,$2,'yookassa',$3,$4,$5,$6,$7)",[i.id,who,paymentId,CREDIT_SKUS[sku].priceMinor,at,identity.environment,identity.merchantId]);
    }
    const mismatch=await intent(who), mismatchedId=randomUUID();
    await pool.query("UPDATE payment_intent SET referral_partner_code_id=$2,provider_payment_id=$3,status='succeeded',fulfilled_at=now() WHERE id=$1",[mismatch.id,codeA,mismatchedId]);
    await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id) VALUES($1,$2,'yookassa',$3,99000,'2026-11-10T12:00:00Z','live','654321')",[mismatch.id,who,mismatchedId]);
    const report=await bloggerReport(pool,owner,'2026-11');if(report.kind!=='ok')throw new Error('Report unavailable');
    expect(report.bloggers.find(b=>b.account_id===blogger)!.counters).toMatchObject({paying_users:1,payments:2,revenue_minor:548000,commission_estimate_minor:109600});
    const service=new PartnerService(pool,'synthetic-partner-secret'), all=await service.dashboard(blogger);expect(all.counters).toMatchObject({purchases:3,revenue_minor:647000});
    expect((await service.dashboard(blogger,codeA)).counters).toMatchObject({purchases:2,revenue_minor:498000});
    expect((await service.dashboard(blogger,codeB)).counters).toMatchObject({purchases:1,revenue_minor:149000});
    await pool.query('UPDATE account SET blogger_commission_percent=30 WHERE id=$1',[blogger]);const thirty=await bloggerReport(pool,owner,'2026-11');if(thirty.kind!=='ok')throw new Error('report');expect(thirty.bloggers.find(b=>b.account_id===blogger)!.counters.commission_estimate_minor).toBe(164400);
    await pool.query('UPDATE account SET blogger_commission_percent=NULL WHERE id=$1',[blogger]);const unassigned=await bloggerReport(pool,owner,'2026-11');if(unassigned.kind!=='ok')throw new Error('report');expect(unassigned.bloggers.find(b=>b.account_id===blogger)!.counters.commission_estimate_minor).toBeNull();
  });
  it('backfill dry run and CAS preserve concurrent live payments', async () => {
    const who=await account(), i=await intent(who,unknown), p=await provider().createPayment({orderId:i.id,amountMinor:99000,returnUrl:'https://test.invalid/return',description:'History',receipt:{email:'history@test.invalid',description:'History',vatCode:1,paymentSubject:'service',paymentMode:'full_payment'}});yk.pay(p.id);
    await pool.query("UPDATE payment_intent SET provider_payment_id=$2,status='succeeded',fulfilled_at=now() WHERE id=$1",[i.id,p.id]);
    await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at) VALUES($1,$2,'yookassa',$3,99000,now())",[i.id,who,p.id]);
    const snapshot=async()=> (await pool.query("SELECT to_jsonb(p)-'payment_environment'-'payment_merchant_id' AS row FROM payment p WHERE provider_payment_id=$1",[p.id])).rows;
    // Negative control: POST reuse does not create another row, but must be visible in the ledger.
    const creations=yk.created,ledgerStart=yk.requestMethods.length;
    await provider().createPayment({orderId:i.id,amountMinor:99000,returnUrl:'https://test.invalid/return',description:'History',receipt:{email:'history@test.invalid',description:'History',vatCode:1,paymentSubject:'service',paymentMode:'full_payment'}});
    expect(yk.created).toBe(creations);expect(yk.requestMethods.slice(ledgerStart)).toEqual(['POST']);
    const unmatched=await fetch(yk.apiBase+'/refunds/not-found',{method:'POST',headers:{authorization:'Basic '+Buffer.from(`${SHOP_ID}:${SECRET}`).toString('base64')}});
    expect(unmatched.status).toBe(404);expect(yk.requestMethods.slice(ledgerStart)).toEqual(['POST','POST']);
    const before=await snapshot(),posts=yk.requestMethods.filter(method=>method==='POST').length;
    const dry=await runPaymentProvenanceBackfill({pool,provider:provider(),candidates:[p.id],apply:false});expect(dry).toMatchObject({updated:1,conflicts:0});
    expect((await pool.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[p.id])).rows[0].payment_environment).toBe('unknown');
    const temp=await mkdtemp(join(tmpdir(),'private-provenance-'));const candidates=join(temp,'candidates.json');await writeFile(candidates,JSON.stringify([p.id]),{mode:0o600});await chmod(candidates,0o600);
    try {
      const childLedgerStart=yk.requestMethods.length;
      const scoped=new URL(url!);scoped.searchParams.set('options',`-c search_path=${schema},public`);
      const child=spawn(process.execPath,['--import',resolve('tests/fixtures/payment-test-transport.mjs'),resolve('apps/web/.next/preflight/server/payments/ops-payment-provenance.js'),'--candidates',candidates],{env:{NODE_ENV:'test',PATH:process.env.PATH,DATABASE_URL:scoped.href,N5_PAYMENTS_MODE:'live',YOOKASSA_SHOP_ID:SHOP_ID,YOOKASSA_SECRET_KEY:SECRET,YOOKASSA_TEST_MODE:'false',CLIPMKR_TEST_PAYMENT_ORIGIN:yk.apiBase},stdio:['ignore','pipe','pipe']});
      let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});const exit=await new Promise(resolve=>child.on('close',resolve));expect(exit,output).toBe(0);expect(JSON.parse(output)).toMatchObject({mode:'dry-run',updated:1});expect(output).not.toContain(p.id);expect(output).not.toContain(SECRET);expect(yk.requestMethods.slice(childLedgerStart)).toEqual(['GET']);
    } finally {await rm(temp,{recursive:true,force:true});}
    const held=await pool.connect();await held.query('BEGIN');await held.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[who]);
    try {const pending=reconcilePaymentProvenance(pool,{provider:'yookassa',payment:await provider().getPayment(p.id),mode:'backfill',apply:true});await waitBlocked(pending);await held.query('COMMIT');await pending;} finally {await held.query('ROLLBACK');held.release();}
    expect(await snapshot()).toEqual(before);
    expect(await runPaymentProvenanceBackfill({pool,provider:provider(),candidates:[p.id],apply:true})).toMatchObject({unchanged:1});
    const current=await intent(who), concurrent=event(randomUUID(),current.id), concurrentLock=await pool.connect();
    await concurrentLock.query('BEGIN');await concurrentLock.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[who]);
    try {
      const overlap=Promise.all([applyVerifiedPayment(pool,concurrent),runPaymentProvenanceBackfill({pool,provider:provider(),candidates:[p.id],apply:true})]);
      await waitBlocked(overlap,2);await concurrentLock.query('COMMIT');
      const [sale,backfill]=await overlap;expect(sale).toMatchObject({applied:true});expect(backfill).toMatchObject({unchanged:1});
    } finally {await concurrentLock.query('ROLLBACK');concurrentLock.release();}
    expect((await pool.query('SELECT p.payment_environment AS payment,i.payment_environment AS intent,p.payment_merchant_id AS merchant FROM payment p JOIN payment_intent i ON i.id=p.intent_id WHERE p.provider_payment_id=$1',[concurrent.payment.id])).rows[0]).toEqual({payment:'live',intent:'live',merchant:SHOP_ID});
    yk.readAmountOverride='1.00';expect(await runPaymentProvenanceBackfill({pool,provider:provider(),candidates:[p.id],apply:true})).toMatchObject({conflicts:1});yk.readAmountOverride=null;
    yk.failReads=true;expect(await runPaymentProvenanceBackfill({pool,provider:provider(),candidates:[p.id],apply:true})).toMatchObject({unavailable:1});yk.failReads=false;
    expect(await snapshot()).toEqual(before);expect(yk.requestMethods.filter(method=>method==='POST')).toHaveLength(posts);expect(await count('credit_grant',"account_id=$1 AND source='payment'",[who])).toBe(1);
    const testFixture=await startFakeYooKassa();
    try {
      const adapter=createYooKassaProvider({shopId:SHOP_ID,secretKey:SECRET,testMode:true,apiBase:testFixture.apiBase}), legacy=await intent(who,unknown);
      const remote=await adapter.createPayment({orderId:legacy.id,amountMinor:99000,returnUrl:'https://test.invalid/return',description:'TEST history'});testFixture.pay(remote.id);
      await pool.query("UPDATE payment_intent SET provider_payment_id=$2,status='succeeded',fulfilled_at=now() WHERE id=$1",[legacy.id,remote.id]);
      await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at) VALUES($1,$2,'yookassa',$3,99000,now())",[legacy.id,who,remote.id]);
      expect(await runPaymentProvenanceBackfill({pool,provider:adapter,candidates:[remote.id],apply:true})).toMatchObject({updated:1,conflicts:0});
      expect((await pool.query('SELECT p.payment_environment AS payment,i.payment_environment AS intent FROM payment p JOIN payment_intent i ON i.id=p.intent_id WHERE p.provider_payment_id=$1',[remote.id])).rows[0]).toEqual({payment:'test',intent:'test'});
      expect(testFixture.created).toBe(1);
    } finally {await testFixture.close();}

  });
});
