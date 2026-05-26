'use client'

import { ArrowRight } from 'lucide-react'
import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import { InsightPeriodTeaserLock } from '@/components/insights/InsightPeriodTeaserLock'
import { colors } from '@/lib/design-tokens'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

export interface TransformationPair {
  start: string
  now: string
}

interface TransformationPairsProps {
  pairs: TransformationPair[]
  accent?: InsightPeriodAccent
  transformationLocked?: boolean
  teaserMessage: string
  onUpgradeClick?: () => void
  /** Defaults to monthly copy; pass `week` for weekly insight layout parity. */
  cadence?: 'month' | 'week'
}

function formatPairsTeaserBody(pairs: TransformationPair[]): string {
  return pairs
    .map((p, i) => `**Before ${i + 1}:** ${p.start}\n\n**Now:** ${p.now}`)
    .join('\n\n')
}

export function TransformationPairs({
  pairs,
  accent = 'mood',
  transformationLocked = false,
  teaserMessage,
  onUpgradeClick,
  cadence = 'month',
}: TransformationPairsProps) {
  const body =
    pairs.length > 0 ? formatPairsTeaserBody(pairs) : 'Add wins and lessons in your evening reviews to see your transformation pairs here.'
  const evolutionTitle = cadence === 'week' ? 'Your Week of Evolution' : 'Your Month of Evolution'
  const ctaHeadingId = cadence === 'week' ? 'weekly-transformation-pro-cta' : 'monthly-transformation-pro-cta'

  return (
    <InsightPeriodSection title={evolutionTitle} accent={accent}>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
        From where you started to where you are now
      </p>
      {pairs.length === 0 ? (
        <p className="text-sm text-gray-700 dark:text-gray-300">{body}</p>
      ) : transformationLocked ? (
        <InsightPeriodTeaserLock
          message={teaserMessage}
          markdown
          ctaHeadingId={ctaHeadingId}
          ctaDescription="Pro unlocks AI-parsed before → after pairs from your real wins and lessons."
          onUpgradeClick={onUpgradeClick}
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
          {pairs.map((pair, i) => (
            <li key={i} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center">
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Before
                </p>
                <p className="text-gray-900 dark:text-white">{pair.start}</p>
              </div>
              <ArrowRight
                className="h-5 w-5 shrink-0"
                style={{ color: colors.coral.DEFAULT }}
                aria-hidden
              />
              <div className="flex-1">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Now
                </p>
                <p className="font-medium text-gray-900 dark:text-white">{pair.now}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </InsightPeriodSection>
  )
}
