import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const welcomeTemplate: EmailTemplate = {
  getSubject: (user) =>
    `Welcome to Wheel of Founders — Your journey starts here, ${emailSubjectGreetingFromUser(user)}`,
  getHtml: (user) =>
    renderEmailLayout({
      user,
      title: "Your journey starts here",
      bodyHtml:
        '<p>☀️ Morning → Set your priorities<br/>📝 Decisions → Capture one strategic choice<br/>🌙 Evening → Reflect on what moved the needle.</p><p>Small steps compound. You are already building.</p>',
      ctaLabel: 'Start Your Morning',
      ctaUrl: appUrlWithUtm('/morning', 'welcome'),
    }),
  getText: () =>
    `Welcome to Wheel of Founders.\nStart with Morning, capture one decision, and close with Evening Reflection.` + renderTextFooter(),
}

