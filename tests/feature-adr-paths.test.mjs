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
const patch = readFileSync('patches/dz-name-check-app-source.patch');
const baselineResult = spawnSync('git', ['show', '7e77484def5efaec49564687f9284d9ce8939494:./patches/dz-name-check-app-source.patch'], { cwd: repo });
assert.equal(baselineResult.status, 0, 'exact selected-base patch must be available');
const baseline = baselineResult.stdout;
assert.equal(hash(baseline), 'fb777bc802ad3d34bb540d13f4c31c881a61ffd1bf77d93f9bf5a023960d1031');
const sharedBefore = ['cli.js', 'known-flags.js'].map((f) => hash(readFileSync(join(canonicalPackage, 'dist', f))));
let sequence = 0;
function evidence(label, data) {
  if (process.env.NAMECHECK_EVIDENCE_DIR) {
    mkdirSync(process.env.NAMECHECK_EVIDENCE_DIR, { recursive: true });
    writeFileSync(join(process.env.NAMECHECK_EVIDENCE_DIR, `${String(sequence++).padStart(4, '0')}-${label}.json`), JSON.stringify(data, null, 2));
  }
}
function apply(cwd, bytes, ...flags) {
  const command = ['git', 'apply', ...flags, '-'];
  const result = spawnSync(command[0], command.slice(1), { cwd, input: bytes, encoding: 'utf8' });
  assert.ifError(result.error);
  evidence('patch-command', { command, cwd, inputSha256: hash(bytes), stdout: result.stdout, stderr: result.stderr, exit: result.status });
  return result;
}
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
  const command = [options.cli ?? cli, 'name-check', '--project', directory, ...(options.human ? [] : ['--json']), ...args];
  const result = spawnSync(process.execPath, [...(options.preload ? ['--import', options.preload] : []), ...command], { encoding: 'utf8', timeout: 20000, maxBuffer: 8 * 1048576, env: { ...process.env, ...options.env }, ...(options.uid === undefined ? {} : { uid: options.uid, gid: options.uid }) });
  assert.ifError(result.error);
  evidence('cli-run', { command: [process.execPath, ...(options.preload ? ['--import', options.preload] : []), ...command], options, cliSha256: hash(readFileSync(join(dirname(options.cli ?? cli), 'cli.js'))), stdout: result.stdout, stderr: result.stderr, exit: result.status });
  return result;
}
function verdict(result, status, code) {
  assert.equal(result.status, status, result.stdout + result.stderr);
  const value = JSON.parse(result.stdout);
  assert.equal(value.exit, status);
  assert.equal(value.outcome, ['free', 'taken', 'not-established'][status]);
  if (code) { assert.equal(value.scan.failureCode, code); assert.equal(value.scan.status, 'partial'); }
  return value;
}
const freeArgs = ['--module', 'unoccupied-candidate-name'];
function hook(f, body) {
  return f.put('fault.mjs', `import fs from 'node:fs'; import cp from 'node:child_process'; import { syncBuiltinESMExports } from 'node:module';\n${body}\nsyncBuiltinESMExports();\n`);
}
function shim(f, body) {
  const path = f.put('bin/python3', `#!${process.execPath}\n${body}\n`); chmodSync(path, 0o755);
  return { PATH: dirname(path) };
}

test('K1 scans nested application source, refuses collisions and an empty workspace', () => {
  const f = fixture();
  try {
    for (const query of [['--module', 'candidate'], ['--export', 'takenCandidate'], ['--command', 'candidate']]) verdict(run(f.directory, query), 1);
    verdict(run(f.directory, ['--module', 'fresh-candidate', '--export', 'freshCandidate']), 0);
    f.put('packages/storage/src/deep/fresh-candidate.mjs', 'export function freshCandidate() {}\n');
    verdict(run(f.directory, ['--module', 'fresh-candidate', '--export', 'freshCandidate']), 1);
    rmSync(join(f.directory, 'apps'), { recursive: true }); rmSync(join(f.directory, 'packages'), { recursive: true });
    verdict(run(f.directory, freeArgs), 2, 'empty-scan');
  } finally { f.clean(); }
});

test('K1 covers tests and external Python declarations', () => {
  const f = fixture();
  try {
    f.put('tests/present.test.mjs', 'export function testOwned() {}');
    f.put('extra/external.cjs', 'exports.cjsOwned = 1;');
    const marker = join(f.directory, 'executed');
    f.put('extra/python_owned.py', `from pathlib import Path\nPath(${JSON.stringify(marker)}).touch()\ndef pyOwned():\n    def internal(): pass\nasync def asyncOwned(): pass\nclass ClassOwned:\n    def methodOwned(self): pass\nif True:\n    def conditionalOwned(): pass\ntry:\n    pass\nexcept Exception:\n    class HandlerOwned: pass\n`);
    const scope = ['--source-root', f.extra];
    for (const name of ['present.test', 'external', 'python_owned']) verdict(run(f.directory, ['--module', name, ...scope]), 1);
    for (const name of ['pyOwned', 'asyncOwned', 'ClassOwned', 'conditionalOwned', 'HandlerOwned']) verdict(run(f.directory, ['--export', name, ...scope]), 1);
    for (const name of ['internal', 'methodOwned']) verdict(run(f.directory, ['--export', name, ...scope]), 0);
    assert.equal(existsSync(marker), false, 'investigated Python was not executed');
  } finally { f.clean(); }
});

