'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, X } from 'lucide-react'

type TriggerType = '7_days_active' | '7_evening_reviews' | 'first_export' | '30_days'

interface TriggerData {
  triggerType: TriggerType
  shouldShow: boolean
  message: string
  daysOrCount?: number
}

export function FeedbackPopUp() {
  const router = useRouter()
  const [trigger, setTrigger] = useState<TriggerData | null>(null)
  const [showQuickForm, setShowQuickForm] = useState(false)
  const [whatsWorking, setWhatsWorking] = useState('')
  const [whatsImprove, setWhatsImprove] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetch('/api/feedback/trigger-status')
      .then((r) => r.json())
      .then((data) => {
        if (data.trigger?.shouldShow) setTrigger(data.trigger)
      })
      .catch(() => {})
  }, [])

  const handleDismiss = async (action: 'maybe_later' | 'dont_show') => {
    if (!trigger) return

    await fetch('/api/feedback/trigger-preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: action === 'dont_show' ? 'dismiss' : 'maybe_later',
        triggerType: trigger.triggerType,
      }),
    })
    setTrigger(null)
  }

  const handleQuickFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    setSubmitting(true)
    try {
      const desc = [whatsWorking.trim(), whatsImprove.trim()].filter(Boolean).join('\n\n') || 'Quick feedback'
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: 'popup',
          description: desc,
          screenLocation: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        await handleDismiss('dont_show')
        setShowQuickForm(false)
      }
    } catch {
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
  }

  if (!trigger) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-popup-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-[#1A202C]">
        {!showQuickForm ? (
          <>
            <h2 id="feedback-popup-title" className="mb-3 text-lg font-semibold text-gray-900 dark:text-[#E2E8F0]">
              {trigger.message}
            </h2>
            <p className="mb-6 text-gray-600 dark:text-gray-300">
              How&apos;s it going? Your feedback helps make this better for you and other founders.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => setShowQuickForm(true)}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#152b50] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1a3a6b] dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
              >
                <MessageSquare className="h-4 w-4" />
                Quick Feedback
              </button>
              <button
                type="button"
                onClick={() => handleDismiss('maybe_later')}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={() => handleDismiss('dont_show')}
                className="rounded-lg px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Don&apos;t Show Again
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleQuickFeedback}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-[#E2E8F0]">Quick Feedback</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  What&apos;s one thing working well?
                </label>
                <textarea
                  value={whatsWorking}
                  onChange={(e) => setWhatsWorking(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
                  placeholder="e.g. The evening review helps me reflect..."
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  What&apos;s one thing we could improve?
                </label>
                <textarea
                  value={whatsImprove}
                  onChange={(e) => setWhatsImprove(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
                  placeholder="e.g. Would love to see..."
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setShowQuickForm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 rounded-lg bg-[#152b50] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-50 dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
              >
                {submitting ? 'Sending...' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
