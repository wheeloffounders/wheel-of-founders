import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'
import { USER_ACTIVITY_PRESENCE_PERMIT_CLAIM } from '@/lib/user-activity-types'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = new Set<string>([USER_ACTIVITY_PRESENCE_PERMIT_CLAIM])

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as {
      activity_type?: string
      metadata?: Record<string, unknown> | null
    }
    const activityType = typeof body.activity_type === 'string' ? body.activity_type.trim() : ''
    if (!activityType || !ALLOWED_TYPES.has(activityType)) {
      return NextResponse.json({ error: 'Invalid activity_type' }, { status: 400 })
    }

    const db = serverSupabase()
    const { error } = await (db.from('user_activities') as any).insert({
      user_id: session.user.id,
      activity_type: activityType,
      metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : null,
    })

    if (error) {
      console.error('[user/activity] insert failed', error)
      return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[user/activity]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
