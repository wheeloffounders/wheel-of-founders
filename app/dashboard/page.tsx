'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { CheckCircle, X } from 'lucide-react'
import { OnboardingWizard } from '@/components/OnboardingWizard'
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
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

function DashboardContent() {
  const { syncData, isSyncing, lastSynced } = useDataSync()
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [showWelcome, setShowWelcome] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    if (searchParams?.get('welcome') === 'true') {
      setShowWelcome(true)
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [searchParams])

  useEffect(() => {
    const checkAuth = async () => {
      const session = await getUserSession()
      if (!session) {
        router.push('/login?returnTo=/dashboard')
        return
      }
      setUserTier(session.user.tier || 'beta')
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
                You&apos;ve completed your first day. Your founder journey has begun.
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
      <OnboardingWizard />
      <LastUpdated timestamp={lastSynced} isSyncing={isSyncing} onRefresh={showRefreshButton ? () => syncData(true) : undefined} />

      {loading ? (
        <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
          <LoadingWithRetry message="Loading your day..." onRetry={() => window.location.reload()} timeoutMs={8000} />
        </div>
      ) : (
        <>
          <ProfileReminderBanner />

          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Greeting />
              {userTier === 'beta' && <Badge variant="amber">Beta</Badge>}
            </div>

            <TodaysIntention />

            <MrsDeerInsight />

            <StatsGrid />

            <JourneyProgress />

            <DashboardProgress />

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Quick Links</h3>
              <QuickLinks />
            </div>
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
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><LoadingWithRetry message="Loading..." onRetry={() => window.location.reload()} timeoutMs={5000} /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
