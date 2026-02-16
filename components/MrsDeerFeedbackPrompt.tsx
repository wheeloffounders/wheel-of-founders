'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MessageSquare } from 'lucide-react'

interface MrsDeerFeedbackPromptProps {
  /** Context from Mrs. Deer (e.g. "confusion around planning") */
  context: string
  /** Callback when dismissed without feedback */
  onDismiss?: () => void
}

/** Mrs. Deer invites feedback when she notices a pattern (e.g. 3+ mentions of similar frustration) */
export function MrsDeerFeedbackPrompt({ context, onDismiss }: MrsDeerFeedbackPromptProps) {
  const [showForm, setShowForm] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleTellMore = () => setShowForm(true)

  const handleNotNow = () => {
    onDismiss?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !feedback.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: 'mrs_deer',
          description: feedback.trim(),
          contextPrefilled: `I'm having trouble with ${context}`,
          screenLocation: typeof window !== 'undefined' ? window.location.pathname : '',
        }),
      })

      if (res.ok) {
        setSubmitted(true)
        setTimeout(() => onDismiss?.(), 1500)
      }
    } catch {
      setSubmitting(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-[#1A202C] dark:to-[#1A202C] rounded-xl shadow-lg p-6 mb-6 border border-amber-200 dark:border-amber-500/40">
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <Image
            src="/mrs-deer.png"
            alt="Mrs. Deer"
            width={48}
            height={48}
            className="w-12 h-12 object-contain rounded-full"
          />
        </div>
        <div className="flex-1 min-w-0">
          {!showForm ? (
            <>
              <p className="text-gray-800 dark:text-[#E2E8F0] leading-relaxed mb-4">
                This is a pattern worth noting. You&apos;ve mentioned {context} a few times now.
              </p>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
                Would you mind telling me more about what&apos;s getting in the way? It would help me serve you better.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleTellMore}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#152b50] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
                >
                  <MessageSquare className="h-4 w-4" />
                  Tell Mrs. Deer More
                </button>
                <button
                  type="button"
                  onClick={handleNotNow}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Not Now
                </button>
              </div>
            </>
          ) : submitted ? (
            <p className="text-gray-700 dark:text-gray-300">Thank you! Your feedback helps.</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                What&apos;s getting in the way?
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder={`I'm having trouble with ${context}...`}
                rows={3}
                required
                className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-[#ef725c] focus:outline-none focus:ring-1 focus:ring-[#ef725c] dark:border-gray-600 dark:bg-[#0F1419] dark:text-[#E2E8F0]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 dark:border-gray-600 dark:text-gray-300"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submitting || !feedback.trim()}
                  className="rounded-lg bg-[#152b50] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-50 dark:bg-[#ef725c] dark:hover:bg-[#f0886c]"
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
