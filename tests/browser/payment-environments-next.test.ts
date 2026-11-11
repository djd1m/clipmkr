// Настоящий собранный Next; только synthetic accounts, изолированная PG schema и TEST local provider.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, webkit } from 'playwright';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { mkdtemp, readdir, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { setTimeout as delay } from 'node:timers/promises';
import { once } from 'node:events';
import Redis from 'ioredis';
import bcrypt from 'bcrypt';
import type { PoolClient } from 'pg';
import { createPool, type Pool } from '../../packages/db/src/index';
import { migrate } from '../../packages/db/src/migrate';
import { AuthService } from '../../apps/web/src/server/auth';
import { PgAuthStore } from '../../apps/web/src/server/auth-store';
import { environment } from '../fixtures/environment';
import { startFakeYooKassa, SHOP_ID, SECRET, type FakeYooKassa } from '../fixtures/fake-yookassa-server';

const A = randomUUID(), B = randomUUID(), C = randomUUID(), D = randomUUID();
const codeA=randomUUID(), codeB=randomUUID();
const schema = `next_environments_${randomBytes(8).toString('hex')}`;
const secret = randomBytes(32).toString('hex');
const evidence = resolve('/tmp', schema);
const privateValues = [A, B, SECRET, secret, `${A}@test.invalid`, `${B}@test.invalid`];
let pool: Pool, redis: Redis, provider: FakeYooKassa, child: ChildProcess | undefined, origin: string;
let tokens: Record<string, string>, childEnv: NodeJS.ProcessEnv;
let logs = '';
const xff = '198.51.100.7, 10.0.0.2, 10.0.0.3';
function assertPrivate(text: string) {
  for (const value of privateValues) for (const form of [value, encodeURIComponent(value), JSON.stringify(value).slice(1, -1),
    value.replace(/-/g, '\\u002d'), [...value].map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')]) {
    expect(text.includes(form), 'Private identity or credential serialized').toBe(false);
  }
}
async function stop() {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  const current = child;
  const exited = once(current, 'exit');
  current.kill('SIGTERM');
  const timer = setTimeout(() => current.kill('SIGKILL'), 4000);
  try { await exited; } finally { clearTimeout(timer); child = undefined; }
}
async function start(accountId: string) {
  await stop();
  childEnv = { ...childEnv, N5_TEST_CHECKOUT_ACCOUNT_ID: accountId }; 
  execFileSync(process.execPath, ['.next/preflight/preflight.js'], { cwd: resolve('apps/web'), env: childEnv, timeout: 10000, stdio: 'pipe' });
  child = spawn(process.execPath, ['--import', resolve('tests/fixtures/payment-test-transport.mjs'),
    resolve('node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', new URL(origin).port],
  { cwd: resolve('apps/web'), env: childEnv, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', chunk => { logs += String(chunk); }); child.stderr!.on('data', chunk => { logs += String(chunk); });
  let spawnError = false; child.on('error', () => { spawnError = true; });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (spawnError || child.exitCode !== null) throw new Error('Next child failed; inspect private test evidence');
    try {
      const result = await fetch(origin + '/', { signal: AbortSignal.timeout(1500) });
      if (result.status === 200) return;
    } catch { /* bounded readiness only; timeout below fails the test */ }
    await delay(100);
  }
  throw new Error('Next child readiness timed out');
}
beforeAll(async () => {
  const database = process.env.DATABASE_URL, redisUrl = process.env.REDIS_URL;
  if (!database || !new URL(database).pathname.endsWith('_test') || !redisUrl) throw new Error('Existing isolated PG/Redis test profile required');
  mkdirSync(evidence, { mode: 0o700 });
  pool = createPool(database, schema); await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  const password = 'synthetic-next-checkout-password'; const hash = await bcrypt.hash(password, 10);
  for (const id of [A, B, C, D]) await pool.query("INSERT INTO account(id,email,password_hash,billing_policy) VALUES($1,$2,$3,'credits_v1')", [id, `${id}@test.invalid`, hash]);
  await pool.query('UPDATE account SET owner_unlimited=true WHERE id=$1',[A]);
  await pool.query('UPDATE account SET is_blogger=true,blogger_commission_percent=20 WHERE id=ANY($1::uuid[])',[[B,C]]);
  const partner=(await pool.query("INSERT INTO partner(account_id,display_name) VALUES($1,'Synthetic blogger') RETURNING id",[B])).rows[0].id;
  for(const [id,code] of [[codeA,'NEXTLIVEA'],[codeB,'NEXTLIVEB']])await pool.query("INSERT INTO partner_code(id,partner_id,code,status) VALUES($1,$2,$3,'active')",[id,partner,code]);
  for(const mode of ['live','test','unknown']) for(const [price,sku,seconds,at,code] of [[99000,'start_v1',18000,'2026-10-10T12:00:00Z',codeA],[399000,'pro_v1',108000,'2026-11-10T12:00:00Z',codeA],[149000,'addon_v1',36000,'2026-11-11T12:00:00Z',codeB]]) {
    const id=randomUUID(),remote=randomUUID();
    await pool.query("INSERT INTO payment_intent(id,account_id,price_minor,idempotency_key,provider_payment_id,status,sku,offer_version,grant_seconds,fulfilled_at,referral_partner_code_id,payment_provider,payment_environment,payment_merchant_id) VALUES($1::uuid,$2,$3,$1::text,$4,'succeeded',$5,'credits_v1_d00',$6,$7,$8,$9,$10,$11)",[id,D,price,remote,sku,seconds,at,code,mode==='unknown'?null:'yookassa',mode,mode==='unknown'?null:SHOP_ID]);
    await pool.query("INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id) VALUES($1,$2,'yookassa',$3,$4,$5,$6,$7)",[id,D,remote,price,at,mode,mode==='unknown'?null:SHOP_ID]);
  }
  const auth = new AuthService(new PgAuthStore(pool, 'credits_v1'), secret);
  tokens = {};
  for (const id of [A, B, C, D]) { tokens[id] = (await auth.login(`${id}@test.invalid`, password, '198.51.100.0/24'))!; expect(await auth.authenticate(tokens[id]!)).toMatchObject({ account_id: id }); }
  redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, connectTimeout: 2000 });
  await redis.ping();
  provider = await startFakeYooKassa({test:false});
  const socket = createServer(); await new Promise<void>(resolve => socket.listen(0, '127.0.0.1', resolve));
  const port = (socket.address() as import('node:net').AddressInfo).port; await new Promise<void>(resolve => socket.close(() => resolve()));
  origin = `http://127.0.0.1:${port}`;
  const scopedDatabase = new URL(database); scopedDatabase.searchParams.set('options', `-c search_path=${schema},public`);
  childEnv = { ...environment(), PATH: process.env.PATH, NODE_ENV: 'test', NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: scopedDatabase.href, REDIS_URL: redisUrl, SESSION_SECRET: secret, N5_PUBLIC_ORIGIN: 'https://test.invalid',
    N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false', N5_TEST_CHECKOUT_ACCOUNT_ID: '',
    N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'false',
    S3_ENDPOINT: 'http://127.0.0.1:9', S3_PUBLIC_ENDPOINT: 'https://storage.test.invalid', CLIPMKR_TEST_PAYMENT_ORIGIN: provider.apiBase };
  await start('');
}, 60000);
afterAll(async () => {
  try { await stop(); } finally {
    writeFileSync(resolve(evidence, 'next.log'), logs, { mode: 0o600 });
    await provider?.close();
    if (redis) {
      // Rate keys имеют собственный random-secret namespace; чужие ключи/очереди не удаляем.
      const identities = [...[A,B,C,D].map(id=>`account:${id}`), 'anonymous:198.51.100.0/24'];
      const keys = identities.flatMap(id => ['read', 'mutation'].map(kind => `n5:${kind}:rate:` + createHmac('sha256', secret).update(id).digest('hex')));
      await redis.del(...keys); await redis.quit();
    }
    if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  }
}, 15000);

describe('payment provenance native Next', () => {
  it('native owner and blogger show independent live revenue oracles', async () => {
    for(const browserType of [chromium,webkit]) {
    const browser=await browserType.launch({headless:true});
    const contexts=[];
    try {
      for(const who of [A,B,C]) {
        const context=await browser.newContext({viewport:{width:1440,height:1000}});contexts.push(context);
        const page=await context.newPage();page.setDefaultTimeout(15000);
        await page.route('**/*',async route=>{
          if(new URL(route.request().url()).origin!==origin)return route.abort();
          const headers={...route.request().headers(),'x-forwarded-for':xff,cookie:`__Host-n5_session=${tokens[who]}`};
          const response=await route.fetch({headers,timeout:15000,maxRedirects:0});await route.fulfill({response,body:await response.body()});
        });
        if(who===A) {
          const api=await context.request.get(origin+'/api/owner/bloggers?month=2026-11',{headers:{cookie:`__Host-n5_session=${tokens[A]}`,'x-forwarded-for':xff}});
          expect(api.status()).toBe(200);const report=(await api.json()).data;
          expect(report.bloggers.find((b:{account_id:string})=>b.account_id===B).counters).toMatchObject({payments:2,revenue_minor:548000,paying_users:1,commission_estimate_minor:109600});
          for(const reload of [false,true]) {
            if(reload)await page.reload();else await page.goto(origin+'/dashboard/bloggers');
            await page.getByRole('button',{name:'Отчёт за месяц →',exact:true}).click();
            await page.locator('#blogger-month').fill('2026-11');await page.getByRole('button',{name:'Показать статистику',exact:true}).click();
            const row=page.locator('article.partner-panel').filter({has:page.getByRole('heading',{name:`${B}@test.invalid`,exact:true})});
            await expect.poll(async()=>await row.locator('dt').filter({hasText:'Выручка пакетов'}).first().locator('..').locator('dd').textContent()).toMatch(/5\s?480,00/);
            expect(await row.locator('dt').filter({hasText:'Платили'}).first().locator('..').locator('dd').textContent()).toBe('1');
            expect(await row.textContent()).toMatch(/1\s?096,00/);
            expect(await row.textContent()).toContain('Платежи: 2');
          }
        } else {
          const api=await context.request.get(origin+'/api/trpc/partner.dashboard?input=%7B%7D',{headers:{cookie:`__Host-n5_session=${tokens[who]}`,'x-forwarded-for':xff}});
          expect(api.status()).toBe(200);expect((await api.json()).result.data.data.counters).toMatchObject(who===B?{purchases:3,revenue_minor:647000}:{purchases:0,revenue_minor:0});
          for(const reload of [false,true]) {
            if(reload)await page.reload();else await page.goto(origin+'/dashboard/partner');
            await expect.poll(async()=>await page.getByText('Подтверждённая выручка пакетов:',{exact:false}).textContent()).toMatch(who===B?/6\s?470,00/:/0,00/);
            expect(await page.locator('dt').filter({hasText:'Покупки пакетов'}).locator('..').locator('dd').textContent()).toBe(who===B?'3':'0');
            if(who===C)expect(await page.locator('main').textContent()).not.toContain('NEXTLIVEA');
          }
          if(who===B) {
            await page.getByText('Дополнительные показатели и ссылки',{exact:true}).click();
            await page.locator('#blogger-filter').selectOption(codeA);
            await expect.poll(async()=>await page.getByText('Подтверждённая выручка пакетов:',{exact:false}).textContent()).toMatch(/4\s?980,00/);
            expect(await page.locator('dt').filter({hasText:'Покупки пакетов'}).locator('..').locator('dd').textContent()).toBe('2');
            await page.locator('#blogger-filter').selectOption(codeB);
            await expect.poll(async()=>await page.getByText('Подтверждённая выручка пакетов:',{exact:false}).textContent()).toMatch(/1\s?490,00/);
          }
        }
      }
    } finally {for(const context of contexts)await context.close();await browser.close();}
    }
  },120000);
  it('cutover drains legacy writer sessions before new payments start', async () => {
    await stop();
    await expect(fetch(origin,{signal:AbortSignal.timeout(1000)})).rejects.toThrow();
    const oldSchema=`cutover_old_${randomBytes(8).toString('hex')}`, old=createPool(process.env.DATABASE_URL!,oldSchema);
    const migrations=await mkdtemp(join(tmpdir(),'cutover-before-030-'));
    const previousEnv=childEnv;
    let legacy:ChildProcess|undefined;
    let held:PoolClient|undefined;
    try {
      await old.query(`CREATE SCHEMA ${oldSchema}`);
      for(const name of await readdir('packages/db/migrations')) if(/^\d+_.*\.sql$/.test(name)&&Number(name.slice(0,3))<30) await copyFile(join('packages/db/migrations',name),join(migrations,name));
      await migrate(old,migrations);
      const migrationCount=async()=>Number((await old.query("SELECT count(*) AS n FROM _schema_migration WHERE name LIKE '030_%'")).rows[0].n);
      const provenanceColumns=async()=>Number((await old.query("SELECT count(*) AS n FROM information_schema.columns WHERE table_schema=$1 AND column_name='payment_environment'",[oldSchema])).rows[0].n);
      expect(await migrationCount()).toBe(0);expect(await provenanceColumns()).toBe(0);
      const who=(await old.query("INSERT INTO account(email,password_hash,billing_policy) VALUES($1,'synthetic','credits_v1') RETURNING id",[`${randomUUID()}@test.invalid`])).rows[0].id;
      const baseline=execFileSync('git',['show','5c5130d:packages/db/src/payments.ts'],{encoding:'utf8'});
      const ts=await import('typescript');
      const compiled=ts.transpileModule(baseline,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
      // Old native create/bind/apply and canonical HTTP verification; ordinary COMMIT and graceful server.close.
      const script=`const Module=require('node:module'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');let server,pool;process.on('message',async input=>{if(input.stop){server.close(async()=>{await pool.end();process.exit(0);});process.send({stopping:true});return;}const m=new Module(input.filename);m.filename=input.filename;m.paths=Module._nodeModulePaths(path.dirname(input.filename));m._compile(input.code,input.filename);const {Pool}=require('pg');pool=new Pool({connectionString:input.database,application_name:input.tag});const pay=require(input.providerEntry).createYooKassaProvider(input.providerOptions);server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const raw=Buffer.concat(chunks);let result;if(req.url==='/checkout'&&req.method==='POST'){const body=JSON.parse(raw.toString('utf8'));const created=await m.exports.createPaymentIntent(pool,{accountId:input.accountId,priceMinor:99000,idempotencyKey:body.key,sku:'start_v1',billingMode:'credits_v1',receiptConfig:{vatCode:1,paymentSubject:'service',paymentMode:'full_payment'}});if(created.kind!=='created'&&created.kind!=='existing')throw new Error('checkout failed');const remote=await pay.createPayment({orderId:created.intent.id,amountMinor:99000,returnUrl:'https://test.invalid/return',description:'Legacy checkout',receipt:created.intent.receipt_snapshot});if(!await m.exports.setIntentProviderPayment(pool,created.intent.id,remote.id))throw new Error('bind failed');result={intentId:created.intent.id,paymentId:remote.id};}else if(req.url==='/callback'&&req.method==='POST'){const verified=await pay.verifyNotification({rawBody:raw,headers:{},sourceIp:'185.71.76.10'});if(verified.kind!=='payment_succeeded')throw new Error('unexpected event');result=await m.exports.applyVerifiedPayment(pool,{provider:'yookassa',eventKey:'payment_succeeded:'+verified.payment.id,payloadSha256:crypto.createHash('sha256').update(raw).digest('hex'),payment:verified.payment});}else{res.writeHead(404);res.end();return;}res.setHeader('content-type','application/json');res.end(JSON.stringify(result));}catch{res.writeHead(503);res.end();}});server.listen(0,'127.0.0.1',()=>process.send({port:server.address().port}));});`;
      const scoped=new URL(process.env.DATABASE_URL!);scoped.searchParams.set('options',`-c search_path=${oldSchema},public`);
      const tag=`legacy_${randomBytes(6).toString('hex')}`;
      legacy=spawn(process.execPath,['--import',resolve('tests/fixtures/payment-test-transport.mjs'),'-e',script],{cwd:resolve('.'),env:{NODE_ENV:'test',PATH:process.env.PATH,CLIPMKR_TEST_PAYMENT_ORIGIN:provider.apiBase},stdio:['ignore','pipe','pipe','ipc']});
      const ready=new Promise<{port:number}>(resolve=>legacy!.once('message',message=>resolve(message as {port:number})));
      const exited=new Promise<number|null>(resolve=>legacy!.once('exit',resolve));
      legacy.send({code:compiled,filename:resolve('packages/db/dist/legacy-payment.private.js'),providerEntry:resolve('apps/web/.next/preflight/server/payments/yookassa.js'),providerOptions:{shopId:SHOP_ID,secretKey:SECRET,testMode:false},database:scoped.href,tag,accountId:who});
      const oldOrigin='http://127.0.0.1:'+(await ready).port;
      const checkout=async()=>{const response=await fetch(oldOrigin+'/checkout',{method:'POST',body:JSON.stringify({key:randomUUID()})});expect(response.status).toBe(200);return await response.json() as {intentId:string;paymentId:string};};
      const callback=(id:string)=>fetch(oldOrigin+'/callback',{method:'POST',body:provider.notification(id)});
      const control=await checkout();provider.pay(control.paymentId);
      expect(await (await callback(control.paymentId)).json()).toMatchObject({applied:true});
      const draining=await checkout(),pending=await checkout();provider.pay(draining.paymentId);
      expect(await migrationCount()).toBe(0);expect(await provenanceColumns()).toBe(0);
      let stopping=false;
      const oldSessions=async()=>Number((await old.query('SELECT count(*) AS n FROM pg_stat_activity WHERE application_name=$1',[tag])).rows[0].n);
      // This is the rehearsal's migration/start entry: both effects are behind the measured drain barrier.
      const cutover=async()=>{
        if(!stopping || legacy!.exitCode===null || await oldSessions()!==0) throw new Error('legacy writers not drained');
        await migrate(old);
        childEnv={...previousEnv,DATABASE_URL:scoped.href};await start('');
      };
      held=await old.connect();await held.query('BEGIN');await held.query('SELECT id FROM account WHERE id=$1 FOR UPDATE',[who]);
      const inflight=callback(draining.paymentId);
      let waiting=false;
      for(let n=0;n<200;n++){const rows=(await old.query("SELECT wait_event_type FROM pg_stat_activity WHERE application_name=$1",[tag])).rows;if(rows.some(row=>row.wait_event_type==='Lock')){waiting=true;break;}await delay(25);}
      expect(waiting).toBe(true);
      await expect(cutover()).rejects.toThrow('legacy writers not drained');
      expect(await migrationCount()).toBe(0);expect(await provenanceColumns()).toBe(0);
      const stoppedAccepting=new Promise<void>(resolve=>legacy!.once('message',message=>{expect(message).toMatchObject({stopping:true});resolve();}));
      legacy.send({stop:true});await stoppedAccepting;stopping=true;
      await expect(fetch(oldOrigin+'/checkout',{method:'POST',body:JSON.stringify({key:randomUUID()}),signal:AbortSignal.timeout(1000)})).rejects.toThrow();
      await expect(cutover()).rejects.toThrow('legacy writers not drained');expect(await migrationCount()).toBe(0);
      await held.query('COMMIT');held.release();held=undefined;
      expect(await (await inflight).json()).toMatchObject({applied:true});expect(await exited).toBe(0);expect(await oldSessions()).toBe(0);
      expect(Number((await old.query('SELECT count(*) AS n FROM payment WHERE provider_payment_id=$1',[pending.paymentId])).rows[0].n)).toBe(0);
      await cutover();expect(await migrationCount()).toBe(1);expect(await provenanceColumns()).toBe(2);
      expect((await old.query('SELECT payment_environment FROM payment WHERE provider_payment_id=$1',[draining.paymentId])).rows[0].payment_environment).toBe('unknown');
      await expect(fetch(oldOrigin+'/callback',{method:'POST',body:provider.notification(draining.paymentId),signal:AbortSignal.timeout(1000)})).rejects.toThrow();
      provider.pay(pending.paymentId);
      const notify=()=>fetch(origin+'/api/webhooks/yookassa',{method:'POST',body:provider.notification(pending.paymentId),headers:{'content-type':'application/json','x-forwarded-for':'185.71.76.10, 10.0.0.2, 10.0.0.3'}});
      expect((await (await notify()).json()).data.applied).toBe(true);expect((await (await notify()).json()).data.reason).toBe('duplicate');
      expect(Number((await old.query('SELECT count(*) AS n FROM payment WHERE provider_payment_id=$1',[pending.paymentId])).rows[0].n)).toBe(1);
      expect(Number((await old.query('SELECT count(*) AS n FROM payment_event WHERE provider_event_id=$1',[`payment_succeeded:${pending.paymentId}`])).rows[0].n)).toBe(1);
      expect(Number((await old.query("SELECT count(*) AS n FROM credit_grant WHERE payment_ref=$1 AND source='payment'",[pending.intentId])).rows[0].n)).toBe(1);
      expect((await old.query('SELECT payment_environment FROM payment_intent WHERE id=$1',[pending.intentId])).rows[0].payment_environment).toBe('live');
    } finally {
      if(held){await held.query('ROLLBACK');held.release();}
      if(legacy&&legacy.exitCode===null){const closed=once(legacy,'exit');legacy.kill('SIGKILL');await closed;}
      await stop();childEnv=previousEnv;
      await old.query(`DROP SCHEMA IF EXISTS ${oldSchema} CASCADE`);await old.end();await rm(migrations,{recursive:true,force:true});
    }
  },45000);
});
