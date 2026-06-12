import {
  keywordFromInboundSnapshot,
  parseUserAcquisitionSnapshot,
  type InboundTouchSnapshot,
} from '@/lib/acquisition-snapshot'

export type AcquisitionAttributionFields = {
  referrer?: string
  referrer_url?: string
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_summary?: string
  first_landing?: string
}

export type AcquisitionJourneyFields = {
  dwell_seconds?: number | null
  next_step?: string
}

function readSnapField(raw: unknown, key: keyof InboundTouchSnapshot): string {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return ''
  const v = (raw as Record<string, unknown>)[key]
  return typeof v === 'string' ? v.trim() : ''
}

export function referrerDisplayLabel(referrer: string): string {
  const ref = referrer.trim()
  if (!ref) return ''
  try {
    const u = new URL(ref)
    return u.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return ref.length > 48 ? `${ref.slice(0, 45)}…` : ref
  }
}

export function buildUtmSummary(parts: {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
}): string {
  const bits = [parts.utm_source, parts.utm_medium, parts.utm_campaign].filter(Boolean)
  const base = bits.join(' / ')
  if (parts.utm_term) {
    return base ? `${base} · term: ${parts.utm_term}` : `term: ${parts.utm_term}`
  }
  return base
}

export function attributionFromInboundSnapshot(raw: unknown): AcquisitionAttributionFields {
  const referrer_url = readSnapField(raw, 'referrer')
  const utm_source = readSnapField(raw, 'utm_source')
  const utm_medium = readSnapField(raw, 'utm_medium')
  const utm_campaign = readSnapField(raw, 'utm_campaign')
  const utm_term = readSnapField(raw, 'utm_term') || keywordFromInboundSnapshot(raw).search_keyword
  const first_landing = readSnapField(raw, 'first_landing_page')
  const utm_summary = buildUtmSummary({ utm_source, utm_medium, utm_campaign, utm_term })
  const referrer = referrerDisplayLabel(referrer_url)

  const out: AcquisitionAttributionFields = {}
  if (referrer) {
    out.referrer = referrer
    out.referrer_url = referrer_url.slice(0, 500)
  }
  if (utm_source) out.utm_source = utm_source
  if (utm_medium) out.utm_medium = utm_medium
  if (utm_campaign) out.utm_campaign = utm_campaign
  if (utm_term) out.utm_term = utm_term
  if (utm_summary) out.utm_summary = utm_summary
  if (first_landing) out.first_landing = first_landing
  return out
}

export function attributionFromUserAcquisitionSnapshot(raw: unknown): AcquisitionAttributionFields {
  const parsed = parseUserAcquisitionSnapshot(raw)
  if (!parsed) return attributionFromInboundSnapshot(raw)
  return attributionFromInboundSnapshot(parsed)
}

export function clientSessionIdFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const id = (metadata as Record<string, unknown>).client_session_id
  return typeof id === 'string' ? id.trim() : ''
}

export function describeFunnelEvent(eventType: string, funnelId: string, pagePath?: string | null): string {
  if (eventType === 'page_view') return pagePath?.trim() || 'Landed (blog/home)'
  if (eventType === 'start') return `Started widget · ${funnelId}`
  if (eventType === 'complete') return `Finished widget · ${funnelId}`
  if (eventType === 'conversion') return 'Trial gift signup'
  return `${eventType} · ${funnelId}`
}

type TimelinePv = {
  path: string
  entered_at: string
  duration_seconds?: number | null
  client_session_id: string
}

export function buildPageViewSessionTimelines(
  rows: Array<{ path: string; entered_at: string; duration_seconds?: number | null; metadata: unknown }>
): Map<string, TimelinePv[]> {
  const map = new Map<string, TimelinePv[]>()
  for (const row of rows) {
    const sid = clientSessionIdFromMetadata(row.metadata)
    if (!sid) continue
    const list = map.get(sid) ?? []
    list.push({
      path: row.path,
      entered_at: row.entered_at,
      duration_seconds: row.duration_seconds,
      client_session_id: sid,
    })
    map.set(sid, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.entered_at.localeCompare(b.entered_at))
  }
  return map
}

