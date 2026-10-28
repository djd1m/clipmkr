const { S3Client, HeadBucketCommand, CreateBucketCommand } = require('@aws-sdk/client-s3');
(async () => {
  const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION,
    forcePathStyle: true, credentials: { accessKeyId: process.env.S3_ACCESS_KEY, secretAccessKey: process.env.S3_SECRET_KEY } });
  const Bucket = process.env.S3_BUCKET;
  try { await client.send(new HeadBucketCommand({ Bucket })); }
  catch (e) { if (e.$metadata?.httpStatusCode !== 404) throw e; await client.send(new CreateBucketCommand({ Bucket })); }
  console.log('Private media bucket ready');
})().catch(e => { console.error('Storage init failed:', e.name); process.exitCode = 1; });
