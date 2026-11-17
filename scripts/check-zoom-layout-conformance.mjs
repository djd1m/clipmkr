#!/usr/bin/env node
// Read-only pre-apply evidence gate. This is evidence binding, not authentication against root.
import { readFileSync, lstatSync, realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, resolve, isAbsolute, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const feature = 'features/zoom-layout-mockup-conformance/';
const originalCommit = '9e19f5746a28bad89c9551ce8cd9934f0f0a4f8e';
const approvalCommit = '0cbe2e9194eaff9597341f91f04528097da2711a';
const originalPath = 'docs/research/zoom-screen-layout/mockup.html';
const originalHash = '7b83572176b7c48c38c5d9d3ed141148c482cc11bb98493c07fcef59fe6f4ad0';
const uiHash = '5fdbd7611b7e4a975df03d94a246f9620b64c79580b88748087a655b213f9ee6';
const oracleHash = '539e37bf812b0ee22d7a88b6345241b85588aa48d6fc4c7dc669a171113949d2'; // Derived oracle, not an owner-approved UI hash.
const c0Commit = '654361daf6b8cb9d276bc72477d5fc7b43f6c3be';
const suites = ['zoom-layout-release','screen-layout','screen-layout-conformance','screen-layout-media',
  'clip-layout.integration','clip-music-choice.integration','clip-cta-rerender.integration',
  'render','framing','framing-media','teaser','clip-cta-render','browser/clip-layout'].map(n => `tests/${n}.test.ts`);
const named = [
  ['screen-layout', 'v2_parser_is_strict_and_v1_canonical_bytes_are_unchanged', 1],
  ['clip-layout.integration','033_preserves_v1_rows_and_accepts_only_supported_v2_intents',1],
  ['clip-layout.integration','publication_rejects_composition_version_substitution',1],
  ['clip-music-choice.integration','music_rerender_preserves_each_published_composition_version',4],
  ['clip-cta-rerender.integration','cta_rerender_preserves_mixed_composition_versions',1],
  ['screen-layout-conformance','original_mockup_01_02_composition_conformance',2],
  ['screen-layout-media','v2_overlay_bounding_boxes_preserve_content_and_existing_footer_contracts',1],
  ['browser/clip-layout','legacy_layout_changes_version_only_after_explicit_upgrade',1],
  ['browser/clip-layout','v2_02_height_control_reaches_reference_aspect_without_applying',1],
  ['browser/clip-layout','unknown_v1_submission_replays_without_draft_upgrade',2],
  ['browser/clip-layout','v2_native_and_canvas_cover_original_composition_extents',2],
  ['zoom-layout-release','current_vps_apply_fails_before_any_write_on_invalid_or_changed_evidence',1],
];
// Root read-only inventory; no private header/config values. Ingress stays separate from six app/data containers.
const ingressPins = {
  "containerId": "4efd6fbf569889f473e879267f0ea231bc6f205311daae2710d815e070e1d809",
  "imageId": "sha256:d8542f48d34a9cf4e4c11a478865229840e87e4c96ea3f439101f31a5d35f75f",
  "startedAt": "2026-10-14T07:06:54.123797373Z",
  "mounts": [
    {
      "source": "/var/lib/docker/volumes/n8-interior-local_tls-config/_data",
      "destination": "/config",
      "rw": true
    },
    {
      "source": "/var/lib/docker/volumes/n8-interior-local_tls-data/_data",
      "destination": "/data",
      "rw": true
    },
    {
      "source": "/home/2026-AUG-PU-Projects/projects/08-interior-ai-redesign/config/public/Caddyfile",
      "destination": "/etc/caddy/Caddyfile",
      "rw": false
    }
  ],
  "activeConfigSha256": "02ce065baf7447ec36170c785944bc250a51fe3f8883daa6716e29b8b6668cca",
  "upstreamPaths": [
    "/apps/http/servers/srv0/routes/6/handle/0/routes/0/handle/1/routes/1/handle/0/routes/0/handle/0/routes/0/handle/0/upstreams/0",
    "/apps/http/servers/srv0/routes/6/handle/0/routes/0/handle/1/routes/2/handle/0/routes/1/handle/1/upstreams/0",
    "/apps/http/servers/srv0/routes/7/handle/0/routes/0/handle/1/routes/0/handle/0/routes/2/handle/0/upstreams/0",
    "/apps/http/servers/srv0/routes/7/handle/0/routes/0/handle/1/routes/1/handle/0/routes/2/handle/0/upstreams/0"
  ],
  "sourceConfig": {
    "path": "/home/2026-AUG-PU-Projects/projects/08-interior-ai-redesign/config/public/Caddyfile",
    "sha256": "48bfa82de9f737cbdd612a64487aeacb3703fbe92b74b226ce7c2d008f172135"
  },
  "importHashes": {
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/main-tls.caddy": "889e12f3fde870ec3b98fcf1f9941602ded7462a2720bc237a8284c8c21b2b0c",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/candidate.caddy": "ba883a48d72f3e18b7204e77b7b999d7840e19a8e23fe255f20eae000c3fb4a4",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/www-tls.caddy": "f1d4bc96797af72b4790108967cbea6932afd3bc22a8b00c607aab459f07c661",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/existing-sites.caddy": "e20b10b7cc100af00d022bcb3b993afa8d57b590e777036f01ec56845fa8a0d7",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/support-repair.caddy": "945bab6e88ec8a229a6a49d8a634031fe94a437bd0821b111044c7ddb56502ef",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/qa-auth.caddy": "d2f62ebca636c8dcfb5635c647a68acf63c8b45f9274b40904ea3a8d959cd155",
    "/var/lib/docker/volumes/n8-interior-local_tls-config/_data/clipmkr-relocation/support-tls.caddy": "543180ab40268f2411bdd25757407083b945cecc095699eb9d9a77870809198e"
  },
  "fixedUpstream": "172.29.8.1:5811"
};
const mutationIds = ['camera01above','camera02below','screen02shrink','fullcanvaspanecrop','musicv1silentupgrade','pinsoracleswap'];
function need(ok, message) { if (!ok) throw new Error(`zoom conformance: ${message}`); }
function hash(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function run(binary, args, cwd) {
  const env={...process.env};
  if(binary==='docker') {args=['--host','unix:///var/run/docker.sock',...args];delete env.DOCKER_CONTEXT;delete env.DOCKER_HOST;delete env.DOCKER_TLS_VERIFY;delete env.DOCKER_CERT_PATH;}
  const r = spawnSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024 });
  need(!r.error && r.status === 0 && !r.signal, `read command failed: ${binary}`);
  return args[0] === 'show' ? r.stdout : r.stdout.trim();
}
function privatePath(path, repo) {
  need(typeof path === 'string' && isAbsolute(path) && normalize(path) === path && !/[\0\r\n]/.test(path), 'absolute private path required');
  need(realpathSync(path) === path && !path.startsWith(repo + sep), 'private path must be outside Git without symlinks');
  const s = lstatSync(path), p = lstatSync(dirname(path));
  need(s.isFile() && s.uid === process.getuid() && (s.mode & 0o777) === 0o600, 'owned 0600 evidence file required');
  need(p.isDirectory() && p.uid === process.getuid() && (p.mode & 0o077) === 0, 'owned private parent required');
}
function liveProbe(binding, images) {
  const containers = {};
  for (const [service, expected] of Object.entries(binding.containers)) {
    const [c] = JSON.parse(run('docker', ['inspect', expected.containerId]));
    containers[service] = { containerId: c.Id, imageId: c.Image, project: c.Config.Labels['com.docker.compose.project'],
      service: c.Config.Labels['com.docker.compose.service'],
      volumes: c.Mounts.map(m => ({type:m.Type,name:m.Name ?? null,destination:m.Destination})),
      networks: Object.keys(c.NetworkSettings.Networks).sort(), ports: c.HostConfig.PortBindings ?? {} };
  }
  const imageRevisions = {};
  for (const entry of [...Object.values(images.images), ...Object.values(images.c0.images)]) {
    imageRevisions[entry.id] = run('docker', ['image','inspect','--format','{{index .Config.Labels "org.opencontainers.image.revision"}}',entry.id]);
  }
  return { machineIdSha256: hash(readFileSync('/etc/machine-id')), containers, imageRevisions };
}
function comparable(c) {
  return { containerId:c.containerId, imageId:c.imageId, project:c.project, service:c.service,
    volumes:[...c.volumes].sort((a,b)=>a.destination.localeCompare(b.destination)), networks:[...c.networks].sort(), ports:c.ports };
}
function stable(v) { return JSON.stringify(v, (_k,x) => x && typeof x === 'object' && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])) : x); }

