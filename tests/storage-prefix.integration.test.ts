import { describe, expect, it } from 'vitest';
import { randomUUID, createHash } from 'node:crypto';
import { closeSync, fchmodSync, fsyncSync, lstatSync, openSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { AbortMultipartUploadCommand, CreateMultipartUploadCommand, DeleteObjectCommand, GetObjectCommand,
  HeadObjectCommand, ListMultipartUploadsCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { createS3Client } from '../packages/s3/src/client';
import { erasePrefix } from '../packages/s3/src/erasure';
import { completeMultipartUpload, listUploadedParts } from '../packages/s3/src/multipart';
import { generateDownloadUrl, signParts } from '../packages/s3/src/presign';
import { liveS3Environment } from './fixtures/environment';

// Explicit opt-in: this test uses only unique objects under the two test prefixes.
const endpoint = process.env.N5_PREFIX_S3_ENDPOINT;
const bucket = process.env.N5_PREFIX_S3_BUCKET;
const region = process.env.N5_PREFIX_S3_REGION;
const accessKeyId = process.env.N5_PREFIX_S3_ACCESS_KEY;
const secretAccessKey = process.env.N5_PREFIX_S3_SECRET_KEY;
const enabled = process.env.N5_PREFIX_RUN_S3 === '1' && !!endpoint && !!bucket && !!region && !!accessKeyId && !!secretAccessKey;
const required = process.env.N5_ACCEPTANCE === '1';
const hash = (body: Uint8Array) => createHash('sha256').update(body).digest('hex');

describe('S3 namespace integration', () => {
  it.skipIf(!enabled && !required)('isolates two namespaces on real S3 and preserves outside canary bytes', async () => {
    if (!enabled || !endpoint || !bucket || !region || !accessKeyId || !secretAccessKey) throw new Error('Real S3 test profile required');
    const url = new URL(endpoint);
    if (url.protocol !== 'https:' || url.hostname !== 's3.cloud.ru' || url.port || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('Expected Cloud.ru S3 origin');
    const safety = liveS3Environment(); const { forcePathStyle } = safety.config;
    const config = safety.config;
    const raw = new S3Client({ endpoint, region, credentials: { accessKeyId, secretAccessKey }, forcePathStyle });
    const cloud = createS3Client({ ...config, keyPrefix: 'tests/cloud/' });
    const site = createS3Client({ ...config, keyPrefix: 'tests/site/' });
    const seen: Array<{ owner: string; path: string; query: Record<string, unknown> }> = [];
    for (const [owner, client] of [['cloud', cloud], ['site', site]] as const) {
      for (const target of [client, client.signingClient!]) {
        target.middlewareStack.add((next, context) => async (args) => {
          const request = args.request as { path: string; query: Record<string, unknown> };
          seen.push({ owner, path: request.path, query: { ...request.query } });
          const result = await next(args);
          // A presign operation builds a request but has no network response.
          if (target === client) {
            const meta = (result.output as { $metadata?: { httpStatusCode?: number; requestId?: string } }).$metadata;
            receipt.sdkRequests.push({ owner, command: context.commandName ?? '', httpStatus: meta?.httpStatusCode ?? null,
              requestId: meta?.requestId ?? null, path: request.path,
              prefix: typeof request.query.prefix === 'string' ? request.query.prefix : null,
              keyMarker: typeof request.query['key-marker'] === 'string' ? request.query['key-marker'] : null });
            saveReceipt();
          }
          return result;
        }, { step: 'build', name: 'fixtureWireCapture', priority: 'low' });
      }
    }
    const uuid = randomUUID(); const prefix = `videos/${uuid}/`; const key = prefix + 'input';
    const receiptDir = process.env.N5_PREFIX_S3_RECEIPT_DIR;
    if (!receiptDir) throw new Error('Private S3 receipt directory required');
    if (receiptDir) {
      const st = lstatSync(receiptDir); const resolved = realpathSync(receiptDir); const repo = realpathSync(process.cwd());
      if (!path.isAbsolute(receiptDir) || resolved !== receiptDir || !st.isDirectory() || st.isSymbolicLink() ||
          st.uid !== process.getuid?.() || (st.mode & 0o777) !== 0o700 || resolved === repo || resolved.startsWith(repo + path.sep)) throw new Error('Invalid private S3 receipt directory');
    }
    const receipt = { uuid, namespace: ['tests/cloud/', 'tests/site/'], attemptedKeys: [] as string[], uploads: [] as Array<{ key: string; id: string; state: string }>, objectStates: [] as Array<{ key: string; state: string }>, unknownMultipartKeys: [] as string[], cleanupComplete: false, cleanupState: 'pending',
      sdkRequests: [] as Array<{ owner: string; command: string; httpStatus: number | null; requestId: string | null; path: string; prefix: string | null; keyMarker: string | null }>,
      signedHttp: [] as Array<{ operation: string; httpStatus: number; requestId: string | null; key: string; bytesSha: string }>,
      canaryBeforeSha256: null as string | null, canaryAfterSha256: null as string | null };
    const saveReceipt = () => {
      if (!receiptDir) return;
      const target = path.join(receiptDir, `storage-prefix-${uuid}.json`), tmp = path.join(receiptDir, `.storage-prefix-${uuid}-${randomUUID()}`);
      const fd = openSync(tmp, 'wx', 0o600);
      try { fchmodSync(fd, 0o600); writeFileSync(fd, JSON.stringify(receipt)); fsyncSync(fd); } finally { closeSync(fd); }
      renameSync(tmp, target);
      const dir = openSync(receiptDir, 'r'); try { fsyncSync(dir); } finally { closeSync(dir); }
    };
    // Persist intent before the first network mutation, including its unique scope.
    saveReceipt();
    const canary = `tests/site/${prefix}canary`;
    const cloudScope = { prefixes: [`tests/cloud/${prefix}`], allowList: true, allowVersioning: true };
    const siteScope = { prefixes: [`tests/site/${prefix}`], allowList: true };
    const rawScope = { prefixes: [`tests/site/${prefix}`], exactKeys: [canary] };
    safety.bind(raw, rawScope); safety.bind(cloud, cloudScope); safety.bind(cloud.signingClient!, cloudScope);
    safety.bind(site, siteScope); safety.bind(site.signingClient!, siteScope);
    const pending: Array<{ key: string; id: string }> = [];
    const cloudKeys: string[] = []; const siteKeys: string[] = [];
    let canaryAttempted = false; let primary: unknown;
    const safeError = (error: unknown) => {
      const e = error as { name?: string; $metadata?: { httpStatusCode?: number } };
      const allowed = new Set(['AccessDenied', 'NoSuchBucket', 'NotFound', 'NoSuchUpload', 'SignatureDoesNotMatch', 'InvalidAccessKeyId', 'NetworkingError', 'TimeoutError', 'TypeError', 'Error']);
      const name = e && typeof e.name === 'string' && allowed.has(e.name) ? e.name : 'OtherError';
      const status = e?.$metadata?.httpStatusCode;
      return `${name}:${typeof status === 'number' && status >= 100 && status <= 599 ? status : 'unknown'}`;
    };
    const readCanary = async () => (await (await raw.send(new GetObjectCommand({ Bucket: bucket, Key: canary }))).Body!.transformToByteArray());
    const list = async (client: typeof cloud) => (await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))).Contents?.map((x) => x.Key).sort() ?? [];
    try {
      // The only raw write is a synthetic canary in this run's site namespace.
      canaryAttempted = true; receipt.attemptedKeys.push(canary); receipt.objectStates.push({ key: canary, state: 'unknown' }); saveReceipt();
      await raw.send(new PutObjectCommand({ Bucket: bucket, Key: canary, Body: 'synthetic canary' }));
      cloudKeys.push(key); receipt.attemptedKeys.push('tests/cloud/' + key); receipt.objectStates.push({ key: 'tests/cloud/' + key, state: 'unknown' }); saveReceipt(); await cloud.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'cloud bytes' }));
      siteKeys.push(key); receipt.attemptedKeys.push('tests/site/' + key); receipt.objectStates.push({ key: 'tests/site/' + key, state: 'unknown' }); saveReceipt(); await site.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: 'site bytes' }));
      const beforeCanary = await readCanary(); receipt.canaryBeforeSha256 = hash(beforeCanary); saveReceipt(); const beforeSite = await list(site);
      const siteBytes = await (await site.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body!.transformToByteArray();
      cloudKeys.push(prefix + 'multipart'); receipt.attemptedKeys.push('tests/cloud/' + prefix + 'multipart'); receipt.objectStates.push({ key: 'tests/cloud/' + prefix + 'multipart', state: 'unknown' });
      receipt.unknownMultipartKeys.push(prefix + 'multipart'); saveReceipt();
      const initial = await cloud.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: prefix + 'multipart' }));
      if (!initial.UploadId) throw new Error('S3 did not return upload id');
      pending.push({ key: prefix + 'multipart', id: initial.UploadId });
      receipt.uploads.push({ key: prefix + 'multipart', id: initial.UploadId, state: 'resolved' }); receipt.unknownMultipartKeys.pop(); saveReceipt();
      const signedPart = (await signParts({ client: cloud, bucket }, prefix + 'multipart', initial.UploadId, 1, new Date()))[0]!.url;
      expect(new URL(signedPart).pathname).toContain('/tests/cloud/' + prefix + 'multipart');
      const partResponse = await safety.fetch(signedPart, { method: 'PUT', body: 'part bytes' }, cloudScope);
      receipt.signedHttp.push({ operation: 'UploadPart', httpStatus: partResponse.status, requestId: partResponse.headers.get('x-amz-request-id'), key: 'tests/cloud/' + prefix + 'multipart', bytesSha: hash(Buffer.from('part bytes')) }); saveReceipt();
      expect(partResponse.ok).toBe(true);
      const parts = await listUploadedParts({ client: cloud, bucket }, prefix + 'multipart', initial.UploadId); expect(parts).toHaveLength(1);
      await completeMultipartUpload({ client: cloud, bucket }, prefix + 'multipart', initial.UploadId, parts);
      receipt.uploads[0]!.state = 'completed'; saveReceipt(); pending.pop();
      const download = await generateDownloadUrl({ client: cloud, bucket }, prefix + 'multipart');
      expect(new URL(download).pathname).toContain('/tests/cloud/' + prefix + 'multipart');
      const downloadResponse = await safety.fetch(download, {}, cloudScope); const downloaded = Buffer.from(await downloadResponse.arrayBuffer());
      receipt.signedHttp.push({ operation: 'GetObject', httpStatus: downloadResponse.status, requestId: downloadResponse.headers.get('x-amz-request-id'), key: 'tests/cloud/' + prefix + 'multipart', bytesSha: hash(downloaded) }); saveReceipt();
      expect(downloaded.toString()).toBe('part bytes');
      for (const suffix of ['pending-a', 'pending-b']) {
        const logicalKey = prefix + suffix;
        cloudKeys.push(logicalKey); receipt.attemptedKeys.push('tests/cloud/' + logicalKey); receipt.objectStates.push({ key: 'tests/cloud/' + logicalKey, state: 'unknown' });
        receipt.unknownMultipartKeys.push(logicalKey); saveReceipt();
        const upload = await cloud.send(new CreateMultipartUploadCommand({ Bucket: bucket, Key: logicalKey }));
        if (!upload.UploadId) throw new Error('S3 did not return upload id');
        pending.push({ key: logicalKey, id: upload.UploadId });
        receipt.uploads.push({ key: logicalKey, id: upload.UploadId, state: 'resolved' }); receipt.unknownMultipartKeys.pop(); saveReceipt();
      }
      const page1 = await cloud.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix: prefix, MaxUploads: 1 }));
      expect(page1.IsTruncated).toBe(true); expect(page1.Uploads).toHaveLength(1); expect(page1.NextKeyMarker?.startsWith(prefix)).toBe(true);
      const page2 = await cloud.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix: prefix, MaxUploads: 1, KeyMarker: page1.NextKeyMarker, UploadIdMarker: page1.NextUploadIdMarker }));
      expect(page2.Uploads?.[0]?.Key?.startsWith(prefix)).toBe(true);
      const objects = await cloud.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1 }));
      expect(objects.IsTruncated).toBe(true);
      const objectPage2 = await cloud.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1, ContinuationToken: objects.NextContinuationToken }));
      expect(objectPage2.Contents?.length).toBeGreaterThan(0);
      await erasePrefix({ client: cloud, bucket }, prefix);
      expect(await list(cloud)).toEqual([]);
      expect((await cloud.send(new ListMultipartUploadsCommand({ Bucket: bucket, Prefix: prefix }))).Uploads ?? []).toHaveLength(0);
      receipt.uploads.forEach((u) => { if (u.state === 'resolved') u.state = 'cleaned'; }); saveReceipt(); pending.length = 0;
      receipt.canaryAfterSha256 = hash(await readCanary()); saveReceipt();
      expect(receipt.canaryAfterSha256).toBe(receipt.canaryBeforeSha256);
      expect((await raw.send(new HeadObjectCommand({ Bucket: bucket, Key: canary }))).ContentLength).toBe(beforeCanary.length);
      expect(await list(site)).toEqual(beforeSite);
      expect(hash(await (await site.send(new GetObjectCommand({ Bucket: bucket, Key: key }))).Body!.transformToByteArray())).toBe(hash(siteBytes));
      for (const request of seen) {
        const ns = `tests/${request.owner}/`;
        // Read-only GetBucketVersioning is the ADR's sole bucket-scoped exception.
        if ('versioning' in request.query) continue;
        if ('prefix' in request.query) expect(String(request.query.prefix).startsWith(ns + prefix)).toBe(true);
        else expect(request.path).toContain('/' + ns + prefix);
        if ('key-marker' in request.query) expect(String(request.query['key-marker']).startsWith(ns + prefix)).toBe(true);
      }
      await expect(cloud.send(new GetObjectCommand({ Bucket: bucket, Key: 'tests/site/' + key }))).rejects.toThrow();
    } catch (error) { primary = error; } finally {
      receipt.cleanupState = 'cleanup'; let beginError: unknown; try { saveReceipt(); } catch (error) { beginError = error; }
      // Exact per-run keys and upload ids only: no bucket-wide listing or cleanup.
      const aborts = await Promise.allSettled((beginError ? [] : pending).map(async (item) => {
        try { await cloud.send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: item.key, UploadId: item.id })); }
        catch (error) { if (!(error instanceof Error && error.name === 'NoSuchUpload')) throw error; }
      }));
      const removals = await Promise.allSettled(beginError ? [] : [
        ...cloudKeys.map((object) => cloud.send(new DeleteObjectCommand({ Bucket: bucket, Key: object }))),
        ...siteKeys.map((object) => site.send(new DeleteObjectCommand({ Bucket: bucket, Key: object }))),
        ...(canaryAttempted ? [raw.send(new DeleteObjectCommand({ Bucket: bucket, Key: canary }))] : []),
      ]);
      cloud.destroy(); site.destroy(); raw.destroy();
      aborts.forEach((r, i) => { if (r.status === 'fulfilled') { const u = receipt.uploads.find((item) => item.id === pending[i]!.id); if (u) u.state = 'cleaned'; } });
      const physicalKeys = [...cloudKeys.map((k) => 'tests/cloud/' + k), ...siteKeys.map((k) => 'tests/site/' + k), ...(canaryAttempted ? [canary] : [])];
      removals.forEach((r, i) => { if (r.status === 'fulfilled') { const object = receipt.objectStates.find((item) => item.key === physicalKeys[i]); if (object) object.state = 'cleaned'; } });
      const failed = [...aborts, ...removals].filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      receipt.cleanupComplete = !beginError && failed.length === 0 && receipt.unknownMultipartKeys.length === 0; receipt.cleanupState = receipt.cleanupComplete ? 'complete' : 'pending';
      let receiptError: unknown = beginError; try { saveReceipt(); } catch (error) { receiptError ??= error; }
      if (primary || failed.length || !receipt.cleanupComplete || receiptError) throw new Error(`S3 fixture primary=${primary ? safeError(primary) : 'none'} cleanup=${failed.length ? failed.map((result) => safeError(result.reason)).join(',') : receipt.cleanupComplete ? 'ok' : 'unknown-upload'} receipt=${receiptError ? safeError(receiptError) : 'ok'}`);
    }
  }, 120_000);
});
