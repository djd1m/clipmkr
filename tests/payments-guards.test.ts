// Фича 30 payments — стражи по исходнику (слой 1): AC-16 заменяет страж ADR-005 «маршрутов оплаты нет».
// Каждый страж испытан мутацией: tests/run-payments-mutations.mjs (квитанция docs/features/payments/07_code_report.md).
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { createGuestPageHandler } from '../apps/web/src/server/guest-page';

const SRC = ['apps', 'packages'];
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (/^(node_modules|dist|\.next|migrations)$/.test(name)) return [];
    return statSync(full).isDirectory() ? files(full) : /\.(ts|tsx|mjs|js)$/.test(name) ? [full] : [];
  });
}
function routes(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? routes(path.join(dir, entry.name))
    : /^(route|page)\.(ts|tsx|js|jsx)$/.test(entry.name) ? [path.join(dir, entry.name)] : []);
}
/** Каждый оператор `UPDATE account SET …`, чей список присваиваний (до WHERE) меняет колонку plan. */
export function planWriters(roots: readonly string[] = SRC): string[] {
  return roots.flatMap(files).flatMap((file) => {
    const code = readFileSync(file, 'utf8');
    return [...code.matchAll(/UPDATE\s+account\s+SET\s([\s\S]*?)\bWHERE\b/gi)]
      .filter((m) => /(^|[\s,])plan\s*=/.test(m[1]!)).map(() => file.split(path.sep).join('/'));
  }).sort();
}

describe('AC-16: ровно два вебхука, два маршрута оформления, три пути смены плана', () => {
  it('в дереве маршрутов оплаты ровно: вебхук ЮKassa, оформление, опрос, два экрана', () => {
    expect(routes('apps/web/src/app').filter(p => /yookassa|webhooks|payments|checkout|billing|upgrade/i.test(p)).map(p => p.split(path.sep).join('/')).sort()).toEqual([
      'apps/web/src/app/api/checkout/[intentId]/route.ts',
      'apps/web/src/app/api/checkout/route.ts',
      'apps/web/src/app/api/webhooks/yookassa-test/route.ts',
      'apps/web/src/app/api/webhooks/yookassa/route.ts',
      'apps/web/src/app/upgrade/page.tsx',
      'apps/web/src/app/upgrade/return/page.tsx',
    ]);
    expect(readdirSync('apps/web/src/app/api/webhooks').sort()).toEqual(['yookassa', 'yookassa-test']);
    expect(readFileSync('apps/web/next.config.ts', 'utf8')).not.toMatch(/yookassa|webhooks|checkout|rewrites|redirects/i);
  });
  it('план аккаунта меняют ровно три оператора: оплата (grantPaidPlan), сторож (expirePaidPlans), оператор (setPlanByOperator)', () => {
    expect(planWriters()).toEqual(['packages/db/src/ops-set-plan.ts', 'packages/db/src/payments.ts', 'packages/db/src/payments.ts']);
    const payments = readFileSync('packages/db/src/payments.ts', 'utf8');
    expect(payments).toMatch(/async function grantPaidPlan[\s\S]*?UPDATE account SET plan = 'paid'/);
    expect(payments).toMatch(/export async function expirePaidPlans[\s\S]*?UPDATE account SET plan = 'free'/);
  });
  it('страж видит четвёртый путь, записанный иначе (присваивание не первым, без пробелов)', () => {
    const fake = "tx.query(`UPDATE account SET updated_at=now(),plan='paid' WHERE id=$1`)";
    expect([...fake.matchAll(/UPDATE\s+account\s+SET\s([\s\S]*?)\bWHERE\b/gi)].filter(m => /(^|[\s,])plan\s*=/.test(m[1]!))).toHaveLength(1);
    expect([..."UPDATE account SET plan_source='none' WHERE".matchAll(/UPDATE\s+account\s+SET\s([\s\S]*?)\bWHERE\b/gi)]
      .filter(m => /(^|[\s,])plan\s*=/.test(m[1]!))).toHaveLength(0);
  });
});

