import { createHash } from 'node:crypto';
import { retentionDeadlineSql, transaction, type Pool, type PoolClient } from '@clipmaker/db';
import type { RetentionNoticeMessage, SupportMailer } from './support/mail';

const DAY = 86_400_000, HOUR = 3_600_000;
interface Group {
  account_id:string; video_id:string; email:string; email_verified_at:Date|null;
  expiry_day_msk:string; deadline:Date; clip_count:number;
}
interface Notice {
  id:string; account_id:string; video_id:string; expiry_day_msk:string; deadline:Date;
  offset_days:number; clip_count:number; payload:RetentionNoticeMessage; provider_key:string;
  state:string; attempts:number; first_attempt_at:Date|null; last_attempt_at:Date|null;
}
// The same SQL projection as access/cleanup. Moscow date is aggregation, never a substitute for the exact deadline.
const groupsSql = `WITH eligible AS (
  SELECT v.account_id,v.id AS video_id,a.email,a.email_verified_at,
    ${retentionDeadlineSql('c','v','a','$1')} AS deadline
  FROM clip c JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id
  WHERE a.status='active' AND v.deleted_at IS NULL AND c.status='done'
    AND c.object_key IS NOT NULL AND c.deletion_started_at IS NULL
    AND ($2::uuid IS NULL OR v.id=$2)
), grouped AS (
  SELECT account_id,video_id,email,email_verified_at,
    (deadline AT TIME ZONE 'Europe/Moscow')::date AS expiry_day_msk,
    min(deadline) AS deadline,count(*)::int AS clip_count
  FROM eligible WHERE deadline>$1 GROUP BY account_id,video_id,email,email_verified_at,
    (deadline AT TIME ZONE 'Europe/Moscow')::date
) SELECT account_id,video_id,email,email_verified_at,expiry_day_msk::text,deadline,clip_count
  FROM grouped WHERE ($3::date IS NULL OR expiry_day_msk=$3)`;
function offset(deadline:Date, now:Date):number|null {
  const remaining=deadline.getTime()-now.getTime();
  return remaining>DAY&&remaining<=3*DAY?3:remaining>0&&remaining<=DAY?1:null;
}
function payload(group:Group, from:string, origin:string):RetentionNoticeMessage {
  const date=new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'long',timeStyle:'short'}).format(group.deadline)+' МСК';
  const url=new URL(`/dashboard/videos/${group.video_id}`,origin).href;
  const subject=`Срок хранения ${group.clip_count} клипов скоро закончится`;
  const text=`${subject}. Доступно до ${date}.\nСкачайте клипы до этого срока. История записи останется.\n${url}`;
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  return {from,to:group.email,subject,text,html:`<p>${escape(subject)}.</p><p>Доступно до ${escape(date)}.</p><p>Скачайте клипы до этого срока. История записи останется.</p><p><a href="${escape(url)}">Открыть запись</a></p>`};
}
const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
const payloadHash=(content:RetentionNoticeMessage)=>digest(JSON.stringify({from:content.from,to:[content.to],subject:content.subject,text:content.text,html:content.html}));
async function currentGroup(tx:PoolClient, notice:Notice, now:Date) {
  return (await tx.query<Group>(groupsSql,[now,notice.video_id,notice.expiry_day_msk])).rows[0];
}
async function claim(pool:Pool,id:string,clock:()=>Date,from:string,origin:string) {
  return transaction(pool,async tx=>{
    const notice=(await tx.query<Notice>(`SELECT *,expiry_day_msk::text FROM retention_notice
      WHERE id=$1 AND state IN ('pending','failed','unknown') FOR UPDATE`,[id])).rows[0];
    if(!notice)return null;
    const now=clock();
    const group=await currentGroup(tx,notice,now);
    let reason:string|null=null;
    if(!group||offset(group.deadline,now)!==notice.offset_days)reason='deadline_changed';
    else if(group.account_id!==notice.account_id||!group.email_verified_at||
      (notice.first_attempt_at!==null&&notice.payload.to!==group.email))reason='recipient_changed';
    else if(notice.first_attempt_at!==null&&(group.deadline.getTime()!==notice.deadline.getTime()||group.clip_count!==notice.clip_count))reason='group_changed';
    if(reason){
      await tx.query("UPDATE retention_notice SET state='superseded',lease_until=NULL,last_error=$2,updated_at=$3 WHERE id=$1",[id,reason,now]);
      return null;
    }
    if(!group)return null;
    if(notice.attempts>=3||notice.first_attempt_at&&now.getTime()-notice.first_attempt_at.getTime()>=23*HOUR||
      notice.last_attempt_at&&now.getTime()-notice.last_attempt_at.getTime()<HOUR)return null;
    const content=notice.first_attempt_at?notice.payload:payload(group,from,origin);
    const attempt=(await tx.query<Notice>(`UPDATE retention_notice SET state='sending',
      payload=$2,payload_hash=$3,deadline=$4,clip_count=$5,
      first_attempt_at=COALESCE(first_attempt_at,$6),last_attempt_at=$6,
      lease_until=$6::timestamptz+interval '2 minutes',attempts=attempts+1,last_error=NULL,updated_at=$6
      WHERE id=$1 RETURNING *,expiry_day_msk::text`,
    [id,content,payloadHash(content),group.deadline,group.clip_count,now])).rows[0]!;
    return attempt;
  });
}

