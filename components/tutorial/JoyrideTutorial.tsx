'use client'

import { useState, useEffect } from 'react'
import Joyride, { type Step, type CallBackProps, STATUS } from 'react-joyride'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
import { trackJourneyStep } from '@/lib/analytics/journey-tracking'

export function JoyrideTutorial() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [run, setRun] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const tutorialParam = searchParams?.get('tutorial')
  const isTutorialMode =
    tutorialParam === 'start' || tutorialParam === 'true'

  useEffect(() => {
    if (isTutorialMode) {
      setRun(true)
      trackJourneyStep('started_tutorial')
    } else {
      setRun(false)
    }
  }, [isTutorialMode])

  // Log menu state and check for Morning button presence
  useEffect(() => {
    console.log('[Joyride] menuOpen changed:', menuOpen)
    if (menuOpen && typeof document !== 'undefined') {
      const morningButton = document.querySelector(
        '[data-tutorial="morning-menu"]',
      )
      console.log(
        '[Joyride] Morning button exists after menuOpen:',
        !!morningButton,
      )
    }
  }, [menuOpen])

  // When landing on morning page in tutorial mode, wait for elements and resume at step 3
  useEffect(() => {
    if (!isTutorialMode || pathname !== '/morning') return
    if (typeof document === 'undefined') return

    console.log('[Joyride] On morning page, checking for elements')

    const checkMorningTutorial = () => {
      const brainDump = document.querySelector('[data-tutorial="morning-brain-dump"]')
      if (brainDump) {
        setStepIndex(2) // first morning step = brain dump
        setRun(true)
        return true
      }
      return false
    }

    if (checkMorningTutorial()) return

    const interval = setInterval(() => {
      if (checkMorningTutorial()) {
        clearInterval(interval)
      }
    }, 200)

    return () => {
      clearInterval(interval)
    }
  }, [pathname, isTutorialMode])

  // When menuOpen is true, try to programmatically click Today button to open the menu
  useEffect(() => {
    if (!menuOpen || typeof document === 'undefined') return
    console.log('[Joyride] Programmatically opening Today menu')
    const todayButton = document.querySelector(
      '[data-tutorial="today-button"]',
    )
    if (todayButton instanceof HTMLElement) {
      todayButton.click()
    } else {
      console.log('[Joyride] Today button not found for programmatic click')
    }
  }, [menuOpen])

  // Define the tutorial steps
  const steps: Step[] = [
    {
      target: '[data-tutorial="today-button"]',
      content:
        'Click the Today button to open the menu and start your day.',
      title: 'Step 1: Start Here',
      placement: 'top',
      disableBeacon: true,
    },
    {
      target: '[data-tutorial="morning-menu"]',
      content: 'Click on Morning to begin planning your day.',
      title: 'Step 2: Plan Your Morning',
      placement: 'right',
    },
    {
      target: '[data-tutorial="morning-brain-dump"]',
      content:
        'Start here: clear mental clutter first — speak or type your brain dump, then Finish & Sort. Mrs. Deer maps it into your priority stream. Same habit every morning.',
      title: 'Step 3: Clear the path',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="morning-intention"]',
      content:
        'Set your North Star — one decision that anchors your day (same field you’ll use on Pro every morning).',
      title: 'Step 4: Intention',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="power-list"]',
      content:
        'Your tactical priorities — title each row, then refine with the action matrix. This is the same Pro stream you’ll use after onboarding.',
      title: 'Step 5: Power list',
      placement: 'bottom',
    },
    {
      target: '[data-tutorial="save-morning"]',
      content:
        "When you're ready, save to lock in today’s plan. Mrs. Deer will meet you again this evening.",
      title: 'Step 6: Save & continue',
      placement: 'top',
    },
  ]

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data

    console.log('[Joyride] Callback:', type, index)

    // If Joyride reports a missing target, don't auto-advance; let our retry logic handle it
    if (type === 'error:target_not_found') {
      console.log('[Joyride] Target not found for step', index)
      return
    }

    // Handle navigation and step transitions
    if (type === 'step:after') {
      // After step 1, open Today menu and only advance once Morning button exists
      if (index === 0) {
        setMenuOpen(true)

        if (typeof document === 'undefined') {
          return
        }

        setTimeout(() => {
          const morningButton = document.querySelector(
            '[data-tutorial="morning-menu"]',
          )
          if (morningButton) {
            console.log(
              '[Joyride] Morning button found, advancing to step 2',
            )
            setStepIndex(1)
          } else {
            console.log(
              '[Joyride] Morning button not found, starting retry loop…',
            )
            let attempts = 0
            const retry = setInterval(() => {
              attempts += 1
              const btn = document.querySelector(
                '[data-tutorial="morning-menu"]',
              )
              if (btn) {
                console.log(
                  '[Joyride] Found morning button after',
                  attempts,
                  'attempts',
                )
                setStepIndex(1)
                clearInterval(retry)
              } else if (attempts > 10) {
                console.log(
                  '[Joyride] Giving up on morning button after 10 attempts',
                )
                clearInterval(retry)
              }
            }, 200)
          }
        }, 300)

        return
      }

      // After step 2 (Morning menu), navigate to morning page and wait for brain dump anchor
      if (index === 1 && pathname === '/dashboard') {
        setRun(false)
        router.push('/morning?tutorial=true')

        if (typeof document === 'undefined') {
          return
        }

        setTimeout(() => {
          const brainDump = document.querySelector(
            '[data-tutorial="morning-brain-dump"]',
          )
          if (brainDump) {
            setStepIndex(2)
            setRun(true)
          } else {
            let attempts = 0
            const retry = setInterval(() => {
              attempts += 1
              const el = document.querySelector(
                '[data-tutorial="morning-brain-dump"]',
              )
              if (el) {
                setStepIndex(2)
                setRun(true)
                clearInterval(retry)
              } else if (attempts > 10) {
                clearInterval(retry)
              }
            }, 200)
          }
        }, 1000)

        return
      }

      // Default progression for later steps
      setStepIndex(index + 1)
    }

    // Handle tutorial completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      trackJourneyStep('completed_tutorial', {
        via: status === STATUS.SKIPPED ? 'joyride_skipped' : 'joyride_finished',
        last_step_index: index,
      })
      setRun(false)
      router.push('/dashboard')
    }
  }

  // Track tutorial step progression (step index 0-5 = steps 1-6; check-in step removed)
  useEffect(() => {
    if (!isTutorialMode || !run) return
    const stepNames = [
      'tutorial_step_1',
      'tutorial_step_2',
      'tutorial_step_3',
      'tutorial_step_4',
      'tutorial_step_5',
      'tutorial_step_6',
    ] as const
    if (stepIndex >= 0 && stepIndex < stepNames.length) {
      trackJourneyStep(stepNames[stepIndex], { step_index: stepIndex })
    }
  }, [stepIndex, isTutorialMode, run])

  // Only render on dashboard or morning page during tutorial
  if (
    !isTutorialMode ||
    (pathname !== '/dashboard' && pathname !== '/morning')
  ) {
    return null
  }

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
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

