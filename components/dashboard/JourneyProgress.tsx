'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, addDays } from 'date-fns'
import { Flame } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

type ProgressStatus = 'full' | 'half' | 'empty' | 'future'

function getLast7Days(): string[] {
  const today = new Date()
  const dates: string[] = []
  for (let i = 5; i >= 1; i--) {
    dates.push(format(subDays(today, i), 'yyyy-MM-dd'))
  }
  dates.push(format(today, 'yyyy-MM-dd'))
  dates.push(format(addDays(today, 1), 'yyyy-MM-dd'))
  return dates
}

function getTooltip(date: string, status: ProgressStatus): string {
  const formatted = format(new Date(date + 'T12:00:00'), 'MMMM d')
  switch (status) {
    case 'full':
      return `${formatted}: Completed! 🎉`
    case 'half':
      return `${formatted}: Morning done, evening pending`
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
  return `/evening?date=${date}`
}

export function JourneyProgress() {
  const router = useRouter()
  const [streak, setStreak] = useState(0)
  const [progress, setProgress] = useState<Record<string, ProgressStatus>>({})
  const [loading, setLoading] = useState(true)

  const days = useMemo(() => getLast7Days(), [])
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const rangeStart = days[0]
  const rangeEnd = days[days.length - 1]
  const rangeLabel =
    rangeStart === rangeEnd
      ? format(new Date(rangeStart + 'T12:00:00'), 'MMMM d')
      : `${format(new Date(rangeStart + 'T12:00:00'), 'MMM d')}–${format(new Date(rangeEnd + 'T12:00:00'), 'd')}`

  useEffect(() => {
    const fetchStreak = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('current_streak')
        .eq('id', user.id)
        .maybeSingle()

      const p = profile as { current_streak?: number } | null
      const rawStreak = p?.current_streak
      const safeStreak = typeof rawStreak === 'number' && Number.isFinite(rawStreak) ? rawStreak : 0
      // Debug: confirm streak being used for JourneyProgress
      console.log('[JourneyProgress] streak from profile', {
        userId: user.id,
        rawStreak,
        safeStreak,
        hasError: !!error,
      })
      setStreak(safeStreak)
    }
    fetchStreak()
  }, [])

  const fetchProgress = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/user/progress?dates=${days.join(',')}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Failed to fetch progress')
      const data = (await res.json()) as Record<string, ProgressStatus>
      setProgress(data)
    } catch (err) {
      console.error('[JourneyProgress] fetch error', err)
      setProgress({})
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    fetchProgress()
  }, [fetchProgress])

  useEffect(() => {
    const handleRefresh = () => fetchProgress()
    window.addEventListener('data-sync-request', handleRefresh)
    return () => window.removeEventListener('data-sync-request', handleRefresh)
  }, [fetchProgress])

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardContent className="py-2.5 px-3 sm:px-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: label */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Flame className="w-4 h-4 text-[#ef725c]" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Journey Progress
            </span>
          </div>

          {/* Middle: dates with status icons */}
          <div className="flex-1 sm:px-3">
            <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
              {days.map((date, index) => {
                const status = progress[date] ?? 'empty'
                const isToday = date === todayStr
                const target = getNavigationTarget(date, status)

                const symbol = {
                  full: '◉',
                  half: '◐',
                  empty: '○',
                  future: '◌',
                }[status]

                const colorClass = {
                  full: 'text-emerald-600 dark:text-emerald-400',
                  half: 'text-amber-600 dark:text-amber-400',
                  empty: 'text-gray-400 dark:text-gray-500',
                  future: 'text-gray-400 dark:text-gray-600',
                }[status]

                const dateObj = new Date(date + 'T12:00:00')
                const label =
                  index === 0
                    ? format(dateObj, 'MMM d')
                    : format(dateObj, 'd')

                const prefix = index === 0 ? '' : ', '

                const content = (
                  <>
                    <span className={colorClass}>{symbol}</span>
                    <span className={isToday ? 'font-semibold' : ''}>{label}</span>
                  </>
                )

                return target ? (
                  <button
                    key={date}
                    type="button"
                    onClick={() => router.push(target)}
                    className="inline-flex items-center gap-1 focus:outline-none focus:underline"
                    title={getTooltip(date, status)}
                    aria-label={getTooltip(date, status)}
                  >
                    {prefix}
                    {content}
                  </button>
                ) : (
                  <span
                    key={date}
                    className="inline-flex items-center gap-1 cursor-default"
                    title={getTooltip(date, status)}
                    aria-label={getTooltip(date, status)}
                  >
                    {prefix}
                    {content}
                  </span>
                )
              })}
            </div>
          </div>

          {/* Right: streak */}
          <div className="mt-1 sm:mt-0 flex items-center gap-1 text-xs sm:text-sm text-[#ef725c] font-medium shrink-0">
            <span role="img" aria-label="streak">
              🔥
            </span>
            <span>
              {streak} day{streak === 1 ? '' : 's'} streak
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
