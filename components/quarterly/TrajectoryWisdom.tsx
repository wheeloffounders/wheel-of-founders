'use client'

import { Sparkles } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MrsDeerAvatar } from '@/components/MrsDeerAvatar'
import { MarkdownText } from '@/components/MarkdownText'
import {
  filterInsightLabels,
  scrubBannedQuarterlyTemplatePhrases,
  scrubGenericSynthesisTransitions,
  stripRedundantLeadingHeadings,
} from '@/lib/insight-utils'
import { colors } from '@/lib/design-tokens'

interface TrajectoryWisdomProps {
  insight: string | null
  quarterLabel: string
  /** Main card heading (section 1 in quarterly milestone flow) */
  title?: string
  /** First name for letter-style opening */
  greetingName?: string
  onRefresh?: () => void
  generating?: boolean
  generateError?: string | null
}

export function TrajectoryWisdom({
  insight,
  quarterLabel,
  title = 'The Quarter in One Glance',
  greetingName,
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

  if (!hasInsight) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          {greetingName ? (
            <p className="text-base italic text-gray-600 dark:text-gray-300 mb-4 text-left max-w-md mx-auto">
              Hi {greetingName},
            </p>
          ) : null}
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 text-left max-w-md mx-auto">
            {title}
          </p>
          {generateError ? (
            <>
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 text-left">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">AI insight failed</p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1 font-mono">{generateError}</p>
              </div>
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  className="mt-4 text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
                >
                  Try again
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-gray-900 dark:text-gray-100 dark:text-gray-100 leading-relaxed">
                {generating ? 'Mrs. Deer, your AI companion is reflecting on your quarter...' : 'You showed up this quarter. Every reflection adds to your trajectory. Click Refresh to generate your trajectory insight.'}
              </p>
              <div className="flex justify-center mt-4">
                <MrsDeerAvatar expression="thoughtful" size="large" />
              </div>
              {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={generating}
              aria-label="Refresh insight"
              className="mt-4 text-sm px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: colors.coral.DEFAULT, color: 'white' }}
            >
              {generating ? '…' : '↻ Refresh Insight'}
            </button>
          )}
            </>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card highlighted className="bg-[#f8f4f0] dark:bg-amber-900/30" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <div>
            {greetingName ? (
              <p className="text-base italic text-gray-600 dark:text-gray-300 mb-2">Hi {greetingName},</p>
            ) : null}
            <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100 dark:text-white">
              <Sparkles className="w-6 h-6" style={{ color: colors.amber.DEFAULT }} />
              {title}
            </CardTitle>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">Mrs. Deer&apos;s synthesis · {quarterLabel}</p>
          </div>
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={generating}
              aria-label="Refresh insight"
              className="text-sm px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50"
              style={{ backgroundColor: colors.coral.DEFAULT, color: 'white' }}
            >
              {generating ? '…' : '↻ Refresh Insight'}
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-4">
          <div className="flex justify-start">
            <MrsDeerAvatar expression="thoughtful" size="large" />
          </div>
          <MarkdownText className="leading-relaxed text-gray-900 dark:text-gray-100 dark:text-gray-100">
            {displayInsight}
          </MarkdownText>
        </div>
      </CardContent>
    </Card>
  )
}
