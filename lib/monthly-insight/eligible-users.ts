import type { SupabaseClient } from '@supabase/supabase-js'
import { getFeatureAccess } from '@/lib/features'
import { getUserTimezoneFromProfile, shouldRunMonthlyInsightForUser, shouldRunQuarterlyInsightForUser, shouldRunWeeklyInsightForUser } from '@/lib/timezone'

export type MonthlyInsightEligibleProfile = {
  id: string
  tier?: string
  pro_features_enabled?: boolean
  timezone: string
}

/** Monthly-only cron: same exclusions as legacy route (no weekly or quarter-start window overlap). */
export async function getEligibleUsersForMonthlyInsightCron(
  db: SupabaseClient,
  now: Date
): Promise<MonthlyInsightEligibleProfile[]> {
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10)

  const { data: reviewUsers } = await db
    .from('evening_reviews')
    .select('user_id')
    .gte('review_date', cutoff)
  const { data: taskUsers } = await db
    .from('morning_tasks')
    .select('user_id')
    .gte('plan_date', cutoff)

  const activeIds = new Set<string>()
  for (const r of reviewUsers ?? []) {
    const id = (r as { user_id?: string }).user_id
    if (id) activeIds.add(id)
  }
  for (const t of taskUsers ?? []) {
    const id = (t as { user_id?: string }).user_id
    if (id) activeIds.add(id)
  }

  if (activeIds.size === 0) return []

  const { data: profiles } = await db
    .from('user_profiles')
    .select('id, tier, pro_features_enabled, timezone, is_test_user')
    .in('id', Array.from(activeIds))

  const rows = (profiles ?? []) as {
    id: string
    tier?: string
    pro_features_enabled?: boolean
    timezone?: string | null
    is_test_user?: boolean | null
  }[]

  const eligible: MonthlyInsightEligibleProfile[] = []
  for (const p of rows) {
    const tz = getUserTimezoneFromProfile(p)
    const testBypass = Boolean(p.is_test_user)
    if (!testBypass) {
      if (shouldRunWeeklyInsightForUser(now, tz)) continue
      if (shouldRunQuarterlyInsightForUser(now, tz)) continue
    }
    const inMonthlyWindow = testBypass || shouldRunMonthlyInsightForUser(now, tz)
    if (
      getFeatureAccess({ tier: p.tier, pro_features_enabled: p.pro_features_enabled }).personalMonthlyInsight &&
      inMonthlyWindow
    ) {
      eligible.push({
        id: p.id,
        tier: p.tier,
        pro_features_enabled: p.pro_features_enabled,
        timezone: tz,
      })
    }
  }

  eligible.sort((a, b) => a.id.localeCompare(b.id))
  return eligible
}
