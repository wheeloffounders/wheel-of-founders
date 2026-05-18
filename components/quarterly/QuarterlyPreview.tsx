'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface QuarterlyPreviewProps {
  quarterLabel: string
  accent?: InsightPeriodAccent
  stats: {
    completedTasks: number
    needleMovers: number
    needleMoversCompleted: number
  }
}

export function QuarterlyPreview({ quarterLabel, stats, accent = 'progress' }: QuarterlyPreviewProps) {
  return (
    <InsightPeriodSection title="Quarter in Progress" accent={accent}>
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Your full quarterly trajectory view will appear at the end of {quarterLabel}. Keep building!
      </p>
      <p className="mt-2 text-sm font-medium text-[#152b50] dark:text-slate-100">
        So far: {stats.completedTasks} tasks · {stats.needleMoversCompleted}/{stats.needleMovers} needle movers
      </p>
    </InsightPeriodSection>
  )
}