test('K1 refuses incomplete source coverage', () => {
  const f = fixture();
  try {
    for (const args of [['--source-root'], ['--source-root', 'relative'], ['--source-root', f.extra, '--source-root', f.extra], ['--source-root', f.extra, '--source-root'], ['--source-rooot', f.extra], ['--mystery'], ['unexpected'], ['--module'], ['--source-root', '']]) verdict(run(f.directory, [...freeArgs, ...args]), 2, 'invalid-arguments');
    verdict(run(f.directory, [...freeArgs, '--source-root', join(f.directory, 'missing')]), 2, 'io-failure');
    const link = join(f.directory, 'link'); symlinkSync(f.extra, link);
    verdict(run(f.directory, [...freeArgs, '--source-root', link]), 2, 'symlink');
    symlinkSync(join(f.directory, 'package.json'), join(f.extra, 'linked.py'));
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'symlink'); rmSync(join(f.extra, 'linked.py'));
    for (const name of ['bad.sh', 'bad.rb', 'unknown.weird', 'extensionless']) {
      const path = f.put('extra/' + name, 'secret body');
      verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'unsupported-source'); rmSync(path);
    }
    const py = f.put('extra/bad.py', 'def broken(: pass');
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'python-parse-failure');
    writeFileSync(py, Buffer.from([0xff])); verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'python-parse-failure');
    writeFileSync(py, 'def good(): pass');
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { env: { PATH: '/nonexistent-python-path' } }), 2, 'python-parse-failure');
    chmodSync(py, 0o000);
    const denial = join(f.directory, 'denial.json');
    const unprivileged = hook(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (String(path) !== ${JSON.stringify(py)}) return old(path, ...args); const uid = process.geteuid(); try { if (uid === 0) process.seteuid(65534); try { return old(path, ...args); } catch (error) { const observed = { code: error.code, uid: process.geteuid() }; if (uid === 0) process.seteuid(uid); fs.writeFileSync(${JSON.stringify(denial)}, JSON.stringify(observed)); throw error; } } finally { if (uid === 0) process.seteuid(uid); } };`);
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: unprivileged }), 2, 'io-failure');
    const denied = JSON.parse(readFileSync(denial)); assert.equal(denied.code, 'EACCES'); assert.notEqual(denied.uid, 0);
    evidence('actual-eacces', denied);
    chmodSync(py, 0o644);
  } finally { f.clean(); }
});

test('K1 bounds scan and parser resources', () => {
  const f = fixture(); const scope = [...freeArgs, '--source-root', f.extra];
  try {
    let path = f.put('extra/large.js', ' '.repeat(1048577)); verdict(run(f.directory, scope), 2, 'file-size-limit'); rmSync(path);
    for (let i = 0; i < 33; i++) f.put(`extra/total${i}.js`, ' '.repeat(1048576));
    verdict(run(f.directory, scope), 2, 'total-bytes-limit'); rmSync(f.extra, { recursive: true }); mkdirSync(f.extra);
    for (let i = 0; i < 4097; i++) f.put(`extra/file${i}.js`, '');
    verdict(run(f.directory, scope), 2, 'sources-limit'); rmSync(f.extra, { recursive: true }); mkdirSync(f.extra);
    for (let i = 0; i < 20001; i++) f.put(`extra/entry${i}.md`, '');
    verdict(run(f.directory, scope), 2, 'entries-limit'); rmSync(f.extra, { recursive: true }); mkdirSync(f.extra);
    mkdirSync(join(f.extra, ...Array(33).fill('d')), { recursive: true });
    verdict(run(f.directory, scope), 2, 'depth-limit'); rmSync(f.extra, { recursive: true }); mkdirSync(f.extra);
    f.put('extra/good.py', 'def good(): pass');
    verdict(run(f.directory, scope, { env: shim(f, "setTimeout(() => {}, 4000);") }), 2, 'parser-timeout');
    verdict(run(f.directory, scope, { env: shim(f, "process.stdout.write('x'.repeat(2097152));") }), 2, 'parser-output-limit');
    const late = hook(f, `const old = fs.readSync; let delayed = false; fs.readSync = (...args) => { const n = old(...args); if (!delayed && fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('candidate.ts')) { delayed = true; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10020); } return n; };`);
    verdict(run(f.directory, scope, { preload: late }), 2, 'elapsed-limit');
    const parserObservation = join(f.directory, 'parser-options.json');
    const remaining = hook(f, `const oldRead = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; fs.readSync = (...args) => { const n = oldRead(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('good.py')) offset = 9900000000n; return n; }; const oldSpawn = cp.spawnSync; cp.spawnSync = (file, args, options) => { if (file === 'python3') fs.writeFileSync(${JSON.stringify(parserObservation)}, JSON.stringify({ timeout: options.timeout, maxBuffer: options.maxBuffer })); return oldSpawn(file, args, options); };`);
    const nearDeadline = verdict(run(f.directory, scope, { preload: remaining, env: shim(f, "setTimeout(() => {}, 4000);") }), 2);
    assert.ok(['parser-timeout', 'elapsed-limit'].includes(nearDeadline.scan.failureCode));
    const options = JSON.parse(readFileSync(parserObservation)); assert.ok(options.timeout > 0 && options.timeout <= 100); assert.equal(options.maxBuffer, 1048576); evidence('remaining-parser-budget', options);
    const before = hook(f, `const clock = process.hrtime.bigint; process.hrtime.bigint = () => clock() + (new Error().stack.includes('at budget') ? 11000000000n : 0n);`);
    verdict(run(f.directory, scope, { preload: before }), 2, 'elapsed-limit');
  } finally { f.clean(); }
});

test('K1 reports complete coverage without source text', () => {
  const f = fixture();
  try {
    f.put('scripts/excluded.sh', 'DO_NOT_READ'); f.put('scripts/excluded.py', 'DO_NOT_READ'); f.put('scripts/excluded.rb', 'DO_NOT_READ');
    const noExcludedRead = hook(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (/excluded\\.(sh|py|rb)$/.test(String(path))) throw new Error('excluded body read'); return old(path, ...args); };`);
    const result = verdict(run(f.directory, freeArgs, { preload: noExcludedRead }), 0);
    assert.equal(result.scan.status, 'complete'); assert.equal(result.scan.files, 1);
    assert.deepEqual(result.scan.observedLanguages, ['TypeScript']);
    assert.equal(result.scan.counts.TypeScript.bytes, Buffer.byteLength('export const takenCandidate = 1;\n'));
    assert.equal(result.scan.exclusions.filter((e) => e.reason === 'language-policy').length, 3);
    assert.equal(result.scan.bytes, Object.values(result.scan.counts).reduce((sum, value) => sum + value.bytes, 0) + result.scan.commandManifestBytes);
    const human = run(f.directory, freeArgs, { human: true }); assert.equal(human.status, 0); assert.match(human.stdout, /Source scope:.*complete/);
    f.put('extra/fail.py', 'SENSITIVE_SENTINEL = "never echo"\ndef broken(: pass');
    const bad = run(f.directory, [...freeArgs, '--source-root', f.extra]); verdict(bad, 2, 'python-parse-failure');
    assert.doesNotMatch(bad.stdout + bad.stderr, /SENSITIVE_SENTINEL|never echo|Traceback|SyntaxError/);
  } finally { f.clean(); }
});

