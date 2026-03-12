import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { getServerSession } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Undo move: for this dashboard widget we only ever move tasks from \"today\" to \"tomorrow\",
 * so undo simply restores plan_date back to today for the given task.
 */
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
    const today = format(new Date(), 'yyyy-MM-dd')
    const nowIso = new Date().toISOString()

    const { error } = await db
      .from('morning_tasks')
      .update({ plan_date: today, updated_at: nowIso })
      .eq('id', taskId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('[tasks/undo-move] DB error', error)
      return NextResponse.json({ error: 'Failed to undo move' }, { status: 500 })
    }

    return NextResponse.json({ success: true, originalPlanDate: today })
  } catch (err) {
    console.error('[tasks/undo-move] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

