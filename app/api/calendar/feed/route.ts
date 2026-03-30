import { NextRequest, NextResponse } from 'next/server'
import { getAppPublicOrigin } from '@/lib/app-public-url'
import { getServerSupabase } from '@/lib/server-supabase'
import { buildCalendarIcs } from '@/lib/calendar/ics-generator'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const APP_ORIGIN = getAppPublicOrigin()

type FeedBuildResult =
  | { ok: true; ics: string; userId: string; eventCount: number; timezone: string }
  | { ok: false; response: NextResponse }

async function buildFeedResult(req: NextRequest): Promise<FeedBuildResult> {
  const token = req.nextUrl.searchParams.get('token')
  if (!token?.trim()) {
    return { ok: false, response: NextResponse.json({ error: 'Missing token' }, { status: 401 }) }
  }

  const db = getServerSupabase()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom user profile columns
  const { data: profile } = await (db.from('user_profiles') as any)
    .select('id, preferred_name, name, timezone')
    .eq('calendar_token', token.trim())
    .maybeSingle()

  const row = (profile as {
    id?: string
    preferred_name?: string | null
    name?: string | null
    timezone?: string | null
  } | null) ?? null

  if (!row?.id) {
    return { ok: false, response: NextResponse.json({ error: 'Invalid token' }, { status: 404 }) }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag notification settings columns
  const { data: settings } = await (db.from('user_notification_settings') as any)
    .select('morning_enabled, morning_time, evening_enabled, evening_time, weekly_insights_enabled')
    .eq('user_id', row.id)
    .maybeSingle()

  const s = (settings as {
    morning_enabled?: boolean | null
    morning_time?: string | null
    evening_enabled?: boolean | null
    evening_time?: string | null
    weekly_insights_enabled?: boolean | null
  } | null) ?? null

  const rawTz = typeof row.timezone === 'string' ? row.timezone.trim() : ''
  const timezone = rawTz.length > 0 ? rawTz : 'UTC'
  const events: Array<{
    uid: string
    title: string
    description: string
    url: string
    localHour: number
    localMinute: number
    rrule: string
  }> = []

  const parseHourMin = (v: string | null | undefined, fallback: [number, number]): [number, number] => {
    const raw = String(v || '')
    const parts = raw.split(':')
    const h = Number(parts[0])
    const m = Number(parts[1])
    if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback
    return [Math.max(0, Math.min(23, h)), Math.max(0, Math.min(59, m))]
  }

  if ((s?.morning_enabled ?? true) === true) {
    const [h, m] = parseHourMin(s?.morning_time, [9, 0])
    events.push({
      uid: `${row.id}-morning@wheeloffounders.com`,
      title: 'Morning Plan with Mrs. Deer',
      description: 'Set your top priorities and start the day with clarity.',
      url: `${APP_ORIGIN}/morning`,
      localHour: h,
      localMinute: m,
      rrule: 'FREQ=DAILY',
    })
  }

  if ((s?.evening_enabled ?? true) === true) {
    const [h, m] = parseHourMin(s?.evening_time, [20, 0])
    events.push({
      uid: `${row.id}-evening@wheeloffounders.com`,
      title: 'Evening Reflection with Mrs. Deer',
      description: 'Close your daily loop and capture wins, lessons, and patterns.',
      url: `${APP_ORIGIN}/evening`,
      localHour: h,
      localMinute: m,
      rrule: 'FREQ=DAILY',
    })
  }

  if ((s?.weekly_insights_enabled ?? true) === true) {
    events.push({
      uid: `${row.id}-weekly@wheeloffounders.com`,
      title: 'Weekly Insight Ready',
      description: 'Your weekly founder insight is available.',
      url: `${APP_ORIGIN}/weekly`,
      localHour: 9,
      localMinute: 0,
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    })
  }

  const calName = `${row.preferred_name || row.name || 'Founder'} • Wheel of Founders`
  const ics = buildCalendarIcs({
    timeZone: timezone,
    calendarName: calName,
    events,
    includeVtimezone: true,
  })

  console.info('[calendar/feed] built', {
    userId: row.id,
    eventCount: events.length,
    timezone,
    tokenPrefix: token.trim().slice(0, 6),
  })

  return { ok: true, ics, userId: row.id, eventCount: events.length, timezone }
}

const feedHeaders = {
  'Content-Type': 'text/calendar; charset=utf-8',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
}

export async function GET(req: NextRequest) {
  try {
    const r = await buildFeedResult(req)
    if (!r.ok) return r.response
    return new NextResponse(r.ics, { status: 200, headers: feedHeaders })
  } catch (err) {
    console.error('[calendar/feed] error', err)
    return NextResponse.json({ error: 'Failed to build feed' }, { status: 500 })
  }
}

export async function HEAD(req: NextRequest) {
  try {
    const r = await buildFeedResult(req)
    if (!r.ok) {
      return new NextResponse(null, { status: r.response.status, headers: r.response.headers })
    }
    return new NextResponse(null, {
      status: 200,
      headers: {
        ...feedHeaders,
        'X-WOF-Calendar-Events': String(r.eventCount),
        'X-WOF-Calendar-Timezone': r.timezone,
      },
    })
  } catch (err) {
    console.error('[calendar/feed] HEAD error', err)
    return new NextResponse(null, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
