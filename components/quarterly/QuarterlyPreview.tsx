'use client'

import { Target } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

interface QuarterlyPreviewProps {
  quarterLabel: string
  stats: {
    completedTasks: number
    needleMovers: number
    needleMoversCompleted: number
  }
}

export function QuarterlyPreview({ quarterLabel, stats }: QuarterlyPreviewProps) {
  return (
    <Card highlighted style={{ borderLeft: `3px solid ${colors.coral.DEFAULT}` }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#152b50] dark:text-[#E2E8F0]">
          <Target className="w-5 h-5" style={{ color: colors.coral.DEFAULT }} />
          Quarter in Progress
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Your full quarterly trajectory view will appear at the end of {quarterLabel}. Keep building!
        </p>
        <p className="text-sm mt-2 font-medium text-[#152b50] dark:text-[#E2E8F0]">
          So far: {stats.completedTasks} tasks · {stats.needleMoversCompleted}/{stats.needleMovers} needle movers
        </p>
      </CardContent>
    </Card>
  )
}
