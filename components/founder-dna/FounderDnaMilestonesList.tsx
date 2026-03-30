'use client'

import { useMemo } from 'react'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { computeAllMilestoneProgress } from '@/lib/founder-dna/next-milestones'
import { Loader2 } from 'lucide-react'

export function FounderDnaMilestonesList() {
  const { data, loading, error } = useFounderJourney()

  const all = useMemo(() => {
    if (!data?.milestones) return []
    const m = data.milestones
    return computeAllMilestoneProgress({
      currentStreak: m.currentStreak,
      totalTasks: m.totalTasks,
      totalDecisions: m.totalDecisions,
      totalEvenings: m.totalEvenings,
    })
  }, [data?.milestones])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#ef725c]" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  }

  return (
    <ul className="space-y-3">
      {all.map((row) => {
        const pct = row.target > 0 ? Math.min(100, Math.round((row.current / row.target) * 100)) : 0
        const done = row.remaining <= 0
        return (
          <li
            key={row.id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/40 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-2xl shrink-0" aria-hidden>
                  {row.icon}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{row.name}</p>
                  {row.badgeName ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Badge: {row.badgeName}</p>
                  ) : null}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white tabular-nums">
                  {row.current}/{row.target}
                </p>
                {done ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Reached</p>
                ) : (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{row.remaining} to go</p>
                )}
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-[#ef725c]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
