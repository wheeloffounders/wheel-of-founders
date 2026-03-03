'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addMonths, subMonths, isSameMonth, isSameDay } from 'date-fns'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'

interface CalendarPickerProps {
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClose: () => void
  maxDate?: Date
  className?: string
}

export function CalendarPicker({
  selectedDate,
  onSelectDate,
  onClose,
  maxDate = new Date(),
  className = '',
}: CalendarPickerProps) {
  const [viewMonth, setViewMonth] = useState(selectedDate)

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let day = calendarStart
  while (day <= calendarEnd) {
    days.push(day)
    day = new Date(day)
    day.setDate(day.getDate() + 1)
  }

  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const handlePrevMonth = () => {
    setViewMonth(subMonths(viewMonth, 1))
  }

  const handleNextMonth = () => {
    const next = addMonths(viewMonth, 1)
    if (next <= maxDate) setViewMonth(next)
  }

  const isDisabled = (d: Date) => d > maxDate

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {format(viewMonth, 'MMMM yyyy')}
        </h3>
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={viewMonth >= startOfMonth(maxDate)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const disabled = isDisabled(d)
              const isSelected = isSameDay(d, selectedDate)
              const isCurrentMonth = isSameMonth(d, viewMonth)
              return (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => {
                    if (!disabled) {
                      onSelectDate(d)
                      onClose()
                    }
                  }}
                  disabled={disabled}
                  className={`
                    w-8 h-8 rounded-lg text-sm font-medium transition
                    ${disabled ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                    ${isCurrentMonth ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}
                    ${isSelected ? 'bg-[#ef725c] text-white hover:bg-[#e8654d]' : ''}
                  `}
                >
                  {format(d, 'd')}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
