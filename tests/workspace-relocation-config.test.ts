import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CreateMultipartUploadCommand,
  DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListMultipartUploadsCommand,
  ListObjectsV2Command, ListPartsCommand, PutObjectCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client } from '../packages/s3/src/client';
import { loadWebConfig } from '../packages/shared/src/config';
import { clientIp } from '../apps/web/src/server/ip';
import { environment } from './fixtures/environment';

const prefix = 'tests/local-ux-20261104/relocate-20261109/';
const webImage = 'sha256:d1880bc89258fd88c27bdcd3f9393c69bb70ebdf6bf4e54216f92cbd946688f9';
const workerImage = 'sha256:6e66c8717b0f7d31c720d63db14d5841b9ec7d9cd965d9a3f2c3ac0cb1ae8800';
const services = ['web', 'worker-stt', 'worker-llm', 'worker-video'] as const;
const files = ['docker-compose.yml', 'ops/cloudru/compose.images.yml', 'deploy/workspace-relocation.compose.yml'];
type Volume = { type: string; source: string; target: string; read_only?: boolean; bind: { create_host_path: boolean } };
type Service = { image: string; environment: Record<string, string>; build?: unknown; pull_policy: string;
  restart: string; cpus: number; mem_limit: string | number; logging: unknown; networks: Record<string, unknown>;
  profiles: string[]; volumes: Volume[]; ports?: Array<{ host_ip: string; published: string; target: number }> };
type Compose = { name: string; services: Record<typeof services[number] | 'db' | 'redis' | 'relocation-helpdesk', Service>;
  networks: Record<string, { name: string; internal?: boolean }> };
type Matcher = { host?: string[]; path?: string[]; method?: string[]; expression?: { expr: string } };
type CaddyNode = { match?: Matcher[]; handler?: string; host?: string[]; path?: string[]; group?: string;
  rewrite?: unknown;
  routes?: CaddyNode[]; upstreams?: Array<{ dial: string }>; default_sni?: string; trusted_proxies?: string[];
  headers?: { request: { set: Record<string, string[]>; delete: string[] } };
  providers?: { http_basic: { accounts?: Array<{ username: string; password: string }> } }; status_code?: number };
type Caddy = { apps: { http: { servers: Record<string, unknown> } } };
type Wire = { method: string; path: string; query: Record<string, string> };
// No inherited deployment environment: every credential below is synthetic.
const synthetic = (): NodeJS.ProcessEnv => ({ PATH: process.env.PATH, ...environment(),
  N5_COMPOSE_PROJECT: 'clipmkr-stage-20261028', N5_DB_APP_PASSWORD: 'synthetic-old-db',
  REDIS_PASSWORD: 'synthetic-redis', RELOCATION_QA_DB_PASSWORD: 'synthetic-qa-db',
  RELOCATION_HELPDESK_QA_CONFIG: '/synthetic-private/helpdesk-qa.toml',
  N5_SUPPORT_INBOX_ID: '11111111-1111-4111-8111-111111111111',
  N5_PUBLIC_ORIGIN: 'https://77.83.87.178' });
