import { NextRequest, NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const EVENTS = new Set(['start', 'complete', 'conversion'])
const SOURCES = new Set(['home', 'blog'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FUNNEL_RE = /^[a-z0-9_]{1,96}$/

/**
 * Append-only funnel analytics (anonymous visitor_id). Service role insert; fails open for callers.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      funnel_id?: string
      event_type?: string
      source?: string
      visitor_id?: string
    } | null
    if (!body) return NextResponse.json({ ok: false }, { status: 400 })

    const funnel_id = (body.funnel_id ?? '').trim().toLowerCase()
    const event_type = body.event_type ?? ''
    const source = body.source ?? ''
    const visitor_id = (body.visitor_id ?? '').trim()

    if (!FUNNEL_RE.test(funnel_id) || !EVENTS.has(event_type) || !SOURCES.has(source) || !UUID_RE.test(visitor_id)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    const db = serverSupabase()
    const { error } = await db.from('funnel_analytics').insert({
      funnel_id,
      event_type,
      source,
      visitor_id,
    } as never)

    if (error) {
      console.error('[radar/track]', error.message)
      return NextResponse.json({ ok: false }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('[radar/track]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
