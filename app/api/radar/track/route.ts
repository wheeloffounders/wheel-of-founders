import { NextRequest, NextResponse } from 'next/server'
import { deriveInboundTouchLabel } from '@/lib/radar-inbound-label'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const EVENTS = new Set(['start', 'complete', 'conversion'])
const SOURCES = new Set(['home', 'blog'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FUNNEL_RE = /^[a-z0-9_]{1,96}$/

type InboundRow = {
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  first_landing_page: string
  captured_at: string
  touch_label: string
}

function sanitizeInboundSnapshot(raw: unknown): InboundRow | null {
  if (raw == null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const referrer = str(o.referrer, 500)
  const utm_source = str(o.utm_source, 200)
  const utm_medium = str(o.utm_medium, 200)
  const utm_campaign = str(o.utm_campaign, 200)
  const first_landing_page = str(o.first_landing_page, 2000)
  const captured_at = str(o.captured_at, 40)
  const hasSomething =
    referrer.length > 0 ||
    utm_source.length > 0 ||
    utm_medium.length > 0 ||
    utm_campaign.length > 0 ||
    first_landing_page.length > 0
  if (!hasSomething) return null
  const touch_label = deriveInboundTouchLabel({ utm_source, referrer })
  return {
    referrer,
    utm_source,
    utm_medium,
    utm_campaign,
    first_landing_page,
    captured_at,
    touch_label,
  }
}

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
      inbound_snapshot?: unknown
    } | null
    if (!body) return NextResponse.json({ ok: false }, { status: 400 })

    const funnel_id = (body.funnel_id ?? '').trim().toLowerCase()
    const event_type = body.event_type ?? ''
    const source = body.source ?? ''
    const visitor_id = (body.visitor_id ?? '').trim()

    if (!FUNNEL_RE.test(funnel_id) || !EVENTS.has(event_type) || !SOURCES.has(source) || !UUID_RE.test(visitor_id)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    let inbound = sanitizeInboundSnapshot(body.inbound_snapshot)
    if (inbound && event_type !== 'start' && event_type !== 'conversion') {
      inbound = null
    }

    const db = serverSupabase()
    const row: Record<string, unknown> = {
      funnel_id,
      event_type,
      source,
      visitor_id,
    }
    if (inbound) {
      row.inbound_snapshot = inbound
    }

    const { error } = await db.from('funnel_analytics').insert(row as never)

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
