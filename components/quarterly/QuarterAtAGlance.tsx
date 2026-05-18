'use client'

import Link from 'next/link'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

export type QuarterGlanceStats = {
  totalTasks: number
  completedTasks: number
  completionRate: number
  needleMovers: number
  needleMoversCompleted: number
  reviewsCount: number
  decisions: number
}

interface QuarterAtAGlanceProps {
  stats: QuarterGlanceStats
  accent?: InsightPeriodAccent
  viewAllWinsHref?: string
  onViewAllWinsClick?: () => void
}

export function QuarterAtAGlance({ stats, accent = 'goal', viewAllWinsHref, onViewAllWinsClick }: QuarterAtAGlanceProps) {
  const tasksLine = `Tasks: ${stats.completedTasks}/${stats.totalTasks} · ${stats.completionRate}% completion`
  const nmLine =
    stats.needleMovers > 0
      ? `Needle movers: ${stats.needleMoversCompleted}/${stats.needleMovers} · Priorities moved this quarter`
      : `Needle movers: — (none tagged this quarter)`
  const refLine = `Reflections: ${stats.reviewsCount} evening reviews · ${stats.decisions} decisions logged`

  const linkClass =
    'mt-4 inline-flex items-center gap-1 text-sm font-medium underline-offset-2 hover:underline'

  return (
    <InsightPeriodSection title="Quarter at a Glance" accent={accent}>
      <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
        <p>{tasksLine}</p>
        <p>{nmLine}</p>
        <p>{refLine}</p>
        {viewAllWinsHref && (
          <Link href={viewAllWinsHref} className={linkClass} style={{ color: colors.coral.DEFAULT }}>
            View all wins from this quarter →
          </Link>
        )}
        {onViewAllWinsClick && !viewAllWinsHref && (
          <button type="button" onClick={onViewAllWinsClick} className={linkClass} style={{ color: colors.coral.DEFAULT }}>
            View all wins from this quarter →
          </button>
        )}
      </div>
    </InsightPeriodSection>
  )
}
