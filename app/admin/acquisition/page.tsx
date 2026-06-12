'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO, subDays } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ArrowLeft, Globe2, Loader2, Sparkles } from 'lucide-react'
import type {
  AcquisitionFeedKind,
  AcquisitionHubPayload,
  AcquisitionLeakHint,
} from '@/lib/admin/build-acquisition-hub'
import { kindLabel } from '@/lib/admin/build-acquisition-hub'
import { formatFallbackAcquisitionAdvice } from '@/lib/admin/acquisition-deer-advisor'
import { formatDwellSeconds } from '@/lib/admin/flow-path-tags'
import { InfoTooltip } from '@/components/InfoTooltip'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'

const ACQUISITION_HINTS = {
  pageTitle:
    'Master view of first-touch traffic: where people come from, what pages they hit, and whether they sign up — blog, homepage, and direct signup paths in one place.',
  dateRange:
    'Filter all stats, sources, and the activity feed to visits and signups between these dates (UTC midnight boundaries).',
  signups:
    'New accounts created (user_profiles.created_at). Source comes from acquisition_snapshot captured at signup.',
  lands:
    'Blog or home page opens tracked by Founder Radar (page_view). Includes read-only visitors who never tap the widget.',
  siteVisits:
    'Total page-view visits across homepage, pricing, auth, and blog paths (not Radar lands). See split columns below.',
  homepageVisitsCol: 'page_views to / (homepage).',
  pricingVisitsCol: 'page_views to /pricing.',
  signupPageVisitsCol: 'page_views to /auth/signup.',
  loginVisitsCol: 'page_views to /auth/login.',
  blogVisitsCol: 'page_views to /blog or /blog/… (excludes paths already counted as Radar lands).',
  widgetStarts: 'First interaction with an embedded blog/home diagnostic widget (funnel start event).',
  widgetCompletes: 'Visitor reached the widget payoff/summary screen (funnel complete event).',
  trialConversions: 'Claimed the blog trial gift and tied signup to that funnel (conversion event).',
  landToStart: 'Of blog/home lands, what % also started a widget. Low = content readers who skip the tool.',
  startToComplete: 'Of widget starts, what % finished. Low = friction or unclear flow mid-diagnostic.',
  completeToSignup: 'Of widget finishes, what % became accounts in this window. Low = gift/CTA leak.',
  visitToSignup: 'Of all tracked visits (lands + site visits), what % signed up. Your top-of-funnel health metric.',
  bySource:
    'Grouped by first-touch label: utm_source if present, else external referrer hostname, else direct. Same label for signups and anonymous visits.',
  sourceCol: 'First-touch channel or referrer (e.g. google, linkedin.com, email, direct).',
  signupsCol: 'Accounts created where this was their captured acquisition source.',
  landsCol: 'Radar page_view events attributed to this source.',
  siteVisitsCol: 'General site page views (/, /pricing, /blog, etc.) with this referrer/source.',
  startsCol: 'Widget start events from this source.',
  completesCol: 'Widget complete events from this source.',
  trialCol: 'Trial gift conversion events from this source.',
  topPages:
    'Pages with the most lands and site visits in this window. Signups column uses first landing page from acquisition_snapshot when available.',
  keySitePages:
    'Page views on core product paths (homepage, pricing, signup) from batched analytics — same date range as this hub. Excludes admin/localhost traffic.',
  keySitePagesVisitsCol: 'Navigation events recorded in page_views for this path.',
  keySitePagesSignupsCol: 'Accounts whose captured first landing page was this path.',
  activityFeed:
    'Chronological mix of signups, blog lands, widget steps, trial gifts, and key site visits — newest first.',
  eventCol: 'What happened: signup, land, widget step, trial conversion, or site visit.',
  sourceFeedCol: 'First-touch source stored with that event.',
  mrsDeer:
    'Rule-based leak hints appear instantly. Ask Mrs. Deer for a strategic read on which source or page to fix first — uses AI when available, rule-based fallback otherwise.',
  internalExclusion:
    'Counts exclude founder/team admin accounts, /admin pages, and localhost dev traffic. On localhost:3000 nothing new is recorded. Old local rows without a localhost referrer may still appear until they fall outside your date range.',
  searchKeywords:
    'Search terms when we can see them: utm_term on ad/campaign links, or query string from Bing/DuckDuckGo/etc. referrers. Google organic almost never sends the keyword in the browser — use Google Search Console for that.',
  keywordCol: 'Query or utm_term captured on first visit.',
  keywordEngineCol: 'Where the keyword came from: utm (paid tag), google, bing, duckduckgo, etc.',
  keywordFeedCol: 'Search keyword on first touch, when captured.',
  referrerFeedCol:
    'External referrer hostname from first-touch cookie (Radar) or page metadata. Empty when typed URL, bookmark, or referrer was stripped.',
  utmFeedCol: 'UTM tags on first landing URL: source / medium / campaign, plus utm_term when present.',
  firstLandingCol: 'First URL the visitor hit on this site (includes query string with ?utm_… when tagged).',
  dwellCol:
    'Seconds on this step before the next tracked action — next funnel step or next page in the same tab session.',
  nextStepCol:
    'Where they went next on-site: another page (→ /pricing), widget step, or trial signup. Blank if no further tracked action.',
} as const

