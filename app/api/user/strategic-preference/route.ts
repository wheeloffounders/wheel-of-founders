import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'
import { normalizeTaskTitleKey } from '@/lib/morning/task-title-similarity'

export const dynamic = 'force-dynamic'

const MAX_TITLE = 500
const MAX_PREF = 4000

/**
 * POST { taskTitle: string, preferenceText: string }
 * Upserts one row per (user, normalized task title) for Pro strategic memory.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      taskTitle?: string
      preferenceText?: string
    }
    const taskTitle = typeof body.taskTitle === 'string' ? body.taskTitle.trim().slice(0, MAX_TITLE) : ''
    const preferenceText =
      typeof body.preferenceText === 'string' ? body.preferenceText.trim().slice(0, MAX_PREF) : ''

    if (!taskTitle || taskTitle.length < 3) {
      return NextResponse.json({ error: 'taskTitle required' }, { status: 400 })
    }
    if (!preferenceText || preferenceText.length < 12) {
      return NextResponse.json({ error: 'preferenceText too short' }, { status: 400 })
    }

    const normalized = normalizeTaskTitleKey(taskTitle)
    if (!normalized) {
      return NextResponse.json({ error: 'Invalid task title' }, { status: 400 })
    }

    const db = serverSupabase()
    const now = new Date().toISOString()
    const { error } = await (db.from('user_strategic_preferences') as any).upsert(
      {
        user_id: session.user.id,
        task_title_normalized: normalized,
        task_title_snapshot: taskTitle,
        preference_text: preferenceText,
        updated_at: now,
      },
      { onConflict: 'user_id,task_title_normalized' }
    )

    if (error) {
      console.error('[strategic-preference]', error)
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[strategic-preference]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
