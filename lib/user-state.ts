import { startOfDay, subDays, format } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'

interface MissingReflectionState {
  hasYesterdayEveningMissing: boolean
  yesterdayDate: string
  todayDate: string
}

export async function getMissingEveningState(
  db: SupabaseClient,
  userId: string,
  todayInput?: Date
): Promise<MissingReflectionState> {
  const today = startOfDay(todayInput ?? new Date())
  const yesterday = subDays(today, 1)
  const todayStr = format(today, 'yyyy-MM-dd')
  const yesterdayStr = format(yesterday, 'yyyy-MM-dd')

  const [{ data: yesterdayReview }, { data: todayReview }] = await Promise.all([
    db
      .from('evening_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('review_date', yesterdayStr)
      .maybeSingle(),
    db
      .from('evening_reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('review_date', todayStr)
      .maybeSingle(),
  ])

  return {
    hasYesterdayEveningMissing: !yesterdayReview && !!todayReview === false,
    yesterdayDate: yesterdayStr,
    todayDate: todayStr,
  }
}

