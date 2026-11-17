#!/usr/bin/env node
// Disposable checkout: production source, original HTML and approval pins are never edited.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, readdirSync, symlinkSync, existsSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateZoomVitestEvidence } from './check-zoom-layout-conformance.mjs';
function need(ok,message) {if(!ok)throw new Error(message);}
function hash(path) {return createHash('sha256').update(readFileSync(path)).digest('hex');}
function ref(path) {return {path,sha256:hash(path)};}
export async function runZoomLayoutMutationAttempt(options, dependencies={}) {
  const {output,checkout,id,phase,test,title,candidate,tree,sourcePath}=options;
  need(/^[a-z0-9-]+$/.test(id) && ['red','green'].includes(phase),'invalid mutation attempt');
  const attempt=mkdtempSync(join(output,`${id}-${phase}-`));
      const reportPath=join(attempt,'vitest.json'),logPath=join(attempt,'process.log');
      const argv=[process.execPath,join(checkout,'node_modules/vitest/vitest.mjs'),'run',test,'-t',title,'--reporter=default','--reporter=json',`--outputFile=${reportPath}`];
      const startedAt=new Date().toISOString();
      const r=await new Promise((accept,reject)=>{
        const child=(dependencies.spawn??spawn)(argv[0],argv.slice(1),{cwd:checkout,detached:true,env:process.env});
        let stdout='',stderr='',timedOut=false,overflow=false;
        const kill=signal=>{try{process.kill(-child.pid,signal);}catch(error){if(error.code!=='ESRCH')throw error;}};
        const timer=setTimeout(()=>{timedOut=true;kill('SIGKILL');},240000);
        child.stdout.on('data',b=>{stdout+=b;if(stdout.length>32*1024*1024){overflow=true;kill('SIGKILL');}});
        child.stderr.on('data',b=>{stderr+=b;if(stderr.length>32*1024*1024){overflow=true;kill('SIGKILL');}});
        child.on('error',error=>{clearTimeout(timer);reject(error);});
        child.on('close',(status,signal)=>{clearTimeout(timer);if(timedOut||overflow)kill('SIGKILL');accept({pid:child.pid,status,signal,stdout,stderr,error:timedOut||overflow});});
      });
      const finishedAt=new Date().toISOString();
      writeFileSync(logPath,`${r.stdout??''}${r.stderr??''}`,{mode:0o600,flag:'wx'});
      need(!r.error && !r.signal,'mutation subprocess did not reach terminal outcome');
      need(existsSync(reportPath),'fresh mutation report missing');
      const report=JSON.parse(readFileSync(reportPath,'utf8'));
      const assertions=validateZoomVitestEvidence(report,`${r.stdout??''}${r.stderr??''}`,phase);
      need(assertions.some(a=>a.fullName?.includes(title)),'mutation has no relevant assertions');
      const failed=assertions.filter(a=>a.status==='failed'),passed=assertions.filter(a=>a.status==='passed');
      if(phase==='red')need(r.status===1 && failed.some(a=>a.fullName.includes(title)) && failed.every(a=>a.failureMessages.some(m=>/AssertionError|expected|zoom conformance:.*(?:drift|mismatch)/i.test(m))
        && !a.failureMessages.some(m=>/SyntaxError|ReferenceError|Cannot find|Failed to resolve|Transform failed/.test(m))),'mutation RED must be behavioral');
      else need(r.status===0 && passed.some(a=>a.fullName.includes(title)) && failed.length===0 && report.success===true,'restored mutation must pass actual tests');
      return {candidate,tree,argv,sourceSha256:hash(sourcePath),pid:r.pid,exit:r.status,signal:r.signal,startedAt,finishedAt,report:ref(reportPath),log:ref(logPath),passed:passed.length,failed:failed.length};
}

