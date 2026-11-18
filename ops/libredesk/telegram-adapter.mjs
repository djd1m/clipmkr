import { createHmac, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'

const MAX_BODY_BYTES = 1024 * 1024
const TELEGRAM_TIMEOUT_MS = 2000
const SIGNATURE = /^sha256=[a-f0-9]{64}$/
const CONVERSATION_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const CONVERSATION_BASE = 'https://support.clipmkr.ru/inboxes/all/conversation/'

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function authenticated(body, signature, secret) {
  const expected = createHmac('sha256', secret).update(body).digest()
  return timingSafeEqual(expected, Buffer.from(signature.slice(7), 'hex'))
}

async function readBody(request) {
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) return null

  const chunks = []
  let bytes = 0
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length
    if (bytes > MAX_BODY_BYTES) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks, bytes)
}

async function notifyTelegram({ botToken, chatId }, conversationId, fetchTelegram, log) {
  const text = `Новое сообщение в поддержку Clipmkr\n${CONVERSATION_BASE}${conversationId}`
  try {
    const response = await fetchTelegram(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        link_preview_options: { is_disabled: true },
      }),
      redirect: 'error',
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    })
    if (!response.ok) {
      await response.body?.cancel()
      log({ event: 'telegram_failed', reason: 'http', status: response.status })
      return
    }

    const body = await response.json()
    const message = body?.result
    if (body?.ok !== true || !Number.isSafeInteger(message?.message_id) ||
        message.message_id < 1 || String(message?.chat?.id) !== chatId || message.text !== text) {
      log({ event: 'telegram_failed', reason: 'unexpected_response' })
      return
    }

    log({ event: 'telegram_delivered', messageId: message.message_id })
  } catch (error) {
    log({ event: 'telegram_failed', reason: error?.name === 'TimeoutError' ? 'timeout' : 'transport' })
  }
}

async function handleWebhook(request, response, config, fetchTelegram, log) {
  const reply = status => response.writeHead(status).end()
  const close = status => response.writeHead(status, { Connection: 'close' }).end()
  function reject(status, reason, closeConnection = false) {
    log({ event: 'webhook_rejected', reason })
    return (closeConnection ? close : reply)(status)
  }

  if (request.method === 'GET' && request.url === '/healthz') return reply(204)
  if (request.method !== 'POST' || request.url !== '/libredesk') return close(404)

  const signature = request.headers['x-libredesk-signature']
  if (typeof signature !== 'string' || !SIGNATURE.test(signature)) return reject(401, 'signature', true)

  const raw = await readBody(request)
  if (raw === null) return reject(413, 'body_limit', true)
  if (!authenticated(raw, signature, config.webhookSecret)) return reject(401, 'signature')

  let webhook
  try {
    webhook = JSON.parse(raw.toString('utf8'))
  } catch {
    return reject(400, 'json')
  }
  if (!isRecord(webhook) || typeof webhook.event !== 'string' || !webhook.event) return reject(400, 'envelope')
  if (webhook.event !== 'message.created') return reply(204)

  const { payload } = webhook
  if (!isRecord(payload) || typeof payload.type !== 'string' ||
      typeof payload.sender_type !== 'string' || typeof payload.private !== 'boolean' ||
      typeof payload.conversation_uuid !== 'string' || !CONVERSATION_UUID.test(payload.conversation_uuid)) {
    return reject(400, 'message')
  }
  if (payload.type !== 'incoming' || payload.sender_type !== 'contact' || payload.private) {
    log({ event: 'telegram_skipped' })
    return reply(204)
  }

  await notifyTelegram(config, payload.conversation_uuid, fetchTelegram, log)
  return reply(204)
}

export function createLibredeskTelegramServer(config, {
  fetchTelegram = fetch,
  log = entry => console.log(JSON.stringify(entry)),
} = {}) {
  if (!/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken) ||
      !/^-?[1-9]\d{0,15}$/.test(config.chatId) ||
      typeof config.webhookSecret !== 'string' || config.webhookSecret.length < 32) {
    throw new Error('Telegram relay environment is incomplete')
  }

  return createServer({ headersTimeout: 5000, requestTimeout: 5000 }, (request, response) => {
    handleWebhook(request, response, config, fetchTelegram, log).catch(() => {
      log({ event: 'webhook_read_failed' })
      if (!response.destroyed && !response.headersSent) response.writeHead(400, { Connection: 'close' }).end()
    })
  })
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createLibredeskTelegramServer({
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_SUPPORT_CHAT_ID,
    webhookSecret: process.env.LIBREDESK_TELEGRAM_WEBHOOK_SECRET,
  })
  server.listen(8080, '0.0.0.0')
}
