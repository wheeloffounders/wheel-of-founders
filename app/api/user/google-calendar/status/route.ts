import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET — connection status and metadata for Google Calendar integration.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
    const { data } = await (db.from('google_calendar_tokens') as any)
      .select('calendar_id, connected_at, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const row = data as {
      calendar_id?: string | null
      connected_at?: string | null
      updated_at?: string | null
    } | null

    if (!row) {
      return NextResponse.json({
        connected: false,
        calendarId: null,
        connectedAt: null,
        lastSynced: null,
      })
    }

    return NextResponse.json({
      connected: true,
      calendarId: row.calendar_id ?? 'primary',
      connectedAt: row.connected_at ?? null,
      lastSynced: row.updated_at ?? null,
    })
  } catch (e) {
    console.error('[api/user/google-calendar/status]', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