test('K1 valid free result remains possible', () => {
  const f = fixture();
  try {
    verdict(run(f.directory, freeArgs), 0);
    const empty = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0);
    const root = empty.scan.roots.find((r) => r.kind === 'extra');
    assert.equal(root.status, 'complete'); assert.equal(root.files, 0); assert.equal(root.bytes, 0); assert.deepEqual(root.observedLanguages, []);
    verdict(run(f.directory, []), 2);
    const actual = verdict(run(repo, ['--module', 'feature-adr-paths.test']), 1);
    const shells = actual.scan.exclusions.filter((e) => e.path.endsWith('.sh'));
    assert.equal(shells.length, 11, 'actual default shell paths must be reported');
    evidence('actual-default-compatibility', { scan: actual.scan, shellPaths: shells, admission: false });
    verdict(run(repo, ['--module', 'unoccupied-namecheck-compatibility-probe']), 0);
    f.put('packages/@dzhechkov/native/src/native.ts', 'export function nativeOwned() {}');
    for (const args of [['--module', 'native'], ['--export', 'nativeOwned']]) verdict(run(f.directory, args), 1);
    verdict(run(f.directory, freeArgs), 0);
    f.put('extra/native_extra.py', 'def extraOwned(): pass');
    verdict(run(f.directory, ['--export', 'extraOwned', '--source-root', f.extra]), 1);
  } finally { f.clean(); }
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
    const result = spawnSync(process.execPath, [executable, feature, '--tier=S', '--require-requirements'], {encoding:'utf8'});
    assert.ifError(result.error);
    evidence('K2-run', { command: [process.execPath, executable, feature, '--tier=S', '--require-requirements'], executable, target, stdout: result.stdout, stderr: result.stderr, exit: result.status });
    return result;
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
    for (const valid of ['apps/web/src/app/videos/[videoId]/VideoDetail.tsx', 'apps/web/src/app/[...slug]/page.tsx', 'apps/web/src/app/[[...slug]]/page.tsx']) {
      const result = run(valid); assert.equal(result.status, 0, result.stdout + result.stderr);
    }
    for (const invalid of ['../apps/web/src/app/[id]/page.tsx', 'apps/web/src/app/[id]/../page.tsx', 'apps/web/src/app/[id](link)/page.tsx', 'apps/web/src/app/[bad name]/page.tsx', 'apps/web/src/app/[id]/', 'apps/web/src/app/[bad-id]/page.tsx']) {
      const result = run(invalid); assert.equal(result.status, 1, result.stdout + result.stderr);
    }
  } finally { rmSync(directory, {recursive:true,force:true}); }
});

