'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ProgressBar } from './ProgressBar'
import { Step1Welcome } from './Step1Welcome'
import { Step2Dashboard } from './Step2Dashboard'
import { Step3Morning } from './Step3Morning'
import { Step4Evening } from './Step4Evening'
import { Step5Insights } from './Step5Insights'
import { colors } from '@/lib/design-tokens'
import { markOnboardingCompleted } from '@/lib/onboarding'
import { getUserSession } from '@/lib/auth'
import { useOnboarding } from '@/lib/hooks/useOnboarding'

const TOTAL_STEPS = 5

interface OnboardingFlowProps {
  preferredName: string | null
  onComplete: () => void
  onSkip: () => void
}

export function OnboardingFlow({ preferredName, onComplete, onSkip }: OnboardingFlowProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const { hideOnboarding, setHideForever } = useOnboarding()

  const handleComplete = async () => {
    const session = await getUserSession()
    if (session) {
      await markOnboardingCompleted(session.user.id)
    }
    if (hideOnboarding) await setHideForever(true)
    onComplete()
  }

  const handleSkip = async () => {
    if (hideOnboarding) await setHideForever(true)
    onSkip()
  }

  const goBack = () => setStep((s) => Math.max(1, s - 1))
  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1))

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-md px-4 py-6 overflow-y-auto">
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-none border-2 shadow-2xl overflow-hidden"
        style={{ borderColor: colors.navy.DEFAULT }}
      >
        <div className="p-6 sm:p-8">
          <ProgressBar current={step} total={TOTAL_STEPS} />
          <div className="mt-6 min-h-[320px]">
            {step === 1 && <Step1Welcome preferredName={preferredName} />}
            {step === 2 && <Step2Dashboard />}
            {step === 3 && <Step3Morning />}
            {step === 4 && <Step4Evening />}
            {step === 5 && <Step5Insights />}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="mb-3 flex items-center">
              <input
                type="checkbox"
                id="hideOnboardingFlow"
                checked={hideOnboarding}
                onChange={(e) => setHideForever(e.target.checked)}
                className="w-4 h-4 text-[#ef725c] bg-gray-100 border-gray-300 rounded focus:ring-[#ef725c] focus:ring-2"
              />
              <label htmlFor="hideOnboardingFlow" className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t show this again
              </label>
            </div>
            <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleSkip()}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition"
            >
              Skip for now
            </button>
            <div className="flex items-center gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="flex items-center gap-1 px-4 py-2 rounded-none border-2 text-sm font-medium transition"
                  style={{
                    borderColor: colors.navy.DEFAULT,
                    color: colors.navy.DEFAULT,
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={goNext}
                  className="flex items-center gap-1 px-4 py-2 rounded-none border-2 text-sm font-medium text-white transition hover:opacity-90"
                  style={{
                    backgroundColor: colors.coral.DEFAULT,
                    borderColor: colors.coral.DEFAULT,
                  }}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    await handleComplete()
                    router.push('/morning')
                  }}
                  className="flex items-center gap-1 px-4 py-2 rounded-none border-2 text-sm font-medium text-white transition hover:opacity-90"
                  style={{
                    backgroundColor: colors.navy.DEFAULT,
                    borderColor: colors.navy.DEFAULT,
                  }}
                >
                  Start my first morning →
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
