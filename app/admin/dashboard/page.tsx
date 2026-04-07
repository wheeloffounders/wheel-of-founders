'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Activity,
  HeartPulse,
  Loader2,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { flowTagClass, formatDwellSeconds, formatMinutesToFirstMorning } from '@/lib/admin/flow-path-tags'
import { EMPTY_OUTREACH_7D, type FounderJourneyCommandCenterPayload } from '@/lib/admin/tracking'
import { formatFallbackDeerAdviceMarkdown } from '@/lib/admin/deer-strategic-advisor'
import { CoachVerdictBox } from '@/components/admin/CoachVerdictBox'
import { AdminDashboardHelpBlock } from '@/components/admin/AdminDashboardSectionHelp'
import { UserPulseChart } from '@/components/admin/UserPulseChart'
import {
  coachVerdictCohort,
  coachVerdictDevice,
  coachVerdictEmergency,
  coachVerdictFriction,
  coachVerdictFunnel,
  coachVerdictPulse,
  coachVerdictRetention,
} from '@/lib/admin/dashboard-coach-verdicts'
import { MarkdownText } from '@/components/MarkdownText'
import { InfoTooltip } from '@/components/InfoTooltip'
import { generateUserStory } from '@/lib/admin/user-story-verdict'

export default function AdminFounderJourneyCommandCenterPage() {
  const [data, setData] = useState<FounderJourneyCommandCenterPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [startDate, setStartDate] = useState(() => format(subDays(new Date(), 14), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [strategicReview, setStrategicReview] = useState<string | null>(null)
  const [strategicLoading, setStrategicLoading] = useState(false)
  const [strategicError, setStrategicError] = useState<string | null>(null)
  const [strategicFallback, setStrategicFallback] = useState(false)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      setLoading(true)
      setError(null)
      try {
        const qs = new URLSearchParams({ startDate, endDate })
        const res = await fetch(`/api/admin/founder-journey-dashboard?${qs.toString()}`, {
          credentials: 'include',
        })
        if (!res.ok) {
          if (res.status === 401) setError('Unauthorized — sign in as admin.')
          else setError('Failed to load command center.')
          return
        }
        const json = (await res.json()) as FounderJourneyCommandCenterPayload
        if (!cancelled) setData(json)
      } catch {
        if (!cancelled) setError('Failed to load command center.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [startDate, endDate])

  const funnelBarData = useMemo(() => {
    if (!data?.funnel) return []
    return data.funnel.map((s) => ({
      name: s.label.replace(/\s*\([^)]*\)\s*/g, '').trim(),
      users: s.count,
      id: s.id,
    }))
  }, [data])

  const retentionRows = data?.retentionByShadow ?? []

  const coachNotes = useMemo(() => {
    if (!data) return null
    return {
      pulse: coachVerdictPulse(data.pulse.points),
      funnel: coachVerdictFunnel(data.funnel),
      retention: coachVerdictRetention(data.retentionByShadow),
      emergency: coachVerdictEmergency(data.emergency),
      cohort: coachVerdictCohort(data.funnel[0]?.count ?? 0),
      friction: coachVerdictFriction(data.sensors.avgPostponementsPerUser),
      device: coachVerdictDevice(data.deviceMix),
    }
  }, [data])

  const requestStrategicReview = async () => {
    if (!data) return
    setStrategicLoading(true)
    setStrategicError(null)
    setStrategicReview(null)
    setStrategicFallback(false)
    try {
      const res = await fetch('/api/admin/generate-deer-advice', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: data }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        advice?: string
        error?: string
        fallback?: boolean
        fallbackReason?: string
      }
      if (!res.ok) {
        setStrategicReview(formatFallbackDeerAdviceMarkdown(data))
        setStrategicFallback(true)
        setStrategicError(null)
        return
      }
      setStrategicReview(json.advice ?? '')
      setStrategicFallback(json.fallback === true)
    } catch {
      setStrategicReview(formatFallbackDeerAdviceMarkdown(data))
      setStrategicFallback(true)
      setStrategicError(null)
    } finally {
      setStrategicLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-[#152b50] text-white px-6 py-8 shadow-lg">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <HeartPulse className="w-7 h-7 text-[#ef725c]" />
              Founder Journey Command Center
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Momentum milestones, shadow archetypes (days 1–3 signal), and Deer advice — not page-to-page vanity
              metrics.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-white/80">Cohort (signup)</span>
            <label className="sr-only" htmlFor="admin-cohort-start">
              Start date
            </label>
            <input
              id="admin-cohort-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-white/30 rounded-lg px-2 py-1.5 bg-white/10 text-white [color-scheme:dark]"
            />
            <span className="text-white/60">→</span>
            <label className="sr-only" htmlFor="admin-cohort-end">
              End date
            </label>
            <input
              id="admin-cohort-end"
              type="date"
              value={endDate}
              min={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-white/30 rounded-lg px-2 py-1.5 bg-white/10 text-white [color-scheme:dark]"
            />
            {data && !loading ? (
              <span
                className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs text-white/90 max-md:w-full max-md:text-center"
                title="Pulse sample: Mobile + Tablet vs Desktop among users with a stored User-Agent (new page views populate this)."
              >
                Device mix:{' '}
                {data.deviceMix.knownCount > 0 ? (
                  <>
                    {data.deviceMix.handheldPct}% 📱 / {data.deviceMix.desktopPct}% 💻
                  </>
                ) : (
                  <span className="text-white/70">no UA yet</span>
                )}
                {data.deviceMix.unknownCount > 0 ? (
                  <span className="text-white/60"> · {data.deviceMix.unknownCount} unknown</span>
                ) : null}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {loading ? (
          <div className="text-gray-600 dark:text-gray-300">Loading momentum analytics…</div>
        ) : error ? (
          <div className="text-red-600 dark:text-red-400">{error}</div>
        ) : !data ? null : (
          <>
            {data.sampleNote ? (
              <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg px-3 py-2">
                {data.sampleNote}
              </p>
            ) : null}

            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#ef725c]">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Activity className="w-4 h-4" />
                  Emergency trust
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.emergency.ratePct}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  Visited /emergency → saved next step (notes or committed plan){' '}
                  {data.emergency.trustLeak ? (
                    <span className="text-red-600 font-medium">· Trust leak flagged</span>
                  ) : null}
                </div>
                <CoachVerdictBox text={coachNotes?.emergency} className="mt-3 text-xs [&_p:last-child]:text-[13px]" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-[#152b50]">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Users className="w-4 h-4" />
                  Cohort (signups in window)
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.funnel[0]?.count ?? '—'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  {data.dateRangeStart} → {data.dateRangeEnd} · pulse chart capped for performance
                </div>
                <CoachVerdictBox text={coachNotes?.cohort} className="mt-3 text-xs [&_p:last-child]:text-[13px]" />
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 border-l-4 border-emerald-500">
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Sparkles className="w-4 h-4" />
                  Friction density (avg postpones / user)
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {data.sensors.avgPostponementsPerUser ?? '—'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                  TTV: {data.sensors.ttvInsightSecondsMedian ?? '—'} · {data.sensors.ttvNote}
                </div>
                <CoachVerdictBox text={coachNotes?.friction} className="mt-3 text-xs [&_p:last-child]:text-[13px]" />
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <AdminDashboardHelpBlock
                label="What the User pulse chart shows"
                aside={
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <HeartPulse className="w-5 h-5 text-[#ef725c]" />
                    User pulse
                  </h2>
                }
              >
                <p>
                  Activity density vs. days since signup. Are they daily users or just weekenders? Movement up and to
                  the right means the habit is sticking; flat horizontal bands often mean lurkers who aren&apos;t
                  deepening use.
                </p>
              </AdminDashboardHelpBlock>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                Engagement score (tasks, evenings, decisions in cohort window) vs days since signup — dots colored by
                shadow archetype from first 3 days of signal.
              </p>
              <UserPulseChart points={data.pulse.points} title="" subtitle="" />
              <CoachVerdictBox text={coachNotes?.pulse} className="mt-4" />
              <CoachVerdictBox
                text={coachNotes?.device}
                className="mt-2 text-xs [&_p:last-child]:text-[13px]"
              />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <AdminDashboardHelpBlock
                label="What the milestone funnel shows"
                aside={
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Milestone funnel</h2>
                }
              >
                <p>
                  The leaky bucket. Look for the biggest gap between Morning and Evening — that&apos;s where the daily
                  loop loses steam.
                </p>
              </AdminDashboardHelpBlock>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Onboarded → 1st morning → 1st evening → 3-day streak → Badge Tier 1
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelBarData} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" width={220} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="users" fill="#ef725c" radius={[0, 4, 4, 0]} name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-4 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                {data.funnel.map((s) => (
                  <li key={s.id}>
                    <span className="font-medium text-gray-900 dark:text-white">{s.label}:</span> {s.count}
                    {s.pctOfPrevious != null ? (
                      <span className="text-gray-500"> · {s.pctOfPrevious}% of previous stage</span>
                    ) : null}
                  </li>
                ))}
              </ul>
              <CoachVerdictBox text={coachNotes?.funnel} className="mt-4" />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-amber-200/60 dark:border-amber-900/50">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <AdminDashboardHelpBlock
                  className="mb-0 min-w-0 flex-1"
                  label="What Mrs. Deer verdicts are"
                  aside={
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-600" />
                      Mrs. Deer — actionable verdicts
                    </h2>
                  }
                >
                  <p>
                    The AI strategic layer. It connects funnel gaps to behavioral psychology to give you &quot;the
                    move&quot; for next week.
                  </p>
                </AdminDashboardHelpBlock>
                <button
                  type="button"
                  onClick={() => void requestStrategicReview()}
                  disabled={strategicLoading}
                  className="shrink-0 text-sm font-medium text-white bg-[#152b50] hover:bg-[#1e3a5f] px-4 py-2 rounded-lg disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {strategicLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    'Generate Strategic Review'
                  )}
                </button>
              </div>
              {strategicLoading ? (
                <p className="text-sm text-amber-900/90 dark:text-amber-200/90 mb-4 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mrs. Deer is analyzing the patterns…
                </p>
              ) : null}
              {strategicError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mb-4">{strategicError}</p>
              ) : null}
              {strategicReview ? (
                <div className="mb-6 rounded-lg border border-[#152b50]/25 bg-[#152b50]/5 dark:bg-slate-800/50 px-4 py-4 text-sm text-gray-800 dark:text-gray-100">
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#152b50] dark:text-sky-200 mb-2">
                    Mrs. Deer — strategic review
                    {strategicFallback ? (
                      <span className="text-amber-700 dark:text-amber-300 font-normal normal-case ml-2">
                        (rule-based fallback)
                      </span>
                    ) : null}
                  </div>
                  <MarkdownText className="text-sm leading-relaxed">
                    {strategicReview}
                  </MarkdownText>
                </div>
              ) : null}
              <div className="space-y-3">
                {data.deerAdvice.map((a, i) => (
                  <div
                    key={i}
                    className={`rounded-lg px-4 py-3 border ${
                      a.severity === 'critical'
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
                        : a.severity === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900'
                          : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 dark:text-white">{a.title}</div>
                    <p className="text-sm text-gray-700 dark:text-gray-200 mt-1 leading-relaxed">{a.body}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <AdminDashboardHelpBlock
                label="What shadow retention means"
                aside={
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-[#152b50]" />
                    Retention by shadow archetype
                  </h2>
                }
              >
                <p>
                  Which archetypes find the most value (Strategist vs. Hustler, etc.). A skew here hints your UX is
                  wired for one founder type more than another.
                </p>
              </AdminDashboardHelpBlock>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                % of users with each shadow label (from first 3 days) who had morning or evening activity in the last 7
                days — use to see if the UI skews toward Builders vs Hustlers.
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-600">
                      <th className="py-2 pr-4">Shadow</th>
                      <th className="py-2 pr-4">Cohort (labeled)</th>
                      <th className="py-2 pr-4">Active last 7d</th>
                      <th className="py-2">Retention %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retentionRows.map((r) => (
                      <tr key={r.shadow} className="border-b border-gray-100 dark:border-gray-700/80">
                        <td className="py-2 pr-4 font-medium capitalize">(Shadow) {r.shadow}</td>
                        <td className="py-2 pr-4">{r.cohortUsers}</td>
                        <td className="py-2 pr-4">{r.activeLast7d}</td>
                        <td className="py-2">{r.retentionPct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CoachVerdictBox text={coachNotes?.retention} className="mt-4" />
            </section>

            <section className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
              <AdminDashboardHelpBlock
                label="About the sample users table"
                aside={
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Sample users (pulse batch)</h2>
                }
              >
                <p>
                  Subset used for the scatter plot (not the full cohort). <strong>Recent path</strong> uses the last few
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10"> page_views</code> with <strong>dwell
                  time</strong> (seconds until the next view). Red warning = under 5s (likely skimmed).{' '}
                  <strong>Device</strong> (📱/💻) = parsed from the most recent page view&apos;s User-Agent for that user.{' '}
                  <strong>Local time</strong> = wall clock in the user&apos;s profile timezone when you loaded this page.{' '}
                  <strong>Born (local)</strong> = signup (<code className="rounded bg-black/5 px-1 dark:bg-white/10">created_at</code>) in their zone.{' '}
                  <strong>Started (local)</strong> = first morning plan save in their zone.{' '}
                  <strong>Outreach</strong> = retention emails in the last 7 days from{' '}
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10">communication_logs</code> (Resend sends +
                  webhooks). <strong>Calendar</strong> = Google Calendar OAuth only (
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10">google_calendar_tokens</code>
                  ). <strong>Hook</strong> (📅) = active ICS feed and/or Google Calendar. <strong>Velocity</strong> = minutes
                  from signup to first morning save (
                  <code className="rounded bg-black/5 px-1 dark:bg-white/10">morning_plan_commits</code>).
                </p>
              </AdminDashboardHelpBlock>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Subset used for scatter — not full cohort listing. Email is the heartbeat; calendar is high-intent hook.
              </p>
              <div className="overflow-x-auto max-h-64 overflow-y-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-600">
                      <th className="py-1 pr-3">
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                          Email
                          <InfoTooltip
                            presentation="popover"
                            text="Account identifier in this cohort; truncated in the cell for layout."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3">
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                          Shadow
                          <InfoTooltip
                            presentation="popover"
                            text="The user's core behavioral bias. Strategists think; Hustlers do."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 text-center">
                        <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
                          Device
                          <InfoTooltip
                            presentation="popover"
                            text="📱 = Mobile/Tablet, 💻 = Desktop. Mobile users need shorter text and bigger buttons."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center gap-0.5">
                          Local time
                          <InfoTooltip
                            presentation="popover"
                            text="User's current local time from profile timezone when this dashboard loaded—use it to judge morning vs evening mode and whether an evening gap is just 'not sunset yet'."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-0.5">
                          Born (local)
                          <InfoTooltip
                            presentation="popover"
                            text="Account signup instant (profile created_at) in the user’s profile timezone — timeline anchor."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-0.5">
                          Started (local)
                          <InfoTooltip
                            presentation="popover"
                            text="First morning plan save (earliest morning_plan_commits.committed_at) in the user’s profile timezone — signup-to-action moment."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3">
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                          Engagement
                          <InfoTooltip
                            presentation="popover"
                            text="0–100 score from tasks, evenings, and decisions in the cohort date window (pulse formula)."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 min-w-[200px]">
                        <span className="inline-flex items-center gap-0.5">
                          Last action
                          <InfoTooltip
                            presentation="popover"
                            text="Most recent meaningful save in the cohort window (morning / decision / evening), by row timestamp."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 min-w-[220px]">
                        <span className="inline-flex items-center gap-0.5">
                          Recent path
                          <InfoTooltip
                            presentation="popover"
                            text="The last 5 steps + dwell time. Red rings = content was bypassed or ignored (under 5 seconds)."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 text-center">
                        <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
                          Outreach
                          <InfoTooltip
                            presentation="popover"
                            text="Last 7 days of communication_logs + Resend webhooks. Pipeline: Pending ⏳ (no sends) → Sent ✅ → Opened 👁️ (open pixel). Amber row = Morning path + sent but unopened for 12+ hours (retention risk). Cell tooltip = latest send summary."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 text-center">
                        <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
                          Calendar
                          <InfoTooltip
                            presentation="popover"
                            text="Google Calendar OAuth only: a row in google_calendar_tokens means they completed Google sync (time protection). ICS-only users show Not Linked here but may still show Hook."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 text-center">
                        <span className="inline-flex items-center justify-center gap-0.5 whitespace-nowrap">
                          Hook
                          <InfoTooltip
                            presentation="popover"
                            text="📅 = Calendar synced (ICS feed and/or Google Calendar). Strongest single signal of high-intent commitment."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3">
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                          Velocity
                          <InfoTooltip
                            presentation="popover"
                            text="Minutes from signup to first morning plan save (uses profile timezone only in Deer Verdict for overnight vs procrastination). Under ~5 minutes is ideal; over ~1 hour can mean heavy onboarding—or a night signup and morning save."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3">
                        <span className="inline-flex items-center gap-0.5 whitespace-nowrap">
                          Days since signup
                          <InfoTooltip
                            presentation="popover"
                            text="Calendar days since profile created_at—tenure in the product, not cohort filter."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                      <th className="py-1 pr-3 min-w-[220px]">
                        <span className="inline-flex items-center gap-0.5">
                          Deer Verdict
                          <InfoTooltip
                            presentation="popover"
                            text="Rule-based one-liner from path, velocity, device, calendar hook, and profile timezone (e.g. natural overnight gap vs ghosting). Open Signals JSON for the full admin snapshot."
                            className="[&_svg]:h-3 [&_svg]:w-3"
                          />
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.pulse.points.slice(0, 40).map((p) => {
                      const outreach = p.outreach7d ?? EMPTY_OUTREACH_7D
                      const deerVerdict = generateUserStory({
                        userId: p.userId,
                        shadow: p.shadow,
                        lastDevice: p.lastDevice ?? 'Unknown',
                        recentPath: p.recentPath ?? [],
                        minutesToFirstMorningSave: p.minutesToFirstMorningSave ?? null,
                        calendarHook: Boolean(p.calendarHook),
                        engagementScore: p.engagementScore,
                        daysSinceSignup: p.daysSinceSignup,
                      })
                      return (
                      <tr
                        key={p.userId}
                        className={`border-b border-gray-100 dark:border-gray-700/60${
                          outreach.retentionRisk
                            ? ' bg-amber-50/90 dark:bg-amber-950/25'
                            : ''
                        }`}
                        title={
                          outreach.retentionRisk
                            ? 'Retention risk: Morning path + latest outreach sent but not opened for 12+ hours.'
                            : undefined
                        }
                      >
                        <td className="py-1 pr-3 truncate max-w-[200px]">{p.email ?? p.userId.slice(0, 8)}</td>
                        <td className="py-1 pr-3 capitalize">(Shadow) {p.shadow}</td>
                        <td className="py-1 pr-3 text-center text-base" title={p.lastDevice ?? 'Unknown'}>
                          {p.lastDevice === 'Desktop' ? (
                            <span aria-label="Desktop">💻</span>
                          ) : p.lastDevice === 'Mobile' || p.lastDevice === 'Tablet' ? (
                            <span aria-label={p.lastDevice}>📱</span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td
                          className="py-1 pr-3 text-center align-top tabular-nums text-gray-800 dark:text-gray-200"
                          title={p.profileTimezone ? `IANA: ${p.profileTimezone}` : undefined}
                        >
                          {p.userLocalTime && p.userLocalTime.length > 0 ? p.userLocalTime : '—'}
                        </td>
                        <td
                          className="py-1 pr-3 align-top tabular-nums text-[10px] leading-tight text-gray-700 dark:text-gray-300"
                          title={p.profileTimezone ? `IANA: ${p.profileTimezone}` : undefined}
                        >
                          {p.signupBornLocal?.trim() ? p.signupBornLocal : '—'}
                        </td>
                        <td
                          className="py-1 pr-3 align-top tabular-nums text-[10px] leading-tight text-gray-700 dark:text-gray-300"
                          title={p.profileTimezone ? `IANA: ${p.profileTimezone}` : undefined}
                        >
                          {p.firstMorningStartedLocal?.trim() ? p.firstMorningStartedLocal : '—'}
                        </td>
                        <td className="py-1 pr-3">{p.engagementScore}</td>
                        <td className="py-1 pr-3 text-gray-700 dark:text-gray-300">{p.lastAction ?? '—'}</td>
                        <td className="py-1 pr-3 align-top">
                          {p.recentPath && p.recentPath.length > 0 ? (
                            <span className="inline-flex flex-wrap items-center gap-y-1 text-[10px] leading-tight text-gray-600 dark:text-gray-400">
                              {p.recentPath.map((step, idx) => (
                                <span key={`${p.userId}-rp-${idx}`} className="inline-flex items-center">
                                  {idx > 0 ? (
                                    <span className="mx-0.5 text-gray-400 dark:text-gray-500" aria-hidden>
                                      →
                                    </span>
                                  ) : null}
                                  <span
                                    className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-medium ${
                                      step.bypassed
                                        ? 'ring-1 ring-red-400/80 dark:ring-red-500/70'
                                        : ''
                                    } ${flowTagClass(step.tag)}`}
                                  >
                                    {step.tag}
                                    {formatDwellSeconds(step.dwellSeconds) ? (
                                      <span className="font-normal text-[9px] opacity-75">
                                        ({formatDwellSeconds(step.dwellSeconds)})
                                      </span>
                                    ) : null}
                                    {step.bypassed ? (
                                      <AlertTriangle
                                        className="h-2.5 w-2.5 shrink-0 text-red-600 dark:text-red-400"
                                        aria-label="Likely skimmed"
                                      />
                                    ) : null}
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td
                          className="py-1 pr-3 text-center align-top text-gray-800 dark:text-gray-200"
                          title={outreach.lastLine ?? 'No tracked emails in the last 7 days'}
                        >
                          <div className="flex flex-col items-center gap-0.5 text-[10px] leading-tight">
                            <span className="inline-flex flex-wrap items-center justify-center gap-x-0.5 gap-y-0.5">
                              <span
                                className={
                                  outreach.outreachStage === 'pending'
                                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                                    : 'opacity-40 text-gray-600 dark:text-gray-400'
                                }
                              >
                                Pending ⏳
                              </span>
                              <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                                →
                              </span>
                              <span
                                className={
                                  outreach.outreachStage === 'sent'
                                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                                    : outreach.outreachStage === 'opened'
                                      ? 'opacity-40 text-gray-600 dark:text-gray-400'
                                      : 'opacity-40 text-gray-600 dark:text-gray-400'
                                }
                              >
                                Sent ✅
                              </span>
                              <span className="text-gray-400 dark:text-gray-500" aria-hidden>
                                →
                              </span>
                              <span
                                className={
                                  outreach.outreachStage === 'opened'
                                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                                    : 'opacity-40 text-gray-600 dark:text-gray-400'
                                }
                              >
                                Opened 👁️
                              </span>
                            </span>
                            {outreach.outreachStage === 'opened' && outreach.openedAtLabel ? (
                              <span className="text-[9px] text-gray-500 dark:text-gray-400 tabular-nums">
                                {outreach.openedAtLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td
                          className="py-1 pr-3 text-center align-top whitespace-nowrap"
                          title={
                            p.googleCalendarLinked
                              ? 'Google Calendar OAuth linked (google_calendar_tokens)'
                              : 'No Google Calendar OAuth row'
                          }
                        >
                          {p.googleCalendarLinked ? (
                            <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                              🟢 Active
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                              ⚪ Not Linked
                            </span>
                          )}
                        </td>
                        <td className="py-1 pr-3 text-center align-top" title="Calendar hook (ICS and/or Google)">
                          {p.calendarHook ? (
                            <span className="text-base" aria-label="Calendar hook active">
                              📅
                            </span>
                          ) : (
                            <span className="text-gray-400 dark:text-gray-500">—</span>
                          )}
                        </td>
                        <td className="py-1 pr-3 align-top text-gray-700 dark:text-gray-300 tabular-nums">
                          {formatMinutesToFirstMorning(p.minutesToFirstMorningSave ?? null) || '—'}
                        </td>
                        <td className="py-1 pr-3 tabular-nums">{p.daysSinceSignup}</td>
                        <td className="py-1 pr-3 align-top min-w-[220px] max-w-[min(320px,40vw)]">
                          <p className="italic text-[11px] leading-snug text-gray-600 dark:text-gray-400">{deerVerdict}</p>
                          <a
                            href={`/api/admin/user-signals?userId=${encodeURIComponent(p.userId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-[10px] font-medium text-[#152b50] underline-offset-2 hover:underline dark:text-sky-400"
                          >
                            Signals JSON
                          </a>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Generated {data.generatedAt}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
