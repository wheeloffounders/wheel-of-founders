import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ProEntitlementProfile } from '@/lib/auth/is-pro'
import { isMissingEveningIsDraftColumnError } from '@/lib/supabase/evening-is-draft-column'

export type TrialWrapupStats = {
  firesCount: number
  /** Days in the trial window where morning was committed and evening review was submitted (same calendar day). */
  alignedDays: number
  /** Calendar days in the trial window (typically 7). */
  trialDayCount: number
  /** 0–100 */
  alignmentPct: number
}

function toYmd(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

/**
 * Inclusive calendar range for the Pro trial (first day with access through last full day before `trial_ends_at`).
 */
export function getTrialWindowYmdRange(profile: ProEntitlementProfile): {
  startYmd: string
  endYmd: string
  trialDayCount: number
} | null {
  const endRaw = profile.trial_ends_at
  if (!endRaw) return null
  const endMs = new Date(endRaw).getTime()
  if (Number.isNaN(endMs)) return null

  const lastProDay = addDays(new Date(endMs), -1)
  const endYmd = toYmd(lastProDay)

  let startYmd: string
  if (profile.trial_starts_at) {
    const s = new Date(profile.trial_starts_at).getTime()
    if (!Number.isNaN(s)) {
      startYmd = toYmd(new Date(s))
    } else {
      startYmd = toYmd(addDays(parseISO(endYmd), -6))
    }
  } else {
    startYmd = toYmd(addDays(parseISO(endYmd), -6))
  }

  if (startYmd > endYmd) {
    return { startYmd: endYmd, endYmd, trialDayCount: 1 }
  }

  const trialDayCount = differenceInCalendarDays(parseISO(endYmd), parseISO(startYmd)) + 1
  return { startYmd, endYmd, trialDayCount: Math.max(1, trialDayCount) }
}

/** When `trial_ends_at` is missing (e.g. dev simulate), use the last 7 calendar days ending yesterday. */
export function getFallbackTrialWindowYmd(now: Date = new Date()): {
  startYmd: string
  endYmd: string
  trialDayCount: number
} {
  const endYmd = toYmd(addDays(now, -1))
  const startYmd = toYmd(addDays(parseISO(endYmd), -6))
  return { startYmd, endYmd, trialDayCount: 7 }
}

export async function fetchTrialWrapupStats(
  userId: string,
  db: SupabaseClient,
  profile: ProEntitlementProfile
): Promise<TrialWrapupStats> {
  const range = getTrialWindowYmdRange(profile) ?? getFallbackTrialWindowYmd()
  const { startYmd, endYmd, trialDayCount } = range

  const [firesRes, commitsRes, eveningFirst] = await Promise.all([
    db
      .from('emergencies')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('fire_date', startYmd)
      .lte('fire_date', endYmd),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated types may lag
    (db.from('morning_plan_commits') as any)
      .select('plan_date')
      .eq('user_id', userId)
      .gte('plan_date', startYmd)
      .lte('plan_date', endYmd),
    db
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .eq('is_draft', false)
      .gte('review_date', startYmd)
      .lte('review_date', endYmd),
  ])

  let eveningRes = eveningFirst
  if (eveningRes.error && isMissingEveningIsDraftColumnError(eveningRes.error)) {
    eveningRes = await db
      .from('evening_reviews')
      .select('review_date')
      .eq('user_id', userId)
      .gte('review_date', startYmd)
      .lte('review_date', endYmd)
  }

  if (firesRes.error) throw firesRes.error
  if (commitsRes.error) throw commitsRes.error
  if (eveningRes.error) throw eveningRes.error

  const firesCount = typeof firesRes.count === 'number' ? firesRes.count : 0

  const commitDates = new Set<string>()
  for (const row of (commitsRes.data ?? []) as Array<{ plan_date?: string | null }>) {
    const d = typeof row.plan_date === 'string' ? row.plan_date.slice(0, 10) : null
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) commitDates.add(d)
  }

  const eveningDates = new Set<string>()
  for (const row of (eveningRes.data ?? []) as Array<{ review_date?: string | null }>) {
    const d = typeof row.review_date === 'string' ? row.review_date.slice(0, 10) : null
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) eveningDates.add(d)
  }

  let alignedDays = 0
  for (const d of commitDates) {
    if (eveningDates.has(d)) alignedDays += 1
  }

  const alignmentPct = Math.min(100, Math.round((alignedDays / Math.max(1, trialDayCount)) * 100))

  return {
    firesCount,
    alignedDays,
    trialDayCount,
    alignmentPct,
  }
}
