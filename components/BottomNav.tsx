'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTutorial } from '@/lib/contexts/TutorialContext'
import type { LucideIcon } from 'lucide-react'
import { Sparkles } from 'lucide-react'
import {
  Plus,
  Sun,
  Moon,
  BarChart2,
  User,
  Calendar,
  Settings,
  Home,
  MapPin,
  MessageSquare,
  LogOut,
  AlertCircle,
  Book,
  Activity,
  LayoutGrid,
  Route,
  Lock,
} from 'lucide-react'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { useWhatsNew } from '@/lib/hooks/useWhatsNew'
import { useHasSeenMorningTour } from '@/lib/hooks/useHasSeenMorningTour'
import { supabase } from '@/lib/supabase'
import { resetAnalytics } from '@/lib/analytics'
import { colors } from '@/lib/design-tokens'
import { useProgress } from '@/lib/hooks/useProgress'
import { useFounderJourney } from '@/lib/hooks/useFounderJourney'
import { ProgressCircle } from '@/components/ProgressCircle'
import { ProAccessBadge } from '@/components/ProAccessBadge'
import { getTrialStatus } from '@/lib/auth/trial-status'
import type { ProEntitlementProfile } from '@/lib/auth/is-pro'
import { isTrialExpirySimulationEnabled } from '@/lib/trial-simulation'
import {
  WEEKLY_INSIGHT_MIN_DAYS,
  MONTHLY_INSIGHT_MIN_DAYS,
  QUARTERLY_INSIGHT_MIN_DAYS,
} from '@/lib/founder-dna/unlock-schedule-config'
import { ARCHETYPE_PREVIEW_MIN_DAYS } from '@/lib/founder-dna/archetype-timing'

const insightsItems = [
  {
    name: 'Weekly Insight',
    href: '/weekly',
    icon: Calendar,
    showProgress: true as const,
    progressKey: 'weekly' as const,
    unlockMinDays: WEEKLY_INSIGHT_MIN_DAYS,
  },
  {
    name: 'Monthly Insight',
    href: '/monthly-insight',
    icon: Calendar,
    showProgress: true as const,
    progressKey: 'monthly' as const,
    unlockMinDays: MONTHLY_INSIGHT_MIN_DAYS,
  },
  {
    name: 'Quarterly Trajectory',
    href: '/quarterly',
    icon: BarChart2,
    showProgress: true as const,
    progressKey: 'quarterly' as const,
    unlockMinDays: QUARTERLY_INSIGHT_MIN_DAYS,
  },
  { name: 'Daily History', href: '/history', icon: MapPin, showProgress: false },
]

const todayItems = [
  { name: 'Morning', href: '/morning', icon: Sun, bg: colors.coral.DEFAULT, color: '#FFFFFF' },
  { name: 'Emergency', href: '/emergency', icon: AlertCircle, bg: colors.amber.DEFAULT, color: '#FFFFFF' },
  { name: 'Evening', href: '/evening', icon: Moon, bg: colors.navy.DEFAULT, color: '#FFFFFF' },
]

type ProfileNavItem = {
  name: string
  href: string
  icon: LucideIcon
  unlockMinDays?: number
  showProgress?: boolean
}

const profileItems: ProfileNavItem[] = [
  { name: 'Profile', href: '/profile', icon: User },
  {
    name: 'Archetype',
    href: '/founder-dna/archetype',
    icon: Sparkles,
    unlockMinDays: ARCHETYPE_PREVIEW_MIN_DAYS,
    showProgress: true,
  },
  { name: 'Rhythm', href: '/founder-dna/rhythm', icon: Activity },
  { name: 'Patterns', href: '/founder-dna/patterns', icon: LayoutGrid },
  { name: 'Journey', href: '/founder-dna/journey', icon: Route },
]

