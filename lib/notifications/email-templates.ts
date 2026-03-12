/**
 * Example email templates for notification fallback.
 * Use with sendTransactionalEmail from @/lib/email/transactional.
 * See docs/NOTIFICATION_STRATEGY.md.
 */

export interface NotificationEmailParams {
  title: string
  body: string
  ctaUrl?: string
  ctaLabel?: string
  userName?: string
}

/**
 * Single notification email (e.g. morning reminder, insight ready).
 */
export function buildNotificationEmail(params: NotificationEmailParams): { subject: string; html: string; text: string } {
  const { title, body, ctaUrl, ctaLabel = 'Open app', userName } = params
  const greeting = userName ? `Hi ${userName},` : 'Hi,'
  const subject = title

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1f2937; max-width: 480px; margin: 0 auto; padding: 24px;">
  <p style="margin: 0 0 16px;">${greeting}</p>
  <h2 style="margin: 0 0 12px; font-size: 1.25rem;">${escapeHtml(title)}</h2>
  <p style="margin: 0 0 20px;">${escapeHtml(body)}</p>
  ${ctaUrl ? `<p style="margin: 0;"><a href="${escapeHtml(ctaUrl)}" style="display: inline-block; padding: 10px 20px; background: #ef725c; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">${escapeHtml(ctaLabel)}</a></p>` : ''}
  <p style="margin: 24px 0 0; font-size: 0.875rem; color: #6b7280;">Wheel of Founders · Your daily founder coaching companion</p>
</body>
</html>
`.trim()

  const text = [
    greeting,
    title,
    '',
    body,
    ...(ctaUrl ? ['', ctaLabel + ': ' + ctaUrl] : []),
    '',
    '— Wheel of Founders',
  ].join('\n')

  return { subject, html, text }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
