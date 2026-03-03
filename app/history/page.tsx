'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns'
import { Calendar } from 'lucide-react'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { HistoryAccessGate } from '@/components/HistoryAccessGate'
import { WeekSidebar } from '@/components/history/WeekSidebar'
import { DayView, type DayData } from '@/components/history/DayView'
import { CalendarPicker } from '@/components/history/CalendarPicker'
import { trackEvent } from '@/lib/analytics'

const MAX_WEEKS_AHEAD = 0

export default function HistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [weekData, setWeekData] = useState<Record<string, unknown> | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)

  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const today = new Date()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartStr = format(weekStart, 'yyyy-MM-dd')
  const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

  const canGoNext = isWithinInterval(addWeeks(weekStart, 1), {
    start: new Date(0),
    end: today,
  }) || format(addWeeks(weekStart, 1), 'yyyy-MM-dd') <= todayStr

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
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
        `/api/history/week?start=${weekStartStr}&end=${weekEndStr}`,
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
  }, [weekStartStr, weekEndStr])

  useEffect(() => {
    fetchWeekData()
  }, [fetchWeekData])

  useEffect(() => {
    const dateParam = searchParams?.get('date')
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const d = new Date(dateParam + 'T12:00:00')
      setWeekStart(startOfWeek(d, { weekStartsOn: 1 }))
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

  const selectedDateStr = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null
  const selectedDayData: DayData | null = selectedDateStr && weekData ? ((weekData[selectedDateStr] as DayData | undefined) ?? null) : null
  const currentMonthLabel = selectedDate ? format(selectedDate, 'MMMM yyyy') : format(new Date(), 'MMMM yyyy')

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
          <div className="relative">
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
          </div>
        </div>

        {/* Main layout: sidebar + day view */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Week sidebar */}
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

          {/* Day view */}
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
      </div>
    </HistoryAccessGate>
  )
}
