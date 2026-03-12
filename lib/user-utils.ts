import { supabase } from '@/lib/supabase'

/**
 * Returns the number of days since the user's first entry (evening_reviews or morning_tasks).
 */
export async function getUserDaysSinceFirstEntry(userId: string): Promise<number> {
  try {
    const { data: reviewData } = await supabase
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .order('review_date', { ascending: true })
      .limit(1)

    if (reviewData && reviewData.length > 0) {
      const firstEntry = new Date((reviewData[0] as { review_date: string }).review_date)
      const today = new Date()
      return Math.floor((today.getTime() - firstEntry.getTime()) / (1000 * 60 * 60 * 24))
    }

    const { data: taskData } = await supabase
      .from('morning_tasks')
      .select('plan_date')
      .eq('user_id', userId)
      .order('plan_date', { ascending: true })
      .limit(1)

    if (taskData && taskData.length > 0) {
      const firstEntry = new Date((taskData[0] as { plan_date: string }).plan_date)
      const today = new Date()
      return Math.floor((today.getTime() - firstEntry.getTime()) / (1000 * 60 * 60 * 24))
    }

    return 0
  } catch (error) {
    console.error('Error calculating user days:', error)
    return 0
  }
}

export async function hasMinimumDays(userId: string, minDays: number = 100): Promise<boolean> {
  const days = await getUserDaysSinceFirstEntry(userId)
  return days >= minDays
}
