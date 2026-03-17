'use client'

import { JourneyProgress } from './JourneyProgress'
import TaskWidget from './TaskWidget'
import { StatsGrid } from './StatsGrid'

/**
 * Unified "Progress Zone" card: Journey Progress (7-day circles + streak)
 * plus 2-column grid of Today's Tasks and Stats Grid.
 */
export function ProgressZone() {
  return (
    <div
      className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 space-y-4"
      data-tour="dashboard-overview"
    >
      <div className="space-y-4">
        <JourneyProgress />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <div className="min-h-0">
            <TaskWidget />
          </div>
          <div className="min-h-0" data-tour="dashboard-milestones">
            <StatsGrid />
          </div>
        </div>
      </div>
    </div>
  )
}
