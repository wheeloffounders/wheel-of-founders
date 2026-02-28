'use client'

import { Target, TrendingUp, BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/design-tokens'

interface TrajectoryStatsProps {
  stats: {
    totalTasks: number
    completedTasks: number
    completionRate: number
    needleMovers: number
    needleMoversCompleted: number
    reviewsCount: number
    decisions: number
  }
}

export function TrajectoryStats({ stats }: TrajectoryStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardContent className="p-6">
          <Target className="w-5 h-5 mb-2" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">TASKS</p>
          <p className="text-2xl font-bold text-[#152b50] dark:text-white">
            {stats.completedTasks}/{stats.totalTasks}
          </p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
            {stats.completionRate}% completion rate
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <TrendingUp className="w-5 h-5 mb-2" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">NEEDLE MOVERS</p>
          <p className="text-2xl font-bold text-[#152b50] dark:text-white">
            {stats.needleMoversCompleted}/{stats.needleMovers}
          </p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
            Priorities moved this quarter
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-6">
          <BookOpen className="w-5 h-5 mb-2" style={{ color: colors.coral.DEFAULT }} />
          <p className="text-sm mb-1 text-gray-700 dark:text-gray-300">REFLECTIONS</p>
          <p className="text-2xl font-bold text-[#152b50] dark:text-white">{stats.reviewsCount}</p>
          <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
            Evening reviews · {stats.decisions} decisions
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