test('K1 candidate setup discriminates pristine, known old, candidate and unknown bytes', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clipmkr-k1-baselines-'));
  const f = fixture();
  try {
    const sourceRoot = join(directory, 'source');
    prepare(sourceRoot);
    const source = join(sourceRoot, 'node_modules/@dzhechkov/harness-cli');
    assert.equal(apply(sourceRoot, patch, '--reverse').status, 0);
    prepare(join(directory, 'pristine'), source);
    assert.equal(apply(sourceRoot, baseline).status, 0);
    const oldCli = join(source, 'dist/bin.js');
    f.put('tests/old-gap.test.mjs', 'export const oldGap = true;');
    verdict(run(f.directory, ['--module', 'old-gap.test'], { cli: oldCli }), 0);
    const fixed = prepare(join(directory, 'old'), source);
    verdict(run(f.directory, ['--module', 'old-gap.test'], { cli: fixed }), 1);
    prepare(join(directory, 'candidate'), join(dirname(fixed), '..'));
    writeFileSync(join(source, 'dist/cli.js'), readFileSync(join(source, 'dist/cli.js'), 'utf8') + '\n// unknown bytes\n');
    assert.throws(() => prepare(join(directory, 'unknown'), source), /unknown CLI bytes.*setup failure/);
  } finally { f.clean(); rmSync(directory, { recursive: true, force: true }); }
});

test('K1 guard mutations discriminate', () => {
  const f = fixture();
  const target = join(dirname(cli), 'cli.js');
  const original = readFileSync(target, 'utf8');
  const scope = [...freeArgs, '--source-root', f.extra];
  function mutant(id, transform, args, expected, observed, options = {}) {
    const changed = transform(original); assert.notEqual(changed, original, id + ' must change bytes');
    writeFileSync(target, changed);
    try {
      const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
      evidence('mutant-syntax', { command: [process.execPath, '--check', target], stdout: syntax.stdout, stderr: syntax.stderr, exit: syntax.status });
      assert.equal(syntax.status, 0, 'syntax failure is inconclusive: ' + syntax.stderr);
      const result = run(f.directory, args, options);
      const value = verdict(result, observed);
      // Exercise the public acceptance assertion, and require its precise status mismatch.
      assert.throws(() => verdict(result, expected), (error) => error.code === 'ERR_ASSERTION' && error.actual === observed && error.expected === expected);
      evidence('mutant', { id, sha256: hash(changed), expected, observed, outcome: value.outcome, killed: true });
    } finally { writeFileSync(target, original); }
  }
  try {
    f.put('tests/mutant-test.mjs', 'export const testSymbol = true;');
    f.put('extra/mutant_extra.py', 'def callableOwned(): pass');
    mutant('omit-tests', (s) => s.replace("['apps', 'packages', 'scripts', 'tests']", "['apps', 'packages', 'scripts']"), ['--module', 'mutant-test'], 1, 0);
    mutant('omit-extra', (s) => s.replace("...(sourceRoot === undefined ? [] : [{ requested: sourceRoot, kind: 'extra' }])", '...[]'), ['--module', 'mutant_extra', '--source-root', f.extra], 1, 0);
    mutant('omit-ast-declarations', (s) => s.replace('names = JSON.parse(parsed.stdout);', 'names = [];'), ['--export', 'callableOwned', '--source-root', f.extra], 1, 0);
    const readFault = hook(f, `const old = fs.readSync; fs.readSync = (...args) => { if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('mutant_extra.py')) throw new Error('controlled read fault'); return old(...args); };`);
    verdict(run(f.directory, scope, { preload: readFault }), 2, 'io-failure');
    mutant('suppress-read-refusal', (s) => s.replace('const data = read(full);', 'const data = (() => { try { return read(full); } catch { return Buffer.alloc(0); } })();'), scope, 2, 0, { preload: readFault });
    f.put('extra/mutant_extra.py', 'def broken(: pass');
    verdict(run(f.directory, scope), 2, 'python-parse-failure');
    mutant('suppress-parse-refusal', (s) => s.replace("if (parsed.error?.code === 'ETIMEDOUT')", "parsed.error = undefined; parsed.status = 0; parsed.stdout = '[]';\n                    if (parsed.error?.code === 'ETIMEDOUT')"), scope, 2, 0);
    rmSync(join(f.extra, 'mutant_extra.py'));
    f.put('extra/large.js', ' '.repeat(1048577));
    verdict(run(f.directory, scope), 2, 'file-size-limit');
    mutant('suppress-size-refusal', (s) => s.replace("if (before.size > 1048576) fail('file-size-limit');", '').replace("if (size > 1048576) fail('file-size-limit');", ''), scope, 2, 0);
    rmSync(join(f.extra, 'large.js'));
    const late = hook(f, `const old = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; fs.readSync = (...args) => { const n = old(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('candidate.ts')) offset = 11000000000n; return n; };`);
    verdict(run(f.directory, scope, { preload: late }), 2, 'elapsed-limit');
    mutant('suppress-elapsed-refusal', (s) => s.replace("if (elapsed() >= 10000) fail('elapsed-limit');", ''), scope, 2, 0, { preload: late });
    f.put('extra/good.py', 'def good(): pass');
    const env = shim(f, "process.stderr.write('SENSITIVE_MUTANT_SENTINEL'); process.exit(2);");
    const safe = run(f.directory, scope, { env }); verdict(safe, 2, 'python-parse-failure'); assert.doesNotMatch(safe.stdout + safe.stderr, /SENSITIVE_MUTANT_SENTINEL/);
    const leaky = original.replace("if (parsed.error?.code === 'ETIMEDOUT')", "process.stderr.write(parsed.stderr ?? '');\n                    if (parsed.error?.code === 'ETIMEDOUT')");
    writeFileSync(target, leaky);
    const leak = run(f.directory, scope, { env }); verdict(leak, 2, 'python-parse-failure');
    assert.match(leak.stderr, /SENSITIVE_MUTANT_SENTINEL/);
    assert.throws(() => assert.doesNotMatch(leak.stdout + leak.stderr, /SENSITIVE_MUTANT_SENTINEL/), { code: 'ERR_ASSERTION' });
    evidence('mutant', { id: 'echo-parser-stderr', sha256: hash(leaky), killed: true, diagnostic: 'SENSITIVE_MUTANT_SENTINEL in stderr' }); writeFileSync(target, original);
    mutant('refuse-all', (s) => s.replace('const facts = invalid\n', 'const facts = true\n'), freeArgs, 0, 2);
  } finally { writeFileSync(target, original); f.clean(); }
});

