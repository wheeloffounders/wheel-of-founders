import { NextRequest, NextResponse } from 'next/server'
import { deriveInboundTouchLabel } from '@/lib/radar-inbound-label'
import { normalizeInboundFromBody } from '@/lib/acquisition-snapshot'
import { isInternalTrafficPath, isExcludedFromAdminAnalytics } from '@/lib/admin/internal-traffic-exclusion'
import { isLocalhostRequest } from '@/lib/analytics/skip-internal-analytics'
import { getServerSessionFromRequest } from '@/lib/server-auth'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const EVENTS = new Set(['page_view', 'start', 'complete', 'conversion'])
const SOURCES = new Set(['home', 'blog'])
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const FUNNEL_RE = /^[a-z0-9_]{1,96}$/

type InboundRow = {
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  search_keyword: string
  search_engine: string
  first_landing_page: string
  captured_at: string
  touch_label: string
}

function sanitizeInboundSnapshot(raw: unknown): InboundRow | null {
  const normalized = normalizeInboundFromBody(raw)
  if (!normalized) return null
  const touch_label = deriveInboundTouchLabel({
    utm_source: normalized.utm_source,
    referrer: normalized.referrer,
  })
  return { ...normalized, touch_label }
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
      page_path?: string
    } | null
    if (!body) return NextResponse.json({ ok: false }, { status: 400 })

    const funnel_id = (body.funnel_id ?? '').trim().toLowerCase()
    const event_type = body.event_type ?? ''
    const source = body.source ?? ''
    const visitor_id = (body.visitor_id ?? '').trim()

    if (!FUNNEL_RE.test(funnel_id) || !EVENTS.has(event_type) || !SOURCES.has(source) || !UUID_RE.test(visitor_id)) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    if (isLocalhostRequest(req)) {
      return NextResponse.json({ ok: true, skipped: 'localhost' })
    }

    const page_path =
      typeof body.page_path === 'string' ? body.page_path.trim().slice(0, 2000) : ''
    if (event_type === 'page_view') {
      if (!page_path.startsWith('/') || isInternalTrafficPath(page_path)) {
        return NextResponse.json({ ok: false }, { status: 400 })
      }
    }

    const session = await getServerSessionFromRequest(req)
    if (
      session?.user?.id &&
      isExcludedFromAdminAnalytics({ id: session.user.id, email: session.user.email })
    ) {
      return NextResponse.json({ ok: true, skipped: 'internal_team' })
    }

    let inbound = sanitizeInboundSnapshot(body.inbound_snapshot)
    if (inbound && event_type !== 'start' && event_type !== 'conversion' && event_type !== 'page_view') {
      inbound = null
    }

    const db = serverSupabase()
    const row: Record<string, unknown> = {
      funnel_id,
      event_type,
      source,
      visitor_id,
    }
    if (event_type === 'page_view') {
      row.page_path = page_path
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
