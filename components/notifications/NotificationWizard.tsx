'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Check, PartyPopper } from 'lucide-react'
import { getNotificationPlatform, getBrowserName } from '@/lib/notifications/platform'
import {
  clearWizardProgress,
  getWizardProgress,
  getWizardSteps,
  setWizardProgress,
  type WizardStep,
} from '@/lib/notifications/wizard-steps'
import { requestNotificationPermission, getNotificationStatus } from '@/lib/push-client'

interface NotificationWizardProps {
  onComplete?: () => void
  onRequestTest?: () => Promise<{ ok: boolean; error?: string }>
  className?: string
}

export function NotificationWizard({ onComplete, onRequestTest, className = '' }: NotificationWizardProps) {
  const [mounted, setMounted] = useState(false)
  const platform = useMemo(() => (mounted ? getNotificationPlatform() : 'other'), [mounted])
  const browser = useMemo(() => (mounted ? getBrowserName() : 'browser'), [mounted])
  const steps = useMemo(() => getWizardSteps(platform, browser), [platform, browser])

  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testSent, setTestSent] = useState(false)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const saved = getWizardProgress(platform)
    setCurrentStep((prev) => Math.min(saved, Math.max(0, steps.length - 1)))
  }, [mounted, platform, steps.length])

  const step = steps[currentStep]
  const isFirst = currentStep === 0
  const isLast = currentStep === steps.length - 1

  const saveProgress = useCallback(
    (stepIndex: number) => {
      setWizardProgress(platform, stepIndex)
    },
    [platform]
  )

  const handleNext = useCallback(() => {
    setError(null)
    if (isLast) {
      clearWizardProgress()
      setCompleted(true)
      onComplete?.()
    } else {
      const next = currentStep + 1
      setCurrentStep(next)
      saveProgress(next)
    }
  }, [currentStep, isLast, onComplete, saveProgress])

  const handleBack = useCallback(() => {
    setError(null)
    if (!isFirst) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      saveProgress(prev)
    }
  }, [currentStep, isFirst, saveProgress])

  const handleRequestPermission = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const granted = await requestNotificationPermission()
      if (granted) {
        handleNext()
        return
      }
      const { permission } = getNotificationStatus()
      if (permission === 'denied') {
        setError(
          'Notifications are blocked for this site. To allow: click the lock or info icon in the address bar → Site settings → Notifications → Allow. Then click Enable again.'
        )
      } else {
        setError(
          "The browser didn't get a clear Allow. Click Enable again and choose \"Allow\" when the prompt appears, or skip and use email reminders."
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again or skip.')
    } finally {
      setLoading(false)
    }
  }, [handleNext])

  const handleSendTest = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      if (onRequestTest) {
        const res = await onRequestTest()
        if (res.ok) setTestSent(true)
        else setError(res.error || 'Could not send test. Check your connection and try again.')
      } else {
        const res = await fetch('/api/notifications/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        const data = await res.json()
        if (res.ok) setTestSent(true)
        else setError((data as { error?: string }).error || 'Could not send test.')
      }
    } catch (e) {
      setError('Failed to send test. Try again.')
    } finally {
      setLoading(false)
    }
  }, [onRequestTest])

  const handleConfirmSawTest = useCallback(
    (saw: boolean) => {
      if (saw) {
        clearWizardProgress()
        setCompleted(true)
        onComplete?.()
      } else {
        setError("No worries. Check Do Not Disturb / Focus and system notification settings, then try 'Send test' again or skip.")
      }
    },
    [onComplete]
  )

  if (!mounted) {
    return (
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Guided setup</h3>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4 animate-pulse" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
      </div>
    )
  }

  if (platform === 'ios') {
    return (
      <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Setup for iPhone / iPad</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          We’ll use email and in-app reminders. Make sure email notifications are enabled below.
        </p>
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d]"
        >
          Got it
        </button>
      </div>
    )
  }

  if (completed) {
    return (
      <div
        className={`rounded-xl border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 p-6 text-center ${className}`}
      >
        <PartyPopper className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">You’re all set!</h3>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          Notifications are enabled. You’ll get reminders and insights as you’ve chosen.
        </p>
      </div>
    )
  }

  if (!step) return null

  return (
    <div className={`rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Guided setup</h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Step {currentStep + 1} of {steps.length}
        </span>
      </div>

      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-6">
        <div
          className="h-full bg-[#ef725c] rounded-full transition-all duration-300"
          style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
        />
      </div>

      <h4 className="font-medium text-gray-900 dark:text-white mb-2">{step.title}</h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 whitespace-pre-line">{step.body}</p>

      {error && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}

      {/* Step-specific action */}
      {step.verification === 'request_permission' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleRequestPermission}
            disabled={loading}
            className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50"
          >
            {loading ? 'Checking…' : 'Enable notifications'}
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          >
            Skip
          </button>
        </div>
      )}

      {step.verification === 'test_notification' && (
        <div className="space-y-3">
          {!testSent ? (
            <button
              type="button"
              onClick={handleSendTest}
              disabled={loading}
              className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d] disabled:opacity-50"
            >
              {loading ? 'Sending…' : 'Send test notification'}
            </button>
          ) : (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Did you see the notification?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleConfirmSawTest(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4 inline mr-1" />
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmSawTest(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  No
                </button>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleNext}
            className="block text-sm text-gray-500 dark:text-gray-400 hover:underline"
          >
            Skip for now
          </button>
        </div>
      )}

      {(step.verification === 'confirm_saw' || step.verification === 'info') && (
        <button
          type="button"
          onClick={handleNext}
          className="px-4 py-2 bg-[#ef725c] text-white rounded-lg hover:bg-[#e8654d]"
        >
          {step.verification === 'info' ? 'Next' : 'I did this'}
        </button>
      )}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBack}
          disabled={isFirst}
          className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        {step.verification !== 'request_permission' && step.verification !== 'test_notification' && (
          <button
            type="button"
            onClick={handleNext}
            className="flex items-center gap-1 text-sm text-[#ef725c] hover:underline"
          >
            Skip
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
