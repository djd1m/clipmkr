// Mutations run in an owned copy; the review/build snapshot is never edited.
import { createHash } from 'node:crypto';
import { mkdtempSync, cpSync, symlinkSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const project = process.cwd(), directory = mkdtempSync(join(tmpdir(), 'n5-billing-mutations-'));
const output = resolve(process.env.BILLING_REMINDERS_MUTATION_OUT ?? 'tests/artifacts/manual-billing-reminders/mutations');
mkdirSync(output, { recursive: true, mode: 0o700 });
if (!new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test')) throw Error('Owned *_test PostgreSQL required');
const ledger = 'packages/db/src/billing-notice-ledger.ts', web = 'apps/web/src/server/billing-notices.ts';
const integration = 'tests/billing-notices.integration.test.ts', enums = 'packages/shared/src/enums.ts';
const title = suffix => 'billing_' + suffix;
const mutations = [
  { id: 'enum-declaration', file: enums, test: 'tests/enums.test.ts', title: title('notice_check_constraints_are_declared_and_mutation_sensitive'),
    before: "  'billing_notice.state': BILLING_NOTICE_STATE,", after: '' },
  { id: 'enum-literal', file: 'packages/db/migrations/031_billing_notice.sql', test: 'tests/enums.test.ts', title: title('notice_check_constraints_are_declared_and_mutation_sensitive'),
    before: 'offset_days IN (1,3)', after: 'offset_days IN (1,7)' },
  { id: 'all-rights', file: ledger, title: title('continuous_end_keeps_test_unknown_and_zero_balance'),
    before: "g.account_id=$1 AND g.source='payment'", after: "g.account_id=$1 AND g.source='payment' AND g.remaining_seconds>0" },
  { id: 'live-proof', file: ledger, title: title('component_requires_verified_live_not_runtime_mode'),
    before: 'if (!facts.liveQualified || facts.relevantReview) return null;', after: 'if (facts.relevantReview) return null;' },
  { id: 'temporary-defer', file: ledger, title: title('temporary_review_resumes_same_event_before_first_and_after_unknown'),
    before: 'if (!facts.liveQualified || facts.relevantReview) return null;',
    after: "if (!facts.liveQualified || facts.relevantReview) { await tx.query(\"UPDATE billing_notice SET state='superseded' WHERE id=$1\", [id]); return null; }" },
  { id: 'account-lock', file: ledger, title: title('claim_revalidates_purchase_refund_email_erasure_with_held_locks'),
    before: 'SELECT id FROM account WHERE id=$1 FOR NO KEY UPDATE', after: 'SELECT id FROM account WHERE id=$1' },
  { id: 'known-end', file: ledger, title: title('claim_revalidates_purchase_refund_email_erasure_with_held_locks'),
    before: "if (!facts?.paidEnd || facts.paidEnd.getTime() !== notice.authoritative_paid_end.getTime() || offset(facts.paidEnd, now) !== notice.offset_days) reason = 'period_changed';",
    after: "if (!facts?.paidEnd) reason = 'period_changed';" },
  { id: 'frozen-payload', file: ledger, title: title('retry_preserves_bytes_key_budget_and_clock_fence'),
    before: 'notice.attempts > 0 ? notice.payload! : options.content(facts)', after: 'options.content(facts)' },
  { id: 'retry-clock', file: ledger, title: title('retry_preserves_bytes_key_budget_and_clock_fence'),
    before: 'if (notice.first_attempt_at && now < notice.first_attempt_at || notice.last_attempt_at && now.getTime() - notice.last_attempt_at.getTime() < HOUR) return null;', after: 'if (false) return null;' },
  { id: 'retry-window', file: ledger, title: title('retry_preserves_bytes_key_budget_and_clock_fence'),
    before: 'now.getTime() - notice.first_attempt_at.getTime() >= 23 * HOUR', after: 'now.getTime() - notice.first_attempt_at.getTime() >= 24 * HOUR' },
  { id: 'terminal', file: ledger, title: title('terminal_events_do_not_resume'), before: 'notice.attempts >= 3', after: 'notice.attempts >= 4' },
  { id: 'completion-cas', file: ledger, title: title('completion_and_reaper_preserve_concurrent_owner'), before: "AND attempts=$5 AND last_attempt_at=$4`,", after: "AND $5::int>=0 AND last_attempt_at=$4`," },
  { id: 'reaper-cas', file: ledger, title: title('completion_and_reaper_preserve_concurrent_owner'),
    before: "WHERE state='sending' AND lease_until<=$1 AND id IN (SELECT id FROM billing_notice", after: 'WHERE id IN (SELECT id FROM billing_notice' },
  { id: 'dispatch-four', file: web, title: title('dispatch_bounds_two_four_twenty_seconds_and_progress'), before: 'result.attempted < 4', after: 'result.attempted < 5', count: 2 },
  { id: 'dispatch-two', file: web, title: title('dispatch_bounds_two_four_twenty_seconds_and_progress'), before: 'wave.length < 2', after: 'wave.length < 3' },
  { id: 'dispatch-budget', file: web, title: title('dispatch_bounds_two_four_twenty_seconds_and_progress'), before: 'monotonic() - started < 20_000', after: 'monotonic() - started < Infinity' },
  { id: 'copy-period', file: web, title: title('copy_distinguishes_continuous_period_and_package_expiry'),
    before: 'Текущий непрерывный период доступа по пакетам закончится', after: 'Пакеты действуют до' },
  { id: 'default-off', file: 'packages/shared/src/config.ts', test: 'tests/config.test.ts', title: title('reminders_flag_defaults_false_without_mail'),
    before: "env.N5_BILLING_REMINDERS_ENABLED ?? 'false'", after: "env.N5_BILLING_REMINDERS_ENABLED ?? 'true'" },
  { id: 'adapter-false', file: 'apps/web/src/server/payments/yookassa.ts', test: 'tests/yookassa-receipts.unit.test.ts', title: 'manual_checkout_always_sends_save_payment_method_false',
    before: 'save_payment_method: false,', after: 'save_payment_method: true,' },
  { id: 'checkout-defer', file: ledger, title: title('checkout_pause_preserves_same_event_and_retry_budget'),
    before: 'if (!options.checkoutAllowed(facts.accountId, facts.billingPolicy)) return null;',
    after: "if (!options.checkoutAllowed(facts.accountId, facts.billingPolicy)) { await tx.query(\"UPDATE billing_notice SET state='superseded' WHERE id=$1\", [id]); return null; }" },
  { id: 'native-erasure', file: 'packages/db/migrations/031_billing_notice.sql', title: title('031_constraints_cascade_and_upgrade_preserve_rights'),
    before: 'DELETE FROM billing_notice WHERE account_id=NEW.id;', after: 'PERFORM 1;' },
];
const selected = process.argv[2], chosen = mutations.filter(m => !selected || m.id === selected);
if (!chosen.length || process.argv.length > 3) throw Error('No matched billing mutation');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const results = [], greens = new Map();
try {
  for (const name of ['apps', 'packages', 'tests', 'scripts']) cpSync(name, join(directory, name), { recursive: true,
    filter: file => !/(^|\/)(node_modules|dist|\.next|artifacts)(\/|$)/.test(file) });
  for (const name of ['package.json', 'tsconfig.base.json', 'vitest.config.ts', 'Dockerfile', 'docker-compose.yml', '.env.example']) cpSync(name, join(directory, name));
  symlinkSync(join(project, 'node_modules'), join(directory, 'node_modules'), 'dir');
  function run(mutation, phase) {
    const json = join(output, mutation.id + '-' + phase + '.json'), log = join(output, mutation.id + '-' + phase + '.txt');
    const command = [join(project, 'node_modules/vitest/vitest.mjs'), 'run', mutation.test ?? integration, '-t', '^.*' + mutation.title + '$', '--reporter=json', '--outputFile=' + json];
    const result = spawnSync(process.execPath, command, { cwd: directory, env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }, timeout: 90000, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    writeFileSync(log, result.stdout + '\n' + result.stderr, { mode: 0o600 });
    let report; try { report = JSON.parse(readFileSync(json, 'utf8')); } catch { return { code: result.status, matched: 0, status: 'unavailable', assertion: false }; }
    const matched = report.testResults.flatMap(r => r.assertionResults).filter(r => r.title === mutation.title);
    return { code: result.status, matched: matched.length, status: matched[0]?.status,
      assertion: matched.some(r => r.failureMessages.some(message => message.includes('AssertionError'))), command: ['node', ...command] };
  }
  for (const mutation of chosen) {
    const file = join(directory, mutation.file), source = readFileSync(file, 'utf8'), expected = mutation.count ?? 1;
    if (source.split(mutation.before).length - 1 !== expected) throw Error('Mutation anchor not unique: ' + mutation.id);
    writeFileSync(file, source.replaceAll(mutation.before, mutation.after));
    const red = run(mutation, 'red'); writeFileSync(file, source);
    const restored = hash(readFileSync(file)) === hash(source), greenKey = (mutation.test ?? integration) + ':' + mutation.title;
    if (!greens.has(greenKey)) greens.set(greenKey, run(mutation, 'green'));
    const green = greens.get(greenKey);
    const passed = restored && red.code === 1 && red.matched === 1 && red.status === 'failed' && red.assertion && green.code === 0 && green.matched === 1 && green.status === 'passed';
    results.push({ id: mutation.id, file: mutation.file, sourceSha256: hash(source), before: mutation.before, after: mutation.after, restored, red, green, passed });
    console.log(`${mutation.id}: red=${red.status}/${red.code}, green=${green.status}/${green.code}, passed=${passed}`);
  }
} finally {
  writeFileSync(join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n', { mode: 0o600 });
  rmSync(directory, { recursive: true, force: true });
}
if (results.length !== chosen.length || results.some(result => !result.passed)) process.exitCode = 1;
