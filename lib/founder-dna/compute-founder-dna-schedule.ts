import type { ArchetypeJourneyStatus, FounderDnaScheduleRow, JourneyBadge } from '@/lib/types/founder-dna'
import {
  ARCHETYPE_FULL_MIN_DAYS,
  ARCHETYPE_PREVIEW_MIN_DAYS,
  CELEBRATION_GAP_MIN_DAYS,
  DECISION_STYLE_MIN_DAYS,
  FIRST_GLIMPSE_MIN_EVENINGS,
  MONTHLY_INSIGHT_MIN_DAYS,
  isMorningInsightsUnlocked,
  POSTPONEMENT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
  SCHEDULE_POSTPONEMENT_DAY,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import {
  dayOffsetFromCreatedInTimeZone,
  nextIntervalInTimeZone,
  nextMondayMidnightInTimeZone,
  nextMonthFirstInTimeZone,
  nextQuarterStartInTimeZone,
  nextWeekdayInTimeZone,
} from '@/lib/timezone'

export type ComputeScheduleContext = {
  now: Date
  createdAt: Date | null
  daysActive: number
  totalEvenings: number
  totalDecisions: number
  badges: JourneyBadge[]
  unlockedFeatures: JourneyBadge[]
  archetypeStatus: ArchetypeJourneyStatus
  /** `user_profiles.profile_completed_at` — for Founder Story row progress */
  profileComplete: boolean
  /** IANA timezone for next-update instants (from user_profiles.timezone) */
  userTimeZone: string
}

export function computeFounderDnaSchedule(ctx: ComputeScheduleContext): FounderDnaScheduleRow[] {
  const {
    now,
    createdAt,
    daysActive,
    totalEvenings,
    badges,
    unlockedFeatures,
    archetypeStatus,
    profileComplete,
    userTimeZone,
  } = ctx

  const hasBadge = (name: string) => badges.some((b) => b.name === name)
  const hasFeature = (name: string) => unlockedFeatures.some((f) => f.name === name)

  const rows: FounderDnaScheduleRow[] = []

  const firstSpark = hasBadge('first_spark')
  rows.push({
    id: 'first_spark',
    sortOrder: 1,
    name: 'First Day Badge',
    icon: '🌟',
    unlockSummary: '1 morning commit',
    updateCadence: 'One-time',
    href: '/dashboard',
    unlocked: firstSpark,
    nextUpdateAt: null,
  })

  const firstGlimpseOk = hasFeature('first_glimpse') || totalEvenings >= FIRST_GLIMPSE_MIN_EVENINGS
  rows.push({
    id: 'first_glimpse',
    sortOrder: 2,
    name: 'First Glimpse',
    icon: '🔓',
    unlockSummary: '1 evening review',
    updateCadence: 'One-time',
    href: '/evening',
    unlocked: firstGlimpseOk,
    nextUpdateAt: null,
    progress: firstGlimpseOk
      ? undefined
      : { current: Math.min(totalEvenings, 1), target: 1, unit: 'evenings' },
  })

  const founderStoryOk = hasBadge('founder_story')
  rows.push({
    id: 'founder_story',
    sortOrder: 3,
    name: 'Founder Story',
    icon: '📖',
    unlockSummary: 'Complete your founder profile (all sections)',
    updateCadence: 'One-time badge',
    href: '/profile',
    unlocked: founderStoryOk,
    nextUpdateAt: null,
    progress: founderStoryOk
      ? undefined
      : { current: profileComplete ? 1 : 0, target: 1, unit: 'profile' },
    detail: founderStoryOk ? undefined : profileComplete ? 'Finish saving on Profile' : 'Fill in profile sections',
  })

  const morningOk = isMorningInsightsUnlocked(daysActive, totalEvenings)
  rows.push({
    id: 'morning_insights',
    sortOrder: 4,
    name: 'Morning insights',
    icon: '🌅',
    unlockSummary: 'After your first full day',
    updateCadence: 'Daily (after unlock)',
    href: '/morning',
    unlocked: morningOk,
    nextUpdateAt: null,
    progress: undefined,
    detail: morningOk
      ? undefined
      : daysActive < 1
        ? 'Log morning or evening activity for one founder day'
        : 'Complete your first evening review',
  })

  const storyOk = daysActive >= SCHEDULE_STORY_SO_FAR_DAY
  rows.push({
    id: 'your_story_so_far',
    sortOrder: 5,
    name: 'Your Story So Far',
    icon: '📚',
    unlockSummary: `${SCHEDULE_STORY_SO_FAR_DAY} days with entries`,
    updateCadence: 'Every Tuesday (your timezone) — first narrative on unlock day',
    href: '/founder-dna/rhythm',
    unlocked: storyOk,
    nextUpdateAt: storyOk ? nextWeekdayInTimeZone(now, 2, userTimeZone).toISOString() : null,
    progress: storyOk
      ? undefined
      : { current: daysActive, target: SCHEDULE_STORY_SO_FAR_DAY, unit: 'days_with_entries' },
  })

  const weeklyInsightOk = hasFeature('weekly_insight') || daysActive >= WEEKLY_INSIGHT_MIN_DAYS
  rows.push({
    id: 'weekly_insight',
    sortOrder: 6,
    name: 'Weekly Insight',
    icon: '📅',
    unlockSummary: `${WEEKLY_INSIGHT_MIN_DAYS} days with entries`,
    updateCadence: 'Every Monday 00:00 your time (cron, after unlock)',
    href: '/weekly',
    unlocked: weeklyInsightOk,
    nextUpdateAt: weeklyInsightOk ? nextMonthFirstInTimeZone(now, userTimeZone).toISOString() : null,
    progress: weeklyInsightOk
      ? undefined
      : { current: daysActive, target: WEEKLY_INSIGHT_MIN_DAYS, unit: 'days_with_entries' },
  })

  const gapOk = daysActive >= CELEBRATION_GAP_MIN_DAYS
  rows.push({
    id: 'celebration_gap',
    sortOrder: 7,
    name: 'Celebration Gap',
    icon: '🪞',
    unlockSummary: `${CELEBRATION_GAP_MIN_DAYS} days with entries`,
    updateCadence: 'Every Tuesday (your timezone) — hidden win mirror',
    href: '/founder-dna/rhythm',
    unlocked: gapOk,
    nextUpdateAt: gapOk ? nextWeekdayInTimeZone(now, 2, userTimeZone).toISOString() : null,
    progress: gapOk ? undefined : { current: daysActive, target: CELEBRATION_GAP_MIN_DAYS, unit: 'days_with_entries' },
  })

  const unseenOk = daysActive >= SCHEDULE_UNSEEN_WINS_DAY
  rows.push({
    id: 'unseen_wins',
    sortOrder: 8,
    name: 'Unseen Wins',
    icon: '✨',
    unlockSummary: `${SCHEDULE_UNSEEN_WINS_DAY} days with entries`,
    updateCadence: 'Every Tuesday (your timezone) — first insight on unlock day',
    href: '/founder-dna/rhythm',
    unlocked: unseenOk,
    nextUpdateAt: unseenOk ? nextWeekdayInTimeZone(now, 2, userTimeZone).toISOString() : null,
    progress: unseenOk ? undefined : { current: daysActive, target: SCHEDULE_UNSEEN_WINS_DAY, unit: 'days_with_entries' },
  })

  const energyOk = hasFeature('energy_trends') || daysActive >= SCHEDULE_ENERGY_MIN_DAYS
  rows.push({
    id: 'energy_trends',
    sortOrder: 9,
    name: 'Energy & Mood Trend',
    icon: '📊',
    unlockSummary: `${SCHEDULE_ENERGY_MIN_DAYS} days with entries`,
    updateCadence: 'Every Wednesday (your timezone) — first chart on unlock day',
    href: '/founder-dna/patterns',
    unlocked: energyOk,
    nextUpdateAt: energyOk ? nextWeekdayInTimeZone(now, 3, userTimeZone).toISOString() : null,
    progress: energyOk
      ? undefined
      : {
          current: Math.min(daysActive, SCHEDULE_ENERGY_MIN_DAYS),
          target: SCHEDULE_ENERGY_MIN_DAYS,
          unit: 'days_with_entries',
        },
  })

  const decisionOk = hasFeature('decision_style') || daysActive >= DECISION_STYLE_MIN_DAYS
  rows.push({
    id: 'decision_style',
    sortOrder: 10,
    name: 'Decision Style',
    icon: '🎯',
    unlockSummary: `${DECISION_STYLE_MIN_DAYS} days with entries`,
    updateCadence: 'Every Wednesday (your timezone) — first analysis on unlock day',
    href: '/founder-dna/patterns',
    unlocked: decisionOk,
    nextUpdateAt: decisionOk ? nextWeekdayInTimeZone(now, 3, userTimeZone).toISOString() : null,
    progress: decisionOk
      ? undefined
      : {
          current: Math.min(daysActive, DECISION_STYLE_MIN_DAYS),
          target: DECISION_STYLE_MIN_DAYS,
          unit: 'days_with_entries',
        },
  })

  const monthlyInsightOk = hasFeature('monthly_insight') || daysActive >= MONTHLY_INSIGHT_MIN_DAYS
  rows.push({
    id: 'monthly_insight',
    sortOrder: 11,
    name: 'Monthly Insight',
    icon: '🌙',
    unlockSummary: `${MONTHLY_INSIGHT_MIN_DAYS} days with entries`,
    updateCadence: '1st of each month 00:00 your time (cron, after unlock)',
    href: '/monthly-insight',
    unlocked: monthlyInsightOk,
    nextUpdateAt: monthlyInsightOk ? nextMonthFirstInTimeZone(now, userTimeZone).toISOString() : null,
    progress: monthlyInsightOk
      ? undefined
      : { current: daysActive, target: MONTHLY_INSIGHT_MIN_DAYS, unit: 'days_with_entries' },
  })

  const postOk = daysActive >= POSTPONEMENT_MIN_DAYS
  rows.push({
    id: 'postponement_patterns',
    sortOrder: 12,
    name: 'Postponement Patterns',
    icon: '⏳',
    unlockSummary: `${SCHEDULE_POSTPONEMENT_DAY} days with entries`,
    updateCadence: 'Every Wednesday (your timezone) — first patterns on unlock day',
    href: '/founder-dna/patterns',
    unlocked: postOk,
    nextUpdateAt: postOk ? nextWeekdayInTimeZone(now, 3, userTimeZone).toISOString() : null,
    progress: postOk ? undefined : { current: daysActive, target: SCHEDULE_POSTPONEMENT_DAY, unit: 'days_with_entries' },
  })

  const rqOk = daysActive >= RECURRING_QUESTION_MIN_DAYS
  rows.push({
    id: 'recurring_question',
    sortOrder: 13,
    name: 'Recurring Question',
    icon: '💫',
    unlockSummary: `${RECURRING_QUESTION_MIN_DAYS} days with entries`,
    updateCadence: 'Every Wednesday (your timezone) — first detection on unlock day',
    href: '/founder-dna/patterns',
    unlocked: rqOk,
    nextUpdateAt: rqOk ? nextWeekdayInTimeZone(now, 3, userTimeZone).toISOString() : null,
    progress: rqOk ? undefined : { current: daysActive, target: RECURRING_QUESTION_MIN_DAYS, unit: 'days_with_entries' },
  })

  const previewOk = hasFeature('founder_archetype') || daysActive >= ARCHETYPE_PREVIEW_MIN_DAYS
  const fullOk = hasFeature('founder_archetype_full') || archetypeStatus === 'full'

  let nextArchetypeFullUpdate: string | null = null
  if (fullOk && createdAt) {
    const fullAnchor = dayOffsetFromCreatedInTimeZone(createdAt, ARCHETYPE_FULL_MIN_DAYS, userTimeZone)
    if (fullAnchor) {
      nextArchetypeFullUpdate = nextIntervalInTimeZone(fullAnchor, now, 90, userTimeZone).toISOString()
    }
  }

  rows.push({
    id: 'founder_archetype',
    sortOrder: 14,
    name: 'Founder Archetype (Preview)',
    icon: '🏷️',
    unlockSummary: `${ARCHETYPE_PREVIEW_MIN_DAYS} days with entries`,
    updateCadence: '',
    href: '/founder-dna/archetype',
    unlocked: previewOk,
    nextUpdateAt: null,
    progress: previewOk
      ? undefined
      : { current: daysActive, target: ARCHETYPE_PREVIEW_MIN_DAYS, unit: 'days_with_entries' },
  })

  rows.push({
    id: 'founder_archetype_full',
    sortOrder: 15,
    name: 'Founder Archetype (Full)',
    icon: '🔮',
    unlockSummary: `${ARCHETYPE_FULL_MIN_DAYS} days with entries`,
    updateCadence: fullOk ? 'Every 90 days' : '',
    href: '/founder-dna/archetype',
    unlocked: fullOk,
    nextUpdateAt: fullOk ? nextArchetypeFullUpdate : null,
    progress: fullOk
      ? undefined
      : { current: daysActive, target: ARCHETYPE_FULL_MIN_DAYS, unit: 'days_with_entries' },
  })

  const quarterlyInsightOk = hasFeature('quarterly_insight') || daysActive >= QUARTERLY_INSIGHT_MIN_DAYS
  rows.push({
    id: 'quarterly_insight',
    sortOrder: 16,
    name: 'Quarterly Trajectory',
    icon: '📈',
    unlockSummary: `${QUARTERLY_INSIGHT_MIN_DAYS} days with entries`,
    updateCadence: 'Quarter start (Jan / Apr / Jul / Oct 1) your time — cron after unlock',
    href: '/quarterly',
    unlocked: quarterlyInsightOk,
    nextUpdateAt: quarterlyInsightOk ? nextQuarterStartInTimeZone(now, userTimeZone).toISOString() : null,
    progress: quarterlyInsightOk
      ? undefined
      : { current: daysActive, target: QUARTERLY_INSIGHT_MIN_DAYS, unit: 'days_with_entries' },
  })

  return rows
}
