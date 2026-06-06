import { deriveInboundTouchLabel } from '@/lib/radar-inbound-label'
import { resolveInboundSearchKeyword } from '@/lib/inbound-search-keyword'

/** First-touch cookie set by {@link ensureInboundContextCookie} in lib/radar.ts */
export const WOF_INBOUND_COOKIE = 'wof_inbound_ctx'

export type InboundTouchSnapshot = {
  referrer: string
  utm_source: string
  utm_medium: string
  utm_campaign: string
  utm_term: string
  /** Paid utm_term or search query parsed from referrer when available. */
  search_keyword: string
  /** e.g. google, bing, utm — empty if unknown. */
  search_engine: string
  first_landing_page: string
  captured_at: string
}

export type UserAcquisitionSnapshot = InboundTouchSnapshot & {
  touch_label: string
  recorded_at: string
  recorded_via: 'oauth_callback' | 'client_backfill'
  auth_provider?: string | null
  blog_trial_gift?: boolean
}

function normalizeInbound(raw: Partial<InboundTouchSnapshot> | null | undefined): InboundTouchSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const base = {
    referrer: typeof raw.referrer === 'string' ? raw.referrer.trim().slice(0, 500) : '',
    utm_source: typeof raw.utm_source === 'string' ? raw.utm_source.trim().slice(0, 200) : '',
    utm_medium: typeof raw.utm_medium === 'string' ? raw.utm_medium.trim().slice(0, 200) : '',
    utm_campaign: typeof raw.utm_campaign === 'string' ? raw.utm_campaign.trim().slice(0, 200) : '',
    first_landing_page:
      typeof raw.first_landing_page === 'string' ? raw.first_landing_page.trim().slice(0, 2000) : '',
    captured_at: typeof raw.captured_at === 'string' ? raw.captured_at.trim().slice(0, 40) : '',
  }
  const resolved = resolveInboundSearchKeyword({
    referrer: base.referrer,
    utm_term: typeof raw.utm_term === 'string' ? raw.utm_term : '',
    first_landing_page: base.first_landing_page,
    utm_source: base.utm_source,
  })
  const search_keyword =
    typeof raw.search_keyword === 'string' && raw.search_keyword.trim()
      ? raw.search_keyword.trim().slice(0, 200)
      : resolved.search_keyword
  const search_engine =
    typeof raw.search_engine === 'string' && raw.search_engine.trim()
      ? raw.search_engine.trim().slice(0, 64)
      : resolved.search_engine
  const utm_term =
    typeof raw.utm_term === 'string' && raw.utm_term.trim()
      ? raw.utm_term.trim().slice(0, 200)
      : resolved.utm_term

  const snapshot: InboundTouchSnapshot = {
    ...base,
    utm_term,
    search_keyword,
    search_engine,
  }
  const hasSomething =
    snapshot.referrer.length > 0 ||
    snapshot.utm_source.length > 0 ||
    snapshot.utm_medium.length > 0 ||
    snapshot.utm_campaign.length > 0 ||
    snapshot.utm_term.length > 0 ||
    snapshot.search_keyword.length > 0 ||
    snapshot.first_landing_page.length > 0
  return hasSomething ? snapshot : null
}

/** Parse encoded `wof_inbound_ctx` cookie value (server or client). */
export function parseInboundCookieValue(raw: string | null | undefined): InboundTouchSnapshot | null {
  if (!raw || typeof raw !== 'string') return null
  try {
    const decoded = decodeURIComponent(raw.trim())
    const j = JSON.parse(decoded) as Partial<InboundTouchSnapshot>
    return normalizeInbound(j)
  } catch {
    return null
  }
}

export function buildUserAcquisitionSnapshot(
  inbound: InboundTouchSnapshot,
  recordedVia: UserAcquisitionSnapshot['recorded_via'],
  extras?: { auth_provider?: string | null; blog_trial_gift?: boolean }
): UserAcquisitionSnapshot {
  return {
    ...inbound,
    touch_label: deriveInboundTouchLabel(inbound),
    recorded_at: new Date().toISOString(),
    recorded_via: recordedVia,
    ...(extras?.auth_provider != null ? { auth_provider: extras.auth_provider } : {}),
    ...(extras?.blog_trial_gift ? { blog_trial_gift: true } : {}),
  }
}

