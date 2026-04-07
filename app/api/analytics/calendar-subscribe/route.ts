import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import {
  upsertCalendarSubscriptionByToken,
  type CalendarSubscriptionSource,
} from '@/lib/analytics/calendar-subscription-tracking'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED: CalendarSubscriptionSource[] = ['google', 'apple', 'outlook', 'webcal']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { source?: string }
    const raw = String(body.source || '').toLowerCase()
    if (!ALLOWED.includes(raw as CalendarSubscriptionSource)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    const source = raw as CalendarSubscriptionSource

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (db.from('user_profiles') as any)
      .select('calendar_token')
      .eq('id', session.user.id)
      .maybeSingle()

    const token = String((profile as { calendar_token?: string | null } | null)?.calendar_token || '').trim()
    if (!token) {
      return NextResponse.json({ error: 'No calendar token yet; open calendar setup first.' }, { status: 400 })
    }

    await upsertCalendarSubscriptionByToken(db, {
      userId: session.user.id,
      token,
      source,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[analytics/calendar-subscribe]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
