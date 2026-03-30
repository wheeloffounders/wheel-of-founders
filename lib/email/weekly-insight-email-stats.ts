import type { SupabaseClient } from '@supabase/supabase-js'
import { getDaysWithEntriesUpTo } from '@/lib/founder-dna/days-with-entries'
import { journeyWeekNumberFromDaysWithEntries } from '@/lib/email/weekly-journey-messages'

export type WeeklyInsightEmailStatsScope = 'cumulative_to_date' | 'weekly_window'

export type WeeklyInsightEmailStats = {
  /** Days with entries from first activity through insight period end (`weekEnd`), inclusive */
  daysWithEntries: number
  tasksCompleted: number
  decisionsMade: number
  statsScope: WeeklyInsightEmailStatsScope
  /** Journey week from `daysWithEntries` (ceil(days/7)); used for email copy */
  weeklyJourneyWeekNumber: number
}

export type WeeklyInsightEmailPeriod = {
  /** Inclusive start of the insight window (YYYY-MM-DD) */
  weekStart: string
  /** Inclusive end of the insight window (YYYY-MM-DD) */
  weekEnd: string
}

async function countCompletedTasksInPlanDateRange(
  userId: string,
  db: SupabaseClient,
  startYmd: string | null,
  endYmd: string
): Promise<number> {
  let q = db
    .from('morning_tasks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .lte('plan_date', endYmd)
  if (startYmd) {
    q = q.gte('plan_date', startYmd)
  }
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

async function countDecisionsInPlanDateRange(
  userId: string,
  db: SupabaseClient,
  startYmd: string | null,
  endYmd: string
): Promise<number> {
  let q = db
    .from('morning_decisions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('plan_date', endYmd)
  if (startYmd) {
    q = q.gte('plan_date', startYmd)
  }
  const { count, error } = await q
  if (error) throw error
  return count ?? 0
}

/**
 * Stats for the weekly insight email: journey context through `weekEnd`, and either
 * cumulative-to-date counts (first journey week) or counts for `[weekStart, weekEnd]` only.
 */
export async function fetchWeeklyInsightEmailStats(
  userId: string,
  db: SupabaseClient,
  period: WeeklyInsightEmailPeriod
): Promise<WeeklyInsightEmailStats> {
  const { weekStart, weekEnd } = period

  const daysWithEntries = await getDaysWithEntriesUpTo(userId, db, weekEnd)
  const weeklyJourneyWeekNumber = journeyWeekNumberFromDaysWithEntries(daysWithEntries)

  const cumulative = weeklyJourneyWeekNumber <= 1
  const statsScope: WeeklyInsightEmailStatsScope = cumulative ? 'cumulative_to_date' : 'weekly_window'
  const startForCounts = cumulative ? null : weekStart

  const [tasksCompleted, decisionsMade] = await Promise.all([
    countCompletedTasksInPlanDateRange(userId, db, startForCounts, weekEnd),
    countDecisionsInPlanDateRange(userId, db, startForCounts, weekEnd),
  ])

  return {
    daysWithEntries,
    tasksCompleted,
    decisionsMade,
    statsScope,
    weeklyJourneyWeekNumber,
  }
}
