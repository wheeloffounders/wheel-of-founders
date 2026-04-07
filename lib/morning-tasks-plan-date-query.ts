import { addDaysToYmdInTz } from '@/lib/timezone'

/** PostgREST `.or()` filter: rows for this founder plan day, including tasks moved to the next day (undoable). */
export function morningTasksOrFilterForPlanDate(planDateYmd: string, userTimeZone: string): string {
  const tomorrowYmd = addDaysToYmdInTz(planDateYmd, 1, userTimeZone)
  return `plan_date.eq.${planDateYmd},and(postponed_from_plan_date.eq.${planDateYmd},plan_date.eq.${tomorrowYmd})`
}

export function isTaskShowingAsMovedToTomorrow(
  planDateYmd: string,
  userTimeZone: string,
  row: { plan_date: string; postponed_from_plan_date?: string | null }
): boolean {
  const tomorrowYmd = addDaysToYmdInTz(planDateYmd, 1, userTimeZone)
  return row.postponed_from_plan_date === planDateYmd && row.plan_date === tomorrowYmd
}
