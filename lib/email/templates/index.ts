import type { EmailTemplate, EmailTemplateUser, TemplateData } from './types'
import { welcomeTemplate } from './welcome'
import { morningReminderTemplate } from './morningReminder'
import { eveningReminderTemplate } from './eveningReminder'
import { firstFullLoopTemplate } from './firstFullLoop'
import { weeklyInsightTemplate } from './weeklyInsight'
import { monthlyInsightTemplate } from './monthlyInsight'
import { quarterlyInsightFirstTemplate } from './quarterlyInsightFirst'
import { founderArchetypeFullTemplate } from './founderArchetypeFull'
import { insightsBundleTemplate } from './insightsBundle'
import { badgeEarnedTemplate } from './badgeEarned'
import { streakMilestoneTemplate } from './streakMilestone'
import { featureUnlockTemplate } from './featureUnlock'
import { inactivityReminderTemplate } from './inactivityReminder'
import type { RetentionEmailType } from '@/lib/email/triggers'

const TEMPLATE_MAP: Record<RetentionEmailType, EmailTemplate> = {
  welcome: welcomeTemplate,
  morning_reminder: morningReminderTemplate,
  evening_reminder: eveningReminderTemplate,
  first_full_loop: firstFullLoopTemplate,
  weekly_insight: weeklyInsightTemplate,
  monthly_insight: monthlyInsightTemplate,
  quarterly_insight_first: quarterlyInsightFirstTemplate,
  insights_bundle: insightsBundleTemplate,
  badge_earned: badgeEarnedTemplate,
  streak_milestone: streakMilestoneTemplate,
  feature_unlock: featureUnlockTemplate,
  founder_archetype_full: founderArchetypeFullTemplate,
  inactivity_reminder: inactivityReminderTemplate,
}

export function renderEmailTemplate(
  type: RetentionEmailType,
  user: EmailTemplateUser,
  data?: TemplateData
): { subject: string; html: string; text: string } {
  const t = TEMPLATE_MAP[type]
  return {
    subject: t.getSubject(user, data),
    html: t.getHtml(user, data),
    text: t.getText(user, data),
  }
}

