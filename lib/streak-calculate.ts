import type { SupabaseClient } from '@supabase/supabase-js'
import { format, subDays, parseISO } from 'date-fns'
import { getEffectivePlanDate } from './effective-plan-date'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastReviewDate: string | null
}

function normalizeYmd(d: string): string {
  return String(d).slice(0, 10)
}

/**
 * Consecutive founder-days with BOTH:
 * - morning plan committed on that same calendar day
 * - evening review saved for that day
 */
export function computeFullLoopStreak(opts: {
  eveningDates: Set<string>
  morningDates: Set<string>
  effectiveToday: string
}): number {
  const { eveningDates, morningDates, effectiveToday } = opts
  const isFull = (day: string) => eveningDates.has(day) && morningDates.has(day)

  const yesterday = format(subDays(parseISO(effectiveToday + 'T12:00:00'), 1), 'yyyy-MM-dd')

  let start = effectiveToday
  if (!isFull(effectiveToday)) {
    if (!isFull(yesterday)) {
      return 0
    }
    start = yesterday
  }

  let streak = 0
  let d = parseISO(start + 'T12:00:00')
  while (isFull(format(d, 'yyyy-MM-dd'))) {
    streak++
    d = subDays(d, 1)
  }
  return streak
}

function computeEveningOnlyStreak(eveningDates: Set<string>, effectiveToday: string): number {
  const yesterday = format(subDays(parseISO(effectiveToday + 'T12:00:00'), 1), 'yyyy-MM-dd')
  let start = effectiveToday
  if (!eveningDates.has(effectiveToday)) {
    if (!eveningDates.has(yesterday)) {
      return 0
    }
    start = yesterday
  }
  let streak = 0
  let d = parseISO(start + 'T12:00:00')
  while (eveningDates.has(format(d, 'yyyy-MM-dd'))) {
    streak++
    d = subDays(d, 1)
  }
  return streak
}

/**
 * Recalculate streak from DB rows, persist to user_profiles. Works with browser or server Supabase client.
 */
export async function calculateStreakForUser(db: SupabaseClient, userId: string): Promise<StreakData> {
  try {
    let profile: { current_streak?: number; longest_streak?: number; last_review_date?: string | null } | null = null
    try {
      const { data, error: profileError } = await db
        .from('user_profiles')
        .select('current_streak, longest_streak, last_review_date')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        console.warn('[streak] profile fetch:', profileError.message || profileError)
      } else {
        profile = data
      }
    } catch (err) {
      console.warn('[streak] profile fetch failed:', err)
    }

    const [reviewsRes, commitsRes] = await Promise.all([
      db.from('evening_reviews').select('review_date').eq('user_id', userId),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom commit columns
      (db.from('morning_plan_commits') as any).select('plan_date, committed_at').eq('user_id', userId),
    ])

    if (commitsRes.error) {
      console.warn('[streak] morning_plan_commits:', commitsRes.error.message)
    }

    if (reviewsRes.error) {
      console.error('[streak] evening_reviews:', reviewsRes.error)
      return {
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        lastReviewDate: profile?.last_review_date ?? null,
      }
    }

    const reviews = reviewsRes.data ?? []
    if (reviews.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: profile?.longest_streak ?? 0,
        lastReviewDate: null,
      }
    }

    const eveningDates = new Set(reviews.map((r) => normalizeYmd(String((r as { review_date: string }).review_date))))

    // Any morning_plan_commits row for plan_date counts as a saved morning for that founder day.
    // Do not require committed_at's calendar day to match plan_date: committed_at is stored as UTC
    // ISO (morning save), which often falls on the next UTC date vs the user's plan_date.
    const morningDates = new Set<string>()
    for (const row of (commitsRes.data ?? []) as Array<{ plan_date?: string }>) {
      const planDate = normalizeYmd(String(row.plan_date || ''))
      if (planDate) morningDates.add(planDate)
    }

    const effectiveToday = getEffectivePlanDate()
    const fullStreak = computeFullLoopStreak({ eveningDates, morningDates, effectiveToday })
    const streak =
      morningDates.size === 0 ? computeEveningOnlyStreak(eveningDates, effectiveToday) : fullStreak

    const sortedEveningDesc = [...eveningDates].sort().reverse()
    const lastReview = sortedEveningDesc[0] ?? null

    const longestStreak = Math.max(streak, profile?.longest_streak ?? 0)

    try {
      const { error: upsertError } = await db.from('user_profiles').upsert(
        {
          id: userId,
          current_streak: streak,
          longest_streak: longestStreak,
          last_review_date: lastReview,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )

      if (upsertError) {
        console.warn('[streak] profile upsert:', upsertError.message || upsertError)
      }
    } catch (err) {
      console.warn('[streak] profile upsert failed:', err)
    }

    return {
      currentStreak: streak,
      longestStreak,
      lastReviewDate: lastReview,
    }
  } catch (error) {
    console.error('[streak] calculateStreakForUser:', error)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReviewDate: null,
    }
  }
}