const STAT_CARDS = [
  { key: 'signups' as const, label: 'Signups', hint: ACQUISITION_HINTS.signups },
  { key: 'lands' as const, label: 'Blog/home lands', hint: ACQUISITION_HINTS.lands },
  { key: 'widget_starts' as const, label: 'Widget starts', hint: ACQUISITION_HINTS.widgetStarts },
  { key: 'widget_completes' as const, label: 'Widget completes', hint: ACQUISITION_HINTS.widgetCompletes },
  { key: 'trial_conversions' as const, label: 'Trial conversions', hint: ACQUISITION_HINTS.trialConversions },
] as const

const SITE_VISIT_STAT_CARDS = [
  { key: 'homepage_visits' as const, label: 'Homepage', path: '/', hint: ACQUISITION_HINTS.homepageVisitsCol },
  { key: 'pricing_visits' as const, label: 'Pricing', path: '/pricing', hint: ACQUISITION_HINTS.pricingVisitsCol },
  {
    key: 'signup_page_visits' as const,
    label: 'Signup page',
    path: '/auth/signup',
    hint: ACQUISITION_HINTS.signupPageVisitsCol,
  },
  { key: 'login_visits' as const, label: 'Login', path: '/auth/login', hint: ACQUISITION_HINTS.loginVisitsCol },
  { key: 'blog_visits' as const, label: 'Blog (views)', path: '/blog…', hint: ACQUISITION_HINTS.blogVisitsCol },
] as const

const KIND_STYLES: Record<AcquisitionFeedKind, string> = {
  signup: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  land: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  widget_start: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
  widget_complete: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
  trial_conversion: 'bg-[#ef725c]/20 text-[#ffb4a6] border-[#ef725c]/40',
  site_visit: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/40',
}

const FEED_FILTERS: Array<{ id: 'all' | AcquisitionFeedKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'signup', label: 'Signups' },
  { id: 'land', label: 'Lands' },
  { id: 'site_visit', label: 'Site visits' },
  { id: 'widget_start', label: 'Starts' },
  { id: 'widget_complete', label: 'Completes' },
  { id: 'trial_conversion', label: 'Trial conv.' },
]

function formatTime(iso: string) {
  try {
    return formatInTimeZone(parseISO(iso), 'UTC', 'MMM d, HH:mm')
  } catch {
    return iso.slice(0, 16)
  }
}

function HeaderWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide">
      {label}
      <InfoTooltip text={hint} presentation="popover" position="bottom" tone="controlRoom" />
    </span>
  )
}

function StatTitleWithHint({ label, hint }: { label: string; hint: string }) {
  return (
    <p className="m-0 flex flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wide text-zinc-500">
      <span>{label}</span>
      <InfoTooltip text={hint} presentation="popover" position="bottom" tone="controlRoom" />
    </p>
  )
}

function leakSeverityClass(severity: AcquisitionLeakHint['severity']) {
  if (severity === 'high') return 'border-red-500/40 bg-red-500/10'
  if (severity === 'medium') return 'border-amber-500/40 bg-amber-500/10'
  return 'border-zinc-600 bg-zinc-800/50'
}

