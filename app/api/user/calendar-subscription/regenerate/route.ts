import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { buildCalendarProviderLinks } from '@/lib/calendar/subscription-links'
import {
  calendarSubscriptionRequestOrigin,
  newCalendarSubscriptionToken,
} from '@/lib/calendar/calendar-subscription-server'
import {
  deactivateCalendarSubscriptionsForUser,
  upsertCalendarSubscriptionByToken,
} from '@/lib/analytics/calendar-subscription-tracking'
import { getLogTimestamp } from '@/lib/server-log-timestamp'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST — replace `user_profiles.calendar_token` with a new secret and return fresh subscribe links.
 * Old feed URLs stop working; users should remove the old subscription and add the new one.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = newCalendarSubscriptionToken()
    const db = getServerSupabase()
    await deactivateCalendarSubscriptionsForUser(db, session.user.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
    const { error } = await (db.from('user_profiles') as any)
      .update({ calendar_token: token, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    if (error) {
      console.error(`${getLogTimestamp()} [calendar-subscription/regenerate] update error`, error)
      return NextResponse.json({ error: 'Failed to update calendar token' }, { status: 500 })
    }

    const origin = calendarSubscriptionRequestOrigin(req)
    const links = buildCalendarProviderLinks(token, origin)
    await upsertCalendarSubscriptionByToken(db, {
      userId: session.user.id,
      token,
      source: 'issued',
    })

    return NextResponse.json({
      success: true,
      token,
      links,
      httpsUrl: links.feedUrl,
      webcalUrl: links.webcalUrl,
    })
  } catch (err) {
    console.error(`${getLogTimestamp()} [calendar-subscription/regenerate]`, err)
    return NextResponse.json({ error: 'Failed to regenerate calendar subscription' }, { status: 500 })
  }
}
