import { getPlanDateString } from '@/lib/effective-plan-date'
import { addDaysToYmdInTz, getUserTimezoneFromProfile } from '@/lib/timezone'

/**
 * Move incomplete morning tasks from tomorrow back to today when they were postponed from today.
 * Shared by POST /api/tasks/restore-tomorrow-to-today and emergency reopen.
 */
export async function restorePostponedTasksToTodayForUser(
  db: { from: (t: string) => any },
  userId: string
): Promise<{ restored: number; planDate: string }> {
  const { data: profile } = await db.from('user_profiles').select('timezone').eq('id', userId).maybeSingle()
  const userTimeZone = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)
  const planDate = getPlanDateString(userTimeZone, new Date())
  const tomorrowYmd = addDaysToYmdInTz(planDate, 1, userTimeZone)
  const nowIso = new Date().toISOString()

  const { data: rows, error: fetchError } = await db
    .from('morning_tasks')
    .select('id, plan_date, postponed_from_plan_date, postpone_count, last_postponed_at, completed')
    .eq('user_id', userId)
    .eq('plan_date', tomorrowYmd)
    .eq('postponed_from_plan_date', planDate)

  if (fetchError) {
    throw new Error(fetchError.message || 'Failed to load tasks')
  }

  const tasks = (rows ?? []) as Array<{
    id: string
    plan_date: string
    postponed_from_plan_date?: string | null
    postpone_count?: number | null
    last_postponed_at?: string | null
    completed?: boolean | null
  }>

  const incomplete = tasks.filter((t) => t.completed !== true)
  let restored = 0

  for (const typed of incomplete) {
    const prevCount = (typed.postpone_count as number | null) ?? 0
    const newCount = Math.max(0, prevCount - 1)

    const { error } = await db
      .from('morning_tasks')
      .update({
        plan_date: planDate,
        postponed_from_plan_date: null,
        postpone_count: newCount,
        last_postponed_at: newCount === 0 ? null : typed.last_postponed_at ?? null,
        updated_at: nowIso,
      })
      .eq('id', typed.id)
      .eq('user_id', userId)

    if (error) {
      throw new Error(error.message || 'Failed to restore tasks')
    }
    restored += 1
  }

  const { error: commitDelError } = await db
    .from('morning_plan_commits')
    .delete()
    .eq('user_id', userId)
    .eq('plan_date', planDate)

  if (commitDelError) {
    console.warn('[restorePostponedTasksToTodayForUser] morning_plan_commits delete', commitDelError.message)
  }

  return { restored, planDate }
}
