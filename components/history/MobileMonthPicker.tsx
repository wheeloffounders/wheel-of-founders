'use client'

import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth } from 'date-fns'

interface MobileMonthPickerProps {
  currentMonth: Date
  onMonthChange: (month: Date) => void
  maxDate?: Date
}

export function MobileMonthPicker({
  currentMonth,
  onMonthChange,
  maxDate = new Date(),
}: MobileMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const canGoNext = startOfMonth(addMonths(currentMonth, 1)) <= startOfMonth(maxDate)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2.5 min-h-[44px] bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium touch-manipulation"
      >
        <Calendar className="w-4 h-4 flex-shrink-0" />
        <span>{format(currentMonth, 'MMM yyyy')}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 w-64">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg touch-manipulation"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              type="button"
              onClick={() => canGoNext && onMonthChange(addMonths(currentMonth, 1))}
              disabled={!canGoNext}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              aria-label="Next month"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Tap a day in the tabs below to view
          </p>
        </div>
      )}
    </div>
  )
}