test('K1 source policy rejects path faults and preserves declared exclusions', () => {
  const f = fixture();
  try {
    f.put('extra/data.json', '{"metadata": true}');
    f.put('extra/type.d.ts', 'export interface ExcludedType {}');
    let value = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0);
    assert.deepEqual(value.scan.roots.at(-1).observedLanguages, []);
    const trailing = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra + '/']), 0);
    assert.equal(trailing.scan.roots.at(-1).requested, f.extra + '/');
    assert.equal(trailing.scan.roots.at(-1).canonical, f.extra);
    assert.equal(value.scan.exclusions.filter((e) => e.reason === 'declaration-file').length, 1);
    const notDir = f.put('not-directory', 'data');
    verdict(run(f.directory, [...freeArgs, '--source-root', notDir]), 2, 'not-directory');
    f.put('extra/invalid.js', Buffer.from([0xff]));
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'encoding-failure'); rmSync(join(f.extra, 'invalid.js'));
    const alias = join(f.directory, 'alias'); symlinkSync(f.extra, alias);
    mkdirSync(join(f.extra, 'nested'));
    verdict(run(f.directory, [...freeArgs, '--source-root', join(alias, 'nested')]), 2, 'path-alias');
    const source = join(f.directory, 'apps/web/src/nested/candidate.ts');
    const swapped = hook(f, `const old = fs.lstatSync; let checks = 0; fs.lstatSync = (path, ...args) => { if (String(path) === ${JSON.stringify(source)} && ++checks === 3) { fs.renameSync(path, String(path) + '.old'); fs.writeFileSync(path, 'export const swappedSymbol = true;'); } return old(path, ...args); };`);
    verdict(run(f.directory, freeArgs, { preload: swapped }), 2, 'path-changed');
    const removed = hook(f, `const old = fs.openSync; fs.openSync = (path, ...args) => { if (String(path) === ${JSON.stringify(source)}) fs.unlinkSync(path); return old(path, ...args); };`);
    verdict(run(f.directory, freeArgs, { preload: removed }), 2, 'io-failure');
    const help = spawnSync(process.execPath, [cli, '--help'], { encoding: 'utf8' });
    evidence('help', { command: [cli, '--help'], stdout: help.stdout, stderr: help.stderr, exit: help.status });
    assert.equal(help.status, 0); assert.match(help.stdout, /--source-root <absolute-existing-dir>/);
  } finally { f.clean(); }
});

function nativeFixture() {
  const f = fixture();
  rmSync(join(f.directory, 'apps'), { recursive: true });
  f.nativePath = 'packages/@dzhechkov/fixture/src/native.ts';
  f.nativeText = 'export function existing() {}\n';
  f.put(f.nativePath, f.nativeText);
  return f;
}
function nativeLate(f) {
  return hook(f, `const oldFile = fs.readFileSync; const oldRead = fs.readSync; const clock = process.hrtime.bigint; let offset = 0n; process.hrtime.bigint = () => clock() + offset; const late = () => { if (!offset) { offset = 11000000000n; fs.writeFileSync(${JSON.stringify(join(f.directory, 'native-read-observed'))}, 'native read completed'); } }; fs.readFileSync = (path, ...args) => { const data = oldFile(path, ...args); if (String(path).endsWith('/src/native.ts')) late(); return data; }; fs.readSync = (...args) => { const count = oldRead(...args); if (fs.readlinkSync('/proc/self/fd/' + args[0]).endsWith('/src/native.ts')) late(); return count; };`);
}
function combinedCounts(result, f, pythonText) {
  const value = verdict(result, 0);
  assert.equal(value.scan.status, 'complete');
  assert.equal(value.scan.files, 2);
  assert.equal(value.scan.bytes, Buffer.byteLength(f.nativeText + pythonText));
  assert.equal(value.scan.commandManifestBytes, 0);
  assert.deepEqual(value.scan.observedLanguages, ['TypeScript', 'Python']);
  assert.deepEqual(value.scan.counts, { TypeScript: { files: 1, bytes: Buffer.byteLength(f.nativeText) }, Python: { files: 1, bytes: Buffer.byteLength(pythonText) } });
  assert.deepEqual(value.scan.roots.map((root) => [root.kind, root.status, root.files, root.bytes, root.observedLanguages]), [
    ['native', 'complete', 1, Buffer.byteLength(f.nativeText), ['TypeScript']],
    ['extra', 'complete', 1, Buffer.byteLength(pythonText), ['Python']],
  ]);
  return value;
}

