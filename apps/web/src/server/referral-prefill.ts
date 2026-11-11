import { readReferral } from '../lib/partner-referral';
import type { PartnerLandingService } from './partner-landing';
import { UploadError } from './upload-contract';

// Advisory display only: never record a visit or expose signed cookie material.
export async function readReferralPrefill(header: string, secret: string, links: Pick<PartnerLandingService, 'find'>): Promise<string | null> {
  const referral = readReferral(header, secret);
  if (!referral) return null;
  try { return (await links.find(referral.code)).code; }
  catch (error) {
    if (!(error instanceof UploadError && error.status === 404)) console.warn('referral_prefill_lookup_unavailable');
    return null;
  }
}
