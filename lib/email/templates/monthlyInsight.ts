import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate, TemplateData } from './types'
import { MONTHLY_INSIGHT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

function dayWord(n: number): string {
  const d = Math.max(1, Math.floor(n))
  return `${d} day${d === 1 ? '' : 's'}`
}

function isFirstUnlock(data?: TemplateData): boolean {
  return data?.monthlyInsightVariant === 'first_unlock'
}

export const monthlyInsightTemplate: EmailTemplate = {
  getSubject: (user, data) => {
    if (isFirstUnlock(data)) {
      return `${emailSubjectGreetingFromUser(user)}, your first monthly view is ready`
    }
    return `🌙 ${emailSubjectGreetingFromUser(user)}, your monthly insight is ready`
  },
  getHtml: (user, data) => {
    if (isFirstUnlock(data)) {
      const rawDays = Number(data?.firstUnlockDaysWithEntries ?? MONTHLY_INSIGHT_MIN_DAYS)
      const n = Number.isFinite(rawDays) ? Math.max(MONTHLY_INSIGHT_MIN_DAYS, rawDays) : MONTHLY_INSIGHT_MIN_DAYS
      const greeting = emailSubjectGreetingFromUser(user)
      const dw = dayWord(n)
      const bodyHtml = `<p style="font-style:italic;color:#334155;line-height:1.65;">Hi ${greeting},</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">With ${dw} of entries, a single week is no longer the whole story. I can start to see the through-line — the wins that repeat, the lessons that surface again.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">Your first Monthly Insight is ready now. It's a step back to see what's emerging across weeks, not just days.</p>`
      const afterCta = `<p style="font-style:italic;color:#334155;line-height:1.65;">After this, a fresh read lands on the 1st of each month, looking back at the month that just closed.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;margin-top:20px;">— Mrs. Deer</p>`
      return renderEmailLayout({
        user,
        title: '',
        bodyHtml,
        bodyOnly: true,
        afterCtaHtml: afterCta,
        ctaLabel: 'Read my monthly insight →',
        ctaUrl: appUrlWithUtm('/monthly-insight', 'monthly_insight_first'),
        preheader: 'Your first monthly view is ready',
      })
    }

    const insight = String(data?.monthlyInsightText || data?.monthlyInsight || '').trim()
    const streak = String(data?.streak ?? 0)
    const tasks = String(data?.tasksCompleted ?? '')
    const decisions = String(data?.decisionsMade ?? '')
    const archetype = String(data?.archetype || '').trim()
    const growthEdge = String(data?.growthEdge || '').trim()
    return renderEmailLayout({
      user,
      title: 'Your monthly insight is ready',
      bodyHtml: `<p>Mrs. Deer looked across your month and noticed something worth naming:</p>
      ${insight ? `<blockquote style="margin:16px 0;padding:12px;border-left:4px solid #ef725c;background:#fff5f3;">${insight}</blockquote>` : ''}
      ${archetype ? `<p>Your current archetype signal: <strong>${archetype}</strong></p>` : ''}
      ${growthEdge ? `<p>Growth edge this month: ${growthEdge}</p>` : ''}
      <p>🔥 ${streak || '-'} day streak<br/>📋 ${tasks || '-'} tasks done<br/>🎯 ${decisions || '-'} decisions made</p>`,
      ctaLabel: 'Read monthly insight',
      ctaUrl: appUrlWithUtm('/monthly-insight', 'monthly_insight'),
    })
  },
  getText: (user, data) => {
    if (isFirstUnlock(data)) {
      const rawDays = Number(data?.firstUnlockDaysWithEntries ?? MONTHLY_INSIGHT_MIN_DAYS)
      const n = Number.isFinite(rawDays) ? Math.max(MONTHLY_INSIGHT_MIN_DAYS, rawDays) : MONTHLY_INSIGHT_MIN_DAYS
      const greeting = emailSubjectGreetingFromUser(user)
      const dw = dayWord(n)
      return `Hi ${greeting},

With ${dw} of entries, a single week is no longer the whole story. I can start to see the through-line — the wins that repeat, the lessons that surface again.

Your first Monthly Insight is ready now. It's a step back to see what's emerging across weeks, not just days.

Read my monthly insight: ${appUrlWithUtm('/monthly-insight', 'monthly_insight_first')}

After this, a fresh read lands on the 1st of each month, looking back at the month that just closed.

— Mrs. Deer${renderTextFooter()}`
    }

    return `Your monthly insight is ready.${data?.monthlyInsightText || data?.monthlyInsight ? `\n\n${String(data?.monthlyInsightText || data?.monthlyInsight)}` : ''}${
      data?.growthEdge ? `\nGrowth edge: ${String(data.growthEdge)}` : ''
    }` + renderTextFooter()
  },
}
