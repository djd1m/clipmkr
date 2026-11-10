import { creditAccountLock, clipAliveSql, transaction, type Pool } from '@clipmaker/db';
export interface RetentionStorage { delete(key: string): Promise<void>; erasePrefix(prefix: string): Promise<void>; eraseClipPrefix(prefix: string): Promise<void> }
export const RETENTION_INTERVAL_MS = 3600_000;
// One hour lets already-issued part URLs and bounded in-flight storage writes settle.
export const ERASURE_QUIET_MS = 3600_000;
export async function eraseAccount(pool: Pool, storage: RetentionStorage, account: string, now: Date) {
  const videos = await pool.query<{ id: string }>('SELECT id FROM video WHERE account_id=$1', [account]);
  await storage.erasePrefix(`videos/${account}/`);
  for (const video of videos.rows) {
    for (const prefix of ['clips/free', 'clips/paid', 'thumbs']) await storage.erasePrefix(`${prefix}/${video.id}/`);
  }
  await transaction(pool, async tx => {
    const locked = await tx.query("SELECT id FROM account WHERE id=$1 AND status='erasing' FOR UPDATE", [account]);
    if (!locked.rowCount) return;
    await tx.query('SELECT id FROM video WHERE account_id=$1 ORDER BY id FOR UPDATE',[account]);
    await creditAccountLock(tx,account);
    await tx.query('DELETE FROM video_credit_charge WHERE video_id IN (SELECT id FROM video WHERE account_id=$1)',[account]);
    await tx.query('DELETE FROM credit_grant WHERE account_id=$1',[account]);
    // Preserve aggregates, remove identifying links AND network prefixes, including guest events.
    await tx.query(`UPDATE growth_event SET account_id=NULL,video_id=NULL,clip_id=NULL,clip_link_id=NULL,
      guest_pack_id=NULL,partner_code_id=NULL,ip_prefix=NULL WHERE account_id=$1
      OR video_id IN (SELECT id FROM video WHERE account_id=$1)
      OR clip_id IN (SELECT c.id FROM clip c JOIN video v ON v.id=c.video_id WHERE v.account_id=$1)
      OR clip_link_id IN (SELECT l.id FROM clip_link l JOIN clip c ON c.id=l.clip_id JOIN video v ON v.id=c.video_id WHERE v.account_id=$1)
      OR guest_pack_id IN (SELECT id FROM guest_pack WHERE account_id=$1)
      OR partner_code_id IN (SELECT pc.id FROM partner_code pc JOIN partner p ON p.id=pc.partner_id WHERE p.account_id=$1)`, [account]);
    await tx.query('DELETE FROM guest_pack_clip WHERE guest_pack_id IN (SELECT id FROM guest_pack WHERE account_id=$1)', [account]);
    await tx.query('DELETE FROM guest_pack WHERE account_id=$1', [account]);
    await tx.query('DELETE FROM job_attempt WHERE video_id IN (SELECT id FROM video WHERE account_id=$1)', [account]);
    await tx.query('DELETE FROM clip_link WHERE clip_id IN (SELECT c.id FROM clip c JOIN video v ON v.id=c.video_id WHERE v.account_id=$1)', [account]);
    await tx.query('DELETE FROM clip WHERE video_id IN (SELECT id FROM video WHERE account_id=$1)', [account]);
    await tx.query('DELETE FROM transcript WHERE video_id IN (SELECT id FROM video WHERE account_id=$1)', [account]);
    await tx.query('DELETE FROM video WHERE account_id=$1', [account]);
    for (const table of ['support_email_token', 'support_operator', 'session', 'pro_interest']) await tx.query(`DELETE FROM ${table} WHERE account_id=$1`, [account]);
    // Фича 30: деньги остаются в учёте (payment), но без связи с человеком; намерения — его данные, стираются.
    await tx.query('UPDATE payment SET account_id=NULL,intent_id=NULL WHERE account_id=$1', [account]);
    await tx.query('UPDATE operator_action SET account_id=NULL WHERE account_id=$1', [account]);
    await tx.query('DELETE FROM payment_intent WHERE account_id=$1', [account]);
    await tx.query(`UPDATE attribution SET status='partner_deleted',partner_code_id=NULL,reject_reason=NULL
      WHERE account_id<>$1 AND partner_code_id IN
      (SELECT pc.id FROM partner_code pc JOIN partner p ON p.id=pc.partner_id WHERE p.account_id=$1)`, [account]);
    await tx.query('DELETE FROM attribution WHERE account_id=$1', [account]);
    await tx.query('DELETE FROM partner_code WHERE partner_id IN (SELECT id FROM partner WHERE account_id=$1)', [account]);
    await tx.query('DELETE FROM partner WHERE account_id=$1', [account]);
    await tx.query("DELETE FROM quota_counter WHERE scope_key=$1 AND scope LIKE 'user_%'", [account]);
    await tx.query(`UPDATE account SET status='deleted',email_verified_at=NULL,email='deleted:'||id::text,password_hash='',telegram_user_id=NULL,updated_at=$2 WHERE id=$1`, [account, now]);
  });
}
export async function retentionTick(pool: Pool, storage: RetentionStorage, time:Date|(()=>Date) = () => new Date(), batch = 100) {
  const clock=typeof time==='function'?time:()=>time, now=clock();
  // Session-level lock spans S3, without an open SQL transaction. All web replicas share it.
  const lease = await pool.connect();
  try {
    if (!(await lease.query<{ locked: boolean }>('SELECT pg_try_advisory_lock(50921012) AS locked')).rows[0]?.locked) return;
    let backlog = false, errors = 0;
    const step = async (name: string, work: () => Promise<void>) => {
      try { await work(); }
      catch (error) { errors++; console.error(`Очистка: ${name}; повтор на следующем проходе`, error); }
    };
    // Observe before retries: a late successful erase must not hide a missed deadline.
    await step('наблюдение срока стирания', async () => {
      const overdue = Number((await pool.query<{ count: string }>(`SELECT count(*) FROM account
        WHERE status='erasing' AND erase_deadline < $1`, [now])).rows[0]!.count);
      if (overdue > 0) throw new Error(`erase_deadline_overdue: ${overdue}`);
    });
    await step('стирание аккаунтов', async () => {
      const accounts = await pool.query<{ id: string }>(`SELECT id FROM account WHERE status='erasing' AND deletion_requested_at <= $1
        ORDER BY updated_at,id LIMIT $2`, [new Date(now.getTime() - ERASURE_QUIET_MS), batch]);
      backlog ||= accounts.rows.length === batch;
      for (const account of accounts.rows) await step('стирание аккаунта', async () => {
        try { await eraseAccount(pool, storage, account.id, now); }
        catch (error) {
          // A failed fairness update must not stop other accounts or retention steps.
          await step('очередность повторного стирания', async () => {
            await pool.query('UPDATE account SET updated_at=$2 WHERE id=$1', [account.id, now]);
          });
          throw error;
        }
      });
    });
    // Expiry is enforced on reads; revoked_at records an explicit revocation only.
    await step('удаление отказанных загрузок', async () => {
      for (let page = 0; page < 100; page++) {
        const refused = await pool.query(`DELETE FROM video WHERE id IN (SELECT id FROM video
          WHERE status='failed' AND failure_reason='refused_user_uploads' AND created_at<=$1 ORDER BY created_at LIMIT $2)`,
        [new Date(now.getTime() - 24 * 3600_000), batch]);
        if ((refused.rowCount ?? 0) < batch) break;
        if (page === 99) backlog = true;
      }
    });
    // Витрина лендинга (ADR-018): клипы SHOWCASE_CLIPS срок бесплатного тарифа не стирает — их показывают
    // каждому посетителю. Стирание АККАУНТА (выше) их не щадит: право на удаление сильнее витрины.
    await step('очистка клипов', async () => {
      const clips = await pool.query<{ id: string; video_id: string; account_id: string }>(`SELECT c.id,c.video_id,v.account_id FROM clip c
        JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id
        WHERE a.status='active' AND v.deleted_at IS NULL AND (
          (c.deletion_started_at IS NOT NULL AND c.media_recheck_at<=$2) OR
          (c.status='done' AND c.deletion_started_at IS NULL AND c.ready_at IS NOT NULL
            AND (c.object_key IS NOT NULL OR c.thumbnail_key IS NOT NULL) AND NOT ${clipAliveSql('c','v','a','$2')}))
        ORDER BY COALESCE(c.media_recheck_at,c.ready_at),c.id LIMIT $1`, [batch,now]);
      backlog ||= clips.rows.length===batch;
      for (const clip of clips.rows) await step('удаление клипа', async () => {
        const claimed = await transaction(pool, async tx => {
          const owner = await tx.query("SELECT id FROM account WHERE id=$1 AND status='active' FOR NO KEY UPDATE", [clip.account_id]);
          if (!owner.rowCount) return false;
          const video = await tx.query('SELECT id FROM video WHERE id=$1 AND account_id=$2 AND deleted_at IS NULL FOR UPDATE', [clip.video_id,clip.account_id]);
          if (!video.rowCount) return false;
          await tx.query('SELECT id FROM clip WHERE id=$1 FOR UPDATE',[clip.id]);
          // Recompute after the common billing lock, including windows that started while waiting.
          const decision = clock();
          const row = (await tx.query<{deletion_started_at:Date|null;ready_at:Date|null;alive:boolean;media_recheck_at:Date|null}>(
            `SELECT c.deletion_started_at,c.ready_at,c.media_recheck_at,${clipAliveSql('c','v','a','$2')} AS alive
             FROM clip c JOIN video v ON v.id=c.video_id JOIN account a ON a.id=v.account_id WHERE c.id=$1`,[clip.id,decision])).rows[0];
          if (!row || (!row.deletion_started_at && (!row.ready_at || row.alive)) ||
            (row.deletion_started_at && row.media_recheck_at && row.media_recheck_at>decision)) return false;
          await tx.query(`UPDATE clip SET deletion_started_at=COALESCE(deletion_started_at,$2),media_recheck_at=$3 WHERE id=$1`,
            [clip.id,decision,new Date(decision.getTime()+RETENTION_INTERVAL_MS)]);
          await tx.query(`UPDATE job_attempt SET status='failed',failure_reason='stale_attempt_result',finished_at=$2
            WHERE clip_id=$1 AND rerender AND status IN ('running','deferred')`,[clip.id,decision]);
          return true;
        });
        if (!claimed) return;
        for (const prefix of ['clips/free','clips/paid','thumbs']) await storage.eraseClipPrefix(`${prefix}/${clip.video_id}/${clip.id}`);
        await pool.query(`UPDATE clip SET object_key=NULL,thumbnail_key=NULL,media_deleted_at=COALESCE(media_deleted_at,$2)
          WHERE id=$1 AND deletion_started_at IS NOT NULL`,[clip.id,clock()]);
      });
    });
    if (errors) throw new Error(`Очистка: не завершено операций ${errors}; повтор на следующем проходе`);
    return { backlog };

  } finally {
    try { await lease.query('SELECT pg_advisory_unlock(50921012)'); } finally { lease.release(); }
  }
}
