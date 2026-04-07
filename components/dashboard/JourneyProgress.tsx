'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, addDays } from 'date-fns'
import { Flame } from 'lucide-react'
import useSWR from 'swr'
import { Card, CardContent } from '@/components/ui/card'
import { InfoTooltip } from '@/components/InfoTooltip'
import { supabase } from '@/lib/supabase'
import { getEffectivePlanDate } from '@/lib/effective-plan-date'
import { fetchJson } from '@/lib/api/fetch-json'
import { getBrowserTimeZone } from '@/lib/timezone'

type ProgressStatus = 'full' | 'half' | 'partial' | 'empty' | 'future'

/** Anchor on founder-day (before 4am = previous calendar day) so strip matches evening CTA after midnight. */
function getLast7Days(): string[] {
  const anchor = new Date(`${getEffectivePlanDate()}T12:00:00`)
  const dates: string[] = []
  for (let i = 5; i >= 1; i--) {
    dates.push(format(subDays(anchor, i), 'yyyy-MM-dd'))
  }
  dates.push(format(anchor, 'yyyy-MM-dd'))
  dates.push(format(addDays(anchor, 1), 'yyyy-MM-dd'))
  return dates
}

function getTooltip(date: string, status: ProgressStatus): string {
  const formatted = format(new Date(date + 'T12:00:00'), 'MMMM d')
  switch (status) {
    case 'full':
      return `${formatted}: Completed! 🎉`
    case 'half':
      return `${formatted}: Morning done, evening pending`
    case 'partial':
      return `${formatted}: Save your morning plan to complete morning`
    case 'empty':
      return `${formatted}: No entries yet`
    case 'future':
      return `${formatted}: Tomorrow's a new day`
    default:
      return formatted
  }
}

function getNavigationTarget(date: string, status: ProgressStatus): string | null {
  if (status === 'future') return null
  if (status === 'empty') return `/morning?date=${date}`
  return `/evening?date=${date}#evening-form`
}

function dayCircleClass(status: ProgressStatus, isToday: boolean): string {
  const base =
    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#ef725c] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900'
  if (status === 'future') {
    return `${base} bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500`
  }
  if (status === 'full') {
    return `${base} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300${isToday ? ' ring-2 ring-green-500 ring-offset-1 dark:ring-offset-gray-900' : ''}`
  }
  /** Loss aversion: today with morning done but no evening — streak not “locked” yet */
  if (status === 'half' && isToday) {
    return `${base} bg-transparent text-amber-900 dark:text-amber-100 border-2 border-dashed border-[#FBBF24] shadow-[0_0_0_1px_rgba(251,191,36,0.35)] animate-pulse`
  }
  if (status === 'half' || status === 'partial') {
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300`
  }
  if (isToday) {
    return `${base} bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-2 border-amber-500`
  }
  return `${base} bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500`
}

export function JourneyProgress() {
  const router = useRouter()
  const [streak, setStreak] = useState(0)

  const days = useMemo(() => getLast7Days(), [])

  const refreshStreak = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: row } = await supabase
      .from('user_profiles')
      .select('current_streak')
      .eq('id', user.id)
      .maybeSingle()
    const n = row?.current_streak
    setStreak(typeof n === 'number' && Number.isFinite(n) ? n : 0)
  }, [])

  const progressUrl = useMemo(() => {
    const q = new URLSearchParams({ dates: days.join(',') })
    const tz = getBrowserTimeZone()
    if (tz) q.set('tz', tz)
    return `/api/user/progress?${q.toString()}`
  }, [days])
  const {
    data: progress = {} as Record<string, ProgressStatus>,
    isLoading: progressLoading,
    mutate: mutateProgress,
  } = useSWR<Record<string, ProgressStatus>>(progressUrl, (url) => fetchJson<Record<string, ProgressStatus>>(url), {
    revalidateOnFocus: false,
    dedupingInterval: 120_000,
    keepPreviousData: true,
    onSuccess: () => {
      void refreshStreak()
    },
  })

  const todayStr = getEffectivePlanDate()
  const reflectionPendingToday = (progress[todayStr] ?? 'empty') === 'half'
  const streakDayToLock = streak + 1
  const rangeStart = days[0]
  const rangeEnd = days[days.length - 1]
  const rangeLabel =
    rangeStart === rangeEnd
      ? format(new Date(rangeStart + 'T12:00:00'), 'MMMM d')
      : `${format(new Date(rangeStart + 'T12:00:00'), 'MMM d')}–${format(new Date(rangeEnd + 'T12:00:00'), 'd')}`

  useEffect(() => {
    const onSync = () => {
      void mutateProgress()
      void refreshStreak()
    }
    window.addEventListener('data-sync-request', onSync)
    return () => window.removeEventListener('data-sync-request', onSync)
  }, [mutateProgress, refreshStreak])

  return (
    <Card className="h-full flex flex-col border border-gray-200 dark:border-gray-700 border-l-4 border-l-emerald-500 bg-white/60 dark:bg-gray-800/40 shadow-none overflow-visible">
      <CardContent className="px-4 pb-4 pt-4 overflow-visible">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-2 min-w-0 mb-2">
              <Flame className="w-4 h-4 text-[#ef725c] shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Journey Progress
                  </p>
                  <InfoTooltip
                    presentation="popover"
                    position="bottom"
                    text="A complete day is morning saved on that day plus evening reflection. Each completed full-loop day grows your streak."
                  />
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{rangeLabel}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Each completed day adds to your streak
                </p>
              </div>
            </div>
            <div className="flex items-baseline gap-1 shrink-0" aria-live="polite">
              <span role="img" aria-hidden>
                🔥
              </span>
              <span className="text-2xl font-bold text-[#ef725c] tabular-nums">{streak}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                day{streak === 1 ? '' : 's'} streak
              </span>
            </div>
          </div>

          <div
            className="flex flex-wrap gap-1.5 items-center justify-start sm:justify-center min-h-[2.5rem]"
            aria-busy={progressLoading}
          >
            {progressLoading && Object.keys(progress).length === 0
              ? days.map((date) => (
                  <span
                    key={date}
                    className="w-8 h-8 rounded-full shrink-0 bg-gray-200 dark:bg-gray-700 animate-pulse"
                  />
                ))
              : days.map((date) => {
                  const status = progress[date] ?? 'empty'
                  const isToday = date === todayStr
                  const target = getNavigationTarget(date, status)
                  const dateObj = new Date(date + 'T12:00:00')
                  const dayNum = dateObj.getDate()
                  const tooltip = getTooltip(date, status)
                  const circleClass = dayCircleClass(status, isToday)

                  const inner = <span className="tabular-nums">{dayNum}</span>

                  return target ? (
                    <button
                      key={date}
                      type="button"
                      onClick={() => router.push(target)}
                      className={circleClass}
                      title={tooltip}
                      aria-label={tooltip}
                    >
                      {inner}
                    </button>
                  ) : (
                    <span key={date} className={circleClass} title={tooltip} aria-label={tooltip}>
                      {inner}
                    </span>
                  )
                })}
          </div>
          {reflectionPendingToday ? (
            <p className="text-xs font-medium text-amber-900 dark:text-amber-100/90 text-center sm:text-left leading-snug">
              Reflection pending—finish tonight to lock in Day {streakDayToLock}.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