/** A journal/lease owns each logical message; networking never holds a SQL transaction. */
export async function retentionNoticesTick(pool:Pool,mailer:Pick<SupportMailer,'retentionSender'|'sendRetention'>,
  publicOrigin:string,time:Date|(()=>Date)=()=>new Date(),batch=100) {
  if(!Number.isInteger(batch)||batch<1||batch>1000)throw new Error('Invalid retention notice batch');
  const clock=typeof time==='function'?time:()=>time,now=clock();
  await pool.query(`UPDATE retention_notice SET state='unknown',lease_until=NULL,last_error='lease_expired',updated_at=$1
    WHERE state='sending' AND lease_until<=$1 AND id IN (SELECT id FROM retention_notice WHERE state='sending' AND lease_until<=$1
      ORDER BY lease_until,id LIMIT $2)`,[now,batch]);
  const sender=mailer.retentionSender;
  if(!sender){console.warn(JSON.stringify({event:'retention_mail_unavailable'}));return {generated:0,attempted:0};}
  const groups=(await pool.query<Group>(`SELECT g.* FROM (${groupsSql}) g
    LEFT JOIN retention_notice n ON n.video_id=g.video_id AND n.expiry_day_msk=g.expiry_day_msk::date
      AND n.offset_days=CASE WHEN g.deadline>$1::timestamptz+interval '24 hours' THEN 3 ELSE 1 END
    WHERE g.email_verified_at IS NOT NULL AND g.deadline<=$1::timestamptz+interval '72 hours'
      AND (n.id IS NULL OR (n.attempts=0 AND n.state='pending'))
    ORDER BY g.deadline,g.video_id LIMIT $4`,[now,null,null,batch])).rows;
  for(const group of groups){
    const at=offset(group.deadline,now);if(at===null)continue;
    const content=payload(group,sender,publicOrigin);
    const key='retention_'+digest(`${group.video_id}:${group.expiry_day_msk}:${at}`);
    await pool.query(`INSERT INTO retention_notice(account_id,video_id,expiry_day_msk,deadline,offset_days,clip_count,
      payload,payload_hash,provider_key,due_at,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10,$10)
      ON CONFLICT(video_id,expiry_day_msk,offset_days) DO NOTHING`,
    [group.account_id,group.video_id,group.expiry_day_msk,group.deadline,at,group.clip_count,content,payloadHash(content),key,now]);
  }
  const due=(await pool.query<{id:string}>(`SELECT id FROM retention_notice WHERE state IN ('pending','failed','unknown')
    AND due_at<=$1 AND attempts<3 AND (first_attempt_at IS NULL OR first_attempt_at>$1::timestamptz-interval '23 hours')
    AND (last_attempt_at IS NULL OR last_attempt_at<=$1::timestamptz-interval '1 hour') ORDER BY due_at,id LIMIT $2`,[now,batch])).rows;
  let attempted=0;
  for(const row of due){
    const notice=await claim(pool,row.id,clock,sender,publicOrigin);if(!notice)continue;
    attempted++;
    let result:Awaited<ReturnType<SupportMailer['sendRetention']>>;
    try {result=await mailer.sendRetention(notice.payload,notice.provider_key);}
    catch {result={state:'unknown',receipt:null};}
    await pool.query(`UPDATE retention_notice SET state=$2,provider_receipt=$3,lease_until=NULL,
      last_error=CASE WHEN $2='accepted' THEN NULL ELSE 'transport_'||$2 END,
      due_at=$4::timestamptz+interval '1 hour',updated_at=$4
      WHERE id=$1 AND state='sending' AND attempts=$5 AND last_attempt_at=$4`,
    [notice.id,result.state,result.receipt,notice.last_attempt_at,notice.attempts]);
  }
  return {generated:groups.length,attempted};
}
