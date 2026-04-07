import type { SupabaseClient } from '@supabase/supabase-js'
import { getFeatureAccess } from '@/lib/features'
import { fetchCompletedQuarterlyInsightKeys } from '@/lib/quarterly-insight/completed-check'
import {
  getPreviousQuarterRangeYmdInTimeZone,
  getUserTimezoneFromProfile,
  isUserLocalQuarterStartCalendarDay,
} from '@/lib/timezone'

export type QuarterlyInsightEligibleProfile = {
  id: string
  tier?: string
  pro_features_enabled?: boolean
  timezone: string
}

/**
 * Quarterly cron: do not skip on Monday 00 local (weekly window) so quarter-start Mondays still run.
 */
export async function getEligibleUsersForQuarterlyInsightCron(
  db: SupabaseClient,
  now: Date
): Promise<QuarterlyInsightEligibleProfile[]> {
  const ninetyDaysAgo = new Date(now)
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10)

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

  const eligible: QuarterlyInsightEligibleProfile[] = []
  type Pending = (typeof rows)[number] & { quarterStart: string }
  const pending: Pending[] = []

  for (const p of rows) {
    const tz = getUserTimezoneFromProfile(p)
    const testBypass = Boolean(p.is_test_user)
    const hasFeature = getFeatureAccess({
      tier: p.tier,
      pro_features_enabled: p.pro_features_enabled,
    }).personalMonthlyInsight
    if (!hasFeature) continue

    if (testBypass) {
      eligible.push({
        id: p.id,
        tier: p.tier,
        pro_features_enabled: p.pro_features_enabled,
        timezone: tz,
      })
      continue
    }

    if (!isUserLocalQuarterStartCalendarDay(now, tz)) continue
    const range = getPreviousQuarterRangeYmdInTimeZone(now, tz)
    if (!range) continue
    pending.push({ ...p, quarterStart: range.quarterStart })
  }

  const completedKeys = await fetchCompletedQuarterlyInsightKeys(
    db,
    pending.map((p) => ({ userId: p.id, quarterStart: p.quarterStart }))
  )

  for (const p of pending) {
    if (completedKeys.has(`${p.id}\t${p.quarterStart}`)) continue
    eligible.push({
      id: p.id,
      tier: p.tier,
      pro_features_enabled: p.pro_features_enabled,
      timezone: getUserTimezoneFromProfile(p),
    })
  }

  eligible.sort((a, b) => a.id.localeCompare(b.id))
  return eligible
}
