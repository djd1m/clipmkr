import {afterEach,describe,it,expect,vi} from 'vitest';
import {SupportMailer} from '../apps/web/src/server/support/mail';
const config={mode:'resend' as const,apiKey:'synthetic-key',from:'КлипМейкер <sender@example.test>'};
const message={to:'recipient@example.test',url:'https://test.invalid/reset#token=synthetic&x="<',purpose:'reset' as const};
const mailer=(fetchImpl:typeof fetch,c=config)=>new SupportMailer(c,undefined,undefined,fetchImpl);
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
describe('bounded Resend transport',()=>{
 it('uses the fixed HTTP contract and snapshots operator configuration',async()=>{
  const fetchImpl=vi.fn<typeof fetch>().mockResolvedValue(Response.json({id:'synthetic-id'}));
  const c={...config};const send=mailer(fetchImpl,c);c.apiKey='changed';
  expect(await send.send(message)).toBe('accepted');
  const [url,options]=fetchImpl.mock.calls[0]!;
  expect(url).toBe('https://api.resend.com/emails');
  expect(options).toMatchObject({method:'POST',redirect:'error',headers:{authorization:'Bearer synthetic-key','content-type':'application/json'}});
  expect(options!.signal).toBeInstanceOf(AbortSignal);
  const body=JSON.parse(options!.body as string);
  expect(body).toMatchObject({from:config.from,to:[message.to],subject:'Восстановление пароля КлипМейкер'});
  expect(body.text).toContain(message.url);expect(body.html).toContain('&amp;x=&quot;&lt;');
 });
 it.each([400,401,429,500])('maps definite HTTP %s refusal to failed without retry',async status=>{
  const fetchImpl=vi.fn<typeof fetch>().mockResolvedValue(new Response('private recipient/token',{status}));
  expect(await mailer(fetchImpl).send(message)).toBe('failed');expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
 it.each(['{}','{"id":""}','not JSON',JSON.stringify({id:'x'.repeat(17000)})])('keeps ambiguous responses unknown',async body=>{
  expect(await mailer(vi.fn<typeof fetch>().mockResolvedValue(new Response(body))).send(message)).toBe('unknown');
 });
 it('does not log provider exceptions, bodies, recipients or tokens',async()=>{
  const error=vi.spyOn(console,'error'),info=vi.spyOn(console,'info'),log=vi.spyOn(console,'log'),warn=vi.spyOn(console,'warn');
  expect(await mailer(vi.fn<typeof fetch>().mockRejectedValue(new Error(message.url+config.apiKey))).send(message)).toBe('unknown');
  for(const spy of [error,info,log,warn])expect(spy).not.toHaveBeenCalled();
 });
 it.each(['fetch','body'] as const)('aborts %s at 8s, bounds global concurrency to four and releases permits',async stage=>{
  vi.useFakeTimers();const signals:AbortSignal[]=[];
  const fetchImpl=vi.fn<typeof fetch>().mockImplementation(async(_url,options)=>{
   const signal=options!.signal!;signals.push(signal);
   if(stage==='fetch')return await new Promise<Response>((_resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));
   return new Response(new ReadableStream({start(controller){signal.addEventListener('abort',()=>controller.error(new Error('aborted')));}}));
  });
  const a=mailer(fetchImpl),b=mailer(fetchImpl);
  const pending=Array.from({length:4},(_,i)=>(i%2?a:b).send(message));
  expect(await a.send(message)).toBe('failed');expect(fetchImpl).toHaveBeenCalledTimes(4);
  await vi.advanceTimersByTimeAsync(8000);
  expect(await Promise.all(pending)).toEqual(Array(4).fill('unknown'));
  expect(signals.every(signal=>signal.aborted)).toBe(true);
  expect(await mailer(vi.fn<typeof fetch>().mockResolvedValue(Response.json({id:'next'}))).send(message)).toBe('accepted');
 });
 it('rejects redirect/network ambiguity without retry',async()=>{
  const fetchImpl=vi.fn<typeof fetch>().mockRejectedValue(new TypeError('redirect prohibited'));
  expect(await mailer(fetchImpl).send(message)).toBe('unknown');expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
});

describe('retention Resend immutable payload',()=>{
 const content={from:'Original <old@example.test>',to:'recipient@example.test',subject:'Срок хранения 2 клипов скоро закончится',text:'Доступно до 12 ноября 2026, 15:00 МСК',html:'<p>Доступно до 12 ноября 2026, 15:00 МСК</p>'};
 it('reuses provider key and exact stored payload across retries and sender configuration changes',async()=>{
  const fetchImpl=vi.fn<typeof fetch>().mockImplementation(async()=>Response.json({id:'notice-id'}));
  const first=mailer(fetchImpl),second=mailer(fetchImpl,{...config,from:'New <new@example.test>'});
  expect(await first.sendRetention(content,'retention_synthetic')).toEqual({state:'accepted',receipt:'notice-id'});
  expect(await second.sendRetention(content,'retention_synthetic')).toEqual({state:'accepted',receipt:'notice-id'});
  const [a,b]=fetchImpl.mock.calls;
  expect(a![1]!.body).toBe(b![1]!.body);
  expect(a![1]!.headers).toMatchObject({'Idempotency-Key':'retention_synthetic'});
  expect(JSON.parse(a![1]!.body as string)).toEqual({...content,to:[content.to]});
 });
 it('keeps unknown receipt unknown and bounded without leaking content',async()=>{
  const fetchImpl=vi.fn<typeof fetch>().mockRejectedValue(new Error('synthetic unavailable'));
  expect(await mailer(fetchImpl).sendRetention(content,'retention_unknown')).toEqual({state:'unknown',receipt:null});
  expect(fetchImpl).toHaveBeenCalledTimes(1);
 });
 it('bounds retention request to 8 seconds and shares support concurrency budget',async()=>{
  vi.useFakeTimers();const signals:AbortSignal[]=[];
  const fetchImpl=vi.fn<typeof fetch>().mockImplementation(async(_url,options)=>{
   signals.push(options!.signal!);
   return await new Promise<Response>((_resolve,reject)=>options!.signal!.addEventListener('abort',()=>reject(new Error('aborted'))));
  });
  const send=mailer(fetchImpl),pending=Array.from({length:4},()=>send.sendRetention(content,'retention_budget'));
  expect(await send.send(message)).toBe('failed');
  await vi.advanceTimersByTimeAsync(8000);
  expect(await Promise.all(pending)).toEqual(Array.from({length:4},()=>({state:'unknown',receipt:null})));
  expect(signals.every(s=>s.aborted)).toBe(true);
 });
 it('does not expose SMTP as idempotent reminder transport and fences synthetic capture',async()=>{
  const disabled=new SupportMailer({mode:'disabled'});
  expect(disabled.retentionSender).toBeNull();
  expect((await disabled.sendRetention(content,'retention_disabled')).state).toBe('failed');
  const capture=vi.fn(async()=>{}),test=new SupportMailer({mode:'test'},undefined,undefined,undefined,capture);
  expect((await test.sendRetention({...content,to:'person@real-domain.com'},'retention_real')).state).toBe('failed');
  expect(capture).not.toHaveBeenCalled();
  expect((await test.sendRetention(content,'retention_test')).state).toBe('accepted');
  expect(capture).toHaveBeenCalledOnce();
 });
});
