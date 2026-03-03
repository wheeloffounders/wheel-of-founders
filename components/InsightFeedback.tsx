'use client'

import { useState } from 'react'

interface InsightFeedbackProps {
  insightId: string
  insightType: string
}

type FeedbackOption = 'yes' | 'not-quite' | null

export function InsightFeedback({ insightId, insightType }: InsightFeedbackProps) {
  const [selected, setSelected] = useState<FeedbackOption>(null)
  const [showTextField, setShowTextField] = useState(false)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleYes = async () => {
    setSelected('yes')
    setIsSubmitting(true)
    try {
      await fetch('/api/feedback/insight', {
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
      setSubmitted(true)
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
      await fetch('/api/feedback/insight', {
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
      setSubmitted(true)
      setShowTextField(false)
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">
        Thanks for your feedback — Mrs. Deer will read it 🦌
      </div>
    )
  }

  return (
    <div className="mt-3">
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600 dark:text-gray-300">Was this useful?</span>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleYes}
            disabled={isSubmitting}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selected === 'yes'
                ? 'bg-[#ef725c] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={handleNotQuite}
            disabled={isSubmitting}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              selected === 'not-quite'
                ? 'bg-[#ef725c] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Not quite
          </button>
        </div>
      </div>

      {showTextField && (
        <div className="mt-3 space-y-2">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What could Mrs. Deer do better? She'll read this and adjust..."
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
