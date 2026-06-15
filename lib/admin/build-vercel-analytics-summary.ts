import type { SupabaseClient } from '@supabase/supabase-js'

export type VercelAnalyticsTopRow = {
  label: string
  views: number
}

export type VercelAnalyticsSummary = {
  configured: boolean
  pageviews: number
  custom_events: number
  unique_sessions: number
  unique_devices: number
  top_pages: VercelAnalyticsTopRow[]
  top_referrers: VercelAnalyticsTopRow[]
  top_countries: VercelAnalyticsTopRow[]
  top_devices: VercelAnalyticsTopRow[]
  top_browsers: VercelAnalyticsTopRow[]
  setup_note?: string
}

function bump(map: Map<string, number>, key: string): void {
  const k = key.trim() || '(none)'
  map.set(k, (map.get(k) ?? 0) + 1)
}

function topN(map: Map<string, number>, n: number): VercelAnalyticsTopRow[] {
  return Array.from(map.entries())
    .map(([label, views]) => ({ label, views }))
    .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label))
    .slice(0, n)
}

function referrerLabel(raw: string | null | undefined): string {
  const ref = typeof raw === 'string' ? raw.trim() : ''
  if (!ref) return 'direct'
  try {
    return new URL(ref).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ref.length > 64 ? `${ref.slice(0, 61)}…` : ref
  }
}

const EMPTY: VercelAnalyticsSummary = {
  configured: false,
  pageviews: 0,
  custom_events: 0,
  unique_sessions: 0,
  unique_devices: 0,
  top_pages: [],
  top_referrers: [],
  top_countries: [],
  top_devices: [],
  top_browsers: [],
  setup_note:
    'Connect Vercel Web Analytics Drains to POST /api/ingest/vercel-analytics (see docs in repo). Until then, use first-party counts above.',
}

type EventRow = {
  event_type?: string | null
  path?: string | null
  referrer?: string | null
  country?: string | null
  device_type?: string | null
  client_name?: string | null
  session_id?: number | null
  device_id?: number | null
}

export async function buildVercelAnalyticsSummary(
  db: SupabaseClient,
  sinceIso: string,
  untilIso: string
): Promise<VercelAnalyticsSummary> {
  const { count, error: countErr } = await db
    .from('vercel_web_analytics_events')
    .select('id', { count: 'exact', head: true })
    .limit(1)

  if (countErr) {
    if (/does not exist|schema cache/i.test(countErr.message)) {
      return {
        ...EMPTY,
        setup_note: 'Apply migration 153_vercel_web_analytics_events.sql, then configure the Vercel drain.',
      }
    }
    throw countErr
  }

  if (!count) return { ...EMPTY }

  const { data, error } = await db
    .from('vercel_web_analytics_events')
    .select(
      'event_type, path, referrer, country, device_type, client_name, session_id, device_id'
    )
    .gte('recorded_at', sinceIso)
    .lte('recorded_at', untilIso)
    .order('recorded_at', { ascending: false })
    .limit(8000)

  if (error) throw error

  const rows = (data ?? []) as EventRow[]
  if (rows.length === 0) {
    return {
      ...EMPTY,
      configured: true,
      setup_note: 'Drain is connected but no events in this date range yet.',
    }
  }

  const pages = new Map<string, number>()
  const referrers = new Map<string, number>()
  const countries = new Map<string, number>()
  const devices = new Map<string, number>()
  const browsers = new Map<string, number>()
  const sessions = new Set<number>()
  const devicesSeen = new Set<number>()

  let pageviews = 0
  let customEvents = 0

  for (const row of rows) {
    const type = row.event_type ?? 'pageview'
    if (type === 'pageview') {
      pageviews += 1
      const path = (row.path ?? '/').split('?')[0] || '/'
      bump(pages, path)
      bump(referrers, referrerLabel(row.referrer))
      if (row.country) bump(countries, row.country)
      if (row.device_type) bump(devices, row.device_type)
      if (row.client_name) bump(browsers, row.client_name)
    } else if (type === 'event') {
      customEvents += 1
    }
    if (row.session_id != null) sessions.add(row.session_id)
    if (row.device_id != null) devicesSeen.add(row.device_id)
  }

  return {
    configured: true,
    pageviews,
    custom_events: customEvents,
    unique_sessions: sessions.size,
    unique_devices: devicesSeen.size,
    top_pages: topN(pages, 12),
    top_referrers: topN(referrers, 10),
    top_countries: topN(countries, 10),
    top_devices: topN(devices, 6),
    top_browsers: topN(browsers, 8),
  }
}
