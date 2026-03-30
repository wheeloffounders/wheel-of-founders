'use client'

import type { FounderJourneyQueryState } from '@/lib/hooks/useFounderJourney'
import { Loader2 } from 'lucide-react'

export type FounderDnaLifetimeStatsProps = {
  journey: FounderJourneyQueryState
}

export function FounderDnaLifetimeStats({ journey }: FounderDnaLifetimeStatsProps) {
  const { data, loading, error } = journey
  const m = data?.milestones

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  }

  if (!m) {
    return <p className="text-sm text-gray-600 dark:text-gray-300">No stats yet.</p>
  }

  const rows = [
    { label: 'Days active', value: m.daysActive },
    { label: 'Current streak', value: m.currentStreak },
    { label: 'Morning tasks', value: m.totalTasks },
    { label: 'Decisions logged', value: m.totalDecisions },
    { label: 'Evening reviews', value: m.totalEvenings },
    { label: 'Postponed tasks (all time)', value: m.postponedTasks },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {rows.map((r) => (
        <div
          key={r.label}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-3"
        >
          <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">{r.label}</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-white tabular-nums mt-1">{r.value}</p>
        </div>
      ))}
    </div>
  )
}
