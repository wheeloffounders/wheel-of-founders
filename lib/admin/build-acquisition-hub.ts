import type { SupabaseClient } from '@supabase/supabase-js'
import { format, parseISO, subDays } from 'date-fns'
import {
  acquisitionSourceLabel,
  inboundLabelFromReferrer,
  inboundLabelFromSnapshot,
  keywordFromInboundSnapshot,
  parseUserAcquisitionSnapshot,
} from '@/lib/acquisition-snapshot'
import {
  INTERNAL_TRAFFIC_EXCLUSION_NOTE,
  isExcludedAdminUserId,
  isExcludedFromAdminAnalytics,
  isInternalTrafficPath,
} from '@/lib/admin/internal-traffic-exclusion'
import { isLocalhostReferrer } from '@/lib/analytics/skip-internal-analytics'

export type AcquisitionFeedKind =
  | 'signup'
  | 'land'
  | 'widget_start'
  | 'widget_complete'
  | 'trial_conversion'
  | 'site_visit'

export type AcquisitionFeedRow = {
  at: string
  kind: AcquisitionFeedKind
  source: string
  detail: string
  path?: string
  user_id?: string
  user_label?: string
  funnel_id?: string
  visitor_id?: string
  search_keyword?: string
  search_engine?: string
}

export type AcquisitionKeywordRow = {
  keyword: string
  search_engine: string
  touchpoints: number
  signups: number
}

export type AcquisitionSourceRow = {
  source: string
  lands: number
  site_visits: number
  widget_starts: number
  widget_completes: number
  signups: number
  trial_conversions: number
  total_touchpoints: number
}

export type AcquisitionFunnelRates = {
  land_to_start_pct: number | null
  start_to_complete_pct: number | null
  complete_to_signup_pct: number | null
  visit_to_signup_pct: number | null
}

export type AcquisitionLandingPageRow = {
  path: string
  visits: number
  signups: number
}

export type AcquisitionLeakHint = {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  detail: string
}

export type AcquisitionHubPayload = {
  date_range_start: string
  date_range_end: string
  window_days: number
  totals: {
    signups: number
    lands: number
    site_visits: number
    widget_starts: number
    widget_completes: number
    trial_conversions: number
  }
  funnel_rates: AcquisitionFunnelRates
  by_source: AcquisitionSourceRow[]
  by_keyword: AcquisitionKeywordRow[]
  top_landing_pages: AcquisitionLandingPageRow[]
  leak_hints: AcquisitionLeakHint[]
  feed: AcquisitionFeedRow[]
  sample_note?: string
  excludes_internal_team: boolean
  exclusion_note: string
}

export type BuildAcquisitionOptions = {
  startDate?: string
  endDate?: string
  windowDays?: number
}

const SITE_VISIT_PATHS = new Set(['/', '/pricing', '/auth/signup', '/auth/login', '/blog'])

function pct(num: number, den: number): number | null {
  if (den <= 0) return null
  return Math.round((num / den) * 1000) / 10
}

function resolveDateRange(options: BuildAcquisitionOptions): {
  sinceIso: string
  untilIso: string
  startDateStr: string
  endDateStr: string
  windowDays: number
} {
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const startRaw = options.startDate?.trim()
  const endRaw = options.endDate?.trim()

  if (startRaw && endRaw && /^\d{4}-\d{2}-\d{2}$/.test(startRaw) && /^\d{4}-\d{2}-\d{2}$/.test(endRaw)) {
    const start = startRaw <= endRaw ? startRaw : endRaw
    const end = endRaw >= startRaw ? endRaw : startRaw
    const cappedEnd = end > todayStr ? todayStr : end
    const sinceIso = `${start}T00:00:00.000Z`
    const untilIso = `${cappedEnd}T23:59:59.999Z`
    const windowDays = Math.max(
      1,
      Math.ceil((parseISO(cappedEnd).getTime() - parseISO(start).getTime()) / (24 * 60 * 60 * 1000)) + 1
    )
    return { sinceIso, untilIso, startDateStr: start, endDateStr: cappedEnd, windowDays }
  }

  const days = Math.min(Math.max(options.windowDays ?? 30, 1), 90)
  const endDateStr = todayStr
  const startDateStr = format(subDays(new Date(), days - 1), 'yyyy-MM-dd')
  return {
    sinceIso: `${startDateStr}T00:00:00.000Z`,
    untilIso: `${endDateStr}T23:59:59.999Z`,
    startDateStr,
    endDateStr,
    windowDays: days,
  }
}

