'use client'

import { useState, useCallback } from 'react'

const FEEDBACK_COUNT_KEY = 'insight_feedback_count'

function incrementFeedbackCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(FEEDBACK_COUNT_KEY)
  const n = Math.max(0, parseInt(raw ?? '0', 10) + 1)
  window.localStorage.setItem(FEEDBACK_COUNT_KEY, String(n))
  return n
}

function getFeedbackCount(): number {
  if (typeof window === 'undefined') return 0
  const raw = window.localStorage.getItem(FEEDBACK_COUNT_KEY)
  return Math.max(0, parseInt(raw ?? '0', 10))
}

interface InsightFeedbackProps {
  insightId: string
  insightType: string
}

type FeedbackOption = 'yes' | 'not-quite' | null

const CONFIRM_MESSAGE = '✨ Thanks — Mrs. Deer will remember and learn your style'

export function InsightFeedback({ insightId, insightType }: InsightFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackOption>(null)
  const [showTextField, setShowTextField] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const showConfirmation = useCallback(() => {
    setSubmitted(true)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('toast', {
          detail: { message: CONFIRM_MESSAGE, type: 'success' },
        })
      )
      incrementFeedbackCount()
    }
  }, [])

  const handleYes = async () => {
    setSelected('yes')
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/feedback/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId,
          insightType,
          feedback: 'helpful',
          feedbackText: '',
        }),
        credentials: 'include',
      })
      if (res.ok) showConfirmation()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNotQuite = () => {
    setSelected('not-quite')
    setShowTextField(true)
  }

  const submitNotQuite = async () => {
    if (!feedbackText.trim()) return
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/feedback/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insightId,
          insightType,
          feedback: 'not-helpful',
          feedbackText: feedbackText.trim(),
        }),
        credentials: 'include',
      })
      if (res.ok) {
        showConfirmation()
        setShowTextField(false)
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    const count = getFeedbackCount()
    return (
      <div className="mt-3 space-y-1">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {CONFIRM_MESSAGE}
        </p>
        {count >= 3 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
            🧠 Mrs. Deer is learning your style
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3">
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
        Was this helpful? Help Mrs. Deer learn what works for you
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleYes}
          disabled={isSubmitting}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === 'yes'
              ? 'bg-[#ef725c] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          👍 Keep it like this
        </button>
        <button
          type="button"
          onClick={handleNotQuite}
          disabled={isSubmitting}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            selected === 'not-quite'
              ? 'bg-[#ef725c] text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          👎 Shape her response
        </button>
      </div>

      {showTextField && (
        <div className="mt-3 space-y-2">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What would have been better? Mrs. Deer will use this to learn your style."
            className="w-full p-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <button
              type="button"
              onClick={submitNotQuite}
              disabled={!feedbackText.trim() || isSubmitting}
              className="px-3 py-1 text-xs bg-[#152b50] text-white rounded-lg hover:bg-[#1a3565] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Send feedback'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Mrs. Deer reads every feedback and adjusts accordingly 🦌
          </p>
        </div>
      )}
    </div>
  )
}
