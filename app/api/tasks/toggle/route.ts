import { NextRequest, NextResponse } from 'next/server'
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
    const { taskId, completed } = body as { taskId?: string; completed?: boolean }

    if (!taskId || typeof completed !== 'boolean') {
      return NextResponse.json({ error: 'taskId and completed are required' }, { status: 400 })
    }

    const db = getServerSupabase() as any
    const nowIso = new Date().toISOString()

    const updates: Record<string, unknown> = {
      completed,
      updated_at: nowIso,
    }

    const { data, error } = await db
      .from('morning_tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('user_id', session.user.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[tasks/toggle] DB error', error)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, task: data })
  } catch (err) {
    console.error('[tasks/toggle] Error', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}

