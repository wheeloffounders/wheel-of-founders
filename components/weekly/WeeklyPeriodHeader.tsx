'use client'

import { format, addWeeks, endOfWeek } from 'date-fns'
import { Calendar } from 'lucide-react'
import { InsightNavigation } from '@/components/InsightNavigation'
import { colors } from '@/lib/design-tokens'

type WeeklyPeriodHeaderProps = {
  showWeekInProgress: boolean
  daysCompleted: number
  daysInWeek: number
  weekStart: string
  periods: string[]
  onNavigate: (period: string) => void
  autoRepairFailed?: boolean
  onRetryGenerateLastWeek?: () => void
}

export function WeeklyPeriodHeader({
  showWeekInProgress,
  daysCompleted,
  daysInWeek,
  weekStart,
  periods,
  onNavigate,
  autoRepairFailed,
  onRetryGenerateLastWeek,
}: WeeklyPeriodHeaderProps) {
  return (
    <header className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-[#152B50] dark:text-white">
            <Calendar className="w-8 h-8" style={{ color: colors.coral.DEFAULT }} />
            Weekly Insights
          </h1>
          <p className="text-sm mt-1 text-gray-600 dark:text-white">
            {showWeekInProgress
              ? `${daysCompleted} days completed · ${daysInWeek - daysCompleted} days left`
              : 'Week complete'}
          </p>
        </div>
      </div>
      <InsightNavigation
        type="weekly"
        currentPeriod={weekStart}
        periods={periods.length > 0 ? periods : [weekStart]}
        onNavigate={onNavigate}
        nextDisabledMessage={
          !periods.some((p) => p === format(addWeeks(new Date(weekStart), 1), 'yyyy-MM-dd'))
            ? (() => {
                const nextWeekStart = addWeeks(new Date(weekStart), 1)
                const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 })
                return `Week of ${format(nextWeekStart, 'MMM d')}–${format(nextWeekEnd, 'MMM d, yyyy')} insights will be available on Monday`
              })()
            : undefined
        }
      />
      {autoRepairFailed ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Last week&apos;s insight didn&apos;t generate automatically.{' '}
          <button
            type="button"
            onClick={onRetryGenerateLastWeek}
            className="text-[#ef725c] hover:underline font-medium"
          >
            Try again
          </button>
        </p>
      ) : null}
    </header>
  )
}
