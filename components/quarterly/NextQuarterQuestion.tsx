'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { GuidingQuestionBlock } from '@/lib/quarterly/buildQuarterlyNarrative'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface NextQuarterQuestionProps {
  block: GuidingQuestionBlock
  accent?: InsightPeriodAccent
}

export function NextQuarterQuestion({ block, accent = 'progress' }: NextQuarterQuestionProps) {
  return (
    <InsightPeriodSection title="A Question for Next Quarter" accent={accent}>
      <div className="space-y-4 leading-relaxed text-gray-800 dark:text-gray-200">
        <p className="text-sm text-gray-700 dark:text-gray-300">The next 90 days, hold this question close:</p>
        <p className="text-lg font-semibold text-[#152b50] dark:text-slate-100">{block.question}</p>
        <p className="text-sm">{block.explain}</p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Let this question guide you when you&apos;re deciding what deserves your energy, what to say no to, and what to
          celebrate.
        </p>
      </div>
    </InsightPeriodSection>
  )
}
