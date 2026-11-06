import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync, realpathSync, symlinkSync, chmodSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const repo = resolve('.');
const canonicalPackage = realpathSync('node_modules/@dzhechkov/harness-cli');
const canonicalRoot = resolve(canonicalPackage, '../..');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
let sequence = 0;
const patch = readFileSync('patches/dz-name-check-app-source.patch');
const baseline = execute('baseline', ['git', 'show', '7e77484def5efaec49564687f9284d9ce8939494:./patches/dz-name-check-app-source.patch'], { cwd: repo, encoding: null }, {}, 0).stdout;
assert.equal(hash(baseline), 'fb777bc802ad3d34bb540d13f4c31c881a61ffd1bf77d93f9bf5a023960d1031');
const sharedBefore = ['cli.js', 'known-flags.js'].map((f) => hash(readFileSync(join(canonicalPackage, 'dist', f))));
function evidence(label, data) {
  if (process.env.NAMECHECK_EVIDENCE_DIR) {
    mkdirSync(process.env.NAMECHECK_EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(process.env.NAMECHECK_EVIDENCE_DIR, `${String(sequence++).padStart(4, '0')}-${label}.json`), JSON.stringify(data, null, 2));
  }
}
function execute(label, command, options = {}, metadata = {}, expectedExit) {
  const result = spawnSync(command[0], command.slice(1), { encoding: 'utf8', ...options });
  assert.ifError(result.error);
  evidence(label, { command, ...metadata, stdout: result.stdout, stderr: result.stderr, exit: result.status });
  if (expectedExit !== undefined) assert.equal(result.status, expectedExit, label.includes('syntax') ? 'syntax/setup failure is inconclusive: ' + result.stderr : result.stdout + result.stderr);
  return result;
}
const apply = (cwd, bytes, ...flags) => execute('patch-command', ['git', 'apply', ...flags, '-'], { cwd, input: bytes }, { cwd, inputSha256: hash(bytes) });
function prepare(directory, source = canonicalPackage) {
  const target = join(directory, 'node_modules/@dzhechkov/harness-cli');
  cpSync(source, target, { recursive: true, filter: (path) => path !== join(source, 'node_modules') });
  // Dependencies are reused read-only; candidate package bytes are real isolated copies.
  symlinkSync(canonicalRoot, join(target, 'node_modules'), 'dir');
  const before = hash(readFileSync(join(target, 'dist/cli.js')));
  let state;
  if (apply(directory, patch, '--reverse', '--check').status === 0) {
    state = 'already-candidate'; assert.equal(apply(directory, patch, '--reverse').status, 0);
  } else if (apply(directory, baseline, '--reverse', '--check').status === 0) {
    assert.equal(apply(directory, baseline, '--reverse').status, 0); state = 'known-old';
  } else if (apply(directory, baseline, '--check').status === 0) state = 'pristine';
  else throw new Error('unknown installed CLI bytes: setup failure');
  assert.equal(hash(readFileSync(join(target, 'dist/cli.js'))), '8ca63c2dc346144cc62fe28f02cb6d4736bce490f991deeeac3852b4f9140753', 'unknown CLI bytes after normalization: setup failure');
  assert.equal(hash(readFileSync(join(target, 'dist/known-flags.js'))), '9ac5a1da4900baf4d74e655514ff9edbd793cf63a4d65c9c1b6ba403f89f1d8a', 'unknown flag bytes: setup failure');
  const check = apply(directory, patch, '--check');
  assert.equal(check.status, 0, check.stderr);
  assert.equal(apply(directory, patch).status, 0);
  assert.equal(apply(directory, patch, '--reverse', '--check').status, 0);
  evidence('candidate', { state, baselineSha256: hash(baseline), patchSha256: hash(patch), installedCliSha256: before, candidateCliSha256: hash(readFileSync(join(target, 'dist/cli.js'))), candidateFlagsSha256: hash(readFileSync(join(target, 'dist/known-flags.js'))) });
  return join(target, 'dist/bin.js');
}
const executableDirectory = mkdtempSync(join(tmpdir(), 'clipmkr-k1-cli-'));
chmodSync(executableDirectory, 0o755);
const cli = prepare(executableDirectory);
after(() => {
  const sharedAfter = ['cli.js', 'known-flags.js'].map((f) => hash(readFileSync(join(canonicalPackage, 'dist', f))));
  evidence('shared-unchanged', { before: sharedBefore, after: sharedAfter });
  assert.deepEqual(sharedAfter, sharedBefore, 'shared installation must remain unchanged');
  rmSync(executableDirectory, { recursive: true, force: true });
});
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'clipmkr-k1-source-'));
  chmodSync(directory, 0o755);
  const put = (path, text) => { const dest = join(directory, path); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, text); return dest; };
  put('apps/web/src/nested/candidate.ts', 'export const takenCandidate = 1;\n');
  put('package.json', JSON.stringify({ scripts: { candidate: 'node scripts/candidate.mjs' } }));
  mkdirSync(join(directory, 'extra'));
  return { directory, put, extra: join(directory, 'extra'), clean: () => rmSync(directory, { recursive: true, force: true }) };
}
function run(directory, args, options = {}) {
  const command = [process.execPath, ...(options.preload ? ['--import', options.preload] : []), options.cli ?? cli, 'name-check', '--project', directory, ...(options.human ? [] : ['--json']), ...args];
  const execution = { timeout: 20000, maxBuffer: 8 * 1048576, env: { ...process.env, ...options.env }, ...(options.uid === undefined ? {} : { uid: options.uid, gid: options.uid }) };
  return execute('cli-run', command, execution, { options, cliSha256: hash(readFileSync(join(dirname(options.cli ?? cli), 'cli.js'))) });
}
function verdict(result, status, code) {
  assert.equal(result.status, status, result.stdout + result.stderr);
  const value = JSON.parse(result.stdout);
  fields(value, { exit: status, outcome: ['free', 'taken', 'not-established'][status] });
  if (code) { assert.equal(value.scan.failureCode, code); assert.equal(value.scan.status, 'partial'); }
  return value;
}
const freeArgs = ['--module', 'unoccupied-candidate-name'];
const hook = (f, body) => f.put('fault.mjs', `import fs from 'node:fs'; import cp from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';\n${body}\nsyncBuiltinESMExports();\n`);
function shim(f, body) {
  const path = f.put('bin/python3', `#!${process.execPath}\n${body}\n`); chmodSync(path, 0o755);
  return { PATH: dirname(path) };
}

