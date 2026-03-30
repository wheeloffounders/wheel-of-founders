import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import { buildCalendarProviderLinks } from '@/lib/calendar/subscription-links'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

function requestOrigin(req: NextRequest): string {
  const explicitOrigin = req.headers.get('origin')?.trim()
  if (explicitOrigin) return explicitOrigin.replace(/\/$/, '')
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host')
  if (host) {
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    return `${proto}://${host}`.replace(/\/$/, '')
  }
  return req.nextUrl.origin.replace(/\/$/, '')
}

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
    let token = row?.calendar_token || null

    if (!token) {
      token = newToken()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
      await (db.from('user_profiles') as any)
        .update({ calendar_token: token, updated_at: new Date().toISOString() })
        .eq('id', session.user.id)
    }

    const links = buildCalendarProviderLinks(token, requestOrigin(_req))
    const debugLog =
      process.env.NODE_ENV === 'development' || process.env.WOF_DEBUG_NOTIFICATIONS === '1'
    if (debugLog) {
      console.info('[calendar-subscription] GET', {
        userId: session.user.id,
        tokenPrefix: token.slice(0, 8),
        feedHost: (() => {
          try {
            return new URL(links.feedUrl).host
          } catch {
            return 'invalid-feed-url'
          }
        })(),
        hasGoogle: Boolean(links.google),
        hasApple: Boolean(links.apple),
        hasOutlook: Boolean(links.outlook),
      })
    }

    return NextResponse.json({
      success: true,
      token,
      links,
    })
  } catch (err) {
    console.error('[calendar-subscription] GET', err)
    return NextResponse.json({ error: 'Failed to load calendar subscription' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const body = (await req.json().catch(() => ({}))) as { action?: 'regenerate' }

    if (body.action !== 'regenerate') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const token = newToken()
    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- generated schema may lag custom columns
    await (db.from('user_profiles') as any)
      .update({ calendar_token: token, updated_at: new Date().toISOString() })
      .eq('id', session.user.id)

    return NextResponse.json({
      success: true,
      token,
      links: buildCalendarProviderLinks(token, requestOrigin(req)),
    })
  } catch (err) {
    console.error('[calendar-subscription] POST', err)
    return NextResponse.json({ error: 'Failed to update calendar subscription' }, { status: 500 })
  }
}

