'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface MonthlyPreviewProps {
  monthLabel: string
  accent?: InsightPeriodAccent
  stats: {
    completedTasks: number
    needleMovers: number
    needleMoversCompleted: number
  }
}

export function MonthlyPreview({ monthLabel, stats, accent = 'mood' }: MonthlyPreviewProps) {
  return (
    <InsightPeriodSection title="Month in Progress" accent={accent} className="mb-8">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Your full monthly transformation view will appear at the end of {monthLabel}. Keep building
        momentum!
      </p>
      <p className="mt-3 text-sm font-medium text-[#152b50] dark:text-slate-200">
        So far: {stats.completedTasks} tasks done · {stats.needleMoversCompleted}/{stats.needleMovers}{' '}
        needle movers
      </p>
    </InsightPeriodSection>
  )
}
