'use client'

import { Brain, Target, Shield, TrendingUp, Flame, Sparkles, RefreshCw } from 'lucide-react'
import { InfoTooltip } from '@/components/InfoTooltip'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { getUserSession } from '@/lib/auth'
import { ACTION_PLAN_OPTIONS_2, ActionPlanOption2 } from '@/app/morning/page'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { calculateStreak, StreakData } from '@/lib/streak'
import { getFeatureAccess } from '@/lib/features'
import { toNaturalStage } from '@/lib/mrs-deer'
import { PersonalInsightsCard } from '@/components/PersonalInsightsCard'
import { MarkdownText } from '@/components/MarkdownText'
import { useUserLanguage } from '@/lib/use-user-language'

export default function HomePage() {
  const lang = useUserLanguage() // Personalized language
  const [stats, setStats] = useState<{
    needleMovers: number;
    totalTasks: number;
    actionMixPercentages: { [key: string]: number };
    actionMixInsight: string;
    estimatedTimeSaved: number;
    focusScore: number;
    firesFought: number;
  }> ({
    needleMovers: 0,
    totalTasks: 0,
    actionMixPercentages: {},
    actionMixInsight: "",
    estimatedTimeSaved: 0,
    focusScore: 0,
    firesFought: 0,
  })
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [streak, setStreak] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastReviewDate: null,
  })
  const [userTier, setUserTier] = useState<string>('beta')
  const [aiInsights, setAiInsights] = useState<Array<{ text: string; type: string; date: string }>>([])
  const [loadingInsights, setLoadingInsights] = useState(true)
  const [refreshingInsights, setRefreshingInsights] = useState(false)
  const [personalPrompts, setPersonalPrompts] = useState<Array<{
    prompt_text: string
    prompt_type: 'morning' | 'post_morning' | 'post_evening' | 'weekly' | 'monthly'
    stage_context: string | null
    generated_at: string
  }>>([])

  const router = useRouter()
  useEffect(() => {
    const authenticateAndFetchData = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login')
        return // Stop execution if not authenticated
      }

      // Set user tier for UI
      setUserTier(session.user.tier || 'beta')

      const today = format(new Date(), 'yyyy-MM-dd')
      const errors: string[] = []

      // Fetch Morning Tasks (select * to avoid 400 if schema differs; we map needed fields)
      const { data: tasksData, error: tasksError } = await supabase
        .from('morning_tasks')
        .select('*')
        .eq('plan_date', today)
        .eq('user_id', session.user.id)

      if (tasksError) {
        const msg = `morning_tasks: ${tasksError.message}`
        console.error('Supabase morning_tasks error:', tasksError.message, tasksError.details)
        errors.push(msg)
        setFetchError((prev) => (prev ? `${prev}; ` : '') + msg)
      }

      const totalTasks = tasksData?.length ?? 0
      const needleMovers = (tasksData ?? []).filter((t) => (t as { needle_mover?: boolean }).needle_mover).length

      // Calculate Founder Action Mix (support both action_plan and legacy preventability)
      const actionMix: { [key: string]: number } = (tasksData ?? []).reduce((acc, task) => {
        const t = task as { action_plan?: string; preventability?: string }
        const plan = t.action_plan ?? t.preventability
        if (plan) {
          acc[plan] = (acc[plan] || 0) + 1
        }
        return acc
      }, {} as { [key: string]: number })

      const actionMixPercentages: { [key: string]: number } = {}
      if (totalTasks > 0) {
        for (const key in actionMix) {
          actionMixPercentages[key] = Math.round((actionMix[key] / totalTasks) * 100)
        }
      }

      let actionMixInsight = "Good balance of founder actions!"
      if ((actionMixPercentages.my_zone || 0) > 60) {
        actionMixInsight = "You're taking on a lot. Consider what could be systemized or delegated."
      } else if ((actionMixPercentages.systemize || 0) < 10 && totalTasks > 0) {
        actionMixInsight = "Building more processes could save you time long-term."
      } else if ((actionMixPercentages.delegate_founder || 0) < 10 && totalTasks > 0) {
        actionMixInsight = "Leveraging your team more could free up your time."
      }

      // Calculate Estimated Time Saved (simple version)
      const timeSavedFactors = {
        systemize: 4, // hours saved per systemized task
        delegate_founder: 6, // hours saved per delegated task
        eliminate_founder: 2, // hours saved per eliminated task
        quick_win_founder: 0.5, // minimal saving
        my_zone: 0, // no direct saving
      }
      let estimatedTimeSaved = 0
      for (const key in actionMix) {
        if (timeSavedFactors[key as ActionPlanOption2]) {
          estimatedTimeSaved += actionMix[key] * timeSavedFactors[key as ActionPlanOption2]
        }
      }


      // Fetch Emergencies
      const { data: emergenciesData, error: emergenciesError } = await supabase
        .from('emergencies')
        .select('id')
        .eq('fire_date', today)
        .eq('user_id', session.user.id)

      if (emergenciesError) {
        console.error('Supabase emergencies error:', emergenciesError.message)
        errors.push(`emergencies: ${emergenciesError.message}`)
      }
      const firesFought = emergenciesData?.length ?? 0

      // Fetch Evening Review for Mood/Energy (select * for resilience)
      const { data: eveningReviewData, error: eveningError } = await supabase
        .from('evening_reviews')
        .select('*')
        .eq('review_date', today)
        .eq('user_id', session.user.id)
        .maybeSingle()

      if (eveningError) {
        const msg = `evening_reviews: ${eveningError.message}`
        console.error('Supabase evening_reviews error:', eveningError.message, eveningError.details)
        errors.push(msg)
        setFetchError((prev) => (prev ? `${prev}; ` : '') + msg)
      }

      const review = eveningReviewData as { mood?: number; energy?: number } | null
      const mood = review?.mood ?? 0
      const energy = review?.energy ?? 0
      // Simple focus score: average of mood and energy, scaled to 100 (max 5+5=10, so *10)
      const focusScore = mood > 0 && energy > 0 ? Math.round(((mood + energy) / 10) * 100) : 0

      console.log('Supabase session uid:', session.user.id)
      console.log('Fetched tasksData:', tasksData)
      console.log('Fetched eveningReviewData:', eveningReviewData)

      if (errors.length === 0) setFetchError(null)

      // Calculate streak
      const streakData = await calculateStreak(session.user.id)
      setStreak(streakData)

      // Store user tier for beta badge
      setUserTier(session.user.tier || 'beta')

      // Get feature access (used for all feature checks)
      const features = getFeatureAccess({
        tier: session.user.tier,
        pro_features_enabled: session.user.pro_features_enabled,
      })

      setLoadingInsights(false)

      // Fetch personal prompts (Pro tier) - show MOST RELEVANT today's insight by priority
      const hasMorningPlanToday = (tasksData?.length ?? 0) > 0
      const hasEveningReviewToday = !!eveningReviewData

      console.log('[DASHBOARD] Today date:', today)
      console.log('[DASHBOARD] User tier:', session.user.tier)
      console.log('[DASHBOARD] Has morning plan:', hasMorningPlanToday)
      console.log('[DASHBOARD] Has evening review:', hasEveningReviewToday)
      console.log('[DASHBOARD] features.dailyMorningPrompt:', features.dailyMorningPrompt)

      if (features.dailyMorningPrompt || features.personalWeeklyInsight || features.personalMonthlyInsight) {
        try {
          const todayStart = new Date(today + 'T00:00:00').toISOString()
          const todayEnd = new Date(today + 'T23:59:59').toISOString()

          // Try prompt_date first; fallback to generated_at if prompt_date column is missing or returns nothing
          let todayInsights: Array<{ prompt_text: string; prompt_type: string; prompt_date?: string; stage_context?: string | null; generated_at: string }> | null = null

          const { data: byPromptDate, error: promptDateError } = await supabase
            .from('personal_prompts')
            .select('prompt_text, prompt_type, prompt_date, stage_context, generated_at')
            .eq('user_id', session.user.id)
            .eq('prompt_date', today)
            .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
            .order('generated_at', { ascending: false })

          if (promptDateError) {
            console.log('[DASHBOARD] prompt_date query error (column may not exist):', promptDateError.message)
          }
          todayInsights = byPromptDate

          if (!todayInsights || todayInsights.length === 0) {
            // Fallback: use generated_at date range (when prompt_date column doesn't exist)
            const { data: byGeneratedAt, error: genError } = await supabase
              .from('personal_prompts')
              .select('prompt_text, prompt_type, stage_context, generated_at')
              .eq('user_id', session.user.id)
              .gte('generated_at', todayStart)
              .lte('generated_at', todayEnd)
              .in('prompt_type', ['morning', 'post_morning', 'post_evening'])
              .order('generated_at', { ascending: false })

            if (!genError && byGeneratedAt?.length) {
              todayInsights = byGeneratedAt
              console.log('[DASHBOARD] Fallback: found via generated_at:', todayInsights.length, todayInsights.map(p => p.prompt_type))
            } else if (genError) {
              console.error('[DASHBOARD] generated_at fallback error:', genError)
            }
          }

          console.log('[DASHBOARD] Today prompts found:', todayInsights?.length ?? 0, todayInsights?.map(p => p.prompt_type) ?? [])

          if (todayInsights && todayInsights.length > 0) {
            // Priority: 1) evening (if review saved), 2) post_morning (if plan saved), 3) morning (no plan needed — pre-generated from last evening)
            let displayInsight: (typeof todayInsights)[0] | null = null

            if (hasEveningReviewToday) {
              displayInsight = todayInsights.find((i) => i.prompt_type === 'post_evening') ?? null
              console.log('[DASHBOARD] Priority 1 (post_evening):', displayInsight ? 'found' : 'none')
            }
            if (!displayInsight && hasMorningPlanToday) {
              displayInsight = todayInsights.find((i) => i.prompt_type === 'post_morning') ?? null
              console.log('[DASHBOARD] Priority 2 (post_morning):', displayInsight ? 'found' : 'none')
            }
            if (!displayInsight) {
              displayInsight = todayInsights.find((i) => i.prompt_type === 'morning') ?? null
              console.log('[DASHBOARD] Priority 3 (morning prompt, no plan required):', displayInsight ? 'found' : 'none')
            }

            if (displayInsight) {
              console.log('[DASHBOARD] Final displayed insight:', displayInsight.prompt_type)
              setPersonalPrompts([displayInsight] as any)
            } else {
              console.log('[DASHBOARD] No insight to display (none matched priority)')
              setPersonalPrompts([])
            }
          } else {
            console.log('[DASHBOARD] No prompts found for today')
            setPersonalPrompts([])
          }
        } catch (error) {
          console.error('[DASHBOARD] Exception fetching personal prompts:', error)
          setPersonalPrompts([])
        }
      } else {
        console.log('[DASHBOARD] Skipping prompts fetch - features.dailyMorningPrompt false')
        setPersonalPrompts([])
      }

      setStats({
        needleMovers,
        totalTasks,
        actionMixPercentages,
        actionMixInsight,
        estimatedTimeSaved,
        focusScore,
        firesFought,
      })
      setLoading(false)
    }

    authenticateAndFetchData() // Call the new async function
  }, [])

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <OnboardingWizard />
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-[#152b50] dark:text-[#E2E8F0]">
              {lang.dashboardTitle}
            </h1>
            {userTier === 'beta' && (
              <div className="group relative">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#ef725c] text-white cursor-help">
                  Beta
                </span>
                <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 pointer-events-none">
                  All features unlocked during beta testing
                  <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
                </div>
              </div>
            )}
          </div>
          {streak.currentStreak > 0 && (
            <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 shadow-md border border-[#ef725c]/20">
              <Flame className="w-5 h-5 text-[#ef725c]" />
              <span className="text-gray-900 font-semibold">
                {streak.currentStreak}-day streak
              </span>
            </div>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Here&apos;s your daily coaching insight · {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      {/* 5 PM Reminder */}
      {(() => {
        const now = new Date()
        const hour = now.getHours()
        const hasEveningReview = stats.focusScore > 0
        if (hour >= 17 && !hasEveningReview) {
          return (
            <div className="bg-gradient-to-r from-[#ef725c]/10 to-[#152b50]/10 dark:from-[#ef725c]/15 dark:to-[#152b50]/40 rounded-xl shadow-lg p-6 mb-6 border-l-4 border-[#ef725c]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame className="w-6 h-6 text-[#ef725c]" />
                  <div>
                    <h3 className="text-lg font-semibold text-[#152b50] dark:text-[#E2E8F0]">
                      Complete your evening review to keep your streak!
                    </h3>
                    {streak.currentStreak > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        You&apos;re on a {streak.currentStreak}-day streak 🔥
                      </p>
                    )}
                  </div>
                </div>
                <Link href="/evening">
                  <button className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] transition font-medium">
                    Review Now →
                  </button>
                </Link>
              </div>
            </div>
          )
        }
        return null
      })()}



      {/* Upgrade Card for Free Users */}
      {userTier === 'free' && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border-2 border-purple-300 dark:border-purple-500/60">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
              Unlock AI Coaching Moments
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">
            Pro+ includes personalized coaching with Mrs. Deer&apos;s Gentle Architect framework:
          </p>
          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 mb-6 space-y-2">
            <li>Daily morning reflection (Gentle Architect)</li>
            <li>Plan analysis after each morning</li>
            <li>Evening reflection insights</li>
            <li>Weekly pattern summaries</li>
            <li>Monthly growth reviews</li>
          </ul>
          <Link href="/pricing">
            <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition">
              Upgrade to Pro+ ($39/month)
            </button>
          </Link>
        </div>
      )}

      {/* Legacy AI Insight Card (keep for backward compatibility) */}
      {/* NOTE: Founder&apos;s Lens is now represented by the Personalized Insights card below */}

      {/* AI Insights from Batch Analysis */}
      {getFeatureAccess({ tier: userTier, pro_features_enabled: true }).aiInsights && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border border-purple-200 dark:border-purple-500/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="w-6 h-6 text-purple-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0]">
                🤖 AI Insights
              </h2>
            </div>
            <button
              onClick={async () => {
                setRefreshingInsights(true)
                try {
                  const session = await getUserSession()
                  if (!session) return

                  // Refetch insights from database
                  const today = format(new Date(), 'yyyy-MM-dd')
                  const { data: insightsData } = await supabase
                    .from('user_insights')
                    .select('insight_text, insight_type, date')
                    .eq('user_id', session.user.id)
                    .eq('date', today)
                    .order('created_at', { ascending: false })
                    .limit(2)

                  if (insightsData) {
                    setAiInsights(insightsData)
                  }
                } catch (error) {
                  console.error('Error refreshing insights:', error)
                } finally {
                  setRefreshingInsights(false)
                }
              }}
              disabled={refreshingInsights}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-purple-200 hover:bg-purple-100/70 dark:hover:bg-purple-500/10 rounded-lg transition disabled:opacity-50"
              title="Refresh insights (new insights appear daily at 2 AM)"
            >
              <RefreshCw className={`w-4 h-4 ${refreshingInsights ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {loadingInsights ? (
            <p className="text-gray-500 dark:text-gray-400">Loading insights...</p>
          ) : aiInsights.length > 0 ? (
            <div className="space-y-4">
              {aiInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0F1419] rounded-lg p-4 border-l-4 border-purple-500 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {insight.type === 'achievement' && '🎉'}
                      {insight.type === 'pattern' && '📊'}
                      {insight.type === 'suggestion' && '💡'}
                      {insight.type === 'productivity' && '⚡'}
                    </div>
                    <p className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed">
                      {insight.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0F1419] rounded-lg p-6 text-center border-2 border-dashed border-purple-300 dark:border-purple-500/50">
              <Sparkles className="w-12 h-12 text-purple-400 dark:text-purple-300 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                Your first insights will appear tomorrow at 2 AM
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Our AI analyzes your patterns overnight and delivers personalized insights
              </p>
            </div>
          )}
        </div>
      )}

      {/* Founder's Lens: Mrs. Deer prompts only (Smart Constraints removed) */}
      {(() => {
        const features = getFeatureAccess({ tier: userTier, pro_features_enabled: true })
        const hasPrompt = features.dailyMorningPrompt && personalPrompts && personalPrompts.length > 0
        
        if (hasPrompt) {
          // Prioritize post_evening > post_morning > morning (most recent/relevant first)
          const latestPrompt = hasPrompt && personalPrompts.length > 0
            ? personalPrompts.find(p => p.prompt_type === 'post_evening') 
              || personalPrompts.find(p => p.prompt_type === 'post_morning')
              || personalPrompts.find(p => p.prompt_type === 'morning')
              || personalPrompts[0]
            : null
          
          console.log('🎯 Dashboard render: hasPrompt=', hasPrompt, 'latestPrompt=', latestPrompt ? latestPrompt.prompt_type : 'none')
          
          return (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-8 border border-amber-200 dark:border-amber-500/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-[#E2E8F0] flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-amber-600 dark:text-amber-300" />
                    Founder&apos;s Lens: Today&apos;s Perspective
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Mrs. Deer&apos;s personalized insights just for you
                  </p>
                </div>
                <button
                  onClick={async () => {
                    const session = await getUserSession()
                    if (!session) return
                    const features = getFeatureAccess({ tier: session.user.tier, pro_features_enabled: session.user.pro_features_enabled })
                    if (!features.dailyMorningPrompt) return
                    const today = format(new Date(), 'yyyy-MM-dd')
                    const todayStart = new Date(today + 'T00:00:00').toISOString()
                    const todayEnd = new Date(today + 'T23:59:59').toISOString()
                    const [{ data: tasksData }, { data: eveningReviewData }, { data: byPromptDate }, { data: byGeneratedAt }] = await Promise.all([
                      supabase.from('morning_tasks').select('id').eq('plan_date', today).eq('user_id', session.user.id),
                      supabase.from('evening_reviews').select('id').eq('review_date', today).eq('user_id', session.user.id).maybeSingle(),
                      supabase.from('personal_prompts').select('prompt_text, prompt_type, prompt_date, stage_context, generated_at').eq('user_id', session.user.id).eq('prompt_date', today).in('prompt_type', ['morning', 'post_morning', 'post_evening']).order('generated_at', { ascending: false }),
                      supabase.from('personal_prompts').select('prompt_text, prompt_type, stage_context, generated_at').eq('user_id', session.user.id).gte('generated_at', todayStart).lte('generated_at', todayEnd).in('prompt_type', ['morning', 'post_morning', 'post_evening']).order('generated_at', { ascending: false }),
                    ])
                    const promptsData = (byPromptDate?.length ? byPromptDate : byGeneratedAt) ?? []
                    const hasMorningPlanToday = (tasksData?.length ?? 0) > 0
                    const hasEveningReviewToday = !!eveningReviewData
                    let displayInsight = null
                    if (promptsData.length) {
                      if (hasEveningReviewToday) {
                        displayInsight = promptsData.find((p: { prompt_type: string }) => p.prompt_type === 'post_evening') ?? null
                      }
                      if (!displayInsight && hasMorningPlanToday) {
                        displayInsight = promptsData.find((p: { prompt_type: string }) => p.prompt_type === 'post_morning') ?? null
                      }
                      if (!displayInsight) {
                        displayInsight = promptsData.find((p: { prompt_type: string }) => p.prompt_type === 'morning') ?? null
                      }
                    }
                    setPersonalPrompts(displayInsight ? [displayInsight] as any : [])
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-amber-600 dark:text-amber-300 hover:text-amber-700 dark:hover:text-amber-200 hover:bg-amber-100/70 dark:hover:bg-amber-500/10 rounded-lg transition"
                  title="Refresh insights"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>
              
              <div className="space-y-4">
                {/* Mrs. Deer Prompt */}
                {latestPrompt && (
                  <div className="bg-white dark:bg-[#0F1419] rounded-lg p-5 border-l-4 border-amber-500 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <MarkdownText className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed mb-2">
                          {latestPrompt.prompt_text}
                        </MarkdownText>
                        {latestPrompt.stage_context && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            Stage: {toNaturalStage(latestPrompt.stage_context)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        }
        
        console.log('⚠️ Dashboard: Not showing insight box - hasPrompt:', hasPrompt)
        return null
      })()}

      {fetchError && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          <strong>Data fetch issue:</strong> {fetchError}
          <p className="mt-2 text-amber-700">Check console for details. Metrics may show 0.</p>
        </div>
      )}

      {/* Quick Stats */}
      {loading ? (
        <p className="text-gray-500 text-center mb-8">Loading dashboard stats...</p>
      ) : (
        <>
          {stats.totalTasks === 0 && !fetchError && (
            <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200 text-center">
              <p className="text-gray-700 mb-2">No tasks for today yet.</p>
              <Link href="/morning">
                <button className="text-sm px-3 py-1.5 bg-[#152b50] text-white rounded-lg hover:bg-opacity-90">
                  Add Morning Plan →
                </button>
              </Link>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Target className="w-8 h-8 text-green-500" />}
            label={lang.needleMover}
            value={`${stats.needleMovers}/${stats.totalTasks}`}
            tooltip="Tasks you marked as high-impact priorities—the ones that move the needle for your business. Shown as completed/total for today."
          />
          {/* Founder Action Mix */}
          <div className="bg-white rounded-xl shadow p-6 relative">
            <div className="absolute top-4 right-4">
              <InfoTooltip text="How you're spending your time: My Zone (only you), Systemize (build process), Delegate (assign to others), Eliminate (drop it), Quick Win (knock it out fast). A healthy mix helps you focus on what matters." />
            </div>
            <h3 className="text-sm text-gray-500 mb-2">Founder Action Mix</h3>
            <div className="space-y-1">
              {Object.keys(stats.actionMixPercentages).length > 0 ? (
                Object.entries(stats.actionMixPercentages).map(([action, pct]) => (
                  <p key={action} className="text-sm text-gray-900">
                    {ACTION_PLAN_OPTIONS_2.find(opt => opt.value === action)?.emoji} {ACTION_PLAN_OPTIONS_2.find(opt => opt.value === action)?.label}: {pct}%
                  </p>
                ))
              ) : (
                <p className="text-sm text-gray-400">—</p>
              )}
            </div>
            {stats.totalTasks > 0 && <p className="text-xs text-gray-500 mt-3 italic">{stats.actionMixInsight}</p>}
          </div>

          {/* Estimated Time Saved */}
          <div className="bg-white rounded-xl shadow p-6 relative">
            <div className="absolute top-4 right-4">
              <InfoTooltip text="Rough estimate of hours you could save per month by systemizing, delegating, or eliminating tasks—based on your action plan choices today." />
            </div>
            <h3 className="text-sm text-gray-500 mb-2">Estimated Time Saved</h3>
            <p className="text-2xl font-bold mt-1 text-gray-900">{stats.estimatedTimeSaved} hours/month</p>
            {stats.estimatedTimeSaved > 0 && <p className="text-xs text-gray-500 mt-3 italic">Through systemizing, delegating, and eliminating tasks.</p>}
          </div>
          <StatCard
            icon={<TrendingUp className="w-8 h-8 text-purple-500" />}
            label="Focus Score"
            value={stats.focusScore.toString()}
            tooltip="Combined mood + energy from your Evening Review, scaled 0–100. Filled in after you complete an evening review."
          />
          <StatCard
            icon={<Flame className="w-8 h-8 text-orange-500" />}
            label="Fires Fought"
            value={stats.firesFought.toString()}
            tooltip="Number of emergencies you logged today. Helps you see how often you're in firefighter mode."
          />
        </div>
        </>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ActionButton href="/morning" label="Morning Plan" />
          <ActionButton href="/emergency" label="Log Emergency" />
          <ActionButton href="/evening" label="Evening Review" />
          <ActionButton href="/weekly" label="Weekly Insights" />
          <ActionButton href="/history" label="Journey" />
          {getFeatureAccess({ tier: userTier, pro_features_enabled: true }).videoTemplates && (
            <ActionButton href="/video-templates" label="Video Templates" />
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, tooltip }: { icon: React.ReactNode; label: string; value: string; tooltip?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-6 relative">
      {tooltip && (
        <div className="absolute top-4 right-4">
          <InfoTooltip text={tooltip} />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
        </div>
        {icon}
      </div>
    </div>
  )
}

function ActionButton({ href, label }: any) {
  return (
    <Link
      href={href}
      className="bg-[#152b50] text-white text-center py-3 px-4 rounded-lg font-medium hover:bg-opacity-90 transition"
    >
      {label}
    </Link>
  )
}