function fileCase(f, path, text, args, status, code, options) {
  const full = f.put(path, text);
  verdict(run(f.directory, args, options), status, code);
  return full;
}
const hookCase = (f, body, args, status, code, options = {}) => verdict(run(f.directory, args, { ...options, preload: hook(f, body) }), status, code);
const reservedFiles = (f, names, text) => names.forEach((name) => rmSync(fileCase(f, 'extra/' + name, text, [...freeArgs, '--source-root', f.extra], 2, 'unsupported-source')));
function withFixture(body, create = fixture) {
  const f = create();
  try { return body(f); } finally { f.clean(); }
}
const sourceTest = (title, body, create = fixture) => test(title, () => withFixture(body, create));
const fields = (actual, expected) => Object.entries(expected).forEach(([key, value]) => assert.deepEqual(actual[key], value, key));
const rootCounts = (scan, expected, index, root) => [[scan, expected], [scan.roots[index], root]].forEach(([actual, wanted]) => fields(actual, wanted));
function withMutant(id, transform, body, label = 'repair-mutant') {
  const target = join(dirname(cli), 'cli.js');
  const original = readFileSync(target, 'utf8');
  const changed = transform(original);
  assert.notEqual(changed, original, id + ' must change bytes');
  try {
    writeFileSync(target, changed);
    execute(label + '-syntax', [process.execPath, '--check', target], {}, { id }, 0);
    evidence(label, { id, sha256: hash(changed), ...body(), killed: true });
  } finally { writeFileSync(target, original); }
}
const killedBy = (oracle, diagnostic) => assert.throws(oracle, (error) => error.code === 'ERR_ASSERTION' && error.actual === diagnostic.actual && error.expected === diagnostic.expected);
const mutation = (f, id, transform, args, expected, observed = 0, options = {}, oracle, diagnostic = { actual: observed, expected }) => withMutant(id, transform, () => {
  const value = run(f.directory, args, options);
  const outcome = verdict(value, observed).outcome;
  killedBy(() => oracle ? oracle(value) : verdict(value, expected), diagnostic);
  return { expected, observed, outcome, diagnostic };
});

function nativeFixture() {
  const f = Object.assign(fixture(), { nativePath: 'packages/@dzhechkov/fixture/src/native.ts', nativeText: 'export function existing() {}\n' });
  rmSync(join(f.directory, 'apps'), { recursive: true });
  f.put(f.nativePath, f.nativeText);
  return f;
}
function volumes(f, groups, remove = false) {
  for (const [pattern, count, bytes = 0] of groups) for (let i = 0; i < count; i++) {
    const path = pattern.replace('#', i);
    if (remove) rmSync(join(f.directory, path)); else f.put(path, ' '.repeat(bytes));
  }
}
const nativeGroups = [['packages/@dzhechkov/fixture/src/block#.ts', 31, 1048576], ['extra/block#.js', 2, 1048576]];
const resourceCases = [
  ['total-bytes-limit', [['extra/total#.js', 33, 1048576]], nativeGroups, 'bytes'],
  ['sources-limit', [['extra/file#.js', 4097]], [['packages/@dzhechkov/fixture/src/empty#.ts', 4095], ['extra/one.js', 1]], 'sources'],
  ['entries-limit', [['extra/entry#.md', 20001]], [['packages/@dzhechkov/fixture/src/metadata#.md', 19995], ['extra/metadata#.md', 10]], 'entries'],
  ['depth-limit', [], [], 'depth'],
];
const nativeLate = (f) => hook(f, `const oldFile = fs.readFileSync; const oldRead = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; const late = () => { if (!offset) { offset = 11000000000n; fs.writeFileSync(${JSON.stringify(join(f.directory, 'native-read-observed'))}, 'native read completed'); } }; fs.readFileSync = (path, ...args) => { const data = oldFile(path, ...args); if (String(path).endsWith('/src/native.ts')) late(); return data; }; fs.readSync = (...args) => { const count = oldRead(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('/src/native.ts')) late(); return count; };`);
function combinedCounts(result, f, pythonText) {
  const value = verdict(result, 0);
  fields(value.scan, { status: 'complete', files: 2, bytes: Buffer.byteLength(f.nativeText + pythonText), commandManifestBytes: 0, observedLanguages: ['TypeScript', 'Python'] });
  const sources = [['native', 'TypeScript', f.nativeText], ['extra', 'Python', pythonText]];
  assert.deepEqual(value.scan.counts, Object.fromEntries(sources.map(([, language, text]) => [language, { files: 1, bytes: Buffer.byteLength(text) }])));
  assert.deepEqual(value.scan.roots.map((root) => [root.kind, root.status, root.files, root.bytes, root.observedLanguages]), sources.map(([kind, language, text]) => [kind, 'complete', 1, Buffer.byteLength(text), [language]]));
  return value;
}

