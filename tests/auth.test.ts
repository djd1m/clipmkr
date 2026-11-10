import { beforeAll, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { AuthService, BCRYPT_COST, type AccountCredentials, type AuthStore, type SessionInput } from '../apps/web/src/server/auth';
import { createAuthHandler } from '../apps/web/src/server/auth-handler';
import { ipPrefix, clientIp } from '../apps/web/src/server/ip';

const secret = randomBytes(32).toString('hex');
let passwordHash: string;
beforeAll(async () => { passwordHash = await bcrypt.hash('правильный пароль', BCRYPT_COST); });
function store(account: AccountCredentials | null = null): AuthStore {
  return { findAccount: vi.fn(async () => account), register: vi.fn(async () => true),
    createSession: vi.fn(async () => true), revoke: vi.fn(async () => {}), findSession: vi.fn(async () => null) };
}
function request(password = 'неправильный пароль', headers: Record<string, string> = {}) {
  return new Request('https://test.invalid/api/auth/login', { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.99, 10.0.0.5, 172.18.0.2', ...headers },
    body: JSON.stringify({ email: 'user@example.org', password }) });
}
function handler(action: 'login' | 'register' | 'logout', db: AuthStore, allowMutation = async () => true) {
  return createAuthHandler(action, { auth: new AuthService(db, secret), publicOrigin: 'https://test.invalid', trustedProxyHops: 2, allowMutation });
}
describe('Аутентификация', () => {
  it('Нет адреса / неверный пароль / erasing: одинаковые текст и статус, сопоставимое время', async () => {
    const active = { id: 'account', password_hash: passwordHash, status: 'active' };
    const cases = [null, active, { ...active, status: 'erasing' }];
    const times: number[] = [], replies: unknown[] = [];
    for (const account of cases) {
      const run = handler('login', store(account));
      const durations: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        const response = await run(request(account?.status === 'erasing' ? 'правильный пароль' : undefined));
        durations.push(performance.now() - start);
        replies.push({ status: response.status, body: await response.json() });
      }
      times.push(durations.sort((a, b) => a - b)[1]!);
    }
    expect(replies.every((r) => JSON.stringify(r) === JSON.stringify(replies[0]))).toBe(true);
    expect(replies[0]).toEqual({ status: 401, body: { error: 'Неверная почта или пароль' } });
    expect(times[0]! / times[1]!).toBeGreaterThan(0.25);
    expect(times[0]! / times[1]!).toBeLessThan(4);
  });
  it('Успех: токен 256 бит, защищённый cookie, в store только хэш и /24', async () => {
    const db = store({ id: 'account', password_hash: passwordHash, status: 'active' });
    const result = await handler('login', db)(request('правильный пароль'));
    expect(result.status).toBe(200);
    const cookie = result.headers.get('set-cookie')!;
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(cookie).toContain(flag);
    const token = cookie.split(';')[0]!.split('=')[1]!;
    expect(Buffer.from(token, 'base64url').length).toBe(32);
    const session = vi.mocked(db.createSession).mock.calls[0]![1];
    expect(session.hash).toMatch(/^[a-f0-9]{64}$/); expect(session.hash).not.toBe(token);
    expect(session.ipPrefix).toBe('192.0.2.0/24');
  });
  it('Новая регистрация подтверждает создание и считает bcrypt до записи', async () => {
    const db = store();
    vi.mocked(db.register).mockImplementation(async (_email, hash, session: SessionInput) => {
      expect(bcrypt.getRounds(hash)).toBeGreaterThanOrEqual(10);
      expect(await bcrypt.compare('правильный пароль', hash)).toBe(true);
      expect(session.hash).toMatch(/^[a-f0-9]{64}$/);
      return true;
    });
    const result = await handler('register', db)(request('правильный пароль'));
    expect(result.status).toBe(200); expect(await result.json()).toEqual({ ok: true, registration: 'created' });
  });
  it('repeat registration authenticates only an active matching password', async () => {
    for (const status of ['active', 'erasing', 'unknown', null]) for (const matches of [true, false]) {
      const db = store({ id: 'existing', password_hash: passwordHash, status });
      vi.mocked(db.register).mockResolvedValue(false);
      const auth = new AuthService(db, secret);
      const result = await auth.registerWithOutcome('user@example.org', matches ? 'правильный пароль' : 'wrong-password', '192.0.2.0/24');
      expect(result.kind).toBe(status !== 'active' ? 'unavailable' : matches ? 'existing' : 'conflict');
      expect(db.createSession).toHaveBeenCalledTimes(status === 'active' && matches ? 1 : 0);
    }
    const db = store({ id: 'existing', password_hash: passwordHash, status: 'active' });
    vi.mocked(db.register).mockResolvedValue(false); vi.mocked(db.createSession).mockResolvedValue(false);
    const auth = new AuthService(db, secret);
    expect(await auth.registerWithOutcome('user@example.org', 'правильный пароль', '192.0.2.0/24')).toEqual({ kind: 'unavailable' });
    await expect(auth.register('user@example.org', 'wrong-password', '192.0.2.0/24')).rejects.toThrow();
  });
  it('legacy registration conflict never creates a session', async () => {
    for (const version of [undefined, 'unknown', 'outcomes-v1']) {
      const db = store({ id: 'existing', password_hash: passwordHash, status: 'active' }); vi.mocked(db.register).mockResolvedValue(false);
      const response = await handler('register', db)(request('правильный пароль', version ? { 'X-Clipmkr-Registration': version } : {}));
      expect(response.status).toBe(version === 'outcomes-v1' ? 200 : 409);
      expect(db.createSession).toHaveBeenCalledTimes(version === 'outcomes-v1' ? 1 : 0);
      if (version === 'outcomes-v1') expect(await response.json()).toEqual({ ok: true, registration: 'existing' });
      else { expect(response.headers.has('set-cookie')).toBe(false); expect(await response.json()).toMatchObject({ code: 'account_exists' }); }
    }
  });
  it('auth failures never log exception credentials', async () => {
    const marker = 'synthetic-credential-must-not-escape';
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      for (const action of ['register', 'login'] as const) {
        const db = store(); const failure = Object.assign(new Error(marker, { cause: new Error(marker) }), { nested: { password: marker } });
        vi.mocked(db.register).mockRejectedValue(failure); vi.mocked(db.findAccount).mockRejectedValue(failure);
        const response = await handler(action, db)(request());
        expect(response.status).toBe(503); expect(response.headers.has('set-cookie')).toBe(false);
        expect(await response.text()).not.toContain(marker);
      }
      expect(log).toHaveBeenCalledTimes(2);
      expect(log.mock.calls).toEqual([['auth_request_failed', 'register'], ['auth_request_failed', 'login']]);
    } finally { log.mockRestore(); }
  });
  it('registration keeps body, origin and rate guards before credentials', async () => {
    for (const action of ['register', 'login'] as const) {
      const db = store(); const req = request(); const reader = vi.spyOn(req.body!, 'getReader');
      expect((await handler(action, db, async () => false)(req)).status).toBe(429); expect(reader).not.toHaveBeenCalled();
      expect((await handler(action, db)(request(undefined, { origin: 'https://foreign.invalid' }))).status).toBe(403);
      const chunks = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(2048)); controller.enqueue(new Uint8Array(2049)); controller.close(); } });
      const streamInput: RequestInit & { duplex: 'half' } = { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': '192.0.2.99, 10.0.0.5, 172.18.0.2' }, body: chunks, duplex: 'half' };
      const huge = new Request('https://test.invalid', streamInput); expect(huge.headers.get('content-length')).toBeNull();
      expect((await handler(action, db)(huge)).status).toBe(413); expect(db.register).not.toHaveBeenCalled(); expect(db.findAccount).not.toHaveBeenCalled();
    }
  });
  it('invalid registration store returns never authenticate', async () => {
    const db = store({ id: 'existing', password_hash: passwordHash, status: 'active' });
    vi.mocked(db.register).mockResolvedValue(undefined as never);
    const response = await handler('register', db)(request('правильный пароль', { 'X-Clipmkr-Registration': 'outcomes-v1' }));
    expect(response.status).toBe(503); expect(response.headers.has('set-cookie')).toBe(false);
    expect(db.findAccount).not.toHaveBeenCalled(); expect(db.createSession).not.toHaveBeenCalled();
  });
  it('login and registration validate transport and credential boundaries', async () => {
    for (const action of ['register', 'login'] as const) {
      const send = (raw: string, headers: Record<string, string> = {}) => new Request('https://test.invalid/api/auth/' + action, { method: 'POST', headers: {
        'content-type': 'application/json', 'x-forwarded-for': '192.0.2.99, 10.0.0.5, 172.18.0.2', ...headers }, body: raw });
      for (const [raw, headers] of [['{', {}], [JSON.stringify({ email: 'user@example.org', password: '12345678' }), { 'content-type': 'text/plain' }],
        [JSON.stringify({ email: 'bad', password: '12345678' }), {}], [JSON.stringify({ email: 'user@example.org', password: '12345678', extra: true }), {}]] as const) {
        const db = store(); const response = await handler(action, db)(send(raw, headers));
        expect(response.status).toBe(422); expect(response.headers.has('set-cookie')).toBe(false); expect(db.findAccount).not.toHaveBeenCalled(); expect(db.register).not.toHaveBeenCalled();
      }
      for (const value of ['1234567', '12345678', 'a'.repeat(72), 'a'.repeat(73), 'я'.repeat(36), 'я'.repeat(37)]) {
        const valid = value.length >= 8 && Buffer.byteLength(value) <= 72;
        const db = store(); const response = await handler(action, db)(send(JSON.stringify({ email: '  USER@EXAMPLE.ORG  ', password: value })));
        expect(response.status).toBe(!valid ? 422 : action === 'register' ? 200 : 401);
        if (valid && action === 'register') {
          expect(db.register).toHaveBeenCalledOnce(); const [email, hash] = vi.mocked(db.register).mock.calls[0]!;
          expect(email).toBe('user@example.org'); expect(await bcrypt.compare(value, hash)).toBe(true);
        } else if (valid) expect(db.findAccount).toHaveBeenCalledWith('user@example.org');
        else { expect(db.findAccount).not.toHaveBeenCalled(); expect(db.register).not.toHaveBeenCalled(); }
        if (!response.ok) expect(response.headers.has('set-cookie')).toBe(false);
      }
      const db = store(), raw = JSON.stringify({ email: 'user@example.org', password: '12345678' });
      const forbidden = send(raw, { origin: 'https://foreign.invalid' }), forbiddenReader = vi.spyOn(forbidden.body!, 'getReader');
      expect((await handler(action, db)(forbidden)).status).toBe(403); expect(forbiddenReader).not.toHaveBeenCalled();
      const unavailable = send(raw), unavailableReader = vi.spyOn(unavailable.body!, 'getReader');
      expect((await handler(action, db, async () => { throw new Error('synthetic Redis outage'); })(unavailable)).status).toBe(503);
      expect(unavailableReader).not.toHaveBeenCalled(); expect(db.findAccount).not.toHaveBeenCalled(); expect(db.register).not.toHaveBeenCalled();
    }
  });
  it('inactive and missing duplicate accounts have the same HTTP refusal for every protocol version', async () => {
    for (const status of ['erasing', 'unknown', null, undefined]) for (const version of [undefined, 'unknown', 'outcomes-v1']) {
      const db = store(status === undefined ? null : { id: 'existing', status, password_hash: passwordHash }); vi.mocked(db.register).mockResolvedValue(false);
      const response = await handler('register', db)(request('правильный пароль', version ? { 'X-Clipmkr-Registration': version } : {}));
      expect(response.status).toBe(401); expect(await response.json()).toEqual({ error: 'Неверная почта или пароль' });
      expect(response.headers.has('set-cookie')).toBe(false); expect(db.createSession).not.toHaveBeenCalled();
    }
  });
  it('logout сначала отзывает серверную сессию, затем удаляет cookie', async () => {
    const db = store(); const token = randomBytes(32).toString('base64url');
    const result = await handler('logout', db)(request(undefined, { cookie: `__Host-n5_session=${token}` }));
    expect(db.revoke).toHaveBeenCalledWith(new AuthService(db, secret).tokenHash(token));
    expect(result.headers.get('set-cookie')).toContain('Max-Age=0');
  });
  it('Лимитер исполняется до чтения даже невалидного тела', async () => {
    const req = request(); const getReader = vi.spyOn(req.body!, 'getReader');
    const db = store(); const result = await handler('login', db, async () => false)(req);
    expect(result.status).toBe(429); expect(getReader).not.toHaveBeenCalled(); expect(db.findAccount).not.toHaveBeenCalled();
  });
  it('Отказ Redis закрывает вход до bcrypt/БД', async () => {
    const db = store();
    const result = await handler('login', db, async () => { throw new Error('offline'); })(request());
    expect(result.status).toBe(503); expect(db.findAccount).not.toHaveBeenCalled();
  });
  it('Чужой Origin отклонён', async () => {
    expect((await handler('login', store())(request(undefined, { origin: 'https://other.invalid' }))).status).toBe(403);
  });
  it('Пароль длиннее 72 байт не молча обрезается bcrypt', async () => {
    const db = store(); expect((await handler('register', db)(request('я'.repeat(37)))).status).toBe(422);
    expect(db.register).not.toHaveBeenCalled();
  });
  it('Страж: хэширование физически отделено от соединений и транзакций', () => {
    const check = (logic: string, persistence: string) => {
      expect(persistence).not.toMatch(/\bbcrypt\b/);
      expect(logic).not.toMatch(/\.connect\s*\(|\.query\s*\(|\bBEGIN\b|\bCOMMIT\b/);
      expect(logic.indexOf('await bcrypt.hash')).toBeLessThan(logic.indexOf('await this.store.register'));
      expect(logic.indexOf('await bcrypt.compare')).toBeLessThan(logic.indexOf('await this.store.createSession'));
    };
    const logic = readFileSync('apps/web/src/server/auth.ts', 'utf8');
    const persistence = readFileSync('apps/web/src/server/auth-store.ts', 'utf8');
    check(logic, persistence);
    expect(() => check(logic, persistence + '\n await bcrypt.hash(password, 10)')).toThrow();
  });
  it('IP: не доверяет первому XFF, сохраняет только /24', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.1.1.1, 192.0.2.99, 10.0.0.5, 172.18.0.2' }), 2)).toBe('192.0.2.99');
    expect(ipPrefix('::ffff:192.0.2.99')).toBe('192.0.2.0/24');
    expect(ipPrefix('2001:db8:1234::1')).toBe('2001:db8:1234:0::/64');
    expect(ipPrefix('::1')).toBe('0:0:0:0::/64');
  });
});
