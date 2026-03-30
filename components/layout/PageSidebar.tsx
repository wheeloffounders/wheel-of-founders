'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useState } from 'react'
import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
  subWeeks,
} from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

export type PageSidebarVariant = 'morning' | 'evening' | 'emergency' | 'history'

function parseLocal(iso: string): Date {
  return parseISO(iso.length === 10 ? `${iso}T12:00:00` : iso)
}

function clampWeekStart(sunday: Date, minD: Date, maxD: Date): Date {
  const minWeek = startOfWeek(minD, { weekStartsOn: 0 })
  const maxWeek = startOfWeek(maxD, { weekStartsOn: 0 })
  if (sunday < minWeek) return minWeek
  if (sunday > maxWeek) return maxWeek
  return sunday
}

/** Theme shell + row styles per page (sidebar bg + selected date pill). */
export const PAGE_SIDEBAR_THEME: Record<
  PageSidebarVariant,
  {
    shell: string
    headerBorder: string
    subtitle: string
    pickBtn: string
    pickBtnHover: string
    chevronBtn: string
    chevronBtnHover: string
    chevronDisabled: string
    rowUnselected: string
    rowSelected: string
    rowSublineMuted: string
    rowSublineSelected: string
  }
> = {
  morning: {
    shell: 'bg-[#ef725c] text-white',
    headerBorder: 'border-white/20',
    subtitle: 'text-white/85',
    pickBtn: 'bg-white/20',
    pickBtnHover: 'hover:bg-white/30',
    chevronBtn: 'text-white',
    chevronBtnHover: 'hover:bg-white/15',
    chevronDisabled: 'disabled:opacity-40',
    rowUnselected: 'text-white hover:bg-white/15',
    rowSelected: 'bg-[#152b50] text-white',
    rowSublineMuted: 'text-white/75',
    rowSublineSelected: 'text-white/90',
  },
  evening: {
    shell: 'bg-[#152b50] text-white',
    headerBorder: 'border-white/15',
    subtitle: 'text-white/70',
    pickBtn: 'bg-white/20',
    pickBtnHover: 'hover:bg-white/30',
    chevronBtn: 'text-white',
    chevronBtnHover: 'hover:bg-white/10',
    chevronDisabled: 'disabled:opacity-40',
    rowUnselected: 'text-white hover:bg-white/10',
    rowSelected: 'bg-[#ef725c] text-white',
    rowSublineMuted: 'text-white/70',
    rowSublineSelected: 'text-white/90',
  },
  emergency: {
    shell: 'bg-[#f59e0b] text-white',
    headerBorder: 'border-black/10',
    subtitle: 'text-white/90',
    pickBtn: 'bg-black/20',
    pickBtnHover: 'hover:bg-black/30',
    chevronBtn: 'text-white',
    chevronBtnHover: 'hover:bg-black/15',
    chevronDisabled: 'disabled:opacity-40',
    rowUnselected: 'text-white hover:bg-black/15',
    rowSelected: 'bg-[#152b50] text-white',
    rowSublineMuted: 'text-white/85',
    rowSublineSelected: 'text-white/90',
  },
  history: {
    shell: 'bg-[#152b50] text-white',
    headerBorder: 'border-white/15',
    subtitle: 'text-white/70',
    pickBtn: 'bg-white/20',
    pickBtnHover: 'hover:bg-white/30',
    chevronBtn: 'text-white',
    chevronBtnHover: 'hover:bg-white/10',
    chevronDisabled: 'disabled:opacity-40',
    rowUnselected: 'text-white hover:bg-white/10',
    rowSelected: 'bg-[#ef725c] text-white',
    rowSublineMuted: 'text-white/70',
    rowSublineSelected: 'text-white/90',
  },
}

export interface PageSidebarProps {
  variant: PageSidebarVariant
  title: string
  subtitle?: string
  titleIcon: ReactNode
  selectedDate: string
  minDate: string
  maxDate: string
  todayStr: string
  onSelectDate: (date: string) => void
  onPickDate: () => void
}