test('NCQE-01 bounds native files with an explicit root', () => {
  const f = nativeFixture();
  try {
    f.put(f.nativePath, f.nativeText + ' '.repeat(1048576));
    // Legacy invocation without the new flag keeps its previous selection/decision semantics.
    verdict(run(f.directory, freeArgs), 0);
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'file-size-limit');
  } finally { f.clean(); }
});

test('NCQE-01 rejects a late native read before aggregate success', () => {
  const f = nativeFixture();
  try {
    const result = run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: nativeLate(f) });
    assert.equal(readFileSync(join(f.directory, 'native-read-observed'), 'utf8'), 'native read completed');
    verdict(result, 2, 'elapsed-limit');
  } finally { f.clean(); }
});

test('NCQE-01 reports both native and explicit source scopes', () => {
  const f = nativeFixture(); const pythonText = 'def extraOwned(): pass\n';
  try {
    const emptyExtra = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0);
    assert.equal(emptyExtra.scan.files, 1);
    assert.equal(emptyExtra.scan.bytes, Buffer.byteLength(f.nativeText));
    assert.equal(emptyExtra.scan.roots[1].files, 0);
    assert.equal(emptyExtra.scan.roots[1].bytes, 0);
    assert.deepEqual(emptyExtra.scan.roots[1].observedLanguages, []);
    f.put('extra/extra.py', pythonText);
    const value = combinedCounts(run(f.directory, [...freeArgs, '--source-root', f.extra]), f, pythonText);
    evidence('native-extra-counts', value);
    rmSync(join(f.directory, f.nativePath));
    const emptyNative = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 0);
    assert.equal(emptyNative.scan.files, 1);
    assert.equal(emptyNative.scan.roots[0].bytes, 0);
    assert.deepEqual(emptyNative.scan.roots[0].observedLanguages, []);
    rmSync(join(f.extra, 'extra.py'));
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'empty-scan');
  } finally { f.clean(); }
});

test('NCQE-02 refuses regular files named as excluded directories', () => {
  const f = fixture();
  try {
    for (const name of ['dist', 'node_modules', '.next', '.git']) {
      const path = f.put('extra/' + name, 'unrecognized source candidate');
      verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, 'unsupported-source');
      rmSync(path);
    }
  } finally { f.clean(); }
});

test('NCQE-01 preserves native selection, declaration owners and command semantics', () => {
  const f = nativeFixture();
  try {
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
      const owned = verdict(run(f.directory, ['--export', 'declarationOwned', ...selected]), 1);
      assert.equal(owned.results[0].where, 'fixture/src/native.ts');
      verdict(run(f.directory, ['--module', 'kept', ...selected]), 1);
      for (const name of ['ignored', 'ignored.d', 'hidden', 'unselected']) verdict(run(f.directory, ['--module', name, ...selected]), 0);
    }
    verdict(run(f.directory, ['--export', 'extraOwned', ...scope]), 1);
    verdict(run(f.directory, ['--command', 'extra-command', ...scope]), 0);
    verdict(run(f.directory, ['--command', 'fresh-native-command', '--module', 'fresh-native-module', '--export', 'freshNativeExport', ...scope]), 0);
    f.put(f.nativePath, f.nativeText + ' '.repeat(1048576 - Buffer.byteLength(f.nativeText)));
    verdict(run(f.directory, ['--module', 'native', ...scope]), 1); // exact per-file boundary remains usable
  } finally { f.clean(); }
});

test('NCQE-01 shares aggregate resource limits across native and extra roots', () => {
  for (const resource of ['bytes', 'sources', 'entries', 'depth']) {
    const f = nativeFixture();
    try {
      if (resource === 'bytes') {
        for (let i = 0; i < 31; i++) f.put(`packages/@dzhechkov/fixture/src/block${i}.ts`, ' '.repeat(1048576));
        for (let i = 0; i < 2; i++) f.put(`extra/block${i}.js`, ' '.repeat(1048576));
      } else if (resource === 'sources') {
        for (let i = 0; i < 4095; i++) f.put(`packages/@dzhechkov/fixture/src/empty${i}.ts`, '');
        f.put('extra/one.js', '');
      } else if (resource === 'entries') {
        for (let i = 0; i < 19995; i++) f.put(`packages/@dzhechkov/fixture/src/metadata${i}.md`, '');
        for (let i = 0; i < 10; i++) f.put(`extra/metadata${i}.md`, '');
      } else mkdirSync(join(f.extra, ...Array(33).fill('d')), { recursive: true });
      const code = { bytes: 'total-bytes-limit', sources: 'sources-limit', entries: 'entries-limit', depth: 'depth-limit' }[resource];
      const value = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra]), 2, code);
      assert.equal(value.scan.roots[0].kind, 'native');
      assert.equal(value.scan.roots[0].status, 'complete');
      assert.ok(value.scan.roots[0].files > 0);
      assert.ok(value.scan.roots[0].bytes > 0);
      evidence('native-aggregate-limit', { resource, scan: value.scan });
    } finally { f.clean(); }
  }
});

