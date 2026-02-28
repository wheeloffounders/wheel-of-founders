/**
 * User history detection for Mrs. Deer insight generation.
 * Determines if user has enough history for pattern-based insights,
 * or should receive mirror-only (first-day) responses.
 */
import { getServerSupabase } from './server-supabase'
import { subDays, format } from 'date-fns'

/** Minimum distinct days with entries to consider "has history" */
const MIN_ENTRIES_FOR_HISTORY = 3

/** Lookback window in days */
const LOOKBACK_DAYS = 7

export interface UserHistoryResult {
  hasHistory: boolean
  entryCount: number
  firstEntryDate: string | null
  distinctDates: string[]
}

/**
 * Check if user has at least MIN_ENTRIES_FOR_HISTORY entries in the last LOOKBACK_DAYS.
 * An "entry" = one day with either a morning plan (tasks) or evening review.
 */
export async function checkUserHistory(userId: string): Promise<UserHistoryResult> {
  const db = getServerSupabase()
  const endDate = new Date()
  const startDate = subDays(endDate, LOOKBACK_DAYS)
  const startStr = format(startDate, 'yyyy-MM-dd')
  const endStr = format(endDate, 'yyyy-MM-dd')

  const [reviewsRes, tasksRes] = await Promise.all([
    db
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .gte('review_date', startStr)
      .lte('review_date', endStr),
    db
      .from('morning_tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .gte('plan_date', startStr)
      .lte('plan_date', endStr),
  ])

  const dates = new Set<string>()
  ;(reviewsRes.data ?? []).forEach((r: { review_date?: string }) => {
    if (r.review_date) dates.add(r.review_date)
  })
  ;(tasksRes.data ?? []).forEach((t: { plan_date?: string }) => {
    if (t.plan_date) dates.add(t.plan_date)
  })

  const distinctDates = [...dates].sort()
  const entryCount = distinctDates.length
  const hasHistory = entryCount >= MIN_ENTRIES_FOR_HISTORY

  // First entry ever (not just last 7 days)
  const [firstReviewRes, firstTaskRes] = await Promise.all([
    db
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .order('review_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
    db
      .from('morning_tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .order('plan_date', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  const firstReviewDate = (firstReviewRes.data as { review_date?: string } | null)?.review_date
  const firstTaskDate = (firstTaskRes.data as { plan_date?: string } | null)?.plan_date
  const firstEntryDate =
    firstReviewDate && firstTaskDate
      ? firstReviewDate < firstTaskDate
        ? firstReviewDate
        : firstTaskDate
      : firstReviewDate || firstTaskDate || null

  if (!hasHistory) {
    console.log(`[user-history] User ${userId}: NO history (${entryCount} entries in last ${LOOKBACK_DAYS} days). First entry: ${firstEntryDate}. Using mirror mode.`)
  } else {
    console.log(`[user-history] User ${userId}: has history (${entryCount} entries). First entry: ${firstEntryDate}. Using pattern mode.`)
  }

  return {
    hasHistory,
    entryCount,
    firstEntryDate,
    distinctDates,
  }
}