/**
 * Left rail: themed by page, Pick a date, week chevrons, vertical day list.
 * Week boundaries match `WeekNavigator` (week starts Sunday).
 */
export function PageSidebar({
  variant,
  title,
  subtitle,
  titleIcon,
  selectedDate,
  minDate,
  maxDate,
  todayStr,
  onSelectDate,
  onPickDate,
}: PageSidebarProps) {
  const theme = PAGE_SIDEBAR_THEME[variant]
  const minD = parseLocal(minDate)
  const maxD = parseLocal(maxDate)
  const earliestWeekStart = startOfWeek(minD, { weekStartsOn: 0 })
  const latestWeekStart = startOfWeek(maxD, { weekStartsOn: 0 })

  const [viewWeekStart, setViewWeekStart] = useState(() =>
    clampWeekStart(startOfWeek(parseLocal(selectedDate), { weekStartsOn: 0 }), minD, maxD)
  )

  useEffect(() => {
    const sel = parseLocal(selectedDate)
    const sw = startOfWeek(sel, { weekStartsOn: 0 })
    setViewWeekStart(clampWeekStart(sw, minD, maxD))
  }, [selectedDate, minDate, maxDate])

  const weekEnd = endOfWeek(viewWeekStart, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: viewWeekStart, end: weekEnd })

  const canPrevWeek = viewWeekStart > earliestWeekStart
  const canNextWeek = viewWeekStart < latestWeekStart

  const goPrevWeek = useCallback(() => {
    if (!canPrevWeek) return
    setViewWeekStart((w) => clampWeekStart(subWeeks(w, 1), minD, maxD))
  }, [canPrevWeek, minD, maxD])

  const goNextWeek = useCallback(() => {
    if (!canNextWeek) return
    setViewWeekStart((w) => clampWeekStart(addWeeks(w, 1), minD, maxD))
  }, [canNextWeek, minD, maxD])

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${theme.shell}`}>
      <div className={`shrink-0 border-b p-4 ${theme.headerBorder}`}>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          <span className="shrink-0">{titleIcon}</span>
          <span className="min-w-0 truncate">{title}</span>
        </h1>
        {subtitle ? <p className={`mt-1 text-sm ${theme.subtitle}`}>{subtitle}</p> : null}
      </div>

      <div className="shrink-0 space-y-2 px-3 pb-2 pt-3">
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
            onClick={goPrevWeek}
            disabled={!canPrevWeek}
            className={`rounded-lg p-2 transition-colors ${theme.chevronBtn} ${theme.chevronBtnHover} disabled:cursor-not-allowed ${theme.chevronDisabled}`}
            aria-label="Previous week"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNextWeek}
            disabled={!canNextWeek}
            className={`rounded-lg p-2 transition-colors ${theme.chevronBtn} ${theme.chevronBtnHover} disabled:cursor-not-allowed ${theme.chevronDisabled}`}
            aria-label="Next week"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <nav
        className="page-sidebar-nav min-h-0 flex-1 overflow-y-auto p-3 pb-8"
        aria-label="Week days"
      >
        <ul className="space-y-1">
          {days.map((d) => {
            const dateStr = format(d, 'yyyy-MM-dd')
            const isSelected = dateStr === selectedDate
            const disabled = dateStr < minDate || dateStr > maxDate
            const isToday = dateStr === todayStr
            const dayName = format(d, 'EEEE')
            const dayShort = format(d, 'MMM d')

            return (
              <li key={dateStr}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onSelectDate(dateStr)}
                  className={`
                    w-full rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors
                    ${disabled ? 'cursor-not-allowed opacity-40' : ''}
                    ${!disabled && isSelected ? theme.rowSelected : ''}
                    ${!disabled && !isSelected ? theme.rowUnselected : ''}
                  `}
                >
                  <span className="block truncate">{dayName}</span>
                  <span
                    className={`block truncate text-xs ${
                      isSelected ? theme.rowSublineSelected : theme.rowSublineMuted
                    }`}
                  >
                    {dayShort}
                    {isToday && !disabled && ' • Today'}
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
