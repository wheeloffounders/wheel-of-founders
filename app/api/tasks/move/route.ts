import { NextRequest, NextResponse } from 'next/server'
import { format, addDays } from 'date-fns'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { taskId, targetDate } = body as { taskId?: string; targetDate?: string }

    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const db = getServerSupabase() as any

    let newDate: string
    if (!targetDate || targetDate === 'tomorrow') {
      newDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
    } else {
      newDate = targetDate
    }

    const now = new Date()
    const nowIso = now.toISOString()

    // Fetch current task to capture original date and context
    const { data: task, error: taskError } = await db
      .from('morning_tasks')
      .select('id, user_id, description, plan_date, needle_mover, is_proactive, action_plan, postpone_count, first_planned_date')
      .eq('id', taskId)
      .maybeSingle()

    if (taskError) {
      console.error('[tasks/move] fetch task error', taskError)
      return NextResponse.json({ error: 'Failed to load task' }, { status: 500 })
    }

    const typedTask = task as {
      id: string
      user_id: string
      description: string
      plan_date: string
      needle_mover?: boolean | null
      is_proactive?: boolean | null
      action_plan?: string | null
      postpone_count?: number | null
      first_planned_date?: string | null
    } | null

    if (!typedTask || typedTask.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const originalDate = typedTask.plan_date as string

    // Insert postponement record
    const { error: postponeError } = await db
      .from('task_postponements')
      .insert({
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
      console.error('[tasks/move] postpone insert error', postponeError)
      // we still proceed with move, but report softer error
    }

    const currentCount = (typedTask.postpone_count as number | null) ?? 0
    const firstPlanned = (typedTask.first_planned_date as string | null) ?? null

    const { error } = await db
      .from('morning_tasks')
      .update({
        plan_date: newDate,
        updated_at: nowIso,
        postpone_count: currentCount + 1,
        first_planned_date: firstPlanned ?? originalDate,
        last_postponed_at: nowIso,
      })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('[tasks/move] DB error', error)
      return NextResponse.json({ error: 'Failed to move task' }, { status: 500 })
    }

    return NextResponse.json({ success: true, newPlanDate: newDate })
  } catch (err) {
    console.error('[tasks/move] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

