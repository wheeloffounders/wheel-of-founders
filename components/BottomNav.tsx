'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTutorial } from '@/lib/contexts/TutorialContext'
import { Plus, Sun, Moon, BarChart2, User, Calendar, Settings, Home, MapPin, Bell, MessageSquare, LogOut, AlertCircle, Book } from 'lucide-react'
import { useNewInsights } from '@/lib/hooks/useNewInsights'
import { useHasSeenMorningTour } from '@/lib/hooks/useHasSeenMorningTour'
import { supabase } from '@/lib/supabase'
import { resetAnalytics } from '@/lib/analytics'
import { colors } from '@/lib/design-tokens'
import { useProgress } from '@/lib/hooks/useProgress'
import { ProgressCircle } from '@/components/ProgressCircle'

const insightsItems = [
  { name: 'Weekly Insight', href: '/weekly', icon: Calendar, showProgress: false },
  { name: 'Monthly Insight', href: '/monthly-insight', icon: Calendar, showProgress: true as const, progressKey: 'monthly' as const },
  { name: 'Quarterly Trajectory', href: '/quarterly', icon: BarChart2, showProgress: true as const, progressKey: 'quarterly' as const },
  { name: 'Daily History', href: '/history', icon: MapPin, showProgress: false },
]

const todayItems = [
  { name: 'Morning', href: '/morning', icon: Sun, bg: colors.coral.DEFAULT, color: '#FFFFFF' },
  { name: 'Emergency', href: '/emergency', icon: AlertCircle, bg: colors.amber.DEFAULT, color: '#FFFFFF' },
  { name: 'Evening', href: '/evening', icon: Moon, bg: colors.navy.DEFAULT, color: '#FFFFFF' },
]

const profileItems = [
  { name: 'Profile', href: '/profile', icon: User },
]

const settingsItems = [
  { name: 'Help', href: '/help', icon: Book },
  // Push notifications: temporarily disabled in nav; manage via Settings page only.
  { name: 'Feedback', href: '/feedback', icon: MessageSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const menuItemClass = 'flex items-center gap-3 px-4 min-h-[56px] text-sm font-medium hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-700 transition-colors mx-1 text-gray-900 dark:text-gray-100 dark:text-gray-100'
const navButtonClass = 'flex flex-col items-center gap-1 min-w-[56px] py-2 rounded-none transition-colors'

export function BottomNav() {
  const pathname = usePathname()
  const { isActive: isTutorialActive, step: tutorialStep, setStep: setTutorialStep } = useTutorial()
  const { monthly, quarterly } = useProgress()
  const { hasSeenMorningTour } = useHasSeenMorningTour()
  const { totalNew: newInsightsCount } = useNewInsights()
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
  const isProfileActive = pathname === '/profile' || pathname === '/history'
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
        {/* Bauhaus: 3 flat color rectangles - 24px height, 2px line */}
        <div className="max-w-4xl mx-auto flex h-6 w-full">
          <div className="flex-1" style={{ backgroundColor: colors.coral.DEFAULT }}> </div>
          <div className="flex-1" style={{ backgroundColor: colors.amber.DEFAULT }}> </div>
          <div className="flex-1" style={{ backgroundColor: colors.navy.DEFAULT }}> </div>
        </div>
        <div className="max-w-4xl mx-auto flex items-end justify-around px-2 py-3 pt-4 pb-4">
          {/* Dashboard */}
          <Link
            href="/dashboard"
            data-tour="dashboard"
            className={`${navButtonClass} ${isDashboardActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
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
                  const Icon = item.icon
                  const progress = item.showProgress && item.progressKey === 'monthly' ? monthly : item.showProgress && item.progressKey === 'quarterly' ? quarterly : null
                  return (
                    <Link key={item.name} href={item.href} onClick={closeAll} className={menuItemClass}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
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
                  return (
                    <Link
                      key={item.name}
                      href={isMorning && isTutorialActive ? '/morning?tutorial=true' : item.href}
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
              className={`${navButtonClass} ${isProfileActive ? 'text-[#ef725c] dark:text-[#f0886c]' : 'text-gray-700 dark:text-gray-300 dark:text-gray-300'}`}
            >
              <User className="w-6 h-6" strokeWidth={isProfileActive ? 2.5 : 2} />
              <span className={`text-xs font-medium ${isProfileActive ? '' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400'}`}>Profile</span>
            </button>
            {profileOpen && (
              <div
                className="absolute bottom-full right-0 mb-2 py-2 rounded-none shadow-lg border-2 border-gray-200 dark:border-gray-700 dark:border-gray-700 min-w-[180px] z-[60] bg-white dark:bg-gray-800 dark:bg-gray-800"
              >
                {profileItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link key={item.name} href={item.href} onClick={closeAll} className={menuItemClass}>
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      {item.name}
                    </Link>
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
