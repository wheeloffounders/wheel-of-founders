import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'

export const featureUnlockTemplate: EmailTemplate = {
  getSubject: (user, data) =>
    `🔓 ${emailSubjectGreetingFromUser(user)}, you unlocked ${String(data?.featureName || 'a new feature')}!`,
  getHtml: (user, data) => {
    const featureName = String(data?.featureName || 'a new feature')
    return renderEmailLayout({
      user,
      title: `${featureName} unlocked`,
      bodyHtml: `<p>Mrs. Deer noticed something new about your founder style.</p><p><strong>${featureName}</strong> is now available.</p>`,
      ctaLabel: `Explore ${featureName}`,
      ctaUrl: appUrlWithUtm('/founder-dna/journey', 'feature_unlock'),
    })
  },
  getText: (_user, data) => `Feature unlocked: ${String(data?.featureName || 'a new feature')}.` + renderTextFooter(),
}

