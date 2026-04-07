import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getPlanDateString } from '@/lib/effective-plan-date'
import { morningTasksOrFilterForPlanDate, isTaskShowingAsMovedToTomorrow } from '@/lib/morning-tasks-plan-date-query'
import { getUserTimezoneFromProfile } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const { data: profile } = await db
      .from('user_profiles')
      .select('timezone')
      .eq('id', session.user.id)
      .maybeSingle()
    const userTimeZone = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)
    const planDate = getPlanDateString(userTimeZone, new Date())
    const taskDayFilter = morningTasksOrFilterForPlanDate(planDate, userTimeZone)

    const [{ data, error }, { data: commitData }] = await Promise.all([
      db
        .from('morning_tasks')
        .select('id, description, completed, plan_date, task_order, action_plan, postponed_from_plan_date')
        .eq('user_id', session.user.id)
        .or(taskDayFilter)
        .order('task_order', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- column added by migration and may lag generated types
      (db.from('morning_plan_commits') as any)
        .select('original_task_count')
        .eq('user_id', session.user.id)
        .eq('plan_date', planDate)
        .maybeSingle(),
    ])

    if (error) {
      console.error('[tasks/today] DB error', error)
      return NextResponse.json(
        { error: error.message || 'Failed to load tasks' },
        { status: 500 }
      )
    }

    const tasks = (data ?? []) as Array<{
      id: string
      description: string
      completed?: boolean | null
      plan_date: string
      task_order?: number | null
      action_plan?: string | null
      postponed_from_plan_date?: string | null
    }>

    const commit = (commitData as { original_task_count?: number | null } | null) ?? null
    const total = Number.isFinite(commit?.original_task_count)
      ? Math.max(0, Number(commit?.original_task_count))
      : tasks.length
    const completedCount = tasks.filter((t) => t.completed === true).length
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return NextResponse.json({
      date: planDate,
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        completed: !!t.completed,
        completed_at: null,
        plan_date: t.plan_date,
        task_order: t.task_order ?? 0,
        action_plan: t.action_plan ?? null,
        movedToTomorrow: isTaskShowingAsMovedToTomorrow(planDate, userTimeZone, t),
      })),
      progress,
      original_total_count: total,
      completed_count: completedCount,
      ...(process.env.NODE_ENV === 'development'
        ? {
            debug: {
              userTimeZone,
              planDateUsed: planDate,
              serverTime: new Date().toISOString(),
              effectiveDateComputed: planDate,
              tasksCount: tasks.length,
              rawPlanDate: planDate,
            },
          }
        : {}),
    })
  } catch (err) {
    console.error('[tasks/today] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

