import type { EmailTemplateUser } from './types'
import { emailHtmlLayout } from '@/lib/email/html-layout'
import { emailGreetingFromDisplayString } from '@/lib/email/personalization'

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://wheeloffounders.com'
export const EMAIL_LOG_ID_TOKEN = '{{email_log_id}}'

function safeName(user: EmailTemplateUser): string {
  const raw = user.name || user.email?.split('@')[0] || ''
  const trimmed = String(raw).trim()
  if (!trimmed) return 'Founder'
  const fromName = emailGreetingFromDisplayString(trimmed)
  if (fromName) return fromName
  const local = user.email?.includes('@') ? user.email.split('@')[0] : trimmed
  return local?.trim() || 'Founder'
}

/** First name (or email local part) for subjects — same normalization as "Hi …" in the body. */
export function emailSubjectGreetingFromUser(user: EmailTemplateUser): string {
  return safeName(user)
}

export function managePrefsUrl(): string {
  return `${APP_URL}/settings/notifications?utm_source=email&utm_medium=transactional&utm_campaign=manage_prefs`
}

export function unsubscribeUrl(token = '{{unsubscribe_token}}'): string {
  return `${APP_URL}/settings/notifications?unsubscribe=${encodeURIComponent(token)}&utm_source=email&utm_medium=transactional&utm_campaign=unsubscribe`
}

function trackClickUrl(url: string, emailLogId: string): string {
  return `${APP_URL}/api/email/track/click?url=${encodeURIComponent(url)}&email_log_id=${encodeURIComponent(emailLogId)}`
}

export function renderEmailLayout(params: {
  user: EmailTemplateUser
  title: string
  bodyHtml: string
  ctaLabel?: string
  ctaUrl?: string
  emailLogId?: string
  /** Inbox preheader (hidden preview text) */
  preheader?: string
  /**
   * Letter-style body: skip default "Hi" + product heading; put the full narrative in `bodyHtml`
   * (and optional `afterCtaHtml` after the button).
   */
  bodyOnly?: boolean
  /** Rendered after the CTA block (e.g. cadence + sign-off for milestone letters). */
  afterCtaHtml?: string
}): string {
  const greeting = safeName(params.user)
  const emailLogId = params.emailLogId || EMAIL_LOG_ID_TOKEN
  const cta = params.ctaLabel && params.ctaUrl
    ? `<p style="margin: 20px 0;"><a href="${trackClickUrl(params.ctaUrl, emailLogId)}" style="display:inline-block;background:#ef725c;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">${params.ctaLabel}</a></p>`
    : ''

  const preheaderText = params.preheader?.trim() || 'Your update from Mrs. Deer is ready'
  const standardIntro =
    params.bodyOnly === true
      ? ''
      : `<p>Hi ${greeting},</p>
  <h2 style="color:#0f172a;margin:0 0 12px 0;">${params.title}</h2>`
  const afterCta = params.afterCtaHtml ?? ''

  const content = `<tr><td style="background:#152b50;padding:20px;text-align:center;color:#ef725c;font-weight:700;">Mrs. Deer at Wheel of Founders</td></tr>
<tr><td style="padding:24px;color:#334155;line-height:1.6;">
  ${standardIntro}
  ${params.bodyHtml}
  ${cta}
  ${afterCta}
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
  <p style="font-size:12px;color:#64748b;">
    <a href="${trackClickUrl(managePrefsUrl(), emailLogId)}" style="color:#475569;">Manage preferences</a>
    &nbsp;·&nbsp;
    <a href="${trackClickUrl(unsubscribeUrl(), emailLogId)}" style="color:#475569;">Unsubscribe</a>
  </p>
</td></tr>
<tr><td>
  <img src="${APP_URL}/api/email/track/open?email_log_id=${encodeURIComponent(emailLogId)}" width="1" height="1" alt="" style="display:none;" />
</td></tr>`
  return emailHtmlLayout(content, preheaderText)
}

export function renderTextFooter(): string {
  return `\n\nManage preferences: ${managePrefsUrl()}\nUnsubscribe: ${unsubscribeUrl()}`
}

export function appUrlWithUtm(path: string, campaign: string): string {
  const p = path.startsWith('/') ? path : `/${path}`
  const join = p.includes('?') ? '&' : '?'
  return `${APP_URL}${p}${join}utm_source=email&utm_medium=transactional&utm_campaign=${encodeURIComponent(campaign)}`
}

