// Фича 30 payments без БД (донор — N6 tests/billing.unit.test.ts, адаптировано): честность режима оплаты и потолок минут
// paid (AC-14, AC-15), действующий план и срок хранения (AC-11), экран возврата (AC-10), адрес после входа, команда
// оператора (AC-13), сеть ЮKassa (AC-5), порядок входа маршрутов оплаты (AC-1, AC-5, AC-6), надпись призыва у paid
// (находка 1 ревью фич 25–29), экраны при выключенной и включённой оплате.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { checkoutAllowedForAccount, loadLimits, loadWebConfig } from '../packages/shared/src/config';
import { PAID_PLAN_DAYS, PAID_PRICE_MINOR, clipExpiry, effectivePlan, formatRubles, loadPaymentsConfig } from '../packages/shared/src/tariff';
import { CTA_FRAME_LABELS, CTA_FRAME_LABELS_PAID, ctaFrameLabel } from '../packages/shared/src/cta';
import { prepareCta } from '../apps/worker/src/render/cta-overlay';
import { parseSetPlanArgs } from '../packages/db/src/ops-set-plan';
import { effectivePlanSql, retentionFromSql } from '../packages/db/src/plan';
import { selectPaymentProvider } from '../apps/web/src/server/payments/config';
import { verifyYooKassaOrigin } from '../apps/web/src/server/payments/origin';
import { PaymentProviderUnavailable, PaymentVerificationError, type PaymentProvider } from '../apps/web/src/server/payments/provider';
import { createCheckoutHandler, createCheckoutStatusHandler, createPaymentWebhookHandler, type BillingDependencies } from '../apps/web/src/server/billing-handler';
import { RETURN_DEADLINE_MS, RETURN_MAX_ATTEMPTS, decideReturnState, safeNextPath } from '../apps/web/src/lib/payment-return';
import { ProInterest } from '../apps/web/src/app/dashboard/ProInterest';
import { environment } from './fixtures/environment';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => '/', redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error('notFound'); } }));
vi.mock('../apps/web/src/app/theme-server', () => ({ requestTheme: async () => 'light' }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'n5_theme=light' }), cookies: async () => ({ get: () => ({ value: 'synthetic-session' }) }) }));

const LIVE = { N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: '123456', YOOKASSA_SECRET_KEY: 'test_secret', YOOKASSA_TEST_MODE: 'true' };

it('public layout keeps TEST payment notices out of landing and auth', async () => {
  const { default: Layout } = await import('../apps/web/src/app/layout');
  const label = 'Тестовый стенд ЮKassa. Реальных списаний нет. Суммы и расчёты в кабинетах — учебные.';
  try {
    for (const [mode, testMode] of [['live', 'true'], ['live', 'false'], ['off', 'true']] as const) {
      for (const [name, value] of Object.entries({ ...LIVE, N5_PAYMENTS_MODE: mode, YOOKASSA_TEST_MODE: testMode })) vi.stubEnv(name, value);
      const html = renderToStaticMarkup(await Layout({ children: createElement('main', null, 'Контент') }));
      expect(html).not.toContain(label);
      expect(html).toContain('<main>Контент</main>');
      expect(html).toContain('data-theme="light"');
    }
  } finally { vi.unstubAllEnvs(); }
});

describe('режим оплаты и потолок минут paid (AC-14, AC-15)', () => {
  it('не задан или off → off, провайдера нет', () => {
    expect(loadPaymentsConfig({})).toEqual({ mode: 'off' });
    expect(loadPaymentsConfig({ N5_PAYMENTS_MODE: 'off' })).toEqual({ mode: 'off' });
    expect(selectPaymentProvider(loadPaymentsConfig({}))).toBeNull();
  });
  it('пусто, пробел и неизвестный режим — отказ с именем переменной, а не «выключено»', () => {
    for (const mode of ['', ' ', 'LIVE', 'on', 'true', 'fake ']) {
      expect(() => loadPaymentsConfig({ N5_PAYMENTS_MODE: mode }), JSON.stringify(mode)).toThrow(/N5_PAYMENTS_MODE/);
    }
  });
  it('fake разрешён вне production и запрещён в production', () => {
    expect(loadPaymentsConfig({ N5_PAYMENTS_MODE: 'fake', NODE_ENV: 'test' })).toEqual({ mode: 'fake' });
    expect(() => loadPaymentsConfig({ N5_PAYMENTS_MODE: 'fake', NODE_ENV: 'production' })).toThrow(/production/);
  });
  it('live без магазина, без ключа или с неявным режимом test — отказ, называющий переменную', () => {
    expect(loadPaymentsConfig(LIVE)).toMatchObject({ mode: 'live', shopId: '123456', testMode: true });
    expect(selectPaymentProvider(loadPaymentsConfig(LIVE))?.name).toBe('yookassa');
    for (const [name, value] of [['YOOKASSA_SHOP_ID', ''], ['YOOKASSA_SHOP_ID', 'shop-1'], ['YOOKASSA_SECRET_KEY', ''], ['YOOKASSA_SECRET_KEY', ' secret'],
      ['YOOKASSA_TEST_MODE', ''], ['YOOKASSA_TEST_MODE', 'yes'], ['YOOKASSA_TEST_MODE', 'TRUE']] as const) {
      expect(() => loadPaymentsConfig({ ...LIVE, [name]: value }), `${name}=${value}`).toThrow(new RegExp(name));
    }
  });
  it('web не стартует с непригодным режимом (preflight читает loadWebConfig)', () => {
    expect(loadWebConfig(environment()).payments).toEqual({ mode: 'off' });
    expect(() => loadWebConfig({ ...environment(), N5_PAYMENTS_MODE: '' })).toThrow(/N5_PAYMENTS_MODE/);
  });
  it('N5_LIMIT_PAID_USER_MINUTES: обязателен, положительное целое, не выше суточного потолка', () => {
    expect(loadLimits(environment()).N5_LIMIT_PAID_USER_MINUTES).toBe(270);
    const env = environment(); delete env.N5_LIMIT_PAID_USER_MINUTES;
    expect(() => loadLimits(env)).toThrow(/N5_LIMIT_PAID_USER_MINUTES отсутствует/);
    for (const bad of ['', '0', '-1', '270.5', ' 270']) expect(() => loadLimits({ ...environment(), N5_LIMIT_PAID_USER_MINUTES: bad }), bad).toThrow(/N5_LIMIT_PAID_USER_MINUTES/);
    expect(loadLimits({ ...environment(), N5_LIMIT_PAID_USER_MINUTES: '600' }).N5_LIMIT_PAID_USER_MINUTES).toBe(600);
    expect(() => loadLimits({ ...environment(), N5_LIMIT_PAID_USER_MINUTES: '601' })).toThrow(/больше суточного N5_LIMIT_GLOBAL_MINUTES/);
  });
});

