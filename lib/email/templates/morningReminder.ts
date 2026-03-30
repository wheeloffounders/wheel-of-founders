import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'
import { buildReminderVariationEmailParts, pickReminderVariationId } from '@/lib/email/reminder-variations'

function growthEdgeBlock(data: Record<string, unknown> | undefined): string {
  const growthEdge = String(data?.growthEdge || '').trim()
  if (!growthEdge) return ''
  const safe = growthEdge.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `<p style="background:#f8fafc;border-left:4px solid #152b50;padding:10px;border-radius:6px;margin:16px 0 0 0;">Today focus tip: ${safe}</p>`
}

function closingLine(): string {
  return `<p style="margin:20px 0 0 0;color:#64748b;font-size:14px;line-height:1.5;">With care,<br/><span style="color:#152b50;font-weight:600;">Mrs. Deer</span></p>`
}

export const morningReminderTemplate: EmailTemplate = {
  getSubject: (user, data) => {
    const custom = String(data?.reminderSubject || '').trim()
    if (custom) return custom
    const name = emailSubjectGreetingFromUser(user)
    return `☀️ ${name}, what three things deserve today's focus?`
  },
  getHtml: (user, data) => {
    const d = data as Record<string, unknown> | undefined
    let openingHtml = String(d?.reminderOpeningHtml || '').trim()
    let preheader = String(d?.reminderPreheader || '').trim()

    if (!openingHtml) {
      const name = emailSubjectGreetingFromUser(user)
      const streak = Math.max(0, Number(d?.streak ?? 0))
      const theme = String(d?.recentThemeSnippet || '').trim()
      const intention = String(d?.todaysIntentionSnippet || '').trim()
      const hasRecentTheme = theme.length >= 12
      const hasRecentIntention = intention.length >= 8
      const vid = pickReminderVariationId({
        kind: 'morning',
        streak,
        hasRecentTheme,
        hasRecentIntention,
        dayOfWeek: new Date().getUTCDay(),
        blocked: new Set(),
        random: Math.random,
      })
      const parts = buildReminderVariationEmailParts({
        kind: 'morning',
        variationId: vid,
        params: {
          displayName: name,
          streak,
          recentTheme: theme || undefined,
          recentIntention: intention || undefined,
        },
      })
      openingHtml = `<p style="margin:0 0 16px 0;line-height:1.65;">${parts.openingParagraph}</p>`
      if (!preheader) preheader = parts.preheader
    }

    return renderEmailLayout({
      user,
      title: 'Start your morning plan',
      preheader: preheader || undefined,
      bodyHtml: `${openingHtml}${growthEdgeBlock(d)}${closingLine()}`,
      ctaLabel: 'Start Morning Plan',
      ctaUrl: appUrlWithUtm('/morning', 'morning_reminder'),
    })
  },
  getText: (user, data) => {
    const d = data as Record<string, unknown> | undefined
    const opening = String(d?.reminderOpeningPlain || '').trim()
    const tip = d?.growthEdge ? `\nTip: ${String(d.growthEdge)}` : ''
    const core = opening || 'Your morning plan sets the tone for the day. Start now.'
    return `${core}${tip}\n\n— Mrs. Deer` + renderTextFooter()
  },
}
