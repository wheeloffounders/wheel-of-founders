import type { SupabaseClient } from '@supabase/supabase-js'

export type RecentMilestoneRow = {
  unlock_name: string
  unlocked_at: string
}

export type RecentMilestonesResult = {
  hasMilestone: boolean
  badges: RecentMilestoneRow[]
  count: number
}

/** Badge unlocks in the last `windowMs` (default 24h), newest first. */
export async function getRecentMilestones(
  db: SupabaseClient,
  userId: string,
  windowMs: number = 24 * 60 * 60 * 1000,
  /** For tests / deterministic simulation; defaults to `Date.now()` */
  nowMs: number = Date.now()
): Promise<RecentMilestonesResult> {
  const cutoffMs = nowMs - windowMs
  const sinceIso = new Date(cutoffMs).toISOString()

  const { data, error } = await db
    .from('user_unlocks')
    .select('unlock_name, unlocked_at')
    .eq('user_id', userId)
    .eq('unlock_type', 'badge')
    .gte('unlocked_at', sinceIso)
    .order('unlocked_at', { ascending: false })

  if (error) {
    console.warn('[getRecentMilestones]', error.message)
    return { hasMilestone: false, badges: [], count: 0 }
  }

  const rows = (data ?? []) as RecentMilestoneRow[]
  // DB filter + JS filter so we always match wall-clock window (timezone / parsing edge cases).
  const badges = rows.filter((r) => {
    if (typeof r.unlock_name !== 'string' || r.unlock_name.length === 0) return false
    const t = new Date(r.unlocked_at).getTime()
    return Number.isFinite(t) && t >= cutoffMs
  })

  return {
    hasMilestone: badges.length > 0,
    badges,
    count: badges.length,
  }
}
