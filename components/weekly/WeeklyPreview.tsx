'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface WeeklyPreviewProps {
  weekLabel: string
  accent?: InsightPeriodAccent
  stats: {
    daysCompleted: number
    daysInWeek: number
    needleMovers: number
    needleMoversCompleted: number
  }
}

export function WeeklyPreview({ weekLabel, accent = 'mood', stats }: WeeklyPreviewProps) {
  return (
    <InsightPeriodSection title="Week in Progress" accent={accent} className="mb-8">
      <p className="text-sm text-gray-700 dark:text-gray-300">
        Your full weekly insight will appear after this week wraps. Keep building momentum!
      </p>
      <p className="mt-3 text-sm font-medium text-[#152b50] dark:text-slate-200">
        {weekLabel} · {stats.daysCompleted}/{stats.daysInWeek} days logged ·{' '}
        {stats.needleMoversCompleted}/{stats.needleMovers} needle movers
      </p>
    </InsightPeriodSection>
  )
}
