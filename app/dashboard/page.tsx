'use client'

// Production Fix - Resolved Checklist Invisibility & SQL Syntax Errors - 2026-04-09 22:59 HKT
// UI Feature - Active Emergency Checklist on Dashboard - 2026-04-09 20:24 HKT

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getUserSession } from '@/lib/auth'
import { CheckCircle, X, Moon } from 'lucide-react'
import { useDataSync } from '@/lib/hooks/useDataSync'
import { LoadingWithMicroLesson } from '@/components/LoadingWithMicroLesson'
import { ProfileReminderBanner } from '@/components/ProfileReminderBanner'
import {
  DashboardHeader,
  TodaysIntention,
  MrsDeerInsight,
  DynamicCTACard,
  ComingUpNext,
  WhatsNewToday,
  ArchetypeTeaser,
  JourneyProgress,
  TaskWidget,
  SocialProofFooter,
  EmergencySafetySeal,
  ActiveEmergencyChecklistDashboard,
  TrialExpiryBanner,
  TrialWeekWrapupCard,
  isTrialWrapupDismissed,
} from '@/components/dashboard'
import { OnboardingDiscoveryCard } from '@/components/dashboard/OnboardingDiscoveryCard'
import { TourPopUp } from '@/components/TourPopUp'
import { IndependentTour } from '@/components/IndependentTour'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { viewProPlansCtaClassName } from '@/lib/ui/view-pro-plans-cta'
import { supabase } from '@/lib/supabase'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { isTourEnabled } from '@/lib/feature-flags'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { getEffectivePlanDate, getPlanDateString } from '@/lib/effective-plan-date'
import { getUserTimezoneFromProfile } from '@/lib/timezone'
import { getTrialStatus, isFirstDayExpired, type TrialStatusResult } from '@/lib/auth/trial-status'
import type { ProEntitlementProfile } from '@/lib/auth/is-pro'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'
import { subDays } from 'date-fns'
import { fetchTrialWrapupStats } from '@/lib/trial-wrapup-stats'
import type { TrialWrapupStats } from '@/lib/trial-wrapup-stats'
import {
  ingestPendingDecisionParserIfNeeded,
  WOF_PENDING_DECISION_PARSER_KEY,
} from '@/lib/pending-decision-parser-ingest'
import { isDevProfileMasterSwitchEmail } from '@/lib/dev-profile-master-switch-emails'

