'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import type { WinWithReviewDate } from '@/lib/quarterly/getQuarterlyData'

interface QuarterlyAllWinsExpandableProps {
  wins: WinWithReviewDate[]
  quarterLabel: string
  /** Stable anchor for in-page links (e.g. #quarterly-all-wins) */
  anchorId?: string
}

export function QuarterlyAllWinsExpandable({ wins, quarterLabel, anchorId = 'quarterly-all-wins' }: QuarterlyAllWinsExpandableProps) {
  if (wins.length === 0) return null

  return (
    <Card id={anchorId} className="scroll-mt-24 border-t border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-[#152b50] dark:text-slate-100">All wins · {quarterLabel}</CardTitle>
        <p className="text-sm text-gray-700 dark:text-gray-300">{wins.length} moment{wins.length === 1 ? '' : 's'} from your evening reviews</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {wins.map((w, i) => (
          <div
            key={`${w.reviewDate}-${i}`}
            className="p-4 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50"
            style={{ borderRadius: 0 }}
          >
            <p className="text-gray-900 dark:text-gray-100">{w.text}</p>
            <p className="text-xs mt-2 text-gray-600 dark:text-gray-400">{w.reviewDate}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