function inboundLooksLocalhost(snap: unknown): boolean {
  if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return false
  const o = snap as Record<string, unknown>
  const ref = typeof o.referrer === 'string' ? o.referrer : ''
  const landing = typeof o.first_landing_page === 'string' ? o.first_landing_page : ''
  return isLocalhostReferrer(ref) || isLocalhostReferrer(landing)
}

function bumpKeyword(
  map: Map<string, AcquisitionKeywordRow>,
  keyword: string,
  search_engine: string
): AcquisitionKeywordRow {
  const key = keyword.toLowerCase()
  let row = map.get(key)
  if (!row) {
    row = { keyword, search_engine, touchpoints: 0, signups: 0 }
    map.set(key, row)
  }
  row.touchpoints += 1
  return row
}

function bumpSource(map: Map<string, AcquisitionSourceRow>, source: string): AcquisitionSourceRow {
  const key = source || 'direct'
  let row = map.get(key)
  if (!row) {
    row = {
      source: key,
      lands: 0,
      site_visits: 0,
      widget_starts: 0,
      widget_completes: 0,
      signups: 0,
      trial_conversions: 0,
      total_touchpoints: 0,
    }
    map.set(key, row)
  }
  row.total_touchpoints += 1
  return row
}

function referrerFromMetadata(metadata: unknown): string {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return ''
  const ref = (metadata as Record<string, unknown>).referrer
  return typeof ref === 'string' ? ref : ''
}

function kindLabel(kind: AcquisitionFeedKind): string {
  switch (kind) {
    case 'signup':
      return 'Signed up'
    case 'land':
      return 'Landed (blog/home)'
    case 'widget_start':
      return 'Started widget'
    case 'widget_complete':
      return 'Finished widget'
    case 'trial_conversion':
      return 'Trial gift signup'
    case 'site_visit':
      return 'Site visit'
    default:
      return kind
  }
}

function funnelEventKind(eventType: string): AcquisitionFeedKind | null {
  if (eventType === 'page_view') return 'land'
  if (eventType === 'start') return 'widget_start'
  if (eventType === 'complete') return 'widget_complete'
  if (eventType === 'conversion') return 'trial_conversion'
  return null
}

function computeLeakHints(
  totals: AcquisitionHubPayload['totals'],
  bySource: AcquisitionSourceRow[],
  funnelRates: AcquisitionFunnelRates
): AcquisitionLeakHint[] {
  const hints: AcquisitionLeakHint[] = []
  const totalVisits = totals.lands + totals.site_visits

  if (totals.lands >= 5 && funnelRates.land_to_start_pct != null && funnelRates.land_to_start_pct < 20) {
    hints.push({
      id: 'read-only-blog',
      severity: 'high',
      title: 'Blog readers skip the widget',
      detail: `Only ${funnelRates.land_to_start_pct}% of blog/home lands start a widget. Content is arriving; the interactive hook is not.`,
    })
  }

  if (totals.widget_starts >= 3 && funnelRates.start_to_complete_pct != null && funnelRates.start_to_complete_pct < 50) {
    hints.push({
      id: 'widget-friction',
      severity: 'high',
      title: 'Widget drop-off mid-flow',
      detail: `${funnelRates.start_to_complete_pct}% finish after starting. The diagnostic may feel long or unclear before the payoff.`,
    })
  }

  if (totalVisits >= 10 && totals.signups === 0) {
    hints.push({
      id: 'traffic-no-signups',
      severity: 'high',
      title: 'Traffic without accounts',
      detail: `${totalVisits} tracked visits in this window but zero signups. Check homepage CTA, pricing clarity, or whether traffic is bot/low-intent.`,
    })
  }

  if (totals.site_visits >= totals.lands * 2 && totals.lands > 0) {
    hints.push({
      id: 'homepage-not-blog',
      severity: 'medium',
      title: 'Homepage/pricing visits dominate',
      detail: 'More general site visits than blog lands — growth may be direct/product-led, not content-led. Optimize / and /pricing, not only posts.',
    })
  }

  const topSource = bySource[0]
  if (topSource && topSource.signups === 0 && topSource.total_touchpoints >= 5) {
    hints.push({
      id: 'top-source-no-signups',
      severity: 'medium',
      title: `"${topSource.source}" brings traffic, not users`,
      detail: `Your busiest source (${topSource.total_touchpoints} touchpoints) produced zero signups here. Double-check landing page and offer for that channel.`,
    })
  }

  if (totals.widget_completes >= 2 && totals.trial_conversions === 0 && totals.signups === 0) {
    hints.push({
      id: 'widget-no-convert',
      severity: 'medium',
      title: 'Widget finished, no signup',
      detail: 'People complete the diagnostic but do not claim trial or create accounts. Review gift CTA and signup friction after the payoff screen.',
    })
  }

  if (hints.length === 0 && totalVisits === 0 && totals.signups === 0) {
    hints.push({
      id: 'no-data',
      severity: 'low',
      title: 'Quiet window',
      detail: 'No tracked visits or signups in this range. Widen dates or confirm migrations 150–151 and deploy are live.',
    })
  }

  return hints.slice(0, 5)
}

