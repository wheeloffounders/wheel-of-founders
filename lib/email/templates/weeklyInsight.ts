import { appUrlWithUtm, emailSubjectGreetingFromUser, renderEmailLayout, renderTextFooter } from './layout'
import type { EmailTemplate, TemplateData } from './types'
import {
  getWeeklyJourneyMessage,
  journeyWeekNumberFromDaysWithEntries,
} from '@/lib/email/weekly-journey-messages'
import { WEEKLY_INSIGHT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

function isFirstUnlock(data?: TemplateData): boolean {
  return data?.weeklyInsightVariant === 'first_unlock'
}

function dayWord(n: number): string {
  const d = Math.max(1, Math.floor(n))
  return `${d} day${d === 1 ? '' : 's'}`
}

function resolveJourneyWeekNumber(data?: TemplateData): number {
  const explicit = data?.weeklyJourneyWeekNumber
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit >= 1) {
    return Math.floor(explicit)
  }
  const days = data?.daysWithEntries
  if (typeof days === 'number' && Number.isFinite(days)) {
    return journeyWeekNumberFromDaysWithEntries(days)
  }
  const streak = Number(data?.streak ?? 0)
  if (streak > 0) return journeyWeekNumberFromDaysWithEntries(streak)
  return 1
}

/** Days-with-entries count for copy (Week 1 line); falls back to streak when missing. */
function resolveDaysWithEntriesForMessage(data?: TemplateData): number {
  const d = data?.daysWithEntries
  if (typeof d === 'number' && Number.isFinite(d)) {
    return Math.max(0, Math.floor(d))
  }
  const streak = Number(data?.streak ?? 0)
  return Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0
}

function statsLineHtml(data: TemplateData | undefined, tasksLabel: string, decisionsLabel: string): string {
  if (data?.weeklyInsightStatsScope === 'weekly_window') {
    return `<p>This week, you logged ${tasksLabel} tasks and made ${decisionsLabel} decisions.</p>`
  }
  return `<p>You've logged ${tasksLabel} tasks and made ${decisionsLabel} decisions along the way.</p>`
}

function statsLinePlain(data: TemplateData | undefined, tasksLabel: string, decisionsLabel: string): string {
  if (data?.weeklyInsightStatsScope === 'weekly_window') {
    return `This week, you logged ${tasksLabel} tasks and made ${decisionsLabel} decisions.`
  }
  return `You've logged ${tasksLabel} tasks and made ${decisionsLabel} decisions along the way.`
}

export const weeklyInsightTemplate: EmailTemplate = {
  getSubject: (user, data) => {
    if (isFirstUnlock(data)) {
      return `${emailSubjectGreetingFromUser(user)}, your first weekly read is ready`
    }
    return `${emailSubjectGreetingFromUser(user)}, your week, in my words`
  },
  getHtml: (user, data) => {
    if (isFirstUnlock(data)) {
      const rawDays = Number(data?.firstUnlockDaysWithEntries ?? WEEKLY_INSIGHT_MIN_DAYS)
      const n = Number.isFinite(rawDays) ? Math.max(WEEKLY_INSIGHT_MIN_DAYS, rawDays) : WEEKLY_INSIGHT_MIN_DAYS
      const greeting = emailSubjectGreetingFromUser(user)
      const dw = dayWord(n)
      const bodyHtml = `<p style="font-style:italic;color:#334155;line-height:1.65;">Hi ${greeting},</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">I've been watching how you plan, decide, and reflect. With ${dw} of entries, a pattern is starting to show.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;">Your first Weekly Insight is ready now — a snapshot of what I'm seeing so far.</p>`
      const afterCta = `<p style="font-style:italic;color:#334155;line-height:1.65;">After this, a fresh read lands every Monday, capturing the week that just closed.</p>
<p style="font-style:italic;color:#334155;line-height:1.65;margin-top:20px;">— Mrs. Deer</p>`
      return renderEmailLayout({
        user,
        title: '',
        bodyHtml,
        bodyOnly: true,
        afterCtaHtml: afterCta,
        ctaLabel: 'Read my weekly insight →',
        ctaUrl: appUrlWithUtm('/weekly', 'weekly_insight_first'),
        preheader: 'Your first weekly read is ready',
      })
    }

    const weekNumber = resolveJourneyWeekNumber(data)
    const daysForMessage = resolveDaysWithEntriesForMessage(data)
    const weekMessage = getWeeklyJourneyMessage(weekNumber, daysForMessage)
    const tasks = Number(data?.tasksCompleted ?? 0)
    const decisions = Number(data?.decisionsMade ?? 0)
    const tasksLabel = Number.isFinite(tasks) ? String(Math.max(0, Math.floor(tasks))) : '0'
    const decisionsLabel = Number.isFinite(decisions) ? String(Math.max(0, Math.floor(decisions))) : '0'
    const preheader = weekMessage.length > 120 ? `${weekMessage.slice(0, 117)}…` : weekMessage

    return renderEmailLayout({
      user,
      title: 'Your week, in my words',
      preheader,
      bodyHtml: `<p>I've been watching. Here's what I saw this week:</p>
      <p style="margin:16px 0;font-style:italic;color:#334155;line-height:1.65;">Week ${weekNumber}: ${weekMessage}</p>
      ${statsLineHtml(data, tasksLabel, decisionsLabel)}
      <p style="font-style:italic;color:#334155;line-height:1.65;">What stands out to me isn't the numbers. It's that you're starting to move from scattered days to a rhythm that holds you.</p>`,
      ctaLabel: 'Read your full weekly insight →',
      ctaUrl: appUrlWithUtm('/weekly', 'weekly_insight'),
    })
  },
  getText: (user, data) => {
    if (isFirstUnlock(data)) {
      const rawDays = Number(data?.firstUnlockDaysWithEntries ?? WEEKLY_INSIGHT_MIN_DAYS)
      const n = Number.isFinite(rawDays) ? Math.max(WEEKLY_INSIGHT_MIN_DAYS, rawDays) : WEEKLY_INSIGHT_MIN_DAYS
      const greeting = emailSubjectGreetingFromUser(user)
      const dw = dayWord(n)
      return `Hi ${greeting},

I've been watching how you plan, decide, and reflect. With ${dw} of entries, a pattern is starting to show.

Your first Weekly Insight is ready now — a snapshot of what I'm seeing so far.

Read my weekly insight: ${appUrlWithUtm('/weekly', 'weekly_insight_first')}

After this, a fresh read lands every Monday, capturing the week that just closed.

— Mrs. Deer${renderTextFooter(user)}`
    }

    const greeting = emailSubjectGreetingFromUser(user)
    const weekNumber = resolveJourneyWeekNumber(data)
    const daysForMessage = resolveDaysWithEntriesForMessage(data)
    const weekMessage = getWeeklyJourneyMessage(weekNumber, daysForMessage)
    const tasks = Number(data?.tasksCompleted ?? 0)
    const decisions = Number(data?.decisionsMade ?? 0)
    const tasksLabel = Number.isFinite(tasks) ? String(Math.max(0, Math.floor(tasks))) : '0'
    const decisionsLabel = Number.isFinite(decisions) ? String(Math.max(0, Math.floor(decisions))) : '0'

    return `Hi ${greeting},

I've been watching. Here's what I saw this week:

Week ${weekNumber}: ${weekMessage}

${statsLinePlain(data, tasksLabel, decisionsLabel)}

What stands out to me isn't the numbers. It's that you're starting to move from scattered days to a rhythm that holds you.

Read your full weekly insight: ${appUrlWithUtm('/weekly', 'weekly_insight')}${renderTextFooter(user)}`
  },
}
