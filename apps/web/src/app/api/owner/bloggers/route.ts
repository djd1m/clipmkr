import { createBloggerOwnerHandler } from '../../../../server/blogger-owner-handler';
import { getRuntime } from '../../../../server/runtime';
import { allowMutation, allowRead } from '../../../../server/rate-limit';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request): Promise<Response> {
  const { pool, auth, config, redis } = getRuntime();
  return createBloggerOwnerHandler({ pool, publicOrigin: config.publicOrigin, trustedProxyHops: config.trustedProxyHops,
    authenticate: token => auth.authenticate(token),
    allowRead: (ip, account) => allowRead(redis, ip, config.sessionSecret, account),
    allowMutation: (ip, account) => allowMutation(redis, ip, config.sessionSecret, account),
  })(request);
}
export const POST = GET;