function normalizePath(path: string): string {
  return (path.split('?')[0] || path).trim()
}

function secondsBetween(aIso: string, bIso: string): number | null {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.max(0, Math.round((b - a) / 1000))
}

/** Match a funnel land or site visit to a row inside a tab session (±3 min). */
export function journeyFromPageViewSession(
  path: string | undefined,
  atIso: string,
  sessionTimelines: Map<string, TimelinePv[]>,
  allPageViews: TimelinePv[]
): AcquisitionJourneyFields | null {
  const targetPath = path ? normalizePath(path) : ''
  if (!targetPath) return null

  const atMs = new Date(atIso).getTime()
  if (Number.isNaN(atMs)) return null

  let best: { session: TimelinePv[]; index: number; delta: number } | null = null

  for (const pv of allPageViews) {
    if (normalizePath(pv.path) !== targetPath) continue
    const pvMs = new Date(pv.entered_at).getTime()
    if (Number.isNaN(pvMs)) continue
    const delta = Math.abs(pvMs - atMs)
    if (delta > 3 * 60 * 1000) continue
    const session = sessionTimelines.get(pv.client_session_id)
    if (!session) continue
    const index = session.findIndex((r) => r.entered_at === pv.entered_at && r.path === pv.path)
    if (index < 0) continue
    if (!best || delta < best.delta) best = { session, index, delta }
  }

  if (!best) return null

  const { session, index } = best
  const next = session[index + 1]
  if (next) {
    return {
      dwell_seconds: secondsBetween(session[index]!.entered_at, next.entered_at),
      next_step: `→ ${normalizePath(next.path)}`,
    }
  }

  const dur = session[index]?.duration_seconds
  if (dur != null && Number.isFinite(dur)) {
    return { dwell_seconds: Math.max(0, Math.round(dur)), next_step: undefined }
  }
  return null
}

type FunnelTimelineRow = {
  visitor_id: string
  funnel_id: string
  event_type: string
  created_at: string
  page_path: string | null
}

export function buildFunnelVisitorTimelines(rows: FunnelTimelineRow[]): Map<string, FunnelTimelineRow[]> {
  const map = new Map<string, FunnelTimelineRow[]>()
  for (const row of rows) {
    const vid = row.visitor_id?.trim()
    if (!vid) continue
    const list = map.get(vid) ?? []
    list.push(row)
    map.set(vid, list)
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return map
}

export function journeyFromFunnelTimeline(
  visitorId: string | undefined,
  atIso: string,
  eventType: string,
  funnelId: string,
  timelines: Map<string, FunnelTimelineRow[]>
): AcquisitionJourneyFields | null {
  if (!visitorId) return null
  const events = timelines.get(visitorId)
  if (!events?.length) return null

  const idx = events.findIndex(
    (e) => e.created_at === atIso && e.event_type === eventType && e.funnel_id === funnelId
  )
  if (idx < 0) return null

  const next = events[idx + 1]
  if (!next) return null

  return {
    dwell_seconds: secondsBetween(events[idx]!.created_at, next.created_at),
    next_step: describeFunnelEvent(next.event_type, next.funnel_id, next.page_path),
  }
}

export function mergeJourneyFields(
  funnelJourney: AcquisitionJourneyFields | null,
  pageJourney: AcquisitionJourneyFields | null
): AcquisitionJourneyFields {
  if (funnelJourney?.next_step) return funnelJourney
  if (pageJourney?.next_step) {
    return {
      dwell_seconds: funnelJourney?.dwell_seconds ?? pageJourney.dwell_seconds,
      next_step: pageJourney.next_step,
    }
  }
  return {
    dwell_seconds: funnelJourney?.dwell_seconds ?? pageJourney?.dwell_seconds ?? null,
    next_step: undefined,
  }
}
