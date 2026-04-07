'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'
import { DnaInsightBlock } from '@/components/founder-dna/DnaInsightBlock'
import type { EnergyMoodInsightType, EnergyTrendsResponse } from '@/lib/types/founder-dna'
import type { InsightPresentationKind } from '@/lib/founder-dna/insight-card-presentation'
import { usePrimaryArchetypeName } from '@/lib/hooks/usePrimaryArchetypeName'
import { SCHEDULE_ENERGY_MIN_DAYS } from '@/lib/founder-dna/unlock-schedule-config'

type Point = { date: string; mood: number; energy: number }

function energyInsightKind(t: EnergyMoodInsightType): InsightPresentationKind {
  if (t === 'energy_drop' || t === 'weekly_rhythm') return 'energy'
  if (t === 'mood_peak' || t === 'correlation' || t === 'recovery') return 'pattern'
  return 'default'
}

function coerceScale(n: unknown) {
  const v = typeof n === 'number' ? n : Number(n)
  if (!Number.isFinite(v)) return null
  return Math.round(v)
}

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: unknown; name: string } & Record<string, unknown>>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  const moodRaw = payload.find((p) => p.name === 'mood')?.value
  const energyRaw = payload.find((p) => p.name === 'energy')?.value
  const moodLabel = coerceScale(moodRaw)
  const energyLabel = coerceScale(energyRaw)
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 p-3 shadow-lg">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-sm text-gray-900 dark:text-white flex items-center gap-3">
        <span>😊 {moodLabel ?? '—'}</span>
        <span>⚡ {energyLabel ?? '—'}</span>
      </div>
    </div>
  )
}

export function EnergyMoodChart() {
  const currentArchetype = usePrimaryArchetypeName()
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<EnergyTrendsResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setLocked(false)
        setError(null)
        const res = await fetch('/api/founder-dna/trends', { credentials: 'include' })
        if (res.status === 403) {
          if (!cancelled) setLocked(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load energy trends')
        const json = (await res.json()) as EnergyTrendsResponse
        if (!cancelled) {
          setData({
            dates: json.dates ?? [],
            mood: json.mood ?? [],
            energy: json.energy ?? [],
            insights: Array.isArray(json.insights) ? json.insights : [],
          })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    const points: Point[] = []
    for (let i = 0; i < data.dates.length; i++) {
      const mood = coerceScale(data.mood[i])
      const energy = coerceScale(data.energy[i])
      if (mood === null || energy === null) continue
      points.push({ date: data.dates[i]!, mood, energy })
    }
    return points
  }, [data])

  const insights = data?.insights ?? []

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Energy (⚡) & Mood (😊)</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</div>
          </div>
        </div>
        <div
          className="flex items-center justify-center rounded-lg bg-gray-100/80 dark:bg-gray-900/40"
          style={{ height: 320 }}
        >
          <Loader2 className="w-6 h-6 animate-spin text-[#ef725c]" />
        </div>
        <div className="mt-4 border-t border-gray-200/80 dark:border-gray-700/80 pt-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Mrs. Deer&apos;s observations
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#ef725c]" />
            Gathering gentle insights...
          </div>
        </div>
      </div>
    )
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Lock className="w-4 h-4 text-[#ef725c]" />
          Energy & Mood Trend is locked
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Unlocks on day {SCHEDULE_ENERGY_MIN_DAYS} active (account age).
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load your trends
        </div>
        <div className="text-sm text-red-700/90 dark:text-red-100 mt-2">{error}</div>
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white">No trend data found</div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Complete a few evening reflections to see your chart.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Energy (⚡) & Mood (😊)</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Last 30 days</div>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">Scale: 1 to 5</div>
      </div>

      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(21, 43, 80, 0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickFormatter={(v) => {
                const d = new Date(String(v))
                if (Number.isNaN(d.getTime())) return String(v)
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
              }}
              tickLine={false}
              axisLine={false}
              minTickGap={20}
            />
            <YAxis
              domain={[1, 5]}
              allowDecimals={false}
              ticks={[1, 2, 3, 4, 5]}
              tick={{ fontSize: 12, fill: 'currentColor' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<TooltipContent />} />
            <Line
              type="monotone"
              dataKey="mood"
              name="mood"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              type="monotone"
              dataKey="energy"
              name="energy"
              stroke="#ef725c"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {insights.length > 0 ? (
        <div className="mt-4 border-t border-gray-200/80 dark:border-gray-700/80 pt-4">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            Mrs. Deer&apos;s observations
          </div>
          <div className="space-y-3">
            {insights.map((insight, i) => (
              <DnaInsightBlock
                key={`${insight.type}-${i}-${insight.description.slice(0, 24)}`}
                description={insight.description}
                kind={energyInsightKind(insight.type)}
                morningIntent="energy"
                currentArchetype={currentArchetype}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

