import type { SupabaseClient } from '@supabase/supabase-js'
import { eachMonthOfInterval, endOfQuarter, format, startOfQuarter } from 'date-fns'
import { parseWinsFromReview } from '@/lib/quarterly/parse-wins'

export type WinWithReviewDate = { text: string; reviewDate: string }

export type MonthWinsBucket = {
  monthKey: string
  label: string
  wins: WinWithReviewDate[]
}

export type QuarterlyStats = {
  totalTasks: number
  completedTasks: number
  needleMovers: number
  needleMoversCompleted: number
  reviewsCount: number
  decisions: number
}

export type QuarterlyUserProfile = {
  preferred_name: string | null
  name: string | null
  email_address: string | null
  primary_goal_text: string | null
  founder_stage: string | null
}

export type QuarterlyData = {
  winsByMonth: MonthWinsBucket[]
  /** Every win in quarter order (flattened), for “view all” */
  allWinsFlat: WinWithReviewDate[]
  stats: QuarterlyStats
  userProfile: QuarterlyUserProfile
  quarterStart: string
  quarterEnd: string
}

export async function fetchQuarterlyData(
  supabase: SupabaseClient,
  userId: string,
  quarterAnchor: Date
): Promise<QuarterlyData> {
  const quarterStart = format(startOfQuarter(quarterAnchor), 'yyyy-MM-dd')
  const quarterEnd = format(endOfQuarter(quarterAnchor), 'yyyy-MM-dd')

  const [tasksRes, reviewsRes, decisionsRes, profileRes] = await Promise.all([
    supabase
      .from('morning_tasks')
      .select('needle_mover, completed')
      .gte('plan_date', quarterStart)
      .lte('plan_date', quarterEnd)
      .eq('user_id', userId),
    supabase
      .from('evening_reviews')
      .select('wins, review_date')
      .gte('review_date', quarterStart)
      .lte('review_date', quarterEnd)
      .eq('user_id', userId),
    supabase
      .from('morning_decisions')
      .select('id')
      .gte('plan_date', quarterStart)
      .lte('plan_date', quarterEnd)
      .eq('user_id', userId),
    supabase
      .from('user_profiles')
      .select('preferred_name, name, primary_goal_text, founder_stage')
      .eq('id', userId)
      .maybeSingle(),
  ])

  const tasks = tasksRes.data ?? []
  const reviews = reviewsRes.data ?? []

  const byMonth: Record<string, WinWithReviewDate[]> = {}
  const allWinsFlat: WinWithReviewDate[] = []

  for (const r of reviews as { wins?: unknown; review_date?: string }[]) {
    const reviewDate = typeof r.review_date === 'string' ? r.review_date : ''
    if (!reviewDate) continue
    const monthKey = reviewDate.slice(0, 7)
    const parsed = parseWinsFromReview(r.wins)
    for (const text of parsed) {
      const w = { text, reviewDate }
      allWinsFlat.push(w)
      if (!byMonth[monthKey]) byMonth[monthKey] = []
      byMonth[monthKey].push(w)
    }
  }

  const monthIntervals = eachMonthOfInterval({
    start: startOfQuarter(quarterAnchor),
    end: endOfQuarter(quarterAnchor),
  })

  const winsByMonth: MonthWinsBucket[] = monthIntervals.map((d) => {
    const monthKey = format(d, 'yyyy-MM')
    return {
      monthKey,
      label: format(d, 'MMMM'),
      wins: byMonth[monthKey] ?? [],
    }
  })

  const profile = profileRes.data as {
    preferred_name?: string | null
    name?: string | null
    email_address?: string | null
    primary_goal_text?: string | null
    founder_stage?: string | null
  } | null

  return {
    winsByMonth,
    allWinsFlat,
    stats: {
      totalTasks: tasks.length,
      completedTasks: tasks.filter((t) => t.completed).length,
      needleMovers: tasks.filter((t) => t.needle_mover).length,
      needleMoversCompleted: tasks.filter((t) => t.needle_mover && t.completed).length,
      reviewsCount: reviews.length,
      decisions: (decisionsRes.data ?? []).length,
    },
    userProfile: {
      preferred_name: profile?.preferred_name ?? null,
      name: profile?.name ?? null,
      email_address: profile?.email_address ?? null,
      primary_goal_text: profile?.primary_goal_text ?? null,
      founder_stage: profile?.founder_stage ?? null,
    },
    quarterStart,
    quarterEnd,
  }
}
