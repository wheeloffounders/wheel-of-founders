'use client'

import { Target } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

interface MonthlyPreviewProps {
  monthLabel: string
  stats: {
    completedTasks: number
    needleMovers: number
    needleMoversCompleted: number
  }
}

export function MonthlyPreview({ monthLabel, stats }: MonthlyPreviewProps) {
  return (
    <Card highlighted className="mb-8" style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-[#E2E8F0]">
          <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
          Month in Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Your full monthly transformation view will appear at the end of {monthLabel}. Keep building momentum!
        </p>
        <p className="text-sm mt-2 font-medium text-[#152b50] dark:text-[#E2E8F0]">
          So far: {stats.completedTasks} tasks done · {stats.needleMoversCompleted}/{stats.needleMovers} needle movers
        </p>
      </CardContent>
    </Card>
  )
}
