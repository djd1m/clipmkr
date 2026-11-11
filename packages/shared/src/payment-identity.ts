import type { PaymentProviderName } from './enums';

export type PaymentEnvironment = 'unknown' | 'test' | 'live';
/** A server snapshot; unknown denotes history without canonical evidence. */
export type PaymentIdentity = Readonly<
  | { provider: null; environment: 'unknown'; merchantId: null }
  | { provider: 'fake'; environment: 'test'; merchantId: null }
  | { provider: Extract<PaymentProviderName, 'yookassa'>; environment: 'test' | 'live'; merchantId: string }
>;
