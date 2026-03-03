'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeft, MessageSquare } from 'lucide-react'

interface FeedbackItem {
  id: string
  user_id: string
  feedback_type: string
  description: string
  screen_location?: string
  email?: string
  whats_working?: string
  whats_confusing?: string
  features_request?: string
  nps_score?: number
  other_thoughts?: string
  created_at: string
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch('/api/admin/feedback', { credentials: 'include' })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setFeedback(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load feedback')
      } finally {
        setLoading(false)
      }
    }
    fetchFeedback()
  }, [])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <Link
        href="/admin"
        className="mb-6 inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Admin
      </Link>

      <h1 className="flex items-center gap-2 text-3xl font-bold mb-6">
        <MessageSquare className="h-8 w-8 text-[#ef725c]" />
        Feedback
      </h1>

      {loading && (
        <p className="text-gray-500 dark:text-gray-400">Loading feedback...</p>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!loading && !error && feedback.length === 0 && (
        <p className="text-gray-500 dark:text-gray-400">No feedback yet.</p>
      )}

      {!loading && !error && feedback.length > 0 && (
        <div className="space-y-4">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <span className="text-xs font-medium px-2 py-1 bg-[#ef725c]/10 text-[#ef725c] rounded-full">
                    {item.feedback_type}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                    {format(new Date(item.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </div>

              <p className="text-gray-900 dark:text-white whitespace-pre-wrap mb-2">
                {item.description}
              </p>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                From: {item.email || 'No email'}
                {item.screen_location && ` · ${item.screen_location}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
