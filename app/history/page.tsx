'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  format,
  startOfWeek,
  addWeeks,
  subWeeks,
  subDays,
  isWithinInterval,
  startOfMonth,
} from 'date-fns'
import { Calendar } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { HistoryAccessGate } from '@/components/HistoryAccessGate'
import { WeekSidebar } from '@/components/history/WeekSidebar'
import { DayView, type DayData } from '@/components/history/DayView'
import { MobileDayTabs, type DayTabItem } from '@/components/history/MobileDayTabs'
import { DatePickerModal } from '@/components/ui/DatePickerModal'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { trackEvent } from '@/lib/analytics'
import type { DayStatus } from '@/lib/date-utils'
import { getNextBadgeInfo } from '@/lib/badges/next-badge-info'

const MOBILE_INITIAL_DAYS = 14
const MOBILE_LOAD_MORE_DAYS = 7

function hasDayEntries(dayData: unknown): boolean {
  if (!dayData || typeof dayData !== 'object') return false
  const d = dayData as Record<string, unknown>
  const plan = d.morningPlan as { tasks?: unknown[]; decision?: unknown } | undefined
  const hasTasks = plan?.tasks && Array.isArray(plan.tasks) && plan.tasks.length > 0
  const hasDecision = plan?.decision != null
  const hasMorning = !!d.morningInsight || hasTasks || hasDecision
  const hasEvening = !!d.eveningReview
  const hasEmergencies = Array.isArray(d.emergencies) && d.emergencies.length > 0
  return !!(hasMorning || hasEvening || hasEmergencies)
}

