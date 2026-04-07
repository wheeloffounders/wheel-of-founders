import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'
import { buildReminderVariationEmailParts, pickReminderVariationId } from '@/lib/email/reminder-variations'

function closingLine(): string {
  return `<p style="margin:20px 0 0 0;color:#64748b;font-size:14px;line-height:1.5;">With care,<br/><span style="color:#152b50;font-weight:600;">Mrs. Deer</span></p>`
}

export const eveningReminderTemplate: EmailTemplate = {
  getSubject: (user, data) => {
    const custom = String(data?.reminderSubject || '').trim()
    if (custom) return custom
    const name = emailSubjectGreetingFromUser(user)
    return `🌙 ${name}, close the loop with your evening reflection`
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
        kind: 'evening',
        streak,
        hasRecentTheme,
        hasRecentIntention,
        dayOfWeek: new Date().getUTCDay(),
        blocked: new Set(),
        random: Math.random,
      })
      const parts = buildReminderVariationEmailParts({
        kind: 'evening',
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
      title: 'Close your daily loop',
      preheader: preheader || undefined,
      bodyHtml: `${openingHtml}${closingLine()}`,
      ctaLabel: 'Start Evening Reflection',
      ctaUrl: appUrlWithUtm('/evening', 'evening_reminder'),
    })
  },
  getText: (_user, data) => {
    const d = data as Record<string, unknown> | undefined
    const opening = String(d?.reminderOpeningPlain || '').trim()
    const win = d?.recentWin ? `\nMrs. Deer noticed: "${String(d.recentWin)}"` : ''
    const core = opening || 'Close the loop with your evening reflection.'
    return `${core}${win}\n\n— Mrs. Deer` + renderTextFooter(_user)
  },
}
