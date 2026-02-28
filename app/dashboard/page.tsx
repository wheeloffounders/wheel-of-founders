'use client'

import { Flame, Sparkles, Moon, Sun, RefreshCw, ChevronRight } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { calculateStreak, StreakData } from '@/lib/streak'
import { getFeatureAccess } from '@/lib/features'
import { toNaturalStage } from '@/lib/mrs-deer'
import { MarkdownText } from '@/components/MarkdownText'
import { useUserLanguage } from '@/lib/use-user-language'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { colors, spacing } from '@/lib/design-tokens'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { LastUpdated } from '@/components/LastUpdated'
import { useUserProfile } from '@/lib/hooks/useUserProfile'
import { LoadingWithRetry } from '@/components/LoadingWithRetry'
import { DashboardProgress } from '@/components/DashboardProgress'

export default function DashboardPage() {
  const lang = useUserLanguage()
  const { syncData, isSyncing, lastSynced } = useDataSync()
  const { displayName } = useUserProfile()
  const [stats, setStats] = useState<{
    needleMovers: number
    totalTasks: number
    focusScore: number
  }>({ needleMovers: 0, totalTasks: 0, focusScore: 0 })
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastReviewDate: null,
  })
  const [userTier, setUserTier] = useState<string>('beta')
  const [personalPrompts, setPersonalPrompts] = useState<Array<{
    prompt_text: string
    prompt_type: 'morning' | 'post_morning' | 'post_evening' | 'weekly' | 'monthly'
    stage_context: string | null
    generated_at: string
  }>>([])
  const [todayIntention, setTodayIntention] = useState<string | null>(null)
  const [postMorningInsight, setPostMorningInsight] = useState<string | null>(null)
  const [completedTasksCount, setCompletedTasksCount] = useState(0)
  const [hasDecision, setHasDecision] = useState(false)
  const [weeklyStats, setWeeklyStats] = useState<{
    milestoneThisWeek: number
    milestoneLastWeek: number
    proactivePct: number
    timeSavedThisWeek: number
    timeSavedLastWeek: number
  }>({ milestoneThisWeek: 0, milestoneLastWeek: 0, proactivePct: 0, timeSavedThisWeek: 0, timeSavedLastWeek: 0 })

  const router = useRouter()

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const authenticateAndFetchData = async () => {
    const session = await getUserSession()
    if (!session) {
      router.push('/login?returnTo=/dashboard')
      return
    }

    setUserTier(session.user.tier || 'beta')
    const today = format(new Date(), 'yyyy-MM-dd')
    const errors: string[] = []

    const { data: tasksData, error: tasksError } = await supabase
      .from('morning_tasks')
      .select('*')
      .eq('plan_date', today)
      .eq('user_id', session.user.id)

    if (tasksError) {
      const msg = `morning_tasks: ${tasksError.message}`
      errors.push(msg)
      setFetchError((prev) => (prev ? `${prev}; ` : '') + msg)
    }

    const totalTasks = tasksData?.length ?? 0
    const needleMovers = (tasksData ?? []).filter((t) => (t as { needle_mover?: boolean }).needle_mover).length
    const completedCount = (tasksData ?? []).filter((t) => (t as { completed?: boolean }).completed).length
    setCompletedTasksCount(completedCount)

    const { data: decisionData } = await supabase
      .from('morning_decisions')
      .select('decision')
      .eq('plan_date', today)
      .eq('user_id', session.user.id)
      .maybeSingle()
    setTodayIntention(decisionData?.decision?.trim() || null)
    setHasDecision(!!decisionData?.decision?.trim())

    const now = new Date()
    const thisWeekStart = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const thisWeekEnd = format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const lastWeekStart = format(startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const lastWeekEnd = format(endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), 'yyyy-MM-dd')

    const [
      { data: thisWeekTasks },
      { data: lastWeekTasks },
    ] = await Promise.all([
      supabase.from('morning_tasks').select('needle_mover, completed, is_proactive, action_plan').eq('user_id', session.user.id).gte('plan_date', thisWeekStart).lte('plan_date', thisWeekEnd),
      supabase.from('morning_tasks').select('needle_mover, completed, is_proactive, action_plan').eq('user_id', session.user.id).gte('plan_date', lastWeekStart).lte('plan_date', lastWeekEnd),
    ])

    const timeSavedFactors: Record<string, number> = {
      systemize: 4,
      delegate_founder: 6,
      eliminate_founder: 2,
      quick_win_founder: 0.5,
      my_zone: 0,
    }
    const thisWeek = thisWeekTasks ?? []
    const lastWeek = lastWeekTasks ?? []
    const milestoneThisWeek = thisWeek.filter((t) => (t as { needle_mover?: boolean }).needle_mover).length
    const milestoneLastWeek = lastWeek.filter((t) => (t as { needle_mover?: boolean }).needle_mover).length
    const proactiveThisWeek = thisWeek.filter((t) => (t as { is_proactive?: boolean }).is_proactive === true).length
    const totalThisWeek = thisWeek.length
    const proactivePct = totalThisWeek > 0 ? Math.round((proactiveThisWeek / totalThisWeek) * 100) : 0
    let timeSavedThisWeek = 0
    let timeSavedLastWeek = 0
    for (const t of thisWeek) {
      const plan = (t as { action_plan?: string }).action_plan
      if (plan && timeSavedFactors[plan]) timeSavedThisWeek += timeSavedFactors[plan]
    }
    for (const t of lastWeek) {
      const plan = (t as { action_plan?: string }).action_plan
      if (plan && timeSavedFactors[plan]) timeSavedLastWeek += timeSavedFactors[plan]
    }
    setWeeklyStats({ milestoneThisWeek, milestoneLastWeek, proactivePct, timeSavedThisWeek, timeSavedLastWeek })

    const { data: eveningReviewData, error: eveningError } = await supabase
      .from('evening_reviews')
      .select('*')
      .eq('review_date', today)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (eveningError) {
      errors.push(`evening_reviews: ${eveningError.message}`)
      setFetchError((prev) => (prev ? `${prev}; ` : '') + eveningError.message)
    }

    const review = eveningReviewData as { mood?: number; energy?: number } | null
    const mood = review?.mood ?? 0
    const energy = review?.energy ?? 0
    const focusScore = mood > 0 && energy > 0 ? Math.round(((mood + energy) / 10) * 100) : 0

    if (errors.length === 0) setFetchError(null)

    const streakData = await calculateStreak(session.user.id)
    setStreak(streakData)

    const features = getFeatureAccess({
      tier: session.user.tier,
      pro_features_enabled: session.user.pro_features_enabled,
    })

    const hasMorningPlanToday = (tasksData?.length ?? 0) > 0
    const hasEveningReviewToday = !!eveningReviewData

    if (features.dailyMorningPrompt || features.personalWeeklyInsight || features.personalMonthlyInsight) {
      try {
        const todayStart = new Date(today + 'T00:00:00').toISOString()
        const todayEnd = new Date(today + 'T23:59:59').toISOString()

        let todayInsights: Array<{ prompt_text: string; prompt_type: string; prompt_date?: string; stage_context?: string | null; generated_at: string }> | null = null

        const { data: byPromptDate } = await supabase
          .from('personal_prompts')
          .select('prompt_text, prompt_type, prompt_date, stage_context, generated_at')
          .eq('user_id', session.user.id)
          .eq('prompt_date', today)
          .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
          .order('generated_at', { ascending: false })

        todayInsights = byPromptDate

        if (!todayInsights || todayInsights.length === 0) {
          const { data: byGeneratedAt } = await supabase
            .from('personal_prompts')
            .select('prompt_text, prompt_type, stage_context, generated_at')
            .eq('user_id', session.user.id)
            .gte('generated_at', todayStart)
            .lte('generated_at', todayEnd)
            .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
            .order('generated_at', { ascending: false })
          if (byGeneratedAt?.length) todayInsights = byGeneratedAt
        }

        if (todayInsights && todayInsights.length > 0) {
          let displayInsight = todayInsights.find((i) => i.prompt_type === 'post_evening') ?? null
          if (!displayInsight && hasMorningPlanToday) displayInsight = todayInsights.find((i) => i.prompt_type === 'post_morning') ?? null
          if (!displayInsight) displayInsight = todayInsights.find((i) => i.prompt_type === 'morning') ?? null
          setPersonalPrompts(displayInsight ? [displayInsight] as any : [])

          const postMorning = todayInsights.find((i) => i.prompt_type === 'post_morning')
          setPostMorningInsight(postMorning?.prompt_text?.trim() ?? null)
        } else {
          setPersonalPrompts([])
          setPostMorningInsight(null)
        }
      } catch {
        setPersonalPrompts([])
      }
    } else {
      setPersonalPrompts([])
      setPostMorningInsight(null)
    }

    setStats({ needleMovers, totalTasks, focusScore })
    setLoading(false)
  }

  useEffect(() => {
    authenticateAndFetchData()
  }, [])

  useEffect(() => {
    const handleSyncRequest = () => authenticateAndFetchData()
    window.addEventListener('data-sync-request', handleSyncRequest)
    return () => window.removeEventListener('data-sync-request', handleSyncRequest)
  }, [])

  useEffect(() => {
    let touchStartY = 0
    const handleTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY }
    const handleTouchEnd = async (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY
      const scrollTop = document.documentElement.scrollTop || window.pageYOffset
      if (scrollTop === 0 && touchEndY - touchStartY > 100) await syncData(true)
    }
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchend', handleTouchEnd, { passive: false })
    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [syncData])

  useEffect(() => {
    const interval = setInterval(() => syncData(false), 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [syncData])

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-5 py-8" style={{ paddingTop: spacing['2xl'], paddingBottom: spacing['2xl'] }}>
      <OnboardingWizard />
      <LastUpdated timestamp={lastSynced} isSyncing={isSyncing} onRefresh={() => syncData(true)} />

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
          <LoadingWithRetry message="Loading your day..." onRetry={() => authenticateAndFetchData()} timeoutMs={8000} />
        </div>
      ) : (
        <>
          <DashboardProgress />
          <div className="mb-6">
            <h1 className="text-[28px] md:text-[32px] font-semibold mb-1 text-gray-900 dark:text-gray-100 dark:text-white">
              {getTimeBasedGreeting()}, {displayName}
            </h1>
            {streak.currentStreak > 0 && (
              <p className="text-sm mb-3 text-gray-700 dark:text-gray-300 dark:text-gray-300">You&apos;re on a {streak.currentStreak}-day streak 🔥</p>
            )}
            {todayIntention ? (
              <>
                <p className="text-sm font-medium mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">Today&apos;s intention:</p>
                <p className="text-lg text-gray-900 dark:text-gray-100 dark:text-white">&quot;{todayIntention}&quot;</p>
                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">from morning plan</p>
              </>
            ) : (
              <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                Set your intention in your <Link href="/morning" className="underline text-[#EF725C] hover:text-[#F28771]">Morning Plan</Link>
              </p>
            )}
            {userTier === 'beta' && <Badge variant="amber" className="mt-2">Beta</Badge>}
          </div>

          {postMorningInsight && (
            <Link
              href={`/history?date=${format(new Date(), 'yyyy-MM-dd')}`}
              className="block mb-6"
            >
              <Card className="bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer" style={{ borderLeft: `4px solid ${colors.amber.DEFAULT}` }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Sparkles className="w-5 h-5" />
                    Mrs. Deer, your AI companion&apos;s Insight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-900 dark:text-gray-100 line-clamp-2 text-sm">
                    {(() => {
                      const firstSentence = postMorningInsight.split(/[.!?]/)[0]?.trim()
                      const summary = firstSentence && firstSentence.length <= 120 ? firstSentence : postMorningInsight.slice(0, 100).trim() + (postMorningInsight.length > 100 ? '…' : '')
                      return summary
                    })()}
                  </p>
                  <p className="text-sm font-medium mt-2 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                    Read more
                    <ChevronRight className="w-4 h-4" />
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Sun className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
                  MORNING
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.totalTasks > 0 ? (
                  <ul className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">
                    <li className="flex items-center gap-2">{completedTasksCount === stats.totalTasks ? '✓' : '○'} Power List ({completedTasksCount}/{stats.totalTasks})</li>
                    {stats.needleMovers > 0 && <li className="flex items-center gap-2">✓ {stats.needleMovers} {lang.needleMover}</li>}
                    <li className="flex items-center gap-2">{hasDecision ? '✓' : '○'} Decision made</li>
                  </ul>
                ) : (
                  <p className="text-sm text-gray-700 dark:text-gray-300 dark:text-gray-300">No plan yet</p>
                )}
                <Link href="/morning" className="text-sm font-medium mt-3 inline-block text-[#EF725C] hover:text-[#F28771]">
                  {stats.totalTasks > 0 ? 'View plan →' : 'Add Morning Plan →'}
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700" style={{ borderLeft: `3px solid ${colors.navy.DEFAULT}` }}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                  <Moon className="w-5 h-5" style={{ color: colors.navy.DEFAULT }} />
                  EVENING
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.focusScore > 0 ? (
                  <>
                    <p className="text-sm mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-300">✓ Review complete</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300">Focus score: {stats.focusScore}</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-2 text-gray-700 dark:text-gray-300 dark:text-gray-300">⏳ Not yet done</p>
                    {stats.totalTasks > 0 && <p className="text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300">Tonight&apos;s focus: Reflect on your day</p>}
                    {new Date().getHours() >= 17 && streak.currentStreak > 0 && <p className="text-xs mt-2 font-medium text-[#EF725C]">Complete to keep your streak! 🔥</p>}
                  </>
                )}
                <Link href="/evening" className="text-sm font-medium mt-3 inline-block text-gray-900 dark:text-gray-100 dark:text-white hover:underline">
                  {stats.focusScore > 0 ? 'View review →' : 'Evening Review →'}
                </Link>
              </CardContent>
            </Card>
          </div>

          {(() => {
            const features = getFeatureAccess({ tier: userTier, pro_features_enabled: true })
            const hasPrompt = features.dailyMorningPrompt && personalPrompts?.length > 0
            const latestPrompt = hasPrompt && personalPrompts?.length > 0
              ? personalPrompts.find((p) => p.prompt_type === 'post_evening') || personalPrompts.find((p) => p.prompt_type === 'post_morning') || personalPrompts.find((p) => p.prompt_type === 'morning') || personalPrompts[0]
              : null
            const expression = latestPrompt?.prompt_type === 'post_evening' ? 'encouraging' : latestPrompt?.prompt_type === 'post_morning' ? 'thoughtful' : 'welcoming'
            if (!hasPrompt || !latestPrompt) return null
            return (
              <Card highlighted className="mb-8 bg-amber-50 dark:bg-amber-900/30" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
                      <Sparkles className="w-6 h-6" style={{ color: colors.amber.DEFAULT }} />
                      🔍 FOUNDER&apos;S LENS
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {latestPrompt.generated_at && <span className="text-xs text-gray-700 dark:text-gray-300 dark:text-gray-300">{format(new Date(latestPrompt.generated_at), 'h:mm a')}</span>}
                      <button type="button" onClick={() => syncData(true)} disabled={isSyncing} className="p-1.5 transition-colors hover:opacity-70 disabled:opacity-50" aria-label="Refresh insight">
                        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} style={{ color: colors.coral.DEFAULT }} />
                      </button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100 dark:text-white">{latestPrompt.prompt_text}</MarkdownText>
                      {latestPrompt.stage_context && <p className="text-xs italic mt-2 text-gray-700 dark:text-gray-300 dark:text-gray-300">Stage: {toNaturalStage(latestPrompt.stage_context)}</p>}
                    </div>
                    <MrsDeerAvatar expression={expression} size="large" className="flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-sm mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">MILESTONE</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">{weeklyStats.milestoneThisWeek} this week</p>
                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">vs {weeklyStats.milestoneLastWeek} last</p>
                {weeklyStats.milestoneThisWeek !== weeklyStats.milestoneLastWeek && (
                  <span className={`text-sm font-medium ${weeklyStats.milestoneThisWeek >= weeklyStats.milestoneLastWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {weeklyStats.milestoneThisWeek >= weeklyStats.milestoneLastWeek ? '📈' : '📉'} {Math.abs(weeklyStats.milestoneThisWeek - weeklyStats.milestoneLastWeek)}
                  </span>
                )}
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-sm mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">ACTION MIX</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">{weeklyStats.proactivePct}% Proactive</p>
                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">{100 - weeklyStats.proactivePct}% Reactive</p>
                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">{weeklyStats.proactivePct >= 50 ? '⚖️ Balanced' : 'Consider more proactive moves'}</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800 dark:bg-gray-800 border-gray-200 dark:border-gray-700 dark:border-gray-700">
              <CardContent className="p-6">
                <p className="text-sm mb-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">TIME SAVED</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 dark:text-white">{weeklyStats.timeSavedThisWeek} hrs this week</p>
                <p className="text-xs mt-1 text-gray-700 dark:text-gray-300 dark:text-gray-300">vs {weeklyStats.timeSavedLastWeek} hrs last</p>
                {weeklyStats.timeSavedThisWeek !== weeklyStats.timeSavedLastWeek && (
                  <span className={`text-sm font-medium block mt-1 ${weeklyStats.timeSavedThisWeek >= weeklyStats.timeSavedLastWeek ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    ⏱️ {weeklyStats.timeSavedThisWeek >= weeklyStats.timeSavedLastWeek ? '+' : ''}{weeklyStats.timeSavedThisWeek - weeklyStats.timeSavedLastWeek}hrs
                  </span>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-4">
            <Link href="/morning">
              <Button variant="coral" className="h-12 gap-2">
                <Sun className="w-5 h-5" />
                Morning Plan
              </Button>
            </Link>
            <Link href="/emergency">
              <Button variant="amber" className="h-12 gap-2">
                <Flame className="w-5 h-5" />
                Emergency
              </Button>
            </Link>
            <Link href="/evening">
              <Button variant="navy" className="h-12 gap-2">
                <Moon className="w-5 h-5" />
                Evening Review
              </Button>
            </Link>
          </div>
        </>
      )}

      {fetchError && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg text-amber-800 dark:text-amber-200 text-sm">
          <strong>Data fetch issue:</strong> {fetchError}
          <p className="mt-2 text-amber-700 dark:text-amber-300">Check console for details. Metrics may show 0.</p>
        </div>
      )}

      {userTier === 'free' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-300 dark:border-purple-500/60">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">Unlock AI Coaching Moments</h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-4">Pro+ includes personalized coaching with Mrs. Deer, your AI companion&apos;s Gentle Architect framework:</p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-6 space-y-2">
            <li>Daily morning reflection (Gentle Architect)</li>
            <li>Plan analysis after each morning</li>
            <li>Evening reflection insights</li>
            <li>Weekly pattern summaries</li>
            <li>Monthly growth reviews</li>
          </ul>
          <Link href="/pricing">
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition">Upgrade to Pro+ ($39/month)</button>
          </Link>
        </div>
      )}
    </div>
  )
}
