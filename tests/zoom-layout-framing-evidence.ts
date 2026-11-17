import { expect, it } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { verifyZoomLayoutConformance } from '../scripts/check-zoom-layout-conformance.mjs';

type EvidenceRef = { path: string; sha256: string };
type FramingEvidenceFixture = {
  privateDir: string;
  options: Parameters<typeof verifyZoomLayoutConformance>[0];
  deps: NonNullable<Parameters<typeof verifyZoomLayoutConformance>[1]>;
  evidence: { framingMutations: { results: EvidenceRef } };
  save(data: unknown): EvidenceRef;
};

export function registerFramingNativeEvidenceTests(makeFixture: () => FramingEvidenceFixture, repo: string) {
  // Invented unit evidence mirrors the native failure shape; actual mutation artifacts stay private.
  const oddWindowFailure='Error: Command failed: ffmpeg -v error -f lavfi -i color=red:s=1923x1081,format=yuv444p -vf crop=961:854:962:56:exact=1 -frames:v 1 -c:v libx264 -pix_fmt yuv420p -threads 1 /tmp/n5-framing-odd-unit/window.mp4\n'
    +'[libx264 @ 0x123abc] width not divisible by 2 (961x854)\n'
    +'[vost#0:0/libx264 @ 0x456def] Error while opening encoder - maybe incorrect parameters such as bit_rate, rate, width or height.\n';
  it.each(['native','other-id','other-test','other-file','source','crop','pixel-format','wrong-width','missing-width','missing-command','missing-encoder','generic-encoder','spawn','import','runtime'] as const)(
    'framing_odd_window_native_RED_%s_is_narrowly_classified',kind=>{
      const f=makeFixture(),id=kind==='other-id'?'both-panels-left':'odd-window',path=join(f.privateDir,`${id}-red.json`),raw=JSON.parse(readFileSync(path,'utf8'));
      const suite=raw.testResults[0],assertion=suite.assertionResults[0];
      suite.name=join(repo,'tests/framing-media.test.ts');
      assertion.fullName='FR-1 real odd source: exact window encodes as yuv420p without implicit crop rounding';
      assertion.failureMessages=[oddWindowFailure];
      if(kind==='other-id'){
        suite.assertionResults.push({fullName:'FR-1 real render: target still fails behaviorally',status:'failed',failureMessages:['AssertionError: expected right panel']});
        raw.numTotalTests=raw.numFailedTests=2;
        const results=JSON.parse(readFileSync(f.evidence.framingMutations.results.path,'utf8'));results.find((r:{id:string})=>r.id===id).red.failed=2;
        f.evidence.framingMutations.results=f.save(results);writeFileSync(f.options.evidence,JSON.stringify(f.evidence));
      }
      if(kind==='other-test')assertion.fullName='FR-1 real odd source: unrelated native encoding';
      if(kind==='other-file')suite.name=join(repo,'tests/framing.test.ts');
      const replace=(from:string,to:string)=>{assertion.failureMessages[0]=assertion.failureMessages[0].replace(from,to);};
      if(kind==='source')replace('1923x1081','1920x1080');
      if(kind==='crop')replace('crop=961:854:962:56:exact=1','crop=960:854:962:56:exact=1');
      if(kind==='pixel-format')replace('yuv420p','yuv444p');
      if(kind==='wrong-width')replace('width not divisible by 2 (961x854)','width not divisible by 2 (963x854)');
      if(kind==='missing-width')replace('[libx264 @ 0x123abc] width not divisible by 2 (961x854)\n','');
      if(kind==='missing-command')assertion.failureMessages[0]=assertion.failureMessages[0].split('\n').slice(1).join('\n');
      if(kind==='missing-encoder')replace('Error while opening encoder','Some other encoder error');
      if(kind==='generic-encoder')assertion.failureMessages=['Error: Error while opening encoder'];
      if(kind==='spawn')assertion.failureMessages=['Error: spawn ffmpeg ENOENT'];
      if(kind==='import')assertion.failureMessages.push('ReferenceError: native import missing');
      if(kind==='runtime')raw.numRuntimeErrorTestSuites=1;
      writeFileSync(path,JSON.stringify(raw));
      if(kind==='native')expect(verifyZoomLayoutConformance(f.options,f.deps).tests).toBeGreaterThan(0);
      else expect(()=>verifyZoomLayoutConformance(f.options,f.deps)).toThrow();
    });
}
