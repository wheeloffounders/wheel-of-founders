'use client'

import { useState, useEffect } from 'react'
import Joyride, { type CallBackProps, STATUS } from 'react-joyride'
import { DASHBOARD_STEPS } from './ComprehensiveTour'

/**
 * Standalone tour that does NOT use ComprehensiveTourContext.
 * Triggered by localStorage 'force-tour' === 'true' (set by debug button when context fails).
 * TEMPORARY DEBUG - remove after fixing context-based tour.
 */
export function IndependentTour() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('force-tour') === 'true') {
      console.log('🔴 [IndependentTour] Showing from localStorage (context fallback)')
      setShow(true)
      localStorage.removeItem('force-tour')
    }
  }, [])

  if (!show) return null

  return (
    <Joyride
      run={true}
      steps={DASHBOARD_STEPS}
      continuous
      showProgress
      showSkipButton
      scrollToFirstStep
      scrollDuration={300}
      callback={(data: CallBackProps) => {
        if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
          setShow(false)
        }
      }}
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