describe('цена и действующий план (OWN-019, AC-11)', () => {
  it('990 ₽ за 30 дней — константы кода', () => {
    expect([PAID_PRICE_MINOR, PAID_PLAN_DAYS]).toEqual([99_000, 30]);
    expect(formatRubles(99_000)).toBe('990 ₽');
    for (const bad of [0, -100, 1.5, Number.NaN]) expect(() => formatRubles(bad), String(bad)).toThrow();
  });
  const now = new Date('2026-10-01T00:00:00Z');
  it('оплаченный план истекает по сроку ДО прохода сторожа; оператор и старый paid — бессрочно', () => {
    expect(effectivePlan('paid', 'payment', '2026-10-01T00:00:01Z', now)).toBe('paid');
    expect(effectivePlan('paid', 'payment', '2026-10-01T00:00:00Z', now)).toBe('free');
    expect(effectivePlan('paid', 'payment', null, now)).toBe('free');
    expect(effectivePlan('paid', 'operator', null, now)).toBe('paid');
    expect(effectivePlan('paid', 'none', null, now)).toBe('paid');
  });
  it('fail-closed: всё, что не ровно paid, и неизвестный источник — free', () => {
    for (const plan of [null, undefined, '', 'PAID', ' paid', 'premium', 0, 1, true, {}, ['paid']]) {
      expect(effectivePlan(plan, 'operator', null, now), JSON.stringify(plan)).toBe('free');
    }
    for (const source of ['PAYMENT', '', null, 'gift']) expect(effectivePlan('paid', source, '2099-01-01T00:00:00Z', now), String(source)).toBe('free');
  });
  it('SQL-зеркало: сравнение на равенство, срок только у payment, время — параметр или now()', () => {
    expect(effectivePlanSql('a')).toBe("(CASE WHEN (a.owner_unlimited=true AND a.status='active') OR (a.plan='paid' AND (a.plan_source IN ('none','operator') OR (a.plan_source='payment' AND a.plan_paid_until > now())) OR EXISTS (SELECT 1 FROM credit_grant cg WHERE cg.account_id=a.id AND cg.source='payment' AND cg.entitlement_start<=now() AND cg.entitlement_end>now())) THEN 'paid' ELSE 'free' END)");
    expect(effectivePlanSql('a', '$4')).toContain('plan_paid_until > $4');
    expect(() => effectivePlanSql('a; DROP', 'now()')).toThrow(); expect(() => effectivePlanSql('a', 'now() OR true')).toThrow();
    expect(retentionFromSql('v', 'a')).toContain('GREATEST(v.finished_at, a.plan_paid_until, (SELECT max(cg.entitlement_end)');
  });
  it('срок хранения: от готовности, но не раньше конца оплаты; явный expires_at сильнее', () => {
    const finished = new Date('2026-09-01T00:00:00Z');
    const clipId = '11111111-1111-4111-8111-111111111111';
    const expiry = (expiresAt: Date | null, plan: unknown, retentionFrom: Date | null) => clipExpiry({ clipId, expiresAt, plan, retentionFrom });
    expect(expiry(null, 'free', finished)?.toISOString()).toBe('2026-09-04T00:00:00.000Z');
    expect(expiry(null, 'paid', finished)).toBeNull();
    expect(expiry(null, 'free', null)).toBeNull();
    for (const bad of [null, undefined, '', 'PAID', ' paid', 'premium', 0, true]) expect(expiry(null, bad, finished), String(bad)).not.toBeNull();
    const explicit = new Date('2026-09-02T00:00:00Z');
    expect(expiry(explicit, 'paid', finished)).toBe(explicit);
  });
  // BACKLOG §5а (ревью Opus 28.09, находка 2): правило «бесплатный клип = retention_from + 3 сут, витрина — без срока»
  // жило в шести местах, исключение витрины — в двух. Теперь число и исключение — ровно в tariff.ts (TS) и plan.ts (SQL).
  it('срок бесплатного клипа и исключение витрины записаны ровно в одном месте на язык', () => {
    const files: string[] = [];
    const walk = (dir: string) => { for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (!/^(node_modules|dist|\.next)$/.test(entry.name)) walk(path); }
      else if (/\.tsx?$/.test(entry.name)) files.push(path);
    } };
    for (const root of ['apps/web/src', 'apps/worker/src', 'packages/db/src', 'packages/shared/src', 'packages/queue/src', 'packages/s3/src']) walk(root);
    expect(files.length).toBeGreaterThan(50);
    const offenders = (pattern: RegExp) => files.filter(file => pattern.test(readFileSync(file, 'utf8'))).sort();
    // Формула срока: 3 суток любым написанием — только определение константы (72 ч удаления аккаунта — другое правило, erasure.ts).
    expect(offenders(/\b3\s*\*\s*86_?400(_?000)?\b|'72 hours'|interval '3 days?'|\b259_?200(_?000)?\b/))
      .toEqual(['packages/shared/src/tariff.ts']);
    expect(offenders(/FREE_RETENTION_MS/)).toEqual(['packages/db/src/plan.ts', 'packages/shared/src/tariff.ts']);
    // Исключение витрины из срока: TS — clipExpiry, SQL — clipAliveSql. Никаких собственных копий в чтениях и ретенции.
    expect(offenders(/isShowcaseClip\(|SHOWCASE_CLIP_IDS/)).toEqual(['packages/db/src/plan.ts', 'packages/shared/src/showcase.ts', 'packages/shared/src/tariff.ts']);
  });
});