// Vitest 3.2.7 JSON omits a runtime-error counter and ignores onFinished(_errors).
export function validateZoomVitestEvidence(report, log, phase='green') {
  need(typeof log==='string' && log.trim().length>0,'Vitest log missing');
  const plain=log.replace(/\x1b\[[0-9;]*m/g,'');
  need(!/Unhandled\s+(?:Errors?|Rejections?)|Uncaught\s+Exception|Vitest caught \d+ unhandled|Some tests are still running when generating the JSON report|Failed Suites\s+\d+/i.test(plain),'Vitest runtime marker in log');
  need(report && (!Object.hasOwn(report,'numRuntimeErrorTestSuites') || report.numRuntimeErrorTestSuites===0),'Vitest runtime suites failed');
  const keys=['numTotalTestSuites','numPassedTestSuites','numFailedTestSuites','numPendingTestSuites','numTotalTests','numPassedTests','numFailedTests','numPendingTests','numTodoTests'];
  need(keys.every(k=>Number.isInteger(report[k]) && report[k]>=0) && report.numTotalTestSuites>0
    && report.numTotalTestSuites===report.numPassedTestSuites+report.numFailedTestSuites+report.numPendingTestSuites
    && report.numPendingTestSuites===0 && Array.isArray(report.testResults) && report.testResults.length>0,'invalid Vitest suite counters');
  const actual=[];
  for(const suite of report.testResults) {
    need(typeof suite.name==='string' && suite.name.length>0 && suite.message==='' && Array.isArray(suite.assertionResults)
      && suite.assertionResults.length>0,'Vitest file error or zero assertions');
    need(suite.status===(suite.assertionResults.some(a=>a.status==='failed')?'failed':'passed'),'Vitest file status mismatch');
    actual.push(...suite.assertionResults);
  }
  const counts={passed:0,failed:0,pending:0,skipped:0,todo:0};
  for(const a of actual) {
    need(typeof a.fullName==='string' && a.fullName.length>0 && Object.hasOwn(counts,a.status) && Array.isArray(a.failureMessages)
      && (a.status==='failed' || a.failureMessages.length===0),'invalid Vitest assertion');counts[a.status]++;
  }
  need(report.numTotalTests===actual.length && report.numPassedTests===counts.passed && report.numFailedTests===counts.failed
    && report.numPendingTests===counts.pending+counts.skipped && report.numTodoTests===counts.todo,'Vitest assertion counters mismatch');
  need(phase==='red'?report.success===false && counts.failed>0 && report.numFailedTestSuites>0
    :report.success===true && counts.failed===0 && counts.passed>0 && report.numFailedTestSuites===0,'Vitest phase incomplete');
  return actual;
}

// Both entry paths derive the same two permitted states from immutable original evidence.
export function deriveZoomLayoutIngressState(source, config, ingress) {
  need(hash(Buffer.from(source))===ingress.sourceConfig.sha256,'original ingress source mismatch');
  const closedSource=source.replace(/^(\s*)import relocation-proxy 172\.29\.8\.1:5811\s*$/gm,'$1respond 503')
    .replace(/^(\s*)reverse_proxy 172\.29\.8\.1:5811 \{\n\s*import cutover-proxy-options \{args\[0\]\}\n\s*\}/gm,'$1respond 503');
  need(source.split(ingress.fixedUpstream).length===4 && !closedSource.includes(ingress.fixedUpstream),'ingress source anchors mismatch');
  const closedConfig=structuredClone(config);
  for(const path of ingress.upstreamPaths) {
    const keys=path.split('/upstreams/')[0].slice(1).split('/'),last=keys.pop();
    const parent=keys.reduce((v,k)=>v[k],closedConfig),handler=parent[last];
    need(handler.handler==='reverse_proxy' && handler.upstreams?.length===1 && handler.upstreams[0].dial===ingress.fixedUpstream,'ingress handler mismatch');
    parent[last]={handler:'static_response',status_code:503};
  }
  return {source,closedSource,closedConfig};
}

export function verifyZoomLayoutConformance(options, dependencies = {}) {
  const repo = dependencies.repo ?? root;
  const git = args => run('git', args, repo);
  const bindings = {};
  function read(path, expected) {
    privatePath(path, repo);
    const bytes = readFileSync(path), digest = hash(bytes);
    need(!expected || expected === digest, 'transitive file digest mismatch');
    if (bindings[path]) need(bindings[path] === digest, 'file changed while validating');
    bindings[path] = digest;
    return bytes;
  }
  function ref(r) { need(r && /^[a-f0-9]{64}$/.test(r.sha256), 'hashed evidence reference required'); return read(r.path, r.sha256); }
  function json(r) { return JSON.parse(ref(r)); }
  need(options && /^[a-f0-9]{40}$/.test(options.candidate), 'full candidate commit required');
  const candidate = options.candidate, tree = git(['rev-parse',`${candidate}^{tree}`]);
  need(git(['rev-parse','HEAD']) === candidate, 'candidate is not HEAD');
  need(!git(['status','--porcelain','--untracked-files=no']), 'tracked source drift');
  const untracked = git(['ls-files','--others','--exclude-standard','apps','packages','scripts','tests']).split('\n');
  need(!untracked.some(p=>/\.(?:ts|tsx|mjs|sql|css)$/.test(p) && !p.includes('/artifacts/')), 'untracked executable source');
  const approval = JSON.parse(read(options.referenceApproval));
  need(approval.commit === approvalCommit && approval.originalCommit === originalCommit && approval.originalSha256 === originalHash
    && approval.uiSha256 === uiHash, 'unapproved reference identity');
  need(hash(readFileSync(resolve(repo,feature,'owner-approval.md'))) === hash(Buffer.from(git(['show',`${c0Commit}:${feature}owner-approval.md`]))), 'owner approval receipt drift');
  const approvedPins = git(['show',`${approvalCommit}:${feature}reference/pins.json`]);
  need(hash(readFileSync(resolve(repo,feature,'reference/pins.json'))) === hash(Buffer.from(approvedPins)), 'approved pins drift');
  for (const f of [...JSON.parse(approvedPins).files,...JSON.parse(approvedPins).proposal.files]) {
    need(hash(readFileSync(resolve(repo,feature,'reference',f.file))) === f.sha256, 'approved reference file drift');
  }
  need(hash(Buffer.from(git(['show',`${originalCommit}:${originalPath}`]))) === originalHash, 'original Git object mismatch');
  need(hash(readFileSync(resolve(repo,originalPath))) === originalHash, 'original worktree mismatch');
  need(hash(readFileSync(resolve(repo,feature,'reference/selector-v2-mockup.html'))) === uiHash, 'UI approval mismatch');
  const fixturePath = 'tests/fixtures/zoom-layout-original.json';
  const derived = hash(Buffer.from(git(['show',`${c0Commit}:${fixturePath}`])));
  need(derived === oracleHash && hash(readFileSync(resolve(repo,fixturePath))) === derived, 'derived independent oracle drift');
  const evidence = JSON.parse(read(options.evidence)), images = JSON.parse(read(options.images));
  need(evidence.schema === 1 && evidence.state === 'PRE-APPLY' && evidence.candidate === candidate && evidence.tree === tree, 'candidate evidence mismatch');
  need(images.candidate === candidate && images.tree === tree && Object.keys(images.images ?? {}).sort().join(',') === 'web,worker', 'image source mismatch');
  need(images.c0?.revision === c0Commit, 'C0 compatibility source required');
  const c0Pinned = {web:'sha256:79590752c3dac432b75ea5bb6254d4cf86c94e0fdd7de153f00777b1b116107e',worker:'sha256:5105ac5234f9503942f17fde27694a5b0ceafb8acdd6cd0a593acbacb0d6c365'};
  for (const [k,v] of Object.entries(images.c0.images ?? {})) need(v.id === c0Pinned[k] && v.ociRevision === c0Commit,'C0 immutable image mismatch');
  need(Object.keys(images.c0.images ?? {}).sort().join(',') === 'web,worker','C0 images missing');
  for (const image of Object.values(images.images)) need(/^sha256:[a-f0-9]{64}$/.test(image.id) && image.ociRevision === candidate,'invalid candidate image');
  const plan = readFileSync(resolve(repo,feature,'06_implementation_plan.md'),'utf8');
  const targets = plan.split('EXPECTED_CODE_TARGETS:')[1]?.trim().split('\n').map(l=>l.slice(2));
  need(targets?.length > 0 && targets.every(p => evidence.sourceHashes?.[p] === hash(readFileSync(resolve(repo,p)))), 'source hash inventory missing/mismatch');
  function terminal(record, revision = candidate, exit = 0) {
    need(record && record.candidate === revision && record.tree === git(['rev-parse',`${revision}^{tree}`]) && record.exit === exit && record.signal === null
      && Number.isInteger(record.pid) && record.pid > 0 && Array.isArray(record.argv) && record.argv.length > 0
      && record.argv.every(a=>typeof a === 'string' && a.length > 0)
      && Number.isFinite(Date.parse(record.startedAt)) && Date.parse(record.finishedAt) >= Date.parse(record.startedAt), 'nonterminal or mismatched command evidence');
    need(ref(record.log).length > 0, 'empty command log');
  }
  const seen = new Map(), compatibilitySeen = new Set();
  function assertions(record, revision = candidate, collect = true) {
    terminal(record, revision);
    const report = json(record.report);
    validateZoomVitestEvidence(report,ref(record.log).toString('utf8'));
    let count = 0, passed = 0;
    for (const suite of report.testResults) {
      need(Array.isArray(suite.assertionResults) && suite.assertionResults.length > 0, 'zero assertions');
      for (const a of suite.assertionResults) {
        need(typeof a.fullName === 'string' && a.fullName && ['passed','pending','skipped','todo'].includes(a.status), 'invalid/failed assertion');
        count++; if(a.status === 'passed') passed++;
        if (collect === 'compatibility' && a.status === 'passed') compatibilitySeen.add(a.fullName);
        if (collect === true) {
          const file = suites.find(f => suite.name === resolve(repo,f) || suite.name.endsWith('/' + f));
          if (!file) continue;
          const key = file + '\0' + a.fullName;
          seen.set(key, seen.get(key) === 'passed' ? 'passed' : a.status);
        }
      }
    }
    need(passed > 0 && report.numPassedTests === passed && report.numTotalTests === count, 'empty/inconsistent assertion counters');
    return passed;
  }
  need(Array.isArray(evidence.tests) && evidence.tests.length > 0, 'test evidence missing');
  for (const record of evidence.tests) assertions(record);
  for (const file of suites) need([...seen].some(([k,v])=>k.startsWith(file+'\0') && v==='passed'), `mandatory suite missing: ${file}`);
  need([...seen.values()].every(v=>v === 'passed'), 'mandatory assertion skipped/unexecuted');
  for(const [file,prefix,count] of named) need([...seen.keys()].filter(k=>k.startsWith(`tests/${file}.test.ts\0`) && k.split('\0')[1].includes(prefix)).length >= count, `mandatory case missing: ${prefix}`);
  for (const name of ['lint','typecheck','build']) { need(evidence.checks?.[name], `missing ${name}`); terminal(evidence.checks[name]); }
  const review = json(evidence.review);
  need(review.candidate === candidate && review.tree === tree && review.model === 'gpt-6-astra' && review.effort === 'xhigh'
    && typeof review.sessionId === 'string' && review.sessionId.length > 8 && review.authorModel === 'gpt-6.1-sol'
    && Array.isArray(review.findings) && review.findings.every(f=>f.status === 'closed') && ref(review.raw).length > 0, 'independent review missing/open');
  for (const path of ['01_requirements.md','03_adr/001-original-composition-compatibility.md','05_architecture.md','06_implementation_plan.md'])
    need(review.inputHashes?.[path] === hash(readFileSync(resolve(repo,feature,path))), 'review inputs drift');
  need(Array.isArray(evidence.c0Tests) && evidence.c0Tests.length > 0, 'C0 compatibility evidence missing');
  let c0Count=0;
  for (const record of evidence.c0Tests) c0Count+=assertions(record,c0Commit,'compatibility');
  need(c0Count>=2,'C0 compatibility cases missing');
  for(const prefix of ['v2_parser_is_strict_and_v1_canonical_bytes_are_unchanged','033_preserves_v1_rows_and_accepts_only_supported_v2_intents',
    'music_rerender_preserves_each_published_composition_version','cta_rerender_preserves_mixed_composition_versions',
    'C0 saved v2-01','C0 saved v2-02','C0 unknown v1 submission','C0 unknown v2 submission'])
    need([...compatibilitySeen].filter(n=>n.includes(prefix)).length >= (prefix==='music_rerender_preserves_each_published_composition_version'?4:1),`C0 compatibility case missing: ${prefix}`);
  const rehearsal=json(evidence.rehearsal);
  assertions(rehearsal.run,candidate,false);
  const rehearsalCases=json(rehearsal.run.report).testResults.flatMap(s=>s.assertionResults).filter(a=>a.status==='passed').map(a=>a.fullName);
  need(stable(rehearsal.images)===stable(images) && rehearsal.isolated===true && rehearsal.databaseName?.endsWith('_test')
    && Array.isArray(rehearsal.assertions) && ['v1_v2_read','pending_v2_replay','music_cta_versions','old_mp4_access','033_retained'].every(name=>
      rehearsal.assertions.some(a=>a.name===name && a.status==='passed') && rehearsalCases.some(n=>n.includes(name))), 'isolated C1 to C0 rehearsal missing');
  const mutations = json(evidence.mutations);
  need(mutations.candidate === candidate && mutations.tree === tree && mutations.results?.length === mutationIds.length, 'mutation evidence missing');
  for (const id of mutationIds) {
    const m = mutations.results.find(r=>r.id===id);
    need(m && m.file && evidence.sourceHashes[m.file] === m.sourceHash && m.green?.sourceSha256 === m.sourceHash && /^[a-f0-9]{64}$/.test(m.red?.sourceSha256) && m.red.sourceSha256 !== m.sourceHash, 'mutation source binding missing');
    need(m && m.sourceRestored === true && m.red?.exit === 1 && m.red.signal === null && m.green?.exit === 0, `mutation incomplete: ${id}`);
    terminal(m.red,candidate,1);
    const red = json(m.red.report);
    const failed = validateZoomVitestEvidence(red,ref(m.red.log).toString('utf8'),'red').filter(a=>a.status==='failed');
    need(failed.length > 0 && red.numFailedTests === failed.length && failed.every(a=>a.failureMessages?.some(s=>/AssertionError|expected|zoom conformance:.*(?:drift|mismatch)/i.test(s))
      && !a.failureMessages.some(s=>/SyntaxError|Cannot find|Failed to resolve|Transform failed|ReferenceError/.test(s))), 'mutation must fail behaviorally');
    const title=id==='fullcanvaspanecrop'?'v2 native original extents and every live camera frame':id==='musicv1silentupgrade'?'music_rerender_preserves_each_published_composition_version':id==='pinsoracleswap'?'positive_ordered_path':'original_mockup_01_02_composition_conformance';
    need(failed.some(a=>a.fullName.includes(title)), 'mutation RED tested unrelated case');
    need(ref(m.red.log).length > 0, 'mutation RED log missing'); assertions(m.green,candidate,false);
    need(json(m.green.report).testResults.flatMap(s=>s.assertionResults).some(a=>a.status==='passed' && a.fullName.includes(title)), 'mutation GREEN tested unrelated case');
  }
  const framing=evidence.framingMutations;terminal(framing);
  const framingResults=json(framing.results),framingIds=['center-instead-of-dual','vertical-dual','narrow-dual','watermark-first','odd-window','both-panels-left','ass-before-assembly'];
  need(Array.isArray(framingResults) && framingResults.length===framingIds.length,'mandatory framing mutations missing');
  for(const id of framingIds) {
    const title={'center-instead-of-dual':'landscape uses both','vertical-dual':'vertical or square','narrow-dual':'narrow','watermark-first':'assembly precedes','odd-window':'real odd source','both-panels-left':'real render','ass-before-assembly':'assembly precedes'}[id];
    const entry=framingResults.find(r=>r.id===id);
    need(entry?.red?.exit===1 && entry.green?.exit===0,'framing mutation did not complete');
    for(const phase of ['red','green']) {
      const report=JSON.parse(read(resolve(dirname(framing.results.path),`${id}-${phase}.json`)));
      const log=read(resolve(dirname(framing.results.path),`${id}-${phase}.txt`)).toString('utf8');
      const actual=validateZoomVitestEvidence(report,log,phase);
      const failed=actual.filter(a=>a.status==='failed'),passed=actual.filter(a=>a.status==='passed');
      need(actual.length>0 && report.numTotalTests===actual.length && report.numFailedTests===failed.length && report.numPassedTests===passed.length && entry[phase].failed===failed.length && entry[phase].passed===passed.length,'framing mutation assertion mismatch');
      if(phase==='red')need(failed.some(a=>a.fullName.includes(title)) && failed.every(a=>a.failureMessages?.some(m=>/AssertionError|expected/i.test(m))
        && !a.failureMessages.some(m=>/SyntaxError|Cannot find|Failed to resolve|Transform failed|ReferenceError/.test(m))),'framing mutation RED must be behavioral');
      else need(passed.some(a=>a.fullName.includes(title)) && failed.length===0 && report.success===true,'framing mutation GREEN missing');
    }
  }
  const framingSources=['scripts/test-framing-mutations.mjs','apps/worker/src/render/format.ts','apps/worker/src/render/ffmpeg.ts','tests/framing.test.ts','tests/framing-media.test.ts'];
  need(framing.argv.some(a=>a==='scripts/test-framing-mutations.mjs' || a.endsWith('/scripts/test-framing-mutations.mjs'))
    && framing.argv.at(-1)===dirname(framing.results.path),'framing runner origin missing');
  for(const file of framingSources)need(framing.sourceHashes?.[file]===hash(readFileSync(resolve(repo,file))),'framing source binding mismatch');
  const binding = json(evidence.host);
  need(binding.repo === '/home/clipmkr' && binding.publicTarget === '77.83.87.178' && binding.origin === 'https://clipmkr.ru'
    && binding.machineIdSha256 === '1afc81d837f8b8d306903c2db510f8ed7a22b71ec65976ba73b7e81ea6689c10', 'wrong current VPS');
  need(binding.composePath === (dependencies.composePath ?? '/root/.config/clipmkr/relocate-workspace-20261109/activation-20261110/app-subset.compose.private.json'), 'wrong compose path');
  const ingress=binding.ingress, pins=dependencies.ingressPins??ingressPins;
  need(ingress && stable(Object.fromEntries(Object.keys(pins).filter(k=>k!=='startedAt').map(k=>[k,ingress[k]])))===stable(Object.fromEntries(Object.entries(pins).filter(([k])=>k!=='startedAt')))
    && Number.isFinite(Date.parse(ingress.startedAt)),'unapproved ingress binding');
  const ingressConfig=json(ingress.activeConfig);
  need(ingress.activeConfig.sha256===ingress.activeConfigSha256,'ingress config evidence mismatch');
  const paths=[];
  function walk(value,path='') {
    if(!value || typeof value!=='object')return;
    for(const [key,v] of Object.entries(value)) {
      const next=path+'/'+key;
      if(key==='dial' && v===ingress.fixedUpstream)paths.push(path);
      walk(v,next);
    }
  }
  walk(ingressConfig);
  need(paths.length===4 && stable(paths.sort())===stable([...ingress.upstreamPaths].sort()),'ingress target paths mismatch');
  const originalSource=ingress.originalSource?ref(ingress.originalSource).toString('utf8'):readFileSync(ingress.sourceConfig.path,'utf8');
  const ingressDerived=deriveZoomLayoutIngressState(originalSource,ingressConfig,ingress);
  const disk=readFileSync(ingress.sourceConfig.path,'utf8');
  need(disk===ingressDerived.source || disk===ingressDerived.closedSource,'ingress source drift');
  const ingressState={source:disk===ingressDerived.source?'open':'closed',active:null};
  for(const [path,digest] of Object.entries(ingress.importHashes))
    need(hash(readFileSync(path))===digest,'ingress source/import drift');
  const probeDocker=dependencies.docker??(args=>run('docker',args));
  const actualIngress=(dependencies.ingressProbe??(i=>{
    const [c]=JSON.parse(probeDocker(['inspect',i.containerId]));
    return {containerId:c.Id,imageId:c.Image,startedAt:c.State.StartedAt,running:c.State.Running,
      mounts:c.Mounts.map(m=>({source:m.Source,destination:m.Destination,rw:m.RW})),
      config:JSON.parse(probeDocker(['exec',i.containerId,'wget','-q','-O','-','http://127.0.0.1:2019/config/']))};
  }))(ingress);
  need(actualIngress.containerId===ingress.containerId && actualIngress.imageId===ingress.imageId && actualIngress.startedAt===ingress.startedAt
    && actualIngress.running===true && stable(actualIngress.mounts)===stable(ingress.mounts),'live ingress mismatch');
  ingressState.active=stable(actualIngress.config)===stable(ingressConfig)?'open':stable(actualIngress.config)===stable(ingressDerived.closedConfig)?'closed':null;
  need(ingressState.active!==null,'live ingress mismatch');
  if(ingressState.source!==ingressState.active) {
    const [web]=JSON.parse(probeDocker(['inspect',binding.containers.web.containerId]));
    need(web.Id===binding.containers.web.containerId && web.Image===binding.containers.web.imageId && web.State.Running===false
      && web.State.Status==='exited' && !web.State.Restarting && !web.State.Paused && !web.State.Dead,'mixed ingress requires exact stopped web');
  }
  read(binding.composePath, binding.composeSha256);
  if (!dependencies.composePath) need(binding.composeSha256 === '19865efa20b5e3415c13326a92d4f33e745911aa957ff3ec6ec67de9b4d0dbba', 'approved compose drift');
  need(Object.keys(binding.containers ?? {}).sort().join(',') === 'db,redis,web,worker-llm,worker-stt,worker-video', 'resource inventory incomplete');
  const observed = (dependencies.probe ?? liveProbe)(binding,images);
  need(observed.machineIdSha256 === binding.machineIdSha256, 'machine identity mismatch');
  for (const [service,c] of Object.entries(binding.containers)) {
    need(c.project === 'clipmkr-stage-20261028' && c.service === service && /^[a-f0-9]{64}$/.test(c.containerId), 'resource identity invalid');
    need(stable(comparable(observed.containers[service])) === stable(comparable(c)), `resource mismatch: ${service}`);
  }
  for(const [service,id] of Object.entries({db:'058637c0d0d06315e9d86cf577b4d13a75a4b681bf382bf363607679116e32fa',redis:'7cd8b347b8820424d518ccfdf76f752d3d3db3eb366e1a22e40c89078e34084f'})) need(binding.containers[service].containerId===id,'persistent resource identity mismatch');
  for(const i of [...Object.values(images.images),...Object.values(images.c0.images)]) need(observed.imageRevisions[i.id]===i.ociRevision,'actual image OCI mismatch');
  return { candidate, tree, bindings, binding, images, ingressConfig, derivedIngress:ingressDerived, ingressState, tests:seen.size, state:'PRE-APPLY', postApply:'pending' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), keys = ['--candidate','--reference-approval','--evidence','--images'];
    need(args.length===8 && keys.every(k=>args.filter(a=>a===k).length===1), 'usage: --candidate SHA --reference-approval PATH --evidence PATH --images PATH');
    const get = k=>args[args.indexOf(k)+1];
    const result = verifyZoomLayoutConformance({ candidate:get(keys[0]),referenceApproval:get(keys[1]),evidence:get(keys[2]),images:get(keys[3]) });
    console.log(JSON.stringify({candidate:result.candidate,tree:result.tree,tests:result.tests,state:result.state,postApply:result.postApply}));
  } catch (error) { console.error(error.message?.startsWith('zoom conformance:')?error.message:'zoom conformance: invalid input or external response'); process.exitCode=1; }
}
