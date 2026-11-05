import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, transaction, type Pool, type PoolClient } from '../packages/db/src/index';
import { migrate } from '../packages/db/src/migrate';
import { getBloggerPolicy, setBloggerPolicy } from '../packages/db/src/blogger-policy';
import { grantTrialTx, lockCreditAccountForVideo, readCreditBalance,
  reserveVideoCreditsTx, finalizeVideoCreditsTx, raiseTrialCreditsTx } from '../packages/db/src/credits';
import { ensureTestDatabase } from '../scripts/test-db.mjs';

const url = process.env.DATABASE_URL;
describe.skipIf(!url)('Пробный бюджет блогера: настоящий PostgreSQL', () => {
  let pool: Pool;
  const schema = `blogger_trial_${randomBytes(8).toString('hex')}`;
  const now = () => new Date(Date.now() + 60_000);
  beforeAll(async () => {
    if (!url || !new URL(url).pathname.endsWith('_test')) throw new Error('Нужна отдельная БД *_test');
    await ensureTestDatabase(url); pool = createPool(url, schema);
    await pool.query(`CREATE SCHEMA ${schema}`); await migrate(pool);
  });
  beforeEach(async () => { await pool.query('TRUNCATE account CASCADE'); });
  afterAll(async () => { if (pool) { await pool.query(`DROP SCHEMA ${schema} CASCADE`); await pool.end(); } });
  async function account(owner = false, billing = 'credits_v1', trial = true, source: 'signup' | 'migration_trial' = 'signup') {
    const id = (await pool.query<{ id: string }>(`INSERT INTO account(email,password_hash,owner_unlimited,billing_policy)
      VALUES($1,'test',$2,$3) RETURNING id`, [`${randomUUID()}@test.invalid`, owner, billing])).rows[0]!.id;
    if (billing === 'credits_v1' && trial) await transaction(pool, tx => grantTrialTx(tx, id, source));
    return id;
  }
  const change = (actorAccountId: string, accountId: string,
    extra: Partial<Parameters<typeof setBloggerPolicy>[1]> = {}) => setBloggerPolicy(pool, {
    actorAccountId, accountId, isBlogger: true, sourceLimitSeconds: null,
    commissionPercent: 20, reason: 'Проверка пробного бюджета', ...extra,
  });
  const trial = async (id: string) => (await pool.query(`SELECT * FROM credit_grant
    WHERE account_id=$1 AND source IN ('signup','migration_trial')`, [id])).rows[0];
  const audit = async (id: string) => (await pool.query(`SELECT * FROM operator_action
    WHERE account_id=$1 ORDER BY created_at,id`, [id])).rows;
  const snapshot = async (id: string) => ({ policy: await getBloggerPolicy(pool, id), trial: await trial(id), audit: await audit(id) });
  async function video(id: string) {
    return (await pool.query<{ id: string }>(`INSERT INTO video(account_id,idempotency_key,source,declared_bytes,status)
      VALUES($1,$2,'upload',100,'queued') RETURNING id`, [id, randomUUID()])).rows[0]!.id;
  }
  async function lockVideo(tx: PoolClient, id: string) {
    await lockCreditAccountForVideo(tx, id);
    await tx.query('SELECT id FROM video WHERE id=$1 FOR UPDATE', [id]);
  }
  async function waitForBlocked(pid: number) {
    for (let attempt = 0; attempt < 100; attempt++) {
      const row = await pool.query('SELECT 1 FROM pg_stat_activity WHERE $1=ANY(pg_blocking_pids(pid))', [pid]);
      if (row.rowCount) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error('Ожидающий policy вызов не достиг account lock');
  }

  it.each(['signup', 'migration_trial'] as const)('raises existing %s trial and preserves consumed seconds', async source => {
    const owner = await account(true), id = await account(false, 'credits_v1', true, source);
    await pool.query('UPDATE credit_grant SET remaining_seconds=1620 WHERE account_id=$1', [id]);
    const before = await trial(id);
    expect(await change(owner, id)).toMatchObject({ kind: 'updated' });
    expect(await trial(id)).toEqual({ ...before, total_seconds: 7200, remaining_seconds: 7020 });
    expect(await readCreditBalance(pool, id, now())).toMatchObject({ available_seconds: 7020, reserved_seconds: 0 });
    const fresh = await account();
    expect(await change(owner, fresh)).toMatchObject({ kind: 'updated' });
    expect(await trial(fresh)).toMatchObject({ total_seconds: 7200, remaining_seconds: 7200 });
    expect((await pool.query('SELECT plan,plan_source FROM account WHERE id=$1', [id])).rows[0])
      .toEqual({ plan: 'free', plan_source: 'none' });
  });

  it('never refills repeat revoke or lower limit and raises only the lifetime delta', async () => {
    const owner = await account(true), id = await account();
    await change(owner, id);
    await pool.query('UPDATE credit_grant SET remaining_seconds=7020 WHERE account_id=$1', [id]);
    for (const extra of [{}, { isBlogger: false }, {}, { sourceLimitSeconds: 120 }]) {
      expect(await change(owner, id, extra)).toMatchObject({ kind: 'updated' });
      expect(await trial(id)).toMatchObject({ total_seconds: 7200, remaining_seconds: 7020 });
    }
    await change(owner, id, { sourceLimitSeconds: 9000 });
    await change(owner, id, { sourceLimitSeconds: 9000 });
    expect(await trial(id)).toMatchObject({ total_seconds: 9000, remaining_seconds: 8820 });
    const small = await account();
    await change(owner, small, { sourceLimitSeconds: 120 });
    expect(await trial(small)).toMatchObject({ total_seconds: 1800, remaining_seconds: 1800 });
    const noTrial = await account(false, 'credits_v1', false);
    expect(await change(owner, noTrial, { isBlogger: false })).toMatchObject({ kind: 'updated' });
    expect(await trial(noTrial)).toBeUndefined();
  });

  it('trial helper rejects invalid second bounds without ledger changes', async () => {
    const id = await account(), before = await trial(id);
    for (const seconds of [0, 119, 7200.5, 86401, NaN, Infinity])
      await expect(transaction(pool, tx => raiseTrialCreditsTx(tx, id, seconds))).rejects.toThrow('Непригодный пробный бюджет');
    expect(await trial(id)).toEqual(before);
  });

  it('accepts uppercase UUIDs without losing canonical account or trial identity', async () => {
    const owner = await account(true), id = await account(), before = await trial(id);
    expect(await change(owner, id.toUpperCase())).toMatchObject({ kind: 'updated' });
    expect(await change(owner.toUpperCase(), id.toUpperCase())).toMatchObject({ kind: 'updated' });
    await transaction(pool, async tx => {
      await tx.query('SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', [id]);
      expect(await raiseTrialCreditsTx(tx, id.toUpperCase(), 9000)).toEqual({ kind: 'raised', beforeTotal: 7200, afterTotal: 9000, delta: 1800 });
    });
    expect(await trial(id)).toEqual({ ...before, total_seconds: 9000, remaining_seconds: 9000 });
  });

  it.each([1, 2, 3, 4, 5])('serializes twenty two-owner high-watermark saves, repeat %s', async () => {
    const owners = [await account(true), await account(true)], id = await account();
    await pool.query('UPDATE credit_grant SET remaining_seconds=1620 WHERE account_id=$1', [id]);
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) =>
      change(owners[i % 2]!, id, { sourceLimitSeconds: i % 3 === 0 ? 9000 : 7200 })));
    expect(results.every(result => result.kind === 'updated')).toBe(true);
    expect(await trial(id)).toMatchObject({ total_seconds: 9000, remaining_seconds: 8820, reserved_seconds: 0 });
    const actions = await audit(id);
    expect(actions).toHaveLength(20);
    const deltas = actions.map(row => Number(/trial_delta:(\d+)/.exec(row.reason)?.[1]));
    expect(deltas.reduce((a, b) => a + b, 0)).toBe(7200);
  });

  it('changes only trial beside paid and recovery grants and preserves held charge history', async () => {
    const owner = await account(true), id = await account(), v = await video(id);
    await transaction(pool, async tx => { await lockVideo(tx, v); expect(await reserveVideoCreditsTx(tx, v, 300, now())).toBe('reserved'); });
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,
      available_at,expires_at,entitlement_start,entitlement_end)
      VALUES($1,'payment',$2,18000,18000,now(),now()+interval '30 days',now(),now()+interval '30 days')`, [id, randomUUID()]);
    await pool.query(`INSERT INTO credit_grant(account_id,source,source_key,total_seconds,remaining_seconds,
      available_at,expires_at,recovery_video_id) VALUES($1,'recovery',$2,120,120,now(),now()+interval '1 day',$3)`, [id, randomUUID(), v]);
    const other = () => pool.query("SELECT * FROM credit_grant WHERE account_id=$1 AND source IN ('payment','recovery') ORDER BY id", [id]);
    const before = (await other()).rows;
    const charges = (await pool.query('SELECT * FROM video_credit_charge WHERE video_id=$1', [v])).rows;
    const allocations = (await pool.query('SELECT * FROM credit_allocation ORDER BY id')).rows;
    await change(owner, id);
    expect(await trial(id)).toMatchObject({ total_seconds: 7200, remaining_seconds: 6900, reserved_seconds: 300 });
    expect((await other()).rows).toEqual(before);
    expect((await pool.query('SELECT * FROM video_credit_charge WHERE video_id=$1', [v])).rows).toEqual(charges);
    expect((await pool.query('SELECT * FROM credit_allocation ORDER BY id')).rows).toEqual(allocations);
    expect(await readCreditBalance(pool, id, now())).toMatchObject({ available_seconds: 24900, recovery_seconds: 120, reserved_seconds: 300 });
  });

  it('preserves legacy policy without implicit credits and refuses missing or noncanonical trial', async () => {
    const owner = await account(true), legacy = await account(false, 'legacy_daily_v1');
    expect(await change(owner, legacy)).toMatchObject({ kind: 'updated', policy: { is_blogger: true } });
    expect(await trial(legacy)).toBeUndefined();
    expect(await readCreditBalance(pool, legacy)).toBeNull();
    const mutations = [null, "source_key='not-canonical'", "expires_at=now()+interval '1 day'",
      "entitlement_start=now(),entitlement_end=now()+interval '1 day'", 'original_entitlement_ref=gen_random_uuid()', "base_sku='start_v1'"];
    for (const mutation of mutations) {
      const id = await account(false, 'credits_v1', mutation !== null);
      if (mutation) await pool.query(`UPDATE credit_grant SET ${mutation} WHERE account_id=$1`, [id]);
      const before = await snapshot(id);
      expect(await change(owner, id)).toEqual({ kind: 'credit_review_required' });
      expect(await snapshot(id)).toEqual(before);
    }
  });

  it('serializes trial increase with native reservation and finalize refund through account barriers', async () => {
    const owner = await account(true), id = await account(), v = await video(id);
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN'); const pid = (await tx.query<{ pid: number }>('SELECT pg_backend_pid() pid')).rows[0]!.pid;
      await lockVideo(tx, v);
      expect(await reserveVideoCreditsTx(tx, v, 300, now())).toBe('reserved');
      const saving = change(owner, id);
      try { await waitForBlocked(pid); } finally { await tx.query('COMMIT'); }
      expect(await saving).toMatchObject({ kind: 'updated' });
      expect(await trial(id)).toMatchObject({ total_seconds: 7200, remaining_seconds: 6900, reserved_seconds: 300 });
      await tx.query('BEGIN'); await lockVideo(tx, v);
      await tx.query("UPDATE video SET status='failed' WHERE id=$1", [v]);
      await finalizeVideoCreditsTx(tx, v, now());
      const raising = change(owner, id, { sourceLimitSeconds: 9000 });
      try { await waitForBlocked(pid); } finally { await tx.query('COMMIT'); }
      expect(await raising).toMatchObject({ kind: 'updated' });
      expect(await trial(id)).toMatchObject({ total_seconds: 9000, remaining_seconds: 9000, reserved_seconds: 0 });
      expect((await pool.query('SELECT state,billable_seconds FROM video_credit_charge WHERE video_id=$1', [v])).rows)
        .toEqual([{ state: 'released', billable_seconds: 300 }]);
      expect((await pool.query('SELECT seconds FROM credit_allocation')).rows).toEqual([{ seconds: 300 }]);
    } finally { await tx.query('ROLLBACK'); tx.release(); }
  });

  it('authority erasure and audit failure leave no partial funding or policy', async () => {
    const owner = await account(true), id = await account(), other = await account();
    const before = await snapshot(id);
    expect(await change(other, id)).toEqual({ kind: 'forbidden' });
    await pool.query("UPDATE account SET status='erasing' WHERE id=$1", [owner]);
    expect(await change(owner, id)).toEqual({ kind: 'forbidden' });
    expect(await snapshot(id)).toEqual(before);
    await pool.query("UPDATE account SET status='active' WHERE id=$1", [owner]);
    await pool.query("ALTER TABLE operator_action ADD CONSTRAINT test_trial_audit_failure CHECK (action<>'set_blogger_policy') NOT VALID");
    try { await expect(change(owner, id)).rejects.toMatchObject({ code: '23514' }); }
    finally { await pool.query('ALTER TABLE operator_action DROP CONSTRAINT test_trial_audit_failure'); }
    expect(await snapshot(id)).toEqual(before);
    const tx = await pool.connect();
    try {
      await tx.query('BEGIN');
      const pid = (await tx.query<{ pid: number }>('SELECT pg_backend_pid() pid')).rows[0]!.pid;
      await tx.query("UPDATE account SET status='erasing' WHERE id=$1", [id]);
      const saving = change(owner, id);
      try { await waitForBlocked(pid); } finally { await tx.query('COMMIT'); }
      expect(await saving).toEqual({ kind: 'not_found' });
      expect(await trial(id)).toEqual(before.trial);
      expect(await audit(id)).toEqual([]);
    } finally { await tx.query('ROLLBACK'); tx.release(); }
  });

  it('expected policy refuses stale or malformed maintenance without writes', async () => {
    const owner = await account(true), id = await account();
    const expectedPolicy = { is_blogger: false, blogger_source_limit_seconds: null, blogger_commission_percent: null };
    type Guard = NonNullable<Parameters<typeof setBloggerPolicy>[1]['expectedPolicy']>;
    for (const malformed of [null, {}, [], { ...expectedPolicy, extra: true }, { ...expectedPolicy, is_blogger: 'false' },
      { ...expectedPolicy, blogger_source_limit_seconds: 119 }, { ...expectedPolicy, blogger_commission_percent: 25 }]) {
      const before = await snapshot(id);
      expect(await change(owner, id, { expectedPolicy: malformed as unknown as Guard })).toEqual({ kind: 'invalid' });
      expect(await snapshot(id)).toEqual(before);
    }
    for (const edit of ["is_blogger=true", 'blogger_source_limit_seconds=9000', 'blogger_commission_percent=30']) {
      await pool.query(`UPDATE account SET ${edit} WHERE id=$1`, [id]);
      const before = await snapshot(id);
      expect(await change(owner, id, { expectedPolicy })).toEqual({ kind: 'conflict' });
      expect(await snapshot(id)).toEqual(before);
      await pool.query('UPDATE account SET is_blogger=false,blogger_source_limit_seconds=NULL,blogger_commission_percent=NULL WHERE id=$1', [id]);
    }
    expect(await change(owner, id, { expectedPolicy })).toMatchObject({ kind: 'updated' });
    const current = { is_blogger: true, blogger_source_limit_seconds: null, blogger_commission_percent: 20 as const };
    await change(owner, id, { expectedPolicy: current });
    expect(await trial(id)).toMatchObject({ total_seconds: 7200, remaining_seconds: 7200 });
  });

  it('audit records positive and zero delta and legacy revoke states within native reason bound', async () => {
    const owner = await account(true), id = await account();
    const reason = 'Я'.repeat(300);
    await change(owner, id, { sourceLimitSeconds: 86400, commissionPercent: 30, reason });
    await change(owner, id, { sourceLimitSeconds: 86400, commissionPercent: 30, reason });
    const rows = await audit(id);
    expect(rows).toHaveLength(2);
    expect(rows.every(row => row.operator === owner && row.account_id === id && row.action === 'set_blogger_policy')).toBe(true);
    expect(rows.every(row => row.reason.length <= 500 && row.reason.includes(reason))).toBe(true);
    expect(rows.some(row => row.reason.includes('trial_total:1800->86400; trial_delta:84600; trial:raised'))).toBe(true);
    expect(rows.some(row => row.reason.includes('trial_total:86400->86400; trial_delta:0; trial:unchanged'))).toBe(true);
    await change(owner, id, { isBlogger: false });
    expect((await audit(id)).some(row => row.reason.includes('trial:revoked'))).toBe(true);
    const legacy = await account(false, 'legacy_daily_v1'); await change(owner, legacy);
    expect((await audit(legacy))[0].reason).toContain('trial:legacy');
  });
});
