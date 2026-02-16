'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { format, subDays, addDays, startOfWeek, endOfWeek, differenceInDays, differenceInWeeks, startOfDay } from 'date-fns'
import {
  ChevronLeft,
  ChevronRight,
  Target,
  Lightbulb,
  Moon,
  Flame,
  Check,
  Square,
  Calendar,
  Mountain,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { ACTION_PLAN_OPTIONS_2 } from '@/app/morning/page'
import { getFeatureAccess } from '@/lib/features'
import { HistoryAccessGate } from '@/components/HistoryAccessGate'
import { trackEvent } from '@/lib/analytics'

const MOOD_LABELS: Record<number, string> = {
  1: 'Tough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

const ENERGY_LABELS: Record<number, string> = {
  1: 'Drained',
  2: 'Low',
  3: 'Neutral',
  4: 'Energized',
  5: 'Peak',
}

const SEVERITY_LABELS: Record<string, string> = {
  hot: '🔥 Hot',
  warm: '🌡️ Warm',
  contained: '✅ Contained',
}

interface MorningTask {
  id: string
  description: string
  needle_mover?: boolean
  action_plan?: string
  completed?: boolean
}

interface MorningDecision {
  id: string
  decision: string
  decision_type: string
  why_this_decision?: string
}

interface EveningReview {
  journal?: string
  mood?: number
  energy?: number
  wins?: string
  lessons?: string
}

interface Emergency {
  id: string
  description: string
  severity?: string
  notes?: string
  resolved?: boolean
}

export default function HistoryPage() {
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<MorningTask[]>([])
  const [decisions, setDecisions] = useState<MorningDecision[]>([])
  const [review, setReview] = useState<EveningReview | null>(null)
  const [emergencies, setEmergencies] = useState<Emergency[]>([])
  const [firstEntryDate, setFirstEntryDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [userTier, setUserTier] = useState<string>('beta')

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

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
    const fetchFirstEntry = async () => {
      const session = await getUserSession()
      if (!session) return

      const [tasksRes, decisionsRes, reviewRes, emergenciesRes] = await Promise.all([
        supabase.from('morning_tasks').select('plan_date').eq('user_id', session.user.id).order('plan_date', { ascending: true }).limit(1),
        supabase.from('morning_decisions').select('plan_date').eq('user_id', session.user.id).order('plan_date', { ascending: true }).limit(1),
        supabase.from('evening_reviews').select('review_date').eq('user_id', session.user.id).order('review_date', { ascending: true }).limit(1),
        supabase.from('emergencies').select('fire_date').eq('user_id', session.user.id).order('fire_date', { ascending: true }).limit(1),
      ])

      const dates = [
        tasksRes.data?.[0]?.plan_date,
        decisionsRes.data?.[0]?.plan_date,
        reviewRes.data?.[0]?.review_date,
        emergenciesRes.data?.[0]?.fire_date,
      ].filter(Boolean) as string[]

      if (dates.length > 0) {
        const earliest = dates.sort()[0]
        setFirstEntryDate(new Date(earliest))
      } else {
        setFirstEntryDate(new Date())
      }
    }

    fetchFirstEntry()
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const session = await getUserSession()
      if (!session) return

      setLoading(true)
      
      // Check if user can view this date
      const features = getFeatureAccess({ tier: userTier })
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - features.viewableHistoryDays)
      
      if (!features.canViewFullHistory && selectedDate < cutoffDate) {
        // User can't view this date - set empty data
        setTasks([])
        setDecisions([])
        setReview(null)
        setEmergencies([])
        setLoading(false)
        return
      }

      const [tasksRes, decisionsRes, reviewRes, emergenciesRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('*')
          .eq('plan_date', dateStr)
          .eq('user_id', session.user.id)
          .order('task_order', { ascending: true }),
        supabase
          .from('morning_decisions')
          .select('*')
          .eq('plan_date', dateStr)
          .eq('user_id', session.user.id),
        supabase
          .from('evening_reviews')
          .select('*')
          .eq('review_date', dateStr)
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('emergencies')
          .select('*')
          .eq('fire_date', dateStr)
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: true }),
      ])

      setTasks((tasksRes.data ?? []) as MorningTask[])
      setDecisions((decisionsRes.data ?? []) as MorningDecision[])
      setReview((reviewRes.data as EveningReview) ?? null)
      setEmergencies((emergenciesRes.data ?? []) as Emergency[])
      setLoading(false)
      trackEvent('history_page_view', { date: dateStr })
    }

    fetchData()
  }, [dateStr, userTier])

  const goPrev = () => setSelectedDate((d) => subDays(d, 1))
  const goNext = () => setSelectedDate((d) => addDays(d, 1))
  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  const goToThisWeek = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    setSelectedDate(weekStart)
  }

  const goToLastWeek = () => {
    const today = new Date()
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    const lastWeekStart = subDays(weekStart, 7)
    setSelectedDate(lastWeekStart)
  }

  const journeyDay = firstEntryDate
    ? differenceInDays(startOfDay(selectedDate), startOfDay(firstEntryDate)) + 1
    : null
  const journeyWeek = firstEntryDate
    ? differenceInWeeks(startOfDay(selectedDate), startOfDay(firstEntryDate)) + 1
    : null
  const weekDay = firstEntryDate
    ? differenceInDays(startOfDay(selectedDate), startOfDay(startOfWeek(selectedDate, { weekStartsOn: 1 }))) + 1
    : null

  const tasksCompleted = tasks.filter((t) => t.completed).length
  const decisionsCount = decisions.length
  const emergenciesCount = emergencies.length
  const hasReflection =
    !!review &&
    !!(
      review.journal?.trim() ||
      review.wins?.trim() ||
      review.lessons?.trim() ||
      review.mood != null ||
      review.energy != null
    )

  const completionRate =
    tasks.length > 0 ? Math.round((tasksCompleted / tasks.length) * 100) : 0
  const moodVal = review?.mood ?? null
  const energyVal = review?.energy ?? null
  const moodEnergyScore =
    moodVal != null && energyVal != null
      ? Math.round(((moodVal + energyVal) / 10) * 100)
      : 0

  const focusScore =
    completionRate > 0 && moodEnergyScore > 0
      ? Math.round((completionRate + moodEnergyScore) / 2)
      : completionRate || moodEnergyScore

  // Simple pattern + headline heuristics
  const actionCounts: Record<string, number> = {}
  tasks.forEach((t) => {
    if (t.action_plan) {
      actionCounts[t.action_plan] = (actionCounts[t.action_plan] || 0) + 1
    }
  })
  let dominantAction: string | null = null
  let maxCount = 0
  for (const [key, value] of Object.entries(actionCounts)) {
    if (value > maxCount) {
      dominantAction = key
      maxCount = value
    }
  }

  let storyHeadline = 'A day of showing up and moving things forward'
  if (dominantAction === 'systemize' && decisionsCount > 0) {
    storyHeadline = 'A strategic day of systemizing and pricing decisions'
  } else if (dominantAction === 'quick_win_founder') {
    storyHeadline = 'Quick wins leading to momentum'
  } else if (dominantAction === 'my_zone') {
    storyHeadline = 'Deep focus in your founder zone'
  } else if (dominantAction === 'delegate_founder') {
    storyHeadline = 'Leaning on your team to move faster'
  } else if (dominantAction === 'eliminate_founder') {
    storyHeadline = 'Clearing space by saying no to the non-essential'
  }
  if (emergenciesCount > 0 && storyHeadline === 'A day of showing up and moving things forward') {
    storyHeadline = 'Navigating challenges with founder resilience'
  }

  let patternNote = 'You kept taking the next right step today.'
  if (dominantAction === 'systemize' && decisionsCount > 0) {
    patternNote = 'You systemized while making strategic calls—great combo for long-term leverage.'
  } else if (dominantAction === 'quick_win_founder') {
    patternNote = 'Quick wins helped you build momentum without burning out.'
  } else if (dominantAction === 'my_zone') {
    patternNote = 'You spent meaningful time in your zone of genius.'
  } else if (dominantAction === 'delegate_founder') {
    patternNote = 'You trusted your team and freed up founder bandwidth.'
  } else if (dominantAction === 'eliminate_founder') {
    patternNote = 'You protected your time by eliminating non-essential work.'
  }
  if (emergenciesCount > 0) {
    patternNote += ' You also handled fires without losing sight of the bigger picture.'
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
        <p className="text-gray-500">Loading journey...</p>
      </div>
    )
  }

  const hasData = tasks.length > 0 || decisions.length > 0 || review || emergencies.length > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 pt-24">
      {/* Decorative header */}
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
              <h1 className="text-2xl font-bold">
                The Founder&apos;s Path: Looking Back
              </h1>
              <p className="text-xs text-white/80 mt-0.5">
                Journey • {format(selectedDate, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <p className="text-sm text-white/85 max-w-xl">
            Every founder&apos;s journey is unique. Trace your steps, spot patterns, and grow wiser
            with each reflection.
          </p>
        </div>
      </div>

      {/* Today’s Story */}
      <section className="mb-8 bg-white/95 rounded-xl shadow-lg p-6 border border-gray-100">
        <p className="text-xs font-semibold text-[#ef725c] tracking-wide uppercase mb-1">
          Mrs. Deer&apos;s reflection
        </p>
        <h2 className="text-xl font-semibold text-[#152b50] mb-2">
          {storyHeadline}
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          {patternNote}
        </p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
          <span>
            Tasks Completed:{' '}
            <strong>
              {tasksCompleted}/{tasks.length || 0}
            </strong>
          </span>
          <span>
            Key Decisions: <strong>{decisionsCount}</strong>
          </span>
          <span>
            Fires Fought: <strong>{emergenciesCount}</strong>
          </span>
          <span>
            Reflections: <strong>{hasReflection ? 1 : 0}</strong>
          </span>
          <span>
            Focus Score:{' '}
            <strong>{focusScore ? `${focusScore}%` : '—'}</strong>
          </span>
        </div>
      </section>

      {/* Enhanced Date Navigator */}
      <div className="mb-8 space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-lg p-4">
          <button
            type="button"
            onClick={goPrev}
            className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-sm font-medium text-gray-700"
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
            Yesterday
          </button>
          <div className="text-center flex-1">
            <p className="text-xl font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </p>
            {journeyDay && (
              <p className="text-sm text-gray-500 mt-1">
                {journeyWeek && weekDay
                  ? `Week ${journeyWeek}, Day ${weekDay}`
                  : `Day ${journeyDay}`}{' '}
                of your founder journey
              </p>
            )}
            {isToday && (
              <span className="text-xs text-[#ef725c] font-medium mt-1 block">Today</span>
            )}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium text-gray-700"
            aria-label="Next day"
            disabled={isToday}
          >
            Tomorrow
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Jump Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={goToThisWeek}
            className="px-4 py-2 bg-[#152b50] text-white rounded-lg hover:bg-[#1a3565] transition text-sm font-medium"
          >
            This Week
          </button>
          <button
            type="button"
            onClick={goToLastWeek}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
          >
            Last Week
          </button>
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-medium flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" />
            Pick Date
          </button>
        </div>

        {/* Date Picker */}
        {showDatePicker && (
          <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-200">
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(new Date(e.target.value))
                  setShowDatePicker(false)
                }
              }}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#152b50] focus:border-transparent"
            />
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-500">
          <p>No data for this date.</p>
          <p className="text-sm mt-2">Use the arrows to browse other days.</p>
        </div>
      ) : (
        <HistoryAccessGate user={{ tier: userTier }} date={selectedDate}>
          <div className="space-y-6">
          {/* Morning Tasks */}
          {tasks.length > 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#ef725c]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#ef725c] flex items-center gap-2">
                  <span className="text-base">📋</span>
                  Morning Tasks
                </h2>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: tasks.length }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < tasksCompleted ? 'bg-[#10b981]' : 'bg-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">
                    {tasksCompleted}/{tasks.length} completed
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="mb-4 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#10b981] h-2 rounded-full transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <ul className="space-y-3">
                {tasks.map((task) => (
                  <li
                    key={task.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      task.completed ? 'bg-emerald-50' : 'bg-gray-50'
                    }`}
                  >
                    {task.completed ? (
                      <Check className="w-5 h-5 text-[#10b981] flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className={`text-gray-900 ${task.completed ? 'opacity-80' : ''}`}>
                        {task.description}
                      </p>
                      <div className="flex gap-2 mt-1">
                        {task.needle_mover && (
                          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded">
                            Needle Mover
                          </span>
                        )}
                        {task.action_plan && (
                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                            {ACTION_PLAN_OPTIONS_2.find((o) => o.value === task.action_plan)?.label ?? task.action_plan}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Decision Log */}
          {decisions.length > 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#ef725c]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#ef725c] flex items-center gap-2">
                  <span className="text-base">⚡</span>
                  Key Decisions
                </h2>
                {decisions.some((d) => d.decision_type === 'strategic') && (
                  <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">
                    Strategic shift
                  </span>
                )}
              </div>
              <ul className="space-y-4">
                {decisions.map((d) => (
                  <li key={d.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 font-medium">{d.decision}</p>
                    <span className="text-xs text-gray-500 capitalize">{d.decision_type}</span>
                    {d.why_this_decision && (
                      <p className="text-sm text-gray-600 mt-2 italic">{d.why_this_decision}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Evening Review */}
          {review && (
            <section className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-[#ef725c]">
              <h2 className="text-lg font-semibold text-[#ef725c] mb-4 flex items-center gap-2">
                <span className="text-base">❤️</span>
                Evening Reflection
              </h2>
              <div className="space-y-4">
                {(review.mood != null || review.energy != null) && (
                  <div className="space-y-3">
                    {review.mood != null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Mood</span>
                          <span className="text-xs font-medium text-gray-700">
                            {MOOD_LABELS[review.mood] ?? review.mood}/5
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-amber-500 h-2 rounded-full transition-all"
                            style={{ width: `${(review.mood / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {review.energy != null && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Energy</span>
                          <span className="text-xs font-medium text-gray-700">
                            {ENERGY_LABELS[review.energy] ?? review.energy}/5
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${(review.energy / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {review.journal?.trim() && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Journal</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{review.journal}</p>
                  </div>
                )}
                {review.wins?.trim() && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Wins</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{review.wins}</p>
                  </div>
                )}
                {review.lessons?.trim() && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Lessons</p>
                    <p className="text-gray-800 whitespace-pre-wrap">{review.lessons}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Emergencies */}
          {emergencies.length > 0 && (
            <section className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[#ef725c] flex items-center gap-2">
                  <span className="text-base">🚨</span>
                  Emergencies
                </h2>
                {emergencies.every((e) => e.resolved) && emergencies.length > 0 && (
                  <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Contained
                  </span>
                )}
              </div>
              <ul className="space-y-3">
                {emergencies.map((e) => (
                  <li
                    key={e.id}
                    className={`p-3 rounded-lg border ${
                      e.resolved ? 'bg-gray-50 border-gray-200' : 'bg-orange-50 border-orange-200'
                    }`}
                  >
                    <p className="text-gray-900 font-medium">{e.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {e.severity && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                          {SEVERITY_LABELS[e.severity] ?? e.severity}
                        </span>
                      )}
                      {e.resolved && (
                        <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                          Resolved
                        </span>
                      )}
                    </div>
                    {e.notes?.trim() && (
                      <p className="text-sm text-gray-600 mt-2">{e.notes}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </HistoryAccessGate>
      )}
    </div>
  )
}