function discoveryRun(f, api, delayMs, elapsedMs, args, expectedProof) {
  const marker = join(f.directory, 'discovery-observed.json'); rmSync(marker, { force: true });
  const preload = hook(f, `
const api = ${JSON.stringify(api)}, target = ${JSON.stringify(join(f.directory, 'packages/@dzhechkov'))};
const marker = ${JSON.stringify(marker)}, delayMs = ${delayMs}, elapsedMs = ${JSON.stringify(elapsedMs)};
const old = fs[api], clock = process.hrtime.bigint; let injected = false, scanStart, frozen;
if (elapsedMs !== null) process.hrtime.bigint = () => {
  const value = frozen ?? clock();
  if (scanStart === undefined && new Error().stack.includes('nameCheckScan')) scanStart = value;
  return value;
};
fs[api] = (path, ...args) => {
  let value, returned = false;
  try { value = old(path, ...args); returned = true; return value; }
  finally {
    if (!injected && String(path) === target && new Error().stack.includes('nameCheckScan')) {
      injected = true;
      if (delayMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
      if (elapsedMs !== null) frozen = (scanStart ?? clock()) + BigInt(elapsedMs) * 1000000n;
      fs.writeFileSync(marker, JSON.stringify({ actualLookup: true, api, returned, lookupValue: api === 'existsSync' ? value : null, delayMs, elapsedMs }));
    }
  }
};`);
  const start = process.hrtime.bigint();
  const result = run(f.directory, args, { preload });
  const seconds = Number(process.hrtime.bigint() - start) / 1e9;
  const proof = JSON.parse(readFileSync(marker, 'utf8'));
  fields(proof, expectedProof);
  return { result, proof, seconds };
}

sourceTest('K1 scans nested application source, refuses collisions and an empty workspace', (f) => {
  for (const query of [['--module', 'candidate'], ['--export', 'takenCandidate'], ['--command', 'candidate']]) verdict(run(f.directory, query), 1);
  verdict(run(f.directory, ['--module', 'fresh-candidate', '--export', 'freshCandidate']), 0);
  fileCase(f, 'packages/storage/src/deep/fresh-candidate.mjs', 'export function freshCandidate() {}\n', ['--module', 'fresh-candidate', '--export', 'freshCandidate'], 1);
  rmSync(join(f.directory, 'apps'), { recursive: true }); rmSync(join(f.directory, 'packages'), { recursive: true });
  verdict(run(f.directory, freeArgs), 2, 'empty-scan');
});

sourceTest('K1 covers tests and external Python declarations', (f) => {
  f.put('tests/present.test.mjs', 'export function testOwned() {}');
  f.put('extra/external.cjs', 'exports.cjsOwned = 1;');
  const marker = join(f.directory, 'executed');
  f.put('extra/python_owned.py', `from pathlib import Path\nPath(${JSON.stringify(marker)}).touch()\ndef pyOwned():\n    def internal(): pass\nasync def asyncOwned(): pass\nclass ClassOwned:\n    def methodOwned(self): pass\nif True:\n    def conditionalOwned(): pass\ntry:\n    pass\nexcept Exception:\n    class HandlerOwned: pass\n`);
  const scope = ['--source-root', f.extra];
  for (const name of ['present.test', 'external', 'python_owned']) verdict(run(f.directory, ['--module', name, ...scope]), 1);
  for (const name of ['pyOwned', 'asyncOwned', 'ClassOwned', 'conditionalOwned', 'HandlerOwned']) verdict(run(f.directory, ['--export', name, ...scope]), 1);
  for (const name of ['internal', 'methodOwned']) verdict(run(f.directory, ['--export', name, ...scope]), 0);
  assert.equal(existsSync(marker), false, 'investigated Python was not executed');
});

