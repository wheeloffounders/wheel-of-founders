import {
  CELEBRATION_GAP_MIN_DAYS,
  DECISION_STYLE_MIN_DAYS,
  FIRST_GLIMPSE_MIN_EVENINGS,
  MONTHLY_INSIGHT_MIN_DAYS,
  MORNING_INSIGHTS_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
  WEEKLY_INSIGHT_MIN_DAYS,
  isMorningInsightsUnlocked,
} from '@/lib/founder-dna/unlock-schedule-config'

type DayThresholdBadge = {
  name: string
  threshold: number
}

const DAY_THRESHOLD_BADGES: DayThresholdBadge[] = [
  { name: 'Morning Insights', threshold: MORNING_INSIGHTS_MIN_DAYS },
  { name: 'Your Story So Far', threshold: SCHEDULE_STORY_SO_FAR_DAY },
  { name: 'Weekly Insight', threshold: WEEKLY_INSIGHT_MIN_DAYS },
  { name: 'Celebration Gap', threshold: CELEBRATION_GAP_MIN_DAYS },
  { name: 'Unseen Wins', threshold: SCHEDULE_UNSEEN_WINS_DAY },
  { name: 'Energy & Mood Trend', threshold: SCHEDULE_ENERGY_MIN_DAYS },
  { name: 'Decision Style', threshold: DECISION_STYLE_MIN_DAYS },
  { name: 'Monthly Insight', threshold: MONTHLY_INSIGHT_MIN_DAYS },
  { name: 'Postponement Patterns', threshold: POSTPONEMENT_MIN_DAYS },
  { name: 'Recurring Question', threshold: RECURRING_QUESTION_MIN_DAYS },
  { name: 'Quarterly Trajectory', threshold: QUARTERLY_INSIGHT_MIN_DAYS },
].sort((a, b) => a.threshold - b.threshold)

export type NextBadgeInfo = {
  name: string
  threshold: number
  daysRemaining: number
  /** Shown instead of “in N days” when the gate isn’t day-count only */
  note?: string
}

/**
 * @param totalEveningReviews — count of evening_reviews rows; omit to skip evening gate (legacy callers).
 */
export function getNextBadgeInfo(daysWithEntries: number, totalEveningReviews?: number): NextBadgeInfo | null {
  const current = Math.max(0, Number.isFinite(daysWithEntries) ? Math.floor(daysWithEntries) : 0)
  const ev =
    totalEveningReviews === undefined ? Number.POSITIVE_INFINITY : Math.max(0, Math.floor(totalEveningReviews))

  const morningOk = isMorningInsightsUnlocked(current, ev)

  if (!morningOk) {
    if (current < MORNING_INSIGHTS_MIN_DAYS) {
      return {
        name: 'Morning Insights',
        threshold: MORNING_INSIGHTS_MIN_DAYS,
        daysRemaining: MORNING_INSIGHTS_MIN_DAYS - current,
      }
    }
    if (ev < FIRST_GLIMPSE_MIN_EVENINGS) {
      return {
        name: 'Morning Insights',
        threshold: MORNING_INSIGHTS_MIN_DAYS,
        daysRemaining: 0,
        note: 'Complete your first evening review to unlock.',
      }
    }
  }

  const next = DAY_THRESHOLD_BADGES.filter((b) => b.name !== 'Morning Insights').find((b) => b.threshold > current)
  if (!next) return null
  return {
    name: next.name,
    threshold: next.threshold,
    daysRemaining: Math.max(0, next.threshold - current),
  }
}
