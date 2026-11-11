import { claimBillingNotice, completeBillingNotice, prepareBillingNoticeBatch,
  type BillingNoticeEligibility, type BillingNoticePayload, type Pool } from '@clipmaker/db';
import type { SupportMailer } from './support/mail';

const cursors = new WeakMap<Pool, { account?: string; notice?: string }>();
function content(facts: BillingNoticeEligibility, from: string, origin: string): BillingNoticePayload {
  const date = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', dateStyle: 'long', timeStyle: 'short' }).format(facts.paidEnd!) + ' МСК';
  const subject = facts.offset === 3 ? 'Период доступа по пакетам скоро закончится' : 'Период доступа по пакетам закончится в течение суток';
  const body = `Текущий непрерывный период доступа по пакетам закончится ${date}. Автоматических списаний нет. Следующий пакет можно купить самостоятельно. Остатки каждого пакета действуют до его срока; бессрочные кредиты сохраняются. Актуальные условия и даты — в кабинете`;
  const url = new URL('/upgrade', origin).href;
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  return { from, to: facts.email, subject, text: `${body}\nКупить следующий пакет: ${url}`,
    html: `<p>${escape(body)}</p><p><a href="${escape(url)}">Купить следующий пакет</a></p>` };
}

/** Two bounded waves after media; wall time is business time, monotonic time admits work. */
export async function billingNoticesTick(pool: Pool, mailer: Pick<SupportMailer, 'retentionSender' | 'sendRetention'>,
  publicOrigin: string, options: {
    enabled: boolean; checkoutAllowed: (accountId: string, billingPolicy: string) => boolean;
    clock?: () => Date; monotonic?: () => number; batch?: number;
  }) {
  const result = { generated: 0, attempted: 0, accepted: 0, unknown: 0, failed: 0, exhausted: 0, deferred: 0, backlog: 0, unavailable: false };
  if (!options.enabled) return result;
  const report = (missingSender = false) => {
    console.info(JSON.stringify({ event: 'billing_notices', ...result }));
    const warnings: [string, number][] = [
      ['sender_unavailable', missingSender ? 1 : 0],
      ['processing_unavailable', result.unavailable && !missingSender ? 1 : 0],
      ['transport_failed', result.failed], ['transport_unknown', result.unknown], ['retry_exhausted', result.exhausted],
    ];
    for (const [reason, count] of warnings) if (count > 0) console.warn(JSON.stringify({ event: 'billing_notices_warning', reason, count }));
    return result;
  };
  const sender = mailer.retentionSender;
  if (!sender) { result.unavailable = true; return report(true); }
  const clock = options.clock ?? (() => new Date()), monotonic = options.monotonic ?? (() => performance.now());
  const started = monotonic(), admit = () => monotonic() - started < 20_000;
  const cursor = cursors.get(pool) ?? {};
  let stopped = false;
  try {
    const batch = await prepareBillingNoticeBatch(pool, { clock, admit, cursor, batch: options.batch });
    result.generated = batch.generated; result.backlog = batch.backlog;
    cursor.account = batch.accountCursor; cursors.set(pool, cursor);
    let position = 0;
    while (position < batch.ids.length && result.attempted < 4 && admit() && !stopped) {
      const wave: Promise<void>[] = [];
      while (position < batch.ids.length && wave.length < 2 && result.attempted < 4 && admit() && !stopped) {
        const id = batch.ids[position++]!;
        cursor.notice = id;
        let claim;
        const diagnostics = { exhausted: 0 };
        try {
          claim = await claimBillingNotice(pool, id, { clock, admit, diagnostics, checkoutAllowed: options.checkoutAllowed,
            content: facts => content(facts, sender, publicOrigin) });
        } catch { stopped = true; result.unavailable = true; break; }
        if (!claim) { result.exhausted += diagnostics.exhausted; if (!diagnostics.exhausted) result.deferred++; continue; }
        result.attempted++;
        const authorized = claim;
        // Invoke immediately after the committed claim, never enqueue a claimed message.
        let send: ReturnType<SupportMailer['sendRetention']>;
        try { send = mailer.sendRetention(authorized.payload, authorized.provider_key); }
        catch { send = Promise.resolve({ state: 'unknown', receipt: null }); }
        wave.push((async () => {
          let outcome: Awaited<ReturnType<SupportMailer['sendRetention']>>;
          try { outcome = await send; } catch { outcome = { state: 'unknown', receipt: null }; }
          if (outcome.state === 'unknown') result.unknown++;
          if (outcome.state === 'failed') result.failed++;
          try {
            const completed = await completeBillingNotice(pool, authorized, outcome);
            if (completed && outcome.state === 'accepted') result.accepted++;
          } catch { stopped = true; result.unavailable = true; }
        })());
      }
      await Promise.all(wave);
    }
    result.backlog = Math.max(0, batch.backlog - position);
  } catch { result.unavailable = true; }
  return report();
}