export function parseUserAcquisitionSnapshot(raw: unknown): UserAcquisitionSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Partial<UserAcquisitionSnapshot>
  const inbound = normalizeInbound(o)
  if (!inbound) return null
  const touch_label =
    typeof o.touch_label === 'string' && o.touch_label.trim()
      ? o.touch_label.trim().slice(0, 128)
      : deriveInboundTouchLabel(inbound)
  return {
    ...inbound,
    touch_label,
    recorded_at: typeof o.recorded_at === 'string' ? o.recorded_at : '',
    recorded_via: o.recorded_via === 'client_backfill' ? 'client_backfill' : 'oauth_callback',
    auth_provider: typeof o.auth_provider === 'string' ? o.auth_provider : o.auth_provider ?? null,
    blog_trial_gift: o.blog_trial_gift === true ? true : undefined,
  }
}

/** Short label for admin tables (utm_source or referrer hostname or direct). */
export function acquisitionSourceLabel(snapshot: UserAcquisitionSnapshot | null | undefined): string {
  if (!snapshot) return 'unknown'
  if (snapshot.touch_label) return snapshot.touch_label
  return deriveInboundTouchLabel(snapshot)
}

/** Label from funnel_analytics.inbound_snapshot or similar JSON blobs. */
export function inboundLabelFromSnapshot(snap: unknown): string {
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return 'direct'
  const o = snap as Record<string, unknown>
  const tl = typeof o.touch_label === 'string' ? o.touch_label.trim() : ''
  if (tl.length > 0) return tl.slice(0, 128)
  return deriveInboundTouchLabel({
    utm_source: typeof o.utm_source === 'string' ? o.utm_source : '',
    referrer: typeof o.referrer === 'string' ? o.referrer : '',
  })
}

export function inboundLabelFromReferrer(referrer: string | null | undefined): string {
  const ref = typeof referrer === 'string' ? referrer.trim() : ''
  if (!ref) return 'direct'
  return deriveInboundTouchLabel({ referrer: ref })
}

/** Accept inbound snapshot from client POST body. */
export function normalizeInboundFromBody(raw: unknown): InboundTouchSnapshot | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  return normalizeInbound(raw as Partial<InboundTouchSnapshot>)
}

export function keywordFromInboundSnapshot(raw: unknown): {
  search_keyword: string
  search_engine: string
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { search_keyword: '', search_engine: '' }
  }
  const o = raw as Partial<InboundTouchSnapshot>
  if (typeof o.search_keyword === 'string' && o.search_keyword.trim()) {
    return {
      search_keyword: o.search_keyword.trim().slice(0, 200),
      search_engine: typeof o.search_engine === 'string' ? o.search_engine.trim().slice(0, 64) : '',
    }
  }
  const resolved = resolveInboundSearchKeyword({
    referrer: o.referrer,
    utm_term: o.utm_term,
    first_landing_page: o.first_landing_page,
    utm_source: o.utm_source,
  })
  return { search_keyword: resolved.search_keyword, search_engine: resolved.search_engine }
}

/** JSON body for funnel_analytics.inbound_snapshot and API payloads. */
export function inboundSnapshotPayload(inbound: InboundTouchSnapshot): Record<string, string> {
  return {
    referrer: inbound.referrer,
    utm_source: inbound.utm_source,
    utm_medium: inbound.utm_medium,
    utm_campaign: inbound.utm_campaign,
    utm_term: inbound.utm_term,
    search_keyword: inbound.search_keyword,
    search_engine: inbound.search_engine,
    first_landing_page: inbound.first_landing_page,
    captured_at: inbound.captured_at,
  }
}

export function acquisitionDetailLines(snapshot: UserAcquisitionSnapshot): string[] {
  const lines: string[] = []
  if (snapshot.utm_source) lines.push(`utm_source: ${snapshot.utm_source}`)
  if (snapshot.utm_medium) lines.push(`utm_medium: ${snapshot.utm_medium}`)
  if (snapshot.utm_campaign) lines.push(`utm_campaign: ${snapshot.utm_campaign}`)
  if (snapshot.utm_term) lines.push(`utm_term: ${snapshot.utm_term}`)
  if (snapshot.search_keyword) {
    const engine = snapshot.search_engine ? ` (${snapshot.search_engine})` : ''
    lines.push(`search keyword${engine}: ${snapshot.search_keyword}`)
  }
  if (snapshot.referrer) lines.push(`referrer: ${snapshot.referrer}`)
  if (snapshot.first_landing_page) lines.push(`first page: ${snapshot.first_landing_page}`)
  if (snapshot.auth_provider) lines.push(`auth: ${snapshot.auth_provider}`)
  if (snapshot.blog_trial_gift) lines.push('blog trial gift')
  return lines
}