test('NCQE-02 preserves genuine build directory exclusions without traversal', () => {
  const f = fixture(); const names = ['dist', 'node_modules', '.next', '.git'];
  try {
    for (const name of names) f.put(`extra/${name}/unsupported.rb`, 'must not be read');
    const noTraversal = hook(f, `const old = fs.readdirSync; const excluded = new Set(${JSON.stringify(names.map((name) => join(f.extra, name)))}); fs.readdirSync = (path, ...args) => { if (excluded.has(String(path))) throw new Error('excluded directory traversed'); return old(path, ...args); };`);
    const value = verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: noTraversal }), 0);
    assert.equal(value.scan.roots.at(-1).files, 0);
    assert.equal(value.scan.roots.at(-1).bytes, 0);
    assert.deepEqual(value.scan.roots.at(-1).observedLanguages, []);
    assert.equal(value.scan.exclusions.filter((entry) => entry.reason === 'build-or-dependency').length, 4);
  } finally { f.clean(); }
});

test('NCQE repair mutants break the new native and directory oracles', () => {
  const f = nativeFixture(); const target = join(dirname(cli), 'cli.js'); const original = readFileSync(target, 'utf8');
  const args = [...freeArgs, '--source-root', f.extra];
  function mutation(id, transform, oracle, diagnostic, options = {}) {
    const changed = transform(original); assert.notEqual(changed, original, id + ' must change bytes'); writeFileSync(target, changed);
    try {
      const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
      evidence('repair-mutant-syntax', { id, command: [process.execPath, '--check', target], stdout: syntax.stdout, stderr: syntax.stderr, exit: syntax.status });
      assert.equal(syntax.status, 0, 'syntax/setup crash is inconclusive: ' + syntax.stderr);
      const result = run(f.directory, args, options); verdict(result, 0);
      assert.throws(() => oracle(result), (error) => error.code === 'ERR_ASSERTION' && error.actual === diagnostic.actual && error.expected === diagnostic.expected);
      evidence('repair-mutant', { id, sha256: hash(changed), diagnostic, killed: true });
    } finally { writeFileSync(target, original); }
  }
  try {
    f.put(f.nativePath, f.nativeText + ' '.repeat(1048576));
    verdict(run(f.directory, args), 2, 'file-size-limit');
    mutation('native-unbounded-read', (s) => s.replace('const data = read(full);', "const data = root.kind === 'native' ? readFileSync(full) : read(full);"), (r) => verdict(r, 2, 'file-size-limit'), { actual: 0, expected: 2 });
    f.put(f.nativePath, f.nativeText);
    const late = nativeLate(f); verdict(run(f.directory, args, { preload: late }), 2, 'elapsed-limit');
    mutation('native-late-ignored', (s) => s.replace("if (elapsed() >= 10000) fail('elapsed-limit');", ''), (r) => verdict(r, 2, 'elapsed-limit'), { actual: 0, expected: 2 }, { preload: late });
    const pythonText = 'def extraOwned(): pass\n'; f.put('extra/extra.py', pythonText);
    combinedCounts(run(f.directory, args), f, pythonText);
    mutation('native-counts-omitted', (s) => s.replace('root.files++; root.bytes += scan.bytes - bytesBefore; scan.files++;', "root.files++; root.bytes += scan.bytes - bytesBefore; if (root.kind !== 'native') scan.files++;"), (r) => combinedCounts(r, f, pythonText), { actual: 1, expected: 2 });
    rmSync(join(f.extra, 'extra.py'));
    for (let i = 0; i < 31; i++) f.put(`packages/@dzhechkov/fixture/src/block${i}.ts`, ' '.repeat(1048576));
    for (let i = 0; i < 2; i++) f.put(`extra/block${i}.js`, ' '.repeat(1048576));
    verdict(run(f.directory, args), 2, 'total-bytes-limit');
    mutation('aggregate-bytes-reset', (s) => s.replace("const root = { requested, canonical: null, kind,", "if (kind === 'extra') scan.bytes = 0;\n                const root = { requested, canonical: null, kind,"), (r) => verdict(r, 2, 'total-bytes-limit'), { actual: 0, expected: 2 });
    for (let i = 0; i < 31; i++) rmSync(join(f.directory, `packages/@dzhechkov/fixture/src/block${i}.ts`));
    for (let i = 0; i < 2; i++) rmSync(join(f.extra, `block${i}.js`));
    f.put('extra/dist', 'unrecognized source candidate'); verdict(run(f.directory, args), 2, 'unsupported-source');
    mutation('reserved-name-file-excluded', (s) => s.replace("stat.isDirectory() && ['node_modules', 'dist', '.next', '.git']", "['node_modules', 'dist', '.next', '.git']"), (r) => verdict(r, 2, 'unsupported-source'), { actual: 0, expected: 2 });
  } finally { writeFileSync(target, original); f.clean(); }
});

