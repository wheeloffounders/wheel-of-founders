'use client'

import { format, addWeeks, subWeeks, startOfWeek, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface WeekSidebarProps {
  weekStart: Date
  selectedDate: Date | null
  onSelectDay: (date: Date) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  canGoNext: boolean
  todayStr: string
}

export function WeekSidebar({
  weekStart,
  selectedDate,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  canGoNext,
  todayStr,
}: WeekSidebarProps) {
  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  const weekEnd = days[6]
  const weekRangeLabel = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Week of</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{weekRangeLabel}</p>
      </div>
      <div className="flex items-center justify-between px-2 py-2 border-b border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onPrevWeek}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          aria-label="Previous week"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onNextWeek}
          disabled={!canGoNext}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next week"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <nav className="p-2">
        <ul className="space-y-1">
          {days.map((d) => {
            const dateStr = format(d, 'yyyy-MM-dd')
            const isSelected = selectedDate ? isSameDay(d, selectedDate) : false
            const isToday = dateStr === todayStr
            const dayName = format(d, 'EEEE')
            const dayShort = format(d, 'MMM d')
            return (
              <li key={dateStr}>
                <button
                  type="button"
                  onClick={() => onSelectDay(d)}
                  className={`
                    w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition
                    ${isSelected
                      ? 'bg-[#ef725c] text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <span className="block truncate">{dayName}</span>
                  <span className={`block truncate text-xs ${isSelected ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                    {dayShort}
                    {isToday && ' • Today'}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}
