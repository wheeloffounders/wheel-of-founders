'use client'

import { useMemo } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  addMonths,
  subMonths,
} from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayStatus } from '@/lib/date-utils'

type MonthStatusMap = Record<string, DayStatus>

export interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  currentMonth: Date
  onMonthChange?: (month: Date) => void
  onSelectDate: (date: string) => void
  monthStatus: MonthStatusMap
  /** When set, dates after this day (calendar string) are not selectable. Omit to allow any date (past and future). */
  maxDate?: Date
  /** Highlight the active plan/review date (yyyy-MM-dd). */
  selectedDate?: string
  className?: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATUS_CHAR: Record<DayStatus, string> = {
  complete: '●',
  half: '◐',
  empty: '○',
  future: '–',
}

const selectClass =
  'rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm px-2 py-1.5 min-w-0'

export function CalendarModal({
  isOpen,
  onClose,
  currentMonth,
  onMonthChange,
  onSelectDate,
  monthStatus,
  maxDate,
  selectedDate,
  className = '',
}: CalendarModalProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const maxKey = maxDate != null ? format(maxDate, 'yyyy-MM-dd') : null

  const years = useMemo(() => {
    const y = new Date().getFullYear()
    const list: number[] = []
    for (let yr = y - 25; yr <= y + 10; yr++) list.push(yr)
    return list
  }, [])

  const monthLabels = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i,
        label: format(new Date(2000, i, 1), 'MMMM'),
      })),
    [],
  )

  const weeks = useMemo(() => {
    const w: Date[][] = []
    for (let i = 0; i < days.length; i += 7) {
      w.push(days.slice(i, i + 7))
    }
    return w
  }, [days])

  const getStatus = (d: Date): DayStatus => {
    const key = format(d, 'yyyy-MM-dd')
    return monthStatus[key] ?? 'empty'
  }

  const isFutureBlocked = (d: Date): boolean => {
    if (maxKey == null) return false
    return format(d, 'yyyy-MM-dd') > maxKey
  }

  const handleDayClick = (d: Date) => {
    if (isFutureBlocked(d)) return
    onSelectDate(format(d, 'yyyy-MM-dd'))
    onClose()
  }

  const handleToday = () => {
    onSelectDate(format(new Date(), 'yyyy-MM-dd'))
    onClose()
  }

  const applyMonth = (monthIndex: number) => {
    onMonthChange?.(startOfMonth(new Date(currentMonth.getFullYear(), monthIndex, 1)))
  }

  const applyYear = (year: number) => {
    onMonthChange?.(startOfMonth(new Date(year, currentMonth.getMonth(), 1)))
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 ${className}`}>
      <Card className="max-w-md w-full shadow-xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => onMonthChange?.(subMonths(currentMonth, 1))}
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-1 min-w-0 flex-wrap items-center justify-center gap-2">
              <label className="sr-only" htmlFor="calendar-month-select">
                Month
              </label>
              <select
                id="calendar-month-select"
                className={`${selectClass} max-w-[10rem]`}
                value={currentMonth.getMonth()}
                onChange={(e) => applyMonth(Number(e.target.value))}
              >
                {monthLabels.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor="calendar-year-select">
                Year
              </label>
              <select
                id="calendar-year-select"
                className={`${selectClass} w-[4.5rem]`}
                value={currentMonth.getFullYear()}
                onChange={(e) => applyYear(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 p-0"
              onClick={() => onMonthChange?.(addMonths(currentMonth, 1))}
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((d) => {
                  const status = getStatus(d)
                  const blocked = isFutureBlocked(d)
                  const inMonth = isSameMonth(d, currentMonth)
                  const dateStr = format(d, 'yyyy-MM-dd')
                  const selected = selectedDate === dateStr
                  const hasActivity = status === 'complete' || status === 'half'

                  return (
                    <button
                      key={dateStr}
                      type="button"
                      disabled={blocked}
                      onClick={() => handleDayClick(d)}
                      className={`
                        flex flex-col items-center justify-center rounded-lg p-2 text-sm transition-colors
                        ${blocked ? 'cursor-not-allowed text-gray-300 dark:text-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${inMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
                        ${
                          selected
                            ? 'ring-2 ring-[#ef725c] ring-offset-2 ring-offset-white dark:ring-offset-gray-950 bg-[#ef725c]/10'
                            : ''
                        }
                      `}
                      title={blocked ? 'Not available' : format(d, 'EEEE, MMM d')}
                    >
                      <span className={hasActivity && !blocked ? 'font-semibold' : ''}>{format(d, 'd')}</span>
                      <span
                        className={
                          status === 'complete'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : status === 'half'
                              ? 'text-amber-600 dark:text-amber-400'
                              : status === 'future' || blocked
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-400 dark:text-gray-500'
                        }
                      >
                        {blocked ? '–' : STATUS_CHAR[status]}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" className="flex-1" onClick={handleToday}>
              Today
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
