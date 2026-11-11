// Только test child: установлен до Next/runtime. Production API override не добавляется.
if (Reflect.get(process.env, 'NODE_ENV') !== 'test') throw new Error('Test child required');
const nativeFetch = globalThis.fetch.bind(globalThis);
const target = new URL(process.env.CLIPMKR_TEST_PAYMENT_ORIGIN ?? '');
if (target.protocol !== 'http:' || target.hostname !== '127.0.0.1' || target.pathname !== '/' || target.username || target.password) {
  throw new Error('Local payment fixture required');
}
const resend = process.env.CLIPMKR_TEST_RESEND_ORIGIN ? new URL(process.env.CLIPMKR_TEST_RESEND_ORIGIN) : null;
if (resend && !new URL(process.env.DATABASE_URL ?? '').pathname.endsWith('_test')) throw new Error('Isolated mail test database required');
if (resend && (resend.protocol !== 'http:' || resend.hostname !== '127.0.0.1' || resend.pathname !== '/' || resend.username || resend.password || resend.search || resend.hash)) throw new Error('Local mail fixture required');
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin === 'https://api.yookassa.ru' && url.pathname.startsWith('/v3/')) {
    const local = new URL(url.pathname.slice('/v3'.length) + url.search, target);
    return nativeFetch(input instanceof Request ? new Request(local, input) : local, { ...init, redirect: 'error' });
  }
  if (resend && url.origin === 'https://api.resend.com' && url.pathname === '/emails') {
    const local = new URL(url.pathname, resend);
    return nativeFetch(input instanceof Request ? new Request(local, input) : local, { ...init, redirect: 'error' });
  }
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) {
    console.error('Test transport blocked external request');
    throw new Error('Test transport: external request forbidden');
  }
  return nativeFetch(input, { ...init, redirect: 'error' });
};
