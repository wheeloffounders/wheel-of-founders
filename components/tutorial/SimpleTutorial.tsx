'use client'

import { useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function SimpleTutorial() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)

  const tutorialParam = searchParams?.get('tutorial')
  const isTutorialMode =
    tutorialParam === 'start' || tutorialParam === 'true'

  if (!isTutorialMode) return null

  const steps = [
    {
      page: '/dashboard',
      title: 'Step 1: Today Button',
      message: 'Click the Today button to start',
    },
    {
      page: '/dashboard',
      title: 'Step 2: Morning Button',
      message: 'Click Morning to plan your day',
    },
    {
      page: '/morning',
      title: 'Step 3: Power List',
      message: 'Add your tasks here',
    },
    {
      page: '/morning',
      title: 'Step 4: Decision Log',
      message: 'Log your decisions',
    },
    {
      page: '/morning',
      title: 'Step 5: Save',
      message: 'Click Save to continue',
    },
  ] as const

  const currentStep = steps[step - 1]

  if (!currentStep) return null
  if (pathname !== currentStep.page) return null

  const handleNext = () => {
    if (step === 2) {
      window.location.href = '/morning?tutorial=true'
    } else if (step < steps.length) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[120]">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 border-2 border-[#ef725c] max-w-sm">
        <h3 className="font-bold text-gray-900 dark:text-white">
          {currentStep.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {currentStep.message}
        </p>
        <div className="flex gap-2 justify-end">
          {step > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="px-3 py-1 border rounded text-sm text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            >
              Back
            </button>
          )}
          {step < steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-3 py-1 bg-[#ef725c] text-white rounded text-sm"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                window.location.href = '/dashboard'
              }}
              className="px-3 py-1 bg-[#ef725c] text-white rounded text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