async function main() {
const project=process.cwd(), requested=resolve(process.argv[2]??'/tmp/zoom-layout-qe/conformance');
process.umask(0o077);mkdirSync(requested,{recursive:true,mode:0o700});
const output=mkdtempSync(join(requested,'attempt-'));
console.log(`mutation attempt output: ${output}`);
function command(binary,args,cwd=project) {
  const r=spawnSync(binary,args,{cwd,encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
  need(!r.error && !r.signal && r.status===0,`command failed: ${binary}`);return r.stdout.trim();
}
const candidate=command('git',['rev-parse','HEAD']),tree=command('git',['rev-parse','HEAD^{tree}']);
need(!command('git',['status','--porcelain','--untracked-files=no']),'freeze/commit source before mutation run');
need(!command('git',['ls-files','--others','--exclude-standard','apps','packages','scripts','tests']).split('\n').some(p=>/\.(?:ts|tsx|mjs|sql|css)$/.test(p) && !p.includes('/artifacts/')),'untracked source must be committed before mutation run');
const directory=mkdtempSync(join(tmpdir(),'zoom-mutations-')),checkout=join(directory,'repo');
const mutations=[
  ['camera01above','packages/shared/src/screen-layout.ts','x: width * .72, y: height * .50','x: width * .72, y: height * .10','tests/screen-layout-conformance.test.ts','original_mockup_01_02_composition_conformance'],
  ['camera02below','packages/shared/src/screen-layout.ts','x: width * .62, y: height * .10','x: width * .62, y: height * .80','tests/screen-layout-conformance.test.ts','original_mockup_01_02_composition_conformance'],
  ['screen02shrink','packages/shared/src/screen-layout.ts','x: 0, y: height * .28, width, height: height * .426','x: 0, y: height * .28, width: width * .6, height: height * .426','tests/screen-layout-conformance.test.ts','original_mockup_01_02_composition_conformance'],
  ['fullcanvaspanecrop','apps/worker/src/render/screen-layout.ts','layout.version === 2 ? 1920 : 800','layout.version === 2 ? 800 : 800','tests/screen-layout-media.test.ts','v2 native original extents and every live camera frame'],
  ['musicv1silentupgrade','packages/db/src/render.ts','parseScreenFaceLayout(row.layout), words: transcript.words','parseScreenFaceLayout({...row.layout as object,version:2,focus:null}), words: transcript.words','tests/clip-music-choice.integration.test.ts','music_rerender_preserves_each_published_composition_version'],
  ['pinsoracleswap','tests/fixtures/zoom-layout-original.json','"x": 777.6','"x": 100','tests/zoom-layout-release.test.ts','positive_ordered_path'],
];
const results=[];
try {
  command('git',['clone','--quiet','--shared',project,checkout]);
  need(command('git',['rev-parse','HEAD'],checkout)===candidate,'checkout source mismatch');
  // Reuse installed third-party dependencies, redirect every workspace package to this checkout.
  mkdirSync(join(checkout,'node_modules'));
  for(const item of readdirSync(join(project,'node_modules'))) {
    if(item!=='@clipmaker')symlinkSync(join(project,'node_modules',item),join(checkout,'node_modules',item));
  }
  mkdirSync(join(checkout,'node_modules/@clipmaker'));
  for(const parent of ['apps','packages'])for(const name of readdirSync(join(checkout,parent))) {
    const path=join(checkout,parent,name);
    try {
      const pkg=JSON.parse(readFileSync(join(path,'package.json'),'utf8'));
      if(pkg.name?.startsWith('@clipmaker/'))symlinkSync(path,join(checkout,'node_modules',pkg.name));
    } catch(error) {if(error.code!=='ENOENT')throw error;}
  }
  for(const [id,file,before,after,test,title] of mutations) {
    const path=join(checkout,file),source=readFileSync(path,'utf8'),sourceHash=hash(path);
    need(source.split(before).length===2,`mutation anchor absent/ambiguous: ${id}`);
    const run=phase=>runZoomLayoutMutationAttempt({output,checkout,id,phase,test,title,candidate,tree,sourcePath:path});
    let red,green;
    try {writeFileSync(path,source.replace(before,after));red=await run('red');}
    finally {writeFileSync(path,source);need(hash(path)===sourceHash,'mutation source restoration failed');}
    green=await run('green');
    results.push({id,file,sourceHash,sourceRestored:true,red,green});
    writeFileSync(join(output,'results.json'),JSON.stringify({candidate,tree,results},null,2)+'\n');
    console.log(`${id}: RED ${red.failed}, restored GREEN ${green.passed}`);
  }
} catch(error) {
  writeFileSync(join(output,'incomplete.json'),JSON.stringify({candidate,tree,completed:results.map(r=>r.id),error:error.message}));
  console.error(error.message);process.exitCode=1;
} finally {rmSync(directory,{recursive:true,force:true});}

}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))await main();
