import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const badgeEarnedTemplate: EmailTemplate = {
  getSubject: (user) => `🏆 ${emailSubjectGreetingFromUser(user)}, you earned a new badge!`,
  getHtml: (user, data) =>
    renderEmailLayout({
      user,
      title: 'New badge unlocked',
      bodyHtml: `<p>${String(data?.badgeIcon || '🏆')} <strong>${String(data?.badgeName || 'New badge')}</strong></p><p>${String(data?.badgeDescription || '')}</p>`,
      ctaLabel: 'View All Badges',
      ctaUrl: appUrlWithUtm('/founder-dna/journey', 'badge_earned'),
    }),
  getText: (_user, data) => `New badge unlocked: ${String(data?.badgeName || 'New badge')}.` + renderTextFooter(),
}