describe('надпись призыва у клипа без метки (находка 1 ревью фич 25–29)', () => {
  it('у paid ни одна надпись не отсылает к ссылке; у free — словарь пути «метка → /c/КОД»', () => {
    for (const label of Object.values(CTA_FRAME_LABELS_PAID)) if (label !== null) expect(label).not.toMatch(/ссылк|ниже|по ссылке/i);
    expect(ctaFrameLabel('subscribe', true)).toBe(CTA_FRAME_LABELS.subscribe);
    expect(ctaFrameLabel('subscribe', false)).toBe('Подписывайтесь на автора');
    expect(ctaFrameLabel('watch_full', false)).toBe('Смотрите полный выпуск');
    expect(ctaFrameLabel('open_link', false)).toBeNull();
  });
  it('пара «paid + призыв» в рендере: текст без ссылки, open_link не рисуется и пишет причину', () => {
    const paid = prepareCta('subscribe', 1080, 1920, 30, false, false)!;
    expect(paid.result.text).toBe('Подписывайтесь на автора');
    expect(paid.filter).not.toMatch(/ссылк|ниже/);
    const free = prepareCta('subscribe', 1080, 1920, 30, false, true)!;
    expect(free.result.text).toBe('Подписывайтесь — ссылка ниже');
    const reasons: string[] = [];
    expect(prepareCta('open_link', 1080, 1920, 30, false, false, r => reasons.push(r))).toBeNull();
    expect(reasons).toEqual(['paid_no_link']);
  });
});

describe('экран возврата: шесть различимых состояний (AC-10)', () => {
  it('успех, отказ, выполняется, не подтверждено, не найдено', () => {
    expect(decideReturnState({ status: 'succeeded', account_plan: 'paid', plan_paid_until: '2026-10-28T00:00:00.000Z' }, 1))
      .toEqual({ kind: 'succeeded', until: '2026-10-28T00:00:00.000Z' });
    expect(decideReturnState({ status: 'canceled' }, 1)).toEqual({ kind: 'failed' });
    expect(decideReturnState({ status: 'pending' }, 3)).toEqual({ kind: 'waiting', attempts: 3 });
    expect(decideReturnState('not_found', 1)).toEqual({ kind: 'not_found' });
  });
  it('оплата прошла, но план сейчас не paid — «не действует», а не «включён»', () => {
    for (const plan of ['free', undefined, 'PAID', null]) expect(decideReturnState({ status: 'succeeded', account_plan: plan }, 1), String(plan)).toEqual({ kind: 'paid_inactive' });
  });
  it('предел по времени и по попыткам: молчание → «не подтверждено», не «отказ»', () => {
    expect(decideReturnState(null, 2, RETURN_DEADLINE_MS - 1)).toEqual({ kind: 'waiting', attempts: 2 });
    expect(decideReturnState(null, 2, RETURN_DEADLINE_MS)).toEqual({ kind: 'unconfirmed' });
    expect(decideReturnState({ status: 'pending' }, RETURN_MAX_ATTEMPTS)).toEqual({ kind: 'unconfirmed' });
    expect(decideReturnState({ status: 'SUCCEEDED' }, 1)).toEqual({ kind: 'waiting', attempts: 1 });
  });
});

describe('адрес после входа, команда оператора, сеть ЮKassa', () => {
  it('next — только /upgrade?from=<закрытый набор>', () => {
    for (const from of ['clip_card', 'partner_dashboard', 'guest_page']) expect(safeNextPath(`/upgrade?from=${from}`)).toBe(`/upgrade?from=${from}`);
    // Ревью, круг 1, находка 3: экран возврата с формы оплаты переживает вход.
    const back = '/upgrade/return?intent=0f8fad5b-d9cb-469f-a165-70867728950e';
    expect(safeNextPath(back)).toBe(back);
    for (const bad of [`${back}&x=1`, '/upgrade/return?intent=unknown', '/upgrade/return?intent=0f8fad5b-d9cb-469f-a165-70867728950e#x', '/upgrade/return']) {
      expect(safeNextPath(bad), bad).toBeNull();
    }
    for (const bad of ['https://evil.example/upgrade?from=clip_card', '//evil.example', '/upgrade?from=pricing', '/upgrade?from=clip_card&x=1', '/dashboard', '', null, ['/upgrade?from=clip_card']]) {
      expect(safeNextPath(bad), JSON.stringify(bad)).toBeNull();
    }
  });
  it('ops:set-plan: почта, план, --by и --reason обязательны; лишнее — отказ', () => {
    expect(parseSetPlanArgs(['a@b.ru', 'paid', '--by', 'ops', '--reason', 'пилот'])).toEqual({ email: 'a@b.ru', plan: 'paid', operator: 'ops', reason: 'пилот' });
    for (const bad of [['a@b.ru', 'paid'], ['a@b.ru', 'paid', '--by', 'ops'], ['a@b.ru', '--by', 'ops', '--reason', 'x'], ['a@b.ru', 'paid', '--by']]) {
      expect(parseSetPlanArgs(bad), bad.join(' ')).toBeNull();
    }
  });
  it('сеть ЮKassa — список в коде; пустой, неизвестный и соседний адрес — отказ', () => {
    expect(verifyYooKassaOrigin('185.71.76.10')).toEqual({ ok: true, ip: '185.71.76.10' });
    expect(verifyYooKassaOrigin('2a02:5180::1')).toMatchObject({ ok: true });
    expect(verifyYooKassaOrigin('185.71.76.100')).toEqual({ ok: false, reason: 'foreign_ip' });
    for (const bad of ['', 'unknown', null, undefined]) expect(verifyYooKassaOrigin(bad as string)).toEqual({ ok: false, reason: 'no_ip' });
  });
});

