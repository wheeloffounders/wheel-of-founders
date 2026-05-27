import type { SupabaseClient } from '@supabase/supabase-js'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import {
  MONTHLY_INSIGHT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
  WEEKLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'

/**
 * Whether we should run insight AI generation (cron / repair).
 * Same bar as opening the insight page — not Pro. Narrative stays gated on read for free tier.
 */
export async function userHasWeeklyInsightGenerationUnlocked(
  userId: string,
  db: SupabaseClient,
): Promise<boolean> {
  const days = await getDaysWithEntries(userId, db)
  return days >= WEEKLY_INSIGHT_MIN_DAYS
}

export async function userHasMonthlyInsightGenerationUnlocked(
  userId: string,
  db: SupabaseClient,
): Promise<boolean> {
  const days = await getDaysWithEntries(userId, db)
  return days >= MONTHLY_INSIGHT_MIN_DAYS
}

export async function userHasQuarterlyInsightGenerationUnlocked(
  userId: string,
  db: SupabaseClient,
): Promise<boolean> {
  const days = await getDaysWithEntries(userId, db)
  return days >= QUARTERLY_INSIGHT_MIN_DAYS
}
