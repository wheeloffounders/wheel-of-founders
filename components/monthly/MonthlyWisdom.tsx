'use client'

import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface MonthlyWisdomProps {
  insight: string | null
  monthLabel: string
  accent?: InsightPeriodAccent
  aiSynthesisLocked?: boolean
  teaserMessage: string
  onUpgradeClick?: () => void
  onRefresh?: () => void
  generating?: boolean
  generateError?: string | null
}

export function MonthlyWisdom({
  insight,
  monthLabel,
  accent = 'patterns',
  aiSynthesisLocked = false,
  teaserMessage,
  onUpgradeClick,
  onRefresh,
  generating,
  generateError,
}: MonthlyWisdomProps) {
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
      title="Mrs. Deer's Monthly Reflection"
      accent={accent}
      headerActions={refreshButton}
    >
      {aiSynthesisLocked ? (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <InsightPeriodTeaserLock
            message={teaserMessage}
            markdown
            ctaHeadingId="monthly-reflection-pro-cta"
            ctaDescription="Mrs. Deer weaves your month's wins, lessons, and rhythm into a narrative you can act on—not just stats."
            ctaFooter={<>Your stats and themes below stay visible while you explore the month.</>}
            onUpgradeClick={onUpgradeClick}
          />
        </div>
      ) : !insight ? (
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
                No monthly insight generated yet for {monthLabel}.
              </p>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {generating
                  ? 'Mrs. Deer is reflecting on your month...'
                  : 'Use Refresh to generate your monthly reflection.'}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <MrsDeerAvatar expression="thoughtful" size="large" />
          <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100">{insight}</MarkdownText>
        </div>
      )}
    </InsightPeriodSection>
  )
}