describe('порядок входа маршрутов оплаты', () => {
  const PUBLIC = 'https://clipmkr.test.invalid';
  const TOKEN = 'A'.repeat(43);
  const XFF = (client: string) => `${client}, 10.0.0.2, 10.0.0.3`;
  const unused: PaymentProvider = { name: 'fake', createPayment: async () => { throw new Error('нет'); }, getPayment: async () => { throw new Error('нет'); },
    verifyNotification: async () => { throw new Error('нет'); } };
  function deps(calls: string[], over: Partial<BillingDependencies> = {}): BillingDependencies {
    const touch = (name: string) => async () => { calls.push(name); throw new Error(`${name} не должен вызываться`); };
    return {
      publicOrigin: PUBLIC, trustedProxyHops: 2, provider: unused, log: () => {}, checkoutAllowed: () => true,
      authenticate: async () => { calls.push('auth'); return { account_id: '11111111-1111-4111-8111-111111111111' }; },
      allowMutation: async () => { calls.push('limit'); return true; }, allowRead: async () => { calls.push('read-limit'); return true; },
      createIntent: touch('intent'), setIntentPayment: touch('set'), readIntent: touch('read'), markCanceled: touch('cancel'),
      applyPayment: touch('apply'), recordRefund: touch('refund'), ...over,
    };
  }
  const post = (url: string, headers: Record<string, string>, payload: unknown) => new Request(`${PUBLIC}${url}`, { method: 'POST',
    headers: { 'x-forwarded-for': XFF('198.51.100.7'), 'content-type': 'application/json', cookie: `__Host-n5_session=${TOKEN}`, ...headers },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  it('AC-1: оплата выключена — оформление, опрос и вебхук отвечают 404, ничего не читая', async () => {
    const calls: string[] = [];
    const off = deps(calls, { provider: null });
    expect((await createCheckoutHandler(off)(post('/api/checkout', { origin: PUBLIC }, { idempotency_key: 'k'.repeat(10) }))).status).toBe(404);
    expect((await createCheckoutStatusHandler(off)(new Request(`${PUBLIC}/api/checkout/x`), 'x')).status).toBe(404);
    expect((await createPaymentWebhookHandler(off)(post('/api/webhooks/yookassa', {}, '{}'))).status).toBe(404);
    expect(calls).toEqual([]);
  });
  it('оформление: лимит → Origin → сессия → тело; чужой Origin 403, без Origin 403, лишнее поле 422 — до намерения', async () => {
    const calls: string[] = [];
    expect((await createCheckoutHandler(deps(calls, { allowMutation: async () => { calls.push('limit'); return false; } }))(post('/api/checkout', { origin: PUBLIC }, {}))).status).toBe(429);
    expect((await createCheckoutHandler(deps(calls))(post('/api/checkout', { origin: 'https://evil.example' }, { idempotency_key: 'k'.repeat(10) }))).status).toBe(403);
    expect((await createCheckoutHandler(deps(calls))(post('/api/checkout', {}, { idempotency_key: 'k'.repeat(10) }))).status).toBe(403);
    expect((await createCheckoutHandler(deps(calls, { authenticate: async () => null }))(post('/api/checkout', { origin: PUBLIC }, { idempotency_key: 'k'.repeat(10) }))).status).toBe(401);
    for (const body of [{ idempotency_key: 'k'.repeat(10), price_minor: 1 }, { plan: 'paid', idempotency_key: 'k'.repeat(10) }, { idempotency_key: 'short' }, 'not json']) {
      expect((await createCheckoutHandler(deps(calls))(post('/api/checkout', { origin: PUBLIC }, body))).status, JSON.stringify(body)).toBe(422);
    }
    expect(calls.filter((c) => !['auth', 'limit'].includes(c))).toEqual([]);
  });
  it('missing required checkout callback fails closed before reading body', async () => {
    const calls: string[] = [];
    const incomplete = deps(calls);
    Reflect.deleteProperty(incomplete, 'checkoutAllowed');
    const request = post('/api/checkout', { origin: PUBLIC }, { idempotency_key: 'repeat-key' });
    expect((await createCheckoutHandler(incomplete)(request)).status).toBe(503);
    expect(request.bodyUsed).toBe(false);
    expect(calls).toEqual(['auth', 'limit']);
  });
  it('AC-5/AC-6 вебхук: адрес вне сетей ЮKassa — 400 ДО провайдера; подделка 400; недоступность 503 — без записи', async () => {
    const seen: string[] = [];
    const provider = (outcome: 'forged' | 'down'): PaymentProvider => ({ ...unused, name: 'yookassa',
      verifyNotification: async () => { seen.push('verify'); throw outcome === 'forged' ? new PaymentVerificationError('подделка') : new PaymentProviderUnavailable('500'); } });
    const hook = (p: PaymentProvider, xff: string) => createPaymentWebhookHandler(deps(seen, { provider: p }))(new Request(`${PUBLIC}/api/webhooks/yookassa`,
      { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': xff }, body: '{"event":"payment.succeeded"}' }));
    expect((await hook(provider('forged'), XFF('203.0.113.9'))).status).toBe(400);
    expect((await hook(provider('forged'), '185.71.76.10')).status).toBe(400); // цепочка короче доверенных хопов
    expect(seen).toEqual([]);
    expect((await hook(provider('forged'), XFF('185.71.76.10'))).status).toBe(400);
    expect((await hook(provider('down'), XFF('185.71.76.10'))).status).toBe(503);
    expect(seen).toEqual(['verify', 'verify']);
  });
});

describe('экраны: выключенная и включённая оплата', () => {
  it('off — прежний экран интереса без платёжных слов; on — ссылка на /upgrade с ценой и экраном-источником', () => {
    const off = renderToStaticMarkup(createElement(ProInterest, { source: 'clip_card' }));
    expect(off).toContain('Нужен тариф побольше'); expect(off).not.toMatch(/upgrade|990|оплат/i);
    const on = renderToStaticMarkup(createElement(ProInterest, { source: 'clip_card', paymentsOn: true }));
    expect(on).toContain('href="/upgrade?from=clip_card"'); expect(on).toContain('990'); expect(on).not.toContain('Нужен тариф побольше');
  });
});

it('compact packages retain canonical amounts, actual TEST marker and per-offer disabled reasons', async () => {
  const { UpgradeScreen } = await import('../apps/web/src/app/upgrade/UpgradeScreen');
  const props = { creditMode: true, catalogOnly: false, salesEnabled: false, title: 'Про', price: '3990 ₽', days: 30, paidMinutes: 270,
    current: { plan: 'free' as const, plan_source: 'default', plan_paid_until: null } };
  const html = renderToStaticMarkup(createElement(UpgradeScreen, props));
  for (const sku of ['start_v1', 'pro_v1', 'addon_v1']) {
    expect(html).toContain(`data-sku="${sku}"`);
    expect(html).toContain(`aria-describedby="offer-reason-${sku}"`);
  }
  expect(html.match(/disabled=""/g)).toHaveLength(3);
  expect(html).not.toContain('TEST');
  expect(renderToStaticMarkup(createElement(UpgradeScreen, { ...props, testMode: true }))).toContain('TEST · Тестовая оплата');
  expect(html).toContain('Продажа новых пакетов временно выключена');
});

it('upgrade guards precede private reads and header uses exactly one existing credit read', async () => {
  vi.resetModules();
  let authenticated = true;
  const readBilling = vi.fn(async () => ({ billing_policy: 'credits_v1', plan: 'free', plan_source: 'default', plan_paid_until: null, owner_unlimited: false }));
  const readBalance = vi.fn(async (_pool: unknown, _accountId: string): Promise<{ available_seconds: number; reserved_seconds: number; next_expiry: null } | null> => ({ available_seconds: 121, reserved_seconds: 0, next_expiry: null }));
  const readWindows = vi.fn(async () => null);
  vi.doMock('@clipmaker/db', () => ({ readAccountBilling: readBilling, readCreditBalance: readBalance, readCreditPurchaseWindows: readWindows }));
  vi.doMock('../apps/web/src/server/runtime', () => ({ getRuntime: () => ({ pool: {}, payments: null,
    config: { sessionSecret: 'synthetic-unit-session-secret-32-chars', billingMode: 'credits_v1', payments: { mode: 'off' }, limits: { N5_LIMIT_PAID_USER_MINUTES: 270 } },
    auth: { authenticate: async () => authenticated ? { account_id: '11111111-1111-4111-8111-111111111111' } : null } }) }));
  vi.doMock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'private-test-session' }) }), headers: async () => new Headers({ cookie: 'n5_theme=light' }) }));
  vi.doMock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); }, useRouter: () => ({ refresh() {}, push() {} }) }));
  try {
    const { default: UpgradePage } = await import('../apps/web/src/app/upgrade/page');
    authenticated = false;
    await expect(UpgradePage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /#auth');
    expect(readBilling).not.toHaveBeenCalled(); expect(readBalance).not.toHaveBeenCalled();
    authenticated = true;
    const html = renderToStaticMarkup(await UpgradePage({ searchParams: Promise.resolve({}) }));
    expect(readBalance).toHaveBeenCalledTimes(1); expect(readWindows).toHaveBeenCalledTimes(1);
    expect(readBalance.mock.calls[0]?.[1]).toBe('11111111-1111-4111-8111-111111111111');
    expect(html).toContain('2,02 кредитов'); expect(html).not.toContain('TEST');
    readBalance.mockResolvedValueOnce(null);
    const unavailable = renderToStaticMarkup(await UpgradePage({ searchParams: Promise.resolve({}) }));
    expect(unavailable).toContain('Баланс недоступен'); expect(unavailable).not.toContain('Баланс <strong>0');
  } finally {
    for (const name of ['@clipmaker/db', '../apps/web/src/server/runtime', 'next/headers', 'next/navigation']) vi.doUnmock(name);
    vi.resetModules();
  }
});