function buildTopLandingPages(feed: AcquisitionFeedRow[]): AcquisitionLandingPageRow[] {
  const map = new Map<string, { visits: number; signups: number }>()
  for (const row of feed) {
    const path = row.path?.split('?')[0]?.trim()
    if (!path) continue
    const cur = map.get(path) ?? { visits: 0, signups: 0 }
    if (row.kind === 'signup') cur.signups += 1
    else if (row.kind === 'land' || row.kind === 'site_visit') cur.visits += 1
    map.set(path, cur)
  }
  return Array.from(map.entries())
    .map(([path, v]) => ({ path, visits: v.visits, signups: v.signups }))
    .sort((a, b) => b.visits + b.signups - (a.visits + a.signups))
    .slice(0, 12)
}

export async function buildAcquisitionHub(
  db: SupabaseClient,
  options: BuildAcquisitionOptions = {}
): Promise<AcquisitionHubPayload> {
  const { sinceIso, untilIso, startDateStr, endDateStr, windowDays } = resolveDateRange(options)

  const [signupsRes, funnelRes, pageViewsRes] = await Promise.all([
    db
      .from('user_profiles')
      .select('id, email, name, preferred_name, created_at, acquisition_snapshot')
      .gte('created_at', sinceIso)
      .lte('created_at', untilIso)
      .order('created_at', { ascending: false })
      .limit(150),
    db
      .from('funnel_analytics')
      .select('funnel_id, event_type, created_at, source, visitor_id, inbound_snapshot, page_path')
      .gte('created_at', sinceIso)
      .lte('created_at', untilIso)
      .order('created_at', { ascending: false })
      .limit(400),
    db
      .from('page_views')
      .select('path, entered_at, metadata, user_id')
      .gte('entered_at', sinceIso)
      .lte('entered_at', untilIso)
      .order('entered_at', { ascending: false })
      .limit(600),
  ])

  if (signupsRes.error) throw signupsRes.error
  if (funnelRes.error) throw funnelRes.error
  if (pageViewsRes.error) throw pageViewsRes.error

  type SignupRow = {
    id: string
    email: string | null
    name: string | null
    preferred_name: string | null
    created_at: string
    acquisition_snapshot: unknown
  }
  type FunnelRow = {
    funnel_id: string
    event_type: string
    created_at: string
    source: string
    visitor_id: string
    inbound_snapshot: unknown
    page_path: string | null
  }
  type PageViewRow = {
    path: string
    entered_at: string
    metadata: unknown
    user_id: string | null
  }

  const signups = (signupsRes.data ?? []) as SignupRow[]
  const funnelRows = (funnelRes.data ?? []) as FunnelRow[]
  const pageViews = (pageViewsRes.data ?? []) as PageViewRow[]

  const sourceMap = new Map<string, AcquisitionSourceRow>()
  const keywordMap = new Map<string, AcquisitionKeywordRow>()
  const feed: AcquisitionFeedRow[] = []

  const totals = {
    signups: 0,
    lands: 0,
    site_visits: 0,
    widget_starts: 0,
    widget_completes: 0,
    trial_conversions: 0,
  }

  for (const row of signups) {
    if (isExcludedFromAdminAnalytics({ id: row.id, email: row.email })) continue

    const snapshot = parseUserAcquisitionSnapshot(row.acquisition_snapshot)
    const source = acquisitionSourceLabel(snapshot)
    const kw = keywordFromInboundSnapshot(snapshot ?? row.acquisition_snapshot)
    const userLabel =
      row.preferred_name?.trim() ||
      row.name?.trim() ||
      row.email?.split('@')[0] ||
      row.id.slice(0, 8)
    const landing = snapshot?.first_landing_page?.trim()

    totals.signups += 1
    bumpSource(sourceMap, source).signups += 1
    if (kw.search_keyword) bumpKeyword(keywordMap, kw.search_keyword, kw.search_engine).signups += 1

    feed.push({
      at: row.created_at,
      kind: 'signup',
      source,
      detail: `${userLabel} created an account`,
      path: landing || undefined,
      user_id: row.id,
      user_label: userLabel,
      ...(kw.search_keyword
        ? { search_keyword: kw.search_keyword, search_engine: kw.search_engine }
        : {}),
    })
  }

  for (const row of funnelRows) {
    if (inboundLooksLocalhost(row.inbound_snapshot)) continue

    const kind = funnelEventKind(row.event_type)
    if (!kind) continue

    const source = inboundLabelFromSnapshot(row.inbound_snapshot)
    const kw = keywordFromInboundSnapshot(row.inbound_snapshot)
    const path = row.page_path?.trim() || undefined
    const srcRow = bumpSource(sourceMap, source)

    if (kind === 'land') {
      totals.lands += 1
      srcRow.lands += 1
    } else if (kind === 'widget_start') {
      totals.widget_starts += 1
      srcRow.widget_starts += 1
    } else if (kind === 'widget_complete') {
      totals.widget_completes += 1
      srcRow.widget_completes += 1
    } else if (kind === 'trial_conversion') {
      totals.trial_conversions += 1
      srcRow.trial_conversions += 1
    }

    if (kw.search_keyword) bumpKeyword(keywordMap, kw.search_keyword, kw.search_engine)

    feed.push({
      at: row.created_at,
      kind,
      source,
      detail: `${kindLabel(kind)} · ${row.funnel_id} (${row.source})`,
      path,
      funnel_id: row.funnel_id,
      visitor_id: row.visitor_id,
      ...(kw.search_keyword
        ? { search_keyword: kw.search_keyword, search_engine: kw.search_engine }
        : {}),
    })
  }

  const radarLandPaths = new Set(
    funnelRows.filter((r) => r.event_type === 'page_view' && r.page_path).map((r) => r.page_path as string)
  )

  for (const row of pageViews) {
    const path = row.path?.trim()
    if (!path || isInternalTrafficPath(path)) continue
    if (row.user_id && isExcludedAdminUserId(row.user_id)) continue
    const normalized = path.split('?')[0] || path
    const isTrackedPath =
      SITE_VISIT_PATHS.has(normalized) ||
      normalized.startsWith('/blog/') ||
      normalized === '/blog'
    if (!isTrackedPath) continue
    if (radarLandPaths.has(path) || radarLandPaths.has(normalized)) continue

    const referrer = referrerFromMetadata(row.metadata)
    if (isLocalhostReferrer(referrer)) continue
    const source = inboundLabelFromReferrer(referrer)
    totals.site_visits += 1
    bumpSource(sourceMap, source).site_visits += 1

    feed.push({
      at: row.entered_at,
      kind: 'site_visit',
      source,
      detail: `Visited ${normalized}${row.user_id ? ' (logged in)' : ''}`,
      path: normalized,
      user_id: row.user_id ?? undefined,
    })
  }

  feed.sort((a, b) => b.at.localeCompare(a.at))

  const by_source = Array.from(sourceMap.values()).sort(
    (a, b) => b.total_touchpoints - a.total_touchpoints || b.signups - a.signups
  )

  const by_keyword = Array.from(keywordMap.values()).sort(
    (a, b) => b.touchpoints - a.touchpoints || b.signups - a.signups
  )

  const totalVisits = totals.lands + totals.site_visits
  const funnel_rates: AcquisitionFunnelRates = {
    land_to_start_pct: pct(totals.widget_starts, totals.lands),
    start_to_complete_pct: pct(totals.widget_completes, totals.widget_starts),
    complete_to_signup_pct: pct(totals.signups, totals.widget_completes),
    visit_to_signup_pct: pct(totals.signups, totalVisits),
  }

  const fullFeed = feed.slice(0, 150)
  const top_landing_pages = buildTopLandingPages(fullFeed)
  const leak_hints = computeLeakHints(totals, by_source, funnel_rates)

  const sample_note =
    totalVisits + totals.signups < 3
      ? 'Very small sample in this date range — treat percentages as directional until you have more traffic.'
      : undefined

  return {
    date_range_start: startDateStr,
    date_range_end: endDateStr,
    window_days: windowDays,
    totals,
    funnel_rates,
    by_source,
    by_keyword,
    top_landing_pages,
    leak_hints,
    feed: fullFeed,
    sample_note,
    excludes_internal_team: true,
    exclusion_note: INTERNAL_TRAFFIC_EXCLUSION_NOTE,
  }
}

export { kindLabel }
