import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { restorePostponedTasksToTodayForUser } from '@/lib/tasks/restore-postponed-tasks-to-today'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Move tasks from tomorrow back to today when they were postponed from today (inverse of move-today-to-tomorrow).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase() as any
    const { restored, planDate } = await restorePostponedTasksToTodayForUser(db, session.user.id)
    return NextResponse.json({ success: true, restored, planDate })
  } catch (err) {
    console.error('[tasks/restore-tomorrow-to-today]', err)
    const msg = err instanceof Error ? err.message : 'Unexpected error'
    if (msg.includes('Failed to load')) {
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
