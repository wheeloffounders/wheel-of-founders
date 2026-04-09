import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { getLogTimestamp } from '@/lib/server-log-timestamp'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
    const { data } = await (db.from('google_calendar_tokens') as any)
      .select('connected_at, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()
    return NextResponse.json({
      connected: !!data,
      connectedAt: (data as { connected_at?: string } | null)?.connected_at ?? null,
    })
  } catch (e) {
    console.error('[user/google-calendar] GET', e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
    const { error } = await (db.from('google_calendar_tokens') as any)
      .delete()
      .eq('user_id', session.user.id)
    if (error) {
      console.error(`${getLogTimestamp()} [user/google-calendar] DELETE`, error)
      return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error(`${getLogTimestamp()} [user/google-calendar] DELETE`, e)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
