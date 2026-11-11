import { beforeEach, expect, it, vi } from 'vitest';
import { readReferralPrefill } from '../apps/web/src/server/referral-prefill';
import { referralCookie } from '../apps/web/src/lib/partner-referral';
import { UploadError } from '../apps/web/src/server/upload-contract';
const secret = 'synthetic-prefill-secret';
const links = { find: vi.fn() };
const cookie = () => referralCookie('', 'CODE123', 'cookie', false, secret)!;
beforeEach(() => { vi.restoreAllMocks(); links.find.mockReset(); links.find.mockResolvedValue({ id: 'private-code-id', code: 'CODE123', account_id: 'private-owner-id' }); });
it('referral prefill rejects invalid evidence before lookup', async () => {
  const valid = cookie(), now = Date.now();
  const expired = referralCookie('', 'CODE123', 'cookie', false, secret, now - 15 * 86400_000)!;
  for (const header of ['', valid.replace('CODE123', 'OTHER12'), expired, valid + '; ' + valid, '__Host-n5_referral=invalid']) {
    expect(await readReferralPrefill(header, secret, links)).toBeNull();
  }
  expect(links.find).not.toHaveBeenCalled();
});
it('referral prefill returns only the active public code', async () => {
  expect(await readReferralPrefill(cookie(), secret, links)).toBe('CODE123');
  expect(links.find).toHaveBeenCalledExactlyOnceWith('CODE123');
  links.find.mockRejectedValue(new UploadError('not_found', 'private-refusal', 404));
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  expect(await readReferralPrefill(cookie(), secret, links)).toBeNull(); expect(warn).not.toHaveBeenCalled();
});
it('referral prefill degrades on unavailable lookup', async () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  links.find.mockRejectedValue(new Error('private-secret-marker'));
  expect(await readReferralPrefill(cookie(), secret, links)).toBeNull();
  expect(warn.mock.calls).toEqual([['referral_prefill_lookup_unavailable']]);
});

it('referral apply confirmation omits unbound code', async () => {
  const { PartnerService } = await import('../apps/web/src/server/partner');
  for (const variant of ['valid', 'mismatch', 'rejected', 'self', 'activated']) {
    const persisted = { id: 'attribution-id', partner_code_id: variant === 'mismatch' ? 'other-id' : 'code-id', source: 'explicit',
      status: variant === 'rejected' || variant === 'self' ? 'rejected' : variant === 'activated' ? 'activated' : 'pending',
      replaced_source: null, reject_reason: variant === 'self' ? 'self_referral' : variant === 'rejected' ? 'controlled-rejection' : null };
    const query = vi.fn(async (sql: string) => {
      if (sql.includes('FROM partner_code c JOIN partner p')) return { rows: [{ id: 'code-id', code: 'CODE123', status: 'active', account_id: variant === 'self' ? 'account-id' : 'owner-id' }] };
      if (sql.includes('SELECT * FROM attribution')) return { rows: [] };
      if (sql.includes('INSERT INTO attribution')) return { rows: [persisted] };
      if (sql.includes('SELECT count(DISTINCT')) return { rows: [{ count: '1' }] };
      return { rowCount: 1, rows: [{ id: 'account-id' }] };
    });
    const release = vi.fn(), pool = { connect: async () => ({ query, release }) } as unknown as import('pg').Pool;
    const result = await new PartnerService(pool, secret).apply('account-id', { code: 'CODE123' }, '192.0.2.0/24');
    expect(result).toMatchObject(persisted);
    expect(result?.applied_code).toBe(variant === 'valid' || variant === 'activated' ? 'CODE123' : undefined);
    expect(query.mock.calls.at(-1)?.[0]).toBe('COMMIT'); expect(release).toHaveBeenCalledOnce();
  }
});
