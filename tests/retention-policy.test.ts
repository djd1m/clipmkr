import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {UpgradeScreen,type UpgradeProps} from '../apps/web/src/app/upgrade/UpgradeScreen';
import {ReturnView} from '../apps/web/src/app/upgrade/return/ReturnScreen';
import {createGuestPageHandler} from '../apps/web/src/server/guest-page';
import {VideoDetail} from '../apps/web/src/app/videos/[videoId]/VideoDetail';
import type {VideoScreen,ClipScreen} from '../apps/web/src/lib/screen-contract';
import { describe,it,expect,vi } from 'vitest';
import { clipExpiry,FREE_RETENTION_MS,PAID_RETENTION_MS } from '../packages/shared/src/tariff';
import { SHOWCASE_CLIP_IDS } from '../packages/shared/src/showcase';
import { generateDownloadUrl,createS3Client } from '../packages/s3/src';
import { loadWebConfig } from '../packages/shared/src/config';
import { environment } from './fixtures/environment';
vi.mock('next/navigation',()=>({useRouter:()=>({refresh:vi.fn()})}));
const ready=new Date('2026-11-01T12:00:00Z');
const base={clipId:'ordinary',expiresAt:null,readyAt:ready};
describe('retention policy finite windows',()=>{
  it('runtime_policy_copy_and_guest_deadline_match_retention',async()=>{
    const purchase:UpgradeProps={title:'Pro',price:'990 ₽',days:30,paidMinutes:270,salesEnabled:true,current:{plan:'free',plan_source:'none',plan_paid_until:null},purchaseWindows:{asOf:'2026-11-10T12:00:00Z',baseStart:'2026-11-10T12:00:00Z',baseEnd:'2026-12-10T12:00:00Z',addonStart:'2026-11-10T12:00:00Z',addonEnd:'2026-12-10T12:00:00Z',scheduled:false}};
    const purchases=[renderToStaticMarkup(createElement(UpgradeScreen,{...purchase,creditMode:true})),renderToStaticMarkup(createElement(UpgradeScreen,{...purchase,creditMode:false}))];
    const returns=[renderToStaticMarkup(createElement(ReturnView,{state:{kind:'succeeded',until:'2026-12-10T12:00:00Z'}})),renderToStaticMarkup(createElement(ReturnView,{state:{kind:'package',title:'Старт',credits:300,start:'2026-11-10T12:00:00Z',end:'2026-12-10T12:00:00Z',scheduled:false}}))];
    for(const html of [...purchases,...returns]){
      expect.soft(html).toContain('7 суток');expect.soft(html).toContain('30 суток');
      expect.soft(html).not.toContain('ещё 3 дня');expect.soft(html).not.toContain('хранение без срока');
      expect.soft(html).not.toContain('Клипы хранятся без срока');expect.soft(html).not.toContain('храниться без срока');
      expect.soft(html).toContain('href="/dashboard"');
    }
    const initial:ClipScreen={clip_id:'22222222-2222-4222-8222-222222222222',index:1,start:0,end:20,title:'Гостевой клип',status:'done',watermarked:true,expires_at:'2026-11-12T12:34:00.000Z',available:true,retention_state:'active'};
    const guest=async(clip:ClipScreen,packExpiry='2026-11-14T18:45:00.000Z',creditMode=false)=>{
      const pack={id:'33333333-3333-4333-8333-333333333333',code:'g'.repeat(32),account_id:'44444444-4444-4444-8444-444444444444',guest_name:'Гость',video_id:'11111111-1111-4111-8111-111111111111',sent_at:new Date('2026-11-01T12:00:00Z'),expires_at:new Date(packExpiry),revoked_at:null,plan:'free',finished_at:ready,retention_from:ready,clips:[clip]};
      const handler=createGuestPageHandler({referralSecret:'synthetic-retention-secret',trustedProxyHops:2,allowRead:async()=>true,auth:{authenticate:async()=>null},guests:{find:async()=>pack,recordOpen:async()=>{}},paymentsOn:true,creditMode});
      const response=await handler(new Request('https://test.invalid/g/'+pack.code,{headers:{'x-forwarded-for':'192.0.2.1,127.0.0.1,127.0.0.2'}}),pack.code);
      expect(response.status).toBe(200);return response.text();
    };
    const clipEarlier=await guest(initial),packEarlier=await guest(initial,'2026-11-11T18:45:00.000Z',true);
    for(const html of [clipEarlier,packEarlier]){
      expect.soft(html).toContain('Доступно до');expect.soft(html).toContain('МСК');
      expect.soft(html).toContain('7 суток');expect.soft(html).toContain('30 суток');
      expect.soft(html).not.toContain('хранение без срока');expect.soft(html).toContain('<video');
      expect.soft(html).toContain('href="/upgrade?from=guest_page"');
    }
    expect.soft(clipEarlier.match(/<article>[^]*?<\/article>/)![0]).toContain('<time datetime="2026-11-12T12:34:00.000Z">');
    expect.soft(clipEarlier).toContain('15:34');
    expect.soft(packEarlier.match(/<article>[^]*?<\/article>/)![0]).toContain('<time datetime="2026-11-11T18:45:00.000Z">');
    expect.soft(packEarlier).toContain('21:45');
    // Expiry, irreversible claim and completed deletion share the public state supplied by the backend.
    for(const title of ['Истёкший клип','Удаляемый клип','Удалённый клип']){
      const html=await guest({...initial,title,available:false,retention_state:'expired'});
      expect.soft(html).toContain('Срок хранения закончился');expect.soft(html).not.toContain('<video');
      expect.soft(html).not.toContain('class="download" href="/api/clips/');
      expect.soft(html).not.toContain('истёк или файл пока недоступен');
      expect.soft(html).toContain('<button id="download-all" hidden disabled>');
      expect.soft(html).not.toContain('Скачайте и опубликуйте их у себя.');
    }
    const unknown=await guest({...initial,expires_at:null,available:false,retention_state:'unknown'});
    expect.soft(unknown).toContain('Дата хранения уточняется');expect.soft(unknown).not.toContain('Срок хранения закончился');
    expect.soft(unknown).not.toContain('без срока');expect.soft(unknown).not.toContain('<video');
    const processing=await guest({...initial,status:'rendering',available:false,expires_at:null,retention_state:'unknown'});
    expect.soft(processing).toContain('Клип ещё обрабатывается');expect.soft(processing).not.toContain('Срок хранения закончился');expect.soft(processing).not.toContain('<video');
    const failed=await guest({...initial,status:'failed',available:false,expires_at:null,retention_state:undefined});
    expect.soft(failed).toContain('Клип не удалось собрать');expect.soft(failed).not.toContain('Срок хранения закончился');expect.soft(failed).not.toContain('<video');
    const unknownAvailable=await guest({...initial,expires_at:null,retention_state:'unknown'});
    expect.soft(unknownAvailable).toContain('Дата хранения уточняется');expect.soft(unknownAvailable).not.toContain('без срока');expect.soft(unknownAvailable).toContain('<video');
    const exempt=await guest({...initial,expires_at:null,retention_state:'unlimited'});
    expect.soft(exempt.match(/<article>[^]*?<\/article>/)![0]).toContain('<time datetime="2026-11-14T18:45:00.000Z">');
  });

  it('expired_record_header_keeps_history_without_hiding_partial_failure',()=>{
    const video:VideoScreen={video_id:'11111111-1111-4111-8111-111111111111',status:'done',created_at:ready.toISOString(),updated_at:ready.toISOString(),duration_seconds:100,user_state:'успех',stage_label:'Клипы готовы',stage_progress:100,clips_done:1,clips_total:1,no_response:false,failure_reason:null,next_action:null,retry_after:null,poll_after_seconds:5,failed_stage:null,cta_kind:'none',cta_url:null};
    const clip:ClipScreen={clip_id:'22222222-2222-4222-8222-222222222222',index:1,start:0,end:20,title:'Сохранённый фрагмент',status:'done',watermarked:true,expires_at:ready.toISOString(),available:false,retention_state:'expired'};
    const html=renderToStaticMarkup(createElement(VideoDetail,{videoId:video.video_id,initialVideo:video,initialClips:[clip]}));
    expect(html).toContain('Срок хранения закончился');expect(html).toContain('История записи сохранена');expect(html).toContain(clip.title);
    expect(html).not.toContain('Готовые клипы');expect(html).not.toContain('Выберите фрагмент для просмотра');expect(html).not.toContain('<video');
    const mixed=renderToStaticMarkup(createElement(VideoDetail,{videoId:video.video_id,initialVideo:{...video,clips_total:2},initialClips:[clip,{...clip,clip_id:'33333333-3333-4333-8333-333333333333',index:2,status:'failed',expires_at:null,retention_state:undefined}]}));
    expect(mixed).toContain('Часть клипов не удалось собрать');expect(mixed).not.toContain('<h1 tabindex="-1">Срок хранения закончился');
  });
  it('uses seven 24-hour days and thirty paid days',()=>{
    expect(FREE_RETENTION_MS).toBe(604800000);expect(PAID_RETENTION_MS).toBe(2592000000);
    expect(clipExpiry(base)?.toISOString()).toBe('2026-11-08T12:00:00.000Z');
    expect(clipExpiry({...base,paidUntil:new Date('2026-12-01T12:00:00Z')})?.toISOString()).toBe('2026-12-31T12:00:00.000Z');
    expect(clipExpiry({...base,paidUntil:new Date('2026-01-01')})?.toISOString()).toBe('2026-11-08T12:00:00.000Z');
  });
  it('retains explicit cap and declared exceptions without role inference',()=>{
    const cap=new Date('2026-11-03');
    expect(clipExpiry({...base,retentionExempt:true})).toBeNull();
    expect(clipExpiry({...base,retentionExempt:true,expiresAt:cap})).toBe(cap);
    expect(clipExpiry({...base,clipId:SHOWCASE_CLIP_IDS[0]})).toBeNull();
    expect(clipExpiry({...base,plan:'paid'})?.toISOString()).toBe('2026-11-08T12:00:00.000Z');
    expect(clipExpiry({...base,readyAt:null})).toBeNull();
  });
  it('retention_signature_delay_never_extends_deadline',async()=>{
    const config=loadWebConfig(environment()),client=createS3Client(config.s3),ctx={client,bucket:config.s3.bucket};
    const deadline=new Date('2026-11-08T12:00:00Z');
    try {
      await expect(generateDownloadUrl(ctx,'clips/free/test/file.mp4',undefined,deadline,new Date('2026-11-08T12:00:01Z'))).rejects.toMatchObject({name:'ClipSignatureExpired'});
      await expect(generateDownloadUrl(ctx,'clips/free/test/file.mp4',undefined,deadline,new Date(deadline.getTime()-999))).rejects.toMatchObject({name:'ClipSignatureExpired'});
      const url=new URL(await generateDownloadUrl(ctx,'clips/free/test/file.mp4',undefined,deadline,new Date('2026-11-08T11:59:58.500Z')));
      expect(url.searchParams.get('X-Amz-Expires')).toBe('1');
      expect(url.searchParams.get('X-Amz-Date')).toBe('20261108T115958Z');
    } finally {client.destroy();}
  });
});
