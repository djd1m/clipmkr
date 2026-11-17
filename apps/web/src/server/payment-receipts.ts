import { claimPaymentReceipt, finishPaymentReceipt, listDuePaymentReceipts, type Pool } from '@clipmaker/db';
import { CREDIT_SKUS, formatRubles, isCreditSku } from '@clipmaker/shared/tariff';
import type { SupportMailer } from './support/mail';

const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' });
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function paymentReceiptsTick(pool: Pool, mailer: Pick<SupportMailer, 'retentionSender' | 'sendRetention'> & Partial<Pick<SupportMailer, 'isTestCapture'>>,
  publicOrigin: string, clock: () => Date = () => new Date()) {
  const counts = { attempted: 0, accepted: 0, failed: 0, unknown: 0, problem: 0, superseded: 0, unavailable: 0 };
  const ids = await listDuePaymentReceipts(pool, clock(), 4);
  if (!ids.length) return counts;
  const from = mailer.retentionSender;
  if (!from) {
    counts.unavailable = ids.length;
  } else {
    await Promise.all(ids.map(async intentId => {
      try {
        const claim = await claimPaymentReceipt(pool, intentId, {
          clock, testCapture: mailer.isTestCapture === true, content: facts => {
            const title = isCreditSku(facts.sku) ? CREDIT_SKUS[facts.sku].title : 'Тариф Pro';
            const subject = 'Квитанция Clipmkr';
            const body = `Покупка «${title}» оплачена. ${formatRubles(facts.amount_minor)} · ${date.format(facts.paid_at)} МСК. Номер покупки: ${facts.intent_id}.`;
            const url = new URL(`/upgrade/return?intent=${facts.intent_id}`, publicOrigin).href;
            return { from, to: facts.email, subject, text: `${body}\nПокупка в кабинете: ${url}`,
              html: `<p>${escapeHtml(body)}</p><p><a href="${escapeHtml(url)}">Покупка в кабинете</a></p>` };
          },
        });
        if (!claim) return;
        if (claim === 'problem') { counts.problem++; return; }
        counts.attempted++;
        // Dispatch immediately after the committed claim; the provider always gets the same wire key.
        const outcome = await mailer.sendRetention(claim.payload, `payment-receipt-${claim.intent_id}`)
          .then(result => result.state, () => 'unknown' as const);
        if (await finishPaymentReceipt(pool, claim, outcome, clock())) counts[outcome]++;
        else counts.superseded++;
      } catch {
        counts.unavailable++;
      }
    }));
  }
  console.info(JSON.stringify({ event: 'payment_receipts', ...counts }));
  return counts;
}
