'use client'

import { useEffect, useRef } from 'react'
import { format, isSameDay } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { PAGE_SIDEBAR_THEME } from '@/components/layout/PageSidebar'

interface WeekSidebarProps {
  weekStart: Date
  selectedDate: Date | null
  onSelectDay: (date: Date) => void
  onPickDate: () => void
  onPrevWeek: () => void
  onNextWeek: () => void
  canGoNext: boolean
  todayStr: string
}

/** Daily History left rail — same theme as `PageSidebar` history variant (navy + coral selected). */
export function WeekSidebar({
  weekStart,
  selectedDate,
  onSelectDay,
  onPickDate,
  onPrevWeek,
  onNextWeek,
  canGoNext,
  todayStr,
}: WeekSidebarProps) {
  const theme = PAGE_SIDEBAR_THEME.history
  const navRef = useRef<HTMLElement | null>(null)

  const days: Date[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    days.push(d)
  }

  useEffect(() => {
    const root = navRef.current
    if (!root) return
    const todayEl = root.querySelector<HTMLElement>(`[data-date="${todayStr}"]`)
    if (todayEl) {
      todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [todayStr, weekStart])

  return (
    <div className={`flex flex-col flex-1 min-h-0 ${theme.shell}`}>
      <div className={`p-4 border-b shrink-0 ${theme.headerBorder}`}>
        <h1 className="text-xl font-semibold text-white">Daily History</h1>
        <p className={`text-sm mt-1 ${theme.subtitle}`}>Your founder&apos;s diary</p>
      </div>

      <div className="px-3 pt-3 pb-2 shrink-0 space-y-2">
        <button
          type="button"
          onClick={onPickDate}
          className={`flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white transition-colors ${theme.pickBtn} ${theme.pickBtnHover}`}
          aria-label="Pick a date"
        >
          <Calendar className="h-4 w-4 shrink-0" aria-hidden />
          Pick a date
        </button>
        <div className="flex items-center justify-between px-0.5">
          <button
            type="button"
            onClick={onPrevWeek}
            className={`rounded-lg p-2 transition-colors ${theme.chevronBtn} ${theme.chevronBtnHover}`}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNextWeek}
            disabled={!canGoNext}
            className={`rounded-lg p-2 transition-colors ${theme.chevronBtn} ${theme.chevronBtnHover} disabled:cursor-not-allowed ${theme.chevronDisabled}`}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav
        ref={navRef}
        className="page-sidebar-nav flex-1 overflow-y-auto p-3 pb-8"
        aria-label="Days this week"
      >
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
                  data-date={dateStr}
                  type="button"
                  onClick={() => onSelectDay(d)}
                  className={`
                    w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors
                    ${isSelected ? theme.rowSelected : theme.rowUnselected}
                  `}
                >
                  <span className="block truncate">{dayName}</span>
                  <span
                    className={`block truncate text-xs ${
                      isSelected ? theme.rowSublineSelected : theme.rowSublineMuted
                    }`}
                  >
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