const settingsItems = [
  { name: 'Help', href: '/help', icon: Book },
  // Push notifications: temporarily disabled in nav; manage via Settings page only.
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const menuItemClass = 'flex items-center gap-3 px-4 min-h-[56px] text-sm font-medium hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors mx-1 text-gray-900 dark:text-gray-100 dark:text-gray-100'
const navButtonClass = 'flex flex-col items-center gap-1 min-w-[56px] py-2 rounded-none transition-colors'

function navItemUnlocked(daysWithEntries: number, unlockMinDays?: number) {
  if (unlockMinDays == null) return true
  return daysWithEntries >= unlockMinDays
}

export function BottomNav() {
  const pathname = usePathname()
  const [emergencyHref, setEmergencyHref] = useState('/emergency')
  const { isActive: isTutorialActive, step: tutorialStep, setStep: setTutorialStep } = useTutorial()
  const { data: journey } = useFounderJourney()
  const daysWithEntries =
    journey?.milestones?.daysWithEntries ?? journey?.milestones?.daysActive ?? 0

  useEffect(() => {
    let cancelled = false
    const loadEmergencyHref = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.user?.id) {
        if (!cancelled) setEmergencyHref('/emergency')
        return
      }
      const [{ data: emData }, { data: profile }] = await Promise.all([
        supabase
          .from('emergencies')
          .select('id')
          .eq('user_id', session.user.id)
          .eq('resolved', false)
          .not('containment_plan_committed_at', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('user_profiles')
          .select(
            'tier, pro_features_enabled, subscription_tier, trial_starts_at, trial_ends_at, stripe_subscription_status, created_at'
          )
          .eq('id', session.user.id)
          .maybeSingle(),
      ])
      const p = profile as {
        tier?: string | null
        pro_features_enabled?: boolean | null
        subscription_tier?: string | null
        trial_starts_at?: string | null
        trial_ends_at?: string | null
        stripe_subscription_status?: string | null
        created_at?: string | null
      } | null
      const trialProfile: ProEntitlementProfile = {
        tier: p?.tier ?? null,
        pro_features_enabled: p?.pro_features_enabled,
        subscription_tier: p?.subscription_tier ?? null,
        trial_starts_at: p?.trial_starts_at ?? null,
        trial_ends_at: p?.trial_ends_at ?? null,
        stripe_subscription_status: p?.stripe_subscription_status ?? null,
        created_at: p?.created_at ?? null,
      }
      const expired =
        getTrialStatus(trialProfile, { simulateExpired: isTrialExpirySimulationEnabled() }).status === 'expired'
      if (!cancelled) {
        if (expired) {
          setEmergencyHref('/emergency?focus=resolution')
        } else {
          setEmergencyHref(emData?.id ? '/emergency?focus=resolution' : '/emergency')
        }
      }
    }
    void loadEmergencyHref()
    const onRefresh = () => void loadEmergencyHref()
    window.addEventListener('wof-emergency-refresh', onRefresh)
    window.addEventListener('data-sync-request', onRefresh)
    window.addEventListener('wof-trial-sim-changed', onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener('wof-emergency-refresh', onRefresh)
      window.removeEventListener('data-sync-request', onRefresh)
      window.removeEventListener('wof-trial-sim-changed', onRefresh)
    }
  }, [])
  const { weekly, monthly, quarterly } = useProgress()
  const { hasSeenMorningTour } = useHasSeenMorningTour()
  const { totalNew: newInsightsCount } = useNewInsights()
  const { hasNew: hasFounderDnaNew } = useWhatsNew()
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [todayOpen, setTodayOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const insightsRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsLoggedIn(!!session)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setIsLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const checkButton = () => {
      const todayButton = document.querySelector('[data-tutorial="today-button"]')
      const rect = todayButton?.getBoundingClientRect()

      const logData = {
        exists: todayButton !== null,
        rect: rect
          ? {
              left: Math.round(rect.left),
              top: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              bottom: Math.round(rect.bottom),
              right: Math.round(rect.right),
            }
          : null,
        pathname: typeof window !== 'undefined' ? window.location.pathname : pathname,
        timestamp: Date.now(),
      }
      console.log('[BottomNav] Today button check:', JSON.stringify(logData, null, 2))
    }

    // Check immediately and at intervals
    checkButton()
    const timers = [1000, 2000, 3000, 5000].map((delay) => setTimeout(checkButton, delay))
    return () => timers.forEach(clearTimeout)
  }, [pathname])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (insightsRef.current && !insightsRef.current.contains(target)) setInsightsOpen(false)
      if (todayRef.current && !todayRef.current.contains(target)) {
        // Keep Today menu open during tutorial step 'menu' so user can click Morning
        if (tutorialStep !== 'menu') setTodayOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) setProfileOpen(false)
      if (settingsRef.current && !settingsRef.current.contains(target)) setSettingsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tutorialStep])

  // Keep Today menu open when tutorial is on menu step
  useEffect(() => {
    if (tutorialStep === 'menu') {
      setTodayOpen(true)
    }
  }, [tutorialStep])

  if (pathname === '/' || pathname === '/login' || pathname === '/countdown' || pathname?.startsWith('/auth')) {
    return null
  }

  const isDashboardActive = pathname === '/dashboard'
  const isInsightsActive = pathname === '/weekly' || pathname === '/history' || pathname === '/monthly-insight' || pathname === '/quarterly'
  const isTodayActive = pathname === '/morning' || pathname === '/evening' || pathname === '/emergency'
  const isProfileActive =
    pathname === '/profile' || pathname === '/history' || pathname?.startsWith('/founder-dna')
  const isSettingsActive = pathname?.startsWith('/settings') || pathname === '/feedback'

  const menuOpen = insightsOpen || todayOpen || profileOpen || settingsOpen

  const handleSignOut = async () => {
    resetAnalytics()
    await supabase.auth.signOut()
    window.location.href = '/auth/login'
  }

  const closeAll = () => {
    setInsightsOpen(false)
    setTodayOpen(false)
    setProfileOpen(false)
    setSettingsOpen(false)
  }

  return (
    <>
      {menuOpen && (
        <div
          role="button"
          tabIndex={0}
          onClick={closeAll}
          onKeyDown={(e) => e.key === 'Escape' && closeAll()}
          className="bottom-nav-overlay fixed inset-0 bg-black/20 backdrop-blur-md"
          aria-hidden="true"
        />
      )}

      {/* Nav bar + menus: higher z-index when open so menus appear above overlay */}
      <nav
        className={`bottom-nav fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 ${menuOpen ? 'bottom-nav-menu-open' : ''}`}
        aria-label="Bottom navigation"
      >
        {/* Bauhaus strip first so trial/access line sits clearly below it (no text “cutting through” colors). */}
        <div className="max-w-4xl mx-auto flex h-6 w-full shrink-0">
          <div className="flex-1" style={{ backgroundColor: colors.coral.DEFAULT }}> </div>
          <div className="flex-1" style={{ backgroundColor: colors.amber.DEFAULT }}> </div>
          <div className="flex-1" style={{ backgroundColor: colors.navy.DEFAULT }}> </div>
        </div>
        {isLoggedIn ? <ProAccessBadge /> : null}
        <div className="max-w-4xl mx-auto flex items-end justify-around px-2 py-3 pt-4 pb-4">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            data-tour="dashboard"
            className={`${navButtonClass} relative ${isDashboardActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
          >
            <Home className="w-6 h-6" strokeWidth={isDashboardActive ? 2.5 : 2} />
            <span className={`text-xs font-medium ${isDashboardActive ? '' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Dashboard</span>
          </Link>

          {/* Insights */}
          <div ref={insightsRef} className="relative flex justify-center">
            <button
              type="button"
              onClick={() => { setInsightsOpen(!insightsOpen); if (!insightsOpen) { setTodayOpen(false); setProfileOpen(false); setSettingsOpen(false) } }}
              className={`${navButtonClass} ${isInsightsActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
            >
              <span className="relative inline-block">
                <BarChart2 className="w-6 h-6" strokeWidth={isInsightsActive ? 2.5 : 2} />
                {newInsightsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#ef725c] rounded-full" aria-hidden />
                )}
              </span>
              <span className={`text-xs font-medium ${isInsightsActive ? '' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Insights</span>
            </button>
            {insightsOpen && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 py-2 rounded-none shadow-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 min-w-[200px] z-[60] bg-white dark:bg-gray-800 dark:bg-gray-800"
              >
                {insightsItems.map((item) => {
                  const FeatureIcon = item.icon
                  const progress =
                    item.showProgress && item.progressKey === 'weekly'
                      ? weekly
                      : item.showProgress && item.progressKey === 'monthly'
                        ? monthly
                        : item.showProgress && item.progressKey === 'quarterly'
                          ? quarterly
                          : null
                  const insightUnlockDays =
                    'unlockMinDays' in item
                      ? (item as { unlockMinDays: number }).unlockMinDays
                      : undefined
                  const unlocked = navItemUnlocked(daysWithEntries, insightUnlockDays)
                  const RowIcon = unlocked ? FeatureIcon : Lock
                  const lockLabel =
                    !unlocked && insightUnlockDays != null
                      ? ` — unlocks at ${insightUnlockDays} days with entries`
                      : ''
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={closeAll}
                      className={menuItemClass}
                      aria-label={unlocked ? item.name : `${item.name} (locked)${lockLabel}`}
                    >
                      <RowIcon
                        className={`w-5 h-5 flex-shrink-0 ${unlocked ? '' : 'text-amber-600 dark:text-amber-500'}`}
                        aria-hidden
                      />
                      <span className="flex-1">{item.name}</span>
                      {progress && (
                        <ProgressCircle current={progress.current} required={progress.required} size="sm" showFraction />
                      )}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Today - coral FAB with + icon, always stands out */}
          <div ref={todayRef} className="relative flex justify-center">
            <button
              type="button"
              data-tutorial="today-button"
              onClick={() => {
                console.log('[BottomNav] 🔥 TODAY BUTTON CLICKED')
                if (isTutorialActive && tutorialStep === 'dashboard') {
                  setInsightsOpen(false)
                  setProfileOpen(false)
                  setSettingsOpen(false)
                  setTodayOpen(true)
                  console.log('[BottomNav] 🔥 FORCING STEP TO MENU')
                  setTutorialStep('menu')
                } else {
                  setTodayOpen(!todayOpen)
                  if (!todayOpen) {
                    setInsightsOpen(false)
                    setProfileOpen(false)
                    setSettingsOpen(false)
                  }
                }
              }}
              className={`flex flex-col items-center gap-1 min-w-[56px] -mt-6 ${pathname === '/dashboard' && !hasSeenMorningTour ? 'animate-pulse' : ''}`}
              aria-label="Today"
            >
              <div
                className={`flex items-center justify-center w-14 h-14 rounded-full shadow-lg border-2 transition-transform hover:scale-105 ${pathname === '/dashboard' && !hasSeenMorningTour ? 'ring-4 ring-[#ef725c]/40 ring-offset-2 dark:ring-offset-gray-800' : ''}`}
                style={{
                  backgroundColor: colors.coral.DEFAULT,
                  color: '#FFFFFF',
                  borderColor: colors.coral.hover,
                }}
              >
                <Plus className="w-7 h-7" strokeWidth={2.5} />
              </div>
              <span className={`text-xs font-medium ${isTodayActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Today</span>
            </button>
            {todayOpen && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 flex flex-col gap-2 z-[60] py-2"
                style={{ minWidth: 220 }}
              >
                {todayItems.map((item) => {
                  const Icon = item.icon
                  const isMorning = item.name === 'Morning'
                  const isEmergency = item.name === 'Emergency'
                  const morningHref = (() => {
                    if (!isMorning) return item.href
                    if (isTutorialActive) {
                      return `/morning?${new URLSearchParams({ tutorial: 'true' }).toString()}`
                    }
                    return '/morning'
                  })()
                  const itemHref = isMorning ? morningHref : isEmergency ? emergencyHref : item.href
                  return (
                    <Link
                      key={item.name}
                      href={itemHref}
                      onClick={() => {
                        if (isMorning && isTutorialActive) {
                          console.log('[BottomNav] 🔥 MORNING LINK CLICKED')
                        }
                        closeAll()
                      }}
                      data-tutorial={isMorning ? 'morning-menu' : undefined}
                      className="flex items-center justify-center gap-3 w-full px-5 min-h-[56px] rounded-none text-base font-medium whitespace-nowrap transition-all border-2 border-gray-200 dark:border-gray-700"
                      style={{ backgroundColor: item.bg, color: item.color }}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Profile */}
          <div ref={profileRef} className="relative flex justify-center">
            <button
              type="button"
              data-tour="profile"
              onClick={() => { setProfileOpen(!profileOpen); if (!profileOpen) { setInsightsOpen(false); setTodayOpen(false); setSettingsOpen(false) } }}
              className={`${navButtonClass} relative ${isProfileActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
            >
              <span className="relative inline-block">
                <User className="w-6 h-6" strokeWidth={isProfileActive ? 2.5 : 2} />
                {isLoggedIn && hasFounderDnaNew ? (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ef725c] rounded-full ring-2 ring-white dark:ring-gray-800"
                    aria-hidden
                  />
                ) : null}
              </span>
              <span className={`text-xs font-medium ${isProfileActive ? '' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Profile</span>
            </button>
            {profileOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 py-2 rounded-none shadow-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 min-w-[220px] max-h-[min(70vh,420px)] overflow-y-auto z-[60] bg-white dark:bg-gray-800 dark:bg-gray-800"
              >
                {profileItems.map((item, index) => {
                  const FeatureIcon = item.icon
                  const unlockMinDays = item.unlockMinDays
                  const unlocked = navItemUnlocked(daysWithEntries, unlockMinDays)
                  const RowIcon = unlocked ? FeatureIcon : Lock
                  const lockLabel =
                    !unlocked && unlockMinDays != null
                      ? ` — unlocks at ${unlockMinDays} days with entries`
                      : ''
                  const showArchetypeProgress = item.showProgress && unlockMinDays != null
                  return (
                    <div key={item.href}>
                      {index === 1 ? (
                        <div className="px-4 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600 mt-1">
                          Founder DNA
                        </div>
                      ) : null}
                      <Link
                        href={item.href}
                        onClick={closeAll}
                        className={menuItemClass}
                        aria-label={unlocked ? item.name : `${item.name} (locked)${lockLabel}`}
                      >
                        <RowIcon
                          className={`w-5 h-5 flex-shrink-0 ${unlocked ? '' : 'text-amber-600 dark:text-amber-500'}`}
                          aria-hidden
                        />
                        <span className="flex-1">{item.name}</span>
                        {showArchetypeProgress ? (
                          <ProgressCircle
                            current={daysWithEntries}
                            required={unlockMinDays}
                            size="sm"
                            showFraction
                          />
                        ) : null}
                      </Link>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative flex justify-center">
            <button
              type="button"
              onClick={() => { setSettingsOpen(!settingsOpen); if (!settingsOpen) { setInsightsOpen(false); setTodayOpen(false); setProfileOpen(false) } }}
              className={`${navButtonClass} ${isSettingsActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
            >
              <Settings className="w-6 h-6" strokeWidth={isSettingsActive ? 2.5 : 2} />
              <span className={`text-xs font-medium ${isSettingsActive ? '' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Settings</span>
            </button>
            {settingsOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 py-2 rounded-none shadow-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 min-w-[200px] z-[60] bg-white dark:bg-gray-800 dark:bg-gray-800"
              >
                {settingsItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.name} href={item.href} onClick={closeAll} className={menuItemClass}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
                {isLoggedIn && (
                  <button
                    onClick={() => { handleSignOut(); closeAll() }}
                    className={`${menuItemClass} w-full text-left !text-[#ef725c]`}
                  >
                    <LogOut className="w-5 h-5 flex-shrink-0" />
                    Logout
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  )
}
