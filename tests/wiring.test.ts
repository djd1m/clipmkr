import { describe, expect, it } from 'vitest';
import { cpSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkWiring, collectEnvironment } from '../scripts/check-env-wiring.mjs';
import { environment } from './fixtures/environment';

describe('Проверяемость проброса окружения', () => {
  const compose = () => ({ services: Object.fromEntries(['web', 'worker-stt', 'worker-llm', 'worker-video'].map((name) => [name, { environment: environment() }])) });
  it('Полная конфигурация проходит, отсутствие потолка даёт находку', () => {
    const config = compose(); expect(checkWiring(config)).toEqual([]);
    delete config.services.web!.environment.N5_LIMIT_USER_UPLOAD_REFUNDS;
    expect(checkWiring(config)).toEqual(['web: N5_LIMIT_USER_UPLOAD_REFUNDS']);
  });
  it('Соседнему воркеру не приписываются переменные web', () => {
    const config = compose();
    for (const name of ['worker-stt', 'worker-llm', 'worker-video']) delete config.services[name]!.environment.SESSION_SECRET;
    expect(checkWiring(config)).toEqual([]);
  });
  it.each(['worker-stt', 'worker-llm'])('SL-007 %s requires the public origin in compose', role => {
    const config = compose(); delete config.services[role]!.environment.N5_PUBLIC_ORIGIN;
    expect(checkWiring(config)).toContain(`${role}: N5_PUBLIC_ORIGIN`);
  });
  it('Пустой или неполный compose не зеленеет', () => {
    expect(() => checkWiring({})).toThrow(); expect(() => checkWiring({ services: {} })).toThrow();
  });
  it('Новая обязательная переменная config.ts не теряется в environment.ts', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'n5-config-wiring-'));
    try {
      for (const folder of ['apps/web/src', 'apps/worker', 'packages/shared/src', 'packages/queue/src']) {
        cpSync(folder, path.join(dir, folder), { recursive: true });
      }
      cpSync('Dockerfile', path.join(dir, 'Dockerfile'));
      cpSync('package.json', path.join(dir, 'package.json'));
      cpSync('apps/web/package.json', path.join(dir, 'apps/web/package.json'));
      cpSync('packages/db/src', path.join(dir, 'packages/db/src'), { recursive: true });
      cpSync('packages/s3/src', path.join(dir, 'packages/s3/src'), { recursive: true });
      const file = path.join(dir, 'packages/shared/src/config.ts');
      const source = readFileSync(file, 'utf8');
      writeFileSync(file, source.replace('const limits = loadLimits(env);', "required(env, 'N5_TEST_UNWIRED', 'storage unavailable'); const limits = loadLimits(env);"));
      expect(checkWiring(compose(), dir)).toContain('web environment.ts: N5_TEST_UNWIRED');
      expect(checkWiring(compose(), dir)).toContain('web: N5_TEST_UNWIRED');
      writeFileSync(file, source);
      expect(checkWiring(compose(), dir)).toEqual([]);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('classifies release revision as build-time and still detects broken build and runtime wiring', () => {
    const config = compose();
    delete config.services.web!.environment.NEXT_PUBLIC_RELEASE_REVISION;
    expect(checkWiring(config)).toEqual([]);
    delete config.services.web!.environment.N5_PUBLIC_ORIGIN;
    expect(checkWiring(config)).toContain('web: N5_PUBLIC_ORIGIN');
    const dir = mkdtempSync(path.join(tmpdir(), 'n5-build-wiring-'));
    try {
      for (const folder of ['apps/web/src', 'apps/worker', 'packages/shared/src', 'packages/queue/src', 'packages/db/src', 'packages/s3/src']) cpSync(folder, path.join(dir, folder), { recursive: true });
      cpSync('Dockerfile', path.join(dir, 'Dockerfile')); cpSync('package.json', path.join(dir, 'package.json')); cpSync('apps/web/package.json', path.join(dir, 'apps/web/package.json'));
      const df = path.join(dir, 'Dockerfile'); const original = readFileSync(df, 'utf8');
      writeFileSync(df, original.replace('ENV NEXT_PUBLIC_RELEASE_REVISION=$RELEASE_REVISION', 'ENV NEXT_PUBLIC_RELEASE_REVISION=wrong'));
      expect(() => checkWiring(compose(), dir)).toThrow('build-time');
      writeFileSync(df, original);
      const app = path.join(dir, 'apps/web/src/app/health/route.ts');
      writeFileSync(app, readFileSync(app, 'utf8') + '\nconst unrelated = process.env.NEXT_PUBLIC_UNKNOWN;\n');
      expect(checkWiring(compose(), dir)).toContain('web: NEXT_PUBLIC_UNKNOWN');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('wires S3_KEY_PREFIX to web and storage workers', () => {
    for (const role of ['web', 'worker-stt', 'worker-video']) {
      const config = compose(); delete config.services[role]!.environment.S3_KEY_PREFIX;
      expect(checkWiring(config)).toContain(`${role}: S3_KEY_PREFIX`);
    }
    const config = compose(); delete config.services['worker-llm']!.environment.S3_KEY_PREFIX;
    expect(checkWiring(config)).toEqual([]);
    const dir = mkdtempSync(path.join(tmpdir(), 'n5-prefix-wiring-'));
    try {
      for (const folder of ['apps/web/src', 'apps/worker', 'packages/shared/src', 'packages/queue/src', 'packages/db/src', 'packages/s3/src']) cpSync(folder, path.join(dir, folder), { recursive: true });
      cpSync('Dockerfile', path.join(dir, 'Dockerfile')); cpSync('package.json', path.join(dir, 'package.json')); cpSync('apps/web/package.json', path.join(dir, 'apps/web/package.json'));
      for (const role of ['stt', 'render']) {
        const file = path.join(dir, `apps/worker/workers/${role}.ts`); const source = readFileSync(file, 'utf8');
        writeFileSync(file, source.replace('S3_KEY_PREFIX: process.env.S3_KEY_PREFIX,', ''));
        expect(checkWiring(compose(), dir)).toContain(`${role === 'stt' ? 'worker-stt' : 'worker-video'} adapter: S3_KEY_PREFIX`);
        writeFileSync(file, source);
      }
      const file = path.join(dir, 'apps/web/src/server/environment.ts');
      writeFileSync(file, readFileSync(file, 'utf8').replace('S3_KEY_PREFIX: process.env.S3_KEY_PREFIX,', ''));
      expect(checkWiring(compose(), dir)).toContain('web environment.ts: S3_KEY_PREFIX');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
  it('S3_ENDPOINT не режется до S; динамическое чтение не пропускается', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'n5-wiring-'));
    try {
      mkdirSync(path.join(dir, 'src'));
      writeFileSync(path.join(dir, 'src/env.ts'), 'export const endpoint = process.env.S3_ENDPOINT;');
      expect([...collectEnvironment(['src/env.ts'], dir)]).toEqual(['S3_ENDPOINT']);
      writeFileSync(path.join(dir, 'src/env.ts'), 'export const endpoint = process.env[key];');
      expect(() => collectEnvironment(['src/env.ts'], dir)).toThrow('Динамическое');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
