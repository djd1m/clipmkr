import { randomBytes, randomUUID } from 'node:crypto';
import { closeSync, fchmodSync, fsyncSync, lstatSync, openSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
// Только локальный тест: секрет случаен и не относится ни к одному развёрнутому сервису.
export function environment(): NodeJS.ProcessEnv {
  return {
    N5_MODEL_PROVIDER: 'fake', N5_STT_PROVIDER: 'openrouter', N5_LLM_PROVIDER: 'openrouter', CLOUDRU_FM_API_KEY: 'unused-test-fm-key',
    YANDEX_SPEECHKIT_API_KEY: 'unused-test-yandex-key', OPENROUTER_API_KEY: 'unused-test-key', N5_LLM_MODEL: 'anthropic/claude-sonnet-5',
    S3_ENDPOINT: 'http://minio:9000', S3_PUBLIC_ENDPOINT: 'https://storage.test.invalid', S3_REGION: 'us-east-1', S3_BUCKET: 'n5-test',
    S3_KEY_PREFIX: '', S3_ACCESS_KEY: 'test-key', S3_SECRET_KEY: randomBytes(32).toString('hex'), S3_FORCE_PATH_STYLE: 'true',
    NODE_ENV: 'test', N5_WORK_DIR: '/tmp/n5-test-work', N5_TRUSTED_PROXY_HOPS: '2', N5_LIMIT_USER_MINUTES: '90', N5_LIMIT_PAID_USER_MINUTES: '270', N5_LIMIT_USER_UPLOADS: '2',
    N5_LIMIT_USER_RERENDERS: '20', N5_LIMIT_USER_UPLOAD_REFUNDS: '2', N5_LIMIT_USER_LLM: '2',
    N5_LIMIT_GLOBAL_MINUTES: '600', N5_LIMIT_GLOBAL_LLM: '20',
    N5_METRIKA_COUNTER_ID: '',
    N5_GLOSSARY: '', N5_SHORT_CODE_LENGTH: '6', N5_PUBLIC_ORIGIN: 'https://test.invalid', DATABASE_URL: 'postgresql://test@localhost/test',
    REDIS_URL: 'redis://localhost:6379', SESSION_SECRET: randomBytes(32).toString('hex'),
    // Фича 30: оплата выключена — как на стенде, где N5_PAYMENTS_MODE не задан (compose пробрасывает off).
    N5_MAIL_MODE: 'disabled', N5_RESEND_API_KEY: '', N5_MAIL_FROM: '', N5_SMTP_HOST: '', N5_SMTP_PORT: '', N5_SMTP_USER: '', N5_SMTP_PASSWORD: '', N5_SMTP_SECURE: '',
    N5_MAIL_TEST_CAPTURE_FILE: '', N5_SUPPORT_MODE: 'disabled', N5_SUPPORT_BASE_URL: '', N5_SUPPORT_INBOX_ID: '',
    N5_SUPPORT_IDENTIFIED: 'false', N5_SUPPORT_JWT_SECRET: '', N5_SUPPORT_CONTACT_EMAIL: '',
    N5_BILLING_MODE: 'legacy', N5_CHECKOUT_ENABLED: 'true', N5_TEST_CHECKOUT_ACCOUNT_ID: '', N5_PAYMENTS_MODE: 'off', YOOKASSA_SHOP_ID: '', YOOKASSA_SECRET_KEY: '', YOOKASSA_TEST_MODE: '',
  };
}

// Independent pre-network fence for explicitly enabled, unique Cloud S3 test scopes.
// It wraps SDK transport, so it still applies if application middleware is broken.
export function liveS3Environment() {
  const endpoint = process.env.N5_PREFIX_S3_ENDPOINT, bucket = process.env.N5_PREFIX_S3_BUCKET;
  const region = process.env.N5_PREFIX_S3_REGION, accessKeyId = process.env.N5_PREFIX_S3_ACCESS_KEY;
  const secretAccessKey = process.env.N5_PREFIX_S3_SECRET_KEY, style = process.env.N5_PREFIX_S3_FORCE_PATH_STYLE ?? 'false';
  if (process.env.N5_PREFIX_RUN_S3 !== '1' || endpoint !== 'https://s3.cloud.ru' || !bucket || !/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(bucket) ||
      !region || !accessKeyId || !secretAccessKey || !['true', 'false'].includes(style)) throw new Error('Real S3 test profile required');
  const config = { endpoint, publicEndpoint: endpoint, region, bucket, accessKeyId, secretAccessKey, forcePathStyle: style === 'true' };
  type Scope = { prefixes: string[]; exactKeys?: string[]; allowList?: boolean; allowVersioning?: boolean };
  type Request = { protocol?: string; hostname?: string; port?: number; method?: string; path?: string;
    query?: Record<string, string | string[] | undefined>; headers?: Record<string, string> };
  const validateScope = (scope: Scope) => {
    if (!scope.prefixes.length || scope.prefixes.some((p) => !/^tests\/(cloud|site)\/(?:[a-z0-9_-]+\/)+$/.test(p)) ||
        scope.exactKeys?.some((k) => !scope.prefixes.some((p) => k.startsWith(p)))) throw new Error('Invalid S3 test scope');
  };
  const guard = (request: Request, scope: Scope) => {
    validateScope(scope);
    if (request.protocol !== 'https:' || (request.port !== undefined && request.port !== 443)) throw new Error('S3 test fence: origin');
    const pathStyle = request.hostname === 's3.cloud.ru', virtual = request.hostname === `${bucket}.s3.cloud.ru`;
    if (!pathStyle && !virtual) throw new Error('S3 test fence: origin');
    const rawPath = request.path ?? '';
    if (/%(?:2f|5c|25)/i.test(rawPath)) throw new Error('S3 test fence: encoded path');
    let decoded: string; try { decoded = decodeURIComponent(rawPath); } catch { throw new Error('S3 test fence: path'); }
    if (!decoded.startsWith('/') || /[\\%?#\x00-\x1f\x7f-\x9f]/.test(decoded)) throw new Error('S3 test fence: path');
    let key = decoded.slice(1);
    if (pathStyle) {
      if (key !== bucket && !key.startsWith(bucket + '/')) throw new Error('S3 test fence: bucket');
      key = key.slice(bucket.length).replace(/^\//, '');
    }
    const parts = key.split('/'); if (parts.some((p, i) => p === '.' || p === '..' || (!p && i !== parts.length - 1))) throw new Error('S3 test fence: path');
    const query = request.query ?? {}, method = request.method ?? '';
    const allowedQuery = new Set(['uploads', 'uploadId', 'partNumber', 'list-type', 'prefix', 'max-keys', 'continuation-token',
      'start-after', 'key-marker', 'upload-id-marker', 'max-uploads', 'max-parts', 'part-number-marker', 'versioning', 'x-id', 'response-content-disposition']);
    const authQuery = new Set(['x-amz-algorithm', 'x-amz-content-sha256', 'x-amz-credential', 'x-amz-date', 'x-amz-expires',
      'x-amz-signature', 'x-amz-signedheaders', 'x-amz-security-token', 'x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm', 'x-amz-checksum-mode']);
    const isAuth = (q: string) => authQuery.has(q.toLowerCase());
    if (Object.keys(query).some((q) => q.toLowerCase().startsWith('x-amz-copy-source')) ||
        Object.keys(request.headers ?? {}).some((h) => h.toLowerCase().startsWith('x-amz-copy-source'))) throw new Error('S3 test fence: copy');
    if (Object.keys(query).some((q) => !allowedQuery.has(q) && !isAuth(q))) throw new Error('S3 test fence: query');
    const within = (value: unknown) => typeof value === 'string' && !/[\\%?#\x00-\x1f\x7f-\x9f]/.test(value) &&
      !value.split('/').some((part, i, all) => part === '.' || part === '..' || (!part && i !== all.length - 1)) && scope.prefixes.some((prefix) => value.startsWith(prefix));
    if (!key) {
      if (method !== 'GET') throw new Error('S3 test fence: bucket mutation');
      if ('versioning' in query) {
        if (scope.allowVersioning && Object.keys(query).every((q) => q === 'versioning' || isAuth(q))) return;
        throw new Error('S3 test fence: versioning');
      }
      const multipart = 'uploads' in query, objects = query['list-type'] === '2';
      if (!scope.allowList || multipart === objects || !within(query.prefix)) throw new Error('S3 test fence: listing');
      const fields = multipart ? ['uploads', 'prefix', 'max-uploads', 'key-marker', 'upload-id-marker'] :
        ['list-type', 'prefix', 'max-keys', 'continuation-token', 'start-after'];
      if (Object.keys(query).some((q) => !fields.includes(q) && !isAuth(q))) throw new Error('S3 test fence: listing query');
      for (const marker of ['key-marker', 'start-after']) if (query[marker] !== undefined && !within(query[marker])) throw new Error('S3 test fence: marker');
      return;
    }
    if (!within(key) || (scope.exactKeys && !scope.exactKeys.includes(key))) throw new Error('S3 test fence: key');
    if (!['GET', 'HEAD', 'PUT', 'POST', 'DELETE'].includes(method) || (method === 'POST' && !('uploads' in query || 'uploadId' in query))) throw new Error('S3 test fence: operation');
  };
  const bind = (client: import('@aws-sdk/client-s3').S3Client, scope: Scope) => {
    validateScope(scope);
    const previous = client.config.requestHandler;
    client.config.requestHandler = new Proxy(previous, { get(target, property) {
      if (property === 'handle') return (request: Request, options: unknown) => { guard(request, scope); return target.handle(request as never, options as never); };
      const value = Reflect.get(target, property, target); return typeof value === 'function' ? value.bind(target) : value;
    } });
  };
  const nativeFetch = globalThis.fetch.bind(globalThis);
  const guardedFetch = async (value: string, init: RequestInit, scope: Scope, timeoutMs = 45_000) => {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) throw new Error('S3 test fence: timeout');
    let parsed: URL; try { parsed = new URL(value); } catch { throw new Error('S3 test fence: URL'); }
    if (parsed.username || parsed.password || parsed.hash) throw new Error('S3 test fence: URL');
    const query: Record<string, string> = {};
    parsed.searchParams.forEach((v, k) => { if (k in query) throw new Error('S3 test fence: duplicate query'); query[k] = v; });
    const headers: Record<string, string> = {}; new Headers(init.headers).forEach((v, k) => { headers[k] = v; });
    guard({ protocol: parsed.protocol, hostname: parsed.hostname, ...(parsed.port ? { port: Number(parsed.port) } : {}), method: init.method ?? 'GET', path: parsed.pathname, query, headers }, scope);
    const signal = AbortSignal.any([...(init.signal ? [init.signal] : []), AbortSignal.timeout(timeoutMs)]);
    return nativeFetch(value, { ...init, redirect: 'error', signal });
  };
  const receipt = (prefix: string, testName: string) => {
    validateScope({ prefixes: [prefix] });
    if (!/^[a-z0-9-]+$/.test(testName)) throw new Error('Invalid S3 test name');
    const directory = process.env.N5_PREFIX_S3_RECEIPT_DIR;
    if (!directory) throw new Error('Private S3 receipt directory required');
    if (directory) {
      const st = lstatSync(directory), real = realpathSync(directory), repo = realpathSync(process.cwd());
      if (!path.isAbsolute(directory) || real !== directory || !st.isDirectory() || st.isSymbolicLink() || st.uid !== process.getuid?.() ||
          (st.mode & 0o777) !== 0o700 || real === repo || real.startsWith(repo + path.sep)) throw new Error('Invalid private S3 receipt directory');
    }
    const id = randomUUID(), state = { testName, prefix, state: 'pending', attemptedKeys: [] as Array<{ key: string; state: string }>, uploads: [] as Array<{ token: string; key: string; id: string | null; state: string }> };
    const save = () => {
      if (!directory) return;
      const tmp = path.join(directory, `.legacy-s3-${id}-${randomUUID()}`), target = path.join(directory, `legacy-s3-${id}.json`);
      const fd = openSync(tmp, 'wx', 0o600);
      try { fchmodSync(fd, 0o600); writeFileSync(fd, JSON.stringify(state)); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(tmp, target); const dir = openSync(directory, 'r'); try { fsyncSync(dir); } finally { closeSync(dir); }
    };
    save();
    const physical = (key: string) => {
      if (!key || key.startsWith('/') || /[\\%?#\x00-\x1f\x7f-\x9f]/.test(key) || key.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Invalid receipt key');
      return prefix + key;
    };
    const attempt = (key: string) => {
      const k = physical(key); if (!state.attemptedKeys.some((item) => item.key === k)) state.attemptedKeys.push({ key: k, state: 'unknown' }); save();
    };
    return { attempt,
      startUpload(key: string) { attempt(key); const token = randomUUID(); state.uploads.push({ token, key: physical(key), id: null, state: 'unknown' }); save(); return token; },
      resolvedUpload(token: string, uploadId: string) { const item = state.uploads.find((u) => u.token === token); if (!item || item.state !== 'unknown' || !uploadId) throw new Error('Invalid upload receipt'); item.id = uploadId; item.state = 'resolved'; save(); },
      beginCleanup() { state.state = 'cleanup'; save(); },
      finish(ok: boolean) { const complete = ok && state.uploads.every((u) => u.state !== 'unknown'); state.state = complete ? 'complete' : 'pending';
        if (complete) { state.attemptedKeys.forEach((k) => { k.state = 'cleaned'; }); state.uploads.forEach((u) => { u.state = 'cleaned'; }); } save(); },
      report(primary: unknown, cleanup: unknown) { const safe = (e: unknown) => {
          const v = e as { name?: string; $metadata?: { httpStatusCode?: number } }; const n = ['Error', 'TimeoutError', 'AccessDenied', 'NoSuchUpload'].includes(v?.name ?? '') ? v.name : 'OtherError';
          const code = v?.$metadata?.httpStatusCode; return `${n}:${typeof code === 'number' && code >= 100 && code <= 599 ? code : 'unknown'}`;
        };
        if (primary && cleanup) throw new AggregateError([new Error('primary: ' + safe(primary)), new Error('cleanup: ' + safe(cleanup))], 'S3 test and cleanup failed');
        if (primary) throw primary; if (cleanup) throw cleanup;
      } };

  };
  const finalize = async (cleanup: () => Promise<void>, closePool: () => Promise<void>) => {
    let cleanupError: unknown, poolError: unknown;
    try { await cleanup(); } catch (error) { cleanupError = error; }
    finally { try { await closePool(); } catch (error) { poolError = error; } }
    if (cleanupError && poolError) throw new AggregateError([cleanupError, poolError], 'S3 and database cleanup failed');
    if (cleanupError) throw cleanupError; if (poolError) throw poolError;
  };
  return { config, bind, fetch: guardedFetch, receipt, finalize };
}
