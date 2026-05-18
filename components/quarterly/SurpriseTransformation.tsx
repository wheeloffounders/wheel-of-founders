'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { SurpriseBlock } from '@/lib/quarterly/buildQuarterlyNarrative'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface SurpriseTransformationProps {
  surprise: SurpriseBlock
  accent?: InsightPeriodAccent
}

export function SurpriseTransformation({ surprise, accent = 'lessons' }: SurpriseTransformationProps) {
  return (
    <InsightPeriodSection title="The One Thing That Surprised You" accent={accent}>
      <div className="space-y-4 leading-relaxed text-gray-800 dark:text-gray-200">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You might not have said it aloud, but something shifted this quarter:
        </p>
        <p className="font-medium text-gray-900 dark:text-gray-100">{surprise.headline}</p>
        <p>{surprise.body}</p>
        <p className="text-sm italic text-gray-700 dark:text-gray-300">
          That&apos;s a quieter transformation — but it might be the one that matters most.
        </p>
      </div>
    </InsightPeriodSection>
  )
}
