import { addDaysToYmdInTz, getUserTimezoneFromProfile } from '@/lib/timezone'

export type EveningEmergencyContext = {
  /** Fires on this calendar day that are resolved (for Mrs. Deer prompt). */
  resolvedToday: Array<{ description: string; severity: string }>
  /** Any emergency logged this day (for analytics / had_emergency). */
  hadAnyFireToday: boolean
  /** Total emergencies logged this founder-day (for loop-close / synthesis). */
  totalFiresToday: number
  /** Hot fires still unresolved (for strategic shift messaging). */
  hotUnresolvedCount: number
  /** Incomplete tasks parked on tomorrow that were postponed from this plan date (fire “debt”). */
  tomorrowTaskDebtCount: number
}

/**
 * Emergency-aware context for evening reflection + post_evening AI.
 * `reviewDateYmd` is the founder-day date (matches `evening_reviews.review_date` / `emergencies.fire_date`).
 */
export async function getEveningEmergencyContextForDate(
  db: { from: (t: string) => any },
  userId: string,
  reviewDateYmd: string
): Promise<EveningEmergencyContext> {
  const { data: profile } = await db.from('user_profiles').select('timezone').eq('id', userId).maybeSingle()
  const tz = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)
  const planDate = reviewDateYmd
  const tomorrowYmd = addDaysToYmdInTz(planDate, 1, tz)

  const { data: emRows } = await db
    .from('emergencies')
    .select('description, severity, resolved')
    .eq('user_id', userId)
    .eq('fire_date', planDate)

  const list = (emRows ?? []) as Array<{ description: string; severity: string; resolved: boolean }>
  const resolvedToday = list.filter((e) => e.resolved).map((e) => ({ description: e.description, severity: e.severity }))
  const hadAnyFireToday = list.length > 0
  const totalFiresToday = list.length
  const hotUnresolvedCount = list.filter((e) => e.severity === 'hot' && !e.resolved).length

  const { data: taskRows } = await db
    .from('morning_tasks')
    .select('id, completed')
    .eq('user_id', userId)
    .eq('plan_date', tomorrowYmd)
    .eq('postponed_from_plan_date', planDate)

  const tasks = (taskRows ?? []) as Array<{ completed?: boolean | null }>
  const tomorrowTaskDebtCount = tasks.filter((t) => t.completed !== true).length

  return {
    resolvedToday,
    hadAnyFireToday,
    totalFiresToday,
    hotUnresolvedCount,
    tomorrowTaskDebtCount,
  }
}
