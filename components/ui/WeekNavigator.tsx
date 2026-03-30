'use client'

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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { DayStatus } from '@/lib/date-utils'
import type { PageHeaderVariant } from '@/components/ui/PageHeader'

export type WeekNavigatorVariant = PageHeaderVariant

const BG: Record<WeekNavigatorVariant, string> = {
  morning: 'bg-[#ef725c]',
  evening: 'bg-[#152b50]',
  emergency: 'bg-[#f59e0b]',
}

/** Selected day: full vertical pill behind the whole cell */
const SELECTED_PILL: Record<WeekNavigatorVariant, string> = {
  morning: 'bg-[#152b50]',
  evening: 'bg-[#ef725c]',
  emergency: 'bg-[#152b50]',
}

function statusGlyph(status: DayStatus): string {
  if (status === 'complete') return '●'
  if (status === 'half') return '◐'
  if (status === 'future') return '–'
  return '○'
}

interface WeekNavigatorProps {
  variant: WeekNavigatorVariant
  selectedDate: string
  minDate: string
  maxDate: string
  monthStatus: Record<string, DayStatus>
  onSelectDate: (date: string) => void
  /** Override selected-day pill (default: navy morning/emergency, coral evening) */
  selectedPillClassName?: string
}

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

export function WeekNavigator({
  variant,
  selectedDate,
  minDate,
  maxDate,
  monthStatus,
  onSelectDate,
  selectedPillClassName,
}: WeekNavigatorProps) {
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

  const bg = BG[variant]
  const selectedPill = selectedPillClassName ?? SELECTED_PILL[variant]

  return (
    <div className={`w-screen relative left-1/2 -translate-x-1/2 ${bg} pb-4 mb-6`}>
      <div className="max-w-3xl mx-auto px-2 flex items-stretch gap-1">
        <button
          type="button"
          aria-label="Previous week"
          disabled={!canPrevWeek}
          onClick={goPrevWeek}
          className="shrink-0 px-1 py-6 text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-x-auto min-w-0 flex justify-center">
          <div className="flex gap-1 sm:gap-2 py-1 px-1 min-w-max">
            {days.map((d) => {
              const dateStr = format(d, 'yyyy-MM-dd')
              const isSelected = dateStr === selectedDate
              const disabled = dateStr < minDate || dateStr > maxDate
              const status = monthStatus[dateStr] ?? 'empty'
              const st = disabled ? 'future' : status
              const glyph = statusGlyph(st)

              const selected = isSelected && !disabled

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  onClick={() => !disabled && onSelectDate(dateStr)}
                  className={`flex flex-col items-center py-2 px-3 min-w-[2.75rem] rounded-2xl transition-colors ${
                    disabled ? 'opacity-40 cursor-not-allowed' : selected ? `${selectedPill} text-white` : 'hover:bg-white/20'
                  }`}
                >
                  <span
                    className={`text-[10px] sm:text-xs font-medium uppercase tracking-wide ${
                      selected ? 'text-white' : 'text-white/70'
                    }`}
                  >
                    {format(d, 'EEE')}
                  </span>
                  <span className="text-sm font-semibold mt-0.5 tabular-nums text-white">
                    {format(d, 'd')}
                  </span>
                  <span className="mt-0.5 text-lg leading-none text-white">{glyph}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Next week"
          disabled={!canNextWeek}
          onClick={goNextWeek}
          className="shrink-0 px-1 py-6 text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
