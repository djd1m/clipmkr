import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool, type Pool } from '../packages/db/src/index';
import bcrypt from 'bcrypt';
import { migrate } from '../packages/db/src/migrate';
import { AuthService, BCRYPT_COST } from '../apps/web/src/server/auth';
import { ipPrefix } from '../apps/web/src/server/ip';
import { ensureTestDatabase } from '../scripts/test-db.mjs';
import type { PoolClient } from 'pg';
import type { AccountCredentials, SessionInput } from '../apps/web/src/server/auth';
import { createAuthHandler } from '../apps/web/src/server/auth-handler';
import { setTimeout as delay } from 'node:timers/promises';
import { PgAuthStore } from '../apps/web/src/server/auth-store';

// Compose test передаёт DATABASE_URL с БД n5_test. Без URL логические тесты идут без PostgreSQL.
const databaseUrl = process.env.DATABASE_URL;
describe.skipIf(!databaseUrl)('PostgreSQL: ограничения, миграции и сессии', () => {
  let pool: Pool, auth: AuthService;
  const schema = `foundation_${randomBytes(8).toString('hex')}`;
  beforeAll(async () => {
    if (!databaseUrl || !new URL(databaseUrl).pathname.endsWith('_test')) throw new Error('Интеграционные тесты разрешены только в отдельной БД *_test');
    await ensureTestDatabase(databaseUrl);
    await ensureTestDatabase(databaseUrl);
    pool = createPool(databaseUrl, schema);
    await pool.query(`CREATE SCHEMA ${schema}`);
    await migrate(pool); await migrate(pool);
    auth = new AuthService(new PgAuthStore(pool), randomBytes(32).toString('hex'));
  });
  afterAll(async () => {
    if (pool) { await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`); await pool.end(); }
  });
  it('Миграция идемпотентна; все 15 сущностей и 4 таблицы оплаты присутствуют', async () => {
    const result = await pool.query('SELECT tablename FROM pg_tables WHERE schemaname = $1 AND tablename <> $2', [schema, '_schema_migration']);
    // 30 CREATE TABLE в миграциях001…032, включая billing_notice и две таблицы оформления.
    expect(result.rowCount).toBe(30);
    expect(result.rows.map((r: { tablename: string }) => r.tablename)).toEqual(expect.arrayContaining(['payment_intent', 'payment_event', 'payment', 'operator_action', 'support_mail_admission', 'clip_layout_intent', 'clip_layout_seed']));
    const used = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_schema=$1 AND table_name='quota_counter'", [schema]);
    expect(used.rows.map((r: { column_name: string }) => r.column_name)).not.toContain('limit');
  });
  it('12 конкурентных регистраций оставляют один аккаунт и действительные сессии', async () => {
    const tokens = await Promise.all(Array.from({ length: 12 }, () => auth.register('race@example.org', 'пароль аккаунта', '192.0.2.0/24')));
    expect((await pool.query("SELECT id FROM account WHERE email='race@example.org'")).rowCount).toBe(1);
    expect((await Promise.all(tokens.map((t) => auth.authenticate(t)))).filter(Boolean)).toHaveLength(12);
  });
  it('concurrent repeat registration grants once and authenticates only the winner password', async () => {
    for (const billing of ['credits_v1', 'legacy'] as const) for (const samePassword of [false, true]) {
      const email = `barrier-${randomUUID()}@example.invalid`;
      let inserted!: () => void, release!: () => void;
      const insertedGate = new Promise<void>(resolve => { inserted = resolve; });
      const releaseGate = new Promise<void>(resolve => { release = resolve; });
      let winnerPid = 0, loserPid = 0;
      function observedPool(winner: boolean): Pool {
        return new Proxy(pool, { get(target, property) {
          if (property !== 'connect') { const value = Reflect.get(target, property); return typeof value === 'function' ? value.bind(target) : value; }
          return async () => {
            const client = await target.connect();
            const pid = (await client.query('SELECT pg_backend_pid() AS pid')).rows[0].pid as number;
            if (winner) winnerPid = pid; else loserPid = pid;
            return new Proxy(client, { get(connection, key) {
              if (key !== 'query') { const value = Reflect.get(connection, key); return typeof value === 'function' ? value.bind(connection) : value; }
              return async (...args: unknown[]) => {
                const result = await Reflect.apply(connection.query, connection, args);
                if (winner && typeof args[0] === 'string' && args[0].includes('INSERT INTO account')) { inserted(); await releaseGate; }
                return result;
              };
            } }) as PoolClient;
          };
        } });
      }
      const winner = new AuthService(new PgAuthStore(observedPool(true), billing), 'barrier-secret');
      const loser = new AuthService(new PgAuthStore(observedPool(false), billing), 'barrier-secret');
      const first = winner.registerWithOutcome(email, 'winner-password', '192.0.2.0/24');
      let second: ReturnType<AuthService['registerWithOutcome']> | undefined;
      try {
        await Promise.race([insertedGate, delay(5000).then(() => { throw new Error('Winner insert not observed'); })]);
        second = loser.registerWithOutcome(email, samePassword ? 'winner-password' : 'loser-password', '192.0.2.0/24');
        const deadline = Date.now() + 5000; let blocked = false;
        while (Date.now() < deadline) {
          if (loserPid) {
            const row = (await pool.query('SELECT pg_blocking_pids($1) AS blockers, query FROM pg_stat_activity WHERE pid=$1', [loserPid])).rows[0];
            if (row?.blockers.includes(winnerPid)) { expect(row.query).toContain('INSERT INTO account'); blocked = true; break; }
          }
          await delay(10);
        }
        expect(blocked, 'real unique INSERT loser must block on uncommitted winner').toBe(true);
        expect(winnerPid).not.toBe(loserPid);
      } finally { release(); }
      const [created, repeated] = await Promise.all([first, second!]);
      expect(created.kind).toBe('created'); expect(repeated.kind).toBe(samePassword ? 'existing' : 'conflict');
      const account = (await pool.query('SELECT id,password_hash FROM account WHERE email=$1', [email])).rows;
      expect(account).toHaveLength(1); expect(await bcrypt.compare('winner-password', account[0].password_hash)).toBe(true);
      expect((await pool.query('SELECT count(*)::int AS n FROM credit_grant WHERE account_id=$1', [account[0].id])).rows[0].n).toBe(billing === 'credits_v1' ? 1 : 0);
      expect((await pool.query('SELECT count(*)::int AS n FROM session WHERE account_id=$1', [account[0].id])).rows[0].n).toBe(samePassword ? 2 : 1);
      if (created.kind === 'created') expect(await winner.authenticate(created.token)).toEqual({ account_id: account[0].id });
      if (repeated.kind === 'existing') expect(await loser.authenticate(repeated.token)).toEqual({ account_id: account[0].id });
      expect(await loser.login(email, 'loser-password', '192.0.2.0/24')).toBeNull();
    }
  }, 30000);
  it('repeat registration fences password reset and erasure before session insert', async () => {
    for (const operation of ['reset', 'erasure']) {
      const email = `fence-${randomUUID()}@example.invalid`;
      let ready!: () => void, release!: () => void;
      const snapshotReady = new Promise<void>(resolve => { ready = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      const events: string[] = [];
      class PausedStore extends PgAuthStore {
        override async createSession(account: AccountCredentials, session: SessionInput) {
          events.push('compared'); ready(); await gate; events.push('insert'); return super.createSession(account, session);
        }
      }
      await auth.register(email, 'original-password', '192.0.2.0/24');
      const account = (await pool.query('SELECT id FROM account WHERE email=$1', [email])).rows[0].id;
      const before = (await pool.query('SELECT count(*)::int AS n FROM session WHERE account_id=$1', [account])).rows[0].n;
      const service = new AuthService(new PausedStore(pool), 'fence-secret');
      const pending = service.registerWithOutcome(email, 'original-password', '192.0.2.0/24');
      try {
        await Promise.race([snapshotReady, delay(5000).then(() => { throw new Error('Credential snapshot not reached'); })]);
        const change = operation === 'reset' ? await bcrypt.hash('replacement-password', 10) : 'erasing';
        const sql = operation === 'reset' ? 'UPDATE account SET password_hash=$2 WHERE id=$1 RETURNING password_hash AS value' : 'UPDATE account SET status=$2 WHERE id=$1 RETURNING status AS value';
        expect((await pool.query(sql, [account, change])).rows[0].value).toBe(change); events.push('committed');
      } finally { release(); }
      expect(await pending).toEqual({ kind: 'unavailable' }); expect(events).toEqual(['compared', 'committed', 'insert']);
      expect((await pool.query('SELECT count(*)::int AS n FROM session WHERE account_id=$1', [account])).rows[0].n).toBe(before);
    }
  });
  it('registration session failure rolls back account and trial', async () => {
    const email = `rollback-${randomUUID()}@example.invalid`;
    await pool.query(`CREATE FUNCTION fail_registration_session() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic session failure'; END $$`);
    await pool.query('CREATE TRIGGER fail_registration_session BEFORE INSERT ON session FOR EACH ROW EXECUTE FUNCTION fail_registration_session()');
    const before = (await pool.query('SELECT count(*)::int AS n FROM credit_grant')).rows[0].n;
    const handler = createAuthHandler('register', { auth: new AuthService(new PgAuthStore(pool, 'credits_v1'), 'rollback-secret'), publicOrigin: 'https://test.invalid', trustedProxyHops: 2, allowMutation: async () => true });
    try {
      const response = await handler(new Request('https://test.invalid/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.9, 10.0.0.2, 10.0.0.3' }, body: JSON.stringify({ email, password: 'rollback-password' }) }));
      expect(response.status).toBe(503); expect(response.headers.has('set-cookie')).toBe(false);
      const observer = await pool.connect();
      try {
        expect((await observer.query('SELECT id FROM account WHERE email=$1', [email])).rowCount).toBe(0);
        expect((await observer.query('SELECT count(*)::int AS n FROM credit_grant')).rows[0].n).toBe(before);
        expect((await observer.query('SELECT s.id FROM session s JOIN account a ON a.id=s.account_id WHERE a.email=$1', [email])).rowCount).toBe(0);
      } finally { observer.release(); }
    } finally { await pool.query('DROP TRIGGER fail_registration_session ON session'); await pool.query('DROP FUNCTION fail_registration_session()'); }
  });
  it('logout отозван в БД; повторное использование cookie отвергается', async () => {
    const token = await auth.register('logout@example.org', 'пароль аккаунта', '192.0.2.0/24');
    expect(await auth.authenticate(token)).not.toBeNull();
    await auth.logout(token); expect(await auth.authenticate(token)).toBeNull();
  });
  it('12 сравнений bcrypt не удерживают 4 соединения пула', async () => {
    const hash = await bcrypt.hash('пароль аккаунта', BCRYPT_COST);
    await pool.query('INSERT INTO account(email,password_hash) VALUES ($1,$2)', ['pool@example.org', hash]);
    let enter!: () => void, release!: () => void, count = 0;
    const allEntered = new Promise<void>((resolve) => { enter = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const compare = vi.spyOn(bcrypt, 'compare').mockImplementation(async () => {
      if (++count === 12) enter(); await gate; return false;
    });
    const calls = Array.from({ length: 12 }, () => auth.login('pool@example.org', 'неверный пароль', '192.0.2.0/24'));
    try {
      await Promise.race([allEntered, new Promise((_, reject) => setTimeout(() => reject(new Error('Пул удерживается во время bcrypt')), 2000))]);
      expect((await pool.query('SELECT 1 AS ok')).rows[0].ok).toBe(1);
    } finally { release(); await Promise.all(calls); compare.mockRestore(); }
  });
  it('RV-004: NULL-префикс запрещён у обоих дедуплицируемых событий', async () => {
    for (const type of ['link_view', 'guest_opened']) {
      await expect(pool.query('INSERT INTO growth_event(type,ip_prefix,day) VALUES ($1,NULL,current_date)', [type]))
        .rejects.toMatchObject({ code: '23514', constraint: 'growth_event_dedup_prefix_required' });
    }
    await pool.query("INSERT INTO growth_event(type,ip_prefix,day) VALUES ('download',NULL,current_date)");
  });
  it('RV-013: IPv6 /64 принимается настоящей колонкой session.cidr', async () => {
    for (const [index, ip] of ['2001:db8:1234::1', '::1'].entries()) {
      const token = await auth.register(`ipv6-${index}@example.org`, 'пароль аккаунта', ipPrefix(ip));
      expect(await auth.authenticate(token)).not.toBeNull();
      const result = await pool.query('SELECT ip_prefix = $1::cidr AS matches FROM session WHERE cookie_token_hash=$2', [ipPrefix(ip), auth.tokenHash(token)]);
      expect(result.rows[0].matches).toBe(true);
    }
  });
  it('8 первых рендеров имеют общий монотонный fence; повтор fence отвергнут', async () => {
    const account = (await pool.query("INSERT INTO account(email,password_hash) VALUES ('fence@example.org','test-hash') RETURNING id")).rows[0].id;
    const video = (await pool.query("INSERT INTO video(account_id,idempotency_key,source,declared_bytes,status) VALUES ($1,'one','upload',1,'rendering') RETURNING id", [account])).rows[0].id;
    for (let i = 1; i <= 8; i++) {
      const clip = (await pool.query('INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked) VALUES ($1,$2,0,20,\'Клип\',\'queued\',true) RETURNING id', [video, i])).rows[0].id;
      await pool.query('INSERT INTO clip_link(clip_id,code) VALUES ($1,$2)', [clip, randomUUID()]);
      await pool.query("INSERT INTO job_attempt(video_id,clip_id,stage,attempt_no,fence,status,unit,unit_count,started_at) VALUES ($1,$2,'render',1,$3,'running','none',0,now())", [video, clip, i]);
    }
    await expect(pool.query("INSERT INTO job_attempt(video_id,stage,attempt_no,fence,status,unit,unit_count,started_at) VALUES ($1,'stt',1,1,'running','none',0,now())", [video])).rejects.toMatchObject({ code: '23505' });
    await expect(pool.query('UPDATE clip SET score=1,score_hook=1,score_completeness=0,score_length=0 WHERE video_id=$1', [video])).rejects.toMatchObject({ code: '23514' });
    await expect(pool.query("UPDATE video SET failure_reason='invented' WHERE id=$1", [video])).rejects.toMatchObject({ code: '23514' });
  });
  it('20 link_view и 10 guest_opened: по одной уникальной записи на /24 за сутки', async () => {
    const account = (await pool.query("INSERT INTO account(email,password_hash) VALUES ('events@example.org','test-hash') RETURNING id")).rows[0].id;
    const video = (await pool.query("INSERT INTO video(account_id,idempotency_key,source,declared_bytes,status) VALUES ($1,'events','upload',1,'queued') RETURNING id", [account])).rows[0].id;
    const clip = (await pool.query('INSERT INTO clip(video_id,"index",start_seconds,end_seconds,title,status,watermarked) VALUES ($1,1,0,20,\'Клип\',\'queued\',true) RETURNING id', [video])).rows[0].id;
    const link = (await pool.query("INSERT INTO clip_link(clip_id,code) VALUES ($1,'EVENTLINK') RETURNING id", [clip])).rows[0].id;
    const partner = (await pool.query("INSERT INTO partner(account_id,display_name) VALUES ($1,'Ведущий') RETURNING id", [account])).rows[0].id;
    const code = (await pool.query("INSERT INTO partner_code(partner_id,code,status) VALUES ($1,'EVENTCODE','active') RETURNING id", [partner])).rows[0].id;
    const guest = (await pool.query(`INSERT INTO guest_pack(video_id,account_id,code,guest_name,consent_confirmed,consent_version,consent_text_hash,consent_at,host_partner_code_id)
      VALUES ($1,$2,'GUESTCODE','Гость',true,'v1','test-hash',now(),$3) RETURNING id`, [video, account, code])).rows[0].id;
    for (const [type, column, id, count] of [['link_view', 'clip_link_id', link, 20], ['guest_opened', 'guest_pack_id', guest, 10]] as const) {
      const results = await Promise.all(Array.from({ length: count }, () => pool.query(
        `INSERT INTO growth_event(type,${column},ip_prefix,day) VALUES ($1,$2,'192.0.2.0/24','2026-09-21') ON CONFLICT DO NOTHING RETURNING id`, [type, id])));
      expect(results.reduce((sum, r) => sum + (r.rowCount ?? 0), 0)).toBe(1);
    }
  });
});
