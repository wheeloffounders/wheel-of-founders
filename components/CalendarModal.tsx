'use client'

import { useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthYear } from '@/lib/date-utils'
import type { DayStatus } from '@/lib/date-utils'

type MonthStatusMap = Record<string, DayStatus>

interface CalendarModalProps {
  isOpen: boolean
  onClose: () => void
  currentMonth: Date
  onMonthChange?: (month: Date) => void
  onSelectDate: (date: string) => void
  monthStatus: MonthStatusMap
  maxDate?: Date
  className?: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const STATUS_CHAR: Record<DayStatus, string> = {
  complete: '●',
  half: '◐',
  empty: '○',
  future: '–',
}

export function CalendarModal({
  isOpen,
  onClose,
  currentMonth,
  onMonthChange,
  onSelectDate,
  monthStatus,
  maxDate = new Date(),
  className = '',
}: CalendarModalProps) {
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

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

  const isFuture = (d: Date): boolean => {
    const key = format(d, 'yyyy-MM-dd')
    const maxKey = format(maxDate, 'yyyy-MM-dd')
    return key > maxKey
  }

  const handleDayClick = (d: Date) => {
    if (isFuture(d)) return
    onSelectDate(format(d, 'yyyy-MM-dd'))
    onClose()
  }

  const handleToday = () => {
    onSelectDate(format(maxDate, 'yyyy-MM-dd'))
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/40 ${className}`}>
      <Card className="max-w-md w-full mx-4 shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onMonthChange?.(subMonths(currentMonth, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <CardTitle className="text-lg font-semibold">
            {formatMonthYear(currentMonth)}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onMonthChange?.(addMonths(currentMonth, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
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
                  const future = isFuture(d)
                  const inMonth = isSameMonth(d, currentMonth)
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      disabled={future}
                      onClick={() => handleDayClick(d)}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-lg text-sm transition-colors
                        ${future ? 'cursor-not-allowed text-gray-300 dark:text-gray-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                        ${inMonth ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}
                      `}
                      title={future ? 'Future' : format(d, 'EEEE, MMM d')}
                    >
                      <span>{format(d, 'd')}</span>
                      <span
                        className={
                          status === 'complete'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : status === 'half'
                              ? 'text-amber-600 dark:text-amber-400'
                              : status === 'future' || future
                                ? 'text-gray-400 dark:text-gray-500'
                                : 'text-gray-400 dark:text-gray-500'
                        }
                      >
                        {future ? '–' : STATUS_CHAR[status]}
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
