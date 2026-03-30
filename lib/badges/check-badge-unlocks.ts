import type { SupabaseClient } from '@supabase/supabase-js'
import { insertUserUnlock } from '@/lib/unlock-helpers'
import { BADGE_DEFINITION_MAP } from '@/lib/badges/badge-definitions'
import type { JourneyBadge } from '@/lib/types/founder-dna'

type CheckBadgeUnlocksArgs = {
  db: SupabaseClient
  userId: string
  profile: {
    badges?: unknown
    current_streak?: number | null
    profile_completed_at?: string | null
    has_seen_morning_tour?: boolean | null
    founder_personality?: string | null
    total_quick_wins?: number | null
  } | null
  counts: {
    totalTasks: number
    totalDecisions: number
    totalEvenings: number
    daysActive: number
    /** Morning tasks marked completed — used for first_spark */
    completedTasks?: number
  }
  unlockedFeatures: Array<{ name?: string }>
  archetypeStatus: 'locked' | 'preview' | 'full'
  behaviorReflection?: {
    deepWorker?: boolean
    strategicMind?: boolean
    tacticalPro?: boolean
    deepReflector?: boolean
    patternSeeker?: boolean
    questionAsker?: boolean
    growthEdge?: boolean
  }
}

type BadgeEvaluationArgs = Omit<CheckBadgeUnlocksArgs, 'db' | 'userId'>

function isBadgeArray(raw: unknown): raw is JourneyBadge[] {
  return Array.isArray(raw)
}

function includesFeature(features: Array<{ name?: string }>, name: string): boolean {
  return features.some((f) => f?.name === name)
}

function normalizePersonalityToIdentityBadge(name: string | null | undefined): string | null {
  const n = String(name ?? '').toLowerCase().trim()
  if (!n) return null
  if (n.includes('vision')) return 'visionary'
  if (n.includes('build')) return 'builder'
  if (n.includes('hust')) return 'hustler'
  if (n.includes('strateg')) return 'strategist'
  return 'hybrid'
}

export function evaluateBadgeUnlocks(args: BadgeEvaluationArgs): {
  badges: JourneyBadge[]
  newlyUnlocked: JourneyBadge[]
} {
  const { profile, counts, unlockedFeatures, archetypeStatus, behaviorReflection } = args
  const current = isBadgeArray(profile?.badges) ? profile!.badges : []
  const normalizedCurrent = current.map((b) => {
    const def = BADGE_DEFINITION_MAP[b.name]
    return {
      ...b,
      label: def?.label ?? b.label,
      description: def?.description ?? b.description,
      icon: def?.icon ?? b.icon,
      category: def?.category ?? b.category,
      celebrationTier: def?.celebrationTier ?? b.celebrationTier ?? 'minor',
    }
  })
  const map = new Map<string, JourneyBadge>(normalizedCurrent.map((b) => [b.name, b]))
  const newlyUnlocked: JourneyBadge[] = []

  const maybeUnlock = (name: string): void => {
    if (map.has(name)) return
    const def = BADGE_DEFINITION_MAP[name]
    if (!def) return
    const badge: JourneyBadge = {
      name: def.name,
      label: def.label,
      description: def.description,
      icon: def.icon,
      category: def.category,
      celebrationTier: def.celebrationTier,
      unlocked_at: new Date().toISOString(),
    }
    map.set(name, badge)
    newlyUnlocked.push(badge)
  }

  const completedTasks = counts.completedTasks ?? 0
  if (completedTasks >= 1) maybeUnlock('first_spark')

  const streak = profile?.current_streak ?? 0
  if (streak >= 7) maybeUnlock('one_week_strong')
  if (streak >= 14) maybeUnlock('two_weeks_strong')
  if (streak >= 21) maybeUnlock('three_weeks_strong')
  if (streak >= 30) maybeUnlock('one_month_strong')
  if (streak >= 60) maybeUnlock('two_months_strong')
  if (streak >= 90) maybeUnlock('quarter_of_greatness')

  if (counts.totalTasks >= 100) maybeUnlock('century_club')
  if (counts.totalTasks >= 500) maybeUnlock('execution_machine')
  if ((profile?.total_quick_wins ?? 0) >= 50) maybeUnlock('quick_win_master')
  if (counts.totalDecisions >= 50) maybeUnlock('decision_maker')
  if (counts.totalEvenings >= 30) maybeUnlock('evening_reflector')

  if (profile?.profile_completed_at) maybeUnlock('founder_story')
  if (profile?.has_seen_morning_tour) maybeUnlock('guided_founder')

  const patternsUnlocked =
    includesFeature(unlockedFeatures, 'energy_trends') &&
    includesFeature(unlockedFeatures, 'decision_style') &&
    includesFeature(unlockedFeatures, 'postponement_patterns') &&
    includesFeature(unlockedFeatures, 'recurring_question')
  if (patternsUnlocked) maybeUnlock('pattern_hunter')

  const rhythmUnlocked =
    includesFeature(unlockedFeatures, 'first_glimpse') &&
    includesFeature(unlockedFeatures, 'celebration_gap') &&
    includesFeature(unlockedFeatures, 'unseen_wins')
  if (rhythmUnlocked) maybeUnlock('rhythm_keeper')

  const fullArchetype =
    includesFeature(unlockedFeatures, 'founder_archetype_full') || archetypeStatus === 'full'
  if (fullArchetype) maybeUnlock('dna_discovered')

  const identity = normalizePersonalityToIdentityBadge(profile?.founder_personality)
  if (fullArchetype && identity) maybeUnlock(identity)

  if (behaviorReflection?.deepWorker) maybeUnlock('deep_worker')
  if (behaviorReflection?.strategicMind) maybeUnlock('strategic_mind')
  if (behaviorReflection?.tacticalPro) maybeUnlock('tactical_pro')
  if (behaviorReflection?.deepReflector) maybeUnlock('deep_reflector')
  if (behaviorReflection?.patternSeeker) maybeUnlock('pattern_seeker')
  if (behaviorReflection?.questionAsker) maybeUnlock('question_asker')
  if (behaviorReflection?.growthEdge) maybeUnlock('growth_edge')

  return {
    badges: Array.from(map.values()),
    newlyUnlocked,
  }
}

export async function checkAndPersistBadgeUnlocks(args: CheckBadgeUnlocksArgs): Promise<{
  badges: JourneyBadge[]
  newlyUnlocked: JourneyBadge[]
}> {
  const { db, userId, profile, counts, unlockedFeatures, archetypeStatus, behaviorReflection } = args
  const current = isBadgeArray(profile?.badges) ? profile!.badges : []
  const { badges: nextBadges, newlyUnlocked } = evaluateBadgeUnlocks({
    profile,
    counts,
    unlockedFeatures,
    archetypeStatus,
    behaviorReflection,
  })
  if (newlyUnlocked.length > 0 || nextBadges.length !== current.length) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated table update types resolve to never in this context
    await (db.from('user_profiles') as any).update({ badges: nextBadges }).eq('id', userId)
    for (const b of newlyUnlocked) {
      try {
        await insertUserUnlock(db, userId, b.name, 'badge', b.unlocked_at)
      } catch {
        // duplicate/rls-safe ignore
      }
    }
  }

  return { badges: nextBadges, newlyUnlocked }
}
