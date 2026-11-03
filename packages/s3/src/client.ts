// Адаптировано из .reference/jan-clone/packages/s3/src/client.ts.
import { S3Client } from '@aws-sdk/client-s3';
import type { S3Config } from '@clipmaker/shared/config';
// Namespace is applied before serialization/signing and removed after deserialization.
const objectCommands = new Set(['HeadObjectCommand', 'GetObjectCommand', 'PutObjectCommand', 'DeleteObjectCommand',
  'CreateMultipartUploadCommand', 'UploadPartCommand', 'ListPartsCommand', 'CompleteMultipartUploadCommand', 'AbortMultipartUploadCommand']);
const listCommands = new Set(['ListObjectsV2Command', 'ListMultipartUploadsCommand']);
const keyFields = new Set(['Key', 'Prefix', 'KeyMarker', 'NextKeyMarker', 'StartAfter']);
function validateLogical(value: unknown, allowEmpty = false, allowTrailing = false): asserts value is string {
  if (typeof value !== 'string' || (!value && !allowEmpty) || /[\\%?#\x00-\x1f\x7f-\x9f]/.test(value) || value.startsWith('/') ||
      /^(?:tests\/(?:cloud|site)\/)/.test(value)) throw new Error('Недопустимый S3 logical key');
  if (value) {
    const parts = value.split('/');
    if (allowTrailing && parts.at(-1) === '') parts.pop();
    if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error('Недопустимый S3 logical key');
  }
}
function scopedClient(client: S3Client, bucket: string, prefix: string): void {
  if (!prefix) return;
  if (!/^(?:[a-z0-9_-]+\/)+$/.test(prefix)) throw new Error('Недопустимый S3_KEY_PREFIX');
  client.middlewareStack.add((next, context) => async (args) => {
    const name = context.commandName ?? '';
    if (!objectCommands.has(name) && !listCommands.has(name) && name !== 'GetBucketVersioningCommand') {
      throw new Error('S3 command не разрешён в namespace');
    }
    const input = args.input as Record<string, unknown>;
    if (input.Bucket !== bucket || input.EncodingType !== undefined) throw new Error('S3 bucket или encoding не разрешён');
    const allowedFields = objectCommands.has(name) ? ['Key'] : name === 'ListObjectsV2Command' ? ['Prefix', 'StartAfter'] : name === 'ListMultipartUploadsCommand' ? ['Prefix', 'KeyMarker'] : [];
    for (const field of keyFields) if (input[field] !== undefined && !allowedFields.includes(field)) throw new Error('S3 key-поле не разрешено');
    const scoped: Record<string, unknown> = { ...input };
    const put = (field: string, allowEmpty = false, allowTrailing = false) => {
      const value = input[field];
      validateLogical(value, allowEmpty, allowTrailing);
      if (value.startsWith(prefix)) throw new Error('S3 key уже содержит namespace');
      scoped[field] = prefix + value;
    };
    if (objectCommands.has(name)) put('Key');
    if (listCommands.has(name)) {
      scoped.Prefix = input.Prefix === undefined ? '' : input.Prefix;
      validateLogical(scoped.Prefix, true, true);
      if ((scoped.Prefix as string).startsWith(prefix)) throw new Error('S3 prefix уже содержит namespace');
      scoped.Prefix = prefix + scoped.Prefix;
      for (const field of name === 'ListObjectsV2Command' ? ['StartAfter'] : ['KeyMarker']) {
        if (input[field] !== undefined) put(field, false, false);
      }
    }
    const result = await next({ ...args, input: scoped });
    const permitted = (path: string) => {
      if (['CreateMultipartUploadCommand', 'ListPartsCommand', 'CompleteMultipartUploadCommand'].includes(name)) return path === 'Key';
      if (name === 'ListObjectsV2Command') return ['Prefix', 'StartAfter', 'Contents[].Key', 'CommonPrefixes[].Prefix'].includes(path);
      if (name === 'ListMultipartUploadsCommand') return ['Prefix', 'KeyMarker', 'NextKeyMarker', 'Uploads[].Key', 'CommonPrefixes[].Prefix'].includes(path);
      return false;
    };
    const clean = (item: unknown, path = ''): unknown => {
      if (Array.isArray(item)) return item.map((v) => clean(v, path + '[]'));
      if (!item || typeof item !== 'object' || Object.getPrototypeOf(item) !== Object.prototype) return item;
      const output: Record<string, unknown> = {};
      for (const [field, value] of Object.entries(item)) {
        const at = path ? path + '.' + field : field;
        if (field === 'EncodingType' && value !== undefined) throw new Error('S3 encoding не поддерживается');
        if (keyFields.has(field) && value !== undefined) {
          // Empty initial/terminal multipart markers are sentinels, never object keys.
          if (name === 'ListMultipartUploadsCommand' && value === '' && ((at === 'KeyMarker' && input.KeyMarker === undefined) || (at === 'NextKeyMarker' && (result.output as { IsTruncated?: boolean }).IsTruncated === false))) { output[field] = ''; continue; }
          if (!permitted(at) || typeof value !== 'string' || !value.startsWith(prefix)) throw new Error(`S3 ответ вне namespace: ${at}`);
          const logical = value.slice(prefix.length);
          validateLogical(logical, field !== 'Key', field === 'Prefix');
          output[field] = logical;
        } else output[field] = clean(value, at);
      }
      return output;
    };
    return { ...result, output: clean(result.output) as typeof result.output };
  }, { step: 'initialize', name: 'clipmakerS3Namespace', priority: 'high' });
}
function clientOptions(config: S3Config) {
  return { endpoint: config.endpoint, region: config.region,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    forcePathStyle: config.forcePathStyle,
    requestChecksumCalculation: 'WHEN_REQUIRED' as const, responseChecksumValidation: 'WHEN_REQUIRED' as const,
    maxAttempts: 3,
    // Длительность запроса выбирает команда, а не общий клиент.
    requestHandler: { connectionTimeout: 2000, throwOnRequestTimeout: true },
  };
}
// Сохраняет внутренний транспорт и владеет отдельным клиентом публичной подписи.
export class StorageClient extends S3Client {
  readonly signingClient: S3Client | undefined;
  constructor(config: S3Config & { publicEndpoint?: string }) {
    super(clientOptions(config));
    scopedClient(this, config.bucket, config.keyPrefix ?? '');
    this.signingClient = config.publicEndpoint === undefined ? undefined
      : new S3Client(clientOptions({ ...config, endpoint: config.publicEndpoint }));
    if (this.signingClient) scopedClient(this.signingClient, config.bucket, config.keyPrefix ?? '');
  }
  override destroy(): void {
    this.signingClient?.destroy();
    super.destroy();
  }
}
export function createS3Client(config: S3Config & { publicEndpoint?: string }): StorageClient {
  return new StorageClient(config);
}
export interface StorageContext { client: S3Client & { readonly signingClient?: S3Client }; bucket: string }
export function publicSigningClient(ctx: StorageContext): S3Client {
  if (!ctx.client.signingClient) throw new Error('S3_PUBLIC_ENDPOINT отсутствует: браузерные ссылки нельзя подписывать внутренним адресом');
  return ctx.client.signingClient;
}
export const FAST_REQUEST_TIMEOUT_MS = 5000;
