import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type CalendarType = 'google' | 'apple' | 'outlook' | 'other'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as { time?: string; type?: CalendarType }
    const time = body.time
    const type = body.type

    if (!time || !/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json({ error: 'Invalid time (expected HH:MM)' }, { status: 400 })
    }
    if (!type || !['google', 'apple', 'outlook', 'other'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    }

    const db = getServerSupabase()
    const { error } = await (db.from('user_profiles') as any)
      .update({
        calendar_reminder_time: `${time}:00`,
        calendar_reminder_type: type,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      console.error('[calendar-reminder] POST', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[calendar-reminder] POST', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServerSupabase()
    const { error } = await (db.from('user_profiles') as any)
      .update({
        calendar_reminder_time: null,
        calendar_reminder_type: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.user.id)

    if (error) {
      console.error('[calendar-reminder] DELETE', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[calendar-reminder] DELETE', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

