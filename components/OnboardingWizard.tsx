'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserGoalQuestionnaire, isQuestionnaireCompleted } from './UserGoalQuestionnaire'

const ONBOARDING_KEY = 'wof_onboarding_completed_v1'

type Step = 1 | 2 | 3

export function OnboardingWizard() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>(1)
  const [showQuestionnaire, setShowQuestionnaire] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    
    // Check if questionnaire is completed first
    const questionnaireDone = isQuestionnaireCompleted()
    const onboardingDone = window.localStorage.getItem(ONBOARDING_KEY)
    
    if (!questionnaireDone) {
      setShowQuestionnaire(true)
    } else if (!onboardingDone) {
      setOpen(true)
    }
  }, [])

  const complete = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_KEY, 'true')
    }
    setOpen(false)
  }

  // Show questionnaire first if not completed
  if (showQuestionnaire) {
    return (
      <UserGoalQuestionnaire
        onComplete={() => {
          setShowQuestionnaire(false)
          // After questionnaire, show onboarding if not completed
          if (typeof window !== 'undefined' && !window.localStorage.getItem(ONBOARDING_KEY)) {
            setOpen(true)
          }
        }}
        onSkip={() => {
          setShowQuestionnaire(false)
          // After skipping questionnaire, show onboarding if not completed
          if (typeof window !== 'undefined' && !window.localStorage.getItem(ONBOARDING_KEY)) {
            setOpen(true)
          }
        }}
      />
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white dark:bg-[#1A202C] rounded-2xl shadow-2xl w-full max-w-sm sm:max-w-lg p-5 sm:p-8">
        {/* Step indicator */}
        <p className="text-xs text-gray-500 mb-2">Step {step} of 3</p>

        {step === 1 && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FAFBFC] flex items-center justify-center overflow-hidden">
                <Image
                  src="/mrs-deer.png"
                  alt="Mrs. Deer"
                  width={48}
                  height={48}
                  className="w-12 h-12 object-contain"
                />
              </div>
              <p className="text-sm text-gray-500">Mrs. Deer · Quiet Founder Coach</p>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#152b50] mb-3">
              Welcome to your founder journey
            </h2>
            <p className="text-gray-700 dark:text-[#E2E8F0] text-sm sm:text-base mb-4">
              I&apos;m Mrs. Deer, your quiet coach in the background. Together, we&apos;ll turn
              scattered days into a clear, repeatable rhythm.
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              This app isn&apos;t about doing more. It&apos;s about doing what actually matters,
              with a calmer mind.
            </p>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#152b50] mb-3">
              How your daily loop works
            </h2>
            <div className="space-y-3 text-gray-700 text-sm">
              <p>
                <span className="font-semibold">Dashboard</span> shows your Needle Movers, Founder Action Mix,
                and how focused your days are feeling.
              </p>
              <p>
                <span className="font-semibold">Morning Plan</span> is where you set today&apos;s 2–3 priorities
                and decide how you&apos;ll handle everything else as a founder.
              </p>
              <p>
                <span className="font-semibold">Evening Review</span> is a short reflection to close the loop:
                what you moved, how you felt, and what you&apos;d carry forward.
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-2xl font-semibold text-[#152b50] mb-3">
              Let&apos;s set up your first Morning Plan
            </h2>
            <p className="text-gray-700 mb-4">
              Start with just one meaningful task. Something that, if moved forward today,
              would make you quietly proud tonight.
            </p>
            <p className="text-sm text-gray-500 mb-4">
              You can always come back and adjust—this is your command center, not a test.
            </p>
            <Link
              href="/morning"
              onClick={complete}
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-[#152b50] text-white text-sm font-medium hover:bg-[#1a3565] transition"
            >
              Plan my first morning focus →
            </Link>
          </div>
        )}

        {/* Controls */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={complete}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Skip for now
          </button>
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                type="button"
                onClick={() => setStep((s) => (s < 3 ? ((s + 1) as Step) : s))}
                className="px-4 py-1.5 rounded-lg bg-[#ef725c] text-white text-sm font-medium hover:bg-[#e8654d]"
              >
                Next
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={complete}
                className="px-4 py-1.5 rounded-lg bg-gray-100 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

