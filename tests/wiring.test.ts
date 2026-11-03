import { describe, expect, it } from 'vitest';
import { cpSync, readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
  it('resolves real S3 acceptance without a MinIO dependency', () => {
    const env = { ...process.env, ...environment(), N5_DB_APP_PASSWORD: 'fixture-db', REDIS_PASSWORD: 'fixture-redis',
      N5_PREFIX_RUN_S3: '1', N5_PREFIX_S3_ENDPOINT: 'https://s3.cloud.ru', N5_PREFIX_S3_BUCKET: 'fixture-bucket',
      N5_PREFIX_S3_REGION: 'fixture-region', N5_PREFIX_S3_ACCESS_KEY: 'fixture-key', N5_PREFIX_S3_SECRET_KEY: 'fixture-secret',
      N5_PREFIX_S3_RECEIPT_HOST_DIR: '/tmp/fixture-private-receipts' };
    const run = spawnSync('docker', ['compose', '--env-file', '/dev/null', '--project-directory', '.', '--profile', 'test', 'config', '--format', 'json'], { env, encoding: 'utf8', timeout: 10000 });
    expect(run.status).toBe(0);
    const config = JSON.parse(run.stdout), service = config.services.test;
    expect(service.environment.N5_ACCEPTANCE).toBe('1');
    expect(service.environment.N5_PREFIX_RUN_S3).toBe('1');
    for (const field of ['ENDPOINT', 'BUCKET', 'REGION', 'ACCESS_KEY', 'SECRET_KEY']) expect(service.environment[`N5_PREFIX_S3_${field}`]).toBe(env[`N5_PREFIX_S3_${field}` as keyof typeof env]);
    expect(service.environment.N5_PREFIX_S3_RECEIPT_DIR).toBe('/run/clipmkr-s3-receipts');
    expect(service.volumes).toContainEqual(expect.objectContaining({ type: 'bind', source: '/tmp/fixture-private-receipts', target: '/run/clipmkr-s3-receipts' }));
    expect(service.depends_on).not.toHaveProperty('minio');
    expect(config.services).not.toHaveProperty('minio');
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