export default function HistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [mobileRangeStart, setMobileRangeStart] = useState<Date>(() =>
    subDays(new Date(), MOBILE_INITIAL_DAYS - 1)
  )
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [weekData, setWeekData] = useState<Record<string, unknown> | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => startOfMonth(new Date()))
  const [monthStatus, setMonthStatus] = useState<Record<string, DayStatus>>({})
  const [currentStreak, setCurrentStreak] = useState(0)
  const [daysWithEntries, setDaysWithEntries] = useState(0)
  const [totalEveningReviews, setTotalEveningReviews] = useState(0)
  const fetchGenRef = useRef(0)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const today = new Date()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const dateParam = searchParams?.get('date')
  const celebrateParam = searchParams?.get('celebrate') === 'true'
  const urlDateStr =
    dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : null

  const fetchStart = isMobile ? format(mobileRangeStart, 'yyyy-MM-dd') : weekStartStr
  const fetchEnd = isMobile ? todayStr : weekEndStr

  /** Include URL / selected day on first paint so we never fetch a range that omits the visible day (fixes empty DayView until refetch). */
  const effectiveFetchStart = useMemo(() => {
    let start = fetchStart
    if (urlDateStr && urlDateStr < start) start = urlDateStr
    if (selectedDate) {
      const s = format(selectedDate, 'yyyy-MM-dd')
      if (s < start) start = s
    }
    return start
  }, [fetchStart, urlDateStr, selectedDate])

  const effectiveFetchEnd = useMemo(() => {
    let end = fetchEnd
    if (urlDateStr && urlDateStr > end) end = urlDateStr
    if (selectedDate) {
      const s = format(selectedDate, 'yyyy-MM-dd')
      if (s > end) end = s
    }
    return end
  }, [fetchEnd, urlDateStr, selectedDate])

  const canGoNext =
    isWithinInterval(addWeeks(weekStart, 1), {
      start: new Date(0),
      end: today,
    }) || format(addWeeks(weekStart, 1), 'yyyy-MM-dd') <= todayStr

  const handlePrevWeek = () => {
    setWeekStart((prev) => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    if (canGoNext) {
      setWeekStart((prev) => addWeeks(prev, 1))
    }
  }

  const fetchMonthStatus = useCallback(async (month: Date) => {
    const session = await getUserSession()
    if (!session) return
    const monthStr = format(month, 'yyyy-MM')
    const res = await fetch(`/api/user/month-status?month=${monthStr}`, { credentials: 'include' })
    if (res.ok) {
      const data = (await res.json()) as Record<string, DayStatus>
      setMonthStatus(data)
    }
  }, [])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserTier(session.user.tier || 'beta')

      const { supabase } = await import('@/lib/supabase')
      const [profileRes, morningCommitsRes, eveningsRes] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('current_streak')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('morning_plan_commits')
          .select('plan_date')
          .eq('user_id', session.user.id),
        supabase
          .from('evening_reviews')
          .select('review_date')
          .eq('user_id', session.user.id),
      ])

      const streak = (profileRes.data as { current_streak?: number | null } | null)?.current_streak ?? 0
      setCurrentStreak(Math.max(0, Number.isFinite(streak) ? Math.floor(streak) : 0))

      const dates = new Set<string>()
      const morningRows = (morningCommitsRes.data ?? []) as Array<{ plan_date?: string | null }>
      const eveningRows = (eveningsRes.data ?? []) as Array<{ review_date?: string | null }>
      for (const row of morningRows) {
        if (typeof row.plan_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.plan_date)) {
          dates.add(row.plan_date)
        }
      }
      for (const row of eveningRows) {
        if (typeof row.review_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.review_date)) {
          dates.add(row.review_date)
        }
      }
      setDaysWithEntries(dates.size)
    }
    checkAuth()
  }, [router])

  const fetchWeekData = useCallback(async () => {
    const session = await getUserSession()
    if (!session) return

    const { supabase } = await import('@/lib/supabase')
    const { data: sessionData } = await supabase.auth.getSession()
    const authToken = sessionData?.session?.access_token

    const gen = ++fetchGenRef.current
    setLoading(true)
    try {
      const res = await fetch(
        `/api/history/week?start=${effectiveFetchStart}&end=${effectiveFetchEnd}`,
        {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          credentials: 'include',
          cache: 'no-store',
        }
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      if (gen !== fetchGenRef.current) return
      setWeekData(data.days ?? {})
    } catch (err) {
      console.error('[history] Fetch error:', err)
      if (gen === fetchGenRef.current) setWeekData({})
    } finally {
      if (gen === fetchGenRef.current) setLoading(false)
    }
  }, [effectiveFetchStart, effectiveFetchEnd])

  useEffect(() => {
    fetchWeekData()
  }, [fetchWeekData])

  useEffect(() => {
    const param = searchParams?.get('date')
    if (param && /^\d{4}-\d{2}-\d{2}$/.test(param)) {
      const d = new Date(param + 'T12:00:00')
      setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))
      setMobileRangeStart((prev) => {
        const newStart = subDays(d, MOBILE_INITIAL_DAYS - 1)
        return newStart < prev ? newStart : prev
      })
      setSelectedDate(d)
      setDisplayedMonth(startOfMonth(d))
    } else {
      setSelectedDate((prev) => {
        if (prev) return prev
        const n = new Date()
        setDisplayedMonth(startOfMonth(n))
        return n
      })
    }
  }, [searchParams])

  useEffect(() => {
    if (!selectedDate) return
    const m = startOfMonth(selectedDate)
    void fetchMonthStatus(m)
  }, [selectedDate, fetchMonthStatus])

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date)
    const ds = format(date, 'yyyy-MM-dd')
    router.replace(`/history?date=${ds}`, { scroll: false })
  }

  const handleCalendarSelect = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))
    setSelectedDate(d)
    setDisplayedMonth(startOfMonth(d))
    setMobileRangeStart((prev) => {
      const needStart = subDays(d, MOBILE_INITIAL_DAYS - 1)
      return needStart < prev ? needStart : prev
    })
    router.replace(`/history?date=${dateStr}`, { scroll: false })
  }

  const openDatePicker = () => {
    const base = selectedDate ?? new Date()
    setDisplayedMonth(startOfMonth(base))
    void fetchMonthStatus(startOfMonth(base))
    setCalendarOpen(true)
  }

  const handleLoadMore = () => {
    setMobileRangeStart((prev) => subDays(prev, MOBILE_LOAD_MORE_DAYS))
  }

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedDayData: DayData | null =
    selectedDateStr && weekData ? ((weekData[selectedDateStr] as DayData | undefined) ?? null) : null

  useEffect(() => {
    if (!celebrateParam || !selectedDateStr || selectedDateStr !== todayStr) return
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    if (!url.searchParams.has('celebrate')) return
    url.searchParams.delete('celebrate')
    window.history.replaceState({}, '', url.toString())
  }, [celebrateParam, selectedDateStr, todayStr])

  const mobileDays: DayTabItem[] = useMemo(() => {
    if (!isMobile) return []
    const days: DayTabItem[] = []
    let d = new Date(mobileRangeStart)
    d.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setHours(23, 59, 59, 999)
    while (d <= end) {
      const dateStr = format(d, 'yyyy-MM-dd')
      const dayData = weekData?.[dateStr]
      days.push({
        date: new Date(d),
        hasEntries: hasDayEntries(dayData),
      })
      d.setDate(d.getDate() + 1)
    }
    return days
  }, [isMobile, mobileRangeStart, today, weekData])

  useEffect(() => {
    trackEvent('history_page_view', { diary_mode: true })
  }, [])

  const datePickerModal = (
    <DatePickerModal
      isOpen={calendarOpen}
      onClose={() => setCalendarOpen(false)}
      currentMonth={displayedMonth}
      onMonthChange={(month) => {
        setDisplayedMonth(month)
        void fetchMonthStatus(month)
      }}
      onSelectDate={(dateStr) => {
        handleCalendarSelect(dateStr)
        setCalendarOpen(false)
      }}
      monthStatus={monthStatus}
      selectedDate={selectedDateStr ?? undefined}
    />
  )

  return (
    <HistoryAccessGate user={{ tier: userTier }} date={selectedDate ?? new Date()}>
      {isMobile ? (
        <div className="pb-24 pt-4 px-4 md:px-5">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#152b50]/10 dark:bg-gray-700">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily History</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your founder&apos;s diary</p>
              </div>
            </div>
            <button
              type="button"
              onClick={openDatePicker}
              className="inline-flex w-full min-h-[44px] items-center justify-center gap-2 rounded-full bg-[#152b50]/15 px-4 py-2.5 text-sm font-medium text-[#152b50] transition-colors hover:bg-[#152b50]/25 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 sm:w-auto sm:justify-center"
            >
              <Calendar className="h-4 w-4 shrink-0" aria-hidden />
              Pick a date
            </button>
          </div>

          <MobileDayTabs
            days={mobileDays}
            selectedDate={selectedDate ?? new Date()}
            onSelectDay={(d) => handleSelectDay(d)}
            todayStr={todayStr}
          />
          <main className="mt-6 flex-1 min-w-0">
            {selectedDateStr ? (
              <DayView
                dateStr={selectedDateStr}
                dateLabel={format(selectedDate!, 'EEEE, MMMM d, yyyy')}
                isToday={selectedDateStr === todayStr}
                dayData={selectedDayData ?? null}
                loading={loading}
                hideDateHeader
                celebrate={celebrateParam && selectedDateStr === todayStr}
                stats={{
                  currentStreak,
                  daysWithEntries,
                  nextBadge: getNextBadgeInfo(daysWithEntries, totalEveningReviews),
                }}
              />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">Select a day to view your diary.</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLoadMore}
              className="w-full mt-6 py-3 min-h-[44px] bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 font-medium transition-colors touch-manipulation"
            >
              Load More
            </button>
          </main>
          {datePickerModal}
        </div>
      ) : (
        <>
          <div className="flex min-h-screen">
            <aside
              className="w-64 shrink-0 min-h-screen flex flex-col border-r border-white/10 bg-transparent"
              aria-label="Daily history dates"
            >
              <WeekSidebar
                weekStart={weekStart}
                selectedDate={selectedDate}
                onSelectDay={handleSelectDay}
                onPickDate={openDatePicker}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                canGoNext={canGoNext}
                todayStr={todayStr}
              />
            </aside>

            <div className="flex-1 min-w-0 min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
              <main className="flex-1 min-h-0 overflow-y-auto p-6">
                {selectedDateStr ? (
                  <DayView
                    dateStr={selectedDateStr}
                    dateLabel={format(selectedDate!, 'EEEE, MMMM d, yyyy')}
                    isToday={selectedDateStr === todayStr}
                    dayData={selectedDayData ?? null}
                    loading={loading}
                    hideDateHeader
                    celebrate={celebrateParam && selectedDateStr === todayStr}
                    stats={{
                      currentStreak,
                      daysWithEntries,
                      nextBadge: getNextBadgeInfo(daysWithEntries, totalEveningReviews),
                    }}
                  />
                ) : (
                  <div className="max-w-3xl mx-auto bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <p className="text-gray-500 dark:text-gray-400">Select a day to view your diary.</p>
                  </div>
                )}
              </main>
            </div>
          </div>
          {datePickerModal}
        </>
      )}
    </HistoryAccessGate>
  )
}
