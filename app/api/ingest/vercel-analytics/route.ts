import { NextRequest, NextResponse } from 'next/server'
import { serverSupabase } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

type VercelAnalyticsEvent = {
  schema?: string
  eventType?: string
  eventName?: string
  eventData?: string
  timestamp?: number
  path?: string
  referrer?: string
  queryParams?: string
  country?: string
  region?: string
  city?: string
  deviceType?: string
  clientName?: string
  osName?: string
  sessionId?: number
  deviceId?: number
  origin?: string
}

function authorize(req: NextRequest): boolean {
  const expected = process.env.VERCEL_ANALYTICS_DRAIN_SECRET?.trim()
  if (!expected) return false
  const header = req.headers.get('x-vercel-drain-secret')?.trim()
  const query = req.nextUrl.searchParams.get('secret')?.trim()
  return header === expected || query === expected
}

function normalizeEvents(body: unknown): VercelAnalyticsEvent[] {
  if (Array.isArray(body)) return body as VercelAnalyticsEvent[]
  if (body && typeof body === 'object') return [body as VercelAnalyticsEvent]
  return []
}

function toRow(event: VercelAnalyticsEvent): Record<string, unknown> | null {
  const eventType = (event.eventType ?? 'pageview').trim().toLowerCase()
  if (eventType !== 'pageview' && eventType !== 'event') return null

  const ts = typeof event.timestamp === 'number' ? event.timestamp : Date.now()
  const path = typeof event.path === 'string' && event.path.trim() ? event.path.trim() : '/'

  return {
    event_type: eventType,
    event_name: typeof event.eventName === 'string' ? event.eventName.slice(0, 200) : null,
    path: path.slice(0, 2000),
    referrer: typeof event.referrer === 'string' ? event.referrer.slice(0, 500) : null,
    query_params: typeof event.queryParams === 'string' ? event.queryParams.slice(0, 2000) : null,
    country: typeof event.country === 'string' ? event.country.slice(0, 8) : null,
    region: typeof event.region === 'string' ? event.region.slice(0, 32) : null,
    city: typeof event.city === 'string' ? event.city.slice(0, 64) : null,
    device_type: typeof event.deviceType === 'string' ? event.deviceType.slice(0, 32) : null,
    client_name: typeof event.clientName === 'string' ? event.clientName.slice(0, 64) : null,
    os_name: typeof event.osName === 'string' ? event.osName.slice(0, 64) : null,
    session_id: typeof event.sessionId === 'number' ? event.sessionId : null,
    device_id: typeof event.deviceId === 'number' ? event.deviceId : null,
    origin: typeof event.origin === 'string' ? event.origin.slice(0, 500) : null,
    recorded_at: new Date(ts).toISOString(),
    raw: event as Record<string, unknown>,
  }
}

/**
 * POST: Vercel Web Analytics Drain destination.
 * Set VERCEL_ANALYTICS_DRAIN_SECRET and configure drain URL:
 * https://app.wheeloffounders.com/api/ingest/vercel-analytics?secret=YOUR_SECRET
 */
export async function POST(req: NextRequest) {
  try {
    if (!authorize(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contentType = req.headers.get('content-type') ?? ''
    const text = await req.text()
    if (!text.trim()) {
      return NextResponse.json({ error: 'Empty body' }, { status: 400 })
    }

    let events: VercelAnalyticsEvent[] = []
    if (contentType.includes('ndjson') || (!text.trimStart().startsWith('[') && text.includes('\n'))) {
      events = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => JSON.parse(line) as VercelAnalyticsEvent)
    } else {
      events = normalizeEvents(JSON.parse(text) as unknown)
    }

    const rows = events.map(toRow).filter(Boolean) as Record<string, unknown>[]
    if (rows.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 })
    }

    const db = serverSupabase()
    const { error } = await db.from('vercel_web_analytics_events').insert(rows as never)
    if (error) {
      console.error('[ingest/vercel-analytics]', error.message)
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, inserted: rows.length })
  } catch (e) {
    console.error('[ingest/vercel-analytics]', e)
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
