import { NextRequest, NextResponse } from 'next/server'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { getServerSupabase } from '@/lib/server-supabase'
import type { SessionAttributionSource } from '@/lib/analytics/session-source-map'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALLOWED: SessionAttributionSource[] = ['direct', 'calendar', 'email', 'push']

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSessionFromRequest(req)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json().catch(() => ({}))) as {
      source?: string
      landingPath?: string
    }
    const raw = String(body.source || '').toLowerCase()
    if (!ALLOWED.includes(raw as SessionAttributionSource)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }
    const source = raw as SessionAttributionSource
    const landingPath =
      typeof body.landingPath === 'string' ? body.landingPath.slice(0, 2048) : null

    const db = getServerSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (db.from('session_source_events') as any).insert({
      user_id: session.user.id,
      source,
      landing_path: landingPath,
    })
    if (error) {
      console.error('[analytics/session-source] insert', error)
      return NextResponse.json({ error: 'Failed to record' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('[analytics/session-source]', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
