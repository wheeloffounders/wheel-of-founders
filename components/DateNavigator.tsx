'use client'

import { format, isToday, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import type { DayStatus } from '@/lib/date-utils'

interface DateNavigatorProps {
  currentDate: string
  onPrev: () => void
  onNext: () => void
  onDateClick: () => void
  status: DayStatus
  canGoBack?: boolean
  canGoForward?: boolean
  className?: string
}

const STATUS_LABELS: Record<DayStatus, string> = {
  complete: 'All complete',
  half: 'Morning done',
  empty: 'Nothing yet',
  future: 'Future',
}

const STATUS_DOTS: Record<DayStatus, { char: string; title: string }> = {
  complete: { char: '●', title: 'All complete' },
  half: { char: '◐', title: 'Morning done' },
  empty: { char: '○', title: 'Nothing yet' },
  future: { char: '–', title: 'Future' },
}

export function DateNavigator({
  currentDate,
  onPrev,
  onNext,
  onDateClick,
  status,
  canGoBack = true,
  canGoForward = true,
  className = '',
}: DateNavigatorProps) {
  const date = new Date(currentDate + 'T12:00:00')
  const today = new Date()
  const minDate = subDays(today, 30)
  const maxDate = today
  const canPrev = canGoBack && date > minDate
  const canNext = canGoForward && date < maxDate

  const getDateLabel = (): string => {
    if (isToday(date)) return `Today, ${format(date, 'MMMM d, yyyy')}`
    return format(date, 'EEEE, MMMM d, yyyy')
  }

  const dot = STATUS_DOTS[status]
  const label = STATUS_LABELS[status]

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex flex-col gap-0.5 flex-1 min-w-0">
        <button
          type="button"
          onClick={onDateClick}
          className="flex items-center gap-2 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          aria-label="Open calendar"
          title="Click to pick a date"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
            {getDateLabel()}
          </span>
          <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" aria-hidden="true" />
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-0.5">
          <span className="flex items-center gap-1" title="● Complete  ◐ Morning done  ○ Not started">
            <span
              className={
                status === 'complete'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : status === 'half'
                    ? 'text-amber-600 dark:text-amber-400'
                    : status === 'future'
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-gray-400 dark:text-gray-500'
              }
            >
              {dot.char}
            </span>
            {label}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-gray-500">
            Click the date or calendar icon to pick a day.
          </span>
        </span>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="p-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        aria-label="Next day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
