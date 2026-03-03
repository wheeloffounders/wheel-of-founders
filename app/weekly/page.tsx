'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { format, startOfWeek, endOfWeek, isSunday, addDays, addWeeks, isSameWeek } from 'date-fns'
import {
  Calendar,
  Target,
  Heart,
  Copy,
  Check,
  Award,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { getFeatureAccess } from '@/lib/features'
import { trackEvent } from '@/lib/analytics'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MrsDeerMessageBubble } from '@/components/MrsDeerMessageBubble'
import { MarkdownText } from '@/components/MarkdownText'
import { MoodChart } from '@/components/weekly/MoodChart'
import {
  getPaceAssessment,
  generateProgressInsight,
  generateCelebrationQuote,
  detectPatternForQuestion,
  detectAllTopicPatterns,
  type WinWithDate,
  type LessonWithDate,
  type DayData,
} from '@/lib/weekly-analysis'
import { WinReflection } from '@/components/weekly/WinReflection'
import { LessonInput } from '@/components/weekly/LessonInput'
import { PatternQuestion } from '@/components/weekly/PatternQuestion'
import { GoalProgress } from '@/components/weekly/GoalProgress'
import { CelebrationHeader } from '@/components/weekly/CelebrationHeader'
import { InsightNavigation } from '@/components/InsightNavigation'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { colors } from '@/lib/design-tokens'
import { showRefreshButton } from '@/lib/env'

const MOOD_LABELS: Record<number, string> = {
  1: 'Tough',
  2: 'Meh',
  3: 'Okay',
  4: 'Good',
  5: 'Great',
}

interface WeeklyData {
  dateRange: { start: string; end: string }
  daysCompleted: number
  daysInWeek: number
  isWeekComplete: boolean
  tasksTotal: number
  tasksCompleted: number
  needleMoversTotal: number
  needleMoversCompleted: number
  proactivePct: number
  firesTotal: number
  firesResolved: number
  decisions: number
  avgMood: number | null
  avgEnergy: number | null
  actionMix: Record<string, number>
  wins: string[]
  lessons: string[]
  winsWithDate: WinWithDate[]
  lessonsWithDate: LessonWithDate[]
  dayData: DayData[]
  eveningInsights: { date: string; text: string }[]
  weeklyPrompt: string | null
  primaryGoal: string | null
  canRegenerateInsights: boolean
}

function parseWins(val: unknown, date: string): WinWithDate[] {
  const wins: WinWithDate[] = []
  if (!val) return wins
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        parsed.filter((s: string) => s?.trim()).forEach((s: string) => wins.push({ text: s, date }))
      } else if (typeof parsed === 'string' && parsed.trim()) {
        wins.push({ text: parsed, date })
      }
    } catch {
      if (val.trim()) wins.push({ text: val, date })
    }
  }
  return wins
}

function parseLessons(val: unknown, date: string): LessonWithDate[] {
  const lessons: LessonWithDate[] = []
  if (!val) return lessons
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) {
        parsed.filter((s: string) => s?.trim()).forEach((s: string) => lessons.push({ text: s, date }))
      } else if (typeof parsed === 'string' && parsed.trim()) {
        lessons.push({ text: parsed, date })
      }
    } catch {
      if (val.trim()) lessons.push({ text: val, date })
    }
  }
  return lessons
}

