import type { SupabaseClient } from '@supabase/supabase-js'

export function isQuarterlyInsightRowComplete(row: {
  status?: string | null
  insight_text?: string | null
}): boolean {
  return row.status === 'completed' && Boolean((row.insight_text ?? '').trim())
}

export type QuarterlyInsightUserPeriod = { userId: string; quarterStart: string }

/** Keys `userId\tYYYY-MM-DD` for quarters that already have a completed insight with text. */
export async function fetchCompletedQuarterlyInsightKeys(
  db: SupabaseClient,
  pairs: QuarterlyInsightUserPeriod[]
): Promise<Set<string>> {
  if (pairs.length === 0) return new Set()
  const userIds = [...new Set(pairs.map((p) => p.userId))]
  const quarterStarts = [...new Set(pairs.map((p) => p.quarterStart.slice(0, 10)))]
  const { data, error } = await db
    .from('quarterly_insights')
    .select('user_id, quarter_start, status, insight_text')
    .in('user_id', userIds)
    .in('quarter_start', quarterStarts)
  if (error) throw error
  const done = new Set<string>()
  for (const row of data ?? []) {
    const r = row as {
      user_id: string
      quarter_start: string
      status?: string | null
      insight_text?: string | null
    }
    if (isQuarterlyInsightRowComplete(r)) {
      done.add(`${r.user_id}\t${r.quarter_start}`)
    }
  }
  return done
}
