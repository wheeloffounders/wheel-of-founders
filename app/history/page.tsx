'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfWeek, addWeeks, subWeeks, subDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns'
import { Calendar } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { HistoryAccessGate } from '@/components/HistoryAccessGate'
import { WeekSidebar } from '@/components/history/WeekSidebar'
import { DayView, type DayData } from '@/components/history/DayView'
import { CalendarPicker } from '@/components/history/CalendarPicker'
import { MobileDayTabs, type DayTabItem } from '@/components/history/MobileDayTabs'
import { MobileMonthPicker } from '@/components/history/MobileMonthPicker'
import { useMediaQuery } from '@/lib/hooks/useMediaQuery'
import { trackEvent } from '@/lib/analytics'

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
  const [showCalendar, setShowCalendar] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const today = new Date()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const fetchStart = isMobile ? format(mobileRangeStart, 'yyyy-MM-dd') : weekStartStr
  const fetchEnd = isMobile ? todayStr : weekEndStr

  const canGoNext = isWithinInterval(addWeeks(weekStart, 1), {
    start: new Date(0),
    end: today,
  }) || format(addWeeks(weekStart, 1), 'yyyy-MM-dd') <= todayStr

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
      setUserTier(session.user.tier || 'beta')
    }
    checkAuth()
  }, [router])

  const fetchWeekData = useCallback(async () => {
    const session = await getUserSession()
    if (!session) return

    const { supabase } = await import('@/lib/supabase')
    const { data: sessionData } = await supabase.auth.getSession()
    const authToken = sessionData?.session?.access_token

    setLoading(true)
    try {
      const res = await fetch(
        `/api/history/week?start=${fetchStart}&end=${fetchEnd}`,
        { headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}, credentials: 'include' }
      )
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setWeekData(data.days)
    } catch (err) {
      console.error('[history] Fetch error:', err)
      setWeekData({})
    } finally {
      setLoading(false)
    }
  }, [fetchStart, fetchEnd])

  useEffect(() => {
    fetchWeekData()
  }, [fetchWeekData])

  useEffect(() => {
    const dateParam = searchParams?.get('date')
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const d = new Date(dateParam + 'T12:00:00')
      setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))
      setMobileRangeStart((prev) => {
        const newStart = subDays(d, MOBILE_INITIAL_DAYS - 1)
        return newStart < prev ? newStart : prev
      })
      setSelectedDate(d)
    } else if (!selectedDate) {
      setSelectedDate(new Date())
    }
  }, [searchParams])

  const handleSelectDay = (date: Date) => {
    setSelectedDate(date)
  }

  const handlePrevWeek = () => {
    setWeekStart((prev) => subWeeks(prev, 1))
  }

  const handleNextWeek = () => {
    if (canGoNext) {
      setWeekStart((prev) => addWeeks(prev, 1))
    }
  }

  const handleCalendarSelect = (date: Date) => {
    setWeekStart(startOfWeek(date, { weekStartsOn: 1 }))
    setSelectedDate(date)
  }

  const handleMobileMonthChange = (month: Date) => {
    const start = startOfMonth(month)
    const end = endOfMonth(month)
    const cappedEnd = end > today ? today : end
    setMobileRangeStart(start)
    if (selectedDate && (selectedDate < start || selectedDate > cappedEnd)) {
      setSelectedDate(cappedEnd)
    }
  }

  const handleLoadMore = () => {
    setMobileRangeStart((prev) => subDays(prev, MOBILE_LOAD_MORE_DAYS))
  }

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedDayData: DayData | null = selectedDateStr && weekData ? ((weekData[selectedDateStr] as DayData | undefined) ?? null) : null
  const currentMonthLabel = selectedDate ? format(selectedDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')

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

  const currentMonthForPicker = selectedDate ?? new Date()

  useEffect(() => {
    trackEvent('history_page_view', { diary_mode: true })
  }, [])

  return (
    <HistoryAccessGate user={{ tier: userTier }} date={selectedDate ?? new Date()}>
      <div className="max-w-7xl mx-auto px-4 md:px-5 py-6 pt-24">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#152b50]/10 dark:bg-gray-700">
              <span className="text-xl">📅</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Daily History</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Your founder&apos;s diary</p>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            {isMobile ? (
              <MobileMonthPicker
                currentMonth={currentMonthForPicker}
                onMonthChange={handleMobileMonthChange}
                maxDate={today}
              />
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
                >
                  <Calendar className="w-4 h-4" />
                  {currentMonthLabel}
                </button>
                {showCalendar && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowCalendar(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 top-full mt-2 z-50">
                      <CalendarPicker
                        selectedDate={selectedDate ?? new Date()}
                        onSelectDate={handleCalendarSelect}
                        onClose={() => setShowCalendar(false)}
                        maxDate={new Date()}
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main layout: mobile toe tabs vs desktop sidebar */}
        {isMobile ? (
          <>
            <MobileDayTabs
              days={mobileDays}
              selectedDate={selectedDate ?? new Date()}
              onSelectDay={handleSelectDay}
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
          </>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6">
            <aside className="lg:w-56 shrink-0">
              <WeekSidebar
                weekStart={weekStart}
                selectedDate={selectedDate}
                onSelectDay={handleSelectDay}
                onPrevWeek={handlePrevWeek}
                onNextWeek={handleNextWeek}
                canGoNext={canGoNext}
                todayStr={todayStr}
              />
            </aside>
            <main className="flex-1 min-w-0">
              {selectedDateStr ? (
                <DayView
                  dateStr={selectedDateStr}
                  dateLabel={format(selectedDate!, 'EEEE, MMMM d, yyyy')}
                  isToday={selectedDateStr === todayStr}
                  dayData={selectedDayData ?? null}
                  loading={loading}
                />
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Select a day to view your diary.</p>
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    </HistoryAccessGate>
  )
}
