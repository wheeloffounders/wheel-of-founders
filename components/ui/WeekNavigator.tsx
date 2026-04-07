'use client'

import { useCallback, useEffect, useState } from 'react'
import { addDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns'
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

/** 10-day strip: 6 days before selected + selected + 3 after (month-agnostic). */
const DAYS_BEFORE_SELECTED = 6
const DAYS_AFTER_SELECTED = 3
const WINDOW_LEN = DAYS_BEFORE_SELECTED + 1 + DAYS_AFTER_SELECTED

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

function computeViewStart(selected: Date, minD: Date, maxD: Date): Date {
  const latestStart = subDays(maxD, WINDOW_LEN - 1)
  if (latestStart < minD) return minD
  const ideal = subDays(selected, DAYS_BEFORE_SELECTED)
  if (ideal < minD) return minD
  if (ideal > latestStart) return latestStart
  return ideal
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
  const latestStart = subDays(maxD, WINDOW_LEN - 1)
  const earliestStart = minD

  const [viewStart, setViewStart] = useState(() =>
    computeViewStart(parseLocal(selectedDate), minD, maxD)
  )

  /** Browser-local calendar date — avoids SSR/server UTC for “today” styling. */
  const [clientTodayYmd, setClientTodayYmd] = useState<string | null>(null)
  useEffect(() => {
    const tick = () => setClientTodayYmd(format(new Date(), 'yyyy-MM-dd'))
    tick()
    const id = window.setInterval(tick, 60_000)
    const onVis = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    const sel = parseLocal(selectedDate)
    setViewStart(computeViewStart(sel, minD, maxD))
  }, [selectedDate, minDate, maxDate])

  const viewEnd = addDays(viewStart, WINDOW_LEN - 1)
  const days = eachDayOfInterval({ start: viewStart, end: viewEnd })

  const canPrevStrip = viewStart > earliestStart
  const canNextStrip = viewStart < latestStart

  const goPrevStrip = useCallback(() => {
    if (!canPrevStrip) return
    setViewStart((vs) => {
      const next = subDays(vs, 7)
      if (next < earliestStart) return earliestStart
      return next
    })
  }, [canPrevStrip, earliestStart])

  const goNextStrip = useCallback(() => {
    if (!canNextStrip) return
    setViewStart((vs) => {
      const next = addDays(vs, 7)
      if (next > latestStart) return latestStart
      return next
    })
  }, [canNextStrip, latestStart])

  const bg = BG[variant]
  const selectedPill = selectedPillClassName ?? SELECTED_PILL[variant]

  return (
    <div
      className={`w-screen relative left-1/2 -translate-x-1/2 ${bg} pb-4 ${
        variant === 'evening' ? 'mb-3' : 'mb-6'
      }`}
    >
      <div className="max-w-3xl mx-auto px-2 flex items-stretch gap-1">
        <button
          type="button"
          aria-label="Show earlier days"
          disabled={!canPrevStrip}
          onClick={goPrevStrip}
          className="shrink-0 px-1 py-6 text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-x-auto min-w-0 flex justify-center">
          <div className="flex gap-1 sm:gap-2 py-1 px-1 min-w-max">
            {days.map((d, idx) => {
              const dateStr = format(d, 'yyyy-MM-dd')
              const isSelected = dateStr === selectedDate
              const disabled = dateStr < minDate || dateStr > maxDate
              const status = monthStatus[dateStr] ?? 'empty'
              const st = disabled ? 'future' : status
              const glyph = statusGlyph(st)

              const selected = isSelected && !disabled
              const isToday =
                clientTodayYmd !== null && dateStr === clientTodayYmd && !disabled
              const prev = idx > 0 ? days[idx - 1] : null
              const monthChanged = !prev || format(prev, 'yyyy-MM') !== format(d, 'yyyy-MM')

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={disabled}
                  aria-current={isToday && !selected ? 'date' : undefined}
                  onClick={() => !disabled && onSelectDate(dateStr)}
                  className={`flex flex-col items-center py-2.5 px-3 min-w-[3rem] sm:min-w-[2.85rem] rounded-2xl transition-colors ${
                    disabled ? 'opacity-40 cursor-not-allowed' : selected ? `${selectedPill} text-white` : 'hover:bg-white/20'
                  } ${
                    isToday && !selected
                      ? 'ring-2 ring-white/70 ring-offset-2 ring-offset-transparent'
                      : ''
                  }`}
                >
                  {monthChanged && (
                    <span
                      className={`text-[9px] sm:text-[10px] font-semibold uppercase tracking-wide leading-tight mb-0.5 ${
                        selected ? 'text-white/90' : 'text-white/60'
                      }`}
                    >
                      {format(d, 'MMM')}
                    </span>
                  )}
                  <span
                    className={`text-[10px] sm:text-xs font-medium uppercase tracking-wide ${
                      selected ? 'text-white' : 'text-white/70'
                    }`}
                  >
                    {format(d, 'EEE')}
                  </span>
                  <span className="text-sm font-semibold mt-0.5 tabular-nums text-white">{format(d, 'd')}</span>
                  <span className="mt-0.5 text-lg leading-none text-white">{glyph}</span>
                </button>
              )
            })}
          </div>
        </div>

        <button
          type="button"
          aria-label="Show later days"
          disabled={!canNextStrip}
          onClick={goNextStrip}
          className="shrink-0 px-1 py-6 text-white/90 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
