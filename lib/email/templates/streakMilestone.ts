import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const streakMilestoneTemplate: EmailTemplate = {
  getSubject: (user, data) =>
    `🔥 ${emailSubjectGreetingFromUser(user)}, ${String(data?.streak || '')} days and counting!`,
  getHtml: (user, data) =>
    renderEmailLayout({
      user,
      title: `${String(data?.streak || '')} day streak milestone`,
      bodyHtml: `<p>${String(data?.streak || '')} days of showing up. That is not luck — it is practice.</p><p>${String(data?.personalizedInsight || '')}</p>`,
      ctaLabel: 'View Your Journey',
      ctaUrl: appUrlWithUtm('/founder-dna/journey', 'streak_milestone'),
    }),
  getText: (_user, data) =>
    `${String(data?.streak || '')} days and counting.${data?.personalizedInsight ? `\n${String(data.personalizedInsight)}` : ''}` +
    renderTextFooter(),
}

