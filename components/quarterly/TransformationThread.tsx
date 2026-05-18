'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { TransformationThread as TThread } from '@/lib/quarterly/buildQuarterlyNarrative'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface TransformationThreadProps {
  thread: TThread
  accent?: InsightPeriodAccent
}

export function TransformationThread({ thread, accent = 'goal' }: TransformationThreadProps) {
  return (
    <InsightPeriodSection title="The Transformation Thread" accent={accent}>
      <div className="space-y-4 leading-relaxed text-gray-800 dark:text-gray-200">
        <p className="font-medium text-gray-900 dark:text-gray-100">Across these months, one thread runs through everything:</p>
        <p>
          You stopped asking {thread.oldQuestion}.<br />
          You started asking {thread.newQuestion}.
        </p>
        <p>{thread.body}</p>
        <p>
          That&apos;s not {thread.oldFraming}. That&apos;s {thread.newFraming}. And it&apos;s the foundation of everything you&apos;re
          building.
        </p>
      </div>
    </InsightPeriodSection>
  )
}
