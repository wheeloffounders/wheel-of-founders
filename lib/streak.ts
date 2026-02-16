import { supabase } from './supabase'
import { format, subDays, parseISO } from 'date-fns'

export interface StreakData {
  currentStreak: number
  longestStreak: number
  lastReviewDate: string | null
}

/**
 * Calculate streak by counting consecutive days with evening reviews
 * starting from today and going backwards
 */
export async function calculateStreak(userId: string): Promise<StreakData> {
  try {
    // Get user profile (handle case where table might not exist yet)
    let profile: { current_streak?: number; longest_streak?: number; last_review_date?: string | null } | null = null
    try {
      const { data, error: profileError } = await supabase
        .from('user_profiles')
        .select('current_streak, longest_streak, last_review_date')
        .eq('id', userId)
        .maybeSingle()

      if (profileError) {
        // If table doesn't exist or RLS issue, continue without profile
        console.warn('Could not fetch profile (table may not exist yet):', profileError.message || profileError)
      } else {
        profile = data
      }
    } catch (err) {
      // Table might not exist - that's okay, we'll create it
      console.warn('Profile fetch failed (table may not exist):', err)
    }

    // Get all review dates for this user
    const { data: reviews, error: reviewsError } = await supabase
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .order('review_date', { ascending: false })

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      return {
        currentStreak: profile?.current_streak ?? 0,
        longestStreak: profile?.longest_streak ?? 0,
        lastReviewDate: profile?.last_review_date ?? null,
      }
    }

    if (!reviews || reviews.length === 0) {
      return {
        currentStreak: 0,
        longestStreak: profile?.longest_streak ?? 0,
        lastReviewDate: null,
      }
    }

    // Count consecutive days starting from today
    let streak = 0
    let checkDate = new Date()
    const reviewDates = new Set(
      reviews.map((r) => format(parseISO(r.review_date), 'yyyy-MM-dd'))
    )

    // Check if there's a review today
    const todayStr = format(checkDate, 'yyyy-MM-dd')
    if (!reviewDates.has(todayStr)) {
      // No review today, streak is 0
      return {
        currentStreak: 0,
        longestStreak: profile?.longest_streak ?? 0,
        lastReviewDate: reviews[0]?.review_date ?? null,
      }
    }

    // Count backwards from today
    while (true) {
      const dateStr = format(checkDate, 'yyyy-MM-dd')
      if (reviewDates.has(dateStr)) {
        streak++
        checkDate = subDays(checkDate, 1)
      } else {
        break
      }
    }

    // Update profile with calculated streak
    const longestStreak = Math.max(streak, profile?.longest_streak ?? 0)
    const lastReview = reviews[0]?.review_date ?? null

    // Upsert profile (only if table exists)
    try {
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert(
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
        // If table doesn't exist, that's okay - user needs to run migration
        console.warn('Could not update profile (table may not exist):', upsertError.message || upsertError)
      }
    } catch (err) {
      // Table might not exist - that's okay
      console.warn('Profile update failed (table may not exist):', err)
    }

    return {
      currentStreak: streak,
      longestStreak,
      lastReviewDate: lastReview,
    }
  } catch (error) {
    console.error('Error calculating streak:', error)
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastReviewDate: null,
    }
  }
}

/**
 * Check if today's streak is a milestone (3, 7, 14, 30 days)
 */
export function isStreakMilestone(streak: number): boolean {
  return [3, 7, 14, 30].includes(streak)
}

/**
 * Get milestone message for streak
 */
export function getStreakMilestoneMessage(streak: number): string {
  const messages: { [key: number]: string } = {
    3: "🎉 3-day streak! You're building momentum!",
    7: "🔥 7-day streak! A full week of reflection—impressive!",
    14: "🌟 14-day streak! Two weeks strong!",
    30: "🏆 30-day streak! A full month of consistency—you're unstoppable!",
  }
  return messages[streak] || `🔥 ${streak}-day streak! Keep it going!`
}
