import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { syncRemindersToGoogleCalendar } from '@/lib/google-calendar'
import { getLogTimestamp } from '@/lib/server-log-timestamp'
import { persistUserProfileTimeZoneIfValid } from '@/lib/user-profile-timezone-persist'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST — create/update recurring morning, evening, and weekly events in Google Calendar.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json().catch(() => ({}))) as { timeZone?: string; timezone?: string }
    const tzFromBody = body.timeZone ?? body.timezone
    const db = getServerSupabase()
    await persistUserProfileTimeZoneIfValid(db, session.user.id, tzFromBody)

    const synced = await syncRemindersToGoogleCalendar(session.user.id, {
      requestTimeZone: typeof tzFromBody === 'string' ? tzFromBody : undefined,
    })
    if (!synced) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', code: 'not_connected' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, synced: true })
  } catch (e) {
    console.error(`${getLogTimestamp()} [api/user/google-calendar/sync]`, e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 }
    )
  }
}
