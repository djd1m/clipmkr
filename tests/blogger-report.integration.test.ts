import { beforeAll, beforeEach, afterAll, describe, it, expect } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { bloggerReport } from '../packages/db/src/blogger-report';
import { ensureTestDatabase } from '../scripts/test-db.mjs';

const url = process.env.DATABASE_URL;
describe.skipIf(!url)('ежемесячный отчёт блогеров PostgreSQL', () => {
  let pool: Pool;
  const schema = `blogger_report_${randomBytes(8).toString('hex')}`;
  const owner = randomUUID(), blogger = randomUUID(), second = randomUUID(), visitor = randomUUID(), another = randomUUID();
  const code = randomUUID(), campaign = randomUUID(), foreign = randomUUID();
  const registered = '2026-10-31T21:00:00Z', paid = '2026-11-10T12:00:00Z';
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Requires isolated *_test database');
    await ensureTestDatabase(url); pool = createPool(url, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  beforeEach(async () => {
    await pool.query('TRUNCATE account CASCADE');
    for (const id of [owner, blogger, second, visitor, another]) {
      await pool.query("INSERT INTO account(id,email,password_hash,owner_unlimited,is_blogger) VALUES($1,$2,'test-only',$3,$4)",
        [id, `${id}@example.test`, id === owner, [blogger, second].includes(id)]);
    }
    for (const [account, codeId, value] of [[blogger, code, 'BLOGGER1'], [blogger, campaign, 'CAMPAIGN'], [second, foreign, 'OTHER12']]) {
      await pool.query(`WITH p AS (INSERT INTO partner(account_id,display_name) VALUES($1,'Блогер')
        ON CONFLICT(account_id) DO UPDATE SET display_name=excluded.display_name RETURNING id)
        INSERT INTO partner_code(id,partner_id,code,status) SELECT $2,id,$3,'active' FROM p`, [account, codeId, value]);
    }
  });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  const attribute = (account = visitor, link = code, at = registered) => pool.query(`INSERT INTO attribution
    (account_id,partner_code_id,source,status,created_at,assigned_at) VALUES($1,$2,'cookie','pending',$3,$3)`, [account, link, at]);
  const video = async (account = visitor, at = paid, clips = 2, status = 'done') => {
    const id = randomUUID();
    await pool.query(`INSERT INTO video(id,account_id,idempotency_key,source,declared_bytes,status,finished_at)
      VALUES($1::uuid,$2,$1::text,'upload',100,$3,$4)`, [id, account, status, at]);
    for (let index = 1; index <= clips; index++) await pool.query(`INSERT INTO clip
      (video_id,"index",start_seconds,end_seconds,title,status,watermarked) VALUES($1,$2,0,25,'Клип','done',true)`, [id, index]);
    return id;
  };
  type PayOptions = { provider?: string; status?: string; review?: boolean; identity?: boolean; fulfilled?: boolean;
    amount?: number; intentStatus?: string; created?: string; at?: string; legacy?: boolean; intentAccount?: string };
  const pay = async (account = visitor, options: PayOptions = {}) => {
    const intent = randomUUID(), providerId = randomUUID();
    await pool.query(`INSERT INTO payment_intent
      (id,account_id,price_minor,idempotency_key,provider_payment_id,status,sku,offer_version,grant_seconds,fulfilled_at,created_at,referral_partner_code_id)
      VALUES($1::uuid,$2,99000,$1::text,$3,$4,$5,$6,$7,$8,$9,
        (SELECT partner_code_id FROM attribution WHERE account_id=$2 AND assigned_at<=$9::timestamptz AND status IN ('pending','activated')))`, [intent, options.intentAccount ?? account, providerId,
      options.intentStatus ?? 'succeeded', options.legacy ? 'legacy_pro990_v1' : 'start_v1',
      options.legacy ? 'legacy_v1' : 'credits_v1_d00', options.legacy ? 0 : 18000,
      options.fulfilled === false ? null : paid, options.created ?? paid]);
    await pool.query(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,status,needs_review,review_reason,paid_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [intent, account, options.provider ?? 'yookassa',
      options.identity === false ? randomUUID() : providerId, options.amount ?? 99000,
      options.status ?? 'succeeded', options.review ?? false, options.review ? 'amount_mismatch' : null, options.at ?? paid]);
    return intent;
  };
  const report = async (month = '2026-11') => {
    const result = await bloggerReport(pool, owner, month);
    if (result.kind !== 'ok') throw new Error(`Unexpected report: ${result.kind}`);
    return result;
  };
  it('monthly report counts unique people and verified payments', async () => {
    await attribute(); await attribute(another, campaign);
    await video(); await video(); await video(another);
    await pay(); await pay(); await pay(another);
    const result = await report(), entry = result.bloggers.find(row => row.account_id === blogger)!;
    expect(result.timezone).toBe('Europe/Moscow');
    expect(entry.counters).toEqual({ registrations: 2, active_users: 2, paying_users: 2,
      payments: 3, revenue_minor: 297000, commission_estimate_minor: null });
    expect(entry.codes.find(row => row.id === code)?.counters).toMatchObject({ registrations: 1, active_users: 1, paying_users: 1, payments: 2, revenue_minor: 198000 });
    expect(entry.codes.find(row => row.id === campaign)?.counters).toMatchObject({ registrations: 1, active_users: 1, paying_users: 1, payments: 1, revenue_minor: 99000 });
    expect(result.bloggers.find(row => row.account_id === second)?.counters.revenue_minor).toBe(0);
  });
  it('excludes refunds, unverified identities, reviews, old assignments and legacy purchases', async () => {
    await attribute(); const accepted = await pay();
    for (const options of [{ provider: 'fake' }, { status: 'refunded' }, { review: true }, { identity: false },
      { fulfilled: false }, { amount: 123 }, { intentStatus: 'canceled' }, { created: '2026-10-01' },
      { at: '2026-10-01' }, { legacy: true }, { intentAccount: another }]) await pay(visitor, options);
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters)
      .toMatchObject({ paying_users: 1, payments: 1, revenue_minor: 99000 });
    // Уникальный provider ID не допускает повторной записи того же события.
    const existing = (await pool.query('SELECT * FROM payment WHERE intent_id=$1', [accepted])).rows[0];
    await expect(pool.query(`INSERT INTO payment(intent_id,account_id,provider,provider_payment_id,amount_minor,paid_at)
      VALUES($1,$2,'yookassa',$3,99000,$4)`, [accepted, visitor, existing.provider_payment_id, paid])).rejects.toMatchObject({ code: '23505' });
    await pool.query("UPDATE payment SET status='refunded' WHERE intent_id=$1", [accepted]);
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters)
      .toMatchObject({ paying_users: 0, payments: 0, revenue_minor: 0 });
  });
  it('uses Moscow inclusive month start and exclusive month end', async () => {
    await attribute(visitor, code, '2026-10-01');
    await pay(visitor, { created: '2026-10-02', at: '2026-10-31T20:59:59.999Z' });
    await pay(visitor, { created: '2026-10-02', at: '2026-10-31T21:00:00Z' });
    await pay(visitor, { created: '2026-10-02', at: '2026-11-30T20:59:59.999Z' });
    await pay(visitor, { created: '2026-10-02', at: '2026-11-30T21:00:00Z' });
    await video(visitor, '2026-11-30T21:00:00Z');
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters)
      .toMatchObject({ registrations: 0, active_users: 0, payments: 2, revenue_minor: 198000 });
  });
  it('only completed video with a completed clip after assignment activates a person', async () => {
    await attribute(); await attribute(another, campaign);
    await video(visitor, '2026-10-31T20:59:59Z');
    await video(visitor, paid, 0); await video(another, paid, 1, 'rendering');
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters.active_users).toBe(0);
    await video();
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters.active_users).toBe(1);
  });
  it('historical payment stays with its original blogger after source replacement', async () => {
    await attribute(); await pay();
    await pool.query("UPDATE attribution SET partner_code_id=$2,assigned_at='2026-11-11' WHERE account_id=$1", [visitor, foreign]);
    const result = await report();
    expect(result.bloggers.find(row => row.account_id === blogger)?.counters.revenue_minor).toBe(99000);
    expect(result.bloggers.find(row => row.account_id === second)?.counters.revenue_minor).toBe(0);
    await pay(visitor, { at: '2026-11-12', created: '2026-11-12' });
    expect((await report()).bloggers.find(row => row.account_id === second)?.counters.revenue_minor).toBe(99000);
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters.revenue_minor).toBe(99000);
  });
  it('one payer across two codes of the same blogger counts once', async () => {
    await attribute(); await pay();
    await pool.query("UPDATE attribution SET partner_code_id=$2,assigned_at='2026-11-11' WHERE account_id=$1", [visitor, campaign]);
    await pay(visitor, { created: '2026-11-12', at: '2026-11-12' });
    const entry = (await report()).bloggers.find(row => row.account_id === blogger)!;
    expect(entry.counters).toMatchObject({ paying_users: 1, payments: 2, revenue_minor: 198000 });
    expect(entry.codes.find(row => row.id === code)?.counters).toMatchObject({ paying_users: 1, payments: 1, revenue_minor: 99000 });
    expect(entry.codes.find(row => row.id === campaign)?.counters).toMatchObject({ paying_users: 1, payments: 1, revenue_minor: 99000 });
  });
  it('verified payment survives provider clock skew', async () => {
    await attribute();
    await pay(visitor, { created: '2026-11-10T12:00:14Z', at: '2026-11-10T12:00:00Z' });
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters)
      .toMatchObject({ paying_users: 1, payments: 1, revenue_minor: 99000 });
    await pay(another, { created: '2026-11-10T12:00:14Z', at: '2026-11-10T12:00:00Z' });
    await attribute(another, code, '2026-11-11');
    expect((await report()).bloggers.find(row => row.account_id === blogger)?.counters)
      .toMatchObject({ paying_users: 1, payments: 1, revenue_minor: 99000 });
  });
  it('commission estimate uses explicit rate and integer floor', async () => {
    await attribute(); await pay();
    for (const [rate, expected] of [[null, null], [20, 19800], [30, 29700]] as const) {
      await pool.query('UPDATE account SET blogger_commission_percent=$2 WHERE id=$1', [blogger, rate]);
      const entry = (await report()).bloggers.find(row => row.account_id === blogger)!;
      expect(entry.counters.commission_estimate_minor).toBe(expected);
      expect(entry.codes.find(row => row.id === code)?.counters.commission_estimate_minor).toBe(expected);
    }
  });
  it('requires an active owner and validates month without leaking report data', async () => {
    for (const id of [blogger, visitor, randomUUID()]) expect(await bloggerReport(pool, id, '2026-11')).toEqual({ kind: 'forbidden' });
    await pool.query("UPDATE account SET status='erasing' WHERE id=$1", [owner]);
    expect(await bloggerReport(pool, owner, '2026-11')).toEqual({ kind: 'forbidden' });
    for (const month of ['2026-00', '2026-13', '2026-1', '0000-01', '2026-11-01', "2026-11'; DROP TABLE account"])
      expect(await bloggerReport(pool, owner, month)).toEqual({ kind: 'invalid' });
  });
  it('includes bloggers with no partner links and zero counters', async () => {
    await pool.query('DELETE FROM partner_code WHERE id=$1', [foreign]);
    const entry = (await report()).bloggers.find(row => row.account_id === second)!;
    expect(entry.codes).toEqual([]);
    expect(entry.counters).toMatchObject({ registrations: 0, active_users: 0, paying_users: 0, payments: 0, revenue_minor: 0 });
  });
});
