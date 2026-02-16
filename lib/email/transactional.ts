/**
 * Transactional email sending via MailerSend (MailerLite) or Resend.
 * MAILERLITE_TRANSACTIONAL_API_KEY = MailerSend API key (MailerLite's transactional product)
 * RESEND_API_KEY = fallback
 */

const DEFAULT_FROM = 'Wheel of Founders <noreply@wheeloffounders.com>'
const RATE_LIMIT_DELAY_MS = 600 // ~100 req/min for MailerSend trial
let lastSendTime = 0

export type TransactionalEmailParams = {
  to: string
  toName?: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}

/**
 * Send transactional email via MailerSend (MAILERLITE_TRANSACTIONAL_API_KEY) or Resend (RESEND_API_KEY).
 * Respects rate limits and logs errors.
 */
export async function sendTransactionalEmail(
  params: TransactionalEmailParams
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey =
    process.env.MAILERLITE_TRANSACTIONAL_API_KEY || process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[transactional] No API key configured, skipping email')
    return { ok: false, error: 'Transactional email not configured' }
  }

  // Rate limiting (MailerSend trial: 10 req/min)
  const now = Date.now()
  const elapsed = now - lastSendTime
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed))
  }
  lastSendTime = Date.now()

  const useMailerSend = !!process.env.MAILERLITE_TRANSACTIONAL_API_KEY

  try {
    if (useMailerSend) {
      return await sendViaMailerSend(apiKey, params)
    }
    return await sendViaResend(apiKey, params)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[transactional] Send failed:', msg)
    return { ok: false, error: msg }
  }
}

async function sendViaMailerSend(
  apiKey: string,
  params: TransactionalEmailParams
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: { email: 'noreply@wheeloffounders.com', name: 'Wheel of Founders' },
      to: [{ email: params.to, name: params.toName || params.to }],
      subject: params.subject,
      html: params.html,
      text: params.text || params.html.replace(/<[^>]+>/g, ''),
      ...(params.replyTo && { reply_to: { email: params.replyTo } }),
    }),
  })

  if (res.status === 202) {
    const messageId = res.headers.get('x-message-id')
    return { ok: true, messageId: messageId || undefined }
  }

  if (res.status === 429) {
    const retryAfter = res.headers.get('retry-after')
    console.warn('[transactional] Rate limited, Retry-After:', retryAfter)
    return { ok: false, error: 'Rate limited' }
  }

  const body = await res.text()
  console.error('[transactional] MailerSend error:', res.status, body)
  return { ok: false, error: body || `HTTP ${res.status}` }
}

async function sendViaResend(
  apiKey: string,
  params: TransactionalEmailParams
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      ...(params.replyTo && { reply_to: params.replyTo }),
    }),
  })

  if (res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: true, messageId: data.id }
  }

  const body = await res.text()
  console.error('[transactional] Resend error:', res.status, body)
  return { ok: false, error: body || `HTTP ${res.status}` }
}
