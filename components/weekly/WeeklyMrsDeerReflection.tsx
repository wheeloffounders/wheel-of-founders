'use client'

import { ThumbsDown, ThumbsUp, MessageCircle } from 'lucide-react'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import { Button } from '@/components/ui/button'
import { WeeklyInsightSection } from '@/components/weekly/WeeklyInsightSection'
import { WeeklyInsightTeaserLock } from '@/components/weekly/WeeklyInsightTeaserLock'
import type { WeeklyInsightAccent } from '@/components/weekly/WeeklyInsightSection'
import { colors } from '@/lib/design-tokens'

type WeeklyMrsDeerReflectionProps = {
  accent: WeeklyInsightAccent
  visible: boolean
  aiSynthesisLocked: boolean
  weeklyReflectionTeaserMessage: string
  displayPrompt: string | null
  generating: boolean
  generateError: string | null
  canRegenerateInsights: boolean
  feedbackSent: boolean
  insightFeedback: 'helpful' | 'not_quite_right' | 'custom' | null
  customFeedbackText: string
  onGenerateInsight: () => void
  onInsightFeedback: (type: 'helpful' | 'not_quite_right' | 'custom') => void
  onSetInsightFeedback: (value: 'helpful' | 'not_quite_right' | 'custom' | null) => void
  onCustomFeedbackTextChange: (value: string) => void
  onUpgradeClick: () => void
}

export function WeeklyMrsDeerReflection({
  accent,
  visible,
  aiSynthesisLocked,
  weeklyReflectionTeaserMessage,
  displayPrompt,
  generating,
  generateError,
  canRegenerateInsights,
  feedbackSent,
  insightFeedback,
  customFeedbackText,
  onGenerateInsight,
  onInsightFeedback,
  onSetInsightFeedback,
  onCustomFeedbackTextChange,
  onUpgradeClick,
}: WeeklyMrsDeerReflectionProps) {
  if (!visible) return null

  return (
    <WeeklyInsightSection
      title="Mrs. Deer's Weekly Reflection"
      accent={accent}
      headerActions={
        canRegenerateInsights && !aiSynthesisLocked ? (
          <button
            type="button"
            onClick={onGenerateInsight}
            disabled={generating}
            aria-label="Refresh insight"
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
            style={{ backgroundColor: colors.coral.DEFAULT }}
          >
            {generating ? '…' : '↻ Refresh'}
          </button>
        ) : null
      }
    >
      {aiSynthesisLocked ? (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <WeeklyInsightTeaserLock
            message={weeklyReflectionTeaserMessage}
            markdown
            ctaHeadingId="weekly-reflection-pro-cta"
            ctaDescription="Mrs. Deer connects the dots between your startup metrics, your daily energy, and parenting milestones to reveal the patterns hidden in your busy weeks."
            ctaFooter={
              <>
                Use{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">Your Top Wins</span> and{' '}
                <span className="font-medium text-gray-800 dark:text-gray-200">Your Key Insights</span> in the
                calibration column to review your raw weekly history.
              </>
            }
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      ) : displayPrompt ? (
        <>
          <div className="space-y-4">
            <MrsDeerAvatar expression="thoughtful" size="large" />
            <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100">{displayPrompt}</MarkdownText>
          </div>
          {!feedbackSent ? (
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
                onClick={() => onSetInsightFeedback(insightFeedback === 'custom' ? null : 'custom')}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${insightFeedback === 'custom' ? 'border-[#EF725C] bg-[#FFF0EC] dark:bg-[#1E293B]' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-900/80'}`}
              >
                <MessageCircle className="h-4 w-4" />
                Actually...
              </button>
              {insightFeedback === 'custom' && (
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
              )}
            </div>
          ) : (
            <p className="pt-2 text-sm text-gray-700 dark:text-gray-300">
              Thanks for your feedback! It helps Mrs. Deer get better.
            </p>
          )}
        </>
      ) : generateError ? (
        <div
          className={`rounded-lg p-4 ${
            generateError.includes('started')
              ? 'bg-blue-50 dark:bg-blue-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          }`}
        >
          <p
            className={`text-sm ${generateError.includes('started') ? 'text-blue-800 dark:text-blue-200' : 'font-medium text-red-800 dark:text-red-200'}`}
          >
            {generateError.includes('started') ? '' : 'AI insight failed'}
          </p>
          <p
            className={`mt-1 text-sm ${generateError.includes('started') ? 'text-blue-800 dark:text-blue-200' : 'font-mono text-red-700 dark:text-red-300'}`}
          >
            {generateError}
          </p>
          {!generateError.includes('started') && (
            <button
              type="button"
              onClick={onGenerateInsight}
              className="mt-3 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
              disabled={generating}
            >
              Try again
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {generating ? (
            <div className="flex w-full flex-col items-center gap-4 py-4">
              <MrsDeerAvatar expression="thoughtful" size="large" />
              <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                {generateError?.includes('started')
                  ? 'Your insight is being generated in the background. You can navigate away and come back later.'
                  : 'Mrs. Deer is reflecting on your week...'}
              </p>
              <div className="flex gap-1">
                <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: colors.coral.DEFAULT }} />
                <span
                  className="h-2 w-2 animate-pulse rounded-full delay-100"
                  style={{ backgroundColor: colors.coral.DEFAULT }}
                />
                <span
                  className="h-2 w-2 animate-pulse rounded-full delay-200"
                  style={{ backgroundColor: colors.coral.DEFAULT }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your weekly reflection will appear here. It&apos;s generated every Monday for the previous week.
              {canRegenerateInsights && ' Use Refresh above to generate it now.'}
            </p>
          )}
        </div>
      )}
    </WeeklyInsightSection>
  )
}
