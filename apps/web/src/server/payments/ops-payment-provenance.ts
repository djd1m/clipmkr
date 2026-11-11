import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { createPool, reconcilePaymentProvenance, PaymentProvenanceConflict, type Pool } from '@clipmaker/db';
import { loadPaymentsConfig } from '@clipmaker/shared/tariff';
import type { PaymentProvider } from './provider';
import { createYooKassaProvider } from './yookassa';
import { readEnvironment } from '../environment';

export function parsePaymentProvenanceArgs(args: string[]): { candidates: string; apply: boolean } | null {
  if ((args.length !== 2 && args.length !== 3) || args[0] !== '--candidates' || !args[1] || args[1].startsWith('-') || (args.length === 3 && args[2] !== '--apply')) return null;
  return { candidates: args[1], apply: args.length === 3 };
}

export async function runPaymentProvenanceBackfill(input: { pool: Pool; provider: PaymentProvider; candidates: readonly string[]; apply: boolean }): Promise<{ checked: number; updated: number; unchanged: number; conflicts: number; unavailable: number }> {
  if (input.provider.name !== 'yookassa' || input.candidates.length > 100 || new Set(input.candidates).size !== input.candidates.length || !input.candidates.every(id => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))) throw new Error('Invalid bounded candidates');
  const result = { checked: 0, updated: 0, unchanged: 0, conflicts: 0, unavailable: 0 };
  for (const id of input.candidates) {
    result.checked++;
    let payment;
    try { payment = await input.provider.getPayment(id); }
    catch (error) {
      if (error instanceof Error && error.name === 'PaymentVerificationError') result.conflicts++;
      else if (error instanceof Error && error.name === 'PaymentProviderUnavailable') result.unavailable++;
      else throw error;
      continue;
    }
    if (payment.status !== 'succeeded' || !payment.paid || payment.paidAt === null) { result.conflicts++; continue; }
    try {
      const status = await reconcilePaymentProvenance(input.pool, { provider: 'yookassa', payment, mode: 'backfill', apply: input.apply });
      result[status]++;
    } catch (error) {
      if (!(error instanceof PaymentProvenanceConflict)) throw error;
      result.conflicts++;
    }
  }
  return result;
}

async function main(): Promise<void> {
  const args = parsePaymentProvenanceArgs(process.argv.slice(2));
  if (!args) throw new Error('Arguments required');
  // O_NOFOLLOW and descriptor-based checks bind permissions, size and read to the same file.
  const file = await open(args.candidates, constants.O_RDONLY | constants.O_NOFOLLOW);
  let candidates: unknown;
  try {
    const stat = await file.stat();
    if (!stat.isFile() || stat.size > 65536 || (stat.mode & 0o077) !== 0) throw new Error('Private bounded file required');
    candidates = JSON.parse(await file.readFile('utf8'));
  } finally { await file.close(); }
  if (!Array.isArray(candidates) || !candidates.every(id => typeof id === 'string')) throw new Error('Invalid candidates');
  const config = loadPaymentsConfig(readEnvironment());
  if (config.mode !== 'live' || !process.env.DATABASE_URL) throw new Error('Explicit configured shop and database required');
  const provider = createYooKassaProvider(config);
  const pool = createPool(process.env.DATABASE_URL);
  try {
    const result = await runPaymentProvenanceBackfill({ pool, provider, candidates, apply: args.apply });
    console.log(JSON.stringify({ mode: args.apply ? 'apply' : 'dry-run', ...result }));
    if (result.conflicts || result.unavailable) process.exitCode = 1;
  } finally { await pool.end(); }
}
if (require.main === module) void main().catch(() => { console.error('Payment provenance operation failed; reconcile private evidence'); process.exitCode = 1; });
