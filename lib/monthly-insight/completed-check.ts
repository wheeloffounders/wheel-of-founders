import type { SupabaseClient } from '@supabase/supabase-js'

export function isMonthlyInsightRowComplete(row: {
  status?: string | null
  insight_text?: string | null
}): boolean {
  return row.status === 'completed' && Boolean((row.insight_text ?? '').trim())
}

export async function hasCompletedMonthlyInsight(
  db: SupabaseClient,
  userId: string,
  monthStart: string
): Promise<boolean> {
  const ms = monthStart.slice(0, 10)
  const { data } = await db
    .from('monthly_insights')
    .select('status, insight_text')
    .eq('user_id', userId)
    .eq('month_start', ms)
    .maybeSingle()
  if (!data) return false
  return isMonthlyInsightRowComplete(data as { status?: string; insight_text?: string | null })
}

export type MonthlyInsightUserPeriod = { userId: string; monthStart: string }

/** Keys `userId\tYYYY-MM-DD` for periods that already have a completed insight with text. */
export async function fetchCompletedMonthlyInsightKeys(
  db: SupabaseClient,
  pairs: MonthlyInsightUserPeriod[]
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set()
  const userIds = [...new Set(pairs.map((p) => p.userId))]
  const monthStarts = [...new Set(pairs.map((p) => p.monthStart.slice(0, 10)))]
  const { data, error } = await db
    .from('monthly_insights')
    .select('user_id, month_start, status, insight_text')
    .in('user_id', userIds)
    .in('month_start', monthStarts)
  if (error) throw error
  const done = new Set<string>()
  for (const row of data ?? []) {
    const r = row as {
      user_id: string
      month_start: string
      status?: string | null
      insight_text?: string | null
    }
    if (isMonthlyInsightRowComplete(r)) {
      done.add(`${r.user_id}\t${r.month_start}`)
    }
  }
  return done
}
