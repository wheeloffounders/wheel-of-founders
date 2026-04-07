'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { isTourEnabled } from '@/lib/feature-flags'

export type TutorialStep =
  | 'dashboard' // Point to Today button
  | 'menu' // Point to Morning in menu
  | 'morning_brain_dump' // Brain dump first (streamlined onboarding; mood/energy deferred)
  | 'morning_intention' // Daily pivot / decision (North Star)
  | 'power_list' // Tactical three tasks
  | 'save_button' // Save button
  | 'insight_area' // Insight area after save
  | 'post_morning' // Completion modal
  | 'complete' // Tutorial done, full access

interface TutorialContextType {
  step: TutorialStep
  setStep: (step: TutorialStep) => void
  nextStep: () => void
  previousStep: () => void
  isActive: boolean
  completeTutorial: () => Promise<void>
  canProceed: boolean
  setCanProceed: (can: boolean) => void
}

const TutorialContext = createContext<TutorialContextType | null>(null)

const STEPS: TutorialStep[] = [
  'dashboard',
  'menu',
  'morning_brain_dump',
  'morning_intention',
  'power_list',
  'save_button',
  'insight_area',
  'post_morning',
  'complete',
]

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [step, _setStep] = useState<TutorialStep>('dashboard')
  const setStep = (newStep: TutorialStep) => {
    console.log('[TutorialContext] Setting step:', {
      from: step,
      to: newStep,
      pathname: typeof window !== 'undefined' ? window.location.pathname : pathname,
      tutorialParam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tutorial') : searchParams?.get('tutorial'),
    })
    _setStep(newStep)
  }
  const [canProceed, setCanProceed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [initialized, setInitialized] = useState(false)

  const tutorialParam = searchParams?.get('tutorial') === 'true' || searchParams?.get('tutorial') === 'start'

  useEffect(() => {
    console.log('[TutorialContext] Initialized with:', {
      initialStep: step,
      pathname: typeof window !== 'undefined' ? window.location.pathname : pathname,
      tutorialParam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tutorial') : searchParams?.get('tutorial'),
    })
  }, [])

  useEffect(() => {
    const init = async () => {
      // Tutorial disabled in production — Joyride and old 5-step tutorial dev-only
      if (!isTourEnabled()) {
        setIsActive(false)
        setInitialized(true)
        return
      }

      // Don't activate tutorial on auth pages
      if (pathname?.startsWith('/auth')) {
        setIsActive(false)
        setInitialized(true)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      if (!user?.id) {
        setInitialized(true)
        return
      }

      const { data: profile } = await (supabase.from('user_profiles') as any)
        .select('onboarding_completed_at, onboarding_step')
        .eq('id', user.id)
        .maybeSingle()

      const completed = !!profile?.onboarding_completed_at
      const needsTutorial = !completed || tutorialParam

      if (needsTutorial && !completed) {
        setIsActive(true)
        // Sync step from path
        if (pathname === '/dashboard') setStep('dashboard')
        else if (pathname === '/morning') setStep('morning_brain_dump')
      } else {
        setIsActive(false)
      }
      setInitialized(true)
    }
    init()
  }, [pathname, tutorialParam])

  // Sync step when navigating - handle morning FIRST to prevent flashback to dashboard
  useEffect(() => {
    if (!initialized || !isActive) return

    // Handle morning page FIRST - prevents Bug M (flashback to dashboard)
    if (pathname === '/morning' && tutorialParam) {
      const morningSteps = STEPS.slice(STEPS.indexOf('morning_brain_dump'))
      if (!morningSteps.includes(step)) {
        setStep('morning_brain_dump')
      }
      return
    }

    // Then handle dashboard - only when actually on dashboard
    if (pathname === '/dashboard' && step !== 'complete') {
      if (step !== 'menu') {
        setStep('dashboard')
      }
    }
  }, [pathname, initialized, isActive, tutorialParam, step])

  const nextStep = () => {
    const idx = STEPS.indexOf(step)
    const next = idx < STEPS.length - 1 ? STEPS[idx + 1] : null
    if (process.env.NODE_ENV === 'development') {
      console.log('[TutorialContext] Advancing from:', step, 'to:', next)
    }
    if (idx < STEPS.length - 1 && next) {
      setStep(next)
      setCanProceed(false)
      // When advancing from post_morning (completion modal) to complete, persist completion
      if (step === 'post_morning' && next === 'complete') {
        completeTutorial()
      }
    }
  }

  const previousStep = () => {
    const idx = STEPS.indexOf(step)
    if (idx > 0) {
      setStep(STEPS[idx - 1])
      setCanProceed(false)
    }
  }

  const completeTutorial = async () => {
    if (!userId) return

    trackJourneyStep('completed_tutorial', { via: 'morning_save' })
    await (supabase.from('user_profiles') as any)
      .update({
        onboarding_step: 2, // Morning done; evening is optional, not forced
        onboarding_completed_at: new Date().toISOString(),
        has_seen_morning_tour: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    setStep('complete')
    setIsActive(false)
    router.replace('/dashboard?welcome=true')
  }

  const value: TutorialContextType = {
    step,
    setStep,
    nextStep,
    previousStep,
    isActive: isActive && step !== 'complete',
    completeTutorial,
    canProceed,
    setCanProceed,
  }

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (!ctx) {
    throw new Error('useTutorial must be used within TutorialProvider')
  }
  return ctx
}