function DashboardContent() {
  const { syncData } = useDataSync()
  useComprehensiveTour()
  const { data: journeyData } = useFounderJourney()
  const [resolutionCommandCenter, setResolutionCommandCenter] = useState(false)
  const onResolutionCommandCenterChange = useCallback((active: boolean) => {
    setResolutionCommandCenter(active)
  }, [])
  const [showRestRecover, setShowRestRecover] = useState(false)
  const [emergencyStripRefresh, setEmergencyStripRefresh] = useState(0)
  const bumpEmergencyStrip = useCallback(() => setEmergencyStripRefresh((k) => k + 1), [])
  const [loading, setLoading] = useState(true)
  const [userTier, setUserTier] = useState<string>('beta')
  const [showWelcome, setShowWelcome] = useState(false)
  const [showEveningReminder, setShowEveningReminder] = useState(false)
  const [loginCount, setLoginCount] = useState(0)
  /** Founder-day date in user profile timezone (matches morning page + /api/tasks/today). */
  const [eveningPlanDate, setEveningPlanDate] = useState<string | null>(null)
  const [trialExpired, setTrialExpired] = useState(false)
  const [trialUxSnapshot, setTrialUxSnapshot] = useState<TrialStatusResult | null>(null)
  const [showDevAdminLinks, setShowDevAdminLinks] = useState(false)
  const [showTrialWrapup, setShowTrialWrapup] = useState(false)
  const [wrapupStats, setWrapupStats] = useState<TrialWrapupStats | null>(null)
  const [trialEndsForWrapup, setTrialEndsForWrapup] = useState<string | null>(null)
  const [dashboardUserId, setDashboardUserId] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const paywallCtaRef = useRef<HTMLAnchorElement>(null)

  const scrollToPaywallUpgrade = useCallback(() => {
    paywallCtaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  const intelligenceLocked = Boolean(trialUxSnapshot && !trialUxSnapshot.isPro)
  const showFreemiumPaywallCard = intelligenceLocked

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

  const checkAuth = useCallback(async () => {
    const session = await getUserSession()
    if (!session) {
      router.push('/auth/login?returnTo=/dashboard')
      return
    }
    setUserTier(session.user.tier || 'beta')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase DB types omit profile columns
    const { data: profileData } = await (supabase.from('user_profiles') as any)
      .select(
        'onboarding_step, onboarding_completed_at, timezone, login_count, trial_starts_at, trial_ends_at, stripe_subscription_status, tier, pro_features_enabled, subscription_tier, created_at, subscription_override, is_beta_retired, is_beta'
      )
      .eq('id', session.user.id)
      .maybeSingle()

    const profileRow = profileData as {
      onboarding_step?: number
      onboarding_completed_at?: string
      timezone?: string | null
      login_count?: number | null
      trial_starts_at?: string | null
      trial_ends_at?: string | null
      stripe_subscription_status?: string | null
      tier?: string | null
      pro_features_enabled?: boolean | null
      subscription_tier?: string | null
      created_at?: string | null
      subscription_override?: string | null
      is_beta_retired?: boolean | null
      is_beta?: boolean | null
    } | null

    const trialProfile: ProEntitlementProfile = {
      tier: profileRow?.tier ?? session.user.tier ?? null,
      pro_features_enabled: profileRow?.pro_features_enabled ?? session.user.pro_features_enabled,
      subscription_tier: profileRow?.subscription_tier ?? null,
      trial_starts_at: profileRow?.trial_starts_at ?? null,
      trial_ends_at: profileRow?.trial_ends_at ?? null,
      stripe_subscription_status: profileRow?.stripe_subscription_status ?? null,
      created_at: profileRow?.created_at ?? null,
      subscription_override: profileRow?.subscription_override ?? null,
      is_beta_retired: profileRow?.is_beta_retired ?? null,
      is_beta: profileRow?.is_beta ?? null,
    }
    const simExpired = isTrialExpirySimulationEnabled()
    const trialUx = getTrialStatus(trialProfile, { simulateExpired: simExpired })
    setTrialExpired(trialUx.status === 'expired')
    setTrialUxSnapshot(trialUx)
    setShowDevAdminLinks(isDevProfileMasterSwitchEmail(session.user.email ?? null))
    setDashboardUserId(session.user.id)

    const trialEndsKey =
      profileRow?.trial_ends_at != null && profileRow.trial_ends_at !== ''
        ? profileRow.trial_ends_at
        : simExpired
          ? 'simulated'
          : null
    const wrapupEligible =
      profileRow?.is_beta_retired === true &&
      trialUx.status === 'expired' &&
      isFirstDayExpired(trialProfile, { simulateExpired: simExpired }) &&
      Boolean(trialEndsKey) &&
      !isTrialWrapupDismissed(session.user.id, trialEndsKey)

    setShowTrialWrapup(false)
    setWrapupStats(null)
    setTrialEndsForWrapup(null)

    if (wrapupEligible && trialEndsKey) {
      try {
        let stats: TrialWrapupStats
        if (simExpired) {
          const fakeProfile: ProEntitlementProfile = {
            ...trialProfile,
            trial_ends_at: new Date().toISOString(),
            trial_starts_at: subDays(new Date(), 7).toISOString(),
          }
          stats = await fetchTrialWrapupStats(session.user.id, supabase, fakeProfile)
        } else {
          const res = await fetch('/api/user/trial-wrapup-summary', { credentials: 'include' })
          if (res.ok) {
            stats = (await res.json()) as TrialWrapupStats
          } else {
            stats = await fetchTrialWrapupStats(session.user.id, supabase, trialProfile)
          }
        }
        setWrapupStats(stats)
        setTrialEndsForWrapup(trialEndsKey)
        setShowTrialWrapup(true)
      } catch {
        setShowTrialWrapup(false)
      }
    }
    const onboardingStep = profileRow?.onboarding_step
    const onboardingCompleted = Boolean(profileRow?.onboarding_completed_at)
    const hasSkipPass =
      typeof document !== 'undefined' &&
      document.cookie.split('; ').some((cookie) => cookie === 'skip_initial_onboarding=true')
    if (hasSkipPass) {
      router.replace('/today?context=decision')
      return
    }
    setLoginCount(Math.max(0, Number(profileRow?.login_count ?? 0) || 0))
    const planDate = getPlanDateString(getUserTimezoneFromProfile(profileRow))
    setEveningPlanDate(planDate)

    // Fallback: ingest guest Decision Parser capture if they reach dashboard with pending storage.
    try {
      if (typeof window !== 'undefined' && localStorage.getItem(WOF_PENDING_DECISION_PARSER_KEY)) {
        let shortDecision = 'your decision'
        try {
          const pending = JSON.parse(
            localStorage.getItem(WOF_PENDING_DECISION_PARSER_KEY) || '{}'
          ) as { decision?: string }
          const t = typeof pending.decision === 'string' ? pending.decision.trim() : ''
          if (t) shortDecision = t.length > 80 ? `${t.slice(0, 77)}...` : t
        } catch {
          // use default shortDecision
        }
        const outcome = await ingestPendingDecisionParserIfNeeded(supabase, session.user.id, planDate)
        if (outcome === 'inserted') {
          window.dispatchEvent(
            new CustomEvent('toast', {
              detail: {
                message: `I've added your decision about "${shortDecision}" to your log. Let's review this experiment soon.`,
                type: 'success',
              },
            })
          )
        }
      }
    } catch (pendingError) {
      console.warn('[Dashboard] Pending decision ingestion skipped:', pendingError)
    }

    const [reviewRes, morningRes] = await Promise.all([
      supabase
        .from('evening_reviews')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('review_date', planDate)
        .maybeSingle(),
      supabase.from('morning_tasks').select('id').eq('user_id', session.user.id).limit(1),
    ])
    const hasEveningToday = !!reviewRes.data
    const hasMorningTasks = (morningRes.data?.length ?? 0) > 0

    setShowEveningReminder(onboardingStep === 2 && !hasEveningToday)

    if (onboardingCompleted && !hasMorningTasks && !window.location.search.includes('first=true')) {
      const { isNewOnboardingEnabled } = await import('@/lib/feature-flags')
      const path = isNewOnboardingEnabled() ? '/morning?first=true&resume=true' : '/morning'
      console.log('[Dashboard] No morning tasks found, redirecting to', path)
      router.replace(path)
      return
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    const onSim = () => void checkAuth()
    window.addEventListener('wof-trial-sim-changed', onSim)
    return () => window.removeEventListener('wof-trial-sim-changed', onSim)
  }, [checkAuth])

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
      <div className="max-w-7xl mx-auto px-4 pb-12 pt-8 md:pb-10 md:pt-6 lg:pb-8 lg:pt-4 md:px-5">
      {showWelcome && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
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
        <Link href={`/evening?date=${eveningPlanDate ?? getEffectivePlanDate()}#evening-form`} className="block mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <Moon className="w-4 h-4 flex-shrink-0" />
              Don&apos;t forget to reflect this evening! 🌙
            </p>
          </div>
        </Link>
      )}
      {loading ? (
        <div className="max-w-3xl mx-auto px-4 md:px-5 py-8">
          <LoadingWithMicroLesson
            message="Loading your day..."
            onRetry={() => window.location.reload()}
            timeoutMs={8000}
            location="dashboard"
          />
        </div>
      ) : (
        <>
          <ProfileReminderBanner />

          <EmergencySafetySeal
            onActiveResolutionChange={onResolutionCommandCenterChange}
            showRestRecover={showRestRecover}
            setShowRestRecover={setShowRestRecover}
            refreshKey={emergencyStripRefresh}
          />

          <TourPopUp />

          {isTourEnabled() && <IndependentTour />}
          <div className="space-y-4 lg:space-y-3">
            <div className="space-y-3">
              <DashboardHeader
                tierLabel={userTier === 'beta' ? 'Beta' : userTier}
                showDevAdminLinks={showDevAdminLinks}
              />
              <ActiveEmergencyChecklistDashboard
                setShowRestRecover={setShowRestRecover}
                refreshKey={emergencyStripRefresh}
                onResolutionSettled={bumpEmergencyStrip}
              />
              {showTrialWrapup && wrapupStats && trialEndsForWrapup && dashboardUserId ? (
                <TrialWeekWrapupCard
                  stats={wrapupStats}
                  userId={dashboardUserId}
                  trialEndsAt={trialEndsForWrapup}
                  onDismiss={() => setShowTrialWrapup(false)}
                />
              ) : (
                <TrialExpiryBanner
                  visible={Boolean(trialUxSnapshot && !trialUxSnapshot.isPro && trialExpired)}
                />
              )}
              {/** Mobile: CTA under greeting. Desktop: CTA beside intention + insight so it stays above the fold. */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-6">
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="lg:hidden">
                    <Suspense
                      fallback={
                        <div
                          className="min-h-[170px] border-2 border-gray-200 dark:border-gray-600 bg-[#ecf9ef] dark:bg-[#d8efff] animate-pulse"
                          aria-hidden
                        />
                      }
                    >
                      <DynamicCTACard />
                    </Suspense>
                  </div>
                  <TodaysIntention />
                  <Suspense fallback={null}>
                    <OnboardingDiscoveryCard />
                  </Suspense>
                  <MrsDeerInsight />
                </div>
                <div className="hidden w-full max-w-md shrink-0 lg:block">
                  <Suspense
                    fallback={
                      <div
                        className="min-h-[200px] border-2 border-gray-200 dark:border-gray-600 bg-[#ecf9ef] dark:bg-[#d8efff] animate-pulse"
                        aria-hidden
                      />
                    }
                  >
                    <DynamicCTACard />
                  </Suspense>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <JourneyProgress />
              <ComingUpNext items={journeyData?.nextUnlocks} />
            </div>

            {resolutionCommandCenter ? (
              <div
                className="border-t border-dashed border-amber-300/90 pt-6 dark:border-amber-800/70"
                aria-hidden
              />
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TaskWidget />
              <WhatsNewToday intelligenceLocked={intelligenceLocked} />
            </div>

            <ArchetypeTeaser
              intelligenceLocked={intelligenceLocked}
              onScrollToPaywall={scrollToPaywallUpgrade}
            />
          </div>

          <SocialProofFooter loginCount={loginCount} />

          {showFreemiumPaywallCard && (
            <div
              id="dashboard-paywall-card"
              className="relative mt-8 rounded-xl border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 p-6 shadow-lg dark:border-purple-500/60 dark:from-[#1A202C] dark:to-[#1A202C]"
            >
              <div className="mb-4 flex items-center gap-3">
                <Sparkles className="h-8 w-8 shrink-0 text-purple-600" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 dark:text-white">
                  Unlock AI Coaching Moments
                </h2>
              </div>
              <p className="mb-4 text-gray-700 dark:text-gray-300">
                Pro+ includes personalized coaching with Mrs. Deer, your AI companion&apos;s Gentle Architect
                framework:
              </p>
              <div className="max-md:sticky max-md:bottom-0 z-20 max-md:-mx-2 max-md:rounded-t-xl max-md:border-t max-md:border-purple-200/80 max-md:bg-gradient-to-t max-md:from-purple-50 max-md:via-purple-50/98 max-md:to-purple-50/80 max-md:px-2 max-md:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-md:pt-4 dark:max-md:border-purple-800/50 dark:max-md:from-[#1A202C] dark:max-md:via-[#1A202C]/98 dark:max-md:to-[#1A202C]/85">
                <Link
                  ref={paywallCtaRef}
                  id="dashboard-pro-upgrade-cta"
                  href="/pricing"
                  className="block w-full"
                >
                  <button
                    type="button"
                    className={`w-full ${viewProPlansCtaClassName} px-6 py-3 text-center text-base font-semibold`}
                  >
                    Upgrade to Pro+ ($39/month)
                  </button>
                </Link>
              </div>
              <ul className="mb-2 mt-5 list-none space-y-2 text-gray-700 dark:text-gray-300">
                {[
                  'Daily morning reflection (Gentle Architect)',
                  'Plan analysis after each morning',
                  'Evening reflection insights',
                  'Weekly pattern summaries',
                  'Monthly growth reviews',
                ].map((label) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={scrollToPaywallUpgrade}
                      className="w-full rounded-lg py-1.5 pl-6 text-left text-sm underline-offset-2 transition hover:bg-purple-100/60 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 dark:hover:bg-purple-950/40 dark:focus-visible:ring-offset-gray-900"
                    >
                      <span className="-ml-4 mr-2 select-none text-purple-600 dark:text-purple-400" aria-hidden>
                        •
                      </span>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
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
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-8"><LoadingWithMicroLesson message="Loading..." onRetry={() => window.location.reload()} timeoutMs={5000} location="dashboard" /></div>}>
      <DashboardContent />
    </Suspense>
  )
}
