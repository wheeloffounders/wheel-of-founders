'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gauge, Loader2 } from 'lucide-react'

type LeaderRow = {
  funnel_id: string
  starts: number
  completes: number
  conversions: number
  complete_to_conversion: number
  start_to_complete_pct: number
}

type RadarPayload = {
  window_days: number
  active_pro_trials: number
  active_pro_trials_approximate?: boolean
  radar_warnings?: string[]
  signups_today: number
  diagnostic_completion_rate_pct: number | null
  funnel_starts_30d: number
  funnel_completes_30d: number
  leaderboard: LeaderRow[]
}

export default function AdminFounderRadarPage() {
  const [data, setData] = useState<RadarPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/radar', { cache: 'no-store' })
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as {
            error?: string
            hint?: string
            queries?: Record<string, { message?: string; code?: string } | null>
          }
          let msg = j.error || `HTTP ${res.status}`
          if (j.hint) msg += `\n\n${j.hint}`
          if (j.queries && typeof j.queries === 'object') {
            const parts = Object.entries(j.queries)
              .filter(([, v]) => v && typeof v === 'object' && v.message)
              .map(([k, v]) => `${k}: ${v!.message}${v!.code ? ` (${v!.code})` : ''}`)
            if (parts.length) msg += `\n\n${parts.join('\n')}`
          }
          if (!cancelled) setError(msg)
          return
        }
        const json = (await res.json()) as RadarPayload
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0f14] text-zinc-100">
      <div className="border-b border-zinc-800 bg-[#0d1219] px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Admin
          </Link>
          <div className="flex items-center gap-2">
            <Gauge className="h-6 w-6 text-[#ef725c]" aria-hidden />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Founder Radar</h1>
              <p className="text-xs text-zinc-500">Funnel intent · last {data?.window_days ?? 30} days</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-10">
        {loading ? (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading radar…
          </div>
        ) : error ? (
          <pre className="whitespace-pre-wrap rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </pre>
        ) : data ? (
          <div className="space-y-10">
            {data.radar_warnings && data.radar_warnings.length > 0 ? (
              <div className="rounded-lg border border-amber-800/80 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
                <p className="font-medium text-amber-200">Radar note</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-100/95">
                  {data.radar_warnings.map((w) => (
                    <li key={w} className="leading-snug">
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Top stats</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-800 bg-[#111822] p-5 shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Active Pro trials</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-white">{data.active_pro_trials}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {data.active_pro_trials_approximate
                      ? 'Approximate: trial_ends_at in the future (add is_pro_trial via migration 144 for blog-trial intent)'
                      : 'is_pro_trial & trial_ends_at in the future'}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#111822] p-5 shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Signups today</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-[#6ee7b7]">{data.signups_today}</p>
                  <p className="mt-1 text-xs text-zinc-500">user_profiles.created_at (UTC day)</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-[#111822] p-5 shadow-lg">
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Diagnostic completion</p>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-[#fbbf24]">
                    {data.diagnostic_completion_rate_pct != null ? `${data.diagnostic_completion_rate_pct}%` : '—'}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    completes ÷ starts (all funnels, {data.funnel_completes_30d} / {data.funnel_starts_30d})
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Funnel leaderboard</h2>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                MVP = highest conversion per completed diagnostic (ties favor more completions). Ratios use the same
                30-day window as stats above.
              </p>
              <div className="mt-4 overflow-x-auto rounded-xl border border-zinc-800 bg-[#111822] shadow-lg">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Funnel</th>
                      <th className="px-4 py-3 font-semibold tabular-nums">Starts</th>
                      <th className="px-4 py-3 font-semibold tabular-nums">Completes</th>
                      <th className="px-4 py-3 font-semibold tabular-nums">Conversions</th>
                      <th className="px-4 py-3 font-semibold tabular-nums">Conv / complete</th>
                      <th className="px-4 py-3 font-semibold tabular-nums">Complete / start</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.leaderboard.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                          No funnel_analytics rows yet. Open a blog widget and run migration 146.
                        </td>
                      </tr>
                    ) : (
                      data.leaderboard.map((row, i) => (
                        <tr
                          key={row.funnel_id}
                          className={`border-b border-zinc-800/80 ${i === 0 ? 'bg-[#ef725c]/10' : ''}`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-zinc-200">{row.funnel_id}</td>
                          <td className="px-4 py-3 tabular-nums text-zinc-300">{row.starts}</td>
                          <td className="px-4 py-3 tabular-nums text-zinc-300">{row.completes}</td>
                          <td className="px-4 py-3 tabular-nums text-emerald-300">{row.conversions}</td>
                          <td className="px-4 py-3 tabular-nums font-medium text-[#fbbf24]">
                            {row.complete_to_conversion}%
                          </td>
                          <td className="px-4 py-3 tabular-nums text-zinc-400">{row.start_to_complete_pct}%</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  )
}
