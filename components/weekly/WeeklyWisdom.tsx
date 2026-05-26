'use client'

import { ThumbsDown, ThumbsUp, MessageCircle } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import { Button } from '@/components/ui/button'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface WeeklyWisdomProps {
  insight: string | null
  weekLabel: string
  accent?: InsightPeriodAccent
  aiSynthesisLocked?: boolean
  teaserMessage: string
  onUpgradeClick?: () => void
  onRefresh?: () => void
  generating?: boolean
  generateError?: string | null
  canRegenerateInsights?: boolean
  feedbackSent?: boolean
  insightFeedback?: 'helpful' | 'not_quite_right' | 'custom' | null
  customFeedbackText?: string
  onInsightFeedback?: (type: 'helpful' | 'not_quite_right' | 'custom') => void
  onSetInsightFeedback?: (value: 'helpful' | 'not_quite_right' | 'custom' | null) => void
  onCustomFeedbackTextChange?: (value: string) => void
}

export function WeeklyWisdom({
  insight,
  weekLabel,
  accent = 'patterns',
  aiSynthesisLocked = false,
  teaserMessage,
  onUpgradeClick,
  onRefresh,
  generating,
  generateError,
  canRegenerateInsights,
  feedbackSent,
  insightFeedback,
  customFeedbackText = '',
  onInsightFeedback,
  onSetInsightFeedback,
  onCustomFeedbackTextChange,
}: WeeklyWisdomProps) {
  const refreshButton =
    onRefresh && !aiSynthesisLocked && canRegenerateInsights ? (
      <button
        type="button"
        onClick={onRefresh}
        disabled={generating}
        aria-label="Refresh insight"
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
        style={{ backgroundColor: colors.coral.DEFAULT }}
      >
        {generating ? '…' : '↻ Refresh'}
      </button>
    ) : null

  return (
    <InsightPeriodSection
      title="Mrs. Deer's Weekly Reflection"
      accent={accent}
      headerActions={refreshButton}
    >
      {aiSynthesisLocked ? (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <InsightPeriodTeaserLock
            message={teaserMessage}
            markdown
            ctaHeadingId="weekly-reflection-pro-cta"
            ctaDescription="Mrs. Deer connects the dots between your startup metrics, your daily energy, and parenting milestones to reveal the patterns hidden in your busy weeks."
            ctaFooter={<>Your stats and themes below stay visible while you explore the week.</>}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      ) : !insight ? (
        <div className="py-4 text-center">
          {generateError ? (
            <>
              <div
                className={`rounded-lg p-4 text-left ${
                  generateError.includes('started')
                    ? 'border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                    : 'border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                }`}
              >
                <p
                  className={`text-sm ${
                    generateError.includes('started')
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'font-medium text-red-800 dark:text-red-200'
                  }`}
                >
                  {generateError.includes('started') ? '' : 'AI insight failed'}
                </p>
                <p
                  className={`mt-1 text-sm ${
                    generateError.includes('started')
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'font-mono text-red-700 dark:text-red-300'
                  }`}
                >
                  {generateError}
                </p>
              </div>
              {onRefresh && !generateError.includes('started') ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-4 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  disabled={generating}
                >
                  Try again
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                No weekly insight generated yet for {weekLabel}.
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {generating
                  ? 'Mrs. Deer is reflecting on your week...'
                  : 'Your weekly reflection is generated every Monday for the previous week.'}
                {canRegenerateInsights && !generating ? ' Use Refresh to generate it now.' : ''}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100">{insight}</MarkdownText>
          {!feedbackSent && onInsightFeedback ? (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4 dark:border-slate-700/80">
              <span className="mr-2 text-sm text-gray-700 dark:text-gray-300">Was this helpful?</span>
              <button
                type="button"
                onClick={() => onInsightFeedback('helpful')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900/80"
              >
                <ThumbsUp className="h-4 w-4" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => onInsightFeedback('not_quite_right')}
                className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900/80"
              >
                <ThumbsDown className="h-4 w-4" />
                Not quite
              </button>
              <button
                type="button"
                onClick={() =>
                  onSetInsightFeedback?.(insightFeedback === 'custom' ? null : 'custom')
                }
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  insightFeedback === 'custom'
                    ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]'
                    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900/80'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Actually...
              </button>
              {insightFeedback === 'custom' && onCustomFeedbackTextChange ? (
                <div className="mt-2 flex w-full gap-2">
                  <input
                    type="text"
                    value={customFeedbackText}
                    onChange={(e) => onCustomFeedbackTextChange(e.target.value)}
                    placeholder="What I really learned was..."
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-[#ef725c] dark:border-gray-600"
                  />
                  <Button
                    size="sm"
                    onClick={() => onInsightFeedback('custom')}
                    disabled={!customFeedbackText.trim()}
                  >
                    Send
                  </Button>
                </div>
              ) : null}
            </div>
          ) : feedbackSent ? (
            <p className="pt-2 text-sm text-gray-700 dark:text-gray-300">
              Thanks for your feedback! It helps Mrs. Deer get better.
            </p>
          ) : null}
        </div>
      )}
    </InsightPeriodSection>
  )
}
