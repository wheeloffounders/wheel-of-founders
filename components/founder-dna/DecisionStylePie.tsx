'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'

type DecisionStyleResponse = {
  strategic: number
  tactical: number
  total: number
  insight: string
  nextUpdate?: string
  fromCache?: boolean
  example?: {
    decision: string
    type: 'strategic' | 'tactical'
    date: string
    context?: string
  }
  breakdown?: {
    weekly?: any[]
    monthly?: any[]
  }
}

export function DecisionStylePie() {
  const [loading, setLoading] = useState(true)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<DecisionStyleResponse | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setLocked(false)
        setError(null)
        const res = await fetch('/api/founder-dna/decisions', { credentials: 'include' })
        if (res.status === 403) {
          if (!cancelled) setLocked(true)
          return
        }
        if (!res.ok) throw new Error('Failed to load decision style')

        const json = (await res.json()) as DecisionStyleResponse
        if (!cancelled) {
          setData(json)
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
    const total = data.total || 0
    const strategicValue = data.strategic || 0
    const tacticalValue = data.tactical || 0
    if (total <= 0) return []
    return [
      { key: 'strategic', name: 'Strategic', value: strategicValue, color: '#ef725c' },
      { key: 'tactical', name: 'Tactical', value: tacticalValue, color: '#4f8a8b' },
    ]
  }, [data])

  const totalsText = useMemo(() => {
    if (!data) return null
    if (data.total <= 0) return null
    const strategicPct = data.total > 0 ? Math.round((data.strategic / data.total) * 100) : 0
    const tacticalPct = 100 - strategicPct
    return { strategicPct, tacticalPct }
  }, [data])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (locked) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
          <Lock className="w-4 h-4 text-[#ef725c]" />
          Decision Style is locked
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Unlocks on day 9 active (or when your 5th decision is logged — whichever comes first).
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/30 dark:bg-red-900/20 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-red-800 dark:text-red-200">
          <AlertTriangle className="w-4 h-4" />
          Could not load your decision style
        </div>
        <div className="text-sm text-red-700/90 dark:text-red-100 mt-2">{error}</div>
      </div>
    )
  }

  const total = data?.total ?? 0
  if (!data || total <= 0 || chartData.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
        <div className="text-sm font-medium text-gray-900 dark:text-white">No decision data yet</div>
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-2">
          Log some morning decisions to see your mix.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/30 p-4">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-white">Strategic vs Tactical</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{total} decisions</div>
        </div>
        {totalsText ? (
          <div className="text-right text-xs text-gray-500 dark:text-gray-400">
            <div>😊 {totalsText.strategicPct}% strategic</div>
            <div>🧭 {totalsText.tacticalPct}% tactical</div>
          </div>
        ) : null}
      </div>

      <div className="relative w-full" style={{ height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Tooltip
              formatter={(value: unknown) => `${String(value)} decisions`}
              labelFormatter={(label) => label}
            />
            <Legend />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={2}
              stroke="rgba(0,0,0,0)"
              label={(entry) => {
                const v = entry.value ?? 0
                const pct = total > 0 ? Math.round((Number(v) / total) * 100) : 0
                return pct >= 8 ? `${pct}%` : ''
              }}
            >
              {chartData.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {data.insight ? (
        <div className="mt-4 text-sm text-gray-700 dark:text-gray-200">
          <div className="font-medium text-gray-900 dark:text-white">What this means</div>
          <div className="text-gray-600 dark:text-gray-300 mt-1">{data.insight}</div>
        </div>
      ) : null}

      {data.example ? (
        <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100/80 dark:border-purple-900/40">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">Recent example</p>
          {data.example.context ? (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 leading-relaxed">{data.example.context}</p>
          ) : null}
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">&ldquo;{data.example.decision}&rdquo;</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            {[data.example.date, data.example.type === 'strategic' ? '🎯 Strategic' : '⚡ Tactical']
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>
      ) : null}
    </div>
  )
}

