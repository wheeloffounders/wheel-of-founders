import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getPlanDateString } from '@/lib/effective-plan-date'
import { morningTasksOrFilterForPlanDate } from '@/lib/morning-tasks-plan-date-query'
import { addDaysToYmdInTz, getUserTimezoneFromProfile } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Move all incomplete morning tasks for the user's current plan day to tomorrow.
 * Used after committing an emergency containment plan ("Clear your path").
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase() as any
    const { data: profile } = await db
      .from('user_profiles')
      .select('timezone')
      .eq('id', session.user.id)
      .maybeSingle()
    const userTimeZone = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)

    const planDate = getPlanDateString(userTimeZone, new Date())
    const newDate = addDaysToYmdInTz(planDate, 1, userTimeZone)
    const taskDayFilter = morningTasksOrFilterForPlanDate(planDate, userTimeZone)
    const nowIso = new Date().toISOString()

    const { data: rows, error: fetchError } = await db
      .from('morning_tasks')
      .select(
        'id, user_id, description, plan_date, needle_mover, is_proactive, action_plan, postpone_count, first_planned_date, completed'
      )
      .eq('user_id', session.user.id)
      .or(taskDayFilter)

    if (fetchError) {
      console.error('[tasks/move-today-to-tomorrow] fetch', fetchError)
      return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
    }

    const tasks = (rows ?? []) as Array<{
      id: string
      user_id: string
      description: string
      plan_date: string
      needle_mover?: boolean | null
      is_proactive?: boolean | null
      action_plan?: string | null
      postpone_count?: number | null
      first_planned_date?: string | null
      completed?: boolean | null
    }>

    const incomplete = tasks.filter((t) => t.completed !== true)
    let moved = 0

    for (const typedTask of incomplete) {
      const originalDate = typedTask.plan_date

      const { error: postponeError } = await db.from('task_postponements').insert({
        user_id: session.user.id,
        task_id: typedTask.id,
        task_description: typedTask.description,
        action_plan: typedTask.action_plan ?? null,
        original_date: originalDate,
        moved_to_date: newDate,
        moved_at: nowIso,
        is_needle_mover: typedTask.needle_mover ?? false,
        is_proactive: typedTask.is_proactive ?? false,
      })
      if (postponeError) {
        console.warn('[tasks/move-today-to-tomorrow] postpone insert', postponeError.message)
      }

      const currentCount = (typedTask.postpone_count as number | null) ?? 0
      const firstPlanned = (typedTask.first_planned_date as string | null) ?? null

      const { error: updateError } = await db
        .from('morning_tasks')
        .update({
          plan_date: newDate,
          postponed_from_plan_date: originalDate,
          updated_at: nowIso,
          postpone_count: currentCount + 1,
          first_planned_date: firstPlanned ?? originalDate,
          last_postponed_at: nowIso,
        })
        .eq('id', typedTask.id)
        .eq('user_id', session.user.id)

      if (updateError) {
        console.error('[tasks/move-today-to-tomorrow] update', updateError)
        return NextResponse.json({ error: 'Failed to move one or more tasks' }, { status: 500 })
      }
      moved += 1
    }

    const { error: commitDelError } = await db
      .from('morning_plan_commits')
      .delete()
      .eq('user_id', session.user.id)
      .eq('plan_date', newDate)

    if (commitDelError) {
      console.warn('[tasks/move-today-to-tomorrow] morning_plan_commits delete', commitDelError.message)
    }

    return NextResponse.json({ success: true, moved, planDate, newDate })
  } catch (err) {
    console.error('[tasks/move-today-to-tomorrow]', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