const TEST_ACCOUNT_A = '00000000-0000-4000-8000-000000000001';
const TEST_ACCOUNT_B = '00000000-0000-4000-8000-000000000002';
function testCheckoutEnvironment() {
  return { ...environment(), N5_BILLING_MODE: 'credits_v1', N5_CHECKOUT_ENABLED: 'false',
    N5_TEST_CHECKOUT_ACCOUNT_ID: TEST_ACCOUNT_A, N5_PAYMENTS_MODE: 'live',
    YOOKASSA_SHOP_ID: '123456', YOOKASSA_SECRET_KEY: 'test_secret_key', YOOKASSA_TEST_MODE: 'true' };
}
it('test checkout account config absent empty invalid and multiple values', () => {
  for (const value of [undefined, '']) {
    const env: NodeJS.ProcessEnv = { ...testCheckoutEnvironment() };
    if (value === undefined) delete env.N5_TEST_CHECKOUT_ACCOUNT_ID; else env.N5_TEST_CHECKOUT_ACCOUNT_ID = value;
    const config = loadWebConfig(env);
    expect(config.testCheckoutAccountId).toBeNull();
    expect(checkoutAllowedForAccount(config, TEST_ACCOUNT_A, 'credits_v1', true)).toBe(false);
  }
  for (const value of [' ', '\t', ` ${TEST_ACCOUNT_A}`, `${TEST_ACCOUNT_A} `, `${TEST_ACCOUNT_A}\n`,
    'ABCDEF00-0000-4000-8000-000000000001', 'owner@example.invalid', '*', `${TEST_ACCOUNT_A},${TEST_ACCOUNT_B}`,
    JSON.stringify([TEST_ACCOUNT_A]), '00000000000040008000000000000001']) {
    let message = '';
    try { loadWebConfig({ ...testCheckoutEnvironment(), N5_TEST_CHECKOUT_ACCOUNT_ID: value }); }
    catch (error) { message = (error as Error).message; }
    expect(message).toContain('N5_TEST_CHECKOUT_ACCOUNT_ID');
    expect(message).toBe('N5_TEST_CHECKOUT_ACCOUNT_ID: нужен один canonical lowercase UUID без пробелов');
  }
  expect(loadWebConfig(testCheckoutEnvironment()).testCheckoutAccountId).toBe(TEST_ACCOUNT_A);
});
it('test checkout exception rejects live and contradictory config', () => {
  for (const delta of [{ N5_CHECKOUT_ENABLED: 'true' }, { N5_BILLING_MODE: 'legacy' },
    { N5_PAYMENTS_MODE: 'off' }, { N5_PAYMENTS_MODE: 'fake' }, { YOOKASSA_TEST_MODE: 'false' },
    { YOOKASSA_SECRET_KEY: 'live_synthetic' }, { YOOKASSA_SECRET_KEY: 'test_' }]) {
    expect(() => loadWebConfig({ ...testCheckoutEnvironment(), ...delta }), JSON.stringify(delta)).toThrow('N5_TEST_CHECKOUT_ACCOUNT_ID');
  }
  // Обычный режим без исключения сохраняет прежнюю трактовку driver/key.
  const global = loadWebConfig({ ...testCheckoutEnvironment(), N5_TEST_CHECKOUT_ACCOUNT_ID: '',
    N5_CHECKOUT_ENABLED: 'true', YOOKASSA_TEST_MODE: 'false', YOOKASSA_SECRET_KEY: 'live_synthetic' });
  expect(checkoutAllowedForAccount(global, TEST_ACCOUNT_B, 'legacy_daily_v1', true)).toBe(true);
});
it('test checkout policy allows only exact test session account', () => {
  const config = loadWebConfig(testCheckoutEnvironment());
  expect(checkoutAllowedForAccount(config, TEST_ACCOUNT_A, 'credits_v1', true)).toBe(true);
  for (const id of [TEST_ACCOUNT_B, null, undefined, '', ` ${TEST_ACCOUNT_A}`, TEST_ACCOUNT_A.toUpperCase().replace('4000', '4ABC')]) {
    expect(checkoutAllowedForAccount(config, id, 'credits_v1', true)).toBe(false);
  }
  expect(checkoutAllowedForAccount(config, TEST_ACCOUNT_A, 'credits_v1', false)).toBe(false);
  for (const policy of ['legacy_daily_v1', null, undefined, 'CREDITS_V1']) expect(checkoutAllowedForAccount(config, TEST_ACCOUNT_A, policy, true)).toBe(false);
  for (const payments of [{ mode: 'off' as const }, { mode: 'fake' as const },
    { mode: 'live' as const, shopId: '123456', secretKey: 'test_secret_key', testMode: false },
    { mode: 'live' as const, shopId: '123456', secretKey: 'live_synthetic', testMode: true }]) {
    expect(checkoutAllowedForAccount({ ...config, payments }, TEST_ACCOUNT_A, 'credits_v1', true)).toBe(false);
  }
  expect(checkoutAllowedForAccount({ ...config, billingMode: 'legacy' }, TEST_ACCOUNT_A, 'credits_v1', true)).toBe(false);
});

