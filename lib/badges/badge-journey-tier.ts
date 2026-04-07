/**
 * Visual “stage” for Journey badge gallery: Rhythm (1–7d feel), Pattern (8–21), DNA (22+).
 * Used for tiered styling only — unlock rules stay in server logic.
 */
export type JourneyVisualTier = 1 | 2 | 3

export const JOURNEY_TIER_LABELS: Record<JourneyVisualTier, { title: string; subtitle: string }> = {
  1: {
    title: 'The Rhythm',
    subtitle: 'Days 1–7 · Bronze',
  },
  2: {
    title: 'The Pattern',
    subtitle: 'Days 8–21 · Silver',
  },
  3: {
    title: 'The DNA',
    subtitle: 'Days 22+ · Gold',
  },
}

/** Badge name → tier. Omitted names default to tier 2. */
export const BADGE_JOURNEY_TIER: Record<string, JourneyVisualTier> = {
  // Milestones — streak ladder
  first_spark: 1,
  one_week_strong: 1,
  two_weeks_strong: 2,
  three_weeks_strong: 2,
  one_month_strong: 3,
  two_months_strong: 3,
  quarter_of_greatness: 3,
  century_club: 3,
  execution_machine: 3,
  decision_maker: 2,
  evening_reflector: 2,
  // Discovery
  founder_story: 1,
  guided_founder: 1,
  pattern_hunter: 2,
  rhythm_keeper: 2,
  dna_discovered: 3,
  // Identity
  visionary: 3,
  builder: 3,
  hustler: 3,
  strategist: 3,
  hybrid: 3,
  // Behavior
  deep_worker: 3,
  quick_win_master: 2,
  strategic_mind: 3,
  tactical_pro: 3,
  // Reflection
  deep_reflector: 2,
  pattern_seeker: 2,
  question_asker: 2,
  growth_edge: 2,
}

export function getBadgeJourneyTier(badgeName: string): JourneyVisualTier {
  return BADGE_JOURNEY_TIER[badgeName] ?? 2
}
