import { NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const session = await getServerSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    const today = format(new Date(), 'yyyy-MM-dd')

    const { data, error } = await db
      .from('morning_tasks')
      .select('id, description, completed, plan_date, task_order, action_plan')
      .eq('user_id', session.user.id)
      .eq('plan_date', today)
      .order('task_order', { ascending: true })

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
    }>

    const total = tasks.length
    const completedCount = tasks.filter((t) => t.completed === true).length
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return NextResponse.json({
      date: today,
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        completed: !!t.completed,
        completed_at: null,
        plan_date: t.plan_date,
        task_order: t.task_order ?? 0,
        action_plan: t.action_plan ?? null,
      })),
      progress,
    })
  } catch (err) {
    console.error('[tasks/today] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

