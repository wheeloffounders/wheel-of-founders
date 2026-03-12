'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { CheckCircle, X, Moon } from 'lucide-react'
import { spacing } from '@/lib/design-tokens'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { LastUpdated } from '@/components/LastUpdated'
import { LoadingWithRetry } from '@/components/LoadingWithRetry'
import { DashboardProgress } from '@/components/DashboardProgress'
import { ProfileReminderBanner } from '@/components/ProfileReminderBanner'
import { showRefreshButton } from '@/lib/env'
import {
  Greeting,
  TodaysIntention,
  MrsDeerInsight,
  StatsGrid,
  JourneyProgress,
  QuickLinks,
} from '@/components/dashboard'
import { MicroLesson } from '@/components/MicroLesson'
import { TutorialCard } from '@/components/TutorialCard'
import { PatternBuilding } from '@/components/dashboard/PatternBuilding'
import { UnseenWins } from '@/components/dashboard/UnseenWins'
import TaskWidget from '@/components/dashboard/TaskWidget'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'

function DashboardContent() {
  const { syncData, isSyncing, lastSynced } = useDataSync()
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showEveningReminder, setShowEveningReminder] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams?.get('tutorial') === 'start') {
      console.log('[Dashboard] Tutorial mode activated')
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams?.get('welcome') === 'true') {
      setShowWelcome(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    if (searchParams?.get('showEveningReminder') === 'true') {
      setShowEveningReminder(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/auth/login?returnTo=/dashboard')
        return
      }
      setUserTier(session.user.tier || 'beta')

      // Gentle evening reminder: onboarding_step 2 = morning done, evening optional
      const today = format(new Date(), 'yyyy-MM-dd')
      const [profileRes, reviewRes, morningRes] = await Promise.all([
        (supabase.from('user_profiles') as any)
          .select('onboarding_step, onboarding_completed_at')
          .eq('id', session.user.id)
          .maybeSingle(),
        supabase
          .from('evening_reviews')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('review_date', today)
          .maybeSingle(),
        supabase
          .from('morning_tasks')
          .select('id')
          .eq('user_id', session.user.id)
          .limit(1),
      ])
      const onboardingStep = (profileRes.data as { onboarding_step?: number })?.onboarding_step
      const onboardingCompleted = (profileRes.data as { onboarding_completed_at?: string })?.onboarding_completed_at
      const hasEveningToday = !!reviewRes.data
      const hasMorningTasks = (morningRes.data?.length ?? 0) > 0

      setShowEveningReminder(onboardingStep === 2 && !hasEveningToday)

      // Fallback: Stage 2 user landed on dashboard (e.g. email/password login bypasses auth callback)
      if (onboardingCompleted && !hasMorningTasks && !window.location.search.includes('first=true')) {
        const { isNewOnboardingEnabled } = await import('@/lib/feature-flags')
        const path = isNewOnboardingEnabled() ? '/morning?first=true&resume=true' : '/morning'
        console.log('[Dashboard] No morning tasks found, redirecting to', path)
        router.replace(path)
        return
      }

      setLoading(false)
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    const handleSyncRequest = () => syncData(true)
    window.addEventListener('data-sync-request', handleSyncRequest)
    return () => window.removeEventListener('data-sync-request', handleSyncRequest)
  }, [syncData])

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
    <div className="w-full">
      <div className="w-full px-4 md:px-5" data-tour="dashboard-micro-lesson">
        <MicroLesson location="dashboard" />
      </div>
      <div className="max-w-7xl mx-auto px-4 md:px-5 py-8" style={{ paddingTop: spacing['2xl'], paddingBottom: spacing['2xl'] }}>
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Welcome to Wheel of Founders! 🎉</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                You&apos;ve planned your first morning. You have full app access—come back this evening to reflect on your day.
              </p>
              <button
                type="button"
                onClick={() => setShowWelcome(false)}
                className="px-6 py-3 bg-[#ef725c] text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                Start Your Journey
              </button>
            </div>
          </div>
        </div>
      )}
      {showEveningReminder && (
        <Link href="/evening" className="block mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Moon className="w-4 h-4 flex-shrink-0" />
              Don&apos;t forget to reflect this evening! 🌙
            </p>
          </div>
        </Link>
      )}
      <LastUpdated timestamp={lastSynced} isSyncing={isSyncing} onRefresh={showRefreshButton ? () => syncData(true) : undefined} />

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
          <LoadingWithRetry message="Loading your day..." onRetry={() => window.location.reload()} timeoutMs={8000} />
        </div>
      ) : (
        <>
          <ProfileReminderBanner />

          <TutorialCard />
          <div className="space-y-8">
            {/* Greeting / Good evening */}
            <div className="flex items-center gap-2" data-tour="dashboard-greeting">
              <Greeting />
              {userTier === 'beta' && <Badge variant="amber">Beta</Badge>}
            </div>

            {/* Today's intention */}
            <TodaysIntention />

            {/* Mrs. Deer insight */}
            <MrsDeerInsight />

            {/* Tasks + weekly stats grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-stretch">
              <div className="lg:col-span-2 h-full">
                <TaskWidget />
              </div>
              <div className="lg:col-span-2 h-full flex">
                <StatsGrid />
              </div>
            </div>

            {/* Your Story So Far (Unseen Wins) */}
            <UnseenWins />

            {/* Patterns and lifetime unlock progress */}
            <PatternBuilding />

            <DashboardProgress />

            <JourneyProgress />

            {/* Quick links */}
            <div data-tour="dashboard-quick-links">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                Quick Links
              </h3>
              <QuickLinks />
            </div>

            {/* Dev only: Admin dashboard link */}
            {showRefreshButton && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 hover:underline"
                >
                  ⚙️ Admin Dashboard
                </Link>
              </div>
            )}
          </div>

          {userTier === 'free' && (
            <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 border-2 border-purple-300 dark:border-purple-500/60">
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
        </>
      )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><LoadingWithRetry message="Loading..." onRetry={() => window.location.reload()} timeoutMs={5000} /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
