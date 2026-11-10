import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import nodemailer from 'nodemailer';
import { createConnection, type Socket } from 'node:net';
import type { WebConfig } from '@clipmaker/shared/config';
export type MailConfig=WebConfig['mail'];
export interface SupportMessage { to:string; url:string; purpose:'verify'|'reset' }
export interface RetentionNoticeMessage { from:string; to:string; subject:string; text:string; html:string }
export interface MailTransport { sendMail(message:object):Promise<unknown>; close():void }
// Public getSocket hook retains cancellation ownership; Nodemailer still handles TLS and SMTP.
// Nonpooled transporter.close() alone only releases auth listeners, not an active socket.
export function createSMTPTransport(options:object):MailTransport {
  const {host,port}=options as {host:string;port:number};
  let socket:Socket|undefined;
  const transport=nodemailer.createTransport({...options,getSocket:(_options:object,callback:(error:Error|null,value?:object)=>void)=>{
    socket=createConnection({host,port});
    const failed=(error:Error)=>callback(error);
    socket.once('error',failed);
    socket.once('connect',()=>{socket!.removeListener('error',failed);callback(null,{connection:socket});});
  }});
  return {sendMail:message=>transport.sendMail(message),close:()=>{socket?.destroy();transport.close();}};
}
const mailGlobal=globalThis as typeof globalThis & {n5SupportMailBudget?:{active:number}};
export class SupportMailer {
  private readonly budget=mailGlobal.n5SupportMailBudget??= {active:0};
  constructor(private readonly config:MailConfig, private readonly capture?:(message:SupportMessage)=>Promise<void>,
    private readonly factory:(options:object)=>MailTransport=createSMTPTransport,
    private readonly fetchImpl:typeof fetch=fetch,
    private readonly captureRetention?:(message:RetentionNoticeMessage)=>Promise<void>) { this.config={...config}; }
  async send(message:SupportMessage):Promise<'accepted'|'failed'|'unknown'> {
    if(this.config.mode==='disabled'||this.budget.active>=4) return 'failed';
    if(this.config.mode==='test') {
      const domain=message.to.split('@')[1]?.toLowerCase();
      const synthetic=domain && (domain.endsWith('.test')||domain.endsWith('.invalid')||
        ['example.com','example.net','example.org'].some(reserved=>domain===reserved||domain.endsWith('.'+reserved)));
      if(!synthetic||!this.capture)return 'failed';
      await this.capture(message);return 'accepted';
    }
    this.budget.active++;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let transport:MailTransport|undefined;
    try {
      const c=this.config;
      const subject=message.purpose==='verify'?'Подтвердите почту КлипМейкер':'Восстановление пароля КлипМейкер';
      const escaped=message.url.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
      const content={from:c.from,to:message.to,subject,text:`${subject}\n${message.url}\nЕсли вы не запрашивали письмо, проигнорируйте его.`,
        html:`<p>${subject}</p><p><a href="${escaped}">Продолжить</a></p><p>Если вы не запрашивали письмо, проигнорируйте его.</p>`};
      if(c.mode==='resend') {
        // N1/N3 Resend donor: fixed fetch endpoint, explicit sender and Bearer credentials.
        const controller=new AbortController();
        return await Promise.race([
          this.sendResend(c,content,controller.signal).catch(()=> 'unknown' as const),
          new Promise<'unknown'>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve('unknown');},8000);}),
        ]);
      }
      transport=this.factory({host:c.host,port:c.port,secure:c.secure,requireTLS:true,auth:{user:c.user,pass:c.password},
        connectionTimeout:8000,greetingTimeout:8000,socketTimeout:8000,dnsTimeout:8000,
        disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false,pool:false});
      return await Promise.race([
        transport.sendMail({...content,disableFileAccess:true,disableUrlAccess:true}).then(()=> 'accepted' as const,()=> 'unknown' as const),
        new Promise<'unknown'>(resolve=>{timer=setTimeout(()=>{transport?.close();resolve('unknown');},8000);}),
      ]);
    } catch {return 'failed';}
    finally {if(timer)clearTimeout(timer);transport?.close();this.budget.active--;}
  }
  get retentionSender():string|null {
    return this.config.mode==='resend'?this.config.from:this.config.mode==='test'&&this.captureRetention?'Clipmkr <sender@example.test>':null;
  }
  async sendRetention(message:RetentionNoticeMessage, providerKey:string):Promise<{state:'accepted'|'failed'|'unknown';receipt:string|null}> {
    const result=(state:'accepted'|'failed'|'unknown',receipt:string|null=null)=>({state,receipt});
    if(!this.retentionSender||this.budget.active>=4||!/^[A-Za-z0-9_-]{1,256}$/.test(providerKey))return result('failed');
    if(![message.from,message.to,message.subject].every(v=>typeof v==='string'&&v.length>0&&v.length<=512&&!/[\x00-\x1f\x7f]/.test(v))||
      typeof message.text!=='string'||typeof message.html!=='string'||message.text.length>16384||message.html.length>32768)return result('failed');
    if(this.config.mode==='test') {
      const domain=message.to.split('@')[1]?.toLowerCase();
      const synthetic=domain&&(domain.endsWith('.test')||domain.endsWith('.invalid')||
        ['example.com','example.net','example.org'].some(reserved=>domain===reserved||domain.endsWith('.'+reserved)));
      if(!synthetic||!this.captureRetention)return result('failed');
      await this.captureRetention({...message});return result('accepted','test-'+providerKey);
    }
    if(this.config.mode!=='resend')return result('failed');
    this.budget.active++;
    const controller=new AbortController();let receipt:string|null=null;
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      const state=await Promise.race([
        this.sendResend(this.config,message,controller.signal,providerKey,id=>{receipt=id;}).catch(()=>'unknown' as const),
        new Promise<'unknown'>(resolve=>{timer=setTimeout(()=>{controller.abort();resolve('unknown');},8000);}),
      ]);
      return result(state,receipt);
    } finally {if(timer)clearTimeout(timer);this.budget.active--;}
  }
  private async sendResend(config:Extract<MailConfig,{mode:'resend'}>,content:{to:string;from:string;subject:string;text:string;html:string},signal:AbortSignal,providerKey?:string,onReceipt?:(id:string)=>void):Promise<'accepted'|'failed'|'unknown'> {
    const response=await this.fetchImpl('https://api.resend.com/emails',{
      method:'POST',headers:{authorization:`Bearer ${config.apiKey}`,'content-type':'application/json',...(providerKey?{'Idempotency-Key':providerKey}:{})},
      body:JSON.stringify({from:content.from,to:[content.to],subject:content.subject,text:content.text,html:content.html}),redirect:'error',signal,
    });
    if(!response.ok) {void response.body?.cancel().catch(()=>{});return 'failed';}
    if(!response.body)return 'unknown';
    const reader=response.body.getReader();
    const chunks:Uint8Array[]=[];let bytes=0;
    try {
      while(true) {
        const chunk=await reader.read();if(chunk.done)break;
        bytes+=chunk.value.byteLength;
        if(bytes>16384) {await reader.cancel();return 'unknown';}
        chunks.push(chunk.value);
      }
      const parsed:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(typeof parsed!=='object'||parsed===null||!('id' in parsed)||typeof parsed.id!=='string'||
        !parsed.id.trim()||parsed.id.length>256||/[\x00-\x20\x7f]/.test(parsed.id))return 'unknown';
      onReceipt?.(parsed.id);return 'accepted';
    } finally {reader.releaseLock();}
  }

}

/** Shared runtime construction: reuse the existing protected synthetic test capture. */
export function createSupportMailer(config:MailConfig,captureFile=process.env.N5_MAIL_TEST_CAPTURE_FILE):SupportMailer {
  const capture=config.mode==='test'&&captureFile?.startsWith('/tmp/')?async(message:SupportMessage|RetentionNoticeMessage)=>{
    const file=await open(captureFile,constants.O_WRONLY|constants.O_CREAT|constants.O_APPEND|constants.O_NOFOLLOW,0o600);
    try{await file.chmod(0o600);await file.writeFile(JSON.stringify(message)+'\n');}finally{await file.close();}
  }:undefined;
  return new SupportMailer(config,capture,createSMTPTransport,fetch,capture);
}
