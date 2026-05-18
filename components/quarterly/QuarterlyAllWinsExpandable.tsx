'use client'

import { InsightPeriodSection } from '@/components/insights/InsightPeriodSection'
import type { WinWithReviewDate } from '@/lib/quarterly/getQuarterlyData'
import type { InsightPeriodAccent } from '@/lib/insights/insight-period-card-styles'

interface QuarterlyAllWinsExpandableProps {
  wins: WinWithReviewDate[]
  quarterLabel: string
  accent?: InsightPeriodAccent
  anchorId?: string
}

export function QuarterlyAllWinsExpandable({
  wins,
  quarterLabel,
  accent = 'progress',
  anchorId = 'quarterly-all-wins',
}: QuarterlyAllWinsExpandableProps) {
  if (wins.length === 0) return null

  return (
    <InsightPeriodSection
      id={anchorId}
      title={`All wins · ${quarterLabel}`}
      accent={accent}
      cardClassName="scroll-mt-24"
    >
      <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
        {wins.length} moment{wins.length === 1 ? '' : 's'} from your evening reviews
      </p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700/80">
        {wins.map((w, i) => (
          <li key={`${w.reviewDate}-${i}`} className="py-4 first:pt-0 last:pb-0">
            <p className="text-gray-900 dark:text-gray-100">{w.text}</p>
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">{w.reviewDate}</p>
          </li>
        ))}
      </ul>
    </InsightPeriodSection>
  )
}
