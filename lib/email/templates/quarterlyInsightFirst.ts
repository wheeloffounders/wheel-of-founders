import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate } from './types'
import { QUARTERLY_INSIGHT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

function dayWord(n: number): string {
  const d = Math.max(1, Math.floor(n))
  return `${d} day${d === 1 ? '' : 's'}`
}

export const quarterlyInsightFirstTemplate: EmailTemplate = {
  getSubject: (user) => `${emailSubjectGreetingFromUser(user)}, your first quarterly view is ready`,
  getHtml: (user, data) => {
    const rawDays = Number(data?.firstUnlockDaysWithEntries ?? QUARTERLY_INSIGHT_MIN_DAYS)
    const n = Number.isFinite(rawDays) ? Math.max(QUARTERLY_INSIGHT_MIN_DAYS, rawDays) : QUARTERLY_INSIGHT_MIN_DAYS
    const greeting = emailSubjectGreetingFromUser(user)
    const dw = dayWord(n)
    const bodyHtml = `<p style="font-style:italic;color:#334155;line-height:1.65;">Hi ${greeting},</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">With ${dw} of entries, a single week is no longer the whole story for you. Trajectory matters — not just this week's weather.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">Your first Quarterly Trajectory is ready now — a step back to see how this quarter is shaping who you're becoming as a founder.</p>`
    const afterCta = `<p style="font-style:italic;color:#334155;line-height:1.65;">After this, a fresh read lands at the start of each quarter — January, April, July, October — looking back at the arc that just closed.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;margin-top:20px;">— Mrs. Deer</p>`
    return renderEmailLayout({
      user,
      title: '',
      bodyHtml,
      bodyOnly: true,
      afterCtaHtml: afterCta,
      ctaLabel: 'Read my quarterly trajectory →',
      ctaUrl: appUrlWithUtm('/quarterly', 'quarterly_insight_first'),
      preheader: 'Your first quarterly view is ready',
    })
  },
  getText: (user, data) => {
    const rawDays = Number(data?.firstUnlockDaysWithEntries ?? QUARTERLY_INSIGHT_MIN_DAYS)
    const n = Number.isFinite(rawDays) ? Math.max(QUARTERLY_INSIGHT_MIN_DAYS, rawDays) : QUARTERLY_INSIGHT_MIN_DAYS
    const greeting = emailSubjectGreetingFromUser(user)
    const dw = dayWord(n)
    return `Hi ${greeting},

With ${dw} of entries, a single week is no longer the whole story for you. Trajectory matters — not just this week's weather.

Your first Quarterly Trajectory is ready now — a step back to see how this quarter is shaping who you're becoming as a founder.

Read my quarterly trajectory: ${appUrlWithUtm('/quarterly', 'quarterly_insight_first')}

After this, a fresh read lands at the start of each quarter — January, April, July, October — looking back at the arc that just closed.

— Mrs. Deer${renderTextFooter()}`
  },
}
