import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';

test('K2 accepts Next routes and rejects malformed or traversing paths', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clipmkr-k2-paths-'));
  const feature = join(directory, 'feature'); mkdirSync(feature);
  const checker = resolve('.agents/skills/feature-adr/scripts/check-plan-completeness.mjs');
  writeFileSync(join(feature, '00_complexity_assessment.md'), '# Tier S\n');
  writeFileSync(join(feature, '01_requirements.md'), '# Требования\n| FR-1 | Проверка настоящего пути |\n');
  function run(target, executable = checker) {
    writeFileSync(join(feature, '06_implementation_plan.md'), '# План\nInputs read: 01_requirements.md\n\nПроверяем только синтаксис пути: стандартные сегменты Next.js допустимы, переход к родительскому каталогу и фрагменты Markdown запрещены. Отсутствующий будущий файл не является доказательством корректности его содержимого.\n\n## Задачи\n- [ ] T1 (FR-1): проверить путь.\n\nEXPECTED_CODE_TARGETS:\n- ' + target + '\n');
    const result = spawnSync(process.execPath, [executable, feature, '--tier=S', '--require-requirements'], {encoding:'utf8'});
    assert.ifError(result.error);
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