sourceTest('K1 refuses incomplete source coverage', (f) => {
  for (const args of [['--source-root'], ['--source-root', 'relative'], ['--source-root', f.extra, '--source-root', f.extra], ['--source-root', f.extra, '--source-root'], ['--source-rooot', f.extra], ['--mystery'], ['unexpected'], ['--module'], ['--source-root', '']]) verdict(run(f.directory, [...freeArgs, ...args]), 2, 'invalid-arguments');
  verdict(run(f.directory, [...freeArgs, '--source-root', join(f.directory, 'missing')]), 2, 'io-failure');
  const link = join(f.directory, 'link'); symlinkSync(f.extra, link);
  verdict(run(f.directory, [...freeArgs, '--source-root', link]), 2, 'symlink');
  symlinkSync(join(f.directory, 'package.json'), join(f.extra, 'linked.py'));
  verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'symlink'); rmSync(join(f.extra, 'linked.py'));
  reservedFiles(f, ['bad.sh', 'bad.rb', 'unknown.weird', 'extensionless'], 'secret body');
  const scope = [...freeArgs, '--source-root', f.extra];
  fileCase(f, 'extra/bad.py', 'def broken(: pass', scope, 2, 'python-parse-failure');
  fileCase(f, 'extra/bad.py', Buffer.from([0xff]), scope, 2, 'python-parse-failure');
  const py = fileCase(f, 'extra/bad.py', 'def good(): pass', scope, 2, 'python-parse-failure', { env: { PATH: '/nonexistent-python-path' } });
  chmodSync(py, 0o000);
  const denial = join(f.directory, 'denial.json');
  hookCase(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (String(path) !== ${JSON.stringify(py)}) return old(path, ...args); const uid = process.geteuid(); try { if (uid === 0) process.seteuid(65534); try { return old(path, ...args); } catch (error) { const observed = { code: error.code, uid: process.geteuid() }; if (uid === 0) process.seteuid(uid); fs.writeFileSync(${JSON.stringify(denial)}, JSON.stringify(observed)); throw error; } } finally { if (uid === 0) process.seteuid(uid); } };`, [...freeArgs, '--source-root', f.extra], 2, 'io-failure');
  const denied = JSON.parse(readFileSync(denial)); assert.equal(denied.code, 'EACCES'); assert.notEqual(denied.uid, 0);
  evidence('actual-eacces', denied);
  chmodSync(py, 0o644);
});

sourceTest('K1 bounds scan and parser resources', (f) => {
  const scope = [...freeArgs, '--source-root', f.extra];
  let path = f.put('extra/large.js', ' '.repeat(1048577)); verdict(run(f.directory, scope), 2, 'file-size-limit'); rmSync(path);
  for (const [code, defaults] of resourceCases) {
    if (defaults.length) volumes(f, defaults); else mkdirSync(join(f.extra, ...Array(33).fill('d')), { recursive: true });
    verdict(run(f.directory, scope), 2, code);
    rmSync(f.extra, { recursive: true }); mkdirSync(f.extra);
  }
  f.put('extra/good.py', 'def good(): pass');
  verdict(run(f.directory, scope, { env: shim(f, "setTimeout(() => {}, 4000);") }), 2, 'parser-timeout');
  verdict(run(f.directory, scope, { env: shim(f, "process.stdout.write('x'.repeat(2097152));") }), 2, 'parser-output-limit');
  hookCase(f, `const old = fs.readSync; let delayed = false; fs.readSync = (...args) => { const n = old(...args); if (!delayed && fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('candidate.ts')) { delayed = true; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10020); } return n; };`, scope, 2, 'elapsed-limit');
  const parserObservation = join(f.directory, 'parser-options.json');
  const nearDeadline = hookCase(f, `const oldRead = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; fs.readSync = (...args) => { const n = oldRead(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('good.py')) offset = 9900000000n; return n; }; const oldSpawn = cp.spawnSync; cp.spawnSync = (file, args, options) => { if (file === 'python3') fs.writeFileSync(${JSON.stringify(parserObservation)}, JSON.stringify({ timeout: options.timeout, maxBuffer: options.maxBuffer })); return oldSpawn(file, args, options); };`, scope, 2, undefined, { env: shim(f, "setTimeout(() => {}, 4000);") });
  assert.ok(['parser-timeout', 'elapsed-limit'].includes(nearDeadline.scan.failureCode));
  const options = JSON.parse(readFileSync(parserObservation)); assert.ok(options.timeout > 0 && options.timeout <= 100); assert.equal(options.maxBuffer, 1048576); evidence('remaining-parser-budget', options);
  hookCase(f, `const clock = process.hrtime.bigint; process.hrtime.bigint = () => clock() + (new Error().stack.includes('at budget') ? 11000000000n : 0n);`, scope, 2, 'elapsed-limit');
});

sourceTest('K1 reports complete coverage without source text', (f) => {
  f.put('scripts/excluded.sh', 'DO_NOT_READ'); f.put('scripts/excluded.py', 'DO_NOT_READ'); f.put('scripts/excluded.rb', 'DO_NOT_READ');
  const result = hookCase(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (/excluded\\.(sh|py|rb)$/.test(String(path))) throw new Error('excluded body read'); return old(path, ...args); };`, freeArgs, 0);
  fields(result.scan, { status: 'complete', files: 1, observedLanguages: ['TypeScript'] });
  assert.equal(result.scan.counts.TypeScript.bytes, Buffer.byteLength('export const takenCandidate = 1;\n'));
  assert.equal(result.scan.exclusions.filter((e) => e.reason === 'language-policy').length, 3);
  assert.equal(result.scan.bytes, Object.values(result.scan.counts).reduce((sum, value) => sum + value.bytes, 0) + result.scan.commandManifestBytes);
  const human = run(f.directory, freeArgs, { human: true }); assert.equal(human.status, 0); assert.match(human.stdout, /Source scope:.*complete/);
  f.put('extra/fail.py', 'SENSITIVE_SENTINEL = "never echo"\ndef broken(: pass');
  const bad = run(f.directory, [...freeArgs, '--source-root', f.extra]); verdict(bad, 2, 'python-parse-failure');
  assert.doesNotMatch(bad.stdout + bad.stderr, /SENSITIVE_SENTINEL|never echo|Traceback|SyntaxError/);
});

