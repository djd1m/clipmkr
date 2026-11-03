import { describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { AbortMultipartUploadCommand, CompleteMultipartUploadCommand, CopyObjectCommand, CreateMultipartUploadCommand,
  DeleteBucketCommand, DeleteObjectCommand, GetBucketVersioningCommand, GetObjectCommand, HeadObjectCommand,
  ListBucketsCommand, ListMultipartUploadsCommand, ListObjectsV2Command, ListPartsCommand, PutObjectCommand, S3Client, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { loadS3Config, loadWebConfig } from '../packages/shared/src/config';
import { createS3Client } from '../packages/s3/src/client';
import { environment, liveS3Environment } from './fixtures/environment';

const base = { endpoint: 'http://storage.test', publicEndpoint: 'http://public.test', region: 'us-east-1', bucket: 'bucket',
  accessKeyId: 'fixture', secretAccessKey: 'fixture-secret', forcePathStyle: true };
type Wire = { hostname: string; path: string; query: Record<string, string>; method: string };
function fixture(prefix = 'tests/cloud/', forcePathStyle = true) {
  const client = createS3Client({ ...base, forcePathStyle, ...(prefix ? { keyPrefix: prefix } : {}) });
  const wire: Wire[] = []; let body = ''; let status = 200;
  const handler = { handle: async (request: Wire) => { wire.push(request); return { response: { statusCode: status,
    headers: { 'content-type': 'application/xml' }, body: Readable.from([body]) } }; }, destroy() {} };
  client.config.requestHandler = handler as typeof client.config.requestHandler;
  return { client, wire, response(xml: string, code = 200) { body = xml; status = code; } };
}
const xml = (tag: string, value: string) => `<${tag}>${value}</${tag}>`;

describe('S3 namespace', () => {
  it('validates prefix and checkout config without changing production S3 config shape', () => {
    expect(loadS3Config(environment())).not.toHaveProperty('keyPrefix');
    expect(loadS3Config({ ...environment(), S3_KEY_PREFIX: 'tests/cloud/' }).keyPrefix).toBe('tests/cloud/');
    for (const key of ['/tests/cloud/', 'tests//cloud/', 'tests/../', 'tests/cloud', 'tests/%2f/', 'tests\\cloud/', 'tests/cloud/?']) {
      expect(() => loadS3Config({ ...environment(), S3_KEY_PREFIX: key })).toThrow();
    }
    expect(loadWebConfig(environment()).checkoutEnabled).toBe(true);
    expect(loadWebConfig({ ...environment(), N5_CHECKOUT_ENABLED: 'false' }).checkoutEnabled).toBe(false);
    for (const invalid of ['', 'TRUE', '1']) expect(() => loadWebConfig({ ...environment(), N5_CHECKOUT_ENABLED: invalid })).toThrow();
  });
  it.each([true, false])('prefixes all object commands before serialization and signing, path style %s', async (forcePathStyle) => {
    const f = fixture('tests/cloud/', forcePathStyle); const bucket = base.bucket; const key = 'video/file.mp4';
    const commands = [new HeadObjectCommand({ Bucket: bucket, Key: key }), new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-3' }),
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'x' }), new DeleteObjectCommand({ Bucket: bucket, Key: key }),
      new CreateMultipartUploadCommand({ Bucket: bucket, Key: key }), new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: 'upload', PartNumber: 1, Body: 'x' }),
      new ListPartsCommand({ Bucket: bucket, Key: key, UploadId: 'upload' }),
      new CompleteMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: 'upload', MultipartUpload: { Parts: [] } }),
      new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: 'upload' })];
    for (const command of commands) {
      f.response(command instanceof CompleteMultipartUploadCommand ? '<CompleteMultipartUploadResult><ETag>etag</ETag></CompleteMultipartUploadResult>' : ''); await f.client.send(command as never);
      const request = f.wire.at(-1)!; expect(request.path).toContain('/tests/cloud/video/file.mp4');
      expect((command.input as { Key: string }).Key).toBe(key);
    }
    const command = commands[0]!; await f.client.send(command as never); expect(f.wire.at(-1)!.path).toContain('/tests/cloud/video/file.mp4');
    const url = await getSignedUrl(f.client.signingClient!, new UploadPartCommand({ Bucket: bucket, Key: key, UploadId: 'upload', PartNumber: 1 }), { expiresIn: 60 });
    expect(new URL(url).pathname).toContain('/tests/cloud/video/file.mp4'); expect(new URL(url).hostname).toContain('public.test');
    f.client.destroy();
  });
  it('translates list paths and opaque markers and strips only matching returned keys', async () => {
    const f = fixture();
    f.response(`<ListBucketResult>${xml('Prefix','tests/cloud/video/')}${xml('StartAfter','tests/cloud/video/a')}${xml('Contents',xml('Key','tests/cloud/video/b'))}${xml('CommonPrefixes',xml('Prefix','tests/cloud/video/sub/'))}${xml('NextContinuationToken','opaque%2Ftoken')}</ListBucketResult>`);
    const listed = await f.client.send(new ListObjectsV2Command({ Bucket: base.bucket, Prefix: 'video/', StartAfter: 'video/a', ContinuationToken: 'opaque%2Ftoken' }));
    expect(listed.Contents?.[0]?.Key).toBe('video/b'); expect(listed.CommonPrefixes?.[0]?.Prefix).toBe('video/sub/');
    expect(listed.Prefix).toBe('video/'); expect(listed.StartAfter).toBe('video/a'); expect(listed.NextContinuationToken).toBe('opaque%2Ftoken');
    expect(f.wire[0]!.query.prefix).toBe('tests/cloud/video/'); expect(f.wire[0]!.query['start-after']).toBe('tests/cloud/video/a');
    expect(f.wire[0]!.query['continuation-token']).toBe('opaque%2Ftoken');
    f.response(`<ListMultipartUploadsResult>${xml('Prefix','tests/cloud/')}${xml('KeyMarker','tests/cloud/a')}${xml('NextKeyMarker','tests/cloud/b')}${xml('Upload',xml('Key','tests/cloud/b'))}${xml('CommonPrefixes',xml('Prefix','tests/cloud/sub/'))}${xml('NextUploadIdMarker','opaque')}</ListMultipartUploadsResult>`);
    const uploads = await f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket, KeyMarker: 'a', UploadIdMarker: 'opaque' }));
    expect(f.wire[1]!.query.prefix).toBe('tests/cloud/'); expect(f.wire[1]!.query['key-marker']).toBe('tests/cloud/a');
    expect(uploads.Uploads?.[0]?.Key).toBe('b'); expect(uploads.NextKeyMarker).toBe('b'); expect(uploads.NextUploadIdMarker).toBe('opaque');
    f.client.destroy();
  });
  it('rejects malformed paths, bucket mismatch, unsupported commands and foreign responses without escaping namespace', async () => {
    const f = fixture();
    for (const key of ['', '/a', 'a//b', 'a/../b', 'a/./b', 'a%2fb', 'a?x', 'a#x', 'a\\b', 'tests/cloud/a', 'tests/site/a']) {
      await expect(f.client.send(new GetObjectCommand({ Bucket: base.bucket, Key: key }))).rejects.toThrow();
    }
    await expect(f.client.send(new GetObjectCommand({ Bucket: 'foreign', Key: 'a' }))).rejects.toThrow();
    await expect(f.client.send(new CopyObjectCommand({ Bucket: base.bucket, Key: 'a', CopySource: 'bucket/source' }))).rejects.toThrow();
    await expect(f.client.send(new DeleteBucketCommand({ Bucket: base.bucket }))).rejects.toThrow();
    await expect(f.client.send(new ListObjectsV2Command({ Bucket: base.bucket, EncodingType: 'url' }))).rejects.toThrow();
    expect(f.wire).toHaveLength(0);
    f.response(`<ListBucketResult>${xml('Contents',xml('Key','production/object'))}</ListBucketResult>`);
    await expect(f.client.send(new ListObjectsV2Command({ Bucket: base.bucket }))).rejects.toThrow();
    f.response('<VersioningConfiguration><Status>Suspended</Status></VersioningConfiguration>');
    const version = await f.client.send(new GetBucketVersioningCommand({ Bucket: base.bucket })); expect(version.Status).toBe('Suspended');
    f.client.destroy();
  });
  it('validates multipart response keys and forbids foreign markers and presigned keys', async () => {
    const f = fixture();
    for (const [command, root] of [
      [new CreateMultipartUploadCommand({ Bucket: base.bucket, Key: 'a' }), 'InitiateMultipartUploadResult'],
      [new ListPartsCommand({ Bucket: base.bucket, Key: 'a', UploadId: 'opaque' }), 'ListPartsResult'],
      [new CompleteMultipartUploadCommand({ Bucket: base.bucket, Key: 'a', UploadId: 'opaque', MultipartUpload: { Parts: [] } }), 'CompleteMultipartUploadResult'],
    ] as const) {
      f.response(`<${root}><Key>production/a</Key></${root}>`);
      await expect(f.client.send(command as never)).rejects.toThrow('namespace');
      f.response(`<${root}><Key>tests/cloud/a</Key></${root}>`);
      expect((await f.client.send(command as never) as { Key?: string }).Key).toBe('a');
    }
    const count = f.wire.length;
    await expect(f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket, KeyMarker: '../outside' }))).rejects.toThrow();
    await expect(f.client.send(new ListObjectsV2Command({ Bucket: base.bucket, StartAfter: 'tests/site/a' }))).rejects.toThrow();
    await expect(getSignedUrl(f.client.signingClient!, new GetObjectCommand({ Bucket: base.bucket, Key: 'tests/site/a' }), { expiresIn: 60 })).rejects.toThrow();
    expect(f.wire).toHaveLength(count);
    f.response('<ListMultipartUploadsResult><KeyMarker></KeyMarker><NextKeyMarker></NextKeyMarker><IsTruncated>false</IsTruncated></ListMultipartUploadsResult>');
    expect((await f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket }))).KeyMarker).toBe('');
    await expect(f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket, KeyMarker: 'a' }))).rejects.toThrow('namespace');
    f.response('<ListMultipartUploadsResult><NextKeyMarker></NextKeyMarker><IsTruncated>true</IsTruncated></ListMultipartUploadsResult>');
    await expect(f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket }))).rejects.toThrow('namespace');
    f.response('<ListMultipartUploadsResult><NextKeyMarker>tests/site/a</NextKeyMarker></ListMultipartUploadsResult>');
    await expect(f.client.send(new ListMultipartUploadsCommand({ Bucket: base.bucket }))).rejects.toThrow('namespace');
    f.client.destroy();
  });
  it('blocks live test transport outside its independent run scope', async () => {
    for (const [key, value] of Object.entries({ N5_PREFIX_RUN_S3: '1', N5_PREFIX_S3_ENDPOINT: 'https://s3.cloud.ru', N5_PREFIX_S3_BUCKET: 'bucket',
      N5_PREFIX_S3_REGION: 'test', N5_PREFIX_S3_ACCESS_KEY: 'fake', N5_PREFIX_S3_SECRET_KEY: 'fake-secret', N5_PREFIX_S3_FORCE_PATH_STYLE: 'true' })) vi.stubEnv(key, value);
    const fakeFetch = vi.fn(async (_url: string, _init: RequestInit) => new Response('ok')); vi.stubGlobal('fetch', fakeFetch);
    const safety = liveS3Environment(); const scope = { prefixes: ['tests/cloud/videos/11111111-1111-4111-8111-111111111111/'], allowList: true, allowVersioning: true };
    const client = new S3Client({ endpoint: safety.config.endpoint, region: safety.config.region, forcePathStyle: true,
      credentials: { accessKeyId: 'fake', secretAccessKey: 'fake-secret' }, maxAttempts: 1 });
    let requests = 0;
    client.config.requestHandler = { handle: async () => { requests++; return { response: { statusCode: 200, headers: {}, body: Readable.from(['']) } }; }, destroy() {} } as typeof client.config.requestHandler;
    safety.bind(client, scope);
    try {
      // This client has no application namespace middleware at all.
      const key = scope.prefixes[0]! + 'file'; await client.send(new PutObjectCommand({ Bucket: 'bucket', Key: key, Body: 'x' }));
      await client.send(new GetBucketVersioningCommand({ Bucket: 'bucket' }));
      await client.send(new ListObjectsV2Command({ Bucket: 'bucket', Prefix: scope.prefixes[0] }));
      expect(requests).toBe(3);
      for (const command of [new PutObjectCommand({ Bucket: 'bucket', Key: 'production/file', Body: 'x' }),
        new PutObjectCommand({ Bucket: 'another', Key: key, Body: 'x' }), new DeleteBucketCommand({ Bucket: 'bucket' }),
        new ListBucketsCommand({}), new ListObjectsV2Command({ Bucket: 'bucket' }),
        new ListObjectsV2Command({ Bucket: 'bucket', Prefix: 'tests/cloud/' }),
        new ListObjectsV2Command({ Bucket: 'bucket', Prefix: scope.prefixes[0], StartAfter: 'tests/site/other' }),
        new CopyObjectCommand({ Bucket: 'bucket', Key: key, CopySource: 'bucket/production/file' })]) {
        await expect(client.send(command as never)).rejects.toThrow('S3 test fence');
      }
      expect(requests).toBe(3);
      await expect(safety.fetch('https://s3.cloud.ru/bucket/production/file', { method: 'GET' }, scope)).rejects.toThrow('S3 test fence');
      await expect(safety.fetch('https://s3.cloud.ru/bucket/' + key, { method: 'GET' }, scope, 120_001)).rejects.toThrow('timeout');
      expect(fakeFetch).not.toHaveBeenCalled();
      const controller = new AbortController();
      await safety.fetch('https://s3.cloud.ru/bucket/' + key, { method: 'GET', redirect: 'follow', signal: controller.signal }, scope); expect(fakeFetch).toHaveBeenCalledOnce();
      expect(fakeFetch.mock.calls[0]![1]).toMatchObject({ redirect: 'error' });
      controller.abort(); expect(fakeFetch.mock.calls[0]![1].signal?.aborted).toBe(true);
      for (const query of [{ versioning: '', prefix: scope.prefixes[0]! }, { uploads: '', prefix: scope.prefixes[0]!, 'list-type': '2' }, { uploads: '', prefix: scope.prefixes[0]!, versioning: '' }]) {
        expect(() => client.config.requestHandler.handle({ protocol: 'https:', hostname: 's3.cloud.ru', method: 'GET', path: '/bucket/', query } as never)).toThrow('S3 test fence');
      }
      expect(requests).toBe(3);
    } finally { client.destroy(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); }
  });
  it('preserves unrestricted production behavior when namespace is empty', async () => {
    const f = fixture(''); await f.client.send(new DeleteBucketCommand({ Bucket: 'another' }));
    expect(f.wire).toHaveLength(1); expect(f.wire[0]!.path).toBe('/another/'); f.client.destroy();
  });
});
