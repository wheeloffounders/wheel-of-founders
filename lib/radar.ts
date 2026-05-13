/**
 * Founder Radar — client-side funnel telemetry (fail-silent).
 * Events are persisted via POST /api/radar/track (service role insert).
 */

export type RadarEventType = 'start' | 'complete' | 'conversion'
export type RadarSource = 'home' | 'blog'

const VISITOR_COOKIE = 'wof_radar_visitor'
const INBOUND_COOKIE = 'wof_inbound_ctx'
const VISITOR_MAX_AGE_SEC = 60 * 60 * 24 * 400
export const WOF_RADAR_LAST_FUNNEL_KEY = 'wof_radar_last_funnel_id'
const WOF_RADAR_LAST_SOURCE_KEY = 'wof_radar_last_source'

/** First-touch marketing context (cookie); stable for the visitor lifetime. */
export type RadarInboundSnapshot = {
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  first_landing_page: string
  captured_at: string
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function readCookieValue(name: string): string | null {
  if (typeof document === 'undefined') return null
  const parts = document.cookie.split(';')
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=').trim()
  }
  return null
}

function readInboundSnapshotFromCookie(): RadarInboundSnapshot | null {
  const raw = readCookieValue(INBOUND_COOKIE)
  if (!raw) return null
  try {
    const decoded = decodeURIComponent(raw)
    const j = JSON.parse(decoded) as Partial<RadarInboundSnapshot>
    if (!j || typeof j !== 'object') return null
    return {
      referrer: typeof j.referrer === 'string' ? j.referrer : '',
      utm_source: typeof j.utm_source === 'string' ? j.utm_source : '',
      utm_medium: typeof j.utm_medium === 'string' ? j.utm_medium : '',
      utm_campaign: typeof j.utm_campaign === 'string' ? j.utm_campaign : '',
      first_landing_page: typeof j.first_landing_page === 'string' ? j.first_landing_page : '',
      captured_at: typeof j.captured_at === 'string' ? j.captured_at : '',
    }
  } catch {
    return null
  }
}

/** Create first-touch cookie once: external referrer, UTMs, landing path. */
export function ensureInboundContextCookie(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    if (readInboundSnapshotFromCookie()) return

    const params = new URLSearchParams(window.location.search)
    const utm_source = (params.get('utm_source') ?? '').trim().slice(0, 200)
    const utm_medium = (params.get('utm_medium') ?? '').trim().slice(0, 200)
    const utm_campaign = (params.get('utm_campaign') ?? '').trim().slice(0, 200)

    let referrer = ''
    try {
      const ref = document.referrer
      if (ref) {
        const r = new URL(ref)
        if (r.hostname !== window.location.hostname) {
          referrer = ref.slice(0, 500)
        }
      }
    } catch {
      /* ignore */
    }

    const first_landing_page = `${window.location.pathname}${window.location.search}`.slice(0, 2000)
    const snapshot: RadarInboundSnapshot = {
      referrer,
      utm_source,
      utm_medium,
      utm_campaign,
      first_landing_page,
      captured_at: new Date().toISOString(),
    }

    const payload = encodeURIComponent(JSON.stringify(snapshot))
    if (payload.length > 3800) return
    document.cookie = `${INBOUND_COOKIE}=${payload}; Path=/; Max-Age=${VISITOR_MAX_AGE_SEC}; SameSite=Lax`
  } catch {
    /* ignore */
  }
}

/** Persistent anonymous id (cookie) for stitching pre-signup → conversion. */
export function getOrCreateRadarVisitorId(): string | null {
  if (typeof document === 'undefined') return null
  try {
    ensureInboundContextCookie()

    const parts = document.cookie.split(';')
    for (const part of parts) {
      const [k, ...rest] = part.trim().split('=')
      if (k === VISITOR_COOKIE) {
        const v = rest.join('=').trim()
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)) {
          return v
        }
      }
    }
    const id = randomUuid()
    document.cookie = `${VISITOR_COOKIE}=${id}; Path=/; Max-Age=${VISITOR_MAX_AGE_SEC}; SameSite=Lax`
    return id
  } catch {
    return null
  }
}

export function rememberRadarFunnelContext(funnelId: string, source: RadarSource): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(WOF_RADAR_LAST_FUNNEL_KEY, funnelId)
    sessionStorage.setItem(WOF_RADAR_LAST_SOURCE_KEY, source)
  } catch {
    /* ignore */
  }
}

function readPendingPlanFunnel(): { funnelId: string; source: RadarSource } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('pending_plan')
    if (!raw) return null
    const j = JSON.parse(raw) as { funnelId?: string; source?: string }
    const funnelId = typeof j.funnelId === 'string' ? j.funnelId.trim() : ''
    if (!funnelId) return null
    const src = typeof j.source === 'string' && j.source.includes('blog') ? 'blog' : 'home'
    return { funnelId, source: src }
  } catch {
    return null
  }
}

/** Resolve funnel + source for Pro trial gift conversion (session handoff). */
export function readRadarContextForConversion(): { funnelId: string; source: RadarSource } | null {
  if (typeof window === 'undefined') return null
  try {
    const lastF = sessionStorage.getItem(WOF_RADAR_LAST_FUNNEL_KEY)?.trim()
    const lastS = sessionStorage.getItem(WOF_RADAR_LAST_SOURCE_KEY)?.trim()
    if (lastF && (lastS === 'home' || lastS === 'blog')) {
      return { funnelId: lastF, source: lastS }
    }
  } catch {
    /* ignore */
  }
  return readPendingPlanFunnel()
}

export function trackRadarEvent(funnelId: string, eventType: RadarEventType, source: RadarSource): void {
  const id = funnelId?.trim()
  if (!id) return
  void (async () => {
    try {
      const visitorId = getOrCreateRadarVisitorId()
      if (!visitorId) return
      if (eventType === 'start') rememberRadarFunnelContext(id, source)

      const attachInbound = eventType === 'start' || eventType === 'conversion'
      const inbound = attachInbound ? readInboundSnapshotFromCookie() : null

      const body: Record<string, unknown> = {
        funnel_id: id,
        event_type: eventType,
        source,
        visitor_id: visitorId,
      }

      if (inbound) {
        body.inbound_snapshot = {
          referrer: inbound.referrer,
          utm_source: inbound.utm_source,
          utm_medium: inbound.utm_medium,
          utm_campaign: inbound.utm_campaign,
          first_landing_page: inbound.first_landing_page,
          captured_at: inbound.captured_at,
        }
      }

      await fetch('/api/radar/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch {
      /* silent */
    }
  })()
}

/** After profile trial gift apply — links signup to last known funnel. */
export function trackRadarConversionForGiftClaim(): void {
  const ctx = readRadarContextForConversion()
  if (!ctx) return
  trackRadarEvent(ctx.funnelId, 'conversion', ctx.source)
}
