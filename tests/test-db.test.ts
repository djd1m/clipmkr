import { beforeEach, expect, it, vi } from 'vitest';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { environment } from './fixtures/environment';
const { query, end, createPool } = vi.hoisted(() => ({ query: vi.fn(), end: vi.fn(), createPool: vi.fn() }));
vi.mock('pg', () => ({ Pool: class { constructor(options: unknown) { createPool(options); } query = query; end = end; } }));
import { ensureTestDatabase } from '../scripts/test-db.mjs';
beforeEach(() => { vi.clearAllMocks(); end.mockResolvedValue(undefined); });
it('RV-009: новая БД создаётся до тестов; соединение закрывается', async () => {
  query.mockResolvedValueOnce({ rowCount: 0 }).mockResolvedValueOnce({});
  await ensureTestDatabase('postgresql://n5@db:5432/n5_test');
  expect(createPool.mock.calls[0]![0].connectionString).toBe('postgresql://n5@db:5432/postgres');
  expect(query).toHaveBeenNthCalledWith(2, 'CREATE DATABASE "n5_test"');
  expect(end).toHaveBeenCalledOnce();
});
it('RV-009: штатная test команда выполняет primer до suite и останавливается при ошибке', () => {
  const config = spawnSync('docker', ['compose', '--env-file', '/dev/null', '--project-directory', '.', '--profile', 'test', 'config', '--format', 'json'], {
    env: { ...process.env, ...environment(), N5_DB_APP_PASSWORD: 'fixture-db', REDIS_PASSWORD: 'fixture-redis' }, encoding: 'utf8', timeout: 10000,
  });
  expect(config.status, config.stderr).toBe(0);
  const command = JSON.parse(config.stdout).services.test.command as string[];
  expect(command.slice(0, 2)).toEqual(['sh', '-ec']);
  const dir = mkdtempSync(path.join(tmpdir(), 'n5-primer-command-'));
  try {
    const checkout = path.join(dir, 'checkout'), bin = path.join(dir, 'bin'), proof = path.join(dir, 'proof.json'), log = path.join(dir, 'calls');
    mkdirSync(path.join(checkout, 'packages/db/migrations'), { recursive: true }); mkdirSync(bin);
    writeFileSync(path.join(checkout, 'packages/db/migrations/001_init.sql'), 'SELECT 1;\n');
    for (const args of [['init', '-q'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'add', '.'],
      ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'fixture']]) {
      const result = spawnSync('git', ['-C', checkout, ...args], { encoding: 'utf8' });
      expect(result.status, result.stderr).toBe(0);
    }
    writeFileSync(proof, '{}\n', { mode: 0o600 });
    for (const [name, expected, exitVar] of [['node', 'scripts/test-db.mjs', 'PRIMER_EXIT'], ['npm', 'test -- --run', 'SUITE_EXIT']]) {
      const executable = path.join(bin, name!);
      writeFileSync(executable, `#!/bin/sh\nprintf '%s:%s\\n' '${name}' "$*" >> "$TRACE_LOG"\n[ "$*" = '${expected}' ] || exit 64\nexit "\${${exitVar}:-0}"\n`);
      chmodSync(executable, 0o755);
    }
    const script = command[2]!.replaceAll('/app/.git', path.join(checkout, '.git')).replaceAll('/app', checkout)
      .replaceAll('/run/clipmkr-resource-proof.json', proof);
    const run = (primerExit: number, suiteExit: number) => {
      writeFileSync(log, '');
      const result = spawnSync('sh', ['-ec', script], { cwd: checkout, encoding: 'utf8', timeout: 10000,
        env: { ...process.env, PATH: bin + path.delimiter + process.env.PATH, TRACE_LOG: log,
          PRIMER_EXIT: String(primerExit), SUITE_EXIT: String(suiteExit) } });
      return { status: result.status, calls: readFileSync(log, 'utf8').trim().split('\n') };
    };
    expect(run(0, 0)).toEqual({ status: 0, calls: ['node:scripts/test-db.mjs', 'npm:test -- --run'] });
    expect(run(17, 0)).toEqual({ status: 17, calls: ['node:scripts/test-db.mjs'] });
    expect(run(0, 19)).toEqual({ status: 19, calls: ['node:scripts/test-db.mjs', 'npm:test -- --run'] });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
it('Существующая БД не пересоздаётся; гонка создания допустима', async () => {
  query.mockResolvedValueOnce({ rowCount: 1 });
  await ensureTestDatabase('postgresql://n5@db:5432/n5_test');
  expect(query).toHaveBeenCalledTimes(1);
  query.mockResolvedValueOnce({ rowCount: 0 }).mockRejectedValueOnce({ code: '42P04' });
  await expect(ensureTestDatabase('postgresql://n5@db:5432/n5_test')).resolves.toBeUndefined();
});
it('Отсутствие права создания не маскируется', async () => {
  query.mockResolvedValueOnce({ rowCount: 0 }).mockRejectedValueOnce({ code: '42501' });
  await expect(ensureTestDatabase('postgresql://n5@db:5432/n5_test')).rejects.toMatchObject({ code: '42501' });
  expect(end).toHaveBeenCalledOnce();
});
it.each([undefined, 'postgresql://n5@db/n5', 'postgresql://n5@db/x%22_test', 'mysql://n5@db/n5_test'])('Непригодная или продуктовая БД %s не затрагивается', async (url) => {
  await expect(ensureTestDatabase(url)).rejects.toThrow();
  expect(createPool).not.toHaveBeenCalled();
});
