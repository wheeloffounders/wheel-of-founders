import { NextRequest, NextResponse } from 'next/server'
import { formatInTimeZone } from 'date-fns-tz'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { calendarDaysBetweenInTimeZone, getLocalDayOfWeekSun0 } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

/**
 * GET ?lastAt=ISO&tz=IANA — calendar days from lastAt→now and weekday in tz.
 * Enable with DEBUG_CALENDAR_DAYS_API=1 (or non-production) for preview diagnostics.
 */
export async function GET(req: NextRequest) {
  const enabled =
    process.env.DEBUG_CALENDAR_DAYS_API === '1' || process.env.NODE_ENV !== 'production'
  if (!enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const session = await getServerSessionFromRequest(req)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const lastIso = searchParams.get('lastAt')
  const tz = searchParams.get('tz')?.trim() || 'UTC'
  if (!lastIso) {
    return NextResponse.json(
      { error: 'Query lastAt required (ISO 8601), optional tz (IANA, default UTC)' },
      { status: 400 }
    )
  }

  const lastAt = new Date(lastIso)
  const now = new Date()
  if (Number.isNaN(lastAt.getTime())) {
    return NextResponse.json({ error: 'invalid lastAt' }, { status: 400 })
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz })
  } catch {
    return NextResponse.json({ error: 'invalid tz' }, { status: 400 })
  }

  const calendarDaysSince = calendarDaysBetweenInTimeZone(lastAt, now, tz)
  const todayDow = getLocalDayOfWeekSun0(now, tz)

  return NextResponse.json({
    lastAt: lastAt.toISOString(),
    now: now.toISOString(),
    tz,
    lastYmd: formatInTimeZone(lastAt, tz, 'yyyy-MM-dd'),
    todayYmd: formatInTimeZone(now, tz, 'yyyy-MM-dd'),
    calendarDaysSince,
    todayLocalWeekdaySun0: todayDow,
    note: 'Sun=0 … Wed=3 (Patterns). Compare to MIN_DAYS_BETWEEN_FEATURE_REFRESH (7).',
  })
}
