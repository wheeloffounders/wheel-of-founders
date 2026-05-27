import type { SupabaseClient } from '@supabase/supabase-js'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { WEEKLY_INSIGHT_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

/**
 * Whether we should run weekly insight AI generation (cron / repair).
 * Same bar as opening `/weekly` — not Pro. Narrative stays gated on read for free tier.
 */
export async function userHasWeeklyInsightGenerationUnlocked(
  userId: string,
  db: SupabaseClient,
): Promise<boolean> {
  const days = await getDaysWithEntries(userId, db)
  return days >= WEEKLY_INSIGHT_MIN_DAYS
}
