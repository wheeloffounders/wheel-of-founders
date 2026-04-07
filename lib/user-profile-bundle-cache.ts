/**
 * Single-flight + short TTL cache for `user_profiles` fields used together on the morning flow.
 * Avoids N duplicate Supabase reads when the morning page and several hooks each queried independently.
 */
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'

export const MORNING_USER_PROFILE_SELECT =
  'created_at, timezone, tier, calendar_reminder_time, calendar_reminder_type, primary_goal_text, has_seen_morning_tour, badges, current_streak, struggles, trial_starts_at, trial_ends_at, stripe_subscription_status, pro_features_enabled' as const

export type MorningUserProfileBundle = {
  created_at?: string | null
  timezone?: string | null
  tier?: string | null
  calendar_reminder_time?: string | null
  calendar_reminder_type?: string | null
  primary_goal_text?: string | null
  has_seen_morning_tour?: boolean | null
  badges?: unknown
  current_streak?: number | null
  /** Onboarding / profile "Biggest Struggles" ids (json array). */
  struggles?: unknown
  trial_starts_at?: string | null
  trial_ends_at?: string | null
  stripe_subscription_status?: string | null
  pro_features_enabled?: boolean | null
}

const STALE_MS = 5 * 60 * 1000

let cache: { userId: string; row: MorningUserProfileBundle | null; fetchedAt: number } | null = null
let inflight: Promise<MorningUserProfileBundle | null> | null = null

export function invalidateUserProfileBundle(): void {
  cache = null
  inflight = null
}

export async function fetchUserProfileBundle(options?: {
  /** Bypass cache read (still dedupes concurrent in-flight fetches). */
  force?: boolean
}): Promise<MorningUserProfileBundle | null> {
  const session = await getUserSession()
  if (!session) return null

  if (options?.force) {
    cache = null
  }

  const now = Date.now()
  if (!options?.force && cache && cache.userId === session.user.id && now - cache.fetchedAt < STALE_MS) {
    return cache.row
  }

  if (inflight) {
    return inflight
  }

  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(MORNING_USER_PROFILE_SELECT)
        .eq('id', session.user.id)
        .maybeSingle()

      const row = (data as MorningUserProfileBundle | null) ?? null
      if (!error) {
        cache = { userId: session.user.id, row, fetchedAt: Date.now() }
      }
      return row
    } finally {
      inflight = null
    }
  })()

  return inflight
}
