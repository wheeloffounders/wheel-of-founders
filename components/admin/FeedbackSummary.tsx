'use client'

import { format } from 'date-fns'

type InsightFeedback = {
  feedback?: string | null
  feedback_text?: string | null
  insight_type?: string | null
  created_at?: string | null
}

type Feedback = {
  feedback_type?: string | null
  feedback_text?: string | null
  created_at?: string | null
}

export interface FeedbackSummaryProps {
  insightFeedback: InsightFeedback[]
  feedback: Feedback[]
}

export function FeedbackSummary({ insightFeedback, feedback }: FeedbackSummaryProps) {
  const helpful = insightFeedback.filter((f) => f.feedback === 'helpful').length
  const notHelpful = insightFeedback.filter((f) => f.feedback === 'not-helpful').length

  // Group feedback_text for "not helpful" to find common themes
  const notHelpfulTexts = insightFeedback
    .filter((f) => f.feedback === 'not-helpful' && f.feedback_text?.trim())
    .map((f) => (f.feedback_text ?? '').trim())
    .filter(Boolean)

  const textCounts = new Map<string, number>()
  for (const t of notHelpfulTexts) {
    const normalized = t.length > 50 ? t.slice(0, 50) + '…' : t
    textCounts.set(normalized, (textCounts.get(normalized) ?? 0) + 1)
  }
  const commonThemes = Array.from(textCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const hasInsightFeedback = insightFeedback.length > 0
  const hasOtherFeedback = feedback.length > 0

  if (!hasInsightFeedback && !hasOtherFeedback) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm py-8 text-center">
        No feedback yet
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Insight feedback summary */}
      {hasInsightFeedback && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            💬 FEEDBACK SUMMARY
          </h3>
          <div className="space-y-2 mb-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              • {helpful} helpful · {notHelpful} not-helpful
            </p>
            {commonThemes.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Most common &ldquo;not helpful&rdquo; themes:
                </p>
                <ul className="space-y-0.5">
                  {commonThemes.map(([text, count], i) => (
                    <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                      &ldquo;{text}&rdquo; ({count} {count === 1 ? 'time' : 'times'})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
            All insight feedback
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {insightFeedback.map((f, i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className={
                      f.feedback === 'helpful'
                        ? 'text-green-600 dark:text-green-400 font-medium'
                        : 'text-amber-600 dark:text-amber-400 font-medium'
                    }
                  >
                    {f.feedback === 'helpful' ? '✓ Helpful' : '✗ Not helpful'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {f.created_at ? format(new Date(f.created_at), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                {f.feedback_text && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    &ldquo;{f.feedback_text}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Other feedback (e.g. weekly, general) */}
      {hasOtherFeedback && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            📝 OTHER FEEDBACK
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {feedback.map((f, i) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                    {f.feedback_type ?? 'Feedback'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {f.created_at ? format(new Date(f.created_at), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                {f.feedback_text && (
                  <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">
                    &ldquo;{f.feedback_text}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