export default function AdminAcquisitionPage() {
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 29), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [data, setData] = useState<AcquisitionHubPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedFilter, setFeedFilter] = useState<'all' | AcquisitionFeedKind>('all')
  const [deerAdvice, setDeerAdvice] = useState<string | null>(null)
  const [deerLoading, setDeerLoading] = useState(false)
  const [deerFallback, setDeerFallback] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDeerAdvice(null)
    setDeerFallback(false)
    try {
      const qs = new URLSearchParams({ startDate, endDate })
      const res = await fetch(`/api/admin/acquisition?${qs.toString()}`, { cache: 'no-store' })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string; hint?: string }
        setError([j.error || `HTTP ${res.status}`, j.hint].filter(Boolean).join('\n\n'))
        setData(null)
        return
      }
      const json = (await res.json()) as AcquisitionHubPayload
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const applyPreset = (days: number) => {
    setEndDate(format(new Date(), 'yyyy-MM-dd'))
    setStartDate(format(subDays(new Date(), days - 1), 'yyyy-MM-dd'))
  }

  const filteredFeed = useMemo(() => {
    if (!data) return []
    if (feedFilter === 'all') return data.feed
    return data.feed.filter((r) => r.kind === feedFilter)
  }, [data, feedFilter])

  const requestDeerAnalysis = async () => {
    if (!data) return
    setDeerLoading(true)
    setDeerAdvice(null)
    setDeerFallback(false)
    try {
      const res = await fetch('/api/admin/acquisition/analyze', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: data }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        advice?: string
        fallback?: boolean
        error?: string
      }
      if (!res.ok) {
        setDeerAdvice(formatFallbackAcquisitionAdvice(data))
        setDeerFallback(true)
        return
      }
      setDeerAdvice(json.advice ?? formatFallbackAcquisitionAdvice(data))
      setDeerFallback(json.fallback === true)
    } catch {
      setDeerAdvice(formatFallbackAcquisitionAdvice(data))
      setDeerFallback(true)
    } finally {
      setDeerLoading(false)
    }
  }

  const rates = data?.funnel_rates

  return (
    <div className="min-h-screen bg-[#0a0f14] text-zinc-100">
      <div className="border-b border-zinc-800 bg-[#0d1219] px-6 py-6">
        <div className="mx-auto max-w-6xl flex flex-wrap items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe2 className="h-6 w-6 text-[#ef725c]" aria-hidden />
              <div>
                <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight">
                  Traffic &amp; acquisition
                  <InfoTooltip
                    text={ACQUISITION_HINTS.pageTitle}
                    presentation="popover"
                    position="bottom"
                    tone="controlRoom"
                  />
                </h1>
                <p className="text-sm text-zinc-500">Where visitors come from — and where they leak.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-zinc-500 inline-flex items-center gap-1">
                Range
                <InfoTooltip
                  text={ACQUISITION_HINTS.dateRange}
                  presentation="popover"
                  position="bottom"
                  tone="controlRoom"
                />
              </span>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 [color-scheme:dark]"
                aria-label="Start date"
              />
              <span className="text-zinc-600">→</span>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100 [color-scheme:dark]"
                aria-label="End date"
              />
              <div className="flex gap-1">
                {[
                  { d: 7, label: '7d' },
                  { d: 30, label: '30d' },
                  { d: 90, label: '90d' },
                ].map(({ d, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyPreset(d)}
                    className="rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-400 hover:border-zinc-500 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading acquisition data…
          </div>
        ) : error ? (
          <div className="whitespace-pre-wrap rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : data ? (
          <>
            {data.sample_note ? (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                {data.sample_note}
              </p>
            ) : null}

            {data.excludes_internal_team ? (
              <p className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-xs text-zinc-400">
                <span>{data.exclusion_note}</span>
                <InfoTooltip
                  text={ACQUISITION_HINTS.internalExclusion}
                  presentation="popover"
                  position="bottom"
                  tone="controlRoom"
                />
              </p>
            ) : null}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {STAT_CARDS.map(({ key, label, hint }) => (
                <div key={key} className="rounded-xl border border-zinc-800 bg-[#0d1219] px-4 py-3">
                  <StatTitleWithHint label={label} hint={hint} />
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{data.totals[key]}</p>
                  <p className="text-[10px] text-zinc-600">
                    {data.date_range_start} → {data.date_range_end}
                  </p>
                </div>
              ))}
            </section>

            <section className="space-y-2">
              <h2 className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Site page views
                <InfoTooltip
                  text={ACQUISITION_HINTS.siteVisits}
                  presentation="popover"
                  position="bottom"
                  tone="controlRoom"
                />
                <span className="font-normal normal-case text-zinc-600">
                  ({data.totals.site_visits} total)
                </span>
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {SITE_VISIT_STAT_CARDS.map(({ key, label, path, hint }) => (
                  <div key={key} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
                    <StatTitleWithHint label={label} hint={hint} />
                    <p className="mt-1 text-xl font-semibold tabular-nums">{data.totals[key]}</p>
                    <p className="truncate font-mono text-[10px] text-zinc-600" title={path}>
                      {path}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Visit → signup', value: rates?.visit_to_signup_pct, hint: ACQUISITION_HINTS.visitToSignup },
                { label: 'Land → start', value: rates?.land_to_start_pct, hint: ACQUISITION_HINTS.landToStart },
                {
                  label: 'Start → complete',
                  value: rates?.start_to_complete_pct,
                  hint: ACQUISITION_HINTS.startToComplete,
                },
                {
                  label: 'Complete → signup',
                  value: rates?.complete_to_signup_pct,
                  hint: ACQUISITION_HINTS.completeToSignup,
                },
              ].map(({ label, value, hint }) => (
                <div key={label} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3">
                  <StatTitleWithHint label={label} hint={hint} />
                  <p className="mt-1 text-xl font-semibold tabular-nums text-[#ef725c]">
                    {value != null ? `${value}%` : '—'}
                  </p>
                </div>
              ))}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-[#0d1219] p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-3">
                  <MrsDeerAvatar expression="thoughtful" size="medium" className="shrink-0" />
                  <div>
                    <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                      Mrs. Deer — leak analysis
                      <InfoTooltip
                        text={ACQUISITION_HINTS.mrsDeer}
                        presentation="popover"
                        position="bottom"
                        tone="controlRoom"
                      />
                    </h2>
                    <p className="mt-1 text-xs text-zinc-500">
                      Instant hints from your numbers; deeper read on demand.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void requestDeerAnalysis()}
                  disabled={deerLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#ef725c] px-4 py-2 text-sm font-medium text-white hover:bg-[#d9634f] disabled:opacity-60"
                >
                  {deerLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Ask Mrs. Deer
                </button>
              </div>

              {data.leak_hints.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {data.leak_hints.map((hint) => (
                    <li
                      key={hint.id}
                      className={`rounded-lg border px-4 py-3 text-sm ${leakSeverityClass(hint.severity)}`}
                    >
                      <p className="font-medium text-zinc-100">{hint.title}</p>
                      <p className="mt-1 text-zinc-400">{hint.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {deerAdvice ? (
                <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/60 px-4 py-3">
                  {deerFallback ? (
                    <p className="mb-2 text-xs text-zinc-500">Rule-based review (AI unavailable)</p>
                  ) : null}
                  <MarkdownText className="text-sm leading-relaxed text-zinc-200">{deerAdvice}</MarkdownText>
                </div>
              ) : null}
            </section>

            <section className="space-y-3">
              <div>
                <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  By source
                  <InfoTooltip
                    text={ACQUISITION_HINTS.bySource}
                    presentation="popover"
                    position="bottom"
                    tone="controlRoom"
                  />
                </h2>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0d1219] text-left text-xs text-zinc-500">
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Source" hint={ACQUISITION_HINTS.sourceCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Signups" hint={ACQUISITION_HINTS.signupsCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Lands" hint={ACQUISITION_HINTS.landsCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">
                        <HeaderWithHint label="Home" hint={ACQUISITION_HINTS.homepageVisitsCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">
                        <HeaderWithHint label="Pricing" hint={ACQUISITION_HINTS.pricingVisitsCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">
                        <HeaderWithHint label="Signup" hint={ACQUISITION_HINTS.signupPageVisitsCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">
                        <HeaderWithHint label="Login" hint={ACQUISITION_HINTS.loginVisitsCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">
                        <HeaderWithHint label="Blog" hint={ACQUISITION_HINTS.blogVisitsCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Starts" hint={ACQUISITION_HINTS.startsCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Completes" hint={ACQUISITION_HINTS.completesCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Trial conv." hint={ACQUISITION_HINTS.trialCol} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.by_source.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-zinc-500">
                          No traffic recorded in this range.
                        </td>
                      </tr>
                    ) : (
                      data.by_source.map((row) => (
                        <tr key={row.source} className="border-b border-zinc-800/80 last:border-0">
                          <td className="px-4 py-3 font-medium text-emerald-300">{row.source}</td>
                          <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                          <td className="px-4 py-3 tabular-nums">{row.lands}</td>
                          <td className="px-4 py-3 tabular-nums">{row.homepage_visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.pricing_visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.signup_page_visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.login_visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.blog_visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.widget_starts}</td>
                          <td className="px-4 py-3 tabular-nums">{row.widget_completes}</td>
                          <td className="px-4 py-3 tabular-nums">{row.trial_conversions}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Search keywords
                <InfoTooltip
                  text={ACQUISITION_HINTS.searchKeywords}
                  presentation="popover"
                  position="bottom"
                  tone="controlRoom"
                />
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0d1219] text-left text-xs text-zinc-500">
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Keyword" hint={ACQUISITION_HINTS.keywordCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Engine" hint={ACQUISITION_HINTS.keywordEngineCol} />
                      </th>
                      <th className="px-4 py-3 tabular-nums">Touchpoints</th>
                      <th className="px-4 py-3 tabular-nums">Signups</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!data.by_keyword?.length ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                          No keywords captured yet. Add utm_term to campaign links, or expect sparse data from Google
                          organic.
                        </td>
                      </tr>
                    ) : (
                      data.by_keyword.map((row) => (
                        <tr key={row.keyword} className="border-b border-zinc-800/80 last:border-0">
                          <td className="max-w-xs truncate px-4 py-3 font-medium text-violet-300" title={row.keyword}>
                            {row.keyword}
                          </td>
                          <td className="px-4 py-3 text-zinc-400">{row.search_engine || '—'}</td>
                          <td className="px-4 py-3 tabular-nums">{row.touchpoints}</td>
                          <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                Key site pages
                <InfoTooltip
                  text={ACQUISITION_HINTS.keySitePages}
                  presentation="popover"
                  position="bottom"
                  tone="controlRoom"
                />
              </h2>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0d1219] text-left text-xs text-zinc-500">
                      <th className="px-4 py-3">Page</th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Visits" hint={ACQUISITION_HINTS.keySitePagesVisitsCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Signups" hint={ACQUISITION_HINTS.keySitePagesSignupsCol} />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.key_site_pages ?? []).map((row) => (
                      <tr key={row.path} className="border-b border-zinc-800/80 last:border-0">
                        <td className="px-4 py-3">
                          <span className="font-medium text-zinc-200">{row.label}</span>
                          <span
                            className="mt-0.5 block max-w-md truncate font-mono text-xs text-zinc-500"
                            title={row.path}
                          >
                            {row.path}
                          </span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{row.visits}</td>
                        <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {data.top_landing_pages.length > 0 ? (
              <section className="space-y-3">
                <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                  Top landing pages
                  <InfoTooltip
                    text={ACQUISITION_HINTS.topPages}
                    presentation="popover"
                    position="bottom"
                    tone="controlRoom"
                  />
                </h2>
                <div className="overflow-x-auto rounded-xl border border-zinc-800">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 bg-[#0d1219] text-left text-xs uppercase text-zinc-500">
                        <th className="px-4 py-3">Page</th>
                        <th className="px-4 py-3 tabular-nums">Visits</th>
                        <th className="px-4 py-3 tabular-nums">Signups</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.top_landing_pages.map((row) => (
                        <tr key={row.path} className="border-b border-zinc-800/80 last:border-0">
                          <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-zinc-300" title={row.path}>
                            {row.path}
                          </td>
                          <td className="px-4 py-3 tabular-nums">{row.visits}</td>
                          <td className="px-4 py-3 tabular-nums">{row.signups}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}

            <section className="space-y-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold uppercase tracking-wider text-zinc-500">
                    Activity feed
                    <InfoTooltip
                      text={ACQUISITION_HINTS.activityFeed}
                      presentation="popover"
                      position="bottom"
                      tone="controlRoom"
                    />
                  </h2>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1">
                    {FEED_FILTERS.map(({ id, label }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setFeedFilter(id)}
                        className={`rounded-md px-2 py-1 text-xs ${
                          feedFilter === id
                            ? 'bg-[#ef725c] text-white'
                            : 'border border-zinc-700 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <Link href="/admin/radar" className="text-xs text-[#ef725c] hover:underline">
                    Widget detail → Radar
                  </Link>
                </div>
              </div>
              <div className="overflow-x-auto rounded-xl border border-zinc-800">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-[#0d1219] text-left text-xs text-zinc-500">
                      <th className="px-4 py-3">Time (UTC)</th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Event" hint={ACQUISITION_HINTS.eventCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Source" hint={ACQUISITION_HINTS.sourceFeedCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Referrer" hint={ACQUISITION_HINTS.referrerFeedCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="UTM" hint={ACQUISITION_HINTS.utmFeedCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="First landing" hint={ACQUISITION_HINTS.firstLandingCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="On page" hint={ACQUISITION_HINTS.dwellCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Then" hint={ACQUISITION_HINTS.nextStepCol} />
                      </th>
                      <th className="px-4 py-3">
                        <HeaderWithHint label="Keyword" hint={ACQUISITION_HINTS.keywordFeedCol} />
                      </th>
                      <th className="px-4 py-3">Detail</th>
                      <th className="px-4 py-3">Page</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeed.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-4 py-8 text-center text-zinc-500">
                          No events for this filter.
                        </td>
                      </tr>
                    ) : (
                      filteredFeed.map((row, i) => (
                        <tr key={`${row.at}-${row.kind}-${i}`} className="border-b border-zinc-800/80 last:border-0">
                          <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{formatTime(row.at)}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${KIND_STYLES[row.kind]}`}
                            >
                              {kindLabel(row.kind)}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-emerald-300">{row.source}</td>
                          <td
                            className="max-w-[120px] truncate px-4 py-3 text-sky-300/90 text-xs"
                            title={row.referrer_url || row.referrer || undefined}
                          >
                            {row.referrer || '—'}
                          </td>
                          <td
                            className="max-w-[160px] truncate px-4 py-3 text-xs text-amber-200/80"
                            title={row.utm_summary || undefined}
                          >
                            {row.utm_summary || '—'}
                          </td>
                          <td
                            className="max-w-[160px] truncate px-4 py-3 font-mono text-[11px] text-zinc-500"
                            title={row.first_landing}
                          >
                            {row.first_landing || '—'}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 tabular-nums text-xs text-zinc-400">
                            {formatDwellSeconds(row.dwell_seconds ?? null) || '—'}
                          </td>
                          <td
                            className="max-w-[140px] truncate px-4 py-3 text-xs text-zinc-300"
                            title={row.next_step}
                          >
                            {row.next_step || '—'}
                          </td>
                          <td
                            className="max-w-[120px] truncate px-4 py-3 text-violet-300/90 text-xs"
                            title={row.search_keyword}
                          >
                            {row.search_keyword || '—'}
                          </td>
                          <td className="max-w-[320px] px-4 py-3 text-zinc-300">
                            {row.user_id ? (
                              <Link
                                href={`/admin/list/users/${row.user_id}`}
                                className="text-[#ef725c] hover:underline"
                              >
                                {row.detail}
                              </Link>
                            ) : (
                              row.detail
                            )}
                          </td>
                          <td
                            className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-zinc-500"
                            title={row.path}
                          >
                            {row.path || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  )
}
