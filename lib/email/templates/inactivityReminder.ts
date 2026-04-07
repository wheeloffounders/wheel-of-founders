import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const inactivityReminderTemplate: EmailTemplate = {
  getSubject: (user) => `👋 ${emailSubjectGreetingFromUser(user)}, we noticed you stepped away`,
  getHtml: (user) =>
    renderEmailLayout({
      user,
      title: 'Your loop is waiting',
      bodyHtml:
        '<p>No judgment — founder life is busy. Whenever you are ready, your loop is waiting and your insights are safe.</p>',
      ctaLabel: 'Return to Your Journey',
      ctaUrl: appUrlWithUtm('/dashboard', 'inactivity_reminder'),
    }),
  getText: (user) => `Whenever you are ready, your journey is waiting.` + renderTextFooter(user),
}

