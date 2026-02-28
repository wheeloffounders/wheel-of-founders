'use client'

import { Target, Flame, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

interface MonthlyTrendsProps {
  stats: {
    reviewsCount: number
    completionRate: number
    streakDays: number
    needleMovers: number
    needleMoversCompleted: number
    proactivePct: number
    decisions: number
    firesTotal: number
    firesResolved: number
  }
}

export function MonthlyTrends({ stats }: MonthlyTrendsProps) {
  const firesResolvedPct = stats.firesTotal > 0
    ? Math.round((stats.firesResolved / stats.firesTotal) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <Calendar className="w-5 h-5 mb-2" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">SESSIONS</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.reviewsCount}</p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">Evening reviews this month</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Target className="w-5 h-5 mb-2" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">COMPLETION</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.completionRate}%</p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">Current streak: {stats.streakDays} days</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <Flame className="w-5 h-5 mb-2" style={{ color: colors.amber.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">NEEDLE MOVERS</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.needleMoversCompleted} / {stats.needleMovers}
          </p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
            {stats.proactivePct}% proactive · {stats.decisions} decisions
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
