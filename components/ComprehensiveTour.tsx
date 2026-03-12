'use client'

import { useState, useEffect } from 'react'
import Joyride, { type Step, type CallBackProps, STATUS } from 'react-joyride'
import { usePathname } from 'next/navigation'
import { useComprehensiveTour } from '@/lib/contexts/ComprehensiveTourContext'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'
import { isNewOnboardingEnabled } from '@/lib/feature-flags'

const DASHBOARD_STEPS: Step[] = [
  {
    target: '[data-tour="dashboard-greeting"]',
    content: "This is your home base — see today's progress, your streak, and quick links to everything.",
    title: 'Dashboard',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-tour="dashboard-micro-lesson"]',
    content: "Your micro-lessons appear here — Mrs. Deer's gentle nudges based on your patterns.",
    title: 'Micro-lessons',
    placement: 'bottom',
  },
  {
    target: '[data-tour="dashboard-quick-links"]',
    content: 'Quick Links take you to Morning, Evening, History, Weekly Insights, and more.',
    title: 'Quick Links',
    placement: 'top',
  },
]

export function ComprehensiveTour() {
  const pathname = usePathname()
  const ctx = useComprehensiveTour()
  const runTour = ctx?.runTour ?? false
  const dismissTour = ctx?.dismissTour ?? (() => {})
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    if (runTour && pathname === '/dashboard') {
      setRun(true)
      setStepIndex(0)
    } else if (runTour && pathname !== '/dashboard') {
      setRun(false)
    }
  }, [runTour, pathname])

  const handleCallback = (data: CallBackProps) => {
    const { status, type } = data

    if (type === 'error:target_not_found') {
      return
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      trackJourneyStep('completed_comprehensive_tour', {
        via: status === STATUS.SKIPPED ? 'skipped' : 'finished',
      })
      setRun(false)
      dismissTour()
    }
  }

  if (!isNewOnboardingEnabled() || !runTour) return null

  return (
    <Joyride
      steps={DASHBOARD_STEPS}
      run={run && pathname === '/dashboard'}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
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
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  )
}
