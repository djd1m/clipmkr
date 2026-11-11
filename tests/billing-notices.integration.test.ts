import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { mkdtemp, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createPool, readBillingNoticeEligibility, prepareBillingNoticeBatch, claimBillingNotice, completeBillingNotice,
  reconcilePaymentProvenance, type Pool, type BillingNoticeClaim } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import { billingNoticesTick } from '../apps/web/src/server/billing-notices';
import { eraseAccount } from '../apps/web/src/server/retention';
import { watchdogTick } from '../apps/web/src/server/watchdog';
import { SupportMailer } from '../apps/web/src/server/support/mail';

const url = process.env.DATABASE_URL, DAY = 86_400_000, HOUR = 3_600_000;
const now = new Date('2026-11-11T12:00:00Z'), at = (delta: number) => new Date(now.getTime() + delta);
const origin = 'https://test.invalid', schema = 'billing_notice_' + randomBytes(8).toString('hex');
type Mailer = Pick<SupportMailer, 'retentionSender' | 'sendRetention'>;
describe.skipIf(!url)('manual billing notices: real PostgreSQL and HTTP', () => {
  let pool: Pool, basePool: Pool;
  const externalFetch: string[] = [], nativeFetch = globalThis.fetch.bind(globalThis);
  let fetchFence: { mockRestore: () => void };

  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw Error('owned *_test database required');
    fetchFence = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const destination = new URL(input instanceof Request ? input.url : String(input));
      if (destination.protocol !== 'http:' || destination.hostname !== '127.0.0.1') {
        externalFetch.push(destination.hostname); throw Error('External fetch forbidden by independent test fence');
      }
      return nativeFetch(input, init);
    });
    await ensureTestDatabase(url); basePool = createPool(url, schema); pool = basePool;
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool); await migrate(pool);
  });
  beforeEach(async () => { await basePool.query('TRUNCATE account CASCADE'); pool = freshPool(); });
  afterAll(async () => { if (basePool) { await basePool.query(`DROP SCHEMA ${schema} CASCADE`); await basePool.end(); } fetchFence?.mockRestore(); expect(externalFetch).toEqual([]); });
  async function account() {
    return (await pool.query<{ id: string; email: string }>(`INSERT INTO account(email,password_hash,billing_policy,email_verified_at)
      VALUES($1,'synthetic','credits_v1',$2) RETURNING id,email`, [randomUUID() + '@example.test', now])).rows[0]!;
  }
  async function grant(id: string, start = -DAY, end = 2 * DAY, environment: 'live' | 'test' | 'unknown' = 'live', spent = false) {
    const paymentId = randomUUID(), provider = environment === 'unknown' ? null : 'yookassa', merchant = environment === 'unknown' ? null : '123456';
    const intent = (await pool.query<{ id: string }>(`INSERT INTO payment_intent(account_id,price_minor,idempotency_key,status,sku,offer_version,
      grant_seconds,fulfilled_at,period_start,period_end,provider_payment_id,payment_provider,payment_environment,payment_merchant_id)
      VALUES($1,99000,$2,'succeeded','start_v1','credits_v1_d00',18000,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [id, randomUUID(), now, at(start), at(end), paymentId, provider, environment, merchant])).rows[0]!.id;
    const payment = (await pool.query<{ id: string }>(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id)
      VALUES($1,$2,'yookassa',$3,99000,$4,$5,$6) RETURNING id`, [intent, id, paymentId, now, environment, merchant])).rows[0]!.id;
    const row = (await pool.query<{ id: string }>(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,
      available_at,expires_at,entitlement_start,entitlement_end,payment_ref,base_sku)
      VALUES($1,'payment',$2,18000,$3,$4,$5,$4,$5,$6,'start_v1') RETURNING id`, [id, randomUUID(), spent ? 0 : 18000, at(start), at(end), intent])).rows[0]!.id;
    return { intent, payment, paymentId, grant: row };
  }
  const fake = (state: 'accepted' | 'failed' | 'unknown' = 'accepted') => ({ retentionSender: 'Sender <sender@example.test>',
    sendRetention: vi.fn<Mailer['sendRetention']>().mockResolvedValue({ state, receipt: state === 'accepted' ? 'synthetic' : null }) });
  const tick = (mail: Mailer, time = now, extra: { monotonic?: () => number; enabled?: boolean; checkoutAllowed?: () => boolean } = {}) =>
    billingNoticesTick(pool, mail, origin, { enabled: true, checkoutAllowed: () => true, clock: () => time, ...extra });
  const rows = async () => (await pool.query('SELECT * FROM billing_notice ORDER BY created_at,id')).rows;
  const prepare = (time = now) => prepareBillingNoticeBatch(pool, { clock: () => time, admit: () => true });
  const claim = (id: string, time = now) => claimBillingNotice(pool, id, { clock: () => time, admit: () => true, checkoutAllowed: () => true,
    content: facts => ({ from: 'sender@example.test', to: facts.email, subject: 'Synthetic', text: 'Synthetic', html: '<p>Synthetic</p>' }) });
  async function socket(wait = 0, lostResponse = false, rejected = false) {
    const captured: { key: string; bytes: string }[] = []; let active = 0, peak = 0;
    const server = createServer(async (req, res) => {
      active++; peak = Math.max(peak, active); const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      captured.push({ key: String(req.headers['idempotency-key']), bytes: Buffer.concat(chunks).toString() });
      await delay(wait); active--; if (lostResponse) { res.destroy(); return; } if (rejected) res.statusCode = 503; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ id: randomUUID() }));
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address(); if (!address || typeof address === 'string') throw Error('socket address');
    const mail = new SupportMailer({ mode: 'resend', from: 'sender@example.test', apiKey: 'synthetic' }, undefined, undefined,
      (_url, init) => fetch(`http://127.0.0.1:${address.port}/emails`, init));
    return { mail, captured, peak: () => peak, close: () => new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())) };
  }
  function freshPool() {
    return new Proxy(basePool, { get(target, key) { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
  }
  async function blockedBy(pid: number, fragment: string) {
    for (let i = 0; i < 18; i++) {
      const waiting = await pool.query('SELECT query FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid)) AND query LIKE $2', [pid, '%' + fragment + '%']);
      if (waiting.rowCount) return;
      await delay(3);
    }
    expect(false, 'held PostgreSQL lock was not reached: ' + fragment).toBe(true);
  }
  it('billing_031_constraints_cascade_and_upgrade_preserve_rights', async () => {
    const a = await account(); await grant(a.id); const before = (await pool.query('SELECT * FROM credit_grant')).rows;
    await prepare(); const [n] = await rows();
    for (const sql of ["state='bad'", 'offset_days=2', 'attempts=4', "state='sending'", 'lease_until=now()', 'attempts=1'])
      await expect(pool.query(`UPDATE billing_notice SET ${sql} WHERE id=$1`, [n.id])).rejects.toMatchObject({ code: '23514' });
    await expect(pool.query(`INSERT INTO billing_notice(account_id,authoritative_paid_end,offset_days,provider_key,due_at)
      VALUES($1,$2,3,$3,$4)`, [a.id, n.authoritative_paid_end, randomUUID(), now])).rejects.toMatchObject({ code: '23505' });
    await migrate(pool); expect((await pool.query('SELECT * FROM credit_grant')).rows).toEqual(before);
    const directory = await mkdtemp(path.join(tmpdir(), 'billing-migrations-')), upgradeSchema = schema + '_upgrade', upgrade = createPool(url!, upgradeSchema);
    try {
      await upgrade.query(`CREATE SCHEMA ${upgradeSchema}`);
      const names = (await readdir('packages/db/migrations')).filter(n => /^\d+_.*\.sql$/.test(n) && !n.startsWith('031_'));
      const hashes = new Map<string, string>();
      for (const name of names) { const bytes = await readFile('packages/db/migrations/' + name); await writeFile(path.join(directory, name), bytes); hashes.set(name, createHash('sha256').update(bytes).digest('hex')); }
      await migrate(upgrade, directory); expect((await upgrade.query("SELECT to_regclass('billing_notice') AS table")).rows[0].table).toBeNull();
      await upgrade.query("INSERT INTO account(email,password_hash) VALUES('upgrade@example.test','synthetic')");
      await migrate(upgrade); await migrate(upgrade);
      expect((await upgrade.query('SELECT count(*)::int AS n FROM account')).rows[0].n).toBe(1);
      for (const { name, sha256 } of (await upgrade.query<{ name: string; sha256: string }>('SELECT name,sha256 FROM _schema_migration')).rows)
        if (!name.startsWith('031_')) expect(sha256).toBe(hashes.get(name));
    } finally { await upgrade.query(`DROP SCHEMA ${upgradeSchema} CASCADE`); await upgrade.end(); await rm(directory, { recursive: true, force: true }); }
    const physical = await account(); await grant(physical.id); await tick(fake());
    expect((await rows()).some(row => row.account_id === physical.id)).toBe(true);
    await pool.query('DELETE FROM account WHERE id=$1', [physical.id]);
    expect((await rows()).some(row => row.account_id === physical.id)).toBe(false);
    await tick(fake()); const [frozen] = await rows(); expect(frozen.payload.to).toBe(a.email);
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN'); await tx.query("UPDATE account SET status='deleted' WHERE id=$1", [a.id]);
      expect((await tx.query('SELECT id FROM billing_notice WHERE account_id=$1', [a.id])).rowCount).toBe(0);
      await tx.query('ROLLBACK'); expect((await rows())[0].id).toBe(frozen.id);
    } finally { tx.release(); }
    await pool.query("UPDATE account SET status='erasing',deletion_requested_at=$2,erase_deadline=$3 WHERE id=$1", [a.id, now, at(DAY)]);
    await eraseAccount(pool, { delete: async () => {}, erasePrefix: async () => {}, eraseClipPrefix: async () => {} }, a.id, now);
    expect((await pool.query('SELECT status FROM account WHERE id=$1', [a.id])).rows[0].status).toBe('deleted');
    expect(await rows()).toHaveLength(0);
  });
  it('billing_continuous_end_keeps_test_unknown_and_zero_balance', async () => {
    const a = await account(); await grant(a.id, -DAY, HOUR, 'test', true); await grant(a.id, HOUR, DAY, 'unknown', true);
    const live = await grant(a.id, DAY, 2 * DAY, 'live', true); await grant(a.id, 3 * DAY, 30 * DAY);
    // Add-on interval has no base_sku; it must still extend the component.
    await pool.query('UPDATE credit_grant SET base_sku=NULL WHERE id=$1', [live.grant]);
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,entitlement_start,entitlement_end)
      VALUES($1,'signup',$2,60,60,$3,$4)`, [a.id, randomUUID(), at(-DAY), at(90 * DAY)]);
    const before = (await pool.query('SELECT * FROM credit_grant ORDER BY id')).rows;
    const facts = await readBillingNoticeEligibility(pool, a.id, now); expect(facts).toMatchObject({ paidEnd: at(2 * DAY), liveQualified: true });
    const mail = fake(); await tick(mail); expect(mail.sendRetention).toHaveBeenCalledOnce();
    expect((await pool.query('SELECT * FROM credit_grant ORDER BY id')).rows).toEqual(before);
    expect((await readBillingNoticeEligibility(pool, a.id, at(2 * DAY)))?.paidEnd).toBeNull();
    expect((await readBillingNoticeEligibility(pool, a.id, at(3 * DAY)))?.paidEnd).toEqual(at(30 * DAY));
  });
  it('billing_component_requires_verified_live_not_runtime_mode', async () => {
    for (const environment of ['test', 'unknown', 'live'] as const) { const a = await account(); await grant(a.id, -DAY, 2 * DAY, environment); }
    const mail = fake(); await tick(mail); expect(mail.sendRetention).toHaveBeenCalledOnce();
    // Each identity linkage field is necessary, with a repaired positive control.
    const n = (await rows()).find(n => n.state === 'accepted')!, a = n.account_id as string;
    const payment = (await pool.query('SELECT * FROM payment WHERE account_id=$1', [a])).rows[0];
    const intent = (await pool.query('SELECT * FROM payment_intent WHERE account_id=$1', [a])).rows[0];
    const foreign = await account();
    for (const [sql, value, restore] of [['amount_minor=$2', 1, payment.amount_minor], ['account_id=$2', foreign.id, a], ['intent_id=$2', null, intent.id]] as const) {
      await pool.query(`UPDATE payment SET ${sql} WHERE id=$1`, [payment.id, value]);
      expect((await readBillingNoticeEligibility(pool, a, now))?.liveQualified).toBe(false);
      await pool.query(`UPDATE payment SET ${sql} WHERE id=$1`, [payment.id, restore]);
      expect((await readBillingNoticeEligibility(pool, a, now))?.liveQualified).toBe(true);
    }
    for (const [sql, value, restore] of [['provider_payment_id=$2', 'other', intent.provider_payment_id], ['status=$2', 'canceled', 'succeeded'], ['fulfilled_at=$2', null, now]] as const) {
      await pool.query(`UPDATE payment_intent SET ${sql} WHERE id=$1`, [intent.id, value]);
      expect((await readBillingNoticeEligibility(pool, a, now))?.liveQualified).toBe(false);
      await pool.query(`UPDATE payment_intent SET ${sql} WHERE id=$1`, [intent.id, restore]);
      expect((await readBillingNoticeEligibility(pool, a, now))?.liveQualified).toBe(true);
    }
    for (const change of ["owner_unlimited=true", "billing_policy='legacy_daily_v1'", "plan='paid',plan_source='operator'", 'email_verified_at=NULL', "status='erasing'"]) {
      await pool.query(`UPDATE account SET ${change} WHERE id=$1`, [a]); expect((await readBillingNoticeEligibility(pool, a, now))?.recipientAllowed).toBe(false);
      await pool.query("UPDATE account SET owner_unlimited=false,billing_policy='credits_v1',plan='free',plan_source='none',email_verified_at=$2,status='active' WHERE id=$1", [a, now]);
    }
  });
  it('billing_legacy_without_exact_link_suppresses_send', async () => {
    const a = await account(); await grant(a.id, -DAY, DAY);
    await pool.query("UPDATE account SET plan='paid',plan_source='payment',plan_paid_until=$2 WHERE id=$1", [a.id, at(2 * DAY)]);
    expect((await readBillingNoticeEligibility(pool, a.id, now))?.paidEnd).toEqual(at(2 * DAY));
    const mail = fake(); await tick(mail); expect(mail.sendRetention).not.toHaveBeenCalled();
    const id = randomUUID();
    await pool.query(`INSERT INTO payment_intent(id,account_id,price_minor,idempotency_key,status,fulfilled_at,period_start,period_end,provider_payment_id,payment_provider,payment_environment,payment_merchant_id)
      VALUES($1,$2,99000,$3,'succeeded',$4,$5,$6,$3,'yookassa','live','123456')`, [id, a.id, randomUUID(), now, at(-DAY), at(2 * DAY)]);
    await pool.query(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at,payment_environment,payment_merchant_id)
      SELECT id,account_id,'yookassa',provider_payment_id,price_minor,$2,'live','123456' FROM payment_intent WHERE id=$1`, [id, now]);
    await tick(mail); expect(mail.sendRetention).toHaveBeenCalledOnce();
  });
  it('billing_refund_scope_ignores_expired_unrelated_history', async () => {
    const a = await account(), old = await grant(a.id, -10 * DAY, -9 * DAY); await grant(a.id);
    await pool.query("UPDATE payment SET status='refunded',needs_review=true,review_reason='refund' WHERE id=$1", [old.payment]);
    const mail = fake(); await tick(mail); expect(mail.sendRetention).toHaveBeenCalledOnce();
  });
  it('billing_offsets_and_unique_identity_match_72h_24h_boundaries', async () => {
    const expected = [3, 1, 1, null, null, null];
    for (const [i, end] of [3 * DAY, DAY, 20 * HOUR, 3 * DAY + 1, 0, -1].entries()) {
      const a = await account(); await grant(a.id, -DAY, end); const mail = fake(); await tick(mail);
      expect((await rows()).filter(n => n.account_id === a.id).map(n => n.offset_days)).toEqual(expected[i] ? [expected[i]] : []);
    }
    const before = (await rows()).length; await tick(fake()); expect(await rows()).toHaveLength(before);
  });
  it('billing_temporary_review_resumes_same_event_before_first_and_after_unknown', async () => {
    for (const stage of ['before', 'unknown'] as const) for (const reason of ['review', 'proof'] as const) {
      await pool.query('TRUNCATE account CASCADE'); const a = await account(), g = await grant(a.id), s = await socket(0, true);
      const mail = { retentionSender: s.mail.retentionSender, sendRetention: vi.fn<Mailer['sendRetention']>((...args) => s.mail.sendRetention(...args)) };
      try {
      if (stage === 'unknown') await tick(mail); else await prepare();
      const [initial] = await rows(), time = stage === 'unknown' ? at(HOUR) : now;
      if (reason === 'review') await pool.query("UPDATE payment SET needs_review=true,review_reason='refund' WHERE id=$1", [g.payment]);
      else await pool.query('UPDATE payment_intent SET provider_payment_id=NULL WHERE id=$1', [g.intent]);
      const calls = mail.sendRetention.mock.calls.length; await tick(mail, time);
      expect(mail.sendRetention).toHaveBeenCalledTimes(calls); expect(s.captured).toHaveLength(calls); expect((await rows())[0]).toEqual(initial);
      if (reason === 'review') await pool.query('UPDATE payment SET needs_review=false,review_reason=NULL WHERE id=$1', [g.payment]);
      else await reconcilePaymentProvenance(pool, { provider: 'yookassa', mode: 'bind', apply: true,
        payment: { id: g.paymentId, orderId: g.intent, amountMinor: 99000, identity: { provider: 'yookassa', environment: 'live', merchantId: '123456' } } });
      await tick(mail, time); const [resumed] = await rows();
      expect(mail.sendRetention).toHaveBeenCalledTimes(calls + 1); expect(resumed.id).toBe(initial.id); expect(resumed.provider_key).toBe(initial.provider_key);
      expect(resumed.attempts).toBe(initial.attempts + 1);
      expect(s.captured).toHaveLength(calls + 1);
      if (stage === 'unknown') { expect(resumed.payload).toEqual(initial.payload); expect(resumed.payload_hash).toBe(initial.payload_hash); expect(resumed.first_attempt_at).toEqual(initial.first_attempt_at); expect(s.captured[1]).toEqual(s.captured[0]); }
      } finally { await s.close(); }
    }
  });
  it('billing_retry_preserves_bytes_key_budget_and_clock_fence', async () => {
    const a = await account(); await grant(a.id); const mail = fake('unknown'); await tick(mail); const [initial] = await rows();
    for (const delta of [-1, HOUR - 1]) { expect(await claim(initial.id, at(delta))).toBeNull(); await tick(mail, at(delta)); } expect(mail.sendRetention).toHaveBeenCalledTimes(1);
    mail.retentionSender = 'Changed sender <new@example.test>';
    await tick(mail, at(HOUR)); await tick(mail, at(2 * HOUR)); await tick(mail, at(3 * HOUR));
    expect(mail.sendRetention).toHaveBeenCalledTimes(3); expect(new Set(mail.sendRetention.mock.calls.map(v => JSON.stringify(v))).size).toBe(1);
    expect((await rows())[0]).toMatchObject({ state: 'superseded', attempts: 3, first_attempt_at: initial.first_attempt_at });
    const b = await account(); await grant(b.id); const unknown = fake('unknown'); await tick(unknown);
    await tick(unknown, at(23 * HOUR)); expect(unknown.sendRetention).toHaveBeenCalledOnce();
    expect((await rows()).find(n => n.account_id === b.id).state).toBe('superseded');
  });
  it('billing_pre_attempt_email_refresh_and_two_replicas_share_one_claim', async () => {
    const a = await account(); await grant(a.id); await prepare(); const [initial] = await rows();
    await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, 'fresh-recipient@example.test']);
    const s = await socket(100), first = freshPool(), second = freshPool();
    try {
      const options = { enabled: true, checkoutAllowed: () => true, clock: () => now };
      await Promise.all([billingNoticesTick(first, s.mail, origin, options), billingNoticesTick(second, s.mail, origin, options)]);
      expect(s.captured).toHaveLength(1); expect(JSON.parse(s.captured[0]!.bytes).to).toEqual(['fresh-recipient@example.test']);
      const [accepted] = await rows(); expect(accepted).toMatchObject({ id: initial.id, provider_key: initial.provider_key, state: 'accepted', attempts: 1 });
    } finally { await s.close(); }
  });
  it('billing_unknown_http_retry_keeps_wire_bytes_and_key', async () => {
    const a = await account(); await grant(a.id); const s = await socket(0, true);
    try {
      await tick(s.mail); const [initial] = await rows(); expect(initial.state).toBe('unknown');
      await tick(s.mail, at(HOUR)); expect(s.captured).toHaveLength(2);
      expect(s.captured[1]).toEqual(s.captured[0]); expect((await rows())[0].first_attempt_at).toEqual(initial.first_attempt_at);
    } finally { await s.close(); }
  });
  it('billing_terminal_events_do_not_resume', async () => {
    for (const kind of ['expired', 'email', 'unverified', 'exhausted', 'accepted', 'changed'] as const) {
      await pool.query('TRUNCATE account CASCADE'); const a = await account(), g = await grant(a.id, -DAY, DAY / 2), mail = fake(kind === 'accepted' ? 'accepted' : 'unknown');
      await tick(mail); const [initial] = await rows();
      await pool.query("UPDATE payment SET needs_review=true,review_reason='refund' WHERE id=$1", [g.payment]);
      if (kind === 'email') await pool.query('UPDATE account SET email=$2 WHERE id=$1', [a.id, 'changed@example.test']);
      if (kind === 'unverified') await pool.query('UPDATE account SET email_verified_at=NULL WHERE id=$1', [a.id]);
      if (kind === 'exhausted') await pool.query('UPDATE billing_notice SET attempts=3 WHERE id=$1', [initial.id]);
      if (kind === 'changed') await pool.query('UPDATE credit_grant SET entitlement_end=$2 WHERE id=$1', [g.grant, at(10 * DAY)]);
      const time = kind === 'expired' ? at(DAY / 2) : at(HOUR);
      await tick(mail, time); await pool.query('UPDATE payment SET needs_review=false,review_reason=NULL WHERE id=$1', [g.payment]); await tick(mail, time);
      expect(mail.sendRetention).toHaveBeenCalledOnce(); expect(await rows()).toHaveLength(1);
      expect((await rows())[0].state).toBe(kind === 'accepted' ? 'accepted' : 'superseded');
    }
  });
  it('billing_claim_revalidates_purchase_refund_email_erasure_with_held_locks', async () => {
    for (const operation of ['purchase', 'refund', 'email', 'erasure', 'clock', 'budget', 'busy'] as const) {
      await pool.query('TRUNCATE account CASCADE'); const a = await account(), g = await grant(a.id); await prepare(); const [n] = await rows();
      const holder = await pool.connect(); let running: Promise<BillingNoticeClaim | null> | undefined; let time = now, admitted = true;
      try {
        await holder.query('BEGIN'); const pid = (await holder.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
        await holder.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [a.id]);
        running = claimBillingNotice(pool, n.id, { clock: () => time, admit: () => admitted, checkoutAllowed: () => true,
          content: facts => ({ from: 'sender@example.test', to: facts.email, subject: 'Synthetic', text: 'Synthetic', html: 'Synthetic' }) });
        await blockedBy(pid, 'FROM account');
        if (operation === 'purchase') await holder.query('UPDATE credit_grant SET entitlement_end=$2 WHERE id=$1', [g.grant, at(10 * DAY)]);
        if (operation === 'refund') await holder.query("UPDATE payment SET needs_review=true,review_reason='refund' WHERE id=$1", [g.payment]);
        if (operation === 'email') await holder.query('UPDATE account SET email_verified_at=NULL WHERE id=$1', [a.id]);
        if (operation === 'erasure') await holder.query('DELETE FROM account WHERE id=$1', [a.id]);
        if (operation === 'clock') time = at(2 * DAY);
        if (operation === 'budget') admitted = false;
        if (operation === 'busy') { await delay(130); expect(await running).toBeNull(); }
        await holder.query('COMMIT'); expect(await running).toBeNull();
        if (['refund', 'budget', 'busy'].includes(operation)) { expect((await rows())[0].attempts).toBe(0); if (operation === 'refund') await pool.query('UPDATE payment SET needs_review=false,review_reason=NULL WHERE id=$1', [g.payment]); expect(await claim(n.id)).not.toBeNull(); }
      } finally { await holder.query('ROLLBACK'); holder.release(); await running?.catch(() => {}); }
    }
  });
  it('billing_completion_and_reaper_preserve_concurrent_owner', async () => {
    const a = await account(); await grant(a.id); await prepare(); const [n] = await rows(), first = (await claim(n.id))!;
    expect(await completeBillingNotice(pool, { ...first, attempts: 2 }, { state: 'accepted', receipt: 'stale' })).toBe(0);
    expect(await completeBillingNotice(pool, { ...first, last_attempt_at: at(-1) }, { state: 'accepted', receipt: 'stale' })).toBe(0);
    await prepare(at(120000)); const second = (await claim(n.id, at(HOUR)))!;
    expect(second.attempts).toBe(2); expect(await completeBillingNotice(pool, first, { state: 'accepted', receipt: 'stale' })).toBe(0);
    const holder = await pool.connect(); let reaper: ReturnType<typeof prepare> | undefined;
    try {
      await holder.query('BEGIN'); const pid = (await holder.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
      await holder.query("UPDATE billing_notice SET state='accepted',lease_until=NULL,provider_receipt='winner' WHERE id=$1", [n.id]);
      reaper = prepare(at(2 * HOUR)); await blockedBy(pid, 'UPDATE billing_notice'); await holder.query('COMMIT'); await reaper;
      expect((await rows())[0]).toMatchObject({ state: 'accepted', provider_receipt: 'winner', attempts: 2 });
    } finally { await holder.query('ROLLBACK'); holder.release(); await reaper?.catch(() => {}); }
    expect(await completeBillingNotice(pool, second, { state: 'unknown', receipt: null })).toBe(0);
  });
  it('billing_copy_distinguishes_continuous_period_and_package_expiry', async () => {
    const a = await account(); await grant(a.id, -DAY, DAY); await grant(a.id, DAY, 2 * DAY, 'test'); const s = await socket();
    try {
      await tick(s.mail); expect(s.captured).toHaveLength(1); const letter = JSON.parse(s.captured[0]!.bytes);
      expect(letter.text).toContain('Текущий непрерывный период доступа по пакетам закончится');
      expect(letter.text).toContain('13 ноября 2026'); expect(letter.text).toContain('15:00 МСК');
      expect(letter.text).toContain('Остатки каждого пакета действуют до его срока; бессрочные кредиты сохраняются');
      expect(letter.text).not.toContain('Пакеты действуют до'); expect(letter.html).toContain('href="https://test.invalid/upgrade"');
      expect(letter.html).toContain('Купить следующий пакет'); expect((await rows())[0].payload_hash).toBe(createHash('sha256').update(s.captured[0]!.bytes).digest('hex'));
    } finally { await s.close(); }
  });
  it('billing_dispatch_bounds_two_four_twenty_seconds_and_progress', async () => {
    for (let i = 0; i < 7; i++) { const a = await account(); await grant(a.id); } await prepare(); const candidates = (await rows()).sort((a, b) => a.id.localeCompare(b.id));
    const holder = await pool.connect(), s = await socket(7800), isolated = freshPool();
    const dispatch = () => billingNoticesTick(isolated, s.mail, origin, { enabled: true, checkoutAllowed: () => true, clock: () => now });
    try {
      await holder.query('BEGIN'); await holder.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [candidates[0].account_id]);
      const result = await dispatch(); expect(result.attempted).toBe(4); expect(s.peak()).toBe(2); expect(s.captured).toHaveLength(4);
      await holder.query('COMMIT'); await dispatch(); expect(s.captured.length).toBeGreaterThan(4);
      await dispatch(); expect(s.captured).toHaveLength(7);
      expect(new Set(s.captured.map(letter => letter.key)).size).toBe(7);
      expect((await rows()).map(row => row.id).sort()).toEqual(candidates.map(row => row.id).sort());
      expect((await rows()).every(row => row.state === 'accepted' && row.attempts === 1)).toBe(true);
    } finally { await holder.query('ROLLBACK'); holder.release(); await s.close(); }
    await pool.query('TRUNCATE account CASCADE'); for (let i = 0; i < 5; i++) { const a = await account(); await grant(a.id); }
    const fast = await socket(100); let elapsed = 0;
    const measured: Mailer = { retentionSender: fast.mail.retentionSender, sendRetention: async (...args) => { const result = await fast.mail.sendRetention(...args); elapsed = 20_000; return result; } };
    try { const result = await billingNoticesTick(freshPool(), measured, origin, { enabled: true, checkoutAllowed: () => true, clock: () => now, monotonic: () => elapsed }); expect(result.attempted).toBe(2); expect(fast.captured).toHaveLength(2); } finally { await fast.close(); }
  }, 45000);
  it('billing_tick_runs_after_media_and_isolates_mail_failure', async () => {
    const a = await account(); await grant(a.id); const mail = fake(); let mediaDone = false;
    mail.sendRetention.mockImplementation(async () => { expect(mediaDone).toBe(true); throw Error('synthetic transport failure'); });
    const storage = { delete: async () => {}, erasePrefix: async () => {}, eraseClipPrefix: async () => {} };
    const observer = new Proxy(pool, { get(target, key) {
      if (key !== 'query') { const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; }
      return async (...args: unknown[]) => { const result = await Reflect.apply(target.query, target, args); if (String(args[0]).includes('clip') && String(args[0]).includes('deletion_started_at')) mediaDone = true; return result; };
    } });
    expect(await watchdogTick(observer, async () => {}, now, 100, storage, { mailer: mail, publicOrigin: origin, billingEnabled: true, checkoutAllowed: () => true })).toEqual({ failed: 0, published: 0 });
    expect(mail.sendRetention).toHaveBeenCalledOnce(); expect((await rows())[0].state).toBe('unknown');
    const broken = new Proxy(pool, { get(target, key) { if (key === 'connect') return async () => { throw Error('synthetic db outage'); }; const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value; } });
    const result = await billingNoticesTick(broken, fake(), origin, { enabled: true, checkoutAllowed: () => true }); expect(result.unavailable).toBe(true); expect(result.attempted).toBe(0);
  });
  it('billing_checkout_pause_preserves_same_event_and_retry_budget', async () => {
    for (const state of ['pending', 'failed', 'unknown'] as const) {
      await pool.query('TRUNCATE account CASCADE'); const a = await account(); await grant(a.id);
      const s = await socket(0, state !== 'failed', state === 'failed');
      try {
        await tick(s.mail, now, { enabled: false }); await tick({ ...s.mail, retentionSender: null, sendRetention: (...args) => s.mail.sendRetention(...args) });
        expect(await rows()).toHaveLength(0); expect(s.captured).toHaveLength(0);
        if (state === 'pending') await prepare(); else await tick(s.mail);
        const [initial] = await rows(), calls = s.captured.length, time = state === 'pending' ? now : at(HOUR);
        expect(initial.state).toBe(state); await tick(s.mail, time, { checkoutAllowed: () => false });
        expect(s.captured).toHaveLength(calls); expect((await rows())[0]).toEqual(initial);
        await tick(s.mail, time); const [resumed] = await rows();
        expect(s.captured).toHaveLength(calls + 1); expect(resumed).toMatchObject({ id: initial.id, provider_key: initial.provider_key, attempts: initial.attempts + 1 });
        if (state !== 'pending') { expect(resumed.first_attempt_at).toEqual(initial.first_attempt_at); expect(resumed.payload_hash).toBe(initial.payload_hash); expect(s.captured[1]).toEqual(s.captured[0]); }
        const later = new Date(time.getTime() + HOUR); await tick(s.mail, later, { checkoutAllowed: () => false });
        expect((await rows())[0]).toEqual(resumed); expect(s.captured).toHaveLength(calls + 1);
        await tick(s.mail, later); expect((await rows())[0].attempts).toBe(initial.attempts + 2);
        expect((await pool.query('SELECT count(*)::int AS n FROM payment_intent')).rows[0].n).toBe(1);
      } finally { await s.close(); }
    }
  });
  it.each(['disabled', 'missing_sender', 'unknown', 'failed', 'exhausted', 'outage', 'deferred'] as const)(
    'billing_observability_warns_finite_reasons_without_private_values: %s', async kind => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => {}), warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const privateValues = ['PRIVATE_OBSERVABILITY_ERROR']; let transport: Awaited<ReturnType<typeof socket>> | undefined;
      try {
        let mail: Mailer = fake(), selected = freshPool(), time = now;
        if (['unknown', 'failed', 'exhausted', 'deferred'].includes(kind)) {
          const a = await account(), g = await grant(a.id); privateValues.push(a.id, a.email, g.intent, g.paymentId);
          if (kind === 'deferred') await pool.query("UPDATE payment SET needs_review=true,review_reason='refund' WHERE id=$1", [g.payment]);
          else { transport = await socket(0, kind !== 'failed', kind === 'failed'); mail = transport.mail; }
          if (kind === 'exhausted') {
            await billingNoticesTick(selected, mail, origin, { enabled: true, checkoutAllowed: () => true, clock: () => now });
            const [before] = await rows(); privateValues.push(before.provider_key);
            await pool.query('UPDATE billing_notice SET attempts=3 WHERE id=$1', [before.id]); time = at(HOUR);
            info.mockClear(); warn.mockClear();
          }
        }
        if (kind === 'outage') selected = new Proxy(pool, { get(target, key) {
          if (key === 'connect') return async () => { throw Error('PRIVATE_OBSERVABILITY_ERROR'); };
          const value = Reflect.get(target, key); return typeof value === 'function' ? value.bind(target) : value;
        } });
        if (kind === 'missing_sender' || kind === 'disabled') mail = { retentionSender: null, sendRetention: fake().sendRetention };
        const result = await billingNoticesTick(selected, mail, origin, { enabled: kind !== 'disabled', checkoutAllowed: () => true, clock: () => time });
        if (kind === 'disabled') { expect(info).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled(); return; }
        expect(result).toMatchObject({ accepted: 0, unknown: kind === 'unknown' ? 1 : 0, failed: kind === 'failed' ? 1 : 0,
          exhausted: kind === 'exhausted' ? 1 : 0, deferred: kind === 'deferred' ? 1 : 0, unavailable: ['missing_sender', 'outage'].includes(kind) });
        expect(info).toHaveBeenCalledOnce(); const aggregate = JSON.parse(String(info.mock.calls[0]![0]));
        expect(aggregate).toMatchObject({ event: 'billing_notices', ...result }); expect(Number.isSafeInteger(aggregate.backlog)).toBe(true);
        const reasons = { missing_sender: 'sender_unavailable', unknown: 'transport_unknown', failed: 'transport_failed', exhausted: 'retry_exhausted', outage: 'processing_unavailable' };
        const expectedReason = kind === 'deferred' ? null : reasons[kind];
        const warnings = warn.mock.calls.map(call => JSON.parse(String(call[0])));
        expect(warnings).toEqual(expectedReason ? [{ event: 'billing_notices_warning', reason: expectedReason, count: 1 }] : []);
        if (kind === 'exhausted') { expect((await rows())[0]).toMatchObject({ state: 'superseded', attempts: 3, last_error: 'retry_exhausted' }); expect(transport!.captured).toHaveLength(1); }
        for (const row of await rows()) privateValues.push(row.provider_key, row.id);
        const logs = JSON.stringify([...info.mock.calls, ...warn.mock.calls]); for (const value of privateValues) expect(logs).not.toContain(value);
      } finally { info.mockRestore(); warn.mockRestore(); await transport?.close(); }
    });

});