it('test checkout SSR and POST agree for allowed and other sessions', async () => {
  vi.resetModules();
  let accountId: string | null = TEST_ACCOUNT_A;
  let config = loadWebConfig(testCheckoutEnvironment());
  let ready = true;
  const windows = { asOf: '2030-01-01T00:00:00Z', baseStart: '2030-01-01T00:00:00Z', baseEnd: '2030-01-31T00:00:00Z',
    addonStart: '2030-01-01T00:00:00Z', addonEnd: '2030-01-31T00:00:00Z', scheduled: false };
  vi.doMock('@clipmaker/db', () => ({
    readAccountBilling: async () => ({ billing_policy: 'credits_v1', plan: 'free', plan_source: 'none', plan_paid_until: null, owner_unlimited: false }),
    readCreditBalance: async () => ({ available_seconds: 0 }), readCreditPurchaseWindows: async () => windows,
  }));
  vi.doMock('../apps/web/src/server/runtime', () => ({ getRuntime: () => ({ pool: {}, payments: ready ? {} : null, config,
    auth: { authenticate: async () => accountId ? { account_id: accountId } : null } }) }));
  vi.doMock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'private-test-session' }) }), headers: async () => new Headers() }));
  vi.doMock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`REDIRECT ${path}`); }, useRouter: () => ({ refresh() {}, push() {} }) }));
  const provider: PaymentProvider = { name: 'yookassa', createPayment: vi.fn(), getPayment: vi.fn(), verifyNotification: vi.fn() };
  const deps = { publicOrigin: 'https://test.invalid', trustedProxyHops: 1, provider,
    authenticate: async () => accountId ? { account_id: accountId } : null, allowMutation: async () => true,
    billingPolicy: async () => 'credits_v1', checkoutAllowed: (id: string, policy: string | null) => checkoutAllowedForAccount(config, id, policy, ready),
    log: () => {}, createIntent: vi.fn() } as unknown as BillingDependencies;
  try {
    const { default: Page } = await import('../apps/web/src/app/upgrade/page');
    for (const state of ['allowed', 'other', 'revoked', 'provider-off'] as const) {
      accountId = state === 'other' ? TEST_ACCOUNT_B : TEST_ACCOUNT_A;
      config = loadWebConfig({ ...testCheckoutEnvironment(), N5_TEST_CHECKOUT_ACCOUNT_ID: state === 'revoked' ? '' : TEST_ACCOUNT_A });
      ready = state !== 'provider-off';
      const tree = await Page({ searchParams: Promise.resolve({}) });
      const html = renderToStaticMarkup(tree);
      const buttons = [...html.matchAll(/<section\b[^>]*data-sku=[^>]*>[\s\S]*?<button\b([^>]*)>/g)].map(match => match[1]!);
      expect(buttons).toHaveLength(3);
      expect(buttons.filter(b => b.includes('disabled=""'))).toHaveLength(state === 'allowed' ? 0 : 3);
      expect(html).toContain('TEST · Тестовая оплата');
      for (const privateValue of [TEST_ACCOUNT_A, TEST_ACCOUNT_B, 'test_secret_key']) expect(html).not.toContain(privateValue);
      const request = new Request('https://test.invalid/api/checkout', { method: 'POST', body: 'invalid-json', headers: {
        origin: 'https://test.invalid', 'content-type': 'application/json', cookie: '__Host-n5_session=' + 'a'.repeat(43), 'x-forwarded-for': '198.51.100.1, 127.0.0.1' } });
      expect((await createCheckoutHandler(deps)(request)).status).toBe(state === 'allowed' ? 422 : 503);
      expect(request.bodyUsed).toBe(state === 'allowed');
    }
    accountId = null;
    await expect(Page({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /#auth');
    expect(deps.createIntent).not.toHaveBeenCalled(); expect(provider.createPayment).not.toHaveBeenCalled();
  } finally {
    for (const name of ['@clipmaker/db', '../apps/web/src/server/runtime', 'next/headers', 'next/navigation']) vi.doUnmock(name);
    vi.resetModules();
  }
});
it('financial pages label only TEST calculations before panels and preserve account badge and role guards', async () => {
  vi.resetModules();
  vi.doMock('next/headers', () => ({ headers: async () => new Headers({ cookie: 'n5_theme=light' }), cookies: async () => ({ get: () => ({ value: 'synthetic-session' }) }) }));
  vi.doMock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => '/', redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error('notFound'); } }));
  const config = { sessionSecret: 'synthetic-test-notice-secret', publicOrigin: 'https://example.invalid', payments: { mode: 'live', testMode: true } };
  const account = '00000000-0000-4000-8000-000000000001';
  const authenticate = vi.fn().mockResolvedValue({ account_id: account });
  const policy = vi.fn().mockResolvedValue({ is_blogger: true });
  const owner = vi.fn().mockResolvedValue(true);
  vi.doMock('../apps/web/src/server/page-account', () => ({ pageAccount: async () => account }));
  vi.doMock('../apps/web/src/server/screen-runtime', () => ({ getScreenRuntime: () => ({ config, pool: {} }) }));
  vi.doMock('../apps/web/src/server/runtime', () => ({ getRuntime: () => ({ config, pool: {}, auth: { authenticate } }) }));
  vi.doMock('@clipmaker/db', async (original) => ({ ...await original<object>(), getBloggerPolicy: policy, hasOwnerUnlimited: owner, readAccountBilling: async () => null }));
  vi.doMock('../apps/web/src/app/dashboard/PartnerPanel', () => ({ PartnerPanel: () => createElement('div', { 'data-panel': 'partner' }, 'Выручка до комиссии') }));
  vi.doMock('../apps/web/src/app/dashboard/bloggers/BloggerAdmin', () => ({ default: () => createElement('div', { 'data-panel': 'owner' }, 'Выручка пакетов') }));
  vi.doMock('../apps/web/src/server/support/page-state', () => ({ supportPageState: async () => ({ account: null, mailAvailable: false }) }));
  vi.doMock('../apps/web/src/server/dashboard-summary', () => ({ readDashboardSummary: async () => null }));
  vi.doMock('../apps/web/src/app/dashboard/LimitsPanel', () => ({ LimitsPanel: () => createElement('div', null, 'Баланс') }));
  const modules = ['next/headers', 'next/navigation', '../apps/web/src/server/page-account', '../apps/web/src/server/screen-runtime', '../apps/web/src/server/runtime', '@clipmaker/db', '../apps/web/src/app/dashboard/PartnerPanel', '../apps/web/src/app/dashboard/bloggers/BloggerAdmin', '../apps/web/src/server/support/page-state', '../apps/web/src/server/dashboard-summary', '../apps/web/src/app/dashboard/LimitsPanel'];
  try {
    const { default: PartnerPage } = await import('../apps/web/src/app/dashboard/partner/page');
    const { default: OwnerPage } = await import('../apps/web/src/app/dashboard/bloggers/page');
    const { default: AccountPage } = await import('../apps/web/src/app/dashboard/account/page');
    const notice = 'TEST · Тестовые платежи. Реальных списаний нет. Выручка и расчёты — учебные.';
    for (const [mode, testMode, visible] of [['live', true, true], ['live', false, false], ['off', false, false], ['off', true, false]] as const) {
      config.payments = { mode, testMode };
      for (const [page, panel] of [[PartnerPage, 'partner'], [OwnerPage, 'owner']] as const) {
        const html = renderToStaticMarkup(await page());
        expect(html.includes(notice), `${panel}:${mode}:${testMode}`).toBe(visible);
        expect(html).toContain(`data-panel="${panel}"`);
        if (visible) {
          expect(html.indexOf(notice)).toBeLessThan(html.indexOf(`data-panel="${panel}"`));
          expect(html).toContain('<p role="status" class="workspace-test">');
        }
      }
      const accountHtml = renderToStaticMarkup(await AccountPage());
      expect(accountHtml.includes('TEST · Тестовая оплата')).toBe(visible);
    }
    policy.mockResolvedValue({ is_blogger: false });
    await expect(PartnerPage()).rejects.toThrow('notFound');
    authenticate.mockResolvedValue(null);
    await expect(OwnerPage()).rejects.toThrow('redirect:/');
    authenticate.mockResolvedValue({ account_id: account }); owner.mockResolvedValue(false);
    await expect(OwnerPage()).rejects.toThrow('redirect:/dashboard');
  } finally { for (const name of modules) vi.doUnmock(name); vi.resetModules(); }
});
it('legacy dashboard revenue stays contextually labelled only in TEST', async () => {
  vi.resetModules();
  const config = { sessionSecret: 'synthetic-legacy-notice-secret', publicOrigin: 'https://example.invalid', payments: { mode: 'live', testMode: true } };
  const policy = vi.fn().mockResolvedValue({ is_blogger: false });
  const notice = 'TEST · Тестовые платежи. Реальных списаний нет. Выручка и расчёты — учебные.';
  vi.doMock('../apps/web/src/server/page-account', () => ({ pageAccount: async () => '00000000-0000-4000-8000-000000000001' }));
  vi.doMock('../apps/web/src/server/erasure-page', () => ({ erasurePageState: async () => false }));
  vi.doMock('../apps/web/src/server/screen-runtime', () => ({ getScreenRuntime: () => ({ config, pool: {}, screen: { list: async () => ({ videos: [], next_cursor: null }) } }) }));
  vi.doMock('../apps/web/src/server/dashboard-summary', () => ({ readDashboardSummary: async () => ({ credits: null, owner_unlimited: false, max_source_seconds: 5400 }) }));
  vi.doMock('@clipmaker/db', () => ({ getBloggerPolicy: policy }));
  vi.doMock('../apps/web/src/app/dashboard/PartnerPanel', () => ({ PartnerPanel: ({ presentation }: { presentation?: string }) => createElement('div', { 'data-panel': presentation === 'summary' ? 'summary' : 'legacy' }, presentation === 'summary' ? 'Ваша ссылка' : 'Выручка до комиссии') }));
  vi.doMock('../apps/web/src/app/videos/VideoList', () => ({ VideoList: () => createElement('div', null, 'Записи') }));
  vi.doMock('../apps/web/src/app/upload/Uploader', () => ({ VideoUploader: () => createElement('div', null, 'Загрузка') }));
  const modules = ['../apps/web/src/server/page-account', '../apps/web/src/server/erasure-page', '../apps/web/src/server/screen-runtime', '../apps/web/src/server/dashboard-summary', '@clipmaker/db', '../apps/web/src/app/dashboard/PartnerPanel', '../apps/web/src/app/videos/VideoList', '../apps/web/src/app/upload/Uploader'];
  try {
    const { default: Dashboard } = await import('../apps/web/src/app/dashboard/page');
    for (const [mode, testMode, visible] of [['live', true, true], ['live', false, false], ['off', false, false], ['off', true, false]] as const) {
      config.payments = { mode, testMode };
      policy.mockResolvedValue({ is_blogger: false });
      const html = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
      const details = html.match(/<details><summary>Партнёрская программа<\/summary>([\s\S]*?)<\/details>/)?.[1];
      expect(details).toBeDefined();
      expect(details).toContain('data-panel="legacy"');
      expect(html.includes(notice)).toBe(visible);
      expect(details!.includes(notice)).toBe(visible);
      if (visible) expect(details!.indexOf(notice)).toBeLessThan(details!.indexOf('data-panel="legacy"'));
      policy.mockResolvedValue({ is_blogger: true });
      const personalHtml = renderToStaticMarkup(await Dashboard({ searchParams: Promise.resolve({}) }));
      expect(personalHtml).toContain('data-panel="summary"');
      expect(personalHtml).not.toContain('data-panel="legacy"');
      expect(personalHtml).not.toContain(notice);
    }
  } finally { for (const name of modules) vi.doUnmock(name); vi.resetModules(); }
});
