'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatWeekRange, formatMonthRange, formatQuarterRange } from '@/lib/date-utils'

export type InsightType = 'weekly' | 'monthly' | 'quarterly'

interface InsightNavigationProps {
  type: InsightType
  currentPeriod: string
  periods: string[]
  onNavigate: (period: string) => void
}
function formatPeriodDisplay(type: InsightType, period: string): string {
  if (type === 'weekly') return formatWeekRange(period)
  if (type === 'monthly') return formatMonthRange(period)
  return formatQuarterRange(period)
}

export function InsightNavigation({
  type,
  currentPeriod,
  periods,
  onNavigate,
}: InsightNavigationProps) {
  const idx = periods.indexOf(currentPeriod)
  // When viewing a period not in list (e.g. current month with no insight yet),
  // Previous = go to most recent period with insight (periods[0])
  const hasPrev =
    idx >= 0
      ? idx < periods.length - 1
      : periods.length > 0 // current not in list but we have history
  const hasNext = idx > 0

  const prevPeriod = hasPrev
    ? idx >= 0
      ? periods[idx + 1]
      : periods[0]
    : null
  const nextPeriod = hasNext ? periods[idx - 1] : null

  return (
    <div className="flex items-center justify-center gap-4 py-2">
      <button
        type="button"
        onClick={() => prevPeriod && onNavigate(prevPeriod)}
        disabled={!hasPrev}
        className="flex items-center gap-1 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:underline disabled:hover:no-underline text-gray-700 dark:text-gray-300"
        aria-label="Previous period"
      >
        <ChevronLeft className="w-5 h-5" />
        Previous
      </button>
      <span className="text-sm text-gray-600 dark:text-gray-400 font-medium min-w-[200px] text-center">
        {formatPeriodDisplay(type, currentPeriod)}
      </span>
      <button
        type="button"
        onClick={() => nextPeriod && onNavigate(nextPeriod)}
        disabled={!hasNext}
        className="flex items-center gap-1 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:underline disabled:hover:no-underline text-gray-700 dark:text-gray-300"
        aria-label="Next period"
      >
        Next
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  )
}
