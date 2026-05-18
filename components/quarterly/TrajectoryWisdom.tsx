'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'
import {
  filterInsightLabels,
  scrubBannedQuarterlyTemplatePhrases,
  scrubGenericSynthesisTransitions,
  stripRedundantLeadingHeadings,
} from '@/lib/insight-utils'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface TrajectoryWisdomProps {
  insight: string | null
  quarterLabel: string
  accent?: InsightPeriodAccent
  aiSynthesisLocked?: boolean
  teaserMessage: string
  onRefresh?: () => void
  generating?: boolean
  generateError?: string | null
}

export function TrajectoryWisdom({
  insight,
  quarterLabel,
  accent = 'patterns',
  aiSynthesisLocked = false,
  teaserMessage,
  onRefresh,
  generating,
  generateError,
}: TrajectoryWisdomProps) {
  const hasInsight = Boolean(insight?.trim())
  const displayInsight = hasInsight
    ? scrubGenericSynthesisTransitions(
        scrubBannedQuarterlyTemplatePhrases(
          stripRedundantLeadingHeadings(filterInsightLabels(insight!))
        )
      )
    : ''

  const refreshButton =
    onRefresh && !aiSynthesisLocked ? (
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
      title="Mrs. Deer's Quarterly Reflection"
      accent={accent}
      headerActions={refreshButton}
    >
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{quarterLabel}</p>
      {aiSynthesisLocked ? (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <InsightPeriodTeaserLock
            message={teaserMessage}
            markdown
            ctaHeadingId="quarterly-reflection-pro-cta"
            ctaDescription="Mrs. Deer weaves your quarter's wins, lessons, and rhythm into a trajectory you can steer—not just stats."
            ctaFooter={<>Your stats and wins below stay visible while you explore the quarter.</>}
          />
        </div>
      ) : !hasInsight ? (
        <div className="py-4 text-center">
          {generateError ? (
            <>
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-left dark:border-red-800 dark:bg-red-900/20">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">AI insight failed</p>
                <p className="mt-1 font-mono text-sm text-red-700 dark:text-red-300">{generateError}</p>
              </div>
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-4 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                >
                  Try again
                </button>
              ) : null}
            </>
          ) : (
            <>
              <p className="text-gray-700 dark:text-gray-300">
                {generating
                  ? 'Mrs. Deer is reflecting on your quarter...'
                  : `No quarterly insight generated yet for ${quarterLabel}.`}
              </p>
              <div className="mt-4 flex justify-center">
                <MrsDeerAvatar expression="thoughtful" size="large" />
              </div>
              {onRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={generating}
                  className="mt-4 rounded-lg px-3 py-1.5 text-sm font-medium text-white transition disabled:opacity-50"
                  style={{ backgroundColor: colors.coral.DEFAULT }}
                >
                  {generating ? '…' : '↻ Refresh'}
                </button>
              ) : null}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100">{displayInsight}</MarkdownText>
        </div>
      )}
    </InsightPeriodSection>
  )
}
