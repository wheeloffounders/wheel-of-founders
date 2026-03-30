/**
 * Founder DNA unlock thresholds (days with entries).
 * Keep in sync with journey API, feature APIs, and Founder DNA hub routes.
 *
 * Rhythm features: Tuesday UTC + ≥7 days between refreshes.
 * Patterns features: Wednesday UTC + ≥7 days between refreshes.
 */
export const SCHEDULE_FIRST_SPARK_DAY = 1

/** First Glimpse modal — after first evening reflection (one-shot + API for copy). */
export const FIRST_GLIMPSE_MIN_EVENINGS = 1

/** Founder days with activity (morning commit and/or evening) counted by getDaysWithEntries. */
export const MORNING_INSIGHTS_MIN_DAYS = 1

/** Morning + post-morning AI: requires ≥1 day-with-entries and ≥1 evening review (same bar as First Glimpse). */
export function isMorningInsightsUnlocked(daysWithEntries: number, totalEvenings: number): boolean {
  return (
    daysWithEntries >= MORNING_INSIGHTS_MIN_DAYS && totalEvenings >= FIRST_GLIMPSE_MIN_EVENINGS
  )
}

/** Your Story So Far — Rhythm, Tuesday */
export const SCHEDULE_STORY_SO_FAR_DAY = 4

/** Celebration Gap (hidden win mirror) — Rhythm, Tuesday */
export const CELEBRATION_GAP_MIN_DAYS = 6

/** Unseen Wins — Rhythm, Tuesday */
export const SCHEDULE_UNSEEN_WINS_DAY = 8

/** Energy & Mood Trend — Patterns, Wednesday */
export const SCHEDULE_ENERGY_MIN_DAYS = 10
/** @deprecated Legacy: 3rd evening could unlock energy; timetable now uses day 9 only. */
export const SCHEDULE_ENERGY_MIN_EVENINGS = 3

/** Decision Style — Patterns, Wednesday */
export const DECISION_STYLE_MIN_DAYS = 12
/** @deprecated Legacy decision-count gate */
export const SCHEDULE_DECISION_STYLE_MIN_DECISIONS = 5

export const SCHEDULE_POSTPONEMENT_DAY = 16

// Re-export archetype thresholds from single source
export { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'

/** Postponement Patterns — Patterns, Wednesday */
export const POSTPONEMENT_MIN_DAYS = SCHEDULE_POSTPONEMENT_DAY

/** Recurring Question — Patterns, Wednesday */
export const RECURRING_QUESTION_MIN_DAYS = 18

/** Weekly Insight page — days with entries; cron Mondays 00:00 UTC after unlock */
export const WEEKLY_INSIGHT_MIN_DAYS = 5

/** Monthly Insight page — days with entries; cron 1st of month after unlock */
export const MONTHLY_INSIGHT_MIN_DAYS = 15

/** Quarterly Trajectory page — days with entries; quarter starts Jan/Apr/Jul/Oct after unlock */
export const QUARTERLY_INSIGHT_MIN_DAYS = 45
