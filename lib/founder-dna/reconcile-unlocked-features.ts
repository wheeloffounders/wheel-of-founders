import { ARCHETYPE_FULL_MIN_DAYS, ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'
import {
  CELEBRATION_GAP_MIN_DAYS,
  DECISION_STYLE_MIN_DAYS,
  FIRST_GLIMPSE_MIN_EVENINGS,
  MONTHLY_INSIGHT_MIN_DAYS,
  POSTPONEMENT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  RECURRING_QUESTION_MIN_DAYS,
  SCHEDULE_ENERGY_MIN_DAYS,
  SCHEDULE_STORY_SO_FAR_DAY,
  SCHEDULE_UNSEEN_WINS_DAY,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import type { UnlockedFeatureJson } from '@/types/supabase'

/** Minimum days with entries required for each journey-stored feature unlock. */
const MIN_DAYS_WITH_ENTRIES: Partial<Record<string, number>> = {
  your_story_so_far: SCHEDULE_STORY_SO_FAR_DAY,
  weekly_insight: WEEKLY_INSIGHT_MIN_DAYS,
  monthly_insight: MONTHLY_INSIGHT_MIN_DAYS,
  quarterly_insight: QUARTERLY_INSIGHT_MIN_DAYS,
  energy_trends: SCHEDULE_ENERGY_MIN_DAYS,
  decision_style: DECISION_STYLE_MIN_DAYS,
  postponement_patterns: POSTPONEMENT_MIN_DAYS,
  celebration_gap: CELEBRATION_GAP_MIN_DAYS,
  unseen_wins: SCHEDULE_UNSEEN_WINS_DAY,
  recurring_question: RECURRING_QUESTION_MIN_DAYS,
  founder_archetype: ARCHETYPE_PREVIEW_MIN_DAYS,
  founder_archetype_full: ARCHETYPE_FULL_MIN_DAYS,
}

/**
 * Drops `user_profiles.unlocked_features` entries that no longer satisfy current rules.
 * Fixes legacy rows unlocked under old "calendar days active" logic.
 */
export function reconcileUnlockedFeaturesForActivity(
  features: UnlockedFeatureJson[],
  daysWithEntries: number,
  totalEvenings: number
): UnlockedFeatureJson[] {
  return features.filter((f) => {
    const name = f?.name
    if (!name) return true
    if (name === 'first_glimpse') {
      return totalEvenings >= FIRST_GLIMPSE_MIN_EVENINGS
    }
    const min = MIN_DAYS_WITH_ENTRIES[name]
    if (min === undefined) return true
    return daysWithEntries >= min
  })
}
