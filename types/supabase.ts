/**
 * Narrow row shapes for Supabase `.select()` / `.insert()` when the generated client
 * resolves table rows to `never` (missing or incomplete Database typings).
 */

/** One entry in `user_profiles.unlocked_features` JSON array */
export type UnlockedFeatureJson = {
  name: string
  label: string
  description: string
  icon: string
  unlocked_at: string
}

export function parseUnlockedFeatures(raw: unknown): UnlockedFeatureJson[] {
  let data: unknown = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(data)) return []
  const out: UnlockedFeatureJson[] = []
  for (const f of data) {
    if (!f || typeof f !== 'object') continue
    const o = f as Record<string, unknown>
    if (typeof o.name !== 'string') continue
    out.push({
      name: o.name,
      label: typeof o.label === 'string' ? o.label : String(o.name),
      description: typeof o.description === 'string' ? o.description : '',
      icon: typeof o.icon === 'string' ? o.icon : '🎁',
      unlocked_at: typeof o.unlocked_at === 'string' ? o.unlocked_at : String(o.unlocked_at ?? ''),
    })
  }
  return out
}

export type UserProfileAccessRow = {
  id?: string
  created_at?: string | null
  current_streak?: number | null
  badges?: unknown
  unlocked_features?: unknown
  last_refreshed?: unknown
  profile_completed_at?: string | null
  has_seen_morning_tour?: boolean | null
  founder_personality?: string | null
  total_quick_wins?: number | null
  timezone?: string | null
}

export type UserUnlockBadgeRow = {
  unlock_name?: string | null
  unlock_type?: string | null
  unlocked_at?: string | null
}

/** Row shape for `public.user_unlocks` (see migration 083_founder_dna_badges.sql) */
export type UserUnlockType = 'badge' | 'feature'

export type UserUnlock = {
  id: string
  user_id: string
  unlock_type: UserUnlockType
  unlock_name: string
  unlocked_at: string
  seen_notification: boolean
  created_at: string
}

/** Fields accepted by `.insert()`; DB defaults apply for omitted optional columns */
export type UserUnlockInsert = {
  user_id: string
  unlock_type: UserUnlockType
  unlock_name: string
  unlocked_at?: string
  seen_notification?: boolean
}

/** `morning_decisions` rows used for breakdown / recent lists */
export type MorningDecisionBreakdownRow = {
  created_at?: string | null
  decision_type?: string | null
}

/** `evening_reviews` rows used for energy/mood trends */
export type EveningReviewTrendRow = {
  created_at?: string | null
  mood?: number | string | null
  energy?: number | string | null
}