sourceTest('K1 valid free result remains possible', (f) => {
  verdict(run(f.directory, freeArgs), 0);
  fields(verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0).scan.roots.find((r) => r.kind === 'extra'), { status: 'complete', files: 0, bytes: 0, observedLanguages: [] });
  verdict(run(f.directory, []), 2);
  const actual = verdict(run(repo, ['--module', 'feature-adr-paths.test']), 1);
  const shells = actual.scan.exclusions.filter((e) => e.path.endsWith('.sh'));
  assert.equal(shells.length, 11, 'actual default shell paths must be reported');
  evidence('actual-default-compatibility', { scan: actual.scan, shellPaths: shells, admission: false });
  verdict(run(repo, ['--module', 'unoccupied-namecheck-compatibility-probe']), 0);
  f.put('packages/@dzhechkov/native/src/native.ts', 'export function nativeOwned() {}');
  for (const args of [['--module', 'native'], ['--export', 'nativeOwned']]) verdict(run(f.directory, args), 1);
  verdict(run(f.directory, freeArgs), 0);
  fileCase(f, 'extra/native_extra.py', 'def extraOwned(): pass', ['--export', 'extraOwned', '--source-root', f.extra], 1);
});
test('K2 accepts Next routes and rejects malformed or traversing paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clipmkr-k2-paths-'));
  const feature = join(directory, 'feature'); mkdirSync(feature);
  const checker = join(canonicalRoot, '@dzhechkov/skills-feature-adr/templates/.claude/skills/feature-adr/scripts/check-plan-completeness.mjs');
  assert.equal(hash(readFileSync(checker)), 'e684c64b648ad68331bf9e2ea4414f39267482e10e25a02009727db4ba443b3b', 'K2 must use the canonical installed checker bytes');
  evidence('K2-checker', { path: checker, sha256: hash(readFileSync(checker)) });
  writeFileSync(join(feature, '00_complexity_assessment.md'), '# Tier S\n');
  writeFileSync(join(feature, '01_requirements.md'), '# Требования\n| FR-1 | Проверка настоящего пути |\n');
  function run(target, executable = checker) {
    writeFileSync(join(feature, '06_implementation_plan.md'), '# План\nInputs read: 01_requirements.md\n\nПроверяем только синтаксис пути: стандартные сегменты Next.js допустимы, переход к родительскому каталогу и фрагменты Markdown запрещены. Отсутствующий будущий файл не является доказательством корректности его содержимого.\n\n## Задачи\n- [ ] T1 (FR-1): проверить путь.\n\nEXPECTED_CODE_TARGETS:\n- ' + target + '\n');
    return execute('K2-run', [process.execPath, executable, feature, '--tier=S', '--require-requirements'], {}, { executable, target });
  }
  try {
    const upstream = join(directory, 'upstream'); cpSync(dirname(checker), upstream, {recursive:true});
    const oldChecker = join(upstream, 'check-plan-completeness.mjs');
    const patched = readFileSync(oldChecker, 'utf8');
    const unpatched = patched.replace('MARKDOWN_RESIDUE_RE.test(markdownPath)', 'MARKDOWN_RESIDUE_RE.test(path)');
    assert.notEqual(unpatched, patched, 'negative control must restore the original condition');
    writeFileSync(oldChecker, unpatched);
    const red = run('apps/web/src/app/videos/[videoId]/VideoDetail.tsx', oldChecker);
    assert.equal(red.status, 1, red.stdout + red.stderr); assert.match(red.stdout, /markdown residue/);
    assert.deepEqual(['apps/web/src/app/videos/[videoId]/VideoDetail.tsx', 'apps/web/src/app/[...slug]/page.tsx', 'apps/web/src/app/[[...slug]]/page.tsx'].map((target) => run(target).status), [0, 0, 0]);
    assert.deepEqual(['../apps/web/src/app/[id]/page.tsx', 'apps/web/src/app/[id]/../page.tsx', 'apps/web/src/app/[id](link)/page.tsx', 'apps/web/src/app/[bad name]/page.tsx', 'apps/web/src/app/[id]/', 'apps/web/src/app/[bad-id]/page.tsx'].map((target) => run(target).status), [1, 1, 1, 1, 1, 1]);
  } finally { rmSync(directory, {recursive:true,force:true}); }
});

