'use client'

import { Target, Flame, Calendar } from 'lucide-react'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface MonthlyTrendsProps {
  accent?: InsightPeriodAccent
  stats: {
    reviewsCount: number
    completionRate: number
    streakDays: number
    needleMovers: number
    needleMoversCompleted: number
    proactivePct: number
    decisions: number
    firesTotal: number
    firesResolved: number
  }
}

export function MonthlyTrends({ stats, accent = 'goal' }: MonthlyTrendsProps) {
  const firesResolvedPct =
    stats.firesTotal > 0 ? Math.round((stats.firesResolved / stats.firesTotal) * 100) : 0

  return (
    <InsightPeriodSection title="Your Month at a Glance" accent={accent}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-slate-50/50 p-4 dark:bg-slate-900/30">
          <Calendar className="mb-2 h-5 w-5" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm text-gray-700 dark:text-gray-300">SESSIONS</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.reviewsCount}</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Evening reviews this month</p>
        </div>
        <div className="rounded-lg bg-slate-50/50 p-4 dark:bg-slate-900/30">
          <Target className="mb-2 h-5 w-5" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm text-gray-700 dark:text-gray-300">COMPLETION</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completionRate}%</p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Current streak: {stats.streakDays} days
          </p>
        </div>
        <div className="rounded-lg bg-slate-50/50 p-4 dark:bg-slate-900/30 md:col-span-2 lg:col-span-1">
          <Flame className="mb-2 h-5 w-5" style={{ color: colors.amber.DEFAULT }} />
          <p className="text-sm text-gray-700 dark:text-gray-300">NEEDLE MOVERS</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.needleMoversCompleted} / {stats.needleMovers}
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            {stats.proactivePct}% proactive · {stats.decisions} decisions
            {stats.firesTotal > 0 ? ` · ${firesResolvedPct}% fires resolved` : ''}
          </p>
        </div>
      </div>
    </InsightPeriodSection>
  )
}
