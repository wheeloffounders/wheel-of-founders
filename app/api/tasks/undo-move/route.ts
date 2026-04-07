import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getPlanDateString } from '@/lib/effective-plan-date'
import { addDaysToYmdInTz, getUserTimezoneFromProfile } from '@/lib/timezone'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { taskId } = body as { taskId?: string }

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const { data: profile } = await db
      .from('user_profiles')
      .select('timezone')
      .eq('id', session.user.id)
      .maybeSingle()
    const userTimeZone = getUserTimezoneFromProfile((profile as { timezone?: string | null } | null) ?? null)
    const planDate = getPlanDateString(userTimeZone, new Date())
    const tomorrowYmd = addDaysToYmdInTz(planDate, 1, userTimeZone)
    const nowIso = new Date().toISOString()

    const { data: task, error: fetchErr } = await db
      .from('morning_tasks')
      .select('id, user_id, plan_date, postponed_from_plan_date, postpone_count, last_postponed_at')
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (fetchErr) {
      console.error('[tasks/undo-move] fetch error', fetchErr)
      return NextResponse.json({ error: 'Failed to load task' }, { status: 500 })
    }

    const typed = task as {
      id: string
      user_id: string
      plan_date: string
      postponed_from_plan_date?: string | null
      postpone_count?: number | null
      last_postponed_at?: string | null
    } | null

    if (!typed) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    let restoreDate: string | null = null
    if (typed.postponed_from_plan_date) {
      if (typed.postponed_from_plan_date !== planDate) {
        return NextResponse.json({ error: 'Undo is only available on the day you moved from' }, { status: 400 })
      }
      if (typed.plan_date !== tomorrowYmd) {
        return NextResponse.json({ error: 'Task is not in a pending move state' }, { status: 400 })
      }
      restoreDate = typed.postponed_from_plan_date
    } else if (typed.plan_date === tomorrowYmd) {
      restoreDate = planDate
    } else {
      return NextResponse.json({ error: 'Nothing to undo for this task' }, { status: 400 })
    }

    const prevCount = (typed.postpone_count as number | null) ?? 0
    const newCount = Math.max(0, prevCount - 1)

    const { error } = await db
      .from('morning_tasks')
      .update({
        plan_date: restoreDate,
        postponed_from_plan_date: null,
        postpone_count: newCount,
        last_postponed_at: newCount === 0 ? null : typed.last_postponed_at ?? null,
        updated_at: nowIso,
      })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('[tasks/undo-move] DB error', error)
      return NextResponse.json({ error: 'Failed to undo move' }, { status: 500 })
    }

    return NextResponse.json({ success: true, originalPlanDate: restoreDate })
  } catch (err) {
    console.error('[tasks/undo-move] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
