import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const firstFullLoopTemplate: EmailTemplate = {
  getSubject: (user) => `🎉 ${emailSubjectGreetingFromUser(user)}, you completed your first full loop!`,
  getHtml: (user) =>
    renderEmailLayout({
      user,
      title: 'You completed your first full loop',
      bodyHtml:
        '<p>You did it — morning plan and evening reflection on the same day. That is the first brick in your founder foundation.</p><p>In 3 days, you unlock your first Founder DNA insight.</p>',
      ctaLabel: 'View Your Journey',
      ctaUrl: appUrlWithUtm('/founder-dna/journey', 'first_full_loop'),
    }),
  getText: (user) => `You completed your first full loop.` + renderTextFooter(user),
}

