import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { buildCalendarProviderLinks } from '@/lib/calendar/subscription-links'
import {
  calendarSubscriptionRequestOrigin,
  newCalendarSubscriptionToken,
} from '@/lib/calendar/calendar-subscription-server'
import { upsertCalendarSubscriptionByToken } from '@/lib/analytics/calendar-subscription-tracking'
import { syncRemindersToGoogleCalendar } from '@/lib/google-calendar'
import { getLogTimestamp } from '@/lib/server-log-timestamp'
import { persistUserProfileTimeZoneIfValid } from '@/lib/user-profile-timezone-persist'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FRESH_GOOGLE_CONNECTION_MS = 15 * 60 * 1000
/** Re-push reminders if token row was not updated by a successful sync in this window */
const STALE_SYNC_THRESHOLD_MS = 90 * 1000

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(_req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
    const { data: profile } = await (db.from('user_profiles') as any)
      .select('calendar_token')
      .eq('id', session.user.id)
      .maybeSingle()

    const row = (profile as { calendar_token?: string | null } | null) ?? null
    let token = row?.calendar_token?.trim() || null

    if (!token) {
      const t = newCalendarSubscriptionToken()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
      await (db.from('user_profiles') as any)
        .update({ calendar_token: t, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
      token = t
      await upsertCalendarSubscriptionByToken(db, {
        userId: session.user.id,
        token: t,
        source: 'issued',
      })
    }

    const links = buildCalendarProviderLinks(token, calendarSubscriptionRequestOrigin(_req))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
    const { data: googleOAuthRow } = await (db.from('google_calendar_tokens') as any)
      .select('connected_at, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle()

    const googleOAuthRowTyped = googleOAuthRow as { connected_at?: string | null; updated_at?: string | null } | null
    const googleCalendarConnected = !!googleOAuthRowTyped
    const connectedAtMs = googleOAuthRowTyped?.connected_at
      ? new Date(googleOAuthRowTyped.connected_at).getTime()
      : 0
    const updatedAtMs = googleOAuthRowTyped?.updated_at
      ? new Date(googleOAuthRowTyped.updated_at).getTime()
      : 0
    const recentlyConnected =
      googleCalendarConnected &&
      connectedAtMs > 0 &&
      Date.now() - connectedAtMs < FRESH_GOOGLE_CONNECTION_MS
    const syncLooksStale = !updatedAtMs || Date.now() - updatedAtMs > STALE_SYNC_THRESHOLD_MS
    const ensureSync = _req.nextUrl.searchParams.get('ensureSync') === '1'

    // OAuth just completed (or client explicitly asks): push recurring reminders to Google immediately
    // instead of waiting for another API/cron. RRULE covers all future days including the next 7 at user times.
    if (googleCalendarConnected && (ensureSync || (recentlyConnected && syncLooksStale))) {
      void syncRemindersToGoogleCalendar(session.user.id).catch((err) => {
        console.error(`${getLogTimestamp()} [calendar-subscription] Google Calendar initial sync failed`, err)
      })
    }

    const debugLog =
      process.env.NODE_ENV === 'development' || process.env.WOF_DEBUG_NOTIFICATIONS === '1'
    if (debugLog) {
      console.info(`${getLogTimestamp()} [calendar-subscription] GET`, {
        userId: session.user.id,
        tokenPrefix: token.slice(0, 8),
        feedHost: (() => {
          try {
            return new URL(links.feedUrl).host
          } catch {
            return 'invalid-feed-url'
          }
        })(),
        hasGoogleSubscribeLink: Boolean(links.google),
        googleCalendarConnected,
        recentlyConnected,
        ensureSync,
        triggeredInitialGoogleSync: googleCalendarConnected && (ensureSync || (recentlyConnected && syncLooksStale)),
        hasApple: Boolean(links.apple),
        hasOutlook: Boolean(links.outlook),
      })
    }

    return NextResponse.json({
      success: true,
      token,
      links,
      googleCalendarConnected,
    })
  } catch (err) {
    console.error(`${getLogTimestamp()} [calendar-subscription] GET`, err)
    return NextResponse.json({ error: 'Failed to load calendar subscription' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = (await req.json().catch(() => ({}))) as {
      action?: 'regenerate' | 'sync_google_reminders'
      /** Optional: client saw disconnected before OAuth; used for logs only */
      hadGoogleCalendar?: boolean
      timeZone?: string
      timezone?: string
    }

    const db = getServerSupabase()

    if (body.action === 'sync_google_reminders') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- new table
      const { data: tok } = await (db.from('google_calendar_tokens') as any)
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle()
      if (!tok) {
        return NextResponse.json(
          { error: 'Google Calendar not connected', code: 'not_connected' },
          { status: 400 }
        )
      }
      if (body.hadGoogleCalendar === false) {
        console.info(`${getLogTimestamp()} [calendar-subscription] sync_google_reminders after disconnect→connect`, {
          userId: session.user.id,
        })
      }
      const tzFromBody = body.timeZone ?? body.timezone
      await persistUserProfileTimeZoneIfValid(db, session.user.id, tzFromBody)
      try {
        const synced = await syncRemindersToGoogleCalendar(session.user.id, {
          requestTimeZone: typeof tzFromBody === 'string' ? tzFromBody : undefined,
        })
        return NextResponse.json({ success: true, synced })
      } catch (e) {
        console.error(`${getLogTimestamp()} [calendar-subscription] sync_google_reminders`, e)
        return NextResponse.json(
          { error: e instanceof Error ? e.message : 'Sync failed' },
          { status: 500 }
        )
      }
    }

    if (body.action !== 'regenerate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const token = newCalendarSubscriptionToken()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
    await (db.from('user_profiles') as any)
      .update({ calendar_token: token, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    const links = buildCalendarProviderLinks(token, calendarSubscriptionRequestOrigin(req))
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
    console.error(`${getLogTimestamp()} [calendar-subscription] POST`, err)
    return NextResponse.json({ error: 'Failed to update calendar subscription' }, { status: 500 })
  }
}

