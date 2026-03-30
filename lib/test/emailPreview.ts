import type { EmailCapturePayload } from '@/lib/email/email-capture-context'

export type EmailPreview = {
  type: string
  to: string
  subject: string
  bodyPreview: string
  fullHtml: string
  triggeredAt: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function buildEmailPreview(to: string, payload: EmailCapturePayload): EmailPreview {
  const plain = stripHtml(payload.html)
  return {
    type: payload.emailType,
    to,
    subject: payload.subject,
    bodyPreview: plain.length > 200 ? `${plain.slice(0, 200)}…` : plain,
    fullHtml: payload.html,
    triggeredAt: new Date().toISOString(),
  }
}

export function buildTemplatePreview(
  to: string,
  type: string,
  subject: string,
  html: string
): EmailPreview {
  const plain = stripHtml(html)
  return {
    type,
    to,
    subject,
    bodyPreview: plain.length > 200 ? `${plain.slice(0, 200)}…` : plain,
    fullHtml: html,
    triggeredAt: new Date().toISOString(),
  }
}