export default function WeeklyPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [periods, setPeriods] = useState<string[]>([])
  const [initialRedirectDone, setInitialRedirectDone] = useState(false)
  const [data, setData] = useState<WeeklyData | null>(null)
  const [copied, setCopied] = useState(false)
  const [favoriteWinIndices, setFavoriteWinIndices] = useState<number[]>([])
  const [keyLessonIndices, setKeyLessonIndices] = useState<number[]>([])
  const [generating, setGenerating] = useState(false)
  const [insightFeedback, setInsightFeedback] = useState<'helpful' | 'not_quite_right' | 'custom' | null>(null)
  const [customFeedbackText, setCustomFeedbackText] = useState('')
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [weeklyPromptOverride, setWeeklyPromptOverride] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const { markAsViewed } = useNewInsights()

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) router.push('/login')
    }
    checkAuth()
  }, [router])

  const weekStartParam = searchParams?.get('weekStart')
  // When no weekStart in URL, redirect to most recent week WITH data
  useEffect(() => {
    if (weekStartParam || initialRedirectDone) return
    const redirectToLatest = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const res = await fetch('/api/insights/periods?type=weekly', { headers })
        const json = await res.json()
        if (json.periods?.length > 0) {
          router.replace(`/weekly?weekStart=${json.periods[0]}`)
        }
      } catch {
        // ignore
      } finally {
        setInitialRedirectDone(true)
      }
    }
    redirectToLatest()
  }, [weekStartParam, initialRedirectDone, router])
  const effectiveWeekStart = weekStartParam && /^\d{4}-\d{2}-\d{2}$/.test(weekStartParam)
    ? weekStartParam
    : format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')

  useEffect(() => {
    // Don't fetch until we've either redirected to latest week or confirmed no periods
    if (!weekStartParam && !initialRedirectDone) return

    const fetchWeekData = async () => {
      setLoading(true)
      const session = await getUserSession()
      if (!session) {
        setLoading(false)
        return
      }

      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      const weekStart = new Date(effectiveWeekStart)
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
      const startStr = format(weekStart, 'yyyy-MM-dd')
      const endStr = format(weekEnd, 'yyyy-MM-dd')
      const now = new Date()
      const isWeekComplete = isSunday(now) || weekEnd < now

      const daysInWeek = 7
      let daysCompleted = 0
      const weekStartDate = new Date(weekStart)
      for (let d = new Date(weekStartDate); d <= now && d <= weekEnd; d = addDays(d, 1)) {
        daysCompleted++
      }

      const [tasksRes, emergenciesRes, reviewsRes, decisionsRes, promptsRes, profileRes] = await Promise.all([
        supabase
          .from('morning_tasks')
          .select('plan_date, needle_mover, completed, is_proactive, action_plan')
          .gte('plan_date', startStr)
          .lte('plan_date', endStr)
          .eq('user_id', session.user.id),
        supabase
          .from('emergencies')
          .select('resolved')
          .gte('fire_date', startStr)
          .lte('fire_date', endStr)
          .eq('user_id', session.user.id),
        supabase
          .from('evening_reviews')
          .select('review_date, mood, energy, wins, lessons')
          .gte('review_date', startStr)
          .lte('review_date', endStr)
          .eq('user_id', session.user.id),
        supabase
          .from('morning_decisions')
          .select('id')
          .gte('plan_date', startStr)
          .lte('plan_date', endStr)
          .eq('user_id', session.user.id),
        features.personalWeeklyInsight
          ? supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_date, generated_at')
              .eq('user_id', session.user.id)
              .eq('prompt_type', 'weekly')
              .eq('prompt_date', startStr)
              .order('generated_at', { ascending: false })
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase.from('user_profiles').select('primary_goal_text, is_admin').eq('id', session.user.id).maybeSingle(),
      ])

      const tasks = tasksRes.data ?? []
      const emergencies = emergenciesRes.data ?? []
      const reviews = reviewsRes.data ?? []
      const decisions = decisionsRes.data ?? []

      const needleMoversTotal = tasks.filter((t) => t.needle_mover).length
      const needleMoversCompleted = tasks.filter((t) => t.needle_mover && t.completed).length
      const proactiveCount = tasks.filter((t) => t.is_proactive === true).length
      const proactivePct = tasks.length > 0 ? Math.round((proactiveCount / tasks.length) * 100) : 0

      const actionMix: Record<string, number> = {}
      tasks.forEach((t) => {
        const p = (t.action_plan || 'my_zone') as string
        actionMix[p] = (actionMix[p] || 0) + 1
      })

      const moods = reviews.map((r) => r.mood).filter((m): m is number => m != null)
      const energies = reviews.map((r) => r.energy).filter((e): e is number => e != null)
      const avgMood = moods.length > 0 ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length * 10) / 10 : null
      const avgEnergy = energies.length > 0 ? Math.round(energies.reduce((a, b) => a + b, 0) / energies.length * 10) / 10 : null

      const winsWithDate: WinWithDate[] = []
      const lessonsWithDate: LessonWithDate[] = []
      const wins: string[] = []
      const lessons: string[] = []

      reviews.forEach((r) => {
        const date = (r as { review_date?: string }).review_date || ''
        const w = parseWins((r as { wins?: unknown }).wins, date)
        const l = parseLessons((r as { lessons?: unknown }).lessons, date)
        winsWithDate.push(...w)
        lessonsWithDate.push(...l)
        wins.push(...w.map((x) => x.text))
        lessons.push(...l.map((x) => x.text))
      })

      const reviewByDate = new Map<string | undefined, (typeof reviews)[0]>()
      reviews.forEach((r) => reviewByDate.set((r as { review_date?: string }).review_date, r))

      const tasksByDate = new Map<string, (typeof tasks)[0][]>()
      tasks.forEach((t) => {
        const d = (t as { plan_date?: string }).plan_date
        if (d) {
          if (!tasksByDate.has(d)) tasksByDate.set(d, [])
          tasksByDate.get(d)!.push(t)
        }
      })

      const eveningInsights: { date: string; text: string }[] = []
      if (features.dailyPostEveningPrompt) {
        const { data: eveningPrompts } = await supabase
          .from('personal_prompts')
          .select('prompt_text, prompt_date')
          .eq('user_id', session.user.id)
          .eq('prompt_type', 'post_evening')
          .gte('prompt_date', startStr)
          .lte('prompt_date', endStr)
          .order('generated_at', { ascending: false })
        const seen = new Set<string>()
        ;(eveningPrompts ?? []).forEach((p) => {
          const d = (p as { prompt_date?: string }).prompt_date
          if (d && !seen.has(d)) {
            seen.add(d)
            eveningInsights.push({ date: d, text: (p as { prompt_text?: string }).prompt_text || '' })
          }
        })
      }

      const dayData: DayData[] = []
      for (let d = new Date(weekStart); d <= weekEnd; d = addDays(d, 1)) {
        const dateStr = format(d, 'yyyy-MM-dd')
        const dayTasks = tasksByDate.get(dateStr) ?? []
        const review = reviewByDate.get(dateStr)
        const nm = dayTasks.filter((t) => t.needle_mover).length
        const nmDone = dayTasks.filter((t) => t.needle_mover && t.completed).length
        const eveningInsight = eveningInsights.find((e) => e.date === dateStr)?.text ?? null
        const dayWins = winsWithDate.filter((w) => w.date === dateStr).map((w) => w.text)
        const dayLessons = lessonsWithDate.filter((l) => l.date === dateStr).map((l) => l.text)
        dayData.push({
          date: dateStr,
          needleMovers: nm,
          needleMoversCompleted: nmDone,
          mood: (review as { mood?: number })?.mood ?? null,
          energy: (review as { energy?: number })?.energy ?? null,
          wins: dayWins,
          lessons: dayLessons,
          eveningInsight,
        })
      }

      const primaryGoal = (profileRes.data as { primary_goal_text?: string } | null)?.primary_goal_text ?? null
      const isAdmin = (profileRes.data as { is_admin?: boolean } | null)?.is_admin === true
      const canRegenerate = showRefreshButton

      setData({
        dateRange: { start: startStr, end: endStr },
        daysCompleted,
        daysInWeek,
        isWeekComplete,
        tasksTotal: tasks.length,
        tasksCompleted: tasks.filter((t) => (t as { completed?: boolean }).completed).length,
        needleMoversTotal,
        needleMoversCompleted,
        proactivePct,
        firesTotal: emergencies.length,
        firesResolved: emergencies.filter((e) => e.resolved).length,
        decisions: decisions.length,
        avgMood,
        avgEnergy,
        actionMix,
        wins,
        lessons,
        winsWithDate,
        lessonsWithDate,
        dayData,
        eveningInsights,
        weeklyPrompt: (promptsRes.data as { prompt_text?: string } | null)?.prompt_text ?? null,
        primaryGoal,
        canRegenerateInsights: canRegenerate,
      })
      setLoading(false)
      trackEvent('weekly_page_view', { date_range: `${startStr} to ${endStr}`, is_week_complete: isWeekComplete })
      const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      if (startStr === currentWeekStart) markAsViewed('weekly')
    }

    fetchWeekData()
  }, [effectiveWeekStart, weekStartParam, initialRedirectDone, markAsViewed])

  useEffect(() => {
    const fetchPeriods = async () => {
      const session = await getUserSession()
      if (!session) return
      try {
        const { data: { session: supabaseSession } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {}
        if (supabaseSession?.access_token) headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
        const res = await fetch(`/api/insights/periods?type=weekly&current=${effectiveWeekStart}`, { headers })
        const json = await res.json()
        if (json.periods) setPeriods(json.periods)
      } catch {
        // ignore
      }
    }
    fetchPeriods()
  }, [effectiveWeekStart])

  useEffect(() => {
    if (!data?.dateRange?.start) return
    const fetchSelections = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const res = await fetch(`/api/weekly-insight/selections?weekStart=${data.dateRange.start}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) {
        const json = await res.json()
        setFavoriteWinIndices(json.favoriteWinIndices ?? [])
        setKeyLessonIndices(json.keyLessonIndices ?? [])
      }
    }
    fetchSelections()
  }, [data?.dateRange?.start])

  const saveSelections = async (favorites: number[], keys: number[]) => {
    if (!data?.dateRange?.start) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return
    await fetch('/api/weekly-insight/selections', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        weekStart: data.dateRange.start,
        favoriteWinIndices: favorites,
        keyLessonIndices: keys,
      }),
    })
  }

  const handleToggleFavoriteWin = (index: number) => {
    const next = favoriteWinIndices.includes(index)
      ? favoriteWinIndices.filter((i) => i !== index)
      : [...favoriteWinIndices, index].sort((a, b) => a - b)
    setFavoriteWinIndices(next)
    saveSelections(next, keyLessonIndices)
  }

  const handleToggleKeyLesson = (index: number) => {
    const next = keyLessonIndices.includes(index)
      ? keyLessonIndices.filter((i) => i !== index)
      : [...keyLessonIndices, index].sort((a, b) => a - b)
    setKeyLessonIndices(next)
    saveSelections(favoriteWinIndices, next)
  }

  const handleGenerateInsight = async () => {
    if (!data) return
    const session = await getUserSession()
    const features = session ? getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled }) : null
    if (!features?.personalWeeklyInsight) return

    setGenerating(true)
    setGenerateError(null)

    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (supabaseSession?.access_token) {
        headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
      }
      Object.assign(headers, await import('@/lib/api-client').then((m) => m.getSignedHeadersCached(supabaseSession?.access_token)))

      const res = await fetch('/api/weekly-insight/generate', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          weekStart: data.dateRange.start,
          weekEnd: data.dateRange.end,
          wins: data.wins,
          lessons: data.lessons,
          favoriteWinIndices,
          keyLessonIndices,
          avgMood: data.avgMood,
          avgEnergy: data.avgEnergy,
          tasksCompleted: data.tasksCompleted,
          totalTasks: data.tasksTotal,
          needleMoversCompleted: data.needleMoversCompleted,
          needleMoversTotal: data.needleMoversTotal,
          primaryGoal: data.primaryGoal,
        }),
      })

      const result = await res.json()

      if (result.jobId) {
        setGenerateError('Insight generation started. This will take about 30 seconds. Check back soon!')
        setGenerating(false)

        const checkStatus = setInterval(async () => {
          try {
            const { data: { session: authSession } } = await supabase.auth.getSession()
            const statusHeaders: Record<string, string> = {}
            if (authSession?.access_token) {
              statusHeaders['Authorization'] = `Bearer ${authSession.access_token}`
            }
            const statusRes = await fetch(`/api/weekly-insight/status?jobId=${result.jobId}`, { headers: statusHeaders })
            const status = await statusRes.json()

            if (status.status === 'completed') {
              clearInterval(checkStatus)
              window.location.reload()
            } else if (status.status === 'failed') {
              clearInterval(checkStatus)
              setGenerateError(status.error || 'Generation failed')
            }
          } catch {
            clearInterval(checkStatus)
            setGenerateError('Failed to check generation status')
          }
        }, 2000)
      } else if (result.prompt) {
        setWeeklyPromptOverride(result.prompt)
        setGenerateError(null)
        setGenerating(false)
        trackEvent('weekly_insight_generated', { week_start: data.dateRange.start })
      } else if (result.aiError) {
        setGenerateError(result.error || 'AI service error')
        setGenerating(false)
      } else {
        setGenerateError(result.error || 'Failed to start generation')
        setGenerating(false)
      }
    } catch (err) {
      console.error('[weekly] Generate error:', err)
      setGenerateError(err instanceof Error ? err.message : 'Failed to generate')
      setGenerating(false)
    }
  }

  // No auto-generate: insights are pre-generated by cron. Users see pre-generated or placeholder.

  const handleInsightFeedback = async (type: 'helpful' | 'not_quite_right' | 'custom') => {
    if (!data || feedbackSent) return
    if (type === 'custom' && !customFeedbackText.trim()) return
    setInsightFeedback(type)
    try {
      const { data: { session: supabaseSession } } = await supabase.auth.getSession()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (supabaseSession?.access_token) {
        headers['Authorization'] = `Bearer ${supabaseSession.access_token}`
      }
      const res = await fetch('/api/weekly-insight/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          weekStart: data.dateRange.start,
          feedbackType: type,
          feedbackText: type === 'custom' ? customFeedbackText.trim() : undefined,
        }),
      })
      if (res.ok) {
        setFeedbackSent(true)
        trackEvent('weekly_insight_feedback', { type })
      }
    } catch (err) {
      console.error('[weekly] Feedback error:', err)
    }
  }

  const displayPrompt = weeklyPromptOverride ?? data?.weeklyPrompt ?? null

  const handleCopySummary = async () => {
    if (!data) return
    const text = [
      `📊 Wheel of Founders — Weekly Summary`,
      `${format(new Date(data.dateRange.start), 'MMM d')} – ${format(new Date(data.dateRange.end), 'MMM d, yyyy')}`,
      ``,
      `✅ Needle Movers: ${data.needleMoversCompleted}/${data.needleMoversTotal}`,
      `🔥 Fires: ${data.firesTotal} (${data.firesResolved} resolved)`,
      data.avgMood != null ? `😊 Avg Mood: ${MOOD_LABELS[Math.round(data.avgMood)] || data.avgMood}/5` : '',
      data.avgEnergy != null ? `🔋 Avg Energy: ${data.avgEnergy}/5` : '',
      data.decisions > 0 ? `🎯 Decisions: ${data.decisions}` : '',
      data.wins.length > 0 ? `\nWins:\n${data.wins.map((w) => `• ${w}`).join('\n')}` : '',
      data.lessons.length > 0 ? `\nLessons:\n${data.lessons.map((l) => `• ${l}`).join('\n')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <p className="text-sm text-gray-600 dark:text-white">
            Mrs. Deer, your AI companion is reflecting on your week...
          </p>
          <div className="flex gap-1">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.coral.DEFAULT }} />
            <span className="w-2 h-2 rounded-full animate-pulse delay-100" style={{ backgroundColor: colors.coral.DEFAULT }} />
            <span className="w-2 h-2 rounded-full animate-pulse delay-200" style={{ backgroundColor: colors.coral.DEFAULT }} />
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const needlePct = data.needleMoversTotal > 0 ? Math.round((data.needleMoversCompleted / data.needleMoversTotal) * 100) : 0
  const pace = getPaceAssessment(data.needleMoversCompleted, data.needleMoversTotal, data.daysCompleted, data.daysInWeek)

  const selectedWeekStart = new Date(data.dateRange.start)
  const currentWeekStr = format(selectedWeekStart, 'yyyy-MM-dd')
  const hasCurrentWeekInsight = periods.includes(currentWeekStr)
  const showWeekInProgress =
    !hasCurrentWeekInsight &&
    isSameWeek(selectedWeekStart, new Date(), { weekStartsOn: 1 })

  const bestDayData = data.dayData
    .filter((d) => d.needleMoversCompleted > 0)
    .sort((a, b) => b.needleMoversCompleted - a.needleMoversCompleted)[0]
  const bestDayName = bestDayData ? format(new Date(bestDayData.date), 'EEEE') : null

  const moodChartDays = data.dayData.map((d) => ({
    date: d.date,
    dayName: format(new Date(d.date), 'EEE'),
    mood: d.mood,
    energy: d.energy,
    needleMovers: d.needleMoversCompleted,
  }))

  const patternForQuestion = detectPatternForQuestion(data.winsWithDate, data.lessonsWithDate)
  const allTopics = detectAllTopicPatterns(data.winsWithDate, data.lessonsWithDate)

  const goalProgressItems = data.wins.slice(0, 3)
  const goalMissing = data.primaryGoal && data.primaryGoal.toLowerCase().includes('business')
    ? 'Still no paid users'
    : null
  const goalMrsDeerQuestion = data.primaryGoal && data.primaryGoal.toLowerCase().includes('business')
    ? "You moved the needle on community but not on revenue. What's one small step toward paid users you could take next week?"
    : "What's one small step toward your goal you could take next week?"

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2 text-[#152B50] dark:text-white">
              <Calendar className="w-8 h-8" style={{ color: colors.coral.DEFAULT }} />
              Weekly Insights
            </h1>
            <p className="text-sm mt-1 text-gray-600 dark:text-white">
              {showWeekInProgress
                ? `${data.daysCompleted} days completed · ${data.daysInWeek - data.daysCompleted} days left`
                : 'Week complete'}
            </p>
          </div>
          <Button variant="outline" onClick={handleCopySummary} className="gap-2 shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Summary'}
          </Button>
        </div>
        <InsightNavigation
          type="weekly"
          currentPeriod={data.dateRange.start}
          periods={periods.length > 0 ? periods : [data.dateRange.start]}
          onNavigate={(period) => router.push(`/weekly?weekStart=${period}`)}
          nextDisabledMessage={
            !periods.some((p) => p === format(addWeeks(new Date(data.dateRange.start), 1), 'yyyy-MM-dd'))
              ? (() => {
                  const nextWeekStart = addWeeks(new Date(data.dateRange.start), 1)
                  const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 })
                  return `Week of ${format(nextWeekStart, 'MMM d')}–${format(nextWeekEnd, 'MMM d, yyyy')} insights will be available on Monday`
                })()
              : undefined
          }
        />
      </div>

      {/* Before Sunday: Progress Snapshot - only when viewing current week with no insight yet */}
      {showWeekInProgress && (
        <Card highlighted className="mb-8" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
              <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
              Week in Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Needle Movers: {data.needleMoversCompleted}/{data.needleMoversTotal} ({needlePct}%)
              </p>
              <p className="text-sm text-gray-600 dark:text-white">
                Pace: {pace}
              </p>
              {bestDayName && (
                <p className="text-sm mt-1 text-gray-900 dark:text-white">
                  Your best day so far: {bestDayName} ({bestDayData?.needleMoversCompleted ?? 0})
                </p>
              )}
            </div>
            <MrsDeerMessageBubble expression="thoughtful">
              <p className="leading-relaxed text-gray-900 dark:text-white">
                {generateProgressInsight(data.needleMoversCompleted, data.needleMoversTotal, bestDayName)}
              </p>
            </MrsDeerMessageBubble>
          </CardContent>
        </Card>
      )}

      {/* Full Analysis - when not viewing current week in progress (or when current week has insight) */}
      {!showWeekInProgress && (
        <div className="space-y-8">
          <CelebrationHeader
            quote={generateCelebrationQuote(data.wins, data.lessons)}
            dateRange={`${format(new Date(data.dateRange.start), 'MMM d')} – ${format(new Date(data.dateRange.end), 'MMM d, yyyy')}`}
          />

          {/* 1. Mrs. Deer, your AI companion's insight FIRST (auto-generated or from cron) */}
          {(displayPrompt || (data.wins.length > 0 || data.lessons.length > 0)) && (
            <Card highlighted className="mb-8 bg-amber-50 dark:bg-amber-900/30" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                    <Sparkles className="w-6 h-6" style={{ color: colors.amber.DEFAULT }} />
                    Mrs. Deer, your AI companion&apos;s Weekly Reflection
                  </CardTitle>
                  {data.canRegenerateInsights && (
                    <button
                      type="button"
                      onClick={handleGenerateInsight}
                      disabled={generating}
                      aria-label="Refresh insight"
                      className="text-sm px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
                      style={{ backgroundColor: colors.coral.DEFAULT, color: 'white' }}
                    >
                      {generating ? '…' : '↻ Refresh Insight'}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {displayPrompt ? (
                  <>
                    <div className="flex flex-col gap-4">
                      <div className="flex justify-start">
                        <MrsDeerAvatar expression="thoughtful" size="large" />
                      </div>
                      <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100 dark:text-gray-100">
                        {displayPrompt}
                      </MarkdownText>
                    </div>
                    {!feedbackSent ? (
                      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700 dark:border-gray-700">
                        <span className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 mr-2">Was this helpful?</span>
                        <button
                          type="button"
                          onClick={() => handleInsightFeedback('helpful')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 transition"
                        >
                          <ThumbsUp className="w-4 h-4" />
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInsightFeedback('not_quite_right')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 dark:border-gray-700 text-sm font-medium hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800 transition"
                        >
                          <ThumbsDown className="w-4 h-4" />
                          Not quite
                        </button>
                        <button
                          type="button"
                          onClick={() => setInsightFeedback(insightFeedback === 'custom' ? null : 'custom')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition ${insightFeedback === 'custom' ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-gray-200 dark:border-gray-700 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:bg-gray-800'}`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Actually...
                        </button>
                        {insightFeedback === 'custom' && (
                          <div className="w-full mt-2 flex gap-2">
                            <input
                              type="text"
                              value={customFeedbackText}
                              onChange={(e) => setCustomFeedbackText(e.target.value)}
                              placeholder="What I really learned was..."
                              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-[#ef725c] focus:border-transparent"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleInsightFeedback('custom')}
                              disabled={!customFeedbackText.trim()}
                            >
                              Send
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300 pt-2">Thanks for your feedback! It helps Mrs. Deer, your AI companion get better.</p>
                    )}
                  </>
                ) : generateError ? (
                  <div className={`rounded-lg p-4 border ${
                    generateError.includes('started')
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <p className={`text-sm ${generateError.includes('started') ? 'text-blue-800 dark:text-blue-200' : 'font-medium text-red-800 dark:text-red-200'}`}>
                      {generateError.includes('started') ? '' : 'AI insight failed'}
                    </p>
                    <p className={`text-sm mt-1 ${generateError.includes('started') ? 'text-blue-800 dark:text-blue-200' : 'text-red-700 dark:text-red-300 font-mono'}`}>
                      {generateError}
                    </p>
                    {!generateError.includes('started') && (
                      <button
                        type="button"
                        onClick={handleGenerateInsight}
                        className="mt-3 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        disabled={generating}
                      >
                        Try again
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {generating ? (
                      <div className="flex flex-col items-center gap-4 w-full py-4">
                        <MrsDeerAvatar expression="thoughtful" size="large" />
                        <p className="text-sm text-gray-600 dark:text-white text-center">
                          {generateError?.includes('started')
                            ? 'Your insight is being generated in the background. You can navigate away and come back later.'
                            : 'Mrs. Deer, your AI companion is reflecting on your week...'}
                        </p>
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: colors.coral.DEFAULT }} />
                          <span className="w-2 h-2 rounded-full animate-pulse delay-100" style={{ backgroundColor: colors.coral.DEFAULT }} />
                          <span className="w-2 h-2 rounded-full animate-pulse delay-200" style={{ backgroundColor: colors.coral.DEFAULT }} />
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        Your weekly reflection will appear here. It&apos;s generated every Monday for the previous week.
                        {data.canRegenerateInsights && ' Use the refresh button above to generate it now.'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(patternForQuestion || allTopics.length > 0) && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Sparkles className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
                  Patterns Mrs. Deer, your AI companion noticed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MrsDeerMessageBubble expression="thoughtful">
                  <PatternQuestion pattern={patternForQuestion} allTopics={allTopics} />
                </MrsDeerMessageBubble>
              </CardContent>
            </Card>
          )}

          {data.primaryGoal && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                  Your Goal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <GoalProgress
                  primaryGoal={data.primaryGoal}
                  progressItems={goalProgressItems}
                  missingItem={goalMissing}
                  mrsDeerQuestion={goalMrsDeerQuestion}
                />
              </CardContent>
            </Card>
          )}

          {data.wins.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Award className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                  Your Top Wins
                </CardTitle>
              </CardHeader>
              <CardContent>
                <WinReflection
                  wins={data.wins}
                  favoriteIndices={favoriteWinIndices}
                  onToggle={handleToggleFavoriteWin}
                />
              </CardContent>
            </Card>
          )}

          {data.lessons.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Lightbulb className="w-5 h-5" style={{ color: colors.amber.DEFAULT }} />
                  Your Key Insight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LessonInput
                  lessons={data.lessons}
                  keyIndices={keyLessonIndices}
                  onToggle={handleToggleKeyLesson}
                />
              </CardContent>
            </Card>
          )}

          {(data.avgMood != null || data.avgEnergy != null) && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Heart className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                  Mood & Energy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MoodChart
                  days={moodChartDays}
                  avgMood={data.avgMood}
                  avgEnergy={data.avgEnergy}
                />
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {data.tasksTotal === 0 &&
        data.firesTotal === 0 &&
        data.wins.length === 0 &&
        data.lessons.length === 0 &&
        !data.avgMood &&
        !data.avgEnergy && (
          <p className="text-center py-12 text-gray-600 dark:text-white">
            No data for this week yet. Start your Morning Plan and Evening Reviews to build your insights.
          </p>
        )}
    </div>
  )
}