describe('порядок операций вебхука (security-operation-order) — по исходнику', () => {
  const handler = readFileSync('apps/web/src/server/billing-handler.ts', 'utf8');
  const hook = handler.slice(handler.indexOf('export function createPaymentWebhookHandler'));
  it('режим → сырые байты → адрес источника → сеть ЮKassa → перезапрос → запись', () => {
    const order = ['if (!provider) return notFound()', 'readRawBody(request, MAX_NOTIFICATION_BYTES)', 'clientIp(request.headers, deps.trustedProxyHops)',
      'verifyYooKassaOrigin(sourceIp)', 'provider.verifyNotification(', 'deps.recordRefund(', 'deps.applyPayment('].map(s => hook.indexOf(s));
    expect(order.every(i => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('в маршрутах оплаты нет транзакций: сеть ЮKassa никогда не держит соединение пула', () => {
    expect(handler).not.toMatch(/transaction\(|BEGIN|pool\.connect/);
  });
  it('внутри транзакции оплаты: ключ повторности ПЕРВЫМ, затем блокировка платежа; сетевых вызовов нет', () => {
    const db = readFileSync('packages/db/src/payments.ts', 'utf8');
    for (const fn of ['export function applyVerifiedPayment', 'export function recordVerifiedRefund']) {
      const body = db.slice(db.indexOf(fn), db.indexOf('\n}\n', db.indexOf(fn)));
      expect(body.indexOf('claimEvent(')).toBeGreaterThan(0);
      expect(body.indexOf('claimEvent(')).toBeLessThan(body.indexOf('lockPayment('));
      expect(body).not.toMatch(/fetch\(|getPayment|verifyNotification/);
    }
    expect(db).toMatch(/GREATEST\(COALESCE\(plan_paid_until, now\(\)\), now\(\)\) \+ make_interval\(days => \$2\)/);
  });
  it('списание минут читает план БЕЗ блокировки строки аккаунта (ревью, круг 1, находка 2: probe держит video, удаление — account → video)', () => {
    const quota = readFileSync('packages/db/src/quota.ts', 'utf8');
    const read = quota.slice(quota.indexOf("scope === 'user_minutes' && (await tx.query"), quota.indexOf('const args = [scope'));
    expect(read).toContain('effectivePlanSql');
    expect(read).not.toMatch(/FOR\s+(SHARE|UPDATE|NO\s+KEY|KEY)/i);
  });
  it('недоступность ЮKassa — исключение, а не возвращаемое значение (урок N1)', () => {
    const code = readFileSync('apps/web/src/server/payments/yookassa.ts', 'utf8');
    expect(code).toMatch(/if \(!response\.ok\) throw new PaymentProviderUnavailable/);
    expect(code).not.toMatch(/return\s+\{[^}]*unavailable/i);
  });
});

describe('конфигурация стенда (AC-14)', () => {
  const compose = readFileSync('docker-compose.yml', 'utf8');
  it('compose подставляет off ТОЛЬКО для незаданной переменной — явно пустая доходит до preflight', () => {
    expect(compose).toContain('N5_PAYMENTS_MODE: ${N5_PAYMENTS_MODE-off}');
    expect(compose).not.toMatch(/N5_PAYMENTS_MODE:-/);
  });
  it('ключи магазина — только у web; потолок минут paid — обязательный ${…:?} для всех, кто списывает минуты', () => {
    expect(compose.match(/^\s+YOOKASSA_SECRET_KEY:/gm)).toHaveLength(1);
    const web = compose.slice(compose.indexOf('  web:'), compose.indexOf('  worker-stt:'));
    expect(web).toContain('YOOKASSA_SECRET_KEY: ${YOOKASSA_SECRET_KEY-}');
    expect(compose).toMatch(/N5_LIMIT_PAID_USER_MINUTES: \$\{N5_LIMIT_PAID_USER_MINUTES:\?/);
  });
});

describe('гостевая страница при включённой оплате', () => {
  it('ссылка на /upgrade без скрипта интереса; при off — прежний блок интереса', async () => {
    const pack = { id: 'p', code: 'c'.repeat(32), account_id: 'owner', guest_name: 'Анна', partner_code: null, expires_at: new Date('2026-10-10T00:00:00Z'),
      clips: [{ clip_id: 'c1', title: 'Клип', available: true }] };
    const page = async (paymentsOn?: boolean) => (await createGuestPageHandler({ referralSecret: 's', trustedProxyHops: 1, paymentsOn,
      auth: { authenticate: vi.fn().mockResolvedValue(null) }, allowRead: vi.fn().mockResolvedValue(true),
      guests: { find: vi.fn().mockResolvedValue(pack), recordOpen: vi.fn() } as never })(new Request('https://x.test/g/c', { headers: { 'x-forwarded-for': '192.0.2.1, 127.0.0.1' } }), pack.code)).text();
    const on = await page(true), off = await page();
    expect(on).toContain('href="/upgrade?from=guest_page"'); expect(on).not.toContain('pro-interest');
    expect(on).toContain("getElementById('download-all')");
    // Ревью, круг 1, находка 1: массовое скачивание берёт только ссылки клипов, а не ссылку тарифа с тем же классом.
    expect(on).toContain("querySelectorAll('.clips a[download]')");
    expect(on).not.toContain("querySelectorAll('a.download')");
    expect(on.match(/<a class="download" href="\/upgrade/g)).toHaveLength(1);
    expect(off).toContain('id="pro-interest"'); expect(off).not.toContain('/upgrade');
  });
});

it('pauses checkout creation while webhook and status remain live', async () => {
  const { createCheckoutHandler, createCheckoutStatusHandler, createPaymentWebhookHandler } = await import('../apps/web/src/server/billing-handler');
  const createIntent = vi.fn(), createPayment = vi.fn();
  const provider = { name: 'fake', createPayment, getPayment: vi.fn(), verifyNotification: vi.fn().mockResolvedValue({ kind: 'ignored' }) };
  const deps = { checkoutAllowed: () => false, publicOrigin: 'https://clipmkr.test', trustedProxyHops: 1,
    provider, authenticate: vi.fn().mockResolvedValue({ account_id: 'account' }), allowMutation: vi.fn().mockResolvedValue(true),
    allowRead: vi.fn().mockResolvedValue(true), createIntent, setIntentPayment: vi.fn(), markCanceled: vi.fn(),
    readIntent: vi.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000000', status: 'succeeded', account_plan: 'free', plan_source: 'none', plan_paid_until: null }),
    applyPayment: vi.fn(), recordRefund: vi.fn(), log: vi.fn() } as unknown as import('../apps/web/src/server/billing-handler').BillingDependencies;
  const headers = { origin: 'https://clipmkr.test', cookie: '__Host-n5_session=' + 'a'.repeat(43), 'x-forwarded-for': '198.51.100.7, 127.0.0.1', 'content-type': 'application/json' };
  for (const body of ['not-json', '{"idempotency_key":"repeat-key"}']) {
    const request = new Request('https://clipmkr.test/api/checkout', { method: 'POST', headers, body });
    expect((await createCheckoutHandler(deps)(request)).status).toBe(503);
    expect(request.bodyUsed).toBe(false);
  }
  expect(createIntent).not.toHaveBeenCalled(); expect(createPayment).not.toHaveBeenCalled();
  expect((await createCheckoutHandler(deps)(new Request('https://clipmkr.test/api/checkout', { method: 'POST', headers: { ...headers, origin: 'https://foreign.test' }, body: '{}' }))).status).toBe(403);
  const id = '00000000-0000-4000-8000-000000000000';
  expect((await createCheckoutStatusHandler(deps)(new Request('https://clipmkr.test/api/checkout/' + id, { headers }), id)).status).toBe(200);
  const hook = new Request('https://clipmkr.test/api/webhooks/yookassa', { method: 'POST', headers: { 'x-forwarded-for': '185.71.76.10, 127.0.0.1' }, body: '{}' });
  expect((await createPaymentWebhookHandler(deps)(hook)).status).toBe(200);
  expect(provider.verifyNotification).toHaveBeenCalledOnce();
});

it('test checkout environment reaches validated web policy without exposing values', async () => {
  const { environment } = await import('./fixtures/environment');
  const { readEnvironment } = await import('../apps/web/src/server/environment');
  const { loadWebConfig, checkoutAllowedForAccount } = await import('../packages/shared/src/config');
  const accountId = '00000000-0000-4000-8000-000000000001';
  const env = { ...environment(), N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false',
    N5_TEST_CHECKOUT_ACCOUNT_ID: accountId, N5_PAYMENTS_MODE: 'live',
    YOOKASSA_SHOP_ID: '123456', YOOKASSA_SECRET_KEY: 'test_secret_key', YOOKASSA_TEST_MODE: 'true' };
  try {
    for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
    const config = loadWebConfig(readEnvironment());
    expect(config.testCheckoutAccountId).toBe(accountId);
    expect(checkoutAllowedForAccount(config, accountId, 'credits_v1', true)).toBe(true);
    vi.stubEnv('N5_TEST_CHECKOUT_ACCOUNT_ID', ' private-invalid-identity ');
    expect(() => loadWebConfig(readEnvironment())).toThrow('N5_TEST_CHECKOUT_ACCOUNT_ID');
    try { loadWebConfig(readEnvironment()); } catch (error) {
      expect((error as Error).message).not.toContain('private-invalid-identity');
      expect((error as Error).message).not.toContain(env.YOOKASSA_SECRET_KEY);
    }
  } finally { vi.unstubAllEnvs(); }
});

it('runtime forwards required checkout policy without permissive fallback', async () => {
  vi.resetModules();
  const { environment } = await import('./fixtures/environment');
  const { loadWebConfig } = await import('../packages/shared/src/config');
  const { selectPaymentProvider } = await import('../apps/web/src/server/payments/config');
  const account = '00000000-0000-4000-8000-000000000001';
  const config = loadWebConfig({ ...environment(), N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false',
    N5_TEST_CHECKOUT_ACCOUNT_ID: account, N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: '123456',
    YOOKASSA_SECRET_KEY: 'test_secret_key', YOOKASSA_TEST_MODE: 'true' });
  const global = globalThis as typeof globalThis & { n5Billing?: unknown };
  delete global.n5Billing;
  vi.doMock('../apps/web/src/server/runtime', () => ({ getRuntime: () => ({ config, pool: {}, redis: {},
    auth: { authenticate: async () => null }, payments: selectPaymentProvider(config.payments) }) }));
  try {
    const { getBillingDependencies } = await import('../apps/web/src/server/billing-runtime');
    const deps = getBillingDependencies();
    expect(deps.checkoutAllowed(account, 'credits_v1')).toBe(true);
    expect(deps.checkoutAllowed('00000000-0000-4000-8000-000000000002', 'credits_v1')).toBe(false);
    expect(deps.checkoutAllowed(account, 'legacy_daily_v1')).toBe(false);
  } finally { delete global.n5Billing; vi.doUnmock('../apps/web/src/server/runtime'); vi.resetModules(); }
});


it('optional checkout exception remains covered by wiring validation', async () => {
  const { environment } = await import('./fixtures/environment');
  const { checkWiring } = await import('../scripts/check-env-wiring.mjs');
  const config = { services: Object.fromEntries(['web', 'worker-stt', 'worker-llm', 'worker-video'].map(name => [name, { environment: environment() }])) };
  Object.assign(config.services.web!.environment, {
    YOOKASSA_RECEIPT_VAT_CODE: '', YOOKASSA_RECEIPT_PAYMENT_SUBJECT: '', YOOKASSA_RECEIPT_PAYMENT_MODE: '',
  });
  expect(config.services.web!.environment.N5_TEST_CHECKOUT_ACCOUNT_ID).toBe('');
  expect(checkWiring(config)).toEqual([]);
  for (const name of ['YOOKASSA_RECEIPT_VAT_CODE', 'YOOKASSA_RECEIPT_PAYMENT_SUBJECT', 'YOOKASSA_RECEIPT_PAYMENT_MODE']) {
    expect(config.services.web!.environment).toHaveProperty(name, '');
    delete config.services.web!.environment[name];
    expect(checkWiring(config)).toEqual([`web: ${name}`]);
    config.services.web!.environment[name] = '';
    expect(checkWiring(config)).toEqual([]);
  }
  delete config.services.web!.environment.N5_TEST_CHECKOUT_ACCOUNT_ID;
  expect(checkWiring(config)).toEqual(['web: N5_TEST_CHECKOUT_ACCOUNT_ID']);
});
