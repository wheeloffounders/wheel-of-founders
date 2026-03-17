'use client'

import { useState, useEffect } from 'react'
import Joyride, { type Step, type CallBackProps, ACTIONS, EVENTS, STATUS } from 'react-joyride'
import { usePathname } from 'next/navigation'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { isTourEnabled } from '@/lib/feature-flags'
import { supabase } from '@/lib/supabase'

export const DASHBOARD_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard-overview"]',
    content: "At a glance, see your Today's Intention, task progress, and current streak — your momentum builder.",
    title: '📊 Your Command Center',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-milestones"]',
    disableBeacon: true,
    content: "Mrs. Deer is learning from you: track completed tasks, proactive vs reactive work, time saved, and how often you close the loop.",
    title: '🏆 Your Progress Tracker',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="story-unlocks"]',
    content: "After 10 days of journaling, you'll unlock Your Story (your journey) and Unseen Wins (patterns Mrs. Deer spots).",
    title: '📖 Your Story & Unseen Wins',
    placement: 'top' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="insight-unlocks"]',
    content: 'Monthly insights show your transformation week by week. Quarterly insights reveal the big picture.',
    title: '📅 Monthly & Quarterly Insights',
    placement: 'top' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="tour-morning"]',
    disableBeacon: true,
    content: 'Plan your day with intention. Morning is where each day begins.',
    title: 'Morning',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="tour-evening"]',
    content: 'Reflect on your day. Evening is where patterns emerge.',
    title: 'Evening',
    placement: 'top' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="emergency"]',
    disableBeacon: true,
    content: 'When things go sideways, use this for immediate support.',
    title: '🚨 Emergency',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="weekly"]',
    content: 'Weekly Insights — see your momentum and patterns after 7 days.',
    title: '📊 Weekly Insights',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="monthly"]',
    disableBeacon: true,
    content: 'Monthly Insights — watch your transformation unfold month by month.',
    title: '📈 Monthly Insights',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tour="quarterly"]',
    content: "Quarterly Insights — the big picture of how far you've come.",
    title: '🏆 Quarterly Insights',
    placement: 'bottom' as const,
    disableBeacon: true,
  },
  {
    target: '[data-tour="tour-history"]',
    disableBeacon: true,
    content: 'See your journey — day by day, week by week.',
    title: 'History',
    placement: 'top' as const,
  },
  {
    target: '[data-tour="profile"]',
    content: "Profile — where Mrs. Deer learns about you (your goals, struggles, and story).",
    title: '👤 Profile',
    placement: 'top' as const,
    disableBeacon: true,
  },
]

export function ComprehensiveTour() {
  const pathname = usePathname()
  const ctx = useComprehensiveTour()
  const dismissTour = ctx?.dismissTour ?? (() => {})
  const [run, setRun] = useState(true)
  const [stepIndex, setStepIndex] = useState(0)

  console.log('🔍 [Tour] Component render', { run, stepIndex, pathname, timestamp: Date.now() })

  useEffect(() => {
    console.log('🔍 [Tour] useEffect mounted')
    setRun(true)
    setStepIndex(0)
    return () => {
      console.log('🔍 [Tour] Component unmounting, cleaning up')
      if (typeof document !== 'undefined') {
        document.querySelectorAll('[id^="react-joyride"]').forEach((el) => el.remove())
        document.querySelectorAll('.react-joyride__tooltip').forEach((el) => el.remove())
        document.querySelectorAll('.react-joyride__overlay').forEach((el) => el.remove())
        document.querySelectorAll('.react-joyride__spotlight').forEach((el) => el.remove())
        document.querySelectorAll('.react-joyride__beacon').forEach((el) => el.remove())
      }
    }
  }, [])

  const handleCallback = (data: CallBackProps) => {
    const { action, index, status, type } = data

    // In controlled mode, we must update stepIndex when user clicks Next/Prev
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextIndex = index + (action === ACTIONS.PREV ? -1 : 1)
      const clampedNext = Math.max(0, Math.min(nextIndex, DASHBOARD_STEPS.length - 1))
      const nextTarget = DASHBOARD_STEPS[clampedNext]?.target

      if (process.env.NODE_ENV === 'development') {
        const targetSelector = typeof nextTarget === 'string' ? nextTarget : null
        const elementExists = targetSelector ? !!document.querySelector(targetSelector) : false
        console.log('🔍 [Tour] Step changing:', {
          type,
          action,
          currentIndex: index,
          nextIndex: clampedNext,
          target: nextTarget,
          elementExists,
        })
      }

      // Scroll next target into view before advancing (helps when target is below fold)
      if (typeof nextTarget === 'string' && action === ACTIONS.NEXT) {
        const el = document.querySelector(nextTarget)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }

      setStepIndex(clampedNext)
    }

    // Handle tour end: Done, Skip, or X (close) button
    const tourEnded =
      status === STATUS.FINISHED ||
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE

    if (tourEnded) {
      console.log('🔍 [Tour] Tour ended, calling dismissTour', { status, action })
      setRun(false) // Stop Joyride immediately before unmount
      trackJourneyStep('completed_comprehensive_tour', {
        via: status === STATUS.SKIPPED || action === ACTIONS.CLOSE ? 'skipped' : 'finished',
      })
      dismissTour()
      // Mark tour complete; send Bearer token for reliable auth when cookies may not be set
      supabase.auth.getSession().then(({ data: { session } }) => {
        const headers: Record<string, string> = session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}
        fetch('/api/user/tour-complete', { method: 'POST', credentials: 'include', headers }).catch(() => {})
      })
    }
  }

  if (!isTourEnabled()) {
    return null
  }

  const shouldRun = run && pathname === '/dashboard'
  console.log('🔍 [Tour] Joyride props:', {
    run: shouldRun,
    stepIndex,
    steps: DASHBOARD_STEPS.length,
    continuous: true,
  })

  return (
    <Joyride
      steps={DASHBOARD_STEPS}
      run={shouldRun}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollDuration={300}
      callback={handleCallback}
      styles={{
        options: {
          primaryColor: '#ef725c',
          textColor: '#333',
          backgroundColor: '#fff',
          arrowColor: '#fff',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonNext: {
          backgroundColor: '#ef725c',
          color: '#fff',
        },
        buttonBack: {
          color: '#666',
        },
      }}
      locale={{
        back: 'Previous',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  )
}