test('NCQE-01 refuses an unreadable native src instead of treating it as absent', () => {
  const f = nativeFixture();
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
    const target = join(dirname(cli), 'cli.js'); const original = readFileSync(target, 'utf8');
    const changed = original.replace("try { io(() => lstatSync(src)); srcExists = true; }\n                        catch (error) { if (error.code !== 'ENOENT') throw error; }", "try { io(() => lstatSync(src)); srcExists = true; } catch {}");
    assert.notEqual(changed, original); writeFileSync(target, changed);
    try {
      const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
      evidence('repair-mutant-syntax', { id: 'native-src-error-ignored', command: [process.execPath, '--check', target], stdout: syntax.stdout, stderr: syntax.stderr, exit: syntax.status });
      assert.equal(syntax.status, 0, 'syntax/setup crash is inconclusive');
      const falseFree = run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: permission }); verdict(falseFree, 0);
      assert.throws(() => verdict(falseFree, 2, 'io-failure'), (error) => error.code === 'ERR_ASSERTION' && error.actual === 0 && error.expected === 2);
      evidence('repair-mutant', { id: 'native-src-error-ignored', sha256: hash(changed), diagnostic: { actual: 0, expected: 2 }, killed: true });
    } finally { writeFileSync(target, original); }
    chmodSync(pkg, 0o755);
    verdict(run(f.directory, [...freeArgs, '--source-root', f.extra], { preload: permission }), 0);
  } finally { chmodSync(pkg, 0o755); f.clean(); }
});

function discoveryFault(f, api, delayMs = 0, elapsedMs = null) {
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
  return { preload, proof: () => JSON.parse(readFileSync(marker, 'utf8')) };
}

test('NCQE-03 includes a real delayed default discriminator in elapsed budget', () => {
  const f = fixture();
  try {
    const ordinary = verdict(run(f.directory, freeArgs), 0); assert.equal(ordinary.scan.status, 'complete');
    verdict(run(f.directory, ['--module', 'candidate']), 1);
    const fault = discoveryFault(f, 'existsSync', 10020);
    const start = process.hrtime.bigint();
    const result = run(f.directory, freeArgs, { preload: fault.preload });
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    const proof = fault.proof(); assert.equal(proof.actualLookup, true); assert.equal(proof.returned, true); assert.equal(proof.lookupValue, false); assert.equal(proof.delayMs, 10020); assert.ok(seconds >= 10);
    evidence('default-discovery-real-delay', { seconds, proof });
    verdict(result, 2, 'elapsed-limit');
  } finally { f.clean(); }
});

test('NCQE-03 preserves discriminator siblings and elapsed boundary semantics', () => {
  for (const mode of ['default', 'explicit-extra', 'native-extra']) {
    const f = mode === 'native-extra' ? nativeFixture() : fixture();
    try {
      const args = [...freeArgs, ...(mode === 'default' ? [] : ['--source-root', f.extra])];
      const api = mode === 'default' ? 'existsSync' : 'lstatSync';
      for (const elapsed of [9999, 10000]) {
        const fault = discoveryFault(f, api, 0, elapsed);
        const result = run(f.directory, args, { preload: fault.preload }); const proof = fault.proof();
        assert.equal(proof.actualLookup, true); assert.equal(proof.api, api); assert.equal(proof.elapsedMs, elapsed);
        verdict(result, elapsed === 9999 ? 0 : 2, elapsed === 10000 ? 'elapsed-limit' : undefined);
        evidence('discovery-sibling-boundary', { mode, proof, exit: result.status });
      }
    } finally { f.clean(); }
  }
  const f = nativeFixture();
  try {
    const fault = discoveryFault(f, 'existsSync', 0, 11000);
    const value = verdict(run(f.directory, freeArgs, { preload: fault.preload }), 0);
    assert.equal(fault.proof().lookupValue, true); assert.equal(value.scan, undefined);
  } finally { f.clean(); }
});

test('NCQE-03 timing mutant breaks the real delayed-discovery oracle', () => {
  const f = fixture(); const target = join(dirname(cli), 'cli.js'); const original = readFileSync(target, 'utf8');
  const changed = original.replace('function nameCheckScan(repoRoot, sourceRoot) {\n    const started = process.hrtime.bigint();\n', 'function nameCheckScan(repoRoot, sourceRoot) {\n').replace("        let failureCode = 'io-failure';", "        const started = process.hrtime.bigint();\n        let failureCode = 'io-failure';");
  assert.notEqual(changed, original);
  try {
    writeFileSync(target, changed);
    const syntax = spawnSync(process.execPath, ['--check', target], { encoding: 'utf8' });
    evidence('timing-mutant-syntax', { command: [process.execPath, '--check', target], stdout: syntax.stdout, stderr: syntax.stderr, exit: syntax.status });
    assert.equal(syntax.status, 0, 'syntax/setup failure is inconclusive');
    const fault = discoveryFault(f, 'existsSync', 10020);
    const result = run(f.directory, freeArgs, { preload: fault.preload }); const proof = fault.proof();
    assert.equal(proof.actualLookup, true); assert.equal(proof.lookupValue, false); assert.equal(proof.delayMs, 10020);
    verdict(result, 0);
    assert.throws(() => verdict(result, 2, 'elapsed-limit'), (error) => error.code === 'ERR_ASSERTION' && error.actual === 0 && error.expected === 2);
    evidence('timing-mutant', { id: 'default-start-reset-after-discovery', sha256: hash(changed), diagnostic: { actual: 0, expected: 2 }, proof, killed: true });
  } finally { writeFileSync(target, original); f.clean(); }
});
