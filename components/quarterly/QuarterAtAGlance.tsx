'use client'

import Link from 'next/link'
import { BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

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
  viewAllWinsHref?: string
  onViewAllWinsClick?: () => void
}

export function QuarterAtAGlance({ stats, viewAllWinsHref, onViewAllWinsClick }: QuarterAtAGlanceProps) {
  const tasksLine = `Tasks: ${stats.completedTasks}/${stats.totalTasks} · ${stats.completionRate}% completion`
  const nmLine =
    stats.needleMovers > 0
      ? `Needle movers: ${stats.needleMoversCompleted}/${stats.needleMovers} · Priorities moved this quarter`
      : `Needle movers: — (none tagged this quarter)`
  const refLine = `Reflections: ${stats.reviewsCount} evening reviews · ${stats.decisions} decisions logged`

  const linkClass =
    'text-sm font-medium underline-offset-2 hover:underline inline-flex items-center gap-1 mt-4'

  return (
    <Card
      className="border-t border-gray-200 dark:border-gray-700"
      highlighted
      style={{ borderLeft: `3px solid ${colors.navy.DEFAULT}` }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-slate-100">
          <BarChart3 className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
          Quarter at a Glance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-gray-800 dark:text-gray-200">
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
      </CardContent>
    </Card>
  )
}
