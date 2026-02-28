'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, subDays, startOfDay } from 'date-fns'
import { ChevronDown, ChevronRight, Mountain, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { HistoryAccessGate } from '@/components/HistoryAccessGate'
import { DayCard } from '@/components/history/DayCard'
import { trackEvent } from '@/lib/analytics'

const MAX_DAYS_TO_FETCH = 60

interface MorningTask {
  id: string
  plan_date: string
  description: string
  needle_mover?: boolean
  action_plan?: string
  completed?: boolean
  task_order?: number
}

interface MorningDecision {
  id: string
  plan_date: string
  decision: string
  decision_type: string
  why_this_decision?: string
}

interface EveningReview {
  review_date: string
  journal?: string
  mood?: number
  energy?: number
  wins?: string
  lessons?: string
}

interface PersonalPrompt {
  prompt_date: string
  prompt_type: string
  prompt_text: string
  generated_at?: string
}

interface Emergency {
  id: string
  fire_date: string
  description: string
  severity?: string
  notes?: string
  resolved?: boolean
}

interface DayEntry {
  dateStr: string
  date: Date
  morningTasks: MorningTask[]
  morningDecisions: MorningDecision[]
  postMorningInsight: string | null
  eveningReview: EveningReview | null
  postEveningInsight: string | null
  emergencies: Emergency[]
}

export default function HistoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([])
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [jumpToDate, setJumpToDate] = useState<string | null>(null)

  const todayStr = format(new Date(), 'yyyy-MM-dd')

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

  useEffect(() => {
    const fetchTimelineData = async () => {
      const session = await getUserSession()
      if (!session) return

      setLoading(true)
      const features = getFeatureAccess({ tier: userTier })
      const viewableDays = Math.min(
        features.viewableHistoryDays === Infinity ? MAX_DAYS_TO_FETCH : features.viewableHistoryDays,
        MAX_DAYS_TO_FETCH
      )
      const startDate = subDays(new Date(), viewableDays)
      const startStr = format(startDate, 'yyyy-MM-dd')

      const [
        tasksRes,
        decisionsRes,
        reviewsRes,
        promptsRes,
        emergenciesRes,
      ] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('id, plan_date, description, needle_mover, action_plan, completed, task_order')
          .eq('user_id', session.user.id)
          .gte('plan_date', startStr)
          .lte('plan_date', todayStr)
          .order('plan_date', { ascending: false })
          .order('task_order', { ascending: true }),
        supabase
          .from('morning_decisions')
          .select('id, plan_date, decision, decision_type, why_this_decision')
          .eq('user_id', session.user.id)
          .gte('plan_date', startStr)
          .lte('plan_date', todayStr)
          .order('plan_date', { ascending: false }),
        supabase
          .from('evening_reviews')
          .select('review_date, journal, mood, energy, wins, lessons')
          .eq('user_id', session.user.id)
          .gte('review_date', startStr)
          .lte('review_date', todayStr)
          .order('review_date', { ascending: false }),
        features.dailyPostMorningPrompt || features.dailyPostEveningPrompt
          ? supabase
              .from('personal_prompts')
              .select('prompt_date, prompt_type, prompt_text, generated_at')
              .eq('user_id', session.user.id)
              .in('prompt_type', ['post_morning', 'post_evening'])
              .gte('prompt_date', startStr)
              .lte('prompt_date', todayStr)
              .order('generated_at', { ascending: false })
          : Promise.resolve({ data: [] }),
        supabase
          .from('emergencies')
          .select('id, fire_date, description, severity, notes, resolved')
          .eq('user_id', session.user.id)
          .gte('fire_date', startStr)
          .lte('fire_date', todayStr)
          .order('fire_date', { ascending: false })
          .order('created_at', { ascending: true }),
      ])

      const tasks = (tasksRes.data ?? []) as MorningTask[]
      const decisions = (decisionsRes.data ?? []) as MorningDecision[]
      const reviews = (reviewsRes.data ?? []) as EveningReview[]
      const prompts = (promptsRes.data ?? []) as PersonalPrompt[]
      const emergencies = (emergenciesRes.data ?? []) as Emergency[]

      const dateSet = new Set<string>()
      tasks.forEach((t) => dateSet.add(t.plan_date))
      decisions.forEach((d) => dateSet.add(d.plan_date))
      reviews.forEach((r) => dateSet.add(r.review_date))
      prompts.forEach((p) => dateSet.add(p.prompt_date))
      emergencies.forEach((e) => dateSet.add(e.fire_date))

      const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a))

      const postMorningByDate: Record<string, string> = {}
      const postEveningByDate: Record<string, string> = {}
      prompts.forEach((p) => {
        if (p.prompt_type === 'post_morning' && !postMorningByDate[p.prompt_date]) {
          postMorningByDate[p.prompt_date] = p.prompt_text
        }
        if (p.prompt_type === 'post_evening' && !postEveningByDate[p.prompt_date]) {
          postEveningByDate[p.prompt_date] = p.prompt_text
        }
      })

      const entries: DayEntry[] = sortedDates.map((dateStr) => {
        const date = new Date(dateStr + 'T12:00:00')
        const dayTasks = tasks.filter((t) => t.plan_date === dateStr).sort((a, b) => (a.task_order ?? 0) - (b.task_order ?? 0))
        const dayDecisions = decisions.filter((d) => d.plan_date === dateStr)
        const dayReview = reviews.find((r) => r.review_date === dateStr) ?? null
        const dayEmergencies = emergencies.filter((e) => e.fire_date === dateStr)

        return {
          dateStr,
          date,
          morningTasks: dayTasks,
          morningDecisions: dayDecisions,
          postMorningInsight: postMorningByDate[dateStr] ?? null,
          eveningReview: dayReview,
          postEveningInsight: postEveningByDate[dateStr] ?? null,
          emergencies: dayEmergencies,
        }
      })

      setDayEntries(entries)

      const dateParam = searchParams?.get('date')
      const defaultExpanded = new Set<string>()
      if (dateParam && sortedDates.includes(dateParam)) {
        defaultExpanded.add(dateParam)
        setJumpToDate(dateParam)
      }
      const last7 = sortedDates.slice(0, 7)
      last7.forEach((d) => defaultExpanded.add(d))
      setExpandedDates(defaultExpanded)

      setLoading(false)
      trackEvent('history_page_view', { timeline_mode: true, day_count: entries.length })
    }

    fetchTimelineData()
  }, [userTier, searchParams])

  const toggleExpand = (dateStr: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev)
      if (next.has(dateStr)) {
        next.delete(dateStr)
      } else {
        next.add(dateStr)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedDates(new Set(dayEntries.map((e) => e.dateStr)))
  }

  const collapseAll = () => {
    setExpandedDates(new Set())
  }

  const handleJumpToDate = (dateStr: string) => {
    setJumpToDate(dateStr)
    setExpandedDates((prev) => new Set([...prev, dateStr]))
    setShowDatePicker(false)
  }

  const scrollToRef = (dateStr: string) => {
    const el = document.getElementById(`day-${dateStr}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (jumpToDate) {
      const target = jumpToDate
      const timer = setTimeout(() => {
        scrollToRef(target)
        setJumpToDate(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [jumpToDate, dayEntries])

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-5 py-8 pt-24">
        <p className="text-gray-700 dark:text-gray-300">Loading journey...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-5 py-8 pt-24">
      {/* Header */}
      <div className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#152b50] via-[#1b325d] to-[#152b50] text-white shadow-lg">
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <div className="absolute -bottom-10 right-0 w-56 h-56 rounded-full bg-[#ef725c]/40 blur-3xl" />
          <div className="absolute -top-8 left-4 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative px-6 py-6 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 border border-white/20">
              <Mountain className="w-6 h-6 text-[#ef725c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">The Founder&apos;s Path: Looking Back</h1>
              <p className="text-xs text-white/80 mt-0.5">Journey • Timeline</p>
            </div>
          </div>
          <p className="text-sm text-white/85 max-w-xl">
            Every founder&apos;s journey is unique. Trace your steps, spot patterns, and grow wiser with each reflection.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={expandAll}
          className="px-4 py-2 bg-[#152b50] text-white rounded-lg hover:bg-[#1a3565] transition text-sm font-medium"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm font-medium"
        >
          Collapse All
        </button>
        <button
          type="button"
          onClick={() => setShowDatePicker(!showDatePicker)}
          className="px-4 py-2 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm font-medium flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Jump to Date
        </button>
      </div>

      {showDatePicker && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700">
          <input
            type="date"
            max={todayStr}
            onChange={(e) => {
              if (e.target.value) handleJumpToDate(e.target.value)
            }}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#152b50] dark:focus:ring-[#ef725c] focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
      )}

      {dayEntries.length === 0 ? (
        <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 text-center text-gray-700 dark:text-gray-300">
          <p>No journey data yet.</p>
          <p className="text-sm mt-2">Start your morning plan and evening review to build your timeline.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayEntries.map((entry) => {
            const isExpanded = expandedDates.has(entry.dateStr)
            const isToday = entry.dateStr === todayStr
            const hasData =
              entry.morningTasks.length > 0 ||
              entry.morningDecisions.length > 0 ||
              entry.postMorningInsight ||
              entry.eveningReview ||
              entry.postEveningInsight ||
              entry.emergencies.length > 0

            const summaryParts: string[] = []
            if (entry.morningTasks.length > 0) {
              const done = entry.morningTasks.filter((t) => t.completed).length
              summaryParts.push(`${done}/${entry.morningTasks.length} tasks`)
            }
            if (entry.morningDecisions.length > 0) {
              summaryParts.push(`${entry.morningDecisions.length} decision${entry.morningDecisions.length > 1 ? 's' : ''}`)
            }
            if (entry.eveningReview) {
              summaryParts.push('evening')
            }
            if (entry.emergencies.length > 0) {
              summaryParts.push(`${entry.emergencies.length} fire${entry.emergencies.length > 1 ? 's' : ''}`)
            }
            const summary = summaryParts.join(' • ')

            return (
              <HistoryAccessGate key={entry.dateStr} user={{ tier: userTier }} date={entry.date}>
                <div
                  id={`day-${entry.dateStr}`}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpand(entry.dateStr)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {format(entry.date, 'EEEE, MMMM d, yyyy')}
                          {isToday && (
                            <span className="ml-2 text-xs font-medium text-[#ef725c]">Today</span>
                          )}
                        </p>
                        {summary && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{summary}</p>
                        )}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-0 border-t border-gray-200 dark:border-gray-700">
                      <div className="pt-4">
                        <DayCard
                          dateStr={entry.dateStr}
                          morningTasks={entry.morningTasks}
                          morningDecisions={entry.morningDecisions}
                          postMorningInsight={entry.postMorningInsight}
                          eveningReview={entry.eveningReview}
                          postEveningInsight={entry.postEveningInsight}
                          emergencies={entry.emergencies}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </HistoryAccessGate>
            )
          })}
        </div>
      )}
    </div>
  )
}
