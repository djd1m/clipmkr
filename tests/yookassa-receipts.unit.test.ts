import { describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { CREDIT_SKUS, PAID_PRICE_MINOR, loadPaymentReceiptConfig, loadPaymentsConfig, paymentDescription, type ReceiptSnapshot } from '../packages/shared/src/tariff';
import { createYooKassaProvider } from '../apps/web/src/server/payments/yookassa';
import { createCheckoutHandler, type BillingDependencies } from '../apps/web/src/server/billing-handler';
import { PaymentVerificationError } from '../apps/web/src/server/payments/provider';
import { startFakeYooKassa, SHOP_ID, SECRET } from './fixtures/fake-yookassa-server';
const fiscal = { YOOKASSA_RECEIPT_VAT_CODE: '1', YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'service', YOOKASSA_RECEIPT_PAYMENT_MODE: 'full_payment' };
const snapshot: ReceiptSnapshot = { email: 'synthetic-buyer@test.invalid', description: paymentDescription('start_v1'), vatCode: 1, paymentSubject: 'service', paymentMode: 'full_payment' };
describe('YooKassa receipts', () => {
  it('receipt config requires explicit supported fiscal values', () => {
    expect(loadPaymentReceiptConfig({})).toBeUndefined();
    expect(loadPaymentReceiptConfig(Object.fromEntries(Object.keys(fiscal).map(k => [k, ''])))).toBeUndefined();
    for (let mask = 1; mask < 7; mask++) {
      expect(loadPaymentReceiptConfig(Object.fromEntries(Object.entries(fiscal).filter((_, i) => mask & (1 << i))))).toBeNull();
    }
    for (const k of Object.keys(fiscal)) expect(loadPaymentReceiptConfig({ ...fiscal, [k]: ' ' })).toBeNull();
    for (const vat of ['0', '13', '1.1', '01', '+1', '1 ', 'NaN']) expect(loadPaymentReceiptConfig({ ...fiscal, YOOKASSA_RECEIPT_VAT_CODE: vat })).toBeNull();
    for (let vat = 1; vat <= 12; vat++) expect(loadPaymentReceiptConfig({ ...fiscal, YOOKASSA_RECEIPT_VAT_CODE: String(vat) })?.vatCode).toBe(vat);
    expect(loadPaymentReceiptConfig({ ...fiscal, YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'goods' })).toBeNull();
    for (const mode of ['full_prepayment', 'unknown']) expect(loadPaymentReceiptConfig({ ...fiscal, YOOKASSA_RECEIPT_PAYMENT_MODE: mode })).toBeNull();
    expect(loadPaymentReceiptConfig({ ...fiscal, YOOKASSA_RECEIPT_PAYMENT_SUBJECT: 'intellectual_activity' })).toEqual({ vatCode: 1, paymentSubject: 'intellectual_activity', paymentMode: 'full_payment' });
  });
  it('missing receipt config preserves TEST startup and notifications', () => {
    const config = loadPaymentsConfig({ N5_PAYMENTS_MODE: 'live', YOOKASSA_SHOP_ID: SHOP_ID, YOOKASSA_SECRET_KEY: SECRET, YOOKASSA_TEST_MODE: 'true' });
    expect(config).toMatchObject({ mode: 'live', testMode: true });
    expect('receipt' in config && config.receipt).toBeUndefined();
  });
  it('receipt payload uses one exact RUB item for every offer', async () => {
    const yk = await startFakeYooKassa();
    try {
      const seen: Record<string, unknown>[] = [];
      const provider = createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: true, apiBase: yk.apiBase,
        fetchImpl: async (url, init) => { seen.push(JSON.parse(String(init?.body))); return fetch(url, init); } });
      for (const sku of ['start_v1', 'pro_v1', 'addon_v1', 'legacy_pro990_v1'] as const) {
        const description = paymentDescription(sku), receipt = { ...snapshot, description };
        const amountMinor = sku === 'legacy_pro990_v1' ? PAID_PRICE_MINOR : CREDIT_SKUS[sku].priceMinor;
        await provider.createPayment({ orderId: randomUUID(), amountMinor, returnUrl: 'https://test.invalid/return', description, receipt });
        const body = seen.at(-1)!;
        const value = `${Math.floor(amountMinor / 100)}.${String(amountMinor % 100).padStart(2, '0')}`;
        expect(body.amount).toEqual({ value, currency: 'RUB' });
        expect(body.receipt).toEqual({ customer: { email: snapshot.email }, items: [{ description, quantity: '1.000', amount: body.amount,
          vat_code: 1, payment_subject: 'service', payment_mode: 'full_payment' }] });
      }
      expect(yk.created).toBe(4);
    } finally { await yk.close(); }
  });
  it('live provider refuses missing receipt before HTTP', async () => {
    const yk = await startFakeYooKassa({ test: false });
    try {
      const provider = createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: false, apiBase: yk.apiBase });
      const input = { orderId: randomUUID(), amountMinor: 99000, returnUrl: 'https://test.invalid/return', description: snapshot.description };
      await expect(provider.createPayment(input)).rejects.toThrow('receipt_required');
      expect(yk.createKeys).toHaveLength(0);
      await provider.createPayment({ ...input, receipt: snapshot });
      expect(yk.createKeys).toHaveLength(1);
    } finally { await yk.close(); }
  });
  it('receipt validator rejects invalid fields before HTTP with a positive transport control', async () => {
    const yk = await startFakeYooKassa();
    try {
      const provider = createYooKassaProvider({ shopId: SHOP_ID, secretKey: SECRET, testMode: true, apiBase: yk.apiBase });
      const input = { orderId: randomUUID(), amountMinor: 99000, returnUrl: 'https://test.invalid/return', description: snapshot.description };
      for (const change of [{ email: 'private-marker<bad>@test.invalid' }, { email: 'x'.repeat(255) }, { description: '' }, { description: 'x'.repeat(129) },
        { vatCode: 0 }, { vatCode: 13 }, { vatCode: 1.5 }, { paymentSubject: 'goods' }, { paymentMode: 'full_prepayment' }]) {
        await expect(provider.createPayment({ ...input, receipt: { ...snapshot, ...change } as ReceiptSnapshot })).rejects.toThrow(/^receipt\./);
        expect(yk.createKeys).toHaveLength(0);
      }
      await provider.createPayment({ ...input, receipt: { ...snapshot, vatCode: 12, paymentSubject: 'intellectual_activity' } });
      expect(yk.createKeys).toHaveLength(1);
    } finally { await yk.close(); }
  });
  it('receipt failures never expose buyer email or provider secrets', async () => {
    const marker = 'synthetic-private-raw-secret@test.invalid', logs: string[] = [];
    const provider = { name: 'yookassa', createPayment: vi.fn(async () => { throw new PaymentVerificationError(marker); }), getPayment: vi.fn(), verifyNotification: vi.fn() };
    const deps: BillingDependencies = { checkoutAllowed: () => true, publicOrigin: 'https://test.invalid', trustedProxyHops: 1,
      provider, authenticate: async () => ({ account_id: randomUUID() }), allowMutation: async () => true, allowRead: async () => true,
      createIntent: async () => ({ kind: 'created', intent: { id: randomUUID(), price_minor: 99000, status: 'created', provider_payment_id: null, created_at: new Date(), receipt_snapshot: snapshot } }),
      setIntentPayment: async () => true, readIntent: async () => null, markCanceled: async () => {}, applyPayment: vi.fn(), recordRefund: vi.fn(), log: line => logs.push(line) };
    const response = await createCheckoutHandler(deps)(new Request('https://test.invalid/api/checkout', { method: 'POST', headers: { origin: 'https://test.invalid', cookie: '__Host-n5_session=abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG', 'x-forwarded-for': '198.51.100.1,10.0.0.1', 'content-type': 'application/json' }, body: JSON.stringify({ idempotency_key: 'synthetic-key' }) }));
    expect(response.status).toBe(503); expect(provider.createPayment).toHaveBeenCalledOnce();
    expect(await response.text()).not.toContain(marker); expect(logs.join()).not.toContain(marker); expect(logs.length).toBeGreaterThan(0);
  });
});