sourceTest('K1 candidate setup discriminates pristine, known old, candidate and unknown bytes', (f) => {
  const directory = mkdtempSync(join(tmpdir(), 'clipmkr-k1-baselines-'));
  try {
    const sourceRoot = join(directory, 'source');
    prepare(sourceRoot);
    const source = join(sourceRoot, 'node_modules/@dzhechkov/harness-cli');
    assert.equal(apply(sourceRoot, patch, '--reverse').status, 0);
    prepare(join(directory, 'pristine'), source);
    assert.equal(apply(sourceRoot, baseline).status, 0);
    fileCase(f, 'tests/old-gap.test.mjs', 'export const oldGap = true;', ['--module', 'old-gap.test'], 0, undefined, { cli: join(source, 'dist/bin.js') });
    const fixed = prepare(join(directory, 'old'), source);
    verdict(run(f.directory, ['--module', 'old-gap.test'], { cli: fixed }), 1);
    prepare(join(directory, 'candidate'), join(dirname(fixed), '..'));
    writeFileSync(join(source, 'dist/cli.js'), readFileSync(join(source, 'dist/cli.js'), 'utf8') + '\n// unknown bytes\n');
    assert.throws(() => prepare(join(directory, 'unknown'), source), /unknown CLI bytes.*setup failure/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

sourceTest('K1 guard mutations discriminate', (f) => {
  const scope = [...freeArgs, '--source-root', f.extra];
  const faultPath = join(f.directory, 'fault.mjs');
  f.put('tests/mutant-test.mjs', 'export const testSymbol = true;');
  f.put('extra/mutant_extra.py', 'def callableOwned(): pass');
  mutation(f, 'omit-tests', (s) => s.replace("['apps', 'packages', 'scripts', 'tests']", "['apps', 'packages', 'scripts']"), ['--module', 'mutant-test'], 1, 0);
  mutation(f, 'omit-extra', (s) => s.replace("...(sourceRoot === undefined ? [] : [{ requested: sourceRoot, kind: 'extra' }])", '...[]'), ['--module', 'mutant_extra', '--source-root', f.extra], 1, 0);
  mutation(f, 'omit-ast-declarations', (s) => s.replace('names = JSON.parse(parsed.stdout);', 'names = [];'), ['--export', 'callableOwned', '--source-root', f.extra], 1, 0);
  hookCase(f, `const old = fs.readSync; fs.readSync = (...args) => { if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('mutant_extra.py')) throw new Error('controlled read fault'); return old(...args); };`, scope, 2, 'io-failure');
  mutation(f, 'suppress-read-refusal', (s) => s.replace('const data = read(full);', 'const data = (() => { try { return read(full); } catch { return Buffer.alloc(0); } })();'), scope, 2, 0, { preload: faultPath });
  fileCase(f, 'extra/mutant_extra.py', 'def broken(: pass', scope, 2, 'python-parse-failure');
  mutation(f, 'suppress-parse-refusal', (s) => s.replace("if (parsed.error?.code === 'ETIMEDOUT')", "parsed.error = undefined; parsed.status = 0; parsed.stdout = '[]';\n                    if (parsed.error?.code === 'ETIMEDOUT')"), scope, 2, 0);
  rmSync(join(f.extra, 'mutant_extra.py'));
  fileCase(f, 'extra/large.js', ' '.repeat(1048577), scope, 2, 'file-size-limit');
  mutation(f, 'suppress-size-refusal', (s) => s.replace("if (before.size > 1048576) fail('file-size-limit');", '').replace("if (size > 1048576) fail('file-size-limit');", ''), scope, 2, 0);
  rmSync(join(f.extra, 'large.js'));
  hookCase(f, `const old = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; fs.readSync = (...args) => { const n = old(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('candidate.ts')) offset = 11000000000n; return n; };`, scope, 2, 'elapsed-limit');
  mutation(f, 'suppress-elapsed-refusal', (s) => s.replace("if (elapsed() >= 10000) fail('elapsed-limit');", ''), scope, 2, 0, { preload: faultPath });
  f.put('extra/good.py', 'def good(): pass');
  const env = shim(f, "process.stderr.write('SENSITIVE_MUTANT_SENTINEL'); process.exit(2);");
  const safe = run(f.directory, scope, { env }); verdict(safe, 2, 'python-parse-failure'); assert.doesNotMatch(safe.stdout + safe.stderr, /SENSITIVE_MUTANT_SENTINEL/);
  withMutant('echo-parser-stderr', (s) => s.replace("if (parsed.error?.code === 'ETIMEDOUT')", "process.stderr.write(parsed.stderr ?? '');\n                    if (parsed.error?.code === 'ETIMEDOUT')"), () => {
    const leak = run(f.directory, scope, { env }); verdict(leak, 2, 'python-parse-failure');
    assert.match(leak.stderr, /SENSITIVE_MUTANT_SENTINEL/);
    assert.throws(() => assert.doesNotMatch(leak.stdout + leak.stderr, /SENSITIVE_MUTANT_SENTINEL/), { code: 'ERR_ASSERTION' });
    return { diagnostic: 'SENSITIVE_MUTANT_SENTINEL in stderr' };
  }, 'mutant');
  mutation(f, 'refuse-all', (s) => s.replace('const facts = invalid\n', 'const facts = true\n'), freeArgs, 0, 2);
});

sourceTest('K1 source policy rejects path faults and preserves declared exclusions', (f) => {
  f.put('extra/data.json', '{"metadata": true}');
  f.put('extra/type.d.ts', 'export interface ExcludedType {}');
  let value = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0);
  assert.deepEqual(value.scan.roots.at(-1).observedLanguages, []);
  fields(verdict(run(f.directory, [...freeArgs, '--source-root', f.extra + '/']), 0).scan.roots.at(-1), { requested: f.extra + '/', canonical: f.extra });
  assert.equal(value.scan.exclusions.filter((e) => e.reason === 'declaration-file').length, 1);
  verdict(run(f.directory, [...freeArgs, '--source-root', f.put('not-directory', 'data')]), 2, 'not-directory');
  rmSync(fileCase(f, 'extra/invalid.js', Buffer.from([0xff]), [...freeArgs, '--source-root', f.extra], 2, 'encoding-failure'));
  const alias = join(f.directory, 'alias'); symlinkSync(f.extra, alias);
  mkdirSync(join(f.extra, 'nested'));
  verdict(run(f.directory, [...freeArgs, '--source-root', join(alias, 'nested')]), 2, 'path-alias');
  const source = join(f.directory, 'apps/web/src/nested/candidate.ts');
  hookCase(f, `const old = fs.lstatSync; let checks = 0; fs.lstatSync = (path, ...args) => { if (String(path) === ${JSON.stringify(source)} && ++checks === 3) { fs.renameSync(path, String(path) + '.old'); fs.writeFileSync(path, 'export const swappedSymbol = true;'); } return old(path, ...args); };`, freeArgs, 2, 'path-changed');
  hookCase(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (String(path) === ${JSON.stringify(source)}) fs.unlinkSync(path); return old(path, ...args); };`, freeArgs, 2, 'io-failure');
  const help = execute('help', [process.execPath, cli, '--help']);
  assert.equal(help.status, 0); assert.match(help.stdout, /--source-root <absolute-existing-dir>/);
});

sourceTest('NCQE-01 bounds native files with an explicit root', (f) => {
  f.put(f.nativePath, f.nativeText + ' '.repeat(1048576));
  // Legacy invocation without the new flag keeps its previous selection/decision semantics.
  verdict(run(f.directory, freeArgs), 0);
  verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'file-size-limit');
}, nativeFixture);

sourceTest('NCQE-01 rejects a late native read before aggregate success', (f) => {
  verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: nativeLate(f) }), 2, 'elapsed-limit');
  assert.equal(readFileSync(join(f.directory, 'native-read-observed'), 'utf8'), 'native read completed');
}, nativeFixture);

sourceTest('NCQE-01 reports both native and explicit source scopes', (f) => {
  const pythonText = 'def extraOwned(): pass\n';
  rootCounts(verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0).scan, { files: 1, bytes: Buffer.byteLength(f.nativeText) }, 1, { files: 0, bytes: 0, observedLanguages: [] });
  f.put('extra/extra.py', pythonText);
  evidence('native-extra-counts', combinedCounts(run(f.directory, [...freeArgs, '--source-root', f.extra]), f, pythonText));
  rmSync(join(f.directory, f.nativePath));
  rootCounts(verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0).scan, { files: 1 }, 0, { bytes: 0, observedLanguages: [] });
  rmSync(join(f.extra, 'extra.py'));
  verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'empty-scan');
}, nativeFixture);

sourceTest('NCQE-02 refuses regular files named as excluded directories', (f) => reservedFiles(f, ['dist', 'node_modules', '.next', '.git'], 'unrecognized source candidate'));

sourceTest('NCQE-01 preserves native selection, declaration owners and command semantics', (f) => {
  f.put(f.nativePath, f.nativeText + 'export const declarationOwned = 2;\n');
  f.put('packages/@dzhechkov/fixture/src/index.ts', 'export const declarationOwned = 1;\n');
  f.put('packages/@dzhechkov/fixture/src/cli.ts', 'const USAGE = `\n  dz native-doc\n`;\nexport function dispatch(command) {\n  switch (command) {\n    case \'native-command\':\n      return 0;\n  }\n}\n');
  f.put('packages/@dzhechkov/fallback/src/cli.ts', 'function other(choice) {\n  switch (choice) {\n    case \'fallback-command\': return 0;\n  }\n}\nconst HELP = `\n  dz fallback-doc\n`;\n');
  f.put('packages/@dzhechkov/dist/src/kept.ts', 'export const kept = true;');
  f.put('packages/@dzhechkov/no-source/README.md', 'unselected metadata');
  for (const path of ['ignored.js', 'ignored.tsx', 'ignored.py', 'ignored.d.ts', 'nested/hidden.ts']) f.put('packages/@dzhechkov/fixture/src/' + path, 'unselected body');
  f.put('apps/unselected.ts', 'export const appNotSelected = true;');
  f.put('extra/extra.py', 'def extraOwned(): pass\n');
  f.put('extra/cli.js', "switch (command) {\ncase 'extra-command': break;\n}");
  const scope = ['--source-root', f.extra];
  for (const selected of [[], scope]) {
    for (const name of ['native-command', 'native-doc', 'fallback-command', 'fallback-doc']) verdict(run(f.directory, ['--command', name, ...selected]), 1);
    verdict(run(f.directory, ['--command', 'candidate', ...selected]), 0); // project scripts stay outside native commands
    assert.equal(verdict(run(f.directory, ['--export', 'declarationOwned', ...selected]), 1).results[0].where, 'fixture/src/native.ts');
    verdict(run(f.directory, ['--module', 'kept', ...selected]), 1);
    for (const name of ['ignored', 'ignored.d', 'hidden', 'unselected']) verdict(run(f.directory, ['--module', name, ...selected]), 0);
  }
  verdict(run(f.directory, ['--export', 'extraOwned', ...scope]), 1);
  verdict(run(f.directory, ['--command', 'extra-command', ...scope]), 0);
  verdict(run(f.directory, ['--command', 'fresh-native-command', '--module', 'fresh-native-module', '--export', 'freshNativeExport', ...scope]), 0);
  fileCase(f, f.nativePath, f.nativeText + ' '.repeat(1048576 - Buffer.byteLength(f.nativeText)), ['--module', 'native', ...scope], 1); // exact per-file boundary
}, nativeFixture);

test('NCQE-01 shares aggregate resource limits across native and extra roots', () => {
  for (const [code, , groups, resource] of resourceCases) withFixture((f) => {
    volumes(f, groups);
    if (resource === 'depth') mkdirSync(join(f.extra, ...Array(33).fill('d')), { recursive: true });
    const value = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, code);
    fields(value.scan.roots[0], { kind: 'native', status: 'complete' });
    for (const key of ['files', 'bytes']) assert.ok(value.scan.roots[0][key] > 0, key);
    evidence('native-aggregate-limit', { resource, scan: value.scan });
  }, nativeFixture);
});

sourceTest('NCQE-02 preserves genuine build directory exclusions without traversal', (f) => {
  const names = ['dist', 'node_modules', '.next', '.git'];
  for (const name of names) f.put(`extra/${name}/unsupported.rb`, 'must not be read');
  const value = hookCase(f, `const old = fs.readdirSync; const excluded = new Set(${JSON.stringify(names.map((name) => join(f.extra, name)))}); fs.readdirSync = (path, ...args) => { if (excluded.has(String(path))) throw new Error('excluded directory traversed'); return old(path, ...args); };`, [...freeArgs, '--source-root', f.extra], 0);
  fields(value.scan.roots.at(-1), { files: 0, bytes: 0, observedLanguages: [] });
  assert.equal(value.scan.exclusions.filter((entry) => entry.reason === 'build-or-dependency').length, 4);
});

sourceTest('NCQE repair mutants break the new native and directory oracles', (f) => {
  const args = [...freeArgs, '--source-root', f.extra];
  fileCase(f, f.nativePath, f.nativeText + ' '.repeat(1048576), args, 2, 'file-size-limit');
  mutation(f, 'native-unbounded-read', (s) => s.replace('const data = read(full);', "const data = root.kind === 'native' ? readFileSync(full) : read(full);"), args, 2, 0, {}, (r) => verdict(r, 2, 'file-size-limit'), { actual: 0, expected: 2 });
  f.put(f.nativePath, f.nativeText);
  const late = nativeLate(f); verdict(run(f.directory, args, { preload: late }), 2, 'elapsed-limit');
  mutation(f, 'native-late-ignored', (s) => s.replace("if (elapsed() >= 10000) fail('elapsed-limit');", ''), args, 2, 0, { preload: late }, (r) => verdict(r, 2, 'elapsed-limit'), { actual: 0, expected: 2 });
  const pythonText = 'def extraOwned(): pass\n'; f.put('extra/extra.py', pythonText);
  combinedCounts(run(f.directory, args), f, pythonText);
  mutation(f, 'native-counts-omitted', (s) => s.replace('root.files++; root.bytes += scan.bytes - bytesBefore; scan.files++;', "root.files++; root.bytes += scan.bytes - bytesBefore; if (root.kind !== 'native') scan.files++;"), args, 2, 0, {}, (r) => combinedCounts(r, f, pythonText), { actual: 1, expected: 2 });
  rmSync(join(f.extra, 'extra.py'));
  volumes(f, nativeGroups);
  verdict(run(f.directory, args), 2, 'total-bytes-limit');
  mutation(f, 'aggregate-bytes-reset', (s) => s.replace("const root = { requested, canonical: null, kind,", "if (kind === 'extra') scan.bytes = 0;\n                const root = { requested, canonical: null, kind,"), args, 2, 0, {}, (r) => verdict(r, 2, 'total-bytes-limit'), { actual: 0, expected: 2 });
  volumes(f, nativeGroups, true);
  f.put('extra/dist', 'unrecognized source candidate'); verdict(run(f.directory, args), 2, 'unsupported-source');
  mutation(f, 'reserved-name-file-excluded', (s) => s.replace("stat.isDirectory() && ['node_modules', 'dist', '.next', '.git']", "['node_modules', 'dist', '.next', '.git']"), args, 2, 0, {}, (r) => verdict(r, 2, 'unsupported-source'), { actual: 0, expected: 2 });
}, nativeFixture);

sourceTest('NCQE-01 refuses an unreadable native src instead of treating it as absent', (f) => {
  const pkg = join(f.directory, 'packages/@dzhechkov/fixture');
  const src = join(pkg, 'src'); const observed = join(f.directory, 'native-denial.json');
  try {
    f.put('extra/nonempty.js', 'export const extraOwned = true;');
    chmodSync(join(f.directory, 'packages'), 0o755);
    chmodSync(join(f.directory, 'packages/@dzhechkov'), 0o755);
    const permission = hook(f, `const oldExists = fs.existsSync; const oldStat = fs.lstatSync; const target = ${JSON.stringify(src)}; const attempt = (read) => { const uid = process.geteuid(); let proof; try { if (uid === 0) process.seteuid(65534); try { const result = read(); if (result === false) { try { oldStat(target); } catch (error) { proof = { code: error.code, uid: process.geteuid() }; } } return result; } catch (error) { proof = { code: error.code, uid: process.geteuid() }; throw error; } } finally { if (uid === 0) process.seteuid(uid); if (proof) fs.writeFileSync(${JSON.stringify(observed)}, JSON.stringify(proof)); } }; fs.existsSync = (path) => String(path) === target ? attempt(() => { try { oldStat(path); return true; } catch { return false; } }) : oldExists(path); fs.lstatSync = (path, ...args) => String(path) === target ? attempt(() => oldStat(path, ...args)) : oldStat(path, ...args);`);
    chmodSync(pkg, 0o000);
    const result = run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: permission });
    const proof = JSON.parse(readFileSync(observed)); assert.equal(proof.code, 'EACCES'); assert.notEqual(proof.uid, 0);
    verdict(result, 2, 'io-failure'); evidence('native-src-eacces', proof);
    mutation(f, 'native-src-error-ignored', (s) => s.replace("try { io(() => lstatSync(src)); srcExists = true; }\n                        catch (error) { if (error.code !== 'ENOENT') throw error; }", "try { io(() => lstatSync(src)); srcExists = true; } catch {}"), [...freeArgs, '--source-root', f.extra], 2, 0, { preload: permission }, (r) => verdict(r, 2, 'io-failure'));
    chmodSync(pkg, 0o755);
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: permission }), 0);
  } finally { chmodSync(pkg, 0o755); }
}, nativeFixture);

sourceTest('NCQE-03 includes a real delayed default discriminator in elapsed budget', (f) => {
  const ordinary = verdict(run(f.directory, freeArgs), 0); assert.equal(ordinary.scan.status, 'complete');
  verdict(run(f.directory, ['--module', 'candidate']), 1);
  const { result, proof, seconds } = discoveryRun(f, 'existsSync', 10020, null, freeArgs, { actualLookup: true, returned: true, lookupValue: false, delayMs: 10020 });
  assert.ok(seconds >= 10);
  evidence('default-discovery-real-delay', { seconds, proof });
  verdict(result, 2, 'elapsed-limit');
});

test('NCQE-03 preserves discriminator siblings and elapsed boundary semantics', () => {
  for (const mode of ['default', 'explicit-extra', 'native-extra']) withFixture((f) => {
    const api = mode === 'default' ? 'existsSync' : 'lstatSync';
    for (const elapsed of [9999, 10000]) {
      const { result, proof } = discoveryRun(f, api, 0, elapsed, [...freeArgs, ...(mode === 'default' ? [] : ['--source-root', f.extra])], { actualLookup: true, api, elapsedMs: elapsed });
      verdict(result, elapsed === 9999 ? 0 : 2, elapsed === 10000 ? 'elapsed-limit' : undefined);
      evidence('discovery-sibling-boundary', { mode, proof, exit: result.status });
    }
  }, mode === 'native-extra' ? nativeFixture : fixture);
  withFixture((f) => {
    const { result } = discoveryRun(f, 'existsSync', 0, 11000, freeArgs, { lookupValue: true });
    assert.equal(verdict(result, 0).scan, undefined);
  }, nativeFixture);
});

sourceTest('NCQE-03 timing mutant breaks the real delayed-discovery oracle', (f) => withMutant('default-start-reset-after-discovery', (s) => s.replace('function nameCheckScan(repoRoot, sourceRoot) {\n    const started = process.hrtime.bigint();\n', 'function nameCheckScan(repoRoot, sourceRoot) {\n').replace("        let failureCode = 'io-failure';", "        const started = process.hrtime.bigint();\n        let failureCode = 'io-failure';"), () => {
  const { result, proof } = discoveryRun(f, 'existsSync', 10020, null, freeArgs, { actualLookup: true, lookupValue: false, delayMs: 10020 });
  verdict(result, 0);
  const diagnostic = { actual: 0, expected: 2 };
  killedBy(() => verdict(result, 2, 'elapsed-limit'), diagnostic);
  return { diagnostic, proof };
}, 'timing-mutant'));
