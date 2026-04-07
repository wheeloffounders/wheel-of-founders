import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { restorePostponedTasksToTodayForUser } from '@/lib/tasks/restore-postponed-tasks-to-today'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST: Reopen a resolved emergency — restore postponed tasks to today and mark fire active again.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      emergencyId?: string
      reason?: 'flare' | 'tweak'
    }
    const emergencyId = typeof body.emergencyId === 'string' ? body.emergencyId : ''
    if (!emergencyId) {
      return NextResponse.json({ error: 'emergencyId required' }, { status: 400 })
    }

    const db = getServerSupabase() as any

    const { data: row, error: fetchErr } = await db
      .from('emergencies')
      .select('id, user_id, resolved')
      .eq('id', emergencyId)
      .maybeSingle()

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Emergency not found' }, { status: 404 })
    }
    if (row.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!row.resolved) {
      return NextResponse.json({ error: 'Emergency is not resolved' }, { status: 400 })
    }

    let restored = 0
    try {
      const r = await restorePostponedTasksToTodayForUser(db, session.user.id)
      restored = r.restored
    } catch (e) {
      console.error('[emergency/reopen] restore tasks', e)
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not restore tasks' }, { status: 500 })
    }

    const now = new Date().toISOString()
    const { error: upErr } = await db
      .from('emergencies')
      .update({
        resolved: false,
        severity: 'hot',
        updated_at: now,
      })
      .eq('id', emergencyId)
      .eq('user_id', session.user.id)

    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      restored,
      reason: body.reason ?? 'flare',
    })
  } catch (err) {
    console.error('[emergency/reopen]', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
