import type { SupabaseClient } from '@supabase/supabase-js'
import { getDaysWithEntries } from '@/lib/founder-dna/days-with-entries'
import { stripJourneyWeekSourcesForFreemium } from '@/lib/founder-dna/journey-week-entitlements'
import {
  buildJourneyWeekRecords,
  type JourneyWeekRecord,
  type JourneyWeekRecordSource,
} from '@/lib/founder-dna/journey-week-records'
import type { UserProfile } from '@/lib/features'

const PROFILE_SELECT =
  'tier, pro_features_enabled, subscription_override, subscription_tier, is_beta_retired, is_beta, trial_starts_at, trial_ends_at, stripe_subscription_status, created_at' as const

export function userProfileFromJourneyRow(row: Record<string, unknown> | null): UserProfile {
  return {
    tier: row?.tier as string | undefined,
    pro_features_enabled: row?.pro_features_enabled as boolean | undefined,
    subscription_override: (row?.subscription_override as string | null) ?? null,
    subscription_tier: (row?.subscription_tier as string | null) ?? null,
    is_beta_retired: (row?.is_beta_retired as boolean | null) ?? null,
    is_beta: (row?.is_beta as boolean | null) ?? null,
    trial_starts_at: (row?.trial_starts_at as string | null) ?? null,
    trial_ends_at: (row?.trial_ends_at as string | null) ?? null,
    stripe_subscription_status: (row?.stripe_subscription_status as string | null) ?? null,
    created_at: (row?.created_at as string | null) ?? null,
  }
}

export async function loadWeeklyInsightChapters(
  userId: string,
  db: SupabaseClient,
): Promise<{ weeks: JourneyWeekRecord[]; daysWithEntries: number }> {
  const [weeklyRes, historyRes, daysWithEntries, profileRes] = await Promise.all([
    (db.from('weekly_insights') as any)
      .select('week_start, week_end, insight_text')
      .eq('user_id', userId)
      .not('insight_text', 'is', null)
      .order('week_start', { ascending: false }),
    (db.from('insight_history') as any)
      .select('period_start, period_end, insight_text')
      .eq('user_id', userId)
      .eq('insight_type', 'weekly')
      .order('period_start', { ascending: false }),
    getDaysWithEntries(userId, db),
    db.from('user_profiles').select(PROFILE_SELECT).eq('id', userId).maybeSingle(),
  ])

  const profileUser = userProfileFromJourneyRow(
    (profileRes.data as Record<string, unknown> | null) ?? null,
  )

  const byWeek = new Map<string, JourneyWeekRecordSource>()

  for (const row of (weeklyRes.data ?? []) as {
    week_start?: string
    week_end?: string
    insight_text?: string | null
  }[]) {
    const weekStart = row.week_start?.slice(0, 10)
    if (!weekStart) continue
    byWeek.set(weekStart, {
      weekStart,
      weekEnd: row.week_end?.slice(0, 10) ?? weekStart,
      insightText: row.insight_text ?? null,
    })
  }

  for (const row of (historyRes.data ?? []) as {
    period_start?: string
    period_end?: string
    insight_text?: string | null
  }[]) {
    const weekStart = row.period_start?.slice(0, 10)
    if (!weekStart || byWeek.has(weekStart)) continue
    byWeek.set(weekStart, {
      weekStart,
      weekEnd: row.period_end?.slice(0, 10) ?? weekStart,
      insightText: row.insight_text ?? null,
    })
  }

  const sources = [...byWeek.values()].filter((s) => Boolean(s.insightText?.trim()))
  const weeks = buildJourneyWeekRecords(
    stripJourneyWeekSourcesForFreemium(sources, profileUser),
    daysWithEntries,
  )

  return { weeks, daysWithEntries }
}
