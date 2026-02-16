'use client'

import { format, isToday, isYesterday, subDays } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface DateSelectorProps {
  selectedDate: string // Format: 'yyyy-MM-dd'
  onDateChange: (date: string) => void
  maxDaysBack?: number // Limit how far back users can go (default: 30)
  maxDaysForward?: number // Allow selecting future dates (e.g. 1 = tomorrow) - default 0
  className?: string
}

export function DateSelector({ selectedDate, onDateChange, maxDaysBack = 30, maxDaysForward = 0, className = '' }: DateSelectorProps) {
  const selected = new Date(selectedDate)
  const today = new Date()
  const minDate = subDays(today, maxDaysBack)
  const maxDate = maxDaysForward > 0 ? subDays(today, -maxDaysForward) : today

  const handlePreviousDay = () => {
    const prev = subDays(selected, 1)
    if (prev >= minDate) {
      onDateChange(format(prev, 'yyyy-MM-dd'))
    }
  }

  const handleNextDay = () => {
    const next = subDays(selected, -1)
    if (next <= maxDate) {
      onDateChange(format(next, 'yyyy-MM-dd'))
    }
  }

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value)
    if (newDate >= minDate && newDate <= maxDate) {
      onDateChange(format(newDate, 'yyyy-MM-dd'))
    }
  }

  const getDateLabel = (date: Date): string => {
    if (isToday(date)) return 'Today'
    if (isYesterday(date)) return 'Yesterday'
    const tomorrow = subDays(new Date(), -1)
    if (format(date, 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd')) return 'Tomorrow'
    return format(date, 'MMM d, yyyy')
  }

  const todayStr = format(today, 'yyyy-MM-dd')
  const isPastDate = selected < new Date(todayStr)
  const isFutureDate = selected > new Date(todayStr)
  const canGoBack = selected > minDate
  const canGoForward = selected < maxDate

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={handlePreviousDay}
        disabled={!canGoBack}
        className={`p-2 rounded-lg transition-colors ${
          canGoBack
            ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            : 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Previous day"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 bg-white dark:bg-[#1A202C] border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {getDateLabel(selected)}
        </label>
        {isPastDate && (
          <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
            Past
          </span>
        )}
        {isFutureDate && (
          <span className="text-xs px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded">
            Tomorrow
          </span>
        )}
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateInputChange}
          min={format(minDate, 'yyyy-MM-dd')}
          max={format(maxDate, 'yyyy-MM-dd')}
          className="ml-2 text-xs text-gray-600 dark:text-gray-400 border-0 bg-transparent cursor-pointer focus:outline-none focus:ring-0"
          aria-label="Select date"
        />
      </div>

      <button
        onClick={handleNextDay}
        disabled={!canGoForward}
        className={`p-2 rounded-lg transition-colors ${
          canGoForward
            ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            : 'bg-gray-50 dark:bg-gray-900 text-gray-300 dark:text-gray-600 cursor-not-allowed'
        }`}
        aria-label="Next day"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