function compose(env = synthetic()): Compose {
  return JSON.parse(execFileSync('docker', ['compose', '--env-file', '/dev/null', '--project-name',
    'clipmkr-stage-20261028', '--profile', '*', ...files.flatMap(file => ['-f', file]),
    'config', '--format', 'json'], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}
function assertAdmission(config: Compose) {
  expect(config.name).toBe('clipmkr-stage-20261028');
  for (const name of services) {
    const app = config.services[name]; const env = app.environment;
    expect(app.image).toBe(name === 'web' ? webImage : workerImage);
    expect(app.build).toBeUndefined(); expect(app.pull_policy).toBe('never');
    expect(app.restart).toBe('no'); expect(app.cpus).toBe(1);
    expect(Number(app.mem_limit)).toBeGreaterThan(0); expect(Number(app.mem_limit)).toBeLessThanOrEqual(1200 * 1024 * 1024);
    expect(app.logging).toEqual({ driver: 'json-file', options: { 'max-size': '5m', 'max-file': '2' } });
    const db = new URL(env.DATABASE_URL!); const redis = new URL(env.REDIS_URL!);
    expect([db.hostname, db.pathname, db.username]).toEqual(['clipmkr-stage-20261028-db-1', '/n5_relocation_qa_test', 'n5_relocation_qa']);
    expect([redis.hostname, redis.pathname]).toEqual(['clipmkr-stage-20261028-redis-1', '/4']);
    expect(env.S3_KEY_PREFIX).toBe(prefix);
    expect(env.N5_PUBLIC_ORIGIN).toBe('https://77.83.87.178');
    expect(Object.keys(app.networks)).toEqual(['default']);
    expect(env.N5_LIMIT_USER_MINUTES).toBe('3'); expect(env.N5_LIMIT_PAID_USER_MINUTES).toBe('3');
    expect(env.N5_LIMIT_GLOBAL_MINUTES).toBe('3');
    for (const key of ['USER_RERENDERS', 'USER_UPLOADS', 'USER_UPLOAD_REFUNDS', 'USER_LLM', 'GLOBAL_LLM']) {
      expect(env['N5_LIMIT_' + key]).toBe('1');
    }
    if (name !== 'web') {
      expect(app.profiles).toEqual(['relocation-workers']);
      expect(app.volumes.every(v => v.type === 'bind' && v.bind.create_host_path === false)).toBe(true);
      expect(app.volumes.map(v => v.source)).toEqual(name === 'worker-video'
        ? ['/var/lib/clipmkr-relocation/qa/video']
        : [`/var/lib/clipmkr-relocation/qa/${name === 'worker-stt' ? 'stt' : 'llm'}`, '/var/lib/clipmkr-relocation/qa/spend']);
    }
  }
  const web = config.services.web;
  expect(web.ports).toMatchObject([{ host_ip: '172.29.8.1', published: '5811', target: 3000 }]);
  expect(web.environment).toMatchObject({ N5_TRUSTED_PROXY_HOPS: '1', N5_CHECKOUT_ENABLED: 'false',
    N5_PAYMENTS_MODE: 'off', YOOKASSA_TEST_MODE: 'true', YOOKASSA_SECRET_KEY: '',
    N5_TEST_CHECKOUT_ACCOUNT_ID: '', N5_MAIL_MODE: 'disabled', N5_RESEND_API_KEY: '', N5_SMTP_HOST: '',
    N5_SUPPORT_MODE: 'disabled', N5_SUPPORT_BASE_URL: '', N5_SUPPORT_INBOX_ID: '' });
  expect(loadWebConfig(web.environment).trustedProxyHops).toBe(1);
  for (const storage of ['db', 'redis'] as const) expect(config.services[storage].ports).toBeUndefined();
  expect(config.services.db.volumes).toMatchObject([{ type: 'volume', source: 'pgdata', target: '/var/lib/postgresql/data' }]);
  expect(config.services.redis.volumes).toMatchObject([{ type: 'volume', source: 'redisdata', target: '/data' }]);
  const desk = config.services['relocation-helpdesk'];
  expect(desk.image).toBe('libredesk/libredesk:v2.9.0@sha256:e7aa3bac149323d21e8e130adc8d9dd83b2c4fc85f83bb3b08b544ffa3c7d201');
  expect(desk.profiles).toEqual(['relocation-support']); expect(desk.restart).toBe('no');
  expect(Object.keys(desk.networks)).toEqual(['relocation-support-qa']);
  expect(config.networks['relocation-support-qa']).toMatchObject({ internal: true, name: 'clipmkr-relocation-support-qa' });
  expect(desk.ports).toMatchObject([{ host_ip: '172.29.8.1', published: '5812', target: 9000 }]);
  expect(desk.volumes).toMatchObject([{ source: '/synthetic-private/helpdesk-qa.toml', read_only: true,
    bind: { create_host_path: false } }, { source: '/var/lib/clipmkr-relocation/qa/helpdesk-uploads', bind: { create_host_path: false } }]);
}
function objects(value: unknown): CaddyNode[] {
  if (!value || typeof value !== 'object') return [];
  return [value as CaddyNode, ...Object.values(value).flatMap(objects)];
}
// Caddy numbers mutual-exclusion groups across the whole config; additions may
// renumber them. Preserve group relationships while comparing each foreign site.
function canonicalRoute(route: CaddyNode) {
  const copy = structuredClone(route), groups = new Map<string, string>();
  for (const value of objects(copy)) if (typeof value.group === 'string') {
    if (!groups.has(value.group)) groups.set(value.group, `group${groups.size}`);
    value.group = groups.get(value.group);
  }
  return copy;
}

describe('workspace relocation configuration', () => {
  it('QA admission rejects production data bindings and unsafe resource limits', () => {
    const config = compose(); assertAdmission(config);
    // Production-looking inherited values cannot override fixed QA bindings/budget.
    assertAdmission(compose({ ...synthetic(), DATABASE_URL: 'postgresql://prod@db/n5', REDIS_URL: 'redis://redis/0',
      S3_KEY_PREFIX: '', N5_LIMIT_GLOBAL_MINUTES: '600', N5_CHECKOUT_ENABLED: 'true', N5_MAIL_MODE: 'resend',
      N5_SUPPORT_MODE: 'libredesk', N5_SUPPORT_BASE_URL: 'https://support.clipmkr.ru' }));
    const hostname = compose({ ...synthetic(), N5_PUBLIC_ORIGIN: 'https://clipmkr.ru',
      RELOCATION_QA_SUPPORT_MODE: 'libredesk', RELOCATION_QA_SUPPORT_BASE_URL: 'https://support.clipmkr.ru',
      RELOCATION_QA_SUPPORT_INBOX_ID: '11111111-1111-4111-8111-111111111111' });
    expect(loadWebConfig(hostname.services.web.environment).support).toMatchObject({ mode: 'libredesk', baseURL: 'https://support.clipmkr.ru' });
    for (const key of ['RELOCATION_QA_DB_PASSWORD', 'RELOCATION_HELPDESK_QA_CONFIG', 'REDIS_PASSWORD']) {
      const env = synthetic(); delete env[key]; expect(() => compose(env)).toThrow();
    }
    // Falsifiers: a changed overlay that binds originals or drops resource limits must fail admission.
    for (const [field, value] of [['DATABASE_URL', 'postgresql://prod@db/n5'], ['REDIS_URL', 'redis://redis/0'], ['S3_KEY_PREFIX', '']]) {
      const broken = structuredClone(config); broken.services.web.environment[field!] = value!;
      expect(() => assertAdmission(broken)).toThrow();
    }
    const unbounded = structuredClone(config); unbounded.services['worker-video'].cpus = 0;
    expect(() => assertAdmission(unbounded)).toThrow();
    const unguardedImage = structuredClone(config);
    unguardedImage.services.web.image = 'sha256:4afaad4d19cad352c5ed89bae16a3c694b2d41af3abf7873fb63968d2527f8f6';
    expect(() => assertAdmission(unguardedImage)).toThrow();
    const exposed = structuredClone(config); exposed.services['relocation-helpdesk'].networks.default = {};
    expect(() => assertAdmission(exposed)).toThrow();
  });

  it('QA ingress protects every UI route and isolates the exact TEST callback', () => {
    const bin = process.env.CADDY_BIN ?? '/root/.cache/clipmkr-tools/caddy-edge-20261109';
    expect(execFileSync(bin, ['version'], { encoding: 'utf8' })).toMatch(/^v2\.11\.7 /);
    const directory = mkdtempSync(path.join(tmpdir(), 'relocation-caddy-'));
    const put = (name: string, content: string) => { const file = path.join(directory, name); writeFileSync(file, content, { mode: 0o600 }); return file; };
    try {
      execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', path.join(directory, 'key.pem'),
        '-out', path.join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=clipmkr.ru'], { stdio: 'ignore' });
      const hash = execFileSync(bin, ['hash-password', '--plaintext', 'synthetic-owner'], { encoding: 'utf8' }).trim();
      const auth = put('auth.caddy', `owner ${hash}\n`);
      const foreignAuth = put('foreign-auth.caddy', `basic_auth {\n owner ${hash}\n}\n`);
      const tls = put('tls.caddy', `tls ${path.join(directory, 'cert.pem')} ${path.join(directory, 'key.pem')}\n`);
      const existing = put('existing.caddy', `n8.77.83.87.178.sslip.io {\n reverse_proxy web:3000 {\n header_up X-N8-Client-IP {remote_host}\n }\n}\n` +
        `shino.77.83.87.178.sslip.io {\n reverse_proxy 172.29.8.1:5189\n}\nopenhands.77.83.87.178.sslip.io {\n reverse_proxy 172.29.8.1:5800\n}\n` +
        `ohe.77.83.87.178.sslip.io {\n import ${foreignAuth}\n handle_path /review/* {\n root * /config/ohe-review\n file_server\n }\n handle {\n reverse_proxy 172.29.8.1:5810\n }\n}\n`);
      const env = { PATH: process.env.PATH, NODE_ENV: 'test' as const, RELOCATION_EXISTING_SITES_FILE: existing, RELOCATION_QA_AUTH_FILE: auth,
        RELOCATION_MAIN_TLS_FILE: tls, RELOCATION_WWW_TLS_FILE: tls, RELOCATION_SUPPORT_TLS_FILE: tls };
      const adapt = (file: string, overrides = {}): Caddy => JSON.parse(execFileSync(bin, ['adapt', '--adapter', 'caddyfile', '--config', file],
        { env: { ...env, ...overrides }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
      const file = 'deploy/workspace-relocation.caddy'; const adapted = adapt(file);
      execFileSync(bin, ['validate', '--adapter', 'caddyfile', '--config', file], { env, stdio: ['ignore', 'pipe', 'pipe'] });
      const all = objects(adapted);
      const hosts = all.flatMap(x => x.host ?? []);
      expect(hosts).not.toContain('n5.clipmkr.ru'); expect(hosts).not.toContain('c.clipmkr.ru');
      // Exact foreign route objects survive unchanged; include does not reconstruct their private auth.
      const before = objects(adapt(existing)).filter(x => x.match?.some(m => m.host));
      for (const route of before) {
        const host = route.match![0]!.host![0]!;
        const after = all.find(x => x.match?.some(m => m.host?.includes(host)));
        expect(canonicalRoute(after!)).toEqual(canonicalRoute(route));
      }
      const assertIngress = (document: Caddy, windowValue = 'false') => {
      const all = objects(document);
      expect(objects(document.apps.http.servers).some(x => x.default_sni === '77.83.87.178')).toBe(true);
      const site = (host: string) => all.find(x => x.match?.some(m => m.host?.includes(host)))!;
      for (const host of ['77.83.87.178', 'clipmkr.ru']) {
        const siteObjects = objects(site(host));
        const routes = siteObjects.find(x => x.routes?.some(r => r.match?.some(m => m.path?.includes('/api/webhooks/yookassa-test'))))!.routes!;
        expect(routes).toHaveLength(2);
        expect(routes[0]!.match).toEqual([{ method: ['POST'], path: ['/api/webhooks/yookassa-test'] }]);
        // Preserve the exact TEST URI so the QA pre-ledger guard is reached.
        expect(objects(routes[0]).filter(x => x.handler === 'rewrite')).toEqual([]);
        expect(objects(routes[0]).some(x => x.handler === 'authentication')).toBe(false);
        const callbackRoutes = objects(routes[0]).find(x => x.routes?.some(r => r.match?.some(m => m.expression)))!.routes!;
        expect(callbackRoutes).toHaveLength(2);
        expect(callbackRoutes[0]!.match).toEqual([{ expression: { expr: `"${windowValue}" == "true"`, name: 'window-open' } }]);
        const callbackProxies = objects(callbackRoutes[0]).filter(x => x.handler === 'reverse_proxy');
        expect(callbackProxies).toHaveLength(1);
        expect(callbackProxies[0]!.upstreams).toEqual([{ dial: '172.29.8.1:5811' }]);
        expect(callbackProxies[0]!.rewrite).toBeUndefined();
        expect(callbackRoutes[1]!.match).toBeUndefined();
        expect(objects(callbackRoutes[1]).filter(x => x.handler === 'static_response')).toMatchObject([{ status_code: 503 }]);
        expect(objects(callbackRoutes[1]).filter(x => x.handler === 'reverse_proxy')).toHaveLength(0);
        expect(routes[1]!.match).toBeUndefined();
        const guarded = objects(routes[1]).filter(x => x.handler);
        expect(guarded.findIndex(x => x.handler === 'authentication')).toBeGreaterThanOrEqual(0);
        expect(guarded.findIndex(x => x.handler === 'authentication')).toBeLessThan(guarded.findIndex(x => x.handler === 'reverse_proxy'));
      }
      for (const host of ['support.clipmkr.ru', 'www.clipmkr.ru']) {
        const handlers = objects(site(host)).filter(x => x.handler);
        expect(handlers.findIndex(x => x.handler === 'authentication')).toBeGreaterThanOrEqual(0);
        expect(handlers.findIndex(x => x.handler === 'authentication')).toBeLessThan(handlers.findIndex(x => ['reverse_proxy', 'static_response'].includes(x.handler ?? '')));
        expect(objects(site(host)).filter(x => x.path)).toEqual([]);
      }
      for (const proxy of all.filter(x => x.handler === 'reverse_proxy' && x.upstreams?.some(u => /^172\.29\.8\.1:581[12]$/.test(u.dial)))) {
        expect(proxy.trusted_proxies).toBeUndefined();
        expect(proxy.headers!.request.set['X-Forwarded-For']).toEqual(['{http.request.remote.host}, {http.request.local.host}']);
        expect(proxy.headers!.request.delete).toEqual(expect.arrayContaining(['X-Clipmkr-Relay-IP', 'X-Clipmkr-Relay-Key', 'X-Real-IP']));
        // Edge BasicAuth must not override Libredesk's cookie authentication.
        // Only support strips Authorization; the main/callback contract stays intact.
        expect(proxy.headers!.request.delete.includes('Authorization')).toBe(proxy.upstreams!.some(u => u.dial === '172.29.8.1:5812'));
      }
      for (const host of ['77.83.87.178', 'clipmkr.ru', 'www.clipmkr.ru', 'support.clipmkr.ru']) {
        const guard = objects(site(host)).find(x => x.handler === 'authentication')!;
        expect(guard.providers!.http_basic.accounts).toMatchObject([{ username: 'owner' }]);
      }
      };
      assertIngress(adapted);
      // Merchant ingress opens only for a literal true; all other strings keep
      // the false CEL condition and the terminal503 branch. No application404.
      for (const value of ['true', 'false', 'TRUE', '1', '']) {
        assertIngress(adapt(file, { RELOCATION_QA_TEST_WEBHOOK_ENABLED: value }), value);
        execFileSync(bin, ['validate', '--adapter', 'caddyfile', '--config', file], {
          env: { ...env, RELOCATION_QA_TEST_WEBHOOK_ENABLED: value }, stdio: ['ignore', 'pipe', 'pipe'],
        });
      }
      // Re-adapt the formerly deployed rewrite; valid Caddy syntax must still
      // fail admission because it bypasses the QA guard.
      const oldRewrite = put('old-rewrite.caddy', readFileSync(file, 'utf8').replace(
        '\t\t\thandle @window-open {\n', '\t\t\thandle @window-open {\n\t\t\t\trewrite * /api/webhooks/yookassa\n'));
      expect(() => assertIngress(adapt(oldRewrite, { RELOCATION_QA_TEST_WEBHOOK_ENABLED: 'true' }), 'true')).toThrow();
      // Falsifiers operate on adapted JSON, so auth/order/matcher regressions
      // cannot stay green merely because Caddy accepts their syntax.
      const wide = structuredClone(adapted);
      const callback = objects(wide).find(x => x.match?.some(m => m.path?.includes('/api/webhooks/yookassa-test')))!;
      callback.match![0]!.path = ['/api/*'];
      expect(() => assertIngress(wide)).toThrow();
      const publicSupport = structuredClone(adapted);
      const support = objects(publicSupport).find(x => x.match?.some(m => m.host?.includes('support.clipmkr.ru')))!;
      objects(support).find(x => x.handler === 'authentication')!.handler = 'encode';
      expect(() => assertIngress(publicSupport)).toThrow();
      const forwardedAuth = structuredClone(adapted);
      const supportProxy = objects(forwardedAuth).find(x => x.handler === 'reverse_proxy' && x.upstreams?.some(u => u.dial === '172.29.8.1:5812'))!;
      supportProxy.headers!.request.delete = supportProxy.headers!.request.delete.filter(name => name !== 'Authorization');
      expect(() => assertIngress(forwardedAuth)).toThrow();
      const spoofed = structuredClone(adapted);
      const proxy = objects(spoofed).find(x => x.handler === 'reverse_proxy' && x.upstreams?.some(u => u.dial === '172.29.8.1:5811'))!;
      proxy.headers!.request.set['X-Forwarded-For'] = ['{http.request.header.X-Forwarded-For}'];
      expect(() => assertIngress(spoofed)).toThrow();
      // Missing auth/TLS/foreign-route includes are hard failures, never an empty wildcard import.
      for (const key of Object.keys(env).filter(key => key.startsWith('RELOCATION_'))) {
        expect(() => adapt(file, { [key]: path.join(directory, 'missing.caddy') })).toThrow();
      }
      const publicAuth = put('unsafe-auth.caddy', '# missing authentication\n');
      const unsafe = adapt(file, { RELOCATION_QA_AUTH_FILE: publicAuth });
      expect(() => assertIngress(unsafe)).toThrow();
      for (const host of ['77.83.87.178', 'clipmkr.ru', 'www.clipmkr.ru', 'support.clipmkr.ru']) {
        const route = objects(unsafe).find(x => x.match?.some(m => m.host?.includes(host)))!;
        const guards = objects(route).filter(x => x.handler === 'authentication');
        expect(guards).toHaveLength(1);
        expect(guards[0]!.providers!.http_basic.accounts ?? []).toEqual([]);
      }
      // Canonical bytes select the client for both address families, irrespective of a supplied XFF.
      for (const ip of ['203.0.113.9', '2001:db8::9']) {
        expect(clientIp(new Headers({ 'x-forwarded-for': `${ip}, 172.29.8.2` }), 1)).toBe(ip);
      }
      expect(() => clientIp(new Headers({ 'x-forwarded-for': 'spoofed' }), 1)).toThrow();
      expect(() => clientIp(new Headers(), 0)).toThrow();
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });

  it('QA SDK requests remain within the exact storage namespace', async () => {
    const config = compose().services.web.environment;
    const client = createS3Client({ endpoint: 'https://storage.invalid', publicEndpoint: 'https://public.invalid',
      region: 'us-east-1', bucket: 'synthetic', accessKeyId: 'synthetic', secretAccessKey: 'synthetic',
      forcePathStyle: true, keyPrefix: config.S3_KEY_PREFIX });
    const wire: Wire[] = [];
    client.config.requestHandler = { handle: async (request: Wire) => {
      wire.push(request); return { response: { statusCode: 200, headers: {}, body: Readable.from([
        request.method === 'POST' && request.query.uploadId
          ? '<CompleteMultipartUploadResult><ETag>synthetic</ETag></CompleteMultipartUploadResult>' : '',
      ]) } };
    }, destroy() {} } as typeof client.config.requestHandler;
    const bucket = 'synthetic', key = 'videos/synthetic/input';
    try {
      for (const command of [new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'synthetic' }),
        new DeleteObjectCommand({ Bucket: bucket, Key: key }), new HeadObjectCommand({ Bucket: bucket, Key: key }),
        new GetObjectCommand({ Bucket: bucket, Key: key }), new CreateMultipartUploadCommand({ Bucket: bucket, Key: key }),
        new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: 'synthetic', PartNumber: 1, Body: 'synthetic' }),
        new ListPartsCommand({ Bucket: bucket, Key: key, UploadId: 'synthetic' }),
        new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: 'synthetic', MultipartUpload: { Parts: [] } }),
        new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: 'synthetic' })]) {
        await client.send(command as never); expect(wire.at(-1)!.path).toBe(`/synthetic/${prefix}${key}`);
      }
      for (const command of [new ListObjectsV2Command({ Bucket: bucket, Prefix: 'videos/' }),
        new ListMultipartUploadsCommand({ Bucket: bucket, Prefix: 'videos/' })]) {
        await client.send(command as never); expect(wire.at(-1)!.query.prefix).toBe(prefix + 'videos/');
      }
      for (const command of [new GetObjectCommand({ Bucket: bucket, Key: key }),
        new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: 'synthetic', PartNumber: 1 })]) {
        const url = new URL(await getSignedUrl(client.signingClient!, command as never, { expiresIn: 60 }));
        expect(url.hostname).toBe('public.invalid'); expect(url.pathname).toBe(`/synthetic/${prefix}${key}`);
      }
      const count = wire.length;
      for (const bad of ['../original', '/original', 'tests/site/original', prefix + key]) {
        await expect(client.send(new DeleteObjectCommand({ Bucket: bucket, Key: bad }))).rejects.toThrow();
      }
      expect(wire).toHaveLength(count);
    } finally { client.destroy(); }
  });
});
