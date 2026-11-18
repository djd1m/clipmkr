import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { once } from 'node:events'
import test from 'node:test'
import { createLibredeskTelegramServer } from '../ops/libredesk/telegram-adapter.mjs'

const config = {
  botToken: '123:synthetic_bot_token',
  chatId: '-12345',
  webhookSecret: 'synthetic signing secret for tests only',
}
const conversationId = 'ec0f1213-2cf9-47b4-bdd2-0460a24bbcb7'
const expectedText = `Новое сообщение в поддержку Clipmkr\nhttps://support.clipmkr.ru/inboxes/all/conversation/${conversationId}`
const event = {
  event: 'message.created',
  timestamp: '2026-11-18T12:00:00Z',
  payload: {
    uuid: '82f4894c-3191-4942-8896-c35844660041',
    conversation_uuid: conversationId,
    type: 'incoming',
    sender_type: 'contact',
    private: false,
    content: 'SENTINEL do not expose this message',
    sender: { email: 'sentinel@example.test' },
  },
}
const signature = body => `sha256=${createHmac('sha256', config.webhookSecret).update(body).digest('hex')}`

const telegramResponse = (request, changes = {}) => Response.json({
  ok: true,
  result: {
    message_id: 9,
    chat: { id: Number(request.chat_id) },
    text: request.text,
    ...changes,
  },
})

async function fixture(t, respond = telegramResponse) {
  const calls = []
  const logs = []
  const server = createLibredeskTelegramServer(config, {
    log: event => logs.push(event),
    fetchTelegram: async (url, options) => {
      const payload = JSON.parse(options.body)
      calls.push({ url, payload, method: options.method })
      return respond(payload, options, calls.length)
    },
  })
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => server.close())
  const origin = `http://127.0.0.1:${server.address().port}`
  function post(body, proof = signature(body)) {
    return fetch(origin + '/libredesk', {
      method: 'POST',
      body,
      headers: proof ? { 'X-Libredesk-Signature': proof } : {},
    }).then(response => response.status)
  }

  return { calls, logs, post }
}

test('authenticates the original bytes and rejects invalid events', async t => {
  const { calls, logs, post } = await fixture(t)
  const compact = JSON.stringify(event)
  const formatted = JSON.stringify(event, null, 2)
  assert.equal(await post(compact, ''), 401)
  assert.equal(await post(compact, `sha256=${'0'.repeat(64)}`), 401)
  assert.equal(await post(formatted, signature(compact)), 401)
  assert.equal(await post('x'.repeat(1024 * 1024 + 1)), 413)
  assert.equal(await post('{'), 400)
  assert.equal(await post('{}'), 400)
  assert.equal(await post(JSON.stringify({ ...event, event: 'webhook.test' })), 204)
  for (const patch of [{ type: undefined }, { private: 'false' }, { sender_type: false }, { conversation_uuid: '../agents' }]) {
    const payload = { ...event.payload, ...patch }
    assert.equal(await post(JSON.stringify({ ...event, payload })), 400)
  }
  assert.deepEqual(calls, [])
  assert.deepEqual(logs, [
    'signature', 'signature', 'signature', 'body_limit', 'json', 'envelope',
    'message', 'message', 'message', 'message',
  ].map(reason => ({ event: 'webhook_rejected', reason })))

  assert.equal(await post(formatted), 204)
  assert.equal(calls.length, 1)
})

test('notifies for the first and subsequent contact messages only', async t => {
  const { calls, logs, post } = await fixture(t, (payload, _options, ordinal) =>
    telegramResponse(payload, { message_id: ordinal }))
  assert.equal(await post(JSON.stringify(event)), 204)
  assert.equal(await post(JSON.stringify({
    ...event,
    payload: { ...event.payload, uuid: '43ecde67-2855-4e2d-961c-ec8c046d53b0', content: 'second sentinel' },
  })), 204)

  for (const patch of [{ type: 'outgoing' }, { sender_type: 'agent' }, { type: 'activity' }, { private: true }]) {
    const payload = { ...event.payload, ...patch }
    assert.equal(await post(JSON.stringify({ ...event, payload })), 204)
  }

  const expected = {
    url: `https://api.telegram.org/bot${config.botToken}/sendMessage`,
    method: 'POST',
    payload: { chat_id: config.chatId, text: expectedText, link_preview_options: { is_disabled: true } },
  }
  assert.deepEqual(calls, [expected, expected])
  assert.deepEqual(logs, [
    { event: 'telegram_delivered', messageId: 1 },
    { event: 'telegram_delivered', messageId: 2 },
    ...Array.from({ length: 4 }, () => ({ event: 'telegram_skipped' })),
  ])
})

test('reports Telegram delivery only for the intended chat and exact text', async t => {
  const replies = [{ chat: { id: 999 } }, { text: 'different' }, { message_id: 0 }, {}]
  const { calls, logs, post } = await fixture(t, (payload, _options, ordinal) =>
    telegramResponse(payload, replies[ordinal - 1]))
  for (const _ of replies) assert.equal(await post(JSON.stringify(event)), 204)
  assert.equal(calls.length, 4)
  assert.deepEqual(logs, [
    ...Array.from({ length: 3 }, () => ({ event: 'telegram_failed', reason: 'unexpected_response' })),
    { event: 'telegram_delivered', messageId: 9 },
  ])
})

test('acknowledges a single failed Telegram attempt', async t => {
  const failures = [
    () => new Response('confidential response', { status: 429 }),
    () => new Response('confidential response', { status: 500 }),
    () => Response.json({ ok: false, description: 'confidential response' }),
    () => { throw new Error(config.botToken) },
    (_payload, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true })
    }),
  ]
  const { calls, logs, post } = await fixture(t, (payload, options, ordinal) =>
    failures[ordinal - 1](payload, options))

  for (const [i] of failures.entries()) {
    assert.equal(await post(JSON.stringify(event)), 204)
    assert.equal(calls.length, i + 1)
  }
  assert.deepEqual(logs, [
    { event: 'telegram_failed', reason: 'http', status: 429 },
    { event: 'telegram_failed', reason: 'http', status: 500 },
    { event: 'telegram_failed', reason: 'unexpected_response' },
    { event: 'telegram_failed', reason: 'transport' },
    { event: 'telegram_failed', reason: 'timeout' },
  ])
})

test('rejects missing credentials and nonnumeric chat IDs before listening', () => {
  for (const change of [{ chatId: '@unconfigured' }, { botToken: '' }, { webhookSecret: 'too short' }]) {
    assert.throws(() => createLibredeskTelegramServer({ ...config, ...change }), /^Error: Telegram relay environment is incomplete$/)
  }
})
