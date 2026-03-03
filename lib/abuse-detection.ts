/**
 * Abuse detection for AI insight generation.
 * Flags unusual patterns (rapid-fire requests, bulk scraping).
 */
import { getServerSupabase } from './server-supabase'

/** Threshold: more than this many insights in 1 hour is suspicious */
const INSIGHTS_PER_HOUR_THRESHOLD = 10

/** Threshold: more than this many insights in 24 hours is suspicious */
const INSIGHTS_PER_DAY_THRESHOLD = 20

/**
 * Check if a user's recent activity suggests abuse (bulk scraping, rapid-fire).
 * Returns true if abuse is detected.
 */
export async function detectAbuse(userId: string): Promise<boolean> {
  const db = getServerSupabase()
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  const [hourRes, dayRes] = await Promise.all([
    db
      .from('personal_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('generated_at', oneHourAgo.toISOString()),
    db
      .from('personal_prompts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('generated_at', oneDayAgo.toISOString()),
  ])

  const hourCount = hourRes.count ?? 0
  const dayCount = dayRes.count ?? 0

  if (hourCount > INSIGHTS_PER_HOUR_THRESHOLD) {
    console.warn(`[AbuseDetection] User ${userId.slice(0, 8)}... generated ${hourCount} insights in 1 hour (threshold: ${INSIGHTS_PER_HOUR_THRESHOLD})`)
    return true
  }

  if (dayCount > INSIGHTS_PER_DAY_THRESHOLD) {
    console.warn(`[AbuseDetection] User ${userId.slice(0, 8)}... generated ${dayCount} insights in 24 hours (threshold: ${INSIGHTS_PER_DAY_THRESHOLD})`)
    return true
  }

  return false
}
