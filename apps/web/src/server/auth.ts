import bcrypt from 'bcrypt';
import { createHmac, randomBytes } from 'node:crypto';
import { readAccountStatus } from '@clipmaker/shared/enums';

export const BCRYPT_COST = 10;
// Фиктивный bcrypt-хэш не является секретом или паролем аккаунта; стоимость совпадает с регистрацией.
const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
export const LOGIN_FAILURE = { error: 'Неверная почта или пароль' } as const;
export interface AccountCredentials { id: string; password_hash: string; status: unknown }
export interface SessionInput { hash: string; ipPrefix: string; expiresAt: Date }
export interface AuthStore {
  findAccount(email: string): Promise<AccountCredentials | null>;
  register(email: string, passwordHash: string, session: SessionInput): Promise<boolean>;
  createSession(account: AccountCredentials, session: SessionInput): Promise<boolean>;
  revoke(hash: string): Promise<void>;
  findSession(hash: string): Promise<{ account_id: string } | null>;
}
export type RegistrationOutcome = { kind: 'created' | 'existing'; token: string } | { kind: 'conflict' | 'unavailable' };
export class AuthService {
  constructor(private readonly store: AuthStore, private readonly secret: string) {}
  tokenHash(token: string): string { return createHmac('sha256', this.secret).update(token).digest('hex'); }
  private session(ipPrefix: string) {
    const token = randomBytes(32).toString('base64url');
    return { token, record: { hash: this.tokenHash(token), ipPrefix,
      expiresAt: new Date(Date.now() + SESSION_TTL_SECONDS * 1000) } };
  }
  async register(email: string, password: string, ipPrefix: string): Promise<string> {
    const outcome = await this.registerWithOutcome(email, password, ipPrefix);
    if (outcome.kind === 'created' || outcome.kind === 'existing') return outcome.token;
    throw new Error('Registration did not establish a session');
  }
  async registerWithOutcome(email: string, password: string, ipPrefix: string,
    options: { allowExistingLogin: boolean } = { allowExistingLogin: true }): Promise<RegistrationOutcome> {
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const session = this.session(ipPrefix);
    const created = await this.store.register(email, passwordHash, session.record);
    if (created === true) return { kind: 'created', token: session.token };
    if (created !== false) throw new Error('Invalid registration store outcome');
    if (!options.allowExistingLogin) {
      const account = await this.store.findAccount(email);
      return { kind: account && readAccountStatus(account.status) === 'active' ? 'conflict' : 'unavailable' };
    }
    return this.passwordLogin(email, password, ipPrefix);
  }
  private async passwordLogin(email: string, password: string, ipPrefix: string): Promise<RegistrationOutcome> {
    const account = await this.store.findAccount(email); // pool.query отпускает соединение до bcrypt.
    const matches = await bcrypt.compare(password, account?.password_hash ?? DUMMY_HASH);
    if (!account || readAccountStatus(account.status) !== 'active') return { kind: 'unavailable' };
    if (!matches) return { kind: 'conflict' };
    const session = this.session(ipPrefix);
    return await this.store.createSession(account, session.record)
      ? { kind: 'existing', token: session.token } : { kind: 'unavailable' };
  }
  async login(email: string, password: string, ipPrefix: string): Promise<string | null> {
    const result = await this.passwordLogin(email, password, ipPrefix);
    return result.kind === 'existing' ? result.token : null;
  }
  async logout(token: string): Promise<void> { await this.store.revoke(this.tokenHash(token)); }
  async authenticate(token: string) { return this.store.findSession(this.tokenHash(token)); }
}
